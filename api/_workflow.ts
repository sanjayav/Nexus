// Nexus SRD v2.0 — §5 + §16.4 — Server-side RBAC helper
// Mirrors the client predicates in src/lib/rbac.ts.
// Not a serverless function — imported by api/workflow and api/blockchain handlers.
// Stays within Vercel Hobby 12-function budget (AC-14).

import type { NeonQueryFunction } from '@neondatabase/serverless'

type Sql = NeonQueryFunction<false, false>

export type WorkflowRole = 'AUTO' | 'FM' | 'SO' | 'TL'
export type PlatformRole = 'admin' | 'team-lead' | 'analyst' | 'viewer' | 'auditor'

export interface UserContext {
  userId: string
  orgId: string
  platformRole: PlatformRole | null
}

/** Fetch a user's effective workflow roles for a specific questionnaire item. */
export async function getWorkflowRolesForItem(
  sql: Sql,
  userId: string,
  questionnaireItemId: string,
): Promise<WorkflowRole[]> {
  const rows = await sql`
    SELECT workflow_role
    FROM workflow_role_assignment
    WHERE user_id = ${userId}
      AND questionnaire_item_id = ${questionnaireItemId}
  ` as Array<{ workflow_role: WorkflowRole }>
  return rows.map(r => r.workflow_role)
}

/** Resolve a user's platform role slug. */
export async function getPlatformRole(sql: Sql, userId: string): Promise<PlatformRole | null> {
  const rows = await sql`
    SELECT r.slug
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = ${userId}
    ORDER BY CASE r.slug
      WHEN 'admin' THEN 1
      WHEN 'team-lead' THEN 2
      WHEN 'analyst' THEN 3
      WHEN 'auditor' THEN 4
      WHEN 'viewer' THEN 5
      ELSE 6
    END
    LIMIT 1
  ` as Array<{ slug: PlatformRole }>
  return rows.length > 0 ? rows[0].slug : null
}

/**
 * SRD §5.4 Permission Matrix per Workflow Role.
 * Returns whether the given workflow role can perform the given action.
 */
function rolePermits(role: WorkflowRole, action: 'enter'|'review'|'approve'|'publish'|'override'): boolean {
  switch (action) {
    case 'enter':    return role === 'AUTO' || role === 'FM' || role === 'SO' || role === 'TL'
    case 'review':   return role === 'TL'
    case 'approve':  return role === 'SO'
    case 'publish':  return role === 'SO'
    case 'override': return role === 'SO'
  }
}

function platformPermits(role: PlatformRole | null, action: 'enter'|'review'|'approve'|'publish'|'override'): boolean {
  if (role === 'admin') return true
  if (role === 'auditor' || role === 'viewer') return false
  switch (action) {
    case 'enter':    return role === 'team-lead' || role === 'analyst'
    case 'review':   return role === 'team-lead'
    case 'approve':  return role === 'team-lead' // composed with SO workflow role
    case 'publish':  return role === 'team-lead'
    case 'override': return false
  }
}

/** Intersection of platform role + workflow-role-for-item (SRD §5.3). */
async function canDo(
  sql: Sql,
  userId: string,
  itemId: string,
  action: 'enter'|'review'|'approve'|'override',
): Promise<boolean> {
  const platform = await getPlatformRole(sql, userId)
  if (!platformPermits(platform, action)) return false
  if (platform === 'admin') return true // admin bypasses workflow-role check

  const workflowRoles = await getWorkflowRolesForItem(sql, userId, itemId)
  if (workflowRoles.length === 0) return false

  return workflowRoles.some(r => rolePermits(r, action))
}

export const canEnter   = (sql: Sql, uid: string, itemId: string) => canDo(sql, uid, itemId, 'enter')
export const canReview  = (sql: Sql, uid: string, itemId: string) => canDo(sql, uid, itemId, 'review')
export const canApprove = (sql: Sql, uid: string, itemId: string) => canDo(sql, uid, itemId, 'approve')

export async function canPublish(sql: Sql, userId: string): Promise<boolean> {
  const platform = await getPlatformRole(sql, userId)
  if (platform === 'admin') return true
  if (!platformPermits(platform, 'publish')) return false
  // Publish requires at least one SO workflow assignment anywhere
  const rows = await sql`
    SELECT 1 FROM workflow_role_assignment
    WHERE user_id = ${userId} AND workflow_role = 'SO'
    LIMIT 1
  ` as Array<unknown>
  return rows.length > 0
}

/**
 * Append a hash-chained audit_event row.
 * Returns the new hash so callers can persist it to data_value.value_hash.
 */
export async function emitAuditEvent(
  sql: Sql,
  params: {
    dataValueId: string
    eventType: 'entered'|'submitted'|'reviewed'|'approved'|'rejected'|'published'|'assigned'|'overridden'
    actorUserId: string
    actorPlatformRole: PlatformRole | null
    actorWorkflowRole: WorkflowRole | null
    comment?: string
  },
): Promise<{ previousHash: string; newHash: string }> {
  const prev = await sql`
    SELECT new_hash FROM audit_event
    WHERE data_value_id = ${params.dataValueId}
    ORDER BY timestamp DESC
    LIMIT 1
  ` as Array<{ new_hash: string }>

  const previousHash = prev.length > 0 ? prev[0].new_hash : '0x' + '0'.repeat(64)

  // Simulated anchor hash — SRD §13.3 (no external chain write in PoC).
  const crypto = await import('crypto')
  const payload = `${params.dataValueId}|${params.eventType}|${params.actorUserId}|${Date.now()}`
  const newHash = '0x' + crypto.createHash('sha256').update(previousHash + payload).digest('hex')

  await sql`
    INSERT INTO audit_event
      (data_value_id, event_type, actor_user_id, actor_platform_role,
       actor_workflow_role, previous_hash, new_hash, comment)
    VALUES
      (${params.dataValueId}, ${params.eventType}, ${params.actorUserId},
       ${params.actorPlatformRole}, ${params.actorWorkflowRole},
       ${previousHash}, ${newHash}, ${params.comment || null})
  `

  return { previousHash, newHash }
}
