import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ArrowRight } from 'lucide-react'
import type { AuditExplorerEntry } from '../../lib/api'
import { localeFor } from '../../lib/fmt'
import { StateBoundary, Skeleton } from '../ui'

const VERBS: Record<string, string> = {
  create: 'created', created: 'created',
  update: 'updated', updated: 'updated',
  delete: 'deleted', deleted: 'deleted',
  login: 'signedIn',
  approve: 'approved', approved: 'approved',
  reject: 'sentBack', rejected: 'sentBack',
  submit: 'submitted', submitted: 'submitted',
  review: 'reviewed', reviewed: 'reviewed',
  upload: 'uploaded', uploaded: 'uploaded',
  activate: 'activated', activated: 'activated',
  publish: 'published', published: 'published',
  assign: 'assigned', assigned: 'assigned',
  lock: 'locked', locked: 'locked',
}

/** "Zhang Min submitted 305-1" — humanised verb + the most specific object we have. */
export function describeActivity(e: AuditExplorerEntry, t: TFunction): { actor: string; text: string } {
  const actor = e.user_name ?? e.user_email ?? t('myDay.activity.system')
  const last = e.action.split('.').pop() ?? e.action
  const verb = VERBS[last]
  const d = (e.details ?? {}) as Record<string, unknown>
  const specific = [d.gri_code, d.label, d.filename, d.name].find(v => typeof v === 'string' && v) as string | undefined
  const noun = t(`myDay.activity.resource.${e.resource_type}`, { defaultValue: e.resource_type.replace(/_/g, ' ') })
  const object = specific ? (d.gri_code ? specific : `${noun} ${specific}`) : noun
  const text = verb
    ? t(`myDay.activity.verb.${verb}`, { object })
    : t('myDay.activity.verb.other', { action: last.replace(/[._]/g, ' '), object })
  return { actor, text }
}

function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function dayLabel(iso: string, t: TFunction, lng: string): string {
  const d = new Date(iso)
  const today = new Date()
  const y = new Date(); y.setDate(today.getDate() - 1)
  if (dayKey(iso) === dayKey(today.toISOString())) return t('myDay.activity.today')
  if (dayKey(iso) === dayKey(y.toISOString())) return t('myDay.activity.yesterday')
  return new Intl.DateTimeFormat(localeFor(lng), { weekday: 'short', month: 'short', day: 'numeric' }).format(d)
}

function timeOf(iso: string, lng: string): string {
  return new Intl.DateTimeFormat(localeFor(lng), { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

/**
 * Recent activity as a day-grouped timeline: a hairline rail, an initial per
 * actor, and humanised sentences ("Zhang Min submitted 305-1") instead of raw
 * audit strings.
 */
export default function ActivityTimeline({
  entries, loading, error, onRetry, className = '',
}: {
  entries: AuditExplorerEntry[] | null
  loading: boolean
  error?: unknown
  onRetry?: () => void
  className?: string
}) {
  const { t, i18n } = useTranslation()
  const lng = i18n.language

  const groups = useMemo(() => {
    const out: { key: string; label: string; items: AuditExplorerEntry[] }[] = []
    for (const e of entries ?? []) {
      const k = dayKey(e.created_at)
      let g = out.find(x => x.key === k)
      if (!g) { g = { key: k, label: dayLabel(e.created_at, t, lng), items: [] }; out.push(g) }
      g.items.push(e)
    }
    return out
  }, [entries, t, lng])

  return (
    <section aria-labelledby="activity-title" className={`surface-paper p-5 sm:p-6 min-w-0 ${className}`}>
      <header className="flex items-center justify-between gap-3 mb-4">
        <h2 id="activity-title" className="type-h3 text-[var(--text-primary)]">{t('myDay.recentActivity')}</h2>
        <Link
          to="/admin/audit"
          className="inline-flex items-center gap-1 h-8 px-2 -mr-2 rounded-[var(--radius-sm)] text-caption font-semibold text-[var(--color-brand-strong)] hover:bg-[var(--bg-hover)] whitespace-nowrap"
        >
          {t('myDay.viewAll')} <ArrowRight className="w-3 h-3" aria-hidden />
        </Link>
      </header>

      <StateBoundary
        loading={loading && entries == null}
        error={error}
        onRetry={onRetry}
        compact
        empty={entries != null && entries.length === 0}
        emptyState={{ art: false, title: t('myDay.activity.emptyTitle'), body: t('myDay.activity.none') }}
        errorState={{ art: false, title: t('myDay.warn.activity'), body: t('myDay.activity.errorBody') }}
        skeleton={
          <ul className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3">
                <Skeleton className="w-7 h-7 flex-shrink-0" rounded="full" />
                <Skeleton className="h-4 flex-1 max-w-[70%]" />
              </li>
            ))}
          </ul>
        }
      >
        <div className="space-y-5">
          {groups.map(g => (
            <div key={g.key}>
              <h3 className="text-caption font-semibold text-[var(--text-tertiary)] mb-2">{g.label}</h3>
              <ol className="relative">
                <span aria-hidden className="absolute left-[13px] top-3 bottom-3 w-px bg-[var(--border-subtle)]" />
                {g.items.map(e => {
                  const { actor, text } = describeActivity(e, t)
                  return (
                    <li key={e.id} className="relative flex items-start gap-3 py-1.5">
                      <span
                        aria-hidden
                        className="relative z-[1] flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-caption font-semibold bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] ring-4 ring-[var(--bg-primary)]"
                      >
                        {actor.trim().charAt(0).toUpperCase()}
                      </span>
                      <p className="flex-1 min-w-0 type-small text-[var(--text-secondary)] pt-1">
                        <strong className="font-semibold text-[var(--text-primary)]">{actor}</strong>{' '}
                        {text}
                      </p>
                      <time dateTime={e.created_at} className="pt-1 text-caption text-[var(--text-tertiary)] tabular-nums whitespace-nowrap">
                        {timeOf(e.created_at, lng)}
                      </time>
                    </li>
                  )
                })}
              </ol>
            </div>
          ))}
        </div>
      </StateBoundary>
    </section>
  )
}
