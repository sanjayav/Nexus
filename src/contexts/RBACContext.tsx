import { createContext, useContext, useState, ReactNode } from 'react'

// ─── Role & Permission Types ───────────────────────────────────────────────────

export type RoleId =
    | 'platform_admin'
    | 'org_admin'
    | 'framework_owner'
    | 'data_contributor'
    | 'reviewer'
    | 'approver'
    | 'external_auditor'
    | 'read_only'

export type Permission =
    // Questionnaire
    | 'questionnaire.view'
    | 'questionnaire.edit'
    | 'questionnaire.submit'
    | 'questionnaire.configure'
    // Evidence
    | 'evidence.view'
    | 'evidence.upload'
    | 'evidence.delete'
    // Approvals
    | 'approval.view'
    | 'approval.review'
    | 'approval.approve'
    // Reports
    | 'report.view'
    | 'report.build'
    | 'report.publish'
    | 'report.anchor'
    // Analytics
    | 'analytics.view'
    | 'analytics.export'
    // Dashboard
    | 'dashboard.view'
    | 'dashboard.export'
    // Admin
    | 'admin.users'
    | 'admin.org'
    | 'admin.chain'
    | 'admin.billing'
    // Blockchain
    | 'audit.view'
    | 'chain.verify'

export interface RoleDefinition {
    id: RoleId
    name: string
    description: string
    color: string
    bgColor: string
    borderColor: string
    badge: string
    permissions: Permission[]
}

// ─── Role Definitions ─────────────────────────────────────────────────────────

const ALL_PERMS: Permission[] = [
    'questionnaire.view', 'questionnaire.edit', 'questionnaire.submit', 'questionnaire.configure',
    'evidence.view', 'evidence.upload', 'evidence.delete',
    'approval.view', 'approval.review', 'approval.approve',
    'report.view', 'report.build', 'report.publish', 'report.anchor',
    'analytics.view', 'analytics.export',
    'dashboard.view', 'dashboard.export',
    'admin.users', 'admin.org', 'admin.chain', 'admin.billing',
    'audit.view', 'chain.verify',
]

export const ROLE_DEFINITIONS: Record<RoleId, RoleDefinition> = {
    platform_admin: {
        id: 'platform_admin', name: 'Platform Admin', description: 'Full system access',
        color: 'text-rose-400', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/40',
        badge: '🔴', permissions: ALL_PERMS,
    },
    org_admin: {
        id: 'org_admin', name: 'Org Admin', description: 'Full org scope, no billing',
        color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/40',
        badge: '🟠', permissions: ALL_PERMS.filter(p => p !== 'admin.billing'),
    },
    framework_owner: {
        id: 'framework_owner', name: 'Framework Owner', description: 'Configures & assigns disclosures',
        color: 'text-violet-400', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/40',
        badge: '🟣', permissions: [
            'questionnaire.view', 'questionnaire.edit', 'questionnaire.submit', 'questionnaire.configure',
            'evidence.view', 'evidence.upload',
            'approval.view', 'approval.review',
            'report.view', 'report.build',
            'analytics.view', 'analytics.export',
            'dashboard.view', 'dashboard.export',
            'audit.view', 'chain.verify',
        ],
    },
    data_contributor: {
        id: 'data_contributor', name: 'Data Contributor', description: 'Fills answers & uploads evidence',
        color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/40',
        badge: '🔵', permissions: [
            'questionnaire.view', 'questionnaire.edit', 'questionnaire.submit',
            'evidence.view', 'evidence.upload',
            'approval.view',
            'report.view',
            'analytics.view',
            'dashboard.view',
        ],
    },
    reviewer: {
        id: 'reviewer', name: 'Reviewer', description: 'Reviews & comments, cannot approve',
        color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/40',
        badge: '🩵', permissions: [
            'questionnaire.view',
            'evidence.view',
            'approval.view', 'approval.review',
            'report.view',
            'analytics.view',
            'dashboard.view', 'dashboard.export',
            'audit.view',
        ],
    },
    approver: {
        id: 'approver', name: 'Approver', description: 'Signs off with DID/VC on-chain',
        color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/40',
        badge: '🟢', permissions: [
            'questionnaire.view',
            'evidence.view',
            'approval.view', 'approval.review', 'approval.approve',
            'report.view', 'report.build',
            'analytics.view', 'analytics.export',
            'dashboard.view', 'dashboard.export',
            'audit.view', 'chain.verify',
        ],
    },
    external_auditor: {
        id: 'external_auditor', name: 'External Auditor', description: 'Read-only + chain verification',
        color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/40',
        badge: '🟡', permissions: [
            'questionnaire.view',
            'evidence.view',
            'approval.view',
            'report.view',
            'analytics.view',
            'dashboard.view',
            'audit.view', 'chain.verify',
        ],
    },
    read_only: {
        id: 'read_only', name: 'Read Only', description: 'View dashboards and published reports',
        color: 'text-gray-400', bgColor: 'bg-gray-500/10', borderColor: 'border-gray-500/40',
        badge: '⚪', permissions: [
            'questionnaire.view',
            'report.view',
            'dashboard.view',
        ],
    },
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface RBACContextValue {
    currentRole: RoleId
    roleDef: RoleDefinition
    setRole: (role: RoleId) => void
    can: (permission: Permission) => boolean
    canAny: (permissions: Permission[]) => boolean
    canAll: (permissions: Permission[]) => boolean
}

const RBACContext = createContext<RBACContextValue | undefined>(undefined)

export function RBACProvider({ children }: { children: ReactNode }) {
    const [currentRole, setCurrentRole] = useState<RoleId>(() => {
        const stored = localStorage.getItem('nexus_demo_role')
        return (stored as RoleId) || 'data_contributor'
    })

    const setRole = (role: RoleId) => {
        setCurrentRole(role)
        localStorage.setItem('nexus_demo_role', role)
    }

    const roleDef = ROLE_DEFINITIONS[currentRole]

    const can = (permission: Permission) => roleDef.permissions.includes(permission)
    const canAny = (perms: Permission[]) => perms.some(p => roleDef.permissions.includes(p))
    const canAll = (perms: Permission[]) => perms.every(p => roleDef.permissions.includes(p))

    return (
        <RBACContext.Provider value={{ currentRole, roleDef, setRole, can, canAny, canAll }}>
            {children}
        </RBACContext.Provider>
    )
}

export function useRBAC() {
    const ctx = useContext(RBACContext)
    if (!ctx) throw new Error('useRBAC must be used within RBACProvider')
    return ctx
}
