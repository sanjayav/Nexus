import type { L10n } from '@/config/regions'

/*
 * Supplier demo data per workspace. Immutable: invitations, status changes and
 * review events live in ./store.ts as overrides.
 *
 * All companies are fictional. Tenant text (names, categories, products, notes)
 * is in the tenant's language: Simplified Chinese for lvyuan, English for aeiforo.
 *
 * lvyuan coherence (FY2026, see src/data/seed.cn.ts):
 * - Scope 3 Category 1 = 3,265,000 tCO₂e. The 15 tier-1 Category 1 suppliers
 *   below carry 2,902,000 tCO₂e (88.9%); the remaining 363,000 tCO₂e is the
 *   long tail, estimated spend-based.
 * - Logistics suppliers sit in Category 4 (upstream transportation, 124,800 total).
 * - Tier-2 suppliers (raw materials) are already inside their tier-1 customer's
 *   figure, so they carry no spend and are excluded from Category 1 totals.
 * aeiforo: Category 1 = 12,200 tCO₂e (seed.global.ts); listed suppliers carry 12,000.
 */

export type DemoWorkspace = 'lvyuan' | 'aeiforo'
export type Tier = 1 | 2
export type DataStatus = 'notInvited' | 'invited' | 'filling' | 'submitted' | 'verified'
export type Risk = 'high' | 'medium' | 'low'
export type ReasonCode = 'origin' | 'highEnergy' | 'noTarget' | 'conflictMinerals' | 'cbam' | 'safety'
export type TemplateId = 'esg' | 'pcf' | 'minerals'
export type Channel = 'email' | 'sms' | 'wecom' | 'teams'

export interface SubmittedData {
  product: string
  /** Product carbon footprint value and unit, e.g. 18.6 kgCO₂e/kg. */
  pcf?: { value: number; unit: string; standard: string }
  greenPower?: number
  target?: string
  period: string
}

export interface Supplier {
  id: string
  name: string
  tier: Tier
  category: string
  region: string
  /** Share of procurement spend, %. Null for tier-2 (not purchased directly). */
  spendShare: number | null
  /** Attributed emissions estimate, tCO₂e. */
  emissions: number
  /** GHG Protocol Scope 3 category this supplier rolls up into; null when counted under a tier-1 supplier. */
  scope3Cat: 1 | 4 | null
  status: DataStatus
  pcf: boolean
  esgScore: number | null
  risk: Risk
  reasons: ReasonCode[]
  contact: string
  invitedAt?: string
  submittedAt?: string
  verifiedAt?: string
  channel?: Channel
  submitted?: SubmittedData
}

export interface Template {
  id: TemplateId
  name: L10n
  description: L10n
}

export interface SuppliersDemo {
  /** Scope 3 Category 1 total from the tenant inventory, tCO₂e. */
  cat1Total: number
  /** Label for the unlisted remainder of Category 1 (tenant language). */
  longTailLabel: string
  channels: Channel[]
  suppliers: Supplier[]
  /** Invitation message in the tenant language. Placeholders: {supplier} {company} {template} {deadline}. */
  message: string
  company: string
  /** Exports batteries to the EU: show the EU Battery Regulation due-diligence callout. */
  euBattery: boolean
}

export const TEMPLATES: Template[] = [
  {
    id: 'esg',
    name: { en: 'Supplier ESG baseline questionnaire', zh: '供应商 ESG 基础问卷' },
    description: {
      en: 'Policies, environmental management, labour practices, business ethics.',
      zh: '政策制度、环境管理、劳工实践与商业道德。',
    },
  },
  {
    id: 'pcf',
    name: { en: 'Product carbon footprint (PCF, per PACT data model)', zh: '产品碳足迹数据（PCF，参照 PACT 数据模型）' },
    description: {
      en: 'Cradle-to-gate footprint per declared unit, primary data share, green-power share.',
      zh: '按声明单位填报“摇篮到大门”碳足迹、初级数据占比与绿电占比。',
    },
  },
  {
    id: 'minerals',
    name: {
      en: 'Critical raw material due diligence (Co, Li, Ni, natural graphite, per EU Battery Regulation)',
      zh: '关键原材料尽职调查（钴、锂、镍、天然石墨，参照欧盟电池法规）',
    },
    description: {
      en: 'Smelter / refiner list, country of origin, chain-of-custody documents.',
      zh: '冶炼厂或精炼厂清单、原产国及产销监管链文件。',
    },
  },
]

const lvyuan: SuppliersDemo = {
  cat1Total: 3_265_000,
  longTailLabel: '其他长尾供应商',
  channels: ['email', 'sms', 'wecom'],
  company: '绿源控股集团',
  euBattery: true,
  message:
    '{supplier}：您好！\n\n为落实供应链碳管理与欧盟客户的数据要求，{company}邀请贵司通过 Nexus 供应商门户填报《{template}》。请于 {deadline} 前完成填报并上传佐证材料。\n\n如有疑问，请联系采购部刘洋。感谢支持！',
  suppliers: [
    {
      id: 'lv-s01',
      name: '青川硅业科技有限公司',
      tier: 1,
      category: '多晶硅/硅片',
      region: '四川',
      spendShare: 13.6,
      emissions: 512_000,
      scope3Cat: 1,
      status: 'verified',
      pcf: true,
      esgScore: 74,
      risk: 'medium',
      reasons: ['highEnergy'],
      contact: '赵磊 · 可持续发展经理',
      invitedAt: '2026-05-12',
      submittedAt: '2026-06-20',
      verifiedAt: '2026-07-08',
      channel: 'wecom',
      submitted: {
        product: 'N 型多晶硅（致密料）',
        pcf: { value: 18.6, unit: 'kgCO₂e/kg', standard: 'GB/T 24067-2024' },
        greenPower: 62,
        target: '2030 年单位产品碳排放较 2023 年下降 35%',
        period: '2025 年度',
      },
    },
    {
      id: 'lv-s02',
      name: '嘉曜晶硅材料有限公司',
      tier: 1,
      category: '多晶硅/硅片',
      region: '内蒙古',
      spendShare: 9.1,
      emissions: 386_000,
      scope3Cat: 1,
      status: 'submitted',
      pcf: true,
      esgScore: 61,
      risk: 'high',
      reasons: ['highEnergy', 'origin'],
      contact: '孙婷 · EHS 主管',
      invitedAt: '2026-05-12',
      submittedAt: '2026-09-28',
      channel: 'email',
      submitted: {
        product: 'P 型单晶硅片 182 mm',
        pcf: { value: 0.92, unit: 'kgCO₂e/片', standard: 'ISO 14067:2018' },
        greenPower: 18,
        period: '2025 年度',
      },
    },
    {
      id: 'lv-s03',
      name: '衡远电芯科技有限公司',
      tier: 1,
      category: '电芯',
      region: '湖北',
      spendShare: 12.4,
      emissions: 318_000,
      scope3Cat: 1,
      status: 'submitted',
      pcf: true,
      esgScore: 68,
      risk: 'medium',
      reasons: ['conflictMinerals'],
      contact: '钱明 · 质量与合规部',
      invitedAt: '2026-05-15',
      submittedAt: '2026-10-09',
      channel: 'wecom',
      submitted: {
        product: '磷酸铁锂储能电芯 314 Ah',
        pcf: { value: 72.4, unit: 'kgCO₂e/kWh', standard: 'GB/T 24067-2024' },
        greenPower: 35,
        target: '2028 年实现主要基地 100% 绿电',
        period: '2025 年度',
      },
    },
    {
      id: 'lv-s04',
      name: '澜岳新能源电池有限公司',
      tier: 1,
      category: '电芯',
      region: '江西',
      spendShare: 7.8,
      emissions: 204_000,
      scope3Cat: 1,
      status: 'filling',
      pcf: false,
      esgScore: 55,
      risk: 'high',
      reasons: ['conflictMinerals', 'noTarget'],
      contact: '周凯 · 采购对接',
      invitedAt: '2026-08-20',
      channel: 'sms',
    },
    {
      id: 'lv-s05',
      name: '曜川锂电材料有限公司',
      tier: 1,
      category: '正极材料',
      region: '贵州',
      spendShare: 6.9,
      emissions: 251_000,
      scope3Cat: 1,
      status: 'invited',
      pcf: false,
      esgScore: 52,
      risk: 'high',
      reasons: ['conflictMinerals', 'origin'],
      contact: '吴昊 · 销售经理',
      invitedAt: '2026-09-25',
      channel: 'email',
    },
    {
      id: 'lv-s06',
      name: '森拓正极材料有限公司',
      tier: 1,
      category: '正极材料',
      region: '湖南',
      spendShare: 4.7,
      emissions: 176_000,
      scope3Cat: 1,
      status: 'notInvited',
      pcf: false,
      esgScore: 47,
      risk: 'high',
      reasons: ['conflictMinerals', 'noTarget'],
      contact: '郑芳 · 客户服务',
    },
    {
      id: 'lv-s07',
      name: '墨岭碳材料有限公司',
      tier: 1,
      category: '负极材料',
      region: '内蒙古',
      spendShare: 3.2,
      emissions: 148_000,
      scope3Cat: 1,
      status: 'invited',
      pcf: false,
      esgScore: 50,
      risk: 'high',
      reasons: ['origin', 'highEnergy'],
      contact: '冯涛 · 技术部',
      invitedAt: '2026-10-08',
      channel: 'wecom',
    },
    {
      id: 'lv-s08',
      name: '汇澄电解液有限公司',
      tier: 1,
      category: '电解液',
      region: '江苏',
      spendShare: 2.1,
      emissions: 69_000,
      scope3Cat: 1,
      status: 'submitted',
      pcf: true,
      esgScore: 66,
      risk: 'low',
      reasons: [],
      contact: '陈曦 · 可持续发展专员',
      invitedAt: '2026-06-03',
      submittedAt: '2026-07-30',
      channel: 'email',
      submitted: {
        product: '六氟磷酸锂电解液',
        pcf: { value: 4.1, unit: 'kgCO₂e/kg', standard: 'ISO 14067:2018' },
        greenPower: 41,
        target: '2027 年完成 SBTi 目标提交',
        period: '2025 年度',
      },
    },
    {
      id: 'lv-s09',
      name: '晶澈光伏玻璃有限公司',
      tier: 1,
      category: '光伏玻璃',
      region: '安徽',
      spendShare: 5.3,
      emissions: 162_000,
      scope3Cat: 1,
      status: 'verified',
      pcf: true,
      esgScore: 71,
      risk: 'medium',
      reasons: ['highEnergy'],
      contact: '褚静 · 能源管理部',
      invitedAt: '2026-05-12',
      submittedAt: '2026-06-28',
      verifiedAt: '2026-08-15',
      channel: 'wecom',
      submitted: {
        product: '3.2 mm 镀膜光伏玻璃',
        pcf: { value: 12.8, unit: 'kgCO₂e/m²', standard: 'GB/T 24067-2024' },
        greenPower: 22,
        target: '2030 年窑炉天然气替代率 50%',
        period: '2025 年度',
      },
    },
    {
      id: 'lv-s10',
      name: '皓泽玻璃科技有限公司',
      tier: 1,
      category: '光伏玻璃',
      region: '广西',
      spendShare: 3.1,
      emissions: 98_000,
      scope3Cat: 1,
      status: 'notInvited',
      pcf: false,
      esgScore: 58,
      risk: 'medium',
      reasons: ['noTarget'],
      contact: '卫强 · 销售部',
    },
    {
      id: 'lv-s11',
      name: '铝格精密型材有限公司',
      tier: 1,
      category: '铝边框',
      region: '山东',
      spendShare: 6.2,
      emissions: 236_000,
      scope3Cat: 1,
      status: 'filling',
      pcf: false,
      esgScore: 54,
      risk: 'high',
      reasons: ['highEnergy', 'cbam'],
      contact: '蒋涛 · 外贸合规',
      invitedAt: '2026-07-14',
      channel: 'email',
    },
    {
      id: 'lv-s12',
      name: '镕川铝业有限公司',
      tier: 1,
      category: '铝边框',
      region: '云南',
      spendShare: 2.6,
      emissions: 92_000,
      scope3Cat: 1,
      status: 'invited',
      pcf: false,
      esgScore: 63,
      risk: 'medium',
      reasons: ['cbam'],
      contact: '沈丽 · 市场部',
      invitedAt: '2026-10-12',
      channel: 'wecom',
    },
    {
      id: 'lv-s13',
      name: '钢筑新能源支架有限公司',
      tier: 1,
      category: '光伏支架钢材',
      region: '河北',
      spendShare: 4.4,
      emissions: 158_000,
      scope3Cat: 1,
      status: 'notInvited',
      pcf: false,
      esgScore: 49,
      risk: 'high',
      reasons: ['highEnergy', 'cbam', 'noTarget'],
      contact: '韩冰 · 销售部',
    },
    {
      id: 'lv-s14',
      name: '恒岱钢构科技有限公司',
      tier: 1,
      category: '光伏支架钢材',
      region: '江苏',
      spendShare: 1.9,
      emissions: 54_000,
      scope3Cat: 1,
      status: 'submitted',
      pcf: true,
      esgScore: 62,
      risk: 'medium',
      reasons: ['cbam'],
      contact: '杨帆 · 质量部',
      invitedAt: '2026-06-10',
      submittedAt: '2026-09-02',
      channel: 'email',
      submitted: {
        product: '热浸镀锌光伏支架',
        pcf: { value: 2.3, unit: 'kgCO₂e/kg', standard: 'ISO 14067:2018' },
        greenPower: 15,
        period: '2025 年度',
      },
    },
    {
      id: 'lv-s15',
      name: '启衡电力电子有限公司',
      tier: 1,
      category: '逆变器',
      region: '广东',
      spendShare: 3.4,
      emissions: 38_000,
      scope3Cat: 1,
      status: 'verified',
      pcf: true,
      esgScore: 77,
      risk: 'low',
      reasons: [],
      contact: '朱琳 · ESG 办公室',
      invitedAt: '2026-05-20',
      submittedAt: '2026-06-18',
      verifiedAt: '2026-07-22',
      channel: 'email',
      submitted: {
        product: '组串式逆变器 110 kW',
        pcf: { value: 410, unit: 'kgCO₂e/台', standard: 'ISO 14067:2018' },
        greenPower: 48,
        target: '2030 年运营碳中和',
        period: '2025 年度',
      },
    },
    {
      id: 'lv-s16',
      name: '远舟供应链物流有限公司',
      tier: 1,
      category: '物流',
      region: '江苏',
      spendShare: 2.4,
      emissions: 61_000,
      scope3Cat: 4,
      status: 'submitted',
      pcf: false,
      esgScore: 60,
      risk: 'low',
      reasons: [],
      contact: '秦峰 · 运营部',
      invitedAt: '2026-06-01',
      submittedAt: '2026-08-05',
      channel: 'sms',
      submitted: { product: '公路干线运输', greenPower: 0, target: '2027 年新能源重卡占比 30%', period: '2026 年上半年' },
    },
    {
      id: 'lv-s17',
      name: '海岚国际货运代理有限公司',
      tier: 1,
      category: '物流',
      region: '上海',
      spendShare: 1.5,
      emissions: 38_500,
      scope3Cat: 4,
      status: 'invited',
      pcf: false,
      esgScore: 57,
      risk: 'low',
      reasons: [],
      contact: '许然 · 客户经理',
      invitedAt: '2026-10-15',
      channel: 'email',
    },
    {
      id: 'lv-s18',
      name: '嵘峰钴镍材料有限公司',
      tier: 2,
      category: '正极材料',
      region: '浙江',
      spendShare: null,
      emissions: 84_000,
      scope3Cat: null,
      status: 'notInvited',
      pcf: false,
      esgScore: null,
      risk: 'high',
      reasons: ['conflictMinerals', 'origin'],
      contact: '何静 · 合规部',
    },
    {
      id: 'lv-s19',
      name: '岩桂天然石墨有限公司',
      tier: 2,
      category: '负极材料',
      region: '黑龙江',
      spendShare: null,
      emissions: 52_000,
      scope3Cat: null,
      status: 'notInvited',
      pcf: false,
      esgScore: null,
      risk: 'high',
      reasons: ['origin', 'conflictMinerals'],
      contact: '吕鹏 · 销售部',
    },
    {
      id: 'lv-s20',
      name: '柘原锂盐有限公司',
      tier: 2,
      category: '正极材料',
      region: '青海',
      spendShare: null,
      emissions: 96_000,
      scope3Cat: null,
      status: 'invited',
      pcf: false,
      esgScore: 59,
      risk: 'medium',
      reasons: ['origin'],
      contact: '施雨 · 质量部',
      invitedAt: '2026-10-10',
      channel: 'email',
    },
  ],
}

const aeiforo: SuppliersDemo = {
  cat1Total: 12_200,
  longTailLabel: 'Other (long tail)',
  channels: ['email', 'teams'],
  company: 'Aeiforo Green Energy',
  euBattery: false,
  message:
    'Dear {supplier},\n\n{company} invites you to complete the “{template}” in the Nexus supplier portal. Please submit your response and supporting evidence by {deadline}.\n\nQuestions? Contact Sarah Lee, Sustainability Lead. Thank you for your support.',
  suppliers: [
    {
      id: 'ae-s01',
      name: 'Sabkha Solar Modules FZE',
      tier: 1,
      category: 'Solar modules',
      region: 'UAE',
      spendShare: 18,
      emissions: 4_200,
      scope3Cat: 1,
      status: 'verified',
      pcf: true,
      esgScore: 70,
      risk: 'medium',
      reasons: ['highEnergy'],
      contact: 'Omar Haddad · QHSE',
      invitedAt: '2025-03-04',
      submittedAt: '2025-04-11',
      verifiedAt: '2025-05-02',
      channel: 'email',
      submitted: {
        product: 'Mono PERC module 550 W',
        pcf: { value: 412, unit: 'kgCO₂e/module', standard: 'ISO 14067:2018' },
        greenPower: 30,
        target: '50% renewable electricity by 2028',
        period: 'FY2024',
      },
    },
    {
      id: 'ae-s02',
      name: 'Deccanline Steel Structures Pvt Ltd',
      tier: 1,
      category: 'Steel structures',
      region: 'Maharashtra, India',
      spendShare: 12,
      emissions: 2_600,
      scope3Cat: 1,
      status: 'submitted',
      pcf: true,
      esgScore: 58,
      risk: 'high',
      reasons: ['highEnergy', 'noTarget'],
      contact: 'Rohan Kulkarni · Plant Head',
      invitedAt: '2025-03-04',
      submittedAt: '2025-06-18',
      channel: 'email',
      submitted: {
        product: 'Galvanised mounting structures',
        pcf: { value: 2.4, unit: 'kgCO₂e/kg', standard: 'ISO 14067:2018' },
        greenPower: 8,
        period: 'FY2024',
      },
    },
    {
      id: 'ae-s03',
      name: 'Wadi Cableworks LLC',
      tier: 1,
      category: 'Cables',
      region: 'Oman',
      spendShare: 7,
      emissions: 1_100,
      scope3Cat: 1,
      status: 'invited',
      pcf: false,
      esgScore: 61,
      risk: 'medium',
      reasons: ['noTarget'],
      contact: 'Fatma Al-Riyami · Sales',
      invitedAt: '2025-09-01',
      channel: 'teams',
    },
    {
      id: 'ae-s04',
      name: 'Coromandel Inverter Systems',
      tier: 1,
      category: 'Inverters',
      region: 'Tamil Nadu, India',
      spendShare: 6,
      emissions: 650,
      scope3Cat: 1,
      status: 'filling',
      pcf: false,
      esgScore: 66,
      risk: 'low',
      reasons: [],
      contact: 'Meena Raghavan · ESG',
      invitedAt: '2025-08-12',
      channel: 'email',
    },
    {
      id: 'ae-s05',
      name: 'Sahyadri Cellworks Pvt Ltd',
      tier: 1,
      category: 'Battery storage',
      region: 'Karnataka, India',
      spendShare: 8,
      emissions: 1_400,
      scope3Cat: 1,
      status: 'notInvited',
      pcf: false,
      esgScore: 52,
      risk: 'high',
      reasons: ['conflictMinerals', 'origin'],
      contact: 'Vikram Shetty · Commercial',
    },
    {
      id: 'ae-s06',
      name: 'Kutch Turbine Components',
      tier: 1,
      category: 'Wind components',
      region: 'Gujarat, India',
      spendShare: 9,
      emissions: 1_350,
      scope3Cat: 1,
      status: 'invited',
      pcf: false,
      esgScore: 60,
      risk: 'medium',
      reasons: ['highEnergy'],
      contact: 'Nikhil Patel · Quality',
      invitedAt: '2025-09-15',
      channel: 'email',
    },
    {
      id: 'ae-s07',
      name: 'Indus Gridgear Ltd',
      tier: 1,
      category: 'Electrical equipment',
      region: 'Delhi NCR, India',
      spendShare: 5,
      emissions: 700,
      scope3Cat: 1,
      status: 'notInvited',
      pcf: false,
      esgScore: 55,
      risk: 'medium',
      reasons: ['noTarget'],
      contact: 'Anita Rao · Sales',
    },
    {
      id: 'ae-s08',
      name: 'Batinah Haulage SAOC',
      tier: 1,
      category: 'Logistics',
      region: 'Oman',
      spendShare: 10,
      emissions: 1_800,
      scope3Cat: 4,
      status: 'submitted',
      pcf: false,
      esgScore: 63,
      risk: 'low',
      reasons: ['safety'],
      contact: 'Salim Al-Hinai · Operations',
      invitedAt: '2025-04-02',
      submittedAt: '2025-05-20',
      channel: 'teams',
      submitted: { product: 'Heavy-haul road freight', greenPower: 0, target: 'Pilot 10 electric trucks by 2026', period: 'FY2024' },
    },
  ],
}

export const SUPPLIERS_DEMO: Record<DemoWorkspace, SuppliersDemo> = { lvyuan, aeiforo }

export const suppliersFor = (workspaceId: string): SuppliersDemo => SUPPLIERS_DEMO[workspaceId as DemoWorkspace] ?? aeiforo

/** Supplier-specific data = submitted or verified with a product carbon footprint. */
export const hasSpecificData = (s: Pick<Supplier, 'status' | 'pcf'>) => s.pcf && (s.status === 'submitted' || s.status === 'verified')
