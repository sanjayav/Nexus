// Shared HTTP helpers for download/export responses.
// Not a serverless function (leading underscore), so it doesn't count towards
// the Vercel function budget.

/**
 * Build a `Content-Disposition` header value that is safe for Node's header
 * validation and works for non-ASCII (e.g. Chinese) file names.
 *
 * Node rejects any header byte outside latin1/visible ASCII with
 * `ERR_INVALID_CHAR`, so writing `filename="国网电费单.pdf"` crashes the
 * request with a 500. RFC 6266 §4.3 / RFC 5987 solve this with two
 * parameters:
 *
 *   attachment; filename="<ascii fallback>"; filename*=UTF-8''<percent-encoded>
 *
 * Modern browsers prefer `filename*`; old clients fall back to `filename`.
 */
export function contentDisposition(
  filename: string,
  disposition: 'attachment' | 'inline' = 'attachment',
): string {
  const name = sanitizeFilename(filename)
  return `${disposition}; filename="${asciiFallback(name)}"; filename*=UTF-8''${encodeRfc5987(name)}`
}

/** Strip control characters and path separators; never return an empty name. */
function sanitizeFilename(filename: string): string {
  const cleaned = String(filename ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[/\\]/g, '_')
    .trim()
  return cleaned || 'download'
}

/**
 * ASCII-only stand-in for the `filename` parameter. Accented Latin letters
 * keep their base letter; any other run of non-ASCII characters becomes a
 * single `_`. Quotes, backslashes and `%` are replaced so the quoted-string
 * is unambiguous. If nothing usable is left of the stem, use "download" and
 * keep the extension, so `国网电费单.pdf` → `download.pdf`.
 */
function asciiFallback(name: string): string {
  const ascii = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]+/g, '_')
    .replace(/["\\%;]/g, '_')

  const dot = ascii.lastIndexOf('.')
  const stem = dot > 0 ? ascii.slice(0, dot) : ascii
  const ext = dot > 0 ? ascii.slice(dot) : ''
  const cleanStem = stem.replace(/_+/g, '_').replace(/^[_\s-]+|[_\s-]+$/g, '')
  const cleanExt = /^\.[A-Za-z0-9]{1,10}$/.test(ext) ? ext : ext.replace(/[^A-Za-z0-9.]/g, '')
  return (cleanStem || 'download') + cleanExt
}

/** RFC 5987 `value-chars`: percent-encode everything outside `attr-char`. */
function encodeRfc5987(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*]/g,
    c => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  )
}

// ─── CSV ────────────────────────────────────────────────────────────────

/**
 * UTF-8 byte-order mark. Excel (notably on Chinese Windows, where the ANSI
 * code page is GBK) only treats a CSV as UTF-8 when it starts with a BOM;
 * without it Chinese text opens as mojibake.
 */
export const CSV_BOM = '\uFEFF'

/** RFC 4180 cell: quote when the value contains a quote, comma or newline, or
 *  has leading/trailing whitespace; inner quotes are doubled. Objects are
 *  serialised as JSON. */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  let s: string
  if (typeof v === 'string') s = v
  else if (v instanceof Date) s = v.toISOString()
  else if (typeof v === 'object') s = JSON.stringify(v)
  else s = String(v)
  if (/["\n\r,]/.test(s) || /^\s|\s$/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Join rows into CSV text (CRLF line endings, per RFC 4180) with a BOM. */
export function toCsv(rows: ReadonlyArray<ReadonlyArray<unknown>>): string {
  return CSV_BOM + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
