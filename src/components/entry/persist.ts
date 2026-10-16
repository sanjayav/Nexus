/**
 * Entry pipeline — the ONE way a contributor's value is saved, anchored and
 * submitted, shared by every entry surface (My Tasks panel, /data/entry/:id,
 * disclosure-editor cells and side rail).
 *
 * Records involved (data model unchanged):
 *   · assignment (orgStore)  — the user-facing record: value, comment, mode,
 *                               status, evidence ids. Drafts autosave here.
 *   · data_value (nexus)     — an immutable, hash-chained snapshot ("anchor").
 *                               Evidence files hang off a snapshot, and the
 *                               review queue reads submitted snapshots.
 *
 * Policy:
 *   · Draft save  = patch the assignment. With no assignment the snapshot IS
 *                   the record, so a draft save writes one.
 *   · Anchor      = write a snapshot from the current value. Happens when the
 *                   first evidence file is attached, and at submit when the
 *                   value changed since the last anchor.
 *   · Submit      = anchor if needed → nexus submit → assignment status.
 */
import { nexus, type NexusQuestionnaireItem } from '../../lib/api'
import type { QuestionAssignment } from '../../lib/orgStore'
import { fetchActiveReportingYear } from '../../lib/activeReportingYear'

export type EntryMode = 'Manual' | 'Calculator' | 'Connector'
export type AssignmentPatch = Partial<QuestionAssignment>
export type PatchAssignment = (patch: AssignmentPatch) => Promise<void> | void

/** Statuses in which the contributor can no longer edit. */
export const LOCKED_STATUSES: ReadonlyArray<QuestionAssignment['status']> = ['submitted', 'reviewed', 'approved']
export const isLockedStatus = (s?: QuestionAssignment['status'] | null) => !!s && LOCKED_STATUSES.includes(s)

/** Narrative answers need at least this many characters before submit. */
export const NARRATIVE_MIN = 80

/** Evidence limits (mirrors the server). */
export const EVIDENCE_MAX_BYTES = 5 * 1024 * 1024
export const EVIDENCE_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'image/png',
  'image/jpeg',
]
export const EVIDENCE_ACCEPT = '.pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,' + EVIDENCE_TYPES.join(',')

/* ── Parsing / validation ─────────────────────────────────────────────── */

/**
 * Parse a typed number. Accepts thousands separators and the full-width
 * digits/punctuation a Chinese IME produces (１２３．５, 1，234).
 */
export function parseNumeric(raw: string): { ok: true; value: number | null } | { ok: false } {
  const normalised = raw
    .replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
    .replace(/[．。]/g, '.')
    .replace(/[－−–]/g, '-')
    .replace(/[,，\s']/g, '')
    .trim()
  if (normalised === '') return { ok: true, value: null }
  if (!/^-?\d*\.?\d+(e-?\d+)?$/i.test(normalised) && !/^-?\d+\.$/.test(normalised)) return { ok: false }
  const n = Number(normalised)
  return Number.isFinite(n) ? { ok: true, value: n } : { ok: false }
}

export type EvidenceProblem = { kind: 'type'; type: string } | { kind: 'size'; mb: string }

export function checkEvidenceFile(file: File): EvidenceProblem | null {
  if (file.type && !EVIDENCE_TYPES.includes(file.type)) return { kind: 'type', type: file.type }
  if (file.size > EVIDENCE_MAX_BYTES) return { kind: 'size', mb: (file.size / 1024 / 1024).toFixed(1) }
  return null
}

/* ── Reporting year ───────────────────────────────────────────────────── */

export async function activeYearId(): Promise<string | null> {
  const y = await fetchActiveReportingYear()
  return y.kind === 'ready' ? y.year.id : null
}

export class NoReportingYearError extends Error {
  constructor() {
    super('no_reporting_year')
    this.name = 'NoReportingYearError'
  }
}

/* ── Writes ───────────────────────────────────────────────────────────── */

export interface Anchor {
  id: string
  hash: string
  value: number
  receiptHash?: string | null
}

/** Write an immutable data_value snapshot of `value`. Throws NoReportingYearError. */
export async function anchorValue(
  question: NexusQuestionnaireItem,
  value: number,
  opts: { mode: EntryMode; comment?: string },
): Promise<Anchor> {
  const yearId = await activeYearId()
  if (!yearId) throw new NoReportingYearError()
  const res = await nexus.enterValue({
    question_id: question.id,
    reporting_year_id: yearId,
    scope_key: question.scope_split,
    value,
    unit: question.unit ?? undefined,
    mode: opts.mode,
    comment: opts.comment || undefined,
  })
  return { id: res.id, hash: res.value_hash, value }
}

/** Contributor status after an edit: a fresh or sent-back item becomes "in progress". */
export function draftStatus(current?: QuestionAssignment['status'] | null): QuestionAssignment['status'] {
  return current === 'not_started' || current === 'rejected' || !current ? 'in_progress' : current
}

/**
 * Draft save. With an assignment: patch it (idempotent, cheap — safe to
 * autosave). Without one: write a snapshot, since that is the only record.
 */
export async function persistDraft(args: {
  question: NexusQuestionnaireItem
  assignment: QuestionAssignment | null
  patchAssignment: PatchAssignment
  fields: AssignmentPatch
  mode: EntryMode
}): Promise<{ anchor: Anchor | null }> {
  const { question, assignment, patchAssignment, fields, mode } = args
  if (assignment) {
    await patchAssignment({
      ...fields,
      unit: fields.value !== undefined ? question.unit ?? null : fields.unit,
      used_mode: mode,
      status: draftStatus(assignment.status),
    })
    return { anchor: null }
  }
  if (fields.value == null) return { anchor: null }
  const anchor = await anchorValue(question, fields.value, { mode, comment: fields.comment })
  return { anchor }
}

/** Pull a connector value (server simulates the connector and returns a receipt). */
export async function pullConnector(question: NexusQuestionnaireItem, connector: string): Promise<Anchor> {
  const yearId = await activeYearId()
  if (!yearId) throw new NoReportingYearError()
  const res = await nexus.connectorPull({ question_id: question.id, reporting_year_id: yearId, connector })
  return { id: res.id, hash: res.value_hash, value: Number(res.value), receiptHash: res.receipt_hash }
}

/** Plausible simulated connector for an item (SRD §13.4 catalogue). */
export function pickConnector(item: Pick<NexusQuestionnaireItem, 'gri_code'>): string {
  const c = item.gri_code ?? ''
  if (c.startsWith('201-') || c.startsWith('204-') || c.startsWith('2-5') || c.startsWith('2-21')) return 'SAP ERP — FI/CO'
  if (c.startsWith('2-7') || c.startsWith('2-8') || c.startsWith('401-') || c.startsWith('404-') || c.startsWith('405-')) return 'SAP SuccessFactors — HR'
  if (c.startsWith('305-7')) return 'CEMS — Rayong site'
  if (c.startsWith('302-')) return 'Utilities ERP — Fuel & Energy feed'
  if (c.startsWith('303-')) return 'Water meter telemetry'
  if (c.startsWith('306-')) return 'Waste manifest system'
  if (c.startsWith('403-')) return 'HSE incident management'
  if (c.startsWith('305-')) return 'GHG Inventory — IPCC methodology'
  return 'Generic ERP connector'
}

/**
 * Human label for an evidence id recorded on an assignment. Legacy ids look
 * like `ev_<ts>_<filename>` or `connector:<name>:<ts>`; real ones are UUIDs.
 */
export function recordedEvidenceLabel(id: string): { name: string; connector: boolean } {
  if (id.startsWith('connector:')) return { name: id.split(':')[1] ?? id, connector: true }
  const legacy = /^ev_[^_]+_(.+)$/.exec(id)
  if (legacy) return { name: legacy[1], connector: false }
  return { name: id.length > 14 ? `${id.slice(0, 8)}…` : id, connector: false }
}
