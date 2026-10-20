import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStrings } from '@/lib/i18n'
import { Dialog } from '@/components/ui'
import { helpStrings } from './help.strings'

export const GO_TO: Record<string, string> = { h: '/executive', t: '/tasks', f: '/modules', i: '/import', r: '/publish' }

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

/** `?` shows the list; `g` then a letter navigates. Ignored while typing. */
export function useGlobalShortcuts() {
  const navigate = useNavigate()
  const [helpOpen, setHelpOpen] = useState(false)
  useEffect(() => {
    let pendingG = 0
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      if (e.key === '?') {
        e.preventDefault()
        setHelpOpen(o => !o)
        return
      }
      if (e.key === 'g') {
        pendingG = Date.now()
        return
      }
      if (Date.now() - pendingG < 1200 && GO_TO[e.key]) {
        e.preventDefault()
        pendingG = 0
        navigate(GO_TO[e.key])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])
  return { helpOpen, setHelpOpen }
}

const Kbd = ({ children }: { children: string }) => (
  <kbd className="min-w-[22px] h-6 px-1.5 inline-flex items-center justify-center rounded-md border border-line bg-zinc-50 text-[11px] font-mono font-medium text-zinc-700 shadow-card">
    {children}
  </kbd>
)

export default function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStrings(helpStrings).shortcuts
  const rows: [string[], string][] = [
    [['⌘', 'K'], s.search],
    [['?'], s.help],
    [['g', 'h'], s.goHome],
    [['g', 't'], s.goTasks],
    [['g', 'f'], s.goFrameworks],
    [['g', 'i'], s.goImport],
    [['g', 'r'], s.goReport],
    [['⌘', '↵'], s.submitComment],
    [['esc'], s.close],
  ]
  return (
    <Dialog open={open} onClose={onClose} title={s.title} description={s.body}>
      <ul className="divide-y divide-line -my-2">
        {rows.map(([keys, label]) => (
          <li key={label} className="flex items-center justify-between gap-4 py-2.5 text-[13px] text-zinc-700">
            <span>{label}</span>
            <span className="flex items-center gap-1 shrink-0">
              {keys.map((k, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && keys[0] === 'g' && <span className="text-[11px] text-zinc-400">{s.then}</span>}
                  <Kbd>{k}</Kbd>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Dialog>
  )
}
