import { useState } from 'react'
import clsx from 'clsx'
import { Link2, Server, Database, Bell, Shield, Save, ArrowRight, Check, ExternalLink, Globe2, Send, HardDrive } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fmt, useFormat, useStrings } from '../i18n'
import { adminSettingsStrings } from '../i18n/pages/adminSettings'
import { integrationStrings } from '../i18n/pages/integrations'
import { PageHeader, Card, CardHeader, Button, Badge, Field, inputClass } from '../components/ui'
import { useWorkspace, useL10n } from '../workspace/WorkspaceContext'
import type { NotifyChannel } from '../workspace/regions'
import { useComplianceSettings } from '../components/useComplianceSettings'
import { useToast } from '../components/useToast'

const readOnlyInput = inputClass + ' bg-zinc-50 text-zinc-600 cursor-default'
const selectClass = inputClass + ' appearance-none cursor-pointer pr-8'

/** Webhook URL formats per channel (placeholders only; nothing is pre-filled). */
const WEBHOOK_PLACEHOLDER: Partial<Record<NotifyChannel, string>> = {
  slack: 'https://hooks.slack.com/services/…',
  teams: 'https://<tenant>.webhook.office.com/…',
  wecom: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=…',
  dingtalk: 'https://oapi.dingtalk.com/robot/send?access_token=…',
  feishu: 'https://open.feishu.cn/open-apis/bot/v2/hook/…',
}

const DEFAULT_ON: Record<NotifyChannel, boolean> = { email: true, slack: true, teams: false, wecom: true, dingtalk: false, feishu: false, sms: true }

/** Per-region infrastructure defaults shown in the forms. */
const INFRA = {
  global: {
    relayer: 'https://relayer.aeiforo.com',
    lastSync: '2025-11-12T10:45:00Z',
  },
  cn: {
    relayer: 'https://relayer-cn.aeiforo.com',
    lastSync: '2026-10-16T09:12:00+08:00',
  },
}

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
  const { workspace } = useWorkspace()
  // Remount per workspace so unsaved form state never carries across tenants.
  return <AdminSettingsView key={workspace.id} />
}

function AdminSettingsView() {
  const s = useStrings(adminSettingsStrings)
  const names = useStrings(integrationStrings)
  const f = useFormat()
  const l10n = useL10n()
  const { workspace, region } = useWorkspace()
  const isCn = region.id === 'cn'
  const infra = INFRA[region.id]
  const { toast, show } = useToast()
  const [stored, saveCompliance] = useComplianceSettings()
  const [compliance, setCompliance] = useState(stored)
  const [channelsOn, setChannelsOn] = useState<Record<string, boolean>>(() => Object.fromEntries(region.notify.map(c => [c, DEFAULT_ON[c]])))
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    saveCompliance({ ...compliance, icp: compliance.icp.trim() })
    setSaved(true)
    show(fmt(s.savedToast, { workspace: l10n(workspace.name) }))
    setTimeout(() => setSaved(false), 2000)
  }

  const quickLinks = [
    { to: '/admin/organization', title: s.orgSetup, sub: s.orgSetupSub },
    { to: '/period/create', title: s.createPeriod, sub: s.createPeriodSub },
  ]

  const crossBorderOptions = isCn ? s.crossBorderCn : s.crossBorderGlobal
  const tz = s.tz[region.id]
  const lastSyncLabel = f.date(infra.lastSync, { dateStyle: 'medium', timeStyle: 'short', timeZone: region.timezone } as Intl.DateTimeFormatOptions)

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

        {/* Data residency & compliance */}
        <Card>
          <CardHeader
            icon={Globe2}
            title={s.residencyTitle}
            description={s.residencySub}
            action={<Badge tone="info">{l10n(region.label)}</Badge>}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={s.hosting} hint={s.readOnly}>
              <input type="text" value={l10n(region.hosting.provider)} readOnly className={readOnlyInput} />
            </Field>
            <Field label={s.hostingRegion} hint={s.readOnly}>
              <input type="text" value={l10n(region.hosting.residency)} readOnly className={readOnlyInput} />
            </Field>
            <Field label={s.privacyRegime} hint={s.readOnly}>
              <input type="text" value={l10n(region.privacy)} readOnly className={readOnlyInput} />
            </Field>
            <Field label={s.crossBorder} hint={s.crossBorderHint} htmlFor="cross-border">
              <select
                id="cross-border"
                className={selectClass}
                value={compliance.crossBorder}
                onChange={e => setCompliance(c => ({ ...c, crossBorder: Number(e.target.value) }))}
              >
                {crossBorderOptions.map((o, i) => <option key={o} value={i}>{o}</option>)}
              </select>
            </Field>
            {isCn && (
              <>
                <Field label={s.mlps} hint={s.mlpsHint} htmlFor="mlps">
                  <select id="mlps" className={selectClass} value={compliance.mlps} onChange={e => setCompliance(c => ({ ...c, mlps: Number(e.target.value) }))}>
                    {s.mlpsOptions.map((o, i) => <option key={o} value={i}>{o}</option>)}
                  </select>
                </Field>
                <Field label={s.icp} hint={s.icpHint} htmlFor="icp">
                  <input id="icp" type="text" value={compliance.icp} onChange={e => setCompliance(c => ({ ...c, icp: e.target.value }))} placeholder={s.icpPlaceholder} className={inputClass} />
                </Field>
              </>
            )}
          </div>
        </Card>

        {/* Chain configuration */}
        <Card>
          <CardHeader
            icon={Link2}
            title={s.chain}
            description={s.chainSub}
            action={<Badge tone="neutral">{l10n(region.chain.kind)}</Badge>}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={s.network} hint={s.readOnly}>
              <input type="text" value={l10n(region.chain.network)} readOnly className={readOnlyInput} />
            </Field>
            {isCn ? (
              <>
                <Field label={s.chainId} hint={s.readOnly}>
                  <input type="text" value="lvyuan-esg-chain" readOnly className={readOnlyInput + ' font-mono text-[13px]'} />
                </Field>
                <Field label={s.nodeAddress}>
                  <input type="text" defaultValue="grpcs://node1.bsn-cn-shanghai.example:12301" className={inputClass + ' font-mono text-[13px]'} />
                </Field>
                <Field label={s.orgId}>
                  <input type="text" defaultValue="lvyuan-org1" className={inputClass + ' font-mono text-[13px]'} />
                </Field>
                <Field label={s.contractName}>
                  <input type="text" defaultValue="nexus_evidence_anchor" className={inputClass + ' font-mono text-[13px]'} />
                </Field>
                <Field label={s.certFingerprint} hint={s.readOnly}>
                  <input type="text" value="5e:0b:91:c4:7a:2f:…:d8:13" readOnly className={readOnlyInput + ' font-mono text-[13px]'} />
                </Field>
              </>
            ) : (
              <>
                <Field label={s.chainId} hint={s.readOnly}>
                  <input type="text" value="1101" readOnly className={readOnlyInput + ' font-mono text-[13px]'} />
                </Field>
                <Field label={s.rpc}>
                  <input type="text" defaultValue="https://zkevm-rpc.com" className={inputClass} />
                </Field>
                <Field label={s.contract}>
                  <input type="text" defaultValue="0x1234567890abcdef1234567890abcdef12345678" className={inputClass + ' font-mono text-[13px]'} />
                </Field>
                <div className="md:col-span-2">
                  <Field label={s.abiHash} hint={s.readOnly}>
                    <input type="text" value="0xabcdef1234567890abcdef1234567890abcdef12" readOnly className={readOnlyInput + ' font-mono text-[13px]'} />
                  </Field>
                </div>
              </>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-line flex flex-wrap items-center justify-between gap-2 text-[13px]">
            <span className="text-zinc-500">
              {s.explorer}: <span className="font-mono text-zinc-700 break-all">{region.chain.explorer.replace(/^https?:\/\//, '')}</span>
            </span>
            <a
              href={region.chain.explorer}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              {s.openExplorer} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Relayer */}
          <Card>
            <CardHeader icon={Server} title={s.relayer} description={s.relayerSub} />
            <div className="space-y-4">
              <StatusRow title={s.relayerHealth} sub={fmt(s.lastSync, { time: lastSyncLabel })} badge={<Badge tone="success" dot>{s.ok}</Badge>} />
              <Field label={s.relayerEndpoint}>
                <input type="text" defaultValue={infra.relayer} className={inputClass} />
              </Field>
              <Field label={s.apiKey}>
                <input type="password" defaultValue="sk_live_1234567890abcdef" className={inputClass + ' font-mono'} />
              </Field>
            </div>
          </Card>

          {/* Evidence storage */}
          {isCn ? (
            <Card>
              <CardHeader icon={HardDrive} title={s.oss} description={s.ossSub} />
              <div className="space-y-4">
                <StatusRow title={s.wormStatus} sub={fmt(s.wormObjects, { count: f.number(1264) })} badge={<Badge tone="success" icon={Shield}>{s.locked}</Badge>} />
                <div className="grid grid-cols-1 gap-4">
                  <Field label={s.bucket}>
                    <input type="text" defaultValue="lvyuan-esg-evidence" className={inputClass + ' font-mono text-[13px]'} />
                  </Field>
                  <Field label={s.endpoint} hint={s.readOnly}>
                    <input type="text" value="oss-cn-shanghai.aliyuncs.com" readOnly className={readOnlyInput + ' font-mono text-[13px]'} />
                  </Field>
                </div>
                <Field label={s.retentionPeriod}>
                  <select className={selectClass} defaultValue={s.retentionOptions[2]}>
                    {s.retentionOptions.map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader icon={Database} title={s.ipfs} description={s.ipfsSub} />
              <div className="space-y-4">
                <StatusRow title={s.ipfsStatus} sub={fmt(s.pinnedItems, { count: f.number(487) })} badge={<Badge tone="info">{s.pinned}</Badge>} />
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
          )}
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
                  {s.backupOptions.map(o => <option key={o}>{fmt(o, { tz })}</option>)}
                </select>
              </Field>
            </div>
          </div>
        </Card>

        {/* Webhooks & notifications */}
        <Card>
          <CardHeader icon={Bell} title={s.webhooks} description={s.webhooksSub} />
          <div className="space-y-5">
            <div>
              <div className="text-[13px] font-medium text-zinc-700 mb-2">{s.channels}</div>
              <div className="rounded-xl border border-line divide-y divide-line">
                {region.notify.map(ch => {
                  const on = channelsOn[ch]
                  const label = names.notify[ch]
                  return (
                    <div key={ch} className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-3 cursor-pointer min-w-0">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={e => setChannelsOn(p => ({ ...p, [ch]: e.target.checked }))}
                            className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-brand-500/40"
                          />
                          <span className="text-sm font-medium text-zinc-900 truncate">{label}</span>
                        </label>
                        <Button size="sm" variant="ghost" icon={Send} disabled={!on} onClick={() => show(fmt(s.testQueued, { channel: label }), 'info')}>
                          {s.sendTest}
                        </Button>
                      </div>
                      {on && (
                        <div className={clsx('mt-3 grid gap-3 pl-7', (ch === 'dingtalk' || ch === 'sms') && 'md:grid-cols-2')}>
                          {WEBHOOK_PLACEHOLDER[ch] && (
                            <Field label={s.webhookUrl}>
                              <input type="url" placeholder={WEBHOOK_PLACEHOLDER[ch]} className={inputClass + ' font-mono text-[13px]'} />
                            </Field>
                          )}
                          {ch === 'dingtalk' && (
                            <Field label={s.signSecret}>
                              <input type="password" placeholder="SEC…" className={inputClass + ' font-mono text-[13px]'} />
                            </Field>
                          )}
                          {ch === 'sms' && (
                            <>
                              <Field label={s.smsRecipients}>
                                <input type="text" placeholder={s.smsRecipientsPlaceholder} className={inputClass + ' tabular'} />
                              </Field>
                              <Field label={s.smsSign} hint={s.smsSignHint}>
                                <input type="text" placeholder={s.smsSignPlaceholder} className={inputClass} />
                              </Field>
                            </>
                          )}
                          {ch === 'email' && (
                            <Field label={s.emailRecipients}>
                              <input type="email" placeholder="admin@company.com" className={inputClass} />
                            </Field>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
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
      {toast}
    </div>
  )
}
