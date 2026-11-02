import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Reporting store: everything a user changes during a reporting cycle.
 *
 * Seed data (`src/data/seed.*.ts`) is the immutable starting point for a
 * tenant; this store only holds the user's overrides on top of it (answers,
 * workflow status, comments, activity, notifications). Views merge the two,
 * so "reset demo data" is simply clearing a workspace slice.
 *
 * State is partitioned by workspace id so tenants never see each other's
 * work, and persisted to localStorage until a backend replaces it. All
 * mutations go through actions here so the backend swap is one module.
 */

export type SectionStatus = 'not_started' | 'draft' | 'submitted' | 'changes_requested' | 'approved'
export type ReviewDecision = 'approve' | 'request_changes' | 'reject'

export type ActivityKind =
  'answer' | 'submit' | 'reopen' | 'approve' | 'request_changes' | 'reject' | 'comment' | 'import' | 'report_export' | 'task_done'

export interface SectionOverride {
  answers: Record<string, string>
  status?: SectionStatus
  updatedAt?: string
  updatedBy?: string
  /** Member id of whoever last submitted the section, for the four-eyes rule. */
  submittedBy?: string
}

export interface Comment {
  id: string
  sectionId: string
  fieldId?: string
  author: string
  body: string
  at: string
  resolved: boolean
}

export interface Activity {
  id: string
  kind: ActivityKind
  at: string
  actor: string
  /** Member id behind `actor` (absent on entries recorded before identities existed). */
  actorId?: string
  moduleId?: string
  sectionId?: string
  /** Number of values affected (imports, bulk edits). */
  count?: number
  note?: string
}

export interface Notification extends Activity {
  route: string
  read: boolean
}

export interface WorkspaceSlice {
  sections: Record<string, SectionOverride>
  comments: Comment[]
  activity: Activity[]
  notifications: Notification[]
  tasksDone: string[]
  /** Comply-or-explain notes (解释说明) for disclosures marked not applicable, by section id. */
  explanations?: Record<string, string>
}

const EMPTY_SLICE: WorkspaceSlice = { sections: {}, comments: [], activity: [], notifications: [], tasksDone: [], explanations: {} }
const ACTIVITY_LIMIT = 200

/** Workflow status implied by the seed's free-text status. */
export function seedStatus(status: string | undefined, completed?: boolean): SectionStatus {
  switch (status) {
    case 'Approved':
      return 'approved'
    case 'In Review':
      return 'submitted'
    case 'Draft':
      return 'draft'
    default:
      return completed ? 'approved' : 'not_started'
  }
}

const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
const now = () => new Date().toISOString()

/** Where a notification about a section should take the reader. */
const sectionRoute = (moduleId: string | undefined, kind: ActivityKind) =>
  moduleId ? (kind === 'submit' ? `/modules/${moduleId}/review` : `/modules/${moduleId}/questionnaire`) : '/tasks'

type Ctx = { ws: string; actor: string; actorId?: string }

interface ReportingState {
  workspaces: Record<string, WorkspaceSlice>
  setAnswer: (ctx: Ctx, moduleId: string, sectionId: string, fieldId: string, value: string) => void
  /** Bulk write, e.g. from an Excel import. `values` is keyed `sectionId → fieldId → value`. */
  importAnswers: (
    ctx: Ctx,
    moduleId: string,
    values: Record<string, Record<string, string>>,
    source: string,
    notes?: { sectionId: string; fieldId: string; body: string }[],
  ) => number
  submitSection: (ctx: Ctx, moduleId: string, sectionId: string) => void
  /** Unlock a submitted or approved section for editing (recorded in the activity log). */
  reopenSection: (ctx: Ctx, moduleId: string, sectionId: string) => void
  decide: (ctx: Ctx, moduleId: string, sectionIds: string[], decision: ReviewDecision, note?: string) => void
  addComment: (ctx: Ctx, moduleId: string, sectionId: string, body: string, fieldId?: string) => void
  resolveComment: (ctx: Ctx, commentId: string) => void
  completeTask: (ctx: Ctx, taskId: string, done: boolean) => void
  logExport: (ctx: Ctx, note: string) => void
  /** Set or clear (empty string) the not-applicable explanation for a disclosure. */
  setExplanation: (ctx: Ctx, sectionId: string, text: string) => void
  markAllRead: (ctx: Ctx) => void
  resetWorkspace: (ws: string) => void
}

function slice(state: ReportingState, ws: string): WorkspaceSlice {
  return state.workspaces[ws] ?? EMPTY_SLICE
}

function withSlice(state: ReportingState, ws: string, fn: (s: WorkspaceSlice) => WorkspaceSlice): Pick<ReportingState, 'workspaces'> {
  return { workspaces: { ...state.workspaces, [ws]: fn(slice(state, ws)) } }
}

function record(s: WorkspaceSlice, event: Omit<Activity, 'id' | 'at'>, notify = false): WorkspaceSlice {
  const entry: Activity = { ...event, id: uid(), at: now() }
  return {
    ...s,
    activity: [entry, ...s.activity].slice(0, ACTIVITY_LIMIT),
    notifications: notify
      ? [{ ...entry, route: sectionRoute(event.moduleId, event.kind), read: false }, ...s.notifications].slice(0, 50)
      : s.notifications,
  }
}

function patchSection(s: WorkspaceSlice, sectionId: string, patch: Partial<SectionOverride>, actor: string): WorkspaceSlice {
  const prev = s.sections[sectionId] ?? { answers: {} }
  return {
    ...s,
    sections: {
      ...s.sections,
      [sectionId]: { ...prev, ...patch, answers: { ...prev.answers, ...patch.answers }, updatedAt: now(), updatedBy: actor },
    },
  }
}

const DECISION_STATUS: Record<ReviewDecision, SectionStatus> = {
  approve: 'approved',
  request_changes: 'changes_requested',
  reject: 'draft',
}
const DECISION_KIND: Record<ReviewDecision, ActivityKind> = { approve: 'approve', request_changes: 'request_changes', reject: 'reject' }

export const useReportingStore = create<ReportingState>()(
  persist(
    (set, get) => ({
      workspaces: {},

      setAnswer: ({ ws, actor }, moduleId, sectionId, fieldId, value) =>
        set(state =>
          withSlice(state, ws, s => {
            const current = s.sections[sectionId]?.status
            // Editing an approved or submitted section reopens it as a draft.
            const status: SectionStatus = current === 'changes_requested' ? current : 'draft'
            const next = patchSection(s, sectionId, { answers: { [fieldId]: value }, status }, actor)
            // Collapse rapid keystrokes into one activity entry per field.
            const last = next.activity[0]
            if (last && last.kind === 'answer' && last.sectionId === sectionId && last.note === fieldId && last.actor === actor) return next
            return record(next, { kind: 'answer', actor, moduleId, sectionId, note: fieldId })
          }),
        ),

      importAnswers: ({ ws, actor }, moduleId, values, source, notes = []) => {
        let count = 0
        set(state =>
          withSlice(state, ws, s => {
            const at = now()
            let next: WorkspaceSlice = notes.length
              ? {
                  ...s,
                  comments: [
                    ...s.comments,
                    ...notes.map(n => ({
                      id: uid(),
                      sectionId: n.sectionId,
                      fieldId: n.fieldId,
                      author: actor,
                      body: n.body,
                      at,
                      resolved: false,
                    })),
                  ],
                }
              : s
            for (const [sectionId, answers] of Object.entries(values)) {
              const n = Object.keys(answers).length
              if (!n) continue
              count += n
              next = patchSection(next, sectionId, { answers, status: 'draft' }, actor)
            }
            return count ? record(next, { kind: 'import', actor, moduleId, count, note: source }, true) : next
          }),
        )
        return count
      },

      submitSection: ({ ws, actor, actorId }, moduleId, sectionId) =>
        set(state =>
          withSlice(state, ws, s =>
            record(
              patchSection(s, sectionId, { status: 'submitted', submittedBy: actorId }, actor),
              { kind: 'submit', actor, actorId, moduleId, sectionId },
              true,
            ),
          ),
        ),

      reopenSection: ({ ws, actor, actorId }, moduleId, sectionId) =>
        set(state =>
          withSlice(state, ws, s =>
            record(patchSection(s, sectionId, { status: 'draft' }, actor), { kind: 'reopen', actor, actorId, moduleId, sectionId }),
          ),
        ),

      decide: ({ ws, actor, actorId }, moduleId, sectionIds, decision, note) =>
        set(state =>
          withSlice(state, ws, s => {
            let next = s
            for (const id of sectionIds) next = patchSection(next, id, { status: DECISION_STATUS[decision] }, actor)
            return record(
              next,
              { kind: DECISION_KIND[decision], actor, actorId, moduleId, sectionId: sectionIds[0], count: sectionIds.length, note },
              true,
            )
          }),
        ),

      addComment: ({ ws, actor }, moduleId, sectionId, body, fieldId) =>
        set(state =>
          withSlice(state, ws, s =>
            record(
              { ...s, comments: [...s.comments, { id: uid(), sectionId, fieldId, author: actor, body, at: now(), resolved: false }] },
              { kind: 'comment', actor, moduleId, sectionId, note: body.slice(0, 140) },
              /@\S/.test(body),
            ),
          ),
        ),

      resolveComment: ({ ws }, commentId) =>
        set(state =>
          withSlice(state, ws, s => ({ ...s, comments: s.comments.map(c => (c.id === commentId ? { ...c, resolved: !c.resolved } : c)) })),
        ),

      completeTask: ({ ws, actor }, taskId, done) =>
        set(state =>
          withSlice(state, ws, s => {
            const tasksDone = done ? [...new Set([...s.tasksDone, taskId])] : s.tasksDone.filter(t => t !== taskId)
            return done ? record({ ...s, tasksDone }, { kind: 'task_done', actor, note: taskId }) : { ...s, tasksDone }
          }),
        ),

      logExport: ({ ws, actor }, note) => set(state => withSlice(state, ws, s => record(s, { kind: 'report_export', actor, note }))),

      setExplanation: ({ ws }, sectionId, text) =>
        set(state =>
          withSlice(state, ws, s => {
            const { [sectionId]: _old, ...rest } = s.explanations ?? {}
            return { ...s, explanations: text.trim() ? { ...rest, [sectionId]: text.trim() } : rest }
          }),
        ),

      markAllRead: ({ ws }) =>
        set(state => withSlice(state, ws, s => ({ ...s, notifications: s.notifications.map(n => (n.read ? n : { ...n, read: true })) }))),

      resetWorkspace: ws => {
        const { [ws]: _removed, ...rest } = get().workspaces
        set({ workspaces: rest })
      },
    }),
    {
      name: 'nexus.reporting',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({ workspaces: state.workspaces }),
    },
  ),
)

export const selectSlice = (ws: string) => (state: ReportingState) => slice(state, ws)
