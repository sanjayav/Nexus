import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip, Line, ComposedChart } from 'recharts'
import {
  TrendingUp, TrendingDown, Minus, BookOpen, Target as TargetIcon, Clock,
  AlertTriangle, ShieldCheck,
} from 'lucide-react'
import { orgStore, type HistoricalReference } from '../lib/orgStore'
import { BookOpen as BookOpenIcon, Calculator as CalculatorIcon } from 'lucide-react'
import { formatBig } from './AnimatedNumber'
import { SPRING } from './motion'
import { useTranslation } from 'react-i18next'
import { itemLabel } from '../lib/itemLabel'

/**
 * Industry-standard historical reference panel.
 *
 * What an auditor expects to see next to the input:
 *   — 4-year trend with min/max band
 *   — current value overlaid as a marked point
 *   — target line (where applicable)
 *   — YoY delta with direction + magnitude
 *   — 4yr statistics (mean, σ, min, max)
 *   — live anomaly callouts computed on the fly
 *   — peer plants comparison (if data exists)
 *   — source citation + confidence per row
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

  useEffect(() => {
    let cancelled = false
    orgStore.historicalReference(questionnaire_item_id, entity_id)
      .then(r => { if (!cancelled) setRef(r) })
      .catch(e => { if (!cancelled) setErr(e instanceof Error ? e.message : t('components.history.loadFailed')) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionnaire_item_id, entity_id])

  if (err) {
    return (
      <div className="p-5">
        <div className="text-[12px] text-[var(--accent-red)]">{err}</div>
      </div>
    )
  }
  if (!ref) return <Skel />

  return <Body ref_={ref} currentValue={currentValue} currentYear={currentYear} />
}

function Body({ ref_, currentValue, currentYear }: { ref_: HistoricalReference; currentValue: number | null; currentYear: number }) {
  const { t, i18n } = useTranslation()
  const series = useMemo(() => {
    const rows = [...ref_.history].sort((a, b) => a.year - b.year)
    return rows
  }, [ref_.history])

  const stats = useMemo(() => {
    const values = series.map(s => s.value)
    if (values.length === 0) return null
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)
    const variance = values.length > 1 ? values.reduce((a, b) => a + (b - avg) ** 2, 0) / (values.length - 1) : 0
    const sd = Math.sqrt(variance)
    return { avg, min, max, sd, n: values.length }
  }, [series])

  const prior = series[series.length - 1]
  const yoy = prior && prior.value !== 0 && currentValue != null
    ? ((currentValue - prior.value) / Math.abs(prior.value))
    : null

  const zScore = stats && stats.sd > 0 && currentValue != null ? (currentValue - stats.avg) / stats.sd : null

  // Chart data — include current as the newest point if we have one
  const chartData = useMemo(() => {
    const data: Array<{ year: number; label: string; value: number | null; current: number | null; minBand: number; maxBand: number }> = series.map(s => ({
      year: s.year,
      label: `'${String(s.year).slice(-2)}`,
      value: s.value,
      current: null,
      minBand: stats?.min ?? 0,
      maxBand: stats?.max ?? 0,
    }))
    if (currentValue != null) {
      data.push({
        year: currentYear,
        label: `'${String(currentYear).slice(-2)}`,
        value: null,
        current: currentValue,
        minBand: stats?.min ?? 0,
        maxBand: stats?.max ?? 0,
      })
    }
    return data
  }, [series, currentValue, currentYear, stats])

  // Live anomalies computed client-side
  const flags = useMemo(() => {
    const out: Array<{ severity: 'info' | 'warn' | 'critical'; icon: any; title: string; body: string }> = []
    if (currentValue == null) return out
    if (yoy != null) {
      const abs = Math.abs(yoy)
      if (abs >= 0.5) out.push({ severity: 'critical', icon: AlertTriangle, title: t('components.history.flags.yoyTitle', { pct: fmtPct(yoy), year: prior.year }), body: t('components.history.flags.yoyCritical') })
      else if (abs >= 0.2) out.push({ severity: 'warn', icon: AlertTriangle, title: t('components.history.flags.yoyTitle', { pct: fmtPct(yoy), year: prior.year }), body: t('components.history.flags.yoyWarn') })
    }
    if (zScore != null) {
      const abs = Math.abs(zScore)
      if (abs >= 3) out.push({ severity: 'critical', icon: AlertTriangle, title: t('components.history.flags.zExtremeTitle', { z: abs.toFixed(2) }), body: t('components.history.flags.zExtremeBody', { z: abs.toFixed(2) }) })
      else if (abs >= 2) out.push({ severity: 'warn', icon: AlertTriangle, title: `|z-score| = ${abs.toFixed(2)}`, body: t('components.history.flags.zWarnBody') })
    }
    if (stats && stats.avg > 0 && currentValue > 0) {
      const ratio = currentValue / stats.avg
      if (ratio >= 8 || ratio <= 0.125) {
        out.push({ severity: 'critical', icon: AlertTriangle, title: t('components.history.flags.ratioTitle', { ratio: ratio.toFixed(1) }), body: t('components.history.flags.ratioBody') })
      }
    }
    if (out.length === 0 && currentValue != null) {
      out.push({ severity: 'info', icon: ShieldCheck, title: t('components.history.flags.okTitle'), body: t('components.history.flags.okBody') })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentValue, yoy, zScore, stats, prior, i18n.language])

  const trendIcon = yoy == null ? Minus : yoy < -0.005 ? TrendingDown : yoy > 0.005 ? TrendingUp : Minus
  const trendColor = yoy == null ? 'var(--text-tertiary)' : yoy < 0 ? 'var(--status-ok)' : yoy > 0 ? 'var(--status-reject)' : 'var(--text-tertiary)'

  return (
    <>
      <header className="p-5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-6 h-6 rounded-[6px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
            <BookOpen className="w-3 h-3" />
          </span>
          <span className="kicker !mb-0">{t('components.history.title')}</span>
        </div>
        <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.01em] leading-snug">{itemLabel(ref_.meta, i18n.language)}</h3>
        <div className="text-caption text-[var(--text-tertiary)] mt-1 flex items-center gap-2 flex-wrap">
          <span className="font-mono font-semibold text-[var(--color-brand)]">{ref_.meta.gri_code}</span>
          {ref_.meta.unit && <span>·</span>}
          {ref_.meta.unit && <span>{ref_.meta.unit}</span>}
          {ref_.meta.cadence && (
            <span className="chip" style={{ fontSize: 10, height: 18, paddingLeft: 6, paddingRight: 6 }}>
              {ref_.meta.cadence}
            </span>
          )}
        </div>
      </header>

      {/* ESG Data Standard block — definition + calc method, shown inline so the
          contributor doesn't have to navigate away to know what this KPI means. */}
      {(ref_.meta.definition || ref_.meta.calc_method) && (
        <div className="p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/60 space-y-3">
          {ref_.meta.definition && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <BookOpenIcon className="w-3 h-3 text-[var(--color-brand)]" />
                <span className="text-micro uppercase tracking-[0.12em] font-bold text-[var(--color-brand)]">{t('components.history.definition')}</span>
              </div>
              <p className="text-caption text-[var(--text-secondary)] leading-relaxed">{ref_.meta.definition}</p>
            </div>
          )}
          {ref_.meta.calc_method && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <CalculatorIcon className="w-3 h-3 text-[var(--accent-purple)]" />
                <span className="text-micro uppercase tracking-[0.12em] font-bold text-[var(--accent-purple)]">{t('components.history.calcMethod')}</span>
              </div>
              <p className="text-caption text-[var(--text-secondary)] leading-relaxed">{ref_.meta.calc_method}</p>
            </div>
          )}
        </div>
      )}

      <div className="p-5 space-y-5">
        {/* Current + YoY headline */}
        {currentValue != null && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}>
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="text-micro uppercase tracking-[0.12em] font-semibold text-[var(--text-tertiary)]">{t('components.history.entry', { year: currentYear })}</div>
                <div className="text-[22px] font-bold tabular-nums text-[var(--text-primary)] leading-tight tracking-[-0.02em]">{fmtBig(currentValue)}</div>
              </div>
              {yoy != null && (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[8px]" style={{ background: yoy < 0 ? 'var(--accent-green-light)' : yoy > 0 ? 'var(--accent-red-light)' : 'var(--bg-tertiary)' }}>
                  {(() => { const Ti = trendIcon; return <Ti className="w-3.5 h-3.5" style={{ color: trendColor }} /> })()}
                  <span className="text-[12px] font-bold tabular-nums" style={{ color: trendColor }}>{fmtPct(yoy)}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Chart */}
        {series.length > 0 ? (
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="histo-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#047857" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#047857" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={{ stroke: 'var(--border-subtle)' }} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtBig(v)} width={34} />
                <Tooltip
                  cursor={{ fill: 'var(--bg-secondary)' }}
                  contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 11, padding: '6px 10px' }}
                  formatter={(v: any) => fmtBig(Number(v))}
                />
                <Area type="monotone" dataKey="value" stroke="#047857" strokeWidth={2} fill="url(#histo-grad)" dot={{ r: 3, fill: '#047857', strokeWidth: 0 }} connectNulls />
                <Line type="monotone" dataKey="current" stroke="none" dot={{ r: 5, fill: '#E6A817', stroke: 'white', strokeWidth: 2 }} />
                {ref_.meta.target_fy2026 != null && (
                  <ReferenceLine y={ref_.meta.target_fy2026} stroke="var(--accent-green)" strokeDasharray="3 3" strokeWidth={1.5}
                    label={{ value: t('components.history.target'), position: 'insideTopRight', fill: 'var(--accent-green)', fontSize: 9, fontWeight: 600 }} />
                )}
                {stats && (
                  <ReferenceLine y={stats.avg} stroke="var(--text-quaternary)" strokeDasharray="2 4" strokeWidth={1}
                    label={{ value: t('components.history.avg'), position: 'insideBottomRight', fill: 'var(--text-tertiary)', fontSize: 9 }} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[120px] flex items-center justify-center text-caption text-[var(--text-tertiary)] italic">{t('components.history.noValues')}</div>
        )}

        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-4 gap-2">
            <StatCell label={t('components.history.nYearAvg', { n: stats.n })} value={fmtBig(stats.avg)} />
            <StatCell label="σ" value={fmtBig(stats.sd)} />
            <StatCell label={t('components.history.min')} value={fmtBig(stats.min)} />
            <StatCell label={t('components.history.max')} value={fmtBig(stats.max)} />
          </div>
        )}

        {/* Year-by-year with source */}
        {series.length > 0 && (
          <div>
            <div className="text-micro uppercase tracking-[0.12em] font-semibold text-[var(--text-tertiary)] mb-2">{t('components.history.yearByYear')}</div>
            <ul className="space-y-1.5">
              {series.map(h => (
                <li key={h.year} className="flex items-center justify-between gap-3 text-[12px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-micro text-[var(--text-tertiary)] font-medium uppercase tracking-[0.08em] w-10">FY{String(h.year).slice(-2)}</span>
                    {h.source_report && (
                      <span className="text-caption text-[var(--text-tertiary)] truncate max-w-[150px]" title={h.source_report}>{h.source_report}</span>
                    )}
                  </div>
                  <span className="font-semibold text-[var(--text-primary)] tabular-nums flex-shrink-0">{fmtBig(h.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Target */}
        {ref_.meta.target_fy2026 != null && (
          <div className="p-3 rounded-[10px] relative overflow-hidden" style={{ background: 'var(--gradient-brand-soft)', border: '1px solid rgba(4, 120, 87,0.15)' }}>
            <div className="flex items-center gap-2 mb-1">
              <TargetIcon className="w-3.5 h-3.5 text-[var(--color-brand)]" />
              <span className="text-micro uppercase tracking-[0.12em] font-semibold text-[var(--color-brand-strong)]">{t('components.history.fyTarget', { year: currentYear })}</span>
            </div>
            <div className="text-[18px] font-bold tabular-nums text-[var(--color-brand-strong)] tracking-[-0.01em]">{ref_.meta.target_fy2026}</div>
          </div>
        )}

        {/* Peer comparison */}
        {ref_.peers.length > 0 && (
          <div>
            <div className="text-micro uppercase tracking-[0.12em] font-semibold text-[var(--text-tertiary)] mb-2">{t('components.history.peers')}</div>
            <ul className="space-y-1.5">
              {ref_.peers.slice(0, 4).map(p => (
                <li key={p.entity_id} className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="text-[var(--text-secondary)] truncate">{p.entity_name}</span>
                  <span className="font-semibold text-[var(--text-primary)] tabular-nums flex-shrink-0">{fmtBig(p.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Live anomaly callouts */}
        {currentValue != null && flags.length > 0 && (
          <div>
            <div className="text-micro uppercase tracking-[0.12em] font-semibold text-[var(--text-tertiary)] mb-2">{t('components.history.qualityCheck')}</div>
            <div className="space-y-1.5">
              {flags.map((f, i) => {
                const Icon = f.icon
                const color =
                  f.severity === 'critical' ? { bg: 'var(--accent-red-light)', fg: 'var(--accent-red)', border: 'rgba(198,40,40,0.2)' }
                  : f.severity === 'warn' ? { bg: 'var(--accent-amber-light)', fg: 'var(--accent-amber)', border: 'rgba(230,168,23,0.25)' }
                  : { bg: 'var(--accent-green-light)', fg: 'var(--accent-green)', border: 'rgba(46,125,50,0.2)' }
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ ...SPRING, delay: i * 0.05 }}
                    className="flex items-start gap-2 p-2.5 rounded-[8px]"
                    style={{ background: color.bg, border: `1px solid ${color.border}` }}>
                    <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: color.fg }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-semibold tracking-[-0.005em]" style={{ color: color.fg }}>{f.title}</div>
                      <div className="text-caption leading-relaxed text-[var(--text-secondary)] mt-0.5">{f.body}</div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer — confidence */}
        {series.length > 0 && series.some(h => h.source_report) && (
          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center gap-1.5 text-caption text-[var(--text-tertiary)]">
            <Clock className="w-3 h-3" />
            <span>{t('components.history.sources', { level: series.every(h => (h.confidence_score ?? 0) >= 0.9) ? t('components.history.high') : t('components.history.mixed') })}</span>
          </div>
        )}
      </div>
    </>
  )
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-[8px] bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
      <div className="text-micro uppercase tracking-[0.1em] text-[var(--text-tertiary)] font-semibold">{label}</div>
      <div className="text-[13px] font-bold tabular-nums text-[var(--text-primary)] mt-0.5 tracking-[-0.01em]">{value}</div>
    </div>
  )
}

function Skel() {
  return (
    <div className="p-5">
      <div className="skeleton h-[14px] w-[80%] rounded" />
      <div className="skeleton h-[120px] mt-4 rounded-lg" />
      <div className="grid grid-cols-4 gap-2 mt-4">
        <div className="skeleton h-[38px] rounded" />
        <div className="skeleton h-[38px] rounded" />
        <div className="skeleton h-[38px] rounded" />
        <div className="skeleton h-[38px] rounded" />
      </div>
    </div>
  )
}

function fmtBig(n: number): string {
  if (!isFinite(n)) return '—'
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(2) + 'k'
  if (Math.abs(n) >= 1) return n.toFixed(2)
  return n.toFixed(3)
}

function fmtPct(d: number): string {
  const s = (d * 100).toFixed(1)
  return (d > 0 ? '+' : '') + s + '%'
}

// Kept for import clarity even though the component file handles formatting
export { formatBig as reExportedFormat }
