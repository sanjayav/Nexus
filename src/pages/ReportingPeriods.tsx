import { useCallback, useEffect, useId, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Lock, PlayCircle, Archive, CheckCircle2, Plus, Hash, X, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { orgStore, type ReportingPeriod } from '../lib/orgStore'
import { useFramework } from '../lib/frameworks'
import { FrameworkBadge } from '../components/FrameworkBadge'
import JourneyBar from '../components/JourneyBar'
import PageHeader from '../components/PageHeader'
import { StateBoundary, StatusPill, SkeletonCard, notify, useConfirm, type PillTone } from '../components/ui'
import { useFmt } from '../lib/fmt'
import { dur, ease, spring, popIn } from '../motion/tokens'
import { inputClass, labelClass, useDialogA11y } from '../components/settings/admin-tables/shared'

/**
 * Reporting cycle management. A period is the unit of reporting — FY2026 say.
 * Lifecycle: setup → active → locked → published → archived. Locked periods
 * are immutable; published can never be edited, only restated.
 *
 * `?new=1` opens the create drawer directly so other screens (Reports,
 * My Day) can deep-link their "Create reporting period" call to action.
 */
type Status = ReportingPeriod['status']
const LIFECYCLE: Status[] = ['setup', 'active', 'locked', 'published', 'archived']

const STATUS_TONE: Record<Status, { tone: PillTone; dot?: boolean }> = {
  setup: { tone: 'neutral' },
  active: { tone: 'success', dot: true },
  locked: { tone: 'warning' },
  published: { tone: 'brand' },
  archived: { tone: 'neutral' },
}

export default function ReportingPeriods() {
  const { t } = useTranslation()
  const { active: framework } = useFramework()
  const confirm = useConfirm()
  const [params, setParams] = useSearchParams()
  const [periods, setPeriods] = useState<ReportingPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [adding, setAdding] = useState(() => params.get('new') === '1')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setPeriods(await orgStore.listPeriods())
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void load() }, [load])

  // Deep link: /admin/periods?new=1 opens the drawer.
  useEffect(() => {
    if (params.get('new') === '1') setAdding(true)
  }, [params])

  const openDrawer = () => setAdding(true)
  const closeDrawer = () => {
    setAdding(false)
    if (params.has('new')) {
      const next = new URLSearchParams(params)
      next.delete('new')
      setParams(next, { replace: true })
    }
  }

  const scoped = periods.filter(p => p.framework_id === framework.id)

  const runTransition = async (p: ReportingPeriod, status: Status) => {
    setBusy(p.id)
    try {
      await orgStore.transitionPeriod(p.id, status)
      notify.success(t(`periods.toast.${status}`, { label: p.label }))
      await load()
    } catch (e) {
      notify.error(t('periods.alerts.transitionFailed', { message: e instanceof Error ? e.message : String(e) }))
    } finally {
      setBusy(null)
    }
  }

  const transition = async (p: ReportingPeriod, status: Status) => {
    if (status === 'locked') {
      const ok = await confirm({
        title: t('periods.confirm.lockTitle', { label: p.label }),
        description: t('periods.confirm.lockBody'),
        confirmLabel: t('periods.actions.lock'),
      })
      if (!ok) return
    } else if (status === 'published') {
      const ok = await confirm({
        title: t('periods.confirm.publishTitle', { label: p.label }),
        description: t('periods.confirm.publishBody'),
        confirmLabel: t('periods.actions.publish'),
        tone: 'destructive',
        requireText: p.label,
      })
      if (!ok) return
    } else if (status === 'archived') {
      const ok = await confirm({
        title: t('periods.confirm.archiveTitle', { label: p.label }),
        description: t('periods.confirm.archiveBody'),
        confirmLabel: t('periods.actions.archive'),
      })
      if (!ok) return
    }
    await runTransition(p, status)
  }

  return (
    <div className="page-container">
      <div className="mb-4"><JourneyBar variant="compact" /></div>

      <PageHeader
        title={t('periods.header.title')}
        description={t('periods.header.subtitle')}
        actions={
          <button type="button" onClick={openDrawer} className="btn-primary">
            <Plus className="w-4 h-4" aria-hidden /> {t('periods.newPeriod')}
          </button>
        }
      >
        <div className="flex items-center gap-2 text-caption text-[var(--text-tertiary)]">
          <span>{t('periods.header.framework')}</span>
          <FrameworkBadge size="md" />
        </div>
      </PageHeader>

      <StateBoundary
        loading={loading}
        error={error}
        onRetry={() => void load()}
        hasData={periods.length > 0}
        empty={scoped.length === 0}
        skeleton={
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        }
        errorState={{ title: t('periods.error.title'), body: t('periods.error.body') }}
        emptyState={{
          art: 'setup',
          title: t('periods.empty.title'),
          body: t('periods.empty.body'),
          cta: { label: t('periods.empty.cta'), onClick: openDrawer, icon: <Plus className="w-4 h-4" aria-hidden /> },
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {scoped.map((p, i) => (
            <PeriodCard key={p.id} period={p} index={i} busy={busy === p.id} onTransition={s => void transition(p, s)} />
          ))}
        </div>
      </StateBoundary>

      <AnimatePresence>
        {adding && (
          <NewPeriodDrawer
            key="drawer"
            onClose={closeDrawer}
            onSaved={async (label) => {
              notify.success(t('periods.toast.created', { label }))
              closeDrawer()
              await load()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function PeriodCard({ period: p, index, busy, onTransition }: {
  period: ReportingPeriod
  index: number
  busy: boolean
  onTransition: (s: Status) => void
}) {
  const { t } = useTranslation()
  const f = useFmt()
  const meta = STATUS_TONE[p.status]
  const actionBtn = 'inline-flex items-center gap-1.5 h-10 sm:h-9 px-3 rounded-[var(--radius-md)] text-small font-semibold whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <motion.article {...popIn(index)} className="surface-paper overflow-hidden flex flex-col" aria-labelledby={`period-${p.id}`}>
      <header className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={`period-${p.id}`} className="type-h3 text-[var(--text-primary)] truncate">{p.label}</h3>
          <p className="text-caption text-[var(--text-tertiary)] mt-0.5">
            {p.label.includes(String(p.year)) ? p.framework_id.toUpperCase() : `${t('periods.card.fy', { year: p.year })} · ${p.framework_id.toUpperCase()}`}
          </p>
        </div>
        <StatusPill tone={meta.tone} dot={meta.dot}>{t(`periods.status.${p.status}`)}</StatusPill>
      </header>

      <div className="px-5 pb-4">
        <LifecycleStepper status={p.status} />
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
        <Meta label={t('periods.card.start')} value={p.start_date ? f.date(p.start_date) : '—'} />
        <Meta label={t('periods.card.end')} value={p.end_date ? f.date(p.end_date) : '—'} />
        <Meta label={t('periods.card.deadline')} value={p.submission_deadline ? f.date(p.submission_deadline) : '—'} />
      </dl>

      {(p.locked_at || p.published_at) && (
        <div className="px-5 pt-4 space-y-2">
          {p.locked_at && (
            <p className="flex items-center gap-1.5 text-caption text-[var(--text-tertiary)]">
              <Lock className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
              <span className="whitespace-nowrap">{t('periods.card.lockedAt', { date: f.dateTime(p.locked_at) })}</span>
            </p>
          )}
          {p.published_at && (
            <div className="rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-caption font-semibold text-[var(--color-brand-strong)]">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
                <span className="whitespace-nowrap">{t('periods.card.publishedAt', { date: f.dateTime(p.published_at) })}</span>
              </p>
              {p.publish_hash && (
                <p className="flex items-center gap-1.5 mt-1 text-caption text-[var(--text-secondary)] min-w-0" title={p.publish_hash}>
                  <Hash className="w-3.5 h-3.5 flex-shrink-0" aria-label={t('periods.card.hash')} />
                  <span className="font-mono truncate">{p.publish_hash}</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <footer className="mt-auto px-5 py-4 flex items-center gap-2 flex-wrap">
        {p.status === 'setup' && (
          <button type="button" onClick={() => onTransition('active')} disabled={busy} className={`${actionBtn} bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-bg-hover)]`}>
            <PlayCircle className="w-4 h-4" aria-hidden /> {t('periods.actions.start')}
          </button>
        )}
        {p.status === 'active' && (
          <button type="button" onClick={() => onTransition('locked')} disabled={busy} className={`${actionBtn} border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]`}>
            <Lock className="w-4 h-4" aria-hidden /> {t('periods.actions.lock')}
          </button>
        )}
        {p.status === 'locked' && (
          <button type="button" onClick={() => onTransition('published')} disabled={busy} className={`${actionBtn} bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-bg-hover)]`}>
            <CheckCircle2 className="w-4 h-4" aria-hidden /> {t('periods.actions.publish')}
          </button>
        )}
        {p.status === 'published' && (
          <button type="button" onClick={() => onTransition('archived')} disabled={busy} className={`${actionBtn} border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]`}>
            <Archive className="w-4 h-4" aria-hidden /> {t('periods.actions.archive')}
          </button>
        )}
        {p.status === 'archived' && (
          <span className="text-caption text-[var(--text-tertiary)]">{t('periods.card.archivedNote')}</span>
        )}
        {p.status !== 'archived' && (
          <span className="text-caption text-[var(--text-tertiary)]">{t(`periods.next.${p.status}`)}</span>
        )}
      </footer>
    </motion.article>
  )
}

/** Compact five-step lifecycle: done steps filled, current ringed. */
function LifecycleStepper({ status }: { status: Status }) {
  const { t } = useTranslation()
  const current = LIFECYCLE.indexOf(status)
  return (
    <ol className="flex items-start" aria-label={t('periods.lifecycle.label')}>
      {LIFECYCLE.map((s, i) => {
        const done = i < current
        const isCurrent = i === current
        return (
          <li
            key={s}
            className="flex-1 min-w-0 flex flex-col items-start"
            aria-current={isCurrent ? 'step' : undefined}
          >
            <div className="flex items-center w-full">
              <span
                className={`flex-shrink-0 w-4 h-4 rounded-full inline-flex items-center justify-center border transition-colors ${
                  done
                    ? 'bg-[var(--color-brand)] border-[var(--color-brand)] text-[var(--btn-primary-fg)]'
                    : isCurrent
                      ? 'border-[var(--color-brand)] bg-[var(--bg-primary)] ring-4 ring-[var(--color-brand-soft)]'
                      : 'border-[var(--border-strong)] bg-[var(--bg-primary)]'
                }`}
                aria-hidden
              >
                {done && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand)]" />}
              </span>
              {i < LIFECYCLE.length - 1 && (
                <span className={`h-px flex-1 mx-1.5 ${i < current ? 'bg-[var(--color-brand)]' : 'bg-[var(--border-default)]'}`} aria-hidden />
              )}
            </div>
            <span
              className={`mt-1.5 text-caption truncate max-w-full pr-1 ${
                isCurrent ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-tertiary)] hidden sm:block'
              }`}
            >
              {t(`periods.status.${s}`)}
              <span className="sr-only">
                {done ? ` — ${t('periods.lifecycle.done')}` : isCurrent ? ` — ${t('periods.lifecycle.current')}` : ''}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--bg-primary)] px-5 py-2.5 sm:py-3 min-w-0 flex items-baseline justify-between gap-3 sm:block">
      <dt className="text-caption text-[var(--text-tertiary)] truncate">{label}</dt>
      <dd className="text-small font-medium text-[var(--text-primary)] sm:mt-0.5 whitespace-nowrap tabular-nums">{value}</dd>
    </div>
  )
}

function NewPeriodDrawer({ onClose, onSaved }: { onClose: () => void; onSaved: (label: string) => void | Promise<void> }) {
  const { t } = useTranslation()
  const { active: framework } = useFramework()
  const titleId = useId()
  const [year, setYear] = useState(new Date().getFullYear())
  const [label, setLabel] = useState(`FY ${new Date().getFullYear()}`)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [deadline, setDeadline] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const panelRef = useDialogA11y(true, () => { if (!busy) onClose() }, 'input')

  const save = async () => {
    setBusy(true)
    try {
      await orgStore.createPeriod({
        framework_id: framework.id,
        year, label,
        start_date: start || null,
        end_date: end || null,
        submission_deadline: deadline || null,
        notes: notes || null,
      })
      await onSaved(label)
    } catch (e) {
      notify.error(t('periods.alerts.createFailed', { message: e instanceof Error ? e.message : String(e) }))
    }
    setBusy(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: dur.fast, ease: ease.out }}
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'var(--bg-overlay)' }}
      onClick={() => { if (!busy) onClose() }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={spring.gentle}
        className="w-full sm:w-[480px] sm:max-w-[calc(100vw-2rem)] h-full bg-[var(--bg-elevated)] border-l border-[var(--border-default)] shadow-[var(--shadow-overlay)] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-[var(--border-subtle)]">
          <div className="min-w-0">
            <h2 id={titleId} className="type-h2 text-[var(--text-primary)]">{t('periods.drawer.title')}</h2>
            <p className="text-small text-[var(--text-secondary)] mt-1">{t('periods.drawer.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('periods.drawer.close')}
            className="flex-shrink-0 w-10 h-10 sm:w-8 sm:h-8 rounded-[var(--radius-md)] inline-flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        <form
          className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4"
          onSubmit={e => { e.preventDefault(); void save() }}
          id="new-period-form"
        >
          <div className="grid grid-cols-2 gap-3">
            <label htmlFor="period-year" className="block min-w-0">
              <span className={labelClass}>{t('periods.drawer.year')}</span>
              <input id="period-year" type="number" inputMode="numeric" value={year} onChange={e => setYear(Number(e.target.value))} className={`${inputClass} tabular-nums`} />
            </label>
            <label htmlFor="period-label" className="block min-w-0">
              <span className={labelClass}>{t('periods.drawer.label')}</span>
              <input id="period-label" value={label} onChange={e => setLabel(e.target.value)} className={inputClass} required />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label htmlFor="period-start" className="block min-w-0">
              <span className={labelClass}>{t('periods.card.start')}</span>
              <input id="period-start" type="date" value={start} onChange={e => setStart(e.target.value)} className={inputClass} />
            </label>
            <label htmlFor="period-end" className="block min-w-0">
              <span className={labelClass}>{t('periods.card.end')}</span>
              <input id="period-end" type="date" value={end} onChange={e => setEnd(e.target.value)} className={inputClass} />
            </label>
          </div>
          <label htmlFor="period-deadline" className="block">
            <span className={labelClass}>{t('periods.drawer.deadline')}</span>
            <input id="period-deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className={inputClass} />
          </label>
          <label htmlFor="period-notes" className="block">
            <span className={labelClass}>{t('periods.drawer.notes')}</span>
            <textarea id="period-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={`${inputClass} h-auto py-2.5 resize-none`} />
          </label>
        </form>

        <footer className="flex gap-2 px-5 sm:px-6 py-4 border-t border-[var(--border-subtle)] pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button type="button" onClick={onClose} className="btn-secondary">{t('common.cancel')}</button>
          <button type="submit" form="new-period-form" disabled={busy || !label.trim()} className="btn-primary flex-1">
            {busy ? t('periods.drawer.creating') : t('periods.drawer.create')}
          </button>
        </footer>
      </motion.div>
    </motion.div>
  )
}
