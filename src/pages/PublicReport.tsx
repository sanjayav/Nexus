import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, ShieldCheck, FileText, Lock, AlertTriangle, Printer, ExternalLink } from 'lucide-react'
import { itemLabel } from '../lib/itemLabel'

/**
 * Public, no-auth view of a published report. Rendered OUTSIDE the AppShell.
 *
 * The endpoint enforces:
 *   · token validity + active flag
 *   · expiry
 *   · optional password (bcrypt-compared server-side)
 *   · is_draft = false (so unpublished/draft data never leaks)
 *
 * This page only displays fields the published-report shape allows — no
 * internal comments, no draft values, no user-private data.
 */
interface PublicReportPayload {
  ok: true
  view_count: number
  password_protected: boolean
  report: {
    id: string
    framework_id: string
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

export default function PublicReport() {
  const { t, i18n } = useTranslation()
  const zh = i18n.language?.startsWith('zh')
  // Keep the browser default for English; force zh-CN dates when Chinese.
  const locale = zh ? 'zh-CN' : undefined
  const { token } = useParams<{ token: string }>()
  const [search] = useSearchParams()
  const [data, setData] = useState<PublicReportPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async (p?: string) => {
    if (!token) return
    setLoading(true); setError(null)
    try {
      const u = new URL(`/api/org?view=public-report&token=${encodeURIComponent(token)}`, window.location.origin)
      if (p) u.searchParams.set('p', p)
      const res = await fetch(u.toString())
      const body = await res.json().catch(() => ({} as { error?: string; password_required?: boolean }))
      if (!res.ok) {
        if (body.password_required) { setNeedsPassword(true); setError(p ? t('publicReportPage.errors.invalidPassword') : null); setLoading(false); return }
        setError(body.error ?? t('publicReportPage.errors.loadFailed')); setLoading(false); return
      }
      setData(body as PublicReportPayload)
      setNeedsPassword(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('publicReportPage.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const p = search.get('p') ?? undefined
    void load(p)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--text-secondary)]">
        {t('publicReportPage.loading')}
      </div>
    )
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <form
          onSubmit={(e) => { e.preventDefault(); void load(password) }}
          className="max-w-sm w-full surface-paper p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-[var(--text-primary)]">
            <Lock className="w-5 h-5" />
            <h1 className="font-display text-[18px] font-semibold">{t('publicReportPage.password.title')}</h1>
          </div>
          <p className="text-[13px] text-[var(--text-secondary)]">
            {t('publicReportPage.password.body')}
          </p>
          {error && <div className="text-[12px] text-[var(--accent-red)]">{error}</div>}
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('publicReportPage.password.placeholder')}
            className="w-full px-3 py-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] text-[14px]"
          />
          <button type="submit" className="w-full chip chip-active">{t('publicReportPage.password.submit')}</button>
        </form>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full surface-paper p-6 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 mx-auto text-[var(--accent-amber)]" />
          <h1 className="font-display text-[18px] font-semibold text-[var(--text-primary)]">{t('publicReportPage.errors.title')}</h1>
          <p className="text-[13px] text-[var(--text-secondary)]">{error}</p>
        </div>
      </div>
    )
  }

  const r = data?.report
  if (!r) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--text-secondary)]">
        {t('publicReportPage.unavailable')}
      </div>
    )
  }

  const numericSections = r.sections.filter(s => s.response_type !== 'narrative' && s.value !== null)
  const narrativeSections = r.sections.filter(s => s.response_type === 'narrative' && s.narrative_body)

  return (
    <div className="min-h-screen bg-[var(--bg-app)] print:bg-white">
      {/* Brand strip */}
      <header
        className="border-b border-[var(--border-subtle)] bg-white print:border-b print:border-black"
      >
        <div className="max-w-[960px] mx-auto px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span
              className="w-8 h-8 rounded-md flex items-center justify-center text-white"
              style={{ background: 'linear-gradient(135deg, #10B981, #047857)' }}
            >
              <ShieldCheck className="w-4 h-4" />
            </span>
            <div>
              <div className="text-micro uppercase tracking-[0.06em] font-bold text-[var(--text-tertiary)]">
                {t('publicReport.header')}
              </div>
              <div className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
                {r.org_name}
              </div>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="chip inline-flex items-center gap-1.5 print:hidden"
          >
            <Printer className="w-3.5 h-3.5" /> {t('publicReportPage.print')}
          </button>
        </div>
      </header>

      <main className="max-w-[960px] mx-auto px-6 py-8 space-y-8">
        {/* Title + period + framework */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 chip chip-active">
              <FileText className="w-3 h-3" /> {r.framework_id.toUpperCase()}
            </span>
            <span className="chip">{r.period_label} · {r.period_year}</span>
            <span className="chip">v{r.version}</span>
            {r.signed_at && <span className="chip inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {t('publicReportPage.assured')}</span>}
          </div>
          <h1 className="font-display text-[28px] font-bold text-[var(--text-primary)]">
            {t('publicReportPage.reportTitle', { org: r.org_name })}
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)]">
            {t('publicReportPage.meta', {
              period: r.period_label,
              year: r.period_year,
              framework: r.framework_id.toUpperCase(),
              date: new Date(r.published_at).toLocaleDateString(locale),
            })}
          </p>
        </section>

        {/* Disclosure sections */}
        {numericSections.length > 0 && (
          <Accordion title={t('publicReportPage.quantitative')} defaultOpen>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-micro uppercase tracking-[0.06em] text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
                  <th className="py-2 pr-4">{t('publicReportPage.table.code')}</th>
                  <th className="py-2 pr-4">{t('publicReportPage.table.lineItem')}</th>
                  <th className="py-2 pr-4 text-right">{t('publicReportPage.table.value')}</th>
                  <th className="py-2 pr-4">{t('publicReportPage.table.unit')}</th>
                </tr>
              </thead>
              <tbody>
                {numericSections.map((s, i) => (
                  <tr key={i} className="border-b border-[var(--border-subtle)]">
                    <td className="py-2 pr-4 font-mono text-[12px]">{s.gri_code}</td>
                    <td className="py-2 pr-4 text-[var(--text-primary)]">{itemLabel(s, i18n.language)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums font-semibold">
                      {typeof s.value === 'number' ? s.value.toLocaleString(locale) : '—'}
                    </td>
                    <td className="py-2 pr-4 text-[var(--text-tertiary)]">{s.unit ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Accordion>
        )}

        {narrativeSections.length > 0 && (
          <Accordion title={t('publicReportPage.narrative')} defaultOpen>
            <div className="space-y-4">
              {narrativeSections.map((s, i) => (
                <div key={i}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-mono text-caption text-[var(--text-tertiary)]">{s.gri_code}</span>
                    <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">{itemLabel(s, i18n.language)}</h3>
                  </div>
                  <p className="text-[13px] text-[var(--text-secondary)] whitespace-pre-line">
                    {s.narrative_body}
                  </p>
                </div>
              ))}
            </div>
          </Accordion>
        )}

        {/* Verify on blockchain */}
        {r.anchor_tip_hash && (
          <section className="surface-paper p-4 text-[13px]">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-[var(--color-brand)]" />
              <span className="font-semibold text-[var(--text-primary)]">{t('publicReportPage.anchored.title')}</span>
            </div>
            <p className="text-[var(--text-secondary)]">
              {t('publicReportPage.anchored.body')}{' '}
              <a
                href={`/verify/${r.verification_token}`}
                className="inline-flex items-center gap-0.5 text-[var(--color-brand)] hover:underline"
              >
                {t('publicReport.verifyBlockchain')} <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </section>
        )}

        {/* Footer */}
        <footer className="border-t border-[var(--border-subtle)] pt-4 text-[12px] text-[var(--text-tertiary)] space-y-1">
          <div>
            {t('publicReportPage.footer.generated', { date: new Date(r.published_at).toLocaleString(locale) })}
            {r.anchored_at && t('publicReportPage.footer.lastVerified', { date: new Date(r.anchored_at).toLocaleString(locale) })}
          </div>
          {r.signed_at && (
            <div>
              {t('publicReportPage.footer.assuredBy', {
                firm: r.auditor_firm ?? t('publicReportPage.footer.auditor'),
                signer: r.signed_by,
                date: new Date(r.signed_at).toLocaleDateString(locale),
              })}
              {r.opinion_type ? t('publicReportPage.footer.opinionOpen', { opinion: t(`publicReportPage.opinion.${r.opinion_type}`) }) : ''}
              {r.isae_reference ? t('publicReportPage.footer.isaeClose', { reference: r.isae_reference }) : r.opinion_type ? t('publicReportPage.footer.close') : ''}
            </div>
          )}
          <div>{t('publicReportPage.footer.publishedBy', { name: r.published_by_name, hash: r.pdf_sha256.slice(0, 16) })}</div>
          <div className="text-micro uppercase tracking-[0.06em] text-[var(--text-tertiary)] pt-1">{t('publicReportPage.footer.poweredBy')}</div>
        </footer>
      </main>
    </div>
  )
}

function Accordion({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <section className="surface-paper">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 print:cursor-default"
        aria-expanded={open}
      >
        <span className="font-display text-[15px] font-semibold text-[var(--text-primary)]">{title}</span>
        <span className="text-[12px] text-[var(--text-tertiary)] print:hidden">{open ? t('publicReportPage.hide') : t('publicReportPage.show')}</span>
      </button>
      {(open || true) && (
        <div className={`px-5 pb-5 ${open ? '' : 'hidden print:block'}`}>{children}</div>
      )}
    </section>
  )
}
