import {
  Scope3Calculator,
  EEIO_FACTORS,
  ILLUSTRATIVE_NOTE,
  toNum,
} from './index'

const ASSET_EF: Record<string, number> = {
  building_office: 0.42,        // tCO2e per m2 floor area
  building_industrial: 0.58,
  vehicle_light: 6.5,           // tCO2e per vehicle
  vehicle_heavy: 18.0,
  machinery_general: 2.1,       // tCO2e per tonne
  it_equipment_server: 0.35,    // tCO2e per server
  it_equipment_laptop: 0.30,    // tCO2e per device
}

export const cat02: Scope3Calculator = {
  id: 'scope3_cat02',
  category: 2,
  name: 'Capital Goods',
  shortName: 'Cat 2 Capital Goods',
  description: 'Cradle-to-gate emissions of long-lived capital assets purchased by the reporting company in the reporting period.',
  methods: [
    {
      id: 'activity_based',
      name: 'Asset-quantity × EF',
      priority: 1,
      inputs: [
        { key: 'asset', label: 'Asset type', type: 'select', options: Object.keys(ASSET_EF), required: true },
        { key: 'quantity', label: 'Quantity (units/m²/t depending on asset)', type: 'number', required: true },
      ],
      compute: (inputs) => {
        const ef = ASSET_EF[String(inputs.asset)] ?? 1
        return {
          co2e_tonnes: toNum(inputs.quantity) * ef,
          breakdown: { ef_tCO2e_per_unit: ef },
          notes: 'Illustrative cradle-to-gate factor; refine with manufacturer LCA.',
        }
      },
    },
    {
      id: 'spend_based',
      name: 'Spend-based',
      priority: 2,
      inputs: [
        { key: 'spend', label: 'CAPEX spend', unit: 'USD', type: 'number', required: true },
        { key: 'sector', label: 'Asset sector', type: 'select', options: ['construction','machinery','electronics','motor_vehicles','iron_steel','other'], required: true },
      ],
      compute: (inputs) => {
        const factor = EEIO_FACTORS[String(inputs.sector)] ?? 0.55
        return {
          co2e_tonnes: (toNum(inputs.spend) * factor) / 1000,
          breakdown: { factor_kgCO2e_per_USD: factor },
          notes: ILLUSTRATIVE_NOTE,
        }
      },
    },
  ],
}
