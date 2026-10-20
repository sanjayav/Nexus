import { useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { suppliersFor, type Channel, type DataStatus, type Supplier, type TemplateId } from './data'

/*
 * Supplier engagement state: status overrides and interaction events the user
 * created (invitations, reminders, reviews), on top of the immutable demo data
 * in ./data.ts. Partitioned by workspace id.
 */

export type EventKind = 'invited' | 'reminded' | 'submitted' | 'verified' | 'returned'

export interface SupplierEvent {
  id: string
  kind: EventKind
  at: string
  actor?: string
  template?: TemplateId
  channels?: Channel[]
  deadline?: string
  note?: string
}

export interface SupplierUpdate {
  id: string
  status?: DataStatus
  event: SupplierEvent
}

interface SuppliersSlice {
  status: Record<string, DataStatus>
  events: Record<string, SupplierEvent[]>
}

interface SuppliersState {
  workspaces: Record<string, SuppliersSlice>
  apply: (ws: string, updates: SupplierUpdate[]) => void
  reset: (ws: string) => void
}

const EMPTY: SuppliersSlice = { status: {}, events: {} }

export const useSuppliersStore = create<SuppliersState>()(
  persist(
    set => ({
      workspaces: {},
      apply: (ws, updates) =>
        set(state => {
          const prev = state.workspaces[ws] ?? EMPTY
          const status = { ...prev.status }
          const events = { ...prev.events }
          for (const u of updates) {
            if (u.status) status[u.id] = u.status
            events[u.id] = [...(events[u.id] ?? []), u.event]
          }
          return { workspaces: { ...state.workspaces, [ws]: { status, events } } }
        }),
      reset: ws =>
        set(state => {
          const { [ws]: _removed, ...rest } = state.workspaces
          return { workspaces: rest }
        }),
    }),
    {
      name: 'nexus.suppliers',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({ workspaces: state.workspaces }),
    },
  ),
)

/** Interaction history implied by the demo record's dates. */
function seedEvents(s: Supplier): SupplierEvent[] {
  const out: SupplierEvent[] = []
  if (s.invitedAt)
    out.push({
      id: `${s.id}-inv`,
      kind: 'invited',
      at: s.invitedAt,
      template: s.pcf || s.submitted?.pcf ? 'pcf' : 'esg',
      channels: s.channel ? [s.channel] : undefined,
    })
  if (s.submittedAt) out.push({ id: `${s.id}-sub`, kind: 'submitted', at: s.submittedAt })
  if (s.verifiedAt) out.push({ id: `${s.id}-ver`, kind: 'verified', at: s.verifiedAt })
  return out
}

export type SupplierView = Supplier & { events: SupplierEvent[] }

/** Suppliers for the current workspace with the user's overrides applied, plus a bound `apply`. */
export function useSuppliers() {
  const { workspace } = useWorkspace()
  const ws = workspace.id
  const slice = useSuppliersStore(useShallow(s => s.workspaces[ws] ?? EMPTY))
  const apply = useSuppliersStore(s => s.apply)
  const demo = suppliersFor(ws)

  const suppliers = useMemo<SupplierView[]>(
    () =>
      demo.suppliers.map(s => ({
        ...s,
        status: slice.status[s.id] ?? s.status,
        events: [...seedEvents(s), ...(slice.events[s.id] ?? [])].sort((a, b) => a.at.localeCompare(b.at)),
      })),
    [demo, slice],
  )

  return useMemo(() => ({ demo, suppliers, apply: (updates: SupplierUpdate[]) => apply(ws, updates) }), [demo, suppliers, apply, ws])
}
