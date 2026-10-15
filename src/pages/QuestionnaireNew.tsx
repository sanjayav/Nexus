import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CheckCircle, Link2, ChevronLeft, ChevronRight, User, Lock, MessageSquare,
  ChevronDown, Building2, Upload, Plus, Mail, Sparkles, UserPlus, FileText, ArrowLeft, Eye,
} from 'lucide-react'
import clsx from 'clsx'
import { mockData } from '../data/mockData'
import { useRBAC, ROLE_DEFINITIONS, RoleId } from '../contexts/RBACContext'
import { fmt, useFormat, useStrings } from '../i18n'
import { questionnaireNewStrings } from '../i18n/pages/questionnaireNew'
import { moduleCatalogStrings } from '../i18n/pages/moduleCatalog'
import { useQuestionnaireText } from '../i18n/pages/questionnaireContent'
import { Card, CardHeader, Button, Badge, Progress, EmptyState, inputClass, Tone } from '../components/ui'

const CONSOLIDATED = 'Asyad Group (Consolidated)'
const ENTITIES = [CONSOLIDATED, 'Asyad Ports', 'Asyad Shipping', 'Oman Rail', 'Asyad Logistics']

type Category = 'environment' | 'social' | 'csr' | 'financial' | 'governance'

const CATEGORY_RULES: { cat: Category; keys: string[] }[] = [
  { cat: 'environment', keys: ['energy', 'emissions', 'ghg', 'water', 'waste', 'biodiversity', 'carbon', 'env', 'p5'] },
  { cat: 'social', keys: ['employee', 'safety', 'worker', 'training', 'posh', 'welfare', 'p3', 'p6', 'hr'] },
  { cat: 'csr', keys: ['csr', 'community', 'p8', 'inclusive'] },
  { cat: 'financial', keys: ['revenue', 'profit', 'capex', 'fines', 'green_revenue'] },
]

const CATEGORY_TONE: Record<Category, Tone> = {
  environment: 'success',
  social: 'info',
  csr: 'neutral',
  financial: 'warning',
  governance: 'neutral',
}

function categorize(fieldId: string): Category {
  return CATEGORY_RULES.find(r => r.keys.some(k => fieldId.includes(k)))?.cat ?? 'governance'
}

const selectClass =
  'h-9 pl-9 pr-8 rounded-[10px] bg-white border border-line text-sm text-zinc-900 shadow-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500/60 max-w-full truncate'

export default function QuestionnaireNew() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const navigate = useNavigate()
  const { currentRole, setRole } = useRBAC()
  const s = useStrings(questionnaireNewStrings)
  const c = useStrings(moduleCatalogStrings)
  const f = useFormat()
  const qt = useQuestionnaireText()

  const [activeEntity, setActiveEntity] = useState(CONSOLIDATED)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [aiPrompts, setAiPrompts] = useState<Record<string, boolean>>({}) // fields with an in-flight AI suggestion

  const module = useMemo(() => mockData.modules.find(m => m.id === moduleId), [moduleId])
  const sections = useMemo(() => mockData.questionnaireSections.filter(sec => sec.module === moduleId), [moduleId])
  const [activeSectionId, setActiveSectionId] = useState('')

  useEffect(() => {
    if (sections.length > 0 && !activeSectionId) setActiveSectionId(sections[0].id)
  }, [sections, activeSectionId])

  const currentSection = useMemo(() => {
    if (sections.length === 0) return null
    return sections.find(sec => sec.id === activeSectionId) || sections[0]
  }, [sections, activeSectionId])

  if (!module) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-[1440px] mx-auto">
        <Card>
          <EmptyState
            icon={FileText}
            title={c.notFound}
            description={c.notFoundBody}
            action={<Button icon={ArrowLeft} onClick={() => navigate('/modules')}>{c.backToModules}</Button>}
          />
        </Card>
      </div>
    )
  }

  const handleGenerateText = (fieldId: string) => {
    setAiPrompts(prev => ({ ...prev, [fieldId]: true }))
    // Simulate AI generation delay
    setTimeout(() => {
      setFormValues(prev => ({ ...prev, [fieldId]: s.aiDraft }))
      setAiPrompts(prev => ({ ...prev, [fieldId]: false }))
    }, 1500)
  }

  const entityLabel = (e: string) => (e === CONSOLIDATED ? fmt(s.consolidated, { name: 'Asyad Group' }) : e)
  const fields = (currentSection?.fields || []) as any[]
  const progress = module.coverage
  const activeIndex = currentSection ? sections.findIndex(sec => sec.id === currentSection.id) : -1

  return (
    <div className="min-h-full bg-canvas">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 bg-white/95 border-b border-line">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/modules')}
              aria-label={s.back}
              title={s.back}
              className="w-9 h-9 shrink-0 rounded-[10px] flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="relative min-w-0">
              <Building2 className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                aria-label={s.entity}
                value={activeEntity}
                onChange={e => setActiveEntity(e.target.value)}
                className={clsx(selectClass, 'font-medium')}
              >
                {ENTITIES.map(e => <option key={e} value={e}>{entityLabel(e)}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="relative">
            <Eye className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              aria-label={s.role}
              title={s.role}
              className={clsx(selectClass, 'text-[13px] text-zinc-700')}
              value={currentRole}
              onChange={e => setRole(e.target.value as RoleId)}
            >
              {Object.values(ROLE_DEFINITIONS).map(r => <option key={r.id} value={r.id}>{s.roles[r.id] ?? r.name}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Title */}
        <div className="pb-6">
          <h1 className="text-2xl sm:text-[28px] font-semibold tracking-[-0.02em] text-zinc-900 leading-tight">
            {c.titles[module.id] ?? module.title}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 max-w-2xl">{s.subtitle}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Section navigation (desktop) */}
          <aside className="hidden lg:block w-72 shrink-0 sticky top-20">
            <Card padded={false} className="p-2">
              <div className="px-3 pt-2 pb-2 text-[13px] font-medium text-zinc-500">{s.sections}</div>
              <nav className="flex flex-col gap-0.5">
                {sections.map((section, idx) => {
                  const active = currentSection?.id === section.id
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSectionId(section.id)}
                      aria-current={active ? 'step' : undefined}
                      className={clsx(
                        'w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2.5 text-sm',
                        active ? 'bg-zinc-100 text-zinc-900 font-medium' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
                      )}
                    >
                      <span className={clsx('w-5 text-xs tabular shrink-0', active ? 'text-zinc-900' : 'text-zinc-400')}>{idx + 1}</span>
                      <span className="truncate flex-1">{qt.shortTitle(section)}</span>
                      {section.completed && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                    </button>
                  )
                })}
              </nav>
              <div className="mt-2 px-3 pt-4 pb-3 border-t border-line">
                <div className="flex items-center justify-between mb-2 text-[13px]">
                  <span className="font-medium text-zinc-500">{s.moduleProgress}</span>
                  <span className="font-medium text-zinc-900 tabular">{f.percent(progress)}</span>
                </div>
                <Progress value={progress} tone="success" />
              </div>
            </Card>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 w-full space-y-6">
            {/* Mobile section picker */}
            {sections.length > 0 && (
              <div className="lg:hidden space-y-3">
                <div className="relative">
                  <FileText className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    aria-label={s.sections}
                    value={currentSection?.id}
                    onChange={e => setActiveSectionId(e.target.value)}
                    className={clsx(selectClass, 'w-full')}
                  >
                    {sections.map((section, idx) => (
                      <option key={section.id} value={section.id}>{idx + 1}. {qt.shortTitle(section)}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="flex items-center gap-3 text-[13px]">
                  <span className="text-zinc-500 shrink-0">{s.moduleProgress}</span>
                  <Progress value={progress} tone="success" className="flex-1" />
                  <span className="font-medium text-zinc-900 tabular">{f.percent(progress)}</span>
                </div>
              </div>
            )}

            {currentSection ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] text-zinc-500 tabular">{s.section} {activeIndex + 1} / {sections.length}</div>
                  <h2 className="text-lg font-semibold text-zinc-900 tracking-tight mt-0.5">{qt.sectionTitle(currentSection)}</h2>
                </div>
                <Button variant="primary" icon={CheckCircle} onClick={() => console.log('Submitted')} className="self-start sm:self-auto">
                  {s.submitSection}
                </Button>
              </div>
            ) : (
              <Card>
                <EmptyState icon={FileText} title={s.noSections} description={s.noSectionsBody} />
              </Card>
            )}

            {/* Quick action cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="flex flex-col">
                <CardHeader title={s.userManagement} icon={UserPlus} className="mb-4" />
                <ul className="space-y-3 text-[13px]">
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-zinc-700 flex items-center gap-2 min-w-0"><User className="w-3.5 h-3.5 text-zinc-400 shrink-0" /><span className="truncate">{s.userGatherer}</span></span>
                    <Badge tone="warning">{s.invitePending}</Badge>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-zinc-700 flex items-center gap-2 min-w-0"><Lock className="w-3.5 h-3.5 text-zinc-400 shrink-0" /><span className="truncate">{s.userAuditor}</span></span>
                    <Badge tone="success">{fmt(s.joined, { date: f.date('2025-09-19', { day: 'numeric', month: 'short' }) })}</Badge>
                  </li>
                </ul>
                <Button variant="secondary" className="mt-5 w-full">{s.manageAccess}</Button>
              </Card>

              <Card className="flex flex-col">
                <CardHeader title={s.entityDocs} description={s.entityDocsBody} icon={Upload} className="mb-4" />
                <button
                  type="button"
                  className="mt-auto w-full rounded-xl border border-dashed border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50 transition-colors py-5 flex flex-col items-center gap-1.5 text-[13px] font-medium text-zinc-700"
                >
                  <Upload className="w-4 h-4 text-zinc-400" />
                  {s.uploadFile}
                </button>
              </Card>
            </div>

            {/* Metric collection cards */}
            {fields.map(field => {
              const cat = categorize(field.id)
              const value = formValues[field.id] ?? field.value ?? ''
              return (
                <Card key={field.id} className="transition-[box-shadow,border-color] hover:border-zinc-300">
                  <div className="flex flex-col lg:flex-row gap-6 items-start">
                    <div className="flex-1 w-full min-w-0">
                      <Badge tone={CATEGORY_TONE[cat]} dot className="mb-3">{s.category[cat]}</Badge>
                      <label htmlFor={`f-${field.id}`} className="block text-[15px] font-semibold text-zinc-900 leading-snug">
                        {qt.fieldLabel(currentSection, field)}
                      </label>
                      {field.hint && <p className="text-[13px] text-zinc-500 mt-1">{qt.fieldHint(currentSection, field)}</p>}

                      <div className="mt-4">
                        {field.type === 'textarea' ? (
                          <div className="relative">
                            <textarea
                              id={`f-${field.id}`}
                              value={value}
                              onChange={e => setFormValues({ ...formValues, [field.id]: e.target.value })}
                              rows={5}
                              className={clsx(inputClass, 'h-auto py-2.5 pb-14 resize-none leading-relaxed')}
                              placeholder={s.textareaPlaceholder}
                            />
                            <div className="absolute bottom-3 right-3">
                              <Button
                                size="sm"
                                variant={aiPrompts[field.id] ? 'secondary' : 'brand'}
                                icon={Sparkles}
                                onClick={() => handleGenerateText(field.id)}
                                disabled={aiPrompts[field.id]}
                                className={clsx(aiPrompts[field.id] && 'cursor-wait')}
                              >
                                {aiPrompts[field.id] ? s.generating : s.generate}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="relative max-w-sm">
                            <input
                              id={`f-${field.id}`}
                              type={field.type === 'number' ? 'number' : 'text'}
                              value={value}
                              onChange={e => setFormValues({ ...formValues, [field.id]: e.target.value })}
                              className={clsx(inputClass, 'h-10 pr-10 font-medium tabular', formValues[field.id] && 'border-emerald-400')}
                              placeholder={field.type === 'number' ? '0.00' : s.valuePlaceholder}
                            />
                            {formValues[field.id] && (
                              <CheckCircle aria-label={s.filled} className="w-4 h-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Field actions */}
                    <div className="w-full lg:w-60 shrink-0 lg:border-l lg:border-line lg:pl-6">
                      <p className="text-xs font-medium text-zinc-500 mb-2">{s.actions}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-1.5">
                        <FieldAction icon={Mail} label={s.requestData} trailing={<ChevronRight className="w-3.5 h-3.5 text-zinc-300" />} />
                        <FieldAction icon={Link2} label={s.linkedApi} trailing={<span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />} />
                        <FieldAction icon={MessageSquare} label={s.addComment} />
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}

            {/* Create metric */}
            <button
              type="button"
              className="w-full h-14 rounded-card border border-dashed border-zinc-300 bg-white/60 hover:bg-white hover:border-zinc-400 flex items-center justify-center gap-2 text-sm font-medium text-zinc-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {s.createMetric}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FieldAction({ icon: Icon, label, trailing }: { icon: typeof Mail; label: string; trailing?: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex items-center justify-between gap-2 w-full h-9 px-3 rounded-lg text-[13px] font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
    >
      <span className="flex items-center gap-2 min-w-0">
        <Icon className="w-4 h-4 text-zinc-400 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      {trailing}
    </button>
  )
}
