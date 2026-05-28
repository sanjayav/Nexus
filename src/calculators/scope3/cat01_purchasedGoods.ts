import {
  Scope3Calculator,
  EEIO_FACTORS,
  EEIO_SECTOR_OPTIONS,
  REGION_OPTIONS,
  ILLUSTRATIVE_NOTE,
  toNum,
} from './index'

export const cat01: Scope3Calculator = {
  id: 'scope3_cat01',
  category: 1,
  name: 'Purchased Goods & Services',
  shortName: 'Cat 1 Purchased Goods',
  description: 'Upstream emissions from production of goods and services purchased by the reporting company.',
  methods: [
    {
      id: 'supplier_specific',
      name: 'Supplier-specific',
      priority: 1,
      inputs: [
        { key: 'supplier_emissions', label: 'Supplier-reported tCO2e', unit: 'tCO2e', type: 'number', required: true },
      ],
      compute: (inputs) => ({ co2e_tonnes: toNum(inputs.supplier_emissions) }),
    },
    {
      id: 'activity_based',
      name: 'Average-data (mass × EF)',
      priority: 2,
      inputs: [
        { key: 'quantity', label: 'Quantity purchased', unit: 't', type: 'number', required: true },
        { key: 'material', label: 'Material type', type: 'select', options: ['steel','aluminium','plastic','paper','glass','cement','other'], required: true },
        { key: 'region', label: 'Region', type: 'select', options: REGION_OPTIONS, default: 'GLOBAL' },
      ],
      compute: async (inputs, ctx) => {
        const ef = await ctx.lookupEF({
          scope: 3,
          category: 'Cat 1 - Purchased goods',
          fuel_or_activity: String(inputs.material),
          region: String(inputs.region ?? 'GLOBAL'),
        })
        // EF stored as kgCO2e per kg → multiply by quantity (t = 1000 kg) / 1000 (kg→t output).
        const tonnes = toNum(inputs.quantity) * ef.co2e_per_unit
        return { co2e_tonnes: tonnes, ef_used: ef }
      },
    },
    {
      id: 'spend_based',
      name: 'Spend-based',
      priority: 3,
      inputs: [
        { key: 'spend', label: 'Spend', unit: 'USD', type: 'number', required: true },
        { key: 'sector', label: 'Industry sector', type: 'select', options: EEIO_SECTOR_OPTIONS, required: true },
      ],
      compute: (inputs) => {
        const factor = EEIO_FACTORS[String(inputs.sector)] ?? 0.5
        return {
          co2e_tonnes: (toNum(inputs.spend) * factor) / 1000,
          breakdown: { factor_kgCO2e_per_USD: factor },
          notes: ILLUSTRATIVE_NOTE,
        }
      },
    },
  ],
}
