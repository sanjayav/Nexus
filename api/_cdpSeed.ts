// CDP Climate Change 2024 questionnaire — disclosure datapoint catalogue.
// Source: CDP Climate Change 2024 questionnaire. Modules C1-C12.
// Coverage: ~80 representative question codes (not 100% — CDP has ~600 question
// parts when fully expanded; we ship the question-level codes that auditors care
// about, leaving sub-tables for the entry UI to expand).

export type WorkflowRole = 'AUTO' | 'FM' | 'SO' | 'TL'
export type EntryMode = 'Manual' | 'Calculator' | 'Connector'
export type ReportingScope = 'group' | 'jv'

export interface ItemSpec {
  subsection: string
  griCode: string
  lineItem: string
  unit: string | null
  scopeSplit: string | null
  hasTarget: boolean
  requiresCoverage: boolean
  defaultRole: WorkflowRole
  entryMode: EntryMode
}

const SECTION = 'CDP Climate Change 2024'
const FRAMEWORK_ID = 'cdp-2024'
const REPORTING_SCOPE: ReportingScope = 'group'

// C1 Governance
const C1: ItemSpec[] = [
  { subsection: 'C1 Governance', griCode: 'CDP-C1.1a', lineItem: 'Identify the position of the individual or name of the committee with the highest level of direct responsibility for climate-related issues', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C1 Governance', griCode: 'CDP-C1.1b', lineItem: 'Provide further details on the board\'s oversight of climate-related issues', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C1 Governance', griCode: 'CDP-C1.2', lineItem: "Provide details of the highest management-level position(s) or committee(s) with responsibility for climate-related issues", unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C1 Governance', griCode: 'CDP-C1.2a', lineItem: 'Description of where management responsibility sits within the organisation', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C1 Governance', griCode: 'CDP-C1.3', lineItem: 'Do you provide incentives for the management of climate-related issues, including the attainment of targets?', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C1 Governance', griCode: 'CDP-C1.3a', lineItem: 'Provide details of the incentives provided for the management of climate-related issues', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// C2 Risks and opportunities
const C2: ItemSpec[] = [
  { subsection: 'C2 Risks and opportunities', griCode: 'CDP-C2.1', lineItem: 'Does your organisation have a process for identifying, assessing and responding to climate-related risks and opportunities?', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C2 Risks and opportunities', griCode: 'CDP-C2.1a', lineItem: 'How does your organisation define short-, medium- and long-term time horizons?', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C2 Risks and opportunities', griCode: 'CDP-C2.1b', lineItem: 'How does your organisation define substantive financial or strategic impact on the business?', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C2 Risks and opportunities', griCode: 'CDP-C2.2', lineItem: 'Describe your process for identifying, assessing and responding to climate-related risks and opportunities', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C2 Risks and opportunities', griCode: 'CDP-C2.2a', lineItem: 'Which risk types are considered in the climate-related risk assessment?', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C2 Risks and opportunities', griCode: 'CDP-C2.3', lineItem: 'Have you identified any inherent climate-related risks with potential to have a substantive financial or strategic impact?', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C2 Risks and opportunities', griCode: 'CDP-C2.3a', lineItem: 'Provide details of risks identified with the potential to have a substantive financial or strategic impact', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C2 Risks and opportunities', griCode: 'CDP-C2.4', lineItem: 'Have you identified any climate-related opportunities with potential to have a substantive financial or strategic impact?', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C2 Risks and opportunities', griCode: 'CDP-C2.4a', lineItem: 'Provide details of opportunities identified with potential to have a substantive financial or strategic impact', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// C3 Business strategy
const C3: ItemSpec[] = [
  { subsection: 'C3 Business strategy', griCode: 'CDP-C3.1', lineItem: 'Do climate-related issues influence your business strategy?', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C3 Business strategy', griCode: 'CDP-C3.2', lineItem: 'Does your organisation use climate-related scenario analysis to inform its strategy?', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C3 Business strategy', griCode: 'CDP-C3.2a', lineItem: 'Provide details of the climate-related scenario analysis used', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C3 Business strategy', griCode: 'CDP-C3.3', lineItem: 'Describe where and how climate-related risks and opportunities have influenced your strategy', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C3 Business strategy', griCode: 'CDP-C3.4', lineItem: 'Describe where and how climate-related risks and opportunities have influenced your financial planning', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'C3 Business strategy', griCode: 'CDP-C3.5', lineItem: 'Does your organisation have a low-carbon transition plan?', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// C4 Targets and performance
const C4: ItemSpec[] = [
  { subsection: 'C4 Targets and performance', griCode: 'CDP-C4.1', lineItem: 'Did you have an emissions target active in the reporting year?', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C4 Targets and performance', griCode: 'CDP-C4.1a', lineItem: 'Provide details of your absolute emissions target(s) and progress made', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C4 Targets and performance', griCode: 'CDP-C4.1b', lineItem: 'Provide details of your intensity emissions target(s) and progress made', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C4 Targets and performance', griCode: 'CDP-C4.2', lineItem: 'Did you have any other climate-related targets active in the reporting year?', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C4 Targets and performance', griCode: 'CDP-C4.2a', lineItem: 'Provide details of your net-zero target(s)', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C4 Targets and performance', griCode: 'CDP-C4.3', lineItem: 'Did you have emissions reduction initiatives that were active within the reporting year?', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C4 Targets and performance', griCode: 'CDP-C4.3a', lineItem: 'Number of initiatives at each stage of development', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'C4 Targets and performance', griCode: 'CDP-C4.3b', lineItem: 'Estimated CO2e savings and investment for emissions reduction initiatives', unit: 'tCO2e', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C4 Targets and performance', griCode: 'CDP-C4.5', lineItem: 'Do you classify any of your existing goods and/or services as low-carbon products?', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C4 Targets and performance', griCode: 'CDP-C4.5a', lineItem: 'Provide details of low-carbon products and percentage of revenue', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
]

// C5 Emissions methodology
const C5: ItemSpec[] = [
  { subsection: 'C5 Emissions methodology', griCode: 'CDP-C5.1', lineItem: 'Base year selected for Scope 1, Scope 2 and Scope 3 emissions', unit: 'year', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C5 Emissions methodology', griCode: 'CDP-C5.1a', lineItem: 'Base year emissions — Scope 1', unit: 'tCO2e', scopeSplit: 'scope_1', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'C5 Emissions methodology', griCode: 'CDP-C5.1a', lineItem: 'Base year emissions — Scope 2 (location-based)', unit: 'tCO2e', scopeSplit: 'scope_2_loc', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'C5 Emissions methodology', griCode: 'CDP-C5.1a', lineItem: 'Base year emissions — Scope 2 (market-based)', unit: 'tCO2e', scopeSplit: 'scope_2_mkt', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'C5 Emissions methodology', griCode: 'CDP-C5.2', lineItem: 'Standard, protocol or methodology used to collect and report emissions data', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// C6 Emissions data (Scope 1, 2, 3 categories)
const C6: ItemSpec[] = [
  { subsection: 'C6 Emissions data', griCode: 'CDP-C6.1', lineItem: 'Gross global Scope 1 emissions in metric tons CO2e', unit: 'tCO2e', scopeSplit: 'scope_1', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C6 Emissions data', griCode: 'CDP-C6.2', lineItem: 'Description of approach to reporting Scope 2 emissions (location-based and market-based)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C6 Emissions data', griCode: 'CDP-C6.3', lineItem: 'Gross global Scope 2 emissions — location-based', unit: 'tCO2e', scopeSplit: 'scope_2_loc', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C6 Emissions data', griCode: 'CDP-C6.3', lineItem: 'Gross global Scope 2 emissions — market-based', unit: 'tCO2e', scopeSplit: 'scope_2_mkt', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C6 Emissions data', griCode: 'CDP-C6.4', lineItem: 'Are there any sources of Scope 1 or 2 emissions excluded from the disclosure?', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C6 Emissions data', griCode: 'CDP-C6.5', lineItem: 'Scope 3 emissions — Purchased goods and services (Category 1)', unit: 'tCO2e', scopeSplit: 'scope_3_c1', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C6 Emissions data', griCode: 'CDP-C6.5', lineItem: 'Scope 3 emissions — Capital goods (Category 2)', unit: 'tCO2e', scopeSplit: 'scope_3_c2', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C6 Emissions data', griCode: 'CDP-C6.5', lineItem: 'Scope 3 emissions — Fuel- and energy-related activities (Category 3)', unit: 'tCO2e', scopeSplit: 'scope_3_c3', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C6 Emissions data', griCode: 'CDP-C6.5', lineItem: 'Scope 3 emissions — Upstream transportation and distribution (Category 4)', unit: 'tCO2e', scopeSplit: 'scope_3_c4', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C6 Emissions data', griCode: 'CDP-C6.5', lineItem: 'Scope 3 emissions — Waste generated in operations (Category 5)', unit: 'tCO2e', scopeSplit: 'scope_3_c5', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C6 Emissions data', griCode: 'CDP-C6.5', lineItem: 'Scope 3 emissions — Business travel (Category 6)', unit: 'tCO2e', scopeSplit: 'scope_3_c6', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C6 Emissions data', griCode: 'CDP-C6.5', lineItem: 'Scope 3 emissions — Employee commuting (Category 7)', unit: 'tCO2e', scopeSplit: 'scope_3_c7', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C6 Emissions data', griCode: 'CDP-C6.5', lineItem: 'Scope 3 emissions — Upstream leased assets (Category 8)', unit: 'tCO2e', scopeSplit: 'scope_3_c8', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C6 Emissions data', griCode: 'CDP-C6.5', lineItem: 'Scope 3 emissions — Downstream transportation and distribution (Category 9)', unit: 'tCO2e', scopeSplit: 'scope_3_c9', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C6 Emissions data', griCode: 'CDP-C6.5', lineItem: 'Scope 3 emissions — Processing of sold products (Category 10)', unit: 'tCO2e', scopeSplit: 'scope_3_c10', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C6 Emissions data', griCode: 'CDP-C6.5', lineItem: 'Scope 3 emissions — Use of sold products (Category 11)', unit: 'tCO2e', scopeSplit: 'scope_3_c11', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C6 Emissions data', griCode: 'CDP-C6.5', lineItem: 'Scope 3 emissions — End-of-life treatment of sold products (Category 12)', unit: 'tCO2e', scopeSplit: 'scope_3_c12', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C6 Emissions data', griCode: 'CDP-C6.5', lineItem: 'Scope 3 emissions — Downstream leased assets (Category 13)', unit: 'tCO2e', scopeSplit: 'scope_3_c13', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C6 Emissions data', griCode: 'CDP-C6.5', lineItem: 'Scope 3 emissions — Franchises (Category 14)', unit: 'tCO2e', scopeSplit: 'scope_3_c14', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C6 Emissions data', griCode: 'CDP-C6.5', lineItem: 'Scope 3 emissions — Investments (Category 15)', unit: 'tCO2e', scopeSplit: 'scope_3_c15', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C6 Emissions data', griCode: 'CDP-C6.10', lineItem: 'Emissions intensity per unit financial output', unit: 'tCO2e/EUR million', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'AUTO', entryMode: 'Calculator' },
]

// C7 Emissions breakdowns
const C7: ItemSpec[] = [
  { subsection: 'C7 Emissions breakdowns', griCode: 'CDP-C7.1', lineItem: 'Does your organisation break down Scope 1 emissions by greenhouse gas type?', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C7 Emissions breakdowns', griCode: 'CDP-C7.1a', lineItem: 'Break down your total gross global Scope 1 emissions by greenhouse gas type', unit: 'tCO2e', scopeSplit: 'by_ghg', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C7 Emissions breakdowns', griCode: 'CDP-C7.2', lineItem: 'Break down total gross global Scope 1 emissions by country / region', unit: 'tCO2e', scopeSplit: 'by_region', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C7 Emissions breakdowns', griCode: 'CDP-C7.6', lineItem: 'Break down Scope 1 emissions by business division, facility or activity', unit: 'tCO2e', scopeSplit: 'by_facility', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C7 Emissions breakdowns', griCode: 'CDP-C7.7', lineItem: 'Break down Scope 2 emissions by country / region', unit: 'tCO2e', scopeSplit: 'scope_2_by_region', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C7 Emissions breakdowns', griCode: 'CDP-C7.9', lineItem: 'How do your gross global emissions for the reporting year compare to those of the previous year?', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'C7 Emissions breakdowns', griCode: 'CDP-C7.9a', lineItem: 'Identify the reasons for any change in gross emissions and quantify the change in emissions', unit: 'tCO2e', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// C8 Energy
const C8: ItemSpec[] = [
  { subsection: 'C8 Energy', griCode: 'CDP-C8.2', lineItem: 'Total energy consumption (MWh)', unit: 'MWh', scopeSplit: 'total', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Calculator' },
  { subsection: 'C8 Energy', griCode: 'CDP-C8.2a', lineItem: 'Consumption of fuel (excluding feedstocks)', unit: 'MWh', scopeSplit: 'fuel', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Calculator' },
  { subsection: 'C8 Energy', griCode: 'CDP-C8.2a', lineItem: 'Consumption of purchased or acquired electricity', unit: 'MWh', scopeSplit: 'electricity', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Calculator' },
  { subsection: 'C8 Energy', griCode: 'CDP-C8.2a', lineItem: 'Consumption of purchased or acquired heat, steam, and cooling', unit: 'MWh', scopeSplit: 'heat_steam_cool', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Calculator' },
  { subsection: 'C8 Energy', griCode: 'CDP-C8.2c', lineItem: 'Consumption of fuel by fuel type', unit: 'MWh', scopeSplit: 'by_fuel', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Calculator' },
  { subsection: 'C8 Energy', griCode: 'CDP-C8.2d', lineItem: 'Total electricity generated by source', unit: 'MWh', scopeSplit: 'self_generated', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Calculator' },
  { subsection: 'C8 Energy', griCode: 'CDP-C8.2g', lineItem: 'Provide details on the electricity, heat, steam, and cooling generated and consumed by your organisation', unit: 'MWh', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
]

// C9 Additional metrics
const C9: ItemSpec[] = [
  { subsection: 'C9 Additional metrics', griCode: 'CDP-C9.1', lineItem: 'Provide any additional climate-related metrics relevant to your business', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// C10 Verification
const C10: ItemSpec[] = [
  { subsection: 'C10 Verification', griCode: 'CDP-C10.1', lineItem: 'Indicate the verification/assurance status that applies to your Scope 1 emissions', unit: null, scopeSplit: 'scope_1', hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C10 Verification', griCode: 'CDP-C10.1', lineItem: 'Indicate the verification/assurance status that applies to your Scope 2 emissions', unit: null, scopeSplit: 'scope_2', hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C10 Verification', griCode: 'CDP-C10.1', lineItem: 'Indicate the verification/assurance status that applies to your Scope 3 emissions', unit: null, scopeSplit: 'scope_3', hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C10 Verification', griCode: 'CDP-C10.1a', lineItem: 'Provide further details of the verification/assurance undertaken (standard, scope, year)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C10 Verification', griCode: 'CDP-C10.2', lineItem: 'Do you verify any climate-related information reported in your CDP disclosure other than emissions figures?', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// C11 Carbon pricing
const C11: ItemSpec[] = [
  { subsection: 'C11 Carbon pricing', griCode: 'CDP-C11.1', lineItem: 'Are any of your operations or activities regulated by a carbon pricing system (ETS, cap & trade, carbon tax)?', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C11 Carbon pricing', griCode: 'CDP-C11.1a', lineItem: 'Provide details of each emissions trading system in which you participate', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C11 Carbon pricing', griCode: 'CDP-C11.2', lineItem: 'Has your organisation originated or purchased any project-based carbon credits within the reporting period?', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C11 Carbon pricing', griCode: 'CDP-C11.2a', lineItem: 'Provide details of the project-based carbon credits originated or purchased', unit: 'tCO2e', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C11 Carbon pricing', griCode: 'CDP-C11.3', lineItem: 'Does your organisation use an internal price on carbon?', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C11 Carbon pricing', griCode: 'CDP-C11.3a', lineItem: 'Provide details of how your organisation uses an internal price on carbon', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// C12 Engagement
const C12: ItemSpec[] = [
  { subsection: 'C12 Engagement', griCode: 'CDP-C12.1', lineItem: 'Do you engage with your value chain on climate-related issues?', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C12 Engagement', griCode: 'CDP-C12.1a', lineItem: 'Provide details of your climate-related supplier engagement strategy', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C12 Engagement', griCode: 'CDP-C12.1b', lineItem: 'Give details of your climate-related engagement strategy with your customers', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C12 Engagement', griCode: 'CDP-C12.2', lineItem: 'Do your suppliers have to meet climate-related requirements as part of your organisation\'s purchasing process?', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C12 Engagement', griCode: 'CDP-C12.3', lineItem: 'Do you engage in activities that could either directly or indirectly influence public policy on climate-related issues?', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C12 Engagement', griCode: 'CDP-C12.3a', lineItem: 'On what issues have you been engaging directly with policymakers?', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'C12 Engagement', griCode: 'CDP-C12.4', lineItem: 'Publication of climate-related information', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

export const CDP_ITEMS: ItemSpec[] = [
  ...C1, ...C2, ...C3, ...C4, ...C5, ...C6, ...C7, ...C8, ...C9, ...C10, ...C11, ...C12,
]

import type { Sql } from './_db'

export async function seedCDP(sql: Sql): Promise<void> {
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS framework_id TEXT`
  for (const it of CDP_ITEMS) {
    await sql`
      INSERT INTO questionnaire_item
        (framework_id, section, subsection, gri_code, line_item, unit, scope_split,
         has_target, requires_coverage, default_workflow_role, entry_mode_default,
         footnote_refs, reporting_scope)
      VALUES
        (${FRAMEWORK_ID}, ${SECTION}, ${it.subsection}, ${it.griCode}, ${it.lineItem},
         ${it.unit}, ${it.scopeSplit}, ${it.hasTarget}, ${it.requiresCoverage},
         ${it.defaultRole}, ${it.entryMode}, '[]'::jsonb, ${REPORTING_SCOPE})
      ON CONFLICT (gri_code, line_item, scope_split, reporting_scope) DO NOTHING
    `
  }
  await sql`
    INSERT INTO org_framework_enablement (org_id, framework_id, enabled, enabled_by)
    VALUES ('00000000-0000-0000-0000-000000000001', ${FRAMEWORK_ID}, true,
            '00000000-0000-0000-0000-000000000100')
    ON CONFLICT (org_id, framework_id) DO UPDATE SET enabled = true
  `
}
