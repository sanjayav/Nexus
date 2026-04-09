import { useState, useMemo, useEffect } from 'react'
import {
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  ChevronRight,
  Search,
  X,
  MessageSquare,
  ArrowRight,
  AlertTriangle,
  User,
  RotateCcw,
  Link2,
  Shield,
  Wifi,
} from 'lucide-react'
import { Card, Badge, Tabs } from '../design-system'
import { useAuth } from '../auth/AuthContext'
import { workflow as workflowApi, type ApiWorkflowTask } from '../lib/api'

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */
type TaskStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'anchored'
type Priority = 'high' | 'medium' | 'low'
type TabId = 'queue' | 'board' | 'history'

interface Comment {
  id: string
  user: string
  text: string
  time: string
}

interface Task {
  id: string
  facility: string
  dataType: string
  scope: string
  submittedBy: string
  submittedDate: string
  dueDate: string
  value: string
  status: TaskStatus
  priority: Priority
  assignedTo: string
  assignedRole: string
  entityType: 'intercompany' | 'subsidiary' | 'supplier'
  comments: Comment[]
}

/* ═══════════════════════════════════════════
   Demo Data — 12 tasks across all statuses
   ═══════════════════════════════════════════ */
const INITIAL_TASKS: Task[] = [
  { id: 'wf-001', facility: 'Map Ta Phut Olefins', dataType: 'Scope 1 Process Emissions — Q1 2026', scope: 'Scope 1', submittedBy: 'Somchai Prasert', submittedDate: '2026-04-07', dueDate: '2026-04-14', value: '742,000 tCO₂e', status: 'pending', priority: 'high', assignedTo: 'Dr. Kannika Suthep', assignedRole: 'Team Lead', entityType: 'intercompany', comments: [{ id: 'c1', user: 'Somchai Prasert', text: 'CEMS data validated against lab results. Ready for review.', time: '2h ago' }] },
  { id: 'wf-002', facility: 'Rayong Refinery', dataType: 'Scope 1 Combustion — Q1 2026', scope: 'Scope 1', submittedBy: 'Priya Wattana', submittedDate: '2026-04-06', dueDate: '2026-04-13', value: '398,000 tCO₂e', status: 'pending', priority: 'high', assignedTo: 'Somchai Prasert', assignedRole: 'Facility Mgr', entityType: 'intercompany', comments: [] },
  { id: 'wf-003', facility: 'GC Glycol', dataType: 'Waste Generation Data — Q1 2026', scope: 'Waste', submittedBy: 'Kittisak Boonma', submittedDate: '2026-04-05', dueDate: '2026-04-12', value: '612 tonnes', status: 'pending', priority: 'medium', assignedTo: 'Kittisak Boonma', assignedRole: 'Site Owner', entityType: 'subsidiary', comments: [] },
  { id: 'wf-004', facility: 'ENVICCO', dataType: 'Recycled Content Volume — Q1 2026', scope: 'Circular', submittedBy: 'Apinya Jantaraksa', submittedDate: '2026-04-04', dueDate: '2026-04-11', value: '11,250 tonnes', status: 'in_review', priority: 'medium', assignedTo: 'Apinya Jantaraksa', assignedRole: 'Facility Mgr', entityType: 'subsidiary', comments: [{ id: 'c2', user: 'Apinya Jantaraksa', text: 'Reviewing against purchase orders. One discrepancy noted in batch #47.', time: '1d ago' }] },
  { id: 'wf-005', facility: 'Thai Polyethylene', dataType: 'Scope 1 Emissions — Q1 2026', scope: 'Scope 1', submittedBy: 'Nattapong Chai', submittedDate: '2026-04-03', dueDate: '2026-04-10', value: '225,000 tCO₂e', status: 'in_review', priority: 'low', assignedTo: 'Dr. Kannika Suthep', assignedRole: 'Team Lead', entityType: 'subsidiary', comments: [] },
  { id: 'wf-006', facility: 'HMC Polymers', dataType: 'Scope 2 Electricity — Q1 2026', scope: 'Scope 2', submittedBy: 'Rattana Phol', submittedDate: '2026-04-03', dueDate: '2026-04-10', value: '32,000 tCO₂e', status: 'approved', priority: 'medium', assignedTo: 'Somchai Prasert', assignedRole: 'Facility Mgr', entityType: 'subsidiary', comments: [{ id: 'c3', user: 'Somchai Prasert', text: 'Verified against utility invoices. Approved.', time: '3d ago' }] },
  { id: 'wf-007', facility: 'Map Ta Phut Aromatics', dataType: 'Energy Consumption — Q1 2026', scope: 'Energy', submittedBy: 'Thanyarat Noi', submittedDate: '2026-04-02', dueDate: '2026-04-09', value: '1,130 GWh', status: 'approved', priority: 'high', assignedTo: 'Dr. Kannika Suthep', assignedRole: 'Team Lead', entityType: 'intercompany', comments: [] },
  { id: 'wf-008', facility: 'NatureWorks', dataType: 'PLA Production Volume — Q1 2026', scope: 'Production', submittedBy: 'Chalerm Kasemsri', submittedDate: '2026-04-01', dueDate: '2026-04-08', value: '9,375 tonnes', status: 'anchored', priority: 'low', assignedTo: 'System', assignedRole: 'Auto', entityType: 'subsidiary', comments: [] },
  { id: 'wf-009', facility: 'Rayong PE/PP Plant', dataType: 'Scope 3 Transport — Q1 2026', scope: 'Scope 3', submittedBy: 'Somchai Prasert', submittedDate: '2026-04-01', dueDate: '2026-04-08', value: '18,400 tCO₂e', status: 'anchored', priority: 'medium', assignedTo: 'System', assignedRole: 'Auto', entityType: 'intercompany', comments: [] },
  { id: 'wf-010', facility: 'Map Ta Phut Olefins', dataType: 'Fugitive Emissions — Q1 2026', scope: 'Scope 1', submittedBy: 'Somchai Prasert', submittedDate: '2026-03-28', dueDate: '2026-04-04', value: '52,000 tCO₂e', status: 'rejected', priority: 'high', assignedTo: 'Somchai Prasert', assignedRole: 'Facility Mgr', entityType: 'intercompany', comments: [{ id: 'c4', user: 'Dr. Kannika Suthep', text: 'Value is 3x standard deviation. Please recheck LDAR data and resubmit with supporting evidence.', time: '5d ago' }] },
  { id: 'wf-011', facility: 'Jurong Terminal', dataType: 'Scope 2 Electricity — Q1 2026', scope: 'Scope 2', submittedBy: 'Lee Wei Ming', submittedDate: '2026-04-06', dueDate: '2026-04-13', value: '4,200 tCO₂e', status: 'pending', priority: 'low', assignedTo: 'Apinya Jantaraksa', assignedRole: 'Facility Mgr', entityType: 'subsidiary', comments: [] },
  { id: 'wf-012', facility: 'Bangkok HQ', dataType: 'Scope 2 Electricity — Q1 2026', scope: 'Scope 2', submittedBy: 'Nattapong Chai', submittedDate: '2026-04-05', dueDate: '2026-04-12', value: '1,800 tCO₂e', status: 'approved', priority: 'low', assignedTo: 'Dr. Kannika Suthep', assignedRole: 'Team Lead', entityType: 'intercompany', comments: [] },
]

/* ── Status config ── */
const STATUS_CFG: Record<TaskStatus, { label: string; color: string; bg: string; badge: 'amber' | 'blue' | 'green' | 'red' | 'teal'; icon: typeof Clock }> = {
  pending:   { label: 'Pending',    color: 'var(--accent-amber)',  bg: 'var(--accent-amber-light)',  badge: 'amber', icon: Clock },
  in_review: { label: 'In Review',  color: 'var(--accent-blue)',   bg: 'var(--accent-blue-light)',   badge: 'blue',  icon: Eye },
  approved:  { label: 'Approved',   color: 'var(--accent-green)',  bg: 'var(--accent-green-light)',  badge: 'green', icon: CheckCircle2 },
  rejected:  { label: 'Rejected',   color: 'var(--accent-red)',    bg: 'var(--accent-red-light)',    badge: 'red',   icon: XCircle },
  anchored:  { label: 'Anchored',   color: 'var(--accent-teal)',   bg: 'var(--accent-teal-light)',   badge: 'teal',  icon: Link2 },
}

const PRIORITY_CFG: Record<Priority, { label: string; badge: 'red' | 'amber' | 'gray' }> = {
  high:   { label: 'High',   badge: 'red' },
  medium: { label: 'Medium', badge: 'amber' },
  low:    { label: 'Low',    badge: 'gray' },
}

const ENTITY_CFG: Record<string, { label: string; badge: 'blue' | 'purple' | 'amber' }> = {
  intercompany: { label: 'Intercompany', badge: 'blue' },
  subsidiary:   { label: 'Subsidiary',   badge: 'purple' },
  supplier:     { label: 'Supplier',     badge: 'amber' },
}

const BOARD_COLS: { status: TaskStatus; label: string }[] = [
  { status: 'pending',   label: 'Pending' },
  { status: 'in_review', label: 'In Review' },
  { status: 'approved',  label: 'Approved' },
  { status: 'rejected',  label: 'Rejected' },
  { status: 'anchored',  label: 'Anchored' },
]

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */
function mapApiToTask(t: ApiWorkflowTask): Task {
  return {
    id: t.id,
    facility: t.facility_name || 'Unknown Facility',
    dataType: t.title,
    scope: t.data_type || 'Scope 1',
    submittedBy: t.submitted_by_name || 'System',
    submittedDate: t.created_at?.slice(0, 10) || '',
    dueDate: t.due_date || '',
    value: t.description || '',
    status: t.status as TaskStatus,
    priority: (t.priority || 'medium') as Priority,
    assignedTo: t.assigned_to_name || 'Unassigned',
    assignedRole: 'Team',
    entityType: 'intercompany',
    comments: (t.comments || []).map((c, i) => ({
      id: `c-${i}`,
      user: c.userName || 'User',
      text: c.text,
      time: c.timestamp ? new Date(c.timestamp).toLocaleDateString() : '',
    })),
  }
}

export default function Workflow() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS)
  const [isLive, setIsLive] = useState(false)
  const [tab, setTab] = useState<TabId>('queue')

  // Load from API, fallback to mock
  useEffect(() => {
    workflowApi.list().then(apiTasks => {
      if (apiTasks.length > 0) {
        setTasks(apiTasks.map(mapApiToTask))
        setIsLive(true)
      }
    }).catch(() => { /* keep mock data */ })
  }, [])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [selected, setSelected] = useState<Task | null>(null)
  const [newComment, setNewComment] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  /* ── Derived ── */
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: tasks.length }
    tasks.forEach(t => { c[t.status] = (c[t.status] || 0) + 1 })
    return c
  }, [tasks])

  const filtered = useMemo(() => {
    let list = tasks
    if (statusFilter !== 'all') list = list.filter(t => t.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(t => `${t.facility} ${t.dataType} ${t.submittedBy} ${t.assignedTo}`.toLowerCase().includes(q))
    }
    return list
  }, [tasks, statusFilter, search])

  /* ── Actions ── */
  const updateTask = (id: string, patch: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, ...patch } : prev)
  }

  const approve = (id: string) => updateTask(id, { status: 'approved' })
  const reject = (id: string) => updateTask(id, { status: 'rejected' })
  const startReview = (id: string) => updateTask(id, { status: 'in_review' })
  const resubmit = (id: string) => updateTask(id, { status: 'pending' })
  const anchor = (id: string) => updateTask(id, { status: 'anchored' })

  const batchApprove = () => {
    setTasks(prev => prev.map(t => selectedIds.has(t.id) && (t.status === 'pending' || t.status === 'in_review') ? { ...t, status: 'approved' } : t))
    setSelectedIds(new Set())
  }

  const addComment = (taskId: string) => {
    if (!newComment.trim()) return
    const comment: Comment = { id: `c-${Date.now()}`, user: user?.name || 'You', text: newComment.trim(), time: 'Just now' }
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, comments: [...t.comments, comment] } : t))
    if (selected?.id === taskId) setSelected(prev => prev ? { ...prev, comments: [...prev.comments, comment] } : prev)
    setNewComment('')
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const selectableCount = filtered.filter(t => t.status === 'pending' || t.status === 'in_review').length

  /* ── KPIs ── */
  const pendingCount = (counts.pending || 0) + (counts.in_review || 0)
  const overdueCount = tasks.filter(t => (t.status === 'pending' || t.status === 'in_review') && t.dueDate < '2026-04-09').length
  const approvedToday = tasks.filter(t => t.status === 'approved').length
  const anchoredCount = counts.anchored || 0

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)] tracking-tight">Workflow</h1>
          <p className="mt-1 text-[var(--text-sm)] text-[var(--text-tertiary)] flex items-center gap-2">
            Review, approve, and anchor emission data through the governance pipeline.
            {isLive && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--accent-green)] bg-[var(--accent-green-light)] px-2 py-0.5 rounded-full"><Wifi className="w-3 h-3" /> Live</span>}
          </p>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Awaiting Review', value: pendingCount, icon: Clock, color: 'var(--accent-amber)', bg: 'var(--accent-amber-light)' },
          { label: 'Overdue', value: overdueCount, icon: AlertTriangle, color: 'var(--accent-red)', bg: 'var(--accent-red-light)' },
          { label: 'Approved', value: approvedToday, icon: CheckCircle2, color: 'var(--accent-green)', bg: 'var(--accent-green-light)' },
          { label: 'Anchored', value: anchoredCount, icon: Link2, color: 'var(--accent-teal)', bg: 'var(--accent-teal-light)' },
        ].map(m => {
          const Icon = m.icon
          return (
            <Card key={m.label} padding="sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: m.bg }}>
                  <Icon className="w-5 h-5" style={{ color: m.color }} />
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium leading-none">{m.label}</p>
                  <p className="font-display text-[var(--text-xl)] font-bold tabular-nums leading-tight mt-1" style={{ color: m.color }}>{m.value}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* ── Pipeline visual ── */}
      <Card padding="sm">
        <div className="flex items-center gap-2">
          {BOARD_COLS.map((col, i) => {
            const cfg = STATUS_CFG[col.status]
            const cnt = counts[col.status] || 0
            const Icon = cfg.icon
            return (
              <div key={col.status} className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg" style={{ backgroundColor: cfg.bg }}>
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color }} />
                  <span className="text-[var(--text-xs)] font-semibold" style={{ color: cfg.color }}>{col.label}</span>
                  <span className="ml-auto text-[var(--text-sm)] font-bold tabular-nums" style={{ color: cfg.color }}>{cnt}</span>
                </div>
                {i < BOARD_COLS.length - 1 && <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />}
              </div>
            )
          })}
        </div>
      </Card>

      {/* ── Tabs ── */}
      <Tabs
        tabs={[
          { id: 'queue', label: 'Approval Queue', count: pendingCount },
          { id: 'board', label: 'Kanban Board', count: tasks.length },
          { id: 'history', label: 'Activity Log' },
        ]}
        activeTab={tab}
        onChange={id => setTab(id as TabId)}
      />

      {/* ═══════════════════════════════════
         QUEUE VIEW
         ═══════════════════════════════════ */}
      {tab === 'queue' && (
        <div className="space-y-4 animate-fade-in">
          {/* Toolbar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." className="w-full h-9 pl-9 pr-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:border-transparent transition-all" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] cursor-pointer"><X className="w-3.5 h-3.5" /></button>}
            </div>

            {/* Status filter pills */}
            <div className="flex items-center gap-1 p-0.5 bg-[var(--bg-tertiary)] rounded-lg">
              {(['all', 'pending', 'in_review', 'approved', 'rejected', 'anchored'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    statusFilter === s
                      ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {s === 'all' ? 'All' : STATUS_CFG[s].label}
                  {s !== 'all' && counts[s] ? ` (${counts[s]})` : s === 'all' ? ` (${tasks.length})` : ''}
                </button>
              ))}
            </div>

            {selectedIds.size > 0 && (
              <button onClick={batchApprove} className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[var(--accent-green)] text-white text-[12px] font-semibold hover:bg-green-700 active:scale-[0.97] transition-all cursor-pointer shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve {selectedIds.size} selected
              </button>
            )}
          </div>

          {/* Task list */}
          <Card padding="none">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border-default)] rounded-t-xl">
              {selectableCount > 0 && (
                <input
                  type="checkbox"
                  checked={selectedIds.size === selectableCount && selectableCount > 0}
                  onChange={() => {
                    if (selectedIds.size === selectableCount) setSelectedIds(new Set())
                    else setSelectedIds(new Set(filtered.filter(t => t.status === 'pending' || t.status === 'in_review').map(t => t.id)))
                  }}
                  className="w-3.5 h-3.5 rounded accent-[var(--accent-teal)] cursor-pointer"
                />
              )}
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider flex-1">Task</span>
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider w-20">Priority</span>
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider w-28">Assigned To</span>
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider w-24 text-right">Value</span>
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider w-20">Status</span>
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider w-32 text-right">Action</span>
            </div>

            {/* Rows */}
            {filtered.map((task, i) => {
              const cfg = STATUS_CFG[task.status]
              const pri = PRIORITY_CFG[task.priority]
              const ent = ENTITY_CFG[task.entityType]
              const isActionable = task.status === 'pending' || task.status === 'in_review'
              const overdue = isActionable && task.dueDate < '2026-04-09'
              return (
                <div key={task.id} className={`flex items-center gap-3 px-5 py-3 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer ${i < filtered.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''}`} onClick={() => setSelected(task)}>
                  {selectableCount > 0 && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(task.id)}
                      onChange={e => { e.stopPropagation(); toggleSelect(task.id) }}
                      disabled={!isActionable}
                      className="w-3.5 h-3.5 rounded accent-[var(--accent-teal)] cursor-pointer disabled:opacity-30"
                      onClick={e => e.stopPropagation()}
                    />
                  )}

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] truncate">{task.facility}</span>
                      <Badge variant={ent.badge}>{ent.label}</Badge>
                      {overdue && <Badge variant="red" dot>Overdue</Badge>}
                      {task.comments.length > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-tertiary)]"><MessageSquare className="w-3 h-3" />{task.comments.length}</span>
                      )}
                    </div>
                    <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-0.5 truncate">{task.dataType} · by {task.submittedBy} · due {task.dueDate}</p>
                  </div>

                  {/* Priority */}
                  <div className="w-20"><Badge variant={pri.badge}>{pri.label}</Badge></div>

                  {/* Assigned */}
                  <div className="w-28 flex items-center gap-1.5 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
                      <User className="w-3 h-3 text-[var(--text-tertiary)]" />
                    </div>
                    <span className="text-[var(--text-xs)] text-[var(--text-secondary)] truncate">{task.assignedTo.split(' ').pop()}</span>
                  </div>

                  {/* Value */}
                  <div className="w-24 text-right">
                    <span className="text-[var(--text-xs)] font-semibold text-[var(--text-primary)] tabular-nums">{task.value}</span>
                  </div>

                  {/* Status */}
                  <div className="w-20"><Badge variant={cfg.badge} dot>{cfg.label}</Badge></div>

                  {/* Actions */}
                  <div className="w-32 flex items-center gap-1.5 justify-end" onClick={e => e.stopPropagation()}>
                    {task.status === 'pending' && (
                      <>
                        <button onClick={() => startReview(task.id)} className="h-7 px-2.5 rounded-md text-[10px] font-semibold text-[var(--accent-blue)] bg-[var(--accent-blue-light)] hover:bg-blue-100 transition-all cursor-pointer">Review</button>
                        <button onClick={() => approve(task.id)} className="h-7 px-2.5 rounded-md text-[10px] font-semibold text-[var(--accent-green)] bg-[var(--accent-green-light)] hover:bg-green-100 transition-all cursor-pointer">Approve</button>
                      </>
                    )}
                    {task.status === 'in_review' && (
                      <>
                        <button onClick={() => approve(task.id)} className="h-7 px-2.5 rounded-md text-[10px] font-semibold text-[var(--accent-green)] bg-[var(--accent-green-light)] hover:bg-green-100 transition-all cursor-pointer">Approve</button>
                        <button onClick={() => reject(task.id)} className="h-7 px-2.5 rounded-md text-[10px] font-semibold text-[var(--accent-red)] bg-[var(--accent-red-light)] hover:bg-red-100 transition-all cursor-pointer">Reject</button>
                      </>
                    )}
                    {task.status === 'approved' && (
                      <button onClick={() => anchor(task.id)} className="h-7 px-2.5 rounded-md text-[10px] font-semibold text-[var(--accent-teal)] bg-[var(--accent-teal-light)] hover:bg-teal-100 transition-all cursor-pointer">Anchor</button>
                    )}
                    {task.status === 'rejected' && (
                      <button onClick={() => resubmit(task.id)} className="h-7 px-2.5 rounded-md text-[10px] font-semibold text-[var(--accent-amber)] bg-[var(--accent-amber-light)] hover:bg-amber-100 transition-all cursor-pointer">Resubmit</button>
                    )}
                    {task.status === 'anchored' && (
                      <span className="text-[10px] text-[var(--text-tertiary)]">Complete</span>
                    )}
                  </div>
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div className="py-12 text-center text-[var(--text-sm)] text-[var(--text-tertiary)]">No tasks match your filters.</div>
            )}
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════
         KANBAN BOARD
         ═══════════════════════════════════ */}
      {tab === 'board' && (
        <div className="flex gap-4 overflow-x-auto pb-2 animate-fade-in">
          {BOARD_COLS.map(col => {
            const cfg = STATUS_CFG[col.status]
            const Icon = cfg.icon
            const colTasks = tasks.filter(t => t.status === col.status)
            return (
              <div key={col.status} className="flex-1 min-w-[240px]">
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: cfg.bg }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                  </div>
                  <span className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{col.label}</span>
                  <span className="ml-auto text-[var(--text-xs)] font-bold tabular-nums px-1.5 py-0.5 rounded-md" style={{ backgroundColor: cfg.bg, color: cfg.color }}>{colTasks.length}</span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {colTasks.map(task => {
                    const pri = PRIORITY_CFG[task.priority]
                    const ent = ENTITY_CFG[task.entityType]
                    const overdue = (task.status === 'pending' || task.status === 'in_review') && task.dueDate < '2026-04-09'
                    return (
                      <button key={task.id} onClick={() => setSelected(task)} className="w-full text-left cursor-pointer">
                        <Card hover padding="sm" className="relative">
                          {/* Priority stripe */}
                          <div className="absolute top-0 left-0 w-[3px] h-full rounded-l-xl" style={{ backgroundColor: cfg.color, opacity: 0.4 }} />

                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] leading-tight truncate">{task.facility}</p>
                              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 truncate">{task.dataType}</p>
                            </div>
                            <Badge variant={pri.badge}>{pri.label}</Badge>
                          </div>

                          <div className="flex items-center gap-2 mt-3">
                            <Badge variant={ent.badge}>{ent.label}</Badge>
                            {overdue && <Badge variant="red" dot>Overdue</Badge>}
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--border-subtle)]">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                                <User className="w-3 h-3 text-[var(--text-tertiary)]" />
                              </div>
                              <span className="text-[10px] text-[var(--text-tertiary)]">{task.assignedTo.split(' ').pop()}</span>
                            </div>
                            <span className="text-[var(--text-xs)] font-bold tabular-nums text-[var(--text-primary)]">{task.value}</span>
                          </div>

                          {task.comments.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 text-[10px] text-[var(--text-tertiary)]">
                              <MessageSquare className="w-3 h-3" /> {task.comments.length} comment{task.comments.length > 1 ? 's' : ''}
                            </div>
                          )}
                        </Card>
                      </button>
                    )
                  })}

                  {colTasks.length === 0 && (
                    <div className="py-8 text-center text-[var(--text-xs)] text-[var(--text-tertiary)] border-2 border-dashed border-[var(--border-default)] rounded-xl">No tasks</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══════════════════════════════════
         ACTIVITY LOG
         ═══════════════════════════════════ */}
      {tab === 'history' && (
        <div className="space-y-4 animate-fade-in">
          <Card padding="none">
            <div className="px-5 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-default)] rounded-t-xl">
              <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">Governance Pipeline</h3>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Three-step data governance: submit, review, and anchor to blockchain</p>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3">
                {[
                  { step: 1, label: 'Engineer Submits', desc: 'Records measured data and submits for review', icon: Send, color: 'var(--accent-amber)' },
                  { step: 2, label: 'Approver Reviews', desc: 'Validates values, flags anomalies, accepts or rejects', icon: Shield, color: 'var(--accent-blue)' },
                  { step: 3, label: 'System Anchors', desc: 'Hashes and anchors approved data to immutable ledger', icon: Link2, color: 'var(--accent-teal)' },
                ].map((s, i) => {
                  const Icon = s.icon
                  return (
                    <div key={s.step} className="flex items-center gap-3 flex-1">
                      <div className="flex items-center gap-3 flex-1 px-4 py-3 rounded-xl border border-[var(--border-default)]">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `color-mix(in srgb, ${s.color} 10%, transparent)` }}>
                          <Icon className="w-4 h-4" style={{ color: s.color }} />
                        </div>
                        <div>
                          <p className="text-[var(--text-xs)] font-semibold text-[var(--text-primary)]">Step {s.step}: {s.label}</p>
                          <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{s.desc}</p>
                        </div>
                      </div>
                      {i < 2 && <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />}
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>

          {/* Timeline */}
          <Card padding="none">
            <div className="px-5 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-default)] rounded-t-xl">
              <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">Recent Activity</h3>
            </div>
            {[
              { time: '2h ago', action: 'submitted', user: 'Somchai Prasert', detail: 'Scope 1 Process Emissions — Map Ta Phut Olefins — 742,000 tCO₂e', status: 'pending' as TaskStatus },
              { time: '4h ago', action: 'started review', user: 'Apinya Jantaraksa', detail: 'Recycled Content Volume — ENVICCO — 11,250 tonnes', status: 'in_review' as TaskStatus },
              { time: '1d ago', action: 'approved', user: 'Somchai Prasert', detail: 'Scope 2 Electricity — HMC Polymers — 32,000 tCO₂e', status: 'approved' as TaskStatus },
              { time: '1d ago', action: 'approved', user: 'Dr. Kannika Suthep', detail: 'Energy Consumption — Map Ta Phut Aromatics — 1,130 GWh', status: 'approved' as TaskStatus },
              { time: '2d ago', action: 'approved', user: 'Dr. Kannika Suthep', detail: 'Scope 2 Electricity — Bangkok HQ — 1,800 tCO₂e', status: 'approved' as TaskStatus },
              { time: '3d ago', action: 'rejected', user: 'Dr. Kannika Suthep', detail: 'Fugitive Emissions — Map Ta Phut Olefins — 52,000 tCO₂e — Value 3x std dev', status: 'rejected' as TaskStatus },
              { time: '5d ago', action: 'anchored', user: 'System', detail: 'PLA Production Volume — NatureWorks — 9,375 tonnes', status: 'anchored' as TaskStatus },
              { time: '5d ago', action: 'anchored', user: 'System', detail: 'Scope 3 Transport — Rayong PE/PP Plant — 18,400 tCO₂e', status: 'anchored' as TaskStatus },
            ].map((event, i, arr) => {
              const cfg = STATUS_CFG[event.status]
              const Icon = cfg.icon
              return (
                <div key={i} className={`flex items-start gap-4 px-5 py-3.5 ${i < arr.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''}`}>
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: cfg.bg }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                    </div>
                    {i < arr.length - 1 && <div className="w-px flex-1 mt-1 bg-[var(--border-subtle)]" style={{ minHeight: 16 }} />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{event.user}</span>
                      <span className="text-[var(--text-xs)] text-[var(--text-tertiary)]">{event.action}</span>
                      <Badge variant={cfg.badge}>{cfg.label}</Badge>
                    </div>
                    <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-0.5 truncate">{event.detail}</p>
                  </div>

                  <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0 tabular-nums">{event.time}</span>
                </div>
              )
            })}
          </Card>

          {/* Correction workflow */}
          <Card padding="none">
            <div className="px-5 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-default)] rounded-t-xl">
              <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">Correction Workflow</h3>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Original records are never overwritten — corrections are new entries referencing the original</p>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              {/* Original */}
              <div className="px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center"><span className="text-[10px] font-bold text-[var(--text-secondary)]">1</span></div>
                  <span className="text-[var(--text-xs)] font-semibold text-[var(--text-primary)]">Original Record</span>
                  <span className="ml-auto"><Badge variant="teal">Preserved</Badge></span>
                </div>
                <div className="space-y-1.5">
                  {[['Facility', 'Map Ta Phut Olefins'], ['Value', '712,000 tCO₂e'], ['Submitted', '2026-04-02'], ['Status', 'Anchored']].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-[var(--text-xs)]">
                      <span className="text-[var(--text-tertiary)]">{k}</span>
                      <span className="font-medium text-[var(--text-primary)]">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Correction */}
              <div className="px-4 py-3 rounded-xl border border-[var(--accent-amber)] bg-[var(--accent-amber-light)]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-[var(--accent-amber)] flex items-center justify-center"><AlertTriangle className="w-3 h-3 text-white" /></div>
                  <span className="text-[var(--text-xs)] font-semibold text-[var(--accent-amber)]">Correction Record</span>
                  <span className="ml-auto"><Badge variant="amber">New Entry</Badge></span>
                </div>
                <div className="space-y-1.5">
                  {[['Facility', 'Map Ta Phut Olefins'], ['Corrected Value', '698,400 tCO₂e'], ['Date', '2026-04-05'], ['Reason', 'Meter recalibration'], ['References', 'wf-001']].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-[var(--text-xs)]">
                      <span className="text-[var(--text-tertiary)]">{k}</span>
                      <span className="font-medium text-[var(--text-primary)]">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════
         TASK DETAIL MODAL
         ═══════════════════════════════════ */}
      {selected && (() => {
        const cfg = STATUS_CFG[selected.status]
        const pri = PRIORITY_CFG[selected.priority]
        const ent = ENTITY_CFG[selected.entityType]
        const Icon = cfg.icon
        const overdue = (selected.status === 'pending' || selected.status === 'in_review') && selected.dueDate < '2026-04-09'
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelected(null)} />
            <div className="relative bg-[var(--bg-primary)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto border border-[var(--border-default)] animate-fade-in">
              {/* Header */}
              <div className="sticky top-0 z-10 bg-[var(--bg-primary)] border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cfg.bg }}>
                    <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[var(--text-base)] font-bold text-[var(--text-primary)] leading-tight truncate">{selected.facility}</h2>
                    <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] truncate mt-0.5">{selected.dataType}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Status + priority + badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={cfg.badge} dot>{cfg.label}</Badge>
                  <Badge variant={pri.badge}>{pri.label} priority</Badge>
                  <Badge variant={ent.badge}>{ent.label}</Badge>
                  {overdue && <Badge variant="red" dot>Overdue</Badge>}
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { l: 'Value', v: selected.value },
                    { l: 'Scope', v: selected.scope },
                    { l: 'Submitted By', v: selected.submittedBy },
                    { l: 'Submitted', v: selected.submittedDate },
                    { l: 'Due Date', v: selected.dueDate },
                    { l: 'Assigned To', v: selected.assignedTo },
                  ].map(m => (
                    <div key={m.l} className="px-3 py-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                      <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium">{m.l}</p>
                      <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mt-0.5">{m.v}</p>
                    </div>
                  ))}
                </div>

                {/* Comments */}
                <div>
                  <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-[var(--text-tertiary)]" /> Comments ({selected.comments.length})
                  </h3>

                  {selected.comments.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {selected.comments.map(c => (
                        <div key={c.id} className="px-3 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)]">
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--text-xs)] font-semibold text-[var(--text-primary)]">{c.user}</span>
                            <span className="text-[10px] text-[var(--text-tertiary)]">{c.time}</span>
                          </div>
                          <p className="text-[var(--text-xs)] text-[var(--text-secondary)] mt-1 leading-relaxed">{c.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add comment */}
                  <div className="flex items-center gap-2">
                    <input
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addComment(selected.id)}
                      placeholder="Add a comment..."
                      className="flex-1 h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:border-transparent transition-all"
                    />
                    <button onClick={() => addComment(selected.id)} disabled={!newComment.trim()} className="h-9 px-3 rounded-lg bg-[var(--bg-inverse)] text-white text-[12px] font-semibold hover:bg-[var(--bg-inverse-soft)] disabled:opacity-40 transition-all cursor-pointer">
                      Send
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-subtle)]">
                  {selected.status === 'pending' && (
                    <>
                      <button onClick={() => { startReview(selected.id); }} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[var(--text-sm)] font-semibold text-[var(--accent-blue)] bg-[var(--accent-blue-light)] hover:bg-blue-100 transition-all cursor-pointer">
                        <Eye className="w-3.5 h-3.5" /> Start Review
                      </button>
                      <button onClick={() => { approve(selected.id); }} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[var(--text-sm)] font-semibold text-white bg-[var(--accent-green)] hover:bg-green-700 transition-all cursor-pointer shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => { reject(selected.id); }} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[var(--text-sm)] font-medium text-[var(--accent-red)] hover:bg-[var(--accent-red-light)] transition-all cursor-pointer">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}
                  {selected.status === 'in_review' && (
                    <>
                      <button onClick={() => { approve(selected.id); }} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[var(--text-sm)] font-semibold text-white bg-[var(--accent-green)] hover:bg-green-700 transition-all cursor-pointer shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => { reject(selected.id); }} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[var(--text-sm)] font-medium text-[var(--accent-red)] hover:bg-[var(--accent-red-light)] transition-all cursor-pointer">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}
                  {selected.status === 'approved' && (
                    <button onClick={() => { anchor(selected.id); }} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[var(--text-sm)] font-semibold text-white bg-[var(--accent-teal)] hover:bg-teal-700 transition-all cursor-pointer shadow-sm">
                      <Link2 className="w-3.5 h-3.5" /> Anchor to Blockchain
                    </button>
                  )}
                  {selected.status === 'rejected' && (
                    <button onClick={() => { resubmit(selected.id); }} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[var(--text-sm)] font-semibold text-[var(--accent-amber)] bg-[var(--accent-amber-light)] hover:bg-amber-100 transition-all cursor-pointer">
                      <RotateCcw className="w-3.5 h-3.5" /> Resubmit for Review
                    </button>
                  )}
                  {selected.status === 'anchored' && (
                    <div className="flex items-center gap-2">
                      <Badge variant="teal" dot>Anchored</Badge>
                      <span className="text-[10px] font-mono text-[var(--text-tertiary)]">0x7f3a…c9d1e4b8a02f</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
