import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import JourneyBar from './JourneyBar'
import type { StageKey } from '../lib/journey'
import { SPRING } from './motion'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: ReactNode
  stage?: StageKey
  /** Show the compact pipeline strip. Defaults to true when `stage` is passed. */
  showPipeline?: boolean
  /** Pass additional content below the title block (e.g. filters, tabs). */
  children?: ReactNode
  /** Visual treatment: 'default' (minimal) | 'hero' (gradient sheen). */
  variant?: 'default' | 'hero'
}

/**
 * PageHeader v2 — the anchor moment of every page.
 *
 * Typographic hierarchy matches Linear / Vercel — oversized display headline,
 * tiny brand eyebrow, muted subtitle, right-aligned action rail.
 */
export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  stage,
  showPipeline,
  children,
  variant = 'default',
}: PageHeaderProps) {
  const shouldShowPipeline = showPipeline ?? stage != null
  return (
    <div className={`mb-7 ${variant === 'hero' ? 'relative backdrop-mesh -mx-8 -mt-7 pt-7 px-8 pb-7 mb-7' : ''}`}>
      {shouldShowPipeline && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.05 }}
          className="mb-5"
        >
          <JourneyBar variant="compact" highlight={stage} />
        </motion.div>
      )}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.05 }}
              className="kicker"
            >
              {eyebrow}
            </motion.span>
          )}
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: eyebrow ? 0.1 : 0.05 }}
            className={`text-display text-[var(--text-primary)] ${
              variant === 'hero' ? 'text-[40px] md:text-[48px] mt-2' : 'text-[30px] md:text-[34px] mt-1.5'
            }`}
          >
            {title}
          </motion.h1>
          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.15 }}
              className={`text-[var(--text-secondary)] max-w-2xl leading-relaxed ${
                variant === 'hero' ? 'text-[16px] mt-3' : 'text-[14px] mt-2'
              }`}
            >
              {subtitle}
            </motion.p>
          )}
          {children && <div className="mt-5">{children}</div>}
        </div>
        {actions && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.15 }}
            className="flex items-center gap-2 flex-shrink-0"
          >
            {actions}
          </motion.div>
        )}
      </div>
    </div>
  )
}
