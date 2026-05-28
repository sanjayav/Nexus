import { Scope3Calculator, toNum } from './index'

// Well-to-tank (WTT) factors — kgCO2e per kWh of delivered fuel/energy.
// Approximate values from DEFRA 2024-style WTT factors.
const WTT_FUEL: Record<string, number> = {
  natural_gas: 0.026,
  diesel: 0.063,
  petrol: 0.060,
  lpg: 0.040,
  coal: 0.018,
  fuel_oil: 0.060,
}

// Grid T&D losses — fraction of purchased electricity.
const TND_LOSSES: Record<string, number> = {
  GLOBAL: 0.085,
  UK: 0.075,
  US: 0.063,
  EU: 0.060,
  APAC: 0.092,
}

export const cat03: Scope3Calculator = {
  id: 'scope3_cat03',
  category: 3,
  name: 'Fuel- and Energy-Related Activities',
  shortName: 'Cat 3 Fuel & Energy',
  description: 'Upstream (well-to-tank) emissions of fuels consumed in Scope 1 and 2, plus T&D losses for purchased electricity.',
  methods: [
    {
      id: 'wtt_fuel',
      name: 'WTT — purchased fuels',
      priority: 1,
      inputs: [
        { key: 'fuel', label: 'Fuel type', type: 'select', options: Object.keys(WTT_FUEL), required: true },
        { key: 'energy_kwh', label: 'Delivered energy', unit: 'kWh', type: 'number', required: true },
      ],
      compute: (inputs) => {
        const ef = WTT_FUEL[String(inputs.fuel)] ?? 0.04
        return {
          co2e_tonnes: (toNum(inputs.energy_kwh) * ef) / 1000,
          breakdown: { wtt_kgCO2e_per_kWh: ef },
          notes: 'WTT factor — DEFRA-style approximation. Replace with regional DEFRA / GHG Protocol values.',
        }
      },
    },
    {
      id: 'tnd_losses',
      name: 'Grid T&D losses (electricity)',
      priority: 2,
      inputs: [
        { key: 'kwh_purchased', label: 'Purchased electricity', unit: 'kWh', type: 'number', required: true },
        { key: 'grid_ef', label: 'Grid EF', unit: 'kgCO2e/kWh', type: 'number', required: true, default: 0.4 },
        { key: 'region', label: 'Region', type: 'select', options: Object.keys(TND_LOSSES), default: 'GLOBAL' },
      ],
      compute: (inputs) => {
        const lossRate = TND_LOSSES[String(inputs.region ?? 'GLOBAL')] ?? 0.085
        const losses = toNum(inputs.kwh_purchased) * lossRate
        const tonnes = (losses * toNum(inputs.grid_ef)) / 1000
        return {
          co2e_tonnes: tonnes,
          breakdown: { tnd_loss_fraction: lossRate, lost_kwh: losses },
          notes: 'Illustrative T&D loss fractions; use IEA grid-specific values where available.',
        }
      },
    },
  ],
}
