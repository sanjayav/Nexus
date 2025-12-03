import React, { useState, useMemo } from 'react'
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
} from 'lucide-react'
import { mockData } from '../data/mockData'
import clsx from 'clsx'

const STAGES = [
  { key: 'upload', label: 'Upload', icon: Upload },
  { key: 'validation', label: 'Validation', icon: ShieldCheck },
  { key: 'dmaRoot', label: 'DMA.root', icon: GitBranch },
  { key: 'draftSection', label: 'DraftSection.root', icon: Layers3 },
  { key: 'griIndex', label: 'GRI.index.cid', icon: Link2 },
  { key: 'ghgRoot', label: 'GHG.root', icon: Activity },
  { key: 'rollup', label: 'Period Roll-up', icon: DatabaseZap },
]

const STATUS_STYLES = {
  pending: 'bg-slate-800 text-slate-300 ring-1 ring-slate-700',
  anchored: 'bg-blue-900/40 text-blue-200 ring-1 ring-blue-800',
  approved: 'bg-emerald-900/40 text-emerald-200 ring-1 ring-emerald-800',
  published: 'bg-indigo-900/40 text-indigo-200 ring-1 ring-indigo-800',
  failed: 'bg-rose-900/40 text-rose-200 ring-1 ring-rose-800',
}

const STATUS_ICON: Record<string, any> = {
  pending: Info,
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
  stageStatus: Record<string, string>
  milestones: Milestone[]
}

export default function IntegrityTimeline() {
  const { timelineMilestones } = mockData
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null)

  // Convert mockData format to new format
  const modulesData: ModuleData[] = useMemo(() => {
    return timelineMilestones.map((tm) => {
      const stageStatus: Record<string, string> = {}
      
      tm.milestones.forEach((m) => {
        const normalizedName = m.name.toLowerCase().replace(/[.\s]/g, '')
        const stageKey = STAGES.find((s) => 
          s.label.toLowerCase().replace(/[.\s]/g, '') === normalizedName
        )?.key
        
        if (stageKey) {
          stageStatus[stageKey] = m.status
        }
      })
      
      return {
        module: tm.module,
        stageStatus,
        milestones: tm.milestones,
      }
    })
  }, [timelineMilestones])

  const bottlenecks = useMemo(
    () => [
      { icon: Clock, value: 3, label: 'Items > 5 days in review', tone: 'amber' as const },
      { icon: AlertTriangle, value: 1, label: 'Failed validations', tone: 'rose' as const },
      { icon: UserCheck, value: 5, label: 'Awaiting approver', tone: 'indigo' as const },
    ],
    []
  )

  const MetricCard = ({
    icon: Icon,
    value,
    label,
    tone = 'slate',
  }: {
    icon: any
    value: number
    label: string
    tone?: 'slate' | 'amber' | 'rose' | 'indigo' | 'emerald'
  }) => {
    const toneMap = {
      slate: 'bg-slate-900/50 border-slate-800 text-slate-200',
      amber: 'bg-amber-900/30 border-amber-800 text-amber-100',
      rose: 'bg-rose-900/30 border-rose-800 text-rose-100',
      indigo: 'bg-indigo-900/30 border-indigo-800 text-indigo-100',
      emerald: 'bg-emerald-900/30 border-emerald-800 text-emerald-100',
    }
    return (
      <div className={`flex items-center gap-4 rounded-2xl border p-4 ${toneMap[tone]}`}>
        <div className="rounded-xl bg-black/20 p-3">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="text-xl font-semibold leading-tight">{value}</div>
          <div className="text-sm opacity-80">{label}</div>
        </div>
      </div>
    )
  }

  const Pill = ({
    label,
    status,
    icon: Icon,
    onClick,
  }: {
    label: string
    status: string
    icon: any
    onClick?: () => void
  }) => {
    const IconCmp = STATUS_ICON[status] || Info
    return (
      <button
        onClick={onClick}
        className={`group inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all hover:scale-105 ${
          STATUS_STYLES[status as keyof typeof STATUS_STYLES] || STATUS_STYLES.pending
        }`}
        title={`${label} — ${status}`}
      >
        <Icon className="h-4 w-4 opacity-90" />
        <span>{label}</span>
        <IconCmp className="ml-1 h-3.5 w-3.5 opacity-70" />
      </button>
    )
  }

  const Rail = ({ fromStatus, toStatus }: { fromStatus: string; toStatus: string | null }) => {
    const done = ['anchored', 'approved', 'published'].includes(fromStatus)
    const failed = toStatus === 'failed'
    return (
      <div className="mx-3 h-0.5 w-8 flex-shrink-0 rounded-full bg-slate-700">
        <div
          className={`h-0.5 rounded-full transition-all ${
            failed ? 'bg-rose-500' : done ? 'bg-emerald-500' : 'bg-slate-600'
          }`}
          style={{ width: done ? '100%' : '30%' }}
        />
      </div>
    )
  }

  const ModuleRow = ({ mod }: { mod: ModuleData }) => {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="w-16 shrink-0 rounded-xl bg-slate-800 p-3 text-center text-slate-200 font-semibold">
          {mod.module}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {STAGES.map((s, idx) => {
            const status = mod.stageStatus[s.key] ?? 'pending'
            const nextStatus = STAGES[idx + 1] ? mod.stageStatus[STAGES[idx + 1].key] : null
            const milestone = mod.milestones.find((m) => 
              m.name.toLowerCase().replace(/[.\s]/g, '') === s.label.toLowerCase().replace(/[.\s]/g, '')
            )
            
            return (
              <div key={s.key} className="flex items-center py-1">
                <Pill
                  label={s.label}
                  status={status}
                  icon={s.icon}
                  onClick={() =>
                    milestone &&
                    setSelectedMilestone({
                      ...milestone,
                      module: mod.module,
                      stageName: s.label,
                    })
                  }
                />
                {idx < STAGES.length - 1 && <Rail fromStatus={status} toStatus={nextStatus} />}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Integrity Timeline</h1>
          <p className="text-sm text-gray-400">
            Track module progress, anchors, and approvals with on-chain confidence
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors">
          Generate Audit Pack <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Bottlenecks */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {bottlenecks.map((b) => (
          <MetricCard key={b.label} icon={b.icon} value={b.value} label={b.label} tone={b.tone} />
        ))}
      </div>

      {/* Module Progress */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Module Progress</h2>
          <div className="text-xs text-slate-400">
            Legend: Pending • Anchored • Approved • Published • Failed
          </div>
        </div>
        <div className="space-y-3">
          {modulesData.map((m) => (
            <ModuleRow key={m.module} mod={m} />
          ))}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-slate-200 hover:border-slate-600 transition-colors">
          Refresh <TimerReset className="ml-2 inline h-4 w-4" />
        </button>
        <button className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-slate-200 hover:border-slate-600 transition-colors">
          Open Verification Center <ChevronRight className="ml-2 inline h-4 w-4" />
        </button>
      </div>

      {/* Right Drawer (modal overlay when milestone selected) */}
      {selectedMilestone && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-end"
          onClick={() => setSelectedMilestone(null)}
        >
          <div
            className="w-[500px] h-full bg-slate-950 border-l border-slate-800 overflow-y-auto p-6 animate-slide-in shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-accent" />
                Milestone Details
              </h2>
              <button
                onClick={() => setSelectedMilestone(null)}
                className="p-2 rounded-lg hover:bg-slate-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="text-sm text-slate-400 mb-1">Module</div>
                <div className="text-lg font-semibold">{selectedMilestone.module}</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="text-sm text-slate-400 mb-1">Milestone</div>
                <div className="text-lg font-semibold">
                  {selectedMilestone.stageName || selectedMilestone.name}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-400 mb-2">Status</div>
                <div
                  className={clsx(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
                    STATUS_STYLES[
                      selectedMilestone.status as keyof typeof STATUS_STYLES
                    ] || STATUS_STYLES.pending
                  )}
                >
                  {React.createElement(
                    STATUS_ICON[selectedMilestone.status] || Info,
                    { className: 'w-4 h-4' }
                  )}
                  {selectedMilestone.status}
                </div>
              </div>

              {selectedMilestone.date && (
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <div className="text-sm text-slate-400 mb-1">Date</div>
                  <div className="text-base font-mono">{selectedMilestone.date}</div>
                </div>
              )}

              <div className="border-t border-slate-800 pt-6">
                <div className="text-sm text-slate-400 mb-2">Payload CID</div>
                <div className="font-mono text-sm bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 break-all">
                  bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-400 mb-2">Merkle Root</div>
                <div className="font-mono text-sm bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
                  0xB2C3D4E5F67890A1B2C3D4E5F67890A1B2C3D4...7D
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-400 mb-2">Transaction Hash</div>
                <div className="font-mono text-sm bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 break-all">
                  0x1234567890abcdef1234567890abcdef12345678...
                </div>
                <button className="text-xs text-emerald-400 hover:text-emerald-300 mt-2 flex items-center gap-1">
                  View on explorer
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-blue-900/20 border border-blue-800/30">
                <div className="text-sm text-slate-400 mb-2">Actor</div>
                <div className="flex items-center gap-2">
                  <div className="font-mono text-sm">did:ethr:0x1234...5678</div>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 border border-blue-500/30 text-blue-300">
                    Approver
                  </span>
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-400 mb-2">Previous Submission</div>
                <div className="font-mono text-sm bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
                  SUB-2024-{Math.floor(Math.random() * 100).toString().padStart(3, '0')}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-400 mb-3">Linked Evidence</div>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-700 transition-colors">
                    <div className="text-xs font-mono text-emerald-400">EV-2024-001</div>
                    <div className="text-xs text-slate-400 mt-1">emissions_data.xlsx</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-700 transition-colors">
                    <div className="text-xs font-mono text-emerald-400">EV-2024-002</div>
                    <div className="text-xs text-slate-400 mt-1">verification_report.json</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

