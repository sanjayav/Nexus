import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Send, Loader2, AtSign, AlertTriangle,
  Check, RotateCcw, Filter, Reply as ReplyIcon,
} from 'lucide-react'
import { orgStore, type AssignmentComment, type OrgMember } from '../lib/orgStore'
import { useAuth } from '../auth/AuthContext'

/**
 * Threaded comments on an assignment — Workiva-grade.
 *
 * Features:
 *   • @mention autocomplete (popover, keyboard-navigable, resolves to user_email)
 *   • Threaded replies, one level deep (replies-to-replies flatten on the server)
 *   • Resolve / Reopen per thread; resolved comments collapse to a one-liner
 *   • "Request for review" composer toggle — renders distinct + fires reviewer notifications
 *   • Filter dropdown (All / Unresolved / Mentioning me / Review requests)
 *   • Unresolved count badge in the header tab
 *   • Cmd+Enter submits, Esc closes the reply
 */

interface CommentThreadProps {
  assignmentId: string
}

interface MentionCandidate {
  email: string
  name: string
}

type FilterMode = 'all' | 'unresolved' | 'mine' | 'review'

const MENTION_PATTERN = /(?:^|\s)@([\w.+-]*)$/

export default function CommentThread({ assignmentId }: CommentThreadProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<AssignmentComment[]>([])
  const [members, setMembers] = useState<OrgMember[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterMode>('unresolved')
  const [showResolved, setShowResolved] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)

  const load = async () => {
    try {
      const rows = await orgStore.listComments(assignmentId)
      setComments(rows)
    } catch { /* silent */ }
    setLoading(false)
  }
  useEffect(() => { void load() }, [assignmentId])

  // Lazily fetch members for the @mention autocomplete — once per thread.
  useEffect(() => {
    let cancelled = false
    orgStore.listMembers().then(rows => { if (!cancelled) setMembers(rows) }).catch(() => { /* silent */ })
    return () => { cancelled = true }
  }, [assignmentId])

  const myEmail = user?.email?.toLowerCase() ?? ''
  const myUserId = user?.id

  // Group comments into top-level + replies. Server already flattens deeper
  // nesting, but defensively re-root anything orphaned.
  const tree = useMemo(() => {
    const byId = new Map(comments.map(c => [c.id, c]))
    const roots: AssignmentComment[] = []
    const repliesByParent = new Map<string, AssignmentComment[]>()
    for (const c of comments) {
      if (c.parent_comment_id && byId.has(c.parent_comment_id)) {
        const arr = repliesByParent.get(c.parent_comment_id) ?? []
        arr.push(c)
        repliesByParent.set(c.parent_comment_id, arr)
      } else {
        roots.push(c)
      }
    }
    return { roots, repliesByParent }
  }, [comments])

  const unresolvedCount = useMemo(
    () => comments.filter(c => !c.resolved_at && !c.parent_comment_id).length,
    [comments],
  )

  const visibleRoots = useMemo(() => {
    return tree.roots.filter(c => {
      if (filter === 'unresolved' && c.resolved_at) return false
      if (filter === 'review' && !c.is_request_for_review) return false
      if (filter === 'mine') {
        const mentioned = (c.mentioned_user_ids ?? []).some(id => id === myUserId)
        if (!mentioned) return false
      }
      return true
    })
  }, [tree.roots, filter, myUserId])

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
      {/* Header — title + unresolved count badge + filter */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
          <MessageSquare className="w-3 h-3" /> Discussion
          {unresolvedCount > 0 && (
            <span
              data-testid="comment-unresolved-count"
              className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
            >
              {unresolvedCount} open
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Filter className="w-3 h-3 text-[var(--text-tertiary)]" aria-hidden />
          <select
            aria-label="Filter comments"
            value={filter}
            onChange={e => setFilter(e.target.value as FilterMode)}
            className="text-[10px] bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-[4px] px-1.5 py-0.5 text-[var(--text-secondary)] focus:outline-none focus:border-[var(--color-brand)]"
          >
            <option value="all">All</option>
            <option value="unresolved">Unresolved</option>
            <option value="mine">Mentioning me</option>
            <option value="review">Review requests</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-3 text-center text-[10px] text-[var(--text-tertiary)]">Loading…</div>
      ) : visibleRoots.length === 0 ? (
        <div className="py-2 text-[10px] text-[var(--text-tertiary)] italic">No comments match this filter. Start a thread below.</div>
      ) : (
        <ul className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
          {visibleRoots.map(c => {
            const replies = tree.repliesByParent.get(c.id) ?? []
            return (
              <CommentNode
                key={c.id}
                comment={c}
                replies={replies}
                onReply={() => setReplyTo(c.id)}
                isReplying={replyTo === c.id}
                onCancelReply={() => setReplyTo(null)}
                myEmail={myEmail}
                myUserId={myUserId}
                members={members}
                assignmentId={assignmentId}
                onChange={load}
                showResolvedReplies={showResolved}
              />
            )
          })}
        </ul>
      )}

      {/* "Show resolved" toggle — surfaces a one-liner per resolved thread. */}
      {tree.roots.some(c => c.resolved_at) && (
        <button
          onClick={() => setShowResolved(s => !s)}
          className="mt-2 text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] inline-flex items-center gap-1"
        >
          {showResolved ? 'Hide resolved' : 'Show resolved'}
        </button>
      )}

      {/* Composer */}
      <ComposerForm
        assignmentId={assignmentId}
        members={members}
        onPosted={() => { void load() }}
      />
    </div>
  )
}

// ─── Individual comment + its reply rail ───────────────────────

function CommentNode({
  comment, replies, onReply, isReplying, onCancelReply,
  myEmail, myUserId, members, assignmentId, onChange, showResolvedReplies,
}: {
  comment: AssignmentComment
  replies: AssignmentComment[]
  onReply: () => void
  isReplying: boolean
  onCancelReply: () => void
  myEmail: string
  myUserId: string | undefined
  members: OrgMember[]
  assignmentId: string
  onChange: () => void
  showResolvedReplies: boolean
}) {
  const [busy, setBusy] = useState(false)
  const isResolved = !!comment.resolved_at
  const isReviewRequest = !!comment.is_request_for_review
  const mentionsMe = (comment.mentioned_user_ids ?? []).some(id => id === myUserId)
  const canResolve = comment.author_email.toLowerCase() === myEmail
  // (Workflow.approve perms are also accepted server-side; client just gates UI hint.)

  const handleResolveToggle = async () => {
    setBusy(true)
    try {
      if (isResolved) await orgStore.reopenComment(comment.id)
      else await orgStore.resolveComment(comment.id)
      onChange()
    } catch (e) {
      alert(`Could not update: ${e instanceof Error ? e.message : e}`)
    }
    setBusy(false)
  }

  // Collapsed (one-liner) presentation when resolved + user hasn't opted in.
  if (isResolved && !showResolvedReplies) {
    return (
      <li className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)] py-1">
        <Check className="w-3 h-3 text-emerald-500" />
        <span className="font-semibold">{comment.author_name}</span>
        <span className="truncate flex-1 italic">{comment.body}</span>
        <button
          onClick={handleResolveToggle}
          disabled={busy}
          className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] inline-flex items-center gap-0.5"
        >
          <RotateCcw className="w-3 h-3" /> Reopen
        </button>
      </li>
    )
  }

  return (
    <li
      className={`bg-[var(--bg-primary)] rounded-[var(--radius-sm)] p-2.5 border ${
        isReviewRequest ? 'border-amber-400/60 ring-1 ring-amber-400/20' :
        mentionsMe ? 'border-[var(--color-brand)]/40' :
        'border-[var(--border-subtle)]'
      }`}
    >
      <CommentHeader comment={comment} />
      {isReviewRequest && (
        <div className="mb-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-400/15 text-amber-600">
          <AlertTriangle className="w-3 h-3" /> Review requested
        </div>
      )}
      <CommentBody body={comment.body} members={members} />

      {/* Action row */}
      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
        <button
          type="button"
          onClick={isReplying ? onCancelReply : onReply}
          className="inline-flex items-center gap-0.5 hover:text-[var(--text-secondary)]"
          aria-label={isReplying ? 'Cancel reply' : 'Reply'}
        >
          <ReplyIcon className="w-3 h-3" /> {isReplying ? 'Cancel' : 'Reply'}
        </button>
        <button
          type="button"
          onClick={handleResolveToggle}
          disabled={busy}
          className={`inline-flex items-center gap-0.5 hover:text-[var(--text-secondary)] ${canResolve ? '' : 'opacity-70'}`}
        >
          {isResolved ? <RotateCcw className="w-3 h-3" /> : <Check className="w-3 h-3" />}
          {isResolved ? 'Reopen' : 'Resolve'}
        </button>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <ul className="mt-2 pl-3 ml-1 border-l border-[var(--border-subtle)] space-y-1.5">
          {replies.map(r => (
            <li key={r.id} className="bg-[var(--bg-secondary)] rounded-[4px] p-2 border border-[var(--border-subtle)]">
              <CommentHeader comment={r} />
              <CommentBody body={r.body} members={members} />
            </li>
          ))}
        </ul>
      )}

      {/* Reply composer */}
      <AnimatePresence>
        {isReplying && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="mt-2"
          >
            <ComposerForm
              assignmentId={assignmentId}
              members={members}
              parentCommentId={comment.id}
              compact
              onPosted={() => { onCancelReply(); onChange() }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

function CommentHeader({ comment }: { comment: AssignmentComment }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="w-5 h-5 rounded-full bg-[var(--color-brand)] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
        {comment.author_name.slice(0, 2).toUpperCase()}
      </span>
      <span className="text-[10px] font-semibold text-[var(--text-primary)]">{comment.author_name}</span>
      {comment.kind !== 'comment' && !comment.is_request_for_review && (
        <span className="text-[8px] uppercase tracking-wider font-semibold text-[var(--color-brand)] bg-[var(--color-brand-soft)] px-1 py-0.5 rounded">
          {comment.kind.replace('_', ' ')}
        </span>
      )}
      <span className="ml-auto text-[9px] text-[var(--text-tertiary)]">
        {new Date(comment.created_at).toLocaleString()}
      </span>
    </div>
  )
}

function CommentBody({ body, members }: { body: string; members: OrgMember[] }) {
  // Render @Name mentions as emerald chips. We match @<word> where <word> is
  // any contiguous run of word chars / + / . / -, then prettify by checking
  // the member roster — fall back to the raw token if we can't match.
  const parts = useMemo(() => splitMentions(body, members), [body, members])
  return (
    <div className="text-[11px] text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
      {parts.map((p, i) =>
        p.kind === 'mention'
          ? <span key={i} className="text-emerald-400 font-medium">@{p.display}</span>
          : <span key={i}>{p.text}</span>,
      )}
    </div>
  )
}

function splitMentions(body: string, members: OrgMember[]) {
  // Index members by name + email for prettifier lookup.
  const byKey = new Map<string, string>()
  for (const m of members) {
    byKey.set(m.name.toLowerCase().replace(/\s+/g, ''), m.name)
    byKey.set(m.email.toLowerCase(), m.name)
  }
  const out: Array<{ kind: 'text'; text: string } | { kind: 'mention'; display: string }> = []
  const regex = /@([\w.+-]+)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = regex.exec(body)) !== null) {
    if (m.index > last) out.push({ kind: 'text', text: body.slice(last, m.index) })
    const display = byKey.get(m[1].toLowerCase()) ?? m[1]
    out.push({ kind: 'mention', display })
    last = m.index + m[0].length
  }
  if (last < body.length) out.push({ kind: 'text', text: body.slice(last) })
  return out
}

// ─── Composer (with @mention autocomplete + review toggle) ────────

function ComposerForm({
  assignmentId, members, parentCommentId, compact, onPosted,
}: {
  assignmentId: string
  members: OrgMember[]
  parentCommentId?: string
  compact?: boolean
  onPosted: () => void
}) {
  const [draft, setDraft] = useState('')
  const [mentionedEmails, setMentionedEmails] = useState<Set<string>>(new Set())
  const [requestReview, setRequestReview] = useState(false)
  const [posting, setPosting] = useState(false)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const candidates: MentionCandidate[] = useMemo(() => {
    if (mentionQuery == null) return []
    const q = mentionQuery.toLowerCase()
    const seen = new Set<string>()
    const out: MentionCandidate[] = []
    for (const m of members) {
      const key = m.email.toLowerCase()
      if (seen.has(key)) continue
      if (q && !m.name.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) continue
      seen.add(key)
      out.push({ email: m.email, name: m.name })
      if (out.length >= 6) break
    }
    return out
  }, [members, mentionQuery])

  const handleChange = (next: string) => {
    setDraft(next)
    // Detect a trailing "@query" with no space — open autocomplete.
    const match = next.match(MENTION_PATTERN)
    if (match) {
      setMentionQuery(match[1])
      setMentionIndex(0)
    } else {
      setMentionQuery(null)
    }
  }

  const insertMention = (c: MentionCandidate) => {
    const handle = c.name.replace(/\s+/g, '')
    // Replace the trailing "@query" token with @Handle + trailing space.
    const replaced = draft.replace(MENTION_PATTERN, (whole) => {
      const lead = whole.startsWith('@') ? '' : whole[0]
      return `${lead}@${handle} `
    })
    setDraft(replaced)
    setMentionedEmails(prev => {
      const next = new Set(prev)
      next.add(c.email.toLowerCase())
      return next
    })
    setMentionQuery(null)
    inputRef.current?.focus()
  }

  const post = async () => {
    const text = draft.trim()
    if (!text) return
    setPosting(true)
    try {
      // Re-derive mentions from the final body so the server only persists
      // the @handles that are actually present in the text.
      const handlesInText = new Set<string>()
      const regex = /@([\w.+-]+)/g
      let m: RegExpExecArray | null
      while ((m = regex.exec(text)) !== null) handlesInText.add(m[1].toLowerCase())
      const finalEmails: string[] = []
      for (const member of members) {
        const handle = member.name.toLowerCase().replace(/\s+/g, '')
        const emailLocal = member.email.toLowerCase().split('@')[0]
        if (
          mentionedEmails.has(member.email.toLowerCase()) ||
          handlesInText.has(handle) ||
          handlesInText.has(emailLocal)
        ) {
          if (!finalEmails.includes(member.email)) finalEmails.push(member.email)
        }
      }
      await orgStore.addComment(assignmentId, {
        body: text,
        parent_comment_id: parentCommentId,
        mentioned_user_emails: finalEmails,
        is_request_for_review: requestReview,
      })
      setDraft('')
      setMentionedEmails(new Set())
      setRequestReview(false)
      onPosted()
    } catch (e) {
      alert(`Could not post: ${e instanceof Error ? e.message : e}`)
    }
    setPosting(false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery != null && candidates.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, candidates.length - 1)); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(candidates[mentionIndex])
        return
      }
      if (e.key === 'Escape') { e.preventDefault(); setMentionQuery(null); return }
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void post()
    }
  }

  return (
    <div className={`mt-2 relative ${requestReview ? 'rounded-[var(--radius-sm)] p-1.5 border border-amber-400/60 bg-amber-400/[0.04]' : ''}`}>
      {/* Composer header — request-for-review toggle */}
      {!compact && (
        <div className="flex items-center gap-2 mb-1.5">
          <button
            type="button"
            onClick={() => setRequestReview(r => !r)}
            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-[4px] border transition-colors ${
              requestReview
                ? 'bg-amber-400/20 text-amber-700 border-amber-400/60'
                : 'bg-[var(--bg-primary)] text-[var(--text-tertiary)] border-[var(--border-subtle)] hover:text-[var(--text-secondary)]'
            }`}
            aria-pressed={requestReview}
          >
            <AlertTriangle className="w-3 h-3" />
            {requestReview ? 'Review requested' : 'Request for review'}
          </button>
          <span className="text-[9px] text-[var(--text-tertiary)] hidden sm:inline">⌘+Enter to submit</span>
        </div>
      )}

      <div className="flex gap-2 relative">
        <textarea
          ref={inputRef}
          value={draft}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={compact ? 'Reply…' : 'Write a comment — type @ to mention someone'}
          disabled={posting}
          rows={compact ? 2 : 2}
          aria-label={compact ? 'Reply' : 'Write a comment'}
          className="flex-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[11px] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 outline-none disabled:opacity-50 resize-none"
        />
        <button
          type="button"
          onClick={post}
          disabled={posting || !draft.trim()}
          className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-brand)] text-white text-[11px] font-semibold disabled:opacity-50 inline-flex items-center gap-1 hover:bg-[var(--color-brand-strong)] self-start"
          aria-label="Submit comment"
        >
          {posting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
        </button>

        {/* @mention popover */}
        {mentionQuery != null && candidates.length > 0 && (
          <div
            role="listbox"
            aria-label="Mention suggestions"
            className="absolute left-0 right-12 top-full mt-1 z-20 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-sm)] shadow-lg overflow-hidden"
          >
            {candidates.map((c, idx) => (
              <button
                key={c.email}
                type="button"
                role="option"
                aria-selected={idx === mentionIndex}
                onMouseDown={e => { e.preventDefault(); insertMention(c) }}
                onMouseEnter={() => setMentionIndex(idx)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-left text-[11px] ${
                  idx === mentionIndex
                    ? 'bg-[var(--color-brand-soft)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <AtSign className="w-3 h-3 text-[var(--text-tertiary)]" />
                <span className="font-semibold">{c.name}</span>
                <span className="text-[10px] text-[var(--text-tertiary)] truncate">{c.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
