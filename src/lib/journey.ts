import type { OrgEntity, OrgMember, QuestionAssignment } from './orgStore'
import { resolveRole, resolvePermissions, hasPermission, type PlatformRole } from './rbac'
import type { User } from '../auth/AuthContext'
import i18n from '../i18n'

export type StageKey = 'onboard' | 'assign' | 'collect' | 'review' | 'approve' | 'publish'

export interface Stage {
  key: StageKey
  label: string
  description: string
  route: string
  owners: PlatformRole[]
  cta: string
}

export const PIPELINE: Stage[] = [
  { key: 'onboard', label: 'Set up org',
    description: 'Build the reporting tree and add members',
    route: '/onboarding', owners: ['platform_admin'],
    cta: 'Start with your group' },
  { key: 'assign', label: 'Assign',
    description: 'Pick GRI line items and hand them to people',
    route: '/admin/assignments',
    owners: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead'],
    cta: 'Create first assignment' },
  { key: 'collect', label: 'Collect',
    description: 'Plants answer questions and attach evidence',
    route: '/my-tasks', owners: ['plant_manager', 'data_contributor'],
    cta: 'Open my tasks' },
  { key: 'review', label: 'Review',
    description: 'Subsidiary lead checks plant submissions',
    route: '/work/review', owners: ['subsidiary_lead', 'plant_manager'],
    cta: 'Review submissions' },
  { key: 'approve', label: 'Approve',
    description: 'Sustainability officer signs off the rollup',
    route: '/work/approval',
    owners: ['group_sustainability_officer', 'platform_admin'],
    cta: 'Approve rollups' },
  { key: 'publish', label: 'Publish',
    description: 'Lock the year and generate the GRI report',
    route: '/reports',
    owners: ['group_sustainability_officer', 'platform_admin'],
    cta: 'Publish report' },
]

/** Stage with label/description/cta in the current UI language. */
function localiseStage(stage: Stage): Stage {
  const k = `components.journey.stages.${stage.key}`
  return {
    ...stage,
    label: i18n.t(`${k}.label`, { defaultValue: stage.label }),
    description: i18n.t(`${k}.description`, { defaultValue: stage.description }),
    cta: i18n.t(`${k}.cta`, { defaultValue: stage.cta }),
  }
}

export interface StageStatus {
  stage: Stage
  state: 'locked' | 'todo' | 'active' | 'done'
  total: number
  done: number
  headline: string
  isMine: boolean
}

export interface PipelineInput {
  entities: OrgEntity[]
  members: OrgMember[]
  assignments: QuestionAssignment[]
}

/**
 * Compute the live status of each pipeline stage. Caller passes in the
 * current entities/members/assignments — we don't hit the network here.
 * `null` data = still loading; return an empty-ish pipeline so the bar
 * renders without flashing.
 */
export function computePipeline(user: User | null, data: PipelineInput | null): StageStatus[] {
  const role = resolveRole(user)
  const t = (key: string, vars?: Record<string, unknown>) => i18n.t(`components.journey.headline.${key}`, vars)

  const entities = data?.entities ?? []
  const members = data?.members ?? []
  const assignments = data?.assignments ?? []

  const hasGroup = entities.some(e => e.type === 'group')
  const hasPlants = entities.some(e => e.type === 'plant' || e.type === 'office')
  const hasMembers = members.length > 0

  const assigned = assignments.length
  const inProgress = assignments.filter(a => a.status === 'in_progress').length
  const submitted = assignments.filter(a => a.status === 'submitted').length
  const reviewed = assignments.filter(a => a.status === 'reviewed').length
  const approved = assignments.filter(a => a.status === 'approved').length
  const notStarted = assignments.filter(a => a.status === 'not_started').length

  const onboardDone = hasGroup && hasPlants && hasMembers
  const assignDone = assigned > 0
  const collectDone = assigned > 0 && notStarted + inProgress === 0
  const reviewDone = assigned > 0 && submitted === 0 && collectDone
  const approveDone = assigned > 0 && approved === assigned
  const publishDone = false

  const entityCount = entities.length

  const stages: Array<Omit<StageStatus, 'state' | 'isMine'> & { _unlocked: boolean; _done: boolean }> = [
    {
      stage: PIPELINE[0],
      _unlocked: true, _done: onboardDone,
      total: 0, done: entityCount,
      headline: entityCount === 0
        ? t('startGroup')
        : onboardDone
          ? t('entitiesMembers', { entities: entityCount, members: members.length })
          : !hasPlants
            ? t('addPlants', { entities: entityCount })
            : t('inviteMembers', { entities: entityCount }),
    },
    {
      stage: PIPELINE[1],
      _unlocked: onboardDone, _done: assignDone,
      total: 0, done: assigned,
      headline: !onboardDone
        ? t('finishOrg')
        : assigned === 0
          ? t('noneAssigned')
          : t('assignedAcross', { assigned, plants: new Set(assignments.map(a => a.entityId)).size }),
    },
    {
      stage: PIPELINE[2],
      _unlocked: assignDone, _done: collectDone,
      total: assigned, done: assigned - notStarted - inProgress,
      headline: !assignDone
        ? t('nothingToCollect')
        : notStarted + inProgress === 0
          ? t('allSubmitted')
          : t('outstanding', { outstanding: notStarted + inProgress, submitted: submitted + reviewed + approved }),
    },
    {
      stage: PIPELINE[3],
      _unlocked: submitted + reviewed + approved > 0, _done: reviewDone,
      total: submitted + reviewed + approved, done: reviewed + approved,
      headline: submitted === 0
        ? (reviewed + approved > 0 ? t('allReviewed') : t('nothingToReview'))
        : t('waitingLead', { count: submitted }),
    },
    {
      stage: PIPELINE[4],
      _unlocked: reviewed + approved > 0, _done: approveDone,
      total: reviewed + approved, done: approved,
      headline: reviewed === 0
        ? (approved > 0 ? t('approvedCount', { count: approved }) : t('nothingToApprove'))
        : t('awaitingOfficer', { count: reviewed }),
    },
    {
      stage: PIPELINE[5],
      _unlocked: approveDone, _done: publishDone,
      total: assigned, done: approved,
      headline: !approveDone
        ? approved === 0
          ? t('approvalsRequired')
          : t('partialApproved', { approved, assigned })
        : t('readyToPublish'),
    },
  ]

  const activeIdx = stages.findIndex(s => s._unlocked && !s._done)

  return stages.map((s, i) => {
    let state: StageStatus['state']
    if (!s._unlocked) state = 'locked'
    else if (s._done) state = 'done'
    else if (i === activeIdx) state = 'active'
    else state = 'todo'
    const isMine = s.stage.owners.includes(role) && (state === 'active' || state === 'todo')
    return { stage: localiseStage(s.stage), state, total: s.total, done: s.done, headline: s.headline, isMine }
  })
}

export function focusStage(user: User | null, data: PipelineInput | null): StageStatus | null {
  const stages = computePipeline(user, data)
  const mineActive = stages.find(s => s.isMine && s.state === 'active')
  if (mineActive) return mineActive
  const mineTodo = stages.find(s => s.isMine)
  if (mineTodo) return mineTodo
  return stages.find(s => s.state === 'active') ?? stages[0]
}


/* ── Next action: the ONE "what should I do now" model ─────────────────────
 *
 * Every "next" surface (My Day hero card, My Tasks header) derives from
 * `nextAction()`. Nothing else in the app should invent its own ranking, so
 * the counts and the suggestion can never disagree between screens.
 *
 * Truthfulness: callers pass `null` for data that is still loading and must
 * render loading/error themselves. `nextAction` only ever says "cleared" when
 * the user HAS assignments and none of them need anything; a user with no
 * assignments gets 'unassigned' (never "all done").
 */

type AssignmentLike = Pick<QuestionAssignment, 'id' | 'status' | 'due_date'> & { is_overdue?: boolean; last_updated?: string }

const OPEN_STATUSES = new Set(['not_started', 'in_progress', 'rejected'])
const DAY_MS = 24 * 60 * 60 * 1000

export function isOpenAssignment(a: { status: string }): boolean {
  return OPEN_STATUSES.has(a.status)
}

/** Overdue = past due and not yet through submission. */
export function isAssignmentOverdue(a: { is_overdue?: boolean; due_date: string | null; status: string }, now = Date.now()): boolean {
  if (a.is_overdue) return true
  if (!a.due_date) return false
  if (a.status === 'approved' || a.status === 'reviewed' || a.status === 'submitted') return false
  // Due dates are calendar days: an item due today is "due today", not overdue.
  const d = daysUntil(a.due_date, now)
  return d != null && d < 0
}

/** Whole days until the due date (negative when overdue), null when undated. */
export function daysUntil(due: string | null, now = Date.now()): number | null {
  if (!due) return null
  return Math.ceil((new Date(due).getTime() - now) / DAY_MS)
}

/**
 * Rank open assignments, most urgent first:
 *   1. sent back for revision (someone is waiting on the fix)
 *   2. most overdue
 *   3. closest upcoming deadline
 *   4. undated, in-progress before not-started
 */
export function rankOpenAssignments<T extends AssignmentLike>(assignments: T[], now = Date.now()): T[] {
  const open = assignments.filter(isOpenAssignment)
  const score = (a: T) => {
    const d = daysUntil(a.due_date, now)
    const returned = a.status === 'rejected' ? -100000 : 0
    if (d != null) return returned + d
    return returned + (a.status === 'in_progress' ? 9000 : 9999)
  }
  return [...open].sort((x, y) => score(x) - score(y))
}

export type NextActionKind =
  | 'fix'        // a submission was sent back to me
  | 'answer'     // I have an open disclosure to fill
  | 'review'     // submissions wait for my review
  | 'approve'    // reviewed items wait for my approval
  | 'publish'    // everything approved, I can publish
  | 'assign'     // org is set up, nothing assigned yet (admin / SO)
  | 'onboard'    // org tree incomplete (admin)
  | 'waiting'    // all mine submitted, waiting on others
  | 'cleared'    // all mine approved
  | 'unassigned' // nothing assigned to me (and nothing else for me to do)

export interface NextActionInput {
  /** My assignments, already filtered to the active framework. */
  mine: QuestionAssignment[]
  /** Org-wide assignments for the active framework (queue counts). Optional. */
  all?: QuestionAssignment[] | null
  /** Org data for set-up stages. Optional. */
  org?: PipelineInput | null
  now?: number
}

export interface NextAction {
  kind: NextActionKind
  /** The single assignment to work on (fix / answer). */
  assignment: QuestionAssignment | null
  stage: StageKey
  /** Where the primary action goes. Answer/fix open the task inline in My Tasks. */
  route: string
  /** Open = not started + in progress + sent back (mine). */
  openCount: number
  overdueCount: number
  returnedCount: number
  /** Mine that are submitted/reviewed (waiting on others). */
  waitingCount: number
  approvedCount: number
  /** Org queue counts, only when the user holds the permission (else 0). */
  reviewCount: number
  approvalCount: number
  canReview: boolean
  canApprove: boolean
  /** Days overdue for the chosen assignment (0 when not overdue). */
  overdueDays: number
}

/** Route that opens one task inline inside My Tasks (keeps Work context). */
export function taskRoute(a: { id: string }): string {
  return `/my-tasks?open=${encodeURIComponent(a.id)}`
}

export function nextAction(user: User | null, input: NextActionInput): NextAction {
  const now = input.now ?? Date.now()
  const perms = resolvePermissions(user)
  const role = resolveRole(user)
  const canReview = hasPermission(perms, 'workflow.review')
  const canApprove = hasPermission(perms, 'workflow.approve')
  const mine = input.mine
  const all = input.all ?? []

  const ranked = rankOpenAssignments(mine, now)
  const returned = mine.filter(a => a.status === 'rejected')
  const overdue = mine.filter(a => isOpenAssignment(a) && isAssignmentOverdue(a, now))
  const waiting = mine.filter(a => a.status === 'submitted' || a.status === 'reviewed')
  const approved = mine.filter(a => a.status === 'approved')
  const reviewCount = canReview ? all.filter(a => a.status === 'submitted').length : 0
  const approvalCount = canApprove ? all.filter(a => a.status === 'reviewed').length : 0

  const base = {
    openCount: ranked.length,
    overdueCount: overdue.length,
    returnedCount: returned.length,
    waitingCount: waiting.length,
    approvedCount: approved.length,
    reviewCount,
    approvalCount,
    canReview,
    canApprove,
  }
  const make = (kind: NextActionKind, stage: StageKey, route: string, assignment: QuestionAssignment | null = null): NextAction => {
    const d = assignment ? daysUntil(assignment.due_date, now) : null
    return { kind, stage, route, assignment, overdueDays: d != null && d < 0 && assignment && isAssignmentOverdue(assignment, now) ? -d : 0, ...base }
  }

  const top = ranked[0] ?? null
  // 1. Returned work and overdue work of my own come first.
  if (top && (top.status === 'rejected' || isAssignmentOverdue(top, now))) {
    return make(top.status === 'rejected' ? 'fix' : 'answer', 'collect', taskRoute(top), top)
  }
  // 2. Queues that are blocked on me.
  if (reviewCount > 0) return make('review', 'review', '/work/review')
  if (approvalCount > 0) return make('approve', 'approve', '/work/approval')
  // 3. My remaining open work.
  if (top) return make('answer', 'collect', taskRoute(top), top)

  // 4. Set-up stages owned by my role.
  if (input.org) {
    const stages = computePipeline(user, input.org)
    const mineStage = stages.find(s => s.isMine && s.state === 'active')
    if (mineStage?.stage.key === 'onboard') return make('onboard', 'onboard', mineStage.stage.route)
    if (mineStage?.stage.key === 'assign') return make('assign', 'assign', mineStage.stage.route)
    if (mineStage?.stage.key === 'publish' && PIPELINE[5].owners.includes(role)) return make('publish', 'publish', '/reports')
  }

  // 5. Nothing to act on: say exactly why.
  if (mine.length === 0) return make('unassigned', 'collect', '/my-tasks')
  if (waiting.length > 0) return make('waiting', 'review', '/my-tasks')
  return make('cleared', 'publish', '/my-tasks')
}
