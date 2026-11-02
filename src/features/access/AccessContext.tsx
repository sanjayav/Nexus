import { createContext, useContext, useEffect, useMemo, ReactNode } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAuth } from '@/features/auth/AuthContext'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { can as canFor, canEditModule as canEditFor, isAdmin, permissionsFor, type Member, type Permission, type RoleId } from './model'
import { getSlice, membershipsOf, useAccessStore, type AccessSlice } from './store'

interface AccessContextValue {
  /** The signed-in person's membership in the open workspace, or null when signed out. */
  member: Member | null
  role: RoleId | null
  permissions: Permission[]
  can: (permission: Permission) => boolean
  canAny: (permissions: Permission[]) => boolean
  canEditModule: (moduleId: string) => boolean
  isAdmin: boolean
  /** Workspace ids this person can switch to. */
  workspaceIds: string[]
  policy: AccessSlice['policy']
}

const AccessContext = createContext<AccessContextValue | undefined>(undefined)

/**
 * Resolves the session to a member of the open workspace. If they are not an
 * active member here, it moves them to a workspace where they are; if there
 * is none (suspended or removed everywhere), the session ends.
 */
export function AccessProvider({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const { workspace, setWorkspace } = useWorkspace()
  const slice = useAccessStore(useShallow(s => getSlice(s, workspace.id)))
  const workspaceIds = useAccessStore(
    useShallow(s =>
      user
        ? membershipsOf(s, user.email)
            .filter(m => m.member.status === 'active')
            .map(m => m.ws)
        : [],
    ),
  )

  const member = useMemo(
    () => (user ? (slice.members.find(m => m.email === user.email && m.status === 'active') ?? null) : null),
    [slice.members, user],
  )

  useEffect(() => {
    if (!user || member) return
    if (workspaceIds.length) setWorkspace(workspaceIds[0])
    else logout()
  }, [user, member, workspaceIds, setWorkspace, logout])

  const value = useMemo<AccessContextValue>(() => {
    const permissions = member ? permissionsFor(member.role, slice.permissions) : []
    return {
      member,
      role: member?.role ?? null,
      permissions,
      can: p => canFor(member, p, slice.permissions),
      canAny: ps => ps.some(p => canFor(member, p, slice.permissions)),
      canEditModule: id => canEditFor(member, id, slice.permissions),
      isAdmin: !!member && isAdmin(member),
      workspaceIds,
      policy: slice.policy,
    }
  }, [member, slice.permissions, slice.policy, workspaceIds])

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
}

export function useAccess() {
  const ctx = useContext(AccessContext)
  if (!ctx) throw new Error('useAccess must be used within AccessProvider')
  return ctx
}

/** The open workspace's directory slice (members, permissions, policy, access log). */
export function useDirectory(): AccessSlice {
  const { workspace } = useWorkspace()
  return useAccessStore(useShallow(s => getSlice(s, workspace.id)))
}

export type Person = Pick<Member, 'id' | 'name' | 'title'>

/** Active members of the open workspace: who can be @mentioned or own a task. */
export function usePeople(): Person[] {
  const { members } = useDirectory()
  return useMemo(() => members.filter(m => m.status === 'active').map(({ id, name, title }) => ({ id, name, title })), [members])
}

/** Store actions bound to the open workspace and the signed-in member. */
export function useAccessActions() {
  const { workspace } = useWorkspace()
  const { member } = useAccess()
  const store = useAccessStore(
    useShallow(s => ({
      invite: s.invite,
      resendInvite: s.resendInvite,
      revokeInvite: s.revokeInvite,
      changeRole: s.changeRole,
      setScope: s.setScope,
      setStatus: s.setStatus,
      remove: s.remove,
      setPermission: s.setPermission,
      resetPermissions: s.resetPermissions,
      setPolicy: s.setPolicy,
    })),
  )
  return useMemo(() => {
    const ctx = { ws: workspace.id, actorId: member?.id ?? '' }
    return {
      invite: (requests: Parameters<typeof store.invite>[1]) => store.invite(ctx, requests),
      resendInvite: (id: string) => store.resendInvite(ctx, id),
      revokeInvite: (id: string) => store.revokeInvite(ctx, id),
      changeRole: (id: string, role: RoleId) => store.changeRole(ctx, id, role),
      setScope: (id: string, scope: string[]) => store.setScope(ctx, id, scope),
      setStatus: (id: string, status: 'active' | 'suspended') => store.setStatus(ctx, id, status),
      remove: (id: string) => store.remove(ctx, id),
      setPermission: (role: RoleId, permission: Permission, granted: boolean) => store.setPermission(ctx, role, permission, granted),
      resetPermissions: () => store.resetPermissions(ctx),
      setPolicy: (policy: Parameters<typeof store.setPolicy>[1]) => store.setPolicy(ctx, policy),
    }
  }, [store, workspace.id, member?.id])
}
