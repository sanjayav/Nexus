import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, CircleSlash, FileText, Image as ImageIcon, Loader2, ServerOff, Sparkles } from 'lucide-react'
import type { AiProviderId, OrgSettingsPatch } from '../../lib/api'
import { StateBoundary, StatusPill, notify, SkeletonCard } from '../ui'
import type { OrgSettingsState } from './useOrgSettings'
import { Notice, ReadOnlyNote, SettingRow, SettingsCard, SettingsSection, Switch } from './primitives'

type ProviderChoice = 'auto' | AiProviderId

export default function AiSettings({ state, canEdit }: { state: OrgSettingsState; canEdit: boolean }) {
  const { t } = useTranslation()
  const { data, loading, error, reload, save } = state
  const [pending, setPending] = useState<string | null>(null)

  const apply = async (key: string, patch: OrgSettingsPatch, success: string) => {
    setPending(key)
    try {
      await save(patch)
      notify.success(success, { description: t('settings.ai.audited') })
    } catch (e) {
      notify.error(t('settings.ai.saveFailed'), { description: e instanceof Error ? e.message : undefined })
    } finally {
      setPending(null)
    }
  }

  return (
    <StateBoundary
      loading={loading}
      error={error}
      hasData={!!data}
      onRetry={reload}
      errorState={{ title: t('settings.ai.loadError') }}
      skeleton={<div className="grid gap-4 py-2"><SkeletonCard /></div>}
    >
      {() => {
        if (!data) return null
        const { ai, settings, effective } = data
        const choice: ProviderChoice = settings.ai_provider ?? 'auto'
        const autoProvider: AiProviderId = settings.market === 'cn' ? 'openai_compatible' : 'anthropic'
        const deploymentOff = ai.disabled_reason === 'deployment'
        const live = ai.enabled && ai.configured

        return (
          <div>
            {!canEdit && (
              <div className="mb-2">
                <ReadOnlyNote>{t('settings.ai.readOnly')}</ReadOnlyNote>
              </div>
            )}

            <SettingsSection title={t('settings.ai.status.title')} description={t('settings.ai.status.description')}>
              <div className="surface-paper p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <span
                    aria-hidden
                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[var(--radius-lg)] ${live ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]' : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)]'}`}
                  >
                    {live ? <Sparkles className="h-5 w-5" /> : <CircleSlash className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="type-h3 text-[var(--text-primary)]">{ai.provider_label}</span>
                      {!ai.enabled ? (
                        <StatusPill tone="neutral">{t('settings.ai.state.off')}</StatusPill>
                      ) : ai.configured ? (
                        <StatusPill tone="success" dot>{t('settings.ai.state.ready')}</StatusPill>
                      ) : (
                        <StatusPill tone="warning" dot>{t('settings.ai.state.notConfigured')}</StatusPill>
                      )}
                    </div>
                    <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-small sm:grid-cols-[auto_minmax(0,1fr)]">
                      <dt className="text-[var(--text-tertiary)]">{t('settings.ai.fields.provider')}</dt>
                      <dd className="text-[var(--text-secondary)]">{t(`settings.ai.providers.${ai.provider}.name`)}</dd>
                      <dt className="text-[var(--text-tertiary)]">{t('settings.ai.fields.model')}</dt>
                      <dd className={`min-w-0 truncate text-[var(--text-secondary)] ${ai.model ? 'font-mono text-caption leading-5' : 'text-small'}`}>{ai.model ?? t('settings.ai.fields.modelUnset')}</dd>
                      <dt className="text-[var(--text-tertiary)]">{t('settings.ai.fields.reads')}</dt>
                      <dd className="flex flex-wrap gap-3 text-[var(--text-secondary)]">
                        <Capability on={ai.supports.pdf} icon={<FileText />} label={t('settings.ai.fields.pdf')} />
                        <Capability on={ai.supports.images} icon={<ImageIcon />} label={t('settings.ai.fields.images')} />
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-3">
                {deploymentOff && (
                  <Notice tone="warning" icon={<ServerOff />} title={t('settings.ai.deploymentOff.title')}>
                    {t('settings.ai.deploymentOff.body')}
                  </Notice>
                )}
                {!deploymentOff && ai.enabled && !ai.configured && (
                  <Notice tone="warning" icon={<ServerOff />} title={t('settings.ai.notConfigured.title', { provider: ai.provider_label })}>
                    {t('settings.ai.notConfigured.body')}
                  </Notice>
                )}
              </div>
            </SettingsSection>

            <SettingsSection title={t('settings.ai.controls.title')} description={t('settings.ai.controls.description')}>
              <SettingsCard>
                <SettingRow
                  label={t('settings.ai.enabled.label')}
                  hint={t('settings.ai.enabled.hint')}
                  htmlFor="ai-enabled"
                  control={
                    <span className="inline-flex items-center gap-2">
                      {pending === 'enabled' && <Loader2 className="h-4 w-4 animate-spin text-[var(--text-tertiary)]" aria-hidden />}
                      <Switch
                        id="ai-enabled"
                        checked={settings.ai_enabled}
                        disabled={!canEdit || pending !== null || deploymentOff}
                        onChange={(v) => apply('enabled', { ai_enabled: v }, v ? t('settings.ai.toast.on') : t('settings.ai.toast.off'))}
                      />
                    </span>
                  }
                />
                <SettingRow label={t('settings.ai.provider.label')} hint={t('settings.ai.provider.hint')} stack
                  control={
                    <div role="radiogroup" aria-label={t('settings.ai.provider.label')} className="grid gap-2 sm:grid-cols-3">
                      {(['auto', 'anthropic', 'openai_compatible'] as const).map((p) => {
                        const on = choice === p
                        return (
                          <button
                            key={p}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            disabled={!canEdit || pending !== null || !settings.ai_enabled}
                            onClick={() => !on && apply('provider', { ai_provider: p === 'auto' ? null : p }, t('settings.ai.toast.provider', { provider: p === 'auto' ? t('settings.ai.providers.auto.name') : t(`settings.ai.providers.${p}.name`) }))}
                            className={`relative rounded-[var(--radius-lg)] border p-3 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60
                              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]
                              ${on ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]/40 ring-1 ring-[var(--color-brand)]' : 'border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)]'}`}
                          >
                            <span className="flex items-center justify-between gap-2">
                              <span className="text-small font-semibold text-[var(--text-primary)]">{t(`settings.ai.providers.${p}.name`)}</span>
                              {pending === 'provider' && on ? <Loader2 className="h-4 w-4 animate-spin text-[var(--text-tertiary)]" aria-hidden /> : on && <Check className="h-4 w-4 text-[var(--color-brand)]" aria-hidden />}
                            </span>
                            <span className="mt-1 block text-caption text-[var(--text-secondary)]">
                              {p === 'auto'
                                ? t('settings.ai.providers.auto.body', { provider: t(`settings.ai.providers.${autoProvider}.name`) })
                                : t(`settings.ai.providers.${p}.body`)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  }
                />
              </SettingsCard>
              <p className="mt-3 text-caption text-[var(--text-tertiary)]">
                {t('settings.ai.effective', { provider: t(`settings.ai.providers.${effective.ai_provider}.name`) })}
              </p>
            </SettingsSection>
          </div>
        )
      }}
    </StateBoundary>
  )
}

function Capability({ on, icon, label }: { on: boolean; icon: React.ReactNode; label: string }) {
  const { t } = useTranslation()
  return (
    <span className={`inline-flex items-center gap-1.5 [&>svg]:h-3.5 [&>svg]:w-3.5 ${on ? '' : 'text-[var(--text-tertiary)]'}`}>
      {icon}
      {on ? label : t('settings.ai.fields.unsupported', { what: label })}
    </span>
  )
}
