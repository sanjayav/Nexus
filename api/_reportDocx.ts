/**
 * DOCX (Word) report renderer. Mirrors the data assembly done by
 * `_reportGenerator.ts` for the PDF path, but emits a .docx via the
 * `docx` package — title page, executive summary, framework sections,
 * data tables, footer with audit hash.
 *
 * Don't aim for pixel-perfect; aim for "auditor can read and edit it."
 *
 * Language follows `input.locale` (api/_reportI18n.ts). Runs and heading
 * styles carry an East Asian font and the zh-CN language tag so Chinese text
 * renders in a consistent font and proofs as Chinese in Word.
 */
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Footer,
  PageBreak,
} from 'docx'
import type { ReportInput } from './_reportPdf.js'
import { displayCode, formatReportDate, makeReportT, type ReportLocale, type ReportT } from './_reportI18n.js'
import { assembleReportInput } from './_reportGenerator.js'
import { getDb } from './_db.js'
import * as crypto from 'crypto'

/** Latin fonts plus an East Asian font so Chinese never falls back to a random theme font. */
const DOCX_FONT = {
  ascii: 'Calibri',
  hAnsi: 'Calibri',
  cs: 'Calibri',
  // Windows ships Microsoft YaHei; Word for Mac substitutes PingFang SC / SimSun.
  eastAsia: 'Microsoft YaHei',
} as const

function docxLanguage(locale: ReportLocale) {
  // `value` drives proofing for Latin runs, `eastAsia` for CJK runs.
  return locale === 'zh'
    ? { value: 'zh-CN', eastAsia: 'zh-CN' }
    : { value: 'en-US', eastAsia: 'zh-CN' }
}

function p(text: string, opts: { bold?: boolean; size?: number; italics?: boolean } = {}): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts.bold, size: opts.size, italics: opts.italics })],
  })
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]): Paragraph {
  return new Paragraph({ text, heading: level })
}

function thinBorder() {
  return {
    top:    { style: BorderStyle.SINGLE, size: 4, color: '999999' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
    left:   { style: BorderStyle.SINGLE, size: 4, color: '999999' },
    right:  { style: BorderStyle.SINGLE, size: 4, color: '999999' },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
    insideVertical:   { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
  }
}

function headerCell(text: string): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
    shading: { fill: 'E5E7EB' },
  })
}

function cell(text: string): TableCell {
  return new TableCell({ children: [new Paragraph(text)] })
}

function metricsTable(input: ReportInput, t: ReportT, codeColumn: string): Table {
  const locale = input.locale ?? 'en'
  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell(codeColumn),
        headerCell(t('index.col.disclosure')),
        headerCell(t('metrics.col.section')),
        headerCell(t('metrics.col.value')),
        headerCell(t('metrics.col.unit')),
        headerCell(t('metrics.col.entities')),
      ],
    }),
  ]
  for (const m of input.metrics) {
    rows.push(new TableRow({
      children: [
        cell(displayCode(m.gri_code, input.framework)),
        cell(m.line_item),
        cell(m.subsection ? `${m.section} · ${m.subsection}` : m.section),
        cell(typeof m.value === 'number' ? m.value.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US') : String(m.value)),
        cell(m.unit ?? ''),
        cell(String(m.entity_count)),
      ],
    }))
  }
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    // Explicit grid (twips, ~A4 text width) so viewers that ignore the
    // percentage width don't collapse the columns.
    columnWidths: [1500, 3000, 1800, 1100, 900, 700],
    borders: thinBorder(),
  })
}

function contentIndexTable(input: ReportInput, t: ReportT, codeColumn: string): Table {
  const statusLabel = (s: 'fully' | 'partially' | 'omitted') =>
    s === 'fully' ? t('index.status.fully') : s === 'partially' ? t('index.status.partially') : t('index.status.omitted')
  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell(codeColumn),
        headerCell(t('index.col.disclosure')),
        headerCell(t('index.col.section')),
        headerCell(t('index.col.status')),
        headerCell(t('index.col.approvedTotal')),
      ],
    }),
  ]
  for (const r of input.contentIndex) {
    rows.push(new TableRow({
      children: [
        cell(displayCode(r.gri_code, input.framework)),
        cell(r.line_item),
        cell(r.subsection || r.section),
        cell(statusLabel(r.status)),
        cell(`${r.approved} / ${r.total}`),
      ],
    }))
  }
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [1500, 3700, 2000, 900, 900],
    borders: thinBorder(),
  })
}

/** Build the docx Document from a pre-assembled ReportInput. */
export function buildDocx(input: ReportInput, sha256: string): Document {
  const { org, framework, period, metrics, narratives, contentIndex, assurance, verification, publishedBy, publishedAt } = input
  const locale: ReportLocale = input.locale ?? 'en'
  const t = makeReportT(locale)
  const date = (v: string) => formatReportDate(v, locale)
  const indexTitle = framework.indexTitle || `${framework.code} Content Index`
  const codeColumn = framework.codeColumn || t('metrics.col.code')
  const reportTitle = framework.reportTitle || t('cover.reportTitle')
  const verifyUrl = `${verification.baseUrl}/verify/${verification.token}`
  const language = docxLanguage(locale)

  // ── Section: title page ──
  const titleSection = {
    properties: {},
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `${org.name} · ${framework.name} · ${period.label}`, size: 16, color: '666666' }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `SHA-256: ${sha256}`, size: 14, color: '999999' }),
            ],
          }),
        ],
      }),
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: org.name, bold: true, size: 56 })],
      }),
      org.legal_name && org.legal_name !== org.name ? p(org.legal_name, { italics: locale !== 'zh', size: 22 }) : p(''),
      new Paragraph({}),
      heading(reportTitle, HeadingLevel.TITLE),
      p(`${framework.name}`, { size: 28 }),
      p(t('docx.reportingPeriod', { label: period.label, year: period.year }), { size: 24 }),
      new Paragraph({}),
      new Paragraph({}),
      p(t('docx.publishedBy', { name: publishedBy }), { size: 22 }),
      p(t('docx.publishedAt', { date: date(publishedAt) }), { size: 22 }),
      p(t('docx.verificationUrl', { url: verifyUrl }), { size: 20 }),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Executive summary ──
      heading(t('docx.execSummary'), HeadingLevel.HEADING_1),
      p(t('docx.summaryScope', { org: org.name, label: period.label, frameworkName: framework.name })),
      p(t('docx.summaryCounts', { metrics: metrics.length, narratives: narratives.length, sections: new Set(metrics.map(m => m.section)).size })),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Narrative disclosures ──
      heading(t('docx.narrativeTitle'), HeadingLevel.HEADING_1),
      ...(narratives.length === 0
        ? [p(t('docx.noNarratives'), { italics: true })]
        : narratives.flatMap(n => [
            heading(`${displayCode(n.gri_code, framework)} — ${n.line_item}`, HeadingLevel.HEADING_2),
            p(t('docx.sectionLine', { section: n.subsection ? `${n.section} · ${n.subsection}` : n.section }), { italics: locale !== 'zh', size: 18 }),
            ...n.body.split(/\n+/).map(line => p(line)),
          ])
      ),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Metrics table ──
      heading(t('docx.quantTitle'), HeadingLevel.HEADING_1),
      metrics.length === 0 ? p(t('docx.noMetrics'), { italics: true }) : metricsTable(input, t, codeColumn),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Content index (framework-specific title) ──
      heading(indexTitle, HeadingLevel.HEADING_1),
      contentIndex.length === 0 ? p(t('index.empty'), { italics: true }) : contentIndexTable(input, t, codeColumn),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Assurance ──
      heading(t('assurance.title'), HeadingLevel.HEADING_1),
      ...(assurance
        ? [
            p(t('docx.auditor', { firm: assurance.firm })),
            p(t('docx.signedBy', { name: assurance.signed_by })),
            p(t('docx.signedAt', { date: date(assurance.signed_at) })),
            p(t('docx.opinion', { opinion: assurance.opinion === 'reasonable' ? t('assurance.reasonable') : t('assurance.limited') })),
            p(t('docx.reference', { reference: assurance.isae_reference })),
            assurance.notes ? p(assurance.notes) : p(''),
          ]
        : [p(t('assurance.none'), { italics: true })]
      ),

      heading(t('docx.auditTrail'), HeadingLevel.HEADING_1),
      p(t('docx.sha', { sha: sha256 }), { size: 18 }),
      p(t('docx.token', { token: verification.token }), { size: 18 }),
      p(t('docx.verifyAt', { url: verifyUrl }), { size: 18 }),
    ],
  }

  // East Asian font + language on the document defaults and on the heading
  // styles (Word's built-in headings otherwise use theme fonts).
  const headingRun = { font: DOCX_FONT, language }
  return new Document({
    creator: 'Nexus Sustainability Reporting',
    title: `${org.name} ${framework.code} ${period.label}`,
    description: t('docx.description'),
    styles: {
      default: {
        document: { run: { font: DOCX_FONT, language } },
        title: { run: { ...headingRun, size: 52, bold: true } },
        heading1: { run: { ...headingRun, size: 32, bold: true, color: '1B6B7B' } },
        heading2: { run: { ...headingRun, size: 24, bold: true } },
      },
    },
    sections: [titleSection],
  })
}

/** ASCII-only token for the Content-Disposition `filename=` fallback. */
function asciiSlug(s: string): string {
  return s.normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '')
}

/**
 * Download filenames. `filename` is ASCII-only (safe in a raw header — a CJK
 * period label like `2025年度` used to make res.setHeader throw → 500);
 * `filenameUtf8` keeps the readable name for `filename*=UTF-8''…`.
 */
export function docxFilenames(input: Pick<ReportInput, 'framework' | 'period' | 'locale'>): { filename: string; filenameUtf8: string } {
  const code = input.framework.code.replace(/\s+/g, '_')
  const label = input.period.label.replace(/\s+/g, '_')
  const asciiLabel = asciiSlug(label) || String(input.period.year)
  const suffix = input.locale && input.locale !== 'en' ? `-${input.locale}` : ''
  return {
    filename: `report-${asciiSlug(code) || 'report'}-${asciiLabel}${suffix}.docx`,
    filenameUtf8: `report-${code}-${label}${suffix}.docx`,
  }
}

/** Convenience: pull the report data, render the DOCX, return bytes. */
export async function generateDocx(args: {
  orgId: string
  reportArtifactId: string
}): Promise<{ bytes: Buffer; sha256: string; filename: string; filenameUtf8: string; locale: ReportLocale }> {
  const sql = getDb()

  // Pull artifact context (period, framework, verification token, language).
  // `locale` is read via to_jsonb so this works before the column migration;
  // metadata.locale is written by the publish path as a fallback.
  const rows = await sql`
    SELECT ra.id, ra.org_id, ra.period_id, ra.framework_id, ra.verification_token,
           ra.published_at, ra.assurance_request_id, u.name AS published_by_name,
           COALESCE(to_jsonb(ra)->>'locale', ra.metadata->>'locale') AS locale
    FROM report_artifacts ra
    LEFT JOIN users u ON u.id = ra.published_by
    WHERE ra.id = ${args.reportArtifactId} AND ra.org_id = ${args.orgId}
  ` as Array<{
    id: string; org_id: string; period_id: string; framework_id: string
    verification_token: string; published_at: string
    assurance_request_id: string | null; published_by_name: string | null
    locale: string | null
  }>
  if (rows.length === 0) throw new Error('Report artifact not found')
  const ra = rows[0]

  const baseUrl = process.env.PUBLIC_BASE_URL || 'https://app.aeiforo.com'

  const input = await assembleReportInput(
    sql as unknown as (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>,
    {
      orgId: args.orgId,
      periodId: ra.period_id,
      frameworkId: ra.framework_id,
      publishedBy: ra.published_by_name || 'System',
      publishedAt: typeof ra.published_at === 'string' ? ra.published_at : new Date(ra.published_at).toISOString(),
      verificationToken: ra.verification_token,
      baseUrl,
      assuranceRequestId: ra.assurance_request_id,
      locale: ra.locale,
    },
  )

  // Hash a stable JSON form of the report payload so the DOCX carries an
  // audit fingerprint. (Separate from the PDF sha; same input but different
  // artefact bytes.)
  const payload = JSON.stringify({
    org: input.org.name,
    framework: input.framework.code,
    period: input.period.label,
    metrics: input.metrics,
    narratives: input.narratives,
    publishedAt: input.publishedAt,
  })
  const sha256 = crypto.createHash('sha256').update(payload).digest('hex')

  const doc = buildDocx(input, sha256)
  const bytes = await Packer.toBuffer(doc)
  const { filename, filenameUtf8 } = docxFilenames(input)
  return { bytes: Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes), sha256, filename, filenameUtf8, locale: input.locale ?? 'en' }
}
