/**
 * Access model: roles, permissions and the rules that decide who may do what.
 *
 * Everything here is pure so it can be unit-tested and moved server-side
 * unchanged. The UI uses it to hide or disable controls; the stores use it
 * to refuse the same actions, so a hidden button is never the only guard.
 */

export type RoleId =
  'platform_admin' | 'org_admin' | 'framework_owner' | 'data_contributor' | 'reviewer' | 'approver' | 'external_auditor' | 'read_only'

export type Permission =
  | 'dashboard.view'
  | 'dashboard.export'
  | 'analytics.view'
  | 'analytics.export'
  | 'questionnaire.view'
  | 'questionnaire.edit'
  | 'questionnaire.submit'
  | 'questionnaire.configure'
  | 'evidence.view'
  | 'evidence.upload'
  | 'evidence.delete'
  | 'approval.view'
  | 'approval.review'
  | 'approval.approve'
  | 'report.view'
  | 'report.build'
  | 'report.publish'
  | 'report.anchor'
  | 'audit.view'
  | 'chain.verify'
  | 'admin.users'
  | 'admin.org'
  | 'admin.chain'
  | 'admin.billing'

export type Risk = 'low' | 'medium' | 'high'
export type PermissionGroup = 'dashboards' | 'questionnaire' | 'evidence' | 'approvals' | 'reports' | 'chain' | 'admin'

/** Permission catalogue in display order, with the risk shown in the matrix. */
export const PERMISSION_GROUPS: { id: PermissionGroup; perms: { id: Permission; risk: Risk }[] }[] = [
  {
    id: 'dashboards',
    perms: [
      { id: 'dashboard.view', risk: 'low' },
      { id: 'dashboard.export', risk: 'low' },
      { id: 'analytics.view', risk: 'low' },
      { id: 'analytics.export', risk: 'low' },
    ],
  },
  {
    id: 'questionnaire',
    perms: [
      { id: 'questionnaire.view', risk: 'low' },
      { id: 'questionnaire.edit', risk: 'medium' },
      { id: 'questionnaire.submit', risk: 'medium' },
      { id: 'questionnaire.configure', risk: 'high' },
    ],
  },
  {
    id: 'evidence',
    perms: [
      { id: 'evidence.view', risk: 'low' },
      { id: 'evidence.upload', risk: 'medium' },
      { id: 'evidence.delete', risk: 'high' },
    ],
  },
  {
    id: 'approvals',
    perms: [
      { id: 'approval.view', risk: 'low' },
      { id: 'approval.review', risk: 'medium' },
      { id: 'approval.approve', risk: 'high' },
    ],
  },
  {
    id: 'reports',
    perms: [
      { id: 'report.view', risk: 'low' },
      { id: 'report.build', risk: 'medium' },
      { id: 'report.publish', risk: 'high' },
      { id: 'report.anchor', risk: 'high' },
    ],
  },
  {
    id: 'chain',
    perms: [
      { id: 'audit.view', risk: 'low' },
      { id: 'chain.verify', risk: 'low' },
    ],
  },
  {
    id: 'admin',
    perms: [
      { id: 'admin.users', risk: 'high' },
      { id: 'admin.org', risk: 'high' },
      { id: 'admin.chain', risk: 'high' },
      { id: 'admin.billing', risk: 'high' },
    ],
  },
]

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap(g => g.perms.map(p => p.id))

/** Most to least privileged; also the order roles are listed in. */
export const ROLE_ORDER: RoleId[] = [
  'platform_admin',
  'org_admin',
  'framework_owner',
  'approver',
  'reviewer',
  'data_contributor',
  'external_auditor',
  'read_only',
]

export const ADMIN_ROLES: RoleId[] = ['platform_admin', 'org_admin']

const VIEW: Permission[] = ['dashboard.view', 'analytics.view', 'questionnaire.view', 'report.view']

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleId, Permission[]> = {
  platform_admin: ALL_PERMISSIONS,
  org_admin: ALL_PERMISSIONS.filter(p => p !== 'admin.billing'),
  framework_owner: [
    ...VIEW,
    'dashboard.export',
    'analytics.export',
    'questionnaire.edit',
    'questionnaire.submit',
    'questionnaire.configure',
    'evidence.view',
    'evidence.upload',
    'approval.view',
    'approval.review',
    'report.build',
    'audit.view',
    'chain.verify',
  ],
  approver: [
    ...VIEW,
    'dashboard.export',
    'analytics.export',
    'evidence.view',
    'approval.view',
    'approval.review',
    'approval.approve',
    'report.build',
    'report.publish',
    'audit.view',
    'chain.verify',
  ],
  reviewer: [...VIEW, 'dashboard.export', 'evidence.view', 'approval.view', 'approval.review', 'audit.view'],
  data_contributor: [...VIEW, 'questionnaire.edit', 'questionnaire.submit', 'evidence.view', 'evidence.upload', 'approval.view'],
  external_auditor: [...VIEW, 'evidence.view', 'approval.view', 'audit.view', 'chain.verify'],
  read_only: ['dashboard.view', 'report.view'],
}

/**
 * Permissions that can never be removed from a role in the matrix, so an
 * organisation cannot lock every administrator out of user management.
 */
export const LOCKED_GRANTS: Partial<Record<RoleId, Permission[]>> = {
  platform_admin: ALL_PERMISSIONS,
  org_admin: ['admin.users'],
}

export type RolePermissions = Partial<Record<RoleId, Permission[]>>

export function permissionsFor(role: RoleId, overrides: RolePermissions = {}): Permission[] {
  return overrides[role] ?? DEFAULT_ROLE_PERMISSIONS[role]
}

// ─── Members ─────────────────────────────────────────────────────────────────

export type MemberStatus = 'active' | 'invited' | 'suspended'

export interface Member {
  id: string
  /** Lower-case; the sign-in identifier. */
  email: string
  name: string
  /** Job title, in the tenant's language (tenant data). */
  title?: string
  phone?: string
  role: RoleId
  /** Framework ids this person may fill in. Empty means every framework. */
  scope: string[]
  status: MemberStatus
  invitedBy?: string
  invitedAt?: string
  /** Invitation link token and its expiry (invited members only). */
  token?: string
  expiresAt?: string
  joinedAt?: string
  lastActiveAt?: string
  /**
   * SHA-256 of the password chosen when accepting an invitation. Demo only:
   * credentials belong in the identity service once the backend lands.
   */
  passwordHash?: string
}

export const INVITE_TTL_DAYS = 7
const DAY = 86_400_000

export const isAdmin = (m: Pick<Member, 'role'>) => ADMIN_ROLES.includes(m.role)

export function inviteExpiry(from: Date): string {
  return new Date(from.getTime() + INVITE_TTL_DAYS * DAY).toISOString()
}

export function isExpired(m: Pick<Member, 'status' | 'expiresAt'>, now: Date = new Date()): boolean {
  return m.status === 'invited' && !!m.expiresAt && new Date(m.expiresAt).getTime() <= now.getTime()
}

/** Whether a member may use a permission right now. Invited and suspended people may do nothing. */
export function can(member: Pick<Member, 'role' | 'status'> | null | undefined, permission: Permission, overrides?: RolePermissions) {
  return !!member && member.status === 'active' && permissionsFor(member.role, overrides).includes(permission)
}

/** Whether a member may fill in a given framework (permission plus framework scope). */
export function canEditModule(
  member: Pick<Member, 'role' | 'status' | 'scope'> | null | undefined,
  moduleId: string,
  overrides?: RolePermissions,
) {
  return can(member, 'questionnaire.edit', overrides) && (member!.scope.length === 0 || member!.scope.includes(moduleId))
}

// ─── Invitations ─────────────────────────────────────────────────────────────

/** Deliberately simple: one @, no spaces, a dot in the domain. Real delivery confirms the address. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type InviteError = 'invalid' | 'member' | 'invited' | 'duplicate'

/** Splits pasted text ("a@x.com, b@y.com; c@z.com") into addresses. */
export function splitEmails(text: string): string[] {
  return text
    .split(/[\s,;，；]+/)
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
}

/** Validation for a batch of invitations against the current directory. Returns an error per row, or null. */
export function validateInvites(
  emails: string[],
  members: Pick<Member, 'email' | 'status'>[],
  now: Date = new Date(),
): (InviteError | null)[] {
  const seen = new Set<string>()
  return emails.map(raw => {
    const email = raw.trim().toLowerCase()
    if (!EMAIL_RE.test(email)) return 'invalid'
    if (seen.has(email)) return 'duplicate'
    seen.add(email)
    const existing = members.find(m => m.email === email)
    if (existing?.status === 'invited' && !isExpired(existing as Member, now)) return 'invited'
    if (existing && existing.status !== 'invited') return 'member'
    return null
  })
}

// ─── Guard rails for administrators ──────────────────────────────────────────

export type ChangeError = 'self' | 'lastAdmin' | 'outranked' | 'forbidden'

const rank = (role: RoleId) => ROLE_ORDER.indexOf(role)

/**
 * Whether `actor` may change `target`'s role (or suspend / remove them, when
 * `next` is omitted). Rules: you need admin.users; you cannot act on yourself;
 * you cannot act on someone more privileged than you or grant a role above
 * your own; and the workspace always keeps at least one active administrator.
 */
export function checkMemberChange(
  actor: Member,
  target: Member,
  members: Member[],
  overrides: RolePermissions | undefined,
  next?: RoleId,
): ChangeError | null {
  if (!can(actor, 'admin.users', overrides)) return 'forbidden'
  if (actor.id === target.id) return 'self'
  if (rank(target.role) < rank(actor.role)) return 'outranked'
  if (next && rank(next) < rank(actor.role)) return 'outranked'
  const losesAdmin = isAdmin(target) && target.status === 'active' && (next === undefined || !ADMIN_ROLES.includes(next))
  if (losesAdmin && members.filter(m => isAdmin(m) && m.status === 'active').length <= 1) return 'lastAdmin'
  return null
}

/** Roles an actor may hand out: their own and anything less privileged. */
export function assignableRoles(actor: Pick<Member, 'role'>): RoleId[] {
  return ROLE_ORDER.filter(r => rank(r) >= rank(actor.role))
}

// ─── Segregation of duties ───────────────────────────────────────────────────

/**
 * Four-eyes rule: whoever submitted a section cannot approve it. Returns true
 * when the rule blocks `approverId`.
 */
export function blockedByFourEyes(submittedBy: string | undefined, approverId: string, enabled: boolean): boolean {
  return enabled && !!submittedBy && submittedBy === approverId
}

// ─── Route policy ────────────────────────────────────────────────────────────

/**
 * The permission each route needs, checked in order (first match wins).
 * Routes not listed are open to every active member.
 */
export const ROUTE_POLICY: [RegExp, Permission][] = [
  [/^\/(iam|roles)(\/|$)/, 'admin.users'],
  [/^\/(admin|connectors|workflow|settings)(\/|$)/, 'admin.org'],
  [/^\/modules\/[^/]+\/review/, 'approval.view'],
  [/^\/(import)(\/|$)/, 'questionnaire.edit'],
  [/^\/period\/create/, 'report.build'],
  [/^\/reports\/[^/]+\/build/, 'report.build'],
  [/^\/publish/, 'report.view'],
  [/^\/(modules|frameworks|workbench|tasks)(\/|$)/, 'questionnaire.view'],
  [/^\/evidence/, 'evidence.view'],
  [/^\/(verify|events|timeline)(\/|$)/, 'chain.verify'],
  [/^\/(analytics|ratings|portfolio)(\/|$)/, 'analytics.view'],
  [/^\/(carbon|scope3|ghg|products|suppliers|dma|ai)(\/|$)/, 'analytics.view'],
]

export function requiredPermission(pathname: string): Permission | null {
  return ROUTE_POLICY.find(([re]) => re.test(pathname))?.[1] ?? null
}

/** Where a member should land: the executive overview, or the first page they can open. */
export const HOME_PATH = '/executive'
