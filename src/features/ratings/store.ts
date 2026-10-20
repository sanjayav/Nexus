import { useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { ratingsFor, type ActionStatus, type PlanAction } from './data'

/*
 * Rating action plan state. Holds only the user's overrides on top of the
 * immutable demo plan in ./data.ts, partitioned by workspace id.
 */

type ActionPatch = Partial<Pick<PlanAction, 'status' | 'owner' | 'due'>>

interface RatingsSlice {
  added: PlanAction[]
  patches: Record<string, ActionPatch>
  removed: string[]
}

interface RatingsState {
  workspaces: Record<string, RatingsSlice>
  addAction: (ws: string, action: PlanAction) => void
  patchAction: (ws: string, id: string, patch: ActionPatch) => void
  removeAction: (ws: string, id: string) => void
  reset: (ws: string) => void
}

const EMPTY: RatingsSlice = { added: [], patches: {}, removed: [] }

const withSlice = (state: RatingsState, ws: string, fn: (s: RatingsSlice) => RatingsSlice) => ({
  workspaces: { ...state.workspaces, [ws]: fn(state.workspaces[ws] ?? EMPTY) },
})

export const useRatingsStore = create<RatingsState>()(
  persist(
    set => ({
      workspaces: {},
      addAction: (ws, action) => set(state => withSlice(state, ws, s => ({ ...s, added: [action, ...s.added] }))),
      patchAction: (ws, id, patch) =>
        set(state => withSlice(state, ws, s => ({ ...s, patches: { ...s.patches, [id]: { ...s.patches[id], ...patch } } }))),
      removeAction: (ws, id) =>
        set(state =>
          withSlice(state, ws, s => ({
            ...s,
            added: s.added.filter(a => a.id !== id),
            removed: s.added.some(a => a.id === id) ? s.removed : [...s.removed, id],
          })),
        ),
      reset: ws =>
        set(state => {
          const { [ws]: _removed, ...rest } = state.workspaces
          return { workspaces: rest }
        }),
    }),
    {
      name: 'nexus.ratings',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({ workspaces: state.workspaces }),
    },
  ),
)

/** The merged action plan for the current workspace plus bound actions. */
export function useActionPlan() {
  const { workspace } = useWorkspace()
  const ws = workspace.id
  const slice = useRatingsStore(useShallow(s => s.workspaces[ws] ?? EMPTY))
  const { addAction, patchAction, removeAction } = useRatingsStore(
    useShallow(s => ({ addAction: s.addAction, patchAction: s.patchAction, removeAction: s.removeAction })),
  )

  const actions = useMemo(() => {
    const seed = ratingsFor(ws).actions.filter(a => !slice.removed.includes(a.id))
    return [...slice.added, ...seed].map(a => ({ ...a, ...slice.patches[a.id] }))
  }, [ws, slice])

  return useMemo(
    () => ({
      actions,
      add: (action: PlanAction) => addAction(ws, action),
      setStatus: (id: string, status: ActionStatus) => patchAction(ws, id, { status }),
      setOwner: (id: string, owner: string) => patchAction(ws, id, { owner }),
      setDue: (id: string, due: string) => patchAction(ws, id, { due }),
      remove: (id: string) => removeAction(ws, id),
    }),
    [actions, ws, addAction, patchAction, removeAction],
  )
}
