/**
 * Client side of Phase 4: Accept-Language on every request (src/lib/api.ts
 * and src/lib/orgStore.ts), the new namespaces and their wire paths.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import i18n from 'i18next'
import { server } from '../server'
import {
  orgSettings, orgWebhooks, userLocale, regulatoryCalendar, greenLedger,
  currentLanguageTag, toAppLocale, isAiDisabledError, ApiError, ai,
} from '../../lib/api'
import { orgStore } from '../../lib/orgStore'

afterEach(async () => {
  await i18n.changeLanguage('en')
})

describe('Accept-Language', () => {
  it('maps the UI language to a BCP-47 tag', async () => {
    expect(currentLanguageTag()).toBe('en')
    await i18n.changeLanguage('zh')
    expect(currentLanguageTag()).toBe('zh-CN')
    await i18n.changeLanguage('th')
    expect(currentLanguageTag()).toBe('th-TH')
    expect(toAppLocale('zh-CN')).toBe('zh')
    expect(toAppLocale(undefined)).toBe('en')
  })

  it('is sent by api.ts and orgStore requests', async () => {
    const seen: Array<string | null> = []
    server.use(
      http.get('/api/org-settings', ({ request }) => { seen.push(request.headers.get('accept-language')); return HttpResponse.json({ settings: {}, stored: false, effective: {}, ai: {} }) }),
      http.get('/api/emission-factors', ({ request }) => { seen.push(request.headers.get('accept-language')); return HttpResponse.json([]) }),
    )
    await i18n.changeLanguage('zh')
    await orgSettings.get()
    await orgStore.listEmissionFactors({ region: 'CN', preferredOnly: true })
    expect(seen).toEqual(['zh-CN', 'zh-CN'])
  })
})

describe('Phase 4 client methods hit the documented endpoints', () => {
  it('builds paths, methods and bodies', async () => {
    const hits: string[] = []
    const record = (method: string) => async ({ request }: { request: Request }) => {
      const u = new URL(request.url)
      const body = method === 'GET' || method === 'DELETE' ? '' : ` ${await request.text()}`
      hits.push(`${method} ${u.pathname}${u.search}${body}`)
      return HttpResponse.json({ ok: true })
    }
    server.use(
      http.put('/api/org-settings', record('PUT')),
      http.get('/api/org-webhooks', record('GET')),
      http.post('/api/org-webhooks', record('POST')),
      http.put('/api/org-webhooks', record('PUT')),
      http.delete('/api/org-webhooks', record('DELETE')),
      http.put('/api/user-locale', record('PUT')),
      http.get('/api/regulatory-calendar', record('GET')),
      http.get('/api/green-certificates', record('GET')),
      http.post('/api/green-certificates', record('POST')),
      http.delete('/api/green-certificates', record('DELETE')),
    )
    await orgSettings.update({ market: 'cn', ai_enabled: false })
    await orgWebhooks.list()
    await orgWebhooks.save({ channel: 'feishu', webhook_url: 'https://open.feishu.cn/open-apis/bot/v2/hook/x' })
    await orgWebhooks.update('id1', { enabled: false })
    await orgWebhooks.test('id1')
    await orgWebhooks.remove('id1')
    await userLocale.set('zh')
    await regulatoryCalendar.get({ regions: ['CN', 'HK'], fy: 2026 })
    await greenLedger.totals(2025, { purchasedMwh: 100 })
    await greenLedger.addCredit({ standard: 'CCER', tco2e: 5 })
    await greenLedger.removeCertificate('c1')
    expect(hits).toEqual([
      'PUT /api/org-settings {"market":"cn","ai_enabled":false}',
      'GET /api/org-webhooks',
      'POST /api/org-webhooks {"channel":"feishu","webhook_url":"https://open.feishu.cn/open-apis/bot/v2/hook/x"}',
      'PUT /api/org-webhooks?id=id1 {"enabled":false}',
      'POST /api/org-webhooks?action=test&id=id1 ',
      'DELETE /api/org-webhooks?id=id1',
      'PUT /api/user-locale {"locale":"zh"}',
      'GET /api/regulatory-calendar?region=CN%2CHK&fy=2026',
      'GET /api/green-certificates?view=totals&year=2025&purchased_mwh=100',
      'POST /api/green-certificates {"kind":"credit","standard":"CCER","tco2e":5}',
      'DELETE /api/green-certificates?kind=eac&id=c1',
    ])
  })

  it('surfaces the AI-disabled 403 as a typed error', async () => {
    server.use(http.post('/api/ai/draft', () => HttpResponse.json({ error: 'AI disabled', code: 'ai_disabled' }, { status: 403 })))
    let caught: unknown
    try { await ai.draft({ framework: 'cn-sse', section: 'x' }) } catch (e) { caught = e }
    expect(caught).toBeInstanceOf(ApiError)
    expect(isAiDisabledError(caught)).toBe(true)
  })
})
