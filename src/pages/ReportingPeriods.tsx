import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Lock, PlayCircle, Archive, CheckCircle2, Plus, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { orgStore, type ReportingPeriod } from '../lib/orgStore'
import { useFramework } from '../lib/frameworks'
import { FrameworkBadge } from '../components/FrameworkBadge'
import JourneyBar from '../components/JourneyBar'
import { riseIn, popIn, SPRING } from '../components/motion'

/**
 * Reporting Period management. A period is the unit of reporting — FY2026 say.
 * Lifecycle: setup → active → locked → published. Locked periods are immutable;
 * published can never be edited, only restated.
 */
export default function ReportingPeriods() {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language?.startsWith('zh') ? 'zh-CN' : undefined
  const { active: framework } = useFramework()
  const [periods, setPeriods] = useState<ReportingPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    try {
      setPeriods(await orgStore.listPeriods())
    } catch { /* silent */ }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const scoped = periods.filter(p => p.framework_id === framework.id)

  const transition = async (id: string, status: ReportingPeriod['status'], confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return
    setBusy(id)
    try {
      await orgStore.transitionPeriod(id, status)
      await load()
    } catch (e) {
      alert(t('periods.alerts.transitionFailed', { message: e instanceof Error ? e.message : String(e) }))
    }
    setBusy(null)
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-4"><JourneyBar variant="compact" /></div>

      <motion.header {...riseIn(0)} className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--color-brand)]">
            <Calendar className="w-3 h-3" /> {t('periods.header.eyebrow')}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="font-display text-[28px] font-bold text-[var(--text-primary)]">{t('periods.header.title')}</h1>
            <FrameworkBadge size="md" />
          </div>
          <p className="text-[var(--text-sm)] text-[var(--text-secondary)] mt-1 max-w-2xl">
            {t('periods.header.subtitle')}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          onClick={() => setAdding(true)}
          className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-xs)] font-semibold hover:bg-[var(--color-brand-strong)] inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> {t('periods.newPeriod')}
        </motion.button>
      </motion.header>

      {loading ? (
        <div className="py-20 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" /></div>
      ) : scoped.length === 0 ? (
        <motion.div {...popIn(1)} className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] bg-[var(--bg-primary)] py-14 text-center">
          <Calendar className="w-10 h-10 mx-auto text-[var(--text-tertiary)] mb-2" />
          <h3 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">{t('periods.empty.title')}</h3>
          <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] mt-1 max-w-sm mx-auto">{t('periods.empty.body')}</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {scoped.map((p, i) => (
            <motion.div key={p.id} {...popIn(i)} className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden">
              <header className={`px-5 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between ${
                p.status === 'active' ? 'bg-[var(--color-brand-soft)]/40'
                : p.status === 'locked' ? 'bg-[var(--accent-amber-light)]'
                : p.status === 'published' ? 'bg-[var(--accent-green-light)]'
                : ''
              }`}>
                <div>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--color-brand)]">
                    {t('periods.card.fy', { year: p.year })}
                  </div>
                  <h3 className="font-display text-[var(--text-lg)] font-bold text-[var(--text-primary)]">{p.label}</h3>
                </div>
                <PeriodStatusPill status={p.status} />
              </header>
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Meta label={t('periods.card.start')}    value={p.start_date ?? '—'} />
                  <Meta label={t('periods.card.end')}      value={p.end_date ?? '—'} />
                  <Meta label={t('periods.card.deadline')} value={p.submission_deadline ?? '—'} />
                  <Meta label={t('periods.card.framework')} value={p.framework_id.toUpperCase()} />
                </div>
                {p.locked_at && <div className="text-[10px] text-[var(--text-tertiary)]">🔒 {t('periods.card.lockedAt', { date: new Date(p.locked_at).toLocaleString(dateLocale) })}</div>}
                {p.published_at && (
                  <div className="rounded-[var(--radius-sm)] bg-[var(--accent-green-light)] border border-[var(--status-ok)]/20 p-2">
                    <div className="text-[10px] font-semibold text-[var(--status-ok)] uppercase tracking-wider">{t('periods.card.published')}</div>
                    <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">{new Date(p.published_at).toLocaleString(dateLocale)}</div>
                    {p.publish_hash && <div className="text-[9px] font-mono text-[var(--text-tertiary)] mt-1 truncate">{p.publish_hash}</div>}
                  </div>
                )}

                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center gap-2 flex-wrap">
                  {p.status === 'setup' && (
                    <button onClick={() => transition(p.id, 'active')} disabled={busy === p.id} className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-brand)] text-white text-[var(--text-xs)] font-semibold inline-flex items-center gap-1 disabled:opacity-50">
                      <PlayCircle className="w-3 h-3" /> {t('periods.actions.start')}
                    </button>
                  )}
                  {p.status === 'active' && (
                    <button onClick={() => transition(p.id, 'locked', t('periods.confirm.lock', { label: p.label }))} disabled={busy === p.id} className="px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] text-[var(--text-xs)] font-semibold inline-flex items-center gap-1 disabled:opacity-50 hover:bg-[var(--bg-secondary)]">
                      <Lock className="w-3 h-3" /> {t('periods.actions.lock')}
                    </button>
                  )}
                  {p.status === 'locked' && (
                    <button onClick={() => transition(p.id, 'published', t('periods.confirm.publish', { label: p.label }))} disabled={busy === p.id} className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--status-ok)] text-white text-[var(--text-xs)] font-semibold inline-flex items-center gap-1 disabled:opacity-50">
                      <CheckCircle2 className="w-3 h-3" /> {t('periods.actions.publish')}
                    </button>
                  )}
                  {p.status === 'published' && (
                    <button onClick={() => transition(p.id, 'archived', t('periods.confirm.archive', { label: p.label }))} disabled={busy === p.id} className="px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] text-[var(--text-xs)] font-semibold inline-flex items-center gap-1 disabled:opacity-50 hover:bg-[var(--bg-secondary)]">
                      <Archive className="w-3 h-3" /> {t('periods.actions.archive')}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {adding && <NewPeriodDrawer onClose={() => setAdding(false)} onSaved={async () => { await load(); setAdding(false) }} />}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">{label}</div>
      <div className="text-[var(--text-xs)] text-[var(--text-primary)] mt-0.5">{value}</div>
    </div>
  )
}

function PeriodStatusPill({ status }: { status: ReportingPeriod['status'] }) {
  const { t } = useTranslation()
  const map = {
    setup:     { label: t('periods.status.setup'),     bg: 'var(--bg-tertiary)',       fg: 'var(--text-tertiary)' },
    active:    { label: t('periods.status.active'),    bg: 'var(--color-brand-soft)',  fg: 'var(--color-brand-strong)' },
    locked:    { label: t('periods.status.locked'),    bg: 'var(--accent-amber-light)', fg: 'var(--status-draft)' },
    published: { label: t('periods.status.published'), bg: 'var(--accent-green-light)', fg: 'var(--status-ok)' },
    archived:  { label: t('periods.status.archived'),  bg: 'var(--bg-secondary)',       fg: 'var(--text-tertiary)' },
  }[status]
  return <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: map.bg, color: map.fg }}>{map.label}</span>
}

function NewPeriodDrawer({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation()
  const { active: framework } = useFramework()
  const [year, setYear] = useState(new Date().getFullYear())
  const [label, setLabel] = useState(`FY ${new Date().getFullYear()}`)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [deadline, setDeadline] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

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
      onSaved()
    } catch (e) {
      alert(t('periods.alerts.createFailed', { message: e instanceof Error ? e.message : String(e) }))
    }
    setBusy(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <motion.div initial={{ x: 480 }} animate={{ x: 0 }} transition={SPRING} className="w-[480px] h-full bg-[var(--bg-primary)] shadow-2xl p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="font-display text-[var(--text-xl)] font-bold mb-5">{t('periods.drawer.title')}</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label htmlFor="period-year" className="block">
              <span className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">{t('periods.drawer.year')}</span>
              <input id="period-year" type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]" />
            </label>
            <label htmlFor="period-label" className="block">
              <span className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">{t('periods.drawer.label')}</span>
              <input id="period-label" value={label} onChange={e => setLabel(e.target.value)} className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label htmlFor="period-start" className="block">
              <span className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">{t('periods.card.start')}</span>
              <input id="period-start" type="date" value={start} onChange={e => setStart(e.target.value)} className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]" />
            </label>
            <label htmlFor="period-end" className="block">
              <span className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">{t('periods.card.end')}</span>
              <input id="period-end" type="date" value={end} onChange={e => setEnd(e.target.value)} className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]" />
            </label>
          </div>
          <label htmlFor="period-deadline" className="block">
            <span className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">{t('periods.drawer.deadline')}</span>
            <input id="period-deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]" />
          </label>
          <label htmlFor="period-notes" className="block">
            <span className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">{t('periods.drawer.notes')}</span>
            <textarea id="period-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-xs)] resize-none" />
          </label>
        </div>
        <div className="flex gap-2 mt-6 pt-4 border-t border-[var(--border-subtle)]">
          <button onClick={save} disabled={busy} className="flex-1 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-sm)] font-semibold disabled:opacity-50">{t('periods.drawer.create')}</button>
          <button onClick={onClose} className="px-4 py-2 rounded-[var(--radius-md)] text-[var(--text-sm)] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">{t('common.cancel')}</button>
        </div>
      </motion.div>
    </motion.div>
  )
}
