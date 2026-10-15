import { useState, useRef, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'
import { GLOSSARY } from '../data/glossary'

/**
 * Inline ESG jargon explainer. Wrap any acronym or term to attach a hover tooltip.
 *
 *   <JargonTooltip term="ISAE 3000">International Standard on Assurance Engagements…</JargonTooltip>
 *
 * If `children` is omitted and the `term` exists in `GLOSSARY`, the
 * definition is pulled from there automatically — this is the recommended
 * way to keep the lexicon consistent across pages.
 *
 *   <JargonTooltip term="DMA" />
 *
 * Renders the term with a dotted underline and a tiny help icon. Hovering
 * or focusing shows a popover with the explanation. Keyboard-accessible.
 */
interface Props {
  term: string
  /**
   * Optional inline definition. When omitted, the component looks the term
   * up in `src/data/glossary.ts` and renders that entry's definition.
   */
  children?: React.ReactNode
  /** If true, renders just the help icon without wrapping the term itself. */
  iconOnly?: boolean
}

export default function JargonTooltip({ term, children, iconOnly = false }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  // Pull definition from the shared glossary when caller didn't pass one.
  const entry = GLOSSARY[term]
  const tooltipBody: React.ReactNode =
    children ?? entry?.definition ?? (
      <span className="text-white/50 italic">No definition available.</span>
    )
  const headline = entry?.term ?? term

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <span ref={ref} className="relative inline-flex items-center gap-0.5">
      {!iconOnly && (
        <span className="border-b border-dotted border-[var(--text-tertiary)] cursor-help">{term}</span>
      )}
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(o => !o)}
        aria-label={`What is ${term}?`}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[var(--text-tertiary)] hover:text-[var(--color-brand)] cursor-help transition-colors"
      >
        <HelpCircle className="w-3 h-3" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-full mt-1.5 z-50 w-[260px] p-3 rounded-[8px] bg-[var(--bg-inverse)] text-white text-[11.5px] leading-relaxed shadow-xl pointer-events-none"
          style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}
        >
          <div className="font-semibold text-[12px] mb-1 text-white">{headline}</div>
          <div className="text-white/80">{tooltipBody}</div>
          {entry?.framework && (
            <div className="mt-2 text-[10px] uppercase tracking-[0.08em] font-semibold text-emerald-300/80">
              {entry.framework}
            </div>
          )}
        </span>
      )}
    </span>
  )
}
