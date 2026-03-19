import { useState } from 'react'
import { Settings2, ChevronRight, Clock, UserPlus, Bell, Mail } from 'lucide-react'
import clsx from 'clsx'

const approvalChains = [
  { id: '1', name: 'GRI / MSX', steps: ['Analyst → Reviewer → Approver'], sla: '5 days', active: true },
  { id: '2', name: 'BRSR Core', steps: ['CSO → Company Secretary → Board'], sla: '7 days', active: true },
  { id: '3', name: 'IFRS S1/S2', steps: ['Sustainability → CFO → Audit'], sla: '10 days', active: true },
  { id: '4', name: 'CSRD ESRS', steps: ['EU Lead → Legal → Board'], sla: '14 days', active: false },
]

export default function WorkflowConfig() {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-black tracking-tight">Workflow Configuration</h1>
        <p className="text-sm text-black/60 mt-2 font-medium tracking-wide">
          Configurable approval chains, SLAs, and notifications per framework.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
          <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 border-b border-black/5 pb-4">Approval Chains</h3>
          <div className="space-y-3">
            {approvalChains.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(selected === c.id ? null : c.id)}
                className={clsx(
                  "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left",
                  selected === c.id ? "bg-black/5 border-black/20" : "bg-white/40 border-white hover:border-black/10"
                )}
              >
                <Settings2 className="w-5 h-5 text-black/50" />
                <div className="flex-1">
                  <p className="font-bold text-black">{c.name}</p>
                  <p className="text-xs text-black/50 mt-0.5">{c.steps[0]}</p>
                </div>
                <span className={clsx("px-2.5 py-1 rounded-full text-[10px] font-bold border", c.active ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-black/5 text-black/50 border-black/10")}>{c.active ? 'Active' : 'Draft'}</span>
                <span className="text-xs font-bold text-black/40 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> SLA: {c.sla}</span>
                <ChevronRight className="w-5 h-5 text-black/30" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
            <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-4 border-b border-black/5 pb-3">Notifications</h3>
            <div className="space-y-4">
              {[
                { icon: Mail, label: 'Email on submission', enabled: true },
                { icon: Bell, label: 'Slack on approval request', enabled: true },
                { icon: UserPlus, label: 'Reminder at 50% SLA', enabled: true },
                { icon: Clock, label: 'Escalation at 100% SLA', enabled: true },
              ].map((n) => (
                <div key={n.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <n.icon className="w-5 h-5 text-black/50" />
                    <span className="text-sm font-medium text-black">{n.label}</span>
                  </div>
                  <button className={clsx("w-12 h-6 rounded-full transition-colors", n.enabled ? "bg-black" : "bg-black/20")}>
                    <div className={clsx("w-5 h-5 rounded-full bg-white shadow transition-transform", n.enabled && "translate-x-6")} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#12C87A]/10 border border-[#12C87A]/20 rounded-[2rem] p-6 shadow-lg">
            <h3 className="text-sm font-bold text-[#013328] mb-2">Add Approval Chain</h3>
            <p className="text-xs text-black/60 mb-4">Create custom workflow for new frameworks.</p>
            <button className="w-full py-3 bg-white text-[#12C87A] font-bold text-xs uppercase tracking-widest rounded-xl border border-[#12C87A]/30 hover:scale-[1.02] transition-transform">
              + New Chain
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
