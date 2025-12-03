import { useMemo, useState } from 'react'
import { mockData } from '../data/mockData'
import { AlertTriangle, CheckCircle, Clock3, Filter, Inbox, Search, Target, Users, MessageSquare, ThumbsUp, XCircle } from 'lucide-react'
import clsx from 'clsx'

type TaskFilter = 'all' | 'mine' | 'critical' | 'due_soon'
type ViewMode = 'tasks' | 'dma' | 'reviews'

const currentUserDid = 'did:ethr:0x1234...5678'

export default function Workbench() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('tasks')

  const tasks = mockData.moduleTasks

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
  }, [tasks, search, filter])

  const criticalCount = tasks.filter(t => t.priority === 'high').length
  const dueSoonCount = tasks.filter(t => {
    if (!t.dueDate) return false
    const diffDays =
      (new Date(t.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return diffDays >= 0 && diffDays <= 7
  }).length
  const myTasksCount = tasks.filter(t => t.assignee === currentUserDid).length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Workbench</h1>
          <p className="text-sm text-gray-400">
            Central hub for tasks, DMA/materiality, reviews, and gap resolutions across all frameworks.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/40 px-3 py-1 text-emerald-300">
            <CheckCircle className="w-3.5 h-3.5" />
            Ready to publish: {mockData.modules.filter(m => m.state === 'Approved').length} modules
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/40 px-3 py-1 text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            Critical gaps: {criticalCount}
          </span>
        </div>
      </div>

      {/* View Mode tabs */}
      <div className="flex items-center gap-2 border-b border-dark-border">
        <button
          onClick={() => setViewMode('tasks')}
          className={clsx(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
            viewMode === 'tasks'
              ? 'border-accent text-accent'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          )}
        >
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4" />
            Tasks & Gaps
          </div>
        </button>
        <button
          onClick={() => setViewMode('dma')}
          className={clsx(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
            viewMode === 'dma'
              ? 'border-accent text-accent'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          )}
        >
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            DMA / Materiality
          </div>
        </button>
        <button
          onClick={() => setViewMode('reviews')}
          className={clsx(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
            viewMode === 'reviews'
              ? 'border-accent text-accent'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          )}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Review & Approvals
          </div>
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2 text-xs">
          <button
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5',
              filter === 'all'
                ? 'border-accent text-accent bg-accent/10'
                : 'border-dark-border text-gray-400 hover:border-gray-500'
            )}
            onClick={() => setFilter('all')}
          >
            <Inbox className="w-3.5 h-3.5" />
            All tasks
          </button>
          <button
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5',
              filter === 'mine'
                ? 'border-accent text-accent bg-accent/10'
                : 'border-dark-border text-gray-400 hover:border-gray-500'
            )}
            onClick={() => setFilter('mine')}
          >
            <Filter className="w-3.5 h-3.5" />
            My tasks ({myTasksCount})
          </button>
          <button
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5',
              filter === 'critical'
                ? 'border-red-500 text-red-300 bg-red-500/10'
                : 'border-dark-border text-gray-400 hover:border-gray-500'
            )}
            onClick={() => setFilter('critical')}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Critical ({criticalCount})
          </button>
          <button
            className={clsx(
              'hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5',
              filter === 'due_soon'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-dark-border text-gray-400 hover:border-gray-500'
            )}
            onClick={() => setFilter('due_soon')}
          >
            <Clock3 className="w-3.5 h-3.5" />
            Due this week ({dueSoonCount})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search by task, disclosure, module, or ID..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-dark-surface border border-dark-border text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
      </div>

      {/* DMA / Materiality View */}
      {viewMode === 'dma' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">DMA Gate 1 — Material Topics</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Identify, map, and assign ownership for material topics per framework pack
                </p>
              </div>
              <span className="px-4 py-2 bg-accent/10 text-accent border border-accent/40 rounded-xl text-sm font-medium">
                Status: In Progress (78%)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Material Topics Identified</p>
                <p className="text-2xl font-bold text-white">14 / 18</p>
              </div>
              <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Ownership Assigned</p>
                <p className="text-2xl font-bold text-white">12 / 14</p>
              </div>
              <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">DMA Approved</p>
                <p className="text-2xl font-bold text-white">8 / 14</p>
              </div>
            </div>
          </div>

          <div className="bg-dark-surface border border-dark-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-dark-bg border-b border-dark-border text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">Material Topic</th>
                  <th className="px-4 py-3 text-left">Framework</th>
                  <th className="px-4 py-3 text-left">Mapped Disclosures</th>
                  <th className="px-4 py-3 text-left">Owner</th>
                  <th className="px-4 py-3 text-left">DMA Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { topic: 'Climate Change & GHG Emissions', framework: 'GRI', disclosures: '305-1, 305-2, 305-3', owner: 'Sustainability Team', status: 'Approved' },
                  { topic: 'Energy Management', framework: 'GRI', disclosures: '302-1, 302-4', owner: 'Operations', status: 'In Review' },
                  { topic: 'Occupational Health & Safety', framework: 'GRI', disclosures: '403-9, 403-10', owner: 'HR / Safety', status: 'Approved' },
                  { topic: 'Diversity & Inclusion', framework: 'GRI', disclosures: '405-1, 405-2', owner: 'HR', status: 'Pending Owner' },
                  { topic: 'Business Ethics & Anti-Corruption', framework: 'GRI', disclosures: '205-1, 205-3', owner: 'Legal / Compliance', status: 'Draft' },
                ].map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-dark-border/60 hover:bg-dark-bg/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-white">{row.topic}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-blue-500/40 bg-blue-500/10 text-[11px] text-blue-300">
                        {row.framework}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300 font-mono">{row.disclosures}</td>
                    <td className="px-4 py-3 text-gray-300">{row.owner}</td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium',
                          row.status === 'Approved'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40'
                            : row.status === 'In Review'
                            ? 'bg-blue-500/10 text-blue-300 border border-blue-500/40'
                            : row.status === 'Pending Owner'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/40'
                            : 'bg-gray-500/10 text-gray-300 border border-gray-500/40'
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="px-3 py-1.5 rounded-full border border-dark-border text-xs text-gray-300 hover:border-accent hover:text-accent transition-colors">
                        Edit mapping
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-300">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Gate 1 Rule:</p>
                <p className="text-xs text-gray-400 mt-1">
                  Period cannot move to "Collection" until all material topics are identified, mapped to disclosures, ownership assigned, and DMA approved.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reviews & Approvals View */}
      {viewMode === 'reviews' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Gate 2 — Review & Approvals</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Approve submissions, resolve comments, and track approval chain
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Pending Review</p>
                <p className="text-2xl font-bold text-white">7</p>
              </div>
              <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">In Rework</p>
                <p className="text-2xl font-bold text-white">3</p>
              </div>
              <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Approved</p>
                <p className="text-2xl font-bold text-white">24</p>
              </div>
              <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Avg. Cycle Time</p>
                <p className="text-2xl font-bold text-white">3.2d</p>
              </div>
            </div>
          </div>

          <div className="bg-dark-surface border border-dark-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-dark-bg border-b border-dark-border text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">Disclosure</th>
                  <th className="px-4 py-3 text-left">Submitter</th>
                  <th className="px-4 py-3 text-left">Submitted</th>
                  <th className="px-4 py-3 text-left">Reviewer</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { disclosure: 'GRI 305-1', module: 'Scope 1 Emissions', submitter: 'Jane Doe', submitted: '2025-11-28', reviewer: 'You', status: 'Pending Review', comments: 2 },
                  { disclosure: 'GRI 305-2', module: 'Scope 2 Emissions', submitter: 'John Smith', submitted: '2025-11-27', reviewer: 'You', status: 'Pending Review', comments: 0 },
                  { disclosure: 'GRI 403-9', module: 'Work-related injuries', submitter: 'Safety Team', submitted: '2025-11-26', reviewer: 'Sarah Lee', status: 'In Rework', comments: 5 },
                  { disclosure: 'GRI 405-1', module: 'Diversity of governance bodies', submitter: 'HR Team', submitted: '2025-11-25', reviewer: 'You', status: 'Approved', comments: 1 },
                ].map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-dark-border/60 hover:bg-dark-bg/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{row.disclosure}</div>
                      <div className="text-xs text-gray-400 mt-1">{row.module}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{row.submitter}</td>
                    <td className="px-4 py-3 text-gray-300 text-xs">{row.submitted}</td>
                    <td className="px-4 py-3 text-gray-300">{row.reviewer}</td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium',
                          row.status === 'Approved'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40'
                            : row.status === 'Pending Review'
                            ? 'bg-blue-500/10 text-blue-300 border border-blue-500/40'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/40'
                        )}
                      >
                        {row.status}
                      </span>
                      {row.comments > 0 && (
                        <span className="ml-2 text-[11px] text-gray-400">
                          ({row.comments} comments)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        {row.status === 'Pending Review' && (
                          <>
                            <button className="p-1.5 rounded-full border border-dark-border text-gray-300 hover:border-blue-400 hover:text-blue-300 transition-colors" title="Comment">
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 rounded-full border border-dark-border text-gray-300 hover:border-emerald-400 hover:text-emerald-300 transition-colors" title="Approve">
                              <ThumbsUp className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 rounded-full border border-dark-border text-gray-300 hover:border-red-400 hover:text-red-300 transition-colors" title="Request rework">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {row.status !== 'Pending Review' && (
                          <button className="px-3 py-1.5 rounded-full border border-dark-border text-xs text-gray-300 hover:border-accent hover:text-accent transition-colors">
                            View
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Gate 2 Rule:</p>
                <p className="text-xs text-gray-400 mt-1">
                  Pack cannot be "Ready to Publish" if: missing required answers, missing required evidence, validation fails, or material topics incomplete.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task table (default view) */}
      {viewMode === 'tasks' && (
        <>
      <div className="bg-dark-surface border border-dark-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-dark-bg border-b border-dark-border text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left">Task</th>
              <th className="px-4 py-3 text-left">Module</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Assignee</th>
              <th className="px-4 py-3 text-left">Due</th>
              <th className="px-4 py-3 text-left">Priority</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map(task => {
              const module = mockData.modules.find(m => m.id === task.moduleId)
              const dueLabel = task.dueDate
                ? new Date(task.dueDate).toLocaleDateString()
                : '—'

              return (
                <tr
                  key={task.id}
                  className="border-b border-dark-border/60 hover:bg-dark-bg/40 transition-colors"
                >
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-white">{task.title}</div>
                    <div className="text-xs text-gray-400 mt-1">{task.description}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-blue-500/40 bg-blue-500/10 text-[11px] text-blue-300">
                      {task.moduleId}
                    </span>
                    {module && (
                      <div className="mt-1 text-xs text-gray-500">
                        {module.title}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-dark-border bg-dark-bg text-[11px] text-gray-300">
                      {task.type === 'validation' ? 'Validation' : 'Review'}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-mono text-xs text-gray-300">
                      {task.assignee}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-1 text-xs text-gray-300">
                      <Clock3 className="w-3.5 h-3.5" />
                      <span>{dueLabel}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium',
                        task.priority === 'high'
                          ? 'bg-red-500/10 text-red-300 border border-red-500/40'
                          : task.priority === 'medium'
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40'
                      )}
                    >
                      {task.priority === 'high'
                        ? 'High'
                        : task.priority === 'medium'
                        ? 'Medium'
                        : 'Low'}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <div className="inline-flex items-center gap-2">
                      <button className="px-3 py-1.5 rounded-full border border-dark-border text-xs text-gray-300 hover:border-accent hover:text-accent transition-colors">
                        Open disclosure
                      </button>
                      <button className="px-3 py-1.5 rounded-full border border-dark-border text-xs text-gray-300 hover:border-emerald-400 hover:text-emerald-300 transition-colors">
                        Mark complete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filteredTasks.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  No tasks match this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
        </>
      )}
    </div>
  )
}


