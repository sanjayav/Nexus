import { motion } from 'framer-motion'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import { spring } from '../../motion/tokens'
import { REPORT_LANGS, type ReportLang } from './reportLang'

/**
 * Two-option language switch (English / 简体中文) with a sliding indicator.
 * Used for the report-language choice in the publish sheet and the language
 * toggle on the public verify / shared-report pages.
 */
export default function LangSegment({
  value,
  onChange,
  label,
  showIcon = false,
  size = 'md',
  className = '',
}: {
  value: ReportLang
  onChange: (l: ReportLang) => void
  /** Accessible group label. */
  label: string
  showIcon?: boolean
  size?: 'sm' | 'md'
  className?: string
}) {
  const { t } = useTranslation()
  const id = useId()
  const h = size === 'sm' ? 'h-8' : 'h-10'
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex items-center gap-0.5 p-0.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] ${className}`}
    >
      {showIcon && <Languages className="w-3.5 h-3.5 mx-1.5 text-[var(--text-tertiary)]" aria-hidden />}
      {REPORT_LANGS.map((l) => {
        const on = l === value
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={on}
            lang={l === 'zh' ? 'zh-CN' : 'en'}
            onClick={() => onChange(l)}
            className={`relative ${h} min-w-[40px] px-3 rounded-[calc(var(--radius-md)-2px)] text-small font-semibold whitespace-nowrap transition-colors duration-micro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
              on ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {on && (
              <motion.span
                layoutId={`lang-${id}`}
                transition={spring.snappy}
                className="absolute inset-0 rounded-[calc(var(--radius-md)-2px)] bg-[var(--bg-primary)] shadow-[var(--shadow-card)]"
                aria-hidden
              />
            )}
            <span className="relative">{t(`reviewUi.lang.${l}`)}</span>
          </button>
        )
      })}
    </div>
  )
}
