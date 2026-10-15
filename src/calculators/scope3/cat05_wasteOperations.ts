import { Scope3Calculator, toNum } from './index'

// kgCO2e per tonne waste — illustrative EPA WARM-style values.
const WASTE_EF: Record<string, Record<string, number>> = {
  mixed_msw:     { landfill: 580, incineration: 320, recycling: 25,  composting: 30 },
  paper:         { landfill: 950, incineration: 25,  recycling: -3500, composting: 70 },
  plastic:       { landfill: 25,  incineration: 2800, recycling: -1000, composting: 0 },
  organic_food:  { landfill: 700, incineration: 110, recycling: 0,    composting: 40 },
  metals:        { landfill: 8,   incineration: 5,   recycling: -4000, composting: 0 },
  glass:         { landfill: 8,   incineration: 8,   recycling: -300, composting: 0 },
  construction:  { landfill: 5,   incineration: 0,   recycling: -30,  composting: 0 },
  hazardous:     { landfill: 250, incineration: 1100, recycling: 50, composting: 0 },
}

export const cat05: Scope3Calculator = {
  id: 'scope3_cat05',
  category: 5,
  name: 'Waste Generated in Operations',
  shortName: 'Cat 5 Waste',
  description: 'Disposal and treatment of waste generated in the reporting company\'s operations.',
  methods: [
    {
      id: 'waste_type_method',
      name: 'Waste type × treatment',
      priority: 1,
      inputs: [
        { key: 'waste_type', label: 'Waste stream', type: 'select', options: Object.keys(WASTE_EF), required: true },
        { key: 'treatment', label: 'Treatment', type: 'select', options: ['landfill','incineration','recycling','composting'], required: true },
        { key: 'tonnes', label: 'Mass', unit: 't', type: 'number', required: true },
      ],
      compute: (inputs) => {
        const ef = WASTE_EF[String(inputs.waste_type)]?.[String(inputs.treatment)] ?? 200
        return {
          co2e_tonnes: (toNum(inputs.tonnes) * ef) / 1000,
          breakdown: { ef_kgCO2e_per_t: ef },
          notes: 'Illustrative EPA WARM-style factors; net negatives reflect avoided burdens from recycling.',
        }
      },
    },
    {
      id: 'average_data',
      name: 'Average-data',
      priority: 2,
      inputs: [
        { key: 'tonnes', label: 'Total waste', unit: 't', type: 'number', required: true },
        { key: 'avg_ef', label: 'Average EF', unit: 'kgCO2e/t', type: 'number', required: true, default: 450 },
      ],
      compute: (inputs) => ({
        co2e_tonnes: (toNum(inputs.tonnes) * toNum(inputs.avg_ef)) / 1000,
      }),
    },
  ],
}
