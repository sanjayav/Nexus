import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, Clock, CheckCircle, AlertCircle, FileText, Play, ArrowRight } from 'lucide-react'
import { mockData } from '../data/mockData'
import clsx from 'clsx'

export default function ModulesLanding() {
  const navigate = useNavigate()

  const getStateColor = (state: string) => {
    switch (state) {
      case 'Open':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/30'
      case 'In Review':
        return 'bg-amber-500/10 text-amber-700 border-amber-500/30'
      case 'Approved':
        return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
      case 'Published':
        return 'bg-purple-500/10 text-purple-700 border-purple-500/30'
      default:
        return 'bg-black/5 text-black/60 border-black/10'
    }
  }

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'Open':
        return <Play className="w-3.5 h-3.5" />
      case 'In Review':
        return <Clock className="w-3.5 h-3.5" />
      case 'Approved':
        return <CheckCircle className="w-3.5 h-3.5" />
      case 'Published':
        return <FileText className="w-3.5 h-3.5" />
      default:
        return <AlertCircle className="w-3.5 h-3.5" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d ago`
    }
  }

  return (
    <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-500">

      {/* Header aligned with Light Glassmorphism Growth UI */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-black tracking-tight flex items-center gap-3">
            Reporting Frameworks
          </h1>
          <p className="text-sm text-black/60 mt-2 max-w-2xl font-medium tracking-wide">
            Active modules and standard mapping. Track completion, review evidence, and export to final formats.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/analytics')}
            className="flex items-center gap-2 px-5 py-3 bg-white/60 border border-white hover:bg-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm"
          >
            Open Analytics
          </button>
          <button
            onClick={() => navigate('/executive')}
            className="flex items-center gap-2 px-5 py-3 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-black/20 hover:scale-[1.02] transition-transform"
          >
            <LayoutDashboard className="w-4 h-4" />
            Executive View
          </button>
        </div>
      </div>

      {/* Grid mapping perfectly to "Month Goal's" or "Task in Process" cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 flex-1">
        {mockData.modules.map((module) => (
          <div
            key={module.id}
            className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg flex flex-col hover:shadow-xl transition-shadow relative overflow-hidden group"
          >
            {/* The abstract card background glow mimicking premium UI */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            {/* Header / Pills */}
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                getStateColor(module.state)
              )}>
                {getStateIcon(module.state)}
                {module.state}
              </div>
            </div>

            <div className="mb-6 relative z-10">
              <h3 className="text-2xl font-bold text-black mb-2">{module.title}</h3>
              <p className="text-xs text-black/50 font-medium leading-relaxed line-clamp-2">{module.description}</p>
            </div>

            {/* Progress / Stats Block entirely redesigned for the new UI */}
            <div className="bg-white/40 border border-white rounded-2xl p-4 mb-6 relative z-10">
              <div className="flex justify-between items-center text-xs font-bold text-black/50 uppercase tracking-widest mb-3">
                <span>Completion</span>
                <span className="text-black font-mono">{module.coverage}%</span>
              </div>
              <div className="w-full bg-black/5 rounded-full h-1.5 mb-4 overflow-hidden">
                <div
                  className="bg-black rounded-full h-1.5 transition-all duration-1000 ease-out"
                  style={{ width: `${module.coverage}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/5">
                <div>
                  <span className="block text-[10px] text-black/40 font-bold uppercase tracking-widest mb-1">Sections</span>
                  <span className="font-bold text-black">{module.completedSections} <span className="text-black/30 font-medium text-xs">/ {module.questionnaireSections}</span></span>
                </div>
                <div>
                  <span className="block text-[10px] text-black/40 font-bold uppercase tracking-widest mb-1">Last Sync</span>
                  <span className="font-bold text-black text-xs flex items-center gap-1.5 pt-0.5">
                    <Clock className="w-3 h-3 text-black/40" /> {formatDate(module.lastActivity)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Bar (Pushing to bottom) */}
            <div className="mt-auto relative z-10">
              <button
                onClick={() => navigate(`/modules/${module.id}/questionnaire`)}
                className="w-full flex items-center justify-between p-4 bg-black text-white rounded-xl shadow-md hover:scale-[1.02] transition-transform"
              >
                <span className="text-sm font-bold uppercase tracking-widest">Open Framework</span>
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </div>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {mockData.modules.length === 0 && (
        <div className="flex-1 bg-white/40 border border-white/60 rounded-[2rem] flex flex-col items-center justify-center text-center p-12">
          <div className="w-20 h-20 bg-black/5 rounded-3xl rotate-12 flex items-center justify-center mb-6">
            <FileText className="w-8 h-8 text-black/40 -rotate-12" />
          </div>
          <h3 className="text-2xl font-bold text-black mb-2">No active frameworks.</h3>
          <p className="text-sm text-black/50 max-w-md mx-auto mb-8 font-medium">Activate a module from the official ESG registry to begin structuring your data and evidence.</p>
          <button className="px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:scale-105 transition-transform shadow-lg shadow-black/20">
            Open Registry
          </button>
        </div>
      )}
    </div>
  )
}
