// Permission check helpers for RBAC

export type Permission = string  // format: "resource.action"

export function hasPermission(userPermissions: string[], resource: string, action: string): boolean {
  return userPermissions.includes(`${resource}.${action}`)
}

export function hasAnyPermission(userPermissions: string[], checks: [string, string][]): boolean {
  return checks.some(([resource, action]) => hasPermission(userPermissions, resource, action))
}

export function hasAllPermissions(userPermissions: string[], checks: [string, string][]): boolean {
  return checks.every(([resource, action]) => hasPermission(userPermissions, resource, action))
}

// Route → required permission mapping
export const ROUTE_PERMISSIONS: Record<string, [string, string]> = {
  '/dashboard': ['dashboard', 'view'],
  '/calculators': ['calculators', 'view'],
  '/data': ['data', 'view'],
  '/workflow': ['workflow', 'view'],
  '/reports': ['reports', 'view'],
  '/analytics': ['analytics', 'view'],
  '/admin/org': ['admin', 'org'],
  '/admin/users': ['admin', 'users'],
  '/admin/audit': ['audit', 'view'],
  '/admin/ef-library': ['admin', 'settings'],
  '/admin/gwp': ['admin', 'settings'],
  '/settings': ['admin', 'settings'],
}

export function canAccessRoute(userPermissions: string[], route: string): boolean {
  // If no permissions loaded yet (demo mode), allow all
  if (userPermissions.length === 0) return true
  const required = ROUTE_PERMISSIONS[route]
  if (!required) return true // unknown routes are allowed
  return hasPermission(userPermissions, required[0], required[1])
}
