import type { L10n } from '@/config/regions'

/*
 * ESG rating demo data per workspace. Immutable: user changes (action plan
 * items, status, owner, due date) live in ./store.ts as overrides.
 *
 * All grades, scores, percentiles and dates are illustrative (示例数据). Rating
 * scales marked `scaleVerified: false` have not been checked against the
 * agency's published methodology and are shown as 待核实 / to be verified.
 *
 * Tenant text (diagnostic indicators, action titles, calendar items) is in the
 * tenant's language: Simplified Chinese for lvyuan, English for aeiforo.
 */

export type DemoWorkspace = 'lvyuan' | 'aeiforo'
export type Pillar = 'E' | 'S' | 'G'
export type Impact = 'high' | 'medium' | 'low'
export type ActionStatus = 'todo' | 'doing' | 'done'
export type CalendarKind = 'questionnaire' | 'verification' | 'review' | 'publication'
/** Where in the app a diagnostic gets fixed. The label is UI copy; the href depends on the workspace. */
export type FixLink = 'scope3' | 'governance' | 'suppliers' | 'products' | 'verify' | 'dma' | 'carbonAssets' | 'evidence' | 'targets'

/**
 * - grade: ordered letter scale, `scale[0]` is best
 * - score: 0–100, higher is better
 * - risk: risk score, lower is better (Sustainalytics)
 */
export type RatingKind = 'grade' | 'score' | 'risk'

export interface RatingPoint {
  /** ISO date of the rating action. */
  date: string
  value: string | number
}

export interface Diagnostic {
  id: string
  indicator: string
  detail: string
  pillar: Pillar
  impact: Impact
  /** Estimated uplift on the agency's normalised pillar score (0–100) if closed. */
  uplift: number
  link: FixLink
}

export interface Rating {
  id: string
  name: L10n
  origin: 'domestic' | 'international'
  kind: RatingKind
  /** For grade ratings: best → worst. */
  scale?: string[]
  scaleVerified: boolean
  /** Supplementary label, e.g. EcoVadis medal or Sustainalytics risk category (tenant language). */
  badge?: string
  previousBadge?: string
  /** Target for score/risk ratings (the "next grade"). */
  target?: number
  history: RatingPoint[]
  lastUpdate: string
  nextReview: string
  /** Share of rated industry peers this company is ahead of. */
  percentile: number
  pillars: Record<Pillar, number>
  diagnostics: Diagnostic[]
}

export interface PlanAction {
  id: string
  title: string
  ratingId: string
  diagnosticId?: string
  owner: string
  due: string
  status: ActionStatus
}

export interface CalendarItem {
  id: string
  ratingId: string
  title: string
  date: string
  kind: CalendarKind
}

export interface RatingsDemo {
  industry: L10n
  ratings: Rating[]
  actions: PlanAction[]
  calendar: CalendarItem[]
  /** Fix destinations that differ per workspace (framework module ids). */
  links: Record<FixLink, string>
  /** Default owner per pillar when an action is added from a diagnostic. */
  defaultOwner: Record<Pillar, string>
}

const MSCI_SCALE = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC']
const WIND_SCALE = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC']
const NINE_TIER = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C']
const SYNTAO_SCALE = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D']
const CDP_SCALE = ['A', 'A-', 'B', 'B-', 'C', 'C-', 'D', 'D-']

const BASE_LINKS: Omit<Record<FixLink, string>, 'governance'> = {
  scope3: '/scope3',
  suppliers: '/suppliers',
  products: '/products',
  verify: '/verify',
  dma: '/dma',
  carbonAssets: '/carbon/assets',
  evidence: '/evidence',
  targets: '/ghg',
}

const lvyuan: RatingsDemo = {
  industry: { en: 'Power equipment', zh: '电力设备' },
  links: { ...BASE_LINKS, governance: '/modules/CN-SSE' },
  defaultOwner: { E: 'wangmin', S: 'liuyang', G: 'zhoujing' },
  ratings: [
    {
      id: 'wind',
      name: { en: 'Wind ESG', zh: 'Wind ESG' },
      origin: 'domestic',
      kind: 'grade',
      scale: WIND_SCALE,
      scaleVerified: true,
      history: [
        { date: '2024-05-31', value: 'BB' },
        { date: '2024-11-30', value: 'BBB' },
        { date: '2025-05-31', value: 'BBB' },
        { date: '2025-11-30', value: 'BBB' },
        { date: '2026-05-31', value: 'A' },
        { date: '2026-08-31', value: 'A' },
      ],
      lastUpdate: '2026-08-31',
      nextReview: '2026-11-30',
      percentile: 78,
      pillars: { E: 71, S: 64, G: 69 },
      diagnostics: [
        {
          id: 'wind-s3',
          indicator: '范围3 排放披露覆盖不足',
          detail: '当前仅披露 8 个类别，类别1 中供应商实测数据占比不足一半，其余采用基于支出的估算。',
          pillar: 'E',
          impact: 'high',
          uplift: 6,
          link: 'scope3',
        },
        {
          id: 'wind-board',
          indicator: '董事会对可持续发展的监督机制',
          detail: '战略与可持续发展委员会的职责、会议频次及议题审议记录未在《可持续发展报告》中完整披露。',
          pillar: 'G',
          impact: 'medium',
          uplift: 4,
          link: 'governance',
        },
        {
          id: 'wind-assure',
          indicator: '第三方鉴证',
          detail: '范围1、范围2 排放数据尚未取得第三方机构的鉴证或审验。',
          pillar: 'G',
          impact: 'medium',
          uplift: 3,
          link: 'verify',
        },
      ],
    },
    {
      id: 'huazheng',
      name: { en: 'Huazheng ESG', zh: '华证 ESG' },
      origin: 'domestic',
      kind: 'grade',
      scale: NINE_TIER,
      scaleVerified: true,
      history: [
        { date: '2025-01-31', value: 'BBB' },
        { date: '2025-04-30', value: 'BBB' },
        { date: '2025-07-31', value: 'A' },
        { date: '2025-10-31', value: 'A' },
        { date: '2026-01-31', value: 'A' },
        { date: '2026-04-30', value: 'A' },
        { date: '2026-07-31', value: 'AA' },
      ],
      lastUpdate: '2026-07-31',
      nextReview: '2026-10-31',
      percentile: 86,
      pillars: { E: 76, S: 70, G: 73 },
      diagnostics: [
        {
          id: 'hz-supply',
          indicator: '供应链 ESG 尽职调查',
          detail: '关键原材料（锂、钴、镍、天然石墨）供应商的尽职调查覆盖率偏低，二级供应商尚未纳入。',
          pillar: 'S',
          impact: 'high',
          uplift: 5,
          link: 'suppliers',
        },
        {
          id: 'hz-pcf',
          indicator: '产品碳足迹',
          detail: '储能电池与光伏组件尚未按 GB/T 24067-2024 完成产品碳足迹核算并取得标识认证。',
          pillar: 'E',
          impact: 'medium',
          uplift: 4,
          link: 'products',
        },
      ],
    },
    {
      id: 'csi',
      name: { en: 'CSI ESG', zh: '中证 ESG' },
      origin: 'domestic',
      kind: 'grade',
      scale: NINE_TIER,
      scaleVerified: false,
      history: [
        { date: '2025-03-31', value: 'BBB' },
        { date: '2025-09-30', value: 'A' },
        { date: '2026-03-31', value: 'A' },
        { date: '2026-09-30', value: 'A' },
      ],
      lastUpdate: '2026-09-30',
      nextReview: '2027-03-31',
      percentile: 66,
      pillars: { E: 68, S: 61, G: 66 },
      diagnostics: [
        {
          id: 'csi-target',
          indicator: '减排目标与转型计划',
          detail: '尚未设定经第三方认可的中长期减排目标，转型计划缺少分年度路径。',
          pillar: 'E',
          impact: 'high',
          uplift: 5,
          link: 'targets',
        },
        {
          id: 'csi-cert',
          indicator: '绿色电力消费凭证',
          detail: '绿电交易与绿证的佐证材料未与范围2 基于市场的核算逐笔对应。',
          pillar: 'E',
          impact: 'low',
          uplift: 2,
          link: 'carbonAssets',
        },
      ],
    },
    {
      id: 'syntao',
      name: { en: 'SynTao Green Finance', zh: '商道融绿' },
      origin: 'domestic',
      kind: 'grade',
      scale: SYNTAO_SCALE,
      scaleVerified: false,
      history: [
        { date: '2024-12-31', value: 'B' },
        { date: '2025-06-30', value: 'B+' },
        { date: '2025-12-31', value: 'B+' },
        { date: '2026-06-30', value: 'A-' },
      ],
      lastUpdate: '2026-06-30',
      nextReview: '2026-12-31',
      percentile: 72,
      pillars: { E: 70, S: 63, G: 67 },
      diagnostics: [
        {
          id: 'st-dma',
          indicator: '双重重要性评估过程披露',
          detail: '利益相关方沟通范围与议题评分依据披露不足，未说明影响重要性的评估阈值。',
          pillar: 'G',
          impact: 'medium',
          uplift: 3,
          link: 'dma',
        },
      ],
    },
    {
      id: 'msci',
      name: { en: 'MSCI ESG', zh: 'MSCI ESG' },
      origin: 'international',
      kind: 'grade',
      scale: MSCI_SCALE,
      scaleVerified: true,
      history: [
        { date: '2023-07-12', value: 'B' },
        { date: '2024-06-20', value: 'BB' },
        { date: '2025-06-18', value: 'BB' },
        { date: '2026-06-18', value: 'BBB' },
      ],
      lastUpdate: '2026-06-18',
      nextReview: '2027-06-30',
      percentile: 55,
      pillars: { E: 58, S: 49, G: 61 },
      diagnostics: [
        {
          id: 'msci-supply',
          indicator: '供应链劳工标准与原材料溯源',
          detail: '电池原材料的原产地溯源资料不全，冲突矿产尽职调查尚未覆盖二级供应商。',
          pillar: 'S',
          impact: 'high',
          uplift: 7,
          link: 'suppliers',
        },
        {
          id: 'msci-board',
          indicator: '董事会对可持续发展的监督机制',
          detail: '独立董事中具备气候或可持续发展专业背景的人数未披露，高管薪酬未与 ESG 目标挂钩。',
          pillar: 'G',
          impact: 'medium',
          uplift: 4,
          link: 'governance',
        },
        {
          id: 'msci-s3',
          indicator: '范围3 排放披露覆盖不足',
          detail: '类别11（售出产品的使用）尚未核算，外部投资者无法评估价值链排放。',
          pillar: 'E',
          impact: 'medium',
          uplift: 4,
          link: 'scope3',
        },
      ],
    },
    {
      id: 'cdp',
      name: { en: 'CDP Climate', zh: 'CDP 气候变化' },
      origin: 'international',
      kind: 'grade',
      scale: CDP_SCALE,
      scaleVerified: true,
      history: [
        { date: '2023-12-12', value: 'C-' },
        { date: '2024-12-10', value: 'C' },
        { date: '2026-01-20', value: 'B' },
      ],
      lastUpdate: '2026-01-20',
      nextReview: '2026-12-15',
      percentile: 60,
      pillars: { E: 63, S: 52, G: 58 },
      diagnostics: [
        {
          id: 'cdp-assure',
          indicator: '第三方鉴证',
          detail: '范围3 排放未经第三方鉴证；范围1、范围2 的核查报告未在问卷中附上。',
          pillar: 'E',
          impact: 'high',
          uplift: 6,
          link: 'verify',
        },
        {
          id: 'cdp-s3',
          indicator: '范围3 排放披露覆盖不足',
          detail: '供应商合作（Supplier engagement）部分缺少按排放量计的供应商覆盖率。',
          pillar: 'E',
          impact: 'medium',
          uplift: 4,
          link: 'suppliers',
        },
      ],
    },
    {
      id: 'spcsa',
      name: { en: 'S&P Global CSA', zh: '标普全球 CSA' },
      origin: 'international',
      kind: 'score',
      scaleVerified: true,
      target: 55,
      history: [
        { date: '2023-11-17', value: 31 },
        { date: '2024-11-15', value: 38 },
        { date: '2025-11-14', value: 46 },
      ],
      lastUpdate: '2025-11-14',
      nextReview: '2026-11-20',
      percentile: 74,
      pillars: { E: 52, S: 41, G: 47 },
      diagnostics: [
        {
          id: 'csa-evidence',
          indicator: '公开佐证材料可得性',
          detail: '问卷多项回答引用内部文件，缺少可公开访问的佐证材料链接。',
          pillar: 'G',
          impact: 'medium',
          uplift: 5,
          link: 'evidence',
        },
        {
          id: 'csa-pcf',
          indicator: '产品碳足迹',
          detail: '未披露主要产品的生命周期评价结果及采用的电力碳足迹因子。',
          pillar: 'E',
          impact: 'medium',
          uplift: 4,
          link: 'products',
        },
      ],
    },
    {
      id: 'ecovadis',
      name: { en: 'EcoVadis', zh: 'EcoVadis' },
      origin: 'international',
      kind: 'score',
      scaleVerified: true,
      target: 70,
      badge: '银牌',
      previousBadge: '铜牌',
      history: [
        { date: '2024-09-05', value: 49 },
        { date: '2025-09-12', value: 55 },
        { date: '2026-09-18', value: 62 },
      ],
      lastUpdate: '2026-09-18',
      nextReview: '2027-09-18',
      percentile: 80,
      pillars: { E: 70, S: 60, G: 55 },
      diagnostics: [
        {
          id: 'ev-procure',
          indicator: '可持续采购',
          detail: '供应商 ESG 评估问卷回收率偏低，未对高风险供应商开展现场审核。',
          pillar: 'S',
          impact: 'high',
          uplift: 6,
          link: 'suppliers',
        },
        {
          id: 'ev-ethics',
          indicator: '商业道德政策覆盖',
          detail: '反腐败培训覆盖率与举报渠道处理记录未形成可提交的佐证材料。',
          pillar: 'G',
          impact: 'low',
          uplift: 2,
          link: 'evidence',
        },
      ],
    },
  ],
  actions: [
    {
      id: 'lv-a1',
      title: '扩大类别1 供应商实测数据覆盖至排放量的 70%',
      ratingId: 'wind',
      diagnosticId: 'wind-s3',
      owner: 'liuyang',
      due: '2026-12-31',
      status: 'doing',
    },
    {
      id: 'lv-a2',
      title: '在《可持续发展报告》中补充战略与可持续发展委员会履职情况',
      ratingId: 'msci',
      diagnosticId: 'msci-board',
      owner: 'zhoujing',
      due: '2027-03-31',
      status: 'todo',
    },
    {
      id: 'lv-a3',
      title: '委托第三方机构对 FY2026 范围1、范围2 排放开展鉴证',
      ratingId: 'cdp',
      diagnosticId: 'cdp-assure',
      owner: 'wangmin',
      due: '2027-02-28',
      status: 'doing',
    },
    {
      id: 'lv-a4',
      title: '上传 EcoVadis 2026 评估反馈及改进说明',
      ratingId: 'ecovadis',
      owner: 'liuyang',
      due: '2026-10-15',
      status: 'done',
    },
  ],
  calendar: [
    { id: 'lv-c1', ratingId: 'wind', title: 'Wind ESG 季度评级更新（基于三季报数据）', date: '2026-11-30', kind: 'review' },
    { id: 'lv-c2', ratingId: 'msci', title: 'MSCI ESG 公司数据核验窗口截止', date: '2026-11-06', kind: 'verification' },
    { id: 'lv-c3', ratingId: 'spcsa', title: '标普全球 CSA 2026 评估结果发布', date: '2026-11-20', kind: 'publication' },
    { id: 'lv-c4', ratingId: 'cdp', title: 'CDP 2026 气候变化问卷评分发布', date: '2026-12-15', kind: 'publication' },
    { id: 'lv-c5', ratingId: 'huazheng', title: '华证 ESG 季度评级更新', date: '2026-10-31', kind: 'review' },
    { id: 'lv-c6', ratingId: 'syntao', title: '商道融绿年度评级更新', date: '2026-12-31', kind: 'review' },
    { id: 'lv-c7', ratingId: 'cdp', title: 'CDP 2027 问卷填报窗口（预计）', date: '2027-06-30', kind: 'questionnaire' },
    { id: 'lv-c8', ratingId: 'spcsa', title: '标普全球 CSA 2027 问卷提交截止（预计）', date: '2027-07-31', kind: 'questionnaire' },
    { id: 'lv-c9', ratingId: 'ecovadis', title: 'EcoVadis 重新评估问卷提交截止', date: '2027-08-15', kind: 'questionnaire' },
  ],
}

const aeiforo: RatingsDemo = {
  industry: { en: 'Renewable power & logistics', zh: '可再生能源发电与物流' },
  links: { ...BASE_LINKS, governance: '/modules/IFRS-S1' },
  defaultOwner: { E: 'priya', S: 'sarah', G: 'ahmed' },
  ratings: [
    {
      id: 'msci',
      name: { en: 'MSCI ESG', zh: 'MSCI ESG' },
      origin: 'international',
      kind: 'grade',
      scale: MSCI_SCALE,
      scaleVerified: true,
      history: [
        { date: '2022-08-10', value: 'BB' },
        { date: '2023-08-14', value: 'BBB' },
        { date: '2024-08-12', value: 'BBB' },
        { date: '2025-08-11', value: 'A' },
      ],
      lastUpdate: '2025-08-11',
      nextReview: '2026-11-30',
      percentile: 68,
      pillars: { E: 74, S: 58, G: 63 },
      diagnostics: [
        {
          id: 'ae-msci-board',
          indicator: 'Board oversight of sustainability',
          detail: 'Committee charter and frequency of climate agenda items are not disclosed in the annual report.',
          pillar: 'G',
          impact: 'medium',
          uplift: 4,
          link: 'governance',
        },
        {
          id: 'ae-msci-labour',
          indicator: 'Contractor health & safety',
          detail: 'Contractor LTIFR is reported for Oman sites only; India O&M contractors are not covered.',
          pillar: 'S',
          impact: 'high',
          uplift: 6,
          link: 'suppliers',
        },
      ],
    },
    {
      id: 'cdp',
      name: { en: 'CDP Climate', zh: 'CDP 气候变化' },
      origin: 'international',
      kind: 'grade',
      scale: CDP_SCALE,
      scaleVerified: true,
      history: [
        { date: '2023-12-12', value: 'C' },
        { date: '2024-12-10', value: 'C' },
        { date: '2026-01-20', value: 'B-' },
      ],
      lastUpdate: '2026-01-20',
      nextReview: '2026-12-15',
      percentile: 57,
      pillars: { E: 61, S: 50, G: 55 },
      diagnostics: [
        {
          id: 'ae-cdp-s3',
          indicator: 'Scope 3 coverage',
          detail: 'Category 1 is spend-based for most suppliers; supplier-specific data covers about half of Category 1.',
          pillar: 'E',
          impact: 'high',
          uplift: 6,
          link: 'scope3',
        },
        {
          id: 'ae-cdp-assure',
          indicator: 'Third-party assurance',
          detail: 'Scope 1 and 2 are assured for India only; Oman operations lack an assurance statement.',
          pillar: 'E',
          impact: 'medium',
          uplift: 4,
          link: 'verify',
        },
      ],
    },
    {
      id: 'sustainalytics',
      name: { en: 'Sustainalytics ESG Risk', zh: 'Sustainalytics ESG 风险评级' },
      origin: 'international',
      kind: 'risk',
      scaleVerified: true,
      target: 15,
      badge: 'Low risk',
      previousBadge: 'Medium risk',
      history: [
        { date: '2023-10-02', value: 24.6 },
        { date: '2024-10-01', value: 21.2 },
        { date: '2025-10-06', value: 18.4 },
      ],
      lastUpdate: '2025-10-06',
      nextReview: '2026-10-31',
      percentile: 71,
      pillars: { E: 72, S: 60, G: 66 },
      diagnostics: [
        {
          id: 'ae-sus-bio',
          indicator: 'Biodiversity management at wind sites',
          detail: 'Avian monitoring results are not linked to a published biodiversity policy or targets.',
          pillar: 'E',
          impact: 'medium',
          uplift: 3,
          link: 'dma',
        },
      ],
    },
    {
      id: 'spcsa',
      name: { en: 'S&P Global CSA', zh: '标普全球 CSA' },
      origin: 'international',
      kind: 'score',
      scaleVerified: true,
      target: 60,
      history: [
        { date: '2023-11-17', value: 41 },
        { date: '2024-11-15', value: 47 },
        { date: '2025-11-14', value: 52 },
      ],
      lastUpdate: '2025-11-14',
      nextReview: '2026-11-20',
      percentile: 76,
      pillars: { E: 63, S: 44, G: 50 },
      diagnostics: [
        {
          id: 'ae-csa-evidence',
          indicator: 'Public evidence for questionnaire answers',
          detail: 'Several answers cite internal documents with no publicly accessible evidence.',
          pillar: 'G',
          impact: 'medium',
          uplift: 5,
          link: 'evidence',
        },
      ],
    },
    {
      id: 'ecovadis',
      name: { en: 'EcoVadis', zh: 'EcoVadis' },
      origin: 'international',
      kind: 'score',
      scaleVerified: true,
      target: 75,
      badge: 'Gold',
      previousBadge: 'Silver',
      history: [
        { date: '2024-04-22', value: 61 },
        { date: '2025-04-28', value: 68 },
      ],
      lastUpdate: '2025-04-28',
      nextReview: '2026-04-28',
      percentile: 88,
      pillars: { E: 78, S: 66, G: 62 },
      diagnostics: [
        {
          id: 'ae-ev-procure',
          indicator: 'Sustainable procurement',
          detail: 'Supplier ESG questionnaires cover 40% of spend; no audits of high-risk suppliers.',
          pillar: 'S',
          impact: 'high',
          uplift: 5,
          link: 'suppliers',
        },
      ],
    },
    {
      id: 'crisil',
      name: { en: 'CRISIL ESG (India)', zh: 'CRISIL ESG（印度）' },
      origin: 'domestic',
      kind: 'score',
      scaleVerified: false,
      target: 70,
      history: [
        { date: '2024-07-15', value: 58 },
        { date: '2025-07-14', value: 64 },
      ],
      lastUpdate: '2025-07-14',
      nextReview: '2026-07-14',
      percentile: 81,
      pillars: { E: 71, S: 59, G: 62 },
      diagnostics: [
        {
          id: 'ae-crisil-brsr',
          indicator: 'BRSR Core value-chain disclosures',
          detail: 'Value-chain partners covering 75% of purchases are not yet reporting BRSR Core indicators.',
          pillar: 'S',
          impact: 'medium',
          uplift: 4,
          link: 'suppliers',
        },
      ],
    },
  ],
  actions: [
    {
      id: 'ae-a1',
      title: 'Extend supplier-specific data to 70% of Category 1 emissions',
      ratingId: 'cdp',
      diagnosticId: 'ae-cdp-s3',
      owner: 'sarah',
      due: '2026-12-31',
      status: 'doing',
    },
    {
      id: 'ae-a2',
      title: 'Publish board sustainability committee charter',
      ratingId: 'msci',
      diagnosticId: 'ae-msci-board',
      owner: 'ahmed',
      due: '2026-11-15',
      status: 'todo',
    },
    {
      id: 'ae-a3',
      title: 'Submit EcoVadis reassessment corrective action plan',
      ratingId: 'ecovadis',
      owner: 'sarah',
      due: '2026-04-15',
      status: 'done',
    },
  ],
  calendar: [
    {
      id: 'ae-c1',
      ratingId: 'sustainalytics',
      title: 'Sustainalytics annual review – company feedback window',
      date: '2026-10-31',
      kind: 'verification',
    },
    { id: 'ae-c2', ratingId: 'msci', title: 'MSCI ESG company data review window closes', date: '2026-11-06', kind: 'verification' },
    { id: 'ae-c3', ratingId: 'spcsa', title: 'S&P Global CSA 2026 scores published', date: '2026-11-20', kind: 'publication' },
    { id: 'ae-c4', ratingId: 'cdp', title: 'CDP 2026 climate scores released', date: '2026-12-15', kind: 'publication' },
    { id: 'ae-c5', ratingId: 'ecovadis', title: 'EcoVadis reassessment questionnaire due', date: '2027-03-31', kind: 'questionnaire' },
    { id: 'ae-c6', ratingId: 'cdp', title: 'CDP 2027 response window (expected)', date: '2027-06-30', kind: 'questionnaire' },
    { id: 'ae-c7', ratingId: 'spcsa', title: 'S&P Global CSA 2027 submission (expected)', date: '2027-07-31', kind: 'questionnaire' },
  ],
}

export const RATINGS_DEMO: Record<DemoWorkspace, RatingsDemo> = { lvyuan, aeiforo }

export const ratingsFor = (workspaceId: string): RatingsDemo => RATINGS_DEMO[workspaceId as DemoWorkspace] ?? aeiforo

/* ---------- Derived helpers (pure) ---------- */

/** Position on a 0–100 "higher is better" axis, so grades and scores can be compared and charted. */
export function standing(r: Rating, value: string | number): number {
  if (r.kind === 'grade' && r.scale) {
    const i = r.scale.indexOf(String(value))
    return i < 0 ? 0 : r.scale.length - 1 - i
  }
  return r.kind === 'risk' ? -Number(value) : Number(value)
}

export const currentPoint = (r: Rating) => r.history[r.history.length - 1]
export const previousPoint = (r: Rating) => (r.history.length > 1 ? r.history[r.history.length - 2] : undefined)

/** +1 upgraded, -1 downgraded, 0 unchanged (vs previous rating action). */
export function direction(r: Rating): -1 | 0 | 1 {
  const prev = previousPoint(r)
  if (!prev) return 0
  const d = standing(r, currentPoint(r).value) - standing(r, prev.value)
  return d > 0 ? 1 : d < 0 ? -1 : 0
}

/** The next better grade on the scale, or undefined at the top / for score ratings. */
export function nextGrade(r: Rating): string | undefined {
  if (r.kind !== 'grade' || !r.scale) return undefined
  const i = r.scale.indexOf(String(currentPoint(r).value))
  return i > 0 ? r.scale[i - 1] : undefined
}

/** Numeric change for score/risk ratings (signed in the agency's own units). */
export function scoreChange(r: Rating): number | undefined {
  const prev = previousPoint(r)
  if (r.kind === 'grade' || !prev) return undefined
  return Number(currentPoint(r).value) - Number(prev.value)
}
