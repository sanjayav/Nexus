import { Scope3Calculator, toNum, ILLUSTRATIVE_NOTE } from './index'

// kgCO2e per passenger-km — DEFRA-style.
const TRAVEL_EF: Record<string, number> = {
  flight_short_haul: 0.158,    // < 3700 km
  flight_medium_haul: 0.130,
  flight_long_haul: 0.149,
  rail_intercity: 0.035,
  rail_metro: 0.029,
  car_petrol: 0.171,
  car_diesel: 0.165,
  car_hybrid: 0.110,
  car_ev: 0.045,
  bus_coach: 0.027,
  taxi: 0.149,
}

// kgCO2e per hotel night — illustrative regional averages.
const HOTEL_EF: Record<string, number> = {
  GLOBAL: 22,
  UK: 25,
  US: 30,
  EU: 18,
  APAC: 28,
}

export const cat06: Scope3Calculator = {
  id: 'scope3_cat06',
  category: 6,
  name: 'Business Travel',
  shortName: 'Cat 6 Business Travel',
  description: 'Transportation of employees for business-related activities in vehicles not owned/operated by the reporting company.',
  methods: [
    {
      id: 'distance_based',
      name: 'Distance-based (mode × pax-km)',
      priority: 1,
      inputs: [
        { key: 'mode', label: 'Travel mode', type: 'select', options: Object.keys(TRAVEL_EF), required: true },
        { key: 'pax_km', label: 'Passenger-km', unit: 'pkm', type: 'number', required: true },
      ],
      compute: (inputs) => {
        const ef = TRAVEL_EF[String(inputs.mode)] ?? 0.15
        return {
          co2e_tonnes: (toNum(inputs.pax_km) * ef) / 1000,
          breakdown: { ef_kgCO2e_per_pkm: ef },
          notes: 'DEFRA 2024-style passenger-km factors.',
        }
      },
    },
    {
      id: 'hotel_nights',
      name: 'Hotel nights',
      priority: 2,
      inputs: [
        { key: 'nights', label: 'Room-nights', type: 'number', required: true },
        { key: 'region', label: 'Region', type: 'select', options: Object.keys(HOTEL_EF), default: 'GLOBAL' },
      ],
      compute: (inputs) => {
        const ef = HOTEL_EF[String(inputs.region ?? 'GLOBAL')] ?? 22
        return {
          co2e_tonnes: (toNum(inputs.nights) * ef) / 1000,
          breakdown: { ef_kgCO2e_per_night: ef },
        }
      },
    },
    {
      id: 'spend_based',
      name: 'Spend-based',
      priority: 3,
      inputs: [
        { key: 'spend', label: 'Travel spend', unit: 'USD', type: 'number', required: true },
      ],
      compute: (inputs) => ({
        co2e_tonnes: (toNum(inputs.spend) * 0.42) / 1000,
        breakdown: { factor_kgCO2e_per_USD: 0.42 },
        notes: ILLUSTRATIVE_NOTE,
      }),
    },
  ],
}
