import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Loader2 } from 'lucide-react'
import { users as usersApi, type UserPreferences } from '../../lib/api'
import { StateBoundary, notify } from '../ui'
import { Skeleton } from '../Skeleton'
import { useFmt } from '../../lib/fmt'
import { Segmented, SettingRow, SettingsCard, Switch } from './primitives'

type PrefPatch = Partial<Omit<UserPreferences, 'updated_at'>>

/** Personal email preferences (user_preferences). Each change saves immediately and rolls back on failure. */
export default function NotificationPrefs() {
  const { t } = useTranslation()
  const f = useFmt()
  const [prefs, setPrefs] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    usersApi.preferences
      .get()
      .then(setPrefs)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])

  const update = async (patch: PrefPatch) => {
    if (!prefs) return
    const before = prefs
    setPrefs({ ...prefs, ...patch })
    setSaving(true)
    try {
      setPrefs(await usersApi.preferences.update(patch))
      setSavedAt(new Date().toISOString())
    } catch (e) {
      setPrefs(before)
      notify.error(t('settings.notifications.saveFailed'), { description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  const toggles: Array<{ key: 'email_on_assignment' | 'email_on_review_request' | 'email_on_anomaly'; i18n: string }> = [
    { key: 'email_on_assignment', i18n: 'assignment' },
    { key: 'email_on_review_request', i18n: 'review' },
    { key: 'email_on_anomaly', i18n: 'anomaly' },
  ]

  return (
    <StateBoundary
      loading={loading}
      error={error}
      hasData={!!prefs}
      onRetry={load}
      compact
      errorState={{ title: t('settings.notifications.loadFailed') }}
      skeleton={<div className="surface-paper space-y-4 p-5"><Skeleton className="h-4 w-64" /><Skeleton className="h-4 w-56" /><Skeleton className="h-4 w-60" /></div>}
    >
      {() =>
        prefs && (
          <>
            <SettingsCard>
              {toggles.map((tg) => (
                <SettingRow
                  key={tg.key}
                  label={t(`settings.notifications.${tg.i18n}.label`)}
                  hint={t(`settings.notifications.${tg.i18n}.description`)}
                  htmlFor={`pref-${tg.key}`}
                  control={<Switch id={`pref-${tg.key}`} checked={prefs[tg.key]} onChange={(v) => update({ [tg.key]: v })} />}
                />
              ))}
              <SettingRow
                label={t('settings.notifications.digest')}
                hint={t('settings.notifications.digestHint')}
                control={
                  <Segmented
                    aria-label={t('settings.notifications.digestAria')}
                    value={prefs.digest_frequency}
                    onChange={(v) => update({ digest_frequency: v })}
                    options={(['none', 'daily', 'weekly'] as const).map((v) => ({ value: v, label: t(`settings.notifications.digestOptions.${v}`) }))}
                  />
                }
              />
            </SettingsCard>
            <div className="mt-2 flex h-5 items-center gap-1.5 text-caption text-[var(--text-tertiary)]" aria-live="polite">
              {saving ? (
                <><Loader2 className="h-3 w-3 animate-spin" aria-hidden />{t('settings.notifications.saving')}</>
              ) : savedAt ? (
                <><Check className="h-3 w-3 text-[var(--status-success)]" aria-hidden />{t('settings.notifications.saved', { time: f.dateTime(savedAt) })}</>
              ) : null}
            </div>
          </>
        )
      }
    </StateBoundary>
  )
}
