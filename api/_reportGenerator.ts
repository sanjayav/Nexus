/**
 * Report generator — pulls approved data from the DB, renders the PDF via
 * @react-pdf/renderer, and returns the PDF bytes + SHA-256.
 */
import { pdf } from '@react-pdf/renderer'
import * as crypto from 'crypto'
import QRCode from 'qrcode'
import React from 'react'
import { ReportDocument, type ReportInput } from './_reportPdf.js'

/** Pull all data the report needs from the DB, build the input shape. */
export async function assembleReportInput(
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>,
  args: {
    orgId: string
    periodId: string
    frameworkId: string
    publishedBy: string
    publishedAt: string
    verificationToken: string
    baseUrl: string
    assuranceRequestId: string | null
  }
): Promise<ReportInput> {
  const { orgId, periodId, frameworkId, publishedBy, publishedAt, verificationToken, baseUrl, assuranceRequestId } = args

  // ── Org meta + brand ──
  const orgRows = await sql`
    SELECT name, legal_name, thai_name, country, primary_color, secondary_color, logo_mark, industry, headquarters, website
    FROM organisations WHERE id = ${orgId}
  ` as Array<{
    name: string; legal_name: string | null; thai_name: string | null; country: string | null
    primary_color: string | null; secondary_color: string | null; logo_mark: string | null
    industry: string | null; headquarters: string | null; website: string | null
  }>
  const org = orgRows[0] ?? { name: 'Organisation', legal_name: null, thai_name: null, country: null, primary_color: null, secondary_color: null, logo_mark: null, industry: null, headquarters: null, website: null }

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
    : { label: 'Current period', year: new Date().getFullYear(), start_date: null, end_date: null }

  // ── Framework name lookup (hardcoded — framework names are a UI concern) ──
  const frameworkMap: Record<string, { code: string; name: string }> = {
    gri: { code: 'GRI', name: 'GRI Standards (Universal + Topic)' },
    'csrd-e1': { code: 'CSRD E1', name: 'CSRD ESRS E1 Climate Change' },
    tcfd: { code: 'TCFD', name: 'Task Force on Climate-Related Financial Disclosures' },
    cdp: { code: 'CDP', name: 'CDP Climate Change Questionnaire' },
    issb: { code: 'ISSB S1/S2', name: 'ISSB Sustainability & Climate Standards' },
  }
  const framework = {
    id: frameworkId,
    ...(frameworkMap[frameworkId] ?? { code: frameworkId.toUpperCase(), name: frameworkId }),
  }

  // ── Approved numeric metrics, aggregated to group level ──
  const metricRows = await sql`
    SELECT
      qa.gri_code,
      qa.line_item,
      COALESCE(MIN(qi.section), '—') AS section,
      COALESCE(MIN(qi.subsection), '') AS subsection,
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
  ` as Array<{ gri_code: string; line_item: string; section: string; subsection: string; unit: string; value: number | string; entity_count: number }>

  const metrics = metricRows.map(m => ({
    gri_code: m.gri_code,
    line_item: m.line_item,
    section: m.section || 'General disclosures',
    subsection: m.subsection || '',
    unit: m.unit || null,
    value: Number(m.value),
    entity_count: m.entity_count,
  }))

  // ── Approved narrative disclosures ──
  const narrativeRows = await sql`
    SELECT
      qa.gri_code,
      qa.line_item,
      COALESCE(MIN(qi.section), 'General disclosures') AS section,
      COALESCE(MIN(qi.subsection), '') AS subsection,
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
  ` as Array<{ gri_code: string; line_item: string; section: string; subsection: string; body: string }>

  const narratives = narrativeRows.map(n => ({
    gri_code: n.gri_code,
    line_item: n.line_item,
    section: n.section || 'General disclosures',
    subsection: n.subsection || '',
    body: n.body,
  }))

  // ── GRI Content Index (same query as api/org.ts content-index view) ──
  const contentIndexRows = await sql`
    WITH scope AS (
      SELECT
        gri_code,
        line_item,
        MIN(section) AS section
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
      s.gri_code, s.line_item, s.section,
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
  ` as Array<{ gri_code: string; line_item: string; section: string | null; total: number; approved: number; status: 'fully' | 'partially' | 'omitted' }>

  const contentIndex = contentIndexRows.map(r => ({
    gri_code: r.gri_code,
    line_item: r.line_item,
    section: r.section || '—',
    status: r.status,
    total: r.total,
    approved: r.approved,
  }))

  // ── Signed assurance (if any) ──
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
        firm: a.auditor_firm || 'Independent assurance provider',
        signed_by: a.signed_by || 'Authorised signatory',
        signed_at: typeof a.signed_at === 'string' ? a.signed_at : new Date(a.signed_at as unknown as string).toISOString(),
        opinion: (a.opinion_type === 'reasonable' ? 'reasonable' : 'limited'),
        isae_reference: a.isae_reference || 'ISAE 3000 (Revised)',
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

  return {
    org: {
      name: org.name,
      legal_name: org.legal_name || undefined,
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
    verification: { token: verificationToken, baseUrl, qrPngDataUrl },
    publishedBy,
    publishedAt,
  }
}

/** Render the PDF → Buffer. Returns bytes + sha256. */
export async function renderReportPdf(input: ReportInput): Promise<{ bytes: Buffer; sha256: string; byteLength: number }> {
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
