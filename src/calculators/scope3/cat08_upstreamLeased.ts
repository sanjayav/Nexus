import { Scope3Calculator, toNum } from './index'

export const cat08: Scope3Calculator = {
  id: 'scope3_cat08',
  category: 8,
  name: 'Upstream Leased Assets',
  shortName: 'Cat 8 Upstream Leased',
  description: 'Operation of assets leased by the reporting company that are not already included in Scope 1 or 2.',
  methods: [
    {
      id: 'asset_based',
      name: 'Asset Scope 1/2 attribution',
      priority: 1,
      inputs: [
        { key: 'energy_kwh', label: 'Energy use', unit: 'kWh', type: 'number', required: true },
        { key: 'grid_ef', label: 'Grid EF', unit: 'kgCO2e/kWh', type: 'number', required: true, default: 0.4 },
        { key: 'fuel_kwh', label: 'Fuel use', unit: 'kWh', type: 'number', default: 0 },
        { key: 'fuel_ef', label: 'Fuel EF', unit: 'kgCO2e/kWh', type: 'number', default: 0.18 },
      ],
      compute: (inputs) => {
        const elec = toNum(inputs.energy_kwh) * toNum(inputs.grid_ef)
        const fuel = toNum(inputs.fuel_kwh) * toNum(inputs.fuel_ef)
        return {
          co2e_tonnes: (elec + fuel) / 1000,
          breakdown: { electricity_kgCO2e: elec, fuel_kgCO2e: fuel },
          notes: 'Only include if not already captured in Scope 1/2 under the chosen consolidation approach.',
        }
      },
    },
    {
      id: 'floor_area_avg',
      name: 'Average-data (floor area × EF)',
      priority: 2,
      inputs: [
        { key: 'm2', label: 'Leased floor area', unit: 'm²', type: 'number', required: true },
        { key: 'ef_per_m2', label: 'EF', unit: 'kgCO2e/m²/yr', type: 'number', required: true, default: 65 },
      ],
      compute: (inputs) => ({
        co2e_tonnes: (toNum(inputs.m2) * toNum(inputs.ef_per_m2)) / 1000,
        notes: 'Use building-type averages where metered data is unavailable.',
      }),
    },
  ],
}
