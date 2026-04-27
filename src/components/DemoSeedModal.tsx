import { useState } from 'react'
import {
  Database, X, CheckCircle2, AlertTriangle, Loader2,
  Building2, Target as TargetIcon, Scale, Calendar, Sparkles,
} from 'lucide-react'
import { orgStore } from '../lib/orgStore'
import { useFramework } from '../lib/frameworks'

type SeedStep = 'org' | 'targets' | 'materiality' | 'period' | 'done'

interface Props {
  onClose: () => void
  /** Called once seeding succeeds — parent should reload org data. */
  onCompleted: () => void
}

/**
 * One-click "Load PTTGC sample" modal. Opt-in only — surfaced from the
 * SetupGuide as a small action so the default workspace is clean for users
 * who want to onboard manually.
 */
export default function DemoSeedModal({ onClose, onCompleted }: Props) {
  const { active: framework } = useFramework()
  const [seeding, setSeeding] = useState<SeedStep | null>(null)
  const [error, setError] = useState<string | null>(null)

  const SEED_STAGES: { key: SeedStep; icon: typeof Building2; label: string }[] = [
    { key: 'org',         icon: Building2,  label: 'Organisation tree (group + 3 subsidiaries + 3 plants)' },
    { key: 'targets',     icon: TargetIcon, label: 'Climate targets (SBTi + net-zero)' },
    { key: 'materiality', icon: Scale,      label: 'Material topics (5 priority issues)' },
    { key: 'period',      icon: Calendar,   label: 'FY2025 reporting cycle' },
  ]

  const seed = async () => {
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
        { topic_name: 'Climate change & GHG emissions',         topic_category: 'Environmental', linked_gri_codes: ['305-1','305-2','305-3','305-5'], impact_score: 4.7, financial_score: 4.6, dma_status: 'material' as const },
        { topic_name: 'Water management',                        topic_category: 'Environmental', linked_gri_codes: ['303-3','303-4','303-5'],         impact_score: 4.2, financial_score: 3.8, dma_status: 'material' as const },
        { topic_name: 'Process safety & asset integrity',       topic_category: 'Social',        linked_gri_codes: ['403-9','403-10'],                  impact_score: 4.5, financial_score: 4.4, dma_status: 'material' as const },
        { topic_name: 'Circular economy & product stewardship', topic_category: 'Environmental', linked_gri_codes: ['301-1','301-2','306-3'],          impact_score: 4.0, financial_score: 3.9, dma_status: 'material' as const },
        { topic_name: 'Business ethics & anti-corruption',      topic_category: 'Governance',    linked_gri_codes: ['205-2','205-3'],                   impact_score: 3.8, financial_score: 4.2, dma_status: 'material' as const },
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
      // Brief success state so the user sees the green ticks before close.
      setTimeout(() => {
        onCompleted()
        onClose()
      }, 700)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Seed failed')
      setSeeding(null)
    }
  }

  const idle = !seeding && !error
  const dismissable = !seeding || seeding === 'done'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(11,18,32,0.5)', backdropFilter: 'blur(8px)' }}
      onClick={dismissable ? onClose : undefined}
    >
      <div className="surface-paper w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #1B6B7B, #2E7D32)' }}
            >
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-[17px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">
                Load PTT Global Chemical sample
              </h3>
              <p className="text-[11.5px] text-[var(--text-tertiary)]">
                Pre-fills your workspace so you can demo every flow in seconds.
              </p>
            </div>
          </div>
          {dismissable && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </header>

        <div className="p-5">
          {idle && (
            <>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-4">
                This will create the following in your workspace. Existing data isn't touched. You can keep, edit, or delete anything afterwards.
              </p>
              <div className="space-y-2 mb-5">
                {SEED_STAGES.map(stage => {
                  const Icon = stage.icon
                  return (
                    <div key={stage.key} className="flex items-center gap-3 p-3 rounded-[10px] bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                      <div
                        className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-[12.5px] text-[var(--text-secondary)]">{stage.label}</div>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-2 p-3 rounded-[8px] bg-[var(--accent-teal-subtle)]/40 border border-[var(--accent-teal-subtle)]">
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-brand)] flex-shrink-0" />
                <span className="text-[11.5px] text-[var(--text-secondary)]">
                  Recommended for demos. Skip if you want to onboard manually — every step is also available in the Setup guide.
                </span>
              </div>
            </>
          )}

          {seeding && (
            <div className="space-y-2">
              {SEED_STAGES.map(stage => {
                const stageOrder = SEED_STAGES.findIndex(s => s.key === stage.key)
                const currentOrder = seeding === 'done' ? 999 : SEED_STAGES.findIndex(s => s.key === seeding)
                const isDone = stageOrder < currentOrder
                const isActive = stageOrder === currentOrder
                const Icon = stage.icon
                return (
                  <div
                    key={stage.key}
                    className="flex items-center gap-3 p-3 rounded-[10px] border transition-all"
                    style={{
                      background: isActive ? 'var(--accent-teal-subtle)' : isDone ? 'var(--accent-green-light)' : 'var(--bg-secondary)',
                      borderColor: isActive ? 'var(--color-brand)' : isDone ? 'rgba(46,125,50,0.3)' : 'var(--border-subtle)',
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0 text-white"
                      style={{
                        background: isActive ? 'var(--color-brand)' : isDone ? 'var(--status-ok)' : 'var(--bg-tertiary)',
                        color: isActive || isDone ? 'white' : 'var(--text-tertiary)',
                      }}
                    >
                      {isActive
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : isDone
                          ? <CheckCircle2 className="w-3.5 h-3.5" />
                          : <Icon className="w-3.5 h-3.5" />}
                    </div>
                    <div
                      className="flex-1 text-[12.5px] font-medium"
                      style={{ color: isActive ? 'var(--text-primary)' : isDone ? 'var(--status-ok)' : 'var(--text-secondary)' }}
                    >
                      {stage.label}
                    </div>
                    {isActive && <span className="text-[10.5px] uppercase tracking-[0.1em] font-semibold text-[var(--color-brand)]">Working…</span>}
                    {isDone && <span className="text-[10.5px] uppercase tracking-[0.1em] font-semibold text-[var(--status-ok)]">Done</span>}
                  </div>
                )
              })}
              {seeding === 'done' && (
                <div className="flex items-center gap-2 p-3 rounded-[10px] bg-[var(--accent-green-light)] border border-[rgba(46,125,50,0.3)] mt-2">
                  <CheckCircle2 className="w-5 h-5 text-[var(--status-ok)]" />
                  <span className="text-[13px] font-semibold text-[var(--status-ok)]">All set. Closing…</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-[10px] bg-[var(--accent-red-light)] border border-[rgba(220,38,38,0.3)]">
              <AlertTriangle className="w-5 h-5 text-[var(--status-reject)] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-[var(--text-primary)]">Couldn't seed the workspace</div>
                <div className="text-[12px] text-[var(--text-secondary)] mt-1 break-words">{error}</div>
              </div>
            </div>
          )}
        </div>

        <footer className="flex items-center gap-2 p-5 border-t border-[var(--border-subtle)]">
          {idle && (
            <>
              <button
                onClick={onClose}
                className="flex-1 h-10 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] text-[13px] font-semibold hover:bg-[var(--bg-secondary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={seed}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-[8px] bg-[var(--color-brand)] text-white text-[13px] font-semibold hover:bg-[var(--color-brand-strong)] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" /> Load sample data
              </button>
            </>
          )}
          {error && (
            <>
              <button
                onClick={onClose}
                className="flex-1 h-10 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] text-[13px] font-semibold hover:bg-[var(--bg-secondary)] cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => { setError(null); seed() }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-[8px] bg-[var(--color-brand)] text-white text-[13px] font-semibold hover:bg-[var(--color-brand-strong)] cursor-pointer"
              >
                Try again
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}
