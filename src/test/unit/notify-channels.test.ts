/**
 * China IM group-bot channels — payload builders, signing, config gating.
 * Pure-function tests; fetch is stubbed and asserted, no network is used.
 * Expected HMAC values were computed independently with Python's hmac module.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  signDingTalk,
  buildDingTalkUrl,
  buildDingTalkPayload,
  signFeishu,
  buildFeishuPayload,
  buildWeComPayload,
  WECOM_MARKDOWN_MAX_BYTES,
  interpretImResponse,
  isAllowedWebhook,
  imChannelConfigFromEnv,
  imChannelConfigForOrg,
  shouldForwardKind,
  sendImNotifications,
} from '../../../api/_notifyChannels'

const MSG = {
  title: '新任务：范围一排放数据待填报',
  body: '绿源新材料（四川宜宾）· 截止 2026-10-23',
  link: 'https://nexus.example/my-tasks',
}

describe('DingTalk', () => {
  it('signs timestamp\\nsecret with HMAC-SHA256 keyed by the secret, base64 + URL-encoded', () => {
    expect(signDingTalk('SECtestsecret123', 1700000000000))
      .toBe('Y4At%2BTruAh3C4rXZwD748s2rqrapbJWKRagqLANB690%3D')
  })

  it('appends timestamp and sign to the webhook URL only when a secret is set', () => {
    const base = 'https://oapi.dingtalk.com/robot/send?access_token=abc'
    expect(buildDingTalkUrl(base, undefined, 1700000000000)).toBe(base)
    expect(buildDingTalkUrl(base, 'SECtestsecret123', 1700000000000)).toBe(
      `${base}&timestamp=1700000000000&sign=Y4At%2BTruAh3C4rXZwD748s2rqrapbJWKRagqLANB690%3D`,
    )
  })

  it('builds a markdown message with title, body and link', () => {
    const p = buildDingTalkPayload(MSG)
    expect(p.msgtype).toBe('markdown')
    expect(p.markdown.title).toBe(MSG.title)
    expect(p.markdown.text).toContain(`#### ${MSG.title}`)
    expect(p.markdown.text).toContain(MSG.body)
    expect(p.markdown.text).toContain(`(${MSG.link})`)
  })

  it('omits body and link lines when not provided', () => {
    expect(buildDingTalkPayload({ title: 'T' }).markdown.text).toBe('#### T')
  })
})

describe('Feishu', () => {
  it('signs with HMAC-SHA256 keyed by timestamp\\nsecret over an empty message', () => {
    expect(signFeishu('feishusecret', 1700000000)).toBe('5Wc8F8b2vZlNjoVFpK6BAaovMobglP4Rm1FzmEq/rCU=')
  })

  it('builds a zh_cn post message; adds timestamp (seconds, string) + sign when a secret is set', () => {
    const unsigned = buildFeishuPayload(MSG)
    expect(unsigned.msg_type).toBe('post')
    expect(unsigned.content.post.zh_cn.title).toBe(MSG.title)
    expect(unsigned.content.post.zh_cn.content).toEqual([
      [{ tag: 'text', text: MSG.body }],
      [{ tag: 'a', text: '在 Nexus 中查看', href: MSG.link }],
    ])
    expect(unsigned.timestamp).toBeUndefined()
    expect(unsigned.sign).toBeUndefined()

    const signed = buildFeishuPayload(MSG, 'feishusecret', 1700000000)
    expect(signed.timestamp).toBe('1700000000')
    expect(signed.sign).toBe('5Wc8F8b2vZlNjoVFpK6BAaovMobglP4Rm1FzmEq/rCU=')
  })
})

describe('WeCom', () => {
  it('builds a markdown message', () => {
    const p = buildWeComPayload(MSG)
    expect(p.msgtype).toBe('markdown')
    expect(p.markdown.content).toBe(`**${MSG.title}**\n${MSG.body}\n[在 Nexus 中查看](${MSG.link})`)
  })

  it('truncates content to 4096 UTF-8 bytes without splitting a character', () => {
    const p = buildWeComPayload({ title: '标题', body: '碳'.repeat(3000) })
    const bytes = new TextEncoder().encode(p.markdown.content).length
    expect(bytes).toBeLessThanOrEqual(WECOM_MARKDOWN_MAX_BYTES)
    expect(p.markdown.content.endsWith('…')).toBe(true)
    expect(p.markdown.content).not.toContain('�')
  })
})

describe('response + config handling', () => {
  it('interprets vendor body error codes (HTTP is 200 even on failure)', () => {
    expect(interpretImResponse('dingtalk', { errcode: 0, errmsg: 'ok' })).toEqual({ ok: true })
    expect(interpretImResponse('wecom', { errcode: 93000, errmsg: 'invalid webhook url' }).ok).toBe(false)
    expect(interpretImResponse('feishu', { code: 0, msg: 'success' })).toEqual({ ok: true })
    expect(interpretImResponse('feishu', { StatusCode: 0 })).toEqual({ ok: true })
    expect(interpretImResponse('feishu', { code: 19021, msg: 'sign match fail' }).error).toContain('19021')
  })

  it('only allows the official robot hosts over https', () => {
    expect(isAllowedWebhook('dingtalk', 'https://oapi.dingtalk.com/robot/send?access_token=x')).toBe(true)
    expect(isAllowedWebhook('feishu', 'https://open.feishu.cn/open-apis/bot/v2/hook/x')).toBe(true)
    expect(isAllowedWebhook('feishu', 'https://open.larksuite.com/open-apis/bot/v2/hook/x')).toBe(true)
    expect(isAllowedWebhook('wecom', 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=x')).toBe(true)
    expect(isAllowedWebhook('wecom', 'http://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=x')).toBe(false)
    expect(isAllowedWebhook('dingtalk', 'https://evil.example/robot/send')).toBe(false)
    expect(isAllowedWebhook('dingtalk', 'not a url')).toBe(false)
  })

  it('reads channels from env and gates them per org via NOTIFY_IM_ORG_IDS', () => {
    const env = {
      DINGTALK_WEBHOOK_URL: 'https://oapi.dingtalk.com/robot/send?access_token=x',
      DINGTALK_WEBHOOK_SECRET: 'SEC1',
      WECOM_WEBHOOK_URL: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=y',
    }
    expect(imChannelConfigFromEnv(env)).toEqual({
      dingtalk: { webhookUrl: env.DINGTALK_WEBHOOK_URL, secret: 'SEC1' },
      wecom: { webhookUrl: env.WECOM_WEBHOOK_URL },
    })
    expect(imChannelConfigFromEnv({})).toEqual({})
    // Not allow-listed ⇒ nothing (protects multi-tenant deployments)
    expect(imChannelConfigForOrg('org-a', env)).toEqual({})
    expect(imChannelConfigForOrg('org-a', { ...env, NOTIFY_IM_ORG_IDS: 'org-b' })).toEqual({})
    expect(imChannelConfigForOrg('org-a', { ...env, NOTIFY_IM_ORG_IDS: 'org-b, org-a' }).dingtalk).toBeDefined()
    expect(imChannelConfigForOrg('org-z', { ...env, NOTIFY_IM_ORG_IDS: '*' }).wecom).toBeDefined()
  })

  it('filters by NOTIFY_IM_KINDS when set', () => {
    expect(shouldForwardKind('assignment', {})).toBe(true)
    expect(shouldForwardKind('assignment', { NOTIFY_IM_KINDS: 'assignment,rejected' })).toBe(true)
    expect(shouldForwardKind('comment', { NOTIFY_IM_KINDS: 'assignment,rejected' })).toBe(false)
  })
})

describe('sendImNotifications (fetch stubbed)', () => {
  const fetchMock = vi.fn()
  const originalFetch = globalThis.fetch
  beforeEach(() => {
    fetchMock.mockReset()
    globalThis.fetch = fetchMock as unknown as typeof fetch
  })
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('does nothing when no channel is configured', async () => {
    expect(await sendImNotifications(MSG, {})).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('POSTs JSON to each configured channel and reports per-channel results', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      const body = url.includes('feishu') ? { code: 0, msg: 'success' } : { errcode: 0, errmsg: 'ok' }
      return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    const results = await sendImNotifications(MSG, {
      dingtalk: { webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=x', secret: 'SEC1' },
      feishu: { webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/abc' },
      wecom: { webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=y' },
    })
    expect(results.map(r => [r.channel, r.ok])).toEqual([['dingtalk', true], ['feishu', true], ['wecom', true]])
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const [dtUrl, dtInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(dtUrl).toMatch(/&timestamp=\d+&sign=/)
    expect(dtInit.method).toBe('POST')
    expect(JSON.parse(String(dtInit.body)).msgtype).toBe('markdown')
  })

  it('refuses non-official hosts without calling fetch, and never throws on transport errors', async () => {
    const r1 = await sendImNotifications(MSG, { wecom: { webhookUrl: 'https://evil.example/hook' } })
    expect(r1[0].ok).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()

    fetchMock.mockRejectedValue(new Error('ECONNRESET'))
    const r2 = await sendImNotifications(MSG, { wecom: { webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=y' } })
    expect(r2).toEqual([{ channel: 'wecom', ok: false, error: 'ECONNRESET' }])
  })
})
