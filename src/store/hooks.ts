import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAccess } from '@/features/access/AccessContext'
import { blockedByFourEyes } from '@/features/access/model'
import { useMockData, useWorkspace } from '@/features/workspace/WorkspaceContext'
import { seedStatus, selectSlice, useReportingStore, type ReviewDecision, type SectionStatus, type WorkspaceSlice } from './reporting'

type Seed = ReturnType<typeof useMockData>
export type SeedSection = Seed['questionnaireSections'][number]

/** The current workspace's slice of the reporting store. */
export function useWorkspaceSlice(): WorkspaceSlice {
  const { workspace } = useWorkspace()
  return useReportingStore(useShallow(selectSlice(workspace.id)))
}

/**
 * Store actions bound to the current workspace and signed-in member. Each
 * action checks the member's permission (and framework scope, and the
 * four-eyes rule) and does nothing when it is not allowed, so a control that
 * slipped through the UI still cannot change data.
 */
export function useReportingActions() {
  const { workspace } = useWorkspace()
  const { member, can, canEditModule, policy } = useAccess()
  const slice = useWorkspaceSlice()
  const store = useReportingStore(
    useShallow(s => ({
      setAnswer: s.setAnswer,
      importAnswers: s.importAnswers,
      submitSection: s.submitSection,
      reopenSection: s.reopenSection,
      decide: s.decide,
      addComment: s.addComment,
      resolveComment: s.resolveComment,
      completeTask: s.completeTask,
      logExport: s.logExport,
      setExplanation: s.setExplanation,
      markAllRead: s.markAllRead,
      resetWorkspace: s.resetWorkspace,
    })),
  )
  return useMemo(() => {
    const ctx = { ws: workspace.id, actor: member?.name ?? '', actorId: member?.id }
    const status = (sectionId: string) => slice.sections[sectionId]?.status
    /** Whether the four-eyes rule stops this member approving the section. */
    const ownSubmission = (sectionId: string) =>
      blockedByFourEyes(slice.sections[sectionId]?.submittedBy, member?.id ?? '', policy.fourEyes)
    const canReview = can('approval.review')
    return {
      actor: ctx.actor,
      ownSubmission,
      setAnswer: (moduleId: string, sectionId: string, fieldId: string, value: string) =>
        canEditModule(moduleId) && store.setAnswer(ctx, moduleId, sectionId, fieldId, value),
      importAnswers: (
        moduleId: string,
        values: Record<string, Record<string, string>>,
        source: string,
        notes?: { sectionId: string; fieldId: string; body: string }[],
      ) => (canEditModule(moduleId) ? store.importAnswers(ctx, moduleId, values, source, notes) : 0),
      submitSection: (moduleId: string, sectionId: string) =>
        canEditModule(moduleId) && can('questionnaire.submit') && store.submitSection(ctx, moduleId, sectionId),
      /** Withdrawing a submission needs edit rights; reopening approved work needs approval rights. */
      reopenSection: (moduleId: string, sectionId: string) =>
        (status(sectionId) === 'approved' ? can('approval.approve') : canEditModule(moduleId)) &&
        store.reopenSection(ctx, moduleId, sectionId),
      decide: (moduleId: string, sectionIds: string[], decision: ReviewDecision, note?: string) => {
        const allowed = decision === 'request_changes' ? canReview : can('approval.approve')
        const ids = decision === 'approve' ? sectionIds.filter(id => !ownSubmission(id)) : sectionIds
        if (allowed && ids.length) store.decide(ctx, moduleId, ids, decision, note)
        return allowed ? ids.length : 0
      },
      addComment: (moduleId: string, sectionId: string, body: string, fieldId?: string) =>
        can('questionnaire.view') && store.addComment(ctx, moduleId, sectionId, body, fieldId),
      resolveComment: (commentId: string) => can('questionnaire.view') && store.resolveComment(ctx, commentId),
      completeTask: (taskId: string, done: boolean) => can('questionnaire.edit') && store.completeTask(ctx, taskId, done),
      logExport: (note: string) => store.logExport(ctx, note),
      setExplanation: (sectionId: string, text: string) => can('report.build') && store.setExplanation(ctx, sectionId, text),
      markAllRead: () => store.markAllRead(ctx),
    }
  }, [store, workspace.id, member, can, canEditModule, policy.fourEyes, slice.sections])
}

export interface SectionView {
  section: SeedSection
  status: SectionStatus
  /** Field values: seed answers overlaid with the user's edits. */
  values: Record<string, string>
  answered: number
  required: number
  updatedAt?: string
  updatedBy?: string
}

export function buildSectionView(section: SeedSection, slice: WorkspaceSlice): SectionView {
  const override = slice.sections[section.id]
  const values: Record<string, string> = {}
  for (const f of section.fields) values[f.id] = String(f.value ?? '')
  Object.assign(values, override?.answers)
  const required = section.fields.filter(f => f.required !== false)
  return {
    section,
    status: override?.status ?? seedStatus(section.meta?.status, section.completed),
    values,
    answered: required.filter(f => values[f.id]?.trim()).length,
    required: required.length,
    updatedAt: override?.updatedAt ?? section.lastSaved ?? undefined,
    updatedBy: override?.updatedBy,
  }
}

/** Merged section views for one module, or for every module when `moduleId` is omitted. */
export function useSectionViews(moduleId?: string): SectionView[] {
  const seed = useMockData()
  const slice = useWorkspaceSlice()
  return useMemo(
    () => seed.questionnaireSections.filter(s => !moduleId || s.module === moduleId).map(s => buildSectionView(s, slice)),
    [seed.questionnaireSections, slice, moduleId],
  )
}

export type Pipeline = Record<SectionStatus, number> & { total: number; completion: number }

export function summarize(views: SectionView[]): Pipeline {
  const p: Pipeline = { not_started: 0, draft: 0, submitted: 0, changes_requested: 0, approved: 0, total: views.length, completion: 0 }
  let answered = 0
  let required = 0
  for (const v of views) {
    p[v.status] += 1
    answered += v.answered
    required += v.required
  }
  p.completion = required ? Math.round((answered / required) * 100) : 0
  return p
}

export function usePipeline(moduleId?: string): Pipeline {
  const views = useSectionViews(moduleId)
  return useMemo(() => summarize(views), [views])
}

export function useUnreadCount(): number {
  return useWorkspaceSlice().notifications.filter(n => !n.read).length
}
