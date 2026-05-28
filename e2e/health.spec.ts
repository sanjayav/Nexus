import { test, expect } from '@playwright/test'

test('health endpoint reports status', async ({ request }) => {
  const res = await request.get('/api/health')
  expect([200, 503]).toContain(res.status())
  const body = await res.json()
  expect(body).toHaveProperty('ok')
  expect(body).toHaveProperty('db')
  expect(body).toHaveProperty('integrations')
  expect(body.integrations).toHaveProperty('email')
  expect(body.integrations).toHaveProperty('sso')
  expect(body.integrations).toHaveProperty('ai')
})
