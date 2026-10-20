/*
 * Carbon assets demo data, per workspace: green-power instruments, carbon
 * credits and compliance-market context.
 *
 * Reconciliation (lvyuan, FY2026, see seed.cn.ts header):
 *   grid electricity      1,720,000 MWh = Scope 2 location 980,916 / 0.5703
 *   instruments procured    620,000 MWh = 绿电交易 345,000 + 绿证 275,000
 *   Scope 2 market        627,330 = (1,720,000 − 620,000) × 0.5703
 *   self-generated RE       430,000 MWh (not an instrument; outside grid purchases)
 *
 * aeiforo (FY2025) uses its region grid factor 0.716 tCO₂e/MWh:
 *   location 8,320 / 0.716 ≈ 11,620 MWh grid; I-RECs 601 MWh
 *   market 8,320 − 601 × 0.716 ≈ 7,890 (seed scope2Market)
 *
 * Tenant content (counterparties, sites, projects, notes) is in the tenant's language.
 */

export type WorkspaceId = 'lvyuan' | 'aeiforo'

export type InstrumentType = 'greenTrade' | 'gec' | 'irec' | 'self'
export type ContractStatus = 'signed' | 'delivered' | 'retired'
export const CONTRACT_STATUSES: ContractStatus[] = ['signed', 'delivered', 'retired']

export interface Contract {
  id: string
  type: InstrumentType
  counterparty: string
  site: string
  mwh: number
  start: string
  end: string
  certIds: string
  status: ContractStatus
  /** Added by the user in this workspace (removable). */
  userAdded?: boolean
}

export type CreditStandard = 'CCER' | 'VCS' | 'GS'

export interface Credit {
  id: string
  standard: CreditStandard
  project: string
  projectType: string
  vintage: number
  /** tCO₂e acquired. */
  acquired: number
  /** tCO₂e retired (注销). */
  retired: number
  retiredForDisclosure: boolean
  purpose?: string
  registry: string
}

export type EtsSectorId = 'chemicals' | 'petrochemicals' | 'aviation' | 'paper'

export type EtsContext =
  | {
      kind: 'cn'
      /** Whether any group entity is a 重点排放单位 today. */
      covered: boolean
      watchlist: { id: EtsSectorId; relevant: boolean; note: string }[]
      /** Illustrative "if covered" case. */
      scenario: { entity: string; emissions: number; allowances: number; price: number }
    }
  | { kind: 'none'; internalPrice: number }

export interface CarbonAssetsData {
  instrumentTypes: InstrumentType[]
  sites: string[]
  contracts: Contract[]
  credits: Credit[]
  ets: EtsContext
}

const LV_SITES = [
  '绿源光伏科技（江苏盐城）',
  '绿源风电（内蒙古乌兰察布）',
  '绿源储能（广东肇庆）',
  '绿源智造（安徽合肥）',
  '绿源新材料（四川宜宾）',
]

export const CARBON_ASSETS_DATA: Record<WorkspaceId, CarbonAssetsData> = {
  lvyuan: {
    instrumentTypes: ['greenTrade', 'gec', 'self'],
    sites: LV_SITES,
    contracts: [
      // 绿电交易: 120,000 + 95,000 + 110,000 + 20,000 = 345,000
      {
        id: 'gt-js-01',
        type: 'greenTrade',
        counterparty: '江苏电力交易中心（省内绿电交易）',
        site: LV_SITES[0],
        mwh: 120000,
        start: '2026-01-01',
        end: '2026-06-30',
        certIds: 'GEC-2026-32-0001850001 – 0001970000',
        status: 'retired',
      },
      {
        id: 'gt-js-02',
        type: 'greenTrade',
        counterparty: '江苏电力交易中心（省内绿电交易）',
        site: LV_SITES[0],
        mwh: 95000,
        start: '2026-07-01',
        end: '2026-12-31',
        certIds: 'GEC-2026-32-0004120001 – 0004215000',
        status: 'signed',
      },
      {
        id: 'gt-gd-01',
        type: 'greenTrade',
        counterparty: '广州电力交易中心（南方区域绿电交易）',
        site: LV_SITES[2],
        mwh: 110000,
        start: '2026-01-01',
        end: '2026-12-31',
        certIds: 'GEC-2026-44-0002630001 – 0002740000',
        status: 'delivered',
      },
      {
        id: 'gt-ah-01',
        type: 'greenTrade',
        counterparty: '北京电力交易中心（省间绿电交易）',
        site: LV_SITES[3],
        mwh: 20000,
        start: '2026-10-01',
        end: '2026-12-31',
        certIds: 'GEC-2026-34-0005510001 – 0005530000',
        status: 'signed',
      },
      // 绿证（GEC）: 85,000 + 130,000 + 60,000 = 275,000
      {
        id: 'gec-ah-01',
        type: 'gec',
        counterparty: '北京电力交易中心（绿证交易平台）',
        site: LV_SITES[3],
        mwh: 85000,
        start: '2026-01-01',
        end: '2026-09-30',
        certIds: 'GEC-2026-65-0108800001 – 0108885000',
        status: 'retired',
      },
      {
        id: 'gec-sc-01',
        type: 'gec',
        counterparty: '北京电力交易中心（绿证交易平台）',
        site: LV_SITES[4],
        mwh: 130000,
        start: '2026-01-01',
        end: '2026-12-31',
        certIds: 'GEC-2026-51-0003300001 – 0003430000',
        status: 'delivered',
      },
      {
        id: 'gec-nm-01',
        type: 'gec',
        counterparty: '广州电力交易中心（绿证交易平台）',
        site: LV_SITES[1],
        mwh: 60000,
        start: '2026-04-01',
        end: '2026-12-31',
        certIds: 'GEC-2026-15-0007720001 – 0007780000',
        status: 'signed',
      },
      // 自建自用光伏: 160,000 + 110,000 + 80,000 + 50,000 + 30,000 = 430,000
      {
        id: 'self-yc',
        type: 'self',
        counterparty: '盐城基地屋顶及车棚光伏（186 MW）',
        site: LV_SITES[0],
        mwh: 160000,
        start: '2026-01-01',
        end: '2026-12-31',
        certIds: '—',
        status: 'delivered',
      },
      {
        id: 'self-hf',
        type: 'self',
        counterparty: '合肥基地屋顶光伏（128 MW）',
        site: LV_SITES[3],
        mwh: 110000,
        start: '2026-01-01',
        end: '2026-12-31',
        certIds: '—',
        status: 'delivered',
      },
      {
        id: 'self-zq',
        type: 'self',
        counterparty: '肇庆基地屋顶光伏（92 MW）',
        site: LV_SITES[2],
        mwh: 80000,
        start: '2026-01-01',
        end: '2026-12-31',
        certIds: '—',
        status: 'delivered',
      },
      {
        id: 'self-yb',
        type: 'self',
        counterparty: '宜宾基地屋顶光伏（61 MW）',
        site: LV_SITES[4],
        mwh: 50000,
        start: '2026-01-01',
        end: '2026-12-31',
        certIds: '—',
        status: 'delivered',
      },
      {
        id: 'self-wlcb',
        type: 'self',
        counterparty: '乌兰察布运维中心配套光伏（22 MW）',
        site: LV_SITES[1],
        mwh: 30000,
        start: '2026-01-01',
        end: '2026-12-31',
        certIds: '—',
        status: 'delivered',
      },
    ],
    credits: [
      {
        id: 'ccer-wind',
        standard: 'CCER',
        project: '江苏盐城并网海上风力发电项目',
        projectType: '并网海上风力发电',
        vintage: 2024,
        acquired: 35000,
        retired: 10000,
        retiredForDisclosure: true,
        purpose: '2026 年度自愿抵销（会展及商务差旅）',
        registry: '全国温室气体自愿减排注册登记系统',
      },
      {
        id: 'ccer-forest',
        standard: 'CCER',
        project: '四川宜宾造林碳汇项目',
        projectType: '造林碳汇',
        vintage: 2025,
        acquired: 18000,
        retired: 0,
        retiredForDisclosure: false,
        registry: '全国温室气体自愿减排注册登记系统',
      },
      {
        id: 'vcs-wind',
        standard: 'VCS',
        project: '内蒙古并网风电项目',
        projectType: '并网风电',
        vintage: 2021,
        acquired: 6000,
        retired: 6000,
        retiredForDisclosure: true,
        purpose: '欧盟客户储能项目碳中和交付',
        registry: 'Verra Registry',
      },
    ],
    ets: {
      kind: 'cn',
      covered: false,
      watchlist: [
        { id: 'chemicals', relevant: true, note: '绿源新材料（四川宜宾）正极材料及电解液产线可能落入化工行业纳入范围，待核实。' },
        { id: 'petrochemicals', relevant: false, note: '不涉及。' },
        { id: 'aviation', relevant: false, note: '不涉及（仅商务差旅，计入范围3）。' },
        { id: 'paper', relevant: false, note: '不涉及（包装材料外购）。' },
      ],
      // Illustrative: if the Yibin materials base were covered under chemicals.
      scenario: { entity: '绿源新材料（四川宜宾）', emissions: 68400, allowances: 64000, price: 90 },
    },
  },

  aeiforo: {
    instrumentTypes: ['irec', 'self'],
    sites: ['Sohar Logistics Center', 'Muscat HQ', 'Duqm Port'],
    contracts: [
      // I-RECs: 360 + 241 = 601 MWh
      {
        id: 'irec-01',
        type: 'irec',
        counterparty: 'I-REC Registry · Oman solar issuer',
        site: 'Sohar Logistics Center',
        mwh: 360,
        start: '2025-01-01',
        end: '2025-06-30',
        certIds: 'IREC-OM-2025-000412 – 000771',
        status: 'retired',
      },
      {
        id: 'irec-02',
        type: 'irec',
        counterparty: 'I-REC Registry · Oman solar issuer',
        site: 'Muscat HQ',
        mwh: 241,
        start: '2025-07-01',
        end: '2025-12-31',
        certIds: 'IREC-OM-2025-001208 – 001448',
        status: 'delivered',
      },
      {
        id: 'self-sohar',
        type: 'self',
        counterparty: 'Sohar 15 MW solar (self-consumed share)',
        site: 'Sohar Logistics Center',
        mwh: 3470,
        start: '2025-01-01',
        end: '2025-12-31',
        certIds: '—',
        status: 'delivered',
      },
    ],
    credits: [
      {
        id: 'gs-pumps',
        standard: 'GS',
        project: 'Solar water pumping, Rajasthan',
        projectType: 'Renewable energy',
        vintage: 2023,
        acquired: 2500,
        retired: 1200,
        retiredForDisclosure: true,
        purpose: 'Voluntary offset of FY2025 business travel',
        registry: 'Gold Standard Registry',
      },
      {
        id: 'vcs-mangrove',
        standard: 'VCS',
        project: 'Mangrove restoration, Gujarat',
        projectType: 'Blue carbon',
        vintage: 2022,
        acquired: 4000,
        retired: 0,
        retiredForDisclosure: false,
        registry: 'Verra Registry',
      },
    ],
    ets: { kind: 'none', internalPrice: 50 },
  },
}

/** Instruments that reduce market-based Scope 2. Self-generation is not an instrument. */
export const isInstrument = (c: Contract) => c.type !== 'self'
