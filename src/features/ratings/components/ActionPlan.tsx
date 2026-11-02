import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ClipboardList, FilterX, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardHeader, EmptyState, Tabs, dotTone, ease, type Tone } from '@/components/ui'
import { useFormat, useStrings } from '@/lib/i18n'
import { toast } from '@/lib/hooks/useToast'
import { useL10n } from '@/features/workspace/WorkspaceContext'
import { daysUntil } from '@/config/regulatory'
import type { Person } from '@/features/access/AccessContext'
import type { ActionStatus, PlanAction, Rating } from '@/features/ratings/data'
import { ratingsStrings } from '@/features/ratings/ratings.strings'
import { compactSelect } from './useRatingDisplay'

type Filter = 'all' | ActionStatus
const STATUSES: ActionStatus[] = ['todo', 'doing', 'done']
const STATUS_TONE: Record<ActionStatus, Tone> = { todo: 'neutral', doing: 'info', done: 'success' }

export function ActionPlan({
  actions,
  ratings,
  people,
  freshId,
  onStatus,
  onOwner,
  onDue,
  onRemove,
}: {
  actions: PlanAction[]
  ratings: Rating[]
  people: Person[]
  freshId?: string
  onStatus: (id: string, status: ActionStatus) => void
  onOwner: (id: string, owner: string) => void
  onDue: (id: string, due: string) => void
  onRemove: (id: string) => void
}) {
  const s = useStrings(ratingsStrings)
  const l10n = useL10n()
  const [filter, setFilter] = useState<Filter>('all')
  const [agency, setAgency] = useState('all')

  const ratingName = useMemo(() => new Map(ratings.map(r => [r.id, l10n(r.name)])), [ratings, l10n])
  const byAgency = agency === 'all' ? actions : actions.filter(a => a.ratingId === agency)
  const counts = STATUSES.reduce(
    (acc, st) => ({ ...acc, [st]: byAgency.filter(a => a.status === st).length }),
    {} as Record<ActionStatus, number>,
  )
  const visible = filter === 'all' ? byAgency : byAgency.filter(a => a.status === filter)
  // Open items first, by due date; done items sink to the bottom.
  const sorted = [...visible].sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || a.due.localeCompare(b.due))

  const tabs = [
    { value: 'all' as Filter, label: s.plan.all, count: byAgency.length },
    ...STATUSES.map(st => ({ value: st as Filter, label: s.plan.status[st], count: counts[st] })),
  ]

  return (
    <Card>
      <CardHeader title={s.plan.title} description={s.plan.description} icon={ClipboardList} />

      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <Tabs items={tabs} value={filter} onChange={setFilter} />
        <label className="inline-flex items-center gap-2 text-[13px] text-zinc-500">
          <span className="sr-only sm:not-sr-only">{s.plan.agencyFilter}</span>
          <select value={agency} onChange={e => setAgency(e.target.value)} className={compactSelect} aria-label={s.plan.agencyFilter}>
            <option value="all">{s.plan.allAgencies}</option>
            {ratings.map(r => (
              <option key={r.id} value={r.id}>
                {l10n(r.name)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {actions.length === 0 ? (
        <EmptyState icon={ClipboardList} title={s.plan.emptyTitle} description={s.plan.emptyDesc} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={FilterX}
          title={s.plan.noMatchTitle}
          description={s.plan.noMatchDesc}
          action={
            <Button size="sm" onClick={() => (setFilter('all'), setAgency('all'))}>
              {s.plan.clearFilters}
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-line -mx-5 sm:-mx-6 border-t border-line">
          <AnimatePresence initial={false}>
            {sorted.map(a => (
              <ActionRow
                key={a.id}
                action={a}
                agencyName={ratingName.get(a.ratingId) ?? a.ratingId}
                people={people}
                fresh={a.id === freshId}
                onStatus={onStatus}
                onOwner={onOwner}
                onDue={onDue}
                onRemove={id => {
                  onRemove(id)
                  toast(s.plan.removedToast, 'info')
                }}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Card>
  )
}

function ActionRow({
  action: a,
  agencyName,
  people,
  fresh,
  onStatus,
  onOwner,
  onDue,
  onRemove,
}: {
  action: PlanAction
  agencyName: string
  people: Person[]
  fresh: boolean
  onStatus: (id: string, status: ActionStatus) => void
  onOwner: (id: string, owner: string) => void
  onDue: (id: string, due: string) => void
  onRemove: (id: string) => void
}) {
  const s = useStrings(ratingsStrings)
  const f = useFormat()
  const overdue = a.status !== 'done' && daysUntil(a.due) < 0
  const tone = STATUS_TONE[a.status]

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: -6, backgroundColor: fresh ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0)' }}
      animate={{ opacity: 1, y: 0, backgroundColor: 'rgba(16,185,129,0)' }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.24, ease: ease.out, backgroundColor: { duration: 1.4, ease: 'easeOut' } }}
      className="px-5 sm:px-6 py-3.5 flex flex-col gap-2.5 md:flex-row md:items-center md:gap-4"
    >
      <div className="min-w-0 flex-1">
        <div
          className={clsx(
            'text-sm font-medium leading-snug',
            a.status === 'done' ? 'text-zinc-500 line-through decoration-zinc-300' : 'text-zinc-900',
          )}
        >
          {a.title}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge>{agencyName}</Badge>
          {overdue && <Badge tone="danger">{s.plan.overdue}</Badge>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <label className="relative inline-flex items-center">
          <span className={clsx('absolute left-2.5 w-1.5 h-1.5 rounded-full pointer-events-none', dotTone[tone])} />
          <select
            value={a.status}
            onChange={e => onStatus(a.id, e.target.value as ActionStatus)}
            aria-label={s.plan.statusLabel}
            className={clsx(compactSelect, '!pl-6 w-auto')}
          >
            {STATUSES.map(st => (
              <option key={st} value={st}>
                {s.plan.status[st]}
              </option>
            ))}
          </select>
        </label>
        <select
          value={a.owner}
          onChange={e => onOwner(a.id, e.target.value)}
          aria-label={s.plan.owner}
          className={clsx(compactSelect, 'w-auto')}
        >
          {people.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={a.due}
          onChange={e => e.target.value && onDue(a.id, e.target.value)}
          aria-label={s.plan.due}
          title={f.date(a.due)}
          className={clsx(compactSelect, 'pr-2 w-[140px] tabular', overdue && 'text-rose-700')}
        />
        <button
          type="button"
          onClick={() => onRemove(a.id)}
          aria-label={s.plan.remove}
          title={s.plan.remove}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.li>
  )
}
