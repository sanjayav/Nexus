import { useMemo } from 'react'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { PRODUCTS_DATA, type ProductsData, type WorkspaceId } from './data'
import { useProductsSlice } from './store'

/** Tenant product data with the user's overrides (certification, passport status) merged in. */
export function useProductsData(): ProductsData {
  const { workspace } = useWorkspace()
  const slice = useProductsSlice()
  return useMemo(() => {
    const seed = PRODUCTS_DATA[workspace.id as WorkspaceId] ?? PRODUCTS_DATA.aeiforo
    return {
      ...seed,
      products: seed.products.map(p => ({ ...p, cert: slice.cert[p.id] ?? p.cert })),
      passport: seed.passport && {
        ...seed.passport,
        items: seed.passport.items.map(it => ({ ...it, status: slice.passport[it.id] ?? it.status })),
      },
    }
  }, [workspace.id, slice])
}
