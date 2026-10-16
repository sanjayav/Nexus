import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Reveal } from './motion'
import { dur, ease } from '../../motion/tokens'

export interface FAQItem {
  q: string
  a: string
}

interface FAQProps {
  items: FAQItem[]
  heading?: string
}

/**
 * Accessible accordion: native buttons with aria-expanded / aria-controls.
 * Answers open with a height + fade; the plus turns into a cross.
 * Two-column on desktop (heading left, questions right).
 */
export default function FAQ({ items, heading }: FAQProps) {
  const { t } = useTranslation()
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  const baseId = useId()

  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-20">
        <Reveal className="lg:sticky lg:top-28 self-start">
          <h2 className="type-display" style={{ color: 'var(--text-primary)', textWrap: 'balance' }}>
            {heading ?? t('marketing.faq.heading')}
          </h2>
        </Reveal>

        <div style={{ borderTop: '1px solid var(--border-default)' }}>
          {items.map((item, idx) => {
            const open = openIdx === idx
            const panelId = `${baseId}-p${idx}`
            const btnId = `${baseId}-b${idx}`
            return (
              <div key={item.q} style={{ borderBottom: '1px solid var(--border-default)' }}>
                <h3>
                  <button
                    id={btnId}
                    type="button"
                    onClick={() => setOpenIdx(open ? null : idx)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    className="w-full flex items-center justify-between gap-6 py-5 sm:py-6 text-left group"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <span className="type-h3 sm:text-[17px] min-w-0">{item.q}</span>
                    <span
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200 group-hover:bg-[var(--bg-tertiary)]"
                      style={{
                        background: open ? 'var(--color-brand-soft)' : 'var(--bg-secondary)',
                        color: open ? 'var(--color-brand-strong)' : 'var(--text-secondary)',
                      }}
                      aria-hidden="true"
                    >
                      <Plus className="w-4 h-4 transition-transform duration-200" style={{ transform: open ? 'rotate(45deg)' : 'none' }} />
                    </span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={btnId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: dur.base, ease: ease.out }}
                      className="overflow-hidden"
                    >
                      <p className="pb-6 pr-12 text-[15px] leading-[1.7] max-w-[680px]" style={{ color: 'var(--text-secondary)' }}>
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
