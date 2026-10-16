import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { FileText, ArrowRight, Info, X } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { SkeletonTable } from '../components/Skeleton'
import { StateBoundary, StatusPill } from '../components/ui'
import { useAuth } from '../auth/AuthContext'
import { orgStore, type QuestionAssignment } from '../lib/orgStore'
import { itemLabel } from '../lib/itemLabel'
import { useFmt } from '../lib/fmt'
import { transition } from '../motion/tokens'

/**
 * EvidenceLibrary — every disclosure that has evidence attached. v1 derives
 * the list from assignments whose `evidence_ids` are populated (no dedicated
 * endpoint yet). Rows open the shared entry page for that assignment.
 */
export default function EvidenceLibrary() {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<QuestionAssignment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showUploadPrompt, setShowUploadPrompt] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    setItems(null)
    try {
      setItems(await orgStore.listAssignments())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => { if (user) void load() }, [user, load])

  // "+ New evidence" handoff: show the upload guidance and clear the param.
  useEffect(() => {
    if (searchParams.get('upload') === '1') {
      setShowUploadPrompt(true)
      const next = new URLSearchParams(searchParams)
      next.delete('upload')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const evidenced = useMemo(() => (items ?? []).filter(a => (a.evidence_ids?.length ?? 0) > 0), [items])
  const totalFiles = useMemo(() => evidenced.reduce((s, a) => s + (a.evidence_ids?.length ?? 0), 0), [evidenced])

  const description = error
    ? undefined
    : items === null
      ? t('evidence.description.loading')
      : evidenced.length === 0
        ? t('evidence.description.empty')
        : t('evidence.description.summary', {
            files: t('evidence.description.fileCount', { count: totalFiles }),
            disclosures: t('evidence.description.disclosureCount', { count: evidenced.length }),
          })

  const openRow = (a: QuestionAssignment) => navigate(`/data/entry/${encodeURIComponent(a.questionId)}?assignment=${encodeURIComponent(a.id)}`)

  return (
    <div className="page-container space-y-6">
      <PageHeader title={t('evidence.title')} description={description} />

      <AnimatePresence initial={false}>
        {showUploadPrompt && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={transition.base}
            className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--status-info-line)] bg-[var(--status-info-soft)] px-4 py-3"
          >
            <Info className="w-4 h-4 mt-0.5 text-[var(--status-info)] flex-shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
              <div className="text-small font-semibold text-[var(--text-primary)]">{t('evidence.uploadPrompt.title')}</div>
              <p className="text-small text-[var(--text-secondary)] mt-0.5">{t('evidence.uploadPrompt.body')}</p>
              <Link to="/my-tasks" className="mt-1.5 inline-flex items-center gap-1 h-8 text-small font-semibold text-[var(--color-brand-strong)] hover:underline underline-offset-2">
                {t('evidence.uploadPrompt.openMyTasks')} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
              </Link>
            </div>
            <button
              onClick={() => setShowUploadPrompt(false)}
              aria-label={t('evidence.uploadPrompt.dismiss')}
              className="w-9 h-9 -mr-1 -mt-1 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <StateBoundary
        loading={items === null && !error}
        error={error}
        onRetry={() => void load()}
        errorState={{ title: t('evidence.error.title') }}
        empty={items !== null && evidenced.length === 0}
        emptyState={{
          art: 'upload',
          title: t('evidence.empty.title'),
          body: t('evidence.empty.body'),
          cta: { label: t('evidence.empty.cta'), onClick: () => navigate('/my-tasks') },
          framed: true,
        }}
        skeleton={<SkeletonTable rows={5} cols={4} />}
      >
        <div className="surface-paper overflow-hidden">
          {/* Desktop table */}
          <table className="hidden md:table w-full text-small">
            <thead className="bg-[var(--bg-secondary)] text-caption font-semibold text-[var(--text-secondary)]">
              <tr>
                <th className="text-left px-4 py-3">{t('evidence.columns.disclosure')}</th>
                <th className="text-left px-4 py-3">{t('evidence.columns.files')}</th>
                <th className="text-left px-4 py-3">{t('evidence.columns.status')}</th>
                <th className="text-left px-4 py-3">{t('evidence.columns.assignee')}</th>
                <th className="text-left px-4 py-3">{t('evidence.columns.lastUpdated')}</th>
                <th className="w-12"><span className="sr-only">{t('evidence.openDisclosure')}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {evidenced.map(a => (
                <tr key={a.id} className="group hover:bg-[var(--bg-secondary)] cursor-pointer" onClick={() => openRow(a)}>
                  <td className="px-4 py-3 max-w-[460px]">
                    <div className="font-mono text-caption text-[var(--text-tertiary)]">{a.gri_code}</div>
                    <div className="text-[var(--text-primary)] font-medium truncate">{itemLabel(a, i18n.language)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] tabular-nums">
                      <FileText className="w-3.5 h-3.5 text-[var(--text-tertiary)]" aria-hidden />
                      {a.evidence_ids?.length ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusPill status={a.status} size="sm" /></td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] truncate max-w-[200px]">{a.assigneeName || '—'}</td>
                  <td className="px-4 py-3 text-[var(--text-tertiary)] whitespace-nowrap tabular-nums">{a.last_updated ? f.date(a.last_updated) : '—'}</td>
                  <td className="px-2 py-3 text-right">
                    <button
                      onClick={e => { e.stopPropagation(); openRow(a) }}
                      className="w-9 h-9 rounded-[var(--radius-sm)] inline-flex items-center justify-center text-[var(--color-brand-strong)] hover:bg-[var(--color-brand-soft)]"
                      aria-label={`${t('evidence.openDisclosure')} ${a.gri_code}`}
                    >
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile list */}
          <ul className="md:hidden divide-y divide-[var(--border-subtle)]">
            {evidenced.map(a => (
              <li key={a.id}>
                <button type="button" onClick={() => openRow(a)} className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[var(--bg-secondary)]">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-caption text-[var(--text-tertiary)]">{a.gri_code}</span>
                      <StatusPill status={a.status} size="sm" />
                    </div>
                    <div className="text-small font-medium text-[var(--text-primary)] mt-0.5">{itemLabel(a, i18n.language)}</div>
                    <div className="text-caption text-[var(--text-tertiary)] mt-0.5 tabular-nums">
                      {t('evidence.description.fileCount', { count: a.evidence_ids?.length ?? 0 })}{a.assigneeName ? ` · ${a.assigneeName}` : ''}{a.last_updated ? ` · ${f.date(a.last_updated)}` : ''}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 mt-1 text-[var(--text-tertiary)] flex-shrink-0" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </StateBoundary>
    </div>
  )
}
