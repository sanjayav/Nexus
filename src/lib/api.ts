const API_BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('aeiforo_token')
}

export function setToken(token: string) {
  localStorage.setItem('aeiforo_token', token)
}

export function clearToken() {
  localStorage.removeItem('aeiforo_token')
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers })

  if (res.status === 401 && !path.startsWith('/auth/')) {
    // Stale session — demo-mode fallback leaves a user in localStorage without a
    // server-issued JWT. Clear and bounce to /login so the user can re-authenticate
    // against the live backend.
    localStorage.removeItem('aeiforo_token')
    localStorage.removeItem('aeiforo_auth_user')
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.assign('/login?expired=1')
    }
    throw new Error('Session expired — please log in again')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `API error ${res.status}`)
  }

  return res.json()
}

// ── Auth ──────────────────────────────────
export interface AuthUser {
  id: string
  orgId: string
  email: string
  name: string
  avatarUrl?: string
  preferredFrameworkId?: string
  roles: string[]
  roleNames: string[]
  permissions: string[]
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

export const auth = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (data: { email: string; name: string; password: string; inviteToken?: string }) =>
    request<LoginResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  me: () => request<AuthUser>('/auth/me'),
}

// ── Users ─────────────────────────────────
export interface ApiUser {
  id: string
  email: string
  name: string
  avatar_url: string | null
  is_active: boolean
  created_at: string
  last_login: string | null
  roles: { id: string; name: string; slug: string }[]
}

export const users = {
  list: () => request<ApiUser[]>('/users'),

  create: (data: { email: string; name: string; password: string; roleId?: string }) =>
    request<ApiUser>('/users', { method: 'POST', body: JSON.stringify(data) }),

  invite: (email: string, roleId?: string) =>
    request<{ ok: boolean; inviteToken: string; email: string }>('/users', {
      method: 'POST',
      body: JSON.stringify({ email, roleId, mode: 'invite' }),
    }),

  update: (id: string, data: { name?: string; isActive?: boolean; roleIds?: string[] }) =>
    request<ApiUser>(`/users?id=${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),

  deactivate: (id: string) =>
    request<{ ok: boolean }>(`/users?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
}

// ── Roles ─────────────────────────────────
export interface ApiRole {
  id: string
  name: string
  slug: string
  description: string
  is_system: boolean
  created_at: string
  permissions: ApiPermission[]
  userCount: number
}

export interface ApiPermission {
  id: string
  resource: string
  action: string
  description: string
}

export const roles = {
  list: () => request<ApiRole[]>('/roles'),

  create: (data: { name: string; slug: string; description?: string; permissionIds?: string[] }) =>
    request<{ id: string }>('/roles', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: { name?: string; description?: string; permissionIds?: string[] }) =>
    request<{ ok: boolean }>(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/roles/${id}`, { method: 'DELETE' }),
}

// ── Permissions ───────────────────────────
export const permissions = {
  list: () => request<ApiPermission[]>('/permissions'),
}

// ── Setup ─────────────────────────────────
export const setup = {
  run: () => request<{ ok: boolean; message: string }>('/setup', { method: 'POST' }),
}

// ── Facilities ───────────────────────────
export interface ApiFacility {
  id: string
  name: string
  code: string | null
  location: string | null
  country: string
  type: string | null
  latitude: number | null
  longitude: number | null
  production_volume: number
  is_active: boolean
  created_at: string
}

export const facilities = {
  list: () => request<ApiFacility[]>('/facilities'),
  get: (id: string) => request<ApiFacility>(`/facilities/${id}`),
  create: (data: Partial<ApiFacility>) =>
    request<ApiFacility>('/facilities', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ApiFacility>) =>
    request<ApiFacility>(`/facilities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deactivate: (id: string) =>
    request<{ ok: boolean }>(`/facilities/${id}`, { method: 'DELETE' }),
}

// ── Activity Data ────────────────────────
export interface ApiActivityData {
  id: string
  facility_id: string
  facility_name?: string
  source_id: string | null
  period_year: number
  period_month: number
  scope: number
  category: string | null
  subcategory: string | null
  fuel_type: string | null
  activity_value: number
  activity_unit: string | null
  emission_factor: number | null
  ef_source: string | null
  co2e_tonnes: number
  co2: number
  ch4: number
  n2o: number
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'anchored'
  submitted_by: string | null
  approved_by: string | null
  submitted_at: string | null
  approved_at: string | null
  notes: string | null
  created_at: string
}

export const activityData = {
  list: (params?: { facility_id?: string; scope?: number; period_year?: number; period_month?: number; status?: string }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])).toString() : ''
    return request<ApiActivityData[]>(`/activity-data${qs}`)
  },
  get: (id: string) => request<ApiActivityData>(`/activity-data/${id}`),
  create: (data: Partial<ApiActivityData>) =>
    request<ApiActivityData>('/activity-data', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ApiActivityData>) =>
    request<ApiActivityData>(`/activity-data/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/activity-data/${id}`, { method: 'DELETE' }),
}

// ── Dashboard ────────────────────────────
export interface DashboardKpi {
  totalEmissions: number
  scope1: number
  scope2: number
  scope3: number
  facilityCount: number
  yoyChange: number
  intensity: number
  dataPointsVerified: number
}

export interface DashboardData {
  kpi: DashboardKpi
  scopeBreakdown: { name: string; value: number }[]
  monthlyTrend: { month: string; scope1: number; scope2: number; scope3: number }[]
  recentActivity: { id: string; action: string; resource_type: string; user_name: string; created_at: string }[]
  facilityPerformance: { name: string; scope1: number; scope2: number; scope3: number; total: number; intensity: number; yoyChange: number }[]
}

export const dashboard = {
  get: () => request<DashboardData>('/dashboard'),
}

// ── Workflow ─────────────────────────────
export interface ApiWorkflowTask {
  id: string
  type: string
  title: string
  description: string | null
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'anchored'
  facility_id: string | null
  facility_name: string | null
  data_type: string | null
  period: string | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  assigned_to: string | null
  assigned_to_name: string | null
  assigned_by: string | null
  submitted_by: string | null
  submitted_by_name: string | null
  due_date: string | null
  completed_at: string | null
  comments: { userId: string; userName: string; text: string; timestamp: string }[]
  created_at: string
}

export const workflow = {
  list: (params?: { status?: string; assigned_to?: string; type?: string; priority?: string }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])).toString() : ''
    return request<ApiWorkflowTask[]>(`/workflow${qs}`)
  },
  get: (id: string) => request<ApiWorkflowTask>(`/workflow/${id}`),
  create: (data: Partial<ApiWorkflowTask>) =>
    request<ApiWorkflowTask>('/workflow', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { status?: string; comment?: string; assigned_to?: string }) =>
    request<ApiWorkflowTask>(`/workflow/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
}

// ── Blockchain ───────────────────────────
export interface ApiBlockchainRecord {
  id: string
  record_type: string
  reference_id: string | null
  data_hash: string
  previous_hash: string | null
  block_number: number
  transaction_hash: string
  verifier_did: string | null
  facility_name: string | null
  event_type: string | null
  status: 'submitted' | 'confirmed' | 'anchored'
  metadata: Record<string, unknown>
  created_at: string
}

export interface ChainVerifyReport {
  verified: boolean
  totalRecords: number
  brokenAt: number | null
  brokenReason?: string
  tipHash: string | null
}

export interface ChainAnchor {
  id: string
  tip_hash: string
  tip_block_number: number
  anchor_method: string
  calendar_url: string | null
  receipt_size: number | null
  status: 'pending' | 'confirmed' | 'failed'
  error_message: string | null
  anchored_at: string
  confirmed_at: string | null
  bitcoin_block_height: number | null
}

export const blockchain = {
  list: (params?: { record_type?: string; status?: string; facility_name?: string }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])).toString() : ''
    return request<ApiBlockchainRecord[]>(`/blockchain${qs}`)
  },
  create: (data: { record_type: string; reference_id?: string; facility_name: string; event_type: string; metadata?: Record<string, unknown> }) =>
    request<ApiBlockchainRecord>('/blockchain', { method: 'POST', body: JSON.stringify(data) }),
  verify: () => request<ChainVerifyReport>('/blockchain?view=verify'),
  listAnchors: () => request<ChainAnchor[]>('/blockchain?view=anchors'),
  anchorTip: () => request<{ ok: boolean; anchor_id: string; tip_hash: string; tip_block: number; receipt_size: number; anchored_at: string; status: string; note?: string; alreadyAnchored?: boolean }>('/blockchain', { method: 'POST', body: JSON.stringify({ action: 'anchor-tip' }) }),
  anchorReceiptUrl: (anchorId: string) => `/api/blockchain?view=anchor-receipt&anchor_id=${encodeURIComponent(anchorId)}`,
}

// ── Reports ──────────────────────────────
export interface ApiReport {
  id: string
  framework_id: string | null
  framework_name: string | null
  title: string
  period: string | null
  status: 'draft' | 'in_review' | 'published' | 'archived'
  format: string
  pages: number
  assurance_status: string
  generated_by: string | null
  generated_by_name: string | null
  published_at: string | null
  file_url: string | null
  created_at: string
}

export const reports = {
  list: () => request<ApiReport[]>('/reports'),
  get: (id: string) => request<ApiReport>(`/reports/${id}`),
  create: (data: Partial<ApiReport>) =>
    request<ApiReport>('/reports', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ApiReport>) =>
    request<ApiReport>(`/reports/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
}

// ── Analytics ────────────────────────────
export interface ApiAnomaly {
  id: string
  facility_id: string | null
  facility_name: string | null
  type: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string | null
  scope: number | null
  metric: string | null
  expected_value: number | null
  actual_value: number | null
  deviation_pct: number | null
  status: 'open' | 'investigating' | 'resolved' | 'dismissed'
  detected_at: string
  resolved_at: string | null
  created_at: string
}

export interface AnalyticsData {
  anomalies: ApiAnomaly[]
  emissionsHistory: { year: number; scope1: number; scope2: number; scope3: number; total: number }[]
  facilityComparison: { facility_name: string; scope1: number; scope2: number; scope3: number; total: number }[]
}

export const analytics = {
  get: () => request<AnalyticsData>('/analytics'),
}

// ── Disclosures ──────────────────────────
export interface ApiDisclosureResponse {
  id: string
  framework_code: string
  disclosure_code: string
  period_year: number
  response_data: Record<string, unknown>
  status: 'not_started' | 'in_progress' | 'complete' | 'approved'
  updated_by: string | null
  updated_at: string | null
  created_at: string
}

export const disclosures = {
  list: (params?: { framework_code?: string; period_year?: number; status?: string }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])).toString() : ''
    return request<ApiDisclosureResponse[]>(`/disclosures${qs}`)
  },
  upsert: (data: { framework_code: string; disclosure_code: string; period_year: number; response_data: Record<string, unknown>; status: string }) =>
    request<ApiDisclosureResponse>('/disclosures', { method: 'POST', body: JSON.stringify(data) }),
}

// ── Nexus (SRD v2.0 action/view dispatchers) ─────────────

export interface NexusQuestionnaireItem {
  id: string
  section: string
  subsection: string
  gri_code: string
  line_item: string
  unit: string | null
  scope_split: string | null
  default_workflow_role: 'AUTO' | 'FM' | 'SO' | 'TL'
  entry_mode_default: 'Manual' | 'Calculator' | 'Connector'
  target_fy2026: number | null
  footnote_refs: string[]
  reporting_scope: 'group' | 'jv'
}

export interface NexusHistoricalPoint {
  year: number
  scope_key: string | null
  value: number
  source_report: string
  confidence_score: number
}

export interface NexusDataValue {
  id: string
  questionnaire_item_id: string
  reporting_year_id: string
  facility_id: string | null
  scope_key: string | null
  value: number | null
  unit: string | null
  entry_mode: 'Manual' | 'Calculator' | 'Connector' | null
  status: 'not_started' | 'draft' | 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'published'
  value_hash: string | null
  comment: string | null
  entered_by: string | null
  entered_at: string | null
  submitted_at: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  approved_by: string | null
  approved_at: string | null
  // joined from questionnaire_item when returned by queue views
  line_item?: string
  gri_code?: string
  section?: string
}

export interface NexusEvidence {
  id: string
  filename: string
  file_type: string | null
  file_size: number
  file_hash: string
  uploaded_at: string
  uploaded_by_name: string | null
}

export interface NexusAuditEvent {
  id: string
  data_value_id: string
  event_type: 'entered' | 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'published' | 'assigned' | 'overridden'
  actor_user_id: string | null
  actor_name: string | null
  actor_email: string | null
  actor_platform_role: string | null
  actor_workflow_role: string | null
  timestamp: string
  previous_hash: string
  new_hash: string
  comment: string | null
}

export const nexus = {
  // Questionnaire tree — scoped to a framework. Defaults to GRI 305 (Phase 1).
  tree: (frameworkId: string = 'gri') =>
    request<NexusQuestionnaireItem[]>(`/workflow?view=tree&framework_id=${encodeURIComponent(frameworkId)}`),

  // Historical 4-year reference for a specific question
  historical: (questionId: string) =>
    request<NexusHistoricalPoint[]>(`/workflow?view=historical&question_id=${encodeURIComponent(questionId)}`),

  // Queues
  reviewQueue: () => request<NexusDataValue[]>('/workflow?view=review-queue'),
  approvalQueue: () => request<NexusDataValue[]>('/workflow?view=approval-queue'),

  // Actions
  enterValue: (body: {
    question_id: string
    reporting_year_id: string
    facility_id?: string | null
    scope_key?: string | null
    value: number
    unit?: string
    mode?: 'Manual' | 'Calculator' | 'Connector'
    comment?: string
  }) =>
    request<NexusDataValue & { value_hash: string }>('/workflow', {
      method: 'POST',
      body: JSON.stringify({ action: 'enter-value', ...body }),
    }),

  submit: (data_value_id: string) =>
    request<{ ok: true; value_hash: string }>('/workflow', {
      method: 'POST',
      body: JSON.stringify({ action: 'submit', data_value_id }),
    }),

  review: (data_value_id: string, decision: 'pass' | 'reject', comment?: string) =>
    request<{ ok: true; new_status: string; value_hash: string }>('/workflow', {
      method: 'POST',
      body: JSON.stringify({ action: 'review', data_value_id, decision, comment }),
    }),

  approve: (data_value_id: string, decision: 'approve' | 'reject', comment?: string) =>
    request<{ ok: true; new_status: string; value_hash: string }>('/workflow', {
      method: 'POST',
      body: JSON.stringify({ action: 'approve', data_value_id, decision, comment }),
    }),

  publish: (reporting_year_id: string) =>
    request<{ ok: true; publish_hash: string }>('/workflow', {
      method: 'POST',
      body: JSON.stringify({ action: 'publish', reporting_year_id }),
    }),

  listEvidence: (data_value_id: string) =>
    request<NexusEvidence[]>(`/workflow?view=evidence&data_value_id=${encodeURIComponent(data_value_id)}`),

  uploadEvidence: async (data_value_id: string, file: File): Promise<NexusEvidence> => {
    const content_base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',', 2)[1] ?? '')
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
    return request<NexusEvidence>('/workflow', {
      method: 'POST',
      body: JSON.stringify({
        action: 'upload-evidence',
        data_value_id,
        filename: file.name,
        file_type: file.type || null,
        size: file.size,
        content_base64,
      }),
    })
  },

  removeEvidence: (evidence_id: string) =>
    request<{ ok: true }>('/workflow', {
      method: 'POST',
      body: JSON.stringify({ action: 'remove-evidence', evidence_id }),
    }),

  evidenceDownloadUrl: (evidence_id: string) =>
    `/api/workflow?view=evidence-file&evidence_id=${encodeURIComponent(evidence_id)}`,

  connectorPull: (body: { question_id: string; reporting_year_id: string; connector: string; facility_id?: string | null }) =>
    request<NexusDataValue & { value_hash: string; receipt_hash: string }>('/workflow', {
      method: 'POST',
      body: JSON.stringify({ action: 'connector-pull', ...body }),
    }),

  // Blockchain trail
  trail: (data_value_id: string) =>
    request<NexusAuditEvent[]>(`/blockchain?view=trail&data_value_id=${encodeURIComponent(data_value_id)}`),

  hash: (data_value_id: string) =>
    request<{ value_hash: string; status: string }>(`/blockchain?view=hash&data_value_id=${encodeURIComponent(data_value_id)}`),
}

// ── Audit Log ────────────────────────────
export interface ApiAuditEntry {
  id: string
  user_id: string | null
  user_name: string | null
  action: string
  resource_type: string
  resource_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

export const auditLog = {
  list: (params?: { resource_type?: string; user_id?: string }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])).toString() : ''
    return request<ApiAuditEntry[]>(`/audit${qs}`)
  },
}
