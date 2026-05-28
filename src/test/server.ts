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
]

export const server = setupServer(...handlers)
