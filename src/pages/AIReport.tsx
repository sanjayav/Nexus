import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, FileText, RefreshCw, Copy, Check, Lock, ShieldCheck, Eraser } from 'lucide-react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import PageHeader from '../components/PageHeader'
import { Button, Select } from '../design-system'
import { EmptyState, notify } from '../components/ui'
import { ai, isAiDisabledError, isUnconfiguredError, type AiDraftResponse } from '../lib/api'
import { useIntegrationStatus, integrationMissing } from '../lib/integrations'
import { useAuth } from '../auth/AuthContext'
import { hasPermission } from '../lib/rbac'
import { useFmt } from '../lib/fmt'
import useOrgMarket from '../components/analytics/useOrgMarket'
import { AiDisabledPanel, AiLabel, DraftBody, DraftProgress, StageSwap } from '../components/analytics/reports/AiDraft'

// Curated catalogue of sections the user can draft. `value` is sent to the AI
// backend (it is matched against questionnaire section names) and must stay
// English; `key` maps to the localised label (aiReport.sections.<key>).
const SECTIONS_BY_FRAMEWORK: Record<string, { value: string; key: string }[]> = {
  gri: [
    { value: 'GRI 302 Energy', key: 'gri302' },
    { value: 'GRI 303 Water', key: 'gri303' },
    { value: 'GRI 305 Emissions', key: 'gri305' },
    { value: 'GRI 306 Waste', key: 'gri306' },
    { value: 'GRI 401 Employment', key: 'gri401' },
    { value: 'GRI 403 Occupational Health', key: 'gri403' },
  ],
  csrd: [
    { value: 'ESRS E1 Climate Change', key: 'esrsE1' },
    { value: 'ESRS E2 Pollution', key: 'esrsE2' },
    { value: 'ESRS E3 Water', key: 'esrsE3' },
    { value: 'ESRS E5 Resource Use', key: 'esrsE5' },
    { value: 'ESRS S1 Own Workforce', key: 'esrsS1' },
    { value: 'ESRS G1 Business Conduct', key: 'esrsG1' },
  ],
  tcfd: [
    { value: 'TCFD Governance', key: 'tcfdGovernance' },
    { value: 'TCFD Strategy', key: 'tcfdStrategy' },
    { value: 'TCFD Risk Management', key: 'tcfdRisk' },
    { value: 'TCFD Metrics and Targets', key: 'tcfdMetrics' },
  ],
  cdp: [
    { value: 'CDP C1 Governance', key: 'cdpC1' },
    { value: 'CDP C2 Risks and Opportunities', key: 'cdpC2' },
    { value: 'CDP C6 Emissions Data', key: 'cdpC6' },
    { value: 'CDP C11 Carbon Pricing', key: 'cdpC11' },
  ],
  issb: [
    { value: 'IFRS S2 Governance', key: 'issbGovernance' },
    { value: 'IFRS S2 Strategy', key: 'issbStrategy' },
    { value: 'IFRS S2 Risk Management', key: 'issbRisk' },
    { value: 'IFRS S2 Metrics and Targets', key: 'issbMetrics' },
  ],
  // China pack — values match the SSE / HKEX questionnaire section names.
  'cn-sse': [
    { value: 'Climate — Governance', key: 'sseClimateGov' },
    { value: 'Climate — Strategy', key: 'sseClimateStrategy' },
    { value: 'Climate — Metrics and targets', key: 'sseClimateMetrics' },
    { value: 'Energy use', key: 'sseEnergy' },
    { value: 'Pollutant emissions', key: 'ssePollutants' },
    { value: 'Employees', key: 'sseEmployees' },
    { value: 'Anti-commercial bribery and anti-corruption', key: 'sseAntiBribery' },
  ],
  'hkex-esg': [
    { value: 'A1 Emissions', key: 'hkexA1' },
    { value: 'A2 Use of resources', key: 'hkexA2' },
    { value: 'B1 Employment', key: 'hkexB1' },
    { value: 'B2 Health and safety', key: 'hkexB2' },
    { value: 'B5 Supply chain management', key: 'hkexB5' },
    { value: 'B7 Anti-corruption', key: 'hkexB7' },
  ],
}

const GLOBAL_FRAMEWORKS = ['gri', 'csrd', 'tcfd', 'cdp', 'issb'] as const
const CN_FRAMEWORKS = ['cn-sse', 'hkex-esg'] as const
const TONES = ['formal', 'narrative', 'concise'] as const

type Phase = 'idle' | 'generating' | 'done' | 'error'
type Draft = AiDraftResponse & { at: number; framework: string; section: string; tone: string }

export default function AIReport() {
  const { t } = useTranslation()
  const f = useFmt()
  const { permissions } = useAuth()
  const market = useOrgMarket()
  const integrations = useIntegrationStatus()

  const showCn = market.cnSse || market.enabled.includes('hkex-esg')
  const frameworkIds = useMemo<string[]>(
    () =>
      showCn
        ? market.isCn
          ? [...CN_FRAMEWORKS, ...GLOBAL_FRAMEWORKS]
          : [...GLOBAL_FRAMEWORKS, ...CN_FRAMEWORKS]
        : [...GLOBAL_FRAMEWORKS],
    [showCn, market.isCn],
  )

  const [framework, setFramework] = useState<string>('gri')
  const [section, setSection] = useState<string>(SECTIONS_BY_FRAMEWORK.gri[0].value)
  const [tone, setTone] = useState<string>('formal')
  const touched = useRef(false)
  const docRef = useRef<HTMLElement>(null)

  // CN-market orgs start on the SSE guideline once settings arrive (unless the user already chose).
  useEffect(() => {
    if (market.loading || touched.current || !market.isCn) return
    setFramework('cn-sse')
    setSection(SECTIONS_BY_FRAMEWORK['cn-sse'][0].value)
  }, [market.loading, market.isCn])

  const [phase, setPhase] = useState<Phase>('idle')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [serverDisabled, setServerDisabled] = useState<'organisation' | 'deployment' | null>(null)
  const [copied, setCopied] = useState(false)
  const [reveal, setReveal] = useState(0)

  // Truthful availability: the org switch first, then deployment configuration.
  const orgAi = market.settings?.ai ?? null
  // An unreachable health check is unknown, not "missing" — the draft endpoint then answers truthfully.
  const deploymentMissing = orgAi ? !orgAi.configured : integrationMissing(integrations, 'ai')
  const disabledReason: 'organisation' | 'deployment' | null =
    serverDisabled ??
    (!market.loading && !market.aiEnabled
      ? market.aiDisabledReason ?? 'organisation'
      : !market.loading && deploymentMissing
        ? 'deployment'
        : null)
  const checking = market.loading || (!orgAi && integrations.loading)
  const providerLabel = orgAi?.provider_label || t('aiReport.provider.default')
  const canManage = hasPermission(permissions ?? [], 'admin.settings')

  const sectionOptions = SECTIONS_BY_FRAMEWORK[framework] ?? []
  const sectionLabel = (fw: string, value: string) => {
    const meta = (SECTIONS_BY_FRAMEWORK[fw] ?? []).find(o => o.value === value)
    return meta ? t(`aiReport.sections.${meta.key}`) : value
  }

  const onFrameworkChange = (next: string) => {
    touched.current = true
    setFramework(next)
    const first = SECTIONS_BY_FRAMEWORK[next]?.[0]?.value
    if (first) setSection(first)
  }

  const handleGenerate = async () => {
    if (disabledReason) return
    // Stacked layout (below lg): bring the document into view so progress is visible.
    setPhase('generating')
    if (window.matchMedia?.('(max-width: 1023px)').matches) {
      window.setTimeout(() => docRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 260)
    }
    setError(null)
    setCopied(false)
    try {
      const res = await ai.draft({ framework, section, tone })
      setDraft({ ...res, text: res.text ?? '', at: Date.now(), framework, section, tone })
      setReveal(n => n + 1)
      setPhase('done')
    } catch (e) {
      if (isAiDisabledError(e)) {
        setServerDisabled('organisation')
        setPhase('idle')
      } else if (isUnconfiguredError(e)) {
        setServerDisabled('deployment')
        setPhase('idle')
      } else {
        setError(e instanceof Error && e.message ? e.message : t('aiReport.errors.generateFailed'))
        setPhase('error')
      }
    }
  }

  const sanitizedHtml = useMemo(() => {
    if (!draft?.text) return ''
    const rawHtml = marked.parse(draft.text, { async: false }) as string
    return DOMPurify.sanitize(rawHtml)
  }, [draft?.text])

  const label = draft?.ai_label || t('aiReport.label.generated')
  const modelLine = [providerLabel, draft?.ai_model ?? orgAi?.model].filter(Boolean).join(' · ')

  // Copies always carry the AI label: the text may leave the platform.
  const writeClipboard = async (): Promise<boolean> => {
    if (!draft) return false
    try {
      await navigator.clipboard.writeText(`${draft.text.trim()}\n\n${t('aiReport.label.clipboard', { label, model: modelLine })}`)
      return true
    } catch {
      notify.error(t('aiReport.toast.copyFailed'))
      return false
    }
  }

  const handleCopy = async () => {
    if (!(await writeClipboard())) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
    notify.success(t('aiReport.toast.copied'))
  }

  // v2: POST to a real insertion endpoint once the report editor exposes one.
  // Until then the honest version: copy (with the label) and say where to paste.
  const handleInsert = async () => {
    if (!(await writeClipboard())) return
    notify.success(t('aiReport.toast.insertTitle'), { description: t('aiReport.toast.insertBody') })
  }

  const handleClear = () => {
    if (!draft) return
    const prev = draft
    setDraft(null)
    setPhase('idle')
    notify.message(t('aiReport.toast.cleared'), {
      undo: () => {
        setDraft(prev)
        setPhase('done')
      },
    })
  }

  const usageLine = useMemo(() => {
    const u = draft?.usage
    if (!u) return null
    const parts: string[] = []
    if (u.tokensIn != null) {
      parts.push(
        t('aiReport.usage.tokensIn', { n: f.number(u.tokensIn) }) +
          (u.cached ? t('aiReport.usage.cached', { n: f.number(u.cached) }) : ''),
      )
    }
    if (u.tokensOut != null) parts.push(t('aiReport.usage.out', { n: f.number(u.tokensOut) }))
    return parts.join(t('aiReport.usage.sep'))
  }, [draft?.usage, t, f])

  const busy = phase === 'generating'
  const showDraft = phase === 'done' && draft
  const docFramework = showDraft ? draft.framework : framework
  const docSection = showDraft ? draft.section : section
  const docTone = showDraft ? draft.tone : tone
  const locked = Boolean(disabledReason)
  const editorTo = `/disclosure-editor/${framework.startsWith('cn') || framework === 'hkex-esg' ? framework : 'gri'}`
  const stage = disabledReason ? 'disabled' : busy ? 'generating' : phase === 'error' ? 'error' : showDraft ? 'done' : 'idle'

  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader
        breadcrumbs={[{ label: t('aiReport.breadcrumb.reports'), to: '/reports' }, { label: t('aiReport.breadcrumb.here') }]}
        title={t('aiReport.title')}
        description={t('aiReport.subtitle')}
        actions={
          <div>
          <span className="nx-pill" data-tone={checking || locked ? 'neutral' : 'brand'} title={t('aiReport.provider.tooltip')}>
            <span className="nx-pill-dot" aria-hidden />
            {checking
              ? t('aiReport.provider.checking')
              : locked
                ? t('aiReport.provider.off')
                : t('aiReport.provider.on', { provider: providerLabel })}
          </span>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] items-start">
        {/* ── Brief ── */}
        <section aria-labelledby="ai-brief" className="surface-paper p-5 lg:sticky lg:top-4">
          <h2 id="ai-brief" className="type-h3 text-[var(--text-primary)]">
            {t('aiReport.brief.title')}
          </h2>
          <p className="text-caption text-[var(--text-tertiary)] mt-1">{t('aiReport.brief.body')}</p>
          <div className="mt-5 space-y-4">
            <Select
              label={t('aiReport.fields.framework')}
              value={framework}
              onChange={e => onFrameworkChange(e.target.value)}
              options={frameworkIds.map(id => ({ value: id, label: t(`aiReport.frameworks.${id}`) }))}
              disabled={busy || locked}
            />
            <Select
              label={t('aiReport.fields.section')}
              value={section}
              onChange={e => {
                touched.current = true
                setSection(e.target.value)
              }}
              options={sectionOptions.map(o => ({ value: o.value, label: t(`aiReport.sections.${o.key}`) }))}
              disabled={busy || locked || sectionOptions.length === 0}
            />
            <Select
              label={t('aiReport.fields.tone')}
              value={tone}
              onChange={e => setTone(e.target.value)}
              options={TONES.map(v => ({ value: v, label: t(`aiReport.tones.${v}`) }))}
              disabled={busy || locked}
            />
          </div>
          <Button
            className="mt-5"
            fullWidth
            size="lg"
            onClick={handleGenerate}
            disabled={busy || !section || locked || checking}
            loading={busy}
            icon={
              locked ? (
                <Lock className="w-4 h-4" />
              ) : !busy ? (
                draft ? <RefreshCw className="w-4 h-4" /> : <Play className="w-4 h-4" />
              ) : undefined
            }
          >
            {locked
              ? t('aiReport.buttons.unavailable')
              : busy
                ? t('aiReport.buttons.drafting')
                : draft
                  ? t('aiReport.buttons.regenerate')
                  : t('aiReport.buttons.draft')}
          </Button>
          <ul className="mt-5 pt-4 border-t border-[var(--border-subtle)] space-y-2.5 text-caption text-[var(--text-secondary)]">
            {(['anchored', 'gaps', 'labelled'] as const).map(k => (
              <li key={k} className="flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 mt-px flex-shrink-0 text-[var(--color-brand)]" aria-hidden />
                <span>{t(`aiReport.assurances.${k}`)}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Document ── */}
        <article ref={docRef} aria-labelledby="ai-doc-title" aria-busy={busy} className={`surface-paper overflow-hidden min-w-0 scroll-mt-4 ${locked ? 'order-first lg:order-none' : ''}`}>
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 sm:px-6 border-b border-[var(--border-subtle)]">
            <div className="min-w-0">
              <p className="text-caption text-[var(--text-tertiary)]">
                {t(`aiReport.frameworks.${docFramework}`)}
                {t('aiReport.usage.sep')}
                {t(`aiReport.tones.${docTone}`)}
              </p>
              <h2 id="ai-doc-title" className="type-h3 text-[var(--text-primary)] mt-0.5 truncate">
                {sectionLabel(docFramework, docSection)}
              </h2>
            </div>
            {stage === 'done' && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  icon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copied ? t('aiReport.buttons.copied') : t('aiReport.buttons.copy')}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClear} icon={<Eraser className="w-3.5 h-3.5" />}>
                  {t('aiReport.buttons.clear')}
                </Button>
                <Button size="sm" onClick={handleInsert} icon={<FileText className="w-3.5 h-3.5" />}>
                  {t('aiReport.buttons.insert')}
                </Button>
              </div>
            )}
          </header>

          <StageSwap k={stage}>
            {stage === 'disabled' && disabledReason && (
              <AiDisabledPanel reason={disabledReason} canManage={canManage} editorTo={editorTo} />
            )}

            {stage === 'generating' && (
              <DraftProgress section={sectionLabel(framework, section)} provider={providerLabel} />
            )}

            {stage === 'error' && (
              <EmptyState
                variant="error"
                title={t('aiReport.errors.draftFailed')}
                body={t('aiReport.errors.draftFailedBody')}
                detail={error}
                onRetry={handleGenerate}
              />
            )}

            {stage === 'idle' && (
              <EmptyState art="published" title={t('aiReport.empty.title')} body={t('aiReport.empty.body')} />
            )}

            {stage === 'done' && draft && (
              <div>
                <div className="px-5 pt-5 sm:px-10 sm:pt-7 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <AiLabel label={draft.ai_label} />
                  <span className="text-caption text-[var(--text-tertiary)]">
                    {t('aiReport.label.meta', { model: modelLine, time: f.dateTime(draft.at) })}
                  </span>
                </div>
                <div className="px-5 py-6 sm:px-10 sm:py-8">
                  {sanitizedHtml ? (
                    <DraftBody html={sanitizedHtml} revealKey={reveal} />
                  ) : (
                    <p className="type-body text-[var(--text-tertiary)]">{t('aiReport.emptyDraft')}</p>
                  )}
                </div>
                <footer className="px-5 py-3.5 sm:px-10 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-caption text-[var(--text-tertiary)]">
                  <span>{t('aiReport.label.review')}</span>
                  {usageLine && <span className="tabular-nums">{usageLine}</span>}
                </footer>
              </div>
            )}
          </StageSwap>
        </article>
      </div>
    </div>
  )
}
