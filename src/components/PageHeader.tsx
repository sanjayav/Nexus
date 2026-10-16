import { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import JourneyBar from './JourneyBar'
import type { StageKey } from '../lib/journey'
import { dur, ease, STAGGER } from '../motion/tokens'

export interface Breadcrumb {
  label: string
  to?: string
}

interface PageHeaderProps {
  eyebrow?: string
  /** Uniform top-of-page breadcrumb trail (e.g. Work / Tasks / Overdue). */
  breadcrumbs?: Breadcrumb[]
  title: string
  /** Alias for subtitle — plain prose under the H1. */
  description?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  stage?: StageKey
  /** Show the compact pipeline strip. Defaults to true when `stage` is passed. */
  showPipeline?: boolean
  /** Pass additional content below the title block (e.g. filters, tabs). */
  children?: ReactNode
  /** 'default' — h1 (28/34). 'hero' — display (40/44) on the emerald contour wash. */
  variant?: 'default' | 'hero'
}

/**
 * PageHeader — the anchor of every page and the ONLY in-page entrance
 * animation (PageTransition just lifts the page 4 px). Breadcrumb, eyebrow,
 * title, description and actions arrive 30 ms apart.
 */
export default function PageHeader({
  eyebrow,
  breadcrumbs,
  title,
  description,
  subtitle,
  actions,
  stage,
  showPipeline,
  children,
  variant = 'default',
}: PageHeaderProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const shouldShowPipeline = showPipeline ?? stage != null
  // `description` is the canonical IA-reset name; `subtitle` kept as a synonym for back-compat.
  const sub = description ?? subtitle
  const hero = variant === 'hero'

  let step = 0
  const enter = () => {
    const i = step++
    return reduce
      ? {}
      : {
          initial: { opacity: 0, y: 6 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: dur.base, ease: ease.out, delay: 0.04 + i * STAGGER },
        }
  }

  return (
    <div
      className={`mb-7 ${hero ? 'backdrop-mesh -mx-4 -mt-5 px-4 pt-6 pb-7 sm:-mx-6 sm:-mt-6 sm:px-6 lg:-mx-8 lg:-mt-7 lg:px-8 lg:pt-8 rounded-b-[var(--radius-2xl)]' : ''}`}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <motion.nav
          aria-label={t('components.breadcrumb')}
          {...enter()}
          className="flex items-center flex-wrap gap-1.5 text-caption text-[var(--text-tertiary)] mb-3"
        >
          {breadcrumbs.map((b, i) => {
            const last = i === breadcrumbs.length - 1
            return (
              <span key={`${b.label}-${i}`} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                {b.to && !last ? (
                  <Link to={b.to} className="hover:text-[var(--text-primary)] transition-colors font-medium">
                    {b.label}
                  </Link>
                ) : (
                  <span className={last ? 'text-[var(--text-secondary)] font-semibold' : 'font-medium'}>{b.label}</span>
                )}
                {!last && <ChevronRight className="w-3 h-3 text-[var(--text-quaternary)]" />}
              </span>
            )
          })}
        </motion.nav>
      )}
      {shouldShowPipeline && (
        <motion.div {...enter()} className="mb-5">
          <JourneyBar variant="compact" highlight={stage} />
        </motion.div>
      )}
      {/* Stack on mobile; title and actions side by side from sm. */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6 sm:flex-wrap">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <motion.span {...enter()} className="kicker block">
              {eyebrow}
            </motion.span>
          )}
          <motion.h1
            {...enter()}
            className={`${hero ? 'type-display mt-2' : 'type-h1 mt-1'} text-[var(--text-primary)] text-balance`}
          >
            {title}
          </motion.h1>
          {sub && (
            <motion.p
              {...enter()}
              className={`text-[var(--text-secondary)] max-w-2xl ${hero ? 'type-body sm:text-[16px] sm:leading-[26px] mt-3' : 'type-body mt-2'}`}
            >
              {sub}
            </motion.p>
          )}
          {children && <div className="mt-5">{children}</div>}
        </div>
        {actions && (
          <motion.div
            {...enter()}
            className="flex items-center gap-2 flex-shrink-0 flex-wrap [&>*]:flex-1 sm:[&>*]:flex-initial"
          >
            {actions}
          </motion.div>
        )}
      </div>
    </div>
  )
}
