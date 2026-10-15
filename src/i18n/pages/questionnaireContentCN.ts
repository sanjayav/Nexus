/**
 * Chinese overlays for the mainland-China framework pack authored in English in
 * `src/data/mockData.cn.ts` (绿源控股集团 tenant). Same shape and lookup rules as
 * `questionnaireContent.ts`: section titles by section id; field labels / hints by
 * `${sectionId}.${fieldId}` or bare field id; tags, owners and units by their English text.
 * Answer values are tenant data (already Chinese) and are not translated.
 *
 * Standards referenced (official Chinese names):
 * - CN-SSE   上海、深圳、北京证券交易所《上市公司自律监管指引——可持续发展报告（试行）》（2024 年）
 * - CN-CSDS  财政部《企业可持续披露准则——基本准则》（2024 年 12 月）及《企业可持续披露准则第 1 号——气候（试行）》
 * - HKEX-ESG 香港联合交易所《主板上市规则》附录 C2《环境、社会及管治守则》
 * - China-ESG 中国社会科学院《中国企业社会责任报告指南（CASS-ESG 5.0）》
 * - GRI      全球报告倡议组织《GRI 可持续发展报告标准》
 * - IFRS-S2  国际可持续准则理事会《国际财务报告可持续披露准则第 2 号——气候相关披露》
 */

export const sectionTitlesZhCN: Record<string, string> = {
  // CN-SSE — 上市公司自律监管指引——可持续发展报告（试行）
  'CNSSE-GEN': '交易所指引 – 报告编制基础与双重重要性评估',
  'CNSSE-CLIM-GOV': '交易所指引 – 应对气候变化 · 治理与战略',
  'CNSSE-CLIM-IRO': '交易所指引 – 应对气候变化 · 影响、风险和机遇管理',
  'CNSSE-CLIM-MT': '交易所指引 – 应对气候变化 · 指标与目标（温室气体排放）',
  'CNSSE-POLL': '交易所指引 – 污染防治与生态系统保护',
  'CNSSE-RES': '交易所指引 – 资源利用与循环经济',
  'CNSSE-RURAL': '交易所指引 – 乡村振兴与社会贡献',
  'CNSSE-INNOV': '交易所指引 – 创新驱动与科技伦理',
  'CNSSE-SUPPLY': '交易所指引 – 供应商与客户',
  'CNSSE-EMP': '交易所指引 – 员工',
  'CNSSE-SGOV': '交易所指引 – 可持续发展相关治理（尽职调查、利益相关方沟通、商业行为）',
  // CN-CSDS — 企业可持续披露准则
  'CNCSDS-GOV': '可持续披露准则 – 治理',
  'CNCSDS-STRAT': '可持续披露准则 – 战略',
  'CNCSDS-IRO': '可持续披露准则 – 影响、风险和机遇管理',
  'CNCSDS-MT': '可持续披露准则 – 指标和目标',
  'CNCSDS-GHG': '气候准则（试行）– 温室气体排放核算',
  // HKEX-ESG — 环境、社会及管治守则
  'HKEX-GOV': '港交所 – 管治架构及董事会声明（强制披露）',
  'HKEX-PRIN': '港交所 – 汇报原则及汇报范围（强制披露）',
  'HKEX-CLIM': '港交所 – 气候相关披露（与 IFRS S2 一致）',
  'HKEX-A1': '港交所 – A1 排放物',
  'HKEX-A2A3': '港交所 – A2 资源使用及 A3 环境及天然资源',
  'HKEX-B1B4': '港交所 – B1–B4 雇佣及劳工常规',
  'HKEX-B5B6': '港交所 – B5 供应链管理及 B6 产品责任',
  'HKEX-B7B8': '港交所 – B7 反贪污及 B8 社区投资',
  // China-ESG — CASS-ESG 5.0
  'CASS5-G': 'CASS-ESG 5.0 – 治理（G）',
  'CASS5-E': 'CASS-ESG 5.0 – 环境（E）',
  'CASS5-S': 'CASS-ESG 5.0 – 社会（S）',
  'CASS5-V': 'CASS-ESG 5.0 – 价值创造（V）',
  // GRI
  'CNGRI-2-1': 'GRI 2-1：组织详情',
  'CNGRI-2-7': 'GRI 2-7：员工',
  'CNGRI-3': 'GRI 3-1 / 3-2：确定实质性议题的流程及实质性议题清单',
  'CNGRI-305': 'GRI 305-1 至 305-4：温室气体排放及排放强度',
  'CNGRI-403-404': 'GRI 403-9 / 404-1：工伤及培训时数',
  // IFRS S2
  'CNS2-GOV': 'IFRS S2 – 治理',
  'CNS2-STRAT': 'IFRS S2 – 战略（含气候韧性与情景分析）',
  'CNS2-RM': 'IFRS S2 – 风险管理',
  'CNS2-MT': 'IFRS S2 – 指标和目标',
}

/** Keyed by field id (unique across the CN pack) or `sectionId.fieldId`. */
export const fieldLabelsZhCN: Record<string, string> = {
  // CNSSE-GEN
  sse_report_scope: '报告主体、报告期间及报告范围',
  sse_dm_process: '双重重要性评估流程（财务重要性与影响重要性）',
  sse_dm_results: '实质性议题及重要性矩阵',
  sse_dm_changes: '与上一报告期相比的变化',
  // CNSSE-CLIM-GOV
  sse_clim_governance: '负责监督气候相关事项的治理机构及管理层职责',
  sse_clim_strategy: '气候相关风险和机遇及其对战略和商业模式的影响',
  sse_clim_scenario: '气候情景分析及韧性评估',
  sse_clim_transition: '转型计划及气候适应措施',
  // CNSSE-CLIM-IRO
  sse_clim_iro_process: '识别、评估和监控气候相关影响、风险和机遇的流程',
  sse_clim_iro_integration: '与整体风险管理体系的融合',
  // CNSSE-CLIM-MT (field ids shared with the GHG breakdown component, so section-qualified)
  'CNSSE-CLIM-MT.scope1_total': '范围一温室气体排放量（tCO2e）',
  'CNSSE-CLIM-MT.scope1_gases': '纳入核算的温室气体种类',
  'CNSSE-CLIM-MT.scope1_sources': '排放源（在“排放源明细”中维护）',
  'CNSSE-CLIM-MT.scope1_methodology': '核算方法',
  'CNSSE-CLIM-MT.scope2_location': '范围二排放量 – 基于位置（tCO2e）',
  'CNSSE-CLIM-MT.scope2_market': '范围二排放量 – 基于市场（tCO2e）',
  'CNSSE-CLIM-MT.scope3_total': '范围三排放量（如披露）',
  'CNSSE-CLIM-MT.ghg_targets': '温室气体减排目标及进展',
  // CNSSE-POLL
  sse_pollutants: '污染物排放（废水、废气）及治理措施',
  sse_waste: '危险废物与一般废弃物的产生及处置',
  sse_biodiversity: '生态系统和生物多样性保护',
  sse_env_compliance: '环境合规管理及处罚情况',
  // CNSSE-RES
  sse_energy: '能源利用：消耗总量、结构及强度',
  sse_water: '水资源利用：取水量、耗水量及效率',
  sse_circular: '循环经济：回收利用、产品回收及资源效率',
  // CNSSE-RURAL
  sse_rural: '乡村振兴：规划、投入及成效',
  sse_social_contribution: '社会贡献：捐赠、公益及志愿服务',
  // CNSSE-INNOV
  sse_innovation: '研发投入、创新成果及知识产权保护',
  sse_tech_ethics: '科技伦理：治理机制及审查情况',
  // CNSSE-SUPPLY
  sse_supply_security: '供应链安全：关键物料与供应链韧性',
  sse_sme_fair: '平等对待中小企业（付款期限、账款拖欠）',
  sse_product_quality: '产品和服务安全与质量',
  sse_data_privacy: '数据安全与客户隐私保护',
  // CNSSE-EMP
  sse_emp_profile: '员工构成及多元化',
  sse_emp_rights: '员工权益、薪酬及福利',
  sse_emp_safety: '职业健康与安全',
  sse_emp_training: '培训与职业发展',
  // CNSSE-SGOV
  sse_due_diligence: '可持续发展相关尽职调查',
  sse_stakeholder: '利益相关方沟通',
  sse_anti_bribery: '反商业贿赂及反贪污',
  sse_fair_competition: '反不正当竞争',

  // CN-CSDS
  csds_gov_body: '负责监督可持续相关风险和机遇的治理机构',
  csds_gov_mgmt: '管理层在治理流程、控制和程序中的职责',
  csds_strat_iro: '可合理预期影响企业的可持续相关风险和机遇',
  csds_strat_financial: '当期及预期财务影响',
  csds_strat_resilience: '战略和商业模式的韧性',
  csds_iro_process: '识别、评估、排序和监控影响、风险和机遇的流程',
  csds_iro_integration: '与整体风险管理流程的融合',
  csds_mt_metrics: '用于计量和监控可持续相关风险和机遇的指标',
  csds_mt_targets: '设定的目标及进展',
  csds_ghg_basis: '核算依据（GB/T 32150 及生态环境部行业指南）与组织边界',
  csds_ghg_scope12: '范围一和范围二排放量',
  csds_ghg_scope3: '分类别范围三排放量',

  // HKEX-ESG
  hkex_board_statement: '董事会声明：对环境、社会及管治事宜的监管、管理方针及目标进展检讨',
  hkex_gov_structure: '环境、社会及管治架构',
  hkex_principles: '汇报原则的应用：重要性、量化、一致性',
  hkex_boundary: '汇报范围及确定纳入实体的过程',
  hkex_clim_gov_strategy: '气候相关风险和机遇的管治、策略及风险管理',
  hkex_scope12: '范围一及范围二温室气体排放',
  hkex_scope3: '范围三温室气体排放',
  hkex_clim_financial: '气候相关风险和机遇的当前及预期财务影响',
  hkex_a1_air: 'A1.1 排放物种类及相关排放数据',
  hkex_a1_waste: 'A1.3 / A1.4 有害及无害废弃物总量及密度',
  hkex_a1_measures: 'A1.5 / A1.6 排放量目标、减废目标及所采取的步骤',
  hkex_a2_energy: 'A2.1 按类型划分的直接及间接能源总耗量及密度',
  hkex_a2_water: 'A2.2 总耗水量及密度',
  hkex_a2_packaging: 'A2.5 制成品所用包装材料总量',
  hkex_a3_impacts: 'A3.1 业务活动对环境及天然资源的重大影响及已采取的行动',
  hkex_b1_workforce: 'B1.1 / B1.2 按性别、年龄组别及地区划分的雇员总数及流失比率',
  hkex_b2_safety: 'B2.1 / B2.2 因工亡故人数及因工伤损失工作日数',
  hkex_b3_training: 'B3.1 / B3.2 受训雇员百分比及平均受训时数',
  hkex_b4_labour: 'B4.1 / B4.2 防止童工及强制劳工的措施',
  hkex_b5_suppliers: 'B5.1 按地区划分的供应商数目',
  hkex_b5_practices: 'B5.2–B5.4 供应商管理惯例及环境、社会风险管理',
  hkex_b6_recall: 'B6.1 / B6.2 因安全与健康理由回收的产品及接获的投诉',
  hkex_b6_ip_privacy: 'B6.3 / B6.5 知识产权及消费者资料保障',
  hkex_b7_cases: 'B7.1 已审结的贪污诉讼案件',
  hkex_b7_training: 'B7.3 向董事及员工提供的反贪污培训',
  hkex_b8_investment: 'B8.1 / B8.2 专注贡献范畴及动用资源',

  // China-ESG (CASS-ESG 5.0)
  cass5_g_board: '董事会结构、多元化及 ESG 监督',
  cass5_g_party: '党建引领与公司治理融合',
  cass5_e_climate: '应对气候变化及排放',
  cass5_e_resources: '资源利用与污染防治',
  cass5_s_employees: '员工权益、安全与发展',
  cass5_s_community: '社区参与与乡村振兴',
  cass5_v_economic: '经济价值创造与分配（营业收入、纳税、研发）',
  cass5_v_green: '绿色产品与服务贡献',

  // GRI
  cngri_org_name: '法定名称',
  cngri_org_nature: '所有权性质和法律形式',
  cngri_org_hq: '总部所在地',
  cngri_org_countries: '运营所在国家/地区',
  cngri_emp_total: '员工总数',
  cngri_emp_gender: '按性别划分的员工',
  cngri_emp_contract: '长期员工与临时员工',
  cngri_mat_process: '确定实质性议题的流程',
  cngri_mat_list: '实质性议题清单',
  cngri_305_1: '直接（范围一）温室气体排放',
  cngri_305_2: '能源间接（范围二）温室气体排放 – 基于位置 / 基于市场',
  cngri_305_3: '其他间接（范围三）温室气体排放',
  cngri_305_4: '温室气体排放强度',
  cngri_403_fatal: '因工伤导致的死亡人数',
  cngri_403_ltifr: '损工事故率（每百万工时）',
  cngri_404_avg: '每名员工平均培训小时数',

  // IFRS S2
  cns2_gov_body: '负责监督气候相关风险和机遇的治理机构',
  cns2_gov_mgmt: '管理层的职责',
  cns2_strat_ro: '气候相关风险和机遇及时间范围',
  cns2_strat_financial: '当期及预期财务影响',
  cns2_strat_resilience: '气候韧性（情景分析）',
  cns2_rm_process: '识别、评估、排序和监控气候相关风险的流程',
  cns2_rm_integration: '与整体风险管理流程的融合',
  cns2_mt_ghg: '范围一、二、三温室气体排放',
  cns2_mt_carbon_price: '内部碳价',
  cns2_mt_targets: '气候相关目标及进展',
}

/** The CN dataset authors no field hints (the shared section type has no `hint`); kept for API parity. */
export const fieldHintsZhCN: Record<string, string> = {}

export const tagsZhCN: Record<string, string> = {
  // Framework chips
  SSE: '交易所指引',
  CSDS: '可持续披露准则',
  HKEX: '港交所',
  CASS: 'CASS-ESG',
  GRI: 'GRI',
  'IFRS S2': 'IFRS S2',
  // Topics
  'Double materiality': '双重重要性',
  Materiality: '重要性',
  Stakeholders: '利益相关方',
  Climate: '应对气候变化',
  Governance: '治理',
  Strategy: '战略',
  IRO: '影响、风险和机遇',
  'Risk management': '风险管理',
  'Scenario analysis': '情景分析',
  'Metrics & targets': '指标与目标',
  GHG: '温室气体',
  'Scope 1': '范围一',
  'Scope 2': '范围二',
  'Scope 3': '范围三',
  Pollution: '污染防治',
  Biodiversity: '生物多样性',
  Compliance: '合规',
  Energy: '能源',
  Water: '水资源',
  'Circular economy': '循环经济',
  Resources: '资源使用',
  Emissions: '排放物',
  Environment: '环境',
  'Rural revitalization': '乡村振兴',
  'Social contribution': '社会贡献',
  Innovation: '创新驱动',
  'Ethics of S&T': '科技伦理',
  'Supply chain': '供应链',
  SMEs: '中小企业',
  'Product quality': '产品质量',
  'Product responsibility': '产品责任',
  'Data security': '数据安全',
  Employees: '员工',
  Employment: '雇佣',
  Workforce: '员工构成',
  Safety: '安全生产',
  'Health & safety': '健康与安全',
  Training: '培训',
  'Labour standards': '劳工准则',
  'Due diligence': '尽职调查',
  'Anti-corruption': '反贪污',
  'Fair competition': '公平竞争',
  Community: '社区投资',
  Social: '社会',
  Mandatory: '强制披露',
  'Board statement': '董事会声明',
  'Reporting principles': '汇报原则',
  Boundary: '汇报范围',
  'General disclosures': '一般披露',
  'Value creation': '价值创造',
}

/** Department owners. Personal names (e.g. 陈思远) are already Chinese and stay as-is. */
export const ownersZhCN: Record<string, string> = {
  'Board Office': '董事会办公室',
  'Securities Dept.': '证券部',
  'Sustainability Office': '可持续发展办公室',
  'EHS Dept.': '安环部',
  'HR Dept.': '人力资源部',
  'Finance Dept.': '财务部',
  'Procurement Dept.': '采购部',
  'R&D Center': '研究院',
  'Risk Management Dept.': '风险管理部',
  'Legal & Compliance': '法务合规部',
  'Rural Revitalization Office': '乡村振兴工作办公室',
}

export const unitsZhCN: Record<string, string> = {
  tCO2e: '吨二氧化碳当量',
  kgCO2e: '千克二氧化碳当量',
  MtCO2e: '百万吨二氧化碳当量',
  tce: '吨标准煤',
  MWh: '兆瓦时',
  GJ: '吉焦',
  'm³': '立方米',
  Headcount: '人数',
  Count: '数量',
  Rate: '比率',
  Hours: '小时',
}
