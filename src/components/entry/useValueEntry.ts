import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ai, nexus, type AiExtractionResult, type AiGeneratedLabel, type NexusEvidence, type NexusQuestionnaireItem } from '../../lib/api'
import { orgStore, type QuestionAssignment } from '../../lib/orgStore'
import { findCalculator, type CalcDescriptor, type CalcInputValues } from '../../calculators/registry'
import { localizeCalc } from '../../calculators/labels'
import { notify } from '../ui'
import {
  NARRATIVE_MIN, NoReportingYearError, anchorValue, checkEvidenceFile, draftStatus, isLockedStatus,
  parseNumeric, persistDraft, pickConnector, pullConnector,
  type Anchor, type AssignmentPatch, type EntryMode, type PatchAssignment,
} from './persist'
import type { SaveState } from './SaveStatus'

export interface UseValueEntryArgs {
  question: NexusQuestionnaireItem
  assignment: QuestionAssignment | null
  /** Persists an assignment patch. Default: orgStore.updateAssignment. */
  onAssignmentPatch?: PatchAssignment
  /** Called after any successful write with the patched assignment (optimistic parent sync). */
  onAssignmentChange?: (next: QuestionAssignment) => void
  /** Permission-driven read-only (status locks are applied on top). */
  readOnly?: boolean
  /** Preferred starting mode (e.g. from `?mode=`). */
  initialMode?: EntryMode | null
  /** Name shown in the "Submitted to … for review" toast. */
  reviewerName?: string | null
  onSubmitted?: () => void
}

export type FieldError = 'required' | 'invalid' | 'minLength' | null
export type EvidenceError =
  | { kind: 'required' }
  | { kind: 'stale'; value: number }
  | { kind: 'needValue' }
  | { kind: 'noYear' }
  | { kind: 'type'; type: string }
  | { kind: 'size'; mb: string }
  | { kind: 'failed'; message: string }
  | null

const AUTOSAVE_MS = 1200

export function useValueEntry({
  question, assignment, onAssignmentPatch, onAssignmentChange, readOnly = false, initialMode, reviewerName, onSubmitted,
}: UseValueEntryArgs) {
  const { t } = useTranslation()
  const narrative = assignment?.response_type === 'narrative'

  // ── Modes ──────────────────────────────────────────────────────────
  const calculator: CalcDescriptor | null = useMemo(() => localizeCalc(t, findCalculator(question)), [question, t])
  const modes = useMemo<EntryMode[]>(() => {
    const allowed = (assignment?.entry_modes?.length ? assignment.entry_modes : ['Manual', 'Calculator', 'Connector']) as EntryMode[]
    const list = allowed.filter(m => m !== 'Calculator' || calculator != null)
    return list.length ? list : ['Manual']
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment?.entry_modes?.join(','), calculator])
  const pickMode = useCallback((): EntryMode => {
    const prefs = [initialMode, assignment?.used_mode as EntryMode | undefined, question.entry_mode_default]
    for (const p of prefs) if (p && modes.includes(p)) return p
    return modes[0]
  }, [initialMode, assignment?.used_mode, question.entry_mode_default, modes])
  const [mode, setModeState] = useState<EntryMode>(pickMode)
  useEffect(() => { if (!modes.includes(mode)) setModeState(pickMode()) }, [modes, mode, pickMode])

  // ── Field state ───────────────────────────────────────────────────
  const [value, setValueState] = useState(assignment?.value != null ? String(assignment.value) : '')
  const [calcValues, setCalcValuesState] = useState<CalcInputValues>({})
  const [comment, setCommentState] = useState(assignment?.comment ?? '')
  const [body, setBodyState] = useState(assignment?.narrative_body ?? '')
  const [status, setStatus] = useState<QuestionAssignment['status']>(assignment?.status ?? 'not_started')
  const [recorded, setRecorded] = useState<string[]>(assignment?.evidence_ids ?? [])
  const [aiSource, setAiSource] = useState<AiGeneratedLabel | null>(null)
  const [pendingExtractionId, setPendingExtractionId] = useState<string | null>(null)

  // Seed calculator defaults so what you see is what is computed.
  useEffect(() => {
    if (!calculator) return
    setCalcValuesState(prev => {
      const next = { ...prev }
      for (const input of calculator.inputs) if (next[input.key] == null && input.default != null) next[input.key] = String(input.default)
      return next
    })
  }, [calculator])

  // Re-seed when a different assignment / question is shown.
  const identity = `${question.id}:${assignment?.id ?? 'none'}`
  const lastIdentity = useRef(identity)
  useEffect(() => {
    if (lastIdentity.current === identity) return
    lastIdentity.current = identity
    setValueState(assignment?.value != null ? String(assignment.value) : '')
    setCommentState(assignment?.comment ?? '')
    setBodyState(assignment?.narrative_body ?? '')
    setRecorded(assignment?.evidence_ids ?? [])
    setStatus(assignment?.status ?? 'not_started')
    setAnchor(null); setEvidence([]); setErrors({}); setEvidenceError(null)
    setSaveState('idle'); setSavedAt(null); setAiSource(null); setPendingExtractionId(null)
    setModeState(pickMode())
    editVersion.current = 0; savedVersion.current = 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity])

  // Follow edits made elsewhere (e.g. an inline editor cell) while this form is clean.
  useEffect(() => {
    if (editVersion.current !== savedVersion.current) return
    setValueState(prev => {
      const next = assignment?.value != null ? String(assignment.value) : ''
      const cur = parseNumeric(prev)
      return cur.ok && cur.value === (assignment?.value ?? null) ? prev : next
    })
  }, [assignment?.value])

  // Follow server-side status changes (review/approval elsewhere).
  useEffect(() => { if (assignment?.status) setStatus(assignment.status) }, [assignment?.status])
  useEffect(() => { if (assignment?.evidence_ids) setRecorded(assignment.evidence_ids) }, [assignment?.evidence_ids])

  const locked = readOnly || isLockedStatus(status)

  // ── Anchor + evidence ─────────────────────────────────────────────
  const [anchor, setAnchor] = useState<Anchor | null>(null)
  const [evidence, setEvidence] = useState<NexusEvidence[]>([])
  const [uploading, setUploading] = useState(false)
  const [evidenceError, setEvidenceError] = useState<EvidenceError>(null)
  const [pulling, setPulling] = useState(false)
  const [pullError, setPullError] = useState<string | null>(null)

  // ── Derived value ─────────────────────────────────────────────────
  const parsed = useMemo(() => parseNumeric(value), [value])
  const calcResult = useMemo(() => (calculator ? calculator.compute(calcValues, question) : null), [calculator, calcValues, question])
  const effectiveValue: number | null = useMemo(() => {
    if (mode === 'Calculator') return calcResult
    if (mode === 'Connector') return anchor?.receiptHash ? anchor.value : assignment?.value ?? null
    return parsed.ok ? parsed.value : null
  }, [mode, calcResult, anchor, assignment?.value, parsed])
  const anchorStale = !!anchor && effectiveValue != null && anchor.value !== effectiveValue

  // ── Validation (inline, never alert()) ───────────────────────────
  const [errors, setErrors] = useState<{ value?: FieldError; body?: FieldError }>({})
  const valueError: FieldError = errors.value ?? (mode === 'Manual' && !parsed.ok ? 'invalid' : null)

  // ── Save state + autosave ─────────────────────────────────────────
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [savedAt, setSavedAt] = useState<number | null>(assignment?.last_updated ? new Date(assignment.last_updated).getTime() : null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const editVersion = useRef(0)
  const savedVersion = useRef(0)
  const saving = useRef(false)
  const autosave = !!assignment && !locked

  const patchAssignment = useCallback<PatchAssignment>(async (patch) => {
    if (!assignment) return
    if (onAssignmentPatch) await onAssignmentPatch(patch)
    else await orgStore.updateAssignment(assignment.id, patch)
    onAssignmentChange?.({ ...assignment, ...patch, last_updated: new Date().toISOString() })
  }, [assignment, onAssignmentPatch, onAssignmentChange])

  const touch = useCallback(() => {
    editVersion.current += 1
    setSaveState('dirty')
  }, [])

  const setValue = useCallback((v: string) => { setValueState(v); setAiSource(null); setErrors(e => ({ ...e, value: null })); touch() }, [touch])
  const setComment = useCallback((v: string) => { setCommentState(v); touch() }, [touch])
  const setBody = useCallback((v: string) => { setBodyState(v); setErrors(e => ({ ...e, body: null })); touch() }, [touch])
  const setCalcValue = useCallback((key: string, v: string) => { setCalcValuesState(s => ({ ...s, [key]: v })); touch() }, [touch])
  const setMode = useCallback((m: EntryMode) => { if (!locked) { setModeState(m); setErrors({}); touch() } }, [locked, touch])

  const draftFields = useCallback((): AssignmentPatch | null => {
    if (narrative) return { narrative_body: body, comment }
    if (mode === 'Manual' && !parsed.ok) return null
    if (mode === 'Connector') return { comment }
    return { value: effectiveValue, comment }
  }, [narrative, body, comment, mode, parsed.ok, effectiveValue])

  /** Save the current draft. `manual` adds a toast (with Undo where safe). */
  const save = useCallback(async (kind: 'auto' | 'manual' = 'auto'): Promise<boolean> => {
    if (locked) return false
    const fields = draftFields()
    if (!fields) { setErrors(e => ({ ...e, value: 'invalid' })); return false }
    if (!assignment && fields.value == null) {
      if (kind === 'manual') setErrors(e => ({ ...e, value: 'required' }))
      return false
    }
    if (saving.current) return false
    saving.current = true
    const started = editVersion.current
    const before = assignment ? { value: assignment.value ?? null, comment: assignment.comment ?? '', narrative_body: assignment.narrative_body ?? null, status: assignment.status } : null
    setSaveState('saving'); setSaveError(null)
    try {
      const { anchor: a } = await persistDraft({ question, assignment, patchAssignment, fields, mode })
      if (a) { setAnchor(a); setEvidence([]) }
      savedVersion.current = started
      if (assignment) setStatus(s => draftStatus(s))
      setSavedAt(Date.now())
      setSaveState(editVersion.current === started ? 'saved' : 'dirty')
      if (kind === 'manual') {
        const canUndo = !!before && before.status !== 'submitted'
        notify.success(t('entry.toast.draftSaved'), canUndo ? {
          undo: () => {
            void patchAssignment({ value: before!.value, comment: before!.comment, narrative_body: before!.narrative_body, status: before!.status })
            setValueState(before!.value != null ? String(before!.value) : '')
            setCommentState(before!.comment)
            setBodyState(before!.narrative_body ?? '')
            setStatus(before!.status)
          },
        } : undefined)
      }
      return true
    } catch (e) {
      const msg = e instanceof NoReportingYearError ? t('entry.year.noneShort') : e instanceof Error ? e.message : t('entry.save.failed')
      setSaveError(msg); setSaveState('error')
      if (kind === 'manual') notify.error(t('entry.toast.saveFailed'), { description: msg })
      return false
    } finally {
      saving.current = false
    }
  }, [locked, draftFields, assignment, question, patchAssignment, mode, t])

  // Debounced autosave while typing; blur flushes immediately.
  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => {
    if (!autosave || saveState !== 'dirty') return
    const id = window.setTimeout(() => { void saveRef.current('auto') }, AUTOSAVE_MS)
    return () => window.clearTimeout(id)
  }, [autosave, saveState, value, comment, body, calcValues, mode])
  const flush = useCallback(() => {
    if (autosave && editVersion.current !== savedVersion.current) void saveRef.current('auto')
  }, [autosave])
  // Don't lose the last keystrokes when the panel closes.
  const autosaveRef = useRef(autosave)
  autosaveRef.current = autosave
  useEffect(() => () => {
    if (autosaveRef.current && editVersion.current !== savedVersion.current) void saveRef.current('auto')
  }, [])

  // ── Evidence ──────────────────────────────────────────────────────
  const ensureAnchor = useCallback(async (): Promise<Anchor | null> => {
    if (anchor && !anchorStale) return anchor
    if (effectiveValue == null) { setEvidenceError({ kind: 'needValue' }); setErrors(e => ({ ...e, value: 'required' })); return null }
    try {
      const a = await anchorValue(question, effectiveValue, { mode, comment })
      setAnchor(a); setEvidence([])
      return a
    } catch (e) {
      if (e instanceof NoReportingYearError) setEvidenceError({ kind: 'noYear' })
      else setEvidenceError({ kind: 'failed', message: e instanceof Error ? e.message : t('entry.evidence.uploadFailed') })
      return null
    }
  }, [anchor, anchorStale, effectiveValue, question, mode, comment, t])

  const uploadFiles = useCallback(async (files: FileList | File[] | null) => {
    if (!files || locked) return
    const list = Array.from(files)
    if (list.length === 0) return
    setEvidenceError(null)
    for (const f of list) {
      const problem = checkEvidenceFile(f)
      if (problem) { setEvidenceError(problem); return }
    }
    setUploading(true)
    try {
      const a = await ensureAnchor()
      if (!a) return
      const added: NexusEvidence[] = []
      for (const f of list) added.push(await nexus.uploadEvidence(a.id, f))
      setEvidence(ev => [...added, ...ev])
      const nextRecorded = [...recorded, ...added.map(x => x.id)]
      setRecorded(nextRecorded)
      if (assignment) {
        try { await patchAssignment({ evidence_ids: nextRecorded, status: draftStatus(status) }) } catch { /* file is uploaded; the id list re-syncs on submit */ }
      }
      notify.success(t('entry.toast.evidenceAdded', { count: added.length }))
    } catch (e) {
      setEvidenceError({ kind: 'failed', message: e instanceof Error ? e.message : t('entry.evidence.uploadFailed') })
    } finally {
      setUploading(false)
    }
  }, [locked, ensureAnchor, recorded, assignment, patchAssignment, status, t])

  const removeEvidence = useCallback(async (id: string) => {
    if (locked) return
    try {
      if (evidence.some(e => e.id === id)) await nexus.removeEvidence(id)
      setEvidence(ev => ev.filter(e => e.id !== id))
      const nextRecorded = recorded.filter(r => r !== id)
      setRecorded(nextRecorded)
      if (assignment) await patchAssignment({ evidence_ids: nextRecorded })
    } catch (e) {
      setEvidenceError({ kind: 'failed', message: e instanceof Error ? e.message : t('entry.evidence.removeFailed') })
    }
  }, [locked, evidence, recorded, assignment, patchAssignment, t])

  // ── AI extraction → value ─────────────────────────────────────────
  const acceptExtraction = useCallback((filename: string, extraction: AiExtractionResult, meta: AiGeneratedLabel | null) => {
    if (locked) return
    setModeState(modes.includes('Manual') ? 'Manual' : mode)
    setValueState(String(extraction.value))
    setErrors(e => ({ ...e, value: null }))
    const note = t('entry.ai.extractedNote', { file: filename }) + (extraction.unit ? ` (${extraction.unit})` : '') + (extraction.period ? t('entry.ai.extractedPeriod', { period: extraction.period }) : '')
    setCommentState(prev => (prev ? `${prev}\n${note}` : note))
    setAiSource(meta ?? { ai_generated: true })
    if (extraction.id) setPendingExtractionId(extraction.id)
    touch()
  }, [locked, modes, mode, t, touch])

  // ── Connector ─────────────────────────────────────────────────────
  const connectorName = pickConnector(question)
  const pull = useCallback(async () => {
    if (locked) return
    setPulling(true); setPullError(null)
    try {
      const a = await pullConnector(question, connectorName)
      setAnchor(a); setEvidence([])
      const receipt = `connector:${connectorName}:${Date.now().toString(36)}`
      const nextRecorded = [...recorded.filter(r => !r.startsWith('connector:')), receipt]
      setRecorded(nextRecorded)
      if (assignment) await patchAssignment({ value: a.value, unit: question.unit ?? null, used_mode: 'Connector', evidence_ids: nextRecorded, status: draftStatus(status) })
      setValueState(String(a.value))
      setSavedAt(Date.now()); setSaveState('saved')
      notify.success(t('entry.toast.pulled', { connector: connectorName }))
    } catch (e) {
      setPullError(e instanceof NoReportingYearError ? 'noYear' : e instanceof Error ? e.message : t('entry.connector.failed'))
    } finally {
      setPulling(false)
    }
  }, [locked, question, connectorName, recorded, assignment, patchAssignment, status, t])

  // ── Submit ────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState(false)
  const needsEvidence = !narrative && mode !== 'Connector'
  const hasEvidence = evidence.length > 0 || recorded.some(r => !r.startsWith('connector:'))

  /** Returns the blocking reason, or null when the entry can be submitted. */
  const validate = useCallback((): string | null => {
    if (narrative) {
      if (body.trim().length < NARRATIVE_MIN) { setErrors(e => ({ ...e, body: 'minLength' })); return 'body' }
      return null
    }
    if (mode === 'Manual' && !parsed.ok) { setErrors(e => ({ ...e, value: 'invalid' })); return 'value' }
    if (effectiveValue == null) { setErrors(e => ({ ...e, value: 'required' })); return 'value' }
    if (needsEvidence) {
      if (anchor && anchorStale && evidence.length > 0) { setEvidenceError({ kind: 'stale', value: anchor.value }); return 'evidence' }
      if (!hasEvidence) { setEvidenceError({ kind: 'required' }); return 'evidence' }
    }
    return null
  }, [narrative, body, mode, parsed.ok, effectiveValue, needsEvidence, anchor, anchorStale, evidence.length, hasEvidence])

  const submit = useCallback(async (): Promise<boolean> => {
    if (locked || submitting) return false
    const blocked = validate()
    if (blocked) return false
    setSubmitting(true)
    try {
      let a: Anchor | null = anchor
      if (!narrative && effectiveValue != null && (!a || a.value !== effectiveValue)) {
        try { a = await anchorValue(question, effectiveValue, { mode, comment }); setAnchor(a) }
        catch (e) {
          // With an assignment the contributor flow continues without a
          // snapshot (no open reporting year yet); without one there is no record.
          if (!assignment) throw e
          a = null
        }
      }
      if (a) {
        try { await nexus.submit(a.id) }
        catch (e) { if (!assignment) throw e; console.warn('[entry] data_value submit failed; assignment is the record', e) }
      }
      if (assignment) {
        await patchAssignment(narrative
          ? { narrative_body: body, comment, status: 'submitted', evidence_ids: recorded }
          : { value: effectiveValue, unit: question.unit ?? null, comment, used_mode: mode, status: 'submitted', evidence_ids: recorded })
      }
      if (pendingExtractionId && a) {
        try { await ai.acceptExtraction({ extractionId: pendingExtractionId, dataValueId: a.id }) }
        catch { console.warn('[entry] accept-extraction audit link failed; submit still recorded') }
      }
      editVersion.current = savedVersion.current
      setStatus('submitted'); setSaveState('saved'); setSavedAt(Date.now()); setJustSubmitted(true)
      notify.success(
        reviewerName ? t('entry.toast.submittedTo', { name: reviewerName }) : t('entry.toast.submitted'),
        { description: t('entry.toast.submittedBody') },
      )
      onSubmitted?.()
      return true
    } catch (e) {
      const msg = e instanceof NoReportingYearError ? t('entry.year.noneShort') : e instanceof Error ? e.message : t('entry.submit.failed')
      notify.error(t('entry.submit.failed'), { description: msg })
      return false
    } finally {
      setSubmitting(false)
    }
  }, [locked, submitting, validate, anchor, narrative, effectiveValue, question, mode, comment, assignment, patchAssignment, body, recorded, pendingExtractionId, reviewerName, t, onSubmitted])

  return {
    // context
    question, assignment, narrative, calculator, modes, connectorName,
    // state
    mode, value, calcValues, calcResult, comment, body, status, locked, effectiveValue, parsed,
    evidence, recorded, uploading, evidenceError, anchor, anchorStale, needsEvidence, hasEvidence,
    saveState, savedAt, saveError, autosave, submitting, justSubmitted, pulling, pullError, aiSource,
    valueError, bodyError: errors.body ?? null,
    // actions
    setMode, setValue, setComment, setBody, setCalcValue, save, flush, submit, uploadFiles, removeEvidence,
    acceptExtraction, pull, setEvidenceError,
  }
}

export type ValueEntryState = ReturnType<typeof useValueEntry>
