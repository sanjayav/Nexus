import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardList, Search, Plus, Trash2, Calendar, Factory,
  PencilLine, Calculator as CalcIcon, Plug, AlertCircle, Loader2, Filter, FileText,
  List, Columns, GitBranch, ChevronDown, Network as NetworkIcon,
} from 'lucide-react'
import { orgStore, type OrgEntity, type OrgMember, type QuestionAssignment, type ResponseType } from '../lib/orgStore'
import { nexus, type NexusQuestionnaireItem } from '../lib/api'
import { findCalculator } from '../calculators/registry'
import { useAuth } from '../auth/AuthContext'
import JourneyBar from '../components/JourneyBar'
import { FrameworkBadge } from '../components/FrameworkBadge'
import { useFramework } from '../lib/frameworks'

const MODES = ['Manual', 'Calculator', 'Connector'] as const
type Mode = typeof MODES[number]

const STATUS_META: Record<QuestionAssignment['status'], { label: string; bg: string; fg: string }> = {
  not_started: { label: 'Not started', bg: 'var(--bg-tertiary)', fg: 'var(--text-tertiary)' },
  in_progress: { label: 'In progress', bg: 'var(--accent-amber-light)', fg: 'var(--status-draft)' },
  submitted:   { label: 'Submitted',   bg: 'var(--accent-blue-light)', fg: 'var(--status-pending)' },
  reviewed:    { label: 'Reviewed',    bg: 'var(--accent-blue-light)', fg: 'var(--status-pending)' },
  approved:    { label: 'Approved',    bg: 'var(--accent-green-light)', fg: 'var(--status-ok)' },
  rejected:    { label: 'Rejected',    bg: 'var(--accent-red-light)', fg: 'var(--status-reject)' },
}

export default function AssignmentManager() {
  const { user } = useAuth()
  const { active: framework } = useFramework()
  const [questions, setQuestions] = useState<NexusQuestionnaireItem[]>([])
  const [entities, setEntities] = useState<OrgEntity[]>([])
  const [members, setMembers] = useState<OrgMember[]>([])
  const [assignments, setAssignments] = useState<QuestionAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<QuestionAssignment['status'] | 'all'>('all')
  const [filterEntity, setFilterEntity] = useState<string>('all')
  const [view, setView] = useState<'list' | 'kanban' | 'tree' | 'network'>(() => (localStorage.getItem('aeiforo_assignment_view') as any) || 'list')
  useEffect(() => { localStorage.setItem('aeiforo_assignment_view', view) }, [view])

  // new-assignment drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pickedQuestion, setPickedQuestion] = useState<NexusQuestionnaireItem | null>(null)
  const [pickedEntity, setPickedEntity] = useState<string>('')
  const [pickedMember, setPickedMember] = useState<string>('')
  const [pickedModes, setPickedModes] = useState<Mode[]>(['Manual'])
  const [pickedResponseType, setPickedResponseType] = useState<ResponseType>('numeric')
  const [pickedDue, setPickedDue] = useState<string>('')

  const refresh = async () => {
    try {
      const [tree, ents, mems, asgs] = await Promise.all([
        nexus.tree(framework.id).catch(() => [] as NexusQuestionnaireItem[]),
        orgStore.listEntities(),
        orgStore.listMembers(),
        orgStore.listAssignments(),
      ])
      setQuestions(tree)
      setEntities(ents)
      setMembers(mems)
      setAssignments(asgs.filter(a => a.framework_id === framework.id))
    } catch { /* silent */ }
  }

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      await refresh()
      setLoading(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [framework.id])

  const entityById = useMemo(() => new Map(entities.map(e => [e.id, e])), [entities])
  const memberById = useMemo(() => new Map(members.map(m => [m.id, m])), [members])

  const plants = useMemo(() => entities.filter(e => e.type === 'plant' || e.type === 'office'), [entities])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return assignments.filter(a => {
      if (filterStatus !== 'all' && a.status !== filterStatus) return false
      if (filterEntity !== 'all' && a.entityId !== filterEntity) return false
      if (!q) return true
      return (
        a.gri_code.toLowerCase().includes(q) ||
        a.line_item.toLowerCase().includes(q) ||
        a.assigneeName.toLowerCase().includes(q) ||
        a.assigneeEmail.toLowerCase().includes(q)
      )
    })
  }, [assignments, query, filterStatus, filterEntity])

  const stats = useMemo(() => {
    return {
      total: assignments.length,
      approved: assignments.filter(a => a.status === 'approved').length,
      inFlight: assignments.filter(a => a.status === 'submitted' || a.status === 'reviewed').length,
      notStarted: assignments.filter(a => a.status === 'not_started' || a.status === 'in_progress').length,
    }
  }, [assignments])

  const openDrawer = () => {
    setPickedQuestion(null)
    setPickedEntity(plants[0]?.id || '')
    setPickedMember('')
    setPickedModes(['Manual'])
    setPickedResponseType('numeric')
    setPickedDue('')
    setDrawerOpen(true)
  }

  const toggleMode = (m: Mode) => {
    setPickedModes(prev => {
      if (prev.includes(m)) {
        const next = prev.filter(x => x !== m)
        return next.length === 0 ? prev : next // always keep at least one
      }
      return [...prev, m]
    })
  }

  const saveAssignment = async () => {
    if (!pickedQuestion || !pickedEntity || !pickedMember || pickedModes.length === 0) return
    const m = memberById.get(pickedMember)
    if (!m) return
    try {
      const created = await orgStore.addAssignment({
        framework_id: framework.id,
        questionId: pickedQuestion.id,
        gri_code: pickedQuestion.gri_code,
        line_item: pickedQuestion.line_item,
        entityId: pickedEntity,
        assigneeId: m.userId,
        assigneeName: m.name,
        assigneeEmail: m.email,
        entry_modes: pickedResponseType === 'narrative' ? ['Manual'] : pickedModes,
        due_date: pickedDue || null,
        assigned_by: user?.email || 'unknown',
        unit: pickedQuestion.unit,
        response_type: pickedResponseType,
      })
      setAssignments(a => [created, ...a])
      setDrawerOpen(false)
    } catch (e) {
      alert(`Could not create assignment: ${e instanceof Error ? e.message : e}`)
    }
  }

  const removeAssignment = async (id: string) => {
    if (!confirm('Remove this assignment?')) return
    try {
      await orgStore.removeAssignment(id)
      setAssignments(a => a.filter(x => x.id !== id))
    } catch (e) {
      alert(`Could not remove: ${e instanceof Error ? e.message : e}`)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <JourneyBar variant="compact" highlight="assign" />
      </div>
      <header className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--color-brand)]">
            <ClipboardList className="w-3 h-3" /> Questionnaire assignments
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <h1 className="font-display text-[28px] font-bold text-[var(--text-primary)]">
              Assign {framework.code} questions
            </h1>
            <FrameworkBadge size="md" />
          </div>
          <p className="text-[var(--text-sm)] text-[var(--text-secondary)] mt-1">
            Each {framework.code} line item goes to the person closest to the data. They see it in <strong>My Tasks</strong> next time they sign in.
          </p>
        </div>
        <button
          onClick={openDrawer}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--color-brand-strong)] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> New assignment
        </button>
      </header>

      <div className="grid grid-cols-4 gap-3 mb-5">
        <Stat label="Total" value={stats.total} tone="neutral" />
        <Stat label="Approved" value={stats.approved} tone="ok" />
        <Stat label="In review" value={stats.inFlight} tone="pending" />
        <Stat label="Not started" value={stats.notStarted} tone="draft" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex-1 relative min-w-[280px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by GRI code, line item, or assignee…"
            className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]"
          />
        </div>
        <div className="relative">
          <Filter className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="pl-7 pr-7 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-xs)] appearance-none"
          >
            <option value="all">All statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="inline-flex items-center gap-0.5 p-0.5 rounded-[8px] bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
          {([
            { k: 'list',    icon: List,        label: 'List' },
            { k: 'kanban',  icon: Columns,     label: 'Kanban' },
            { k: 'tree',    icon: GitBranch,   label: 'Tree' },
            { k: 'network', icon: NetworkIcon, label: 'Network' },
          ] as const).map(({ k, icon: Icon, label }) => {
            const active = view === k
            return (
              <button
                key={k}
                onClick={() => setView(k)}
                className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] text-[11.5px] font-semibold transition-all ${
                  active ? 'bg-[var(--bg-primary)] text-[var(--color-brand-strong)] shadow-[0_1px_2px_rgba(11,18,32,0.06)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            )
          })}
        </div>
        <select
          value={filterEntity}
          onChange={e => setFilterEntity(e.target.value)}
          className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-xs)] max-w-[220px]"
        >
          <option value="all">All entities</option>
          {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-20 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] bg-[var(--bg-primary)] py-14 text-center">
          <ClipboardList className="w-10 h-10 mx-auto text-[var(--text-tertiary)] mb-2" />
          <h3 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">
            {assignments.length === 0 ? 'No assignments yet' : 'No results'}
          </h3>
          <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] mt-1 max-w-sm mx-auto">
            {assignments.length === 0 ? 'Create your first assignment — pick a GRI question and hand it to a plant.' : 'Try different filters.'}
          </p>
          {assignments.length === 0 && (
            <button onClick={openDrawer} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-sm)] font-semibold">
              <Plus className="w-4 h-4" /> Create assignment
            </button>
          )}
        </div>
      ) : view === 'kanban' ? (
        <KanbanView
          assignments={filtered}
          entityById={entityById}
          onRemove={removeAssignment}
        />
      ) : view === 'tree' ? (
        <TreeView
          assignments={filtered}
          entities={entities}
          onRemove={removeAssignment}
        />
      ) : view === 'network' ? (
        <NetworkView
          assignments={filtered}
          entities={entities}
        />
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden">
          <table className="w-full text-[var(--text-sm)]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--bg-secondary)]">
                <th className="text-left px-4 py-2.5 font-semibold">GRI · Line item</th>
                <th className="text-left px-4 py-2.5 font-semibold">Plant / entity</th>
                <th className="text-left px-4 py-2.5 font-semibold">Assignee</th>
                <th className="text-left px-3 py-2.5 font-semibold">Mode</th>
                <th className="text-left px-3 py-2.5 font-semibold">Due</th>
                <th className="text-left px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.map(a => {
                const entity = entityById.get(a.entityId)
                const status = STATUS_META[a.status]
                const modes = a.entry_modes ?? ['Manual']
                return (
                  <tr key={a.id} className="hover:bg-[var(--bg-secondary)]">
                    <td className="px-4 py-3">
                      <div className="text-[10px] font-semibold text-[var(--color-brand)]">{a.gri_code}</div>
                      <div className="text-[var(--text-sm)] text-[var(--text-primary)] font-medium truncate max-w-[320px]">{a.line_item}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-[var(--text-xs)]">
                        <Factory className="w-3 h-3 text-[var(--text-tertiary)]" />
                        <span className="text-[var(--text-primary)] font-medium truncate max-w-[180px]">{entity?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[var(--color-brand)] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {a.assigneeName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[var(--text-xs)] font-semibold text-[var(--text-primary)] truncate">{a.assigneeName}</div>
                          <div className="text-[10px] text-[var(--text-tertiary)] truncate">{a.assigneeEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[var(--text-xs)]">
                      <div className="flex items-center gap-1 flex-wrap">
                        {modes.map(m => {
                          const Icon = m === 'Manual' ? PencilLine : m === 'Calculator' ? CalcIcon : Plug
                          const isUsed = a.used_mode === m
                          return (
                            <span key={m} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              isUsed
                                ? 'bg-[var(--color-brand)] text-white'
                                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                            }`} title={isUsed ? 'Used to record this value' : 'Allowed'}>
                              <Icon className="w-3 h-3" /> {m}
                            </span>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[var(--text-xs)]">
                      {a.due_date ? (
                        <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                          <Calendar className="w-3 h-3" /> {a.due_date}
                        </span>
                      ) : <span className="text-[var(--text-tertiary)]">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-block px-2 py-0.5 rounded-[var(--radius-sm)] text-[10px] font-semibold uppercase tracking-wider"
                            style={{ background: status.bg, color: status.fg }}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button onClick={() => removeAssignment(a.id)} className="w-7 h-7 rounded text-[var(--text-tertiary)] hover:text-[var(--status-reject)] hover:bg-[var(--accent-red-light)] inline-flex items-center justify-center" title="Remove">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 animate-fade-in" onClick={() => setDrawerOpen(false)}>
          <div className="w-[520px] h-full bg-[var(--bg-primary)] shadow-2xl p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-[var(--text-xl)] font-bold text-[var(--text-primary)]">New assignment</h2>
              <button onClick={() => setDrawerOpen(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">✕</button>
            </div>

            <Step num={1} title="Pick a GRI question">
              <QuestionPicker
                questions={questions}
                selected={pickedQuestion}
                onSelect={q => {
                  setPickedQuestion(q)
                  if (!q) { setPickedModes(['Manual']); return }
                  const defaultMode = q.entry_mode_default as Mode
                  const hasCalc = findCalculator(q)
                  const modes: Mode[] = ['Manual']
                  if (hasCalc) modes.push('Calculator')
                  if (defaultMode === 'Connector') modes.push('Connector')
                  setPickedModes(modes)
                }}
              />
            </Step>

            <Step num={2} title="What kind of answer does this disclosure need?" disabled={!pickedQuestion}>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: 'numeric',   label: 'Numeric',   desc: 'A value with a unit (e.g. tCO₂e, MWh)', icon: CalcIcon },
                  { key: 'narrative', label: 'Narrative', desc: 'Long-form text (GRI 2/3 management approach)', icon: FileText },
                ] as Array<{ key: ResponseType; label: string; desc: string; icon: typeof CalcIcon }>).map(opt => {
                  const active = pickedResponseType === opt.key
                  const Icon = opt.icon
                  return (
                    <button key={opt.key} type="button" onClick={() => setPickedResponseType(opt.key)}
                      className={`text-left p-3 rounded-[var(--radius-md)] border ${active ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]' : 'border-[var(--border-default)] hover:bg-[var(--bg-secondary)]'}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className="w-3.5 h-3.5" style={{ color: active ? 'var(--color-brand-strong)' : 'var(--text-secondary)' }} />
                        <span className={`text-[var(--text-xs)] font-semibold ${active ? 'text-[var(--color-brand-strong)]' : 'text-[var(--text-primary)]'}`}>{opt.label}</span>
                      </div>
                      <div className="text-[10px] text-[var(--text-tertiary)]">{opt.desc}</div>
                    </button>
                  )
                })}
              </div>
            </Step>

            <Step num={3} title="Which plant / entity does this data come from?" disabled={!pickedQuestion}>
              <select
                value={pickedEntity}
                onChange={e => setPickedEntity(e.target.value)}
                disabled={!pickedQuestion}
                className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] disabled:opacity-50"
              >
                <option value="">Select entity…</option>
                {entities
                  .filter(e => e.type === 'plant' || e.type === 'office' || e.type === 'subsidiary')
                  .map(e => {
                    const path = orgStore.pathOf(entities, e.id).slice(0, -1).map(p => p.name).join(' › ')
                    return <option key={e.id} value={e.id}>{path ? `${path} › ` : ''}{e.name}</option>
                  })}
              </select>
            </Step>

            <Step num={4} title="Who should answer it?" disabled={!pickedEntity}>
              {pickedEntity ? (
                <AssigneePicker
                  entityId={pickedEntity}
                  members={members}
                  entities={entities}
                  value={pickedMember}
                  onChange={setPickedMember}
                />
              ) : (
                <div className="text-[var(--text-xs)] text-[var(--text-tertiary)] italic">Pick an entity first.</div>
              )}
            </Step>

            <Step num={5} title="How can they answer it?" disabled={!pickedQuestion || pickedResponseType === 'narrative'}>
              <p className="text-[10px] text-[var(--text-tertiary)] mb-2">
                Tick every method the assignee is allowed to use. They pick one at answer time.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {MODES.map(m => {
                  const Icon = m === 'Manual' ? PencilLine : m === 'Calculator' ? CalcIcon : Plug
                  const hasCalc = pickedQuestion ? findCalculator(pickedQuestion) : null
                  const disabled = m === 'Calculator' && !hasCalc
                  const active = pickedModes.includes(m)
                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleMode(m)}
                      className={`relative px-3 py-3 rounded-[var(--radius-md)] border text-[var(--text-xs)] font-semibold flex flex-col items-center gap-1 transition-colors ${
                        active ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]'
                               : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {active && (
                        <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[var(--color-brand)] text-white flex items-center justify-center text-[9px]">✓</span>
                      )}
                      <Icon className="w-4 h-4" />
                      {m}
                      {disabled && <span className="text-[9px] font-normal text-[var(--text-tertiary)]">no calculator</span>}
                    </button>
                  )
                })}
              </div>
              {pickedModes.length > 1 && (
                <p className="text-[10px] text-[var(--color-brand)] mt-2">
                  Assignee will see a tab switcher to choose between {pickedModes.join(' · ')}.
                </p>
              )}
            </Step>

            <Step num={6} title="Deadline (optional)">
              <input
                type="date"
                value={pickedDue}
                onChange={e => setPickedDue(e.target.value)}
                className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]"
              />
            </Step>

            <div className="flex gap-2 mt-6 pt-4 border-t border-[var(--border-subtle)]">
              <button
                onClick={saveAssignment}
                disabled={!pickedQuestion || !pickedEntity || !pickedMember}
                className="flex-1 px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-sm)] font-semibold disabled:opacity-50 hover:bg-[var(--color-brand-strong)] transition-colors"
              >
                Create assignment
              </button>
              <button onClick={() => setDrawerOpen(false)} className="px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] text-[var(--text-sm)] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'ok' | 'pending' | 'draft' }) {
  const bg = tone === 'ok' ? 'var(--accent-green-light)' : tone === 'pending' ? 'var(--accent-blue-light)' : tone === 'draft' ? 'var(--accent-amber-light)' : 'var(--bg-primary)'
  const fg = tone === 'ok' ? 'var(--status-ok)' : tone === 'pending' ? 'var(--status-pending)' : tone === 'draft' ? 'var(--status-draft)' : 'var(--text-primary)'
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] p-4" style={{ background: bg }}>
      <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: fg, opacity: 0.8 }}>{label}</div>
      <div className="text-[22px] font-bold tabular-nums mt-1" style={{ color: fg }}>{value}</div>
    </div>
  )
}

function Step({ num, title, disabled, children }: { num: number; title: string; disabled?: boolean; children: React.ReactNode }) {
  return (
    <div className={`mb-5 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-5 h-5 rounded-full bg-[var(--color-brand)] text-white text-[10px] font-bold flex items-center justify-center">{num}</span>
        <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function QuestionPicker({ questions, selected, onSelect }: {
  questions: NexusQuestionnaireItem[]
  selected: NexusQuestionnaireItem | null
  onSelect: (q: NexusQuestionnaireItem) => void
}) {
  const [q, setQ] = useState('')

  // The seed keeps one `questionnaire_item` row per (year × entity × breakdown),
  // so the raw list has ~2000 rows for only ~350 unique disclosures. Dedupe by
  // (gri_code, line_item) for the picker — the assignment only needs the code.
  const uniqueQuestions = useMemo(() => {
    const seen = new Set<string>()
    const out: NexusQuestionnaireItem[] = []
    for (const x of questions) {
      const key = `${x.gri_code}|${x.line_item}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(x)
    }
    return out
  }, [questions])

  const filtered = useMemo(() => {
    if (!q) return uniqueQuestions.slice(0, 50)
    const s = q.toLowerCase()
    return uniqueQuestions.filter(x =>
      x.gri_code.toLowerCase().includes(s) ||
      x.line_item.toLowerCase().includes(s) ||
      x.section.toLowerCase().includes(s)
    ).slice(0, 50)
  }, [q, uniqueQuestions])

  return (
    <div>
      {selected ? (
        <div className="p-3 rounded-[var(--radius-md)] border border-[var(--color-brand)] bg-[var(--color-brand-soft)]/40">
          <div className="text-[10px] font-semibold text-[var(--color-brand-strong)] uppercase tracking-wider">{selected.gri_code}</div>
          <div className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mt-0.5">{selected.line_item}</div>
          <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{selected.section} · {selected.subsection}</div>
          <button onClick={() => onSelect(null as any)} className="mt-2 text-[var(--text-xs)] text-[var(--color-brand)] hover:underline">Change question</button>
        </div>
      ) : (
        <>
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              autoFocus
              placeholder="Search GRI code or line item…"
              className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]"
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)]">
            {filtered.map(x => (
              <button
                key={x.id}
                type="button"
                onClick={() => onSelect(x)}
                className="w-full px-3 py-2 text-left hover:bg-[var(--bg-primary)] border-b border-[var(--border-subtle)] last:border-b-0"
              >
                <div className="text-[9px] font-semibold text-[var(--color-brand)]">{x.gri_code}</div>
                <div className="text-[var(--text-xs)] font-medium text-[var(--text-primary)] truncate">{x.line_item}</div>
              </button>
            ))}
            {filtered.length === 0 && <div className="p-4 text-center text-[var(--text-xs)] text-[var(--text-tertiary)]">No matches</div>}
          </div>
        </>
      )}
    </div>
  )
}

function AssigneePicker({ entityId, members, entities, value, onChange }: {
  entityId: string
  members: OrgMember[]
  entities: OrgEntity[]
  value: string
  onChange: (id: string) => void
}) {
  const inScope = useMemo(() => {
    const ids = new Set(orgStore.descendantIds(entities, entityId))
    const path = new Set(orgStore.pathOf(entities, entityId).map(p => p.id))
    return members.filter(m => ids.has(m.entityId) || path.has(m.entityId))
  }, [entityId, members, entities])

  if (inScope.length === 0) {
    return (
      <div className="p-3 rounded-[var(--radius-md)] border border-dashed border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-xs)] text-[var(--text-tertiary)]">
        <AlertCircle className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
        No members on this entity yet. Add one in <strong>Onboarding</strong> first.
      </div>
    )
  }

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]"
    >
      <option value="">Select assignee…</option>
      {inScope.map(m => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
    </select>
  )
}



// ─── Kanban view ────────────────────────────────────────────

const KANBAN_COLS: Array<{ status: QuestionAssignment['status']; label: string; color: string; bg: string }> = [
  { status: 'not_started', label: 'Not started', color: 'var(--text-tertiary)', bg: 'var(--bg-tertiary)' },
  { status: 'in_progress', label: 'In progress', color: 'var(--status-draft)',  bg: 'var(--accent-amber-light)' },
  { status: 'submitted',   label: 'Submitted',   color: 'var(--status-pending)', bg: 'var(--accent-blue-light)' },
  { status: 'reviewed',    label: 'Reviewed',    color: 'var(--accent-purple)',  bg: 'var(--accent-purple-light)' },
  { status: 'approved',    label: 'Approved',    color: 'var(--status-ok)',     bg: 'var(--accent-green-light)' },
  { status: 'rejected',    label: 'Rejected',    color: 'var(--status-reject)', bg: 'var(--accent-red-light)' },
]

function KanbanView({
  assignments, entityById, onRemove,
}: {
  assignments: QuestionAssignment[]
  entityById: Map<string, OrgEntity>
  onRemove: (id: string) => void
}) {
  const grouped = useMemo(() => {
    const m = new Map<QuestionAssignment['status'], QuestionAssignment[]>()
    for (const c of KANBAN_COLS) m.set(c.status, [])
    for (const a of assignments) m.get(a.status)?.push(a)
    return m
  }, [assignments])

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
      {KANBAN_COLS.map((col, ci) => {
        const cards = grouped.get(col.status) ?? []
        return (
          <motion.div
            key={col.status}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.03 }}
            className="flex-shrink-0 w-[300px] surface-paper overflow-hidden flex flex-col max-h-[calc(100vh-280px)]"
          >
            <header className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center gap-2 flex-shrink-0" style={{ background: col.bg }}>
              <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
              <span className="text-[11.5px] font-bold uppercase tracking-[0.1em]" style={{ color: col.color }}>{col.label}</span>
              <span className="ml-auto text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-full bg-white/70" style={{ color: col.color }}>{cards.length}</span>
            </header>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {cards.length === 0 ? (
                <div className="py-6 text-center text-[11px] text-[var(--text-tertiary)] italic">No assignments in this lane</div>
              ) : (
                cards.map((a, i) => <KanbanCard key={a.id} a={a} entity={entityById.get(a.entityId)} index={i} onRemove={() => onRemove(a.id)} accent={col.color} />)
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function KanbanCard({ a, entity, index, onRemove, accent }: {
  a: QuestionAssignment
  entity: OrgEntity | undefined
  index: number
  onRemove: () => void
  accent: string
}) {
  const modes = a.entry_modes ?? ['Manual']
  const now = Date.now()
  const overdue = a.due_date && new Date(a.due_date).getTime() < now && a.status !== 'approved'

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.015 }}
      className="rounded-[8px] bg-[var(--bg-primary)] border border-[var(--border-subtle)] p-3 hover:shadow-[var(--shadow-sm)] hover:border-[var(--border-strong)] transition-all group cursor-pointer relative"
    >
      <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full" style={{ background: accent }} />
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="font-mono text-[10px] font-bold text-[var(--color-brand)] tracking-[0.02em]">{a.gri_code}</span>
        <button onClick={(e) => { e.stopPropagation(); onRemove() }} className="w-5 h-5 rounded text-[var(--text-tertiary)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red-light)] opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <div className="text-[12.5px] font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 tracking-[-0.005em]">{a.line_item}</div>
      <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
        {entity && (
          <span className="inline-flex items-center gap-1 text-[10.5px] text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded">
            <Factory className="w-2.5 h-2.5" />{entity.name}
          </span>
        )}
        {a.response_type === 'narrative' && (
          <span className="inline-flex items-center gap-1 text-[10.5px] text-[var(--accent-purple)] bg-[var(--accent-purple-light)] px-1.5 py-0.5 rounded font-semibold">
            <FileText className="w-2.5 h-2.5" />Narrative
          </span>
        )}
        {modes.length > 0 && modes[0] && (() => {
          const Icon = modes[0] === 'Manual' ? PencilLine : modes[0] === 'Calculator' ? CalcIcon : Plug
          return (
            <span className="inline-flex items-center gap-0.5 text-[10.5px] text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded">
              <Icon className="w-2.5 h-2.5" />{modes[0]}
            </span>
          )
        })()}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8.5px] font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-strong))' }}>
            {a.assigneeName.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-[10.5px] text-[var(--text-secondary)] truncate font-medium">{a.assigneeName}</span>
        </div>
        {a.due_date && (
          <span className={`inline-flex items-center gap-0.5 text-[10px] tabular-nums flex-shrink-0 font-semibold ${overdue ? 'text-[var(--accent-red)]' : 'text-[var(--text-tertiary)]'}`}>
            <Calendar className="w-2.5 h-2.5" />
            {new Date(a.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ─── Tree view — by entity hierarchy (enterprise refresh) ───

const TREE_SPRING = { type: 'spring' as const, stiffness: 320, damping: 30, mass: 0.7 }

function TreeView({
  assignments, entities, onRemove,
}: {
  assignments: QuestionAssignment[]
  entities: OrgEntity[]
  onRemove: (id: string) => void
}) {
  const rootIds = entities.filter(e => !e.parentId).map(e => e.id)
  const byParent = useMemo(() => {
    const m = new Map<string | null, OrgEntity[]>()
    for (const e of entities) {
      const k = e.parentId ?? null
      const arr = m.get(k) ?? []
      arr.push(e)
      m.set(k, arr)
    }
    return m
  }, [entities])

  const byEntity = useMemo(() => {
    const m = new Map<string, QuestionAssignment[]>()
    for (const a of assignments) {
      const arr = m.get(a.entityId) ?? []
      arr.push(a)
      m.set(a.entityId, arr)
    }
    return m
  }, [assignments])

  if (rootIds.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] bg-[var(--bg-primary)] py-14 text-center">
        <GitBranch className="w-10 h-10 mx-auto text-[var(--text-tertiary)] mb-2" />
        <div className="text-[14px] text-[var(--text-tertiary)]">No entity tree yet — run Onboarding first.</div>
      </div>
    )
  }

  return (
    <div className="surface-paper p-4 relative overflow-hidden">
      {/* ambient top-right wash */}
      <div aria-hidden className="pointer-events-none absolute -top-20 -right-24 w-[360px] h-[360px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(27,107,123,0.06), transparent 60%)' }} />
      <div className="relative space-y-1">
        {rootIds.map((id, i) => (
          <TreeNode key={id} entityId={id} depth={0} byParent={byParent} byEntity={byEntity} entities={entities} onRemove={onRemove} index={i} />
        ))}
      </div>
    </div>
  )
}

/** Entity icon painted into a filled rounded square with tint matching the type. */
function EntityGlyph({ type }: { type: string }) {
  const style = {
    group:         { fg: '#1B6B7B', bg: 'rgba(27,107,123,0.12)',  label: 'GROUP' },
    business_unit: { fg: '#5E35B1', bg: 'rgba(94,53,177,0.12)',   label: 'BU' },
    subsidiary:    { fg: '#1565C0', bg: 'rgba(21,101,192,0.12)',  label: 'SUB' },
    plant:         { fg: '#2E7D32', bg: 'rgba(46,125,50,0.12)',   label: 'PLANT' },
    office:        { fg: '#E6A817', bg: 'rgba(230,168,23,0.12)',  label: 'OFFICE' },
  }[type as string] ?? { fg: '#1B6B7B', bg: 'rgba(27,107,123,0.1)', label: '—' }

  return (
    <div
      className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0 relative"
      style={{ background: style.bg, color: style.fg }}
    >
      <Factory className="w-[15px] h-[15px]" />
    </div>
  )
}

/** Stacked distribution bar: green approved · blue review · amber open · red reject. */
function DistributionBar({
  approved, inReview, open, rejected, total,
}: { approved: number; inReview: number; open: number; rejected: number; total: number }) {
  if (total === 0) {
    return (
      <div className="w-[160px] h-[6px] rounded-full bg-[var(--bg-tertiary)]/60 overflow-hidden" />
    )
  }
  const segs = [
    { pct: (approved / total) * 100,  color: '#2E7D32', title: `${approved} approved` },
    { pct: (inReview / total) * 100,  color: '#1565C0', title: `${inReview} in review` },
    { pct: (open / total) * 100,      color: '#E6A817', title: `${open} open` },
    { pct: (rejected / total) * 100,  color: '#C62828', title: `${rejected} rejected` },
  ].filter(s => s.pct > 0)
  return (
    <div className="w-[160px] h-[6px] rounded-full bg-[var(--bg-tertiary)]/40 overflow-hidden flex" title={segs.map(s => s.title).join(' · ')}>
      {segs.map((s, i) => (
        <motion.div
          key={i}
          initial={{ width: 0 }} animate={{ width: `${s.pct}%` }} transition={{ duration: 0.6, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
          className="h-full"
          style={{ background: s.color, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15)` }}
        />
      ))}
    </div>
  )
}

function TreeNode({
  entityId, depth, byParent, byEntity, entities, onRemove, index,
}: {
  entityId: string
  depth: number
  byParent: Map<string | null, OrgEntity[]>
  byEntity: Map<string, QuestionAssignment[]>
  entities: OrgEntity[]
  onRemove: (id: string) => void
  index: number
}) {
  const [open, setOpen] = useState(depth < 2)
  const entity = entities.find(e => e.id === entityId)
  if (!entity) return null
  const children = byParent.get(entityId) ?? []
  const allIds = new Set(orgStore.descendantIds(entities, entityId))
  const allAssignments = Array.from(allIds).flatMap(id => byEntity.get(id) ?? [])
  const directAssignments = byEntity.get(entityId) ?? []
  const isExpandable = children.length > 0 || directAssignments.length > 0

  const bucket = {
    total: allAssignments.length,
    approved: allAssignments.filter(a => a.status === 'approved').length,
    inReview: allAssignments.filter(a => a.status === 'submitted' || a.status === 'reviewed').length,
    open:     allAssignments.filter(a => a.status === 'not_started' || a.status === 'in_progress').length,
    rejected: allAssignments.filter(a => a.status === 'rejected').length,
  }
  const pct = bucket.total === 0 ? 0 : Math.round((bucket.approved / bucket.total) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...TREE_SPRING, delay: Math.min(index * 0.02, 0.12) }}
      style={{ paddingLeft: depth === 0 ? 0 : 22 }}
      className="relative"
    >
      {/* indent guide */}
      {depth > 0 && (
        <span
          aria-hidden
          className="absolute left-[10px] top-0 bottom-0 w-px"
          style={{ background: 'linear-gradient(to bottom, var(--border-subtle) 0%, var(--border-subtle) 70%, transparent 100%)' }}
        />
      )}

      {/* row */}
      <motion.button
        type="button"
        whileHover={isExpandable ? { x: 1 } : undefined}
        onClick={() => isExpandable && setOpen(o => !o)}
        disabled={!isExpandable}
        className="w-full group relative flex items-center gap-3 pl-2 pr-3 py-2.5 rounded-[10px] text-left transition-colors hover:bg-[var(--bg-secondary)]"
      >
        {/* chevron */}
        <span className="w-5 flex justify-center flex-shrink-0">
          {isExpandable ? (
            <motion.span animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            </motion.span>
          ) : null}
        </span>

        <EntityGlyph type={entity.type as string} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13.5px] font-semibold text-[var(--text-primary)] truncate tracking-[-0.005em]">
              {entity.name}
            </span>
            <span
              className="text-[9.5px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-[5px]"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
            >
              {entity.type.replace('_', ' ')}
            </span>
            {entity.country && (
              <span className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                · {entity.country}
              </span>
            )}
          </div>
          {bucket.total > 0 && (
            <div className="mt-1 flex items-center gap-2 text-[10.5px] text-[var(--text-tertiary)]">
              {bucket.approved > 0 && <span className="text-[var(--status-ok)] font-semibold">{bucket.approved} approved</span>}
              {bucket.inReview > 0 && <span className="text-[var(--status-pending)] font-semibold">{bucket.inReview} in review</span>}
              {bucket.open > 0     && <span className="text-[var(--status-draft)]  font-semibold">{bucket.open} open</span>}
              {bucket.rejected > 0 && <span className="text-[var(--status-reject)] font-semibold">{bucket.rejected} rejected</span>}
            </div>
          )}
        </div>

        {/* distribution + percentage */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <DistributionBar approved={bucket.approved} inReview={bucket.inReview} open={bucket.open} rejected={bucket.rejected} total={bucket.total} />
          <span
            className="text-[13px] font-bold tabular-nums tracking-[-0.01em] w-10 text-right"
            style={{ color: pct === 100 ? 'var(--status-ok)' : pct >= 50 ? 'var(--color-brand)' : pct > 0 ? 'var(--status-draft)' : 'var(--text-quaternary)' }}
          >
            {pct}%
          </span>
          <span className="text-[10.5px] tabular-nums text-[var(--text-tertiary)] font-medium w-[62px] text-right">
            {bucket.approved}<span className="text-[var(--text-quaternary)]">/{bucket.total}</span>
          </span>
        </div>
      </motion.button>

      {/* children */}
      <AnimatePresence initial={false}>
        {open && isExpandable && (
          <motion.div
            key="children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5 pt-1">
              {directAssignments.map((a, i) => (
                <TreeAssignmentRow key={a.id} a={a} depth={depth + 1} onRemove={() => onRemove(a.id)} index={i} />
              ))}
              {children.map((c, i) => (
                <TreeNode key={c.id} entityId={c.id} depth={depth + 1} byParent={byParent} byEntity={byEntity} entities={entities} onRemove={onRemove} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function TreeAssignmentRow({ a, depth, onRemove, index }: {
  a: QuestionAssignment
  depth: number
  onRemove: () => void
  index: number
}) {
  const status = STATUS_META[a.status]
  const modes = a.entry_modes ?? ['Manual']
  const ModeIcon = modes[0] === 'Manual' ? PencilLine : modes[0] === 'Calculator' ? CalcIcon : Plug
  const now = Date.now()
  const overdue = a.due_date && new Date(a.due_date).getTime() < now && a.status !== 'approved'

  // Deterministic gradient per assignee name
  const hue = (a.assigneeName.charCodeAt(0) * 7 + a.assigneeName.length * 13) % 360
  const avatarGrad = `linear-gradient(135deg, hsl(${hue},55%,55%), hsl(${(hue + 40) % 360},50%,42%))`

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...TREE_SPRING, delay: Math.min(index * 0.015, 0.1) }}
      style={{ paddingLeft: depth * 22 + 12 }}
      className="relative"
    >
      {/* indent guide */}
      <span
        aria-hidden
        className="absolute left-[10px] top-0 bottom-0 w-px"
        style={{ background: 'var(--border-subtle)' }}
      />

      <motion.div
        whileHover={{ x: 1 }}
        className="group relative flex items-center gap-3 pl-3 pr-2.5 py-2 rounded-[8px] transition-colors hover:bg-[var(--bg-secondary)]"
      >
        {/* status dot with soft glow */}
        <span
          className="w-[9px] h-[9px] rounded-full flex-shrink-0 relative"
          style={{ background: status.fg, boxShadow: `0 0 0 3px ${status.bg}` }}
        >
          {a.status === 'approved' && (
            <span className="absolute inset-0 rounded-full animate-pulse-soft" style={{ background: status.fg, opacity: 0.6 }} />
          )}
        </span>

        {/* code + line-item */}
        <div className="min-w-0 flex-1 grid grid-cols-[auto_1fr] gap-x-2.5 items-center">
          <span className="font-mono text-[10.5px] font-bold text-[var(--color-brand)] tracking-[0.02em]">{a.gri_code}</span>
          <span className="text-[12.5px] text-[var(--text-primary)] truncate font-medium">{a.line_item}</span>
        </div>

        {/* mode chip */}
        <span className="hidden md:inline-flex items-center gap-1 px-1.5 h-5 rounded-[5px] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-tertiary)] font-medium flex-shrink-0">
          <ModeIcon className="w-2.5 h-2.5" />
          {modes[0]}
        </span>

        {/* assignee */}
        <div className="inline-flex items-center gap-1.5 flex-shrink-0">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[8.5px] font-bold text-white"
            style={{ background: avatarGrad, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(11,18,32,0.15)' }}
          >
            {a.assigneeName.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] font-medium truncate max-w-[80px]">{a.assigneeName.split(' ')[0]}</span>
        </div>

        {/* status pill */}
        <span
          className="inline-flex items-center gap-1 h-5 px-1.5 rounded-[5px] text-[9.5px] font-bold uppercase tracking-[0.1em] flex-shrink-0"
          style={{ background: status.bg, color: status.fg }}
        >
          {status.label}
        </span>

        {/* due date */}
        {a.due_date ? (
          <span
            className={`inline-flex items-center gap-1 text-[10.5px] tabular-nums flex-shrink-0 w-[52px] justify-end font-semibold ${
              overdue ? 'text-[var(--accent-red)]' : 'text-[var(--text-tertiary)]'
            }`}
          >
            <Calendar className="w-2.5 h-2.5" />
            {new Date(a.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
          </span>
        ) : (
          <span className="w-[52px] flex-shrink-0" />
        )}

        <button
          onClick={onRemove}
          className="w-6 h-6 rounded-[5px] text-[var(--text-tertiary)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red-light)] opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center flex-shrink-0"
          title="Remove"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </motion.div>
    </motion.div>
  )
}

// ─── Network view — force-directed org graph with glowing beams ──

interface NetworkNode {
  id: string
  name: string
  type: string
  depth: number
  x: number
  y: number
  radius: number
  childCount: number
  total: number
  approved: number
  inReview: number
  open: number
  rejected: number
}

function NetworkView({
  assignments, entities,
}: {
  assignments: QuestionAssignment[]
  entities: OrgEntity[]
}) {
  const [hoverId, setHoverId] = useState<string | null>(null)

  const { nodes, edges, viewBox } = useMemo(() => {
    const byParent = new Map<string | null, OrgEntity[]>()
    for (const e of entities) {
      const k = e.parentId ?? null
      const arr = byParent.get(k) ?? []
      arr.push(e); byParent.set(k, arr)
    }
    const depthOf = new Map<string, number>()
    const walk = (id: string | null, d: number) => {
      for (const c of byParent.get(id) ?? []) { depthOf.set(c.id, d); walk(c.id, d + 1) }
    }
    walk(null, 0)

    const byDepth = new Map<number, OrgEntity[]>()
    for (const e of entities) {
      const d = depthOf.get(e.id) ?? 0
      const arr = byDepth.get(d) ?? []
      arr.push(e); byDepth.set(d, arr)
    }
    const maxDepth = Math.max(0, ...Array.from(byDepth.keys()))

    // Tight radial layout, smaller overall. 24px base node.
    const W = 960, H = 460
    const cx = W / 2, cy = H / 2
    const ringStep = 110
    const nodeR = 22  // small, restrained

    const nodesOut: NetworkNode[] = []
    for (let d = 0; d <= maxDepth; d++) {
      const items = byDepth.get(d) ?? []
      const radius = d === 0 ? 0 : ringStep * d
      const count = items.length
      items.forEach((e, i) => {
        let x = cx, y = cy
        if (d > 0) {
          const angle = (i / count) * Math.PI * 2 - Math.PI / 2
          x = cx + Math.cos(angle) * radius
          y = cy + Math.sin(angle) * radius
        }
        const subIds = new Set<string>([e.id])
        const fanOut = (id: string) => { for (const c of byParent.get(id) ?? []) { subIds.add(c.id); fanOut(c.id) } }
        fanOut(e.id)
        const mine = assignments.filter(a => subIds.has(a.entityId))
        nodesOut.push({
          id: e.id, name: e.name, type: e.type, depth: d, x, y,
          radius: d === 0 ? nodeR + 4 : nodeR,
          childCount: (byParent.get(e.id) ?? []).length,
          total: mine.length,
          approved: mine.filter(a => a.status === 'approved').length,
          inReview: mine.filter(a => a.status === 'submitted' || a.status === 'reviewed').length,
          open:     mine.filter(a => a.status === 'not_started' || a.status === 'in_progress').length,
          rejected: mine.filter(a => a.status === 'rejected').length,
        })
      })
    }

    const edgesOut: Array<{ from: NetworkNode; to: NetworkNode }> = []
    for (const e of entities) {
      if (!e.parentId) continue
      const from = nodesOut.find(n => n.id === e.parentId)
      const to = nodesOut.find(n => n.id === e.id)
      if (from && to) edgesOut.push({ from, to })
    }
    return { nodes: nodesOut, edges: edgesOut, viewBox: `0 0 ${W} ${H}` }
  }, [entities, assignments])

  if (nodes.length === 0) {
    return (
      <div className="surface-paper py-14 text-center">
        <NetworkIcon className="w-8 h-8 mx-auto text-[var(--text-tertiary)] mb-2" />
        <div className="text-[13px] text-[var(--text-tertiary)]">No entity tree to graph yet.</div>
      </div>
    )
  }

  const BRAND = '#1B6B7B'
  const hovered = hoverId ? nodes.find(n => n.id === hoverId) : null

  return (
    <div className="surface-paper relative overflow-hidden" style={{ minHeight: 520 }}>
      {/* chrome */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
          <NetworkIcon className="w-3.5 h-3.5" />
          <span className="font-mono uppercase tracking-[0.12em]">Network</span>
          <span className="text-[var(--text-quaternary)]">·</span>
          <span>{nodes.length} nodes · {edges.length} links</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[var(--text-tertiary)]">
          <LegendItem label="Group" />
          <LegendItem label="BU" />
          <LegendItem label="Subsidiary" />
          <LegendItem label="Plant" />
          <LegendItem label="Office" />
        </div>
      </div>

      <div className="relative">
        <svg viewBox={viewBox} className="w-full" style={{ height: 460, display: 'block', overflow: 'visible' }} preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="node-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0B1220" floodOpacity="0.12" />
            </filter>
          </defs>

          {/* edges — stop at node border, not centre, so lines don't poke through circles */}
          {edges.map((e, i) => {
            const dx = e.to.x - e.from.x
            const dy = e.to.y - e.from.y
            const len = Math.max(1, Math.sqrt(dx * dx + dy * dy))
            const ux = dx / len, uy = dy / len
            const x1 = e.from.x + ux * e.from.radius
            const y1 = e.from.y + uy * e.from.radius
            const x2 = e.to.x - ux * (e.to.radius + 4)  // +4 so arc doesn't overlap
            const y2 = e.to.y - uy * (e.to.radius + 4)
            const isHovered = hoverId === e.to.id || hoverId === e.from.id
            return (
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isHovered ? BRAND : 'var(--border-default)'}
                strokeWidth={isHovered ? 1.25 : 1}
                style={{ transition: 'all 180ms' }}
              />
            )
          })}

          {/* nodes + radial labels — all in the same SVG so they stay pixel-aligned */}
          {nodes.map((n, i) => {
            const W = 960, H = 460
            const cx = W / 2, cy = H / 2
            // Radial direction from centre → node. For the root itself, default to straight down.
            const vx = n.x - cx
            const vy = n.y - cy
            const mag = Math.sqrt(vx * vx + vy * vy)
            const ux = mag === 0 ? 0 : vx / mag
            const uy = mag === 0 ? 1 : vy / mag
            // Place the label outside the progress arc (node.radius + 4px arc + 14px gap)
            const labelDist = n.radius + 22
            const lx = n.x + ux * labelDist
            const ly = n.y + uy * labelDist
            // text-anchor based on horizontal position relative to centre; tolerance for "almost centre"
            const anchor: 'start' | 'middle' | 'end' =
              Math.abs(ux) < 0.35 ? 'middle' : ux > 0 ? 'start' : 'end'
            const label = n.name.length > 20 ? n.name.slice(0, 18) + '…' : n.name

            return (
              <g key={n.id}>
                <NetworkNodeSvg
                  node={n}
                  brand={BRAND}
                  hovered={hoverId === n.id}
                  onHover={setHoverId}
                  index={i}
                />
                {!n.depth ? null : (
                  <g style={{ pointerEvents: 'none' }}>
                    <text
                      x={lx}
                      y={ly}
                      textAnchor={anchor}
                      dominantBaseline="central"
                      fontSize={11}
                      fontWeight={600}
                      fill="var(--text-primary)"
                      style={{ letterSpacing: '-0.005em' }}
                    >
                      {label}
                    </text>
                    <text
                      x={lx}
                      y={ly + 12}
                      textAnchor={anchor}
                      dominantBaseline="central"
                      fontSize={10}
                      fill="var(--text-tertiary)"
                      style={{ fontFeatureSettings: '"tnum"' }}
                    >
                      {n.total === 0 ? n.type.replace('_', ' ') : `${n.approved}/${n.total}`}
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* Root label — always centred below the root */}
          {(() => {
            const root = nodes.find(n => n.depth === 0)
            if (!root) return null
            return (
              <g style={{ pointerEvents: 'none' }}>
                <text
                  x={root.x}
                  y={root.y + root.radius + 18}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={12}
                  fontWeight={700}
                  fill="var(--text-primary)"
                  style={{ letterSpacing: '-0.005em' }}
                >
                  {root.name.length > 22 ? root.name.slice(0, 20) + '…' : root.name}
                </text>
                <text
                  x={root.x}
                  y={root.y + root.radius + 32}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={10}
                  fill="var(--text-tertiary)"
                  style={{ fontFeatureSettings: '"tnum"' }}
                >
                  {root.total === 0 ? 'Org root' : `${root.approved}/${root.total}`}
                </text>
              </g>
            )
          })()}
        </svg>
      </div>

      {/* hover tooltip — flat card under the SVG, not floating */}
      <div className="border-t border-[var(--border-subtle)] px-5 py-3 min-h-[56px] flex items-center">
        {hovered ? (
          <div className="flex items-center gap-5 flex-wrap">
            <div>
              <div className="text-[13.5px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">{hovered.name}</div>
              <div className="text-[10.5px] text-[var(--text-tertiary)] uppercase tracking-[0.12em] mt-0.5 font-semibold">{hovered.type.replace('_', ' ')}</div>
            </div>
            <span className="h-8 w-px bg-[var(--border-subtle)]" />
            <div className="flex items-center gap-4 text-[11.5px] font-semibold tabular-nums">
              <span className="text-[var(--status-ok)]">{hovered.approved} approved</span>
              <span className="text-[var(--status-pending)]">{hovered.inReview} review</span>
              <span className="text-[var(--status-draft)]">{hovered.open} open</span>
              {hovered.rejected > 0 && <span className="text-[var(--status-reject)]">{hovered.rejected} rejected</span>}
            </div>
            <span className="h-8 w-px bg-[var(--border-subtle)]" />
            <div className="text-[15px] font-semibold tabular-nums tracking-[-0.01em] text-[var(--text-primary)]">
              {hovered.total === 0 ? '—' : Math.round((hovered.approved / hovered.total) * 100) + '%'}
            </div>
          </div>
        ) : (
          <div className="text-[11.5px] text-[var(--text-tertiary)]">Hover a node for detail.</div>
        )}
      </div>
    </div>
  )
}

function LegendItem({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--text-quaternary)' }} />
      {label}
    </span>
  )
}

function NetworkNodeSvg({ node, brand, hovered, onHover, index }: {
  node: NetworkNode
  brand: string
  hovered: boolean
  onHover: (id: string | null) => void
  index: number
}) {
  const pct = node.total === 0 ? 0 : (node.approved / node.total)
  const ringR = node.radius + 4
  const circumference = 2 * Math.PI * ringR
  const isRoot = node.depth === 0

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: 'pointer' }}
    >
      {/* subtle hover ring */}
      {hovered && (
        <circle
          cx={node.x} cy={node.y}
          r={node.radius + 8}
          fill="none"
          stroke={brand}
          strokeOpacity="0.15"
          strokeWidth={8}
        />
      )}
      {/* body */}
      <circle
        cx={node.x} cy={node.y}
        r={node.radius}
        fill={isRoot ? brand : 'var(--bg-primary)'}
        stroke={isRoot ? brand : (hovered ? brand : 'var(--border-strong)')}
        strokeWidth={isRoot ? 0 : (hovered ? 1.5 : 1)}
        style={{ filter: 'url(#node-shadow)', transition: 'stroke 180ms, stroke-width 180ms' }}
      />
      {/* progress arc — thin, brand only */}
      {node.total > 0 && !isRoot && (
        <circle
          cx={node.x} cy={node.y}
          r={ringR}
          fill="none"
          stroke={brand}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeDasharray={`${pct * circumference} ${circumference}`}
          transform={`rotate(-90 ${node.x} ${node.y})`}
          opacity={0.85}
        />
      )}
      {/* centered % for root only — otherwise no text inside */}
      {isRoot && node.total > 0 && (
        <text
          x={node.x} y={node.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={11}
          fontWeight={700}
          fill="white"
          style={{ pointerEvents: 'none', fontFeatureSettings: '"tnum"' }}
        >
          {Math.round((node.approved / node.total) * 100) + '%'}
        </text>
      )}
    </motion.g>
  )
}
