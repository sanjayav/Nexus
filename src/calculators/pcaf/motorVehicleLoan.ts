import type { PcafAssetCalculator } from './index'
import { safeAttribution, toBool, toNum, PCAF_METHODOLOGY_URL } from './index'
import type { PcafDataQuality } from './index'
import {
  VEHICLE_ANNUAL_EMISSIONS,
  VEHICLE_TYPE_OPTIONS,
} from '../../data/pcafEmissionFactors'

/**
 * PCAF Asset Class F — Motor vehicle loans.
 *
 * Financed emissions = annual vehicle emissions × (loan / vehicle value).
 * Annual vehicle emissions come from either (a) odometer × vehicle EF/km,
 * (b) reported per-vehicle annual tCO2e, or (c) fleet average for the
 * drivetrain.
 */
export const motorVehicleLoan: PcafAssetCalculator = {
  id: 'pcaf_motor_vehicle_loan',
  assetClass: 'motor_vehicle_loan',
  name: 'Motor Vehicle Loans',
  description:
    'PCAF Standard F. Financed emissions = annual vehicle emissions × (loan / vehicle value). Prefer measured odometer × EF, fall back to fleet averages.',
  inputs: [
    { key: 'counterpartyName', label: 'Borrower / vehicle ID', type: 'text', required: true },
    {
      key: 'vehicleType',
      label: 'Vehicle type / drivetrain',
      type: 'select',
      options: VEHICLE_TYPE_OPTIONS,
      required: true,
    },
    { key: 'outstandingAmount', label: 'Loan outstanding', unit: 'USD', type: 'number', required: true },
    { key: 'vehicleValue', label: 'Vehicle value', unit: 'USD', type: 'number' },
    {
      key: 'measuredAnnualEmissions',
      label: 'Measured annual emissions',
      unit: 'tCO2e',
      type: 'number',
      help: 'From odometer × vehicle-specific EF (DQ ≤ 2).',
    },
    {
      key: 'annualDistanceKm',
      label: 'Annual distance driven',
      unit: 'km',
      type: 'number',
      help: 'Used to compute emissions when measured value not available.',
    },
    {
      key: 'verifiedByThirdParty',
      label: 'Odometer / EF independently verified?',
      type: 'boolean',
      default: false,
    },
  ],
  compute: (i) => {
    const warnings: string[] = []
    const outstanding = toNum(i.outstandingAmount)
    const vehicleValue = toNum(i.vehicleValue)
    const valueKnown = vehicleValue > 0
    const denom = valueKnown ? vehicleValue : outstanding * 1.15
    if (!valueKnown) warnings.push('Vehicle value missing — using loan × 1.15 proxy')

    const { attr, warning: attrWarn } = safeAttribution(outstanding, denom)
    if (attrWarn) warnings.push(attrWarn)

    const measured = toNum(i.measuredAnnualEmissions)
    const annualKm = toNum(i.annualDistanceKm)
    const vehicleType = String(i.vehicleType ?? 'unknown')
    const fleetAnnualTons = VEHICLE_ANNUAL_EMISSIONS[vehicleType] ?? VEHICLE_ANNUAL_EMISSIONS.unknown
    const verified = toBool(i.verifiedByThirdParty)

    let annualEmissions = 0
    let rationale: string
    let dq: PcafDataQuality = 5

    if (measured > 0) {
      annualEmissions = measured
      rationale = `Measured annual emissions × attribution factor (${attr.toFixed(4)})`
      dq = verified && valueKnown ? 1 : valueKnown || verified ? 2 : 3
    } else if (annualKm > 0) {
      // Convert annual km × EF (kgCO2e/km) for the drivetrain → tonnes.
      const perKmKg: Record<string, number> = {
        car_petrol: 0.171,
        car_diesel: 0.165,
        car_hybrid: 0.110,
        car_ev: 0.045,
        motorcycle: 0.103,
        van: 0.220,
        truck: 0.600,
        unknown: 0.170,
      }
      const ef = perKmKg[vehicleType] ?? perKmKg.unknown
      annualEmissions = (annualKm * ef) / 1000
      rationale = `${annualKm} km × ${ef} kgCO2e/km (${vehicleType}) × attribution`
      dq = valueKnown ? 3 : 4
    } else {
      annualEmissions = fleetAnnualTons
      rationale = `Fleet average ${fleetAnnualTons} tCO2e/year (${vehicleType}) × attribution`
      dq = valueKnown ? 4 : 5
      warnings.push('Annual distance unknown — using fleet average for drivetrain')
    }

    const financedTotal = annualEmissions * attr

    return {
      attributionFactor: attr,
      financedScope1: financedTotal, // tailpipe emissions sit in scope 1 of the user
      financedTotal,
      dataQualityScore: dq,
      rationale,
      warnings,
    }
  },
  methodologyUrl: PCAF_METHODOLOGY_URL,
}
