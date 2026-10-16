import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation, Trans } from 'react-i18next'
import { ArrowUpRight, BadgeCheck, Clock, Copy, Fingerprint, Landmark, ShieldCheck, Terminal } from 'lucide-react'
import { verifyReport, type VerifyReportResponse } from '../lib/orgStore'
import { useFmt } from '../lib/fmt'
import { EmptyState, SealCheck, Skeleton, StatusPill, notify } from '../components/ui'
import PublicFrame from '../components/review/PublicFrame'
import { frameworkName, toReportLang, usePublicLanguage } from '../components/review/reportLang'
import { dur, ease, riseIn } from '../motion/tokens'

/** The verify endpoint may include the report's language (report_artifacts.locale). */
type Verified = VerifyReportResponse & { locale?: string | null }

/**
 * Public verification page — no login. Anyone holding the token from the
 * report's cover QR lands here and sees the authoritative record: SHA-256,
 * external timestamp, publish time, assurance. The page speaks the report's
 * language by default, with a toggle.
 */
export default function VerifyReport() {
  const { t } = useTranslation()
  const { token = '' } = useParams<{ token: string }>()
  const [state, setState] = useState<{ kind: 'loading' } | { kind: 'ok'; data: Verified } | { kind: 'error'; error: string }>({ kind: 'loading' })
  const { lang, setLang } = usePublicLanguage(state.kind === 'ok' ? state.data.locale : null)

  const load = () => {
    setState({ kind: 'loading' })
    let cancelled = false
    verifyReport(token)
      .then(d => {
        if (cancelled) return
        // Guard against a partial payload: never render "verified" without the record.
        if (!d || !d.published || !d.pdf?.sha256) setState({ kind: 'error', error: t('verify.errors.incomplete') })
        else setState({ kind: 'ok', data: d as Verified })
      })
      .catch(e => { if (!cancelled) setState({ kind: 'error', error: e instanceof Error ? e.message : '' }) })
    return () => { cancelled = true }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token])

  return (
    <PublicFrame chip={<><ShieldCheck className="w-3.5 h-3.5" /> {t('verify.publicVerification')}</>} lang={lang} onLangChange={setLang}>
      {state.kind === 'loading' && (
        <div role="status" aria-busy="true" className="space-y-5">
          <span className="sr-only">{t('verify.loading.title')}</span>
          <div className="surface-paper p-8 space-y-4">
            <Skeleton width={56} height={56} rounded="full" />
            <Skeleton height={36} width="60%" />
            <Skeleton height={16} width="80%" />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Skeleton height={180} rounded="lg" />
            <Skeleton height={180} rounded="lg" />
          </div>
        </div>
      )}

      {state.kind === 'error' && (
        <div className="surface-paper">
          <EmptyState
            variant="error"
            title={state.error === 'Unknown verification token' ? t('verify.errors.unknownTitle') : t('verify.errors.title')}
            body={state.error === 'Unknown verification token' ? t('verify.errors.unknownToken') : t('verify.errors.body')}
            detail={state.error === 'Unknown verification token' ? null : state.error}
            onRetry={state.error === 'Unknown verification token' ? undefined : load}
          />
        </div>
      )}

      {state.kind === 'ok' && <VerifyResult data={state.data} />}
    </PublicFrame>
  )
}

function VerifyResult({ data }: { data: Verified }) {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const reduce = useReducedMotion()
  const copy = async (s: string) => {
    try {
      await navigator.clipboard.writeText(s)
      notify.success(t('verify.hash.copied'))
    } catch {
      notify.error(t('verify.hash.copyFailed'))
    }
  }
  const reportLang = toReportLang(data.locale)
  const draft = data.published.is_draft

  return (
    <div className="space-y-5">
      {/* Verdict */}
      <motion.section {...riseIn(0)} className="surface-paper relative overflow-hidden p-6 sm:p-10">
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          <SealCheck size={64} ripple={!reduce} delay={0.15} label={t('verify.result.kicker')} />
          <div className="min-w-0 flex-1">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur.base, ease: ease.out, delay: 0.45 }}
              className="text-small font-semibold text-[var(--status-success)]"
            >
              {t('verify.result.verdict')}
            </motion.div>
            <h1 className="type-display text-[var(--text-primary)] mt-1 text-balance break-words">{data.organisation}</h1>
            <p className="type-body text-[var(--text-secondary)] mt-3 max-w-[62ch] text-pretty">
              <Trans
                i18nKey="verify.result.authentic"
                values={{ by: data.published.by, date: f.date(data.published.at) }}
                components={{ strong: <strong className="font-semibold text-[var(--text-primary)]" /> }}
              />
            </p>
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-5 pt-6 border-t border-[var(--border-subtle)]">
          <Fact className="col-span-2" label={t('verify.facts.framework')} value={frameworkName(data.framework, i18n.language)} />
          <Fact label={t('verify.facts.period')} value={data.period.label} />
          <Fact label={t('verify.facts.version')} value={t('verify.result.version', { version: data.published.version })} />
          <Fact
            label={t('verify.facts.status')}
            value={draft
              ? <StatusPill tone="warning" dot>{t('verify.result.unauditedDraft')}</StatusPill>
              : <StatusPill tone="success" icon={<BadgeCheck />}>{t('verify.result.assured')}</StatusPill>}
          />
          {reportLang && <Fact label={t('verify.facts.language')} value={t(`reviewUi.lang.${reportLang}`)} />}
        </dl>
      </motion.section>

      {/* Fingerprint + anchor */}
      <div className="grid gap-5 md:grid-cols-2">
        <motion.section {...riseIn(1)} className="surface-paper p-6" aria-labelledby="hash-h">
          <PanelHead icon={<Fingerprint className="w-4 h-4" />} id="hash-h" title={t('verify.hash.title')} />
          <div className="mt-4 p-3.5 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] font-mono text-[13px] leading-[21px] text-[var(--text-primary)] break-all">
            {data.pdf.sha256}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-caption text-[var(--text-tertiary)]">
              {t('verify.hash.fileSize', { size: f.number(data.pdf.size / 1024, { maxFraction: 1 }) })}
              {data.pdf.pages ? <> · {t('verify.hash.pages', { count: data.pdf.pages })}</> : null}
            </span>
            <button
              type="button"
              onClick={() => void copy(data.pdf.sha256)}
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
            >
              <Copy className="w-3.5 h-3.5" /> {t('verify.hash.copy')}
            </button>
          </div>
          <p className="text-caption text-[var(--text-tertiary)] mt-4">
            <Trans i18nKey="verify.hash.howTo" components={{ code: <code className="font-mono text-[var(--text-secondary)]" /> }} />
          </p>
        </motion.section>

        <motion.section {...riseIn(2)} className="surface-paper p-6" aria-labelledby="anchor-h">
          <PanelHead icon={<Clock className="w-4 h-4" />} id="anchor-h" title={t('verify.anchor.title')} />
          {data.anchor ? (
            <>
              <div className="mt-4 flex items-center gap-2">
                <StatusPill tone="success" dot>{t('verify.anchor.anchored')}</StatusPill>
                <span className="text-small text-[var(--text-secondary)]">OpenTimestamps</span>
              </div>
              <dl className="mt-4 space-y-2.5 text-small">
                <Row label={t('verify.anchor.anchoredAt')} value={f.dateTime(data.anchor.anchored_at)} />
                <Row
                  label={t('verify.anchor.calendar')}
                  value={
                    <a href={data.anchor.calendar} target="_blank" rel="noreferrer" title={data.anchor.calendar} className="flex items-center gap-0.5 min-w-0 text-[var(--color-brand-strong)] hover:underline">
                      <span className="truncate">{data.anchor.calendar.replace(/^https?:\/\//, '')}</span> <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0" />
                    </a>
                  }
                />
              </dl>
              <p className="text-caption text-[var(--text-tertiary)] mt-4">{t('verify.anchor.note')}</p>
            </>
          ) : (
            <p className="mt-4 type-small text-[var(--text-secondary)]">{t('verify.anchor.none')}</p>
          )}
        </motion.section>
      </div>

      {/* Assurance */}
      <motion.section {...riseIn(3)} className="surface-paper p-6" aria-labelledby="assure-h">
        <PanelHead icon={<Landmark className="w-4 h-4" />} id="assure-h" title={data.assurance ? t('verify.assurance.statement') : t('verify.assurance.pending')} />
        <p className="type-small text-[var(--text-secondary)] mt-3 max-w-[70ch]">
          {data.assurance ? (
            <>
              <Trans
                i18nKey={data.assurance.firm ? 'verify.assurance.signedByFirm' : 'verify.assurance.signedBy'}
                values={{ signer: data.assurance.signed_by, firm: data.assurance.firm ?? '', date: f.date(data.assurance.signed_at) }}
                components={{ strong: <strong className="font-semibold text-[var(--text-primary)]" /> }}
              />{' '}
              {data.assurance.standard
                ? t(data.assurance.opinion === 'reasonable' ? 'verify.assurance.reasonablePer' : 'verify.assurance.limitedPer', { standard: data.assurance.standard })
                : t(data.assurance.opinion === 'reasonable' ? 'verify.assurance.reasonable' : 'verify.assurance.limited')}
            </>
          ) : t('verify.assurance.none')}
        </p>
      </motion.section>

      {/* Do it yourself */}
      <motion.section {...riseIn(4)} className="surface-paper p-6" aria-labelledby="manual-h">
        <PanelHead icon={<Terminal className="w-4 h-4" />} id="manual-h" title={t('verify.manual.title')} />
        <ol className="mt-4 space-y-3 max-w-[72ch]">
          {(['step1', 'step2', 'step3'] as const).map((k, i) => (
            <li key={k} className="flex gap-3 type-small text-[var(--text-secondary)]">
              <span className="w-6 h-6 flex-shrink-0 rounded-full bg-[var(--bg-secondary)] text-caption font-semibold text-[var(--text-primary)] inline-flex items-center justify-center tabular-nums">{i + 1}</span>
              <span className="min-w-0 break-words">
                <Trans i18nKey={`verify.manual.${k}`} components={{ code: <code className="font-mono text-caption px-1.5 py-0.5 rounded-[4px] bg-[var(--bg-secondary)] text-[var(--text-primary)] break-all" /> }} />
              </span>
            </li>
          ))}
        </ol>
      </motion.section>
    </div>
  )
}

function PanelHead({ icon, title, id }: { icon: ReactNode; title: string; id: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-8 h-8 rounded-[var(--radius-md)] inline-flex items-center justify-center bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]">{icon}</span>
      <h2 id={id} className="type-h3 text-[var(--text-primary)]">{title}</h2>
    </div>
  )
}

function Fact({ label, value, className = '' }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-caption text-[var(--text-tertiary)]">{label}</dt>
      <dd className="mt-1 type-small font-semibold text-[var(--text-primary)] break-words">{value}</dd>
    </div>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
      <dt className="text-[var(--text-tertiary)]">{label}</dt>
      <dd className="text-[var(--text-primary)] min-w-0">{value}</dd>
    </div>
  )
}
