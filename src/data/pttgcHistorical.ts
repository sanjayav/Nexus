// PTTGC FY2022–FY2025 Historical Values
// Source: PTT Global Chemical Public Company Limited — Sustainability Performance Data (pub. Feb 2026)
// Scope: GC + 11 subsidiaries (Thailand operations), per the report's Reporting Scope (GRI 2-2).
// JV parallel scope (WHA GC Logistics, PTT MCC Biochem, HMC Polymers) is tracked separately.
// This file is the canonical seed for the `historical_value` table (SRD §17) and the
// Module 5 historical reference panel (SRD §11). Scraped from the published PDF.

export type ReportingScope = 'group' | 'jv'
export type ScopeKey = string | null // e.g. "male", "female", "rayong", "scope1-market", or null for single-value rows

export interface HistoricalValue {
  griCode: string            // e.g. "305-1 (2016)"
  section: string            // capital
  subsection: string         // e.g. "Greenhouse Gas Emissions (GHGs)"
  lineItem: string           // exact label from the report
  unit: string
  scopeKey: ScopeKey         // disaggregation key, null if aggregate
  reportingScope: ReportingScope
  values: {
    2022: number | null
    2023: number | null
    2024: number | null
    2025: number | null
  }
  targetFy2026?: number | null
  sourceReport: string       // "PTTGC FY2025 Sustainability Performance Data — p.<n>"
  footnoteRefs?: string[]
}

// ═══════════════════════════════════════════
// GC Group in Reporting Scope (GRI 2-2)
// ═══════════════════════════════════════════

export const GC_GROUP_COMPANIES = [
  { name: 'PTT Global Chemical Public Company Limited', years: [2023, 2024, 2025] },
  { name: 'Solution Creation Company Limited', years: [2023, 2024, 2025] },
  { name: 'GC Maintenance and Engineering Company Limited', years: [2023, 2024, 2025] },
  { name: 'NPC Safety and Environmental Service Company Limited', years: [2023, 2024, 2025] },
  { name: 'GC Treasury Center Company Limited', years: [2023, 2024, 2025] },
  { name: 'GC Estate Company Limited', years: [2023, 2024, 2025] },
  { name: 'GC Marketing Solutions Company Limited', years: [2023, 2024, 2025] },
  { name: 'WHA GC Logistics Company Limited', years: [2023, 2024, 2025], note: 'Renamed from GC Logistics Solutions (GCL) on 2024-09-05' },
  { name: 'GC Polyols Company Limited', years: [2023, 2024, 2025] },
  { name: 'Global Green Chemicals Public Company Limited', years: [2023, 2024, 2025] },
  { name: 'PTT MCC Biochem Company Limited', years: [2023, 2024, 2025] },
  { name: 'PTT Asahi Chemical Company Limited', years: [2023, 2024], note: 'Operations ceased — JV, 50% shareholding' },
  { name: 'HMC Polymers Company Limited', years: [2023, 2024, 2025], note: '41.44% shareholding — largest shareholder' },
  { name: 'GC-M PTA Company Limited', years: [2023, 2024, 2025] },
  { name: 'Thai PET Resin Company Limited', years: [2023, 2024, 2025] },
  { name: 'ENVICCO Company Limited', years: [2023, 2024, 2025] },
] as const

// ═══════════════════════════════════════════
// Historical values — GC Group (Thailand)
// ═══════════════════════════════════════════

export const PTTGC_HISTORICAL_VALUES: HistoricalValue[] = [
  // ─── Financial Capital (GRI 201-1) ───
  {
    griCode: '201-1 (2016)', section: 'Financial Capital', subsection: 'Direct Economic Value Generated',
    lineItem: 'Sales revenue', unit: 'Million baht', scopeKey: null, reportingScope: 'group',
    values: { 2022: 678267, 2023: 616635, 2024: 604045, 2025: 484907 },
    sourceReport: 'PTTGC FY2025 SPD — p.7',
  },
  {
    griCode: '201-1 (2016)', section: 'Financial Capital', subsection: 'Direct Economic Value Generated',
    lineItem: 'Revenues from sale of goods and rendering of services', unit: 'Million baht', scopeKey: null, reportingScope: 'group',
    values: { 2022: 683954, 2023: 621631, 2024: 608550, 2025: 487585 },
    sourceReport: 'PTTGC FY2025 SPD — p.7',
  },
  {
    griCode: '201-1 (2016)', section: 'Financial Capital', subsection: 'Direct Economic Value Generated',
    lineItem: 'Net sales plus revenues from financial investments and sales of assets', unit: 'Million baht', scopeKey: null, reportingScope: 'group',
    values: { 2022: 684968, 2023: 625647, 2024: 610366, 2025: 489057 },
    sourceReport: 'PTTGC FY2025 SPD — p.7',
  },
  {
    griCode: '201-1 (2016)', section: 'Financial Capital', subsection: 'Economic Value Distributed',
    lineItem: 'Employee wages and benefits', unit: 'Million baht', scopeKey: null, reportingScope: 'group',
    values: { 2022: 8746, 2023: 12868, 2024: 12547, 2025: 12244 },
    sourceReport: 'PTTGC FY2025 SPD — p.7',
  },
  {
    griCode: '201-1 (2016)', section: 'Financial Capital', subsection: 'Economic Value Distributed',
    lineItem: 'Operating cost', unit: 'Million baht', scopeKey: null, reportingScope: 'group',
    values: { 2022: 668947, 2023: 618411, 2024: 625108, 2025: 501385 },
    sourceReport: 'PTTGC FY2025 SPD — p.7',
  },
  {
    griCode: '201-1 (2016)', section: 'Financial Capital', subsection: 'Economic Value Distributed',
    lineItem: 'Payments to government: Gross taxes', unit: 'Million baht', scopeKey: null, reportingScope: 'group',
    values: { 2022: 3346, 2023: 1729, 2024: 2130, 2025: 1237 },
    sourceReport: 'PTTGC FY2025 SPD — p.7',
  },
  {
    griCode: '201-1 (2016)', section: 'Financial Capital', subsection: 'Economic Value Distributed',
    lineItem: 'Payments to providers of capital: Dividends paid', unit: 'Million baht', scopeKey: null, reportingScope: 'group',
    values: { 2022: 11746, 2023: 1269, 2024: 3503, 2025: 2517 },
    sourceReport: 'PTTGC FY2025 SPD — p.7',
  },
  {
    griCode: '201-1 (2016)', section: 'Financial Capital', subsection: 'Economic Value Distributed',
    lineItem: 'Community investments', unit: 'Million baht', scopeKey: null, reportingScope: 'group',
    values: { 2022: 77.27, 2023: 56.54, 2024: 46.91, 2025: 17.12 },
    sourceReport: 'PTTGC FY2025 SPD — p.7',
  },
  {
    griCode: '201-1 (2016)', section: 'Financial Capital', subsection: 'Economic Value Distributed',
    lineItem: 'Economic value retained', unit: 'Million baht', scopeKey: null, reportingScope: 'group',
    values: { 2022: -6802, 2023: -8686, 2024: -32696, 2025: -28343 },
    sourceReport: 'PTTGC FY2025 SPD — p.7',
  },
  {
    griCode: '204-1 (2016)', section: 'Financial Capital', subsection: 'Procurement Practices',
    lineItem: 'Proportion of spending on local suppliers in Thailand', unit: '%', scopeKey: null, reportingScope: 'group',
    values: { 2022: 81, 2023: 81, 2024: 76, 2025: 84 },
    sourceReport: 'PTTGC FY2025 SPD — p.7',
  },

  // ─── Manufacture Capital (GRI 2-5) ───
  {
    griCode: '2-5 (2021)', section: 'Manufacture Capital', subsection: 'Return on Environmental Investment',
    lineItem: 'Total expenditures', unit: 'Million baht', scopeKey: null, reportingScope: 'group',
    values: { 2022: 1453, 2023: 2039, 2024: 1940, 2025: 2036 },
    sourceReport: 'PTTGC FY2025 SPD — p.8',
  },
  {
    griCode: '2-5 (2021)', section: 'Manufacture Capital', subsection: 'Return on Environmental Investment',
    lineItem: 'Capital investments', unit: 'Million baht', scopeKey: null, reportingScope: 'group',
    values: { 2022: 546, 2023: 961, 2024: 887, 2025: 1190 },
    sourceReport: 'PTTGC FY2025 SPD — p.8',
  },
  {
    griCode: '2-5 (2021)', section: 'Manufacture Capital', subsection: 'Return on Environmental Investment',
    lineItem: 'Operating expenses', unit: 'Million baht', scopeKey: null, reportingScope: 'group',
    values: { 2022: 907, 2023: 1078, 2024: 1053, 2025: 846 },
    sourceReport: 'PTTGC FY2025 SPD — p.8',
  },
  {
    griCode: '2-5 (2021)', section: 'Manufacture Capital', subsection: 'Return on Environmental Investment',
    lineItem: 'Waste disposal, emission treatment, and remediation costs', unit: 'Million baht', scopeKey: null, reportingScope: 'group',
    values: { 2022: 840, 2023: 1009, 2024: 994, 2025: 814 },
    sourceReport: 'PTTGC FY2025 SPD — p.8',
  },
  {
    griCode: '2-5 (2021)', section: 'Manufacture Capital', subsection: 'Return on Environmental Investment',
    lineItem: 'Prevention and environmental management costs', unit: 'Million baht', scopeKey: null, reportingScope: 'group',
    values: { 2022: 67, 2023: 69, 2024: 59, 2025: 32 },
    sourceReport: 'PTTGC FY2025 SPD — p.8',
  },
  {
    griCode: '2-5 (2021)', section: 'Manufacture Capital', subsection: 'Return on Environmental Investment',
    lineItem: 'Savings, cost avoidance, income, tax incentives, etc.', unit: 'Million baht', scopeKey: null, reportingScope: 'group',
    values: { 2022: 494, 2023: 585, 2024: 380, 2025: 389.48 },
    sourceReport: 'PTTGC FY2025 SPD — p.8',
  },

  // ─── Human Capital — Workforce totals (GRI 2-7, 2-8) ───
  {
    griCode: '2-7 (2021)', section: 'Human Capital', subsection: 'Workforce',
    lineItem: 'Total employee', unit: 'Persons', scopeKey: 'total', reportingScope: 'group',
    values: { 2022: 7668, 2023: 6405, 2024: 7936, 2025: 6129 },
    sourceReport: 'PTTGC FY2025 SPD — p.9',
  },
  {
    griCode: '2-7 (2021)', section: 'Human Capital', subsection: 'Workforce',
    lineItem: 'Total employee', unit: 'Persons', scopeKey: 'male', reportingScope: 'group',
    values: { 2022: 4709, 2023: 4680, 2024: 5869, 2025: 4444 },
    sourceReport: 'PTTGC FY2025 SPD — p.9',
  },
  {
    griCode: '2-7 (2021)', section: 'Human Capital', subsection: 'Workforce',
    lineItem: 'Total employee', unit: 'Persons', scopeKey: 'female', reportingScope: 'group',
    values: { 2022: 1740, 2023: 1725, 2024: 2067, 2025: 1685 },
    sourceReport: 'PTTGC FY2025 SPD — p.9',
  },
  {
    griCode: '2-8 (2021)', section: 'Human Capital', subsection: 'Workforce',
    lineItem: 'Contractor', unit: 'Persons', scopeKey: 'total', reportingScope: 'group',
    values: { 2022: 2819, 2023: 805, 2024: 741, 2025: 2268 },
    sourceReport: 'PTTGC FY2025 SPD — p.9',
  },
  {
    griCode: '2-7 (2021)', section: 'Human Capital', subsection: 'Workforce by Area',
    lineItem: 'Total Employee — Rayong', unit: 'Persons', scopeKey: 'male', reportingScope: 'group',
    values: { 2022: 4309, 2023: 4294, 2024: 5464, 2025: 4033 },
    sourceReport: 'PTTGC FY2025 SPD — p.9',
  },
  {
    griCode: '2-7 (2021)', section: 'Human Capital', subsection: 'Workforce by Area',
    lineItem: 'Total Employee — Rayong', unit: 'Persons', scopeKey: 'female', reportingScope: 'group',
    values: { 2022: 1114, 2023: 1102, 2024: 1444, 2025: 1076 },
    sourceReport: 'PTTGC FY2025 SPD — p.9',
  },

  // ─── Human Capital — Hires (GRI 401-1) ───
  {
    griCode: '401-1 (2016)', section: 'Human Capital', subsection: 'New Employees',
    lineItem: 'New employee (total)', unit: 'Persons', scopeKey: null, reportingScope: 'group',
    values: { 2022: 296, 2023: 231, 2024: 199, 2025: 130 },
    sourceReport: 'PTTGC FY2025 SPD — p.11',
  },
  {
    griCode: '401-1 (2016)', section: 'Human Capital', subsection: 'New Employees',
    lineItem: 'New hire rate', unit: '% of total employees', scopeKey: null, reportingScope: 'group',
    values: { 2022: 3.86, 2023: 3.61, 2024: 2.51, 2025: 2.12 },
    sourceReport: 'PTTGC FY2025 SPD — p.11',
  },
  {
    griCode: '401-1 (2016)', section: 'Human Capital', subsection: 'Turnover',
    lineItem: 'Total employee turnover rate', unit: 'Persons', scopeKey: null, reportingScope: 'group',
    values: { 2022: 365, 2023: 336, 2024: 287, 2025: 341 },
    sourceReport: 'PTTGC FY2025 SPD — p.12',
  },
  {
    griCode: '401-1 (2016)', section: 'Human Capital', subsection: 'Turnover',
    lineItem: 'Voluntary employee turnover rate', unit: 'Persons', scopeKey: null, reportingScope: 'group',
    values: { 2022: 306, 2023: 266, 2024: 209, 2025: 229 },
    sourceReport: 'PTTGC FY2025 SPD — p.12',
  },

  // ─── Human Capital — Training (GRI 404-1) ───
  {
    griCode: '404-1 (2016)', section: 'Human Capital', subsection: 'Training and Development',
    lineItem: 'Average hours per FTE of training and development', unit: 'Hours/person/year', scopeKey: null, reportingScope: 'group',
    values: { 2022: 45.26, 2023: 40.33, 2024: 36.18, 2025: 61.28 },
    sourceReport: 'PTTGC FY2025 SPD — p.13',
  },
  {
    griCode: '404-1 (2016)', section: 'Human Capital', subsection: 'Training and Development',
    lineItem: 'Average amount spent per FTE on training and development', unit: 'Baht/person/year', scopeKey: null, reportingScope: 'group',
    values: { 2022: 14290.47, 2023: 13241.70, 2024: 13076.24, 2025: 10125.63 },
    sourceReport: 'PTTGC FY2025 SPD — p.13',
  },

  // ─── Human Capital — Gender diversity (GRI 405-1) ───
  {
    griCode: '405-1 (2016)', section: 'Human Capital', subsection: 'Gender Diversity',
    lineItem: 'Women in workforce', unit: '% of total workforce', scopeKey: null, reportingScope: 'group',
    values: { 2022: null, 2023: null, 2024: 26, 2025: 27.49 },
    sourceReport: 'PTTGC FY2025 SPD — p.15',
  },
  {
    griCode: '405-1 (2016)', section: 'Human Capital', subsection: 'Gender Diversity',
    lineItem: 'Women in management positions', unit: '% of total management workforce', scopeKey: null, reportingScope: 'group',
    values: { 2022: null, 2023: null, 2024: 31, 2025: 31 },
    sourceReport: 'PTTGC FY2025 SPD — p.15',
  },
  {
    griCode: '405-1 (2016)', section: 'Human Capital', subsection: 'Gender Diversity',
    lineItem: 'Women on board of directors', unit: 'Persons', scopeKey: null, reportingScope: 'group',
    values: { 2022: null, 2023: null, 2024: 1, 2025: 5 },
    sourceReport: 'PTTGC FY2025 SPD — p.16',
  },

  // ─── Human Capital — Pay gap (GRI 405-2) ───
  {
    griCode: '405-2 (2016)', section: 'Human Capital', subsection: 'Equal Remuneration',
    lineItem: 'Mean gender pay gap', unit: '%', scopeKey: null, reportingScope: 'group',
    values: { 2022: null, 2023: null, 2024: null, 2025: 93.51 },
    sourceReport: 'PTTGC FY2025 SPD — p.16',
  },
  {
    griCode: '405-2 (2016)', section: 'Human Capital', subsection: 'Equal Remuneration',
    lineItem: 'Median gender pay gap', unit: '%', scopeKey: null, reportingScope: 'group',
    values: { 2022: null, 2023: null, 2024: null, 2025: 91.35 },
    sourceReport: 'PTTGC FY2025 SPD — p.16',
  },

  // ─── Health & Safety (GRI 403-9) ───
  {
    griCode: '403-9 (2018)', section: 'Human Capital', subsection: 'Health & Safety',
    lineItem: 'Fatalities (employees)', unit: 'Case', scopeKey: null, reportingScope: 'group',
    values: { 2022: 1, 2023: 0, 2024: 0, 2025: 0 },
    sourceReport: 'PTTGC FY2025 SPD — p.17',
  },
  {
    griCode: '403-9 (2018)', section: 'Human Capital', subsection: 'Health & Safety',
    lineItem: 'Fatalities (contractors)', unit: 'Case', scopeKey: null, reportingScope: 'group',
    values: { 2022: 1, 2023: 0, 2024: 0, 2025: 0 },
    sourceReport: 'PTTGC FY2025 SPD — p.17',
  },
  {
    griCode: '403-9 (2018)', section: 'Human Capital', subsection: 'Health & Safety',
    lineItem: 'Total Recordable Work-Injuries (employees)', unit: 'Case', scopeKey: null, reportingScope: 'group',
    values: { 2022: 8, 2023: 1, 2024: 3, 2025: 2 },
    sourceReport: 'PTTGC FY2025 SPD — p.19',
  },
  {
    griCode: '403-9 (2018)', section: 'Human Capital', subsection: 'Health & Safety',
    lineItem: 'Total Recordable Work-Injuries (contractors)', unit: 'Case', scopeKey: null, reportingScope: 'group',
    values: { 2022: 13, 2023: 16, 2024: 5, 2025: 3 },
    sourceReport: 'PTTGC FY2025 SPD — p.19',
  },
  {
    griCode: '403-9 (2018)', section: 'Human Capital', subsection: 'Health & Safety',
    lineItem: 'TRIR (employees)', unit: 'Case/1 million manhours', scopeKey: null, reportingScope: 'group',
    values: { 2022: 0.46, 2023: 0.06, 2024: 0.17, 2025: 0.11 },
    sourceReport: 'PTTGC FY2025 SPD — p.19',
  },
  {
    griCode: '403-9 (2018)', section: 'Human Capital', subsection: 'Health & Safety',
    lineItem: 'TRIR (contractors)', unit: 'Case/1 million manhours', scopeKey: null, reportingScope: 'group',
    values: { 2022: 0.59, 2023: 0.77, 2024: 0.39, 2025: 0.22 },
    sourceReport: 'PTTGC FY2025 SPD — p.19',
  },
  {
    griCode: '403-9 (2018)', section: 'Human Capital', subsection: 'Health & Safety',
    lineItem: 'LTIFR (contractors)', unit: 'Case/1 million manhours', scopeKey: null, reportingScope: 'group',
    values: { 2022: 0.09, 2023: 0.24, 2024: 0, 2025: 0.22 },
    sourceReport: 'PTTGC FY2025 SPD — p.20',
  },
  {
    griCode: 'G4-OG13', section: 'Human Capital', subsection: 'Process Safety',
    lineItem: 'Process Safety Events — Tier 1', unit: 'Number per million hours worked', scopeKey: null, reportingScope: 'group',
    values: { 2022: 2, 2023: 1, 2024: 0, 2025: 0 },
    targetFy2026: 0,
    sourceReport: 'PTTGC FY2025 SPD — p.21',
  },
  {
    griCode: 'G4-OG13', section: 'Human Capital', subsection: 'Process Safety',
    lineItem: 'Process Safety Events — Tier 2', unit: 'Number per million hours worked', scopeKey: null, reportingScope: 'group',
    values: { 2022: 4, 2023: 1, 2024: 5, 2025: 5 },
    sourceReport: 'PTTGC FY2025 SPD — p.21',
  },

  // ─── Social & Relationship Capital — Governance ───
  {
    griCode: '2-9 (2021)', section: 'Social & Relationship Capital', subsection: 'Board Structure',
    lineItem: 'Total number of board members', unit: 'Persons', scopeKey: null, reportingScope: 'group',
    values: { 2022: 14, 2023: 15, 2024: 15, 2025: 15 },
    sourceReport: 'PTTGC FY2025 SPD — p.16, p.23',
  },
  {
    griCode: '2-9 (2021)', section: 'Social & Relationship Capital', subsection: 'Board Effectiveness',
    lineItem: 'Average board meeting attendance', unit: '%', scopeKey: null, reportingScope: 'group',
    values: { 2022: 99.5, 2023: 99.1, 2024: 98.9, 2025: 100 },
    sourceReport: 'PTTGC FY2025 SPD — p.23',
  },
  {
    griCode: '2-21 (2021)', section: 'Social & Relationship Capital', subsection: 'Executive Compensation',
    lineItem: 'Total compensation of CEO', unit: 'Baht', scopeKey: null, reportingScope: 'group',
    values: { 2022: 22460000, 2023: 17799000, 2024: 18546000, 2025: 18882000 },
    sourceReport: 'PTTGC FY2025 SPD — p.23',
  },
  {
    griCode: '2-21 (2021)', section: 'Social & Relationship Capital', subsection: 'CEO Pay Ratio',
    lineItem: 'Ratio of median employee compensation to CEO total annual compensation', unit: 'Ratio', scopeKey: null, reportingScope: 'group',
    values: { 2022: 23, 2023: 11.51, 2024: 10.95, 2025: 11.30 },
    sourceReport: 'PTTGC FY2025 SPD — p.24',
  },

  // ─── Compliance (GRI 205, 206, 406, 2-27) ───
  {
    griCode: '205-2 (2016)', section: 'Social & Relationship Capital', subsection: 'Anti-Bribery and Corruption',
    lineItem: 'ABC communicated to employees', unit: 'Persons', scopeKey: null, reportingScope: 'group',
    values: { 2022: 7668, 2023: 7425, 2024: 8711, 2025: 6129 },
    sourceReport: 'PTTGC FY2025 SPD — p.25',
  },
  {
    griCode: '205-3 (2016)', section: 'Social & Relationship Capital', subsection: 'Code of Conduct Breaches',
    lineItem: 'Code of Conduct complaints (total)', unit: 'Case', scopeKey: null, reportingScope: 'group',
    values: { 2022: 5, 2023: 9, 2024: 13, 2025: 8 },
    sourceReport: 'PTTGC FY2025 SPD — p.27',
  },
  {
    griCode: '205-3 (2016)', section: 'Social & Relationship Capital', subsection: 'Code of Conduct Breaches',
    lineItem: 'Confirmed corruption cases', unit: 'Case', scopeKey: null, reportingScope: 'group',
    values: { 2022: 0, 2023: 2, 2024: 1, 2025: 0 },
    sourceReport: 'PTTGC FY2025 SPD — p.28',
  },
  {
    griCode: '206-1 (2016)', section: 'Social & Relationship Capital', subsection: 'Anticompetitive Practices',
    lineItem: 'Fines/settlements related to antitrust/anticompetitive', unit: 'Baht', scopeKey: null, reportingScope: 'group',
    values: { 2022: 0, 2023: 0, 2024: 0, 2025: 0 },
    sourceReport: 'PTTGC FY2025 SPD — p.27',
  },
  {
    griCode: '2-27 (2021)', section: 'Social & Relationship Capital', subsection: 'Non-Compliance',
    lineItem: 'Significant non-compliance instances with fines', unit: 'Case', scopeKey: null, reportingScope: 'group',
    values: { 2022: 0, 2023: 0, 2024: 0, 2025: 0 },
    sourceReport: 'PTTGC FY2025 SPD — p.28',
  },

  // ─── Supply Chain (GRI 308, 414, 2-6) ───
  {
    griCode: '308-1 (2016)', section: 'Social & Relationship Capital', subsection: 'Supply Chain',
    lineItem: 'New suppliers screened using environmental criteria', unit: '% of new suppliers', scopeKey: null, reportingScope: 'group',
    values: { 2022: 100, 2023: 100, 2024: 100, 2025: 100 },
    sourceReport: 'PTTGC FY2025 SPD — p.29',
  },
  {
    griCode: '414-1 (2016)', section: 'Social & Relationship Capital', subsection: 'Supply Chain',
    lineItem: 'New suppliers screened using social criteria', unit: '% of new suppliers', scopeKey: null, reportingScope: 'group',
    values: { 2022: 100, 2023: 100, 2024: 100, 2025: 100 },
    sourceReport: 'PTTGC FY2025 SPD — p.29',
  },
  {
    griCode: '2-6 (2021)', section: 'Social & Relationship Capital', subsection: 'Supply Chain',
    lineItem: 'Total number of Tier-1 suppliers', unit: 'Number', scopeKey: null, reportingScope: 'group',
    values: { 2022: 4242, 2023: 4241, 2024: 4216, 2025: 4222 },
    sourceReport: 'PTTGC FY2025 SPD — p.29',
  },
  {
    griCode: '2-6 (2021)', section: 'Social & Relationship Capital', subsection: 'Supply Chain',
    lineItem: 'Significant suppliers in Tier-1', unit: 'Number', scopeKey: null, reportingScope: 'group',
    values: { 2022: 84, 2023: 153, 2024: 200, 2025: 201 },
    sourceReport: 'PTTGC FY2025 SPD — p.29',
  },

  // ─── CSR (GRI 201-1 CSR, 413-1) ───
  {
    griCode: '201-1 (2016)', section: 'Social & Relationship Capital', subsection: 'Philanthropic Activities',
    lineItem: 'Total contributions', unit: 'Million Baht', scopeKey: null, reportingScope: 'group',
    values: { 2022: 142.29, 2023: 106.28, 2024: 72.77, 2025: 69.62 },
    sourceReport: 'PTTGC FY2025 SPD — p.29',
  },
  {
    griCode: '413-1', section: 'Social & Relationship Capital', subsection: 'Local Community',
    lineItem: 'Community satisfaction survey', unit: '%', scopeKey: null, reportingScope: 'group',
    values: { 2022: 90.46, 2023: 92.38, 2024: 92.72, 2025: 92.72 },
    targetFy2026: 86,
    sourceReport: 'PTTGC FY2025 SPD — p.30',
  },

  // ─── Natural Capital — Materials (GRI 301-1) ───
  {
    griCode: '301-1 (2016)', section: 'Natural Capital', subsection: 'Materials',
    lineItem: 'Total material used', unit: 'Million tons', scopeKey: null, reportingScope: 'group',
    values: { 2022: 25.41, 2023: 26.95, 2024: 27.51, 2025: 24.41 },
    sourceReport: 'PTTGC FY2025 SPD — p.31',
  },
  {
    griCode: '301-1 (2016)', section: 'Natural Capital', subsection: 'Materials',
    lineItem: 'Non-renewable material', unit: 'Million tons', scopeKey: null, reportingScope: 'group',
    values: { 2022: 24.89, 2023: 26.41, 2024: 27.03, 2025: 23.84 },
    sourceReport: 'PTTGC FY2025 SPD — p.31',
  },
  {
    griCode: '301-1 (2016)', section: 'Natural Capital', subsection: 'Materials',
    lineItem: 'Renewable material', unit: 'Million tons', scopeKey: null, reportingScope: 'group',
    values: { 2022: 0.52, 2023: 0.54, 2024: 0.47, 2025: 0.57 },
    sourceReport: 'PTTGC FY2025 SPD — p.31',
  },

  // ─── Natural Capital — Energy (GRI 302) ───
  {
    griCode: '302-1 (2016)', section: 'Natural Capital', subsection: 'Energy',
    lineItem: 'Total energy consumed', unit: 'MWh', scopeKey: null, reportingScope: 'group',
    values: { 2022: 36882002.30, 2023: 39301803.77, 2024: 36410566.73, 2025: 34987371.24 },
    sourceReport: 'PTTGC FY2025 SPD — p.31',
  },
  {
    griCode: '302-1 (2016)', section: 'Natural Capital', subsection: 'Energy',
    lineItem: 'Total direct non-renewable energy consumption', unit: 'MWh', scopeKey: null, reportingScope: 'group',
    values: { 2022: 31365326.88, 2023: 33778672.42, 2024: 33707316.68, 2025: 31797313.56 },
    sourceReport: 'PTTGC FY2025 SPD — p.31',
  },
  {
    griCode: '302-1 (2016)', section: 'Natural Capital', subsection: 'Energy',
    lineItem: 'Natural gas', unit: 'MWh', scopeKey: null, reportingScope: 'group',
    values: { 2022: 12825626.08, 2023: 12448018.55, 2024: 13890581.99, 2025: 10807102.63 },
    sourceReport: 'PTTGC FY2025 SPD — p.31',
  },
  {
    griCode: '302-1 (2016)', section: 'Natural Capital', subsection: 'Energy',
    lineItem: 'Electricity (non-renewable) purchased', unit: 'MWh', scopeKey: null, reportingScope: 'group',
    values: { 2022: 2742560.64, 2023: 3125734.31, 2024: 2332510.05, 2025: 2656395.32 },
    sourceReport: 'PTTGC FY2025 SPD — p.31',
  },
  {
    griCode: '302-1 (2016)', section: 'Natural Capital', subsection: 'Energy',
    lineItem: 'Steam (non-renewable) purchased', unit: 'MWh', scopeKey: null, reportingScope: 'group',
    values: { 2022: 7114719.25, 2023: 8073448.39, 2024: 6311363.71, 2025: 6400341.82 },
    sourceReport: 'PTTGC FY2025 SPD — p.31',
  },
  {
    griCode: '302-1 (2016)', section: 'Natural Capital', subsection: 'Energy',
    lineItem: 'Total renewable energy (solar + wind)', unit: 'MWh', scopeKey: null, reportingScope: 'group',
    values: { 2022: 1339.37, 2023: 6203.73, 2024: 10768.53, 2025: 10662.60 },
    sourceReport: 'PTTGC FY2025 SPD — p.31',
  },
  {
    griCode: '302-4 (2016)', section: 'Natural Capital', subsection: 'Energy',
    lineItem: 'Total energy saved', unit: 'MWh', scopeKey: null, reportingScope: 'group',
    values: { 2022: 400235.70, 2023: 205386.20, 2024: 267167.23, 2025: 441582.92 },
    sourceReport: 'PTTGC FY2025 SPD — p.32',
  },

  // ─── Natural Capital — GHG Emissions (GRI 305) — HERO DATA ───
  {
    griCode: '305-1 (2016)', section: 'Natural Capital', subsection: 'Greenhouse Gas Emissions (GHGs)',
    lineItem: 'Total direct GHGs emissions (scope 1)', unit: 'Million tons CO2 equivalent', scopeKey: null, reportingScope: 'group',
    values: { 2022: 6.14, 2023: 6.13, 2024: 6.17, 2025: 5.77 },
    targetFy2026: 7.05,
    sourceReport: 'PTTGC FY2025 SPD — p.32',
    footnoteRefs: ['IPCC 2006', 'WRI GHG protocol', 'ISO 14064', 'operational control approach'],
  },
  {
    griCode: '305-1 (2016)', section: 'Natural Capital', subsection: 'Greenhouse Gas Emissions (GHGs)',
    lineItem: 'Direct GHG emissions from methane', unit: 'Million tons CO2 equivalent', scopeKey: null, reportingScope: 'group',
    values: { 2022: 0.32, 2023: 0.35, 2024: 0.33, 2025: 0.35 },
    sourceReport: 'PTTGC FY2025 SPD — p.32',
  },
  {
    griCode: '305-1 (2016)', section: 'Natural Capital', subsection: 'Greenhouse Gas Emissions (GHGs)',
    lineItem: 'Total biogenic CO2 emissions (scope 1)', unit: 'Tons CO2 equivalent', scopeKey: null, reportingScope: 'group',
    values: { 2022: 150, 2023: 166, 2024: 152, 2025: 158 },
    sourceReport: 'PTTGC FY2025 SPD — p.32',
  },
  {
    griCode: '305-2 (2016)', section: 'Natural Capital', subsection: 'Greenhouse Gas Emissions (GHGs)',
    lineItem: 'Indirect GHGs emissions (scope 2) — market-based', unit: 'Million tons CO2 equivalent', scopeKey: 'market', reportingScope: 'group',
    values: { 2022: 2.00, 2023: 1.80, 2024: 1.66, 2025: 1.51 },
    targetFy2026: 1.84,
    sourceReport: 'PTTGC FY2025 SPD — p.32',
  },
  {
    griCode: '305-2 (2016)', section: 'Natural Capital', subsection: 'Greenhouse Gas Emissions (GHGs)',
    lineItem: 'Indirect GHGs emissions (scope 2) — location-based', unit: 'Million tons CO2 equivalent', scopeKey: 'location', reportingScope: 'group',
    values: { 2022: 2.00, 2023: 1.79, 2024: 1.85, 2025: 1.69 },
    sourceReport: 'PTTGC FY2025 SPD — p.32',
  },
  {
    griCode: '305-3 (2016)', section: 'Natural Capital', subsection: 'Greenhouse Gas Emissions (GHGs)',
    lineItem: 'Other relevant indirect GHG emission (scope 3)', unit: 'Million tons CO2 equivalent', scopeKey: null, reportingScope: 'group',
    values: { 2022: 36.40, 2023: 41.20, 2024: 40.20, 2025: 35.78 },
    sourceReport: 'PTTGC FY2025 SPD — p.32',
    footnoteRefs: ['Categories 1, 2, 3, 4, 5 (polymer products), 6, 7, 8, 9, 15 (JV included in Cat. 15)'],
  },
  {
    griCode: '305-4 (2016)', section: 'Natural Capital', subsection: 'Greenhouse Gas Emissions (GHGs)',
    lineItem: 'GHG emission intensity (scope 1 & 2)', unit: 'Tons CO2 equivalent / tons production', scopeKey: null, reportingScope: 'group',
    values: { 2022: 0.40, 2023: 0.37, 2024: 0.36, 2025: 0.37 },
    sourceReport: 'PTTGC FY2025 SPD — p.33',
  },
  {
    griCode: '305-5 (2016)', section: 'Natural Capital', subsection: 'Greenhouse Gas Emissions (GHGs)',
    lineItem: 'Total estimated annual CO2 savings', unit: 'Tons CO2 equivalent', scopeKey: null, reportingScope: 'group',
    values: { 2022: 59903, 2023: 36981, 2024: 39351, 2025: 85198 },
    targetFy2026: 26400,
    sourceReport: 'PTTGC FY2025 SPD — p.33',
  },

  // ─── Natural Capital — Air emissions (GRI 305-7) ───
  {
    griCode: '305-7 (2016)', section: 'Natural Capital', subsection: 'Air Emissions',
    lineItem: 'Volatile organic compounds (VOCs)', unit: 'Tons VOCs', scopeKey: null, reportingScope: 'group',
    values: { 2022: 482, 2023: 571, 2024: 574, 2025: 448 },
    targetFy2026: 480,
    sourceReport: 'PTTGC FY2025 SPD — p.33',
  },
  {
    griCode: '305-7 (2016)', section: 'Natural Capital', subsection: 'Air Emissions',
    lineItem: 'Nitrogen oxides (NOx) emissions', unit: 'Tons NOx', scopeKey: null, reportingScope: 'group',
    values: { 2022: 3213, 2023: 2748, 2024: 3268, 2025: 2712 },
    targetFy2026: 2750,
    sourceReport: 'PTTGC FY2025 SPD — p.33',
  },
  {
    griCode: '305-7 (2016)', section: 'Natural Capital', subsection: 'Air Emissions',
    lineItem: 'Sulfur oxides (SOx) emissions', unit: 'Tons SOx', scopeKey: null, reportingScope: 'group',
    values: { 2022: 492, 2023: 429, 2024: 510, 2025: 363 },
    targetFy2026: 380,
    sourceReport: 'PTTGC FY2025 SPD — p.33',
  },

  // ─── Natural Capital — Water (GRI 303) ───
  {
    griCode: '303-3 (2018)', section: 'Natural Capital', subsection: 'Water',
    lineItem: 'Total water withdrawal from all areas', unit: 'Mega litres', scopeKey: null, reportingScope: 'group',
    values: { 2022: 55866.94, 2023: 56100.89, 2024: 60523.72, 2025: 56865.63 },
    sourceReport: 'PTTGC FY2025 SPD — p.34',
  },
  {
    griCode: '303-3 (2018)', section: 'Natural Capital', subsection: 'Water',
    lineItem: 'Fresh water withdrawal (≤1,000 mg/L TDS)', unit: 'Mega litres', scopeKey: null, reportingScope: 'group',
    values: { 2022: 48247.54, 2023: 48971.10, 2024: 52302.57, 2025: 47842.25 },
    sourceReport: 'PTTGC FY2025 SPD — p.34',
  },
  {
    griCode: '303-3 (2018)', section: 'Natural Capital', subsection: 'Water',
    lineItem: 'Third-party (municipal) water', unit: 'Mega litres', scopeKey: 'fresh', reportingScope: 'group',
    values: { 2022: 47958.21, 2023: 48552.29, 2024: 51705.02, 2025: 47022.02 },
    sourceReport: 'PTTGC FY2025 SPD — p.34',
  },
  {
    griCode: '303-3 (2018)', section: 'Natural Capital', subsection: 'Water',
    lineItem: 'Seawater withdrawal', unit: 'Mega litres', scopeKey: null, reportingScope: 'group',
    values: { 2022: 7569, 2023: 6998, 2024: 8012.71, 2025: 8809 },
    sourceReport: 'PTTGC FY2025 SPD — p.34',
  },
  {
    griCode: '303-4 (2018)', section: 'Natural Capital', subsection: 'Water',
    lineItem: 'Total water discharge to all areas', unit: 'Mega litres', scopeKey: null, reportingScope: 'group',
    values: { 2022: 19617.99, 2023: 24725.74, 2024: 25243.85, 2025: 20163.10 },
    sourceReport: 'PTTGC FY2025 SPD — p.35',
  },
  {
    griCode: '303-4 (2018)', section: 'Natural Capital', subsection: 'Water',
    lineItem: 'Total direct COD', unit: 'Tons', scopeKey: null, reportingScope: 'group',
    values: { 2022: 1410, 2023: 1246, 2024: 1116, 2025: 1069 },
    targetFy2026: 1100,
    sourceReport: 'PTTGC FY2025 SPD — p.35',
  },
  {
    griCode: '303-5 (2018)', section: 'Natural Capital', subsection: 'Water',
    lineItem: 'Total net fresh water consumption', unit: 'Million m³', scopeKey: null, reportingScope: 'group',
    values: { 2022: 38.44, 2023: 36.61, 2024: 39.66, 2025: 37.76 },
    targetFy2026: 38.00,
    sourceReport: 'PTTGC FY2025 SPD — p.34',
  },
  {
    griCode: '303-5 (2018)', section: 'Natural Capital', subsection: 'Water',
    lineItem: 'Water recycled & reused', unit: 'Mega litres', scopeKey: null, reportingScope: 'group',
    values: { 2022: 1655.01, 2023: 2466.45, 2024: 1870.50, 2025: 2233.38 },
    sourceReport: 'PTTGC FY2025 SPD — p.35',
  },

  // ─── Natural Capital — Waste (GRI 306) ───
  {
    griCode: '306-3 (2020)', section: 'Natural Capital', subsection: 'Waste',
    lineItem: 'Total waste generated (routine)', unit: 'Tons', scopeKey: null, reportingScope: 'group',
    values: { 2022: 136521.28, 2023: 121023.04, 2024: 85219.00, 2025: 77130.43 },
    sourceReport: 'PTTGC FY2025 SPD — p.35',
  },
  {
    griCode: '306-3 (2020)', section: 'Natural Capital', subsection: 'Waste',
    lineItem: 'Total hazardous waste generated (routine)', unit: 'Tons', scopeKey: null, reportingScope: 'group',
    values: { 2022: 95486.50, 2023: 85920.96, 2024: 51184.75, 2025: 44837.68 },
    targetFy2026: 38600,
    sourceReport: 'PTTGC FY2025 SPD — p.35',
  },
  {
    griCode: '306-3 (2020)', section: 'Natural Capital', subsection: 'Waste',
    lineItem: 'Total non-hazardous waste generated (routine)', unit: 'Tons', scopeKey: null, reportingScope: 'group',
    values: { 2022: 41034.79, 2023: 35102.08, 2024: 34034.25, 2025: 32292.76 },
    targetFy2026: 2300,
    sourceReport: 'PTTGC FY2025 SPD — p.36',
  },
  {
    griCode: '306-4 (2020)', section: 'Natural Capital', subsection: 'Waste',
    lineItem: 'Total weight of waste diverted from disposal', unit: 'Tons', scopeKey: null, reportingScope: 'group',
    values: { 2022: 41198.40, 2023: 34164.17, 2024: 37410.62, 2025: 36435.15 },
    sourceReport: 'PTTGC FY2025 SPD — p.36',
  },
  {
    griCode: '306-5 (2020)', section: 'Natural Capital', subsection: 'Waste',
    lineItem: 'Total weight of waste directed to disposal', unit: 'Tons', scopeKey: null, reportingScope: 'group',
    values: { 2022: 95322.88, 2023: 86858.87, 2024: 47808.38, 2025: 40695.29 },
    sourceReport: 'PTTGC FY2025 SPD — p.36',
  },
  {
    griCode: '306-3 (2016)', section: 'Natural Capital', subsection: 'Spills',
    lineItem: 'Oil spills', unit: 'Case', scopeKey: null, reportingScope: 'group',
    values: { 2022: 0, 2023: 0, 2024: 0, 2025: 0 },
    sourceReport: 'PTTGC FY2025 SPD — p.38',
  },

  // ─── Natural Capital — Operational Eco-Efficiency ───
  {
    griCode: 'operational', section: 'Natural Capital', subsection: 'Operational Eco-Efficiency',
    lineItem: 'Total production volume', unit: 'Million tons', scopeKey: null, reportingScope: 'group',
    values: { 2022: 20.20, 2023: 21.67, 2024: 21.99, 2025: 19.81 },
    sourceReport: 'PTTGC FY2025 SPD — p.39',
  },

  // ─── Natural Capital — Product Stewardship ───
  {
    griCode: '301-1 (2016)', section: 'Natural Capital', subsection: 'Product Stewardship',
    lineItem: 'Raw materials from renewable resources', unit: '% of total products', scopeKey: null, reportingScope: 'group',
    values: { 2022: 2.05, 2023: 2.01, 2024: 2.00, 2025: 2.34 },
    sourceReport: 'PTTGC FY2025 SPD — p.39',
  },
  {
    griCode: 'lca', section: 'Natural Capital', subsection: 'Product Stewardship',
    lineItem: 'Full product LCAs conducted', unit: '% of total products', scopeKey: null, reportingScope: 'group',
    values: { 2022: 4, 2023: 4, 2024: 4, 2025: 5 },
    sourceReport: 'PTTGC FY2025 SPD — p.39',
  },
  {
    griCode: 'hazardous', section: 'Natural Capital', subsection: 'Hazardous Substances',
    lineItem: 'Products containing Annex XVII REACH restricted substances', unit: '% of total products (by revenue)', scopeKey: null, reportingScope: 'group',
    values: { 2022: 4, 2023: 2, 2024: 2, 2025: 2 },
    sourceReport: 'PTTGC FY2025 SPD — p.39',
  },
  {
    griCode: 'hazardous', section: 'Natural Capital', subsection: 'Hazardous Substances',
    lineItem: 'Products containing GHS Category 1 and 2 health/environmental hazardous substances', unit: '% of total products', scopeKey: null, reportingScope: 'group',
    values: { 2022: 25, 2023: 23, 2024: 21, 2025: 21 },
    sourceReport: 'PTTGC FY2025 SPD — p.39',
  },

  // ═══════════════════════════════════════════
  // JV Parallel Scope (WHA GC Logistics + PTT MCC Biochem + HMC Polymers)
  // ═══════════════════════════════════════════

  // ─── JV Workforce (GRI 2-7) ───
  {
    griCode: '2-7 (2021)', section: 'Human Capital', subsection: 'Workforce',
    lineItem: 'Total employee (JV)', unit: 'Persons', scopeKey: 'total', reportingScope: 'jv',
    values: { 2022: 794, 2023: 930, 2024: 775, 2025: 776 },
    sourceReport: 'PTTGC FY2025 SPD — p.41',
  },
  {
    griCode: '2-8 (2021)', section: 'Human Capital', subsection: 'Workforce',
    lineItem: 'Contractor (JV)', unit: 'Persons', scopeKey: 'total', reportingScope: 'jv',
    values: { 2022: 620, 2023: 596, 2024: 535, 2025: 503 },
    sourceReport: 'PTTGC FY2025 SPD — p.41',
  },

  // ─── JV Energy (GRI 302) ───
  {
    griCode: '302-1 (2016)', section: 'Natural Capital', subsection: 'Energy',
    lineItem: 'Total energy consumed (JV)', unit: 'MWh', scopeKey: null, reportingScope: 'jv',
    values: { 2022: 1987500.77, 2023: 1717466.63, 2024: 540182.18, 2025: 1041708.57 },
    sourceReport: 'PTTGC FY2025 SPD — p.53',
  },

  // ─── JV Air emissions (GRI 305-7) ───
  {
    griCode: '305-7 (2016)', section: 'Natural Capital', subsection: 'Air Emissions',
    lineItem: 'VOCs (JV)', unit: 'Tons VOCs', scopeKey: null, reportingScope: 'jv',
    values: { 2022: 186, 2023: 163, 2024: 174, 2025: 119 },
    sourceReport: 'PTTGC FY2025 SPD — p.53',
  },
  {
    griCode: '305-7 (2016)', section: 'Natural Capital', subsection: 'Air Emissions',
    lineItem: 'NOx (JV)', unit: 'Tons NOx', scopeKey: null, reportingScope: 'jv',
    values: { 2022: 63, 2023: 40, 2024: 55, 2025: 31.64 },
    sourceReport: 'PTTGC FY2025 SPD — p.54',
  },
  {
    griCode: '305-7 (2016)', section: 'Natural Capital', subsection: 'Air Emissions',
    lineItem: 'SOx (JV)', unit: 'Tons SOx', scopeKey: null, reportingScope: 'jv',
    values: { 2022: 16.79, 2023: 17.09, 2024: 17.09, 2025: 0 },
    sourceReport: 'PTTGC FY2025 SPD — p.54',
  },

  // ─── JV Water (GRI 303) ───
  {
    griCode: '303-3 (2018)', section: 'Natural Capital', subsection: 'Water',
    lineItem: 'Total water withdrawal (JV)', unit: 'Mega litres', scopeKey: null, reportingScope: 'jv',
    values: { 2022: 11075.32, 2023: 10161.38, 2024: 10624.27, 2025: 3871.54 },
    sourceReport: 'PTTGC FY2025 SPD — p.54',
  },
  {
    griCode: '303-4 (2018)', section: 'Natural Capital', subsection: 'Water',
    lineItem: 'Total water discharge (JV)', unit: 'Mega litres', scopeKey: null, reportingScope: 'jv',
    values: { 2022: 4886.60, 2023: 4362.09, 2024: 4736.04, 2025: 886.93 },
    sourceReport: 'PTTGC FY2025 SPD — p.55',
  },
  {
    griCode: '303-5 (2018)', section: 'Natural Capital', subsection: 'Water',
    lineItem: 'Total net fresh water consumption (JV)', unit: 'Million m³', scopeKey: null, reportingScope: 'jv',
    values: { 2022: 6.19, 2023: 5.80, 2024: 5.89, 2025: 3.87 },
    sourceReport: 'PTTGC FY2025 SPD — p.54',
  },

  // ─── JV Waste (GRI 306) ───
  {
    griCode: '306-3 (2020)', section: 'Natural Capital', subsection: 'Waste',
    lineItem: 'Total waste generated (JV, routine)', unit: 'Tons', scopeKey: null, reportingScope: 'jv',
    values: { 2022: 5920.91, 2023: 4168.44, 2024: 7348.63, 2025: 2790.38 },
    sourceReport: 'PTTGC FY2025 SPD — p.56',
  },
  {
    griCode: '306-3 (2020)', section: 'Natural Capital', subsection: 'Waste',
    lineItem: 'Total hazardous waste generated (JV, routine)', unit: 'Tons', scopeKey: null, reportingScope: 'jv',
    values: { 2022: 3627.81, 2023: 2578.40, 2024: 4159.64, 2025: 768.74 },
    sourceReport: 'PTTGC FY2025 SPD — p.56',
  },

  // ─── JV Operational ───
  {
    griCode: 'operational', section: 'Natural Capital', subsection: 'Operational Eco-Efficiency',
    lineItem: 'Total production volume (JV)', unit: 'Million tons', scopeKey: null, reportingScope: 'jv',
    values: { 2022: 1.05, 2023: 0.84, 2024: 0.81, 2025: 0.99 },
    sourceReport: 'PTTGC FY2025 SPD — p.59',
    footnoteRefs: ['Recalculated in 2025 due to PTTAC cessation'],
  },
]

// ═══════════════════════════════════════════
// Derived / headline numbers for the Dashboard (SRD §3.3)
// ═══════════════════════════════════════════

export const PTTGC_HEADLINES = {
  reportingYear: 2025,
  reportingScope: 'GC + 11 subsidiaries, Thailand — >75% of total revenue',
  headOffice: 'Energy Complex Building A, 18th Fl, Vibhavadi Rangsit Rd, Chatuchak, Bangkok 10900',
  totalRevenueMillionBaht: 484907,
  productionVolumeMillionTons: 19.81,
  scope1MtCo2e: 5.77,
  scope2MtCo2eMarketBased: 1.51,
  scope3MtCo2e: 35.78,
  totalGhgMtCo2e: 5.77 + 1.51 + 35.78, // 43.06 — replaces earlier 21.5 assumption
  ghgIntensityScope12: 0.37, // tCO2e per ton production
  scope12TargetFy2026: 7.05 + 1.84, // 8.89 Mt
  workforce: {
    employees: 6129,
    contractors: 2268,
    womenPctWorkforce: 27.49,
    womenPctManagement: 31,
  },
  safety: {
    employeeFatalities2025: 0,
    contractorFatalities2025: 0,
    employeeTrir2025: 0.11,
    contractorTrir2025: 0.22,
    tier1PSE2025: 0,
    tier2PSE2025: 5,
  },
  assurance: {
    provider: 'LRQA Group Limited',
    statementDate: '2026-02-17',
    level: 'Limited assurance',
    standard: 'ISAE 3000 (revised)',
    ref: 'BGK00001264',
    verifier: 'Opart Charuratana',
    scope: [
      'GC2 (UT, OLE1) Olefin business units',
      'GC7 Jetty and buffer tank farm',
      'GC8 Aromatic tank farm',
      'GC4 Aromatics plant',
      'GC18 Phenol plant',
      'GC Polyol',
      'GCME',
      'Thai PET Resin',
    ],
  },
  frameworks: ['GRI Standards 2021', 'IFRS S1', 'IFRS S2', 'SASB', 'UN Global Compact LEAD'],
} as const

// Convenience lookups
export const getHistorical = (griCode: string, lineItem: string, scope: ReportingScope = 'group') =>
  PTTGC_HISTORICAL_VALUES.find(
    v => v.griCode === griCode && v.lineItem === lineItem && v.reportingScope === scope
  )

export const getByCapital = (section: string, scope: ReportingScope = 'group') =>
  PTTGC_HISTORICAL_VALUES.filter(v => v.section === section && v.reportingScope === scope)
