import { ArrowRight, FileLock2, KeyRound, LogIn, Mail, Shield, Smartphone } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { fmt, useStrings } from '@/lib/i18n'
import { toast } from '@/lib/hooks/useToast'
import { integrationStrings, SSO_MARK } from '@/lib/i18n/shared/integrations'
import { Badge, Button, Card, CardHeader } from '@/components/ui'
import { useL10n, useWorkspace } from '@/features/workspace/WorkspaceContext'
import { iamCenterStrings } from '@/features/admin/iamCenter.strings'

/** Single sign-on providers, sign-in methods and (mainland) personal-information settings. */
export function IdentityPanel() {
  const s = useStrings(iamCenterStrings).identity
  const names = useStrings(integrationStrings)
  const l10n = useL10n()
  const navigate = useNavigate()
  const { region } = useWorkspace()
  const isCn = region.id === 'cn'

  const methods = [
    {
      icon: Mail,
      title: s.emailPassword,
      sub: s.emailPasswordSub,
      badge: (
        <Badge tone="success" dot>
          {s.enabled}
        </Badge>
      ),
    },
    { icon: Shield, title: s.mfa, sub: s.mfaSub, badge: <Badge tone="info">{s.optional}</Badge> },
    ...(isCn ? [{ icon: Smartphone, title: s.sms, sub: s.smsSub, badge: <Badge dot>{s.notConfigured}</Badge> }] : []),
  ]

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 items-start">
      <Card>
        <CardHeader icon={LogIn} title={s.providersTitle} description={fmt(s.providersDesc, { region: l10n(region.label) })} />
        <ul className="rounded-xl border border-line divide-y divide-line overflow-hidden">
          {region.sso.map(p => (
            <li key={p} className="flex items-center gap-3 px-4 py-3.5">
              <span
                className={clsx(
                  'w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center shrink-0',
                  SSO_MARK[p].className,
                )}
                aria-hidden
              >
                {SSO_MARK[p].mark}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-900">{names.sso[p]}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{s.protocols[p]}</div>
              </div>
              <Badge dot className="hidden sm:inline-flex">
                {s.notConfigured}
              </Badge>
              <Button size="sm" onClick={() => toast(fmt(s.configureNote, { provider: names.sso[p] }), 'info')}>
                {s.configure}
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader icon={KeyRound} title={s.methodsTitle} description={s.methodsDesc} />
        <ul className="rounded-xl border border-line divide-y divide-line overflow-hidden">
          {methods.map(m => (
            <li key={m.title} className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0">
                <m.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-900">{m.title}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{m.sub}</div>
              </div>
              {m.badge}
            </li>
          ))}
        </ul>
      </Card>

      {isCn && (
        <Card className="xl:col-span-2">
          <CardHeader icon={FileLock2} title={s.piplTitle} description={s.piplDesc} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-line p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-zinc-900">{s.consent}</div>
                <Badge tone="success" dot>
                  {s.enabled}
                </Badge>
              </div>
              <div className="text-xs text-zinc-500 mt-1 leading-relaxed">{s.consentSub}</div>
            </div>
            <div className="rounded-xl border border-line p-4">
              <div className="text-sm font-medium text-zinc-900">{s.minimal}</div>
              <div className="text-xs text-zinc-500 mt-1 leading-relaxed">{s.minimalSub}</div>
            </div>
            <div className="rounded-xl border border-line p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-900">{s.crossBorder}</div>
                <div className="text-xs text-zinc-500 mt-1 leading-relaxed">{s.crossBorderSub}</div>
              </div>
              <Button size="sm" iconRight={ArrowRight} onClick={() => navigate('/admin')}>
                {s.open}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
