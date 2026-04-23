import { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { hasPermission, hasAnyPermission, resolveRole, type PlatformRole } from '../lib/rbac'

interface IfCanProps {
  perm?: string
  anyOf?: string[]
  role?: PlatformRole | PlatformRole[]
  children: ReactNode
  fallback?: ReactNode
}

export function IfCan({ perm, anyOf, role, children, fallback = null }: IfCanProps) {
  const { user, permissions } = useAuth()
  if (role) {
    const roles = Array.isArray(role) ? role : [role]
    if (!roles.includes(resolveRole(user))) return <>{fallback}</>
  }
  if (perm && !hasPermission(permissions, perm)) return <>{fallback}</>
  if (anyOf && !hasAnyPermission(permissions, anyOf)) return <>{fallback}</>
  return <>{children}</>
}
