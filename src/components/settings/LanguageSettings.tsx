import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Loader2, Mail } from 'lucide-react'
import { userLocale, toAppLocale, type UserLocaleResponse } from '../../lib/api'
import { StateBoundary, StatusPill, notify } from '../ui'
import { Skeleton } from '../Skeleton'
import { useTheme, type Theme } from '../../theme/ThemeContext'
import { useDensity } from '../../lib/density'
import ThemeToggle from '../ThemeToggle'
import { clearUiLanguagePreference, setUiLanguage, UI_LANGUAGES, USER_LOCALE_EVENT } from './languagePreference'
import { Segmented, SettingRow, SettingsCard, SettingsSection } from './primitives'

const THEMES: Array<{ value: Theme; i18nKey: string; swatches: string[] }> = [
  { value: 'demo-flat', i18nKey: 'demoFlat', swatches: ['var(--accent-700)', 'var(--accent-100)', 'var(--status-success)', 'var(--status-warning)', 'var(--status-danger)'] },
  { value: 'glass', i18nKey: 'glass', swatches: ['var(--accent-600)', 'var(--accent-50)', 'var(--status-success)', 'var(--status-warning)', 'var(--status-danger)'] },
]

export default function LanguageSettings() {
  const { t, i18n } = useTranslation()
  const [pref, setPref] = useState<UserLocaleResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const current = toAppLocale(i18n.language)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    userLocale
      .get()
      .then(setPref)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const onChange = (e: Event) => {
      const d = (e as CustomEvent<UserLocaleResponse>).detail
      if (d) setPref(d)
    }
    window.addEventListener(USER_LOCALE_EVENT, onChange)
    return () => window.removeEventListener(USER_LOCALE_EVENT, onChange)
  }, [load])

  const choose = async (code: string) => {
    if (code === current && pref?.locale === code) return
    setBusy(code)
    const r = await setUiLanguage(code)
    setBusy(null)
    if (r) setPref(r)
    else notify.error(t('settings.language.saveFailed'), { description: t('settings.language.saveFailedHint') })
  }

  const useDefault = async () => {
    setBusy('default')
    try {
      const r = await clearUiLanguagePreference()
      setPref(r)
      notify.success(t('settings.language.clearedToast'))
    } catch (e) {
      notify.error(t('settings.language.saveFailed'), { description: e instanceof Error ? e.message : undefined })
    } finally {
      setBusy(null)
    }
  }

  const langName = (code: string | null | undefined) => UI_LANGUAGES.find((l) => l.code === code)?.label ?? '—'
  const outOfSync = !!pref && pref.locale !== null && pref.locale !== current

  return (
    <div>
      <SettingsSection title={t('settings.language.title')} description={t('settings.language.description')}>
        <div role="radiogroup" aria-label={t('settings.language.title')} className="surface-paper divide-y divide-[var(--border-subtle)]">
          {UI_LANGUAGES.map((l) => {
            const on = current === l.code
            return (
              <button
                key={l.code}
                type="button"
                role="radio"
                aria-checked={on}
                lang={l.code === 'zh' ? 'zh-CN' : l.code}
                onClick={() => choose(l.code)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors first:rounded-t-[var(--radius-xl)] last:rounded-b-[var(--radius-xl)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand)] sm:px-5"
              >
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${on ? 'border-transparent bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]' : 'border-[var(--border-strong)]'}`}
                  >
                    {on && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className="text-body font-medium text-[var(--text-primary)]">{l.label}</span>
                </span>
                {busy === l.code ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--text-tertiary)]" aria-hidden />
                ) : pref?.locale === l.code ? (
                  <StatusPill tone="brand" size="sm">{t('settings.language.saved')}</StatusPill>
                ) : null}
              </button>
            )
          })}
        </div>
      </SettingsSection>

      <SettingsSection title={t('settings.language.server.title')} description={t('settings.language.server.description')}>
        <StateBoundary
          loading={loading}
          error={error}
          hasData={!!pref}
          onRetry={load}
          compact
          errorState={{ title: t('settings.language.server.loadError') }}
          skeleton={<div className="surface-paper p-5"><Skeleton className="h-4 w-56" /><Skeleton className="mt-3 h-3 w-72" /></div>}
        >
          {() =>
            pref && (
              <div className="surface-paper p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--text-tertiary)]" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="text-body text-[var(--text-primary)]">
                      {t('settings.language.server.resolved', { language: langName(pref.resolved) })}
                    </div>
                    <div className="mt-1 text-small text-[var(--text-secondary)]">
                      {pref.locale ? t('settings.language.server.explicit', { language: langName(pref.locale) }) : t('settings.language.server.following')}
                    </div>
                    {outOfSync && (
                      <button type="button" onClick={() => choose(current)} className="mt-3 btn-secondary h-9 text-small">
                        {t('settings.language.server.sync', { language: langName(current) })}
                      </button>
                    )}
                  </div>
                  {pref.locale && (
                    <button
                      type="button"
                      onClick={useDefault}
                      disabled={busy === 'default'}
                      className="flex-shrink-0 text-small font-medium text-[var(--color-brand)] hover:underline underline-offset-2 disabled:opacity-50"
                    >
                      {t('settings.language.server.useDefault')}
                    </button>
                  )}
                </div>
              </div>
            )
          }
        </StateBoundary>
      </SettingsSection>

      <DisplaySection />
    </div>
  )
}

function DisplaySection() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { density, setDensity } = useDensity()
  return (
    <SettingsSection title={t('settings.display.heading')} description={t('settings.display.intro')}>
      <SettingsCard>
        <SettingRow label={t('settings.display.appearance')} hint={t('settings.display.appearanceHint')} control={<ThemeToggle />} />
        <SettingRow
          label={t('settings.display.density')}
          hint={t('settings.display.densityHint')}
          control={
            <Segmented
              aria-label={t('settings.display.densityAria')}
              value={density}
              onChange={setDensity}
              options={[
                { value: 'comfortable', label: t('settings.display.comfortable') },
                { value: 'compact', label: t('settings.display.compact') },
              ]}
            />
          }
        />
        <SettingRow label={t('settings.theme.heading')} hint={t('settings.theme.intro')} stack
          control={
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t('settings.theme.heading')}>
              {THEMES.map((opt) => {
                const on = theme === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setTheme(opt.value)}
                    className={`rounded-[var(--radius-lg)] border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]
                      ${on ? 'border-[var(--color-brand)] ring-1 ring-[var(--color-brand)]' : 'border-[var(--border-default)] hover:border-[var(--border-strong)]'}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-small font-semibold text-[var(--text-primary)]">{t(`settings.themes.${opt.i18nKey}.label`)}</span>
                      {on && <Check className="h-4 w-4 text-[var(--color-brand)]" aria-hidden />}
                    </span>
                    <span className="mt-1 block text-caption text-[var(--text-secondary)]">{t(`settings.themes.${opt.i18nKey}.description`)}</span>
                    <span className="mt-2 flex gap-1" aria-hidden>
                      {opt.swatches.map((s) => (
                        <span key={s} className="h-4 w-4 rounded-[var(--radius-xs)] ring-1 ring-[var(--border-subtle)]" style={{ background: s }} />
                      ))}
                    </span>
                  </button>
                )
              })}
            </div>
          }
        />
      </SettingsCard>
    </SettingsSection>
  )
}
