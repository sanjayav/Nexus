import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Eye, FileOutput, Hash, Shield } from 'lucide-react'
import { itemLabel } from '../lib/itemLabel'
import { nexus, type NexusQuestionnaireItem, type NexusDataValue } from '../lib/api'
import { computeReadiness, truncateHash, CAPITAL_ORDER, capitalLabelKey } from '../reports/spdTemplate'
import { useFmt } from '../lib/fmt'
import { useOrgBrand } from '../lib/useOrgBrand'
import SetupGuard from '../components/SetupGuard'
import PageHeader from '../components/PageHeader'
import { Button } from '../design-system'
import { EmptyState, NumberTicker, Skeleton, SkeletonLedger, StatLedger, StateBoundary, StatusPill } from '../components/ui'
import { barFill, riseIn } from '../motion/tokens'

const ACTIVE_YEAR = 2026

type Ready = { items: NexusQuestionnaireItem[]; reviewQueue: NexusDataValue[]; approvalQueue: NexusDataValue[] }

/**
 * Sustainability Officer workflow dashboard. Live readiness across the
 * reporting year: one segmented status bar, the status ledger, the two
 * queues, coverage by capital and the oldest items in flight.
 */
export default function Workflow() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const f = useFmt()
  const reduce = useReducedMotion()
  const brand = useOrgBrand()
  const [data, setData] = useState<Ready | null>(null)
  const [empty, setEmpty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [items, reviewQueue, approvalQueue] = await Promise.all([nexus.tree(), nexus.reviewQueue(), nexus.approvalQueue()])
      if (items.length === 0) { setEmpty(true); return }
      setData({ items, reviewQueue, approvalQueue })
      setEmpty(false)
    } catch (e) {
      setError(e ?? new Error(t('workflowPage.failedToLoad')))
    } finally {
      setLoading(false)
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load() }, [])

  const currentByItem = useMemo(() => {
    const m = new Map<string, NexusDataValue>()
    if (!data) return m
    for (const dv of data.reviewQueue) m.set(dv.questionnaire_item_id, dv)
    for (const dv of data.approvalQueue) m.set(dv.questionnaire_item_id, dv)
    return m
  }, [data])

  const r = useMemo(() => (data ? computeReadiness(data.items, currentByItem) : null), [data, currentByItem])

  const coverage = useMemo(() => {
    if (!data) return []
    const group = data.items.filter(i => i.reporting_scope === 'group')
    return CAPITAL_ORDER.map(capital => {
      const inCap = group.filter(i => i.section === capital)
      if (inCap.length === 0) return null
      let approved = 0, pending = 0
      for (const it of inCap) {
        const dv = currentByItem.get(it.id)
        if (dv?.status === 'approved' || dv?.status === 'published') approved++
        else if (dv && (dv.status === 'submitted' || dv.status === 'reviewed')) pending++
      }
      return { capital, total: inCap.length, approved, pending, pct: (approved / inCap.length) * 100 }
    }).filter((x): x is NonNullable<typeof x> => x !== null)
  }, [data, currentByItem])

  if (empty) return <SetupGuard onReady={load} />

  const orgName = brand.name && brand.name !== 'Nexus' ? brand.name : t('workflowPage.orgFallback')

  return (
    <div>
      <PageHeader
        stage="approve"
        eyebrow={t('workflowPage.eyebrow')}
        title={t('workflowPage.title', { year: ACTIVE_YEAR })}
        subtitle={t('workflowPage.subtitle')}
        actions={
          <>
            <Button variant="secondary" icon={<Eye className="w-4 h-4" />} onClick={() => navigate('/workflow/review')}>{t('workflowPage.reviewQueue')}</Button>
            <Button variant="secondary" icon={<Shield className="w-4 h-4" />} onClick={() => navigate('/workflow/approval')}>{t('workflowPage.approvalQueue')}</Button>
            <Button variant="primary" icon={<FileOutput className="w-4 h-4" />} onClick={() => navigate('/reports')}>{t('workflowPage.publishCentre')}</Button>
          </>
        }
      />

      <StateBoundary
        loading={loading}
        error={error}
        hasData={!!data}
        onRetry={() => void load()}
        errorState={{ variant: 'error', title: t('workflowPage.unableToLoad'), body: t('workflowPage.unableToLoadBody') }}
        skeleton={<div className="space-y-6"><Skeleton height={200} rounded="lg" className="block" /><SkeletonLedger items={6} /></div>}
      >
        {data && r && (
          <div className="space-y-6">
            {/* Readiness */}
            <motion.section {...riseIn(0)} className="surface-paper p-5 sm:p-7" aria-labelledby="ready-h">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 id="ready-h" className="text-small font-semibold text-[var(--text-secondary)]">{t('workflowPage.readiness')}</h2>
                  <div className="mt-1 flex items-baseline gap-3 flex-wrap">
                    <span className="type-figure text-[48px] leading-[52px] text-[var(--text-primary)]"><NumberTicker value={Math.round(r.pctApproved)} format="percent" /></span>
                    <span className="type-small text-[var(--text-secondary)]">{t('workflowPage.requiredItems', { count: r.total })}</span>
                  </div>
                </div>
                {r.ready
                  ? <StatusPill tone="success">{t('workflowPage.readyAll')}</StatusPill>
                  : <StatusPill tone="warning" dot>{t('workflowPage.pctApproved', { pct: Math.round(r.pctApproved) })}</StatusPill>}
              </div>
              <StatusBar r={r} reduce={!!reduce} />
            </motion.section>

            <StatLedger
              aria-label={t('workflowPage.statusDistribution')}
              items={[
                { id: 'ns', label: t('workflowStatus.status.not_started'), value: r.notStarted, tone: 'neutral' },
                { id: 'draft', label: t('workflowStatus.status.draft'), value: r.draft, tone: 'warning' },
                { id: 'sub', label: t('workflowStatus.status.submitted'), value: r.submitted, tone: 'info', to: '/workflow/review' },
                { id: 'rev', label: t('workflowStatus.status.reviewed'), value: r.reviewed, tone: 'info', to: '/workflow/approval' },
                { id: 'app', label: t('workflowStatus.status.approved'), value: r.approved, tone: 'success' },
                { id: 'pub', label: t('workflowStatus.status.published'), value: r.published, tone: 'brand' },
              ]}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <QueuePreview title={t('workflowPage.reviewQueue')} subtitle={t('workflowPage.teamLeadAction')} icon={<Eye className="w-4 h-4" />} items={data.reviewQueue} to="/workflow/review" />
              <QueuePreview title={t('workflowPage.approvalQueue')} subtitle={t('workflowPage.soAction')} icon={<Shield className="w-4 h-4" />} items={data.approvalQueue} to="/workflow/approval" />
            </div>

            {/* Coverage by capital */}
            <section className="surface-paper p-5 sm:p-7" aria-labelledby="cov-h">
              <div className="flex items-baseline justify-between gap-3 flex-wrap mb-5">
                <h2 id="cov-h" className="type-h3 text-[var(--text-primary)]">{t('workflowPage.coverage')}</h2>
                <span className="text-caption text-[var(--text-tertiary)]">{t('workflowPage.coverageHint', { org: orgName })}</span>
              </div>
              <ul className="space-y-3.5">
                {coverage.map((c, i) => (
                  <li key={c.capital} className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[200px_minmax(0,1fr)_120px] items-center gap-x-4 gap-y-1.5">
                    <span className="type-small font-medium text-[var(--text-primary)] truncate">{t(capitalLabelKey(c.capital), { defaultValue: c.capital })}</span>
                    <span className="sm:order-last text-right type-small tabular-nums text-[var(--text-secondary)] whitespace-nowrap">
                      <span className="font-semibold text-[var(--text-primary)]">{f.number(c.approved)}</span> / {f.number(c.total)} · {f.percent(c.pct)}
                    </span>
                    <div className="col-span-2 sm:col-span-1 h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden flex" role="img" aria-label={`${t('workflowPage.nApproved', { count: c.approved })}, ${t('workflowPage.nInFlight', { count: c.pending })}`}>
                      <motion.div {...(reduce ? { initial: false, animate: { width: `${(c.approved / c.total) * 100}%` } } : barFill((c.approved / c.total) * 100, i * 0.05))} className="h-full bg-[var(--status-success)]" />
                      <motion.div {...(reduce ? { initial: false, animate: { width: `${(c.pending / c.total) * 100}%` } } : barFill((c.pending / c.total) * 100, 0.2 + i * 0.05))} className="h-full bg-[var(--status-info)]" />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Bottlenecks */}
            <section className="surface-paper overflow-hidden" aria-labelledby="bn-h">
              <div className="px-5 sm:px-7 pt-5 pb-3 flex items-baseline justify-between gap-3 flex-wrap">
                <h2 id="bn-h" className="type-h3 text-[var(--text-primary)]">{t('workflowPage.bottlenecks')}</h2>
                <span className="text-caption text-[var(--text-tertiary)]">{t('workflowPage.oldestFirst')}</span>
              </div>
              {data.reviewQueue.length === 0 && data.approvalQueue.length === 0 ? (
                <EmptyState variant="cleared" density="compact" title={t('workflowPage.inboxZeroTitle')} body={t('workflowPage.inboxZero')} />
              ) : (
                <Bottlenecks data={data} />
              )}
            </section>
          </div>
        )}
      </StateBoundary>
    </div>
  )
}

function StatusBar({ r, reduce }: { r: NonNullable<ReturnType<typeof computeReadiness>>; reduce: boolean }) {
  const { t } = useTranslation()
  const f = useFmt()
  const total = Math.max(r.total, 1)
  const segs = [
    { k: 'approved', n: r.approved + r.published, c: 'var(--status-success)', l: t('workflowStatus.status.approved') },
    { k: 'reviewed', n: r.reviewed, c: 'var(--status-info)', l: t('workflowStatus.status.reviewed') },
    { k: 'submitted', n: r.submitted, c: 'color-mix(in srgb, var(--status-info) 45%, var(--bg-tertiary))', l: t('workflowStatus.status.submitted') },
    { k: 'draft', n: r.draft, c: 'var(--status-warning)', l: t('workflowStatus.status.draft') },
    { k: 'ns', n: r.notStarted, c: 'var(--border-strong)', l: t('workflowStatus.status.not_started') },
  ]
  return (
    <>
 <div className="mt-5 flex h-3 rounded-full overflow-hidden bg-[var(--bg-tertiary)]" role="img" aria-label={segs.map(s => `${s.l} ${s.n}`).join(', ')}>
        {segs.map((s, i) => (
          <motion.div key={s.k} {...(reduce ? { initial: false, animate: { width: `${(s.n / total) * 100}%` } } : barFill((s.n / total) * 100, 0.1 + i * 0.12))} className="h-full" style={{ background: s.c }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-small text-[var(--text-secondary)]">
        {segs.map(s => (
          <li key={s.k} className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full" style={{ background: s.c }} aria-hidden />{s.l}
            <span className="tabular-nums font-semibold text-[var(--text-primary)]">{f.number(s.n)}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

function Bottlenecks({ data }: { data: Ready }) {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const rows = [
    ...data.reviewQueue.map(dv => ({ dv, stage: 'review' as const })),
    ...data.approvalQueue.map(dv => ({ dv, stage: 'approval' as const })),
  ]
    .sort((a, b) => {
      const da = a.stage === 'review' ? a.dv.submitted_at : a.dv.reviewed_at
      const db = b.stage === 'review' ? b.dv.submitted_at : b.dv.reviewed_at
      return (da ?? '') < (db ?? '') ? -1 : 1
    })
    .slice(0, 10)
  return (
    <ul className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
      {rows.map(({ dv, stage }) => {
        const since = stage === 'review' ? dv.submitted_at : dv.reviewed_at
        return (
          <li key={dv.id}>
            <Link
              to={stage === 'review' ? '/workflow/review' : '/workflow/approval'}
              className="px-5 sm:px-7 py-3 grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_120px_110px_100px_20px] items-center gap-x-4 gap-y-1 hover:bg-[var(--bg-hover)] transition-colors duration-micro"
            >
              <div className="min-w-0">
                <div className="type-small font-medium text-[var(--text-primary)] truncate">{itemLabel(dv, i18n.language) || t('workflowPage.unknown')}</div>
                <div className="text-caption text-[var(--text-tertiary)] truncate">
                  <span className="font-mono">{dv.gri_code}</span>{dv.section ? ` · ${t(capitalLabelKey(dv.section), { defaultValue: dv.section })}` : ''}
                </div>
              </div>
              <span className="text-right type-small tabular-nums font-semibold text-[var(--text-primary)] whitespace-nowrap">{f.number(dv.value)}</span>
              <span className="hidden sm:block"><StatusPill size="sm" tone="info" icon={stage === 'review' ? <Eye /> : <Shield />}>{stage === 'review' ? t('workflowPage.stageReview') : t('workflowPage.stageApprove')}</StatusPill></span>
              <span className="hidden sm:block text-caption text-[var(--text-tertiary)] whitespace-nowrap">{since ? f.relative(since) : '—'}</span>
              <ArrowRight className="hidden sm:block w-4 h-4 text-[var(--text-tertiary)]" aria-hidden />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function QueuePreview({ title, subtitle, icon, items, to }: { title: string; subtitle: string; icon: React.ReactNode; items: NexusDataValue[]; to: string }) {
  const { t, i18n } = useTranslation()
  return (
    <section className="surface-paper overflow-hidden flex flex-col">
      <div className="p-5 flex items-center justify-between gap-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 flex-shrink-0 rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] flex items-center justify-center">{icon}</span>
          <div className="min-w-0">
            <h3 className="type-small font-semibold text-[var(--text-primary)]">{title}</h3>
            <p className="text-caption text-[var(--text-tertiary)] truncate">{subtitle}</p>
          </div>
        </div>
        <span className="type-figure text-[32px] leading-9 text-[var(--text-primary)]"><NumberTicker value={items.length} /></span>
      </div>
      {items.length === 0 ? (
        <EmptyState variant="cleared" density="compact" art={false} title={t('workflowPage.queueEmpty')} />
      ) : (
        <>
          <ul className="divide-y divide-[var(--border-subtle)] flex-1">
            {items.slice(0, 5).map(dv => (
              <li key={dv.id} className="px-5 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="type-small text-[var(--text-primary)] truncate">{itemLabel(dv, i18n.language) || t('workflowPage.unknown')}</p>
                  <p className="text-caption font-mono text-[var(--text-tertiary)]">{dv.gri_code}</p>
                </div>
                <span className="inline-flex items-center gap-1 font-mono text-caption text-[var(--text-tertiary)] flex-shrink-0"><Hash className="w-3 h-3" />{truncateHash(dv.value_hash)}</span>
              </li>
            ))}
          </ul>
          <Link to={to} className="h-11 px-5 border-t border-[var(--border-subtle)] inline-flex items-center justify-center gap-1.5 text-small font-semibold text-[var(--color-brand-strong)] hover:bg-[var(--bg-hover)] transition-colors duration-micro">
            {t('workflowPage.openFullQueue')} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </>
      )}
    </section>
  )
}
