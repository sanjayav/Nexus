import type { Sql } from './_db.js'

// ═══════════════════════════════════════════════════════════════════
// Linked-data propagation — canonical concept map.
//
// Each ConceptMapping row says: "this conceptual data point (e.g.
// 'ghg.scope1.total') is represented in framework <framework_id> by the
// questionnaire_item whose gri_code = <gri_code> AND line_item = <line_item>".
// unit_conversion is the multiplier applied to a raw value to express it
// in that framework's unit (multiplier from a notional canonical unit).
// When approving in framework A, the propagator computes:
//   peer_value = source_value * (peer.unit_conversion / source.unit_conversion)
//
// Lookups by gri_code + line_item are loose: the seed picks the first
// questionnaire_item that matches, so re-running setup is idempotent.
// ═══════════════════════════════════════════════════════════════════

export interface ConceptMapping {
  concept_key: string
  framework_id: string
  gri_code: string
  line_item: string
  /** Multiplier expressing the canonical value in the peer's unit. */
  unit_conversion: number
}

// 40 concept_keys × ~4 framework mappings each ≈ 160 rows.
// Keeping each line item terse — the lookup is fuzzy (LIKE / ILIKE) so an
// approximate match is enough to find the questionnaire_item id.
export const CONCEPT_MAPPINGS: ConceptMapping[] = [
  // ── GHG Scope 1 — total ──────────────────────────────────────────
  { concept_key: 'ghg.scope1.total', framework_id: 'gri',        gri_code: 'GRI 305-1',  line_item: 'Gross direct (Scope 1) GHG emissions',          unit_conversion: 1 },
  { concept_key: 'ghg.scope1.total', framework_id: 'csrd-e1',    gri_code: 'ESRS E1-6',  line_item: 'Gross Scope 1 GHG emissions',                   unit_conversion: 1 },
  { concept_key: 'ghg.scope1.total', framework_id: 'issb-s2',    gri_code: 'IFRS S2-29', line_item: 'Scope 1 emissions',                             unit_conversion: 1 },
  { concept_key: 'ghg.scope1.total', framework_id: 'cdp-2024',   gri_code: 'C6.1',       line_item: 'Scope 1 emissions',                             unit_conversion: 1 },
  { concept_key: 'ghg.scope1.total', framework_id: 'tcfd',       gri_code: 'TCFD-MT-B',  line_item: 'Scope 1 GHG emissions',                         unit_conversion: 1 },
  { concept_key: 'ghg.scope1.total', framework_id: 'sec-climate',gri_code: 'SEC 1502',   line_item: 'Material Scope 1 emissions',                    unit_conversion: 1 },
  { concept_key: 'ghg.scope1.total', framework_id: 'ca-sb253',   gri_code: 'SB253-S1',   line_item: 'Scope 1',                                       unit_conversion: 1 },

  // ── GHG Scope 2 — location-based ─────────────────────────────────
  { concept_key: 'ghg.scope2.location', framework_id: 'gri',        gri_code: 'GRI 305-2',  line_item: 'Energy indirect (Scope 2) GHG emissions',          unit_conversion: 1 },
  { concept_key: 'ghg.scope2.location', framework_id: 'csrd-e1',    gri_code: 'ESRS E1-6',  line_item: 'Gross location-based Scope 2 GHG emissions',       unit_conversion: 1 },
  { concept_key: 'ghg.scope2.location', framework_id: 'issb-s2',    gri_code: 'IFRS S2-29', line_item: 'Scope 2 emissions',                                unit_conversion: 1 },
  { concept_key: 'ghg.scope2.location', framework_id: 'cdp-2024',   gri_code: 'C6.3',       line_item: 'Scope 2 emissions (location-based)',               unit_conversion: 1 },
  { concept_key: 'ghg.scope2.location', framework_id: 'tcfd',       gri_code: 'TCFD-MT-B',  line_item: 'Scope 2 GHG emissions',                            unit_conversion: 1 },
  { concept_key: 'ghg.scope2.location', framework_id: 'ca-sb253',   gri_code: 'SB253-S2',   line_item: 'Scope 2',                                          unit_conversion: 1 },

  // ── GHG Scope 2 — market-based ───────────────────────────────────
  { concept_key: 'ghg.scope2.market', framework_id: 'gri',        gri_code: 'GRI 305-2',  line_item: 'Market-based Scope 2 GHG emissions',                 unit_conversion: 1 },
  { concept_key: 'ghg.scope2.market', framework_id: 'csrd-e1',    gri_code: 'ESRS E1-6',  line_item: 'Gross market-based Scope 2 GHG emissions',           unit_conversion: 1 },
  { concept_key: 'ghg.scope2.market', framework_id: 'cdp-2024',   gri_code: 'C6.3',       line_item: 'Scope 2 emissions (market-based)',                   unit_conversion: 1 },
  { concept_key: 'ghg.scope2.market', framework_id: 'issb-s2',    gri_code: 'IFRS S2-29', line_item: 'Scope 2 emissions market-based',                     unit_conversion: 1 },

  // ── Scope 3 — total ──────────────────────────────────────────────
  { concept_key: 'ghg.scope3.total', framework_id: 'gri',        gri_code: 'GRI 305-3',  line_item: 'Other indirect (Scope 3) GHG emissions',  unit_conversion: 1 },
  { concept_key: 'ghg.scope3.total', framework_id: 'csrd-e1',    gri_code: 'ESRS E1-6',  line_item: 'Total Scope 3 GHG emissions',             unit_conversion: 1 },
  { concept_key: 'ghg.scope3.total', framework_id: 'issb-s2',    gri_code: 'IFRS S2-29', line_item: 'Scope 3 emissions',                       unit_conversion: 1 },
  { concept_key: 'ghg.scope3.total', framework_id: 'cdp-2024',   gri_code: 'C6.5',       line_item: 'Scope 3 emissions',                       unit_conversion: 1 },
  { concept_key: 'ghg.scope3.total', framework_id: 'tcfd',       gri_code: 'TCFD-MT-B',  line_item: 'Scope 3 GHG emissions',                   unit_conversion: 1 },

  // ── Scope 3 categories 1-15 ──────────────────────────────────────
  ...Array.from({ length: 15 }, (_, i): ConceptMapping[] => {
    const cat = i + 1
    return [
      { concept_key: `ghg.scope3.cat${cat}`, framework_id: 'gri',        gri_code: 'GRI 305-3',  line_item: `Scope 3 category ${cat}`,           unit_conversion: 1 },
      { concept_key: `ghg.scope3.cat${cat}`, framework_id: 'csrd-e1',    gri_code: 'ESRS E1-6',  line_item: `Scope 3 category ${cat}`,           unit_conversion: 1 },
      { concept_key: `ghg.scope3.cat${cat}`, framework_id: 'cdp-2024',   gri_code: 'C6.5',       line_item: `Scope 3 category ${cat}`,           unit_conversion: 1 },
    ]
  }).flat(),

  // ── Total emissions ──────────────────────────────────────────────
  { concept_key: 'ghg.total',        framework_id: 'gri',        gri_code: 'GRI 305',     line_item: 'Total GHG emissions',           unit_conversion: 1 },
  { concept_key: 'ghg.total',        framework_id: 'csrd-e1',    gri_code: 'ESRS E1-6',   line_item: 'Total GHG emissions',           unit_conversion: 1 },
  { concept_key: 'ghg.total',        framework_id: 'cdp-2024',   gri_code: 'C6.7',        line_item: 'Total gross global emissions',  unit_conversion: 1 },
  { concept_key: 'ghg.total',        framework_id: 'tcfd',       gri_code: 'TCFD-MT-B',   line_item: 'Total GHG emissions',           unit_conversion: 1 },

  // ── Energy consumption — total ───────────────────────────────────
  { concept_key: 'energy.total',     framework_id: 'gri',        gri_code: 'GRI 302-1',   line_item: 'Energy consumption within the organisation', unit_conversion: 1 },
  { concept_key: 'energy.total',     framework_id: 'csrd-e1',    gri_code: 'ESRS E1-5',   line_item: 'Total energy consumption',                   unit_conversion: 1 },
  { concept_key: 'energy.total',     framework_id: 'cdp-2024',   gri_code: 'C8.2',        line_item: 'Total energy consumption',                   unit_conversion: 1 },
  { concept_key: 'energy.total',     framework_id: 'issb-s2',    gri_code: 'IFRS S2-29',  line_item: 'Energy consumption',                         unit_conversion: 1 },

  // ── Renewable energy share ───────────────────────────────────────
  { concept_key: 'energy.renewable.share', framework_id: 'gri',     gri_code: 'GRI 302-1',  line_item: 'Renewable energy share',                  unit_conversion: 1 },
  { concept_key: 'energy.renewable.share', framework_id: 'csrd-e1', gri_code: 'ESRS E1-5',  line_item: 'Share of renewable energy',               unit_conversion: 1 },
  { concept_key: 'energy.renewable.share', framework_id: 'cdp-2024',gri_code: 'C8.2',       line_item: 'Renewable energy consumption',            unit_conversion: 1 },

  // ── Water — withdrawal ───────────────────────────────────────────
  { concept_key: 'water.withdrawal',  framework_id: 'gri',        gri_code: 'GRI 303-3',   line_item: 'Water withdrawal',                          unit_conversion: 1 },
  { concept_key: 'water.withdrawal',  framework_id: 'csrd-e3',    gri_code: 'ESRS E3-4',   line_item: 'Total water withdrawal',                    unit_conversion: 1 },
  { concept_key: 'water.withdrawal',  framework_id: 'cdp-2024',   gri_code: 'W1.2',        line_item: 'Total water withdrawal',                    unit_conversion: 1 },

  // ── Water — consumption ─────────────────────────────────────────
  { concept_key: 'water.consumption', framework_id: 'gri',        gri_code: 'GRI 303-5',   line_item: 'Water consumption',                         unit_conversion: 1 },
  { concept_key: 'water.consumption', framework_id: 'csrd-e3',    gri_code: 'ESRS E3-4',   line_item: 'Total water consumption',                   unit_conversion: 1 },

  // ── Water — discharge ───────────────────────────────────────────
  { concept_key: 'water.discharge',   framework_id: 'gri',        gri_code: 'GRI 303-4',   line_item: 'Water discharge',                           unit_conversion: 1 },
  { concept_key: 'water.discharge',   framework_id: 'csrd-e3',    gri_code: 'ESRS E3-4',   line_item: 'Total water discharge',                     unit_conversion: 1 },

  // ── Waste — total ────────────────────────────────────────────────
  { concept_key: 'waste.total',       framework_id: 'gri',        gri_code: 'GRI 306-3',   line_item: 'Waste generated',                           unit_conversion: 1 },
  { concept_key: 'waste.total',       framework_id: 'csrd-e5',    gri_code: 'ESRS E5-5',   line_item: 'Total waste generated',                     unit_conversion: 1 },
  { concept_key: 'waste.total',       framework_id: 'cdp-2024',   gri_code: 'C7.5',        line_item: 'Total waste',                               unit_conversion: 1 },

  // ── Waste — diverted from disposal ──────────────────────────────
  { concept_key: 'waste.diverted',    framework_id: 'gri',        gri_code: 'GRI 306-4',   line_item: 'Waste diverted from disposal',              unit_conversion: 1 },
  { concept_key: 'waste.diverted',    framework_id: 'csrd-e5',    gri_code: 'ESRS E5-5',   line_item: 'Waste diverted',                            unit_conversion: 1 },

  // ── Workforce — total headcount ─────────────────────────────────
  { concept_key: 'workforce.headcount.total', framework_id: 'gri',     gri_code: 'GRI 2-7',   line_item: 'Total employees',                          unit_conversion: 1 },
  { concept_key: 'workforce.headcount.total', framework_id: 'csrd-s1', gri_code: 'ESRS S1-6', line_item: 'Total number of employees',                unit_conversion: 1 },

  // ── Workforce — female % ────────────────────────────────────────
  { concept_key: 'workforce.female.pct', framework_id: 'gri',       gri_code: 'GRI 405-1', line_item: 'Percentage of female employees',           unit_conversion: 1 },
  { concept_key: 'workforce.female.pct', framework_id: 'csrd-s1',   gri_code: 'ESRS S1-9', line_item: 'Gender distribution — female',             unit_conversion: 1 },

  // ── Health & Safety — fatalities ────────────────────────────────
  { concept_key: 'hs.fatalities', framework_id: 'gri',       gri_code: 'GRI 403-9',  line_item: 'Work-related fatalities',                       unit_conversion: 1 },
  { concept_key: 'hs.fatalities', framework_id: 'csrd-s1',   gri_code: 'ESRS S1-14', line_item: 'Number of fatalities',                          unit_conversion: 1 },

  // ── Health & Safety — recordable incident rate ──────────────────
  { concept_key: 'hs.recordable.rate', framework_id: 'gri',     gri_code: 'GRI 403-9',  line_item: 'Recordable work-related injuries',           unit_conversion: 1 },
  { concept_key: 'hs.recordable.rate', framework_id: 'csrd-s1', gri_code: 'ESRS S1-14', line_item: 'Recordable work-related accidents',          unit_conversion: 1 },

  // ── Governance — board oversight of climate ─────────────────────
  { concept_key: 'gov.board.climate',  framework_id: 'tcfd',     gri_code: 'TCFD-GOV-A',  line_item: 'Board oversight of climate-related risks',    unit_conversion: 1 },
  { concept_key: 'gov.board.climate',  framework_id: 'cdp-2024', gri_code: 'C1.1',        line_item: 'Board-level oversight of climate issues',     unit_conversion: 1 },
  { concept_key: 'gov.board.climate',  framework_id: 'issb-s2',  gri_code: 'IFRS S2-6',   line_item: 'Governance — board oversight',                unit_conversion: 1 },

  // ── Governance — independent directors ──────────────────────────
  { concept_key: 'gov.board.independent.pct', framework_id: 'gri',     gri_code: 'GRI 2-9',     line_item: 'Independent board members',                unit_conversion: 1 },
  { concept_key: 'gov.board.independent.pct', framework_id: 'csrd-g1', gri_code: 'ESRS G1-2',   line_item: 'Share of independent directors',           unit_conversion: 1 },

  // ── Diversity — pay gap ─────────────────────────────────────────
  { concept_key: 'workforce.paygap.gender', framework_id: 'gri',     gri_code: 'GRI 405-2', line_item: 'Ratio of basic salary and remuneration',     unit_conversion: 1 },
  { concept_key: 'workforce.paygap.gender', framework_id: 'csrd-s1', gri_code: 'ESRS S1-16', line_item: 'Gender pay gap',                             unit_conversion: 1 },

  // ── Training hours ──────────────────────────────────────────────
  { concept_key: 'workforce.training.hours', framework_id: 'gri',     gri_code: 'GRI 404-1', line_item: 'Average hours of training per employee',   unit_conversion: 1 },
  { concept_key: 'workforce.training.hours', framework_id: 'csrd-s1', gri_code: 'ESRS S1-13', line_item: 'Training hours per employee',              unit_conversion: 1 },

  // ── Climate transition plan ─────────────────────────────────────
  { concept_key: 'climate.transition.plan', framework_id: 'csrd-e1',  gri_code: 'ESRS E1-1', line_item: 'Transition plan for climate change mitigation', unit_conversion: 1 },
  { concept_key: 'climate.transition.plan', framework_id: 'tcfd',     gri_code: 'TCFD-STR-B', line_item: 'Climate transition strategy',                  unit_conversion: 1 },
  { concept_key: 'climate.transition.plan', framework_id: 'cdp-2024', gri_code: 'C3.1',       line_item: 'Climate transition plan',                      unit_conversion: 1 },

  // ── Climate risks — physical ────────────────────────────────────
  { concept_key: 'climate.risk.physical', framework_id: 'tcfd',     gri_code: 'TCFD-RM-A',  line_item: 'Physical climate risks',                  unit_conversion: 1 },
  { concept_key: 'climate.risk.physical', framework_id: 'issb-s2',  gri_code: 'IFRS S2-10', line_item: 'Physical climate-related risks',          unit_conversion: 1 },
  { concept_key: 'climate.risk.physical', framework_id: 'csrd-e1',  gri_code: 'ESRS E1-9',  line_item: 'Physical risks from climate change',      unit_conversion: 1 },

  // ── Climate risks — transition ──────────────────────────────────
  { concept_key: 'climate.risk.transition', framework_id: 'tcfd',     gri_code: 'TCFD-RM-A',  line_item: 'Transition climate risks',              unit_conversion: 1 },
  { concept_key: 'climate.risk.transition', framework_id: 'issb-s2',  gri_code: 'IFRS S2-10', line_item: 'Transition climate-related risks',      unit_conversion: 1 },
  { concept_key: 'climate.risk.transition', framework_id: 'csrd-e1',  gri_code: 'ESRS E1-9',  line_item: 'Transition risks from climate change',  unit_conversion: 1 },

  // ── Climate targets ─────────────────────────────────────────────
  { concept_key: 'climate.targets.net_zero', framework_id: 'csrd-e1',  gri_code: 'ESRS E1-4',  line_item: 'Net zero target',                       unit_conversion: 1 },
  { concept_key: 'climate.targets.net_zero', framework_id: 'tcfd',     gri_code: 'TCFD-MT-C',  line_item: 'Net-zero target',                       unit_conversion: 1 },
  { concept_key: 'climate.targets.net_zero', framework_id: 'cdp-2024', gri_code: 'C4.2',       line_item: 'Net-zero target',                       unit_conversion: 1 },

  // ── Biodiversity — sites in protected areas ─────────────────────
  { concept_key: 'biodiv.protected.sites', framework_id: 'gri',     gri_code: 'GRI 304-1', line_item: 'Operational sites in protected areas',  unit_conversion: 1 },
  { concept_key: 'biodiv.protected.sites', framework_id: 'csrd-e4', gri_code: 'ESRS E4-5', line_item: 'Sites near biodiversity-sensitive areas', unit_conversion: 1 },

  // ── Air pollutants ──────────────────────────────────────────────
  { concept_key: 'air.nox',  framework_id: 'gri',     gri_code: 'GRI 305-7', line_item: 'NOx emissions',  unit_conversion: 1 },
  { concept_key: 'air.nox',  framework_id: 'csrd-e2', gri_code: 'ESRS E2-4', line_item: 'NOx emissions',  unit_conversion: 1 },
  { concept_key: 'air.sox',  framework_id: 'gri',     gri_code: 'GRI 305-7', line_item: 'SOx emissions',  unit_conversion: 1 },
  { concept_key: 'air.sox',  framework_id: 'csrd-e2', gri_code: 'ESRS E2-4', line_item: 'SOx emissions',  unit_conversion: 1 },

  // ── Anti-corruption ─────────────────────────────────────────────
  { concept_key: 'governance.anticorruption.training', framework_id: 'gri',     gri_code: 'GRI 205-2', line_item: 'Anti-corruption training',         unit_conversion: 1 },
  { concept_key: 'governance.anticorruption.training', framework_id: 'csrd-g1', gri_code: 'ESRS G1-3', line_item: 'Anti-corruption training coverage', unit_conversion: 1 },

  // ── Internal carbon price ───────────────────────────────────────
  { concept_key: 'climate.carbon.price.internal', framework_id: 'cdp-2024', gri_code: 'C11.3', line_item: 'Internal carbon price',              unit_conversion: 1 },
  { concept_key: 'climate.carbon.price.internal', framework_id: 'tcfd',     gri_code: 'TCFD-MT-A', line_item: 'Internal carbon price',          unit_conversion: 1 },
  { concept_key: 'climate.carbon.price.internal', framework_id: 'csrd-e1',  gri_code: 'ESRS E1-8', line_item: 'Internal carbon pricing schemes', unit_conversion: 1 },
]

/**
 * Idempotent seeder for concept_mappings.
 *
 * Resolves each (gri_code, line_item) → questionnaire_item.id by LIKE match
 * (case-insensitive substring on line_item, exact match on gri_code). If no
 * questionnaire_item matches (because that framework's seed isn't installed
 * or the line item text differs), the mapping is silently skipped — the
 * propagator handles missing peers fine, and re-running setup after adding
 * more framework seeds will fill the gaps.
 */
export async function seedConceptMappings(sql: Sql): Promise<{ rowsInserted: number; conceptKeys: number; mappings: number }> {
  // Defensive: make sure the tables exist before writing (so this seeder
  // can be invoked from one-off scripts that skip the full setup chain).
  await sql`CREATE TABLE IF NOT EXISTS concept_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concept_key TEXT NOT NULL,
    framework_id TEXT NOT NULL,
    questionnaire_item_id UUID REFERENCES questionnaire_item(id) ON DELETE CASCADE,
    unit_conversion NUMERIC DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(concept_key, framework_id, questionnaire_item_id)
  )`
  await sql`CREATE INDEX IF NOT EXISTS idx_concept_mappings_concept ON concept_mappings(concept_key)`
  await sql`CREATE INDEX IF NOT EXISTS idx_concept_mappings_qi ON concept_mappings(questionnaire_item_id)`

  let rowsInserted = 0
  const uniqueConceptKeys = new Set<string>()
  for (const m of CONCEPT_MAPPINGS) {
    uniqueConceptKeys.add(m.concept_key)
    // Find the first questionnaire_item matching (framework_id, gri_code, fuzzy line_item).
    // Falls back to gri_code-only match if line_item is unique enough.
    const lineLike = `%${m.line_item}%`
    const matches = await sql`
      SELECT id FROM questionnaire_item
      WHERE framework_id = ${m.framework_id}
        AND gri_code = ${m.gri_code}
        AND line_item ILIKE ${lineLike}
      LIMIT 1
    ` as Array<{ id: string }>

    let qiId: string | null = matches[0]?.id ?? null
    if (!qiId) {
      // Loosen: drop line_item match
      const looser = await sql`
        SELECT id FROM questionnaire_item
        WHERE framework_id = ${m.framework_id}
          AND gri_code = ${m.gri_code}
        LIMIT 1
      ` as Array<{ id: string }>
      qiId = looser[0]?.id ?? null
    }
    if (!qiId) continue

    const inserted = await sql`
      INSERT INTO concept_mappings (concept_key, framework_id, questionnaire_item_id, unit_conversion)
      VALUES (${m.concept_key}, ${m.framework_id}, ${qiId}, ${m.unit_conversion})
      ON CONFLICT (concept_key, framework_id, questionnaire_item_id) DO NOTHING
      RETURNING id
    ` as Array<{ id: string }>
    if (inserted.length > 0) rowsInserted++
  }

  return {
    rowsInserted,
    conceptKeys: uniqueConceptKeys.size,
    mappings: CONCEPT_MAPPINGS.length,
  }
}
