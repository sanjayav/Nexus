import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Copy, Download, ExternalLink, X } from 'lucide-react'
import SealCheck from '../ui/SealCheck'
import StatusPill from '../ui/StatusPill'
import { notify } from '../ui/toast'
import ContourField from '../../design-system/illustrations/ContourField'
import HashText from './HashType'
import { dur, ease, spring } from '../../motion/tokens'
import type { ReportLang } from './reportLang'

export interface PublishedResult {
  id: string
  version: number
  sha256: string | null
  verifyUrl: string | null
  verifyPath: string | null
  anchored: boolean
  isDraft: boolean
  lang: ReportLang
  periodLabel: string
  framework: string
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * The publish moment, shown once per publish: the report page slides up,
 * its SHA-256 types out, and the "anchored" seal draws. Then the links the
 * publisher needs next (verify page, copy link, PDF).
 */
export default function PublishMoment({
  result,
  onClose,
  onDownload,
}: {
  result: PublishedResult | null
  onClose: () => void
  onDownload: (r: PublishedResult) => void
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)
  const doneRef = useRef<HTMLButtonElement>(null)
  const [hashDone, setHashDone] = useState(false)

  useEffect(() => {
    if (!result) return
    setHashDone(!result.sha256)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const raf = requestAnimationFrame(() => doneRef.current?.focus())
    return () => {
      document.body.style.overflow = prev
      cancelAnimationFrame(raf)
    }
  }, [result])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return }
    if (e.key !== 'Tab') return
    const nodes = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    if (!nodes.length) return
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  if (typeof document === 'undefined') return null

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      notify.success(t('publishing.moment.copied'))
    } catch {
      notify.error(t('publishing.moment.copyFailed'))
    }
  }

  return createPortal(
    <AnimatePresence>
      {result && (
        <div className="fixed inset-0 z-[85] flex items-end lg:items-center justify-center lg:p-6" onKeyDown={onKeyDown}>
          <motion.div
            className="absolute inset-0"
            style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(3px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.fast }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="publish-moment-title"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={spring.gentle}
            className="relative w-full lg:max-w-[760px] max-h-[94vh] overflow-y-auto overflow-x-hidden bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-[var(--shadow-overlay)] rounded-t-[var(--radius-2xl)] lg:rounded-[var(--radius-2xl)]"
          >
            <ContourField anchor="top-left" rings={14} className="absolute inset-0 w-full h-full text-[var(--color-brand)] opacity-[0.08]" />
            <button
              type="button"
              onClick={onClose}
              aria-label={t('publishing.moment.close')}
              className="absolute top-3.5 right-3.5 z-10 w-9 h-9 rounded-[var(--radius-md)] inline-flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative grid gap-8 p-6 sm:p-8 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
              {/* The document */}
              <motion.div
                initial={reduce ? false : { y: 40, opacity: 0, rotate: -2 }}
                animate={{ y: 0, opacity: 1, rotate: -2 }}
                transition={{ ...spring.gentle, delay: 0.08 }}
                className="mx-auto w-[150px] md:w-full aspect-[210/297] rounded-[6px] bg-[var(--bg-primary)] border border-[var(--border-default)] shadow-[var(--shadow-raised)] p-4 flex flex-col"
                aria-hidden
              >
                <div className="h-1.5 w-10 rounded-full bg-[var(--color-brand)]" />
                <div className="mt-4 text-[11px] font-semibold leading-tight text-[var(--text-primary)] line-clamp-3">{result.framework}</div>
                <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">{result.periodLabel}</div>
                <div className="mt-auto space-y-1.5">
                  {[80, 64, 72, 48].map((w, i) => (
                    <div key={i} className="h-1 rounded-full bg-[var(--bg-tertiary)]" style={{ width: `${w}%` }} />
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="w-6 h-6 rounded-[3px] border border-[var(--border-strong)] grid grid-cols-3 gap-px p-0.5">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <span key={i} className={i % 2 ? 'bg-[var(--text-primary)]' : ''} />
                    ))}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-tertiary)]">v{result.version}</span>
                </div>
              </motion.div>

              {/* The record */}
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <StatusPill tone={result.isDraft ? 'warning' : 'success'} dot>
                    {result.isDraft ? t('publishing.moment.draft') : t('publishing.moment.assured')}
                  </StatusPill>
                  <span className="chip" lang={result.lang === 'zh' ? 'zh-CN' : 'en'}>{t(`reviewUi.lang.${result.lang}`)}</span>
                </div>
                <h2 id="publish-moment-title" className="type-h1 text-[var(--text-primary)] mt-3 text-balance">
                  {t('publishing.moment.title', { version: result.version, period: result.periodLabel })}
                </h2>

                {result.sha256 ? (
                  <div className="mt-5">
                    <div className="text-caption font-semibold text-[var(--text-secondary)]">{t('publishing.moment.fingerprint')}</div>
                    <div className="mt-1.5 p-3 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[13px] leading-[20px] text-[var(--text-primary)]">
                      <HashText hash={result.sha256} delay={reduce ? 0 : 420} onDone={() => setHashDone(true)} />
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 type-small text-[var(--text-secondary)]">{t('publishing.moment.noHash')}</p>
                )}

                <AnimatePresence>
                  {hashDone && (
                    <motion.div
                      initial={reduce ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: dur.base, ease: ease.out }}
                      className="mt-4 flex items-start gap-3"
                    >
                      {result.anchored ? <SealCheck size={28} /> : <SealCheck size={28} tone="ink" filled={false} className="text-[var(--status-warning)]" />}
                      <div className="min-w-0">
                        <div className="type-small font-semibold text-[var(--text-primary)]">
                          {result.anchored ? t('publishing.moment.anchored') : t('publishing.moment.anchorPending')}
                        </div>
                        <div className="text-caption text-[var(--text-tertiary)] mt-0.5">
                          {result.anchored ? t('publishing.moment.anchoredBody') : t('publishing.moment.anchorPendingBody')}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {result.verifyUrl && (
                  <div className="mt-5 flex items-center gap-1.5 min-w-0">
                    <code className="flex-1 min-w-0 truncate font-mono text-caption text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] h-9 px-3 leading-9">
                      {result.verifyUrl}
                    </code>
                    <button
                      type="button"
                      onClick={() => void copy(result.verifyUrl!)}
                      aria-label={t('publishing.moment.copyLink')}
                      title={t('publishing.moment.copyLink')}
                      className="w-10 h-9 flex-shrink-0 inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:items-center sm:justify-end">
                  <button
                    ref={doneRef}
                    type="button"
                    onClick={onClose}
                    className="h-10 px-4 inline-flex items-center justify-center rounded-[var(--radius-md)] text-small font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] whitespace-nowrap"
                  >
                    {t('publishing.moment.done')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownload(result)}
                    className="h-10 px-4 inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" /> {t('publishing.moment.download')}
                  </button>
                  {result.verifyPath && (
                    <a
                      href={result.verifyPath}
                      target="_blank"
                      rel="noreferrer"
                      className="h-10 px-4 inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-bg-hover)] shadow-[var(--btn-primary-shadow)] text-small font-semibold whitespace-nowrap"
                    >
                      {t('publishing.moment.openVerify')} <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
