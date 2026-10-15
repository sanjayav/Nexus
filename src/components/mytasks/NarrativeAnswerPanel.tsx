import { useState } from 'react'
import { Upload, Send } from 'lucide-react'
import type { QuestionAssignment, OrgEntity, OrgMember } from '../../lib/orgStore'
import type { NexusQuestionnaireItem } from '../../lib/api'
import CommentThread from '../CommentThread'
import JargonTooltip from '../JargonTooltip'
import { EvidencePanel, HandoffHint } from './EvidencePanel'

/**
 * NarrativeAnswerPanel — for response_type='narrative' assignments.
 * Captures a long-form body (markdown-friendly textarea) instead of a number.
 */
export function NarrativeAnswerPanel({
  assignment, question, onUpdate, entities, members,
}: {
  assignment: QuestionAssignment
  question: NexusQuestionnaireItem
  onUpdate: (patch: Partial<QuestionAssignment>) => Promise<void> | void
  entities: OrgEntity[]
  members: OrgMember[]
}) {
  const [body, setBody] = useState(assignment.narrative_body ?? '')
  const [busy, setBusy] = useState(false)
  const [evidence, setEvidence] = useState<string[]>(assignment.evidence_ids || [])
  const locked = assignment.status === 'submitted' || assignment.status === 'approved' || assignment.status === 'reviewed'
  const minLength = 80

  const handleSave = async (nextStatus: 'in_progress' | 'submitted') => {
    if (nextStatus === 'submitted' && body.trim().length < minLength) {
      alert(`Narrative needs at least ${minLength} characters before submitting.`)
      return
    }
    setBusy(true)
    await onUpdate({ narrative_body: body, status: nextStatus, evidence_ids: evidence })
    setBusy(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5 mt-3">
      <div className="space-y-4">
        <div className="text-[var(--text-xs)] text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)]">Disclosure prompt:</strong> {question.line_item}
        </div>

        <div className="rounded-[var(--radius-md)] border border-[var(--color-brand)]/20 bg-[var(--color-brand-soft)]/30 p-3 text-[10px] text-[var(--color-brand-strong)]">
          This is a <strong>narrative disclosure</strong> (<JargonTooltip term="GRI" iconOnly /> GRI 2 / GRI 3 management approach). Write a factual description — policies, governance, how the topic is managed. Plain-text is fine; line breaks preserved.
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1">
            Your response ({body.trim().length} chars)
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            disabled={locked}
            rows={14}
            placeholder="Describe the governance, strategy or management approach. Reference specific policies, frameworks, or processes. This text appears verbatim in the final GRI report."
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] leading-relaxed focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 outline-none disabled:bg-[var(--bg-secondary)] resize-y"
            style={{ minHeight: 220 }}
          />
          {body.trim().length > 0 && body.trim().length < minLength && (
            <div className="text-[10px] text-[var(--status-draft)] mt-1">
              {minLength - body.trim().length} more characters needed before submit.
            </div>
          )}
        </div>

        {!locked && (
          <div className="flex items-center gap-2 pt-1">
            <button onClick={() => handleSave('in_progress')} disabled={busy} className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] disabled:opacity-50 inline-flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Save draft
            </button>
            <button onClick={() => handleSave('submitted')} disabled={busy || body.trim().length < minLength} className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--color-brand-strong)] disabled:opacity-50 inline-flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" /> Submit for review
            </button>
          </div>
        )}
        {locked && <HandoffHint status={assignment.status} entityId={assignment.entityId} entities={entities} members={members} />}
      </div>

      <div className="space-y-4">
        <EvidencePanel evidence={evidence} locked={locked} onAdd={(n) => setEvidence(e => [...e, `ev_${Date.now()}_${n}`])} onRemove={i => setEvidence(e => e.filter((_, idx) => idx !== i))} />
        <CommentThread assignmentId={assignment.id} />
      </div>
    </div>
  )
}

export default NarrativeAnswerPanel
