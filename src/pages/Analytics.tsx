import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Check, Factory, Scale, Target as TargetIcon, TrendingUp } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useFramework } from '../lib/frameworks'
import { useOrgData } from '../lib/useOrgData'
import { orgStore, type QuestionAssignment, type OrgTarget, type MaterialTopic } from '../lib/orgStore'
import { FrameworkBadge } from '../components/FrameworkBadge'
import PageHeader from '../components/PageHeader'
import SectionHeader from '../design-system/components/SectionHeader'
import { StatLedger, StateBoundary, StatusPill, NumberTicker, SkeletonLedger, SkeletonCard, type StatLedgerItem } from '../components/ui'
import { useFmt } from '../lib/fmt'
import { itemLabel } from '../lib/itemLabel'
import { dur, ease, transition } from '../motion/tokens'
import TargetGapChart from '../components/analytics/TargetGapChart'
import ScopeBars from '../components/analytics/ScopeBars'
import { computeTargetGap, scopesCovered } from '../components/analytics/targetGap'
import useEmissionsActuals, { actualsFor } from '../components/analytics/useEmissionsActuals'

type Hist = Array<{ year: number; value: number; source_report: string }>
type Flag = 'ok' | 'watch' | 'warn' | 'no-baseline'

const scoreTone = (n: number) => (n >= 85 ? 'success' : n >= 65 ? 'warning' : 'danger') as 'success' | 'warning' | 'danger'
const toneVar = { success: 'var(--status-success)', warning: 'var(--status-warning)', danger: 'var(--status-danger)' } as const

/**
 * Analytics — every chart and table is computed from live org data.
 * Ledger → Data Quality Index → target pathway + plant × scope → YoY variance
 * → plant scorecard + material topic coverage. Panels without data collapse
 * into one "Unlock more analytics" checklist instead of dashed empty cards.
 */
export default function Analytics() {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const { user } = useAuth()
  const { active: framework } = useFramework()
  const { data: orgData, loading, error, reload } = useOrgData()

  const assignments = useMemo(() => {
    if (!orgData) return [] as QuestionAssignment[]
    return orgData.assignments.filter(a => a.framework_id === framework.id)
  }, [orgData, framework.id])

  const [targets, setTargets] = useState<OrgTarget[]>([])
  const [materialTopics, setMaterialTopics] = useState<MaterialTopic[]>([])
  useEffect(() => {
    if (!user) return
    orgStore.listTargets().then(r => setTargets(Array.isArray(r) ? r : [])).catch(() => setTargets([]))
    orgStore.listMaterialTopics().then(r => setMaterialTopics(Array.isArray(r) ? r : [])).catch(() => setMaterialTopics([]))
  }, [user?.id])

  const actuals = useEmissionsActuals(orgData ? assignments : null)

  // Historical values for every approved numeric assignment (for YoY variance)
  const [histByQuestion, setHistByQuestion] = useState<Map<string, Hist>>(new Map())
  useEffect(() => {
    const approved = assignments.filter(a => a.status === 'approved' && a.response_type !== 'narrative' && a.value != null)
    if (approved.length === 0) return
    let cancelled = false
    ;(async () => {
      const pairs: Array<[string, Hist]> = await Promise.all(
        approved.map(async a => {
          try {
            return [a.questionId, await orgStore.historical(a.questionId)] as [string, Hist]
          } catch {
            return [a.questionId, [] as Hist] as [string, Hist]
          }
        }),
      )
      if (cancelled) return
      setHistByQuestion(new Map(pairs))
    })()
    return () => { cancelled = true }
  }, [assignments])

  // ── Data Quality Index (composite score 0-100) ──
  const dqi = useMemo(() => {
    if (assignments.length === 0) return null
    const total = assignments.length
    const approved = assignments.filter(a => a.status === 'approved').length
    const rejected = assignments.filter(a => a.status === 'rejected').length
    const withEvidence = assignments.filter(a => a.response_type !== 'narrative' && (a.evidence_ids?.length ?? 0) > 0).length
    const needsEvidence = assignments.filter(a =>
      a.response_type !== 'narrative' && (a.status === 'submitted' || a.status === 'reviewed' || a.status === 'approved'),
    ).length
    const onTime = assignments.filter(a => {
      if (!a.due_date) return true
      if (a.status !== 'approved') return false
      return a.last_updated ? new Date(a.last_updated).getTime() <= new Date(a.due_date).getTime() : false
    }).length
    const dueEligible = assignments.filter(a => a.due_date).length

    const completeness = (approved / total) * 100
    const timeliness = dueEligible === 0 ? 100 : (onTime / dueEligible) * 100
    const evidenceRate = needsEvidence === 0 ? 100 : (withEvidence / needsEvidence) * 100
    const rejectionPenalty = Math.max(0, 100 - (rejected / total) * 100)
    const approvedNum = assignments.filter(a => a.status === 'approved' && a.response_type !== 'narrative' && a.value != null)
    let variancePass = 0
    for (const a of approvedNum) {
      const hist = histByQuestion.get(a.questionId) || []
      const latest = hist.length > 0 ? [...hist].sort((h1, h2) => h2.year - h1.year)[0] : null
      if (!latest || latest.value === 0) { variancePass++; continue }
      if (Math.abs(((a.value! - latest.value) / latest.value) * 100) <= 20) variancePass++
    }
    const varianceScore = approvedNum.length === 0 ? 100 : (variancePass / approvedNum.length) * 100

    const composite = Math.round(
      completeness * 0.35 + timeliness * 0.15 + evidenceRate * 0.2 + rejectionPenalty * 0.15 + varianceScore * 0.15,
    )
    return {
      composite,
      components: [
        { key: 'completeness', value: Math.round(completeness), weight: 35, hintVars: { approved, total } },
        { key: 'timeliness', value: Math.round(timeliness), weight: 15, hintVars: { onTime, dueEligible } },
        { key: 'evidence', value: Math.round(evidenceRate), weight: 20, hintVars: { withEvidence, needsEvidence } },
        { key: 'rework', value: Math.round(rejectionPenalty), weight: 15, hintVars: { rejected } },
        { key: 'variance', value: Math.round(varianceScore), weight: 15, hintVars: { variancePass, approvedNum: approvedNum.length } },
      ],
      counts: { total, approved, rejected },
    }
  }, [assignments, histByQuestion])

  // ── YoY Variance table ──
  const varianceRows = useMemo(() => {
    return assignments
      .filter(a => a.status === 'approved' && a.response_type !== 'narrative' && a.value != null)
      .map(a => {
        const hist = histByQuestion.get(a.questionId) || []
        const latest = hist.length > 0 ? [...hist].sort((h1, h2) => h2.year - h1.year)[0] : null
        const delta = latest && latest.value !== 0 ? ((a.value! - latest.value) / Math.abs(latest.value)) * 100 : null
        const abs = Math.abs(delta ?? 0)
        const flag: Flag = delta == null ? 'no-baseline' : abs > 20 ? 'warn' : abs > 5 ? 'watch' : 'ok'
        return { assignment: a, priorYear: latest?.year ?? null, priorValue: latest?.value ?? null, delta, flag }
      })
      .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0))
  }, [assignments, histByQuestion])

  // ── Target gap — primary SBTi near-term target, measured on the scopes it covers ──
  const targetGap = useMemo(() => {
    const tg = targets.find(x => x.kind === 'sbti_near_term') ?? targets[0]
    if (!tg) return null
    return computeTargetGap(tg, actualsFor(actuals.history, scopesCovered(tg.scope_coverage)))
  }, [targets, actuals.history])

  // ── Plant scorecard ──
  const plantScores = useMemo(() => {
    if (!orgData) return []
    const now = Date.now()
    return orgData.entities
      .filter(e => e.type === 'plant' || e.type === 'office')
      .map(p => {
        const plantA = assignments.filter(a => a.entityId === p.id)
        const total = plantA.length
        const approved = plantA.filter(a => a.status === 'approved').length
        const rejected = plantA.filter(a => a.status === 'rejected').length
        const overdue = plantA.filter(a => a.due_date && a.status !== 'approved' && new Date(a.due_date).getTime() < now).length
        const approvedTs = plantA
          .filter(a => a.status === 'approved' && a.last_updated && a.assigned_at)
          .map(a => (new Date(a.last_updated!).getTime() - new Date(a.assigned_at).getTime()) / 86400000)
        const avgDays = approvedTs.length > 0 ? approvedTs.reduce((s, n) => s + n, 0) / approvedTs.length : null
        const completion = total === 0 ? 0 : Math.round((approved / total) * 100)
        const score = Math.round(
          completion * 0.6 +
          (total === 0 ? 20 : Math.max(0, 20 - (rejected / total) * 100)) +
          (total === 0 ? 20 : Math.max(0, 20 - (overdue / total) * 100)),
        )
        return { plant: p, total, approved, rejected, overdue, avgDays, completion, score }
      })
      .sort((a, b) => b.score - a.score)
  }, [orgData, assignments])

  // ── Materiality coverage ──
  const materialityCoverage = useMemo(() => {
    const assignedCodes = new Set(assignments.map(a => a.gri_code.split(' ')[0]))
    return materialTopics
      .filter(tp => tp.framework_id === framework.id && tp.dma_status === 'material')
      .map(tp => {
        const codes = tp.linked_gri_codes || []
        const covered = codes.filter(c => assignedCodes.has(c)).length
        const approved = codes.filter(c => assignments.some(a => a.gri_code.startsWith(c) && a.status === 'approved')).length
        return {
          topic: tp,
          total: codes.length,
          covered,
          approved,
          coveragePct: codes.length === 0 ? 0 : Math.round((covered / codes.length) * 100),
          approvedPct: codes.length === 0 ? 0 : Math.round((approved / codes.length) * 100),
        }
      })
      .sort((a, b) => a.coveragePct - b.coveragePct)
  }, [materialTopics, assignments, framework.id])

  // ── Emissions decomposition: plant × scope ──
  const emissionsDecomp = useMemo(() => {
    if (!orgData) return []
    return orgData.entities
      .filter(e => e.type === 'plant' || e.type === 'office')
      .map(p => {
        const roll = (prefix: string) => assignments
          .filter(a => a.entityId === p.id && a.status === 'approved' && a.gri_code.startsWith(prefix) && a.value != null)
          .reduce((s, a) => s + (a.value ?? 0), 0)
        const s1 = roll('305-1'), s2 = roll('305-2'), s3 = roll('305-3')
        return { label: p.name, s1, s2, s3, total: s1 + s2 + s3 }
      })
      .filter(p => p.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [orgData, assignments])

  const flagged = varianceRows.filter(r => r.flag === 'warn').length
  const coveredTopics = materialityCoverage.filter(r => r.coveragePct === 100).length

  // Panels with no data collapse into the "Unlock more analytics" checklist.
  const unlock = [
    { key: 'target', done: !!targetGap, to: '/admin/targets', icon: TargetIcon },
    { key: 'emissions', done: emissionsDecomp.length > 0, to: '/work/approval', icon: Factory },
    { key: 'variance', done: varianceRows.length > 0, to: '/my-tasks', icon: TrendingUp },
    { key: 'materiality', done: materialityCoverage.length > 0, to: '/admin/materiality', icon: Scale },
  ]
  const pending = unlock.filter(u => !u.done)

  const ledger: StatLedgerItem[] = [
    {
      id: 'dqi',
      label: t('analytics.ledger.dqi'),
      value: dqi?.composite ?? null,
      tone: dqi ? scoreTone(dqi.composite) : 'neutral',
      hint: dqi ? t(`analytics.dqi.ring.${dqi.composite >= 85 ? 'strong' : dqi.composite >= 65 ? 'improving' : 'needsWork'}`) : t('analytics.ledger.noData'),
    },
    {
      id: 'approved',
      label: t('analytics.ledger.approved'),
      value: dqi?.counts.approved ?? 0,
      tone: 'brand',
      hint: t('analytics.ledger.ofTotal', { total: f.number(dqi?.counts.total ?? 0) }),
    },
    {
      id: 'gap',
      label: t('analytics.ledger.gap'),
      value: targetGap?.gap != null ? Math.abs(targetGap.gap) : null,
      format: 'compact',
      unit: targetGap?.gap != null ? f.unit(targetGap.target.baseline_unit || 'tCO2e') : undefined,
      tone: targetGap?.gap == null ? 'neutral' : targetGap.gap > 0 ? 'danger' : 'success',
      hint: targetGap?.gap == null
        ? t('analytics.ledger.noTarget')
        : targetGap.gap > 0 ? t('analytics.ledger.abovePathway') : t('analytics.ledger.belowPathway'),
      to: targetGap ? undefined : '/admin/targets',
    },
    {
      id: 'variance',
      label: t('analytics.ledger.variance'),
      value: flagged,
      tone: flagged > 0 ? 'warning' : 'success',
      hint: t('analytics.ledger.varianceHint', { count: varianceRows.length }),
    },
    {
      id: 'topics',
      label: t('analytics.ledger.topics'),
      value: materialityCoverage.length ? `${f.number(coveredTopics)} / ${f.number(materialityCoverage.length)}` : '—',
      tone: materialityCoverage.length && coveredTopics === materialityCoverage.length ? 'success' : 'neutral',
      hint: t('analytics.ledger.topicsHint'),
      to: '/admin/materiality',
    },
  ]

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={t('analytics.header.eyebrow')}
        title={t('analytics.header.title')}
        subtitle={t('analytics.header.subtitle')}
        actions={<FrameworkBadge size="md" />}
      />

      <StateBoundary
        loading={loading}
        error={error}
        onRetry={reload}
        hasData={!!orgData}
        skeleton={
          <div className="space-y-6">
            <SkeletonLedger items={5} />
            <SkeletonCard />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><SkeletonCard /><SkeletonCard /></div>
          </div>
        }
        errorState={{ title: t('analytics.error.title'), body: t('analytics.error.body') }}
      >
        <div className="space-y-10">
          <StatLedger items={ledger} aria-label={t('analytics.ledger.aria')} />

          {/* ── Data Quality Index ── */}
          <section aria-labelledby="dqi-h">
            <SectionHeader kicker={t('analytics.dqi.kicker')} title={t('analytics.dqi.title')} subtitle={t('analytics.dqi.subtitle')} />
            <div className="surface-paper overflow-hidden">
              <StateBoundary
                empty={!dqi}
                emptyState={{
                  art: 'noData',
                  title: t('analytics.dqi.emptyTitle'),
                  body: t('analytics.dqi.emptyBody'),
                  cta: { label: t('analytics.dqi.emptyCta'), to: '/my-tasks' },
                }}
              >
                {dqi && (
                  <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 lg:gap-10 items-center">
                    <DqiRing score={dqi.composite} />
                    <ul className="divide-y divide-[var(--border-subtle)]">
                      {dqi.components.map((c, i) => (
                        <DqiRow
                          key={c.key}
                          index={i}
                          label={t(`analytics.dqi.components.${c.key}.label`)}
                          weight={t('analytics.dqi.weight', { pct: c.weight })}
                          value={c.value}
                          hint={t(`analytics.dqi.components.${c.key}.hint`, c.hintVars)}
                        />
                      ))}
                    </ul>
                  </div>
                )}
              </StateBoundary>
            </div>
          </section>

          {pending.length > 0 && <UnlockChecklist items={unlock} />}

          {/* ── Target gap + Emissions decomposition ── */}
          {(targetGap || emissionsDecomp.length > 0) && (
            <section>
              <SectionHeader kicker={t('analytics.pathway.kicker')} title={t('analytics.pathway.title')} subtitle={t('analytics.pathway.subtitle')} />
              <div className={`grid grid-cols-1 gap-4 ${targetGap && emissionsDecomp.length > 0 ? 'lg:grid-cols-2' : ''}`}>
                {targetGap && (
                  <TargetGapChart
                    gap={targetGap}
                    title={t('analytics.target.title')}
                    subtitle={targetGap.target.scope_coverage && targetGap.target.label.includes(targetGap.target.scope_coverage) ? targetGap.target.label : `${targetGap.target.label} · ${targetGap.target.scope_coverage || t('analytics.target.allScopes')}`}
                    actions={
                      targetGap.onTrack == null ? (
                        <StatusPill tone="neutral">{t('analytics.target.noActuals')}</StatusPill>
                      ) : (
                        <StatusPill tone={targetGap.onTrack ? 'success' : 'danger'} dot>
                          {targetGap.onTrack ? t('analytics.target.onPathway') : t('analytics.target.behindPathway')}
                        </StatusPill>
                      )
                    }
                    footnote={
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                        {targetGap.requiredAnnual != null && (
                          <span>
                            {t('analytics.target.stats.requiredAbatement')}{' '}
                            <strong className="text-[var(--text-primary)] tabular-nums">{f.value(targetGap.requiredAnnual, targetGap.target.baseline_unit, { compact: true })}</strong>
                            {t('analytics.target.perYearSuffix')}
                          </span>
                        )}
                        <span>
                          {t('analytics.target.stats.yearsToTarget')}{' '}
                          <strong className="text-[var(--text-primary)] tabular-nums">{f.number(targetGap.yearsRemaining)}</strong>
                        </span>
                        <Link to="/admin/targets" className="ml-auto inline-flex items-center gap-1 font-medium text-[var(--color-brand)] hover:underline">
                          {t('analytics.target.manageLink')} <ArrowRight className="w-3 h-3" aria-hidden />
                        </Link>
                      </div>
                    }
                  />
                )}
                {emissionsDecomp.length > 0 && (
                  <ScopeBars
                    rows={emissionsDecomp}
                    title={t('analytics.emissions.title')}
                    subtitle={t('analytics.emissions.subtitle')}
                    footnote={t('analytics.emissions.footnote')}
                  />
                )}
              </div>
            </section>
          )}

          {/* ── YoY Variance Investigator ── */}
          {varianceRows.length > 0 && (
            <section>
              <SectionHeader kicker={t('analytics.variance.kicker')} title={t('analytics.variance.title')} subtitle={t('analytics.variance.subtitle')} />
              <div className="surface-paper overflow-hidden">
                <ul className="sm:hidden divide-y divide-[var(--border-subtle)]">
                  {varianceRows.slice(0, 12).map(r => (
                    <li key={r.assignment.id} className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-caption font-semibold text-[var(--color-brand)] tabular-nums">{r.assignment.gri_code}</div>
                          <div className="text-small text-[var(--text-primary)] font-medium mt-0.5">{itemLabel(r.assignment, i18n.language)}</div>
                        </div>
                        <VarianceFlag flag={r.flag} />
                      </div>
                      <div className="mt-2 flex items-baseline gap-2 text-caption text-[var(--text-tertiary)] tabular-nums flex-wrap">
                        <span>{r.priorValue != null ? `${f.number(r.priorValue, { maxFraction: 1 })} (${t('analytics.variance.fy', { year: r.priorYear })})` : '—'}</span>
                        <ArrowRight className="w-3 h-3 self-center" aria-hidden />
                        <span className="text-small font-semibold text-[var(--text-primary)]">{f.number(r.assignment.value!, { maxFraction: 1 })}</span>
                        {r.assignment.unit && <span>{f.unit(r.assignment.unit)}</span>}
                        {r.delta != null && <span className={`ml-auto font-semibold ${Math.abs(r.delta) > 20 ? 'text-[var(--status-danger)]' : 'text-[var(--text-secondary)]'}`}>{f.delta(r.delta, { percent: true })}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full min-w-[640px] text-small">
                    <thead>
                      <tr className="text-caption text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
                        <th scope="col" className="text-left px-5 py-3 font-medium">{t('analytics.variance.columns.disclosure')}</th>
                        <th scope="col" className="text-right px-3 py-3 font-medium">{t('analytics.variance.columns.prior')}</th>
                        <th scope="col" className="text-right px-3 py-3 font-medium">{t('analytics.variance.columns.current')}</th>
                        <th scope="col" className="text-right px-3 py-3 font-medium">{t('analytics.variance.columns.delta')}</th>
                        <th scope="col" className="text-left px-5 py-3 font-medium">{t('analytics.variance.columns.assessment')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {varianceRows.slice(0, 12).map(r => (
                        <tr key={r.assignment.id} className="hover:bg-[var(--bg-hover)] transition-colors duration-micro">
                          <td className="px-5 py-3.5 max-w-[420px]">
                            <div className="text-caption font-semibold text-[var(--color-brand)] tabular-nums">{r.assignment.gri_code}</div>
                            <div className="text-small text-[var(--text-primary)] font-medium mt-0.5 line-clamp-2">{itemLabel(r.assignment, i18n.language)}</div>
                          </td>
                          <td className="px-3 py-3.5 text-right tabular-nums whitespace-nowrap">
                            {r.priorValue != null ? (
                              <>
                                <div className="text-[var(--text-secondary)]">{f.number(r.priorValue, { maxFraction: 1 })}</div>
                                <div className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('analytics.variance.fy', { year: r.priorYear })}</div>
                              </>
                            ) : <span className="text-[var(--text-tertiary)]">—</span>}
                          </td>
                          <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--text-primary)] whitespace-nowrap">
                            {f.number(r.assignment.value!, { maxFraction: 1 })}
                            {r.assignment.unit && <span className="ml-1 text-caption font-normal text-[var(--text-tertiary)]">{f.unit(r.assignment.unit)}</span>}
                          </td>
                          <td className="px-3 py-3.5 text-right tabular-nums whitespace-nowrap font-semibold">
                            {r.delta == null ? <span className="text-[var(--text-tertiary)] font-normal">—</span> : (
                              <span className={Math.abs(r.delta) > 20 ? 'text-[var(--status-danger)]' : Math.abs(r.delta) > 5 ? 'text-[var(--status-warning)]' : 'text-[var(--text-secondary)]'}>
                                {f.delta(r.delta, { percent: true })}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <VarianceFlag flag={r.flag} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ── Plant scorecard + Materiality coverage ── */}
          {(plantScores.length > 0 || materialityCoverage.length > 0) && (
            <section>
              <SectionHeader kicker={t('analytics.performance.kicker')} title={t('analytics.performance.title')} subtitle={t('analytics.performance.subtitle')} />
              <div className={`grid grid-cols-1 gap-4 ${plantScores.length > 0 && materialityCoverage.length > 0 ? 'lg:grid-cols-2' : ''}`}>
                {plantScores.length > 0 && <PlantScorecard rows={plantScores} />}
                {materialityCoverage.length > 0 && <MaterialityCoverage rows={materialityCoverage} />}
              </div>
            </section>
          )}
        </div>
      </StateBoundary>
    </div>
  )
}

// ─── DQI ring + component rows ─────────────────────────────────

function DqiRing({ score }: { score: number }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const radius = 84
  const c = 2 * Math.PI * radius
  const tone = scoreTone(score)
  const label = tone === 'success' ? t('analytics.dqi.ring.strong') : tone === 'warning' ? t('analytics.dqi.ring.improving') : t('analytics.dqi.ring.needsWork')
  return (
    <figure className="relative w-[200px] h-[200px] mx-auto" aria-label={t('analytics.dqi.ring.aria', { score, label })}>
      <svg width={200} height={200} viewBox="0 0 200 200" aria-hidden>
        <circle cx={100} cy={100} r={radius} fill="none" stroke="var(--bg-tertiary)" strokeWidth={10} />
        {/* 5 weight ticks: where each component's share of the composite begins */}
        {[0, 35, 50, 70, 85].map(p => {
          const a = (p / 100) * 2 * Math.PI - Math.PI / 2
          return <line key={p} x1={100 + Math.cos(a) * 76} y1={100 + Math.sin(a) * 76} x2={100 + Math.cos(a) * 92} y2={100 + Math.sin(a) * 92} stroke="var(--bg-primary)" strokeWidth={2} />
        })}
        <motion.circle
          cx={100} cy={100} r={radius} fill="none" stroke={toneVar[tone]}
          strokeWidth={10} strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (score / 100) * c }}
          transition={{ duration: 1.1, ease: ease.out, delay: 0.1 }}
          transform="rotate(-90 100 100)"
        />
      </svg>
      <figcaption className="absolute inset-0 flex flex-col items-center justify-center">
        <NumberTicker value={score} className="type-figure text-[48px] leading-none text-[var(--text-primary)]" />
        <span className="mt-2 text-caption font-semibold" style={{ color: toneVar[tone] }}>{label}</span>
        <span className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('analytics.dqi.ring.composite')}</span>
      </figcaption>
    </figure>
  )
}

function DqiRow({ label, weight, value, hint, index }: { label: string; weight: string; value: number; hint: string; index: number }) {
  const tone = scoreTone(value)
  const reduce = useReducedMotion()
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(140px,180px)_minmax(0,1fr)_56px] items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="text-small font-medium text-[var(--text-primary)]">{label}</div>
        <div className="text-caption text-[var(--text-tertiary)]">{weight}</div>
      </div>
      <div className="order-3 col-span-2 sm:order-none sm:col-span-1 min-w-0">
        <div className="h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: toneVar[tone] }}
            initial={reduce ? false : { width: '0%' }}
            animate={{ width: `${value}%` }}
            transition={{ duration: dur.slow * 2, ease: ease.out, delay: 0.15 + index * 0.05 }}
          />
        </div>
        <div className="text-caption text-[var(--text-tertiary)] mt-1.5">{hint}</div>
      </div>
      <div className="text-right">
        <NumberTicker value={value} className="type-figure text-[22px] leading-7 text-[var(--text-primary)]" />
      </div>
    </li>
  )
}

// ─── Unlock checklist (replaces dashed empty cards) ────────────

function UnlockChecklist({ items }: { items: Array<{ key: string; done: boolean; to: string; icon: typeof TargetIcon }> }) {
  const { t } = useTranslation()
  const done = items.filter(i => i.done).length
  return (
    <section className="surface-paper p-5 sm:p-6" aria-labelledby="unlock-h">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 id="unlock-h" className="type-h3 text-[var(--text-primary)]">{t('analytics.unlock.title')}</h2>
          <p className="text-small text-[var(--text-tertiary)] mt-0.5">{t('analytics.unlock.body')}</p>
        </div>
        <span className="text-caption text-[var(--text-tertiary)] tabular-nums">{t('analytics.unlock.progress', { done, total: items.length })}</span>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {items.map((it, i) => {
          const Icon = it.icon
          return (
            <motion.li key={it.key} className={it.done ? 'hidden sm:block' : undefined} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...transition.base, delay: i * 0.04 }}>
              {it.done ? (
                <div className="h-full flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] p-3.5 text-[var(--text-tertiary)]">
                  <span className="mt-0.5 w-6 h-6 rounded-full flex items-center justify-center bg-[var(--status-success)] text-[var(--bg-primary)] flex-shrink-0"><Check className="w-3.5 h-3.5" aria-hidden /></span>
                  <div className="min-w-0">
                    <div className="text-small font-medium line-through decoration-[var(--border-strong)]">{t(`analytics.unlock.items.${it.key}.title`)}</div>
                    <div className="text-caption mt-0.5">{t('analytics.unlock.unlocked')}</div>
                  </div>
                </div>
              ) : (
                <Link
                  to={it.to}
                  className="group h-full flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border-default)] p-3.5 hover:border-[var(--color-brand)] hover:bg-[var(--bg-hover)] transition-colors duration-micro"
                >
                  <span className="mt-0.5 w-6 h-6 rounded-full flex items-center justify-center border border-[var(--border-strong)] text-[var(--text-tertiary)] group-hover:text-[var(--color-brand)] group-hover:border-[var(--color-brand)] flex-shrink-0">
                    <Icon className="w-3.5 h-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-small font-medium text-[var(--text-primary)]">{t(`analytics.unlock.items.${it.key}.title`)}</div>
                    <div className="text-caption text-[var(--text-tertiary)] mt-0.5">{t(`analytics.unlock.items.${it.key}.body`)}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 mt-1 text-[var(--text-quaternary)] group-hover:text-[var(--color-brand)] group-hover:translate-x-0.5 transition-transform duration-micro" aria-hidden />
                </Link>
              )}
            </motion.li>
          )
        })}
      </ul>
    </section>
  )
}

// ─── Variance flag pill ──────────────────────────────────

function VarianceFlag({ flag }: { flag: Flag }) {
  const { t } = useTranslation()
  const map = {
    ok: { tone: 'success', label: t('analytics.variance.flags.ok') },
    watch: { tone: 'warning', label: t('analytics.variance.flags.watch') },
    warn: { tone: 'danger', label: t('analytics.variance.flags.warn') },
    'no-baseline': { tone: 'neutral', label: t('analytics.variance.flags.noBaseline') },
  } as const
  const m = map[flag]
  return <StatusPill tone={m.tone} dot={flag === 'warn'}>{m.label}</StatusPill>
}

// ─── Plant scorecard ──────────────────────────────────────

function PlantScorecard({ rows }: {
  rows: Array<{ plant: { id: string; name: string; country?: string }; total: number; approved: number; rejected: number; overdue: number; avgDays: number | null; completion: number; score: number }>
}) {
  const { t } = useTranslation()
  const f = useFmt()
  return (
    <div className="surface-paper overflow-hidden h-full">
      <header className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
        <h3 className="type-h3 text-[var(--text-primary)]">{t('analytics.plant.title')}</h3>
        <Link to="/aggregator" className="text-caption font-medium text-[var(--color-brand)] hover:underline inline-flex items-center gap-1">
          {t('analytics.plant.rollup')} <ArrowRight className="w-3 h-3" aria-hidden />
        </Link>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-small">
          <thead>
            <tr className="text-caption text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
              <th scope="col" className="text-left px-5 py-2.5 font-medium">{t('analytics.plant.columns.plant')}</th>
              <th scope="col" className="text-left px-2 py-2.5 font-medium w-[34%]">{t('analytics.plant.columns.score')}</th>
              <th scope="col" className="hidden sm:table-cell text-right px-2 py-2.5 font-medium">{t('analytics.plant.columns.reject')}</th>
              <th scope="col" className="hidden sm:table-cell text-right px-2 py-2.5 font-medium">{t('analytics.plant.columns.overdue')}</th>
              <th scope="col" className="hidden sm:table-cell text-right px-5 py-2.5 font-medium">{t('analytics.plant.columns.days')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {rows.map(r => {
              const tone = scoreTone(r.score)
              return (
                <tr key={r.plant.id} className="hover:bg-[var(--bg-hover)] transition-colors duration-micro">
                  <td className="px-5 py-3">
                    <div className="font-medium text-[var(--text-primary)] truncate max-w-[200px]">{r.plant.name}</div>
                    <div className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('analytics.plant.complete', { pct: r.completion })}</div>
                  </td>
                  <td className="px-2 sm:px-2 py-3 pr-5 sm:pr-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 text-right font-semibold tabular-nums" style={{ color: toneVar[tone] }}>{r.score}</span>
                      <span className="flex-1 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                        <span className="block h-full rounded-full" style={{ width: `${r.score}%`, background: toneVar[tone] }} />
                      </span>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-2 py-3 text-right tabular-nums">
                    {r.rejected === 0 ? <span className="text-[var(--text-quaternary)]">—</span> : <span className="text-[var(--status-danger)] font-semibold">{r.rejected}</span>}
                  </td>
                  <td className="hidden sm:table-cell px-2 py-3 text-right tabular-nums">
                    {r.overdue === 0 ? <span className="text-[var(--text-quaternary)]">—</span> : <span className="text-[var(--status-danger)] font-semibold">{r.overdue}</span>}
                  </td>
                  <td className="hidden sm:table-cell px-5 py-3 text-right tabular-nums text-[var(--text-secondary)] whitespace-nowrap">
                    {r.avgDays != null ? t('analytics.plant.daysValue', { days: f.number(r.avgDays, { maxFraction: 0 }) }) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Materiality coverage ─────────────────────────────────

function MaterialityCoverage({ rows }: {
  rows: Array<{ topic: MaterialTopic; total: number; covered: number; approved: number; coveragePct: number; approvedPct: number }>
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  return (
    <div className="surface-paper overflow-hidden h-full">
      <header className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
        <h3 className="type-h3 text-[var(--text-primary)]">{t('analytics.materiality.title')}</h3>
        <Link to="/admin/materiality" className="text-caption font-medium text-[var(--color-brand)] hover:underline inline-flex items-center gap-1">
          {t('analytics.materiality.manage')} <ArrowRight className="w-3 h-3" aria-hidden />
        </Link>
      </header>
      <ul className="divide-y divide-[var(--border-subtle)]">
        {rows.map((r, i) => (
          <li key={r.topic.id} className="px-5 py-3">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-small font-medium text-[var(--text-primary)] truncate flex-1">{r.topic.topic_name}</span>
              {r.topic.topic_category && <span className="text-caption text-[var(--text-tertiary)]">{r.topic.topic_category}</span>}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  initial={reduce ? false : { width: '0%' }}
                  animate={{ width: `${r.approvedPct}%` }}
                  transition={{ duration: 0.8, ease: ease.out, delay: 0.1 + Math.min(i, 8) * 0.04 }}
                  style={{ background: r.approvedPct === 100 ? 'var(--status-success)' : 'var(--chart-s2)' }}
                />
              </div>
              <span className="text-caption tabular-nums text-[var(--text-tertiary)] flex-shrink-0">
                {t('analytics.materiality.approvedOf', { approved: r.approved, total: r.total })}
              </span>
            </div>
            {r.coveragePct < 100 && (
              <div className="text-caption text-[var(--status-warning)] mt-1.5">
                {t('analytics.materiality.unassigned', { count: r.total - r.covered })}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
