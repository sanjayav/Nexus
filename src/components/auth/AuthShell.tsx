import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import NexusBrand from '../NexusBrand'
import LanguageSwitch from '../marketing/LanguageSwitch'
import AuthHero from './AuthHero'
import { useIsDark } from '../marketing/useIsDark'
import { dur, ease } from '../../motion/tokens'

/**
 * AuthShell — the public sign-in frame shared by /login, /forgot-password and
 * /reset-password. Form column on the theme canvas (light or dark), ink hero
 * panel on desktop. Phones get the form only: no hero, no 3D, no extra bytes.
 */
export default function AuthShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const { t } = useTranslation()
  const isDark = useIsDark()

  return (
    <div
      className="min-h-[100dvh] w-full lg:p-4 grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] gap-4"
      style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}
    >
      <div className="relative flex flex-col min-h-[100dvh] lg:min-h-[calc(100dvh-2rem)] px-5 sm:px-10 lg:px-14">
        <header className="flex items-center justify-between gap-4 h-16 sm:h-20 flex-shrink-0">
          <Link to="/" aria-label={t('auth.shell.homeAria')} className="rounded-md">
            <NexusBrand size="sm" layout="horizontal" animated={false} showAttribution variant={isDark ? 'dark' : 'light'} />
          </Link>
          <LanguageSwitch size="sm" />
        </header>

        <main className="flex-1 flex items-start sm:items-center justify-center py-6 sm:py-10">
          <motion.div
            className="w-full max-w-[420px]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur.slow, ease: ease.out }}
          >
            {children}
          </motion.div>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-5 type-caption flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
          {footer ?? <span>{t('auth.shell.footer')}</span>}
          <Link to="/" className="rounded-sm hover:underline underline-offset-4" style={{ color: 'var(--text-secondary)' }}>
            {t('auth.shell.website')}
          </Link>
        </footer>
      </div>

      <AuthHero />
    </div>
  )
}
