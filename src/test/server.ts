import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const ADMIN_USER = {
  id: 'u1',
  orgId: 'o1',
  email: 'admin@aeiforo.com',
  name: 'Test Admin',
  roles: ['platform_admin'],
  roleNames: ['Platform Admin'],
  permissions: ['admin.org', 'admin.users', 'dashboard.view'],
}

export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    if (body?.email === 'admin@aeiforo.com' && body?.password === 'demo2026') {
      return HttpResponse.json({ token: 'fake-jwt', user: ADMIN_USER })
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }),
  http.post('/api/auth/register', async ({ request }) => {
    const body = await request.json() as { email: string }
    return HttpResponse.json({ token: 'fake-jwt', user: { ...ADMIN_USER, email: body.email } })
  }),
  http.get('/api/auth/sso/discover', () => HttpResponse.json({ ssoAvailable: false })),
  http.get('/api/auth/me', () => HttpResponse.json(ADMIN_USER)),
  http.get('/api/health', () =>
    HttpResponse.json({ ok: true, db: { ok: true }, integrations: {} })),
  http.get('/api/notifications', () =>
    HttpResponse.json({
      notifications: [
        { id: 'n1', kind: 'info', title: 'Welcome', body: 'Hi', read_at: null, created_at: new Date().toISOString() },
        { id: 'n2', kind: 'info', title: 'Reminder', body: 'Due', read_at: null, created_at: new Date().toISOString() },
        { id: 'n3', kind: 'info', title: 'Done', body: 'Approved', read_at: new Date().toISOString(), created_at: new Date().toISOString() },
      ],
      unreadCount: 2,
      total: 3,
    })),
  http.get('/api/notifications/unread-count', () =>
    HttpResponse.json({ unreadCount: 2 })),
  http.post('/api/notifications/read-all', () => HttpResponse.json({ ok: true })),
  http.post('/api/notifications/:id/read', () => HttpResponse.json({ ok: true })),
  http.get('/api/org', ({ request }) => {
    const url = new URL(request.url)
    const view = url.searchParams.get('view')
    if (view === 'assignments' || view === 'my-assignments') return HttpResponse.json([])
    if (view === 'comments') return HttpResponse.json([])
    if (view === 'members') return HttpResponse.json([])
    if (view === 'entities') return HttpResponse.json([])
    if (view === 'enabled-frameworks') return HttpResponse.json([])
    return HttpResponse.json({ entities: [], members: [] })
  }),
  // Generic /api/org POST sink — comment add/resolve/reopen actions in
  // component tests don't hit a real DB.
  http.post('/api/org', async ({ request }) => {
    let body: { action?: string; body?: string; assignment_id?: string } = {}
    try { body = await request.json() as typeof body } catch { /* empty */ }
    if (body.action === 'add-comment') {
      return HttpResponse.json({
        id: `c-${Date.now()}`,
        assignment_id: body.assignment_id ?? 'a1',
        author_user_id: 'u1',
        author_name: 'Test Admin',
        author_email: 'admin@aeiforo.com',
        body: body.body ?? '',
        kind: 'comment',
        parent_comment_id: null,
        mentioned_user_ids: [],
        is_request_for_review: false,
        resolved_at: null,
        resolved_by: null,
        created_at: new Date().toISOString(),
      }, { status: 201 })
    }
    return HttpResponse.json({ ok: true })
  }),
  http.get('/api/dashboard', () => HttpResponse.json({ kpis: {}, charts: {} })),

  // Workflow tree + audit trail — used by DisclosureEditor + DataEntry.
  http.get('/api/workflow', ({ request }) => {
    const url = new URL(request.url)
    const view = url.searchParams.get('view')
    if (view === 'tree') {
      return HttpResponse.json([
        {
          id: 'qi-1',
          section: 'Climate Change',
          subsection: 'E1-6 Gross GHG Emissions',
          gri_code: 'E1-6',
          line_item: 'Gross Scope 1 GHG emissions',
          unit: 'tCO2e',
          scope_split: 'scope_1',
          default_workflow_role: 'FM',
          entry_mode_default: 'Manual',
          target_fy2026: null,
          footnote_refs: [],
          reporting_scope: 'group',
        },
        {
          id: 'qi-2',
          section: 'Climate Change',
          subsection: 'E1-6 Gross GHG Emissions',
          gri_code: 'E1-6',
          line_item: 'Gross Scope 2 GHG emissions (location-based)',
          unit: 'tCO2e',
          scope_split: 'scope_2_loc',
          default_workflow_role: 'FM',
          entry_mode_default: 'Manual',
          target_fy2026: null,
          footnote_refs: [],
          reporting_scope: 'group',
        },
      ])
    }
    if (view === 'historical' || view === 'evidence') return HttpResponse.json([])
    if (view === 'review-queue' || view === 'approval-queue') return HttpResponse.json([])
    return HttpResponse.json([])
  }),
  http.post('/api/workflow', () => HttpResponse.json({ ok: true, value_hash: 'mock' })),

  http.get('/api/concept-mappings', () =>
    HttpResponse.json({ concept_key: null, mappings: [] })),
  http.get('/api/blockchain', () => HttpResponse.json([])),

  // Mock AI evidence extraction — returns a deterministic, schema-correct payload
  // so the unit test can verify the contract without hitting Claude.
  http.post('/api/ai/extract-evidence', () =>
    HttpResponse.json({
      extraction: {
        id: '00000000-0000-0000-0000-000000000099',
        value: 1234.5,
        unit: 'kWh',
        period: 'Q1 2026',
        supplier: 'British Gas',
        confidence: 0.92,
        reasoning: 'Found "Total energy consumed: 1234.5 kWh" on page 1.',
        additionalNotes: null,
      },
      usage: { tokensIn: 1200, tokensOut: 80, cached: 800 },
    })),
  http.post('/api/ai/accept-extraction', () => HttpResponse.json({ ok: true })),

  // ── AI: anomaly narration ─────────────────────────────────
  // GET returns the DB-stored anomaly list (with cached narrative metadata).
  // POST returns a deterministic narrative so the schema test can verify shape
  // without hitting Claude.
  http.get('/api/ai/narrate-anomaly', () =>
    HttpResponse.json({
      anomalies: [
        {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          facility_id: 'fff00000-0000-0000-0000-000000000001',
          facility_name: 'Refinery Alpha',
          type: 'spike',
          severity: 'critical',
          title: 'Q1 Scope 2 spike at Refinery Alpha',
          description: 'Q1 emissions 18% higher than prior year.',
          scope: 2,
          metric: 'co2e_tonnes',
          expected_value: 1000,
          actual_value: 1180,
          deviation_pct: 18,
          status: 'open',
          detected_at: new Date().toISOString(),
          ai_narrative: null,
          ai_narrative_generated_at: null,
        },
      ],
    })),
  http.post('/api/ai/narrate-anomaly', async ({ request }) => {
    const body = await request.json() as { anomalyId: string; regenerate?: boolean }
    return HttpResponse.json({
      narrative: `Mock narrative for anomaly ${body.anomalyId}. Q1 Scope 2 emissions are 18% above Q1 2025, driven primarily by a 22% increase in purchased electricity. Most likely cause: production volume up 24%.`,
      generatedAt: new Date().toISOString(),
      cached: false,
      usage: { tokensIn: 1200, tokensOut: 180, cached: 0 },
    })
  }),

  // ── AI: gap analysis ──────────────────────────────────────
  // Returns a deterministic structured payload so the schema test +
  // component test verify the contract without hitting Claude.
  http.post('/api/ai/analyze-gaps', async ({ request }) => {
    const body = await request.json() as { frameworkId: string; reportingYear: number; question: string }
    return HttpResponse.json({
      id: '00000000-0000-0000-0000-0000000000aa',
      analysis: {
        summary: `For ${body.frameworkId} FY${body.reportingYear}, your portfolio is 60% complete. Three high-impact disclosures remain — Scope 3 Cat 3, biogenic CO₂, and target methodology.`,
        missingCount: 3,
        missingItems: [
          {
            code: 'E1-6',
            lineItem: 'Biogenic CO₂ emissions',
            why_critical: 'Required by ESRS E1-6 §44 for limited assurance. Auditors will flag without it.',
            estimated_effort: 'low',
            suggested_owner_role: 'FM',
          },
          {
            code: 'E1-6',
            lineItem: 'Scope 3 Category 3 — fuel- and energy-related activities',
            why_critical: 'Material category typically 8-12% of total Scope 3. Omission triggers ESRS-2 disclosure.',
            estimated_effort: 'medium',
            suggested_owner_role: 'SO',
          },
          {
            code: 'E1-4',
            lineItem: 'GHG reduction target methodology',
            why_critical: 'ESRS E1-4 §34 requires baseline year, target year and scope coverage.',
            estimated_effort: 'low',
            suggested_owner_role: 'TL',
          },
        ],
        qualityIssues: [
          { code: 'E1-6', issue: 'Scope 1 reported but biogenic CO₂ not separated — required for ESRS E1-6.' },
        ],
        recommendedNextSteps: [
          'Add biogenic CO₂ as a separate line item under Scope 1.',
          'Run the Scope 3 Cat 3 calculator with WTT defaults.',
          'Document target methodology with baseline year + scope coverage.',
        ],
      },
      cached: false,
      generatedAt: new Date().toISOString(),
      coverage: { required: 10, filled: 6, inProgress: 1, missing: 3 },
      usage: { tokensIn: 2400, tokensOut: 380, cached: 1800 },
    })
  }),

  // ── XBRL footnotes ────────────────────────────────────────
  http.get('/api/footnotes', () =>
    HttpResponse.json({ footnotes: [] })),
  http.post('/api/footnotes', async ({ request }) => {
    const body = await request.json() as { data_value_id: string; footnote_text: string }
    return HttpResponse.json({
      footnote: {
        id: 'fn-mock-1',
        data_value_id: body.data_value_id,
        footnote_text: body.footnote_text,
        created_by: 'u1',
        created_at: new Date().toISOString(),
      },
    }, { status: 201 })
  }),
  http.delete('/api/footnotes', () => HttpResponse.json({ ok: true, id: 'fn-mock-1' })),
]

export const server = setupServer(...handlers)
