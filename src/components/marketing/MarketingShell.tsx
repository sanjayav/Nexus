import { ReactNode, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import { Menu, X, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import NexusBrand from '../NexusBrand'
import LanguageSwitch from './LanguageSwitch'
import { useIsDark } from './useIsDark'
import { dur, ease, spring } from '../../motion/tokens'

/**
 * MarketingShell — public-site chrome (top nav + footer).
 *
 * Wraps every unauthenticated marketing page. Uses design-token CSS variables
 * so it follows the platform's light/dark theme. The header carries the EN /
 * 中文 language switch, a sliding active-link indicator and a hairline scroll
 * progress bar; it lifts onto a blurred surface once the page scrolls.
 *
 * Below `lg` the nav collapses into an animated sheet.
 */

// `labelKey` / `headingKey` are i18n keys (locales/<lang>/marketing.json).
const NAV_LINKS: { labelKey: string; to: string }[] = [
  { labelKey: 'marketing.nav.features', to: '/features' },
  { labelKey: 'marketing.nav.howItWorks', to: '/how-it-works' },
  { labelKey: 'marketing.nav.pricing', to: '/pricing' },
  { labelKey: 'marketing.nav.compare', to: '/compare' },
  { labelKey: 'marketing.nav.about', to: '/about' },
  { labelKey: 'marketing.nav.contact', to: '/contact' },
]

interface FooterColumn {
  headingKey: string
  items: { labelKey: string; to: string }[]
}

const FOOTER_COLS: FooterColumn[] = [
  {
    headingKey: 'marketing.footer.product',
    items: [
      { labelKey: 'marketing.nav.features', to: '/features' },
      { labelKey: 'marketing.nav.pricing', to: '/pricing' },
      { labelKey: 'marketing.nav.howItWorks', to: '/how-it-works' },
      { labelKey: 'marketing.nav.compare', to: '/compare' },
    ],
  },
  {
    headingKey: 'marketing.footer.company',
    items: [
      { labelKey: 'marketing.nav.about', to: '/about' },
      { labelKey: 'marketing.nav.contact', to: '/contact' },
      { labelKey: 'marketing.nav.signIn', to: '/login' },
    ],
  },
  {
    headingKey: 'marketing.footer.legal',
    items: [
      { labelKey: 'marketing.footer.terms', to: '#' },
      { labelKey: 'marketing.footer.privacy', to: '#' },
      { labelKey: 'marketing.footer.dpa', to: '#' },
      { labelKey: 'marketing.footer.subprocessors', to: '#' },
    ],
  },
]

export default function MarketingShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const { t } = useTranslation()
  const isDark = useIsDark()
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 260, damping: 40, restDelta: 0.001 })

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the sheet on navigation; lock body scroll while it is open.
  useEffect(() => { setDrawerOpen(false) }, [location.pathname])
  useEffect(() => {
    if (!drawerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [drawerOpen])

  // New page → top of page (marketing pages are long; keep the reveal story intact).
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-md btn-primary"
      >
        {t('marketing.nav.skip')}
      </a>

      {/* ── Sticky top nav ── */}
      <header
        className="sticky top-0 z-40 transition-[background-color,border-color] duration-300"
        style={{
          background: scrolled || drawerOpen ? 'color-mix(in srgb, var(--bg-app) 82%, transparent)' : 'transparent',
          backdropFilter: scrolled ? 'saturate(160%) blur(14px)' : undefined,
          WebkitBackdropFilter: scrolled ? 'saturate(160%) blur(14px)' : undefined,
          borderBottom: `1px solid ${scrolled ? 'var(--border-subtle)' : 'transparent'}`,
        }}
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" aria-label={t('marketing.nav.homeAria')} className="flex items-center rounded-md">
            <NexusBrand size="sm" layout="horizontal" animated={false} showAttribution variant={isDark ? 'dark' : 'light'} />
          </Link>

          {/* Desktop links */}
          <nav className="hidden lg:flex items-center gap-1" aria-label={t('marketing.nav.navAria')}>
            {NAV_LINKS.map((link) => {
              const active = location.pathname === link.to
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  aria-current={active ? 'page' : undefined}
                  className="relative px-3 h-9 inline-flex items-center rounded-full text-[14px] font-medium transition-colors hover:text-[var(--text-primary)]"
                  style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                >
                  {active && (
                    <motion.span
                      layoutId="mkt-nav-active"
                      className="absolute inset-0 rounded-full"
                      style={{ background: 'var(--bg-secondary)', boxShadow: 'inset 0 0 0 1px var(--border-subtle)' }}
                      transition={spring.snappy}
                      aria-hidden
                    />
                  )}
                  <span className="relative">{t(link.labelKey)}</span>
                </Link>
              )
            })}
          </nav>

          {/* Desktop actions */}
          <div className="hidden lg:flex items-center gap-2.5">
            <LanguageSwitch size="sm" />
            <Link to="/login" className="btn-secondary h-9 px-3.5 text-[13px]">
              {t('marketing.nav.signIn')}
            </Link>
            <Link to="/login?mode=register" className="btn-primary h-9 px-4 text-[13px]">
              {t('marketing.nav.getStarted')}
            </Link>
          </div>

          {/* Mobile actions */}
          <div className="flex lg:hidden items-center gap-2">
            <LanguageSwitch size="sm" />
            <button
              type="button"
              aria-label={drawerOpen ? t('marketing.nav.closeMenu') : t('marketing.nav.openMenu')}
              aria-expanded={drawerOpen}
              aria-controls="mkt-drawer"
              onClick={() => setDrawerOpen((v) => !v)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full"
              style={{ color: 'var(--text-primary)', border: '1px solid var(--border-default)', background: 'var(--bg-primary)' }}
            >
              {drawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Scroll progress hairline */}
        <motion.div
          aria-hidden
          className="absolute left-0 right-0 bottom-[-1px] h-px origin-left"
          style={{ scaleX: progress, background: 'var(--color-brand)', opacity: scrolled ? 0.7 : 0 }}
        />

        {/* Mobile sheet */}
        <AnimatePresence>
          {drawerOpen && (
            <motion.div
              id="mkt-drawer"
              className="lg:hidden absolute inset-x-0 top-16 h-[calc(100dvh-4rem)] overflow-y-auto"
              style={{ background: 'var(--bg-app)', borderTop: '1px solid var(--border-subtle)' }}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: dur.base, ease: ease.out }}
            >
              <nav className="px-4 py-4 flex flex-col" aria-label={t('marketing.nav.navAria')}>
                {NAV_LINKS.map((link, i) => (
                  <motion.div
                    key={link.to}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: dur.base, ease: ease.out, delay: 0.03 * i }}
                  >
                    <Link
                      to={link.to}
                      aria-current={location.pathname === link.to ? 'page' : undefined}
                      className="flex items-center justify-between h-14 px-1 type-h2"
                      style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)' }}
                    >
                      {t(link.labelKey)}
                      <ArrowRight className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} aria-hidden />
                    </Link>
                  </motion.div>
                ))}
                <div className="grid grid-cols-2 gap-2 mt-6">
                  <Link to="/login" className="btn-secondary h-12 text-[15px]">{t('marketing.nav.signIn')}</Link>
                  <Link to="/login?mode=register" className="btn-primary h-12 text-[15px]">{t('marketing.nav.getStarted')}</Link>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Page content ── */}
      <main id="main" className="flex-1">{children}</main>

      {/* ── Footer ── */}
      <footer style={{ background: 'var(--bg-inverse)', color: 'var(--sidebar-fg)' }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 pt-16 pb-10">
          <div className="grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-x-8 gap-y-10">
            <div className="col-span-2 md:col-span-1 md:pr-8">
              <NexusBrand size="sm" layout="horizontal" animated={false} showAttribution variant="dark" />
              <p className="mt-4 type-small max-w-[320px]" style={{ color: 'var(--sidebar-fg-muted)' }}>
                {t('marketing.footer.tagline')}
              </p>
              <p className="mt-4 type-caption" style={{ color: 'var(--sidebar-fg-subtle)' }}>
                {t('marketing.footer.languages')}
              </p>
            </div>

            {FOOTER_COLS.map((col) => (
              <div key={col.headingKey}>
                <h2 className="type-small font-semibold mb-4" style={{ color: 'var(--sidebar-fg)' }}>
                  {t(col.headingKey)}
                </h2>
                <ul className="space-y-1">
                  {col.items.map((item) => (
                    <li key={item.labelKey}>
                      <Link
                        to={item.to}
                        className="inline-flex items-center min-h-[36px] type-small transition-colors hover:text-[var(--sidebar-fg)]"
                        style={{ color: 'var(--sidebar-fg-muted)' }}
                      >
                        {t(item.labelKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div
            className="mt-14 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            style={{ borderTop: '1px solid var(--sidebar-divider)' }}
          >
            <p className="type-caption" style={{ color: 'var(--sidebar-fg-subtle)' }}>
              {t('marketing.footer.copyright')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
