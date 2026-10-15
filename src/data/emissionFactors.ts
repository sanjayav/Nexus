/* ═══════════════════════════════════════════
   Emission Factor Database
   GHG Protocol / IPCC 2006 / EPA factors
   ═══════════════════════════════════════════ */

export interface EmissionFactor {
  id: string
  name: string
  co2: number   // kg CO₂ per unit
  ch4: number   // kg CH₄ per unit
  n2o: number   // kg N₂O per unit
  unit: string  // per unit label
}

/* ── Stationary combustion fuels (kg per litre/m³/kg) ── */
export const STATIONARY_FUELS: EmissionFactor[] = [
  { id: 'natural-gas',      name: 'Natural Gas',           co2: 2.02,    ch4: 0.00004, n2o: 0.000004, unit: 'm³' },
  { id: 'diesel',           name: 'Diesel / Gas Oil',      co2: 2.68,    ch4: 0.00013, n2o: 0.00004,  unit: 'litre' },
  { id: 'fuel-oil-heavy',   name: 'Heavy Fuel Oil (HFO)',  co2: 3.114,   ch4: 0.00013, n2o: 0.00004,  unit: 'litre' },
  { id: 'fuel-oil-light',   name: 'Light Fuel Oil',        co2: 2.96,    ch4: 0.00013, n2o: 0.00004,  unit: 'litre' },
  { id: 'lpg',              name: 'LPG (Propane/Butane)',   co2: 1.51,    ch4: 0.00005, n2o: 0.000005, unit: 'litre' },
  { id: 'coal-bituminous',  name: 'Bituminous Coal',       co2: 2.42,    ch4: 0.00024, n2o: 0.00004,  unit: 'kg' },
  { id: 'coal-sub',         name: 'Sub-Bituminous Coal',   co2: 1.94,    ch4: 0.00024, n2o: 0.00004,  unit: 'kg' },
  { id: 'biomass-wood',     name: 'Wood / Biomass',        co2: 0,       ch4: 0.00036, n2o: 0.00004,  unit: 'kg' },
  { id: 'kerosene',         name: 'Kerosene',              co2: 2.54,    ch4: 0.00012, n2o: 0.00004,  unit: 'litre' },
  { id: 'petrol',           name: 'Petrol / Gasoline',     co2: 2.31,    ch4: 0.00025, n2o: 0.00008,  unit: 'litre' },
  { id: 'naphtha',          name: 'Naphtha',               co2: 2.12,    ch4: 0.00013, n2o: 0.00004,  unit: 'litre' },
  { id: 'ethane',           name: 'Ethane',                co2: 1.53,    ch4: 0.00006, n2o: 0.000004, unit: 'kg' },
]

/* ── Mobile combustion fuels (kg per litre) ── */
export const MOBILE_FUELS: EmissionFactor[] = [
  { id: 'mob-petrol',   name: 'Petrol / Gasoline',     co2: 2.31,  ch4: 0.00025, n2o: 0.00022, unit: 'litre' },
  { id: 'mob-diesel',   name: 'Diesel',                co2: 2.68,  ch4: 0.00013, n2o: 0.00013, unit: 'litre' },
  { id: 'mob-lpg',      name: 'LPG (Auto)',            co2: 1.51,  ch4: 0.00064, n2o: 0.00003, unit: 'litre' },
  { id: 'mob-cng',      name: 'CNG',                   co2: 2.02,  ch4: 0.00592, n2o: 0.00002, unit: 'm³' },
  { id: 'mob-jet-a',    name: 'Jet Fuel (Jet A-1)',    co2: 2.52,  ch4: 0.00005, n2o: 0.0001,  unit: 'litre' },
  { id: 'mob-marine',   name: 'Marine Diesel Oil',     co2: 2.78,  ch4: 0.00013, n2o: 0.00008, unit: 'litre' },
  { id: 'mob-hfo',      name: 'Marine HFO',            co2: 3.114, ch4: 0.00013, n2o: 0.00008, unit: 'litre' },
]

/* ── HFC / PFC refrigerants (GWP — AR5 100-year) ── */
export interface Refrigerant {
  id: string
  name: string
  gwp: number     // 100-year GWP (AR5)
  formula: string
}

export const REFRIGERANTS: Refrigerant[] = [
  { id: 'r22',    name: 'R-22 (HCFC-22)',   gwp: 1810,  formula: 'CHClF₂' },
  { id: 'r32',    name: 'R-32 (HFC-32)',     gwp: 675,   formula: 'CH₂F₂' },
  { id: 'r134a',  name: 'R-134a',            gwp: 1430,  formula: 'CH₂FCF₃' },
  { id: 'r404a',  name: 'R-404A',            gwp: 3922,  formula: 'Blend' },
  { id: 'r407c',  name: 'R-407C',            gwp: 1774,  formula: 'Blend' },
  { id: 'r410a',  name: 'R-410A',            gwp: 2088,  formula: 'Blend' },
  { id: 'r507a',  name: 'R-507A',            gwp: 3985,  formula: 'Blend' },
  { id: 'sf6',    name: 'SF₆',              gwp: 22800, formula: 'SF₆' },
  { id: 'nf3',    name: 'NF₃',              gwp: 17200, formula: 'NF₃' },
  { id: 'cf4',    name: 'CF₄ (PFC-14)',     gwp: 7390,  formula: 'CF₄' },
  { id: 'c2f6',   name: 'C₂F₆ (PFC-116)',  gwp: 12200, formula: 'C₂F₆' },
]

/* ── Grid electricity emission factors (kg CO₂e per kWh) ── */
export interface GridFactor {
  id: string
  name: string
  region: string
  ef: number      // kg CO₂e per kWh
}

export const GRID_FACTORS: GridFactor[] = [
  { id: 'th-mea',    name: 'Thailand — MEA Central',     region: 'TH', ef: 0.4999 },
  { id: 'th-pea',    name: 'Thailand — PEA Eastern',     region: 'TH', ef: 0.5123 },
  { id: 'cn-east',   name: 'China — East Grid',          region: 'CN', ef: 0.7921 },
  { id: 'cn-south',  name: 'China — Southern Grid',      region: 'CN', ef: 0.6379 },
  { id: 'us-srso',   name: 'USA — SRSO (Southeast)',     region: 'US', ef: 0.4401 },
  { id: 'us-rfcw',   name: 'USA — RFCW (Midwest)',       region: 'US', ef: 0.6102 },
  { id: 'eu-avg',    name: 'EU — Average 2023',          region: 'EU', ef: 0.2556 },
  { id: 'uk',        name: 'UK — National Grid',         region: 'UK', ef: 0.2074 },
  { id: 'jp',        name: 'Japan — National Average',   region: 'JP', ef: 0.4709 },
  { id: 'in',        name: 'India — National Grid',      region: 'IN', ef: 0.7082 },
  { id: 'au',        name: 'Australia — NEM Average',    region: 'AU', ef: 0.6800 },
  { id: 'sg',        name: 'Singapore — Grid',           region: 'SG', ef: 0.4085 },
]

/* ── Heat / Steam emission factors (kg CO₂e per kWh thermal) ── */
export interface HeatFactor {
  id: string
  name: string
  ef: number
  unit: string
}

export const HEAT_FACTORS: HeatFactor[] = [
  { id: 'steam-ng',    name: 'Steam from Natural Gas Boiler',    ef: 0.2164, unit: 'kWh' },
  { id: 'steam-coal',  name: 'Steam from Coal Boiler',           ef: 0.3410, unit: 'kWh' },
  { id: 'steam-oil',   name: 'Steam from Oil Boiler',            ef: 0.2732, unit: 'kWh' },
  { id: 'district',    name: 'District Heating (average)',        ef: 0.1982, unit: 'kWh' },
  { id: 'cooling',     name: 'District Cooling',                  ef: 0.1540, unit: 'kWh' },
]

/* ── Scope 3 spend-based factors (kg CO₂e per USD spent) ── */
export interface SpendFactor {
  id: string
  category: string
  ef: number  // kg CO₂e per USD
}

export const SPEND_FACTORS: SpendFactor[] = [
  { id: 'chemicals',     category: 'Chemicals & Chemical Products',   ef: 0.78 },
  { id: 'metals',        category: 'Basic Metals & Fabricated',       ef: 1.21 },
  { id: 'machinery',     category: 'Machinery & Equipment',           ef: 0.42 },
  { id: 'electronics',   category: 'Electronics & Electrical',        ef: 0.35 },
  { id: 'plastics',      category: 'Rubber & Plastics',               ef: 0.91 },
  { id: 'paper',         category: 'Paper & Pulp Products',           ef: 0.68 },
  { id: 'food',          category: 'Food & Beverages',                ef: 0.54 },
  { id: 'textiles',      category: 'Textiles & Apparel',              ef: 0.47 },
  { id: 'construction',  category: 'Construction Materials',          ef: 1.05 },
  { id: 'transport-svc', category: 'Transport Services',              ef: 0.62 },
  { id: 'it-services',   category: 'IT & Telecom Services',           ef: 0.18 },
  { id: 'professional',  category: 'Professional Services',           ef: 0.12 },
  { id: 'waste-svc',     category: 'Waste Management Services',       ef: 0.94 },
]

/* ── Scope 3 transport factors (kg CO₂e per tonne-km) ── */
export interface TransportFactor {
  id: string
  mode: string
  ef: number
}

export const TRANSPORT_FACTORS: TransportFactor[] = [
  { id: 'road-truck',    mode: 'Road — Heavy Truck (>20t)',       ef: 0.0622 },
  { id: 'road-van',      mode: 'Road — Light Van (<3.5t)',        ef: 0.2410 },
  { id: 'rail-freight',  mode: 'Rail — Freight',                  ef: 0.0242 },
  { id: 'sea-container', mode: 'Sea — Container Ship',            ef: 0.0082 },
  { id: 'sea-bulk',      mode: 'Sea — Bulk Carrier',              ef: 0.0048 },
  { id: 'air-long',      mode: 'Air — Long-haul Freight',         ef: 0.6023 },
  { id: 'air-short',     mode: 'Air — Short-haul Freight',        ef: 1.0160 },
  { id: 'barge',         mode: 'Inland Waterway — Barge',         ef: 0.0312 },
]

/* ── Scope 3 waste factors (kg CO₂e per tonne) ── */
export interface WasteFactor {
  id: string
  method: string
  ef: number
}

export const WASTE_FACTORS: WasteFactor[] = [
  { id: 'landfill',         method: 'Landfill (mixed waste)',           ef: 587 },
  { id: 'landfill-gas',     method: 'Landfill with gas capture',       ef: 312 },
  { id: 'incineration',     method: 'Incineration (no energy)',        ef: 897 },
  { id: 'incineration-er',  method: 'Incineration with energy recovery', ef: 215 },
  { id: 'recycling',        method: 'Recycling',                        ef: 21 },
  { id: 'composting',       method: 'Composting (organic)',              ef: 42 },
  { id: 'anaerobic',        method: 'Anaerobic Digestion',              ef: 28 },
]

/* ── Scope 3 business travel factors (kg CO₂e per passenger-km) ── */
export interface TravelFactor {
  id: string
  mode: string
  ef: number
}

export const TRAVEL_FACTORS: TravelFactor[] = [
  { id: 'air-short',  mode: 'Air — Short-haul (<1500 km)',  ef: 0.2555 },
  { id: 'air-medium', mode: 'Air — Medium-haul',            ef: 0.1882 },
  { id: 'air-long',   mode: 'Air — Long-haul (>3500 km)',   ef: 0.1520 },
  { id: 'rail',       mode: 'Rail (average)',                ef: 0.0371 },
  { id: 'bus',        mode: 'Bus / Coach',                   ef: 0.0892 },
  { id: 'car-petrol', mode: 'Car — Petrol (average)',        ef: 0.1712 },
  { id: 'car-diesel', mode: 'Car — Diesel (average)',        ef: 0.1631 },
  { id: 'car-ev',     mode: 'Car — Electric Vehicle',        ef: 0.0470 },
  { id: 'hotel',      mode: 'Hotel Night (per room-night)',   ef: 20.6 },
]

/* ── GWP values for CH₄ and N₂O (AR5 100-year) ── */
export const GWP = {
  co2: 1,
  ch4: 28,
  n2o: 265,
}

/* ── Calculation helpers ── */
export function calcCO2e(co2_kg: number, ch4_kg: number, n2o_kg: number): number {
  return co2_kg * GWP.co2 + ch4_kg * GWP.ch4 + n2o_kg * GWP.n2o
}

export function kgToTonnes(kg: number): number {
  return kg / 1000
}
