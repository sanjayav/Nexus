import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle, Clock, AlertCircle, FileText, Package, GitBranch, ChevronRight, User, Calendar, ArrowRight } from 'lucide-react'
import { mockData } from '../data/mockData'
import clsx from 'clsx'

export default function ModuleHub() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const navigate = useNavigate()

  const module = mockData.modules.find(m => m.id === moduleId)
  const moduleTasks = mockData.moduleTasks.filter(t => t.moduleId === moduleId)
  const versions = mockData.submissionVersions.filter(v => v.moduleId === moduleId)

  if (!module) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Module not found</h2>
        <button
          onClick={() => navigate('/modules')}
          className="text-accent hover:underline"
        >
          Back to modules
        </button>
      </div>
    )
  }

  // Progress rail steps
  const progressSteps = [
    { name: 'Upload', status: 'completed', date: '2024-11-01' },
    { name: 'Validation', status: module.validationsPassed ? 'completed' : 'in-progress', date: '2024-11-02' },
    { name: 'Roots (DMA)', status: module.coverage > 80 ? 'completed' : 'pending', date: module.coverage > 80 ? '2024-11-05' : null },
    { name: 'Index/Pack', status: module.state === 'Published' ? 'completed' : 'pending', date: module.state === 'Published' ? '2024-11-08' : null },
    { name: 'Roll-up', status: module.state === 'Published' ? 'completed' : 'pending', date: module.state === 'Published' ? '2024-11-10' : null },
  ]

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-emerald-400" />
      case 'in-progress':
        return <Clock className="w-6 h-6 text-yellow-400" />
      case 'pending':
        return <div className="w-6 h-6 rounded-full border-2 border-gray-600" />
      default:
        return null
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-400 border-red-500/30'
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
      case 'low':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{module.title}</h1>
          <p className="text-gray-400">{module.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/modules/${moduleId}/questionnaire`)}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-dark-bg rounded-xl font-medium hover:bg-accent/90 transition-colors"
          >
            Continue Questionnaire
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Rail */}
      <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-6">Progress Pipeline</h2>
        <div className="flex items-start justify-between relative">
          {/* Connection lines */}
          <div className="absolute top-3 left-0 right-0 h-0.5 bg-dark-border" style={{ left: '24px', right: '24px' }} />
          
          {progressSteps.map((step, index) => (
            <div key={index} className="flex-1 flex flex-col items-center relative z-10">
              <div className="mb-3">
                {getStepIcon(step.status)}
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-white mb-1">{step.name}</div>
                {step.date && (
                  <div className="text-xs text-gray-400">{step.date}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Your Tasks */}
        <div className="lg:col-span-2 bg-dark-surface border border-dark-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Your Tasks</h2>
            <span className="px-2.5 py-1 bg-accent/10 text-accent text-sm font-medium rounded-lg">
              {moduleTasks.length} active
            </span>
          </div>

          {moduleTasks.length > 0 ? (
            <div className="space-y-3">
              {moduleTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-dark-bg border border-dark-border rounded-xl p-4 hover:border-accent/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={clsx('px-2 py-0.5 rounded text-xs font-medium border', getPriorityColor(task.priority))}>
                          {task.priority}
                        </div>
                        <div className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
                          {task.type}
                        </div>
                      </div>
                      <h3 className="font-medium text-white mb-1">{task.title}</h3>
                      <p className="text-sm text-gray-400">{task.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4 text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        <span>{task.assignee.slice(0, 20)}...</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>{task.dueDate}</span>
                      </div>
                    </div>
                    <button className="text-accent hover:underline flex items-center gap-1">
                      View
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-gray-400">No pending tasks</p>
            </div>
          )}
        </div>

        {/* Version Sidebar */}
        <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Versions</h2>
            <GitBranch className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-3">
            {versions.map((version, index) => (
              <div
                key={version.submissionId}
                className={clsx(
                  'border rounded-xl p-4 cursor-pointer transition-colors',
                  index === 0
                    ? 'bg-accent/5 border-accent/30 hover:border-accent'
                    : 'bg-dark-bg border-dark-border hover:border-accent/50'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white">{version.version}</span>
                  <span className={clsx(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    version.state === 'In Review' ? 'bg-yellow-500/10 text-yellow-400' :
                    version.state === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' :
                    'bg-blue-500/10 text-blue-400'
                  )}>
                    {version.state}
                  </span>
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>CID: {version.payloadCID.slice(0, 12)}...</div>
                  <div>Root: {version.merkleRoot}</div>
                  <div>{new Date(version.createdAt).toLocaleDateString()}</div>
                </div>
                <button className="text-xs text-accent hover:underline mt-2">
                  View diff
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => navigate(`/modules/${moduleId}/questionnaire`)}
          className="bg-dark-surface border border-dark-border rounded-xl p-4 hover:border-accent transition-colors text-left"
        >
          <FileText className="w-8 h-8 text-accent mb-3" />
          <h3 className="font-medium text-white mb-1">Questionnaire</h3>
          <p className="text-sm text-gray-400">Continue data entry</p>
        </button>

        <button
          onClick={() => navigate(`/modules/${moduleId}/review`)}
          className="bg-dark-surface border border-dark-border rounded-xl p-4 hover:border-accent transition-colors text-left"
        >
          <CheckCircle className="w-8 h-8 text-emerald-400 mb-3" />
          <h3 className="font-medium text-white mb-1">Review</h3>
          <p className="text-sm text-gray-400">Open review page</p>
        </button>

        <button className="bg-dark-surface border border-dark-border rounded-xl p-4 hover:border-accent transition-colors text-left">
          <Package className="w-8 h-8 text-blue-400 mb-3" />
          <h3 className="font-medium text-white mb-1">Module Pack</h3>
          <p className="text-sm text-gray-400">Generate pack</p>
        </button>

        <button className="bg-dark-surface border border-dark-border rounded-xl p-4 hover:border-accent transition-colors text-left">
          <AlertCircle className="w-8 h-8 text-yellow-400 mb-3" />
          <h3 className="font-medium text-white mb-1">Request Review</h3>
          <p className="text-sm text-gray-400">Submit for approval</p>
        </button>
      </div>
    </div>
  )
}

