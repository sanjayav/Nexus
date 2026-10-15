interface Column<T> {
  key: string
  label: string
  width?: string
  render?: (row: T) => React.ReactNode
  align?: 'left' | 'center' | 'right'
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: string
  onRowClick?: (row: T) => void
  className?: string
  emptyMessage?: string
}

export default function Table<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  onRowClick,
  className = '',
  emptyMessage = 'No data',
}: TableProps<T>) {
  const alignClass = (align?: string) =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border-default)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`
                  px-4 py-3 text-[var(--text-xs)] font-medium text-[var(--text-tertiary)]
                  uppercase tracking-wider ${alignClass(col.align)}
                `}
                style={{ width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-[var(--text-tertiary)] text-[var(--text-sm)]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row[keyField]}
                onClick={() => onRowClick?.(row)}
                className={`
                  border-b border-[var(--border-subtle)]
                  ${onRowClick ? 'cursor-pointer hover:bg-[var(--bg-secondary)]' : ''}
                  transition-colors duration-[var(--transition-fast)]
                `}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-[var(--text-sm)] text-[var(--text-primary)] ${alignClass(col.align)}`}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
