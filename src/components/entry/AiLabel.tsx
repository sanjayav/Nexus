import { useTranslation } from 'react-i18next'
import { Sparkles, Lock } from 'lucide-react'
import type { AiGeneratedLabel } from '../../lib/api'

/**
 * Mandatory AI-content label (CAC 《人工智能生成合成内容标识办法》). Shows the
 * label text the API returned (`ai_label`) — never a client-side paraphrase —
 * and falls back to our own copy only when an older endpoint omits it.
 */
export function AiLabel({ meta, className = '' }: { meta?: AiGeneratedLabel | null; className?: string }) {
  const { t } = useTranslation()
  const label = meta?.ai_label || t('entry.ai.label')
  const detail = [meta?.ai_provider, meta?.ai_model].filter(Boolean).join(' · ')
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 h-6 rounded-full border border-[var(--status-info-line)] bg-[var(--status-info-soft)] text-[var(--status-info)] text-caption font-medium whitespace-nowrap ${className}`}
      title={detail ? `${label} (${detail})` : label}
      data-testid="ai-label"
    >
      <Sparkles className="w-3 h-3 flex-shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  )
}

/** Clear, non-alarming state for orgs that switched AI off (403 `ai_disabled`). */
export function AiDisabledNotice({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      data-testid="ai-disabled"
      className={`flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] ${compact ? 'px-3 py-2' : 'px-3.5 py-3'}`}
    >
      <span className="mt-0.5 w-6 h-6 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] flex items-center justify-center flex-shrink-0">
        <Lock className="w-3 h-3" aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="text-small font-semibold text-[var(--text-primary)]">{t('entry.ai.disabledTitle')}</div>
        <p className="text-caption text-[var(--text-secondary)] mt-0.5">{t('entry.ai.disabledBody')}</p>
      </div>
    </div>
  )
}
