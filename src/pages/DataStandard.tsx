import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { BookOpen, Search, User as UserIcon, ShieldCheck, Award, ChevronRight, Clock, Calendar, Calculator as CalcIcon, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { orgStore, type DisclosureStandard } from '../lib/orgStore'
import { itemLabel } from '../lib/itemLabel'
import { useFramework, FRAMEWORKS } from '../lib/frameworks'
import PageHeader from '../components/PageHeader'
import { StateBoundary, StatLedger, StatusPill, SkeletonLedger } from '../components/ui'
import { SkeletonTable } from '../components/Skeleton'
import { useFmt } from '../lib/fmt'
import { dur, ease } from '../motion/tokens'

/**
 * ESG Data Standard — one canonical definition, calculation method, cadence
 * and ownership chain (owner → reviewer → approver) per disclosure, so every
 * plant in scope reports the same thing the same way.
 */

type Row = DisclosureStandard

const CADENCES = ['daily', 'monthly', 'quarterly', 'annual'] as const

const ROLE_LABEL: Record<string, string> = {
  plant_manager: 'Plant Manager',
  subsidiary_lead: 'Subsidiary Lead',
  group_sustainability_officer: 'Group SO',
  data_contributor: 'Data Contributor',
  narrative_owner: 'Narrative Owner',
  platform_admin: 'Admin',
}

export default function DataStandard() {
  const { t, i18n } = useTranslation()
  const zh = !!i18n.language?.startsWith('zh')
  const { active: framework, setActive } = useFramework()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [cadenceFilter, setCadenceFilter] = useState<string>('all')
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  const load = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setErr(null)
    orgStore
      .disclosureStandard(framework.id)
      .then((d) => {
        if (!cancelled) setRows(Array.isArray(d) ? (d as Row[]) : [])
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : t('dataStandard.loadFailed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [framework.id, t])

  useEffect(() => {
    setRows(null)
    return load()
  }, [load])

  const sectionOf = useCallback(
    (r: Row) => {
      const s = (zh && r.section_zh) || r.section
      return s || ''
    },
    [zh],
  )

  const filtered = useMemo(() => {
    if (!rows) return []
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (cadenceFilter !== 'all' && r.cadence !== cadenceFilter) return false
      if (!q) return true
      return (
        r.gri_code.toLowerCase().includes(q) ||
        r.line_item.toLowerCase().includes(q) ||
        (r.line_item_zh ?? '').toLowerCase().includes(q) ||
        (r.definition ?? '').toLowerCase().includes(q) ||
        sectionOf(r).toLowerCase().includes(q)
      )
    })
  }, [rows, query, cadenceFilter, sectionOf])

  const bySection = useMemo(() => {
    const m = new Map<string, Row[]>()
    for (const r of filtered) {
      const k = sectionOf(r)
      m.set(k, [...(m.get(k) ?? []), r])
    }
    return Array.from(m.entries()).map(([section, rows]) => ({ section, rows }))
  }, [filtered, sectionOf])

  const stats = useMemo(() => {
    if (!rows) return null
    const total = rows.length
    const withDef = rows.filter((r) => r.definition).length
    const withMethod = rows.filter((r) => r.calc_method).length
    const withOwner = rows.filter((r) => r.data_owner_role && r.reviewer_role && r.approver_role).length
    return { total, withDef, withMethod, withOwner }
  }, [rows])

  const activeFrameworks = FRAMEWORKS.filter((f) => f.status === 'active')
  const filtersOn = query.trim() !== '' || cadenceFilter !== 'all'

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('dataStandard.header.eyebrow')}
        title={t('dataStandard.header.title')}
        subtitle={t('dataStandard.header.subtitle')}
        actions={
          <label className="flex flex-col gap-1 w-full sm:w-[300px]">
            <span className="text-caption text-[var(--text-tertiary)]">{t('dataStandard.framework')}</span>
            <select
              value={framework.id}
              onChange={(e) => setActive(e.target.value)}
              className="h-10 pl-3 pr-8 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small font-medium text-[var(--text-primary)] cursor-pointer focus:outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-soft)]"
            >
              {activeFrameworks.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.code} · {(zh && f.nameZh) || f.name}
                </option>
              ))}
            </select>
          </label>
        }
      />

      <StateBoundary
        loading={loading}
        hasData={!!rows}
        error={err}
        onRetry={load}
        skeleton={<SkeletonLedger items={4} />}
        errorState={{ title: t('dataStandard.errorTitle') }}
      >
        {stats && stats.total > 0 && (
          <StatLedger
            items={[
              { id: 'disclosures', label: t('dataStandard.stats.disclosures'), value: stats.total, tone: 'brand' },
              {
                id: 'definitions',
                label: t('dataStandard.stats.definitions'),
                value: stats.total ? (stats.withDef / stats.total) * 100 : 0,
                format: 'percent',
                tone: stats.withDef === stats.total ? 'success' : 'warning',
                hint: t('dataStandard.stats.ofTotal', { n: stats.withDef, total: stats.total }),
              },
              {
                id: 'methods',
                label: t('dataStandard.stats.calcMethods'),
                value: stats.withMethod,
                tone: stats.withMethod === stats.total ? 'success' : 'neutral',
                hint: t('dataStandard.stats.ofTotal', { n: stats.withMethod, total: stats.total }),
              },
              {
                id: 'owners',
                label: t('dataStandard.stats.ownershipChains'),
                value: stats.withOwner,
                tone: stats.withOwner === stats.total ? 'success' : 'neutral',
                hint: t('dataStandard.stats.completeChains', { n: stats.withOwner, total: stats.total }),
              },
            ]}
          />
        )}
      </StateBoundary>

      {!err && (rows?.length ?? 0) > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t('dataStandard.searchPlaceholder')}
              placeholder={t('dataStandard.searchPlaceholder')}
              className="w-full pl-9 pr-3 h-10 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-soft)] outline-none transition-colors"
            />
          </div>
          <div className="flex items-center gap-1 p-1 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] overflow-x-auto [scrollbar-width:none]" role="radiogroup" aria-label={t('dataStandard.cadenceAria')}>
            {(['all', ...CADENCES] as const).map((c) => {
              const on = cadenceFilter === c
              return (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setCadenceFilter(c)}
                  className={`h-8 px-3 rounded-[var(--radius-sm)] text-small font-medium whitespace-nowrap transition-colors duration-micro ${
                    on ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-[var(--shadow-card)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {c === 'all' ? t('dataStandard.allCadences') : t(`dataStandard.cadence.${c}`)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <StateBoundary
        loading={loading}
        hasData={!!rows}
        error={err}
        onRetry={load}
        skeleton={<SkeletonTable rows={8} cols={4} />}
        empty={!!rows && filtered.length === 0}
        emptyState={
          filtersOn
            ? {
                variant: 'filtered',
                onClearFilters: () => {
                  setQuery('')
                  setCadenceFilter('all')
                },
              }
            : { art: 'noData', title: t('dataStandard.emptyTitle', { code: framework.code }), body: t('dataStandard.emptyBody') }
        }
        errorState={<span className="sr-only">{t('dataStandard.errorTitle')}</span>}
      >
        <section aria-labelledby="ds-catalog">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-3">
            <h2 id="ds-catalog" className="type-h3 text-[var(--text-primary)]">
              {t('dataStandard.catalog.title', { count: filtered.length, code: framework.code })}
            </h2>
            <p className="text-caption text-[var(--text-tertiary)]">{t('dataStandard.catalog.subtitle')}</p>
          </div>
          <div className="space-y-4">
            {bySection.map((sec) => (
              <div key={sec.section || '_'} className="surface-paper overflow-hidden">
                <header className="px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex items-center justify-between gap-3">
                  <h3 className="text-small font-semibold text-[var(--text-primary)] min-w-0 truncate">{sec.section || t('dataStandard.otherSection')}</h3>
                  <span className="text-caption text-[var(--text-tertiary)] tabular-nums whitespace-nowrap">{t('dataStandard.sectionCount', { count: sec.rows.length })}</span>
                </header>
                <ul className="divide-y divide-[var(--border-subtle)]">
                  {sec.rows.map((r) => {
                    const key = r.gri_code + '|' + r.line_item
                    return (
                      <StandardRow
                        key={key}
                        row={r}
                        open={openIds.has(key)}
                        toggle={() =>
                          setOpenIds((prev) => {
                            const next = new Set(prev)
                            if (next.has(key)) next.delete(key)
                            else next.add(key)
                            return next
                          })
                        }
                      />
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </StateBoundary>
    </div>
  )
}

function StandardRow({ row, open, toggle }: { row: Row; open: boolean; toggle: () => void }) {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const reduce = useReducedMotion()
  const panelId = `ds-${row.gri_code}-${row.line_item}`.replace(/[^a-z0-9-]/gi, '_')

  return (
    <li>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-[var(--bg-hover)] transition-colors duration-micro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand)]"
      >
        <ChevronRight
          className={`w-4 h-4 mt-0.5 text-[var(--text-tertiary)] flex-shrink-0 transition-transform duration-fast ease-out ${open ? 'rotate-90' : ''}`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-x-2.5 gap-y-0.5 flex-wrap">
            <span className="font-mono text-caption font-semibold text-[var(--color-brand)] whitespace-nowrap">{row.gri_code}</span>
            <span className="text-small font-semibold text-[var(--text-primary)] text-pretty">{itemLabel(row, i18n.language)}</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {row.unit && (
              <StatusPill tone="neutral" size="sm">
                <span className="font-mono">{f.unit(row.unit)}</span>
              </StatusPill>
            )}
            {row.cadence && (
              <StatusPill tone="neutral" size="sm" icon={<Calendar />}>
                {t(`dataStandard.cadence.${row.cadence}`)}
              </StatusPill>
            )}
            <Coverage ok={!!row.definition} okLabel={t('dataStandard.row.definition')} missingLabel={t('dataStandard.row.noDefinition')} />
            <Coverage ok={!!row.calc_method} okLabel={t('dataStandard.row.method')} missingLabel={t('dataStandard.row.noMethod')} />
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: dur.base, ease: ease.out }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pl-12 space-y-5">
              <DetailBlock icon={BookOpen} label={t('dataStandard.row.canonicalDefinition')} body={row.definition} empty={t('dataStandard.row.noDefinitionBody')} />
              <DetailBlock icon={CalcIcon} label={t('dataStandard.row.calcMethod')} body={row.calc_method} empty={t('dataStandard.row.noMethodBody')} />
              <OwnershipChain row={row} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

function Coverage({ ok, okLabel, missingLabel }: { ok: boolean; okLabel: string; missingLabel: string }) {
  // Only gaps are called out; a complete standard stays quiet.
  if (ok) return <span className="sr-only">{okLabel}</span>
  return (
    <StatusPill tone="warning" size="sm" icon={<AlertCircle />}>
      {missingLabel}
    </StatusPill>
  )
}

function DetailBlock({ icon: Icon, label, body, empty }: { icon: typeof BookOpen; label: string; body: string | null; empty: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-[var(--color-brand)]" aria-hidden />
        <span className="text-caption font-semibold text-[var(--text-secondary)]">{label}</span>
      </div>
      {body ? (
        <p className="text-small text-[var(--text-primary)] leading-relaxed max-w-[72ch] text-pretty">{body}</p>
      ) : (
        <p className="text-small text-[var(--text-tertiary)] italic">{empty}</p>
      )}
    </div>
  )
}

function OwnershipChain({ row }: { row: Row }) {
  const { t } = useTranslation()
  const steps = [
    { role: row.data_owner_role, label: t('dataStandard.chain.dataOwner'), icon: UserIcon },
    { role: row.reviewer_role, label: t('dataStandard.chain.reviewer'), icon: ShieldCheck },
    { role: row.approver_role, label: t('dataStandard.chain.approver'), icon: Award },
  ]
  return (
    <div>
      <div className="text-caption font-semibold text-[var(--text-secondary)] mb-2">{t('dataStandard.chain.title')}</div>
      <ol className="flex flex-col sm:flex-row sm:items-center gap-2">
        {steps.map((s, i) => {
          const Icon = s.icon
          return (
            <li key={s.label} className="flex items-center gap-2">
              <div
                className={`inline-flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full border ${
                  s.role ? 'border-[var(--border-default)] bg-[var(--bg-primary)]' : 'border-[var(--status-warning-line)] bg-[var(--status-warning-soft)]'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    s.role ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]' : 'bg-[var(--bg-primary)] text-[var(--status-warning)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden />
                </span>
                <span className="leading-tight">
                  <span className="block text-caption text-[var(--text-tertiary)]">{s.label}</span>
                  <span className="block text-small font-semibold text-[var(--text-primary)] whitespace-nowrap">
                    {s.role ? t(`dataStandard.roles.${s.role}`, { defaultValue: ROLE_LABEL[s.role] ?? s.role }) : t('dataStandard.chain.unassigned')}
                  </span>
                </span>
              </div>
              {i < steps.length - 1 && <ChevronRight className="hidden sm:block w-4 h-4 text-[var(--text-quaternary)]" aria-hidden />}
            </li>
          )
        })}
      </ol>
      <p className="text-caption text-[var(--text-tertiary)] mt-2.5 flex items-start gap-1.5">
        <Clock className="w-3.5 h-3.5 mt-px flex-shrink-0" aria-hidden />
        {t('dataStandard.chain.note')}
      </p>
    </div>
  )
}
