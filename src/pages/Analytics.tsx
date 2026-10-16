import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle2, Clock, Factory, Target as TargetIcon, Scale,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ReferenceLine,
} from 'recharts'
import { useAuth } from '../auth/AuthContext'
import { useFramework } from '../lib/frameworks'
import { useOrgData } from '../lib/useOrgData'
import { orgStore, type QuestionAssignment, type OrgTarget, type MaterialTopic } from '../lib/orgStore'
import { FrameworkBadge } from '../components/FrameworkBadge'
import PageHeader from '../components/PageHeader'
import { AnimatedNumber, formatBig } from '../components/AnimatedNumber'
import { riseIn, popIn, slideInLeft } from '../components/motion'
import SectionHeader from '../design-system/components/SectionHeader'
import { SkeletonCard } from '../design-system/components/Skeleton'
import EmptyState from '../components/EmptyState'
import { itemLabel } from '../lib/itemLabel'

/**
 * Analytics — every chart and table is computed from live org data.
 * Six sections: Data Quality Index, YoY Variance, Target gap, Plant scorecard,
 * Materiality coverage, Emissions decomposition.
 */
export default function Analytics() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { active: framework } = useFramework()
  const { data: orgData, loading } = useOrgData()

  const assignments = useMemo(() => {
    if (!orgData) return [] as QuestionAssignment[]
    return orgData.assignments.filter(a => a.framework_id === framework.id)
  }, [orgData, framework.id])

  // Load targets + materiality
  const [targets, setTargets] = useState<OrgTarget[]>([])
  const [materialTopics, setMaterialTopics] = useState<MaterialTopic[]>([])
  useEffect(() => {
    if (!user) return
    orgStore.listTargets().then(setTargets).catch(() => setTargets([]))
    orgStore.listMaterialTopics().then(setMaterialTopics).catch(() => setMaterialTopics([]))
  }, [user?.id])

  // Load historical values for every approved numeric assignment (for YoY variance)
  const [histByQuestion, setHistByQuestion] = useState<Map<string, Array<{ year: number; value: number; source_report: string }>>>(new Map())
  useEffect(() => {
    const approved = assignments.filter(a => a.status === 'approved' && a.response_type !== 'narrative' && a.value != null)
    if (approved.length === 0) return
    let cancelled = false
    ;(async () => {
      type H = Array<{ year: number; value: number; source_report: string }>
      const pairs: Array<[string, H]> = await Promise.all(
        approved.map(async a => {
          try {
            const h = await orgStore.historical(a.questionId)
            return [a.questionId, h] as [string, H]
          } catch {
            return [a.questionId, [] as H] as [string, H]
          }
        })
      )
      if (cancelled) return
      const m = new Map<string, H>()
      for (const [qid, h] of pairs) m.set(qid, h)
      setHistByQuestion(m)
    })()
    return () => { cancelled = true }
  }, [assignments])

  // ── Data Quality Index (composite score 0-100) ──
  const dqi = useMemo(() => {
    if (assignments.length === 0) return null
    const total = assignments.length
    const approved = assignments.filter(a => a.status === 'approved').length
    const submitted = assignments.filter(a => a.status === 'submitted' || a.status === 'reviewed').length
    const rejected = assignments.filter(a => a.status === 'rejected').length
    const withEvidence = assignments.filter(a =>
      a.response_type !== 'narrative' && (a.evidence_ids?.length ?? 0) > 0
    ).length
    const needsEvidence = assignments.filter(a =>
      a.response_type !== 'narrative' && (a.status === 'submitted' || a.status === 'reviewed' || a.status === 'approved')
    ).length
    const onTime = assignments.filter(a => {
      if (!a.due_date) return true
      if (a.status !== 'approved') return false
      return a.last_updated ? new Date(a.last_updated).getTime() <= new Date(a.due_date).getTime() : false
    }).length
    const dueEligible = assignments.filter(a => a.due_date).length

    // Component scores (0-100)
    const completeness = total === 0 ? 0 : (approved / total) * 100
    const timeliness   = dueEligible === 0 ? 100 : (onTime / dueEligible) * 100
    const evidenceRate = needsEvidence === 0 ? 100 : (withEvidence / needsEvidence) * 100
    const rejectionPenalty = total === 0 ? 100 : Math.max(0, 100 - (rejected / total) * 100)
    // Variance pass rate — % of approved numeric where YoY within ±20% or no prior year
    const approvedNum = assignments.filter(a => a.status === 'approved' && a.response_type !== 'narrative' && a.value != null)
    let variancePass = 0
    for (const a of approvedNum) {
      const hist = histByQuestion.get(a.questionId) || []
      const latest = hist.length > 0 ? [...hist].sort((h1, h2) => h2.year - h1.year)[0] : null
      if (!latest || latest.value === 0) { variancePass++; continue }
      const delta = Math.abs(((a.value! - latest.value) / latest.value) * 100)
      if (delta <= 20) variancePass++
    }
    const varianceScore = approvedNum.length === 0 ? 100 : (variancePass / approvedNum.length) * 100

    const composite = Math.round(
      completeness * 0.35 +
      timeliness * 0.15 +
      evidenceRate * 0.20 +
      rejectionPenalty * 0.15 +
      varianceScore * 0.15
    )

    return {
      composite,
      components: [
        { key: 'completeness', value: Math.round(completeness),     weight: 35, hintVars: { approved, total } },
        { key: 'timeliness',   value: Math.round(timeliness),       weight: 15, hintVars: { onTime, dueEligible } },
        { key: 'evidence',     value: Math.round(evidenceRate),     weight: 20, hintVars: { withEvidence, needsEvidence } },
        { key: 'rework',       value: Math.round(rejectionPenalty), weight: 15, hintVars: { rejected } },
        { key: 'variance',     value: Math.round(varianceScore),    weight: 15, hintVars: { variancePass, approvedNum: approvedNum.length } },
      ],
      counts: { total, approved, submitted, rejected },
    }
  }, [assignments, histByQuestion])

  // ── YoY Variance table — every approved numeric line item vs its most recent historical point ──
  const varianceRows = useMemo(() => {
    const rows = assignments
      .filter(a => a.status === 'approved' && a.response_type !== 'narrative' && a.value != null)
      .map(a => {
        const hist = histByQuestion.get(a.questionId) || []
        const latest = hist.length > 0 ? [...hist].sort((h1, h2) => h2.year - h1.year)[0] : null
        const delta = latest && latest.value !== 0 ? ((a.value! - latest.value) / Math.abs(latest.value)) * 100 : null
        return {
          assignment: a,
          priorYear: latest?.year ?? null,
          priorValue: latest?.value ?? null,
          delta,
        }
      })
      .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0))
    return rows
  }, [assignments, histByQuestion])

  // ── Target gap analysis — for the primary SBTi target ──
  const targetGap = useMemo(() => {
    const t = targets.find(x => x.kind === 'sbti_near_term') ?? targets[0]
    if (!t) return null
    const baseline = Number(t.baseline_value)
    const targetValue = baseline * (1 - t.target_reduction_pct / 100)
    // Current: sum of approved S1+S2+S3 GRI 305
    const current = assignments
      .filter(a => a.status === 'approved' && (a.gri_code.startsWith('305-1') || a.gri_code.startsWith('305-2') || a.gri_code.startsWith('305-3')) && a.value != null)
      .reduce((s, a) => s + (a.value ?? 0), 0)
    const effectiveCurrent = current > 0 ? current : baseline
    const thisYear = new Date().getFullYear()
    const yearsElapsed = Math.max(0, thisYear - t.baseline_year)
    const yearsRemaining = Math.max(0, t.target_year - thisYear)
    const totalYears = t.target_year - t.baseline_year

    // Build a pathway: linear interpolation from baseline → target year
    const pathway: Array<{ year: number; linear: number; actual: number | null }> = []
    for (let y = t.baseline_year; y <= t.target_year; y++) {
      const linear = baseline - ((baseline - targetValue) * ((y - t.baseline_year) / totalYears))
      const actual = y === thisYear ? effectiveCurrent : y === t.baseline_year ? baseline : null
      pathway.push({ year: y, linear, actual })
    }
    const currentlyExpected = baseline - ((baseline - targetValue) * (yearsElapsed / totalYears))
    const gap = effectiveCurrent - currentlyExpected
    const requiredAnnualAbatement = yearsRemaining === 0 ? 0 : (effectiveCurrent - targetValue) / yearsRemaining

    return {
      target: t, baseline, targetValue, current: effectiveCurrent, pathway, gap,
      requiredAnnualAbatement, yearsRemaining, onTrack: gap <= 0,
    }
  }, [targets, assignments])

  // ── Plant scorecard ──
  const plantScores = useMemo(() => {
    if (!orgData) return []
    const plants = orgData.entities.filter(e => e.type === 'plant' || e.type === 'office')
    return plants.map(p => {
      const plantA = assignments.filter(a => a.entityId === p.id)
      const total = plantA.length
      const approved = plantA.filter(a => a.status === 'approved').length
      const rejected = plantA.filter(a => a.status === 'rejected').length
      const now = Date.now()
      const overdue = plantA.filter(a => a.due_date && a.status !== 'approved' && new Date(a.due_date).getTime() < now).length
      const approvedTs = plantA.filter(a => a.status === 'approved' && a.last_updated && a.assigned_at).map(a =>
        (new Date(a.last_updated!).getTime() - new Date(a.assigned_at).getTime()) / (1000 * 60 * 60 * 24)
      )
      const avgDays = approvedTs.length > 0 ? approvedTs.reduce((s, n) => s + n, 0) / approvedTs.length : null
      const completion = total === 0 ? 0 : Math.round((approved / total) * 100)
      // Composite score: completion (60) + low-rework (20) + no-overdue (20)
      const score = Math.round(
        completion * 0.6 +
        (total === 0 ? 20 : Math.max(0, 20 - (rejected / total) * 100)) +
        (total === 0 ? 20 : Math.max(0, 20 - (overdue / total) * 100))
      )
      return { plant: p, total, approved, rejected, overdue, avgDays, completion, score }
    }).sort((a, b) => b.score - a.score)
  }, [orgData, assignments])

  // ── Materiality coverage ──
  const materialityCoverage = useMemo(() => {
    const assignedCodes = new Set(assignments.map(a => a.gri_code.split(' ')[0]))
    return materialTopics
      .filter(t => t.framework_id === framework.id && t.dma_status === 'material')
      .map(t => {
        const codes = t.linked_gri_codes || []
        const coveredCodes = codes.filter(c => assignedCodes.has(c))
        const approvedCodes = codes.filter(c => assignments.some(a => a.gri_code.startsWith(c) && a.status === 'approved'))
        return {
          topic: t,
          total: codes.length,
          covered: coveredCodes.length,
          approved: approvedCodes.length,
          coveragePct: codes.length === 0 ? 0 : Math.round((coveredCodes.length / codes.length) * 100),
          approvedPct: codes.length === 0 ? 0 : Math.round((approvedCodes.length / codes.length) * 100),
        }
      }).sort((a, b) => a.coveragePct - b.coveragePct)
  }, [materialTopics, assignments, framework.id])

  // ── Emissions decomposition: plant × scope ──
  const emissionsDecomp = useMemo(() => {
    if (!orgData) return []
    const plants = orgData.entities.filter(e => e.type === 'plant' || e.type === 'office')
    return plants.map(p => {
      const roll = (prefix: string) => assignments
        .filter(a => a.entityId === p.id && a.status === 'approved' && a.gri_code.startsWith(prefix) && a.value != null)
        .reduce((s, a) => s + (a.value ?? 0), 0)
      const s1 = roll('305-1')
      const s2 = roll('305-2')
      const s3 = roll('305-3')
      return { plant: p.name, s1, s2, s3, total: s1 + s2 + s3 }
    }).filter(p => p.total > 0).sort((a, b) => b.total - a.total)
  }, [orgData, assignments])

  if (loading && !orgData) {
    return (
      <div className="space-y-6">
        <div className="h-[120px] rounded-[18px] skeleton" />
        <SkeletonCard />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('analytics.header.eyebrow')}
        title={t('analytics.header.title')}
        subtitle={t('analytics.header.subtitle')}
        actions={<FrameworkBadge size="md" />}
      />

      {/* ── Data Quality Index ── */}
      <section>
        <SectionHeader
          kicker={t('analytics.dqi.kicker')}
          title={t('analytics.dqi.title')}
          subtitle={t('analytics.dqi.subtitle')}
        />
        <motion.div {...popIn(0)} className="surface-paper overflow-hidden">
          {!dqi ? (
            <EmptyState
              icon={CheckCircle2}
              title={t('analytics.dqi.emptyTitle')}
              body={t('analytics.dqi.emptyBody')}
              cta={{ label: t('analytics.dqi.emptyCta'), onClick: () => navigate('/my-tasks') }}
            />
          ) : (
            <div className="p-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-center">
              <DqiRing score={dqi.composite} />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {dqi.components.map(c => (
                  <DqiComponent
                    key={c.key}
                    label={t(`analytics.dqi.components.${c.key}.label`)}
                    value={c.value}
                    weight={c.weight}
                    hint={t(`analytics.dqi.components.${c.key}.hint`, c.hintVars)}
                  />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </section>

      {/* ── Target gap + Emissions decomp ── */}
      <section>
        <SectionHeader
          kicker={t('analytics.pathway.kicker')}
          title={t('analytics.pathway.title')}
          subtitle={t('analytics.pathway.subtitle')}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div {...popIn(0)}>
            <TargetGapCard gap={targetGap} navigate={navigate} />
          </motion.div>
          <motion.div {...popIn(1)}>
            <EmissionsDecomp data={emissionsDecomp} />
          </motion.div>
        </div>
      </section>

      {/* ── YoY Variance Investigator ── */}
      <section>
        <SectionHeader
          kicker={t('analytics.variance.kicker')}
          title={t('analytics.variance.title')}
          subtitle={t('analytics.variance.subtitle')}
        />
        <motion.div {...riseIn(0)} className="surface-paper overflow-hidden">
          {varianceRows.length === 0 ? (
            <div className="p-12 text-center text-[13px] text-[var(--text-tertiary)]">{t('analytics.variance.empty')}</div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-micro uppercase tracking-[0.06em] text-[var(--text-tertiary)] bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                  <th className="text-left px-5 py-3 font-semibold">{t('analytics.variance.columns.disclosure')}</th>
                  <th className="text-right px-3 py-3 font-semibold">{t('analytics.variance.columns.prior')}</th>
                  <th className="text-right px-3 py-3 font-semibold">{t('analytics.variance.columns.current')}</th>
                  <th className="text-right px-3 py-3 font-semibold">{t('analytics.variance.columns.delta')}</th>
                  <th className="text-left px-3 py-3 font-semibold">{t('analytics.variance.columns.assessment')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {varianceRows.slice(0, 12).map((r, i) => {
                  const deltaAbs = Math.abs(r.delta ?? 0)
                  const flag = r.delta == null ? 'no-baseline' : deltaAbs > 20 ? 'warn' : deltaAbs > 5 ? 'watch' : 'ok'
                  return (
                    <motion.tr key={r.assignment.id} {...slideInLeft(i)} className="hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="text-micro font-bold text-[var(--color-brand)] tracking-[0.05em] uppercase">{r.assignment.gri_code}</div>
                        <div className="text-[13px] text-[var(--text-primary)] truncate max-w-[420px] font-medium mt-0.5">{itemLabel(r.assignment, i18n.language)}</div>
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums">
                        {r.priorValue != null ? (
                          <>
                            <div className="text-[13px] text-[var(--text-secondary)] font-medium">{formatBig(r.priorValue)}</div>
                            <div className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('analytics.variance.fy', { year: r.priorYear })}</div>
                          </>
                        ) : <span className="text-[var(--text-tertiary)] italic">—</span>}
                      </td>
                      <td className="px-3 py-3.5 text-right font-bold tabular-nums text-[var(--text-primary)] text-[14px] tracking-[-0.01em]">
                        {formatBig(r.assignment.value!)}
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        {r.delta == null ? <span className="text-[var(--text-tertiary)]">—</span> : (
                          <span className={`inline-flex items-center gap-1 font-bold tabular-nums text-[12.5px] px-2 py-0.5 rounded-[6px] ${
                            r.delta < 0 ? 'text-[var(--status-ok)] bg-[var(--accent-green-light)]' : r.delta > 0 ? 'text-[var(--status-reject)] bg-[var(--accent-red-light)]' : 'text-[var(--text-tertiary)]'
                          }`}>
                            {r.delta < -0.5 ? <TrendingDown className="w-3 h-3" /> : r.delta > 0.5 ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            {r.delta > 0 ? '+' : ''}{r.delta.toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <VarianceFlag flag={flag} />
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </motion.div>
      </section>

      {/* ── Plant scorecard + Materiality coverage ── */}
      <section>
        <SectionHeader
          kicker={t('analytics.performance.kicker')}
          title={t('analytics.performance.title')}
          subtitle={t('analytics.performance.subtitle')}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div {...popIn(0)}>
            <PlantScorecard rows={plantScores} navigate={navigate} />
          </motion.div>
          <motion.div {...popIn(1)}>
            <MaterialityCoverage rows={materialityCoverage} navigate={navigate} />
          </motion.div>
        </div>
      </section>
    </div>
  )
}

// ─── DQI ring + components ─────────────────────────────────────

function DqiRing({ score }: { score: number }) {
  const { t } = useTranslation()
  const radius = 80
  const c = 2 * Math.PI * radius
  const color = score >= 85 ? '#10B981' : score >= 65 ? '#F59E0B' : '#EF4444'
  const label = score >= 85 ? t('analytics.dqi.ring.strong') : score >= 65 ? t('analytics.dqi.ring.improving') : t('analytics.dqi.ring.needsWork')
  return (
    <div className="relative w-[200px] h-[200px] mx-auto">
      <svg width={200} height={200} viewBox="0 0 200 200">
        <circle cx={100} cy={100} r={radius} fill="none" stroke="var(--bg-tertiary)" strokeWidth={14} />
        <motion.circle
          cx={100} cy={100} r={radius} fill="none" stroke={color}
          strokeWidth={14} strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (score / 100) * c }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          transform="rotate(-90 100 100)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[44px] font-bold leading-none tabular-nums" style={{ color }}>
          <AnimatedNumber value={score} />
        </div>
        <div className="text-micro uppercase tracking-[0.06em] font-bold mt-1" style={{ color }}>{label}</div>
        <div className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('analytics.dqi.ring.composite')}</div>
      </div>
    </div>
  )
}

function DqiComponent({ label, value, weight, hint }: { label: string; value: number; weight: number; hint: string }) {
  const color = value >= 85 ? 'var(--status-ok)' : value >= 65 ? 'var(--status-draft)' : 'var(--status-reject)'
  return (
    <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3.5 transition-all hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-xs)]">
      <div className="flex items-center justify-between">
        <span className="text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)]">{label}</span>
        <span className="text-caption text-[var(--text-quaternary)] tabular-nums font-medium">{weight}%</span>
      </div>
      <div className="text-[26px] font-bold tabular-nums leading-none mt-2 tracking-[-0.02em]" style={{ color }}>
        <AnimatedNumber value={value} />
      </div>
      <div className="text-caption text-[var(--text-tertiary)] mt-1.5 line-clamp-1">{hint}</div>
      <div className="mt-2.5 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
        <motion.div className="h-full rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.9, delay: 0.2 }}
                    style={{ background: color, boxShadow: value > 0 ? `0 0 6px ${color}55` : 'none' }} />
      </div>
    </div>
  )
}

// ─── Target gap ───────────────────────────────────────────

function TargetGapCard({ gap, navigate }: { gap: ReturnType<typeof useMemo> extends infer T ? T : never; navigate: (p: string) => void }) {
  const { t } = useTranslation()
  if (!gap) {
    return (
      <div className="surface-outlined p-6 h-full">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-8 h-8 rounded-[9px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
            <TargetIcon className="w-4 h-4" />
          </span>
          <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">{t('analytics.target.emptyTitle')}</h3>
        </div>
        <p className="text-[12.5px] text-[var(--text-tertiary)] leading-relaxed mt-3">
          {t('analytics.target.emptyBody')}
        </p>
      </div>
    )
  }
  const g = gap as {
    target: OrgTarget; baseline: number; targetValue: number; current: number
    pathway: Array<{ year: number; linear: number; actual: number | null }>
    gap: number; requiredAnnualAbatement: number; yearsRemaining: number; onTrack: boolean
  }

  return (
    <div className="surface-paper overflow-hidden h-full">
      <header className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
            <TargetIcon className="w-3.5 h-3.5" />
          </span>
          <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">{t('analytics.target.title')}</h3>
        </div>
        <span className={`text-micro font-bold uppercase tracking-[0.06em] px-2 py-0.5 rounded-full ${g.onTrack ? 'bg-[var(--accent-green-light)] text-[var(--status-ok)]' : 'bg-[var(--accent-red-light)] text-[var(--status-reject)]'}`}>
          {g.onTrack ? t('analytics.target.onPathway') : t('analytics.target.behindPathway')}
        </span>
      </header>

      <div className="p-5">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={g.pathway} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="linear-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={v => formatBig(v)} width={38} />
              <Tooltip formatter={(v: number) => formatBig(v) + ' ' + g.target.baseline_unit} contentStyle={{ fontSize: 11, border: '1px solid var(--border-default)', borderRadius: 4 }} />
              <Area type="monotone" dataKey="linear" name={t('analytics.target.series.pathway')} stroke="var(--color-brand)" strokeWidth={2} fill="url(#linear-grad)" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="actual" name={t('analytics.target.series.actual')} stroke="#EF4444" strokeWidth={3} fill="transparent" dot={{ r: 4, fill: '#EF4444' }} connectNulls />
              <ReferenceLine y={g.targetValue} stroke="var(--status-ok)" strokeDasharray="2 2" label={{ value: t('analytics.target.series.target'), position: 'right', fill: 'var(--status-ok)', fontSize: 9 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <Stat label={t('analytics.target.stats.currentGap')}            value={g.gap > 0 ? `+${formatBig(g.gap)}` : formatBig(-g.gap)} tone={g.gap <= 0 ? 'ok' : 'reject'} suffix={g.target.baseline_unit} />
          <Stat label={t('analytics.target.stats.requiredAbatement')} value={formatBig(Math.max(0, g.requiredAnnualAbatement))} tone="neutral" suffix={t('analytics.target.perYear', { unit: g.target.baseline_unit })} />
          <Stat label={t('analytics.target.stats.yearsToTarget')}          value={String(g.yearsRemaining)} tone="neutral" />
        </div>
        {!g.onTrack && (
          <div className="mt-3 p-2.5 rounded-[var(--radius-sm)] bg-[var(--accent-red-light)]/50 border border-[var(--status-reject)]/20 text-caption text-[var(--status-reject)]">
            <AlertTriangle className="w-3 h-3 inline -mt-0.5 mr-1" />
            {t('analytics.target.behindWarning', { gap: formatBig(g.gap), abatement: formatBig(Math.max(0, g.requiredAnnualAbatement)), unit: g.target.baseline_unit })}
          </div>
        )}
        <div className="mt-3">
          <button onClick={() => navigate('/admin/materiality')} className="text-caption text-[var(--color-brand)] hover:underline">{t('analytics.target.manageLink')}</button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, tone, suffix }: { label: string; value: string; tone: 'ok' | 'reject' | 'neutral'; suffix?: string }) {
  const color = tone === 'ok' ? 'var(--status-ok)' : tone === 'reject' ? 'var(--status-reject)' : 'var(--text-primary)'
  return (
    <div className="p-3 rounded-[8px] bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
      <div className="text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)]">{label}</div>
      <div className="text-[15px] font-bold tabular-nums mt-1 tracking-[-0.01em]" style={{ color }}>{value}{suffix && <span className="text-caption text-[var(--text-tertiary)] ml-1 font-medium">{suffix}</span>}</div>
    </div>
  )
}

// ─── Emissions decomposition ──────────────────────────────

function EmissionsDecomp({ data }: { data: Array<{ plant: string; s1: number; s2: number; s3: number; total: number }> }) {
  const { t } = useTranslation()
  if (data.length === 0) {
    return (
      <div className="surface-outlined p-6 h-full">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-8 h-8 rounded-[9px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
            <Factory className="w-4 h-4" />
          </span>
          <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">{t('analytics.emissions.title')}</h3>
        </div>
        <p className="text-[12.5px] text-[var(--text-tertiary)] leading-relaxed mt-3">
          {t('analytics.emissions.empty')}
        </p>
      </div>
    )
  }
  return (
    <div className="surface-paper overflow-hidden h-full">
      <header className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
          <Factory className="w-3.5 h-3.5" />
        </span>
        <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">{t('analytics.emissions.title')}</h3>
      </header>
      <div className="p-5">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="plant" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} angle={-20} textAnchor="end" height={50} interval={0} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={v => formatBig(v)} width={42} />
              <Tooltip formatter={(v: number) => formatBig(v) + ' tCO₂e'} contentStyle={{ fontSize: 11, border: '1px solid var(--border-default)', borderRadius: 4 }} />
              <Bar dataKey="s1" stackId="s" fill="#0F7B6F" name={t('analytics.emissions.scope1')} />
              <Bar dataKey="s2" stackId="s" fill="#2563EB" name={t('analytics.emissions.scope2')} />
              <Bar dataKey="s3" stackId="s" fill="#7C3AED" name={t('analytics.emissions.scope3')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 text-caption text-[var(--text-tertiary)]">
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded" style={{ background: '#0F7B6F' }} /> {t('analytics.emissions.scope1')}</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded" style={{ background: '#2563EB' }} /> {t('analytics.emissions.scope2')}</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded" style={{ background: '#7C3AED' }} /> {t('analytics.emissions.scope3')}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Variance flag pill ──────────────────────────────────

function VarianceFlag({ flag }: { flag: 'ok' | 'watch' | 'warn' | 'no-baseline' }) {
  const { t } = useTranslation()
  const map: Record<typeof flag, { label: string; bg: string; fg: string; icon: typeof CheckCircle2 }> = {
    ok:            { label: t('analytics.variance.flags.ok'),         bg: 'var(--accent-green-light)', fg: 'var(--status-ok)',     icon: CheckCircle2 },
    watch:         { label: t('analytics.variance.flags.watch'),      bg: 'var(--accent-amber-light)', fg: 'var(--status-draft)',  icon: Clock },
    warn:          { label: t('analytics.variance.flags.warn'),       bg: 'var(--accent-red-light)',   fg: 'var(--status-reject)', icon: AlertTriangle },
    'no-baseline': { label: t('analytics.variance.flags.noBaseline'), bg: 'var(--bg-tertiary)',        fg: 'var(--text-tertiary)', icon: Minus },
  }
  const m = map[flag]
  const Icon = m.icon
  return (
    <span className="inline-flex items-center gap-1 text-micro font-bold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded" style={{ background: m.bg, color: m.fg }}>
      <Icon className="w-2.5 h-2.5" /> {m.label}
    </span>
  )
}

// ─── Plant scorecard ──────────────────────────────────────

function PlantScorecard({ rows, navigate }: {
  rows: Array<{ plant: { id: string; name: string; country?: string }; total: number; approved: number; rejected: number; overdue: number; avgDays: number | null; completion: number; score: number }>
  navigate: (p: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="surface-paper overflow-hidden h-full">
      <header className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
            <Factory className="w-3.5 h-3.5" />
          </span>
          <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">{t('analytics.plant.title')}</h3>
        </div>
        <button onClick={() => navigate('/aggregator')} className="text-[12px] font-semibold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] link-underline">{t('analytics.plant.rollup')}</button>
      </header>
      {rows.length === 0 ? (
        <div className="p-10 text-center text-[13px] text-[var(--text-tertiary)]">{t('analytics.plant.empty')}</div>
      ) : (
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-micro uppercase tracking-[0.06em] text-[var(--text-tertiary)] bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
              <th className="text-left px-5 py-3 font-semibold">{t('analytics.plant.columns.plant')}</th>
              <th className="text-center px-2 py-3 font-semibold">{t('analytics.plant.columns.score')}</th>
              <th className="text-center px-2 py-3 font-semibold">{t('analytics.plant.columns.complete')}</th>
              <th className="text-center px-2 py-3 font-semibold">{t('analytics.plant.columns.reject')}</th>
              <th className="text-center px-2 py-3 font-semibold">{t('analytics.plant.columns.overdue')}</th>
              <th className="text-center px-3 py-3 font-semibold">{t('analytics.plant.columns.days')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {rows.map((r, i) => (
              <motion.tr key={r.plant.id} {...slideInLeft(i)} className="hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="px-5 py-3">
                  <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate tracking-[-0.005em]">{r.plant.name}</div>
                  {r.plant.country && <div className="text-micro text-[var(--text-tertiary)] uppercase tracking-[0.06em] mt-0.5 font-medium">{r.plant.country}</div>}
                </td>
                <td className="px-2 py-3 text-center">
                  <ScorePill score={r.score} />
                </td>
                <td className="px-2 py-3 text-center text-caption tabular-nums text-[var(--text-secondary)] font-medium">{r.completion}%</td>
                <td className="px-2 py-3 text-center text-caption tabular-nums">
                  {r.rejected === 0 ? <span className="text-[var(--text-quaternary)]">—</span> : <span className="text-[var(--status-reject)] font-bold">{r.rejected}</span>}
                </td>
                <td className="px-2 py-3 text-center text-caption tabular-nums">
                  {r.overdue === 0 ? <span className="text-[var(--text-quaternary)]">—</span> : <span className="text-[var(--status-reject)] font-bold">{r.overdue}</span>}
                </td>
                <td className="px-3 py-3 text-center text-caption tabular-nums text-[var(--text-secondary)] font-medium">
                  {r.avgDays != null ? t('analytics.plant.daysValue', { days: r.avgDays.toFixed(0) }) : '—'}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function ScorePill({ score }: { score: number }) {
  const color = score >= 85 ? 'var(--status-ok)' : score >= 65 ? 'var(--status-draft)' : 'var(--status-reject)'
  const bg = score >= 85 ? 'var(--accent-green-light)' : score >= 65 ? 'var(--accent-amber-light)' : 'var(--accent-red-light)'
  return <span className="inline-block text-[12px] font-bold tabular-nums px-2.5 py-1 rounded-full tracking-[-0.01em]" style={{ background: bg, color }}>{score}</span>
}

// ─── Materiality coverage ─────────────────────────────────

function MaterialityCoverage({ rows, navigate }: {
  rows: Array<{ topic: MaterialTopic; total: number; covered: number; approved: number; coveragePct: number; approvedPct: number }>
  navigate: (p: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="surface-paper overflow-hidden h-full">
      <header className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent-purple-light)', color: 'var(--accent-purple)' }}>
            <Scale className="w-3.5 h-3.5" />
          </span>
          <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">{t('analytics.materiality.title')}</h3>
        </div>
        <button onClick={() => navigate('/admin/materiality')} className="text-[12px] font-semibold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] link-underline">{t('analytics.materiality.manage')}</button>
      </header>
      {rows.length === 0 ? (
        <div className="p-10 text-center text-[13px] text-[var(--text-tertiary)]">
          {t('analytics.materiality.empty')}
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {rows.map((r, i) => (
            <motion.li key={r.topic.id} {...slideInLeft(i)} className="px-5 py-3 hover:bg-[var(--bg-secondary)] transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate flex-1 tracking-[-0.005em]">{r.topic.topic_name}</span>
                <span className="text-micro text-[var(--text-tertiary)] uppercase tracking-[0.06em] font-medium">{r.topic.topic_category}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${r.approvedPct}%` }} transition={{ duration: 0.9, delay: 0.1 + i * 0.04 }}
                    style={{ background: r.approvedPct === 100 ? 'var(--status-ok)' : r.approvedPct >= 50 ? 'var(--color-brand)' : 'var(--status-draft)' }}
                  />
                </div>
                <span className="text-caption tabular-nums text-[var(--text-tertiary)] flex-shrink-0 font-medium">
                  {r.approved}<span className="text-[var(--text-quaternary)]">/{r.total}</span>
                </span>
              </div>
              {r.coveragePct < 100 && (
                <div className="text-caption text-[var(--status-draft)] mt-1.5 font-medium">
                  {t('analytics.materiality.unassigned', { count: r.total - r.covered })}
                </div>
              )}
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  )
}
