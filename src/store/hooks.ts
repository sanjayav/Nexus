import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAuth } from '@/features/auth/AuthContext'
import { useMockData, useWorkspace } from '@/features/workspace/WorkspaceContext'
import { seedStatus, selectSlice, useReportingStore, type ReviewDecision, type SectionStatus, type WorkspaceSlice } from './reporting'

type Seed = ReturnType<typeof useMockData>
export type SeedSection = Seed['questionnaireSections'][number]

/** The current workspace's slice of the reporting store. */
export function useWorkspaceSlice(): WorkspaceSlice {
  const { workspace } = useWorkspace()
  return useReportingStore(useShallow(selectSlice(workspace.id)))
}

/** Store actions bound to the current workspace and signed-in user. */
export function useReportingActions() {
  const { workspace } = useWorkspace()
  const { user } = useAuth()
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
    const ctx = { ws: workspace.id, actor: user?.name ?? user?.email ?? 'User' }
    return {
      actor: ctx.actor,
      setAnswer: (moduleId: string, sectionId: string, fieldId: string, value: string) =>
        store.setAnswer(ctx, moduleId, sectionId, fieldId, value),
      importAnswers: (
        moduleId: string,
        values: Record<string, Record<string, string>>,
        source: string,
        notes?: { sectionId: string; fieldId: string; body: string }[],
      ) => store.importAnswers(ctx, moduleId, values, source, notes),
      submitSection: (moduleId: string, sectionId: string) => store.submitSection(ctx, moduleId, sectionId),
      reopenSection: (moduleId: string, sectionId: string) => store.reopenSection(ctx, moduleId, sectionId),
      decide: (moduleId: string, sectionIds: string[], decision: ReviewDecision, note?: string) =>
        store.decide(ctx, moduleId, sectionIds, decision, note),
      addComment: (moduleId: string, sectionId: string, body: string, fieldId?: string) =>
        store.addComment(ctx, moduleId, sectionId, body, fieldId),
      resolveComment: (commentId: string) => store.resolveComment(ctx, commentId),
      completeTask: (taskId: string, done: boolean) => store.completeTask(ctx, taskId, done),
      logExport: (note: string) => store.logExport(ctx, note),
      setExplanation: (sectionId: string, text: string) => store.setExplanation(ctx, sectionId, text),
      markAllRead: () => store.markAllRead(ctx),
      resetWorkspace: () => store.resetWorkspace(ctx.ws),
    }
  }, [store, workspace.id, user?.name, user?.email])
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
