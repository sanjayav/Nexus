import { useEffect, useMemo, useState } from 'react'
import {
  Building2, Factory, Globe2, Landmark, Plus, Pencil, Trash2, ChevronRight, ChevronDown,
  Check, X, Users, Sparkles, ArrowRight,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { orgStore, type OrgEntity, type OrgMember, type EntityType } from '../lib/orgStore'
import { ROLE_CATALOG, type PlatformRole } from '../lib/rbac'
import JourneyBar from '../components/JourneyBar'
import { FrameworkBadge } from '../components/FrameworkBadge'
import { useFramework } from '../lib/frameworks'

const TYPE_META: Record<EntityType, { label: string; icon: typeof Building2; tint: string; tintFg: string }> = {
  group:        { label: 'Group',        icon: Landmark,   tint: 'var(--accent-teal)',    tintFg: '#fff' },
  business_unit:{ label: 'Business Unit', icon: Globe2,    tint: 'var(--accent-purple)',  tintFg: '#fff' },
  subsidiary:   { label: 'Subsidiary',   icon: Building2,  tint: 'var(--accent-blue)',    tintFg: '#fff' },
  plant:        { label: 'Plant',        icon: Factory,    tint: 'var(--accent-amber)',   tintFg: '#1f1404' },
  office:       { label: 'Office',       icon: Building2,  tint: 'var(--text-tertiary)',  tintFg: '#fff' },
}

const CHILD_TYPE_FOR: Record<EntityType, EntityType[]> = {
  group: ['business_unit', 'subsidiary'],
  business_unit: ['subsidiary'],
  subsidiary: ['plant', 'office'],
  plant: [],
  office: [],
}

export default function OrgOnboarding() {
  const navigate = useNavigate()
  const [entities, setEntities] = useState<OrgEntity[]>([])
  const [members, setMembers] = useState<OrgMember[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addingUnder, setAddingUnder] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const refresh = async () => {
    try {
      const [ents, mems] = await Promise.all([orgStore.listEntities(), orgStore.listMembers()])
      setEntities(ents)
      setMembers(mems)
      if (ents.length && !selectedId) setSelectedId(ents[0].id)
      const groups = ents.filter(e => e.type === 'group' || e.type === 'business_unit').map(e => e.id)
      setExpanded(prev => new Set([...prev, ...groups]))
    } catch { /* silent */ }
  }

  useEffect(() => { refresh() }, [])

  const byParent = useMemo(() => {
    const m = new Map<string | null, OrgEntity[]>()
    for (const e of entities) {
      const arr = m.get(e.parentId) || []
      arr.push(e)
      m.set(e.parentId, arr)
    }
    return m
  }, [entities])

  const roots = byParent.get(null) || []
  const selected = entities.find(e => e.id === selectedId) || null

  const stats = useMemo(() => ({
    total: entities.length,
    groups: entities.filter(e => e.type === 'group').length,
    subs: entities.filter(e => e.type === 'subsidiary').length,
    plants: entities.filter(e => e.type === 'plant').length,
    members: members.length,
  }), [entities, members])

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <JourneyBar variant="compact" highlight="onboard" />
      </div>
      <header className="mb-6">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--color-brand)]">
          <Sparkles className="w-3 h-3" /> Organisation onboarding
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <h1 className="font-display text-[28px] font-bold text-[var(--text-primary)]">
            Build your reporting tree
          </h1>
          <FrameworkBadge size="md" />
        </div>
        <FrameworkScopeNote />
      </header>

      <div className="grid grid-cols-4 gap-3 mb-5">
        <Stat label="Entities" value={stats.total} />
        <Stat label="Subsidiaries" value={stats.subs} />
        <Stat label="Reporting plants" value={stats.plants} />
        <Stat label="Assigned members" value={stats.members} />
      </div>

      <div className="grid grid-cols-[1fr_400px] gap-5">
        {/* TREE */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 min-h-[480px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-[var(--text-base)] font-semibold text-[var(--text-primary)]">
              Reporting entity tree
            </h2>
            {roots.length === 0 && (
              <button
                onClick={() => setAddingUnder('__root__')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-xs)] font-semibold hover:bg-[var(--color-brand-strong)] transition-colors"
              >
                <Plus className="w-3 h-3" /> Start with a group
              </button>
            )}
          </div>

          {roots.length === 0 && addingUnder !== '__root__' && (
            <EmptyState onAdd={() => setAddingUnder('__root__')} />
          )}

          {addingUnder === '__root__' && (
            <AddRow
              allowedTypes={['group']}
              parent={null}
              onCancel={() => setAddingUnder(null)}
              onSave={async data => { await orgStore.addEntity(data); setAddingUnder(null); await refresh() }}
            />
          )}

          {roots.map(r => (
            <TreeNode
              key={r.id}
              entity={r}
              byParent={byParent}
              expanded={expanded}
              selectedId={selectedId}
              editingId={editingId}
              addingUnder={addingUnder}
              depth={0}
              onToggle={id => {
                const next = new Set(expanded)
                if (next.has(id)) next.delete(id); else next.add(id)
                setExpanded(next)
              }}
              onSelect={setSelectedId}
              onAddChild={id => { setAddingUnder(id); setExpanded(new Set([...expanded, id])) }}
              onEdit={setEditingId}
              onDelete={id => {
                if (confirm('Remove this entity and all descendants?')) { (async () => { await orgStore.removeEntity(id); await refresh() })() }
              }}
              onSave={async (id, patch) => { await orgStore.updateEntity(id, patch); setEditingId(null); await refresh() }}
              onCancelEdit={() => setEditingId(null)}
              onAddSubmit={async (parentId, data) => { await orgStore.addEntity({ ...data, parentId }); setAddingUnder(null); await refresh() }}
              onAddCancel={() => setAddingUnder(null)}
            />
          ))}
        </div>

        {/* SIDE — detail + assign members */}
        <aside className="space-y-4 sticky top-[72px] self-start">
          {selected ? (
            <DetailPanel
              entity={selected}
              entities={entities}
              members={members}
              onUpdated={refresh}
            />
          ) : (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] bg-[var(--bg-primary)] p-8 text-center">
              <Building2 className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
              <p className="text-[var(--text-sm)] text-[var(--text-tertiary)]">
                Pick an entity from the tree to view and assign members.
              </p>
            </div>
          )}

          <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--color-brand-soft)] p-5">
            <h3 className="text-[var(--text-sm)] font-semibold text-[var(--color-brand-strong)] mb-1">
              Ready to collect data?
            </h3>
            <p className="text-[var(--text-xs)] text-[var(--color-brand-strong)]/80 mb-3">
              Once the tree looks right, jump into assignments — pick a GRI question, pick a user, pick the plant it applies to.
            </p>
            <button
              onClick={() => navigate('/admin/assignments')}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--color-brand-strong)] transition-colors"
            >
              Open assignment manager <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-4">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">{label}</div>
      <div className="text-[22px] font-bold tabular-nums text-[var(--text-primary)] mt-1">{value}</div>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-14">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--color-brand-soft)] flex items-center justify-center">
        <Landmark className="w-7 h-7 text-[var(--color-brand)]" />
      </div>
      <h3 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)] mt-3">
        Start with your parent group
      </h3>
      <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] mt-1 max-w-sm mx-auto">
        Then add business units under the group, subsidiaries under each BU, and plants/offices under subsidiaries.
      </p>
      <button
        onClick={onAdd}
        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--color-brand-strong)]"
      >
        <Plus className="w-4 h-4" /> Add group
      </button>
    </div>
  )
}

interface TreeNodeProps {
  entity: OrgEntity
  byParent: Map<string | null, OrgEntity[]>
  expanded: Set<string>
  selectedId: string | null
  editingId: string | null
  addingUnder: string | null
  depth: number
  onToggle: (id: string) => void
  onSelect: (id: string) => void
  onAddChild: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onSave: (id: string, patch: Partial<OrgEntity>) => void
  onCancelEdit: () => void
  onAddSubmit: (parentId: string, data: Omit<OrgEntity, 'id' | 'createdAt'>) => void
  onAddCancel: () => void
}

function TreeNode(p: TreeNodeProps) {
  const { entity, byParent, expanded, selectedId, editingId, addingUnder, depth } = p
  const children = byParent.get(entity.id) || []
  const isOpen = expanded.has(entity.id)
  const Icon = TYPE_META[entity.type].icon
  const selected = selectedId === entity.id
  const editing = editingId === entity.id
  const hasChildren = children.length > 0
  const canAddChild = CHILD_TYPE_FOR[entity.type].length > 0

  return (
    <div>
      <div
        className={`group flex items-center gap-2 py-2 px-2 rounded-[var(--radius-md)] transition-colors cursor-pointer ${
          selected ? 'bg-[var(--color-brand-soft)] border border-[var(--color-brand)]/30' : 'hover:bg-[var(--bg-secondary)] border border-transparent'
        }`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => p.onSelect(entity.id)}
      >
        <button
          type="button"
          onClick={e => { e.stopPropagation(); if (hasChildren) p.onToggle(entity.id) }}
          className={`w-5 h-5 flex items-center justify-center rounded ${hasChildren ? 'hover:bg-[var(--bg-tertiary)]' : 'opacity-20'}`}
        >
          {hasChildren ? (isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />) : <span className="w-3.5 h-3.5" />}
        </button>

        <div
          className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0"
          style={{ background: TYPE_META[entity.type].tint, color: TYPE_META[entity.type].tintFg }}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>

        {editing ? (
          <EditRow
            entity={entity}
            onCancel={p.onCancelEdit}
            onSave={patch => p.onSave(entity.id, patch)}
          />
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <div className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] truncate">{entity.name}</div>
              <div className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-2">
                <span className="uppercase tracking-wider font-semibold">{TYPE_META[entity.type].label}</span>
                {entity.code && <span>· {entity.code}</span>}
                {entity.country && <span>· {entity.country}</span>}
                {entity.equity != null && <span>· {entity.equity}% equity</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {canAddChild && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); p.onAddChild(entity.id) }}
                  className="w-6 h-6 rounded hover:bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center"
                  title="Add child"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={e => { e.stopPropagation(); p.onEdit(entity.id) }}
                className="w-6 h-6 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] flex items-center justify-center"
                title="Edit"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); p.onDelete(entity.id) }}
                className="w-6 h-6 rounded hover:bg-[var(--accent-red-light)] text-[var(--status-reject)] flex items-center justify-center"
                title="Remove"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Add-child inline row */}
      {addingUnder === entity.id && (
        <div style={{ paddingLeft: `${(depth + 1) * 20 + 8}px` }} className="py-2">
          <AddRow
            allowedTypes={CHILD_TYPE_FOR[entity.type]}
            parent={entity}
            onCancel={p.onAddCancel}
            onSave={data => p.onAddSubmit(entity.id, data)}
          />
        </div>
      )}

      {isOpen && children.map(c => (
        <TreeNode key={c.id} {...p} entity={c} depth={depth + 1} />
      ))}
    </div>
  )
}

function AddRow({
  allowedTypes, parent, onCancel, onSave,
}: {
  allowedTypes: EntityType[]
  parent: OrgEntity | null
  onCancel: () => void
  onSave: (data: Omit<OrgEntity, 'id' | 'createdAt'>) => void
}) {
  const [type, setType] = useState<EntityType>(allowedTypes[0] || 'subsidiary')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [country, setCountry] = useState(parent?.country || '')
  const [equity, setEquity] = useState<string>('')

  const submit = () => {
    if (!name.trim()) return
    onSave({
      type,
      name: name.trim(),
      code: code.trim() || undefined,
      country: country.trim() || undefined,
      equity: equity ? parseFloat(equity) : undefined,
      parentId: parent?.id ?? null,
    })
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-brand)]/40 bg-[var(--color-brand-soft)]/40 p-3 space-y-2">
      <div className="grid grid-cols-[140px_1fr_140px] gap-2">
        <select
          value={type}
          onChange={e => setType(e.target.value as EntityType)}
          className="px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-xs)]"
        >
          {allowedTypes.map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
        </select>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Entity name"
          className="px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]"
        />
        <input
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="Code (optional)"
          className="px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-xs)] font-mono"
        />
      </div>
      <div className="grid grid-cols-[1fr_140px_auto_auto] gap-2">
        <input
          value={country}
          onChange={e => setCountry(e.target.value)}
          placeholder="Country"
          className="px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-xs)]"
        />
        {type === 'subsidiary' ? (
          <input
            type="number"
            value={equity}
            onChange={e => setEquity(e.target.value)}
            placeholder="Equity %"
            className="px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-xs)]"
          />
        ) : <div />}
        <button
          type="button"
          onClick={submit}
          disabled={!name.trim()}
          className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-brand)] text-white text-[var(--text-xs)] font-semibold disabled:opacity-50 hover:bg-[var(--color-brand-strong)] inline-flex items-center gap-1"
        >
          <Check className="w-3 h-3" /> Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-1.5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] inline-flex items-center"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

function EditRow({
  entity, onCancel, onSave,
}: {
  entity: OrgEntity
  onCancel: () => void
  onSave: (patch: Partial<OrgEntity>) => void
}) {
  const [name, setName] = useState(entity.name)
  const [code, setCode] = useState(entity.code || '')
  const [country, setCountry] = useState(entity.country || '')
  const [equity, setEquity] = useState(entity.equity != null ? String(entity.equity) : '')

  const submit = () => onSave({
    name: name.trim() || entity.name,
    code: code.trim() || undefined,
    country: country.trim() || undefined,
    equity: equity ? parseFloat(equity) : undefined,
  })

  return (
    <div className="flex items-center gap-2 flex-1">
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        className="flex-1 px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--color-brand)] bg-[var(--bg-primary)] text-[var(--text-sm)]"
      />
      <input value={code} onChange={e => setCode(e.target.value)} placeholder="Code" className="w-20 px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[10px] font-mono" />
      <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Country" className="w-24 px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[10px]" />
      {entity.type === 'subsidiary' && (
        <input type="number" value={equity} onChange={e => setEquity(e.target.value)} placeholder="Eq%" className="w-16 px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[10px]" />
      )}
      <button onClick={e => { e.stopPropagation(); submit() }} className="w-6 h-6 rounded bg-[var(--color-brand)] text-white flex items-center justify-center">
        <Check className="w-3 h-3" />
      </button>
      <button onClick={e => { e.stopPropagation(); onCancel() }} className="w-6 h-6 rounded text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-center">
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

function DetailPanel({
  entity, entities, members, onUpdated,
}: {
  entity: OrgEntity
  entities: OrgEntity[]
  members: OrgMember[]
  onUpdated: () => Promise<void> | void
}) {
  const entityMembers = members.filter(m => m.entityId === entity.id)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState<{ name: string; email: string; role: PlatformRole }>({
    name: '', email: '', role: 'data_contributor',
  })

  const path = orgStore.pathOf(entities, entity.id)
  const Icon = TYPE_META[entity.type].icon

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) return
    try {
      await orgStore.addMember({
        userId: null,
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        entityId: entity.id,
      })
      setForm({ name: '', email: '', role: 'data_contributor' })
      setAddOpen(false)
      await onUpdated()
    } catch (e) {
      alert(`Could not add member: ${e instanceof Error ? e.message : e}`)
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden">
      <div className="p-5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center"
               style={{ background: TYPE_META[entity.type].tint, color: TYPE_META[entity.type].tintFg }}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
              {TYPE_META[entity.type].label}
            </div>
            <h3 className="font-display text-[var(--text-base)] font-bold text-[var(--text-primary)] truncate">{entity.name}</h3>
          </div>
        </div>
        <nav className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1 flex-wrap">
          {path.map((p, i) => (
            <span key={p.id} className={i === path.length - 1 ? 'font-semibold text-[var(--text-primary)]' : ''}>
              {p.name}{i < path.length - 1 && <span className="mx-1 text-[var(--text-tertiary)]">›</span>}
            </span>
          ))}
        </nav>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {entity.code && <Field label="Code" value={entity.code} mono />}
          {entity.country && <Field label="Country" value={entity.country} />}
          {entity.equity != null && <Field label="Equity" value={`${entity.equity}%`} />}
          {entity.industry && <Field label="Industry" value={entity.industry} />}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[var(--text-xs)] font-semibold text-[var(--text-primary)] uppercase tracking-wider">
              <Users className="w-3 h-3 inline -mt-0.5 mr-1" />
              Members ({entityMembers.length})
            </h4>
            {!addOpen && (
              <button
                onClick={() => setAddOpen(true)}
                className="text-[var(--text-xs)] font-semibold text-[var(--color-brand)] hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            )}
          </div>
          {entityMembers.length === 0 && !addOpen && (
            <div className="text-[var(--text-xs)] text-[var(--text-tertiary)] italic py-2">No members assigned to this entity yet.</div>
          )}
          <ul className="space-y-1.5">
            {entityMembers.map(m => (
              <li key={m.id} className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-secondary)]">
                <div className="w-7 h-7 rounded-full bg-[var(--color-brand)] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {m.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[var(--text-xs)] font-semibold text-[var(--text-primary)] truncate">{m.name}</div>
                  <div className="text-[10px] text-[var(--text-tertiary)] truncate">{m.email}</div>
                </div>
                <span className="text-[9px] uppercase tracking-wider font-semibold text-[var(--color-brand)] bg-[var(--color-brand-soft)] px-1.5 py-0.5 rounded">
                  {ROLE_CATALOG[m.role].name.split(' ').map(w => w[0]).join('')}
                </span>
                <button
                  onClick={async () => { await orgStore.removeMember(m.id); await onUpdated() }}
                  className="w-5 h-5 rounded text-[var(--text-tertiary)] hover:text-[var(--status-reject)] hover:bg-[var(--accent-red-light)] flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>

          {addOpen && (
            <div className="mt-2 rounded-[var(--radius-md)] border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)]/40 p-3 space-y-2">
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
                className="w-full px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]"
              />
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="Email"
                className="w-full px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]"
              />
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as PlatformRole }))}
                className="w-full px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]"
              >
                {Object.values(ROLE_CATALOG).map(r => (
                  <option key={r.slug} value={r.slug}>{r.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button onClick={save} className="flex-1 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-brand)] text-white text-[var(--text-xs)] font-semibold">Add member</button>
                <button onClick={() => setAddOpen(false)} className="px-3 py-1.5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-xs)]">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FrameworkScopeNote() {
  const { active } = useFramework()
  return (
    <p className="text-[var(--text-sm)] text-[var(--text-secondary)] max-w-2xl mt-1">
      The tree you build here is shared across every reporting framework — you do it once, not per framework.
      Right now you're preparing to report against <strong className="text-[var(--text-primary)]">{active.name}</strong>;
      the same entities will power CSRD, CDP, TCFD and ISSB when they come online.
    </p>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold">{label}</div>
      <div className={`text-[var(--text-sm)] text-[var(--text-primary)] font-medium ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  )
}
