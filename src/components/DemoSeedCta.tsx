import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import DemoSeedModal from './DemoSeedModal'
import Illustration from '../design-system/illustrations/Illustration'
import { transition } from '../motion/tokens'

const DISMISS_KEY = 'aeiforo_demo_cta_dismissed_v1'

interface Props {
  /** True when the workspace is empty enough to warrant the offer (no entities). */
  show: boolean
  /** Called once the seed has finished — parent should reload org data. */
  onCompleted: () => void
}

/**
 * "Start with sample data" — the sample-data branch of the one guided setup.
 * Shown only on an empty, admin-owned workspace; opens DemoSeedModal.
 * The /welcome hub renders the same offer inline, so pages rarely need this.
 */
export default function DemoSeedCta({ show, onCompleted }: Props) {
  const { t } = useTranslation()
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
      <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={transition.base} className="surface-paper relative overflow-hidden p-5">
        <button type="button" onClick={dismiss} aria-label={t('onboarding.demo.hide')} title={t('onboarding.demo.hide')}
          className="absolute top-2 right-2 w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
          <X className="w-4 h-4" aria-hidden />
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pr-8">
          <Illustration name="setup" size={88} className="flex-shrink-0 -my-2" />
          <div className="flex-1 min-w-0">
            <h2 className="type-h3 text-[var(--text-primary)]">{t('onboarding.demo.ctaTitle')}</h2>
            <p className="text-small text-[var(--text-secondary)] mt-1 max-w-2xl">{t('onboarding.demo.ctaBody')}</p>
          </div>
          <button type="button" onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-small font-semibold hover:bg-[var(--btn-primary-bg-hover)] transition-colors duration-micro flex-shrink-0 self-start sm:self-center">
            {t('onboarding.demo.load')} <ArrowRight className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </motion.section>

      <AnimatePresence>
        {open && (
          <DemoSeedModal
            onClose={() => setOpen(false)}
            // After a successful seed the card hides because `show` becomes
            // false (the workspace now has entities). No dismissal is stored,
            // so resetting the workspace brings the offer back.
            onCompleted={() => onCompleted()}
          />
        )}
      </AnimatePresence>
    </>
  )
}
