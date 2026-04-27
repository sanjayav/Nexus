/**
 * PTTGC Sustainability Performance Data — typed structure mirroring the
 * official PDF (5 capitals + JV section). Year columns are dynamic — adding
 * a year (e.g. 2026) appends a new column to every table.
 *
 * Values: number | null | { male, female } for split rows. `null` = NA.
 */

export type CellValue = number | null | { male: number | null; female: number | null }

export interface ReportRow {
  id: string                 // unique within table — used by Excel import
  gri?: string                // e.g. "201-1 (2016)"
  label: string              // "Sales revenue"
  unit: string               // "Million baht"
  split?: 'mf'               // if set, row uses { male, female } for each year
  indent?: 0 | 1 | 2         // indent level for nested rows
  values: Record<number, CellValue>  // keyed by year
}

export interface ReportTable {
  id: string
  title?: string             // e.g. "Direct Economic Value Generated"
  rows: ReportRow[]
}

export interface ReportSection {
  id: 'financial' | 'manufacture' | 'human' | 'social' | 'natural' | 'jv-human' | 'jv-natural'
  title: string              // e.g. "Financial Capital"
  scope: 'core' | 'jv'        // core (PTTGC + subs) or JV
  tables: ReportTable[]
}

export interface PttgcReport {
  organisation: string
  subtitle: string
  years: number[]            // sorted ascending — drives column rendering
  sections: ReportSection[]
}

const Y = [2022, 2023, 2024, 2025] as const

const v = (...xs: (number | null)[]): Record<number, CellValue> =>
  Object.fromEntries(Y.map((y, i) => [y, xs[i] ?? null])) as Record<number, CellValue>

const mf = (...pairs: ([number | null, number | null])[]): Record<number, CellValue> =>
  Object.fromEntries(Y.map((y, i) => [y, { male: pairs[i]?.[0] ?? null, female: pairs[i]?.[1] ?? null }])) as Record<number, CellValue>

// ─── FINANCIAL CAPITAL ────────────────────────────────────────────────
const financial: ReportSection = {
  id: 'financial', scope: 'core', title: 'Financial Capital',
  tables: [{
    id: 'fin-201',
    rows: [
      { id: 'fin-evg', gri: '201-1 (2016)', label: 'Direct Economic Value Generated', unit: '', values: v() },
      { id: 'fin-sales', label: 'Sales revenue', unit: 'Million baht', indent: 1, values: v(678267, 616635, 604045, 484907) },
      { id: 'fin-rev-goods', label: 'Revenues from sale of goods and rendering of services', unit: 'Million baht', indent: 1, values: v(683954, 621631, 608550, 487585) },
      { id: 'fin-net-sales', label: 'Net sales plus revenues from financial investments and sales of assets', unit: 'Million baht', indent: 1, values: v(684968, 625647, 610366, 489057) },
      { id: 'fin-evd', label: 'Economic Value Distributed', unit: '', values: v() },
      { id: 'fin-wages', label: 'Employee wages and benefits', unit: 'Million baht', indent: 1, values: v(8746, 12868, 12547, 12244) },
      { id: 'fin-opex', label: 'Operating cost', unit: 'Million baht', indent: 1, values: v(668947, 618411, 625108, 501385) },
      { id: 'fin-tax', label: 'Payments to government: Gross taxes', unit: 'Million baht', indent: 1, values: v(3346, 1729, 2130, 1237) },
      { id: 'fin-div', label: 'Payments to providers of capital: Dividends paid', unit: 'Million baht', indent: 1, values: v(11746, 1269, 3503, 2517) },
      { id: 'fin-com-inv', label: 'Community investments', unit: 'Million baht', indent: 1, values: v(77.27, 56.54, 46.91, 17.12) },
      { id: 'fin-evr', label: 'Economic value retained', unit: 'Million baht', indent: 1, values: v(-6802, -8686, -32696, -28343) },
      { id: 'fin-local', gri: '204-1 (2016)', label: 'Proportion of spending on local suppliers in Thailand', unit: '%', values: v(81, 81, 76, 84) },
    ],
  }],
}

// ─── MANUFACTURE CAPITAL ──────────────────────────────────────────────
const manufacture: ReportSection = {
  id: 'manufacture', scope: 'core', title: 'Manufacture Capital',
  tables: [{
    id: 'mfg-roi',
    title: 'Return on Environmental Investment',
    rows: [
      { id: 'mfg-total', gri: '2-5 (2021)', label: 'Total expenditures', unit: 'Million baht', values: v(1453, 2039, 1940, 2036) },
      { id: 'mfg-capex', label: 'Capital investments', unit: 'Million baht', indent: 1, values: v(546, 961, 887, 1190) },
      { id: 'mfg-opex', label: 'Operating expenses', unit: 'Million baht', indent: 1, values: v(907, 1078, 1053, 846) },
      { id: 'mfg-waste', label: 'Waste disposal, emission treatment, and remediation costs', unit: 'Million baht', indent: 2, values: v(840, 1009, 994, 814) },
      { id: 'mfg-prev', label: 'Prevention and environmental management costs', unit: 'Million baht', indent: 2, values: v(67, 69, 59, 32) },
      { id: 'mfg-savings', label: 'Savings, cost avoidance, income, tax incentives, etc.', unit: 'Million baht', indent: 1, values: v(494, 585, 380, 389.48) },
      { id: 'mfg-coverage', label: 'Operations covered (by revenue, production volume, or employees, etc.)', unit: '% of operation covered', values: v(100, 100, 100, 100) },
    ],
  }],
}

// ─── HUMAN CAPITAL (core) ─────────────────────────────────────────────
const human: ReportSection = {
  id: 'human', scope: 'core', title: 'Human Capital',
  tables: [
    {
      id: 'hc-workforce',
      title: 'Worker',
      rows: [
        { id: 'hc-total-worker', label: 'Total worker', unit: 'Persons', split: 'mf', values: mf([6663, 2607], [6276, 2506], [6157, 2520], [5909, 2488]) },
        { id: 'hc-total-employee', gri: '2-7 (2021)', label: 'Total employee', unit: 'Persons', split: 'mf', values: mf([4709, 1740], [4680, 1725], [5869, 2067], [4444, 1685]) },
        { id: 'hc-contractor', gri: '2-8 (2021)', label: 'Contractor', unit: 'Persons', split: 'mf', values: mf([1952, 867], [344, 461], [288, 453], [1465, 803]) },
      ],
    },
    {
      id: 'hc-area',
      title: 'Total Employee by Area',
      rows: [
        { id: 'hc-area-rayong', label: 'Rayong', unit: 'Persons', split: 'mf', values: mf([4309, 1114], [4294, 1102], [5464, 1444], [4033, 1076]) },
        { id: 'hc-area-bangkok', label: 'Bangkok', unit: 'Persons', split: 'mf', values: mf([354, 623], [336, 618], [355, 618], [361, 604]) },
        { id: 'hc-area-other', label: 'Other provinces', unit: 'Persons', split: 'mf', values: mf([46, 3], [50, 5], [50, 5], [50, 5]) },
      ],
    },
    {
      id: 'hc-new',
      title: 'New Employee',
      rows: [
        { id: 'hc-new-emp', gri: '401-1 (2016)', label: 'New employee', unit: 'Persons', split: 'mf', values: mf([183, 113], [132, 99], [125, 74], [59, 71]) },
        { id: 'hc-new-rate', label: 'New hire rate', unit: '% of total employees', split: 'mf', values: mf([2.39, 1.47], [2.06, 1.55], [1.58, 0.93], [0.96, 1.16]) },
      ],
    },
    {
      id: 'hc-turnover',
      title: 'Turnover',
      rows: [
        { id: 'hc-turn-total', label: 'Total employee turnover rate', unit: 'Persons', split: 'mf', values: mf([232, 133], [212, 124], [194, 93], [244, 97]) },
        { id: 'hc-turn-vol', label: 'Voluntary employee turnover rate', unit: 'Persons', split: 'mf', values: mf([185, 121], [158, 108], [136, 73], [156, 73]) },
      ],
    },
    {
      id: 'hc-training',
      title: 'Training and Development',
      rows: [
        { id: 'hc-train-hrs', gri: '404-1 (2016)', label: 'Average hours per FTE of training and development', unit: 'Hours/person/year', values: v(45.26, 40.33, 36.18, 61.28) },
        { id: 'hc-train-spent', label: 'Average amount spent per FTE on training and development', unit: 'Baht/person/year', values: v(14290.47, 13241.70, 13076.24, 10125.63) },
        { id: 'hc-train-total', label: 'Total investment on employees training', unit: 'Million baht', split: 'mf', values: mf([79.31, 31.98], [73.20, 25.12], [75.13, 28.65], [62.06, 22.99]) },
      ],
    },
    {
      id: 'hc-engagement',
      title: 'Employee Engagement',
      rows: [
        { id: 'hc-eng-result', label: 'Employee engagement result', unit: '% of actively engaged employees', values: v(65, 65, 77, 76) },
        { id: 'hc-eng-target', label: 'Employee engagement target', unit: '% of actively engaged employees', values: v(75, 72, 68, 80) },
        { id: 'hc-eng-coverage', label: 'Coverage', unit: '% of employees who responded', values: v(97, 98, 99, 97) },
      ],
    },
    {
      id: 'hc-diversity',
      title: 'Gender Diversity and Equal Remuneration',
      rows: [
        { id: 'hc-women-wf', gri: '405-1 (2016)', label: 'Women in workforce', unit: '% of total workforce', values: v(null, null, 26, 27.49) },
        { id: 'hc-women-mgmt', label: 'Women in management positions', unit: '% of total management', values: v(null, null, 31, 31) },
        { id: 'hc-women-top', label: 'Women in top management positions', unit: '% of total top management', values: v(null, null, 24, 28) },
        { id: 'hc-women-stem', label: 'Women in STEM-related positions', unit: '% of total STEM positions', values: v(null, null, 24, 24) },
      ],
    },
    {
      id: 'hc-ohs-fatal',
      title: 'Fatalities as a Result of Work-Related Injury',
      rows: [
        { id: 'hc-fatal-emp', gri: '403-9 (2018)', label: 'Employees', unit: 'Case', split: 'mf', values: mf([1, 0], [0, 0], [0, 0], [0, 0]) },
        { id: 'hc-fatal-cont', label: 'Contractors', unit: 'Case', split: 'mf', values: mf([1, 0], [0, 0], [0, 0], [0, 0]) },
        { id: 'hc-trir-emp', label: 'Recordable Work-Injuries Rate (employees)', unit: 'Case/1 million manhours', split: 'mf', values: mf([0.52, 0.26], [0.08, 0], [0.17, 0], [0.07, 0.25]) },
        { id: 'hc-trir-cont', label: 'Recordable Work-Injuries Rate (contractors)', unit: 'Case/1 million manhours', split: 'mf', values: mf([0.69, 0.21], [0.81, 0.63], [0.39, 0], [0.21, 0.26]) },
      ],
    },
    {
      id: 'hc-pse',
      title: 'Process Safety Events',
      rows: [
        { id: 'hc-pse-t1', gri: 'G4-OG13', label: 'Tier 1 events per million hours worked', unit: 'Number', values: v(2, 1, 0, 0) },
        { id: 'hc-pse-t2', label: 'Tier 2 events per million hours worked', unit: 'Number', values: v(4, 1, 5, 5) },
        { id: 'hc-safety-train', label: 'Number of staff trained on health and safety standards', unit: 'Persons', values: v(4599, 4652, 6527, 3245) },
      ],
    },
  ],
}

// ─── SOCIAL & RELATIONSHIP CAPITAL ────────────────────────────────────
const social: ReportSection = {
  id: 'social', scope: 'core', title: 'Social and Relationship Capital',
  tables: [
    {
      id: 'sc-board',
      title: 'Board Effectiveness',
      rows: [
        { id: 'sc-board-att', gri: '2-9 (2021)', label: 'Average board meeting attendance', unit: '% of meetings', values: v(99.5, 99.1, 98.9, 100) },
        { id: 'sc-board-tenure', label: 'Average tenure of board members', unit: 'Year', values: v(2.7, 1.5, 2.4, 2.4) },
        { id: 'sc-board-total', label: 'Total number of board members', unit: 'Persons', values: v(14, 15, 15, 15) },
        { id: 'sc-board-indep', label: 'Number of independent directors', unit: 'Persons', values: v(9, 13, 9, 8) },
      ],
    },
    {
      id: 'sc-comp',
      title: 'Executive Compensation',
      rows: [
        { id: 'sc-ceo-total', gri: '2-21 (2021)', label: 'Total compensation of CEO', unit: 'Baht', values: v(22460000, 17799000, 18546000, 18882000) },
        { id: 'sc-ratio-median', label: 'Ratio of median employee to CEO compensation', unit: 'Ratio', values: v(23, 11.51, 10.95, 11.30) },
        { id: 'sc-ratio-mean', label: 'Ratio of mean employee to CEO compensation', unit: 'Ratio', values: v(19, 9.57, 9.25, 9.47) },
      ],
    },
    {
      id: 'sc-abc',
      title: 'Anti-Bribery and Corruption',
      rows: [
        { id: 'sc-abc-gov', gri: '205-2 (2016)', label: 'Governance body members ABC trained', unit: '% of governance body', values: v(100, 100, 100, 100) },
        { id: 'sc-abc-emp', label: 'Employees ABC trained', unit: '% of total employees', values: v(100, 100, 100, 100) },
        { id: 'sc-abc-bp', label: 'Business partners ABC communicated', unit: '% of business partners', values: v(100, 100, 100, 100) },
      ],
    },
    {
      id: 'sc-supply',
      title: 'Supply Chain',
      rows: [
        { id: 'sc-tier1', gri: '2-6 (2021)', label: 'Total number of Tier-1 suppliers', unit: 'Number', values: v(4242, 4241, 4216, 4222) },
        { id: 'sc-sig-tier1', label: 'Total number of significant suppliers in Tier-1', unit: 'Number', values: v(84, 153, 200, 201) },
        { id: 'sc-spend-sig', label: '% of total spend on significant suppliers in Tier-1', unit: '% of total spend', values: v(30, 56, 90.44, 90.18) },
        { id: 'sc-screen-env', gri: '308-1 (2016)', label: 'New suppliers screened using environmental criteria', unit: '% of new suppliers', values: v(100, 100, 100, 100) },
        { id: 'sc-screen-soc', gri: '414-1 (2016)', label: 'New suppliers screened using social criteria', unit: '% of new suppliers', values: v(100, 100, 100, 100) },
      ],
    },
    {
      id: 'sc-csr',
      title: 'Philanthropic Activities & Local Community',
      rows: [
        { id: 'sc-phil-total', gri: '201-1 (2016)', label: 'Total contributions', unit: 'Million Baht', values: v(142.29, 106.28, 72.77, 69.62) },
        { id: 'sc-phil-charity', label: 'Charitable donations', unit: 'Million Baht', indent: 1, values: v(43.45, 37.83, 23.27, 16.34) },
        { id: 'sc-phil-comm', label: 'Community investments', unit: 'Million Baht', indent: 1, values: v(77.27, 56.54, 46.91, 17.12) },
        { id: 'sc-phil-comm-inv', label: 'Commercial initiatives', unit: 'Million Baht', indent: 1, values: v(21.58, 11.91, 2.59, 36.16) },
        { id: 'sc-comm-sat', gri: '413-1', label: 'Community satisfaction survey', unit: '%', values: v(90.46, 92.38, 92.72, 92.72) },
        { id: 'sc-cust-sat', label: 'Customer satisfaction result', unit: '%', values: v(93, 93, 94, 94) },
      ],
    },
    {
      id: 'sc-noncompliance',
      title: 'Compliance — Non-Compliance Instances',
      rows: [
        { id: 'sc-fines-total', gri: '2-27 (2021)', label: 'Total fines for non-compliance', unit: 'Baht', values: v(0, 0, 0, 0) },
        { id: 'sc-violations', label: 'Total number of significant non-compliance cases', unit: 'Case', values: v(0, 0, 0, 0) },
        { id: 'sc-anticomp', gri: '206-1 (2016)', label: 'Fines related to antitrust/anticompetitive practices', unit: 'Baht', values: v(0, 0, 0, 0) },
      ],
    },
  ],
}

// ─── NATURAL CAPITAL (core) ───────────────────────────────────────────
const natural: ReportSection = {
  id: 'natural', scope: 'core', title: 'Natural Capital',
  tables: [
    {
      id: 'nc-material',
      title: 'Material',
      rows: [
        { id: 'nc-mat-total', gri: '301-1 (2016)', label: 'Total material used', unit: 'Million tons', values: v(25.41, 26.95, 27.51, 24.41) },
        { id: 'nc-mat-nonren', label: 'Non renewable material', unit: 'Million tons', indent: 1, values: v(24.89, 26.41, 27.03, 23.84) },
        { id: 'nc-mat-ren', label: 'Renewable material', unit: 'Million tons', indent: 1, values: v(0.52, 0.54, 0.47, 0.57) },
        { id: 'nc-mat-recycled', gri: '301-2 (2016)', label: 'Recycled input materials used', unit: '%', values: v(2, 2, 2, null) },
      ],
    },
    {
      id: 'nc-energy',
      title: 'Energy Consumption',
      rows: [
        { id: 'nc-en-total', gri: '302-1 (2016)', label: 'Total energy consumed', unit: 'MWh', values: v(36882002.30, 39301803.77, 36410566.73, 34987371.24) },
        { id: 'nc-en-grid', label: 'Percentage grid electricity', unit: '%', indent: 1, values: v(7.44, 7.95, 6.41, 7.59) },
        { id: 'nc-en-ren', label: 'Percentage renewable', unit: '%', indent: 1, values: v(0, 0.02, 0.03, 0.03) },
        { id: 'nc-en-direct', label: 'Total direct non-renewable energy consumption', unit: 'MWh', indent: 1, values: v(31365326.88, 33778672.42, 33707316.68, 31797313.56) },
        { id: 'nc-en-indirect', label: 'Total indirect energy consumption', unit: 'MWh', indent: 1, values: v(9883926.43, 11199182.70, 8643873.77, 9056737.14) },
        { id: 'nc-en-saved', gri: '302-4 (2016)', label: 'Total energy saved by efforts to reduce energy use', unit: 'MWh', values: v(400235.70, 205386.20, 267167.23, 441582.92) },
      ],
    },
    {
      id: 'nc-ghg',
      title: 'Greenhouse Gas Emissions (GHGs)',
      rows: [
        { id: 'nc-ghg-s1', gri: '305-1 (2016)', label: 'Total direct GHGs emissions (Scope 1)', unit: 'Million tons CO₂e', values: v(6.14, 6.13, 6.17, 5.77) },
        { id: 'nc-ghg-s1-ch4', label: 'Direct GHG emissions from methane', unit: 'Million tons CO₂e', indent: 1, values: v(0.32, 0.35, 0.33, 0.35) },
        { id: 'nc-ghg-s2', gri: '305-2 (2016)', label: 'Indirect GHGs emissions (Scope 2, market-based)', unit: 'Million tons CO₂e', values: v(2.00, 1.80, 1.66, 1.51) },
        { id: 'nc-ghg-s2-loc', label: 'Indirect GHGs emissions (Scope 2, location-based)', unit: 'Million tons CO₂e', indent: 1, values: v(2.00, 1.79, 1.85, 1.69) },
        { id: 'nc-ghg-s3', gri: '305-3 (2016)', label: 'Other relevant indirect GHG emission (Scope 3)', unit: 'Million tons CO₂e', values: v(36.40, 41.20, 40.20, 35.78) },
        { id: 'nc-ghg-int', gri: '305-4 (2016)', label: 'GHG emission intensity (Scope 1 & 2)', unit: 'Tons CO₂e/tons production', values: v(0.40, 0.37, 0.36, 0.37) },
        { id: 'nc-ghg-saved', gri: '305-5 (2016)', label: 'Total estimated annual CO₂ savings', unit: 'Tons CO₂e', values: v(59903, 36981, 39351, 85198) },
      ],
    },
    {
      id: 'nc-air',
      title: 'NOx, SOx, and Other Significant Air Emissions',
      rows: [
        { id: 'nc-vocs', gri: '305-7 (2016)', label: 'Volatile organic compounds (VOCs)', unit: 'Tons VOCs', values: v(482, 571, 574, 448) },
        { id: 'nc-nox', label: 'Nitrogen oxides (NOx) emissions', unit: 'Tons NOx', values: v(3213, 2748, 3268, 2712) },
        { id: 'nc-sox', label: 'Sulfur oxides (SOx) emissions', unit: 'Tons SOx', values: v(492, 429, 510, 363) },
      ],
    },
    {
      id: 'nc-water',
      title: 'Water',
      rows: [
        { id: 'nc-water-w', gri: '303-3 (2018)', label: 'Total water withdrawal from all areas', unit: 'Mega litres', values: v(55866.94, 56100.89, 60523.72, 56865.63) },
        { id: 'nc-water-w-fresh', label: 'Fresh water (≤1,000 mg/L TDS)', unit: 'Mega litres', indent: 1, values: v(48247.54, 48971.10, 52302.57, 47842.25) },
        { id: 'nc-water-d', gri: '303-4 (2018)', label: 'Total water discharge to all areas', unit: 'Mega litres', values: v(19617.99, 24725.74, 25243.85, 20163.10) },
        { id: 'nc-water-c', gri: '303-5 (2018)', label: 'Total net fresh water consumption', unit: 'Million m³', values: v(38.44, 36.61, 39.66, 37.76) },
        { id: 'nc-water-r', label: 'Total water recycled & reused', unit: 'Mega litres', values: v(1655.01, 2466.45, 1870.50, 2233.38) },
        { id: 'nc-cod', label: 'Total direct COD', unit: 'Tons', values: v(1410, 1246, 1116, 1069) },
      ],
    },
    {
      id: 'nc-waste',
      title: 'Waste — Routine',
      rows: [
        { id: 'nc-waste-total', gri: '306-3 (2020)', label: 'Total waste generated', unit: 'Tons', values: v(136521.28, 121023.04, 85219.00, 77130.43) },
        { id: 'nc-waste-haz', label: 'Total hazardous waste generated', unit: 'Tons', indent: 1, values: v(95486.50, 85920.96, 51184.75, 44837.68) },
        { id: 'nc-waste-nonhaz', label: 'Total non-hazardous waste generated', unit: 'Tons', indent: 1, values: v(41034.79, 35102.08, 34034.25, 32292.76) },
        { id: 'nc-waste-divert', gri: '306-4 (2020)', label: 'Total weight of waste diverted from disposal', unit: 'Tons', values: v(41198.40, 34164.17, 37410.62, 36435.15) },
        { id: 'nc-waste-disposal', gri: '306-5 (2020)', label: 'Total weight of waste directed to disposal', unit: 'Tons', values: v(95322.88, 86858.87, 47808.38, 40695.29) },
        { id: 'nc-waste-recycled', label: 'Percentage of hazardous waste recycled', unit: '%', values: v(12.24, 7.93, 13.03, 14.21) },
      ],
    },
    {
      id: 'nc-spills',
      title: 'Spills',
      rows: [
        { id: 'nc-spills-oil', gri: '306-3 (2016)', label: 'Oil spills', unit: 'Case', values: v(0, 0, 0, 0) },
        { id: 'nc-spills-fuel', label: 'Fuel spills', unit: 'Case', values: v(0, 0, 0, 0) },
        { id: 'nc-spills-waste', label: 'Waste spills', unit: 'Case', values: v(0, 0, 0, 0) },
        { id: 'nc-spills-chem', label: 'Chemical spills', unit: 'Case', values: v(0, 0, 0, 0) },
        { id: 'nc-env-violations', label: 'Environmental violations', unit: 'Number', values: v(0, 0, 0, 0) },
        { id: 'nc-env-fines', label: 'Fines/penalties', unit: 'Million baht', values: v(0, 0, 0, 0) },
      ],
    },
    {
      id: 'nc-prod',
      title: 'Operational Eco-Efficiency',
      rows: [
        { id: 'nc-prod-vol', label: 'Total production volume', unit: 'Million tons', values: v(20.20, 21.67, 21.99, 19.81) },
        { id: 'nc-renew-raw', gri: '301-1 (2016)', label: 'Raw materials from renewable resources', unit: '% of total products', values: v(2.05, 2.01, 2.00, 2.34) },
      ],
    },
  ],
}

// ─── JV HUMAN ─────────────────────────────────────────────────────────
const jvHuman: ReportSection = {
  id: 'jv-human', scope: 'jv', title: 'Joint Ventures — Human Capital',
  tables: [
    {
      id: 'jvh-workforce',
      title: 'Worker',
      rows: [
        { id: 'jvh-total-worker', label: 'Total worker', unit: 'Persons', split: 'mf', values: mf([1016, 399], [1187, 428], [999, 401], [953, 408]) },
        { id: 'jvh-total-employee', gri: '2-7 (2021)', label: 'Total employee', unit: 'Persons', split: 'mf', values: mf([545, 249], [666, 264], [529, 246], [524, 252]) },
        { id: 'jvh-contractor', gri: '2-8 (2021)', label: 'Contractor', unit: 'Persons', split: 'mf', values: mf([470, 150], [480, 116], [428, 107], [390, 113]) },
      ],
    },
    {
      id: 'jvh-ohs',
      title: 'Health & Safety',
      rows: [
        { id: 'jvh-fatal-emp', gri: '403-9 (2018)', label: 'Employee fatalities', unit: 'Case', split: 'mf', values: mf([0, 0], [0, 0], [0, 0], [0, 0]) },
        { id: 'jvh-trir-emp', label: 'Recordable Work-Injuries Rate (employees)', unit: 'Case/1 million manhours', split: 'mf', values: mf([0, 0], [0.47, 2.78], [1.49, 0], [1.38, 4.04]) },
        { id: 'jvh-trir-cont', label: 'Recordable Work-Injuries Rate (contractors)', unit: 'Case/1 million manhours', split: 'mf', values: mf([0.85, 0], [1.67, 0], [0.28, 0], [0.42, 0]) },
        { id: 'jvh-pse-t1', gri: 'G4-OG13', label: 'Tier 1 process safety events', unit: 'Number', values: v(0, 0, 0, 1) },
        { id: 'jvh-pse-t2', label: 'Tier 2 process safety events', unit: 'Number', values: v(0, 0, 0, 0) },
      ],
    },
  ],
}

// ─── JV NATURAL ───────────────────────────────────────────────────────
const jvNatural: ReportSection = {
  id: 'jv-natural', scope: 'jv', title: 'Joint Ventures — Natural Capital',
  tables: [
    {
      id: 'jvn-material',
      title: 'Material',
      rows: [
        { id: 'jvn-mat-total', gri: '301-1 (2016)', label: 'Total material used', unit: 'Million tons', values: v(0.56, 0.54, 0.16, 1.09) },
        { id: 'jvn-mat-nonren', label: 'Non renewable material', unit: 'Million tons', indent: 1, values: v(0.55, 0.52, 0.16, 1.09) },
        { id: 'jvn-mat-ren', label: 'Renewable material', unit: 'Million tons', indent: 1, values: v(0.01, 0.01, 0, 0) },
      ],
    },
    {
      id: 'jvn-energy',
      title: 'Energy',
      rows: [
        { id: 'jvn-en-total', gri: '302-1 (2016)', label: 'Total energy consumed', unit: 'MWh', values: v(1987500.77, 1717466.63, 540182.18, 1041708.57) },
        { id: 'jvn-en-direct', label: 'Direct non-renewable energy consumption', unit: 'MWh', indent: 1, values: v(1282749.50, 930536.91, 11853.97, 426118.30) },
        { id: 'jvn-en-indirect', label: 'Indirect energy consumption', unit: 'MWh', indent: 1, values: v(704751.27, 1117245.86, 528328.21, 615590.27) },
      ],
    },
    {
      id: 'jvn-air',
      title: 'Air Emissions',
      rows: [
        { id: 'jvn-vocs', gri: '305-7 (2016)', label: 'VOCs', unit: 'Tons', values: v(186, 163, 174, 119) },
        { id: 'jvn-nox', label: 'NOx emissions', unit: 'Tons', values: v(63, 40, 55, 31.64) },
        { id: 'jvn-sox', label: 'SOx emissions', unit: 'Tons', values: v(16.79, 17.09, 17.09, 0) },
      ],
    },
    {
      id: 'jvn-water',
      title: 'Water',
      rows: [
        { id: 'jvn-water-w', gri: '303-3 (2018)', label: 'Total water withdrawal', unit: 'Mega litres', values: v(11075.32, 10161.38, 10624.27, 3871.54) },
        { id: 'jvn-water-d', gri: '303-4 (2018)', label: 'Total water discharge', unit: 'Mega litres', values: v(4886.60, 4362.09, 4736.04, 886.93) },
        { id: 'jvn-water-c', gri: '303-5 (2018)', label: 'Net fresh water consumption', unit: 'Million m³', values: v(6.19, 5.80, 5.89, 3.87) },
      ],
    },
    {
      id: 'jvn-waste',
      title: 'Waste',
      rows: [
        { id: 'jvn-waste-total', gri: '306-3 (2020)', label: 'Total waste generated', unit: 'Tons', values: v(5920.91, 4168.44, 7348.63, 2790.38) },
        { id: 'jvn-waste-haz', label: 'Hazardous waste generated', unit: 'Tons', indent: 1, values: v(3627.81, 2578.40, 4159.64, 768.74) },
        { id: 'jvn-waste-nonhaz', label: 'Non-hazardous waste generated', unit: 'Tons', indent: 1, values: v(2293.09, 1590.03, 3189.00, 2021.65) },
      ],
    },
  ],
}

export const PTTGC_REPORT: PttgcReport = {
  organisation: 'PTT Global Chemical Public Company Limited and Subsidiaries',
  subtitle: 'Sustainability Performance Data',
  years: [2022, 2023, 2024, 2025],
  sections: [financial, manufacture, human, social, natural, jvHuman, jvNatural],
}

/** Look up a row by id across all sections/tables. */
export function findRow(report: PttgcReport, rowId: string): { section: ReportSection; table: ReportTable; row: ReportRow } | null {
  for (const section of report.sections) {
    for (const table of section.tables) {
      const row = table.rows.find(r => r.id === rowId)
      if (row) return { section, table, row }
    }
  }
  return null
}

/** Flatten all rows for Excel template / lookup. */
export function flattenRows(report: PttgcReport): Array<{ section: string; table: string; row: ReportRow }> {
  const out: Array<{ section: string; table: string; row: ReportRow }> = []
  for (const section of report.sections) {
    for (const table of section.tables) {
      for (const row of table.rows) {
        out.push({ section: section.title, table: table.title ?? '', row })
      }
    }
  }
  return out
}
