import { useState, useMemo, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  Upload,
  ShieldCheck,
  GitBranch,
  Activity,
  Link2,
  Layers3,
  DatabaseZap,
  XCircle,
  Info,
  ChevronRight,
  TimerReset,
  UserCheck,
  FileText,
  Circle,
  ExternalLink,
  LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'
import { PageHeader, Card, CardHeader, Button, Badge, StatCard, EmptyState, Tone } from '../components/ui'
import { fmt, useFormat, useStrings } from '../i18n'
import { integrityTimelineStrings } from '../i18n/pages/integrityTimeline'
import { moduleIdOf, useFrameworkLabels } from '../i18n/pages/moduleCatalog'
import { useL10n, useMockData, useWorkspace } from '../workspace/WorkspaceContext'
import { useToast } from '../components/useToast'

type StageKey = 'upload' | 'validation' | 'dmaRoot' | 'draftSection' | 'griIndex' | 'ghgRoot' | 'rollup'

// `match` is the milestone name used in mockData (kept in English for lookup).
const STAGES: { key: StageKey; match: string; icon: LucideIcon }[] = [
  { key: 'upload', match: 'Upload', icon: Upload },
  { key: 'validation', match: 'Validation', icon: ShieldCheck },
  { key: 'dmaRoot', match: 'DMA.root', icon: GitBranch },
  { key: 'draftSection', match: 'DraftSection.root', icon: Layers3 },
  { key: 'griIndex', match: 'GRI.index.cid', icon: Link2 },
  { key: 'ghgRoot', match: 'GHG.root', icon: Activity },
  { key: 'rollup', match: 'Period Roll-up', icon: DatabaseZap },
]

const norm = (v: string) => v.toLowerCase().replace(/[.\s]/g, '')

const STATUS_PILL: Record<string, string> = {
  pending: 'bg-white text-zinc-600 ring-line hover:ring-zinc-300',
  in_review: 'bg-sky-50 text-sky-700 ring-sky-200/70 hover:ring-sky-300',
  anchored: 'bg-sky-50 text-sky-700 ring-sky-200/70 hover:ring-sky-300',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70 hover:ring-emerald-300',
  published: 'bg-zinc-900 text-white ring-zinc-900',
  failed: 'bg-rose-50 text-rose-700 ring-rose-200/70 hover:ring-rose-300',
}
const STATUS_TONE: Record<string, Tone> = {
  pending: 'neutral',
  in_review: 'info',
  anchored: 'info',
  approved: 'success',
  published: 'brand',
  failed: 'danger',
}
const STATUS_ICON: Record<string, LucideIcon> = {
  pending: Info,
  in_review: Clock,
  anchored: CheckCircle2,
  approved: CheckCircle2,
  published: CheckCircle2,
  failed: XCircle,
}

interface Milestone {
  name: string
  status: string
  date: string | null
}

interface ModuleData {
  /** Normalised module id. */
  module: string
  label: string
  milestones: Milestone[]
}

interface Selected extends Milestone {
  module: string
  label: string
}

type S = typeof integrityTimelineStrings.en

function Rail({ fromStatus, toStatus }: { fromStatus: string; toStatus: string | null | undefined }) {
  const done = ['anchored', 'approved', 'published'].includes(fromStatus)
  const failed = toStatus === 'failed'
  return (
    <div className="mx-1.5 h-0.5 w-5 shrink-0 rounded-full bg-zinc-200" aria-hidden>
      <div className={clsx('h-0.5 rounded-full', failed ? 'bg-rose-500' : done ? 'bg-emerald-500' : 'bg-zinc-300')} style={{ width: done ? '100%' : '30%' }} />
    </div>
  )
}

/** Known pipeline stage for a milestone name (data names are matched case/punctuation-insensitively). */
const stageOf = (name: string) => STAGES.find(st => norm(st.match) === norm(name))

function ModuleRow({ mod, s, milestoneLabel, onSelect }: { mod: ModuleData; s: S; milestoneLabel: (name: string) => string; onSelect: (sel: Selected) => void }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 py-4 first:pt-0 last:pb-0">
      <div className="md:w-44 shrink-0 min-w-0">
        <span className="block text-[13px] font-semibold text-zinc-900 leading-snug line-clamp-2" title={mod.label}>{mod.label}</span>
      </div>
      <div className="flex flex-wrap items-center gap-y-2 min-w-0">
        {mod.milestones.map((ms, idx) => {
          const status = ms.status || 'pending'
          const next = mod.milestones[idx + 1]
          const label = milestoneLabel(ms.name)
          const statusLabel = s.status[status] ?? status
          const StatusIcon = STATUS_ICON[status] || Info
          const Icon = stageOf(ms.name)?.icon ?? Circle
          return (
            <div key={`${ms.name}-${idx}`} className="flex items-center">
              <button
                type="button"
                onClick={() => onSelect({ ...ms, status, module: mod.module, label: mod.label })}
                title={fmt(s.stageTitle, { stage: label, status: statusLabel })}
                aria-label={fmt(s.stageTitle, { stage: label, status: statusLabel })}
                className={clsx(
                  'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium ring-1 ring-inset transition-shadow whitespace-nowrap',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900',
                  STATUS_PILL[status] || STATUS_PILL.pending,
                )}
              >
                <Icon className="h-3.5 w-3.5 opacity-80" />
                <span>{label}</span>
                <StatusIcon className="h-3 w-3 opacity-70" />
              </button>
              {next && <Rail fromStatus={status} toStatus={next.status} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DetailBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-zinc-500 mb-1.5">{label}</div>
      {children}
    </div>
  )
}

const monoBox = 'font-mono text-xs text-zinc-700 bg-zinc-50 px-3 py-2 rounded-lg border border-line break-all'

export default function IntegrityTimeline() {
  const s = useStrings(integrityTimelineStrings)
  const f = useFormat()
  const navigate = useNavigate()
  const fw = useFrameworkLabels()
  const l10n = useL10n()
  const mockData = useMockData()
  const { region } = useWorkspace()
  const { toast, show } = useToast()
  const { timelineMilestones } = mockData
  const [selected, setSelected] = useState<Selected | null>(null)
  const network = l10n(region.chain.network)

  useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  const moduleById = useMemo(() => new Map(mockData.modules.map(m => [m.id, m])), [mockData])

  // Rows follow the tenant's milestones, ordered by the region's framework list (unknown modules last).
  const modulesData: ModuleData[] = useMemo(() => {
    const order = (id: string) => {
      const i = region.frameworks.indexOf(id)
      return i === -1 ? Number.MAX_SAFE_INTEGER : i
    }
    return timelineMilestones
      .map(tm => {
        const id = moduleIdOf(tm.module)
        return { module: id, label: fw.title(id, moduleById.get(id)?.title ?? tm.module), milestones: tm.milestones }
      })
      .sort((a, b) => order(a.module) - order(b.module))
  }, [timelineMilestones, region.frameworks, fw, moduleById])

  const milestoneLabel = (name: string) => {
    const stage = stageOf(name)
    return stage ? s.stages[stage.key] : s.milestoneNames[name] ?? name
  }

  const all = modulesData.flatMap(m => m.milestones)
  const bottlenecks = [
    { icon: Clock, value: all.filter(m => m.status === 'in_review').length, label: s.bottlenecks.longReview },
    { icon: AlertTriangle, value: all.filter(m => m.status === 'failed').length, label: s.bottlenecks.failed },
    { icon: UserCheck, value: all.filter(m => m.status === 'pending').length, label: s.bottlenecks.awaiting },
  ]

  const legend = ['pending', 'in_review', 'anchored', 'approved', 'published', 'failed']

  // Proof details for the open drawer: tenant roll-up, module submission and linked evidence.
  const selModule = selected ? moduleById.get(selected.module) : undefined
  const selEvidence = selected ? mockData.evidence.filter(ev => ev.linkedModule && moduleIdOf(ev.linkedModule) === selected.module) : []
  const selAnchored = selected ? ['anchored', 'approved', 'published'].includes(selected.status) : false
  const txHash = mockData.rollup.txHash
  const explorerUrl = `${region.chain.explorer.replace(/\/$/, '')}/tx/${txHash}`

  return (
    <div className="space-y-6">
      {toast}
      <PageHeader
        title={s.title}
        description={fmt(s.description, { network })}
        actions={
          <>
            <Button icon={TimerReset} onClick={() => show(fmt(s.refreshed, { network }), 'info')}>{s.refresh}</Button>
            <Button variant="primary" iconRight={ChevronRight} onClick={() => navigate('/verify')}>{s.auditPack}</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {bottlenecks.map(b => (
          <StatCard key={b.label} icon={b.icon} label={b.label} value={f.number(b.value)} />
        ))}
      </div>

      <Card>
        <CardHeader
          title={s.moduleProgress}
          description={s.moduleProgressDesc}
          action={
            <Button size="sm" variant="ghost" iconRight={ChevronRight} onClick={() => navigate('/verify')} className="hidden sm:inline-flex">
              {s.openVerify}
            </Button>
          }
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5 text-xs text-zinc-500">
          {legend.map(st => (
            <span key={st} className="inline-flex items-center gap-1.5">
              <span className={clsx('w-2 h-2 rounded-full', {
                'bg-zinc-300': st === 'pending',
                'bg-sky-500': st === 'anchored' || st === 'in_review',
                'bg-emerald-500': st === 'approved',
                'bg-zinc-900': st === 'published',
                'bg-rose-500': st === 'failed',
              })} />
              {s.status[st]}
            </span>
          ))}
        </div>
        {modulesData.length === 0 ? (
          <EmptyState icon={Activity} title={s.emptyTitle} description={s.emptyDesc} />
        ) : (
          <div className="divide-y divide-line">
            {modulesData.map(m => (
              <ModuleRow key={m.module} mod={m} s={s} milestoneLabel={milestoneLabel} onSelect={setSelected} />
            ))}
          </div>
        )}
      </Card>

      <div className="sm:hidden">
        <Button className="w-full" iconRight={ChevronRight} onClick={() => navigate('/verify')}>{s.openVerify}</Button>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-zinc-900/30 backdrop-blur-[2px]" onClick={() => setSelected(null)}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={s.drawerTitle}
            className="w-full max-w-[460px] h-full bg-white border-l border-line overflow-y-auto shadow-pop animate-slide-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-line px-5 sm:px-6 h-14 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-zinc-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-zinc-500" />
                {s.drawerTitle}
              </h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label={s.close}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-line p-3.5">
                  <div className="text-xs font-medium text-zinc-500">{s.module}</div>
                  <div className="text-sm font-semibold text-zinc-900 mt-1 break-words">{selected.label}</div>
                </div>
                <div className="rounded-xl border border-line p-3.5">
                  <div className="text-xs font-medium text-zinc-500">{s.milestone}</div>
                  <div className="text-sm font-semibold text-zinc-900 mt-1 break-words">{milestoneLabel(selected.name)}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <DetailBlock label={s.statusLabel}>
                  <Badge tone={STATUS_TONE[selected.status] ?? 'neutral'} icon={STATUS_ICON[selected.status] || Info}>
                    {s.status[selected.status] ?? selected.status}
                  </Badge>
                </DetailBlock>
                {selected.date && (
                  <DetailBlock label={s.date}>
                    <div className="text-sm text-zinc-900 tabular">{f.date(selected.date)}</div>
                  </DetailBlock>
                )}
              </div>

              <div className="border-t border-line pt-5 space-y-4">
                <DetailBlock label={s.network}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-zinc-900">{network}</span>
                    <Badge>{l10n(region.chain.kind)}</Badge>
                  </div>
                </DetailBlock>
                <DetailBlock label={s.payloadCid}>
                  <div className={monoBox}>{selEvidence[0]?.cid ?? mockData.evidence[0]?.cid ?? s.notAvailable}</div>
                </DetailBlock>
                <DetailBlock label={s.merkleRoot}>
                  <div className={monoBox}>{mockData.rollup.root}</div>
                </DetailBlock>
                <DetailBlock label={s.txHash}>
                  {selAnchored ? (
                    <>
                      <div className={monoBox}>{txHash}</div>
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-emerald-700 hover:text-emerald-600 mt-2 inline-flex items-center gap-1"
                      >
                        {fmt(s.viewExplorer, { network })}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </>
                  ) : (
                    <Badge tone="warning" dot>{fmt(s.notAnchoredYet, { network })}</Badge>
                  )}
                </DetailBlock>
              </div>

              <DetailBlock label={s.actor}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-zinc-700 break-all">{selModule?.approver ?? mockData.rolesCredentials[0]?.did ?? s.notAvailable}</span>
                  <Badge tone="info">{s.approver}</Badge>
                </div>
              </DetailBlock>

              {selModule?.submissionId && (
                <DetailBlock label={s.submission}>
                  <div className={monoBox}>{selModule.submissionId}</div>
                </DetailBlock>
              )}

              <DetailBlock label={s.linkedEvidence}>
                {selEvidence.length === 0 ? (
                  <p className="text-[13px] text-zinc-500">{s.noEvidence}</p>
                ) : (
                  <div className="space-y-2">
                    {selEvidence.map(ev => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => navigate('/evidence')}
                        className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-line hover:border-zinc-300 hover:bg-zinc-50/60 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-mono font-medium text-zinc-900">{ev.id}</div>
                          <div className="text-xs font-mono text-zinc-500 mt-0.5 truncate">{ev.sha256}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </DetailBlock>
            </div>
          </aside>
        </div>
      )}

    </div>
  )
}
