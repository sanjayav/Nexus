/**
 * DOCX (Word) report renderer. Mirrors the data assembly done by
 * `_reportGenerator.ts` for the PDF path, but emits a .docx via the
 * `docx` package — title page, executive summary, framework sections,
 * data tables, footer with audit hash.
 *
 * Don't aim for pixel-perfect; aim for "auditor can read and edit it."
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
import { assembleReportInput } from './_reportGenerator.js'
import { getDb } from './_db.js'
import * as crypto from 'crypto'

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

function metricsTable(metrics: ReportInput['metrics']): Table {
  const rows: TableRow[] = [
    new TableRow({
      children: [
        headerCell('GRI / Code'),
        headerCell('Disclosure'),
        headerCell('Section'),
        headerCell('Value'),
        headerCell('Unit'),
        headerCell('Entities'),
      ],
    }),
  ]
  for (const m of metrics) {
    rows.push(new TableRow({
      children: [
        cell(m.gri_code),
        cell(m.line_item),
        cell(m.section),
        cell(typeof m.value === 'number' ? m.value.toLocaleString() : String(m.value)),
        cell(m.unit ?? ''),
        cell(String(m.entity_count)),
      ],
    }))
  }
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: thinBorder(),
  })
}

function contentIndexTable(idx: ReportInput['contentIndex']): Table {
  const rows: TableRow[] = [
    new TableRow({
      children: [
        headerCell('GRI Code'),
        headerCell('Disclosure'),
        headerCell('Section'),
        headerCell('Status'),
        headerCell('Approved / Total'),
      ],
    }),
  ]
  for (const r of idx) {
    rows.push(new TableRow({
      children: [
        cell(r.gri_code),
        cell(r.line_item),
        cell(r.section),
        cell(r.status),
        cell(`${r.approved} / ${r.total}`),
      ],
    }))
  }
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: thinBorder(),
  })
}

/** Build the docx Document from a pre-assembled ReportInput. */
export function buildDocx(input: ReportInput, sha256: string): Document {
  const { org, framework, period, metrics, narratives, contentIndex, assurance, verification, publishedBy, publishedAt } = input

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
      org.legal_name ? p(org.legal_name, { italics: true, size: 22 }) : p(''),
      new Paragraph({}),
      heading('Sustainability Report', HeadingLevel.TITLE),
      p(`${framework.name}`, { size: 28 }),
      p(`Reporting period: ${period.label} (${period.year})`, { size: 24 }),
      new Paragraph({}),
      new Paragraph({}),
      p(`Published by: ${publishedBy}`, { size: 22 }),
      p(`Published at: ${publishedAt}`, { size: 22 }),
      p(`Verification URL: ${verification.baseUrl}/verify/${verification.token}`, { size: 20 }),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Executive summary ──
      heading('Executive Summary', HeadingLevel.HEADING_1),
      p(`This report covers ${org.name}'s sustainability performance for ${period.label} under the ${framework.name} framework.`),
      p(`It consolidates ${metrics.length} approved metric${metrics.length === 1 ? '' : 's'} and ${narratives.length} approved narrative disclosure${narratives.length === 1 ? '' : 's'} across ${new Set(metrics.map(m => m.section)).size} sections.`),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Narrative disclosures ──
      heading('Narrative Disclosures', HeadingLevel.HEADING_1),
      ...(narratives.length === 0
        ? [p('No approved narrative disclosures for this period.', { italics: true })]
        : narratives.flatMap(n => [
            heading(`${n.gri_code} — ${n.line_item}`, HeadingLevel.HEADING_2),
            p(`Section: ${n.section}${n.subsection ? ' · ' + n.subsection : ''}`, { italics: true, size: 18 }),
            ...n.body.split(/\n+/).map(line => p(line)),
          ])
      ),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Metrics table ──
      heading('Quantitative Disclosures', HeadingLevel.HEADING_1),
      metrics.length === 0 ? p('No approved metrics for this period.', { italics: true }) : metricsTable(metrics),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Content index ──
      heading('Content Index', HeadingLevel.HEADING_1),
      contentIndex.length === 0 ? p('No content index entries.', { italics: true }) : contentIndexTable(contentIndex),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Assurance ──
      heading('Assurance Statement', HeadingLevel.HEADING_1),
      ...(assurance
        ? [
            p(`Auditor: ${assurance.firm}`),
            p(`Signed by: ${assurance.signed_by}`),
            p(`Signed at: ${assurance.signed_at}`),
            p(`Opinion type: ${assurance.opinion}`),
            p(`Reference: ${assurance.isae_reference}`),
            assurance.notes ? p(assurance.notes) : p(''),
          ]
        : [p('No signed assurance statement attached for this period.', { italics: true })]
      ),

      heading('Audit Trail', HeadingLevel.HEADING_1),
      p(`SHA-256 of report payload: ${sha256}`, { size: 18 }),
      p(`Verification token: ${verification.token}`, { size: 18 }),
      p(`Verify at: ${verification.baseUrl}/verify/${verification.token}`, { size: 18 }),
    ],
  }

  return new Document({
    creator: 'Aeiforo Sustainability Reporting',
    title: `${org.name} ${framework.code} ${period.label}`,
    description: 'Auto-generated sustainability report (DOCX)',
    sections: [titleSection],
  })
}

/** Convenience: pull the report data, render the DOCX, return bytes. */
export async function generateDocx(args: {
  orgId: string
  reportArtifactId: string
}): Promise<{ bytes: Buffer; sha256: string; filename: string }> {
  const sql = getDb()

  // Pull artifact context (period, framework, verification token).
  const rows = await sql`
    SELECT ra.id, ra.org_id, ra.period_id, ra.framework_id, ra.verification_token,
           ra.published_at, ra.assurance_request_id, u.name AS published_by_name
    FROM report_artifacts ra
    LEFT JOIN users u ON u.id = ra.published_by
    WHERE ra.id = ${args.reportArtifactId} AND ra.org_id = ${args.orgId}
  ` as Array<{
    id: string; org_id: string; period_id: string; framework_id: string
    verification_token: string; published_at: string
    assurance_request_id: string | null; published_by_name: string | null
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
  const filename = `report-${input.framework.code.replace(/\s+/g, '_')}-${input.period.label.replace(/\s+/g, '_')}.docx`
  return { bytes: Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes), sha256, filename }
}
