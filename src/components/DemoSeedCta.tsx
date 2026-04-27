import { useState } from 'react'
import { motion } from 'framer-motion'
import { Database, ArrowRight, X } from 'lucide-react'
import DemoSeedModal from './DemoSeedModal'

const DISMISS_KEY = 'aeiforo_demo_cta_dismissed_v1'

interface Props {
  /** True when the workspace is empty enough to warrant the offer (no entities). */
  show: boolean
  /** Called once the seed has finished — parent should reload org data. */
  onCompleted: () => void
}

/**
 * Single-purpose "Load demo setup" CTA for fresh, admin-owned workspaces.
 *
 * Replaces the previous auto-onboarding pattern (which forced the SetupGuide
 * widget on every empty workspace). Now the dashboard stays clean by default
 * and the admin opts in by clicking this card; that fires the DemoSeedModal,
 * seeds PTTGC sample data, and the rest of the app fills in.
 */
export default function DemoSeedCta({ show, onCompleted }: Props) {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
  })

  if (!show || dismissed) return null

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="surface-paper p-5 relative overflow-hidden"
      >
        <div
          aria-hidden
          className="absolute -top-20 -right-20 w-[280px] h-[280px] rounded-full pointer-events-none opacity-50"
          style={{ background: 'radial-gradient(circle, rgba(27,107,123,0.10), transparent 70%)' }}
        />

        <button
          onClick={dismiss}
          className="absolute top-3 right-3 w-7 h-7 rounded-[6px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer z-10"
          title="Hide — I'll set up manually"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="relative flex items-start gap-4">
          <div
            className="w-11 h-11 rounded-[12px] flex items-center justify-center text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1B6B7B, #2E7D32)' }}
          >
            <Database className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0 pr-8">
            <div className="kicker mb-1">For demos</div>
            <h2 className="font-display text-[18px] font-bold text-[var(--text-primary)] tracking-[-0.005em]">
              Load PTT Global Chemical sample data
            </h2>
            <p className="text-[12.5px] text-[var(--text-secondary)] mt-1 leading-relaxed max-w-2xl">
              One click pre-fills your workspace: 7 entities, 2 climate targets, 5 material topics,
              and an FY2025 reporting cycle. Skips manual onboarding entirely so you can demo the
              publish, anomaly, and assurance flows immediately.
            </p>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] bg-[var(--color-brand)] text-white text-[13px] font-semibold hover:bg-[var(--color-brand-strong)] active:scale-[0.98] transition-all cursor-pointer flex-shrink-0"
          >
            <Database className="w-3.5 h-3.5" />
            Load demo setup
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>

      {open && (
        <DemoSeedModal
          onClose={() => setOpen(false)}
          onCompleted={() => { onCompleted(); dismiss() }}
        />
      )}
    </>
  )
}
