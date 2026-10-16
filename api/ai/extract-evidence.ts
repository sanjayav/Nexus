/**
 * AI evidence extraction — POST /api/ai/extract-evidence
 *
 * Reads a stored evidence file (PDF / image / xlsx) and calls the org's AI
 * provider (api/_llm.ts) to extract the primary numeric data point. The
 * mainland OpenAI-compatible provider has no PDF input (→ 415) and needs
 * LLM_CN_VISION_MODEL for images. Persists the extraction so
 * auditors can later trace "value X came from document Y via model Z".
 *
 * Strategy:
 *   • PDF / image → native multimodal input (base64 in a document/image block).
 *   • XLSX        → server-side parse via exceljs to plain-text (the model does
 *                   the rest).
 *   • Other       → 400, we don't try to OCR arbitrary blobs.
 *
 * Caching: the (large, stable) system prompt is marked ephemeral so the
 * second + Nth call within 5 minutes hits the cache and saves spend.
 *
 * Safety:
 *   • Rate-limited 10/min per org.
 *   • Document contents never logged (PII risk — utility bills carry
 *     addresses, account numbers).
 *   • 5 MB cap enforced inline; the evidence-upload path enforces the same
 *     ceiling, so this is belt + braces.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { cors, requirePermission } from '../_auth.js'
import { checkRateLimit } from '../_rateLimit.js'
import { getDb } from '../_db.js'
import { languageInstruction } from '../_i18n.js'
import { aiGate, aiLabel, type LlmContentPart, type LlmJsonSpec } from '../_llm.js'

const MAX_BYTES = 5 * 1024 * 1024

const schema = z.object({
  evidenceId: z.string().uuid(),
  questionnaireItemId: z.string().uuid().optional(),
  expectedUnit: z.string().max(40).optional(),
  expectedPeriod: z.string().max(40).optional(),
  lineItemHint: z.string().max(400).optional(),
})

const SYSTEM_PROMPT = `You extract structured sustainability and emissions data from supplier evidence documents (utility bills, invoices, certificates, fuel receipts, freight documents).

Rules:
- Return ONE primary value via the submit_extraction tool. If multiple values appear, pick the one most aligned with the user's lineItemHint and expectedUnit hints.
- Be conservative: if the document is unclear, ambiguous, or doesn't contain a relevant numeric value, set confidence < 0.4 and explain in reasoning.
- Preserve the unit as printed on the document — don't convert. The downstream system handles unit conversion. If the unit is printed in Chinese, return its standard symbol instead (千瓦时 or 度 → kWh, 兆瓦时 → MWh, 立方米 or 方 → m³, 吨 → t, 千克 → kg, 升 → L, 元 → CNY).
- Chinese documents: utility bills (电费单/燃气费单), VAT invoices (增值税发票/fapiao) and fuel receipts are common. The period is the billing period (计费周期/抄表周期), not the invoice date (开票日期).
- The period is what the document covers (e.g. "Jan-Mar 2026") not the issue date.
- The supplier is the entity that produced the document (e.g. "British Gas", "Shell", "ENGIE").
- Never hallucinate numbers that aren't in the document.`

const EXTRACTION_TOOL: LlmJsonSpec = {
  name: 'submit_extraction',
  description: 'Submit the extracted data from this evidence document.',
  schema: {
    type: 'object',
    properties: {
      value: { type: 'number', description: 'The numeric value of the metric being measured.' },
      unit: { type: 'string', description: 'Unit of the value (e.g. kWh, tCO2e, m³, USD, tonnes).' },
      period: { type: 'string', description: 'Reporting period the value covers (e.g. "Q1 2026", "January 2026", "2026").' },
      supplier: { type: 'string', description: 'Name of the supplier, utility, or counterparty issuing the document.' },
      confidence: { type: 'number', description: 'Confidence 0-1 that the extraction is correct.' },
      reasoning: { type: 'string', description: 'Brief explanation of how you identified the value in the document.' },
      additional_notes: { type: 'string', description: 'Any caveats, ambiguities, or context the user should know.' },
    },
    required: ['value', 'unit', 'confidence', 'reasoning'],
  },
}

type ExtractionInput = {
  value: number
  unit: string
  period?: string
  supplier?: string
  confidence: number
  reasoning: string
  additional_notes?: string
}

function isImageType(t: string | null): boolean {
  if (!t) return false
  return t === 'image/png' || t === 'image/jpeg' || t === 'image/jpg'
}

function isPdfType(t: string | null, filename: string): boolean {
  if (t === 'application/pdf') return true
  return /\.pdf$/i.test(filename)
}

function isXlsxType(t: string | null, filename: string): boolean {
  if (t === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return true
  if (t === 'application/vnd.ms-excel') return true
  return /\.xlsx?$/i.test(filename)
}

async function xlsxToText(buf: Buffer): Promise<string> {
  // exceljs is already a project dependency (see package.json) — used by
  // the spreadsheet import path. Flatten every sheet to a TSV-ish blob.
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf as unknown as ArrayBuffer)
  const lines: string[] = []
  wb.worksheets.forEach((ws) => {
    lines.push(`=== Sheet: ${ws.name} ===`)
    ws.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = []
      row.eachCell({ includeEmpty: true }, (cell) => {
        const v = cell.value
        if (v == null) cells.push('')
        else if (typeof v === 'object' && 'result' in v) cells.push(String((v as { result?: unknown }).result ?? ''))
        else cells.push(String(v))
      })
      lines.push(cells.join('\t'))
    })
  })
  // Cap to ~60 KB of text so we don't blow the request size on huge sheets.
  const joined = lines.join('\n')
  return joined.length > 60_000 ? joined.slice(0, 60_000) + '\n…[truncated]' : joined
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = await requirePermission(req, res, 'data.upload')
  if (!token) return

  const gate = await aiGate(getDb(), req, token)
  if (!gate.ok) return res.status(gate.status).json(gate.body)

  const allowed = await checkRateLimit(req, res, {
    key: `ai-extract:${token.org}`,
    windowSeconds: 60,
    max: 10,
  })
  if (!allowed) return

  let body: z.infer<typeof schema>
  try {
    body = schema.parse(req.body)
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
    throw e
  }

  const sql = getDb()

  // Pull the evidence row scoped to this org. Evidence has no direct org_id
  // column, so we join through data_value → reporting_year → organisation_id.
  let rows: Array<{
    id: string
    filename: string
    file_type: string | null
    file_bytes: Buffer | Uint8Array | null
  }>
  try {
    rows = (await sql`
      SELECT e.id, e.filename, e.file_type, e.file_bytes
      FROM evidence e
      JOIN data_value dv ON dv.id = e.data_value_id
      JOIN reporting_year ry ON ry.id = dv.reporting_year_id
      LEFT JOIN users eu ON eu.id = dv.entered_by
      WHERE e.id = ${body.evidenceId}
        AND COALESCE((to_jsonb(dv) ->> 'org_id')::uuid, eu.org_id, ry.organisation_id) = ${token.org}
      LIMIT 1
    `) as typeof rows
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'DB error' })
  }
  if (rows.length === 0) return res.status(404).json({ error: 'Evidence not found' })
  const ev = rows[0]
  if (!ev.file_bytes) return res.status(404).json({ error: 'Evidence has no stored bytes' })

  const buf = Buffer.isBuffer(ev.file_bytes) ? ev.file_bytes : Buffer.from(ev.file_bytes)
  if (buf.length > MAX_BYTES) {
    return res.status(413).json({ error: `Evidence too large (${Math.round(buf.length / 1024)}KB). Max ${MAX_BYTES / 1024 / 1024}MB.` })
  }

  // Build the user content block based on file type.
  let userContent: LlmContentPart[]
  if (isImageType(ev.file_type)) {
    const media =
      ev.file_type === 'image/jpg' ? 'image/jpeg' :
      (ev.file_type as 'image/png' | 'image/jpeg')
    userContent = [{ type: 'image', mediaType: media, data: buf.toString('base64') }]
  } else if (isPdfType(ev.file_type, ev.filename)) {
    userContent = [{ type: 'document', mediaType: 'application/pdf', data: buf.toString('base64') }]
  } else if (isXlsxType(ev.file_type, ev.filename)) {
    let text: string
    try {
      text = await xlsxToText(buf)
    } catch (err) {
      return res.status(400).json({ error: `Failed to parse XLSX: ${err instanceof Error ? err.message : 'unknown'}` })
    }
    userContent = [{
      type: 'text',
      text: `Spreadsheet contents (tab-separated):\n\n${text}`,
    }]
  } else {
    return res.status(400).json({ error: 'Unsupported file type for AI extraction' })
  }

  // Append the hints. Kept short so cached-prefix savings are maximal.
  const hintParts: string[] = []
  if (body.lineItemHint) hintParts.push(`Line item: ${body.lineItemHint}`)
  if (body.expectedUnit) hintParts.push(`Expected unit: ${body.expectedUnit}`)
  if (body.expectedPeriod) hintParts.push(`Expected period: ${body.expectedPeriod}`)
  hintParts.push('Extract the primary value via the submit_extraction tool.')
  userContent.push({ type: 'text', text: hintParts.join('\n') })

  // System prompt is a cache breakpoint (Anthropic) so repeated extractions
  // within the 5-minute TTL hit cache. The prompt is stable across all calls.
  const resp = await gate.provider.complete({
    system: `${SYSTEM_PROMPT}\n\n${languageInstruction(gate.locale)} (Applies to reasoning and additional_notes; keep unit symbols and the supplier name as printed.)`,
    cacheSystem: true,
    maxTokens: 1024,
    json: EXTRACTION_TOOL,
    messages: [{ role: 'user', content: userContent }],
  })

  if (!resp.ok) {
    if (resp.code === 'unsupported_input') return res.status(415).json({ error: resp.error })
    if (resp.code === 'invalid_json') {
      // Model refused / didn't produce a structured extraction.
      return res.status(422).json({
        error: 'Could not extract a value',
        reasoning: resp.text || 'No structured extraction returned.',
      })
    }
    // Don't log the document — only the error.
    // eslint-disable-next-line no-console
    console.error('[extract-evidence] model error:', resp.error)
    return res.status(502).json({ error: resp.error })
  }

  const rawInput = resp.json
  const extracted = rawInput as ExtractionInput
  // Defensive — the model shouldn't omit `required` fields, but if input parsing
  // fails (rare schema regression) we still record the raw response below.
  if (typeof extracted?.value !== 'number' || typeof extracted?.confidence !== 'number') {
    return res.status(422).json({
      error: 'Extraction missing required fields',
      raw: rawInput,
    })
  }

  const usage = resp.usage

  // Persist for audit. raw_response captures the full tool input so reviewers
  // can replay the model's reasoning even if the schema changes later.
  let savedId: string | null = null
  try {
    const inserted = (await sql`
      INSERT INTO ai_extractions
        (evidence_id, questionnaire_item_id, extracted_value, extracted_unit,
         extracted_period, extracted_supplier, raw_response, confidence,
         tokens_in, tokens_out, cached_tokens, model)
      VALUES
        (${body.evidenceId}, ${body.questionnaireItemId ?? null},
         ${extracted.value}, ${extracted.unit ?? null},
         ${extracted.period ?? null}, ${extracted.supplier ?? null},
         ${JSON.stringify(rawInput)}::jsonb, ${extracted.confidence},
         ${usage.tokensIn}, ${usage.tokensOut},
         ${usage.cached}, ${resp.model})
      RETURNING id
    `) as Array<{ id: string }>
    savedId = inserted[0]?.id ?? null
  } catch (err) {
    // Persistence failure shouldn't fail the user-visible flow — return the
    // extraction anyway and log so ops can investigate. The audit row is
    // recoverable on retry (the user can re-extract); the inference is not.
    // eslint-disable-next-line no-console
    console.error('[extract-evidence] persist failed:', err instanceof Error ? err.message : err)
  }

  return res.status(200).json({
    extraction: {
      id: savedId,
      value: extracted.value,
      unit: extracted.unit ?? null,
      period: extracted.period ?? null,
      supplier: extracted.supplier ?? null,
      confidence: extracted.confidence,
      reasoning: extracted.reasoning,
      additionalNotes: extracted.additional_notes ?? null,
    },
    usage: {
      tokensIn: usage.tokensIn,
      tokensOut: usage.tokensOut,
      cached: usage.cached,
    },
    ...aiLabel(gate.locale, resp),
  })
}
