import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { useStrings } from '@/lib/i18n'
import { Avatar, Button, Dialog } from '@/components/ui'
import { accessStrings } from '@/features/access/access.strings'
import type { Member } from '@/features/access/model'
import { iamCenterStrings } from '@/features/admin/iamCenter.strings'
import { copyText, inviteLink } from './shared'

/**
 * Shown after invitations are created. Delivery isn't wired up in this
 * environment, so the links are handed to the admin rather than claiming
 * an email went out.
 */
export function InviteLinksDialog({ invited, onClose }: { invited: Member[]; onClose: () => void }) {
  const s = useStrings(iamCenterStrings).links
  const roles = useStrings(accessStrings).roles
  const [copied, setCopied] = useState<string | null>(null)

  const copy = async (m: Member) => {
    if (m.token && (await copyText(inviteLink(m.token)))) setCopied(m.id)
  }

  return (
    <Dialog
      open={invited.length > 0}
      onClose={onClose}
      title={invited.length === 1 ? s.titleOne : s.title}
      description={s.body}
      width="max-w-xl"
      footer={
        <Button variant="primary" onClick={onClose}>
          {s.done}
        </Button>
      }
    >
      <ul className="max-h-[50vh] overflow-y-auto -mx-1 px-1 space-y-2">
        {invited.map(m => (
          <li key={m.id} className="rounded-xl border border-line p-3">
            <div className="flex items-center gap-2.5">
              <Avatar name={m.email} size="sm" muted />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-zinc-900 truncate">{m.email}</div>
                <div className="text-xs text-zinc-500">{roles[m.role].name}</div>
              </div>
              <Button size="sm" icon={copied === m.id ? Check : Copy} onClick={() => copy(m)}>
                {copied === m.id ? s.copied : s.copy}
              </Button>
            </div>
            {m.token && (
              <input
                readOnly
                value={inviteLink(m.token)}
                onFocus={e => e.currentTarget.select()}
                aria-label={`${s.copy}: ${m.email}`}
                className="mt-2 w-full h-8 px-2.5 rounded-lg bg-zinc-50 border border-line font-mono text-[11px] text-zinc-600 truncate focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            )}
          </li>
        ))}
      </ul>
    </Dialog>
  )
}
