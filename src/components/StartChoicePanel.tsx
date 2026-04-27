import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Database, ArrowRight, X, CheckCircle2, AlertTriangle, Loader2, Building2, Users, Target as TargetIcon, Scale, Calendar,
} from 'lucide-react'
import { orgStore } from '../lib/orgStore'
import { useFramework } from '../lib/frameworks'

const FRESH_DISMISS_KEY = 'aeiforo_start_choice_fresh'

interface Props {
  /** True when the workspace truly is empty (no entities). */
  show: boolean
  /** Called after either choice — parent reloads org data. */
  onComplete: () => void
}

type SeedStep = 'org' | 'targets' | 'materiality' | 'period' | 'done'

export default function StartChoicePanel({ show, onComplete }: Props) {
  const { active: framework } = useFramework()
  const [seeding, setSeeding] = useState<SeedStep | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(FRESH_DISMISS_KEY) === '1' } catch { return false }
  })

  if (!show || dismissed) return null

  const startFresh = () => {
    try { localStorage.setItem(FRESH_DISMISS_KEY, '1') } catch { /* ignore */ }
    setDismissed(true)
    onComplete()
  }

  const seedPttgc = async () => {
    setError(null)
    try {
      // ── Step 1: org tree ──
      setSeeding('org')
      const group = await orgStore.addEntity({
        parentId: null, type: 'group', name: 'PTT Global Chemical', code: 'PTTGC', country: 'TH', equity: 100, industry: 'Chemicals',
      })
      const subs = await Promise.all([
        orgStore.addEntity({ parentId: group.id, type: 'subsidiary', name: 'GC Marketing Solutions', code: 'GCM', country: 'TH', equity: 100, industry: 'Trading' }),
        orgStore.addEntity({ parentId: group.id, type: 'subsidiary', name: 'GC Polyols',             code: 'GCP', country: 'TH', equity: 100, industry: 'Polymers' }),
        orgStore.addEntity({ parentId: group.id, type: 'subsidiary', name: 'HMC Polymers',           code: 'HMC', country: 'TH', equity: 41, industry: 'Polymers' }),
      ])
      const [gcm, gcp, hmc] = subs
      await Promise.all([
        orgStore.addEntity({ parentId: gcm.id, type: 'plant', name: 'Map Ta Phut Olefins',     code: 'MTP-OL',  country: 'TH', equity: 100, industry: 'Chemicals' }),
        orgStore.addEntity({ parentId: gcp.id, type: 'plant', name: 'Rayong Polyols Plant',    code: 'RYP',     country: 'TH', equity: 100, industry: 'Polymers' }),
        orgStore.addEntity({ parentId: hmc.id, type: 'plant', name: 'HMC Rayong PP Train 3',   code: 'HMC-PP3', country: 'TH', equity: 41,  industry: 'Polymers' }),
      ])

      // ── Step 2: climate targets ──
      setSeeding('targets')
      await orgStore.upsertTarget({
        framework_id: framework.id,
        kind: 'sbti_near_term',
        label: 'Reduce Scope 1+2 by 20% by 2030 vs 2020 baseline',
        scope_coverage: 'Scope 1+2',
        baseline_year: 2020,
        baseline_value: 8120000,
        baseline_unit: 'tCO2e',
        target_year: 2030,
        target_reduction_pct: 20,
        status: 'committed',
      })
      await orgStore.upsertTarget({
        framework_id: framework.id,
        kind: 'net_zero',
        label: 'Net-zero across all scopes by 2050',
        scope_coverage: 'Scope 1+2+3',
        baseline_year: 2020,
        baseline_value: 38400000,
        baseline_unit: 'tCO2e',
        target_year: 2050,
        target_reduction_pct: 90,
        status: 'committed',
      })

      // ── Step 3: material topics ──
      setSeeding('materiality')
      const topics = [
        { topic_name: 'Climate change & GHG emissions',     topic_category: 'Environmental', linked_gri_codes: ['305-1','305-2','305-3','305-5'], impact_score: 4.7, financial_score: 4.6, dma_status: 'material' as const },
        { topic_name: 'Water management',                    topic_category: 'Environmental', linked_gri_codes: ['303-3','303-4','303-5'],         impact_score: 4.2, financial_score: 3.8, dma_status: 'material' as const },
        { topic_name: 'Process safety & asset integrity',   topic_category: 'Social',        linked_gri_codes: ['403-9','403-10'],                  impact_score: 4.5, financial_score: 4.4, dma_status: 'material' as const },
        { topic_name: 'Circular economy & product stewardship', topic_category: 'Environmental', linked_gri_codes: ['301-1','301-2','306-3'],      impact_score: 4.0, financial_score: 3.9, dma_status: 'material' as const },
        { topic_name: 'Business ethics & anti-corruption',  topic_category: 'Governance',    linked_gri_codes: ['205-2','205-3'],                   impact_score: 3.8, financial_score: 4.2, dma_status: 'material' as const },
      ]
      for (const t of topics) {
        await orgStore.upsertMaterialTopic({ framework_id: framework.id, ...t })
      }

      // ── Step 4: reporting period ──
      setSeeding('period')
      await orgStore.createPeriod({
        framework_id: framework.id,
        year: 2025,
        label: 'FY2025',
        status: 'active',
        start_date: '2025-01-01',
        end_date: '2025-12-31',
      })

      setSeeding('done')
      // Tiny pause so the user sees the success state before the panel disappears
      setTimeout(() => onComplete(), 600)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Seed failed')
      setSeeding(null)
    }
  }

  const SEED_STAGES: { key: SeedStep; icon: typeof Building2; label: string }[] = [
    { key: 'org',         icon: Building2,  label: 'Organisation tree (group + 3 subsidiaries + 3 plants)' },
    { key: 'targets',     icon: TargetIcon, label: 'Climate targets (SBTi + net-zero)' },
    { key: 'materiality', icon: Scale,      label: 'Material topics (5 priority issues)' },
    { key: 'period',      icon: Calendar,   label: 'FY2025 reporting cycle' },
  ]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className="surface-paper p-6 relative overflow-hidden"
      >
        <div
          aria-hidden
          className="absolute -top-24 -right-24 w-[320px] h-[320px] rounded-full pointer-events-none opacity-50"
          style={{ background: 'radial-gradient(circle, rgba(27,107,123,0.12), transparent 70%)' }}
        />

        {/* Hide while seeding so the user doesn't accidentally dismiss mid-flow */}
        {!seeding && (
          <button
            onClick={startFresh}
            className="absolute top-3 right-3 w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer z-10"
            title="Skip and walk through manually"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="kicker">Pick how to start</span>
          </div>

          <h2 className="font-display text-[22px] font-bold text-[var(--text-primary)] tracking-[-0.01em]">
            Fresh workspace, or load PTT Global Chemical sample data?
          </h2>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 max-w-2xl leading-relaxed">
            Choose how you want to drive this demo. You can switch later — both modes use the same publish, anomaly, and assurance flows.
          </p>

          {!seeding && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
              {/* Card 1: Fresh start */}
              <motion.button
                whileHover={{ y: -2 }}
                onClick={startFresh}
                className="group text-left p-5 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--color-brand)] hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="chip" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: 10 }}>FOR EVALUATORS</span>
                </div>
                <div className="text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">Start fresh</div>
                <p className="text-[12px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                  Empty workspace. Walk through every onboarding step yourself — build the org tree, set targets, configure cycles, publish your first report.
                </p>
                <div className="text-[12px] font-semibold mt-3 inline-flex items-center gap-1 group-hover:gap-1.5 transition-all text-[var(--color-brand)]">
                  Begin onboarding <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </motion.button>

              {/* Card 2: PTTGC seed */}
              <motion.button
                whileHover={{ y: -2 }}
                onClick={seedPttgc}
                className="group text-left p-5 rounded-[12px] border-2 border-[var(--color-brand)] bg-[var(--accent-teal-subtle)]/40 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                style={{ boxShadow: '0 0 0 4px var(--accent-teal-subtle)' }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 text-white" style={{ background: 'linear-gradient(135deg, #1B6B7B, #2E7D32)' }}>
                    <Database className="w-5 h-5" />
                  </div>
                  <span className="chip" style={{ background: 'var(--color-brand)', color: 'white', fontSize: 10 }}>RECOMMENDED FOR DEMO</span>
                </div>
                <div className="text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">Load PTT Global Chemical sample</div>
                <p className="text-[12px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                  Pre-fills the workspace with PTTGC's org tree, 2 climate targets, 5 material topics, and an FY2025 reporting cycle. Publish a real-looking report in two clicks.
                </p>
                <div className="text-[12px] font-semibold mt-3 inline-flex items-center gap-1 group-hover:gap-1.5 transition-all text-[var(--color-brand-strong)]">
                  Pre-fill my workspace <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </motion.button>
            </div>
          )}

          {/* Seeding progress */}
          {seeding && (
            <div className="mt-5 space-y-2">
              {SEED_STAGES.map((stage) => {
                const stageOrder = SEED_STAGES.findIndex(s => s.key === stage.key)
                const currentOrder = seeding === 'done' ? 999 : SEED_STAGES.findIndex(s => s.key === seeding)
                const isDone = stageOrder < currentOrder
                const isActive = stageOrder === currentOrder
                const Icon = stage.icon
                return (
                  <div
                    key={stage.key}
                    className="flex items-center gap-3 p-3 rounded-[10px] border"
                    style={{
                      background: isActive ? 'var(--accent-teal-subtle)' : isDone ? 'var(--accent-green-light)' : 'var(--bg-secondary)',
                      borderColor: isActive ? 'var(--color-brand)' : isDone ? 'rgba(46,125,50,0.3)' : 'var(--border-subtle)',
                    }}
                  >
                    <div className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{
                      background: isActive ? 'var(--color-brand)' : isDone ? 'var(--status-ok)' : 'var(--bg-tertiary)',
                      color: isActive || isDone ? 'white' : 'var(--text-tertiary)',
                    }}>
                      {isActive
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : isDone
                          ? <CheckCircle2 className="w-3.5 h-3.5" />
                          : <Icon className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 text-[12.5px] font-medium" style={{ color: isActive ? 'var(--text-primary)' : isDone ? 'var(--status-ok)' : 'var(--text-secondary)' }}>
                      {stage.label}
                    </div>
                    {isActive && <span className="text-[10.5px] uppercase tracking-[0.1em] font-semibold text-[var(--color-brand)]">Working…</span>}
                    {isDone && <span className="text-[10.5px] uppercase tracking-[0.1em] font-semibold text-[var(--status-ok)]">Done</span>}
                  </div>
                )
              })}

              {seeding === 'done' && (
                <div className="flex items-center gap-2 p-3 rounded-[10px] bg-[var(--accent-green-light)]" style={{ borderColor: 'rgba(46,125,50,0.3)' }}>
                  <CheckCircle2 className="w-5 h-5 text-[var(--status-ok)]" />
                  <span className="text-[13px] font-semibold text-[var(--status-ok)]">All set. Your dashboard is now populated with PTTGC sample data.</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-5 flex items-start gap-3 p-4 rounded-[10px] bg-[var(--accent-red-light)] border border-[rgba(220,38,38,0.3)]">
              <AlertTriangle className="w-5 h-5 text-[var(--status-reject)] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-[var(--text-primary)]">Couldn't seed the workspace</div>
                <div className="text-[12px] text-[var(--text-secondary)] mt-1 break-words">{error}</div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => { setError(null); seedPttgc() }} className="text-[12px] font-semibold text-[var(--color-brand)] hover:underline cursor-pointer">Try again</button>
                  <span className="text-[12px] text-[var(--text-tertiary)]">·</span>
                  <button onClick={startFresh} className="text-[12px] font-semibold text-[var(--text-secondary)] hover:underline cursor-pointer">Start fresh instead</button>
                </div>
              </div>
            </div>
          )}

          {/* Disclosure */}
          <div className="mt-4 inline-flex items-center gap-3 text-[10.5px] text-[var(--text-tertiary)]">
            <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" /> 7 entities</span>
            <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> users seeded by setup</span>
            <span className="inline-flex items-center gap-1"><TargetIcon className="w-3 h-3" /> 2 targets</span>
            <span className="inline-flex items-center gap-1"><Scale className="w-3 h-3" /> 5 topics</span>
            <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> FY2025 period</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
