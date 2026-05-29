import { useEffect, useRef, useState } from 'react'
import { Bookmark, Plus, Star, Trash2, Users, X } from 'lucide-react'
import { orgStore, type SavedView } from '../lib/orgStore'

/**
 * Saved-views chip bar. Sits above the filter row on supported pages and lets
 * users name + persist the current filter combination, share it org-wide, and
 * set one as default. The page owns the canonical filter state; this component
 * just round-trips it through localstorage-less server storage.
 *
 * Wire-up pattern:
 *   const filters = { status, query, ... }
 *   <SavedViewsBar page="my-tasks" filters={filters} onApply={(f) => applyFilters(f)} />
 *
 * On mount, if a default exists for (user, page), we call onApply with its
 * filters so the user lands on their preferred slice without an extra click.
 */
export interface SavedViewsBarProps<F> {
  page: string
  filters: F
  onApply: (f: F) => void
  /** Called once on first load if a default view exists. Useful when the page
   *  needs to know it shouldn't overwrite the applied filters with its own
   *  initial defaults. */
  onDefaultApplied?: () => void
  className?: string
}

export default function SavedViewsBar<F>({ page, filters, onApply, onDefaultApplied, className }: SavedViewsBarProps<F>) {
  const [views, setViews] = useState<SavedView[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const appliedDefault = useRef(false)

  const refresh = async () => {
    try {
      const rows = await orgStore.listSavedViews(page)
      setViews(rows)
      if (!appliedDefault.current) {
        const def = rows.find(v => v.is_default && v.owned_by_me) ?? rows.find(v => v.is_default)
        if (def) {
          onApply(def.filters as F)
          setActiveId(def.id)
          onDefaultApplied?.()
        }
        appliedDefault.current = true
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load saved views')
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const applyView = (v: SavedView) => {
    onApply(v.filters as F)
    setActiveId(v.id)
    setMenuOpenId(null)
  }

  const handleSave = async (input: { name: string; is_shared: boolean; is_default: boolean }) => {
    try {
      const created = await orgStore.saveView({ page, filters, ...input })
      setViews(vs => {
        // If is_default, server already cleared other defaults — mirror locally.
        const next = input.is_default ? vs.map(v => ({ ...v, is_default: false })) : vs.slice()
        return [...next, created]
      })
      setActiveId(created.id)
      setDialogOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    }
  }

  const handleDelete = async (v: SavedView) => {
    if (!v.owned_by_me) { setError('Only the owner can delete this view.'); return }
    try {
      await orgStore.deleteSavedView(v.id)
      setViews(vs => vs.filter(x => x.id !== v.id))
      if (activeId === v.id) setActiveId(null)
      setMenuOpenId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div className={`flex items-center flex-wrap gap-2 ${className ?? ''}`} role="region" aria-label="Saved views">
      <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] font-bold text-[var(--text-tertiary)]">
        <Bookmark className="w-3.5 h-3.5" /> Views
      </span>
      <button
        type="button"
        onClick={() => { setActiveId(null) }}
        className={`chip ${activeId === null ? 'chip-active' : ''}`}
      >
        Default
      </button>
      {views.map(v => (
        <div key={v.id} className="relative">
          <button
            type="button"
            onClick={() => applyView(v)}
            onContextMenu={(e) => { e.preventDefault(); setMenuOpenId(menuOpenId === v.id ? null : v.id) }}
            className={`chip ${activeId === v.id ? 'chip-active' : ''} inline-flex items-center gap-1.5`}
            title={v.is_shared ? 'Shared with organisation' : 'Private view'}
          >
            {v.is_default && <Star className="w-3 h-3" fill="currentColor" />}
            {v.is_shared && !v.is_default && <Users className="w-3 h-3" />}
            <span>{v.name}</span>
            {v.owned_by_me && (
              <span
                role="button"
                tabIndex={0}
                aria-label={`More for view ${v.name}`}
                className="ml-1 -mr-1 p-0.5 rounded hover:bg-[var(--bg-tertiary)] cursor-pointer"
                onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === v.id ? null : v.id) }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setMenuOpenId(menuOpenId === v.id ? null : v.id) } }}
              >
                <X className="w-3 h-3 opacity-70" />
              </span>
            )}
          </button>
          {menuOpenId === v.id && v.owned_by_me && (
            <div
              role="menu"
              className="absolute z-30 top-full mt-1 left-0 min-w-[160px] surface-paper p-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => handleDelete(v)}
                className="w-full text-left px-2 py-1.5 text-[12px] rounded hover:bg-[var(--accent-red-light)] text-[var(--accent-red)] inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3 h-3" /> Delete view
              </button>
            </div>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="chip inline-flex items-center gap-1.5"
      >
        <Plus className="w-3 h-3" /> Save current as…
      </button>
      {error && (
        <span className="text-[11px] text-[var(--accent-red)]">{error}</span>
      )}
      {dialogOpen && <SaveDialog onCancel={() => setDialogOpen(false)} onSave={handleSave} />}
    </div>
  )
}

function SaveDialog({ onCancel, onSave }: {
  onCancel: () => void
  onSave: (input: { name: string; is_shared: boolean; is_default: boolean }) => void | Promise<void>
}) {
  const [name, setName] = useState('')
  const [isShared, setIsShared] = useState(false)
  const [isDefault, setIsDefault] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    try {
      await onSave({ name: trimmed, is_shared: isShared, is_default: isDefault })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label="Save view">
      <form onSubmit={submit} className="surface-paper p-5 w-full max-w-md space-y-4">
        <header className="flex items-center justify-between">
          <h3 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">Save current view</h3>
          <button type="button" onClick={onCancel} className="p-1 rounded hover:bg-[var(--bg-tertiary)]" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </header>
        <label className="block">
          <span className="text-[12px] font-semibold text-[var(--text-secondary)]">Name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g. "Overdue E1 emissions"'
            className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] text-[14px]"
          />
        </label>
        <label className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
          <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} />
          Share with my organisation
        </label>
        <label className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
          Set as my default for this page
        </label>
        <footer className="flex items-center justify-end gap-2 pt-2">
          <button type="button" onClick={onCancel} className="chip">Cancel</button>
          <button type="submit" disabled={busy || !name.trim()} className="chip chip-active">
            {busy ? 'Saving…' : 'Save view'}
          </button>
        </footer>
      </form>
    </div>
  )
}
