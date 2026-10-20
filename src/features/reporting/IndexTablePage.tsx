import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ChevronDown, Download, FileText, Printer } from 'lucide-react'
import clsx from 'clsx'
import { fmt, resolveStrings, useStrings, type Locale } from '@/lib/i18n'
import { moduleCatalogStrings, moduleIdOf, useFrameworkLabels } from '@/lib/i18n/shared/frameworkCatalog'
import { toTraditionalHK } from '@/lib/chinese'
import { toast } from '@/lib/hooks/useToast'
import { useDismiss } from '@/lib/hooks/useDismiss'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { sectionTitlesZh, useQuestionnaireText } from '@/features/frameworks/content/questionnaireContent'
import { useReportingActions, useSectionViews, useWorkspaceSlice, type SectionView } from '@/store/hooks'
import {
  AnimatedNumber,
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  PageHeader,
  Tabs,
  dotTone,
  ease,
  tableClass,
  textareaClass,
  type Tone,
} from '@/components/ui'
import { indexTableStrings } from './indexTable.strings'

export type DisclosureState = 'disclosed' | 'pendingReview' | 'partial' | 'missing' | 'explained'

const STATE_TONE: Record<DisclosureState, Tone> = {
  disclosed: 'success',
  pendingReview: 'info',
  partial: 'warning',
  missing: 'danger',
  explained: 'neutral',
}
const STATES: DisclosureState[] = ['disclosed', 'pendingReview', 'partial', 'missing', 'explained']

/** How a section's workflow state reads in an index table. An explanation overrides everything. */
export function disclosureState(view: Pick<SectionView, 'status' | 'answered' | 'required'>, explained: boolean): DisclosureState {
  if (explained) return 'explained'
  if (view.status === 'approved') return 'disclosed'
  if (view.required > 0 && view.answered >= view.required) return 'pendingReview'
  if (view.answered > 0) return 'partial'
  return 'missing'
}

type ExportLang = 'hans' | 'hant' | 'en'

export default function IndexTablePage() {
  const s = useStrings(indexTableStrings)
  const fw = useFrameworkLabels()
  const qt = useQuestionnaireText()
  const navigate = useNavigate()
  const { workspace, region } = useWorkspace()
  const views = useSectionViews()
  const { explanations = {} } = useWorkspaceSlice()
  const { setExplanation, logExport } = useReportingActions()
  const [framework, setFramework] = useState<string>('all')
  const [editing, setEditing] = useState<SectionView | null>(null)

  const frameworks = useMemo(() => region.frameworks.filter(id => views.some(v => v.section.module === id)), [region.frameworks, views])

  // Position within its framework = the report section it lands in.
  const rows = useMemo(() => {
    const counters: Record<string, number> = {}
    return views
      .filter(v => frameworks.includes(v.section.module))
      .map(v => {
        counters[v.section.module] = (counters[v.section.module] ?? 0) + 1
        return { view: v, n: counters[v.section.module], state: disclosureState(v, !!explanations[v.section.id]) }
      })
  }, [views, frameworks, explanations])
  const visible = framework === 'all' ? rows : rows.filter(r => r.view.section.module === framework)
  const counts = STATES.reduce(
    (acc, st) => ({ ...acc, [st]: visible.filter(r => r.state === st).length }),
    {} as Record<DisclosureState, number>,
  )

  const exportXlsx = async (lang: ExportLang) => {
    const docLocale: Locale = lang === 'en' ? 'en' : 'zh'
    const d = resolveStrings(indexTableStrings, docLocale)
    const cat = resolveStrings(moduleCatalogStrings, docLocale)
    if (lang === 'hant') toast(s.preparing, 'info')
    const [XLSX, convert] = await Promise.all([import('xlsx'), lang === 'hant' ? toTraditionalHK() : Promise.resolve((t: string) => t)])
    const title = (v: SectionView) => (docLocale === 'zh' && sectionTitlesZh[v.section.id]) || v.section.title
    const header = [d.cols.no, d.cols.framework, d.cols.requirement, d.cols.location, d.cols.status, d.cols.explanation]
    const body = visible.map((r, i) => [
      String(i + 1),
      cat.short[moduleIdOf(r.view.section.module)] ?? r.view.section.module,
      title(r.view),
      fmt(d.location, { n: r.n }),
      d.stats[r.state],
      explanations[r.view.section.id] ?? '',
    ])
    const aoa = [header, ...body].map(row => row.map(convert))
    const sheet = XLSX.utils.aoa_to_sheet(aoa)
    sheet['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 48 }, { wch: 14 }, { wch: 16 }, { wch: 48 }]
    sheet['!freeze'] = { xSplit: 0, ySplit: 1 }
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, convert(d.sheetName).slice(0, 31))
    const org = lang === 'en' ? workspace.name.en : convert(workspace.name.zh)
    const file = `${org}_${workspace.reportingYear}_${convert(d.title)}.xlsx`.replace(/\s+/g, '_')
    XLSX.writeFile(book, file)
    logExport(file)
    toast(fmt(s.exported, { file }))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.title}
        description={s.description}
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/publish')}>
              {s.back}
            </Button>
            <Button icon={Printer} onClick={() => window.print()}>
              {s.print}
            </Button>
            <ExportMenu label={s.export} options={s.exportAs} onPick={exportXlsx} />
          </div>
        }
      />

      <Tabs
        className="print:hidden"
        value={framework}
        onChange={setFramework}
        items={[
          { value: 'all', label: s.all, count: rows.length },
          ...frameworks.map(id => ({ value: id, label: fw.short(id), count: rows.filter(r => r.view.section.module === id).length })),
        ]}
      />

      {/* Hairlines come from the 1px gap over the line colour, correct at every column count. */}
      <Card padded={false} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-line overflow-hidden">
        {STATES.map(st => (
          <div key={st} className="bg-surface px-4 sm:px-5 py-4 last:col-span-2 sm:last:col-span-1">
            <div className="flex items-center gap-1.5 text-[12.5px] text-zinc-500">
              <span className={clsx('w-1.5 h-1.5 rounded-full', dotTone[STATE_TONE[st]])} />
              {s.stats[st]}
            </div>
            <AnimatedNumber value={counts[st]} className="mt-1.5 block display text-2xl font-semibold text-zinc-900" />
          </div>
        ))}
      </Card>

      <Card>
        {visible.length === 0 ? (
          <EmptyState icon={FileText} title={s.empty} />
        ) : (
          <div className={tableClass.wrap}>
            <table className={tableClass.table}>
              <thead>
                <tr>
                  <th className={clsx(tableClass.th, 'w-12')}>{s.cols.no}</th>
                  <th className={tableClass.th}>{s.cols.framework}</th>
                  <th className={tableClass.th}>{s.cols.requirement}</th>
                  <th className={tableClass.th}>{s.cols.location}</th>
                  <th className={tableClass.th}>{s.cols.status}</th>
                  <th className={tableClass.th}>{s.cols.explanation}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => {
                  const note = explanations[r.view.section.id]
                  return (
                    <tr key={r.view.section.id} className={tableClass.tr}>
                      <td className={clsx(tableClass.td, 'tabular text-zinc-500')}>{i + 1}</td>
                      <td className={clsx(tableClass.td, 'whitespace-nowrap')}>
                        <Badge>{fw.short(r.view.section.module)}</Badge>
                      </td>
                      <td className={clsx(tableClass.td, 'min-w-[240px] text-zinc-900')}>{qt.sectionTitle(r.view.section)}</td>
                      <td className={clsx(tableClass.td, 'whitespace-nowrap tabular')}>
                        <button
                          type="button"
                          onClick={() => navigate(`/modules/${r.view.section.module}/questionnaire`)}
                          className="text-zinc-700 hover:text-zinc-900 hover:underline underline-offset-2"
                        >
                          {fmt(s.location, { n: r.n })}
                        </button>
                      </td>
                      <td className={clsx(tableClass.td, 'whitespace-nowrap')}>
                        <Badge tone={STATE_TONE[r.state]} dot>
                          {s.stats[r.state]}
                        </Badge>
                      </td>
                      <td className={clsx(tableClass.td, 'min-w-[220px]')}>
                        {note ? (
                          <button
                            type="button"
                            onClick={() => setEditing(r.view)}
                            className="text-left text-[13px] text-zinc-700 hover:text-zinc-900"
                            title={s.editExplain}
                          >
                            {note}
                          </button>
                        ) : r.state !== 'disclosed' ? (
                          <Button size="sm" variant="ghost" className="-ml-2 print:hidden" onClick={() => setEditing(r.view)}>
                            {s.explain}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ExplainDialog
        view={editing}
        initial={editing ? (explanations[editing.section.id] ?? '') : ''}
        onClose={() => setEditing(null)}
        onSave={text => {
          if (editing) setExplanation(editing.section.id, text)
          setEditing(null)
        }}
      />
    </div>
  )
}

function ExportMenu({ label, options, onPick }: { label: string; options: Record<ExportLang, string>; onPick: (l: ExportLang) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, open, () => setOpen(false))
  return (
    <div ref={ref} className="relative">
      <Button
        variant="primary"
        icon={Download}
        iconRight={ChevronDown}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label}
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: ease.out }}
            className="absolute right-0 top-full mt-1.5 w-60 p-1 bg-white border border-line rounded-xl shadow-pop z-40 origin-top-right"
          >
            {(Object.keys(options) as ExportLang[]).map(k => (
              <button
                key={k}
                type="button"
                role="menuitem"
                onClick={() => (setOpen(false), onPick(k))}
                className="w-full text-left px-3 h-9 rounded-lg text-[13px] text-zinc-700 hover:bg-zinc-50"
              >
                {options[k]}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ExplainDialog({
  view,
  initial,
  onClose,
  onSave,
}: {
  view: SectionView | null
  initial: string
  onClose: () => void
  onSave: (text: string) => void
}) {
  const s = useStrings(indexTableStrings)
  const qt = useQuestionnaireText()
  const [text, setText] = useState(initial)
  const [prevView, setPrevView] = useState<SectionView | null>(null)
  // Reset the draft whenever a different row opens the dialog.
  if (view !== prevView) {
    setPrevView(view)
    setText(initial)
  }
  return (
    <Dialog
      open={!!view}
      onClose={onClose}
      title={s.explainTitle}
      description={view ? `${qt.sectionTitle(view.section)} · ${s.explainBody}` : s.explainBody}
      footer={
        <>
          {initial && (
            <Button variant="ghost" className="mr-auto text-rose-600" onClick={() => onSave('')}>
              {s.remove}
            </Button>
          )}
          <Button onClick={onClose}>{s.cancel}</Button>
          <Button variant="primary" disabled={!text.trim()} onClick={() => onSave(text)}>
            {s.save}
          </Button>
        </>
      }
    >
      <textarea
        data-autofocus
        value={text}
        onChange={e => setText(e.target.value)}
        rows={4}
        className={textareaClass}
        placeholder={s.explainPlaceholder}
        aria-label={s.explainTitle}
      />
    </Dialog>
  )
}
