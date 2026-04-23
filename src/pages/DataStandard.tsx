import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Search, Filter, Calendar, User as UserIcon, ShieldCheck, Award,
  ChevronDown, ChevronRight, Clock, Scale, FileText, Ruler, Calculator as CalcIcon,
} from 'lucide-react'
import { orgStore, type DisclosureStandard } from '../lib/orgStore'
import { useFramework, FRAMEWORKS } from '../lib/frameworks'
import PageHeader from '../components/PageHeader'
import SectionHeader from '../design-system/components/SectionHeader'
import { SkeletonLines } from '../design-system/components/Skeleton'
import { slideInLeft } from '../components/motion'

/**
 * ESG Data Standard — addresses PTTGC priorities #1, #4, #6:
 *   · canonical definition (what counts, what doesn't)
 *   · calc method (how to compute, EF source)
 *   · cadence (daily / monthly / quarterly / annual)
 *   · ownership chain (owner → reviewer → approver)
 *
 * One page, one source of truth across every plant in scope.
 */

const CADENCE_META: Record<string, { label: string; color: string; bg: string }> = {
  daily:     { label: 'Daily',     color: '#1565C0', bg: 'rgba(21,101,192,0.12)' },
  monthly:   { label: 'Monthly',   color: '#5E35B1', bg: 'rgba(94,53,177,0.12)'  },
  quarterly: { label: 'Quarterly', color: '#E6A817', bg: 'rgba(230,168,23,0.12)' },
  annual:    { label: 'Annual',    color: '#2E7D32', bg: 'rgba(46,125,50,0.12)'  },
}

const ROLE_LABEL: Record<string, string> = {
  plant_manager: 'Plant Manager',
  subsidiary_lead: 'Subsidiary Lead',
  group_sustainability_officer: 'Group SO',
  data_contributor: 'Data Contributor',
  narrative_owner: 'Narrative Owner',
  platform_admin: 'Admin',
}

export default function DataStandard() {
  const { active: framework, setActive } = useFramework()
  const [rows, setRows] = useState<DisclosureStandard[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [cadenceFilter, setCadenceFilter] = useState<string>('all')
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    setRows(null); setErr(null)
    orgStore.disclosureStandard(framework.id)
      .then(d => { if (!cancelled) setRows(d) })
      .catch(e => { if (!cancelled) setErr(e instanceof Error ? e.message : 'Load failed') })
    return () => { cancelled = true }
  }, [framework.id])

  const filtered = useMemo(() => {
    if (!rows) return null
    const q = query.trim().toLowerCase()
    return rows.filter(r => {
      if (cadenceFilter !== 'all' && r.cadence !== cadenceFilter) return false
      if (!q) return true
      return (
        r.gri_code.toLowerCase().includes(q) ||
        r.line_item.toLowerCase().includes(q) ||
        (r.definition ?? '').toLowerCase().includes(q) ||
        (r.section ?? '').toLowerCase().includes(q)
      )
    })
  }, [rows, query, cadenceFilter])

  const bySection = useMemo(() => {
    if (!filtered) return [] as Array<{ section: string; rows: DisclosureStandard[] }>
    const m = new Map<string, DisclosureStandard[]>()
    for (const r of filtered) {
      const k = r.section || 'Other'
      const arr = m.get(k) ?? []
      arr.push(r); m.set(k, arr)
    }
    return Array.from(m.entries()).map(([section, rows]) => ({ section, rows }))
  }, [filtered])

  const stats = useMemo(() => {
    if (!rows) return null
    const total = rows.length
    const withDef = rows.filter(r => r.definition).length
    const withMethod = rows.filter(r => r.calc_method).length
    const withOwner = rows.filter(r => r.data_owner_role).length
    return { total, withDef, withMethod, withOwner, defPct: Math.round((withDef / total) * 100) }
  }, [rows])

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Data Governance"
        title="ESG Data Standard"
        subtitle="One company-wide definition, one calculation method, one cadence, one ownership chain per disclosure. This is how comparability is enforced across plants."
        actions={
          <div className="flex gap-1.5 flex-wrap">
            {FRAMEWORKS.filter(f => f.status === 'active').map(f => (
              <button
                key={f.id}
                onClick={() => setActive(f.id)}
                className={`chip ${framework.id === f.id ? 'chip-active' : ''}`}
                style={{ background: framework.id === f.id ? `${f.color}15` : undefined, color: framework.id === f.id ? f.color : undefined }}
              >
                {f.code}
              </button>
            ))}
          </div>
        }
      />

      {/* Standard coverage stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <StatTile icon={FileText} label="Disclosures" value={stats.total} tone="teal" />
          <StatTile icon={BookOpen} label="Definitions on file" value={`${stats.defPct}%`} sub={`${stats.withDef} of ${stats.total}`} tone="blue" />
          <StatTile icon={CalcIcon} label="Calc methods" value={stats.withMethod} tone="purple" />
          <StatTile icon={UserIcon} label="Ownership chains" value={stats.withOwner} tone="green" />
        </div>
      )}

      {/* Search + filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 relative min-w-[280px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by code, line item, or definition…"
            className="w-full pl-9 pr-3 h-10 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/15 outline-none transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
          <select
            value={cadenceFilter}
            onChange={e => setCadenceFilter(e.target.value)}
            className="pl-9 pr-8 h-10 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[12.5px] font-medium appearance-none cursor-pointer"
          >
            <option value="all">All cadences</option>
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
        </div>
      </div>

      {err && <div className="surface-paper p-5 text-[var(--accent-red)]">{err}</div>}

      {!rows && (
        <div className="surface-paper p-8 space-y-3">
          <SkeletonLines lines={3} />
        </div>
      )}

      {rows && filtered && (
        <section>
          <SectionHeader
            kicker="Catalog"
            title={`${filtered.length} disclosures · ${framework.code}`}
            subtitle="Click any row to open the full definition, calculation method, and ownership chain."
          />
          <div className="space-y-6">
            {bySection.map(sec => (
              <motion.div
                key={sec.section}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="surface-paper overflow-hidden"
              >
                <header className="px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex items-center justify-between">
                  <h3 className="font-display text-[14px] font-bold text-[var(--text-primary)] tracking-[-0.01em]">
                    {sec.section}
                  </h3>
                  <span className="text-[11px] text-[var(--text-tertiary)] font-semibold uppercase tracking-[0.12em] tabular-nums">
                    {sec.rows.length} disclosure{sec.rows.length !== 1 ? 's' : ''}
                  </span>
                </header>
                <ul className="divide-y divide-[var(--border-subtle)]">
                  {sec.rows.map((r, i) => {
                    const key = r.gri_code + '|' + r.line_item
                    const open = openIds.has(key)
                    return (
                      <StandardRow
                        key={key}
                        row={r}
                        open={open}
                        toggle={() => setOpenIds(prev => {
                          const next = new Set(prev)
                          next.has(key) ? next.delete(key) : next.add(key)
                          return next
                        })}
                        index={i}
                      />
                    )
                  })}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatTile({ icon: Icon, label, value, sub, tone }: { icon: typeof FileText; label: string; value: string | number; sub?: string; tone: 'teal' | 'blue' | 'purple' | 'green' }) {
  const palette = {
    teal:   { fg: '#1B6B7B', bg: 'rgba(27,107,123,0.10)' },
    blue:   { fg: '#1565C0', bg: 'rgba(21,101,192,0.10)' },
    purple: { fg: '#5E35B1', bg: 'rgba(94,53,177,0.10)' },
    green:  { fg: '#2E7D32', bg: 'rgba(46,125,50,0.10)' },
  }[tone]
  return (
    <div className="surface-paper p-4 relative overflow-hidden">
      <span aria-hidden className="absolute -top-8 -right-8 w-24 h-24 rounded-full" style={{ background: `radial-gradient(circle, ${palette.fg}1f, transparent 60%)` }} />
      <div className="flex items-start gap-3 relative">
        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: palette.bg, color: palette.fg }}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10.5px] uppercase tracking-[0.12em] font-bold text-[var(--text-tertiary)]">{label}</div>
          <div className="text-[22px] font-display font-bold text-[var(--text-primary)] tracking-[-0.015em] tabular-nums mt-0.5">{value}</div>
          {sub && <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{sub}</div>}
        </div>
      </div>
    </div>
  )
}

function StandardRow({ row, open, toggle, index }: { row: DisclosureStandard; open: boolean; toggle: () => void; index: number }) {
  const cad = row.cadence ? CADENCE_META[row.cadence] : null

  return (
    <motion.li {...slideInLeft(index)}>
      <button
        type="button"
        onClick={toggle}
        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-[var(--bg-secondary)] transition-colors group"
      >
        <span className="text-[var(--text-tertiary)] flex-shrink-0">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10.5px] font-bold text-[var(--color-brand)] tracking-[0.02em]">{row.gri_code}</span>
            <span className="text-[13.5px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">{row.line_item}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            {row.unit && (
              <span className="chip">
                <Ruler className="w-3 h-3" />
                <strong className="text-[var(--text-primary)]">{row.unit}</strong>
              </span>
            )}
            {cad && (
              <span className="chip" style={{ background: cad.bg, color: cad.color, borderColor: cad.color + '33' }}>
                <Calendar className="w-3 h-3" />
                {cad.label}
              </span>
            )}
            {row.definition && (
              <span className="chip" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)', borderColor: 'rgba(27,107,123,0.2)' }}>
                <BookOpen className="w-3 h-3" />
                Definition
              </span>
            )}
            {row.calc_method && (
              <span className="chip" style={{ background: 'var(--accent-purple-light)', color: 'var(--accent-purple)', borderColor: 'rgba(94,53,177,0.2)' }}>
                <CalcIcon className="w-3 h-3" />
                Method
              </span>
            )}
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pl-[44px] space-y-4">
              {row.definition && (
                <DetailBlock icon={BookOpen} label="Canonical definition" color="#1B6B7B" body={row.definition} />
              )}
              {row.calc_method && (
                <DetailBlock icon={CalcIcon} label="Calculation method" color="#5E35B1" body={row.calc_method} />
              )}
              <OwnershipChain row={row} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}

function DetailBlock({ icon: Icon, label, color, body }: { icon: typeof BookOpen; label: string; color: string; body: string }) {
  return (
    <div className="relative pl-4">
      <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full" style={{ background: color, opacity: 0.35 }} />
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span className="text-[10.5px] uppercase tracking-[0.12em] font-bold" style={{ color }}>{label}</span>
      </div>
      <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed">{body}</p>
    </div>
  )
}

function OwnershipChain({ row }: { row: DisclosureStandard }) {
  const steps = [
    { role: row.data_owner_role, label: 'Data owner', icon: UserIcon, color: '#1B6B7B' },
    { role: row.reviewer_role,   label: 'Reviewer',   icon: ShieldCheck, color: '#1565C0' },
    { role: row.approver_role,   label: 'Approver',   icon: Award, color: '#2E7D32' },
  ]
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Scale className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
        <span className="text-[10.5px] uppercase tracking-[0.12em] font-bold text-[var(--text-tertiary)]">Ownership chain</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {steps.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="flex items-center gap-2">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] border"
                style={{ borderColor: s.color + '33', background: s.color + '0f' }}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: s.color }}>
                  <Icon className="w-3 h-3" />
                </div>
                <div>
                  <div className="text-[9.5px] uppercase tracking-[0.1em] font-bold" style={{ color: s.color }}>{s.label}</div>
                  <div className="text-[12px] font-semibold text-[var(--text-primary)] -mt-0.5">
                    {s.role ? ROLE_LABEL[s.role] ?? s.role : <span className="italic text-[var(--text-tertiary)]">unassigned</span>}
                  </div>
                </div>
              </div>
              {i < steps.length - 1 && (
                <span className="text-[var(--text-quaternary)]">
                  <ChevronRight className="w-4 h-4" />
                </span>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-[10.5px] text-[var(--text-tertiary)] mt-2.5 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Submissions route through each role in order. Every transition is hash-chained for audit.
      </p>
    </div>
  )
}
