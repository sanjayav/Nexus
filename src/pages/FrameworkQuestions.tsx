import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ChevronDown, User, Zap, ArrowRight, FileText, Send } from 'lucide-react'
import { frameworkQuestions, csrdSections, type FrameworkQuestion } from '../data/moduleData'
import PageHeader from '../components/PageHeader'
import { StatLedger, StatusPill, EmptyState, notify } from '../components/ui'
import { spring, transition } from '../motion/tokens'

/**
 * Map the local tab id to the canonical framework id used by the disclosure
 * editor route. CDP/TCFD/CSRD land on their editors; GRI maps to the live tree.
 */
const FRAMEWORK_ROUTE_ID: Record<string, string> = {
  cdp: 'cdp-2024',
  tcfd: 'tcfd',
  gri: 'gri',
  csrd: 'csrd-e1',
}

type FrameworkTab = 'cdp' | 'tcfd' | 'gri' | 'csrd'
type StatusFilter = 'all' | 'draft' | 'in-review' | 'approved'
type RoleFilter = 'all' | 'site-owner' | 'facility-manager' | 'team-lead' | 'auto'

const frameworkTabs: { id: FrameworkTab; label: string }[] = [
  { id: 'cdp', label: 'CDP' },
  { id: 'tcfd', label: 'TCFD' },
  { id: 'gri', label: 'GRI' },
  { id: 'csrd', label: 'CSRD' },
]

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'common.all' },
  { value: 'draft', label: 'frameworkQuestions.status.draft' },
  { value: 'in-review', label: 'frameworkQuestions.status.inReview' },
  { value: 'approved', label: 'frameworkQuestions.status.approved' },
]

const roleOptions: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'common.all' },
  { value: 'site-owner', label: 'workflowStatus.role.siteOwner' },
  { value: 'facility-manager', label: 'workflowStatus.role.facilityManager' },
  { value: 'team-lead', label: 'workflowStatus.role.teamLead' },
  { value: 'auto', label: 'workflowStatus.role.AUTO' },
]

function roleLabel(role: string, t: TFunction) {
  switch (role) {
    case 'site-owner': return t('workflowStatus.role.siteOwner')
    case 'facility-manager': return t('frameworkQuestions.role.facilityMgr')
    case 'team-lead': return t('workflowStatus.role.teamLead')
    case 'auto': return t('workflowStatus.role.AUTO')
    default: return role
  }
}

const PILL: Record<FrameworkQuestion['status'], { status: string; label: string }> = {
  draft: { status: 'in_progress', label: 'frameworkQuestions.status.draft' },
  'in-review': { status: 'submitted', label: 'frameworkQuestions.status.inReview' },
  approved: { status: 'approved', label: 'frameworkQuestions.status.approved' },
}

/**
 * Templates — the framework questionnaires with role-based assignment, and
 * the way into each framework's disclosure editor.
 */
export default function FrameworkQuestions() {
  const { t } = useTranslation()
  const tabGroup = useId()
  const [activeTab, setActiveTab] = useState<FrameworkTab>('cdp')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set())

  const frameworkQs = useMemo(() => frameworkQuestions.filter(q => q.frameworkId === activeTab), [activeTab])
  const statusOf = (q: FrameworkQuestion): FrameworkQuestion['status'] => (submittedIds.has(q.id) ? 'in-review' : q.status)

  const filtered = frameworkQs.filter(q => {
    if (statusFilter !== 'all' && statusOf(q) !== statusFilter) return false
    if (roleFilter !== 'all' && q.assignedRole !== roleFilter) return false
    return true
  })

  const sectionMap = new Map<string, FrameworkQuestion[]>()
  for (const q of filtered) {
    if (!sectionMap.has(q.sectionId)) sectionMap.set(q.sectionId, [])
    sectionMap.get(q.sectionId)!.push(q)
  }

  const totalCount = frameworkQs.length
  const approvedCount = frameworkQs.filter(q => statusOf(q) === 'approved').length
  const inReviewCount = frameworkQs.filter(q => statusOf(q) === 'in-review').length
  const draftCount = frameworkQs.filter(q => statusOf(q) === 'draft').length

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  const handleSubmitForReview = (q: FrameworkQuestion) => {
    setSubmittedIds(prev => new Set(prev).add(q.id))
    notify.success(t('frameworkQuestions.toastSubmitted'), {
      description: q.questionNumber,
      undo: () => setSubmittedIds(prev => { const n = new Set(prev); n.delete(q.id); return n }),
    })
  }

  const csrdSectionMap = new Map(csrdSections.map(s => [s.id, s.name]))
  const sectionTitle = (sectionId: string, sectionName: string) =>
    activeTab === 'csrd' && csrdSectionMap.has(sectionId) ? `${sectionId} · ${csrdSectionMap.get(sectionId)}` : `${sectionId} · ${sectionName}`

  const fwLabel = frameworkTabs.find(tab => tab.id === activeTab)?.label

  return (
    <div className="page-container space-y-6">
      <PageHeader title={t('frameworkQuestions.title')} description={t('frameworkQuestions.description')} />

      {/* Framework tabs */}
      <div role="tablist" aria-label={t('frameworkQuestions.tabsAria')} className="inline-flex p-0.5 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
        {frameworkTabs.map(tab => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              onClick={() => { setActiveTab(tab.id); setExpandedSections(new Set()) }}
              className={`relative h-9 px-4 text-small font-semibold rounded-[calc(var(--radius-md)-2px)] transition-colors ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {active && <motion.span layoutId={`${tabGroup}-pill`} transition={spring.snappy} className="absolute inset-0 rounded-[calc(var(--radius-md)-2px)] bg-[var(--bg-primary)] shadow-[var(--shadow-card)]" aria-hidden />}
              <span className="relative">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Editor entry point */}
      <Link
        to={`/disclosure-editor/${FRAMEWORK_ROUTE_ID[activeTab] ?? activeTab}`}
        className="group surface-hero flex items-center gap-4 p-4 sm:p-5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/40"
      >
        <span className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5" aria-hidden />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block type-h3 text-[var(--text-primary)]">{t('frameworkQuestions.openInEditorFw', { framework: fwLabel })}</span>
          <span className="block text-small text-[var(--text-secondary)] mt-0.5">{t('frameworkQuestions.editorCta', { framework: fwLabel })}</span>
        </span>
        <span className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-small font-semibold group-hover:bg-[var(--btn-primary-bg-hover)] whitespace-nowrap">
          {t('frameworkQuestions.open')} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </Link>

      <StatLedger
        items={[
          { id: 'total', label: t('frameworkQuestions.stats.total'), value: totalCount },
          { id: 'approved', label: t('frameworkQuestions.status.approved'), value: approvedCount, tone: 'success' },
          { id: 'review', label: t('frameworkQuestions.status.inReview'), value: inReviewCount, tone: 'info' },
          { id: 'draft', label: t('frameworkQuestions.status.draft'), value: draftCount, tone: 'warning' },
        ]}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
        <FilterGroup label={t('frameworkQuestions.statusLabel')} options={statusOptions} value={statusFilter} onChange={v => setStatusFilter(v as StatusFilter)} />
        <FilterGroup label={t('frameworkQuestions.roleLabel')} options={roleOptions} value={roleFilter} onChange={v => setRoleFilter(v as RoleFilter)} />
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {Array.from(sectionMap.entries()).map(([sectionId, questions]) => {
          const isExpanded = expandedSections.has(sectionId)
          const done = questions.filter(q => statusOf(q) === 'approved').length
          const pct = Math.round((done / questions.length) * 100)
          const panelId = `fq-${sectionId}`
          return (
            <section key={sectionId} className="surface-paper overflow-hidden">
              <button
                onClick={() => toggleSection(sectionId)}
                aria-expanded={isExpanded}
                aria-controls={panelId}
                className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 hover:bg-[var(--bg-secondary)] transition-colors text-left"
              >
                <motion.span animate={{ rotate: isExpanded ? 0 : -90 }} transition={transition.fast} className="text-[var(--text-tertiary)] flex-shrink-0">
                  <ChevronDown className="w-4 h-4" aria-hidden />
                </motion.span>
                <span className="flex-1 min-w-0">
                  <span className="block text-body font-semibold text-[var(--text-primary)] truncate">{sectionTitle(sectionId, questions[0].sectionName)}</span>
                  <span className="block text-caption text-[var(--text-tertiary)]">{t('frameworkQuestions.questionCount', { count: questions.length })}</span>
                </span>
                <span className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-caption text-[var(--text-secondary)] tabular-nums">{pct}%</span>
                  <span className="hidden sm:block w-24 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <motion.span className="block h-full bg-[var(--color-brand)] rounded-full" initial={false} animate={{ width: `${pct}%` }} transition={spring.gentle} />
                  </span>
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.ul
                    id={panelId}
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={transition.base}
                    className="overflow-hidden border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]"
                  >
                    {questions.map(q => {
                      const st = statusOf(q)
                      return (
                        <li key={q.id} className="px-4 sm:px-5 py-4 flex flex-col md:flex-row md:items-start gap-3">
                          <span className="text-caption font-mono text-[var(--text-tertiary)] md:w-16 flex-shrink-0 md:pt-0.5">{q.questionNumber}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-small text-[var(--text-primary)]">{q.questionText}</p>
                            {q.response && <p className="text-caption text-[var(--text-tertiary)] mt-1 line-clamp-1">{q.response}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap md:flex-nowrap md:justify-end flex-shrink-0">
                            {q.autoPopulated && (
                              <StatusPill tone="brand" size="sm" icon={<Zap aria-hidden />}>{t('workflowStatus.role.AUTO')}</StatusPill>
                            )}
                            <StatusPill tone="neutral" size="sm" icon={q.assignedRole === 'auto' ? <Zap aria-hidden /> : <User aria-hidden />}>{roleLabel(q.assignedRole, t)}</StatusPill>
                            <span className="text-caption text-[var(--text-secondary)] md:w-28 truncate md:text-right">{q.assignedTo}</span>
                            <StatusPill status={PILL[st].status} size="sm">{t(PILL[st].label)}</StatusPill>
                            {st === 'draft' && (
                              <button
                                onClick={() => handleSubmitForReview(q)}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-caption font-semibold text-[var(--text-primary)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand-strong)] whitespace-nowrap"
                              >
                                <Send className="w-3.5 h-3.5" aria-hidden /> {t('frameworkQuestions.submitForReview')}
                              </button>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>
            </section>
          )
        })}

        {sectionMap.size === 0 && (
          <EmptyState
            variant="filtered"
            framed
            title={t('frameworkQuestions.noMatch')}
            onClearFilters={() => { setStatusFilter('all'); setRoleFilter('all') }}
          />
        )}
      </div>
    </div>
  )
}

function FilterGroup({ label, options, value, onChange }: { label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2 flex-wrap" role="group" aria-label={label}>
      <span className="text-caption font-medium text-[var(--text-secondary)]">{label}</span>
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`h-8 px-3 rounded-full text-caption font-medium border transition-colors whitespace-nowrap ${
              active
                ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]'
                : 'border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
            }`}
          >
            {t(opt.label)}
          </button>
        )
      })}
    </div>
  )
}
