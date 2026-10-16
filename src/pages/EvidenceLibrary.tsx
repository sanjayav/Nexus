import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileText, ArrowRight, Paperclip, Info } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { SkeletonTable } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { EmptyEvidenceIllustration } from '../data/illustrations'
import { useAuth } from '../auth/AuthContext'
import { orgStore, type QuestionAssignment } from '../lib/orgStore'
import { itemLabel } from '../lib/itemLabel'

/**
 * EvidenceLibrary — a top-level browsable list of every file attached to
 * the org's disclosures. v1 derives the list from assignments whose
 * `evidence_ids` are populated; no dedicated endpoint yet.
 */
export default function EvidenceLibrary() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<QuestionAssignment[] | null>(null)
  const [showUploadPrompt, setShowUploadPrompt] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    void orgStore.listAssignments()
      .then(rows => { if (!cancelled) setItems(rows) })
      .catch(() => { if (!cancelled) setItems([]) })
    return () => { cancelled = true }
  }, [user])

  // "+ New evidence" handoff: surface the upload guidance banner and clear
  // the query param so a reload doesn't re-trigger it.
  useEffect(() => {
    if (searchParams.get('upload') === '1') {
      setShowUploadPrompt(true)
      const next = new URLSearchParams(searchParams)
      next.delete('upload')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const evidenced = useMemo(() => {
    if (!items) return []
    return items.filter(a => (a.evidence_ids?.length ?? 0) > 0)
  }, [items])

  const totalFiles = useMemo(
    () => evidenced.reduce((s, a) => s + (a.evidence_ids?.length ?? 0), 0),
    [evidenced]
  )

  return (
    <div className="page-container space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: t('evidence.breadcrumbs.data'), to: '/data' },
          { label: t('evidence.breadcrumbs.evidence') },
        ]}
        title={t('evidence.title')}
        description={
          items === null
            ? t('evidence.description.loading')
            : evidenced.length === 0
              ? t('evidence.description.empty')
              : t('evidence.description.summary', {
                  files: t('evidence.description.fileCount', { count: totalFiles }),
                  disclosures: t('evidence.description.disclosureCount', { count: evidenced.length }),
                })
        }
      />

      {showUploadPrompt && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-[12px] border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)] px-4 py-3 text-[13px]"
        >
          <Info className="w-4 h-4 mt-0.5 text-[var(--color-brand)] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[var(--text-primary)]">{t('evidence.uploadPrompt.title')}</div>
            <p className="text-[var(--text-secondary)] mt-0.5">
              {t('evidence.uploadPrompt.body')}
            </p>
          </div>
          <button
            onClick={() => navigate('/my-tasks')}
            className="text-[12.5px] font-semibold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] inline-flex items-center gap-1"
          >
            {t('evidence.uploadPrompt.openMyTasks')} <ArrowRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => setShowUploadPrompt(false)}
            aria-label={t('evidence.uploadPrompt.dismiss')}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-[16px] leading-none px-1"
          >
            ×
          </button>
        </div>
      )}

      {items === null ? (
        <SkeletonTable rows={5} cols={4} />
      ) : evidenced.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-[var(--border-default)] bg-[var(--bg-primary)]">
          <EmptyState
            illustration={EmptyEvidenceIllustration}
            icon={Paperclip}
            title={t('evidence.empty.title')}
            body={t('evidence.empty.body')}
            cta={{ label: t('evidence.empty.cta'), onClick: () => navigate('/my-tasks') }}
          />
        </div>
      ) : (
        <div className="rounded-[12px] border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-primary)]">
          <table className="w-full text-[13px]">
            <thead className="bg-[var(--bg-secondary)] text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)]">
              <tr>
                <th className="text-left px-4 py-3">{t('evidence.columns.disclosure')}</th>
                <th className="text-left px-4 py-3">{t('evidence.columns.files')}</th>
                <th className="text-left px-4 py-3">{t('evidence.columns.assignee')}</th>
                <th className="text-left px-4 py-3">{t('evidence.columns.lastUpdated')}</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {evidenced.map(a => (
                <tr key={a.id} className="hover:bg-[var(--bg-hover)]">
                  <td className="px-4 py-3">
                    <div className="font-mono text-caption text-[var(--text-tertiary)]">{a.gri_code}</div>
                    <div className="text-[var(--text-primary)] font-medium truncate max-w-[420px]">{itemLabel(a, i18n.language)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
                      <FileText className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                      {a.evidence_ids?.length ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] truncate max-w-[200px]">{a.assigneeName ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--text-tertiary)]">
                    {a.last_updated ? new Date(a.last_updated).toLocaleDateString(i18n.language?.startsWith('zh') ? 'zh-CN' : undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => navigate(`/data/entry/${a.questionId}`)}
                      className="text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] inline-flex items-center"
                      aria-label={t('evidence.openDisclosure')}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
