import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NumberTicker, SealCheck } from '../ui'
import { dur, ease, spring } from '../../motion/tokens'

/**
 * HeroWorkflow — the landing page's authored moment.
 *
 * One disclosure value travels the product's real workflow — assign → fill →
 * review → approve → publish — while the stage rail's indicator slides, the
 * audit trail grows a line per step, and at "publish" the seal draws and the
 * document hash appears. Then it rests, and loops while on screen.
 *
 * It is an illustration of the product, built from the product's own tokens:
 * the figures are sample data, not customer data. Reduced motion shows the
 * finished, published state.
 */
const STAGES = ['assign', 'fill', 'review', 'approve', 'publish'] as const
const LAST = STAGES.length - 1
const STEP_MS = 1500
const REST_MS = 3600
const FRAMEWORK_TAGS = ['GRI 305-1', 'ESRS E1-6', 'IFRS S2', 'HKEX A1.2']

export default function HeroWorkflow() {
  const { t, i18n } = useTranslation()
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const [stage, setStage] = useState(reduce ? LAST : 0)
  const isZh = i18n.language?.startsWith('zh')

  useEffect(() => {
    if (reduce) { setStage(LAST); return }
    if (!inView) return
    const id = window.setTimeout(
      () => setStage((s) => (s >= LAST ? 0 : s + 1)),
      stage >= LAST ? REST_MS : STEP_MS,
    )
    return () => window.clearTimeout(id)
  }, [stage, inView, reduce])

  const published = stage === LAST

  return (
    <div ref={ref} className="relative" aria-label={t('landing.workflow.aria')} role="img">
      {/* Linked-data tags: one value, many frameworks */}
      <div className="absolute -top-4 right-4 sm:right-8 z-10 flex flex-wrap justify-end gap-1.5 max-w-[80%]" aria-hidden>
        {FRAMEWORK_TAGS.map((tag, i) => (
          <motion.span
            key={tag}
            className="chip !h-7 !text-[12px] tabular-nums"
            style={{ background: 'var(--bg-primary)', boxShadow: 'var(--shadow-card)' }}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: stage >= 1 || reduce ? 1 : 0.0, y: 0 }}
            transition={{ duration: dur.base, ease: ease.out, delay: 0.05 * i }}
          >
            {tag}
          </motion.span>
        ))}
      </div>

      <div className="surface-raised relative overflow-hidden p-5 sm:p-7" aria-hidden>
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <span className="type-caption font-medium tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
            FY2026 · {t('landing.workflow.entity')}
          </span>
          <span
            className="type-caption font-medium px-2 h-6 inline-flex items-center rounded-full whitespace-nowrap"
            style={{
              background: published ? 'var(--status-success-soft)' : 'var(--bg-secondary)',
              color: published ? 'var(--status-success)' : 'var(--text-secondary)',
              border: `1px solid ${published ? 'var(--status-success-line)' : 'var(--border-subtle)'}`,
            }}
          >
            {t(`landing.workflow.status.${STAGES[stage]}`)}
          </span>
        </div>

        {/* Line item, bilingual */}
        <div className="mt-5">
          <p className="type-h3" style={{ color: 'var(--text-primary)' }}>
            {isZh ? '直接（范围一）温室气体排放' : 'Direct (Scope 1) GHG emissions'}
          </p>
          <p className="type-small mt-0.5" style={{ color: 'var(--text-tertiary)' }} lang={isZh ? 'en' : 'zh-CN'}>
            {isZh ? 'Direct (Scope 1) GHG emissions' : '直接（范围一）温室气体排放'}
          </p>
        </div>

        {/* Figure */}
        <div className="mt-5 flex items-end gap-2">
          <span className="type-figure text-[44px] sm:text-[52px] leading-none" style={{ color: 'var(--text-primary)' }}>
            {stage >= 1 ? <NumberTicker key="v" value={1937.3} format="number" precision={1} /> : <span style={{ color: 'var(--text-quaternary)' }}>—</span>}
          </span>
          <span className="type-small pb-1.5" style={{ color: 'var(--text-tertiary)' }}>tCO₂e</span>
        </div>

        {/* Stage rail */}
        <div className="mt-6 relative">
          <div className="absolute left-0 right-0 top-[13px] h-px" style={{ background: 'var(--border-default)' }} />
          <motion.div
            className="absolute left-0 top-[13px] h-px origin-left"
            style={{ background: 'var(--color-brand)', width: '100%' }}
            initial={false}
            animate={{ scaleX: stage / LAST }}
            transition={{ duration: dur.slow, ease: ease.out }}
          />
          <ol className="relative grid grid-cols-5">
            {STAGES.map((s, i) => {
              const done = i < stage || (published && i === LAST)
              const current = i === stage
              return (
                <li key={s} className="flex flex-col items-center gap-2 min-w-0">
                  <span className="relative w-[27px] h-[27px] flex items-center justify-center">
                    {current && !published && (
                      <motion.span
                        layoutId="hero-stage-ring"
                        className="absolute inset-0 rounded-full"
                        style={{ boxShadow: '0 0 0 4px var(--color-brand-soft), inset 0 0 0 1.5px var(--color-brand)' }}
                        transition={spring.gentle}
                      />
                    )}
                    <span
                      className="w-[15px] h-[15px] rounded-full flex items-center justify-center transition-colors duration-300"
                      style={{
                        background: done ? 'var(--color-brand)' : current ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
                        border: done ? 'none' : `1.5px solid ${current ? 'var(--color-brand)' : 'var(--border-strong)'}`,
                      }}
                    >
                      {done && <Check className="w-2.5 h-2.5" strokeWidth={3} style={{ color: 'var(--btn-primary-fg)' }} />}
                    </span>
                  </span>
                  <span
                    className="type-caption text-center truncate max-w-full px-0.5"
                    style={{ color: current || done ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: current ? 600 : 400 }}
                  >
                    {t(`landing.workflow.stages.${s}`)}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Audit trail */}
        <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <ul className="space-y-0 min-h-[150px]">
            <AnimatePresence initial={false}>
              {STAGES.slice(0, stage + 1).map((s, i) => (
                <motion.li
                  key={s}
                  layout
                  initial={reduce ? false : { opacity: 0, height: 0, x: -6 }}
                  animate={{ opacity: 1, height: 'auto', x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: dur.base, ease: ease.out }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: i === stage ? 'var(--color-brand)' : 'var(--border-strong)' }} />
                    <span className="type-small truncate" style={{ color: i === stage ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {t(`landing.workflow.trail.${s}`)}
                    </span>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>

        {/* Publish moment — space reserved so the card never changes height */}
        <div className="mt-3 min-h-[60px]">
        <AnimatePresence>
          {published && (
            <motion.div
              key="seal"
              className="flex items-center gap-3 rounded-[12px] px-3.5 py-3"
              style={{ background: 'var(--status-success-soft)', border: '1px solid var(--status-success-line)' }}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4, transition: { duration: dur.fast } }}
              transition={{ duration: dur.base, ease: ease.out }}
            >
              <SealCheck size={28} />
              <div className="min-w-0">
                <p className="type-small font-semibold" style={{ color: 'var(--text-primary)' }}>{t('landing.workflow.anchored')}</p>
                <p className="type-caption font-mono truncate" style={{ color: 'var(--text-tertiary)' }}>sha256 f3a9c1d27be04a8e9f1c…</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
