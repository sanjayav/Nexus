import { useState, useMemo } from 'react'
import {
  FlaskConical,
  Leaf,
  ShieldQuestion,
  ChevronRight,
  Flame,
  Zap,
  Globe2,
  Truck,
  Factory,
  Wind,
  Droplets,
  Building2,
  ShoppingCart,
  Plane,
  Trash2,
  Briefcase,
  ArrowDownUp,
  CircuitBoard,
  BarChart3,
  Calculator,
  Info,
  Plus,
  X,
  ArrowLeft,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react'
import { Card, Badge } from '../design-system'
import {
  STATIONARY_FUELS,
  MOBILE_FUELS,
  REFRIGERANTS,
  GRID_FACTORS,
  HEAT_FACTORS,
  SPEND_FACTORS,
  TRANSPORT_FACTORS,
  WASTE_FACTORS,
  TRAVEL_FACTORS,
  calcCO2e,
  kgToTonnes,
} from '../data/emissionFactors'
import ExcelImport from '../components/ExcelImport'
import type { ExcelRow } from '../data/pttepDemoData'

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */
interface CalcModule {
  id: string
  title: string
  version: string
  icon: typeof Flame
  desc: string
  status: 'ready' | 'in-progress' | 'not-started'
  sources?: number
  lastCalc?: string
}

interface LineItem {
  id: string
  label: string
  quantity: number
  factorId: string
  co2e_kg: number
  co2_kg: number
  ch4_kg: number
  n2o_kg: number
}

/* ═══════════════════════════════════════════
   Static Data
   ═══════════════════════════════════════════ */
const SUITES = [
  { id: 'ghg', title: 'GHG Protocol', subtitle: 'Corporate Standard & Scope 3', desc: 'Full GHG Protocol calculator suite — Scope 1 stationary & mobile combustion, Scope 2 location & market-based, and all 15 Scope 3 categories.', icon: FlaskConical, accent: 'var(--accent-teal)', color: 'teal' as const, modules: 23, coverage: '96%' },
  { id: 'unfccc', title: 'UNFCCC', subtitle: 'Clean Development Mechanism v1.1', desc: 'United Nations Framework Convention on Climate Change methodology for CDM project emissions, baseline calculations, and emission reductions.', icon: Leaf, accent: 'var(--accent-blue)', color: 'blue' as const, modules: 4, coverage: '100%' },
  { id: 'uncertainty', title: 'Uncertainty Engine', subtitle: 'Monte Carlo & Sensitivity Analysis', desc: 'Quantify uncertainty across all emission calculations using statistical methods — Monte Carlo simulation, sensitivity analysis, and confidence intervals.', icon: ShieldQuestion, accent: 'var(--accent-purple)', color: 'purple' as const, modules: 3, coverage: '—' },
]

const GHG_SCOPES = [
  { id: 'scope1', title: 'Scope 1', subtitle: 'Direct Emissions', desc: 'Emissions from owned or controlled sources.', accent: 'var(--accent-teal)', color: 'teal' as const, icon: Flame, tco2e: '284,392', pct: 42 },
  { id: 'scope2', title: 'Scope 2', subtitle: 'Indirect — Energy', desc: 'Emissions from purchased electricity, steam, heating, and cooling.', accent: 'var(--accent-blue)', color: 'blue' as const, icon: Zap, tco2e: '167,841', pct: 25 },
  { id: 'scope3', title: 'Scope 3', subtitle: 'Value Chain', desc: 'All other indirect emissions — 15 upstream and downstream categories.', accent: 'var(--accent-purple)', color: 'purple' as const, icon: Globe2, tco2e: '221,503', pct: 33 },
]

const SCOPE1_MODULES: CalcModule[] = [
  { id: 'stat-comb', title: 'Stationary Combustion', version: 'v4.2', icon: Flame, desc: 'Boilers, furnaces, turbines, heaters, incinerators, flares', status: 'ready', sources: 42, lastCalc: '2 days ago' },
  { id: 'mobile', title: 'Mobile Combustion', version: 'v2.7', icon: Truck, desc: 'Fleet vehicles, forklifts, marine, rail, aviation', status: 'ready', sources: 18, lastCalc: '5 days ago' },
  { id: 'hfc-pfc', title: 'HFC / PFC Process Emissions', version: 'v1.0', icon: Wind, desc: 'Refrigerant leaks, semiconductor, aluminium smelting', status: 'ready', sources: 7, lastCalc: '1 week ago' },
  { id: 'chp', title: 'CHP / Cogeneration', version: 'v1.0', icon: CircuitBoard, desc: 'Combined heat & power allocation', status: 'ready', sources: 3 },
]

const SCOPE2_MODULES: CalcModule[] = [
  { id: 'elec', title: 'Purchased Electricity', version: 'v3.1', icon: Zap, desc: 'Location-based & market-based methods', status: 'ready', sources: 34, lastCalc: '1 day ago' },
  { id: 'heat', title: 'Purchased Heat / Steam', version: 'v2.0', icon: Droplets, desc: 'District heating, steam purchases, cooling', status: 'ready', sources: 12, lastCalc: '3 days ago' },
]

const SCOPE3_MODULES: CalcModule[] = [
  { id: 's3-c1', title: 'Cat 1 — Purchased Goods & Services', version: 'v1.2', icon: ShoppingCart, desc: 'Spend-based, supplier-specific, and hybrid methods', status: 'ready', sources: 156 },
  { id: 's3-c2', title: 'Cat 2 — Capital Goods', version: 'v1.0', icon: Building2, desc: 'Cradle-to-gate emissions of capital equipment', status: 'ready', sources: 28 },
  { id: 's3-c3', title: 'Cat 3 — Fuel & Energy Activities', version: 'v1.1', icon: Flame, desc: 'Upstream of purchased fuels, T&D losses', status: 'ready', sources: 42 },
  { id: 's3-c4', title: 'Cat 4 — Upstream Transportation', version: 'v1.0', icon: Truck, desc: 'Inbound logistics, third-party transport', status: 'ready', sources: 87 },
  { id: 's3-c5', title: 'Cat 5 — Waste Generated', version: 'v1.0', icon: Trash2, desc: 'Landfill, incineration, recycling, composting', status: 'ready', sources: 34 },
  { id: 's3-c6', title: 'Cat 6 — Business Travel', version: 'v1.1', icon: Plane, desc: 'Air, rail, hotel stays, car rental', status: 'ready', sources: 12 },
  { id: 's3-c7', title: 'Cat 7 — Employee Commuting', version: 'v1.0', icon: ArrowDownUp, desc: 'WFH emissions, commute surveys, distance-based', status: 'ready', sources: 0 },
  { id: 's3-c8', title: 'Cat 8 — Upstream Leased Assets', version: 'v1.0', icon: Building2, desc: 'Emissions from leased offices, warehouses', status: 'ready', sources: 0 },
  { id: 's3-c9', title: 'Cat 9 — Downstream Transportation', version: 'v1.0', icon: Truck, desc: 'Outbound logistics to customers', status: 'ready', sources: 45 },
  { id: 's3-c10', title: 'Cat 10 — Processing of Sold Products', version: 'v1.0', icon: Factory, desc: 'Further processing by downstream entities', status: 'ready', sources: 8 },
  { id: 's3-c11', title: 'Cat 11 — Use of Sold Products', version: 'v1.0', icon: Briefcase, desc: 'Direct use-phase emissions of sold products', status: 'ready', sources: 22 },
  { id: 's3-c12', title: 'Cat 12 — End-of-Life Treatment', version: 'v1.0', icon: Trash2, desc: 'Disposal and treatment of sold products', status: 'ready', sources: 0 },
  { id: 's3-c13', title: 'Cat 13 — Downstream Leased Assets', version: 'v1.0', icon: Building2, desc: 'Assets leased to third parties', status: 'ready', sources: 0 },
  { id: 's3-c14', title: 'Cat 14 — Franchises', version: 'v1.0', icon: Globe2, desc: 'Franchise operations not in Scope 1/2', status: 'ready', sources: 0 },
  { id: 's3-c15', title: 'Cat 15 — Investments', version: 'v1.0', icon: BarChart3, desc: 'Equity investments, project finance, debt', status: 'ready', sources: 5 },
]

const statusConfig = {
  'ready': { label: 'Ready', badge: 'green' as const },
  'in-progress': { label: 'In Progress', badge: 'amber' as const },
  'not-started': { label: 'Not Started', badge: 'gray' as const },
}

/* ═══════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════ */
type View = 'suites' | 'ghg-scopes' | 'scope1' | 'scope2' | 'scope3' | 'unfccc' | 'uncertainty' | `calc:${string}`

/* ═══════════════════════════════════════════
   Process imported Excel rows into LineItems
   ═══════════════════════════════════════════ */
function processImportedRows(rows: ExcelRow[]): Record<string, LineItem[]> {
  const buckets: Record<string, LineItem[]> = {}

  for (const row of rows) {
    const cat = row.category
    const q = row.quantity
    if (!q || q <= 0) continue

    let calcId = ''
    let item: LineItem | null = null

    // ── Scope 1: Stationary Combustion ──
    if (cat.toLowerCase().includes('stationary')) {
      calcId = 'stat-comb'
      const fuel = STATIONARY_FUELS.find(f => f.name === row.fuelOrFactor) ?? STATIONARY_FUELS[0]
      const co2_kg = q * fuel.co2, ch4_kg = q * fuel.ch4, n2o_kg = q * fuel.n2o
      item = { id: crypto.randomUUID(), label: `${row.source} — ${q.toLocaleString()} ${fuel.unit}`, quantity: q, factorId: fuel.id, co2e_kg: calcCO2e(co2_kg, ch4_kg, n2o_kg), co2_kg, ch4_kg, n2o_kg }
    }
    // ── Scope 1: Mobile Combustion ──
    else if (cat.toLowerCase().includes('mobile')) {
      calcId = 'mobile'
      const fuel = MOBILE_FUELS.find(f => f.name === row.fuelOrFactor) ?? MOBILE_FUELS[0]
      const co2_kg = q * fuel.co2, ch4_kg = q * fuel.ch4, n2o_kg = q * fuel.n2o
      item = { id: crypto.randomUUID(), label: `${row.source} — ${q.toLocaleString()} ${fuel.unit}`, quantity: q, factorId: fuel.id, co2e_kg: calcCO2e(co2_kg, ch4_kg, n2o_kg), co2_kg, ch4_kg, n2o_kg }
    }
    // ── Scope 1: HFC/PFC ──
    else if (cat.toLowerCase().includes('hfc') || cat.toLowerCase().includes('pfc') || cat.toLowerCase().includes('refrigerant')) {
      calcId = 'hfc-pfc'
      const ref = REFRIGERANTS.find(r => r.name === row.fuelOrFactor || row.fuelOrFactor.includes(r.name.split(' ')[0])) ?? REFRIGERANTS[0]
      const co2e_kg = q * ref.gwp
      item = { id: crypto.randomUUID(), label: `${row.source} — ${q} kg leaked`, quantity: q, factorId: ref.id, co2e_kg, co2_kg: co2e_kg, ch4_kg: 0, n2o_kg: 0 }
    }
    // ── Scope 2: Electricity ──
    else if (cat.toLowerCase().includes('electricity')) {
      calcId = 'elec'
      const grid = GRID_FACTORS.find(g => g.name === row.fuelOrFactor) ?? GRID_FACTORS[0]
      const co2e_kg = q * grid.ef
      item = { id: crypto.randomUUID(), label: `${row.source} — ${q.toLocaleString()} kWh`, quantity: q, factorId: grid.id, co2e_kg, co2_kg: co2e_kg, ch4_kg: 0, n2o_kg: 0 }
    }
    // ── Scope 2: Heat/Steam ──
    else if (cat.toLowerCase().includes('heat') || cat.toLowerCase().includes('steam')) {
      calcId = 'heat'
      const hf = HEAT_FACTORS.find(h => h.name === row.fuelOrFactor) ?? HEAT_FACTORS[0]
      const co2e_kg = q * hf.ef
      item = { id: crypto.randomUUID(), label: `${row.source} — ${q.toLocaleString()} kWh`, quantity: q, factorId: hf.id, co2e_kg, co2_kg: co2e_kg, ch4_kg: 0, n2o_kg: 0 }
    }
    // ── Scope 3: Transport (Cat 4, 9) ──
    else if (cat.toLowerCase().includes('cat 4') || cat.toLowerCase().includes('cat 9') || cat.toLowerCase().includes('transportation')) {
      calcId = cat.toLowerCase().includes('cat 9') || cat.toLowerCase().includes('downstream') ? 's3-c9' : 's3-c4'
      const tf = TRANSPORT_FACTORS.find(f => f.mode === row.fuelOrFactor) ?? TRANSPORT_FACTORS[0]
      const co2e_kg = q * tf.ef
      item = { id: crypto.randomUUID(), label: `${row.source} — ${q.toLocaleString()} tonne-km`, quantity: q, factorId: tf.id, co2e_kg, co2_kg: co2e_kg, ch4_kg: 0, n2o_kg: 0 }
    }
    // ── Scope 3: Waste (Cat 5, 12) ──
    else if (cat.toLowerCase().includes('cat 5') || cat.toLowerCase().includes('cat 12') || cat.toLowerCase().includes('waste')) {
      calcId = cat.toLowerCase().includes('cat 12') ? 's3-c12' : 's3-c5'
      const wf = WASTE_FACTORS.find(f => f.method === row.fuelOrFactor) ?? WASTE_FACTORS[0]
      const co2e_kg = q * wf.ef
      item = { id: crypto.randomUUID(), label: `${row.source} — ${q} tonnes`, quantity: q, factorId: wf.id, co2e_kg, co2_kg: co2e_kg, ch4_kg: 0, n2o_kg: 0 }
    }
    // ── Scope 3: Travel (Cat 6, 7) ──
    else if (cat.toLowerCase().includes('cat 6') || cat.toLowerCase().includes('cat 7') || cat.toLowerCase().includes('travel') || cat.toLowerCase().includes('commut')) {
      calcId = cat.toLowerCase().includes('cat 7') || cat.toLowerCase().includes('commut') ? 's3-c7' : 's3-c6'
      const tvf = TRAVEL_FACTORS.find(f => f.mode === row.fuelOrFactor) ?? TRAVEL_FACTORS[0]
      const co2e_kg = q * tvf.ef
      const unitLabel = tvf.id === 'hotel' ? 'room-nights' : 'pax-km'
      item = { id: crypto.randomUUID(), label: `${row.source} — ${q.toLocaleString()} ${unitLabel}`, quantity: q, factorId: tvf.id, co2e_kg, co2_kg: co2e_kg, ch4_kg: 0, n2o_kg: 0 }
    }
    // ── Scope 3: Spend-based (fallback for Cat 1-3, 8, 10-15) ──
    else if (cat.toLowerCase().includes('cat ') || cat.toLowerCase().includes('purchased') || cat.toLowerCase().includes('capital')) {
      // Map category number
      const catMatch = cat.match(/cat\s*(\d+)/i)
      const catNum = catMatch ? parseInt(catMatch[1]) : 1
      calcId = `s3-c${catNum}`
      const sf = SPEND_FACTORS.find(f => f.category === row.fuelOrFactor) ?? SPEND_FACTORS[0]
      const co2e_kg = q * sf.ef
      item = { id: crypto.randomUUID(), label: `${row.source} — $${q.toLocaleString()}`, quantity: q, factorId: sf.id, co2e_kg, co2_kg: co2e_kg, ch4_kg: 0, n2o_kg: 0 }
    }

    if (item && calcId) {
      if (!buckets[calcId]) buckets[calcId] = []
      buckets[calcId].push(item)
    }
  }

  return buckets
}

export default function Calculators() {
  const [view, setView] = useState<View>('suites')
  const [showImport, setShowImport] = useState(false)
  const [importedData, setImportedData] = useState<Record<string, LineItem[]>>({})
  const [importCount, setImportCount] = useState(0)

  const handleImport = (rows: ExcelRow[]) => {
    const processed = processImportedRows(rows)
    setImportedData(processed)
    setImportCount(rows.length)
  }

  const handleSuiteClick = (id: string) => {
    if (id === 'ghg') setView('ghg-scopes')
    else if (id === 'unfccc') setView('unfccc')
    else if (id === 'uncertainty') setView('uncertainty')
  }

  const handleScopeClick = (id: string) => setView(id as View)
  const openCalc = (moduleId: string) => setView(`calc:${moduleId}`)

  const breadcrumb = getBreadcrumb(view)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)] tracking-tight">Calculators</h1>
          <p className="mt-1 text-[var(--text-sm)] text-[var(--text-tertiary)]">GHG Protocol, UNFCCC, and uncertainty quantification calculators.</p>
        </div>
        <div className="flex items-center gap-2">
          {importCount > 0 && (
            <div className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-emerald-50 border border-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[var(--text-xs)] font-medium text-emerald-700">{importCount} sources imported</span>
            </div>
          )}
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] font-semibold text-[var(--text-secondary)] hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)] hover:bg-[var(--accent-teal-subtle)] transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" /> Import Excel
          </button>
          {view !== 'suites' && (
            <button onClick={() => {
              const bc = breadcrumb[breadcrumb.length - 2]
              if (bc?.view) setView(bc.view)
              else setView('suites')
            }} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[var(--text-sm)] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
        </div>
      </div>

      {breadcrumb.length > 1 && (
        <div className="flex items-center gap-1.5 text-[var(--text-sm)]">
          {breadcrumb.map((crumb, i) => (
            <div key={crumb.label + i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />}
              {crumb.view ? (
                <button onClick={() => setView(crumb.view!)} className="text-[var(--accent-teal)] font-medium hover:underline underline-offset-2 cursor-pointer">{crumb.label}</button>
              ) : (
                <span className="text-[var(--text-primary)] font-semibold">{crumb.label}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {view === 'suites' && <SuitesView onSelect={handleSuiteClick} />}
      {view === 'ghg-scopes' && <GHGScopesView onSelect={handleScopeClick} />}
      {view === 'scope1' && <ModuleListView title="Scope 1 — Direct Emissions" modules={SCOPE1_MODULES} scope={GHG_SCOPES[0]} onOpen={openCalc} importedData={importedData} />}
      {view === 'scope2' && <ModuleListView title="Scope 2 — Indirect Energy" modules={SCOPE2_MODULES} scope={GHG_SCOPES[1]} onOpen={openCalc} importedData={importedData} />}
      {view === 'scope3' && <ModuleListView title="Scope 3 — Value Chain" modules={SCOPE3_MODULES} scope={GHG_SCOPES[2]} onOpen={openCalc} importedData={importedData} />}
      {view === 'unfccc' && <UNFCCCCalc />}
      {view === 'uncertainty' && <UncertaintyEngine />}

      {/* Individual calculator views */}
      {view === 'calc:stat-comb' && <CombustionCalc type="stationary" initialItems={importedData['stat-comb']} />}
      {view === 'calc:mobile' && <CombustionCalc type="mobile" initialItems={importedData['mobile']} />}
      {view === 'calc:hfc-pfc' && <RefrigerantCalc initialItems={importedData['hfc-pfc']} />}
      {view === 'calc:chp' && <CHPCalc />}
      {view === 'calc:elec' && <ElectricityCalc initialItems={importedData['elec']} />}
      {view === 'calc:heat' && <HeatSteamCalc initialItems={importedData['heat']} />}

      {/* Scope 3 categories */}
      {view === 'calc:s3-c1' && <SpendCalc title="Cat 1 — Purchased Goods & Services" initialItems={importedData['s3-c1']} />}
      {view === 'calc:s3-c2' && <SpendCalc title="Cat 2 — Capital Goods" initialItems={importedData['s3-c2']} />}
      {view === 'calc:s3-c3' && <SpendCalc title="Cat 3 — Fuel & Energy Activities" initialItems={importedData['s3-c3']} />}
      {view === 'calc:s3-c4' && <TransportCalc title="Cat 4 — Upstream Transportation" initialItems={importedData['s3-c4']} />}
      {view === 'calc:s3-c5' && <WasteCalc initialItems={importedData['s3-c5']} />}
      {view === 'calc:s3-c6' && <TravelCalc title="Cat 6 — Business Travel" initialItems={importedData['s3-c6']} />}
      {view === 'calc:s3-c7' && <TravelCalc title="Cat 7 — Employee Commuting" initialItems={importedData['s3-c7']} />}
      {view === 'calc:s3-c8' && <SpendCalc title="Cat 8 — Upstream Leased Assets" initialItems={importedData['s3-c8']} />}
      {view === 'calc:s3-c9' && <TransportCalc title="Cat 9 — Downstream Transportation" initialItems={importedData['s3-c9']} />}
      {view === 'calc:s3-c10' && <SpendCalc title="Cat 10 — Processing of Sold Products" initialItems={importedData['s3-c10']} />}
      {view === 'calc:s3-c11' && <SpendCalc title="Cat 11 — Use of Sold Products" initialItems={importedData['s3-c11']} />}
      {view === 'calc:s3-c12' && <WasteCalc initialItems={importedData['s3-c12']} />}
      {view === 'calc:s3-c13' && <SpendCalc title="Cat 13 — Downstream Leased Assets" initialItems={importedData['s3-c13']} />}
      {view === 'calc:s3-c14' && <SpendCalc title="Cat 14 — Franchises" initialItems={importedData['s3-c14']} />}
      {view === 'calc:s3-c15' && <SpendCalc title="Cat 15 — Investments" initialItems={importedData['s3-c15']} />}

      {/* Excel import modal */}
      {showImport && <ExcelImport onImport={handleImport} onClose={() => setShowImport(false)} />}
    </div>
  )
}

function getBreadcrumb(view: View): { label: string; view?: View }[] {
  if (view === 'suites') return [{ label: 'Calculators' }]
  if (view === 'ghg-scopes') return [{ label: 'Calculators', view: 'suites' }, { label: 'GHG Protocol' }]
  if (view === 'scope1') return [{ label: 'Calculators', view: 'suites' }, { label: 'GHG Protocol', view: 'ghg-scopes' }, { label: 'Scope 1' }]
  if (view === 'scope2') return [{ label: 'Calculators', view: 'suites' }, { label: 'GHG Protocol', view: 'ghg-scopes' }, { label: 'Scope 2' }]
  if (view === 'scope3') return [{ label: 'Calculators', view: 'suites' }, { label: 'GHG Protocol', view: 'ghg-scopes' }, { label: 'Scope 3' }]
  if (view === 'unfccc') return [{ label: 'Calculators', view: 'suites' }, { label: 'UNFCCC' }]
  if (view === 'uncertainty') return [{ label: 'Calculators', view: 'suites' }, { label: 'Uncertainty Engine' }]
  if (view.startsWith('calc:')) {
    const id = view.replace('calc:', '')
    const allMods = [...SCOPE1_MODULES, ...SCOPE2_MODULES, ...SCOPE3_MODULES]
    const mod = allMods.find(m => m.id === id)
    const scopeView = SCOPE1_MODULES.find(m => m.id === id) ? 'scope1' : SCOPE2_MODULES.find(m => m.id === id) ? 'scope2' : 'scope3'
    const scopeLabel = scopeView === 'scope1' ? 'Scope 1' : scopeView === 'scope2' ? 'Scope 2' : 'Scope 3'
    return [
      { label: 'Calculators', view: 'suites' },
      { label: 'GHG Protocol', view: 'ghg-scopes' },
      { label: scopeLabel, view: scopeView as View },
      { label: mod?.title ?? id },
    ]
  }
  return [{ label: 'Calculators' }]
}


/* ═══════════════════════════════════════════
   Suite & Scope navigation views (unchanged)
   ═══════════════════════════════════════════ */
function SuitesView({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-5 animate-fade-in">
      {SUITES.map((s) => {
        const Icon = s.icon
        return (
          <button key={s.id} onClick={() => onSelect(s.id)} className="text-left cursor-pointer group">
            <Card hover className="h-full relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl opacity-60 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(90deg, ${s.accent}, transparent)` }} />
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105" style={{ backgroundColor: `${s.accent}10`, border: `1.5px solid ${s.accent}30` }}>
                  <Icon className="w-7 h-7" style={{ color: s.accent }} />
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--accent-teal)] group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="font-display text-[var(--text-lg)] font-bold text-[var(--text-primary)]">{s.title}</h3>
              <p className="text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mt-0.5">{s.subtitle}</p>
              <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-2 leading-relaxed">{s.desc}</p>
              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-[var(--border-subtle)]">
                <div><p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Modules</p><p className="text-[var(--text-base)] font-bold text-[var(--text-primary)] tabular-nums">{s.modules}</p></div>
                <div className="w-px h-8 bg-[var(--border-subtle)]" />
                <div><p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Coverage</p><p className="text-[var(--text-base)] font-bold tabular-nums" style={{ color: s.accent }}>{s.coverage}</p></div>
              </div>
            </Card>
          </button>
        )
      })}
    </div>
  )
}

function GHGScopesView({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <Card padding="sm" className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-teal-light)] border border-teal-100 flex items-center justify-center"><FlaskConical className="w-5 h-5 text-[var(--accent-teal)]" /></div>
          <div><p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">GHG Protocol Calculator Suite</p><p className="text-[10px] text-[var(--text-tertiary)]">Corporate Standard + Scope 3 Standard</p></div>
        </div>
      </Card>
      <div className="grid grid-cols-3 gap-5">
        {GHG_SCOPES.map((scope) => {
          const Icon = scope.icon
          return (
            <button key={scope.id} onClick={() => onSelect(scope.id)} className="text-left cursor-pointer group">
              <Card hover className="h-full relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl opacity-60 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(90deg, ${scope.accent}, transparent)` }} />
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105" style={{ backgroundColor: `${scope.accent}10`, border: `1.5px solid ${scope.accent}30` }}><Icon className="w-6 h-6" style={{ color: scope.accent }} /></div>
                  <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--accent-teal)] group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="font-display text-[var(--text-lg)] font-bold text-[var(--text-primary)]">{scope.title}</h3>
                <p className="text-[var(--text-xs)] font-medium" style={{ color: scope.accent }}>{scope.subtitle}</p>
                <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-2 leading-relaxed">{scope.desc}</p>
                <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex items-end justify-between">
                  <div><p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Emissions</p><p className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)] tabular-nums">{scope.tco2e}</p><p className="text-[10px] text-[var(--text-tertiary)]">tCO₂e</p></div>
                  <div className="w-16"><div className="flex items-center justify-between mb-1"><span className="text-[10px] font-bold tabular-nums" style={{ color: scope.accent }}>{scope.pct}%</span></div><div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${scope.pct}%`, backgroundColor: scope.accent }} /></div></div>
                </div>
              </Card>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ModuleListView({ title, modules, scope, onOpen, importedData }: { title: string; modules: CalcModule[]; scope: typeof GHG_SCOPES[0]; onOpen: (id: string) => void; importedData?: Record<string, LineItem[]> }) {
  return (
    <div className="space-y-5 animate-fade-in">
      <Card padding="sm" className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${scope.accent}10`, border: `1px solid ${scope.accent}25` }}><scope.icon className="w-5 h-5" style={{ color: scope.accent }} /></div>
        <div className="flex-1"><h2 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)]">{title}</h2><p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">{modules.length} calculators &middot; {scope.tco2e} tCO₂e</p></div>
      </Card>
      <div className="space-y-3">
        {modules.map((mod) => {
          const Icon = mod.icon
          const cfg = statusConfig[mod.status]
          const importCount = importedData?.[mod.id]?.length ?? 0
          return (
            <Card key={mod.id} hover className="group">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105" style={{ backgroundColor: `${scope.accent}10`, border: `1px solid ${scope.accent}20` }}><Icon className="w-5 h-5" style={{ color: scope.accent }} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{mod.title}</h3>
                    <Badge variant="gray">{mod.version}</Badge>
                    <Badge variant={cfg.badge} dot>{cfg.label}</Badge>
                    {importCount > 0 && <Badge variant="teal">{importCount} imported</Badge>}
                  </div>
                  <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-0.5">{mod.desc}</p>
                </div>
                <button onClick={() => onOpen(mod.id)} className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-inverse)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--bg-inverse-soft)] active:scale-[0.98] transition-all cursor-pointer"><Calculator className="w-3.5 h-3.5" />Open</button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════
   Shared calculator result display
   ═══════════════════════════════════════════ */
function ResultsPanel({ items, onRemove }: { items: LineItem[]; onRemove: (id: string) => void }) {
  const totals = useMemo(() => {
    const co2 = items.reduce((a, i) => a + i.co2_kg, 0)
    const ch4 = items.reduce((a, i) => a + i.ch4_kg, 0)
    const n2o = items.reduce((a, i) => a + i.n2o_kg, 0)
    const co2e = items.reduce((a, i) => a + i.co2e_kg, 0)
    return { co2, ch4, n2o, co2e }
  }, [items])

  if (items.length === 0) return null

  return (
    <Card className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">Calculation Results</h3>
        <Badge variant="teal" dot>{items.length} line items</Badge>
      </div>

      {/* Grand total */}
      <div className="grid grid-cols-4 gap-4 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] mb-4">
        {[
          { label: 'CO₂', value: kgToTonnes(totals.co2), color: 'var(--accent-teal)' },
          { label: 'CH₄', value: kgToTonnes(totals.ch4), color: 'var(--accent-blue)' },
          { label: 'N₂O', value: kgToTonnes(totals.n2o), color: 'var(--accent-purple)' },
          { label: 'Total CO₂e', value: kgToTonnes(totals.co2e), color: 'var(--accent-teal)' },
        ].map((g) => (
          <div key={g.label}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: g.color }}>{g.label}</p>
            <p className="font-display text-[var(--text-xl)] font-bold text-[var(--text-primary)] tabular-nums">{g.value.toFixed(3)}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">tonnes</p>
          </div>
        ))}
      </div>

      {/* Line items */}
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors group">
            <span className="text-[var(--text-sm)] font-medium text-[var(--text-primary)] flex-1 truncate">{item.label}</span>
            <span className="text-[var(--text-xs)] text-[var(--text-secondary)] tabular-nums">{item.quantity.toLocaleString()}</span>
            <span className="text-[var(--text-sm)] font-bold text-[var(--accent-teal)] tabular-nums w-28 text-right">{kgToTonnes(item.co2e_kg).toFixed(4)} t</span>
            <button onClick={() => onRemove(item.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--accent-red)] transition-all cursor-pointer"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </Card>
  )
}


/* ═══════════════════════════════════════════
   Scope 1: Combustion Calculator (Stationary + Mobile)
   ═══════════════════════════════════════════ */
function CombustionCalc({ type, initialItems }: { type: 'stationary' | 'mobile'; initialItems?: LineItem[] }) {
  const fuels = type === 'stationary' ? STATIONARY_FUELS : MOBILE_FUELS
  const [fuelId, setFuelId] = useState(fuels[0].id)
  const [qty, setQty] = useState('')
  const [source, setSource] = useState('')
  const [items, setItems] = useState<LineItem[]>(initialItems ?? [])

  const fuel = fuels.find(f => f.id === fuelId)!

  const addItem = () => {
    const q = parseFloat(qty)
    if (!q || q <= 0) return
    const co2_kg = q * fuel.co2
    const ch4_kg = q * fuel.ch4
    const n2o_kg = q * fuel.n2o
    const co2e_kg = calcCO2e(co2_kg, ch4_kg, n2o_kg)
    setItems(prev => [...prev, { id: crypto.randomUUID(), label: `${source || fuel.name} — ${q.toLocaleString()} ${fuel.unit}`, quantity: q, factorId: fuel.id, co2e_kg, co2_kg, ch4_kg, n2o_kg }])
    setQty('')
    setSource('')
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <Card>
        <h3 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)] mb-4">{type === 'stationary' ? 'Stationary Combustion' : 'Mobile Combustion'} Calculator</h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Source name</label>
            <input value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. Boiler #3" className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" />
          </div>
          <div>
            <label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Fuel type</label>
            <select value={fuelId} onChange={e => setFuelId(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1">
              {fuels.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Quantity ({fuel.unit})</label>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] tabular-nums placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" onKeyDown={e => e.key === 'Enter' && addItem()} />
          </div>
          <div className="flex items-end">
            <button onClick={addItem} className="w-full h-10 rounded-lg bg-[var(--bg-inverse)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--bg-inverse-soft)] active:scale-[0.98] transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" />Calculate</button>
          </div>
        </div>
        {/* Live preview */}
        {qty && parseFloat(qty) > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-[var(--accent-teal-subtle)] border border-teal-100 flex items-center gap-4">
            <Info className="w-4 h-4 text-[var(--accent-teal)] flex-shrink-0" />
            <span className="text-[var(--text-xs)] text-[var(--accent-teal)]">
              EF: {fuel.co2} kg CO₂ + {fuel.ch4} kg CH₄ + {fuel.n2o} kg N₂O per {fuel.unit} →
              <strong className="ml-1">{kgToTonnes(calcCO2e(parseFloat(qty) * fuel.co2, parseFloat(qty) * fuel.ch4, parseFloat(qty) * fuel.n2o)).toFixed(4)} tCO₂e</strong>
            </span>
          </div>
        )}
      </Card>
      <ResultsPanel items={items} onRemove={id => setItems(prev => prev.filter(i => i.id !== id))} />
    </div>
  )
}


/* ═══════════════════════════════════════════
   Scope 1: HFC / PFC Refrigerant Calculator
   ═══════════════════════════════════════════ */
function RefrigerantCalc({ initialItems }: { initialItems?: LineItem[] }) {
  const [refId, setRefId] = useState(REFRIGERANTS[0].id)
  const [qty, setQty] = useState('')
  const [source, setSource] = useState('')
  const [items, setItems] = useState<LineItem[]>(initialItems ?? [])

  const ref = REFRIGERANTS.find(r => r.id === refId)!

  const addItem = () => {
    const q = parseFloat(qty)
    if (!q || q <= 0) return
    const co2e_kg = q * ref.gwp
    setItems(prev => [...prev, { id: crypto.randomUUID(), label: `${source || ref.name} — ${q} kg leaked`, quantity: q, factorId: ref.id, co2e_kg, co2_kg: co2e_kg, ch4_kg: 0, n2o_kg: 0 }])
    setQty('')
    setSource('')
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <Card>
        <h3 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)] mb-4">HFC / PFC Process Emissions Calculator</h3>
        <div className="grid grid-cols-4 gap-4">
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Equipment / source</label><input value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. Chiller Unit A" className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" /></div>
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Refrigerant</label><select value={refId} onChange={e => setRefId(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1">{REFRIGERANTS.map(r => <option key={r.id} value={r.id}>{r.name} (GWP {r.gwp.toLocaleString()})</option>)}</select></div>
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Quantity leaked (kg)</label><input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] tabular-nums placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" onKeyDown={e => e.key === 'Enter' && addItem()} /></div>
          <div className="flex items-end"><button onClick={addItem} className="w-full h-10 rounded-lg bg-[var(--bg-inverse)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--bg-inverse-soft)] active:scale-[0.98] transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" />Calculate</button></div>
        </div>
        {qty && parseFloat(qty) > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-[var(--accent-teal-subtle)] border border-teal-100 flex items-center gap-4"><Info className="w-4 h-4 text-[var(--accent-teal)] flex-shrink-0" /><span className="text-[var(--text-xs)] text-[var(--accent-teal)]">{parseFloat(qty)} kg × GWP {ref.gwp.toLocaleString()} = <strong>{kgToTonnes(parseFloat(qty) * ref.gwp).toFixed(4)} tCO₂e</strong></span></div>
        )}
      </Card>
      <ResultsPanel items={items} onRemove={id => setItems(prev => prev.filter(i => i.id !== id))} />
    </div>
  )
}


/* ═══════════════════════════════════════════
   Scope 1: CHP / Cogeneration Calculator
   ═══════════════════════════════════════════ */
function CHPCalc() {
  const [fuelId, setFuelId] = useState(STATIONARY_FUELS[0].id)
  const [fuelQty, setFuelQty] = useState('')
  const [elecPct, setElecPct] = useState('60')
  const [items, setItems] = useState<LineItem[]>([])
  const fuel = STATIONARY_FUELS.find(f => f.id === fuelId)!

  const addItem = () => {
    const q = parseFloat(fuelQty)
    const ep = parseFloat(elecPct) / 100
    if (!q || q <= 0) return
    const co2_kg = q * fuel.co2
    const ch4_kg = q * fuel.ch4
    const n2o_kg = q * fuel.n2o
    const total = calcCO2e(co2_kg, ch4_kg, n2o_kg)
    // Split by allocation
    const elecShare = total * ep
    const heatShare = total * (1 - ep)
    setItems(prev => [
      ...prev,
      { id: crypto.randomUUID(), label: `CHP Electricity (${(ep * 100).toFixed(0)}%) — ${fuel.name}`, quantity: q, factorId: fuel.id, co2e_kg: elecShare, co2_kg: co2_kg * ep, ch4_kg: ch4_kg * ep, n2o_kg: n2o_kg * ep },
      { id: crypto.randomUUID(), label: `CHP Heat (${((1 - ep) * 100).toFixed(0)}%) — ${fuel.name}`, quantity: q, factorId: fuel.id, co2e_kg: heatShare, co2_kg: co2_kg * (1 - ep), ch4_kg: ch4_kg * (1 - ep), n2o_kg: n2o_kg * (1 - ep) },
    ])
    setFuelQty('')
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <Card>
        <h3 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)] mb-4">CHP / Cogeneration Calculator</h3>
        <div className="grid grid-cols-4 gap-4">
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Fuel type</label><select value={fuelId} onChange={e => setFuelId(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1">{STATIONARY_FUELS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Fuel quantity ({fuel.unit})</label><input type="number" value={fuelQty} onChange={e => setFuelQty(e.target.value)} placeholder="0" className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] tabular-nums placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" /></div>
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Electricity allocation %</label><input type="number" value={elecPct} onChange={e => setElecPct(e.target.value)} min="0" max="100" className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" /></div>
          <div className="flex items-end"><button onClick={addItem} className="w-full h-10 rounded-lg bg-[var(--bg-inverse)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--bg-inverse-soft)] active:scale-[0.98] transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" />Calculate</button></div>
        </div>
      </Card>
      <ResultsPanel items={items} onRemove={id => setItems(prev => prev.filter(i => i.id !== id))} />
    </div>
  )
}


/* ═══════════════════════════════════════════
   Scope 2: Purchased Electricity Calculator
   ═══════════════════════════════════════════ */
function ElectricityCalc({ initialItems }: { initialItems?: LineItem[] }) {
  const [gridId, setGridId] = useState(GRID_FACTORS[0].id)
  const [kwh, setKwh] = useState('')
  const [source, setSource] = useState('')
  const [items, setItems] = useState<LineItem[]>(initialItems ?? [])
  const grid = GRID_FACTORS.find(g => g.id === gridId)!

  const addItem = () => {
    const q = parseFloat(kwh)
    if (!q || q <= 0) return
    const co2e_kg = q * grid.ef
    setItems(prev => [...prev, { id: crypto.randomUUID(), label: `${source || grid.name} — ${q.toLocaleString()} kWh`, quantity: q, factorId: grid.id, co2e_kg, co2_kg: co2e_kg, ch4_kg: 0, n2o_kg: 0 }])
    setKwh('')
    setSource('')
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <Card>
        <h3 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)] mb-4">Purchased Electricity Calculator (Location-based)</h3>
        <div className="grid grid-cols-4 gap-4">
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Facility / meter</label><input value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. MTP Olefins" className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" /></div>
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Grid region</label><select value={gridId} onChange={e => setGridId(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1">{GRID_FACTORS.map(g => <option key={g.id} value={g.id}>{g.name} ({g.ef} kg/kWh)</option>)}</select></div>
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Consumption (kWh)</label><input type="number" value={kwh} onChange={e => setKwh(e.target.value)} placeholder="0" className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] tabular-nums placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" onKeyDown={e => e.key === 'Enter' && addItem()} /></div>
          <div className="flex items-end"><button onClick={addItem} className="w-full h-10 rounded-lg bg-[var(--bg-inverse)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--bg-inverse-soft)] active:scale-[0.98] transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" />Calculate</button></div>
        </div>
        {kwh && parseFloat(kwh) > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-[var(--accent-blue-light)] border border-blue-100 flex items-center gap-4"><Info className="w-4 h-4 text-[var(--accent-blue)] flex-shrink-0" /><span className="text-[var(--text-xs)] text-[var(--accent-blue)]">{parseFloat(kwh).toLocaleString()} kWh × {grid.ef} kg CO₂e/kWh = <strong>{kgToTonnes(parseFloat(kwh) * grid.ef).toFixed(4)} tCO₂e</strong></span></div>
        )}
      </Card>
      <ResultsPanel items={items} onRemove={id => setItems(prev => prev.filter(i => i.id !== id))} />
    </div>
  )
}


/* ═══════════════════════════════════════════
   Scope 2: Heat / Steam Calculator
   ═══════════════════════════════════════════ */
function HeatSteamCalc({ initialItems }: { initialItems?: LineItem[] }) {
  const [factorId, setFactorId] = useState(HEAT_FACTORS[0].id)
  const [kwh, setKwh] = useState('')
  const [source, setSource] = useState('')
  const [items, setItems] = useState<LineItem[]>(initialItems ?? [])
  const hf = HEAT_FACTORS.find(h => h.id === factorId)!

  const addItem = () => {
    const q = parseFloat(kwh)
    if (!q || q <= 0) return
    const co2e_kg = q * hf.ef
    setItems(prev => [...prev, { id: crypto.randomUUID(), label: `${source || hf.name} — ${q.toLocaleString()} kWh`, quantity: q, factorId: hf.id, co2e_kg, co2_kg: co2e_kg, ch4_kg: 0, n2o_kg: 0 }])
    setKwh('')
    setSource('')
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <Card>
        <h3 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)] mb-4">Purchased Heat / Steam Calculator</h3>
        <div className="grid grid-cols-4 gap-4">
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Source</label><input value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. Steam header #2" className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" /></div>
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Heat type</label><select value={factorId} onChange={e => setFactorId(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1">{HEAT_FACTORS.map(h => <option key={h.id} value={h.id}>{h.name} ({h.ef} kg/kWh)</option>)}</select></div>
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Consumption (kWh thermal)</label><input type="number" value={kwh} onChange={e => setKwh(e.target.value)} placeholder="0" className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] tabular-nums placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" onKeyDown={e => e.key === 'Enter' && addItem()} /></div>
          <div className="flex items-end"><button onClick={addItem} className="w-full h-10 rounded-lg bg-[var(--bg-inverse)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--bg-inverse-soft)] active:scale-[0.98] transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" />Calculate</button></div>
        </div>
      </Card>
      <ResultsPanel items={items} onRemove={id => setItems(prev => prev.filter(i => i.id !== id))} />
    </div>
  )
}


/* ═══════════════════════════════════════════
   Scope 3: Spend-based Calculator
   ═══════════════════════════════════════════ */
function SpendCalc({ title, initialItems }: { title: string; initialItems?: LineItem[] }) {
  const [catId, setCatId] = useState(SPEND_FACTORS[0].id)
  const [amount, setAmount] = useState('')
  const [vendor, setVendor] = useState('')
  const [items, setItems] = useState<LineItem[]>(initialItems ?? [])
  const factor = SPEND_FACTORS.find(f => f.id === catId)!

  const addItem = () => {
    const q = parseFloat(amount)
    if (!q || q <= 0) return
    const co2e_kg = q * factor.ef
    setItems(prev => [...prev, { id: crypto.randomUUID(), label: `${vendor || factor.category} — $${q.toLocaleString()}`, quantity: q, factorId: factor.id, co2e_kg, co2_kg: co2e_kg, ch4_kg: 0, n2o_kg: 0 }])
    setAmount('')
    setVendor('')
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <Card>
        <h3 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)] mb-4">{title} — Spend-based Method</h3>
        <div className="grid grid-cols-4 gap-4">
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Vendor / description</label><input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. BASF Chemicals" className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" /></div>
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Spend category</label><select value={catId} onChange={e => setCatId(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1">{SPEND_FACTORS.map(f => <option key={f.id} value={f.id}>{f.category} ({f.ef} kg/$)</option>)}</select></div>
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Amount (USD)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] tabular-nums placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" onKeyDown={e => e.key === 'Enter' && addItem()} /></div>
          <div className="flex items-end"><button onClick={addItem} className="w-full h-10 rounded-lg bg-[var(--bg-inverse)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--bg-inverse-soft)] active:scale-[0.98] transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" />Calculate</button></div>
        </div>
      </Card>
      <ResultsPanel items={items} onRemove={id => setItems(prev => prev.filter(i => i.id !== id))} />
    </div>
  )
}


/* ═══════════════════════════════════════════
   Scope 3: Transport Calculator
   ═══════════════════════════════════════════ */
function TransportCalc({ title, initialItems }: { title: string; initialItems?: LineItem[] }) {
  const [modeId, setModeId] = useState(TRANSPORT_FACTORS[0].id)
  const [tonnes, setTonnes] = useState('')
  const [km, setKm] = useState('')
  const [route, setRoute] = useState('')
  const [items, setItems] = useState<LineItem[]>(initialItems ?? [])
  const factor = TRANSPORT_FACTORS.find(f => f.id === modeId)!

  const addItem = () => {
    const t = parseFloat(tonnes)
    const k = parseFloat(km)
    if (!t || !k || t <= 0 || k <= 0) return
    const tkm = t * k
    const co2e_kg = tkm * factor.ef
    setItems(prev => [...prev, { id: crypto.randomUUID(), label: `${route || factor.mode} — ${t}t × ${k.toLocaleString()} km`, quantity: tkm, factorId: factor.id, co2e_kg, co2_kg: co2e_kg, ch4_kg: 0, n2o_kg: 0 }])
    setTonnes('')
    setKm('')
    setRoute('')
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <Card>
        <h3 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)] mb-4">{title} — Distance-based Method</h3>
        <div className="grid grid-cols-5 gap-4">
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Route / description</label><input value={route} onChange={e => setRoute(e.target.value)} placeholder="e.g. MTP→Laem Chabang" className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" /></div>
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Transport mode</label><select value={modeId} onChange={e => setModeId(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1">{TRANSPORT_FACTORS.map(f => <option key={f.id} value={f.id}>{f.mode}</option>)}</select></div>
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Weight (tonnes)</label><input type="number" value={tonnes} onChange={e => setTonnes(e.target.value)} placeholder="0" className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] tabular-nums placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" /></div>
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Distance (km)</label><input type="number" value={km} onChange={e => setKm(e.target.value)} placeholder="0" className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] tabular-nums placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" onKeyDown={e => e.key === 'Enter' && addItem()} /></div>
          <div className="flex items-end"><button onClick={addItem} className="w-full h-10 rounded-lg bg-[var(--bg-inverse)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--bg-inverse-soft)] active:scale-[0.98] transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" />Calculate</button></div>
        </div>
      </Card>
      <ResultsPanel items={items} onRemove={id => setItems(prev => prev.filter(i => i.id !== id))} />
    </div>
  )
}


/* ═══════════════════════════════════════════
   Scope 3: Waste Calculator
   ═══════════════════════════════════════════ */
function WasteCalc({ initialItems }: { initialItems?: LineItem[] }) {
  const [methodId, setMethodId] = useState(WASTE_FACTORS[0].id)
  const [tonnes, setTonnes] = useState('')
  const [desc, setDesc] = useState('')
  const [items, setItems] = useState<LineItem[]>(initialItems ?? [])
  const factor = WASTE_FACTORS.find(f => f.id === methodId)!

  const addItem = () => {
    const q = parseFloat(tonnes)
    if (!q || q <= 0) return
    const co2e_kg = q * factor.ef
    setItems(prev => [...prev, { id: crypto.randomUUID(), label: `${desc || factor.method} — ${q} tonnes`, quantity: q, factorId: factor.id, co2e_kg, co2_kg: co2e_kg, ch4_kg: 0, n2o_kg: 0 }])
    setTonnes('')
    setDesc('')
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <Card>
        <h3 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)] mb-4">Waste Generated — Disposal Method</h3>
        <div className="grid grid-cols-4 gap-4">
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Description</label><input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. General waste Q1" className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" /></div>
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Disposal method</label><select value={methodId} onChange={e => setMethodId(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1">{WASTE_FACTORS.map(f => <option key={f.id} value={f.id}>{f.method} ({f.ef} kg/t)</option>)}</select></div>
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Weight (tonnes)</label><input type="number" value={tonnes} onChange={e => setTonnes(e.target.value)} placeholder="0" className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] tabular-nums placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" onKeyDown={e => e.key === 'Enter' && addItem()} /></div>
          <div className="flex items-end"><button onClick={addItem} className="w-full h-10 rounded-lg bg-[var(--bg-inverse)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--bg-inverse-soft)] active:scale-[0.98] transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" />Calculate</button></div>
        </div>
      </Card>
      <ResultsPanel items={items} onRemove={id => setItems(prev => prev.filter(i => i.id !== id))} />
    </div>
  )
}


/* ═══════════════════════════════════════════
   Scope 3: Business Travel / Commuting Calculator
   ═══════════════════════════════════════════ */
function TravelCalc({ title, initialItems }: { title: string; initialItems?: LineItem[] }) {
  const [modeId, setModeId] = useState(TRAVEL_FACTORS[0].id)
  const [pax, setPax] = useState('1')
  const [km, setKm] = useState('')
  const [desc, setDesc] = useState('')
  const [items, setItems] = useState<LineItem[]>(initialItems ?? [])
  const factor = TRAVEL_FACTORS.find(f => f.id === modeId)!
  const isHotel = factor.id === 'hotel'

  const addItem = () => {
    const p = parseInt(pax) || 1
    const k = parseFloat(km)
    if (!k || k <= 0) return
    const co2e_kg = isHotel ? k * factor.ef * p : k * factor.ef * p
    setItems(prev => [...prev, { id: crypto.randomUUID(), label: `${desc || factor.mode} — ${p} pax × ${k.toLocaleString()} ${isHotel ? 'nights' : 'km'}`, quantity: k * p, factorId: factor.id, co2e_kg, co2_kg: co2e_kg, ch4_kg: 0, n2o_kg: 0 }])
    setKm('')
    setDesc('')
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <Card>
        <h3 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)] mb-4">{title}</h3>
        <div className="grid grid-cols-5 gap-4">
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Description</label><input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. BKK→SIN flight" className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" /></div>
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Mode</label><select value={modeId} onChange={e => setModeId(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1">{TRAVEL_FACTORS.map(f => <option key={f.id} value={f.id}>{f.mode}</option>)}</select></div>
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Passengers</label><input type="number" value={pax} onChange={e => setPax(e.target.value)} min="1" className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" /></div>
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">{isHotel ? 'Room-nights' : 'Distance (km)'}</label><input type="number" value={km} onChange={e => setKm(e.target.value)} placeholder="0" className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] tabular-nums placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" onKeyDown={e => e.key === 'Enter' && addItem()} /></div>
          <div className="flex items-end"><button onClick={addItem} className="w-full h-10 rounded-lg bg-[var(--bg-inverse)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--bg-inverse-soft)] active:scale-[0.98] transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" />Calculate</button></div>
        </div>
      </Card>
      <ResultsPanel items={items} onRemove={id => setItems(prev => prev.filter(i => i.id !== id))} />
    </div>
  )
}


/* ═══════════════════════════════════════════
   UNFCCC CDM Calculator
   ═══════════════════════════════════════════ */
function UNFCCCCalc() {
  const [baselineEF, setBaselineEF] = useState('0.8')  // tCO₂e/MWh
  const [projectEF, setProjectEF] = useState('0.05')
  const [generation, setGeneration] = useState('')      // MWh
  const [leakage, setLeakage] = useState('0')           // tCO₂e
  const [items, setItems] = useState<LineItem[]>([])

  const addItem = () => {
    const gen = parseFloat(generation)
    const bef = parseFloat(baselineEF)
    const pef = parseFloat(projectEF)
    const leak = parseFloat(leakage) || 0
    if (!gen || gen <= 0) return
    const baselineEmissions = gen * bef * 1000  // kg
    const projectEmissions = gen * pef * 1000   // kg
    const reductions = baselineEmissions - projectEmissions - (leak * 1000)
    setItems(prev => [...prev, {
      id: crypto.randomUUID(),
      label: `CDM — ${gen.toLocaleString()} MWh (BL: ${bef}, Proj: ${pef})`,
      quantity: gen,
      factorId: 'unfccc',
      co2e_kg: reductions,
      co2_kg: reductions,
      ch4_kg: 0,
      n2o_kg: 0,
    }])
    setGeneration('')
  }

  const gen = parseFloat(generation) || 0
  const bef = parseFloat(baselineEF) || 0
  const pef = parseFloat(projectEF) || 0
  const leak = parseFloat(leakage) || 0

  return (
    <div className="space-y-5 animate-fade-in">
      <Card>
        <h3 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)] mb-1">UNFCCC CDM Calculator</h3>
        <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mb-4">Emission Reductions (ER) = Baseline Emissions − Project Emissions − Leakage</p>
        <div className="grid grid-cols-5 gap-4">
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Baseline EF (tCO₂e/MWh)</label><input type="number" value={baselineEF} onChange={e => setBaselineEF(e.target.value)} step="0.01" className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" /></div>
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Project EF (tCO₂e/MWh)</label><input type="number" value={projectEF} onChange={e => setProjectEF(e.target.value)} step="0.01" className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" /></div>
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Generation (MWh)</label><input type="number" value={generation} onChange={e => setGeneration(e.target.value)} placeholder="0" className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] tabular-nums placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" onKeyDown={e => e.key === 'Enter' && addItem()} /></div>
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Leakage (tCO₂e)</label><input type="number" value={leakage} onChange={e => setLeakage(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" /></div>
          <div className="flex items-end"><button onClick={addItem} className="w-full h-10 rounded-lg bg-[var(--bg-inverse)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--bg-inverse-soft)] active:scale-[0.98] transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" />Calculate</button></div>
        </div>
        {gen > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-4 p-4 rounded-xl bg-[var(--accent-blue-light)] border border-blue-100">
            <div><p className="text-[10px] text-[var(--accent-blue)] uppercase tracking-wider font-bold">Baseline</p><p className="text-[var(--text-base)] font-bold text-[var(--text-primary)] tabular-nums">{(gen * bef).toFixed(2)} <span className="text-[var(--text-xs)] font-normal text-[var(--text-tertiary)]">tCO₂e</span></p></div>
            <div><p className="text-[10px] text-[var(--accent-blue)] uppercase tracking-wider font-bold">Project</p><p className="text-[var(--text-base)] font-bold text-[var(--text-primary)] tabular-nums">{(gen * pef).toFixed(2)} <span className="text-[var(--text-xs)] font-normal text-[var(--text-tertiary)]">tCO₂e</span></p></div>
            <div><p className="text-[10px] text-[var(--accent-teal)] uppercase tracking-wider font-bold">Emission Reductions</p><p className="text-[var(--text-base)] font-bold text-[var(--accent-teal)] tabular-nums">{(gen * bef - gen * pef - leak).toFixed(2)} <span className="text-[var(--text-xs)] font-normal">tCO₂e</span></p></div>
          </div>
        )}
      </Card>
      <ResultsPanel items={items} onRemove={id => setItems(prev => prev.filter(i => i.id !== id))} />
    </div>
  )
}


/* ═══════════════════════════════════════════
   Uncertainty Engine (Monte Carlo)
   ═══════════════════════════════════════════ */
function UncertaintyEngine() {
  const [centralValue, setCentralValue] = useState('50000')
  const [uncertainty, setUncertainty] = useState('10')
  const [simulations, setSimulations] = useState('10000')
  const [results, setResults] = useState<{ mean: number; std: number; p5: number; p95: number; ci: string; samples: number[] } | null>(null)

  const runMonteCarlo = () => {
    const cv = parseFloat(centralValue) || 0
    const unc = parseFloat(uncertainty) / 100 || 0.1
    const n = Math.min(parseInt(simulations) || 10000, 100000)

    // Generate normal distribution samples using Box-Muller
    const samples: number[] = []
    const stdDev = cv * unc
    for (let i = 0; i < n; i++) {
      const u1 = Math.random()
      const u2 = Math.random()
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      samples.push(cv + z * stdDev)
    }

    samples.sort((a, b) => a - b)
    const mean = samples.reduce((a, b) => a + b, 0) / n
    const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / n
    const std = Math.sqrt(variance)
    const p5 = samples[Math.floor(n * 0.05)]
    const p95 = samples[Math.floor(n * 0.95)]
    const ci = `${p5.toFixed(1)} — ${p95.toFixed(1)}`

    setResults({ mean, std, p5, p95, ci, samples })
  }

  // Build histogram bins
  const histogram = useMemo(() => {
    if (!results) return []
    const { samples, p5, p95 } = results
    const min = p5 - (p95 - p5) * 0.3
    const max = p95 + (p95 - p5) * 0.3
    const binCount = 40
    const binWidth = (max - min) / binCount
    const bins = Array(binCount).fill(0)
    for (const s of samples) {
      const idx = Math.floor((s - min) / binWidth)
      if (idx >= 0 && idx < binCount) bins[idx]++
    }
    const maxBin = Math.max(...bins)
    return bins.map((count, i) => ({ x: min + (i + 0.5) * binWidth, count, pct: count / maxBin }))
  }, [results])

  return (
    <div className="space-y-5 animate-fade-in">
      <Card>
        <h3 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)] mb-1">Uncertainty Engine — Monte Carlo Simulation</h3>
        <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mb-4">Model emission uncertainty using normal distribution. Enter your total tCO₂e and percentage uncertainty (±%).</p>
        <div className="grid grid-cols-4 gap-4">
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Central value (tCO₂e)</label><input type="number" value={centralValue} onChange={e => setCentralValue(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" /></div>
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Uncertainty (± %)</label><input type="number" value={uncertainty} onChange={e => setUncertainty(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1" /></div>
          <div><label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Simulations</label><select value={simulations} onChange={e => setSimulations(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1"><option value="1000">1,000</option><option value="10000">10,000</option><option value="50000">50,000</option><option value="100000">100,000</option></select></div>
          <div className="flex items-end"><button onClick={runMonteCarlo} className="w-full h-10 rounded-lg bg-[var(--accent-purple)] text-white text-[var(--text-sm)] font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"><ShieldQuestion className="w-4 h-4" />Run Simulation</button></div>
        </div>
      </Card>

      {results && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-4 animate-fade-in">
            {[
              { label: 'Mean', value: results.mean.toFixed(1), unit: 'tCO₂e', accent: 'var(--accent-teal)' },
              { label: 'Std Deviation', value: results.std.toFixed(1), unit: 'tCO₂e', accent: 'var(--accent-blue)' },
              { label: '90% CI Lower (P5)', value: results.p5.toFixed(1), unit: 'tCO₂e', accent: 'var(--accent-purple)' },
              { label: '90% CI Upper (P95)', value: results.p95.toFixed(1), unit: 'tCO₂e', accent: 'var(--accent-amber)' },
            ].map((s) => (
              <Card key={s.label} hover className="group relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl opacity-60 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(90deg, ${s.accent}, transparent)` }} />
                <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.06em]">{s.label}</p>
                <p className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)] mt-1 tabular-nums">{s.value}</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">{s.unit}</p>
              </Card>
            ))}
          </div>

          {/* Histogram */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">Distribution ({parseInt(simulations).toLocaleString()} simulations)</h3>
              <Badge variant="purple" dot>90% CI: {results.ci} tCO₂e</Badge>
            </div>
            <div className="flex items-end gap-[1px] h-40">
              {histogram.map((bin, i) => {
                const inCI = bin.x >= results.p5 && bin.x <= results.p95
                return (
                  <div key={i} className="flex-1 flex flex-col justify-end h-full">
                    <div
                      className="w-full rounded-t-sm transition-all"
                      style={{
                        height: `${bin.pct * 100}%`,
                        backgroundColor: inCI ? 'var(--accent-purple)' : 'var(--bg-tertiary)',
                        opacity: inCI ? 0.7 : 0.4,
                      }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums">{results.p5.toFixed(0)}</span>
              <span className="text-[10px] text-[var(--accent-purple)] font-bold">Mean: {results.mean.toFixed(0)}</span>
              <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums">{results.p95.toFixed(0)}</span>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
