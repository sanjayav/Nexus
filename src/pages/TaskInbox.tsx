import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckSquare, Clock, AlertCircle, Filter, Search, Check, RotateCcw,
  ChevronRight, CornerDownRight, MessageSquare, Tag, Inbox, ShieldCheck,
} from 'lucide-react'
import clsx from 'clsx'
import { PageHeader, Card, CardHeader, Button, Badge, Tabs, EmptyState, inputClass, Tone } from '../components/ui'
import { fmt, useFormat, useStrings } from '../i18n'
import { taskInboxStrings } from '../i18n/pages/taskInbox'
import { useFrameworkLabels } from '../i18n/pages/moduleCatalog'
import { useMockData, useWorkspace } from '../workspace/WorkspaceContext'
import { useToast } from '../components/useToast'

type Priority = 'high' | 'medium' | 'low'
type PlatformKey = 'scope3' | 'utilities' | 'dma' | 'connector' | 'boundary'

interface InboxTask {
  id: string
  title: string
  description?: string
  from: string
  /** Framework module id (data-driven tasks) … */
  moduleId?: string
  /** … or a platform area key for built-in tasks. */
  area?: string
  type: string
  priority: Priority
  /** Days from today; negative = overdue. */
  dueOffset: number
  dueHour: number
  route: string
  initiallyDone?: boolean
}

/** Built-in platform tasks; titles come from the region-specific dictionary block. */
const PLATFORM_TASKS: { key: PlatformKey; id: string; area: string; type: string; priority: Priority; dueOffset: number; dueHour: number; route: string; done?: boolean }[] = [
  { key: 'scope3', id: 'TASK-1049', area: 'ghg', type: 'review', priority: 'high', dueOffset: 0, dueHour: 17, route: '/scope3' },
  { key: 'utilities', id: 'TASK-1048', area: 'evidence', type: 'upload', priority: 'medium', dueOffset: 1, dueHour: 10, route: '/evidence' },
  { key: 'dma', id: 'TASK-1045', area: 'dma', type: 'approval', priority: 'high', dueOffset: 4, dueHour: 18, route: '/dma' },
  { key: 'connector', id: 'TASK-1042', area: 'connectors', type: 'system', priority: 'low', dueOffset: 8, dueHour: 12, route: '/connectors' },
  { key: 'boundary', id: 'TASK-1037', area: 'settings', type: 'approval', priority: 'medium', dueOffset: -3, dueHour: 12, route: '/admin/organization', done: true },
]

/** Deterministic spread of due dates for tenant module tasks. */
const MODULE_OFFSETS = [2, 3, 6, 10, 13]

const PRIORITY_TONE: Record<string, Tone> = { high: 'danger', medium: 'warning', low: 'neutral' }
const PRIORITY_BORDER: Record<string, string> = { high: 'border-rose-500', medium: 'border-amber-500', low: 'border-zinc-300' }
const PRIORITIES: Priority[] = ['high', 'medium', 'low']

const TYPE_ICON: Record<string, { icon: typeof AlertCircle; cls: string }> = {
  review: { icon: AlertCircle, cls: 'text-rose-500' },
  upload: { icon: CornerDownRight, cls: 'text-sky-600' },
  approval: { icon: CheckSquare, cls: 'text-emerald-600' },
  system: { icon: Tag, cls: 'text-zinc-500' },
  validation: { icon: ShieldCheck, cls: 'text-amber-600' },
}

/** Use the tenant's own due date when it is current (within ~6 weeks of today); stale demo dates fall back to a relative spread. */
function dataOffset(due?: string): number | undefined {
  if (!due) return undefined
  const d = new Date(`${due}T00:00:00`)
  if (isNaN(d.getTime())) return undefined
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((d.getTime() - today.getTime()) / 86_400_000)
  return Math.abs(days) <= 45 ? days : undefined
}

const asPriority = (p: string): Priority => (p === 'high' || p === 'low' ? p : 'medium')

export default function TaskInbox() {
  const { workspace } = useWorkspace()
  return <TaskInboxView key={workspace.id} />
}

function TaskInboxView() {
  const s = useStrings(taskInboxStrings)
  const f = useFormat()
  const fw = useFrameworkLabels()
  const navigate = useNavigate()
  const { workspace, region } = useWorkspace()
  const mockData = useMockData()
  const { toast, show } = useToast()

  const tasks = useMemo<InboxTask[]>(() => {
    const copy = s.platformTasks[region.id] ?? s.platformTasks.global
    const platform: InboxTask[] = PLATFORM_TASKS.map(t => ({
      id: t.id,
      title: fmt(copy[t.key].title, { year: workspace.reportingYear }),
      from: copy[t.key].from,
      area: t.area,
      type: t.type,
      priority: t.priority,
      dueOffset: t.dueOffset,
      dueHour: t.dueHour,
      route: t.route,
      initiallyDone: t.done,
    }))
    const fromModules: InboxTask[] = (mockData.moduleTasks ?? []).map((t, i) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      from: s.fromWorkflow,
      moduleId: t.moduleId,
      type: t.type,
      priority: asPriority(t.priority),
      dueOffset: dataOffset(t.dueDate) ?? MODULE_OFFSETS[i] ?? 14 + i * 3,
      dueHour: 18,
      route: t.type === 'review' ? `/modules/${t.moduleId}/review` : `/modules/${t.moduleId}/questionnaire`,
    }))
    return [...platform, ...fromModules].sort((a, b) => a.dueOffset - b.dueOffset)
  }, [s, region.id, workspace.reportingYear, mockData.moduleTasks])

  const [done, setDone] = useState<Set<string>>(() => new Set(tasks.filter(t => t.initiallyDone).map(t => t.id)))
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all')
  const [commentFor, setCommentFor] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const dueDate = (t: InboxTask) => {
    const d = new Date(today)
    d.setDate(d.getDate() + t.dueOffset)
    d.setHours(t.dueHour, 0, 0, 0)
    return d
  }
  const dueLabel = (t: InboxTask) => {
    const d = dueDate(t)
    const time = f.date(d, { timeStyle: 'short' })
    if (t.dueOffset === 0) return fmt(s.todayAt, { time })
    if (t.dueOffset === 1) return fmt(s.tomorrowAt, { time })
    return f.date(d, { dateStyle: 'medium' })
  }
  const moduleLabel = (t: InboxTask) =>
    t.moduleId ? fw.short(t.moduleId, mockData.modules.find(m => m.id === t.moduleId)?.title) : s.modules[t.area ?? ''] ?? t.area ?? ''

  const pending = tasks.filter(t => !done.has(t.id))
  const completed = tasks.filter(t => done.has(t.id))
  const q = searchQuery.trim().toLowerCase()
  const filtersActive = q !== '' || priorityFilter !== 'all'
  const visible = (activeTab === 'pending' ? pending : completed).filter(task => {
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false
    if (!q) return true
    return [task.title, task.description ?? '', moduleLabel(task), task.id, task.from].some(v => v.toLowerCase().includes(q))
  })
  const upcoming = pending.filter(t => t.dueOffset <= 7).slice(0, 3)

  const toggleDone = (t: InboxTask) => {
    const wasDone = done.has(t.id)
    setDone(prev => {
      const next = new Set(prev)
      if (wasDone) next.delete(t.id)
      else next.add(t.id)
      return next
    })
    if (commentFor === t.id) setCommentFor(null)
    show(fmt(wasDone ? s.reopenedToast : s.completedToast, { id: t.id }), wasDone ? 'info' : 'success')
  }

  const postComment = (id: string) => {
    setCommentFor(null)
    setCommentText('')
    show(fmt(s.commentPosted, { id }))
  }

  const clearFilters = () => {
    setSearchQuery('')
    setPriorityFilter('all')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.title}
        description={s.description}
        actions={
          <>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                type="search"
                placeholder={s.searchPlaceholder}
                aria-label={s.searchLabel}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={clsx(inputClass, 'pl-9')}
              />
            </div>
            <Button
              icon={Filter}
              aria-expanded={showFilters}
              variant={showFilters || priorityFilter !== 'all' ? 'primary' : 'secondary'}
              onClick={() => setShowFilters(v => !v)}
            >
              {s.filter}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
        <Card padded={false} className="overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-line space-y-3">
            <Tabs
              value={activeTab}
              onChange={setActiveTab}
              items={[
                { value: 'pending', label: s.tabs.pending, count: pending.length },
                { value: 'completed', label: s.tabs.completed, count: completed.length },
              ]}
            />
            {showFilters && (
              <div className="flex flex-wrap items-center gap-2 animate-fade-up" role="group" aria-label={s.filterLabel}>
                <span className="text-xs font-medium text-zinc-500 mr-1">{s.filterLabel}</span>
                {(['all', ...PRIORITIES] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={priorityFilter === p}
                    onClick={() => setPriorityFilter(p)}
                    className={clsx(
                      'h-7 px-2.5 rounded-lg text-xs font-medium border transition-colors',
                      priorityFilter === p ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-line hover:bg-zinc-50',
                    )}
                  >
                    {p === 'all' ? s.all : s.priority[p]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {visible.length === 0 ? (
            filtersActive ? (
              <EmptyState
                icon={Search}
                title={s.emptyPendingTitle}
                description={s.emptyPendingDesc}
                action={<Button size="sm" onClick={clearFilters}>{s.clearFilters}</Button>}
              />
            ) : activeTab === 'pending' ? (
              <EmptyState icon={CheckSquare} title={s.emptyClearTitle} description={s.emptyClearDesc} />
            ) : (
              <EmptyState icon={Inbox} title={s.emptyCompletedTitle} description={s.emptyCompletedDesc} />
            )
          ) : (
            <ul className="divide-y divide-line">
              {visible.map(task => {
                const { icon: TypeIcon, cls } = TYPE_ICON[task.type] ?? TYPE_ICON.system
                const isDone = done.has(task.id)
                const overdue = !isDone && task.dueOffset < 0
                const urgent = !isDone && task.dueOffset <= 1
                return (
                  <li key={task.id} className="group px-4 sm:px-5 py-4 hover:bg-zinc-50/70 transition-colors">
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                      <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0" title={s.type[task.type] ?? task.type}>
                        <TypeIcon className={clsx('w-4 h-4', isDone ? 'text-zinc-400' : cls)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <button
                            type="button"
                            onClick={() => navigate(task.route)}
                            className={clsx(
                              'text-left text-sm font-medium min-w-0 hover:underline underline-offset-2 focus-visible:outline-none focus-visible:underline',
                              isDone ? 'text-zinc-500 line-through decoration-zinc-300' : 'text-zinc-900',
                            )}
                          >
                            {task.title}
                          </button>
                          {!isDone && <Badge tone={PRIORITY_TONE[task.priority]}>{s.priority[task.priority]}</Badge>}
                        </div>
                        {task.description && <p className="text-[13px] text-zinc-500 mt-0.5 line-clamp-1">{task.description}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-zinc-500">
                          <span className="font-mono text-xs text-zinc-400">{task.id}</span>
                          <span>{fmt(s.module, { name: moduleLabel(task) })}</span>
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700">
                              <Check className="w-3.5 h-3.5" /> {s.completedOn}
                            </span>
                          ) : (
                            <span className={clsx('inline-flex items-center gap-1', urgent ? 'text-rose-600' : 'text-zinc-500')}>
                              <Clock className="w-3.5 h-3.5" />
                              {overdue ? fmt(s.overdue, { date: dueLabel(task) }) : fmt(s.due, { date: dueLabel(task) })}
                            </span>
                          )}
                          <span className="hidden md:inline">{fmt(s.assignedBy, { name: task.from })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                        {!isDone && (
                          <button
                            type="button"
                            aria-label={s.comment}
                            title={s.comment}
                            aria-expanded={commentFor === task.id}
                            onClick={() => {
                              setCommentFor(commentFor === task.id ? null : task.id)
                              setCommentText('')
                            }}
                            className="hidden sm:inline-flex w-8 h-8 rounded-lg hover:bg-zinc-100 items-center justify-center text-zinc-500 transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={isDone ? s.reopen : s.complete}
                          title={isDone ? s.reopen : s.complete}
                          onClick={() => toggleDone(task)}
                          className="w-8 h-8 rounded-lg hover:bg-zinc-100 inline-flex items-center justify-center text-zinc-500 hover:text-emerald-700 transition-colors"
                        >
                          {isDone ? <RotateCcw className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          aria-label={s.open}
                          title={s.open}
                          onClick={() => navigate(task.route)}
                          className="w-8 h-8 rounded-lg bg-zinc-900 text-white inline-flex items-center justify-center hover:bg-zinc-800 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {commentFor === task.id && (
                      <form
                        className="mt-3 sm:ml-[52px] flex flex-col sm:flex-row gap-2 animate-fade-up"
                        onSubmit={e => {
                          e.preventDefault()
                          if (commentText.trim()) postComment(task.id)
                        }}
                      >
                        <input
                          autoFocus
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          placeholder={s.commentPlaceholder}
                          aria-label={fmt(s.commentLabel, { id: task.id })}
                          className={inputClass}
                        />
                        <div className="flex gap-2 shrink-0">
                          <Button type="submit" size="md" variant="primary" disabled={!commentText.trim()}>{s.post}</Button>
                          <Button size="md" variant="ghost" onClick={() => setCommentFor(null)}>{s.cancel}</Button>
                        </div>
                      </form>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <div className="hidden xl:flex flex-col gap-6">
          <Card>
            <CardHeader icon={Clock} title={s.upcoming} className="mb-4" />
            {upcoming.length === 0 ? (
              <p className="text-[13px] text-zinc-500">{s.noUpcoming}</p>
            ) : (
              <div className="space-y-4">
                {upcoming.map(t => (
                  <button key={t.id} type="button" onClick={() => navigate(t.route)} className="block w-full text-left space-y-1 group/up">
                    <span className="text-xs font-medium text-zinc-500">
                      {t.dueOffset === 0 ? s.today : t.dueOffset === 1 ? s.tomorrow : f.date(dueDate(t), { dateStyle: 'medium' })}
                    </span>
                    <div className={clsx('text-sm font-medium text-zinc-900 border-l-2 pl-3 group-hover/up:underline underline-offset-2', PRIORITY_BORDER[t.priority])}>
                      {t.title}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className="text-center">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl mx-auto mb-3 flex items-center justify-center">
              <CheckSquare className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-zinc-900">{s.inboxZero}</h4>
            <p className="text-[13px] text-zinc-500 mt-1">{pending.length === 0 ? s.inboxZeroDone : fmt(s.inboxZeroBody, { count: pending.length })}</p>
          </Card>
        </div>
      </div>
      {toast}
    </div>
  )
}
