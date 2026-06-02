import { createClient } from '@liveblocks/client'
import { createRoomContext } from '@liveblocks/react'

/**
 * Liveblocks setup for the Nexus disclosure editor.
 *
 * Realtime presence is OPTIONAL — if `LIVEBLOCKS_SECRET_KEY` is unset on the
 * server, `/api/liveblocks-auth` returns 503 and the client treats the editor
 * as solo-mode (no avatars, no remote cursors, no errors visible to the user).
 *
 * Room IDs are org-scoped (`nexus:<orgId>:framework:<frameworkId>`) so two
 * orgs can never accidentally collide in the same room.
 *
 * Presence model (kept tiny — Liveblocks throttles updates at 100ms and the
 * free tier caps simultaneous connections per room at 25):
 *   - `userId` / `name` / `email`  — identify the participant in the avatar row
 *   - `color`                      — stable per-user tint for avatar + cell ring
 *   - `activeCellId`               — which questionnaire cell the user is
 *                                    currently focused on (drives the per-cell
 *                                    "X is here" badge)
 *   - `selectionAt`                — timestamp; used by remote viewers to fade
 *                                    stale focus indicators
 */
export type Presence = {
  userId: string | null
  name: string
  email: string
  color: string
  activeCellId: string | null
  selectionAt: number
}

// Room storage is reserved for future shared state (e.g. comment drafts,
// live cell suggestions). Empty in v1 — keeping the type so we can grow into
// it without re-typing the room context.
export type Storage = Record<string, never>

export type UserMeta = {
  id: string
  info: {
    name: string
    email: string
    color: string
  }
}

/**
 * The token getter is read fresh on every auth call so a re-login picks up
 * the new bearer without re-creating the Liveblocks client.
 */
function getAuthToken(): string | null {
  try {
    return localStorage.getItem('aeiforo_token')
  } catch {
    return null
  }
}

const client = createClient({
  throttle: 100,
  authEndpoint: async (room) => {
    const token = getAuthToken()
    if (!token) {
      // No session — let Liveblocks raise so the RoomProvider's error path
      // fires and the editor falls back to solo mode.
      throw new Error('Not authenticated')
    }
    const res = await fetch('/api/liveblocks-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ room }),
    })
    if (!res.ok) {
      throw new Error(`Liveblocks auth failed (${res.status})`)
    }
    return await res.json()
  },
})

export const {
  RoomProvider,
  useMyPresence,
  useOthers,
  useUpdateMyPresence,
  useSelf,
  useRoom,
  useIsInsideRoom,
} = createRoomContext<Presence, Storage, UserMeta>(client)

/**
 * Build the canonical room id for a framework editor. Mirrored server-side
 * by `orgRoomPattern()` in `api/_liveblocks.ts`; keep them in lockstep.
 */
export function roomIdFor(frameworkId: string, orgId: string): string {
  return `nexus:${orgId}:framework:${frameworkId}`
}

// Re-export from the shared palette so callers can render avatars / cursor
// tints without reaching into `api/_color.ts` (which is a server-shaped path).
export { colorFor } from './presenceColor'
