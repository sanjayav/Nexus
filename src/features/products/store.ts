import { useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import type { CertStage, PassportStatus } from './data'

/*
 * Product-footprint state the user changes: certification progress, battery
 * passport checklist status and CBAM assumptions. Overrides only; seed data
 * in ./data stays immutable. Partitioned by workspace id.
 */

export interface ProductsSlice {
  cert: Record<string, CertStage>
  passport: Record<string, PassportStatus>
  euPrice?: number
  includeIndirect?: boolean
}

const EMPTY: ProductsSlice = { cert: {}, passport: {} }

interface ProductsState {
  byWorkspace: Record<string, ProductsSlice>
  patch: (ws: string, fn: (s: ProductsSlice) => ProductsSlice) => void
}

export const useProductsStore = create<ProductsState>()(
  persist(
    set => ({
      byWorkspace: {},
      patch: (ws, fn) => set(s => ({ byWorkspace: { ...s.byWorkspace, [ws]: fn(s.byWorkspace[ws] ?? EMPTY) } })),
    }),
    { name: 'nexus.products', version: 1, storage: createJSONStorage(() => localStorage) },
  ),
)

export function useProductsSlice(): ProductsSlice {
  const { workspace } = useWorkspace()
  return useProductsStore(s => s.byWorkspace[workspace.id]) ?? EMPTY
}

export function useProductsActions() {
  const { workspace } = useWorkspace()
  const patch = useProductsStore(s => s.patch)
  return useMemo(() => {
    const ws = workspace.id
    return {
      setCert: (id: string, stage: CertStage) => patch(ws, s => ({ ...s, cert: { ...s.cert, [id]: stage } })),
      setPassport: (id: string, status: PassportStatus) => patch(ws, s => ({ ...s, passport: { ...s.passport, [id]: status } })),
      setEuPrice: (euPrice: number) => patch(ws, s => ({ ...s, euPrice })),
      setIncludeIndirect: (includeIndirect: boolean) => patch(ws, s => ({ ...s, includeIndirect })),
    }
  }, [patch, workspace.id])
}
