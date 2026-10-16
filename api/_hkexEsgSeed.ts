// HKEX ESG — Hong Kong Exchanges and Clearing, Main Board Listing Rules
// Appendix C2, Environmental, Social and Governance Reporting Code
// (香港联合交易所《主板上市规则》附录 C2《环境、社会及管治守则》).
//
// Covers:
//   • Mandatory disclosure requirements — governance structure (board
//     statement), reporting principles (materiality, quantitative,
//     consistency) and reporting boundary.
//   • Climate-related disclosures aligned with IFRS S2 (governance, strategy,
//     risk management, metrics and targets) — Scope 1 and Scope 2 GHG
//     emissions, plus Scope 3.
//   • Environmental Aspects A1 Emissions, A2 Use of Resources, A3 The
//     Environment and Natural Resources, with KPIs A1.1–A1.6, A2.1–A2.5, A3.1.
//   • Social Aspects B1–B8 with their KPIs.
//
// Codes use the HKEX KPI references (HKEX-A1.1 … HKEX-B8.2); General
// Disclosures use HKEX-<aspect>-GD; mandatory and climate items use topic codes.
// `lineItem` is canonical English (part of the conflict key); `lineItemZh` is the
// Simplified Chinese wording shown when the UI language is zh.
//
// This seeder does NOT switch the framework on for any organisation: tenants opt
// in from Settings → Frameworks.

export type WorkflowRole = 'AUTO' | 'FM' | 'SO' | 'TL'
export type EntryMode = 'Manual' | 'Calculator' | 'Connector'
export type ReportingScope = 'group' | 'jv'

export interface ItemSpec {
  subsection: string
  griCode: string
  lineItem: string
  lineItemZh: string
  unit: string | null
  scopeSplit: string | null
  hasTarget: boolean
  requiresCoverage: boolean
  defaultRole: WorkflowRole
  entryMode: EntryMode
}

const SECTION = 'HKEX ESG Reporting Code (Appendix C2)'
const FRAMEWORK_ID = 'hkex-esg'
const REPORTING_SCOPE: ReportingScope = 'group'

// ── Mandatory disclosure requirements ───────────────────────────────────────
const HKEX_MANDATORY: ItemSpec[] = [
  { subsection: 'Mandatory — Governance structure', griCode: 'HKEX-MDR-GOV', lineItem: "Board's oversight of ESG issues", lineItemZh: '董事会对环境、社会及管治事宜的监管', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'TL', entryMode: 'Manual' },
  { subsection: 'Mandatory — Governance structure', griCode: 'HKEX-MDR-GOV', lineItem: "Board's ESG management approach and strategy, including the process to evaluate, prioritise and manage material ESG-related issues", lineItemZh: '董事会的环境、社会及管治管理方针及策略，包括评估、优次排列及管理重要的环境、社会及管治相关事宜的过程', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'TL', entryMode: 'Manual' },
  { subsection: 'Mandatory — Governance structure', griCode: 'HKEX-MDR-GOV', lineItem: 'How the board reviews progress made against ESG-related goals and targets', lineItemZh: '董事会如何按环境、社会及管治相关目标检讨进度', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'TL', entryMode: 'Manual' },
  { subsection: 'Mandatory — Reporting principles', griCode: 'HKEX-MDR-PRIN', lineItem: 'Application of the materiality principle, including stakeholder engagement and the materiality assessment', lineItemZh: '「重要性」汇报原则的应用，包括持份者参与及重要性评估', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Mandatory — Reporting principles', griCode: 'HKEX-MDR-PRIN', lineItem: 'Application of the quantitative principle: standards, methodologies, assumptions and sources of conversion factors used', lineItemZh: '「量化」汇报原则的应用：所用的标准、方法、假设及转换因素的来源', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Mandatory — Reporting principles', griCode: 'HKEX-MDR-PRIN', lineItem: 'Application of the consistency principle and any changes to methods or KPIs used', lineItemZh: '「一致性」汇报原则的应用，以及所用方法或关键绩效指标的任何变更', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Mandatory — Reporting boundary', griCode: 'HKEX-MDR-BND', lineItem: 'Reporting boundary and the process used to identify the entities or operations included', lineItemZh: '汇报范围，以及挑选纳入报告的实体或业务的过程', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// ── Climate-related disclosures (aligned with IFRS S2) ──────────────────────
const HKEX_CLIMATE: ItemSpec[] = [
  { subsection: 'Climate — Governance', griCode: 'HKEX-CLIM-GOV', lineItem: 'Governance body or individual responsible for oversight of climate-related risks and opportunities', lineItemZh: '负责监督气候相关风险及机遇的管治机构或个人', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'TL', entryMode: 'Manual' },
  { subsection: 'Climate — Governance', griCode: 'HKEX-CLIM-GOV', lineItem: "Management's role in the governance processes, controls and procedures for climate-related risks and opportunities", lineItemZh: '管理层在监察及管理气候相关风险及机遇的管治程序、监控及程序中的角色', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — Strategy', griCode: 'HKEX-CLIM-STR', lineItem: 'Climate-related risks and opportunities and the time horizons over which they could reasonably be expected to occur', lineItemZh: '气候相关风险及机遇，以及可合理预期其发生的时间范围', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — Strategy', griCode: 'HKEX-CLIM-STR', lineItem: 'Effects on the business model, value chain, strategy and decision-making, including transition plans', lineItemZh: '对业务模式、价值链、策略及决策的影响，包括转型计划', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — Strategy', griCode: 'HKEX-CLIM-STR', lineItem: 'Climate resilience assessed using climate-related scenario analysis', lineItemZh: '以气候相关情景分析评估的气候韧性', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — Strategy', griCode: 'HKEX-CLIM-STR', lineItem: 'Current and anticipated financial effects of climate-related risks and opportunities', lineItemZh: '气候相关风险及机遇的当前及预期财务影响', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Climate — Risk management', griCode: 'HKEX-CLIM-RM', lineItem: 'Processes to identify, assess, prioritise and monitor climate-related risks and opportunities, and their integration into overall risk management', lineItemZh: '识别、评估、排列优次及监察气候相关风险及机遇的过程，以及融入整体风险管理的情况', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — GHG emissions', griCode: 'HKEX-CLIM-GHG', lineItem: 'Scope 1 GHG emissions', lineItemZh: '范围1温室气体排放', unit: 'tCO2e', scopeSplit: 'scope_1', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'Climate — GHG emissions', griCode: 'HKEX-CLIM-GHG', lineItem: 'Scope 2 GHG emissions (location-based)', lineItemZh: '范围2温室气体排放（基于位置）', unit: 'tCO2e', scopeSplit: 'scope_2_location', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'Climate — GHG emissions', griCode: 'HKEX-CLIM-GHG', lineItem: 'Scope 3 GHG emissions', lineItemZh: '范围3温室气体排放', unit: 'tCO2e', scopeSplit: 'scope_3', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'Climate — GHG emissions', griCode: 'HKEX-CLIM-GHG', lineItem: 'GHG measurement approach, inputs and assumptions', lineItemZh: '温室气体排放的计量方法、输入数据及假设', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — Metrics and targets', griCode: 'HKEX-CLIM-MT', lineItem: 'Amount and percentage of assets or business activities vulnerable to climate-related physical risks', lineItemZh: '易受气候相关实体风险影响的资产或业务活动的金额及百分比', unit: 'HKD', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Climate — Metrics and targets', griCode: 'HKEX-CLIM-MT', lineItem: 'Amount and percentage of assets or business activities vulnerable to climate-related transition risks', lineItemZh: '易受气候相关转型风险影响的资产或业务活动的金额及百分比', unit: 'HKD', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Climate — Metrics and targets', griCode: 'HKEX-CLIM-MT', lineItem: 'Amount and percentage of assets or business activities aligned with climate-related opportunities', lineItemZh: '与气候相关机遇相符的资产或业务活动的金额及百分比', unit: 'HKD', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Climate — Metrics and targets', griCode: 'HKEX-CLIM-MT', lineItem: 'Capital expenditure, financing or investment deployed towards climate-related risks and opportunities', lineItemZh: '投放于气候相关风险及机遇的资本开支、融资或投资金额', unit: 'HKD', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Climate — Metrics and targets', griCode: 'HKEX-CLIM-MT', lineItem: 'Internal carbon price used', lineItemZh: '所采用的内部碳价格', unit: 'HKD/tCO2e', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Climate — Metrics and targets', griCode: 'HKEX-CLIM-MT', lineItem: 'Percentage of executive remuneration linked to climate-related considerations', lineItemZh: '与气候相关考虑因素挂钩的高级管理人员薪酬百分比', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Climate — Metrics and targets', griCode: 'HKEX-CLIM-MT', lineItem: 'Climate-related targets and performance against them', lineItemZh: '气候相关目标及达标表现', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// ── A. Environmental ────────────────────────────────────────────────────────
const HKEX_A: ItemSpec[] = [
  // A1 Emissions
  { subsection: 'A1 Emissions', griCode: 'HKEX-A1-GD', lineItem: 'A1 General disclosure: policies and compliance with relevant laws and regulations on air and GHG emissions, discharges into water and land, and generation of hazardous and non-hazardous waste', lineItemZh: 'A1 一般披露：有关废气及温室气体排放、向水及土地的排污、有害及无害废弃物的产生等的政策，及遵守对发行人有重大影响的相关法律及规例的资料', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'A1 Emissions', griCode: 'HKEX-A1.1', lineItem: 'Types of emissions and respective emissions data', lineItemZh: '排放物种类及相关排放数据', unit: 't', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'A1 Emissions', griCode: 'HKEX-A1.2', lineItem: 'Scope 1 and Scope 2 GHG emissions intensity', lineItemZh: '范围1及范围2温室气体排放密度', unit: 'tCO2e/unit', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'A1 Emissions', griCode: 'HKEX-A1.3', lineItem: 'Total hazardous waste produced and, where appropriate, intensity', lineItemZh: '所产生有害废弃物总量及（如适用）密度', unit: 't', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'A1 Emissions', griCode: 'HKEX-A1.4', lineItem: 'Total non-hazardous waste produced and, where appropriate, intensity', lineItemZh: '所产生无害废弃物总量及（如适用）密度', unit: 't', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'A1 Emissions', griCode: 'HKEX-A1.5', lineItem: 'Emissions target(s) set and steps taken to achieve them', lineItemZh: '描述所订立的排放量目标及为达到这些目标所采取的步骤', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'A1 Emissions', griCode: 'HKEX-A1.6', lineItem: 'How hazardous and non-hazardous wastes are handled, and waste reduction target(s) set and steps taken to achieve them', lineItemZh: '描述处理有害及无害废弃物的方法，及描述所订立的减废目标及为达到这些目标所采取的步骤', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  // A2 Use of resources
  { subsection: 'A2 Use of resources', griCode: 'HKEX-A2-GD', lineItem: 'A2 General disclosure: policies on the efficient use of resources, including energy, water and other raw materials', lineItemZh: 'A2 一般披露：有效使用资源（包括能源、水及其他原材料）的政策', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'A2 Use of resources', griCode: 'HKEX-A2.1', lineItem: 'Direct energy consumption by type', lineItemZh: '按类型划分的直接能源总耗量', unit: 'MWh', scopeSplit: 'direct', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'A2 Use of resources', griCode: 'HKEX-A2.1', lineItem: 'Indirect energy consumption by type (e.g. purchased electricity)', lineItemZh: '按类型划分的间接能源（如外购电力）总耗量', unit: 'MWh', scopeSplit: 'indirect', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'A2 Use of resources', griCode: 'HKEX-A2.1', lineItem: 'Energy consumption intensity', lineItemZh: '能源总耗量密度', unit: 'MWh/unit', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'A2 Use of resources', griCode: 'HKEX-A2.2', lineItem: 'Total water consumption', lineItemZh: '总耗水量', unit: 'm3', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'A2 Use of resources', griCode: 'HKEX-A2.2', lineItem: 'Water consumption intensity', lineItemZh: '耗水密度', unit: 'm3/unit', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'A2 Use of resources', griCode: 'HKEX-A2.3', lineItem: 'Energy use efficiency target(s) set and steps taken to achieve them', lineItemZh: '描述所订立的能源使用效益目标及为达到这些目标所采取的步骤', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'A2 Use of resources', griCode: 'HKEX-A2.4', lineItem: 'Any issue in sourcing water that is fit for purpose, and water efficiency target(s) set and steps taken to achieve them', lineItemZh: '描述求取适用水源上可有任何问题，以及所订立的用水效益目标及为达到这些目标所采取的步骤', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'A2 Use of resources', griCode: 'HKEX-A2.5', lineItem: 'Total packaging material used for finished products and, if applicable, per unit produced', lineItemZh: '制成品所用包装材料的总量及（如适用）每生产单位占量', unit: 't', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  // A3 The environment and natural resources
  { subsection: 'A3 The environment and natural resources', griCode: 'HKEX-A3-GD', lineItem: "A3 General disclosure: policies on minimising the issuer's significant impacts on the environment and natural resources", lineItemZh: 'A3 一般披露：减低发行人对环境及天然资源造成重大影响的政策', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'A3 The environment and natural resources', griCode: 'HKEX-A3.1', lineItem: 'Significant impacts of activities on the environment and natural resources and the actions taken to manage them', lineItemZh: '描述业务活动对环境及天然资源的重大影响及已采取管理有关影响的行动', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// ── B. Social ───────────────────────────────────────────────────────────────
const HKEX_B: ItemSpec[] = [
  // B1 Employment
  { subsection: 'B1 Employment', griCode: 'HKEX-B1-GD', lineItem: 'B1 General disclosure: policies and compliance relating to compensation and dismissal, recruitment and promotion, working hours, rest periods, equal opportunity, diversity, anti-discrimination, and other benefits and welfare', lineItemZh: 'B1 一般披露：有关薪酬及解雇、招聘及晋升、工作时数、假期、平等机会、多元化、反歧视以及其他待遇及福利的政策及合规资料', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'B1 Employment', griCode: 'HKEX-B1.1', lineItem: 'Total workforce by gender, employment type, age group and geographical region', lineItemZh: '按性别、雇佣类型（如全职或兼职）、年龄组别及地区划分的雇员总数', unit: 'headcount', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'B1 Employment', griCode: 'HKEX-B1.2', lineItem: 'Employee turnover rate by gender, age group and geographical region', lineItemZh: '按性别、年龄组别及地区划分的雇员流失比率', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  // B2 Health and safety
  { subsection: 'B2 Health and safety', griCode: 'HKEX-B2-GD', lineItem: 'B2 General disclosure: policies and compliance relating to providing a safe working environment and protecting employees from occupational hazards', lineItemZh: 'B2 一般披露：有关提供安全工作环境及保障雇员避免职业性危害的政策及合规资料', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'B2 Health and safety', griCode: 'HKEX-B2.1', lineItem: 'Number and rate of work-related fatalities in each of the past three years, including the reporting year', lineItemZh: '过去三年（包括汇报年度）每年因工亡故的人数及比率', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'B2 Health and safety', griCode: 'HKEX-B2.2', lineItem: 'Lost days due to work injury', lineItemZh: '因工伤损失工作日数', unit: 'days', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'B2 Health and safety', griCode: 'HKEX-B2.3', lineItem: 'Occupational health and safety measures adopted, and how they are implemented and monitored', lineItemZh: '描述所采纳的职业健康与安全措施，以及相关执行及监察方法', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  // B3 Development and training
  { subsection: 'B3 Development and training', griCode: 'HKEX-B3-GD', lineItem: "B3 General disclosure: policies on improving employees' knowledge and skills for discharging duties at work, and training activities", lineItemZh: 'B3 一般披露：有关提升雇员履行工作职责的知识及技能的政策，以及描述培训活动', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'B3 Development and training', griCode: 'HKEX-B3.1', lineItem: 'Percentage of employees trained by gender and employee category', lineItemZh: '按性别及雇员类别（如高级管理层、中级管理层等）划分的受训雇员百分比', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'B3 Development and training', griCode: 'HKEX-B3.2', lineItem: 'Average training hours completed per employee by gender and employee category', lineItemZh: '按性别及雇员类别划分，每名雇员完成受训的平均时数', unit: 'hours', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  // B4 Labour standards
  { subsection: 'B4 Labour standards', griCode: 'HKEX-B4-GD', lineItem: 'B4 General disclosure: policies and compliance relating to preventing child and forced labour', lineItemZh: 'B4 一般披露：有关防止童工或强制劳工的政策及合规资料', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'B4 Labour standards', griCode: 'HKEX-B4.1', lineItem: 'Measures to review employment practices to avoid child and forced labour', lineItemZh: '描述检讨招聘惯例的措施以避免童工及强制劳工', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'B4 Labour standards', griCode: 'HKEX-B4.2', lineItem: 'Steps taken to eliminate such practices when discovered', lineItemZh: '描述在发现违规情况时消除有关情况所采取的步骤', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  // B5 Supply chain management
  { subsection: 'B5 Supply chain management', griCode: 'HKEX-B5-GD', lineItem: 'B5 General disclosure: policies on managing environmental and social risks of the supply chain', lineItemZh: 'B5 一般披露：管理供应链的环境及社会风险政策', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'B5 Supply chain management', griCode: 'HKEX-B5.1', lineItem: 'Number of suppliers by geographical region', lineItemZh: '按地区划分的供应商数目', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'B5 Supply chain management', griCode: 'HKEX-B5.2', lineItem: 'Practices relating to engaging suppliers, number of suppliers where the practices are implemented, and how they are implemented and monitored', lineItemZh: '描述有关聘用供应商的惯例，向其执行有关惯例的供应商数目，以及相关执行及监察方法', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'B5 Supply chain management', griCode: 'HKEX-B5.3', lineItem: 'Practices used to identify environmental and social risks along the supply chain, and how they are implemented and monitored', lineItemZh: '描述有关识别供应链每个环节的环境及社会风险的惯例，以及相关执行及监察方法', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'B5 Supply chain management', griCode: 'HKEX-B5.4', lineItem: 'Practices used to promote environmentally preferable products and services when selecting suppliers, and how they are implemented and monitored', lineItemZh: '描述在拣选供应商时促使多用环保产品及服务的惯例，以及相关执行及监察方法', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  // B6 Product responsibility
  { subsection: 'B6 Product responsibility', griCode: 'HKEX-B6-GD', lineItem: 'B6 General disclosure: policies and compliance relating to health and safety, advertising, labelling and privacy matters of products and services provided, and methods of redress', lineItemZh: 'B6 一般披露：有关所提供产品和服务的健康与安全、广告、标签及私隐事宜以及补救方法的政策及合规资料', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'B6 Product responsibility', griCode: 'HKEX-B6.1', lineItem: 'Percentage of total products sold or shipped subject to recalls for safety and health reasons', lineItemZh: '已售或已运送产品总数中因安全与健康理由而须回收的百分比', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'B6 Product responsibility', griCode: 'HKEX-B6.2', lineItem: 'Number of products and service related complaints received and how they are dealt with', lineItemZh: '接获关于产品及服务的投诉数目以及应对方法', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'B6 Product responsibility', griCode: 'HKEX-B6.3', lineItem: 'Practices relating to observing and protecting intellectual property rights', lineItemZh: '描述与维护及保障知识产权有关的惯例', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'B6 Product responsibility', griCode: 'HKEX-B6.4', lineItem: 'Quality assurance process and recall procedures', lineItemZh: '描述质量检定过程及产品回收程序', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'B6 Product responsibility', griCode: 'HKEX-B6.5', lineItem: 'Consumer data protection and privacy policies, and how they are implemented and monitored', lineItemZh: '描述消费者资料保障及私隐政策，以及相关执行及监察方法', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  // B7 Anti-corruption
  { subsection: 'B7 Anti-corruption', griCode: 'HKEX-B7-GD', lineItem: 'B7 General disclosure: policies and compliance relating to bribery, extortion, fraud and money laundering', lineItemZh: 'B7 一般披露：有关防止贿赂、勒索、欺诈及洗黑钱的政策及合规资料', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'B7 Anti-corruption', griCode: 'HKEX-B7.1', lineItem: 'Number of concluded legal cases regarding corrupt practices brought against the issuer or its employees during the reporting period, and the outcomes', lineItemZh: '于汇报期内对发行人或其雇员提出并已审结的贪污诉讼案件的数目及诉讼结果', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'B7 Anti-corruption', griCode: 'HKEX-B7.2', lineItem: 'Preventive measures and whistle-blowing procedures, and how they are implemented and monitored', lineItemZh: '描述防范措施及举报程序，以及相关执行及监察方法', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'B7 Anti-corruption', griCode: 'HKEX-B7.3', lineItem: 'Anti-corruption training provided to directors and staff', lineItemZh: '描述向董事及员工提供的反贪污培训', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  // B8 Community investment
  { subsection: 'B8 Community investment', griCode: 'HKEX-B8-GD', lineItem: "B8 General disclosure: policies on community engagement to understand the needs of the communities where the issuer operates and to ensure its activities take into consideration the communities' interests", lineItemZh: 'B8 一般披露：有关以社区参与来了解营运所在社区需要和确保其业务活动会考虑社区利益的政策', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'B8 Community investment', griCode: 'HKEX-B8.1', lineItem: 'Focus areas of contribution (e.g. education, environmental concerns, labour needs, health, culture, sport)', lineItemZh: '专注贡献范畴（如教育、环境事宜、劳工需求、健康、文化、体育）', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'B8 Community investment', griCode: 'HKEX-B8.2', lineItem: 'Resources contributed (e.g. money or time) to the focus area', lineItemZh: '在专注范畴所动用资源（如金钱或时间）', unit: 'HKD', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
]

export const HKEX_ESG_ITEMS: ItemSpec[] = [
  ...HKEX_MANDATORY, ...HKEX_CLIMATE, ...HKEX_A, ...HKEX_B,
]

import type { Sql } from './_db'

/**
 * Idempotent upsert that also backfills `line_item_zh` on re-runs. See the
 * note in _cnSseSeed.ts: the NULL-safe UPDATE-then-INSERT avoids duplicating
 * narrative rows whose scope_split is NULL.
 */
export async function seedHKEXESG(sql: Sql): Promise<void> {
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS framework_id TEXT`
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS line_item_zh TEXT`
  // One HTTP round trip, one transaction: either the whole catalogue lands or none of it.
  await sql.transaction(txn => HKEX_ESG_ITEMS.map(it => txn`
      WITH upd AS (
        UPDATE questionnaire_item
           SET line_item_zh = ${it.lineItemZh}::text
         WHERE gri_code = ${it.griCode}::text
           AND line_item = ${it.lineItem}::text
           AND scope_split IS NOT DISTINCT FROM ${it.scopeSplit}::text
           AND reporting_scope = ${REPORTING_SCOPE}::text
        RETURNING id
      )
      INSERT INTO questionnaire_item
        (framework_id, section, subsection, gri_code, line_item, line_item_zh, unit, scope_split,
         has_target, requires_coverage, default_workflow_role, entry_mode_default,
         footnote_refs, reporting_scope)
      SELECT
        ${FRAMEWORK_ID}::text, ${SECTION}::text, ${it.subsection}::text, ${it.griCode}::text,
        ${it.lineItem}::text, ${it.lineItemZh}::text, ${it.unit}::text, ${it.scopeSplit}::text,
        ${it.hasTarget}::boolean, ${it.requiresCoverage}::boolean,
        ${it.defaultRole}::text, ${it.entryMode}::text, '[]'::jsonb, ${REPORTING_SCOPE}::text
      WHERE NOT EXISTS (SELECT 1 FROM upd)
      ON CONFLICT (gri_code, line_item, scope_split, reporting_scope)
        DO UPDATE SET line_item_zh = EXCLUDED.line_item_zh
    `))
  // Intentionally no per-org enablement here: orgs opt in via Settings.
}
