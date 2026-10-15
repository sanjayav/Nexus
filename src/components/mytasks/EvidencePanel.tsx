import { useState } from 'react'
import { Paperclip, Upload, X, FileText, CheckCircle2 } from 'lucide-react'
import { orgStore, type QuestionAssignment, type OrgEntity, type OrgMember } from '../../lib/orgStore'

export function EvidencePanel({ evidence, locked, onAdd, onRemove }: {
  evidence: string[]
  locked: boolean
  onAdd: (name: string) => void
  onRemove: (idx: number) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const handleFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(f => onAdd(f.name))
  }

  return (
    <aside className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 h-fit">
      <h4 className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-1">
        <Paperclip className="w-3 h-3" /> Evidence
      </h4>
      <p className="text-[10px] text-[var(--text-tertiary)] mb-3">
        Attach the source doc the reviewer will need. PDF, XLSX, CSV, PNG.
      </p>

      {!locked && (
        <label
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault(); setDragOver(false)
            handleFiles(e.dataTransfer.files)
          }}
          className={`block p-4 rounded-[var(--radius-md)] border-2 border-dashed text-center cursor-pointer transition-colors ${
            dragOver ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]' : evidence.length === 0 ? 'border-[var(--status-reject)]/30 bg-[var(--accent-red-light)]/30' : 'border-[var(--border-default)] bg-[var(--bg-primary)]'
          }`}
        >
          <Upload className="w-4 h-4 mx-auto text-[var(--text-tertiary)] mb-1" />
          <div className="text-[10px] font-semibold text-[var(--text-primary)]">
            {evidence.length === 0 ? 'Drop file or browse' : 'Add another'}
          </div>
          <input type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
        </label>
      )}

      {evidence.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {evidence.map((e, i) => (
            <li key={e + i} className="flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
              <FileText className="w-3 h-3 text-[var(--color-brand)] flex-shrink-0" />
              <div className="text-[10px] font-medium text-[var(--text-primary)] truncate flex-1 font-mono">
                {e.startsWith('connector:') ? e.split(':')[1] : e.split('_').slice(2).join('_') || e}
              </div>
              {!locked && (
                <button onClick={() => onRemove(i)} className="w-4 h-4 rounded text-[var(--text-tertiary)] hover:text-[var(--status-reject)] flex items-center justify-center">
                  <X className="w-3 h-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}

export function HandoffHint({
  status, entityId, entities, members,
}: {
  status: QuestionAssignment['status']
  entityId: string
  entities: OrgEntity[]
  members: OrgMember[]
}) {
  const path = orgStore.pathOf(entities, entityId)
  const subsidiaryId = path.find(p => p.type === 'subsidiary')?.id
  const reviewer = subsidiaryId
    ? members.find(m => m.entityId === subsidiaryId && m.role === 'subsidiary_lead')
    : undefined
  const approver = members.find(m => m.role === 'group_sustainability_officer')

  let label = ''
  let name = ''
  if (status === 'submitted') {
    label = 'Sent to'
    name = reviewer?.name ?? 'your subsidiary lead'
  } else if (status === 'reviewed') {
    label = 'With'
    name = approver?.name ?? 'the group sustainability officer'
  } else if (status === 'approved') {
    label = 'Approved — included in the group rollup'
  }

  return (
    <div className="flex items-center gap-2 text-[var(--text-xs)]">
      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--status-ok)]" />
      <span className="text-[var(--text-secondary)]">
        {label} {name && <strong className="text-[var(--text-primary)]">{name}</strong>}
        {status !== 'approved' && <span className="text-[var(--text-tertiary)]"> · you'll get a notification on the decision</span>}
      </span>
    </div>
  )
}
