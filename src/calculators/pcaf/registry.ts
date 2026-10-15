/**
 * PCAF calculator registry array. Lives in its own module so the
 * per-asset-class files can import shared types from ./index without a
 * circular dependency back through the registry (which would leave the
 * exported `PCAF_CALCULATORS` items as undefined at first-import time).
 */
import type { PcafAssetCalculator, PcafAssetClass } from './index'
import { listedEquity } from './listedEquity'
import { corporateBond } from './corporateBond'
import { businessLoan } from './businessLoan'
import { unlistedEquity } from './unlistedEquity'
import { projectFinance } from './projectFinance'
import { commercialRealEstate } from './commercialRealEstate'
import { mortgage } from './mortgage'
import { motorVehicleLoan } from './motorVehicleLoan'
import { sovereignDebt } from './sovereignDebt'

export const PCAF_CALCULATORS: PcafAssetCalculator[] = [
  listedEquity,
  corporateBond,
  businessLoan,
  unlistedEquity,
  projectFinance,
  commercialRealEstate,
  mortgage,
  motorVehicleLoan,
  sovereignDebt,
]

export function findPcafCalculator(assetClass: PcafAssetClass): PcafAssetCalculator | undefined {
  return PCAF_CALCULATORS.find(c => c.assetClass === assetClass)
}
