import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Upload, Loader2, FileText, X, Plug, AlertCircle, Paperclip, ExternalLink } from 'lucide-react'
import { nexus } from '../../lib/api'
import { useFmt } from '../../lib/fmt'
import AiExtractionPanel from '../AiExtractionPanel'
import { listItemMotion } from '../../motion/tokens'
import { EVIDENCE_ACCEPT, recordedEvidenceLabel } from './persist'
import type { ValueEntryState } from './useValueEntry'

/**
 * Evidence — required for Manual and Calculator answers before submit.
 * Drop or pick files; each upload anchors the current value (hash-chained
 * snapshot) and offers AI extraction. Errors render inline, next to the zone.
 */
export default function EvidenceBlock({ entry, compact = false }: { entry: ValueEntryState; compact?: boolean }) {
  const { t } = useTranslation()
  const f = useFmt()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const { evidence, recorded, uploading, evidenceError: err, locked, needsEvidence, mode, question, anchor, anchorStale } = entry

  const uploadedIds = new Set(evidence.map(e => e.id))
  const legacy = recorded.filter(id => !uploadedIds.has(id))
  const empty = evidence.length === 0 && legacy.length === 0
  const required = needsEvidence && empty && !locked
  const errId = `ev-err-${question.id}`

  const errorText = (() => {
    if (!err) return null
    switch (err.kind) {
      case 'required': return t('entry.evidence.required')
      case 'stale': return t('entry.evidence.stale', { value: f.exact(err.value, question.unit) })
      case 'needValue': return t('entry.evidence.needValue')
      case 'noYear': return t('entry.year.noneEvidence')
      case 'type': return t('entry.evidence.badType', { type: err.type })
      case 'size': return t('entry.evidence.tooLarge', { size: err.mb })
      case 'failed': return err.message
    }
  })()

  return (
    <section aria-labelledby={`ev-h-${question.id}`} data-entry-section="evidence">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h4 id={`ev-h-${question.id}`} className="text-small font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5 text-[var(--text-tertiary)]" aria-hidden />
          {t('entry.evidence.title')}
          {needsEvidence && !locked && <span className="text-caption font-normal text-[var(--text-tertiary)]">· {t('entry.evidence.requiredTag')}</span>}
        </h4>
        {mode === 'Connector' && <span className="text-caption text-[var(--text-tertiary)]">{t('entry.evidence.connectorExempt')}</span>}
      </div>

      {!locked && (
        <div
          role="button"
          tabIndex={0}
          aria-describedby={errorText ? errId : undefined}
          data-entry-error={errorText && err?.kind !== 'failed' ? '' : undefined}
          aria-busy={uploading}
          onClick={() => !uploading && inputRef.current?.click()}
          onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !uploading) { e.preventDefault(); inputRef.current?.click() } }}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); void entry.uploadFiles(e.dataTransfer.files) }}
          className={`group flex items-center gap-3 rounded-[var(--radius-md)] border border-dashed transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/40 ${
            compact ? 'px-3 py-2.5' : 'px-4 py-3.5'
          } ${
            dragging
              ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]'
              : err && err.kind !== 'failed'
                ? 'border-[var(--status-danger-line)] bg-[var(--status-danger-soft)]'
                : 'border-[var(--border-strong)] bg-[var(--bg-secondary)] hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]'
          }`}
        >
          <span className="w-9 h-9 rounded-[var(--radius-sm)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-center flex-shrink-0 text-[var(--text-secondary)] group-hover:text-[var(--color-brand-strong)]">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Upload className="w-4 h-4" aria-hidden />}
          </span>
          <span className="min-w-0">
            <span className="block text-small font-medium text-[var(--text-primary)]">
              {uploading ? t('entry.evidence.uploading') : empty ? t('entry.evidence.drop') : t('entry.evidence.addAnother')}
            </span>
            <span className="block text-caption text-[var(--text-tertiary)]">{t('entry.evidence.formats')}</span>
          </span>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="sr-only"
            tabIndex={-1}
            accept={EVIDENCE_ACCEPT}
            onChange={e => { void entry.uploadFiles(e.target.files); e.target.value = '' }}
          />
        </div>
      )}

      {errorText && (
        <p id={errId} role="alert" className="mt-1.5 text-caption text-[var(--status-danger)] flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 mt-px flex-shrink-0" aria-hidden />
          <span>
            {errorText}
            {err?.kind === 'noYear' && (
              <> <Link to="/admin/periods" className="font-semibold underline underline-offset-2">{t('entry.year.cta')}</Link></>
            )}
          </span>
        </p>
      )}
      {!errorText && required && (
        <p className="mt-1.5 text-caption text-[var(--text-tertiary)]">{t('entry.evidence.hint')}</p>
      )}
      {anchor && anchorStale && evidence.length > 0 && !errorText && (
        <p className="mt-1.5 text-caption text-[var(--status-warning)]">
          {t('entry.evidence.stale', { value: f.exact(anchor.value, question.unit) })}
        </p>
      )}

      {(evidence.length > 0 || legacy.length > 0) && (
        <ul className="mt-2 space-y-1.5">
          <AnimatePresence initial={false}>
            {evidence.map(e => (
              <motion.li key={e.id} layout {...listItemMotion} className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                <div className="flex items-center gap-2.5 px-3 py-2">
                  <FileText className="w-4 h-4 text-[var(--color-brand)] flex-shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="text-small font-medium text-[var(--text-primary)] truncate" title={e.filename}>{e.filename}</div>
                    <div className="text-caption text-[var(--text-tertiary)] tabular-nums">
                      {e.file_size < 1024 ? `${f.number(e.file_size)} B` : e.file_size < 1024 * 1024 ? `${f.number(e.file_size / 1024, { maxFraction: 1 })} KB` : `${f.number(e.file_size / 1024 / 1024, { maxFraction: 1 })} MB`} · <span className="font-mono">{e.file_hash.slice(0, 8)}…</span>
                    </div>
                  </div>
                  <a
                    href={nexus.evidenceDownloadUrl(e.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="h-8 px-2 inline-flex items-center gap-1 rounded-[var(--radius-sm)] text-caption font-semibold text-[var(--color-brand-strong)] hover:bg-[var(--color-brand-soft)]"
                  >
                    {t('entry.evidence.open')} <ExternalLink className="w-3 h-3" aria-hidden />
                  </a>
                  {!locked && (
                    <button
                      type="button"
                      onClick={() => void entry.removeEvidence(e.id)}
                      className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--status-danger)] hover:bg-[var(--status-danger-soft)]"
                      aria-label={t('entry.evidence.remove', { file: e.filename })}
                    >
                      <X className="w-3.5 h-3.5" aria-hidden />
                    </button>
                  )}
                </div>
                {!locked && (
                  <div className="px-3 pb-2.5">
                    <AiExtractionPanel
                      evidenceId={e.id}
                      filename={e.filename}
                      questionnaireItemId={question.id}
                      expectedUnit={question.unit ?? undefined}
                      lineItemHint={question.line_item}
                      onAccept={(x, meta) => entry.acceptExtraction(e.filename, x, meta)}
                      disabled={entry.submitting}
                    />
                  </div>
                )}
              </motion.li>
            ))}
            {legacy.map(id => {
              const { name, connector } = recordedEvidenceLabel(id)
              return (
                <motion.li key={id} layout {...listItemMotion} className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                  <div className="flex items-center gap-2.5 px-3 py-2">
                    {connector ? <Plug className="w-4 h-4 text-[var(--color-brand)] flex-shrink-0" aria-hidden /> : <FileText className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" aria-hidden />}
                    <div className="min-w-0 flex-1">
                      <div className="text-small font-medium text-[var(--text-primary)] truncate">{name}</div>
                      <div className="text-caption text-[var(--text-tertiary)]">{connector ? t('entry.evidence.receipt') : t('entry.evidence.onRecord')}</div>
                    </div>
                    {!locked && !connector && (
                      <button
                        type="button"
                        onClick={() => void entry.removeEvidence(id)}
                        className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--status-danger)] hover:bg-[var(--status-danger-soft)]"
                        aria-label={t('entry.evidence.remove', { file: name })}
                      >
                        <X className="w-3.5 h-3.5" aria-hidden />
                      </button>
                    )}
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}

      {locked && empty && <p className="text-caption text-[var(--text-tertiary)]">{t('entry.evidence.none')}</p>}
    </section>
  )
}
