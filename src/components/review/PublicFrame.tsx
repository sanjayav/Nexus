import { useEffect, useState, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import NexusBrand from '../NexusBrand'
import ContourField from '../../design-system/illustrations/ContourField'
import LangSegment from './LangSegment'
import type { ReportLang } from './reportLang'

/** True while the app is in dark theme (`<html data-theme="dark">`). */
export function useIsDarkTheme(): boolean {
  const read = () => typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark'
  const [dark, setDark] = useState(read)
  useEffect(() => {
    const el = document.documentElement
    const obs = new MutationObserver(() => setDark(read()))
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

/**
 * Chrome for the public, no-login pages (verify, shared report, auditor
 * upload): brand, a context chip, the language toggle, a quiet contour wash
 * behind the first fold, and the "powered by" footer. Print hides the chrome.
 */
export default function PublicFrame({
  chip,
  lang,
  onLangChange,
  width = 'md',
  children,
}: {
  chip?: ReactNode
  lang?: ReportLang
  onLangChange?: (l: ReportLang) => void
  width?: 'sm' | 'md' | 'lg'
  children: ReactNode
}) {
  const { t } = useTranslation()
  const dark = useIsDarkTheme()
  const max = width === 'sm' ? 'max-w-[720px]' : width === 'lg' ? 'max-w-[1040px]' : 'max-w-[880px]'
  return (
    <div className="relative min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] print:bg-white overflow-x-clip">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden print:hidden" aria-hidden>
        <ContourField className="absolute inset-0 w-full h-full text-[var(--color-brand)] opacity-[0.07]" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, var(--bg-app))' }} />
      </div>

      <header className="relative print:hidden">
        <div className={`${max} mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3`}>
          <a href="/" className="inline-flex items-center rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]" aria-label="Nexus">
            <NexusBrand size="sm" animated={false} variant={dark ? 'dark' : 'light'} />
          </a>
          <div className="flex items-center gap-2 min-w-0">
            {chip && <span className="hidden sm:inline-flex chip whitespace-nowrap">{chip}</span>}
            {lang && onLangChange && (
              <LangSegment value={lang} onChange={onLangChange} label={t('reviewUi.public.languageLabel')} size="sm" showIcon />
            )}
          </div>
        </div>
      </header>

      <main className={`relative ${max} mx-auto px-4 sm:px-6 pt-6 pb-16 sm:pt-10`}>{children}</main>

      <footer className="relative border-t border-[var(--border-subtle)] print:hidden">
        <div className={`${max} mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-caption text-[var(--text-tertiary)]`}>
          <span>
            <Trans i18nKey="reviewUi.public.poweredBy" components={{ brand: <a href="/" className="font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]" /> }} />
          </span>
          <span>{t('reviewUi.public.tamperNote')}</span>
        </div>
      </footer>
    </div>
  )
}
