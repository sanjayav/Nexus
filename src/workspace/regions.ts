import type { Locale } from '../i18n'

/**
 * Region profiles. A workspace (tenant) belongs to one region, and the region
 * decides everything that is market-specific rather than language-specific:
 * which disclosure frameworks apply, emission factors, currency, the trust
 * chain, identity providers, notification channels and data residency.
 *
 * Language (EN / 中文) is a per-user display preference and is independent:
 * an English-speaking auditor can review a mainland tenant, and a Chinese CSO
 * can work in the global tenant.
 */

export type Region = 'global' | 'cn'

/** Text authored in both UI languages. Use `pick(text, locale)` to render. */
export type L10n = { en: string; zh: string }

export const pick = (text: L10n, locale: Locale) => text[locale] ?? text.en

export type SsoProvider = 'microsoft' | 'google' | 'okta' | 'wecom' | 'dingtalk' | 'feishu'
export type NotifyChannel = 'email' | 'slack' | 'teams' | 'wecom' | 'dingtalk' | 'feishu' | 'sms'

export interface RegionProfile {
  id: Region
  label: L10n
  /** ISO 4217, used with Intl.NumberFormat. */
  currency: 'USD' | 'CNY'
  timezone: string
  /** Framework module ids (see mockData.modules) offered in this region, in display order. */
  frameworks: string[]
  /** Location-based grid factor used for Scope 2 defaults. */
  gridFactor: { value: number; unit: string; source: L10n }
  /** Where evidence hashes are anchored. */
  chain: { network: L10n; kind: L10n; explorer: string }
  hosting: { provider: L10n; residency: L10n }
  /** Where evidence files live and how they are made immutable. */
  storage: { provider: L10n; mode: L10n }
  sso: SsoProvider[]
  notify: NotifyChannel[]
  /** Privacy / data-transfer regime the tenant is configured against. */
  privacy: L10n
}

export const REGIONS: Record<Region, RegionProfile> = {
  global: {
    id: 'global',
    label: { en: 'Global', zh: '全球' },
    currency: 'USD',
    timezone: 'Asia/Muscat',
    frameworks: ['GRI', 'MSX', 'IFRS-S1', 'IFRS-S2', 'BRSR-Core', 'CSRD-ESRS', 'TCFD'],
    gridFactor: { value: 0.716, unit: 'tCO₂e/MWh', source: { en: 'CEA CO₂ Baseline Database v19', zh: '印度中央电力局（CEA）CO₂ 基准数据库 v19' } },
    chain: { network: { en: 'Polygon zkEVM', zh: 'Polygon zkEVM' }, kind: { en: 'Public L2', zh: '公链二层网络' }, explorer: 'https://zkevm.polygonscan.com' },
    hosting: { provider: { en: 'AWS', zh: 'AWS' }, residency: { en: 'eu-west-1 (Ireland)', zh: 'eu-west-1（爱尔兰）' } },
    storage: { provider: { en: 'IPFS (Pinata)', zh: 'IPFS（Pinata）' }, mode: { en: 'Content-addressed pinning', zh: '内容寻址固定' } },
    sso: ['microsoft', 'google', 'okta'],
    notify: ['email', 'slack', 'teams'],
    privacy: { en: 'GDPR', zh: 'GDPR（欧盟通用数据保护条例）' },
  },
  cn: {
    id: 'cn',
    label: { en: 'Mainland China', zh: '中国大陆' },
    currency: 'CNY',
    timezone: 'Asia/Shanghai',
    frameworks: ['CN-SSE', 'CN-CSDS', 'HKEX-ESG', 'China-ESG', 'GRI', 'IFRS-S2'],
    gridFactor: {
      value: 0.5703,
      unit: 'tCO₂e/MWh',
      source: { en: 'MEE national average grid factor (2022 data)', zh: '生态环境部 全国电网平均排放因子（2022 年度）' },
    },
    chain: {
      network: { en: 'ChainMaker (BSN)', zh: '长安链 ChainMaker（BSN 节点）' },
      kind: { en: 'Permissioned consortium chain', zh: '许可制联盟链' },
      explorer: 'https://explorer.chainmaker.org.cn',
    },
    hosting: { provider: { en: 'Alibaba Cloud', zh: '阿里云' }, residency: { en: 'cn-shanghai (East China 2)', zh: 'cn-shanghai（华东 2 · 上海）' } },
    storage: { provider: { en: 'Alibaba Cloud OSS', zh: '阿里云 OSS' }, mode: { en: 'WORM compliance retention', zh: 'WORM 合规保留' } },
    sso: ['wecom', 'dingtalk', 'feishu'],
    notify: ['wecom', 'dingtalk', 'feishu', 'sms', 'email'],
    privacy: { en: 'PIPL · Data Security Law', zh: '《个人信息保护法》·《数据安全法》' },
  },
}

export interface Workspace {
  id: string
  name: L10n
  region: Region
  industry: L10n
  /** Stock listing, shown in setup and report covers. */
  listing: L10n
  reportingYear: string
}

export const WORKSPACES: Workspace[] = [
  {
    id: 'aeiforo',
    name: { en: 'Aeiforo Green Energy', zh: 'Aeiforo 绿色能源' },
    region: 'global',
    industry: { en: 'Renewable energy & logistics', zh: '可再生能源与物流' },
    listing: { en: 'MSX · NSE', zh: '马斯喀特证券交易所 · 印度国家证券交易所' },
    reportingYear: 'FY2025',
  },
  {
    // Fictional demo tenant for mainland China clients.
    id: 'lvyuan',
    name: { en: 'Lvyuan Holdings Group', zh: '绿源控股集团' },
    region: 'cn',
    industry: { en: 'Renewable energy & advanced manufacturing', zh: '新能源与先进制造' },
    listing: { en: 'SSE Main Board · HKEX (A+H)', zh: '上交所主板 · 港交所（A+H 股）' },
    reportingYear: 'FY2026',
  },
]
