import { defineStrings } from '..'

/**
 * Shared framework-module vocabulary used by the modules landing, hub,
 * questionnaire and review pages: module descriptions (keyed by module id),
 * workflow states and relative-time helpers.
 */
export const moduleCatalogStrings = defineStrings({
  en: {
    titles: {
      GRI: 'GRI Standards',
      MSX: 'Muscat Stock Exchange',
      'IFRS-S1': 'IFRS S1',
      'IFRS-S2': 'IFRS S2',
      'BRSR-Core': 'BRSR Core',
      'CSRD-ESRS': 'CSRD / ESRS',
      TCFD: 'TCFD',
      'China-ESG': 'China ESG (CASS)',
    } as Record<string, string>,
    descriptions: {
      GRI: 'Global Reporting Initiative comprehensive sustainability framework',
      MSX: 'MSX ESG disclosure requirements',
      'IFRS-S1': 'General requirements for disclosure of sustainability-related financial information',
      'IFRS-S2': 'Climate-related disclosures',
      'BRSR-Core': 'SEBI Business Responsibility and Sustainability Reporting — 9 NGRBC principles, essential and leadership indicators',
      'CSRD-ESRS': 'EU Corporate Sustainability Reporting Directive — European Sustainability Reporting Standards, double materiality',
      TCFD: 'Task Force on Climate-related Financial Disclosures — governance, strategy, risk, metrics and targets',
      'China-ESG': 'Chinese Academy of Social Sciences (CASS) ESG disclosure framework for listed companies',
    } as Record<string, string>,
    state: {
      Open: 'Open',
      'In Review': 'In review',
      Approved: 'Approved',
      Published: 'Published',
    } as Record<string, string>,
    hoursAgo: '{count}h ago',
    daysAgo: '{count}d ago',
    notFound: 'Module not found',
    notFoundBody: 'This framework module does not exist or is no longer active.',
    backToModules: 'Back to frameworks',
  },
  zh: {
    titles: {
      GRI: 'GRI 标准',
      MSX: '马斯喀特证券交易所',
      'IFRS-S1': 'IFRS S1',
      'IFRS-S2': 'IFRS S2',
      'BRSR-Core': 'BRSR Core',
      'CSRD-ESRS': 'CSRD / ESRS',
      TCFD: 'TCFD',
      'China-ESG': '中国 ESG（CASS）',
    },
    descriptions: {
      GRI: '全球报告倡议组织（GRI）综合可持续发展报告框架',
      MSX: '马斯喀特证券交易所 ESG 披露要求',
      'IFRS-S1': '可持续相关财务信息披露一般要求',
      'IFRS-S2': '气候相关披露',
      'BRSR-Core': 'SEBI 商业责任与可持续发展报告 — NGRBC 九项原则，基本指标与领先指标',
      'CSRD-ESRS': '欧盟企业可持续发展报告指令 — 欧洲可持续发展报告准则，双重重要性',
      TCFD: '气候相关财务信息披露工作组 — 治理、战略、风险管理、指标与目标',
      'China-ESG': '中国社会科学院（CASS）上市公司 ESG 信息披露框架',
    },
    state: {
      Open: '进行中',
      'In Review': '审核中',
      Approved: '已审批',
      Published: '已发布',
    },
    hoursAgo: '{count} 小时前',
    daysAgo: '{count} 天前',
    notFound: '未找到模块',
    notFoundBody: '该框架模块不存在或已停用。',
    backToModules: '返回框架列表',
  },
})
