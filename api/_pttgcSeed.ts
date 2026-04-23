// PTTGC FY2022–FY2025 Sustainability Performance Data — full inventory.
// Source of truth: PTTGC FY2025 SPD PDF (published Feb 2026, LRQA ref BGK00001264).
// Every row here mirrors a disaggregated cell from the PDF. Consumed by api/setup.ts
// to seed questionnaire_item + historical_value tables (Nexus SRD §17).
//
// Shape (one tuple per row):
//   [section, subsection, griCode, lineItem, unit, scopeSplit|null, defaultRole,
//    entryMode, targetFy2026|null, footnoteRefs[], reportingScope,
//    v2022|null, v2023|null, v2024|null, v2025|null, sourcePage]
//
// scopeSplit encodes the disaggregation key: gender ('male'|'female'|'total'),
// area ('rayong'|'bangkok'|'other'), age band, level, nationality, etc.

export type WorkflowRole = 'AUTO' | 'FM' | 'SO' | 'TL'
export type EntryMode = 'Manual' | 'Calculator' | 'Connector'
export type ReportingScope = 'group' | 'jv'

export type SeedRow = [
  section: string,
  subsection: string,
  griCode: string,
  lineItem: string,
  unit: string,
  scopeSplit: string | null,
  defaultRole: WorkflowRole,
  entryMode: EntryMode,
  targetFy2026: number | null,
  footnotes: string[],
  reportingScope: ReportingScope,
  v2022: number | null,
  v2023: number | null,
  v2024: number | null,
  v2025: number | null,
  sourcePage: string,
]

const IPCC = ['IPCC 2006', 'WRI GHG protocol', 'ISO 14064', 'operational control approach']

export const PTTGC_SEED: SeedRow[] = [
  // ══════════════════════════════════════════════════════════════════════════════
  // GROUP SCOPE
  // ══════════════════════════════════════════════════════════════════════════════

  // ─── Financial Capital (GRI 201-1, 204-1) ───
  ['Financial Capital', 'Direct Economic Value Generated', '201-1 (2016)', 'Sales revenue', 'Million baht', null, 'FM', 'Manual', null, [], 'group', 678267, 616635, 604045, 484907, 'p.7'],
  ['Financial Capital', 'Direct Economic Value Generated', '201-1 (2016)', 'Revenues from sale of goods and rendering of services', 'Million baht', null, 'FM', 'Manual', null, [], 'group', 683954, 621631, 608550, 487585, 'p.7'],
  ['Financial Capital', 'Direct Economic Value Generated', '201-1 (2016)', 'Net sales plus revenues from financial investments and sales of assets', 'Million baht', null, 'FM', 'Manual', null, [], 'group', 684968, 625647, 610366, 489057, 'p.7'],
  ['Financial Capital', 'Economic Value Distributed', '201-1 (2016)', 'Employee wages and benefits', 'Million baht', null, 'FM', 'Manual', null, [], 'group', 8746, 12868, 12547, 12244, 'p.7'],
  ['Financial Capital', 'Economic Value Distributed', '201-1 (2016)', 'Operating cost', 'Million baht', null, 'FM', 'Manual', null, [], 'group', 668947, 618411, 625108, 501385, 'p.7'],
  ['Financial Capital', 'Economic Value Distributed', '201-1 (2016)', 'Payments to government: Gross taxes', 'Million baht', null, 'FM', 'Manual', null, [], 'group', 3346, 1729, 2130, 1237, 'p.7'],
  ['Financial Capital', 'Economic Value Distributed', '201-1 (2016)', 'Payments to providers of capital: Dividends paid', 'Million baht', null, 'FM', 'Manual', null, [], 'group', 11746, 1269, 3503, 2517, 'p.7'],
  ['Financial Capital', 'Economic Value Distributed', '201-1 (2016)', 'Community investments', 'Million baht', null, 'SO', 'Manual', null, [], 'group', 77.27, 56.54, 46.91, 17.12, 'p.7'],
  ['Financial Capital', 'Economic Value Distributed', '201-1 (2016)', 'Economic value retained', 'Million baht', null, 'FM', 'Manual', null, [], 'group', -6802, -8686, -32696, -28343, 'p.7'],
  ['Financial Capital', 'Procurement Practices', '204-1 (2016)', 'Proportion of spending on local suppliers in Thailand', '%', null, 'FM', 'Manual', null, [], 'group', 81, 81, 76, 84, 'p.7'],

  // ─── Manufacture Capital (GRI 2-5) ───
  ['Manufacture Capital', 'Return on Environmental Investment', '2-5 (2021)', 'Total expenditures', 'Million baht', null, 'FM', 'Manual', null, [], 'group', 1453, 2039, 1940, 2036, 'p.8'],
  ['Manufacture Capital', 'Return on Environmental Investment', '2-5 (2021)', 'Capital investments', 'Million baht', null, 'FM', 'Manual', null, [], 'group', 546, 961, 887, 1190, 'p.8'],
  ['Manufacture Capital', 'Return on Environmental Investment', '2-5 (2021)', 'Operating expenses', 'Million baht', null, 'FM', 'Manual', null, [], 'group', 907, 1078, 1053, 846, 'p.8'],
  ['Manufacture Capital', 'Return on Environmental Investment', '2-5 (2021)', 'Waste disposal, emission treatment, and remediation costs', 'Million baht', null, 'FM', 'Manual', null, [], 'group', 840, 1009, 994, 814, 'p.8'],
  ['Manufacture Capital', 'Return on Environmental Investment', '2-5 (2021)', 'Prevention and environmental management costs', 'Million baht', null, 'FM', 'Manual', null, [], 'group', 67, 69, 59, 32, 'p.8'],
  ['Manufacture Capital', 'Return on Environmental Investment', '2-5 (2021)', 'Savings, cost avoidance, income, tax incentives', 'Million baht', null, 'FM', 'Manual', null, [], 'group', 494, 585, 380, 389.48, 'p.8'],
  ['Manufacture Capital', 'Return on Environmental Investment', '2-5 (2021)', 'Operations covered', '% of operation covered', null, 'FM', 'Manual', null, [], 'group', 100, 100, 100, 100, 'p.8'],

  // ─── Human Capital — Worker (GRI 2-7, 2-8) ───
  ['Human Capital', 'Worker', '—', 'Total worker', 'Persons', 'total', 'TL', 'Connector', null, [], 'group', 9270, 8782, 8677, 8397, 'p.9'],
  ['Human Capital', 'Worker', '—', 'Total worker', 'Persons', 'male', 'TL', 'Connector', null, [], 'group', 6663, 6276, 6157, 5909, 'p.9'],
  ['Human Capital', 'Worker', '—', 'Total worker', 'Persons', 'female', 'TL', 'Connector', null, [], 'group', 2607, 2506, 2520, 2488, 'p.9'],
  ['Human Capital', 'Worker', '2-7 (2021)', 'Total employee', 'Persons', 'total', 'TL', 'Connector', null, [], 'group', 7668, 6405, 7936, 6129, 'p.9'],
  ['Human Capital', 'Worker', '2-7 (2021)', 'Total employee', 'Persons', 'male', 'TL', 'Connector', null, [], 'group', 4709, 4680, 5869, 4444, 'p.9'],
  ['Human Capital', 'Worker', '2-7 (2021)', 'Total employee', 'Persons', 'female', 'TL', 'Connector', null, [], 'group', 1740, 1725, 2067, 1685, 'p.9'],
  ['Human Capital', 'Worker', '2-8 (2021)', 'Contractor', 'Persons', 'total', 'TL', 'Connector', null, [], 'group', 2819, 805, 741, 2268, 'p.9'],
  ['Human Capital', 'Worker', '2-8 (2021)', 'Contractor', 'Persons', 'male', 'TL', 'Connector', null, [], 'group', 1952, 344, 288, 1465, 'p.9'],
  ['Human Capital', 'Worker', '2-8 (2021)', 'Contractor', 'Persons', 'female', 'TL', 'Connector', null, [], 'group', 867, 461, 453, 803, 'p.9'],

  // Total Employee by Area
  ['Human Capital', 'Workforce by Area', '2-7 (2021)', 'Total Employee — Rayong', 'Persons', 'male', 'TL', 'Connector', null, [], 'group', 4309, 4294, 5464, 4033, 'p.9'],
  ['Human Capital', 'Workforce by Area', '2-7 (2021)', 'Total Employee — Rayong', 'Persons', 'female', 'TL', 'Connector', null, [], 'group', 1114, 1102, 1444, 1076, 'p.9'],
  ['Human Capital', 'Workforce by Area', '2-7 (2021)', 'Total Employee — Bangkok', 'Persons', 'male', 'TL', 'Connector', null, [], 'group', 354, 336, 355, 361, 'p.9'],
  ['Human Capital', 'Workforce by Area', '2-7 (2021)', 'Total Employee — Bangkok', 'Persons', 'female', 'TL', 'Connector', null, [], 'group', 623, 618, 618, 604, 'p.9'],
  ['Human Capital', 'Workforce by Area', '2-7 (2021)', 'Total Employee — Other provinces', 'Persons', 'male', 'TL', 'Connector', null, [], 'group', 46, 50, 50, 50, 'p.9'],
  ['Human Capital', 'Workforce by Area', '2-7 (2021)', 'Total Employee — Other provinces', 'Persons', 'female', 'TL', 'Connector', null, [], 'group', 3, 5, 5, 5, 'p.9'],

  // Employment contract
  ['Human Capital', 'Employment Contract', '2-7 (2021)', 'Permanent contract', 'Persons', 'male', 'TL', 'Connector', null, [], 'group', 4703, 4680, 5869, 4444, 'p.9'],
  ['Human Capital', 'Employment Contract', '2-7 (2021)', 'Permanent contract', 'Persons', 'female', 'TL', 'Connector', null, [], 'group', 1740, 1725, 2067, 1685, 'p.9'],
  ['Human Capital', 'Employment Contract', '2-7 (2021)', 'Temporary contract', 'Persons', 'male', 'TL', 'Connector', null, [], 'group', 6, 0, 0, 0, 'p.9'],
  ['Human Capital', 'Employment Contract', '2-7 (2021)', 'Temporary contract', 'Persons', 'female', 'TL', 'Connector', null, [], 'group', 0, 0, 0, 0, 'p.9'],
  ['Human Capital', 'Employment Contract', '2-7 (2021)', 'Non-guaranteed hours employees', 'Persons', 'total', 'TL', 'Connector', null, [], 'group', 0, 0, 0, 0, 'p.9'],

  // Age group (GRI 405-1)
  ['Human Capital', 'Age Distribution', '405-1 (2016)', 'Under 30 years', 'Persons', 'total', 'TL', 'Connector', null, [], 'group', null, 856, 761, 1202, 'p.9'],
  ['Human Capital', 'Age Distribution', '405-1 (2016)', 'Under 30 years', '% of total employee', 'total', 'TL', 'Calculator', null, [], 'group', 19.41, 11.88, 15.15, 7.52, 'p.9'],
  ['Human Capital', 'Age Distribution', '405-1 (2016)', 'Under 30 years', 'Persons', 'male', 'TL', 'Connector', null, [], 'group', 601, 543, 845, 312, 'p.9'],
  ['Human Capital', 'Age Distribution', '405-1 (2016)', 'Under 30 years', 'Persons', 'female', 'TL', 'Connector', null, [], 'group', 265, 218, 357, 149, 'p.9'],
  ['Human Capital', 'Age Distribution', '405-1 (2016)', '30–50 years', 'Persons', 'total', 'TL', 'Connector', null, [], 'group', null, 4431, 4390, 5230, 'p.10'],
  ['Human Capital', 'Age Distribution', '405-1 (2016)', '30–50 years', '% of total employee', 'total', 'TL', 'Calculator', null, [], 'group', 99.33, 68.54, 65.90, 68.80, 'p.10'],
  ['Human Capital', 'Age Distribution', '405-1 (2016)', '30–50 years', 'Persons', 'male', 'TL', 'Connector', null, [], 'group', 3177, 3121, 3775, 2954, 'p.10'],
  ['Human Capital', 'Age Distribution', '405-1 (2016)', '30–50 years', 'Persons', 'female', 'TL', 'Connector', null, [], 'group', 1254, 1269, 1455, 1263, 'p.10'],
  ['Human Capital', 'Age Distribution', '405-1 (2016)', 'Over 50 years', 'Persons', 'total', 'TL', 'Connector', null, [], 'group', null, 1152, 1254, 1504, 'p.10'],
  ['Human Capital', 'Age Distribution', '405-1 (2016)', 'Over 50 years', '% of total employee', 'total', 'TL', 'Calculator', null, [], 'group', 25.82, 19.58, 18.95, 23.67, 'p.10'],
  ['Human Capital', 'Age Distribution', '405-1 (2016)', 'Over 50 years', 'Persons', 'male', 'TL', 'Connector', null, [], 'group', 931, 1016, 1249, 1178, 'p.10'],
  ['Human Capital', 'Age Distribution', '405-1 (2016)', 'Over 50 years', 'Persons', 'female', 'TL', 'Connector', null, [], 'group', 221, 238, 255, 273, 'p.10'],

  // Employee category (Level)
  ['Human Capital', 'Employee Category (Level)', '405-1 (2016)', 'Executive (Level 13-18)', 'Persons', 'male', 'TL', 'Connector', null, [], 'group', 42, 42, 32, 33, 'p.10'],
  ['Human Capital', 'Employee Category (Level)', '405-1 (2016)', 'Executive (Level 13-18)', 'Persons', 'female', 'TL', 'Connector', null, [], 'group', 17, 17, 10, 11, 'p.10'],
  ['Human Capital', 'Employee Category (Level)', '405-1 (2016)', 'Middle management (Level 10-12)', 'Persons', 'male', 'TL', 'Connector', null, [], 'group', 523, 634, 645, 651, 'p.10'],
  ['Human Capital', 'Employee Category (Level)', '405-1 (2016)', 'Middle management (Level 10-12)', 'Persons', 'female', 'TL', 'Connector', null, [], 'group', 269, 277, 292, 287, 'p.10'],
  ['Human Capital', 'Employee Category (Level)', '405-1 (2016)', 'Senior (Level 8-9)', 'Persons', 'male', 'TL', 'Connector', null, [], 'group', 1167, 1258, 1243, 1049, 'p.10'],
  ['Human Capital', 'Employee Category (Level)', '405-1 (2016)', 'Senior (Level 8-9)', 'Persons', 'female', 'TL', 'Connector', null, [], 'group', 571, 608, 658, 628, 'p.10'],
  ['Human Capital', 'Employee Category (Level)', '405-1 (2016)', 'Employee (Level 7 and below)', 'Persons', 'male', 'TL', 'Connector', null, [], 'group', 2977, 2743, 3918, 2707, 'p.10'],
  ['Human Capital', 'Employee Category (Level)', '405-1 (2016)', 'Employee (Level 7 and below)', 'Persons', 'female', 'TL', 'Connector', null, [], 'group', 883, 823, 1070, 758, 'p.10'],

  // Nationality
  ['Human Capital', 'Nationality', '405-1 (2016)', 'Thai employees', 'Persons', null, 'TL', 'Connector', null, [], 'group', 6440, 6395, 7929, 6127, 'p.10'],
  ['Human Capital', 'Nationality', '405-1 (2016)', 'Japanese employees', 'Persons', null, 'TL', 'Connector', null, [], 'group', 2, 5, 4, 0, 'p.10'],
  ['Human Capital', 'Nationality', '405-1 (2016)', 'French employees', 'Persons', null, 'TL', 'Connector', null, [], 'group', 2, 1, 1, 1, 'p.10'],
  ['Human Capital', 'Nationality', '405-1 (2016)', 'Turkish employees', 'Persons', null, 'TL', 'Connector', null, [], 'group', 1, 0, 0, 0, 'p.10'],
  ['Human Capital', 'Nationality', '405-1 (2016)', 'Other nationality employees', 'Persons', null, 'TL', 'Connector', null, [], 'group', 4, 4, 2, 1, 'p.10'],
  ['Human Capital', 'Nationality', '405-1 (2016)', 'Thai management employees', 'Persons', null, 'TL', 'Connector', null, [], 'group', 846, 963, 974, 980, 'p.10'],
  ['Human Capital', 'Nationality', '405-1 (2016)', 'Japanese management employees', 'Persons', null, 'TL', 'Connector', null, [], 'group', 2, 4, 3, 0, 'p.11'],

  // People with Disability
  ['Human Capital', 'Diversity', '405-1 (2016)', 'People with disability', 'Persons', null, 'TL', 'Connector', null, [], 'group', 11, 3, 3, 3, 'p.11'],
  ['Human Capital', 'Diversity', '405-1 (2016)', 'People with disability', '% of total employee', null, 'TL', 'Calculator', null, [], 'group', 0.17, 0.05, 0.04, 0.05, 'p.11'],

  // New Employee (401-1)
  ['Human Capital', 'New Employees', '401-1 (2016)', 'New employees', 'Persons', 'total', 'TL', 'Connector', null, [], 'group', 296, 231, 199, 130, 'p.11'],
  ['Human Capital', 'New Employees', '401-1 (2016)', 'New employees', 'Persons', 'male', 'TL', 'Connector', null, [], 'group', 183, 132, 125, 59, 'p.11'],
  ['Human Capital', 'New Employees', '401-1 (2016)', 'New employees', 'Persons', 'female', 'TL', 'Connector', null, [], 'group', 113, 99, 74, 71, 'p.11'],
  ['Human Capital', 'New Employees', '401-1 (2016)', 'New hire rate', '% of total employees', null, 'TL', 'Calculator', null, [], 'group', 3.86, 3.61, 2.51, 2.12, 'p.11'],
  ['Human Capital', 'New Employees', '401-1 (2016)', 'New hires in Rayong', 'Persons', 'male', 'TL', 'Connector', null, [], 'group', 152, 118, 79, 40, 'p.11'],
  ['Human Capital', 'New Employees', '401-1 (2016)', 'New hires in Rayong', 'Persons', 'female', 'TL', 'Connector', null, [], 'group', 73, 62, 38, 42, 'p.11'],
  ['Human Capital', 'New Employees', '401-1 (2016)', 'New hires in Bangkok', 'Persons', 'male', 'TL', 'Connector', null, [], 'group', 31, 14, 44, 17, 'p.11'],
  ['Human Capital', 'New Employees', '401-1 (2016)', 'New hires in Bangkok', 'Persons', 'female', 'TL', 'Connector', null, [], 'group', 40, 37, 36, 29, 'p.11'],

  // Turnover
  ['Human Capital', 'Turnover', '401-1 (2016)', 'Total employee turnover', 'Persons', 'total', 'TL', 'Connector', null, [], 'group', 365, 336, 287, 341, 'p.12'],
  ['Human Capital', 'Turnover', '401-1 (2016)', 'Total employee turnover', 'Persons', 'male', 'TL', 'Connector', null, [], 'group', 232, 212, 194, 244, 'p.12'],
  ['Human Capital', 'Turnover', '401-1 (2016)', 'Total employee turnover', 'Persons', 'female', 'TL', 'Connector', null, [], 'group', 133, 124, 93, 97, 'p.12'],
  ['Human Capital', 'Turnover', '401-1 (2016)', 'Total employee turnover rate', '% of total employees', null, 'TL', 'Calculator', null, [], 'group', 4.76, 5.25, 3.62, 5.56, 'p.12'],
  ['Human Capital', 'Turnover', '401-1 (2016)', 'Voluntary employee turnover', 'Persons', 'total', 'TL', 'Connector', null, [], 'group', 306, 266, 209, 229, 'p.12'],
  ['Human Capital', 'Turnover', '401-1 (2016)', 'Voluntary employee turnover rate', '% of total employees', null, 'TL', 'Calculator', null, [], 'group', 6.86, 4.15, 2.63, 3.74, 'p.12'],
  ['Human Capital', 'Turnover', '401-1 (2016)', 'Open positions filled by internal candidates', '%', null, 'TL', 'Manual', null, [], 'group', 71, 74, 89, 36, 'p.12'],
  ['Human Capital', 'Turnover', '401-1 (2016)', 'Average hiring cost per FTE', 'Baht/FTE', null, 'FM', 'Manual', null, [], 'group', 38000, 37283, 38082, 35465, 'p.12'],

  // Parental Leave (401-2, 401-3)
  ['Human Capital', 'Parental Leave', '401-3 (2016)', 'Employees entitled to parental leave', 'Persons', 'male', 'TL', 'Connector', null, [], 'group', 4389, 4412, 5497, 4186, 'p.12'],
  ['Human Capital', 'Parental Leave', '401-3 (2016)', 'Employees entitled to parental leave', 'Persons', 'female', 'TL', 'Connector', null, [], 'group', 1708, 1725, 2067, 1685, 'p.12'],
  ['Human Capital', 'Parental Leave', '401-3 (2016)', 'Employees taking parental leave', 'Persons', 'male', 'TL', 'Connector', null, [], 'group', 71, 122, 101, 111, 'p.12'],
  ['Human Capital', 'Parental Leave', '401-3 (2016)', 'Employees taking parental leave', 'Persons', 'female', 'TL', 'Connector', null, [], 'group', 88, 55, 61, 55, 'p.12'],
  ['Human Capital', 'Parental Leave', '401-3 (2016)', 'Return to work rate', '%', 'male', 'TL', 'Calculator', null, [], 'group', 95.77, 95.90, 96.04, 97.30, 'p.13'],
  ['Human Capital', 'Parental Leave', '401-3 (2016)', 'Return to work rate', '%', 'female', 'TL', 'Calculator', null, [], 'group', 97.73, 92.73, 95.08, 96.36, 'p.13'],

  // Training & Development (404-1)
  ['Human Capital', 'Training and Development', '404-1 (2016)', 'Average hours of training per FTE', 'Hours/person/year', null, 'TL', 'Manual', null, [], 'group', 45.26, 40.33, 36.18, 61.28, 'p.13'],
  ['Human Capital', 'Training and Development', '404-1 (2016)', 'Average hours of training per FTE', 'Hours/person/year', 'male', 'TL', 'Manual', null, [], 'group', 40.89, 44.0, 45.64, 38.33, 'p.13'],
  ['Human Capital', 'Training and Development', '404-1 (2016)', 'Average hours of training per FTE', 'Hours/person/year', 'female', 'TL', 'Manual', null, [], 'group', 39.22, 36.7, 26.73, 22.94, 'p.13'],
  ['Human Capital', 'Training and Development', '404-1 (2016)', 'Average training spend per FTE', 'Baht/person/year', null, 'FM', 'Manual', null, [], 'group', 14290.47, 13241.70, 13076.24, 10125.63, 'p.13'],
  ['Human Capital', 'Training and Development', '404-1 (2016)', 'Total investment on employees training', 'Million baht', 'male', 'FM', 'Manual', null, [], 'group', 79.31, 73.20, 75.13, 62.06, 'p.13'],
  ['Human Capital', 'Training and Development', '404-1 (2016)', 'Total investment on employees training', 'Million baht', 'female', 'FM', 'Manual', null, [], 'group', 31.98, 25.12, 28.65, 22.99, 'p.13'],
  ['Human Capital', 'Training and Development', '404-1 (2016)', 'Training hours — Technical', 'Hours/person/year', null, 'TL', 'Manual', null, [], 'group', 11.50, 33.42, 5.45, 8.94, 'p.13'],
  ['Human Capital', 'Training and Development', '404-1 (2016)', 'Training hours — Leadership', 'Hours/person/year', null, 'TL', 'Manual', null, [], 'group', 8.45, 61.21, 2.59, 5.99, 'p.13'],
  ['Human Capital', 'Training and Development', '404-1 (2016)', 'Training hours — Occupational H&S', 'Hours/person/year', null, 'TL', 'Manual', null, [], 'group', 24.54, 285.52, 19.74, 10.85, 'p.13'],
  ['Human Capital', 'Training and Development', '404-1 (2016)', 'Training hours — Resilience & agility', 'Hours/person/year', null, 'TL', 'Manual', null, [], 'group', 8.96, 17.35, 5.13, 10.27, 'p.13'],

  // Human Capital ROI (201-1)
  ['Human Capital', 'Human Capital ROI', '201-1 (2016)', 'Quantitative financial benefit of human capital investment', 'Million baht', null, 'FM', 'Calculator', null, [], 'group', 118.40, 206.34, 86.95, 258.47, 'p.14'],
  ['Human Capital', 'Human Capital ROI', '201-1 (2016)', 'HC ROI ratio', '-', null, 'FM', 'Calculator', null, [], 'group', 2.07, 0.86, -0.68, -0.35, 'p.14'],

  // Performance Appraisal (404-3)
  ['Human Capital', 'Performance Appraisal', '404-3 (2016)', 'Management by objectives', '% of all employees', null, 'TL', 'Connector', null, [], 'group', 100, 100, 100, 100, 'p.14'],
  ['Human Capital', 'Performance Appraisal', '404-3 (2016)', 'Multidimensional performance appraisal', '% of all employees', null, 'TL', 'Connector', null, [], 'group', 100, 100, 100, 100, 'p.14'],
  ['Human Capital', 'Performance Appraisal', '404-3 (2016)', 'Formal comparative ranking', '% of all employees', null, 'TL', 'Connector', null, [], 'group', 100, 100, 100, 100, 'p.14'],
  ['Human Capital', 'Performance Appraisal', '404-3 (2016)', 'Employees receiving regular reviews — Executive', '% of executives', null, 'TL', 'Connector', null, [], 'group', 100, 100, 100, 100, 'p.15'],
  ['Human Capital', 'Performance Appraisal', '404-3 (2016)', 'Employees receiving regular reviews — Middle mgmt', '% of middle mgmt', null, 'TL', 'Connector', null, [], 'group', 100, 100, 100, 100, 'p.15'],
  ['Human Capital', 'Performance Appraisal', '404-3 (2016)', 'Employees receiving regular reviews — Senior', '% of senior', null, 'TL', 'Connector', null, [], 'group', 100, 100, 100, 100, 'p.15'],
  ['Human Capital', 'Performance Appraisal', '404-3 (2016)', 'Employees receiving regular reviews — L7 and below', '% of L7 and below', null, 'TL', 'Connector', null, [], 'group', 100, 100, 100, 100, 'p.15'],

  // Employee Engagement
  ['Human Capital', 'Employee Engagement', '—', 'Employee engagement result', '% actively engaged', null, 'TL', 'Manual', null, [], 'group', 65, 65, 77, null, 'p.14'],
  ['Human Capital', 'Employee Engagement', '—', 'Employee engagement target', '% actively engaged', null, 'TL', 'Manual', 80, [], 'group', 75, 72, 68, 80, 'p.14'],
  ['Human Capital', 'Employee Engagement', '—', 'Engagement survey coverage', '% of employees', null, 'TL', 'Calculator', null, [], 'group', 97, 98, 99, 97, 'p.14'],

  // Gender Diversity (405-1)
  ['Human Capital', 'Gender Diversity', '405-1 (2016)', 'Women in workforce', 'Persons', null, 'TL', 'Connector', null, [], 'group', null, null, 2067, 1685, 'p.15'],
  ['Human Capital', 'Gender Diversity', '405-1 (2016)', 'Women in workforce', '% of total workforce', null, 'TL', 'Calculator', null, [], 'group', null, null, 26, 27.49, 'p.15'],
  ['Human Capital', 'Gender Diversity', '405-1 (2016)', 'Women in management positions', 'Persons', null, 'TL', 'Connector', null, [], 'group', null, null, 302, 298, 'p.15'],
  ['Human Capital', 'Gender Diversity', '405-1 (2016)', 'Women in management positions', '% of total mgmt workforce', null, 'TL', 'Calculator', 25, [], 'group', null, null, 31, 31, 'p.15'],
  ['Human Capital', 'Gender Diversity', '405-1 (2016)', 'Women in top management positions', 'Persons', null, 'TL', 'Connector', null, [], 'group', null, null, 10, 11, 'p.15'],
  ['Human Capital', 'Gender Diversity', '405-1 (2016)', 'Women in top management positions', '% of total top mgmt', null, 'TL', 'Calculator', 20, [], 'group', null, null, 24, 28, 'p.15'],
  ['Human Capital', 'Gender Diversity', '405-1 (2016)', 'Women in junior management positions', 'Persons', null, 'TL', 'Connector', null, [], 'group', null, null, 292, 287, 'p.15'],
  ['Human Capital', 'Gender Diversity', '405-1 (2016)', 'Women in revenue-generating functions', 'Persons', null, 'TL', 'Connector', null, [], 'group', null, null, 72, 98, 'p.15'],
  ['Human Capital', 'Gender Diversity', '405-1 (2016)', 'Women in STEM-related positions', 'Persons', null, 'TL', 'Connector', null, [], 'group', null, null, 1253, 1107, 'p.16'],
  ['Human Capital', 'Gender Diversity', '405-1 (2016)', 'Women on board of directors', 'Persons', null, 'SO', 'Manual', null, [], 'group', null, null, 1, 5, 'p.16'],
  ['Human Capital', 'Gender Diversity', '405-1 (2016)', 'Women on board of directors', '%', null, 'SO', 'Calculator', null, [], 'group', null, null, 6.67, 9, 'p.16'],

  // Equal Remuneration (405-2)
  ['Human Capital', 'Equal Remuneration', '405-2 (2016)', 'Mean gender pay gap', '%', null, 'FM', 'Calculator', null, [], 'group', null, null, null, 93.51, 'p.16'],
  ['Human Capital', 'Equal Remuneration', '405-2 (2016)', 'Median gender pay gap', '%', null, 'FM', 'Calculator', null, [], 'group', null, null, null, 91.35, 'p.16'],
  ['Human Capital', 'Equal Remuneration', '405-2 (2016)', 'Mean bonus gap', '%', null, 'FM', 'Calculator', null, [], 'group', null, null, null, 107.24, 'p.16'],
  ['Human Capital', 'Equal Remuneration', '405-2 (2016)', 'Median bonus gap', '%', null, 'FM', 'Calculator', null, [], 'group', null, null, null, 115.35, 'p.16'],
  ['Human Capital', 'Equal Remuneration', '405-2 (2016)', 'Executive base salary ratio F:M', 'Ratio', null, 'FM', 'Calculator', null, [], 'group', null, null, 1.02, 0.83, 'p.16'],
  ['Human Capital', 'Equal Remuneration', '405-2 (2016)', 'Management base salary ratio F:M', 'Ratio', null, 'FM', 'Calculator', null, [], 'group', null, null, 1.18, 1.02, 'p.16'],
  ['Human Capital', 'Equal Remuneration', '405-2 (2016)', 'Non-management base salary ratio F:M', 'Ratio', null, 'FM', 'Calculator', null, [], 'group', null, null, 0.75, 1.03, 'p.16'],

  // Board Structure (2-9)
  ['Human Capital', 'Board Structure', '2-9 (2021)', 'Total number of board members', 'Persons', null, 'SO', 'Manual', null, [], 'group', 14, 15, 15, 15, 'p.16'],
  ['Human Capital', 'Board Structure', '2-9 (2021)', 'Number of executive directors', 'Persons', null, 'SO', 'Manual', null, [], 'group', 1, 1, 1, 1, 'p.16'],
  ['Human Capital', 'Board Structure', '2-9 (2021)', 'Number of non-executive directors (excl. independent)', 'Persons', null, 'SO', 'Manual', null, [], 'group', 4, 1, 5, 6, 'p.16'],
  ['Human Capital', 'Board Structure', '2-9 (2021)', 'Number of independent directors', 'Persons', null, 'SO', 'Manual', null, [], 'group', 9, 13, 9, 8, 'p.16'],
  ['Human Capital', 'Board Structure', '2-9 (2021)', 'Number of independent directors (DJSI)', 'Persons', null, 'SO', 'Manual', null, [], 'group', 13, 14, 13, 14, 'p.16'],
  ['Human Capital', 'Labor Practice', '2-30 (2021)', 'Employees represented by independent trade union', '%', null, 'TL', 'Manual', null, [], 'group', 100, 100, 100, 100, 'p.16'],

  // H&S — OHS coverage (403-8)
  ['Human Capital', 'Health & Safety', '403-8 (2018)', 'Employees covered by OHS management system', 'Persons', null, 'TL', 'Manual', null, [], 'group', 7668, 6405, 7936, 6129, 'p.17'],
  ['Human Capital', 'Health & Safety', '403-8 (2018)', 'Employees covered by OHS management system', '%', null, 'TL', 'Calculator', null, [], 'group', 100, 100, 100, 100, 'p.17'],
  ['Human Capital', 'Health & Safety', '403-8 (2018)', 'Employees covered by internally-audited OHS', '%', null, 'TL', 'Calculator', null, [], 'group', 100, 100, 100, 100, 'p.17'],
  ['Human Capital', 'Health & Safety', '403-8 (2018)', 'Employees covered by externally-audited OHS', '%', null, 'TL', 'Calculator', null, [], 'group', 100, 100, 100, 100, 'p.17'],
  ['Human Capital', 'Health & Safety', '403-8 (2018)', 'Contractors covered by OHS management system', 'Persons', null, 'TL', 'Manual', null, [], 'group', 2819, 805, 741, 2268, 'p.17'],

  // Fatalities (403-9)
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'Fatalities — employees', 'Case', null, 'TL', 'Manual', 0, [], 'group', 1, 0, 0, 0, 'p.17'],
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'Fatalities — contractors', 'Case', null, 'TL', 'Manual', 0, [], 'group', 1, 0, 0, 0, 'p.17'],
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'Fatality rate — employees', 'Case/1M manhours', null, 'TL', 'Calculator', 0, [], 'group', 0.06, 0, 0, 0, 'p.17'],
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'Fatality rate — contractors', 'Case/1M manhours', null, 'TL', 'Calculator', 0, [], 'group', 0.09, 0, 0, 0, 'p.17'],
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'High-consequence injuries — employees', 'Case', null, 'TL', 'Manual', 0, [], 'group', 0, 0, 0, 0, 'p.18'],
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'High-consequence injuries — contractors', 'Case', null, 'TL', 'Manual', 0, [], 'group', 0, 0, 0, 0, 'p.18'],

  // Recordable work injuries
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'Total Recordable Work-Injuries — employees', 'Case', null, 'TL', 'Manual', null, [], 'group', 8, 1, 3, 2, 'p.19'],
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'Total Recordable Work-Injuries — contractors', 'Case', null, 'TL', 'Manual', null, [], 'group', 13, 16, 5, 3, 'p.19'],
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'TRIR — employees', 'Case/1M manhours', null, 'TL', 'Calculator', null, [], 'group', 0.46, 0.06, 0.17, 0.11, 'p.19'],
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'TRIR — contractors', 'Case/1M manhours', null, 'TL', 'Calculator', null, [], 'group', 0.59, 0.77, 0.39, 0.22, 'p.19'],
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'Manhours worked — employees', 'Manhours', null, 'TL', 'Connector', null, [], 'group', 17270017, 16830173, 17242920, 18614522, 'p.19'],
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'Manhours worked — contractors', 'Manhours', null, 'TL', 'Connector', null, [], 'group', 22126292, 20779999, 12783596, 13425210, 'p.20'],
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'LTIFR — employees', 'Case/1M manhours', null, 'TL', 'Calculator', 0, [], 'group', 0, 0, 0, 0, 'p.20'],
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'LTIFR — contractors', 'Case/1M manhours', null, 'TL', 'Calculator', null, [], 'group', 0.09, 0.24, 0, 0.22, 'p.20'],
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'Lost Work Days — employees', 'Days', null, 'TL', 'Manual', 0, [], 'group', 0, 0, 0, 0, 'p.20'],
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'Lost Work Days — contractors', 'Days', null, 'TL', 'Manual', null, [], 'group', 0, 216, 0, 36, 'p.20'],
  ['Human Capital', 'Health & Safety', '403-10 (2018)', 'Fatalities from work-related ill health — employees', 'Case', null, 'TL', 'Manual', 0, [], 'group', 0, 0, 0, 0, 'p.20'],
  ['Human Capital', 'Health & Safety', '403-10 (2018)', 'Recordable work-related ill health cases — employees', 'Case', null, 'TL', 'Manual', 0, [], 'group', 0, 0, 0, 0, 'p.20'],
  ['Human Capital', 'Health & Safety', '403-10 (2018)', 'Occupational Disease Rate — employees', 'Case/1M manhours', null, 'TL', 'Calculator', 0, [], 'group', 0, 0, 0, 0, 'p.21'],

  // Process Safety (G4-OG13)
  ['Human Capital', 'Process Safety', 'G4-OG13', 'Process Safety Events — Tier 1', 'Number per 1M hours', null, 'SO', 'Manual', 0, [], 'group', 2, 1, 0, 0, 'p.21'],
  ['Human Capital', 'Process Safety', 'G4-OG13', 'Process Safety Events — Tier 2', 'Number per 1M hours', null, 'SO', 'Manual', null, [], 'group', 4, 1, 5, 5, 'p.21'],
  ['Human Capital', 'Process Safety', '—', 'Staff trained on H&S standards', 'Persons', null, 'TL', 'Connector', null, [], 'group', 4599, 4652, 6527, 3245, 'p.22'],

  // ─── Social & Relationship Capital ───
  ['Social & Relationship Capital', 'Corporate Governance', '2-11 (2021)', 'Years with non-executive independent Chairman', 'Years', null, 'SO', 'Manual', null, [], 'group', 11, 12, 13, 14, 'p.23'],
  ['Social & Relationship Capital', 'Board Effectiveness', '2-9 (2021)', 'Board meeting attendance', '%', null, 'SO', 'Connector', null, [], 'group', 99.5, 99.1, 98.9, 100, 'p.23'],
  ['Social & Relationship Capital', 'Board Effectiveness', '2-9 (2021)', 'Board industry experience', 'Persons', null, 'SO', 'Manual', null, [], 'group', 9, 9, 7, 5, 'p.23'],
  ['Social & Relationship Capital', 'Average Tenure', '2-9 (2021)', 'Average tenure of board members', 'Years', null, 'SO', 'Manual', null, [], 'group', 2.7, 1.5, 2.4, 2.4, 'p.23'],

  // Executive Compensation (2-21)
  ['Social & Relationship Capital', 'Executive Compensation', '2-21 (2021)', 'Total compensation of CEO', 'Baht', null, 'FM', 'Manual', null, [], 'group', 22460000, 17799000, 18546000, 18882000, 'p.23'],
  ['Social & Relationship Capital', 'Executive Compensation', '2-21 (2021)', 'Salary of CEO', 'Baht', null, 'FM', 'Manual', null, [], 'group', 12454000, 13178000, 13522000, 15243000, 'p.23'],
  ['Social & Relationship Capital', 'Executive Compensation', '2-21 (2021)', 'Bonus of CEO', 'Baht', null, 'FM', 'Manual', null, [], 'group', 8827000, 3300000, 3844000, 2481000, 'p.23'],
  ['Social & Relationship Capital', 'Executive Compensation', '2-21 (2021)', 'Provident Fund of CEO', 'Baht', null, 'FM', 'Manual', null, [], 'group', 1179000, 1321000, 1180000, 1158000, 'p.23'],
  ['Social & Relationship Capital', 'Executive Compensation', '2-21 (2021)', 'Total compensation of EVPs', 'Baht', null, 'FM', 'Manual', null, [], 'group', 105626000, 101093920, 95617000, 65080000, 'p.23'],
  ['Social & Relationship Capital', 'Executive Compensation', '2-21 (2021)', 'Total compensation of SVPs', 'Baht', null, 'FM', 'Manual', null, [], 'group', 253571000, 218158903, 186464610, 178767000, 'p.23'],
  ['Social & Relationship Capital', 'CEO Pay Ratio', '2-21 (2021)', 'Median employee compensation', 'Baht', null, 'FM', 'Calculator', null, [], 'group', 989018, 1546000, 1694000, 1671000, 'p.23'],
  ['Social & Relationship Capital', 'CEO Pay Ratio', '2-21 (2021)', 'Mean employee compensation', 'Baht', null, 'FM', 'Calculator', null, [], 'group', 1160163, 1860000, 2005000, 1993000, 'p.23'],
  ['Social & Relationship Capital', 'CEO Pay Ratio', '2-21 (2021)', 'Median CEO pay ratio', 'Ratio', null, 'FM', 'Calculator', null, [], 'group', 23, 11.51, 10.95, 11.30, 'p.24'],
  ['Social & Relationship Capital', 'CEO Pay Ratio', '2-21 (2021)', 'Mean CEO pay ratio', 'Ratio', null, 'FM', 'Calculator', null, [], 'group', 19, 9.57, 9.25, 9.47, 'p.24'],

  // Ownership
  ['Social & Relationship Capital', 'Management Ownership', '—', 'Average executive committee shareholding', 'Times base salary', null, 'SO', 'Manual', null, [], 'group', 0.91, 0.91, 0.48, 0.48, 'p.24'],
  ['Social & Relationship Capital', 'Government Ownership', '—', 'Total % government ownership', '%', null, 'SO', 'Manual', null, [], 'group', 24.35, 24.38, 24.35, 24.22, 'p.24'],
  ['Social & Relationship Capital', 'Risk Governance', '—', 'Non-executive directors with enterprise risk expertise', 'Persons', null, 'SO', 'Manual', null, [], 'group', 13, 14, 14, 14, 'p.24'],

  // ABC — communication (205-2)
  ['Social & Relationship Capital', 'Anti-Bribery and Corruption', '205-2 (2016)', 'ABC communicated to governance body members', 'Persons', null, 'SO', 'Connector', null, [], 'group', 30, 68, 49, 37, 'p.24'],
  ['Social & Relationship Capital', 'Anti-Bribery and Corruption', '205-2 (2016)', 'ABC communicated to employees', 'Persons', null, 'SO', 'Connector', null, [], 'group', 7668, 7425, 8711, 6129, 'p.25'],
  ['Social & Relationship Capital', 'Anti-Bribery and Corruption', '205-2 (2016)', 'ABC communicated to senior executives', 'Persons', null, 'SO', 'Connector', null, [], 'group', 30, 68, 49, 44, 'p.25'],
  ['Social & Relationship Capital', 'Anti-Bribery and Corruption', '205-2 (2016)', 'ABC communicated to management', 'Persons', null, 'SO', 'Connector', null, [], 'group', 1010, 1031, 1046, 938, 'p.25'],
  ['Social & Relationship Capital', 'Anti-Bribery and Corruption', '205-2 (2016)', 'ABC communicated to non-management', 'Persons', null, 'SO', 'Connector', null, [], 'group', 6628, 6326, 7548, 5147, 'p.25'],
  ['Social & Relationship Capital', 'Anti-Bribery and Corruption', '205-2 (2016)', 'ABC communicated to business partners', 'Persons', null, 'SO', 'Connector', null, [], 'group', 362, 386, 604, 644, 'p.25'],
  ['Social & Relationship Capital', 'Anti-Bribery and Corruption', '205-2 (2016)', 'Governance body trained on ABC', 'Persons', null, 'SO', 'Connector', null, [], 'group', 30, 68, 49, 37, 'p.26'],
  ['Social & Relationship Capital', 'Anti-Bribery and Corruption', '205-2 (2016)', 'Employees trained on ABC', 'Persons', null, 'SO', 'Connector', null, [], 'group', 7668, 7425, 8711, 6129, 'p.26'],

  // Codes of Business Conduct coverage
  ['Social & Relationship Capital', 'Code of Conduct Coverage', '205-2 (2016)', 'Code of conduct deployed — employees', '% of employees', null, 'SO', 'Connector', null, [], 'group', 100, 100, 100, 100, 'p.27'],
  ['Social & Relationship Capital', 'Code of Conduct Coverage', '205-2 (2016)', 'Code of conduct deployed — suppliers', '% of suppliers', null, 'SO', 'Connector', null, [], 'group', 100, 100, 100, 100, 'p.27'],
  ['Social & Relationship Capital', 'Code of Conduct Coverage', '205-2 (2016)', 'Code of conduct deployed — subsidiaries', '% of subsidiaries', null, 'SO', 'Connector', null, [], 'group', 100, 100, 100, 100, 'p.27'],
  ['Social & Relationship Capital', 'Code of Conduct Coverage', '205-2 (2016)', 'Code of conduct deployed — JVs', '% of JVs', null, 'SO', 'Connector', null, [], 'group', 100, 100, 100, 100, 'p.27'],

  // Anticompetitive (206-1)
  ['Social & Relationship Capital', 'Anticompetitive Practices', '206-1 (2016)', 'Fines related to antitrust/anticompetitive', 'Baht', null, 'SO', 'Manual', 0, [], 'group', 0, 0, 0, 0, 'p.27'],
  ['Social & Relationship Capital', 'Anticompetitive Practices', '206-1 (2016)', 'Antitrust contingent liabilities', '% of total revenues', null, 'SO', 'Manual', 0, [], 'group', 0, 0, 0, 0, 'p.27'],

  // Code of Conduct Breaches (205-3, 206-1, 406-1)
  ['Social & Relationship Capital', 'Code of Conduct Breaches', '205-3 (2016)', 'Code of Conduct complaints — total reported', 'Case', null, 'SO', 'Manual', null, [], 'group', 5, 9, 13, 8, 'p.27'],
  ['Social & Relationship Capital', 'Code of Conduct Breaches', '205-3 (2016)', 'Corruption — reported', 'Case', null, 'SO', 'Manual', 0, [], 'group', 0, 2, 1, 0, 'p.27'],
  ['Social & Relationship Capital', 'Code of Conduct Breaches', '205-3 (2016)', 'Conflict of interest — reported', 'Case', null, 'SO', 'Manual', null, [], 'group', 0, 2, 3, 0, 'p.27'],
  ['Social & Relationship Capital', 'Code of Conduct Breaches', '205-3 (2016)', 'Corporate compliance — reported', 'Case', null, 'SO', 'Manual', null, [], 'group', 5, 5, 9, 8, 'p.27'],
  ['Social & Relationship Capital', 'Code of Conduct Breaches', '205-3 (2016)', 'Corruption — confirmed', 'Case', null, 'SO', 'Manual', 0, [], 'group', 0, 2, 1, 0, 'p.28'],
  ['Social & Relationship Capital', 'Code of Conduct Breaches', '205-3 (2016)', 'Conflict of interest — confirmed', 'Case', null, 'SO', 'Manual', 0, [], 'group', 0, 0, 1, 0, 'p.28'],
  ['Social & Relationship Capital', 'Code of Conduct Breaches', '205-3 (2016)', 'Corporate compliance — confirmed', 'Case', null, 'SO', 'Manual', 0, [], 'group', 0, 2, 1, 3, 'p.28'],
  ['Social & Relationship Capital', 'Code of Conduct Breaches', '206-1 (2016)', 'Verbal warnings issued', 'Case', null, 'SO', 'Manual', null, [], 'group', 6, 2, 1, 2, 'p.28'],
  ['Social & Relationship Capital', 'Code of Conduct Breaches', '206-1 (2016)', 'Written warnings issued', 'Case', null, 'SO', 'Manual', null, [], 'group', 3, 2, 0, 1, 'p.28'],
  ['Social & Relationship Capital', 'Code of Conduct Breaches', '206-1 (2016)', 'Dismissals', 'Case', null, 'SO', 'Manual', 0, [], 'group', 6, 6, 2, 0, 'p.28'],
  ['Social & Relationship Capital', 'Code of Conduct Breaches', '206-1 (2016)', 'Contract terminations', 'Case', null, 'SO', 'Manual', 0, [], 'group', 4, 0, 0, 0, 'p.28'],
  ['Social & Relationship Capital', 'Non-Compliance', '2-27 (2021)', 'Significant non-compliance with fines', 'Case', null, 'SO', 'Manual', 0, [], 'group', 0, 0, 0, 0, 'p.28'],
  ['Social & Relationship Capital', 'Non-Compliance', '2-27 (2021)', 'Significant non-compliance with non-monetary sanctions', 'Case', null, 'SO', 'Manual', 0, [], 'group', 0, 0, 0, 0, 'p.28'],
  ['Social & Relationship Capital', 'Non-Compliance', '2-27 (2021)', 'Total monetary value of fines', 'Baht', null, 'SO', 'Manual', 0, [], 'group', 0, 0, 0, 0, 'p.29'],

  // Supply Chain (308-1, 414-1, 2-6, 308-2, 414-2)
  ['Social & Relationship Capital', 'Supply Chain Screening', '308-1 (2016)', 'New suppliers screened — environmental criteria', '% of new suppliers', null, 'TL', 'Connector', 100, [], 'group', 100, 100, 100, 100, 'p.29'],
  ['Social & Relationship Capital', 'Supply Chain Screening', '414-1 (2016)', 'New suppliers screened — social criteria', '% of new suppliers', null, 'TL', 'Connector', 100, [], 'group', 100, 100, 100, 100, 'p.29'],
  ['Social & Relationship Capital', 'Supplier KPIs', '2-6 (2021)', 'Total Tier-1 suppliers', 'Number', null, 'TL', 'Connector', null, [], 'group', 4242, 4241, 4216, 4222, 'p.29'],
  ['Social & Relationship Capital', 'Supplier KPIs', '2-6 (2021)', 'Significant suppliers in Tier-1', 'Number', null, 'TL', 'Connector', null, [], 'group', 84, 153, 200, 201, 'p.29'],
  ['Social & Relationship Capital', 'Supplier KPIs', '2-6 (2021)', '% of total spend on significant Tier-1 suppliers', '% of total spend', null, 'FM', 'Calculator', null, [], 'group', 30, 56, 90.44, 90.18, 'p.29'],
  ['Social & Relationship Capital', 'Supplier Assessment', '308-2 (2016)', 'Suppliers assessed (desk/on-site)', 'Number', null, 'TL', 'Connector', null, [], 'group', 84, 153, 86, 200, 'p.29'],
  ['Social & Relationship Capital', 'Supplier Assessment', '414-2 (2016)', 'Suppliers assessed — % of significant', '% of significant', null, 'TL', 'Calculator', null, [], 'group', 100, 100, 42.79, 99.50, 'p.29'],
  ['Social & Relationship Capital', 'Supplier Assessment', '308-2 (2016)', 'Suppliers with substantial negative impacts', 'Number', null, 'TL', 'Connector', null, [], 'group', 0, 11, 7, 14, 'p.29'],
  ['Social & Relationship Capital', 'Supplier Assessment', '308-2 (2016)', 'Suppliers in capacity-building programs', 'Number', null, 'TL', 'Connector', null, [], 'group', 4, 11, 93, 64, 'p.29'],

  // CSR (201-1 CSR)
  ['Social & Relationship Capital', 'Philanthropic Activities', '201-1 (2016)', 'Total contributions', 'Million Baht', null, 'SO', 'Manual', null, [], 'group', 142.29, 106.28, 72.77, 69.62, 'p.29'],
  ['Social & Relationship Capital', 'Philanthropic Activities', '201-1 (2016)', 'Charitable donations', 'Million Baht', null, 'SO', 'Manual', null, [], 'group', 43.45, 37.83, 23.27, 16.34, 'p.29'],
  ['Social & Relationship Capital', 'Philanthropic Activities', '201-1 (2016)', 'Community investments', 'Million Baht', null, 'SO', 'Manual', null, [], 'group', 77.27, 56.54, 46.91, 17.12, 'p.30'],
  ['Social & Relationship Capital', 'Philanthropic Activities', '201-1 (2016)', 'Commercial initiatives', 'Million Baht', null, 'SO', 'Manual', null, [], 'group', 21.58, 11.91, 2.59, 36.16, 'p.30'],
  ['Social & Relationship Capital', 'Philanthropic Activities', '201-1 (2016)', 'Employee volunteering hours', 'Hours', null, 'TL', 'Connector', null, [], 'group', 24679, 24867, 27615, 22918, 'p.30'],
  ['Social & Relationship Capital', 'Philanthropic Activities', '201-1 (2016)', 'Cash contribution', 'Million Baht', null, 'SO', 'Manual', null, [], 'group', 94.98, 77.35, 48, 59.48, 'p.30'],
  ['Social & Relationship Capital', 'Philanthropic Activities', '201-1 (2016)', 'Products or services donations', 'Million Baht', null, 'SO', 'Manual', null, [], 'group', 26.57, 24.69, 19.85, 8.68, 'p.30'],
  ['Social & Relationship Capital', 'Local Community', '413-1', 'Operations with community engagement programs', '%', null, 'SO', 'Connector', 100, [], 'group', 100, 100, 100, 100, 'p.30'],
  ['Social & Relationship Capital', 'Local Community', '413-1', 'Community satisfaction survey', '%', null, 'SO', 'Manual', 86, [], 'group', 90.46, 92.38, 92.72, 92.72, 'p.30'],

  // Customer Relationship
  ['Social & Relationship Capital', 'Customer Relations', '—', 'Satisfied clients', '% of total clients', null, 'SO', 'Manual', 95, [], 'group', 95, 95, 96, 96, 'p.30'],
  ['Social & Relationship Capital', 'Customer Relations', '—', 'Customer satisfaction result', '%', null, 'SO', 'Manual', 93, [], 'group', 93, 93, 94, 94, 'p.30'],

  // ─── Natural Capital — Materials (301) ───
  ['Natural Capital', 'Materials', '301-1 (2016)', 'Total material used', 'Million tons', null, 'SO', 'Connector', null, [], 'group', 25.41, 26.95, 27.51, 24.41, 'p.31'],
  ['Natural Capital', 'Materials', '301-1 (2016)', 'Non-renewable material', 'Million tons', null, 'SO', 'Connector', null, [], 'group', 24.89, 26.41, 27.03, 23.84, 'p.31'],
  ['Natural Capital', 'Materials', '301-1 (2016)', 'Renewable material', 'Million tons', null, 'SO', 'Connector', null, [], 'group', 0.52, 0.54, 0.47, 0.57, 'p.31'],
  ['Natural Capital', 'Materials', '301-2 (2016)', 'Recycled input materials used', '%', null, 'SO', 'Calculator', null, [], 'group', 2, 2, 2, null, 'p.31'],

  // Energy (302-1)
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Total energy consumed', 'MWh', null, 'AUTO', 'Connector', null, [], 'group', 36882002.30, 39301803.77, 36410566.73, 34987371.24, 'p.31'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Percentage grid electricity', '%', null, 'AUTO', 'Calculator', null, [], 'group', 7.44, 7.95, 6.41, 7.59, 'p.31'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Percentage renewable', '%', null, 'AUTO', 'Calculator', null, [], 'group', 0, 0.02, 0.03, 0.03, 'p.31'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Total self-generated energy', 'MWh', null, 'AUTO', 'Connector', null, [], 'group', 18325256.79, 21019448.28, 19562256.39, 20833549.97, 'p.31'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Total direct non-renewable energy consumption', 'MWh', null, 'AUTO', 'Connector', null, [], 'group', 31365326.88, 33778672.42, 33707316.68, 31797313.56, 'p.31'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Natural gas', 'MWh', null, 'AUTO', 'Connector', null, [], 'group', 12825626.08, 12448018.55, 13890581.99, 10807102.63, 'p.31'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'LPG', 'MWh', null, 'AUTO', 'Connector', null, [], 'group', 4591.40, 4467.20, 54245.33, 9081.66, 'p.31'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Diesel', 'MWh', null, 'AUTO', 'Connector', null, [], 'group', 701.79, 789.70, 820.22, 734.45, 'p.31'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Pyrolysis gas oil', 'MWh', null, 'AUTO', 'Connector', null, [], 'group', 48293.59, 97164.20, 28464.99, 0, 'p.31'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Recovered volatile (RV)', 'MWh', null, 'AUTO', 'Connector', null, [], 'group', 2031.38, 0, 5750.27, 456.25, 'p.31'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Foul hexane', 'MWh', null, 'AUTO', 'Connector', null, [], 'group', 8599.05, 8256.05, 0, 0, 'p.31'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Fuel oil', 'MWh', null, 'AUTO', 'Connector', null, [], 'group', 150226.80, 203037.08, 169486.73, 146388.60, 'p.31'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Fuel gas', 'MWh', null, 'AUTO', 'Connector', null, [], 'group', 18325256.79, 21016939.64, 19557967.16, 20833549.97, 'p.31'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Total indirect energy consumption', 'MWh', null, 'AUTO', 'Connector', null, [], 'group', 9883926.43, 11199182.70, 8643873.77, 9056737.14, 'p.31'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Electricity (non-renewable) purchased', 'MWh', null, 'AUTO', 'Connector', null, [], 'group', 2742560.64, 3125734.31, 2332510.05, 2656395.32, 'p.31'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Steam (non-renewable) purchased', 'MWh', null, 'AUTO', 'Connector', null, [], 'group', 7114719.25, 8073448.39, 6311363.71, 6400341.82, 'p.31'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Cooling (non-renewable) purchased', 'MWh', null, 'AUTO', 'Connector', null, [], 'group', 26646.54, 0, 0, 0, 'p.31'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Total non-renewable energy sold', 'MWh', null, 'AUTO', 'Connector', null, [], 'group', 5278408.27, 5682255.09, 5951392.25, 5866679.46, 'p.31'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Electricity sold', 'MWh', null, 'AUTO', 'Connector', null, [], 'group', 2066431.02, 2088174.73, 2150186.10, 2169153.90, 'p.31'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Steam sold', 'MWh', null, 'AUTO', 'Connector', null, [], 'group', 3208432.25, 3591924.74, 3797314.88, 3697525.56, 'p.31'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Total renewable energy (solar + wind)', 'MWh', null, 'AUTO', 'Connector', null, [], 'group', 1339.37, 6203.73, 10768.53, 10662.60, 'p.31'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Solar cell', 'MWh', null, 'AUTO', 'Connector', null, [], 'group', 1339.37, 3695.09, 6479.29, 10662.60, 'p.31'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Wind turbine', 'MWh', null, 'AUTO', 'Connector', null, [], 'group', 0, 2508.64, 4289.24, 0, 'p.31'],
  ['Natural Capital', 'Energy Savings', '302-4 (2016)', 'Total energy saved', 'MWh', null, 'SO', 'Manual', null, [], 'group', 400235.70, 205386.20, 267167.23, 441582.92, 'p.32'],
  ['Natural Capital', 'Energy Savings', '302-4 (2016)', 'Fuel savings', 'MWh', null, 'SO', 'Manual', null, [], 'group', 228350.81, 69741.29, 59029.76, 224531.17, 'p.32'],
  ['Natural Capital', 'Energy Savings', '302-4 (2016)', 'Electricity savings', 'MWh', null, 'SO', 'Manual', null, [], 'group', 10189.93, 10848.98, 24426.40, 28391.95, 'p.32'],
  ['Natural Capital', 'Energy Savings', '302-4 (2016)', 'Steam savings', 'MWh', null, 'SO', 'Manual', null, [], 'group', 161694.96, 124795.93, 183711.07, 188659.81, 'p.32'],

  // GHG (305-1, 305-2, 305-3, 305-4, 305-5)
  ['Natural Capital', 'Greenhouse Gas Emissions (GHGs)', '305-1 (2016)', 'Total direct GHG emissions (Scope 1)', 'Million tons CO2e', null, 'SO', 'Calculator', 7.05, IPCC, 'group', 6.14, 6.13, 6.17, 5.77, 'p.32'],
  ['Natural Capital', 'Greenhouse Gas Emissions (GHGs)', '305-1 (2016)', 'Direct GHG emissions from methane', 'Million tons CO2e', null, 'SO', 'Calculator', null, IPCC, 'group', 0.32, 0.35, 0.33, 0.35, 'p.32'],
  ['Natural Capital', 'Greenhouse Gas Emissions (GHGs)', '305-1 (2016)', 'Total biogenic CO2 emissions (Scope 1)', 'Tons CO2e', null, 'SO', 'Calculator', null, IPCC, 'group', 150, 166, 152, 158, 'p.32'],
  ['Natural Capital', 'Greenhouse Gas Emissions (GHGs)', '305-2 (2016)', 'Indirect GHGs (Scope 2) — market-based', 'Million tons CO2e', 'market', 'SO', 'Calculator', 1.84, IPCC, 'group', 2.00, 1.80, 1.66, 1.51, 'p.32'],
  ['Natural Capital', 'Greenhouse Gas Emissions (GHGs)', '305-2 (2016)', 'Indirect GHGs (Scope 2) — location-based', 'Million tons CO2e', 'location', 'SO', 'Calculator', null, IPCC, 'group', 2.00, 1.79, 1.85, 1.69, 'p.32'],
  ['Natural Capital', 'Greenhouse Gas Emissions (GHGs)', '305-3 (2016)', 'Other indirect GHG emissions (Scope 3)', 'Million tons CO2e', null, 'SO', 'Manual', null, ['Categories 1,2,3,4,5,6,7,8,9,15'], 'group', 36.40, 41.20, 40.20, 35.78, 'p.32'],
  ['Natural Capital', 'Greenhouse Gas Emissions (GHGs)', '305-4 (2016)', 'GHG emission intensity (Scope 1 & 2)', 'Tons CO2e / tons production', null, 'SO', 'Calculator', null, [], 'group', 0.40, 0.37, 0.36, 0.37, 'p.33'],
  ['Natural Capital', 'Greenhouse Gas Emissions (GHGs)', '305-5 (2016)', 'Total estimated annual CO2 savings', 'Tons CO2e', null, 'SO', 'Manual', 26400, [], 'group', 59903, 36981, 39351, 85198, 'p.33'],

  // Air emissions (305-7)
  ['Natural Capital', 'Air Emissions', '305-7 (2016)', 'VOCs', 'Tons VOCs', null, 'AUTO', 'Connector', 480, [], 'group', 482, 571, 574, 448, 'p.33'],
  ['Natural Capital', 'Air Emissions', '305-7 (2016)', 'VOCs intensity', 'Tons / Mt production', null, 'AUTO', 'Calculator', null, [], 'group', 28, 32, 32, 23, 'p.33'],
  ['Natural Capital', 'Air Emissions', '305-7 (2016)', 'NOx emissions', 'Tons NOx', null, 'AUTO', 'Connector', 2750, [], 'group', 3213, 2748, 3268, 2712, 'p.33'],
  ['Natural Capital', 'Air Emissions', '305-7 (2016)', 'NOx intensity', 'Tons / Mt production', null, 'AUTO', 'Calculator', null, [], 'group', 159.06, 126.81, 148.61, 137, 'p.33'],
  ['Natural Capital', 'Air Emissions', '305-7 (2016)', 'SOx emissions', 'Tons SOx', null, 'AUTO', 'Connector', 380, [], 'group', 492, 429, 510, 363, 'p.33'],
  ['Natural Capital', 'Air Emissions', '305-7 (2016)', 'SOx intensity', 'Tons / Mt production', null, 'AUTO', 'Calculator', null, [], 'group', 24, 20, 23, 18, 'p.33'],

  // Water consumption (303-5)
  ['Natural Capital', 'Water Consumption', '303-5 (2018)', 'Withdrawal — municipal water supplies', 'Million m³', null, 'AUTO', 'Connector', null, [], 'group', 47.96, 48.55, 51.71, 47.02, 'p.33'],
  ['Natural Capital', 'Water Consumption', '303-5 (2018)', 'Withdrawal — fresh surface water', 'Million m³', null, 'AUTO', 'Connector', null, [], 'group', 0.28, 0.41, 0.55, 0.79, 'p.33'],
  ['Natural Capital', 'Water Consumption', '303-5 (2018)', 'Withdrawal — fresh ground water', 'Million m³', null, 'AUTO', 'Connector', null, [], 'group', 0, 0.01, 0.01, 0.01, 'p.33'],
  ['Natural Capital', 'Water Consumption', '303-5 (2018)', 'Water withdrawal (excl. salt)', 'Million m³', null, 'AUTO', 'Connector', null, [], 'group', 48.25, 48.97, 52.26, 47.81, 'p.33'],
  ['Natural Capital', 'Water Consumption', '303-5 (2018)', 'Water discharge (excl. salt)', 'Million m³', null, 'AUTO', 'Connector', null, [], 'group', 9.81, 12.36, 12.60, 10.05, 'p.33'],
  ['Natural Capital', 'Water Consumption', '303-5 (2018)', 'Total net fresh water consumption', 'Million m³', null, 'AUTO', 'Connector', 38.00, [], 'group', 38.44, 36.61, 39.66, 37.76, 'p.33'],
  ['Natural Capital', 'Water Consumption', '303-5 (2018)', 'Water consumption — water-stressed areas', 'Million m³', null, 'AUTO', 'Connector', null, [], 'group', 41.90, 42.44, 45.19, 37.76, 'p.34'],

  // Water withdrawal (303-3)
  ['Natural Capital', 'Water Withdrawal', '303-3 (2018)', 'Total water withdrawal from all areas', 'Mega litres', null, 'AUTO', 'Connector', null, [], 'group', 55866.94, 56100.89, 60523.72, 56865.63, 'p.34'],
  ['Natural Capital', 'Water Withdrawal', '303-3 (2018)', 'Fresh water (≤1,000 mg/L TDS)', 'Mega litres', null, 'AUTO', 'Connector', null, [], 'group', 48247.54, 48971.10, 52302.57, 47842.25, 'p.34'],
  ['Natural Capital', 'Water Withdrawal', '303-3 (2018)', 'Fresh surface water', 'Mega litres', null, 'AUTO', 'Connector', null, [], 'group', 284.69, 411.89, 552.45, 785.45, 'p.34'],
  ['Natural Capital', 'Water Withdrawal', '303-3 (2018)', 'Fresh groundwater', 'Mega litres', null, 'AUTO', 'Connector', null, [], 'group', 4.64, 6.92, 5.66, 5.87, 'p.34'],
  ['Natural Capital', 'Water Withdrawal', '303-3 (2018)', 'Fresh produced water', 'Mega litres', null, 'AUTO', 'Connector', null, [], 'group', 0, 0, 39.44, 28.91, 'p.34'],
  ['Natural Capital', 'Water Withdrawal', '303-3 (2018)', 'Fresh third-party water', 'Mega litres', null, 'AUTO', 'Connector', null, [], 'group', 47958.21, 48552.29, 51705.02, 47022.02, 'p.34'],
  ['Natural Capital', 'Water Withdrawal', '303-3 (2018)', 'Other water (>1,000 mg/L TDS)', 'Mega litres', null, 'AUTO', 'Connector', null, [], 'group', 7619.40, 7129.79, 8221.16, 9023.38, 'p.34'],
  ['Natural Capital', 'Water Withdrawal', '303-3 (2018)', 'Seawater withdrawal', 'Mega litres', null, 'AUTO', 'Connector', null, [], 'group', 7569, 6998, 8012.71, 8809, 'p.34'],
  ['Natural Capital', 'Water Withdrawal', '303-3 (2018)', 'Other third-party water', 'Mega litres', null, 'AUTO', 'Connector', null, [], 'group', 50, 132, 208, 215, 'p.34'],
  ['Natural Capital', 'Water Withdrawal', '303-3 (2018)', 'Withdrawal in water-stressed areas', 'Mega litres', null, 'AUTO', 'Connector', null, [], 'group', 48010.23, 48734.60, 52072.40, 47556.74, 'p.34'],
  ['Natural Capital', 'Water Withdrawal', '303-3 (2018)', 'Water consumption intensity', 'm³ / ton production', null, 'AUTO', 'Calculator', null, [], 'group', 0.00207, 0.00196, 0.00205, 0.00191, 'p.35'],
  ['Natural Capital', 'Water Withdrawal', '303-3 (2018)', 'Water recycled & reused', 'Mega litres', null, 'AUTO', 'Connector', null, [], 'group', 1655.01, 2466.45, 1870.50, 2233.38, 'p.35'],
  ['Natural Capital', 'Water Withdrawal', '303-3 (2018)', 'Water recycled & reused', '% of total withdrawal', null, 'AUTO', 'Calculator', null, [], 'group', 2.96, 4.40, 3.09, 3.93, 'p.35'],

  // Water discharge (303-4)
  ['Natural Capital', 'Water Discharge', '303-4 (2018)', 'Total water discharge to all areas', 'Mega litres', null, 'AUTO', 'Connector', null, [], 'group', 19617.99, 24725.74, 25243.85, 20163.10, 'p.35'],
  ['Natural Capital', 'Water Discharge', '303-4 (2018)', 'Discharge — surface water', 'Mega litres', null, 'AUTO', 'Connector', null, [], 'group', 768, 708, 1197, 384, 'p.35'],
  ['Natural Capital', 'Water Discharge', '303-4 (2018)', 'Discharge — seawater', 'Mega litres', null, 'AUTO', 'Connector', null, [], 'group', 9809, 12363, 12640.36, 10082, 'p.35'],
  ['Natural Capital', 'Water Discharge', '303-4 (2018)', 'Discharge — third-party water', 'Mega litres', null, 'AUTO', 'Connector', null, [], 'group', 9041, 11655, 11406, 9671, 'p.35'],
  ['Natural Capital', 'Water Discharge', '303-4 (2018)', 'COD loading — surface water', 'Tons', null, 'AUTO', 'Connector', null, [], 'group', 6.42, 7.82, 9.64, 24, 'p.35'],
  ['Natural Capital', 'Water Discharge', '303-4 (2018)', 'COD loading — seawater', 'Tons', null, 'AUTO', 'Connector', null, [], 'group', 133.67, 162.98, 234.83, 200, 'p.35'],
  ['Natural Capital', 'Water Discharge', '303-4 (2018)', 'COD loading — third-party', 'Tons', null, 'AUTO', 'Connector', null, [], 'group', 1269.52, 1075.16, 872, 845, 'p.35'],
  ['Natural Capital', 'Water Discharge', '303-4 (2018)', 'Total direct COD', 'Tons', null, 'TL', 'Manual', 1100, [], 'group', 1410, 1246, 1116, 1069, 'p.35'],
  ['Natural Capital', 'Water Discharge', '303-4 (2018)', 'Discharge to water-stressed areas', 'Mega litres', null, 'AUTO', 'Connector', null, [], 'group', 19476.61, 24536.76, 25036.38, 19934.67, 'p.35'],

  // Waste — routine (306-3, 306-4, 306-5)
  ['Natural Capital', 'Routine Waste', '306-3 (2020)', 'Total waste generated (routine)', 'Tons', null, 'TL', 'Connector', null, [], 'group', 136521.28, 121023.04, 85219.00, 77130.43, 'p.35'],
  ['Natural Capital', 'Routine Waste', '306-3 (2020)', 'Total hazardous waste generated', 'Tons', null, 'TL', 'Connector', 38600, [], 'group', 95486.50, 85920.96, 51184.75, 44837.68, 'p.35'],
  ['Natural Capital', 'Routine Waste', '306-3 (2020)', 'Total non-hazardous waste generated', 'Tons', null, 'TL', 'Connector', 2300, [], 'group', 41034.79, 35102.08, 34034.25, 32292.76, 'p.36'],
  ['Natural Capital', 'Routine Waste', '306-4 (2020)', 'Total waste diverted from disposal', 'Tons', null, 'TL', 'Connector', null, [], 'group', 41198.40, 34164.17, 37410.62, 36435.15, 'p.36'],
  ['Natural Capital', 'Routine Waste', '306-4 (2020)', 'Hazardous waste diverted', 'Tons', null, 'TL', 'Connector', null, [], 'group', 11688.28, 6810.40, 6671.52, 6370.59, 'p.36'],
  ['Natural Capital', 'Routine Waste', '306-4 (2020)', 'Hazardous waste — preparation for reuse', 'Tons', null, 'TL', 'Connector', null, [], 'group', 738.61, 24.13, 177.13, 300.17, 'p.36'],
  ['Natural Capital', 'Routine Waste', '306-4 (2020)', 'Hazardous waste — recycling', 'Tons', null, 'TL', 'Connector', null, [], 'group', 10062.03, 4779.05, 5768.86, 5166.01, 'p.36'],
  ['Natural Capital', 'Routine Waste', '306-4 (2020)', 'Hazardous waste — other recovery', 'Tons', null, 'TL', 'Connector', null, [], 'group', 887.64, 2007.22, 725.54, 904.41, 'p.36'],
  ['Natural Capital', 'Routine Waste', '306-4 (2020)', '% hazardous waste recycled', '%', null, 'TL', 'Calculator', null, [], 'group', 12.24, 7.93, 13.03, 14.21, 'p.36'],
  ['Natural Capital', 'Routine Waste', '306-4 (2020)', 'Non-hazardous waste diverted', 'Tons', null, 'TL', 'Connector', null, [], 'group', 29510.12, 27353.77, 30739.10, 30064.56, 'p.36'],
  ['Natural Capital', 'Routine Waste', '306-4 (2020)', 'Non-hazardous — preparation for reuse', 'Tons', null, 'TL', 'Connector', null, [], 'group', 1721.48, 943.76, 592.05, 2308.20, 'p.36'],
  ['Natural Capital', 'Routine Waste', '306-4 (2020)', 'Non-hazardous — recycling', 'Tons', null, 'TL', 'Connector', null, [], 'group', 27463.97, 25969.39, 29722.02, 27455.14, 'p.36'],
  ['Natural Capital', 'Routine Waste', '306-4 (2020)', 'Non-hazardous — other recovery', 'Tons', null, 'TL', 'Connector', null, [], 'group', 324.68, 440.62, 425.03, 301.22, 'p.36'],
  ['Natural Capital', 'Routine Waste', '306-5 (2020)', 'Total waste directed to disposal', 'Tons', null, 'TL', 'Connector', null, [], 'group', 95322.88, 86858.87, 47808.38, 40695.29, 'p.36'],
  ['Natural Capital', 'Routine Waste', '306-5 (2020)', 'Hazardous — incineration with energy recovery', 'Tons', null, 'TL', 'Connector', null, [], 'group', 58354.38, 64699.09, 30624.77, 30581.81, 'p.36'],
  ['Natural Capital', 'Routine Waste', '306-5 (2020)', 'Hazardous — incineration without energy recovery', 'Tons', null, 'TL', 'Connector', null, [], 'group', 25350.46, 13171.54, 13692.90, 7875.28, 'p.36'],
  ['Natural Capital', 'Routine Waste', '306-5 (2020)', 'Hazardous — landfilling', 'Tons', null, 'TL', 'Connector', 0, [], 'group', 0, 0, 0, 0, 'p.36'],
  ['Natural Capital', 'Routine Waste', '306-5 (2020)', 'Hazardous — other disposal operations', 'Tons', null, 'TL', 'Connector', null, [], 'group', 93.37, 1239.93, 195.55, 9.99, 'p.36'],
  ['Natural Capital', 'Routine Waste', '306-5 (2020)', 'Non-hazardous — incineration with energy recovery', 'Tons', null, 'TL', 'Connector', null, [], 'group', 7395.33, 6929.91, 2937.10, 1808.56, 'p.37'],
  ['Natural Capital', 'Routine Waste', '306-5 (2020)', 'Non-hazardous — incineration without energy recovery', 'Tons', null, 'TL', 'Connector', null, [], 'group', 8.64, 11.80, 5.00, 49.37, 'p.37'],
  ['Natural Capital', 'Routine Waste', '306-5 (2020)', 'Non-hazardous — secured landfilling', 'Tons', null, 'TL', 'Connector', 0, [], 'group', 0, 0, 0, 0, 'p.37'],
  ['Natural Capital', 'Routine Waste', '306-5 (2020)', 'Non-hazardous — land reclamation', 'Tons', null, 'TL', 'Connector', null, [], 'group', 4120.70, 806.61, 353.05, 370.27, 'p.37'],
  ['Natural Capital', 'Routine Waste', '306-5 (2020)', 'Municipal waste to sanitary landfill', 'Tons', null, 'TL', 'Connector', null, [], 'group', 2248.62, 2019.84, 2033.02, 2781.34, 'p.37'],

  // Non-routine waste
  ['Natural Capital', 'Non-routine Waste', '306-3 (2020)', 'Total non-routine waste generated', 'Tons', null, 'TL', 'Connector', null, [], 'group', 41524.00, 7244.57, 234.50, 12642.59, 'p.37'],
  ['Natural Capital', 'Non-routine Waste', '306-3 (2020)', 'Non-routine hazardous waste generated', 'Tons', null, 'TL', 'Connector', null, [], 'group', 970.00, 2003.70, 204.35, 11942.09, 'p.37'],
  ['Natural Capital', 'Non-routine Waste', '306-3 (2020)', 'Non-routine non-hazardous waste generated', 'Tons', null, 'TL', 'Connector', null, [], 'group', 40554.00, 5240.87, 30.15, 700.50, 'p.37'],

  // Spills (306-3)
  ['Natural Capital', 'Spills', '306-3 (2016)', 'Oil spills — cases', 'Case', null, 'TL', 'Manual', 0, [], 'group', 0, 0, 0, 0, 'p.38'],
  ['Natural Capital', 'Spills', '306-3 (2016)', 'Oil spills — volume', 'm³', null, 'TL', 'Manual', 0, [], 'group', 0, 0, 0, 0, 'p.38'],
  ['Natural Capital', 'Spills', '306-3 (2016)', 'Fuel spills — cases', 'Case', null, 'TL', 'Manual', 0, [], 'group', 0, 0, 0, 0, 'p.38'],
  ['Natural Capital', 'Spills', '306-3 (2016)', 'Waste spills — cases', 'Case', null, 'TL', 'Manual', 0, [], 'group', 0, 0, 0, 0, 'p.39'],
  ['Natural Capital', 'Spills', '306-3 (2016)', 'Chemical spills — cases', 'Case', null, 'TL', 'Manual', 0, [], 'group', 0, 0, 0, 0, 'p.39'],
  ['Natural Capital', 'Environmental Violations', '—', 'Violations of legal obligations', 'Number', null, 'SO', 'Manual', 0, [], 'group', 0, 0, 0, 0, 'p.39'],
  ['Natural Capital', 'Environmental Violations', '—', 'Fines/penalties for environmental violations', 'Million baht', null, 'SO', 'Manual', 0, [], 'group', 0, 0, 0, 0, 'p.39'],
  ['Natural Capital', 'Environmental Reporting', '2-5 (2021)', 'Coverage of publicly available environmental data', '% of production volume', null, 'SO', 'Connector', null, [], 'group', 100, 100, 100, 100, 'p.39'],

  // Operational / production
  ['Natural Capital', 'Operational Eco-Efficiency', '—', 'Total production volume', 'Million tons', null, 'FM', 'Connector', null, [], 'group', 20.20, 21.67, 21.99, 19.81, 'p.39'],

  // Product Stewardship — LCA
  ['Natural Capital', 'Product Stewardship — LCA', '—', 'Full product LCAs conducted', '% of total products', null, 'SO', 'Manual', null, [], 'group', 4, 4, 4, 5, 'p.39'],
  ['Natural Capital', 'Product Stewardship — LCA', '—', 'Simplified product LCAs conducted', '% of total products', null, 'SO', 'Manual', null, [], 'group', 54, 63, 63, 67, 'p.39'],
  ['Natural Capital', 'Product Stewardship — LCA', '—', 'Other product assessments', '% of total products', null, 'SO', 'Manual', null, [], 'group', 42, 33, 33, 28, 'p.39'],
  ['Natural Capital', 'Product Stewardship — Renewable', '301-1 (2016)', 'Raw materials from renewable resources', '% of total products', null, 'SO', 'Calculator', null, [], 'group', 2.05, 2.01, 2.00, 2.34, 'p.39'],
  ['Natural Capital', 'Hazardous Substances', '—', 'Products with Annex XVII REACH restricted substances', '% of total products (by revenue)', null, 'SO', 'Manual', null, [], 'group', 4, 2, 2, 2, 'p.39'],
  ['Natural Capital', 'Hazardous Substances', '—', 'Products with SVHC above 0.1% by weight', '% of total products', null, 'SO', 'Manual', null, [], 'group', 2.00, 1.85, 1.66, 1.72, 'p.39'],
  ['Natural Capital', 'Hazardous Substances', '—', 'Products with GHS Category 1 & 2 hazardous substances', '% of total products', null, 'SO', 'Manual', null, [], 'group', 25, 23, 21, 21, 'p.39'],
  ['Natural Capital', 'Hazardous Substances', '—', 'Products risk-assessed for human health & environment', '% of total products', null, 'SO', 'Manual', null, [], 'group', 100, 100, 100, 100, 'p.39'],
  ['Natural Capital', 'Hazardous Substances', '—', 'Revenue from use-phase resource-efficiency products', 'Million baht', null, 'FM', 'Manual', null, [], 'group', null, null, 25603, 28905, 'p.40'],

  // Climate strategy
  ['Natural Capital', 'Climate Strategy Impact', '—', 'Estimated annual CO2 savings from projects', 'Tons CO2e', null, 'SO', 'Manual', 26400, [], 'group', 100336, 52606, 58017, 85198, 'p.40'],
  ['Natural Capital', 'Climate Strategy Impact', '—', 'Total annual investment required for CO2 savings', 'Million baht', null, 'FM', 'Manual', null, [], 'group', 268, 605, 349, 1116, 'p.40'],
  ['Natural Capital', 'Climate Strategy Impact', '—', 'Total anticipated annual cost savings', 'Million baht', null, 'FM', 'Manual', null, [], 'group', 384, 365, 382, 389, 'p.40'],

  // ══════════════════════════════════════════════════════════════════════════════
  // JV PARALLEL SCOPE — WHA GC Logistics + PTT MCC Biochem + HMC Polymers
  // ══════════════════════════════════════════════════════════════════════════════

  // Human Capital — JV
  ['Human Capital', 'Worker', '—', 'Total worker (JV)', 'Persons', 'total', 'TL', 'Connector', null, [], 'jv', 1415, 1615, 1400, 1361, 'p.41'],
  ['Human Capital', 'Worker', '2-7 (2021)', 'Total employee (JV)', 'Persons', 'total', 'TL', 'Connector', null, [], 'jv', 794, 930, 775, 776, 'p.41'],
  ['Human Capital', 'Worker', '2-7 (2021)', 'Total employee (JV)', 'Persons', 'male', 'TL', 'Connector', null, [], 'jv', 545, 666, 529, 524, 'p.41'],
  ['Human Capital', 'Worker', '2-7 (2021)', 'Total employee (JV)', 'Persons', 'female', 'TL', 'Connector', null, [], 'jv', 249, 264, 246, 252, 'p.41'],
  ['Human Capital', 'Worker', '2-8 (2021)', 'Contractor (JV)', 'Persons', 'total', 'TL', 'Connector', null, [], 'jv', 620, 596, 535, 503, 'p.41'],
  ['Human Capital', 'Workforce by Area', '2-7 (2021)', 'Total Employee — Rayong (JV)', 'Persons', 'male', 'TL', 'Connector', null, [], 'jv', 495, 620, 482, 482, 'p.41'],
  ['Human Capital', 'Workforce by Area', '2-7 (2021)', 'Total Employee — Rayong (JV)', 'Persons', 'female', 'TL', 'Connector', null, [], 'jv', 139, 149, 142, 147, 'p.41'],
  ['Human Capital', 'Workforce by Area', '2-7 (2021)', 'Total Employee — Bangkok (JV)', 'Persons', 'male', 'TL', 'Connector', null, [], 'jv', 48, 46, 47, 42, 'p.41'],
  ['Human Capital', 'Workforce by Area', '2-7 (2021)', 'Total Employee — Bangkok (JV)', 'Persons', 'female', 'TL', 'Connector', null, [], 'jv', 108, 115, 104, 105, 'p.41'],
  ['Human Capital', 'New Employees', '401-1 (2016)', 'New employees (JV)', 'Persons', 'total', 'TL', 'Connector', null, [], 'jv', 62, 60, 43, 36, 'p.43'],
  ['Human Capital', 'Turnover', '401-1 (2016)', 'Total employee turnover (JV)', 'Persons', 'total', 'TL', 'Connector', null, [], 'jv', 55, 55, 52, 41, 'p.44'],
  ['Human Capital', 'Training and Development', '404-1 (2016)', 'Average hours of training per FTE (JV)', 'Hours/person/year', null, 'TL', 'Manual', null, [], 'jv', 37.92, 34.97, null, 119.94, 'p.45'],
  ['Human Capital', 'Gender Diversity', '405-1 (2016)', 'Women in workforce (JV)', 'Persons', null, 'TL', 'Connector', null, [], 'jv', null, null, null, 252, 'p.46'],
  ['Human Capital', 'Gender Diversity', '405-1 (2016)', 'Women in management positions (JV)', 'Persons', null, 'TL', 'Connector', null, [], 'jv', null, null, null, 43, 'p.46'],
  ['Human Capital', 'Gender Diversity', '405-1 (2016)', 'Women on board of directors (JV)', 'Persons', null, 'SO', 'Manual', null, [], 'jv', null, null, null, 3, 'p.47'],

  // H&S — JV
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'Fatalities — employees (JV)', 'Case', null, 'TL', 'Manual', 0, [], 'jv', 0, 0, 0, 0, 'p.48'],
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'Fatalities — contractors (JV)', 'Case', null, 'TL', 'Manual', 0, [], 'jv', 0, 0, 0, 0, 'p.48'],
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'Total Recordable Work-Injuries — employees (JV)', 'Case', null, 'TL', 'Manual', null, [], 'jv', 0, 2, 3, 3, 'p.49'],
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'Total Recordable Work-Injuries — contractors (JV)', 'Case', null, 'TL', 'Manual', null, [], 'jv', 3, 7, 1, 1, 'p.49'],
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'TRIR — employees (JV)', 'Case/1M manhours', null, 'TL', 'Calculator', null, [], 'jv', 0, 0.81, 1.24, 1.77, 'p.50'],
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'TRIR — contractors (JV)', 'Case/1M manhours', null, 'TL', 'Calculator', null, [], 'jv', 0.73, 1.48, 0.24, 0.38, 'p.50'],
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'LTIFR — employees (JV)', 'Case/1M manhours', null, 'TL', 'Calculator', null, [], 'jv', 0, 0.41, 0, 0, 'p.50'],
  ['Human Capital', 'Health & Safety', '403-9 (2018)', 'LTIFR — contractors (JV)', 'Case/1M manhours', null, 'TL', 'Calculator', null, [], 'jv', 0.24, 0, 0, 0.38, 'p.50'],
  ['Human Capital', 'Process Safety', 'G4-OG13', 'Process Safety Events — Tier 1 (JV)', 'Number per 1M hours', null, 'SO', 'Manual', 0, [], 'jv', 0, 0, 0, 1, 'p.51'],
  ['Human Capital', 'Process Safety', 'G4-OG13', 'Process Safety Events — Tier 2 (JV)', 'Number per 1M hours', null, 'SO', 'Manual', null, [], 'jv', 0, 0, 0, 0, 'p.52'],

  // Natural Capital — JV
  ['Natural Capital', 'Materials', '301-1 (2016)', 'Total material used (JV)', 'Million tons', null, 'SO', 'Connector', null, [], 'jv', 0.56, 0.54, 0.16, 1.09, 'p.53'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Total energy consumed (JV)', 'MWh', null, 'AUTO', 'Connector', null, [], 'jv', 1987500.77, 1717466.63, 540182.18, 1041708.57, 'p.53'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Natural gas (JV)', 'MWh', null, 'AUTO', 'Connector', null, [], 'jv', 702116.95, 659991.22, 11853.97, 9525.98, 'p.53'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Electricity purchased (JV)', 'MWh', null, 'AUTO', 'Connector', null, [], 'jv', 443236.80, 376930.74, 38845.23, 1967.44, 'p.53'],
  ['Natural Capital', 'Energy Consumption', '302-1 (2016)', 'Steam purchased (JV)', 'MWh', null, 'AUTO', 'Connector', null, [], 'jv', 261514.47, 740315.12, 489482.98, 613622.83, 'p.53'],
  ['Natural Capital', 'Air Emissions', '305-7 (2016)', 'VOCs (JV)', 'Tons VOCs', null, 'AUTO', 'Connector', null, [], 'jv', 186, 163, 174, 119, 'p.53'],
  ['Natural Capital', 'Air Emissions', '305-7 (2016)', 'NOx emissions (JV)', 'Tons NOx', null, 'AUTO', 'Connector', null, [], 'jv', 63, 40, 55, 31.64, 'p.54'],
  ['Natural Capital', 'Air Emissions', '305-7 (2016)', 'SOx emissions (JV)', 'Tons SOx', null, 'AUTO', 'Connector', null, [], 'jv', 16.79, 17.09, 17.09, 0, 'p.54'],
  ['Natural Capital', 'Water Consumption', '303-5 (2018)', 'Withdrawal — municipal water supplies (JV)', 'Million m³', null, 'AUTO', 'Connector', null, [], 'jv', 11.08, 10.16, 10.62, 3.87, 'p.54'],
  ['Natural Capital', 'Water Consumption', '303-5 (2018)', 'Total net fresh water consumption (JV)', 'Million m³', null, 'AUTO', 'Connector', null, [], 'jv', 6.19, 5.80, 5.89, 3.87, 'p.54'],
  ['Natural Capital', 'Water Withdrawal', '303-3 (2018)', 'Total water withdrawal (JV)', 'Mega litres', null, 'AUTO', 'Connector', null, [], 'jv', 11075.32, 10161.38, 10624.27, 3871.54, 'p.54'],
  ['Natural Capital', 'Water Withdrawal', '303-3 (2018)', 'Fresh third-party water (JV)', 'Mega litres', null, 'AUTO', 'Connector', null, [], 'jv', 11075.32, 10161.38, 10624.27, 3871.54, 'p.55'],
  ['Natural Capital', 'Water Discharge', '303-4 (2018)', 'Total water discharge (JV)', 'Mega litres', null, 'AUTO', 'Connector', null, [], 'jv', 4886.60, 4362.09, 4736.04, 886.93, 'p.55'],
  ['Natural Capital', 'Water Discharge', '303-4 (2018)', 'Total direct COD (JV)', 'Tons', null, 'TL', 'Manual', null, [], 'jv', 1410, 1246, 169, 26.88, 'p.56'],
  ['Natural Capital', 'Routine Waste', '306-3 (2020)', 'Total waste generated — routine (JV)', 'Tons', null, 'TL', 'Connector', null, [], 'jv', 5920.91, 4168.44, 7348.63, 2790.38, 'p.56'],
  ['Natural Capital', 'Routine Waste', '306-3 (2020)', 'Hazardous waste generated — routine (JV)', 'Tons', null, 'TL', 'Connector', null, [], 'jv', 3627.81, 2578.40, 4159.64, 768.74, 'p.56'],
  ['Natural Capital', 'Routine Waste', '306-3 (2020)', 'Non-hazardous waste generated — routine (JV)', 'Tons', null, 'TL', 'Connector', null, [], 'jv', 2293.09, 1590.03, 3189.00, 2021.65, 'p.56'],
  ['Natural Capital', 'Routine Waste', '306-4 (2020)', 'Total waste diverted from disposal (JV)', 'Tons', null, 'TL', 'Connector', null, [], 'jv', 2551.54, 1755.59, 3954.12, 2107.93, 'p.56'],
  ['Natural Capital', 'Routine Waste', '306-5 (2020)', 'Total waste directed to disposal (JV)', 'Tons', null, 'TL', 'Connector', null, [], 'jv', 3369, 2413, 3394.51, 682.46, 'p.57'],
  ['Natural Capital', 'Routine Waste', '306-5 (2020)', 'Municipal waste to sanitary landfill (JV)', 'Tons', null, 'TL', 'Connector', null, [], 'jv', 479.54, 368.37, 320.16, 161.23, 'p.57'],
  ['Natural Capital', 'Non-routine Waste', '306-3 (2020)', 'Total non-routine waste generated (JV)', 'Tons', null, 'TL', 'Connector', null, [], 'jv', 41524, 7244.57, 234.50, 524.92, 'p.58'],
  ['Natural Capital', 'Spills', '306-3 (2016)', 'Oil spills — cases (JV)', 'Case', null, 'TL', 'Manual', 0, [], 'jv', 0, 0, 0, 0, 'p.59'],
  ['Natural Capital', 'Environmental Violations', '—', 'Violations of legal obligations (JV)', 'Number', null, 'SO', 'Manual', 0, [], 'jv', 0, 0, 0, 0, 'p.59'],
  ['Natural Capital', 'Operational Eco-Efficiency', '—', 'Total production volume (JV)', 'Million tons', null, 'FM', 'Connector', null, ['Recalculated in 2025 due to PTTAC cessation'], 'jv', 1.05, 0.84, 0.81, 0.99, 'p.59'],
]
