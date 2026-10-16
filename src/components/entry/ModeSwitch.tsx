import { useId } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { PencilLine, Calculator as CalcIcon, Plug } from 'lucide-react'
import { spring } from '../../motion/tokens'
import type { EntryMode } from './persist'

/** Segmented control for Manual / Calculator / Connector with a sliding active pill. */
export default function ModeSwitch({
  modes, value, onChange, disabled,
}: {
  modes: EntryMode[]
  value: EntryMode
  onChange: (m: EntryMode) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const id = useId()
  if (modes.length < 2) return null
  return (
    <div
      role="radiogroup"
      aria-label={t('entry.mode.aria')}
      className="inline-grid w-full sm:w-auto p-0.5 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]"
      style={{ gridTemplateColumns: `repeat(${modes.length}, minmax(0, 1fr))` }}
      onKeyDown={e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
        e.preventDefault()
        const i = modes.indexOf(value)
        const next = modes[(i + (e.key === 'ArrowRight' ? 1 : modes.length - 1)) % modes.length]
        onChange(next)
        requestAnimationFrame(() => document.getElementById(`${id}-${next}`)?.focus())
      }}
    >
      {modes.map(m => {
        const Icon = m === 'Manual' ? PencilLine : m === 'Calculator' ? CalcIcon : Plug
        const active = value === m
        return (
          <button
            key={m}
            id={`${id}-${m}`}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(m)}
            className={`relative h-9 sm:h-8 px-3 inline-flex items-center justify-center gap-1.5 text-caption font-semibold whitespace-nowrap rounded-[calc(var(--radius-md)-2px)] transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {active && (
              <motion.span
                layoutId={`${id}-pill`}
                transition={spring.snappy}
                className="absolute inset-0 rounded-[calc(var(--radius-md)-2px)] bg-[var(--bg-primary)] shadow-[var(--shadow-card)]"
                aria-hidden
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" aria-hidden />
              {t(`entry.mode.${m}`)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
