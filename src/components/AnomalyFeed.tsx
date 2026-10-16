import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, RotateCw, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { orgStore, type Anomaly, type AnomalyScanResult, type AnomalyScope, type AnomalySeverity } from '../lib/orgStore'
import { StateBoundary, notify, SkeletonLines } from './ui'
import { SeverityPill, SEVERITY_VAR, ReasonSheet, type SeverityKey } from './analytics/anomaly'
import { itemLabel } from '../lib/itemLabel'
import { transition, staggerDelay } from '../motion/tokens'

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
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [data, setData] = useState<AnomalyScanResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<unknown>(null)
  const [filter, setFilter] = useState<AnomalySeverity | 'all'>('all')
  const [showSuppressed, setShowSuppressed] = useState(false)
  const [supModal, setSupModal] = useState<Anomaly | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      setData(await orgStore.anomalyScan(scope, { includeSuppressed: showSuppressed, limit }))
    } catch (e) {
      setErr(e instanceof Error ? e : t('anomalyPage.feedWidget.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [scope, showSuppressed, limit, t])

  useEffect(() => { load() }, [load])

  const all = data?.anomalies ?? []
  const anomalies = all.filter(a => filter === 'all' || a.severity === filter)
  const s = data?.summary

  const restore = async (a: Anomaly) => {
    try {
      await orgStore.restoreAnomaly(a.assignment_id, a.anomaly_type)
      notify.success(t('anomalyPage.feedWidget.restoredToast'))
      load()
    } catch (e) {
      notify.error(t('anomalyPage.feedWidget.restoreFailed'), { description: e instanceof Error ? e.message : undefined })
    }
  }

  return (
    <div className={variant === 'card' ? 'surface-paper overflow-hidden' : ''}>
      <header className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="type-h3 text-[var(--text-primary)]">{title ?? t('anomalyPage.feedWidget.title')}</h3>
          {s && (
            <div className="text-caption text-[var(--text-tertiary)] mt-0.5 flex items-center gap-x-2 gap-y-1 flex-wrap">
              {s.total === 0 && <span>{t('anomalyPage.feedWidget.noneDetected')}</span>}
              {s.critical > 0 && <span className="text-[var(--status-danger)] font-medium">{t('anomalyPage.feedWidget.critical', { count: s.critical })}</span>}
              {s.warn > 0 && <span className="text-[var(--status-warning)] font-medium">{t('anomalyPage.feedWidget.warn', { count: s.warn })}</span>}
              {s.info > 0 && <span>{t('anomalyPage.feedWidget.info', { count: s.info })}</span>}
              {s.suppressed_total > 0 && (
                <button type="button" className="underline underline-offset-2 hover:text-[var(--text-primary)]" onClick={() => setShowSuppressed(v => !v)}>
                  {showSuppressed
                    ? t('anomalyPage.feedWidget.hideSuppressed', { count: s.suppressed_total })
                    : t('anomalyPage.feedWidget.showSuppressed', { count: s.suppressed_total })}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {s && (
            <div role="radiogroup" aria-label={t('anomalyPage.filters.severity')} className="flex items-center gap-0.5 p-0.5 rounded-[var(--radius-md)] bg-[var(--bg-secondary)]">
              <Seg on={filter === 'all'} onClick={() => setFilter('all')} count={s.total}>{t('common.all')}</Seg>
              <Seg on={filter === 'critical'} onClick={() => setFilter('critical')} count={s.critical} dot="critical">{t('anomalyPage.feedWidget.tabCrit')}</Seg>
              <Seg on={filter === 'warn'} onClick={() => setFilter('warn')} count={s.warn} dot="warn">{t('anomalyPage.feedWidget.tabWarn')}</Seg>
              <Seg on={filter === 'info'} onClick={() => setFilter('info')} count={s.info} dot="info">{t('anomalyPage.feedWidget.tabInfo')}</Seg>
            </div>
          )}
          <button
            type="button"
            onClick={load}
            aria-label={t('anomalyPage.feedWidget.refreshAria')}
            title={t('anomalyPage.feedWidget.refresh')}
            className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors duration-micro"
          >
            <RotateCw className={`w-4 h-4 ${loading && data ? 'animate-spin' : ''}`} aria-hidden />
          </button>
        </div>
      </header>

      <StateBoundary
        loading={loading}
        error={err}
        onRetry={load}
        hasData={!!data}
        compact
        empty={anomalies.length === 0}
        skeleton={<div className="p-5"><SkeletonLines lines={4} /></div>}
        emptyState={
          filter !== 'all'
            ? { variant: 'filtered', title: t('anomalyPage.feedWidget.noneAt', { severity: t(`anomalyPage.severity.${filter}`) }), onClearFilters: () => setFilter('all'), density: 'compact' }
            : { variant: 'cleared', title: t('anomalyPage.feedWidget.noneDetectedTitle'), body: t('anomalyPage.feedWidget.allClear'), density: 'compact' }
        }
      >
        <ul className="divide-y divide-[var(--border-subtle)]">
          {anomalies.slice(0, limit).map((a, i) => (
            <FeedRow
              key={a.id ?? `${a.assignment_id}|${a.anomaly_type}`}
              a={a}
              i={i}
              lang={i18n.language}
              onOpen={() => navigate(`/data/entry/${a.assignment_id}`)}
              onSuppress={() => setSupModal(a)}
              onRestore={() => restore(a)}
            />
          ))}
          {anomalies.length > limit && (
            <li className="p-4 text-center">
              <Link to="/analytics/anomalies" className="text-caption font-medium text-[var(--color-brand)] hover:underline inline-flex items-center gap-1">
                {t('anomalyPage.feedWidget.seeAll', { count: anomalies.length })} <ArrowRight className="w-3 h-3" aria-hidden />
              </Link>
            </li>
          )}
        </ul>
      </StateBoundary>

      <AnimatePresence>
        {supModal && (
          <ReasonSheet
            key="suppress"
            title={t('anomalyPage.feedWidget.suppressAnomaly')}
            subject={supModal.headline}
            body={t('anomalyPage.feedWidget.suppressBody')}
            label={t('anomalyPage.feedWidget.reason')}
            placeholder={t('anomalyPage.feedWidget.reasonPlaceholder')}
            confirmLabel={t('anomalyPage.feedWidget.suppress')}
            counter={n => t('anomalyPage.feedWidget.charCount', { n })}
            onCancel={() => setSupModal(null)}
            onConfirm={async reason => {
              await orgStore.suppressAnomaly(supModal.assignment_id, supModal.anomaly_type, reason)
              setSupModal(null)
              notify.success(t('anomalyPage.feedWidget.suppressedToast'))
              load()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function Seg({ on, onClick, count, dot, children }: { on: boolean; onClick: () => void; count: number; dot?: SeverityKey; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={`min-h-[32px] px-2.5 rounded-[var(--radius-sm)] text-caption font-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-colors duration-micro ${on ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-[var(--shadow-card)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: SEVERITY_VAR[dot] }} aria-hidden />}
      {children}
      {count > 0 && <span className="tabular-nums text-[var(--text-tertiary)]">{count}</span>}
    </button>
  )
}

function FeedRow({ a, i, lang, onOpen, onSuppress, onRestore }: { a: Anomaly; i: number; lang: string; onOpen: () => void; onSuppress: () => void; onRestore: () => void }) {
  const { t } = useTranslation()
  const sev = (['critical', 'warn', 'info'].includes(a.severity) ? a.severity : 'info') as SeverityKey
  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transition.base, delay: staggerDelay(i) }}
      className={`relative px-5 py-3.5 flex items-start gap-3 hover:bg-[var(--bg-hover)] transition-colors duration-micro group ${a.suppressed ? 'opacity-60' : ''}`}
    >
      <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full" style={{ background: SEVERITY_VAR[sev] }} aria-hidden />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <SeverityPill severity={sev} size="sm" />
          <span className="text-caption text-[var(--text-tertiary)]">{t(`anomalyPage.feedWidget.types.${a.anomaly_type}`, { defaultValue: a.anomaly_type })}</span>
          <span className="text-caption font-semibold text-[var(--color-brand)] tabular-nums">{a.gri_code}</span>
          <span className="text-caption text-[var(--text-tertiary)] truncate">{a.entity_name}</span>
        </div>
        <div className="text-small font-medium text-[var(--text-primary)] mt-1.5">{a.headline}</div>
        <div className="text-caption text-[var(--text-secondary)] mt-0.5 line-clamp-2">{a.detail || itemLabel(a, lang)}</div>
        {a.suppressed && (
          <div className="mt-2 text-caption text-[var(--text-tertiary)]">
            {t('anomalyPage.feedWidget.suppressedBy', { by: a.suppressed.by, reason: a.suppressed.reason })}
          </div>
        )}
      </div>
      <div className="flex items-center gap-0.5 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity duration-micro">
        <button type="button" onClick={onOpen} title={t('anomalyPage.feedWidget.openDisclosure')} aria-label={t('anomalyPage.feedWidget.openDisclosure')}
          className="w-10 h-10 rounded-[var(--radius-md)] inline-flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--color-brand)] hover:bg-[var(--bg-secondary)]">
          <ArrowUpRight className="w-4 h-4" aria-hidden />
        </button>
        {a.suppressed ? (
          <button type="button" onClick={onRestore} title={t('anomalyPage.feedWidget.restoreTitle')} aria-label={t('anomalyPage.feedWidget.restore')}
            className="w-10 h-10 rounded-[var(--radius-md)] inline-flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">
            <RotateCw className="w-4 h-4" aria-hidden />
          </button>
        ) : (
          <button type="button" onClick={onSuppress} title={t('anomalyPage.feedWidget.suppressTitle')} aria-label={t('anomalyPage.feedWidget.suppress')}
            className="w-10 h-10 rounded-[var(--radius-md)] inline-flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">
            <X className="w-4 h-4" aria-hidden />
          </button>
        )}
      </div>
    </motion.li>
  )
}
