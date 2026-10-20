import { useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import type { Contract } from './data'

/*
 * Carbon-asset changes the user makes: green-power contracts added to the
 * ledger and the ETS "if covered" toggle. Seed data in ./data stays immutable.
 * Partitioned by workspace id.
 */

export interface CarbonAssetsSlice {
  contracts: Contract[]
  etsScenario?: boolean
}

const EMPTY: CarbonAssetsSlice = { contracts: [] }

interface CarbonAssetsState {
  byWorkspace: Record<string, CarbonAssetsSlice>
  patch: (ws: string, fn: (s: CarbonAssetsSlice) => CarbonAssetsSlice) => void
}

export const useCarbonAssetsStore = create<CarbonAssetsState>()(
  persist(
    set => ({
      byWorkspace: {},
      patch: (ws, fn) => set(s => ({ byWorkspace: { ...s.byWorkspace, [ws]: fn(s.byWorkspace[ws] ?? EMPTY) } })),
    }),
    { name: 'nexus.carbonAssets', version: 1, storage: createJSONStorage(() => localStorage) },
  ),
)

export function useCarbonAssetsSlice(): CarbonAssetsSlice {
  const { workspace } = useWorkspace()
  return useCarbonAssetsStore(s => s.byWorkspace[workspace.id]) ?? EMPTY
}

export function useCarbonAssetsActions() {
  const { workspace } = useWorkspace()
  const patch = useCarbonAssetsStore(s => s.patch)
  return useMemo(() => {
    const ws = workspace.id
    return {
      addContract: (c: Omit<Contract, 'id' | 'userAdded'>) =>
        patch(ws, s => ({ ...s, contracts: [...s.contracts, { ...c, id: `user-${Date.now().toString(36)}`, userAdded: true }] })),
      removeContract: (id: string) => patch(ws, s => ({ ...s, contracts: s.contracts.filter(c => c.id !== id) })),
      setEtsScenario: (etsScenario: boolean) => patch(ws, s => ({ ...s, etsScenario })),
    }
  }, [patch, workspace.id])
}
