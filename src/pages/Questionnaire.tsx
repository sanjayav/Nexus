import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Save,
  CheckCircle,
  AlertCircle,
  Link2,
  Info,
  ChevronRight,
  FileText,
  Anchor,
  Filter,
  User,
  Calendar,
  Plus,
  MessageSquare,
  UploadCloud,
  BarChart3,
  Activity,
  History,
  AlertTriangle,
  PercentCircle,
  FileSpreadsheet,
  Table,
  GaugeCircle,
} from 'lucide-react'
import { mockData } from '../data/mockData'
import clsx from 'clsx'

type HistoryEntry = {
  id: string
  type: string
  description: string
  actor: string
  timestamp: string
}

const tabs = [
  { id: 'form', label: 'Form', subtitle: 'Required answers' },
  { id: 'breakdown', label: 'Breakdown', subtitle: 'Sub-values' },
  { id: 'evidence', label: 'Evidence', subtitle: 'Attachments' },
  { id: 'kpi', label: 'KPI / KRI', subtitle: 'Performance' },
  { id: 'history', label: 'History / Audit', subtitle: 'Traceability' },
]

const navFilters = [
  { id: 'all', label: 'All' },
  { id: 'missing', label: 'Only missing' },
  { id: 'mine', label: 'My assigned' },
  { id: 'material', label: 'Material topics' },
]

const statusStyles: Record<string, string> = {
  Draft: 'bg-gray-500/10 text-gray-200 border border-gray-500/40',
  'In Review': 'bg-blue-500/10 text-blue-300 border border-blue-500/40',
  Anchored: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40',
  Approved: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40',
}

const numericKeywords = ['emission', 'scope', 'total', 'rate', 'intensity', 'injury', 'fatalit', 'hours', 'coverage', 'percentage', 'tco2']
const unitFallbacks: Record<string, string[]> = {
  tCO2e: ['tCO2e', 'kgCO2e', 'MtCO2e'],
  'tCO2': ['tCO2', 'kgCO2', 'MtCO2'],
  MWh: ['MWh', 'kWh', 'GWh'],
  GJ: ['GJ', 'MJ'],
  '%': ['%', 'ppt'],
}
const gasOptions = ['CO2', 'CH4', 'N2O', 'CO2e', 'SF6']
const currentUser = 'Fatma Al Hinai'
const currentActor = 'did:ethr:0xfede...4321'

const defaultGuidance = {
  headline: 'Select a field or row to view contextual guidance.',
  auditorsCheck: [
    'Confirm boundary and ownership match DMA',
    'Ensure evidence is anchored or pending review',
    'Validate units and conversion factors',
  ],
  mistakes: ['Leaving evidence placeholders empty', 'Mixing Scope 1 & 2 responses'],
  example: 'Document protocol, factor source, period, and activity data per line item.',
  evidenceRequirement: 'Material topics require ≥1 anchored evidence file.',
}

const formatNumber = (value?: number | string, decimals = 0) => {
  if (value === undefined || value === null || value === '') return '—'
  const numeric = typeof value === 'string' ? Number(value.replace(/,/g, '')) : value
  if (Number.isNaN(numeric)) return value.toString()
  return numeric.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals })
}

const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : '—')

const isPureNumeric = (value: string) => /^[+-]?\d*\.?\d*$/.test(value.trim())

const deriveUnitsFromLabel = (label: string) => {
  const match = label.match(/\(([^)]+)\)/)
  if (!match) return []
  const raw = match[1].trim()
  return unitFallbacks[raw] ?? [raw]
}

const buildInitialFieldValues = (section: any) => {
  const values: Record<string, string> = {}
  section.fields.forEach((field: any) => {
    if (field.type === 'select') {
      if (Array.isArray(field.value)) {
        values[field.id] = field.value[0] ?? ''
      } else {
        values[field.id] = field.value ?? ''
      }
      return
    }
    const raw = typeof field.value === 'string' ? field.value : String(field.value ?? '')
    const normalized = /^[\d,\s.-]+$/.test(raw) ? raw.replace(/,/g, '') : raw
    values[field.id] = normalized
  })
  return values
}

const buildInitialUnits = (section: any) => {
  const units: Record<string, string> = {}
  section.fields.forEach((field: any) => {
    const unitOptions = field.units ?? deriveUnitsFromLabel(field.label)
    if (unitOptions?.length) {
      units[field.id] = unitOptions[0]
    }
  })
  return units
}

const computeSectionHealth = (section: any) => {
  const missingRequired =
    section.fields?.filter((field: any) => field.required && !field.value)?.length ?? 0
  const evidenceMissing = section.meta?.evidence?.missing ?? section.evidenceStatus?.missing ?? 0
  const validationErrors = section.meta?.validation?.errors ?? section.validation?.errors ?? 0
  const validationWarnings = section.meta?.validation?.warnings ?? section.validation?.warnings ?? 0
  return {
    missingRequired,
    evidenceMissing,
    validationErrors,
    validationWarnings,
    pendingReview: section.meta?.status === 'In Review' ? 1 : 0,
  }
}

const getRowTotal = (row: any) => {
  if (typeof row.calculated === 'number') return row.calculated
  const activity = Number(row.activityValue)
  const factor = Number(row.emissionFactorValue)
  if (!Number.isFinite(activity) || !Number.isFinite(factor)) return 0
  const isKilogramFactor = row.emissionFactorUnit?.toLowerCase().includes('kg')
  const totalKg = activity * factor
  return Number((isKilogramFactor ? totalKg / 1000 : totalKg).toFixed(2))
}

const getSectionGuidance = (section: any, fieldId: string) =>
  section.guidance?.fields?.[fieldId] ?? section.guidance?.default ?? defaultGuidance

export default function Questionnaire() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const navigate = useNavigate()
  const [currentSection, setCurrentSection] = useState(0)
  const [activeTab, setActiveTab] = useState('form')
  const [navFilter, setNavFilter] = useState('all')
  const [activeFieldId, setActiveFieldId] = useState('section-overview')
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saving' | 'saved' | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [fieldUnits, setFieldUnits] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({})
  const [breakdownRows, setBreakdownRows] = useState<any[]>([])
  const [breakdownGrouping, setBreakdownGrouping] = useState('Business Unit')
  const [inlineComments, setInlineComments] = useState<Record<string, any[]>>({})
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([])
  const [showGuidance, setShowGuidance] = useState(true)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const module = mockData.modules.find(m => m.id === moduleId)
  const sections = useMemo(() => {
    return mockData.questionnaireSections.filter(s => s.module === moduleId) as any[]
  }, [moduleId])
  const section = sections[currentSection]

  useEffect(() => {
    if (!section) return
    setFormValues(buildInitialFieldValues(section))
    setFieldUnits(buildInitialUnits(section))
    setFieldErrors({})
    setActiveTab('form')
    setActiveFieldId('section-overview')
    setInlineComments(section.comments ?? {})
    setHistoryEntries(section.history ?? [])
    setBreakdownRows(
      (section.breakdown?.rows ?? []).map((row: any) => ({
        ...row,
        activityValue: row.activityValue?.toString() ?? '',
        emissionFactorValue: row.emissionFactorValue?.toString() ?? '',
        uncertainty: row.uncertainty?.toString() ?? '',
      }))
    )
    setBreakdownGrouping(section.breakdown?.groupingOptions?.[0] ?? 'Business Unit')
  }, [section])

  useEffect(() => {
    if (!section) return
    const timer = setTimeout(() => {
      setAutoSaveStatus('saved')
    }, 900)
    setAutoSaveStatus('saving')
    return () => clearTimeout(timer)
  }, [section?.id, formValues, breakdownRows])

  useEffect(() => {
    if (!breakdownRows.length) return
    const total = breakdownRows.reduce((sum, row) => sum + getRowTotal(row), 0)
    setFormValues(prev => ({
      ...prev,
      scope1_total: total ? total.toFixed(2) : prev.scope1_total,
    }))
  }, [breakdownRows])

  const handleNavSelection = (id: string) => {
    const targetIndex = sections.findIndex(s => s.id === id)
    if (targetIndex >= 0) {
      setCurrentSection(targetIndex)
    }
  }

  const filteredSections = useMemo(() => {
    return sections.filter(sect => {
      const health = computeSectionHealth(sect)
      if (navFilter === 'missing') {
        return health.missingRequired + health.evidenceMissing + health.validationErrors + health.validationWarnings > 0
      }
      if (navFilter === 'mine') {
        return (sect.meta?.owner ?? module?.approver ?? '') === currentUser
      }
      if (navFilter === 'material') {
        return Boolean(sect.material)
      }
      return true
    })
  }, [sections, navFilter, module?.approver])

  const handleFieldChange = useCallback((field: any, value: string) => {
    setFormValues(prev => ({ ...prev, [field.id]: value }))
    const lowerLabel = field.label?.toLowerCase?.() ?? ''
    const looksNumeric = numericKeywords.some(keyword => lowerLabel.includes(keyword))
    if (looksNumeric) {
      if (value === '' || isPureNumeric(value)) {
        setFieldErrors(prev => ({ ...prev, [field.id]: null }))
      } else {
        setFieldErrors(prev => ({ ...prev, [field.id]: 'Enter a numeric value' }))
      }
    }
  }, [])

  const handleUnitChange = (fieldId: string, unit: string) => {
    setFieldUnits(prev => ({ ...prev, [fieldId]: unit }))
  }

  const handleRowChange = (rowId: string, key: string, value: string) => {
    setBreakdownRows(prev =>
      prev.map(row => {
        if (row.id !== rowId) return row
        const nextRow = { ...row, [key]: value }
        if (['activityValue', 'emissionFactorValue', 'emissionFactorUnit'].includes(key)) {
          nextRow.calculated = getRowTotal(nextRow)
        }
        return nextRow
      })
    )
    setActiveFieldId('breakdown')
  }

  const handleGasToggle = (rowId: string, gas: string) => {
    setBreakdownRows(prev =>
      prev.map(row => {
        if (row.id !== rowId) return row
        const gases = row.gas ?? []
        const exists = gases.includes(gas)
        return {
          ...row,
          gas: exists ? gases.filter((g: string) => g !== gas) : [...gases, gas],
        }
      })
    )
    setActiveFieldId('breakdown')
  }

  const handleAddRow = () => {
    const newRow = {
      id: `row-${Date.now()}`,
      category: section?.breakdown?.categories?.[0] ?? 'Other',
      gas: ['CO2'],
      activityValue: '',
      activityUnit: section?.breakdown?.activityUnits?.[0] ?? 'L',
      emissionFactorValue: '',
      emissionFactorUnit: section?.breakdown?.emissionFactorUnits?.[0] ?? 'kg CO2e / L',
      emissionFactorReference: '',
      calculated: 0,
      uncertainty: '',
      evidence: '',
      notes: '',
      group: breakdownGrouping,
    }
    setBreakdownRows(prev => [...prev, newRow])
    setActiveFieldId('breakdown')
  }

  const handleImportRows = () => {
    fileInputRef.current?.click()
  }

  const handleCommentStart = (fieldId: string) => {
    setCommentDrafts(prev => ({ ...prev, [fieldId]: prev[fieldId] ?? '' }))
  }

  const handleCommentChange = (fieldId: string, value: string) => {
    setCommentDrafts(prev => ({ ...prev, [fieldId]: value }))
  }

  const handleCommentSave = (field: any) => {
    const draft = commentDrafts[field.id]
    if (!draft?.trim()) return
    const newComment = {
      id: `comment-${Date.now()}`,
      author: currentUser,
      actor: currentActor,
      text: draft.trim(),
      timestamp: new Date().toISOString(),
    }
    setInlineComments(prev => ({
      ...prev,
      [field.id]: [...(prev[field.id] ?? []), newComment],
    }))
    setHistoryEntries(prev => [
      {
        id: `history-${Date.now()}`,
        type: 'comment',
        description: `Comment on ${field.label}: "${draft.trim()}"`,
        actor: currentUser,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ])
    setCommentDrafts(prev => {
      const next = { ...prev }
      delete next[field.id]
      return next
    })
  }

  const handleCommentCancel = (fieldId: string) => {
    setCommentDrafts(prev => {
      const next = { ...prev }
      delete next[fieldId]
      return next
    })
  }

  if (!module || !section) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Questionnaire not found</h2>
        <button onClick={() => navigate('/modules')} className="text-accent hover:underline">
          Back to modules
        </button>
      </div>
    )
  }

  const completedSections = sections.filter(s => s.completed).length
  const completionPercentage = Math.round((completedSections / sections.length) * 100)
  const sectionCompletionRequired = section.meta?.completion?.required ?? section.fields.filter((f: any) => f.required).length
  const sectionCompletionAnswered =
    section.meta?.completion?.answered ??
    section.fields.filter((f: any) => f.required && (formValues[f.id]?.length ?? 0)).length
  const activeGuidance = getSectionGuidance(section, activeFieldId)
  const breakdownTotal = breakdownRows.reduce((sum, row) => sum + getRowTotal(row), 0)
  const contributions = breakdownRows
    .map(row => ({
      id: row.id,
      label: row.category,
      value: getRowTotal(row),
      percent: breakdownTotal ? (getRowTotal(row) / breakdownTotal) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)

  const evidenceForField = (fieldId: string) =>
    (section.evidenceEntries ?? []).filter((entry: any) => entry.linkedTo?.includes(fieldId))

  const renderFieldInput = (field: any) => {
    if (field.controlledByBreakdown) {
      return (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-dashed border-accent/40 bg-accent/5 text-sm text-gray-200">
            Breakdown controlled. Edit source lines inside the Breakdown tab. Totals auto-sync back to this field.
          </div>
          <div className="space-y-2">
            {contributions.map(item => (
              <div key={item.id}>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span>{item.label}</span>
                  <span>{item.percent.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-dark-bg rounded-full">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-accent to-blue-500"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    // Structured input removed - keeping standard GRI text fields

    if (field.type === 'textarea') {
      return (
                <textarea
          value={formValues[field.id] ?? ''}
                  rows={4}
          onFocus={() => setActiveFieldId(field.id)}
          onChange={event => handleFieldChange(field, event.target.value)}
                  className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  placeholder="Enter detailed response..."
                />
      )
    }

    if (field.type === 'select') {
      const options = Array.isArray(field.options) ? field.options : Array.isArray(field.value) ? field.value : []
      return (
                <select
          value={formValues[field.id] ?? ''}
          onFocus={() => setActiveFieldId(field.id)}
          onChange={event => handleFieldChange(field, event.target.value)}
                  className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">Select an option</option>
          {options.map((option: string) => (
            <option key={option} value={option}>
              {option}
            </option>
                  ))}
                </select>
      )
    }

    return (
      <input
        value={formValues[field.id] ?? ''}
        onFocus={() => setActiveFieldId(field.id)}
        onChange={event => handleFieldChange(field, event.target.value)}
        className={clsx(
          'w-full px-4 py-3 bg-dark-bg border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent',
          fieldErrors[field.id] ? 'border-red-500/60' : 'border-dark-border'
        )}
        placeholder="Enter value..."
      />
    )
  }

  const renderFieldCard = (field: any) => {
    const unitOptions = field.units ?? deriveUnitsFromLabel(field.label)
    const evidenceLinked = evidenceForField(field.id)
    return (
      <div key={field.id} className="bg-dark-surface border border-dark-border rounded-2xl p-6 shadow-xl shadow-black/20">
        <div className="flex items-start justify-between gap-4 mb-4">
          <label className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">{field.label}</span>
              {field.required && <span className="text-red-400 text-sm">*</span>}
            </div>
            <p className="text-xs text-gray-500 mt-1">Field ID: {field.id}</p>
          </label>
          {field.controlledByBreakdown && (
            <span className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1 flex items-center gap-1">
              <Table className="w-3.5 h-3.5" />
              Managed via Breakdown
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-3">
            {renderFieldInput(field)}
            {unitOptions?.length > 0 && !field.controlledByBreakdown && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                <span>Unit</span>
                <div className="flex gap-2">
                  {unitOptions.map((unit: string) => (
                    <button
                      key={unit}
                      onClick={() => handleUnitChange(field.id, unit)}
                      className={clsx(
                        'px-3 py-1 rounded-full border text-xs transition-colors',
                        fieldUnits[field.id] === unit
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-dark-border text-gray-400 hover:border-gray-500'
                      )}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {fieldErrors[field.id] && (
              <p className="text-xs text-red-400">{fieldErrors[field.id]}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button
              className="flex items-center gap-2 text-accent hover:underline"
              onClick={() => setActiveFieldId(field.id)}
            >
                <Link2 className="w-4 h-4" />
              {evidenceLinked.length ? `${evidenceLinked.length} evidence file${evidenceLinked.length > 1 ? 's' : ''}` : 'Link evidence'}
              </button>
            <span className="text-gray-500 text-xs">
              {field.required ? 'Evidence required if quantitative' : 'Optional'}
            </span>
          </div>

          <div className="border border-dark-border rounded-xl p-3 bg-dark-bg/60 text-xs space-y-2">
            <div className="flex items-center justify-between text-gray-400">
              <span>Inline comments</span>
              <button
                onClick={() => handleCommentStart(field.id)}
                className="flex items-center gap-1 text-accent"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Add comment
              </button>
            </div>
            <div className="space-y-2">
              {(inlineComments[field.id] ?? []).map((comment: any) => (
                <div key={comment.id} className="text-gray-300 bg-dark-surface/60 border border-dark-border rounded-lg p-2">
                  <p className="text-sm">{comment.text}</p>
                  <div className="text-[11px] text-gray-500 mt-1">
                    {comment.author} · {formatDate(comment.timestamp)}
                  </div>
            </div>
          ))}
        </div>
            {commentDrafts[field.id] !== undefined && (
              <div className="space-y-2">
                <textarea
                  value={commentDrafts[field.id]}
                  onChange={event => handleCommentChange(field.id, event.target.value)}
                  rows={2}
                  className="w-full text-sm bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="Leave a review note..."
                />
                <div className="flex items-center gap-2 justify-end">
                  <button className="text-xs text-gray-400 hover:text-gray-200" onClick={() => handleCommentCancel(field.id)}>
                    Cancel
                  </button>
                  <button
                    className="text-xs px-3 py-1 rounded-full bg-accent/20 text-accent border border-accent/40"
                    onClick={() => handleCommentSave(field)}
                  >
                    Save comment
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderBreakdownRows = () => {
    if (!section.breakdown) {
      return (
        <div className="text-gray-400 text-sm border border-dark-border rounded-xl p-6 bg-dark-surface">
          No breakdown template configured for this disclosure.
        </div>
      )
    }

    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Total Scope 1 (auto-sum)</p>
            <div className="text-3xl font-bold text-white">{formatNumber(breakdownTotal, 2)} tCO2e</div>
            <p className="text-sm text-gray-400">Pushes to “Total Scope 1 emissions” field.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {section.breakdown.groupingOptions?.map((option: string) => (
              <button
                key={option}
                onClick={() => setBreakdownGrouping(option)}
                className={clsx(
                  'px-3 py-1.5 text-xs rounded-full border transition-colors',
                  breakdownGrouping === option
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-dark-border text-gray-400 hover:border-gray-500'
                )}
              >
                Show by {option}
              </button>
            ))}
            <button
              onClick={handleImportRows}
              className="flex items-center gap-2 px-3 py-2 border border-dark-border rounded-lg text-sm text-gray-200 hover:border-accent transition-colors"
            >
              <UploadCloud className="w-4 h-4" />
              Import rows (CSV/XLSX)
            </button>
            <button
              onClick={handleAddRow}
              className="flex items-center gap-2 px-3 py-2 bg-accent/10 text-accent border border-accent/40 rounded-lg text-sm"
            >
              <Plus className="w-4 h-4" />
              Add row
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-dark-border bg-dark-surface shadow-inner shadow-black/30">
          <table className="min-w-full text-sm border-collapse">
            <thead className="text-xs uppercase tracking-wide text-gray-400 bg-black/30 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left font-semibold border-b-2 border-dark-border">Source category</th>
                <th className="px-4 py-3 text-left font-semibold border-b-2 border-dark-border">Gas mix</th>
                <th className="px-4 py-3 text-left font-semibold border-b-2 border-dark-border">Activity data</th>
                <th className="px-4 py-3 text-left font-semibold border-b-2 border-dark-border">Emission factor</th>
                <th className="px-4 py-3 text-right font-semibold border-b-2 border-dark-border">Calculated tCO2e</th>
                <th className="px-4 py-3 text-right font-semibold border-b-2 border-dark-border">Uncertainty %</th>
                <th className="px-4 py-3 text-left font-semibold border-b-2 border-dark-border">
                  <div className="flex items-center justify-between gap-2">
                    <span>Evidence</span>
                    <span className="text-amber-300 text-[10px] font-normal">≥1 file</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-semibold border-b-2 border-dark-border">Notes</th>
              </tr>
            </thead>
            <tbody>
              {breakdownRows.map(row => (
                <tr key={row.id} className="border-t border-dark-border/40 hover:bg-dark-bg/30 transition-colors">
                  <td className="px-4 py-3 align-top">
                    <select
                      value={row.category}
                      onFocus={() => setActiveFieldId('breakdown')}
                      onChange={event => handleRowChange(row.id, 'category', event.target.value)}
                      className="w-full min-w-[180px] bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      {section.breakdown.categories.map((category: string) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-1 min-w-[140px]">
                      {gasOptions.map(gas => (
                        <button
                          type="button"
                          key={gas}
                          onClick={() => handleGasToggle(row.id, gas)}
                          className={clsx(
                            'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
                            row.gas?.includes(gas)
                              ? 'border-accent bg-accent/20 text-accent'
                              : 'border-dark-border text-gray-400 hover:border-accent/50'
                          )}
                        >
                          {gas}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-2 min-w-[160px]">
                      <input
                        type="number"
                        value={row.activityValue}
                        onFocus={() => setActiveFieldId('breakdown')}
                        onChange={event => handleRowChange(row.id, 'activityValue', event.target.value)}
                        className="bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="Value"
                      />
                      <select
                        value={row.activityUnit}
                        onChange={event => handleRowChange(row.id, 'activityUnit', event.target.value)}
                        className="bg-dark-bg border border-dark-border rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        {section.breakdown.activityUnits.map((unit: string) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <input
                        type="number"
                        step="0.001"
                        value={row.emissionFactorValue}
                        onFocus={() => setActiveFieldId('breakdown')}
                        onChange={event => handleRowChange(row.id, 'emissionFactorValue', event.target.value)}
                        className="bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="Factor"
                      />
                      <select
                        value={row.emissionFactorUnit}
                        onChange={event => handleRowChange(row.id, 'emissionFactorUnit', event.target.value)}
                        className="bg-dark-bg border border-dark-border rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        {section.breakdown.emissionFactorUnits.map((unit: string) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={row.emissionFactorReference ?? ''}
                        onChange={event => handleRowChange(row.id, 'emissionFactorReference', event.target.value)}
                        className="bg-dark-bg border border-dark-border rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="e.g., DEFRA 2024"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/30 rounded-lg px-4 py-3 text-right min-w-[120px]">
                      <div className="text-white font-bold text-lg">{formatNumber(getRowTotal(row), 1)}</div>
                      <div className="text-xs text-gray-400 mt-0.5">tCO2e</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="relative min-w-[100px]">
                      <input
                        type="number"
                        step="0.1"
                        value={row.uncertainty ?? ''}
                        onFocus={() => setActiveFieldId('breakdown')}
                        onChange={event => handleRowChange(row.id, 'uncertainty', event.target.value)}
                        className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 pr-8 text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="min-w-[160px]">
                      <select
                        value={row.evidence ?? ''}
                        onFocus={() => setActiveFieldId('breakdown')}
                        onChange={event => handleRowChange(row.id, 'evidence', event.target.value)}
                        className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="">Select file...</option>
                        {(section.evidenceEntries ?? []).map((entry: any) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.id}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Required
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input
                      type="text"
                      value={row.notes ?? ''}
                      onFocus={() => setActiveFieldId('breakdown')}
                      onChange={event => handleRowChange(row.id, 'notes', event.target.value)}
                      className="w-full min-w-[200px] bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="Notes..."
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
      </>
    )
  }

  const renderEvidenceTab = () => {
    const evidenceEntries = section.evidenceEntries ?? []
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Evidence health</p>
            <p className="text-lg text-white">
              {section.meta?.evidence?.linked ?? evidenceEntries.length} linked ·{' '}
              <span className="text-amber-300">{section.meta?.evidence?.missing ?? 0} missing</span>
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-dark-border rounded-xl text-sm text-gray-200 hover:border-accent transition-colors">
            <FileSpreadsheet className="w-4 h-4" />
            Evidence library
          </button>
        </div>
        <div className="border border-dark-border rounded-2xl overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-black/30 text-gray-400 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">ID / Name</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Linked to</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Owner</th>
                <th className="text-left px-4 py-3">Added</th>
              </tr>
            </thead>
            <tbody>
              {evidenceEntries.map((entry: any) => (
                <tr key={entry.id} className="border-t border-dark-border/70">
                  <td className="px-4 py-3 text-white">
                    <div className="font-medium">{entry.id}</div>
                    <div className="text-xs text-gray-500">{entry.name}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{entry.type}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{entry.linkedTo?.join(', ')}</td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        'px-2 py-1 rounded-full text-xs border',
                        entry.status === 'anchored'
                          ? 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10'
                          : entry.status === 'missing'
                          ? 'border-red-500/50 text-red-300 bg-red-500/10'
                          : 'border-amber-500/50 text-amber-300 bg-amber-500/10'
                      )}
                    >
                      {entry.status ?? 'pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{entry.owner ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{entry.addedAt ? new Date(entry.addedAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {!evidenceEntries.length && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                    No evidence linked yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderKPITab = () => {
    const kpis = section.kpis ?? {}
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase text-gray-500">
              <BarChart3 className="w-4 h-4 text-accent" />
              Total tCO2e (FY)
            </div>
            <div className="text-3xl font-bold text-white">{formatNumber(kpis.total?.current, 0)}</div>
            <div className={clsx('text-sm', (kpis.total?.yoy ?? 0) <= 0 ? 'text-emerald-400' : 'text-amber-300')}>
              {kpis.total?.yoy ?? 0}% YoY
            </div>
          </div>
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase text-gray-500">
              <GaugeCircle className="w-4 h-4 text-blue-400" />
              Intensity
            </div>
            <div className="text-3xl font-bold text-white">
              {kpis.intensity?.value ?? '—'} <span className="text-base text-gray-400">{kpis.intensity?.unit}</span>
            </div>
            <div className={clsx('text-sm', (kpis.intensity?.change ?? 0) <= 0 ? 'text-emerald-400' : 'text-amber-300')}>
              {(kpis.intensity?.change ?? 0) > 0 ? '+' : ''}
              {kpis.intensity?.change ?? 0}% vs LY
            </div>
          </div>
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase text-gray-500">
              <PercentCircle className="w-4 h-4 text-purple-400" />
              Coverage
            </div>
            <div className="text-3xl font-bold text-white">
              {Math.round(((kpis.coverage?.included ?? 0) / (kpis.coverage?.total ?? 1)) * 100)}%
            </div>
            <div className="text-xs text-gray-400">
              {kpis.coverage?.included ?? 0} sites included / {kpis.coverage?.total ?? 0} total
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
            <div className="flex items-center gap-2 text-xs uppercase text-gray-500 mb-4">
              <Activity className="w-4 h-4 text-emerald-400" />
              Top contributing sources
            </div>
            <div className="space-y-3">
              {contributions.slice(0, 3).map(item => (
                <div key={item.id}>
                  <div className="flex items-center justify-between text-sm text-gray-300">
                    <span>{item.label}</span>
                    <span>{item.percent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-dark-bg rounded-full mt-1">
                    <div className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-accent" style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase text-gray-500">
              <AlertTriangle className="w-4 h-4 text-amber-300" />
              KRI dashboard
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between border border-dark-border rounded-lg px-3 py-2">
                <span className="text-gray-300">Missing evidence</span>
                <span className="text-amber-300 font-semibold">{kpis.kri?.missingEvidence ?? 0}</span>
              </div>
              <div className="flex items-center justify-between border border-dark-border rounded-lg px-3 py-2">
                <span className="text-gray-300">High uncertainty rows</span>
                <span className="text-amber-300 font-semibold">{kpis.kri?.highUncertaintyRows?.length ?? 0}</span>
              </div>
              <div className="border border-dark-border rounded-lg px-3 py-2 text-gray-300">
                <p className="text-xs uppercase text-gray-500 mb-1">Outliers</p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  {(kpis.kri?.outliers ?? []).map((outlier: string) => (
                    <li key={outlier}>{outlier}</li>
                  ))}
                </ul>
              </div>
              <div className="border border-dark-border rounded-lg px-3 py-2 text-gray-300">
                <p className="text-xs uppercase text-gray-500 mb-1">Boundary warnings</p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  {(kpis.kri?.boundaryWarnings ?? []).map((warning: string) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderHistoryTab = () => (
    <div className="space-y-4">
      {historyEntries.map(entry => (
        <div key={entry.id} className="bg-dark-surface border border-dark-border rounded-2xl p-5 flex items-start gap-4">
          <div className="p-3 bg-dark-bg rounded-xl">
            <History className="w-5 h-5 text-accent" />
          </div>
          <div>
            <div className="text-white font-medium">{entry.description}</div>
            <div className="text-xs text-gray-400 mt-1">
              {entry.actor} · {new Date(entry.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
      {!historyEntries.length && (
        <div className="text-gray-500 text-sm border border-dashed border-dark-border rounded-xl p-6 text-center">
          No audit history yet.
        </div>
      )}
    </div>
  )

  const renderTabContent = () => {
    if (activeTab === 'breakdown') {
      return renderBreakdownRows()
    }
    if (activeTab === 'evidence') {
      return renderEvidenceTab()
    }
    if (activeTab === 'kpi') {
      return renderKPITab()
    }
    if (activeTab === 'history') {
      return renderHistoryTab()
    }
    return section.fields.map((field: any) => renderFieldCard(field))
  }

  return (
    <div className="flex gap-6 -m-8 h-[calc(100vh-4rem)] bg-dark-bg">
      <div className="w-80 bg-dark-surface border-r border-dark-border p-6 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white mb-2">{module.title}</h2>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Progress</span>
            <span className="text-accent font-medium">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-dark-bg rounded-full h-2 mt-2">
            <div className="bg-accent rounded-full h-2 transition-all" style={{ width: `${completionPercentage}%` }} />
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 text-xs uppercase text-gray-500 mb-2">
            <Filter className="w-3.5 h-3.5" />
            Filters
          </div>
          <div className="flex flex-wrap gap-2">
            {navFilters.map(filter => (
              <button
                key={filter.id}
                onClick={() => setNavFilter(filter.id)}
                className={clsx(
                  'px-3 py-1.5 rounded-full border text-xs',
                  navFilter === filter.id ? 'border-accent text-accent bg-accent/10' : 'border-dark-border text-gray-400 hover:border-gray-500'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <nav className="space-y-2">
          {filteredSections.map(sect => {
            const index = sections.findIndex(s => s.id === sect.id)
            const health = computeSectionHealth(sect)
            const isActive = currentSection === index
            return (
            <button
              key={sect.id}
                onClick={() => handleNavSelection(sect.id)}
              className={clsx(
                  'w-full text-left px-4 py-3 rounded-2xl border transition-colors',
                  isActive ? 'border-accent bg-accent/5 text-accent' : 'border-transparent hover:border-dark-border text-gray-200'
              )}
            >
              <div className="flex items-center gap-3">
                {sect.completed ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                    <div className="w-4 h-4 rounded-full border border-gray-600 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{sect.title}</p>
                    <p className="text-xs text-gray-500">{sect.fields.length} fields</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
                  {health.missingRequired > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/30">
                      Missing Required ({health.missingRequired})
                    </span>
                  )}
                  {health.evidenceMissing > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      Evidence Missing ({health.evidenceMissing})
                    </span>
                  )}
                  {health.validationErrors > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/30">
                      Validation Errors ({health.validationErrors})
                    </span>
                  )}
                  {health.validationWarnings > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-300 border border-yellow-500/30">
                      Validation Warnings ({health.validationWarnings})
                    </span>
                  )}
                  {health.pendingReview > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30">
                      Pending Review
                    </span>
                  )}
                  {!health.missingRequired && !health.evidenceMissing && !health.validationErrors && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                      On track
                    </span>
                  )}
              </div>
            </button>
            )
          })}
          {!filteredSections.length && (
            <div className="text-center text-xs text-gray-500 border border-dashed border-dark-border rounded-xl py-8 px-3">
              No sections match this filter.
            </div>
          )}
        </nav>
      </div>

      <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8">
          <div className="sticky top-0 z-10 bg-dark-bg/98 backdrop-blur-sm border-b border-dark-border pb-6 mb-6 -mx-8 px-8 -mt-8 pt-8">
            <div className="flex flex-wrap justify-between items-start gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 text-xs mb-3">
                  <span className="uppercase tracking-wider text-gray-500 font-semibold">{section.id}</span>
                  <span className={clsx('px-3 py-1.5 rounded-full text-xs font-medium', statusStyles[section.meta?.status] ?? statusStyles.Draft)}>
                    {section.meta?.status ?? module.state ?? 'Draft'}
                  </span>
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <User className="w-3.5 h-3.5" />
                    {section.meta?.owner ?? currentUser}
                  </span>
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    Due {formatDate(section.meta?.dueDate)}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-white mb-3">{section.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="text-gray-400">
                    Completion: <span className="text-white font-semibold">{sectionCompletionAnswered}/{sectionCompletionRequired}</span> required
                  </span>
                  <span className="text-gray-400">
                    Evidence: <span className={clsx('font-semibold', (section.meta?.evidence?.missing ?? 0) > 0 ? 'text-amber-400' : 'text-emerald-400')}>{section.meta?.evidence?.missing ?? 0}</span> missing
                  </span>
                  <span className="text-gray-400">
                    Validation: <span className={clsx('font-semibold', (section.meta?.validation?.warnings ?? 0) > 0 ? 'text-amber-400' : 'text-emerald-400')}>{section.meta?.validation?.warnings ?? 0}</span> warnings
                  </span>
                  {autoSaveStatus === 'saved' ? (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      Saved {section.lastSaved ? new Date(section.lastSaved).toLocaleTimeString() : ''}
                    </span>
                  ) : (
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 animate-pulse" />
                      Autosaving…
                    </span>
              )}
            </div>
          </div>
              <div className="flex flex-wrap items-center gap-2">
                <button className="flex items-center gap-2 px-4 py-2.5 bg-dark-surface border border-dark-border rounded-xl text-white hover:border-accent transition-all">
              <Save className="w-4 h-4" />
                  <span className="font-medium">Save</span>
            </button>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 text-blue-300 border border-blue-500/30 rounded-xl hover:bg-blue-500/20 transition-all">
              <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Validate</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 text-purple-300 border border-purple-500/30 rounded-xl hover:bg-purple-500/20 transition-all">
                  <MessageSquare className="w-4 h-4" />
                  <span className="font-medium">Request review</span>
            </button>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-accent/10 text-accent border border-accent/30 rounded-xl hover:bg-accent/20 transition-all">
              <Anchor className="w-4 h-4" />
                  <span className="font-medium">Anchor</span>
            </button>
          </div>
        </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'px-4 py-2 rounded-xl text-sm border',
                    activeTab === tab.id
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-transparent text-gray-400 hover:border-dark-border'
                  )}
                >
                  <div className="font-semibold">{tab.label}</div>
                  <div className="text-[11px] text-gray-500">{tab.subtitle}</div>
              </button>
          ))}
            </div>
        </div>

          <div className="space-y-4">
            {renderTabContent()}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-dark-border">
          <button
            onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
            disabled={currentSection === 0}
            className="px-6 py-2.5 bg-dark-surface border border-dark-border rounded-xl font-medium hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentSection(Math.min(sections.length - 1, currentSection + 1))}
            disabled={currentSection === sections.length - 1}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent text-dark-bg rounded-xl font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next Section
            <ChevronRight className="w-4 h-4" />
          </button>
            </div>
        </div>
      </div>

      {showGuidance && (
          <div className="w-96 bg-dark-surface border-l border-dark-border p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between">
            <h3 className="font-bold text-white">Guidance</h3>
              <button onClick={() => setShowGuidance(false)} className="text-gray-400 hover:text-white">
              ✕
            </button>
          </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-300 mb-1">Field-specific guidance</h4>
                  <p className="text-sm text-gray-200">{activeGuidance.headline}</p>
                </div>
              </div>
            </div>
            <div className="space-y-3 text-sm text-gray-200">
            <div>
                <p className="text-xs uppercase text-gray-500 mb-2">What auditors check</p>
                <ul className="list-disc list-inside space-y-1">
                  {activeGuidance.auditorsCheck?.map((item: string) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            <div>
                <p className="text-xs uppercase text-gray-500 mb-2">Common mistakes</p>
                <ul className="list-disc list-inside text-red-300 space-y-1">
                  {activeGuidance.mistakes?.map((mistake: string) => (
                    <li key={mistake}>{mistake}</li>
                  ))}
                </ul>
                </div>
            <div>
                <p className="text-xs uppercase text-gray-500 mb-2">Example answer</p>
                <p className="text-gray-100 text-sm italic">{activeGuidance.example}</p>
                </div>
                </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-200 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <div>{activeGuidance.evidenceRequirement}</div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

