import { Scope3Calculator, toNum, ILLUSTRATIVE_NOTE } from './index'

// kgCO2e per tonne intermediate processed — rough sector-level placeholders.
const PROC_EF: Record<string, number> = {
  steel_downstream: 850,
  aluminium_downstream: 1100,
  chemicals_intermediates: 950,
  plastics_conversion: 620,
  paper_conversion: 480,
  textiles: 540,
  other: 400,
}

export const cat10: Scope3Calculator = {
  id: 'scope3_cat10',
  category: 10,
  name: 'Processing of Sold Products',
  shortName: 'Cat 10 Processing',
  description: 'Emissions from processing of intermediate products sold by the reporting company by downstream manufacturers.',
  methods: [
    {
      id: 'mass_based',
      name: 'Tonnage × processing EF',
      priority: 1,
      inputs: [
        { key: 'intermediate', label: 'Intermediate product type', type: 'select', options: Object.keys(PROC_EF), required: true },
        { key: 'tonnes_sold', label: 'Volume sold to downstream processors', unit: 't', type: 'number', required: true },
      ],
      compute: (inputs) => {
        const ef = PROC_EF[String(inputs.intermediate)] ?? 400
        return {
          co2e_tonnes: (toNum(inputs.tonnes_sold) * ef) / 1000,
          breakdown: { processing_ef_kgCO2e_per_t: ef },
          notes: 'Illustrative downstream processing EF; refine with customer LCA where available.',
        }
      },
    },
    {
      id: 'spend_based',
      name: 'Spend-based (customer processing cost proxy)',
      priority: 2,
      inputs: [
        { key: 'spend', label: 'Estimated downstream processing spend', unit: 'USD', type: 'number', required: true },
        { key: 'factor', label: 'Sector EEIO factor', unit: 'kgCO2e/USD', type: 'number', required: true, default: 0.6 },
      ],
      compute: (inputs) => ({
        co2e_tonnes: (toNum(inputs.spend) * toNum(inputs.factor)) / 1000,
        notes: ILLUSTRATIVE_NOTE,
      }),
    },
  ],
}
