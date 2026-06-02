import { useMemo, useState } from 'react'
import { Trash2, Search } from 'lucide-react'
import type { PcafAsset, PcafAssetClass } from '../../lib/api'
import { pcaf as pcafApi } from '../../lib/api'

/**
 * Portfolio table. Filterable by asset class and free-text counterparty
 * search. Delete is destructive — gated behind a single-step confirm.
 */
interface Props {
  assets: PcafAsset[]
  onChange?: () => void
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

const num = (v: unknown): number => {
  if (v === null || v === undefined) return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

const fmtUsd = (v: number): string => {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

const fmtTons = (v: number): string => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} Mt`
  if (v >= 1000) return `${(v / 1000).toFixed(2)} kt`
  return `${v.toFixed(1)} t`
}

export default function PortfolioGrid({ assets, onChange }: Props) {
  const [filterClass, setFilterClass] = useState<PcafAssetClass | ''>('')
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return assets.filter(a => {
      if (filterClass && a.asset_class !== filterClass) return false
      if (q && !a.counterparty_name.toLowerCase().includes(q)) return false
      return true
    })
  }, [assets, filterClass, query])

  const remove = async (id: string) => {
    setBusy(id)
    try {
      await pcafApi.deleteAsset(id)
      setPendingDelete(null)
      onChange?.()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden">
      <div className="p-3 flex flex-wrap items-center gap-2 border-b border-[var(--border-default)]">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search counterparty…"
            className="w-full pl-7 pr-2 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-sm)]"
          />
        </div>
        <select
          value={filterClass}
          onChange={e => setFilterClass(e.target.value as PcafAssetClass | '')}
          className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-[var(--text-sm)]"
        >
          <option value="">All asset classes</option>
          {Object.entries(ASSET_CLASS_LABEL).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
        <span className="text-[12px] text-[var(--text-tertiary)] ml-auto">
          {filtered.length} of {assets.length} assets
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[var(--text-sm)]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--bg-secondary)]">
              <th className="px-3 py-2 font-medium">Counterparty</th>
              <th className="px-3 py-2 font-medium">Asset class</th>
              <th className="px-3 py-2 font-medium text-right">Outstanding</th>
              <th className="px-3 py-2 font-medium text-right">Attribution</th>
              <th className="px-3 py-2 font-medium text-right">Financed</th>
              <th className="px-3 py-2 font-medium text-center">DQ</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-[var(--text-tertiary)]">
                  No assets match your filter. Click <span className="font-medium">Add asset</span> to add the first one.
                </td>
              </tr>
            ) : filtered.map(a => (
              <tr key={a.id} className="border-t border-[var(--border-default)] hover:bg-[var(--bg-secondary)]/40">
                <td className="px-3 py-2 text-[var(--text-primary)]">
                  <div className="font-medium">{a.counterparty_name}</div>
                  {a.counterparty_sector ? (
                    <div className="text-[10px] text-[var(--text-tertiary)]">{a.counterparty_sector}{a.counterparty_country ? ` · ${a.counterparty_country}` : ''}</div>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-[var(--text-secondary)]">{ASSET_CLASS_LABEL[a.asset_class]}</td>
                <td className="px-3 py-2 text-right text-[var(--text-primary)]">{fmtUsd(num(a.outstanding_amount))}</td>
                <td className="px-3 py-2 text-right text-[var(--text-secondary)]">{num(a.attribution_factor).toFixed(4)}</td>
                <td className="px-3 py-2 text-right text-[var(--text-primary)] font-medium">{fmtTons(num(a.financed_emissions_total))} CO₂e</td>
                <td className="px-3 py-2 text-center">
                  <DqBadge score={a.data_quality_score} />
                </td>
                <td className="px-3 py-2 text-right">
                  {pendingDelete === a.id ? (
                    <span className="inline-flex items-center gap-1">
                      <button
                        onClick={() => remove(a.id)}
                        disabled={busy === a.id}
                        className="text-rose-400 hover:text-rose-300 text-[11px] font-medium px-1.5 py-0.5 rounded"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setPendingDelete(null)}
                        className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-[11px] px-1.5 py-0.5"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setPendingDelete(a.id)}
                      title="Delete"
                      className="text-[var(--text-tertiary)] hover:text-rose-400 p-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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

function DqBadge({ score }: { score: number }) {
  const colour = score <= 2
    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    : score <= 3
    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
  return (
    <span className={`inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded border text-[11px] font-medium ${colour}`}>
      {score}
    </span>
  )
}
