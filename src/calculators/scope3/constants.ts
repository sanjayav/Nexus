// Shared Scope 3 constants and helpers. Kept in a leaf module (no imports from
// ./index) so category modules can read them at module-evaluation time without
// creating an import cycle with the registry in ./index.

// ─── Shared illustrative EEIO sector factors ──────────────────────────
// kgCO2e per USD spend. TODO: replace with USEEIO v2.0 / EXIOBASE values.
export const EEIO_FACTORS: Record<string, number> = {
  'agriculture': 0.62,
  'mining': 0.95,
  'utilities': 1.10,
  'construction': 0.48,
  'food_beverage': 0.55,
  'textiles_apparel': 0.45,
  'wood_paper': 0.62,
  'chemicals': 0.88,
  'pharmaceuticals': 0.34,
  'plastics_rubber': 0.78,
  'cement_concrete': 1.05,
  'iron_steel': 1.20,
  'nonferrous_metals': 0.95,
  'fabricated_metal': 0.60,
  'machinery': 0.42,
  'electronics': 0.40,
  'electrical_equipment': 0.45,
  'motor_vehicles': 0.50,
  'other_transport_equipment': 0.55,
  'furniture': 0.55,
  'wholesale_retail': 0.18,
  'transport_warehousing': 0.85,
  'information_telecom': 0.15,
  'financial_services': 0.10,
  'real_estate': 0.12,
  'professional_services': 0.16,
  'admin_support': 0.22,
  'education_health': 0.18,
  'arts_entertainment': 0.20,
  'food_services': 0.38,
  'other_services': 0.30,
}

export const EEIO_SECTOR_OPTIONS = Object.keys(EEIO_FACTORS)
export const REGION_OPTIONS = ['GLOBAL', 'UK', 'US', 'EU', 'APAC']

export const ILLUSTRATIVE_NOTE =
  'Illustrative spend-based factor; replace with USEEIO v2.0 / EXIOBASE for production.'

/** Convenience: number coercion with default. */
export const toNum = (v: unknown, dflt = 0): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : dflt
}
