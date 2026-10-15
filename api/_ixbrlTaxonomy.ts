/**
 * api/_ixbrlTaxonomy.ts — Comprehensive XBRL concept registry covering all
 * active Nexus frameworks: ESRS (E1-E5, S1-S4, G1), ISSB (S1/S2), SEC
 * Climate, GRI, and EU Taxonomy.
 *
 * This is a curated production taxonomy — every entry maps to a real
 * paragraph in the underlying standard. It does NOT replace the official
 * EFRAG ESRS XSD (~80MB of XSD/linkbase files) but it gives Nexus a
 * structurally correct concept set for tagging.
 *
 * Concepts are addressed by `id` (namespace:LocalName). Mapping from a
 * questionnaire_item to a concept happens via the new
 * `questionnaire_item.xbrl_concept_id` column (set by seeders / admin UI).
 */

export type XbrlNamespace = 'esrs' | 'ifrs-full' | 'us-gaap' | 'gri' | 'eu-tax'

export interface XbrlReference {
  source: string       // e.g. 'ESRS E1'
  paragraph: string    // e.g. '50'
}

export interface XbrlConcept {
  id: string                                   // 'esrs:GrossScope1GreenhouseGasEmissions'
  namespace: XbrlNamespace
  framework: string                            // matches FRAMEWORKS[].id e.g. 'csrd-e1'
  label: string
  type: 'monetary' | 'numeric' | 'string' | 'boolean' | 'date' | 'enum' | 'percent'
  unitRef?: 'tCO2e' | 'kWh' | 'MWh' | 'EUR' | 'USD' | 'GBP' | 'pure' | 'percent' | 'm3' | 'kg' | 't' | 'count' | 'hours' | 'fte'
  decimals?: number
  periodType: 'instant' | 'duration'
  abstract?: boolean
  balance?: 'debit' | 'credit'
  references?: XbrlReference[]
  validators?: ('non_negative' | 'percentage_range' | 'sum_to_total' | 'plausible_emissions')[]
  /** Marks concepts that ESRS designates as "shall disclose" — used by the validator. */
  required?: boolean
}

// ─────────────────────────────────────────────────────────────────────
// Builder helpers — keep entries compact + consistent
// ─────────────────────────────────────────────────────────────────────

function c(p: Partial<XbrlConcept> & Pick<XbrlConcept, 'id' | 'label' | 'framework' | 'type' | 'periodType'>): XbrlConcept {
  const ns = (p.id.split(':')[0] as XbrlNamespace) ?? 'esrs'
  return { namespace: ns, ...p } as XbrlConcept
}

// ─────────────────────────────────────────────────────────────────────
// ESRS E1 — Climate (~60 concepts)
// ─────────────────────────────────────────────────────────────────────

const ESRS_E1: XbrlConcept[] = [
  c({ id: 'esrs:TransitionPlanForClimateChangeMitigation', framework: 'csrd-e1', label: 'Transition plan for climate change mitigation', type: 'string', periodType: 'duration', required: true, references: [{ source: 'ESRS E1-1', paragraph: '14' }] }),
  c({ id: 'esrs:PoliciesRelatedToClimateChangeMitigationAndAdaptation', framework: 'csrd-e1', label: 'Policies related to climate change mitigation and adaptation', type: 'string', periodType: 'duration', references: [{ source: 'ESRS E1-2', paragraph: '22' }] }),
  c({ id: 'esrs:ActionsAndResourcesInRelationToClimateChangePolicies', framework: 'csrd-e1', label: 'Actions and resources in relation to climate change policies', type: 'string', periodType: 'duration', references: [{ source: 'ESRS E1-3', paragraph: '27' }] }),
  c({ id: 'esrs:TargetsRelatedToClimateChangeMitigationAndAdaptation', framework: 'csrd-e1', label: 'Targets related to climate change mitigation and adaptation', type: 'string', periodType: 'duration', references: [{ source: 'ESRS E1-4', paragraph: '34' }] }),

  // E1-5 Energy
  c({ id: 'esrs:TotalEnergyConsumption', framework: 'csrd-e1', label: 'Total energy consumption', type: 'numeric', unitRef: 'MWh', decimals: 0, periodType: 'duration', validators: ['non_negative'], references: [{ source: 'ESRS E1-5', paragraph: '37' }] }),
  c({ id: 'esrs:EnergyConsumptionFromFossilSources', framework: 'csrd-e1', label: 'Energy consumption from fossil sources', type: 'numeric', unitRef: 'MWh', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:EnergyConsumptionFromNuclearSources', framework: 'csrd-e1', label: 'Energy consumption from nuclear sources', type: 'numeric', unitRef: 'MWh', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:EnergyConsumptionFromRenewableSources', framework: 'csrd-e1', label: 'Energy consumption from renewable sources', type: 'numeric', unitRef: 'MWh', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:NonRenewableEnergyProduction', framework: 'csrd-e1', label: 'Non-renewable energy production', type: 'numeric', unitRef: 'MWh', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:RenewableEnergyProduction', framework: 'csrd-e1', label: 'Renewable energy production', type: 'numeric', unitRef: 'MWh', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:EnergyIntensityPerNetRevenue', framework: 'csrd-e1', label: 'Energy intensity per net revenue', type: 'numeric', unitRef: 'pure', decimals: 2, periodType: 'duration' }),

  // E1-6 GHG emissions
  c({ id: 'esrs:GrossScope1GreenhouseGasEmissions', framework: 'csrd-e1', label: 'Gross Scope 1 greenhouse gas emissions', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', required: true, validators: ['non_negative', 'plausible_emissions'], references: [{ source: 'ESRS E1-6', paragraph: '44' }] }),
  c({ id: 'esrs:PercentageOfScope1GHGEmissionsFromRegulatedEmissionTradingSchemes', framework: 'csrd-e1', label: 'Percentage of Scope 1 GHG emissions from regulated emission trading schemes', type: 'percent', unitRef: 'percent', decimals: 2, periodType: 'duration', validators: ['percentage_range'] }),
  c({ id: 'esrs:GrossLocationBasedScope2GreenhouseGasEmissions', framework: 'csrd-e1', label: 'Gross location-based Scope 2 greenhouse gas emissions', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', required: true, validators: ['non_negative', 'plausible_emissions'], references: [{ source: 'ESRS E1-6', paragraph: '45' }] }),
  c({ id: 'esrs:GrossMarketBasedScope2GreenhouseGasEmissions', framework: 'csrd-e1', label: 'Gross market-based Scope 2 greenhouse gas emissions', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', required: true, validators: ['non_negative', 'plausible_emissions'] }),
  c({ id: 'esrs:GrossScope3GreenhouseGasEmissions', framework: 'csrd-e1', label: 'Gross Scope 3 greenhouse gas emissions', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative', 'plausible_emissions'], references: [{ source: 'ESRS E1-6', paragraph: '51' }] }),
  c({ id: 'esrs:TotalGHGEmissionsLocationBased', framework: 'csrd-e1', label: 'Total GHG emissions (location-based)', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:TotalGHGEmissionsMarketBased', framework: 'csrd-e1', label: 'Total GHG emissions (market-based)', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:BiogenicEmissionsScope1', framework: 'csrd-e1', label: 'Biogenic emissions from combustion or biodegradation of biomass (Scope 1)', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:BiogenicEmissionsScope2', framework: 'csrd-e1', label: 'Biogenic emissions associated with Scope 2 energy', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:BiogenicEmissionsScope3', framework: 'csrd-e1', label: 'Biogenic emissions associated with Scope 3 activities', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),

  // Scope 3 category breakdown (categories 1–15)
  c({ id: 'esrs:Scope3Category1PurchasedGoodsAndServices', framework: 'csrd-e1', label: 'Scope 3 Category 1 — Purchased goods and services', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:Scope3Category2CapitalGoods', framework: 'csrd-e1', label: 'Scope 3 Category 2 — Capital goods', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:Scope3Category3FuelAndEnergyRelated', framework: 'csrd-e1', label: 'Scope 3 Category 3 — Fuel- and energy-related activities', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:Scope3Category4UpstreamTransportation', framework: 'csrd-e1', label: 'Scope 3 Category 4 — Upstream transportation and distribution', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:Scope3Category5WasteGeneratedInOperations', framework: 'csrd-e1', label: 'Scope 3 Category 5 — Waste generated in operations', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:Scope3Category6BusinessTravel', framework: 'csrd-e1', label: 'Scope 3 Category 6 — Business travel', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:Scope3Category7EmployeeCommuting', framework: 'csrd-e1', label: 'Scope 3 Category 7 — Employee commuting', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:Scope3Category8UpstreamLeasedAssets', framework: 'csrd-e1', label: 'Scope 3 Category 8 — Upstream leased assets', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:Scope3Category9DownstreamTransportation', framework: 'csrd-e1', label: 'Scope 3 Category 9 — Downstream transportation and distribution', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:Scope3Category10ProcessingOfSoldProducts', framework: 'csrd-e1', label: 'Scope 3 Category 10 — Processing of sold products', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:Scope3Category11UseOfSoldProducts', framework: 'csrd-e1', label: 'Scope 3 Category 11 — Use of sold products', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:Scope3Category12EndOfLifeTreatment', framework: 'csrd-e1', label: 'Scope 3 Category 12 — End-of-life treatment of sold products', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:Scope3Category13DownstreamLeasedAssets', framework: 'csrd-e1', label: 'Scope 3 Category 13 — Downstream leased assets', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:Scope3Category14Franchises', framework: 'csrd-e1', label: 'Scope 3 Category 14 — Franchises', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:Scope3Category15Investments', framework: 'csrd-e1', label: 'Scope 3 Category 15 — Investments (financed emissions)', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),

  // Intensity & removals
  c({ id: 'esrs:GHGEmissionsIntensityLocationBased', framework: 'csrd-e1', label: 'GHG emissions intensity per net revenue (location-based)', type: 'numeric', unitRef: 'pure', decimals: 4, periodType: 'duration' }),
  c({ id: 'esrs:GHGEmissionsIntensityMarketBased', framework: 'csrd-e1', label: 'GHG emissions intensity per net revenue (market-based)', type: 'numeric', unitRef: 'pure', decimals: 4, periodType: 'duration' }),
  c({ id: 'esrs:GHGRemovalsAndStorageInOwnOperations', framework: 'csrd-e1', label: 'GHG removals and storage in own operations and value chain', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', references: [{ source: 'ESRS E1-7', paragraph: '57' }] }),
  c({ id: 'esrs:CarbonCreditsCancelledInReportingPeriod', framework: 'csrd-e1', label: 'Carbon credits cancelled in reporting period', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:CarbonCreditsPlannedToBeCancelled', framework: 'csrd-e1', label: 'Carbon credits planned to be cancelled in the future', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),

  // E1-8 Internal carbon price
  c({ id: 'esrs:InternalCarbonPriceApplied', framework: 'csrd-e1', label: 'Internal carbon price applied', type: 'monetary', unitRef: 'EUR', decimals: 2, periodType: 'instant', references: [{ source: 'ESRS E1-8', paragraph: '62' }] }),
  c({ id: 'esrs:DescriptionOfInternalCarbonPricingSchemes', framework: 'csrd-e1', label: 'Description of internal carbon pricing schemes', type: 'string', periodType: 'duration' }),

  // E1-9 Financial effects
  c({ id: 'esrs:AnticipatedFinancialEffectsFromPhysicalRisks', framework: 'csrd-e1', label: 'Anticipated financial effects from material physical risks', type: 'monetary', unitRef: 'EUR', decimals: 0, periodType: 'duration', balance: 'debit' }),
  c({ id: 'esrs:AnticipatedFinancialEffectsFromTransitionRisks', framework: 'csrd-e1', label: 'Anticipated financial effects from material transition risks', type: 'monetary', unitRef: 'EUR', decimals: 0, periodType: 'duration', balance: 'debit' }),
  c({ id: 'esrs:AnticipatedFinancialEffectsFromClimateOpportunities', framework: 'csrd-e1', label: 'Anticipated financial effects from climate-related opportunities', type: 'monetary', unitRef: 'EUR', decimals: 0, periodType: 'duration', balance: 'credit' }),
  c({ id: 'esrs:AssetsAtMaterialPhysicalRisk', framework: 'csrd-e1', label: 'Monetary amount of assets at material physical risk', type: 'monetary', unitRef: 'EUR', decimals: 0, periodType: 'instant', balance: 'debit' }),
  c({ id: 'esrs:AssetsAtMaterialTransitionRisk', framework: 'csrd-e1', label: 'Monetary amount of assets at material transition risk', type: 'monetary', unitRef: 'EUR', decimals: 0, periodType: 'instant', balance: 'debit' }),
  c({ id: 'esrs:NetRevenueFromActivitiesAlignedWithEUTaxonomy', framework: 'csrd-e1', label: 'Net revenue from activities aligned with EU Taxonomy', type: 'monetary', unitRef: 'EUR', decimals: 0, periodType: 'duration', balance: 'credit' }),
  c({ id: 'esrs:CapExAlignedWithEUTaxonomy', framework: 'csrd-e1', label: 'Capital expenditure aligned with EU Taxonomy', type: 'monetary', unitRef: 'EUR', decimals: 0, periodType: 'duration', balance: 'debit' }),
  c({ id: 'esrs:OpExAlignedWithEUTaxonomy', framework: 'csrd-e1', label: 'Operating expenditure aligned with EU Taxonomy', type: 'monetary', unitRef: 'EUR', decimals: 0, periodType: 'duration', balance: 'debit' }),

  // Narratives & boundary
  c({ id: 'esrs:OrganisationalBoundariesGHGProtocol', framework: 'csrd-e1', label: 'Organisational boundaries applied (GHG Protocol)', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:GWPValuesAndSource', framework: 'csrd-e1', label: 'GWP values and source applied', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:ConsolidationApproach', framework: 'csrd-e1', label: 'Consolidation approach (operational / equity / financial control)', type: 'enum', periodType: 'duration' }),
  c({ id: 'esrs:ScenarioAnalysisAppliedClimate', framework: 'csrd-e1', label: 'Whether scenario analysis was applied for climate', type: 'boolean', periodType: 'duration' }),
  c({ id: 'esrs:ClimateRelatedScenariosUsed', framework: 'csrd-e1', label: 'Climate-related scenarios used', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:ClimateGovernanceOversight', framework: 'csrd-e1', label: 'Climate governance and board oversight', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:ResilienceOfStrategyAndBusinessModelToClimate', framework: 'csrd-e1', label: 'Resilience of strategy and business model to climate change', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:LocationBasedScope2EmissionFactorSource', framework: 'csrd-e1', label: 'Source of location-based Scope 2 emission factors', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:MarketBasedScope2EmissionFactorSource', framework: 'csrd-e1', label: 'Source of market-based Scope 2 emission factors (residual mix, supplier-specific)', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:ContractualInstrumentsForMarketBasedScope2', framework: 'csrd-e1', label: 'Contractual instruments used (PPAs, RECs, GoOs) for market-based Scope 2', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:Scope3CategoriesIncluded', framework: 'csrd-e1', label: 'Scope 3 categories included in the inventory', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:Scope3MethodologyAndAssumptions', framework: 'csrd-e1', label: 'Scope 3 methodology and assumptions', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:VerificationOrAssuranceOfGHGEmissions', framework: 'csrd-e1', label: 'Verification or assurance of GHG emissions', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:BaseYearForGHGEmissions', framework: 'csrd-e1', label: 'Base year for GHG emissions targets', type: 'date', periodType: 'instant' }),
  c({ id: 'esrs:GHGEmissionsReductionTarget2030', framework: 'csrd-e1', label: 'GHG emissions reduction target for 2030 (vs. base year)', type: 'percent', unitRef: 'percent', decimals: 1, periodType: 'duration', validators: ['percentage_range'] }),
  c({ id: 'esrs:GHGEmissionsReductionTarget2050', framework: 'csrd-e1', label: 'GHG emissions reduction target for 2050 (vs. base year)', type: 'percent', unitRef: 'percent', decimals: 1, periodType: 'duration', validators: ['percentage_range'] }),
]

// ─────────────────────────────────────────────────────────────────────
// ESRS E2 — Pollution (~10)
// ─────────────────────────────────────────────────────────────────────

const ESRS_E2: XbrlConcept[] = [
  c({ id: 'esrs:PoliciesRelatedToPollution', framework: 'csrd-e2', label: 'Policies related to pollution', type: 'string', periodType: 'duration', references: [{ source: 'ESRS E2-1', paragraph: '14' }] }),
  c({ id: 'esrs:ActionsAndResourcesRelatedToPollution', framework: 'csrd-e2', label: 'Actions and resources related to pollution', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:TargetsRelatedToPollution', framework: 'csrd-e2', label: 'Targets related to pollution', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:EmissionsOfPollutantsToAir', framework: 'csrd-e2', label: 'Emissions of pollutants to air', type: 'numeric', unitRef: 'kg', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:EmissionsOfPollutantsToWater', framework: 'csrd-e2', label: 'Emissions of pollutants to water', type: 'numeric', unitRef: 'kg', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:EmissionsOfPollutantsToSoil', framework: 'csrd-e2', label: 'Emissions of pollutants to soil', type: 'numeric', unitRef: 'kg', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:SubstancesOfConcernGenerated', framework: 'csrd-e2', label: 'Substances of concern generated or used', type: 'numeric', unitRef: 'kg', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:SubstancesOfVeryHighConcernGenerated', framework: 'csrd-e2', label: 'Substances of very high concern generated or used', type: 'numeric', unitRef: 'kg', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:MicroplasticsGeneratedOrUsed', framework: 'csrd-e2', label: 'Microplastics generated or used', type: 'numeric', unitRef: 'kg', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:AnticipatedFinancialEffectsFromPollution', framework: 'csrd-e2', label: 'Anticipated financial effects from pollution-related risks', type: 'monetary', unitRef: 'EUR', decimals: 0, periodType: 'duration' }),
]

// ─────────────────────────────────────────────────────────────────────
// ESRS E3 — Water (~10)
// ─────────────────────────────────────────────────────────────────────

const ESRS_E3: XbrlConcept[] = [
  c({ id: 'esrs:PoliciesRelatedToWaterAndMarineResources', framework: 'csrd-e3', label: 'Policies related to water and marine resources', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:WaterTargets', framework: 'csrd-e3', label: 'Water-related targets', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:TotalWaterWithdrawal', framework: 'csrd-e3', label: 'Total water withdrawal', type: 'numeric', unitRef: 'm3', decimals: 0, periodType: 'duration', validators: ['non_negative'], references: [{ source: 'ESRS E3-4', paragraph: '28' }] }),
  c({ id: 'esrs:WaterWithdrawalFromAreasOfWaterStress', framework: 'csrd-e3', label: 'Water withdrawal from areas of water stress', type: 'numeric', unitRef: 'm3', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:TotalWaterDischarge', framework: 'csrd-e3', label: 'Total water discharge', type: 'numeric', unitRef: 'm3', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:WaterDischargeToAreasOfWaterStress', framework: 'csrd-e3', label: 'Water discharge to areas of water stress', type: 'numeric', unitRef: 'm3', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:TotalWaterConsumption', framework: 'csrd-e3', label: 'Total water consumption', type: 'numeric', unitRef: 'm3', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:WaterConsumptionInAreasOfWaterStress', framework: 'csrd-e3', label: 'Water consumption in areas of water stress', type: 'numeric', unitRef: 'm3', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:WaterRecycledAndReused', framework: 'csrd-e3', label: 'Water recycled and reused', type: 'numeric', unitRef: 'm3', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:WaterIntensityPerNetRevenue', framework: 'csrd-e3', label: 'Water consumption intensity per net revenue', type: 'numeric', unitRef: 'pure', decimals: 4, periodType: 'duration' }),
]

// ─────────────────────────────────────────────────────────────────────
// ESRS E4 — Biodiversity (~10)
// ─────────────────────────────────────────────────────────────────────

const ESRS_E4: XbrlConcept[] = [
  c({ id: 'esrs:PoliciesRelatedToBiodiversity', framework: 'csrd-e4', label: 'Policies related to biodiversity and ecosystems', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:BiodiversityTransitionPlan', framework: 'csrd-e4', label: 'Biodiversity transition plan', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:SitesInOrNearBiodiversitySensitiveAreas', framework: 'csrd-e4', label: 'Sites in or near biodiversity-sensitive areas', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'instant', validators: ['non_negative'] }),
  c({ id: 'esrs:LandUseTotalArea', framework: 'csrd-e4', label: 'Total land use', type: 'numeric', unitRef: 'pure', decimals: 0, periodType: 'instant', validators: ['non_negative'] }),
  c({ id: 'esrs:LandUseSealedSurface', framework: 'csrd-e4', label: 'Total sealed surface area', type: 'numeric', unitRef: 'pure', decimals: 0, periodType: 'instant', validators: ['non_negative'] }),
  c({ id: 'esrs:LandUseNatureOrientedAreaOnSite', framework: 'csrd-e4', label: 'Nature-oriented area on-site', type: 'numeric', unitRef: 'pure', decimals: 0, periodType: 'instant', validators: ['non_negative'] }),
  c({ id: 'esrs:LandUseNatureOrientedAreaOffSite', framework: 'csrd-e4', label: 'Nature-oriented area off-site', type: 'numeric', unitRef: 'pure', decimals: 0, periodType: 'instant', validators: ['non_negative'] }),
  c({ id: 'esrs:NumberOfIUCNRedListSpeciesAffected', framework: 'csrd-e4', label: 'Number of IUCN Red List species affected', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'instant', validators: ['non_negative'] }),
  c({ id: 'esrs:NoNetLossAmbition', framework: 'csrd-e4', label: 'No-net-loss or net-gain ambition for biodiversity', type: 'boolean', periodType: 'instant' }),
  c({ id: 'esrs:BiodiversityOffsetsUsed', framework: 'csrd-e4', label: 'Description of biodiversity offsets used', type: 'string', periodType: 'duration' }),
]

// ─────────────────────────────────────────────────────────────────────
// ESRS E5 — Circular Economy (~10)
// ─────────────────────────────────────────────────────────────────────

const ESRS_E5: XbrlConcept[] = [
  c({ id: 'esrs:PoliciesRelatedToResourceUseAndCircularEconomy', framework: 'csrd-e5', label: 'Policies related to resource use and circular economy', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:TotalMaterialsUsedNonRenewable', framework: 'csrd-e5', label: 'Total non-renewable materials used', type: 'numeric', unitRef: 't', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:TotalMaterialsUsedRenewable', framework: 'csrd-e5', label: 'Total renewable materials used', type: 'numeric', unitRef: 't', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:RecycledContentInInflows', framework: 'csrd-e5', label: 'Percentage of recycled content in material inflows', type: 'percent', unitRef: 'percent', decimals: 1, periodType: 'duration', validators: ['percentage_range'] }),
  c({ id: 'esrs:CircularProductDesignShare', framework: 'csrd-e5', label: 'Share of products designed for circularity', type: 'percent', unitRef: 'percent', decimals: 1, periodType: 'duration', validators: ['percentage_range'] }),
  c({ id: 'esrs:TotalWasteGenerated', framework: 'csrd-e5', label: 'Total waste generated', type: 'numeric', unitRef: 't', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:WasteDivertedFromDisposal', framework: 'csrd-e5', label: 'Waste diverted from disposal', type: 'numeric', unitRef: 't', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:WasteDirectedToDisposal', framework: 'csrd-e5', label: 'Waste directed to disposal', type: 'numeric', unitRef: 't', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:HazardousWasteGenerated', framework: 'csrd-e5', label: 'Hazardous waste generated', type: 'numeric', unitRef: 't', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:RadioactiveWasteGenerated', framework: 'csrd-e5', label: 'Radioactive waste generated', type: 'numeric', unitRef: 't', decimals: 2, periodType: 'duration', validators: ['non_negative'] }),
]

// ─────────────────────────────────────────────────────────────────────
// ESRS S1 — Own Workforce (~20)
// ─────────────────────────────────────────────────────────────────────

const ESRS_S1: XbrlConcept[] = [
  c({ id: 'esrs:PoliciesRelatedToOwnWorkforce', framework: 'csrd-s1', label: 'Policies related to own workforce', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:TotalNumberOfEmployees', framework: 'csrd-s1', label: 'Total number of employees (headcount)', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'instant', required: true, validators: ['non_negative'] }),
  c({ id: 'esrs:TotalNumberOfEmployeesFTE', framework: 'csrd-s1', label: 'Total number of employees (FTE)', type: 'numeric', unitRef: 'fte', decimals: 1, periodType: 'instant', validators: ['non_negative'] }),
  c({ id: 'esrs:NumberOfFemaleEmployees', framework: 'csrd-s1', label: 'Number of female employees', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'instant', validators: ['non_negative'] }),
  c({ id: 'esrs:NumberOfMaleEmployees', framework: 'csrd-s1', label: 'Number of male employees', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'instant', validators: ['non_negative'] }),
  c({ id: 'esrs:NumberOfOtherGenderEmployees', framework: 'csrd-s1', label: 'Number of employees identifying as other gender', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'instant', validators: ['non_negative'] }),
  c({ id: 'esrs:NumberOfPermanentEmployees', framework: 'csrd-s1', label: 'Number of permanent employees', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'instant', validators: ['non_negative'] }),
  c({ id: 'esrs:NumberOfTemporaryEmployees', framework: 'csrd-s1', label: 'Number of temporary employees', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'instant', validators: ['non_negative'] }),
  c({ id: 'esrs:NumberOfNonGuaranteedHoursEmployees', framework: 'csrd-s1', label: 'Number of non-guaranteed-hours employees', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'instant', validators: ['non_negative'] }),
  c({ id: 'esrs:NewEmployeeHires', framework: 'csrd-s1', label: 'New employee hires in the reporting period', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:EmployeeTurnoverRate', framework: 'csrd-s1', label: 'Employee turnover rate', type: 'percent', unitRef: 'percent', decimals: 1, periodType: 'duration', validators: ['percentage_range'] }),
  c({ id: 'esrs:CollectiveBargainingCoverage', framework: 'csrd-s1', label: 'Collective bargaining coverage', type: 'percent', unitRef: 'percent', decimals: 1, periodType: 'instant', validators: ['percentage_range'] }),
  c({ id: 'esrs:SocialProtectionCoverage', framework: 'csrd-s1', label: 'Social protection coverage', type: 'percent', unitRef: 'percent', decimals: 1, periodType: 'instant', validators: ['percentage_range'] }),
  c({ id: 'esrs:AverageTrainingHoursPerEmployee', framework: 'csrd-s1', label: 'Average training hours per employee', type: 'numeric', unitRef: 'hours', decimals: 1, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:WorkRelatedFatalities', framework: 'csrd-s1', label: 'Work-related fatalities', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:RecordableWorkRelatedInjuries', framework: 'csrd-s1', label: 'Recordable work-related injuries', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:WorkRelatedInjuryRate', framework: 'csrd-s1', label: 'Work-related injury rate (per million hours worked)', type: 'numeric', unitRef: 'pure', decimals: 2, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:GenderPayGap', framework: 'csrd-s1', label: 'Gender pay gap', type: 'percent', unitRef: 'percent', decimals: 1, periodType: 'duration' }),
  c({ id: 'esrs:CEOToMedianPayRatio', framework: 'csrd-s1', label: 'CEO-to-median-employee pay ratio', type: 'numeric', unitRef: 'pure', decimals: 1, periodType: 'duration' }),
  c({ id: 'esrs:IncidentsOfDiscriminationReported', framework: 'csrd-s1', label: 'Incidents of discrimination reported', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
]

// ─────────────────────────────────────────────────────────────────────
// ESRS S2 — Value Chain Workers (~10)
// ─────────────────────────────────────────────────────────────────────

const ESRS_S2: XbrlConcept[] = [
  c({ id: 'esrs:PoliciesRelatedToValueChainWorkers', framework: 'csrd-s2', label: 'Policies related to value chain workers', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:HumanRightsDueDiligenceProcesses', framework: 'csrd-s2', label: 'Human rights due diligence processes', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:SuppliersAssessedForHumanRightsImpacts', framework: 'csrd-s2', label: 'Number of suppliers assessed for human rights impacts', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:SuppliersWithActualHumanRightsImpactsIdentified', framework: 'csrd-s2', label: 'Suppliers with actual human rights impacts identified', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:SevereHumanRightsIncidentsValueChain', framework: 'csrd-s2', label: 'Severe human rights incidents in the value chain', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:RemediationProvidedToAffectedValueChainWorkers', framework: 'csrd-s2', label: 'Remediation provided to affected value chain workers', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:GrievanceMechanismsForValueChainWorkers', framework: 'csrd-s2', label: 'Grievance mechanisms available to value chain workers', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:LivingWageMonitoringInValueChain', framework: 'csrd-s2', label: 'Living wage monitoring in the value chain', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:ChildLabourRiskAssessment', framework: 'csrd-s2', label: 'Child-labour risk assessment in the value chain', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:ForcedLabourRiskAssessment', framework: 'csrd-s2', label: 'Forced-labour risk assessment in the value chain', type: 'string', periodType: 'duration' }),
]

// ─────────────────────────────────────────────────────────────────────
// ESRS S3 — Communities (~10)
// ─────────────────────────────────────────────────────────────────────

const ESRS_S3: XbrlConcept[] = [
  c({ id: 'esrs:PoliciesRelatedToAffectedCommunities', framework: 'csrd-s3', label: 'Policies related to affected communities', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:CommunityEngagementProcesses', framework: 'csrd-s3', label: 'Community engagement processes', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:GrievanceMechanismsCommunities', framework: 'csrd-s3', label: 'Grievance mechanisms for affected communities', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:CommunityIncidentsReported', framework: 'csrd-s3', label: 'Community incidents reported', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:IndigenousPeoplesEngagement', framework: 'csrd-s3', label: 'Indigenous peoples engagement and FPIC processes', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:CommunityResettlements', framework: 'csrd-s3', label: 'Community resettlements during reporting period', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:CommunityInvestmentSpend', framework: 'csrd-s3', label: 'Community investment spend', type: 'monetary', unitRef: 'EUR', decimals: 0, periodType: 'duration', balance: 'debit' }),
  c({ id: 'esrs:HumanRightsImpactAssessmentsConducted', framework: 'csrd-s3', label: 'Human rights impact assessments conducted', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:RemediationProvidedToCommunities', framework: 'csrd-s3', label: 'Remediation provided to affected communities', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:LandRightsConflicts', framework: 'csrd-s3', label: 'Land rights conflicts identified', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
]

// ─────────────────────────────────────────────────────────────────────
// ESRS S4 — Consumers (~10)
// ─────────────────────────────────────────────────────────────────────

const ESRS_S4: XbrlConcept[] = [
  c({ id: 'esrs:PoliciesRelatedToConsumersAndEndUsers', framework: 'csrd-s4', label: 'Policies related to consumers and end-users', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:ProductSafetyIncidents', framework: 'csrd-s4', label: 'Product safety incidents reported', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:ProductRecalls', framework: 'csrd-s4', label: 'Product recalls during reporting period', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:DataPrivacyBreaches', framework: 'csrd-s4', label: 'Data privacy breaches affecting consumers', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:AffectedDataSubjects', framework: 'csrd-s4', label: 'Number of affected data subjects', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:CustomerComplaintsResolved', framework: 'csrd-s4', label: 'Customer complaints resolved', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:ResponsibleMarketingPractices', framework: 'csrd-s4', label: 'Responsible marketing practices', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:VulnerableConsumerProtectionPolicies', framework: 'csrd-s4', label: 'Vulnerable consumer protection policies', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:AccessibilityOfProductsAndServices', framework: 'csrd-s4', label: 'Accessibility of products and services', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:ConsumerGrievanceMechanisms', framework: 'csrd-s4', label: 'Consumer grievance mechanisms', type: 'string', periodType: 'duration' }),
]

// ─────────────────────────────────────────────────────────────────────
// ESRS G1 — Governance / Business Conduct (~15)
// ─────────────────────────────────────────────────────────────────────

const ESRS_G1: XbrlConcept[] = [
  c({ id: 'esrs:BusinessConductPolicies', framework: 'csrd-g1', label: 'Business conduct policies', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:AntiCorruptionPolicies', framework: 'csrd-g1', label: 'Anti-corruption and anti-bribery policies', type: 'string', periodType: 'duration', required: true }),
  c({ id: 'esrs:AntiCorruptionTrainingCoverage', framework: 'csrd-g1', label: 'Anti-corruption training coverage of workforce', type: 'percent', unitRef: 'percent', decimals: 1, periodType: 'duration', validators: ['percentage_range'] }),
  c({ id: 'esrs:ConfirmedIncidentsOfCorruption', framework: 'csrd-g1', label: 'Confirmed incidents of corruption', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:LegalActionsForCorruption', framework: 'csrd-g1', label: 'Legal actions for corruption against the entity or employees', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:WhistleblowerMechanism', framework: 'csrd-g1', label: 'Whistleblower mechanism description', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:WhistleblowerReportsReceived', framework: 'csrd-g1', label: 'Whistleblower reports received', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:FinesForCorruption', framework: 'csrd-g1', label: 'Fines paid or payable for corruption', type: 'monetary', unitRef: 'EUR', decimals: 0, periodType: 'duration', balance: 'debit' }),
  c({ id: 'esrs:PoliticalContributions', framework: 'csrd-g1', label: 'Total political contributions made', type: 'monetary', unitRef: 'EUR', decimals: 0, periodType: 'duration', balance: 'debit' }),
  c({ id: 'esrs:LobbyingExpenditure', framework: 'csrd-g1', label: 'Lobbying expenditure', type: 'monetary', unitRef: 'EUR', decimals: 0, periodType: 'duration', balance: 'debit' }),
  c({ id: 'esrs:AverageDaysToPaySuppliers', framework: 'csrd-g1', label: 'Average days to pay suppliers', type: 'numeric', unitRef: 'pure', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:PercentageOfInvoicesPaidLate', framework: 'csrd-g1', label: 'Percentage of invoices paid late', type: 'percent', unitRef: 'percent', decimals: 1, periodType: 'duration', validators: ['percentage_range'] }),
  c({ id: 'esrs:LegalProceedingsForLatePayment', framework: 'csrd-g1', label: 'Legal proceedings for late payment', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'esrs:CorporateCultureDescription', framework: 'csrd-g1', label: 'Description of corporate culture', type: 'string', periodType: 'duration' }),
  c({ id: 'esrs:BoardDiversityPercentage', framework: 'csrd-g1', label: 'Board gender diversity percentage', type: 'percent', unitRef: 'percent', decimals: 1, periodType: 'instant', validators: ['percentage_range'] }),
]

// ─────────────────────────────────────────────────────────────────────
// ISSB IFRS S1 / S2 (~30)
// ─────────────────────────────────────────────────────────────────────

const ISSB: XbrlConcept[] = [
  // S1 General
  c({ id: 'ifrs-full:GovernanceProcessesControlsAndProceduresUsedToMonitorAndManageSustainabilityRelatedRisksAndOpportunities', framework: 'issb-s1', label: 'Governance processes, controls and procedures used to monitor sustainability-related risks and opportunities', type: 'string', periodType: 'duration' }),
  c({ id: 'ifrs-full:DescriptionOfSustainabilityRelatedRisksAndOpportunities', framework: 'issb-s1', label: 'Description of sustainability-related risks and opportunities', type: 'string', periodType: 'duration' }),
  c({ id: 'ifrs-full:ImpactsOfSustainabilityRelatedRisksAndOpportunitiesOnStrategy', framework: 'issb-s1', label: 'Impacts of sustainability-related risks and opportunities on strategy', type: 'string', periodType: 'duration' }),
  c({ id: 'ifrs-full:ProcessUsedToIdentifyAssessAndManageSustainabilityRelatedRisks', framework: 'issb-s1', label: 'Process used to identify, assess and manage sustainability-related risks', type: 'string', periodType: 'duration' }),
  c({ id: 'ifrs-full:MetricsUsedToMeasureSustainabilityPerformance', framework: 'issb-s1', label: 'Metrics used to measure sustainability performance', type: 'string', periodType: 'duration' }),
  c({ id: 'ifrs-full:SustainabilityRelatedTargets', framework: 'issb-s1', label: 'Sustainability-related targets', type: 'string', periodType: 'duration' }),

  // S2 Climate
  c({ id: 'ifrs-full:GovernanceBodyResponsibleForClimateRisksAndOpportunities', framework: 'issb-s2', label: 'Governance body or individual responsible for climate-related risks and opportunities', type: 'string', periodType: 'duration', required: true }),
  c({ id: 'ifrs-full:ClimateRelatedRisksDescription', framework: 'issb-s2', label: 'Description of climate-related risks', type: 'string', periodType: 'duration' }),
  c({ id: 'ifrs-full:ClimateRelatedOpportunitiesDescription', framework: 'issb-s2', label: 'Description of climate-related opportunities', type: 'string', periodType: 'duration' }),
  c({ id: 'ifrs-full:ClimateResilienceAssessment', framework: 'issb-s2', label: 'Climate resilience assessment (incl. scenario analysis)', type: 'string', periodType: 'duration' }),
  c({ id: 'ifrs-full:TransitionPlanDisclosure', framework: 'issb-s2', label: 'Transition plan disclosure (IFRS S2)', type: 'string', periodType: 'duration' }),
  c({ id: 'ifrs-full:ScenarioAnalysisInputs', framework: 'issb-s2', label: 'Inputs and assumptions used in scenario analysis', type: 'string', periodType: 'duration' }),
  c({ id: 'ifrs-full:GrossScope1GHGEmissionsIFRS', framework: 'issb-s2', label: 'Gross Scope 1 GHG emissions (IFRS S2)', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', required: true, validators: ['non_negative', 'plausible_emissions'] }),
  c({ id: 'ifrs-full:GrossScope2GHGEmissionsIFRS', framework: 'issb-s2', label: 'Gross Scope 2 GHG emissions (IFRS S2, location-based)', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', required: true, validators: ['non_negative', 'plausible_emissions'] }),
  c({ id: 'ifrs-full:GrossScope3GHGEmissionsIFRS', framework: 'issb-s2', label: 'Gross Scope 3 GHG emissions (IFRS S2)', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative', 'plausible_emissions'] }),
  c({ id: 'ifrs-full:Scope3CategoriesIncludedIFRS', framework: 'issb-s2', label: 'Scope 3 categories included (IFRS S2)', type: 'string', periodType: 'duration' }),
  c({ id: 'ifrs-full:GHGEmissionsIntensityIFRS', framework: 'issb-s2', label: 'GHG emissions intensity (IFRS S2)', type: 'numeric', unitRef: 'pure', decimals: 4, periodType: 'duration' }),
  c({ id: 'ifrs-full:GHGProtocolApplied', framework: 'issb-s2', label: 'GHG Protocol applied', type: 'enum', periodType: 'duration' }),
  c({ id: 'ifrs-full:GHGReductionTargetsIFRS', framework: 'issb-s2', label: 'GHG reduction targets (IFRS S2)', type: 'string', periodType: 'duration' }),
  c({ id: 'ifrs-full:AmountOfCapitalDeployedForClimateRisksAndOpportunities', framework: 'issb-s2', label: 'Amount of capital deployed toward climate-related risks and opportunities', type: 'monetary', unitRef: 'USD', decimals: 0, periodType: 'duration' }),
  c({ id: 'ifrs-full:AssetsVulnerableToPhysicalRisks', framework: 'issb-s2', label: 'Assets vulnerable to physical risks', type: 'monetary', unitRef: 'USD', decimals: 0, periodType: 'instant' }),
  c({ id: 'ifrs-full:AssetsVulnerableToTransitionRisks', framework: 'issb-s2', label: 'Assets vulnerable to transition risks', type: 'monetary', unitRef: 'USD', decimals: 0, periodType: 'instant' }),
  c({ id: 'ifrs-full:RemunerationLinkedToClimate', framework: 'issb-s2', label: 'Whether remuneration is linked to climate-related considerations', type: 'boolean', periodType: 'instant' }),
  c({ id: 'ifrs-full:InternalCarbonPriceIFRS', framework: 'issb-s2', label: 'Internal carbon price (IFRS S2)', type: 'monetary', unitRef: 'USD', decimals: 2, periodType: 'instant' }),
  c({ id: 'ifrs-full:OffsetsUsedToMeetTargets', framework: 'issb-s2', label: 'Use of carbon offsets to meet targets', type: 'string', periodType: 'duration' }),
  c({ id: 'ifrs-full:BaseYearGHGEmissionsIFRS', framework: 'issb-s2', label: 'Base year GHG emissions (IFRS S2)', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'instant', validators: ['non_negative'] }),
  c({ id: 'ifrs-full:ProgressTowardsClimateTargets', framework: 'issb-s2', label: 'Progress toward climate targets', type: 'string', periodType: 'duration' }),
  c({ id: 'ifrs-full:CrossIndustryMetricApplied', framework: 'issb-s2', label: 'Cross-industry metric category applied', type: 'string', periodType: 'duration' }),
  c({ id: 'ifrs-full:IndustryBasedClimateMetrics', framework: 'issb-s2', label: 'Industry-based climate metrics', type: 'string', periodType: 'duration' }),
  c({ id: 'ifrs-full:ConnectionsBetweenClimateDataAndFinancialStatements', framework: 'issb-s2', label: 'Connections between climate data and financial statements', type: 'string', periodType: 'duration' }),
]

// ─────────────────────────────────────────────────────────────────────
// SEC Climate (~25)
// ─────────────────────────────────────────────────────────────────────

const SEC_CLIMATE: XbrlConcept[] = [
  c({ id: 'us-gaap:MaterialClimateRisksDescription', framework: 'sec-climate', label: 'Description of material climate-related risks', type: 'string', periodType: 'duration', required: true }),
  c({ id: 'us-gaap:PhysicalClimateRisks', framework: 'sec-climate', label: 'Physical climate-related risks', type: 'string', periodType: 'duration' }),
  c({ id: 'us-gaap:TransitionClimateRisks', framework: 'sec-climate', label: 'Transition climate-related risks', type: 'string', periodType: 'duration' }),
  c({ id: 'us-gaap:BoardOversightOfClimateRisks', framework: 'sec-climate', label: 'Board oversight of climate-related risks', type: 'string', periodType: 'duration' }),
  c({ id: 'us-gaap:ManagementRoleInClimateRisks', framework: 'sec-climate', label: 'Management role in assessing and managing climate risks', type: 'string', periodType: 'duration' }),
  c({ id: 'us-gaap:ClimateRiskManagementProcesses', framework: 'sec-climate', label: 'Climate risk management processes', type: 'string', periodType: 'duration' }),
  c({ id: 'us-gaap:ClimateTargetsAndGoals', framework: 'sec-climate', label: 'Climate-related targets and goals', type: 'string', periodType: 'duration' }),
  c({ id: 'us-gaap:Scope1Emissions', framework: 'sec-climate', label: 'Scope 1 GHG emissions (SEC)', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative', 'plausible_emissions'] }),
  c({ id: 'us-gaap:Scope2Emissions', framework: 'sec-climate', label: 'Scope 2 GHG emissions (SEC, location-based)', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative', 'plausible_emissions'] }),
  c({ id: 'us-gaap:Scope2EmissionsMarketBased', framework: 'sec-climate', label: 'Scope 2 GHG emissions (SEC, market-based)', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative', 'plausible_emissions'] }),
  c({ id: 'us-gaap:ClimateImpactOnFinancialStatements', framework: 'sec-climate', label: 'Climate impact on financial statements', type: 'string', periodType: 'duration' }),
  c({ id: 'us-gaap:SevereWeatherEventCosts', framework: 'sec-climate', label: 'Costs associated with severe weather events', type: 'monetary', unitRef: 'USD', decimals: 0, periodType: 'duration', balance: 'debit' }),
  c({ id: 'us-gaap:SevereWeatherEventLosses', framework: 'sec-climate', label: 'Losses associated with severe weather events', type: 'monetary', unitRef: 'USD', decimals: 0, periodType: 'duration', balance: 'debit' }),
  c({ id: 'us-gaap:CarbonOffsetExpenditure', framework: 'sec-climate', label: 'Expenditure on carbon offsets', type: 'monetary', unitRef: 'USD', decimals: 0, periodType: 'duration', balance: 'debit' }),
  c({ id: 'us-gaap:RenewableEnergyCertificatesExpenditure', framework: 'sec-climate', label: 'Expenditure on renewable energy certificates', type: 'monetary', unitRef: 'USD', decimals: 0, periodType: 'duration', balance: 'debit' }),
  c({ id: 'us-gaap:CapitalizedCostsClimateMitigation', framework: 'sec-climate', label: 'Capitalized costs related to climate mitigation', type: 'monetary', unitRef: 'USD', decimals: 0, periodType: 'duration', balance: 'debit' }),
  c({ id: 'us-gaap:ExpenseClimateMitigation', framework: 'sec-climate', label: 'Expense related to climate mitigation', type: 'monetary', unitRef: 'USD', decimals: 0, periodType: 'duration', balance: 'debit' }),
  c({ id: 'us-gaap:TransitionPlanSEC', framework: 'sec-climate', label: 'Transition plan disclosure (SEC)', type: 'string', periodType: 'duration' }),
  c({ id: 'us-gaap:ClimateRelatedScenarioAnalysisSEC', framework: 'sec-climate', label: 'Climate-related scenario analysis (SEC)', type: 'string', periodType: 'duration' }),
  c({ id: 'us-gaap:InternalCarbonPriceSEC', framework: 'sec-climate', label: 'Internal carbon price (SEC)', type: 'monetary', unitRef: 'USD', decimals: 2, periodType: 'instant' }),
  c({ id: 'us-gaap:CarbonOffsetsUsedTowardsTargetsSEC', framework: 'sec-climate', label: 'Carbon offsets used towards climate targets (SEC)', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'us-gaap:AssuranceLevelForGHG', framework: 'sec-climate', label: 'Assurance level for GHG emissions (limited / reasonable)', type: 'enum', periodType: 'duration' }),
  c({ id: 'us-gaap:AssuranceProviderName', framework: 'sec-climate', label: 'Name of GHG assurance provider', type: 'string', periodType: 'duration' }),
  c({ id: 'us-gaap:ClimateRelatedExpendituresTotal', framework: 'sec-climate', label: 'Total climate-related expenditures', type: 'monetary', unitRef: 'USD', decimals: 0, periodType: 'duration', balance: 'debit' }),
  c({ id: 'us-gaap:LargeAcceleratedFilerStatus', framework: 'sec-climate', label: 'Large accelerated filer status (for SEC phase-in)', type: 'boolean', periodType: 'instant' }),
]

// ─────────────────────────────────────────────────────────────────────
// GRI (~20)
// ─────────────────────────────────────────────────────────────────────

const GRI: XbrlConcept[] = [
  // GRI 2 — General Disclosures
  c({ id: 'gri:OrganizationalDetails', framework: 'gri', label: 'GRI 2-1 Organizational details', type: 'string', periodType: 'duration' }),
  c({ id: 'gri:EntitiesIncludedInReporting', framework: 'gri', label: 'GRI 2-2 Entities included in sustainability reporting', type: 'string', periodType: 'duration' }),
  c({ id: 'gri:ReportingPeriod', framework: 'gri', label: 'GRI 2-3 Reporting period, frequency and contact point', type: 'string', periodType: 'duration' }),
  c({ id: 'gri:GovernanceStructure', framework: 'gri', label: 'GRI 2-9 Governance structure and composition', type: 'string', periodType: 'duration' }),

  // GRI 303 — Water
  c({ id: 'gri:WaterWithdrawal', framework: 'gri', label: 'GRI 303-3 Water withdrawal', type: 'numeric', unitRef: 'm3', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'gri:WaterDischarge', framework: 'gri', label: 'GRI 303-4 Water discharge', type: 'numeric', unitRef: 'm3', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'gri:WaterConsumption', framework: 'gri', label: 'GRI 303-5 Water consumption', type: 'numeric', unitRef: 'm3', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),

  // GRI 305 — Emissions
  c({ id: 'gri:DirectGHGEmissionsScope1', framework: 'gri', label: 'GRI 305-1 Direct (Scope 1) GHG emissions', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', required: true, validators: ['non_negative', 'plausible_emissions'] }),
  c({ id: 'gri:EnergyIndirectGHGEmissionsScope2', framework: 'gri', label: 'GRI 305-2 Energy indirect (Scope 2) GHG emissions', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', required: true, validators: ['non_negative', 'plausible_emissions'] }),
  c({ id: 'gri:OtherIndirectGHGEmissionsScope3', framework: 'gri', label: 'GRI 305-3 Other indirect (Scope 3) GHG emissions', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration', validators: ['non_negative', 'plausible_emissions'] }),
  c({ id: 'gri:GHGEmissionsIntensity', framework: 'gri', label: 'GRI 305-4 GHG emissions intensity', type: 'numeric', unitRef: 'pure', decimals: 4, periodType: 'duration' }),
  c({ id: 'gri:ReductionOfGHGEmissions', framework: 'gri', label: 'GRI 305-5 Reduction of GHG emissions', type: 'numeric', unitRef: 'tCO2e', decimals: 0, periodType: 'duration' }),
  c({ id: 'gri:OzoneDepletingSubstancesEmissions', framework: 'gri', label: 'GRI 305-6 Emissions of ozone-depleting substances (ODS)', type: 'numeric', unitRef: 'kg', decimals: 2, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'gri:NOxSOxAndOtherAirEmissions', framework: 'gri', label: 'GRI 305-7 NOx, SOx and other significant air emissions', type: 'numeric', unitRef: 'kg', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),

  // GRI 401 — Employment
  c({ id: 'gri:NewEmployeeHiresGRI', framework: 'gri', label: 'GRI 401-1 New employee hires and employee turnover', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),
  c({ id: 'gri:ParentalLeave', framework: 'gri', label: 'GRI 401-3 Parental leave', type: 'string', periodType: 'duration' }),

  // GRI 403 — H&S
  c({ id: 'gri:OccupationalHealthAndSafetyManagementSystem', framework: 'gri', label: 'GRI 403-1 Occupational health and safety management system', type: 'string', periodType: 'duration' }),
  c({ id: 'gri:WorkRelatedInjuriesGRI', framework: 'gri', label: 'GRI 403-9 Work-related injuries', type: 'numeric', unitRef: 'count', decimals: 0, periodType: 'duration', validators: ['non_negative'] }),

  // GRI 404 — Training
  c({ id: 'gri:AverageHoursOfTraining', framework: 'gri', label: 'GRI 404-1 Average hours of training per year per employee', type: 'numeric', unitRef: 'hours', decimals: 1, periodType: 'duration', validators: ['non_negative'] }),

  // GRI 405 — Diversity
  c({ id: 'gri:DiversityOfGovernanceAndEmployees', framework: 'gri', label: 'GRI 405-1 Diversity of governance bodies and employees', type: 'string', periodType: 'duration' }),
]

// ─────────────────────────────────────────────────────────────────────
// EU Taxonomy (~10)
// ─────────────────────────────────────────────────────────────────────

const EU_TAX: XbrlConcept[] = [
  c({ id: 'eu-tax:TurnoverEligibility', framework: 'eu-taxonomy', label: 'Turnover eligible under EU Taxonomy', type: 'percent', unitRef: 'percent', decimals: 2, periodType: 'duration', validators: ['percentage_range'] }),
  c({ id: 'eu-tax:TurnoverAlignment', framework: 'eu-taxonomy', label: 'Turnover aligned with EU Taxonomy', type: 'percent', unitRef: 'percent', decimals: 2, periodType: 'duration', validators: ['percentage_range'], required: true }),
  c({ id: 'eu-tax:CapExEligibility', framework: 'eu-taxonomy', label: 'CapEx eligible under EU Taxonomy', type: 'percent', unitRef: 'percent', decimals: 2, periodType: 'duration', validators: ['percentage_range'] }),
  c({ id: 'eu-tax:CapExAlignment', framework: 'eu-taxonomy', label: 'CapEx aligned with EU Taxonomy', type: 'percent', unitRef: 'percent', decimals: 2, periodType: 'duration', validators: ['percentage_range'] }),
  c({ id: 'eu-tax:OpExEligibility', framework: 'eu-taxonomy', label: 'OpEx eligible under EU Taxonomy', type: 'percent', unitRef: 'percent', decimals: 2, periodType: 'duration', validators: ['percentage_range'] }),
  c({ id: 'eu-tax:OpExAlignment', framework: 'eu-taxonomy', label: 'OpEx aligned with EU Taxonomy', type: 'percent', unitRef: 'percent', decimals: 2, periodType: 'duration', validators: ['percentage_range'] }),
  c({ id: 'eu-tax:DNSHAssessment', framework: 'eu-taxonomy', label: 'Do-No-Significant-Harm (DNSH) assessment', type: 'string', periodType: 'duration' }),
  c({ id: 'eu-tax:MinimumSafeguardsAlignment', framework: 'eu-taxonomy', label: 'Minimum safeguards alignment', type: 'string', periodType: 'duration' }),
  c({ id: 'eu-tax:GreenAssetRatio', framework: 'eu-taxonomy', label: 'Green Asset Ratio (financial institutions)', type: 'percent', unitRef: 'percent', decimals: 2, periodType: 'instant', validators: ['percentage_range'] }),
  c({ id: 'eu-tax:NuclearAndFossilGasAlignment', framework: 'eu-taxonomy', label: 'Nuclear and fossil-gas alignment disclosures', type: 'string', periodType: 'duration' }),
]

// ─────────────────────────────────────────────────────────────────────
// Roll-up
// ─────────────────────────────────────────────────────────────────────

export const XBRL_CONCEPTS: XbrlConcept[] = [
  ...ESRS_E1,
  ...ESRS_E2,
  ...ESRS_E3,
  ...ESRS_E4,
  ...ESRS_E5,
  ...ESRS_S1,
  ...ESRS_S2,
  ...ESRS_S3,
  ...ESRS_S4,
  ...ESRS_G1,
  ...ISSB,
  ...SEC_CLIMATE,
  ...GRI,
  ...EU_TAX,
]

const BY_ID = new Map(XBRL_CONCEPTS.map(c => [c.id, c]))

export function getConceptById(id: string): XbrlConcept | undefined {
  return BY_ID.get(id)
}

export function getConceptsForFramework(framework: string): XbrlConcept[] {
  return XBRL_CONCEPTS.filter(c => c.framework === framework)
}

export function getRequiredConceptsForFramework(framework: string): XbrlConcept[] {
  return XBRL_CONCEPTS.filter(c => c.framework === framework && c.required)
}

export function countByNamespace(): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const c of XBRL_CONCEPTS) {
    counts[c.namespace] = (counts[c.namespace] ?? 0) + 1
  }
  return counts
}

/**
 * Heuristic mapping from a (framework, gri_code, line_item) tuple to a
 * concept id — used when `questionnaire_item.xbrl_concept_id` is null. Lets
 * us light up tagging on existing seeds without backfilling the column.
 */
export function inferConceptId(framework: string, griCode: string, lineItem: string): string | undefined {
  const fw = framework.toLowerCase()
  const code = griCode.toUpperCase()
  const li = lineItem.toLowerCase()

  // Direct GRI 305 mapping
  if (fw === 'gri') {
    if (code === '305-1') return 'gri:DirectGHGEmissionsScope1'
    if (code === '305-2') return 'gri:EnergyIndirectGHGEmissionsScope2'
    if (code === '305-3') return 'gri:OtherIndirectGHGEmissionsScope3'
    if (code === '305-4') return 'gri:GHGEmissionsIntensity'
    if (code === '305-5') return 'gri:ReductionOfGHGEmissions'
    if (code === '305-6') return 'gri:OzoneDepletingSubstancesEmissions'
    if (code === '305-7') return 'gri:NOxSOxAndOtherAirEmissions'
    if (code === '303-3') return 'gri:WaterWithdrawal'
    if (code === '303-4') return 'gri:WaterDischarge'
    if (code === '303-5') return 'gri:WaterConsumption'
    if (code === '401-1') return 'gri:NewEmployeeHiresGRI'
    if (code === '403-9') return 'gri:WorkRelatedInjuriesGRI'
    if (code === '404-1') return 'gri:AverageHoursOfTraining'
  }

  // ESRS E1
  if (fw === 'csrd-e1') {
    if (code === 'E1-1' || li.includes('transition plan')) return 'esrs:TransitionPlanForClimateChangeMitigation'
    if (code === 'E1-2' || li.includes('polic')) return 'esrs:PoliciesRelatedToClimateChangeMitigationAndAdaptation'
    if (code === 'E1-4' || li.includes('target')) return 'esrs:TargetsRelatedToClimateChangeMitigationAndAdaptation'
    if (code.startsWith('E1-5') || li.includes('energy consumption')) return 'esrs:TotalEnergyConsumption'
    if (code.startsWith('E1-6') || code === '305-1') return 'esrs:GrossScope1GreenhouseGasEmissions'
    if (code === '305-2' && li.includes('market')) return 'esrs:GrossMarketBasedScope2GreenhouseGasEmissions'
    if (code === '305-2') return 'esrs:GrossLocationBasedScope2GreenhouseGasEmissions'
    if (code === '305-3') return 'esrs:GrossScope3GreenhouseGasEmissions'
    if (code === 'E1-7' || li.includes('removal')) return 'esrs:GHGRemovalsAndStorageInOwnOperations'
    if (code === 'E1-8' || li.includes('internal carbon price')) return 'esrs:InternalCarbonPriceApplied'
  }

  // ISSB
  if (fw === 'issb-s2') {
    if (code === '305-1' || li.includes('scope 1')) return 'ifrs-full:GrossScope1GHGEmissionsIFRS'
    if (code === '305-2' || li.includes('scope 2')) return 'ifrs-full:GrossScope2GHGEmissionsIFRS'
    if (code === '305-3' || li.includes('scope 3')) return 'ifrs-full:GrossScope3GHGEmissionsIFRS'
  }

  // SEC
  if (fw === 'sec-climate') {
    if (li.includes('scope 1')) return 'us-gaap:Scope1Emissions'
    if (li.includes('scope 2')) return 'us-gaap:Scope2Emissions'
  }

  // ESRS S1
  if (fw === 'csrd-s1') {
    if (li.includes('headcount') || li.includes('total employees')) return 'esrs:TotalNumberOfEmployees'
    if (li.includes('fte')) return 'esrs:TotalNumberOfEmployeesFTE'
    if (li.includes('turnover')) return 'esrs:EmployeeTurnoverRate'
    if (li.includes('pay gap')) return 'esrs:GenderPayGap'
    if (li.includes('injuries')) return 'esrs:RecordableWorkRelatedInjuries'
    if (li.includes('fatalit')) return 'esrs:WorkRelatedFatalities'
  }

  // ESRS E3
  if (fw === 'csrd-e3') {
    if (li.includes('withdrawal')) return 'esrs:TotalWaterWithdrawal'
    if (li.includes('discharge')) return 'esrs:TotalWaterDischarge'
    if (li.includes('consumption')) return 'esrs:TotalWaterConsumption'
  }

  // EU Tax
  if (fw === 'eu-taxonomy') {
    if (li.includes('turnover') && li.includes('align')) return 'eu-tax:TurnoverAlignment'
    if (li.includes('capex') && li.includes('align')) return 'eu-tax:CapExAlignment'
    if (li.includes('opex') && li.includes('align')) return 'eu-tax:OpExAlignment'
  }

  return undefined
}

/**
 * XBRL namespace declarations, keyed by short prefix.
 */
export const NAMESPACES: Record<string, string> = {
  xhtml: 'http://www.w3.org/1999/xhtml',
  ix: 'http://www.xbrl.org/2013/inlineXBRL',
  ixt: 'http://www.xbrl.org/inlineXBRL/transformation/2020-02-12',
  xbrli: 'http://www.xbrl.org/2003/instance',
  xbrldi: 'http://xbrl.org/2006/xbrldi',
  link: 'http://www.xbrl.org/2003/linkbase',
  xlink: 'http://www.w3.org/1999/xlink',
  iso4217: 'http://www.xbrl.org/2003/iso4217',
  esrs: 'http://xbrl.efrag.org/taxonomy/esrs/2024',
  'ifrs-full': 'http://xbrl.ifrs.org/taxonomy/2024-03-27/ifrs-full',
  'us-gaap': 'http://fasb.org/us-gaap/2024',
  gri: 'http://xbrl.globalreporting.org/gri',
  'eu-tax': 'http://xbrl.eu/taxonomy/2024',
}

export const SCHEMA_REFS: Record<string, string> = {
  esrs: 'http://xbrl.efrag.org/taxonomy/esrs/2024/esrs_all.xsd',
  'ifrs-full': 'http://xbrl.ifrs.org/taxonomy/2024-03-27/depr_entire_ifrs-full_2024-03-27.xsd',
  'us-gaap': 'http://xbrl.fasb.org/us-gaap/2024/elts/us-gaap-2024.xsd',
  gri: 'http://xbrl.globalreporting.org/gri/gri-all-2024.xsd',
  'eu-tax': 'http://xbrl.eu/taxonomy/2024/eu-tax-all.xsd',
}
