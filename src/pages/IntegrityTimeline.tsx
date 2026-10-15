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
  LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'
import { mockData } from '../data/mockData'
import { PageHeader, Card, CardHeader, Button, Badge, StatCard, Tone } from '../components/ui'
import { fmt, useFormat, useStrings } from '../i18n'
import { integrityTimelineStrings } from '../i18n/pages/integrityTimeline'

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
  module: string
  stageStatus: Partial<Record<StageKey, string>>
  milestones: Milestone[]
}

interface Selected extends Milestone {
  module: string
  stageKey: StageKey
  prevSubmission: string
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

function ModuleRow({ mod, s, onSelect }: { mod: ModuleData; s: S; onSelect: (sel: Selected) => void }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 py-4 first:pt-0 last:pb-0">
      <div className="md:w-28 shrink-0">
        <span className="inline-flex text-[13px] font-semibold text-zinc-900">{mod.module}</span>
      </div>
      <div className="flex flex-wrap items-center gap-y-2 min-w-0">
        {STAGES.map((st, idx) => {
          const status = mod.stageStatus[st.key] ?? 'pending'
          const nextStatus = STAGES[idx + 1] ? mod.stageStatus[STAGES[idx + 1].key] : null
          const milestone = mod.milestones.find(m => norm(m.name) === norm(st.match))
          const label = s.stages[st.key]
          const statusLabel = s.status[status] ?? status
          const StatusIcon = STATUS_ICON[status] || Info
          const Icon = st.icon
          return (
            <div key={st.key} className="flex items-center">
              <button
                type="button"
                disabled={!milestone}
                onClick={() =>
                  milestone &&
                  onSelect({
                    ...milestone,
                    module: mod.module,
                    stageKey: st.key,
                    prevSubmission: `SUB-2024-${Math.floor(Math.random() * 100).toString().padStart(3, '0')}`,
                  })
                }
                title={fmt(s.stageTitle, { stage: label, status: statusLabel })}
                aria-label={fmt(s.stageTitle, { stage: label, status: statusLabel })}
                className={clsx(
                  'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium ring-1 ring-inset transition-shadow whitespace-nowrap',
                  'disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900',
                  STATUS_PILL[status] || STATUS_PILL.pending,
                )}
              >
                <Icon className="h-3.5 w-3.5 opacity-80" />
                <span>{label}</span>
                <StatusIcon className="h-3 w-3 opacity-70" />
              </button>
              {idx < STAGES.length - 1 && <Rail fromStatus={status} toStatus={nextStatus} />}
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
  const { timelineMilestones } = mockData
  const [selected, setSelected] = useState<Selected | null>(null)

  useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  const modulesData: ModuleData[] = useMemo(
    () =>
      timelineMilestones.map(tm => {
        const stageStatus: ModuleData['stageStatus'] = {}
        tm.milestones.forEach(m => {
          const stage = STAGES.find(st => norm(st.match) === norm(m.name))
          if (stage) stageStatus[stage.key] = m.status
        })
        return { module: tm.module, stageStatus, milestones: tm.milestones }
      }),
    [timelineMilestones],
  )

  const bottlenecks = [
    { icon: Clock, value: 3, label: s.bottlenecks.longReview },
    { icon: AlertTriangle, value: 1, label: s.bottlenecks.failed },
    { icon: UserCheck, value: 5, label: s.bottlenecks.awaiting },
  ]

  const legend = ['pending', 'anchored', 'approved', 'published', 'failed']

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.title}
        description={s.description}
        actions={
          <>
            <Button icon={TimerReset}>{s.refresh}</Button>
            <Button variant="primary" iconRight={ChevronRight}>{s.auditPack}</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {bottlenecks.map(b => (
          <StatCard key={b.label} icon={b.icon} label={b.label} value={b.value} />
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
                'bg-sky-500': st === 'anchored',
                'bg-emerald-500': st === 'approved',
                'bg-zinc-900': st === 'published',
                'bg-rose-500': st === 'failed',
              })} />
              {s.status[st]}
            </span>
          ))}
        </div>
        <div className="divide-y divide-line">
          {modulesData.map(m => (
            <ModuleRow key={m.module} mod={m} s={s} onSelect={setSelected} />
          ))}
        </div>
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
                  <div className="text-sm font-semibold text-zinc-900 mt-1">{selected.module}</div>
                </div>
                <div className="rounded-xl border border-line p-3.5">
                  <div className="text-xs font-medium text-zinc-500">{s.milestone}</div>
                  <div className="text-sm font-semibold text-zinc-900 mt-1">{s.stages[selected.stageKey] || selected.name}</div>
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
                <DetailBlock label={s.payloadCid}>
                  <div className={monoBox}>bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi</div>
                </DetailBlock>
                <DetailBlock label={s.merkleRoot}>
                  <div className={monoBox}>0xB2C3D4E5F67890A1B2C3D4E5F67890A1B2C3D4...7D</div>
                </DetailBlock>
                <DetailBlock label={s.txHash}>
                  <div className={monoBox}>0x1234567890abcdef1234567890abcdef12345678...</div>
                  <button type="button" className="text-xs font-medium text-emerald-700 hover:text-emerald-600 mt-2 inline-flex items-center gap-0.5">
                    {s.viewExplorer}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </DetailBlock>
              </div>

              <DetailBlock label={s.actor}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-zinc-700">did:ethr:0x1234...5678</span>
                  <Badge tone="info">{s.approver}</Badge>
                </div>
              </DetailBlock>

              <DetailBlock label={s.prevSubmission}>
                <div className={monoBox}>{selected.prevSubmission}</div>
              </DetailBlock>

              <DetailBlock label={s.linkedEvidence}>
                <div className="space-y-2">
                  {[
                    { id: 'EV-2024-001', file: 'emissions_data.xlsx' },
                    { id: 'EV-2024-002', file: 'verification_report.json' },
                  ].map(ev => (
                    <div key={ev.id} className="flex items-center gap-3 p-3 rounded-xl border border-line hover:border-zinc-300 hover:bg-zinc-50/60 transition-colors">
                      <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-mono font-medium text-zinc-900">{ev.id}</div>
                        <div className="text-xs text-zinc-500 mt-0.5 truncate">{ev.file}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </DetailBlock>
            </div>
          </aside>
        </div>
      )}

      <style>{`
        @keyframes slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in { animation: slide-in 0.25s cubic-bezier(0.32, 0.72, 0, 1); }
        @media (prefers-reduced-motion: reduce) { .animate-slide-in { animation: none; } }
      `}</style>
    </div>
  )
}
