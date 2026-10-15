import { Scope3Calculator, toNum } from './index'

// kgCO2e per passenger-km.
const COMMUTE_EF: Record<string, number> = {
  car_petrol: 0.171,
  car_diesel: 0.165,
  car_hybrid: 0.110,
  car_ev: 0.045,
  motorcycle: 0.103,
  bus: 0.103,
  rail: 0.035,
  metro: 0.029,
  bicycle: 0,
  walk: 0,
  work_from_home: 0,   // counted separately if needed
}

export const cat07: Scope3Calculator = {
  id: 'scope3_cat07',
  category: 7,
  name: 'Employee Commuting',
  shortName: 'Cat 7 Commuting',
  description: 'Transportation of employees between their homes and worksites.',
  methods: [
    {
      id: 'distance_based',
      name: 'Distance × FTE × workdays',
      priority: 1,
      inputs: [
        { key: 'mode', label: 'Commute mode', type: 'select', options: Object.keys(COMMUTE_EF), required: true },
        { key: 'avg_one_way_km', label: 'Avg one-way distance', unit: 'km', type: 'number', required: true },
        { key: 'fte', label: 'FTEs using this mode', type: 'number', required: true },
        { key: 'workdays', label: 'Working days / year', type: 'number', required: true, default: 220 },
      ],
      compute: (inputs) => {
        const ef = COMMUTE_EF[String(inputs.mode)] ?? 0.15
        // 2 trips/day → factor of 2.
        const pkm = toNum(inputs.avg_one_way_km) * 2 * toNum(inputs.fte) * toNum(inputs.workdays, 220)
        return {
          co2e_tonnes: (pkm * ef) / 1000,
          breakdown: { passenger_km: pkm, ef_kgCO2e_per_pkm: ef },
          notes: 'DEFRA-style commute factors.',
        }
      },
    },
    {
      id: 'survey_avg',
      name: 'Survey average (per-FTE EF)',
      priority: 2,
      inputs: [
        { key: 'fte', label: 'Total FTEs', type: 'number', required: true },
        { key: 'avg_ef_per_fte', label: 'Avg EF per FTE / year', unit: 'kgCO2e/FTE', type: 'number', required: true, default: 800 },
      ],
      compute: (inputs) => ({
        co2e_tonnes: (toNum(inputs.fte) * toNum(inputs.avg_ef_per_fte)) / 1000,
        notes: 'Survey-based: derive avg EF from a representative sample of staff commute patterns.',
      }),
    },
  ],
}
