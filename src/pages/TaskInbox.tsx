import { useState } from 'react'
import {
  CheckSquare, Clock, AlertCircle, Filter, Search,
  ChevronRight, CornerDownRight, MessageSquare, Tag, Inbox,
} from 'lucide-react'
import clsx from 'clsx'
import { PageHeader, Card, CardHeader, Button, Badge, Tabs, EmptyState, inputClass, Tone } from '../components/ui'
import { fmt, useStrings } from '../i18n'
import { taskInboxStrings } from '../i18n/pages/taskInbox'

type TaskId = 'TASK-1049' | 'TASK-1048' | 'TASK-1045' | 'TASK-1042'
type ModuleKey = 'gri' | 'connectors' | 'dma' | 'settings'

const INBOX_TASKS: { id: TaskId; module: ModuleKey; priority: 'high' | 'medium' | 'low'; status: 'pending' | 'completed'; type: 'review' | 'upload' | 'approval' | 'system'; urgent?: boolean }[] = [
  { id: 'TASK-1049', module: 'gri', priority: 'high', status: 'pending', type: 'review', urgent: true },
  { id: 'TASK-1048', module: 'connectors', priority: 'medium', status: 'pending', type: 'upload', urgent: true },
  { id: 'TASK-1045', module: 'dma', priority: 'high', status: 'pending', type: 'approval' },
  { id: 'TASK-1042', module: 'settings', priority: 'low', status: 'pending', type: 'system' },
]

const PRIORITY_TONE: Record<string, Tone> = { high: 'danger', medium: 'warning', low: 'neutral' }

const TYPE_ICON = {
  review: { icon: AlertCircle, cls: 'text-rose-500' },
  upload: { icon: CornerDownRight, cls: 'text-sky-600' },
  approval: { icon: CheckSquare, cls: 'text-emerald-600' },
  system: { icon: Tag, cls: 'text-zinc-500' },
}

export default function TaskInbox() {
  const s = useStrings(taskInboxStrings)
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending')
  const [searchQuery, setSearchQuery] = useState('')

  const pendingCount = INBOX_TASKS.filter(t => t.status === 'pending').length
  const q = searchQuery.toLowerCase()
  const visible = INBOX_TASKS.filter(task => {
    const matchesTab = activeTab === 'pending' ? task.status === 'pending' : task.status === 'completed'
    const text = s.tasks[task.id]
    const matchesSearch = text.title.toLowerCase().includes(q) || s.modules[task.module].toLowerCase().includes(q) || task.id.toLowerCase().includes(q)
    return matchesTab && matchesSearch
  })

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
                type="text"
                placeholder={s.searchPlaceholder}
                aria-label={s.searchLabel}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={clsx(inputClass, 'pl-9')}
              />
            </div>
            <Button icon={Filter}>{s.filter}</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
        <Card padded={false} className="overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-line">
            <Tabs
              value={activeTab}
              onChange={setActiveTab}
              items={[
                { value: 'pending', label: s.tabs.pending, count: pendingCount },
                { value: 'completed', label: s.tabs.completed, count: 0 },
              ]}
            />
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={activeTab === 'pending' ? s.emptyPendingTitle : s.emptyCompletedTitle}
              description={activeTab === 'pending' ? s.emptyPendingDesc : s.emptyCompletedDesc}
            />
          ) : (
            <ul className="divide-y divide-line">
              {visible.map(task => {
                const text = s.tasks[task.id]
                const { icon: TypeIcon, cls } = TYPE_ICON[task.type]
                return (
                  <li key={task.id} className="group flex items-start sm:items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 hover:bg-zinc-50/70 transition-colors cursor-pointer">
                    <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0" title={s.type[task.type]}>
                      <TypeIcon className={clsx('w-4 h-4', cls)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="text-sm font-medium text-zinc-900 min-w-0">{text.title}</h3>
                        <Badge tone={PRIORITY_TONE[task.priority]}>{s.priority[task.priority]}</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-zinc-500">
                        <span className="font-mono text-xs text-zinc-400">{task.id}</span>
                        <span>{fmt(s.module, { name: s.modules[task.module] })}</span>
                        <span className={clsx('inline-flex items-center gap-1', task.urgent ? 'text-rose-600' : 'text-zinc-500')}>
                          <Clock className="w-3.5 h-3.5" /> {fmt(s.due, { date: text.due })}
                        </span>
                        <span className="hidden md:inline">{fmt(s.assignedBy, { name: text.from })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                      <button type="button" aria-label={s.comment} title={s.comment} className="hidden sm:inline-flex w-8 h-8 rounded-lg hover:bg-zinc-100 items-center justify-center text-zinc-500 transition-colors">
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button type="button" aria-label={s.open} title={s.open} className="w-8 h-8 rounded-lg bg-zinc-900 text-white inline-flex items-center justify-center hover:bg-zinc-800 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <div className="hidden xl:flex flex-col gap-6">
          <Card>
            <CardHeader icon={Clock} title={s.upcoming} className="mb-4" />
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-medium text-zinc-500">{s.today}</span>
                <div className="text-sm font-medium text-zinc-900 border-l-2 border-rose-500 pl-3">{s.deadlines.scope3}</div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-zinc-500">{s.tomorrow}</span>
                <div className="text-sm font-medium text-zinc-900 border-l-2 border-amber-500 pl-3">{s.deadlines.omanRail}</div>
              </div>
            </div>
          </Card>

          <Card className="text-center">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl mx-auto mb-3 flex items-center justify-center">
              <CheckSquare className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-zinc-900">{s.inboxZero}</h4>
            <p className="text-[13px] text-zinc-500 mt-1">{fmt(s.inboxZeroBody, { count: pendingCount })}</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
