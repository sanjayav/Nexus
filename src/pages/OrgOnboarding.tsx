import { useEffect, useMemo, useState } from 'react'
import {
  Building2, Factory, Globe2, Landmark, Plus, Pencil, Trash2, ChevronRight, ChevronDown,
  Check, X, Users, ArrowRight,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { orgStore, type OrgEntity, type OrgMember, type EntityType } from '../lib/orgStore'
import { ROLE_CATALOG, type PlatformRole } from '../lib/rbac'
import JourneyBar from '../components/JourneyBar'
import { FrameworkBadge } from '../components/FrameworkBadge'
import { useFramework } from '../lib/frameworks'
import ResetWorkspaceButton from '../components/ResetWorkspaceButton'
import PageHeader from '../components/PageHeader'
import { Trans, useTranslation } from 'react-i18next'
import i18n from '../i18n'
import { frameworkName } from '../components/FrameworkBadge'
import { StatLedger, StateBoundary, notify, useConfirm, SkeletonCard, Illustration } from '../components/ui'
import useSetupProgress, { invalidateSetup } from '../components/onboarding/useSetupProgress'

/** Localised entity-type label (TYPE_META.label stays as the English fallback). */
function typeLabel(type: EntityType): string {
  return i18n.t(`onboarding.org.types.${type}`, { defaultValue: TYPE_META[type].label })
}

const TYPE_META: Record<EntityType, { label: string; icon: typeof Building2; tint: string; tintFg: string }> = {
  // Emerald ordinal scale by depth: group darkest → site lightest.
  group:        { label: 'Group',        icon: Landmark,   tint: 'var(--chart-s1)',   tintFg: 'var(--bg-primary)' },
  business_unit:{ label: 'Business Unit', icon: Globe2,    tint: 'var(--chart-target)', tintFg: 'var(--bg-primary)' },
  subsidiary:   { label: 'Subsidiary',   icon: Building2,  tint: 'var(--chart-s2)',   tintFg: 'var(--bg-primary)' },
  plant:        { label: 'Plant',        icon: Factory,    tint: 'var(--bg-tertiary)', tintFg: 'var(--text-primary)' },
  office:       { label: 'Office',       icon: Building2,  tint: 'var(--bg-tertiary)', tintFg: 'var(--text-secondary)' },
}

const CHILD_TYPE_FOR: Record<EntityType, EntityType[]> = {
  group: ['business_unit', 'subsidiary'],
  business_unit: ['subsidiary'],
  subsidiary: ['plant', 'office'],
  plant: [],
  office: [],
}

export default function OrgOnboarding() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [entities, setEntities] = useState<OrgEntity[]>([])
  const [members, setMembers] = useState<OrgMember[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addingUnder, setAddingUnder] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const confirm = useConfirm()
  const setup = useSetupProgress()

  const refresh = async () => {
    setLoadError(null)
    try {
      const [ents, mems] = await Promise.all([orgStore.listEntities(), orgStore.listMembers()])
      setEntities(ents)
      setMembers(mems)
      if (ents.length && !selectedId) setSelectedId(ents[0].id)
      const groups = ents.filter(e => e.type === 'group' || e.type === 'business_unit').map(e => e.id)
      setExpanded(prev => new Set([...prev, ...groups]))
      invalidateSetup()
    } catch (e) {
      // Never show an empty tree for a failed load — that reads as "start from scratch".
      setLoadError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }
  const guard = async (fn: () => Promise<unknown>) => {
    try { await fn() } catch (e) { notify.error(t('onboarding.org.saveFailed'), { description: e instanceof Error ? e.message : undefined }) }
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
    <div className="page-container animate-fade-in">
      <div className="mb-4">
        <JourneyBar variant="compact" highlight="onboard" />
      </div>
      <PageHeader
        breadcrumbs={[
          { label: t('onboarding.org.breadcrumbSetup') },
          { label: t('shell.routes.organisation') },
        ]}
        eyebrow={t('onboarding.org.eyebrow')}
        title={t('onboarding.org.title')}
        actions={entities.length > 0 ? (
          <ResetWorkspaceButton variant="danger" onReset={() => { refresh(); navigate('/dashboard') }} />
        ) : undefined}
      >
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <FrameworkBadge size="md" />
        </div>
        <FrameworkScopeNote />
      </PageHeader>

      <StateBoundary
        loading={loading}
        error={loadError}
        onRetry={refresh}
        hasData={entities.length > 0}
        skeleton={<div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-5"><SkeletonCard /><SkeletonCard /></div>}
        errorState={{ title: t('onboarding.org.loadFailed') }}
      >
      <StatLedger
        className="mb-5"
        aria-label={t('onboarding.org.stats.aria')}
        items={[
          { id: 'entities', label: t('onboarding.org.stats.entities'), value: stats.total, tone: 'brand' },
          { id: 'subs', label: t('onboarding.org.stats.subsidiaries'), value: stats.subs, tone: 'neutral' },
          { id: 'plants', label: t('onboarding.org.stats.plants'), value: stats.plants, tone: 'neutral' },
          { id: 'members', label: t('onboarding.org.stats.members'), value: stats.members, tone: stats.members > 0 ? 'success' : 'warning' },
        ]}
      />

      {/* The real next action sits on top, not at the bottom of the rail. */}
      {entities.length >= 2 && setup.next && setup.next.key !== 'org_tree' && (
        <div className="surface-paper mb-5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-small font-semibold text-[var(--text-primary)]">{t('onboarding.org.readyTitle')}</div>
            <div className="text-caption text-[var(--text-secondary)] mt-0.5">{t('onboarding.org.nextStep', { step: t(`onboarding.setup.steps.${setup.next.key}.title`) })}</div>
          </div>
          <button
            onClick={() => navigate(setup.next!.route)}
            className="inline-flex items-center justify-center gap-2 min-h-[40px] px-4 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-small font-semibold hover:bg-[var(--btn-primary-bg-hover)] transition-colors duration-micro"
          >
            {t(`onboarding.setup.steps.${setup.next.key}.title`)} <ArrowRight className="w-4 h-4" aria-hidden />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-5">
        {/* TREE */}
        <div className="surface-paper p-4 sm:p-5 min-h-[360px] min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="type-h3 text-[var(--text-primary)]">
              {t('onboarding.org.treeTitle')}
            </h2>
            {roots.length === 0 && (
              <button
                onClick={() => setAddingUnder('__root__')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[length:var(--text-xs)] font-semibold hover:bg-[var(--btn-primary-bg-hover)] transition-colors"
              >
                <Plus className="w-3 h-3" /> {t('onboarding.org.startWithGroup')}
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
              onSave={data => guard(async () => { await orgStore.addEntity(data); setAddingUnder(null); await refresh(); notify.success(t('onboarding.org.added', { name: data.name })) })}
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
              onDelete={async id => {
                const ent = entities.find(e => e.id === id)
                const ok = await confirm({
                  title: t('onboarding.org.confirmRemoveTitle', { name: ent?.name ?? '' }),
                  description: t('onboarding.org.confirmRemove'),
                  tone: 'destructive',
                  confirmLabel: t('onboarding.org.remove'),
                })
                if (ok) await guard(async () => { await orgStore.removeEntity(id); await refresh(); notify.success(t('onboarding.org.removed', { name: ent?.name ?? '' })) })
              }}
              onSave={(id, patch) => guard(async () => { await orgStore.updateEntity(id, patch); setEditingId(null); await refresh() })}
              onCancelEdit={() => setEditingId(null)}
              onAddSubmit={(parentId, data) => guard(async () => { await orgStore.addEntity({ ...data, parentId }); setAddingUnder(null); await refresh(); notify.success(t('onboarding.org.added', { name: data.name })) })}
              onAddCancel={() => setAddingUnder(null)}
            />
          ))}
        </div>

        {/* SIDE — detail + assign members */}
        <aside className="space-y-4 lg:sticky lg:top-[72px] self-start min-w-0">
          {selected ? (
            <DetailPanel
              entity={selected}
              entities={entities}
              members={members}
              onUpdated={refresh}
            />
          ) : (
            <div className="surface-paper p-8 text-center">
              <Illustration name="connect" size={96} className="mx-auto" />
              <p className="text-small text-[var(--text-tertiary)] mt-2">
                {t('onboarding.org.pickEntity')}
              </p>
            </div>
          )}

        </aside>
      </div>
      </StateBoundary>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="text-center py-10">
      <Illustration name="connect" size={140} className="mx-auto" />
      <h3 className="type-h3 text-[var(--text-primary)] mt-3">{t('onboarding.org.emptyTitle')}</h3>
      <p className="text-small text-[var(--text-tertiary)] mt-1 max-w-sm mx-auto">{t('onboarding.org.emptyBody')}</p>
      <button
        onClick={onAdd}
        className="mt-4 inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-small font-semibold hover:bg-[var(--btn-primary-bg-hover)] transition-colors duration-micro"
      >
        <Plus className="w-4 h-4" aria-hidden /> {t('onboarding.org.addGroup')}
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
  const { t } = useTranslation()
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
          selected ? 'bg-[var(--bg-hover)] border border-[var(--color-brand)]/40' : 'hover:bg-[var(--bg-hover)] border border-transparent'
        }`}
        style={{ paddingLeft: `${Math.min(depth, 4) * 16 + 8}px` }}
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
              <div className="text-[length:var(--text-sm)] font-semibold text-[var(--text-primary)] truncate">{entity.name}</div>
              <div className="text-caption text-[var(--text-tertiary)] flex items-center gap-2">
                <span className="font-medium">{typeLabel(entity.type)}</span>
                {entity.code && <span>· {entity.code}</span>}
                {entity.country && <span>· {entity.country}</span>}
                {entity.equity != null && <span>· {t('onboarding.org.equityPct', { pct: entity.equity })}</span>}
              </div>
            </div>
            <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
              {canAddChild && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); p.onAddChild(entity.id) }}
                  className="w-9 h-9 rounded-[var(--radius-md)] hover:bg-[var(--bg-hover)] text-[var(--color-brand)] flex items-center justify-center" aria-label={t('onboarding.org.addChild')}
                  title={t('onboarding.org.addChild')}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={e => { e.stopPropagation(); p.onEdit(entity.id) }}
                className="w-9 h-9 rounded-[var(--radius-md)] hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] flex items-center justify-center"
                title={t('common.edit')}
                aria-label={t('common.edit')}
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); p.onDelete(entity.id) }}
                className="w-9 h-9 rounded-[var(--radius-md)] hover:bg-[var(--bg-hover)] text-[var(--status-danger)] flex items-center justify-center"
                title={t('onboarding.org.remove')}
                aria-label={t('onboarding.org.remove')}
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
  const { t } = useTranslation()
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
      <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_140px] gap-2">
        <select
          value={type}
          onChange={e => setType(e.target.value as EntityType)}
          className="px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[length:var(--text-xs)]"
        >
          {allowedTypes.map(ty => <option key={ty} value={ty}>{typeLabel(ty)}</option>)}
        </select>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder={t('onboarding.org.entityName')}
          className="px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[length:var(--text-sm)]"
        />
        <input
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder={t('onboarding.org.codeOptional')}
          className="px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[length:var(--text-xs)] font-mono"
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-[1fr_140px_auto_auto] gap-2">
        <input
          value={country}
          onChange={e => setCountry(e.target.value)}
          placeholder={t('onboarding.org.country')}
          className="px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[length:var(--text-xs)]"
        />
        {type === 'subsidiary' ? (
          <input
            type="number"
            value={equity}
            onChange={e => setEquity(e.target.value)}
            placeholder={t('onboarding.org.equityPlaceholder')}
            className="px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[length:var(--text-xs)]"
          />
        ) : <div />}
        <button
          type="button"
          onClick={submit}
          disabled={!name.trim()}
          className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[length:var(--text-xs)] font-semibold disabled:opacity-50 hover:bg-[var(--btn-primary-bg-hover)] inline-flex items-center gap-1"
        >
          <Check className="w-3 h-3" /> {t('onboarding.welcome.step4.add')}
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
  const { t } = useTranslation()
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
        className="flex-1 px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--color-brand)] bg-[var(--bg-primary)] text-[length:var(--text-sm)]"
      />
      <input value={code} onChange={e => setCode(e.target.value)} placeholder={t('onboarding.org.code')} className="w-20 px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-caption font-mono" />
      <input value={country} onChange={e => setCountry(e.target.value)} placeholder={t('onboarding.org.country')} className="w-24 px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-caption" />
      {entity.type === 'subsidiary' && (
        <input type="number" value={equity} onChange={e => setEquity(e.target.value)} placeholder={t('onboarding.org.eqShort')} className="w-16 px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-caption" />
      )}
      <button onClick={e => { e.stopPropagation(); submit() }} className="w-6 h-6 rounded bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] flex items-center justify-center">
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
  const { t } = useTranslation()
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
      notify.error(t('onboarding.org.addMemberFailed', { error: e instanceof Error ? e.message : String(e) }))
    }
  }

  return (
    <div className="surface-paper overflow-hidden">
      <div className="p-5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center"
               style={{ background: TYPE_META[entity.type].tint, color: TYPE_META[entity.type].tintFg }}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-caption font-medium text-[var(--text-tertiary)]">
              {typeLabel(entity.type)}
            </div>
            <h3 className="font-display text-[length:var(--text-base)] font-bold text-[var(--text-primary)] truncate">{entity.name}</h3>
          </div>
        </div>
        <nav className="text-caption text-[var(--text-tertiary)] flex items-center gap-1 flex-wrap">
          {path.map((p, i) => (
            <span key={p.id} className={i === path.length - 1 ? 'font-semibold text-[var(--text-primary)]' : ''}>
              {p.name}{i < path.length - 1 && <span className="mx-1 text-[var(--text-tertiary)]">›</span>}
            </span>
          ))}
        </nav>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {entity.code && <Field label={t('onboarding.org.code')} value={entity.code} mono />}
          {entity.country && <Field label={t('onboarding.org.country')} value={entity.country} />}
          {entity.equity != null && <Field label={t('onboarding.org.equity')} value={`${entity.equity}%`} />}
          {entity.industry && <Field label={t('onboarding.org.industry')} value={t(`onboarding.gics.${entity.industry}`, { defaultValue: entity.industry })} />}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[length:var(--text-xs)] font-semibold text-[var(--text-primary)] ">
              <Users className="w-3 h-3 inline -mt-0.5 mr-1" />
              {t('onboarding.org.members', { count: entityMembers.length })}
            </h4>
            {!addOpen && (
              <button
                onClick={() => setAddOpen(true)}
                className="text-[length:var(--text-xs)] font-semibold text-[var(--color-brand)] hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> {t('onboarding.welcome.step4.add')}
              </button>
            )}
          </div>
          {entityMembers.length === 0 && !addOpen && (
            <div className="text-[length:var(--text-xs)] text-[var(--text-tertiary)] italic py-2">{t('onboarding.org.noMembers')}</div>
          )}
          <ul className="space-y-1.5">
            {entityMembers.map(m => (
              <li key={m.id} className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-secondary)]">
                <div className="w-7 h-7 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-caption font-bold flex items-center justify-center flex-shrink-0">
                  {m.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[length:var(--text-xs)] font-semibold text-[var(--text-primary)] truncate">{m.name}</div>
                  <div className="text-caption text-[var(--text-tertiary)] truncate">{m.email}</div>
                </div>
                <span className="text-caption font-medium text-[var(--color-brand)] bg-[var(--color-brand-soft)] px-1.5 py-0.5 rounded">
                  {t(`shell.roles.${m.role}.name`, { defaultValue: ROLE_CATALOG[m.role]?.name ?? m.role })}
                </span>
                <button
                  onClick={async () => { try { await orgStore.removeMember(m.id); await onUpdated() } catch (e) { notify.error(t('onboarding.org.saveFailed'), { description: e instanceof Error ? e.message : undefined }) } }}
                  aria-label={t('onboarding.org.removeMember', { name: m.name })}
                  className="w-8 h-8 rounded text-[var(--text-tertiary)] hover:text-[var(--status-reject)] hover:bg-[var(--accent-red-light)] flex items-center justify-center"
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
                placeholder={t('auth.register.fullName')}
                className="w-full px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[length:var(--text-sm)]"
              />
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder={t('login.email')}
                className="w-full px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[length:var(--text-sm)]"
              />
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as PlatformRole }))}
                className="w-full px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[length:var(--text-sm)]"
              >
                {Object.values(ROLE_CATALOG).map(r => (
                  <option key={r.slug} value={r.slug}>{t(`shell.roles.${r.slug}.name`, { defaultValue: r.name })}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button onClick={save} className="flex-1 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[length:var(--text-xs)] font-semibold">{t('onboarding.org.addMember')}</button>
                <button onClick={() => setAddOpen(false)} className="px-3 py-1.5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] text-[length:var(--text-xs)]">{t('common.cancel')}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FrameworkScopeNote() {
  const { i18n: i18nInst } = useTranslation()
  const { active } = useFramework()
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--text-secondary)] max-w-2xl mt-1">
      <Trans
        i18nKey="onboarding.org.scopeNote"
        values={{ framework: frameworkName(active, i18nInst.language) }}
        components={{ b: <strong className="text-[var(--text-primary)]" /> }}
      />
    </p>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-caption font-medium text-[var(--text-tertiary)]">{label}</div>
      <div className={`text-[length:var(--text-sm)] text-[var(--text-primary)] font-medium ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  )
}
