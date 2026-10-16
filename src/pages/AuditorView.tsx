import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Eye, Hash, Link2, Shield, X } from 'lucide-react'
import { itemLabel } from '../lib/itemLabel'
import {
  nexus,
  type NexusQuestionnaireItem,
  type NexusHistoricalPoint,
  type NexusDataValue,
  type NexusAuditEvent,
} from '../lib/api'
import { buildTemplate, truncateHash, type TemplateSection, capitalLabelKey, subsectionLabelKey } from '../reports/spdTemplate'
import { useFmt } from '../lib/fmt'
import { useOrgBrand } from '../lib/useOrgBrand'
import SetupGuard from '../components/SetupGuard'
import { Button } from '../design-system'
import { EmptyState, SealCheck, Skeleton, StateBoundary, StatusPill } from '../components/ui'
import { dur, ease, staggerDelay } from '../motion/tokens'

const ACTIVE_YEAR = 2026

type Ready = {
  items: NexusQuestionnaireItem[]
  historyByItem: Map<string, NexusHistoricalPoint[]>
  currentByItem: Map<string, NexusDataValue>
}

type Panel =
  | null
  | { kind: 'loading'; dv: NexusDataValue; item: NexusQuestionnaireItem }
  | { kind: 'error'; dv: NexusDataValue; item: NexusQuestionnaireItem; error: string }
  | { kind: 'ready'; dv: NexusDataValue; item: NexusQuestionnaireItem; trail: NexusAuditEvent[] }

/**
 * Auditor view — read-only, web variant of the published performance data.
 * Every value opens its evidence lineage: the hash-chained audit trail from
 * entry to approval, fetched live, with a chain-continuity check.
 */
export default function AuditorView() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const brand = useOrgBrand()
  const [data, setData] = useState<Ready | null>(null)
  const [empty, setEmpty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [panel, setPanel] = useState<Panel>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await nexus.tree()
      if (items.length === 0) { setEmpty(true); return }
      const entries = await Promise.all(items.map(async it => [it.id, await nexus.historical(it.id)] as const))
      const [reviewQ, approvalQ] = await Promise.all([nexus.reviewQueue(), nexus.approvalQueue()])
      const currentByItem = new Map<string, NexusDataValue>()
      for (const dv of reviewQ) currentByItem.set(dv.questionnaire_item_id, dv)
      for (const dv of approvalQ) currentByItem.set(dv.questionnaire_item_id, dv)
      setData({ items, historyByItem: new Map(entries), currentByItem })
      setEmpty(false)
    } catch (e) {
      setError(e ?? new Error(t('auditor.view.failedToLoad')))
    } finally {
      setLoading(false)
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load() }, [])

  const openTrail = async (dv: NexusDataValue, item: NexusQuestionnaireItem) => {
    setPanel({ kind: 'loading', dv, item })
    try {
      const trail = await nexus.trail(dv.id)
      setPanel({ kind: 'ready', dv, item, trail })
    } catch (e) {
      setPanel({ kind: 'error', dv, item, error: e instanceof Error ? e.message : t('auditor.view.failed') })
    }
  }

  const groupSections = useMemo<TemplateSection[]>(() => (data ? buildTemplate(data.items, data.historyByItem, data.currentByItem, 'group') : []), [data])
  const jvSections = useMemo<TemplateSection[]>(() => (data ? buildTemplate(data.items, data.historyByItem, data.currentByItem, 'jv') : []), [data])

  if (empty) return <SetupGuard onReady={load} />

  const orgName = brand.name && brand.name !== 'Nexus' ? brand.name : t('auditor.view.orgFallback')

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <button
          type="button"
          onClick={() => navigate('/reports')}
          className="h-9 -ml-2 px-2 inline-flex items-center gap-2 rounded-[var(--radius-md)] text-small font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
        >
          <ArrowLeft className="w-4 h-4" /> {t('auditor.view.back')}
        </button>
        <div className="flex items-center gap-2">
          <StatusPill tone="brand" icon={<Shield />}>{t('auditor.view.readOnly')}</StatusPill>
          <Button variant="secondary" size="sm" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => navigate('/reports/preview')}>
            {t('auditor.view.pdfPreview')}
          </Button>
        </div>
      </div>

      <StateBoundary
        loading={loading}
        error={error}
        hasData={!!data}
        onRetry={() => void load()}
        errorState={{ variant: 'error', title: t('auditor.view.unableToLoad'), body: t('auditor.view.unableToLoadBody') }}
        skeleton={<AuditorSkeleton />}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] items-start">
          <article className="surface-paper min-w-0">
            <header className="px-5 sm:px-8 pt-7 pb-6 border-b border-[var(--border-subtle)]">
              <div className="text-small font-semibold text-[var(--color-brand-strong)]">{t('auditor.view.eyebrow')}</div>
              <h1 className="type-h1 text-[var(--text-primary)] mt-1">{t('auditor.view.title', { org: orgName, year: ACTIVE_YEAR })}</h1>
              <p className="type-small text-[var(--text-secondary)] mt-2 max-w-[68ch]">{t('auditor.view.intro')}</p>
            </header>
            <TrailBlock heading={orgName} sections={groupSections} onOpen={openTrail} activeId={panel?.dv.id ?? null} />
            {jvSections.length > 0 && <TrailBlock heading={t('auditor.view.jvHeading')} sections={jvSections} onOpen={openTrail} activeId={panel?.dv.id ?? null} />}
          </article>

          {/* Lineage panel: sticky on desktop, a sheet on mobile */}
          <aside
            aria-label={t('auditor.view.panelAria')}
            className={`${panel ? 'fixed inset-0 z-50 flex flex-col !rounded-none lg:!rounded-[var(--radius-xl)]' : 'hidden'} surface-paper overflow-hidden lg:z-auto lg:flex lg:flex-col lg:sticky lg:inset-auto lg:top-0 lg:max-h-[calc(100vh-120px)]`}
          >
            {panel ? (
              <TrailPanel panel={panel} onClose={() => setPanel(null)} />
            ) : (
              <EmptyState density="compact" art="inbox" title={t('auditor.view.drillTitle')} body={t('auditor.view.drillBody')} />
            )}
          </aside>
        </div>
      </StateBoundary>
    </div>
  )
}

function TrailBlock({ heading, sections, onOpen, activeId }: {
  heading: string
  sections: TemplateSection[]
  onOpen: (dv: NexusDataValue, item: NexusQuestionnaireItem) => void
  activeId: string | null
}) {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  return (
    <section className="pb-4">
      <h2 className="type-h2 text-[var(--text-primary)] px-5 sm:px-8 pt-7">{heading}</h2>
      {sections.map(sec => (
        <div key={sec.capital} className="px-5 sm:px-8 pt-5">
          <h3 className="type-h3 text-[var(--text-primary)] pb-2 border-b border-[var(--border-default)]">
            {t(capitalLabelKey(sec.capital), { defaultValue: sec.capital })}
          </h3>
          {sec.subsections.map(sub => (
            <div key={sub.name} className="mt-4">
              <h4 className="text-caption font-semibold text-[var(--color-brand-strong)] mb-1">
                {t(subsectionLabelKey(sub.name), { defaultValue: sub.name })}
              </h4>
              <ul className="divide-y divide-[var(--border-subtle)]">
                {sub.rows.map(row => {
                  const dv = row.current
                  const active = dv && dv.id === activeId
                  return (
                    <li key={row.item.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="type-small text-[var(--text-primary)]">{itemLabel(row.item, i18n.language)}</div>
                        <div className="text-caption text-[var(--text-tertiary)] mt-0.5">
                          <span className="font-mono">{row.item.gri_code}</span>
                          {row.item.scope_split ? ` · ${row.item.scope_split}` : ''}
                        </div>
                      </div>
                      {dv ? (
                        <button
                          type="button"
                          onClick={() => onOpen(dv, row.item)}
                          aria-pressed={!!active}
                          className={`group flex-shrink-0 h-10 px-3 inline-flex items-center gap-2.5 rounded-[var(--radius-md)] border transition-colors duration-micro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                            active ? 'border-[var(--border-focus)] bg-[var(--color-brand-soft)]' : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]'
                          }`}
                        >
                          <span className="tabular-nums font-semibold type-small text-[var(--text-primary)] whitespace-nowrap">
                            {f.number(dv.value)}{row.item.unit ? <span className="ml-1 font-normal text-caption text-[var(--text-tertiary)]">{f.unit(row.item.unit)}</span> : null}
                          </span>
                          <span className="hidden sm:inline-flex items-center gap-1 font-mono text-caption text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]">
                            <Hash className="w-3 h-3" />{truncateHash(dv.value_hash)}
                          </span>
                        </button>
                      ) : (
                        <span className="text-[var(--text-tertiary)] px-3 font-mono" aria-label={t('auditor.view.noValue')}>—</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}

/** Each event's previous_hash must equal the prior event's new_hash. */
function chainIntact(trail: NexusAuditEvent[]): boolean {
  const ordered = [...trail].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  for (let i = 1; i < ordered.length; i++) if (ordered[i].previous_hash !== ordered[i - 1].new_hash) return false
  return true
}

const EVENT_COLOR: Record<NexusAuditEvent['event_type'], string> = {
  approved: 'var(--status-success)', published: 'var(--status-success)', rejected: 'var(--status-danger)',
  reviewed: 'var(--status-info)', submitted: 'var(--status-info)', entered: 'var(--text-tertiary)',
  assigned: 'var(--text-tertiary)', overridden: 'var(--status-warning)',
}

function TrailPanel({ panel, onClose }: { panel: Exclude<Panel, null>; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const intact = panel.kind === 'ready' && panel.trail.length > 0 ? chainIntact(panel.trail) : null
  return (
    <>
      <header className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-caption font-semibold text-[var(--color-brand-strong)]">{panel.item.gri_code}</div>
          <h2 className="type-h3 text-[var(--text-primary)] mt-0.5">{itemLabel(panel.item, i18n.language)}</h2>
          <p className="text-caption text-[var(--text-tertiary)] mt-0.5">
            {t(capitalLabelKey(panel.item.section), { defaultValue: panel.item.section })} · {t(subsectionLabelKey(panel.item.subsection), { defaultValue: panel.item.subsection })}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label={t('common.close')} className="w-9 h-9 flex-shrink-0 rounded-[var(--radius-md)] inline-flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-caption text-[var(--text-tertiary)]">FY{ACTIVE_YEAR}</span>
          <StatusPill status={panel.dv.status} size="sm" />
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="type-figure text-[28px] leading-8 text-[var(--text-primary)]">{f.exact(panel.dv.value)}</span>
          {panel.item.unit && <span className="type-small text-[var(--text-tertiary)]">{f.unit(panel.item.unit)}</span>}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-[var(--text-tertiary)]">
          <span className="inline-flex items-center gap-1 font-mono"><Hash className="w-3 h-3" />{truncateHash(panel.dv.value_hash, 10, 8)}</span>
          <span>{t('auditor.view.mode', { mode: panel.dv.entry_mode ? t(`auditor.entryMode.${panel.dv.entry_mode}`, { defaultValue: panel.dv.entry_mode }) : '—' })}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-4 flex items-center justify-between gap-3">
          <h3 className="text-caption font-semibold text-[var(--text-secondary)]">{t('auditor.view.lineage')}</h3>
          {intact != null && (
            intact
              ? <span className="inline-flex items-center gap-1.5 text-caption font-semibold text-[var(--status-success)]"><SealCheck size={16} />{t('auditor.view.chainIntact')}</span>
              : <StatusPill tone="danger" size="sm">{t('auditor.view.chainBroken')}</StatusPill>
          )}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {panel.kind === 'loading' && (
            <motion.div key="l" exit={{ opacity: 0 }} className="p-5 space-y-4" role="status" aria-busy="true">
              {[0, 1, 2].map(i => <Skeleton key={i} height={52} rounded="lg" className="block" />)}
            </motion.div>
          )}
          {panel.kind === 'error' && (
            <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <EmptyState variant="error" density="compact" title={t('auditor.view.trailFailed')} detail={panel.error} />
            </motion.div>
          )}
          {panel.kind === 'ready' && (
            <motion.ol key="r" className="p-5 pt-3">
              {panel.trail.length === 0 && <li className="type-small text-[var(--text-tertiary)]">{t('auditor.view.noEvents')}</li>}
              {panel.trail.map((ev, idx) => (
                <motion.li
                  key={ev.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: dur.base, ease: ease.out, delay: staggerDelay(idx) }}
                  className="relative pl-6 pb-5 last:pb-0"
                >
                  {idx < panel.trail.length - 1 && <span className="absolute left-[5px] top-4 bottom-0 w-px bg-[var(--border-default)]" aria-hidden />}
                  <span className="absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full border-2 border-[var(--bg-primary)]" style={{ background: EVENT_COLOR[ev.event_type] }} aria-hidden />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="type-small font-semibold text-[var(--text-primary)]">{t(`auditor.event.${ev.event_type}`, { defaultValue: ev.event_type })}</span>
                    {ev.actor_workflow_role && (
                      <StatusPill tone="brand" size="sm">{t(`workflowStatus.role.${ev.actor_workflow_role}`, { defaultValue: ev.actor_workflow_role })}</StatusPill>
                    )}
                  </div>
                  <div className="text-caption text-[var(--text-secondary)] mt-0.5">
                    {ev.actor_name ?? ev.actor_email ?? t('auditor.view.system')}{ev.actor_platform_role ? ` · ${ev.actor_platform_role}` : ''}
                  </div>
                  <div className="text-caption text-[var(--text-tertiary)]">{f.dateTime(ev.timestamp)}</div>
                  {ev.comment && <p className="mt-1.5 p-2.5 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] type-small text-[var(--text-secondary)]">{ev.comment}</p>}
                  <div className="mt-1.5 flex items-center gap-1.5 text-caption font-mono text-[var(--text-tertiary)] min-w-0">
                    <Link2 className="w-3 h-3 flex-shrink-0" aria-hidden />
                    <span className="truncate">{t('auditor.view.prevHash', { hash: truncateHash(ev.previous_hash) })} → {t('auditor.view.newHash', { hash: truncateHash(ev.new_hash) })}</span>
                  </div>
                </motion.li>
              ))}
            </motion.ol>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

function AuditorSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="surface-paper p-8 space-y-4">
        <Skeleton height={28} width="50%" className="block" />
        <Skeleton height={14} width="80%" className="block" />
        {[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={40} className="block" />)}
      </div>
      <div className="hidden lg:block"><Skeleton height={360} rounded="lg" className="block" /></div>
    </div>
  )
}
