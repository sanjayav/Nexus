import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bot,
  Play,
  Shield,
  FileText,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  Download,
  Copy,
  Check,
  Zap,
  Database,
  Lock,
  Clock,
  ChevronDown,
} from 'lucide-react'
import { aiReportText, kpiSummary, formatEmissions } from '../data/pttgcData'
import { Badge, Button } from '../design-system'

function stagger(i: number) { return `stagger-${Math.min(i + 1, 10)}` }

export default function AIReport() {
  const navigate = useNavigate()
  const [generating, setGenerating] = useState(false)
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showSources, setShowSources] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleGenerate = () => {
    setGenerating(true)
    setDisplayedText('')
    setIsComplete(false)
    setShowSources(false)

    let charIndex = 0
    intervalRef.current = setInterval(() => {
      charIndex += 3
      if (charIndex >= aiReportText.length) {
        charIndex = aiReportText.length
        if (intervalRef.current) clearInterval(intervalRef.current)
        setIsComplete(true)
        setGenerating(false)
      }
      setDisplayedText(aiReportText.slice(0, charIndex))
    }, 8)
  }

  const handleReset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setGenerating(false)
    setDisplayedText('')
    setIsComplete(false)
    setShowSources(false)
    setCopied(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(aiReportText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    if (scrollRef.current && generating) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [displayedText, generating])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const dataSources = [
    { source: 'Scope 1 Emissions — Q1 2026 (2.12M tCO\u2082e)', hash: '0x3e7f1a...b8c2d4', block: 21345438, status: 'verified' as const },
    { source: 'Scope 2 Emissions — Q1 2026 (945K tCO\u2082e)', hash: '0x4f8e2a...d1c3b5', block: 21344756, status: 'verified' as const },
    { source: 'Scope 3 Emissions — Q1 2026 (2.51M tCO\u2082e)', hash: '0x7e3b1d...a9c2f5', block: 21340456, status: 'pending' as const },
    { source: 'Historical Baseline (2019–2025 Assured)', hash: '0x4c8d2f...b6e3a1', block: 21339987, status: 'verified' as const },
    { source: 'SBTi Target Trajectory (2026: 15.28M)', hash: '0x5a9c2d...f4e8b1', block: 21338345, status: 'verified' as const },
  ]

  const kpis = [
    { label: 'Total Emissions', value: formatEmissions(kpiSummary.totalEmissions), sub: 'tCO\u2082e (Q1 2026)', color: '#0F7B6F' },
    { label: 'YoY Change', value: `${kpiSummary.yoyChange}%`, sub: 'vs Q1 2025', color: '#16A34A' },
    { label: 'Data Points', value: kpiSummary.dataPointsVerified.toLocaleString(), sub: 'verified records', color: '#2563EB' },
    { label: 'Intensity', value: String(kpiSummary.intensity), sub: 'tCO\u2082e / ton product', color: '#7C3AED' },
  ]

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-8 animate-fade-in">
        {/* Gradient mesh */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ background: 'radial-gradient(ellipse at 20% 50%, #7C3AED 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #0F7B6F 0%, transparent 50%)' }} />
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #7C3AED, #0F7B6F, transparent)' }} />

        <div className="relative flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Back nav */}
            <button
              onClick={() => navigate('/reports')}
              className="mt-1 w-9 h-9 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center animate-float" style={{ backgroundColor: 'color-mix(in srgb, #7C3AED 12%, transparent)' }}>
                  <Bot className="w-5 h-5" style={{ color: '#7C3AED' }} />
                </div>
                <Badge variant="purple">AI-Powered</Badge>
              </div>
              <h1 className="font-display text-[var(--text-3xl)] font-bold text-[var(--text-primary)] tracking-tight">AI Report Generation</h1>
              <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] mt-1 max-w-xl leading-relaxed">
                Generate AI-drafted narrative summaries from verified emissions data. References actual data, highlights trends, and flags areas needing attention.
              </p>
            </div>
          </div>

          {/* Floating sparkles decoration */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center animate-float" style={{ backgroundColor: 'color-mix(in srgb, #7C3AED 8%, transparent)', animationDelay: '0.5s' }}>
              <Sparkles className="w-5 h-5" style={{ color: '#7C3AED', opacity: 0.5 }} />
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center animate-float" style={{ backgroundColor: 'color-mix(in srgb, #0F7B6F 8%, transparent)', animationDelay: '1s' }}>
              <Zap className="w-4 h-4" style={{ color: '#0F7B6F', opacity: 0.4 }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Context Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((item, idx) => (
          <div
            key={item.label}
            className={`relative overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-4 transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-[1px] animate-slide-up ${stagger(idx)}`}
          >
            <div className="absolute top-0 left-0 w-[3px] h-full rounded-r-full" style={{ backgroundColor: item.color }} />
            <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] ml-2">{item.label}</p>
            <p className="text-[var(--text-xl)] font-bold font-display mt-1 ml-2 tabular-nums" style={{ color: item.color }}>{item.value}</p>
            <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] ml-2">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Main Generation Panel ── */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden animate-slide-up stagger-5" style={{ boxShadow: 'var(--shadow-card)' }}>
        {/* Header bar */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, #7C3AED 10%, transparent)' }}>
              <FileText className="w-5 h-5" style={{ color: '#7C3AED' }} />
            </div>
            <div>
              <h2 className="text-[var(--text-base)] font-semibold font-display text-[var(--text-primary)]">Q1 2026 Emissions Summary</h2>
              <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">AI-drafted narrative from verified data sources</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isComplete && (
              <>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all duration-200"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[var(--accent-green)]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all duration-200">
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
              </>
            )}
            {(displayedText || generating) && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all duration-200"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
            <Button
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Content area */}
        <div className="p-6">
          {displayedText ? (
            <div
              ref={scrollRef}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-6 max-h-[520px] overflow-y-auto"
            >
              {/* Typing indicator */}
              {generating && (
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border-subtle)]">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-purple)] animate-pulse-soft" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-purple)] animate-pulse-soft" style={{ animationDelay: '0.2s' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-purple)] animate-pulse-soft" style={{ animationDelay: '0.4s' }} />
                  </div>
                  <span className="text-[var(--text-xs)] text-[var(--accent-purple)] font-medium">Nexus AI is writing...</span>
                </div>
              )}

              <div className="prose prose-sm max-w-none">
                {displayedText.split('\n').map((line, i) => {
                  if (line.startsWith('## ')) {
                    return <h2 key={i} className="text-[var(--text-lg)] font-display font-bold text-[var(--text-primary)] mt-5 mb-2">{line.replace('## ', '')}</h2>
                  }
                  if (line.startsWith('### ')) {
                    return (
                      <h3 key={i} className="text-[var(--text-sm)] font-display font-bold text-[var(--text-secondary)] mt-4 mb-1.5 flex items-center gap-2">
                        <span className="w-1 h-4 rounded-full bg-[var(--accent-purple)]" />
                        {line.replace('### ', '')}
                      </h3>
                    )
                  }
                  if (line.startsWith('- ')) {
                    return (
                      <div key={i} className="flex items-start gap-2.5 ml-3 mb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: 'var(--accent-teal)' }} />
                        <span className="text-[var(--text-sm)] text-[var(--text-secondary)] leading-relaxed">{renderBold(line.replace('- ', ''))}</span>
                      </div>
                    )
                  }
                  if (line.startsWith('---')) {
                    return <hr key={i} className="my-4 border-[var(--border-subtle)]" />
                  }
                  if (line.startsWith('*')) {
                    return <p key={i} className="text-[var(--text-xs)] text-[var(--text-tertiary)] italic mt-3">{line.replace(/\*/g, '')}</p>
                  }
                  if (line.trim() === '') return <div key={i} className="h-2" />
                  return <p key={i} className="text-[var(--text-sm)] text-[var(--text-secondary)] leading-relaxed mb-1.5">{renderBold(line)}</p>
                })}
                {generating && <span className="inline-block w-[2px] h-[18px] bg-[var(--accent-purple)] animate-pulse ml-0.5 -mb-0.5 rounded-full" />}
              </div>

              {/* Completion badge */}
              {isComplete && (
                <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between animate-fade-in">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[var(--accent-green-light)] flex items-center justify-center animate-check">
                      <Check className="w-3.5 h-3.5 text-[var(--accent-green)]" />
                    </div>
                    <span className="text-[var(--text-xs)] font-medium text-[var(--accent-green)]">Report generated successfully</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--text-tertiary)]">
                    <Clock className="w-3 h-3" />
                    <span>{Math.ceil(aiReportText.length / 3 * 8 / 1000)}s generation time</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Empty state */
            <div className="border border-dashed border-[var(--border-strong)] rounded-xl p-12 text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center animate-float" style={{ backgroundColor: 'color-mix(in srgb, #7C3AED 8%, transparent)' }}>
                <Sparkles className="w-7 h-7" style={{ color: '#7C3AED', opacity: 0.5 }} />
              </div>
              <h3 className="text-[var(--text-base)] font-semibold font-display text-[var(--text-primary)] mb-1">Ready to Generate</h3>
              <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] max-w-md mx-auto">
                Click "Generate Report" to create an AI-drafted emissions summary from your verified data.
              </p>
              <div className="flex items-center justify-center gap-4 mt-5">
                {[
                  { icon: Database, label: '847 data points' },
                  { icon: Shield, label: 'Blockchain-verified' },
                  { icon: Lock, label: 'Audit-ready' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--text-tertiary)]">
                    <item.icon className="w-3 h-3" />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Data Sources Panel ── */}
      {isComplete && (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden animate-slide-up" style={{ boxShadow: 'var(--shadow-card)' }}>
          <button
            onClick={() => setShowSources(!showSources)}
            className="w-full flex items-center justify-between p-5 hover:bg-[var(--bg-hover)] transition-colors duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, #0F7B6F 10%, transparent)' }}>
                <Shield className="w-4 h-4 text-[var(--accent-teal)]" />
              </div>
              <div className="text-left">
                <h3 className="text-[var(--text-sm)] font-semibold font-display text-[var(--text-primary)]">Referenced Data Sources</h3>
                <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">{dataSources.length} blockchain-anchored records</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="green">{dataSources.filter(d => d.status === 'verified').length} Verified</Badge>
              <ChevronDown className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform duration-300 ${showSources ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {showSources && (
            <div className="border-t border-[var(--border-subtle)] animate-expand">
              <div className="p-4 space-y-1">
                {dataSources.map((item, idx) => (
                  <div
                    key={item.source}
                    className={`flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[var(--bg-hover)] transition-all duration-200 animate-slide-up ${stagger(idx)}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: item.status === 'verified' ? 'var(--accent-green-light)' : 'var(--accent-amber-light)' }}>
                        {item.status === 'verified'
                          ? <Shield className="w-3 h-3 text-[var(--accent-green)]" />
                          : <Clock className="w-3 h-3 text-[var(--accent-amber)]" />
                        }
                      </div>
                      <span className="text-[var(--text-sm)] text-[var(--text-secondary)]">{item.source}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[var(--text-xs)] font-mono text-[var(--accent-teal)]">{item.hash}</span>
                      <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] tabular-nums">Block #{item.block.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── How it Works Footer ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-slide-up stagger-6">
        {[
          { step: '01', title: 'Data Aggregation', desc: 'All verified emissions data from Q1 2026 is aggregated from calculators, ingestion modules, and blockchain-anchored records.', icon: Database, color: '#0F7B6F' },
          { step: '02', title: 'AI Analysis', desc: 'Nexus AI analyzes trends, compares against targets, and identifies anomalies. Context from historical data informs the narrative.', icon: Bot, color: '#7C3AED' },
          { step: '03', title: 'Report Output', desc: 'A draft narrative is generated with inline data references. Ready for review, editing, and inclusion in formal reports.', icon: FileText, color: '#2563EB' },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.step} className="group relative overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-[1px] cursor-default">
              <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[var(--text-2xl)] font-bold tabular-nums" style={{ color: `color-mix(in srgb, ${s.color} 30%, transparent)` }}>{s.step}</span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: `color-mix(in srgb, ${s.color} 10%, transparent)` }}>
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
              </div>
              <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mb-1">{s.title}</h3>
              <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] leading-relaxed">{s.desc}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function renderBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-[var(--text-primary)]">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}
