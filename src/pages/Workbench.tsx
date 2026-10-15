import { ReactNode, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle, Clock3, Filter, Inbox, Search, Target, Users, MessageSquare, ThumbsUp, XCircle, Info, ExternalLink, ArrowRight, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import { PageHeader, Card, CardHeader, Button, Badge, StatCard, Progress, Tabs, EmptyState, inputClass, tableClass, Tone } from '../components/ui'
import { fmt, useFormat, useStrings } from '../i18n'
import { workbenchStrings } from '../i18n/pages/workbench'
import { useFrameworkLabels } from '../i18n/pages/moduleCatalog'
import { useMockData, useWorkspace } from '../workspace/WorkspaceContext'
import { useToast } from '../components/useToast'

type TaskFilter = 'all' | 'mine' | 'critical' | 'due_soon'
type ViewMode = 'tasks' | 'dma' | 'reviews'

const currentUserDid = 'did:ethr:0x1234...5678'

/*
 * Disclosure references per framework. GRI uses disclosure numbers; the
 * mainland exchange guidelines (CN-SSE) are cited by disclosure topic
 * (article numbers are deliberately not hardcoded). Frameworks
 * without a mapping fall back to the GRI crosswalk, prefixed with "GRI".
 */
type DisclosureRefs = { GRI: string[]; article?: string[] }

const DMA_ROWS: { topic: 'climate' | 'energy' | 'ohs' | 'dei' | 'ethics'; refs: DisclosureRefs; owner: 'sustainability' | 'operations' | 'hrSafety' | 'hr' | 'legal'; status: string }[] = [
  { topic: 'climate', refs: { GRI: ['305-1', '305-2', '305-3'], article: ['climate'] }, owner: 'sustainability', status: 'Approved' },
  { topic: 'energy', refs: { GRI: ['302-1', '302-4'], article: ['resources'] }, owner: 'operations', status: 'In Review' },
  { topic: 'ohs', refs: { GRI: ['403-9', '403-10'], article: ['employees'] }, owner: 'hrSafety', status: 'Approved' },
  { topic: 'dei', refs: { GRI: ['405-1', '405-2'], article: ['employees'] }, owner: 'hr', status: 'Pending Owner' },
  { topic: 'ethics', refs: { GRI: ['205-1', '205-3'], article: ['ethics'] }, owner: 'legal', status: 'Draft' },
]

/** Frameworks whose disclosures are cited by article number rather than GRI-style codes. */
const ARTICLE_FRAMEWORKS = new Set(['CN-SSE'])

// Demo reviewers per region; review rows reference them as "#0", "#1", "#2".
const PEOPLE: Record<string, string[]> = { global: ['Jane Doe', 'John Smith', 'Sarah Lee'], cn: ['王芳', '李明', '陈静'] }

// submitter / reviewer: "#n" (regional demo person), or an owner key prefixed with "@"
const REVIEW_ROWS: { id: string; refs: DisclosureRefs; module: 'scope1' | 'scope2' | 'injuries' | 'governance'; submitter: string; submitted: string; reviewer: string; status: string; comments: number }[] = [
  { id: 'R1', refs: { GRI: ['305-1'], article: ['climate'] }, module: 'scope1', submitter: '#0', submitted: '2025-11-28', reviewer: '@you', status: 'Pending Review', comments: 2 },
  { id: 'R2', refs: { GRI: ['305-2'], article: ['climate'] }, module: 'scope2', submitter: '#1', submitted: '2025-11-27', reviewer: '@you', status: 'Pending Review', comments: 0 },
  { id: 'R3', refs: { GRI: ['403-9'], article: ['employees'] }, module: 'injuries', submitter: '@safetyTeam', submitted: '2025-11-26', reviewer: '#2', status: 'In Rework', comments: 5 },
  { id: 'R4', refs: { GRI: ['405-1'], article: ['employees'] }, module: 'governance', submitter: '@hrTeam', submitted: '2025-11-25', reviewer: '@you', status: 'Approved', comments: 1 },
]

const STATUS_TONE: Record<string, Tone> = {
  Approved: 'success',
  'In Review': 'info',
  'Pending Review': 'info',
  'Pending Owner': 'warning',
  'In Rework': 'warning',
  Draft: 'neutral',
}
const PRIORITY_TONE: Record<string, Tone> = { high: 'danger', medium: 'warning', low: 'neutral' }

function RuleNote({ title, body }: { title: ReactNode; body: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-card border border-line bg-zinc-50/80 p-4">
      <Info className="w-4 h-4 mt-0.5 shrink-0 text-zinc-500" />
      <div>
        <p className="text-[13px] font-medium text-zinc-900">{title}</p>
        <p className="text-[13px] text-zinc-500 mt-0.5 leading-relaxed">{body}</p>
      </div>
    </div>
  )
}

export default function Workbench() {
  const s = useStrings(workbenchStrings)
  const f = useFormat()
  const fw = useFrameworkLabels()
  const navigate = useNavigate()
  const mockData = useMockData()
  const { region } = useWorkspace()
  const { toast, show } = useToast()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('tasks')
  const [completed, setCompleted] = useState<Set<string>>(() => new Set())
  const [reviewStatus, setReviewStatus] = useState<Record<string, string>>({})

  const tasks = mockData.moduleTasks
  const moduleById = useMemo(() => new Map(mockData.modules.map(m => [m.id, m])), [mockData])

  // Primary framework for the materiality map: first regional framework the tenant runs.
  const primaryFw = useMemo(
    () => region.frameworks.find(id => moduleById.has(id)) ?? mockData.modules[0]?.id ?? region.frameworks[0] ?? 'GRI',
    [region.frameworks, moduleById, mockData],
  )
  const citeArticles = ARTICLE_FRAMEWORKS.has(primaryFw)
  const refList = (refs: DisclosureRefs) =>
    citeArticles && refs.article ? refs.article.map(a => s.sseTopics[a] ?? a).join(s.listSep) : (primaryFw === 'GRI' ? refs.GRI : refs.GRI.map(c => `GRI ${c}`)).join(', ')
  const disclosureTitle = (refs: DisclosureRefs) =>
    citeArticles && refs.article ? `${fw.short(primaryFw)} · ${s.sseTopics[refs.article[0]] ?? refs.article[0]}` : `GRI ${refs.GRI[0]}`

  const filteredTasks = useMemo(() => {
    const now = new Date()
    return tasks.filter(task => {
      if (search) {
        const term = search.toLowerCase()
        if (
          !(
            task.title.toLowerCase().includes(term) ||
            task.description.toLowerCase().includes(term) ||
            task.moduleId.toLowerCase().includes(term) ||
            fw.short(task.moduleId).toLowerCase().includes(term) ||
            task.id.toLowerCase().includes(term)
          )
        ) {
          return false
        }
      }

      if (filter === 'mine' && task.assignee !== currentUserDid) return false
      if (filter === 'critical' && task.priority !== 'high') return false
      if (filter === 'due_soon') {
        if (!task.dueDate) return false
        const due = new Date(task.dueDate)
        const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        if (diffDays > 7) return false
      }

      return true
    })
  }, [tasks, search, filter, fw])

  const criticalCount = tasks.filter(t => t.priority === 'high').length
  const dueSoonCount = tasks.filter(t => {
    if (!t.dueDate) return false
    const diffDays = (new Date(t.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return diffDays >= 0 && diffDays <= 7
  }).length
  const myTasksCount = tasks.filter(t => t.assignee === currentUserDid).length
  const readyCount = mockData.modules.filter(m => m.state === 'Approved').length

  const statusLabel = (st: string) => s.status[st as keyof typeof s.status] ?? st
  const people = PEOPLE[region.id] ?? PEOPLE.global
  const person = (v: string) =>
    v.startsWith('@') ? s.owners[v.slice(1) as keyof typeof s.owners] ?? v.slice(1) : v.startsWith('#') ? people[Number(v.slice(1))] ?? v : v

  const reviewRows = REVIEW_ROWS.map(r => ({ ...r, status: reviewStatus[r.id] ?? r.status }))
  const reviewCounts = {
    pending: 5 + reviewRows.filter(r => r.status === 'Pending Review').length,
    rework: 2 + reviewRows.filter(r => r.status === 'In Rework').length,
    approved: 23 + reviewRows.filter(r => r.status === 'Approved').length,
  }
  const decide = (id: string, status: 'Approved' | 'In Rework') => {
    setReviewStatus(prev => ({ ...prev, [id]: status }))
    show(status === 'Approved' ? s.approvedToast : s.reworkToast, status === 'Approved' ? 'success' : 'info')
  }
  const toggleComplete = (id: string) => {
    const done = completed.has(id)
    setCompleted(prev => {
      const next = new Set(prev)
      if (done) next.delete(id)
      else next.add(id)
      return next
    })
    show(done ? s.reopenedToast : s.completedToast, done ? 'info' : 'success')
  }

  const filterChips: { id: TaskFilter; label: string; count?: number; icon: typeof Inbox }[] = [
    { id: 'all', label: s.filters.all, icon: Inbox },
    { id: 'mine', label: s.filters.mine, count: myTasksCount, icon: Filter },
    { id: 'critical', label: s.filters.critical, count: criticalCount, icon: AlertTriangle },
    { id: 'due_soon', label: s.filters.dueSoon, count: dueSoonCount, icon: Clock3 },
  ]

  return (
    <div className="space-y-6">
      {toast}
      <PageHeader
        title={s.title}
        description={s.description}
        actions={
          <>
            <Badge tone="success" icon={CheckCircle}>{fmt(s.readyToPublish, { count: readyCount })}</Badge>
            <Badge tone="warning" icon={AlertTriangle}>{fmt(s.criticalGaps, { count: criticalCount })}</Badge>
          </>
        }
      />

      <Tabs<ViewMode>
        value={viewMode}
        onChange={setViewMode}
        items={[
          { value: 'tasks', label: <><Inbox className="w-4 h-4" />{s.views.tasks}</> },
          { value: 'dma', label: <><Target className="w-4 h-4" />{s.views.dma}</> },
          { value: 'reviews', label: <><Users className="w-4 h-4" />{s.views.reviews}</> },
        ]}
      />

      {/* DMA / Materiality View */}
      {viewMode === 'dma' && (
        <div className="space-y-6">
          <Card>
            <CardHeader
              icon={Target}
              title={s.dmaTitle}
              description={s.dmaDesc}
              action={<Button size="sm" variant="ghost" iconRight={ArrowRight} onClick={() => navigate('/dma')}>{s.openDma}</Button>}
            />
            <div className="flex items-center gap-3">
              <Progress value={78} className="flex-1" />
              <Badge tone="info" dot>{fmt(s.dmaStatus, { pct: f.percent(78) })}</Badge>
            </div>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label={s.topicsIdentified} value="14" unit="/ 18" />
            <StatCard label={s.ownershipAssigned} value="12" unit="/ 14" />
            <StatCard label={s.dmaApproved} value="8" unit="/ 14" />
          </div>

          <Card>
            <CardHeader title={s.topicsTable} className="mb-4" />
            <div className={tableClass.wrap}>
              <table className={clsx(tableClass.table, 'min-w-[760px]')}>
                <thead>
                  <tr>
                    <th className={tableClass.th}>{s.colTopic}</th>
                    <th className={tableClass.th}>{s.colFramework}</th>
                    <th className={tableClass.th}>{s.colDisclosures}</th>
                    <th className={tableClass.th}>{s.colOwner}</th>
                    <th className={tableClass.th}>{s.colDmaStatus}</th>
                    <th className={clsx(tableClass.th, 'text-right')}>{s.colActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {DMA_ROWS.map(row => (
                    <tr key={row.topic} className={tableClass.tr}>
                      <td className={clsx(tableClass.td, 'font-medium text-zinc-900 min-w-[200px]')}>{s.topics[row.topic]}</td>
                      <td className={clsx(tableClass.td, 'whitespace-nowrap')}><Badge>{fw.short(primaryFw)}</Badge></td>
                      <td className={clsx(tableClass.td, 'font-mono text-xs whitespace-nowrap')}>{refList(row.refs)}</td>
                      <td className={clsx(tableClass.td, 'whitespace-nowrap')}>{s.owners[row.owner]}</td>
                      <td className={tableClass.td}><Badge tone={STATUS_TONE[row.status]} dot>{statusLabel(row.status)}</Badge></td>
                      <td className={clsx(tableClass.td, 'text-right')}>
                        <Button size="sm" variant="ghost" onClick={() => navigate('/dma')}>{s.editMapping}</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <RuleNote title={s.gate1Title} body={s.gate1Body} />
        </div>
      )}

      {/* Reviews & Approvals View */}
      {viewMode === 'reviews' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label={s.pendingReview} value={f.number(reviewCounts.pending)} />
            <StatCard label={s.inRework} value={f.number(reviewCounts.rework)} />
            <StatCard label={s.approved} value={f.number(reviewCounts.approved)} />
            <StatCard label={s.avgCycle} value={f.number(3.2)} unit={s.daysUnit} />
          </div>

          <Card>
            <CardHeader title={s.reviewsTitle} description={s.reviewsDesc} className="mb-4" />
            <div className={tableClass.wrap}>
              <table className={clsx(tableClass.table, 'min-w-[820px]')}>
                <thead>
                  <tr>
                    <th className={tableClass.th}>{s.colDisclosure}</th>
                    <th className={tableClass.th}>{s.colSubmitter}</th>
                    <th className={tableClass.th}>{s.colSubmitted}</th>
                    <th className={tableClass.th}>{s.colReviewer}</th>
                    <th className={tableClass.th}>{s.colStatus}</th>
                    <th className={clsx(tableClass.th, 'text-right')}>{s.colActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewRows.map(row => (
                    <tr key={row.id} className={tableClass.tr}>
                      <td className={clsx(tableClass.td, 'min-w-[180px]')}>
                        <div className="font-medium text-zinc-900">{disclosureTitle(row.refs)}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{s.reviewModules[row.module]}</div>
                      </td>
                      <td className={clsx(tableClass.td, 'whitespace-nowrap')}>{person(row.submitter)}</td>
                      <td className={clsx(tableClass.td, 'whitespace-nowrap tabular text-[13px]')}>{f.date(row.submitted)}</td>
                      <td className={clsx(tableClass.td, 'whitespace-nowrap')}>{person(row.reviewer)}</td>
                      <td className={clsx(tableClass.td, 'whitespace-nowrap')}>
                        <Badge tone={STATUS_TONE[row.status]} dot>{statusLabel(row.status)}</Badge>
                        {row.comments > 0 && (
                          <span className="ml-2 text-xs text-zinc-500 inline-flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {fmt(s.comments, { count: row.comments })}
                          </span>
                        )}
                      </td>
                      <td className={clsx(tableClass.td, 'text-right whitespace-nowrap')}>
                        {row.status === 'Pending Review' ? (
                          <div className="inline-flex items-center gap-1">
                            <IconAction label={s.comment} icon={MessageSquare} onClick={() => navigate(`/modules/${encodeURIComponent(primaryFw)}/review`)} />
                            <IconAction label={s.approve} icon={ThumbsUp} className="hover:text-emerald-600" onClick={() => decide(row.id, 'Approved')} />
                            <IconAction label={s.requestRework} icon={XCircle} className="hover:text-rose-600" onClick={() => decide(row.id, 'In Rework')} />
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/modules/${encodeURIComponent(primaryFw)}/review`)}>{s.view}</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <RuleNote title={s.gate2Title} body={s.gate2Body} />
        </div>
      )}

      {/* Task table (default view) */}
      {viewMode === 'tasks' && (
        <Card>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {filterChips.map(chip => {
                const Icon = chip.icon
                const active = filter === chip.id
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setFilter(chip.id)}
                    aria-pressed={active}
                    className={clsx(
                      'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium border transition-colors',
                      active ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-line text-zinc-600 hover:text-zinc-900 hover:border-zinc-300',
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {chip.label}
                    {chip.count !== undefined && <span className={clsx('tabular text-xs', active ? 'text-white/60' : 'text-zinc-400')}>{chip.count}</span>}
                  </button>
                )
              })}
            </div>
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder={s.searchPlaceholder}
                aria-label={s.searchLabel}
                className={clsx(inputClass, 'pl-9')}
              />
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={s.emptyTitle}
              description={s.emptyDesc}
              action={<Button size="sm" onClick={() => { setFilter('all'); setSearch('') }}>{s.clearFilters}</Button>}
            />
          ) : (
            <div className={tableClass.wrap}>
              <table className={clsx(tableClass.table, 'min-w-[900px]')}>
                <thead>
                  <tr>
                    <th className={tableClass.th}>{s.colTask}</th>
                    <th className={tableClass.th}>{s.colModule}</th>
                    <th className={tableClass.th}>{s.colType}</th>
                    <th className={tableClass.th}>{s.colAssignee}</th>
                    <th className={tableClass.th}>{s.colDue}</th>
                    <th className={tableClass.th}>{s.colPriority}</th>
                    <th className={clsx(tableClass.th, 'text-right')}>{s.colActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map(task => {
                    const module = moduleById.get(task.moduleId)
                    const done = completed.has(task.id)
                    const moduleTitle = fw.title(task.moduleId, module?.title)
                    const moduleShort = fw.short(task.moduleId, module?.title)
                    return (
                      <tr key={task.id} className={clsx(tableClass.tr, 'align-top', done && 'opacity-60')}>
                        <td className={clsx(tableClass.td, 'align-top min-w-[260px] max-w-[360px]')}>
                          <div className={clsx('font-medium text-zinc-900', done && 'line-through decoration-zinc-400')}>{task.title}</div>
                          <div className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{task.description}</div>
                        </td>
                        <td className={clsx(tableClass.td, 'align-top whitespace-nowrap')}>
                          <Badge>{moduleShort}</Badge>
                          {moduleTitle !== moduleShort && <div className="mt-1 text-xs text-zinc-500 max-w-[200px] truncate" title={moduleTitle}>{moduleTitle}</div>}
                        </td>
                        <td className={clsx(tableClass.td, 'align-top whitespace-nowrap')}>
                          <span className="text-[13px] text-zinc-700">{s.type[task.type as keyof typeof s.type] ?? task.type}</span>
                        </td>
                        <td className={clsx(tableClass.td, 'align-top')}>
                          <span className="font-mono text-xs text-zinc-600 whitespace-nowrap">{task.assignee}</span>
                        </td>
                        <td className={clsx(tableClass.td, 'align-top whitespace-nowrap')}>
                          <span className="inline-flex items-center gap-1 text-[13px] tabular">
                            <Clock3 className="w-3.5 h-3.5 text-zinc-400" />
                            {task.dueDate ? f.date(task.dueDate) : '—'}
                          </span>
                        </td>
                        <td className={clsx(tableClass.td, 'align-top whitespace-nowrap')}>
                          {done ? (
                            <Badge tone="success" icon={CheckCircle}>{s.done}</Badge>
                          ) : (
                            <Badge tone={PRIORITY_TONE[task.priority] ?? 'neutral'}>{s.priority[task.priority as keyof typeof s.priority] ?? task.priority}</Badge>
                          )}
                        </td>
                        <td className={clsx(tableClass.td, 'align-top text-right whitespace-nowrap')}>
                          <div className="inline-flex items-center gap-0.5">
                            <IconAction
                              label={s.openDisclosure}
                              icon={ExternalLink}
                              onClick={() => navigate(module ? `/modules/${encodeURIComponent(task.moduleId)}/questionnaire` : '/modules')}
                            />
                            <IconAction
                              label={done ? s.reopen : s.markComplete}
                              icon={done ? RotateCcw : CheckCircle}
                              className={done ? 'text-emerald-600' : 'hover:text-emerald-600'}
                              pressed={done}
                              onClick={() => toggleComplete(task.id)}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

function IconAction({ label, icon: Icon, className, onClick, pressed }: { label: string; icon: typeof Inbox; className?: string; onClick?: () => void; pressed?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={clsx('w-8 h-8 inline-flex items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 transition-colors', className)}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}
