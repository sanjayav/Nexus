import { useCallback, useMemo, useState } from 'react'
import { ArrowRight, Inbox } from 'lucide-react'
import clsx from 'clsx'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { useFrameworkLabels } from '@/lib/i18n/shared/frameworkCatalog'
import { useQuestionnaireText } from '@/features/frameworks/content/questionnaireContent'
import { AnimatedNumber, Badge, Card, EmptyState, Tabs, tableClass, type Tone } from '@/components/ui'
import type { ImportSummary, RowStatus, ValidatedRow } from '@/lib/spreadsheet'
import { dataImportStrings } from '@/features/data-import/dataImport.strings'
import type { useModuleImportModel } from '@/features/data-import/model'
import { Alert } from './UploadStep'

type Filter = 'all' | 'changed' | 'warnings' | 'errors'
const MAX_ROWS = 500

const STATUS_TONE: Record<RowStatus, Tone> = { new: 'success', changed: 'info', unchanged: 'neutral', warning: 'warning', error: 'danger' }
const STAT_TONE: Record<keyof Omit<ImportSummary, 'importable'>, string> = {
  new: 'text-emerald-700',
  changed: 'text-sky-700',
  unchanged: 'text-zinc-900',
  warning: 'text-amber-700',
  error: 'text-rose-700',
}

const MATCH: Record<Filter, (r: ValidatedRow) => boolean> = {
  all: () => true,
  changed: r => r.change !== null,
  warnings: r => r.status === 'warning',
  errors: r => r.status === 'error',
}

export function ReviewStep({
  moduleId,
  rows,
  summary,
  model,
}: {
  moduleId: string
  rows: ValidatedRow[]
  summary: ImportSummary
  model: ReturnType<typeof useModuleImportModel>
}) {
  const s = useStrings(dataImportStrings)
  const f = useFormat()
  const fw = useFrameworkLabels()
  const qt = useQuestionnaireText()
  const [filter, setFilter] = useState<Filter>('all')
  const format = useCallback((n: number) => f.number(Math.round(n)), [f])

  const counts = useMemo(() => {
    const c = {} as Record<Filter, number>
    for (const k of Object.keys(MATCH) as Filter[]) c[k] = rows.filter(MATCH[k]).length
    return c
  }, [rows])
  const visible = useMemo(() => rows.filter(MATCH[filter]), [rows, filter])

  const label = (r: ValidatedRow) => {
    const view = r.sectionId ? model.viewById.get(r.sectionId) : undefined
    const field = view?.section.fields.find(x => x.id === r.fieldId)
    return { section: view ? qt.shortTitle(view.section) : '—', field: view && field ? qt.fieldLabel(view.section, field) : r.ref || '—' }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[15px] font-semibold text-zinc-900">{s.reviewTitle}</h2>
        <p className="text-[13px] text-zinc-500 mt-0.5">
          {fmt(s.reviewBody, { rows: f.number(rows.length), framework: fw.short(moduleId) })}
        </p>
      </div>

      <Card padded={false} className="grid grid-cols-2 sm:grid-cols-5 overflow-hidden shadow-none">
        {(Object.keys(STAT_TONE) as (keyof typeof STAT_TONE)[]).map((k, i) => (
          <div
            key={k}
            className={clsx(
              'px-4 py-3.5 min-w-0 border-line',
              i > 0 && 'sm:border-l',
              i % 2 === 1 && 'border-l',
              i >= 2 && 'border-t sm:border-t-0',
              i === 4 && 'col-span-2 sm:col-span-1',
            )}
          >
            <div className="text-xs font-medium text-zinc-500 truncate">{s.stats[k]}</div>
            <AnimatedNumber
              value={summary[k]}
              format={format}
              className={clsx('display block mt-1.5 text-[24px] font-semibold leading-none', summary[k] ? STAT_TONE[k] : 'text-zinc-300')}
            />
          </div>
        ))}
      </Card>

      {summary.importable === 0 && (
        <Alert tone="warning">
          <div className="font-medium">{s.nothingToImport}</div>
          <p className="mt-0.5">{s.nothingToImportBody}</p>
        </Alert>
      )}

      <Tabs<Filter>
        value={filter}
        onChange={setFilter}
        items={(Object.keys(MATCH) as Filter[]).map(k => ({ value: k, label: s.filters[k], count: counts[k] }))}
      />

      <Card className="shadow-none">
        {visible.length ? (
          <div className={clsx(tableClass.wrap, '-my-5 sm:-my-6')}>
            <table className={tableClass.table}>
              <thead>
                <tr>
                  <th className={clsx(tableClass.th, 'w-14')}>{s.th.line}</th>
                  <th className={tableClass.th}>{s.th.field}</th>
                  <th className={tableClass.th}>{s.th.status}</th>
                  <th className={tableClass.th}>{s.th.change}</th>
                </tr>
              </thead>
              <tbody>
                {visible.slice(0, MAX_ROWS).map(r => {
                  const l = label(r)
                  return (
                    <tr key={r.line} className={tableClass.tr}>
                      <td className={clsx(tableClass.td, 'text-xs text-zinc-400 tabular')}>{r.line}</td>
                      <td className={clsx(tableClass.td, 'min-w-[200px] max-w-[280px]')}>
                        <div className="truncate text-[13px] font-medium text-zinc-900" title={l.field}>
                          {l.field}
                        </div>
                        <div className="truncate text-[11px] text-zinc-400" title={l.section}>
                          {l.section}
                          {r.fieldId && <span className="font-mono"> · {r.fieldId}</span>}
                        </div>
                      </td>
                      <td className={clsx(tableClass.td, 'min-w-[180px] max-w-[260px]')}>
                        <Badge tone={STATUS_TONE[r.status]} dot>
                          {s.status[r.status]}
                        </Badge>
                        {r.reasons.length > 0 && (
                          <div className="text-[11px] text-zinc-500 mt-1 leading-snug whitespace-normal">
                            {r.reasons.map(x => s.reasons[x]).join(' ')}
                          </div>
                        )}
                      </td>
                      <td className={clsx(tableClass.td, 'min-w-[260px] max-w-[420px]')}>
                        <div className="flex items-center gap-2 min-w-0 text-[13px]">
                          <Value text={r.oldValue} empty={s.empty} className="text-zinc-500" />
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                          <Value text={r.newValue} empty={s.empty} className={r.change ? 'text-zinc-900 font-medium' : 'text-zinc-500'} />
                        </div>
                        {r.note && (
                          <div className="truncate text-[11px] text-zinc-400 mt-0.5" title={r.note}>
                            {r.note}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Inbox} title={s.noRows} />
        )}
      </Card>
      {visible.length > MAX_ROWS && <p className="text-xs text-zinc-500">{fmt(s.showingFirst, { n: MAX_ROWS })}</p>}
    </div>
  )
}

function Value({ text, empty, className }: { text: string; empty: string; className?: string }) {
  if (!text) return <span className="text-zinc-400 shrink-0">{empty}</span>
  return (
    <span className={clsx('truncate min-w-0 flex-1 basis-0', className)} title={text}>
      {text}
    </span>
  )
}
