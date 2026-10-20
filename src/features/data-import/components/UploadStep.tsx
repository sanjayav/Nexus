import { DragEvent, useId, useRef, useState } from 'react'
import { AlertTriangle, ClipboardPaste, FileSpreadsheet, RefreshCw, UploadCloud } from 'lucide-react'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { Button, ease, spring, textareaClass } from '@/components/ui'
import { decodeText, filledRows, parseDelimited, parseWorkbook, type ParsedSheet } from '@/lib/spreadsheet'
import { dataImportStrings, type FileError } from '@/features/data-import/dataImport.strings'
import type { ImportSource } from '@/features/data-import/model'
import { Select } from './Select'

const MAX_BYTES = 10 * 1024 * 1024
const WORKBOOK = /\.(xlsx|xlsm|xls)$/i
const DELIMITED = /\.(csv|tsv|txt)$/i

/** The sheet most likely to hold data: the first with rows. */
const pickSheet = (sheets: ParsedSheet[]) =>
  Math.max(
    0,
    sheets.findIndex(sh => filledRows(sh.rows).length > 0),
  )

async function readFile(file: File): Promise<ParsedSheet[] | FileError> {
  if (!WORKBOOK.test(file.name) && !DELIMITED.test(file.name)) return 'unsupported'
  if (file.size > MAX_BYTES) return 'tooLarge'
  try {
    const buffer = await file.arrayBuffer()
    const sheets = DELIMITED.test(file.name)
      ? [{ name: file.name, rows: parseDelimited(decodeText(buffer)), firstRow: 1 }]
      : parseWorkbook(buffer, await import('xlsx')).sheets
    return sheets.some(sh => filledRows(sh.rows).length) ? sheets : 'empty'
  } catch {
    return 'unreadable'
  }
}

export function UploadStep({ source, onSource }: { source: ImportSource | null; onSource: (src: ImportSource | null) => void }) {
  const s = useStrings(dataImportStrings)
  const f = useFormat()
  const inputRef = useRef<HTMLInputElement>(null)
  const depth = useRef(0)
  const pasteId = useId()
  const [dragging, setDragging] = useState(false)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState<FileError | null>(null)
  const [paste, setPaste] = useState('')

  const accept = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setReading(true)
    const result = await readFile(file)
    setReading(false)
    if (typeof result === 'string') return setError(result)
    onSource({ name: file.name, sheets: result, sheetIndex: pickSheet(result), pasted: false })
  }

  const applyPaste = () => {
    const rows = parseDelimited(paste)
    if (!filledRows(rows).length) return setError('empty')
    setError(null)
    onSource({ name: s.pastedSource, sheets: [{ name: s.pastedSource, rows, firstRow: 1 }], sheetIndex: 0, pasted: true })
  }

  const drag = (e: DragEvent, delta: number) => {
    e.preventDefault()
    depth.current = Math.max(0, depth.current + delta)
    setDragging(depth.current > 0)
  }
  const drop = (e: DragEvent) => {
    e.preventDefault()
    depth.current = 0
    setDragging(false)
    void accept(e.dataTransfer.files[0])
  }

  if (source) {
    const sheet = source.sheets[source.sheetIndex]
    const rows = filledRows(sheet?.rows ?? [])
    const cols = Math.max(0, ...rows.map(r => r.length))
    return (
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: ease.out }}
          className="rounded-xl border border-line bg-white shadow-card p-4 flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 ring-1 ring-inset ring-emerald-600/15 text-emerald-700 flex items-center justify-center shrink-0">
              {source.pasted ? (
                <ClipboardPaste className="w-5 h-5" strokeWidth={1.8} />
              ) : (
                <FileSpreadsheet className="w-5 h-5" strokeWidth={1.8} />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-zinc-900 truncate" title={source.name}>
                {source.name}
              </div>
              <div className="text-xs text-zinc-500 tabular">{fmt(s.rowsCols, { rows: f.number(rows.length), cols: f.number(cols) })}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {source.sheets.length > 1 && (
              <Select
                label={s.sheet}
                value={String(source.sheetIndex)}
                onChange={v => onSource({ ...source, sheetIndex: Number(v) })}
                className="w-44"
              >
                {source.sheets.map((sh, i) => (
                  <option key={`${sh.name}-${i}`} value={i}>
                    {sh.name}
                  </option>
                ))}
              </Select>
            )}
            <Button icon={RefreshCw} onClick={() => onSource(null)}>
              {s.replaceFile}
            </Button>
          </div>
        </motion.div>
        {!rows.length && <Alert>{s.emptySheet}</Alert>}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <motion.div
        onDragEnter={e => drag(e, 1)}
        onDragOver={e => e.preventDefault()}
        onDragLeave={e => drag(e, -1)}
        onDrop={drop}
        animate={{ scale: dragging ? 1.01 : 1 }}
        transition={spring}
        className={clsx(
          'group relative rounded-2xl border-[1.5px] border-dashed px-6 py-10 flex flex-col items-center text-center transition-colors duration-200',
          dragging ? 'border-brand-500 bg-emerald-50/70' : 'border-zinc-300/80 bg-zinc-50/60 hover:border-zinc-400 hover:bg-zinc-50',
        )}
      >
        <motion.div
          animate={{ y: dragging ? -3 : 0 }}
          transition={spring}
          className={clsx(
            'w-12 h-12 rounded-full flex items-center justify-center mb-3 ring-1 ring-inset transition-colors duration-200',
            dragging
              ? 'bg-white text-brand-600 ring-brand-500/30'
              : 'bg-white text-zinc-500 ring-zinc-900/[0.08] group-hover:text-zinc-700',
          )}
        >
          <UploadCloud className="w-5 h-5" strokeWidth={1.8} />
        </motion.div>
        <div className="text-sm font-medium text-zinc-900">{reading ? s.reading : dragging ? s.dropActive : s.dropTitle}</div>
        <p className="text-xs text-zinc-500 mt-1">{s.dropBody}</p>
        <Button variant="primary" className="mt-4" loading={reading} onClick={() => inputRef.current?.click()}>
          {s.browse}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.xlsm,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          className="sr-only"
          tabIndex={-1}
          onChange={e => {
            void accept(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </motion.div>

      <AnimatePresence initial={false}>
        {error && (
          <motion.div
            key={error}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: ease.out }}
          >
            <Alert>{s.fileErrors[error]}</Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 text-xs text-zinc-400">
        <span className="h-px flex-1 bg-line" />
        {s.or}
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="space-y-2">
        <label htmlFor={pasteId} className="flex items-center gap-2 text-[13px] font-medium text-zinc-700">
          <ClipboardPaste className="w-4 h-4 text-zinc-400" />
          {s.pasteTitle}
        </label>
        <p className="text-xs text-zinc-500">{s.pasteBody}</p>
        <textarea
          id={pasteId}
          value={paste}
          onChange={e => setPaste(e.target.value)}
          rows={5}
          spellCheck={false}
          placeholder={s.pastePlaceholder}
          className={clsx(textareaClass, 'font-mono text-xs whitespace-pre overflow-x-auto')}
        />
        <div className="flex justify-end">
          <Button icon={ClipboardPaste} onClick={applyPaste} disabled={!paste.trim()}>
            {s.usePasted}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function Alert({ children, tone = 'danger' }: { children: React.ReactNode; tone?: 'danger' | 'warning' }) {
  return (
    <div
      role="alert"
      className={clsx(
        'flex items-start gap-2.5 rounded-xl px-4 py-3 text-[13px] ring-1 ring-inset',
        tone === 'danger' ? 'bg-rose-50 text-rose-900 ring-rose-200' : 'bg-amber-50 text-amber-900 ring-amber-200',
      )}
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="min-w-0 leading-relaxed">{children}</div>
    </div>
  )
}
