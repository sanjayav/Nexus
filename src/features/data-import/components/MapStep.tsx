import { useId } from 'react'
import { CheckCircle2, Columns } from 'lucide-react'
import clsx from 'clsx'
import { fmt, useStrings } from '@/lib/i18n'
import { Stagger, StaggerItem } from '@/components/ui'
import { COLUMN_KEYS, columnLetter, filledRows, type ColumnKey, type ColumnMapping, type Grid } from '@/lib/spreadsheet'
import { dataImportStrings } from '@/features/data-import/dataImport.strings'
import { Alert } from './UploadStep'
import { Select } from './Select'

const SKIP = 'skip'

/** Move `key` to column `col` (or unmap it), keeping one column per key. */
export function remap(mapping: ColumnMapping, col: number, key: ColumnKey | typeof SKIP): ColumnMapping {
  const next: ColumnMapping = {}
  for (const k of COLUMN_KEYS) if (mapping[k] !== undefined && mapping[k] !== col && k !== key) next[k] = mapping[k]
  if (key !== SKIP) next[key] = col
  return next
}

export const mappingProblems = (m: ColumnMapping) => ({
  key: m.fieldId === undefined && m.field === undefined,
  value: m.value === undefined,
})

export function MapStep({
  header,
  body,
  hasHeader,
  mapping,
  onMapping,
  onHeaderToggle,
}: {
  header: string[]
  body: Grid
  hasHeader: boolean
  mapping: ColumnMapping
  onMapping: (m: ColumnMapping) => void
  onHeaderToggle: (on: boolean) => void
}) {
  const s = useStrings(dataImportStrings)
  const toggleId = useId()
  const filled = filledRows(body)
  const width = Math.max(header.length, ...filled.map(r => r.length), 0)
  const keyOf = (col: number) => COLUMN_KEYS.find(k => mapping[k] === col)
  const mapped = COLUMN_KEYS.filter(k => mapping[k] !== undefined).length
  const problems = mappingProblems(mapping)

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-zinc-900">{s.mapTitle}</h2>
          <p className="text-[13px] text-zinc-500 mt-0.5">{s.mapBody}</p>
        </div>
        <label htmlFor={toggleId} className="inline-flex items-center gap-2 text-[13px] text-zinc-700 cursor-pointer select-none shrink-0">
          <input
            id={toggleId}
            type="checkbox"
            checked={hasHeader}
            onChange={e => onHeaderToggle(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-300 accent-zinc-900"
          />
          {s.hasHeader}
        </label>
      </div>

      {mapped ? (
        <div className="flex items-center gap-2 text-[13px] text-emerald-700">
          <CheckCircle2 className="w-4 h-4" />
          {fmt(s.autoMatched, { n: mapped })}
        </div>
      ) : (
        <Alert tone="warning">
          <div className="font-medium">{s.noneMatched}</div>
          <p className="mt-0.5">{s.noneMatchedBody}</p>
        </Alert>
      )}

      <Stagger className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5" gap={0.03}>
        {Array.from({ length: width }, (_, col) => {
          const key = keyOf(col)
          const samples = filled
            .map(r => r[col] ?? '')
            .filter(Boolean)
            .slice(0, 2)
          const title = hasHeader ? header[col] : ''
          return (
            <StaggerItem
              key={col}
              className={clsx(
                'rounded-xl border bg-white p-3.5 flex flex-col gap-3 min-w-0 transition-[border-color,box-shadow,opacity] duration-150',
                key ? 'border-emerald-300 shadow-card ring-1 ring-emerald-500/15' : 'border-line',
              )}
            >
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-zinc-400 tabular">{fmt(s.column, { letter: columnLetter(col) })}</div>
                  <div
                    className={clsx('text-sm font-medium truncate', title ? 'text-zinc-900' : 'text-zinc-400')}
                    title={title || undefined}
                  >
                    {title || '—'}
                  </div>
                </div>
                <Columns className={clsx('w-4 h-4 shrink-0 mt-0.5', key ? 'text-emerald-600' : 'text-zinc-300')} />
              </div>
              <div className="min-h-[42px]">
                <div className="text-[11px] text-zinc-400 mb-1">{s.samples}</div>
                {samples.length ? (
                  samples.map((v, i) => (
                    <div key={i} className="text-xs text-zinc-600 truncate tabular" title={v}>
                      {v}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-zinc-400">{s.noSamples}</div>
                )}
              </div>
              <Select
                label={fmt(s.column, { letter: columnLetter(col) })}
                value={key ?? SKIP}
                onChange={v => onMapping(remap(mapping, col, v as ColumnKey | typeof SKIP))}
              >
                <option value={SKIP}>{s.skip}</option>
                {COLUMN_KEYS.map(k => (
                  <option key={k} value={k}>
                    {s.targets[k]}
                  </option>
                ))}
              </Select>
            </StaggerItem>
          )
        })}
      </Stagger>

      {(problems.key || problems.value) && (
        <ul className="text-[13px] text-rose-700 space-y-0.5">
          {problems.key && <li>{s.needKey}</li>}
          {problems.value && <li>{s.needValue}</li>}
        </ul>
      )}
    </div>
  )
}
