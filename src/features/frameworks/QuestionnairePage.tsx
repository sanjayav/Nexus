import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowLeft,
  Building2,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CornerUpLeft,
  Eye,
  FileSpreadsheet,
  FileText,
  Lock,
  Mail,
  MessageSquare,
  Paperclip,
  Send,
  Sparkles,
  Unlock,
} from 'lucide-react'
import clsx from 'clsx'
import { useAccess } from '@/features/access/AccessContext'
import { accessStrings } from '@/features/access/access.strings'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { moduleCatalogStrings, useFrameworkLabels } from '@/lib/i18n/shared/frameworkCatalog'
import { STATUS_TONE, useWorkflowText } from '@/lib/i18n/shared/workflow'
import { toast } from '@/lib/hooks/useToast'
import { useL10n, useMockData, useWorkspace } from '@/features/workspace/WorkspaceContext'
import { useQuestionnaireText } from '@/features/frameworks/content/questionnaireContent'
import CommentThread from '@/features/collaboration/CommentThread'
import { summarize, useReportingActions, useSectionViews, useWorkspaceSlice, type SectionView } from '@/store/hooks'
import { Badge, Button, Card, EmptyState, Progress, dotTone, ease, inputClass, spring, textareaClass, type Tone } from '@/components/ui'
import { questionnaireStrings } from './questionnaire.strings'

// Reporting entities below the consolidated group, per workspace (tenant data, in the tenant's language).
const SUBSIDIARIES: Record<string, string[]> = {
  aeiforo: ['Asyad Ports', 'Asyad Shipping', 'Oman Rail', 'Asyad Logistics'],
  lvyuan: [
    '绿源光伏科技（江苏盐城）',
    '绿源风电（内蒙古乌兰察布）',
    '绿源储能（广东肇庆）',
    '绿源智造（安徽合肥）',
    '绿源新材料（四川宜宾）',
  ],
}

type Category = 'environment' | 'social' | 'csr' | 'financial' | 'governance'

const CATEGORY_RULES: { cat: Category; keys: string[] }[] = [
  { cat: 'environment', keys: ['energy', 'emissions', 'ghg', 'water', 'waste', 'biodiversity', 'carbon', 'env', 'p5', 'clim'] },
  { cat: 'social', keys: ['employee', 'safety', 'worker', 'training', 'posh', 'welfare', 'p3', 'p6', 'hr'] },
  { cat: 'csr', keys: ['csr', 'community', 'p8', 'inclusive', 'rural'] },
  { cat: 'financial', keys: ['revenue', 'profit', 'capex', 'fines', 'green_revenue'] },
]
const CATEGORY_TONE: Record<Category, Tone> = {
  environment: 'success',
  social: 'info',
  csr: 'neutral',
  financial: 'warning',
  governance: 'neutral',
}
const categorize = (fieldId: string): Category => CATEGORY_RULES.find(r => r.keys.some(k => fieldId.includes(k)))?.cat ?? 'governance'

const selectClass =
  'h-9 pl-9 pr-8 rounded-[10px] bg-white border border-line text-sm text-zinc-900 shadow-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500/60 max-w-full truncate'

export default function QuestionnairePage() {
  const { moduleId = '' } = useParams<{ moduleId: string }>()
  const navigate = useNavigate()
  const { member, can, canEditModule } = useAccess()
  const a = useStrings(accessStrings)
  const s = useStrings(questionnaireStrings)
  const c = useStrings(moduleCatalogStrings)
  const f = useFormat()
  const qt = useQuestionnaireText()
  const fw = useFrameworkLabels()
  const wt = useWorkflowText()
  const l10n = useL10n()
  const { workspace, region } = useWorkspace()
  const seed = useMockData()
  const views = useSectionViews(moduleId)
  const { activity } = useWorkspaceSlice()
  const { submitSection, reopenSection } = useReportingActions()

  const [entityIdx, setEntityIdx] = useState(0)
  const [activeId, setActiveId] = useState('')
  const module = seed.modules.find(m => m.id === moduleId)

  useEffect(() => {
    setEntityIdx(0)
    setActiveId('')
  }, [workspace.id, moduleId])

  const current = views.find(v => v.section.id === activeId) ?? views[0]
  const activeIndex = current ? views.indexOf(current) : -1
  const pipeline = useMemo(() => summarize(views), [views])

  const groupName = region.id === 'cn' ? workspace.name.zh : l10n(workspace.name)
  const entities = [fmt(s.consolidated, { name: groupName }), ...(SUBSIDIARIES[workspace.id] ?? [])]

  // The reviewer's note travels with a "changes requested" decision.
  const returnNote = useMemo(
    () =>
      current?.status === 'changes_requested'
        ? activity.find(a => a.kind === 'request_changes' && a.sectionId === current.section.id)
        : undefined,
    [activity, current],
  )

  if (!module) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-[1440px] mx-auto">
        <Card>
          <EmptyState
            icon={FileText}
            title={c.notFound}
            description={c.notFoundBody}
            action={
              <Button icon={ArrowLeft} onClick={() => navigate('/modules')}>
                {c.backToModules}
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  const editable = canEditModule(moduleId)
  const locked = !editable || current?.status === 'submitted' || current?.status === 'approved'
  const canSubmit = editable && can('questionnaire.submit') && !!current && !locked && current.answered >= current.required
  // Withdrawing a submission needs edit rights; reopening approved work needs approval rights.
  const canReopen = current?.status === 'approved' ? can('approval.approve') : editable
  const readOnlyNote =
    member && !editable
      ? can('questionnaire.edit')
        ? fmt(a.readOnly.scope, { frameworks: member.scope.map(id => fw.short(id)).join('、') })
        : fmt(a.readOnly.view, { role: a.roles[member.role].name })
      : null
  const go = (i: number) => views[i] && setActiveId(views[i].section.id)

  const onSubmit = () => {
    if (!current) return
    submitSection(moduleId, current.section.id)
    toast(s.submittedToast)
    const next = views.slice(activeIndex + 1).find(v => v.status !== 'approved' && v.status !== 'submitted')
    if (next) setActiveId(next.section.id)
  }

  return (
    <div className="min-h-full bg-canvas">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-line">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => navigate(`/modules/${moduleId}`)}
              aria-label={s.back}
              title={s.back}
              className="w-9 h-9 shrink-0 rounded-[10px] flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <SelectWithIcon
              icon={Building2}
              label={s.entity}
              value={String(Math.min(entityIdx, entities.length - 1))}
              onChange={v => setEntityIdx(Number(v))}
              className="font-medium"
            >
              {entities.map((e, i) => (
                <option key={e} value={i}>
                  {e}
                </option>
              ))}
            </SelectWithIcon>
          </div>
          <div className="flex items-center gap-2">
            {member && (
              <span
                className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] bg-white border border-line text-[13px] text-zinc-700 shadow-sm"
                title={s.role}
              >
                {editable ? <Unlock className="w-3.5 h-3.5 text-zinc-400" /> : <Eye className="w-3.5 h-3.5 text-zinc-400" />}
                {a.roles[member.role].name}
              </span>
            )}
            {editable && (
              <Button icon={FileSpreadsheet} onClick={() => navigate(`/import?module=${moduleId}`)}>
                <span className="hidden sm:inline">{s.importExcel}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-[28px] font-semibold tracking-[-0.02em] text-zinc-900 leading-tight">
              {fw.title(module.id, module.title)}
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 max-w-2xl">{s.subtitle}</p>
          </div>
          <div className="md:w-72 shrink-0">
            <div className="flex items-center justify-between mb-2 text-[13px]">
              <span className="font-medium text-zinc-500">{s.moduleProgress}</span>
              <span className="font-semibold text-zinc-900 tabular">{f.percent(pipeline.completion)}</span>
            </div>
            <Progress value={pipeline.completion} tone="success" />
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500">
              {(['approved', 'submitted', 'changes_requested', 'draft'] as const).map(k =>
                pipeline[k] ? (
                  <span key={k} className="inline-flex items-center gap-1">
                    <span className={clsx('w-1.5 h-1.5 rounded-full', dotTone[STATUS_TONE[k]])} />
                    {wt.status(k)} {pipeline[k]}
                  </span>
                ) : null,
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Section navigation */}
          <aside className="hidden lg:block w-72 shrink-0 sticky top-20">
            <Card padded={false} className="p-2">
              <div className="px-3 pt-2 pb-2 text-[13px] font-medium text-zinc-500">{s.sections}</div>
              <nav className="flex flex-col gap-0.5 max-h-[calc(100dvh-220px)] overflow-y-auto scrollbar-none">
                {views.map((v, idx) => {
                  const active = current?.section.id === v.section.id
                  return (
                    <button
                      key={v.section.id}
                      type="button"
                      onClick={() => setActiveId(v.section.id)}
                      aria-current={active ? 'step' : undefined}
                      className={clsx(
                        'relative w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 text-sm transition-colors',
                        active ? 'text-zinc-900 font-medium' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
                      )}
                    >
                      {active && (
                        <motion.span layoutId="q-section" transition={spring} className="absolute inset-0 rounded-lg bg-zinc-100" />
                      )}
                      <span className={clsx('relative w-5 text-xs tabular shrink-0', active ? 'text-zinc-900' : 'text-zinc-400')}>
                        {idx + 1}
                      </span>
                      <span className="relative truncate flex-1">{qt.shortTitle(v.section)}</span>
                      <StatusGlyph view={v} />
                    </button>
                  )
                })}
              </nav>
            </Card>
          </aside>

          <div className="flex-1 min-w-0 w-full space-y-5">
            {/* Mobile section picker */}
            {views.length > 0 && (
              <div className="lg:hidden">
                <SelectWithIcon
                  icon={FileText}
                  label={s.sections}
                  value={current?.section.id ?? ''}
                  onChange={setActiveId}
                  className="w-full"
                >
                  {views.map((v, idx) => (
                    <option key={v.section.id} value={v.section.id}>
                      {idx + 1}. {qt.shortTitle(v.section)} · {wt.status(v.status)}
                    </option>
                  ))}
                </SelectWithIcon>
              </div>
            )}

            {!current ? (
              <Card>
                <EmptyState icon={FileText} title={s.noSections} description={s.noSectionsBody} />
              </Card>
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={current.section.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8, pointerEvents: 'none' }}
                  transition={{ duration: 0.18, ease: ease.out }}
                  className="space-y-5"
                >
                  {/* Section header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[13px] text-zinc-500 tabular">
                        {s.section} {activeIndex + 1} / {views.length}
                        <Badge tone={STATUS_TONE[current.status]} dot>
                          {wt.status(current.status)}
                        </Badge>
                      </div>
                      <h2 className="text-lg font-semibold text-zinc-900 tracking-tight mt-1">{qt.sectionTitle(current.section)}</h2>
                      <p className="mt-1 text-xs text-zinc-500">
                        {fmt(s.answeredOf, { answered: current.answered, required: current.required })}
                        {current.updatedAt && <> · {fmt(s.saved, { time: wt.ago(current.updatedAt) })}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start">
                      <Button icon={Paperclip} onClick={() => navigate('/evidence')}>
                        {s.evidence}
                      </Button>
                      {!editable ? null : locked ? (
                        canReopen && (
                          <Button icon={Unlock} onClick={() => reopenSection(moduleId, current.section.id)}>
                            {s.reopen}
                          </Button>
                        )
                      ) : (
                        <Button
                          variant="primary"
                          icon={Send}
                          onClick={onSubmit}
                          disabled={!canSubmit}
                          title={canSubmit ? undefined : s.completeToSubmit}
                        >
                          {s.submitSection}
                        </Button>
                      )}
                    </div>
                  </div>

                  {readOnlyNote && (
                    <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-[13px] bg-zinc-50 text-zinc-700 ring-1 ring-inset ring-line">
                      <Eye className="w-4 h-4 mt-0.5 shrink-0 text-zinc-500" />
                      <p className="min-w-0 leading-relaxed">{readOnlyNote}</p>
                    </div>
                  )}

                  {editable && (locked || returnNote) && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={clsx(
                        'flex items-start gap-3 rounded-xl px-4 py-3 text-[13px] ring-1 ring-inset',
                        returnNote
                          ? 'bg-rose-50 text-rose-900 ring-rose-200'
                          : current.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-900 ring-emerald-200'
                            : 'bg-amber-50 text-amber-900 ring-amber-200',
                      )}
                    >
                      {returnNote ? <CornerUpLeft className="w-4 h-4 mt-0.5 shrink-0" /> : <Lock className="w-4 h-4 mt-0.5 shrink-0" />}
                      <div className="min-w-0">
                        {returnNote ? (
                          <>
                            <div className="font-medium">{fmt(s.changesRequested, { actor: returnNote.actor })}</div>
                            {returnNote.note && <p className="mt-0.5 leading-relaxed">{returnNote.note}</p>}
                          </>
                        ) : current.status === 'approved' ? (
                          s.approvedLocked
                        ) : (
                          s.submittedLocked
                        )}
                      </div>
                    </motion.div>
                  )}

                  {current.section.fields.map((field, i) => (
                    <motion.div
                      key={field.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i, 6) * 0.03, duration: 0.2, ease: ease.out }}
                    >
                      <FieldCard moduleId={moduleId} view={current} field={field} category={categorize(field.id)} locked={locked} />
                    </motion.div>
                  ))}

                  <div className="flex items-center justify-between pt-2">
                    <Button variant="ghost" icon={ChevronLeft} onClick={() => go(activeIndex - 1)} disabled={activeIndex <= 0}>
                      {s.prevSection}
                    </Button>
                    <Button
                      variant="ghost"
                      iconRight={ChevronRight}
                      onClick={() => go(activeIndex + 1)}
                      disabled={activeIndex >= views.length - 1}
                    >
                      {s.nextSection}
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusGlyph({ view }: { view: SectionView }) {
  if (view.status === 'approved') return <CheckCircle className="relative w-3.5 h-3.5 text-emerald-500 shrink-0" />
  return (
    <span
      className={clsx(
        'relative w-1.5 h-1.5 rounded-full shrink-0',
        view.status === 'not_started' ? 'bg-zinc-300' : dotTone[STATUS_TONE[view.status]],
      )}
    />
  )
}

type Field = SectionView['section']['fields'][number] & { hint?: string }

function FieldCard({
  moduleId,
  view,
  field,
  category,
  locked,
}: {
  moduleId: string
  view: SectionView
  field: Field
  category: Category
  locked: boolean
}) {
  const s = useStrings(questionnaireStrings)
  const qt = useQuestionnaireText()
  const { region } = useWorkspace()
  const { comments } = useWorkspaceSlice()
  const { setAnswer } = useReportingActions()
  const committed = view.values[field.id] ?? ''
  const [draft, setDraft] = useState(committed)
  const [drafting, setDrafting] = useState(false)
  const [requested, setRequested] = useState(false)
  const [threadOpen, setThreadOpen] = useState(false)
  const timer = useRef<number>()
  const sectionId = view.section.id
  const commentCount = comments.filter(c => c.sectionId === sectionId && c.fieldId === field.id && !c.resolved).length

  // Pick up external writes (imports, AI drafts, resets) unless the user is mid-edit.
  useEffect(() => {
    if (timer.current === undefined) setDraft(committed)
  }, [committed])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const commit = (value: string) => {
    window.clearTimeout(timer.current)
    timer.current = undefined
    if (value !== committed) setAnswer(moduleId, sectionId, field.id, value)
  }
  const onChange = (value: string) => {
    setDraft(value)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => commit(value), 450)
  }

  const aiDraft = () => {
    setDrafting(true)
    window.setTimeout(() => {
      const text = s.aiDraft[region.id] ?? s.aiDraft.global
      setDraft(text)
      commit(text)
      setDrafting(false)
    }, 1200)
  }

  const required = field.required !== false
  const filled = !!draft.trim()

  return (
    <Card className={clsx('transition-[box-shadow,border-color]', !locked && 'hover:border-zinc-300')}>
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 w-full min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <Badge tone={CATEGORY_TONE[category]} dot>
              {s.category[category]}
            </Badge>
            {required && !filled && <span className="text-[11px] font-medium text-rose-600">{s.required}</span>}
          </div>
          <label htmlFor={`f-${field.id}`} className="block text-[15px] font-semibold text-zinc-900 leading-snug">
            {qt.fieldLabel(view.section, field)}
          </label>
          {'hint' in field && field.hint && <p className="text-[13px] text-zinc-500 mt-1">{qt.fieldHint(view.section, field)}</p>}

          <div className="mt-4">
            {field.type === 'textarea' ? (
              <div className="relative">
                <textarea
                  id={`f-${field.id}`}
                  value={draft}
                  readOnly={locked}
                  onChange={e => onChange(e.target.value)}
                  onBlur={() => commit(draft)}
                  rows={5}
                  className={clsx(textareaClass, 'pb-14', locked && 'bg-zinc-50 text-zinc-600 cursor-not-allowed')}
                  placeholder={s.textareaPlaceholder}
                />
                {!locked && (
                  <div className="absolute bottom-3 right-3">
                    <Button size="sm" variant={drafting ? 'secondary' : 'brand'} icon={Sparkles} onClick={aiDraft} loading={drafting}>
                      {drafting ? s.generating : s.generate}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative max-w-sm">
                <input
                  id={`f-${field.id}`}
                  value={draft}
                  readOnly={locked}
                  onChange={e => onChange(e.target.value)}
                  onBlur={() => commit(draft)}
                  className={clsx(
                    inputClass,
                    'h-10 pr-10 font-medium tabular',
                    filled && !locked && 'border-emerald-400',
                    locked && 'bg-zinc-50 text-zinc-600 cursor-not-allowed',
                  )}
                  placeholder={s.valuePlaceholder}
                />
                <AnimatePresence>
                  {filled && (
                    <motion.span
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <CheckCircle aria-label={s.filled} className="w-4 h-4 text-emerald-500" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-56 shrink-0 lg:border-l lg:border-line lg:pl-6">
          <p className="text-xs font-medium text-zinc-500 mb-2">{s.actions}</p>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
            <FieldAction
              icon={requested ? CheckCircle : Mail}
              label={requested ? s.requestSent : s.requestData}
              active={requested}
              onClick={() => setRequested(true)}
            />
            <FieldAction
              icon={MessageSquare}
              label={s.addComment}
              active={threadOpen}
              count={commentCount}
              onClick={() => setThreadOpen(o => !o)}
            />
          </div>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {threadOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: ease.out }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-line">
              <CommentThread moduleId={moduleId} sectionId={sectionId} fieldId={field.id} autoFocus />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

function FieldAction({
  icon: Icon,
  label,
  onClick,
  active,
  count,
}: {
  icon: typeof Mail
  label: string
  onClick?: () => void
  active?: boolean
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        'flex items-center justify-between gap-2 w-full h-9 px-3 rounded-lg text-[13px] font-medium transition-colors',
        active ? 'bg-emerald-50 text-emerald-800' : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900',
      )}
    >
      <span className="flex items-center gap-2 min-w-0">
        <Icon className={clsx('w-4 h-4 shrink-0', active ? 'text-emerald-700' : 'text-zinc-400')} />
        <span className="truncate">{label}</span>
      </span>
      {!!count && (
        <span className="text-[11px] tabular min-w-[18px] h-[18px] px-1 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  )
}

function SelectWithIcon({
  icon: Icon,
  label,
  value,
  onChange,
  className,
  children,
}: {
  icon: typeof Mail
  label: string
  value: string
  onChange: (v: string) => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={clsx('relative min-w-0', className?.includes('hidden') && className)}>
      <Icon className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <select
        aria-label={label}
        title={label}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={clsx(selectClass, className?.replace(/\b(hidden|sm:block)\b/g, ''))}
      >
        {children}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  )
}
