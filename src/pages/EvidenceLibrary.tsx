import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, ArrowRight, Paperclip, Info } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { SkeletonTable } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { EmptyEvidenceIllustration } from '../data/illustrations'
import { useAuth } from '../auth/AuthContext'
import { orgStore, type QuestionAssignment } from '../lib/orgStore'

/**
 * EvidenceLibrary — a top-level browsable list of every file attached to
 * the org's disclosures. v1 derives the list from assignments whose
 * `evidence_ids` are populated; no dedicated endpoint yet.
 */
export default function EvidenceLibrary() {
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
          { label: 'Data', to: '/data' },
          { label: 'Evidence' },
        ]}
        title="Evidence"
        description={
          items === null
            ? 'Listing every file attached to disclosures across this org.'
            : evidenced.length === 0
              ? 'No evidence uploaded yet. Attach files to disclosures from the data-entry page.'
              : `${totalFiles} file${totalFiles === 1 ? '' : 's'} attached across ${evidenced.length} disclosure${evidenced.length === 1 ? '' : 's'}.`
        }
      />

      {showUploadPrompt && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-[12px] border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)] px-4 py-3 text-[13px]"
        >
          <Info className="w-4 h-4 mt-0.5 text-[var(--color-brand)] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[var(--text-primary)]">Attach evidence to a disclosure</div>
            <p className="text-[var(--text-secondary)] mt-0.5">
              Evidence is anchored to a specific value. Open a disclosure from My Tasks and use the right-rail "Attach evidence" button to upload a file.
            </p>
          </div>
          <button
            onClick={() => navigate('/my-tasks')}
            className="text-[12.5px] font-semibold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] inline-flex items-center gap-1"
          >
            Open My Tasks <ArrowRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => setShowUploadPrompt(false)}
            aria-label="Dismiss"
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
            title="No evidence yet"
            body="Open any disclosure in My Tasks and attach a supporting file. Once evidence is uploaded it will appear here, fully searchable."
            cta={{ label: 'Open My Tasks', onClick: () => navigate('/my-tasks') }}
          />
        </div>
      ) : (
        <div className="rounded-[12px] border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-primary)]">
          <table className="w-full text-[13px]">
            <thead className="bg-[var(--bg-secondary)] text-[11px] uppercase tracking-[0.1em] font-semibold text-[var(--text-tertiary)]">
              <tr>
                <th className="text-left px-4 py-3">Disclosure</th>
                <th className="text-left px-4 py-3">Files</th>
                <th className="text-left px-4 py-3">Assignee</th>
                <th className="text-left px-4 py-3">Last updated</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {evidenced.map(a => (
                <tr key={a.id} className="hover:bg-[var(--bg-hover)]">
                  <td className="px-4 py-3">
                    <div className="font-mono text-[11px] text-[var(--text-tertiary)]">{a.gri_code}</div>
                    <div className="text-[var(--text-primary)] font-medium truncate max-w-[420px]">{a.line_item}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
                      <FileText className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                      {a.evidence_ids?.length ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] truncate max-w-[200px]">{a.assigneeName ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--text-tertiary)]">
                    {a.last_updated ? new Date(a.last_updated).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => navigate(`/data/entry/${a.questionId}`)}
                      className="text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] inline-flex items-center"
                      aria-label="Open disclosure"
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
