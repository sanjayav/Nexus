import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Palette, Calendar, BookMarked, Clock, Plus, Download, ShieldCheck, Loader2, LayoutDashboard, SunMoon, Bell } from 'lucide-react'
import { useTheme, type Theme } from '../theme/ThemeContext'
import { FRAMEWORKS, useFramework, type Framework } from '../lib/frameworks'
import { useDensity } from '../lib/density'
import { orgStore } from '../lib/orgStore'
import { users as usersApi, type UserPreferences } from '../lib/api'
import MfaSection from '../components/MfaSection'
import PageHeader from '../components/PageHeader'
import ThemeToggle from '../components/ThemeToggle'

interface ThemeOption {
  value: Theme
  /** i18n key prefix under `settings.themes` — `.label` / `.description`. */
  i18nKey: string
  swatches: string[]
}

const THEMES: ThemeOption[] = [
  {
    value: 'demo-flat',
    i18nKey: 'demoFlat',
    swatches: ['#047857', '#D5E8F0', '#2E7D32', '#E6A817', '#C62828'],
  },
  {
    value: 'glass',
    i18nKey: 'glass',
    swatches: ['#0F7B6F', '#E6F5F0', '#16A34A', '#D97706', '#DC2626'],
  },
]

/** Locale tag for Intl date formatting; undefined keeps the browser default for English. */
function intlLocale(lng: string | undefined): string | undefined {
  if (!lng) return undefined
  if (lng.startsWith('zh')) return 'zh-CN'
  if (lng.startsWith('th')) return 'th-TH'
  return undefined
}

/** Prefer the optional Simplified Chinese catalog fields when the UI is in zh. */
function fwText(f: Framework, field: 'name' | 'description', lng: string | undefined): string {
  if (lng?.startsWith('zh')) {
    const zh = (f as Framework & { nameZh?: string; descriptionZh?: string })[field === 'name' ? 'nameZh' : 'descriptionZh']
    if (zh) return zh
  }
  return f[field]
}

export default function Settings() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const { theme, setTheme } = useTheme()
  const { density, setDensity } = useDensity()
  const { active: activeFw, enabled, setEnabled } = useFramework()
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportedAt, setExportedAt] = useState<string | null>(() => localStorage.getItem('aeiforo_last_export_at'))

  const downloadExport = async () => {
    setExporting(true)
    setExportError(null)
    try {
      await orgStore.downloadDataExport()
      const now = new Date().toISOString()
      localStorage.setItem('aeiforo_last_export_at', now)
      setExportedAt(now)
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e))
    } finally {
      setExporting(false)
    }
  }

  const toggleFramework = (id: string) => {
    // Only active (not coming_soon) frameworks can be toggled.
    const fw = FRAMEWORKS.find(f => f.id === id)
    if (!fw || fw.status !== 'active') return
    if (enabled.includes(id)) {
      if (enabled.length === 1) return // always keep at least one
      setEnabled(enabled.filter(x => x !== id))
    } else {
      setEnabled([...enabled, id])
    }
  }

  return (
    <div className="page-container max-w-3xl space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: t('nav.admin') },
          { label: t('nav.settings') },
        ]}
        title={t('settings.title')}
        description={t('settings.description')}
      />

      {/* ── Frameworks (Phase 1 = GRI, other rows show the roadmap) ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-[var(--text-tertiary)]" />
            <h2 className="font-display text-[length:var(--text-lg)] font-semibold text-[var(--text-primary)]">
              {t('settings.frameworks.heading')}
            </h2>
          </div>
          <span className="text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded">
            {t('settings.frameworks.phase')}
          </span>
        </div>
        <p className="text-[length:var(--text-sm)] text-[var(--text-secondary)]">
          {t('settings.frameworks.intro', { name: fwText(activeFw, 'name', lng) })}
        </p>

        <ul className="space-y-2 pt-1">
          {FRAMEWORKS.map(f => {
            const on = enabled.includes(f.id)
            const isActive = f.id === activeFw.id
            const locked = f.status !== 'active'
            return (
              <li
                key={f.id}
                className={`rounded-[var(--radius-lg)] border transition-colors ${
                  isActive ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]/50'
                  : locked ? 'border-[var(--border-subtle)] bg-[var(--bg-secondary)]/40'
                  : 'border-[var(--border-default)] bg-[var(--bg-primary)]'
                }`}
              >
                <div className="p-4 flex items-start gap-4">
                  <span
                    className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 text-caption font-bold text-white"
                    style={{ background: f.color, opacity: locked ? 0.6 : 1 }}
                  >
                    {f.code.split(' ')[0].slice(0, 3)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[length:var(--text-sm)] font-semibold text-[var(--text-primary)]">{fwText(f, 'name', lng)}</h3>
                      {isActive && (
                        <span className="text-micro font-bold uppercase tracking-[0.06em] text-[var(--status-ok)] bg-[var(--accent-green-light)] px-1.5 py-0.5 rounded">
                          {t('settings.frameworks.currentlyActive')}
                        </span>
                      )}
                      {f.status === 'coming_soon' && (
                        <span className="text-micro font-bold uppercase tracking-[0.06em] text-[var(--status-pending)] bg-[var(--accent-blue-light)] px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {t('settings.frameworks.comingSoon')}
                        </span>
                      )}
                    </div>
                    <p className="text-[length:var(--text-xs)] text-[var(--text-secondary)] mt-1">{fwText(f, 'description', lng)}</p>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {f.coverage.map(c => (
                        <span key={c} className="text-caption px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] font-medium">
                          {c}
                        </span>
                      ))}
                    </div>
                    <div className="text-caption text-[var(--text-tertiary)] mt-2">
                      {f.body} · v{f.version}
                      {f.questionCount != null && ` · ${t('settings.frameworks.lineItems', { count: f.questionCount })}`}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {locked ? (
                      <button
                        type="button"
                        disabled
                        className="text-[length:var(--text-xs)] font-semibold px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] text-[var(--text-tertiary)] cursor-not-allowed inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> {t('settings.frameworks.requestEarlyAccess')}
                      </button>
                    ) : (
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggleFramework(f.id)}
                          className="sr-only peer"
                        />
                        <span className={`relative w-9 h-5 rounded-full transition-colors ${on ? 'bg-[var(--color-brand)]' : 'bg-[var(--bg-tertiary)]'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'left-4' : 'left-0.5'}`} />
                        </span>
                        <span className="text-[length:var(--text-xs)] font-medium text-[var(--text-secondary)]">{on ? t('settings.frameworks.on') : t('settings.frameworks.off')}</span>
                      </label>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <MfaSection />

      <NotificationPreferences />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-[var(--text-tertiary)]" />
          <h2 className="font-display text-[length:var(--text-lg)] font-semibold text-[var(--text-primary)]">
            {t('settings.theme.heading')}
          </h2>
        </div>
        <p className="text-[length:var(--text-sm)] text-[var(--text-secondary)]">
          {t('settings.theme.intro')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {THEMES.map(opt => {
            const active = theme === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={`
                  group relative text-left p-5 rounded-[var(--radius-lg)]
                  border transition-all duration-150
                  ${active
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]'
                    : 'border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)]'
                  }
                `}
                aria-pressed={active}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-display text-[length:var(--text-base)] font-semibold text-[var(--text-primary)]">
                      {t(`settings.themes.${opt.i18nKey}.label`)}
                    </div>
                    <div className="text-[length:var(--text-xs)] text-[var(--text-secondary)] mt-1">
                      {t(`settings.themes.${opt.i18nKey}.description`)}
                    </div>
                  </div>
                  {active && (
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--color-brand)] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {opt.swatches.map(s => (
                    <span
                      key={s}
                      className="w-5 h-5 rounded-[var(--radius-sm)] border border-black/5"
                      style={{ backgroundColor: s }}
                      title={s}
                    />
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Display — density toggle. Lives between Theme and Reporting Year so
          it lands next to the other visual preferences. */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4 text-[var(--text-tertiary)]" />
          <h2 className="font-display text-[length:var(--text-lg)] font-semibold text-[var(--text-primary)]">
            {t('settings.display.heading')}
          </h2>
        </div>
        <p className="text-[length:var(--text-sm)] text-[var(--text-secondary)]">
          {t('settings.display.intro')}
        </p>

        <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] space-y-5">
          {/* Color mode — light / auto / dark */}
          <div>
            <div className="flex items-center gap-2 text-[length:var(--text-sm)] font-medium text-[var(--text-primary)]">
              <SunMoon className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              {t('settings.display.appearance')}
            </div>
            <div className="text-[length:var(--text-xs)] text-[var(--text-tertiary)] mt-0.5 mb-3">
              {t('settings.display.appearanceHint')}
            </div>
            <ThemeToggle />
          </div>

          {/* Density */}
          <div className="border-t border-[var(--border-subtle)] pt-4">
            <div className="text-[length:var(--text-sm)] font-medium text-[var(--text-primary)]">{t('settings.display.density')}</div>
            <div className="text-[length:var(--text-xs)] text-[var(--text-tertiary)] mt-0.5 mb-3">
              {t('settings.display.densityHint')}
            </div>
            <div
              role="radiogroup"
              aria-label={t('settings.display.densityAria')}
              className="inline-flex border border-[var(--border-default)] rounded-[var(--radius-md)] p-1 bg-[var(--bg-secondary)]"
            >
              {(['comfortable', 'compact'] as const).map(value => {
                const active = density === value
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setDensity(value)}
                    className={`text-[length:var(--text-xs)] font-semibold h-8 px-3 rounded-[var(--radius-sm)] transition-colors ${
                      active
                        ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {value === 'comfortable' ? t('settings.display.comfortable') : t('settings.display.compact')}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--text-tertiary)]" />
          <h2 className="font-display text-[length:var(--text-lg)] font-semibold text-[var(--text-primary)]">
            {t('settings.reportingYear.heading')}
          </h2>
        </div>
        <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[length:var(--text-sm)] font-medium text-[var(--text-primary)]">{t('settings.reportingYear.active')}</div>
              <div className="text-[length:var(--text-xs)] text-[var(--text-tertiary)] mt-0.5">{t('settings.reportingYear.inherits')}</div>
            </div>
            <span className="px-2.5 py-1 rounded-[var(--radius-sm)] text-[length:var(--text-xs)] font-medium bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]">
              {t('settings.reportingYear.badge')}
            </span>
          </div>
        </div>
      </section>

      {/* GDPR data export — Right to portability (Art. 20). */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[var(--text-tertiary)]" />
          <h2 className="font-display text-[length:var(--text-lg)] font-semibold text-[var(--text-primary)]">
            {t('settings.export.heading')}
          </h2>
        </div>
        <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)]">
          <p className="text-[length:var(--text-sm)] text-[var(--text-secondary)]">
            {t('settings.export.body')}
          </p>
          <div className="flex items-center justify-between mt-4 gap-3 flex-wrap">
            <div className="text-[length:var(--text-xs)] text-[var(--text-tertiary)]">
              {exportedAt
                ? t('settings.export.lastExport', { date: new Date(exportedAt).toLocaleString(intlLocale(lng)) })
                : t('settings.export.none')}
            </div>
            <button
              onClick={downloadExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[length:var(--text-sm)] font-semibold disabled:opacity-50"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {exporting ? t('settings.export.building') : t('settings.export.download')}
            </button>
          </div>
          {exportError && (
            <div className="mt-3 p-2 rounded-[var(--radius-md)] bg-red-500/10 border border-red-500/30 text-red-400 text-[length:var(--text-xs)]">
              {exportError}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

/* ─── Notification preferences — per-user, persisted to user_preferences ── */
function NotificationPreferences() {
  const { t, i18n } = useTranslation()
  const [prefs, setPrefs] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    usersApi.preferences.get()
      .then(p => { if (!cancelled) { setPrefs(p); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e instanceof Error ? e.message : t('settings.notifications.loadFailed')); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  const update = async (patch: Partial<Omit<UserPreferences, 'updated_at'>>) => {
    if (!prefs) return
    const next: UserPreferences = { ...prefs, ...patch, updated_at: prefs.updated_at }
    setPrefs(next)
    setSaving(true); setError(null)
    try {
      const saved = await usersApi.preferences.update(patch)
      setPrefs(saved)
      setSavedAt(new Date().toISOString())
    } catch (e) {
      setError(e instanceof Error ? e.message : t('settings.notifications.saveFailed'))
      // Roll back on failure so the toggle stays accurate.
      const original = await usersApi.preferences.get().catch(() => null)
      if (original) setPrefs(original)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-[var(--text-tertiary)]" />
        <h2 className="font-display text-[length:var(--text-lg)] font-semibold text-[var(--text-primary)]">
          {t('settings.notifications.heading')}
        </h2>
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--text-tertiary)]" />}
      </div>
      <p className="text-[length:var(--text-sm)] text-[var(--text-secondary)]">
        {t('settings.notifications.intro')}
      </p>

      {loading ? (
        <div className="h-[180px] rounded-[var(--radius-lg)] skeleton" />
      ) : error && !prefs ? (
        <div className="p-3 rounded-[var(--radius-md)] bg-red-500/10 border border-red-500/30 text-red-400 text-[length:var(--text-xs)]">
          {error}
        </div>
      ) : prefs && (
        <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] space-y-4">
          <Toggle
            label={t('settings.notifications.assignment.label')}
            description={t('settings.notifications.assignment.description')}
            checked={prefs.email_on_assignment}
            onChange={v => update({ email_on_assignment: v })}
          />
          <div className="border-t border-[var(--border-subtle)] pt-4">
            <Toggle
              label={t('settings.notifications.review.label')}
              description={t('settings.notifications.review.description')}
              checked={prefs.email_on_review_request}
              onChange={v => update({ email_on_review_request: v })}
            />
          </div>
          <div className="border-t border-[var(--border-subtle)] pt-4">
            <Toggle
              label={t('settings.notifications.anomaly.label')}
              description={t('settings.notifications.anomaly.description')}
              checked={prefs.email_on_anomaly}
              onChange={v => update({ email_on_anomaly: v })}
            />
          </div>
          <div className="border-t border-[var(--border-subtle)] pt-4">
            <div className="text-[length:var(--text-sm)] font-medium text-[var(--text-primary)]">{t('settings.notifications.digest')}</div>
            <div className="text-[length:var(--text-xs)] text-[var(--text-tertiary)] mt-0.5 mb-3">
              {t('settings.notifications.digestHint')}
            </div>
            <div
              role="radiogroup"
              aria-label={t('settings.notifications.digestAria')}
              className="inline-flex border border-[var(--border-default)] rounded-[var(--radius-md)] p-1 bg-[var(--bg-secondary)]"
            >
              {(['none', 'daily', 'weekly'] as const).map(value => {
                const active = prefs.digest_frequency === value
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => update({ digest_frequency: value })}
                    className={`text-[length:var(--text-xs)] font-semibold h-8 px-3 rounded-[var(--radius-sm)] transition-colors capitalize ${
                      active
                        ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {t(`settings.notifications.digestOptions.${value}`)}
                  </button>
                )
              })}
            </div>
          </div>
          {savedAt && !error && (
            <div className="text-caption text-[var(--text-tertiary)] flex items-center gap-1">
              <Check className="w-3 h-3 text-[var(--status-ok)]" /> {t('settings.notifications.saved', { time: new Date(savedAt).toLocaleTimeString(intlLocale(i18n.language)) })}
            </div>
          )}
          {error && (
            <div className="text-[length:var(--text-xs)] text-red-400">{error}</div>
          )}
        </div>
      )}
    </section>
  )
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <div className="flex-1 min-w-0">
        <div className="text-[length:var(--text-sm)] font-medium text-[var(--text-primary)]">{label}</div>
        <div className="text-[length:var(--text-xs)] text-[var(--text-tertiary)] mt-0.5">{description}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <span className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 mt-0.5 ${checked ? 'bg-[var(--color-brand)]' : 'bg-[var(--bg-tertiary)]'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? 'left-4' : 'left-0.5'}`} />
      </span>
    </label>
  )
}
