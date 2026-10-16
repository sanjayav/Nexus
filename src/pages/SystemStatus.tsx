import { useCallback, useEffect, useState } from 'react'
import {
  Activity, CheckCircle2, XCircle, AlertTriangle, Database, Mail,
  Shield, Sparkles, Bug, Globe2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/PageHeader'
import { SkeletonCard } from '../components/Skeleton'
import { Card, Badge } from '../design-system'
import { system, type HealthResponse } from '../lib/api'

interface IntegrationCardProps {
  name: string
  icon: React.ComponentType<{ className?: string }>
  configured: boolean
  provider?: string | null
  setupGuide: string
}

function IntegrationCard({ name, icon: Icon, configured, provider, setupGuide }: IntegrationCardProps) {
  const { t } = useTranslation()
  return (
    <Card variant="paper" className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-md flex items-center justify-center ${
            configured ? 'bg-[var(--accent-green-light)]' : 'bg-[var(--bg-tertiary)]'
          }`}>
            <Icon className={`w-4 h-4 ${configured ? 'text-[var(--accent-green)]' : 'text-[var(--text-tertiary)]'}`} />
          </div>
          <div>
            <div className="text-[13.5px] font-semibold text-[var(--text-primary)]">{name}</div>
            <div className="text-[12px] text-[var(--text-secondary)] mt-0.5">
              {configured ? (provider ?? t('systemStatus.integration.configured')) : t('systemStatus.integration.notConfigured')}
            </div>
          </div>
        </div>
        {configured
          ? <Badge variant="green">{t('systemStatus.integration.ready')}</Badge>
          : <Badge variant="gray">{t('systemStatus.integration.missing')}</Badge>}
      </div>
      {!configured && (
        <a
          href={setupGuide}
          className="mt-3 inline-flex items-center gap-1 text-[12px] text-[var(--accent-blue)] hover:underline"
        >
          {t('systemStatus.integration.setupGuide')}
        </a>
      )}
    </Card>
  )
}

export default function SystemStatus() {
  const { t, i18n } = useTranslation()
  // Keep the browser default for English; switch explicitly for zh / th.
  const locale = i18n.language?.startsWith('zh') ? 'zh-CN' : i18n.language?.startsWith('th') ? 'th-TH' : undefined
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastPolled, setLastPolled] = useState<Date | null>(null)

  const poll = useCallback(async () => {
    try {
      const data = await system.health()
      setHealth(data)
      setError(null)
      setLastPolled(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('systemStatus.errors.unreachable'))
    } finally {
      setLoading(false)
    }
  }, [i18n])

  useEffect(() => {
    void poll()
    const id = window.setInterval(poll, 30_000)
    return () => window.clearInterval(id)
  }, [poll])

  const allOk = health?.ok && health.db.ok

  return (
    <div className="page-container">
      <PageHeader
        breadcrumbs={[
          { label: t('nav.admin') },
          { label: t('systemStatus.title') },
        ]}
        eyebrow={t('systemStatus.eyebrow')}
        title={t('systemStatus.title')}
        subtitle={t('systemStatus.subtitle')}
      />

      {loading && !health ? (
        <div className="space-y-3">
          <SkeletonCard />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        </div>
      ) : error && !health ? (
        <Card variant="outlined" className="border-[var(--accent-red-light)]">
          <div className="flex items-start gap-3 text-[13px] text-[var(--accent-red)]">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        </Card>
      ) : health ? (
        <>
          {/* Top banner */}
          <Card
            variant="outlined"
            className={`mb-5 ${allOk
              ? 'border-[var(--accent-green-light)] bg-[var(--accent-green-light)]/30'
              : 'border-[var(--accent-red-light)] bg-[var(--accent-red-light)]/30'
            }`}
          >
            <div className="flex items-center gap-3">
              {allOk
                ? <CheckCircle2 className="w-6 h-6 text-[var(--accent-green)] flex-shrink-0" />
                : <XCircle className="w-6 h-6 text-[var(--accent-red)] flex-shrink-0" />}
              <div className="flex-1">
                <div className={`text-[15px] font-semibold ${
                  allOk ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'
                }`}>
                  {allOk ? t('systemStatus.banner.allOk') : t('systemStatus.banner.degraded')}
                </div>
                <div className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">
                  {lastPolled
                    ? t('systemStatus.banner.lastChecked', { time: lastPolled.toLocaleTimeString(locale) })
                    : t('systemStatus.banner.probing')}
                </div>
              </div>
              <Activity className="w-5 h-5 text-[var(--text-tertiary)]" />
            </div>
          </Card>

          {/* DB latency */}
          <div className="mb-5">
            <Card variant="paper">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
                    health.db.ok ? 'bg-[var(--accent-green-light)]' : 'bg-[var(--accent-red-light)]'
                  }`}>
                    <Database className={`w-5 h-5 ${
                      health.db.ok ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'
                    }`} />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[var(--text-primary)]">
                      {t('systemStatus.db.title')}
                    </div>
                    <div className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">
                      {health.db.ok
                        ? t('systemStatus.db.latency', { ms: health.db.latencyMs ?? '?' })
                        : health.db.error ?? t('systemStatus.db.unavailable')}
                    </div>
                  </div>
                </div>
                {health.db.ok
                  ? <Badge variant="green">{t('systemStatus.db.healthy')}</Badge>
                  : <Badge variant="red">{t('systemStatus.db.down')}</Badge>}
              </div>
            </Card>
          </div>

          {/* Integration grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
            <IntegrationCard
              name={t('systemStatus.integrations.email')}
              icon={Mail}
              configured={health.integrations.email.configured}
              provider={health.integrations.email.provider}
              setupGuide="#setup/email"
            />
            <IntegrationCard
              name={t('systemStatus.integrations.sso')}
              icon={Shield}
              configured={health.integrations.sso.configured}
              provider={health.integrations.sso.provider}
              setupGuide="#setup/sso"
            />
            <IntegrationCard
              name={t('systemStatus.integrations.ai')}
              icon={Sparkles}
              configured={health.integrations.ai.configured}
              provider={health.integrations.ai.provider}
              setupGuide="#setup/ai"
            />
            <IntegrationCard
              name={t('systemStatus.integrations.sentry')}
              icon={Bug}
              configured={health.integrations.sentry.configured}
              setupGuide="#setup/sentry"
            />
            <IntegrationCard
              name={t('systemStatus.integrations.euRegion')}
              icon={Globe2}
              configured={health.integrations.euRegion.configured}
              setupGuide="#setup/eu-region"
            />
            <IntegrationCard
              name={t('systemStatus.integrations.apacRegion')}
              icon={Globe2}
              configured={health.integrations.apacRegion.configured}
              setupGuide="#setup/apac-region"
            />
          </div>

          {/* Footer */}
          <Card variant="paper">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-[var(--text-tertiary)]">
              <div>
                {t('systemStatus.footer.version')} <span className="font-mono text-[var(--text-secondary)]">{health.version}</span>
              </div>
              <div>
                {t('systemStatus.footer.region')} <span className="font-mono text-[var(--text-secondary)]">{health.region}</span>
              </div>
              <div>
                {t('systemStatus.footer.probedAt')} <span className="font-mono text-[var(--text-secondary)]">{new Date(health.timestamp).toLocaleString(locale)}</span>
              </div>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  )
}
