/**
 * Report generator — pulls approved data from the DB, renders the PDF via
 * @react-pdf/renderer, and returns the PDF bytes + SHA-256.
 *
 * Language: see api/_reportI18n.ts (dictionary, framework catalogue, locale
 * resolution) and api/_reportFonts.ts (Noto Sans SC + CJK line breaking).
 */
import { pdf } from '@react-pdf/renderer'
import * as crypto from 'crypto'
import QRCode from 'qrcode'
import React from 'react'
import { ReportDocument, type ReportInput } from './_reportPdf.js'
import { registerReportFonts } from './_reportFonts.js'
import { getReportFramework, isChinaOrg, makeReportT, pickLocalized, resolveReportLocale } from './_reportI18n.js'

type SqlTag = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>

/**
 * Pull all data the report needs from the DB, build the input shape.
 *
 * `locale` is the language requested by the publisher (UI language). It is
 * resolved against the org (Thai orgs keep their bilingual cover) and the
 * resolved value is returned on `input.locale` — the caller stores that on
 * report_artifacts so DOCX / iXBRL renders of the artifact match the PDF.
 *
 * Localised columns (`line_item_zh`, `section_zh`, `subsection_zh`,
 * `name_zh`, `legal_name_zh`) are read via `to_jsonb(row)->>'col'` so the
 * query still works on a database where the migration has not run yet; any
 * missing translation falls back to the canonical English text.
 */
export async function assembleReportInput(
  sql: SqlTag,
  args: {
    orgId: string
    periodId: string
    frameworkId: string
    publishedBy: string
    publishedAt: string
    verificationToken: string
    baseUrl: string
    assuranceRequestId: string | null
    /** Requested report language ('en' | 'zh' | 'zh-CN' | 'th' …). */
    locale?: string | null
  }
): Promise<ReportInput> {
  const { orgId, periodId, frameworkId, publishedBy, publishedAt, verificationToken, baseUrl, assuranceRequestId } = args

  // ── Org meta + brand ──
  const orgRows = await sql`
    SELECT o.name, o.legal_name, o.thai_name, o.country, o.primary_color, o.secondary_color, o.logo_mark,
           o.industry, o.headquarters, o.website,
           to_jsonb(o)->>'name_zh' AS name_zh,
           to_jsonb(o)->>'legal_name_zh' AS legal_name_zh
    FROM organisations o WHERE o.id = ${orgId}
  ` as Array<{
    name: string; legal_name: string | null; thai_name: string | null; country: string | null
    primary_color: string | null; secondary_color: string | null; logo_mark: string | null
    industry: string | null; headquarters: string | null; website: string | null
    name_zh?: string | null; legal_name_zh?: string | null
  }>
  const org = orgRows[0] ?? { name: 'Organisation', legal_name: null, thai_name: null, country: null, primary_color: null, secondary_color: null, logo_mark: null, industry: null, headquarters: null, website: null, name_zh: null, legal_name_zh: null }

  const locale = resolveReportLocale(args.locale, org)
  const t = makeReportT(locale)
  const general = t('general.generalDisclosures')

  // ── Period meta. Dates come back as Date/timestamptz — coerce to ISO date string. ──
  const periodRows = await sql`SELECT label, year, start_date, end_date FROM reporting_periods WHERE id = ${periodId} AND org_id = ${orgId}` as Array<{ label: string; year: number; start_date: unknown; end_date: unknown }>
  const coerceDate = (v: unknown): string | null => {
    if (!v) return null
    if (typeof v === 'string') return v.slice(0, 10)
    if (v instanceof Date) return v.toISOString().slice(0, 10)
    return String(v).slice(0, 10)
  }
  const pr = periodRows[0]
  const period = pr
    ? { label: pr.label, year: pr.year, start_date: coerceDate(pr.start_date), end_date: coerceDate(pr.end_date) }
    : { label: locale === 'zh' ? '本报告期' : 'Current period', year: new Date().getFullYear(), start_date: null, end_date: null }

  // ── Framework (localised name, content-index title and code column) ──
  const framework = getReportFramework(frameworkId, locale)

  // ── Approved numeric metrics, aggregated to group level ──
  const metricRows = await sql`
    SELECT
      qa.gri_code,
      qa.line_item,
      MIN(to_jsonb(qi)->>'line_item_zh') AS line_item_zh,
      MIN(qi.section) AS section,
      MIN(to_jsonb(qi)->>'section_zh') AS section_zh,
      COALESCE(MIN(qi.subsection), '') AS subsection,
      MIN(to_jsonb(qi)->>'subsection_zh') AS subsection_zh,
      COALESCE(MIN(qa.unit), '') AS unit,
      SUM(qa.value)::float AS value,
      COUNT(DISTINCT qa.entity_id)::int AS entity_count
    FROM question_assignments qa
    LEFT JOIN questionnaire_item qi ON qi.id = qa.questionnaire_item_id
    WHERE qa.org_id = ${orgId}
      AND qa.framework_id = ${frameworkId}
      AND qa.status = 'approved'
      AND qa.response_type != 'narrative'
      AND qa.value IS NOT NULL
    GROUP BY qa.gri_code, qa.line_item
    ORDER BY MIN(qi.section), qa.gri_code
  ` as Array<LocalizedRow & { unit: string; value: number | string; entity_count: number }>

  const metrics = metricRows.map(m => ({
    gri_code: m.gri_code,
    line_item: pickLocalized(m.line_item, m.line_item_zh, locale),
    section: pickLocalized(m.section, m.section_zh, locale) || general,
    subsection: pickLocalized(m.subsection, m.subsection_zh, locale) || '',
    unit: m.unit || null,
    value: Number(m.value),
    entity_count: m.entity_count,
  }))

  // ── Approved narrative disclosures ──
  const narrativeRows = await sql`
    SELECT
      qa.gri_code,
      qa.line_item,
      MIN(to_jsonb(qi)->>'line_item_zh') AS line_item_zh,
      MIN(qi.section) AS section,
      MIN(to_jsonb(qi)->>'section_zh') AS section_zh,
      COALESCE(MIN(qi.subsection), '') AS subsection,
      MIN(to_jsonb(qi)->>'subsection_zh') AS subsection_zh,
      MAX(qa.narrative_body) AS body
    FROM question_assignments qa
    LEFT JOIN questionnaire_item qi ON qi.id = qa.questionnaire_item_id
    WHERE qa.org_id = ${orgId}
      AND qa.framework_id = ${frameworkId}
      AND qa.status = 'approved'
      AND qa.narrative_body IS NOT NULL
      AND length(qa.narrative_body) > 0
    GROUP BY qa.gri_code, qa.line_item
    ORDER BY MIN(qi.section), qa.gri_code
  ` as Array<LocalizedRow & { body: string }>

  const narratives = narrativeRows.map(n => ({
    gri_code: n.gri_code,
    line_item: pickLocalized(n.line_item, n.line_item_zh, locale),
    section: pickLocalized(n.section, n.section_zh, locale) || general,
    subsection: pickLocalized(n.subsection, n.subsection_zh, locale) || '',
    body: n.body,
  }))

  // ── Content index (same scope query as api/org.ts content-index view) ──
  const contentIndexRows = await sql`
    WITH scope AS (
      SELECT
        gri_code,
        line_item,
        MIN(to_jsonb(questionnaire_item)->>'line_item_zh') AS line_item_zh,
        MIN(section) AS section,
        MIN(to_jsonb(questionnaire_item)->>'section_zh') AS section_zh,
        MIN(subsection) AS subsection,
        MIN(to_jsonb(questionnaire_item)->>'subsection_zh') AS subsection_zh
      FROM questionnaire_item
      WHERE framework_id = ${frameworkId}
      GROUP BY gri_code, line_item
    ),
    agg AS (
      SELECT qi.gri_code, qi.line_item,
             COUNT(qa.id)::int AS total,
             COUNT(qa.id) FILTER (WHERE qa.status = 'approved')::int AS approved
      FROM question_assignments qa
      JOIN questionnaire_item qi ON qi.id = qa.questionnaire_item_id
      WHERE qa.org_id = ${orgId} AND qa.framework_id = ${frameworkId}
      GROUP BY qi.gri_code, qi.line_item
    )
    SELECT
      s.gri_code, s.line_item, s.line_item_zh, s.section, s.section_zh, s.subsection, s.subsection_zh,
      COALESCE(a.total, 0)    AS total,
      COALESCE(a.approved, 0) AS approved,
      CASE
        WHEN a.total IS NULL OR a.total = 0             THEN 'omitted'
        WHEN a.approved = a.total AND a.total > 0       THEN 'fully'
        WHEN a.approved > 0                             THEN 'partially'
        ELSE 'omitted'
      END AS status
    FROM scope s
    LEFT JOIN agg a ON a.gri_code = s.gri_code AND a.line_item = s.line_item
    ORDER BY s.gri_code, s.line_item
  ` as Array<LocalizedRow & { total: number; approved: number; status: 'fully' | 'partially' | 'omitted' }>

  const contentIndex = contentIndexRows.map(r => ({
    gri_code: r.gri_code,
    line_item: pickLocalized(r.line_item, r.line_item_zh, locale),
    section: pickLocalized(r.section, r.section_zh, locale) || '—',
    subsection: pickLocalized(r.subsection, r.subsection_zh, locale) || '',
    status: r.status,
    total: r.total,
    approved: r.approved,
  }))

  // ── Signed assurance (if any) ──
  // Default standard: CSAE 3101 for mainland orgs, ISAE 3000 (Revised) otherwise.
  const defaultStandard = isChinaOrg(org) ? t('assurance.standardCsae') : t('assurance.standardIsae')
  let assurance: ReportInput['assurance'] = null
  if (assuranceRequestId) {
    const arRows = await sql`
      SELECT auditor_firm, signed_by, signed_at, opinion_type, isae_reference, notes
      FROM assurance_requests
      WHERE id = ${assuranceRequestId} AND org_id = ${orgId} AND status = 'signed'
    ` as Array<{ auditor_firm: string | null; signed_by: string | null; signed_at: string | null; opinion_type: string | null; isae_reference: string | null; notes: string | null }>
    if (arRows.length > 0 && arRows[0].signed_at) {
      const a = arRows[0]
      assurance = {
        firm: a.auditor_firm || t('assurance.defaultFirm'),
        signed_by: a.signed_by || t('assurance.defaultSigner'),
        signed_at: typeof a.signed_at === 'string' ? a.signed_at : new Date(a.signed_at as unknown as string).toISOString(),
        opinion: (a.opinion_type === 'reasonable' ? 'reasonable' : 'limited'),
        isae_reference: a.isae_reference || defaultStandard,
        notes: a.notes || undefined,
      }
    }
  }

  // ── QR code for public verification ──
  const verifyUrl = `${baseUrl}/verify/${verificationToken}`
  const qrPngDataUrl = await QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: 'M',
    margin: 0,
    width: 220,
    color: { dark: '#134E5A', light: '#FFFFFF' },
  })

  const displayName = locale === 'zh' ? (org.name_zh || org.name) : org.name
  const legalName = locale === 'zh' ? (org.legal_name_zh || org.legal_name) : org.legal_name

  return {
    locale,
    org: {
      name: displayName,
      legal_name: legalName || undefined,
      thai_name: org.thai_name || undefined,
      country: org.country || undefined,
      primary_color: org.primary_color || undefined,
      secondary_color: org.secondary_color || undefined,
      logo_mark: org.logo_mark || undefined,
      industry: org.industry || undefined,
      headquarters: org.headquarters || undefined,
      website: org.website || undefined,
    },
    framework,
    period,
    metrics,
    narratives,
    contentIndex,
    assurance,
    defaultAssuranceStandard: defaultStandard,
    verification: { token: verificationToken, baseUrl, qrPngDataUrl },
    publishedBy,
    publishedAt,
  }
}

/** Row shape shared by the metric / narrative / content-index queries. */
interface LocalizedRow {
  gri_code: string
  line_item: string
  line_item_zh?: string | null
  section: string | null
  section_zh?: string | null
  subsection: string | null
  subsection_zh?: string | null
}

/** Render the PDF → Buffer. Returns bytes + sha256. */
export async function renderReportPdf(input: ReportInput): Promise<{ bytes: Buffer; sha256: string; byteLength: number }> {
  registerReportFonts()
  const instance = pdf(React.createElement(ReportDocument, { input }) as any)
  const stream = await instance.toBlob()
  const arrayBuffer = await stream.arrayBuffer()
  const bytes = Buffer.from(arrayBuffer)
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex')
  return { bytes, sha256, byteLength: bytes.length }
}

/** Anchor a 32-byte SHA-256 digest to OpenTimestamps calendar. Returns receipt bytes + tip hash. */
export async function anchorPdfToOts(sha256Hex: string): Promise<{ receipt: Buffer; calendarUrl: string; anchoredAt: Date } | null> {
  const calendarUrl = 'https://a.pool.opentimestamps.org/digest'
  const digest = Buffer.from(sha256Hex, 'hex')
  if (digest.length !== 32) return null
  try {
    const res = await fetch(calendarUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.opentimestamps.v1',
        'Content-Type': 'application/vnd.opentimestamps.v1',
        'User-Agent': 'aeiforo-esg-platform/1.0',
      },
      body: digest,
    })
    if (!res.ok) return null
    const receipt = Buffer.from(await res.arrayBuffer())
    return { receipt, calendarUrl, anchoredAt: new Date() }
  } catch {
    return null
  }
}

/** 24-char URL-safe verification token. */
export function generateVerificationToken(): string {
  return crypto.randomBytes(18).toString('base64url')
}
