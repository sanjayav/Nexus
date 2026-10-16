/**
 * Server-side PDF renderer for sustainability reports.
 *
 * Uses @react-pdf/renderer (pure JS, works in Vercel serverless).
 * Produces a standards-shaped artefact:
 *   1. Cover page — org, framework, period, status watermark, verification QR
 *   2. Table of Contents (with page refs)
 *   3. About this report — scope, boundary, methodology, preparer
 *   4. Management assertion
 *   5. Narrative disclosures (pulled from approved assignment.narrative_body)
 *   6. Metrics (numeric tables by section)
 *   7. GRI Content Index (one row per disclosure with status + page ref)
 *   8. Assurance Statement (embedded signed PDF page or "PENDING" notice)
 *
 * No tricks — all content is pulled from the caller. If the data isn't there, the
 * section is either omitted or stamped "not provided" (which is itself a disclosure).
 *
 * Language: every user-visible string comes from api/_reportI18n.ts for
 * `input.locale` (en / zh / th). Fonts: api/_reportFonts.ts — Helvetica for
 * all-Latin English reports, Noto Sans SC (with CJK line breaking) otherwise.
 */
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import {
  countryLabel,
  displayCode,
  formatReportDate,
  formatReportValue,
  makeReportT,
  sectionNumber,
  type ReportLocale,
  type ReportT,
} from './_reportI18n.js'
import { isCjk, pickReportFontFamily, registerReportFonts } from './_reportFonts.js'

// ─── Types ──────────────────────────────────────────────────────

export interface ReportInput {
  /** Language the report is rendered in. Defaults to 'en'. */
  locale?: ReportLocale
  org: {
    name: string
    legal_name?: string
    thai_name?: string
    country?: string
    primary_color?: string
    secondary_color?: string
    logo_mark?: string
    industry?: string
    headquarters?: string
    website?: string
  }
  framework: {
    id: string
    code: string
    name: string
    /** Cover title, e.g. "Sustainability Report" / "环境、社会及管治报告". */
    reportTitle?: string
    /** Content-index heading, e.g. "GRI Content Index" / "《可持续发展报告》指标索引". */
    indexTitle?: string
    /** Heading of the code column, e.g. "Aspect / KPI". */
    codeColumn?: string
    /** Prefix stripped from codes for display (HKEX-A1.1 → A1.1). */
    codePrefix?: string
  }
  period: { label: string; year: number; start_date?: string | null; end_date?: string | null }
  /** Metrics — one row per approved disclosure */
  metrics: Array<{
    gri_code: string
    line_item: string
    section: string
    subsection: string
    unit: string | null
    value: number
    entity_count: number
  }>
  /** Narrative disclosures — approved narratives keyed by gri_code */
  narratives: Array<{
    gri_code: string
    line_item: string
    section: string
    subsection: string
    body: string
  }>
  /** Content index rows (GRI Content Index, HKEX content index, SSE index …) */
  contentIndex: Array<{
    gri_code: string
    line_item: string
    section: string
    /** Topic within the section — shown in the index when present. */
    subsection?: string
    status: 'fully' | 'partially' | 'omitted'
    approved: number
    total: number
  }>
  /** Assurance artefact — null if no signed statement yet */
  assurance: {
    firm: string
    signed_by: string
    signed_at: string
    opinion: 'limited' | 'reasonable'
    isae_reference: string
    notes?: string
  } | null
  /** Standard named in the "assurance pending" text (ISAE 3000 / CSAE 3101). */
  defaultAssuranceStandard?: string
  /** Verification metadata stamped on cover */
  verification: {
    token: string
    /** base URL like "https://app.aeiforo.com" — used for QR code */
    baseUrl: string
    /** QR code as PNG data-url, pre-computed by caller */
    qrPngDataUrl: string
  }
  /** Published metadata */
  publishedBy: string
  publishedAt: string
}

// ─── Design tokens (mirror the Nexus brand) ──────────────────

const colors = {
  brand: '#1B6B7B',
  brandStrong: '#134E5A',
  brandSoft: '#EAF4F7',
  ink: '#0B1220',
  ink2: '#414B5C',
  ink3: '#6A748A',
  ink4: '#99A3B5',
  border: '#E3E7EC',
  borderSoft: '#EDF0F3',
  bg: '#F7F8FA',
  green: '#2E7D32',
  amber: '#E6A817',
  red: '#C62828',
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 64,
    paddingHorizontal: 48,
    fontSize: 10,
    color: colors.ink,
    fontFamily: 'Helvetica',
    lineHeight: 1.45,
  },
  coverPage: {
    padding: 0,
    fontSize: 10,
    color: colors.ink,
    fontFamily: 'Helvetica',
  },
  coverTop: {
    backgroundColor: colors.brand,
    color: 'white',
    padding: 48,
    height: 420,
    justifyContent: 'flex-end',
  },
  coverBottom: {
    padding: 48,
  },
  header: {
    position: 'absolute',
    top: 24,
    left: 48,
    right: 48,
    fontSize: 9,
    color: colors.ink3,
    borderBottom: `0.5pt solid ${colors.borderSoft}`,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    fontSize: 8,
    color: colors.ink4,
    borderTop: `0.5pt solid ${colors.borderSoft}`,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  h1: { fontSize: 28, fontWeight: 700, marginBottom: 6, color: colors.ink, lineHeight: 1.15 },
  h2: { fontSize: 18, fontWeight: 700, marginTop: 20, marginBottom: 10, color: colors.ink },
  h3: { fontSize: 13, fontWeight: 700, marginTop: 14, marginBottom: 6, color: colors.ink },
  kicker: { fontSize: 9, letterSpacing: 1.5, color: colors.brand, marginBottom: 4, textTransform: 'uppercase', fontWeight: 700 },
  body: { fontSize: 10, color: colors.ink2, marginBottom: 6 },
  mono: { fontFamily: 'Courier', fontSize: 8, color: colors.ink3 },
  tocItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottom: `0.5pt solid ${colors.borderSoft}` },
  tocLabel: { fontSize: 10, color: colors.ink },
  tocPage: { fontSize: 10, color: colors.ink3 },
  table: { width: '100%', marginTop: 4, marginBottom: 10 },
  th: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.ink3,
    fontWeight: 700,
  },
  tr: {
    flexDirection: 'row',
    borderBottom: `0.5pt solid ${colors.borderSoft}`,
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontSize: 9,
  },
  td: { color: colors.ink2 },
  statusPill: { fontSize: 7, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 700 },
  draftBand: {
    position: 'absolute',
    top: 420 / 2 - 30,
    left: -40,
    right: -40,
    paddingVertical: 10,
    backgroundColor: colors.amber,
    color: 'white',
    fontSize: 16,
    letterSpacing: 6,
    textAlign: 'center',
    fontWeight: 700,
    transform: 'rotate(-8deg)',
  },
  verifyBox: {
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: 12,
    marginTop: 14,
    fontSize: 8,
    color: colors.ink3,
  },
  narrativeBlock: {
    marginTop: 10,
    marginBottom: 14,
    paddingLeft: 10,
    borderLeft: `2pt solid ${colors.brand}`,
  },
})

// ─── Render context ──────────────────────────────────────────────

interface Ctx {
  input: ReportInput
  locale: ReportLocale
  t: ReportT
  /** Body font family (Helvetica, or Noto Sans SC [+ Noto Sans Thai]). */
  font: string | string[]
  indexTitle: string
  codeColumn: string
  date: (v: string | null | undefined) => string
}

function kicker(ctx: Ctx, n: number): string {
  return ctx.t('section.kicker', { n: sectionNumber(n, ctx.locale) })
}

/** Logo mark: explicit mark, else the first two characters of a CJK name, else initials. */
export function deriveLogoMark(name: string, explicit?: string): string {
  if (explicit) return explicit
  const trimmed = name.trim()
  const chars = Array.from(trimmed)
  if (chars.length > 0 && isCjk(chars[0])) {
    return chars.filter(isCjk).slice(0, 2).join('')
  }
  return trimmed.split(/\s+/).filter(Boolean).map(s => Array.from(s)[0]).join('').slice(0, 4).toUpperCase()
}

// ─── Cover page ──────────────────────────────────────────────────

function Cover({ ctx }: { ctx: Ctx }) {
  const { input, t, locale } = ctx
  const isDraft = input.assurance == null
  const primary = input.org.primary_color || '#1B6B7B'
  const secondary = input.org.secondary_color || '#134E5A'
  const displayName = input.org.name
  const legalName = input.org.legal_name
  // The Thai org name is part of the bilingual Thai cover only.
  const thaiName = locale === 'th' ? input.org.thai_name : undefined
  const logoMark = deriveLogoMark(displayName, input.org.logo_mark)
  const reportTitle = input.framework.reportTitle || t('cover.reportTitle')
  const periodRange = input.period.start_date
    ? (input.period.end_date
        ? t('period.range', { start: ctx.date(input.period.start_date), end: ctx.date(input.period.end_date) })
        : t('period.from', { start: ctx.date(input.period.start_date) }))
    : t('period.fy', { year: input.period.year })

  return (
    <Page size="A4" style={[styles.coverPage, { fontFamily: ctx.font }]}>
      <View style={{ ...styles.coverTop, backgroundColor: primary, position: 'relative' }}>
        {/* Subtle gradient overlay */}
        <View style={{ position: 'absolute', top: 0, right: 0, width: 260, height: 260, backgroundColor: secondary, opacity: 0.35, borderRadius: 130 }} />
        <View style={{ position: 'absolute', bottom: -60, left: -60, width: 180, height: 180, backgroundColor: 'white', opacity: 0.04, borderRadius: 90 }} />

        {isDraft && (
          <Text style={[styles.draftBand, locale === 'zh' ? { letterSpacing: 2 } : {}]}>{t('cover.draftBand')}</Text>
        )}

        {/* Logo mark top-left */}
        <View style={{ position: 'absolute', top: 32, left: 48, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: 700, color: primary, letterSpacing: 0.4 }}>{logoMark}</Text>
          </View>
          {input.org.industry && (
            <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700 }}>
              {input.org.industry}
            </Text>
          )}
        </View>

        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', letterSpacing: locale === 'zh' ? 1.5 : 3, marginBottom: 14, textTransform: 'uppercase', fontWeight: 700 }}>
          {t('cover.kicker', { code: input.framework.code, reportTitle })}
        </Text>
        <Text style={{ fontSize: 36, fontWeight: 700, color: 'white', lineHeight: locale === 'zh' ? 1.25 : 1.05, marginBottom: 8 }}>
          {displayName}
        </Text>
        {thaiName && (
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 1.3, marginBottom: 14 }}>
            {thaiName}
          </Text>
        )}
        {legalName && !thaiName && legalName !== displayName && (
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 14 }}>
            {legalName}
          </Text>
        )}
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>
          {t('cover.fiscalYear', { label: input.period.label, year: input.period.year, yearBE: input.period.year + 543 })}
        </Text>
      </View>

      <View style={styles.coverBottom}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: 24 }}>
            <Text style={{ ...styles.kicker, color: primary }}>{t('cover.aboutKicker')}</Text>
            <Text style={styles.body}>
              {t('cover.aboutBody', { org: displayName, periodRange, frameworkName: input.framework.name })}
            </Text>
            <Text style={styles.body}>{t('cover.consolidation')}</Text>

            {(input.org.headquarters || input.org.website) && (
              <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: colors.borderSoft }}>
                {input.org.headquarters && (
                  <Text style={{ fontSize: 9, color: colors.ink3, marginBottom: 2 }}>
                    {t('cover.headquarters', { hq: input.org.headquarters })}
                  </Text>
                )}
                {input.org.website && (
                  <Text style={{ fontSize: 9, color: colors.ink3 }}>
                    {input.org.website}
                  </Text>
                )}
              </View>
            )}

            <View style={{ ...styles.verifyBox, borderLeftWidth: 3, borderLeftColor: primary }}>
              <Text style={{ fontSize: 9, fontWeight: 700, color: colors.ink, marginBottom: 4 }}>{t('cover.verifyTitle')}</Text>
              <Text>{t('cover.token')}<Text style={styles.mono}>{input.verification.token}</Text></Text>
              <Text>{t('cover.verifyAt')}<Text style={styles.mono}>{input.verification.baseUrl}/verify/{input.verification.token}</Text></Text>
              <Text style={{ marginTop: 4 }}>
                {t('cover.publishedBy', { name: input.publishedBy, date: ctx.date(input.publishedAt) })}
              </Text>
            </View>
          </View>

          <View style={{ width: 120, alignItems: 'center' }}>
            {input.verification.qrPngDataUrl && (
              <Image src={input.verification.qrPngDataUrl} style={{ width: 110, height: 110, marginBottom: 6 }} />
            )}
            <Text style={{ fontSize: 8, color: colors.ink3, textAlign: 'center' }}>{t('cover.scanToVerify')}</Text>
          </View>
        </View>
      </View>
    </Page>
  )
}

// ─── TOC page ────────────────────────────────────────────────────

function TOC({ ctx }: { ctx: Ctx }) {
  const { input, t } = ctx
  const toc = [
    { label: t('toc.about'), page: 3 },
    { label: t('toc.assertion'), page: 4 },
    { label: t('toc.narratives'), page: 5 },
    { label: t('toc.metrics'), page: 6 + Math.ceil(input.narratives.length / 2) },
    { label: t('toc.index', { indexTitle: ctx.indexTitle }), page: 6 + Math.ceil(input.narratives.length / 2) + Math.ceil(input.metrics.length / 28) },
    { label: t('toc.assurance'), page: 7 + Math.ceil(input.narratives.length / 2) + Math.ceil(input.metrics.length / 28) + Math.ceil(input.contentIndex.length / 32) },
  ]
  return (
    <Page size="A4" style={[styles.page, { fontFamily: ctx.font }]}>
      <Header ctx={ctx} />
      <Text style={styles.kicker}>{t('toc.kicker')}</Text>
      <Text style={styles.h1}>{t('toc.title')}</Text>
      <View style={{ marginTop: 20 }}>
        {toc.map(item => (
          <View key={item.label} style={styles.tocItem}>
            <Text style={styles.tocLabel}>{item.label}</Text>
            <Text style={styles.tocPage}>{item.page}</Text>
          </View>
        ))}
      </View>
      <Footer ctx={ctx} />
    </Page>
  )
}

// ─── About + Management Assertion page ──────────────────────────

function AboutAndAssertion({ ctx }: { ctx: Ctx }) {
  const { input, t } = ctx
  const range = input.period.start_date && input.period.end_date
    ? t('about.periodRange', { start: ctx.date(input.period.start_date), end: ctx.date(input.period.end_date) })
    : ''
  return (
    <Page size="A4" style={[styles.page, { fontFamily: ctx.font }]}>
      <Header ctx={ctx} />
      <Text style={styles.kicker}>{kicker(ctx, 1)}</Text>
      <Text style={styles.h2}>{t('about.title')}</Text>
      <Text style={styles.body}>
        <Text style={{ fontWeight: 700 }}>{t('about.orgLabel')}</Text>{' '}
        {t('about.orgBody', { org: input.org.name, hq: input.org.country ? t('about.orgHq', { country: countryLabel(input.org.country, ctx.locale) }) : '' })}
      </Text>
      <Text style={styles.body}>
        <Text style={{ fontWeight: 700 }}>{t('about.frameworkLabel')}</Text>{' '}
        {t('about.frameworkBody', { name: input.framework.name, code: input.framework.code, indexTitle: ctx.indexTitle })}
      </Text>
      <Text style={styles.body}>
        <Text style={{ fontWeight: 700 }}>{t('about.periodLabel')}</Text>{' '}
        {t('about.periodBody', { label: input.period.label, year: input.period.year, range })}
      </Text>
      <Text style={styles.body}>
        <Text style={{ fontWeight: 700 }}>{t('about.boundaryLabel')}</Text> {t('about.boundaryBody')}
      </Text>
      <Text style={styles.body}>
        <Text style={{ fontWeight: 700 }}>{t('about.prepLabel')}</Text> {t('about.prepBody')}
      </Text>

      <Text style={[styles.kicker, { marginTop: 24 }]}>{kicker(ctx, 2)}</Text>
      <Text style={styles.h2}>{t('assertion.title')}</Text>
      <Text style={styles.body}>{t('assertion.intro', { org: input.org.name })}</Text>
      <Text style={[styles.body, { marginLeft: 14 }]}>{t('assertion.b1', { frameworkName: input.framework.name })}</Text>
      <Text style={[styles.body, { marginLeft: 14 }]}>{t('assertion.b2')}</Text>
      <Text style={[styles.body, { marginLeft: 14 }]}>{t('assertion.b3')}</Text>
      <Text style={[styles.body, { marginLeft: 14 }]}>{t('assertion.b4')}</Text>

      <Text style={[styles.body, { marginTop: 12 }]}>{t('assertion.publishedBy')}<Text style={{ fontWeight: 700 }}>{input.publishedBy}</Text></Text>
      <Text style={styles.body}>{t('assertion.date', { date: ctx.date(input.publishedAt) })}</Text>
      <Footer ctx={ctx} />
    </Page>
  )
}

// ─── Narrative disclosures ──────────────────────────────────────

function Narratives({ ctx }: { ctx: Ctx }) {
  const { input, t } = ctx
  if (input.narratives.length === 0) {
    return (
      <Page size="A4" style={[styles.page, { fontFamily: ctx.font }]}>
        <Header ctx={ctx} />
        <Text style={styles.kicker}>{kicker(ctx, 3)}</Text>
        <Text style={styles.h2}>{t('narr.title')}</Text>
        <Text style={styles.body}>{t('narr.empty', { indexTitle: ctx.indexTitle })}</Text>
        <Footer ctx={ctx} />
      </Page>
    )
  }
  // Group by section
  const bySection: Record<string, typeof input.narratives> = {}
  for (const n of input.narratives) {
    bySection[n.section] ??= []
    bySection[n.section].push(n)
  }
  return (
    <Page size="A4" style={[styles.page, { fontFamily: ctx.font }]}>
      <Header ctx={ctx} />
      <Text style={styles.kicker}>{kicker(ctx, 3)}</Text>
      <Text style={styles.h2}>{t('narr.title')}</Text>
      {Object.entries(bySection).map(([section, rows]) => (
        <View key={section} wrap={true}>
          <Text style={styles.h3}>{section}</Text>
          {rows.map((n, i) => (
            <View key={`${n.gri_code}-${i}`} style={styles.narrativeBlock} wrap={true}>
              <Text style={{ fontSize: 9, color: colors.brand, fontWeight: 700, marginBottom: 2 }}>
                {displayCode(n.gri_code, input.framework)} · {n.line_item}
              </Text>
              {n.subsection ? (
                <Text style={{ fontSize: 8, color: colors.ink3, marginBottom: 2 }}>{n.subsection}</Text>
              ) : null}
              <Text style={{ fontSize: 10, color: colors.ink2, lineHeight: ctx.locale === 'zh' ? 1.7 : 1.5 }}>{n.body}</Text>
            </View>
          ))}
        </View>
      ))}
      <Footer ctx={ctx} />
    </Page>
  )
}

// ─── Metrics tables ─────────────────────────────────────────────

function Metrics({ ctx }: { ctx: Ctx }) {
  const { input, t } = ctx
  const bySection: Record<string, typeof input.metrics> = {}
  for (const m of input.metrics) {
    bySection[m.section] ??= []
    bySection[m.section].push(m)
  }
  if (Object.keys(bySection).length === 0) {
    return (
      <Page size="A4" style={[styles.page, { fontFamily: ctx.font }]}>
        <Header ctx={ctx} />
        <Text style={styles.kicker}>{kicker(ctx, 4)}</Text>
        <Text style={styles.h2}>{t('metrics.title')}</Text>
        <Text style={styles.body}>{t('metrics.empty')}</Text>
        <Footer ctx={ctx} />
      </Page>
    )
  }
  return (
    <Page size="A4" style={[styles.page, { fontFamily: ctx.font }]}>
      <Header ctx={ctx} />
      <Text style={styles.kicker}>{kicker(ctx, 4)}</Text>
      <Text style={styles.h2}>{t('metrics.title')}</Text>
      <Text style={styles.body}>{t('metrics.intro')}</Text>

      {Object.entries(bySection).map(([section, rows]) => (
        <View key={section} wrap={true} style={{ marginTop: 10 }}>
          <Text style={styles.h3}>{section}</Text>
          <View style={styles.table}>
            <View style={styles.th}>
              <Text style={{ width: '18%' }}>{ctx.codeColumn}</Text>
              <Text style={{ width: '44%', paddingRight: 6 }}>{t('metrics.col.lineItem')}</Text>
              <Text style={{ width: '14%' }}>{t('metrics.col.unit')}</Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>{t('metrics.col.total')}</Text>
              <Text style={{ width: '8%', textAlign: 'right' }}>{t('metrics.col.entities')}</Text>
            </View>
            {rows.map((r, i) => (
              <View key={`${r.gri_code}-${r.line_item}-${i}`} style={styles.tr} wrap={false}>
                <Text style={{ width: '18%', color: colors.brand, fontWeight: 700 }}>{displayCode(r.gri_code, input.framework)}</Text>
                <View style={{ width: '44%', paddingRight: 6 }}>
                  <Text style={{ color: colors.ink }}>{r.line_item}</Text>
                  {r.subsection ? <Text style={{ color: colors.ink4, fontSize: 7 }}>{r.subsection}</Text> : null}
                </View>
                <Text style={{ width: '14%', color: colors.ink3 }}>{r.unit ?? '—'}</Text>
                <Text style={{ width: '16%', textAlign: 'right', color: colors.ink, fontWeight: 700 }}>{formatReportValue(r.value, ctx.locale)}</Text>
                <Text style={{ width: '8%', textAlign: 'right', color: colors.ink3 }}>{r.entity_count}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
      <Footer ctx={ctx} />
    </Page>
  )
}

// ─── Content Index (framework-specific title and code column) ───

function ContentIndex({ ctx }: { ctx: Ctx }) {
  const { input, t } = ctx
  return (
    <Page size="A4" style={[styles.page, { fontFamily: ctx.font }]}>
      <Header ctx={ctx} />
      <Text style={styles.kicker}>{kicker(ctx, 5)}</Text>
      <Text style={styles.h2}>{ctx.indexTitle}</Text>
      <Text style={styles.body}>{t('index.intro', { code: input.framework.code })}</Text>

      <View style={styles.table}>
        <View style={styles.th}>
          <Text style={{ width: '16%' }}>{ctx.codeColumn}</Text>
          <Text style={{ width: '46%' }}>{t('index.col.disclosure')}</Text>
          <Text style={{ width: '22%' }}>{t('index.col.section')}</Text>
          <Text style={{ width: '8%', textAlign: 'right' }}>{t('index.col.coverage')}</Text>
          <Text style={{ width: '8%', textAlign: 'center' }}>{t('index.col.status')}</Text>
        </View>
        {input.contentIndex.map((r, i) => (
          <View key={i} style={styles.tr} wrap={false}>
            <Text style={{ width: '16%', color: colors.brand, fontWeight: 700 }}>{displayCode(r.gri_code, input.framework)}</Text>
            <Text style={{ width: '46%', color: colors.ink, paddingRight: 6 }}>{r.line_item}</Text>
            <Text style={{ width: '22%', color: colors.ink3, fontSize: 8, paddingRight: 4 }}>{r.subsection || r.section}</Text>
            <Text style={{ width: '8%', textAlign: 'right', color: colors.ink2, fontSize: 8 }}>
              {r.total === 0 ? '—' : `${r.approved}/${r.total}`}
            </Text>
            <Text
              style={[
                styles.statusPill,
                { width: '8%', textAlign: 'center' },
                r.status === 'fully' ? { color: colors.green } : r.status === 'partially' ? { color: colors.amber } : { color: colors.ink4 },
              ]}
            >
              {r.status === 'fully' ? t('index.status.fully') : r.status === 'partially' ? t('index.status.partially') : t('index.status.omitted')}
            </Text>
          </View>
        ))}
      </View>
      <Footer ctx={ctx} />
    </Page>
  )
}

// ─── Assurance Statement ────────────────────────────────────────

function AssurancePage({ ctx }: { ctx: Ctx }) {
  const { input, t } = ctx
  const a = input.assurance
  const standard = input.defaultAssuranceStandard || t('assurance.standardIsae')
  return (
    <Page size="A4" style={[styles.page, { fontFamily: ctx.font }]}>
      <Header ctx={ctx} />
      <Text style={styles.kicker}>{kicker(ctx, 6)}</Text>
      <Text style={styles.h2}>{t('assurance.title')}</Text>
      {a ? (
        <>
          <Text style={styles.body}>
            <Text style={{ fontWeight: 700 }}>{t('assurance.firm')}</Text> {a.firm}
          </Text>
          <Text style={styles.body}>
            <Text style={{ fontWeight: 700 }}>{t('assurance.signedBy')}</Text> {a.signed_by}
          </Text>
          <Text style={styles.body}>
            <Text style={{ fontWeight: 700 }}>{t('assurance.signedOn')}</Text> {ctx.date(a.signed_at)}
          </Text>
          <Text style={styles.body}>
            <Text style={{ fontWeight: 700 }}>{t('assurance.level')}</Text> {a.opinion === 'reasonable' ? t('assurance.reasonable') : t('assurance.limited')}
          </Text>
          <Text style={styles.body}>
            <Text style={{ fontWeight: 700 }}>{t('assurance.standard')}</Text> {a.isae_reference}
          </Text>
          {a.notes && <Text style={[styles.body, { marginTop: 10 }]}>{a.notes}</Text>}
          {/* Italic needs a registered italic face for custom fonts — _reportFonts registers one. */}
          <Text style={[styles.body, { marginTop: 14, fontStyle: 'italic', color: colors.ink3 }]}>
            {t('assurance.appended', { firm: a.firm })}
          </Text>
        </>
      ) : (
        <View style={{ marginTop: 16, padding: 16, borderWidth: 1, borderColor: colors.amber, backgroundColor: '#FFF8E1' }}>
          <Text style={{ fontSize: 12, fontWeight: 700, color: colors.amber, marginBottom: 6 }}>
            {t('assurance.pending')}
          </Text>
          <Text style={styles.body}>
            {t('assurance.pendingLead')}
            <Text style={{ fontWeight: 700 }}>{t('assurance.unauditedDraft')}</Text>
            {t('assurance.pendingTail')}
          </Text>
          <Text style={styles.body}>{t('assurance.pendingReissue', { standard })}</Text>
          <Text style={styles.body}>{t('assurance.pendingReaders')}</Text>
        </View>
      )}
      <Footer ctx={ctx} />
    </Page>
  )
}

// ─── Chrome ─────────────────────────────────────────────────────

function Header({ ctx }: { ctx: Ctx }) {
  const { input } = ctx
  return (
    <View style={styles.header} fixed>
      <Text>{input.org.name}</Text>
      <Text>{input.framework.code} · {input.period.label}</Text>
    </View>
  )
}

function Footer({ ctx }: { ctx: Ctx }) {
  const { input, t } = ctx
  return (
    <View style={styles.footer} fixed>
      <Text>
        {t('chrome.verify', { url: `${input.verification.baseUrl}/verify/${input.verification.token}` })}
      </Text>
      <Text
        render={({ pageNumber, totalPages }) => t('chrome.page', { page: pageNumber, total: totalPages })}
      />
    </View>
  )
}

// ─── Document (composed) ────────────────────────────────────────

/** All user-supplied text in the report — used to decide whether Helvetica suffices. */
function collectText(input: ReportInput): string {
  const parts: string[] = [
    input.org.name, input.org.legal_name ?? '', input.org.thai_name ?? '', input.org.country ?? '',
    input.org.industry ?? '', input.org.headquarters ?? '', input.org.website ?? '', input.org.logo_mark ?? '',
    input.framework.code, input.framework.name, input.framework.reportTitle ?? '', input.framework.indexTitle ?? '', input.framework.codeColumn ?? '',
    input.period.label, input.publishedBy, input.defaultAssuranceStandard ?? '',
  ]
  for (const m of input.metrics) parts.push(m.gri_code, m.line_item, m.section, m.subsection, m.unit ?? '')
  for (const n of input.narratives) parts.push(n.gri_code, n.line_item, n.section, n.subsection, n.body)
  for (const r of input.contentIndex) parts.push(r.gri_code, r.line_item, r.section, r.subsection ?? '')
  if (input.assurance) {
    const a = input.assurance
    parts.push(a.firm, a.signed_by, a.isae_reference, a.notes ?? '')
  }
  return parts.join('\n')
}

export function ReportDocument({ input }: { input: ReportInput }) {
  const locale: ReportLocale = input.locale ?? 'en'
  const fonts = registerReportFonts()
  const t = makeReportT(locale, { thaiGlyphs: fonts.thai })
  const font = pickReportFontFamily({ locale, text: collectText(input), fonts })

  // Override the brand accent colors from the org so every internal page feels
  // on-brand without creating a separate theme file.
  const brandPrimary = input.org.primary_color || '#1B6B7B'
  const brandStrong = input.org.secondary_color || '#134E5A'
  // Mutate colors only for this document instance via a wrapped style override
  Object.assign(colors, { brand: brandPrimary, brandStrong })

  const ctx: Ctx = {
    input,
    locale,
    t,
    font,
    indexTitle: input.framework.indexTitle || `${input.framework.code} Content Index`,
    codeColumn: input.framework.codeColumn || t('metrics.col.code'),
    date: v => formatReportDate(v, locale),
  }

  return (
    <Document
      title={t('doc.title', { org: input.org.name, code: input.framework.code, year: input.period.year })}
      author={input.publishedBy}
      subject={t('doc.subject', { name: input.framework.name, year: input.period.year })}
      keywords={t('doc.keywords', { code: input.framework.code, org: input.org.name })}
      creator="Nexus"
      producer="Nexus ESG Platform · by Aeiforo"
      language={locale === 'zh' ? 'zh-CN' : locale === 'th' ? 'th' : 'en'}
    >
      <Cover ctx={ctx} />
      <TOC ctx={ctx} />
      <AboutAndAssertion ctx={ctx} />
      <Narratives ctx={ctx} />
      <Metrics ctx={ctx} />
      <ContentIndex ctx={ctx} />
      <AssurancePage ctx={ctx} />
    </Document>
  )
}
