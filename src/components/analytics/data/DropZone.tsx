import { useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Illustration } from '../../ui'
import { dur, ease } from '../../../motion/tokens'

/**
 * DropZone — drag-and-drop file target that is also a real button (Enter /
 * Space open the picker). States: idle, drag-over (emerald), busy (parsing).
 */
export interface DropZoneProps {
  accept: string
  onFile: (file: File) => void
  busy?: boolean
  title: ReactNode
  /** Line under the title while dragging. */
  dragTitle?: ReactNode
  busyTitle?: ReactNode
  hint?: ReactNode
  formats?: string[]
  compact?: boolean
  disabled?: boolean
  className?: string
}

export default function DropZone({
  accept,
  onFile,
  busy = false,
  title,
  dragTitle,
  busyTitle,
  hint,
  formats,
  compact = false,
  disabled = false,
  className = '',
}: DropZoneProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const depth = useRef(0)

  const open = () => {
    if (!busy && !disabled) input.current?.click()
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || busy}
      aria-busy={busy}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open()
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault()
        depth.current += 1
        setOver(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1)
        if (depth.current === 0) setOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        depth.current = 0
        setOver(false)
        const f = e.dataTransfer.files[0]
        if (f && !busy && !disabled) onFile(f)
      }}
      data-over={over || undefined}
      className={`group relative flex flex-col items-center justify-center text-center rounded-[var(--radius-xl)] border-[1.5px] border-dashed cursor-pointer select-none
        transition-[border-color,background-color,box-shadow] duration-fast ease-out outline-none
        focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-app)]
        ${compact ? 'px-5 py-7' : 'px-6 py-10 sm:py-12'}
        ${over ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)] shadow-[var(--shadow-raised)]' : 'border-[var(--border-strong)] bg-[var(--bg-secondary)] hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <input
        ref={input}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-label={t('ingestion.shared.chooseFile')}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
      <motion.div
        animate={reduce ? undefined : { y: over ? -4 : 0, scale: over ? 1.04 : 1 }}
        transition={{ duration: dur.fast, ease: ease.out }}
        className="text-[var(--ill-stroke)] mb-3"
      >
        {busy ? (
          <div className="h-[77px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[var(--color-brand)] animate-spin" aria-hidden />
          </div>
        ) : (
          <Illustration name="upload" size={compact ? 80 : 96} />
        )}
      </motion.div>
      <div className="type-h3 text-[var(--text-primary)]" aria-live="polite">
        {busy ? busyTitle ?? title : over ? dragTitle ?? title : title}
      </div>
      <p className="text-small text-[var(--text-secondary)] mt-1">
        {t('ingestion.shared.or')}{' '}
        <span className="font-semibold text-[var(--color-brand)] underline underline-offset-2 decoration-[var(--status-success-line)] group-hover:decoration-[var(--color-brand)]">
          {t('ingestion.shared.browse')}
        </span>
      </p>
      {formats && formats.length > 0 && (
        <div className="mt-4 flex items-center gap-1.5 flex-wrap justify-center">
          {formats.map((f) => (
            <span key={f} className="nx-pill font-mono" data-tone="neutral" data-size="sm">
              {f}
            </span>
          ))}
        </div>
      )}
      {hint && <p className="text-caption text-[var(--text-tertiary)] mt-3 max-w-md text-pretty">{hint}</p>}
    </div>
  )
}
