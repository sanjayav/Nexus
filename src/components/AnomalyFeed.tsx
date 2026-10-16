import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, AlertOctagon, Info, ArrowRight, Shield, X, RotateCw, Search,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import { orgStore, type Anomaly, type AnomalyScanResult, type AnomalyScope, type AnomalySeverity, type AnomalyType } from '../lib/orgStore'
import { slideInLeft, SPRING } from './motion'

/**
 * Role-scoped anomaly feed.
 * Drop it on any page with a `scope` — everything else is handled inside.
 *
 *   <AnomalyFeed scope="mine"   />  → data-contributor view
 *   <AnomalyFeed scope="role"   />  → plant/subsidiary/SO view (server decides)
 *   <AnomalyFeed scope="all"    />  → admin / audit view
 */
export default function AnomalyFeed({
  scope = 'role',
  limit = 20,
  title,
  variant = 'card',
}: {
  scope?: AnomalyScope
  limit?: number
  title?: string
  variant?: 'card' | 'embedded'
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [data, setData] = useState<AnomalyScanResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [filter, setFilter] = useState<AnomalySeverity | 'all'>('all')
  const [typeFilter] = useState<AnomalyType | 'all'>('all')
  const [showSuppressed, setShowSuppressed] = useState(false)
  const [supModal, setSupModal] = useState<Anomaly | null>(null)

  const load = async () => {
    setLoading(true); setErr(null)
    try {
      const d = await orgStore.anomalyScan(scope, { includeSuppressed: showSuppressed, limit })
      setData(d)
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('components.history.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [scope, showSuppressed, limit])

  const anomalies = (data?.anomalies ?? []).filter(a => (filter === 'all' || a.severity === filter) && (typeFilter === 'all' || a.anomaly_type === typeFilter))

  const wrapperClass = variant === 'card' ? 'surface-paper overflow-hidden' : ''

  return (
    <div className={wrapperClass}>
      <header className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: data && data.summary.critical > 0 ? 'var(--accent-red-light)' : 'var(--accent-teal-subtle)', color: data && data.summary.critical > 0 ? 'var(--accent-red)' : 'var(--color-brand)' }}>
            {data && data.summary.critical > 0 ? <AlertOctagon className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
          </span>
          <div>
            <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">{title ?? t('components.anomalyFeed.title')}</h3>
            {data && (
              <div className="text-caption text-[var(--text-tertiary)] mt-0.5 flex items-center gap-2">
                {data.summary.critical > 0 && <span className="text-[var(--accent-red)] font-semibold">{t('components.anomalyFeed.critical', { count: data.summary.critical })}</span>}
                {data.summary.critical > 0 && data.summary.warn > 0 && <span>·</span>}
                {data.summary.warn > 0 && <span className="text-[var(--accent-amber)] font-semibold">{t('components.anomalyFeed.warn', { count: data.summary.warn })}</span>}
                {(data.summary.critical > 0 || data.summary.warn > 0) && data.summary.info > 0 && <span>·</span>}
                {data.summary.info > 0 && <span>{t('components.anomalyFeed.info', { count: data.summary.info })}</span>}
                {data.summary.total === 0 && <span>{t('components.anomalyFeed.noneDetected')}</span>}
                {data.summary.suppressed_total > 0 && (
                  <>
                    <span>·</span>
                    <button className="underline text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" onClick={() => setShowSuppressed(s => !s)}>
                      {showSuppressed
                        ? t('components.anomalyFeed.hideSuppressed', { count: data.summary.suppressed_total })
                        : t('components.anomalyFeed.showSuppressed', { count: data.summary.suppressed_total })}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {data && (
            <>
              <SeverityTab active={filter === 'all'} onClick={() => setFilter('all')} count={data.summary.total}>{t('common.all')}</SeverityTab>
              <SeverityTab active={filter === 'critical'} onClick={() => setFilter('critical')} count={data.summary.critical} tone="critical">{t('components.anomalyFeed.tabCrit')}</SeverityTab>
              <SeverityTab active={filter === 'warn'} onClick={() => setFilter('warn')} count={data.summary.warn} tone="warn">{t('components.anomalyFeed.tabWarn')}</SeverityTab>
              <SeverityTab active={filter === 'info'} onClick={() => setFilter('info')} count={data.summary.info} tone="info">{t('components.anomalyFeed.tabInfo')}</SeverityTab>
            </>
          )}
          <button onClick={load} aria-label={t('components.anomalyFeed.refreshAria')} className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors" title={t('components.anomalyFeed.refresh')}>
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="p-8 space-y-2">
          <div className="skeleton h-[16px] rounded" />
          <div className="skeleton h-[16px] w-[85%] rounded" />
          <div className="skeleton h-[16px] w-[75%] rounded" />
        </div>
      ) : err ? (
        <div className="p-8 text-center text-[12.5px] text-[var(--accent-red)]">{err}</div>
      ) : anomalies.length === 0 ? (
        <div className="p-10 text-center">
          <div className="inline-flex w-12 h-12 rounded-full items-center justify-center mb-3" style={{ background: 'var(--accent-green-light)', color: 'var(--status-ok)' }}>
            <Shield className="w-6 h-6" />
          </div>
          <div className="text-[14px] font-semibold text-[var(--text-primary)]">{filter !== 'all' ? t('components.anomalyFeed.noneAt', { severity: t(`anomaly.severity.${filter}`) }) : t('components.anomalyFeed.noneDetectedTitle')}</div>
          <div className="text-[12px] text-[var(--text-tertiary)] mt-1 max-w-xs mx-auto">{t('components.anomalyFeed.allClear')}</div>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {anomalies.slice(0, limit).map((a, i) => (
            <AnomalyRow key={a.id} a={a} i={i} onOpen={() => navigate(`/data/entry/${a.assignment_id}`)} onSuppress={() => setSupModal(a)} onRestore={async () => { await orgStore.restoreAnomaly(a.assignment_id, a.anomaly_type); load() }} />
          ))}
          {anomalies.length > limit && (
            <li className="p-4 text-center">
              <button onClick={() => navigate('/analytics/anomalies')} className="text-[12px] font-semibold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] inline-flex items-center gap-1 link-underline">
                {t('components.anomalyFeed.seeAll', { count: anomalies.length })} <ArrowRight className="w-3 h-3" />
              </button>
            </li>
          )}
        </ul>
      )}

      <AnimatePresence>
        {supModal && (
          <SuppressModal
            anomaly={supModal}
            onClose={() => setSupModal(null)}
            onDone={() => { setSupModal(null); load() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function SeverityTab({ active, count, children, onClick, tone }: { active: boolean; count: number; children: React.ReactNode; onClick: () => void; tone?: 'critical' | 'warn' | 'info' }) {
  const baseColor =
    tone === 'critical' ? 'var(--accent-red)' :
    tone === 'warn' ? 'var(--accent-amber)' :
    tone === 'info' ? 'var(--accent-blue)' :
    'var(--text-secondary)'
  return (
    <button
      onClick={onClick}
      className="h-7 px-2.5 rounded-[6px] text-caption font-semibold inline-flex items-center gap-1.5 transition-all"
      style={{
        background: active ? 'var(--bg-secondary)' : 'transparent',
        color: active ? baseColor : 'var(--text-tertiary)',
        boxShadow: active ? 'inset 0 0 0 1px var(--border-default)' : 'none',
      }}
    >
      {children}
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  )
}

function AnomalyRow({ a, i, onOpen, onSuppress, onRestore }: { a: Anomaly; i: number; onOpen: () => void; onSuppress: () => void; onRestore: () => void }) {
  const color =
    a.severity === 'critical' ? { bg: 'var(--accent-red-light)', fg: 'var(--accent-red)', border: 'rgba(198,40,40,0.2)' }
    : a.severity === 'warn' ? { bg: 'var(--accent-amber-light)', fg: 'var(--accent-amber)', border: 'rgba(230,168,23,0.25)' }
    : { bg: 'var(--accent-blue-light)', fg: 'var(--accent-blue)', border: 'rgba(21,101,192,0.2)' }
  const { t } = useTranslation()
  const Icon = a.severity === 'critical' ? AlertOctagon : a.severity === 'warn' ? AlertTriangle : Info

  return (
    <motion.li {...slideInLeft(i)} className={`px-5 py-3.5 flex items-start gap-3 hover:bg-[var(--bg-secondary)] transition-colors group ${a.suppressed ? 'opacity-60' : ''}`}>
      <span className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: color.bg, color: color.fg }}>
        <Icon className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-micro uppercase tracking-[0.06em] font-bold" style={{ color: color.fg }}>
            {labelForType(a.anomaly_type)}
          </span>
          <span className="font-mono text-caption font-semibold text-[var(--color-brand)]">{a.gri_code}</span>
          <span className="text-caption text-[var(--text-tertiary)] truncate">{a.entity_name}</span>
        </div>
        <div className="text-[13px] font-semibold text-[var(--text-primary)] mt-1 tracking-[-0.005em] truncate">{a.headline}</div>
        <div className="text-caption text-[var(--text-secondary)] mt-0.5 leading-relaxed line-clamp-2">{a.detail}</div>
        {a.suppressed && (
          <div className="mt-2 text-caption text-[var(--text-tertiary)] italic">
            {t('components.anomalyFeed.suppressedBy', { by: a.suppressed.by, reason: a.suppressed.reason })}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <button onClick={onOpen} className="text-caption text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" title={t('components.anomalyFeed.openDisclosure')}>
          {t('components.anomalyFeed.open')} <Search className="w-3 h-3" />
        </button>
        {a.suppressed ? (
          <button onClick={onRestore} className="text-caption text-[var(--text-tertiary)] hover:text-[var(--text-primary)] inline-flex items-center gap-0.5" title={t('components.anomalyFeed.restoreTitle')}>
            <RotateCw className="w-3 h-3" /> {t('components.anomalyFeed.restore')}
          </button>
        ) : (
          <button onClick={onSuppress} className="text-caption text-[var(--text-tertiary)] hover:text-[var(--text-primary)] inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" title={t('components.anomalyFeed.suppressTitle')}>
            <X className="w-3 h-3" /> {t('components.anomalyFeed.suppress')}
          </button>
        )}
      </div>
    </motion.li>
  )
}

function SuppressModal({ anomaly, onClose, onDone }: { anomaly: Anomaly; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (reason.trim().length < 10) { setError(t('components.anomalyFeed.reasonTooShort')); return }
    setSubmitting(true); setError(null)
    try {
      await orgStore.suppressAnomaly(anomaly.assignment_id, anomaly.anomaly_type, reason.trim())
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('components.anomalyFeed.suppressFailed'))
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(11,18,32,0.5)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} transition={SPRING}
        onClick={e => e.stopPropagation()}
        className="surface-paper max-w-md w-full p-6"
      >
        <span className="kicker">{t('components.anomalyFeed.suppressAnomaly')}</span>
        <h2 className="text-display text-[20px] text-[var(--text-primary)] mt-1">{anomaly.headline}</h2>
        <p className="text-[12.5px] text-[var(--text-secondary)] mt-2 leading-relaxed">
          {t('components.anomalyFeed.suppressBody')}
        </p>

        <label className="block mt-4">
          <span className="text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)] mb-1.5 block">{t('components.anomalyFeed.reason')}</span>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={t('components.anomalyFeed.reasonPlaceholder')}
            rows={3}
            className="w-full px-3 py-2.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/15 outline-none resize-none transition-all"
          />
          <div className="text-caption text-[var(--text-tertiary)] mt-1">{t('components.anomalyFeed.charCount', { n: reason.trim().length })}</div>
        </label>

        {error && <div className="mt-3 p-2.5 rounded-[8px] bg-[var(--accent-red-light)] text-[var(--accent-red)] text-caption">{error}</div>}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-9 px-4 rounded-[8px] text-[13px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">{t('common.cancel')}</button>
          <button
            onClick={submit}
            disabled={submitting || reason.trim().length < 10}
            className="h-9 px-4 rounded-[8px] text-[13px] font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #E6A817, #D97706)' }}
          >
            {submitting ? t('savedViews.saving') : t('components.anomalyFeed.suppress')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function labelForType(type: AnomalyType): string {
  return i18n.t(`components.anomalyFeed.types.${type}`)
}
