import { useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MoreHorizontal, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { LOCALES, useStrings } from '@/lib/i18n'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useDismiss } from '@/lib/hooks/useDismiss'
import { ease } from '@/components/ui'
import { accessStrings } from '@/features/access/access.strings'
import { ROLE_ORDER, type RoleId } from '@/features/access/model'

/** "3 days ago" / "in 6 days" / "2 天前" / "6 天后", rounded to the most natural unit. */
export function useRelativeTime() {
  const { locale } = useLanguage()
  return useMemo(() => {
    const rtf = new Intl.RelativeTimeFormat(LOCALES.find(l => l.code === locale)!.intl, { numeric: 'auto' })
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
      ['day', 86_400_000],
      ['hour', 3_600_000],
      ['minute', 60_000],
    ]
    return (iso: string, now = Date.now()) => {
      const diff = new Date(iso).getTime() - now
      for (const [unit, ms] of units) if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit)
      return rtf.format(0, 'minute')
    }
  }, [locale])
}

export const inviteLink = (token: string) => `${window.location.origin}/invite/${token}`

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export const selectClass =
  'h-8 pl-2.5 pr-7 rounded-lg bg-white border border-line text-[13px] text-zinc-800 shadow-card appearance-none cursor-pointer hover:border-zinc-300 focus:outline-none focus:ring-[3px] focus:ring-brand-500/20 focus:border-brand-600 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500 bg-[length:12px] bg-no-repeat bg-[right_0.5rem_center] bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%2371717a%27 stroke-width=%272%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E")]'

/** Role picker listing every role; roles the actor can't grant are disabled. */
export function RoleSelect({
  value,
  onChange,
  allowed,
  disabled,
  label,
  title,
  className,
  id,
}: {
  value: RoleId
  onChange: (role: RoleId) => void
  allowed: RoleId[]
  disabled?: boolean
  label: string
  title?: string
  className?: string
  id?: string
}) {
  const roles = useStrings(accessStrings).roles
  return (
    <select
      id={id}
      value={value}
      onChange={e => onChange(e.target.value as RoleId)}
      disabled={disabled}
      aria-label={label}
      title={title}
      className={clsx(selectClass, className)}
    >
      {ROLE_ORDER.map(r => (
        <option key={r} value={r} disabled={!allowed.includes(r) && r !== value}>
          {roles[r].name}
        </option>
      ))}
    </select>
  )
}

export type MenuAction = { label: string; icon: LucideIcon; onSelect: () => void; danger?: boolean; hidden?: boolean }

/** Overflow ("⋯") menu for a row. */
export function RowMenu({ label, actions }: { label: string; actions: MenuAction[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, open, () => setOpen(false))
  const visible = actions.filter(a => !a.hidden)
  if (!visible.length) return <span className="w-8" />
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-900/[0.05] hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15, ease: ease.out }}
            className="absolute right-0 top-full mt-1 w-56 p-1 bg-white border border-line rounded-xl shadow-pop z-30 origin-top-right"
          >
            {visible.map(a => (
              <button
                key={a.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  a.onSelect()
                }}
                className={clsx(
                  'w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13px] text-left transition-colors',
                  a.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-zinc-700 hover:bg-zinc-50',
                )}
              >
                <a.icon className="w-4 h-4 shrink-0" />
                {a.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Small toggle chip used for framework scope. */
export function Chip({ on, onClick, children, disabled }: { on: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'h-7 px-2.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50',
        on ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-line hover:border-zinc-300 hover:text-zinc-900',
      )}
    >
      {children}
    </button>
  )
}
