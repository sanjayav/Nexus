import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Loader2, FileText, Link2, ShieldCheck, AlertTriangle, ExternalLink,
  CheckCircle2, XCircle, Send, Sparkles, Clock, History, Paperclip, Upload, X,
} from 'lucide-react'
import type { NexusQuestionnaireItem, NexusEvidence, NexusAuditEvent } from '../../lib/api'
import { nexus, conceptMappings, type ConceptPeer } from '../../lib/api'
import type { QuestionAssignment } from '../../lib/orgStore'
import { useAuth } from '../../auth/AuthContext'
import { hasPermission } from '../../lib/rbac'
import { getFramework } from '../../lib/frameworks'
import CommentThread from '../CommentThread'
import { FadeIn } from '../MotionPrimitives'
import { riseIn } from '../motion'

/**
 * Right-rail surface for the currently-selected disclosure cell. Loads its
 * linked-data peers, evidence, comments and audit history on-demand whenever
 * the selection changes.
 */
export interface DisclosureCellRailProps {
  item: NexusQuestionnaireItem | null
  assignment: QuestionAssignment | null
  /** Workflow status transition. Caller refreshes state on success. */
  onWorkflowAction: (action: 'submit' | 'approve' | 'reject') => Promise<void>
  workflowBusy?: boolean
}

const STATUS_LABEL: Record<QuestionAssignment['status'], string> = {
  not_started: 'Not started',
  in_progress: 'Draft',
  submitted: 'Submitted',
  reviewed: 'Reviewed',
  approved: 'Approved',
  rejected: 'Rejected',
}

const STATUS_PILL: Record<QuestionAssignment['status'], string> = {
  not_started: 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]',
  in_progress: 'bg-[var(--accent-amber-light)] text-[var(--status-draft)]',
  submitted: 'bg-[var(--accent-blue-light)] text-[var(--status-pending)]',
  reviewed: 'bg-[var(--accent-blue-light)] text-[var(--status-pending)]',
  approved: 'bg-[var(--accent-green-light)] text-[var(--status-ok)]',
  rejected: 'bg-[var(--accent-red-light)] text-[var(--status-reject)]',
}

export default function DisclosureCellRail({
  item, assignment, onWorkflowAction, workflowBusy = false,
}: DisclosureCellRailProps) {
  return (
    <aside
      className="hidden xl:flex flex-col w-[340px] flex-shrink-0 border-l border-[var(--border-subtle)] bg-[var(--bg-primary)]/60 sticky top-[68px] self-start overflow-y-auto"
      style={{ height: 'calc(100vh - 68px)' }}
      aria-label="Cell detail"
    >
      {!item ? (
        <div className="flex flex-col items-center justify-center h-full px-6 text-center text-[var(--text-sm)] text-[var(--text-tertiary)]">
          <div className="w-10 h-10 mb-3 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
            <FileText className="w-4 h-4 text-[var(--text-tertiary)]" />
          </div>
          Select a disclosure to see linked data, evidence, comments and audit history.
        </div>
      ) : (
        <CellPanel
          item={item}
          assignment={assignment}
          onWorkflowAction={onWorkflowAction}
          workflowBusy={workflowBusy}
        />
      )}
    </aside>
  )
}

function CellPanel({
  item, assignment, onWorkflowAction, workflowBusy,
}: {
  item: NexusQuestionnaireItem
  assignment: QuestionAssignment | null
  onWorkflowAction: (action: 'submit' | 'approve' | 'reject') => Promise<void>
  workflowBusy: boolean
}) {
  const { permissions } = useAuth()
  const canSubmit = hasPermission(permissions, 'data.upload')
  const canReview = hasPermission(permissions, 'workflow.approve')
  const status = assignment?.status ?? 'not_started'

  const [peers, setPeers] = useState<ConceptPeer[]>([])
  const [conceptKey, setConceptKey] = useState<string | null>(null)
  const [evidence, setEvidence] = useState<NexusEvidence[]>([])
  const [trail, setTrail] = useState<NexusAuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [flyoutOpen, setFlyoutOpen] = useState(false)
  // Org-wide recent evidence list — no dedicated endpoint yet, so the
  // re-use list is empty for now and the user falls back to the drop-zone.
  const recentEvidence: NexusEvidence[] = []
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const refreshEvidence = useCallback(async () => {
    if (!assignment) return
    try {
      const ev = await nexus.listEvidence(assignment.id)
      setEvidence(ev)
    } catch { /* swallow */ }
  }, [assignment])

  const handleUpload = useCallback(async (file: File) => {
    if (!assignment) return
    setUploading(true); setUploadError(null)
    try {
      await nexus.uploadEvidence(assignment.id, file)
      await refreshEvidence()
      setFlyoutOpen(false)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [assignment, refreshEvidence])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const dataValueId = assignment?.id ?? null
    Promise.allSettled([
      conceptMappings.forQuestion(item.id),
      dataValueId ? nexus.listEvidence(dataValueId) : Promise.resolve([] as NexusEvidence[]),
      dataValueId ? nexus.trail(dataValueId) : Promise.resolve([] as NexusAuditEvent[]),
    ]).then(results => {
      if (cancelled) return
      const [mapRes, evRes, trRes] = results
      if (mapRes.status === 'fulfilled') {
        setPeers(mapRes.value.mappings.filter(p => p.questionnaire_item_id !== item.id))
        setConceptKey(mapRes.value.concept_key)
      } else {
        setPeers([])
        setConceptKey(null)
      }
      setEvidence(evRes.status === 'fulfilled' ? evRes.value : [])
      setTrail(trRes.status === 'fulfilled' ? trRes.value : [])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [item.id, assignment?.id])

  const overdue = assignment?.is_overdue && assignment.due_date
  const isOverridden = false // wiring point — once /api/concept-mappings exposes per-cell flag

  return (
    <motion.div key={item.id} {...riseIn(0)} className="flex flex-col gap-5 p-5">
      {/* Header */}
      <div>
        <div className="text-[10px] font-mono text-[var(--text-tertiary)]">{item.gri_code}</div>
        <h3 className="font-display text-[var(--text-base)] font-semibold text-[var(--text-primary)] leading-snug mt-0.5">
          {item.line_item}
        </h3>
      </div>

      {/* Status + workflow actions */}
      <section>
        <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-2">Status</div>
        <span className={`inline-flex items-center px-2 h-5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${STATUS_PILL[status]}`}>
          {STATUS_LABEL[status]}
        </span>
        {assignment && (
          <div className="mt-3 flex flex-wrap gap-2">
            {canSubmit && (status === 'in_progress' || status === 'not_started' || status === 'rejected') && (
              <button
                type="button"
                onClick={() => void onWorkflowAction('submit')}
                disabled={workflowBusy || assignment.value == null}
                className="inline-flex items-center gap-1 px-2.5 h-7 rounded-[var(--radius-sm)] bg-[var(--color-brand)] text-white text-[11px] font-semibold hover:bg-[var(--color-brand-strong)] disabled:opacity-50"
              >
                <Send className="w-3 h-3" /> Submit for review
              </button>
            )}
            {canReview && status === 'submitted' && (
              <>
                <button
                  type="button"
                  onClick={() => void onWorkflowAction('approve')}
                  disabled={workflowBusy}
                  className="inline-flex items-center gap-1 px-2.5 h-7 rounded-[var(--radius-sm)] bg-[var(--status-ok)] text-white text-[11px] font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3 h-3" /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => void onWorkflowAction('reject')}
                  disabled={workflowBusy}
                  className="inline-flex items-center gap-1 px-2.5 h-7 rounded-[var(--radius-sm)] bg-[var(--status-reject)] text-white text-[11px] font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  <XCircle className="w-3 h-3" /> Reject
                </button>
              </>
            )}
          </div>
        )}
      </section>

      {/* Metadata */}
      <section className="space-y-1.5 text-[11px]">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1">Metadata</div>
        {assignment ? (
          <>
            <Meta label="Assigned to" value={assignment.assigneeName || assignment.assigneeEmail || '—'} />
            <Meta label="Last updated" value={assignment.last_updated ? new Date(assignment.last_updated).toLocaleString() : '—'} />
            <Meta
              label="Due"
              value={assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : '—'}
              valueClass={overdue ? 'text-[var(--status-reject)] font-semibold' : ''}
            />
            {overdue && (
              <div className="inline-flex items-center gap-1 mt-1 px-1.5 h-4 rounded-[var(--radius-xs)] bg-[var(--accent-red-light)] text-[var(--status-reject)] text-[9px] font-semibold uppercase tracking-wider">
                <Clock className="w-2.5 h-2.5" /> Overdue
              </div>
            )}
          </>
        ) : (
          <p className="text-[var(--text-tertiary)] italic">No assignment yet for this cell.</p>
        )}
      </section>

      {/* Linked data */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">Linked to</span>
          {conceptKey && (
            <span className="text-[9px] font-mono text-[var(--text-tertiary)] truncate max-w-[140px]">{conceptKey}</span>
          )}
        </div>
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin text-[var(--text-tertiary)]" />
        ) : peers.length === 0 ? (
          <p className="text-[11px] text-[var(--text-tertiary)] italic">Not linked to any other framework.</p>
        ) : (
          <ul className="space-y-1">
            {peers.map(p => (
              <li key={p.id}>
                <span className="flex items-center gap-1.5 px-2 h-7 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[10px]">
                  <Link2 className="w-3 h-3 text-[var(--color-brand)] flex-shrink-0" />
                  <span className="font-semibold text-[var(--text-secondary)]">{frameworkLabel(p.framework_id)}</span>
                  <span className="font-mono text-[var(--text-tertiary)] truncate">{p.gri_code}</span>
                  <ExternalLink className="w-2.5 h-2.5 text-[var(--text-tertiary)] ml-auto" />
                </span>
              </li>
            ))}
          </ul>
        )}
        {isOverridden && (
          <div className="inline-flex items-center gap-1 mt-2 px-2 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
            <AlertTriangle className="w-3 h-3" /> Locally overridden
          </div>
        )}
      </section>

      {/* Evidence */}
      <section>
        <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-2">Evidence</div>
        {!assignment ? (
          <p className="text-[11px] text-[var(--text-tertiary)] italic">Enter a value to start attaching evidence.</p>
        ) : evidence.length === 0 ? (
          <p className="text-[11px] text-[var(--text-tertiary)] italic">No files attached.</p>
        ) : (
          <ul className="space-y-1">
            {evidence.map(ev => (
              <li key={ev.id} className="flex items-center gap-2 px-2 h-7 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[10px]">
                <FileText className="w-3 h-3 text-[var(--text-tertiary)] flex-shrink-0" />
                <span className="truncate flex-1 text-[var(--text-primary)]">{ev.filename}</span>
                <span className="font-mono text-[9px] text-[var(--text-tertiary)]">{Math.round(ev.file_size / 1024)} KB</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {assignment && (
            <button
              type="button"
              onClick={() => setFlyoutOpen(true)}
              className="inline-flex items-center gap-1 px-2 h-6 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
            >
              <Paperclip className="w-3 h-3 text-[var(--color-brand)]" /> Attach evidence
            </button>
          )}
          {evidence.length > 0 && (
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2 h-6 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
              title="AI extraction pipeline"
            >
              <Sparkles className="w-3 h-3 text-[var(--color-brand)]" /> Extract from evidence
            </button>
          )}
        </div>
      </section>

      {flyoutOpen && assignment && (
        <AttachEvidenceFlyout
          uploading={uploading}
          error={uploadError}
          recent={recentEvidence}
          existing={evidence}
          onUpload={handleUpload}
          onReuse={async (ev) => {
            // Best-effort re-link via re-upload semantics; persistence layer
            // dedupes by hash. If the API doesn't support re-link the user
            // sees the same evidence anyway after refresh.
            setEvidence(prev => prev.find(e => e.id === ev.id) ? prev : [ev, ...prev])
            setFlyoutOpen(false)
          }}
          onClose={() => setFlyoutOpen(false)}
        />
      )}

      {/* Comments */}
      {assignment && (
        <section>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-2">Discussion</div>
          <CommentThread assignmentId={assignment.id} />
        </section>
      )}

      {/* Audit trail */}
      <section>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-2">
          <History className="w-3 h-3" /> Audit
        </div>
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin text-[var(--text-tertiary)]" />
        ) : trail.length === 0 ? (
          <p className="text-[11px] text-[var(--text-tertiary)] italic">No audit events yet.</p>
        ) : (
          <ul className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
            {trail.map(e => (
              <li key={e.id} className="flex items-start gap-2 text-[10px]">
                <ShieldCheck className="w-3 h-3 mt-0.5 text-[var(--color-brand)] flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{e.event_type}</div>
                  <div className="text-[var(--text-tertiary)] truncate">
                    {e.actor_name ?? e.actor_email ?? 'System'} · {new Date(e.timestamp).toLocaleString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </motion.div>
  )
}

/**
 * Slide-in flyout that overlays the cell rail. Drop-zone + file picker +
 * recent-evidence list (re-use). FadeIn handles the entrance motion.
 */
function AttachEvidenceFlyout({
  uploading, error, recent, existing, onUpload, onReuse, onClose,
}: {
  uploading: boolean
  error: string | null
  recent: NexusEvidence[]
  existing: NexusEvidence[]
  onUpload: (file: File) => Promise<void>
  onReuse: (ev: NexusEvidence) => Promise<void>
  onClose: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const existingIds = new Set(existing.map(e => e.id))
  const reuseList = recent.filter(e => !existingIds.has(e.id)).slice(0, 10)

  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/20"
      />
      <FadeIn>
        <aside
          role="dialog"
          aria-label="Attach evidence"
          className="fixed right-0 top-[68px] z-50 w-[360px] bg-[var(--bg-primary)] border-l border-[var(--border-default)] shadow-2xl flex flex-col"
          style={{ height: 'calc(100vh - 68px)' }}
        >
          <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <Paperclip className="w-3.5 h-3.5 text-[var(--color-brand)]" />
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Attach evidence</h3>
            </div>
            <button onClick={onClose} aria-label="Close" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
              <X className="w-3.5 h-3.5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault(); setDragOver(false)
                const f = e.dataTransfer.files?.[0]
                if (f) void onUpload(f)
              }}
              className={`rounded-[12px] border-2 border-dashed p-6 text-center transition-colors ${
                dragOver
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]'
                  : 'border-[var(--border-default)] bg-[var(--bg-secondary)]'
              }`}
            >
              <Upload className="w-6 h-6 mx-auto text-[var(--text-tertiary)] mb-2" />
              <p className="text-[12px] text-[var(--text-secondary)]">
                Drag and drop a file here, or
              </p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="mt-2 inline-flex items-center gap-1.5 px-3 h-7 rounded-[8px] bg-[var(--color-brand)] text-white text-[12px] font-semibold hover:bg-[var(--color-brand-strong)] disabled:opacity-50"
              >
                {uploading ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</> : 'Choose file'}
              </button>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) void onUpload(f)
                  e.target.value = ''
                }}
              />
            </div>

            {error && (
              <div className="rounded-[8px] border border-[var(--status-reject)]/30 bg-[var(--accent-red-light)] px-3 py-2 text-[11px] text-[var(--status-reject)]">
                {error}
              </div>
            )}

            {/* Recent evidence — fast re-use */}
            {reuseList.length > 0 && (
              <section>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-2">
                  Recent files
                </div>
                <ul className="space-y-1">
                  {reuseList.map(ev => (
                    <li key={ev.id}>
                      <button
                        type="button"
                        onClick={() => void onReuse(ev)}
                        className="w-full flex items-center gap-2 px-2 py-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[11px] hover:bg-[var(--bg-secondary)] text-left"
                      >
                        <FileText className="w-3 h-3 text-[var(--text-tertiary)] flex-shrink-0" />
                        <span className="truncate flex-1 text-[var(--text-primary)]">{ev.filename}</span>
                        <span className="font-mono text-[9px] text-[var(--text-tertiary)]">{Math.round(ev.file_size / 1024)} KB</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </aside>
      </FadeIn>
    </>
  )
}

function Meta({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[var(--text-tertiary)]">{label}</span>
      <span className={`text-[var(--text-primary)] truncate text-right ${valueClass}`}>{value}</span>
    </div>
  )
}

function frameworkLabel(id: string): string {
  return getFramework(id)?.code ?? id.toUpperCase()
}
