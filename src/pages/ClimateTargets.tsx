import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Target as TargetIcon, Plus, Pencil, Trash2, X, AlertTriangle, CheckCircle2, Info,
  ShieldCheck, Sparkles,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Button from '../design-system/components/Button'
import { Card, Badge } from '../design-system'
import { orgStore, type OrgTarget } from '../lib/orgStore'
import { useFramework } from '../lib/frameworks'
import JargonTooltip from '../components/JargonTooltip'

type TargetKind = OrgTarget['kind']
type TargetStatus = OrgTarget['status']

const KIND_META: Record<TargetKind, { label: string; helper: string; accent: string }> = {
  sbti_near_term: { label: 'SBTi near-term',  helper: '5–10 year reduction target validated by Science Based Targets initiative.', accent: '#1B6B7B' },
  sbti_long_term: { label: 'SBTi long-term',  helper: '15+ year decarbonisation pathway aligned to 1.5°C.',                          accent: '#3B8A9B' },
  net_zero:       { label: 'Net-zero',        helper: 'A long-horizon (typically 2040–2050) commitment to zero net emissions.',     accent: '#2E7D32' },
  custom:         { label: 'Custom target',   helper: 'Internal commitment that doesn\'t map to SBTi or net-zero categories.',      accent: '#7C5FB8' },
}

const STATUS_META: Record<TargetStatus, { label: string; badge: 'teal' | 'blue' | 'green' | 'amber' | 'red' | 'gray' }> = {
  committed: { label: 'Committed',  badge: 'amber' },
  validated: { label: 'Validated',  badge: 'green' },
  achieved:  { label: 'Achieved',   badge: 'green' },
  missed:    { label: 'Missed',     badge: 'red' },
}

const SCOPE_OPTIONS = ['Scope 1', 'Scope 1+2', 'Scope 1+2+3', 'Scope 3 only']

export default function ClimateTargets() {
  const { active: framework } = useFramework()
  const [targets, setTargets] = useState<OrgTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<OrgTarget | 'new' | null>(null)
  const [deleting, setDeleting] = useState<OrgTarget | null>(null)
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const showToast = (kind: 'ok' | 'err', msg: string) => {
    setToast({ kind, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const t = await orgStore.listTargets()
      setTargets(t)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load targets')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const grouped = useMemo(() => {
    const out: Record<TargetKind, OrgTarget[]> = {
      sbti_near_term: [], sbti_long_term: [], net_zero: [], custom: [],
    }
    for (const t of targets) out[t.kind].push(t)
    return out
  }, [targets])

  async function saveTarget(input: TargetForm, id?: string) {
    try {
      await orgStore.upsertTarget({
        ...(id ? { id } : {}),
        framework_id: framework.id,
        kind: input.kind,
        label: input.label.trim(),
        scope_coverage: input.scope_coverage,
        baseline_year: input.baseline_year,
        baseline_value: input.baseline_value,
        baseline_unit: input.baseline_unit,
        target_year: input.target_year,
        target_reduction_pct: input.target_reduction_pct,
        status: input.status,
        notes: input.notes || null,
      })
      showToast('ok', id ? 'Target updated' : 'Target created')
      setEditing(null)
      load()
    } catch (e) {
      showToast('err', e instanceof Error ? e.message : 'Save failed')
    }
  }

  async function removeTarget(t: OrgTarget) {
    try {
      await orgStore.removeTarget(t.id)
      showToast('ok', `${t.label} removed`)
      setDeleting(null)
      load()
    } catch (e) {
      showToast('err', e instanceof Error ? e.message : 'Remove failed')
    }
  }

  return (
    <div className="space-y-6">
      {toast && <Toast kind={toast.kind} msg={toast.msg} onClose={() => setToast(null)} />}

      <PageHeader
        eyebrow="Strategy"
        title="Climate targets"
        subtitle={(
          <>
            Set the decarbonisation goals this workspace reports against. Validated targets feed the dashboard{' '}
            <JargonTooltip term="SBTi">Science Based Targets initiative — global standard for setting climate targets that align with the latest climate science (1.5°C / well-below 2°C). Validated targets are independently reviewed by SBTi.</JargonTooltip>
            {' '}tracker and the GRI 305-5 disclosure.
          </>
        )}
        actions={
          <Button variant="brand" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setEditing('new')}>
            Add target
          </Button>
        }
      />

      {loading && <Skeleton />}

      {error && (
        <Card>
          <div className="flex items-start gap-3 py-4">
            <AlertTriangle className="w-5 h-5 text-[var(--status-reject)] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-[14px] font-semibold text-[var(--text-primary)]">Couldn't load targets</div>
              <div className="text-[12px] text-[var(--text-secondary)] mt-1">{error}</div>
              <button onClick={load} className="text-[12px] font-semibold text-[var(--color-brand)] hover:underline mt-2 cursor-pointer">Try again</button>
            </div>
          </div>
        </Card>
      )}

      {!loading && !error && targets.length === 0 && (
        <Empty onAdd={() => setEditing('new')} />
      )}

      {!loading && !error && targets.length > 0 && (
        <div className="space-y-6">
          {(Object.keys(KIND_META) as TargetKind[]).map(kind => {
            const list = grouped[kind]
            if (list.length === 0) return null
            const meta = KIND_META[kind]
            return (
              <section key={kind}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-5 rounded-full" style={{ background: meta.accent }} />
                  <div className="flex-1">
                    <h2 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">{meta.label}</h2>
                    <p className="text-[11.5px] text-[var(--text-tertiary)] leading-relaxed">{meta.helper}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {list.map(t => (
                    <TargetCard
                      key={t.id}
                      target={t}
                      onEdit={() => setEditing(t)}
                      onRemove={() => setDeleting(t)}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* Helper: what makes a "good" target */}
      <Card>
        <div className="flex items-start gap-3 py-2">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1 text-[12.5px] text-[var(--text-secondary)] leading-relaxed">
            <strong className="text-[var(--text-primary)]">Tip — what auditors look for:</strong> a near-term SBTi target should be a reduction of at least <strong>42% absolute by 2030</strong> (1.5°C-aligned) versus a recent baseline. Long-term should reach <strong>net-zero by 2050</strong> with at least 90% absolute cuts. Anything weaker won't validate.
          </div>
        </div>
      </Card>

      {editing && (
        <TargetEditor
          initial={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSave={(form) => saveTarget(form, editing === 'new' ? undefined : editing.id)}
        />
      )}

      {deleting && (
        <ConfirmRemove target={deleting} onCancel={() => setDeleting(null)} onConfirm={() => removeTarget(deleting)} />
      )}
    </div>
  )
}

/* ─── Sub-components ───────────────────────────────────────── */

function TargetCard({ target, onEdit, onRemove }: { target: OrgTarget; onEdit: () => void; onRemove: () => void }) {
  const meta = KIND_META[target.kind]
  const status = STATUS_META[target.status]
  return (
    <div className="surface-paper p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: meta.accent }} />
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.005em] truncate">{target.label}</h3>
            <Badge variant={status.badge}>{status.label}</Badge>
          </div>
          <div className="text-[11.5px] text-[var(--text-tertiary)] mt-1">{target.scope_coverage}</div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRemove}
            className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--status-reject)] hover:bg-[var(--accent-red-light)] transition-colors cursor-pointer"
            title="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Baseline" primary={`${target.baseline_value.toLocaleString()}`} secondary={`${target.baseline_unit} · ${target.baseline_year}`} accent={meta.accent} />
        <Stat label="Reduction" primary={`-${target.target_reduction_pct}%`} secondary={`by ${target.target_year}`} accent={meta.accent} highlight />
        <Stat label="Target" primary={`${(target.baseline_value * (1 - target.target_reduction_pct / 100)).toLocaleString(undefined, { maximumFractionDigits: 1 })}`} secondary={`${target.baseline_unit} · ${target.target_year}`} accent={meta.accent} />
      </div>

      {target.notes && (
        <p className="text-[11.5px] text-[var(--text-secondary)] mt-3 leading-relaxed border-t border-[var(--border-subtle)] pt-3">
          {target.notes}
        </p>
      )}

      {target.validated_by && (
        <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-[var(--status-ok)]">
          <ShieldCheck className="w-3 h-3" /> Validated by {target.validated_by}
        </div>
      )}
    </div>
  )
}

function Stat({ label, primary, secondary, accent, highlight }: { label: string; primary: string; secondary: string; accent: string; highlight?: boolean }) {
  return (
    <div className="rounded-[8px] py-2.5 px-2" style={{ background: highlight ? `${accent}10` : 'var(--bg-secondary)' }}>
      <div className="text-[9.5px] uppercase tracking-[0.1em] font-semibold text-[var(--text-tertiary)]">{label}</div>
      <div className="font-display text-[16px] font-bold tabular-nums tracking-[-0.01em] mt-0.5" style={{ color: highlight ? accent : 'var(--text-primary)' }}>{primary}</div>
      <div className="text-[10.5px] text-[var(--text-tertiary)] mt-0.5">{secondary}</div>
    </div>
  )
}

function Empty({ onAdd }: { onAdd: () => void }) {
  return (
    <Card>
      <div className="flex flex-col items-center text-center py-12 gap-3">
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
          <TargetIcon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">No climate targets yet</h3>
          <p className="text-[12.5px] text-[var(--text-secondary)] mt-1 max-w-sm">
            Set a near-term SBTi target so your dashboard, reports, and assurance flow can track real progress.
          </p>
        </div>
        <button onClick={onAdd} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] bg-[var(--color-brand)] text-white text-[12.5px] font-semibold hover:bg-[var(--color-brand-strong)] cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add your first target
        </button>
      </div>
    </Card>
  )
}

function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="h-[100px] rounded-[12px] skeleton" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="h-[180px] rounded-[12px] skeleton" />
        <div className="h-[180px] rounded-[12px] skeleton" />
      </div>
    </div>
  )
}

function Toast({ kind, msg, onClose }: { kind: 'ok' | 'err'; msg: string; onClose: () => void }) {
  const ok = kind === 'ok'
  return (
    <div
      role="status"
      className="fixed top-6 right-6 z-50 inline-flex items-start gap-2 px-4 py-2.5 rounded-[10px] border text-[13px] font-medium shadow-lg animate-fade-in"
      style={{
        background: ok ? 'var(--accent-green-light)' : 'var(--accent-red-light)',
        color: ok ? 'var(--status-ok)' : 'var(--status-reject)',
        borderColor: ok ? 'rgba(46,125,50,0.3)' : 'rgba(220,38,38,0.3)',
      }}
    >
      {ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertTriangle className="w-4 h-4 mt-0.5" />}
      <span>{msg}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </div>
  )
}

/* ─── Editor modal ───────────────────────────────────────── */

interface TargetForm {
  kind: TargetKind
  label: string
  scope_coverage: string
  baseline_year: number
  baseline_value: number
  baseline_unit: string
  target_year: number
  target_reduction_pct: number
  status: TargetStatus
  notes: string
}

function TargetEditor({ initial, onCancel, onSave }: {
  initial: OrgTarget | null
  onCancel: () => void
  onSave: (f: TargetForm) => void
}) {
  const isEdit = !!initial
  const thisYear = new Date().getFullYear()

  const [form, setForm] = useState<TargetForm>({
    kind: initial?.kind ?? 'sbti_near_term',
    label: initial?.label ?? '',
    scope_coverage: initial?.scope_coverage ?? 'Scope 1+2',
    baseline_year: initial?.baseline_year ?? thisYear - 4,
    baseline_value: initial?.baseline_value ?? 0,
    baseline_unit: initial?.baseline_unit ?? 'tCO2e',
    target_year: initial?.target_year ?? thisYear + 5,
    target_reduction_pct: initial?.target_reduction_pct ?? 42,
    status: initial?.status ?? 'committed',
    notes: initial?.notes ?? '',
  })

  const setField = <K extends keyof TargetForm>(key: K, value: TargetForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const valid =
    form.label.trim().length > 0 &&
    form.baseline_year > 1900 && form.baseline_year < 2100 &&
    form.target_year > form.baseline_year &&
    form.target_reduction_pct > 0 && form.target_reduction_pct <= 100 &&
    form.baseline_value > 0

  const targetValue = form.baseline_value * (1 - form.target_reduction_pct / 100)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(11,18,32,0.5)', backdropFilter: 'blur(8px)' }} onClick={onCancel}>
      <div className="surface-paper w-full max-w-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
              <TargetIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-[17px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">{isEdit ? 'Edit climate target' : 'Add climate target'}</h3>
              <p className="text-[11.5px] text-[var(--text-tertiary)]">Targets feed the dashboard, reports, and assurance review.</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer"><X className="w-4 h-4" /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Kind picker */}
          <Field label="Target kind">
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(KIND_META) as TargetKind[]).map(k => {
                const m = KIND_META[k]
                const checked = form.kind === k
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setField('kind', k)}
                    className={`flex flex-col items-start text-left p-3 rounded-[10px] border transition-all cursor-pointer ${
                      checked
                        ? 'border-[var(--color-brand)] bg-[var(--accent-teal-subtle)]/40 shadow-[0_0_0_3px_var(--accent-teal-subtle)]'
                        : 'border-[var(--border-default)] hover:border-[var(--text-tertiary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1 h-3 rounded-full" style={{ background: m.accent }} />
                      <span className="text-[12.5px] font-semibold text-[var(--text-primary)]">{m.label}</span>
                    </div>
                    <p className="text-[10.5px] text-[var(--text-tertiary)] leading-snug">{m.helper}</p>
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Label">
            <input
              type="text"
              value={form.label}
              onChange={e => setField('label', e.target.value)}
              placeholder="e.g. SBTi near-term: 42% absolute by 2030"
              className="w-full h-10 px-3.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13.5px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/15 focus:border-[var(--color-brand)]"
            />
          </Field>

          <Field label="Scope coverage">
            <div className="flex flex-wrap gap-1.5">
              {SCOPE_OPTIONS.map(s => {
                const checked = form.scope_coverage === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setField('scope_coverage', s)}
                    className={`h-8 px-3 rounded-[8px] border text-[12px] font-medium transition-colors cursor-pointer ${
                      checked
                        ? 'border-[var(--color-brand)] bg-[var(--accent-teal-subtle)] text-[var(--color-brand-strong)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                    }`}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Baseline year">
              <input
                type="number" min={1990} max={2100}
                value={form.baseline_year}
                onChange={e => setField('baseline_year', Number(e.target.value))}
                className="w-full h-10 px-3.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13.5px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/15 focus:border-[var(--color-brand)] tabular-nums"
              />
            </Field>
            <Field label="Target year">
              <input
                type="number" min={1990} max={2100}
                value={form.target_year}
                onChange={e => setField('target_year', Number(e.target.value))}
                className={`w-full h-10 px-3.5 rounded-[8px] border bg-[var(--bg-primary)] text-[13.5px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/15 focus:border-[var(--color-brand)] tabular-nums ${form.target_year <= form.baseline_year ? 'border-[var(--status-reject)]' : 'border-[var(--border-default)]'}`}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Baseline value">
              <input
                type="number" min={0} step="any"
                value={form.baseline_value}
                onChange={e => setField('baseline_value', Number(e.target.value))}
                className="w-full h-10 px-3.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13.5px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/15 focus:border-[var(--color-brand)] tabular-nums"
              />
            </Field>
            <Field label="Unit">
              <input
                type="text"
                value={form.baseline_unit}
                onChange={e => setField('baseline_unit', e.target.value)}
                placeholder="tCO2e"
                className="w-full h-10 px-3.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13.5px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/15 focus:border-[var(--color-brand)]"
              />
            </Field>
          </div>

          <Field label="Reduction percentage">
            <div className="flex items-center gap-3">
              <input
                type="range" min={1} max={100} step={1}
                value={form.target_reduction_pct}
                onChange={e => setField('target_reduction_pct', Number(e.target.value))}
                className="flex-1 accent-[var(--color-brand)]"
              />
              <input
                type="number" min={1} max={100}
                value={form.target_reduction_pct}
                onChange={e => setField('target_reduction_pct', Number(e.target.value))}
                className="w-20 h-9 px-2 text-right rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13.5px] text-[var(--text-primary)] tabular-nums"
              />
              <span className="text-[12.5px] font-semibold text-[var(--text-secondary)]">%</span>
            </div>
            <div className="text-[11px] text-[var(--text-tertiary)] mt-1.5">
              By {form.target_year}, emissions ≤ {targetValue.toLocaleString(undefined, { maximumFractionDigits: 1 })} {form.baseline_unit}
            </div>
          </Field>

          <Field label="Status">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(STATUS_META) as TargetStatus[]).map(s => {
                const checked = form.status === s
                const m = STATUS_META[s]
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setField('status', s)}
                    className={`h-8 px-3 rounded-[8px] border text-[12px] font-medium transition-colors cursor-pointer ${
                      checked
                        ? 'border-[var(--color-brand)] bg-[var(--accent-teal-subtle)] text-[var(--color-brand-strong)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                    }`}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Notes (optional)">
            <textarea
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              placeholder="Reference SBTi case ID, board approval date, or methodology footnote."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/15 focus:border-[var(--color-brand)] resize-none"
            />
          </Field>

          {!valid && (
            <div className="flex items-start gap-2 p-3 rounded-[8px] bg-[var(--accent-amber-light)] border border-[rgba(230,168,23,0.3)]">
              <Info className="w-4 h-4 text-[var(--status-draft)] flex-shrink-0 mt-0.5" />
              <div className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                Fill in a label, positive baseline value, and ensure target year is after the baseline year.
              </div>
            </div>
          )}
        </div>

        <footer className="flex items-center gap-2 p-5 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
          <button onClick={onCancel} className="flex-1 h-10 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] text-[13px] font-semibold hover:bg-[var(--bg-secondary)] cursor-pointer">
            Cancel
          </button>
          <button onClick={() => valid && onSave(form)} disabled={!valid} className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-[8px] bg-[var(--color-brand)] text-white text-[13px] font-semibold hover:bg-[var(--color-brand-strong)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
            {isEdit ? <><Pencil className="w-3.5 h-3.5" /> Save changes</> : <><Plus className="w-3.5 h-3.5" /> Create target</>}
          </button>
        </footer>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.1em] font-semibold text-[var(--text-tertiary)] mb-1.5">{label}</div>
      {children}
    </div>
  )
}

function ConfirmRemove({ target, onCancel, onConfirm }: { target: OrgTarget; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(11,18,32,0.5)', backdropFilter: 'blur(8px)' }} onClick={onCancel}>
      <div className="surface-paper w-full max-w-md" onClick={e => e.stopPropagation()}>
        <header className="flex items-center gap-3 p-5 border-b border-[var(--border-subtle)]">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-red-light)', color: 'var(--status-reject)' }}>
            <Trash2 className="w-4 h-4" />
          </div>
          <h3 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">Remove climate target?</h3>
        </header>
        <div className="p-5 text-[13px] text-[var(--text-secondary)] leading-relaxed">
          <strong className="text-[var(--text-primary)]">{target.label}</strong> will be removed from this workspace. The dashboard tracker and reports will stop showing it.
        </div>
        <footer className="flex items-center gap-2 p-5 border-t border-[var(--border-subtle)]">
          <button onClick={onCancel} className="flex-1 h-10 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] text-[13px] font-semibold hover:bg-[var(--bg-secondary)] cursor-pointer">
            Keep target
          </button>
          <button onClick={onConfirm} className="flex-1 h-10 rounded-[8px] bg-[var(--status-reject)] text-white text-[13px] font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer">
            Remove
          </button>
        </footer>
      </div>
    </div>
  )
}
