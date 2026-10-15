import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bot,
  Play,
  FileText,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  Copy,
  Check,
  Zap,
  Database,
  Lock,
  Shield,
  AlertCircle,
} from 'lucide-react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { Badge, Button, Select } from '../design-system'
import { ai, isUnconfiguredError } from '../lib/api'
import { useIntegrationStatus } from '../lib/integrations'

// Curated catalogue of sections the user can draft. v1 hard-coded list; once
// the questionnaire tree endpoint surfaces section labels this could load
// dynamically from /api/org?view=tree.
const SECTIONS_BY_FRAMEWORK: Record<string, { value: string; label: string }[]> = {
  gri: [
    { value: 'GRI 302 Energy', label: 'GRI 302 — Energy' },
    { value: 'GRI 303 Water', label: 'GRI 303 — Water & Effluents' },
    { value: 'GRI 305 Emissions', label: 'GRI 305 — Emissions' },
    { value: 'GRI 306 Waste', label: 'GRI 306 — Waste' },
    { value: 'GRI 401 Employment', label: 'GRI 401 — Employment' },
    { value: 'GRI 403 Occupational Health', label: 'GRI 403 — Occupational H&S' },
  ],
  csrd: [
    { value: 'ESRS E1 Climate Change', label: 'ESRS E1 — Climate Change' },
    { value: 'ESRS E2 Pollution', label: 'ESRS E2 — Pollution' },
    { value: 'ESRS E3 Water', label: 'ESRS E3 — Water & Marine Resources' },
    { value: 'ESRS E5 Resource Use', label: 'ESRS E5 — Circular Economy' },
    { value: 'ESRS S1 Own Workforce', label: 'ESRS S1 — Own Workforce' },
    { value: 'ESRS G1 Business Conduct', label: 'ESRS G1 — Business Conduct' },
  ],
  tcfd: [
    { value: 'TCFD Governance', label: 'TCFD — Governance' },
    { value: 'TCFD Strategy', label: 'TCFD — Strategy' },
    { value: 'TCFD Risk Management', label: 'TCFD — Risk Management' },
    { value: 'TCFD Metrics and Targets', label: 'TCFD — Metrics & Targets' },
  ],
  cdp: [
    { value: 'CDP C1 Governance', label: 'CDP C1 — Governance' },
    { value: 'CDP C2 Risks and Opportunities', label: 'CDP C2 — Risks & Opportunities' },
    { value: 'CDP C6 Emissions Data', label: 'CDP C6 — Emissions Data' },
    { value: 'CDP C11 Carbon Pricing', label: 'CDP C11 — Carbon Pricing' },
  ],
  issb: [
    { value: 'IFRS S2 Governance', label: 'IFRS S2 — Governance' },
    { value: 'IFRS S2 Strategy', label: 'IFRS S2 — Strategy' },
    { value: 'IFRS S2 Risk Management', label: 'IFRS S2 — Risk Management' },
    { value: 'IFRS S2 Metrics and Targets', label: 'IFRS S2 — Metrics & Targets' },
  ],
}

const FRAMEWORK_OPTIONS = [
  { value: 'gri', label: 'GRI' },
  { value: 'csrd', label: 'CSRD / ESRS' },
  { value: 'tcfd', label: 'TCFD' },
  { value: 'cdp', label: 'CDP' },
  { value: 'issb', label: 'ISSB IFRS S2' },
]

const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal' },
  { value: 'narrative', label: 'Narrative' },
  { value: 'concise', label: 'Concise' },
]

interface UsageStats {
  tokensIn?: number
  tokensOut?: number
  cached?: number
}

export default function AIReport() {
  const navigate = useNavigate()
  const integrations = useIntegrationStatus()
  const aiReady = integrations.ai
  const aiUnavailable = !integrations.loading && !aiReady
  const [framework, setFramework] = useState<string>('gri')
  const [section, setSection] = useState<string>(SECTIONS_BY_FRAMEWORK.gri[0].value)
  const [tone, setTone] = useState<string>('formal')
  const [generating, setGenerating] = useState(false)
  const [draftText, setDraftText] = useState('')
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorIsUnconfigured, setErrorIsUnconfigured] = useState(false)
  const [copied, setCopied] = useState(false)
  const [inserted, setInserted] = useState(false)

  const sectionOptions = SECTIONS_BY_FRAMEWORK[framework] ?? []

  // Update section when framework changes so we never end up with a stale label.
  const onFrameworkChange = (next: string) => {
    setFramework(next)
    const first = SECTIONS_BY_FRAMEWORK[next]?.[0]?.value
    if (first) setSection(first)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    setErrorIsUnconfigured(false)
    setDraftText('')
    setUsage(null)
    setInserted(false)
    try {
      const res = await ai.draft({ framework, section, tone })
      setDraftText(res.text ?? '')
      setUsage(res.usage ?? null)
    } catch (e) {
      if (isUnconfiguredError(e)) {
        setErrorIsUnconfigured(true)
        setError('AI is not configured in this environment. Ask an admin to set ANTHROPIC_API_KEY in Vercel.')
      } else {
        const msg = e instanceof Error ? e.message : 'Failed to generate draft'
        setError(msg)
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleReset = () => {
    setDraftText('')
    setUsage(null)
    setError(null)
    setErrorIsUnconfigured(false)
    setCopied(false)
    setInserted(false)
  }

  const handleCopy = async () => {
    if (!draftText) return
    await navigator.clipboard.writeText(draftText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // v2: POST to a real insertion endpoint once it exists. For now, copy to
  // clipboard and surface a confirmation so the demo is honest.
  const handleInsert = async () => {
    if (!draftText) return
    // TODO(v2): wire to /api/reports/{id}/sections once the report editor lands.
    await navigator.clipboard.writeText(draftText)
    setInserted(true)
    setTimeout(() => setInserted(false), 2500)
  }

  const sanitizedHtml = useMemo(() => {
    if (!draftText) return ''
    const rawHtml = marked.parse(draftText, { async: false }) as string
    return DOMPurify.sanitize(rawHtml)
  }, [draftText])

  const usageLine = useMemo(() => {
    if (!usage) return null
    const parts: string[] = []
    if (usage.tokensIn != null) {
      const cached = usage.cached ?? 0
      parts.push(`${usage.tokensIn.toLocaleString()} tokens in${cached ? ` (${cached.toLocaleString()} cached)` : ''}`)
    }
    if (usage.tokensOut != null) parts.push(`${usage.tokensOut.toLocaleString()} out`)
    return parts.join(' · ')
  }, [usage])

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">
      {/* AI unavailable banner — shown when the deployment has no Anthropic
          key configured. We render it ABOVE the hero so users see the gate
          before they spend time configuring the framework/section dropdowns. */}
      {aiUnavailable && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 flex items-start gap-3" role="status">
          <Sparkles className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-[var(--text-sm)] font-semibold text-amber-300">AI features disabled</div>
            <div className="text-[var(--text-xs)] text-amber-300/80 mt-1 leading-relaxed">
              Set <code className="font-mono">ANTHROPIC_API_KEY</code> in your Vercel environment to enable
              AI report drafting, evidence extraction, vendor → EF matching, and anomaly narration.
            </div>
          </div>
        </div>
      )}

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-8 animate-fade-in">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            background:
              'radial-gradient(ellipse at 20% 50%, #7C3AED 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #0F7B6F 0%, transparent 50%)',
          }}
        />
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, #7C3AED, #0F7B6F, transparent)' }}
        />

        <div className="relative flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate('/reports')}
              className="mt-1 w-9 h-9 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center animate-float"
                  style={{ backgroundColor: 'color-mix(in srgb, #7C3AED 12%, transparent)' }}
                >
                  <Bot className="w-5 h-5" style={{ color: '#7C3AED' }} />
                </div>
                <Badge variant="purple">Claude Sonnet 4.6</Badge>
              </div>
              <h1 className="font-display text-[var(--text-3xl)] font-bold text-[var(--text-primary)] tracking-tight">
                AI Report Drafting
              </h1>
              <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] mt-1 max-w-xl leading-relaxed">
                Draft framework-aligned narrative from your verified disclosure data. Anchored to your
                approved values — missing inputs are flagged, never invented.
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center animate-float"
              style={{ backgroundColor: 'color-mix(in srgb, #7C3AED 8%, transparent)', animationDelay: '0.5s' }}
            >
              <Sparkles className="w-5 h-5" style={{ color: '#7C3AED', opacity: 0.5 }} />
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center animate-float"
              style={{ backgroundColor: 'color-mix(in srgb, #0F7B6F 8%, transparent)', animationDelay: '1s' }}
            >
              <Zap className="w-4 h-4" style={{ color: '#0F7B6F', opacity: 0.4 }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Configuration ── */}
      <div
        className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 animate-slide-up"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Framework"
            value={framework}
            onChange={(e) => onFrameworkChange(e.target.value)}
            options={FRAMEWORK_OPTIONS}
            disabled={generating}
          />
          <Select
            label="Section"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            options={sectionOptions}
            disabled={generating || sectionOptions.length === 0}
          />
          <Select
            label="Tone"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            options={TONE_OPTIONS}
            disabled={generating}
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[var(--text-xs)] text-[var(--text-tertiary)]">
            <Shield className="w-3.5 h-3.5" />
            <span>Grounded in approved data values for the current reporting year</span>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating || !section || aiUnavailable || integrations.loading}
            loading={generating}
            icon={
              aiUnavailable ? <Lock className="w-4 h-4" /> :
              !generating ? <Play className="w-4 h-4" /> : undefined
            }
            title={aiUnavailable ? 'AI is not configured. Ask an admin to set ANTHROPIC_API_KEY.' : undefined}
            aria-label={aiUnavailable ? 'AI is not configured. Ask an admin to set ANTHROPIC_API_KEY.' : undefined}
          >
            {aiUnavailable ? 'AI unavailable' : generating ? 'Drafting...' : 'Draft with AI'}
          </Button>
        </div>
      </div>

      {/* ── Result Panel ── */}
      <div
        className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden animate-slide-up stagger-2"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, #7C3AED 10%, transparent)' }}
            >
              <FileText className="w-5 h-5" style={{ color: '#7C3AED' }} />
            </div>
            <div>
              <h2 className="text-[var(--text-base)] font-semibold font-display text-[var(--text-primary)]">
                {section || 'Draft preview'}
              </h2>
              <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">
                {framework.toUpperCase()} · {tone}
              </p>
            </div>
          </div>
          {draftText && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all duration-200"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-[var(--accent-green)]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all duration-200 disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all duration-200"
              >
                Clear
              </button>
              <Button onClick={handleInsert} size="md">
                {inserted ? (
                  <>
                    <Check className="w-4 h-4" /> Inserted
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" /> Insert into Report
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="p-6">
          {error && (
            <div
              className={
                'mb-4 flex items-start gap-3 rounded-xl border p-4 ' +
                (errorIsUnconfigured
                  ? 'border-amber-400/30 bg-amber-400/5'
                  : 'border-[var(--accent-red)]/30 bg-[var(--accent-red-light)]')
              }
              role="alert"
            >
              {errorIsUnconfigured ? (
                <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[var(--accent-red)] mt-0.5 flex-shrink-0" />
              )}
              <div className={errorIsUnconfigured ? 'text-[var(--text-sm)] text-amber-300' : 'text-[var(--text-sm)] text-[var(--accent-red)]'}>
                <p className="font-semibold">{errorIsUnconfigured ? 'AI is not configured' : 'Draft failed'}</p>
                <p className="text-[var(--text-xs)] opacity-90 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {draftText ? (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-6 max-h-[640px] overflow-y-auto">
              <div
                className="prose prose-sm max-w-none ai-draft-prose text-[var(--text-secondary)]"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              />
              {usageLine && (
                <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-[var(--text-xs)] text-[var(--text-tertiary)]">
                  <span className="font-mono tabular-nums">{usageLine}</span>
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-[var(--accent-purple)]" />
                    claude-sonnet-4-6
                  </span>
                </div>
              )}
            </div>
          ) : (
            !generating && !error && (
              <div className="border border-dashed border-[var(--border-strong)] rounded-xl p-12 text-center">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center animate-float"
                  style={{ backgroundColor: 'color-mix(in srgb, #7C3AED 8%, transparent)' }}
                >
                  <Sparkles className="w-7 h-7" style={{ color: '#7C3AED', opacity: 0.5 }} />
                </div>
                <h3 className="text-[var(--text-base)] font-semibold font-display text-[var(--text-primary)] mb-1">
                  Ready to draft
                </h3>
                <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] max-w-md mx-auto">
                  Pick a framework and section, then click <span className="font-medium">Draft with AI</span> to
                  generate an audit-ready narrative from your approved data.
                </p>
                <div className="flex items-center justify-center gap-4 mt-5">
                  {[
                    { icon: Database, label: 'Anchored in your data' },
                    { icon: Shield, label: 'Framework-aligned' },
                    { icon: Lock, label: 'No hallucinated numbers' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--text-tertiary)]"
                    >
                      <item.icon className="w-3 h-3" />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {generating && !draftText && (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-purple)] animate-pulse-soft" />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[var(--accent-purple)] animate-pulse-soft"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[var(--accent-purple)] animate-pulse-soft"
                    style={{ animationDelay: '0.4s' }}
                  />
                </div>
                <span className="text-[var(--text-xs)] text-[var(--accent-purple)] font-medium">
                  Claude is drafting...
                </span>
              </div>
              <div className="space-y-2">
                <div className="h-3 rounded bg-[var(--bg-tertiary)] w-3/4 animate-pulse" />
                <div className="h-3 rounded bg-[var(--bg-tertiary)] w-5/6 animate-pulse" />
                <div className="h-3 rounded bg-[var(--bg-tertiary)] w-2/3 animate-pulse" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
