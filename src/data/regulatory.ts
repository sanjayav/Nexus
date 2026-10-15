import type { L10n, Region } from '../workspace/regions'

/**
 * Region-keyed regulatory calendar shown on the executive overview.
 *
 * `framework` is a module id where one exists (so the item links to that
 * module); obligations without a reporting module (e.g. the national carbon
 * market) set `href` to the relevant workspace page instead.
 *
 * `date` is an ISO date, or `null` when the deadline is set each year by the
 * regulator (`dateNote` explains how it is determined). We never invent a date.
 */
export interface RegulatoryItem {
  id: string
  framework: string
  title: L10n
  detail: L10n
  date: string | null
  dateNote?: L10n
  /** mandatory = filing obligation; voluntary = adoption / readiness milestone. */
  kind: 'mandatory' | 'voluntary'
  /** Override destination; defaults to `/modules/{framework}`. */
  href?: string
}

export const REGULATORY_CALENDAR: Record<Region, RegulatoryItem[]> = {
  cn: [
    {
      id: 'cn-sse-fy2026',
      framework: 'CN-SSE',
      title: {
        en: 'FY2026 sustainability report due with annual report',
        zh: '2026 年度可持续发展报告随年报披露',
      },
      detail: {
        en: 'SSE/SZSE/BSE Guidelines (Trial) — publish alongside the FY2026 annual report, no later than 30 April 2027.',
        zh: '沪深北交易所《可持续发展报告（试行）》指引 — 与 2026 年年度报告同时披露，最迟 2027 年 4 月 30 日。',
      },
      date: '2027-04-30',
      kind: 'mandatory',
    },
    {
      id: 'hkex-esg-fy2026',
      framework: 'HKEX-ESG',
      title: {
        en: 'HKEX ESG report published with the annual report',
        zh: '港交所 ESG 报告与年报同步刊发',
      },
      detail: {
        en: 'Main Board Appendix C2 — ESG report (incl. climate disclosures) to be published at the same time as the FY2026 annual report.',
        zh: '主板附录 C2 — ESG 报告（含气候相关披露）须与 2026 年年报同时刊发。',
      },
      date: '2027-04-30',
      kind: 'mandatory',
    },
    {
      id: 'cn-ets-compliance',
      framework: 'CN-ETS',
      title: {
        en: 'National carbon market: annual verification & allowance surrender',
        zh: '全国碳排放权交易市场：年度核查与配额清缴',
      },
      detail: {
        en: 'Covered entities submit the annual emissions report for third-party verification, then surrender allowances for the compliance year.',
        zh: '重点排放单位报送年度排放报告并接受核查，随后完成履约年度的配额清缴。',
      },
      date: null,
      dateNote: { en: 'Per MEE annual notice', zh: '以生态环境部年度通知为准' },
      kind: 'mandatory',
      href: '/carbon',
    },
    {
      id: 'cn-csds-climate',
      framework: 'CN-CSDS',
      title: {
        en: 'MOF CSDS Climate Standard (Trial): voluntary adoption',
        zh: '财政部《企业可持续披露准则——气候（试行）》自愿采用',
      },
      detail: {
        en: 'Climate standard currently applies on a voluntary basis; map existing IFRS S2 / exchange disclosures to prepare for mandatory phase-in.',
        zh: '气候准则现阶段自愿适用；可将现有 IFRS S2 及交易所披露内容进行映射，为后续强制实施做好准备。',
      },
      date: null,
      dateNote: { en: 'Voluntary — no fixed date', zh: '自愿采用，暂无固定日期' },
      kind: 'voluntary',
    },
  ],
  global: [
    {
      id: 'msx-fy2026',
      framework: 'MSX',
      title: {
        en: 'MSX ESG disclosure with FY2026 annual report',
        zh: '随 2026 财年年报提交 MSX ESG 披露',
      },
      detail: {
        en: 'Muscat Stock Exchange ESG disclosure to accompany the audited annual report.',
        zh: '马斯喀特证券交易所 ESG 披露须随经审计的年度报告一并提交。',
      },
      date: '2027-03-31',
      kind: 'mandatory',
    },
    {
      id: 'csrd-fy2026',
      framework: 'CSRD-ESRS',
      title: {
        en: 'CSRD sustainability statement in FY2026 management report',
        zh: '2026 财年管理层报告中的 CSRD 可持续发展声明',
      },
      detail: {
        en: 'ESRS sustainability statement with limited assurance, published within the annual financial report.',
        zh: '按 ESRS 编制并经有限鉴证的可持续发展声明，随年度财务报告发布。',
      },
      date: '2027-04-30',
      kind: 'mandatory',
    },
    {
      id: 'brsr-fy2027',
      framework: 'BRSR-Core',
      title: {
        en: 'BRSR & BRSR Core filed with annual report',
        zh: '随年报提交 BRSR 与 BRSR Core',
      },
      detail: {
        en: 'SEBI LODR Reg. 34(2)(f) — BRSR with reasonable assurance on BRSR Core, part of the annual report ahead of the AGM.',
        zh: 'SEBI LODR 第 34(2)(f) 条 — BRSR 及经合理鉴证的 BRSR Core 作为年报组成部分，于股东大会前提交。',
      },
      date: '2027-09-30',
      kind: 'mandatory',
    },
  ],
}

const DAY = 24 * 60 * 60 * 1000

/** Whole days from `now` until `iso` (negative when past). */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const target = new Date(`${iso}T23:59:59`)
  return Math.ceil((target.getTime() - now.getTime()) / DAY)
}

/** Dated items first (soonest first), then items whose date is set by notice. */
export function regulatoryCalendar(region: Region): RegulatoryItem[] {
  return [...(REGULATORY_CALENDAR[region] ?? [])].sort((a, b) => {
    if (a.date && b.date) return a.date.localeCompare(b.date)
    if (a.date) return -1
    if (b.date) return 1
    return 0
  })
}
