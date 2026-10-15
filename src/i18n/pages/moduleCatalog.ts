import { useMemo } from 'react'
import { defineStrings, useStrings } from '..'

/**
 * Shared framework-module vocabulary used by the modules landing, hub,
 * questionnaire and review pages (and anywhere a framework is named):
 * module titles, short chip labels and descriptions (keyed by module id),
 * workflow states and relative-time helpers.
 *
 * Unknown ids always fall back to the data value (or the id itself), so a
 * tenant can ship modules this catalogue does not know about yet.
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
      'China-ESG': 'CASS-ESG 5.0 (Chinese Academy of Social Sciences)',
      'CN-SSE': 'SSE/SZSE/BSE Sustainability Report Guidelines (Trial)',
      'CN-CSDS': 'MOF Corporate Sustainability Disclosure Standards',
      'HKEX-ESG': 'HKEX ESG Reporting Code',
    } as Record<string, string>,
    /** Compact labels for chips, legends and table cells. */
    short: {
      GRI: 'GRI',
      MSX: 'MSX',
      'IFRS-S1': 'IFRS S1',
      'IFRS-S2': 'IFRS S2',
      'BRSR-Core': 'BRSR Core',
      'CSRD-ESRS': 'CSRD',
      TCFD: 'TCFD',
      'China-ESG': 'CASS-ESG',
      'CN-SSE': 'SSE/SZSE/BSE',
      'CN-CSDS': 'MOF CSDS',
      'HKEX-ESG': 'HKEX ESG',
      'CN-ETS': 'National ETS',
    } as Record<string, string>,
    descriptions: {
      GRI: 'Global Reporting Initiative comprehensive sustainability framework',
      MSX: 'MSX ESG disclosure requirements',
      'IFRS-S1': 'General requirements for disclosure of sustainability-related financial information',
      'IFRS-S2': 'Climate-related disclosures',
      'BRSR-Core': 'SEBI Business Responsibility and Sustainability Reporting — 9 NGRBC principles, essential and leadership indicators',
      'CSRD-ESRS': 'EU Corporate Sustainability Reporting Directive — European Sustainability Reporting Standards, double materiality',
      TCFD: 'Task Force on Climate-related Financial Disclosures — governance, strategy, risk, metrics and targets',
      'China-ESG': 'CASS-ESG 5.0 guidelines for corporate ESG reporting, issued by the Chinese Academy of Social Sciences',
      'CN-SSE':
        'Shanghai, Shenzhen and Beijing stock exchanges — Self-Regulatory Guidelines for Listed Companies: Sustainability Report (Trial); mandatory for index constituents and dual-listed issuers',
      'CN-CSDS':
        'Ministry of Finance Corporate Sustainability Disclosure Standards — Basic Standard and Climate Standard (Trial), aligned with ISSB',
      'HKEX-ESG': 'Hong Kong Exchanges ESG Reporting Code (Main Board Appendix C2), including climate-related disclosures',
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
      'China-ESG': '中国社会科学院 CASS-ESG 5.0',
      'CN-SSE': '沪深北交易所《可持续发展报告（试行）》指引',
      'CN-CSDS': '财政部 企业可持续披露准则',
      'HKEX-ESG': '港交所 ESG 守则',
    },
    short: {
      GRI: 'GRI',
      MSX: 'MSX',
      'IFRS-S1': 'IFRS S1',
      'IFRS-S2': 'IFRS S2',
      'BRSR-Core': 'BRSR Core',
      'CSRD-ESRS': 'CSRD',
      TCFD: 'TCFD',
      'China-ESG': 'CASS-ESG',
      'CN-SSE': '沪深北指引',
      'CN-CSDS': '财政部准则',
      'HKEX-ESG': '港交所 ESG',
      'CN-ETS': '全国碳市场',
    },
    descriptions: {
      GRI: '全球报告倡议组织（GRI）综合可持续发展报告框架',
      MSX: '马斯喀特证券交易所 ESG 披露要求',
      'IFRS-S1': '可持续相关财务信息披露一般要求',
      'IFRS-S2': '气候相关披露',
      'BRSR-Core': 'SEBI 商业责任与可持续发展报告 — NGRBC 九项原则，基本指标与领先指标',
      'CSRD-ESRS': '欧盟企业可持续发展报告指令 — 欧洲可持续发展报告准则，双重重要性',
      TCFD: '气候相关财务信息披露工作组 — 治理、战略、风险管理、指标与目标',
      'China-ESG': '中国社会科学院发布的《中国企业社会责任报告指南》CASS-ESG 5.0',
      'CN-SSE': '上交所、深交所、北交所《上市公司自律监管指引——可持续发展报告（试行）》；指数样本公司及境内外同时上市公司强制披露',
      'CN-CSDS': '财政部《企业可持续披露准则——基本准则》及《气候（试行）》，与 ISSB 准则衔接',
      'HKEX-ESG': '香港交易所《环境、社会及管治报告守则》（主板附录 C2），含气候相关披露',
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

/**
 * Legacy keys used by some tenant datasets (e.g. `frameworks`, `coverageByModule`,
 * `evidenceHeatmap`) that predate module ids. Normalise them before lookup.
 */
const ALIASES: Record<string, string> = {
  S1: 'IFRS-S1',
  S2: 'IFRS-S2',
  'IFRS S1': 'IFRS-S1',
  'IFRS S2': 'IFRS-S2',
  'BRSR Core': 'BRSR-Core',
  BRSR: 'BRSR-Core',
  'CSRD ESRS': 'CSRD-ESRS',
  CSRD: 'CSRD-ESRS',
  'China ESG': 'China-ESG',
  'China ESG Pack': 'China-ESG',
  CASS: 'China-ESG',
  'CASS-ESG': 'China-ESG',
  HKEX: 'HKEX-ESG',
  CSDS: 'CN-CSDS',
}

export const moduleIdOf = (key: string) => ALIASES[key] ?? key

/**
 * Framework label lookups with safe fallbacks.
 *
 *   const fw = useFrameworkLabels()
 *   fw.title('CN-SSE')            // full title
 *   fw.short('S1')                // 'IFRS S1' (aliases normalised)
 *   fw.title('X-NEW', m.title)    // unknown id → data value
 */
export function useFrameworkLabels() {
  const c = useStrings(moduleCatalogStrings)
  return useMemo(
    () => ({
      title: (key: string, fallback?: string) => c.titles[moduleIdOf(key)] ?? fallback ?? key,
      short: (key: string, fallback?: string) => c.short[moduleIdOf(key)] ?? c.titles[moduleIdOf(key)] ?? fallback ?? key,
      description: (key: string, fallback?: string) => c.descriptions[moduleIdOf(key)] ?? fallback ?? '',
      state: (state: string) => c.state[state] ?? state,
    }),
    [c],
  )
}
