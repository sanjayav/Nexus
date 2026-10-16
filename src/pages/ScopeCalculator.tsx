import { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import { Shield, ChevronDown, ChevronRight, Save, Download, Upload, Info, X, Pencil } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts'
import {
  monthlyEmissions2026,
  scope1Sources,
  scope2Sources,
  scope3Categories,
  type MonthlyEmission,
} from '../data/demoData'
import BlockchainProof from '../components/BlockchainProof'
import PageHeader from '../components/PageHeader'
import { Button } from '../design-system'
import { StatLedger, StatusPill, notify } from '../components/ui'
import ChartFrame, { useChartTheme, chartColors, endLabel } from '../components/ui/ChartFrame'
import { useFmt } from '../lib/fmt'
import { dur, ease, spring, staggerDelay } from '../motion/tokens'
import useOrgMarket from '../components/analytics/useOrgMarket'
import { RegionFactorPanel, CalcSelect } from '../components/analytics/factors'

type ScopeTab = 'scope1' | 'scope2' | 'scope3'
type MonthStatus = MonthlyEmission['status']

/** Demo month status → the one status encoding (StatusPill tone). */
const STATUS_TONE: Record<string, 'success' | 'info' | 'neutral' | 'warning'> = {
  verified: 'success',
  submitted: 'info',
  draft: 'neutral',
  pending: 'warning',
}

const SCOPE_COLOR: Record<ScopeTab, string> = {
  scope1: chartColors.s1,
  scope2: chartColors.s2,
  scope3: chartColors.s3,
}

// Facility names are demo entity names (not translated); only the 'all'
// option is a UI label and is localised at render time.
const FACILITIES = [
  { id: 'all', name: 'All Facilities', factor: 1.0 },
  { id: 'mtp-olefins', name: 'Map Ta Phut Olefins', factor: 0.35 },
  { id: 'mtp-aromatics', name: 'Map Ta Phut Aromatics', factor: 0.22 },
  { id: 'rayong', name: 'Rayong Refinery', factor: 0.18 },
  { id: 'nonthaburi', name: 'Nonthaburi Office', factor: 0.03 },
  { id: 'tp-ethylene', name: 'Thai Polyethylene', factor: 0.12 },
  { id: 'phenol', name: 'Phenol Plant', factor: 0.10 },
]

// Emission factors for methodology panel
const EMISSION_FACTORS = {
  scope1: [
    { id: 'naturalGas', source: 'Natural Gas', factor: '56.1 kgCO₂e/GJ', method: 'IPCC 2006 GL' },
    { id: 'fuelOil', source: 'Fuel Oil', factor: '77.4 kgCO₂e/GJ', method: 'IPCC 2006 GL' },
    { id: 'diesel', source: 'Diesel', factor: '74.1 kgCO₂e/GJ', method: 'IPCC 2006 GL' },
    { id: 'gasoline', source: 'Gasoline', factor: '69.3 kgCO₂e/GJ', method: 'IPCC 2006 GL' },
    { id: 'ethyleneCracking', source: 'Ethylene Cracking', factor: '1.04 tCO₂e/t product', method: 'API Compendium' },
    { id: 'fugitiveCh4', source: 'Fugitive CH₄', factor: 'GWP = 28 (AR5)', method: 'IPCC AR5' },
  ],
  scope2: [
    { id: 'gridElectricity', source: 'Thailand Grid Electricity', factor: '0.4999 tCO₂e/MWh', method: 'TGO 2023 EF (Location)' },
    { id: 'marketRe', source: 'Market-Based (RE)', factor: '0.0 tCO₂e/MWh', method: 'RE100 / I-REC' },
    { id: 'purchasedSteam', source: 'Purchased Steam', factor: '0.0822 tCO₂e/GJ', method: 'Supplier specific' },
    { id: 'districtCooling', source: 'District Cooling', factor: '0.67 kgCO₂e/kWh(th)', method: 'IEA EF (2023)' },
  ],
  scope3: [
    { id: 'cat1', source: 'Cat 1 — Purchased Goods', factor: 'Spend-based + hybrid', method: 'GHG Protocol Cat 1' },
    { id: 'cat4', source: 'Cat 4 — Transport', factor: 'Distance-based', method: 'GLEC Framework' },
    { id: 'cat11', source: 'Cat 11 — Use of Sold Products', factor: 'Product-specific LCA', method: 'ISO 14040 / ecoinvent' },
    { id: 'cat12', source: 'Cat 12 — End-of-Life', factor: 'Waste-type method', method: 'EPA WARM v16' },
  ],
}

// Display helper: month abbreviations in demo data ('Jan'…'Dec') are stable
// keys; translate only for display.
function monthLabel(t: TFunction, month: string): string {
  return t(`scopeCalc.months.${month}`, { defaultValue: month })
}

function monthYearLabel(t: TFunction, month: string, year = 2026): string {
  return t('scopeCalc.monthYear', { month: monthLabel(t, month), year })
}

/**
 * Emissions calculator (demo dataset) — monthly Scope 1/2/3 collection with
 * source-level edits, cumulative totals and per-month submission. China-
 * market orgs see the MEE grid factors alongside the Scope 2 sources.
 */
export default function ScopeCalculator() {
  const { t } = useTranslation()
  const f = useFmt()
  const ct = useChartTheme()
  const market = useOrgMarket()
  const [activeScope, setActiveScope] = useState<ScopeTab>('scope1')
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, number>>({})
  const [proofOpen, setProofOpen] = useState(false)
  const [proofData, setProofData] = useState({ dataPoint: '', facility: '' })
  const [selectedFacility, setSelectedFacility] = useState('all')
  const [showMethodology, setShowMethodology] = useState(false)
  const [submittingMonths, setSubmittingMonths] = useState<Set<number>>(new Set())
  const [monthStatuses, setMonthStatuses] = useState<Record<number, MonthStatus>>({})
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const facilityFactor = FACILITIES.find(x => x.id === selectedFacility)?.factor ?? 1.0

  // Get effective value (edited or original)
  const getVal = (month: number, key: string, original: number) => {
    const k = `${month}-${key}`
    return editValues[k] !== undefined ? editValues[k] : Math.round(original * facilityFactor)
  }

  const handleEdit = (month: number, key: string, value: number) => {
    setEditValues(prev => ({ ...prev, [`${month}-${key}`]: value }))
    setHasUnsavedChanges(true)
  }

  const openProof = (dataPoint: string) => {
    setProofData({
      dataPoint,
      facility: selectedFacility === 'all' ? t('scopeCalc.facilities.allProof') : FACILITIES.find(x => x.id === selectedFacility)?.name || '',
    })
    setProofOpen(true)
  }

  const getMonthStatus = (m: MonthlyEmission): MonthStatus => monthStatuses[m.monthIndex] ?? m.status

  // Apply facility factor to monthly data
  const adjustedMonthly = useMemo(() => {
    return monthlyEmissions2026.map(m => {
      const s1 = {
        process: getVal(m.monthIndex, 'process', m.scope1.process),
        combustion: getVal(m.monthIndex, 'combustion', m.scope1.combustion),
        mobile: getVal(m.monthIndex, 'mobile', m.scope1.mobile),
        fugitive: getVal(m.monthIndex, 'fugitive', m.scope1.fugitive),
      }
      const s2 = {
        electricity: getVal(m.monthIndex, 'electricity', m.scope2.electricity),
        steam: getVal(m.monthIndex, 'steam', m.scope2.steam),
        cooling: getVal(m.monthIndex, 'cooling', m.scope2.cooling),
      }
      const s3 = {
        cat1: getVal(m.monthIndex, 'cat1', m.scope3.cat1),
        cat2: getVal(m.monthIndex, 'cat2', m.scope3.cat2),
        cat3: getVal(m.monthIndex, 'cat3', m.scope3.cat3),
        cat4: getVal(m.monthIndex, 'cat4', m.scope3.cat4),
        cat5: getVal(m.monthIndex, 'cat5', m.scope3.cat5),
        cat6: getVal(m.monthIndex, 'cat6', m.scope3.cat6),
        cat7: getVal(m.monthIndex, 'cat7', m.scope3.cat7),
        cat11: getVal(m.monthIndex, 'cat11', m.scope3.cat11),
        cat12: getVal(m.monthIndex, 'cat12', m.scope3.cat12),
      }
      const scope1 = { ...s1, total: s1.process + s1.combustion + s1.mobile + s1.fugitive }
      const scope2 = { ...s2, total: s2.electricity + s2.steam + s2.cooling, marketBased: Math.round(m.scope2.marketBased * facilityFactor) }
      const scope3 = { ...s3, total: Object.values(s3).reduce((a, b) => a + b, 0) }
      return {
        ...m,
        scope1,
        scope2,
        scope3,
        total: scope1.total + scope2.total + scope3.total,
        productionVolume: Math.round(m.productionVolume * facilityFactor),
        status: getMonthStatus(m),
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityFactor, editValues, monthStatuses])

  // Cumulative data
  const cumulativeData = useMemo(() => {
    let c1 = 0, c2 = 0, c3 = 0, ct0 = 0
    return adjustedMonthly.map(m => {
      c1 += m.scope1.total
      c2 += m.scope2.total
      c3 += m.scope3.total
      ct0 += m.total
      return { month: m.month, scope1: c1, scope2: c2, scope3: c3, total: ct0 }
    })
  }, [adjustedMonthly])

  const monthlyChartData = adjustedMonthly.map(m => ({ month: m.month, scope1: m.scope1.total, scope2: m.scope2.total, scope3: m.scope3.total }))

  const annualScope1 = adjustedMonthly.reduce((s, m) => s + m.scope1.total, 0)
  const annualScope2 = adjustedMonthly.reduce((s, m) => s + m.scope2.total, 0)
  const annualScope3 = adjustedMonthly.reduce((s, m) => s + m.scope3.total, 0)
  const annualTotal = annualScope1 + annualScope2 + annualScope3
  const production = adjustedMonthly.reduce((s, m) => s + m.productionVolume, 0)

  // Source breakdown for the active scope (bar ledger, replaces the donut)
  const sourceData = useMemo(() => {
    const sum = (fn: (m: (typeof adjustedMonthly)[number]) => number) => adjustedMonthly.reduce((s, m) => s + fn(m), 0)
    if (activeScope === 'scope1') {
      return [
        { key: 'process', value: sum(m => m.scope1.process) },
        { key: 'combustion', value: sum(m => m.scope1.combustion) },
        { key: 'mobile', value: sum(m => m.scope1.mobile) },
        { key: 'fugitive', value: sum(m => m.scope1.fugitive) },
      ]
    }
    if (activeScope === 'scope2') {
      return [
        { key: 'electricity', value: sum(m => m.scope2.electricity) },
        { key: 'steam', value: sum(m => m.scope2.steam) },
        { key: 'cooling', value: sum(m => m.scope2.cooling) },
      ]
    }
    return [
      { key: 'cat1', value: sum(m => m.scope3.cat1) },
      { key: 'cat4', value: sum(m => m.scope3.cat4) },
      { key: 'cat11', value: sum(m => m.scope3.cat11) },
      { key: 'others', value: sum(m => m.scope3.cat2 + m.scope3.cat3 + m.scope3.cat5 + m.scope3.cat6 + m.scope3.cat7 + m.scope3.cat12) },
    ]
  }, [adjustedMonthly, activeScope])

  const statusOf = (i: number) => monthStatuses[i] ?? monthlyEmissions2026[i].status
  const verifiedCount = adjustedMonthly.filter(m => statusOf(m.monthIndex) === 'verified').length
  const submittedCount = adjustedMonthly.filter(m => statusOf(m.monthIndex) === 'submitted').length
  const draftCount = adjustedMonthly.filter(m => statusOf(m.monthIndex) === 'draft').length

  const handleSubmitMonth = (monthIndex: number) => {
    setSubmittingMonths(prev => new Set(prev).add(monthIndex))
    setTimeout(() => {
      setMonthStatuses(prev => ({ ...prev, [monthIndex]: 'submitted' }))
      setSubmittingMonths(prev => {
        const next = new Set(prev)
        next.delete(monthIndex)
        return next
      })
      notify.success(t('scopeCalc.toast.monthSubmitted', { month: monthYearLabel(t, monthlyEmissions2026[monthIndex].month) }))
    }, 1200)
  }

  const handleSubmitAll = () => {
    const drafts = adjustedMonthly.filter(m => statusOf(m.monthIndex) === 'draft')
    if (drafts.length === 0) {
      notify.info(t('scopeCalc.toast.allAlreadySubmitted'))
      return
    }
    setSubmittingMonths(new Set(drafts.map(m => m.monthIndex)))
    setTimeout(() => {
      const updates: Record<number, MonthStatus> = {}
      drafts.forEach(m => { updates[m.monthIndex] = 'submitted' })
      setMonthStatuses(prev => ({ ...prev, ...updates }))
      setSubmittingMonths(new Set())
      setHasUnsavedChanges(false)
      notify.success(t('scopeCalc.toast.monthsSubmitted', { count: drafts.length }))
    }, 1500)
  }

  const handleSaveDraft = () => {
    setHasUnsavedChanges(false)
    notify.success(t('scopeCalc.toast.draftSaved'))
  }

  const handleExport = (format: string) => {
    setShowExportMenu(false)
    notify.promise(new Promise(r => setTimeout(r, 1500)), {
      loading: t('scopeCalc.toast.exporting', { scope: t(`scopeCalc.scope.${activeScope}`), format }),
      success: t('scopeCalc.toast.downloaded', { format: format.toUpperCase() }),
      error: t('scopeCalc.toast.exportFailed'),
    })
  }

  const scopeTabs = [
    { id: 'scope1' as const, total: annualScope1 },
    { id: 'scope2' as const, total: annualScope2 },
    { id: 'scope3' as const, total: annualScope3 },
  ]

  const lastIdx = cumulativeData.length - 1
  const lineEnd = (name: string, color: string) => endLabel(name, color, lastIdx)

  return (
    <div className="page-container">
      <BlockchainProof isOpen={proofOpen} onClose={() => setProofOpen(false)} dataPoint={proofData.dataPoint} facility={proofData.facility} />

      <PageHeader
        title={t('scopeCalc.title')}
        description={t('scopeCalc.subtitle')}
        actions={
          <>
            <Button variant="secondary" size="lg" icon={<Info className="w-4 h-4" />} onClick={() => setShowMethodology(true)}>
              {t('scopeCalc.methodology')}
            </Button>
            <div className="w-[220px]">
              <CalcSelect value={selectedFacility} onChange={e => setSelectedFacility(e.target.value)} aria-label={t('scopeCalc.facilityLabel')}>
                {FACILITIES.map(x => <option key={x.id} value={x.id}>{x.id === 'all' ? t('scopeCalc.facilities.all') : x.name}</option>)}
              </CalcSelect>
            </div>
            <span className="nx-pill" data-tone="neutral">{t('scopeCalc.fy', { year: 2026 })}</span>
          </>
        }
      />

      <div className="space-y-6">
        {/* Scope selector — each scope's annual total; selecting drives the charts and table */}
        <div role="tablist" aria-label={t('scopeCalc.scopeTabs')} className="surface-paper overflow-hidden grid grid-cols-1 sm:grid-cols-4 gap-px bg-[var(--border-subtle)]">
          {scopeTabs.map(s => {
            const on = activeScope === s.id
            const share = annualTotal ? s.total / annualTotal : 0
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setActiveScope(s.id)}
                className={`relative text-left px-5 py-4 bg-[var(--bg-primary)] transition-colors duration-micro ${on ? '' : 'hover:bg-[var(--bg-hover)]'}`}
              >
                {on && <motion.span layoutId="scope-calc-active" transition={spring.snappy} className="absolute inset-x-0 top-0 h-[2px] bg-[var(--color-brand)]" aria-hidden />}
                <span className="flex items-center gap-2 text-caption font-medium text-[var(--text-tertiary)]">
                  <span className="w-2 h-2 rounded-full" style={{ background: SCOPE_COLOR[s.id] }} aria-hidden />
                  {t(`scopeCalc.scope.${s.id}`)} · {t(`scopeCalc.scopeSub.${s.id}`)}
                </span>
                <span className="mt-2 flex items-baseline gap-1.5">
                  <span className="type-figure text-[26px] leading-8 text-[var(--text-primary)]">{f.compact(s.total)}</span>
                  <span className="text-small text-[var(--text-tertiary)]">tCO₂e</span>
                </span>
                <span className="mt-2 block h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                  <span className="block h-full rounded-full" style={{ width: `${share * 100}%`, background: SCOPE_COLOR[s.id] }} />
                </span>
                <span className="mt-1.5 block text-caption text-[var(--text-tertiary)]">{t('scopeCalc.pctOfTotal', { pct: f.number(share * 100, { precision: 1 }) })}</span>
              </button>
            )
          })}
          <div className="px-5 py-4 bg-[var(--bg-primary)]">
            <span className="text-caption font-medium text-[var(--text-tertiary)]">{t('scopeCalc.total')}</span>
            <span className="mt-2 flex items-baseline gap-1.5">
              <span className="type-figure text-[26px] leading-8 text-[var(--text-primary)]">{f.compact(annualTotal)}</span>
              <span className="text-small text-[var(--text-tertiary)]">tCO₂e</span>
            </span>
            <span className="mt-2 flex items-center gap-1.5 flex-wrap">
              <StatusPill tone="success" size="sm">{verifiedCount} {t('scopeCalc.status.verified')}</StatusPill>
              <StatusPill tone="info" size="sm">{submittedCount} {t('scopeCalc.status.submitted')}</StatusPill>
              <StatusPill tone="neutral" size="sm">{draftCount} {t('scopeCalc.status.draft')}</StatusPill>
            </span>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <ChartFrame
            className="lg:col-span-2"
            title={t('scopeCalc.charts.monthlyTitle')}
            subtitle={t('scopeCalc.charts.monthlySub')}
            height={280}
            legend={(['scope1', 'scope2', 'scope3'] as const).map(k => ({ label: t(`scopeCalc.scope.${k}`), color: SCOPE_COLOR[k] }))}
          >
            <BarChart data={monthlyChartData} margin={ct.margin} barCategoryGap="28%">
              <CartesianGrid {...ct.grid} />
              <XAxis dataKey="month" {...ct.xAxis} tickFormatter={(m: string) => monthLabel(t, m)} />
              <YAxis {...ct.yAxis} />
              <Tooltip {...ct.tooltip({ unit: 'tCO2e', labelFormat: m => monthYearLabel(t, String(m)) })} />
              <Bar dataKey="scope1" stackId="a" fill={chartColors.s1} name={t('scopeCalc.scope.scope1')} {...ct.bar} radius={[0, 0, 0, 0]} />
              <Bar dataKey="scope2" stackId="a" fill={chartColors.s2} name={t('scopeCalc.scope.scope2')} {...ct.bar} radius={[0, 0, 0, 0]} />
              <Bar dataKey="scope3" stackId="a" fill={chartColors.s3} name={t('scopeCalc.scope.scope3')} {...ct.bar} />
            </BarChart>
          </ChartFrame>

          <SourceLedger
            title={t('scopeCalc.charts.sourcesTitle', { scope: t(`scopeCalc.scope.${activeScope}`) })}
            subtitle={t('scopeCalc.charts.sourcesSub')}
            rows={sourceData.map(d => ({ key: d.key, label: t(`scopeCalc.pie.${d.key}`), value: d.value }))}
            color={SCOPE_COLOR[activeScope]}
          />
        </div>

        {activeScope === 'scope2' && market.isCn && <RegionFactorPanel layout="wide" linkToLibrary />}

        <ChartFrame
          title={t('scopeCalc.charts.cumulativeTitle')}
          subtitle={t('scopeCalc.charts.cumulativeSub')}
          height={260}
        >
          <LineChart data={cumulativeData} margin={{ ...ct.margin, right: 84 }}>
            <CartesianGrid {...ct.grid} />
            <XAxis dataKey="month" {...ct.xAxis} tickFormatter={(m: string) => monthLabel(t, m)} />
            <YAxis {...ct.yAxis} />
            <Tooltip {...ct.tooltip({ unit: 'tCO2e', labelFormat: m => monthYearLabel(t, String(m)) })} />
            <Line type="monotone" dataKey="scope1" stroke={chartColors.s1} name={t('scopeCalc.scope.scope1')} {...ct.series} label={lineEnd(t('scopeCalc.scope.scope1'), chartColors.s1)} />
            <Line type="monotone" dataKey="scope2" stroke={chartColors.s2} name={t('scopeCalc.scope.scope2')} {...ct.series} label={lineEnd(t('scopeCalc.scope.scope2'), chartColors.s2)} />
            <Line type="monotone" dataKey="scope3" stroke={chartColors.s3} name={t('scopeCalc.scope.scope3')} {...ct.series} label={lineEnd(t('scopeCalc.scope.scope3'), chartColors.s3)} />
            <Line type="monotone" dataKey="total" stroke={chartColors.ink} name={t('scopeCalc.total')} {...ct.series} strokeWidth={2.5} label={lineEnd(t('scopeCalc.total'), chartColors.ink)} />
          </LineChart>
        </ChartFrame>

        {/* Monthly data collection */}
        <section className="surface-paper overflow-hidden" aria-labelledby="scope-table">
          <div className="px-5 pt-5 pb-4 flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div className="min-w-0">
              <h2 id="scope-table" className="type-h3 text-[var(--text-primary)]">{t(`scopeCalc.scopeHeading.${activeScope}`)}</h2>
              <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('scopeCalc.table.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {hasUnsavedChanges && (
                <Button variant="secondary" size="md" icon={<Save className="w-4 h-4" />} onClick={handleSaveDraft}>{t('scopeCalc.table.saveDraft')}</Button>
              )}
              <ExportMenu open={showExportMenu} onOpenChange={setShowExportMenu} onPick={handleExport} />
              <Button size="md" icon={<Upload className="w-4 h-4" />} onClick={handleSubmitAll}>{t('scopeCalc.table.submitAll')}</Button>
            </div>
          </div>

          <div className="overflow-x-auto border-t border-[var(--border-subtle)]">
            <table className="data-table min-w-[860px]">
              <thead>
                <tr>
                  <th className="w-8"><span className="sr-only">{t('scopeCalc.table.expand')}</span></th>
                  <th>{t('scopeCalc.table.month')}</th>
                  {activeScope === 'scope1' && scope1Sources.map(s => (
                    <th key={s.id} className="num">{t(`scopeCalc.sources.${s.id}.short`, { defaultValue: s.label.split(' ')[0] })}</th>
                  ))}
                  {activeScope === 'scope2' && scope2Sources.map(s => (
                    <th key={s.id} className="num">{t(`scopeCalc.sources.${s.id}.short`, { defaultValue: s.label.replace('Purchased ', '') })}</th>
                  ))}
                  {activeScope === 'scope3' && (['cat1', 'cat4', 'cat11', 'others'] as const).map(k => (
                    <th key={k} className="num">{t(`scopeCalc.pie.${k}`)}</th>
                  ))}
                  <th className="num">{t('scopeCalc.table.total')}</th>
                  <th className="num">{t('scopeCalc.table.cumulative')}</th>
                  <th>{t('scopeCalc.table.status')}</th>
                  <th className="w-20"><span className="sr-only">{t('scopeCalc.table.actions')}</span></th>
                </tr>
              </thead>
              <tbody>
                {adjustedMonthly.map((m, i) => {
                  const isExpanded = expandedMonth === i
                  const cumRow = cumulativeData[i]
                  const scopeTotal = m[activeScope].total
                  const cumVal = cumRow[activeScope]
                  const effectiveStatus = statusOf(i)
                  return (
                    <MonthRow
                      key={m.month}
                      month={m}
                      isExpanded={isExpanded}
                      onToggle={() => setExpandedMonth(isExpanded ? null : i)}
                      activeScope={activeScope}
                      scopeTotal={scopeTotal}
                      cumVal={cumVal}
                      effectiveStatus={effectiveStatus}
                      isSubmitting={submittingMonths.has(i)}
                      onSubmit={() => handleSubmitMonth(i)}
                      onProof={() => openProof(t('scopeCalc.proofDataPoint', { scope: t(`scopeCalc.scope.${activeScope}`), month: monthYearLabel(t, m.month) }))}
                      getVal={getVal}
                      handleEdit={handleEdit}
                      editingCell={editingCell}
                      setEditingCell={setEditingCell}
                    />
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-[var(--border-default)] bg-[var(--bg-subtle)]">
                  <td />
                  <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">{t('scopeCalc.table.annualTotal')}</td>
                  {sourceData.map(d => (
                    <td key={d.key} className="py-3 px-3 text-right tabular-nums font-semibold text-[var(--text-primary)]">{f.number(d.value)}</td>
                  ))}
                  <td className="py-3 px-3 text-right tabular-nums font-semibold text-[var(--text-primary)]">{f.number(activeScope === 'scope1' ? annualScope1 : activeScope === 'scope2' ? annualScope2 : annualScope3)}</td>
                  <td />
                  <td className="py-3 px-3 text-caption text-[var(--text-tertiary)] whitespace-nowrap">{t('scopeCalc.table.verifiedOf12', { count: verifiedCount })}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <StatLedger
          aria-label={t('scopeCalc.kpi.label')}
          items={[
            {
              id: 'intensity',
              label: t('scopeCalc.kpi.intensity'),
              value: production ? annualTotal / production : null,
              format: 'number',
              precision: 2,
              tone: 'brand',
              hint: t('scopeCalc.kpi.intensityUnit'),
            },
            { id: 'production', label: t('scopeCalc.kpi.production'), value: production, format: 'compact', tone: 'neutral', hint: t('scopeCalc.kpi.productionUnit') },
            {
              id: 'completeness',
              label: t('scopeCalc.kpi.completeness'),
              value: Math.round(((verifiedCount + submittedCount) / 12) * 100),
              format: 'percent',
              tone: 'success',
              hint: t('scopeCalc.kpi.completenessSub', { count: verifiedCount + submittedCount }),
            },
          ]}
        />
      </div>

      <MethodologyDialog open={showMethodology} onClose={() => setShowMethodology(false)} />
    </div>
  )
}

function SourceLedger({ title, subtitle, rows, color }: { title: string; subtitle: string; rows: Array<{ key: string; label: string; value: number }>; color: string }) {
  const f = useFmt()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const total = rows.reduce((s, r) => s + r.value, 0) || 1
  const sorted = [...rows].sort((a, b) => b.value - a.value)
  return (
    <section ref={ref} className="surface-paper p-5" aria-label={title}>
      <h2 className="type-h3 text-[var(--text-primary)]">{title}</h2>
      <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{subtitle}</p>
      <ul className="mt-5 space-y-4">
        {sorted.map((r, i) => (
          <li key={r.key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-small text-[var(--text-secondary)] truncate">{r.label}</span>
              <span className="text-small font-semibold tabular-nums text-[var(--text-primary)] whitespace-nowrap">
                {f.compact(r.value)}
                <span className="ml-1.5 text-caption font-normal text-[var(--text-tertiary)]">{f.percent(r.value / total, { ratio: true })}</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
              <motion.div
                key={r.key + color}
                className="h-full rounded-full"
                style={{ background: color }}
                initial={reduce ? false : { width: '0%' }}
                animate={inView || reduce ? { width: `${(r.value / total) * 100}%` } : { width: '0%' }}
                transition={{ duration: dur.draw, ease: ease.out, delay: staggerDelay(i) }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ExportMenu({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; onPick: (format: string) => void }) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onOpenChange(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open, onOpenChange])
  return (
    <div ref={ref} className="relative">
      <Button variant="secondary" size="md" icon={<Download className="w-4 h-4" />} onClick={() => onOpenChange(!open)} aria-haspopup="menu" aria-expanded={open}>
        {t('scopeCalc.table.export')}
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1 w-44 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[var(--shadow-overlay)] py-1 z-30">
          {['CSV', 'Excel', 'PDF'].map(fmt => (
            <button key={fmt} role="menuitem" type="button" onClick={() => onPick(fmt)} className="w-full text-left px-3 h-9 text-small text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
              {t('scopeCalc.table.exportAs', { format: fmt })}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MethodologyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end lg:items-center justify-center lg:p-6">
          <motion.div className="absolute inset-0" style={{ background: 'var(--bg-overlay)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="method-title"
            className="relative w-full lg:max-w-3xl max-h-[88vh] overflow-y-auto bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-[var(--shadow-overlay)] rounded-t-[var(--radius-2xl)] lg:rounded-[var(--radius-2xl)]"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.base, ease: ease.out }}
          >
            <header className="sticky top-0 z-10 flex items-start justify-between gap-3 px-6 py-5 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
              <div>
                <h2 id="method-title" className="type-h2 text-[var(--text-primary)]">{t('scopeCalc.methodModal.title')}</h2>
                <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('scopeCalc.methodModal.subtitle')}</p>
              </div>
              <button type="button" onClick={onClose} aria-label={t('scopeCalc.close')} autoFocus className="w-9 h-9 inline-flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">
                <X className="w-4 h-4" />
              </button>
            </header>
            <div className="p-6 space-y-6">
              <div className="rounded-[var(--radius-md)] bg-[var(--bg-subtle)] px-4 py-3.5">
                <p className="text-small text-[var(--text-secondary)]">
                  <strong className="text-[var(--text-primary)]">{t('scopeCalc.methodModal.coreFormulaLabel')}</strong> {t('scopeCalc.methodModal.coreFormula')}
                </p>
                <p className="text-caption text-[var(--text-tertiary)] mt-2">{t('scopeCalc.methodModal.note')}</p>
              </div>
              {(['scope1', 'scope2', 'scope3'] as const).map(scope => (
                <section key={scope}>
                  <h3 className="text-small font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: SCOPE_COLOR[scope] }} aria-hidden />
                    {t(`scopeCalc.methodHeading.${scope}`)}
                  </h3>
                  <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{t('scopeCalc.methodModal.source')}</th>
                          <th>{t('scopeCalc.methodModal.emissionFactor')}</th>
                          <th>{t('scopeCalc.methodModal.methodology')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {EMISSION_FACTORS[scope].map(ef => (
                          <tr key={ef.id}>
                            <td className="text-[var(--text-primary)]">{t(`scopeCalc.ef.${ef.id}.source`, { defaultValue: ef.source })}</td>
                            <td className="tabular-nums whitespace-nowrap">{t(`scopeCalc.ef.${ef.id}.factor`, { defaultValue: ef.factor })}</td>
                            <td>{t(`scopeCalc.ef.${ef.id}.method`, { defaultValue: ef.method })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
              <section className="rounded-[var(--radius-md)] bg-[var(--bg-subtle)] px-4 py-3.5">
                <h4 className="text-small font-semibold text-[var(--text-primary)] mb-2">{t('scopeCalc.methodModal.assuranceTitle')}</h4>
                <ul className="text-small text-[var(--text-secondary)] space-y-1.5 list-disc pl-5">
                  {[1, 2, 3, 4].map(n => <li key={n}>{t(`scopeCalc.methodModal.assurance${n}`)}</li>)}
                </ul>
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

type AdjustedMonth = MonthlyEmission & { scope1: MonthlyEmission['scope1']; scope2: MonthlyEmission['scope2']; scope3: MonthlyEmission['scope3'] }

function MonthRow({
  month,
  isExpanded,
  onToggle,
  activeScope,
  scopeTotal,
  cumVal,
  effectiveStatus,
  isSubmitting,
  onSubmit,
  onProof,
  getVal,
  handleEdit,
  editingCell,
  setEditingCell,
}: {
  month: AdjustedMonth
  isExpanded: boolean
  onToggle: () => void
  activeScope: ScopeTab
  scopeTotal: number
  cumVal: number
  effectiveStatus: string
  isSubmitting: boolean
  onSubmit: () => void
  onProof: () => void
  getVal: (m: number, key: string, orig: number) => number
  handleEdit: (m: number, key: string, val: number) => void
  editingCell: string | null
  setEditingCell: (v: string | null) => void
}) {
  const { t } = useTranslation()
  const f = useFmt()
  const cells =
    activeScope === 'scope1'
      ? [month.scope1.process, month.scope1.combustion, month.scope1.mobile, month.scope1.fugitive]
      : activeScope === 'scope2'
        ? [month.scope2.electricity, month.scope2.steam, month.scope2.cooling]
        : [month.scope3.cat1, month.scope3.cat4, month.scope3.cat11, month.scope3.cat2 + month.scope3.cat3 + month.scope3.cat5 + month.scope3.cat6 + month.scope3.cat7 + month.scope3.cat12]
  return (
    <>
      <tr onClick={onToggle} className="cursor-pointer">
        <td>
          <button type="button" aria-expanded={isExpanded} aria-label={t('scopeCalc.table.expand')} onClick={e => { e.stopPropagation(); onToggle() }} className="w-7 h-7 inline-flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)]">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </td>
        <td className="font-medium text-[var(--text-primary)] whitespace-nowrap">{monthYearLabel(t, month.month)}</td>
        {cells.map((v, i) => <td key={i} className="num">{f.number(v)}</td>)}
        <td className="num font-semibold text-[var(--text-primary)]">{f.number(scopeTotal)}</td>
        <td className="num">{f.compact(cumVal)}</td>
        <td>
          {isSubmitting ? (
            <StatusPill tone="info" dot>{t('scopeCalc.table.submitting')}</StatusPill>
          ) : (
            <StatusPill tone={STATUS_TONE[effectiveStatus] ?? 'neutral'}>{t(`scopeCalc.status.${effectiveStatus}`, { defaultValue: effectiveStatus })}</StatusPill>
          )}
        </td>
        <td className="text-right">
          {effectiveStatus === 'verified' && (
            <button type="button" onClick={e => { e.stopPropagation(); onProof() }} className="w-9 h-9 inline-flex items-center justify-center rounded-[var(--radius-md)] text-[var(--status-success)] hover:bg-[var(--status-success-soft)]" title={t('scopeCalc.table.viewProof')} aria-label={t('scopeCalc.table.viewProof')}>
              <Shield className="w-4 h-4" />
            </button>
          )}
          {effectiveStatus === 'draft' && !isSubmitting && (
            <button type="button" onClick={e => { e.stopPropagation(); onSubmit() }} className="w-9 h-9 inline-flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-brand-strong)] hover:bg-[var(--color-brand-soft)]" title={t('scopeCalc.table.submitForReview')} aria-label={t('scopeCalc.table.submitForReview')}>
              <Upload className="w-4 h-4" />
            </button>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr className="hover:bg-transparent">
          <td colSpan={20} className="!p-0">
            <ExpandedMonthDetail month={month} scope={activeScope} getVal={getVal} handleEdit={handleEdit} editingCell={editingCell} setEditingCell={setEditingCell} />
          </td>
        </tr>
      )}
    </>
  )
}

// Expanded detail for a single month — click a source value to edit it.
function ExpandedMonthDetail({
  month,
  scope,
  getVal,
  handleEdit,
  editingCell,
  setEditingCell,
}: {
  month: MonthlyEmission
  scope: ScopeTab
  getVal: (m: number, key: string, orig: number) => number
  handleEdit: (m: number, key: string, val: number) => void
  editingCell: string | null
  setEditingCell: (v: string | null) => void
}) {
  const { t } = useTranslation()
  const f = useFmt()
  const sources = scope === 'scope1' ? scope1Sources : scope === 'scope2' ? scope2Sources : scope3Categories
  const raw: Record<string, number> =
    scope === 'scope1'
      ? { process: month.scope1.process, combustion: month.scope1.combustion, mobile: month.scope1.mobile, fugitive: month.scope1.fugitive }
      : scope === 'scope2'
        ? { electricity: month.scope2.electricity, steam: month.scope2.steam, cooling: month.scope2.cooling }
        : { cat1: month.scope3.cat1, cat2: month.scope3.cat2, cat3: month.scope3.cat3, cat4: month.scope3.cat4, cat5: month.scope3.cat5, cat6: month.scope3.cat6, cat7: month.scope3.cat7, cat11: month.scope3.cat11, cat12: month.scope3.cat12 }
  const scopeTotal = scope === 'scope1' ? month.scope1.total : scope === 'scope2' ? month.scope2.total : month.scope3.total

  const commit = (key: string, value: string) => {
    const n = Number(value)
    if (value.trim() === '' || !Number.isFinite(n) || n < 0) {
      notify.error(t('scopeCalc.detail.invalid'))
      return
    }
    handleEdit(month.monthIndex, key, n)
    setEditingCell(null)
  }

  return (
    <div className="bg-[var(--bg-subtle)] border-y border-[var(--border-subtle)] px-6 py-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <h4 className="text-small font-semibold text-[var(--text-primary)]">{t('scopeCalc.detail.heading', { month: monthYearLabel(t, month.month) })}</h4>
        <div className="flex items-center gap-4 text-caption text-[var(--text-tertiary)]">
          <span>{t('scopeCalc.detail.production')} <strong className="text-[var(--text-primary)] tabular-nums">{f.number(month.productionVolume)}</strong> {t('scopeCalc.detail.tonnes')}</span>
          <span>{t('scopeCalc.detail.intensity')} <strong className="text-[var(--text-primary)] tabular-nums">{f.number(scopeTotal / month.productionVolume, { precision: 3 })}</strong> tCO₂e/t</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sources.map(src => {
          const cellKey = `${month.monthIndex}-${src.id}`
          const val = getVal(month.monthIndex, src.id, raw[src.id] || 0)
          const isEditing = editingCell === cellKey
          const label = t(`scopeCalc.sources.${src.id}.label`, { defaultValue: src.label })
          return (
            <div key={src.id} className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-4">
              <p className="text-small font-medium text-[var(--text-primary)]">{label}</p>
              <p className="text-caption text-[var(--text-tertiary)] mt-0.5 mb-3">{t(`scopeCalc.sources.${src.id}.description`, { defaultValue: src.description })}</p>
              {isEditing ? (
                <div className="flex items-stretch rounded-[var(--radius-md)] border border-[var(--border-focus)] shadow-[0_0_0_3px_var(--color-brand-soft)] bg-[var(--bg-primary)]">
                  <input
                    type="number"
                    autoFocus
                    min={0}
                    defaultValue={val}
                    aria-label={label}
                    onBlur={e => commit(src.id, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commit(src.id, (e.target as HTMLInputElement).value)
                      if (e.key === 'Escape') setEditingCell(null)
                    }}
                    className="flex-1 min-w-0 h-10 px-3 bg-transparent text-body tabular-nums text-[var(--text-primary)] outline-none"
                  />
                  <span className="flex items-center px-3 border-l border-[var(--border-subtle)] text-caption text-[var(--text-tertiary)]">{src.unit}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingCell(cellKey)}
                  aria-label={t('scopeCalc.detail.edit', { source: label })}
                  className="w-full h-10 px-3 flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border-default)] text-body tabular-nums text-[var(--text-primary)] hover:border-[var(--border-strong)] group"
                >
                  <span>{f.number(val)} <span className="text-caption text-[var(--text-tertiary)]">{src.unit}</span></span>
                  <Pencil className="w-3.5 h-3.5 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity duration-micro" aria-hidden />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
