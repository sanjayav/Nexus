/**
 * Minimal stand-in for the Neon tagged-template client used by api/**.
 * Records every statement (whitespace-normalised, `$?` for parameters) and
 * answers with whatever the handler returns. No database is ever contacted.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

export interface SqlCall {
  q: string
  values: unknown[]
}

export type SqlHandler = (q: string, values: unknown[]) => unknown[] | Promise<unknown[]>

export function makeFakeSql(handler: SqlHandler = () => []) {
  const calls: SqlCall[] = []
  const fn = (strings: TemplateStringsArray, ...values: unknown[]) => {
    const q = strings.join('$?').replace(/\s+/g, ' ').trim()
    calls.push({ q, values })
    return Promise.resolve().then(() => handler(q, values))
  }
  return Object.assign(fn, { calls })
}

export type FakeSql = ReturnType<typeof makeFakeSql>

export interface MockRes {
  statusCode: number
  body: unknown
  headers: Record<string, string>
  status(code: number): MockRes
  json(body: unknown): MockRes
  end(): MockRes
  setHeader(k: string, v: string): void
}

export function mockRes(): MockRes & VercelResponse {
  const r = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) { r.statusCode = code; return r },
    json(body: unknown) { r.body = body; return r },
    end() { return r },
    setHeader(k: string, v: string) { r.headers[k] = v },
  }
  return r as unknown as MockRes & VercelResponse
}

export function mockReq(init: {
  method?: string
  query?: Record<string, string>
  body?: unknown
  headers?: Record<string, string>
}): VercelRequest {
  return {
    method: init.method ?? 'GET',
    query: init.query ?? {},
    body: init.body,
    headers: { ...(init.headers ?? {}) },
  } as unknown as VercelRequest
}
