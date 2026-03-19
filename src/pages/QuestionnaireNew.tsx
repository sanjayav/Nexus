import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CheckCircle, Link2,
  ChevronLeft, User, Lock, MessageSquare,
  ChevronDown, Building2, Upload, Plus, ArrowRight,
  Mail, Sparkles, UserPlus
} from 'lucide-react'
import { mockData } from '../data/mockData'
import clsx from 'clsx'
import { useRBAC, ROLE_DEFINITIONS, RoleId } from '../contexts/RBACContext'

// Key ESG Aesthetic Theme Colors
const theme = {
  bgDark: 'bg-[#04332D]',
  bgLight: 'bg-[#F4F7F6]',
  primaryGreen: 'bg-[#12C87A]',
  primaryGreenHover: 'hover:bg-[#0EA965]',
  textPrimaryGreen: 'text-[#12C87A]',
  textDark: 'text-[#011C16]',
  borderGreen: 'border-[#12C87A]',
}

export default function QuestionnaireNew() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const navigate = useNavigate()
  const { currentRole, setRole } = useRBAC()

  const [activeEntity, setActiveEntity] = useState('Asyad Group (Consolidated)')
  const entities = ['Asyad Group (Consolidated)', 'Asyad Ports', 'Asyad Shipping', 'Oman Rail', 'Asyad Logistics']

  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [aiPrompts, setAiPrompts] = useState<Record<string, boolean>>({}) // Track which textareas have active AI suggestions

  const module = useMemo(() => mockData.modules.find(m => m.id === moduleId), [moduleId])
  const sections = useMemo(() => mockData.questionnaireSections.filter(s => s.module === moduleId), [moduleId])
  const [activeSectionId, setActiveSectionId] = useState('')

  useEffect(() => {
    if (sections.length > 0 && !activeSectionId) setActiveSectionId(sections[0].id)
  }, [sections, activeSectionId])

  const currentSection = useMemo(() => {
    if (sections.length === 0) return null
    return sections.find(s => s.id === activeSectionId) || sections[0]
  }, [sections, activeSectionId])

  if (!module) return <div className="p-12 text-center text-xl font-bold">Module Not Found</div>

  const handleGenerateText = (fieldId: string) => {
    setAiPrompts(prev => ({ ...prev, [fieldId]: true }))
    // Simulate AI generation delay
    setTimeout(() => {
      setFormValues(prev => ({
        ...prev,
        [fieldId]: `Based on our corporate policy and localized operational data, we are committed to aligning with the Science Based Targets initiative (SBTi). We aim to reduce Scope 1 emissions by 24%, and Scope 2 by 15% by 2030, through extensive fleet modernization and localized green grid integration.`
      }))
      setAiPrompts(prev => ({ ...prev, [fieldId]: false }))
    }, 1500)
  }

  const fields = (currentSection?.fields || []) as any[]

  return (
    <div className={`flex flex-col min-h-[calc(100vh-6rem)] ${theme.bgLight} font-sans relative overflow-hidden rounded-br-[2.5rem]`}>

      {/* ── Background Design ── */}
      <div className={`absolute top-0 left-0 right-0 h-[450px] ${theme.bgDark} rounded-b-[4rem] z-0`} />

      {/* Decorative circles */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-white/[0.02] border border-white/[0.05] z-0 pointer-events-none" />
      <div className="absolute top-[10%] right-[5%] w-[400px] h-[400px] rounded-full bg-white/[0.02] border border-white/[0.05] z-0 pointer-events-none" />
      <div className="absolute top-[30%] left-[-10%] w-[300px] h-[300px] rounded-full bg-white/[0.02] border border-white/[0.05] z-0 pointer-events-none" />

      {/* ── Top Nav ── */}
      <div className={`w-full max-w-7xl mx-auto pt-6 pb-2 px-4 flex items-center justify-between z-10 relative`}>
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(`/modules`)} className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-full border border-white/10">
            <Building2 className="w-4 h-4 text-white/70" />
            <select value={activeEntity} onChange={(e) => setActiveEntity(e.target.value)} className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer appearance-none">
              {entities.map(e => <option key={e} value={e} className="text-black">{e}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-white/50 ml-1" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Demo Role Switcher overlayed for testing */}
          <select
            className="bg-white/10 border border-white/20 text-white text-xs font-semibold px-4 py-2 rounded-full focus:outline-none appearance-none cursor-pointer"
            value={currentRole}
            onChange={(e) => setRole(e.target.value as RoleId)}
          >
            {Object.values(ROLE_DEFINITIONS).map(r => <option key={r.id} value={r.id} className="text-black">{r.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex-1 flex w-full max-w-7xl mx-auto z-10 relative px-4 overflow-hidden mb-8 gap-8 mt-2">

        {/* Left Sidebar Menu (Framework Navigation) */}
        <div className="w-72 flex flex-col shrink-0 overflow-y-auto hidden lg:flex pb-12 scrollbar-none">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">{module.title}</h1>
            <p className="text-white/60 text-sm mt-3 font-medium">Automate and streamline your data collection process.</p>
          </div>

          <div className="bg-white rounded-[24px] shadow-xl p-3 flex flex-col gap-1 border border-black/5">
            <div className="p-4 pb-2">
              <p className="text-xs font-bold text-black/40 uppercase tracking-widest mb-1">Framework Sections</p>
            </div>
            {sections.map((section, idx) => {
              const active = activeSectionId === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSectionId(section.id)}
                  className={clsx(
                    'w-full text-left px-4 py-3.5 rounded-[16px] transition-all flex items-center justify-between group',
                    active ? 'bg-[#F2FDF7] text-[#013328]' : 'hover:bg-black/5 text-black/60'
                  )}
                >
                  <span className={clsx("text-sm font-bold", active && "text-[#12C87A]")}>
                    {idx + 1}. {section.title.replace(/^(Section [A-E]|BRSR Section [A-E]) – /, '').split(':')[0].trim()}
                  </span>
                  {active && <ArrowRight className="w-4 h-4 text-[#12C87A]" />}
                </button>
              )
            })}

            <div className="mt-4 p-4 border-t border-black/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-black/60">Module Progress</span>
                <span className="text-xs font-bold text-[#12C87A]">63%</span>
              </div>
              <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#12C87A] rounded-full w-[63%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area (Cards) */}
        <div className="flex-1 overflow-y-auto pb-24 scrollbar-none mt-2 lg:mt-0">

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white tracking-tight">{currentSection?.title}</h2>

            <div className="flex items-center gap-3">
              <button onClick={() => console.log('Submitted')} className={`flex items-center gap-2 px-6 py-3 rounded-full shadow-lg ${theme.primaryGreen} ${theme.primaryGreenHover} text-white font-bold text-sm transition-all shadow-[#12C87A]/20`}>
                <CheckCircle className="w-4 h-4" /> Submit Section
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-6">

            {/* Quick Action Cards (User Management / Connections) */}
            <div className="grid grid-cols-2 gap-6 mb-2">
              <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-black/5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-[#011C16]">User management</h3>
                    <UserPlus className="w-5 h-5 text-black/20" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-black/80 flex items-center gap-2"><User className="w-3.5 h-3.5" /> Data Gatherer (Site A)</span>
                      <span className="text-[#12C87A] font-bold bg-[#12C87A]/10 px-2 py-0.5 rounded">Invite pending</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-black/80 flex items-center gap-2"><Lock className="w-3.5 h-3.5" /> Auditor (Internal)</span>
                      <span className="text-[#12C87A] font-bold bg-[#12C87A]/10 px-2 py-0.5 rounded">Joined 19 Sep</span>
                    </div>
                  </div>
                </div>
                <button className={`mt-5 w-full py-2.5 rounded-xl border-2 ${theme.borderGreen} ${theme.textPrimaryGreen} font-bold text-xs hover:bg-[#12C87A]/5 transition-colors`}>
                  Manage Access
                </button>
              </div>

              <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-black/5 flex flex-col justify-between items-center text-center">
                <div className="w-12 h-12 bg-[#F2FDF7] rounded-full flex items-center justify-center mb-3">
                  <Upload className={`w-5 h-5 ${theme.textPrimaryGreen}`} />
                </div>
                <h3 className="text-sm font-bold text-[#011C16] mb-1">Entity Documentation</h3>
                <p className="text-xs text-black/50 font-medium px-4 mb-4">Upload policies or raw invoices for AI to calculate metrics below.</p>
                <button className={`w-full py-2.5 rounded-xl border border-black/10 font-bold text-xs hover:bg-black/5 transition-colors`}>
                  Upload File
                </button>
              </div>
            </div>

            {/* Metric Collection Cards */}
            {fields.map((field) => (
              <div key={field.id} className="bg-white rounded-[24px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-black/5 transition-all hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] group relative">

                {/* Categorization Tag */}
                <div className={clsx(
                  "absolute -top-3 left-8 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm",
                  (field.id.includes('energy') || field.id.includes('emissions') || field.id.includes('ghg') || field.id.includes('water') || field.id.includes('waste') || field.id.includes('biodiversity') || field.id.includes('carbon') || field.id.includes('env') || field.id.includes('p5'))
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : (field.id.includes('employee') || field.id.includes('safety') || field.id.includes('worker') || field.id.includes('training') || field.id.includes('posh') || field.id.includes('welfare') || field.id.includes('p3') || field.id.includes('p6') || field.id.includes('hr'))
                    ? 'bg-blue-50 border border-blue-200 text-blue-700'
                    : (field.id.includes('csr') || field.id.includes('community') || field.id.includes('p8') || field.id.includes('inclusive'))
                    ? 'bg-purple-50 border border-purple-200 text-purple-700'
                    : (field.id.includes('revenue') || field.id.includes('profit') || field.id.includes('capex') || field.id.includes('fines') || field.id.includes('green_revenue'))
                    ? 'bg-amber-50 border border-amber-200 text-amber-700'
                    : 'bg-[#FFF9E6] border border-[#FFE898] text-[#9D7103]'
                )}>
                  {(field.id.includes('energy') || field.id.includes('emissions') || field.id.includes('ghg') || field.id.includes('water') || field.id.includes('waste') || field.id.includes('biodiversity') || field.id.includes('carbon') || field.id.includes('env') || field.id.includes('p5'))
                    ? 'Environment'
                    : (field.id.includes('employee') || field.id.includes('safety') || field.id.includes('worker') || field.id.includes('training') || field.id.includes('posh') || field.id.includes('welfare') || field.id.includes('p3') || field.id.includes('p6') || field.id.includes('hr'))
                    ? 'Social'
                    : (field.id.includes('csr') || field.id.includes('community') || field.id.includes('p8') || field.id.includes('inclusive'))
                    ? 'CSR / Inclusive Growth'
                    : (field.id.includes('revenue') || field.id.includes('profit') || field.id.includes('capex') || field.id.includes('fines') || field.id.includes('green_revenue'))
                    ? 'Financial'
                    : 'Governance'}
                </div>

                <div className="flex flex-col lg:flex-row gap-8 items-start pt-2">
                  <div className="flex-1 w-full relative">
                    <label className="block text-lg font-bold text-[#011C16] mb-2 leading-snug pr-8">
                      {field.label}
                    </label>
                    {field.hint && <p className="text-sm font-medium text-black/50 mb-4">{field.hint}</p>}

                    {field.type === 'textarea' ? (
                      <div className="relative">
                        <textarea
                          value={formValues[field.id] ?? field.value ?? ''}
                          onChange={e => setFormValues({ ...formValues, [field.id]: e.target.value })}
                          rows={4}
                          className="w-full px-5 py-4 bg-[#F8FAFA] border border-black/10 rounded-[16px] text-[#011C16] focus:outline-none focus:ring-2 focus:ring-[#12C87A] focus:border-transparent resize-none text-sm transition-all"
                          placeholder="Provide the qualitative response for this disclosure..."
                        />
                        {/* AI Generate Text Button (Floating inside textarea) */}
                        <div className="absolute bottom-4 right-4 flex gap-2">
                          <button
                            onClick={() => handleGenerateText(field.id)}
                            disabled={aiPrompts[field.id]}
                            className={clsx(
                              `flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md transition-all`,
                              aiPrompts[field.id] ? "bg-black/20 cursor-wait" : `${theme.primaryGreen} ${theme.primaryGreenHover}`
                            )}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            {aiPrompts[field.id] ? 'Generating...' : 'Generate Text'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative max-w-sm">
                        <input
                          type={field.type === 'number' ? 'number' : 'text'}
                          value={formValues[field.id] ?? field.value ?? ''}
                          onChange={e => setFormValues({ ...formValues, [field.id]: e.target.value })}
                          className={`w-full px-5 py-4 bg-[#F8FAFA] border ${formValues[field.id] ? 'border-[#12C87A]' : 'border-black/10'} rounded-[16px] text-lg font-bold text-[#011C16] focus:outline-none focus:ring-2 focus:ring-[#12C87A] focus:border-transparent transition-all`}
                          placeholder={field.type === 'number' ? '0.00' : 'Enter value...'}
                        />
                        {formValues[field.id] && (
                          <div className={`absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full ${theme.primaryGreen} flex items-center justify-center text-white`}>
                            <CheckCircle className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Side Actions for the Field */}
                  <div className="w-full lg:w-64 flex flex-shrink-0 flex-col gap-3">
                    <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest pl-1">Actions & Delegation</p>

                    <button className="flex items-center justify-between w-full px-4 py-3 bg-[#F8FAFA] hover:bg-[#F2FDF7] border border-black/5 hover:border-[#12C87A]/30 rounded-xl transition-all text-sm font-semibold text-black/70 group">
                      <span className="flex items-center gap-2"><Mail className="w-4 h-4 text-black/40 group-hover:text-[#12C87A]" /> Request Data</span>
                      <ChevronRightIcon className="w-4 h-4 text-black/20" />
                    </button>

                    <button className="flex items-center justify-between w-full px-4 py-3 bg-[#F8FAFA] hover:bg-black/5 border border-black/5 rounded-xl transition-all text-sm font-semibold text-black/70 group">
                      <span className="flex items-center gap-2"><Link2 className="w-4 h-4 text-black/40" /> Linked API Source</span>
                      <span className="w-2 h-2 rounded-full bg-black/20" />
                    </button>

                    <button className="flex items-center justify-between w-full px-4 py-3 bg-[#F8FAFA] hover:bg-black/5 border border-black/5 rounded-xl transition-all text-sm font-semibold text-black/70 group">
                      <span className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-black/40" /> Add Comment</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Create your own metric button */}
            <button className={`w-full py-5 rounded-[24px] border-2 border-dashed ${theme.borderGreen} bg-white hover:bg-[#F2FDF7] flex items-center justify-center gap-2 ${theme.textPrimaryGreen} font-bold transition-all shadow-sm`}>
              <Plus className="w-5 h-5" />
              Create your own metric
            </button>

          </div>
        </div>
      </div>
    </div>
  )
}

function ChevronRightIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
