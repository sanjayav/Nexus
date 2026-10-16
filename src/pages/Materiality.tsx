import { useEffect, useMemo, useState } from 'react'
import { Scale, Plus, Loader2, Save, Check, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import EmptyState from '../components/EmptyState'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, LabelList,
} from 'recharts'
import { useFramework } from '../lib/frameworks'
import { FrameworkBadge } from '../components/FrameworkBadge'
import PageHeader from '../components/PageHeader'
import { SkeletonCard } from '../components/Skeleton'
import { Stagger, StaggerItem } from '../components/MotionPrimitives'

// ─── Types mirroring server ───────────────────────────────
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
 * Display label for a topic. Topics added from the CSRD universe are stored
 * with their canonical English name (used for de-duplication); show the
 * localised name when one exists. Custom topics are user content — shown as-is.
 */
function topicLabel(name: string, t: TFunction): string {
  const code = /^([ESG]\d)\s/.exec(name)?.[1]
  if (code && CSRD_TOPIC_UNIVERSE.some(p => p.name === name)) {
    return t(`materiality.topics.${code}`, { defaultValue: name })
  }
  return name
}

const STAKEHOLDERS = ['investors', 'employees', 'customers', 'suppliers', 'regulators', 'civil_society'] as const

type Tab = 'topics' | 'iros' | 'stakeholders' | 'matrix'

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

export default function Materiality() {
  const { active: framework } = useFramework()
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('topics')
  const [topics, setTopics] = useState<Topic[]>([])
  const [iros, setIros] = useState<IRO[]>([])
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await api<{ topics: Topic[]; iros: IRO[]; stakeholders: Stakeholder[] }>('/materiality')
      setTopics(data.topics ?? [])
      setIros(data.iros ?? [])
      setStakeholders(data.stakeholders ?? [])
    } catch (e) {
      setToast(t('materiality.errors.load', { message: e instanceof Error ? e.message : String(e) }))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [])

  const filtered = useMemo(
    () => topics.filter(tp => !tp.framework_id || tp.framework_id === framework.id),
    [topics, framework.id],
  )

  const finalize = async () => {
    setBusy(true)
    try {
      await api('/materiality/finalize', { method: 'POST', body: '{}' })
      setToast(t('materiality.finalized'))
      await load()
    } catch (e) {
      setToast(t('materiality.errors.finalize', { message: e instanceof Error ? e.message : String(e) }))
    } finally { setBusy(false) }
  }

  return (
    <div className="page-container animate-fade-in">
      <PageHeader
        breadcrumbs={[
          { label: t('materiality.crumbStrategy') },
          { label: t('materiality.crumbSelf') },
        ]}
        eyebrow={t('materiality.eyebrow')}
        title={t('materiality.title')}
        description={
          <>
            {t('materiality.description')}
          </>
        }
      >
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <FrameworkBadge size="md" />
        </div>
      </PageHeader>

      <nav className="flex gap-1 mb-4 border-b border-[var(--border-default)]">
        {(['topics','iros','stakeholders','matrix'] as Tab[]).map(k => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={[
              'px-4 py-2 text-[var(--text-sm)] font-semibold border-b-2 -mb-px',
              tab === k
                ? 'border-[var(--color-brand)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-primary)]',
            ].join(' ')}
          >
            {k === 'topics' && t('materiality.tabs.topics')}
            {k === 'iros' && t('materiality.tabs.iros')}
            {k === 'stakeholders' && t('materiality.tabs.stakeholders')}
            {k === 'matrix' && t('materiality.tabs.matrix')}
          </button>
        ))}
      </nav>

      {toast && (
        <div className="mb-3 p-3 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] text-[var(--text-sm)] text-[var(--text-secondary)]">
          {toast}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <Stagger>
          {tab === 'topics' && <StaggerItem><TopicsTab topics={filtered} reload={load} framework={framework.id} /></StaggerItem>}
          {tab === 'iros' && <StaggerItem><IrosTab topics={filtered} iros={iros} reload={load} /></StaggerItem>}
          {tab === 'stakeholders' && <StaggerItem><StakeholdersTab topics={filtered} stakeholders={stakeholders} reload={load} /></StaggerItem>}
          {tab === 'matrix' && <StaggerItem><MatrixTab topics={filtered} onFinalize={finalize} busy={busy} /></StaggerItem>}
        </Stagger>
      )}
    </div>
  )
}

// ─── Topics tab ───────────────────────────────────────────
function TopicsTab({ topics, reload, framework }: { topics: Topic[]; reload: () => Promise<void>; framework: string }) {
  const { t: tr } = useTranslation()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Environmental')
  const [busy, setBusy] = useState(false)

  const create = async (preset?: { name: string; category: string }) => {
    const topicName = preset?.name ?? name.trim()
    const cat = preset?.category ?? category
    if (!topicName) return
    setBusy(true)
    try {
      await api('/materiality', {
        method: 'POST',
        body: JSON.stringify({
          framework_id: framework,
          topic_name: topicName,
          topic_category: cat,
          dma_status: 'identified',
        }),
      })
      setName('')
      setAdding(false)
      await reload()
    } catch (e) {
      alert(tr('materiality.errors.create', { message: e instanceof Error ? e.message : String(e) }))
    } finally { setBusy(false) }
  }

  const updateScore = async (t: Topic, patch: Partial<Topic>) => {
    setBusy(true)
    try {
      await api('/materiality', {
        method: 'POST',
        body: JSON.stringify({ id: t.id, topic_name: t.topic_name, ...patch }),
      })
      await reload()
    } catch (e) {
      alert(tr('materiality.errors.update', { message: e instanceof Error ? e.message : String(e) }))
    } finally { setBusy(false) }
  }

  const presets = CSRD_TOPIC_UNIVERSE.filter(p => !topics.some(t => t.topic_name === p.name))

  return (
    <div className="space-y-4">
      {presets.length > 0 && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-4">
          <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mb-2">{tr('materiality.universe')}</h3>
          <div className="flex flex-wrap gap-2">
            {presets.map(p => (
              <button
                key={p.name}
                disabled={busy}
                onClick={() => create({ name: p.name, category: p.category })}
                className="text-[11px] px-2.5 py-1 rounded border border-[var(--border-default)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
              >
                + {topicLabel(p.name, tr)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden">
        <header className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <h3 className="font-display text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{tr('materiality.topicsCount', { count: topics.length })}</h3>
          <button onClick={() => setAdding(s => !s)} className="text-[11px] px-2 py-1 rounded bg-[var(--color-brand)] text-white inline-flex items-center gap-1">
            <Plus className="w-3 h-3" /> {tr('materiality.customTopic')}
          </button>
        </header>
        {adding && (
          <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex gap-2">
            <input id="material-topic-name" aria-label={tr('materiality.topicName')} value={name} onChange={e => setName(e.target.value)} placeholder={tr('materiality.topicName')}
              className="flex-1 px-3 py-1.5 text-[var(--text-sm)] rounded border border-[var(--border-default)] bg-[var(--bg-primary)]" />
            <select id="material-topic-category" aria-label={tr('materiality.topicCategory')} value={category} onChange={e => setCategory(e.target.value)}
              className="px-3 py-1.5 text-[var(--text-sm)] rounded border border-[var(--border-default)] bg-[var(--bg-primary)]">
              {['Environmental','Social','Governance','Economic'].map(c => <option key={c} value={c}>{tr(`materiality.category.${c}`)}</option>)}
            </select>
            <button onClick={() => create()} disabled={busy || !name} className="px-3 py-1.5 rounded bg-[var(--color-brand)] text-white text-[var(--text-sm)] disabled:opacity-50">
              {tr('common.save')}
            </button>
          </div>
        )}
        <table className="w-full text-[var(--text-sm)]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--bg-secondary)]">
              <th className="text-left px-5 py-2 font-semibold">{tr('materiality.col.topic')}</th>
              <th className="text-left px-3 py-2 font-semibold">{tr('materiality.col.category')}</th>
              <th className="text-center px-3 py-2 font-semibold">{tr('materiality.col.impact')}</th>
              <th className="text-center px-3 py-2 font-semibold">{tr('materiality.col.financial')}</th>
              <th className="text-center px-3 py-2 font-semibold">{tr('materiality.col.likelihood')}</th>
              <th className="text-center px-3 py-2 font-semibold">{tr('materiality.col.severity')}</th>
              <th className="text-center px-3 py-2 font-semibold">{tr('materiality.col.horizon')}</th>
              <th className="text-center px-3 py-2 font-semibold">{tr('materiality.col.material')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {topics.map(t => (
              <tr key={t.id} className="hover:bg-[var(--bg-secondary)]">
                <td className="px-5 py-2.5 text-[var(--text-primary)] font-medium">{topicLabel(t.topic_name, tr)}</td>
                <td className="px-3 py-2.5 text-[var(--text-xs)] text-[var(--text-secondary)]">{t.topic_category ? tr(`materiality.category.${t.topic_category}`, { defaultValue: t.topic_category }) : '—'}</td>
                <td className="px-3 py-2.5 text-center">
                  <ScoreInput value={t.impact_score} onChange={v => updateScore(t, { impact_score: v })} label={tr('materiality.aria.impact', { topic: topicLabel(t.topic_name, tr) })} />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <ScoreInput value={t.financial_score} onChange={v => updateScore(t, { financial_score: v })} label={tr('materiality.aria.financial', { topic: topicLabel(t.topic_name, tr) })} />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <ScoreInput value={t.likelihood} onChange={v => updateScore(t, { likelihood: v })} label={tr('materiality.aria.likelihood', { topic: topicLabel(t.topic_name, tr) })} />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <ScoreInput value={t.severity} onChange={v => updateScore(t, { severity: v })} label={tr('materiality.aria.severity', { topic: topicLabel(t.topic_name, tr) })} />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <select aria-label={tr('materiality.aria.horizon', { topic: topicLabel(t.topic_name, tr) })} value={t.time_horizon ?? ''} onChange={e => updateScore(t, { time_horizon: (e.target.value || null) as Topic['time_horizon'] })}
                    className="text-[11px] px-1.5 py-0.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)]">
                    <option value="">—</option>
                    <option value="short">{tr('materiality.horizon.short')}</option>
                    <option value="medium">{tr('materiality.horizon.medium')}</option>
                    <option value="long">{tr('materiality.horizon.long')}</option>
                  </select>
                </td>
                <td className="px-3 py-2.5 text-center">
                  {t.is_material ? <Check className="w-4 h-4 text-green-500 inline" /> : <span className="text-[var(--text-tertiary)]">—</span>}
                </td>
              </tr>
            ))}
            {topics.length === 0 && (
              <tr><td colSpan={8} className="text-[var(--text-tertiary)] p-0">
                <EmptyState
                  icon={Scale}
                  title={tr('materiality.empty.title')}
                  body={tr('materiality.empty.body')}
                  density="compact"
                />
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ScoreInput({ value, onChange, label }: { value: number | null; onChange: (n: number | null) => void; label?: string }) {
  const { t } = useTranslation()
  return (
    <input
      aria-label={label ?? t('materiality.aria.score')}
      type="number"
      min={1} max={5}
      value={value ?? ''}
      onChange={e => onChange(e.target.value === '' ? null : Math.max(1, Math.min(5, Number(e.target.value))))}
      className="w-14 px-1.5 py-0.5 text-[var(--text-sm)] tabular-nums text-center rounded border border-[var(--border-default)] bg-[var(--bg-primary)]"
    />
  )
}

// ─── IROs tab ─────────────────────────────────────────────
function IrosTab({ topics, iros, reload }: { topics: Topic[]; iros: IRO[]; reload: () => Promise<void> }) {
  const { t: tr } = useTranslation()
  const [openTopic, setOpenTopic] = useState<string | null>(null)
  return (
    <div className="space-y-3">
      {topics.length === 0 && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 text-[var(--text-secondary)]">
          {tr('materiality.iros.addTopicsFirst')}
        </div>
      )}
      {topics.map(t => {
        const myIros = iros.filter(i => i.topic_id === t.id)
        const open = openTopic === t.id
        return (
          <div key={t.id} className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden">
            <button onClick={() => setOpenTopic(open ? null : t.id)} className="w-full px-5 py-3 flex items-center justify-between hover:bg-[var(--bg-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">{topicLabel(t.topic_name, tr)}</span>
              <span className="text-[11px] text-[var(--text-tertiary)]">{tr('materiality.iros.count', { count: myIros.length })}</span>
            </button>
            {open && (
              <div className="px-5 py-3 border-t border-[var(--border-subtle)] space-y-3">
                {myIros.map(i => (
                  <div key={i.id} className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-[var(--color-brand)]">{tr(`materiality.iroType.${i.type}`, { defaultValue: i.type })}</span>
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        {tr('materiality.iros.meta', { sev: i.severity ?? '—', lik: i.likelihood ?? '—', horizon: i.time_horizon ? tr(`materiality.horizon.${i.time_horizon}`, { defaultValue: i.time_horizon }) : '—' })}
                      </span>
                    </div>
                    <div className="text-[var(--text-sm)] text-[var(--text-primary)]">{i.description}</div>
                  </div>
                ))}
                <IroForm topicId={t.id} onSaved={reload} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function IroForm({ topicId, onSaved }: { topicId: string; onSaved: () => Promise<void> }) {
  const { t } = useTranslation()
  const [type, setType] = useState<'impact'|'risk'|'opportunity'>('impact')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState(3)
  const [likelihood, setLikelihood] = useState(3)
  const [horizon, setHorizon] = useState<'short'|'medium'|'long'>('medium')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!description.trim()) return
    setBusy(true)
    try {
      await api('/materiality/iro', {
        method: 'POST',
        body: JSON.stringify({ topic_id: topicId, type, description, severity, likelihood, time_horizon: horizon }),
      })
      setDescription('')
      await onSaved()
    } catch (e) {
      alert(t('materiality.errors.iroSave', { message: e instanceof Error ? e.message : String(e) }))
    } finally { setBusy(false) }
  }

  return (
    <div className="grid grid-cols-12 gap-2 items-end">
      <select aria-label={t('materiality.iros.typeAria')} value={type} onChange={e => setType(e.target.value as 'impact'|'risk'|'opportunity')}
        className="col-span-2 px-2 py-1.5 text-[var(--text-sm)] rounded border border-[var(--border-default)] bg-[var(--bg-primary)]">
        <option value="impact">{t('materiality.iroType.impact')}</option>
        <option value="risk">{t('materiality.iroType.risk')}</option>
        <option value="opportunity">{t('materiality.iroType.opportunity')}</option>
      </select>
      <input aria-label={t('materiality.iros.descAria')} value={description} onChange={e => setDescription(e.target.value)} placeholder={t('materiality.iros.description')}
        className="col-span-5 px-2 py-1.5 text-[var(--text-sm)] rounded border border-[var(--border-default)] bg-[var(--bg-primary)]" />
      <input aria-label={t('materiality.col.severity')} type="number" min={1} max={5} value={severity} onChange={e => setSeverity(Number(e.target.value))} placeholder={t('materiality.iros.sev')}
        className="col-span-1 px-2 py-1.5 text-[var(--text-sm)] tabular-nums text-center rounded border border-[var(--border-default)] bg-[var(--bg-primary)]" />
      <input aria-label={t('materiality.col.likelihood')} type="number" min={1} max={5} value={likelihood} onChange={e => setLikelihood(Number(e.target.value))} placeholder={t('materiality.iros.lik')}
        className="col-span-1 px-2 py-1.5 text-[var(--text-sm)] tabular-nums text-center rounded border border-[var(--border-default)] bg-[var(--bg-primary)]" />
      <select aria-label={t('materiality.iros.horizonAria')} value={horizon} onChange={e => setHorizon(e.target.value as 'short'|'medium'|'long')}
        className="col-span-2 px-2 py-1.5 text-[var(--text-sm)] rounded border border-[var(--border-default)] bg-[var(--bg-primary)]">
        <option value="short">{t('materiality.horizon.short')}</option>
        <option value="medium">{t('materiality.horizon.medium')}</option>
        <option value="long">{t('materiality.horizon.long')}</option>
      </select>
      <button onClick={submit} disabled={busy || !description.trim()} className="col-span-1 px-2 py-1.5 rounded bg-[var(--color-brand)] text-white text-[var(--text-sm)] disabled:opacity-50">
        {t('materiality.iros.add')}
      </button>
    </div>
  )
}

// ─── Stakeholders tab ─────────────────────────────────────
function StakeholdersTab({ topics, stakeholders, reload }: { topics: Topic[]; stakeholders: Stakeholder[]; reload: () => Promise<void> }) {
  const { t: tr } = useTranslation()
  const [busy, setBusy] = useState(false)

  const setRating = async (topicId: string, group: string, rating: number) => {
    setBusy(true)
    try {
      await api('/materiality/stakeholder', {
        method: 'POST',
        body: JSON.stringify({ topic_id: topicId, stakeholder_group: group, concern_rating: rating }),
      })
      await reload()
    } catch (e) {
      alert(tr('materiality.errors.save', { message: e instanceof Error ? e.message : String(e) }))
    } finally { setBusy(false) }
  }

  const latestFor = (topicId: string, group: string): number | null => {
    const matching = stakeholders.filter(s => s.topic_id === topicId && s.stakeholder_group === group)
    if (matching.length === 0) return null
    return matching[0].concern_rating
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-x-auto">
      <table className="w-full text-[var(--text-sm)]">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--bg-secondary)]">
            <th className="text-left px-5 py-2 font-semibold">{tr('materiality.col.topic')}</th>
            {STAKEHOLDERS.map(s => (
              <th key={s} className="text-center px-3 py-2 font-semibold">{tr(`materiality.stakeholders.${s}`)}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {topics.map(t => (
            <tr key={t.id} className="hover:bg-[var(--bg-secondary)]">
              <td className="px-5 py-2 text-[var(--text-primary)] font-medium">{topicLabel(t.topic_name, tr)}</td>
              {STAKEHOLDERS.map(g => {
                const current = latestFor(t.id, g)
                return (
                  <td key={g} className="px-3 py-2 text-center">
                    <select
                      value={current ?? ''}
                      disabled={busy}
                      onChange={e => {
                        const v = e.target.value
                        if (v === '') return
                        void setRating(t.id, g, Number(v))
                      }}
                      className="w-14 px-1 py-0.5 text-[var(--text-sm)] tabular-nums text-center rounded border border-[var(--border-default)] bg-[var(--bg-primary)]"
                    >
                      <option value="">—</option>
                      {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </td>
                )
              })}
            </tr>
          ))}
          {topics.length === 0 && (
            <tr><td colSpan={STAKEHOLDERS.length + 1} className="text-center py-6 text-[var(--text-tertiary)]">{tr('materiality.noTopicsToRate')}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Matrix tab ───────────────────────────────────────────
function MatrixTab({ topics, onFinalize, busy }: { topics: Topic[]; onFinalize: () => Promise<void>; busy: boolean }) {
  const { t: tr } = useTranslation()
  const threshold = topics[0]?.threshold ?? 3.0
  const points = topics
    .filter(t => t.impact_score != null && t.financial_score != null)
    .map(t => ({
      name: topicLabel(t.topic_name, tr),
      x: Number(t.financial_score),
      y: Number(t.impact_score),
      material: t.is_material,
    }))

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{tr('materiality.matrix.title')}</h3>
            <p className="text-[var(--text-xs)] text-[var(--text-secondary)]">{tr('materiality.matrix.thresholdPrefix')}<strong>{Number(threshold).toFixed(1)}</strong>{tr('materiality.matrix.thresholdSuffix')}</p>
          </div>
          <button onClick={onFinalize} disabled={busy} className="px-3 py-1.5 rounded bg-[var(--color-brand)] text-white text-[var(--text-sm)] font-semibold disabled:opacity-50 inline-flex items-center gap-1.5">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {tr('materiality.matrix.finalize')}
          </button>
        </div>

        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" domain={[0, 5]} name={tr('materiality.matrix.financial')} label={{ value: tr('materiality.matrix.financialAxis'), position: 'bottom', offset: 0 }} />
              <YAxis type="number" dataKey="y" domain={[0, 5]} name={tr('materiality.matrix.impact')} label={{ value: tr('materiality.matrix.impactAxis'), angle: -90, position: 'insideLeft' }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#1A1D25', border: '1px solid #2A2F3A', borderRadius: 8, color: '#E2E8F0', fontSize: 12 }} />
              <ReferenceLine x={Number(threshold)} stroke="#FF6B1A" strokeDasharray="3 3" label={{ value: `x=${Number(threshold).toFixed(1)}`, fill: '#FF6B1A', position: 'top' }} />
              <ReferenceLine y={Number(threshold)} stroke="#FF6B1A" strokeDasharray="3 3" label={{ value: `y=${Number(threshold).toFixed(1)}`, fill: '#FF6B1A', position: 'right' }} />
              <Scatter data={points} fill="#3B82F6">
                <LabelList dataKey="name" position="top" style={{ fontSize: 10, fill: '#9CA3AF' }} />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden">
        <header className="px-5 py-3 border-b border-[var(--border-subtle)]">
          <h3 className="font-display text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{tr('materiality.matrix.verdict')}</h3>
        </header>
        <table className="w-full text-[var(--text-sm)]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--bg-secondary)]">
              <th className="text-left px-5 py-2 font-semibold">{tr('materiality.col.topic')}</th>
              <th className="text-center px-3 py-2 font-semibold">{tr('materiality.col.impact')}</th>
              <th className="text-center px-3 py-2 font-semibold">{tr('materiality.col.financial')}</th>
              <th className="text-center px-3 py-2 font-semibold">{tr('materiality.matrix.verdict')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {topics.map(t => (
              <tr key={t.id}>
                <td className="px-5 py-2 text-[var(--text-primary)] font-medium">{topicLabel(t.topic_name, tr)}</td>
                <td className="px-3 py-2 text-center tabular-nums">{t.impact_score ?? '—'}</td>
                <td className="px-3 py-2 text-center tabular-nums">{t.financial_score ?? '—'}</td>
                <td className="px-3 py-2 text-center">
                  {t.is_material ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-green-500"><Check className="w-3 h-3" /> {tr('materiality.matrix.material')}</span>
                  ) : t.dma_status === 'not_material' ? (
                    <span className="text-[11px] text-[var(--text-tertiary)]">{tr('materiality.matrix.notMaterial')}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-500"><AlertTriangle className="w-3 h-3" /> {tr('materiality.matrix.pending')}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
