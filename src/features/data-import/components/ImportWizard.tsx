import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, type Variants } from 'motion/react'
import { ArrowLeft, ArrowRight, FileSpreadsheet, Upload } from 'lucide-react'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { toast } from '@/lib/hooks/useToast'
import { useReportingActions } from '@/store/hooks'
import { Button, Card, EmptyState, ease } from '@/components/ui'
import {
  autoMapColumns,
  detectHeader,
  inferColumnsFromContent,
  summarizeImport,
  toImportPayload,
  toImportNotes,
  validateImport,
  type ColumnMapping,
  type Grid,
  type KnownKeys,
} from '@/lib/spreadsheet'
import { dataImportStrings, type StepId } from '@/features/data-import/dataImport.strings'
import { useImportableModules, useKnownKeys, useModuleImportModel, type ImportSource } from '@/features/data-import/model'
import { Stepper } from './Stepper'
import { TemplateStep } from './TemplateStep'
import { UploadStep } from './UploadStep'
import { MapStep, mappingProblems } from './MapStep'
import { ReviewStep } from './ReviewStep'
import { DoneState, type DoneInfo } from './DoneState'

const STEPS: StepId[] = ['template', 'upload', 'map', 'review']

const slide: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: 8 * dir }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: -8 * dir }),
}

/** Header-based mapping first, then fill gaps from cell contents. */
function mapColumns(rows: Grid, headerRow: number, known: KnownKeys): ColumnMapping {
  if (headerRow < 0) return inferColumnsFromContent(rows, known)
  return inferColumnsFromContent(rows.slice(headerRow + 1), known, autoMapColumns(rows[headerRow] ?? []))
}

export function ImportWizard() {
  const s = useStrings(dataImportStrings)
  const f = useFormat()
  const [params, setParams] = useSearchParams()
  const modules = useImportableModules()
  const known = useKnownKeys()
  const { importAnswers } = useReportingActions()

  const [moduleId, setModuleId] = useState(() => modules.find(m => m.id === params.get('module'))?.id ?? modules[0]?.id ?? '')
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [source, setSource] = useState<ImportSource | null>(null)
  const [headerRow, setHeaderRow] = useState(-1)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [done, setDone] = useState<DoneInfo | null>(null)
  const model = useModuleImportModel(moduleId)

  const sheet = source?.sheets[source.sheetIndex]
  const { header, body, firstLine } = useMemo(() => {
    const rows = sheet?.rows ?? []
    return {
      header: headerRow >= 0 ? (rows[headerRow] ?? []) : [],
      body: headerRow >= 0 ? rows.slice(headerRow + 1) : rows,
      firstLine: (sheet?.firstRow ?? 1) + headerRow + 1,
    }
  }, [sheet, headerRow])

  const validated = useMemo(
    () => (step === STEPS.length - 1 && source ? validateImport({ body, mapping, sections: model.sections, firstLine }) : []),
    [step, source, body, mapping, model.sections, firstLine],
  )
  const summary = useMemo(() => summarizeImport(validated), [validated])

  const go = (next: number) => {
    setDir(next >= step ? 1 : -1)
    setStep(next)
  }

  const chooseModule = (id: string) => {
    setModuleId(id)
    setParams(
      p => {
        const n = new URLSearchParams(p)
        n.set('module', id)
        return n
      },
      { replace: true },
    )
  }

  const onSource = (src: ImportSource | null) => {
    setSource(src)
    const rows = src?.sheets[src.sheetIndex]?.rows ?? []
    const hr = detectHeader(rows).headerRow
    setHeaderRow(hr)
    setMapping(mapColumns(rows, hr, known))
  }

  const onHeaderToggle = (on: boolean) => {
    const rows = sheet?.rows ?? []
    const hr = on
      ? Math.max(
          0,
          detectHeader(rows).headerRow,
          rows.findIndex(r => r.length > 0),
        )
      : -1
    setHeaderRow(hr)
    setMapping(mapColumns(rows, hr, known))
  }

  const runImport = () => {
    if (!source) return
    const payload = toImportPayload(validated)
    const locked = new Set(model.sections.filter(x => x.locked).map(x => x.id))
    const count = importAnswers(moduleId, payload, source.name, toImportNotes(validated))
    const sections = Object.keys(payload)
    setDir(1)
    setDone({ count, sections: sections.length, reopened: sections.filter(id => locked.has(id)).length })
    toast(fmt(s.doneToast, { count: f.number(count) }))
  }

  const reset = () => {
    setDir(-1)
    setDone(null)
    onSource(null)
    setStep(1)
  }

  if (!modules.length) {
    return (
      <Card>
        <EmptyState icon={FileSpreadsheet} title={s.noModules} description={s.noModulesBody} />
      </Card>
    )
  }

  const problems = mappingProblems(mapping)
  const canContinue = [!!moduleId, !!sheet && sheet.rows.some(r => r.length > 0), !problems.key && !problems.value][step] ?? false
  const isReview = step === STEPS.length - 1

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-line bg-zinc-50/60">
        <Stepper steps={STEPS} current={step} done={!!done} onSelect={i => i < step && go(i)} />
      </div>

      <div className="p-5 sm:p-6">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={done ? 'done' : step}
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: ease.out }}
          >
            {done ? (
              <DoneState moduleId={moduleId} info={done} onAgain={reset} />
            ) : step === 0 ? (
              <TemplateStep moduleId={moduleId} onModuleChange={chooseModule} />
            ) : step === 1 ? (
              <UploadStep source={source} onSource={onSource} />
            ) : step === 2 ? (
              <MapStep
                header={header}
                body={body}
                hasHeader={headerRow >= 0}
                mapping={mapping}
                onMapping={setMapping}
                onHeaderToggle={onHeaderToggle}
              />
            ) : (
              <ReviewStep moduleId={moduleId} rows={validated} summary={summary} model={model} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {!done && (
        <div className="px-5 sm:px-6 py-4 border-t border-line flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button variant="ghost" icon={ArrowLeft} onClick={() => go(step - 1)}>
              {s.back}
            </Button>
          ) : (
            <span />
          )}
          {isReview ? (
            <Button variant="primary" icon={Upload} onClick={runImport} disabled={summary.importable === 0}>
              {fmt(s.importN, { n: f.number(summary.importable) })}
            </Button>
          ) : (
            <Button variant="primary" iconRight={ArrowRight} onClick={() => go(step + 1)} disabled={!canContinue}>
              {s.continue}
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}
