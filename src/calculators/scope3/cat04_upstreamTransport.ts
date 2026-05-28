import {
  Scope3Calculator,
  EEIO_FACTORS,
  ILLUSTRATIVE_NOTE,
  toNum,
} from './index'

// kgCO2e per tonne-km — illustrative GLEC-style values.
const MODE_EF: Record<string, number> = {
  road_lcv: 0.700,
  road_hgv: 0.105,
  rail: 0.025,
  sea_container: 0.012,
  sea_bulk: 0.005,
  air_freight_short: 1.300,
  air_freight_long: 0.500,
  inland_waterway: 0.030,
}

export const cat04: Scope3Calculator = {
  id: 'scope3_cat04',
  category: 4,
  name: 'Upstream Transportation & Distribution',
  shortName: 'Cat 4 Upstream T&D',
  description: 'Transport of purchased products from tier-1 suppliers and between facilities, paid for by the reporting company.',
  methods: [
    {
      id: 'distance_based',
      name: 'Distance-based (mode × weight × distance)',
      priority: 1,
      inputs: [
        { key: 'mode', label: 'Transport mode', type: 'select', options: Object.keys(MODE_EF), required: true },
        { key: 'weight_t', label: 'Weight shipped', unit: 't', type: 'number', required: true },
        { key: 'distance_km', label: 'Distance', unit: 'km', type: 'number', required: true },
      ],
      compute: (inputs) => {
        const ef = MODE_EF[String(inputs.mode)] ?? 0.1
        const tkm = toNum(inputs.weight_t) * toNum(inputs.distance_km)
        return {
          co2e_tonnes: (tkm * ef) / 1000,
          breakdown: { tonne_km: tkm, ef_kgCO2e_per_tkm: ef },
          notes: 'Illustrative GLEC-style mode factors.',
        }
      },
    },
    {
      id: 'fuel_based',
      name: 'Fuel-based',
      priority: 2,
      inputs: [
        { key: 'fuel_litres', label: 'Fuel consumed', unit: 'L', type: 'number', required: true },
        { key: 'fuel_ef', label: 'EF', unit: 'kgCO2e/L', type: 'number', required: true, default: 2.68 },
      ],
      compute: (inputs) => ({
        co2e_tonnes: (toNum(inputs.fuel_litres) * toNum(inputs.fuel_ef)) / 1000,
      }),
    },
    {
      id: 'spend_based',
      name: 'Spend-based',
      priority: 3,
      inputs: [
        { key: 'spend', label: 'Logistics spend', unit: 'USD', type: 'number', required: true },
      ],
      compute: (inputs) => {
        const factor = EEIO_FACTORS['transport_warehousing'] ?? 0.85
        return {
          co2e_tonnes: (toNum(inputs.spend) * factor) / 1000,
          breakdown: { factor_kgCO2e_per_USD: factor },
          notes: ILLUSTRATIVE_NOTE,
        }
      },
    },
  ],
}
