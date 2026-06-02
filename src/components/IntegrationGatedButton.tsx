/**
 * IntegrationGatedButton — wraps a primary CTA so it disables + tooltips when
 * the relevant vendor integration (AI/email/SSO/realtime) is not configured
 * on the server. Surfaces silent failures as obvious "ask your admin" UX.
 *
 * Usage:
 *   <IntegrationGatedButton integration="ai" onClick={runDraft}>
 *     Draft with AI
 *   </IntegrationGatedButton>
 *
 * The component owns the disabled / loading visuals; the parent supplies the
 * label + handler. While `/api/health` is still loading the button renders as
 * disabled so we never let a click race the probe.
 */
import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { useIntegrationStatus } from '../lib/integrations'

export type IntegrationKey = 'ai' | 'email' | 'sso' | 'realtime'

interface Props {
  integration: IntegrationKey
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  className?: string
  disabledClassName?: string
  /** Optional alternate content while the health probe is still loading. */
  loadingChildren?: ReactNode
  /** Forwarded so callers can disable for non-integration reasons too. */
  disabled?: boolean
}

const LABELS: Record<IntegrationKey, string> = {
  ai: 'AI is not configured in this environment. Ask an admin to set ANTHROPIC_API_KEY.',
  email: 'Email delivery is not configured. Ask an admin to set RESEND_API_KEY.',
  sso: 'SSO is not configured. Ask an admin to set WORKOS_API_KEY.',
  realtime: 'Realtime collaboration is not configured. Ask an admin to set LIVEBLOCKS_SECRET_KEY.',
}

export function IntegrationGatedButton({
  integration,
  children,
  onClick,
  type = 'button',
  className = 'btn-primary',
  disabledClassName = 'btn-secondary opacity-60 cursor-not-allowed inline-flex items-center gap-1.5',
  loadingChildren,
  disabled,
}: Props) {
  const status = useIntegrationStatus()

  if (status.loading) {
    return (
      <button type={type} className={disabledClassName} disabled>
        {loadingChildren ?? children}
      </button>
    )
  }

  const ok = status[integration]
  if (!ok) {
    return (
      <button
        type={type}
        className={disabledClassName}
        disabled
        title={LABELS[integration]}
        aria-label={LABELS[integration]}
        data-integration-gated={integration}
      >
        <Lock className="w-3.5 h-3.5" />
        {children}
      </button>
    )
  }

  return (
    <button type={type} className={className} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

/** Re-export the integration labels so callers can build inline banners with
 *  the same copy (keeps "set XXX_API_KEY" wording consistent). */
export const integrationLabels = LABELS
