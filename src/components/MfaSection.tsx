import { FormEvent, useCallback, useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { ShieldCheck, ShieldAlert, Loader2, Copy, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { SealCheck, StatusPill, notify } from './ui'
import { useFmt } from '../lib/fmt'
import { iconSwapVariants, transition } from '../motion/tokens'
import { useTranslation } from 'react-i18next'
import { auth as authApi, type MfaEnrollResponse, type MfaStatusResponse } from '../lib/api'

type Stage =
  | { kind: 'loading' }
  | { kind: 'error' }                                     // status could not be read — never shown as "off"
  | { kind: 'disabled' }                                  // not enrolled
  | { kind: 'enrolling'; data: MfaEnrollResponse }        // /enroll done, awaiting verify
  | { kind: 'enabled'; lastUsedAt: string | null }        // already on
  | { kind: 'disabling' }                                  // password prompt for disable

/**
 * Self-contained MFA management widget. Plugged into Settings → Security.
 * Talks to /api/auth/mfa/* directly. `onStatusChange` lets the page flag the
 * Security tab while 2FA is off. `headless` drops the built-in heading when the
 * host section already renders one.
 */
export default function MfaSection({ onStatusChange, headless = false }: { onStatusChange?: (enabled: boolean | null) => void; headless?: boolean } = {}) {
  const { t } = useTranslation()
  const f = useFmt()
  const [justEnabled, setJustEnabled] = useState(false)
  const [stage, setStage] = useState<Stage>({ kind: 'loading' })
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copiedRecovery, setCopiedRecovery] = useState(false)

  const loadStatus = useCallback(async (isCancelled: () => boolean = () => false) => {
    setStage({ kind: 'loading' })
    setError(null)
    try {
      const status = await authApi.mfaStatus()
      if (isCancelled()) return
      setStage(stageFromStatus(status))
    } catch (e) {
      if (isCancelled()) return
      setError(e instanceof Error ? e.message : t('components.mfa.loadFailed'))
      setStage({ kind: 'error' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false
    void loadStatus(() => cancelled)
    return () => { cancelled = true }
  }, [loadStatus])

  useEffect(() => {
    if (!onStatusChange) return
    if (stage.kind === 'enabled') onStatusChange(true)
    else if (stage.kind === 'disabled') onStatusChange(false)
    else if (stage.kind === 'error') onStatusChange(null)
  }, [stage.kind, onStatusChange])

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
      setJustEnabled(true)
      setCode('')
      notify.success(t('components.mfa.on'))
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
      setJustEnabled(false)
      setPassword('')
      notify.info(t('components.mfa.off'))
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

  const btnPrimary = 'btn-primary h-10'
  const btnSecondary = 'btn-secondary h-10'

  return (
    <section className="space-y-3" aria-labelledby={headless ? undefined : 'mfa-title'}>
      {!headless && (
        <>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--text-tertiary)]" aria-hidden />
            <h2 id="mfa-title" className="type-h3 text-[var(--text-primary)]">{t('components.mfa.title')}</h2>
          </div>
          <p className="text-small text-[var(--text-secondary)] max-w-[64ch]">{t('components.mfa.intro')}</p>
        </>
      )}

      <div className="surface-paper p-4 sm:p-5 space-y-4">
        {error && stage.kind !== 'error' && (
          <div role="alert" className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--status-danger-line)] bg-[var(--status-danger-soft)] p-3 text-small text-[var(--status-danger)]">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden />
            <p>{error}</p>
          </div>
        )}

        {stage.kind === 'loading' && (
          <div role="status" className="flex items-center gap-2 text-small text-[var(--text-secondary)]">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> {t('components.mfa.checking')}
          </div>
        )}

        {stage.kind === 'error' && (
          <div role="alert" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-small text-[var(--text-secondary)]">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--status-danger)]" aria-hidden />
              <div>
                <div className="font-medium text-[var(--text-primary)]">{t('components.mfa.loadFailed')}</div>
                {error && error !== t('components.mfa.loadFailed') && <div className="text-caption text-[var(--text-tertiary)] mt-0.5 break-words">{error}</div>}
              </div>
            </div>
            <button type="button" onClick={() => void loadStatus()} className={btnSecondary}>
              <RotateCcw className="w-4 h-4" aria-hidden /> {t('ui.state.retry')}
            </button>
          </div>
        )}

        {stage.kind === 'disabled' && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span aria-hidden className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--status-warning-soft)] text-[var(--status-warning)]">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2 text-body font-semibold text-[var(--text-primary)]">
                  {t('components.mfa.off')}
                </div>
                <p className="text-small text-[var(--text-secondary)] mt-0.5">{t('components.mfa.recommended')}</p>
              </div>
            </div>
            <button type="button" onClick={startEnroll} disabled={busy} className={btnPrimary}>
              {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
              {busy ? t('components.mfa.settingUp') : t('components.mfa.enable')}
            </button>
          </div>
        )}

        {stage.kind === 'enrolling' && (
          <ol className="space-y-5">
            <li>
              <div className="text-small font-semibold text-[var(--text-primary)] mb-1">{t('components.mfa.step1')}</div>
              <p className="text-caption text-[var(--text-tertiary)] mb-3">{t('components.mfa.step1Body')}</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                {/* QR codes need a white quiet zone in both themes to scan reliably. */}
                <div className="inline-block self-start rounded-[var(--radius-md)] border border-[var(--border-default)] bg-white p-3">
                  <QRCodeSVG value={stage.data.otpauthUri} size={168} marginSize={0} />
                </div>
                <div className="text-caption text-[var(--text-tertiary)] min-w-0">
                  {t('components.mfa.manualSecret')}
                  <code className="mt-1 block break-all rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] px-2 py-1 font-mono text-caption text-[var(--text-primary)]">
                    {stage.data.secret}
                  </code>
                </div>
              </div>
            </li>

            <li className="rounded-[var(--radius-lg)] border border-[var(--status-warning-line)] bg-[var(--status-warning-soft)] p-3 sm:p-4">
              <div className="text-small font-semibold text-[var(--text-primary)] mb-1">{t('components.mfa.step2')}</div>
              <p className="text-caption text-[var(--text-secondary)] mb-3">{t('components.mfa.step2Body')}</p>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-caption mb-3">
                {stage.data.recoveryCodes.map(rc => (
                  <code key={rc} className="rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 py-1 text-[var(--text-primary)]">{rc}</code>
                ))}
              </div>
              <button
                type="button"
                onClick={() => copyRecoveryCodes(stage.data.recoveryCodes)}
                className="inline-flex h-9 items-center gap-1.5 text-caption font-semibold text-[var(--text-primary)] hover:underline underline-offset-2"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={copiedRecovery ? 'ok' : 'copy'} variants={iconSwapVariants} initial="initial" animate="enter" exit="exit" className="inline-flex">
                    {copiedRecovery ? <CheckCircle2 className="w-3.5 h-3.5 text-[var(--status-success)]" aria-hidden /> : <Copy className="w-3.5 h-3.5" aria-hidden />}
                  </motion.span>
                </AnimatePresence>
                {copiedRecovery ? t('components.mfa.copied') : t('components.mfa.copyAll')}
              </button>
            </li>

            <li>
              <form onSubmit={verifyEnroll} className="space-y-3">
                <label htmlFor="mfa-enroll-code" className="block text-small font-semibold text-[var(--text-primary)]">
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
                  className="h-10 w-36 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 font-mono text-body tracking-[0.3em] text-[var(--text-primary)] focus:outline-none focus-visible:border-[var(--color-brand)] focus-visible:ring-2 focus-visible:ring-[var(--status-success-line)]"
                />
                <div className="flex flex-wrap gap-2">
                  <button type="submit" disabled={busy || code.trim().length < 6} className={btnPrimary}>
                    {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
                    {busy ? t('components.mfa.verifying') : t('components.mfa.verifyEnable')}
                  </button>
                  <button type="button" onClick={() => { setStage({ kind: 'disabled' }); setCode('') }} className={btnSecondary}>
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            </li>
          </ol>
        )}

        {stage.kind === 'enabled' && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span aria-hidden className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                <SealCheck size={40} ripple={justEnabled} />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2 text-body font-semibold text-[var(--text-primary)]">
                  {t('components.mfa.on')}
                </div>
                <p className="text-small text-[var(--text-secondary)] mt-0.5">
                  {stage.lastUsedAt ? t('components.mfa.lastUsed', { date: f.dateTime(stage.lastUsedAt) }) : t('components.mfa.promptEverySignIn')}
                </p>
              </div>
            </div>
            <button type="button" onClick={askDisable} disabled={busy} className="btn-secondary h-10 text-[var(--status-danger)] hover:border-[var(--status-danger-line)] hover:bg-[var(--status-danger-soft)]">
              {t('components.mfa.disable')}
            </button>
          </div>
        )}

        {stage.kind === 'disabling' && (
          <motion.form initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={transition.fast} onSubmit={submitDisable} className="space-y-3">
            <div>
              <div className="text-small font-semibold text-[var(--text-primary)]">{t('components.mfa.confirmDisable')}</div>
              <p className="text-caption text-[var(--text-tertiary)] mt-1">{t('components.mfa.confirmDisableBody')}</p>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('components.mfa.currentPassword')}
              aria-label={t('components.mfa.currentPassword')}
              autoComplete="current-password"
              autoFocus
              className="h-10 w-full max-w-sm rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 text-body text-[var(--text-primary)] focus:outline-none focus-visible:border-[var(--color-brand)] focus-visible:ring-2 focus-visible:ring-[var(--status-success-line)]"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={busy || password.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--btn-danger-bg)] px-4 text-small font-semibold text-[var(--btn-danger-fg)] disabled:opacity-50"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
                {busy ? t('components.mfa.disabling') : t('components.mfa.disable2fa')}
              </button>
              <button type="button" onClick={cancelDisable} className={btnSecondary}>
                {t('common.cancel')}
              </button>
            </div>
          </motion.form>
        )}
      </div>
    </section>
  )
}

/** Compact status pill for 2FA (used in headers). */
export function MfaPill({ enabled }: { enabled: boolean | null }) {
  const { t } = useTranslation()
  if (enabled == null) return null
  return enabled
    ? <StatusPill tone="success">{t('components.mfa.on')}</StatusPill>
    : <StatusPill tone="warning" dot>{t('components.mfa.off')}</StatusPill>
}
