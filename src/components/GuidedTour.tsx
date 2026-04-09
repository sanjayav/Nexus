import { useState, useEffect } from 'react'
import { X, ArrowRight, Link2, LayoutDashboard, Shield, Database, Calculator, GitBranch, FileOutput } from 'lucide-react'

const TOUR_KEY = 'nexus_tour_completed_v2'

const steps = [
  {
    icon: Link2,
    title: 'Welcome to Nexus',
    description: 'Nexus is a blockchain-verified ESG reporting platform. Collect data, calculate emissions, map to frameworks, approve through workflows, and publish assured reports — all from one place.',
    color: 'bg-accent-500',
  },
  {
    icon: LayoutDashboard,
    title: 'Command Center',
    description: 'The Dashboard gives you a bird\'s-eye view: module health, SBTi trajectory, and facility performance across all GC Group operations.',
    color: 'bg-blue-500',
  },
  {
    icon: Database,
    title: 'Data Collection → Calculator',
    description: 'Start in Data Collection to submit entity and supplier data, then use the Calculator Engine to compute emissions using GHG Protocol methodology.',
    color: 'bg-teal-500',
  },
  {
    icon: Calculator,
    title: 'Frameworks & Workflow',
    description: 'Framework Questions assigns disclosure items to the right people. The Approval Queue ensures every data point is reviewed and blockchain-anchored before reporting.',
    color: 'bg-purple-500',
  },
  {
    icon: GitBranch,
    title: 'Analytics & Assurance',
    description: 'The Analytics module flags anomalies against historical baselines. Assurance Review provides a third-party validation pipeline before publishing.',
    color: 'bg-amber-500',
  },
  {
    icon: FileOutput,
    title: 'Report Publishing',
    description: 'Generate CDP, TCFD, GRI, and CSRD reports from a single verified dataset. Use AI Narrative for automated executive summaries.',
    color: 'bg-rose-500',
  },
  {
    icon: Shield,
    title: 'Every Number is Verifiable',
    description: 'Look for the shield icon next to data points. Click it to see the full blockchain proof — who submitted, who approved, and the on-chain transaction hash.',
    color: 'bg-teal-500',
  },
]

export default function GuidedTour() {
  const [isVisible, setIsVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_KEY)
    if (!completed) {
      setIsVisible(true)
    }
  }, [])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const handleClose = () => {
    setIsVisible(false)
    localStorage.setItem(TOUR_KEY, 'true')
  }

  if (!isVisible) return null

  const step = steps[currentStep]
  const Icon = step.icon

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-dark-900 rounded-3xl border border-dark-600 shadow-card-lg w-full max-w-md overflow-hidden">
        {/* Progress bar */}
        <div className="flex gap-1.5 px-6 pt-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= currentStep ? 'bg-accent-500' : 'bg-dark-600'}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 pt-6 pb-4">
          <div className={`w-12 h-12 rounded-2xl ${step.color} flex items-center justify-center mb-4 shadow-glow-sm`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-heading font-bold text-white mb-2">{step.title}</h2>
          <p className="text-sm text-dark-300 leading-relaxed">{step.description}</p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <button
            onClick={handleClose}
            className="text-sm text-dark-400 hover:text-dark-300 transition-colors"
          >
            Skip Tour
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-dark-400">{currentStep + 1} / {steps.length}</span>
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-glow-sm"
            >
              {currentStep < steps.length - 1 ? (
                <>Next <ArrowRight className="w-4 h-4" /></>
              ) : (
                'Get Started'
              )}
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-dark-700 transition-colors"
        >
          <X className="w-4 h-4 text-dark-400" />
        </button>
      </div>
    </div>
  )
}
