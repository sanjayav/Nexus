import { FormEvent, useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { ShieldCheck, ShieldAlert, Loader2, Copy, AlertCircle, CheckCircle2 } from 'lucide-react'
import { auth as authApi, type MfaEnrollResponse, type MfaStatusResponse } from '../lib/api'

type Stage =
  | { kind: 'loading' }
  | { kind: 'disabled' }                                  // not enrolled
  | { kind: 'enrolling'; data: MfaEnrollResponse }        // /enroll done, awaiting verify
  | { kind: 'enabled'; lastUsedAt: string | null }        // already on
  | { kind: 'disabling' }                                  // password prompt for disable

/**
 * Self-contained MFA management widget. Plugged into Settings → Account
 * security. Talks to /api/auth/mfa/* directly.
 */
export default function MfaSection() {
  const [stage, setStage] = useState<Stage>({ kind: 'loading' })
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copiedRecovery, setCopiedRecovery] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const status = await authApi.mfaStatus()
        if (cancelled) return
        setStage(stageFromStatus(status))
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Could not load MFA status.')
        setStage({ kind: 'disabled' })
      }
    })()
    return () => { cancelled = true }
  }, [])

  const stageFromStatus = (s: MfaStatusResponse): Stage =>
    s.enabled ? { kind: 'enabled', lastUsedAt: s.lastUsedAt } : { kind: 'disabled' }

  const startEnroll = async () => {
    setError(null)
    setBusy(true)
    try {
      const data = await authApi.mfaEnroll()
      setStage({ kind: 'enrolling', data })
      setCode('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start enrollment.')
    } finally {
      setBusy(false)
    }
  }

  const verifyEnroll = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await authApi.mfaVerifyEnroll(code.trim())
      setStage({ kind: 'enabled', lastUsedAt: null })
      setCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.')
    } finally {
      setBusy(false)
    }
  }

  const askDisable = () => {
    setError(null)
    setPassword('')
    setStage({ kind: 'disabling' })
  }

  const cancelDisable = () => {
    setError(null)
    setPassword('')
    setStage({ kind: 'enabled', lastUsedAt: null })
  }

  const submitDisable = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await authApi.mfaDisable(password)
      setStage({ kind: 'disabled' })
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not disable MFA.')
    } finally {
      setBusy(false)
    }
  }

  const copyRecoveryCodes = async (codes: string[]) => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'))
      setCopiedRecovery(true)
      setTimeout(() => setCopiedRecovery(false), 2000)
    } catch {
      /* noop */
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-[var(--text-tertiary)]" />
        <h2 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">
          Account security
        </h2>
      </div>
      <p className="text-[var(--text-sm)] text-[var(--text-secondary)]">
        Add a second factor with a TOTP authenticator app (Google Authenticator, 1Password, Authy, Apple Passwords). After enabling, you'll be prompted for a 6-digit code at every sign-in.
      </p>

      <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] space-y-4">
        {error && (
          <div role="alert" className="flex items-start gap-2 p-3 rounded text-[var(--text-xs)] bg-red-50 border border-red-200 text-red-700">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {stage.kind === 'loading' && (
          <div className="flex items-center gap-2 text-[var(--text-xs)] text-[var(--text-secondary)]">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking status...
          </div>
        )}

        {stage.kind === 'disabled' && (
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[var(--text-sm)] font-medium text-[var(--text-primary)]">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Two-factor authentication is off
              </div>
              <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-1">
                Strongly recommended for accounts with publishing or admin permissions.
              </p>
            </div>
            <button
              type="button"
              onClick={startEnroll}
              disabled={busy}
              className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-xs)] font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Setting up...' : 'Enable 2FA'}
            </button>
          </div>
        )}

        {stage.kind === 'enrolling' && (
          <div className="space-y-4">
            <div>
              <div className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mb-1">
                Step 1 · Scan the QR code
              </div>
              <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mb-3">
                Open your authenticator app and add a new account by scanning this code.
              </p>
              <div className="inline-block p-3 bg-white rounded border border-[var(--border-default)]">
                <QRCodeSVG value={stage.data.otpauthUri} size={168} marginSize={0} />
              </div>
              <div className="mt-3 text-[var(--text-xs)] text-[var(--text-tertiary)]">
                Or enter this secret manually:
                <code className="ml-2 px-2 py-0.5 rounded bg-[var(--bg-secondary)] font-mono text-[11px]">
                  {stage.data.secret}
                </code>
              </div>
            </div>

            <div className="p-3 rounded border border-amber-300 bg-amber-50">
              <div className="text-[var(--text-sm)] font-semibold text-amber-900 mb-1">
                Step 2 · Save your recovery codes
              </div>
              <p className="text-[11px] text-amber-800 mb-2">
                Store these somewhere safe — each can be used once if you lose your device. They will NOT be shown again.
              </p>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] mb-2">
                {stage.data.recoveryCodes.map(rc => (
                  <code key={rc} className="px-2 py-1 rounded bg-white border border-amber-200">{rc}</code>
                ))}
              </div>
              <button
                type="button"
                onClick={() => copyRecoveryCodes(stage.data.recoveryCodes)}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-900 hover:underline"
              >
                {copiedRecovery
                  ? <><CheckCircle2 className="w-3 h-3" /> Copied!</>
                  : <><Copy className="w-3 h-3" /> Copy all recovery codes</>}
              </button>
            </div>

            <form onSubmit={verifyEnroll} className="space-y-2">
              <div>
                <label htmlFor="mfa-enroll-code" className="text-[var(--text-xs)] font-medium text-[var(--text-secondary)] block mb-1">
                  Step 3 · Enter the 6-digit code from your app
                </label>
                <input
                  id="mfa-enroll-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="123456"
                  className="w-32 h-9 px-3 rounded border border-[var(--border-default)] text-[var(--text-sm)] font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy || code.trim().length < 6}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-xs)] font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? 'Verifying...' : 'Verify and enable'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStage({ kind: 'disabled' }); setCode('') }}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] text-[var(--text-xs)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {stage.kind === 'enabled' && (
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[var(--text-sm)] font-medium text-[var(--text-primary)]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Two-factor authentication is on
              </div>
              <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-1">
                {stage.lastUsedAt
                  ? `Last used ${new Date(stage.lastUsedAt).toLocaleString()}`
                  : 'You will be prompted for your code at every sign-in.'}
              </p>
            </div>
            <button
              type="button"
              onClick={askDisable}
              disabled={busy}
              className="px-3 py-1.5 rounded-[var(--radius-md)] border border-red-200 text-red-700 text-[var(--text-xs)] font-semibold hover:bg-red-50 disabled:opacity-50"
            >
              Disable
            </button>
          </div>
        )}

        {stage.kind === 'disabling' && (
          <form onSubmit={submitDisable} className="space-y-3">
            <div>
              <div className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">
                Confirm your password to disable 2FA
              </div>
              <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-1">
                Once disabled, only your password will be required to sign in.
              </p>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Current password"
              autoFocus
              className="w-full max-w-sm h-9 px-3 rounded border border-[var(--border-default)] text-[var(--text-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy || password.length === 0}
                className="px-3 py-1.5 rounded-[var(--radius-md)] bg-red-600 text-white text-[var(--text-xs)] font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? 'Disabling...' : 'Disable 2FA'}
              </button>
              <button
                type="button"
                onClick={cancelDisable}
                className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] text-[var(--text-xs)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
