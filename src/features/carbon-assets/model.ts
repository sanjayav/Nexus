import { isInstrument, type Contract, type Credit } from './data'

/*
 * Market-based Scope 2 reconciliation (GHG Protocol Scope 2 dual reporting):
 *
 *   grid MWh        = Scope 2 location-based / grid factor
 *   covered MWh     = min(Σ instrument MWh, grid MWh)     (绿电交易 + 绿证, or I-RECs)
 *   Scope 2 market  = Scope 2 location − covered MWh × grid factor
 *
 * Uncovered consumption keeps the location-based grid factor (电力二氧化碳排放因子
 * for CN); no official residual-mix factor is applied. Self-generated renewable
 * electricity is not a purchased instrument and is outside grid purchases.
 */
export function reconcileScope2(location: number, factor: number, contracts: Contract[]) {
  const gridMWh = factor > 0 ? location / factor : 0
  const instrumentMWh = contracts.filter(isInstrument).reduce((sum, c) => sum + c.mwh, 0)
  const selfMWh = contracts.filter(c => !isInstrument(c)).reduce((sum, c) => sum + c.mwh, 0)
  const covered = Math.min(instrumentMWh, gridMWh)
  const reduction = covered * factor
  return {
    gridMWh,
    instrumentMWh,
    selfMWh,
    covered,
    reduction,
    market: location - reduction,
    coverage: gridMWh > 0 ? (covered / gridMWh) * 100 : 0,
  }
}

export function creditTotals(credits: Credit[]) {
  const acquired = credits.reduce((sum, c) => sum + c.acquired, 0)
  const retired = credits.reduce((sum, c) => sum + c.retired, 0)
  const disclosed = credits.filter(c => c.retiredForDisclosure).reduce((sum, c) => sum + c.retired, 0)
  return { acquired, retired, held: acquired - retired, disclosed }
}
