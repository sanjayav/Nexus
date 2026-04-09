// ============================================================
// MODULE DATA — New interfaces + demo data for the 7-module product architecture
// ============================================================

// ============================================================
// DATA COLLECTION MODULE
// ============================================================

export interface DataEntity {
  id: string
  name: string
  type: 'intercompany' | 'subsidiary' | 'supplier'
  parentId?: string
  facilities: string[]
  country: string
  contactPerson: string
}

export const dataEntities: DataEntity[] = [
  { id: 'ent-gc-petrochem', name: 'GC Petrochemical Division', type: 'intercompany', facilities: ['mtp-olefins', 'mtp-aromatics', 'rayong-refinery'], country: 'Thailand', contactPerson: 'Somchai Prasert' },
  { id: 'ent-gc-polymers', name: 'GC Polymers & Specialty', type: 'subsidiary', parentId: 'ent-gc-petrochem', facilities: ['thai-pe', 'gc-glycol', 'hmc-polymers'], country: 'Thailand', contactPerson: 'Nattapong Chai' },
  { id: 'ent-gc-green', name: 'GC Green & Circular', type: 'subsidiary', parentId: 'ent-gc-petrochem', facilities: ['envicco', 'natureworks'], country: 'Thailand', contactPerson: 'Apinya Jantaraksa' },
  { id: 'ent-star-petroleum', name: 'Star Petroleum Refining', type: 'supplier', facilities: [], country: 'Thailand', contactPerson: 'Aroon Vichai' },
  { id: 'ent-scg-chemicals', name: 'SCG Chemicals', type: 'supplier', facilities: [], country: 'Thailand', contactPerson: 'Wichai Sommai' },
  { id: 'ent-indorama', name: 'Indorama Ventures', type: 'supplier', facilities: [], country: 'Thailand', contactPerson: 'Pranee Sukjai' },
]

export interface DataSubmission {
  id: string
  entityId: string
  entityName: string
  entityType: 'intercompany' | 'subsidiary' | 'supplier'
  dataType: string
  period: string
  format: 'raw' | 'measured' | 'reported' | 'supplier-provided'
  value: string
  unit: string
  submittedBy: string
  submittedDate: string
  status: 'submitted' | 'pending' | 'overdue' | 'complete'
}

export const dataSubmissions: DataSubmission[] = [
  // Intercompany submissions
  { id: 'ds-001', entityId: 'ent-gc-petrochem', entityName: 'GC Petrochemical Division', entityType: 'intercompany', dataType: 'Scope 1 — Process Emissions', period: 'Q1 2026', format: 'measured', value: '1,166,000', unit: 'tCO\u2082e', submittedBy: 'Somchai Prasert', submittedDate: '2026-04-03', status: 'complete' },
  { id: 'ds-002', entityId: 'ent-gc-petrochem', entityName: 'GC Petrochemical Division', entityType: 'intercompany', dataType: 'Scope 1 — Stationary Combustion', period: 'Q1 2026', format: 'measured', value: '636,000', unit: 'tCO\u2082e', submittedBy: 'Somchai Prasert', submittedDate: '2026-04-03', status: 'complete' },
  { id: 'ds-003', entityId: 'ent-gc-petrochem', entityName: 'GC Petrochemical Division', entityType: 'intercompany', dataType: 'Scope 2 — Purchased Electricity', period: 'Q1 2026', format: 'measured', value: '803,000', unit: 'tCO\u2082e', submittedBy: 'Priya Wattana', submittedDate: '2026-04-04', status: 'complete' },
  { id: 'ds-004', entityId: 'ent-gc-petrochem', entityName: 'GC Petrochemical Division', entityType: 'intercompany', dataType: 'Energy Consumption', period: 'Q1 2026', format: 'raw', value: '4,520', unit: 'GWh', submittedBy: 'Thanyarat Noi', submittedDate: '2026-04-05', status: 'submitted' },
  { id: 'ds-005', entityId: 'ent-gc-petrochem', entityName: 'GC Petrochemical Division', entityType: 'intercompany', dataType: 'Fugitive Emissions (LDAR)', period: 'Q1 2026', format: 'measured', value: '106,000', unit: 'tCO\u2082e', submittedBy: 'Somchai Prasert', submittedDate: '2026-04-06', status: 'submitted' },
  { id: 'ds-006', entityId: 'ent-gc-petrochem', entityName: 'GC Petrochemical Division', entityType: 'intercompany', dataType: 'Production Volume', period: 'Q1 2026', format: 'reported', value: '2,052,000', unit: 'tonnes', submittedBy: 'Priya Wattana', submittedDate: '2026-04-02', status: 'complete' },
  // Subsidiary submissions
  { id: 'ds-007', entityId: 'ent-gc-polymers', entityName: 'GC Polymers & Specialty', entityType: 'subsidiary', dataType: 'Scope 1 — All Sources', period: 'Q1 2026', format: 'reported', value: '418,000', unit: 'tCO\u2082e', submittedBy: 'Nattapong Chai', submittedDate: '2026-04-05', status: 'submitted' },
  { id: 'ds-008', entityId: 'ent-gc-polymers', entityName: 'GC Polymers & Specialty', entityType: 'subsidiary', dataType: 'Scope 2 — Purchased Electricity', period: 'Q1 2026', format: 'reported', value: '211,000', unit: 'tCO\u2082e', submittedBy: 'Nattapong Chai', submittedDate: '2026-04-05', status: 'submitted' },
  { id: 'ds-009', entityId: 'ent-gc-polymers', entityName: 'GC Polymers & Specialty', entityType: 'subsidiary', dataType: 'Waste Generation', period: 'Q1 2026', format: 'raw', value: '1,450', unit: 'tonnes', submittedBy: 'Kittisak Boonma', submittedDate: '2026-04-06', status: 'pending' },
  { id: 'ds-010', entityId: 'ent-gc-polymers', entityName: 'GC Polymers & Specialty', entityType: 'subsidiary', dataType: 'Water Consumption', period: 'Q1 2026', format: 'raw', value: '2,340,000', unit: 'm\u00b3', submittedBy: 'Kittisak Boonma', submittedDate: '', status: 'overdue' },
  { id: 'ds-011', entityId: 'ent-gc-green', entityName: 'GC Green & Circular', entityType: 'subsidiary', dataType: 'Scope 1 — All Sources', period: 'Q1 2026', format: 'reported', value: '96,000', unit: 'tCO\u2082e', submittedBy: 'Apinya Jantaraksa', submittedDate: '2026-04-04', status: 'complete' },
  { id: 'ds-012', entityId: 'ent-gc-green', entityName: 'GC Green & Circular', entityType: 'subsidiary', dataType: 'Recycled Content Volume', period: 'Q1 2026', format: 'measured', value: '11,250', unit: 'tonnes', submittedBy: 'Apinya Jantaraksa', submittedDate: '2026-04-04', status: 'complete' },
  { id: 'ds-013', entityId: 'ent-gc-green', entityName: 'GC Green & Circular', entityType: 'subsidiary', dataType: 'PLA Production', period: 'Q1 2026', format: 'measured', value: '9,375', unit: 'tonnes', submittedBy: 'Chalerm Kasemsri', submittedDate: '2026-04-05', status: 'submitted' },
  // Supplier submissions
  { id: 'ds-014', entityId: 'ent-star-petroleum', entityName: 'Star Petroleum Refining', entityType: 'supplier', dataType: 'Scope 1+2 Emissions', period: 'FY 2025', format: 'supplier-provided', value: '1,240,000', unit: 'tCO\u2082e', submittedBy: 'Aroon Vichai', submittedDate: '2026-03-15', status: 'complete' },
  { id: 'ds-015', entityId: 'ent-star-petroleum', entityName: 'Star Petroleum Refining', entityType: 'supplier', dataType: 'Product Carbon Footprint', period: 'FY 2025', format: 'supplier-provided', value: '0.82', unit: 'tCO\u2082e/tonne', submittedBy: 'Aroon Vichai', submittedDate: '2026-03-15', status: 'complete' },
  { id: 'ds-016', entityId: 'ent-scg-chemicals', entityName: 'SCG Chemicals', entityType: 'supplier', dataType: 'Scope 1+2 Emissions', period: 'FY 2025', format: 'supplier-provided', value: '890,000', unit: 'tCO\u2082e', submittedBy: 'Wichai Sommai', submittedDate: '2026-03-20', status: 'submitted' },
  { id: 'ds-017', entityId: 'ent-scg-chemicals', entityName: 'SCG Chemicals', entityType: 'supplier', dataType: 'Transportation Emissions', period: 'FY 2025', format: 'reported', value: '45,000', unit: 'tCO\u2082e', submittedBy: 'Wichai Sommai', submittedDate: '', status: 'overdue' },
  { id: 'ds-018', entityId: 'ent-indorama', entityName: 'Indorama Ventures', entityType: 'supplier', dataType: 'Scope 1+2 Emissions', period: 'FY 2025', format: 'supplier-provided', value: '2,100,000', unit: 'tCO\u2082e', submittedBy: 'Pranee Sukjai', submittedDate: '2026-02-28', status: 'complete' },
  { id: 'ds-019', entityId: 'ent-indorama', entityName: 'Indorama Ventures', entityType: 'supplier', dataType: 'Recycled Content %', period: 'FY 2025', format: 'supplier-provided', value: '22', unit: '%', submittedBy: 'Pranee Sukjai', submittedDate: '', status: 'pending' },
  { id: 'ds-020', entityId: 'ent-gc-petrochem', entityName: 'GC Petrochemical Division', entityType: 'intercompany', dataType: 'Scope 3 — Cat 1 Purchased Goods', period: 'Q1 2026', format: 'reported', value: '879,000', unit: 'tCO\u2082e', submittedBy: 'Somchai Prasert', submittedDate: '2026-04-07', status: 'submitted' },
]

// ============================================================
// FRAMEWORK QUESTIONS MODULE
// ============================================================

export interface FrameworkQuestion {
  id: string
  frameworkId: 'cdp' | 'tcfd' | 'gri' | 'csrd'
  sectionId: string
  sectionName: string
  questionNumber: string
  questionText: string
  assignedRole: 'site-owner' | 'facility-manager' | 'team-lead' | 'auto'
  assignedTo: string
  status: 'draft' | 'in-review' | 'approved'
  response?: string
  autoPopulated?: boolean
}

export const frameworkQuestions: FrameworkQuestion[] = [
  // CDP Questions
  { id: 'fq-cdp-01', frameworkId: 'cdp', sectionId: 'C0', sectionName: 'Introduction', questionNumber: 'C0.1', questionText: 'Give a general description and introduction to your organization.', assignedRole: 'team-lead', assignedTo: 'Dr. Kannika Suthep', status: 'approved', response: 'GC Group (PTT Global Chemical) is Thailand\'s largest integrated petrochemical company...' },
  { id: 'fq-cdp-02', frameworkId: 'cdp', sectionId: 'C0', sectionName: 'Introduction', questionNumber: 'C0.2', questionText: 'State the start and end date of the year for which you are reporting data.', assignedRole: 'auto', assignedTo: 'System', status: 'approved', response: 'January 1, 2026 to December 31, 2026', autoPopulated: true },
  { id: 'fq-cdp-03', frameworkId: 'cdp', sectionId: 'C1', sectionName: 'Governance', questionNumber: 'C1.1', questionText: 'Is there board-level oversight of climate-related issues within your organization?', assignedRole: 'team-lead', assignedTo: 'Dr. Kannika Suthep', status: 'approved', response: 'Yes. The Sustainability & Risk Management Committee...' },
  { id: 'fq-cdp-04', frameworkId: 'cdp', sectionId: 'C1', sectionName: 'Governance', questionNumber: 'C1.2', questionText: 'Provide the highest management-level position(s) or committee(s) with responsibility for climate-related issues.', assignedRole: 'team-lead', assignedTo: 'Dr. Kannika Suthep', status: 'approved', response: 'Chief Sustainability Officer, reporting directly to CEO...' },
  { id: 'fq-cdp-05', frameworkId: 'cdp', sectionId: 'C4', sectionName: 'Targets & Performance', questionNumber: 'C4.1', questionText: 'Did you have an emissions target that was active in the reporting year?', assignedRole: 'facility-manager', assignedTo: 'Somchai Prasert', status: 'approved', response: 'Yes. SBTi-validated 1.5\u00b0C-aligned target: 55% reduction by 2030 from 2019 base year.' },
  { id: 'fq-cdp-06', frameworkId: 'cdp', sectionId: 'C6', sectionName: 'Emissions Data', questionNumber: 'C6.1', questionText: 'What were your organization\'s gross global Scope 1 emissions in metric tons CO2e?', assignedRole: 'auto', assignedTo: 'System', status: 'in-review', response: '2,120,000 tCO\u2082e (Q1 2026)', autoPopulated: true },
  { id: 'fq-cdp-07', frameworkId: 'cdp', sectionId: 'C6', sectionName: 'Emissions Data', questionNumber: 'C6.3', questionText: 'What were your organization\'s gross global Scope 2 emissions in metric tons CO2e?', assignedRole: 'auto', assignedTo: 'System', status: 'in-review', response: '945,000 tCO\u2082e location-based / 756,000 tCO\u2082e market-based (Q1 2026)', autoPopulated: true },
  { id: 'fq-cdp-08', frameworkId: 'cdp', sectionId: 'C6', sectionName: 'Emissions Data', questionNumber: 'C6.5', questionText: 'Account for your organization\'s gross global Scope 3 emissions.', assignedRole: 'facility-manager', assignedTo: 'Somchai Prasert', status: 'draft', response: '' },
  { id: 'fq-cdp-09', frameworkId: 'cdp', sectionId: 'C7', sectionName: 'Emissions Breakdown', questionNumber: 'C7.1', questionText: 'Does your organization break down its Scope 1 emissions by greenhouse gas type?', assignedRole: 'facility-manager', assignedTo: 'Priya Wattana', status: 'draft', response: '' },
  { id: 'fq-cdp-10', frameworkId: 'cdp', sectionId: 'C8', sectionName: 'Energy', questionNumber: 'C8.1', questionText: 'What percentage of your total operational spend in the reporting year was on energy?', assignedRole: 'site-owner', assignedTo: 'Kittisak Boonma', status: 'in-review', response: 'Approximately 18% of operational expenditure...' },
  // TCFD Questions
  { id: 'fq-tcfd-01', frameworkId: 'tcfd', sectionId: 'governance', sectionName: 'Governance', questionNumber: 'GOV-1', questionText: 'Describe the board\'s oversight of climate-related risks and opportunities.', assignedRole: 'team-lead', assignedTo: 'Dr. Kannika Suthep', status: 'approved', response: 'The Board\'s Sustainability Committee meets quarterly to review climate risks...' },
  { id: 'fq-tcfd-02', frameworkId: 'tcfd', sectionId: 'governance', sectionName: 'Governance', questionNumber: 'GOV-2', questionText: 'Describe management\'s role in assessing and managing climate-related risks and opportunities.', assignedRole: 'team-lead', assignedTo: 'Dr. Kannika Suthep', status: 'approved', response: 'The CSO chairs a cross-functional Climate Action Working Group...' },
  { id: 'fq-tcfd-03', frameworkId: 'tcfd', sectionId: 'strategy', sectionName: 'Strategy', questionNumber: 'STR-1', questionText: 'Describe the climate-related risks and opportunities the organization has identified over the short, medium, and long term.', assignedRole: 'team-lead', assignedTo: 'Dr. Kannika Suthep', status: 'in-review', response: 'Short-term: carbon pricing risk, regulatory compliance costs...' },
  { id: 'fq-tcfd-04', frameworkId: 'tcfd', sectionId: 'strategy', sectionName: 'Strategy', questionNumber: 'STR-3', questionText: 'Describe the resilience of the organization\'s strategy, taking into consideration different climate-related scenarios.', assignedRole: 'team-lead', assignedTo: 'Dr. Kannika Suthep', status: 'draft', response: '' },
  { id: 'fq-tcfd-05', frameworkId: 'tcfd', sectionId: 'risk-mgmt', sectionName: 'Risk Management', questionNumber: 'RISK-1', questionText: 'Describe the organization\'s processes for identifying and assessing climate-related risks.', assignedRole: 'facility-manager', assignedTo: 'Priya Wattana', status: 'approved', response: 'Enterprise Risk Management framework with dedicated climate risk module...' },
  { id: 'fq-tcfd-06', frameworkId: 'tcfd', sectionId: 'metrics', sectionName: 'Metrics & Targets', questionNumber: 'MET-1', questionText: 'Disclose the metrics used by the organization to assess climate-related risks and opportunities.', assignedRole: 'auto', assignedTo: 'System', status: 'in-review', response: 'Scope 1+2+3 emissions, emissions intensity, SBTi target gap...', autoPopulated: true },
  { id: 'fq-tcfd-07', frameworkId: 'tcfd', sectionId: 'metrics', sectionName: 'Metrics & Targets', questionNumber: 'MET-2', questionText: 'Disclose Scope 1, Scope 2, and Scope 3 greenhouse gas emissions.', assignedRole: 'auto', assignedTo: 'System', status: 'in-review', response: 'Q1 2026: S1=2.12M, S2=0.95M, S3=2.51M tCO\u2082e', autoPopulated: true },
  // GRI Questions
  { id: 'fq-gri-01', frameworkId: 'gri', sectionId: '305-1', sectionName: 'GRI 305-1', questionNumber: '305-1a', questionText: 'Gross direct (Scope 1) GHG emissions in metric tons of CO2 equivalent.', assignedRole: 'auto', assignedTo: 'System', status: 'approved', response: '2,120,000 tCO\u2082e (Q1 2026)', autoPopulated: true },
  { id: 'fq-gri-02', frameworkId: 'gri', sectionId: '305-1', sectionName: 'GRI 305-1', questionNumber: '305-1b', questionText: 'Gases included in the calculation (CO2, CH4, N2O, HFCs, PFCs, SF6, NF3).', assignedRole: 'facility-manager', assignedTo: 'Somchai Prasert', status: 'approved', response: 'CO\u2082, CH\u2084, N\u2082O. HFCs from refrigeration systems reported separately.' },
  { id: 'fq-gri-03', frameworkId: 'gri', sectionId: '305-2', sectionName: 'GRI 305-2', questionNumber: '305-2a', questionText: 'Gross location-based energy indirect (Scope 2) GHG emissions in metric tons CO2e.', assignedRole: 'auto', assignedTo: 'System', status: 'in-review', response: '945,000 tCO\u2082e (Q1 2026, location-based)', autoPopulated: true },
  { id: 'fq-gri-04', frameworkId: 'gri', sectionId: '305-3', sectionName: 'GRI 305-3', questionNumber: '305-3a', questionText: 'Gross other indirect (Scope 3) GHG emissions in metric tons CO2e.', assignedRole: 'facility-manager', assignedTo: 'Somchai Prasert', status: 'draft', response: '' },
  { id: 'fq-gri-05', frameworkId: 'gri', sectionId: '305-4', sectionName: 'GRI 305-4', questionNumber: '305-4a', questionText: 'GHG emissions intensity ratio for the organization.', assignedRole: 'auto', assignedTo: 'System', status: 'approved', response: '1.70 tCO\u2082e per tonne of product', autoPopulated: true },
  { id: 'fq-gri-06', frameworkId: 'gri', sectionId: '305-5', sectionName: 'GRI 305-5', questionNumber: '305-5a', questionText: 'GHG emissions reduced as a direct result of reduction initiatives, in metric tons CO2e.', assignedRole: 'site-owner', assignedTo: 'Kittisak Boonma', status: 'draft', response: '' },
  // CSRD Questions (ESRS E1)
  { id: 'fq-csrd-01', frameworkId: 'csrd', sectionId: 'E1-1', sectionName: 'ESRS E1: Climate Change', questionNumber: 'E1.1', questionText: 'Describe the transition plan for climate change mitigation, including targets and actions.', assignedRole: 'team-lead', assignedTo: 'Dr. Kannika Suthep', status: 'draft', response: '' },
  { id: 'fq-csrd-02', frameworkId: 'csrd', sectionId: 'E1-4', sectionName: 'ESRS E1: Climate Change', questionNumber: 'E1.4', questionText: 'Disclose the targets related to climate change mitigation and adaptation.', assignedRole: 'team-lead', assignedTo: 'Dr. Kannika Suthep', status: 'draft', response: '' },
  { id: 'fq-csrd-03', frameworkId: 'csrd', sectionId: 'E1-6', sectionName: 'ESRS E1: Climate Change', questionNumber: 'E1.6', questionText: 'Disclose gross Scope 1, 2, and 3 GHG emissions and total GHG emissions.', assignedRole: 'auto', assignedTo: 'System', status: 'in-review', response: 'Q1 2026: S1=2.12M, S2=0.95M (location), S3=2.51M tCO\u2082e', autoPopulated: true },
  { id: 'fq-csrd-04', frameworkId: 'csrd', sectionId: 'E1-7', sectionName: 'ESRS E1: Climate Change', questionNumber: 'E1.7', questionText: 'Disclose GHG removals and GHG mitigation projects financed through carbon credits.', assignedRole: 'facility-manager', assignedTo: 'Priya Wattana', status: 'draft', response: '' },
  { id: 'fq-csrd-05', frameworkId: 'csrd', sectionId: 'E1-9', sectionName: 'ESRS E1: Climate Change', questionNumber: 'E1.9', questionText: 'Disclose the anticipated financial effects from material physical and transition risks.', assignedRole: 'team-lead', assignedTo: 'Dr. Kannika Suthep', status: 'draft', response: '' },
]

// ============================================================
// ASSURANCE MODULE
// ============================================================

export interface AssuranceFinding {
  id: string
  severity: 'minor' | 'major'
  description: string
  resolution?: string
  resolvedDate?: string
}

export interface AssuranceItem {
  id: string
  dataPackage: string
  scope: string
  entity: string
  period: string
  reviewer: string
  status: 'not-started' | 'in-review' | 'findings-raised' | 'cleared' | 'ready-to-publish'
  findings: AssuranceFinding[]
  linkedBlockchainIds: string[]
  linkedAnomalyIds: string[]
}

export const assuranceItems: AssuranceItem[] = [
  {
    id: 'assu-001',
    dataPackage: 'Scope 1 Emissions — Q1 2026',
    scope: 'Scope 1',
    entity: 'GC Petrochemical Division',
    period: 'Q1 2026',
    reviewer: 'LRQA Thailand',
    status: 'in-review',
    findings: [
      { id: 'f-001', severity: 'major', description: 'Fugitive emissions at Map Ta Phut Olefins in Feb 2026 exceed 3\u00d7 standard deviation. LDAR survey records not yet provided for corroboration.' },
    ],
    linkedBlockchainIds: ['bc-001', 'bc-004'],
    linkedAnomalyIds: ['anom-005'],
  },
  {
    id: 'assu-002',
    dataPackage: 'Scope 2 Emissions — Q1 2026',
    scope: 'Scope 2',
    entity: 'GC Petrochemical Division',
    period: 'Q1 2026',
    reviewer: 'LRQA Thailand',
    status: 'findings-raised',
    findings: [
      { id: 'f-002', severity: 'minor', description: 'Market-based vs location-based gap (20%) exceeds prior year trend. I-REC documentation for temporal matching not yet verified.' },
      { id: 'f-003', severity: 'minor', description: 'Grid emission factor used (0.4999 tCO\u2082e/MWh) needs confirmation of TGO 2025 update status.' },
    ],
    linkedBlockchainIds: ['bc-002', 'bc-003'],
    linkedAnomalyIds: ['anom-004'],
  },
  {
    id: 'assu-003',
    dataPackage: 'Scope 3 Cat 1 — Q1 2026',
    scope: 'Scope 3',
    entity: 'GC Group (All)',
    period: 'Q1 2026',
    reviewer: 'LRQA Thailand',
    status: 'in-review',
    findings: [],
    linkedBlockchainIds: ['bc-019'],
    linkedAnomalyIds: ['anom-002'],
  },
  {
    id: 'assu-004',
    dataPackage: 'Scope 1 Emissions — Q1 2026',
    scope: 'Scope 1',
    entity: 'GC Polymers & Specialty',
    period: 'Q1 2026',
    reviewer: 'LRQA Thailand',
    status: 'not-started',
    findings: [],
    linkedBlockchainIds: [],
    linkedAnomalyIds: [],
  },
  {
    id: 'assu-005',
    dataPackage: 'Scope 1+2 — FY 2025 (Annual)',
    scope: 'Scope 1+2',
    entity: 'GC Petrochemical Division',
    period: 'FY 2025',
    reviewer: 'LRQA Thailand',
    status: 'cleared',
    findings: [
      { id: 'f-004', severity: 'minor', description: 'Minor reclassification of mobile combustion between facilities. Corrected and documented.', resolution: 'Data corrected via Workflow Engine, blockchain re-anchored.', resolvedDate: '2026-03-12' },
    ],
    linkedBlockchainIds: ['bc-010', 'bc-011', 'bc-012'],
    linkedAnomalyIds: [],
  },
  {
    id: 'assu-006',
    dataPackage: 'Scope 3 — FY 2025 (Annual)',
    scope: 'Scope 3',
    entity: 'GC Group (All)',
    period: 'FY 2025',
    reviewer: 'LRQA Thailand',
    status: 'cleared',
    findings: [],
    linkedBlockchainIds: ['bc-013', 'bc-014'],
    linkedAnomalyIds: [],
  },
  {
    id: 'assu-007',
    dataPackage: 'CDP Response 2026',
    scope: 'All',
    entity: 'GC Group (All)',
    period: 'FY 2026',
    reviewer: 'Internal Audit',
    status: 'not-started',
    findings: [],
    linkedBlockchainIds: [],
    linkedAnomalyIds: [],
  },
  {
    id: 'assu-008',
    dataPackage: 'GRI 305 Disclosure 2026',
    scope: 'All',
    entity: 'GC Group (All)',
    period: 'FY 2026',
    reviewer: 'Internal Audit',
    status: 'not-started',
    findings: [],
    linkedBlockchainIds: [],
    linkedAnomalyIds: [],
  },
]

// ============================================================
// AGGREGATOR — Framework Data Mapping
// ============================================================

export interface FrameworkDataMapping {
  dataPointId: string
  dataPointName: string
  value: string
  frameworks: {
    frameworkId: string
    frameworkName: string
    disclosureRef: string
  }[]
}

export const frameworkDataMappings: FrameworkDataMapping[] = [
  { dataPointId: 'dp-s1-total', dataPointName: 'Total Scope 1 Emissions', value: '2,120,000 tCO\u2082e', frameworks: [
    { frameworkId: 'cdp', frameworkName: 'CDP', disclosureRef: 'C6.1' },
    { frameworkId: 'gri', frameworkName: 'GRI', disclosureRef: '305-1' },
    { frameworkId: 'tcfd', frameworkName: 'TCFD', disclosureRef: 'Metrics & Targets' },
    { frameworkId: 'csrd', frameworkName: 'CSRD', disclosureRef: 'E1.6' },
  ]},
  { dataPointId: 'dp-s2-location', dataPointName: 'Scope 2 (Location-Based)', value: '945,000 tCO\u2082e', frameworks: [
    { frameworkId: 'cdp', frameworkName: 'CDP', disclosureRef: 'C6.3' },
    { frameworkId: 'gri', frameworkName: 'GRI', disclosureRef: '305-2' },
    { frameworkId: 'tcfd', frameworkName: 'TCFD', disclosureRef: 'Metrics & Targets' },
    { frameworkId: 'csrd', frameworkName: 'CSRD', disclosureRef: 'E1.6' },
  ]},
  { dataPointId: 'dp-s2-market', dataPointName: 'Scope 2 (Market-Based)', value: '756,000 tCO\u2082e', frameworks: [
    { frameworkId: 'cdp', frameworkName: 'CDP', disclosureRef: 'C6.3' },
    { frameworkId: 'gri', frameworkName: 'GRI', disclosureRef: '305-2' },
    { frameworkId: 'csrd', frameworkName: 'CSRD', disclosureRef: 'E1.6' },
  ]},
  { dataPointId: 'dp-s3-total', dataPointName: 'Total Scope 3 Emissions', value: '2,510,000 tCO\u2082e', frameworks: [
    { frameworkId: 'cdp', frameworkName: 'CDP', disclosureRef: 'C6.5' },
    { frameworkId: 'gri', frameworkName: 'GRI', disclosureRef: '305-3' },
    { frameworkId: 'tcfd', frameworkName: 'TCFD', disclosureRef: 'Metrics & Targets' },
    { frameworkId: 'csrd', frameworkName: 'CSRD', disclosureRef: 'E1.6' },
  ]},
  { dataPointId: 'dp-intensity', dataPointName: 'GHG Emissions Intensity', value: '1.70 tCO\u2082e/tonne', frameworks: [
    { frameworkId: 'cdp', frameworkName: 'CDP', disclosureRef: 'C6.10' },
    { frameworkId: 'gri', frameworkName: 'GRI', disclosureRef: '305-4' },
    { frameworkId: 'csrd', frameworkName: 'CSRD', disclosureRef: 'E1.6' },
  ]},
  { dataPointId: 'dp-reduction', dataPointName: 'GHG Reduction Initiatives', value: 'Pending full-year', frameworks: [
    { frameworkId: 'cdp', frameworkName: 'CDP', disclosureRef: 'C4.3b' },
    { frameworkId: 'gri', frameworkName: 'GRI', disclosureRef: '305-5' },
    { frameworkId: 'csrd', frameworkName: 'CSRD', disclosureRef: 'E1.7' },
  ]},
  { dataPointId: 'dp-energy', dataPointName: 'Total Energy Consumption', value: '4,520 GWh (Q1)', frameworks: [
    { frameworkId: 'cdp', frameworkName: 'CDP', disclosureRef: 'C8.2a' },
    { frameworkId: 'gri', frameworkName: 'GRI', disclosureRef: '302-1' },
    { frameworkId: 'csrd', frameworkName: 'CSRD', disclosureRef: 'E1.5' },
  ]},
  { dataPointId: 'dp-target', dataPointName: 'SBTi Target (2026)', value: '15.28M tCO\u2082e', frameworks: [
    { frameworkId: 'cdp', frameworkName: 'CDP', disclosureRef: 'C4.1' },
    { frameworkId: 'tcfd', frameworkName: 'TCFD', disclosureRef: 'Metrics & Targets' },
    { frameworkId: 'csrd', frameworkName: 'CSRD', disclosureRef: 'E1.4' },
  ]},
  { dataPointId: 'dp-waste', dataPointName: 'Waste Diversion Rate', value: '87%', frameworks: [
    { frameworkId: 'gri', frameworkName: 'GRI', disclosureRef: '306-4' },
    { frameworkId: 'csrd', frameworkName: 'CSRD', disclosureRef: 'E5.5' },
  ]},
  { dataPointId: 'dp-water', dataPointName: 'Water Consumption', value: '2.34M m\u00b3 (Q1)', frameworks: [
    { frameworkId: 'gri', frameworkName: 'GRI', disclosureRef: '303-5' },
    { frameworkId: 'csrd', frameworkName: 'CSRD', disclosureRef: 'E3.4' },
  ]},
  { dataPointId: 'dp-recycled', dataPointName: 'Recycled Content Input', value: '11,250 tonnes (Q1)', frameworks: [
    { frameworkId: 'gri', frameworkName: 'GRI', disclosureRef: '301-2' },
    { frameworkId: 'csrd', frameworkName: 'CSRD', disclosureRef: 'E5.4' },
  ]},
  { dataPointId: 'dp-governance', dataPointName: 'Board Climate Oversight', value: 'Yes (quarterly review)', frameworks: [
    { frameworkId: 'cdp', frameworkName: 'CDP', disclosureRef: 'C1.1' },
    { frameworkId: 'tcfd', frameworkName: 'TCFD', disclosureRef: 'Governance' },
    { frameworkId: 'csrd', frameworkName: 'CSRD', disclosureRef: 'GOV-1' },
  ]},
]

// ============================================================
// CSRD SECTIONS (new framework)
// ============================================================

export const csrdSections = [
  { id: 'E1-1', name: 'Transition Plan', status: 'draft' as const, disclosures: ['Climate mitigation plan', 'Decarbonisation targets', 'Key actions & milestones'], completion: 15 },
  { id: 'E1-4', name: 'Targets', status: 'draft' as const, disclosures: ['GHG reduction targets', 'SBTi alignment', 'Interim milestones'], completion: 30 },
  { id: 'E1-5', name: 'Energy Consumption & Mix', status: 'in-progress' as const, disclosures: ['Total energy consumption', 'Renewable energy share', 'Energy intensity'], completion: 60 },
  { id: 'E1-6', name: 'GHG Emissions', status: 'in-progress' as const, disclosures: ['Scope 1 emissions', 'Scope 2 emissions', 'Scope 3 emissions', 'Total GHG'], completion: 70 },
  { id: 'E1-7', name: 'GHG Removals & Carbon Credits', status: 'not-started' as const, disclosures: ['GHG removals', 'Carbon credit projects'], completion: 0 },
  { id: 'E1-9', name: 'Financial Effects', status: 'not-started' as const, disclosures: ['Physical risk costs', 'Transition risk costs', 'Opportunity assessment'], completion: 0 },
]

// ============================================================
// REPORT PUBLISHING MODULE
// ============================================================

export interface PublishableReport {
  id: string
  frameworkId: string
  frameworkName: string
  title: string
  period: string
  status: 'draft' | 'in-review' | 'approved' | 'published'
  generatedDate?: string
  publishedDate?: string
  pages: number
  format: 'PDF' | 'XBRL' | 'Excel'
  assuranceStatus: 'not-started' | 'in-progress' | 'assured'
}

export const publishableReports: PublishableReport[] = [
  { id: 'rpt-001', frameworkId: 'cdp', frameworkName: 'CDP', title: 'CDP Climate Change Response 2026', period: 'FY 2026', status: 'draft', generatedDate: '2026-04-05', pages: 84, format: 'PDF', assuranceStatus: 'not-started' },
  { id: 'rpt-002', frameworkId: 'tcfd', frameworkName: 'TCFD / IFRS S2', title: 'TCFD Disclosure Report 2026', period: 'FY 2026', status: 'draft', generatedDate: '2026-04-06', pages: 42, format: 'PDF', assuranceStatus: 'not-started' },
  { id: 'rpt-003', frameworkId: 'gri', frameworkName: 'GRI', title: 'GRI 305: Emissions Disclosure 2026', period: 'FY 2026', status: 'in-review', generatedDate: '2026-04-03', pages: 28, format: 'PDF', assuranceStatus: 'in-progress' },
  { id: 'rpt-004', frameworkId: 'csrd', frameworkName: 'CSRD', title: 'ESRS E1: Climate Change 2026', period: 'FY 2026', status: 'draft', pages: 56, format: 'XBRL', assuranceStatus: 'not-started' },
  { id: 'rpt-005', frameworkId: 'cdp', frameworkName: 'CDP', title: 'CDP Climate Change Response 2025', period: 'FY 2025', status: 'published', generatedDate: '2025-07-15', publishedDate: '2025-08-01', pages: 92, format: 'PDF', assuranceStatus: 'assured' },
  { id: 'rpt-006', frameworkId: 'gri', frameworkName: 'GRI', title: 'Sustainability Report 2025', period: 'FY 2025', status: 'published', generatedDate: '2025-03-28', publishedDate: '2025-04-15', pages: 156, format: 'PDF', assuranceStatus: 'assured' },
]

// ============================================================
// MODULE HEALTH (for Command Center dashboard)
// ============================================================

export interface ModuleHealth {
  id: string
  name: string
  description: string
  route: string
  completion: number
  pendingItems: number
  status: 'healthy' | 'attention' | 'critical'
  statusNote: string
}

export const moduleHealth: ModuleHealth[] = [
  { id: 'collection', name: 'Data Collection', description: 'Entity data submissions', route: '/collect/entities', completion: 68, pendingItems: 3, status: 'attention', statusNote: '2 overdue submissions' },
  { id: 'calculator', name: 'Calculator Engine', description: 'Emissions calculations', route: '/calculator', completion: 25, pendingItems: 0, status: 'healthy', statusNote: 'Q1 calculated, Q2-Q4 pending' },
  { id: 'frameworks', name: 'Frameworks', description: 'Disclosure questions', route: '/frameworks', completion: 52, pendingItems: 12, status: 'attention', statusNote: '12 questions in draft' },
  { id: 'workflow', name: 'Workflow', description: 'Approval queue', route: '/workflow', completion: 45, pendingItems: 8, status: 'attention', statusNote: '8 items pending approval' },
  { id: 'aggregator', name: 'Aggregator', description: 'Consolidated data', route: '/aggregator', completion: 75, pendingItems: 0, status: 'healthy', statusNote: 'Q1 data consolidated' },
  { id: 'analytics', name: 'Analytics & Assurance', description: 'Analysis & validation', route: '/analytics', completion: 40, pendingItems: 5, status: 'critical', statusNote: '3 critical anomalies open' },
  { id: 'publishing', name: 'Report Publishing', description: 'Disclosure reports', route: '/reports', completion: 15, pendingItems: 4, status: 'attention', statusNote: '4 reports in draft' },
]
