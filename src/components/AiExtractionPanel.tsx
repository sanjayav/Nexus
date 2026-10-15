/**
 * AiExtractionPanel — reusable Glass-UI card that asks Claude to extract the
 * primary numeric value from a single uploaded evidence file, then offers
 * the user a one-click "use this value" CTA.
 *
 * Composition contract: the parent owns the data-value form. When the user
 * accepts an extraction we hand the parent the structured result and let
 * it decide what to do (pre-fill inputs, kick off `acceptExtraction()` once
 * a data_value row exists, etc.). Keeping the component dumb keeps the
 * audit-trail wiring in DataEntry where the data_value_id lives.
 */
import { useState } from 'react'
import { Loader2, Sparkles, AlertCircle, CheckCircle2, BadgeCheck, Lock } from 'lucide-react'
import { ai, isUnconfiguredError, type AiExtractionResult } from '../lib/api'
import { useIntegrationStatus } from '../lib/integrations'

interface Props {
  evidenceId: string
  /** Filename shown in the panel header — purely cosmetic. */
  filename?: string
  /** Optional hints forwarded to Claude to anchor the extraction. */
  questionnaireItemId?: string
  expectedUnit?: string
  expectedPeriod?: string
  lineItemHint?: string
  /** Invoked when the user clicks "Use this value". */
  onAccept: (extraction: AiExtractionResult) => void
  /** Disables the extract button (e.g. parent has already locked the form). */
  disabled?: boolean
}

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'result'; extraction: AiExtractionResult }

function ConfidenceBadge({ value }: { value: number }) {
  // Banded so the user can spot low-confidence extractions before they accept.
  // ≥0.8 green, 0.5-0.8 amber, <0.5 red — same colour vocabulary as the rest
  // of the Nexus status chips.
  const pct = Math.round(value * 100)
  const palette =
    value >= 0.8
      ? { bg: 'var(--accent-green-light)', fg: 'var(--status-ok)', label: 'High' }
      : value >= 0.5
      ? { bg: 'var(--accent-amber-light)', fg: 'var(--status-draft)', label: 'Medium' }
      : { bg: 'var(--accent-red-light)', fg: 'var(--status-reject)', label: 'Low' }
  return (
    <span
      className="px-2 py-0.5 rounded-[var(--radius-sm)] text-[10px] font-semibold uppercase tracking-wider inline-flex items-center gap-1"
      style={{ background: palette.bg, color: palette.fg }}
    >
      <BadgeCheck className="w-3 h-3" /> {palette.label} · {pct}%
    </span>
  )
}

export default function AiExtractionPanel({
  evidenceId,
  filename,
  questionnaireItemId,
  expectedUnit,
  expectedPeriod,
  lineItemHint,
  onAccept,
  disabled,
}: Props) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const integrations = useIntegrationStatus()
  // While the health probe is still loading we keep the button disabled but
  // skip the tooltip — clicking would race the probe and confuse the user.
  const aiUnavailable = !integrations.loading && !integrations.ai

  const runExtraction = async () => {
    setStatus({ kind: 'loading' })
    try {
      const res = await ai.extractEvidence({
        evidenceId,
        questionnaireItemId,
        expectedUnit,
        expectedPeriod,
        lineItemHint,
      })
      setStatus({ kind: 'result', extraction: res.extraction })
    } catch (e) {
      const message = isUnconfiguredError(e)
        ? 'AI is not configured. Ask an admin to set ANTHROPIC_API_KEY.'
        : e instanceof Error ? e.message : 'Extraction failed'
      setStatus({ kind: 'error', message })
    }
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/60 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          <Sparkles className="w-3 h-3 text-[var(--color-brand)]" />
          AI extraction
          {filename && (
            <span className="normal-case tracking-normal font-normal text-[var(--text-quaternary)] truncate max-w-[180px]">
              · {filename}
            </span>
          )}
        </div>
        {status.kind === 'idle' && (
          <button
            type="button"
            onClick={runExtraction}
            disabled={disabled || aiUnavailable || integrations.loading}
            title={aiUnavailable ? 'AI is not configured. Ask an admin to set ANTHROPIC_API_KEY.' : undefined}
            aria-label={aiUnavailable ? 'AI is not configured. Ask an admin to set ANTHROPIC_API_KEY.' : 'Extract data with AI'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-semibold text-white bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {aiUnavailable ? <Lock className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
            {aiUnavailable ? 'AI unavailable' : 'Extract data with AI'}
          </button>
        )}
      </div>

      {/* Idle-state hint when the env isn't wired up. Keep it terse — the
          panel is small and re-used in tight rails. */}
      {status.kind === 'idle' && aiUnavailable && (
        <div className="mt-2 text-[10.5px] text-[var(--text-tertiary)] leading-snug">
          AI features not configured in this environment. Ask an admin to set <code className="font-mono">ANTHROPIC_API_KEY</code>.
        </div>
      )}

      {status.kind === 'loading' && (
        <div className="flex items-center gap-2 mt-2 text-[12px] text-[var(--text-secondary)]">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-brand)]" />
          Reading document…
        </div>
      )}

      {status.kind === 'error' && (
        <div className="mt-2 flex items-start gap-2 p-2 rounded-[var(--radius-sm)] bg-[var(--accent-red-light)] text-[11px] text-[var(--status-reject)]">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="font-semibold">Extraction failed</div>
            <div className="font-mono text-[10.5px] break-words">{status.message}</div>
            <button
              type="button"
              onClick={() => setStatus({ kind: 'idle' })}
              className="mt-1 text-[10.5px] font-medium text-[var(--color-brand)] hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {status.kind === 'result' && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="font-mono tabular-nums text-[18px] text-[var(--text-primary)] font-semibold">
              {status.extraction.value}
              {status.extraction.unit && (
                <span className="ml-1 text-[12px] text-[var(--text-tertiary)] font-normal">
                  {status.extraction.unit}
                </span>
              )}
            </div>
            <ConfidenceBadge value={status.extraction.confidence} />
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {status.extraction.period && (
              <div>
                <div className="text-[var(--text-quaternary)] uppercase tracking-wider font-semibold text-[9.5px]">
                  Period
                </div>
                <div className="text-[var(--text-primary)]">{status.extraction.period}</div>
              </div>
            )}
            {status.extraction.supplier && (
              <div>
                <div className="text-[var(--text-quaternary)] uppercase tracking-wider font-semibold text-[9.5px]">
                  Supplier
                </div>
                <div className="text-[var(--text-primary)]">{status.extraction.supplier}</div>
              </div>
            )}
          </div>

          <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            <span className="font-semibold text-[var(--text-tertiary)]">Reasoning: </span>
            {status.extraction.reasoning}
          </div>

          {status.extraction.additionalNotes && (
            <div className="text-[10.5px] text-[var(--text-tertiary)] italic leading-relaxed">
              {status.extraction.additionalNotes}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onAccept(status.extraction)}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-[11px] font-semibold text-white bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] disabled:opacity-50 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Use this value
            </button>
            <button
              type="button"
              onClick={() => setStatus({ kind: 'idle' })}
              className="text-[10.5px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            >
              Re-extract
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
