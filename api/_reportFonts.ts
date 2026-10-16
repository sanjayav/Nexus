/**
 * Fonts and line breaking for the server-side PDF report.
 *
 * The built-in PDF fonts (Helvetica, Courier) only cover Latin-1, so any
 * Chinese text (org names, narratives, line items, the zh report shell) came
 * out as mojibake. We ship Noto Sans SC (SIL OFL 1.1, see api/_fonts/OFL.txt)
 * with the function — static TTF per weight, never WOFF2 or a variable font,
 * because fontkit cannot subset those. react-pdf subsets the font on render,
 * so a Chinese report stays a few hundred KB even though each TTF is ~10 MB.
 *
 * The files are read from `api/_fonts/` relative to the working directory
 * (`/var/task` on Vercel). vercel.json `functions["api/org.ts"].includeFiles`
 * ships them with the function; the file tracer would not find them on its own
 * because they are loaded by path, not imported.
 *
 * A Thai font is optional: drop `NotoSansThai-Regular.ttf` (and optionally
 * `-Bold.ttf`) into `api/_fonts/` and Thai glyphs render via font fallback.
 */
import { Font } from '@react-pdf/renderer'
import { existsSync } from 'fs'
import * as path from 'path'

export const CJK_FAMILY = 'NotoSansSC'
export const THAI_FAMILY = 'NotoSansThai'

// ─── CJK line breaking ─────────────────────────────────────────────

/** Han ideographs, kana, Hangul, CJK symbols & punctuation, full-width forms. */
const CJK_CHAR = /[⺀-⿟　-〿぀-ヿ㄀-ㄯ㆐-ㇿ㐀-䶿一-鿿가-힯豈-﫿︰-﹏＀-￯]|[\uD840-\uD87F][\uDC00-\uDFFF]/

/** Must not start a line (kinsoku shori): closing brackets, stops, commas. */
const NO_LINE_START = new Set(Array.from('，。、；：！？）》」』】〉〕〗〙〛’”…‥·・%％,.;:!?)]}>ー々〻ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ'))
/** Must not end a line: opening brackets and quotes. */
const NO_LINE_END = new Set(Array.from('（《「『【〈〔〖〘〚‘“([{<'))

export function isCjk(ch: string): boolean {
  return CJK_CHAR.test(ch)
}

/**
 * Hyphenation callback for react-pdf's text engine.
 *
 * textkit splits each text run on spaces and asks this callback for the
 * break opportunities inside a "word". Chinese has no spaces, so a whole
 * paragraph is one word and never wraps. We return one part per CJK
 * character, keep Latin words / numbers intact (`tCO2e`, `2025`, `ISO14001`),
 * keep closing punctuation on the previous character and opening punctuation
 * on the next one.
 *
 * Every part is followed by an empty string. textkit turns an empty syllable
 * into a zero-width glue, which is a break opportunity *without* a hyphen; a
 * plain part boundary would be a hyphenation penalty and print a "-".
 *
 * Words with no CJK at all are returned whole (no English auto-hyphenation).
 */
export function cjkHyphenationCallback(word: string): string[] {
  if (!word) return [word]
  if (!CJK_CHAR.test(word)) return [word]

  const chars = Array.from(word)
  const segments: string[] = []
  let latin = ''
  const flushLatin = () => {
    if (latin) { segments.push(latin); latin = '' }
  }
  for (const ch of chars) {
    if (isCjk(ch)) {
      flushLatin()
      segments.push(ch)
    } else {
      latin += ch
    }
  }
  flushLatin()

  // Kinsoku: glue forbidden line-start chars to the previous segment and
  // forbidden line-end chars to the next one.
  const merged: string[] = []
  for (const seg of segments) {
    const first = Array.from(seg)[0]
    const prev = merged[merged.length - 1]
    if (prev !== undefined) {
      const prevLast = Array.from(prev).pop()!
      if (NO_LINE_START.has(first) || NO_LINE_END.has(prevLast)) {
        merged[merged.length - 1] = prev + seg
        continue
      }
    }
    merged.push(seg)
  }

  const parts: string[] = []
  for (const seg of merged) parts.push(seg, '')
  // textkit splits runs by script, so "强度（" and "tCO2e" arrive as separate
  // words. Don't offer a break after an opening bracket at the end of a word —
  // it would leave "（" dangling at the end of a line.
  const lastChar = Array.from(merged[merged.length - 1]).pop()!
  if (NO_LINE_END.has(lastChar)) parts.pop()
  return parts
}

// ─── Registration ──────────────────────────────────────────────────

function fontDirCandidates(): string[] {
  const out: string[] = []
  if (process.env.REPORT_FONT_DIR) out.push(process.env.REPORT_FONT_DIR)
  out.push(path.join(process.cwd(), 'api', '_fonts'))
  // Local scripts may run from a sub-directory.
  out.push(path.join(process.cwd(), '..', 'api', '_fonts'))
  if (typeof __dirname !== 'undefined') out.push(path.join(__dirname, '_fonts'))
  return out
}

export function resolveFontDir(): string | null {
  for (const dir of fontDirCandidates()) {
    if (existsSync(path.join(dir, 'NotoSansSC-Regular.ttf'))) return dir
  }
  return null
}

export interface ReportFontState {
  /** Noto Sans SC registered (Chinese + Latin glyphs). */
  cjk: boolean
  /** Noto Sans Thai registered (optional asset). */
  thai: boolean
  dir: string | null
}

let state: ReportFontState | null = null

/**
 * Register the report fonts and the CJK line-break callback once per process.
 * Safe to call on every render. If the font files are missing (e.g. the
 * includeFiles config was dropped) the report falls back to Helvetica and
 * logs a warning instead of failing the publish.
 */
export function registerReportFonts(): ReportFontState {
  if (state) return state
  Font.registerHyphenationCallback(cjkHyphenationCallback)

  const dir = resolveFontDir()
  let cjk = false
  let thai = false
  if (dir) {
    const regular = path.join(dir, 'NotoSansSC-Regular.ttf')
    const boldPath = path.join(dir, 'NotoSansSC-Bold.ttf')
    const bold = existsSync(boldPath) ? boldPath : regular
    // Register the same files for italic: CJK has no italic, and react-pdf
    // throws "Could not resolve font" for a fontStyle with no sources.
    Font.register({
      family: CJK_FAMILY,
      fonts: [
        { src: regular, fontWeight: 400 },
        { src: bold, fontWeight: 700 },
        { src: regular, fontWeight: 400, fontStyle: 'italic' },
        { src: bold, fontWeight: 700, fontStyle: 'italic' },
      ],
    })
    cjk = true

    const thaiRegular = path.join(dir, 'NotoSansThai-Regular.ttf')
    if (existsSync(thaiRegular)) {
      const thaiBoldPath = path.join(dir, 'NotoSansThai-Bold.ttf')
      const thaiBold = existsSync(thaiBoldPath) ? thaiBoldPath : thaiRegular
      Font.register({
        family: THAI_FAMILY,
        fonts: [
          { src: thaiRegular, fontWeight: 400 },
          { src: thaiBold, fontWeight: 700 },
          { src: thaiRegular, fontWeight: 400, fontStyle: 'italic' },
          { src: thaiBold, fontWeight: 700, fontStyle: 'italic' },
        ],
      })
      thai = true
    }
  } else {
    console.warn('[report] Noto Sans SC not found in api/_fonts — PDF falls back to Helvetica (no CJK glyphs)')
  }
  state = { cjk, thai, dir }
  return state
}

/** Only Latin-1 plus the typographic punctuation Helvetica's WinAnsi encoding covers. */
const HELVETICA_SAFE = /^[\u0000-ÿ–—‘’‚“”„†‡•…‰‹›€™→]*$/

export function needsUnicodeFont(text: string): boolean {
  return !HELVETICA_SAFE.test(text)
}

/**
 * Pick the body font family for a report.
 *
 * English reports whose content is all Latin-1 keep Helvetica (identical
 * output to before). Anything else uses Noto Sans SC, with Noto Sans Thai as
 * a glyph fallback when it is installed. Registered fonts must come first in
 * the list: react-pdf stops loading a family list at the first built-in font.
 */
export function pickReportFontFamily(opts: { locale: string; text: string; fonts: ReportFontState }): string | string[] {
  const { locale, text, fonts } = opts
  const unicode = locale !== 'en' || needsUnicodeFont(text)
  if (!unicode || !fonts.cjk) return 'Helvetica'
  return fonts.thai ? [CJK_FAMILY, THAI_FAMILY] : CJK_FAMILY
}
