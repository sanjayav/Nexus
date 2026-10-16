import { useCallback, useEffect, useState } from 'react'
import { Mail, Shield, Sparkles, Bug, Globe2, RotateCw, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/PageHeader'
import { StatLedger, StatusPill, StateBoundary, SkeletonLedger, Skeleton } from '../components/ui'
import { system, type HealthResponse } from '../lib/api'
import { useFmt } from '../lib/fmt'
import { dur, ease } from '../motion/tokens'

/** Above this the database is reachable but slow — shown as a warning, not a failure. */
const SLOW_DB_MS = 250

interface IntegrationRowProps {
  name: string
  icon: React.ComponentType<{ className?: string }>
  configured: boolean
  provider?: string | null
  setupGuide: string
}

function IntegrationRow({ name, icon: Icon, configured, provider, setupGuide }: IntegrationRowProps) {
  const { t } = useTranslation()
  return (
    <li className="flex items-center gap-3 px-5 py-3.5 min-h-[68px] bg-[var(--bg-primary)]">
      <span className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]" aria-hidden>
        <Icon className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-body font-medium text-[var(--text-primary)] truncate">{name}</div>
        {(!configured || provider) && (
        <div className="text-caption text-[var(--text-tertiary)] mt-0.5 truncate">
          {configured
            ? <span className="font-mono">{provider}</span>
            : (
              <a href={setupGuide} className="inline-flex items-center gap-1 text-[var(--text-link)] hover:underline underline-offset-2">
                {t('systemStatus.integration.setupGuide')} <ArrowRight className="w-3 h-3" aria-hidden />
              </a>
            )}
        </div>
        )}
      </div>
      {configured
        ? <StatusPill tone="success" dot>{t('systemStatus.integration.configured')}</StatusPill>
        : <StatusPill tone="neutral">{t('systemStatus.integration.notConfigured')}</StatusPill>}
    </li>
  )
}

export default function SystemStatus() {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [lastPolled, setLastPolled] = useState<Date | null>(null)

  const poll = useCallback(async () => {
    setChecking(true)
    try {
      const data = await system.health()
      setHealth(data)
      setError(null)
      setLastPolled(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('systemStatus.errors.unreachable'))
    } finally {
      setLoading(false)
      setChecking(false)
    }
  }, [i18n])

  useEffect(() => {
    void poll()
    const id = window.setInterval(poll, 30_000)
    return () => window.clearInterval(id)
  }, [poll])

  const retry = () => {
    setLoading(true)
    void poll()
  }

  const allOk = Boolean(health?.ok && health.db.ok)
  const time = (d: Date) => d.toLocaleTimeString(f.localeFor(), { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const integrations = health
    ? [
        { key: 'email', name: t('systemStatus.integrations.email'), icon: Mail, configured: health.integrations.email.configured, provider: health.integrations.email.provider, setupGuide: '#setup/email' },
        { key: 'sso', name: t('systemStatus.integrations.sso'), icon: Shield, configured: health.integrations.sso.configured, provider: health.integrations.sso.provider, setupGuide: '#setup/sso' },
        { key: 'ai', name: t('systemStatus.integrations.ai'), icon: Sparkles, configured: health.integrations.ai.configured, provider: health.integrations.ai.provider, setupGuide: '#setup/ai' },
        { key: 'sentry', name: t('systemStatus.integrations.sentry'), icon: Bug, configured: health.integrations.sentry.configured, setupGuide: '#setup/sentry' },
        { key: 'eu', name: t('systemStatus.integrations.euRegion'), icon: Globe2, configured: health.integrations.euRegion.configured, setupGuide: '#setup/eu-region' },
        { key: 'apac', name: t('systemStatus.integrations.apacRegion'), icon: Globe2, configured: health.integrations.apacRegion.configured, setupGuide: '#setup/apac-region' },
      ]
    : []
  const configuredCount = integrations.filter(i => i.configured).length
  const latency = health?.db.latencyMs

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={t('systemStatus.title')}
        subtitle={t('systemStatus.subtitle')}
        actions={
          health ? (
            <button type="button" onClick={() => void poll()} disabled={checking} className="btn-secondary">
              <RotateCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} aria-hidden />
              {checking ? t('systemStatus.checking') : t('systemStatus.checkNow')}
            </button>
          ) : undefined
        }
      />

      <StateBoundary
        loading={loading}
        hasData={!!health}
        error={health ? null : error}
        onRetry={retry}
        errorState={{ title: t('systemStatus.errors.title'), body: t('systemStatus.errors.body') }}
        skeleton={
          <div className="space-y-6">
            <Skeleton className="h-[76px] w-full" rounded="lg" />
            <SkeletonLedger items={4} />
            <Skeleton className="h-[320px] w-full" rounded="lg" />
          </div>
        }
      >
        {health && (
          <>
            {/* Overall banner */}
            <motion.section
              key={allOk ? 'ok' : 'degraded'}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur.base, ease: ease.out }}
              role="status"
              aria-live="polite"
              className="flex items-center gap-4 px-5 py-4 rounded-[var(--radius-xl)] border"
              style={{
                background: allOk ? 'var(--status-success-soft)' : 'var(--status-danger-soft)',
                borderColor: allOk ? 'var(--status-success-line)' : 'var(--status-danger-line)',
              }}
            >
              <span className="relative flex w-10 h-10 items-center justify-center flex-shrink-0" aria-hidden>
                {allOk && (
                  <span className="absolute inset-1 rounded-full animate-ping opacity-20 motion-reduce:hidden" style={{ background: 'var(--status-success)' }} />
                )}
                {allOk
                  ? <CheckCircle2 className="relative w-7 h-7" style={{ color: 'var(--status-success)' }} />
                  : <AlertTriangle className="relative w-7 h-7" style={{ color: 'var(--status-danger)' }} />}
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="text-h3 text-[var(--text-primary)]">
                  {allOk ? t('systemStatus.banner.allOk') : t('systemStatus.banner.degraded')}
                </h2>
                <p className="text-small text-[var(--text-secondary)] mt-0.5">
                  {allOk ? t('systemStatus.banner.allOkBody') : t('systemStatus.banner.degradedBody')}
                </p>
              </div>
              <div className="hidden sm:block text-right text-caption text-[var(--text-tertiary)] whitespace-nowrap tabular-nums">
                {lastPolled ? t('systemStatus.banner.lastChecked', { time: time(lastPolled) }) : t('systemStatus.banner.probing')}
              </div>
            </motion.section>

            {error && (
              <p role="alert" className="flex items-center gap-2 text-small text-[var(--status-warning)]">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden />
                {t('systemStatus.errors.stale', { time: lastPolled ? time(lastPolled) : '—' })}
              </p>
            )}

            {/* Key figures */}
            <StatLedger
              aria-label={t('systemStatus.ledger.label')}
              items={[
                {
                  id: 'db',
                  label: t('systemStatus.db.title'),
                  value: health.db.ok ? t('systemStatus.db.healthy') : t('systemStatus.db.down'),
                  tone: health.db.ok ? 'success' : 'danger',
                  hint: health.db.ok ? t('systemStatus.db.engine') : (health.db.error ?? t('systemStatus.db.unavailable')),
                },
                {
                  id: 'latency',
                  label: t('systemStatus.db.latencyLabel'),
                  value: health.db.ok && typeof latency === 'number' ? latency : '—',
                  unit: health.db.ok && typeof latency === 'number' ? t('systemStatus.db.ms') : undefined,
                  tone: !health.db.ok || typeof latency !== 'number' ? 'neutral' : latency > SLOW_DB_MS ? 'warning' : 'success',
                  hint: t('systemStatus.db.latencyHint'),
                },
                {
                  id: 'integrations',
                  label: t('systemStatus.ledger.integrations'),
                  value: `${f.number(configuredCount)} / ${f.number(integrations.length)}`,
                  tone: configuredCount === integrations.length ? 'success' : 'neutral',
                  hint: t('systemStatus.ledger.integrationsHint'),
                },
                {
                  id: 'region',
                  label: t('systemStatus.footer.region'),
                  value: health.region,
                  tone: 'neutral',
                  hint: t('systemStatus.ledger.version', { version: health.version }),
                },
              ]}
            />

            {/* Integrations */}
            <section className="surface-paper overflow-hidden" aria-labelledby="integrations-heading">
              <header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--border-subtle)]">
                <h2 id="integrations-heading" className="text-h3 text-[var(--text-primary)]">{t('systemStatus.ledger.integrations')}</h2>
                <span className="text-caption text-[var(--text-tertiary)] tabular-nums whitespace-nowrap">
                  {t('systemStatus.integration.count', { configured: f.number(configuredCount), total: f.number(integrations.length) })}
                </span>
              </header>
              <ul className="grid md:grid-cols-2 gap-px bg-[var(--border-subtle)]">
                {integrations.map(({ key, ...rest }) => <IntegrationRow key={key} {...rest} />)}
              </ul>
            </section>

            <p className="text-caption text-[var(--text-tertiary)] tabular-nums">
              {t('systemStatus.footer.version')} <span className="font-mono text-[var(--text-secondary)]">{health.version}</span>
              <span className="mx-2" aria-hidden>·</span>
              {t('systemStatus.footer.probedAt')} <span className="text-[var(--text-secondary)] whitespace-nowrap">{f.dateTime(health.timestamp, { seconds: true })}</span>
            </p>
          </>
        )}
      </StateBoundary>
    </div>
  )
}
