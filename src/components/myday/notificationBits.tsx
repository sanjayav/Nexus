import type { TFunction } from 'i18next'
import { AlertTriangle, AtSign, Bell, CheckCircle2, ClipboardList, Eye, MessageSquare, Undo2, type LucideIcon } from 'lucide-react'
import i18n from '../../i18n'
import { localeFor } from '../../lib/fmt'

/** Shared bits for the inbox page and the notifications bell. */

type Tone = 'brand' | 'info' | 'danger' | 'warning' | 'success' | 'neutral'

const KIND: Record<string, { icon: LucideIcon; tone: Tone }> = {
  assignment: { icon: ClipboardList, tone: 'brand' },
  assigned: { icon: ClipboardList, tone: 'brand' },
  assignment_created: { icon: ClipboardList, tone: 'brand' },
  assignment_bulk_created: { icon: ClipboardList, tone: 'brand' },
  comment: { icon: MessageSquare, tone: 'neutral' },
  mention: { icon: AtSign, tone: 'info' },
  review_request: { icon: Eye, tone: 'info' },
  review_requested: { icon: Eye, tone: 'info' },
  review_decision: { icon: Eye, tone: 'info' },
  approval_requested: { icon: Eye, tone: 'info' },
  approve: { icon: CheckCircle2, tone: 'success' },
  review: { icon: Eye, tone: 'info' },
  submitted: { icon: Eye, tone: 'info' },
  rejected: { icon: Undo2, tone: 'danger' },
  returned: { icon: Undo2, tone: 'danger' },
  anomaly: { icon: AlertTriangle, tone: 'warning' },
  approved: { icon: CheckCircle2, tone: 'success' },
}

const TONE_STYLE: Record<Tone, { bg: string; fg: string }> = {
  brand: { bg: 'var(--color-brand-soft)', fg: 'var(--color-brand-strong)' },
  info: { bg: 'var(--status-info-soft)', fg: 'var(--status-info)' },
  danger: { bg: 'var(--status-danger-soft)', fg: 'var(--status-danger)' },
  warning: { bg: 'var(--status-warning-soft)', fg: 'var(--status-warning)' },
  success: { bg: 'var(--status-success-soft)', fg: 'var(--status-success)' },
  neutral: { bg: 'var(--status-neutral-soft)', fg: 'var(--status-neutral)' },
}

export function KindIcon({ kind, size = 32 }: { kind: string; size?: number }) {
  const meta = KIND[kind] ?? { icon: Bell, tone: 'neutral' as Tone }
  const s = TONE_STYLE[meta.tone]
  const Icon = meta.icon
  return (
    <span
      aria-hidden
      className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{ width: size, height: size, background: s.bg, color: s.fg }}
    >
      <Icon style={{ width: size * 0.47, height: size * 0.47 }} />
    </span>
  )
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/** Day bucket for grouping: Today / Yesterday / "Mon 12 Oct". */
export function dayBucket(iso: string, t: TFunction, lng?: string): { key: string; label: string } {
  const d = new Date(iso)
  const today = new Date()
  const yest = new Date(); yest.setDate(today.getDate() - 1)
  const key = ymd(d)
  if (key === ymd(today)) return { key, label: t('tasks.inbox.today') }
  if (key === ymd(yest)) return { key, label: t('tasks.inbox.yesterday') }
  const sameYear = d.getFullYear() === today.getFullYear()
  return {
    key,
    label: new Intl.DateTimeFormat(localeFor(lng), { weekday: 'short', month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' }).format(d),
  }
}

/** Short relative time ("5m", "3h", "2d") with a date fallback after a week. */
export function relativeTime(iso: string, lng?: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return i18n.t('components.time.justNow')
  if (mins < 60) return i18n.t('components.time.minutesShort', { count: mins })
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return i18n.t('components.time.hoursShort', { count: hrs })
  const days = Math.floor(hrs / 24)
  if (days < 7) return i18n.t('components.time.daysShort', { count: days })
  return new Intl.DateTimeFormat(localeFor(lng ?? i18n.language), { month: 'short', day: 'numeric' }).format(new Date(iso))
}
