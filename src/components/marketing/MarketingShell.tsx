import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Twitter, Linkedin, Github } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import NexusBrand from '../NexusBrand'

/**
 * MarketingShell — public-site chrome (top nav + footer).
 *
 * Wraps every unauthenticated marketing page (Landing, Features, Pricing,
 * About, Contact). Uses design-token CSS variables so it inherits the
 * platform's light/dark theme rather than hard-coding palette values.
 *
 * Top nav collapses to a hamburger drawer below `md` (768px). Footer is a
 * 3-column links block + brand strip; hrefs are intentional `#` placeholders
 * for the v1 marketing surface.
 */

// `labelKey` / `headingKey` are i18n keys (locales/<lang>/marketing.json),
// resolved with t() at render.
const NAV_LINKS: { labelKey: string; to: string }[] = [
  { labelKey: 'marketing.nav.features', to: '/features' },
  { labelKey: 'marketing.nav.pricing', to: '/pricing' },
  { labelKey: 'marketing.nav.howItWorks', to: '/how-it-works' },
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
      { labelKey: 'marketing.footer.security', to: '#' },
      { labelKey: 'marketing.footer.api', to: '#' },
    ],
  },
  {
    headingKey: 'marketing.footer.company',
    items: [
      { labelKey: 'marketing.nav.about', to: '/about' },
      { labelKey: 'marketing.nav.contact', to: '/contact' },
      { labelKey: 'marketing.footer.careers', to: '#' },
      { labelKey: 'marketing.footer.blog', to: '#' },
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
  const location = useLocation()
  const { t } = useTranslation()

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}
    >
      {/* ── Sticky top nav ── */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md"
        style={{
          background: 'color-mix(in srgb, var(--bg-app) 78%, transparent)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" aria-label={t('marketing.nav.homeAria')} className="flex items-center">
            <NexusBrand size="sm" layout="horizontal" animated={false} showAttribution />
          </Link>

          {/* Desktop links */}
          <nav className="hidden md:flex items-center gap-7" aria-label={t('marketing.nav.navAria')}>
            {NAV_LINKS.map((link) => {
              const active = location.pathname === link.to
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-[14px] font-medium transition-colors"
                  style={{
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    opacity: active ? 1 : 0.75,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = active ? '1' : '0.75' }}
                >
                  {t(link.labelKey)}
                </Link>
              )
            })}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="btn-secondary"
              style={{ height: 36, paddingInline: 14, fontSize: 13 }}
            >
              {t('marketing.nav.signIn')}
            </Link>
            <Link
              to="/login?mode=register"
              className="btn-primary"
              style={{ height: 36, paddingInline: 16, fontSize: 13 }}
            >
              {t('marketing.nav.getStarted')}
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            aria-label={t('marketing.nav.openMenu')}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md"
            style={{ color: 'var(--text-primary)' }}
          >
            {drawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div
            className="md:hidden"
            style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-primary)' }}
          >
            <div className="max-w-[1280px] mx-auto px-5 py-4 flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setDrawerOpen(false)}
                  className="block px-3 py-2.5 rounded-md text-[15px] font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t(link.labelKey)}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <Link
                  to="/login"
                  onClick={() => setDrawerOpen(false)}
                  className="btn-secondary w-full justify-center"
                >
                  {t('marketing.nav.signIn')}
                </Link>
                <Link
                  to="/login?mode=register"
                  onClick={() => setDrawerOpen(false)}
                  className="btn-primary w-full justify-center"
                >
                  {t('marketing.nav.getStarted')}
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── Page content ── */}
      <main className="flex-1">{children}</main>

      {/* ── Footer ── */}
      <footer
        className="mt-20"
        style={{
          background: 'var(--bg-inverse)',
          color: 'var(--text-inverse)',
          borderTop: '1px solid var(--border-default)',
        }}
      >
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
            {/* Brand cell */}
            <div className="md:pr-6">
              <NexusBrand size="sm" layout="horizontal" animated={false} showAttribution variant="dark" />
              <p
                className="mt-4 text-[13px] leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                {t('marketing.footer.tagline')}
              </p>
            </div>

            {FOOTER_COLS.map((col) => (
              <div key={col.headingKey}>
                <h4
                  className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-4"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  {t(col.headingKey)}
                </h4>
                <ul className="space-y-2.5">
                  {col.items.map((item) => (
                    <li key={item.labelKey}>
                      <Link
                        to={item.to}
                        className="text-[13px] transition-colors"
                        style={{ color: 'rgba(255,255,255,0.75)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#fff' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)' }}
                      >
                        {t(item.labelKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom strip */}
          <div
            className="mt-12 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {t('marketing.footer.copyright')}
            </p>
            <div className="flex items-center gap-4">
              <a href="#" aria-label="Twitter" style={{ color: 'rgba(255,255,255,0.55)' }}>
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" aria-label="LinkedIn" style={{ color: 'rgba(255,255,255,0.55)' }}>
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="#" aria-label="GitHub" style={{ color: 'rgba(255,255,255,0.55)' }}>
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
