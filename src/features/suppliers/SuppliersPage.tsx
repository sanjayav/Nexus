import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Factory, Info, PieChart, Send, ShieldAlert, Sigma } from 'lucide-react'
import { AnimatedNumber, Button, PageHeader, Stagger, StaggerItem, Stat, StatStrip } from '@/components/ui'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { toast } from '@/lib/hooks/useToast'
import { useAccess } from '@/features/access/AccessContext'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { hasSpecificData, type TemplateId } from './data'
import { useSuppliers, type SupplierUpdate } from './store'
import { suppliersStrings } from './suppliers.strings'
import { CoverageChart } from './components/CoverageChart'
import { RiskPanel } from './components/RiskPanel'
import { SupplierTable } from './components/SupplierTable'
import { InviteSheet, type InviteRequest } from './components/InviteSheet'
import { SupplierSheet } from './components/SupplierSheet'

type InviteState = { open: boolean; ids: string[]; template?: TemplateId }

export default function SuppliersPage() {
  const s = useStrings(suppliersStrings)
  const f = useFormat()
  const { workspace, region } = useWorkspace()
  const { member } = useAccess()
  const { demo, suppliers, apply } = useSuppliers()
  const actor = member?.name

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [detailId, setDetailId] = useState<string | null>(null)
  const [invite, setInvite] = useState<InviteState>({ open: false, ids: [] })
  const [flash, setFlash] = useState<Set<string>>(new Set())
  const flashTimer = useRef<number>()

  // Selection and open panels belong to one workspace.
  useEffect(() => {
    setSelected(new Set())
    setDetailId(null)
    setInvite({ open: false, ids: [] })
  }, [workspace.id])
  useEffect(() => () => window.clearTimeout(flashTimer.current), [])

  const flashRows = (ids: string[]) => {
    setFlash(new Set(ids))
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(new Set()), 1400)
  }

  const kpi = useMemo(() => {
    const cat1 = suppliers.filter(sp => sp.scope3Cat === 1)
    const specific = cat1.filter(hasSpecificData).reduce((sum, sp) => sum + sp.emissions, 0)
    const verified = cat1.filter(sp => sp.pcf && sp.status === 'verified').reduce((sum, sp) => sum + sp.emissions, 0)
    return {
      inScope: suppliers.length,
      invited: suppliers.filter(sp => sp.status !== 'notInvited').length,
      responded: suppliers.filter(sp => sp.status === 'submitted' || sp.status === 'verified').length,
      verified: suppliers.filter(sp => sp.status === 'verified').length,
      specific,
      coverage: demo.cat1Total ? (specific / demo.cat1Total) * 100 : 0,
      verifiedCoverage: demo.cat1Total ? (verified / demo.cat1Total) * 100 : 0,
      highRisk: suppliers.filter(sp => sp.risk === 'high').length,
      noDD: suppliers.filter(sp => sp.risk === 'high' && sp.reasons.includes('conflictMinerals')).length,
    }
  }, [suppliers, demo.cat1Total])

  const pct1 = useCallback((n: number) => f.percent(n, 1), [f])
  const compact = useCallback((n: number) => f.compact(n), [f])

  const openInvite = (ids: string[], template?: TemplateId) => setInvite({ open: true, ids, template })
  const inviteFromHeader = () =>
    openInvite(selected.size ? [...selected] : suppliers.filter(sp => sp.status === 'notInvited').map(sp => sp.id))
  const closeInvite = useCallback(() => setInvite(v => ({ ...v, open: false })), [])
  const closeDetail = useCallback(() => setDetailId(null), [])

  const send = (req: InviteRequest) => {
    const at = new Date().toISOString()
    const updates: SupplierUpdate[] = req.ids.map(id => {
      const current = suppliers.find(sp => sp.id === id)?.status
      const first = current === 'notInvited'
      return {
        id,
        status: first ? 'invited' : undefined,
        event: {
          id: `${id}-${Date.now().toString(36)}`,
          kind: first ? 'invited' : 'reminded',
          at,
          actor,
          template: req.template,
          channels: req.channels,
          deadline: req.deadline,
        },
      }
    })
    apply(updates)
    const invited = updates.filter(u => u.status).length
    const reminded = updates.length - invited
    const channels = req.channels.map(c => s.channels[c]).join(s.invite_.listSep)
    toast(
      invited && reminded
        ? fmt(s.invite_.sentMixed, { invited, reminded, channels })
        : fmt(s.invite_.sentToast, { count: updates.length, channels }),
    )
    flashRows(req.ids)
    setSelected(new Set())
    closeInvite()
  }

  const verify = (id: string) => {
    const sp = suppliers.find(x => x.id === id)
    apply([
      { id, status: 'verified', event: { id: `${id}-${Date.now().toString(36)}`, kind: 'verified', at: new Date().toISOString(), actor } },
    ])
    flashRows([id])
    toast(fmt(s.detail.verifiedToast, { name: sp?.name ?? id }))
  }

  const sendBack = (id: string, note: string) => {
    const sp = suppliers.find(x => x.id === id)
    apply([
      {
        id,
        status: 'filling',
        event: { id: `${id}-${Date.now().toString(36)}`, kind: 'returned', at: new Date().toISOString(), actor, note: note || undefined },
      },
    ])
    flashRows([id])
    toast(fmt(s.detail.returnedToast, { name: sp?.name ?? id }), 'info')
  }

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const setMany = (ids: string[], checked: boolean) =>
    setSelected(prev => {
      const next = new Set(prev)
      for (const id of ids) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })

  const detail = suppliers.find(sp => sp.id === detailId) ?? null

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={s.eyebrow}
        title={s.title}
        description={s.description}
        actions={
          <Button variant="primary" icon={Send} onClick={inviteFromHeader}>
            {s.invite}
          </Button>
        }
      />

      <Stagger key={workspace.id} className="space-y-6">
        <StaggerItem>
          <StatStrip>
            <Stat
              label={s.kpi.inScope}
              icon={Factory}
              value={f.number(kpi.inScope)}
              footer={
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    [s.kpi.funnelInvited, kpi.invited],
                    [s.kpi.funnelResponded, kpi.responded],
                    [s.kpi.funnelVerified, kpi.verified],
                  ].map(([label, n]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-zinc-500 truncate">{label}</dt>
                      <dd className="mt-0.5 text-[15px] font-semibold text-zinc-900 tabular">{f.number(Number(n))}</dd>
                    </div>
                  ))}
                </dl>
              }
            />
            <Stat
              label={s.kpi.coverage}
              icon={PieChart}
              value={<AnimatedNumber value={kpi.coverage} format={pct1} />}
              deltaLabel={fmt(s.kpi.coverageFoot, { verified: f.percent(kpi.verifiedCoverage, 1) })}
            />
            <Stat
              label={s.kpi.specific}
              icon={Sigma}
              value={<AnimatedNumber value={kpi.specific} format={compact} />}
              unit="tCO₂e"
              deltaLabel={fmt(s.kpi.specificFoot, { total: f.compact(demo.cat1Total) })}
            />
            <Stat
              label={s.kpi.highRisk}
              icon={ShieldAlert}
              value={f.number(kpi.highRisk)}
              deltaLabel={fmt(s.kpi.highRiskFoot, { count: kpi.noDD })}
            />
          </StatStrip>
        </StaggerItem>

        <StaggerItem className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <div className="xl:col-span-2 min-w-0">
            <CoverageChart suppliers={suppliers} cat1Total={demo.cat1Total} longTailLabel={demo.longTailLabel} />
          </div>
          <RiskPanel suppliers={suppliers} euBattery={demo.euBattery} onDueDiligence={ids => openInvite(ids, 'minerals')} />
        </StaggerItem>

        <StaggerItem>
          <SupplierTable
            key={workspace.id}
            suppliers={suppliers}
            selected={selected}
            flash={flash}
            onToggle={toggle}
            onSetMany={setMany}
            onClearSelection={() => setSelected(new Set())}
            onOpen={setDetailId}
            onInviteSelected={() => openInvite([...selected])}
          />
        </StaggerItem>

        <StaggerItem>
          <p className="flex items-center gap-2 text-xs text-zinc-500">
            <Info className="w-3.5 h-3.5 shrink-0" />
            {s.demoNote}
          </p>
        </StaggerItem>
      </Stagger>

      <SupplierSheet
        supplier={detail}
        onClose={closeDetail}
        onVerify={verify}
        onReturn={sendBack}
        onInvite={id => {
          setDetailId(null)
          openInvite([id])
        }}
      />
      <InviteSheet
        open={invite.open}
        initialIds={invite.ids}
        initialTemplate={invite.template}
        suppliers={suppliers}
        channels={demo.channels}
        tenantLocale={region.id === 'cn' ? 'zh' : 'en'}
        company={demo.company}
        message={demo.message}
        onClose={closeInvite}
        onSend={send}
      />
    </div>
  )
}
