import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, FileText, Database, Zap, MessageSquare, Server, ArrowRight, Copy, X, Loader2, Info } from 'lucide-react'
import { Badge, Button, Card, CardHeader, PageHeader } from '../components/ui'
import { fmt, useStrings } from '../i18n'
import { aiStudioStrings } from '../i18n/pages/aiStudio'
import { useWorkspace, useL10n } from '../workspace/WorkspaceContext'
import { useToast } from '../components/useToast'

const aiFeatures = [
  { id: 'draft', icon: FileText, status: 'beta' },
  { id: 'extract', icon: Database, status: 'coming' },
  { id: 'map', icon: Zap, status: 'coming' },
  { id: 'chat', icon: MessageSquare, status: 'coming' },
] as const

/** Framework names used in the templated draft, per region. */
const FRAMEWORKS = {
  global: { en: 'GRI, IFRS S1/S2 and BRSR Core', zh: 'GRI、IFRS S1/S2 及 BRSR Core' },
  cn: { en: 'the SSE sustainability reporting guideline, the HKEX ESG Code and CSDS', zh: '上交所可持续发展报告指引、港交所 ESG 守则及 CSDS' },
}

export default function AIStudio() {
  const { workspace } = useWorkspace()
  return <AIStudioView key={workspace.id} />
}

function AIStudioView() {
  const s = useStrings(aiStudioStrings)
  const l10n = useL10n()
  const { workspace, region } = useWorkspace()
  const isCn = region.id === 'cn'
  const { toast, show } = useToast()
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)
  const timer = useRef<number>()

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const examples = isCn ? s.examplesCn : s.examplesGlobal
  const params = { workspace: l10n(workspace.name), frameworks: l10n(FRAMEWORKS[region.id]), year: workspace.reportingYear }

  const generate = () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setDraft(null)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setGenerating(false)
      setDraft(prompt.trim())
    }, 1100)
  }

  const draftText = draft
    ? [fmt(s.outputIntro, { prompt: draft }), ...s.outputSections.map(sec => `${sec.h}\n${fmt(sec.p, params)}`)].join('\n\n')
    : ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draftText)
      show(s.copied)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={s.title} description={s.description} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        <div className="space-y-4">
          <Card>
            <CardHeader title={s.draftTitle} description={s.draftDesc} icon={Sparkles} />
            <label htmlFor="ai-prompt" className="block text-[13px] font-medium text-zinc-700 mb-1.5">{s.promptLabel}</label>
            <textarea
              id="ai-prompt"
              placeholder={isCn ? s.placeholderCn : s.placeholder}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate() }}
              className="w-full h-32 px-3 py-2.5 rounded-[10px] bg-white border border-line text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500/60"
            />
            <div className="mt-3">
              <div className="text-xs font-medium text-zinc-500 mb-2">{s.examples}</div>
              <div className="flex flex-wrap gap-1.5">
                {examples.map(ex => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setPrompt(ex)}
                    className="text-left text-xs leading-snug text-zinc-700 bg-zinc-50 border border-line rounded-lg px-2.5 py-1.5 hover:border-zinc-300 hover:bg-white transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
            <Button
              variant="primary"
              icon={generating ? Loader2 : Sparkles}
              className={generating ? 'mt-4 w-full [&_svg]:animate-spin' : 'mt-4 w-full'}
              disabled={!prompt.trim() || generating}
              onClick={generate}
            >
              {generating ? s.generating : s.generate}
            </Button>
          </Card>

          {draft && (
            <Card className="animate-fade-up">
              <CardHeader
                title={s.outputTitle}
                icon={FileText}
                action={
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" icon={Copy} onClick={copy}>{s.copy}</Button>
                    <Button size="sm" variant="ghost" icon={X} onClick={() => setDraft(null)}>{s.clear}</Button>
                  </div>
                }
              />
              <div className="flex items-start gap-2 rounded-lg bg-amber-50/70 border border-amber-200/70 px-3 py-2 text-xs text-amber-900 mb-4">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
                {s.outputNote}
              </div>
              <p className="text-[13px] text-zinc-500 mb-3">{fmt(s.outputIntro, { prompt: draft })}</p>
              <div className="space-y-3">
                {s.outputSections.map(sec => (
                  <div key={sec.h}>
                    <h4 className="text-sm font-semibold text-zinc-900">{sec.h}</h4>
                    <p className="text-sm text-zinc-700 leading-relaxed mt-0.5">{fmt(sec.p, params)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          <Card>
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0">
                <Server className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[15px] font-semibold text-zinc-900">{s.endpointTitle}</h3>
                  <Badge tone="info">{s.endpointStatus}</Badge>
                </div>
                <p className="text-[13px] text-zinc-500 mt-1 leading-relaxed">
                  {fmt(isCn ? s.endpointCn : s.endpointGlobal, { residency: `${l10n(region.hosting.provider)} · ${l10n(region.hosting.residency)}` })}
                </p>
                <Link to="/admin" className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-zinc-700 hover:text-zinc-900">
                  {s.endpointManage} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </Card>

          <h2 className="text-[13px] font-medium text-zinc-500 px-1 pt-2">{s.capabilities}</h2>
          {aiFeatures.map(feat => (
            <Card key={feat.id} className="hover:border-zinc-300 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0">
                  <feat.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-zinc-900">{s.features[feat.id].name}</h3>
                    <Badge tone={feat.status === 'beta' ? 'warning' : 'neutral'}>{s.statusLabel[feat.status]}</Badge>
                  </div>
                  <p className="text-[13px] text-zinc-500 mt-1 leading-relaxed">
                    {feat.id === 'draft' && isCn ? s.draftDescCn : s.features[feat.id].desc}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      {toast}
    </div>
  )
}
