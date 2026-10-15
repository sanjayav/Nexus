import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings2, ChevronRight, Clock, Bell, Mail, Plus, Minus, MessageSquare, Smartphone, Workflow, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader } from '../components/ui'
import { fmt, useStrings } from '../i18n'
import { workflowConfigStrings } from '../i18n/pages/workflowConfig'
import { useFrameworkLabels } from '../i18n/pages/moduleCatalog'
import { useL10n, useMockData, useWorkspace } from '../workspace/WorkspaceContext'
import type { Region } from '../workspace/regions'
import { useToast } from '../components/useToast'

type Template = { steps: string[]; slaDays: number }

/** Default approval chain per framework module id. Role ids are translated via the page dictionary. */
const CHAIN_TEMPLATES: Record<string, Template> = {
  GRI: { steps: ['analyst', 'reviewer', 'approver'], slaDays: 5 },
  MSX: { steps: ['sustainability', 'companySecretary', 'board'], slaDays: 7 },
  'IFRS-S1': { steps: ['sustainability', 'cfo', 'audit'], slaDays: 10 },
  'IFRS-S2': { steps: ['sustainability', 'cfo', 'audit'], slaDays: 10 },
  'BRSR-Core': { steps: ['cso', 'companySecretary', 'board'], slaDays: 7 },
  'CSRD-ESRS': { steps: ['euLead', 'legal', 'board'], slaDays: 14 },
  TCFD: { steps: ['sustainability', 'cfo', 'board'], slaDays: 10 },
  'China-ESG': { steps: ['esgOffice', 'sustainabilityCommittee', 'boardSecretary'], slaDays: 7 },
  'CN-SSE': { steps: ['esgOffice', 'boardOffice', 'securitiesRep', 'boardSecretary', 'board'], slaDays: 10 },
  'CN-CSDS': { steps: ['sustainability', 'cfo', 'auditCommittee', 'board'], slaDays: 14 },
  'HKEX-ESG': { steps: ['esgOffice', 'companySecretary', 'sustainabilityCommittee', 'board'], slaDays: 10 },
  'CN-ETS': { steps: ['ehs', 'carbonManager', 'approver'], slaDays: 5 },
}

/** Mainland issuers route shared international frameworks through board-level committees. */
const REGION_OVERRIDES: Partial<Record<Region, Record<string, Template>>> = {
  cn: {
    GRI: { steps: ['esgOffice', 'reviewer', 'sustainabilityCommittee'], slaDays: 7 },
    'IFRS-S2': { steps: ['sustainability', 'cfo', 'auditCommittee'], slaDays: 10 },
  },
}

const FALLBACK: Template = { steps: ['analyst', 'reviewer', 'approver'], slaDays: 7 }
const IM_CHANNELS = ['slack', 'teams', 'wecom', 'dingtalk', 'feishu']

type Chain = { id: string; moduleId?: string; customN?: number; steps: string[]; slaDays: number; active: boolean }

export default function WorkflowConfig() {
  const { workspace } = useWorkspace()
  return <WorkflowConfigView key={workspace.id} />
}

function WorkflowConfigView() {
  const s = useStrings(workflowConfigStrings)
  const fw = useFrameworkLabels()
  const l10n = useL10n()
  const navigate = useNavigate()
  const { region } = useWorkspace()
  const mockData = useMockData()
  const { toast, show } = useToast()

  const moduleTitle = useMemo(() => new Map(mockData.modules.map(m => [m.id, m.title])), [mockData.modules])

  const [chains, setChains] = useState<Chain[]>(() => {
    const inTenant = new Set(mockData.modules.map(m => m.id))
    return region.frameworks.map(id => {
      const t = REGION_OVERRIDES[region.id]?.[id] ?? CHAIN_TEMPLATES[id] ?? FALLBACK
      return { id, moduleId: id, steps: t.steps, slaDays: t.slaDays, active: inTenant.has(id) }
    })
  })
  const [selected, setSelected] = useState<string | null>(null)

  const notificationDefs = useMemo(() => {
    const defs: { id: string; icon: LucideIcon; label: string }[] = []
    if (region.notify.includes('email')) defs.push({ id: 'email', icon: Mail, label: s.notifications.email })
    const im = region.notify.find(c => IM_CHANNELS.includes(c))
    if (im) defs.push({ id: 'im', icon: MessageSquare, label: fmt(s.notifications.im, { channel: s.channels[im] ?? im }) })
    if (region.notify.includes('sms')) defs.push({ id: 'sms', icon: Smartphone, label: s.notifications.sms })
    defs.push({ id: 'reminder', icon: Bell, label: s.notifications.reminder })
    defs.push({ id: 'escalation', icon: Clock, label: s.notifications.escalation })
    return defs
  }, [region.notify, s])
  const [disabled, setDisabled] = useState<Record<string, boolean>>({})

  const role = (r: string) => s.roles[r] ?? r
  const chainName = (c: Chain) => (c.moduleId ? fw.short(c.moduleId, moduleTitle.get(c.moduleId)) : fmt(s.customChain, { n: c.customN ?? 1 }))

  const addChain = () => {
    const n = chains.filter(c => c.customN).length + 1
    const chain: Chain = { id: `custom-${n}`, customN: n, steps: FALLBACK.steps, slaDays: FALLBACK.slaDays, active: false }
    setChains(cs => [...cs, chain])
    setSelected(chain.id)
    show(fmt(s.chainCreated, { name: chainName(chain) }))
  }

  const update = (id: string, patch: (c: Chain) => Partial<Chain>) => setChains(cs => cs.map(c => (c.id === id ? { ...c, ...patch(c) } : c)))

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.title}
        description={s.description}
        actions={<Button variant="primary" icon={Plus} onClick={addChain}>{s.newChain}</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        <Card>
          <CardHeader title={s.chainsTitle} description={fmt(s.chainsDesc, { region: l10n(region.label) })} />
          {chains.length === 0 ? (
            <EmptyState
              icon={Workflow}
              title={s.emptyTitle}
              description={s.emptyBody}
              action={<Button size="sm" onClick={() => navigate('/admin/organization')}>{s.openSetup}</Button>}
            />
          ) : (
            <div className="divide-y divide-line -mx-2">
              {chains.map(c => {
                const open = selected === c.id
                const name = chainName(c)
                const fullTitle = c.moduleId ? fw.title(c.moduleId, moduleTitle.get(c.moduleId)) : name
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
                        <p className="text-sm font-medium text-zinc-900 truncate" title={fullTitle}>{name}</p>
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
                      <div className="px-2 sm:pl-[60px] pb-4 pt-1 animate-fade-up">
                        {fullTitle !== name && <p className="text-[13px] text-zinc-600 mb-3">{fullTitle}</p>}
                        <div className="text-xs text-zinc-500 mb-2">{s.stepsLabel}</div>
                        <ol className="flex flex-wrap items-center gap-2">
                          {c.steps.map((st, i) => (
                            <li key={`${st}-${i}`} className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-line bg-white text-[13px] text-zinc-700">
                                <span className="text-[11px] text-zinc-400 tabular">{i + 1}</span>
                                {role(st)}
                              </span>
                              {i < c.steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-zinc-300" />}
                            </li>
                          ))}
                        </ol>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <div className="inline-flex items-center gap-1 rounded-lg border border-line bg-white p-0.5">
                            <button
                              type="button"
                              aria-label={s.slaShorter}
                              title={s.slaShorter}
                              disabled={c.slaDays <= 1}
                              onClick={() => update(c.id, x => ({ slaDays: Math.max(1, x.slaDays - 1) }))}
                              className="w-7 h-7 rounded-md inline-flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-40"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-1.5 text-xs font-medium text-zinc-700 tabular">{fmt(s.sla, { days: c.slaDays })}</span>
                            <button
                              type="button"
                              aria-label={s.slaLonger}
                              title={s.slaLonger}
                              disabled={c.slaDays >= 60}
                              onClick={() => update(c.id, x => ({ slaDays: Math.min(60, x.slaDays + 1) }))}
                              className="w-7 h-7 rounded-md inline-flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-40"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <Button
                            size="sm"
                            variant={c.active ? 'secondary' : 'primary'}
                            onClick={() => {
                              update(c.id, x => ({ active: !x.active }))
                              show(fmt(c.active ? s.deactivated : s.activated, { name }), c.active ? 'info' : 'success')
                            }}
                          >
                            {c.active ? s.deactivate : s.activate}
                          </Button>
                          {c.moduleId && !mockData.modules.some(m => m.id === c.moduleId) && (
                            <span className="text-xs text-zinc-500">{s.notInTenant}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader title={s.notificationsTitle} description={s.notificationsDesc} />
            <div className="space-y-4">
              {notificationDefs.map(n => {
                const on = !disabled[n.id]
                return (
                  <div key={n.id} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <n.icon className="w-4 h-4 text-zinc-400 shrink-0" />
                      <span className="text-sm text-zinc-700">{n.label}</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={n.label}
                      onClick={() => setDisabled(prev => ({ ...prev, [n.id]: on }))}
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
            <Button variant="secondary" icon={Plus} className="w-full" onClick={addChain}>{s.newChain}</Button>
          </Card>
        </div>
      </div>
      {toast}
    </div>
  )
}
