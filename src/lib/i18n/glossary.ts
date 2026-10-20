import type { L10n } from '@/config/regions'

/**
 * Domain glossary: one source of truth for
 *  1. plain-language explanations shown by <Term> to readers who are not ESG
 *     specialists (board members, executives, new team members), and
 *  2. the Chinese terminology rules enforced by `glossary.test.ts` against
 *     every zh dictionary in the app.
 *
 * Wording follows the primary texts: 上交所《自律监管指引第14号——可持续发展报告（试行）》
 * (指引), its 编制指南 (指南), and 财政部《企业可持续披露准则》(MOF). Where the
 * exchange and MOF differ, screens use the wording of the framework they show.
 */

export interface GlossaryEntry {
  term: L10n
  /** One or two sentences a non-specialist understands. */
  plain: L10n
}

export const GLOSSARY = {
  scope1: {
    term: { en: 'Scope 1', zh: '范围1 排放' },
    plain: {
      en: 'Greenhouse gases released directly by sites the company owns or controls, for example burning gas in boilers or fuel in vehicles.',
      zh: '公司自有或控制的设施直接排放的温室气体，例如锅炉燃烧天然气、自有车辆燃油。',
    },
  },
  scope2: {
    term: { en: 'Scope 2', zh: '范围2 排放' },
    plain: {
      en: 'Emissions from generating the electricity and heat the company buys. Buying green power lowers the market-based figure.',
      zh: '公司外购电力和热力在生产环节产生的排放。购买绿电、绿证可降低基于市场法的数值。',
    },
  },
  scope3: {
    term: { en: 'Scope 3', zh: '范围3 排放' },
    plain: {
      en: 'All other emissions in the value chain: purchased materials, transport, business travel, and use and disposal of products sold.',
      zh: '价值链上的其他间接排放，包括采购的原材料、物流运输、差旅，以及售出产品的使用和废弃处理。',
    },
  },
  doubleMateriality: {
    term: { en: 'Double materiality', zh: '双重重要性' },
    plain: {
      en: 'A topic matters if it affects the company’s finances (financial materiality) or if the company significantly affects people or the environment (impact materiality).',
      zh: '一个议题只要对公司财务状况有重大影响（财务重要性），或公司对经济、社会和环境有重大影响（影响重要性），即应披露。',
    },
  },
  assurance: {
    term: { en: 'Assurance', zh: '鉴证' },
    plain: {
      en: 'An independent check of the reported figures, usually by an accounting firm, so investors can rely on them.',
      zh: '由独立第三方（通常为会计师事务所）对披露数据进行的鉴证，使投资者可以信赖报告内容。',
    },
  },
  evidence: {
    term: { en: 'Evidence', zh: '佐证材料' },
    plain: {
      en: 'Source documents behind a reported figure, such as meter readings, invoices or certificates, kept for auditors.',
      zh: '支撑披露数据的原始文件，如电表读数、发票、证书等，供鉴证机构查验。',
    },
  },
  integrity: {
    term: { en: 'Integrity score', zh: '完整性评分' },
    plain: {
      en: 'How much of the reported data is locked with a tamper-evident fingerprint and an approval record. 100 means every figure can be traced and verified.',
      zh: '已生成防篡改存证并完成审批记录的数据占比。100 分表示每项数据均可追溯、可核验。',
    },
  },
  marketBased: {
    term: { en: 'Market-based', zh: '基于市场法' },
    plain: {
      en: 'Scope 2 calculated from the electricity contracts the company actually holds, including green power and certificates.',
      zh: '按公司实际持有的电力合同（含绿电交易、绿证）计算的范围2 排放。',
    },
  },
  frameworkCoverage: {
    term: { en: 'Framework coverage', zh: '框架覆盖率' },
    plain: {
      en: 'Share of the disclosures each framework requires that already have an answer.',
      zh: '各披露框架要求的披露项中，已完成填报的比例。',
    },
  },
} satisfies Record<string, GlossaryEntry>

export type GlossaryKey = keyof typeof GLOSSARY

/**
 * Chinese wording that must not appear in zh UI copy, with the preferred term.
 * Checked by `glossary.test.ts`. Add a rule whenever a review catches a term.
 */
export const ZH_BANNED: { pattern: RegExp; use: string; why: string }[] = [
  { pattern: /利益相关者/, use: '利益相关方', why: '指引 wording' },
  { pattern: /(?<!佐)证据/, use: '佐证材料', why: '证据 reads as legal evidence' },
  { pattern: /收件箱/, use: '待办', why: 'literal translation of "inbox"' },
  { pattern: /指挥中心/, use: '工作台', why: 'literal translation of "command center"' },
  { pattern: /投资组合/, use: '集团主体', why: '"portfolio" here means group entities' },
  { pattern: /排放引擎|AI 工作室/, use: '碳排放核算 / AI 撰写助手', why: 'literal translations' },
  { pattern: /指标索引/, use: '对标索引表', why: '指南 wording' },
  { pattern: /治理报告/, use: '环境、社会及管治报告', why: 'HKEX uses 管治' },
  { pattern: /生命周期评估/, use: '生命周期评价', why: 'GB/T 24040 wording' },
  { pattern: /范围[一二三](?!、)/, use: '范围1/2/3', why: '指引 uses Arabic numerals; quote MOF verbatim only in framework text' },
]
