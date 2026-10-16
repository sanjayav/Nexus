import { Fragment, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, ChevronRight, Eye, FileText, Link2 } from 'lucide-react'
import { assuranceItems, type AssuranceItem } from '../data/moduleData'
import PageHeader from '../components/PageHeader'
import { EmptyState, StatLedger, StatusPill, notify, type PillTone } from '../components/ui'
import { dur, ease } from '../motion/tokens'

type Status = AssuranceItem['status']
type StatusFilter = 'all' | 'not-started' | 'in-review' | 'findings' | 'cleared'

/** One status vocabulary, one pill. `label` is an i18n key. */
const STATUS: Record<Status, { label: string; tone: PillTone; dot?: boolean }> = {
  'not-started': { label: 'assurance.status.notStarted', tone: 'neutral' },
  'in-review': { label: 'assurance.status.inReview', tone: 'info', dot: true },
  'findings-raised': { label: 'assurance.status.findingsRaised', tone: 'warning', dot: true },
  cleared: { label: 'assurance.status.cleared', tone: 'success' },
  'ready-to-publish': { label: 'assurance.status.readyToPublish', tone: 'brand' },
}

/**
 * Assurance review pipeline — third-party validation of data packages before
 * they are published. Read-mostly: the two actions advance a package
 * (start review, clear for publishing); findings and their evidence links are
 * shown inline.
 */
export default function AssuranceReview() {
  const { t } = useTranslation()
  const [items, setItems] = useState<AssuranceItem[]>(assuranceItems)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('all')

  const counts = useMemo(() => {
    const c: Record<Status, number> = { 'not-started': 0, 'in-review': 0, 'findings-raised': 0, cleared: 0, 'ready-to-publish': 0 }
    items.forEach(i => { c[i.status]++ })
    return c
  }, [items])

  const visible = useMemo(() => {
    if (filter === 'all') return items
    if (filter === 'findings') return items.filter(i => i.status === 'findings-raised')
    return items.filter(i => i.status === filter)
  }, [items, filter])

  const advance = (id: string, status: Status, message: string) => {
    const prev = items.find(i => i.id === id)?.status
    setItems(list => list.map(i => (i.id === id ? { ...i, status } : i)))
    notify.success(message, prev ? { undo: () => setItems(list => list.map(i => (i.id === id ? { ...i, status: prev } : i))) } : undefined)
  }

  const tabs: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: t('common.all') },
    { id: 'not-started', label: t('assurance.status.notStarted') },
    { id: 'in-review', label: t('assurance.status.inReview') },
    { id: 'findings', label: t('assurance.filter.findings') },
    { id: 'cleared', label: t('assurance.status.cleared') },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('assurance.reportingYear', { year: 'FY2026' })}
        title={t('assurance.title')}
        subtitle={t('assurance.subtitle')}
      />

      <StatLedger
        aria-label={t('assurance.pipeline')}
        items={(Object.keys(STATUS) as Status[]).map(k => ({
          id: k,
          label: t(STATUS[k].label),
          value: counts[k],
          tone: STATUS[k].tone === 'brand' ? 'brand' : STATUS[k].tone,
          hint: t('assurance.dataPackages'),
        }))}
      />

      <section className="surface-paper overflow-hidden" aria-labelledby="pipe-h">
        <div className="px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <h2 id="pipe-h" className="type-h3 text-[var(--text-primary)]">{t('assurance.pipeline')}</h2>
            <span className="text-caption text-[var(--text-tertiary)] tabular-nums">{t('assurance.total', { count: items.length })}</span>
          </div>
          <div role="tablist" aria-label={t('assurance.filterAria')} className="flex gap-1 overflow-x-auto -mx-1 px-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={filter === tab.id}
                onClick={() => setFilter(tab.id)}
                className={`relative h-9 px-3 rounded-[var(--radius-md)] text-small font-semibold whitespace-nowrap transition-colors duration-micro ${filter === tab.id ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
              >
                {filter === tab.id && <motion.span layoutId="assurance-tab" className="absolute inset-0 rounded-[var(--radius-md)] bg-[var(--bg-secondary)]" transition={{ type: 'spring', stiffness: 520, damping: 40 }} aria-hidden />}
                <span className="relative">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState variant="filtered" density="compact" title={t('assurance.noMatch')} onClearFilters={() => setFilter('all')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[860px]">
              <thead>
                <tr>
                  <th className="w-10"><span className="sr-only">{t('assurance.expand')}</span></th>
                  <th>{t('assurance.table.dataPackage')}</th>
                  <th>{t('assurance.table.scope')}</th>
                  <th>{t('assurance.table.entity')}</th>
                  <th>{t('assurance.table.period')}</th>
                  <th>{t('assurance.table.reviewer')}</th>
                  <th>{t('common.status')}</th>
                  <th className="num">{t('assurance.filter.findings')}</th>
                  <th className="text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(item => {
                  const open = expanded === item.id
                  const s = STATUS[item.status]
                  return (
                    <Fragment key={item.id}>
                      <tr className="cursor-pointer" onClick={() => setExpanded(open ? null : item.id)}>
                        <td>
                          <button
                            type="button"
                            aria-expanded={open}
                            aria-label={t('assurance.expand')}
                            onClick={(e) => { e.stopPropagation(); setExpanded(open ? null : item.id) }}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)]"
                          >
                            <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: dur.fast, ease: ease.out }}><ChevronRight className="w-4 h-4" /></motion.span>
                          </button>
                        </td>
                        <td className="font-medium text-[var(--text-primary)]">{item.dataPackage}</td>
                        <td className="whitespace-nowrap">{item.scope}</td>
                        <td>{item.entity}</td>
                        <td className="whitespace-nowrap tabular-nums">{item.period}</td>
                        <td>{item.reviewer}</td>
                        <td><StatusPill tone={s.tone} dot={s.dot} size="sm">{t(s.label)}</StatusPill></td>
                        <td className="num">
                          {item.findings.length > 0
                            ? <span className="inline-flex items-center gap-1 font-semibold text-[var(--status-warning)]"><AlertTriangle className="w-3.5 h-3.5" />{item.findings.length}</span>
                            : <span className="text-[var(--text-tertiary)]">0</span>}
                        </td>
                        <td className="text-right" onClick={e => e.stopPropagation()}>
                          {item.status === 'not-started' && (
                            <button type="button" onClick={() => advance(item.id, 'in-review', t('assurance.toast.started'))} className="h-9 px-3 inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] text-small font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] whitespace-nowrap">
                              <Eye className="w-3.5 h-3.5" /> {t('assurance.startReview')}
                            </button>
                          )}
                          {item.status === 'cleared' && (
                            <button type="button" onClick={() => advance(item.id, 'ready-to-publish', t('assurance.toast.cleared'))} className="h-9 px-3 inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-bg-hover)] text-small font-semibold whitespace-nowrap">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {t('assurance.clearForPublishing')}
                            </button>
                          )}
                        </td>
                      </tr>
                      <AnimatePresence initial={false}>
                        {open && (
                          <tr className="!bg-transparent hover:!bg-transparent">
                            <td colSpan={9} className="!p-0 bg-[var(--bg-secondary)]">
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: dur.base, ease: ease.out }} className="overflow-hidden">
                                <ItemDetail item={item} />
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="surface-paper p-5 sm:p-7" aria-labelledby="proc-h">
        <h2 id="proc-h" className="type-h3 text-[var(--text-primary)]">{t('assurance.process.title')}</h2>
        <div className="grid gap-6 md:grid-cols-3 mt-4">
          {(['integrity', 'review', 'publish'] as const).map(k => (
            <div key={k}>
              <h3 className="type-small font-semibold text-[var(--text-primary)]">{t(`assurance.process.${k}Title`)}</h3>
              <p className="type-small text-[var(--text-secondary)] mt-1">{t(`assurance.process.${k}Body`)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function ItemDetail({ item }: { item: AssuranceItem }) {
  const { t } = useTranslation()
  const nothing = item.findings.length === 0 && item.linkedAnomalyIds.length === 0 && item.linkedBlockchainIds.length === 0
  return (
    <div className="p-5 space-y-5 whitespace-normal">
      {item.findings.length > 0 && (
        <div>
          <h4 className="text-caption font-semibold text-[var(--text-secondary)] mb-2">{t('assurance.findingsCount', { count: item.findings.length })}</h4>
          <ul className="space-y-2">
            {item.findings.map(fi => (
              <li key={fi.id} className="rounded-[var(--radius-lg)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] p-4">
                <div className="flex items-start gap-3">
                  <StatusPill size="sm" tone={fi.severity === 'major' ? 'danger' : 'warning'}>{t(`assurance.severity.${fi.severity}`, { defaultValue: fi.severity })}</StatusPill>
                  <div className="min-w-0 flex-1">
                    <p className="type-small text-[var(--text-primary)] max-w-[80ch]">{fi.description}</p>
                    {fi.resolution && (
                      <div className="mt-2.5 p-3 rounded-[var(--radius-md)] bg-[var(--status-success-soft)]">
                        <p className="text-caption font-semibold text-[var(--status-success)]">{t('assurance.resolution')}</p>
                        <p className="type-small text-[var(--text-primary)] mt-0.5">{fi.resolution}</p>
                        {fi.resolvedDate && <p className="text-caption text-[var(--text-tertiary)] mt-1">{t('assurance.resolved', { date: fi.resolvedDate })}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {(item.linkedAnomalyIds.length > 0 || item.linkedBlockchainIds.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {item.linkedAnomalyIds.length > 0 && (
            <LinkedIds icon={<FileText className="w-3.5 h-3.5" />} title={t('assurance.linkedAnomalies')} ids={item.linkedAnomalyIds} />
          )}
          {item.linkedBlockchainIds.length > 0 && (
            <LinkedIds icon={<Link2 className="w-3.5 h-3.5" />} title={t('assurance.blockchainAnchors')} ids={item.linkedBlockchainIds} />
          )}
        </div>
      )}
      {nothing && <p className="type-small text-[var(--text-tertiary)]">{t('assurance.nothingLinked')}</p>}
    </div>
  )
}

function LinkedIds({ icon, title, ids }: { icon: React.ReactNode; title: string; ids: string[] }) {
  return (
    <div>
      <h4 className="text-caption font-semibold text-[var(--text-secondary)] mb-2 inline-flex items-center gap-1.5">{icon}{title}</h4>
      <div className="flex flex-wrap gap-1.5">
        {ids.map(id => <span key={id} className="chip font-mono">{id}</span>)}
      </div>
    </div>
  )
}
