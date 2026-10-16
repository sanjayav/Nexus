import { FormEvent, useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { ShieldCheck, ShieldAlert, Loader2, Copy, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  const { t, i18n } = useTranslation()
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
        setError(e instanceof Error ? e.message : t('components.mfa.loadFailed'))
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
      setError(e instanceof Error ? e.message : t('components.mfa.enrollFailed'))
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
      setError(err instanceof Error ? err.message : t('components.mfa.verifyFailed'))
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
      setError(err instanceof Error ? err.message : t('components.mfa.disableFailed'))
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
        <h2 className="font-display text-[length:var(--text-lg)] font-semibold text-[var(--text-primary)]">
          {t('components.mfa.title')}
        </h2>
      </div>
      <p className="text-[length:var(--text-sm)] text-[var(--text-secondary)]">
        {t('components.mfa.intro')}
      </p>

      <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] space-y-4">
        {error && (
          <div role="alert" className="flex items-start gap-2 p-3 rounded text-[length:var(--text-xs)] bg-red-50 border border-red-200 text-red-700">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {stage.kind === 'loading' && (
          <div className="flex items-center gap-2 text-[length:var(--text-xs)] text-[var(--text-secondary)]">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('components.mfa.checking')}
          </div>
        )}

        {stage.kind === 'disabled' && (
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[length:var(--text-sm)] font-medium text-[var(--text-primary)]">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                {t('components.mfa.off')}
              </div>
              <p className="text-[length:var(--text-xs)] text-[var(--text-tertiary)] mt-1">
                {t('components.mfa.recommended')}
              </p>
            </div>
            <button
              type="button"
              onClick={startEnroll}
              disabled={busy}
              className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[length:var(--text-xs)] font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {busy ? t('components.mfa.settingUp') : t('components.mfa.enable')}
            </button>
          </div>
        )}

        {stage.kind === 'enrolling' && (
          <div className="space-y-4">
            <div>
              <div className="text-[length:var(--text-sm)] font-semibold text-[var(--text-primary)] mb-1">
                {t('components.mfa.step1')}
              </div>
              <p className="text-[length:var(--text-xs)] text-[var(--text-tertiary)] mb-3">
                {t('components.mfa.step1Body')}
              </p>
              <div className="inline-block p-3 bg-white rounded border border-[var(--border-default)]">
                <QRCodeSVG value={stage.data.otpauthUri} size={168} marginSize={0} />
              </div>
              <div className="mt-3 text-[length:var(--text-xs)] text-[var(--text-tertiary)]">
                {t('components.mfa.manualSecret')}
                <code className="ml-2 px-2 py-0.5 rounded bg-[var(--bg-secondary)] font-mono text-caption">
                  {stage.data.secret}
                </code>
              </div>
            </div>

            <div className="p-3 rounded border border-amber-300 bg-amber-50">
              <div className="text-[length:var(--text-sm)] font-semibold text-amber-900 mb-1">
                {t('components.mfa.step2')}
              </div>
              <p className="text-caption text-amber-800 mb-2">
                {t('components.mfa.step2Body')}
              </p>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-caption mb-2">
                {stage.data.recoveryCodes.map(rc => (
                  <code key={rc} className="px-2 py-1 rounded bg-white border border-amber-200">{rc}</code>
                ))}
              </div>
              <button
                type="button"
                onClick={() => copyRecoveryCodes(stage.data.recoveryCodes)}
                className="inline-flex items-center gap-1.5 text-caption font-semibold text-amber-900 hover:underline"
              >
                {copiedRecovery
                  ? <><CheckCircle2 className="w-3 h-3" /> {t('components.mfa.copied')}</>
                  : <><Copy className="w-3 h-3" /> {t('components.mfa.copyAll')}</>}
              </button>
            </div>

            <form onSubmit={verifyEnroll} className="space-y-2">
              <div>
                <label htmlFor="mfa-enroll-code" className="text-[length:var(--text-xs)] font-medium text-[var(--text-secondary)] block mb-1">
                  {t('components.mfa.step3')}
                </label>
                <input
                  id="mfa-enroll-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="123456"
                  className="w-32 h-9 px-3 rounded border border-[var(--border-default)] text-[length:var(--text-sm)] font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy || code.trim().length < 6}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[length:var(--text-xs)] font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? t('components.mfa.verifying') : t('components.mfa.verifyEnable')}
                </button>
                <button
                  type="button"
                  onClick={() => { setStage({ kind: 'disabled' }); setCode('') }}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] text-[length:var(--text-xs)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        {stage.kind === 'enabled' && (
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[length:var(--text-sm)] font-medium text-[var(--text-primary)]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                {t('components.mfa.on')}
              </div>
              <p className="text-[length:var(--text-xs)] text-[var(--text-tertiary)] mt-1">
                {stage.lastUsedAt
                  ? t('components.mfa.lastUsed', { date: new Date(stage.lastUsedAt).toLocaleString(i18n.language?.startsWith('zh') ? 'zh-CN' : undefined) })
                  : t('components.mfa.promptEverySignIn')}
              </p>
            </div>
            <button
              type="button"
              onClick={askDisable}
              disabled={busy}
              className="px-3 py-1.5 rounded-[var(--radius-md)] border border-red-200 text-red-700 text-[length:var(--text-xs)] font-semibold hover:bg-red-50 disabled:opacity-50"
            >
              {t('components.mfa.disable')}
            </button>
          </div>
        )}

        {stage.kind === 'disabling' && (
          <form onSubmit={submitDisable} className="space-y-3">
            <div>
              <div className="text-[length:var(--text-sm)] font-semibold text-[var(--text-primary)]">
                {t('components.mfa.confirmDisable')}
              </div>
              <p className="text-[length:var(--text-xs)] text-[var(--text-tertiary)] mt-1">
                {t('components.mfa.confirmDisableBody')}
              </p>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('components.mfa.currentPassword')}
              autoFocus
              className="w-full max-w-sm h-9 px-3 rounded border border-[var(--border-default)] text-[length:var(--text-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy || password.length === 0}
                className="px-3 py-1.5 rounded-[var(--radius-md)] bg-red-600 text-white text-[length:var(--text-xs)] font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? t('components.mfa.disabling') : t('components.mfa.disable2fa')}
              </button>
              <button
                type="button"
                onClick={cancelDisable}
                className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] text-[length:var(--text-xs)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
