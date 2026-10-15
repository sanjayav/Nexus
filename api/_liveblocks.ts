import { Liveblocks } from '@liveblocks/node'

/**
 * Lazily-constructed Liveblocks server client. Throws if the
 * `LIVEBLOCKS_SECRET_KEY` env var isn't set — callers MUST catch and return a
 * 503 so the editor can degrade gracefully.
 *
 * Kept out of `api/liveblocks-auth.ts` so future endpoints (e.g. room admin,
 * webhook handlers) can share the same client without circular imports.
 */
export function getLiveblocks(): Liveblocks {
  const key = process.env.LIVEBLOCKS_SECRET_KEY
  if (!key) {
    throw new Error('LIVEBLOCKS_SECRET_KEY env var is not set')
  }
  return new Liveblocks({ secret: key })
}

/**
 * Org-scoped room ID pattern. Mirrors `roomIdFor()` in
 * `src/lib/liveblocks.ts` — kept in sync so the server can authorise the
 * exact rooms the client opens.
 *
 * Pattern: `nexus:<orgId>:framework:<frameworkId>`.
 *
 * The wildcard variant (`nexus:<orgId>:*`) is what we hand to
 * `session.allow()` so a user can join any framework room in their org.
 */
export function orgRoomPattern(orgId: string): string {
  return `nexus:${orgId}:*`
}
