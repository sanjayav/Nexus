import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Building2, CalendarRange, KeyRound, Network, ScrollText, Activity, Users, Plus } from 'lucide-react'
import { orgStore, type ReportingPeriod } from '../../lib/orgStore'
import { useOrgBrand } from '../../lib/useOrgBrand'
import { FRAMEWORKS, useFramework } from '../../lib/frameworks'
import { useFmt } from '../../lib/fmt'
import { StateBoundary, StatusPill, Skeleton } from '../ui'
import type { OrgSettingsState } from './useOrgSettings'
import type { SettingsTab } from './tabs'
import { SettingsSection } from './primitives'

const PERIOD_TONE: Record<ReportingPeriod['status'], 'neutral' | 'success' | 'warning' | 'brand'> = {
  setup: 'neutral',
  active: 'success',
  locked: 'warning',
  published: 'brand',
  archived: 'neutral',
}

export default function OrganisationSettings({
  state,
  canEdit,
  onOpenTab,
}: {
  state: OrgSettingsState
  canEdit: boolean
  onOpenTab: (tab: SettingsTab) => void
}) {
  const { t } = useTranslation()
  const brand = useOrgBrand()
  const { enabled } = useFramework()
  const { data, loading: settingsLoading } = state
  const enabledCount = FRAMEWORKS.filter((f) => enabled.includes(f.id)).length

  const summary: Array<{ id: string; label: string; value: React.ReactNode; tab: SettingsTab }> = [
    {
      id: 'market',
      label: t('settings.org.summary.market'),
      value: data ? t(`market.market.${data.settings.market}.label`) : null,
      tab: 'market',
    },
    {
      id: 'residency',
      label: t('settings.org.summary.residency'),
      value: data ? (data.settings.data_residency_region ? t(`market.fields.residency.options.${data.settings.data_residency_region}`) : t('settings.org.summary.notSet')) : null,
      tab: 'market',
    },
    {
      id: 'ai',
      label: t('settings.org.summary.ai'),
      value: data ? (!data.ai.enabled ? t('settings.ai.state.off') : data.ai.configured ? data.ai.provider_label : t('settings.ai.state.notConfigured')) : null,
      tab: 'ai',
    },
    {
      id: 'frameworks',
      label: t('settings.org.summary.frameworks'),
      value: t('settings.org.summary.frameworksValue', { count: enabledCount }),
      tab: 'frameworks',
    },
  ]

  return (
    <div>
      <section className="surface-hero mt-2 p-5 sm:p-6" aria-label={t('settings.org.heroAria')}>
        <div className="relative flex items-start gap-4">
          <span aria-hidden className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--bg-inverse)] text-[var(--sidebar-accent)]">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="kicker">{t('settings.org.kicker')}</div>
            <h2 className="type-h2 mt-0.5 text-[var(--text-primary)] break-words">{brand.name}</h2>
            {(brand.legal_name || brand.headquarters) && (
              <p className="mt-0.5 text-small text-[var(--text-secondary)]">{[brand.legal_name, brand.headquarters].filter(Boolean).join(' · ')}</p>
            )}
          </div>
        </div>
        <dl className="relative mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--border-subtle)] lg:grid-cols-4">
          {summary.map((s) => (
            <div key={s.id} className="bg-[var(--bg-primary)]">
              <button
                type="button"
                onClick={() => onOpenTab(s.tab)}
                className="group flex h-full w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand)]"
              >
                <dt className="text-caption text-[var(--text-tertiary)]">{s.label}</dt>
                <dd className="flex w-full items-center justify-between gap-2 text-small font-semibold text-[var(--text-primary)]">
                  <span className="truncate">{s.value ?? (settingsLoading ? <Skeleton className="inline-block h-4 w-20 align-middle" /> : '—')}</span>
                  <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-quaternary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text-secondary)]" aria-hidden />
                </dd>
              </button>
            </div>
          ))}
        </dl>
      </section>

      <SettingsSection title={t('settings.org.period.title')} description={t('settings.org.period.description')}>
        <ActivePeriod canEdit={canEdit} />
      </SettingsSection>

      {canEdit && (
        <SettingsSection title={t('settings.org.admin.title')} description={t('settings.org.admin.description')}>
          <ul className="surface-paper divide-y divide-[var(--border-subtle)]">
            {[
              { to: '/admin/users', icon: Users, key: 'users' },
              { to: '/admin/org/legacy', icon: Network, key: 'structure' },
              { to: '/admin/periods', icon: CalendarRange, key: 'periods' },
              { to: '/admin/api-keys', icon: KeyRound, key: 'apiKeys' },
              { to: '/admin/scim', icon: KeyRound, key: 'scim' },
              { to: '/admin/audit', icon: ScrollText, key: 'audit' },
              { to: '/admin/system-status', icon: Activity, key: 'status' },
            ].map(({ to, icon: Icon, key }) => (
              <li key={key}>
                <Link
                  to={to}
                  className="group flex items-center gap-3 px-4 py-3 transition-colors first:rounded-t-[var(--radius-xl)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand)] sm:px-5"
                >
                  <Icon className="h-4 w-4 flex-shrink-0 text-[var(--text-tertiary)]" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-small font-medium text-[var(--text-primary)]">{t(`settings.org.admin.links.${key}.label`)}</span>
                    <span className="block text-caption text-[var(--text-tertiary)]">{t(`settings.org.admin.links.${key}.hint`)}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-[var(--text-quaternary)] transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </SettingsSection>
      )}
    </div>
  )
}

function ActivePeriod({ canEdit }: { canEdit: boolean }) {
  const { t } = useTranslation()
  const f = useFmt()
  const { active: framework } = useFramework()
  const [periods, setPeriods] = useState<ReportingPeriod[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    orgStore
      .listPeriods()
      .then(setPeriods)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])

  const scoped = (periods ?? []).filter((p) => p.framework_id === framework.id)
  const current = scoped.find((p) => p.status === 'active') ?? scoped.find((p) => p.status === 'setup') ?? scoped[0]

  return (
    <StateBoundary
      loading={loading}
      error={error}
      hasData={!!periods}
      onRetry={load}
      compact
      empty={!current}
      emptyState={{
        art: 'setup',
        title: t('settings.org.period.emptyTitle'),
        body: t('settings.org.period.emptyBody'),
        cta: canEdit ? { label: t('settings.org.period.create'), to: '/admin/periods?new=1', icon: <Plus className="h-4 w-4" /> } : undefined,
        framed: true,
      }}
      skeleton={<div className="surface-paper p-5"><Skeleton className="h-5 w-32" /><Skeleton className="mt-3 h-3 w-64" /></div>}
    >
      {() =>
        current && (
          <div className="surface-paper flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="type-h3 text-[var(--text-primary)]">{current.label}</span>
                <StatusPill tone={PERIOD_TONE[current.status]} dot={current.status === 'active'}>{t(`settings.org.period.status.${current.status}`)}</StatusPill>
              </div>
              <p className="mt-1 text-small text-[var(--text-secondary)]">
                {current.start_date && current.end_date ? `${f.date(current.start_date)} – ${f.date(current.end_date)}` : t('settings.org.period.noDates')}
                {current.submission_deadline && (
                  <>
                    {' · '}
                    <span className="whitespace-nowrap">{t('settings.org.period.deadline', { date: f.date(current.submission_deadline) })}</span>
                  </>
                )}
              </p>
            </div>
            <Link to="/admin/periods" className="btn-secondary h-10 self-start sm:self-auto">
              {t('settings.org.period.manage')}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        )
      }
    </StateBoundary>
  )
}
