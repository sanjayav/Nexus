import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, X, Upload, CheckSquare, Send, Sparkles } from 'lucide-react'

const STORAGE_KEY = 'aeiforo_quickstart_dismissed_v1'

interface Step {
  num: number
  title: string
  body: string
  icon: typeof Upload
  cta: string
  route: string
  accent: string
}

const STEPS: Step[] = [
  {
    num: 1,
    title: 'Import your data',
    body: 'Drop an Excel, or pre-loaded PTTGC demo data populates the report.',
    icon: Upload,
    cta: 'Open Performance data',
    route: '/reports/performance',
    accent: '#1B6B7B',
  },
  {
    num: 2,
    title: 'Review & approve',
    body: 'Anomaly checks run automatically. Approve disclosures from the queue.',
    icon: CheckSquare,
    cta: 'Open review queue',
    route: '/workflow/review',
    accent: '#3B8A9B',
  },
  {
    num: 3,
    title: 'Publish report',
    body: 'Generate a hash-anchored PDF. Auditors verify it via a public link.',
    icon: Send,
    cta: 'Open Publish centre',
    route: '/reports',
    accent: '#2E7D32',
  },
]

export default function QuickStartCard() {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
  })

  if (dismissed) return null

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="surface-paper p-6 relative overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute -top-20 -right-20 w-[280px] h-[280px] rounded-full pointer-events-none opacity-50"
        style={{ background: 'radial-gradient(circle, rgba(27,107,123,0.10), transparent 70%)' }}
      />

      <button
        onClick={dismiss}
        className="absolute top-3 right-3 w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer z-10"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-[8px] bg-[var(--accent-teal-subtle)] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-[var(--color-brand)]" />
          </div>
          <span className="kicker">Get started in 3 steps</span>
        </div>
        <h2 className="font-display text-[22px] font-bold text-[var(--text-primary)] tracking-[-0.01em]">
          From spreadsheet to assured report
        </h2>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 max-w-2xl leading-relaxed">
          The fastest path through Aeiforo. Click any step to jump in — you don't have to do them in order.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
          {STEPS.map((step, i) => (
            <motion.button
              key={step.num}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + i * 0.06 }}
              whileHover={{ y: -2 }}
              onClick={() => navigate(step.route)}
              className="group text-left p-4 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--color-brand)] hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
                  style={{ background: `${step.accent}15`, color: step.accent }}
                >
                  <step.icon className="w-5 h-5" />
                </div>
                <span
                  className="w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center"
                  style={{ background: step.accent, color: 'white' }}
                >
                  {step.num}
                </span>
              </div>
              <div className="text-[14px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">
                {step.title}
              </div>
              <div className="text-[12px] text-[var(--text-secondary)] mt-1 leading-relaxed min-h-[36px]">
                {step.body}
              </div>
              <div
                className="text-[12px] font-semibold mt-3 inline-flex items-center gap-1 group-hover:gap-1.5 transition-all"
                style={{ color: step.accent }}
              >
                {step.cta} <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.section>
  )
}
