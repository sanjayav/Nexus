import { createContext, useContext } from 'react'

/**
 * Framework catalog.
 *
 * Phase 1 ships with GRI 305 only. Every other framework is listed as
 * `coming_soon` so the Settings > Frameworks pane, selectors and badges all
 * render the product roadmap honestly. Adding a new framework in Phase 2 is a
 * single catalog entry + a seeder for its questionnaire_items — no UI rework.
 *
 * `id` is the canonical key stamped on assignments, reports, questionnaire_item
 * rows, etc. Keep it stable — it's a foreign key in spirit.
 */

export type FrameworkStatus = 'active' | 'coming_soon' | 'disabled'

export interface Framework {
  id: string
  code: string            // Short code shown in chips ('GRI 305')
  name: string            // Full human name
  body: string            // Governing organisation ('Global Reporting Initiative')
  description: string
  version: string         // '2016', 'v2024', etc.
  status: FrameworkStatus
  color: string           // CSS variable or hex for the accent chip
  coverage: string[]      // Themes / pillars ('Emissions', 'Energy', 'Water')
  questionCount?: number  // Approx. line items
  /** Simplified Chinese name / body / description, shown when the UI language is zh. */
  nameZh?: string
  bodyZh?: string
  descriptionZh?: string
  /** Simplified Chinese version label (only where the English one has words, e.g. "2024 (trial)"). */
  versionZh?: string
}

export const FRAMEWORKS: Framework[] = [
  {
    id: 'gri',
    code: 'GRI',
    name: 'GRI Standards',
    body: 'Global Reporting Initiative',
    description: 'The full GRI Standards suite — Universal (GRI 2, 3), Economic (201–207), Environmental (301–308), and Social (401–419) disclosures. Phase 1 of the platform reports against GRI as a whole.',
    version: '2021 · topic standards 2016–2020',
    versionZh: '2021 · 议题标准 2016–2020',
    status: 'active',
    color: 'var(--color-brand)',
    coverage: ['Universal', 'Economic', 'Environmental', 'Social'],
    questionCount: 2003,
    nameZh: 'GRI 标准',
    bodyZh: '全球报告倡议组织',
    descriptionZh: 'GRI 标准全集——通用标准（GRI 2、3）、经济（201–207）、环境（301–308）及社会（401–419）议题披露。平台第一阶段按 GRI 整体进行报告。',
  },
  {
    id: 'csrd-e1',
    code: 'CSRD E1',
    name: 'CSRD ESRS E1 — Climate Change',
    body: 'European Sustainability Reporting Standards',
    description: 'EU-mandated climate disclosures: transition plan, physical/transition risk, adaptation, mitigation, financed emissions.',
    version: '2024',
    status: 'active',
    color: '#2563EB',
    coverage: ['Transition plan', 'Physical risk', 'Mitigation', 'Adaptation', 'Financed emissions'],
    questionCount: 84,
    nameZh: 'CSRD ESRS E1——气候变化',
    bodyZh: '欧洲可持续发展报告准则',
    descriptionZh: '欧盟强制性气候披露：转型计划、物理风险与转型风险、减缓、适应及融资排放。',
  },
  {
    id: 'csrd-e2',
    code: 'CSRD E2',
    name: 'CSRD ESRS E2 — Pollution',
    body: 'European Sustainability Reporting Standards',
    description: 'EU-mandated pollution disclosures: emissions to air/water/soil, substances of concern, microplastics.',
    version: '2024',
    status: 'active',
    color: '#0EA5E9',
    coverage: ['Air', 'Water', 'Soil', 'Substances of concern'],
    questionCount: 31,
    nameZh: 'CSRD ESRS E2——污染',
    bodyZh: '欧洲可持续发展报告准则',
    descriptionZh: '欧盟强制性污染披露：向空气、水和土壤的排放，关注物质及微塑料。',
  },
  {
    id: 'csrd-e3',
    code: 'CSRD E3',
    name: 'CSRD ESRS E3 — Water & Marine Resources',
    body: 'European Sustainability Reporting Standards',
    description: 'Water withdrawal, consumption, discharge, water-stressed areas, and marine resource impacts.',
    version: '2024',
    status: 'active',
    color: '#06B6D4',
    coverage: ['Withdrawal', 'Consumption', 'Discharge', 'Water stress'],
    questionCount: 29,
    nameZh: 'CSRD ESRS E3——水和海洋资源',
    bodyZh: '欧洲可持续发展报告准则',
    descriptionZh: '取水、耗水、排水、水资源紧张地区及海洋资源影响。',
  },
  {
    id: 'csrd-e4',
    code: 'CSRD E4',
    name: 'CSRD ESRS E4 — Biodiversity & Ecosystems',
    body: 'European Sustainability Reporting Standards',
    description: 'Biodiversity-sensitive sites, IUCN species impacted, restoration projects, no-net-loss ambition.',
    version: '2024',
    status: 'active',
    color: '#10B981',
    coverage: ['Sites', 'Species', 'Restoration', 'Transition plan'],
    questionCount: 30,
    nameZh: 'CSRD ESRS E4——生物多样性和生态系统',
    bodyZh: '欧洲可持续发展报告准则',
    descriptionZh: '生物多样性敏感场所、受影响的 IUCN 物种、修复项目及无净损失目标。',
  },
  {
    id: 'csrd-e5',
    code: 'CSRD E5',
    name: 'CSRD ESRS E5 — Resource Use & Circular Economy',
    body: 'European Sustainability Reporting Standards',
    description: 'Material inflows, product circularity, waste by treatment route, recycled content.',
    version: '2024',
    status: 'active',
    color: '#84CC16',
    coverage: ['Inflows', 'Products', 'Waste', 'Circularity'],
    questionCount: 37,
    nameZh: 'CSRD ESRS E5——资源利用和循环经济',
    bodyZh: '欧洲可持续发展报告准则',
    descriptionZh: '物料流入、产品循环性、按处理方式划分的废弃物及再生材料含量。',
  },
  {
    id: 'csrd-s1',
    code: 'CSRD S1',
    name: 'CSRD ESRS S1 — Own Workforce',
    body: 'European Sustainability Reporting Standards',
    description: 'Workforce characteristics, diversity, collective bargaining, health & safety, training, pay gaps, incidents.',
    version: '2024',
    status: 'active',
    color: '#F97316',
    coverage: ['Headcount', 'Diversity', 'H&S', 'Training', 'Pay'],
    questionCount: 78,
    nameZh: 'CSRD ESRS S1——自有员工',
    bodyZh: '欧洲可持续发展报告准则',
    descriptionZh: '员工特征、多元化、集体谈判、健康与安全、培训、薪酬差距及相关事件。',
  },
  {
    id: 'csrd-s2',
    code: 'CSRD S2',
    name: 'CSRD ESRS S2 — Value Chain Workers',
    body: 'European Sustainability Reporting Standards',
    description: 'Human rights due diligence and severe incidents across the value chain workforce.',
    version: '2024',
    status: 'active',
    color: '#EAB308',
    coverage: ['Due diligence', 'Severe incidents', 'Remediation'],
    questionCount: 30,
    nameZh: 'CSRD ESRS S2——价值链工人',
    bodyZh: '欧洲可持续发展报告准则',
    descriptionZh: '价值链工人相关的人权尽职调查及严重事件。',
  },
  {
    id: 'csrd-s3',
    code: 'CSRD S3',
    name: 'CSRD ESRS S3 — Affected Communities',
    body: 'European Sustainability Reporting Standards',
    description: 'Engagement, grievance channels, and community impact metrics including FPIC and resettlement.',
    version: '2024',
    status: 'active',
    color: '#A855F7',
    coverage: ['Engagement', 'Grievances', 'Impact metrics'],
    questionCount: 28,
    nameZh: 'CSRD ESRS S3——受影响社区',
    bodyZh: '欧洲可持续发展报告准则',
    descriptionZh: '社区参与、申诉渠道及社区影响指标，包括自由、事先和知情同意（FPIC）及搬迁安置。',
  },
  {
    id: 'csrd-s4',
    code: 'CSRD S4',
    name: 'CSRD ESRS S4 — Consumers & End-Users',
    body: 'European Sustainability Reporting Standards',
    description: 'Product safety incidents, recalls, data privacy breaches, responsible marketing.',
    version: '2024',
    status: 'active',
    color: '#EC4899',
    coverage: ['Safety', 'Privacy', 'Marketing'],
    questionCount: 27,
    nameZh: 'CSRD ESRS S4——消费者和终端用户',
    bodyZh: '欧洲可持续发展报告准则',
    descriptionZh: '产品安全事件、召回、数据隐私泄露及负责任营销。',
  },
  {
    id: 'csrd-g1',
    code: 'CSRD G1',
    name: 'CSRD ESRS G1 — Business Conduct',
    body: 'European Sustainability Reporting Standards',
    description: 'Anti-corruption, whistleblower mechanisms, political contributions, payment practices.',
    version: '2024',
    status: 'active',
    color: '#64748B',
    coverage: ['Anti-corruption', 'Whistleblower', 'Political', 'Payments'],
    questionCount: 32,
    nameZh: 'CSRD ESRS G1——商业行为',
    bodyZh: '欧洲可持续发展报告准则',
    descriptionZh: '反腐败、举报机制、政治献金及付款实践。',
  },
  {
    id: 'issb-s1',
    code: 'ISSB S1',
    name: 'ISSB IFRS S1 — General Sustainability',
    body: 'International Sustainability Standards Board',
    description: 'Investor-grade general sustainability disclosures: governance, strategy, risk, metrics across all topics.',
    version: '2023',
    status: 'active',
    color: '#B91C1C',
    coverage: ['Governance', 'Strategy', 'Risk mgmt', 'Metrics'],
    questionCount: 33,
    nameZh: 'ISSB IFRS S1——可持续相关财务信息披露一般要求',
    bodyZh: '国际可持续准则理事会',
    descriptionZh: '面向投资者的一般可持续披露：涵盖所有议题的治理、战略、风险管理及指标。',
  },
  {
    id: 'issb-s2',
    code: 'ISSB S2',
    name: 'ISSB IFRS S2 — Climate',
    body: 'International Sustainability Standards Board',
    description: 'Investor-grade climate disclosures harmonised with TCFD, mandatory in UK and several jurisdictions from 2025.',
    version: '2023',
    status: 'active',
    color: '#DC2626',
    coverage: ['Governance', 'Strategy', 'Risk mgmt', 'Metrics', 'Industry-specific'],
    questionCount: 58,
    nameZh: 'ISSB IFRS S2——气候相关披露',
    bodyZh: '国际可持续准则理事会',
    descriptionZh: '面向投资者、与 TCFD 协调一致的气候披露，正被多个司法管辖区采纳。',
  },
  {
    id: 'tcfd',
    code: 'TCFD',
    name: 'TCFD Recommendations',
    body: 'Task Force on Climate-related Financial Disclosures',
    description: 'Four-pillar framework: Governance, Strategy, Risk Management, Metrics & Targets.',
    version: '2017',
    status: 'active',
    color: '#D97706',
    coverage: ['Governance', 'Strategy', 'Risk mgmt', 'Metrics'],
    questionCount: 27,
    nameZh: 'TCFD 建议',
    bodyZh: '气候相关财务信息披露工作组',
    descriptionZh: '四大支柱框架：治理、战略、风险管理、指标和目标。',
  },
  {
    id: 'cdp-2024',
    code: 'CDP CC',
    name: 'CDP Climate Change 2024',
    body: 'CDP Worldwide',
    description: 'Annual disclosure questionnaire across governance, risks, opportunities, targets, emissions, energy, verification, carbon pricing, and engagement.',
    version: '2024',
    status: 'active',
    color: '#7C3AED',
    coverage: ['Governance', 'Risks', 'Targets', 'Emissions', 'Energy', 'Verification'],
    questionCount: 91,
    nameZh: 'CDP 气候变化问卷 2024',
    bodyZh: 'CDP 全球环境信息研究中心',
    descriptionZh: '年度披露问卷，涵盖治理、风险、机遇、目标、排放、能源、核查、碳定价及价值链参与。',
  },
  {
    id: 'sec-climate',
    code: 'SEC',
    name: 'SEC Climate Disclosure Rule',
    body: 'U.S. Securities and Exchange Commission',
    description: 'Final 2024 SEC rule: material climate risks, governance, targets, Scope 1+2 (where material), severe-weather financial-statement impacts.',
    version: '2024',
    status: 'active',
    color: '#1E40AF',
    coverage: ['Risks', 'Governance', 'Targets', 'GHG (stayed)', 'Financial statements'],
    questionCount: 24,
    nameZh: 'SEC 气候披露规则',
    bodyZh: '美国证券交易委员会',
    descriptionZh: '2024 年 SEC 最终规则：重大气候风险、治理、目标、范围一和范围二排放（如重大）及极端天气对财务报表的影响。',
  },
  {
    id: 'ca-sb253',
    code: 'SB 253',
    name: 'California SB 253 (CCDAA)',
    body: 'California Air Resources Board',
    description: 'Scopes 1+2 from FY2026, Scope 3 from FY2027, with phased third-party assurance for $1bn+ revenue entities doing business in California.',
    version: '2023',
    status: 'active',
    color: '#0D9488',
    coverage: ['Scope 1', 'Scope 2', 'Scope 3', 'Assurance'],
    questionCount: 13,
    nameZh: '加州 SB 253（气候企业数据问责法案）',
    bodyZh: '加州空气资源委员会',
    descriptionZh: '适用于在加州开展业务、年收入超过 10 亿美元的实体：自 2026 财年起披露范围一和范围二，自 2027 财年起披露范围三，并分阶段引入第三方鉴证。',
  },
  {
    id: 'ca-sb261',
    code: 'SB 261',
    name: 'California SB 261 (Climate Risk)',
    body: 'California Air Resources Board',
    description: 'Biennial climate-related financial risk report aligned with TCFD for $500m+ revenue entities doing business in California.',
    version: '2023',
    status: 'active',
    color: '#15803D',
    coverage: ['Physical', 'Transition', 'Mitigation', 'TCFD alignment'],
    questionCount: 13,
    nameZh: '加州 SB 261（气候相关财务风险）',
    bodyZh: '加州空气资源委员会',
    descriptionZh: '适用于在加州开展业务、年收入超过 5 亿美元的实体：每两年发布一次与 TCFD 一致的气候相关财务风险报告。',
  },
  {
    id: 'eu-taxonomy',
    code: 'EU Tax',
    name: 'EU Taxonomy Alignment',
    body: 'European Commission',
    description: 'Turnover, CapEx and OpEx eligibility/alignment across the six environmental objectives, plus DNSH and minimum safeguards.',
    version: 'Reg 2020/852',
    versionZh: '条例 (EU) 2020/852',
    status: 'active',
    color: '#0369A1',
    coverage: ['Turnover', 'CapEx', 'OpEx', 'DNSH', 'Safeguards'],
    questionCount: 27,
    nameZh: '欧盟分类法一致性',
    bodyZh: '欧盟委员会',
    descriptionZh: '六项环境目标下营业额、资本支出和运营支出的合格性与一致性，以及“无重大损害”（DNSH）原则和最低保障。',
  },
  {
    id: 'cn-sse',
    code: 'SSE',
    name: 'China Exchanges Sustainability Reporting Guidelines (SSE / SZSE / BSE)',
    body: 'Shanghai, Shenzhen and Beijing Stock Exchanges',
    description: 'Self-regulatory guidelines for listed companies on sustainability reporting (trial, 2024): double materiality, climate (governance, strategy, IRO management, metrics & targets incl. Scope 1/2/3), pollution and ecosystems, resource use, rural revitalisation, innovation and S&T ethics, suppliers and customers, employees, and sustainability governance.',
    version: '2024 (trial)',
    versionZh: '2024（试行）',
    status: 'active',
    color: '#C8102E',
    coverage: ['Double materiality', 'Climate', 'Environment', 'Social', 'Governance'],
    questionCount: 90,
    nameZh: '上市公司自律监管指引——可持续发展报告（试行）',
    bodyZh: '上海证券交易所、深圳证券交易所、北京证券交易所',
    descriptionZh: '沪深北交易所上市公司可持续发展报告指引（试行，2024 年）：双重重要性评估，应对气候变化（治理、战略、影响风险和机遇管理、指标与目标，含范围一、二、三排放），污染防治与生态系统保护，资源利用，乡村振兴，创新驱动与科技伦理，供应商与客户，员工，以及可持续发展相关治理。',
  },
  {
    id: 'cn-csds',
    code: 'CSDS',
    name: 'China Corporate Sustainability Disclosure Standards (MOF)',
    body: 'Ministry of Finance of the PRC',
    description: 'Basic Standard (December 2024) and Climate Standard (trial): governance, strategy, impact/risk/opportunity management, and metrics & targets, with GHG emissions accounted consistently with GB/T 32150.',
    version: '2024 · Climate (trial)',
    versionZh: '2024 · 气候（试行）',
    status: 'active',
    color: '#9F1239',
    coverage: ['Governance', 'Strategy', 'IRO mgmt', 'Metrics & targets', 'GHG'],
    questionCount: 40,
    nameZh: '企业可持续披露准则',
    bodyZh: '中华人民共和国财政部',
    descriptionZh: '《企业可持续披露准则——基本准则》（2024 年 12 月）及气候准则（试行）：治理、战略、影响风险和机遇管理、指标和目标，温室气体排放核算与 GB/T 32150 保持一致。',
  },
  {
    id: 'hkex-esg',
    code: 'HKEX ESG',
    name: 'HKEX ESG Reporting Code (Appendix C2)',
    body: 'Hong Kong Exchanges and Clearing',
    description: 'Mandatory disclosures (board statement, reporting principles, reporting boundary), climate-related disclosures aligned with IFRS S2 (incl. Scope 1, 2 and 3), environmental KPIs A1–A3 and social KPIs B1–B8.',
    version: 'Appendix C2',
    versionZh: '附录 C2',
    status: 'active',
    color: '#0E7490',
    coverage: ['Board statement', 'Climate', 'Environmental (A1–A3)', 'Social (B1–B8)'],
    questionCount: 74,
    nameZh: '香港联交所《环境、社会及管治守则》（附录 C2）',
    bodyZh: '香港交易及结算所',
    descriptionZh: '强制披露规定（董事会声明、汇报原则、汇报范围），与 IFRS S2 一致的气候相关披露（含范围1、2、3排放），环境范畴 A1–A3 及社会范畴 B1–B8 关键绩效指标。',
  },
  {
    id: 'cass-esg',
    code: 'CASS-ESG',
    name: 'CASS-ESG 5.0 Reporting Guidelines',
    body: 'Chinese Academy of Social Sciences',
    description: 'Chinese ESG / CSR reporting guideline widely used by state-owned and listed companies, organised into governance, environment, social and value creation.',
    version: '5.0',
    status: 'active',
    color: '#B45309',
    coverage: ['Governance', 'Environment', 'Social', 'Value creation'],
    questionCount: 38,
    nameZh: '中国企业社会责任报告指南（CASS-ESG 5.0）',
    bodyZh: '中国社会科学院',
    descriptionZh: '被国有企业和上市公司广泛采用的中国 ESG／社会责任报告指南，涵盖治理、环境、社会及价值创造四个板块。',
  },
]

export const DEFAULT_FRAMEWORK_ID = 'gri'

export function getFramework(id: string): Framework | undefined {
  return FRAMEWORKS.find(f => f.id === id)
}
export function getActiveFrameworks(): Framework[] {
  return FRAMEWORKS.filter(f => f.status === 'active')
}

// ── React context ────────────────────────────────────────────────

interface FrameworkCtx {
  active: Framework
  setActive: (id: string) => void
  enabled: string[]              // ids the tenant has turned on
  setEnabled: (ids: string[]) => void
}

export const FrameworkContext = createContext<FrameworkCtx | null>(null)

export function useFramework(): FrameworkCtx {
  const ctx = useContext(FrameworkContext)
  if (!ctx) throw new Error('useFramework must be used within FrameworkProvider')
  return ctx
}
