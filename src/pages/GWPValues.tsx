import { Fragment, useMemo, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { Search, Plus, ChevronDown, Download, Copy, Check } from 'lucide-react'
import { Tabs, Button } from '../design-system'
import PageHeader from '../components/PageHeader'
import { useFmt } from '../lib/fmt'
import { StatLedger, EmptyState, ConfirmSheet, notify } from '../components/ui'
import { dur, ease } from '../motion/tokens'
import { CalcField, CalcInput, CalcSelect, Segmented } from '../components/analytics/factors'

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */
interface GWPRecord {
  id: string
  name: string
  formula: string
  casNumber: string
  category: string
  gwp100_ar5: number
  gwp100_ar6: number
  gwp20_ar6: number
  lifetime: string
  source: string
  notes?: string
  isCommon: boolean
  /** Added in this session (not yet in the shared reference table). */
  custom?: boolean
}

/* ═══════════════════════════════════════════
   Reference data — IPCC AR5 & AR6 GWP values
   ═══════════════════════════════════════════ */
const GWP_DATA: GWPRecord[] = [
  // Common GHGs
  { id: 'gwp-001', name: 'Carbon Dioxide', formula: 'CO₂', casNumber: '124-38-9', category: 'Common GHG', gwp100_ar5: 1, gwp100_ar6: 1, gwp20_ar6: 1, lifetime: 'Variable', source: 'IPCC AR6 (2021)', isCommon: true },
  { id: 'gwp-002', name: 'Methane (Fossil)', formula: 'CH₄', casNumber: '74-82-8', category: 'Common GHG', gwp100_ar5: 30, gwp100_ar6: 29.8, gwp20_ar6: 82.5, lifetime: '11.8 years', source: 'IPCC AR6 (2021)', isCommon: true, notes: 'AR6 includes climate-carbon feedback. Fossil vs biogenic distinction introduced.' },
  { id: 'gwp-003', name: 'Methane (Biogenic)', formula: 'CH₄', casNumber: '74-82-8', category: 'Common GHG', gwp100_ar5: 28, gwp100_ar6: 27.0, gwp20_ar6: 80.8, lifetime: '11.8 years', source: 'IPCC AR6 (2021)', isCommon: true, notes: 'Biogenic methane has slightly lower GWP due to carbon cycle accounting.' },
  { id: 'gwp-004', name: 'Nitrous Oxide', formula: 'N₂O', casNumber: '10024-97-2', category: 'Common GHG', gwp100_ar5: 265, gwp100_ar6: 273, gwp20_ar6: 273, lifetime: '109 years', source: 'IPCC AR6 (2021)', isCommon: true },

  // HFCs
  { id: 'gwp-005', name: 'HFC-23', formula: 'CHF₃', casNumber: '75-46-7', category: 'HFC', gwp100_ar5: 12400, gwp100_ar6: 14600, gwp20_ar6: 12400, lifetime: '228 years', source: 'IPCC AR6 (2021)', isCommon: false },
  { id: 'gwp-006', name: 'HFC-32', formula: 'CH₂F₂', casNumber: '75-10-5', category: 'HFC', gwp100_ar5: 677, gwp100_ar6: 771, gwp20_ar6: 2693, lifetime: '5.4 years', source: 'IPCC AR6 (2021)', isCommon: true, notes: 'Used in R-410A blend. Low-GWP alternative to R-22.' },
  { id: 'gwp-007', name: 'HFC-125', formula: 'CHF₂CF₃', casNumber: '354-33-6', category: 'HFC', gwp100_ar5: 3170, gwp100_ar6: 3740, gwp20_ar6: 6740, lifetime: '30 years', source: 'IPCC AR6 (2021)', isCommon: false },
  { id: 'gwp-008', name: 'HFC-134a', formula: 'CH₂FCF₃', casNumber: '811-97-2', category: 'HFC', gwp100_ar5: 1300, gwp100_ar6: 1530, gwp20_ar6: 4144, lifetime: '14 years', source: 'IPCC AR6 (2021)', isCommon: true, notes: 'Most widely used automotive refrigerant. Being phased down under Kigali Amendment.' },
  { id: 'gwp-009', name: 'HFC-143a', formula: 'CH₃CF₃', casNumber: '420-46-2', category: 'HFC', gwp100_ar5: 4800, gwp100_ar6: 5810, gwp20_ar6: 7840, lifetime: '51 years', source: 'IPCC AR6 (2021)', isCommon: false },
  { id: 'gwp-010', name: 'HFC-152a', formula: 'CH₃CHF₂', casNumber: '75-37-6', category: 'HFC', gwp100_ar5: 138, gwp100_ar6: 164, gwp20_ar6: 591, lifetime: '1.6 years', source: 'IPCC AR6 (2021)', isCommon: false },
  { id: 'gwp-011', name: 'HFC-227ea', formula: 'CF₃CHFCF₃', casNumber: '431-89-0', category: 'HFC', gwp100_ar5: 3350, gwp100_ar6: 3600, gwp20_ar6: 5850, lifetime: '36 years', source: 'IPCC AR6 (2021)', isCommon: false },
  { id: 'gwp-012', name: 'HFC-245fa', formula: 'CHF₂CH₂CF₃', casNumber: '460-73-1', category: 'HFC', gwp100_ar5: 858, gwp100_ar6: 962, gwp20_ar6: 2920, lifetime: '7.9 years', source: 'IPCC AR6 (2021)', isCommon: false },

  // PFCs
  { id: 'gwp-013', name: 'PFC-14 (CF₄)', formula: 'CF₄', casNumber: '75-73-0', category: 'PFC', gwp100_ar5: 6630, gwp100_ar6: 7380, gwp20_ar6: 5300, lifetime: '50,000 years', source: 'IPCC AR6 (2021)', isCommon: true, notes: 'Extremely long atmospheric lifetime. Primary PFC from aluminium smelting.' },
  { id: 'gwp-014', name: 'PFC-116 (C₂F₆)', formula: 'C₂F₆', casNumber: '76-16-4', category: 'PFC', gwp100_ar5: 11100, gwp100_ar6: 12400, gwp20_ar6: 8940, lifetime: '10,000 years', source: 'IPCC AR6 (2021)', isCommon: false },
  { id: 'gwp-015', name: 'PFC-218 (C₃F₈)', formula: 'C₃F₈', casNumber: '76-19-7', category: 'PFC', gwp100_ar5: 8900, gwp100_ar6: 9290, gwp20_ar6: 6680, lifetime: '2,600 years', source: 'IPCC AR6 (2021)', isCommon: false },

  // SF₆ & NF₃
  { id: 'gwp-016', name: 'Sulphur Hexafluoride', formula: 'SF₆', casNumber: '2551-62-4', category: 'Fluorinated', gwp100_ar5: 23500, gwp100_ar6: 25200, gwp20_ar6: 18300, lifetime: '3,200 years', source: 'IPCC AR6 (2021)', isCommon: true, notes: 'Highest GWP of any gas measured. Used in electrical switchgear. F-gas regulations apply.' },
  { id: 'gwp-017', name: 'Nitrogen Trifluoride', formula: 'NF₃', casNumber: '7783-54-2', category: 'Fluorinated', gwp100_ar5: 16100, gwp100_ar6: 17400, gwp20_ar6: 13400, lifetime: '569 years', source: 'IPCC AR6 (2021)', isCommon: false },

  // Refrigerant blends
  { id: 'gwp-018', name: 'R-404A (Blend)', formula: 'R-404A', casNumber: 'Blend', category: 'Refrigerant Blend', gwp100_ar5: 3922, gwp100_ar6: 4728, gwp20_ar6: 7476, lifetime: 'N/A', source: 'IPCC AR6 (2021)', isCommon: true, notes: 'HFC-125/143a/134a (44/52/4%). Common in commercial refrigeration. Being phased down.' },
  { id: 'gwp-019', name: 'R-410A (Blend)', formula: 'R-410A', casNumber: 'Blend', category: 'Refrigerant Blend', gwp100_ar5: 1924, gwp100_ar6: 2256, gwp20_ar6: 4710, lifetime: 'N/A', source: 'IPCC AR6 (2021)', isCommon: true, notes: 'HFC-32/125 (50/50%). Standard in air conditioning. R-32 is lower-GWP single-component alternative.' },
  { id: 'gwp-020', name: 'R-407C (Blend)', formula: 'R-407C', casNumber: 'Blend', category: 'Refrigerant Blend', gwp100_ar5: 1624, gwp100_ar6: 1908, gwp20_ar6: 4540, lifetime: 'N/A', source: 'IPCC AR6 (2021)', isCommon: false },
  { id: 'gwp-021', name: 'R-507A (Blend)', formula: 'R-507A', casNumber: 'Blend', category: 'Refrigerant Blend', gwp100_ar5: 3985, gwp100_ar6: 4775, gwp20_ar6: 7290, lifetime: 'N/A', source: 'IPCC AR6 (2021)', isCommon: false },

  // Natural refrigerants (low GWP)
  { id: 'gwp-022', name: 'R-290 (Propane)', formula: 'C₃H₈', casNumber: '74-98-6', category: 'Natural Refrigerant', gwp100_ar5: 3, gwp100_ar6: 0.02, gwp20_ar6: 0.072, lifetime: '12 days', source: 'IPCC AR6 (2021)', isCommon: true, notes: 'Natural refrigerant with near-zero GWP. Flammable (A3 safety class).' },
  { id: 'gwp-023', name: 'R-744 (CO₂)', formula: 'CO₂', casNumber: '124-38-9', category: 'Natural Refrigerant', gwp100_ar5: 1, gwp100_ar6: 1, gwp20_ar6: 1, lifetime: 'Variable', source: 'IPCC AR6 (2021)', isCommon: true },
  { id: 'gwp-024', name: 'R-717 (Ammonia)', formula: 'NH₃', casNumber: '7664-41-7', category: 'Natural Refrigerant', gwp100_ar5: 0, gwp100_ar6: 0, gwp20_ar6: 0, lifetime: 'Days', source: 'IPCC AR6 (2021)', isCommon: true, notes: 'Zero GWP. Toxic and flammable but widely used in industrial refrigeration.' },
]

/* ═══════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════ */
const CATEGORIES = [...new Set(GWP_DATA.map(g => g.category))].sort()

/** Stable category value → i18n key under `gwp.categories`. */
const CATEGORY_KEYS: Record<string, string> = {
  'Common GHG': 'commonGhg',
  'HFC': 'hfc',
  'PFC': 'pfc',
  'Fluorinated': 'fluorinated',
  'Refrigerant Blend': 'refrigerantBlend',
  'Natural Refrigerant': 'naturalRefrigerant',
}

const TAB_CATEGORY: Record<string, string | null> = {
  all: null,
  common: 'Common GHG',
  hfc: 'HFC',
  pfc: 'PFC',
  blends: 'Refrigerant Blend',
  natural: 'Natural Refrigerant',
}

type Horizon = 'gwp100' | 'gwp20'
type Report = 'ar6' | 'ar5'

/* ═══════════════════════════════════════════
   GWP magnitude bar — log scale (0.02 … 25,200 spans six orders of magnitude)
   ═══════════════════════════════════════════ */
function GWPBar({ value, max, index }: { value: number; max: number; index: number }) {
  const f = useFmt()
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const pct = value <= 0 ? 0 : Math.min((Math.log10(value + 1) / Math.log10(max + 1)) * 100, 100)
  const color = value > 10000 ? 'var(--status-danger)' : value > 1000 ? 'var(--status-warning)' : 'var(--chart-s2)'
  return (
    <span ref={ref} className="flex items-center gap-3 min-w-[180px]">
      <span className="font-semibold text-[var(--text-primary)] tabular-nums w-[4.5rem] text-right whitespace-nowrap">{f.number(value, { maxFraction: 3 })}</span>
      <span className="flex-1 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
        <motion.span
          className="block h-full rounded-full"
          style={{ background: color }}
          initial={reduce ? false : { width: '0%' }}
          animate={inView || reduce ? { width: `${pct}%` } : { width: '0%' }}
          transition={{ duration: dur.draw, ease: ease.out, delay: Math.min(index, 8) * 0.03 }}
        />
      </span>
    </span>
  )
}

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */
export default function GWPValues() {
  const { t } = useTranslation()
  const f = useFmt()
  const catLabel = (c: string) => t(`gwp.categories.${CATEGORY_KEYS[c] ?? c}`, { defaultValue: c })
  const gasName = (g: GWPRecord) => (g.custom ? g.name : t(`gwp.gases.${g.id}`, { defaultValue: g.name }))
  const lifetimeLabel = (s: string) => {
    if (s === 'Variable') return t('gwp.lifetime.variable')
    if (s === 'N/A') return t('gwp.na')
    if (s === 'Days') return t('gwp.lifetime.days')
    const m = /^([\d.,]+) (years|days)$/.exec(s)
    if (m) return t(m[2] === 'years' ? 'gwp.lifetime.years' : 'gwp.lifetime.nDays', { n: m[1] })
    return s
  }

  const [custom, setCustom] = useState<GWPRecord[]>([])
  const data = useMemo(() => [...GWP_DATA, ...custom], [custom])
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [horizon, setHorizon] = useState<Horizon>('gwp100')
  const [report, setReport] = useState<Report>('ar6')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const tabs = useMemo(() => Object.keys(TAB_CATEGORY).map(id => ({
    id,
    label: t(`gwp.tabs.${id}`),
    count: TAB_CATEGORY[id] ? data.filter(g => g.category === TAB_CATEGORY[id]).length : data.length,
  })), [data, t])

  /* Max GWP for bar scaling */
  const maxGWP = useMemo(() => Math.max(...data.map(g => Math.max(g.gwp100_ar6, g.gwp20_ar6, g.gwp100_ar5))), [data])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.filter(g => {
      const tc = TAB_CATEGORY[tab]
      if (tc && g.category !== tc) return false
      if (categoryFilter !== 'all' && g.category !== categoryFilter) return false
      if (q) {
        return (
          g.name.toLowerCase().includes(q) ||
          gasName(g).toLowerCase().includes(q) ||
          g.formula.toLowerCase().includes(q) ||
          g.casNumber.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q) ||
          catLabel(g.category).toLowerCase().includes(q)
        )
      }
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, tab, search, categoryFilter, t])

  const valueOf = (g: GWPRecord) => (horizon === 'gwp20' ? g.gwp20_ar6 : report === 'ar6' ? g.gwp100_ar6 : g.gwp100_ar5)
  const columnLabel = horizon === 'gwp100' ? `GWP-100 (${report.toUpperCase()})` : 'GWP-20 (AR6)'

  const handleCopy = async (g: GWPRecord) => {
    const v = valueOf(g)
    try {
      await navigator.clipboard.writeText(String(v))
      setCopiedId(g.id)
      setTimeout(() => setCopiedId(null), 1500)
      notify.success(t('gwp.copied', { name: gasName(g), value: f.number(v, { maxFraction: 3 }), horizon: columnLabel }))
    } catch {
      notify.error(t('gwp.copyFailed'))
    }
  }

  const exportCsv = () => {
    const cols = ['name', 'formula', 'casNumber', 'category', 'gwp100_ar6', 'gwp100_ar5', 'gwp20_ar6', 'lifetime', 'source'] as const
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = [cols.join(','), ...filtered.map(g => cols.map(c => esc(g[c])).join(','))].join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `gwp-values-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    notify.success(t('gwp.exported', { count: filtered.length }))
  }

  /* Summary stats */
  const highGWP = data.filter(g => g.gwp100_ar6 > 1000).length
  const kigaliCount = data.filter(g => g.category === 'HFC' || g.category === 'Refrigerant Blend').length
  const highest = data.reduce((m, g) => (g.gwp100_ar6 > m.gwp100_ar6 ? g : m), data[0])

  const filtersActive = Boolean(search || categoryFilter !== 'all' || tab !== 'all')

  return (
    <div className="page-container">
      <PageHeader
        breadcrumbs={[
          { label: t('gwp.breadcrumbAdmin') },
          { label: t('gwp.title') },
        ]}
        title={t('gwp.title')}
        description={t('gwp.subtitle')}
        actions={
          <>
            <Button variant="secondary" size="lg" icon={<Download className="w-4 h-4" />} onClick={exportCsv} disabled={filtered.length === 0}>
              {t('gwp.actions.exportCsv')}
            </Button>
            <Button size="lg" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>{t('gwp.actions.addGas')}</Button>
          </>
        }
      />

      <div className="space-y-6">
        <StatLedger
          aria-label={t('gwp.kpi.label')}
          items={[
            { id: 'total', label: t('gwp.kpi.totalGases'), value: data.length, tone: 'neutral' },
            { id: 'high', label: t('gwp.kpi.highGwp'), value: highGWP, tone: 'warning', hint: t('gwp.kpi.highGwpHint') },
            { id: 'kigali', label: t('gwp.kpi.kigali'), value: kigaliCount, tone: 'info', hint: t('gwp.kpi.kigaliHint') },
            { id: 'cats', label: t('gwp.kpi.categories'), value: CATEGORIES.length, tone: 'neutral' },
            { id: 'max', label: t('gwp.kpi.highestGwp'), value: highest.gwp100_ar6, format: 'number', tone: 'danger', hint: gasName(highest) },
          ]}
        />

        <section className="surface-paper overflow-hidden" aria-label={t('gwp.tableLabel')}>
          <div className="px-4 sm:px-5 pt-4 pb-3 space-y-3 border-b border-[var(--border-subtle)]">
            <div className="overflow-x-auto -mx-1 px-1">
              <Tabs tabs={tabs} activeTab={tab} onChange={setTab} aria-label={t('gwp.tabsLabel')} className="w-max" />
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" aria-hidden />
                <input
                  type="search"
                  placeholder={t('gwp.searchPlaceholder')}
                  aria-label={t('gwp.searchPlaceholder')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-body text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] outline-none hover:border-[var(--border-strong)] focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--color-brand-soft)] transition-[border-color,box-shadow] duration-micro [&::-webkit-search-cancel-button]:hidden"
                />
              </div>
              <div className="lg:w-[200px]">
                <CalcSelect value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} aria-label={t('gwp.allCategories')}>
                  <option value="all">{t('gwp.allCategories')}</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                </CalcSelect>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Segmented<Horizon>
                  label={t('gwp.horizonLabel')}
                  value={horizon}
                  onChange={setHorizon}
                  options={[{ value: 'gwp100', label: 'GWP-100' }, { value: 'gwp20', label: 'GWP-20' }]}
                />
                {horizon === 'gwp100' && (
                  <Segmented<Report>
                    label={t('gwp.reportLabel')}
                    value={report}
                    onChange={setReport}
                    options={[{ value: 'ar6', label: 'AR6' }, { value: 'ar5', label: 'AR5' }]}
                  />
                )}
              </div>
            </div>
            <p className="text-caption text-[var(--text-tertiary)]" role="status">
              {t('gwp.showing', { shown: filtered.length, total: data.length, horizon: columnLabel })}
            </p>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              variant="filtered"
              density="compact"
              title={t('gwp.empty')}
              onClearFilters={filtersActive ? () => { setSearch(''); setCategoryFilter('all'); setTab('all') } : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('gwp.table.substance')}</th>
                    <th className="hidden sm:table-cell">{t('gwp.table.formula')}</th>
                    <th className="hidden xl:table-cell">{t('gwp.table.cas')}</th>
                    <th className="hidden md:table-cell">{t('gwp.table.category')}</th>
                    <th className="min-w-[220px]"><span className="normal-case">{columnLabel}</span></th>
                    <th className="hidden lg:table-cell">{t('gwp.table.lifetime')}</th>
                    <th className="w-[88px]"><span className="sr-only">{t('common.actions')}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((g, i) => {
                    const open = expanded === g.id
                    const v = valueOf(g)
                    const detailId = `gwp-${g.id}`
                    const change = g.gwp100_ar5 > 0 ? ((g.gwp100_ar6 - g.gwp100_ar5) / g.gwp100_ar5) * 100 : null
                    return (
                      <Fragment key={g.id}>
                        <tr className="cursor-pointer" onClick={() => setExpanded(open ? null : g.id)}>
                          <td>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-[var(--text-primary)]">{gasName(g)}</span>
                              {g.isCommon && <span className="nx-pill" data-tone="neutral" data-size="sm">{t('gwp.commonBadge')}</span>}
                              {g.custom && <span className="nx-pill" data-tone="info" data-size="sm">{t('gwp.sessionBadge')}</span>}
                            </div>
                            <div className="sm:hidden text-caption text-[var(--text-tertiary)] font-mono mt-0.5">{g.formula}</div>
                          </td>
                          <td className="hidden sm:table-cell font-mono text-[var(--text-secondary)] whitespace-nowrap">{g.formula}</td>
                          <td className="hidden xl:table-cell font-mono text-[var(--text-tertiary)] whitespace-nowrap">{g.casNumber === 'Blend' ? t('gwp.blend') : g.casNumber}</td>
                          <td className="hidden md:table-cell"><span className="nx-pill" data-tone="neutral" data-size="sm">{catLabel(g.category)}</span></td>
                          <td><GWPBar value={v} max={maxGWP} index={i} /></td>
                          <td className="hidden lg:table-cell text-[var(--text-tertiary)] whitespace-nowrap">{lifetimeLabel(g.lifetime)}</td>
                          <td className="text-right">
                            <span className="inline-flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); void handleCopy(g) }}
                                className="w-9 h-9 inline-flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                                aria-label={t('gwp.copyGwp')}
                                title={t('gwp.copyGwp')}
                              >
                                {copiedId === g.id ? <Check className="w-4 h-4 text-[var(--status-success)]" /> : <Copy className="w-4 h-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); setExpanded(open ? null : g.id) }}
                                aria-expanded={open}
                                aria-controls={detailId}
                                aria-label={open ? t('gwp.collapse') : t('gwp.expand')}
                                className="w-9 h-9 inline-flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                              >
                                <ChevronDown className={`w-4 h-4 transition-transform duration-fast ${open ? 'rotate-180' : ''}`} />
                              </button>
                            </span>
                          </td>
                        </tr>
                        {open && (
                          <tr id={detailId} className="hover:bg-transparent">
                            <td colSpan={7} className="!py-0">
                              <div className="py-4">
                                <dl className="grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-3 rounded-[var(--radius-md)] bg-[var(--bg-subtle)] px-4 py-3.5">
                                  <Compare label="GWP-100 (AR6)" value={f.number(g.gwp100_ar6, { maxFraction: 3 })} />
                                  <Compare label="GWP-100 (AR5)" value={f.number(g.gwp100_ar5, { maxFraction: 3 })} />
                                  <Compare label="GWP-20 (AR6)" value={f.number(g.gwp20_ar6, { maxFraction: 3 })} />
                                  <div>
                                    <dt className="text-caption text-[var(--text-tertiary)]">{t('gwp.ar5ToAr6Change')}</dt>
                                    <dd className="mt-1">
                                      {change == null ? (
                                        <span className="text-small text-[var(--text-tertiary)]">{t('gwp.na')}</span>
                                      ) : (
                                        <span className="nx-pill" data-tone={change > 0 ? 'warning' : change < 0 ? 'success' : 'neutral'} data-size="sm">
                                          {f.delta(change, { percent: true })}
                                        </span>
                                      )}
                                    </dd>
                                  </div>
                                  <Compare label={t('gwp.source')} value={g.source} plain />
                                  <div className="md:hidden col-span-2 grid grid-cols-2 gap-x-6 gap-y-3">
                                    <Compare label={t('gwp.table.category')} value={catLabel(g.category)} plain />
                                    <Compare label={t('gwp.table.lifetime')} value={lifetimeLabel(g.lifetime)} plain />
                                  </div>
                                  <div className="xl:hidden col-span-2 md:col-span-5">
                                    <Compare label={t('gwp.table.cas')} value={g.casNumber === 'Blend' ? t('gwp.blend') : g.casNumber} plain />
                                  </div>
                                  {g.notes && (
                                    <div className="col-span-2 md:col-span-5">
                                      <dt className="text-caption text-[var(--text-tertiary)]">{t('gwp.notesLabel')}</dt>
                                      <dd className="mt-0.5 text-small text-[var(--text-secondary)]">{g.custom ? g.notes : t(`gwp.notes.${g.id}`, { defaultValue: g.notes })}</dd>
                                    </div>
                                  )}
                                </dl>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="surface-paper overflow-hidden" aria-labelledby="gwp-ref">
          <h2 id="gwp-ref" className="type-h3 text-[var(--text-primary)] px-5 pt-4 pb-2">{t('gwp.reference.title')}</h2>
          <dl className="grid md:grid-cols-3 md:divide-x divide-y md:divide-y-0 divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
            {(['horizon', 'ar', 'kigali'] as const).map(id => (
              <div key={id} className="px-5 py-4">
                <dt className="text-small font-semibold text-[var(--text-primary)]">{t(`gwp.reference.${id}Title`)}</dt>
                <dd className="mt-1 text-small text-[var(--text-secondary)]">{t(`gwp.reference.${id}Desc`)}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <AddGasSheet
        open={showAdd}
        onOpenChange={setShowAdd}
        categories={CATEGORIES}
        catLabel={catLabel}
        onAdd={g => {
          setCustom(c => [...c, g])
          notify.success(t('gwp.added', { name: g.name }), { description: t('gwp.addedSession') })
        }}
      />
    </div>
  )
}

function Compare({ label, value, plain }: { label: string; value: string; plain?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-[var(--text-tertiary)] normal-case">{label}</dt>
      <dd className={`mt-0.5 text-small break-words ${plain ? 'text-[var(--text-secondary)]' : 'font-semibold tabular-nums text-[var(--text-primary)]'}`}>{value}</dd>
    </div>
  )
}

/* ═══════════════════════════════════════════
   Add gas — inline-validated sheet. Adds to this session's table only; the
   reference table itself is maintained centrally.
   ═══════════════════════════════════════════ */
function AddGasSheet({
  open, onOpenChange, onAdd, categories, catLabel,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onAdd: (g: GWPRecord) => void
  categories: string[]
  catLabel: (c: string) => string
}) {
  const { t } = useTranslation()
  const empty = { name: '', formula: '', cas: '', category: categories[0] ?? 'HFC', ar6: '', ar5: '', gwp20: '', lifetime: '' }
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (k: keyof typeof empty, v: string) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  const submit = () => {
    const errs: Record<string, string> = {}
    const req = t('calculators.form.requiredError')
    if (!form.name.trim()) errs.name = req
    if (!form.formula.trim()) errs.formula = req
    for (const k of ['ar6', 'ar5', 'gwp20'] as const) {
      const raw = form[k].trim()
      if (k === 'ar6' && raw === '') { errs[k] = req; continue }
      if (raw !== '' && (!Number.isFinite(Number(raw)) || Number(raw) < 0)) errs[k] = t('calculators.form.number')
    }
    setErrors(errs)
    if (Object.keys(errs).length) throw new Error(t('calculators.form.fixFields'))
    const ar6 = Number(form.ar6)
    onAdd({
      id: `custom-${Date.now()}`,
      name: form.name.trim(),
      formula: form.formula.trim(),
      casNumber: form.cas.trim() || '—',
      category: form.category,
      gwp100_ar6: ar6,
      gwp100_ar5: form.ar5.trim() === '' ? 0 : Number(form.ar5),
      gwp20_ar6: form.gwp20.trim() === '' ? ar6 : Number(form.gwp20),
      lifetime: form.lifetime.trim() || 'N/A',
      source: t('gwp.customSource'),
      isCommon: false,
      custom: true,
    })
    setForm(empty)
  }

  return (
    <ConfirmSheet
      open={open}
      onOpenChange={o => { onOpenChange(o); if (!o) setErrors({}) }}
      size="lg"
      title={t('gwp.modal.title')}
      description={t('gwp.modal.description')}
      confirmLabel={t('gwp.modal.submit')}
      onConfirm={submit}
    >
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <CalcField label={t('gwp.modal.gasName')} required error={errors.name}>
            {p => <CalcInput {...p} value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('gwp.modal.gasNamePlaceholder')} />}
          </CalcField>
          <CalcField label={t('gwp.modal.formula')} required error={errors.formula}>
            {p => <CalcInput {...p} value={form.formula} onChange={e => set('formula', e.target.value)} placeholder={t('gwp.modal.formulaPlaceholder')} />}
          </CalcField>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <CalcField label={t('gwp.modal.cas')}>
            {p => <CalcInput {...p} value={form.cas} onChange={e => set('cas', e.target.value)} placeholder={t('gwp.modal.casPlaceholder')} />}
          </CalcField>
          <CalcField label={t('gwp.modal.category')}>
            {p => (
              <CalcSelect {...p} value={form.category} onChange={e => set('category', e.target.value)}>
                {categories.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
              </CalcSelect>
            )}
          </CalcField>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CalcField label="GWP-100 (AR6)" required error={errors.ar6}>
            {p => <CalcInput {...p} type="number" min={0} step="any" value={form.ar6} onChange={e => set('ar6', e.target.value)} placeholder="0" />}
          </CalcField>
          <CalcField label="GWP-100 (AR5)" error={errors.ar5}>
            {p => <CalcInput {...p} type="number" min={0} step="any" value={form.ar5} onChange={e => set('ar5', e.target.value)} placeholder="0" />}
          </CalcField>
          <CalcField label="GWP-20 (AR6)" error={errors.gwp20}>
            {p => <CalcInput {...p} type="number" min={0} step="any" value={form.gwp20} onChange={e => set('gwp20', e.target.value)} placeholder="0" />}
          </CalcField>
        </div>
        <CalcField label={t('gwp.modal.lifetime')}>
          {p => <CalcInput {...p} value={form.lifetime} onChange={e => set('lifetime', e.target.value)} placeholder={t('gwp.modal.lifetimePlaceholder')} />}
        </CalcField>
      </div>
    </ConfirmSheet>
  )
}

