import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { QuestionAssignment } from '../../lib/orgStore'
import { isOverdue, dateLocale } from './shared'

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

interface TaskCalendarProps {
  assignments: QuestionAssignment[]
  onPickDay: (isoDate: string) => void
}

/**
 * Month grid. Each cell shows up to 3 assignment chips, plus a "+N more"
 * overflow. Clicking a day calls onPickDay(YYYY-MM-DD) so the page can
 * switch to List filtered to that date.
 *
 * Interaction:
 *   - ‹ / › : month navigation
 *   - Click date cell with tasks → onPickDay (page switches to List)
 *   - Today is highlighted with a brand ring
 */
export default function TaskCalendar({ assignments, onPickDay }: TaskCalendarProps) {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  const monthAssignments = useMemo(() => {
    const map = new Map<string, QuestionAssignment[]>()
    for (const a of assignments) {
      if (!a.due_date) continue
      const arr = map.get(a.due_date) ?? []
      arr.push(a)
      map.set(a.due_date, arr)
    }
    return map
  }, [assignments])

  const days = useMemo(() => buildMonthGrid(cursor), [cursor])

  return (
    <div className="surface-paper p-3 sm:p-5">
      <header className="flex items-center justify-between mb-4">
        <h3 className="type-h3 text-[var(--text-primary)] whitespace-nowrap">
          {cursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            className="w-10 h-10 sm:w-8 sm:h-8 rounded-[var(--radius-sm)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-secondary)]"
            aria-label={t('tasks.calendar.prevMonth')}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="px-3 h-10 sm:h-8 rounded-[var(--radius-sm)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-caption font-semibold text-[var(--text-secondary)] whitespace-nowrap"
          >
            {t('tasks.calendar.today')}
          </button>
          <button
            type="button"
            onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            className="w-10 h-10 sm:w-8 sm:h-8 rounded-[var(--radius-sm)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-secondary)]"
            aria-label={t('tasks.calendar.nextMonth')}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_KEYS.map(d => (
          <div key={d} className="text-caption font-medium text-[var(--text-tertiary)] text-center py-1">
            {t(`tasks.calendar.weekday.${d}`)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d, idx) => {
          const iso = toIso(d.date)
          const inMonth = d.date.getMonth() === cursor.getMonth()
          const isToday = sameDay(d.date, today)
          const items = monthAssignments.get(iso) ?? []
          const hasOverdue = items.some(isOverdue)

          return (
            <button
              key={idx}
              type="button"
              disabled={items.length === 0}
              onClick={() => items.length > 0 && onPickDay(iso)}
              className={`flex flex-col justify-start items-stretch text-left rounded-[var(--radius-sm)] p-1 sm:p-1.5 min-h-[56px] sm:min-h-[84px] border transition-[border-color,transform,background-color] duration-fast min-w-0 ${
                isToday
                  ? 'border-[var(--color-brand)] shadow-[0_0_0_2px_var(--color-brand-soft)]'
                  : 'border-[var(--border-subtle)]'
              } ${
                inMonth ? 'bg-[var(--bg-primary)]' : 'bg-[var(--bg-secondary)]'
              } ${
                items.length > 0 ? 'hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] active:scale-[0.98] cursor-pointer' : 'cursor-default'
              } ${
                hasOverdue && !isToday ? 'border-[var(--status-danger-line)]' : ''
              }`}
              aria-label={t('tasks.calendar.dayAria', { date: locale ? d.date.toLocaleDateString(locale, { dateStyle: 'full' }) : d.date.toDateString(), count: items.length })}
            >
              <div className={`text-caption font-semibold mb-1 tabular-nums ${
                isToday ? 'text-[var(--color-brand)]' : inMonth ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
              }`}>
                {d.date.getDate()}
              </div>
              {/* Phones: one dot per task (codes don't fit a 50 px cell). */}
              <div className="flex flex-wrap gap-0.5 sm:hidden" aria-hidden>
                {items.slice(0, 4).map(it => (
                  <span key={it.id} className="w-1.5 h-1.5 rounded-full" style={{ background: chipTone(it).fg }} />
                ))}
              </div>
              <div className="space-y-0.5 hidden sm:block">
                {items.slice(0, 2).map(it => (
                  <div
                    key={it.id}
                    className="truncate text-caption font-mono px-1 rounded"
                    style={{ background: chipTone(it).bg, color: chipTone(it).fg }}
                  >
                    {it.gri_code}
                  </div>
                ))}
                {items.length > 2 && (
                  <div className="text-caption text-[var(--text-tertiary)] font-semibold whitespace-nowrap">
                    {t('tasks.calendar.more', { count: items.length - 2 })}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function chipTone(it: QuestionAssignment): { bg: string; fg: string } {
  if (isOverdue(it)) return { bg: 'var(--status-danger-soft)', fg: 'var(--status-danger)' }
  if (it.status === 'approved') return { bg: 'var(--status-success-soft)', fg: 'var(--status-success)' }
  if (it.status === 'submitted' || it.status === 'reviewed') return { bg: 'var(--status-info-soft)', fg: 'var(--status-info)' }
  return { bg: 'var(--status-neutral-soft)', fg: 'var(--status-neutral)' }
}

function buildMonthGrid(cursor: Date): { date: Date }[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  // ISO week starts Monday — shift so Mon = 0.
  const startWeekday = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - startWeekday)
  return Array.from({ length: 42 }).map((_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return { date: d }
  })
}

function toIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
