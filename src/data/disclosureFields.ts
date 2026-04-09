// ---------------------------------------------------------------------------
// Disclosure‑level field definitions for structured data entry
// Each reporting framework disclosure maps to a template of typed fields.
// Auto‑populated fields are read‑only and sourced from calculators.
// ---------------------------------------------------------------------------

export interface DisclosureField {
  key: string
  label: string
  type: 'number' | 'text' | 'textarea' | 'select' | 'boolean' | 'auto'
  unit?: string
  options?: string[]
  placeholder?: string
  autoSource?: string // e.g. 'calculator.scope1' — read-only, auto-populated
  required?: boolean
  group?: string // visual grouping within the form
}

// ---------------------------------------------------------------------------
// Field templates keyed by category
// ---------------------------------------------------------------------------

export const FIELD_TEMPLATES: Record<string, DisclosureField[]> = {
  // 1 — Scope 1 emissions (305-1, CC-5 scope 1 portion)
  emissions_scope1: [
    // GHG Emissions
    { key: 'scope1Total', label: 'Scope 1 total', type: 'auto', unit: 'tCO₂e', autoSource: 'calculator.scope1Total', required: true, group: 'GHG Emissions' },
    { key: 'co2', label: 'CO₂', type: 'auto', unit: 'tonnes', autoSource: 'calculator.co2', group: 'GHG Emissions' },
    { key: 'ch4', label: 'CH₄', type: 'auto', unit: 'tonnes CO₂e', autoSource: 'calculator.ch4', group: 'GHG Emissions' },
    { key: 'n2o', label: 'N₂O', type: 'auto', unit: 'tonnes CO₂e', autoSource: 'calculator.n2o', group: 'GHG Emissions' },
    { key: 'hfcs', label: 'HFCs', type: 'auto', unit: 'tonnes CO₂e', autoSource: 'calculator.hfcs', group: 'GHG Emissions' },
    { key: 'pfcs', label: 'PFCs', type: 'auto', unit: 'tonnes CO₂e', autoSource: 'calculator.pfcs', group: 'GHG Emissions' },
    { key: 'sf6', label: 'SF₆', type: 'auto', unit: 'tonnes CO₂e', autoSource: 'calculator.sf6', group: 'GHG Emissions' },
    { key: 'biogenicCO2', label: 'Biogenic CO₂', type: 'number', unit: 'tCO₂', placeholder: 'Biogenic CO₂ from combustion', group: 'GHG Emissions' },
    // Methodology
    { key: 'baseYear', label: 'Base year', type: 'number', required: true, placeholder: 'e.g. 2019', group: 'Methodology' },
    { key: 'consolidationApproach', label: 'Consolidation approach', type: 'select', options: ['Operational control', 'Financial control', 'Equity share'], required: true, group: 'Methodology' },
    { key: 'efSource', label: 'Emission factor source', type: 'text', placeholder: 'e.g. IPCC 2006, EPA, DEFRA 2025', group: 'Methodology' },
    { key: 'gwpSource', label: 'GWP source', type: 'select', options: ['IPCC AR5 (100-yr)', 'IPCC AR6 (100-yr)', 'IPCC AR4 (100-yr)'], group: 'Methodology' },
    { key: 'methodology', label: 'Methodology', type: 'textarea', placeholder: 'Standards and methodologies used', group: 'Methodology' },
  ],

  // 2 — Scope 2 emissions (305-2)
  emissions_scope2: [
    // Scope 2 Emissions
    { key: 'scope2Location', label: 'Scope 2 (location-based)', type: 'auto', unit: 'tCO₂e', autoSource: 'calculator.scope2Location', required: true, group: 'Scope 2 Emissions' },
    { key: 'scope2Market', label: 'Scope 2 (market-based)', type: 'auto', unit: 'tCO₂e', autoSource: 'calculator.scope2Market', group: 'Scope 2 Emissions' },
    { key: 'electricity', label: 'Electricity', type: 'auto', unit: 'tCO₂e', autoSource: 'calculator.electricity', group: 'Scope 2 Emissions' },
    { key: 'heatSteam', label: 'Heat & steam', type: 'auto', unit: 'tCO₂e', autoSource: 'calculator.heatSteam', group: 'Scope 2 Emissions' },
    { key: 'cooling', label: 'Cooling', type: 'number', unit: 'tCO₂e', group: 'Scope 2 Emissions' },
    // Methodology
    { key: 'gridSubregion', label: 'Grid subregion', type: 'text', placeholder: 'Grid subregion used for location-based', group: 'Methodology' },
    { key: 'marketInstruments', label: 'Market-based instruments', type: 'textarea', placeholder: 'RECs, PPAs, supplier-specific EFs used', group: 'Methodology' },
    { key: 'baseYear', label: 'Base year', type: 'number', required: true, group: 'Methodology' },
  ],

  // 3 — Scope 3 emissions (305-3)
  emissions_scope3: [
    // Scope 3 by Category
    { key: 'cat1', label: 'Cat 1 — Purchased goods & services', type: 'number', unit: 'tCO₂e', group: 'Scope 3 by Category' },
    { key: 'cat2', label: 'Cat 2 — Capital goods', type: 'number', unit: 'tCO₂e', group: 'Scope 3 by Category' },
    { key: 'cat3', label: 'Cat 3 — Fuel & energy activities', type: 'number', unit: 'tCO₂e', group: 'Scope 3 by Category' },
    { key: 'cat4', label: 'Cat 4 — Upstream transport', type: 'number', unit: 'tCO₂e', group: 'Scope 3 by Category' },
    { key: 'cat5', label: 'Cat 5 — Waste in operations', type: 'number', unit: 'tCO₂e', group: 'Scope 3 by Category' },
    { key: 'cat6', label: 'Cat 6 — Business travel', type: 'number', unit: 'tCO₂e', group: 'Scope 3 by Category' },
    { key: 'cat7', label: 'Cat 7 — Employee commuting', type: 'number', unit: 'tCO₂e', group: 'Scope 3 by Category' },
    { key: 'cat8', label: 'Cat 8 — Upstream leased assets', type: 'number', unit: 'tCO₂e', group: 'Scope 3 by Category' },
    { key: 'cat9', label: 'Cat 9 — Downstream transport', type: 'number', unit: 'tCO₂e', group: 'Scope 3 by Category' },
    { key: 'cat10', label: 'Cat 10 — Processing of sold products', type: 'number', unit: 'tCO₂e', group: 'Scope 3 by Category' },
    { key: 'cat11', label: 'Cat 11 — Use of sold products', type: 'number', unit: 'tCO₂e', group: 'Scope 3 by Category' },
    { key: 'cat12', label: 'Cat 12 — End-of-life treatment', type: 'number', unit: 'tCO₂e', group: 'Scope 3 by Category' },
    { key: 'cat13', label: 'Cat 13 — Downstream leased assets', type: 'number', unit: 'tCO₂e', group: 'Scope 3 by Category' },
    { key: 'cat14', label: 'Cat 14 — Franchises', type: 'number', unit: 'tCO₂e', group: 'Scope 3 by Category' },
    { key: 'cat15', label: 'Cat 15 — Investments', type: 'number', unit: 'tCO₂e', group: 'Scope 3 by Category' },
    { key: 'scope3Total', label: 'Scope 3 total', type: 'auto', unit: 'tCO₂e', autoSource: 'calculator.scope3Total', group: 'Scope 3 by Category' },
    // Methodology
    { key: 'categoriesIncluded', label: 'Categories included', type: 'textarea', placeholder: 'List categories included and rationale for exclusions', group: 'Methodology' },
    { key: 'dataQuality', label: 'Data quality', type: 'select', options: ['Primary data (>80%)', 'Mixed primary/secondary', 'Mostly secondary/estimated'], group: 'Methodology' },
  ],

  // 4 — Combined scope 1+2+3 (E1-6, S2.29(a))
  emissions_full: [
    // Total GHG Emissions
    { key: 'scope1Total', label: 'Scope 1 total', type: 'auto', unit: 'tCO₂e', autoSource: 'calculator.scope1Total', required: true, group: 'Total GHG Emissions' },
    { key: 'scope2Location', label: 'Scope 2 (location-based)', type: 'auto', unit: 'tCO₂e', autoSource: 'calculator.scope2Location', required: true, group: 'Total GHG Emissions' },
    { key: 'scope2Market', label: 'Scope 2 (market-based)', type: 'auto', unit: 'tCO₂e', autoSource: 'calculator.scope2Market', group: 'Total GHG Emissions' },
    { key: 'scope3Total', label: 'Scope 3 total', type: 'auto', unit: 'tCO₂e', autoSource: 'calculator.scope3Total', group: 'Total GHG Emissions' },
    { key: 'grandTotal', label: 'Grand total', type: 'auto', unit: 'tCO₂e', autoSource: 'calculator.grandTotal', group: 'Total GHG Emissions' },
    { key: 'biogenicCO2', label: 'Biogenic CO₂', type: 'number', unit: 'tCO₂', group: 'Total GHG Emissions' },
    // Intensity
    { key: 'intensityRevenue', label: 'Intensity (revenue)', type: 'auto', unit: 'tCO₂e/£M', autoSource: 'calculator.intensityRevenue', group: 'Intensity' },
    { key: 'intensityFTE', label: 'Intensity (FTE)', type: 'auto', unit: 'tCO₂e/FTE', autoSource: 'calculator.intensityFTE', group: 'Intensity' },
    { key: 'revenue', label: 'Net revenue', type: 'number', unit: '£M', placeholder: 'Net revenue for intensity calc', group: 'Intensity' },
    { key: 'headcount', label: 'Headcount', type: 'number', unit: 'FTE', placeholder: 'Full-time equivalent employees', group: 'Intensity' },
    // Methodology
    { key: 'consolidationApproach', label: 'Consolidation approach', type: 'select', options: ['Operational control', 'Financial control', 'Equity share'], required: true, group: 'Methodology' },
    { key: 'baseYear', label: 'Base year', type: 'number', required: true, group: 'Methodology' },
    { key: 'methodology', label: 'Methodology', type: 'textarea', group: 'Methodology' },
  ],

  // 5 — Intensity (305-4)
  intensity: [
    { key: 'intensityRatio', label: 'Intensity ratio', type: 'number', required: true, unit: 'tCO₂e per unit' },
    { key: 'denominator', label: 'Denominator', type: 'select', options: ['Revenue (£M)', 'FTE', 'Units produced', 'Floor area (m²)', 'Tonne of product'] },
    { key: 'denominatorValue', label: 'Denominator value', type: 'number', required: true, placeholder: 'Value of denominator' },
    { key: 'scopesIncluded', label: 'Scopes included', type: 'select', options: ['Scope 1 only', 'Scope 1+2', 'Scope 1+2+3'] },
    { key: 'gasesIncluded', label: 'Gases included', type: 'textarea', placeholder: 'List gases included' },
  ],

  // 6 — Targets (305-5, CC-4, E1-4, MT-c, S2.33-37)
  targets: [
    // Target Definition
    { key: 'targetType', label: 'Target type', type: 'select', options: ['Absolute reduction', 'Intensity reduction'], required: true, group: 'Target Definition' },
    { key: 'baseYear', label: 'Base year', type: 'number', required: true, group: 'Target Definition' },
    { key: 'baseYearEmissions', label: 'Base year emissions', type: 'auto', unit: 'tCO₂e', autoSource: 'calculator.baseYearEmissions', group: 'Target Definition' },
    { key: 'targetYear', label: 'Target year', type: 'number', required: true, placeholder: 'e.g. 2030', group: 'Target Definition' },
    { key: 'targetReduction', label: 'Target reduction', type: 'number', required: true, unit: '%', placeholder: 'Target reduction percentage', group: 'Target Definition' },
    { key: 'interimTarget2025', label: 'Interim target 2025', type: 'number', unit: '%', group: 'Target Definition' },
    { key: 'interimTarget2030', label: 'Interim target 2030', type: 'number', unit: '%', group: 'Target Definition' },
    // Progress
    { key: 'currentEmissions', label: 'Current emissions', type: 'auto', unit: 'tCO₂e', autoSource: 'calculator.currentEmissions', group: 'Progress' },
    { key: 'reductionAchieved', label: 'Reduction achieved', type: 'auto', unit: '%', autoSource: 'calculator.reductionAchieved', group: 'Progress' },
    { key: 'onTrack', label: 'On track to meet target?', type: 'boolean', group: 'Progress' },
    // Validation
    { key: 'scienceBased', label: 'Science-based target?', type: 'boolean', group: 'Validation' },
    { key: 'sbtiValidated', label: 'Validated by SBTi?', type: 'boolean', group: 'Validation' },
    { key: 'offsetsUsed', label: 'Offsets counted toward target?', type: 'boolean', group: 'Validation' },
    { key: 'offsetsExplanation', label: 'Offsets explanation', type: 'textarea', placeholder: 'If offsets used, explain type and volume', group: 'Validation' },
  ],

  // 7 — Governance (CC-1, GOV-a, GOV-b, S2.5-7)
  governance: [
    // Board Oversight
    { key: 'boardMeetingsTotal', label: 'Total board meetings in period', type: 'number', required: true, group: 'Board Oversight' },
    { key: 'boardClimateDiscussions', label: 'Meetings where climate was discussed', type: 'number', required: true, group: 'Board Oversight' },
    { key: 'responsibleCommittee', label: 'Responsible committee', type: 'select', options: ['Sustainability Committee', 'Audit & Risk Committee', 'Full Board', 'ESG Committee', 'Other'], group: 'Board Oversight' },
    { key: 'reportingFrequency', label: 'Reporting frequency', type: 'select', options: ['Every meeting', 'Quarterly', 'Semi-annually', 'Annually'], group: 'Board Oversight' },
    { key: 'boardClimateExpertise', label: 'Board members with climate/ESG expertise', type: 'number', group: 'Board Oversight' },
    { key: 'boardTotal', label: 'Total board members', type: 'number', group: 'Board Oversight' },
    // Management
    { key: 'dedicatedCSO', label: 'Dedicated Chief Sustainability Officer?', type: 'boolean', group: 'Management' },
    { key: 'csoReportsTo', label: 'CSO reports to', type: 'select', options: ['CEO', 'CFO', 'COO', 'Board directly', 'Other'], group: 'Management' },
    { key: 'climateInRemuneration', label: 'Climate KPIs in executive remuneration?', type: 'boolean', group: 'Management' },
    { key: 'remunerationPct', label: '% of variable pay linked to ESG', type: 'number', unit: '%', group: 'Management' },
    // Narrative
    { key: 'oversightDescription', label: 'Oversight description', type: 'textarea', required: true, placeholder: 'Describe how the board exercises oversight of climate-related risks and opportunities', group: 'Narrative' },
    { key: 'managementRole', label: 'Management role', type: 'textarea', required: true, placeholder: "Describe management's role in assessing and managing climate risks", group: 'Narrative' },
  ],

  // 8 — Strategy (CC-2, STR-a/b/c, E1-1, S2.8-22)
  strategy: [
    // Risks & Opportunities
    { key: 'physicalRisksAcute', label: 'Acute physical risks', type: 'textarea', placeholder: 'Acute physical risks (floods, storms, fires)', group: 'Risks & Opportunities' },
    { key: 'physicalRisksChronic', label: 'Chronic physical risks', type: 'textarea', placeholder: 'Chronic physical risks (sea level, temperature, water stress)', group: 'Risks & Opportunities' },
    { key: 'transitionRisksPolicy', label: 'Policy/regulatory risks', type: 'textarea', placeholder: 'Policy/regulatory risks (carbon pricing, regulations)', group: 'Risks & Opportunities' },
    { key: 'transitionRisksTech', label: 'Technology risks', type: 'textarea', placeholder: 'Technology risks (obsolescence, substitution)', group: 'Risks & Opportunities' },
    { key: 'transitionRisksMarket', label: 'Market risks', type: 'textarea', placeholder: 'Market risks (demand shifts, raw material costs)', group: 'Risks & Opportunities' },
    { key: 'transitionRisksReputation', label: 'Reputation risks', type: 'textarea', placeholder: 'Reputation risks (stakeholder concerns, litigation)', group: 'Risks & Opportunities' },
    { key: 'opportunities', label: 'Opportunities', type: 'textarea', placeholder: 'Climate-related opportunities identified', group: 'Risks & Opportunities' },
    // Financial Impact
    { key: 'assetsAtPhysicalRisk', label: 'Assets at physical risk', type: 'number', unit: '£M', group: 'Financial Impact' },
    { key: 'assetsAtTransitionRisk', label: 'Assets at transition risk', type: 'number', unit: '£M', group: 'Financial Impact' },
    { key: 'revenueExposedPct', label: 'Revenue exposed', type: 'number', unit: '%', group: 'Financial Impact' },
    { key: 'capexForTransition', label: 'CapEx for transition', type: 'number', unit: '£M', group: 'Financial Impact' },
    // Scenario Analysis
    { key: 'scenariosUsed', label: 'Scenarios used', type: 'select', options: ['1.5°C + BAU', '2°C + BAU', '1.5°C + 2°C + BAU', 'IEA NZE + STEPS', 'Custom'], group: 'Scenario Analysis' },
    { key: 'aligned15C', label: 'Transition plan aligned with 1.5°C?', type: 'boolean', group: 'Scenario Analysis' },
    { key: 'resilienceAssessment', label: 'Resilience assessment', type: 'textarea', placeholder: 'How is the strategy resilient under different scenarios?', group: 'Scenario Analysis' },
  ],

  // 9 — Risk management (RM-a/b/c, S2.23-24)
  risk_management: [
    { key: 'identificationMethod', label: 'Identification method', type: 'select', options: ['Materiality assessment', 'Risk register review', 'Scenario analysis', 'Stakeholder engagement', 'Multiple methods'] },
    { key: 'assessmentFramework', label: 'Assessment framework', type: 'select', options: ['TCFD', 'ISO 14001', 'COSO ERM', 'Internal framework', 'Other'] },
    { key: 'integratedIntoERM', label: 'Integrated into enterprise risk management?', type: 'boolean', required: true },
    { key: 'climateRisksOnRegister', label: 'Climate risks on corporate risk register', type: 'number' },
    { key: 'reviewFrequency', label: 'Review frequency', type: 'select', options: ['Monthly', 'Quarterly', 'Semi-annually', 'Annually'] },
    { key: 'prioritisationCriteria', label: 'Prioritisation criteria', type: 'textarea', placeholder: 'How are climate risks prioritised?' },
    { key: 'escalationProcess', label: 'Escalation process', type: 'textarea', placeholder: 'How are material climate risks escalated?' },
    { key: 'monitoringDescription', label: 'Monitoring description', type: 'textarea', placeholder: 'How are climate risks monitored over time?' },
  ],

  // 10 — Carbon credits (CC-6, E1-7)
  // NOTE: Credits must NEVER be subtracted from gross emissions per GRI/CSRD
  carbon_credits: [
    // Credits
    { key: 'creditType', label: 'Credit type', type: 'select', options: ['Avoidance/reduction', 'Removal (nature-based)', 'Removal (technological)', 'Mixed'], group: 'Credits' },
    { key: 'certification', label: 'Certification', type: 'select', options: ['VCS/Verra', 'Gold Standard', 'ACR', 'CAR', 'Plan Vivo', 'Other'], group: 'Credits' },
    { key: 'tonnesPurchased', label: 'Tonnes purchased', type: 'number', unit: 'tCO₂e', required: true, group: 'Credits' },
    { key: 'tonnesRetired', label: 'Tonnes retired', type: 'number', unit: 'tCO₂e', required: true, group: 'Credits' },
    { key: 'vintageYear', label: 'Vintage year', type: 'number', group: 'Credits' },
    { key: 'pricePerTonne', label: 'Price per tonne', type: 'number', unit: '£/tCO₂e', group: 'Credits' },
    { key: 'totalSpend', label: 'Total spend', type: 'auto', unit: '£', autoSource: 'calculate.creditSpend', group: 'Credits' },
    // Policy
    { key: 'countedTowardTarget', label: 'Counted toward emission reduction target?', type: 'boolean', group: 'Policy' },
    { key: 'nettedFromGross', label: 'Netted from gross emissions?', type: 'boolean', group: 'Policy' },
    { key: 'justification', label: 'Justification', type: 'textarea', placeholder: 'Explain role of credits in climate strategy', group: 'Policy' },
  ],

  // 11 — Energy (E1-5)
  energy: [
    // Energy Consumption
    { key: 'totalEnergy', label: 'Total energy', type: 'auto', unit: 'MWh', autoSource: 'calculator.totalEnergy', group: 'Energy Consumption' },
    { key: 'fossilFuels', label: 'Fossil fuels', type: 'number', unit: 'MWh', group: 'Energy Consumption' },
    { key: 'nuclear', label: 'Nuclear', type: 'number', unit: 'MWh', group: 'Energy Consumption' },
    { key: 'renewable', label: 'Renewable', type: 'number', unit: 'MWh', group: 'Energy Consumption' },
    // Energy Mix
    { key: 'pctFossil', label: '% fossil', type: 'auto', unit: '%', autoSource: 'calculator.pctFossil', group: 'Energy Mix' },
    { key: 'pctRenewable', label: '% renewable', type: 'auto', unit: '%', autoSource: 'calculator.pctRenewable', group: 'Energy Mix' },
    { key: 'coal', label: 'Coal', type: 'number', unit: 'MWh', group: 'Energy Mix' },
    { key: 'oil', label: 'Oil', type: 'number', unit: 'MWh', group: 'Energy Mix' },
    { key: 'gas', label: 'Gas', type: 'number', unit: 'MWh', group: 'Energy Mix' },
    // Intensity
    { key: 'energyIntensity', label: 'Energy intensity', type: 'auto', unit: 'MWh/£M', autoSource: 'calculator.energyIntensity', group: 'Intensity' },
    { key: 'revenue', label: 'Revenue', type: 'number', unit: '£M', group: 'Intensity' },
  ],

  // 12 — Financial effects (E1-8, E1-9, S2.29(d-g))
  financial_effects: [
    // Internal Carbon Pricing
    { key: 'usesInternalCarbonPrice', label: 'Uses internal carbon price?', type: 'boolean', required: true, group: 'Internal Carbon Pricing' },
    { key: 'schemeType', label: 'Scheme type', type: 'select', options: ['Shadow price', 'Internal fee', 'Cap-and-trade', 'Not applicable'], group: 'Internal Carbon Pricing' },
    { key: 'carbonPrice', label: 'Carbon price', type: 'number', unit: '£/tCO₂e', group: 'Internal Carbon Pricing' },
    { key: 'scopeOfApplication', label: 'Scope of application', type: 'select', options: ['All operations', 'Capital projects only', 'Strategic decisions only', 'Specific divisions'], group: 'Internal Carbon Pricing' },
    { key: 'totalCarbonCost', label: 'Total carbon cost', type: 'auto', unit: '£', autoSource: 'calculate.totalCarbonCost', group: 'Internal Carbon Pricing' },
    // Financial Exposure
    { key: 'assetsAtPhysicalRisk', label: 'Assets at physical risk', type: 'number', unit: '£M', group: 'Financial Exposure' },
    { key: 'assetsAtTransitionRisk', label: 'Assets at transition risk', type: 'number', unit: '£M', group: 'Financial Exposure' },
    { key: 'pctRevenueExposed', label: '% revenue exposed', type: 'number', unit: '%', group: 'Financial Exposure' },
    { key: 'pctAssetsExposed', label: '% assets exposed', type: 'number', unit: '%', group: 'Financial Exposure' },
    { key: 'strandedAssetRisk', label: 'Stranded asset risk', type: 'number', unit: '£M', group: 'Financial Exposure' },
    { key: 'carbonPricingLiability', label: 'Carbon pricing liability', type: 'number', unit: '£M', group: 'Financial Exposure' },
  ],

  // 13 — Just transition (CC-3)
  just_transition: [
    { key: 'jobsCreated', label: 'Jobs created by transition', type: 'number' },
    { key: 'jobsEliminated', label: 'Jobs eliminated', type: 'number' },
    { key: 'jobsRedeployed', label: 'Workers redeployed', type: 'number' },
    { key: 'workersRetrained', label: 'Workers retrained', type: 'number' },
    { key: 'retrainingInvestment', label: 'Retraining investment', type: 'number', unit: '£' },
    { key: 'communityEngagement', label: 'Community engagement', type: 'textarea', placeholder: 'Community engagement actions taken' },
    { key: 'vulnerableGroups', label: 'Vulnerable groups', type: 'textarea', placeholder: 'How vulnerable groups are considered' },
  ],

  // 14 — ODS (305-6)
  ods: [
    { key: 'odsProduction', label: 'ODS production', type: 'number', unit: 'tonnes CFC-11eq' },
    { key: 'odsImports', label: 'ODS imports', type: 'number', unit: 'tonnes CFC-11eq' },
    { key: 'odsExports', label: 'ODS exports', type: 'number', unit: 'tonnes CFC-11eq' },
    { key: 'substancesIncluded', label: 'Substances included', type: 'textarea', placeholder: 'List ODS substances included' },
    { key: 'methodology', label: 'Methodology', type: 'textarea' },
  ],

  // 15 — Air emissions (305-7)
  air_emissions: [
    { key: 'nox', label: 'NOₓ', type: 'number', unit: 'kg' },
    { key: 'sox', label: 'SOₓ', type: 'number', unit: 'kg' },
    { key: 'voc', label: 'VOC', type: 'number', unit: 'kg' },
    { key: 'hap', label: 'HAP', type: 'number', unit: 'kg' },
    { key: 'pm', label: 'PM', type: 'number', unit: 'kg' },
    { key: 'pop', label: 'POP', type: 'number', unit: 'kg' },
    { key: 'methodology', label: 'Methodology', type: 'textarea' },
  ],

  // 16 — Generic narrative fallback (STR-c, RM-a, etc.)
  narrative: [
    { key: 'response', label: 'Response', type: 'textarea', required: true, placeholder: 'Provide your disclosure response' },
    { key: 'evidence', label: 'Evidence', type: 'text', placeholder: 'Reference documents or evidence' },
    { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes or context' },
  ],
}

// ---------------------------------------------------------------------------
// Mapping from disclosure codes to template keys
// ---------------------------------------------------------------------------

export const DISCLOSURE_FIELDS: Record<string, string> = {
  // GRI 305
  '305-1': 'emissions_scope1',
  '305-2': 'emissions_scope2',
  '305-3': 'emissions_scope3',
  '305-4': 'intensity',
  '305-5': 'targets',
  '305-6': 'ods',
  '305-7': 'air_emissions',
  // GRI 102
  'CC-1': 'governance',
  'CC-2': 'strategy',
  'CC-3': 'just_transition',
  'CC-4': 'targets',
  'CC-5': 'emissions_full',
  'CC-6': 'carbon_credits',
  'CC-7': 'narrative',
  // TCFD
  'GOV-a': 'governance',
  'GOV-b': 'governance',
  'STR-a': 'strategy',
  'STR-b': 'strategy',
  'STR-c': 'narrative',
  'RM-a': 'risk_management',
  'RM-b': 'risk_management',
  'RM-c': 'narrative',
  'MT-a': 'financial_effects',
  'MT-b': 'emissions_full',
  'MT-c': 'targets',
  // CSRD E1
  'E1-1': 'narrative',
  'E1-2': 'narrative',
  'E1-3': 'strategy',
  'E1-4': 'targets',
  'E1-5': 'energy',
  'E1-6': 'emissions_full',
  'E1-7': 'carbon_credits',
  'E1-8': 'financial_effects',
  'E1-9': 'financial_effects',
  // ISSB S2
  'S2.5-7': 'governance',
  'S2.8-22': 'strategy',
  'S2.23-24': 'risk_management',
  'S2.29(a)': 'emissions_full',
  'S2.29(b)': 'emissions_scope2',
  'S2.29(c)': 'emissions_scope3',
  'S2.29(d-g)': 'financial_effects',
  'S2.33-37': 'targets',
}

// ---------------------------------------------------------------------------
// Look up the field template for a given disclosure code
// ---------------------------------------------------------------------------

export function getFieldsForDisclosure(code: string): DisclosureField[] {
  const templateKey = DISCLOSURE_FIELDS[code]
  if (!templateKey) return FIELD_TEMPLATES['narrative'] ?? []
  return FIELD_TEMPLATES[templateKey] ?? []
}

// ---------------------------------------------------------------------------
// Demo auto-populated values (simulating calculator outputs)
// ---------------------------------------------------------------------------

export const DEMO_AUTO_VALUES: Record<string, number> = {
  'calculator.scope1Total': 45230,
  'calculator.scope2Location': 12450,
  'calculator.scope2Market': 8920,
  'calculator.scope3Total': 128500,
  'calculator.grandTotal': 186180,
  'calculator.co2': 42100,
  'calculator.ch4': 1850,
  'calculator.n2o': 680,
  'calculator.hfcs': 420,
  'calculator.pfcs': 85,
  'calculator.sf6': 95,
  'calculator.electricity': 9800,
  'calculator.heatSteam': 2650,
  'calculator.intensityRevenue': 28.5,
  'calculator.intensityFTE': 6.8,
  'calculator.baseYearEmissions': 210500,
  'calculator.currentEmissions': 186180,
  'calculator.reductionAchieved': 11.6,
  'calculator.totalEnergy': 185400,
  'calculator.pctFossil': 62,
  'calculator.pctRenewable': 38,
  'calculator.energyIntensity': 284,
  'calculator.scope1.biogenicCO2': 3200,
}
