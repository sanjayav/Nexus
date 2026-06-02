/**
 * FactDetailsPanel — Workiva-style XBRL "click any number, see the fact"
 * surface. Replaces the linked-data + metadata content of the cell rail
 * with a richer fact-centric view:
 *
 *   • Concept         — gri_code + line_item (the XBRL concept name)
 *   • Dimensions      — period FY, scope_split, reporting_scope
 *   • Fiscal Period   — start/end derived from reportingYear
 *   • Source Value    — assignment.value or data_value.value + unit
 *   • XBRL Footnotes  — fetched from /api/footnotes, add/delete inline
 *   • Other Fact Locations — concept_mappings peers (clickable to navigate)
 *
 * Footnote add/delete is gated on `data.upload`. "Override locally" is
 * gated on `data.approve` and calls /api/concept-mappings (action='override')
 * via the existing `conceptMappings.override` client.
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Link2, ExternalLink, Plus, Trash2, Loader2, AlertTriangle, MessageSquare, Lock,
} from 'lucide-react'
import {
  conceptMappings, footnotes as footnotesApi, type ConceptPeer, type XbrlFootnote,
  type NexusQuestionnaireItem,
} from '../../lib/api'
import type { QuestionAssignment } from '../../lib/orgStore'
import { getFramework } from '../../lib/frameworks'
import { useAuth } from '../../auth/AuthContext'
import { hasPermission } from '../../lib/rbac'

export interface FactDetailsPanelProps {
  item: NexusQuestionnaireItem
  assignment: QuestionAssignment | null
  reportingYear: number
  /** Optional override — defaults to the current framework id of the URL. */
  currentFrameworkId: string
}

function frameworkLabel(id: string): string {
  return getFramework(id)?.code ?? id.toUpperCase()
}

function formatValue(v: number | null | undefined, unit: string | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const formatted = Math.abs(v) >= 1
    ? Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })
    : String(v)
  return unit ? `${formatted} ${unit}` : formatted
}

export default function FactDetailsPanel({
  item, assignment, reportingYear, currentFrameworkId,
}: FactDetailsPanelProps) {
  const navigate = useNavigate()
  const { permissions } = useAuth()
  const canEditFootnotes = hasPermission(permissions, 'data.upload')
  const canOverride = hasPermission(permissions, 'data.approve')

  const [peers, setPeers] = useState<ConceptPeer[]>([])
  const [conceptKey, setConceptKey] = useState<string | null>(null)
  const [loadingPeers, setLoadingPeers] = useState(true)
  const [foots, setFoots] = useState<XbrlFootnote[]>([])
  const [loadingFoots, setLoadingFoots] = useState(false)
  const [newFootnote, setNewFootnote] = useState('')
  const [adding, setAdding] = useState(false)
  const [footError, setFootError] = useState<string | null>(null)
  const [overrideBusy, setOverrideBusy] = useState(false)
  const [overrideError, setOverrideError] = useState<string | null>(null)
  const [overridden, setOverridden] = useState(false)

  // Reset state on cell change.
  useEffect(() => {
    setPeers([])
    setConceptKey(null)
    setFoots([])
    setNewFootnote('')
    setFootError(null)
    setOverrideError(null)
    setOverridden(false)
  }, [item.id])

  // Load concept peers.
  useEffect(() => {
    let cancelled = false
    setLoadingPeers(true)
    conceptMappings.forQuestion(item.id)
      .then(res => {
        if (cancelled) return
        setConceptKey(res.concept_key)
        setPeers(res.mappings.filter(p => p.questionnaire_item_id !== item.id))
      })
      .catch(() => {
        if (!cancelled) { setConceptKey(null); setPeers([]) }
      })
      .finally(() => { if (!cancelled) setLoadingPeers(false) })
    return () => { cancelled = true }
  }, [item.id])

  // Load footnotes — only when we have a data_value (assignment) to anchor them to.
  useEffect(() => {
    let cancelled = false
    if (!assignment) { setFoots([]); return }
    setLoadingFoots(true)
    footnotesApi.list(assignment.id)
      .then(res => { if (!cancelled) setFoots(res.footnotes) })
      .catch(() => { if (!cancelled) setFoots([]) })
      .finally(() => { if (!cancelled) setLoadingFoots(false) })
    return () => { cancelled = true }
  }, [assignment])

  const handleAddFootnote = useCallback(async () => {
    if (!assignment || !newFootnote.trim()) return
    setAdding(true); setFootError(null)
    try {
      const res = await footnotesApi.create(assignment.id, newFootnote.trim())
      setFoots(prev => [...prev, res.footnote])
      setNewFootnote('')
    } catch (e) {
      setFootError(e instanceof Error ? e.message : 'Failed to add footnote')
    } finally {
      setAdding(false)
    }
  }, [assignment, newFootnote])

  const handleDeleteFootnote = useCallback(async (id: string) => {
    try {
      await footnotesApi.remove(id)
      setFoots(prev => prev.filter(f => f.id !== id))
    } catch (e) {
      setFootError(e instanceof Error ? e.message : 'Delete failed')
    }
  }, [])

  const handlePeerClick = useCallback((peer: ConceptPeer) => {
    if (peer.framework_id === currentFrameworkId) {
      // Same framework — change URL search param, parent's syncing effect picks it up.
      navigate(`/disclosure-editor/${peer.framework_id}?cell=${peer.questionnaire_item_id}`)
    } else {
      navigate(`/disclosure-editor/${peer.framework_id}?cell=${peer.questionnaire_item_id}`)
    }
  }, [navigate, currentFrameworkId])

  const handleOverride = useCallback(async () => {
    if (!assignment) return
    setOverrideBusy(true); setOverrideError(null)
    try {
      await conceptMappings.override(assignment.id)
      setOverridden(true)
    } catch (e) {
      setOverrideError(e instanceof Error ? e.message : 'Override failed')
    } finally {
      setOverrideBusy(false)
    }
  }, [assignment])

  const dimensions: string[] = []
  dimensions.push(`Period FY${reportingYear}`)
  if (item.scope_split) dimensions.push(item.scope_split.replace(/_/g, ' '))
  if (item.reporting_scope) dimensions.push(item.reporting_scope === 'jv' ? 'JV' : 'Group')

  const period = {
    start: `${reportingYear}-01-01`,
    end:   `${reportingYear}-12-31`,
  }

  const valueDisplay = formatValue(assignment?.value ?? null, item.unit)
  const xbrlConcept = `${currentFrameworkId.split('-')[0] ?? 'esrs'}:${item.line_item.replace(/[^a-z0-9]/gi, '')}`

  return (
    <section data-testid="fact-details-panel" className="space-y-5">
      {/* Concept */}
      <div>
        <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">
          Concept
        </div>
        <div className="text-[12px] font-semibold text-[var(--text-primary)] leading-snug">
          {item.line_item}
        </div>
        <div className="text-[10px] font-mono text-[var(--text-tertiary)] mt-1 truncate" title={xbrlConcept}>
          {xbrlConcept}
        </div>
      </div>

      {/* Dimensions */}
      <div>
        <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">
          Dimensions
        </div>
        <div className="flex flex-wrap gap-1">
          {dimensions.map(d => (
            <span key={d} className="inline-flex items-center px-2 h-5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-[10px] font-medium">
              {d}
            </span>
          ))}
        </div>
      </div>

      {/* Fiscal Period */}
      <div>
        <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">
          Fiscal Period
        </div>
        <div className="text-[11px] font-mono text-[var(--text-primary)]">
          {period.start} → {period.end}
        </div>
      </div>

      {/* Source Value */}
      <div>
        <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">
          Source Value
        </div>
        <div className="text-[14px] font-semibold text-[var(--text-primary)] font-mono">
          {valueDisplay}
        </div>
      </div>

      {/* XBRL Footnotes */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            XBRL Footnotes
          </div>
          {foots.length > 0 && (
            <span className="text-[9px] text-[var(--text-tertiary)]">{foots.length}</span>
          )}
        </div>
        {!assignment ? (
          <p className="text-[11px] text-[var(--text-tertiary)] italic">
            Enter a value to attach XBRL footnotes.
          </p>
        ) : loadingFoots ? (
          <Loader2 className="w-3 h-3 animate-spin text-[var(--text-tertiary)]" />
        ) : (
          <>
            {foots.length === 0 ? (
              <p className="text-[11px] text-[var(--text-tertiary)] italic">No footnotes yet.</p>
            ) : (
              <ul className="space-y-1.5 mb-2">
                {foots.map(f => (
                  <li
                    key={f.id}
                    className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-2 text-[11px] text-[var(--text-primary)] leading-relaxed flex items-start justify-between gap-2"
                  >
                    <span className="flex-1">{f.footnote_text}</span>
                    {canEditFootnotes && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteFootnote(f.id)}
                        className="text-[var(--text-tertiary)] hover:text-[var(--status-reject)] flex-shrink-0"
                        aria-label="Delete footnote"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {canEditFootnotes && (
              <div className="space-y-1.5">
                <textarea
                  value={newFootnote}
                  onChange={e => setNewFootnote(e.target.value)}
                  placeholder="Apply a new footnote…"
                  rows={2}
                  disabled={adding}
                  className="w-full px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] resize-none"
                />
                <button
                  type="button"
                  onClick={() => void handleAddFootnote()}
                  disabled={adding || !newFootnote.trim()}
                  className="inline-flex items-center gap-1 px-2 h-6 rounded-[var(--radius-sm)] bg-[var(--color-brand)] text-white text-[10px] font-semibold hover:bg-[var(--color-brand-strong)] disabled:opacity-50"
                >
                  {adding
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Adding…</>
                    : <><Plus className="w-3 h-3" /> Apply New Footnote</>}
                </button>
                {footError && (
                  <div className="text-[10px] text-[var(--status-reject)] flex items-start gap-1">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span>{footError}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Other Fact Locations */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] flex items-center gap-1">
            <Link2 className="w-3 h-3 text-[var(--color-brand)]" />
            Other Fact Locations
            {!loadingPeers && peers.length > 0 && (
              <span className="text-[var(--text-tertiary)] font-mono">({peers.length})</span>
            )}
          </div>
          {conceptKey && (
            <span className="text-[9px] font-mono text-[var(--text-tertiary)] truncate max-w-[120px]" title={conceptKey}>
              {conceptKey}
            </span>
          )}
        </div>
        {loadingPeers ? (
          <Loader2 className="w-3 h-3 animate-spin text-[var(--text-tertiary)]" />
        ) : peers.length === 0 ? (
          <p className="text-[11px] text-[var(--text-tertiary)] italic">
            Not linked to any other framework.
          </p>
        ) : (
          <ul className="space-y-1">
            {peers.map(p => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => handlePeerClick(p)}
                  data-testid={`fact-peer-${p.framework_id}`}
                  className="w-full flex items-center gap-2 px-2 h-7 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-left text-[10px]"
                >
                  <span className="inline-flex items-center justify-center px-1.5 h-4 rounded-[var(--radius-xs)] bg-[var(--bg-tertiary)] text-[9px] font-bold uppercase tracking-wide text-[var(--text-secondary)] flex-shrink-0">
                    {frameworkLabel(p.framework_id)}
                  </span>
                  <span className="font-mono text-[var(--text-tertiary)] flex-shrink-0">{p.gri_code}</span>
                  <span className="text-[var(--text-primary)] truncate">{p.line_item}</span>
                  <ExternalLink className="w-2.5 h-2.5 text-[var(--text-tertiary)] ml-auto flex-shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Override locally */}
        {assignment && peers.length > 0 && (
          <div className="mt-2 flex items-center justify-between">
            {overridden ? (
              <span className="inline-flex items-center gap-1 px-2 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
                <AlertTriangle className="w-3 h-3" /> Locally overridden
              </span>
            ) : canOverride ? (
              <button
                type="button"
                onClick={() => void handleOverride()}
                disabled={overrideBusy}
                className="inline-flex items-center gap-1 px-2 h-6 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] disabled:opacity-50"
                title="Mark this value as locally overridden — future propagation skips it."
              >
                {overrideBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
                Override locally
              </button>
            ) : null}
            {overrideError && (
              <span className="text-[10px] text-[var(--status-reject)]">{overrideError}</span>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
