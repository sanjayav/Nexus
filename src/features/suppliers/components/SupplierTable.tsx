import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { Check, Minus, Search, SearchX, Send, X } from 'lucide-react'
import { Badge, Button, Card, CardHeader, EmptyState, Tabs, ease, inputClass, tableClass } from '@/components/ui'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import type { DataStatus, Risk, Tier } from '@/features/suppliers/data'
import type { SupplierView } from '@/features/suppliers/store'
import { suppliersStrings } from '@/features/suppliers/suppliers.strings'
import { RISK_TONE, StatusBadge, compactSelect } from './shared'

type TabKey = 'all' | 'notInvited' | 'inProgress' | 'submitted' | 'verified'
const TAB_KEYS: TabKey[] = ['all', 'notInvited', 'inProgress', 'submitted', 'verified']
const inTab = (tab: TabKey, status: DataStatus) =>
  tab === 'all' || (tab === 'inProgress' ? status === 'invited' || status === 'filling' : status === tab)

export function SupplierTable({
  suppliers,
  selected,
  flash,
  onToggle,
  onSetMany,
  onClearSelection,
  onOpen,
  onInviteSelected,
}: {
  suppliers: SupplierView[]
  selected: Set<string>
  flash: Set<string>
  onToggle: (id: string) => void
  onSetMany: (ids: string[], checked: boolean) => void
  onClearSelection: () => void
  onOpen: (id: string) => void
  onInviteSelected: () => void
}) {
  const s = useStrings(suppliersStrings)
  const f = useFormat()
  const [tab, setTab] = useState<TabKey>('all')
  const [query, setQuery] = useState('')
  const [tier, setTier] = useState<'all' | `${Tier}`>('all')
  const [category, setCategory] = useState('all')
  const [risk, setRisk] = useState<'all' | Risk>('all')

  const categories = useMemo(() => [...new Set(suppliers.map(sp => sp.category))], [suppliers])

  // Search and dropdown filters first; tab counts reflect them.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return suppliers.filter(
      sp =>
        (!q || sp.name.toLowerCase().includes(q) || sp.category.toLowerCase().includes(q) || sp.region.toLowerCase().includes(q)) &&
        (tier === 'all' || String(sp.tier) === tier) &&
        (category === 'all' || sp.category === category) &&
        (risk === 'all' || sp.risk === risk),
    )
  }, [suppliers, query, tier, category, risk])
  const rows = filtered.filter(sp => inTab(tab, sp.status))
  const tabs = TAB_KEYS.map(k => ({ value: k, label: s.table.tabs[k], count: filtered.filter(sp => inTab(k, sp.status)).length }))

  const filtersActive = tab !== 'all' || query !== '' || tier !== 'all' || category !== 'all' || risk !== 'all'
  const clearFilters = () => {
    setTab('all')
    setQuery('')
    setTier('all')
    setCategory('all')
    setRisk('all')
  }

  const visibleIds = rows.map(r => r.id)
  const allChecked = visibleIds.length > 0 && visibleIds.every(id => selected.has(id))
  const someChecked = !allChecked && visibleIds.some(id => selected.has(id))

  return (
    <Card>
      <CardHeader title={s.table.title} description={s.table.description} />

      <div className="flex flex-col gap-3 mb-4">
        <Tabs items={tabs} value={tab} onChange={setTab} />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={s.table.search}
              aria-label={s.table.search}
              className={clsx(inputClass, 'pl-9')}
            />
          </div>
          <select value={tier} onChange={e => setTier(e.target.value as typeof tier)} aria-label={s.table.tier} className={compactSelect}>
            <option value="all">{s.table.allTiers}</option>
            <option value="1">{s.tier[1]}</option>
            <option value="2">{s.tier[2]}</option>
          </select>
          <select value={category} onChange={e => setCategory(e.target.value)} aria-label={s.table.category} className={compactSelect}>
            <option value="all">{s.table.allCategories}</option>
            {categories.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={risk}
            onChange={e => setRisk(e.target.value as typeof risk)}
            aria-label={s.table.riskFilter}
            className={compactSelect}
          >
            <option value="all">{s.table.allRisks}</option>
            {(['high', 'medium', 'low'] as Risk[]).map(r => (
              <option key={r} value={r}>
                {s.riskLevel[r]}
              </option>
            ))}
          </select>
          {filtersActive && (
            <Button size="sm" variant="ghost" icon={X} onClick={clearFilters}>
              {s.table.clear}
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: ease.out }}
            className="overflow-hidden"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-zinc-900 text-white px-4 py-2.5">
              <span className="text-[13px] font-medium tabular">{fmt(s.table.selected, { count: selected.size })}</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="h-8 px-3 rounded-lg text-[13px] text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {s.table.clearSelection}
                </button>
                <button
                  type="button"
                  onClick={onInviteSelected}
                  className="h-8 px-3 rounded-lg text-[13px] font-medium bg-white text-zinc-900 hover:bg-zinc-100 inline-flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  {s.table.inviteSelected}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {rows.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={s.table.emptyTitle}
          description={s.table.emptyDesc}
          action={
            filtersActive ? (
              <Button size="sm" onClick={clearFilters}>
                {s.table.clear}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className={tableClass.wrap}>
          <table className={clsx(tableClass.table, 'min-w-[1120px]')}>
            <thead>
              <tr>
                <th className={clsx(tableClass.th, 'w-10 !pr-0')}>
                  <Checkbox
                    checked={allChecked}
                    mixed={someChecked}
                    label={s.table.selectAll}
                    onChange={() => onSetMany(visibleIds, !allChecked)}
                  />
                </th>
                <th className={tableClass.th}>{s.table.cols.supplier}</th>
                <th className={tableClass.th}>{s.table.cols.tier}</th>
                <th className={tableClass.th}>{s.table.cols.category}</th>
                <th className={clsx(tableClass.th, 'text-right')}>{s.table.cols.spend}</th>
                <th className={clsx(tableClass.th, 'text-right')}>{s.table.cols.emissions}</th>
                <th className={tableClass.th}>{s.table.cols.status}</th>
                <th className={tableClass.th}>{s.table.cols.pcf}</th>
                <th className={clsx(tableClass.th, 'text-right')}>{s.table.cols.esg}</th>
                <th className={tableClass.th}>{s.table.cols.risk}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(sp => (
                <tr
                  key={sp.id}
                  onClick={() => onOpen(sp.id)}
                  className={clsx(
                    'cursor-pointer hover:bg-zinc-900/[0.025] transition-colors',
                    flash.has(sp.id) ? 'bg-emerald-50 duration-150' : 'duration-1000',
                    selected.has(sp.id) && !flash.has(sp.id) && 'bg-zinc-900/[0.03]',
                  )}
                >
                  <td className={clsx(tableClass.td, 'w-10 !pr-0')} onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(sp.id)}
                      label={fmt(s.table.selectOne, { name: sp.name })}
                      onChange={() => onToggle(sp.id)}
                    />
                  </td>
                  <td className={tableClass.td}>
                    <div className="font-medium text-zinc-900 whitespace-nowrap">{sp.name}</div>
                    <div className="text-xs text-zinc-500">{sp.region}</div>
                  </td>
                  <td className={tableClass.td}>
                    <Badge>{s.tier[sp.tier]}</Badge>
                  </td>
                  <td className={clsx(tableClass.td, 'whitespace-nowrap')}>{sp.category}</td>
                  <td className={clsx(tableClass.td, 'text-right tabular')}>
                    {sp.spendShare === null ? <span className="text-zinc-400">{s.table.noSpend}</span> : f.percent(sp.spendShare, 1)}
                  </td>
                  <td className={clsx(tableClass.td, 'text-right tabular')}>
                    <div className={clsx(sp.scope3Cat === 1 ? 'text-zinc-900 font-medium' : 'text-zinc-500')}>{f.number(sp.emissions)}</div>
                    {sp.scope3Cat !== 1 && (
                      <div className="text-[11px] text-zinc-400">{sp.scope3Cat === 4 ? s.table.cat4 : s.table.inTier1}</div>
                    )}
                  </td>
                  <td className={tableClass.td}>
                    <StatusBadge status={sp.status} />
                  </td>
                  <td className={tableClass.td}>
                    {sp.pcf ? (
                      <span className="inline-flex items-center gap-1 text-[13px] text-emerald-700 whitespace-nowrap">
                        <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                        {s.table.yes}
                      </span>
                    ) : (
                      <span className="text-[13px] text-zinc-400 whitespace-nowrap">{s.table.no}</span>
                    )}
                  </td>
                  <td className={clsx(tableClass.td, 'text-right tabular')}>
                    {sp.esgScore === null ? <span className="text-zinc-400">{s.table.noScore}</span> : f.number(sp.esgScore)}
                  </td>
                  <td className={tableClass.td}>
                    <div className="flex items-center gap-2">
                      <Badge tone={RISK_TONE[sp.risk]}>{s.riskLevel[sp.risk]}</Badge>
                      {sp.reasons.length > 0 && (
                        <span
                          className="text-xs text-zinc-500 whitespace-nowrap"
                          title={sp.reasons.map(r => s.reasons[r]).join(s.invite_.listSep)}
                        >
                          {s.reasons[sp.reasons[0]]}
                          {sp.reasons.length > 1 && (
                            <span className="ml-1 text-zinc-400 tabular">{fmt(s.table.more, { count: sp.reasons.length - 1 })}</span>
                          )}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function Checkbox({ checked, mixed, label, onChange }: { checked: boolean; mixed?: boolean; label: string; onChange: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={mixed ? 'mixed' : checked}
      aria-label={label}
      onClick={onChange}
      className={clsx(
        'w-4 h-4 rounded-[5px] flex items-center justify-center ring-1 ring-inset transition-colors duration-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
        checked || mixed ? 'bg-zinc-900 ring-zinc-900 text-white' : 'bg-white ring-zinc-300 hover:ring-zinc-400',
      )}
    >
      {checked ? <Check className="w-3 h-3" strokeWidth={3} /> : mixed ? <Minus className="w-3 h-3" strokeWidth={3} /> : null}
    </button>
  )
}
