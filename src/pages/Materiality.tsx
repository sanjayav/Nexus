import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Check, Lock, ArrowRight, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useFramework } from '../lib/frameworks'
import { FrameworkBadge } from '../components/FrameworkBadge'
import PageHeader from '../components/PageHeader'
import Button from '../design-system/components/Button'
import { StatLedger, StateBoundary, StatusPill, notify, useConfirm, SkeletonLedger, SkeletonTable, type PillTone } from '../components/ui'
import ChartFrame from '../components/ui/ChartFrame'
import MaterialityMatrix, { type MatrixPoint } from '../components/analytics/MaterialityMatrix'
import useOrgMarket from '../components/analytics/useOrgMarket'
import {
  CN_SSE_TOPICS, CN_SSE_PILLARS, cnSseCodeOf, withCnSseCode, cnSseTopicName, isCnSsePresetName, pillarCategory, type CnSsePillar,
} from '../components/analytics/cnSseTopics'
import { spring, transition } from '../motion/tokens'

// ─── Types mirroring server (api/materiality) ─────────────
interface Topic {
  id: string
  framework_id: string
  topic_name: string
  topic_category: string | null
  linked_gri_codes: string[] | null
  impact_score: number | null
  financial_score: number | null
  likelihood: number | null
  severity: number | null
  time_horizon: 'short' | 'medium' | 'long' | null
  is_material: boolean | null
  threshold: number | null
  dma_status: 'identified' | 'assessed' | 'material' | 'not_material' | 'pending_review'
  rationale: string | null
}
interface IRO {
  id: string
  topic_id: string
  type: 'impact' | 'risk' | 'opportunity'
  description: string
  severity: number | null
  likelihood: number | null
  time_horizon: string | null
  scope: string | null
  created_at: string
}
interface Stakeholder {
  id: string
  topic_id: string
  stakeholder_group: string
  concern_rating: number
  notes: string | null
  created_at: string
}

const CSRD_TOPIC_UNIVERSE = [
  { name: 'E1 Climate Change', category: 'Environmental' },
  { name: 'E2 Pollution', category: 'Environmental' },
  { name: 'E3 Water and Marine Resources', category: 'Environmental' },
  { name: 'E4 Biodiversity and Ecosystems', category: 'Environmental' },
  { name: 'E5 Resource Use and Circular Economy', category: 'Environmental' },
  { name: 'S1 Own Workforce', category: 'Social' },
  { name: 'S2 Workers in Value Chain', category: 'Social' },
  { name: 'S3 Affected Communities', category: 'Social' },
  { name: 'S4 Consumers and End-Users', category: 'Social' },
  { name: 'G1 Business Conduct', category: 'Governance' },
]

/**
 * Display label for a topic. Presets (CSRD universe, CN-SSE 21 topics) are
 * stored with a stable English name used for de-duplication; show the
 * localised name. Custom topics are user content — shown as-is.
 */
function topicLabel(name: string, t: TFunction): string {
  if (isCnSsePresetName(name)) return t(`materiality.cnsse.topics.${name.slice(7)}`, { defaultValue: name })
  const code = /^([ESG]\d)\s/.exec(name)?.[1]
  if (code && CSRD_TOPIC_UNIVERSE.some(p => p.name === name)) return t(`materiality.topics.${code}`, { defaultValue: name })
  return name
}

const STAKEHOLDERS = ['investors', 'employees', 'customers', 'suppliers', 'regulators', 'civil_society'] as const

type Tab = 'topics' | 'cnsse' | 'iros' | 'stakeholders' | 'matrix'

async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('aeiforo_token')
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers as Record<string, string> || {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `API error ${res.status}`)
  }
  return res.json()
}

/**
 * The upsert endpoint REPLACES every column on update, so always send the
 * whole row merged with the patch (sending only the changed field used to wipe
 * the other scores, the category, the linked codes and the status).
 */
function topicBody(tp: Topic, patch: Partial<Topic> = {}) {
  const next = { ...tp, ...patch }
  const scored = next.impact_score != null && next.financial_score != null
  return {
    id: next.id,
    framework_id: next.framework_id,
    topic_name: next.topic_name,
    topic_category: next.topic_category,
    linked_gri_codes: next.linked_gri_codes ?? [],
    impact_score: next.impact_score,
    financial_score: next.financial_score,
    likelihood: next.likelihood,
    severity: next.severity,
    time_horizon: next.time_horizon,
    threshold: next.threshold != null ? Number(next.threshold) : null,
    rationale: next.rationale,
    dma_status: next.dma_status === 'identified' && scored ? 'assessed' : next.dma_status,
  }
}

type Verdict = 'double' | 'financial' | 'impact' | 'not' | 'unassessed'
function verdictOf(f: number | null, i: number | null, threshold: number): Verdict {
  if (f == null || i == null) return 'unassessed'
  const fm = f >= threshold, im = i >= threshold
  return fm && im ? 'double' : fm ? 'financial' : im ? 'impact' : 'not'
}
const VERDICT_TONE: Record<Verdict, PillTone> = { double: 'brand', financial: 'success', impact: 'success', not: 'neutral', unassessed: 'warning' }

export default function Materiality() {
  const { active: framework } = useFramework()
  const { t } = useTranslation()
  const confirm = useConfirm()
  const market = useOrgMarket()
  const [tab, setTab] = useState<Tab>('topics')
  const [topics, setTopics] = useState<Topic[]>([])
  const [iros, setIros] = useState<IRO[]>([])
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await api<{ topics: Topic[]; iros: IRO[]; stakeholders: Stakeholder[] }>('/materiality')
      setTopics(Array.isArray(data.topics) ? data.topics : [])
      setIros(Array.isArray(data.iros) ? data.iros : [])
      setStakeholders(Array.isArray(data.stakeholders) ? data.stakeholders : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => topics.filter(tp => !tp.framework_id || tp.framework_id === framework.id), [topics, framework.id])
  const threshold = Number(filtered[0]?.threshold ?? 3)

  /** Optimistic full-row save; reverts and explains on failure. */
  const saveTopic = useCallback(async (tp: Topic, patch: Partial<Topic>) => {
    const before = topics
    setTopics(ts => ts.map(x => (x.id === tp.id ? { ...x, ...patch } : x)))
    try {
      await api('/materiality', { method: 'POST', body: JSON.stringify(topicBody(tp, patch)) })
    } catch (e) {
      setTopics(before)
      notify.error(t('materiality.errors.updateTitle'), { description: e instanceof Error ? e.message : String(e) })
    }
  }, [topics, t])

  const createTopic = useCallback(async (input: { name: string; category: string; linked?: string[] }) => {
    try {
      await api('/materiality', {
        method: 'POST',
        body: JSON.stringify({ framework_id: framework.id, topic_name: input.name, topic_category: input.category, linked_gri_codes: input.linked ?? [], dma_status: 'identified' }),
      })
      notify.success(t('materiality.toast.added', { topic: topicLabel(input.name, t) }))
      await load()
    } catch (e) {
      notify.error(t('materiality.errors.createTitle'), { description: e instanceof Error ? e.message : String(e) })
    }
  }, [framework.id, load, t])

  const finalize = async () => {
    const assessed = filtered.filter(tp => tp.impact_score != null && tp.financial_score != null).length
    const ok = await confirm({
      title: t('materiality.finalizeSheet.title'),
      description: t('materiality.finalizeSheet.body', { assessed, total: filtered.length, threshold }),
      confirmLabel: t('materiality.matrix.finalize'),
      icon: <Lock className="w-5 h-5" />,
    })
    if (!ok) return
    setBusy(true)
    try {
      const r = await api<{ material_count?: number; not_material_count?: number }>('/materiality/finalize', { method: 'POST', body: '{}' })
      notify.success(t('materiality.finalized'), {
        description: r?.material_count != null ? t('materiality.finalizedCounts', { material: r.material_count, not: r.not_material_count ?? 0 }) : undefined,
      })
      await load()
    } catch (e) {
      notify.error(t('materiality.errors.finalizeTitle'), { description: e instanceof Error ? e.message : String(e) })
    } finally { setBusy(false) }
  }

  const cnSse = market.cnSse
  const mappedCodes = new Set(filtered.map(tp => cnSseCodeOf(tp.linked_gri_codes)).filter(Boolean) as string[])
  const assessedCount = filtered.filter(tp => tp.impact_score != null && tp.financial_score != null).length
  const materialCount = filtered.filter(tp => tp.is_material || tp.dma_status === 'material').length

  const tabs: Tab[] = cnSse ? ['topics', 'cnsse', 'iros', 'stakeholders', 'matrix'] : ['topics', 'iros', 'stakeholders', 'matrix']

  return (
    <div className="page-container space-y-6">
      <PageHeader
        breadcrumbs={[{ label: t('materiality.crumbStrategy') }, { label: t('materiality.crumbSelf') }]}
        eyebrow={t('materiality.eyebrow')}
        title={t('materiality.title')}
        description={t('materiality.description')}
        actions={<FrameworkBadge size="md" />}
      />

      <StateBoundary
        loading={loading}
        error={error}
        onRetry={load}
        hasData={topics.length > 0}
        skeleton={<div className="space-y-6"><SkeletonLedger items={4} /><SkeletonTable rows={6} /></div>}
        errorState={{ title: t('materiality.errors.loadTitle') }}
      >
        <div className="space-y-6">
          <StatLedger
            aria-label={t('materiality.ledger.aria')}
            items={[
              { id: 'topics', label: t('materiality.ledger.topics'), value: filtered.length, tone: 'brand' },
              { id: 'assessed', label: t('materiality.ledger.assessed'), value: assessedCount, tone: assessedCount === filtered.length && filtered.length > 0 ? 'success' : 'warning', hint: t('materiality.ledger.assessedHint', { total: filtered.length }) },
              { id: 'material', label: t('materiality.ledger.material'), value: materialCount, tone: 'success', hint: t('materiality.ledger.materialHint') },
              cnSse
                ? { id: 'cnsse', label: t('materiality.ledger.cnsse'), value: `${mappedCodes.size} / ${CN_SSE_TOPICS.length}`, tone: mappedCodes.size === CN_SSE_TOPICS.length ? 'success' : 'info', hint: t('materiality.ledger.cnsseHint'), onClick: () => setTab('cnsse') }
                : { id: 'iros', label: t('materiality.ledger.iros'), value: iros.length, tone: 'neutral', hint: t('materiality.ledger.irosHint') },
            ]}
          />

          <div role="tablist" aria-label={t('materiality.tabsAria')} className="flex gap-1 border-b border-[var(--border-subtle)] overflow-x-auto [scrollbar-width:none]">
            {tabs.map(k => (
              <button
                key={k}
                role="tab"
                type="button"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={`relative min-h-[44px] px-3.5 text-small font-medium whitespace-nowrap transition-colors duration-micro ${tab === k ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
              >
                {t(`materiality.tabs.${k}`)}
                {tab === k && <motion.span layoutId="mat-tab" className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-[var(--color-brand)]" transition={spring.snappy} />}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={tab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={transition.fast} role="tabpanel">
              {tab === 'topics' && <TopicsTab topics={filtered} cnSse={cnSse} onSave={saveTopic} onCreate={createTopic} />}
              {tab === 'cnsse' && <CnSseTab topics={filtered} threshold={threshold} onSave={saveTopic} onCreate={createTopic} />}
              {tab === 'iros' && <IrosTab topics={filtered} iros={iros} reload={load} />}
              {tab === 'stakeholders' && <StakeholdersTab topics={filtered} stakeholders={stakeholders} reload={load} />}
              {tab === 'matrix' && <MatrixTab topics={filtered} threshold={threshold} cnSse={cnSse} onFinalize={finalize} busy={busy} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </StateBoundary>
    </div>
  )
}

// ─── Shared controls ──────────────────────────────────────

const selectCls = 'h-9 px-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small text-[var(--text-primary)] tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)]'

function ScoreSelect({ value, onChange, label }: { value: number | null; onChange: (n: number | null) => void; label: string }) {
  return (
    <select aria-label={label} value={value ?? ''} onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} className={`${selectCls} w-16 text-center`}>
      <option value="">—</option>
      {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
    </select>
  )
}

function Panel({ title, actions, children, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`surface-paper overflow-hidden ${className}`}>
      {(title || actions) && (
        <header className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 flex-wrap">
          {title && <h3 className="text-small font-semibold text-[var(--text-primary)]">{title}</h3>}
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}

function PresetChip({ label, onAdd, disabled }: { label: string; onAdd: () => Promise<void>; disabled?: boolean }) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={async () => { setBusy(true); try { await onAdd() } finally { setBusy(false) } }}
      className="min-h-[36px] px-3 rounded-full border border-dashed border-[var(--border-strong)] text-caption font-medium text-[var(--text-secondary)] inline-flex items-center gap-1.5 hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] hover:bg-[var(--bg-hover)] disabled:opacity-50 transition-colors duration-micro"
    >
      <Plus className="w-3.5 h-3.5" aria-hidden /> {label}
    </button>
  )
}

// ─── Topics tab ───────────────────────────────────────────
function TopicsTab({ topics, cnSse, onSave, onCreate }: {
  topics: Topic[]
  cnSse: boolean
  onSave: (tp: Topic, patch: Partial<Topic>) => Promise<void>
  onCreate: (i: { name: string; category: string; linked?: string[] }) => Promise<void>
}) {
  const { t } = useTranslation()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Environmental')
  const [busy, setBusy] = useState(false)
  const presets = CSRD_TOPIC_UNIVERSE.filter(p => !topics.some(tp => tp.topic_name === p.name))
  const cnPresets = cnSse ? CN_SSE_TOPICS.filter(c => !topics.some(tp => tp.topic_name === cnSseTopicName(c.code) || cnSseCodeOf(tp.linked_gri_codes) === c.code)) : []

  const submit = async () => {
    if (!name.trim()) return
    setBusy(true)
    try { await onCreate({ name: name.trim(), category }); setName(''); setAdding(false) } finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      {(cnPresets.length > 0 || presets.length > 0) && (
        <Panel title={t('materiality.universeTitle')}>
          <div className="p-5 space-y-4">
            {cnPresets.length > 0 && (
              <div>
                <div className="text-caption text-[var(--text-tertiary)] mb-2">{t('materiality.cnsse.universe')}</div>
                <div className="flex flex-wrap gap-2">
                  {cnPresets.map(c => (
                    <PresetChip key={c.code} label={t(`materiality.cnsse.topics.${c.code}`)}
                      onAdd={() => onCreate({ name: cnSseTopicName(c.code), category: pillarCategory[c.pillar], linked: [`CNSSE-${c.code}`] })} />
                  ))}
                </div>
              </div>
            )}
            {presets.length > 0 && (
              <div>
                <div className="text-caption text-[var(--text-tertiary)] mb-2">{t('materiality.universe')}</div>
                <div className="flex flex-wrap gap-2">
                  {presets.map(p => <PresetChip key={p.name} label={topicLabel(p.name, t)} onAdd={() => onCreate({ name: p.name, category: p.category })} />)}
                </div>
              </div>
            )}
          </div>
        </Panel>
      )}

      <Panel
        title={t('materiality.topicsCount', { count: topics.length })}
        actions={<Button variant="secondary" size="sm" icon={adding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />} onClick={() => setAdding(s => !s)}>{adding ? t('common.cancel') : t('materiality.customTopic')}</Button>}
      >
        <AnimatePresence initial={false}>
          {adding && (
            <motion.form
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={transition.base}
              className="overflow-hidden border-b border-[var(--border-subtle)]"
              onSubmit={e => { e.preventDefault(); void submit() }}
            >
              <div className="px-5 py-3 flex flex-col sm:flex-row gap-2">
                <label className="sr-only" htmlFor="material-topic-name">{t('materiality.topicName')}</label>
                <input id="material-topic-name" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder={t('materiality.topicName')}
                  className="flex-1 h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)]" />
                <label className="sr-only" htmlFor="material-topic-category">{t('materiality.topicCategory')}</label>
                <select id="material-topic-category" value={category} onChange={e => setCategory(e.target.value)} className={`${selectCls} h-10`}>
                  {['Environmental', 'Social', 'Governance', 'Economic'].map(c => <option key={c} value={c}>{t(`materiality.category.${c}`)}</option>)}
                </select>
                <Button type="submit" variant="primary" size="md" loading={busy} disabled={!name.trim()}>{t('common.save')}</Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {topics.length === 0 ? (
          <StateBoundary empty compact emptyState={{ art: 'materiality', title: t('materiality.empty.title'), body: cnSse ? t('materiality.empty.bodyCn') : t('materiality.empty.body') }}>{null}</StateBoundary>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-small min-w-[760px]">
              <thead>
                <tr className="text-caption text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
                  <th scope="col" className="text-left px-5 py-2.5 font-medium">{t('materiality.col.topic')}</th>
                  {cnSse && <th scope="col" className="text-left px-3 py-2.5 font-medium">{t('materiality.col.cnsse')}</th>}
                  <th scope="col" className="text-center px-2 py-2.5 font-medium">{t('materiality.col.financial')}</th>
                  <th scope="col" className="text-center px-2 py-2.5 font-medium">{t('materiality.col.impact')}</th>
                  <th scope="col" className="text-center px-2 py-2.5 font-medium">{t('materiality.col.likelihood')}</th>
                  <th scope="col" className="text-center px-2 py-2.5 font-medium">{t('materiality.col.severity')}</th>
                  <th scope="col" className="text-center px-2 py-2.5 font-medium">{t('materiality.col.horizon')}</th>
                  <th scope="col" className="text-left px-5 py-2.5 font-medium">{t('materiality.col.material')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {topics.map(tp => {
                  const label = topicLabel(tp.topic_name, t)
                  const code = cnSseCodeOf(tp.linked_gri_codes)
                  return (
                    <tr key={tp.id} className="hover:bg-[var(--bg-hover)] transition-colors duration-micro">
                      <td className="px-5 py-2.5">
                        <div className="font-medium text-[var(--text-primary)]">{label}</div>
                        <div className="text-caption text-[var(--text-tertiary)]">{tp.topic_category ? t(`materiality.category.${tp.topic_category}`, { defaultValue: tp.topic_category }) : '—'}</div>
                      </td>
                      {cnSse && (
                        <td className="px-3 py-2.5">
                          <CnSseSelect value={code} label={t('materiality.aria.cnsse', { topic: label })} onChange={c => onSave(tp, { linked_gri_codes: withCnSseCode(tp.linked_gri_codes, c) })} />
                        </td>
                      )}
                      <td className="px-2 py-2.5 text-center"><ScoreSelect value={tp.financial_score} onChange={v => onSave(tp, { financial_score: v })} label={t('materiality.aria.financial', { topic: label })} /></td>
                      <td className="px-2 py-2.5 text-center"><ScoreSelect value={tp.impact_score} onChange={v => onSave(tp, { impact_score: v })} label={t('materiality.aria.impact', { topic: label })} /></td>
                      <td className="px-2 py-2.5 text-center"><ScoreSelect value={tp.likelihood} onChange={v => onSave(tp, { likelihood: v })} label={t('materiality.aria.likelihood', { topic: label })} /></td>
                      <td className="px-2 py-2.5 text-center"><ScoreSelect value={tp.severity} onChange={v => onSave(tp, { severity: v })} label={t('materiality.aria.severity', { topic: label })} /></td>
                      <td className="px-2 py-2.5 text-center">
                        <select aria-label={t('materiality.aria.horizon', { topic: label })} value={tp.time_horizon ?? ''} onChange={e => onSave(tp, { time_horizon: (e.target.value || null) as Topic['time_horizon'] })} className={selectCls}>
                          <option value="">—</option>
                          <option value="short">{t('materiality.horizon.short')}</option>
                          <option value="medium">{t('materiality.horizon.medium')}</option>
                          <option value="long">{t('materiality.horizon.long')}</option>
                        </select>
                      </td>
                      <td className="px-5 py-2.5"><TopicVerdict tp={tp} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}

function TopicVerdict({ tp }: { tp: Topic }) {
  const { t } = useTranslation()
  if (tp.is_material || tp.dma_status === 'material') return <StatusPill tone="success" icon={<Check />}>{t('materiality.matrix.material')}</StatusPill>
  if (tp.dma_status === 'not_material') return <StatusPill tone="neutral">{t('materiality.matrix.notMaterial')}</StatusPill>
  if (tp.impact_score != null && tp.financial_score != null) return <StatusPill tone="info" dot>{t('materiality.matrix.pending')}</StatusPill>
  return <StatusPill tone="warning">{t('materiality.status.unscored')}</StatusPill>
}

function CnSseSelect({ value, onChange, label }: { value: string | null; onChange: (c: string | null) => void; label: string }) {
  const { t } = useTranslation()
  return (
    <select aria-label={label} value={value ?? ''} onChange={e => onChange(e.target.value || null)} className={`${selectCls} max-w-[200px]`}>
      <option value="">{t('materiality.cnsse.unmapped')}</option>
      {CN_SSE_PILLARS.map(p => (
        <optgroup key={p} label={t(`materiality.cnsse.pillars.${p}`)}>
          {CN_SSE_TOPICS.filter(c => c.pillar === p).map(c => <option key={c.code} value={c.code}>{t(`materiality.cnsse.topics.${c.code}`)}</option>)}
        </optgroup>
      ))}
    </select>
  )
}

// ─── CN-SSE 21 topics tab ─────────────────────────────────
/**
 * Every exchange topic with the materiality topics mapped to it and the
 * resulting double-materiality verdict (financial / impact / double). Scores
 * per CN topic are the highest of its mapped topics on each axis.
 */
function cnTopicScores(topics: Topic[], code: string) {
  const mapped = topics.filter(tp => cnSseCodeOf(tp.linked_gri_codes) === code)
  const fin = mapped.map(tp => tp.financial_score).filter((v): v is number => v != null)
  const imp = mapped.map(tp => tp.impact_score).filter((v): v is number => v != null)
  return { mapped, f: fin.length ? Math.max(...fin) : null, i: imp.length ? Math.max(...imp) : null }
}

function CnSseTab({ topics, threshold, onSave, onCreate }: {
  topics: Topic[]
  threshold: number
  onSave: (tp: Topic, patch: Partial<Topic>) => Promise<void>
  onCreate: (i: { name: string; category: string; linked?: string[] }) => Promise<void>
}) {
  const { t } = useTranslation()
  const unmappedTopics = topics.filter(tp => !cnSseCodeOf(tp.linked_gri_codes))
  return (
    <div className="space-y-4">
      <p className="text-small text-[var(--text-secondary)] max-w-[72ch]">{t('materiality.cnsse.intro', { threshold })}</p>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        {CN_SSE_PILLARS.map((p: CnSsePillar) => {
          const list = CN_SSE_TOPICS.filter(c => c.pillar === p)
          return (
            <Panel key={p} title={<span className="flex items-center gap-2">{t(`materiality.cnsse.pillars.${p}`)}<span className="text-caption font-normal text-[var(--text-tertiary)]">{t('materiality.cnsse.pillarCount', { count: list.length })}</span></span>}>
              <ul className="divide-y divide-[var(--border-subtle)]">
                {list.map(c => {
                  const s = cnTopicScores(topics, c.code)
                  const v = verdictOf(s.f, s.i, threshold)
                  return (
                    <li key={c.code} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-small font-medium text-[var(--text-primary)]">{t(`materiality.cnsse.topics.${c.code}`)}</div>
                          <div className="text-caption text-[var(--text-tertiary)] mt-0.5 tabular-nums">
                            {s.mapped.length === 0 ? t('materiality.cnsse.notInScope') : t('materiality.cnsse.scores', { f: s.f ?? '—', i: s.i ?? '—' })}
                          </div>
                        </div>
                        {s.mapped.length > 0 && <StatusPill tone={VERDICT_TONE[v]} size="sm" dot={v === 'double'}>{t(`materiality.verdict.${v}`)}</StatusPill>}
                      </div>
                      {s.mapped.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {s.mapped.map(tp => (
                            <span key={tp.id} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full bg-[var(--bg-secondary)] text-caption text-[var(--text-secondary)] max-w-full">
                              <span className="truncate">{topicLabel(tp.topic_name, t)}</span>
                              <button type="button" onClick={() => onSave(tp, { linked_gri_codes: withCnSseCode(tp.linked_gri_codes, null) })}
                                aria-label={t('materiality.cnsse.unmap', { topic: topicLabel(tp.topic_name, t) })}
                                className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                                <X className="w-3 h-3" aria-hidden />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <PresetChip label={t('materiality.cnsse.addToScope')} onAdd={() => onCreate({ name: cnSseTopicName(c.code), category: pillarCategory[p], linked: [`CNSSE-${c.code}`] })} />
                          {unmappedTopics.length > 0 && (
                            <select
                              aria-label={t('materiality.cnsse.mapExistingAria', { topic: t(`materiality.cnsse.topics.${c.code}`) })}
                              value=""
                              onChange={e => {
                                const tp = topics.find(x => x.id === e.target.value)
                                if (tp) void onSave(tp, { linked_gri_codes: withCnSseCode(tp.linked_gri_codes, c.code) })
                              }}
                              className={`${selectCls} max-w-[180px] text-caption`}
                            >
                              <option value="">{t('materiality.cnsse.mapExisting')}</option>
                              {unmappedTopics.map(tp => <option key={tp.id} value={tp.id}>{topicLabel(tp.topic_name, t)}</option>)}
                            </select>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </Panel>
          )
        })}
      </div>
    </div>
  )
}

// ─── IROs tab ─────────────────────────────────────────────
function IrosTab({ topics, iros, reload }: { topics: Topic[]; iros: IRO[]; reload: () => Promise<void> }) {
  const { t } = useTranslation()
  const [openTopic, setOpenTopic] = useState<string | null>(null)
  if (topics.length === 0) {
    return <div className="surface-paper"><StateBoundary empty compact emptyState={{ art: 'materiality', title: t('materiality.iros.addTopicsFirst') }}>{null}</StateBoundary></div>
  }
  return (
    <div className="surface-paper divide-y divide-[var(--border-subtle)] overflow-hidden">
      {topics.map(tp => {
        const myIros = iros.filter(i => i.topic_id === tp.id)
        const open = openTopic === tp.id
        return (
          <div key={tp.id}>
            <button type="button" aria-expanded={open} onClick={() => setOpenTopic(open ? null : tp.id)} className="w-full min-h-[48px] px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--bg-hover)] transition-colors duration-micro">
              <span className="text-small font-medium text-[var(--text-primary)]">{topicLabel(tp.topic_name, t)}</span>
              <span className="flex items-center gap-2 text-caption text-[var(--text-tertiary)]">
                {t('materiality.iros.count', { count: myIros.length })}
                <ArrowRight className={`w-3.5 h-3.5 transition-transform duration-fast ${open ? 'rotate-90' : ''}`} aria-hidden />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={transition.base} className="overflow-hidden">
                  <div className="px-5 pb-4 space-y-2">
                    {myIros.map(i => (
                      <div key={i.id} className="p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                        <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
                          <StatusPill tone={i.type === 'risk' ? 'warning' : i.type === 'opportunity' ? 'success' : 'info'} size="sm">{t(`materiality.iroType.${i.type}`, { defaultValue: i.type })}</StatusPill>
                          <span className="text-caption text-[var(--text-tertiary)] tabular-nums">
                            {t('materiality.iros.meta', { sev: i.severity ?? '—', lik: i.likelihood ?? '—', horizon: i.time_horizon ? t(`materiality.horizon.${i.time_horizon}`, { defaultValue: i.time_horizon }) : '—' })}
                          </span>
                        </div>
                        <div className="text-small text-[var(--text-primary)]">{i.description}</div>
                      </div>
                    ))}
                    <IroForm topicId={tp.id} onSaved={reload} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

function IroForm({ topicId, onSaved }: { topicId: string; onSaved: () => Promise<void> }) {
  const { t } = useTranslation()
  const [type, setType] = useState<'impact' | 'risk' | 'opportunity'>('impact')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState(3)
  const [likelihood, setLikelihood] = useState(3)
  const [horizon, setHorizon] = useState<'short' | 'medium' | 'long'>('medium')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!description.trim()) return
    setBusy(true)
    try {
      await api('/materiality/iro', { method: 'POST', body: JSON.stringify({ topic_id: topicId, type, description, severity, likelihood, time_horizon: horizon }) })
      setDescription('')
      notify.success(t('materiality.toast.iroAdded'))
      await onSaved()
    } catch (e) {
      notify.error(t('materiality.errors.iroTitle'), { description: e instanceof Error ? e.message : String(e) })
    } finally { setBusy(false) }
  }

  return (
    <form className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end pt-1" onSubmit={e => { e.preventDefault(); void submit() }}>
      <select aria-label={t('materiality.iros.typeAria')} value={type} onChange={e => setType(e.target.value as 'impact' | 'risk' | 'opportunity')} className={`${selectCls} sm:col-span-2`}>
        <option value="impact">{t('materiality.iroType.impact')}</option>
        <option value="risk">{t('materiality.iroType.risk')}</option>
        <option value="opportunity">{t('materiality.iroType.opportunity')}</option>
      </select>
      <input aria-label={t('materiality.iros.descAria')} value={description} onChange={e => setDescription(e.target.value)} placeholder={t('materiality.iros.description')}
        className="col-span-2 sm:col-span-5 h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)]" />
      <ScoreSelect value={severity} onChange={v => setSeverity(v ?? 3)} label={t('materiality.col.severity')} />
      <ScoreSelect value={likelihood} onChange={v => setLikelihood(v ?? 3)} label={t('materiality.col.likelihood')} />
      <select aria-label={t('materiality.iros.horizonAria')} value={horizon} onChange={e => setHorizon(e.target.value as 'short' | 'medium' | 'long')} className={`${selectCls} sm:col-span-2`}>
        <option value="short">{t('materiality.horizon.short')}</option>
        <option value="medium">{t('materiality.horizon.medium')}</option>
        <option value="long">{t('materiality.horizon.long')}</option>
      </select>
      <Button type="submit" variant="primary" size="sm" loading={busy} disabled={!description.trim()} className="sm:col-span-1">{t('materiality.iros.add')}</Button>
    </form>
  )
}

// ─── Stakeholders tab ─────────────────────────────────────
function StakeholdersTab({ topics, stakeholders, reload }: { topics: Topic[]; stakeholders: Stakeholder[]; reload: () => Promise<void> }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)

  const setRating = async (topicId: string, group: string, rating: number) => {
    setBusy(true)
    try {
      await api('/materiality/stakeholder', { method: 'POST', body: JSON.stringify({ topic_id: topicId, stakeholder_group: group, concern_rating: rating }) })
      await reload()
    } catch (e) {
      notify.error(t('materiality.errors.saveTitle'), { description: e instanceof Error ? e.message : String(e) })
    } finally { setBusy(false) }
  }

  const latestFor = (topicId: string, group: string): number | null => stakeholders.find(s => s.topic_id === topicId && s.stakeholder_group === group)?.concern_rating ?? null

  if (topics.length === 0) {
    return <div className="surface-paper"><StateBoundary empty compact emptyState={{ art: 'materiality', title: t('materiality.noTopicsToRate') }}>{null}</StateBoundary></div>
  }
  return (
    <div className="surface-paper overflow-x-auto">
      <table className="w-full text-small min-w-[720px]">
        <thead>
          <tr className="text-caption text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
            <th scope="col" className="text-left px-5 py-2.5 font-medium">{t('materiality.col.topic')}</th>
            {STAKEHOLDERS.map(s => <th key={s} scope="col" className="text-center px-2 py-2.5 font-medium">{t(`materiality.stakeholders.${s}`)}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {topics.map(tp => (
            <tr key={tp.id} className="hover:bg-[var(--bg-hover)] transition-colors duration-micro">
              <td className="px-5 py-2.5 font-medium text-[var(--text-primary)]">{topicLabel(tp.topic_name, t)}</td>
              {STAKEHOLDERS.map(g => (
                <td key={g} className="px-2 py-2.5 text-center">
                  <select
                    aria-label={t('materiality.aria.concern', { topic: topicLabel(tp.topic_name, t), group: t(`materiality.stakeholders.${g}`) })}
                    value={latestFor(tp.id, g) ?? ''}
                    disabled={busy}
                    onChange={e => { if (e.target.value !== '') void setRating(tp.id, g, Number(e.target.value)) }}
                    className={`${selectCls} w-16 text-center`}
                  >
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Matrix tab ───────────────────────────────────────────
function MatrixTab({ topics, threshold, cnSse, onFinalize, busy }: { topics: Topic[]; threshold: number; cnSse: boolean; onFinalize: () => Promise<void>; busy: boolean }) {
  const { t } = useTranslation()
  const [view, setView] = useState<'topics' | 'cnsse'>(cnSse ? 'cnsse' : 'topics')
  const [selected, setSelected] = useState<string | null>(null)

  const topicPoints: MatrixPoint[] = topics
    .filter(tp => tp.impact_score != null && tp.financial_score != null)
    .map(tp => {
      const code = cnSseCodeOf(tp.linked_gri_codes)
      return {
        id: tp.id,
        label: topicLabel(tp.topic_name, t),
        x: Number(tp.financial_score),
        y: Number(tp.impact_score),
        material: tp.is_material || tp.dma_status === 'material' ? true : tp.dma_status === 'not_material' ? false : null,
        sub: code && !isCnSsePresetName(tp.topic_name) ? t(`materiality.cnsse.topics.${code}`) : undefined,
      }
    })
  const cnPoints: MatrixPoint[] = CN_SSE_TOPICS.map(c => ({ c, s: cnTopicScores(topics, c.code) }))
    .filter(({ s }) => s.f != null && s.i != null)
    .map(({ c, s }) => ({
      id: c.code,
      label: t(`materiality.cnsse.topics.${c.code}`),
      x: s.f!,
      y: s.i!,
      material: verdictOf(s.f, s.i, threshold) !== 'not',
      sub: t(`materiality.cnsse.pillars.${c.pillar}`),
    }))
  const points = view === 'cnsse' ? cnPoints : topicPoints

  return (
    <div className="space-y-4">
      <ChartFrame
        title={t('materiality.matrix.title')}
        subtitle={<>{t('materiality.matrix.thresholdPrefix')}<strong className="tabular-nums">{threshold.toFixed(1)}</strong>{t('materiality.matrix.thresholdSuffix')}</>}
        height={440}
        empty={points.length === 0}
        emptyTitle={t('materiality.matrix.emptyTitle')}
        emptyBody={t('materiality.matrix.emptyBody')}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {cnSse && (
              <div role="radiogroup" aria-label={t('materiality.matrix.viewAria')} className="flex items-center gap-0.5 p-0.5 rounded-[var(--radius-md)] bg-[var(--bg-secondary)]">
                {(['cnsse', 'topics'] as const).map(v => (
                  <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)}
                    className={`relative min-h-[32px] px-2.5 rounded-[var(--radius-sm)] text-caption font-medium whitespace-nowrap ${view === v ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}>
                    {view === v && <motion.span layoutId="matrix-view" className="absolute inset-0 rounded-[var(--radius-sm)] bg-[var(--bg-primary)] shadow-[var(--shadow-card)]" transition={spring.snappy} />}
                    <span className="relative">{t(`materiality.matrix.view.${v}`)}</span>
                  </button>
                ))}
              </div>
            )}
            <Button variant="primary" size="sm" onClick={onFinalize} loading={busy} icon={<Lock className="w-3.5 h-3.5" />}>{t('materiality.matrix.finalize')}</Button>
          </div>
        }
        legend={[
          { label: t('materiality.matrix.legendMaterial'), color: 'var(--chart-s1)' },
          { label: t('materiality.matrix.legendPending'), color: 'var(--chart-s3)' },
          { label: t('materiality.matrix.legendThreshold'), color: 'var(--chart-target)', dashed: true },
        ]}
      >
        <MaterialityMatrix key={view} points={points} threshold={threshold} onSelect={setSelected} selectedId={selected} />
      </ChartFrame>

      <Panel title={t('materiality.matrix.verdict')}>
        <div className="overflow-x-auto">
          <table className="w-full text-small min-w-[520px]">
            <thead>
              <tr className="text-caption text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
                <th scope="col" className="text-left px-5 py-2.5 font-medium">{t('materiality.col.topic')}</th>
                <th scope="col" className="text-right px-3 py-2.5 font-medium">{t('materiality.col.financial')}</th>
                <th scope="col" className="text-right px-3 py-2.5 font-medium">{t('materiality.col.impact')}</th>
                <th scope="col" className="text-left px-5 py-2.5 font-medium">{t('materiality.matrix.verdict')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {view === 'cnsse'
                ? CN_SSE_TOPICS.map(c => {
                  const s = cnTopicScores(topics, c.code)
                  const v = verdictOf(s.f, s.i, threshold)
                  return (
                    <tr key={c.code} className={selected === c.code ? 'bg-[var(--bg-hover)]' : ''}>
                      <td className="px-5 py-2.5">
                        <div className="font-medium text-[var(--text-primary)]">{t(`materiality.cnsse.topics.${c.code}`)}</div>
                        <div className="text-caption text-[var(--text-tertiary)]">{t(`materiality.cnsse.pillars.${c.pillar}`)}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{s.f ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{s.i ?? '—'}</td>
                      <td className="px-5 py-2.5">{s.mapped.length ? <StatusPill tone={VERDICT_TONE[v]} size="sm" dot={v === 'double'}>{t(`materiality.verdict.${v}`)}</StatusPill> : <span className="text-caption text-[var(--text-tertiary)]">{t('materiality.cnsse.notInScope')}</span>}</td>
                    </tr>
                  )
                })
                : topics.map(tp => (
                  <tr key={tp.id} className={selected === tp.id ? 'bg-[var(--bg-hover)]' : ''}>
                    <td className="px-5 py-2.5 font-medium text-[var(--text-primary)]">{topicLabel(tp.topic_name, t)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{tp.financial_score ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{tp.impact_score ?? '—'}</td>
                    <td className="px-5 py-2.5"><TopicVerdict tp={tp} /></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
