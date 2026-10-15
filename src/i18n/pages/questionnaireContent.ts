import { useCallback, useMemo } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { sectionTitlesZhCN, fieldLabelsZhCN, fieldHintsZhCN, tagsZhCN, ownersZhCN, unitsZhCN } from './questionnaireContentCN'

/**
 * Chinese translations for questionnaire content sourced from
 * `mockData.questionnaireSections` (titles, field labels, hints, tags, owners).
 * Keyed by stable ids so mockData.ts stays untouched. Pre-filled answer
 * values are user data and are intentionally NOT translated.
 * Anything missing falls back to the English source text.
 */

export const sectionTitlesZh: Record<string, string> = {
  ...sectionTitlesZhCN,
  // GRI
  'GRI-2-1': 'GRI 2-1：组织详情',
  'GRI-2-2': 'GRI 2-2：纳入可持续发展报告的实体',
  'GRI-2-6': 'GRI 2-6：活动、价值链和其他业务关系',
  'GRI-2-7': 'GRI 2-7：员工',
  'GRI-2-9': 'GRI 2-9：治理架构和组成',
  'GRI-2-22': 'GRI 2-22：关于可持续发展战略的声明',
  'GRI-3-1': 'GRI 3-1：确定实质性议题的流程',
  'GRI-3-2': 'GRI 3-2：实质性议题清单',
  'GRI-3-3-Climate': 'GRI 3-3：实质性议题管理 - 气候变化',
  'GRI-305-1': 'GRI 305-1：直接（范围一）温室气体排放',
  'GRI-305-2': 'GRI 305-2：能源间接（范围二）温室气体排放',
  'GRI-403-9': 'GRI 403-9：工伤',
  'GRI-404-1': 'GRI 404-1：每名员工每年接受培训的平均小时数',
  'GRI-405-1': 'GRI 405-1：治理机构与员工的多元化',
  'GRI-2-27': 'GRI 2-27：遵守法律法规',
  // MSX
  'MSX-1': 'MSX 1：公司概况与公司治理',
  'MSX-2': 'MSX 2：风险管理与内部控制',
  'MSX-3': 'MSX 3：环境绩效与管理',
  'MSX-4': 'MSX 4：社会责任与人力资本',
  'MSX-5': 'MSX 5：社区投资与利益相关方沟通',
  'MSX-6': 'MSX 6：商业道德与透明度',
  'MSX-7': 'MSX 7：气候风险与可持续发展战略',
  // BRSR
  'BRSR-A': 'A 部分 – 一般披露',
  'BRSR-A2': 'A 部分 – 产品/服务与运营',
  'BRSR-A3': 'A 部分 – 员工与工人',
  'BRSR-A4': 'A 部分 – CSR 及控股/子公司信息',
  'BRSR-B': 'B 部分 – 管理与流程披露',
  'BRSR-P1': 'C 部分 – 原则 1：道德、透明与问责',
  'BRSR-P2': 'C 部分 – 原则 2：可持续产品与服务',
  'BRSR-P3': 'C 部分 – 原则 3：员工福祉',
  'BRSR-P5': 'C 部分 – 原则 5：环境',
  'BRSR-P6': 'C 部分 – 原则 6：人权',
  'BRSR-P8': 'C 部分 – 原则 8：包容性增长与 CSR',
  'BRSR-E': 'C 部分 – 核心财务指标',
  // CSRD / TCFD / China
  'ESRS-2': 'ESRS 2 – 一般披露',
  'ESRS-E1': 'ESRS E1 – 气候变化',
  'TCFD-Gov': 'TCFD – 治理',
  'TCFD-Strategy': 'TCFD – 战略',
  'TCFD-Metrics': 'TCFD – 指标与目标',
  'CASS-E': 'CASS – 环境',
  'CASS-S': 'CASS – 社会',
  'CASS-G': 'CASS – 治理',
}

/** Keyed by field id (field ids are unique across sections). `sectionId.fieldId` overrides also supported. */
export const fieldLabelsZh: Record<string, string> = {
  ...fieldLabelsZhCN,
  // GRI 2-1
  org_name: '组织名称',
  org_nature: '所有权性质和法律形式',
  org_location: '总部所在地',
  org_countries: '运营所在国家/地区',
  // GRI 2-2
  entities_list: '纳入的实体清单',
  consolidation_approach: '合并方法',
  reporting_boundaries: '财务报告与可持续发展报告边界的差异',
  // GRI 2-6
  activities: '业务活动',
  value_chain: '价值链描述',
  business_relationships: '其他业务关系',
  // GRI 2-7
  total_employees: '员工总数',
  employees_gender: '按性别划分的员工',
  employees_region: '按地区划分的员工',
  employees_contract: '长期员工与临时员工',
  employees_fulltime: '全职与兼职',
  // GRI 2-9
  governance_structure: '治理架构',
  board_composition: '董事会构成',
  board_responsibilities: '可持续发展监督',
  // GRI 2-22
  strategy_statement: '可持续发展战略声明',
  ceo_message: 'CEO 可持续发展致辞',
  // GRI 3-1 / 3-2
  materiality_process: '描述确定实质性议题的流程',
  stakeholder_engagement: '参与沟通的利益相关方群体',
  material_topics: '实质性议题清单',
  material_changes: '与上一报告期相比的变化',
  // GRI 3-3
  climate_impacts: '实际和潜在影响',
  climate_actions: '为管理影响而采取的行动',
  climate_effectiveness: '行动的有效性',
  // GRI 305-1
  scope1_total: '范围一排放总量（tCO₂e）',
  scope1_gases: '纳入的气体',
  scope1_sources: '排放源（在明细选项卡中管理）',
  scope1_methodology: '核算方法',
  // GRI 305-2
  scope2_location: '范围二排放 - 基于位置（tCO₂e）',
  scope2_market: '范围二排放 - 基于市场（tCO₂e）',
  scope2_methodology: '核算方法',
  // GRI 403-9
  fatalities: '死亡人数',
  high_consequence: '严重后果工伤',
  recordable_injuries: '可记录工伤',
  injury_rate: '工伤率（每 200,000 工时）',
  safety_description: '工伤情况描述及所采取的措施',
  // GRI 404-1
  training_total: '培训总时数',
  training_average: '人均培训时数',
  training_gender: '按性别划分的培训时数',
  training_category: '按员工类别划分的培训时数',
  training_programs: '重点培训项目',
  // GRI 405-1
  board_diversity: '董事会多元化',
  management_diversity: '高级管理层多元化',
  employee_diversity: '员工整体多元化',
  // GRI 2-27
  significant_fines: '重大罚款和非货币制裁',
  compliance_context: '背景及纠正措施',
  // MSX 1
  msx_company_name: '公司名称',
  msx_listing_status: 'MSX 上市状态',
  msx_board_structure: '董事会结构与独立性',
  msx_board_committees: '董事会专门委员会及其职责',
  msx_shareholder_rights: '股东权利与股东沟通',
  // MSX 2
  msx_risk_framework: '全面风险管理框架',
  msx_internal_controls: '内部控制与合规',
  msx_audit_function: '内部审计职能',
  // MSX 3
  msx_env_policy: '环境政策与承诺',
  msx_emissions_data: '温室气体排放与能源消耗',
  msx_env_initiatives: '环境举措与投资',
  msx_env_compliance: '环境合规与事件',
  // MSX 4
  msx_omanization: '阿曼化与本地就业',
  msx_workforce_diversity: '员工多元化与包容性',
  msx_training_development: '培训与发展项目',
  msx_health_safety: '职业健康与安全绩效',
  msx_employee_wellbeing: '员工敬业度与福祉',
  // MSX 5
  msx_community_investment: '社区投资项目',
  msx_stakeholder_engagement: '利益相关方沟通方式',
  msx_local_procurement: '本地化成分与本地采购',
  // MSX 6
  msx_ethics_policy: '行为准则与商业道德',
  msx_anti_corruption: '反腐败与反贿赂措施',
  msx_data_privacy: '数据隐私与网络安全',
  msx_disclosure_transparency: '财务披露与透明度',
  // MSX 7
  msx_climate_risk: '气候相关风险评估（TCFD）',
  msx_climate_strategy: '气候战略与脱碳路径',
  msx_sustainability_governance: '可持续发展治理与监督',
  // BRSR A
  brsr_a_company_name: '上市实体名称',
  brsr_a_cin: '公司识别号（CIN）',
  brsr_a_year: '成立年份',
  brsr_a_registered_office: '注册办公地址',
  brsr_a_corporate_address: '公司地址（如不同）',
  brsr_a_email: '电子邮箱',
  brsr_a_telephone: '电话',
  brsr_a_website: '网站',
  brsr_a_reporting_period: '报告所涵盖的财政年度',
  brsr_a_stock_exchanges: '股票上市的证券交易所名称',
  brsr_a_paid_up_capital: '实收资本（₹）',
  brsr_a_contact_person: 'BRSR 相关问询联系人姓名及联系方式',
  brsr_a_reporting_boundary: '报告边界 – 单体或合并',
  brsr_a_assurance: '鉴证机构名称及所获鉴证类型',
  // BRSR A2
  brsr_a_nic_code: '业务活动详情（NIC 代码）',
  brsr_a_products_services: '销售的产品/服务（按营业额前三名）',
  brsr_a_operations_locations: '工厂/运营场所数量',
  brsr_a_markets: '实体服务的市场',
  // BRSR A3
  brsr_a_employees_permanent: '员工详情 – 长期（按性别）',
  brsr_a_employees_other: '员工详情 – 非长期',
  brsr_a_workers_permanent: '工人详情 – 长期（按性别）',
  brsr_a_workers_other: '工人详情 – 非长期',
  brsr_a_participation_women: '女性参与/包容/代表情况',
  brsr_a_turnover_rate: '流失率（长期员工和工人）',
  // BRSR A4
  brsr_a_holding: '控股公司、子公司及联营公司',
  brsr_a_csr_applicable: '是否适用 CSR（是/否）',
  brsr_a_turnover: '营业额（₹）',
  brsr_a_net_worth: '净资产（₹）',
  // BRSR B
  brsr_b_policy_p1: 'P1 – 道德、透明与问责：政策与流程',
  brsr_b_policy_p2: 'P2 – 可持续产品/服务：政策与流程',
  brsr_b_policy_p3: 'P3 – 员工福祉：政策与流程',
  brsr_b_policy_p4: 'P4 – 利益相关方沟通：政策与流程',
  brsr_b_policy_p5: 'P5 – 环境：政策与流程',
  brsr_b_policy_p6: 'P6 – 人权：政策与流程',
  brsr_b_policy_p7: 'P7 – 政策倡导：政策与流程',
  brsr_b_policy_p8: 'P8 – 包容性增长：政策与流程',
  brsr_b_policy_p9: 'P9 – 消费者/客户价值：政策与流程',
  brsr_b_governance_leadership: '负责 BRSR 的董事声明（DIN）',
  brsr_b_highest_authority: '负责实施 BRSR 的最高权力机构',
  brsr_b_review_freq: '实体是否设有 BRSR 专门委员会？审查频率',
  // BRSR P1
  brsr_p1_coverage: 'NGRBC 原则培训覆盖率（董事会、KMP、员工、工人）',
  brsr_p1_penalties: '本财年的罚款/处罚/惩处/裁决/和解费用/和解',
  brsr_p1_complaints_ethics: '有关道德、贿赂、腐败的投诉（数量、状态）',
  brsr_p1_conflict_of_interest: '实体是否制定反腐败/反贿赂政策？',
  // BRSR P2
  brsr_p2_rd_capex: '用于改善环境/社会影响的特定技术研发及资本支出投资',
  brsr_p2_sustainable_sourcing: '实体是否有可持续采购程序？如有，可持续采购投入的比例',
  brsr_p2_lifecycle: '描述产品寿命终结后的安全回收流程（EPR、回收利用）',
  brsr_p2_epr: '生产者责任延伸（EPR）的适用性与合规情况',
  // BRSR P3
  brsr_p3_welfare: '员工福利（公积金、酬金、ESI、产假、陪产假、托儿）',
  brsr_p3_safety_permanent: '安全相关事件 – 长期员工',
  brsr_p3_safety_workers: '安全相关事件 – 合同工',
  brsr_p3_complaints: '有关工作条件、健康与安全的投诉',
  brsr_p3_training: '员工和工人培训详情',
  brsr_p3_posh: '性骚扰投诉处理机制（ICC 详情）',
  // BRSR P5
  brsr_p5_env_approvals: '环境审批/合规（EC、CTO、CTE）',
  brsr_p5_ghg_scope1: '范围一温室气体排放（tCO₂e）',
  brsr_p5_ghg_scope2: '范围二温室气体排放（tCO₂e）',
  brsr_p5_ghg_total: '范围一 + 范围二排放总量（tCO₂e）及强度',
  brsr_p5_ghg_scope3: '范围三排放（如有）',
  brsr_p5_energy_consumption: '能源消耗总量及强度（GJ）',
  brsr_p5_water: '取水量、耗水量及排水量',
  brsr_p5_waste: '废弃物产生量、回收量、处置量',
  brsr_p5_biodiversity: '生物多样性影响评估与缓解',
  brsr_p5_carbon_avoidance: '通过产品避免/抵消的排放量（tCO₂e）',
  // BRSR P6
  brsr_p6_training: '人权议题培训（员工、董事会、工人）',
  brsr_p6_wages: '最低工资支付 – 各类别合规情况',
  brsr_p6_complaints_hr: '有关人权的投诉（童工、强迫劳动、工资、POSH）',
  // BRSR P8
  brsr_p8_csr_details: 'CSR 支出与活动（《公司法》第 135 条）',
  brsr_p8_community_grievance: '社区申诉及处理',
  brsr_p8_input_procurement_local: '从中小微企业/小生产者采购的投入',
  // BRSR E
  brsr_e_revenue: '营业收入（₹ 千万）',
  brsr_e_net_profit: '净利润（₹ 千万）',
  brsr_e_csr_spend: 'CSR 支出总额（₹ 千万）与 2% 法定义务对比',
  brsr_e_green_revenue: '绿色/可持续产品收入占比（%）',
  brsr_e_capex_sustainability: '可持续发展资本支出（₹ 千万）',
  brsr_e_fines: '向监管机构支付的罚款/处罚（₹）',
  // ESRS
  esrs2_entity: '实体识别信息与报告期',
  esrs_e1_ghg: '温室气体排放（范围一、二、三）',
  // TCFD
  tcfd_gov_board: '董事会对气候相关风险的监督',
  tcfd_strategy_risks: '气候相关风险与机遇',
  tcfd_metrics_ghg: '范围一、二、三指标与目标',
  // CASS
  cass_e_emissions: '排放与能源消耗',
  cass_s_employees: '员工与社区指标',
  cass_g_board: '董事会结构与 ESG 监督',
}

/** Field hints / helper text, keyed like `fieldLabelsZh`. (Current mock data defines none.) */
export const fieldHintsZh: Record<string, string> = { ...fieldHintsZhCN }

export const tagsZh: Record<string, string> = {
  ...tagsZhCN,
  'General Disclosures': '一般披露',
  Foundation: '基础',
  'Reporting boundary': '报告边界',
  'Value chain': '价值链',
  Social: '社会',
  Workforce: '员工队伍',
  Governance: '治理',
  Board: '董事会',
  Strategy: '战略',
  Leadership: '领导力',
  Materiality: '实质性',
  Stakeholders: '利益相关方',
  Climate: '气候',
  DMA: 'DMA',
  GHG: '温室气体',
  'Scope 1': '范围一',
  'Scope 2': '范围二',
  Safety: '安全',
  Health: '健康',
  Training: '培训',
  Development: '发展',
  Diversity: '多元化',
  Inclusion: '包容性',
  Compliance: '合规',
  Legal: '法律',
  BRSR: 'BRSR',
  'Section A': 'A 部分',
  General: '一般',
  Operations: '运营',
  Corporate: '公司',
  'Section B': 'B 部分',
  Management: '管理',
  P1: 'P1',
  Ethics: '道德',
  P2: 'P2',
  Products: '产品',
  P3: 'P3',
  Employees: '员工',
  P5: 'P5',
  Environment: '环境',
  P6: 'P6',
  'Human Rights': '人权',
  P8: 'P8',
  CSR: 'CSR',
  'Inclusive Growth': '包容性增长',
  Financial: '财务',
  Essential: '核心',
  ESRS: 'ESRS',
  TCFD: 'TCFD',
  Metrics: '指标',
  CASS: 'CASS',
}

/** Role/department owners. Personal names (e.g. "Fatma Al Hinai") stay as-is. */
export const ownersZh: Record<string, string> = {
  ...ownersZhCN,
  'Corporate Sec.': '公司秘书处',
  Finance: '财务部',
  Strategy: '战略部',
  HR: '人力资源部',
  'CEO Office': 'CEO 办公室',
  Sustainability: '可持续发展部',
  HSE: 'HSE 部',
  'Legal & Compliance': '法务与合规部',
  'Company Secretary': '公司秘书',
  CHRO: '首席人力资源官',
  CSO: '首席可持续发展官',
  Procurement: '采购部',
  'Head EHS': 'EHS 负责人',
  'CSR Head': 'CSR 负责人',
  CFO: '首席财务官',
  EHS: 'EHS 部',
}

export const unitsZh: Record<string, string> = {
  ...unitsZhCN,
  Headcount: '人数',
  Count: '数量',
  Rate: '比率',
  Hours: '小时',
}

type SectionLike = { id: string; title: string }
type FieldLike = { id: string; label: string; hint?: string }

/**
 * Short sidebar label for a section title in either language. The sidebar is
 * already scoped to one framework, so the framework / part prefix before the
 * first " – " ("Section A – ", "港交所 – ", "交易所指引 – ") is dropped, as is
 * anything after the first colon.
 */
export function shortSectionTitle(title: string): string {
  return title
    .replace(/^[^–]{1,40} – /, '')
    .split(/[:：]/)[0]
    .trim()
}

export function useQuestionnaireText() {
  const { locale } = useLanguage()
  const zh = locale === 'zh'

  const sectionTitle = useCallback(
    (section: SectionLike) => (zh && sectionTitlesZh[section.id]) || section.title,
    [zh],
  )
  const fieldLabel = useCallback(
    (section: SectionLike | null | undefined, field: FieldLike) =>
      (zh && (fieldLabelsZh[`${section?.id}.${field.id}`] ?? fieldLabelsZh[field.id])) || field.label,
    [zh],
  )
  const fieldHint = useCallback(
    (section: SectionLike | null | undefined, field: FieldLike) =>
      field.hint ? (zh && (fieldHintsZh[`${section?.id}.${field.id}`] ?? fieldHintsZh[field.id])) || field.hint : undefined,
    [zh],
  )
  const tag = useCallback((t: string) => (zh && tagsZh[t]) || t, [zh])
  const owner = useCallback((o: string) => (zh && ownersZh[o]) || o, [zh])
  const unit = useCallback((u: string) => (zh && unitsZh[u]) || u, [zh])
  const shortTitle = useCallback((section: SectionLike) => shortSectionTitle(sectionTitle(section)), [sectionTitle])

  return useMemo(
    () => ({ sectionTitle, shortTitle, fieldLabel, fieldHint, tag, owner, unit }),
    [sectionTitle, shortTitle, fieldLabel, fieldHint, tag, owner, unit],
  )
}
