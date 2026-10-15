import { Scope3Calculator, toNum } from './index'

const TREATMENT_EF: Record<string, number> = {
  landfill: 580,
  incineration: 320,
  recycling: -200,
  composting: 30,
}

export const cat12: Scope3Calculator = {
  id: 'scope3_cat12',
  category: 12,
  name: 'End-of-Life Treatment of Sold Products',
  shortName: 'Cat 12 End-of-Life',
  description: 'Waste disposal and treatment of products sold by the reporting company at the end of their life.',
  methods: [
    {
      id: 'waste_treatment',
      name: 'Mass × treatment EF',
      priority: 1,
      inputs: [
        { key: 'tonnes_disposed', label: 'Tonnes disposed', unit: 't', type: 'number', required: true },
        { key: 'treatment', label: 'Treatment', type: 'select', options: Object.keys(TREATMENT_EF), required: true },
      ],
      compute: (inputs) => {
        const ef = TREATMENT_EF[String(inputs.treatment)] ?? 400
        return {
          co2e_tonnes: (toNum(inputs.tonnes_disposed) * ef) / 1000,
          breakdown: { treatment_ef_kgCO2e_per_t: ef },
          notes: 'EPA WARM-style. Negative for recycling reflects avoided virgin production.',
        }
      },
    },
    {
      id: 'split_method',
      name: 'Sold-product mix × disposal split',
      priority: 2,
      inputs: [
        { key: 'tonnes_sold', label: 'Tonnes of product sold', unit: 't', type: 'number', required: true },
        { key: 'landfill_pct', label: '% to landfill', type: 'number', default: 60 },
        { key: 'incinerate_pct', label: '% incinerated', type: 'number', default: 20 },
        { key: 'recycle_pct', label: '% recycled', type: 'number', default: 20 },
      ],
      compute: (inputs) => {
        const t = toNum(inputs.tonnes_sold)
        const lp = toNum(inputs.landfill_pct, 60) / 100
        const ip = toNum(inputs.incinerate_pct, 20) / 100
        const rp = toNum(inputs.recycle_pct, 20) / 100
        const kg = t * (lp * TREATMENT_EF.landfill + ip * TREATMENT_EF.incineration + rp * TREATMENT_EF.recycling)
        return {
          co2e_tonnes: kg / 1000,
          breakdown: { landfill_pct: lp, incinerate_pct: ip, recycle_pct: rp },
        }
      },
    },
  ],
}
