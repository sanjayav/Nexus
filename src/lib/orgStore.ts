import type { PlatformRole } from './rbac'

/**
 * Live org + assignment store. Everything below hits /api/org on the live
 * backend — no demo fallback, no localStorage. Pages must call `await` and
 * handle loading state.
 */

export type EntityType = 'group' | 'business_unit' | 'subsidiary' | 'plant' | 'office'
export type EntryMode = 'Manual' | 'Calculator' | 'Connector'

export interface OrgEntity {
  id: string
  parentId: string | null
  type: EntityType
  name: string
  code?: string
  country?: string
  equity?: number
  industry?: string
  createdAt: string
}

export interface OrgMember {
  id: string
  userId: string | null
  name: string
  email: string
  role: PlatformRole
  entityId: string
  createdAt: string
}

export interface OrgTarget {
  id: string
  framework_id: string
  kind: 'sbti_near_term' | 'sbti_long_term' | 'net_zero' | 'custom'
  label: string
  scope_coverage: string
  baseline_year: number
  baseline_value: number
  baseline_unit: string
  target_year: number
  target_reduction_pct: number
  status: 'committed' | 'validated' | 'achieved' | 'missed'
  validated_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MaterialTopic {
  id: string
  framework_id: string
  topic_name: string
  topic_category: string | null
  linked_gri_codes: string[]
  impact_score: number | null
  financial_score: number | null
  dma_status: 'identified' | 'assessed' | 'material' | 'not_material' | 'pending_review'
  rationale: string | null
  owner_email: string | null
  assessed_at: string | null
  created_at: string
}

export type ResponseType = 'numeric' | 'narrative' | 'table' | 'file'

export interface QuestionAssignment {
  id: string
  framework_id: string
  questionId: string
  gri_code: string
  line_item: string
  entityId: string
  assigneeId: string | null
  assigneeName: string
  assigneeEmail: string
  entry_modes: EntryMode[]
  used_mode?: EntryMode | null
  due_date: string | null
  assigned_by: string
  assigned_at: string
  status: 'not_started' | 'in_progress' | 'submitted' | 'reviewed' | 'approved' | 'rejected'
  value?: number | null
  unit?: string | null
  comment?: string
  evidence_ids?: string[]
  response_type?: ResponseType
  narrative_body?: string | null
  period_id?: string | null
  disclosure_position?: string | null
  last_updated?: string
}

export interface ReportingPeriod {
  id: string
  framework_id: string
  year: number
  label: string
  status: 'setup' | 'active' | 'locked' | 'published' | 'archived'
  start_date: string | null
  end_date: string | null
  submission_deadline: string | null
  locked_at: string | null
  locked_by: string | null
  published_at: string | null
  published_by: string | null
  publish_hash: string | null
  notes: string | null
  created_at: string
}

export interface AssignmentComment {
  id: string
  assignment_id: string
  author_user_id: string | null
  author_name: string
  author_email: string
  body: string
  kind: 'comment' | 'review_decision' | 'approval_decision' | 'rejection_reason' | 'system'
  created_at: string
}

export interface Notification {
  id: string
  kind: string
  subject: string
  body: string | null
  route: string | null
  related_assignment_id: string | null
  read_at: string | null
  created_at: string
}

export interface ContentIndexRow {
  id: string
  gri_code: string
  line_item: string
  section: string
  subsection: string
  unit: string | null
  reporting_scope: string
  total: number
  approved: number
  in_review: number
  status: 'fully' | 'partially' | 'omitted'
  response_type: ResponseType | null
}

// ── Wire shapes (snake_case from API) → local (camelCase) ──────────

interface EntityWire {
  id: string
  parent_id: string | null
  type: EntityType
  name: string
  code: string | null
  country: string | null
  equity: number | null
  industry: string | null
  created_at: string
}
function mapEntity(e: EntityWire): OrgEntity {
  return {
    id: e.id, parentId: e.parent_id, type: e.type, name: e.name,
    code: e.code ?? undefined, country: e.country ?? undefined,
    equity: e.equity ?? undefined, industry: e.industry ?? undefined,
    createdAt: e.created_at,
  }
}

interface MemberWire {
  id: string
  user_id: string | null
  entity_id: string
  email: string
  name: string
  role: PlatformRole
  created_at: string
}
function mapMember(m: MemberWire): OrgMember {
  return {
    id: m.id, userId: m.user_id, entityId: m.entity_id,
    email: m.email, name: m.name, role: m.role, createdAt: m.created_at,
  }
}

interface AssignmentWire {
  id: string
  framework_id: string
  question_id: string
  gri_code: string
  line_item: string
  unit: string | null
  entity_id: string
  assignee_email: string
  assignee_name: string
  assignee_user_id: string | null
  entry_modes: EntryMode[]
  used_mode: EntryMode | null
  due_date: string | null
  status: QuestionAssignment['status']
  value: number | null
  comment: string | null
  evidence_ids: string[] | null
  response_type: ResponseType | null
  narrative_body: string | null
  period_id: string | null
  disclosure_position: string | null
  assigned_by: string
  assigned_at: string
  last_updated: string
}
function mapAssignment(a: AssignmentWire): QuestionAssignment {
  return {
    id: a.id,
    framework_id: a.framework_id,
    questionId: a.question_id,
    gri_code: a.gri_code,
    line_item: a.line_item,
    unit: a.unit,
    entityId: a.entity_id,
    assigneeEmail: a.assignee_email,
    assigneeName: a.assignee_name,
    assigneeId: a.assignee_user_id,
    entry_modes: (a.entry_modes?.length ? a.entry_modes : ['Manual']),
    used_mode: a.used_mode,
    due_date: a.due_date,
    status: a.status,
    value: a.value != null ? Number(a.value) : null,
    comment: a.comment ?? undefined,
    evidence_ids: a.evidence_ids ?? [],
    response_type: a.response_type ?? 'numeric',
    narrative_body: a.narrative_body,
    period_id: a.period_id,
    disclosure_position: a.disclosure_position,
    assigned_by: a.assigned_by,
    assigned_at: a.assigned_at,
    last_updated: a.last_updated,
  }
}

// ── HTTP helpers ─────────────────────────────────────────────────

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('aeiforo_token')
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers as Record<string, string> || {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `API error ${res.status}`)
  }
  return res.json()
}

// ── Public API ───────────────────────────────────────────────────

export const orgStore = {
  // Entities
  async listEntities(): Promise<OrgEntity[]> {
    const wire = await req<EntityWire[]>('/org?view=entities')
    return wire.map(mapEntity)
  },
  async addEntity(data: Omit<OrgEntity, 'id' | 'createdAt'>): Promise<OrgEntity> {
    const wire = await req<EntityWire>('/org', {
      method: 'POST',
      body: JSON.stringify({
        action: 'add-entity',
        parent_id: data.parentId, type: data.type, name: data.name,
        code: data.code, country: data.country, equity: data.equity, industry: data.industry,
      }),
    })
    return mapEntity(wire)
  },
  async updateEntity(id: string, patch: Partial<Omit<OrgEntity, 'id' | 'createdAt'>>): Promise<void> {
    await req('/org', {
      method: 'POST',
      body: JSON.stringify({
        action: 'update-entity', id,
        name: patch.name, code: patch.code, country: patch.country,
        equity: patch.equity, industry: patch.industry, parent_id: patch.parentId,
      }),
    })
  },
  async removeEntity(id: string): Promise<void> {
    await req('/org', { method: 'POST', body: JSON.stringify({ action: 'remove-entity', id }) })
  },

  /**
   * DESTRUCTIVE — wipes the calling user's workspace clean. Removes all
   * entities, members, targets, materiality, periods, assignments,
   * assurance requests, and published reports for the org. Preserves the
   * org row, users (login still works), roles, and the questionnaire
   * catalogue. Use to reset the demo between presentations.
   */
  async resetWorkspace(): Promise<void> {
    await req('/org', { method: 'POST', body: JSON.stringify({ action: 'reset-workspace', confirm: 'RESET' }) })
  },

  // Members
  async listMembers(): Promise<OrgMember[]> {
    const wire = await req<MemberWire[]>('/org?view=members')
    return wire.map(mapMember)
  },
  async addMember(data: Omit<OrgMember, 'id' | 'createdAt'>): Promise<OrgMember> {
    const wire = await req<MemberWire>('/org', {
      method: 'POST',
      body: JSON.stringify({
        action: 'add-member',
        entity_id: data.entityId, email: data.email, name: data.name,
        role: data.role, user_id: data.userId,
      }),
    })
    return mapMember(wire)
  },
  async removeMember(id: string): Promise<void> {
    await req('/org', { method: 'POST', body: JSON.stringify({ action: 'remove-member', id }) })
  },

  // Assignments
  async listAssignments(): Promise<QuestionAssignment[]> {
    const wire = await req<AssignmentWire[]>('/org?view=assignments')
    return wire.map(mapAssignment)
  },
  async myAssignments(): Promise<QuestionAssignment[]> {
    const wire = await req<AssignmentWire[]>('/org?view=my-assignments')
    return wire.map(mapAssignment)
  },
  async addAssignment(data: Omit<QuestionAssignment, 'id' | 'assigned_at' | 'status' | 'last_updated'>): Promise<QuestionAssignment> {
    const wire = await req<AssignmentWire>('/org', {
      method: 'POST',
      body: JSON.stringify({
        action: 'add-assignment',
        framework_id: data.framework_id,
        question_id: data.questionId,
        gri_code: data.gri_code,
        line_item: data.line_item,
        unit: data.unit,
        entity_id: data.entityId,
        assignee_email: data.assigneeEmail,
        assignee_name: data.assigneeName,
        assignee_user_id: data.assigneeId,
        entry_modes: data.entry_modes,
        due_date: data.due_date,
        assigned_by: data.assigned_by,
        response_type: data.response_type,
        period_id: data.period_id,
      }),
    })
    return mapAssignment(wire)
  },
  async updateAssignment(id: string, patch: Partial<QuestionAssignment>): Promise<void> {
    const wire: Record<string, unknown> = {}
    if (patch.status !== undefined)         wire.status = patch.status
    if (patch.value !== undefined)          wire.value = patch.value
    if (patch.unit !== undefined)           wire.unit = patch.unit
    if (patch.comment !== undefined)        wire.comment = patch.comment
    if (patch.used_mode !== undefined)      wire.used_mode = patch.used_mode
    if (patch.due_date !== undefined)       wire.due_date = patch.due_date
    if (patch.evidence_ids !== undefined)   wire.evidence_ids = patch.evidence_ids
    if (patch.entry_modes !== undefined)    wire.entry_modes = patch.entry_modes
    if (patch.narrative_body !== undefined) wire.narrative_body = patch.narrative_body
    await req('/org', {
      method: 'POST',
      body: JSON.stringify({ action: 'update-assignment', id, patch: wire }),
    })
  },
  async removeAssignment(id: string): Promise<void> {
    await req('/org', { method: 'POST', body: JSON.stringify({ action: 'remove-assignment', id }) })
  },

  // Framework enablement (per tenant)
  async listEnabledFrameworks(): Promise<string[]> {
    const wire = await req<Array<{ framework_id: string }>>('/org?view=enabled-frameworks')
    return wire.map(w => w.framework_id)
  },
  async enableFramework(framework_id: string): Promise<void> {
    await req('/org', { method: 'POST', body: JSON.stringify({ action: 'enable-framework', framework_id }) })
  },
  async disableFramework(framework_id: string): Promise<void> {
    await req('/org', { method: 'POST', body: JSON.stringify({ action: 'disable-framework', framework_id }) })
  },
  async setPreferredFramework(framework_id: string): Promise<void> {
    await req('/org', { method: 'POST', body: JSON.stringify({ action: 'set-preferred-framework', framework_id }) })
  },

  // Per-framework progress for dashboards
  async frameworkProgress(): Promise<Array<{ framework_id: string; total: number; approved: number; in_review: number; open: number }>> {
    return req('/org?view=framework-progress')
  },

  // ── SBTi / climate targets ────────────────────────────
  async listTargets(): Promise<OrgTarget[]> {
    return req<OrgTarget[]>('/org?view=targets')
  },
  async upsertTarget(data: Partial<OrgTarget> & Pick<OrgTarget, 'kind' | 'label' | 'baseline_year' | 'baseline_value' | 'target_year' | 'target_reduction_pct'>): Promise<{ id: string }> {
    return req('/org', { method: 'POST', body: JSON.stringify({ action: 'upsert-target', ...data }) })
  },
  async removeTarget(id: string): Promise<void> {
    await req('/org', { method: 'POST', body: JSON.stringify({ action: 'remove-target', id }) })
  },

  // ── Material topics / DMA ─────────────────────────────
  async listMaterialTopics(): Promise<MaterialTopic[]> {
    return req<MaterialTopic[]>('/org?view=material-topics')
  },
  async upsertMaterialTopic(data: Partial<MaterialTopic> & Pick<MaterialTopic, 'topic_name'>): Promise<{ id: string }> {
    return req('/org', { method: 'POST', body: JSON.stringify({ action: 'upsert-material-topic', ...data }) })
  },
  async removeMaterialTopic(id: string): Promise<void> {
    await req('/org', { method: 'POST', body: JSON.stringify({ action: 'remove-material-topic', id }) })
  },

  // ── Reporting periods ─────────────────────────────────
  async listPeriods(): Promise<ReportingPeriod[]> {
    return req<ReportingPeriod[]>('/org?view=periods')
  },
  async createPeriod(data: Partial<ReportingPeriod> & { year: number; label: string }): Promise<{ id: string }> {
    return req('/org', { method: 'POST', body: JSON.stringify({ action: 'create-period', ...data }) })
  },
  async transitionPeriod(id: string, status: ReportingPeriod['status']): Promise<void> {
    await req('/org', { method: 'POST', body: JSON.stringify({ action: 'transition-period', id, status }) })
  },

  // ── Comments ─────────────────────────────────────────
  async listComments(assignmentId: string): Promise<AssignmentComment[]> {
    return req<AssignmentComment[]>(`/org?view=comments&assignment_id=${encodeURIComponent(assignmentId)}`)
  },
  async addComment(assignmentId: string, body: string, kind?: AssignmentComment['kind']): Promise<AssignmentComment> {
    return req<AssignmentComment>('/org', {
      method: 'POST',
      body: JSON.stringify({ action: 'add-comment', assignment_id: assignmentId, body, kind }),
    })
  },

  // ── Notifications ────────────────────────────────────
  async listNotifications(): Promise<Notification[]> {
    return req<Notification[]>('/org?view=notifications')
  },
  async unreadNotificationCount(): Promise<number> {
    const r = await req<{ unread: number }>('/org?view=notification-count')
    return r.unread
  },
  async markNotificationRead(id: string | 'all'): Promise<void> {
    await req('/org', { method: 'POST', body: JSON.stringify({ action: 'mark-notification-read', id }) })
  },

  // ── Content Index ────────────────────────────────────
  async contentIndex(frameworkId: string = 'gri'): Promise<ContentIndexRow[]> {
    return req<ContentIndexRow[]>(`/org?view=content-index&framework_id=${encodeURIComponent(frameworkId)}`)
  },

  // ── Historical values (for variance checks on review) ──
  async historical(questionId: string): Promise<Array<{ year: number; value: number; source_report: string }>> {
    // Neon returns NUMERIC columns as strings. Coerce to real numbers here so
    // every caller can trust the type and not crash on `.toFixed()`.
    const res = await fetch(`/api/workflow?view=historical&question_id=${encodeURIComponent(questionId)}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('aeiforo_token') ?? ''}` },
    })
    if (!res.ok) return []
    const raw = await res.json() as Array<{ year: number; value: string | number; source_report: string }>
    return raw.map(r => ({ year: Number(r.year), value: Number(r.value), source_report: r.source_report }))
  },

  // Utility — tree helpers that operate on a pre-loaded entity set
  descendantIds(entities: OrgEntity[], entityId: string): string[] {
    const out = new Set<string>([entityId])
    let changed = true
    while (changed) {
      changed = false
      for (const e of entities) {
        if (e.parentId && out.has(e.parentId) && !out.has(e.id)) {
          out.add(e.id); changed = true
        }
      }
    }
    return Array.from(out)
  },
  pathOf(entities: OrgEntity[], entityId: string): OrgEntity[] {
    const byId = new Map(entities.map(e => [e.id, e]))
    const out: OrgEntity[] = []
    let cur = byId.get(entityId)
    while (cur) {
      out.unshift(cur)
      cur = cur.parentId ? byId.get(cur.parentId) : undefined
    }
    return out
  },
  membersForEntity(entities: OrgEntity[], members: OrgMember[], entityId: string): OrgMember[] {
    const ids = new Set(orgStore.descendantIds(entities, entityId))
    return members.filter(m => ids.has(m.entityId))
  },

  // ── Reports ────────────────────────────────────────────────
  async listPublishedReports(): Promise<PublishedReport[]> {
    return req<PublishedReport[]>('/org?view=published-reports')
  },
  async publishReport(period_id: string, assurance_request_id?: string): Promise<PublishReportResult> {
    return req<PublishReportResult>('/org', {
      method: 'POST',
      body: JSON.stringify({
        action: 'publish-report',
        period_id,
        assurance_request_id: assurance_request_id ?? null,
        base_url: window.location.origin,
      }),
    })
  },
  reportPdfUrl(artifactId: string): string {
    const token = localStorage.getItem('aeiforo_token')
    return `/api/org?view=report-pdf&id=${encodeURIComponent(artifactId)}&_t=${token ? encodeURIComponent(token) : ''}`
  },
  async downloadReportPdf(artifactId: string, filename = 'sustainability-report.pdf'): Promise<void> {
    const token = localStorage.getItem('aeiforo_token')
    const res = await fetch(`/api/org?view=report-pdf&id=${encodeURIComponent(artifactId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error(`Download failed (${res.status})`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  // ── Assurance ──────────────────────────────────────────────
  async listAssuranceRequests(period_id?: string): Promise<AssuranceRequest[]> {
    const qs = period_id ? `&period_id=${encodeURIComponent(period_id)}` : ''
    return req<AssuranceRequest[]>(`/org?view=assurance-requests${qs}`)
  },
  async requestAssurance(payload: {
    period_id: string
    auditor_email: string
    auditor_name?: string
    auditor_firm?: string
    opinion_type?: 'limited' | 'reasonable'
    isae_reference?: string
    notes?: string
  }): Promise<{ id: string; upload_token: string }> {
    return req('/org', {
      method: 'POST',
      body: JSON.stringify({ action: 'request-assurance', ...payload }),
    })
  },
  async withdrawAssurance(id: string): Promise<void> {
    await req('/org', { method: 'POST', body: JSON.stringify({ action: 'withdraw-assurance', id }) })
  },
  async rotateAssuranceToken(id: string): Promise<{ upload_token: string }> {
    return req('/org', { method: 'POST', body: JSON.stringify({ action: 'rotate-upload-token', id }) })
  },
  async getAssuranceUploadLink(id: string): Promise<{ upload_token: string }> {
    return req(`/org?view=assurance-upload-link&id=${encodeURIComponent(id)}`)
  },

  // ── Historical reference & anomalies ────────────────────────
  async historicalReference(questionnaire_item_id: string, entity_id?: string): Promise<HistoricalReference> {
    const q = entity_id ? `&entity_id=${encodeURIComponent(entity_id)}` : ''
    return req<HistoricalReference>(`/org?view=historical-reference&questionnaire_item_id=${encodeURIComponent(questionnaire_item_id)}${q}`)
  },
  async anomalyScan(scope: AnomalyScope = 'role', opts: { includeSuppressed?: boolean; limit?: number } = {}): Promise<AnomalyScanResult> {
    const qs = new URLSearchParams()
    qs.set('view', 'anomaly-scan')
    qs.set('scope', scope)
    if (opts.includeSuppressed) qs.set('include_suppressed', '1')
    if (opts.limit) qs.set('limit', String(opts.limit))
    return req<AnomalyScanResult>(`/org?${qs.toString()}`)
  },
  async suppressAnomaly(assignment_id: string, anomaly_type: string, reason: string): Promise<void> {
    await req('/org', { method: 'POST', body: JSON.stringify({ action: 'suppress-anomaly', assignment_id, anomaly_type, reason }) })
  },
  async restoreAnomaly(assignment_id: string, anomaly_type: string): Promise<void> {
    await req('/org', { method: 'POST', body: JSON.stringify({ action: 'restore-anomaly', assignment_id, anomaly_type }) })
  },

  // ── ESG Data Standard ────────────────────────────────────────
  async disclosureStandard(framework_id?: string): Promise<DisclosureStandard[]> {
    const qs = framework_id ? `&framework_id=${encodeURIComponent(framework_id)}` : ''
    return req<DisclosureStandard[]>(`/org?view=disclosure-standard${qs}`)
  },
}

export interface DisclosureStandard {
  gri_code: string
  line_item: string
  section: string | null
  subsection: string | null
  unit: string | null
  framework_id: string
  definition: string | null
  calc_method: string | null
  cadence: 'daily' | 'monthly' | 'quarterly' | 'annual' | null
  data_owner_role: string | null
  reviewer_role: string | null
  approver_role: string | null
  cells: number
}

export type AnomalySeverity = 'info' | 'warn' | 'critical'
export type AnomalyType =
  | 'yoy_spike' | 'magnitude_jump' | 'z_score_outlier' | 'trend_break'
  | 'unit_change' | 'missing_evidence' | 'late_submission' | 'narrative_gap' | 'peer_deviation'
export type AnomalyScope = 'role' | 'mine' | 'all'

export interface Anomaly {
  id: string
  assignment_id: string
  entity_id: string
  entity_name: string
  gri_code: string
  line_item: string
  anomaly_type: AnomalyType
  severity: AnomalySeverity
  headline: string
  detail: string
  current: number | null
  prior: number | null
  prior_year: number | null
  delta_pct: number | null
  z_score: number | null
  status: string
  due_date: string | null
  last_updated: string | null
  suppressed?: { by: string; reason: string; at: string }
}

export interface AnomalyScanResult {
  anomalies: Anomaly[]
  total: number
  summary: {
    total: number
    critical: number
    warn: number
    info: number
    suppressed_total: number
    by_type: Record<AnomalyType, number>
  }
}

export interface HistoricalReference {
  meta: {
    id: string
    gri_code: string
    line_item: string
    unit: string | null
    section: string | null
    subsection: string | null
    reporting_scope: string | null
    target_fy2026: number | null
    definition?: string | null
    calc_method?: string | null
    cadence?: string | null
    data_owner_role?: string | null
    reviewer_role?: string | null
    approver_role?: string | null
  }
  history: Array<{ year: number; value: number; source_report: string | null; confidence_score: number | null }>
  peers: Array<{ entity_id: string; entity_name: string; value: number }>
}

export interface PublishedReport {
  id: string
  period_id: string
  framework_id: string
  version: number
  pdf_sha256: string
  pdf_size: number
  page_count: number | null
  is_draft: boolean
  verification_token: string
  published_at: string
  anchor_tip_hash: string | null
  anchored_at: string | null
  assurance_request_id: string | null
  published_by_name: string
  period_label: string
  period_year: number
  assurance_status: 'pending' | 'signed' | 'rejected' | 'withdrawn' | null
  auditor_firm: string | null
  signed_at: string | null
}

export interface PublishReportResult {
  ok: true
  id: string
  version: number
  pdf_sha256: string
  pdf_size: number
  verification_token: string
  verify_url: string
  anchored: boolean
  anchor_calendar: string | null
  is_draft: boolean
}

export interface AssuranceRequest {
  id: string
  period_id: string
  auditor_name: string | null
  auditor_email: string
  auditor_firm: string | null
  opinion_type: 'limited' | 'reasonable' | null
  isae_reference: string | null
  signed_by: string | null
  signed_at: string | null
  status: 'pending' | 'signed' | 'rejected' | 'withdrawn'
  requested_at: string
  has_upload_link: boolean
  statement_sha256: string | null
  notes: string | null
}

/** Public (no-auth) verification — for the /verify/:token page. */
export async function verifyReport(token: string): Promise<VerifyReportResponse> {
  const res = await fetch(`/api/org?view=verify-report&token=${encodeURIComponent(token)}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `API error ${res.status}`)
  }
  return res.json()
}

/** Auditor upload — no auth, uses one-shot upload_token. */
export async function submitAssuranceStatement(payload: {
  upload_token: string
  signed_by: string
  opinion_type: 'limited' | 'reasonable'
  auditor_firm?: string
  isae_reference?: string
  notes?: string
  statement_pdf_b64?: string
}): Promise<{ ok: boolean }> {
  const res = await fetch('/api/org', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'submit-assurance-statement', ...payload }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `API error ${res.status}`)
  }
  return res.json()
}

export interface VerifyReportResponse {
  verified: boolean
  organisation: string
  framework: string
  period: { label: string; year: number }
  published: { at: string; by: string; version: number; is_draft: boolean }
  pdf: { sha256: string; size: number; pages: number | null }
  anchor: { tip_hash: string; calendar: string; anchored_at: string; note: string } | null
  assurance: { firm: string | null; signed_by: string | null; signed_at: string; opinion: string | null; standard: string | null } | null
}
