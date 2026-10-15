/**
 * Tiny local server that executes api/*.ts the way Vercel does.
 * No Vercel login needed, no `vercel dev`. Just: `npm run dev:api`.
 *
 * Routing rules (match Vercel defaults):
 *   GET  /api/setup                 → api/setup.ts
 *   POST /api/auth/login            → api/auth/login.ts
 *   GET  /api/users                 → api/users/index.ts
 *   PUT  /api/users/abc-123         → api/users/[id].ts  (req.query.id = 'abc-123')
 *
 * Files starting with _ are helpers, not routes.
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http'
import { readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { config as loadEnv } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const API_DIR = join(ROOT, 'api')
const PORT = Number(process.env.API_PORT || 3000)

// Load .env into process.env so api files see DATABASE_URL + JWT_SECRET.
loadEnv({ path: join(ROOT, '.env') })

interface Route {
  method: '*'
  // Segments. Either a literal or {param: 'id'} for [id] placeholders.
  segments: Array<{ kind: 'literal'; value: string } | { kind: 'param'; name: string }>
  file: string
}

function discoverRoutes(): Route[] {
  const routes: Route[] = []

  function walk(dir: string, prefix: string[]) {
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith('_')) continue
      const full = join(dir, entry)
      const st = statSync(full)
      if (st.isDirectory()) {
        const seg = entry.startsWith('[') && entry.endsWith(']')
          ? { kind: 'param' as const, name: entry.slice(1, -1) }
          : { kind: 'literal' as const, value: entry }
        walk(full, [...prefix, JSON.stringify(seg)])
        continue
      }
      if (!entry.endsWith('.ts')) continue
      const base = entry.replace(/\.ts$/, '')
      let segments = prefix.map(p => JSON.parse(p) as Route['segments'][number])
      if (base !== 'index') {
        const seg = base.startsWith('[') && base.endsWith(']')
          ? { kind: 'param' as const, name: base.slice(1, -1) }
          : { kind: 'literal' as const, value: base }
        segments = [...segments, seg]
      }
      routes.push({ method: '*', segments, file: full })
    }
  }
  walk(API_DIR, [])
  return routes
}

const ROUTES = discoverRoutes()
console.log(`[dev-api] discovered ${ROUTES.length} routes:`)
for (const r of ROUTES) {
  const path = '/api/' + r.segments.map(s => s.kind === 'literal' ? s.value : `:${s.name}`).join('/')
  console.log('  ' + path + '  →  ' + r.file.replace(ROOT + '/', ''))
}

function matchRoute(urlPath: string): { route: Route; params: Record<string, string> } | null {
  // urlPath like "/api/users/abc-123"
  if (!urlPath.startsWith('/api/') && urlPath !== '/api') return null
  const rest = urlPath.replace(/^\/api\/?/, '')
  const parts = rest === '' ? [] : rest.split('/')
  for (const route of ROUTES) {
    if (route.segments.length !== parts.length) continue
    const params: Record<string, string> = {}
    let ok = true
    for (let i = 0; i < parts.length; i++) {
      const seg = route.segments[i]
      if (seg.kind === 'literal') {
        if (seg.value !== parts[i]) { ok = false; break }
      } else {
        params[seg.name] = decodeURIComponent(parts[i])
      }
    }
    if (ok) return { route, params }
  }
  return null
}

function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((res, rej) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return res(undefined)
    const chunks: Buffer[] = []
    req.on('data', c => chunks.push(c as Buffer))
    req.on('error', rej)
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) return res(undefined)
      const ctype = req.headers['content-type'] || ''
      if (ctype.includes('application/json')) {
        try { res(JSON.parse(raw)) } catch { res(undefined) }
      } else {
        res(raw)
      }
    })
  })
}

// Build a VercelResponse-ish shim on top of Node's ServerResponse.
function makeVercelRes(res: ServerResponse) {
  let statusCode = 200
  const wrap = {
    status(code: number) { statusCode = code; res.statusCode = code; return wrap },
    setHeader(k: string, v: string) { res.setHeader(k, v); return wrap },
    getHeader(k: string) { return res.getHeader(k) },
    removeHeader(k: string) { res.removeHeader(k); return wrap },
    end(body?: string | Buffer) { res.statusCode = statusCode; res.end(body); return wrap },
    json(body: unknown) {
      res.setHeader('Content-Type', 'application/json')
      res.statusCode = statusCode
      res.end(JSON.stringify(body))
      return wrap
    },
    send(body: unknown) {
      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        res.statusCode = statusCode
        res.end(body)
      } else {
        wrap.json(body)
      }
      return wrap
    },
    redirect(status: number | string, url?: string) {
      if (typeof status === 'string') { url = status; status = 302 }
      res.statusCode = status as number
      res.setHeader('Location', url!)
      res.end()
      return wrap
    },
  }
  return wrap
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`)
    const matched = matchRoute(url.pathname)
    if (!matched) {
      res.statusCode = 404
      res.end(JSON.stringify({ error: 'Not found', path: url.pathname }))
      return
    }
    // Compose req.query from URLSearchParams + route params
    const query: Record<string, string | string[]> = { ...matched.params }
    for (const [k, v] of url.searchParams.entries()) {
      if (k in query) {
        const prev = query[k]
        query[k] = Array.isArray(prev) ? [...prev, v] : [prev as string, v]
      } else {
        query[k] = v
      }
    }
    const body = await parseBody(req)
    const vReq = Object.assign(req, { query, body, cookies: {} })
    const vRes = makeVercelRes(res)

    const fileUrl = pathToFileURL(matched.route.file).href + '?ts=' + Date.now()
    const mod = await import(fileUrl)
    const handler = mod.default
    if (typeof handler !== 'function') {
      res.statusCode = 500
      res.end(JSON.stringify({ error: `No default export in ${matched.route.file}` }))
      return
    }
    await handler(vReq, vRes)
  } catch (err) {
    console.error('[dev-api] handler error:', err)
    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }))
    } else {
      res.end()
    }
  }
})

server.listen(PORT, () => {
  console.log(`[dev-api] listening on http://localhost:${PORT}`)
  if (!existsSync(join(ROOT, '.env'))) {
    console.warn('[dev-api] ⚠ .env not found — DATABASE_URL and JWT_SECRET must be set manually')
  } else if (!process.env.DATABASE_URL) {
    console.warn('[dev-api] ⚠ DATABASE_URL not loaded from .env')
  } else {
    console.log('[dev-api] ✓ DATABASE_URL loaded')
  }
})
