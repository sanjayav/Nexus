import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCheck, Inbox } from 'lucide-react'
import { orgStore, type Notification } from '../lib/orgStore'
import { SPRING } from './motion'

/**
 * Notification center. Polls unread count every 30s, drops a panel on click
 * showing up to 50 recent notifications with read/unread state. Marking all
 * read is one click; individual notifications mark-read on navigate.
 */
export default function NotificationsBell() {
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [focusIdx, setFocusIdx] = useState(-1)
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([])

  const loadCount = async () => {
    try { setUnread(await orgStore.unreadNotificationCount()) } catch { /* silent */ }
  }

  useEffect(() => {
    loadCount()
    const iv = setInterval(loadCount, 30000)
    return () => clearInterval(iv)
  }, [])

  const openPanel = async () => {
    setOpen(true)
    setLoading(true)
    setFocusIdx(-1)
    try {
      // Uses the paginated /api/notifications endpoint so we can show the
      // latest 20 and link to the full inbox at /inbox.
      const res = await orgStore.inboxNotifications({ limit: 20, offset: 0 })
      setNotes(res.notifications)
    } catch { /* silent */ }
    setLoading(false)
  }

  const markAll = async () => {
    try {
      await orgStore.markAllNotificationsRead()
      await loadCount()
      setNotes(n => n.map(x => ({ ...x, read_at: new Date().toISOString() })))
    } catch { /* silent */ }
  }

  const markOne = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await orgStore.markNotificationRead(id)
      await loadCount()
      setNotes(n => n.map(x => x.id === id ? { ...x, read_at: new Date().toISOString() } : x))
    } catch { /* silent */ }
  }

  const pick = async (n: Notification) => {
    try {
      if (!n.read_at) {
        await orgStore.markNotificationRead(n.id)
        await loadCount()
      }
    } catch { /* silent */ }
    setOpen(false)
    if (n.route) navigate(n.route)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    const t = setTimeout(() => document.addEventListener('click', onClick), 0)
    return () => { clearTimeout(t); document.removeEventListener('click', onClick) }
  }, [open])

  // Close on Escape + Up/Down arrow row navigation + Enter to open. WCAG 2.1.2.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); return }
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
      } else if (e.key === 'Enter' && focusIdx >= 0 && notes[focusIdx]) {
        e.preventDefault()
        void pick(notes[focusIdx])
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // Safe: `pick` is a stable function closed over via the current focusIdx/notes
    // snapshot. Adding it would re-register the listener on every render without
    // any behavioural change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, notes, focusIdx])

  return (
    <div className="relative">
      <button
        onClick={() => open ? setOpen(false) : openPanel()}
        aria-label={`Notifications, ${unread} unread`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] transition-all cursor-pointer"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[var(--accent-red)] text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-[var(--bg-primary)] tabular-nums"
          >
            {unread > 99 ? '99+' : unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="false"
            aria-labelledby="notifications-heading"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[380px] rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] shadow-xl z-50 overflow-hidden"
          >
            <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <h3 id="notifications-heading" className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">Notifications</h3>
                <p className="text-[10px] text-[var(--text-tertiary)]">{unread} unread</p>
              </div>
              {unread > 0 && (
                <button onClick={markAll} className="text-[10px] font-semibold text-[var(--color-brand)] hover:underline inline-flex items-center gap-1">
                  <CheckCheck className="w-3 h-3" /> Mark all read
                </button>
              )}
            </div>

            {loading ? (
              <div className="py-8 text-center text-[var(--text-xs)] text-[var(--text-tertiary)]">Loading…</div>
            ) : notes.length === 0 ? (
              <div className="py-10 text-center">
                <Inbox className="w-8 h-8 mx-auto text-[var(--text-tertiary)] mb-1" />
                <div className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">Nothing yet</div>
                <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Assignments, reviews and approvals show up here.</div>
              </div>
            ) : (
              <>
                <ul className="max-h-[420px] overflow-y-auto divide-y divide-[var(--border-subtle)]">
                  {notes.map((n, idx) => (
                    <li key={n.id}>
                      <button
                        ref={el => (rowRefs.current[idx] = el)}
                        onClick={() => pick(n)}
                        onFocus={() => setFocusIdx(idx)}
                        className={`w-full text-left px-4 py-2.5 hover:bg-[var(--bg-secondary)] focus:bg-[var(--bg-secondary)] focus:outline-none transition-colors ${!n.read_at ? 'bg-[var(--color-brand-soft)]/30' : ''}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${!n.read_at ? 'bg-[var(--color-brand)]' : 'bg-transparent'}`} />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-brand)]">{n.kind.replace(/_/g, ' ')}</span>
                          <span className="ml-auto text-[9px] text-[var(--text-tertiary)]">{relativeTime(n.created_at)}</span>
                          {!n.read_at && (
                            <button
                              onClick={(e) => markOne(n.id, e)}
                              className="text-[9px] font-semibold text-[var(--color-brand)] hover:underline"
                            >Mark read</button>
                          )}
                        </div>
                        <div className="text-[var(--text-xs)] font-semibold text-[var(--text-primary)]">{n.subject}</div>
                        {n.body && <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5 line-clamp-2">{n.body}</div>}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 text-center">
                  <button
                    onClick={() => { setOpen(false); navigate('/inbox') }}
                    className="text-[10px] font-semibold text-[var(--color-brand)] hover:underline"
                  >View all notifications</button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
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
