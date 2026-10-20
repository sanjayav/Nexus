import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AtSign, CheckCircle2, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import { useStrings } from '@/lib/i18n'
import { useWorkflowText } from '@/lib/i18n/shared/workflow'
import { useL10n, useWorkspace } from '@/features/workspace/WorkspaceContext'
import { PEOPLE } from '@/data/people'
import { useReportingActions, useWorkspaceSlice } from '@/store/hooks'
import { Button, ease, textareaClass } from '@/components/ui'
import { collaborationStrings } from './collaboration.strings'

/** Persisted discussion on a section (or one field of it), with @mentions. */
export default function CommentThread({
  moduleId,
  sectionId,
  fieldId,
  autoFocus,
}: {
  moduleId: string
  sectionId: string
  fieldId?: string
  autoFocus?: boolean
}) {
  const s = useStrings(collaborationStrings)
  const wt = useWorkflowText()
  const l10n = useL10n()
  const { workspace } = useWorkspace()
  const { comments } = useWorkspaceSlice()
  const { addComment, resolveComment } = useReportingActions()
  const [body, setBody] = useState('')
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  const thread = useMemo(
    () => comments.filter(c => c.sectionId === sectionId && (fieldId ? c.fieldId === fieldId : true)),
    [comments, sectionId, fieldId],
  )
  const people = PEOPLE[workspace.id] ?? []
  const suggestions = mentionQuery === null ? [] : people.filter(p => p.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)

  const onChange = (value: string) => {
    setBody(value)
    const caret = input.current?.selectionStart ?? value.length
    const m = /@([^\s@]*)$/.exec(value.slice(0, caret))
    setMentionQuery(m ? m[1] : null)
  }

  const insertMention = (name: string) => {
    const caret = input.current?.selectionStart ?? body.length
    const before = body.slice(0, caret).replace(/@([^\s@]*)$/, `@${name} `)
    setBody(before + body.slice(caret))
    setMentionQuery(null)
    requestAnimationFrame(() => input.current?.focus())
  }

  const send = () => {
    const text = body.trim()
    if (!text) return
    addComment(moduleId, sectionId, text, fieldId)
    setBody('')
    setMentionQuery(null)
  }

  return (
    <div className="space-y-3">
      {thread.length === 0 ? (
        <p className="text-[13px] text-zinc-500">{s.empty}</p>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {thread.map(c => (
              <motion.li
                key={c.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: ease.out }}
                className={clsx('flex gap-2.5', c.resolved && 'opacity-60')}
              >
                <span className="w-7 h-7 rounded-full bg-zinc-900 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                  {c.author.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-zinc-900">{c.author}</span>
                    <span className="text-zinc-400">{wt.ago(c.at)}</span>
                    {c.resolved && <span className="text-emerald-600">{s.resolved}</span>}
                    <button
                      type="button"
                      onClick={() => resolveComment(c.id)}
                      className="ml-auto inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-900"
                    >
                      {c.resolved ? <RotateCcw className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                      {c.resolved ? s.reopen : s.resolve}
                    </button>
                  </div>
                  <p className="mt-0.5 text-[13px] text-zinc-700 leading-relaxed whitespace-pre-wrap break-words">
                    {c.body.split(/(@\S+)/).map((part, i) =>
                      part.startsWith('@') ? (
                        <span key={i} className="text-sky-700 font-medium">
                          {part}
                        </span>
                      ) : (
                        part
                      ),
                    )}
                  </p>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <div className="relative">
        <textarea
          ref={input}
          rows={2}
          autoFocus={autoFocus}
          value={body}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              send()
            }
            if (e.key === 'Escape') setMentionQuery(null)
          }}
          placeholder={s.placeholder}
          aria-label={s.comments}
          className={clsx(textareaClass, 'min-h-[64px] pr-24')}
        />
        <div className="absolute right-2 bottom-2 flex items-center gap-2">
          <span className="hidden sm:inline text-[11px] text-zinc-400">{s.shortcut}</span>
          <Button size="sm" variant="primary" onClick={send} disabled={!body.trim()}>
            {s.send}
          </Button>
        </div>
        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.14 }}
              className="absolute left-0 bottom-full mb-1.5 w-64 p-1 bg-white border border-line rounded-xl shadow-pop z-20"
              role="listbox"
            >
              <li className="px-2.5 py-1.5 text-[11px] text-zinc-400 flex items-center gap-1">
                <AtSign className="w-3 h-3" /> {s.mentionHint}
              </li>
              {suggestions.map(p => (
                <li key={p.id}>
                  <button
                    type="button"
                    onMouseDown={e => (e.preventDefault(), insertMention(p.name))}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-zinc-50"
                  >
                    <span className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-700 text-[11px] font-semibold flex items-center justify-center">
                      {p.name.slice(0, 1)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] text-zinc-900">{p.name}</span>
                      <span className="block text-[11px] text-zinc-500 truncate">{l10n(p.title)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
