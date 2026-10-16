/**
 * api/_http.ts — Content-Disposition for non-ASCII (Chinese) file names and
 * the server-side CSV writer, plus the audit-log CSV export end to end with a
 * fake sql (no database is touched).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateHeaderValue } from 'node:http'
import { contentDisposition, csvCell, toCsv, CSV_BOM } from '../../../api/_http'

/** Pull filename / filename* back out of a header value. */
function parseDisposition(v: string) {
  const ascii = /;\s*filename="([^"]*)"/.exec(v)?.[1]
  const star = /;\s*filename\*=UTF-8''([^;\s]+)/.exec(v)?.[1]
  return { type: v.split(';')[0], ascii, utf8: star ? decodeURIComponent(star) : undefined }
}

describe('contentDisposition', () => {
  const cjkNames = [
    '国网电费单.pdf',
    'report-CN-SSE-2025年度.docx',
    '绿源新材料（四川宜宾）ESG报告 2025.pdf',
    '审计日志-2026-10-16.csv',
  ]

  it.each(cjkNames)('produces a header Node accepts for %s', (name) => {
    const v = contentDisposition(name)
    expect(() => validateHeaderValue('Content-Disposition', v)).not.toThrow()
    // Header value is pure printable ASCII.
    expect(/^[\x20-\x7e]+$/.test(v)).toBe(true)
  })

  it.each(cjkNames)('round-trips %s through filename* (RFC 5987)', (name) => {
    expect(parseDisposition(contentDisposition(name)).utf8).toBe(name)
  })

  it('the old interpolated header is exactly what crashed (regression guard)', () => {
    expect(() => validateHeaderValue('Content-Disposition', 'attachment; filename="国网电费单.pdf"'))
      .toThrow(/Invalid character/)
  })

  it('gives an ASCII fallback that keeps the extension', () => {
    expect(parseDisposition(contentDisposition('国网电费单.pdf')).ascii).toBe('download.pdf')
    expect(parseDisposition(contentDisposition('report-CN-SSE-2025年度.docx')).ascii).toBe('report-CN-SSE-2025.docx')
    expect(parseDisposition(contentDisposition('Café menu.pdf')).ascii).toBe('Cafe menu.pdf')
  })

  it('formats the full header exactly', () => {
    expect(contentDisposition('国网.pdf')).toBe(
      `attachment; filename="download.pdf"; filename*=UTF-8''%E5%9B%BD%E7%BD%91.pdf`,
    )
    expect(contentDisposition('audit-log-2026-10-16.csv')).toBe(
      `attachment; filename="audit-log-2026-10-16.csv"; filename*=UTF-8''audit-log-2026-10-16.csv`,
    )
  })

  it('supports inline disposition', () => {
    expect(parseDisposition(contentDisposition('报告.pdf', 'inline')).type).toBe('inline')
  })

  it('neutralises quotes, CR/LF header injection and path separators', () => {
    const v = contentDisposition('a"b\r\nSet-Cookie: x=1;/..\\evil.pdf')
    expect(() => validateHeaderValue('Content-Disposition', v)).not.toThrow()
    expect(v).not.toMatch(/[\r\n]/)
    const { ascii, utf8 } = parseDisposition(v)
    expect(ascii).not.toContain('"')
    expect(ascii).not.toMatch(/[/\\]/)
    expect(utf8).not.toMatch(/[/\\\r\n]/)
  })

  it('escapes the RFC 5987 reserved characters \' ( ) *', () => {
    const v = contentDisposition("it's (draft) *.pdf")
    expect(v).toContain("filename*=UTF-8''it%27s%20%28draft%29%20%2A.pdf")
  })

  it('never emits an empty name', () => {
    expect(parseDisposition(contentDisposition('')).ascii).toBe('download')
    expect(parseDisposition(contentDisposition('   ')).utf8).toBe('download')
  })
})

describe('server CSV writer', () => {
  it('starts with a UTF-8 BOM and uses CRLF', () => {
    const csv = toCsv([['a', 'b'], ['排放', '1']])
    expect(csv.startsWith(CSV_BOM)).toBe(true)
    expect(Buffer.from(csv, 'utf8').subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]))
    expect(csv).toBe('﻿a,b\r\n排放,1\r\n')
  })

  it('quotes commas, quotes, newlines and edge whitespace', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"')
    expect(csvCell(' padded')).toBe('" padded"')
    expect(csvCell('中文，全角逗号')).toBe('中文，全角逗号')
    expect(csvCell(null)).toBe('')
    expect(csvCell({ k: 'v' })).toBe('"{""k"":""v""}"')
    expect(csvCell(12.5)).toBe('12.5')
  })
})

// ─── /api/audit?format=csv end to end ──────────────────────────────────

vi.mock('../../../api/_auth', () => ({
  cors: () => {},
  requirePermission: async () => ({ sub: 'u-1', org: 'org-a', email: 'a@example.com' }),
}))

const auditRows = [{
  id: '1', user_id: 'u-1', user_name: '张伟', user_email: 'zhang@example.cn',
  action: 'report.published', resource_type: 'report', resource_id: 'r-1',
  details: { title: '2025年度 ESG 报告, 终稿' }, ip_address: '1.2.3.4', created_at: '2026-10-16T08:00:00.000Z',
}]
const sqlCalls: Array<{ text: string; values: unknown[] }> = []
vi.mock('../../../api/_db', () => ({
  getDb: () => (strings: TemplateStringsArray, ...values: unknown[]) => {
    sqlCalls.push({ text: strings.join('?'), values })
    return Promise.resolve(strings.join('?').includes('FROM audit_log al') ? auditRows : [])
  },
}))

function fakeRes() {
  const headers: Record<string, string> = {}
  const out = { statusCode: 0, body: undefined as unknown, headers }
  const res = {
    setHeader(k: string, v: string) { validateHeaderValue(k, v); headers[k.toLowerCase()] = v; return res },
    status(c: number) { out.statusCode = c; return res },
    json(b: unknown) { out.body = b; return res },
    send(b: unknown) { out.body = b; return res },
    end() { return res },
  }
  return { res, out }
}

describe('GET /api/audit?format=csv', () => {
  beforeEach(() => { sqlCalls.length = 0 })

  it('streams a BOM-prefixed, properly quoted CSV with a safe Content-Disposition', async () => {
    const { default: handler } = await import('../../../api/audit')
    const { res, out } = fakeRes()
    await handler({ method: 'GET', query: { format: 'csv' }, headers: {} } as never, res as never)
    expect(out.statusCode).toBe(200)
    const buf = out.body as Buffer
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(buf.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]))
    const text = buf.toString('utf8').slice(1)
    const [head, line] = text.split('\r\n')
    expect(head).toBe('created_at,actor,actor_email,action,resource_type,resource_id,ip_address,details')
    expect(line).toBe('2026-10-16T08:00:00.000Z,张伟,zhang@example.cn,report.published,report,r-1,1.2.3.4,"{""title"":""2025年度 ESG 报告, 终稿""}"')
    expect(out.headers['content-type']).toBe('text/csv; charset=utf-8')
    expect(out.headers['content-disposition']).toMatch(/^attachment; filename="audit-log-\d{4}-\d{2}-\d{2}\.csv"; filename\*=UTF-8''/)
    // Every audit query stays tenant-scoped.
    expect(sqlCalls.every(c => c.values.includes('org-a'))).toBe(true)
  })
})
