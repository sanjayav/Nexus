/**
 * Server-side message dictionary (en / zh / th) for text the server renders
 * itself: notifications (in-app rows, emails, IM group bots), password-reset
 * email, anomaly headlines/details, AI labels and errors, and the regulatory
 * calendar.
 *
 * Pure module — no DB, no env. DB-aware locale resolution (user.locale →
 * Accept-Language → org market default → en) lives in api/_orgSettings.ts.
 *
 * Rules:
 *  - `en` is the source of truth and `zh` must have exactly the same keys
 *    (enforced by src/test/unit/server-i18n.test.ts).
 *  - `th` is best-effort; missing keys fall back to `en`.
 *  - Placeholders are `{name}`. When params.count === 1 and a `<key>_one`
 *    entry exists it is used instead of `<key>` (English pluralisation).
 */

export type Locale = 'en' | 'zh' | 'th'
export const SUPPORTED_LOCALES = ['en', 'zh', 'th'] as const satisfies readonly Locale[]

/** Normalise any BCP-47-ish tag ('zh-CN', 'zh_Hans', 'th-TH', 'en-GB') to a supported locale. */
export function normalizeLocale(raw: unknown): Locale | null {
  if (typeof raw !== 'string') return null
  const tag = raw.trim().toLowerCase().replace('_', '-')
  if (!tag) return null
  if (tag === 'zh' || tag.startsWith('zh-')) {
    // Traditional-script tags are not supported yet; Simplified is the closest.
    return 'zh'
  }
  if (tag === 'th' || tag.startsWith('th-')) return 'th'
  if (tag === 'en' || tag.startsWith('en-')) return 'en'
  return null
}

/**
 * Parse an Accept-Language header and return the best supported locale,
 * honouring q-values. `*` and unsupported tags are ignored.
 */
export function parseAcceptLanguage(header: unknown): Locale | null {
  const raw = Array.isArray(header) ? header[0] : header
  if (typeof raw !== 'string' || !raw.trim()) return null
  const entries = raw.split(',').map((part, idx) => {
    const [tag, ...params] = part.trim().split(';')
    let q = 1
    for (const p of params) {
      const m = /^\s*q\s*=\s*([0-9.]+)\s*$/.exec(p)
      if (m) q = Number(m[1])
    }
    return { tag: tag.trim(), q: Number.isFinite(q) ? q : 0, idx }
  })
  entries.sort((a, b) => (b.q - a.q) || (a.idx - b.idx))
  for (const e of entries) {
    if (e.q <= 0) continue
    const loc = normalizeLocale(e.tag)
    if (loc) return loc
  }
  return null
}

export type Market = 'global' | 'cn'

/** Default locale for an org market when nothing more specific is known. */
export function marketDefaultLocale(market: Market | null | undefined): Locale {
  return market === 'cn' ? 'zh' : 'en'
}

/**
 * Resolution order: user.locale → Accept-Language header → org market default
 * (zh for market 'cn') → en.
 */
export function resolveLocale(input: {
  userLocale?: unknown
  acceptLanguage?: unknown
  market?: Market | null
}): Locale {
  return (
    normalizeLocale(input.userLocale) ??
    parseAcceptLanguage(input.acceptLanguage) ??
    marketDefaultLocale(input.market ?? null)
  )
}

/** BCP-47 tag for Intl APIs and `Content-Language`. */
export function intlTag(locale: Locale): string {
  return locale === 'zh' ? 'zh-CN' : locale === 'th' ? 'th-TH' : 'en-GB'
}

// ─────────────────────────────────────────────────────────────────────────
// Dictionaries
// ─────────────────────────────────────────────────────────────────────────

const en = {
  // Shared chrome
  'common.tbd': 'TBD',
  'email.cta': 'Open Nexus',
  'email.footer': 'Nexus — Sustainability Intelligence Platform · by Aeiforo',
  'im.link_label': 'View in Nexus',
  'im.channel.dingtalk': 'DingTalk',
  'im.channel.feishu': 'Feishu',
  'im.channel.wecom': 'WeCom',

  // Assignment notifications (api/org.ts)
  'notify.assignment_created.subject': 'New assignment · {code}',
  'notify.assignment_created.body': '{item} — due {due}',
  'notify.assignment_bulk_created.subject': '{count} {framework} items assigned to you',
  'notify.assignment_bulk_created.subject_one': '{count} {framework} item assigned to you',
  'notify.assignment_bulk_created.body': "You've been assigned {count} disclosures. Open My Tasks to start entering data.",
  'notify.assignment_bulk_created.body_due': "You've been assigned {count} disclosures, due {due}. Open My Tasks to start entering data.",
  'notify.comment.subject': '{actor} commented on {code}',
  'notify.comment.body': '{text}',
  'notify.mention.subject': '{actor} mentioned you on {code}',
  'notify.mention.body': '{text}',
  'notify.review_request.subject': '{actor} requested a review on {code}',
  'notify.review_request.body': '{text}',

  // Status transitions (api/org.ts emitStatusTransitionNotifications)
  'notify.status.review_requested.subject': 'Review requested · {ref}',
  'notify.status.review_requested.body': '{assignee} submitted a value for review.',
  'notify.status.approval_requested.subject': 'Approval needed · {ref}',
  'notify.status.approval_requested.body': 'A subsidiary lead passed this figure on for group approval.',
  'notify.status.approved.subject': 'Approved · {ref}',
  'notify.status.approved.body': 'Your submission was approved by the sustainability officer.',
  'notify.status.rejected.subject': 'Sent back · {ref}',
  'notify.status.rejected.body': '{comment}',
  'notify.status.rejected.body_default': 'Please review and resubmit.',

  // Workflow engine (api/workflow/index.ts) — matched from the exact English
  // strings that caller passes today (see LEGACY_PHRASES below).
  'notify.workflow.review_requested.subject': 'Review requested',
  'notify.workflow.review_requested.body': 'A submission is waiting on you.',
  'notify.workflow.approval_requested.subject': 'Approval needed',
  'notify.workflow.approval_requested.body': 'A reviewed submission is ready for approval.',
  'notify.workflow.rejected.subject': 'Sent back',
  'notify.workflow.approved.subject': 'Approved',
  'notify.workflow.approved.body': 'Your submission was approved.',

  // Webhook test
  'notify.webhook_test.subject': 'Nexus test message',
  'notify.webhook_test.body': 'This {channel} group bot is connected to {org}. Notifications will appear here.',

  // Password reset email (api/auth/forgot-password.ts)
  'email.password_reset.subject': 'Reset your Nexus password',
  'email.password_reset.heading': 'Reset your password',
  'email.password_reset.greeting': 'Hi {name},',
  'email.password_reset.intro': 'We received a request to reset your Nexus password. Click the button below to choose a new one. The link expires in 30 minutes.',
  'email.password_reset.cta': 'Reset password',
  'email.password_reset.ignore': "If you didn't request this, you can safely ignore this email — your password won't change.",
  'email.password_reset.direct_link': 'Direct link: {url}',
  'email.password_reset.text': "Reset your Nexus password: {url}\n\nThe link expires in 30 minutes. If you didn't request this, ignore this email.",

  // AI
  'ai.disabled': 'AI features are disabled for this organisation. An administrator can turn them on in Settings.',
  'ai.label': 'AI-generated content — review before use',

  // Anomaly engine (api/_anomalies.ts)
  'anomaly.missing_evidence.headline': 'No evidence attached for {code}',
  'anomaly.missing_evidence.detail': 'Status is "{status}" but no evidence file is on the record. Audit will fail without supporting documentation.',
  'anomaly.narrative_gap.headline': 'Narrative approved but empty — {code}',
  'anomaly.narrative_gap.detail': 'Disclosure marked approved with no narrative body. This will not appear in the published report.',
  'anomaly.late_submission.headline': 'Submitted {count} days after due date',
  'anomaly.late_submission.headline_one': 'Submitted {count} day after due date',
  'anomaly.late_submission.detail': 'Due {due}, submitted {submitted}. Track for process improvement.',
  'anomaly.unit_change.headline': 'Unit changed: "{from}" → "{to}"',
  'anomaly.unit_change.detail': 'Historical filings used "{from}" for this disclosure. Current entry uses "{to}". Confirm unit conversion was applied.',
  'anomaly.yoy_spike.headline': '{delta} vs FY{year}',
  'anomaly.yoy_spike.detail_critical': 'Current {current} vs prior year {prior} — a {delta} change. Confirm whether this reflects a genuine change (restatement, boundary change, major project) or a data error.',
  'anomaly.yoy_spike.detail_warn': 'Current {current} vs prior year {prior}. Variance above the 20% review threshold — recommend a short justification.',
  'anomaly.magnitude_jump.headline': '{ratio}× vs historical average',
  'anomaly.magnitude_jump.detail': 'Current {current} is {ratio}× the 4yr average ({avg}). Often indicates a unit typo (tonnes vs kg, m³ vs litres).',
  'anomaly.z_score_outlier.headline_critical': '|z-score| = {z} — extreme outlier',
  'anomaly.z_score_outlier.detail_critical': 'Value sits {z} standard deviations from the {years}-year mean of {avg} (σ={sd}). Extremely unlikely without a structural change.',
  'anomaly.z_score_outlier.headline_warn': '|z-score| = {z}',
  'anomaly.z_score_outlier.detail_warn': '{z}σ from the {years}-year mean. Worth a sanity check.',
  'anomaly.trend_break.headline_rising': 'Breaks a 3-year rising trend',
  'anomaly.trend_break.detail_rising': 'Previous 3 years rose monotonically. Current value ({current}) reverses the trend. Good news if genuine — worth narrating.',
  'anomaly.trend_break.headline_falling': 'Breaks a 3-year downward trend',
  'anomaly.trend_break.detail_falling': 'Previous 3 years fell monotonically. Current ({current}) reverses the trend upward. Usually worth explaining.',
  'anomaly.peer_deviation.headline_higher': 'Higher than peer plants (z={z})',
  'anomaly.peer_deviation.headline_lower': 'Lower than peer plants (z={z})',
  'anomaly.peer_deviation.detail': 'Value sits {absz}σ from the peer plant mean ({avg}). May reflect a real operating difference or a reporting boundary mismatch.',
  'anomaly.label.yoy_spike': 'YoY spike',
  'anomaly.label.magnitude_jump': 'Magnitude jump',
  'anomaly.label.z_score_outlier': 'Statistical outlier',
  'anomaly.label.trend_break': 'Trend break',
  'anomaly.label.unit_change': 'Unit change',
  'anomaly.label.missing_evidence': 'Missing evidence',
  'anomaly.label.late_submission': 'Late submission',
  'anomaly.label.narrative_gap': 'Narrative gap',
  'anomaly.label.peer_deviation': 'Peer deviation',

  // Regulatory calendar (api/regulatory-calendar.ts)
  'calendar.cn_exchange_report.title': 'FY{fy} sustainability report with annual report (SSE / SZSE / BSE)',
  'calendar.cn_exchange_report.detail': 'Exchange Self-Regulatory Guidelines — Sustainability Report (Trial): disclose together with the FY{fy} annual report, no later than 30 April {due_year}.',
  'calendar.hkex_esg.title': 'HKEX ESG report published with the FY{fy} annual report',
  'calendar.hkex_esg.detail': 'Appendix C2 — the ESG report (including Part D climate disclosures) is published at the same time as the annual report; Main Board annual reports are due within four months of the financial year end.',
  'calendar.cn_ets.title': 'National carbon market: annual emissions report, verification and allowance surrender',
  'calendar.cn_ets.detail': 'Covered entities submit the annual emissions report, complete third-party verification and surrender allowances for the compliance year.',
  'calendar.cn_ets.note': 'Per MEE annual notice',
  'calendar.cn_env_disclosure.title': 'Annual environmental information disclosure for FY{fy} (企业环境信息依法披露)',
  'calendar.cn_env_disclosure.detail': 'Entities in scope of the MEE disclosure measures publish their annual environmental information report for the prior calendar year in the provincial disclosure system.',
  'calendar.cn_env_disclosure.note': 'By 15 March under MEE Order No. 24 (amended September 2026 — confirm against the current text and provincial notice)',
  'calendar.cn_csds.title': 'MOF CSDS Climate Standard (Trial): voluntary adoption',
  'calendar.cn_csds.detail': 'The Ministry of Finance climate standard currently applies on a voluntary basis; map existing exchange / IFRS S2 disclosures ahead of mandatory phase-in.',
  'calendar.cn_csds.note': 'Voluntary — no fixed date',
  'calendar.csrd.title': 'CSRD sustainability statement in the FY{fy} management report',
  'calendar.csrd.detail': 'ESRS sustainability statement with limited assurance, published in the annual financial report. Listed issuers publish within four months of year end (Transparency Directive); wave timing follows the 2025 “stop-the-clock” amendment.',
  'calendar.issb.title': 'IFRS S1 / S2 disclosures with FY{fy} financial statements',
  'calendar.issb.detail': 'IFRS S1 requires sustainability-related financial disclosures to be reported at the same time as the related financial statements; the effective date depends on jurisdictional adoption.',
  'calendar.issb.note': 'Same time as the financial statements',
  'calendar.cdp.title': 'CDP annual disclosure cycle',
  'calendar.cdp.detail': 'Respond to the CDP questionnaire during the annual disclosure window.',
  'calendar.cdp.note': 'Per CDP annual timeline',
  'calendar.tcfd.title': 'TCFD-aligned climate disclosures in the FY{fy} annual report',
  'calendar.tcfd.detail': 'TCFD recommendations are now monitored by the ISSB; disclose in the annual report where your jurisdiction or listing venue requires it.',
  'calendar.tcfd.note': 'With the annual report',
} as const

export type MessageKey = keyof typeof en
type Dict = Record<MessageKey, string>

const zh: Dict = {
  'common.tbd': '待定',
  'email.cta': '打开 Nexus',
  'email.footer': 'Nexus — 可持续发展智能平台 · Aeiforo 出品',
  'im.link_label': '在 Nexus 中查看',
  'im.channel.dingtalk': '钉钉',
  'im.channel.feishu': '飞书',
  'im.channel.wecom': '企业微信',

  'notify.assignment_created.subject': '新任务 · {code}',
  'notify.assignment_created.body': '{item} — 截止日期 {due}',
  'notify.assignment_bulk_created.subject': '您有 {count} 项 {framework} 披露任务',
  'notify.assignment_bulk_created.subject_one': '您有 {count} 项 {framework} 披露任务',
  'notify.assignment_bulk_created.body': '您被分配了 {count} 项披露任务。请打开“我的任务”开始填报数据。',
  'notify.assignment_bulk_created.body_due': '您被分配了 {count} 项披露任务，截止日期 {due}。请打开“我的任务”开始填报数据。',
  'notify.comment.subject': '{actor} 评论了 {code}',
  'notify.comment.body': '{text}',
  'notify.mention.subject': '{actor} 在 {code} 中提到了您',
  'notify.mention.body': '{text}',
  'notify.review_request.subject': '{actor} 请求审核 {code}',
  'notify.review_request.body': '{text}',

  'notify.status.review_requested.subject': '待审核 · {ref}',
  'notify.status.review_requested.body': '{assignee} 已提交数据，等待审核。',
  'notify.status.approval_requested.subject': '待审批 · {ref}',
  'notify.status.approval_requested.body': '子公司负责人已将该数据提交集团审批。',
  'notify.status.approved.subject': '已批准 · {ref}',
  'notify.status.approved.body': '您提交的数据已获可持续发展负责人批准。',
  'notify.status.rejected.subject': '已退回 · {ref}',
  'notify.status.rejected.body': '{comment}',
  'notify.status.rejected.body_default': '请检查后重新提交。',

  'notify.workflow.review_requested.subject': '待审核',
  'notify.workflow.review_requested.body': '有一项提交正在等待您审核。',
  'notify.workflow.approval_requested.subject': '待审批',
  'notify.workflow.approval_requested.body': '一项已审核的提交正在等待审批。',
  'notify.workflow.rejected.subject': '已退回',
  'notify.workflow.approved.subject': '已批准',
  'notify.workflow.approved.body': '您提交的数据已获批准。',

  'notify.webhook_test.subject': 'Nexus 测试消息',
  'notify.webhook_test.body': '此{channel}群机器人已连接到 {org}，通知将发送到本群。',

  'email.password_reset.subject': '重置您的 Nexus 密码',
  'email.password_reset.heading': '重置密码',
  'email.password_reset.greeting': '{name}，您好：',
  'email.password_reset.intro': '我们收到了重置您 Nexus 密码的请求。请点击下方按钮设置新密码，链接将在 30 分钟后失效。',
  'email.password_reset.cta': '重置密码',
  'email.password_reset.ignore': '如果这不是您本人的操作，请忽略此邮件，您的密码不会改变。',
  'email.password_reset.direct_link': '直接链接：{url}',
  'email.password_reset.text': '重置您的 Nexus 密码：{url}\n\n链接将在 30 分钟后失效。如果这不是您本人的操作，请忽略此邮件。',

  'ai.disabled': '本组织已关闭人工智能功能。管理员可在“设置”中开启。',
  'ai.label': '本内容由人工智能生成，使用前请审核',

  'anomaly.missing_evidence.headline': '{code} 未附佐证材料',
  'anomaly.missing_evidence.detail': '状态为“{status}”，但记录中没有佐证文件。缺少支持性文件将无法通过审计。',
  'anomaly.narrative_gap.headline': '叙述已批准但内容为空 — {code}',
  'anomaly.narrative_gap.detail': '该披露项已标记为批准，但没有叙述正文，不会出现在发布的报告中。',
  'anomaly.late_submission.headline': '逾期 {count} 天提交',
  'anomaly.late_submission.headline_one': '逾期 {count} 天提交',
  'anomaly.late_submission.detail': '截止日期 {due}，提交日期 {submitted}。建议跟踪以改进流程。',
  'anomaly.unit_change.headline': '单位变更：“{from}” → “{to}”',
  'anomaly.unit_change.detail': '该披露项的历史数据使用“{from}”，本次填报使用“{to}”。请确认已完成单位换算。',
  'anomaly.yoy_spike.headline': '较 {year} 财年 {delta}',
  'anomaly.yoy_spike.detail_critical': '本期 {current}，上年 {prior}，变动 {delta}。请确认这是真实变化（重述、边界变化、重大项目）还是数据错误。',
  'anomaly.yoy_spike.detail_warn': '本期 {current}，上年 {prior}。变动超过 20% 的审核阈值，建议补充简要说明。',
  'anomaly.magnitude_jump.headline': '为历史均值的 {ratio} 倍',
  'anomaly.magnitude_jump.detail': '本期 {current} 为近 4 年均值（{avg}）的 {ratio} 倍，通常意味着单位录入错误（吨与千克、立方米与升）。',
  'anomaly.z_score_outlier.headline_critical': '|z 值| = {z}，极端异常值',
  'anomaly.z_score_outlier.detail_critical': '该值偏离 {years} 年均值 {avg} 达 {z} 个标准差（σ={sd}）。若无结构性变化，几乎不可能出现。',
  'anomaly.z_score_outlier.headline_warn': '|z 值| = {z}',
  'anomaly.z_score_outlier.detail_warn': '偏离 {years} 年均值 {z}σ，建议核实。',
  'anomaly.trend_break.headline_rising': '打破连续 3 年上升趋势',
  'anomaly.trend_break.detail_rising': '前 3 年持续上升，本期数值（{current}）出现反转。如属实是好消息，值得在报告中说明。',
  'anomaly.trend_break.headline_falling': '打破连续 3 年下降趋势',
  'anomaly.trend_break.detail_falling': '前 3 年持续下降，本期数值（{current}）转为上升，通常需要说明原因。',
  'anomaly.peer_deviation.headline_higher': '高于同类工厂（z={z}）',
  'anomaly.peer_deviation.headline_lower': '低于同类工厂（z={z}）',
  'anomaly.peer_deviation.detail': '该值偏离同类工厂均值（{avg}）{absz}σ，可能反映真实的运营差异，也可能是报告边界不一致。',
  'anomaly.label.yoy_spike': '同比突变',
  'anomaly.label.magnitude_jump': '数量级跳变',
  'anomaly.label.z_score_outlier': '统计异常值',
  'anomaly.label.trend_break': '趋势反转',
  'anomaly.label.unit_change': '单位变更',
  'anomaly.label.missing_evidence': '缺少佐证',
  'anomaly.label.late_submission': '逾期提交',
  'anomaly.label.narrative_gap': '叙述缺失',
  'anomaly.label.peer_deviation': '同类偏离',

  'calendar.cn_exchange_report.title': '{fy} 年度可持续发展报告随年报披露（沪深北交易所）',
  'calendar.cn_exchange_report.detail': '交易所《上市公司自律监管指引——可持续发展报告（试行）》：与 {fy} 年年度报告同时披露，最迟不晚于 {due_year} 年 4 月 30 日。',
  'calendar.hkex_esg.title': '港交所 ESG 报告与 {fy} 财年年报同步刊发',
  'calendar.hkex_esg.detail': '附录 C2：ESG 报告（含 D 部分气候相关披露）须与年报同时刊发；主板发行人须于财政年度结束后四个月内刊发年报。',
  'calendar.cn_ets.title': '全国碳排放权交易市场：年度排放报告、核查与配额清缴',
  'calendar.cn_ets.detail': '重点排放单位报送年度排放报告，完成第三方核查，并完成履约年度的配额清缴。',
  'calendar.cn_ets.note': '以生态环境部年度通知为准',
  'calendar.cn_env_disclosure.title': '{fy} 年度企业环境信息依法披露报告',
  'calendar.cn_env_disclosure.detail': '纳入生态环境部《企业环境信息依法披露管理办法》范围的企业，在省级披露系统中披露上一年度的环境信息依法披露报告。',
  'calendar.cn_env_disclosure.note': '依据生态环境部令第24号，每年3月15日前披露（该办法已于2026年9月修正，请以现行文本及省级通知为准）',
  'calendar.cn_csds.title': '财政部《企业可持续披露准则——气候（试行）》自愿采用',
  'calendar.cn_csds.detail': '财政部气候准则现阶段自愿适用；可将现有交易所及 IFRS S2 披露内容进行映射，为后续强制实施做好准备。',
  'calendar.cn_csds.note': '自愿采用，暂无固定日期',
  'calendar.csrd.title': '{fy} 财年管理层报告中的 CSRD 可持续发展声明',
  'calendar.csrd.detail': '按 ESRS 编制并经有限鉴证的可持续发展声明，随年度财务报告发布。上市发行人须在年度结束后四个月内发布（《透明度指令》）；各批次适用时间以 2025 年“暂停时钟”修订为准。',
  'calendar.issb.title': '与 {fy} 财年财务报表同时发布 IFRS S1 / S2 披露',
  'calendar.issb.detail': 'IFRS S1 要求可持续相关财务信息披露与相关财务报表同时报告；生效日期取决于各司法管辖区的采纳安排。',
  'calendar.issb.note': '与财务报表同时发布',
  'calendar.cdp.title': 'CDP 年度披露周期',
  'calendar.cdp.detail': '在 CDP 年度披露窗口期内完成问卷填报。',
  'calendar.cdp.note': '以 CDP 年度时间表为准',
  'calendar.tcfd.title': '在 {fy} 财年年报中进行 TCFD 气候披露',
  'calendar.tcfd.detail': 'TCFD 建议现由 ISSB 接续监督；如所在司法管辖区或上市地要求，请在年报中披露。',
  'calendar.tcfd.note': '随年报披露',
}

const th: Partial<Dict> = {
  'common.tbd': 'ยังไม่กำหนด',
  'email.cta': 'เปิด Nexus',
  'email.footer': 'Nexus — แพลตฟอร์มข้อมูลความยั่งยืน · โดย Aeiforo',
  'im.link_label': 'ดูใน Nexus',
  'notify.assignment_created.subject': 'งานใหม่ · {code}',
  'notify.assignment_created.body': '{item} — กำหนดส่ง {due}',
  'notify.assignment_bulk_created.subject': 'คุณได้รับมอบหมาย {count} รายการ {framework}',
  'notify.assignment_bulk_created.subject_one': 'คุณได้รับมอบหมาย {count} รายการ {framework}',
  'notify.assignment_bulk_created.body': 'คุณได้รับมอบหมาย {count} รายการเปิดเผยข้อมูล เปิด "งานของฉัน" เพื่อเริ่มกรอกข้อมูล',
  'notify.assignment_bulk_created.body_due': 'คุณได้รับมอบหมาย {count} รายการเปิดเผยข้อมูล กำหนดส่ง {due} เปิด "งานของฉัน" เพื่อเริ่มกรอกข้อมูล',
  'notify.comment.subject': '{actor} แสดงความคิดเห็นใน {code}',
  'notify.mention.subject': '{actor} กล่าวถึงคุณใน {code}',
  'notify.review_request.subject': '{actor} ขอให้ตรวจทาน {code}',
  'notify.status.review_requested.subject': 'รอการตรวจทาน · {ref}',
  'notify.status.review_requested.body': '{assignee} ส่งข้อมูลเพื่อรอการตรวจทาน',
  'notify.status.approval_requested.subject': 'รอการอนุมัติ · {ref}',
  'notify.status.approval_requested.body': 'หัวหน้าบริษัทย่อยส่งตัวเลขนี้ต่อเพื่อรอการอนุมัติระดับกลุ่ม',
  'notify.status.approved.subject': 'อนุมัติแล้ว · {ref}',
  'notify.status.approved.body': 'ข้อมูลที่คุณส่งได้รับการอนุมัติจากเจ้าหน้าที่ด้านความยั่งยืนแล้ว',
  'notify.status.rejected.subject': 'ส่งกลับ · {ref}',
  'notify.status.rejected.body_default': 'โปรดตรวจสอบและส่งใหม่',
  'notify.workflow.review_requested.subject': 'รอการตรวจทาน',
  'notify.workflow.review_requested.body': 'มีรายการที่รอให้คุณตรวจทาน',
  'notify.workflow.approval_requested.subject': 'รอการอนุมัติ',
  'notify.workflow.approval_requested.body': 'มีรายการที่ตรวจทานแล้วและพร้อมรอการอนุมัติ',
  'notify.workflow.rejected.subject': 'ส่งกลับ',
  'notify.workflow.approved.subject': 'อนุมัติแล้ว',
  'notify.workflow.approved.body': 'ข้อมูลที่คุณส่งได้รับการอนุมัติแล้ว',
  'email.password_reset.subject': 'รีเซ็ตรหัสผ่าน Nexus ของคุณ',
  'email.password_reset.heading': 'รีเซ็ตรหัสผ่าน',
  'email.password_reset.greeting': 'สวัสดีคุณ {name}',
  'email.password_reset.cta': 'รีเซ็ตรหัสผ่าน',
  'ai.disabled': 'องค์กรนี้ปิดใช้งานฟีเจอร์ AI ผู้ดูแลระบบสามารถเปิดได้ในการตั้งค่า',
  'ai.label': 'เนื้อหานี้สร้างโดย AI — โปรดตรวจทานก่อนใช้งาน',
}

export const MESSAGES: { en: Dict; zh: Dict; th: Partial<Dict> } = { en, zh, th }

export type MessageParams = Record<string, string | number | null | undefined>

function interpolate(template: string, params: MessageParams | undefined): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = params[name]
    return v == null ? m : String(v)
  })
}

function lookup(locale: Locale, key: string): string | undefined {
  const d = MESSAGES[locale] as Record<string, string | undefined>
  return d[key] ?? (MESSAGES.en as Record<string, string | undefined>)[key]
}

/** True when `key` exists in the English source dictionary. */
export function hasMessage(key: string): key is MessageKey {
  return Object.prototype.hasOwnProperty.call(MESSAGES.en, key)
}

/**
 * Translate `key` for `locale`, falling back to English and finally to the
 * key itself. `params.count === 1` selects the `<key>_one` variant if present.
 */
export function t(locale: Locale, key: MessageKey | string, params?: MessageParams): string {
  let template: string | undefined
  if (params && params.count === 1) template = lookup(locale, `${key}_one`)
  if (template === undefined) template = lookup(locale, key)
  if (template === undefined) return key
  return interpolate(template, params)
}

// ─────────────────────────────────────────────────────────────────────────
// Legacy phrase translation — callers that still pass fixed English strings
// (api/workflow/index.ts) get localised without code changes there.
// ─────────────────────────────────────────────────────────────────────────

const LEGACY_PHRASES: Record<string, MessageKey> = {
  'Review requested': 'notify.workflow.review_requested.subject',
  'A submission is waiting on you.': 'notify.workflow.review_requested.body',
  'Approval needed': 'notify.workflow.approval_requested.subject',
  'A reviewed submission is ready for approval.': 'notify.workflow.approval_requested.body',
  'Sent back': 'notify.workflow.rejected.subject',
  'Please review and resubmit.': 'notify.status.rejected.body_default',
  'Approved': 'notify.workflow.approved.subject',
  'Your submission was approved.': 'notify.workflow.approved.body',
}

/** Translate an exact known English phrase; anything else is returned unchanged. */
export function translateLegacyPhrase(text: string, locale: Locale): string {
  if (locale === 'en') return text
  const key = LEGACY_PHRASES[text]
  return key ? t(locale, key) : text
}

// ─────────────────────────────────────────────────────────────────────────
// AI prompt helpers
// ─────────────────────────────────────────────────────────────────────────

/**
 * Instruction appended to every AI system prompt so the model answers in the
 * user's language. Written in English (the prompts are English) with the
 * target-language name spelled natively.
 */
export function languageInstruction(locale: Locale): string {
  switch (locale) {
    case 'zh':
      return 'LANGUAGE: Write every free-text field of your answer in Simplified Chinese (简体中文). Use the terminology of Chinese regulators and of the cited framework (e.g. 上交所/深交所/北交所《可持续发展报告（试行）》指引, 财政部《企业可持续披露准则》, 港交所附录C2, 生态环境部). Keep numbers, units, identifiers, JSON keys and framework codes exactly as given.'
    case 'th':
      return 'LANGUAGE: Write every free-text field of your answer in Thai (ภาษาไทย). Keep numbers, units, identifiers, JSON keys and framework codes exactly as given.'
    default:
      return 'LANGUAGE: Write every free-text field of your answer in English. Keep numbers, units, identifiers, JSON keys and framework codes exactly as given.'
  }
}
