/* ═══════════════════════════════════════════
   PTTEP Demo Data — Realistic emission data
   Based on PTTEP's CDP/sustainability disclosures
   Oil & gas E&P: combustion, flaring, venting,
   fugitives, purchased electricity, Scope 3
   ═══════════════════════════════════════════ */

export interface ExcelRow {
  scope: string
  category: string
  source: string
  fuelOrFactor: string
  quantity: number
  unit: string
  co2e_tonnes?: number
}

/* ── Scope 1 — Direct Emissions ── */
const scope1: ExcelRow[] = [
  // Stationary combustion — platforms & onshore plants
  { scope: 'Scope 1', category: 'Stationary Combustion', source: 'Arthit Platform — Gas Turbine A', fuelOrFactor: 'Natural Gas', quantity: 485000, unit: 'm³' },
  { scope: 'Scope 1', category: 'Stationary Combustion', source: 'Arthit Platform — Gas Turbine B', fuelOrFactor: 'Natural Gas', quantity: 512000, unit: 'm³' },
  { scope: 'Scope 1', category: 'Stationary Combustion', source: 'Bongkot South — Power Gen', fuelOrFactor: 'Natural Gas', quantity: 1240000, unit: 'm³' },
  { scope: 'Scope 1', category: 'Stationary Combustion', source: 'S1 Project — Heater Treater', fuelOrFactor: 'Natural Gas', quantity: 98000, unit: 'm³' },
  { scope: 'Scope 1', category: 'Stationary Combustion', source: 'GPF Onshore — Emergency Gen', fuelOrFactor: 'Diesel / Gas Oil', quantity: 34500, unit: 'litre' },
  { scope: 'Scope 1', category: 'Stationary Combustion', source: 'MTJDA — Boiler #1', fuelOrFactor: 'Heavy Fuel Oil (HFO)', quantity: 18200, unit: 'litre' },
  { scope: 'Scope 1', category: 'Stationary Combustion', source: 'Zawtika Platform — Compressor', fuelOrFactor: 'Natural Gas', quantity: 876000, unit: 'm³' },
  { scope: 'Scope 1', category: 'Stationary Combustion', source: 'Cash-Maple — Incinerator', fuelOrFactor: 'Diesel / Gas Oil', quantity: 8900, unit: 'litre' },

  // Mobile combustion — vessels, helicopters, fleet
  { scope: 'Scope 1', category: 'Mobile Combustion', source: 'OSV Fleet — Supply Vessels (6)', fuelOrFactor: 'Marine Diesel Oil', quantity: 245000, unit: 'litre' },
  { scope: 'Scope 1', category: 'Mobile Combustion', source: 'Helicopter Transfer — Sikorsky S-76', fuelOrFactor: 'Jet Fuel (Jet A-1)', quantity: 128000, unit: 'litre' },
  { scope: 'Scope 1', category: 'Mobile Combustion', source: 'Company Vehicles — Bangkok Office', fuelOrFactor: 'Diesel', quantity: 42000, unit: 'litre' },
  { scope: 'Scope 1', category: 'Mobile Combustion', source: 'Company Vehicles — S1 Field', fuelOrFactor: 'Diesel', quantity: 18700, unit: 'litre' },
  { scope: 'Scope 1', category: 'Mobile Combustion', source: 'Crew Boats — Bongkot', fuelOrFactor: 'Marine Diesel Oil', quantity: 67000, unit: 'litre' },

  // HFC / PFC — refrigerant leaks
  { scope: 'Scope 1', category: 'HFC/PFC Emissions', source: 'Arthit — HVAC Chiller Unit', fuelOrFactor: 'R-134a', quantity: 12.5, unit: 'kg' },
  { scope: 'Scope 1', category: 'HFC/PFC Emissions', source: 'Bongkot CPP — Refrigeration', fuelOrFactor: 'R-410A', quantity: 8.2, unit: 'kg' },
  { scope: 'Scope 1', category: 'HFC/PFC Emissions', source: 'S1 Processing — Cold Box', fuelOrFactor: 'R-404A', quantity: 5.8, unit: 'kg' },
  { scope: 'Scope 1', category: 'HFC/PFC Emissions', source: 'HQ Bangkok — Building HVAC', fuelOrFactor: 'R-32 (HFC-32)', quantity: 3.1, unit: 'kg' },
]

/* ── Scope 2 — Indirect Energy ── */
const scope2: ExcelRow[] = [
  { scope: 'Scope 2', category: 'Purchased Electricity', source: 'PTTEP HQ — Energy Complex, Bangkok', fuelOrFactor: 'Thailand — MEA Central', quantity: 4850000, unit: 'kWh' },
  { scope: 'Scope 2', category: 'Purchased Electricity', source: 'S1 Onshore Processing Plant', fuelOrFactor: 'Thailand — PEA Eastern', quantity: 12400000, unit: 'kWh' },
  { scope: 'Scope 2', category: 'Purchased Electricity', source: 'Songkhla Base — Shore Support', fuelOrFactor: 'Thailand — PEA Eastern', quantity: 1870000, unit: 'kWh' },
  { scope: 'Scope 2', category: 'Purchased Electricity', source: 'PTTEP Technology & Innovation Centre', fuelOrFactor: 'Thailand — MEA Central', quantity: 2100000, unit: 'kWh' },
  { scope: 'Scope 2', category: 'Purchased Electricity', source: 'Myanmar Office — Yangon', fuelOrFactor: 'Thailand — MEA Central', quantity: 380000, unit: 'kWh' },
  { scope: 'Scope 2', category: 'Purchased Heat/Steam', source: 'S1 Onshore — District Steam', fuelOrFactor: 'Steam from Natural Gas Boiler', quantity: 3200000, unit: 'kWh' },
  { scope: 'Scope 2', category: 'Purchased Heat/Steam', source: 'Energy Complex — District Cooling', fuelOrFactor: 'District Cooling', quantity: 1450000, unit: 'kWh' },
]

/* ── Scope 3 — Value Chain ── */
const scope3: ExcelRow[] = [
  // Cat 1 — Purchased Goods & Services
  { scope: 'Scope 3', category: 'Cat 1 — Purchased Goods & Services', source: 'Drilling Chemicals — Schlumberger', fuelOrFactor: 'Chemicals & Chemical Products', quantity: 8500000, unit: 'USD' },
  { scope: 'Scope 3', category: 'Cat 1 — Purchased Goods & Services', source: 'Wellhead Equipment — Cameron', fuelOrFactor: 'Machinery & Equipment', quantity: 12400000, unit: 'USD' },
  { scope: 'Scope 3', category: 'Cat 1 — Purchased Goods & Services', source: 'Subsea Umbilicals & Cables', fuelOrFactor: 'Electronics & Electrical', quantity: 4200000, unit: 'USD' },
  { scope: 'Scope 3', category: 'Cat 1 — Purchased Goods & Services', source: 'Office Supplies & IT Services', fuelOrFactor: 'IT & Telecom Services', quantity: 3100000, unit: 'USD' },
  { scope: 'Scope 3', category: 'Cat 1 — Purchased Goods & Services', source: 'Catering & Provisions — Offshore', fuelOrFactor: 'Food & Beverages', quantity: 2800000, unit: 'USD' },
  { scope: 'Scope 3', category: 'Cat 1 — Purchased Goods & Services', source: 'Legal, Audit & Consulting', fuelOrFactor: 'Professional Services', quantity: 5600000, unit: 'USD' },

  // Cat 2 — Capital Goods
  { scope: 'Scope 3', category: 'Cat 2 — Capital Goods', source: 'Bongkot Phase 5 — Platform Steel', fuelOrFactor: 'Basic Metals & Fabricated', quantity: 45000000, unit: 'USD' },
  { scope: 'Scope 3', category: 'Cat 2 — Capital Goods', source: 'S1 Debottleneck — Compressors', fuelOrFactor: 'Machinery & Equipment', quantity: 18000000, unit: 'USD' },
  { scope: 'Scope 3', category: 'Cat 2 — Capital Goods', source: 'Subsea Production System', fuelOrFactor: 'Machinery & Equipment', quantity: 32000000, unit: 'USD' },

  // Cat 4 — Upstream Transportation
  { scope: 'Scope 3', category: 'Cat 4 — Upstream Transportation', source: 'Chemical Delivery — Map Ta Phut → Songkhla', fuelOrFactor: 'Road — Heavy Truck (>20t)', quantity: 850, unit: 'tonne-km' },
  { scope: 'Scope 3', category: 'Cat 4 — Upstream Transportation', source: 'Equipment Shipping — Rotterdam → Laem Chabang', fuelOrFactor: 'Sea — Container Ship', quantity: 42000, unit: 'tonne-km' },
  { scope: 'Scope 3', category: 'Cat 4 — Upstream Transportation', source: 'Pipe Delivery — China → Songkhla', fuelOrFactor: 'Sea — Bulk Carrier', quantity: 78000, unit: 'tonne-km' },
  { scope: 'Scope 3', category: 'Cat 4 — Upstream Transportation', source: 'Urgent Spares — Air Freight Singapore', fuelOrFactor: 'Air — Short-haul Freight', quantity: 1200, unit: 'tonne-km' },

  // Cat 5 — Waste Generated
  { scope: 'Scope 3', category: 'Cat 5 — Waste Generated', source: 'Drill Cuttings — Onshore Disposal', fuelOrFactor: 'Landfill (mixed waste)', quantity: 4200, unit: 'tonnes' },
  { scope: 'Scope 3', category: 'Cat 5 — Waste Generated', source: 'Hazardous Waste — Incineration', fuelOrFactor: 'Incineration with energy recovery', quantity: 380, unit: 'tonnes' },
  { scope: 'Scope 3', category: 'Cat 5 — Waste Generated', source: 'Recyclable Waste — Metal, Plastic', fuelOrFactor: 'Recycling', quantity: 620, unit: 'tonnes' },
  { scope: 'Scope 3', category: 'Cat 5 — Waste Generated', source: 'Food Waste — Offshore Platforms', fuelOrFactor: 'Composting (organic)', quantity: 145, unit: 'tonnes' },

  // Cat 6 — Business Travel
  { scope: 'Scope 3', category: 'Cat 6 — Business Travel', source: 'BKK→London (Execs) Q1–Q4', fuelOrFactor: 'Air — Long-haul (>3500 km)', quantity: 285000, unit: 'pax-km' },
  { scope: 'Scope 3', category: 'Cat 6 — Business Travel', source: 'BKK→Singapore Trips', fuelOrFactor: 'Air — Short-haul (<1500 km)', quantity: 124000, unit: 'pax-km' },
  { scope: 'Scope 3', category: 'Cat 6 — Business Travel', source: 'BKK→Perth (Australia Ops)', fuelOrFactor: 'Air — Medium-haul', quantity: 98000, unit: 'pax-km' },
  { scope: 'Scope 3', category: 'Cat 6 — Business Travel', source: 'Domestic Rail — Site Visits', fuelOrFactor: 'Rail (average)', quantity: 42000, unit: 'pax-km' },
  { scope: 'Scope 3', category: 'Cat 6 — Business Travel', source: 'Hotel Nights — All Trips', fuelOrFactor: 'Hotel Night (per room-night)', quantity: 2400, unit: 'room-nights' },

  // Cat 7 — Employee Commuting
  { scope: 'Scope 3', category: 'Cat 7 — Employee Commuting', source: 'HQ Staff Commute — Car (Petrol)', fuelOrFactor: 'Car — Petrol (average)', quantity: 1850000, unit: 'pax-km' },
  { scope: 'Scope 3', category: 'Cat 7 — Employee Commuting', source: 'HQ Staff Commute — BTS/MRT', fuelOrFactor: 'Rail (average)', quantity: 920000, unit: 'pax-km' },
  { scope: 'Scope 3', category: 'Cat 7 — Employee Commuting', source: 'HQ Staff Commute — Bus', fuelOrFactor: 'Bus / Coach', quantity: 340000, unit: 'pax-km' },
]

export const PTTEP_DEMO_DATA: ExcelRow[] = [...scope1, ...scope2, ...scope3]

/* ── Column header aliases for smart mapping ── */
export const COLUMN_ALIASES: Record<string, string[]> = {
  scope:        ['scope', 'ghg scope', 'emission scope', 'type'],
  category:     ['category', 'emission category', 'ghg category', 'sub-category', 'subcategory', 'source type', 'emission type'],
  source:       ['source', 'source name', 'facility', 'asset', 'platform', 'site', 'location', 'description', 'equipment', 'name'],
  fuelOrFactor: ['fuel', 'fuel type', 'factor', 'emission factor', 'fuel/factor', 'energy type', 'refrigerant', 'mode', 'method', 'spend category', 'transport mode', 'disposal method', 'travel mode'],
  quantity:     ['quantity', 'amount', 'volume', 'consumption', 'value', 'qty', 'total', 'usage'],
  unit:         ['unit', 'units', 'uom', 'measure', 'unit of measure'],
}
