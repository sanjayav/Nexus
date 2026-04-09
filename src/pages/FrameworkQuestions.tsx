import { useState } from 'react'
import {
  ClipboardList,
  ChevronDown,
  ChevronRight,
  User,
  CheckCircle2,
  Clock,
  FileEdit,
  Zap,
  Filter,
} from 'lucide-react'
import { frameworkQuestions, csrdSections } from '../data/moduleData'

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
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'in-review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
]

const roleOptions: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'site-owner', label: 'Site Owner' },
  { value: 'facility-manager', label: 'Facility Manager' },
  { value: 'team-lead', label: 'Team Lead' },
  { value: 'auto', label: 'Auto' },
]

function roleBadgeClasses(role: string) {
  switch (role) {
    case 'site-owner':
      return 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
    case 'facility-manager':
      return 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
    case 'team-lead':
      return 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
    case 'auto':
      return 'bg-teal-500/15 text-teal-400 border border-teal-500/20'
    default:
      return 'bg-dark-700 text-dark-300 border border-dark-500'
  }
}

function roleLabel(role: string) {
  switch (role) {
    case 'site-owner': return 'Site Owner'
    case 'facility-manager': return 'Facility Mgr'
    case 'team-lead': return 'Team Lead'
    case 'auto': return 'Auto'
    default: return role
  }
}

function statusBadgeClasses(status: string) {
  switch (status) {
    case 'draft':
      return 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
    case 'in-review':
      return 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
    case 'approved':
      return 'bg-teal-500/15 text-teal-400 border border-teal-500/20'
    default:
      return 'bg-dark-700 text-dark-300 border border-dark-500'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'draft': return 'Draft'
    case 'in-review': return 'In Review'
    case 'approved': return 'Approved'
    default: return status
  }
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'approved') return <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
  if (status === 'in-review') return <Clock className="w-3.5 h-3.5 text-blue-400" />
  return <FileEdit className="w-3.5 h-3.5 text-amber-400" />
}

export default function FrameworkQuestions() {
  const [activeTab, setActiveTab] = useState<FrameworkTab>('cdp')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  // Track questions submitted for review (local state simulation)
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set())

  // Filter questions for the active framework
  const frameworkQs = frameworkQuestions.filter((q) => q.frameworkId === activeTab)

  // Apply filters
  const filtered = frameworkQs.filter((q) => {
    if (statusFilter !== 'all' && q.status !== statusFilter) return false
    if (roleFilter !== 'all' && q.assignedRole !== roleFilter) return false
    return true
  })

  // Group by section
  const sectionMap = new Map<string, typeof filtered>()
  for (const q of filtered) {
    const key = q.sectionId
    if (!sectionMap.has(key)) sectionMap.set(key, [])
    sectionMap.get(key)!.push(q)
  }

  // Summary counts (on the full framework set, not filtered)
  const totalCount = frameworkQs.length
  const approvedCount = frameworkQs.filter((q) => q.status === 'approved').length
  const inReviewCount = frameworkQs.filter((q) => q.status === 'in-review').length
  const draftCount = frameworkQs.filter((q) => q.status === 'draft').length

  function toggleSection(sectionId: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  function handleSubmitForReview(questionId: string) {
    setSubmittedIds((prev) => new Set(prev).add(questionId))
    setToastMessage('Question submitted for review')
    setTimeout(() => setToastMessage(null), 2500)
  }

  // Get CSRD section names for section lookup when in CSRD tab
  const csrdSectionMap = new Map(csrdSections.map((s) => [s.id, s.name]))

  function getSectionDisplayName(sectionId: string, sectionName: string) {
    if (activeTab === 'csrd' && csrdSectionMap.has(sectionId)) {
      return `${sectionId} - ${csrdSectionMap.get(sectionId)}`
    }
    return `${sectionId} - ${sectionName}`
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Framework Questions</h1>
          <p className="text-sm text-dark-300 mt-1">
            Regulatory framework questionnaires with role-based assignment. Manage CDP, TCFD, GRI, and CSRD disclosures from a unified workspace.
          </p>
        </div>
      </div>

      {/* Framework Tab Selector */}
      <div className="flex gap-2">
        {frameworkTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setExpandedSections(new Set()) }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-accent-500 text-white'
                : 'bg-dark-800 text-dark-300 border border-dark-600 hover:bg-dark-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Questions', value: totalCount, color: 'dark-300' },
          { label: 'Approved', value: approvedCount, color: 'teal-400' },
          { label: 'In Review', value: inReviewCount, color: 'blue-400' },
          { label: 'Draft', value: draftCount, color: 'amber-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-4">
            <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider">{stat.label}</p>
            <p className={`text-2xl font-heading font-bold text-${stat.color} mt-1`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-dark-400">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Filters</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-dark-400">Status:</span>
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === opt.value
                  ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
                  : 'bg-dark-700 text-dark-300 border border-dark-600 hover:bg-dark-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-dark-400">Role:</span>
          {roleOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRoleFilter(opt.value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                roleFilter === opt.value
                  ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
                  : 'bg-dark-700 text-dark-300 border border-dark-600 hover:bg-dark-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section Accordions */}
      <div className="space-y-3">
        {Array.from(sectionMap.entries()).map(([sectionId, questions]) => {
          const isExpanded = expandedSections.has(sectionId)
          const sectionName = questions[0].sectionName
          const approvedInSection = questions.filter((q) => q.status === 'approved' || submittedIds.has(q.id)).length
          const completionPct = Math.round((approvedInSection / questions.length) * 100)

          return (
            <div key={sectionId} className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card overflow-hidden">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(sectionId)}
                className="w-full flex items-center gap-4 p-5 hover:bg-dark-750 transition-colors text-left"
              >
                {isExpanded
                  ? <ChevronDown className="w-4 h-4 text-dark-400 flex-shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-dark-400 flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-heading font-semibold text-white">
                      {getSectionDisplayName(sectionId, sectionName)}
                    </h3>
                    <span className="text-xs text-dark-400">{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-dark-400">{completionPct}%</span>
                  <div className="w-24 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all duration-300"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                </div>
              </button>

              {/* Expanded Question Rows */}
              {isExpanded && (
                <div className="border-t border-dark-600">
                  {questions.map((q, idx) => {
                    const effectiveStatus = submittedIds.has(q.id) ? 'in-review' : q.status
                    return (
                      <div
                        key={q.id}
                        className={`flex items-start gap-4 px-5 py-4 ${idx % 2 === 0 ? 'bg-dark-750' : ''} ${idx < questions.length - 1 ? 'border-b border-dark-600/50' : ''}`}
                      >
                        {/* Status icon */}
                        <div className="pt-0.5 flex-shrink-0">
                          <StatusIcon status={effectiveStatus} />
                        </div>

                        {/* Question number */}
                        <span className="text-xs font-mono text-dark-400 w-14 flex-shrink-0 pt-0.5">
                          {q.questionNumber}
                        </span>

                        {/* Question text + response preview */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-dark-200 leading-relaxed">{q.questionText}</p>
                          {q.response && (
                            <p className="text-xs text-dark-400 mt-1 truncate max-w-[600px]">
                              {q.response}
                            </p>
                          )}
                        </div>

                        {/* Auto chip */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {q.autoPopulated && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-teal-500/15 text-teal-400 border border-teal-500/20">
                              <Zap className="w-2.5 h-2.5" />
                              Auto
                            </span>
                          )}

                          {/* Role badge */}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${roleBadgeClasses(q.assignedRole)}`}>
                            {q.assignedRole === 'auto' ? <Zap className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                            {roleLabel(q.assignedRole)}
                          </span>

                          {/* Assigned to */}
                          <span className="text-xs text-dark-400 w-28 truncate text-right">
                            {q.assignedTo}
                          </span>

                          {/* Status badge */}
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${statusBadgeClasses(effectiveStatus)}`}>
                            {statusLabel(effectiveStatus)}
                          </span>

                          {/* Submit for Review button (only for draft, not yet submitted) */}
                          {q.status === 'draft' && !submittedIds.has(q.id) && (
                            <button
                              onClick={() => handleSubmitForReview(q.id)}
                              className="px-3 py-1 rounded-lg bg-accent-500 hover:bg-accent-600 text-white text-[10px] font-semibold transition-colors whitespace-nowrap"
                            >
                              Submit for Review
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {sectionMap.size === 0 && (
          <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-12 text-center">
            <p className="text-sm text-dark-400">No questions match the current filters.</p>
          </div>
        )}
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-teal-500/20 text-teal-400 border border-teal-500/30 px-5 py-3 rounded-xl text-sm font-medium shadow-lg animate-pulse z-50 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {toastMessage}
        </div>
      )}
    </div>
  )
}
