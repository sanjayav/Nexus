import { useState } from 'react'
import { Link2, Server, Database, Bell, Shield, Save, ArrowRight, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fmt, useFormat, useStrings } from '../i18n'
import { adminSettingsStrings } from '../i18n/pages/adminSettings'
import { PageHeader, Card, CardHeader, Button, Badge, Field, inputClass } from '../components/ui'

const readOnlyInput = inputClass + ' bg-zinc-50 text-zinc-600 cursor-default'
const selectClass = inputClass + ' appearance-none cursor-pointer pr-8'

function StatusRow({ title, sub, badge }: { title: string; sub: string; badge: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-zinc-50/70 border border-line">
      <div className="min-w-0">
        <div className="text-sm font-medium text-zinc-900">{title}</div>
        <div className="text-[13px] text-zinc-500 mt-0.5">{sub}</div>
      </div>
      {badge}
    </div>
  )
}

export default function AdminSettings() {
  const s = useStrings(adminSettingsStrings)
  const f = useFormat()
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const quickLinks = [
    { to: '/admin/organization', title: s.orgSetup, sub: s.orgSetupSub },
    { to: '/period/create', title: s.createPeriod, sub: s.createPeriodSub },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title={s.title}
        description={s.description}
        actions={
          <Button variant="primary" icon={saved ? Check : Save} onClick={handleSave}>
            {saved ? s.saved : s.save}
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Quick links */}
        <section>
          <h2 className="text-[13px] font-medium text-zinc-500 mb-3">{s.quickAccess}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickLinks.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className="group flex items-center justify-between gap-4 p-5 bg-surface border border-line rounded-card shadow-card hover:border-zinc-300 hover:shadow-pop transition-[box-shadow,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zinc-900">{l.title}</div>
                  <div className="text-[13px] text-zinc-500 mt-0.5">{l.sub}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            ))}
          </div>
        </section>

        {/* Chain configuration */}
        <Card>
          <CardHeader icon={Link2} title={s.chain} description={s.chainSub} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={s.chainId} hint={s.readOnly}>
              <input type="text" value="zkEVM" readOnly className={readOnlyInput} />
            </Field>
            <Field label={s.rpc}>
              <input type="text" defaultValue="https://zkevm-rpc.com" className={inputClass} />
            </Field>
            <div className="md:col-span-2">
              <Field label={s.contract}>
                <input type="text" defaultValue="0x1234567890abcdef1234567890abcdef12345678" className={inputClass + ' font-mono text-[13px]'} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label={s.abiHash} hint={s.readOnly}>
                <input type="text" value="0xabcdef1234567890abcdef1234567890abcdef12" readOnly className={readOnlyInput + ' font-mono text-[13px]'} />
              </Field>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Relayer */}
          <Card>
            <CardHeader icon={Server} title={s.relayer} description={s.relayerSub} />
            <div className="space-y-4">
              <StatusRow
                title={s.relayerHealth}
                sub={fmt(s.lastSync, { time: '2024-11-12 10:45 UTC' })}
                badge={<Badge tone="success" dot>{s.ok}</Badge>}
              />
              <Field label={s.relayerEndpoint}>
                <input type="text" defaultValue="https://relayer.aeiforo.com" className={inputClass} />
              </Field>
              <Field label={s.apiKey}>
                <input type="password" defaultValue="sk_live_1234567890abcdef" className={inputClass + ' font-mono'} />
              </Field>
            </div>
          </Card>

          {/* IPFS */}
          <Card>
            <CardHeader icon={Database} title={s.ipfs} description={s.ipfsSub} />
            <div className="space-y-4">
              <StatusRow
                title={s.ipfsStatus}
                sub={fmt(s.pinnedItems, { count: f.number(487) })}
                badge={<Badge tone="info">{s.pinned}</Badge>}
              />
              <Field label={s.gateway}>
                <input type="text" defaultValue="https://ipfs.io" className={inputClass} />
              </Field>
              <Field label={s.pinPolicy}>
                <select className={selectClass}>
                  {s.pinOptions.map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
            </div>
          </Card>
        </div>

        {/* SLA & retention */}
        <Card>
          <CardHeader icon={Shield} title={s.sla} description={s.slaSub} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={s.slaThreshold} hint={s.slaHint}>
              <input type="number" defaultValue="5" className={inputClass + ' tabular'} />
            </Field>
            <Field label={s.retention} hint={s.retentionHint}>
              <input type="number" defaultValue="90" className={inputClass + ' tabular'} />
            </Field>
            <div className="md:col-span-2">
              <Field label={s.backup}>
                <select className={selectClass}>
                  {s.backupOptions.map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
            </div>
          </div>
        </Card>

        {/* Webhooks & notifications */}
        <Card>
          <CardHeader icon={Bell} title={s.webhooks} description={s.webhooksSub} />
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={s.slack}>
                <input type="text" placeholder="https://hooks.slack.com/services/..." className={inputClass} />
              </Field>
              <Field label={s.email}>
                <input type="email" placeholder="admin@company.com" className={inputClass} />
              </Field>
            </div>
            <div>
              <div className="text-[13px] font-medium text-zinc-700 mb-2">{s.events}</div>
              <div className="rounded-xl border border-line divide-y divide-line overflow-hidden">
                {s.eventList.map((label, i) => (
                  <label key={i} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-50/70 transition-colors">
                    <input type="checkbox" defaultChecked={i < 3} className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-brand-500/40" />
                    <span className="text-sm text-zinc-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end pb-4">
          <Button variant="primary" icon={saved ? Check : Save} onClick={handleSave}>
            {saved ? s.saved : s.save}
          </Button>
        </div>
      </div>
    </div>
  )
}
