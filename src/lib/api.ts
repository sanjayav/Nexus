import { captureError } from './sentry'

const API_BASE = '/api'

/**
 * Typed error thrown by `request()` when the API returns a non-2xx response.
 *
 * `reason` is set to `'unconfigured'` when the backend returns 503 with a
 * body like `{ error: 'XXX_API_KEY not configured' }`. UI consumers should
 * check this flag and render an integration-gated message (e.g. "Ask an
 * admin to set ANTHROPIC_API_KEY") instead of a raw stack trace.
 */
export class ApiError extends Error {
  status: number
  reason?: 'unconfigured'
  body?: unknown
  constructor(message: string, status: number, opts: { reason?: 'unconfigured'; body?: unknown } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.reason = opts.reason
    this.body = opts.body
  }
}

/** True when the thrown error is an integration-not-configured 503. */
export function isUnconfiguredError(err: unknown): err is ApiError {
  return err instanceof ApiError && err.reason === 'unconfigured'
}

// NOTE: localStorage keys keep the `aeiforo_*` prefix for backwards compatibility.
// The product is rebranded to "Nexus", but renaming these keys would log every
// existing user out on first deploy. Brand change is display-only.
function getToken(): string | null {
  return localStorage.getItem('aeiforo_token')
}

export function setToken(token: string) {
  localStorage.setItem('aeiforo_token', token)
}

export function clearToken() {
  localStorage.removeItem('aeiforo_token')
}

/**
 * Wrap `fetch` with a 30s timeout and a single retry on transient network
 * errors (offline / DNS blip). Aborts after the timeout — callers see a
 * friendly "Request timed out" Error rather than a hanging promise. The
 * test suite mocks `fetch` via msw, so retry only triggers on the real
 * `TypeError: Failed to fetch` shape (mocked responses never throw that).
 */
async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  retries = 1,
): Promise<Response> {
  try {
    // `AbortSignal.timeout` lands a TimeoutError DOMException; supported in
    // node 20+ and all evergreen browsers we target.
    return await fetch(input, { ...init, signal: AbortSignal.timeout(30_000) })
  } catch (err) {
    if (
      retries > 0 &&
      err instanceof TypeError &&
      /fetch|network/i.test(err.message)
    ) {
      await new Promise(r => setTimeout(r, 500))
      return fetchWithRetry(input, init, retries - 1)
    }
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new Error('Request timed out after 30 seconds')
    }
    if (err instanceof TypeError && /fetch|network/i.test(err.message)) {
      throw new Error('Network error — check your connection')
    }
    throw err
  }
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetchWithRetry(`${API_BASE}${path}`, { ...opts, headers })

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
    const body = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
    const message = body.error || `API error ${res.status}`
    // Detect "integration not configured" 503s so consumers can render a
    // specific call-to-action ("Ask your admin to set ANTHROPIC_API_KEY")
    // instead of a generic API failure. Match both explicit shapes and the
    // free-form "XXX_API_KEY not configured" pattern we use in api/ handlers.
    const isUnconfigured =
      res.status === 503 &&
      typeof body.error === 'string' &&
      (/not configured/i.test(body.error) || /_API_KEY/i.test(body.error))
    const err = new ApiError(message, res.status, {
      reason: isUnconfigured ? 'unconfigured' : undefined,
      body,
    })
    // Forward non-auth backend failures to Sentry (no-op when DSN unset).
    // 401 already gets its own session-expiry handler above.
    // Skip "unconfigured" 503s — they're expected operator misconfiguration,
    // not engineering bugs that need a Sentry issue.
    if (res.status !== 401 && !isUnconfigured) {
      captureError(err, { path, status: res.status, method: opts.method ?? 'GET' })
    }
    throw err
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

export interface SsoDiscoverResponse {
  ssoAvailable: boolean
  connectionId?: string
  providerName?: string
}

export type LoginOrMfaResponse =
  | (LoginResponse & { mfaRequired?: false })
  | { mfaRequired: true; tempToken: string }

export interface MfaEnrollResponse {
  otpauthUri: string
  secret: string
  recoveryCodes: string[]
}

export interface MfaStatusResponse {
  enrolled: boolean
  enabled: boolean
  lastUsedAt: string | null
}

export const auth = {
  login: (email: string, password: string) =>
    request<LoginOrMfaResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  ssoDiscover: (email: string) =>
    request<SsoDiscoverResponse>(`/auth/sso/discover?email=${encodeURIComponent(email)}`),

  ssoInitiate: (body: { email?: string; connectionId?: string; organisationId?: string }) =>
    request<{ authorizationUrl: string }>('/auth/sso/initiate', { method: 'POST', body: JSON.stringify(body) }),

  register: (data: { email: string; name: string; password: string; workspaceName?: string; inviteToken?: string }) =>
    request<LoginResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  me: () => request<AuthUser>('/auth/me'),

  // ── Password reset ──
  forgotPassword: (email: string) =>
    request<{ ok: true }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (token: string, password: string) =>
    request<{ ok: true }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),

  // ── TOTP MFA ──
  mfaStatus: () => request<MfaStatusResponse>('/auth/mfa/status'),

  mfaEnroll: () => request<MfaEnrollResponse>('/auth/mfa/enroll', { method: 'POST' }),

  mfaVerifyEnroll: (code: string) =>
    request<{ ok: true }>('/auth/mfa/verify-enroll', { method: 'POST', body: JSON.stringify({ code }) }),

  mfaVerify: (tempToken: string, code: string) =>
    request<LoginResponse & { usedRecoveryCode?: boolean }>('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ tempToken, code }),
    }),

  mfaDisable: (password: string) =>
    request<{ ok: true }>('/auth/mfa/disable', { method: 'POST', body: JSON.stringify({ password }) }),
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
    request<{
      ok: boolean
      inviteToken: string
      email: string
      /** Only set when the email service is not configured — surface this to the
       *  inviter so they can share the link manually. */
      warning?: string
      /** Always set so the caller can show a copy-link affordance. */
      inviteUrl?: string
    }>('/users', {
      method: 'POST',
      body: JSON.stringify({ email, roleId, mode: 'invite' }),
    }),

  update: (id: string, data: { name?: string; isActive?: boolean; roleIds?: string[] }) =>
    request<ApiUser>(`/users?id=${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),

  deactivate: (id: string) =>
    request<{ ok: boolean }>(`/users?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // ── Per-user notification preferences (self-edit) ────────────
  preferences: {
    get: () => request<UserPreferences>('/users?action=preferences'),
    update: (patch: Partial<Omit<UserPreferences, 'updated_at'>>) =>
      request<UserPreferences>('/users?action=preferences', {
        method: 'POST',
        body: JSON.stringify(patch),
      }),
  },
}

export interface UserPreferences {
  email_on_assignment: boolean
  email_on_review_request: boolean
  email_on_anomaly: boolean
  digest_frequency: 'none' | 'daily' | 'weekly'
  updated_at: string | null
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

/**
 * Dedupe questionnaire-item rows by their canonical disclosure key. The DB
 * holds duplicate rows (the seed has been re-run several times without
 * cleanup) — same gri_code + line_item + scope_split + reporting_scope +
 * unit, different UUIDs. We pick the first row per key and drop the rest so
 * every catalogue view (Calculators, Data entry picker, Workflow, Content
 * index, etc.) shows each disclosure exactly once.
 *
 * Existing assignments that reference one of the dropped IDs still work —
 * the assignment row carries its own questionnaire_item_id, and the entry
 * page looks up by ID, not by listing the tree.
 */
function dedupeQuestionnaireItems(items: NexusQuestionnaireItem[]): NexusQuestionnaireItem[] {
  const seen = new Set<string>()
  const out: NexusQuestionnaireItem[] = []
  for (const it of items) {
    const key = [
      it.gri_code, it.line_item, it.scope_split ?? '', it.reporting_scope ?? '', it.unit ?? '',
    ].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(it)
  }
  return out
}

export const nexus = {
  // Questionnaire tree — scoped to a framework. Defaults to GRI 305 (Phase 1).
  tree: async (frameworkId: string = 'gri') => {
    const raw = await request<NexusQuestionnaireItem[]>(
      `/workflow?view=tree&framework_id=${encodeURIComponent(frameworkId)}`,
    )
    return dedupeQuestionnaireItems(raw)
  },

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

// ── Concept mappings (linked-data propagation) ──────────────
export interface ConceptPeer {
  id: string
  concept_key: string
  framework_id: string
  questionnaire_item_id: string
  unit_conversion: number
  gri_code: string | null
  line_item: string | null
  unit: string | null
  section: string | null
}

export interface ConceptMappingsResp {
  concept_key: string | null
  mappings: ConceptPeer[]
}

export const conceptMappings = {
  forQuestion: (questionnaire_item_id: string) =>
    request<ConceptMappingsResp>(`/concept-mappings?questionnaire_item_id=${encodeURIComponent(questionnaire_item_id)}`),
  forConcept: (concept_key: string) =>
    request<ConceptMappingsResp>(`/concept-mappings?concept_key=${encodeURIComponent(concept_key)}`),
  override: (data_value_id: string) =>
    request<{ ok: true; id: string; is_overridden: boolean; derived_from: string | null }>('/concept-mappings', {
      method: 'POST',
      body: JSON.stringify({ action: 'override', data_value_id }),
    }),
}

// ── AI Drafting ──────────────────────────
export interface AiDraftUsage {
  tokensIn?: number
  tokensOut?: number
  cached?: number
}

export interface AiDraftResponse {
  text: string
  usage: AiDraftUsage
}

export interface AiExtractionResult {
  /** UUID of the persisted `ai_extractions` row. Null when persistence failed
   *  but the inference itself succeeded — clients should still display the
   *  result, just skip the accept call. */
  id: string | null
  value: number
  unit: string | null
  period: string | null
  supplier: string | null
  confidence: number
  reasoning: string
  additionalNotes: string | null
}

export interface AiExtractionResponse {
  extraction: AiExtractionResult
  usage: AiDraftUsage
}

export interface AiExtractRequest {
  evidenceId: string
  questionnaireItemId?: string
  expectedUnit?: string
  expectedPeriod?: string
  lineItemHint?: string
}

// ── AI Emission-Factor matcher ────────────
export interface AiEfRow {
  id: string
  scope: number
  category: string
  subcategory: string | null
  fuel_or_activity: string
  region: string
  unit: string
  co2e_per_unit: number | string
  co2_per_unit: number | string | null
  ch4_per_unit: number | string | null
  n2o_per_unit: number | string | null
  source: string
  source_version: string | null
  valid_from: string
  valid_to: string | null
  notes: string | null
}

export interface AiEfAlternate {
  ef: AiEfRow
  confidence: number
  reasoning: string
}

export interface AiEfMatchResponse {
  match: {
    id: string | null
    ef: AiEfRow
    confidence: number
    reasoning: string
    alternates: AiEfAlternate[]
    overallNotes: string | null
  }
  usage: AiDraftUsage
}

export interface AiEfMatchRequest {
  vendorName: string
  spendCategory?: string
  region?: 'UK' | 'US' | 'EU' | 'GLOBAL' | 'IN' | 'CN' | 'JP' | 'AU' | 'CA' | 'DE' | 'FR'
  spendAmount?: number
  spendCurrency?: string
  scope?: 1 | 2 | 3
  category?: string
}

export const ai = {
  draft: (data: { framework: string; section: string; tone?: string }) =>
    request<AiDraftResponse>('/ai/draft', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  extractEvidence: (data: AiExtractRequest) =>
    request<AiExtractionResponse>('/ai/extract-evidence', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  acceptExtraction: (data: { extractionId: string; dataValueId: string }) =>
    request<{ ok: true }>('/ai/accept-extraction', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  matchEf: (data: AiEfMatchRequest) =>
    request<AiEfMatchResponse>('/ai/match-ef', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  acceptEfMatch: (matchId: string) =>
    request<{ ok: true; id: string; acceptedAt: string }>('/ai/accept-ef-match', {
      method: 'POST',
      body: JSON.stringify({ matchId }),
    }),
  narrateAnomaly: (anomalyId: string, regenerate?: boolean) =>
    request<AiNarrateAnomalyResponse>('/ai/narrate-anomaly', {
      method: 'POST',
      body: JSON.stringify({ anomalyId, regenerate: regenerate ?? false }),
    }),
  listAnomaliesForNarration: () =>
    request<{ anomalies: AiAnomalyListItem[] }>('/ai/narrate-anomaly'),
  analyzeGaps: (data: AiAnalyzeGapsRequest) =>
    request<AiAnalyzeGapsResponse>('/ai/analyze-gaps', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// ── AI Gap Analysis (Workiva "ESRS Intelligence" feature) ────────
export interface AiAnalyzeGapsRequest {
  frameworkId: string
  reportingYear: number
  question: string
  scope?: 'gaps' | 'coverage' | 'quality' | 'custom'
  regenerate?: boolean
}

export interface AiGapMissingItem {
  code: string
  lineItem: string
  why_critical: string
  estimated_effort: 'low' | 'medium' | 'high'
  suggested_owner_role?: string
}

export interface AiGapQualityIssue {
  code: string
  issue: string
}

export interface AiGapAnalysis {
  summary: string
  missingCount: number
  missingItems: AiGapMissingItem[]
  qualityIssues: AiGapQualityIssue[]
  recommendedNextSteps: string[]
}

export interface AiAnalyzeGapsResponse {
  id?: string | null
  analysis: AiGapAnalysis
  cached: boolean
  generatedAt: string
  coverage?: { required: number; filled: number; inProgress: number; missing: number }
  usage: AiDraftUsage
}

// ── XBRL footnotes (Fact Details panel) ─────────────────────────
export interface XbrlFootnote {
  id: string
  data_value_id: string
  footnote_text: string
  created_by: string | null
  created_at: string
  author_name?: string | null
}

export const footnotes = {
  list: (dataValueId: string) =>
    request<{ footnotes: XbrlFootnote[] }>(`/footnotes?data_value_id=${encodeURIComponent(dataValueId)}`),
  create: (dataValueId: string, footnoteText: string) =>
    request<{ footnote: XbrlFootnote }>('/footnotes', {
      method: 'POST',
      body: JSON.stringify({ data_value_id: dataValueId, footnote_text: footnoteText }),
    }),
  remove: (id: string) =>
    request<{ ok: true; id: string }>(`/footnotes?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
}

export interface AiNarrateAnomalyResponse {
  narrative: string
  generatedAt: string | null
  cached: boolean
  usage: AiDraftUsage
}

export interface AiAnomalyListItem {
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
  ai_narrative: string | null
  ai_narrative_generated_at: string | null
}

// ── SCIM tokens ──────────────────────────
export interface ScimToken {
  id: string
  prefix: string
  defaultRoleSlug: string
  isActive: boolean
  createdAt: string
  lastUsedAt: string | null
}

export interface ScimTokenCreated extends ScimToken {
  token: string
  warning: string
}

export const scim = {
  list: () => request<ScimToken[]>('/admin/scim-tokens'),
  create: (defaultRoleSlug?: string) =>
    request<ScimTokenCreated>('/admin/scim-tokens', {
      method: 'POST',
      body: JSON.stringify({ defaultRoleSlug }),
    }),
  revoke: (id: string) =>
    request<{ ok: boolean }>(`/admin/scim-tokens?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
}

// ── Programmatic API keys ────────────────
export interface ApiKey {
  id: string
  name: string
  prefix: string
  scopes: string[]
  expiresAt: string | null
  lastUsedAt: string | null
  isActive: boolean
  createdAt: string
}

export interface ApiKeyListResponse {
  standardScopes: string[]
  keys: ApiKey[]
}

export interface ApiKeyCreated {
  token: string
  warning: string
  key: ApiKey
}

export const apiKeys = {
  list: () => request<ApiKeyListResponse>('/admin/api-keys'),
  create: (data: { name: string; scopes: string[]; expiresInDays?: number }) =>
    request<ApiKeyCreated>('/admin/api-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  revoke: (id: string) =>
    request<{ ok: boolean }>(`/admin/api-keys?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
}

// ── Health / system status ───────────────
export interface HealthResponse {
  ok: boolean
  timestamp: string
  version: string
  region: string
  db: { ok: boolean; latencyMs?: number; error?: string }
  integrations: {
    email:      { configured: boolean; provider: 'resend' | null }
    sso:        { configured: boolean; provider: 'workos' | null }
    ai:         { configured: boolean; provider: 'claude' | null }
    realtime:   { configured: boolean; provider: 'liveblocks' | null }
    sentry:     { configured: boolean }
    euRegion:   { configured: boolean }
    apacRegion: { configured: boolean }
  }
}

export const system = {
  /** Public — no auth header. Used by the admin system-status page. */
  health: async (): Promise<HealthResponse> => {
    const res = await fetch('/api/health')
    if (!res.ok && res.status !== 503) throw new Error(`health probe failed: ${res.status}`)
    return res.json()
  },
}

// ── ERP Connectors ───────────────────────
export interface ConnectorTemplate {
  id: string
  name: string
  source: 'sap_s4hana' | 'netsuite' | 'snowflake' | 'generic_csv'
  description: string | null
  scope: number | null
  category: string | null
  mapping: Record<string, string>
  required_columns: string[]
  optional_columns: string[]
  emission_factor_lookup: Record<string, unknown> | null
  is_system: boolean
  created_at: string
}

export interface ConnectorImportResult {
  ok: boolean
  importId: string
  total: number
  imported: number
  failed: number
  errors: Array<{ row: number; error: string }>
}

export interface ConnectorImportSummary {
  id: string
  template_id: string | null
  template_name: string | null
  template_source: string | null
  file_name: string
  rows_total: number
  rows_imported: number
  rows_failed: number
  status: 'pending' | 'processing' | 'complete' | 'failed'
  errors: Array<{ row: number; error: string }>
  imported_by: string | null
  imported_by_name: string | null
  created_at: string
}

export const connectors = {
  templates: (params?: { source?: string; scope?: number }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])).toString() : ''
    return request<ConnectorTemplate[]>(`/connectors/templates${qs}`)
  },
  import: (data: { templateId: string; fileName: string; rows: Record<string, string>[]; mappingOverride?: Record<string, string> }) =>
    request<ConnectorImportResult>('/connectors/import', { method: 'POST', body: JSON.stringify(data) }),
  imports: () => request<ConnectorImportSummary[]>('/connectors/imports'),
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

export interface AuditExplorerParams {
  from?: string
  to?: string
  actorId?: string
  actions?: string[]
  resourceTypes?: string[]
  limit?: number
  offset?: number
}
export interface AuditExplorerEntry {
  id: string
  user_id: string | null
  user_name: string | null
  user_email: string | null
  action: string
  resource_type: string
  resource_id: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}
export interface AuditExplorerResponse {
  rows: AuditExplorerEntry[]
  total: number
  limit: number
  offset: number
}

function auditQs(params?: AuditExplorerParams): string {
  if (!params) return ''
  const p = new URLSearchParams()
  if (params.from) p.set('from', params.from)
  if (params.to) p.set('to', params.to)
  if (params.actorId) p.set('actorId', params.actorId)
  if (params.actions && params.actions.length) p.set('actions', params.actions.join(','))
  if (params.resourceTypes && params.resourceTypes.length) p.set('resourceTypes', params.resourceTypes.join(','))
  if (params.limit != null) p.set('limit', String(params.limit))
  if (params.offset != null) p.set('offset', String(params.offset))
  const s = p.toString()
  return s ? '?' + s : ''
}

export const auditLog = {
  // Legacy shape — narrow list filter, used by dashboard/anomaly screens.
  list: (params?: { resource_type?: string; user_id?: string }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])).toString() : ''
    return request<ApiAuditEntry[]>(`/audit${qs}`)
  },
  // Full explorer — paginated, multi-filter. Used by /admin/audit.
  explore: (params?: AuditExplorerParams) =>
    request<AuditExplorerResponse>(`/audit${auditQs(params)}`),
}

/**
 * CSV download for the audit explorer. Re-uses the bearer-auth `request`
 * pipeline via fetch directly (since `request` JSON-decodes the response).
 */
export async function downloadAuditCsv(params?: AuditExplorerParams): Promise<Blob> {
  const token = localStorage.getItem('aeiforo_token')
  const qs = auditQs(params)
  const sep = qs ? '&' : '?'
  const url = `/api/audit${qs}${sep}format=csv`
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`Audit CSV export failed (${res.status})`)
  return res.blob()
}

// ── PCAF Financed Emissions ──────────────
export type PcafAssetClass =
  | 'listed_equity'
  | 'corporate_bond'
  | 'business_loan'
  | 'unlisted_equity'
  | 'project_finance'
  | 'commercial_real_estate'
  | 'mortgage'
  | 'motor_vehicle_loan'
  | 'sovereign_debt'

export interface PcafCalculateResponse {
  attributionFactor: number
  financedScope1?: number
  financedScope2?: number
  financedScope3?: number
  financedTotal: number
  dataQualityScore: 1 | 2 | 3 | 4 | 5
  rationale: string
  warnings: string[]
  methodologyUrl: string
}

export interface PcafAsset {
  id: string
  org_id: string
  reporting_year: number
  asset_class: PcafAssetClass
  counterparty_name: string
  counterparty_sector: string | null
  counterparty_country: string | null
  outstanding_amount: number | string
  reporting_currency: string
  total_value: number | string | null
  total_value_basis: string | null
  attribution_factor: number | string
  reported_emissions_scope1: number | string | null
  reported_emissions_scope2: number | string | null
  reported_emissions_scope3: number | string | null
  estimated_emissions: number | string | null
  emissions_basis: 'reported' | 'physical_activity_estimate' | 'economic_estimate' | null
  financed_emissions_scope1: number | string | null
  financed_emissions_scope2: number | string | null
  financed_emissions_scope3: number | string | null
  financed_emissions_total: number | string
  data_quality_score: number
  data_quality_rationale: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface PcafPortfolioSummary {
  reporting_year: number
  total_financed_emissions: number
  total_financed_scope1: number
  total_financed_scope2: number
  total_financed_scope3: number
  total_outstanding: number
  asset_count: number
  weighted_data_quality: number
  coverage_reported_pct: number
  coverage_estimated_pct: number
  by_asset_class: Array<{
    asset_class: PcafAssetClass
    asset_count: number
    outstanding_total: number
    financed_total: number
    financed_scope1: number
    financed_scope2: number
    financed_scope3: number
    weighted_dq: number
  }>
  top_emitters: Array<{
    id: string
    counterparty_name: string
    asset_class: PcafAssetClass
    outstanding_amount: number
    financed_emissions_total: number
    data_quality_score: number
  }>
}

export interface PcafCreateAssetBody {
  reportingYear: number
  assetClass: PcafAssetClass
  counterpartyName: string
  counterpartySector?: string
  counterpartyCountry?: string
  outstandingAmount: number
  reportingCurrency?: string
  totalValue?: number
  totalValueBasis?: string
  attributionFactor: number
  reportedEmissionsScope1?: number
  reportedEmissionsScope2?: number
  reportedEmissionsScope3?: number
  estimatedEmissions?: number
  emissionsBasis?: 'reported' | 'physical_activity_estimate' | 'economic_estimate'
  financedEmissionsScope1?: number
  financedEmissionsScope2?: number
  financedEmissionsScope3?: number
  financedEmissionsTotal: number
  dataQualityScore: 1 | 2 | 3 | 4 | 5
  dataQualityRationale?: string
  notes?: string
}

export const pcaf = {
  calculate: (body: { assetClass: PcafAssetClass; inputs: Record<string, unknown>; reportingYear: number }) =>
    request<PcafCalculateResponse>('/pcaf/calculate', { method: 'POST', body: JSON.stringify(body) }),
  listAssets: (year: number, assetClass?: PcafAssetClass) => {
    const qs = new URLSearchParams({ year: String(year) })
    if (assetClass) qs.set('asset_class', assetClass)
    return request<PcafAsset[]>(`/pcaf/assets?${qs.toString()}`)
  },
  createAsset: (body: PcafCreateAssetBody) =>
    request<PcafAsset>('/pcaf/assets', { method: 'POST', body: JSON.stringify(body) }),
  deleteAsset: (id: string) =>
    request<{ ok: boolean; id: string }>(`/pcaf/assets?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
  summary: (year: number) =>
    request<PcafPortfolioSummary>(`/pcaf/portfolio-summary?year=${year}`),
  syncToScope3: (body: { reportingYear: number; facilityId: string; periodMonth?: number }) =>
    request<{
      ok: true
      activity_data_id: string
      asset_count: number
      total_financed_emissions: number
      weighted_data_quality: number
    }>('/pcaf/sync-scope3', { method: 'POST', body: JSON.stringify(body) }),
}
