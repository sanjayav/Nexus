/** Table class recipe, shared so every list reads the same. */
export const tableClass = {
  wrap: 'overflow-x-auto -mx-5 sm:-mx-6 [&_tbody_tr:last-child>td]:border-b-0',
  table: 'w-full text-sm',
  th: 'text-left text-xs font-medium text-zinc-500 px-5 sm:px-6 py-2.5 border-b border-line bg-zinc-50/80 whitespace-nowrap',
  td: 'px-5 sm:px-6 py-3.5 border-b border-line text-zinc-700 align-middle',
  tr: 'hover:bg-zinc-900/[0.025] transition-colors duration-100',
}

/** Recharts theme. */
export const chartTheme = {
  grid: '#ECEBE6',
  axis: '#71717A',
  tooltip: {
    contentStyle: {
      background: '#fff',
      border: '1px solid #E7E6E1',
      borderRadius: 10,
      boxShadow: '0 2px 4px rgba(20,20,16,0.05), 0 12px 24px -12px rgba(20,20,16,0.18)',
      fontSize: 12,
      padding: '8px 10px',
    },
    labelStyle: { color: '#18181B', fontWeight: 600, marginBottom: 2 },
  },
  // Ordered categorical palette; first is primary series.
  series: ['#18181B', '#10B981', '#0EA5E9', '#F59E0B', '#8B5CF6', '#F43F5E'],
}
