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
    request<ApiUser>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deactivate: (id: string) =>
    request<{ ok: boolean }>(`/users/${id}`, { method: 'DELETE' }),
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

export const blockchain = {
  list: (params?: { record_type?: string; status?: string; facility_name?: string }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])).toString() : ''
    return request<ApiBlockchainRecord[]>(`/blockchain${qs}`)
  },
  create: (data: { record_type: string; reference_id?: string; facility_name: string; event_type: string; metadata?: Record<string, unknown> }) =>
    request<ApiBlockchainRecord>('/blockchain', { method: 'POST', body: JSON.stringify(data) }),
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
