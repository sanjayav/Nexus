import { useMemo } from 'react'
import { useMockData, useWorkspace } from '@/features/workspace/WorkspaceContext'
import { CARBON_ASSETS_DATA, type CarbonAssetsData, type WorkspaceId } from './data'
import { creditTotals, reconcileScope2 } from './model'
import { useCarbonAssetsSlice } from './store'

/** Tenant carbon-asset data with user-added contracts merged in, plus the live Scope 2 reconciliation. */
export function useCarbonAssets() {
  const { workspace, region } = useWorkspace()
  const { ghg } = useMockData()
  const slice = useCarbonAssetsSlice()
  return useMemo(() => {
    const seed: CarbonAssetsData = CARBON_ASSETS_DATA[workspace.id as WorkspaceId] ?? CARBON_ASSETS_DATA.aeiforo
    const contracts = [...seed.contracts, ...slice.contracts]
    const factor = region.gridFactor.value
    const location = ghg.scope2Location.value
    return {
      ...seed,
      contracts,
      factor,
      location,
      reportedMarket: ghg.scope2Market.value,
      scope2: reconcileScope2(location, factor, contracts),
      credit: creditTotals(seed.credits),
      etsScenario: slice.etsScenario ?? false,
    }
  }, [workspace.id, region.gridFactor.value, ghg, slice])
}

export type CarbonAssetsView = ReturnType<typeof useCarbonAssets>
