import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  FileSpreadsheet,
  Activity,
  Users,
  ArrowUpRight,
  Database,
  Upload,
  ShieldCheck,
  Plug,
  Brain,
} from 'lucide-react'
import { Tabs } from '../design-system'
import PageHeader from '../components/PageHeader'
import { StatusPill } from '../components/ui'
import ProcessFlow from '../components/analytics/data/ProcessFlow'
import { useFmt } from '../lib/fmt'
import { dur, ease } from '../motion/tokens'
import OrganisationSetup from './OrganisationSetup'
import RawSupplierIngestion from './RawSupplierIngestion'
import MeasuredData from './MeasuredData'
import EntitySubmissions from './EntitySubmissions'

/* ═══════════════════════════════════════════
   Modules — each is addressable at /data/<id>
   (the existing /data/* route already lands here).
   ═══════════════════════════════════════════ */
type ModuleId = 'org-setup' | 'raw-supplier' | 'measured' | 'entities'

interface DataModule {
  id: ModuleId
  icon: typeof Building2
  status: 'live' | 'ready' | 'beta'
  /** Two quiet facts; `n` is formatted for the locale, `text` is shown as-is. */
  facts: { key: string; n?: number; pct?: number; text?: string }[]
}

const MODULES: DataModule[] = [
  { id: 'raw-supplier', icon: FileSpreadsheet, status: 'live', facts: [{ key: 'formats', text: '.xlsx · .csv' }, { key: 'fields', n: 21 }] },
  { id: 'measured', icon: Activity, status: 'live', facts: [{ key: 'sources', n: 91 }, { key: 'quality', pct: 98.4 }] },
  { id: 'entities', icon: Users, status: 'live', facts: [{ key: 'entities', n: 48 }, { key: 'templates', n: 4 }] },
  { id: 'org-setup', icon: Building2, status: 'live', facts: [{ key: 'steps', n: 7 }, { key: 'frameworks', n: 5 }] },
]

const MODULE_IDS = new Set<string>(MODULES.map((m) => m.id))

const PIPELINE_STEPS = [
  { icon: Upload, key: 'ingest' },
  { icon: ShieldCheck, key: 'validate' },
  { icon: Brain, key: 'classify' },
  { icon: Plug, key: 'route' },
  { icon: Database, key: 'store' },
]

export default function DataIngestion() {
  const { t } = useTranslation()
  const params = useParams()
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const slug = (params['*'] ?? '').split('/')[0]
  const view: ModuleId | 'landing' = MODULE_IDS.has(slug) ? (slug as ModuleId) : 'landing'
  const title = (id: ModuleId) => t(`ingestion.modules.${id}.title`)

  if (view === 'landing') {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow={t('ingestion.eyebrow')} title={t('ingestion.title')} description={t('ingestion.subtitle')} />

        <section className="surface-paper p-5 sm:p-6" aria-labelledby="ingest-flow">
          <h2 id="ingest-flow" className="type-h3 text-[var(--text-primary)] mb-5">
            {t('ingestion.flowTitle')}
          </h2>
          <ProcessFlow
            aria-label={t('ingestion.flowTitle')}
            steps={PIPELINE_STEPS.map((s) => ({
              id: s.key,
              icon: s.icon,
              title: t(`ingestion.pipeline.${s.key}.label`),
              desc: t(`ingestion.pipeline.${s.key}.desc`),
            }))}
          />
        </section>

        <section aria-labelledby="ingest-modules">
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <h2 id="ingest-modules" className="type-h3 text-[var(--text-primary)]">
              {t('ingestion.modulesTitle')}
            </h2>
            <span className="hidden sm:inline text-caption text-[var(--text-tertiary)]">{t('ingestion.modulesHint')}</span>
          </div>
          <div className="surface-paper overflow-hidden">
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--border-subtle)]">
              {MODULES.map((m) => (
                <ModuleCell key={m.id} mod={m} />
              ))}
            </ul>
          </div>
        </section>
      </div>
    )
  }

  let body: ReactNode = null
  if (view === 'org-setup') body = <OrganisationSetup />
  if (view === 'raw-supplier') body = <RawSupplierIngestion />
  if (view === 'measured') body = <MeasuredData />
  if (view === 'entities') body = <EntitySubmissions />

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="overflow-x-auto -mx-1 px-1 [scrollbar-width:none]">
          <Tabs
            aria-label={t('ingestion.modulesTitle')}
            className="w-max"
            tabs={MODULES.map((m) => ({ id: m.id, label: title(m.id) }))}
            activeTab={view}
            onChange={(id) => navigate(`/data/${id}`)}
          />
        </div>
      </div>
      <motion.div
        key={view}
        initial={reduce ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: dur.base, ease: ease.out }}
      >
        {body}
      </motion.div>
    </div>
  )
}

function ModuleCell({ mod }: { mod: DataModule }) {
  const { t } = useTranslation()
  const f = useFmt()
  const Icon = mod.icon
  return (
    <li className="bg-[var(--bg-primary)]">
      <Link
        to={`/data/${mod.id}`}
        className="group relative flex h-full flex-col gap-4 p-5 sm:p-6 transition-colors duration-micro ease-out hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand)]"
      >
        <div className="flex items-start gap-4">
          <span className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 bg-[var(--color-brand-soft)] text-[var(--color-brand)] ring-1 ring-inset ring-[var(--status-success-line)]">
            <Icon className="w-5 h-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="type-h3 text-[var(--text-primary)]">{t(`ingestion.modules.${mod.id}.title`)}</h3>
              <StatusPill tone="success" dot size="sm">
                {t(`ingestion.status.${mod.status}`)}
              </StatusPill>
            </div>
            <p className="text-small text-[var(--text-secondary)] mt-0.5">{t(`ingestion.modules.${mod.id}.subtitle`)}</p>
          </div>
          <ArrowUpRight
            className="w-4 h-4 text-[var(--text-quaternary)] flex-shrink-0 transition-[transform,color] duration-fast ease-out group-hover:text-[var(--color-brand)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden
          />
        </div>
        <p className="text-small text-[var(--text-tertiary)] text-pretty max-w-prose">{t(`ingestion.modules.${mod.id}.desc`)}</p>
        <dl className="mt-auto flex items-end gap-8 pt-1">
          {mod.facts.map((fact) => (
            <div key={fact.key} className="min-w-0">
              <dt className="text-caption text-[var(--text-tertiary)]">{t(`ingestion.stats.${fact.key}`)}</dt>
              <dd className="type-figure text-[20px] leading-7 text-[var(--text-primary)] whitespace-nowrap">
                {fact.text ?? (fact.pct != null ? f.percent(fact.pct, { precision: 1 }) : f.number(fact.n))}
              </dd>
            </div>
          ))}
        </dl>
      </Link>
    </li>
  )
}
