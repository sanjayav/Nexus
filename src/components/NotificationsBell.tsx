import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Bell, CheckCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import { orgStore, type Notification } from '../lib/orgStore'
import { spring, popVariants } from '../motion/tokens'
import { Illustration, Skeleton } from './ui'
import { KindIcon, relativeTime as shortTime } from './myday/notificationBits'

/**
 * Notification center. Polls unread count every 30s, drops a panel on click
 * showing up to 50 recent notifications with read/unread state. Marking all
 * read is one click; individual notifications mark-read on navigate.
 */
export default function NotificationsBell() {
  const { t } = useTranslation()
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
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
    setLoadError(false)
    setFocusIdx(-1)
    try {
      // Uses the paginated /api/notifications endpoint so we can show the
      // latest 20 and link to the full inbox at /inbox.
      const res = await orgStore.inboxNotifications({ limit: 20, offset: 0 })
      setNotes(res.notifications)
    } catch {
      // Say it failed — an empty list here would read as "nothing new".
      setLoadError(true)
    }
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
    const timer = setTimeout(() => document.addEventListener('click', onClick), 0)
    return () => { clearTimeout(timer); document.removeEventListener('click', onClick) }
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
        aria-label={t('components.notifications.ariaUnread', { count: unread })}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] transition-colors cursor-pointer"
        title={t('components.notifications.title')}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <motion.span
            key={unread}
            initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={spring.snappy}
            className="absolute top-0 right-0 sm:-top-0.5 sm:-right-0.5 min-w-[18px] h-[18px] px-1 bg-[var(--status-danger)] text-white text-micro font-bold rounded-full flex items-center justify-center ring-2 ring-[var(--bg-primary)] tabular-nums"
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
            variants={popVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ transformOrigin: 'top right' }}
            className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-14 sm:top-full sm:mt-2 sm:w-[380px] rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] shadow-[var(--shadow-overlay,var(--shadow-raised))] z-50 overflow-hidden"
          >
            <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <h3 id="notifications-heading" className="type-small font-semibold text-[var(--text-primary)]">{t('components.notifications.title')}</h3>
                <p className="text-caption text-[var(--text-tertiary)]">{t('components.notifications.unread', { count: unread })}</p>
              </div>
              {unread > 0 && (
                <button type="button" onClick={markAll} className="h-8 px-2 -mr-2 rounded-[var(--radius-sm)] text-caption font-semibold text-[var(--color-brand-strong)] hover:bg-[var(--bg-hover)] inline-flex items-center gap-1">
                  <CheckCheck className="w-3 h-3" /> {t('components.notifications.markAllRead')}
                </button>
              )}
            </div>

            {loading ? (
              <div className="divide-y divide-[var(--border-subtle)]" role="status" aria-busy="true">
                <span className="sr-only">{t('common.loading')}</span>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <Skeleton className="w-7 h-7 flex-shrink-0" rounded="full" />
                    <div className="flex-1 space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-3.5 w-4/5" /></div>
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <div className="py-8 px-6 text-center" role="alert">
                <Illustration name="error" size={88} className="mx-auto mb-2" />
                <div className="type-small font-semibold text-[var(--text-primary)]">{t('ui.empty.error.title')}</div>
                <button type="button" onClick={openPanel} className="mt-3 inline-flex items-center h-9 px-3.5 rounded-[var(--radius-md)] border border-[var(--border-default)] text-small font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                  {t('ui.state.retry')}
                </button>
              </div>
            ) : notes.length === 0 ? (
              <div className="py-8 px-6 text-center">
                <Illustration name="inbox" size={88} className="mx-auto mb-2" />
                <div className="type-small font-semibold text-[var(--text-primary)]">{t('components.notifications.emptyTitle')}</div>
                <div className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('components.notifications.emptyBody')}</div>
              </div>
            ) : (
              <>
                <ul className="max-h-[min(420px,60vh)] overflow-y-auto divide-y divide-[var(--border-subtle)]">
                  {notes.map((n, idx) => (
                    <li key={n.id} className={`relative group ${!n.read_at ? 'bg-[var(--color-brand-soft)]/40' : ''}`}>
                      <button
                        ref={el => (rowRefs.current[idx] = el)}
                        type="button"
                        onClick={() => pick(n)}
                        onFocus={() => setFocusIdx(idx)}
                        className="w-full text-left flex items-start gap-3 pl-4 pr-4 py-3 hover:bg-[var(--bg-hover)] focus:bg-[var(--bg-hover)] focus:outline-none transition-colors"
                      >
                        <span className="relative mt-0.5">
                          <KindIcon kind={n.kind} size={28} />
                          {!n.read_at && <span aria-hidden className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--color-brand)] ring-2 ring-[var(--bg-primary)]" />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="flex items-baseline gap-2">
                            <span className="text-caption font-medium text-[var(--text-tertiary)] truncate first-letter:uppercase">{notificationKindLabel(n.kind)}</span>
                            <span className="ml-auto text-caption text-[var(--text-tertiary)] whitespace-nowrap tabular-nums">{shortTime(n.created_at)}</span>
                          </span>
                          <span className={`block text-small ${!n.read_at ? 'font-semibold text-[var(--text-primary)]' : 'font-medium text-[var(--text-secondary)]'}`}>{n.subject}</span>
                          {n.body && <span className="block text-caption text-[var(--text-tertiary)] mt-0.5 line-clamp-2">{n.body}</span>}
                        </span>
                      </button>
                      {!n.read_at && (
                        <button
                          type="button"
                          onClick={(e) => markOne(n.id, e)}
                          className="absolute right-3 bottom-2 h-7 px-2 rounded-[var(--radius-sm)] text-caption font-semibold text-[var(--color-brand-strong)] bg-[var(--bg-primary)] border border-[var(--border-default)] opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                        >{t('components.notifications.markRead')}</button>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => { setOpen(false); navigate('/inbox') }}
                    className="w-full h-11 inline-flex items-center justify-center gap-1 text-caption font-semibold text-[var(--color-brand-strong)] hover:bg-[var(--bg-hover)]"
                  >{t('components.notifications.viewAll')} <ArrowRight className="w-3 h-3" aria-hidden /></button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Localised label for a notification `kind` (falls back to the humanised slug). */
export function notificationKindLabel(kind: string): string {
  return i18n.t(`components.notifications.kinds.${kind}`, { defaultValue: kind.replace(/_/g, ' ') })
}

/** BCP-47 locale for Intl formatting in the current UI language (undefined = browser default). */
export function uiLocale(): string | undefined {
  const lng = i18n.language ?? 'en'
  return lng.startsWith('zh') ? 'zh-CN' : lng.startsWith('th') ? 'th-TH' : undefined
}
