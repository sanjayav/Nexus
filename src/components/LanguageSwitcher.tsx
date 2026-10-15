import { useEffect, useRef, useState } from 'react'
import { Check, Languages } from 'lucide-react'
import clsx from 'clsx'
import { useLanguage } from '../contexts/LanguageContext'
import { LOCALES } from '../i18n'

/** Compact language menu. `align` controls which edge the popover hugs. */
export default function LanguageSwitcher({ align = 'right', className }: { align?: 'left' | 'right'; className?: string }) {
  const { locale, setLocale } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = LOCALES.find(l => l.code === locale)!

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language / 语言"
        className="h-9 inline-flex items-center gap-1.5 px-2.5 rounded-[10px] text-[13px] font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
      >
        <Languages className="w-4 h-4" />
        <span>{current.short}</span>
      </button>
      {open && (
        <div
          role="listbox"
          className={clsx(
            'absolute top-full mt-1.5 w-44 p-1 bg-white border border-line rounded-xl shadow-pop z-50 animate-scale-in',
            align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
          )}
        >
          {LOCALES.map(l => (
            <button
              key={l.code}
              type="button"
              role="option"
              aria-selected={l.code === locale}
              lang={l.htmlLang}
              onClick={() => {
                setLocale(l.code)
                setOpen(false)
              }}
              className={clsx(
                'w-full flex items-center justify-between gap-2 px-2.5 h-9 rounded-lg text-sm transition-colors',
                l.code === locale ? 'text-zinc-900 bg-zinc-100' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
              )}
            >
              <span>{l.label}</span>
              {l.code === locale && <Check className="w-4 h-4 text-brand-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
