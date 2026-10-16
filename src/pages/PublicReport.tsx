import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowUpRight, BadgeCheck, ChevronDown, FileText, Lock, Printer, ShieldCheck } from 'lucide-react'
import { itemLabel } from '../lib/itemLabel'
import { useFmt } from '../lib/fmt'
import { EmptyState, Skeleton, StatusPill } from '../components/ui'
import PublicFrame from '../components/review/PublicFrame'
import { frameworkName, usePublicLanguage } from '../components/review/reportLang'
import { dur, ease, riseIn } from '../motion/tokens'

/**
 * Public, no-auth view of a published report, rendered outside the AppShell.
 *
 * The endpoint enforces token validity, the active flag, expiry, an optional
 * password (bcrypt-compared server-side) and is_draft = false, so draft data
 * never leaks. This page only displays fields the published-report shape
 * allows — no internal comments, no draft values, no private user data.
 */
interface PublicReportPayload {
  ok: true
  view_count: number
  password_protected: boolean
  report: {
    id: string
    framework_id: string
    /** Report language, when the API provides it (report_artifacts.locale). */
    locale?: string | null
    version: number
    published_at: string
    is_draft: boolean
    pdf_sha256: string
    page_count: number | null
    anchor_tip_hash: string | null
    anchored_at: string | null
    verification_token: string
    period_label: string
    period_year: number
    org_name: string
    published_by_name: string
    auditor_firm: string | null
    signed_by: string | null
    signed_at: string | null
    opinion_type: 'limited' | 'reasonable' | null
    isae_reference: string | null
    sections: Array<{
      gri_code: string
      line_item: string
      line_item_zh?: string | null
      value: number | null
      unit: string | null
      narrative_body: string | null
      response_type: string
    }>
  } | null
}

type Failure = { kind: 'gone' | 'notFound' | 'other'; message: string }

export default function PublicReport() {
  const { t } = useTranslation()
  const { token } = useParams<{ token: string }>()
  const [search] = useSearchParams()
  const [data, setData] = useState<PublicReportPayload | null>(null)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const { lang, setLang } = usePublicLanguage(data?.report?.locale ?? null)

  const load = async (p?: string) => {
    if (!token) return
    setLoading(true)
    setFailure(null)
    try {
      const u = new URL(`/api/org?view=public-report&token=${encodeURIComponent(token)}`, window.location.origin)
      if (p) u.searchParams.set('p', p)
      const res = await fetch(u.toString())
      const body = await res.json().catch(() => ({} as { error?: string; password_required?: boolean }))
      if (!res.ok) {
        if (body.password_required) {
          setNeedsPassword(true)
          setPasswordError(p ? t('publicReportPage.errors.invalidPassword') : null)
          return
        }
        setFailure({
          kind: res.status === 410 ? 'gone' : res.status === 404 ? 'notFound' : 'other',
          message: body.error ?? t('publicReportPage.errors.loadFailed'),
        })
        return
      }
      setData(body as PublicReportPayload)
      setNeedsPassword(false)
    } catch (e) {
      setFailure({ kind: 'other', message: e instanceof Error ? e.message : t('publicReportPage.errors.loadFailed') })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(search.get('p') ?? undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const chip = <><FileText className="w-3.5 h-3.5" /> {t('publicReportPage.chip')}</>

  if (loading && !data) {
    return (
      <PublicFrame chip={chip} lang={lang} onLangChange={setLang} width="lg">
        <div role="status" aria-busy="true" className="space-y-6">
          <span className="sr-only">{t('publicReportPage.loading')}</span>
          <Skeleton height={14} width={180} />
          <Skeleton height={48} width="70%" />
          <Skeleton height={16} width="50%" />
          <Skeleton height={320} rounded="lg" className="block mt-8" />
        </div>
      </PublicFrame>
    )
  }

  if (needsPassword) {
    return (
      <PublicFrame chip={chip} lang={lang} onLangChange={setLang} width="sm">
        <motion.form
          {...riseIn(0)}
          onSubmit={(e) => { e.preventDefault(); if (password) void load(password) }}
          className="surface-paper max-w-md mx-auto p-6 sm:p-8"
        >
          <span className="w-11 h-11 rounded-full inline-flex items-center justify-center bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]">
            <Lock className="w-5 h-5" />
          </span>
          <h1 className="type-h2 text-[var(--text-primary)] mt-4">{t('publicReportPage.password.title')}</h1>
          <p className="type-small text-[var(--text-secondary)] mt-1.5">{t('publicReportPage.password.body')}</p>
          <label className="block mt-5">
            <span className="sr-only">{t('publicReportPage.password.placeholder')}</span>
            <input
              autoFocus
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError(null) }}
              placeholder={t('publicReportPage.password.placeholder')}
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? 'pw-err' : undefined}
              className={`w-full h-11 px-3.5 rounded-[var(--radius-md)] border bg-[var(--bg-primary)] type-body text-[var(--text-primary)] outline-none ${passwordError ? 'border-[var(--status-danger)]' : 'border-[var(--border-default)] focus:border-[var(--border-focus)]'}`}
            />
          </label>
          {passwordError && <p id="pw-err" role="alert" className="text-caption text-[var(--status-danger)] mt-1.5">{passwordError}</p>}
          <button
            type="submit"
            disabled={!password || loading}
            className="mt-4 w-full h-11 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-bg-hover)] text-small font-semibold disabled:opacity-50"
          >
            {t('publicReportPage.password.submit')}
          </button>
        </motion.form>
      </PublicFrame>
    )
  }

  if (failure || !data?.report) {
    const gone = failure?.kind === 'gone'
    return (
      <PublicFrame chip={chip} lang={lang} onLangChange={setLang} width="sm">
        <div className="surface-paper">
          <EmptyState
            variant={failure?.kind === 'other' ? 'error' : 'empty'}
            art={failure?.kind === 'other' ? 'error' : 'offline'}
            title={gone ? t('publicReportPage.errors.goneTitle') : failure?.kind === 'other' ? t('publicReportPage.errors.title') : t('publicReportPage.unavailable')}
            body={gone ? t('publicReportPage.errors.goneBody') : failure?.kind === 'other' ? t('publicReportPage.errors.body') : t('publicReportPage.errors.notFoundBody')}
            detail={failure?.kind === 'other' ? failure.message : null}
            onRetry={failure?.kind === 'other' ? () => void load(password || undefined) : undefined}
          />
        </div>
      </PublicFrame>
    )
  }

  return (
    <PublicFrame chip={chip} lang={lang} onLangChange={setLang} width="lg">
      <ReportBody r={data.report} />
    </PublicFrame>
  )
}

function ReportBody({ r }: { r: NonNullable<PublicReportPayload['report']> }) {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const numeric = useMemo(() => r.sections.filter(s => s.response_type !== 'narrative' && s.value !== null), [r.sections])
  const narrative = useMemo(() => r.sections.filter(s => s.response_type === 'narrative' && s.narrative_body), [r.sections])
  const fw = frameworkName(r.framework_id, i18n.language)

  return (
    <article className="space-y-10">
      {/* Cover */}
      <motion.header {...riseIn(0)} className="pb-8 border-b border-[var(--border-default)]">
        <div className="text-small font-semibold text-[var(--color-brand-strong)]">{fw}</div>
        <h1 className="type-display-xl text-[var(--text-primary)] mt-3 text-balance break-words">{r.org_name}</h1>
        <p className="type-h3 font-normal text-[var(--text-secondary)] mt-3">
          {t('publicReportPage.reportTitle', { period: r.period_label })}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {r.signed_at
            ? <StatusPill tone="success" icon={<BadgeCheck />}>{t('publicReportPage.assuredBy', { firm: r.auditor_firm ?? t('publicReportPage.footer.auditor') })}</StatusPill>
            : <StatusPill tone="neutral">{t('publicReportPage.notAssured')}</StatusPill>}
          {r.anchor_tip_hash && <StatusPill tone="brand" icon={<ShieldCheck />}>{t('publicReportPage.anchored.pill')}</StatusPill>}
          <span className="text-small text-[var(--text-tertiary)] ml-1">
            {t('publicReportPage.meta', { version: r.version, date: f.date(r.published_at) })}
          </span>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="h-10 px-4 inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
          >
            <Printer className="w-4 h-4" /> {t('publicReportPage.print')}
          </button>
          <a
            href={`/verify/${r.verification_token}`}
            className="h-10 px-4 inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-bg-hover)] shadow-[var(--btn-primary-shadow)] text-small font-semibold"
          >
            <ShieldCheck className="w-4 h-4" /> {t('publicReportPage.verifyCta')}
          </a>
        </div>
      </motion.header>

      {numeric.length > 0 && (
        <Section title={t('publicReportPage.quantitative')} count={numeric.length}>
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="data-table min-w-[560px]">
              <thead>
                <tr>
                  <th className="w-[96px]">{t('publicReportPage.table.code')}</th>
                  <th>{t('publicReportPage.table.lineItem')}</th>
                  <th className="num">{t('publicReportPage.table.value')}</th>
                  <th className="w-[120px]">{t('publicReportPage.table.unit')}</th>
                </tr>
              </thead>
              <tbody>
                {numeric.map((s, i) => (
                  <tr key={i}>
                    <td className="font-mono text-caption whitespace-nowrap">{s.gri_code}</td>
                    <td className="text-[var(--text-primary)]">{itemLabel(s, i18n.language)}</td>
                    <td className="num font-semibold text-[var(--text-primary)]">{f.number(s.value)}</td>
                    <td className="text-[var(--text-tertiary)] whitespace-nowrap">{f.unit(s.unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {narrative.length > 0 && (
        <Section title={t('publicReportPage.narrative')} count={narrative.length}>
          <div className="space-y-8">
            {narrative.map((s, i) => (
              <div key={i} className="max-w-[70ch]">
                <div className="font-mono text-caption text-[var(--text-tertiary)]">{s.gri_code}</div>
                <h3 className="type-h3 text-[var(--text-primary)] mt-1">{itemLabel(s, i18n.language)}</h3>
                <p className="type-body text-[var(--text-secondary)] mt-2 whitespace-pre-line text-pretty">{s.narrative_body}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {numeric.length === 0 && narrative.length === 0 && (
        <EmptyState framed art="noData" title={t('publicReportPage.noSections')} body={t('publicReportPage.noSectionsBody')} />
      )}

      {/* Integrity */}
      <section aria-labelledby="integrity-h" className="surface-paper p-6 sm:p-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end break-inside-avoid">
        <div className="min-w-0">
          <h2 id="integrity-h" className="type-h3 text-[var(--text-primary)]">{t('publicReportPage.integrity.title')}</h2>
          <p className="type-small text-[var(--text-secondary)] mt-1.5 max-w-[62ch]">
            {r.anchor_tip_hash ? t('publicReportPage.anchored.body') : t('publicReportPage.integrity.notAnchored')}
          </p>
          <div className="mt-4 text-caption text-[var(--text-tertiary)]">SHA-256</div>
          <div className="font-mono text-caption text-[var(--text-primary)] break-all mt-0.5">{r.pdf_sha256}</div>
          {r.signed_at && (
            <p className="type-small text-[var(--text-secondary)] mt-4">
              {t('publicReportPage.footer.assuredBy', { firm: r.auditor_firm ?? t('publicReportPage.footer.auditor'), signer: r.signed_by, date: f.date(r.signed_at) })}
              {r.opinion_type ? t('publicReportPage.footer.opinionOpen', { opinion: t(`publicReportPage.opinion.${r.opinion_type}`) }) : ''}
              {r.isae_reference ? t('publicReportPage.footer.isaeClose', { reference: r.isae_reference }) : r.opinion_type ? t('publicReportPage.footer.close') : ''}
            </p>
          )}
          <p className="text-caption text-[var(--text-tertiary)] mt-4">
            {t('publicReportPage.footer.generated', { date: f.dateTime(r.published_at) })}
            {r.anchored_at && t('publicReportPage.footer.lastVerified', { date: f.dateTime(r.anchored_at) })}
            {' · '}{t('publicReportPage.footer.publishedByName', { name: r.published_by_name })}
          </p>
        </div>
        <a
          href={`/verify/${r.verification_token}`}
          className="h-10 px-4 inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] whitespace-nowrap print:hidden"
        >
          {t('publicReport.verifyBlockchain')} <ArrowUpRight className="w-4 h-4" />
        </a>
      </section>
    </article>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  const [open, setOpen] = useState(true)
  const { t } = useTranslation()
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 pb-3 mb-4 border-b border-[var(--border-subtle)] text-left print:pointer-events-none"
      >
        <span className="type-h2 text-[var(--text-primary)]">
          {title} <span className="text-[var(--text-tertiary)] font-normal tabular-nums">{count}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-small text-[var(--text-tertiary)] print:hidden">
          {open ? t('publicReportPage.hide') : t('publicReportPage.show')}
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: dur.fast, ease: ease.out }}><ChevronDown className="w-4 h-4" /></motion.span>
        </span>
      </button>
      {/* Collapsed sections still print. */}
      <div className={open ? '' : 'hidden print:block'}>{children}</div>
    </section>
  )
}
