import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Building2, Target as TargetIcon, Scale, Calendar, Check, Loader2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { orgStore } from '../lib/orgStore'
import { useFramework } from '../lib/frameworks'
import Button from '../design-system/components/Button'
import Illustration from '../design-system/illustrations/Illustration'
import useOrgMarket from './analytics/useOrgMarket'
import { invalidateSetup } from './onboarding/useSetupProgress'
import { popVariants, staggerDelay, transition } from '../motion/tokens'

type SeedStep = 'org' | 'targets' | 'materiality' | 'period' | 'done'

interface Props {
  onClose: () => void
  /** Called once seeding succeeds — parent should reload org data. */
  onCompleted: () => void
}

/**
 * One-click "Load sample data" — opt-in, offered by the guided setup on an
 * empty workspace. China-market workspaces get a mainland sample (A+H group,
 * Shanghai / Suzhou plants, topics mapped to the CN-SSE 21 topics).
 */
export default function DemoSeedModal({ onClose, onCompleted }: Props) {
  const { t } = useTranslation()
  const { active: framework } = useFramework()
  const market = useOrgMarket()
  const cn = market.isCn
  const [seeding, setSeeding] = useState<SeedStep | null>(null)
  const [error, setError] = useState<string | null>(null)

  const STAGES: { key: SeedStep; icon: typeof Building2 }[] = [
    { key: 'org', icon: Building2 },
    { key: 'targets', icon: TargetIcon },
    { key: 'materiality', icon: Scale },
    { key: 'period', icon: Calendar },
  ]

  const dismissable = !seeding || seeding === 'done'
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && dismissable) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dismissable, onClose])

  const seed = async () => {
    setError(null)
    try {
      // ── Step 1: org tree ──
      setSeeding('org')
      if (cn) {
        const group = await orgStore.addEntity({ parentId: null, type: 'group', name: '华信控股集团', code: 'HX', country: 'CN', equity: 100, industry: 'Materials' })
        const [sh, hk] = await Promise.all([
          orgStore.addEntity({ parentId: group.id, type: 'subsidiary', name: '华信新材料（上海）有限公司', code: 'HXSH', country: 'CN', equity: 100, industry: 'Materials' }),
          orgStore.addEntity({ parentId: group.id, type: 'subsidiary', name: 'Huaxin Hong Kong Trading Ltd', code: 'HXHK', country: 'HK', equity: 60, industry: 'Trading' }),
        ])
        await Promise.all([
          orgStore.addEntity({ parentId: sh.id, type: 'plant', name: '上海金山工厂', code: 'SH01', country: 'CN', equity: 100, industry: 'Materials' }),
          orgStore.addEntity({ parentId: sh.id, type: 'plant', name: '苏州工业园工厂', code: 'SZ02', country: 'CN', equity: 100, industry: 'Materials' }),
          orgStore.addEntity({ parentId: hk.id, type: 'office', name: '深圳办公室', code: 'SZX', country: 'CN', equity: 60, industry: 'Trading' }),
        ])
      } else {
        const group = await orgStore.addEntity({ parentId: null, type: 'group', name: 'Demo Co', code: 'DEMO', country: 'GB', equity: 100, industry: 'Chemicals' })
        const [gcm, gcp, hmc] = await Promise.all([
          orgStore.addEntity({ parentId: group.id, type: 'subsidiary', name: 'GC Marketing Solutions', code: 'GCM', country: 'TH', equity: 100, industry: 'Trading' }),
          orgStore.addEntity({ parentId: group.id, type: 'subsidiary', name: 'GC Polyols', code: 'GCP', country: 'TH', equity: 100, industry: 'Polymers' }),
          orgStore.addEntity({ parentId: group.id, type: 'subsidiary', name: 'HMC Polymers', code: 'HMC', country: 'TH', equity: 41, industry: 'Polymers' }),
        ])
        await Promise.all([
          orgStore.addEntity({ parentId: gcm.id, type: 'plant', name: 'Map Ta Phut Olefins', code: 'MTP-OL', country: 'TH', equity: 100, industry: 'Chemicals' }),
          orgStore.addEntity({ parentId: gcp.id, type: 'plant', name: 'Rayong Polyols Plant', code: 'RYP', country: 'TH', equity: 100, industry: 'Polymers' }),
          orgStore.addEntity({ parentId: hmc.id, type: 'plant', name: 'HMC Rayong PP Train 3', code: 'HMC-PP3', country: 'TH', equity: 41, industry: 'Polymers' }),
        ])
      }

      // ── Step 2: climate targets ──
      setSeeding('targets')
      await orgStore.upsertTarget({
        framework_id: framework.id, kind: 'sbti_near_term',
        label: cn ? '2030 年范围一＋二排放较 2020 年下降 20%' : 'Reduce Scope 1+2 by 20% by 2030 vs 2020 baseline',
        scope_coverage: 'Scope 1+2', baseline_year: 2020, baseline_value: cn ? 186000 : 8120000, baseline_unit: 'tCO2e',
        target_year: 2030, target_reduction_pct: 20, status: 'committed',
      })
      await orgStore.upsertTarget({
        framework_id: framework.id, kind: 'net_zero',
        label: cn ? '2060 年前实现全价值链碳中和' : 'Net-zero across all scopes by 2050',
        scope_coverage: 'Scope 1+2+3', baseline_year: 2020, baseline_value: cn ? 742000 : 38400000, baseline_unit: 'tCO2e',
        target_year: cn ? 2060 : 2050, target_reduction_pct: 90, status: 'committed',
      })

      // ── Step 3: material topics ── (scores are INTEGER 1–5 in the DB)
      setSeeding('materiality')
      const topics = cn
        ? [
            { topic_name: 'CN-SSE CLIM', topic_category: 'Environmental', linked_gri_codes: ['CNSSE-CLIM', '305-1', '305-2'], impact_score: 5, financial_score: 5, dma_status: 'material' as const },
            { topic_name: 'CN-SSE POL', topic_category: 'Environmental', linked_gri_codes: ['CNSSE-POL'], impact_score: 4, financial_score: 3, dma_status: 'material' as const },
            { topic_name: 'CN-SSE ENE', topic_category: 'Environmental', linked_gri_codes: ['CNSSE-ENE', '302-1'], impact_score: 4, financial_score: 4, dma_status: 'material' as const },
            { topic_name: 'CN-SSE EMP', topic_category: 'Social', linked_gri_codes: ['CNSSE-EMP', '403-9'], impact_score: 4, financial_score: 3, dma_status: 'material' as const },
            { topic_name: 'CN-SSE ABC', topic_category: 'Governance', linked_gri_codes: ['CNSSE-ABC', '205-2'], impact_score: 3, financial_score: 4, dma_status: 'material' as const },
          ]
        : [
            { topic_name: 'Climate change & GHG emissions', topic_category: 'Environmental', linked_gri_codes: ['305-1', '305-2', '305-3', '305-5'], impact_score: 5, financial_score: 5, dma_status: 'material' as const },
            { topic_name: 'Water management', topic_category: 'Environmental', linked_gri_codes: ['303-3', '303-4', '303-5'], impact_score: 4, financial_score: 4, dma_status: 'material' as const },
            { topic_name: 'Process safety & asset integrity', topic_category: 'Social', linked_gri_codes: ['403-9', '403-10'], impact_score: 5, financial_score: 4, dma_status: 'material' as const },
            { topic_name: 'Circular economy & product stewardship', topic_category: 'Environmental', linked_gri_codes: ['301-1', '301-2', '306-3'], impact_score: 4, financial_score: 4, dma_status: 'material' as const },
            { topic_name: 'Business ethics & anti-corruption', topic_category: 'Governance', linked_gri_codes: ['205-2', '205-3'], impact_score: 4, financial_score: 4, dma_status: 'material' as const },
          ]
      for (const topic of topics) await orgStore.upsertMaterialTopic({ framework_id: framework.id, ...topic })

      // ── Step 4: reporting period ──
      setSeeding('period')
      await orgStore.createPeriod({
        framework_id: framework.id, year: 2025, label: 'FY2025', status: 'active', start_date: '2025-01-01', end_date: '2025-12-31',
      })

      setSeeding('done')
      invalidateSetup()
      // Brief success state so the user sees the ticks land before close.
      setTimeout(() => { onCompleted(); onClose() }, 800)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('onboarding.demo.seedFailed'))
      setSeeding(null)
    }
  }

  const order = (k: SeedStep) => STAGES.findIndex(s => s.key === k)
  const current = seeding === 'done' ? 99 : seeding ? order(seeding) : -1

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(2px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      onClick={dismissable ? onClose : undefined}
    >
      <motion.div
        role="dialog" aria-modal="true" aria-labelledby="demo-seed-title"
        variants={popVariants} initial="hidden" animate="visible"
        className="surface-paper w-full sm:max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <header className="relative flex items-start gap-4 p-5 pb-4">
          <Illustration name={seeding === 'done' ? 'cleared' : 'setup'} size={72} className="flex-shrink-0 -my-2" />
          <div className="min-w-0 flex-1">
            <h3 id="demo-seed-title" className="type-h3 text-[var(--text-primary)]">{t(cn ? 'onboarding.demo.titleCn' : 'onboarding.demo.title')}</h3>
            <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('onboarding.demo.subtitle')}</p>
          </div>
          {dismissable && (
            <button type="button" onClick={onClose} aria-label={t('common.close')}
              className="w-10 h-10 -mr-2 -mt-2 rounded-[var(--radius-md)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
              <X className="w-4 h-4" aria-hidden />
            </button>
          )}
        </header>

        <div className="px-5 pb-5 space-y-3">
          {!seeding && !error && <p className="text-small text-[var(--text-secondary)]">{t('onboarding.demo.intro')}</p>}
          <ol className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]" aria-live="polite">
            {STAGES.map((s, i) => {
              const done = order(s.key) < current
              const active = order(s.key) === current
              const Icon = s.icon
              return (
                <motion.li key={s.key} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ ...transition.base, delay: staggerDelay(i) }}
                  className="flex items-center gap-3 px-3.5 py-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-base ${done ? 'bg-[var(--status-success)] text-[var(--bg-primary)]' : active ? 'bg-[var(--bg-hover)] text-[var(--color-brand)] ring-2 ring-[var(--color-brand)]/30' : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)]'}`}>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span key={done ? 'd' : active ? 'a' : 'i'} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={transition.fast} className="inline-flex">
                        {done ? <Check className="w-3.5 h-3.5" aria-hidden /> : active ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Icon className="w-3.5 h-3.5" aria-hidden />}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <span className={`flex-1 text-small ${done ? 'text-[var(--text-secondary)]' : active ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                    {t(`onboarding.demo.stages${cn ? 'Cn' : ''}.${s.key}`)}
                  </span>
                  {active && <span className="text-caption text-[var(--color-brand)]">{t('onboarding.demo.working')}</span>}
                </motion.li>
              )
            })}
          </ol>
          {seeding === 'done' && <p role="status" className="text-small font-medium text-[var(--status-success)]">{t('onboarding.demo.allSet')}</p>}
          {!seeding && !error && <p className="text-caption text-[var(--text-tertiary)]">{t('onboarding.demo.recommended')}</p>}
          {error && (
            <div role="alert" className="rounded-[var(--radius-md)] border border-[var(--status-danger)]/30 bg-[var(--status-danger-soft)] p-3">
              <div className="text-small font-semibold text-[var(--text-primary)]">{t('onboarding.demo.couldNotSeed')}</div>
              <div className="text-caption text-[var(--text-secondary)] mt-0.5 break-words">{error}</div>
            </div>
          )}
        </div>

        {(!seeding || error) && (
          <footer className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--border-subtle)]">
            <Button variant="secondary" size="md" onClick={onClose}>{error ? t('common.close') : t('common.cancel')}</Button>
            <Button variant="primary" size="md" onClick={() => { setError(null); void seed() }}>
              {error ? t('onboarding.demo.retry') : t('onboarding.demo.load')}
            </Button>
          </footer>
        )}
      </motion.div>
    </motion.div>
  )
}
