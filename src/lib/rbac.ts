import type { User } from '../auth/AuthContext'

export type Permission = string

export type PlatformRole =
  | 'platform_admin'
  | 'group_sustainability_officer'
  | 'subsidiary_lead'
  | 'plant_manager'
  | 'data_contributor'
  | 'narrative_owner'
  | 'auditor'

export interface RoleDefinition {
  slug: PlatformRole
  name: string
  description: string
  tier: 'group' | 'subsidiary' | 'plant' | 'cross'
  homeRoute: string
  permissions: Permission[]
}

const BASE = ['dashboard.view', 'mytasks.view', 'calculators.view', 'reports.view']

export const ROLE_CATALOG: Record<PlatformRole, RoleDefinition> = {
  platform_admin: {
    slug: 'platform_admin',
    name: 'Platform Admin',
    description: 'Full access. Manages tenants, users, org tree, assignments.',
    tier: 'group',
    homeRoute: '/dashboard',
    permissions: [
      ...BASE,
      'data.view', 'data.enter', 'data.upload',
      'workflow.view', 'workflow.review', 'workflow.approve', 'workflow.publish',
      'reports.create', 'reports.publish',
      'analytics.view',
      'admin.users', 'admin.roles', 'admin.org', 'admin.assignments', 'admin.settings',
      'audit.view',
      'aggregator.view',
    ],
  },
  group_sustainability_officer: {
    slug: 'group_sustainability_officer',
    name: 'Group Sustainability Officer',
    description: 'Approves consolidated figures, signs off the report.',
    tier: 'group',
    homeRoute: '/workflow/approval',
    permissions: [
      ...BASE,
      'data.view',
      'workflow.view', 'workflow.approve', 'workflow.publish',
      'reports.create', 'reports.publish',
      'analytics.view',
      'audit.view',
      'aggregator.view',
      'admin.assignments',
    ],
  },
  subsidiary_lead: {
    slug: 'subsidiary_lead',
    name: 'Subsidiary Lead',
    description: 'Reviews plant submissions, rolls up subsidiary total.',
    tier: 'subsidiary',
    homeRoute: '/workflow/review',
    permissions: [
      ...BASE,
      'data.view',
      'workflow.view', 'workflow.review',
      'aggregator.view',
      'admin.assignments',
    ],
  },
  plant_manager: {
    slug: 'plant_manager',
    name: 'Plant Manager',
    description: 'Owns data entry for an individual plant. Assigns contributors.',
    tier: 'plant',
    homeRoute: '/my-tasks',
    permissions: [
      ...BASE,
      'data.view', 'data.enter', 'data.upload',
      'workflow.view', 'workflow.review',
      'admin.assignments',
    ],
  },
  data_contributor: {
    slug: 'data_contributor',
    name: 'Data Contributor',
    description: 'Answers assigned questionnaires, attaches evidence.',
    tier: 'plant',
    homeRoute: '/my-tasks',
    permissions: [
      ...BASE,
      'data.view', 'data.enter', 'data.upload',
      'workflow.view',
    ],
  },
  narrative_owner: {
    slug: 'narrative_owner',
    name: 'Narrative Owner',
    description: 'Writes governance, strategy and management-approach disclosures (GRI 2 / GRI 3 / CSRD narrative sections).',
    tier: 'cross',
    homeRoute: '/my-tasks',
    permissions: [
      ...BASE,
      'data.view', 'data.enter',
      'workflow.view',
    ],
  },
  auditor: {
    slug: 'auditor',
    name: 'Auditor',
    description: 'Read-only access to published data + blockchain trail.',
    tier: 'cross',
    homeRoute: '/reports/auditor',
    permissions: [
      'dashboard.view', 'reports.view', 'audit.view', 'analytics.view', 'aggregator.view',
    ],
  },
}

const LEGACY_MAP: Record<string, PlatformRole> = {
  // Legacy DB slugs from api/setup.ts
  admin: 'platform_admin',
  'team-lead': 'subsidiary_lead',
  analyst: 'plant_manager',
  viewer: 'data_contributor',
  // New DB slugs from scripts/patch-roles.ts
  platform_admin: 'platform_admin',
  group_sustainability_officer: 'group_sustainability_officer',
  subsidiary_lead: 'subsidiary_lead',
  plant_manager: 'plant_manager',
  data_contributor: 'data_contributor',
  narrative_owner: 'narrative_owner',
  // Legacy short codes (kept for backward compat)
  PA: 'platform_admin',
  TL: 'subsidiary_lead',
  SO: 'group_sustainability_officer',
  FM: 'plant_manager',
  'sustainability-officer': 'group_sustainability_officer',
  'plant-manager': 'plant_manager',
  'data-contributor': 'data_contributor',
  'platform-admin': 'platform_admin',
  auditor: 'auditor',
  AUD: 'auditor',
}

export function resolveRole(user: User | null | undefined): PlatformRole {
  if (!user) return 'data_contributor'
  const candidates = [...(user.roles ?? []), user.role].filter(Boolean) as string[]
  for (const c of candidates) {
    const resolved = LEGACY_MAP[c] || (c in ROLE_CATALOG ? (c as PlatformRole) : null)
    if (resolved) return resolved
  }
  return 'data_contributor'
}

export function resolvePermissions(user: User | null | undefined): Permission[] {
  if (!user) return []
  if (user.permissions && user.permissions.length > 0) return user.permissions
  return ROLE_CATALOG[resolveRole(user)].permissions
}

export function hasPermission(perms: Permission[], key: string): boolean {
  if (perms.length === 0) return true // demo mode — permissive
  return perms.includes(key)
}

export function hasAnyPermission(perms: Permission[], keys: string[]): boolean {
  return keys.some(k => hasPermission(perms, k))
}

export const ROUTE_PERMISSIONS: Record<string, string> = {
  '/dashboard': 'dashboard.view',
  '/my-tasks': 'mytasks.view',
  '/calculators': 'calculators.view',
  '/data': 'data.view',
  '/data/entry': 'data.enter',
  '/workflow': 'workflow.view',
  '/workflow/review': 'workflow.review',
  '/workflow/approval': 'workflow.approve',
  '/reports': 'reports.view',
  '/reports/preview': 'reports.view',
  '/reports/auditor': 'audit.view',
  '/analytics': 'analytics.view',
  '/aggregator': 'aggregator.view',
  '/admin/org': 'admin.org',
  '/admin/users': 'admin.users',
  '/admin/assignments': 'admin.assignments',
  '/admin/materiality': 'admin.assignments',
  '/admin/periods': 'admin.assignments',
  '/reports/index': 'reports.view',
  '/admin/audit': 'audit.view',
  '/admin/ef-library': 'admin.settings',
  '/admin/gwp': 'admin.settings',
  '/settings': 'admin.settings',
  '/onboarding': 'admin.org',
}

export function canAccessRoute(perms: Permission[], route: string): boolean {
  if (perms.length === 0) return true
  for (const prefix of Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length)) {
    if (route === prefix || route.startsWith(prefix + '/')) {
      return hasPermission(perms, ROUTE_PERMISSIONS[prefix])
    }
  }
  return true
}

export function homeRouteFor(user: User | null | undefined): string {
  if (!user) return '/login'
  return ROLE_CATALOG[resolveRole(user)].homeRoute
}
