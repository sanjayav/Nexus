import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, CheckCheck, CheckCircle2, CornerUpLeft, FileUp, MessageSquare, Send, XCircle, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { fmt, useStrings } from '@/lib/i18n'
import { useDismiss } from '@/lib/hooks/useDismiss'
import { integrationStrings } from '@/lib/i18n/shared/integrations'
import { useWorkflowText } from '@/lib/i18n/shared/workflow'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { useReportingActions, useWorkspaceSlice } from '@/store/hooks'
import type { ActivityKind } from '@/store/reporting'
import { EmptyState, ease } from '@/components/ui'
import { shellStrings } from './shell.strings'

const KIND_ICON: Partial<Record<ActivityKind, { icon: LucideIcon; className: string }>> = {
  submit: { icon: Send, className: 'bg-amber-50 text-amber-600' },
  approve: { icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-600' },
  request_changes: { icon: CornerUpLeft, className: 'bg-rose-50 text-rose-600' },
  reject: { icon: XCircle, className: 'bg-rose-50 text-rose-600' },
  comment: { icon: MessageSquare, className: 'bg-sky-50 text-sky-600' },
  import: { icon: FileUp, className: 'bg-violet-50 text-violet-600' },
}

/** Topbar bell + popover fed by the reporting store. */
export default function NotificationCenter() {
  const s = useStrings(shellStrings)
  const ch = useStrings(integrationStrings)
  const wt = useWorkflowText()
  const { region } = useWorkspace()
  const { notifications } = useWorkspaceSlice()
  const { markAllRead } = useReportingActions()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, open, () => setOpen(false))
  const unread = notifications.filter(n => !n.read).length
  const channels = region.notify
    .filter(c => c !== 'email')
    .slice(0, 2)
    .map(c => ch.notify[c])
    .join(' · ')

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={s.notifications}
        aria-expanded={open}
        className="relative w-9 h-9 rounded-[10px] flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
      >
        <Bell className="w-[18px] h-[18px]" />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key={unread}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 600, damping: 24 }}
              className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-brand-600 text-white text-[10px] font-semibold tabular flex items-center justify-center ring-2 ring-canvas"
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: ease.out }}
            className="absolute right-0 top-full mt-2 w-[min(380px,calc(100vw-24px))] bg-white border border-line rounded-2xl shadow-pop z-50 origin-top-right overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 h-12 border-b border-line">
              <span className="text-sm font-semibold text-zinc-900">{s.notifications}</span>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> {s.markAllRead}
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <EmptyState icon={Bell} title={s.notificationsEmpty} description={s.notificationsEmptyBody} />
            ) : (
              <ul className="max-h-[60vh] overflow-y-auto py-1">
                {notifications.slice(0, 20).map(n => {
                  const meta = KIND_ICON[n.kind] ?? KIND_ICON.comment!
                  const Icon = meta.icon
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false)
                          navigate(n.route)
                        }}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
                      >
                        <span className={clsx('w-8 h-8 rounded-full flex items-center justify-center shrink-0', meta.className)}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={clsx('block text-[13px] leading-snug', n.read ? 'text-zinc-600' : 'text-zinc-900 font-medium')}>
                            {wt.describe(n)}
                          </span>
                          {n.note && n.kind !== 'import' && (
                            <span className="block mt-0.5 text-xs text-zinc-500 line-clamp-2">{n.note}</span>
                          )}
                          <span className="block mt-1 text-[11px] text-zinc-400">{wt.ago(n.at)}</span>
                        </span>
                        {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-500 shrink-0" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            {channels && (
              <div className="px-4 py-2.5 border-t border-line bg-zinc-50/70 text-[11px] text-zinc-500">
                {fmt(s.channels, { channels })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
