import { FileSpreadsheet, History } from 'lucide-react'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { useFrameworkLabels } from '@/lib/i18n/shared/frameworkCatalog'
import { useWorkflowText } from '@/lib/i18n/shared/workflow'
import { useWorkspaceSlice } from '@/store/hooks'
import { Badge, Card, CardHeader, EmptyState, Stagger, StaggerItem } from '@/components/ui'
import { dataImportStrings } from '@/features/data-import/dataImport.strings'

const LIMIT = 8

export function ImportHistory() {
  const s = useStrings(dataImportStrings)
  const f = useFormat()
  const fw = useFrameworkLabels()
  const wt = useWorkflowText()
  const { activity } = useWorkspaceSlice()
  const imports = activity.filter(a => a.kind === 'import').slice(0, LIMIT)

  return (
    <Card>
      <CardHeader icon={History} title={s.historyTitle} description={s.historyBody} className="mb-3" />
      {imports.length ? (
        <Stagger as="ul" className="-mx-2">
          {imports.map(a => (
            <StaggerItem as="li" key={a.id} className="flex items-start gap-3 rounded-lg px-2 py-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 ring-1 ring-inset ring-emerald-600/15 text-emerald-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4" strokeWidth={1.9} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-zinc-900 truncate" title={a.note}>
                  {a.note}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-zinc-500">
                  <span>{a.actor}</span>
                  <span className="text-zinc-300">·</span>
                  <span className="tabular">{fmt(s.historyCount, { count: f.number(a.count ?? 0) })}</span>
                  <span className="text-zinc-300">·</span>
                  <time dateTime={a.at} title={f.date(a.at, { dateStyle: 'medium', timeStyle: 'short' })}>
                    {wt.ago(a.at)}
                  </time>
                </div>
              </div>
              {a.moduleId && <Badge className="shrink-0">{fw.short(a.moduleId)}</Badge>}
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <EmptyState icon={History} title={s.historyEmpty} description={s.historyEmptyBody} />
      )}
    </Card>
  )
}
