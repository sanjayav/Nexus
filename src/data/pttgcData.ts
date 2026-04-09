// PTTGC (GC Group) Sample Data for Nexus PoC Demo
// All numbers are realistic for PTTGC's scale (~21.5M tCO2e total, ~12M tons product output)

export interface Facility {
  id: string;
  name: string;
  location: string;
  type: string;
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
  intensity: number; // tCO2e per ton of product
  productionVolume: number; // tons
  yoyChange: number; // percentage
}

export interface EmissionsHistory {
  year: number;
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
  intensity: number;
  target: number;
}

export interface BlockchainRecord {
  id: string;
  timestamp: string;
  eventType: 'Submitted' | 'Approved' | 'Anchored' | 'Report Generated' | 'Corrected';
  facility: string;
  dataPoint: string;
  submitter: string;
  submitterDID: string;
  approver: string;
  approverDID: string;
  merkleRoot: string;
  txHash: string;
  blockNumber: number;
  status: 'verified' | 'pending' | 'in-review';
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  estimatedEmissions: number; // tCO2e
  dataCompleteness: number; // percentage
  tier: number;
  country: string;
  status: 'complete' | 'partial' | 'incomplete';
  dataFormat: 'supplier-provided' | 'estimated';
  lastUpdated: string;
}

export interface AnomalyRecord {
  id: string;
  severity: 'warning' | 'critical';
  title: string;
  description: string;
  metric: string;
  year: string;
  facility: string;
  expectedValue: string;
  actualValue: string;
  recommendation: string;
}

export interface FrameworkStatus {
  id: string;
  name: string;
  fullName: string;
  completion: number;
  disclosures: number;
  totalDisclosures: number;
  status: 'Published' | 'In Progress' | 'Draft';
  score?: string;
}

export interface WorkflowItem {
  id: string;
  facility: string;
  dataType: string;
  submittedBy: string;
  submittedDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'anchored';
  value: string;
  scope: string;
  assignedTo: string;
  assignedRole: 'site-owner' | 'facility-manager' | 'team-lead' | 'auto';
  entityType: 'intercompany' | 'subsidiary' | 'supplier';
}

export interface CircularMetric {
  id: string;
  facility: string;
  metric: string;
  value: number;
  unit: string;
  target: number;
  yoyChange: number;
}

// ============================================================
// FACILITIES
// ============================================================

export const facilities: Facility[] = [
  {
    id: 'mtp-olefins',
    name: 'Map Ta Phut Olefins',
    location: 'Map Ta Phut, Rayong',
    type: 'Olefins',
    scope1: 742000,
    scope2: 294000,
    scope3: 695000,
    total: 1731000,
    intensity: 1.84,
    productionVolume: 941000,
    yoyChange: -2.1,
  },
  {
    id: 'mtp-aromatics',
    name: 'Map Ta Phut Aromatics',
    location: 'Map Ta Phut, Rayong',
    type: 'Aromatics',
    scope1: 466000,
    scope2: 189000,
    scope3: 454000,
    total: 1109000,
    intensity: 1.91,
    productionVolume: 581000,
    yoyChange: -3.8,
  },
  {
    id: 'rayong-refinery',
    name: 'Rayong Refinery',
    location: 'Rayong',
    type: 'Refinery',
    scope1: 398000,
    scope2: 158000,
    scope3: 387000,
    total: 943000,
    intensity: 1.78,
    productionVolume: 530000,
    yoyChange: 2.4,
  },
  {
    id: 'thai-pe',
    name: 'Thai Polyethylene',
    location: 'Map Ta Phut, Rayong',
    type: 'Polymers',
    scope1: 225000,
    scope2: 105000,
    scope3: 328000,
    total: 658000,
    intensity: 1.52,
    productionVolume: 433000,
    yoyChange: -1.5,
  },
  {
    id: 'gc-glycol',
    name: 'GC Glycol',
    location: 'Map Ta Phut, Rayong',
    type: 'Glycol',
    scope1: 161000,
    scope2: 84000,
    scope3: 231000,
    total: 476000,
    intensity: 1.46,
    productionVolume: 326000,
    yoyChange: -3.2,
  },
  {
    id: 'envicco',
    name: 'ENVICCO',
    location: 'Rayong',
    type: 'Recycling',
    scope1: 30000,
    scope2: 45000,
    scope3: 85000,
    total: 160000,
    intensity: 0.65,
    productionVolume: 246000,
    yoyChange: -9.1,
  },
  {
    id: 'natureworks',
    name: 'NatureWorks',
    location: 'Rayong',
    type: 'Bioplastics',
    scope1: 66000,
    scope2: 48000,
    scope3: 127000,
    total: 241000,
    intensity: 0.88,
    productionVolume: 274000,
    yoyChange: -5.4,
  },
  {
    id: 'hmc-polymers',
    name: 'HMC Polymers',
    location: 'Map Ta Phut, Rayong',
    type: 'Polymers',
    scope1: 32000,
    scope2: 22000,
    scope3: 203000,
    total: 257000,
    intensity: 1.08,
    productionVolume: 238000,
    yoyChange: -1.8,
  },
];

// ============================================================
// EMISSIONS HISTORY (2019-2026) with SBTi targets
// ============================================================

export const emissionsHistory: EmissionsHistory[] = [
  { year: 2019, scope1: 9200000, scope2: 4200000, scope3: 10100000, total: 23500000, intensity: 2.04, target: 23500000 },
  { year: 2020, scope1: 8900000, scope2: 4050000, scope3: 9800000, total: 22750000, intensity: 1.98, target: 22325000 },
  { year: 2021, scope1: 8750000, scope2: 3950000, scope3: 9650000, total: 22350000, intensity: 1.93, target: 21150000 },
  { year: 2022, scope1: 8600000, scope2: 3900000, scope3: 9500000, total: 22000000, intensity: 1.88, target: 19975000 },
  { year: 2023, scope1: 8500000, scope2: 3850000, scope3: 9400000, total: 21750000, intensity: 1.84, target: 18800000 },
  { year: 2024, scope1: 8400000, scope2: 3800000, scope3: 9300000, total: 21500000, intensity: 1.79, target: 17625000 },
  { year: 2025, scope1: 8250000, scope2: 3700000, scope3: 9150000, total: 21100000, intensity: 1.74, target: 16450000 },
  { year: 2026, scope1: 5100000, scope2: 2280000, scope3: 6100000, total: 13480000, intensity: 1.70, target: 15275000 }, // Q1 2026 partial (annualized projection)
];

// SBTi target trajectory (projected)
export const sbtiTrajectory: { year: number; target: number; actual?: number }[] = [
  { year: 2019, target: 23500000, actual: 23500000 },
  { year: 2020, target: 22325000, actual: 22750000 },
  { year: 2021, target: 21150000, actual: 22350000 },
  { year: 2022, target: 19975000, actual: 22000000 },
  { year: 2023, target: 18800000, actual: 21750000 },
  { year: 2024, target: 17625000, actual: 21500000 },
  { year: 2025, target: 16450000, actual: 21100000 },
  { year: 2026, target: 15275000 },
  { year: 2027, target: 14100000 },
  { year: 2028, target: 12925000 },
  { year: 2029, target: 11750000 },
  { year: 2030, target: 10575000 },
  { year: 2035, target: 7050000 },
  { year: 2040, target: 4700000 },
  { year: 2045, target: 2350000 },
  { year: 2050, target: 0 },
];

// ============================================================
// GROUP-LEVEL SCOPE BREAKDOWNS
// ============================================================

export const scopeBreakdown = {
  scope1: {
    total: 2120000,
    categories: [
      { name: 'Process Emissions', value: 1166000, percentage: 55 },
      { name: 'Stationary Combustion', value: 636000, percentage: 30 },
      { name: 'Mobile Combustion', value: 212000, percentage: 10 },
      { name: 'Fugitive Emissions', value: 106000, percentage: 5 },
    ],
  },
  scope2: {
    total: 945000,
    locationBased: 945000,
    marketBased: 756000,
    categories: [
      { name: 'Purchased Electricity', value: 803000, percentage: 85 },
      { name: 'Purchased Steam', value: 95000, percentage: 10 },
      { name: 'Purchased Cooling', value: 47000, percentage: 5 },
    ],
  },
  scope3: {
    total: 2510000,
    categories: [
      { name: 'Purchased Goods & Services', value: 879000, percentage: 35, category: 1 },
      { name: 'Capital Goods', value: 126000, percentage: 5, category: 2 },
      { name: 'Fuel & Energy Activities', value: 251000, percentage: 10, category: 3 },
      { name: 'Transportation & Distribution', value: 377000, percentage: 15, category: 4 },
      { name: 'Waste Generated', value: 75000, percentage: 3, category: 5 },
      { name: 'Business Travel', value: 25000, percentage: 1, category: 6 },
      { name: 'Employee Commuting', value: 50000, percentage: 2, category: 7 },
      { name: 'Use of Sold Products', value: 552000, percentage: 22, category: 11 },
      { name: 'End-of-Life Treatment', value: 175000, percentage: 7, category: 12 },
    ],
  },
};

// ============================================================
// BLOCKCHAIN RECORDS
// ============================================================

export const blockchainRecords: BlockchainRecord[] = [
  {
    id: 'bc-001',
    timestamp: '2026-04-15T09:23:14Z',
    eventType: 'Submitted',
    facility: 'Map Ta Phut Olefins',
    dataPoint: 'Scope 1 Emissions - Q1 2026',
    submitter: 'Somchai Prasert',
    submitterDID: 'did:nexus:gc:0x7a3b...4f2e',
    approver: '',
    approverDID: '',
    merkleRoot: '0x8f4a2b...c3d1e7',
    txHash: '0xa1b2c3d4e5f6...7890abcdef',
    blockNumber: 18945672,
    status: 'pending',
  },
  {
    id: 'bc-002',
    timestamp: '2026-04-14T14:45:32Z',
    eventType: 'Approved',
    facility: 'Map Ta Phut Olefins',
    dataPoint: 'Scope 2 Emissions - Q4 2025',
    submitter: 'Somchai Prasert',
    submitterDID: 'did:nexus:gc:0x7a3b...4f2e',
    approver: 'Dr. Kannika Suthep',
    approverDID: 'did:nexus:gc:0x2c8d...9a1f',
    merkleRoot: '0x3e7f1a...b8c2d4',
    txHash: '0xb2c3d4e5f6a7...890abcdef1',
    blockNumber: 18945438,
    status: 'verified',
  },
  {
    id: 'bc-003',
    timestamp: '2026-04-14T14:46:01Z',
    eventType: 'Anchored',
    facility: 'Map Ta Phut Olefins',
    dataPoint: 'Scope 2 Emissions - Q4 2025',
    submitter: 'Somchai Prasert',
    submitterDID: 'did:nexus:gc:0x7a3b...4f2e',
    approver: 'System',
    approverDID: 'did:nexus:system:anchor',
    merkleRoot: '0x3e7f1a...b8c2d4',
    txHash: '0xc3d4e5f6a7b8...90abcdef12',
    blockNumber: 18945439,
    status: 'verified',
  },
  {
    id: 'bc-004',
    timestamp: '2026-04-13T11:18:45Z',
    eventType: 'Submitted',
    facility: 'Rayong Refinery',
    dataPoint: 'Scope 1 Emissions - Q1 2026',
    submitter: 'Priya Wattana',
    submitterDID: 'did:nexus:gc:0x5d2e...8b3c',
    approver: '',
    approverDID: '',
    merkleRoot: '0x9b2c4d...e6f8a1',
    txHash: '0xd4e5f6a7b8c9...0abcdef123',
    blockNumber: 18944892,
    status: 'in-review',
  },
  {
    id: 'bc-005',
    timestamp: '2026-04-13T10:05:22Z',
    eventType: 'Approved',
    facility: 'Thai Polyethylene',
    dataPoint: 'Energy Consumption - Q4 2025',
    submitter: 'Nattapong Chai',
    submitterDID: 'did:nexus:gc:0x1f4a...6e9d',
    approver: 'Dr. Kannika Suthep',
    approverDID: 'did:nexus:gc:0x2c8d...9a1f',
    merkleRoot: '0x4f8e2a...d1c3b5',
    txHash: '0xe5f6a7b8c9d0...abcdef1234',
    blockNumber: 18944756,
    status: 'verified',
  },
  {
    id: 'bc-006',
    timestamp: '2026-04-13T10:05:58Z',
    eventType: 'Anchored',
    facility: 'Thai Polyethylene',
    dataPoint: 'Energy Consumption - Q4 2025',
    submitter: 'Nattapong Chai',
    submitterDID: 'did:nexus:gc:0x1f4a...6e9d',
    approver: 'System',
    approverDID: 'did:nexus:system:anchor',
    merkleRoot: '0x4f8e2a...d1c3b5',
    txHash: '0xf6a7b8c9d0e1...bcdef12345',
    blockNumber: 18944757,
    status: 'verified',
  },
  {
    id: 'bc-007',
    timestamp: '2026-04-12T16:32:11Z',
    eventType: 'Report Generated',
    facility: 'GC Group (All)',
    dataPoint: 'CDP Climate Change 2026 Response',
    submitter: 'System',
    submitterDID: 'did:nexus:system:report',
    approver: 'Woraphat Klaewkla',
    approverDID: 'did:nexus:gc:0x8e3f...2d4a',
    merkleRoot: '0x7c1d3e...a5b9f2',
    txHash: '0xa7b8c9d0e1f2...cdef123456',
    blockNumber: 18944201,
    status: 'verified',
  },
  {
    id: 'bc-008',
    timestamp: '2026-04-12T08:14:33Z',
    eventType: 'Submitted',
    facility: 'GC Glycol',
    dataPoint: 'Waste Generation - Q1 2026',
    submitter: 'Kittisak Boonma',
    submitterDID: 'did:nexus:gc:0x3a7c...1e5f',
    approver: '',
    approverDID: '',
    merkleRoot: '0x2e5f8a...c4d7b3',
    txHash: '0xb8c9d0e1f2a3...def1234567',
    blockNumber: 18943889,
    status: 'pending',
  },
  {
    id: 'bc-009',
    timestamp: '2026-04-11T15:47:28Z',
    eventType: 'Approved',
    facility: 'Map Ta Phut Aromatics',
    dataPoint: 'Scope 1 Emissions - Q4 2025',
    submitter: 'Thanyarat Noi',
    submitterDID: 'did:nexus:gc:0x6b2d...3c8e',
    approver: 'Dr. Kannika Suthep',
    approverDID: 'did:nexus:gc:0x2c8d...9a1f',
    merkleRoot: '0x1a4b7c...e8f2d3',
    txHash: '0xc9d0e1f2a3b4...ef12345678',
    blockNumber: 18943456,
    status: 'verified',
  },
  {
    id: 'bc-010',
    timestamp: '2026-04-11T15:48:02Z',
    eventType: 'Anchored',
    facility: 'Map Ta Phut Aromatics',
    dataPoint: 'Scope 1 Emissions - Q4 2025',
    submitter: 'Thanyarat Noi',
    submitterDID: 'did:nexus:gc:0x6b2d...3c8e',
    approver: 'System',
    approverDID: 'did:nexus:system:anchor',
    merkleRoot: '0x1a4b7c...e8f2d3',
    txHash: '0xd0e1f2a3b4c5...f123456789',
    blockNumber: 18943457,
    status: 'verified',
  },
  {
    id: 'bc-011',
    timestamp: '2026-04-10T09:22:17Z',
    eventType: 'Corrected',
    facility: 'Rayong Refinery',
    dataPoint: 'Scope 2 Emissions - Q4 2025 (Correction)',
    submitter: 'Priya Wattana',
    submitterDID: 'did:nexus:gc:0x5d2e...8b3c',
    approver: 'Dr. Kannika Suthep',
    approverDID: 'did:nexus:gc:0x2c8d...9a1f',
    merkleRoot: '0x5d8e2f...a1b4c7',
    txHash: '0xe1f2a3b4c5d6...1234567890',
    blockNumber: 18942934,
    status: 'verified',
  },
  {
    id: 'bc-012',
    timestamp: '2026-04-09T13:56:44Z',
    eventType: 'Submitted',
    facility: 'ENVICCO',
    dataPoint: 'Recycled Content Volume - Q1 2026',
    submitter: 'Apinya Jantaraksa',
    submitterDID: 'did:nexus:gc:0x9f1a...7d2e',
    approver: '',
    approverDID: '',
    merkleRoot: '0x8a3c5e...f2d4b6',
    txHash: '0xf2a3b4c5d6e7...2345678901',
    blockNumber: 18942567,
    status: 'in-review',
  },
  {
    id: 'bc-013',
    timestamp: '2026-04-09T11:23:09Z',
    eventType: 'Approved',
    facility: 'NatureWorks',
    dataPoint: 'Bioplastic Production - Q4 2025',
    submitter: 'Chalerm Kasemsri',
    submitterDID: 'did:nexus:gc:0x4e8b...2a6f',
    approver: 'Woraphat Klaewkla',
    approverDID: 'did:nexus:gc:0x8e3f...2d4a',
    merkleRoot: '0x6f2d4b...c8e1a3',
    txHash: '0xa3b4c5d6e7f8...3456789012',
    blockNumber: 18942345,
    status: 'verified',
  },
  {
    id: 'bc-014',
    timestamp: '2026-04-09T11:23:45Z',
    eventType: 'Anchored',
    facility: 'NatureWorks',
    dataPoint: 'Bioplastic Production - Q4 2025',
    submitter: 'Chalerm Kasemsri',
    submitterDID: 'did:nexus:gc:0x4e8b...2a6f',
    approver: 'System',
    approverDID: 'did:nexus:system:anchor',
    merkleRoot: '0x6f2d4b...c8e1a3',
    txHash: '0xb4c5d6e7f8a9...4567890123',
    blockNumber: 18942346,
    status: 'verified',
  },
  {
    id: 'bc-015',
    timestamp: '2026-04-08T14:38:56Z',
    eventType: 'Submitted',
    facility: 'HMC Polymers',
    dataPoint: 'Scope 1 Emissions - Q1 2026',
    submitter: 'Rattana Phol',
    submitterDID: 'did:nexus:gc:0x2b5e...8c1d',
    approver: '',
    approverDID: '',
    merkleRoot: '0x3b7e1c...d5f9a2',
    txHash: '0xc5d6e7f8a9b0...5678901234',
    blockNumber: 18941987,
    status: 'pending',
  },
  {
    id: 'bc-016',
    timestamp: '2026-04-07T10:12:33Z',
    eventType: 'Approved',
    facility: 'Map Ta Phut Olefins',
    dataPoint: 'Water Consumption - Q4 2025',
    submitter: 'Somchai Prasert',
    submitterDID: 'did:nexus:gc:0x7a3b...4f2e',
    approver: 'Dr. Kannika Suthep',
    approverDID: 'did:nexus:gc:0x2c8d...9a1f',
    merkleRoot: '0x9d4f2a...b7c8e1',
    txHash: '0xd6e7f8a9b0c1...6789012345',
    blockNumber: 18941432,
    status: 'verified',
  },
  {
    id: 'bc-017',
    timestamp: '2026-04-07T10:13:01Z',
    eventType: 'Anchored',
    facility: 'Map Ta Phut Olefins',
    dataPoint: 'Water Consumption - Q4 2025',
    submitter: 'Somchai Prasert',
    submitterDID: 'did:nexus:gc:0x7a3b...4f2e',
    approver: 'System',
    approverDID: 'did:nexus:system:anchor',
    merkleRoot: '0x9d4f2a...b7c8e1',
    txHash: '0xe7f8a9b0c1d2...7890123456',
    blockNumber: 18941433,
    status: 'verified',
  },
  {
    id: 'bc-018',
    timestamp: '2026-04-06T16:45:12Z',
    eventType: 'Report Generated',
    facility: 'GC Group (All)',
    dataPoint: 'GRI 305 Emissions Disclosure 2026',
    submitter: 'System',
    submitterDID: 'did:nexus:system:report',
    approver: 'Woraphat Klaewkla',
    approverDID: 'did:nexus:gc:0x8e3f...2d4a',
    merkleRoot: '0x2f6a8c...e4d1b3',
    txHash: '0xf8a9b0c1d2e3...8901234567',
    blockNumber: 18940987,
    status: 'verified',
  },
  {
    id: 'bc-019',
    timestamp: '2026-04-05T09:34:28Z',
    eventType: 'Submitted',
    facility: 'GC Glycol',
    dataPoint: 'Scope 3 Category 1 - Q4 2025',
    submitter: 'Kittisak Boonma',
    submitterDID: 'did:nexus:gc:0x3a7c...1e5f',
    approver: '',
    approverDID: '',
    merkleRoot: '0x7e3b1d...a9c2f5',
    txHash: '0xa9b0c1d2e3f4...9012345678',
    blockNumber: 18940456,
    status: 'in-review',
  },
  {
    id: 'bc-020',
    timestamp: '2026-04-04T14:18:55Z',
    eventType: 'Approved',
    facility: 'Rayong Refinery',
    dataPoint: 'Energy Intensity - Q4 2025',
    submitter: 'Priya Wattana',
    submitterDID: 'did:nexus:gc:0x5d2e...8b3c',
    approver: 'Woraphat Klaewkla',
    approverDID: 'did:nexus:gc:0x8e3f...2d4a',
    merkleRoot: '0x4c8d2f...b6e3a1',
    txHash: '0xb0c1d2e3f4a5...0123456789',
    blockNumber: 18939987,
    status: 'verified',
  },
  {
    id: 'bc-021',
    timestamp: '2026-04-04T14:19:22Z',
    eventType: 'Anchored',
    facility: 'Rayong Refinery',
    dataPoint: 'Energy Intensity - Q4 2025',
    submitter: 'Priya Wattana',
    submitterDID: 'did:nexus:gc:0x5d2e...8b3c',
    approver: 'System',
    approverDID: 'did:nexus:system:anchor',
    merkleRoot: '0x4c8d2f...b6e3a1',
    txHash: '0xc1d2e3f4a5b6...1234567890',
    blockNumber: 18939988,
    status: 'verified',
  },
  {
    id: 'bc-022',
    timestamp: '2026-04-03T11:56:41Z',
    eventType: 'Submitted',
    facility: 'Thai Polyethylene',
    dataPoint: 'Scope 1 Emissions - Q1 2026',
    submitter: 'Nattapong Chai',
    submitterDID: 'did:nexus:gc:0x1f4a...6e9d',
    approver: '',
    approverDID: '',
    merkleRoot: '0x1d5e8f...c3a7b2',
    txHash: '0xd2e3f4a5b6c7...2345678901',
    blockNumber: 18939432,
    status: 'pending',
  },
  {
    id: 'bc-023',
    timestamp: '2026-04-02T08:42:19Z',
    eventType: 'Approved',
    facility: 'ENVICCO',
    dataPoint: 'Waste Diversion Rate - Q4 2025',
    submitter: 'Apinya Jantaraksa',
    submitterDID: 'did:nexus:gc:0x9f1a...7d2e',
    approver: 'Dr. Kannika Suthep',
    approverDID: 'did:nexus:gc:0x2c8d...9a1f',
    merkleRoot: '0x8f2c4d...e1a3b5',
    txHash: '0xe3f4a5b6c7d8...3456789012',
    blockNumber: 18938876,
    status: 'verified',
  },
  {
    id: 'bc-024',
    timestamp: '2026-04-02T08:42:55Z',
    eventType: 'Anchored',
    facility: 'ENVICCO',
    dataPoint: 'Waste Diversion Rate - Q4 2025',
    submitter: 'Apinya Jantaraksa',
    submitterDID: 'did:nexus:gc:0x9f1a...7d2e',
    approver: 'System',
    approverDID: 'did:nexus:system:anchor',
    merkleRoot: '0x8f2c4d...e1a3b5',
    txHash: '0xf4a5b6c7d8e9...4567890123',
    blockNumber: 18938877,
    status: 'verified',
  },
  {
    id: 'bc-025',
    timestamp: '2026-04-01T15:28:37Z',
    eventType: 'Report Generated',
    facility: 'GC Group (All)',
    dataPoint: 'TCFD Disclosure Report 2026',
    submitter: 'System',
    submitterDID: 'did:nexus:system:report',
    approver: 'Woraphat Klaewkla',
    approverDID: 'did:nexus:gc:0x8e3f...2d4a',
    merkleRoot: '0x5a9c2d...f4e8b1',
    txHash: '0xa5b6c7d8e9f0...5678901234',
    blockNumber: 18938345,
    status: 'verified',
  },
  {
    id: 'bc-026',
    timestamp: '2026-03-30T12:15:08Z',
    eventType: 'Corrected',
    facility: 'Map Ta Phut Aromatics',
    dataPoint: 'Scope 1 Process Emissions - Q4 2025 (Correction)',
    submitter: 'Thanyarat Noi',
    submitterDID: 'did:nexus:gc:0x6b2d...3c8e',
    approver: 'Dr. Kannika Suthep',
    approverDID: 'did:nexus:gc:0x2c8d...9a1f',
    merkleRoot: '0x2b6d8f...c1e4a3',
    txHash: '0xb6c7d8e9f0a1...6789012345',
    blockNumber: 18937812,
    status: 'verified',
  },
  {
    id: 'bc-027',
    timestamp: '2026-03-29T09:51:23Z',
    eventType: 'Submitted',
    facility: 'Map Ta Phut Olefins',
    dataPoint: 'Scope 3 Transportation - Q4 2025',
    submitter: 'Somchai Prasert',
    submitterDID: 'did:nexus:gc:0x7a3b...4f2e',
    approver: '',
    approverDID: '',
    merkleRoot: '0x6c3e9a...d2f5b8',
    txHash: '0xc7d8e9f0a1b2...7890123456',
    blockNumber: 18937234,
    status: 'verified',
  },
  {
    id: 'bc-028',
    timestamp: '2026-03-28T14:33:56Z',
    eventType: 'Approved',
    facility: 'Map Ta Phut Olefins',
    dataPoint: 'Scope 3 Transportation - Q4 2025',
    submitter: 'Somchai Prasert',
    submitterDID: 'did:nexus:gc:0x7a3b...4f2e',
    approver: 'Woraphat Klaewkla',
    approverDID: 'did:nexus:gc:0x8e3f...2d4a',
    merkleRoot: '0x6c3e9a...d2f5b8',
    txHash: '0xd8e9f0a1b2c3...8901234567',
    blockNumber: 18936876,
    status: 'verified',
  },
  {
    id: 'bc-029',
    timestamp: '2026-03-28T14:34:22Z',
    eventType: 'Anchored',
    facility: 'Map Ta Phut Olefins',
    dataPoint: 'Scope 3 Transportation - Q4 2025',
    submitter: 'Somchai Prasert',
    submitterDID: 'did:nexus:gc:0x7a3b...4f2e',
    approver: 'System',
    approverDID: 'did:nexus:system:anchor',
    merkleRoot: '0x6c3e9a...d2f5b8',
    txHash: '0xe9f0a1b2c3d4...9012345678',
    blockNumber: 18936877,
    status: 'verified',
  },
  {
    id: 'bc-030',
    timestamp: '2026-03-27T10:08:44Z',
    eventType: 'Submitted',
    facility: 'HMC Polymers',
    dataPoint: 'Energy Consumption - Q4 2025',
    submitter: 'Rattana Phol',
    submitterDID: 'did:nexus:gc:0x2b5e...8c1d',
    approver: '',
    approverDID: '',
    merkleRoot: '0x9a4d1f...b3c6e8',
    txHash: '0xf0a1b2c3d4e5...0123456789',
    blockNumber: 18936321,
    status: 'verified',
  },
];

// ============================================================
// SUPPLIERS
// ============================================================

export const suppliers: Supplier[] = [
  { id: 'sup-01', name: 'Siam Cement Group', category: 'Raw Materials', estimatedEmissions: 1250000, dataCompleteness: 92, tier: 1, country: 'Thailand', status: 'complete', dataFormat: 'supplier-provided', lastUpdated: '2026-03-15' },
  { id: 'sup-02', name: 'IRPC Public Company', category: 'Petrochemical Feedstock', estimatedEmissions: 980000, dataCompleteness: 88, tier: 1, country: 'Thailand', status: 'complete', dataFormat: 'supplier-provided', lastUpdated: '2026-03-12' },
  { id: 'sup-03', name: 'Thai Oil PCL', category: 'Refined Products', estimatedEmissions: 870000, dataCompleteness: 95, tier: 1, country: 'Thailand', status: 'complete', dataFormat: 'supplier-provided', lastUpdated: '2026-03-20' },
  { id: 'sup-04', name: 'PTT PCL', category: 'Natural Gas Supply', estimatedEmissions: 1540000, dataCompleteness: 91, tier: 1, country: 'Thailand', status: 'complete', dataFormat: 'supplier-provided', lastUpdated: '2026-03-18' },
  { id: 'sup-05', name: 'Indorama Ventures', category: 'PET Feedstock', estimatedEmissions: 720000, dataCompleteness: 78, tier: 1, country: 'Thailand', status: 'partial', dataFormat: 'supplier-provided', lastUpdated: '2026-02-28' },
  { id: 'sup-06', name: 'Bangchak Corporation', category: 'Fuel Supply', estimatedEmissions: 560000, dataCompleteness: 82, tier: 1, country: 'Thailand', status: 'complete', dataFormat: 'supplier-provided', lastUpdated: '2026-03-10' },
  { id: 'sup-07', name: 'Star Petroleum Refining', category: 'Petroleum Products', estimatedEmissions: 430000, dataCompleteness: 45, tier: 1, country: 'Thailand', status: 'incomplete', dataFormat: 'estimated', lastUpdated: '2025-12-15' },
  { id: 'sup-08', name: 'Global Power Synergy', category: 'Electricity & Utilities', estimatedEmissions: 680000, dataCompleteness: 72, tier: 1, country: 'Thailand', status: 'partial', dataFormat: 'supplier-provided', lastUpdated: '2026-02-20' },
  { id: 'sup-09', name: 'Vinythai PCL', category: 'Chemical Intermediates', estimatedEmissions: 310000, dataCompleteness: 38, tier: 1, country: 'Thailand', status: 'incomplete', dataFormat: 'estimated', lastUpdated: '2025-11-30' },
  { id: 'sup-10', name: 'AGC Chemicals Thailand', category: 'Specialty Chemicals', estimatedEmissions: 290000, dataCompleteness: 35, tier: 1, country: 'Thailand/Japan', status: 'incomplete', dataFormat: 'estimated', lastUpdated: '2025-10-15' },
];

// ============================================================
// ANOMALIES
// ============================================================

export const anomalies: AnomalyRecord[] = [
  {
    id: 'anom-001',
    severity: 'critical',
    title: 'Scope 2 Dropped 40% Between 2022–2023 — No Documented Explanation',
    description: 'Map Ta Phut Aromatics reported Scope 2 emissions of 780,000 tCO₂e in 2022, falling to 468,000 tCO₂e in 2023 — a 40% reduction. No methodology change, REC procurement, or grid emission factor update was recorded in the data notes. This magnitude of change without documentation will trigger an assurance flag.',
    metric: 'Scope 2 Emissions',
    year: '2022 → 2023',
    facility: 'Map Ta Phut Aromatics',
    expectedValue: '~741,000 tCO₂e (–5% trend)',
    actualValue: '468,000 tCO₂e (–40%)',
    recommendation: 'Investigate: did the facility switch to market-based reporting with I-RECs? Was there a grid emission factor revision from TGO? If legitimate, document the change with supporting evidence (REC certificates, TGO factor update notice). If this is a data entry error, correct via the Workflow Engine. Without documentation, third-party assurance (LRQA) will flag this as a material misstatement risk.',
  },
  {
    id: 'anom-002',
    severity: 'critical',
    title: 'Scope 3 Cat 1 Rose 25% While Production Fell 3.2%',
    description: 'Scope 3 Category 1 (Purchased Goods & Services) increased from 2,604,000 to 3,255,000 tCO₂e (+25%) between 2023 and 2024, while production volume declined 3.2%. Normally these track together. This inverse movement has no matching supplier change in the procurement log.',
    metric: 'Scope 3 Category 1',
    year: '2023 → 2024',
    facility: 'GC Group (All)',
    expectedValue: '~2,521,000 tCO₂e (proportional)',
    actualValue: '3,255,000 tCO₂e (+25%)',
    recommendation: 'Three possible explanations: (1) Supplier emission factors were updated — check if ecoinvent or supplier-specific factors changed between reporting cycles. (2) New Scope 3 categories brought into boundary — check if previously excluded suppliers are now included. (3) Data quality issue in procurement spend mapping. Recommended: reconcile with procurement team, compare supplier list year-over-year, document any boundary changes in the GHG inventory management plan.',
  },
  {
    id: 'anom-003',
    severity: 'warning',
    title: 'Q1 2026 Scope 1 Intensity 12% Above 5-Year Trend',
    description: 'The current Q1 2026 Scope 1 emissions intensity is 0.47 tCO₂e/tonne product, which is 12% above the trailing 5-year average (0.42 tCO₂e/tonne). This reverses 4 consecutive years of intensity improvement and may jeopardize the 2026 SBTi target if it persists.',
    metric: 'Scope 1 Intensity',
    year: 'Q1 2026 vs 5-yr avg',
    facility: 'Rayong Refinery',
    expectedValue: '≤0.42 tCO₂e/tonne',
    actualValue: '0.47 tCO₂e/tonne',
    recommendation: 'Q1 typically runs higher due to turnaround activities, but 12% exceeds the normal seasonal band (±5%). Check if the Rayong Refinery had a prolonged flaring event or process upset in Jan–Mar 2026. If operational, model whether Q2–Q4 improvement can compensate. If structural (e.g., heavier crude slate), update the SBTi trajectory forecast and flag to the sustainability committee.',
  },
  {
    id: 'anom-004',
    severity: 'warning',
    title: 'Scope 2 Market-Based vs Location-Based Gap Widening',
    description: 'In 2025, the gap between market-based (2,960,000 tCO₂e) and location-based (3,700,000 tCO₂e) Scope 2 reporting grew to 20%, up from 8% in 2023. This widening gap suggests increasing reliance on RECs without corresponding physical grid decarbonisation.',
    metric: 'Scope 2 Dual Reporting',
    year: '2023 → 2025 trend',
    facility: 'GC Group (All)',
    expectedValue: '8–10% gap (historical)',
    actualValue: '20% gap',
    recommendation: 'While technically compliant under GHG Protocol Scope 2 Guidance, CDP and ISSB/IFRS S2 increasingly scrutinize REC quality. Verify that I-RECs meet temporal matching (same calendar year), geographic matching (Thailand grid), and additionality criteria. Consider transitioning from unbundled RECs to PPAs for future reporting credibility. Document the REC procurement strategy in the CDP response Section C8.',
  },
  {
    id: 'anom-005',
    severity: 'critical',
    title: 'Fugitive Emissions 3× Standard Deviation in Feb 2026',
    description: 'Fugitive emissions at Map Ta Phut Olefins spiked to 52,000 tCO₂e in February 2026 — more than 3× the standard deviation from the 12-month rolling mean (18,200 ± 11,000 tCO₂e). This single data point accounts for an anomalous 8% of the facility\'s monthly Scope 1.',
    metric: 'Scope 1 — Fugitive',
    year: 'Feb 2026',
    facility: 'Map Ta Phut Olefins',
    expectedValue: '12,000–29,000 tCO₂e',
    actualValue: '52,000 tCO₂e',
    recommendation: 'This likely indicates either (1) an actual leak event — check LDAR survey records and process safety incident logs for Feb 2026, or (2) a measurement/estimation error in the fugitive emissions calculation. If a real leak: document the root cause, corrective actions, and expected recurrence. If a data error: correct via the Workflow Engine before this datapoint flows into CDP or GRI 305 disclosures.',
  },
];

// ============================================================
// EXTRACTED HISTORICAL DATA (for anomaly detection upload simulation)
// ============================================================

export const extractedHistoricalData = [
  { year: 2019, scope1: 9200000, scope2: 4200000, scope3: 10100000, total: 23500000, source: 'Annual Sustainability Report 2019', verified: true },
  { year: 2020, scope1: 8900000, scope2: 4050000, scope3: 9800000, total: 22750000, source: 'Annual Sustainability Report 2020', verified: true },
  { year: 2021, scope1: 8750000, scope2: 3950000, scope3: 9650000, total: 22350000, source: 'Annual Sustainability Report 2021', verified: true },
  { year: 2022, scope1: 8600000, scope2: 3900000, scope3: 9500000, total: 22000000, source: 'CDP Climate Change Response 2022', verified: true },
  { year: 2023, scope1: 8500000, scope2: 3850000, scope3: 9400000, total: 21750000, source: 'CDP Climate Change Response 2023', verified: true },
  { year: 2024, scope1: 8400000, scope2: 3800000, scope3: 9300000, total: 21500000, source: 'Annual Sustainability Report 2024 (Assured)', verified: true },
  { year: 2025, scope1: 8250000, scope2: 3700000, scope3: 9150000, total: 21100000, source: 'Annual Sustainability Report 2025 (Assured)', verified: true },
  { year: 2026, scope1: 2120000, scope2: 945000, scope3: 2510000, total: 5575000, source: 'Q1 2026 Actuals (Jan–Mar)', verified: false },
];

// Quarterly breakdown for 2026 (current reporting year)
export const quarterly2026 = [
  { quarter: 'Q1 2026', scope1: 2120000, scope2: 945000, scope3: 2510000, total: 5575000, production: 2840000, status: 'submitted' as const },
  { quarter: 'Q2 2026', scope1: 0, scope2: 0, scope3: 0, total: 0, production: 0, status: 'pending' as const },
  { quarter: 'Q3 2026', scope1: 0, scope2: 0, scope3: 0, total: 0, production: 0, status: 'pending' as const },
  { quarter: 'Q4 2026', scope1: 0, scope2: 0, scope3: 0, total: 0, production: 0, status: 'pending' as const },
];

// Year-over-year comparison data for anomaly engine
export const yoyComparison = {
  scope1: {
    '2025': 8250000, '2026_annualized': 8480000, change: 2.8, trend: 'up' as const,
    note: 'Q1 intensity spike at Rayong Refinery driving annualized projection above 2025',
  },
  scope2: {
    '2025': 3700000, '2026_annualized': 3780000, change: 2.2, trend: 'up' as const,
    note: 'Market-based: 2,960,000 (–20% from location-based). Gap widening.',
  },
  scope3: {
    '2025': 9150000, '2026_annualized': 10040000, change: 9.7, trend: 'up' as const,
    note: 'Cat 1 re-estimation with updated ecoinvent 3.10 factors driving increase',
  },
};

// ============================================================
// FRAMEWORK STATUS
// ============================================================

export const frameworkStatuses: FrameworkStatus[] = [
  {
    id: 'cdp',
    name: 'CDP',
    fullName: 'CDP Climate Change 2026',
    completion: 87,
    disclosures: 48,
    totalDisclosures: 55,
    status: 'In Progress',
    score: 'A-',
  },
  {
    id: 'tcfd',
    name: 'TCFD / IFRS S2',
    fullName: 'Task Force on Climate-related Financial Disclosures',
    completion: 92,
    disclosures: 11,
    totalDisclosures: 12,
    status: 'Published',
    score: 'Aligned',
  },
  {
    id: 'gri',
    name: 'GRI 305',
    fullName: 'GRI 305: Emissions 2016',
    completion: 95,
    disclosures: 7,
    totalDisclosures: 7,
    status: 'Published',
  },
  {
    id: 'csrd',
    name: 'CSRD',
    fullName: 'ESRS E1: Climate Change',
    completion: 29,
    disclosures: 2,
    totalDisclosures: 6,
    status: 'Draft',
  },
];

// CDP detailed sections
export const cdpSections = [
  { id: 'C0', name: 'Introduction', status: 'complete' as const, questions: 4, answered: 4 },
  { id: 'C1', name: 'Governance', status: 'complete' as const, questions: 6, answered: 6 },
  { id: 'C2', name: 'Risks & Opportunities', status: 'complete' as const, questions: 8, answered: 8 },
  { id: 'C3', name: 'Business Strategy', status: 'complete' as const, questions: 5, answered: 5 },
  { id: 'C4', name: 'Targets & Performance', status: 'complete' as const, questions: 7, answered: 7 },
  { id: 'C5', name: 'Emissions Methodology', status: 'complete' as const, questions: 4, answered: 4 },
  { id: 'C6', name: 'Emissions Data', status: 'in-progress' as const, questions: 8, answered: 6 },
  { id: 'C7', name: 'Emissions Breakdown', status: 'in-progress' as const, questions: 6, answered: 4 },
  { id: 'C8', name: 'Energy', status: 'complete' as const, questions: 5, answered: 5 },
  { id: 'C9', name: 'Additional Metrics', status: 'in-progress' as const, questions: 4, answered: 2 },
  { id: 'C10', name: 'Verification', status: 'not-started' as const, questions: 3, answered: 0 },
  { id: 'C11', name: 'Carbon Pricing', status: 'complete' as const, questions: 3, answered: 3 },
  { id: 'C12', name: 'Engagement', status: 'in-progress' as const, questions: 5, answered: 3 },
];

// TCFD sections
export const tcfdSections = [
  { id: 'governance', name: 'Governance', status: 'complete' as const, disclosures: ['Board oversight', 'Management role'], completion: 100 },
  { id: 'strategy', name: 'Strategy', status: 'complete' as const, disclosures: ['Climate risks & opportunities', 'Impact on business', 'Scenario analysis'], completion: 100 },
  { id: 'risk-mgmt', name: 'Risk Management', status: 'complete' as const, disclosures: ['Risk identification', 'Risk management process', 'Integration'], completion: 100 },
  { id: 'metrics', name: 'Metrics & Targets', status: 'in-progress' as const, disclosures: ['GHG emissions', 'Climate risks metrics', 'Climate targets'], completion: 67 },
];

// GRI 305 disclosures
export const griDisclosures = [
  { id: '305-1', name: 'Direct (Scope 1) GHG emissions', value: '2,120,000 tCO\u2082e (Q1 2026)', status: 'complete' as const, verified: false },
  { id: '305-2', name: 'Energy indirect (Scope 2) GHG emissions', value: '945,000 tCO\u2082e (location) / 756,000 tCO\u2082e (market)', status: 'complete' as const, verified: false },
  { id: '305-3', name: 'Other indirect (Scope 3) GHG emissions', value: '2,510,000 tCO\u2082e (Q1 2026)', status: 'complete' as const, verified: false },
  { id: '305-4', name: 'GHG emissions intensity', value: '1.70 tCO\u2082e / ton of product', status: 'complete' as const, verified: false },
  { id: '305-5', name: 'Reduction of GHG emissions', value: 'Pending full-year data', status: 'in-progress' as const, verified: false },
  { id: '305-6', name: 'Emissions of ozone-depleting substances', value: '3.1 tonnes CFC-11 eq (Q1)', status: 'complete' as const, verified: false },
  { id: '305-7', name: 'NOx, SOx, and other significant air emissions', value: 'NOx: 2,113t, SOx: 803t, PM: 473t (Q1)', status: 'complete' as const, verified: false },
];

// ============================================================
// WORKFLOW ITEMS
// ============================================================

export const workflowItems: WorkflowItem[] = [
  { id: 'wf-001', facility: 'Map Ta Phut Olefins', dataType: 'Scope 1 Process Emissions — Q1 2026', submittedBy: 'Somchai Prasert', submittedDate: '2026-04-07', status: 'pending', value: '742,000 tCO\u2082e', scope: 'Scope 1', assignedTo: 'Dr. Kannika Suthep', assignedRole: 'team-lead', entityType: 'intercompany' },
  { id: 'wf-002', facility: 'Rayong Refinery', dataType: 'Scope 1 Combustion — Q1 2026', submittedBy: 'Priya Wattana', submittedDate: '2026-04-06', status: 'pending', value: '398,000 tCO\u2082e', scope: 'Scope 1', assignedTo: 'Somchai Prasert', assignedRole: 'facility-manager', entityType: 'intercompany' },
  { id: 'wf-003', facility: 'GC Glycol', dataType: 'Waste Generation Data — Q1 2026', submittedBy: 'Kittisak Boonma', submittedDate: '2026-04-05', status: 'pending', value: '612 tonnes', scope: 'Waste', assignedTo: 'Kittisak Boonma', assignedRole: 'site-owner', entityType: 'subsidiary' },
  { id: 'wf-004', facility: 'ENVICCO', dataType: 'Recycled Content Volume — Q1 2026', submittedBy: 'Apinya Jantaraksa', submittedDate: '2026-04-04', status: 'pending', value: '11,250 tonnes', scope: 'Circular', assignedTo: 'Apinya Jantaraksa', assignedRole: 'facility-manager', entityType: 'subsidiary' },
  { id: 'wf-005', facility: 'Thai Polyethylene', dataType: 'Scope 1 Emissions — Q1 2026', submittedBy: 'Nattapong Chai', submittedDate: '2026-04-03', status: 'approved', value: '225,000 tCO\u2082e', scope: 'Scope 1', assignedTo: 'Dr. Kannika Suthep', assignedRole: 'team-lead', entityType: 'subsidiary' },
  { id: 'wf-006', facility: 'HMC Polymers', dataType: 'Scope 1 Emissions — Q1 2026', submittedBy: 'Rattana Phol', submittedDate: '2026-04-03', status: 'approved', value: '32,000 tCO\u2082e', scope: 'Scope 1', assignedTo: 'Somchai Prasert', assignedRole: 'facility-manager', entityType: 'subsidiary' },
  { id: 'wf-007', facility: 'Map Ta Phut Aromatics', dataType: 'Energy Consumption — Q1 2026', submittedBy: 'Thanyarat Noi', submittedDate: '2026-04-02', status: 'anchored', value: '1,130 GWh', scope: 'Energy', assignedTo: 'System', assignedRole: 'auto', entityType: 'intercompany' },
  { id: 'wf-008', facility: 'NatureWorks', dataType: 'PLA Production Volume — Q1 2026', submittedBy: 'Chalerm Kasemsri', submittedDate: '2026-04-01', status: 'anchored', value: '9,375 tonnes', scope: 'Production', assignedTo: 'Apinya Jantaraksa', assignedRole: 'facility-manager', entityType: 'subsidiary' },
];

// ============================================================
// CIRCULAR ECONOMY METRICS
// ============================================================

export const circularMetrics: CircularMetric[] = [
  { id: 'cm-01', facility: 'ENVICCO', metric: 'Recycled PET Volume', value: 45000, unit: 'tonnes/year', target: 50000, yoyChange: 12.5 },
  { id: 'cm-02', facility: 'ENVICCO', metric: 'Recycled Content Rate', value: 78, unit: '%', target: 85, yoyChange: 5.2 },
  { id: 'cm-03', facility: 'ENVICCO', metric: 'Waste Diversion', value: 92, unit: '%', target: 95, yoyChange: 3.1 },
  { id: 'cm-04', facility: 'NatureWorks', metric: 'PLA Production Volume', value: 150000, unit: 'tonnes/year', target: 175000, yoyChange: 8.7 },
  { id: 'cm-05', facility: 'NatureWorks', metric: 'Bio-based Content', value: 100, unit: '%', target: 100, yoyChange: 0 },
  { id: 'cm-06', facility: 'NatureWorks', metric: 'Carbon Footprint Reduction vs Conventional', value: 60, unit: '%', target: 65, yoyChange: 4.3 },
  { id: 'cm-07', facility: 'GC Group (All)', metric: 'Overall Waste Diversion Rate', value: 87, unit: '%', target: 92, yoyChange: 2.8 },
  { id: 'cm-08', facility: 'GC Group (All)', metric: 'Recycled Material Input', value: 340000, unit: 'tonnes/year', target: 400000, yoyChange: 15.2 },
  { id: 'cm-09', facility: 'GC Group (All)', metric: 'Hazardous Waste Recycled', value: 72, unit: '%', target: 80, yoyChange: 6.1 },
];

// ============================================================
// AI REPORT TEXT
// ============================================================

export const aiReportText = `## GC Group Q1 2026 Emissions Performance Summary

GC Group's Q1 2026 greenhouse gas emissions total **5.58 million tCO\u2082e**, representing the first quarter of the FY 2026 reporting cycle. Annualized, this projects to approximately **22.3 million tCO\u2082e** — a **5.7% increase** over FY 2025 (21.1M) if sustained. However, Q1 typically trends higher due to seasonal factors and turnaround activities.

### Key Highlights

**Scope 1 emissions** for Q1 are **2.12 million tCO\u2082e**, tracking slightly above the FY 2025 quarterly run-rate. The anomaly detection engine has flagged elevated Scope 1 intensity at Rayong Refinery (0.47 tCO\u2082e/tonne vs 0.42 trailing average), likely driven by a prolonged turnaround in January.

**Scope 2 emissions** are **945,000 tCO\u2082e** (location-based) for Q1. The gap between market-based (756,000 tCO\u2082e) and location-based reporting has widened to **20%**, up from 8% in 2023, reflecting increased I-REC procurement. This has been flagged for REC quality review.

**Scope 3 emissions** total **2.51 million tCO\u2082e** for Q1. Category 1 (Purchased Goods & Services) continues to show upward pressure following the ecoinvent 3.10 emission factor update. Three Tier 1 suppliers remain below 50% data completeness.

### Anomalies Flagged This Quarter

- **Fugitive emissions spike** at Map Ta Phut Olefins in February (52,000 tCO\u2082e, 3\u00d7 standard deviation) — under investigation
- **Scope 1 intensity** at Rayong Refinery **12% above** 5-year trend — monitoring through Q2
- **Scope 2 market/location gap** widening to 20% — REC quality review recommended before CDP submission

### SBTi Target Alignment

The 2026 SBTi target is **15.28 million tCO\u2082e**. At the current Q1 annualized rate, the group is projected **46% above target**. Structural reduction levers including carbon capture at Map Ta Phut Olefins and expanded PPA procurement are critical.

### Historical Context

FY 2025 closed at **21.1 million tCO\u2082e** (assured by LRQA), a 1.9% reduction from FY 2024. The seven-year trend (2019-2025) shows a cumulative **10.2% reduction** against a SBTi-required **30%** for the same period.

### Data Sources

Q1 2026 data is submitted and pending blockchain verification. FY 2019\u20132025 historical baselines are fully assured and blockchain-anchored.

---

*Generated by Nexus AI \u00b7 Based on Q1 2026 data as of April 7, 2026*`;

// ============================================================
// COMPLIANCE STATUS
// ============================================================

export const complianceStatus = [
  { framework: 'CDP', score: 'A-', status: 'In Progress', year: 2026, color: '#10B981' },
  { framework: 'TCFD', score: 'Aligned', status: 'In Progress', year: 2026, color: '#3B82F6' },
  { framework: 'GRI', score: 'Draft', status: 'In Progress', year: 2026, color: '#8B5CF6' },
  { framework: 'DJSI', score: '#1 Chemicals', status: 'Ranked', year: 2025, color: '#F59E0B' },
];

// ============================================================
// KPI SUMMARY
// ============================================================

export const kpiSummary = {
  totalEmissions: 5575000,  // Q1 2026 actuals
  annualProjection: 22300000, // annualized from Q1
  scope1: 2120000,
  scope2: 945000,
  scope3: 2510000,
  intensity: 1.70,
  yoyChange: -2.3,  // vs Q1 2025
  facilitiesCount: 8,
  totalProduction: 2840000, // Q1 production
  dataPointsVerified: 847,
  blockchainAnchored: 612,
  suppliersEngaged: 10,
  supplyChainCoverage: 68,
  reportingYear: 2026,
  quarterComplete: 1,
};

// ============================================================
// MONTHLY EMISSIONS DATA (2026) - for scope calculators
// ============================================================

export interface MonthlyEmission {
  month: string;
  monthIndex: number;
  scope1: {
    process: number;
    combustion: number;
    mobile: number;
    fugitive: number;
    total: number;
  };
  scope2: {
    electricity: number;
    steam: number;
    cooling: number;
    total: number;
    marketBased: number;
  };
  scope3: {
    cat1: number;
    cat2: number;
    cat3: number;
    cat4: number;
    cat5: number;
    cat6: number;
    cat7: number;
    cat11: number;
    cat12: number;
    total: number;
  };
  total: number;
  productionVolume: number;
  status: 'verified' | 'submitted' | 'draft' | 'pending';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Realistic monthly distribution with seasonal variation (higher in hot months for cooling, lower in Q4 due to maintenance)
export const monthlyEmissions2026: MonthlyEmission[] = MONTHS.map((month, i) => {
  // Seasonal factors: slightly higher in hot months (Mar-May), lower in Dec maintenance shutdown
  const seasonFactor = [0.97, 0.96, 1.04, 1.06, 1.05, 1.02, 1.00, 0.99, 0.98, 0.97, 0.96, 0.90];
  const sf = seasonFactor[i];

  const s1Process = Math.round(385000 * sf);
  const s1Combustion = Math.round(210000 * sf);
  const s1Mobile = Math.round(70000 * sf);
  const s1Fugitive = Math.round(35000 * sf);
  const s1Total = s1Process + s1Combustion + s1Mobile + s1Fugitive;

  const s2Electricity = Math.round(269000 * sf);
  const s2Steam = Math.round(31700 * sf);
  const s2Cooling = Math.round(15800 * (i >= 2 && i <= 5 ? 1.3 : 0.85));
  const s2Total = s2Electricity + s2Steam + s2Cooling;
  const s2Market = Math.round(s2Total * 0.9);

  const s3Cat1 = Math.round(271250 * sf);
  const s3Cat2 = Math.round(38750 * sf);
  const s3Cat3 = Math.round(77500 * sf);
  const s3Cat4 = Math.round(116250 * sf);
  const s3Cat5 = Math.round(23250 * sf);
  const s3Cat6 = Math.round(7750 * sf);
  const s3Cat7 = Math.round(15500 * sf);
  const s3Cat11 = Math.round(170500 * sf);
  const s3Cat12 = Math.round(54250 * sf);
  const s3Total = s3Cat1 + s3Cat2 + s3Cat3 + s3Cat4 + s3Cat5 + s3Cat6 + s3Cat7 + s3Cat11 + s3Cat12;

  const total = s1Total + s2Total + s3Total;
  const prodVolume = Math.round(1136400 * sf);

  // Status: Jan-Mar verified (Q1 complete), Apr submitted (current month), May-Dec pending/draft
  const status: MonthlyEmission['status'] = i <= 2 ? 'verified' : i === 3 ? 'submitted' : i <= 5 ? 'draft' : 'pending';

  return {
    month,
    monthIndex: i,
    scope1: { process: s1Process, combustion: s1Combustion, mobile: s1Mobile, fugitive: s1Fugitive, total: s1Total },
    scope2: { electricity: s2Electricity, steam: s2Steam, cooling: s2Cooling, total: s2Total, marketBased: s2Market },
    scope3: { cat1: s3Cat1, cat2: s3Cat2, cat3: s3Cat3, cat4: s3Cat4, cat5: s3Cat5, cat6: s3Cat6, cat7: s3Cat7, cat11: s3Cat11, cat12: s3Cat12, total: s3Total },
    total,
    productionVolume: prodVolume,
    status,
  };
});

// Scope 1 emission sources for the calculator
export const scope1Sources = [
  { id: 'process', label: 'Process Emissions', unit: 'tCO\u2082e', description: 'Chemical reactions in production processes (cracking, reforming, polymerization)' },
  { id: 'combustion', label: 'Stationary Combustion', unit: 'tCO\u2082e', description: 'Fuel burned in boilers, furnaces, turbines, heaters, incinerators' },
  { id: 'mobile', label: 'Mobile Combustion', unit: 'tCO\u2082e', description: 'Company-owned vehicles, forklifts, mobile equipment' },
  { id: 'fugitive', label: 'Fugitive Emissions', unit: 'tCO\u2082e', description: 'Leaks from equipment joints, seals, valves, and pipeline fittings' },
];

// Scope 2 emission sources
export const scope2Sources = [
  { id: 'electricity', label: 'Purchased Electricity', unit: 'tCO\u2082e', description: 'Grid electricity consumption across all facilities. EF: Thailand grid 0.4999 tCO\u2082e/MWh' },
  { id: 'steam', label: 'Purchased Steam', unit: 'tCO\u2082e', description: 'Steam purchased from third-party co-generation plants' },
  { id: 'cooling', label: 'Purchased Cooling', unit: 'tCO\u2082e', description: 'District cooling and chilled water purchased from external providers' },
];

// Scope 3 categories
export const scope3Categories = [
  { id: 'cat1', label: 'Cat 1: Purchased Goods & Services', unit: 'tCO\u2082e', description: 'Upstream emissions from production of purchased raw materials and services' },
  { id: 'cat2', label: 'Cat 2: Capital Goods', unit: 'tCO\u2082e', description: 'Emissions from production of capital equipment and infrastructure' },
  { id: 'cat3', label: 'Cat 3: Fuel & Energy Activities', unit: 'tCO\u2082e', description: 'Upstream emissions of purchased fuels and T&D losses not in Scope 1 or 2' },
  { id: 'cat4', label: 'Cat 4: Transportation & Distribution', unit: 'tCO\u2082e', description: 'Upstream transportation of purchased goods, materials, and fuels' },
  { id: 'cat5', label: 'Cat 5: Waste Generated', unit: 'tCO\u2082e', description: 'Third-party disposal and treatment of waste generated in operations' },
  { id: 'cat6', label: 'Cat 6: Business Travel', unit: 'tCO\u2082e', description: 'Employee flights, hotel stays, ground transportation for business' },
  { id: 'cat7', label: 'Cat 7: Employee Commuting', unit: 'tCO\u2082e', description: 'Employee transportation between homes and worksites' },
  { id: 'cat11', label: 'Cat 11: Use of Sold Products', unit: 'tCO\u2082e', description: 'End-use emissions from sold petrochemical and polymer products' },
  { id: 'cat12', label: 'Cat 12: End-of-Life Treatment', unit: 'tCO\u2082e', description: 'Emissions from waste disposal of sold products' },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function formatEmissions(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toFixed(0);
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}
