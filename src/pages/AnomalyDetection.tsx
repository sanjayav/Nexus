import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  RotateCw, Eye, CheckCircle2, XCircle, Sparkles, Copy, Check, Lock, ChevronDown, ArrowRight, Settings2,
} from 'lucide-react'
import { orgStore, type AnomalyScanResult, type AnomalyType, type AnomalyStatusValue, type Anomaly, type AnomalySeverity } from '../lib/orgStore'
import { ai, isUnconfiguredError, type AiAnomalyListItem } from '../lib/api'
import { useIntegrationStatus, integrationMissing } from '../lib/integrations'
import { useAuth } from '../auth/AuthContext'
import { resolveRole } from '../lib/rbac'
import PageHeader from '../components/PageHeader'
import SectionHeader from '../design-system/components/SectionHeader'
import Button from '../design-system/components/Button'
import AnomalyFeed from '../components/AnomalyFeed'
import SavedViewsBar from '../components/SavedViewsBar'
import { StatLedger, StateBoundary, StatusPill, notify, SkeletonLedger, SkeletonTable, SkeletonLines } from '../components/ui'
import { SeverityPill, SEVERITY_VAR, ANOMALY_STATUS_TONE, ReasonSheet, type SeverityKey } from '../components/analytics/anomaly'
import useOrgMarket from '../components/analytics/useOrgMarket'
import { useFmt } from '../lib/fmt'
import { itemLabel } from '../lib/itemLabel'
import { ease, listItemMotion, spring } from '../motion/tokens'

/**
 * Anomaly Detection — full-page. Everyone can see this, but the scope defaults
 * to their role (data contributor sees their own, plant manager sees their plant,
 * SO/admin sees the whole org). Suppressions are tracked with reason + actor.
 */
type StatusFilter = 'all' | AnomalyStatusValue
type SeverityFilter = 'all' | AnomalySeverity

const keyOf = (a: Anomaly) => `${a.assignment_id}|${a.anomaly_type}`
const sevKey = (s: string): SeverityKey => (['critical', 'warn', 'warning', 'info'].includes(s) ? (s as SeverityKey) : 'info')

export default function AnomalyDetection() {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const typeLabel = (ty: AnomalyType) => t(`anomalyPage.types.${ty}`, { defaultValue: ty })
  const { user } = useAuth()
  const role = resolveRole(user)
  const defaultScope = role === 'data_contributor' ? 'mine' : role === 'platform_admin' ? 'all' : 'role'
  const canSeeAll = role === 'platform_admin' || role === 'group_sustainability_officer' || role === 'auditor'
  const [scope, setScope] = useState<'mine' | 'role' | 'all'>(defaultScope)
  const [data, setData] = useState<AnomalyScanResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [statuses, setStatuses] = useState<Record<string, AnomalyStatusValue>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [refreshNonce, setRefreshNonce] = useState(0)
  // Dismiss requires a captured rationale so reviewers can audit why a flag was waved through.
  const [dismissTarget, setDismissTarget] = useState<Anomaly | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setErr(null)
    orgStore.anomalyScan(scope, { includeSuppressed: true, limit: 400 })
      .then(d => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(e => { if (!cancelled) { setErr(e instanceof Error ? e.message : t('anomalyPage.errors.loadFailed')); setLoading(false) } })
    return () => { cancelled = true }
  }, [scope, refreshNonce])

  // POST /api/org action update-anomaly-status. Flips locally on success;
  // the next scan reflects persisted state. Reversible changes offer Undo.
  const setStatus = useCallback(async (a: Anomaly, status: AnomalyStatusValue, note?: string, quiet = false) => {
    const key = keyOf(a)
    const prev = statuses[key] ?? 'open'
    setBusyKey(key)
    try {
      await orgStore.updateAnomalyStatus(key, status, note)
      setStatuses(s => ({ ...s, [key]: status }))
      if (!quiet) {
        notify.success(t(`anomalyPage.toast.${status}`, { title: a.headline }), {
          undo: status === 'dismissed' ? undefined : () => { void setStatus(a, prev, undefined, true) },
        })
      }
    } catch (e) {
      notify.error(t('anomalyPage.errors.statusUpdateFailed'), { description: e instanceof Error ? e.message : undefined })
      throw e
    } finally {
      setBusyKey(null)
    }
  }, [statuses, t])

  const anomalies = data?.anomalies ?? []
  const filteredAnomalies = useMemo(() => anomalies.filter(a => {
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false
    const status = statuses[keyOf(a)] ?? 'open'
    if (statusFilter !== 'all' && status !== statusFilter) return false
    return true
  }), [anomalies, severityFilter, statusFilter, statuses])

  const byType = useMemo(() => {
    const bt = data?.summary?.by_type ?? {}
    return (Object.entries(bt) as Array<[AnomalyType, number]>)
      .map(([type, count]) => ({ type, count: Number(count) || 0 }))
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [data])

  const topEntities = useMemo(() => {
    const map = new Map<string, { count: number; critical: number }>()
    for (const a of anomalies) {
      const name = a.entity_name ?? '—'
      const cur = map.get(name) ?? { count: 0, critical: 0 }
      cur.count += 1
      if (a.severity === 'critical') cur.critical += 1
      map.set(name, cur)
    }
    return Array.from(map.entries()).map(([entity, v]) => ({ entity, ...v })).sort((a, b) => b.count - a.count).slice(0, 6)
  }, [anomalies])

  const s = data?.summary
  const filtersActive = severityFilter !== 'all' || statusFilter !== 'all'

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: t('anomalyPage.breadcrumbs.data'), to: '/data' },
          { label: t('anomalyPage.breadcrumbs.anomalies') },
        ]}
        eyebrow={t('anomalyPage.header.eyebrow')}
        title={t('anomalyPage.header.title')}
        description={t('anomalyPage.header.description')}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div role="radiogroup" aria-label={t('anomalyPage.scope.aria')} className="flex items-center gap-0.5 p-0.5 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
              <Seg on={scope === 'mine'} onClick={() => setScope('mine')} layout="scope">{t('anomalyPage.scope.mine')}</Seg>
              <Seg on={scope === 'role'} onClick={() => setScope('role')} layout="scope">{t('anomalyPage.scope.role')}</Seg>
              {canSeeAll && <Seg on={scope === 'all'} onClick={() => setScope('all')} layout="scope">{t('anomalyPage.scope.all')}</Seg>}
            </div>
            <Button variant="secondary" size="md" onClick={() => setRefreshNonce(n => n + 1)} title={t('anomalyPage.scanNowTitle')} icon={<RotateCw className={`w-4 h-4 ${loading && data ? 'animate-spin' : ''}`} />}>
              {t('anomaly.scanNow')}
            </Button>
          </div>
        }
      />

      <StateBoundary
        loading={loading}
        error={err}
        onRetry={() => setRefreshNonce(n => n + 1)}
        hasData={!!data}
        skeleton={<div className="space-y-6"><SkeletonLedger items={4} /><SkeletonTable rows={5} /></div>}
        errorState={{ title: t('anomalyPage.errors.loadTitle') }}
      >
        <div className="space-y-8">
          {s && (
            <StatLedger
              aria-label={t('anomalyPage.headline.aria')}
              items={[
                { id: 'critical', label: t('anomalyPage.headline.critical'), value: s.critical, tone: s.critical > 0 ? 'danger' : 'neutral', hint: t('anomalyPage.headline.criticalHint'), onClick: () => { setSeverityFilter('critical'); setStatusFilter('all') } },
                { id: 'warn', label: t('anomalyPage.headline.warn'), value: s.warn, tone: s.warn > 0 ? 'warning' : 'neutral', hint: t('anomalyPage.headline.warnHint'), onClick: () => { setSeverityFilter('warn'); setStatusFilter('all') } },
                { id: 'info', label: t('anomalyPage.headline.info'), value: s.info, tone: 'info', hint: t('anomalyPage.headline.infoHint'), onClick: () => { setSeverityFilter('info'); setStatusFilter('all') } },
                { id: 'suppressed', label: t('anomalyPage.headline.suppressed'), value: s.suppressed_total, tone: 'success', hint: t('anomalyPage.headline.suppressedHint') },
              ]}
            />
          )}

          <SavedViewsBar
            page="anomalies"
            filters={{ scope, severityFilter, statusFilter }}
            onApply={(fv: { scope?: 'mine' | 'role' | 'all'; severityFilter?: SeverityFilter; statusFilter?: StatusFilter }) => {
              if (fv.scope) setScope(fv.scope)
              if (fv.severityFilter) setSeverityFilter(fv.severityFilter)
              if (fv.statusFilter) setStatusFilter(fv.statusFilter)
            }}
          />

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
            {/* ── Triage queue ── */}
            <section aria-labelledby="triage-h" className="min-w-0">
              <SectionHeader kicker={t('anomalyPage.triage.kicker')} title={t('anomalyPage.triage.title')} subtitle={t('anomalyPage.triage.subtitle')} />
              <div className="flex items-center gap-x-4 gap-y-2 flex-wrap mb-3" role="toolbar" aria-label={t('anomalyPage.filters.aria')}>
                <FilterGroup label={t('anomalyPage.filters.severity')}>
                  {(['all', 'critical', 'warn', 'info'] as SeverityFilter[]).map(sv => (
                    <Seg key={sv} on={severityFilter === sv} onClick={() => setSeverityFilter(sv)} dot={sv === 'all' ? undefined : sevKey(sv)} layout="sev">
                      {sv === 'all' ? t('common.all') : t(`anomalyPage.severity.${sv}`)}
                    </Seg>
                  ))}
                </FilterGroup>
                <FilterGroup label={t('anomalyPage.filters.status')}>
                  {(['all', 'open', 'investigating', 'resolved', 'dismissed'] as StatusFilter[]).map(st => (
                    <Seg key={st} on={statusFilter === st} onClick={() => setStatusFilter(st)} layout="status">
                      {st === 'all' ? t('common.all') : t(`anomaly.status.${st}`)}
                    </Seg>
                  ))}
                </FilterGroup>
              </div>

              <div className="surface-paper overflow-hidden">
                {filteredAnomalies.length === 0 ? (
                  <StateBoundary
                    empty
                    compact
                    emptyState={filtersActive
                      ? { variant: 'filtered', title: t('anomalyPage.triage.empty'), onClearFilters: () => { setSeverityFilter('all'); setStatusFilter('all') } }
                      : { variant: 'cleared', title: t('anomalyPage.triage.clearedTitle'), body: t('anomalyPage.triage.clearedBody') }}
                  >
                    {null}
                  </StateBoundary>
                ) : (
                  <ul className="divide-y divide-[var(--border-subtle)]">
                    <AnimatePresence initial={false}>
                      {filteredAnomalies.slice(0, 50).map(a => (
                        <TriageRow
                          key={keyOf(a)}
                          a={a}
                          status={statuses[keyOf(a)] ?? 'open'}
                          busy={busyKey === keyOf(a)}
                          typeLabel={typeLabel(a.anomaly_type)}
                          lang={i18n.language}
                          onInvestigate={() => setStatus(a, 'investigating').catch(() => {})}
                          onResolve={() => setStatus(a, 'resolved').catch(() => {})}
                          onDismiss={() => setDismissTarget(a)}
                        />
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
                {filteredAnomalies.length > 50 && (
                  <div className="px-5 py-3 border-t border-[var(--border-subtle)] text-caption text-[var(--text-tertiary)]">
                    {t('anomalyPage.triage.showingFirst', { shown: 50, total: f.number(filteredAnomalies.length) })}
                  </div>
                )}
              </div>
            </section>

            {/* ── Distribution + method ── */}
            <aside className="space-y-4 min-w-0" aria-label={t('anomalyPage.distribution.title')}>
              <MeterCard title={t('anomalyPage.distribution.byRuleType')} empty={t('anomalyPage.distribution.empty')} rows={byType.map(r => ({ key: r.type, label: typeLabel(r.type), count: r.count }))} />
              <MeterCard
                title={t('anomalyPage.distribution.topEntities')}
                empty={t('anomalyPage.distribution.empty')}
                rows={topEntities.map(e => ({ key: e.entity, label: e.entity, count: e.count, critical: e.critical }))}
              />
              <MethodDisclosure />
            </aside>
          </div>

          <section>
            <PersistedAnomaliesPanel />
          </section>

          <section>
            <SectionHeader kicker={t('anomalyPage.feed.kicker')} title={t('anomalyPage.feed.title')} subtitle={t('anomalyPage.feed.subtitle')} />
            <AnomalyFeed scope={scope} limit={100} title={t('anomalyPage.feed.feedTitle')} />
          </section>
        </div>
      </StateBoundary>

      <AnimatePresence>
        {dismissTarget && (
          <ReasonSheet
            key="dismiss"
            title={t('anomalyPage.dismissModal.title')}
            subject={dismissTarget.headline}
            body={t('anomalyPage.dismissModal.body')}
            label={t('anomalyPage.dismissModal.reasonLabel')}
            placeholder={t('anomalyPage.dismissModal.placeholder')}
            confirmLabel={t('anomalyPage.dismissModal.confirm')}
            counter={n => t('anomalyPage.dismissModal.charCount', { count: n })}
            onCancel={() => setDismissTarget(null)}
            onConfirm={async reason => {
              await setStatus(dismissTarget, 'dismissed', reason)
              setDismissTarget(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Triage row ───────────────────────────────────────── */

function TriageRow({ a, status, busy, typeLabel, lang, onInvestigate, onResolve, onDismiss }: {
  a: Anomaly
  status: AnomalyStatusValue
  busy: boolean
  typeLabel: string
  lang: string
  onInvestigate: () => void
  onResolve: () => void
  onDismiss: () => void
}) {
  const { t } = useTranslation()
  const f = useFmt()
  const sev = sevKey(a.severity)
  const delta = f.toNumber(a.delta_pct)
  const closed = status === 'resolved' || status === 'dismissed'
  return (
    <motion.li layout="position" {...listItemMotion} className="relative">
      <span className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full" style={{ background: SEVERITY_VAR[sev], opacity: closed ? 0.35 : 1 }} aria-hidden />
      <div className={`px-5 py-4 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-3 ${closed ? 'opacity-70' : ''}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityPill severity={sev} size="sm" />
            <span className="text-caption text-[var(--text-tertiary)]">{typeLabel}</span>
            <StatusPill tone={ANOMALY_STATUS_TONE[status]} size="sm" dot={status === 'investigating'} layoutId={`an-status-${a.assignment_id}-${a.anomaly_type}`}>{t(`anomaly.status.${status}`)}</StatusPill>
          </div>
          <div className="text-small font-semibold text-[var(--text-primary)] mt-1.5">{a.headline}</div>
          <div className="text-caption text-[var(--text-tertiary)] mt-0.5 flex items-center gap-x-1.5 flex-wrap">
            <span className="font-semibold text-[var(--color-brand)] tabular-nums">{a.gri_code}</span>
            <span className="truncate max-w-[36ch]">{itemLabel(a, lang)}</span>
            <span aria-hidden>·</span>
            <span>{a.entity_name}</span>
          </div>
        </div>
        <div className="flex md:flex-col items-center md:items-end justify-between gap-2">
          <div className="text-right tabular-nums">
            <div className="text-caption text-[var(--text-tertiary)] whitespace-nowrap">
              {f.number(a.prior, { maxFraction: 1 })} <ArrowRight className="inline w-3 h-3 -mt-0.5" aria-hidden /> <span className="text-small font-semibold text-[var(--text-primary)]">{f.number(a.current, { maxFraction: 1 })}</span>
            </div>
            {delta != null && (
              <div className={`text-caption font-semibold ${Math.abs(delta) > 50 ? 'text-[var(--status-danger)]' : Math.abs(delta) > 20 ? 'text-[var(--status-warning)]' : 'text-[var(--text-secondary)]'}`}>
                {f.delta(delta, { percent: true })}{a.prior_year ? <span className="font-normal text-[var(--text-tertiary)]"> {t('anomalyPage.triage.vsYear', { year: a.prior_year })}</span> : null}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <RowAction label={t('anomaly.investigate')} title={t('anomalyPage.triage.investigateTitle')} onClick={onInvestigate} disabled={busy || status === 'investigating'} icon={<Eye className="w-3.5 h-3.5" />} />
            <RowAction label={t('anomalyPage.triage.resolve')} title={t('anomalyPage.triage.resolveTitle')} onClick={onResolve} disabled={busy || status === 'resolved'} icon={<CheckCircle2 className="w-3.5 h-3.5" />} />
            <RowAction label={t('anomaly.dismiss')} title={t('anomalyPage.triage.dismissTitle')} onClick={onDismiss} disabled={busy || status === 'dismissed'} icon={<XCircle className="w-3.5 h-3.5" />} />
          </div>
        </div>
      </div>
    </motion.li>
  )
}

function RowAction({ label, title, onClick, disabled, icon }: { label: string; title: string; onClick: () => void; disabled?: boolean; icon: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="min-h-[36px] px-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-caption font-medium text-[var(--text-secondary)] inline-flex items-center gap-1.5 whitespace-nowrap hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-micro"
    >
      {icon}{label}
    </button>
  )
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 min-w-0 max-w-full">
      <span className="text-caption text-[var(--text-tertiary)] flex-shrink-0">{label}</span>
      <div className="flex items-center gap-0.5 p-0.5 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] overflow-x-auto [scrollbar-width:none]" role="radiogroup" aria-label={label}>
        {children}
      </div>
    </div>
  )
}

function Seg({ on, onClick, dot, layout, children }: { on: boolean; onClick: () => void; dot?: SeverityKey; layout: string; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={`relative min-h-[32px] px-2.5 rounded-[var(--radius-sm)] text-caption font-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-colors duration-micro ${on ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
    >
      {on && <motion.span layoutId={`seg-${layout}`} className="absolute inset-0 rounded-[var(--radius-sm)] bg-[var(--bg-primary)] shadow-[var(--shadow-card)]" transition={spring.snappy} />}
      {dot && <span className="relative w-1.5 h-1.5 rounded-full" style={{ background: SEVERITY_VAR[dot] }} aria-hidden />}
      <span className="relative">{children}</span>
    </button>
  )
}

function MeterCard({ title, empty, rows }: { title: string; empty: string; rows: Array<{ key: string; label: string; count: number; critical?: number }> }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const max = rows[0]?.count || 1
  return (
    <div className="surface-paper p-5">
      <h3 className="text-small font-semibold text-[var(--text-primary)] mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-caption text-[var(--text-tertiary)]">{empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r, i) => (
            <li key={r.key}>
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="text-caption text-[var(--text-secondary)] truncate">{r.label}</span>
                <span className="flex items-center gap-2 flex-shrink-0">
                  {r.critical ? <span className="text-caption font-medium text-[var(--status-danger)] tabular-nums">{t('anomalyPage.distribution.crit', { count: r.critical })}</span> : null}
                  <span className="text-caption font-semibold tabular-nums text-[var(--text-primary)]">{r.count}</span>
                </span>
              </div>
              <div className="h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                <motion.div
                  initial={reduce ? false : { width: '0%' }}
                  animate={{ width: `${Math.round((r.count / max) * 100)}%` }}
                  transition={{ duration: 0.7, delay: 0.1 + Math.min(i, 8) * 0.04, ease: ease.out }}
                  className="h-full rounded-full"
                  style={{ background: r.critical ? 'var(--status-danger)' : 'var(--chart-s2)' }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MethodDisclosure() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <div className="surface-paper overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-[var(--bg-hover)] transition-colors duration-micro"
      >
        <span>
          <span className="block text-small font-semibold text-[var(--text-primary)]">{t('anomalyPage.method.title')}</span>
          <span className="block text-caption text-[var(--text-tertiary)] mt-0.5">{t('anomalyPage.method.short')}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform duration-fast ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: ease.out }}
            className="overflow-hidden border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]"
          >
            {RULE_TYPES.map(r => (
              <li key={r} className="px-5 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-caption font-semibold text-[var(--text-primary)]">{t(`anomalyPage.rules.${r}.title`)}</span>
                  <span className="text-caption text-[var(--text-tertiary)] whitespace-nowrap">{t(`anomalyPage.rules.${r}.severity`)}</span>
                </div>
                <p className="text-caption text-[var(--text-secondary)] mt-0.5">{t(`anomalyPage.rules.${r}.desc`)}</p>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

const RULE_TYPES: AnomalyType[] = ['yoy_spike', 'magnitude_jump', 'z_score_outlier', 'trend_break', 'unit_change', 'missing_evidence', 'late_submission', 'narrative_gap', 'peer_deviation']

/* ─── Persisted anomalies + AI narrative ───────────────────
 * DB-stored `anomalies` rows (UUID-keyed) with an optional AI narrative.
 * The narrative is cached server-side on the row. Every narrative carries an
 * "AI-generated" label; when AI is off for the org or not configured for the
 * deployment the panel says so instead of offering a button that fails. */

type Narr = { text: string; generatedAt: string | null; loading: boolean; error: string | null; cached: boolean }

function PersistedAnomaliesPanel() {
  const { t } = useTranslation()
  const f = useFmt()
  const aiNotConfigured = t('anomalyPage.errors.aiNotConfigured')
  const [rows, setRows] = useState<AiAnomalyListItem[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const integrations = useIntegrationStatus()
  const market = useOrgMarket()
  const orgOff = !market.loading && !market.aiEnabled
  const deploymentOff = integrationMissing(integrations, 'ai')
  const aiUnavailable = orgOff || deploymentOff
  const [narratives, setNarratives] = useState<Record<string, Narr>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setErr(null)
    ai.listAnomaliesForNarration()
      .then(r => { if (!cancelled) { setRows(Array.isArray(r?.anomalies) ? r.anomalies : []); setLoading(false) } })
      .catch(e => { if (!cancelled) { setErr(e instanceof Error ? e.message : t('anomalyPage.errors.loadFailed')); setLoading(false) } })
    return () => { cancelled = true }
  }, [nonce])

  // Hydrate cached narratives from the list response — no extra round-trip.
  useEffect(() => {
    if (!rows) return
    setNarratives(prev => {
      const next = { ...prev }
      for (const r of rows) {
        if (r.ai_narrative && !next[r.id]) next[r.id] = { text: r.ai_narrative, generatedAt: r.ai_narrative_generated_at, loading: false, error: null, cached: true }
      }
      return next
    })
  }, [rows])

  const handleExplain = async (anomalyId: string, regenerate = false) => {
    setOpenId(anomalyId)
    const existing = narratives[anomalyId]
    if (existing && !regenerate && !existing.error) return
    setNarratives(s => ({ ...s, [anomalyId]: { text: existing?.text ?? '', generatedAt: existing?.generatedAt ?? null, loading: true, error: null, cached: existing?.cached ?? false } }))
    try {
      const r = await ai.narrateAnomaly(anomalyId, regenerate)
      setNarratives(s => ({ ...s, [anomalyId]: { text: r.narrative, generatedAt: r.generatedAt, loading: false, error: null, cached: r.cached } }))
      setRows(rs => rs ? rs.map(row => row.id === anomalyId ? { ...row, ai_narrative: r.narrative, ai_narrative_generated_at: r.generatedAt } : row) : rs)
    } catch (e) {
      const errMsg = isUnconfiguredError(e) ? aiNotConfigured : e instanceof Error ? e.message : t('anomalyPage.errors.aiRequestFailed')
      setNarratives(s => ({ ...s, [anomalyId]: { text: '', generatedAt: null, loading: false, error: errMsg, cached: false } }))
    }
  }

  const handleCopy = async (anomalyId: string) => {
    const n = narratives[anomalyId]
    if (!n?.text) return
    try {
      await navigator.clipboard.writeText(n.text)
      setCopiedId(anomalyId)
      setTimeout(() => setCopiedId(cur => (cur === anomalyId ? null : cur)), 1500)
    } catch {
      notify.error(t('anomalyPage.ai.copyFailed'))
    }
  }

  return (
    <>
      <SectionHeader
        kicker={t('anomalyPage.ai.kicker')}
        title={t('anomalyPage.ai.title')}
        subtitle={t('anomalyPage.ai.subtitle')}
        actions={<AiLabel />}
      />
      {aiUnavailable && (
        <div className="surface-paper p-4 mb-3 flex items-start gap-3" role="status">
          <span className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 bg-[var(--bg-secondary)] text-[var(--text-tertiary)]">
            <Lock className="w-4 h-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-small font-semibold text-[var(--text-primary)]">
              {orgOff ? t('anomalyPage.ai.orgOffTitle') : t('anomalyPage.ai.disabledTitle')}
            </div>
            <p className="text-caption text-[var(--text-secondary)] mt-0.5">
              {orgOff ? t('anomalyPage.ai.orgOffBody') : t('anomalyPage.ai.deploymentOffBody')}
            </p>
          </div>
          {orgOff && (
            <Link to="/settings" className="flex-shrink-0 inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] text-caption font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]">
              <Settings2 className="w-3.5 h-3.5" aria-hidden /> {t('anomalyPage.ai.openSettings')}
            </Link>
          )}
        </div>
      )}
      <div className="surface-paper overflow-hidden">
        <StateBoundary
          loading={loading}
          error={err}
          onRetry={() => setNonce(n => n + 1)}
          compact
          empty={!rows || rows.length === 0}
          skeleton={<div className="p-5"><SkeletonLines lines={4} /></div>}
          emptyState={{ variant: 'cleared', title: t('anomalyPage.ai.emptyTitle'), body: t('anomalyPage.ai.empty'), density: 'compact' }}
        >
          <ul className="divide-y divide-[var(--border-subtle)]">
            {(rows ?? []).map(r => {
              const isOpen = openId === r.id
              const n = narratives[r.id]
              const hasCached = !!r.ai_narrative
              const disabledForAi = aiUnavailable && !hasCached
              const ev = f.toNumber(r.expected_value)
              const av = f.toNumber(r.actual_value)
              const d = f.toNumber(r.deviation_pct)
              return (
                <li key={r.id}>
                  <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-3 items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <SeverityPill severity={r.severity} size="sm" />
                        {r.metric && <span className="text-caption text-[var(--text-tertiary)] tabular-nums">{r.metric}</span>}
                      </div>
                      <div className="text-small font-semibold text-[var(--text-primary)] mt-1.5">{r.title}</div>
                      <div className="text-caption text-[var(--text-tertiary)] mt-0.5">
                        {r.facility_name ?? t('anomalyPage.ai.noFacility')} · {r.scope != null && /scope|范围/i.test(String(r.scope)) ? String(r.scope) : t('anomalyPage.ai.scope', { scope: r.scope ?? '—' })}
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-4">
                      <div className="text-right tabular-nums">
                        <div className="text-caption text-[var(--text-tertiary)] whitespace-nowrap">
                          {f.number(ev, { maxFraction: 1 })} <ArrowRight className="inline w-3 h-3 -mt-0.5" aria-hidden /> <span className="text-small font-semibold text-[var(--text-primary)]">{f.number(av, { maxFraction: 1 })}</span>
                        </div>
                        {d != null && <div className={`text-caption font-semibold ${Math.abs(d) > 20 ? 'text-[var(--status-danger)]' : 'text-[var(--text-secondary)]'}`}>{f.delta(d, { percent: true })}</div>}
                      </div>
                      <button
                        type="button"
                        className="min-h-[36px] px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] text-caption font-medium inline-flex items-center gap-1.5 whitespace-nowrap text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-micro"
                        onClick={() => { if (isOpen) { setOpenId(null); return } handleExplain(r.id, false) }}
                        disabled={disabledForAi}
                        aria-expanded={isOpen}
                        aria-controls={`ai-panel-${r.id}`}
                        title={disabledForAi ? (orgOff ? t('anomalyPage.ai.orgOffTitle') : aiNotConfigured) : t('anomalyPage.ai.explainWithAi')}
                      >
                        {disabledForAi ? <Lock className="w-3.5 h-3.5" aria-hidden /> : <Sparkles className="w-3.5 h-3.5 text-[var(--color-brand)]" aria-hidden />}
                        {disabledForAi ? t('anomalyPage.ai.aiOff') : isOpen ? t('anomalyPage.ai.hide') : hasCached ? t('anomalyPage.ai.read') : t('anomalyPage.ai.explain')}
                      </button>
                    </div>
                  </div>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`ai-panel-${r.id}`}
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.24, ease: ease.out }}
                        className="overflow-hidden"
                      >
                        <div className="mx-5 mb-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                          <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                            <AiLabel />
                            {n?.text && !n.loading && (
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={() => handleCopy(r.id)} title={t('anomalyPage.ai.copyTitle')}
                                  className="min-h-[32px] px-2.5 rounded-[var(--radius-md)] text-caption font-medium inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                                  {copiedId === r.id ? <Check className="w-3.5 h-3.5" aria-hidden /> : <Copy className="w-3.5 h-3.5" aria-hidden />}
                                  {copiedId === r.id ? t('anomalyPage.ai.copied') : t('anomalyPage.ai.copy')}
                                </button>
                                <button type="button" onClick={() => handleExplain(r.id, true)} disabled={aiUnavailable}
                                  title={aiUnavailable ? aiNotConfigured : t('anomalyPage.ai.regenerateTitle')}
                                  className="min-h-[32px] px-2.5 rounded-[var(--radius-md)] text-caption font-medium inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed">
                                  {aiUnavailable ? <Lock className="w-3.5 h-3.5" aria-hidden /> : <RotateCw className="w-3.5 h-3.5" aria-hidden />}
                                  {t('anomalyPage.ai.regenerate')}
                                </button>
                              </div>
                            )}
                          </div>
                          {n?.loading ? (
                            <div aria-live="polite"><span className="sr-only">{t('anomalyPage.ai.generating')}</span><SkeletonLines lines={3} /></div>
                          ) : n?.error ? (
                            <p role="alert" className="text-small text-[var(--status-danger)]">{n.error}</p>
                          ) : n?.text ? (
                            <>
                              <p className="text-small text-[var(--text-primary)] whitespace-pre-wrap max-w-[75ch]">{n.text}</p>
                              <p className="mt-2 text-caption text-[var(--text-tertiary)]">
                                {t('anomalyPage.ai.generatedNote')}
                                {n.generatedAt && <> · {t('anomalyPage.ai.lastUpdated', { when: f.relative(n.generatedAt) })}</>}
                              </p>
                            </>
                          ) : (
                            <p className="text-small text-[var(--text-secondary)]">{t('anomalyPage.ai.noNarrative')}</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              )
            })}
          </ul>
        </StateBoundary>
      </div>
    </>
  )
}

/** Regulatory AI-content label (CAC labelling; also shown for global orgs). */
function AiLabel() {
  const { t } = useTranslation()
  return (
    <StatusPill tone="brand" icon={<Sparkles />} title={t('anomalyPage.ai.labelTitle')}>{t('anomalyPage.ai.label')}</StatusPill>
  )
}
