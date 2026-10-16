import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import type { QuestionAssignment, OrgEntity, OrgMember } from '../../lib/orgStore'
import type { ValueEntryState } from '../entry/useValueEntry'
import EvidenceBlock from '../entry/EvidenceBlock'
import { handoffFor } from '../entry/handoff'

/**
 * Evidence for an answer. Kept as a named export for existing imports; it
 * renders the shared entry evidence block (real uploads, AI extraction,
 * inline validation) used by every entry surface.
 */
export function EvidencePanel({ entry }: { entry: ValueEntryState }) {
  return <EvidenceBlock entry={entry} />
}

/** One-line "who has it now" hint for a locked assignment. */
export function HandoffHint({
  status, entityId, entities, members,
}: {
  status: QuestionAssignment['status']
  entityId: string
  entities: OrgEntity[]
  members: OrgMember[]
}) {
  const { t } = useTranslation()
  const h = handoffFor(status, entityId, entities, members)
  if (!h.stage) return null
  const text = h.stage === 'review'
    ? (h.name ? t('entry.banner.withReviewer', { name: h.name }) : t('entry.banner.withReviewerGeneric'))
    : h.stage === 'approval'
      ? (h.name ? t('entry.banner.withApprover', { name: h.name }) : t('entry.banner.withApproverGeneric'))
      : t('entry.banner.approved')
  return (
    <div className="flex items-center gap-2 text-caption text-[var(--text-secondary)]">
      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--status-success)]" aria-hidden />
      <span>{text}</span>
    </div>
  )
}
