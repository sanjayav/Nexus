import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle, Clock, AlertCircle, FileText, Package, GitBranch, ChevronRight, User, Calendar, ArrowRight, ListChecks, Workflow, ArrowLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { mockData } from '../data/mockData'
import { fmt, useFormat, useStrings } from '../i18n'
import { moduleHubStrings } from '../i18n/pages/moduleHub'
import { moduleCatalogStrings } from '../i18n/pages/moduleCatalog'
import { PageHeader, Card, CardHeader, Button, Badge, EmptyState, Tone } from '../components/ui'

type StepStatus = 'completed' | 'in-progress' | 'pending'

const PRIORITY_TONE: Record<string, Tone> = { high: 'danger', medium: 'warning', low: 'info' }
const VERSION_TONE: Record<string, Tone> = { 'In Review': 'warning', Approved: 'success', Published: 'neutral', Open: 'info' }

export default function ModuleHub() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const navigate = useNavigate()
  const s = useStrings(moduleHubStrings)
  const c = useStrings(moduleCatalogStrings)
  const f = useFormat()

  const module = mockData.modules.find(m => m.id === moduleId)
  const moduleTasks = mockData.moduleTasks.filter(t => t.moduleId === moduleId)
  const versions = mockData.submissionVersions.filter(v => v.moduleId === moduleId)

  if (!module) {
    return (
      <Card>
        <EmptyState
          icon={FileText}
          title={c.notFound}
          description={c.notFoundBody}
          action={<Button icon={ArrowLeft} onClick={() => navigate('/modules')}>{c.backToModules}</Button>}
        />
      </Card>
    )
  }

  const progressSteps: { key: keyof typeof s.steps; status: StepStatus; date: string | null }[] = [
    { key: 'upload', status: 'completed', date: '2024-11-01' },
    { key: 'validation', status: module.validationsPassed ? 'completed' : 'in-progress', date: '2024-11-02' },
    { key: 'dma', status: module.coverage > 80 ? 'completed' : 'pending', date: module.coverage > 80 ? '2024-11-05' : null },
    { key: 'pack', status: module.state === 'Published' ? 'completed' : 'pending', date: module.state === 'Published' ? '2024-11-08' : null },
    { key: 'rollup', status: module.state === 'Published' ? 'completed' : 'pending', date: module.state === 'Published' ? '2024-11-10' : null },
  ]

  const actionCards: { key: keyof typeof s.actions; icon: LucideIcon; onClick?: () => void }[] = [
    { key: 'questionnaire', icon: FileText, onClick: () => navigate(`/modules/${moduleId}/questionnaire`) },
    { key: 'review', icon: CheckCircle, onClick: () => navigate(`/modules/${moduleId}/review`) },
    { key: 'pack', icon: Package },
    { key: 'request', icon: AlertCircle },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={s.eyebrow}
        title={c.titles[module.id] ?? module.title}
        description={c.descriptions[module.id] ?? module.description}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(`/modules/${moduleId}/review`)}>{s.openReview}</Button>
            <Button variant="primary" iconRight={ChevronRight} onClick={() => navigate(`/modules/${moduleId}/questionnaire`)}>
              {s.continueQuestionnaire}
            </Button>
          </>
        }
      />

      {/* Progress pipeline */}
      <Card>
        <CardHeader title={s.pipeline} description={s.pipelineDesc} icon={Workflow} />
        <ol className="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-0">
          {progressSteps.map((step, index) => (
            <li key={step.key} className="relative flex sm:flex-col items-center sm:items-center gap-3 sm:gap-2.5 sm:text-center">
              {index < progressSteps.length - 1 && (
                <span
                  aria-hidden
                  className={clsx(
                    'hidden sm:block absolute top-3 left-[calc(50%+18px)] right-[calc(-50%+18px)] h-px',
                    step.status === 'completed' ? 'bg-emerald-300' : 'bg-line',
                  )}
                />
              )}
              <StepIcon status={step.status} />
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-900">{s.steps[step.key]}</div>
                <div className="text-xs text-zinc-500 tabular mt-0.5">
                  {step.date ? f.date(step.date) : s.stepStatus[step.status]}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks */}
        <Card className="lg:col-span-2">
          <CardHeader
            title={s.tasks}
            description={s.tasksDesc}
            icon={ListChecks}
            action={<Badge tone={moduleTasks.length ? 'info' : 'neutral'}>{fmt(s.activeCount, { count: moduleTasks.length })}</Badge>}
          />
          {moduleTasks.length > 0 ? (
            <ul className="divide-y divide-line -mx-5 sm:-mx-6 border-t border-line">
              {moduleTasks.map(task => (
                <li key={task.id} className="px-5 sm:px-6 py-4 hover:bg-zinc-50/70 transition-colors">
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <Badge tone={PRIORITY_TONE[task.priority] ?? 'neutral'} dot>{s.priority[task.priority] ?? task.priority}</Badge>
                    <Badge>{s.taskType[task.type] ?? task.type}</Badge>
                  </div>
                  <div className="text-sm font-medium text-zinc-900">{task.title}</div>
                  <p className="text-[13px] text-zinc-500 mt-0.5">{task.description}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
                    <div className="flex flex-wrap items-center gap-4 min-w-0">
                      <span className="flex items-center gap-1.5 min-w-0" title={s.assignee}>
                        <User className="w-3.5 h-3.5 shrink-0" />
                        <code className="font-mono truncate">{task.assignee}</code>
                      </span>
                      <span className="flex items-center gap-1.5 tabular">
                        <Calendar className="w-3.5 h-3.5" />
                        {fmt(s.due, { date: f.date(task.dueDate) })}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" iconRight={ArrowRight}>{s.view}</Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={CheckCircle} title={s.noTasks} description={s.noTasksBody} />
          )}
        </Card>

        {/* Versions */}
        <Card>
          <CardHeader title={s.versions} description={s.versionsDesc} icon={GitBranch} />
          {versions.length > 0 ? (
            <div className="space-y-3">
              {versions.map((version, index) => (
                <div
                  key={version.submissionId}
                  className={clsx(
                    'rounded-xl border p-4 transition-colors hover:border-zinc-300',
                    index === 0 ? 'border-zinc-300 bg-zinc-50/60' : 'border-line',
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-900">{version.version}</span>
                      {index === 0 && <span className="text-xs text-zinc-500">{s.latest}</span>}
                    </div>
                    <Badge tone={VERSION_TONE[version.state] ?? 'neutral'}>{c.state[version.state] ?? version.state}</Badge>
                  </div>
                  <dl className="text-xs text-zinc-500 space-y-1">
                    <div className="flex gap-2 min-w-0"><dt className="shrink-0">{s.cid}</dt><dd className="font-mono text-zinc-700 truncate">{version.payloadCID.slice(0, 12)}…</dd></div>
                    <div className="flex gap-2"><dt>{s.root}</dt><dd className="font-mono text-zinc-700">{version.merkleRoot}</dd></div>
                    <div className="tabular">{f.date(version.createdAt)}</div>
                  </dl>
                  <Button variant="ghost" size="sm" className="mt-2 -ml-2">{s.viewDiff}</Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={GitBranch} title={s.noVersions} description={s.noVersionsBody} />
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {actionCards.map(({ key, icon: Icon, onClick }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            className="group text-left bg-surface border border-line rounded-card shadow-card p-4 sm:p-5 transition-[box-shadow,border-color] hover:border-zinc-300 hover:shadow-pop focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center mb-3 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-sm font-medium text-zinc-900">{s.actions[key].title}</div>
            <div className="text-[13px] text-zinc-500 mt-0.5">{s.actions[key].body}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'completed') {
    return (
      <span className="relative z-10 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 ring-4 ring-white">
        <CheckCircle className="w-3.5 h-3.5" />
      </span>
    )
  }
  if (status === 'in-progress') {
    return (
      <span className="relative z-10 w-6 h-6 rounded-full bg-amber-50 text-amber-600 border border-amber-300 flex items-center justify-center shrink-0 ring-4 ring-white">
        <Clock className="w-3.5 h-3.5" />
      </span>
    )
  }
  return <span className="relative z-10 w-6 h-6 rounded-full border-2 border-zinc-200 bg-white shrink-0 ring-4 ring-white" />
}
