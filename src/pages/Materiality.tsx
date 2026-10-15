import { useEffect, useMemo, useState } from 'react'
import { Scale, Plus, Loader2, Save, Check, AlertTriangle } from 'lucide-react'
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
      setToast(`Load failed: ${e instanceof Error ? e.message : e}`)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [])

  const filtered = useMemo(
    () => topics.filter(t => !t.framework_id || t.framework_id === framework.id),
    [topics, framework.id],
  )

  const finalize = async () => {
    setBusy(true)
    try {
      await api('/materiality/finalize', { method: 'POST', body: '{}' })
      setToast('Materiality verdict finalized.')
      await load()
    } catch (e) {
      setToast(`Finalize failed: ${e instanceof Error ? e.message : e}`)
    } finally { setBusy(false) }
  }

  return (
    <div className="page-container animate-fade-in">
      <PageHeader
        breadcrumbs={[
          { label: 'Strategy' },
          { label: 'Materiality' },
        ]}
        eyebrow="Double Materiality Assessment"
        title="Materiality assessment"
        description={
          <>
            Identify topics, capture stakeholder concern, score financial materiality (likelihood × severity),
            and finalize the matrix — material topics flow into report scope.
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
            {k === 'topics' && 'Topics'}
            {k === 'iros' && 'IROs'}
            {k === 'stakeholders' && 'Stakeholders'}
            {k === 'matrix' && 'Matrix'}
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
      alert(`Create failed: ${e instanceof Error ? e.message : e}`)
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
      alert(`Update failed: ${e instanceof Error ? e.message : e}`)
    } finally { setBusy(false) }
  }

  const presets = CSRD_TOPIC_UNIVERSE.filter(p => !topics.some(t => t.topic_name === p.name))

  return (
    <div className="space-y-4">
      {presets.length > 0 && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-4">
          <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mb-2">CSRD topic universe — add to scope</h3>
          <div className="flex flex-wrap gap-2">
            {presets.map(p => (
              <button
                key={p.name}
                disabled={busy}
                onClick={() => create({ name: p.name, category: p.category })}
                className="text-[11px] px-2.5 py-1 rounded border border-[var(--border-default)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
              >
                + {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden">
        <header className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <h3 className="font-display text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">Topics ({topics.length})</h3>
          <button onClick={() => setAdding(s => !s)} className="text-[11px] px-2 py-1 rounded bg-[var(--color-brand)] text-white inline-flex items-center gap-1">
            <Plus className="w-3 h-3" /> Custom topic
          </button>
        </header>
        {adding && (
          <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex gap-2">
            <input id="material-topic-name" aria-label="Topic name" value={name} onChange={e => setName(e.target.value)} placeholder="Topic name"
              className="flex-1 px-3 py-1.5 text-[var(--text-sm)] rounded border border-[var(--border-default)] bg-[var(--bg-primary)]" />
            <select id="material-topic-category" aria-label="Topic category" value={category} onChange={e => setCategory(e.target.value)}
              className="px-3 py-1.5 text-[var(--text-sm)] rounded border border-[var(--border-default)] bg-[var(--bg-primary)]">
              {['Environmental','Social','Governance','Economic'].map(c => <option key={c}>{c}</option>)}
            </select>
            <button onClick={() => create()} disabled={busy || !name} className="px-3 py-1.5 rounded bg-[var(--color-brand)] text-white text-[var(--text-sm)] disabled:opacity-50">
              Save
            </button>
          </div>
        )}
        <table className="w-full text-[var(--text-sm)]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--bg-secondary)]">
              <th className="text-left px-5 py-2 font-semibold">Topic</th>
              <th className="text-left px-3 py-2 font-semibold">Category</th>
              <th className="text-center px-3 py-2 font-semibold">Impact</th>
              <th className="text-center px-3 py-2 font-semibold">Financial</th>
              <th className="text-center px-3 py-2 font-semibold">Likelihood</th>
              <th className="text-center px-3 py-2 font-semibold">Severity</th>
              <th className="text-center px-3 py-2 font-semibold">Horizon</th>
              <th className="text-center px-3 py-2 font-semibold">Material</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {topics.map(t => (
              <tr key={t.id} className="hover:bg-[var(--bg-secondary)]">
                <td className="px-5 py-2.5 text-[var(--text-primary)] font-medium">{t.topic_name}</td>
                <td className="px-3 py-2.5 text-[var(--text-xs)] text-[var(--text-secondary)]">{t.topic_category ?? '—'}</td>
                <td className="px-3 py-2.5 text-center">
                  <ScoreInput value={t.impact_score} onChange={v => updateScore(t, { impact_score: v })} label={`Impact score for ${t.topic_name}`} />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <ScoreInput value={t.financial_score} onChange={v => updateScore(t, { financial_score: v })} label={`Financial score for ${t.topic_name}`} />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <ScoreInput value={t.likelihood} onChange={v => updateScore(t, { likelihood: v })} label={`Likelihood for ${t.topic_name}`} />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <ScoreInput value={t.severity} onChange={v => updateScore(t, { severity: v })} label={`Severity for ${t.topic_name}`} />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <select aria-label={`Time horizon for ${t.topic_name}`} value={t.time_horizon ?? ''} onChange={e => updateScore(t, { time_horizon: (e.target.value || null) as Topic['time_horizon'] })}
                    className="text-[11px] px-1.5 py-0.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)]">
                    <option value="">—</option>
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
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
                  title="No material topics yet"
                  body="Pick from the CSRD topic universe above or add a custom topic to start your double-materiality assessment."
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
  return (
    <input
      aria-label={label ?? 'Score (1 to 5)'}
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
  const [openTopic, setOpenTopic] = useState<string | null>(null)
  return (
    <div className="space-y-3">
      {topics.length === 0 && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 text-[var(--text-secondary)]">
          Add topics on the Topics tab first.
        </div>
      )}
      {topics.map(t => {
        const myIros = iros.filter(i => i.topic_id === t.id)
        const open = openTopic === t.id
        return (
          <div key={t.id} className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden">
            <button onClick={() => setOpenTopic(open ? null : t.id)} className="w-full px-5 py-3 flex items-center justify-between hover:bg-[var(--bg-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">{t.topic_name}</span>
              <span className="text-[11px] text-[var(--text-tertiary)]">{myIros.length} IRO{myIros.length === 1 ? '' : 's'}</span>
            </button>
            {open && (
              <div className="px-5 py-3 border-t border-[var(--border-subtle)] space-y-3">
                {myIros.map(i => (
                  <div key={i.id} className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-[var(--color-brand)]">{i.type}</span>
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        sev {i.severity ?? '—'} · lik {i.likelihood ?? '—'} · {i.time_horizon ?? '—'}
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
      alert(`IRO save failed: ${e instanceof Error ? e.message : e}`)
    } finally { setBusy(false) }
  }

  return (
    <div className="grid grid-cols-12 gap-2 items-end">
      <select aria-label="IRO type" value={type} onChange={e => setType(e.target.value as 'impact'|'risk'|'opportunity')}
        className="col-span-2 px-2 py-1.5 text-[var(--text-sm)] rounded border border-[var(--border-default)] bg-[var(--bg-primary)]">
        <option value="impact">Impact</option>
        <option value="risk">Risk</option>
        <option value="opportunity">Opportunity</option>
      </select>
      <input aria-label="IRO description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description"
        className="col-span-5 px-2 py-1.5 text-[var(--text-sm)] rounded border border-[var(--border-default)] bg-[var(--bg-primary)]" />
      <input aria-label="Severity" type="number" min={1} max={5} value={severity} onChange={e => setSeverity(Number(e.target.value))} placeholder="Sev"
        className="col-span-1 px-2 py-1.5 text-[var(--text-sm)] tabular-nums text-center rounded border border-[var(--border-default)] bg-[var(--bg-primary)]" />
      <input aria-label="Likelihood" type="number" min={1} max={5} value={likelihood} onChange={e => setLikelihood(Number(e.target.value))} placeholder="Lik"
        className="col-span-1 px-2 py-1.5 text-[var(--text-sm)] tabular-nums text-center rounded border border-[var(--border-default)] bg-[var(--bg-primary)]" />
      <select aria-label="Time horizon" value={horizon} onChange={e => setHorizon(e.target.value as 'short'|'medium'|'long')}
        className="col-span-2 px-2 py-1.5 text-[var(--text-sm)] rounded border border-[var(--border-default)] bg-[var(--bg-primary)]">
        <option value="short">Short</option>
        <option value="medium">Medium</option>
        <option value="long">Long</option>
      </select>
      <button onClick={submit} disabled={busy || !description.trim()} className="col-span-1 px-2 py-1.5 rounded bg-[var(--color-brand)] text-white text-[var(--text-sm)] disabled:opacity-50">
        Add
      </button>
    </div>
  )
}

// ─── Stakeholders tab ─────────────────────────────────────
function StakeholdersTab({ topics, stakeholders, reload }: { topics: Topic[]; stakeholders: Stakeholder[]; reload: () => Promise<void> }) {
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
      alert(`Save failed: ${e instanceof Error ? e.message : e}`)
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
            <th className="text-left px-5 py-2 font-semibold">Topic</th>
            {STAKEHOLDERS.map(s => (
              <th key={s} className="text-center px-3 py-2 font-semibold">{s.replace('_', ' ')}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {topics.map(t => (
            <tr key={t.id} className="hover:bg-[var(--bg-secondary)]">
              <td className="px-5 py-2 text-[var(--text-primary)] font-medium">{t.topic_name}</td>
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
            <tr><td colSpan={STAKEHOLDERS.length + 1} className="text-center py-6 text-[var(--text-tertiary)]">No topics to rate.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Matrix tab ───────────────────────────────────────────
function MatrixTab({ topics, onFinalize, busy }: { topics: Topic[]; onFinalize: () => Promise<void>; busy: boolean }) {
  const threshold = topics[0]?.threshold ?? 3.0
  const points = topics
    .filter(t => t.impact_score != null && t.financial_score != null)
    .map(t => ({
      name: t.topic_name,
      x: Number(t.financial_score),
      y: Number(t.impact_score),
      material: t.is_material,
    }))

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">Double materiality matrix</h3>
            <p className="text-[var(--text-xs)] text-[var(--text-secondary)]">Threshold: <strong>{Number(threshold).toFixed(1)}</strong> on either axis = material.</p>
          </div>
          <button onClick={onFinalize} disabled={busy} className="px-3 py-1.5 rounded bg-[var(--color-brand)] text-white text-[var(--text-sm)] font-semibold disabled:opacity-50 inline-flex items-center gap-1.5">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Finalize materiality
          </button>
        </div>

        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" domain={[0, 5]} name="Financial materiality" label={{ value: 'Financial materiality →', position: 'bottom', offset: 0 }} />
              <YAxis type="number" dataKey="y" domain={[0, 5]} name="Impact materiality" label={{ value: '↑ Impact materiality', angle: -90, position: 'insideLeft' }} />
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
          <h3 className="font-display text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">Verdict</h3>
        </header>
        <table className="w-full text-[var(--text-sm)]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--bg-secondary)]">
              <th className="text-left px-5 py-2 font-semibold">Topic</th>
              <th className="text-center px-3 py-2 font-semibold">Impact</th>
              <th className="text-center px-3 py-2 font-semibold">Financial</th>
              <th className="text-center px-3 py-2 font-semibold">Verdict</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {topics.map(t => (
              <tr key={t.id}>
                <td className="px-5 py-2 text-[var(--text-primary)] font-medium">{t.topic_name}</td>
                <td className="px-3 py-2 text-center tabular-nums">{t.impact_score ?? '—'}</td>
                <td className="px-3 py-2 text-center tabular-nums">{t.financial_score ?? '—'}</td>
                <td className="px-3 py-2 text-center">
                  {t.is_material ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-green-500"><Check className="w-3 h-3" /> Material</span>
                  ) : t.dma_status === 'not_material' ? (
                    <span className="text-[11px] text-[var(--text-tertiary)]">Not material</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-500"><AlertTriangle className="w-3 h-3" /> Pending finalize</span>
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
