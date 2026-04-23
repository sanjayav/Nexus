import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Scale, Plus, Loader2, X, Save } from 'lucide-react'
import { orgStore, type MaterialTopic } from '../lib/orgStore'
import { useFramework } from '../lib/frameworks'
import { FrameworkBadge } from '../components/FrameworkBadge'
import JourneyBar from '../components/JourneyBar'
import { riseIn, popIn, SPRING } from '../components/motion'

const CATEGORIES = ['Environmental', 'Social', 'Governance', 'Economic'] as const
const STATUSES: MaterialTopic['dma_status'][] = ['identified', 'assessed', 'material', 'not_material', 'pending_review']

/**
 * Materiality Assessment — where the org decides which topics are *material*
 * and therefore in scope for reporting. GRI 3 for Phase 1; same UI scales to
 * CSRD's Double Materiality Assessment later (impact + financial axes).
 */
export default function Materiality() {
  const { active: framework } = useFramework()
  const [topics, setTopics] = useState<MaterialTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<MaterialTopic | 'new' | null>(null)

  const load = async () => {
    try {
      setTopics(await orgStore.listMaterialTopics())
    } catch { /* silent */ }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => topics.filter(t => t.framework_id === framework.id), [topics, framework.id])
  const material = filtered.filter(t => t.dma_status === 'material')
  const assessed = filtered.filter(t => t.dma_status === 'assessed')
  const pending = filtered.filter(t => t.dma_status === 'pending_review' || t.dma_status === 'identified')
  const notMaterial = filtered.filter(t => t.dma_status === 'not_material')

  return (
    <div className="animate-fade-in">
      <div className="mb-4"><JourneyBar variant="compact" /></div>

      <motion.header {...riseIn(0)} className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--color-brand)]">
            <Scale className="w-3 h-3" /> Materiality assessment · GRI 3
          </div>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="font-display text-[28px] font-bold text-[var(--text-primary)]">Decide what matters</h1>
            <FrameworkBadge size="md" />
          </div>
          <p className="text-[var(--text-sm)] text-[var(--text-secondary)] mt-1 max-w-2xl">
            Score every topic on impact (the outside-in: how the org affects environment/society) and financial
            (the inside-out: how the topic affects the org). Only <strong>material</strong> topics flow into report scope.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          onClick={() => setEditing('new')}
          className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-xs)] font-semibold hover:bg-[var(--color-brand-strong)] inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Add topic
        </motion.button>
      </motion.header>

      <motion.section {...riseIn(1)} className="grid grid-cols-4 gap-3 mb-5">
        <Stat label="Material"     value={material.length}    tone="ok" />
        <Stat label="Assessed"     value={assessed.length}    tone="pending" />
        <Stat label="Pending"      value={pending.length}     tone="draft" />
        <Stat label="Not material" value={notMaterial.length} tone="neutral" />
      </motion.section>

      <motion.section {...popIn(2)} className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 mb-4">
        <h3 className="font-display text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mb-3">Materiality matrix</h3>
        <div className="relative h-[320px] rounded bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] border border-[var(--border-subtle)] overflow-hidden">
          <div className="absolute top-2 left-3 text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold">Impact materiality ↑</div>
          <div className="absolute bottom-2 right-3 text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold">Financial materiality →</div>
          <span className="absolute top-0 bottom-0 left-1/2 w-px bg-[var(--border-subtle)]" />
          <span className="absolute left-0 right-0 top-1/2 h-px bg-[var(--border-subtle)]" />
          <span aria-hidden className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-br from-[var(--color-brand-soft)]/0 via-transparent to-[var(--color-brand-soft)]/40" />
          {filtered.filter(t => t.impact_score != null && t.financial_score != null).map((t, i) => {
            const x = ((t.financial_score! - 1) / 4) * 88 + 6
            const y = 94 - ((t.impact_score! - 1) / 4) * 88
            const color = t.dma_status === 'material' ? 'var(--color-brand)'
              : t.dma_status === 'not_material' ? 'var(--text-tertiary)'
              : 'var(--status-pending)'
            return (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: t.dma_status === 'not_material' ? 0.4 : 1, scale: 1 }}
                transition={{ ...SPRING, delay: 0.15 + i * 0.03 }}
                whileHover={{ scale: 1.5, zIndex: 10 }}
                onClick={() => setEditing(t)}
                className="absolute rounded-full border-2 border-white shadow-sm cursor-pointer"
                style={{
                  left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)',
                  width: t.dma_status === 'material' ? 16 : 12,
                  height: t.dma_status === 'material' ? 16 : 12,
                  background: color,
                }}
                title={`${t.topic_name} · I:${t.impact_score} F:${t.financial_score}`}
              />
            )
          })}
        </div>
      </motion.section>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden">
        <header className="px-5 py-3 border-b border-[var(--border-subtle)]">
          <h3 className="font-display text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">All topics ({filtered.length})</h3>
        </header>
        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[var(--color-brand)]" /></div>
        ) : (
          <table className="w-full text-[var(--text-sm)]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--bg-secondary)]">
                <th className="text-left px-5 py-2 font-semibold">Topic</th>
                <th className="text-left px-3 py-2 font-semibold">Category</th>
                <th className="text-center px-3 py-2 font-semibold">Impact</th>
                <th className="text-center px-3 py-2 font-semibold">Financial</th>
                <th className="text-left px-3 py-2 font-semibold">Status</th>
                <th className="text-left px-3 py-2 font-semibold">Linked GRI codes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.map(t => (
                <tr key={t.id} onClick={() => setEditing(t)} className="hover:bg-[var(--bg-secondary)] cursor-pointer">
                  <td className="px-5 py-2.5 text-[var(--text-primary)] font-medium">{t.topic_name}</td>
                  <td className="px-3 py-2.5 text-[var(--text-xs)] text-[var(--text-secondary)]">{t.topic_category ?? '—'}</td>
                  <td className="px-3 py-2.5 text-center text-[var(--text-xs)] font-bold tabular-nums">{t.impact_score ?? '—'}</td>
                  <td className="px-3 py-2.5 text-center text-[var(--text-xs)] font-bold tabular-nums">{t.financial_score ?? '—'}</td>
                  <td className="px-3 py-2.5"><StatusPill status={t.dma_status} /></td>
                  <td className="px-3 py-2.5 text-[10px] font-mono text-[var(--text-tertiary)] max-w-[260px] truncate">
                    {(t.linked_gri_codes ?? []).join(', ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <EditDrawer
          topic={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { await load(); setEditing(null) }}
        />
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'ok' | 'pending' | 'draft' | 'neutral' }) {
  const bg = tone === 'ok' ? 'var(--accent-green-light)' : tone === 'pending' ? 'var(--accent-blue-light)' : tone === 'draft' ? 'var(--accent-amber-light)' : 'var(--bg-secondary)'
  const fg = tone === 'ok' ? 'var(--status-ok)' : tone === 'pending' ? 'var(--status-pending)' : tone === 'draft' ? 'var(--status-draft)' : 'var(--text-secondary)'
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] p-4" style={{ background: bg }}>
      <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: fg, opacity: 0.8 }}>{label}</div>
      <div className="text-[24px] font-bold tabular-nums mt-0.5" style={{ color: fg }}>{value}</div>
    </div>
  )
}

function StatusPill({ status }: { status: MaterialTopic['dma_status'] }) {
  const map: Record<MaterialTopic['dma_status'], { label: string; bg: string; fg: string }> = {
    identified:     { label: 'Identified',     bg: 'var(--bg-tertiary)',       fg: 'var(--text-tertiary)' },
    pending_review: { label: 'Pending review', bg: 'var(--accent-amber-light)', fg: 'var(--status-draft)' },
    assessed:       { label: 'Assessed',       bg: 'var(--accent-blue-light)',  fg: 'var(--status-pending)' },
    material:       { label: 'Material',       bg: 'var(--accent-green-light)', fg: 'var(--status-ok)' },
    not_material:   { label: 'Not material',   bg: 'var(--bg-secondary)',       fg: 'var(--text-tertiary)' },
  }
  const m = map[status]
  return <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider" style={{ background: m.bg, color: m.fg }}>{m.label}</span>
}

function EditDrawer({ topic, onClose, onSaved }: {
  topic: MaterialTopic | null
  onClose: () => void
  onSaved: () => void
}) {
  const { active: framework } = useFramework()
  const [form, setForm] = useState<Partial<MaterialTopic>>({
    topic_name: topic?.topic_name ?? '',
    topic_category: topic?.topic_category ?? 'Environmental',
    impact_score: topic?.impact_score ?? 3,
    financial_score: topic?.financial_score ?? 3,
    dma_status: topic?.dma_status ?? 'identified',
    linked_gri_codes: topic?.linked_gri_codes ?? [],
    rationale: topic?.rationale ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [codesText, setCodesText] = useState((topic?.linked_gri_codes ?? []).join(', '))

  const save = async () => {
    if (!form.topic_name) return
    setBusy(true)
    try {
      await orgStore.upsertMaterialTopic({
        ...(topic ? { id: topic.id } : {}),
        framework_id: framework.id,
        topic_name: form.topic_name!,
        topic_category: form.topic_category ?? null,
        impact_score: form.impact_score ?? null,
        financial_score: form.financial_score ?? null,
        dma_status: form.dma_status,
        rationale: form.rationale ?? null,
        linked_gri_codes: codesText.split(',').map(s => s.trim()).filter(Boolean),
      })
      await onSaved()
    } catch (e) {
      alert(`Save failed: ${e instanceof Error ? e.message : e}`)
    }
    setBusy(false)
  }

  const remove = async () => {
    if (!topic || !confirm(`Remove "${topic.topic_name}"?`)) return
    setBusy(true)
    try {
      await orgStore.removeMaterialTopic(topic.id)
      await onSaved()
    } catch (e) {
      alert(`Remove failed: ${e instanceof Error ? e.message : e}`)
    }
    setBusy(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <motion.div initial={{ x: 480 }} animate={{ x: 0 }} transition={SPRING} className="w-[480px] h-full bg-[var(--bg-primary)] shadow-2xl p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-[var(--text-xl)] font-bold">{topic ? 'Edit topic' : 'New material topic'}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-tertiary)] flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Topic name">
            <input value={form.topic_name ?? ''} onChange={e => setForm(f => ({ ...f, topic_name: e.target.value }))}
              className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]" />
          </Field>
          <Field label="Category">
            <select value={form.topic_category ?? ''} onChange={e => setForm(f => ({ ...f, topic_category: e.target.value }))}
              className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Impact score (${form.impact_score})`}>
              <input type="range" min={1} max={5} value={form.impact_score ?? 3} onChange={e => setForm(f => ({ ...f, impact_score: Number(e.target.value) }))} className="w-full" />
            </Field>
            <Field label={`Financial score (${form.financial_score})`}>
              <input type="range" min={1} max={5} value={form.financial_score ?? 3} onChange={e => setForm(f => ({ ...f, financial_score: Number(e.target.value) }))} className="w-full" />
            </Field>
          </div>
          <Field label="DMA status">
            <select value={form.dma_status ?? 'identified'} onChange={e => setForm(f => ({ ...f, dma_status: e.target.value as MaterialTopic['dma_status'] }))}
              className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]">
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </Field>
          <Field label="Linked GRI codes (comma-separated)">
            <input value={codesText} onChange={e => setCodesText(e.target.value)} placeholder="e.g. 305-1, 305-2, 305-4"
              className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-xs)] font-mono" />
          </Field>
          <Field label="Rationale (why material?)">
            <textarea value={form.rationale ?? ''} onChange={e => setForm(f => ({ ...f, rationale: e.target.value }))} rows={3}
              placeholder="Describe the impact / financial rationale for this score."
              className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-xs)] resize-none" />
          </Field>
        </div>

        <div className="flex gap-2 mt-6 pt-4 border-t border-[var(--border-subtle)]">
          <button onClick={save} disabled={busy || !form.topic_name} className="flex-1 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-sm)] font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
            <Save className="w-3.5 h-3.5" /> Save
          </button>
          {topic && (
            <button onClick={remove} disabled={busy} className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--status-reject)]/30 text-[var(--status-reject)] text-[var(--text-sm)] font-semibold hover:bg-[var(--accent-red-light)] disabled:opacity-50">
              Remove
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">{label}</span>
      {children}
    </label>
  )
}
