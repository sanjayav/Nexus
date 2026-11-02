import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DIRECTORY } from '@/data/people'
import {
  assignableRoles,
  can,
  checkMemberChange,
  inviteExpiry,
  isExpired,
  LOCKED_GRANTS,
  permissionsFor,
  validateInvites,
  type ChangeError,
  type InviteError,
  type Member,
  type Permission,
  type RoleId,
  type RolePermissions,
} from './model'

/**
 * Directory store: members, invitations, role permissions and the access log
 * for each workspace. It is the stand-in for the identity API, so every
 * action checks the actor's rights itself and returns a typed result rather
 * than trusting the UI to have hidden the button.
 */

export type AccessEventKind =
  | 'invite'
  | 'invite_resent'
  | 'invite_revoked'
  | 'invite_accepted'
  | 'role_changed'
  | 'scope_changed'
  | 'suspended'
  | 'reactivated'
  | 'removed'
  | 'permission_granted'
  | 'permission_revoked'
  | 'permissions_reset'
  | 'policy_changed'
  | 'sign_in'
  | 'sign_in_failed'

export interface AccessEvent {
  id: string
  at: string
  kind: AccessEventKind
  /** Member id of whoever acted; absent for system events. */
  actorId?: string
  /** Member the event is about (id), or the email for failed sign-ins. */
  target?: string
  role?: RoleId
  permission?: Permission
  /** Previous role, for role changes. */
  from?: RoleId
}

export interface AccessPolicy {
  /** Whoever submitted a section may not approve it. */
  fourEyes: boolean
}

export interface AccessSlice {
  members: Member[]
  permissions: RolePermissions
  policy: AccessPolicy
  events: AccessEvent[]
}

export type Result<E extends string = string, T = undefined> = { ok: true; value: T } | { ok: false; error: E }

export type InviteRequest = { email: string; role: RoleId; scope: string[]; name?: string }

const EVENT_LIMIT = 500
const DAY = 86_400_000
const MINUTE = 60_000

const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
/** Unguessable link token. */
const token = () => {
  const bytes = new Uint8Array(18)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

/** Materialise a workspace's seed directory relative to `now`. */
export function seedSlice(ws: string, now: Date = new Date()): AccessSlice {
  const t = now.getTime()
  const iso = (ms: number) => new Date(ms).toISOString()
  const members: Member[] = (DIRECTORY[ws] ?? []).map(p => {
    const status = p.status ?? 'active'
    const since = t - p.daysAgo * DAY
    return {
      id: p.id,
      email: p.email.toLowerCase(),
      name: p.name,
      title: p.title,
      phone: p.phone,
      role: p.role,
      scope: p.scope ?? [],
      status,
      ...(status === 'invited'
        ? { invitedAt: iso(since), invitedBy: p.invitedBy, token: `seed-${ws}-${p.id}`, expiresAt: inviteExpiry(new Date(since)) }
        : { joinedAt: iso(since), lastActiveAt: p.activeMinutesAgo !== undefined ? iso(t - p.activeMinutesAgo * MINUTE) : undefined }),
    }
  })
  const admin = members.find(m => m.role === 'org_admin')?.id
  const events: AccessEvent[] = members
    .filter(m => m.status === 'invited')
    .map(m => ({ id: `seed-${m.id}`, at: m.invitedAt!, kind: 'invite' as const, actorId: m.invitedBy, target: m.id, role: m.role }))
  const suspended = members.find(m => m.status === 'suspended')
  if (suspended && admin)
    events.push({ id: `seed-s-${suspended.id}`, at: iso(t - 9 * DAY), kind: 'suspended', actorId: admin, target: suspended.id })
  events.sort((a, b) => b.at.localeCompare(a.at))
  return { members, permissions: {}, policy: { fourEyes: true }, events }
}

type Ctx = { ws: string; actorId: string }

interface AccessState {
  workspaces: Record<string, AccessSlice>
  invite: (
    ctx: Ctx,
    requests: InviteRequest[],
  ) => Result<'forbidden' | 'role' | 'invalid', { errors: (InviteError | null)[]; invited: Member[] }>
  resendInvite: (ctx: Ctx, memberId: string) => Result<'forbidden' | 'notFound', Member>
  revokeInvite: (ctx: Ctx, memberId: string) => Result<'forbidden' | 'notFound'>
  acceptInvite: (
    tokenValue: string,
    profile: { name: string; passwordHash: string },
  ) => Result<'notFound' | 'expired', { ws: string; member: Member }>
  changeRole: (ctx: Ctx, memberId: string, role: RoleId) => Result<ChangeError | 'notFound'>
  setScope: (ctx: Ctx, memberId: string, scope: string[]) => Result<'forbidden' | 'notFound'>
  setStatus: (ctx: Ctx, memberId: string, status: 'active' | 'suspended') => Result<ChangeError | 'notFound'>
  remove: (ctx: Ctx, memberId: string) => Result<ChangeError | 'notFound'>
  setPermission: (ctx: Ctx, role: RoleId, permission: Permission, granted: boolean) => Result<'forbidden' | 'locked'>
  resetPermissions: (ctx: Ctx) => Result<'forbidden'>
  setPolicy: (ctx: Ctx, policy: Partial<AccessPolicy>) => Result<'forbidden'>
  recordSignIn: (ws: string, memberId: string) => void
  recordFailedSignIn: (ws: string, email: string) => void
  resetWorkspace: (ws: string) => void
}

/** Seeds are built once per session so unchanged workspaces return a stable object to selectors. */
const seedCache = new Map<string, AccessSlice>()
const cachedSeed = (ws: string) => {
  if (!seedCache.has(ws)) seedCache.set(ws, seedSlice(ws))
  return seedCache.get(ws)!
}

export const getSlice = (state: Pick<AccessState, 'workspaces'>, ws: string): AccessSlice => state.workspaces[ws] ?? cachedSeed(ws)

const event = (e: Omit<AccessEvent, 'id' | 'at'>): AccessEvent => ({ ...e, id: uid(), at: new Date().toISOString() })
const log = (s: AccessSlice, ...events: AccessEvent[]): AccessSlice => ({ ...s, events: [...events, ...s.events].slice(0, EVENT_LIMIT) })

const fail = <E extends string>(error: E) => ({ ok: false as const, error })
const ok = <T = undefined>(value?: T) => ({ ok: true as const, value: value as T })

export const useAccessStore = create<AccessState>()(
  persist(
    (set, get) => {
      /** Run a mutation on one workspace slice. Returning a Result without `slice` leaves state untouched. */
      const mutate = <R>(ws: string, fn: (s: AccessSlice) => { result: R; slice?: AccessSlice }): R => {
        const { result, slice } = fn(getSlice(get(), ws))
        if (slice) set(state => ({ workspaces: { ...state.workspaces, [ws]: slice } }))
        return result
      }
      const actorOf = (s: AccessSlice, ctx: Ctx) => s.members.find(m => m.id === ctx.actorId)
      const isManager = (s: AccessSlice, ctx: Ctx) => can(actorOf(s, ctx), 'admin.users', s.permissions)
      const patch = (s: AccessSlice, id: string, p: Partial<Member>): AccessSlice => ({
        ...s,
        members: s.members.map(m => (m.id === id ? { ...m, ...p } : m)),
      })

      return {
        workspaces: {},

        invite: (ctx, requests) =>
          mutate<ReturnType<AccessState['invite']>>(ctx.ws, s => {
            const actor = actorOf(s, ctx)
            if (!actor || !isManager(s, ctx)) return { result: fail('forbidden') }
            const allowed = assignableRoles(actor)
            if (requests.some(r => !allowed.includes(r.role))) return { result: fail('role') }
            const errors = validateInvites(
              requests.map(r => r.email),
              s.members,
            )
            if (!requests.length) return { result: fail('invalid') }
            if (errors.some(Boolean)) return { result: ok({ errors, invited: [] as Member[] }) }
            const now = new Date()
            // An expired invitation for the same address is replaced, not duplicated.
            const replaced = new Set(requests.map(r => r.email.trim().toLowerCase()))
            const invited: Member[] = requests.map(r => {
              const email = r.email.trim().toLowerCase()
              return {
                id: uid(),
                email,
                name: r.name?.trim() || email.split('@')[0],
                role: r.role,
                scope: r.scope,
                status: 'invited',
                invitedBy: actor.id,
                invitedAt: now.toISOString(),
                token: token(),
                expiresAt: inviteExpiry(now),
              }
            })
            const next: AccessSlice = {
              ...s,
              members: [...s.members.filter(m => !(m.status === 'invited' && replaced.has(m.email))), ...invited],
            }
            return {
              result: ok({ errors, invited }),
              slice: log(next, ...invited.map(m => event({ kind: 'invite', actorId: actor.id, target: m.id, role: m.role }))),
            }
          }),

        resendInvite: (ctx, memberId) =>
          mutate<ReturnType<AccessState['resendInvite']>>(ctx.ws, s => {
            if (!isManager(s, ctx)) return { result: fail('forbidden') }
            const m = s.members.find(x => x.id === memberId && x.status === 'invited')
            if (!m) return { result: fail('notFound') }
            const now = new Date()
            const fresh = { token: token(), invitedAt: now.toISOString(), expiresAt: inviteExpiry(now), invitedBy: ctx.actorId }
            return {
              result: ok({ ...m, ...fresh }),
              slice: log(patch(s, memberId, fresh), event({ kind: 'invite_resent', actorId: ctx.actorId, target: memberId })),
            }
          }),

        revokeInvite: (ctx, memberId) =>
          mutate<ReturnType<AccessState['revokeInvite']>>(ctx.ws, s => {
            if (!isManager(s, ctx)) return { result: fail('forbidden') }
            const m = s.members.find(x => x.id === memberId && x.status === 'invited')
            if (!m) return { result: fail('notFound') }
            return {
              result: ok(),
              slice: log(
                { ...s, members: s.members.filter(x => x.id !== memberId) },
                event({ kind: 'invite_revoked', actorId: ctx.actorId, target: m.email }),
              ),
            }
          }),

        acceptInvite: (tokenValue, profile) => {
          const ws = findInvite(get(), tokenValue)?.ws
          if (!ws) return fail('notFound')
          return mutate<ReturnType<AccessState['acceptInvite']>>(ws, s => {
            const m = s.members.find(x => x.token === tokenValue && x.status === 'invited')
            if (!m) return { result: fail('notFound') }
            if (isExpired(m)) return { result: fail('expired') }
            const now = new Date().toISOString()
            const joined: Member = {
              ...m,
              name: profile.name.trim() || m.name,
              passwordHash: profile.passwordHash,
              status: 'active',
              joinedAt: now,
              lastActiveAt: now,
              token: undefined,
              expiresAt: undefined,
            }
            return {
              result: ok({ ws, member: joined }),
              slice: log(
                { ...s, members: s.members.map(x => (x.id === m.id ? joined : x)) },
                event({ kind: 'invite_accepted', actorId: m.id, target: m.id, role: m.role }),
              ),
            }
          })
        },

        changeRole: (ctx, memberId, role) =>
          mutate<ReturnType<AccessState['changeRole']>>(ctx.ws, s => {
            const actor = actorOf(s, ctx)
            const target = s.members.find(m => m.id === memberId)
            if (!actor) return { result: fail('forbidden') }
            if (!target) return { result: fail('notFound') }
            if (target.role === role) return { result: ok() }
            const err = checkMemberChange(actor, target, s.members, s.permissions, role)
            if (err) return { result: fail(err) }
            return {
              result: ok(),
              slice: log(
                patch(s, memberId, { role }),
                event({ kind: 'role_changed', actorId: actor.id, target: memberId, role, from: target.role }),
              ),
            }
          }),

        setScope: (ctx, memberId, scope) =>
          mutate<ReturnType<AccessState['setScope']>>(ctx.ws, s => {
            if (!isManager(s, ctx)) return { result: fail('forbidden') }
            if (!s.members.some(m => m.id === memberId)) return { result: fail('notFound') }
            return {
              result: ok(),
              slice: log(patch(s, memberId, { scope }), event({ kind: 'scope_changed', actorId: ctx.actorId, target: memberId })),
            }
          }),

        setStatus: (ctx, memberId, status) =>
          mutate<ReturnType<AccessState['setStatus']>>(ctx.ws, s => {
            const actor = actorOf(s, ctx)
            const target = s.members.find(m => m.id === memberId)
            if (!actor) return { result: fail('forbidden') }
            if (!target || target.status === 'invited') return { result: fail('notFound') }
            if (target.status === status) return { result: ok() }
            const err = checkMemberChange(actor, target, s.members, s.permissions, status === 'active' ? target.role : undefined)
            if (err) return { result: fail(err) }
            return {
              result: ok(),
              slice: log(
                patch(s, memberId, { status }),
                event({ kind: status === 'active' ? 'reactivated' : 'suspended', actorId: actor.id, target: memberId }),
              ),
            }
          }),

        remove: (ctx, memberId) =>
          mutate<ReturnType<AccessState['remove']>>(ctx.ws, s => {
            const actor = actorOf(s, ctx)
            const target = s.members.find(m => m.id === memberId)
            if (!actor) return { result: fail('forbidden') }
            if (!target) return { result: fail('notFound') }
            const err = checkMemberChange(actor, target, s.members, s.permissions)
            if (err) return { result: fail(err) }
            return {
              result: ok(),
              slice: log(
                { ...s, members: s.members.filter(m => m.id !== memberId) },
                // The name is kept on the event because the member record is gone.
                event({ kind: 'removed', actorId: actor.id, target: `${target.name} <${target.email}>` }),
              ),
            }
          }),

        setPermission: (ctx, role, permission, granted) =>
          mutate<ReturnType<AccessState['setPermission']>>(ctx.ws, s => {
            if (!isManager(s, ctx)) return { result: fail('forbidden') }
            if (LOCKED_GRANTS[role]?.includes(permission)) return { result: fail('locked') }
            const current = permissionsFor(role, s.permissions)
            const nextPerms = granted ? [...new Set([...current, permission])] : current.filter(p => p !== permission)
            return {
              result: ok(),
              slice: log(
                { ...s, permissions: { ...s.permissions, [role]: nextPerms } },
                event({ kind: granted ? 'permission_granted' : 'permission_revoked', actorId: ctx.actorId, role, permission }),
              ),
            }
          }),

        resetPermissions: ctx =>
          mutate<ReturnType<AccessState['resetPermissions']>>(ctx.ws, s => {
            if (!isManager(s, ctx)) return { result: fail('forbidden') }
            return { result: ok(), slice: log({ ...s, permissions: {} }, event({ kind: 'permissions_reset', actorId: ctx.actorId })) }
          }),

        setPolicy: (ctx, policy) =>
          mutate<ReturnType<AccessState['setPolicy']>>(ctx.ws, s => {
            if (!isManager(s, ctx)) return { result: fail('forbidden') }
            return {
              result: ok(),
              slice: log({ ...s, policy: { ...s.policy, ...policy } }, event({ kind: 'policy_changed', actorId: ctx.actorId })),
            }
          }),

        recordSignIn: (ws, memberId) =>
          mutate<ReturnType<AccessState['recordSignIn']>>(ws, s => ({
            result: undefined,
            slice: log(
              patch(s, memberId, { lastActiveAt: new Date().toISOString() }),
              event({ kind: 'sign_in', actorId: memberId, target: memberId }),
            ),
          })),

        recordFailedSignIn: (ws, email) =>
          mutate<ReturnType<AccessState['recordFailedSignIn']>>(ws, s => ({
            result: undefined,
            slice: log(s, event({ kind: 'sign_in_failed', target: email.trim().toLowerCase() })),
          })),

        resetWorkspace: ws => {
          const { [ws]: _removed, ...rest } = get().workspaces
          set({ workspaces: rest })
        },
      }
    },
    {
      name: 'nexus.access',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({ workspaces: state.workspaces }),
    },
  ),
)

/** Locate an invitation by its link token across every workspace (seeded ones included). */
export function findInvite(state: Pick<AccessState, 'workspaces'>, tokenValue: string, workspaceIds: string[] = Object.keys(DIRECTORY)) {
  const ids = new Set([...workspaceIds, ...Object.keys(state.workspaces)])
  for (const ws of ids) {
    const member = getSlice(state, ws).members.find(m => m.token === tokenValue && m.status === 'invited')
    if (member) return { ws, member }
  }
  return null
}

/** Every workspace in which `email` has a membership (any status). */
export function membershipsOf(state: Pick<AccessState, 'workspaces'>, email: string, workspaceIds: string[] = Object.keys(DIRECTORY)) {
  const needle = email.trim().toLowerCase()
  const ids = new Set([...workspaceIds, ...Object.keys(state.workspaces)])
  return [...ids].flatMap(ws => {
    const member = getSlice(state, ws).members.find(m => m.email === needle)
    return member ? [{ ws, member }] : []
  })
}

/** SHA-256 hex digest, used for demo credentials. */
export async function hashPassword(password: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}
