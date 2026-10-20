import { useState } from 'react'
import { Check, Download, Info } from 'lucide-react'
import clsx from 'clsx'
import { fmt, useStrings } from '@/lib/i18n'
import { useFrameworkLabels } from '@/lib/i18n/shared/frameworkCatalog'
import { toast } from '@/lib/hooks/useToast'
import { useL10n, useWorkspace } from '@/features/workspace/WorkspaceContext'
import { Button } from '@/components/ui'
import { buildTemplateRows, buildWorkbook, TEMPLATE_WIDTHS } from '@/lib/spreadsheet'
import { dataImportStrings } from '@/features/data-import/dataImport.strings'
import { fileSafe, saveFile } from '@/lib/download'
import { useImportableModules, useModuleImportModel } from '@/features/data-import/model'

export function TemplateStep({ moduleId, onModuleChange }: { moduleId: string; onModuleChange: (id: string) => void }) {
  const s = useStrings(dataImportStrings)
  const fw = useFrameworkLabels()
  const l10n = useL10n()
  const { workspace } = useWorkspace()
  const modules = useImportableModules()
  const { template } = useModuleImportModel(moduleId)
  const [busy, setBusy] = useState(false)

  const download = async () => {
    setBusy(true)
    try {
      const XLSX = await import('xlsx')
      const rows = buildTemplateRows(template, s.template)
      const bytes = buildWorkbook(XLSX, [
        { name: s.templateSheet, rows, widths: TEMPLATE_WIDTHS, filter: true },
        { name: s.instructionsSheet, rows: s.instructions.map(line => [line]), widths: [100] },
      ])
      saveFile(bytes, [fileSafe(l10n(workspace.name)), moduleId, s.fileSlug, workspace.reportingYear].join('_') + '.xlsx')
      toast(s.templateDownloaded)
    } catch {
      toast(s.templateFailed, 'warning')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[15px] font-semibold text-zinc-900">{s.chooseFramework}</h2>
        <p className="text-[13px] text-zinc-500 mt-0.5">{s.chooseFrameworkBody}</p>
      </div>

      <div role="radiogroup" aria-label={s.chooseFramework} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {modules.map(m => {
          const selected = m.id === moduleId
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onModuleChange(m.id)}
              className={clsx(
                'text-left rounded-xl border px-4 py-3 flex items-start gap-3 transition-[border-color,box-shadow,background-color] duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
                selected ? 'border-zinc-900 bg-white shadow-card ring-1 ring-zinc-900' : 'border-line bg-white hover:border-zinc-300',
              )}
            >
              <span
                className={clsx(
                  'mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors',
                  selected ? 'bg-zinc-900 border-zinc-900 text-white' : 'border-zinc-300',
                )}
              >
                {selected && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-zinc-900 leading-snug">{fw.title(m.id, m.title)}</span>
                <span className="block text-xs text-zinc-500 mt-0.5 tabular">
                  {fmt(s.sectionsFields, { sections: m.sections, fields: m.fields })}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="rounded-xl bg-zinc-900/[0.03] ring-1 ring-inset ring-zinc-900/[0.06] p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="flex items-start gap-2.5 text-[13px] text-zinc-600 min-w-0">
          <Info className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
          <div>
            <p>{s.templateHint}</p>
            <p className="text-zinc-500 mt-0.5">{s.alreadyHaveFile}</p>
          </div>
        </div>
        <Button icon={Download} onClick={download} loading={busy} disabled={!template.length} className="self-start sm:self-auto">
          {busy ? s.downloading : s.downloadTemplate}
        </Button>
      </div>
    </div>
  )
}
