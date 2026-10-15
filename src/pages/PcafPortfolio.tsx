import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, X, Lock, Loader2, RefreshCw, Send, CheckCircle2 } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../auth/AuthContext'
import { facilities as facilitiesApi, pcaf as pcafApi, type ApiFacility, type PcafAsset, type PcafPortfolioSummary, type PcafAssetClass } from '../lib/api'
import { PCAF_CALCULATORS } from '../calculators/pcaf/registry'
import type { PcafAssetCalculator } from '../calculators/pcaf'
import AssetCalculator from '../components/pcaf/AssetCalculator'
import PortfolioGrid from '../components/pcaf/PortfolioGrid'

/**
 * /calculators/pcaf — PCAF Financed Emissions portfolio.
 *
 * Gated behind `calculators.edit`. Renders portfolio KPIs + per-asset-class
 * donut, the portfolio table, and a drawer-style "+ Add asset" panel that
 * surfaces the 9 PCAF asset-class calculators.
 *
 * "Sync to Scope 3" aggregates the portfolio into a single activity_data
 * row (scope=3, category='Cat 15 - Investments') for the org's primary
 * facility — that row then propagates to ESRS E1-6 / GRI 305-3 / TCFD / SEC
 * climate disclosures via the standard reporting workflow.
 */

const PIE_COLOURS = ['#7c3aed', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6', '#84cc16', '#a855f7']

export default function PcafPortfolio() {
  const { permissions } = useAuth()
  const canEdit = permissions.includes('calculators.edit')
  const [reportingYear, setReportingYear] = useState<number>(() => new Date().getFullYear())
  const [assets, setAssets] = useState<PcafAsset[]>([])
  const [summary, setSummary] = useState<PcafPortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [pickedClass, setPickedClass] = useState<PcafAssetCalculator | null>(null)
  const [facilities, setFacilities] = useState<ApiFacility[]>([])
  const [syncBusy, setSyncBusy] = useState(false)
  const [syncResult, setSyncResult] = useState<{ id: string; total: number; dq: number } | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [a, s, f] = await Promise.all([
        pcafApi.listAssets(reportingYear),
        pcafApi.summary(reportingYear),
        facilitiesApi.list().catch(() => [] as ApiFacility[]),
      ])
      setAssets(a)
      setSummary(s)
      setFacilities(f)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load portfolio')
    } finally {
      setLoading(false)
    }
  }, [reportingYear])

  useEffect(() => { void load() }, [load])

  const onSaved = () => {
    setPickedClass(null)
    setAdding(false)
    void load()
  }

  const donutData = useMemo(() => {
    if (!summary) return []
    return summary.by_asset_class.map(b => ({
      name: ASSET_CLASS_LABEL[b.asset_class] ?? b.asset_class,
      value: b.financed_total,
    })).filter(d => d.value > 0)
  }, [summary])

  const barData = useMemo(() => {
    if (!summary) return []
    return summary.by_asset_class.map(b => ({
      name: ASSET_CLASS_LABEL[b.asset_class] ?? b.asset_class,
      financed: b.financed_total,
    }))
  }, [summary])

  if (!canEdit) {
    return (
      <div className="page-container">
        <PageHeader title="PCAF Portfolio" description="Financed-emissions tracking for financial institutions." />
        <div className="rounded-[var(--radius-lg)] border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">
          <Lock className="w-5 h-5 mb-2" />
          You need the <code className="text-amber-100">calculators.edit</code> permission to view or update PCAF assets.
          Please ask your platform admin to assign the appropriate role.
        </div>
      </div>
    )
  }

  return (
    <div className="page-container animate-fade-in">
      <PageHeader
        breadcrumbs={[
          { label: 'Data', to: '/data' },
          { label: 'Calculators', to: '/calculators' },
          { label: 'PCAF Portfolio' },
        ]}
        eyebrow="PCAF · Scope 3 Category 15"
        title={`PCAF Portfolio — Financed Emissions FY${reportingYear}`}
        description="Track Scope 3 Category 15 emissions across your investment portfolio. Per-asset attribution × counterparty emissions, with PCAF data-quality scores 1–5."
        actions={
          <div className="flex items-center gap-2">
            <select
              value={reportingYear}
              onChange={e => setReportingYear(Number(e.target.value))}
              className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-[var(--text-sm)]"
            >
              {yearOptions().map(y => <option key={y} value={y}>FY {y}</option>)}
            </select>
            <button
              onClick={() => void load()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] hover:bg-[var(--bg-secondary)] text-[var(--text-sm)]"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button
              onClick={() => { setAdding(true); setPickedClass(null) }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white font-medium hover:opacity-90 text-[var(--text-sm)]"
            >
              <Plus className="w-3.5 h-3.5" /> Add asset
            </button>
          </div>
        }
      />

      {loadError && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-rose-500/40 bg-rose-500/10 p-3 text-[12px] text-rose-200">
          {loadError}
        </div>
      )}

      {/* KPI band */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi label="Total financed emissions" value={fmtTons(summary?.total_financed_emissions ?? 0)} subtle="Scope 3 Cat 15" />
        <Kpi label="Weighted PCAF DQ" value={(summary?.weighted_data_quality ?? 0).toFixed(2)} subtle="1 (best) – 5 (worst)" />
        <Kpi label="Coverage with reported emissions" value={`${(summary?.coverage_reported_pct ?? 0).toFixed(1)}%`} subtle="of outstanding" />
        <Kpi label="Portfolio outstanding" value={fmtUsd(summary?.total_outstanding ?? 0)} subtle={`${summary?.asset_count ?? 0} assets`} />
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        <ChartCard title="Financed emissions by asset class">
          {donutData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {donutData.map((_, i) => <Cell key={i} fill={PIE_COLOURS[i % PIE_COLOURS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmtTons(v) + ' CO₂e'} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <ChartCard title="Asset-class contribution (tCO₂e)">
          {barData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => fmtTons(v) + ' CO₂e'} />
                <Bar dataKey="financed" fill="#7c3aed" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      {/* Asset-class summary table */}
      {summary && summary.by_asset_class.length > 0 && (
        <section className="mb-5 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden">
          <table className="w-full text-[var(--text-sm)]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--bg-secondary)]">
                <th className="px-3 py-2 font-medium">Asset class</th>
                <th className="px-3 py-2 font-medium text-right">Assets</th>
                <th className="px-3 py-2 font-medium text-right">Outstanding</th>
                <th className="px-3 py-2 font-medium text-right">Financed emissions</th>
                <th className="px-3 py-2 font-medium text-right">Weighted DQ</th>
              </tr>
            </thead>
            <tbody>
              {summary.by_asset_class.map(b => (
                <tr key={b.asset_class} className="border-t border-[var(--border-default)]">
                  <td className="px-3 py-2 text-[var(--text-primary)]">{ASSET_CLASS_LABEL[b.asset_class] ?? b.asset_class}</td>
                  <td className="px-3 py-2 text-right">{b.asset_count}</td>
                  <td className="px-3 py-2 text-right">{fmtUsd(b.outstanding_total)}</td>
                  <td className="px-3 py-2 text-right font-medium">{fmtTons(b.financed_total)} CO₂e</td>
                  <td className="px-3 py-2 text-right">{b.weighted_dq.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Sync row */}
      <section className="mb-5 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">Sync to Scope 3</div>
            <div className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
              Writes one draft activity_data row (Cat 15 — Investments) for FY{reportingYear} to flow into ESRS E1-6 / GRI 305-3 / TCFD / SEC disclosures.
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <select
              id="pcaf-sync-facility"
              className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-[var(--text-sm)]"
              disabled={facilities.length === 0}
              defaultValue={facilities[0]?.id ?? ''}
            >
              {facilities.length === 0 ? <option value="">No facilities</option> :
                facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <button
              onClick={async () => {
                setSyncBusy(true)
                setSyncError(null)
                try {
                  const sel = document.getElementById('pcaf-sync-facility') as HTMLSelectElement | null
                  const fid = sel?.value
                  if (!fid) throw new Error('Pick a facility to attach the Scope 3 row to')
                  const r = await pcafApi.syncToScope3({ reportingYear, facilityId: fid })
                  setSyncResult({ id: r.activity_data_id, total: r.total_financed_emissions, dq: r.weighted_data_quality })
                } catch (e) {
                  setSyncError(e instanceof Error ? e.message : 'Sync failed')
                } finally {
                  setSyncBusy(false)
                }
              }}
              disabled={syncBusy || assets.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white font-medium hover:opacity-90 disabled:opacity-50 text-[var(--text-sm)]"
            >
              {syncBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Sync to Scope 3
            </button>
          </div>
        </div>
        {syncError && (
          <div className="mt-2 text-[12px] text-rose-300">{syncError}</div>
        )}
        {syncResult && (
          <div className="mt-2 text-[12px] text-emerald-300 inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Synced {fmtTons(syncResult.total)} CO₂e (weighted DQ {syncResult.dq.toFixed(2)}) — activity_data id {syncResult.id.slice(0, 8)}…
          </div>
        )}
      </section>

      {/* Portfolio grid */}
      <section>
        {loading ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-10 text-center text-[var(--text-tertiary)]">
            <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin" /> Loading portfolio…
          </div>
        ) : (
          <PortfolioGrid assets={assets} onChange={load} />
        )}
      </section>

      {/* Add-asset drawer */}
      {adding && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end" onClick={() => setAdding(false)}>
          <div
            className="w-full max-w-2xl h-full overflow-y-auto bg-[var(--bg-primary)] border-l border-[var(--border-default)] p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[var(--text-lg)] font-semibold">{pickedClass ? pickedClass.name : 'Add PCAF asset'}</h2>
              <button onClick={() => setAdding(false)} className="p-1 rounded hover:bg-[var(--bg-secondary)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            {!pickedClass ? (
              <div className="grid grid-cols-1 gap-2">
                {PCAF_CALCULATORS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setPickedClass(c)}
                    className="text-left rounded-[var(--radius-md)] border border-[var(--border-default)] p-3 hover:bg-[var(--bg-secondary)] transition"
                  >
                    <div className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{c.name}</div>
                    <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{c.description}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <button
                  onClick={() => setPickedClass(null)}
                  className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-2"
                >
                  ← Pick a different asset class
                </button>
                <AssetCalculator calculator={pickedClass} reportingYear={reportingYear} onSaved={onSaved} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const ASSET_CLASS_LABEL: Record<PcafAssetClass, string> = {
  listed_equity: 'Listed equity',
  corporate_bond: 'Corporate bonds',
  business_loan: 'Business loans',
  unlisted_equity: 'Unlisted equity',
  project_finance: 'Project finance',
  commercial_real_estate: 'Commercial real estate',
  mortgage: 'Mortgages',
  motor_vehicle_loan: 'Motor vehicle loans',
  sovereign_debt: 'Sovereign debt',
}

function yearOptions(): number[] {
  const y = new Date().getFullYear()
  return [y + 1, y, y - 1, y - 2, y - 3, y - 4]
}

function fmtUsd(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

function fmtTons(v: number): string {
  if (!Number.isFinite(v) || v === 0) return '0 t'
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} Mt`
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(2)} kt`
  return `${v.toFixed(1)} t`
}

function Kpi({ label, value, subtle }: { label: string; value: string; subtle?: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-4">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">{label}</div>
      <div className="mt-1 text-[var(--text-xl)] font-semibold text-[var(--text-primary)]">{value}</div>
      {subtle ? <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{subtle}</div> : null}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-4">
      <div className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] mb-2">{title}</div>
      {children}
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="h-[220px] flex items-center justify-center text-[12px] text-[var(--text-tertiary)]">
      No assets in this reporting year yet.
    </div>
  )
}
