import { useEffect, useState } from 'react'
import { Link2, AlertTriangle, ExternalLink } from 'lucide-react'
import { getFramework } from '../lib/frameworks'
import { conceptMappings } from '../lib/api'
import { Trans, useTranslation } from 'react-i18next'
import { itemLabel } from '../lib/itemLabel'

function frameworkLabel(id: string): string {
  return getFramework(id)?.code ?? id.toUpperCase()
}

/**
 * Linked-data panel for the data-entry experience.
 *
 * Shows:
 *   • a "🔗 Auto-filled from <framework>" badge if the row is derived
 *   • a "⚠ Locally overridden" badge if is_overridden=true
 *   • a "this value appears in N frameworks" list with deep links to each
 *
 * Fetches /api/concept-mappings?questionnaire_item_id=… on mount.
 */
export interface LinkedDataPanelProps {
  questionnaireItemId: string
  /** Optional — if the displayed data_value has these flags, show inline badges. */
  derivedFrom?: string | null
  isOverridden?: boolean
  /** Called when the user picks a peer disclosure to jump to (deep link). */
  onPeerClick?: (peer: PeerMapping) => void
}

export interface PeerMapping {
  id: string
  concept_key: string
  framework_id: string
  questionnaire_item_id: string
  unit_conversion: number
  gri_code: string | null
  line_item: string | null
  line_item_zh?: string | null
  unit: string | null
  section: string | null
}

interface ApiResp {
  concept_key: string | null
  mappings: PeerMapping[]
}

export function LinkedDataPanel({
  questionnaireItemId,
  derivedFrom,
  isOverridden,
  onPeerClick,
}: LinkedDataPanelProps) {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState<ApiResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    conceptMappings.forQuestion(questionnaireItemId)
      .then(j => setData(j as ApiResp))
      .catch(() => setData({ concept_key: null, mappings: [] }))
      .finally(() => setLoading(false))
  }, [questionnaireItemId])

  if (loading || !data || !data.concept_key) return null

  const peers = data.mappings.filter(m => m.questionnaire_item_id !== questionnaireItemId)
  if (peers.length === 0 && !derivedFrom && !isOverridden) return null

  return (
    <div className="surface-paper overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-[var(--color-brand)]" />
            <span className="kicker !mb-0">{t('components.linked.title')}</span>
          </div>
          <span className="text-caption text-[var(--text-tertiary)] font-mono">{data.concept_key}</span>
        </div>

        {(derivedFrom || isOverridden) && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {derivedFrom && (
              <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-[var(--accent-teal-subtle)] text-[var(--color-brand-strong)] text-caption font-semibold">
                <Link2 className="w-3 h-3" />
                {t('components.linked.autoFilled')}
              </span>
            )}
            {isOverridden && (
              <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-amber-100 text-amber-800 text-caption font-semibold">
                <AlertTriangle className="w-3 h-3" />
                {t('components.linked.overridden')}
              </span>
            )}
          </div>
        )}

        <p className="text-[12px] text-[var(--text-tertiary)] mb-3 leading-relaxed">
          <Trans i18nKey="components.linked.appearsIn" values={{ count: peers.length + 1 }} components={{ b: <strong className="text-[var(--text-primary)]" /> }} />
        </p>

        <ul className="space-y-1.5">
          {peers.map(p => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPeerClick?.(p)}
                className="w-full flex items-center justify-between gap-3 px-3 h-10 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex items-center justify-center px-2 h-6 rounded-[6px] bg-[var(--bg-tertiary)] text-micro font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                    {frameworkLabel(p.framework_id)}
                  </span>
                  <span className="text-[12px] font-mono text-[var(--text-secondary)]">{p.gri_code}</span>
                  <span className="text-[12px] text-[var(--text-primary)] truncate">{itemLabel(p, i18n.language)}</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
