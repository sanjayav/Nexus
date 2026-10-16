import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CartesianGrid, ComposedChart, Line, ReferenceLine, Tooltip, XAxis, YAxis, Area } from 'recharts'
import {
  AlertTriangle, BookOpen, Calculator, Clock, Minus, ShieldCheck, Target as TargetIcon, TrendingDown, TrendingUp,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { orgStore, type HistoricalReference } from '../lib/orgStore'
import { itemLabel } from '../lib/itemLabel'
import { useFmt } from '../lib/fmt'
import ChartFrame, { AreaGradient, chartColors, useChartTheme } from './ui/ChartFrame'
import { Skeleton } from './Skeleton'
import EmptyState from './EmptyState'
import { staggerDelay, transition } from '../motion/tokens'

/**
 * Historical reference panel — what a reviewer or auditor expects next to a
 * figure:
 *   — the reported history as an ink line, this year's entry as a hollow
 *     "pending" point joined by a dashed segment
 *   — target line (where applicable) and the n-year average
 *   — YoY delta, and "Δ vs n-year average" instead of a meaningless sum
 *   — n-year statistics (mean, σ, min, max)
 *   — live anomaly callouts, peer plants, source citation per year
 */
export function HistoricalReferencePanel({
  questionnaire_item_id,
  entity_id,
  currentValue,
  currentYear = new Date().getFullYear(),
}: {
  questionnaire_item_id: string
  entity_id?: string
  currentValue: number | null
  currentYear?: number
}) {
  const { t } = useTranslation()
  const [ref, setRef] = useState<HistoricalReference | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setErr(null)
    orgStore.historicalReference(questionnaire_item_id, entity_id)
      .then(r => {
        if (cancelled) return
        // Older/partial API responses can omit arrays; normalise once here.
        if (!r || !r.meta) { setErr(t('components.history.loadFailed')); return }
        setRef({ ...r, history: Array.isArray(r.history) ? r.history : [], peers: Array.isArray(r.peers) ? r.peers : [] })
      })
      .catch(e => { if (!cancelled) setErr(e instanceof Error ? e.message : t('components.history.loadFailed')) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionnaire_item_id, entity_id, attempt])

  if (err) {
    return (
      <EmptyState
        variant="error"
        density="compact"
        title={t('reviewUi.history.loadFailedTitle')}
        body={t('reviewUi.history.loadFailedBody')}
        detail={err}
        onRetry={() => setAttempt(a => a + 1)}
      />
    )
  }
  if (!ref) return <Skel />
  return <Body ref_={ref} currentValue={currentValue} currentYear={currentYear} />
}

function Body({ ref_, currentValue, currentYear }: { ref_: HistoricalReference; currentValue: number | null; currentYear: number }) {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const ct = useChartTheme()
  const series = useMemo(() => [...ref_.history].sort((a, b) => a.year - b.year), [ref_.history])

  const stats = useMemo(() => {
    const values = series.map(s => s.value)
    if (values.length === 0) return null
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)
    const variance = values.length > 1 ? values.reduce((a, b) => a + (b - avg) ** 2, 0) / (values.length - 1) : 0
    return { avg, min, max, sd: Math.sqrt(variance), n: values.length }
  }, [series])

  const prior = series[series.length - 1]
  const yoy = prior && prior.value !== 0 && currentValue != null ? (currentValue - prior.value) / Math.abs(prior.value) : null
  const vsAvg = stats && stats.avg !== 0 && currentValue != null ? (currentValue - stats.avg) / Math.abs(stats.avg) : null
  const zScore = stats && stats.sd > 0 && currentValue != null ? (currentValue - stats.avg) / stats.sd : null
  const pct = (d: number) => f.delta(d * 100, { percent: true })

  // History is a solid ink line; this year's entry is a hollow point joined by a dashed segment.
  const chartData = useMemo(() => {
    const rows: Array<{ label: string; value: number | null; pending: number | null }> = series.map((s, i) => ({
      label: `FY${String(s.year).slice(-2)}`,
      value: s.value,
      pending: i === series.length - 1 && currentValue != null ? s.value : null,
    }))
    if (currentValue != null) rows.push({ label: `FY${String(currentYear).slice(-2)}`, value: null, pending: currentValue })
    return rows
  }, [series, currentValue, currentYear])

  const flags = useMemo(() => {
    const out: Array<{ severity: 'info' | 'warn' | 'critical'; title: string; body: string }> = []
    if (currentValue == null) return out
    if (yoy != null) {
      const abs = Math.abs(yoy)
      if (abs >= 0.5) out.push({ severity: 'critical', title: t('components.history.flags.yoyTitle', { pct: pct(yoy), year: prior.year }), body: t('components.history.flags.yoyCritical') })
      else if (abs >= 0.2) out.push({ severity: 'warn', title: t('components.history.flags.yoyTitle', { pct: pct(yoy), year: prior.year }), body: t('components.history.flags.yoyWarn') })
    }
    if (zScore != null) {
      const abs = Math.abs(zScore)
      if (abs >= 3) out.push({ severity: 'critical', title: t('components.history.flags.zExtremeTitle', { z: f.number(abs, { precision: 2 }) }), body: t('components.history.flags.zExtremeBody', { z: f.number(abs, { precision: 2 }) }) })
      else if (abs >= 2) out.push({ severity: 'warn', title: t('reviewUi.history.zWarnTitle', { z: f.number(abs, { precision: 2 }) }), body: t('components.history.flags.zWarnBody') })
    }
    if (stats && stats.avg > 0 && currentValue > 0) {
      const ratio = currentValue / stats.avg
      if (ratio >= 8 || ratio <= 0.125) out.push({ severity: 'critical', title: t('components.history.flags.ratioTitle', { ratio: f.number(ratio, { precision: 1 }) }), body: t('components.history.flags.ratioBody') })
    }
    if (out.length === 0) out.push({ severity: 'info', title: t('components.history.flags.okTitle'), body: t('components.history.flags.okBody') })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentValue, yoy, zScore, stats, prior, i18n.language])

  const TrendIcon = yoy == null ? Minus : yoy < -0.005 ? TrendingDown : yoy > 0.005 ? TrendingUp : Minus
  const unit = ref_.meta.unit

  return (
    <div>
      <header className="px-5 pt-5 pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 text-caption font-semibold text-[var(--text-secondary)]">
          <BookOpen className="w-3.5 h-3.5 text-[var(--color-brand)]" /> {t('components.history.title')}
        </div>
        <h3 className="type-h3 text-[var(--text-primary)] mt-1.5">{itemLabel(ref_.meta, i18n.language)}</h3>
        <div className="text-caption text-[var(--text-tertiary)] mt-1 flex items-center gap-2 flex-wrap">
          <span className="font-mono font-semibold text-[var(--color-brand-strong)]">{ref_.meta.gri_code}</span>
          {unit && <span>· {f.unit(unit)}</span>}
          {ref_.meta.cadence && <span className="nx-pill" data-tone="neutral" data-size="sm">{ref_.meta.cadence}</span>}
        </div>
      </header>

      {(ref_.meta.definition || ref_.meta.calc_method) && (
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] grid gap-4 sm:grid-cols-2">
          {ref_.meta.definition && (
            <div>
              <div className="flex items-center gap-1.5 text-caption font-semibold text-[var(--text-secondary)]"><BookOpen className="w-3 h-3" />{t('components.history.definition')}</div>
              <p className="type-small text-[var(--text-secondary)] mt-1">{ref_.meta.definition}</p>
            </div>
          )}
          {ref_.meta.calc_method && (
            <div>
              <div className="flex items-center gap-1.5 text-caption font-semibold text-[var(--text-secondary)]"><Calculator className="w-3 h-3" />{t('components.history.calcMethod')}</div>
              <p className="type-small text-[var(--text-secondary)] mt-1">{ref_.meta.calc_method}</p>
            </div>
          )}
        </div>
      )}

      <div className="p-5 space-y-5">
        {currentValue != null && (
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <div className="text-caption text-[var(--text-tertiary)]">{t('components.history.entry', { year: currentYear })}</div>
              <div className="type-figure text-[24px] leading-7 text-[var(--text-primary)]">
                {f.number(currentValue)}{unit && <span className="ml-1.5 type-small font-normal text-[var(--text-tertiary)]">{f.unit(unit)}</span>}
              </div>
            </div>
            {yoy != null && (
              <span className="nx-pill" data-tone={Math.abs(yoy) >= 0.2 ? 'warning' : 'neutral'} title={t('reviewUi.history.yoyTitle', { year: prior.year })}>
                <TrendIcon className="w-3.5 h-3.5" /> {pct(yoy)}
              </span>
            )}
          </div>
        )}

        <ChartFrame
          framed={false}
          height={168}
          empty={series.length === 0}
          emptyTitle={t('components.history.noValues')}
          legend={[
            { label: t('reviewUi.history.reported'), color: chartColors.ink },
            ...(currentValue != null ? [{ label: t('reviewUi.history.pending', { year: currentYear }), color: chartColors.s2, dashed: true }] : []),
            ...(ref_.meta.target_fy2026 != null ? [{ label: t('components.history.target'), color: chartColors.target, dashed: true }] : []),
          ]}
        >
          <ComposedChart data={chartData} margin={{ ...ct.margin, right: 8 }}>
            <defs><AreaGradient id="hist-area" color={chartColors.ink} from={0.08} /></defs>
            <CartesianGrid {...ct.grid} />
            <XAxis dataKey="label" {...ct.xAxis} />
            <YAxis {...ct.yAxis} domain={['auto', 'auto']} />
            <Tooltip {...ct.tooltip({ unit: unit ?? undefined })} />
            {stats && <ReferenceLine y={stats.avg} stroke={chartColors.axis} strokeDasharray="2 4" />}
            {ref_.meta.target_fy2026 != null && <ReferenceLine y={ref_.meta.target_fy2026} stroke={chartColors.target} strokeDasharray="4 4" strokeWidth={1.5} />}
            <Area dataKey="value" name={t('reviewUi.history.reported')} stroke={chartColors.ink} fill="url(#hist-area)" connectNulls={false} {...ct.series} dot={{ r: 3, fill: chartColors.ink, strokeWidth: 0 }} />
            <Line
              dataKey="pending"
              name={t('reviewUi.history.pending', { year: currentYear })}
              stroke={chartColors.s2}
              strokeDasharray="4 4"
              {...ct.series}
              dot={(p: { cx?: number; cy?: number; index?: number }) =>
                p.index === chartData.length - 1 && p.cx != null && p.cy != null
                  ? <circle key="pending-dot" cx={p.cx} cy={p.cy} r={5} fill="var(--bg-primary)" stroke={chartColors.s2} strokeWidth={2} />
                  : <g key={`d${p.index}`} />}
            />
          </ComposedChart>
        </ChartFrame>

        {stats && (
          <dl className="grid grid-cols-2 sm:grid-cols-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] divide-x divide-[var(--border-subtle)] overflow-hidden">
            <Stat label={t('components.history.nYearAvg', { n: stats.n })} value={f.number(stats.avg)} />
            <Stat label={t('reviewUi.history.vsAvg', { n: stats.n })} value={vsAvg != null ? pct(vsAvg) : '—'} tone={vsAvg != null && Math.abs(vsAvg) >= 0.2 ? 'warning' : undefined} />
            <Stat label={t('components.history.min')} value={f.number(stats.min)} />
            <Stat label={t('components.history.max')} value={f.number(stats.max)} />
          </dl>
        )}

        {series.length > 0 && (
          <div>
            <div className="text-caption font-semibold text-[var(--text-secondary)] mb-1.5">{t('components.history.yearByYear')}</div>
            <ul className="divide-y divide-[var(--border-subtle)]">
              {series.map(h => (
                <li key={h.year} className="flex items-center justify-between gap-3 py-1.5 type-small">
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[var(--text-tertiary)] tabular-nums w-12">FY{String(h.year).slice(-2)}</span>
                    {h.source_report && <span className="text-caption text-[var(--text-tertiary)] truncate max-w-[180px]" title={h.source_report}>{h.source_report}</span>}
                  </span>
                  <span className="font-semibold text-[var(--text-primary)] tabular-nums">{f.number(h.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {ref_.meta.target_fy2026 != null && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-brand-soft)]">
            <span className="inline-flex items-center gap-2 text-caption font-semibold text-[var(--color-brand-strong)]">
              <TargetIcon className="w-3.5 h-3.5" /> {t('components.history.fyTarget', { year: currentYear })}
            </span>
            <span className="type-small font-semibold tabular-nums text-[var(--color-brand-strong)]">{f.number(ref_.meta.target_fy2026)}</span>
          </div>
        )}

        {ref_.peers.length > 0 && (
          <div>
            <div className="text-caption font-semibold text-[var(--text-secondary)] mb-1.5">{t('components.history.peers')}</div>
            <ul className="divide-y divide-[var(--border-subtle)]">
              {ref_.peers.slice(0, 4).map(p => (
                <li key={p.entity_id} className="flex items-center justify-between gap-3 py-1.5 type-small">
                  <span className="text-[var(--text-secondary)] truncate">{p.entity_name}</span>
                  <span className="font-semibold text-[var(--text-primary)] tabular-nums">{f.number(p.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {currentValue != null && (
          <div>
            <div className="text-caption font-semibold text-[var(--text-secondary)] mb-1.5">{t('components.history.qualityCheck')}</div>
            <ul className="space-y-2">
              {flags.map((fl, i) => {
                const Icon = fl.severity === 'info' ? ShieldCheck : AlertTriangle
                const color = fl.severity === 'critical' ? 'var(--status-danger)' : fl.severity === 'warn' ? 'var(--status-warning)' : 'var(--status-success)'
                return (
                  <motion.li key={i} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ ...transition.base, delay: staggerDelay(i) }} className="flex items-start gap-2.5">
                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color }} aria-hidden />
                    <div className="min-w-0">
                      <div className="type-small font-semibold" style={{ color: fl.severity === 'info' ? 'var(--text-primary)' : color }}>{fl.title}</div>
                      <div className="text-caption text-[var(--text-secondary)] mt-0.5">{fl.body}</div>
                    </div>
                  </motion.li>
                )
              })}
            </ul>
          </div>
        )}

        {series.some(h => h.source_report) && (
          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center gap-1.5 text-caption text-[var(--text-tertiary)]">
            <Clock className="w-3 h-3" />
            <span>{t('components.history.sources', { level: series.every(h => (h.confidence_score ?? 0) >= 0.9) ? t('components.history.high') : t('components.history.mixed') })}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'warning' }) {
  return (
    <div className="px-3 py-2.5 [&:nth-child(3)]:border-l-0 sm:[&:nth-child(3)]:border-l">
      <dt className="text-caption text-[var(--text-tertiary)]">{label}</dt>
      <dd className={`type-small font-semibold tabular-nums mt-0.5 ${tone === 'warning' ? 'text-[var(--status-warning)]' : 'text-[var(--text-primary)]'}`}>{value}</dd>
    </div>
  )
}

function Skel() {
  return (
    <div className="p-5 space-y-4" role="status" aria-busy="true">
      <Skeleton height={14} width="70%" className="block" />
      <Skeleton height={150} rounded="lg" className="block" />
      <Skeleton height={48} rounded="lg" className="block" />
    </div>
  )
}
