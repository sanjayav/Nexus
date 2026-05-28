import { Scope3Calculator, toNum } from './index'

export const cat11: Scope3Calculator = {
  id: 'scope3_cat11',
  category: 11,
  name: 'Use of Sold Products',
  shortName: 'Cat 11 Use of Sold Products',
  description: 'Direct + indirect emissions from end-use of goods and services sold by the reporting company, over their lifetime.',
  methods: [
    {
      id: 'direct_use_energy',
      name: 'Direct use — energy-consuming product',
      priority: 1,
      inputs: [
        { key: 'units_sold', label: 'Units sold', type: 'number', required: true },
        { key: 'lifetime_yr', label: 'Expected lifetime', unit: 'years', type: 'number', required: true, default: 10 },
        { key: 'energy_per_yr_kwh', label: 'Energy use per unit / yr', unit: 'kWh', type: 'number', required: true },
        { key: 'grid_ef', label: 'EF', unit: 'kgCO2e/kWh', type: 'number', required: true, default: 0.4 },
      ],
      compute: (inputs) => {
        const lifetime_kwh = toNum(inputs.units_sold) * toNum(inputs.lifetime_yr, 10) * toNum(inputs.energy_per_yr_kwh)
        return {
          co2e_tonnes: (lifetime_kwh * toNum(inputs.grid_ef, 0.4)) / 1000,
          breakdown: { lifetime_kwh },
          notes: 'Use-phase emissions over expected product lifetime.',
        }
      },
    },
    {
      id: 'direct_use_fuel',
      name: 'Direct use — fuel-consuming product',
      priority: 2,
      inputs: [
        { key: 'units_sold', label: 'Units sold', type: 'number', required: true },
        { key: 'lifetime_fuel_l', label: 'Lifetime fuel consumption / unit', unit: 'L', type: 'number', required: true },
        { key: 'fuel_ef', label: 'Fuel EF', unit: 'kgCO2e/L', type: 'number', required: true, default: 2.68 },
      ],
      compute: (inputs) => ({
        co2e_tonnes: (toNum(inputs.units_sold) * toNum(inputs.lifetime_fuel_l) * toNum(inputs.fuel_ef, 2.68)) / 1000,
        notes: 'For fuel-consuming products (vehicles, generators).',
      }),
    },
    {
      id: 'indirect_use',
      name: 'Indirect use (LCA-derived)',
      priority: 3,
      inputs: [
        { key: 'units_sold', label: 'Units sold', type: 'number', required: true },
        { key: 'lca_kgco2e_per_unit', label: 'LCA use-phase EF / unit', unit: 'kgCO2e', type: 'number', required: true },
      ],
      compute: (inputs) => ({
        co2e_tonnes: (toNum(inputs.units_sold) * toNum(inputs.lca_kgco2e_per_unit)) / 1000,
        notes: 'Use product-specific LCA (ISO 14040) per ecoinvent or PCR.',
      }),
    },
  ],
}
