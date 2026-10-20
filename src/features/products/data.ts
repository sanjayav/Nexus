/*
 * Product carbon footprint & export-compliance demo data, per workspace.
 *
 * Tenant content (product names, sites, hotspots, factor sources, owners, CBAM
 * lines) is in the tenant's language. Enums are translated by key in
 * products.strings.ts.
 *
 * Units: PCF values are kgCO₂e per declared unit. CBAM specific embedded
 * emissions (SEE) are tCO₂e per tonne of good.
 *
 * lvyuan (FY2026) uses the 2024 national 电力碳足迹因子 0.5777 kgCO₂e/kWh for
 * product footprints. This is a different factor family from the 0.5703
 * 电力二氧化碳排放因子 used for organisational Scope 2 (README §8).
 */

export type WorkspaceId = 'lvyuan' | 'aeiforo'

export type Stage = 'raw' | 'manufacturing' | 'distribution' | 'use' | 'endOfLife'
export const STAGES: Stage[] = ['raw', 'manufacturing', 'distribution', 'use', 'endOfLife']

export type Boundary = 'cradleToGate' | 'cradleToGrave'
export type CertStage = 'none' | 'applied' | 'audit' | 'certified'
export const CERT_STAGES: CertStage[] = ['none', 'applied', 'audit', 'certified']

export type ProductKind = 'pv' | 'cell' | 'ess' | 'inverter' | 'electricity' | 'logistics'

/** National product carbon-footprint grid factor (电力碳足迹因子), 2024, kgCO₂e/kWh. */
export const CN_PCF_GRID_FACTOR = 0.5777

export interface Product {
  id: string
  kind: ProductKind
  name: string
  model: string
  site: string
  /** Declared / functional unit, e.g. kWp, kWh, kW, MWh, TEU-km. */
  declaredUnit: string
  /** Optional second unit shown alongside, e.g. per module. `factor` declared units per alt unit. */
  altUnit?: { label: string; factor: number }
  /** Baseline lifecycle breakdown, kgCO₂e per declared unit. Sum = PCF. */
  stages: Record<Stage, number>
  boundary: Boundary
  standards: string[]
  /** Share of the PCF computed from primary (site / supplier) data, %. */
  primaryShare: number
  factorSources: string[]
  /** Electricity used in the stage the what-if acts on. */
  electricity: { kwhPerUnit: number; baselineGreen: number; factor: number; stage: Stage }
  /** Aluminium content; omitted when the product has none. */
  aluminium?: { kgPerUnit: number; baselineRecycled: number }
  hotspots: { name: string; share: number }[]
  version: string
  date: string
  cert: CertStage
  certScheme: string
  euExport: boolean
  /** Display precision for this product's PCF. */
  decimals: number
}

export type PassportCategory = 'carbonFootprint' | 'dueDiligence' | 'composition' | 'recycled' | 'performance' | 'labelling'
export const PASSPORT_CATEGORIES: PassportCategory[] = [
  'carbonFootprint',
  'dueDiligence',
  'composition',
  'recycled',
  'performance',
  'labelling',
]
export type PassportStatus = 'done' | 'inProgress' | 'notStarted' | 'blocked'
export const PASSPORT_STATUSES: PassportStatus[] = ['done', 'inProgress', 'notStarted', 'blocked']

/** Item labels live in products.strings.ts under passport.items[id]. */
export interface PassportItem {
  id: string
  category: PassportCategory
  status: PassportStatus
  owner: string
  due: string
}

export type CbamBasis = 'actual' | 'default'
export type CbamVerification = 'verified' | 'inProgress' | 'pending'

export interface CbamLine {
  id: string
  /** Good as shipped, tenant language. */
  good: string
  /** CN code, illustrative only. */
  cnCode: string
  category: 'aluminium' | 'steel'
  installation: string
  /** Tonnes exported to the EU in 2026, including Q4 forecast. */
  tonnes: number
  actual?: { direct: number; indirect: number }
  /** EU default values (illustrative), tCO₂e/t. */
  defaults: { direct: number; indirect: number }
  basis: CbamBasis
  verification: CbamVerification
}

export interface ProductsData {
  products: Product[]
  /** null when the EU battery passport does not apply to the tenant. */
  passport: { products: string[]; items: PassportItem[] } | null
  /** null when the tenant has no CBAM goods. */
  cbam: { lines: CbamLine[]; defaultPrice: number } | null
}

export const PASSPORT_DEADLINE = '2027-02-18'
export const DUE_DILIGENCE_DEADLINE = '2027-08-18'
export const CBAM_MILESTONES = [
  { id: 'definitive', date: '2026-01-01' },
  { id: 'certificates', date: '2027-02-01' },
  { id: 'declaration', date: '2027-09-30' },
] as const

const LVYUAN_FACTORS = [
  '国家温室气体排放因子数据库（第二版，2026 年 3 月）',
  '电力碳足迹因子（2024 年全国平均）0.5777 kgCO₂e/kWh',
  '供应商一手数据（经核对的出厂碳足迹）',
  'ecoinvent 3.10（境外原材料，补充）',
]

export const PRODUCTS_DATA: Record<WorkspaceId, ProductsData> = {
  lvyuan: {
    products: [
      {
        id: 'ly-topcon',
        kind: 'pv',
        name: 'N 型 TOPCon 双玻光伏组件',
        model: 'LY-TN72-620',
        site: '绿源光伏科技（江苏盐城）',
        declaredUnit: 'kWp',
        altUnit: { label: '块（620 Wp）', factor: 0.62 },
        // 338.6 + 64.2 + 18.5 + 0 + 5.1 = 426.4
        stages: { raw: 338.6, manufacturing: 64.2, distribution: 18.5, use: 0, endOfLife: 5.1 },
        boundary: 'cradleToGrave',
        standards: ['GB/T 24067-2024', 'ISO 14067:2018'],
        primaryShare: 78,
        factorSources: LVYUAN_FACTORS,
        // Cell + module lines: 105 kWh/kWp, 20% green today → 48.5 kg of the 64.2 kg manufacturing stage.
        electricity: { kwhPerUnit: 105, baselineGreen: 20, factor: CN_PCF_GRID_FACTOR, stage: 'manufacturing' },
        // Frame 2.0 kg per 620 Wp module ≈ 3.2 kg/kWp.
        aluminium: { kgPerUnit: 3.2, baselineRecycled: 10 },
        hotspots: [
          { name: '多晶硅', share: 41 },
          { name: '光伏玻璃', share: 12 },
          { name: '铝边框', share: 11 },
          { name: '电池片及组件制造用电', share: 10 },
          { name: '银浆', share: 6 },
        ],
        version: 'v3.1',
        date: '2026-08-28',
        cert: 'certified',
        certScheme: 'CNCA 产品碳足迹标识认证（光伏组件）',
        euExport: true,
        decimals: 1,
      },
      {
        id: 'ly-cell314',
        kind: 'cell',
        name: '314Ah 磷酸铁锂储能电芯',
        model: 'LY-LFP314',
        site: '绿源储能（广东肇庆）',
        declaredUnit: 'kWh',
        // 51.8 + 20.6 = 72.4
        stages: { raw: 51.8, manufacturing: 20.6, distribution: 0, use: 0, endOfLife: 0 },
        boundary: 'cradleToGate',
        standards: ['GB/T 24067-2024', 'ISO 14067:2018'],
        primaryShare: 71,
        factorSources: LVYUAN_FACTORS,
        // Coating, drying, formation: 45 kWh per kWh of cell, 25% green → 19.5 kg of 20.6 kg.
        electricity: { kwhPerUnit: 45, baselineGreen: 25, factor: CN_PCF_GRID_FACTOR, stage: 'manufacturing' },
        aluminium: { kgPerUnit: 0.75, baselineRecycled: 0 },
        hotspots: [
          { name: '磷酸铁锂正极材料', share: 32 },
          { name: '电芯制造用电（涂布、化成）', share: 27 },
          { name: '铝壳及铝箔', share: 16 },
          { name: '石墨负极', share: 11 },
          { name: '电解液', share: 6 },
        ],
        version: 'v2.0',
        date: '2026-09-15',
        cert: 'audit',
        certScheme: 'CNCA 产品碳足迹标识认证（储能锂电池）',
        euExport: true,
        decimals: 1,
      },
      {
        id: 'ly-ess5',
        kind: 'ess',
        name: '5 MWh 液冷储能系统',
        model: 'LY-ESS-5015L',
        site: '绿源储能（广东肇庆）',
        declaredUnit: 'kWh',
        altUnit: { label: '套（5,015 kWh）', factor: 5015 },
        // 96.2 + 4.8 + 9.7 + 2.9 + 4.2 = 117.8
        stages: { raw: 96.2, manufacturing: 4.8, distribution: 9.7, use: 2.9, endOfLife: 4.2 },
        boundary: 'cradleToGrave',
        standards: ['GB/T 24067-2024', 'ISO 14067:2018'],
        primaryShare: 64,
        factorSources: LVYUAN_FACTORS,
        // System integration only; cells enter as purchased components at their own PCF.
        electricity: { kwhPerUnit: 6, baselineGreen: 25, factor: CN_PCF_GRID_FACTOR, stage: 'manufacturing' },
        aluminium: { kgPerUnit: 0.9, baselineRecycled: 10 },
        hotspots: [
          { name: '储能电芯（314Ah）', share: 61 },
          { name: '钢制集装箱及电池架', share: 9 },
          { name: '液冷系统（铝冷板）', share: 8 },
          { name: '海运至欧盟', share: 7 },
          { name: '铜排及线缆', share: 4 },
        ],
        version: 'v1.2',
        date: '2026-07-30',
        cert: 'applied',
        certScheme: 'CNCA 产品碳足迹标识认证（储能锂电池）',
        euExport: true,
        decimals: 1,
      },
      {
        id: 'ly-inverter',
        kind: 'inverter',
        name: '组串式光伏逆变器',
        model: 'LY-SG320HX',
        site: '绿源智造（安徽合肥）',
        declaredUnit: 'kW',
        altUnit: { label: '台（320 kW）', factor: 320 },
        // 9.4 + 2.2 = 11.6
        stages: { raw: 9.4, manufacturing: 2.2, distribution: 0, use: 0, endOfLife: 0 },
        boundary: 'cradleToGate',
        standards: ['GB/T 24067-2024'],
        primaryShare: 52,
        factorSources: LVYUAN_FACTORS.slice(0, 3),
        electricity: { kwhPerUnit: 3.2, baselineGreen: 20, factor: CN_PCF_GRID_FACTOR, stage: 'manufacturing' },
        // Die-cast housing and heatsink.
        aluminium: { kgPerUnit: 0.3, baselineRecycled: 15 },
        hotspots: [
          { name: '压铸铝外壳及散热器', share: 41 },
          { name: 'PCB 及功率器件', share: 28 },
          { name: '组装及测试用电', share: 13 },
          { name: '铜材（电感、线缆）', share: 12 },
        ],
        version: 'v1.0',
        date: '2026-06-20',
        cert: 'none',
        certScheme: '—',
        euExport: true,
        decimals: 2,
      },
    ],
    passport: {
      products: ['5 MWh 液冷储能系统（LY-ESS-5015L）', '314Ah 磷酸铁锂储能电芯（LY-LFP314）'],
      items: [
        { id: 'pcfBase', category: 'carbonFootprint', status: 'done', owner: '王敏 · 可持续发展办公室', due: '2026-09-30' },
        { id: 'cfDeclaration', category: 'carbonFootprint', status: 'blocked', owner: '王敏 · 可持续发展办公室', due: '2027-01-31' },
        { id: 'cfClass', category: 'carbonFootprint', status: 'blocked', owner: '王敏 · 可持续发展办公室', due: '2027-01-31' },
        { id: 'ddPolicy', category: 'dueDiligence', status: 'done', owner: '刘洋 · 采购部', due: '2026-06-30' },
        { id: 'ddMapping', category: 'dueDiligence', status: 'inProgress', owner: '刘洋 · 采购部', due: '2027-03-31' },
        { id: 'ddAudit', category: 'dueDiligence', status: 'notStarted', owner: '刘洋 · 采购部', due: '2027-06-30' },
        { id: 'chemistry', category: 'composition', status: 'done', owner: '储能研究院 · 黄磊', due: '2026-08-31' },
        { id: 'hazardous', category: 'composition', status: 'done', owner: '质量部 · 赵琳', due: '2026-08-31' },
        { id: 'criticalRaw', category: 'composition', status: 'inProgress', owner: '储能研究院 · 黄磊', due: '2026-12-15' },
        { id: 'recycledShare', category: 'recycled', status: 'inProgress', owner: '刘洋 · 采购部', due: '2026-12-31' },
        { id: 'recycledMethod', category: 'recycled', status: 'notStarted', owner: '王敏 · 可持续发展办公室', due: '2027-01-15' },
        { id: 'capacity', category: 'performance', status: 'done', owner: '储能研究院 · 黄磊', due: '2026-07-31' },
        { id: 'lifetime', category: 'performance', status: 'done', owner: '储能研究院 · 黄磊', due: '2026-07-31' },
        { id: 'efficiency', category: 'performance', status: 'inProgress', owner: '储能研究院 · 黄磊', due: '2026-11-30' },
        { id: 'qrCarrier', category: 'labelling', status: 'inProgress', owner: '数字化中心 · 孙浩', due: '2026-12-31' },
        { id: 'ceMarking', category: 'labelling', status: 'inProgress', owner: '质量部 · 赵琳', due: '2027-01-15' },
        { id: 'collection', category: 'labelling', status: 'done', owner: '质量部 · 赵琳', due: '2026-09-30' },
      ],
    },
    cbam: {
      // EU carbon price assumption, €/tCO₂e. Editable on the page.
      defaultPrice: 75,
      lines: [
        {
          id: 'frame',
          good: '光伏组件铝边框（单独发运至欧盟安装商）',
          cnCode: '7604 29 10',
          category: 'aluminium',
          installation: '绿源新材料（四川宜宾）',
          tonnes: 1860,
          actual: { direct: 1.92, indirect: 8.4 },
          defaults: { direct: 3.1, indirect: 14.6 },
          basis: 'actual',
          verification: 'verified',
        },
        {
          id: 'mounting',
          good: '光伏支架钢结构（热镀锌）',
          cnCode: '7308 90 98',
          category: 'steel',
          installation: '绿源智造（安徽合肥）',
          tonnes: 4250,
          actual: { direct: 2.05, indirect: 0.36 },
          defaults: { direct: 2.71, indirect: 0.48 },
          basis: 'actual',
          verification: 'inProgress',
        },
        {
          id: 'fasteners',
          good: '储能系统安装用钢制紧固件',
          cnCode: '7318 15 88',
          category: 'steel',
          installation: '外购（宁波供应商，数据待提供）',
          tonnes: 320,
          defaults: { direct: 2.95, indirect: 0.52 },
          basis: 'default',
          verification: 'pending',
        },
        {
          id: 'heatsink',
          good: '逆变器铝制散热器（备件）',
          cnCode: '7616 99 90',
          category: 'aluminium',
          installation: '绿源智造（安徽合肥）',
          tonnes: 85,
          actual: { direct: 1.74, indirect: 9.1 },
          defaults: { direct: 3.1, indirect: 14.6 },
          basis: 'actual',
          verification: 'verified',
        },
      ],
    },
  },

  aeiforo: {
    products: [
      {
        id: 'ae-solar',
        kind: 'electricity',
        name: 'Grid-supplied solar electricity',
        model: 'Rajasthan PV portfolio',
        site: 'Rajasthan, India',
        declaredUnit: 'MWh',
        // 28.1 + 3.4 + 1.9 + 2.2 + 1.0 = 36.6
        stages: { raw: 28.1, manufacturing: 3.4, distribution: 1.9, use: 2.2, endOfLife: 1.0 },
        boundary: 'cradleToGrave',
        standards: ['ISO 14067:2018'],
        primaryShare: 68,
        factorSources: ['ecoinvent 3.10', 'Module supplier EPDs', 'Plant SCADA generation data (FY2025)'],
        // Upstream module manufacturing electricity per MWh of lifetime output (in the raw-material stage).
        electricity: { kwhPerUnit: 7, baselineGreen: 10, factor: CN_PCF_GRID_FACTOR, stage: 'raw' },
        aluminium: { kgPerUnit: 0.056, baselineRecycled: 5 },
        hotspots: [
          { name: 'PV modules (polysilicon, glass)', share: 62 },
          { name: 'Mounting structures (steel)', share: 14 },
          { name: 'Inverters and balance of system', share: 9 },
          { name: 'Operation and maintenance', share: 6 },
        ],
        version: 'v2.0',
        date: '2025-10-30',
        cert: 'certified',
        certScheme: 'ISO 14067 third-party verification',
        euExport: false,
        decimals: 1,
      },
      {
        id: 'ae-teu',
        kind: 'logistics',
        name: 'Intermodal container transport',
        model: 'Sohar port – rail – road corridor',
        site: 'Sohar, Oman',
        declaredUnit: 'TEU-km',
        // 0.071 + 0.038 + 0.289 + 0 + 0.014 = 0.412
        stages: { raw: 0.071, manufacturing: 0.038, distribution: 0.289, use: 0, endOfLife: 0.014 },
        boundary: 'cradleToGrave',
        standards: ['ISO 14067:2018', 'ISO 14083:2023'],
        primaryShare: 74,
        factorSources: ['GLEC Framework v3', 'ecoinvent 3.10', 'Fleet telematics fuel data (FY2025)'],
        // Terminal handling electricity (cranes, reefer plugs); lifecycle grid factor to be verified.
        electricity: { kwhPerUnit: 0.045, baselineGreen: 15, factor: 0.62, stage: 'manufacturing' },
        hotspots: [
          { name: 'Line-haul diesel (road)', share: 46 },
          { name: 'Rail traction', share: 18 },
          { name: 'Fuel upstream (well-to-tank)', share: 17 },
          { name: 'Terminal handling', share: 9 },
        ],
        version: 'v1.1',
        date: '2025-11-12',
        cert: 'applied',
        certScheme: 'ISO 14067 third-party verification',
        euExport: false,
        decimals: 3,
      },
    ],
    passport: null,
    cbam: null,
  },
}
