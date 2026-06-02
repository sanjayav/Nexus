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
  http.get('/api/org', () => HttpResponse.json({ entities: [], members: [] })),
  http.get('/api/dashboard', () => HttpResponse.json({ kpis: {}, charts: {} })),

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
]

export const server = setupServer(...handlers)
