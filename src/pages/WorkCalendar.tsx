import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { SkeletonCard } from '../components/Skeleton'
import { orgStore, type QuestionAssignment } from '../lib/orgStore'
import { useAuth } from '../auth/AuthContext'

/**
 * WorkCalendar — month grid that plots assignment due dates. v1 keeps it
 * functional but light: fetch my-assignments, group by date, render the
 * basic month view. Click a date to jump into MyTasks with the day filter.
 */
export default function WorkCalendar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<QuestionAssignment[] | null>(null)
  const [cursor, setCursor] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d
  })

  useEffect(() => {
    if (!user) return
    let cancelled = false
    void orgStore.myAssignments()
      .then(rows => { if (!cancelled) setItems(rows) })
      .catch(() => { if (!cancelled) setItems([]) })
    return () => { cancelled = true }
  }, [user])

  const cells = useMemo(() => buildMonth(cursor), [cursor])

  const dueByDay = useMemo(() => {
    const map = new Map<string, QuestionAssignment[]>()
    for (const a of items ?? []) {
      if (!a.due_date) continue
      const key = a.due_date.slice(0, 10) // YYYY-MM-DD
      const arr = map.get(key) ?? []
      arr.push(a)
      map.set(key, arr)
    }
    return map
  }, [items])

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div className="page-container space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Work', to: '/' },
          { label: 'Calendar' },
        ]}
        title="Calendar"
        description="Every assignment due date in one view. Click any day to jump into the matching tasks."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCursor(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n })}
              className="w-8 h-8 rounded-[8px] border border-[var(--border-default)] inline-flex items-center justify-center hover:bg-[var(--bg-hover)]"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[13px] font-semibold text-[var(--text-primary)] min-w-[140px] text-center">{monthLabel}</span>
            <button
              onClick={() => setCursor(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n })}
              className="w-8 h-8 rounded-[8px] border border-[var(--border-default)] inline-flex items-center justify-center hover:bg-[var(--bg-hover)]"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {items === null ? (
        <SkeletonCard />
      ) : (
        <div className="border border-[var(--border-subtle)] rounded-[12px] overflow-hidden bg-[var(--bg-primary)]">
          <div className="grid grid-cols-7 border-b border-[var(--border-subtle)]">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="px-3 py-2 text-[11px] uppercase tracking-[0.12em] font-semibold text-[var(--text-tertiary)] text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              const key = cell.date.toISOString().slice(0, 10)
              const dues = dueByDay.get(key) ?? []
              const today = isToday(cell.date)
              return (
                <button
                  key={i}
                  onClick={() => {
                    // Drop the user into MyTasks; the canonical day filter
                    // belongs there. Append the date as a hint.
                    navigate(`/my-tasks?due=${key}`)
                  }}
                  className={`min-h-[88px] text-left p-2 border-b border-r border-[var(--border-subtle)] transition-colors ${
                    cell.muted ? 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)]' : 'hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[12px] tabular-nums font-semibold ${today ? 'text-[var(--color-brand)]' : ''}`}>
                      {cell.date.getDate()}
                    </span>
                    {dues.length > 0 && (
                      <span className="text-[10px] font-bold tabular-nums px-1.5 rounded-full bg-[var(--accent-teal-subtle)] text-[var(--color-brand)]">
                        {dues.length}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {dues.slice(0, 4).map(a => (
                      <span
                        key={a.id}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background:
                            a.status === 'approved' ? 'var(--status-ok)'
                            : a.status === 'submitted' || a.status === 'reviewed' ? 'var(--status-pending)'
                            : a.status === 'rejected' ? 'var(--status-reject)'
                            : 'var(--color-brand)',
                        }}
                        title={`${a.gri_code} · ${a.line_item}`}
                      />
                    ))}
                    {dues.length > 4 && (
                      <span className="text-[9.5px] text-[var(--text-tertiary)]">+{dues.length - 4}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function buildMonth(monthStart: Date): Array<{ date: Date; muted: boolean }> {
  // ISO weeks (Mon-first). Build a 6x7 grid that pads before/after.
  const first = new Date(monthStart)
  first.setDate(1); first.setHours(0, 0, 0, 0)
  const dayIdx = (first.getDay() + 6) % 7 // 0=Mon
  const start = new Date(first); start.setDate(1 - dayIdx)
  const cells: Array<{ date: Date; muted: boolean }> = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i)
    cells.push({ date: d, muted: d.getMonth() !== first.getMonth() })
  }
  return cells
}

function isToday(d: Date): boolean {
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}
