// CN-SSE — Shanghai / Shenzhen / Beijing Stock Exchange self-regulatory
// guidelines for listed companies on sustainability reporting (trial), 2024:
// 上海、深圳、北京证券交易所《上市公司自律监管指引——可持续发展报告（试行）》.
//
// Structure follows the guidelines: reporting basis and double-materiality
// assessment (财务重要性 / 影响重要性); sustainability governance; 应对气候变化
// under the four elements (治理 / 战略 / 影响、风险和机遇管理 / 指标与目标);
// environment (污染防治与生态系统保护, 资源利用与循环经济, 环境合规管理);
// social (乡村振兴与社会贡献, 创新驱动与科技伦理, 供应商与客户, 员工); and
// sustainability-related governance (尽职调查, 利益相关方沟通, 反商业贿赂及反贪污,
// 反不正当竞争).
//
// Codes are TOPIC-based (CNSSE-<topic>-<n>) — they are deliberately not article
// numbers, so they stay stable if the exchanges renumber the guideline.
//
// `lineItem` is the canonical English text and part of the questionnaire_item
// conflict key. `lineItemZh` is the Simplified Chinese wording shown when the
// UI language is zh (see src/lib/itemLabel.ts).
//
// Unlike the older seeders, this one does NOT switch the framework on for any
// organisation: tenants opt in from Settings → Frameworks.

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

const SECTION = 'CN-SSE Sustainability Reporting Guidelines'
const FRAMEWORK_ID = 'cn-sse'
const REPORTING_SCOPE: ReportingScope = 'group'

// ── Reporting basis ─────────────────────────────────────────────────────────
const SSE_GEN: ItemSpec[] = [
  { subsection: 'Reporting basis', griCode: 'CNSSE-GEN-1', lineItem: 'Reporting entity, reporting period and reporting boundary (consistent with the consolidated financial statements)', lineItemZh: '报告主体、报告期间及报告范围（与合并财务报表范围一致）', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Reporting basis', griCode: 'CNSSE-GEN-1', lineItem: 'Standards, guidelines and frameworks referenced in preparing the report', lineItemZh: '报告编制所依据或参照的准则、指引及框架', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Reporting basis', griCode: 'CNSSE-GEN-1', lineItem: 'Whether the report has been assured or verified by an independent third party', lineItemZh: '报告是否经独立第三方鉴证或审验', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Reporting basis', griCode: 'CNSSE-GEN-1', lineItem: 'Board review and approval of the sustainability report', lineItemZh: '董事会对可持续发展报告的审议情况', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'TL', entryMode: 'Manual' },
]

// ── Double materiality assessment ───────────────────────────────────────────
const SSE_DM: ItemSpec[] = [
  { subsection: 'Double materiality assessment', griCode: 'CNSSE-DM-1', lineItem: 'Process for identifying sustainability topics and assessing double materiality', lineItemZh: '可持续发展议题识别及双重重要性评估流程', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Double materiality assessment', griCode: 'CNSSE-DM-1', lineItem: 'Topics assessed as financially material (effects on enterprise value)', lineItemZh: '具有财务重要性的议题（对企业价值的影响）', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Double materiality assessment', griCode: 'CNSSE-DM-1', lineItem: 'Topics assessed as impact material (impacts on the economy, society and environment)', lineItemZh: '具有影响重要性的议题（对经济、社会和环境的影响）', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Double materiality assessment', griCode: 'CNSSE-DM-1', lineItem: 'List of material topics (materiality matrix) and changes from the prior period', lineItemZh: '重要性议题清单（重要性矩阵）及与上一报告期相比的变化', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Double materiality assessment', griCode: 'CNSSE-DM-1', lineItem: 'Explanation for guideline topics assessed as not material', lineItemZh: '对指引所列议题经评估不具有重要性的说明', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// ── Sustainability governance structure ─────────────────────────────────────
const SSE_GOV: ItemSpec[] = [
  { subsection: 'Sustainability governance', griCode: 'CNSSE-GOV-1', lineItem: 'Governance bodies responsible for overseeing sustainability-related impacts, risks and opportunities', lineItemZh: '负责监督可持续发展相关影响、风险和机遇的治理机构及其监督方式', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'TL', entryMode: 'Manual' },
  { subsection: 'Sustainability governance', griCode: 'CNSSE-GOV-1', lineItem: "Management's role and internal controls for sustainability matters", lineItemZh: '管理层在可持续发展相关事项中的职责及内部控制', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Sustainability governance', griCode: 'CNSSE-GOV-1', lineItem: 'Whether sustainability performance is linked to remuneration', lineItemZh: '可持续发展相关绩效是否与薪酬挂钩', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// ── Climate (应对气候变化) — governance / strategy / IRO management ─────────
const SSE_CLIM: ItemSpec[] = [
  { subsection: 'Climate — Governance', griCode: 'CNSSE-CLIM-1', lineItem: 'Governance body or individual responsible for overseeing climate-related risks and opportunities', lineItemZh: '负责监督气候相关风险和机遇的治理机构或个人', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'TL', entryMode: 'Manual' },
  { subsection: 'Climate — Governance', griCode: 'CNSSE-CLIM-1', lineItem: "Management's role in assessing and managing climate-related matters", lineItemZh: '管理层在评估和管理气候相关事项中的职责', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — Strategy', griCode: 'CNSSE-CLIM-2', lineItem: 'Climate-related risks and opportunities identified and their time horizons', lineItemZh: '已识别的气候相关风险和机遇及其时间范围', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — Strategy', griCode: 'CNSSE-CLIM-2', lineItem: 'Effects of climate-related risks and opportunities on the business model, value chain and strategy', lineItemZh: '气候相关风险和机遇对商业模式、价值链和战略的影响', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — Strategy', griCode: 'CNSSE-CLIM-2', lineItem: 'Current and anticipated financial effects of climate-related risks and opportunities', lineItemZh: '气候相关风险和机遇当期及预期的财务影响', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Climate — Strategy', griCode: 'CNSSE-CLIM-2', lineItem: 'Climate resilience assessment and scenario analysis', lineItemZh: '气候韧性评估及情景分析', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — Strategy', griCode: 'CNSSE-CLIM-2', lineItem: 'Transition plan and climate adaptation measures', lineItemZh: '转型计划及气候适应措施', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — Impact, risk and opportunity management', griCode: 'CNSSE-CLIM-3', lineItem: 'Processes to identify, assess, prioritise and monitor climate-related risks and opportunities', lineItemZh: '识别、评估、排序和监控气候相关风险和机遇的流程', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — Impact, risk and opportunity management', griCode: 'CNSSE-CLIM-3', lineItem: 'Integration of climate-related risk management into the overall risk management system', lineItemZh: '气候相关风险管理与整体风险管理体系的融合', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// ── Climate — metrics and targets (GHG, calculator-linked) ──────────────────
const SSE_CLIM_MT: ItemSpec[] = [
  { subsection: 'Climate — Metrics and targets', griCode: 'CNSSE-CLIM-4', lineItem: 'Scope 1 GHG emissions', lineItemZh: '范围一温室气体排放量', unit: 'tCO2e', scopeSplit: 'scope_1', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'Climate — Metrics and targets', griCode: 'CNSSE-CLIM-4', lineItem: 'Scope 2 GHG emissions (location-based)', lineItemZh: '范围二温室气体排放量（基于位置）', unit: 'tCO2e', scopeSplit: 'scope_2_location', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'Climate — Metrics and targets', griCode: 'CNSSE-CLIM-4', lineItem: 'Scope 3 GHG emissions (where applicable)', lineItemZh: '范围三温室气体排放量（如适用）', unit: 'tCO2e', scopeSplit: 'scope_3', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'Climate — Metrics and targets', griCode: 'CNSSE-CLIM-4', lineItem: 'Total Scope 1 and Scope 2 GHG emissions', lineItemZh: '范围一和范围二温室气体排放总量', unit: 'tCO2e', scopeSplit: 'scope_1_2', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'Climate — Metrics and targets', griCode: 'CNSSE-CLIM-4', lineItem: 'GHG emissions intensity per unit of operating revenue', lineItemZh: '单位营业收入温室气体排放强度', unit: 'tCO2e/CNY million', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'Climate — Metrics and targets', griCode: 'CNSSE-CLIM-4', lineItem: 'GHG accounting methodology, standards and emission factors used', lineItemZh: '温室气体排放核算方法、所依据的标准及排放因子', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — Metrics and targets', griCode: 'CNSSE-CLIM-5', lineItem: 'GHG emission reduction targets, including carbon peaking and carbon neutrality goals', lineItemZh: '温室气体减排目标（含碳达峰、碳中和目标）', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — Metrics and targets', griCode: 'CNSSE-CLIM-5', lineItem: 'Progress against GHG emission reduction targets', lineItemZh: '温室气体减排目标的完成进展', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — Metrics and targets', griCode: 'CNSSE-CLIM-5', lineItem: 'Emission reduction measures taken and their effects', lineItemZh: '已采取的减排措施及成效', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — Metrics and targets', griCode: 'CNSSE-CLIM-5', lineItem: 'Participation in carbon emissions trading and voluntary GHG emission reduction trading', lineItemZh: '参与碳排放权交易及温室气体自愿减排交易的情况', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// ── Environment — pollution prevention and ecosystem protection ─────────────
const SSE_POLL: ItemSpec[] = [
  { subsection: 'Pollutant emissions', griCode: 'CNSSE-POL-1', lineItem: 'Wastewater discharged', lineItemZh: '废水排放量', unit: 'm3', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Pollutant emissions', griCode: 'CNSSE-POL-1', lineItem: 'Major water pollutants discharged (e.g. COD, ammonia nitrogen)', lineItemZh: '主要水污染物排放量（如化学需氧量、氨氮）', unit: 't', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Pollutant emissions', griCode: 'CNSSE-POL-1', lineItem: 'Major air pollutants emitted (e.g. SO2, NOx, particulate matter)', lineItemZh: '主要大气污染物排放量（如二氧化硫、氮氧化物、颗粒物）', unit: 't', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Pollutant emissions', griCode: 'CNSSE-POL-1', lineItem: 'Pollution prevention and control measures and compliance with pollutant discharge permits', lineItemZh: '污染防治措施及排污许可执行情况', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Waste management', griCode: 'CNSSE-WST-1', lineItem: 'Hazardous waste generated', lineItemZh: '危险废物产生量', unit: 't', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Waste management', griCode: 'CNSSE-WST-1', lineItem: 'Non-hazardous (general) waste generated', lineItemZh: '一般废弃物产生量', unit: 't', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Waste management', griCode: 'CNSSE-WST-1', lineItem: 'Waste treatment and disposal methods and waste reduction measures', lineItemZh: '废弃物处理处置方式及减量化措施', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Ecosystem and biodiversity protection', griCode: 'CNSSE-BIO-1', lineItem: 'Operations located in or adjacent to ecologically sensitive areas (e.g. ecological protection red lines)', lineItemZh: '位于或邻近生态敏感区域（如生态保护红线）的运营场所', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Ecosystem and biodiversity protection', griCode: 'CNSSE-BIO-1', lineItem: 'Ecosystem and biodiversity protection and restoration measures', lineItemZh: '生态系统和生物多样性保护与修复措施', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Environmental compliance management', griCode: 'CNSSE-ENVC-1', lineItem: 'Environmental management system and certification (e.g. ISO 14001)', lineItemZh: '环境管理体系建设及认证情况（如 ISO 14001）', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Environmental compliance management', griCode: 'CNSSE-ENVC-1', lineItem: 'Whether the company or its subsidiaries are key pollutant-discharging entities', lineItemZh: '公司或其子公司是否属于重点排污单位', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Environmental compliance management', griCode: 'CNSSE-ENVC-1', lineItem: 'Number of environmental administrative penalties received', lineItemZh: '受到环境行政处罚的次数', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Environmental compliance management', griCode: 'CNSSE-ENVC-1', lineItem: 'Amount of environmental fines', lineItemZh: '环境行政处罚罚没金额', unit: 'CNY', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
]

// ── Environment — resource use and circular economy ─────────────────────────
const SSE_RES: ItemSpec[] = [
  { subsection: 'Energy use', griCode: 'CNSSE-ENE-1', lineItem: 'Total comprehensive energy consumption', lineItemZh: '综合能源消费总量', unit: 'tce', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Energy use', griCode: 'CNSSE-ENE-1', lineItem: 'Electricity consumption', lineItemZh: '电力消耗量', unit: 'MWh', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Energy use', griCode: 'CNSSE-ENE-1', lineItem: 'Share of renewable energy in total energy consumption', lineItemZh: '可再生能源使用量占能源消费总量的比例', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Energy use', griCode: 'CNSSE-ENE-1', lineItem: 'Energy consumption intensity per unit of operating revenue', lineItemZh: '单位营业收入能源消耗强度', unit: 'tce/CNY million', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'Energy use', griCode: 'CNSSE-ENE-1', lineItem: 'Energy conservation targets and measures', lineItemZh: '节能目标及措施', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Water resource use', griCode: 'CNSSE-WAT-1', lineItem: 'Total water withdrawal', lineItemZh: '取水总量', unit: 'm3', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Water resource use', griCode: 'CNSSE-WAT-1', lineItem: 'Total water consumption', lineItemZh: '耗水总量', unit: 'm3', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Water resource use', griCode: 'CNSSE-WAT-1', lineItem: 'Water use intensity per unit of operating revenue', lineItemZh: '单位营业收入用水强度', unit: 'm3/CNY million', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'Water resource use', griCode: 'CNSSE-WAT-1', lineItem: 'Water-saving measures and water recycling rate', lineItemZh: '节水措施及水重复利用率', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Circular economy', griCode: 'CNSSE-CIR-1', lineItem: 'Recycled materials used and waste recovered for resource utilisation', lineItemZh: '再生资源利用量及废弃物资源化利用量', unit: 't', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Circular economy', griCode: 'CNSSE-CIR-1', lineItem: 'Circular economy initiatives (eco-design, product take-back, remanufacturing)', lineItemZh: '循环经济举措（生态设计、产品回收、再制造）', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// ── Social — rural revitalisation, social contribution, innovation ──────────
const SSE_SOC: ItemSpec[] = [
  { subsection: 'Rural revitalisation', griCode: 'CNSSE-RUR-1', lineItem: 'Rural revitalisation plans and actions', lineItemZh: '乡村振兴规划及举措', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Rural revitalisation', griCode: 'CNSSE-RUR-1', lineItem: 'Funds invested in rural revitalisation', lineItemZh: '乡村振兴投入资金', unit: 'CNY', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Rural revitalisation', griCode: 'CNSSE-RUR-1', lineItem: 'Outcomes of rural revitalisation programmes (e.g. jobs created, people supported)', lineItemZh: '乡村振兴项目成效（如带动就业、帮扶人数）', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Social contribution', griCode: 'CNSSE-SOC-1', lineItem: 'Total charitable donations and public welfare expenditure', lineItemZh: '对外捐赠及公益支出总额', unit: 'CNY', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Innovation-driven development', griCode: 'CNSSE-INN-1', lineItem: 'R&D investment', lineItemZh: '研发投入金额', unit: 'CNY', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Innovation-driven development', griCode: 'CNSSE-INN-1', lineItem: 'R&D investment as a share of operating revenue', lineItemZh: '研发投入占营业收入的比例', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Innovation-driven development', griCode: 'CNSSE-INN-1', lineItem: 'Number of R&D personnel', lineItemZh: '研发人员数量', unit: 'headcount', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Innovation-driven development', griCode: 'CNSSE-INN-1', lineItem: 'Patents granted during the reporting period', lineItemZh: '报告期内获得授权的专利数量', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Ethics of science and technology', griCode: 'CNSSE-ETH-1', lineItem: 'Science and technology ethics governance (ethics committee, review mechanisms)', lineItemZh: '科技伦理治理（科技伦理委员会、审查机制）', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Ethics of science and technology', griCode: 'CNSSE-ETH-1', lineItem: 'Major science and technology ethics risks identified and how they are managed', lineItemZh: '识别的重大科技伦理风险及应对措施', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// ── Social — suppliers and customers ────────────────────────────────────────
const SSE_SUPPLY: ItemSpec[] = [
  { subsection: 'Supply chain security', griCode: 'CNSSE-SUP-1', lineItem: 'Supply chain security and resilience measures, including for critical materials', lineItemZh: '供应链安全与韧性保障措施（含关键物料）', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Supply chain security', griCode: 'CNSSE-SUP-1', lineItem: 'Supplier environmental and social risk management', lineItemZh: '供应商环境和社会风险管理', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Fair treatment of SMEs', griCode: 'CNSSE-SME-1', lineItem: 'Measures to ensure fair treatment of small and medium-sized enterprises', lineItemZh: '平等对待中小企业的措施', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Fair treatment of SMEs', griCode: 'CNSSE-SME-1', lineItem: 'Overdue payments owed to SMEs at the end of the reporting period', lineItemZh: '报告期末逾期尚未支付中小企业款项的金额', unit: 'CNY', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Product and service safety and quality', griCode: 'CNSSE-PRD-1', lineItem: 'Product and service quality management system', lineItemZh: '产品和服务质量管理体系', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Product and service safety and quality', griCode: 'CNSSE-PRD-1', lineItem: 'Number of product recalls for safety or quality reasons', lineItemZh: '因安全或质量原因召回产品的次数', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Product and service safety and quality', griCode: 'CNSSE-PRD-1', lineItem: 'Customer complaints received and how they were handled', lineItemZh: '客户投诉数量及处理情况', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Data security and customer privacy', griCode: 'CNSSE-DAT-1', lineItem: 'Data security and customer privacy protection policies and measures', lineItemZh: '数据安全与客户隐私保护制度及措施', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Data security and customer privacy', griCode: 'CNSSE-DAT-1', lineItem: 'Number of data security or privacy breach incidents', lineItemZh: '数据安全或隐私泄露事件数量', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// ── Social — employees ──────────────────────────────────────────────────────
const SSE_EMP: ItemSpec[] = [
  { subsection: 'Employees', griCode: 'CNSSE-EMP-1', lineItem: 'Total number of employees and composition (gender, age, education)', lineItemZh: '员工总数及构成（性别、年龄、学历）', unit: 'headcount', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Employees', griCode: 'CNSSE-EMP-1', lineItem: 'Employee turnover rate', lineItemZh: '员工流失率', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Employees', griCode: 'CNSSE-EMP-1', lineItem: 'Remuneration, benefits and protection of employee rights', lineItemZh: '员工薪酬福利及权益保障', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Employees', griCode: 'CNSSE-EMP-2', lineItem: 'Occupational health and safety management', lineItemZh: '职业健康与安全管理', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Employees', griCode: 'CNSSE-EMP-2', lineItem: 'Number of work-related fatalities', lineItemZh: '因工死亡人数', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Employees', griCode: 'CNSSE-EMP-2', lineItem: 'Lost workdays due to work-related injury', lineItemZh: '因工伤损失工作日数', unit: 'days', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Employees', griCode: 'CNSSE-EMP-3', lineItem: 'Average training hours per employee', lineItemZh: '员工人均培训时长', unit: 'hours', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
]

// ── Sustainability-related governance (business conduct) ────────────────────
const SSE_SGOV: ItemSpec[] = [
  { subsection: 'Due diligence', griCode: 'CNSSE-DD-1', lineItem: 'Sustainability due diligence process and results', lineItemZh: '可持续发展相关尽职调查的流程及结果', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Stakeholder communication', griCode: 'CNSSE-STK-1', lineItem: 'Stakeholder identification and communication mechanisms', lineItemZh: '利益相关方识别及沟通机制', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Stakeholder communication', griCode: 'CNSSE-STK-1', lineItem: 'Key concerns raised by stakeholders and the company response', lineItemZh: '利益相关方关注的主要议题及公司回应', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Anti-commercial bribery and anti-corruption', griCode: 'CNSSE-ABC-1', lineItem: 'Anti-commercial bribery and anti-corruption policies and systems', lineItemZh: '反商业贿赂及反贪污制度体系', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Anti-commercial bribery and anti-corruption', griCode: 'CNSSE-ABC-1', lineItem: 'Anti-bribery and anti-corruption training provided to directors, management and employees', lineItemZh: '面向董事、管理层及员工的反商业贿赂及反贪污培训', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Anti-commercial bribery and anti-corruption', griCode: 'CNSSE-ABC-1', lineItem: 'Number of concluded legal cases regarding bribery or corruption', lineItemZh: '报告期内已审结的商业贿赂及贪污诉讼案件数量', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Anti-commercial bribery and anti-corruption', griCode: 'CNSSE-ABC-1', lineItem: 'Whistle-blowing channels and whistle-blower protection', lineItemZh: '举报渠道及举报人保护机制', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Anti-unfair competition', griCode: 'CNSSE-AUC-1', lineItem: 'Policies and measures against unfair competition', lineItemZh: '反不正当竞争制度及措施', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Anti-unfair competition', griCode: 'CNSSE-AUC-1', lineItem: 'Legal proceedings or penalties relating to unfair competition or monopolistic conduct', lineItemZh: '涉及不正当竞争或垄断行为的诉讼及处罚', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

export const CN_SSE_ITEMS: ItemSpec[] = [
  ...SSE_GEN, ...SSE_DM, ...SSE_GOV, ...SSE_CLIM, ...SSE_CLIM_MT,
  ...SSE_POLL, ...SSE_RES, ...SSE_SOC, ...SSE_SUPPLY, ...SSE_EMP, ...SSE_SGOV,
]

import type { Sql } from './_db'

/**
 * Idempotent upsert that also backfills `line_item_zh` on re-runs.
 *
 * The questionnaire_item UNIQUE key includes the nullable `scope_split`, and
 * Postgres treats NULLs as distinct — so `ON CONFLICT` alone never fires for
 * narrative rows. The CTE first updates any existing row (NULL-safe match) and
 * only inserts when nothing matched; ON CONFLICT covers the non-NULL case and
 * any concurrent run.
 */
export async function seedCNSSE(sql: Sql): Promise<void> {
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS framework_id TEXT`
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS line_item_zh TEXT`
  // One HTTP round trip, one transaction: either the whole catalogue lands or none of it.
  await sql.transaction(txn => CN_SSE_ITEMS.map(it => txn`
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
