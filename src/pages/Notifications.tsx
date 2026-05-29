import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Loader2, Inbox } from 'lucide-react'
import { orgStore, type Notification } from '../lib/orgStore'
import EmptyState from '../components/EmptyState'

/**
 * Full notifications inbox. RBAC is enforced server-side — /api/notifications
 * only returns rows where recipient_email = caller. Renders 20 at a time with
 * "Load more" pagination and a kind filter.
 */
const PAGE = 20

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [notes, setNotes] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filterKind, setFilterKind] = useState<string>('all')
  const [focusIdx, setFocusIdx] = useState(0)
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([])

  const load = async (newOffset = 0, kind?: string) => {
    const opts: { limit: number; offset: number; kind?: string } = { limit: PAGE, offset: newOffset }
    if (kind && kind !== 'all') opts.kind = kind
    const res = await orgStore.inboxNotifications(opts)
    if (newOffset === 0) {
      setNotes(res.notifications)
    } else {
      setNotes(prev => [...prev, ...res.notifications])
    }
    setUnread(res.unread)
    setTotal(res.total)
    setOffset(newOffset + res.notifications.length)
  }

  useEffect(() => {
    setLoading(true)
    load(0, filterKind).finally(() => setLoading(false))
  }, [filterKind])

  const loadMore = async () => {
    setLoadingMore(true)
    try { await load(offset, filterKind) } finally { setLoadingMore(false) }
  }

  const markAll = async () => {
    await orgStore.markAllNotificationsRead()
    setNotes(n => n.map(x => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })))
    setUnread(0)
  }

  const markOne = async (n: Notification, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (n.read_at) return
    await orgStore.markNotificationRead(n.id)
    setNotes(arr => arr.map(x => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
    setUnread(u => Math.max(0, u - 1))
  }

  const open = async (n: Notification) => {
    await markOne(n)
    if (n.route) navigate(n.route)
  }

  // Distinct kinds for the filter chip row
  const kinds = useMemo(() => {
    const s = new Set<string>()
    for (const n of notes) s.add(n.kind)
    return Array.from(s).sort()
  }, [notes])

  // Keyboard nav — Up/Down arrows move focus, Enter opens.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusIdx(i => {
          const ni = Math.min(notes.length - 1, i + 1)
          rowRefs.current[ni]?.focus()
          return ni
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusIdx(i => {
          const ni = Math.max(0, i - 1)
          rowRefs.current[ni]?.focus()
          return ni
        })
      } else if (e.key === 'Enter' && notes[focusIdx]) {
        e.preventDefault()
        void open(notes[focusIdx])
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // Safe: `open` is a stable handler closed over the current notes/focusIdx
    // snapshot. Adding it would re-bind the listener on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, focusIdx])

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <header className="mb-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--color-brand)]">
            <Bell className="w-3 h-3" /> Inbox
          </div>
          <h1 className="font-display text-[28px] font-bold text-[var(--text-primary)] mt-1">Notifications</h1>
          <p className="text-[var(--text-sm)] text-[var(--text-secondary)] mt-1">
            {total} total · {unread} unread. Use arrow keys to navigate, Enter to open.
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAll}
            className="text-[var(--text-xs)] font-semibold text-[var(--color-brand)] hover:underline inline-flex items-center gap-1">
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </header>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilterKind('all')}
          className={`text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full border ${
            filterKind === 'all'
              ? 'bg-[var(--color-brand)] text-white border-[var(--color-brand)]'
              : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--bg-secondary)]'
          }`}
        >All</button>
        {kinds.map(k => (
          <button
            key={k}
            onClick={() => setFilterKind(k)}
            className={`text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full border ${
              filterKind === k
                ? 'bg-[var(--color-brand)] text-white border-[var(--color-brand)]'
                : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--bg-secondary)]'
            }`}
          >{k.replace(/_/g, ' ')}</button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-[var(--text-sm)] text-[var(--text-tertiary)]">
          <Loader2 className="w-5 h-5 mx-auto animate-spin mb-2" />
          Loading inbox…
        </div>
      ) : notes.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)]">
          <EmptyState
            icon={Inbox}
            title="No notifications"
            body="Assignments, reviews, and approvals will appear here as they happen."
            cta={{ label: 'Open my tasks', onClick: () => navigate('/my-tasks') }}
          />
        </div>
      ) : (
        <ul className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] divide-y divide-[var(--border-subtle)] overflow-hidden">
          {notes.map((n, idx) => (
            <li key={n.id}>
              <button
                ref={el => (rowRefs.current[idx] = el)}
                onClick={() => open(n)}
                onFocus={() => setFocusIdx(idx)}
                className={`w-full text-left px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:ring-inset transition-colors ${
                  !n.read_at ? 'bg-[var(--color-brand-soft)]/30' : ''
                } hover:bg-[var(--bg-secondary)]`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${!n.read_at ? 'bg-[var(--color-brand)]' : 'bg-transparent'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-brand)]">{n.kind.replace(/_/g, ' ')}</span>
                  <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">{relativeTime(n.created_at)}</span>
                  {!n.read_at && (
                    <button
                      onClick={(e) => markOne(n, e)}
                      className="text-[10px] font-semibold text-[var(--color-brand)] hover:underline"
                    >Mark read</button>
                  )}
                </div>
                <div className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{n.subject}</div>
                {n.body && <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5 line-clamp-2">{n.body}</div>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && notes.length < total && (
        <div className="mt-4 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="text-[var(--text-sm)] font-semibold px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-50"
          >
            {loadingMore ? <Loader2 className="w-3.5 h-3.5 inline-block mr-1 animate-spin" /> : null}
            Load more ({total - notes.length} remaining)
          </button>
        </div>
      )}
    </div>
  )
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return new Date(iso).toLocaleDateString()
}
