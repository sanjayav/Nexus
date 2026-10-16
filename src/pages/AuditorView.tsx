import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { itemLabel } from '../lib/itemLabel'
import {
  Loader2, ArrowLeft, Shield, X, AlertCircle, Hash, CheckCircle2, Eye, Clock, LinkIcon,
} from 'lucide-react'
import {
  nexus,
  type NexusQuestionnaireItem,
  type NexusHistoricalPoint,
  type NexusDataValue,
  type NexusAuditEvent,
} from '../lib/api'
import {
  buildTemplate,
  formatValue,
  truncateHash,
  type TemplateSection,
  capitalLabelKey,
  subsectionLabelKey,
} from '../reports/spdTemplate'
import SetupGuard from '../components/SetupGuard'
import { Button } from '../design-system'

const ACTIVE_YEAR = 2026

type LoadState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error'; error: string }
  | {
      kind: 'ready'
      items: NexusQuestionnaireItem[]
      historyByItem: Map<string, NexusHistoricalPoint[]>
      currentByItem: Map<string, NexusDataValue>
    }

type PanelState =
  | null
  | { kind: 'loading'; dv: NexusDataValue; item: NexusQuestionnaireItem }
  | { kind: 'error'; dv: NexusDataValue; item: NexusQuestionnaireItem; error: string }
  | { kind: 'ready'; dv: NexusDataValue; item: NexusQuestionnaireItem; trail: NexusAuditEvent[] }

/**
 * Auditor View — SRD §15.4.
 * Web-based interactive variant of the published SPD. Every value cell
 * opens a side panel with its full audit-event chain fetched live from
 * /api/blockchain?view=trail&data_value_id=...
 */
export default function AuditorView() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [panel, setPanel] = useState<PanelState>(null)

  const load = async () => {
    setState({ kind: 'loading' })
    try {
      const items = await nexus.tree()
      if (items.length === 0) return setState({ kind: 'empty' })

      const entries = await Promise.all(
        items.map(async it => [it.id, await nexus.historical(it.id)] as const)
      )
      const historyByItem = new Map<string, NexusHistoricalPoint[]>(entries)

      const [reviewQ, approvalQ] = await Promise.all([
        nexus.reviewQueue(),
        nexus.approvalQueue(),
      ])
      const currentByItem = new Map<string, NexusDataValue>()
      for (const dv of reviewQ) currentByItem.set(dv.questionnaire_item_id, dv)
      for (const dv of approvalQ) currentByItem.set(dv.questionnaire_item_id, dv)

      setState({ kind: 'ready', items, historyByItem, currentByItem })
    } catch (e) {
      setState({ kind: 'error', error: e instanceof Error ? e.message : t('auditor.view.failedToLoad') })
    }
  }

  useEffect(() => { load() }, [])

  const openTrail = async (dv: NexusDataValue, item: NexusQuestionnaireItem) => {
    setPanel({ kind: 'loading', dv, item })
    try {
      const trail = await nexus.trail(dv.id)
      setPanel({ kind: 'ready', dv, item, trail })
    } catch (e) {
      setPanel({ kind: 'error', dv, item, error: e instanceof Error ? e.message : t('auditor.view.failed') })
    }
  }

  const groupSections = useMemo<TemplateSection[]>(() => {
    if (state.kind !== 'ready') return []
    return buildTemplate(state.items, state.historyByItem, state.currentByItem, 'group')
  }, [state])

  const jvSections = useMemo<TemplateSection[]>(() => {
    if (state.kind !== 'ready') return []
    return buildTemplate(state.items, state.historyByItem, state.currentByItem, 'jv')
  }, [state])

  if (state.kind === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" />
      </div>
    )
  }
  if (state.kind === 'empty') return <SetupGuard onReady={load} />
  if (state.kind === 'error') {
    return (
      <div className="max-w-lg mx-auto mt-20 p-6 rounded-[var(--radius-lg)] border border-[var(--status-reject)]/20 bg-[var(--accent-red-light)]">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--status-reject)] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-[var(--text-primary)] mb-1">{t('auditor.view.unableToLoad')}</h3>
            <p className="text-[length:var(--text-sm)] text-[var(--text-secondary)] font-mono">{state.error}</p>
            <button onClick={load} className="mt-3 text-[length:var(--text-sm)] font-medium text-[var(--color-brand)] hover:underline">{t('auditor.view.retry')}</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 sticky top-0 z-10 bg-[var(--bg-secondary)] -mx-8 px-8 py-3 border-b border-[var(--border-subtle)]">
        <button
          onClick={() => navigate('/reports')}
          className="inline-flex items-center gap-2 text-[length:var(--text-sm)] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="w-4 h-4" /> {t('auditor.view.back')}
        </button>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] text-[length:var(--text-xs)] font-semibold">
            <Shield className="w-3 h-3" /> {t('auditor.view.readOnly')}
          </span>
          <Button variant="secondary" size="sm" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => navigate('/reports/preview')}>
            {t('auditor.view.pdfPreview')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_400px] gap-6 items-start">
        {/* Document */}
        <article className="bg-white text-[var(--text-primary)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
          <header className="px-8 py-6 border-b border-[var(--border-subtle)]">
            <div className="text-micro uppercase tracking-[0.06em] text-[var(--color-brand)] font-semibold mb-1">
              {t('auditor.view.eyebrow')}
            </div>
            <h1 className="font-display text-[length:var(--text-2xl)] font-bold">Demo Co — FY{ACTIVE_YEAR}</h1>
            <p className="text-[length:var(--text-sm)] text-[var(--text-secondary)] mt-1">
              {t('auditor.view.intro')}
            </p>
          </header>

          <TrailDocumentBlock heading="Demo Co" sections={groupSections} onOpen={openTrail} />
          {jvSections.length > 0 && <TrailDocumentBlock heading={t('auditor.view.jvHeading')} sections={jvSections} onOpen={openTrail} />}
        </article>

        {/* Side panel */}
        <aside className="sticky top-[72px] rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden h-[calc(100vh-120px)] flex flex-col">
          {panel ? (
            <TrailPanel panel={panel} onClose={() => setPanel(null)} />
          ) : (
            <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-brand-soft)] flex items-center justify-center mb-3">
                <Shield className="w-6 h-6 text-[var(--color-brand)]" />
              </div>
              <h3 className="font-display text-[length:var(--text-base)] font-semibold text-[var(--text-primary)] mb-1">
                {t('auditor.view.drillTitle')}
              </h3>
              <p className="text-[length:var(--text-xs)] text-[var(--text-tertiary)] leading-relaxed">
                {t('auditor.view.drillBody')}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function TrailDocumentBlock({
  heading, sections, onOpen,
}: {
  heading: string
  sections: TemplateSection[]
  onOpen: (dv: NexusDataValue, item: NexusQuestionnaireItem) => void
}) {
  const { t, i18n } = useTranslation()
  return (
    <section>
      <h2 className="font-display text-[length:var(--text-lg)] font-semibold text-[var(--color-brand)] px-8 pt-6 pb-2">
        {heading}
      </h2>
      {sections.map(sec => (
        <div key={sec.capital} className="px-8 py-4">
          <h3 className="text-[length:var(--text-sm)] font-semibold text-[var(--text-primary)] mb-3 pb-1 border-b-2 border-[var(--color-brand)]">
            {t(capitalLabelKey(sec.capital), { defaultValue: sec.capital })}
          </h3>
          {sec.subsections.map(sub => (
            <div key={sub.name} className="mb-5">
              <h4 className="text-micro uppercase tracking-[0.06em] font-semibold text-[var(--color-brand)] mb-2">
                {t(subsectionLabelKey(sub.name), { defaultValue: sub.name })}
              </h4>
              <div className="space-y-1.5">
                {sub.rows.map(row => {
                  const dv = row.current
                  return (
                    <div key={row.item.id} className="flex items-center justify-between gap-3 text-[length:var(--text-xs)] py-1">
                      <div className="min-w-0 flex-1">
                        <div className="text-[var(--text-primary)] font-medium truncate">{itemLabel(row.item, i18n.language)}</div>
                        <div className="text-caption text-[var(--text-tertiary)]">
                          {row.item.gri_code}
                          {row.item.scope_split ? ` · ${row.item.scope_split}` : ''}
                          {row.item.unit ? ` · ${row.item.unit}` : ''}
                        </div>
                      </div>
                      {dv ? (
                        <button
                          type="button"
                          onClick={() => onOpen(dv, row.item)}
                          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--color-brand-soft)] hover:bg-[var(--color-brand)] hover:text-white text-[var(--color-brand-strong)] transition-colors group"
                        >
                          <span className="tabular-nums font-semibold">{formatValue(dv.value, row.item.unit)}</span>
                          <span className="font-mono text-caption opacity-70 group-hover:opacity-100">{truncateHash(dv.value_hash)}</span>
                        </button>
                      ) : (
                        <span className="text-[var(--text-tertiary)] px-2.5 py-1 font-mono">—</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}

function TrailPanel({ panel, onClose }: { panel: Exclude<PanelState, null>; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language?.startsWith('zh') ? 'zh-CN' : undefined
  return (
    <>
      <header className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-micro uppercase tracking-[0.06em] text-[var(--color-brand)] font-semibold mb-0.5">
            {panel.item.gri_code}
          </div>
          <h3 className="font-display text-[length:var(--text-sm)] font-semibold text-[var(--text-primary)] leading-snug">
            {itemLabel(panel.item, i18n.language)}
          </h3>
          <p className="text-caption text-[var(--text-tertiary)] mt-0.5">
            {t(capitalLabelKey(panel.item.section), { defaultValue: panel.item.section })} · {t(subsectionLabelKey(panel.item.subsection), { defaultValue: panel.item.subsection })}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label={t('common.close')}
          className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* Current value summary */}
      <div className="px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        <div className="flex items-baseline justify-between mb-1">
          <div className="text-micro uppercase tracking-[0.06em] text-[var(--text-tertiary)]">FY{ACTIVE_YEAR}</div>
          <StatusPill status={panel.dv.status} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[length:var(--text-2xl)] font-bold tabular-nums text-[var(--text-primary)]">
            {formatValue(panel.dv.value, panel.item.unit)}
          </span>
          {panel.item.unit && <span className="text-[length:var(--text-xs)] text-[var(--text-tertiary)]">{panel.item.unit}</span>}
        </div>
        <div className="flex items-center gap-2 mt-2 text-caption text-[var(--text-tertiary)]">
          <Hash className="w-3 h-3" />
          <span className="font-mono">{truncateHash(panel.dv.value_hash, 10, 8)}</span>
          <span>·</span>
          <span>{t('auditor.view.mode', { mode: panel.dv.entry_mode ? t(`auditor.entryMode.${panel.dv.entry_mode}`, { defaultValue: panel.dv.entry_mode }) : '—' })}</span>
        </div>
      </div>

      {/* Trail */}
      <div className="flex-1 overflow-y-auto">
        {panel.kind === 'loading' && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--color-brand)]" />
          </div>
        )}
        {panel.kind === 'error' && (
          <div className="p-5 text-[length:var(--text-sm)] text-[var(--status-reject)]">{panel.error}</div>
        )}
        {panel.kind === 'ready' && (
          <ol className="p-5 space-y-4">
            {panel.trail.length === 0 && (
              <li className="text-[length:var(--text-xs)] text-[var(--text-tertiary)] italic">{t('auditor.view.noEvents')}</li>
            )}
            {panel.trail.map((ev, idx) => (
              <li key={ev.id} className="relative pl-6">
                {idx < panel.trail.length - 1 && (
                  <span className="absolute left-[10px] top-5 bottom-[-16px] w-px bg-[var(--border-default)]" />
                )}
                <EventDot type={ev.event_type} />
                <div className="text-[length:var(--text-xs)]">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-[var(--text-primary)] capitalize">{t(`auditor.event.${ev.event_type}`, { defaultValue: ev.event_type })}</span>
                    {ev.actor_workflow_role && (
                      <span className="px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] text-micro font-semibold uppercase">
                        {t(`workflowStatus.role.${ev.actor_workflow_role}`, { defaultValue: ev.actor_workflow_role })}
                      </span>
                    )}
                  </div>
                  <div className="text-[var(--text-tertiary)]">
                    {ev.actor_name ?? ev.actor_email ?? t('auditor.view.system')}
                    {ev.actor_platform_role ? ` · ${ev.actor_platform_role}` : ''}
                  </div>
                  <div className="text-caption text-[var(--text-tertiary)] mt-0.5">
                    {new Date(ev.timestamp).toLocaleString(locale)}
                  </div>
                  {ev.comment && (
                    <div className="mt-1.5 p-2 rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] italic">
                      &ldquo;{ev.comment}&rdquo;
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5 text-caption font-mono text-[var(--text-tertiary)]">
                    <LinkIcon className="w-2.5 h-2.5" />
                    <span>{t('auditor.view.prevHash', { hash: truncateHash(ev.previous_hash) })}</span>
                    <span>→</span>
                    <span>{t('auditor.view.newHash', { hash: truncateHash(ev.new_hash) })}</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  )
}

function StatusPill({ status }: { status: NexusDataValue['status'] }) {
  const { t } = useTranslation()
  const map: Record<NexusDataValue['status'], { label: string; bg: string; fg: string }> = {
    not_started: { label: 'workflowStatus.status.not_started', bg: 'var(--bg-tertiary)', fg: 'var(--text-tertiary)' },
    draft:       { label: 'workflowStatus.status.draft', bg: 'var(--accent-amber-light)', fg: 'var(--status-draft)' },
    submitted:   { label: 'workflowStatus.status.submitted', bg: 'var(--accent-blue-light)', fg: 'var(--status-pending)' },
    reviewed:    { label: 'workflowStatus.status.reviewed', bg: 'var(--accent-blue-light)', fg: 'var(--status-pending)' },
    approved:    { label: 'workflowStatus.status.approved', bg: 'var(--accent-green-light)', fg: 'var(--status-ok)' },
    published:   { label: 'workflowStatus.status.published', bg: 'var(--accent-green-light)', fg: 'var(--status-ok)' },
    rejected:    { label: 'workflowStatus.status.rejected', bg: 'var(--accent-red-light)', fg: 'var(--status-reject)' },
  }
  const c = map[status]
  return (
    <span className="px-2 py-0.5 rounded-[var(--radius-sm)] text-micro font-semibold uppercase tracking-[0.06em]" style={{ background: c.bg, color: c.fg }}>
      {t(c.label)}
    </span>
  )
}

function EventDot({ type }: { type: NexusAuditEvent['event_type'] }) {
  const icon = type === 'approved' || type === 'published'
    ? <CheckCircle2 className="w-3 h-3" />
    : type === 'rejected'
    ? <X className="w-3 h-3" />
    : <Clock className="w-3 h-3" />
  const tone = type === 'approved' || type === 'published'
    ? { bg: 'var(--accent-green-light)', fg: 'var(--status-ok)' }
    : type === 'rejected'
    ? { bg: 'var(--accent-red-light)', fg: 'var(--status-reject)' }
    : { bg: 'var(--color-brand-soft)', fg: 'var(--color-brand)' }
  return (
    <span
      className="absolute left-0 top-0 w-5 h-5 rounded-full flex items-center justify-center"
      style={{ background: tone.bg, color: tone.fg }}
    >
      {icon}
    </span>
  )
}
