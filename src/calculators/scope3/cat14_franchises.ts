import { Scope3Calculator, toNum, ILLUSTRATIVE_NOTE } from './index'

export const cat14: Scope3Calculator = {
  id: 'scope3_cat14',
  category: 14,
  name: 'Franchises',
  shortName: 'Cat 14 Franchises',
  description: 'Operation of franchises not included in Scope 1 or 2 — emissions reported by the franchisee (Scope 1 + 2).',
  methods: [
    {
      id: 'franchisee_reported',
      name: 'Franchisee-reported (Scope 1 + 2)',
      priority: 1,
      inputs: [
        { key: 'reported_tco2e', label: 'Franchisee Scope 1+2', unit: 'tCO2e', type: 'number', required: true },
        { key: 'count', label: '# of franchises rolled up', type: 'number', default: 1 },
      ],
      compute: (inputs) => ({
        co2e_tonnes: toNum(inputs.reported_tco2e) * toNum(inputs.count, 1),
      }),
    },
    {
      id: 'avg_franchise',
      name: 'Average per-franchise (floor area or revenue)',
      priority: 2,
      inputs: [
        { key: 'num_franchises', label: '# of franchises', type: 'number', required: true },
        { key: 'avg_ef_per_franchise', label: 'Avg EF per franchise', unit: 'tCO2e/yr', type: 'number', required: true, default: 25 },
      ],
      compute: (inputs) => ({
        co2e_tonnes: toNum(inputs.num_franchises) * toNum(inputs.avg_ef_per_franchise, 25),
        notes: ILLUSTRATIVE_NOTE,
      }),
    },
  ],
}
