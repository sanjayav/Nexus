import { useNavigate } from 'react-router-dom'
import { BarChart3, LayoutDashboard, ChevronRight, Clock, CheckCircle, AlertCircle, FileText, Play } from 'lucide-react'
import { mockData } from '../data/mockData'
import clsx from 'clsx'

export default function ModulesLanding() {
  const navigate = useNavigate()

  const getStateColor = (state: string) => {
    switch (state) {
      case 'Open':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
      case 'In Review':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
      case 'Approved':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      case 'Published':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30'
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">All Reporting Modules</h1>
          <p className="text-gray-400">Select a module to continue or jump to dashboards for insights</p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/analytics')}
            className="flex items-center gap-2 px-4 py-2.5 bg-dark-surface border border-dark-border rounded-xl hover:border-accent transition-colors"
          >
            <BarChart3 className="w-5 h-5 text-accent" />
            <span className="font-medium">Open Full Analytics</span>
          </button>
          <button
            onClick={() => navigate('/executive')}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent/10 border border-accent/30 rounded-xl hover:bg-accent/20 transition-colors"
          >
            <LayoutDashboard className="w-5 h-5 text-accent" />
            <span className="font-medium text-accent">Open Executive Summary</span>
          </button>
        </div>
      </div>

      {/* Module Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {mockData.modules.map((module) => (
          <div
            key={module.id}
            className="bg-dark-surface border border-dark-border rounded-2xl p-6 hover:border-accent/50 transition-all"
          >
            {/* Card Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-white">{module.title}</h3>
                  <div className={clsx('px-2 py-1 rounded-md border text-xs font-medium flex items-center gap-1.5', getStateColor(module.state))}>
                    {getStateIcon(module.state)}
                    {module.state}
                  </div>
                </div>
                <p className="text-sm text-gray-400">{module.description}</p>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-dark-border">
              <div>
                <div className="text-xs text-gray-400 mb-1">Coverage</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white">{module.coverage}%</span>
                </div>
                <div className="w-full bg-dark-bg rounded-full h-1.5 mt-2">
                  <div
                    className="bg-accent rounded-full h-1.5 transition-all"
                    style={{ width: `${module.coverage}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-400 mb-1">Sections</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white">{module.completedSections}</span>
                  <span className="text-sm text-gray-400">/ {module.questionnaireSections}</span>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-400 mb-1">Last Activity</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">{formatDate(module.lastActivity)}</span>
                </div>
              </div>
            </div>

            {/* Validation Status */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                {module.validationsPassed ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-emerald-400">All validations passed</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-yellow-400">Some validations need attention</span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/modules/${module.id}/questionnaire`)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-dark-bg rounded-xl font-medium hover:bg-accent/90 transition-colors"
              >
                Continue Questionnaire
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate(`/modules/${module.id}`)}
                className="px-4 py-2.5 bg-dark-bg border border-dark-border rounded-xl font-medium hover:border-accent transition-colors"
              >
                Open Module Hub
              </button>
            </div>

            {/* More Options */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-dark-border">
              <button
                onClick={() => navigate(`/analytics?module=${module.id}`)}
                className="text-sm text-gray-400 hover:text-accent transition-colors flex items-center gap-1.5"
              >
                <BarChart3 className="w-4 h-4" />
                Module Analytics
              </button>
              <button
                onClick={() => navigate(`/executive?module=${module.id}`)}
                className="text-sm text-gray-400 hover:text-accent transition-colors flex items-center gap-1.5"
              >
                <LayoutDashboard className="w-4 h-4" />
                Executive View
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State (shown when no modules) */}
      {mockData.modules.length === 0 && (
        <div className="bg-dark-surface border border-dashed border-dark-border rounded-2xl p-12 text-center">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No modules yet</h3>
          <p className="text-gray-400 mb-6">Add modules from the registry to start reporting</p>
          <button className="px-6 py-2.5 bg-accent text-dark-bg rounded-xl font-medium hover:bg-accent/90 transition-colors">
            Browse Module Registry
          </button>
        </div>
      )}
    </div>
  )
}

