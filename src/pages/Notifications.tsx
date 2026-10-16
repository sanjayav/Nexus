import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCheck, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { orgStore, type Notification } from '../lib/orgStore'
import PageHeader from '../components/PageHeader'
import { StateBoundary, Skeleton, notify } from '../components/ui'
import { notificationKindLabel } from '../components/NotificationsBell'
import { KindIcon, dayBucket, relativeTime } from '../components/myday/notificationBits'
import { dur, ease } from '../motion/tokens'

/**
 * Full notifications inbox. RBAC is enforced server-side — /api/notifications
 * only returns rows where recipient_email = caller. Loads 20 at a time with
 * "Load more", filters by kind (server) and unread (client), and groups rows
 * by day. Loading, error, empty, "all read" and "filtered" are distinct states.
 */
const PAGE = 20

export default function NotificationsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [notes, setNotes] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filterKind, setFilterKind] = useState<string>('all')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [kinds, setKinds] = useState<string[]>([])
  const [, setFocusIdx] = useState(0)
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([])

  const load = useCallback(async (newOffset = 0, kind?: string) => {
    const opts: { limit: number; offset: number; kind?: string } = { limit: PAGE, offset: newOffset }
    if (kind && kind !== 'all') opts.kind = kind
    const res = await orgStore.inboxNotifications(opts)
    if (newOffset === 0) setNotes(res.notifications)
    else setNotes(prev => [...prev, ...res.notifications])
    setUnread(res.unread)
    setTotal(res.total)
    setOffset(newOffset + res.notifications.length)
    // Remember every kind we have seen so the chip row doesn't collapse when filtered.
    setKinds(prev => Array.from(new Set([...prev, ...res.notifications.map(n => n.kind)])).sort())
  }, [])

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    load(0, filterKind)
      .then(() => setLoaded(true))
      .catch(e => setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => setLoading(false))
  }, [load, filterKind])

  useEffect(() => { reload() }, [reload])

  const loadMore = async () => {
    setLoadingMore(true)
    try { await load(offset, filterKind) }
    catch (e) { notify.error(t('tasks.inbox.loadMoreFailed'), { description: e instanceof Error ? e.message : undefined }) }
    finally { setLoadingMore(false) }
  }

  const markAll = async () => {
    const count = unread
    try {
      await orgStore.markAllNotificationsRead()
      setNotes(n => n.map(x => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })))
      setUnread(0)
      notify.success(t('tasks.inbox.markedAll', { count }))
    } catch (e) {
      notify.error(t('tasks.inbox.markFailed'), { description: e instanceof Error ? e.message : undefined })
    }
  }

  const markOne = async (n: Notification) => {
    if (n.read_at) return
    // Optimistic: the dot fades immediately; roll back if the server refuses.
    setNotes(arr => arr.map(x => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
    setUnread(u => Math.max(0, u - 1))
    try {
      await orgStore.markNotificationRead(n.id)
    } catch (e) {
      setNotes(arr => arr.map(x => x.id === n.id ? { ...x, read_at: null } : x))
      setUnread(u => u + 1)
      notify.error(t('tasks.inbox.markFailed'), { description: e instanceof Error ? e.message : undefined })
    }
  }

  const open = async (n: Notification) => {
    void markOne(n)
    if (n.route) navigate(n.route)
  }

  const visible = useMemo(() => (unreadOnly ? notes.filter(n => !n.read_at) : notes), [notes, unreadOnly])

  const groups = useMemo(() => {
    const out: { key: string; label: string; items: { n: Notification; idx: number }[] }[] = []
    visible.forEach((n, idx) => {
      const b = dayBucket(n.created_at, t, i18n.language)
      let g = out.find(x => x.key === b.key)
      if (!g) { g = { key: b.key, label: b.label, items: [] }; out.push(g) }
      g.items.push({ n, idx })
    })
    return out
  }, [visible, t, i18n.language])

  // Keyboard nav — Up/Down arrows move focus, Enter opens.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusIdx(i => {
          const ni = Math.min(visible.length - 1, i + 1)
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
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible.length])

  const kindFiltered = filterKind !== 'all'
  const nothingAtAll = loaded && total === 0 && !kindFiltered

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <PageHeader
        title={t('shell.nav.items.inbox')}
        description={loaded && !error ? t('components.inbox.description', { total, unread }) : undefined}
        actions={unread > 0 ? (
          <button
            type="button"
            onClick={markAll}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap"
          >
            <CheckCheck className="w-4 h-4" aria-hidden /> {t('components.notifications.markAllRead')}
          </button>
        ) : undefined}
      />

      {!nothingAtAll && !error && (
        <div className="flex items-center gap-2 flex-wrap" role="toolbar" aria-label={t('tasks.inbox.filterAria')}>
          <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] p-0.5" role="group">
            {[false, true].map(u => (
              <button
                key={String(u)}
                type="button"
                aria-pressed={unreadOnly === u}
                onClick={() => setUnreadOnly(u)}
                className={`h-9 px-3 rounded-[var(--radius-sm)] text-small font-semibold whitespace-nowrap transition-colors ${
                  unreadOnly === u
                    ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-[var(--shadow-card)]'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {u ? t('tasks.inbox.unreadOnly', { count: unread }) : t('tasks.inbox.all')}
              </button>
            ))}
          </div>
          {kinds.length > 1 && (
            <>
              <span className="w-px h-5 bg-[var(--border-default)] mx-1" aria-hidden />
              <button type="button" onClick={() => setFilterKind('all')} className={`chip h-8 ${filterKind === 'all' ? 'chip-active' : ''}`} aria-pressed={filterKind === 'all'}>
                {t('tasks.inbox.allKinds')}
              </button>
              {kinds.map(k => (
                <button key={k} type="button" onClick={() => setFilterKind(k)} className={`chip h-8 ${filterKind === k ? 'chip-active' : ''}`} aria-pressed={filterKind === k}>
                  <span className="inline-block first-letter:uppercase">{notificationKindLabel(k)}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      <StateBoundary
        loading={loading && !loaded}
        hasData={loaded && !kindFiltered}
        error={error}
        onRetry={reload}
        errorState={{ title: t('tasks.inbox.errorTitle'), body: t('tasks.inbox.errorBody') }}
        skeleton={<InboxSkeleton />}
        empty={loaded && visible.length === 0}
        emptyState={
          nothingAtAll
            ? { art: 'inbox', title: t('components.inbox.emptyTitle'), body: t('components.inbox.emptyBody'), cta: { label: t('tasks.inbox.openTasks'), to: '/my-tasks' } }
            : unreadOnly && notes.length > 0
              ? { variant: 'cleared', title: t('tasks.inbox.clearedTitle'), body: t('tasks.inbox.clearedBody'), secondaryCta: { label: t('tasks.inbox.showAll'), onClick: () => setUnreadOnly(false) } }
              : { variant: 'filtered', title: t('tasks.inbox.filteredTitle'), body: t('tasks.inbox.filteredBody'), onClearFilters: () => { setFilterKind('all'); setUnreadOnly(false) } }
        }
      >
        <div className={`space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {groups.map(g => (
            <section key={g.key} aria-labelledby={`inbox-day-${g.key}`}>
              <h2 id={`inbox-day-${g.key}`} className="text-caption font-semibold text-[var(--text-tertiary)] mb-2 px-1">{g.label}</h2>
              <ul className="surface-paper overflow-hidden divide-y divide-[var(--border-subtle)]">
                {g.items.map(({ n, idx }) => (
                  <InboxRow
                    key={n.id}
                    n={n}
                    buttonRef={el => (rowRefs.current[idx] = el)}
                    onOpen={() => open(n)}
                    onFocus={() => setFocusIdx(idx)}
                    onMarkRead={() => markOne(n)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </StateBoundary>

      {loaded && !error && notes.length < total && (
        <div className="text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
          >
            {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
            {t('components.inbox.loadMore', { count: total - notes.length })}
          </button>
        </div>
      )}
    </div>
  )
}

function InboxRow({
  n, buttonRef, onOpen, onFocus, onMarkRead,
}: {
  n: Notification
  buttonRef: (el: HTMLButtonElement | null) => void
  onOpen: () => void
  onFocus: () => void
  onMarkRead: () => void
}) {
  const { t, i18n } = useTranslation()
  const isUnread = !n.read_at
  return (
    <li className={`relative group transition-colors ${isUnread ? 'bg-[var(--color-brand-soft)]/40' : ''}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={onOpen}
        onFocus={onFocus}
        className="w-full text-left flex items-start gap-3 pl-4 pr-4 sm:pr-28 py-3.5 min-h-[64px] hover:bg-[var(--bg-hover)] active:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-inset transition-colors"
      >
        <span className="relative mt-0.5">
          <KindIcon kind={n.kind} />
          <AnimatePresence initial={false}>
            {isUnread && (
              <motion.span
                key="dot"
                aria-hidden
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--color-brand)] ring-2 ring-[var(--bg-primary)]"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: dur.fast, ease: ease.out }}
              />
            )}
          </AnimatePresence>
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-baseline gap-2 min-w-0">
            <span className="text-caption font-medium text-[var(--text-tertiary)] truncate first-letter:uppercase">{notificationKindLabel(n.kind)}</span>
            <span className="ml-auto sm:ml-2 text-caption text-[var(--text-tertiary)] whitespace-nowrap tabular-nums">{relativeTime(n.created_at, i18n.language)}</span>
          </span>
          <span className={`block mt-0.5 type-small ${isUnread ? 'font-semibold text-[var(--text-primary)]' : 'font-medium text-[var(--text-secondary)]'}`}>
            {isUnread && <span className="sr-only">{t('tasks.inbox.unreadSr')} </span>}
            {n.subject}
          </span>
          {n.body && <span className="block text-caption text-[var(--text-tertiary)] mt-0.5 line-clamp-2">{n.body}</span>}
        </span>
      </button>
      {isUnread && (
        <button
          type="button"
          onClick={onMarkRead}
          className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center h-8 px-2.5 rounded-[var(--radius-sm)] text-caption font-semibold text-[var(--color-brand-strong)] bg-[var(--bg-primary)] border border-[var(--border-default)] opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
        >
          {t('components.notifications.markRead')}
        </button>
      )}
    </li>
  )
}

function InboxSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3.5 w-16 mb-2" />
      <div className="surface-paper divide-y divide-[var(--border-subtle)]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-4">
            <Skeleton className="w-8 h-8 flex-shrink-0" rounded="full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

