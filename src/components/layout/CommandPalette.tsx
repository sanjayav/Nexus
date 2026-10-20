import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CornerDownLeft, Search, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { ease } from '@/components/ui'

export type PaletteItem = { label: string; group: string; icon: LucideIcon; path: string; keywords?: string }

export default function CommandPalette({
  open,
  items,
  onSelect,
  onClose,
  placeholder,
  empty,
}: {
  open: boolean
  items: PaletteItem[]
  onSelect: (path: string) => void
  onClose: () => void
  placeholder: string
  empty: string
}) {
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle ? items.filter(i => `${i.label} ${i.group} ${i.keywords ?? ''}`.toLowerCase().includes(needle)) : items
  }, [q, items])

  useEffect(() => setIdx(0), [q])
  useEffect(() => {
    if (!open) setQ('')
  }, [open])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIdx(i => Math.min(results.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIdx(i => Math.max(0, i - 1))
    } else if (e.key === 'Enter' && results[idx]) onSelect(results[idx].path)
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]"
          onKeyDown={onKeyDown}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="absolute inset-0 bg-zinc-900/25 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-pop border border-line overflow-hidden"
            initial={{ opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18, ease: ease.out }}
          >
            <div className="flex items-center gap-2.5 px-4 h-12 border-b border-line">
              <Search className="w-4 h-4 text-zinc-400" />
              <input
                autoFocus
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={placeholder}
                className="flex-1 bg-transparent text-[15px] text-zinc-900 placeholder:text-zinc-500 outline-none"
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-results"
              />
              <kbd className="text-[10px] font-mono text-zinc-500 border border-line rounded px-1 py-px">esc</kbd>
            </div>
            <ul id="palette-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-1.5">
              {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-zinc-500">{empty}</li>}
              {results.map((r, i) => {
                const Icon = r.icon
                const active = i === idx
                return (
                  <li key={r.path} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onMouseEnter={() => setIdx(i)}
                      onClick={() => onSelect(r.path)}
                      className={clsx(
                        'relative w-full flex items-center gap-3 px-3 h-10 rounded-lg text-sm text-left',
                        active ? 'text-zinc-900' : 'text-zinc-600',
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="palette-hl"
                          className="absolute inset-0 rounded-lg bg-zinc-100"
                          transition={{ type: 'spring', stiffness: 700, damping: 45 }}
                        />
                      )}
                      <Icon className="relative w-4 h-4 text-zinc-400" />
                      <span className="relative flex-1 truncate">{r.label}</span>
                      <span className="relative text-xs text-zinc-500">{r.group}</span>
                      {active && <CornerDownLeft className="relative w-3.5 h-3.5 text-zinc-400" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
