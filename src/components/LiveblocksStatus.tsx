import { WifiOff, Loader2, Wifi } from 'lucide-react'
import { useIsInsideRoom, useStatus } from '../lib/liveblocks'
import { useIntegrationStatus } from '../lib/integrations'

/**
 * Compact realtime-status badge for the disclosure editor.
 *
 * Renders one of four user-visible states so collaborators can tell at a
 * glance whether their edits are syncing to the room:
 *
 *   1. "Solo mode"  — `LIVEBLOCKS_SECRET_KEY` is not configured server-side
 *                     (integrations.realtime === false). Edits are local-only
 *                     by design; not an error condition.
 *   2. "Connecting" — initial handshake / reconnect attempt in flight.
 *   3. "Offline"    — auth failed or the websocket dropped. Edits are still
 *                     captured locally; the room will catch up on reconnect.
 *   4. (none)       — `connected`; presence avatars in the progress bar are
 *                     the source of truth, so we render nothing to avoid
 *                     visual noise.
 *
 * Wrapped by `useIsInsideRoom()` so the component can be dropped anywhere
 * — outside a `<RoomProvider>` it falls back to showing the integration
 * state only (Solo mode if unconfigured, otherwise null).
 */
export function LiveblocksStatus() {
  const integrations = useIntegrationStatus()

  // Realtime feature not configured server-side — explicit "solo mode" pill
  // so the user understands edits won't sync to teammates.
  if (!integrations.loading && !integrations.realtime) {
    return (
      <div
        className="flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)] px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]"
        title="Realtime collaboration is not configured. Add LIVEBLOCKS_SECRET_KEY on the server to enable multi-user editing."
      >
        <WifiOff className="w-3 h-3" />
        Solo mode
      </div>
    )
  }

  // Defer to the in-room status when wrapped by `<RoomProvider>`. The hook
  // throws outside a room context, so we self-guard via `useIsInsideRoom`.
  return <InsideRoomStatus />
}

function InsideRoomStatus() {
  const inside = useIsInsideRoom()
  if (!inside) return null
  return <RoomStatusBadge />
}

function RoomStatusBadge() {
  const status = useStatus()

  if (status === 'connecting' || status === 'reconnecting' || status === 'initial') {
    return (
      <div
        className="flex items-center gap-1.5 text-[10px] text-[var(--status-draft)] px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--accent-amber-light)] border border-[var(--status-draft)]/20"
        title={status === 'reconnecting' ? 'Reconnecting to the realtime server…' : 'Connecting to the realtime server…'}
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        {status === 'reconnecting' ? 'Reconnecting…' : 'Connecting…'}
      </div>
    )
  }

  if (status === 'disconnected') {
    return (
      <div
        className="flex items-center gap-1.5 text-[10px] text-[var(--status-reject)] px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--accent-red-light)] border border-[var(--status-reject)]/20"
        title="Realtime sync is offline. Your edits are local-only until the connection returns."
      >
        <WifiOff className="w-3 h-3" />
        Offline
      </div>
    )
  }

  // status === 'connected' — presence avatars in the progress bar carry the
  // signal; rendering anything here would just be noise. (We export the
  // tiny "connected" pill below for callers that explicitly want it.)
  return null
}

/**
 * Optional explicit "Live" indicator — not used by the progress bar by
 * default (presence avatars are enough) but exported for callers that want
 * a positive confirmation pill.
 */
export function LiveblocksConnectedPill() {
  return (
    <div
      className="flex items-center gap-1.5 text-[10px] text-[var(--status-ok)] px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--accent-green-light)] border border-[var(--status-ok)]/20"
      title="Realtime sync is active — edits propagate to other editors in this room."
    >
      <Wifi className="w-3 h-3" />
      Live
    </div>
  )
}
