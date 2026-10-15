import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'

export interface FAQItem {
  q: string
  a: string
}

interface FAQProps {
  items: FAQItem[]
  heading?: string
}

/**
 * Accessible accordion. Uses native <button> semantics + aria-expanded for
 * screen readers. Single-open behaviour keeps the visual rhythm clean.
 */
export default function FAQ({ items, heading = 'Frequently asked questions' }: FAQProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <section className="py-20 sm:py-24">
      <div className="max-w-[920px] mx-auto px-5 sm:px-8">
        <h2
          className="h-display text-center mb-12"
          style={{
            fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)',
            color: 'var(--text-primary)',
          }}
        >
          {heading}
        </h2>

        <div className="divide-y" style={{ borderTop: '1px solid var(--border-default)', borderBottom: '1px solid var(--border-default)' }}>
          {items.map((item, idx) => {
            const open = openIdx === idx
            return (
              <div
                key={item.q}
                style={{ borderBottom: idx === items.length - 1 ? 'none' : '1px solid var(--border-subtle)' }}
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(open ? null : idx)}
                  aria-expanded={open}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span className="text-[16px] font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    {item.q}
                  </span>
                  <span
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{
                      background: open ? 'var(--accent-600)' : 'var(--bg-secondary)',
                      color: open ? '#fff' : 'var(--text-secondary)',
                    }}
                    aria-hidden="true"
                  >
                    {open ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </span>
                </button>
                {open && (
                  <div
                    className="pb-6 pr-12 text-[14.5px] leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {item.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
