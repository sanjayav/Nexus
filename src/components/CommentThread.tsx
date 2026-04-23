import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Send, Loader2 } from 'lucide-react'
import { orgStore, type AssignmentComment } from '../lib/orgStore'
import { slideInLeft } from './motion'

/**
 * Threaded comments on an assignment. Reviewers and contributors chat in place
 * — no more "review conversations happen in Slack". Posts create notifications
 * for the other party automatically via the /api/org comment action.
 */
export default function CommentThread({ assignmentId }: { assignmentId: string }) {
  const [comments, setComments] = useState<AssignmentComment[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)

  const load = async () => {
    try {
      const rows = await orgStore.listComments(assignmentId)
      setComments(rows)
    } catch { /* silent */ }
    setLoading(false)
  }
  useEffect(() => { load() }, [assignmentId])

  const post = async () => {
    const text = draft.trim()
    if (!text) return
    setPosting(true)
    try {
      await orgStore.addComment(assignmentId, text)
      setDraft('')
      await load()
    } catch (e) {
      alert(`Could not post: ${e instanceof Error ? e.message : e}`)
    }
    setPosting(false)
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-2">
        <MessageSquare className="w-3 h-3" /> Discussion · {comments.length}
      </div>
      {loading ? (
        <div className="py-3 text-center text-[10px] text-[var(--text-tertiary)]">Loading…</div>
      ) : comments.length === 0 ? (
        <div className="py-2 text-[10px] text-[var(--text-tertiary)] italic">No comments yet. Start a thread below.</div>
      ) : (
        <ul className="space-y-2 max-h-[220px] overflow-y-auto">
          {comments.map((c, i) => (
            <motion.li key={c.id} {...slideInLeft(i)} className="bg-[var(--bg-primary)] rounded-[var(--radius-sm)] p-2.5 border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-[var(--color-brand)] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                  {c.author_name.slice(0, 2).toUpperCase()}
                </span>
                <span className="text-[10px] font-semibold text-[var(--text-primary)]">{c.author_name}</span>
                {c.kind !== 'comment' && (
                  <span className="text-[8px] uppercase tracking-wider font-semibold text-[var(--color-brand)] bg-[var(--color-brand-soft)] px-1 py-0.5 rounded">
                    {c.kind.replace('_', ' ')}
                  </span>
                )}
                <span className="ml-auto text-[9px] text-[var(--text-tertiary)]">{new Date(c.created_at).toLocaleString()}</span>
              </div>
              <div className="text-[11px] text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{c.body}</div>
            </motion.li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), post())}
          placeholder="Write a comment…"
          disabled={posting}
          className="flex-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[11px] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 outline-none disabled:opacity-50"
        />
        <button
          onClick={post}
          disabled={posting || !draft.trim()}
          className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-brand)] text-white text-[11px] font-semibold disabled:opacity-50 inline-flex items-center gap-1 hover:bg-[var(--color-brand-strong)]"
        >
          {posting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
        </button>
      </div>
    </div>
  )
}
