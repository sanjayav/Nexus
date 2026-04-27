import { useState } from 'react'
import { RotateCcw, AlertTriangle, X, Loader2, CheckCircle2 } from 'lucide-react'
import { orgStore } from '../lib/orgStore'

interface Props {
  /** Callback after successful reset — parent should reload data + navigate. */
  onReset: () => void
  /** Tone of the trigger. "subtle" = small text link, "danger" = full button. */
  variant?: 'subtle' | 'danger'
}

/**
 * Admin-only reset action. Wipes onboarding data so the workspace can be
 * re-seeded with a fresh state — needed when a previous seed has left
 * data in the DB that makes a "fresh demo" impossible.
 *
 * Confirmation requires typing "RESET" because this is destructive.
 */
export default function ResetWorkspaceButton({ onReset, variant = 'subtle' }: Props) {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleReset = async () => {
    if (confirmText !== 'RESET') return
    setBusy(true)
    setError(null)
    try {
      await orgStore.resetWorkspace()
      setDone(true)
      setTimeout(() => {
        setOpen(false)
        setConfirmText('')
        setDone(false)
        onReset()
      }, 800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed')
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    setOpen(false); setConfirmText(''); setError(null); setDone(false)
  }

  const triggerClass = variant === 'danger'
    ? 'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[8px] border border-[var(--status-reject)]/30 text-[12.5px] font-semibold text-[var(--status-reject)] hover:bg-[var(--accent-red-light)] cursor-pointer'
    : 'inline-flex items-center gap-1 text-[11.5px] font-medium text-[var(--text-tertiary)] hover:text-[var(--status-reject)] cursor-pointer transition-colors'

  return (
    <>
      <button onClick={() => setOpen(true)} className={triggerClass} title="Wipe workspace data — keeps users + login">
        <RotateCcw className="w-3.5 h-3.5" />
        Reset workspace
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(11,18,32,0.5)', backdropFilter: 'blur(8px)' }}
          onClick={busy ? undefined : reset}
        >
          <div className="surface-paper w-full max-w-md" onClick={e => e.stopPropagation()}>
            <header className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: 'var(--accent-red-light)', color: 'var(--status-reject)' }}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="font-display text-[17px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">Reset workspace?</h3>
              </div>
              {!busy && (
                <button onClick={reset} className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              )}
            </header>

            {!done && (
              <div className="p-5 space-y-3">
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                  This permanently removes <strong className="text-[var(--text-primary)]">all entities, members, climate targets, material topics, reporting periods, assignments, assurance requests, and published reports</strong> in this workspace.
                </p>
                <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed">
                  Preserved: your login, users + roles, the GRI questionnaire catalogue, and the audit trail.
                </p>
                <div className="p-3 rounded-[8px] bg-[var(--accent-red-light)] border border-[rgba(220,38,38,0.3)]">
                  <p className="text-[11.5px] text-[var(--status-reject)] font-medium">
                    Type <strong className="font-mono">RESET</strong> below to confirm.
                  </p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}
                    autoFocus
                    placeholder="RESET"
                    disabled={busy}
                    className="w-full mt-2 h-9 px-3 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--status-reject)]/20"
                  />
                </div>
                {error && (
                  <div className="text-[11.5px] text-[var(--status-reject)]">{error}</div>
                )}
              </div>
            )}

            {done && (
              <div className="p-5 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[var(--status-ok)]" />
                <span className="text-[13px] font-semibold text-[var(--status-ok)]">Workspace reset. Reloading…</span>
              </div>
            )}

            {!done && (
              <footer className="flex items-center gap-2 p-5 border-t border-[var(--border-subtle)]">
                <button onClick={reset} disabled={busy} className="flex-1 h-10 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] text-[13px] font-semibold hover:bg-[var(--bg-secondary)] cursor-pointer disabled:opacity-60">
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  disabled={busy || confirmText !== 'RESET'}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-[8px] bg-[var(--status-reject)] text-white text-[13px] font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {busy
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Resetting…</>
                    : <><RotateCcw className="w-3.5 h-3.5" /> Reset everything</>}
                </button>
              </footer>
            )}
          </div>
        </div>
      )}
    </>
  )
}
