import { useEffect, useState, useMemo, useCallback, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Plus, Pencil, Trash2, X, ShieldCheck, Sparkles } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import PageHeader from '../components/PageHeader'
import Button from '../design-system/components/Button'
import { orgStore, type OrgTarget } from '../lib/orgStore'
import { useFramework } from '../lib/frameworks'
import { useOrgData } from '../lib/useOrgData'
import JargonTooltip from '../components/JargonTooltip'
import { StatLedger, StateBoundary, StatusPill, notify, useConfirm, SkeletonLedger, SkeletonCard, type PillTone } from '../components/ui'
import { useFmt } from '../lib/fmt'
import { ease, popVariants, spring } from '../motion/tokens'
import TargetGapChart from '../components/analytics/TargetGapChart'
import { computeTargetGap, scopesCovered, type TargetGap } from '../components/analytics/targetGap'
import useEmissionsActuals, { actualsFor } from '../components/analytics/useEmissionsActuals'

type TargetKind = OrgTarget['kind']
type TargetStatus = OrgTarget['status']

const KINDS: TargetKind[] = ['sbti_near_term', 'sbti_long_term', 'net_zero', 'custom']
const KIND_ACCENT: Record<TargetKind, string> = {
  sbti_near_term: 'var(--chart-s1)',
  sbti_long_term: 'var(--chart-s2)',
  net_zero: 'var(--chart-s3)',
  custom: 'var(--chart-c7)',
}
const STATUSES: TargetStatus[] = ['committed', 'validated', 'achieved', 'missed']
const STATUS_TONE: Record<TargetStatus, PillTone> = { committed: 'warning', validated: 'success', achieved: 'brand', missed: 'danger' }

const SCOPE_OPTIONS = ['Scope 1', 'Scope 1+2', 'Scope 1+2+3', 'Scope 3 only']
// Scope values are persisted as-is; only the display label is localised.
const SCOPE_KEY: Record<string, string> = {
  'Scope 1': 'scope1',
  'Scope 1+2': 'scope12',
  'Scope 1+2+3': 'scope123',
  'Scope 3 only': 'scope3Only',
}

type TFn = ReturnType<typeof useTranslation>['t']
const kindOf = (k: string): TargetKind => (KINDS.includes(k as TargetKind) ? (k as TargetKind) : 'custom')
const statusOf = (s: string): TargetStatus => (STATUSES.includes(s as TargetStatus) ? (s as TargetStatus) : 'committed')
const kindLabel = (t: TFn, k: TargetKind) => t(`climateTargets.kinds.${k}.label`)
const kindHelper = (t: TFn, k: TargetKind) => t(`climateTargets.kinds.${k}.helper`)
const statusLabel = (t: TFn, s: TargetStatus) => t(`climateTargets.status.${s}`)
const scopeLabel = (t: TFn, s: string) => (SCOPE_KEY[s] ? t(`climateTargets.scopes.${SCOPE_KEY[s]}`) : s || t('climateTargets.scopes.scope123'))

export default function ClimateTargets() {
  const { active: framework } = useFramework()
  const { t } = useTranslation()
  const f = useFmt()
  const confirm = useConfirm()
  const [targets, setTargets] = useState<OrgTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<OrgTarget | 'new' | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const { data: orgData } = useOrgData()
  const actuals = useEmissionsActuals(orgData?.assignments ?? null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await orgStore.listTargets()
      setTargets(Array.isArray(list) ? list : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : t('climateTargets.loadError.fallback'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  const gaps = useMemo(() => {
    const m = new Map<string, TargetGap>()
    for (const tg of targets) m.set(tg.id, computeTargetGap(tg, actualsFor(actuals.history, scopesCovered(tg.scope_coverage))))
    return m
  }, [targets, actuals.history])

  const grouped = useMemo(() => {
    const out: Record<TargetKind, OrgTarget[]> = { sbti_near_term: [], sbti_long_term: [], net_zero: [], custom: [] }
    for (const tg of targets) out[kindOf(tg.kind)].push(tg)
    return out
  }, [targets])

  const primary = targets.find(x => x.id === selected) ?? targets.find(x => x.kind === 'sbti_near_term') ?? targets[0] ?? null
  const primaryGap = primary ? gaps.get(primary.id) ?? null : null

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
      notify.success(id ? t('climateTargets.toast.updated') : t('climateTargets.toast.created'))
      setEditing(null)
      load()
    } catch (e) {
      notify.error(t('climateTargets.toast.saveFailed'), { description: e instanceof Error ? e.message : undefined })
      throw e
    }
  }

  async function removeTarget(target: OrgTarget) {
    const ok = await confirm({
      title: t('climateTargets.remove.title'),
      description: <Trans i18nKey="climateTargets.remove.body" values={{ label: target.label }} components={{ strong: <strong className="text-[var(--text-primary)]" /> }} />,
      confirmLabel: t('climateTargets.remove.confirm'),
      cancelLabel: t('climateTargets.remove.keep'),
      tone: 'destructive',
    })
    if (!ok) return
    try {
      await orgStore.removeTarget(target.id)
      notify.success(t('climateTargets.toast.removed', { label: target.label }))
      if (selected === target.id) setSelected(null)
      load()
    } catch (e) {
      notify.error(t('climateTargets.toast.removeFailed'), { description: e instanceof Error ? e.message : undefined })
    }
  }

  const validated = targets.filter(x => x.status === 'validated' || x.status === 'achieved').length
  const years = targets.map(x => Number(x.target_year)).filter(Number.isFinite)
  const nextYear = years.length ? Math.min(...years) : null

  return (
    <div className="page-container space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: t('climateTargets.breadcrumbs.strategy') },
          { label: t('climateTargets.breadcrumbs.climateTargets') },
        ]}
        eyebrow={t('climateTargets.eyebrow')}
        title={t('climateTargets.title')}
        subtitle={(
          <>
            {t('climateTargets.subtitleBefore')}
            <JargonTooltip term="SBTi">{t('climateTargets.sbtiTooltip')}</JargonTooltip>
            {t('climateTargets.subtitleAfter')}
          </>
        )}
        actions={
          <Button variant="brand" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setEditing('new')}>
            {t('climateTargets.addTarget')}
          </Button>
        }
      />

      <StateBoundary
        loading={loading}
        error={error}
        onRetry={load}
        hasData={targets.length > 0}
        empty={targets.length === 0}
        skeleton={<div className="space-y-6"><SkeletonLedger items={4} /><SkeletonCard /><div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><SkeletonCard /><SkeletonCard /></div></div>}
        errorState={{ title: t('climateTargets.loadError.title') }}
        emptyState={{
          art: 'target',
          title: t('climateTargets.empty.title'),
          body: t('climateTargets.empty.body'),
          cta: { label: t('climateTargets.empty.addFirst'), onClick: () => setEditing('new'), icon: <Plus className="w-4 h-4" /> },
        }}
      >
        <div className="space-y-8">
          <StatLedger
            aria-label={t('climateTargets.ledger.aria')}
            items={[
              { id: 'count', label: t('climateTargets.ledger.targets'), value: targets.length, tone: 'brand' },
              { id: 'validated', label: t('climateTargets.ledger.validated'), value: validated, tone: validated > 0 ? 'success' : 'neutral', hint: t('climateTargets.ledger.validatedHint') },
              {
                id: 'gap',
                label: t('climateTargets.ledger.gap'),
                value: primaryGap?.gap != null ? Math.abs(primaryGap.gap) : null,
                format: 'compact',
                unit: primaryGap?.gap != null ? f.unit(primary?.baseline_unit || 'tCO2e') : undefined,
                tone: primaryGap?.gap == null ? 'neutral' : primaryGap.gap > 0 ? 'danger' : 'success',
                hint: primaryGap?.gap == null ? t('climateTargets.ledger.noActuals') : primaryGap.gap > 0 ? t('climateTargets.ledger.behind') : t('climateTargets.ledger.ahead'),
              },
              {
                id: 'next',
                label: t('climateTargets.ledger.nextMilestone'),
                value: nextYear != null ? String(nextYear) : '—',
                tone: 'neutral',
                hint: nextYear != null ? t('climateTargets.ledger.yearsLeft', { count: Math.max(0, nextYear - new Date().getFullYear()) }) : undefined,
              },
            ]}
          />

          {primary && primaryGap && (
            <section aria-labelledby="pathway-h" className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="pathway-h" className="type-h2 text-[var(--text-primary)]">{t('climateTargets.pathway.title')}</h2>
                  <p className="type-small text-[var(--text-tertiary)] mt-1">{t('climateTargets.pathway.subtitle')}</p>
                </div>
                {targets.length > 1 && (
                  <div role="tablist" aria-label={t('climateTargets.pathway.pick')} className="flex flex-wrap gap-1 p-1 rounded-[var(--radius-lg)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] max-w-full">
                    {targets.map(tg => {
                      const on = tg.id === primary.id
                      return (
                        <button
                          key={tg.id}
                          type="button"
                          role="tab"
                          aria-selected={on}
                          onClick={() => setSelected(tg.id)}
                          className={`relative min-h-[36px] px-3 rounded-[var(--radius-md)] text-caption font-medium transition-colors duration-micro max-w-[240px] ${on ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
                        >
                          {on && <motion.span layoutId="target-tab" className="absolute inset-0 rounded-[var(--radius-md)] bg-[var(--bg-primary)] shadow-[var(--shadow-card)]" transition={spring.snappy} />}
                          <span className="relative block truncate">{tg.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <TargetGapChart
                key={primary.id}
                gap={primaryGap}
                height={280}
                title={primary.label}
                subtitle={`${kindLabel(t, kindOf(primary.kind))} · ${scopeLabel(t, primary.scope_coverage)} · ${t('climateTargets.pathway.baselineTo', { from: primary.baseline_year, to: primary.target_year })}`}
                actions={
                  primaryGap.onTrack == null
                    ? <StatusPill tone="neutral">{t('climateTargets.pathway.noActuals')}</StatusPill>
                    : <StatusPill tone={primaryGap.onTrack ? 'success' : 'danger'} dot>{primaryGap.onTrack ? t('climateTargets.pathway.onTrack') : t('climateTargets.pathway.behind')}</StatusPill>
                }
                footnote={
                  primaryGap.onTrack == null
                    ? t('climateTargets.pathway.noActualsBody')
                    : (
                      <span>
                        {t('climateTargets.pathway.required')}{' '}
                        <strong className="text-[var(--text-primary)] tabular-nums">{f.value(primaryGap.requiredAnnual, primary.baseline_unit, { compact: true })}</strong>
                        {t('climateTargets.pathway.perYear')}
                        {actuals.error ? <> · {t('climateTargets.pathway.partial')}</> : null}
                      </span>
                    )
                }
              />
            </section>
          )}

          {KINDS.map(kind => {
            const list = grouped[kind]
            if (list.length === 0) return null
            return (
              <section key={kind} aria-labelledby={`kind-${kind}`}>
                <div className="flex items-start gap-3 mb-3">
                  <span className="mt-1 w-1 h-8 rounded-full flex-shrink-0" style={{ background: KIND_ACCENT[kind] }} aria-hidden />
                  <div className="min-w-0">
                    <h2 id={`kind-${kind}`} className="type-h3 text-[var(--text-primary)]">{kindLabel(t, kind)}</h2>
                    <p className="text-caption text-[var(--text-tertiary)]">{kindHelper(t, kind)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {list.map(tg => (
                    <TargetCard key={tg.id} target={tg} gap={gaps.get(tg.id) ?? null} onEdit={() => setEditing(tg)} onRemove={() => removeTarget(tg)} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </StateBoundary>

      {/* What auditors look for */}
      <aside className="surface-paper p-5 flex items-start gap-3">
        <span className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 bg-[var(--bg-secondary)] text-[var(--color-brand)]">
          <Sparkles className="w-4 h-4" aria-hidden />
        </span>
        <p className="flex-1 text-small text-[var(--text-secondary)]">
          <Trans i18nKey="climateTargets.tip" components={{ lead: <strong className="text-[var(--text-primary)]" />, b: <strong /> }} />
        </p>
      </aside>

      <AnimatePresence>
        {editing && (
          <TargetEditor
            key="editor"
            initial={editing === 'new' ? null : editing}
            onCancel={() => setEditing(null)}
            onSave={(form) => saveTarget(form, editing === 'new' ? undefined : editing.id)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Target card ───────────────────────────────────────── */

function TargetCard({ target, gap, onEdit, onRemove }: { target: OrgTarget; gap: TargetGap | null; onEdit: () => void; onRemove: () => void }) {
  const { t } = useTranslation()
  const f = useFmt()
  const reduce = useReducedMotion()
  const kind = kindOf(target.kind)
  const status = statusOf(target.status)
  const baseline = Number(target.baseline_value)
  const targetValue = baseline * (1 - Number(target.target_reduction_pct) / 100)
  const needed = baseline - targetValue
  // Share of the committed reduction already achieved, and where the pathway expects you to be.
  const achievedPct = gap?.latest != null && needed > 0 ? Math.max(0, Math.min(100, ((baseline - gap.latest) / needed) * 100)) : null
  const expectedPct = gap?.expected != null && needed > 0 ? Math.max(0, Math.min(100, ((baseline - gap.expected) / needed) * 100)) : null

  return (
    <article className="surface-paper p-5 flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="type-h3 text-[var(--text-primary)] min-w-0 break-words">{target.label}</h3>
            <StatusPill tone={STATUS_TONE[status]}>{statusLabel(t, status)}</StatusPill>
          </div>
          <div className="text-caption text-[var(--text-tertiary)] mt-1">{scopeLabel(t, target.scope_coverage)}</div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0 -mr-1.5 -mt-1">
          <IconBtn label={t('climateTargets.card.edit')} onClick={onEdit}><Pencil className="w-4 h-4" /></IconBtn>
          <IconBtn label={t('climateTargets.card.remove')} onClick={onRemove} danger><Trash2 className="w-4 h-4" /></IconBtn>
        </div>
      </header>

      <dl className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)]">
        <Figure label={t('climateTargets.card.baseline')} value={f.number(baseline, { maxFraction: 1 })} sub={`${f.unit(target.baseline_unit)} · ${target.baseline_year}`} />
        <Figure label={t('climateTargets.card.reduction')} value={`−${f.number(target.target_reduction_pct)}%`} sub={t('climateTargets.card.by', { year: target.target_year })} accent />
        <Figure label={t('climateTargets.card.target')} value={f.number(targetValue, { maxFraction: 1 })} sub={`${f.unit(target.baseline_unit)} · ${target.target_year}`} />
      </dl>

      <div>
        <div className="flex items-baseline justify-between gap-3 text-caption text-[var(--text-tertiary)] mb-1.5">
          <span>{t('climateTargets.card.progress')}</span>
          <span className="tabular-nums text-[var(--text-secondary)] font-medium text-right">
            {achievedPct == null ? t('climateTargets.card.noActuals') : t('climateTargets.card.progressValue', { pct: f.number(achievedPct, { maxFraction: 0 }), year: gap?.latestYear })}
          </span>
        </div>
        <div className="relative h-2 rounded-full bg-[var(--bg-tertiary)]">
          {achievedPct != null && (
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: gap?.onTrack === false ? 'var(--status-danger)' : KIND_ACCENT[kind] }}
              initial={reduce ? false : { width: '0%' }}
              animate={{ width: `${achievedPct}%` }}
              transition={{ duration: 0.8, ease: ease.out, delay: 0.1 }}
            />
          )}
          {expectedPct != null && (
            <span className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-[var(--text-primary)]" style={{ left: `calc(${expectedPct}% - 1px)` }} aria-hidden />
          )}
        </div>
        {expectedPct != null && <div className="text-caption text-[var(--text-tertiary)] mt-1.5">{t('climateTargets.card.expectedHint', { pct: f.number(expectedPct, { maxFraction: 0 }) })}</div>}
      </div>

      {(target.notes || target.validated_by) && (
        <footer className="border-t border-[var(--border-subtle)] pt-3 space-y-2">
          {target.notes && <p className="text-caption text-[var(--text-secondary)]">{target.notes}</p>}
          {target.validated_by && (
            <div className="inline-flex items-center gap-1.5 text-caption text-[var(--status-success)]">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden /> {t('climateTargets.card.validatedBy', { name: target.validated_by })}
            </div>
          )}
        </footer>
      )}
    </article>
  )
}

function IconBtn({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center text-[var(--text-tertiary)] transition-colors duration-micro ${danger ? 'hover:text-[var(--status-danger)]' : 'hover:text-[var(--text-primary)]'} hover:bg-[var(--bg-hover)]`}
    >
      {children}
    </button>
  )
}

function Figure({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className="px-3 py-3 text-center min-w-0">
      <dt className="text-caption text-[var(--text-tertiary)]">{label}</dt>
      <dd className={`type-figure text-[18px] leading-6 mt-1 ${accent ? 'text-[var(--color-brand)]' : 'text-[var(--text-primary)]'}`}>{value}</dd>
      <dd className="text-caption text-[var(--text-tertiary)] mt-0.5 break-words">{sub}</dd>
    </div>
  )
}

/* ─── Editor sheet ───────────────────────────────────────── */

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

const inputCls = 'w-full h-10 px-3.5 rounded-[var(--radius-md)] border bg-[var(--bg-primary)] text-small text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] tabular-nums'
const bad = (on: unknown) => (on ? 'border-[var(--status-danger)]' : 'border-[var(--border-default)]')

function TargetEditor({ initial, onCancel, onSave }: {
  initial: OrgTarget | null
  onCancel: () => void
  onSave: (f: TargetForm) => Promise<void>
}) {
  const { t } = useTranslation()
  const f = useFmt()
  const isEdit = !!initial
  const thisYear = new Date().getFullYear()
  const firstRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [tried, setTried] = useState(false)

  const [form, setForm] = useState<TargetForm>({
    kind: initial ? kindOf(initial.kind) : 'sbti_near_term',
    label: initial?.label ?? '',
    scope_coverage: initial?.scope_coverage ?? 'Scope 1+2',
    baseline_year: initial?.baseline_year ?? thisYear - 4,
    baseline_value: initial?.baseline_value ?? 0,
    baseline_unit: initial?.baseline_unit ?? 'tCO2e',
    target_year: initial?.target_year ?? thisYear + 5,
    target_reduction_pct: initial?.target_reduction_pct ?? 42,
    status: initial ? statusOf(initial.status) : 'committed',
    notes: initial?.notes ?? '',
  })
  const setField = <K extends keyof TargetForm>(key: K, value: TargetForm[K]) => setForm(prev => ({ ...prev, [key]: value }))

  useEffect(() => {
    firstRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, busy])

  const errors = {
    label: form.label.trim().length === 0 ? t('climateTargets.editor.errors.label') : null,
    baseline_year: !(form.baseline_year > 1900 && form.baseline_year < 2100) ? t('climateTargets.editor.errors.year') : null,
    target_year: !(form.target_year > form.baseline_year && form.target_year <= 2100) ? t('climateTargets.editor.errors.targetYear') : null,
    baseline_value: !(form.baseline_value > 0) ? t('climateTargets.editor.errors.baseline') : null,
    target_reduction_pct: !(form.target_reduction_pct > 0 && form.target_reduction_pct <= 100) ? t('climateTargets.editor.errors.pct') : null,
  }
  const valid = Object.values(errors).every(e => e == null)
  // Show an error once the user tried to save — except the year order, which is live.
  const show = (k: keyof typeof errors) => (tried || k === 'target_year' ? errors[k] : null)
  const targetValue = form.baseline_value * (1 - form.target_reduction_pct / 100)

  async function submit() {
    setTried(true)
    if (!valid || busy) return
    setBusy(true)
    try { await onSave(form) } catch { /* toast already shown; keep the sheet open */ } finally { setBusy(false) }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(2px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={() => !busy && onCancel()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="target-editor-title"
        variants={popVariants} initial="hidden" animate="visible" exit="exit"
        className="surface-paper w-full sm:max-w-xl max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 p-5 border-b border-[var(--border-subtle)]">
          <div>
            <h3 id="target-editor-title" className="type-h3 text-[var(--text-primary)]">{isEdit ? t('climateTargets.editor.editTitle') : t('climateTargets.editor.addTitle')}</h3>
            <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('climateTargets.editor.subtitle')}</p>
          </div>
          <IconBtn label={t('common.cancel')} onClick={onCancel}><X className="w-4 h-4" /></IconBtn>
        </header>

        <form className="flex-1 overflow-y-auto p-5 space-y-5" onSubmit={e => { e.preventDefault(); submit() }} noValidate>
          <Field label={t('climateTargets.editor.kind')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label={t('climateTargets.editor.kind')}>
              {KINDS.map(k => {
                const checked = form.kind === k
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => setField('kind', k)}
                    className={`flex flex-col items-start text-left p-3 rounded-[var(--radius-lg)] border transition-colors duration-micro ${
                      checked ? 'border-[var(--color-brand)] bg-[var(--bg-hover)] ring-2 ring-[var(--color-brand)]/15' : 'border-[var(--border-default)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <span className="flex items-center gap-2 mb-1">
                      <span className="w-1 h-3 rounded-full" style={{ background: KIND_ACCENT[k] }} aria-hidden />
                      <span className="text-small font-semibold text-[var(--text-primary)]">{kindLabel(t, k)}</span>
                    </span>
                    <span className="text-caption text-[var(--text-tertiary)]">{kindHelper(t, k)}</span>
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label={t('climateTargets.editor.label')} htmlFor="tg-label" error={show('label')}>
            <input id="tg-label" ref={firstRef} type="text" value={form.label} onChange={e => setField('label', e.target.value)}
              placeholder={t('climateTargets.editor.labelPlaceholder')} aria-invalid={!!show('label')}
              className={`${inputCls} ${bad(show('label'))}`} />
          </Field>

          <Field label={t('climateTargets.editor.scopeCoverage')}>
            <Chips options={SCOPE_OPTIONS} value={form.scope_coverage} onChange={v => setField('scope_coverage', v)} render={s => scopeLabel(t, s)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('climateTargets.editor.baselineYear')} htmlFor="tg-by" error={show('baseline_year')}>
              <input id="tg-by" type="number" inputMode="numeric" min={1990} max={2100} value={form.baseline_year}
                onChange={e => setField('baseline_year', Number(e.target.value))} aria-invalid={!!show('baseline_year')}
                className={`${inputCls} ${bad(show('baseline_year'))}`} />
            </Field>
            <Field label={t('climateTargets.editor.targetYear')} htmlFor="tg-ty" error={show('target_year')}>
              <input id="tg-ty" type="number" inputMode="numeric" min={1990} max={2100} value={form.target_year}
                onChange={e => setField('target_year', Number(e.target.value))} aria-invalid={!!show('target_year')}
                className={`${inputCls} ${bad(show('target_year'))}`} />
            </Field>
          </div>

          <div className="grid grid-cols-[1fr_112px] gap-3">
            <Field label={t('climateTargets.editor.baselineValue')} htmlFor="tg-bv" error={show('baseline_value')}>
              <input id="tg-bv" type="number" inputMode="decimal" min={0} step="any" value={form.baseline_value}
                onChange={e => setField('baseline_value', Number(e.target.value))} aria-invalid={!!show('baseline_value')}
                className={`${inputCls} ${bad(show('baseline_value'))}`} />
            </Field>
            <Field label={t('climateTargets.editor.unit')} htmlFor="tg-unit">
              <input id="tg-unit" type="text" value={form.baseline_unit} onChange={e => setField('baseline_unit', e.target.value)} placeholder="tCO2e"
                className={`${inputCls} ${bad(false)}`} />
            </Field>
          </div>

          <Field label={t('climateTargets.editor.reductionPct')} htmlFor="tg-pct" error={show('target_reduction_pct')}>
            <div className="flex items-center gap-3">
              <input type="range" min={1} max={100} step={1} value={form.target_reduction_pct}
                aria-label={t('climateTargets.editor.reductionPct')}
                onChange={e => setField('target_reduction_pct', Number(e.target.value))}
                className="flex-1 accent-[var(--color-brand)] h-10" />
              <div className="relative w-24">
                <input id="tg-pct" type="number" inputMode="decimal" min={1} max={100} value={form.target_reduction_pct}
                  onChange={e => setField('target_reduction_pct', Number(e.target.value))}
                  className={`${inputCls} pr-7 text-right ${bad(show('target_reduction_pct'))}`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-caption text-[var(--text-tertiary)]" aria-hidden>%</span>
              </div>
            </div>
            <div className="mt-2 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] px-3 py-2 text-caption text-[var(--text-secondary)] tabular-nums">
              {t('climateTargets.editor.projection', { year: form.target_year, value: f.number(targetValue, { maxFraction: 1 }), unit: f.unit(form.baseline_unit) })}
            </div>
          </Field>

          <Field label={t('climateTargets.editor.status')}>
            <Chips options={STATUSES} value={form.status} onChange={v => setField('status', v as TargetStatus)} render={s => statusLabel(t, s as TargetStatus)} />
          </Field>

          <Field label={t('climateTargets.editor.notes')} htmlFor="tg-notes">
            <textarea id="tg-notes" value={form.notes} onChange={e => setField('notes', e.target.value)}
              placeholder={t('climateTargets.editor.notesPlaceholder')} rows={3}
              className="w-full px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] resize-none" />
          </Field>
        </form>

        <footer className="flex items-center justify-end gap-2 p-4 sm:p-5 border-t border-[var(--border-subtle)]">
          <Button variant="secondary" size="md" onClick={onCancel} disabled={busy}>{t('common.cancel')}</Button>
          <Button variant="brand" size="md" onClick={submit} loading={busy} icon={isEdit ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}>
            {isEdit ? t('climateTargets.editor.saveChanges') : t('climateTargets.editor.create')}
          </Button>
        </footer>
      </motion.div>
    </motion.div>
  )
}

function Chips<T extends string>({ options, value, onChange, render }: { options: T[]; value: string; onChange: (v: T) => void; render: (v: T) => string }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {options.map(o => {
        const on = value === o
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o)}
            className={`min-h-[36px] px-3 rounded-[var(--radius-md)] border text-caption font-medium transition-colors duration-micro whitespace-nowrap ${
              on ? 'border-[var(--color-brand)] bg-[var(--bg-hover)] text-[var(--text-primary)]' : 'border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {render(o)}
          </button>
        )
      })}
    </div>
  )
}

function Field({ label, htmlFor, error, children }: { label: string; htmlFor?: string; error?: string | null; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-caption font-medium text-[var(--text-secondary)] mb-1.5">{label}</label>
      {children}
      {error && <p role="alert" className="mt-1.5 text-caption text-[var(--status-danger)]">{error}</p>}
    </div>
  )
}
