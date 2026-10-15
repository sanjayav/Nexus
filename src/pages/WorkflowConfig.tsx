import { useState } from 'react'
import { Settings2, ChevronRight, Clock, UserPlus, Bell, Mail, Plus } from 'lucide-react'
import clsx from 'clsx'
import { Badge, Button, Card, CardHeader, PageHeader } from '../components/ui'
import { fmt, useStrings } from '../i18n'
import { workflowConfigStrings } from '../i18n/pages/workflowConfig'

const approvalChains = [
  { id: '1', name: 'GRI / MSX', steps: ['Analyst', 'Reviewer', 'Approver'], slaDays: 5, active: true },
  { id: '2', name: 'BRSR Core', steps: ['CSO', 'Company Secretary', 'Board'], slaDays: 7, active: true },
  { id: '3', name: 'IFRS S1/S2', steps: ['Sustainability', 'CFO', 'Audit'], slaDays: 10, active: true },
  { id: '4', name: 'CSRD ESRS', steps: ['EU Lead', 'Legal', 'Board'], slaDays: 14, active: false },
]

const notificationDefs = [
  { id: 'email', icon: Mail },
  { id: 'slack', icon: Bell },
  { id: 'reminder', icon: UserPlus },
  { id: 'escalation', icon: Clock },
] as const

export default function WorkflowConfig() {
  const s = useStrings(workflowConfigStrings)
  const [selected, setSelected] = useState<string | null>(null)
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ email: true, slack: true, reminder: true, escalation: true })
  const role = (r: string) => s.roles[r] ?? r

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.title}
        description={s.description}
        actions={<Button variant="primary" icon={Plus}>{s.newChain}</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        <Card>
          <CardHeader title={s.chainsTitle} description={s.chainsDesc} />
          <div className="divide-y divide-line -mx-2">
            {approvalChains.map(c => {
              const open = selected === c.id
              return (
                <div key={c.id}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setSelected(open ? null : c.id)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-2 py-3 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30',
                      open ? 'bg-zinc-50' : 'hover:bg-zinc-50',
                    )}
                  >
                    <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0">
                      <Settings2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900">{c.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">{c.steps.map(role).join(' → ')}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-3 shrink-0">
                      <Badge tone={c.active ? 'success' : 'neutral'} dot>{c.active ? s.active : s.draft}</Badge>
                      <span className="text-xs text-zinc-500 inline-flex items-center gap-1 tabular">
                        <Clock className="w-3.5 h-3.5" /> {fmt(s.sla, { days: c.slaDays })}
                      </span>
                    </div>
                    <ChevronRight className={clsx('w-4 h-4 text-zinc-400 shrink-0 transition-transform', open && 'rotate-90')} />
                  </button>
                  {open && (
                    <div className="px-2 sm:pl-[60px] pb-4 pt-1">
                      <div className="text-xs text-zinc-500 mb-2">{s.stepsLabel}</div>
                      <ol className="flex flex-wrap items-center gap-2">
                        {c.steps.map((st, i) => (
                          <li key={st} className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-line bg-white text-[13px] text-zinc-700">
                              <span className="text-[11px] text-zinc-400 tabular">{i + 1}</span>
                              {role(st)}
                            </span>
                            {i < c.steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-zinc-300" />}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader title={s.notificationsTitle} description={s.notificationsDesc} />
            <div className="space-y-4">
              {notificationDefs.map(n => {
                const on = enabled[n.id]
                return (
                  <div key={n.id} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <n.icon className="w-4 h-4 text-zinc-400 shrink-0" />
                      <span className="text-sm text-zinc-700">{s.notifications[n.id]}</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={s.notifications[n.id]}
                      onClick={() => setEnabled(prev => ({ ...prev, [n.id]: !prev[n.id] }))}
                      className={clsx(
                        'relative w-9 h-5 rounded-full transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30',
                        on ? 'bg-zinc-900' : 'bg-zinc-200',
                      )}
                    >
                      <span className={clsx('absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', on && 'translate-x-4')} />
                    </button>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title={s.addTitle} description={s.addBody} icon={Plus} className="mb-4" />
            <Button variant="secondary" icon={Plus} className="w-full">{s.newChain}</Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
