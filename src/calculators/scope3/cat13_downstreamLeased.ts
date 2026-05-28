import { Scope3Calculator, toNum } from './index'

export const cat13: Scope3Calculator = {
  id: 'scope3_cat13',
  category: 13,
  name: 'Downstream Leased Assets',
  shortName: 'Cat 13 Downstream Leased',
  description: 'Operation of assets owned by the reporting company and leased to other entities, not already in Scope 1 or 2.',
  methods: [
    {
      id: 'asset_based',
      name: 'Lessee Scope 1/2 attribution',
      priority: 1,
      inputs: [
        { key: 'energy_kwh', label: 'Lessee electricity use', unit: 'kWh', type: 'number', required: true },
        { key: 'grid_ef', label: 'Grid EF', unit: 'kgCO2e/kWh', type: 'number', required: true, default: 0.4 },
        { key: 'fuel_kwh', label: 'Lessee fuel use', unit: 'kWh', type: 'number', default: 0 },
        { key: 'fuel_ef', label: 'Fuel EF', unit: 'kgCO2e/kWh', type: 'number', default: 0.18 },
      ],
      compute: (inputs) => {
        const elec = toNum(inputs.energy_kwh) * toNum(inputs.grid_ef, 0.4)
        const fuel = toNum(inputs.fuel_kwh) * toNum(inputs.fuel_ef, 0.18)
        return {
          co2e_tonnes: (elec + fuel) / 1000,
          breakdown: { electricity_kgCO2e: elec, fuel_kgCO2e: fuel },
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
      }),
    },
  ],
}
