import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { QuestionAssignment } from '../../lib/orgStore'
import { isOverdue } from './shared'

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
    <div className="card-premium p-4 sm:p-5">
      <header className="flex items-center justify-between mb-4">
        <h3 className="h-section text-[var(--text-primary)]">
          {cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            className="w-8 h-8 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)]"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="px-3 h-8 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            className="w-8 h-8 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)]"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="text-[9px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] text-center">
            {d}
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
              className={`text-left rounded-[var(--radius-sm)] p-1.5 min-h-[80px] border transition-colors ${
                isToday
                  ? 'border-[var(--color-brand)] ring-1 ring-[var(--color-brand)]/30'
                  : 'border-[var(--border-subtle)]'
              } ${
                inMonth ? 'bg-[var(--bg-primary)]' : 'bg-[var(--bg-secondary)]/40'
              } ${
                items.length > 0 ? 'hover:border-[var(--color-brand)]/40 hover:-translate-y-px cursor-pointer' : 'cursor-default'
              } ${
                hasOverdue ? 'border-[var(--status-reject)]/40' : ''
              }`}
              aria-label={`${d.date.toDateString()}, ${items.length} task${items.length === 1 ? '' : 's'}`}
            >
              <div className={`text-[10px] font-semibold mb-1 tabular-nums ${
                isToday ? 'text-[var(--color-brand)]' : inMonth ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
              }`}>
                {d.date.getDate()}
              </div>
              <div className="space-y-0.5">
                {items.slice(0, 2).map(it => (
                  <div
                    key={it.id}
                    className={`truncate text-[9px] px-1 py-0.5 rounded ${
                      isOverdue(it)
                        ? 'bg-[var(--accent-red-light)] text-[var(--status-reject)]'
                        : it.status === 'approved'
                          ? 'bg-[var(--accent-green-light)] text-[var(--status-ok)]'
                          : 'bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]'
                    }`}
                  >
                    {it.gri_code}
                  </div>
                ))}
                {items.length > 2 && (
                  <div className="text-[9px] text-[var(--text-tertiary)] font-semibold">
                    +{items.length - 2} more
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
