/**
 * Server-side string dictionary for generated reports (PDF, DOCX, iXBRL).
 *
 * The report is rendered once at publish time, hashed and anchored, so its
 * language is fixed then and stored on report_artifacts.locale. Every
 * heading, label and sentence of boilerplate lives here — the renderers hold
 * no user-visible English of their own.
 *
 * Locales:
 *   en — English.
 *   zh — Simplified Chinese (zh-CN).
 *   th — English body with the bilingual Thai cover accents and Buddhist-era
 *        year that Thai organisations always had. It is an overlay on `en`,
 *        and only applies when an org is Thai or asks for it explicitly.
 *
 * Placeholders use `{name}`; `fmt()` fills them. The en and zh tables must
 * have the same keys and placeholders (enforced by a unit test).
 */

export type ReportLocale = 'en' | 'zh' | 'th'
export const REPORT_LOCALES: ReportLocale[] = ['en', 'zh', 'th']

export const REPORT_STRINGS_EN = {
  // Cover
  'cover.draftBand': 'UNAUDITED DRAFT',
  'cover.reportTitle': 'Sustainability Report',
  'cover.kicker': '{code} {reportTitle}',
  'cover.fiscalYear': '{label} · Fiscal Year {year}',
  'cover.aboutKicker': 'About this report',
  'cover.aboutBody': "This report discloses {org}'s sustainability performance for the period {periodRange}, prepared in accordance with {frameworkName}.",
  'cover.consolidation': 'It consolidates data from every operating entity in scope. Each metric has been reviewed by a subsidiary lead and approved by the group sustainability officer. A cryptographic hash of this document is anchored to a public timestamp calendar so any recipient can verify the file has not been modified.',
  'cover.headquarters': 'Headquarters: {hq}',
  'cover.verifyTitle': 'Document verification',
  'cover.token': 'Token: ',
  'cover.verifyAt': 'Verify at: ',
  'cover.publishedBy': 'Published by {name} on {date}',
  'cover.scanToVerify': 'Scan to verify',
  'period.range': '{start} to {end}',
  'period.from': '{start}',
  'period.fy': 'FY{year}',

  // TOC
  'toc.kicker': 'Contents',
  'toc.title': 'Table of contents',
  'toc.about': '1. About this report',
  'toc.assertion': '2. Management assertion',
  'toc.narratives': '3. Sustainability narrative disclosures',
  'toc.metrics': '4. Performance metrics',
  'toc.index': '5. {indexTitle}',
  'toc.assurance': '6. Independent assurance statement',

  // Section kicker
  'section.kicker': 'Section {n}',

  // About + assertion
  'about.title': 'About this report',
  'about.orgLabel': 'Reporting organisation.',
  'about.orgBody': '{org}{hq}.',
  'about.orgHq': ', headquartered in {country}',
  'about.frameworkLabel': 'Reporting framework.',
  'about.frameworkBody': '{name} ({code}). The {indexTitle} in Section 5 maps each disclosure in scope to its status (fully reported, partially reported, or omitted with reason).',
  'about.periodLabel': 'Reporting period.',
  'about.periodBody': '{label} — fiscal year {year}{range}.',
  'about.periodRange': ' ({start} to {end})',
  'about.boundaryLabel': 'Boundary.',
  'about.boundaryBody': 'Consolidated across every operating entity in the organisation structure, with equity-weighted rollup from plant → subsidiary → group. Joint ventures outside the consolidation boundary are reported in parallel where material.',
  'about.prepLabel': 'Data preparation.',
  'about.prepBody': 'Each line item was entered by a named data contributor, reviewed by a subsidiary lead, and approved by the group sustainability officer. Evidence is attached at the line-item level. Every state transition is cryptographically hash-chained; a tip hash is externally anchored via OpenTimestamps at publication time.',
  'assertion.title': 'Management assertion',
  'assertion.intro': 'The management of {org} is responsible for the preparation and presentation of the information in this report. We confirm that, to the best of our knowledge:',
  'assertion.b1': '• the information has been prepared in accordance with {frameworkName};',
  'assertion.b2': '• the consolidation boundary, methodology, and assumptions disclosed above accurately describe how the data was produced;',
  'assertion.b3': '• material restatements, if any, are identified alongside the relevant disclosure;',
  'assertion.b4': '• the information is complete with respect to the topics identified as material following our materiality assessment.',
  'assertion.publishedBy': 'Published by: ',
  'assertion.date': 'Date: {date}',

  // Narratives
  'narr.title': 'Sustainability narrative disclosures',
  'narr.empty': 'No narrative disclosures were approved for this reporting period. Narratives are recorded alongside the corresponding quantitative disclosure; their absence is itself a disclosure — see the {indexTitle} for status per line item.',

  // Metrics
  'metrics.title': 'Performance metrics',
  'metrics.empty': 'No approved numeric disclosures in this reporting period.',
  'metrics.intro': 'All figures below are group consolidated totals, summed from approved entity-level submissions in scope.',
  'metrics.col.code': 'Code',
  'metrics.col.lineItem': 'Line item',
  'metrics.col.unit': 'Unit',
  'metrics.col.total': 'Group total',
  'metrics.col.entities': 'Entities',
  'metrics.col.section': 'Section',
  'metrics.col.value': 'Value',

  // Content index
  'index.intro': 'Disclosure-level index. Each line references a {code} disclosure and its reporting status in this period. "Fully" means every required data point in scope has been approved; "Partially" means some, but not all; "Omitted" means the disclosure was identified as not material or data is unavailable this cycle.',
  'index.col.disclosure': 'Disclosure',
  'index.col.section': 'Section',
  'index.col.coverage': 'Cov.',
  'index.col.status': 'Status',
  'index.col.approvedTotal': 'Approved / Total',
  'index.status.fully': 'FULL',
  'index.status.partially': 'PART',
  'index.status.omitted': 'OMIT',
  'index.empty': 'No content index entries.',

  // Assurance
  'assurance.title': 'Independent assurance statement',
  'assurance.firm': 'Assurance firm:',
  'assurance.signedBy': 'Signed by:',
  'assurance.signedOn': 'Signed on:',
  'assurance.level': 'Level of assurance:',
  'assurance.reasonable': 'Reasonable assurance',
  'assurance.limited': 'Limited assurance',
  'assurance.standard': 'Assurance standard:',
  'assurance.appended': 'The signed assurance statement from {firm} is appended to this document in full. Page continuation follows.',
  'assurance.pending': 'ASSURANCE PENDING',
  'assurance.pendingLead': 'This report has not yet received third-party assurance. It is published as an ',
  'assurance.unauditedDraft': 'unaudited draft',
  'assurance.pendingTail': '.',
  'assurance.pendingReissue': 'Once an independent assurance provider (e.g. a firm qualified under {standard}) signs off, a new version of this report will be re-issued with their statement embedded here and the draft watermark removed.',
  'assurance.pendingReaders': "Readers should treat the figures in Sections 3 and 4 as management's own representation until such assurance is obtained. The verification token on the cover page links to the document's published hash, which is externally timestamped for tamper evidence irrespective of assurance status.",
  'assurance.defaultFirm': 'Independent assurance provider',
  'assurance.defaultSigner': 'Authorised signatory',
  'assurance.standardIsae': 'ISAE 3000 (Revised)',
  'assurance.standardCsae': 'CSAE 3101 (China Standard on Assurance Engagements No. 3101)',
  'assurance.none': 'No signed assurance statement attached for this period.',

  // Chrome / metadata
  'chrome.verify': 'Verify: {url}',
  'chrome.page': 'Page {page} of {total}',
  'doc.title': '{org} — {code} Report {year}',
  'doc.subject': '{name} sustainability disclosure for fiscal year {year}',
  'doc.keywords': 'ESG, sustainability, {code}, {org}',
  'general.generalDisclosures': 'General disclosures',
  'general.notAvailable': '—',

  // DOCX-only
  'docx.reportingPeriod': 'Reporting period: {label} ({year})',
  'docx.publishedBy': 'Published by: {name}',
  'docx.publishedAt': 'Published at: {date}',
  'docx.verificationUrl': 'Verification URL: {url}',
  'docx.execSummary': 'Executive summary',
  'docx.summaryScope': "This report covers {org}'s sustainability performance for {label} under the {frameworkName} framework.",
  'docx.summaryCounts': 'Approved metrics: {metrics}. Approved narrative disclosures: {narratives}. Sections covered: {sections}.',
  'docx.narrativeTitle': 'Narrative disclosures',
  'docx.noNarratives': 'No approved narrative disclosures for this period.',
  'docx.quantTitle': 'Quantitative disclosures',
  'docx.noMetrics': 'No approved metrics for this period.',
  'docx.sectionLine': 'Section: {section}',
  'docx.auditor': 'Auditor: {firm}',
  'docx.signedBy': 'Signed by: {name}',
  'docx.signedAt': 'Signed at: {date}',
  'docx.opinion': 'Opinion type: {opinion}',
  'docx.reference': 'Reference: {reference}',
  'docx.auditTrail': 'Audit trail',
  'docx.sha': 'SHA-256 of report payload: {sha}',
  'docx.token': 'Verification token: {token}',
  'docx.verifyAt': 'Verify at: {url}',
  'docx.description': 'Auto-generated sustainability report (DOCX)',

  // iXBRL
  'ixbrl.title': '{org} — Sustainability Report {year} (iXBRL draft)',
  'ixbrl.heading': '{org} — FY{year} Sustainability Disclosures',
  'ixbrl.bannerLead': 'Draft iXBRL document.',
  'ixbrl.bannerBody': 'This file is structurally valid inline XBRL and tagged against the ESRS / ISSB / SEC / GRI / EU-Taxonomy concept set. Regulatory filing requires validation against the official taxonomy via a certified validator (CoreFiling, ParsePort, IRIS Carbon). See Nexus iXBRL documentation.',
  'ixbrl.colDisclosure': 'Disclosure',
  'ixbrl.colValue': 'Value',
  'ixbrl.footer': 'Generated by Nexus iXBRL Engine on {date}. {facts} facts, {contexts} contexts, {units} units.',
} as const

export type ReportStringKey = keyof typeof REPORT_STRINGS_EN
export type ReportStrings = Record<ReportStringKey, string>

export const REPORT_STRINGS_ZH: ReportStrings = {
  // Cover
  'cover.draftBand': '未经鉴证草稿',
  'cover.reportTitle': '可持续发展报告',
  'cover.kicker': '{code} · {reportTitle}',
  'cover.fiscalYear': '{label} · {year} 财年',
  'cover.aboutKicker': '关于本报告',
  'cover.aboutBody': '本报告披露{org}在{periodRange}期间的可持续发展表现，依据{frameworkName}编制。',
  'cover.consolidation': '本报告汇总了范围内所有运营主体的数据。每项指标均经子公司负责人审核，并由集团可持续发展负责人批准。本文件的加密哈希值已锚定至公共时间戳日历，任何接收方均可验证文件未被篡改。',
  'cover.headquarters': '总部：{hq}',
  'cover.verifyTitle': '文件验证',
  'cover.token': '验证码：',
  'cover.verifyAt': '验证网址：',
  'cover.publishedBy': '由{name}于{date}发布',
  'cover.scanToVerify': '扫码验证',
  'period.range': '{start}至{end}',
  'period.from': '{start}起',
  'period.fy': '{year}财年',

  // TOC
  'toc.kicker': '目录',
  'toc.title': '报告目录',
  'toc.about': '一、关于本报告',
  'toc.assertion': '二、管理层声明',
  'toc.narratives': '三、可持续发展叙述性披露',
  'toc.metrics': '四、绩效指标',
  'toc.index': '五、{indexTitle}',
  'toc.assurance': '六、独立鉴证报告',

  'section.kicker': '第{n}部分',

  // About + assertion
  'about.title': '关于本报告',
  'about.orgLabel': '报告主体。',
  'about.orgBody': '{org}{hq}。',
  'about.orgHq': '，总部位于{country}',
  'about.frameworkLabel': '编制依据。',
  'about.frameworkBody': '{name}（{code}）。第五部分的{indexTitle}列示了范围内每项披露的报告状态（完全披露、部分披露，或省略并说明原因）。',
  'about.periodLabel': '报告期间。',
  'about.periodBody': '{label}——{year}财年{range}。',
  'about.periodRange': '（{start}至{end}）',
  'about.boundaryLabel': '报告边界。',
  'about.boundaryBody': '数据覆盖组织架构中的所有运营主体，按权益比例自工厂、子公司逐级汇总至集团层面。合并范围以外的合营企业如具有重要性，另行并列披露。',
  'about.prepLabel': '数据编制。',
  'about.prepBody': '每个披露项均由指定的数据填报人录入，经子公司负责人审核，并由集团可持续发展负责人批准。证明材料附于披露项层面。每一次状态变更均以加密哈希链记录；发布时，链顶哈希值通过 OpenTimestamps 进行外部锚定。',
  'assertion.title': '管理层声明',
  'assertion.intro': '{org}管理层负责编制和列报本报告中的信息。据我们所知，我们确认：',
  'assertion.b1': '• 相关信息已依据{frameworkName}编制；',
  'assertion.b2': '• 上文披露的合并边界、方法和假设准确说明了数据的产生方式；',
  'assertion.b3': '• 如有重大重述，已在相关披露处予以标明；',
  'assertion.b4': '• 就重要性评估所识别的重要议题而言，相关信息是完整的。',
  'assertion.publishedBy': '发布人：',
  'assertion.date': '日期：{date}',

  // Narratives
  'narr.title': '可持续发展叙述性披露',
  'narr.empty': '本报告期内没有经批准的叙述性披露。叙述性内容与相应的定量披露一并记录；其缺失本身即构成一项披露——各披露项的状态请参见{indexTitle}。',

  // Metrics
  'metrics.title': '绩效指标',
  'metrics.empty': '本报告期内没有经批准的定量披露。',
  'metrics.intro': '以下数据均为集团合并总量，由范围内各主体经批准的填报数据汇总而得。',
  'metrics.col.code': '编号',
  'metrics.col.lineItem': '披露项',
  'metrics.col.unit': '单位',
  'metrics.col.total': '集团合计',
  'metrics.col.entities': '主体数',
  'metrics.col.section': '章节',
  'metrics.col.value': '数值',

  // Content index
  'index.intro': '披露层面索引。每一行对应一项{code}披露及其在本报告期的报告状态。“完全”表示范围内所有必需数据点均已批准；“部分”表示部分但非全部数据点已批准；“省略”表示该披露被认定为不具有重要性，或本期数据暂不可得。',
  'index.col.disclosure': '披露内容',
  'index.col.section': '议题',
  'index.col.coverage': '覆盖',
  'index.col.status': '状态',
  'index.col.approvedTotal': '已批准 / 总数',
  'index.status.fully': '完全',
  'index.status.partially': '部分',
  'index.status.omitted': '省略',
  'index.empty': '无索引条目。',

  // Assurance
  'assurance.title': '独立鉴证报告',
  'assurance.firm': '鉴证机构：',
  'assurance.signedBy': '签署人：',
  'assurance.signedOn': '签署日期：',
  'assurance.level': '鉴证程度：',
  'assurance.reasonable': '合理保证',
  'assurance.limited': '有限保证',
  'assurance.standard': '鉴证准则：',
  'assurance.appended': '{firm}签署的鉴证报告全文附于本文件之后，详见后续页面。',
  'assurance.pending': '鉴证待完成',
  'assurance.pendingLead': '本报告尚未取得第三方鉴证，现以',
  'assurance.unauditedDraft': '未经鉴证草稿',
  'assurance.pendingTail': '形式发布。',
  'assurance.pendingReissue': '待独立鉴证机构（例如具备{standard}鉴证资质的机构）签署后，将重新发布新版本报告，在此处附上其鉴证报告并移除草稿水印。',
  'assurance.pendingReaders': '在取得鉴证之前，第三部分和第四部分中的数据应视为管理层自身的陈述。封面上的验证码链接至本文件已发布的哈希值，该哈希值已进行外部时间戳锚定，无论鉴证状态如何均可用于防篡改验证。',
  'assurance.defaultFirm': '独立鉴证机构',
  'assurance.defaultSigner': '授权签字人',
  'assurance.standardIsae': '《国际鉴证业务准则第3000号（修订版）》（ISAE 3000）',
  'assurance.standardCsae': '《中国注册会计师其他鉴证业务准则第3101号》（CSAE 3101）',
  'assurance.none': '本期未附经签署的鉴证报告。',

  // Chrome / metadata
  'chrome.verify': '验证：{url}',
  'chrome.page': '第 {page} 页，共 {total} 页',
  'doc.title': '{org} — {code} 报告 {year}',
  'doc.subject': '{name} {year} 财年可持续发展信息披露',
  'doc.keywords': 'ESG, 可持续发展, {code}, {org}',
  'general.generalDisclosures': '一般披露',
  'general.notAvailable': '—',

  // DOCX-only
  'docx.reportingPeriod': '报告期间：{label}（{year}）',
  'docx.publishedBy': '发布人：{name}',
  'docx.publishedAt': '发布时间：{date}',
  'docx.verificationUrl': '验证网址：{url}',
  'docx.execSummary': '摘要',
  'docx.summaryScope': '本报告依据{frameworkName}，披露{org}在{label}的可持续发展表现。',
  'docx.summaryCounts': '经批准的指标：{metrics} 项；经批准的叙述性披露：{narratives} 项；涵盖章节：{sections} 个。',
  'docx.narrativeTitle': '叙述性披露',
  'docx.noNarratives': '本期没有经批准的叙述性披露。',
  'docx.quantTitle': '定量披露',
  'docx.noMetrics': '本期没有经批准的指标。',
  'docx.sectionLine': '章节：{section}',
  'docx.auditor': '鉴证机构：{firm}',
  'docx.signedBy': '签署人：{name}',
  'docx.signedAt': '签署时间：{date}',
  'docx.opinion': '鉴证程度：{opinion}',
  'docx.reference': '鉴证准则：{reference}',
  'docx.auditTrail': '审计轨迹',
  'docx.sha': '报告数据 SHA-256：{sha}',
  'docx.token': '验证码：{token}',
  'docx.verifyAt': '验证网址：{url}',
  'docx.description': '自动生成的可持续发展报告（DOCX）',

  // iXBRL
  'ixbrl.title': '{org} — {year} 年可持续发展报告（iXBRL 草稿）',
  'ixbrl.heading': '{org} — {year} 财年可持续发展信息披露',
  'ixbrl.bannerLead': 'iXBRL 草稿文件。',
  'ixbrl.bannerBody': '本文件为结构有效的内联 XBRL，并按 ESRS / ISSB / SEC / GRI / 欧盟分类法概念集进行标记。用于监管报送时，须通过经认证的验证工具（CoreFiling、ParsePort、IRIS Carbon）依据官方分类标准进行验证。详见 Nexus iXBRL 文档。',
  'ixbrl.colDisclosure': '披露内容',
  'ixbrl.colValue': '数值',
  'ixbrl.footer': '由 Nexus iXBRL 引擎于 {date} 生成。共 {facts} 项事实、{contexts} 个上下文、{units} 个单位。',
}

/**
 * Thai overlay — English body with the bilingual cover accents and the
 * Buddhist-era year (`{yearBE}` = Gregorian + 543) Thai organisations had.
 */
export const REPORT_STRINGS_TH_OVERLAY: Partial<ReportStrings> = {
  'cover.kicker': '{code} {reportTitle} · รายงานความยั่งยืน',
  'cover.fiscalYear': '{label} · Fiscal Year {year} · ปีบัญชี {yearBE}',
  'cover.aboutKicker': 'About this report · เกี่ยวกับรายงาน',
  'cover.scanToVerify': 'Scan to verify · สแกนเพื่อตรวจสอบ',
}

/**
 * Used for `th` when no Thai font is installed (api/_fonts/NotoSansThai-*.ttf):
 * Thai script would print as empty boxes, so keep the Buddhist-era year in
 * Latin script instead.
 */
export const REPORT_STRINGS_TH_LATIN_OVERLAY: Partial<ReportStrings> = {
  'cover.fiscalYear': '{label} · Fiscal Year {year} · B.E. {yearBE}',
}

export function reportStrings(locale: ReportLocale, opts: { thaiGlyphs?: boolean } = {}): ReportStrings {
  if (locale === 'zh') return REPORT_STRINGS_ZH
  if (locale === 'th') {
    const overlay = opts.thaiGlyphs === false ? REPORT_STRINGS_TH_LATIN_OVERLAY : REPORT_STRINGS_TH_OVERLAY
    return { ...REPORT_STRINGS_EN, ...overlay }
  }
  return REPORT_STRINGS_EN
}

/** Fill `{name}` placeholders. Unknown placeholders are left as-is. */
export function fmt(template: string, vars: Record<string, string | number | null | undefined> = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => {
    const v = vars[k]
    return v === undefined || v === null ? m : String(v)
  })
}

export type ReportT = (key: ReportStringKey, vars?: Record<string, string | number | null | undefined>) => string

export function makeReportT(locale: ReportLocale, opts: { thaiGlyphs?: boolean } = {}): ReportT {
  const table = reportStrings(locale, opts)
  return (key, vars) => fmt(table[key] ?? REPORT_STRINGS_EN[key], vars)
}

// ─── Locale resolution ─────────────────────────────────────────────

/** Map a client/UI language tag onto a report locale. Unknown → undefined. */
export function normalizeReportLocale(input: unknown): ReportLocale | undefined {
  if (typeof input !== 'string') return undefined
  const tag = input.trim().toLowerCase().replace('_', '-')
  if (!tag) return undefined
  if (tag === 'zh' || tag.startsWith('zh-')) return 'zh'
  if (tag === 'th' || tag.startsWith('th-')) return 'th'
  if (tag === 'en' || tag.startsWith('en-')) return 'en'
  return undefined
}

export function isThaiOrg(org: { country?: string | null; thai_name?: string | null }): boolean {
  const c = (org.country ?? '').trim().toLowerCase()
  return c === 'th' || c === 'tha' || c === 'thailand' || !!(org.thai_name && org.thai_name.trim())
}

export function isChinaOrg(org: { country?: string | null }): boolean {
  const c = (org.country ?? '').trim().toLowerCase()
  return c === 'cn' || c === 'chn' || c === 'china' || c === '中国'
}

/**
 * The language a report is rendered in.
 *   - zh requested → zh
 *   - th requested, or en/nothing requested for a Thai org → th
 *     (the bilingual Thai cover Thai orgs always had)
 *   - nothing requested for a mainland org → zh
 *   - otherwise en
 */
export function resolveReportLocale(
  requested: unknown,
  org: { country?: string | null; thai_name?: string | null },
): ReportLocale {
  const req = normalizeReportLocale(requested)
  if (req === 'zh') return 'zh'
  if (req === 'th') return 'th'
  if (isThaiOrg(org)) return 'th'
  if (req === 'en') return 'en'
  if (isChinaOrg(org)) return 'zh'
  return 'en'
}

/** BCP-47 tag for document metadata (xml:lang, w:lang). */
export function bcp47(locale: ReportLocale): string {
  return locale === 'zh' ? 'zh-CN' : 'en'
}

type L10n = { en: string; zh: string }

// ─── Formatting ────────────────────────────────────────────────────

/** ISO date → `2026-10-16` (en/th) or `2026年10月16日` (zh). Invalid → input. */
export function formatReportDate(value: string | Date | null | undefined, locale: ReportLocale): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value.length === 10 ? `${value}T00:00:00Z` : value)
  if (Number.isNaN(d.getTime())) return String(value)
  const iso = d.toISOString().slice(0, 10)
  if (locale !== 'zh') return iso
  const [y, m, day] = iso.split('-')
  return `${y}年${Number(m)}月${Number(day)}日`
}

/**
 * Compact figure for report tables: k/M for en and th, 万/亿 for zh.
 * Values under 1,000 (en) / 10,000 (zh) keep up to two decimals.
 */
export function formatReportValue(v: number, locale: ReportLocale): string {
  if (!Number.isFinite(v)) return '—'
  const abs = Math.abs(v)
  const small = (n: number) => {
    const s = n.toFixed(2)
    return s.replace(/\.?0+$/, '') || '0'
  }
  if (locale === 'zh') {
    if (abs >= 1e8) return (v / 1e8).toFixed(2) + '亿'
    if (abs >= 1e4) return (v / 1e4).toFixed(2) + '万'
    if (abs >= 1000) return Math.round(v).toLocaleString('en-US')
    return small(v)
  }
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
  if (abs >= 1_000) return (v / 1_000).toFixed(2) + 'k'
  return small(v)
}

const COUNTRY_NAMES: Record<string, L10n> = {
  CN: { en: 'China', zh: '中国' },
  HK: { en: 'Hong Kong SAR, China', zh: '中国香港特别行政区' },
  MO: { en: 'Macao SAR, China', zh: '中国澳门特别行政区' },
  TW: { en: 'Taiwan, China', zh: '中国台湾' },
  TH: { en: 'Thailand', zh: '泰国' },
  SG: { en: 'Singapore', zh: '新加坡' },
  MY: { en: 'Malaysia', zh: '马来西亚' },
  ID: { en: 'Indonesia', zh: '印度尼西亚' },
  VN: { en: 'Vietnam', zh: '越南' },
  JP: { en: 'Japan', zh: '日本' },
  KR: { en: 'South Korea', zh: '韩国' },
  IN: { en: 'India', zh: '印度' },
  AU: { en: 'Australia', zh: '澳大利亚' },
  US: { en: 'United States', zh: '美国' },
  GB: { en: 'United Kingdom', zh: '英国' },
  UK: { en: 'United Kingdom', zh: '英国' },
  DE: { en: 'Germany', zh: '德国' },
  FR: { en: 'France', zh: '法国' },
  NL: { en: 'Netherlands', zh: '荷兰' },
  CH: { en: 'Switzerland', zh: '瑞士' },
}

/** ISO country code → display name (`CN` → `China` / `中国`). Free text passes through. */
export function countryLabel(country: string | null | undefined, locale: ReportLocale): string {
  if (!country) return ''
  const hit = COUNTRY_NAMES[country.trim().toUpperCase()]
  if (!hit) return country
  return locale === 'zh' ? hit.zh : hit.en
}

const ZH_NUMERALS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

/** Section number as shown in the kicker: `3` (en) / `三` (zh). */
export function sectionNumber(n: number, locale: ReportLocale): string {
  if (locale === 'zh' && n >= 0 && n <= 10) return ZH_NUMERALS[n]
  return String(n)
}

// ─── Framework catalogue (report view) ─────────────────────────────

interface ReportFrameworkDef {
  code: string
  name: L10n
  /** Cover title, e.g. "Sustainability Report" / "可持续发展报告". */
  reportTitle?: L10n
  /** Content-index heading, e.g. "GRI Content Index". */
  indexTitle: L10n
  /** Heading of the code column in the content index and metrics table. */
  codeColumn: L10n
  /** Prefix stripped from codes for display (HKEX-A1.1 → A1.1). */
  codePrefix?: string
}

const SUSTAINABILITY_REPORT: L10n = { en: 'Sustainability Report', zh: '可持续发展报告' }
const ESRS_INDEX: L10n = { en: 'ESRS Content Index', zh: 'ESRS 披露索引' }
const ESRS_CODE: L10n = { en: 'ESRS DR', zh: 'ESRS 披露要求' }

/**
 * Every framework id that can be published. Names mirror src/lib/frameworks.ts
 * (code / name / nameZh); index titles follow each standard's own convention.
 */
export const REPORT_FRAMEWORKS: Record<string, ReportFrameworkDef> = {
  gri: { code: 'GRI', name: { en: 'GRI Standards (Universal + Topic)', zh: 'GRI 标准（通用标准及议题标准）' }, indexTitle: { en: 'GRI Content Index', zh: 'GRI 内容索引' }, codeColumn: { en: 'GRI disclosure', zh: 'GRI 披露项' } },
  'csrd-e1': { code: 'CSRD E1', name: { en: 'CSRD ESRS E1 Climate Change', zh: 'CSRD ESRS E1——气候变化' }, indexTitle: ESRS_INDEX, codeColumn: ESRS_CODE },
  'csrd-e2': { code: 'CSRD E2', name: { en: 'CSRD ESRS E2 Pollution', zh: 'CSRD ESRS E2——污染' }, indexTitle: ESRS_INDEX, codeColumn: ESRS_CODE },
  'csrd-e3': { code: 'CSRD E3', name: { en: 'CSRD ESRS E3 Water & Marine Resources', zh: 'CSRD ESRS E3——水和海洋资源' }, indexTitle: ESRS_INDEX, codeColumn: ESRS_CODE },
  'csrd-e4': { code: 'CSRD E4', name: { en: 'CSRD ESRS E4 Biodiversity & Ecosystems', zh: 'CSRD ESRS E4——生物多样性和生态系统' }, indexTitle: ESRS_INDEX, codeColumn: ESRS_CODE },
  'csrd-e5': { code: 'CSRD E5', name: { en: 'CSRD ESRS E5 Resource Use & Circular Economy', zh: 'CSRD ESRS E5——资源利用和循环经济' }, indexTitle: ESRS_INDEX, codeColumn: ESRS_CODE },
  'csrd-s1': { code: 'CSRD S1', name: { en: 'CSRD ESRS S1 Own Workforce', zh: 'CSRD ESRS S1——自有员工' }, indexTitle: ESRS_INDEX, codeColumn: ESRS_CODE },
  'csrd-s2': { code: 'CSRD S2', name: { en: 'CSRD ESRS S2 Value Chain Workers', zh: 'CSRD ESRS S2——价值链工人' }, indexTitle: ESRS_INDEX, codeColumn: ESRS_CODE },
  'csrd-s3': { code: 'CSRD S3', name: { en: 'CSRD ESRS S3 Affected Communities', zh: 'CSRD ESRS S3——受影响社区' }, indexTitle: ESRS_INDEX, codeColumn: ESRS_CODE },
  'csrd-s4': { code: 'CSRD S4', name: { en: 'CSRD ESRS S4 Consumers & End-Users', zh: 'CSRD ESRS S4——消费者和终端用户' }, indexTitle: ESRS_INDEX, codeColumn: ESRS_CODE },
  'csrd-g1': { code: 'CSRD G1', name: { en: 'CSRD ESRS G1 Business Conduct', zh: 'CSRD ESRS G1——商业行为' }, indexTitle: ESRS_INDEX, codeColumn: ESRS_CODE },
  'issb-s1': { code: 'ISSB S1', name: { en: 'IFRS S1 General Requirements for Disclosure of Sustainability-related Financial Information', zh: 'IFRS S1——可持续相关财务信息披露一般要求' }, indexTitle: { en: 'IFRS S1 Content Index', zh: 'IFRS S1 披露索引' }, codeColumn: { en: 'IFRS S1 ¶', zh: 'IFRS S1 段落' } },
  'issb-s2': { code: 'ISSB S2', name: { en: 'IFRS S2 Climate-related Disclosures', zh: 'IFRS S2——气候相关披露' }, indexTitle: { en: 'IFRS S2 Content Index', zh: 'IFRS S2 披露索引' }, codeColumn: { en: 'IFRS S2 ¶', zh: 'IFRS S2 段落' } },
  issb: { code: 'ISSB S1/S2', name: { en: 'ISSB Sustainability & Climate Standards', zh: 'ISSB 可持续披露准则（IFRS S1/S2）' }, indexTitle: { en: 'IFRS S1/S2 Content Index', zh: 'IFRS S1/S2 披露索引' }, codeColumn: { en: 'Paragraph', zh: '段落' } },
  tcfd: { code: 'TCFD', name: { en: 'Task Force on Climate-Related Financial Disclosures', zh: '气候相关财务信息披露工作组（TCFD）建议' }, indexTitle: { en: 'TCFD Recommendations Index', zh: 'TCFD 建议披露索引' }, codeColumn: { en: 'Recommendation', zh: '建议披露' } },
  cdp: { code: 'CDP', name: { en: 'CDP Climate Change Questionnaire', zh: 'CDP 气候变化问卷' }, indexTitle: { en: 'CDP Questionnaire Index', zh: 'CDP 问卷索引' }, codeColumn: { en: 'Question', zh: '问题' } },
  'cdp-2024': { code: 'CDP CC', name: { en: 'CDP Climate Change 2024', zh: 'CDP 气候变化问卷 2024' }, indexTitle: { en: 'CDP Questionnaire Index', zh: 'CDP 问卷索引' }, codeColumn: { en: 'Question', zh: '问题' } },
  'sec-climate': { code: 'SEC', name: { en: 'SEC Climate Disclosure Rule', zh: 'SEC 气候披露规则' }, indexTitle: { en: 'SEC Climate Disclosure Index', zh: 'SEC 气候披露索引' }, codeColumn: { en: 'Item', zh: '条目' } },
  'ca-sb253': { code: 'SB 253', name: { en: 'California SB 253 (CCDAA)', zh: '加州 SB 253（气候企业数据问责法案）' }, indexTitle: { en: 'SB 253 Disclosure Index', zh: 'SB 253 披露索引' }, codeColumn: { en: 'Requirement', zh: '要求' } },
  'ca-sb261': { code: 'SB 261', name: { en: 'California SB 261 (Climate Risk)', zh: '加州 SB 261（气候相关财务风险）' }, indexTitle: { en: 'SB 261 Disclosure Index', zh: 'SB 261 披露索引' }, codeColumn: { en: 'Requirement', zh: '要求' } },
  'eu-taxonomy': { code: 'EU Tax', name: { en: 'EU Taxonomy Alignment', zh: '欧盟分类法一致性' }, indexTitle: { en: 'EU Taxonomy Disclosure Index', zh: '欧盟分类法披露索引' }, codeColumn: { en: 'KPI', zh: '关键绩效指标' } },
  'cn-sse': {
    code: 'SSE',
    name: { en: 'China Exchanges Sustainability Reporting Guidelines (SSE / SZSE / BSE)', zh: '《上市公司自律监管指引——可持续发展报告（试行）》' },
    reportTitle: SUSTAINABILITY_REPORT,
    indexTitle: { en: 'Sustainability Report Guideline Index', zh: '《可持续发展报告》指标索引' },
    codeColumn: { en: 'Topic / indicator', zh: '议题 / 指标编号' },
  },
  'cn-csds': {
    code: 'CSDS',
    name: { en: 'China Corporate Sustainability Disclosure Standards (MOF)', zh: '《企业可持续披露准则》' },
    reportTitle: SUSTAINABILITY_REPORT,
    indexTitle: { en: 'CSDS Disclosure Index', zh: '《企业可持续披露准则》披露索引' },
    codeColumn: { en: 'Disclosure requirement', zh: '披露要求编号' },
  },
  'hkex-esg': {
    code: 'HKEX ESG',
    name: { en: 'HKEX ESG Reporting Code (Main Board Listing Rules Appendix C2)', zh: '香港联交所《环境、社会及管治守则》（《主板上市规则》附录 C2）' },
    reportTitle: { en: 'ESG Report', zh: '环境、社会及管治报告' },
    indexTitle: { en: 'ESG Reporting Code Content Index', zh: '《环境、社会及管治守则》内容索引' },
    codeColumn: { en: 'Aspect / KPI', zh: '层面 / 关键绩效指标' },
    codePrefix: 'HKEX-',
  },
  'cass-esg': {
    code: 'CASS-ESG',
    name: { en: 'CASS-ESG 5.0 Reporting Guidelines', zh: '《中国企业社会责任报告指南（CASS-ESG 5.0）》' },
    reportTitle: { en: 'ESG Report', zh: 'ESG 报告' },
    indexTitle: { en: 'CASS-ESG 5.0 Indicator Index', zh: 'CASS-ESG 5.0 指标索引' },
    codeColumn: { en: 'Indicator', zh: '指标编号' },
  },
}

export interface ReportFramework {
  id: string
  code: string
  name: string
  reportTitle: string
  indexTitle: string
  codeColumn: string
  /** Prefix stripped from codes for display (e.g. `HKEX-`). */
  codePrefix?: string
}

/** Localised framework metadata for the report. Unknown ids get a generic shell. */
export function getReportFramework(id: string, locale: ReportLocale): ReportFramework {
  const lang: 'en' | 'zh' = locale === 'zh' ? 'zh' : 'en'
  const def = REPORT_FRAMEWORKS[id]
  if (!def) {
    const code = id.toUpperCase()
    return {
      id,
      code,
      name: code,
      reportTitle: SUSTAINABILITY_REPORT[lang],
      indexTitle: lang === 'zh' ? `${code} 披露索引` : `${code} Content Index`,
      codeColumn: lang === 'zh' ? '编号' : 'Code',
    }
  }
  return {
    id,
    code: def.code,
    name: def.name[lang],
    reportTitle: (def.reportTitle ?? SUSTAINABILITY_REPORT)[lang],
    indexTitle: def.indexTitle[lang],
    codeColumn: def.codeColumn[lang],
    codePrefix: def.codePrefix,
  }
}

/** Code as printed in tables (`HKEX-A1.1` → `A1.1`). */
export function displayCode(code: string, fw: { codePrefix?: string }): string {
  if (fw.codePrefix && code.startsWith(fw.codePrefix)) return code.slice(fw.codePrefix.length)
  return code
}

/** Choose the zh text when rendering in zh and it is present; else the canonical text. */
export function pickLocalized(en: string | null | undefined, zh: string | null | undefined, locale: ReportLocale): string {
  if (locale === 'zh' && zh && zh.trim()) return zh
  return en ?? ''
}
