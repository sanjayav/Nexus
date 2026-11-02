import { useAccessStore } from '@/features/access/store'
import { useCarbonAssetsStore } from '@/features/carbon-assets/store'
import { useProductsStore } from '@/features/products/store'
import { useRatingsStore } from '@/features/ratings/store'
import { useSuppliersStore } from '@/features/suppliers/store'
import { useReportingStore } from './reporting'

/**
 * Restore one workspace to its demo seed across every store (reporting,
 * directory, suppliers, ratings, products, carbon assets). Other workspaces
 * are untouched. New per-workspace stores must be added here.
 */
export function resetWorkspaceData(ws: string) {
  useReportingStore.getState().resetWorkspace(ws)
  useAccessStore.getState().resetWorkspace(ws)
  useSuppliersStore.getState().reset(ws)
  useRatingsStore.getState().reset(ws)
  useProductsStore.setState(s => ({ byWorkspace: without(s.byWorkspace, ws) }))
  useCarbonAssetsStore.setState(s => ({ byWorkspace: without(s.byWorkspace, ws) }))
}

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _removed, ...rest } = record
  return rest
}
