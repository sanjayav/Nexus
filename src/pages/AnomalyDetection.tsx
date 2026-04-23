import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertOctagon, AlertTriangle, Info, Shield, TrendingUp,
  CheckCircle2, FileText, Activity, Filter,
} from 'lucide-react'
import { orgStore, type AnomalyScanResult, type AnomalyType } from '../lib/orgStore'
import { useAuth } from '../auth/AuthContext'
import { resolveRole } from '../lib/rbac'
import PageHeader from '../components/PageHeader'
import SectionHeader from '../design-system/components/SectionHeader'
import AnomalyFeed from '../components/AnomalyFeed'
import { SkeletonCard } from '../design-system/components/Skeleton'
import { popIn, riseIn } from '../components/motion'

/**
 * Anomaly Detection — full-page. Everyone can see this, but the scope defaults
 * to their role (data contributor sees their own, plant manager sees their plant,
 * SO/admin sees the whole org). Suppressions are tracked with reason + actor.
 */
export default function AnomalyDetection() {
  const { user } = useAuth()
  const role = resolveRole(user)
  const defaultScope = role === 'data_contributor' ? 'mine' : role === 'platform_admin' ? 'all' : 'role'
  const [scope, setScope] = useState<'mine' | 'role' | 'all'>(defaultScope)
  const [data, setData] = useState<AnomalyScanResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setErr(null)
    orgStore.anomalyScan(scope, { includeSuppressed: true, limit: 400 })
      .then(d => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(e => { if (!cancelled) { setErr(e instanceof Error ? e.message : 'Load failed'); setLoading(false) } })
    return () => { cancelled = true }
  }, [scope])

  const byType = useMemo(() => {
    if (!data) return [] as Array<{ type: AnomalyType; count: number }>
    const entries = Object.entries(data.summary.by_type) as Array<[AnomalyType, number]>
    return entries.map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count)
  }, [data])

  const topEntities = useMemo(() => {
    if (!data) return [] as Array<{ entity: string; count: number; critical: number }>
    const map = new Map<string, { count: number; critical: number }>()
    for (const a of data.anomalies) {
      const cur = map.get(a.entity_name) ?? { count: 0, critical: 0 }
      cur.count += 1
      if (a.severity === 'critical') cur.critical += 1
      map.set(a.entity_name, cur)
    }
    return Array.from(map.entries()).map(([entity, v]) => ({ entity, ...v })).sort((a, b) => b.count - a.count).slice(0, 8)
  }, [data])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-[120px] rounded-[18px] skeleton" />
        <SkeletonCard />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Quality"
        title="Anomaly detection"
        subtitle="Nine statistical and integrity rules running live across every disclosure in scope. Findings are severity-ranked, traceable to the disclosure, and fully dismissable with an audit-logged reason."
        actions={
          <div className="flex items-center gap-1.5">
            <ScopeTab active={scope === 'mine'} onClick={() => setScope('mine')}>Mine</ScopeTab>
            <ScopeTab active={scope === 'role'} onClick={() => setScope('role')}>My scope</ScopeTab>
            {(role === 'platform_admin' || role === 'group_sustainability_officer' || role === 'auditor') && (
              <ScopeTab active={scope === 'all'} onClick={() => setScope('all')}>Org-wide</ScopeTab>
            )}
          </div>
        }
      />

      {err && <div className="surface-paper p-4 text-[var(--accent-red)]">{err}</div>}

      {data && (
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <HeadlineCard icon={<AlertOctagon className="w-5 h-5" />} accent="red" label="Critical" count={data.summary.critical} hint="Almost certainly errors" index={0} />
          <HeadlineCard icon={<AlertTriangle className="w-5 h-5" />} accent="amber" label="Warn" count={data.summary.warn} hint="Reviewer should look" index={1} />
          <HeadlineCard icon={<Info className="w-5 h-5" />} accent="blue" label="Info" count={data.summary.info} hint="Worth noting" index={2} />
          <HeadlineCard icon={<Shield className="w-5 h-5" />} accent="green" label="Suppressed" count={data.summary.suppressed_total} hint="Acknowledged with reason" index={3} />
        </section>
      )}

      {data && (
        <section>
          <SectionHeader kicker="Distribution" title="Where the flags are" subtitle="Which rule types fire most, and which entities carry the load." />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div {...popIn(0)} className="surface-paper p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
                  <Filter className="w-3.5 h-3.5" />
                </span>
                <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)]">By rule type</h3>
              </div>
              {byType.length === 0 ? (
                <div className="py-8 text-center text-[12.5px] text-[var(--text-tertiary)]">No anomalies in scope.</div>
              ) : (
                <ul className="space-y-2.5">
                  {byType.map((r, i) => {
                    const max = byType[0]?.count ?? 1
                    const pct = Math.round((r.count / max) * 100)
                    return (
                      <li key={r.type}>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-[12.5px] font-semibold text-[var(--text-primary)]">{labelForType(r.type)}</span>
                          <span className="text-[12px] font-bold tabular-nums text-[var(--text-primary)]">{r.count}</span>
                        </div>
                        <div className="h-[5px] rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: 0.1 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                            className="h-full rounded-full"
                            style={{ background: 'var(--color-brand)' }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </motion.div>

            <motion.div {...popIn(1)} className="surface-paper p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent-purple-light)', color: 'var(--accent-purple)' }}>
                  <Activity className="w-3.5 h-3.5" />
                </span>
                <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)]">Top entities by flag count</h3>
              </div>
              {topEntities.length === 0 ? (
                <div className="py-8 text-center text-[12.5px] text-[var(--text-tertiary)]">No anomalies in scope.</div>
              ) : (
                <ul className="space-y-2">
                  {topEntities.map((e, i) => {
                    const max = topEntities[0]?.count ?? 1
                    const pct = Math.round((e.count / max) * 100)
                    return (
                      <motion.li key={e.entity} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.03 }}>
                        <div className="flex items-baseline justify-between mb-1 gap-3">
                          <span className="text-[12.5px] font-semibold text-[var(--text-primary)] truncate">{e.entity}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {e.critical > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums" style={{ background: 'var(--accent-red-light)', color: 'var(--accent-red)' }}>{e.critical} crit</span>}
                            <span className="text-[12px] font-bold tabular-nums text-[var(--text-primary)]">{e.count}</span>
                          </div>
                        </div>
                        <div className="h-[4px] rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, delay: 0.1 + i * 0.03 }} className="h-full rounded-full" style={{ background: e.critical > 0 ? 'var(--accent-red)' : 'var(--color-brand)' }} />
                        </div>
                      </motion.li>
                    )
                  })}
                </ul>
              )}
            </motion.div>
          </div>
        </section>
      )}

      <section>
        <SectionHeader kicker="Method" title="The nine rules" subtitle="Every check here is one an external auditor would run by hand. No black boxes, no AI hype — just statistically sound industry-standard checks." />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {RULES.map((r, i) => (
            <motion.div key={r.type} {...riseIn(i)} className="surface-paper p-5">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: r.bg, color: r.fg }}>
                  <r.icon className="w-3.5 h-3.5" />
                </span>
                <div className="text-[11px] uppercase tracking-[0.1em] font-bold text-[var(--text-tertiary)]">{r.severity}</div>
              </div>
              <h4 className="text-[14px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">{r.title}</h4>
              <p className="text-[12px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">{r.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader kicker="Feed" title="Live anomaly feed" subtitle="Sorted by severity. Open any flag to land on the disclosure. Suppress with a reason to mark acknowledged." />
        <AnomalyFeed scope={scope} limit={100} title="All flagged disclosures" />
      </section>
    </div>
  )
}

function HeadlineCard({ icon, accent, label, count, hint, index }: { icon: React.ReactNode; accent: 'red' | 'amber' | 'blue' | 'green'; label: string; count: number; hint: string; index: number }) {
  const palette = {
    red: { bg: 'var(--accent-red-light)', fg: 'var(--accent-red)' },
    amber: { bg: 'var(--accent-amber-light)', fg: 'var(--accent-amber)' },
    blue: { bg: 'var(--accent-blue-light)', fg: 'var(--accent-blue)' },
    green: { bg: 'var(--accent-green-light)', fg: 'var(--status-ok)' },
  }[accent]
  return (
    <motion.div {...popIn(index)} className="surface-paper p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="w-10 h-10 rounded-[10px] flex items-center justify-center" style={{ background: palette.bg, color: palette.fg }}>
          {icon}
        </span>
        <span className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: palette.fg }}>{label}</span>
      </div>
      <div className="text-[34px] leading-none font-bold tabular-nums text-[var(--text-primary)] tracking-[-0.02em]">{count}</div>
      <div className="text-[11.5px] text-[var(--text-tertiary)] mt-1.5">{hint}</div>
    </motion.div>
  )
}

function ScopeTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`chip ${active ? 'chip-active' : ''}`}>{children}</button>
  )
}

function labelForType(t: AnomalyType): string {
  switch (t) {
    case 'yoy_spike': return 'YoY variance spike'
    case 'magnitude_jump': return 'Magnitude jump'
    case 'z_score_outlier': return 'Statistical outlier'
    case 'trend_break': return 'Trend break'
    case 'unit_change': return 'Unit mismatch'
    case 'missing_evidence': return 'Missing evidence'
    case 'late_submission': return 'Late submission'
    case 'narrative_gap': return 'Narrative gap'
    case 'peer_deviation': return 'Peer deviation'
  }
}

const RULES: Array<{ type: AnomalyType; title: string; desc: string; severity: string; icon: typeof AlertOctagon; bg: string; fg: string }> = [
  { type: 'yoy_spike',       title: 'Year-over-year variance',  desc: 'Current value vs the most recent historical filing. Warns above ±20%, critical above ±50%.',                                      severity: 'Critical / Warn', icon: TrendingUp,     bg: 'var(--accent-red-light)',   fg: 'var(--accent-red)' },
  { type: 'magnitude_jump',  title: 'Magnitude jump',           desc: '8×+ (or ≤0.125×) the 4-year historical average — catches unit typos (tonnes vs kg, m³ vs litres).',                             severity: 'Critical',        icon: AlertOctagon,   bg: 'var(--accent-red-light)',   fg: 'var(--accent-red)' },
  { type: 'z_score_outlier', title: 'Statistical outlier',      desc: 'Z-score against 4-year baseline. Warn at |z|>2, critical at |z|>3.',                                                             severity: 'Critical / Warn', icon: Activity,       bg: 'var(--accent-red-light)',   fg: 'var(--accent-red)' },
  { type: 'trend_break',     title: 'Trend break',              desc: 'Reverses a 3-year monotonic direction by more than 10%. Worth a narrative explanation.',                                         severity: 'Info / Warn',     icon: TrendingUp,     bg: 'var(--accent-amber-light)', fg: 'var(--accent-amber)' },
  { type: 'unit_change',     title: 'Unit mismatch',            desc: 'Current unit string differs from the unit used in historical filings. Confirm conversion.',                                     severity: 'Warn',            icon: AlertTriangle,  bg: 'var(--accent-amber-light)', fg: 'var(--accent-amber)' },
  { type: 'missing_evidence',title: 'Missing evidence',         desc: 'Submitted, reviewed, or approved numeric entry with no evidence file attached. Audit fails without this.',                        severity: 'Critical / Warn', icon: FileText,       bg: 'var(--accent-red-light)',   fg: 'var(--accent-red)' },
  { type: 'late_submission', title: 'Late submission',          desc: 'Submitted after the recorded due date. Tracked for process improvement.',                                                         severity: 'Info / Warn',     icon: CheckCircle2,   bg: 'var(--accent-blue-light)',  fg: 'var(--accent-blue)' },
  { type: 'narrative_gap',   title: 'Narrative gap',            desc: 'Narrative disclosure approved with empty narrative_body. Disclosure will not appear in the published report.',                    severity: 'Critical',        icon: FileText,       bg: 'var(--accent-red-light)',   fg: 'var(--accent-red)' },
  { type: 'peer_deviation',  title: 'Peer plant deviation',     desc: 'Plant value sits >2σ from sibling plants for the same disclosure — boundary or operating difference.',                            severity: 'Warn',            icon: Activity,       bg: 'var(--accent-amber-light)', fg: 'var(--accent-amber)' },
]
