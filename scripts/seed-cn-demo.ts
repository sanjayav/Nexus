/**
 * Opt-in mainland-China demo organisation:
 *   绿源控股集团 (Lvyuan Holdings Group) — fictional A+H-listed (SSE + HKEX)
 *   new-energy & advanced-manufacturing group, reporting FY2026.
 *
 * Creates (idempotently) a SEPARATE org from the default demo workspace:
 *   - organisation row + 5 system roles (permissions copied from the demo org)
 *   - entity tree: group → 5 subsidiaries → 1 production base each
 *   - 11 users with Chinese names on the lvyuan.example domain + org_members
 *   - frameworks cn-sse, cn-csds, hkex-esg, cass-esg, gri enabled
 *   - an active FY2026 reporting period per framework
 *   - ~22 question_assignments across roles/statuses so My Tasks and the
 *     reviewer queue have data
 *
 * Figures are coherent with the CN demo dataset (mockData.cn.ts): Scope 2
 * location-based 980,916 tCO2e = 1,720,000 MWh grid × 0.5703 (MEE 2022 grid
 * factor), Yibin natural gas 62,000,000 m³ × 2.1622 kg/m³ ≈ 134,044 tCO2e, etc.
 *
 * MANUAL ONLY. Not called from api/setup.ts or CI. Prerequisite: /api/setup has
 * run (questionnaire items, demo-org roles/permissions, org_framework_enablement)
 * and the CN framework seeds (cn-sse, cn-csds, hkex-esg, cass-esg) are present —
 * assignments for a framework with no items are skipped with a warning.
 *
 * Usage:
 *   npm run seed-cn                 # writes to DATABASE_URL from .env
 *   npm run seed-cn -- --dry-run    # prints the plan, no DB connection
 * Demo password: CN_DEMO_PASSWORD env var, default "demo2026" (same as the
 * default demo workspace).
 */
import { neon } from '@neondatabase/serverless'
import { config as loadEnv } from 'dotenv'
import * as bcrypt from 'bcryptjs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DRY_RUN = process.argv.includes('--dry-run')

if (process.env.CI || process.env.VERCEL) {
  console.error('seed-cn-demo is a manual, opt-in script and refuses to run in CI / Vercel.')
  process.exit(1)
}

// ─── Fixed ids so re-runs update instead of duplicating ──────────────────
const CN_ORG = '00000000-0000-0000-0000-0000000c0001'
const DEMO_ORG = '00000000-0000-0000-0000-000000000001'

const ROLE = {
  admin:       '00000000-0000-0000-0000-0000000c0010',
  'team-lead': '00000000-0000-0000-0000-0000000c0011',
  analyst:     '00000000-0000-0000-0000-0000000c0012',
  viewer:      '00000000-0000-0000-0000-0000000c0013',
  auditor:     '00000000-0000-0000-0000-0000000c0014',
} as const
type RoleSlug = keyof typeof ROLE

const ROLE_DEFS: Array<[RoleSlug, string, string]> = [
  ['admin',     'Platform Admin', 'Full system access'],
  ['team-lead', 'Team Lead',      'Manage team, approve submissions'],
  ['analyst',   'Analyst',        'Run calculators, upload data, create reports'],
  ['viewer',    'Viewer',         'Read-only access to dashboards and reports'],
  ['auditor',   'Auditor',        'Read-only plus audit trail access'],
]

const E = {
  group:     '00000000-0000-0000-0000-0000000ce001',
  sub_pv:    '00000000-0000-0000-0000-0000000ce010',
  sub_wind:  '00000000-0000-0000-0000-0000000ce011',
  sub_ess:   '00000000-0000-0000-0000-0000000ce012',
  sub_mfg:   '00000000-0000-0000-0000-0000000ce013',
  sub_mat:   '00000000-0000-0000-0000-0000000ce014',
  base_yc:   '00000000-0000-0000-0000-0000000ce020',
  base_wlcb: '00000000-0000-0000-0000-0000000ce021',
  base_zq:   '00000000-0000-0000-0000-0000000ce022',
  base_hf:   '00000000-0000-0000-0000-0000000ce023',
  base_yb:   '00000000-0000-0000-0000-0000000ce024',
} as const

type EntityType = 'group' | 'business_unit' | 'subsidiary' | 'plant' | 'office'
const ENTITIES: Array<[id: string, parent: string | null, type: EntityType, name: string, code: string, country: string, equity: number | null, industry: string | null]> = [
  [E.group,     null,       'group',      '绿源控股集团股份有限公司',     'LYHG',    'China', null, 'New energy & advanced manufacturing'],
  [E.sub_pv,    E.group,    'subsidiary', '绿源光伏科技（江苏盐城）',     'LY-PV',   'China', 100,  'Solar PV cells & modules'],
  [E.sub_wind,  E.group,    'subsidiary', '绿源风电（内蒙古乌兰察布）',   'LY-WIND', 'China', 100,  'Wind power generation'],
  [E.sub_ess,   E.group,    'subsidiary', '绿源储能（广东肇庆）',         'LY-ESS',  'China', 100,  'Battery energy storage systems'],
  [E.sub_mfg,   E.group,    'subsidiary', '绿源智造（安徽合肥）',         'LY-MFG',  'China', 100,  'Power electronics & smart manufacturing'],
  [E.sub_mat,   E.group,    'subsidiary', '绿源新材料（四川宜宾）',       'LY-MAT',  'China', 70,   'Battery cathode materials'],
  [E.base_yc,   E.sub_pv,   'plant',      '盐城光伏电池组件基地',         'YC-PV',   'China', null, null],
  [E.base_wlcb, E.sub_wind, 'plant',      '乌兰察布风电场及升压站',       'WLCB-WF', 'China', null, null],
  [E.base_zq,   E.sub_ess,  'plant',      '肇庆储能电池基地',             'ZQ-ESS',  'China', null, null],
  [E.base_hf,   E.sub_mfg,  'plant',      '合肥智能制造基地',             'HF-MFG',  'China', null, null],
  [E.base_yb,   E.sub_mat,  'plant',      '宜宾正极材料基地',             'YB-CAM',  'China', null, null],
]

type MemberRole = 'platform_admin' | 'group_sustainability_officer' | 'subsidiary_lead' | 'plant_manager' | 'data_contributor' | 'auditor'
interface DemoUser { id: string; email: string; name: string; role: RoleSlug; member: MemberRole; entityId: string; title: string }

const DOMAIN = 'lvyuan.example'
const USERS: DemoUser[] = [
  { id: '00000000-0000-0000-0000-0000000c0100', email: `zhou.zhenhua@${DOMAIN}`, name: '周振华', role: 'admin',     member: 'platform_admin',               entityId: E.group,     title: '数字化与信息管理部 总监' },
  { id: '00000000-0000-0000-0000-0000000c0101', email: `wang.jing@${DOMAIN}`,    name: '王静',   role: 'team-lead', member: 'group_sustainability_officer', entityId: E.group,     title: '可持续发展办公室 主任' },
  { id: '00000000-0000-0000-0000-0000000c0102', email: `li.mingxuan@${DOMAIN}`,  name: '李明轩', role: 'team-lead', member: 'subsidiary_lead',              entityId: E.sub_mat,   title: '绿源新材料 EHS 负责人' },
  { id: '00000000-0000-0000-0000-0000000c0103', email: `wu.min@${DOMAIN}`,       name: '吴敏',   role: 'team-lead', member: 'subsidiary_lead',              entityId: E.sub_ess,   title: '绿源储能 运营副总' },
  { id: '00000000-0000-0000-0000-0000000c0104', email: `chen.siyuan@${DOMAIN}`,  name: '陈思远', role: 'analyst',   member: 'plant_manager',                entityId: E.base_yb,   title: '宜宾基地 能源管理主管' },
  { id: '00000000-0000-0000-0000-0000000c0105', email: `liu.yang@${DOMAIN}`,     name: '刘洋',   role: 'analyst',   member: 'data_contributor',             entityId: E.base_wlcb, title: '乌兰察布风电场 运维工程师' },
  { id: '00000000-0000-0000-0000-0000000c0106', email: `zhao.xue@${DOMAIN}`,     name: '赵雪',   role: 'analyst',   member: 'data_contributor',             entityId: E.base_yc,   title: '盐城基地 环境专员' },
  { id: '00000000-0000-0000-0000-0000000c0107', email: `ma.xiaofeng@${DOMAIN}`,  name: '马晓峰', role: 'analyst',   member: 'plant_manager',                entityId: E.base_hf,   title: '合肥基地 厂长' },
  { id: '00000000-0000-0000-0000-0000000c0108', email: `lin.xiaotong@${DOMAIN}`, name: '林晓彤', role: 'analyst',   member: 'data_contributor',             entityId: E.base_zq,   title: '肇庆基地 EHS 专员' },
  { id: '00000000-0000-0000-0000-0000000c0109', email: `sun.lihua@${DOMAIN}`,    name: '孙丽华', role: 'analyst',   member: 'data_contributor',             entityId: E.group,     title: '董事会办公室 ESG 披露经理' },
  { id: '00000000-0000-0000-0000-0000000c010a', email: `huang.wei@${DOMAIN}`,    name: '黄伟',   role: 'auditor',   member: 'auditor',                      entityId: E.group,     title: '外部鉴证机构 项目经理' },
]
const ADMIN_EMAIL = USERS[0].email

const CN_FRAMEWORKS = ['cn-sse', 'cn-csds', 'hkex-esg', 'cass-esg', 'gri'] as const
type FrameworkId = typeof CN_FRAMEWORKS[number]

const FY = 2026
const PERIOD = { label: 'FY2026', start: '2026-01-01', end: '2026-12-31', deadline: '2027-04-30' }

type Status = 'not_started' | 'in_progress' | 'submitted' | 'reviewed' | 'approved' | 'rejected'
interface Plan {
  email: string
  entityId: string
  framework: FrameworkId
  /** Tried in order against questionnaire_item.gri_code (prefix match). */
  codes?: string[]
  /** Tried next against line_item / section (ILIKE). English and Chinese. */
  keywords?: string[]
  /** Last resort: Nth item of the framework (ordered by code). */
  fallbackIndex: number
  status: Status
  modes: Array<'Manual' | 'Calculator' | 'Connector'>
  /** Used when the matched item has a unit (numeric datapoint). */
  value?: number
  unit?: string
  /** Used when the matched item has no unit (narrative datapoint). */
  narrative?: string
  due: string
  comment?: string
}

const u = (name: string) => USERS.find(x => x.name === name)!.email

const NARR = {
  transition: '“双碳”行动方案（2024–2030）：力争 2028 年实现运营碳达峰、2045 年实现运营碳中和（范围一、二，市场法）；2030 年可再生电力占比不低于 80%。主要措施：新增厂区分布式光伏 120 MW、宜宾基地天然气窑炉电气化改造、扩大绿电直购。',
  scenario: '采用 NGFS“2050 净零”“延迟转型”“当前政策”三种转型情景，以及 IPCC SSP1-2.6、SSP5-8.5 实体情景，时间节点为 2030 年、2040 年。初步结果：SSP5-8.5 情景下 2040 年极端天气导致的年均停产损失约 1.2 亿元，主要集中于盐城、肇庆基地。\n\n[草稿 — 待补充资产价值口径与 2026 年中期报告对齐说明]',
  rural: '2026 年乡村振兴投入 3,860 万元：在内蒙古察哈尔右翼中旗实施“光伏 + 牧业”项目，为 12 个嘎查村集体年均增收约 260 万元；在四川宜宾开展消费帮扶，采购农副产品 1,250 万元；开设“绿源新能源技工班”，培训农村青年 640 人，其中 410 人实现就业。',
  pollutants: '五大基地均依法取得排污许可证。2026 年主要污染物排放量：化学需氧量 412.6 吨、氨氮 38.6 吨、氮氧化物 286.4 吨、二氧化硫 21.4 吨，均满足许可排放限值。',
  suppliers: '供应商 3,860 家：华东 2,140、华南 690、西南 420、华北 310、其他境内 186、境外 114。供应商准入须签署《供应商行为准则》，对关键物料供应商开展 ESG 审核及溯源。',
  water: '取水总量 862.4 万立方米（市政自来水 712.6 万、地表水 149.8 万），水重复利用率 91.2%，单位营业收入取水量 1.77 立方米/万元。宜宾、乌兰察布基地位于水资源压力较高地区，已制定节水专项方案。',
  governance: '董事会下设战略与可持续发展委员会，由董事长担任主任委员，每半年审议 ESG 目标进展；可持续发展办公室负责统筹五大基地数据填报与内部复核。',
}

// Scope 2 (location) by base = grid MWh × 0.5703 — sums to the group 980,916 tCO2e.
const S2 = { yc: 353586, yb: 273744, zq: 176793, hf: 136872, wlcb: 39921, group: 980916 }

const PLANS: Plan[] = [
  // ── GRI — site data contributors / plant managers ───────────────────
  { email: u('陈思远'), entityId: E.base_yb, framework: 'gri', codes: ['305-1'], fallbackIndex: 0,
    status: 'in_progress', modes: ['Manual', 'Calculator'], value: 162628, unit: 'tCO2e', due: '2026-10-31',
    comment: '天然气燃烧 134,044 + 碳酸锂分解 28,584；柴油分摊待补充' },
  { email: u('陈思远'), entityId: E.base_yb, framework: 'gri', codes: ['302-1'], fallbackIndex: 1,
    status: 'submitted', modes: ['Manual', 'Connector'], value: 2413722, unit: 'GJ', due: '2026-10-20',
    comment: '天然气 6,200 万 m³ × 38.931 MJ/m³（低位发热量缺省值）' },
  { email: u('陈思远'), entityId: E.base_yb, framework: 'gri', codes: ['305-2'], fallbackIndex: 2,
    status: 'approved', modes: ['Calculator'], value: S2.yb, unit: 'tCO2e', due: '2026-10-15',
    comment: '480,000 MWh × 0.5703 tCO2/MWh（生态环境部 2022 年度全国电网平均排放因子）' },
  { email: u('刘洋'), entityId: E.base_wlcb, framework: 'gri', codes: ['305-1'], fallbackIndex: 0,
    status: 'rejected', modes: ['Manual'], value: 1998, unit: 'tCO2e', due: '2026-10-23',
    comment: '退回：SF₆ 逸散 85 kg 需附升压站 GIS 检修与补气记录' },
  { email: u('刘洋'), entityId: E.base_wlcb, framework: 'gri', codes: ['302-1'], fallbackIndex: 1,
    status: 'not_started', modes: ['Manual', 'Connector'], unit: 'GJ', due: '2026-11-10' },
  { email: u('赵雪'), entityId: E.base_yc, framework: 'gri', codes: ['305-2'], fallbackIndex: 2,
    status: 'submitted', modes: ['Calculator', 'Connector'], value: S2.yc, unit: 'tCO2e', due: '2026-10-25',
    comment: '620,000 MWh 国网计量电量 × 0.5703' },
  { email: u('赵雪'), entityId: E.base_yc, framework: 'gri', codes: ['303-3'], fallbackIndex: 3,
    status: 'in_progress', modes: ['Manual'], unit: 'megalitres', due: '2026-11-05',
    comment: '市政自来水已汇总，地表水取水许可台账待补' },
  { email: u('马晓峰'), entityId: E.base_hf, framework: 'gri', codes: ['305-2'], fallbackIndex: 2,
    status: 'reviewed', modes: ['Calculator'], value: S2.hf, unit: 'tCO2e', due: '2026-10-18' },
  { email: u('马晓峰'), entityId: E.base_hf, framework: 'gri', codes: ['306-3'], fallbackIndex: 4,
    status: 'not_started', modes: ['Manual'], unit: 'tonnes', due: '2026-11-15' },
  { email: u('林晓彤'), entityId: E.base_zq, framework: 'gri', codes: ['305-2'], fallbackIndex: 2,
    status: 'submitted', modes: ['Calculator'], value: S2.zq, unit: 'tCO2e', due: '2026-10-22',
    comment: '6 月并购的电池包工厂自收购日起纳入' },
  { email: u('林晓彤'), entityId: E.base_zq, framework: 'gri', codes: ['403-9'], fallbackIndex: 5,
    status: 'not_started', modes: ['Manual'], unit: 'rate', due: '2026-11-20' },
  // ── GRI — group level ───────────────────────────────────────────────
  { email: u('王静'), entityId: E.group, framework: 'gri', codes: ['305-2'], fallbackIndex: 2,
    status: 'reviewed', modes: ['Calculator'], value: S2.group, unit: 'tCO2e', due: '2026-11-30',
    comment: '五大基地汇总：1,720,000 MWh × 0.5703' },
  { email: u('孙丽华'), entityId: E.group, framework: 'gri', codes: ['2-22'], fallbackIndex: 6,
    status: 'in_progress', modes: ['Manual'], narrative: NARR.transition, due: '2026-11-15' },

  // ── 上交所《可持续发展报告指引》 cn-sse ─────────────────────────────
  { email: u('孙丽华'), entityId: E.group, framework: 'cn-sse', keywords: ['Rural revitalisation plans', 'rural', '乡村振兴'], fallbackIndex: 0,
    status: 'submitted', modes: ['Manual'], narrative: NARR.rural, due: '2026-10-30' },
  { email: u('孙丽华'), entityId: E.group, framework: 'cn-sse', keywords: ['Pollution prevention and control', 'pollut', '污染物'], fallbackIndex: 1,
    status: 'not_started', modes: ['Manual'], narrative: NARR.pollutants, due: '2026-11-20' },
  { email: u('陈思远'), entityId: E.base_yb, framework: 'cn-sse', keywords: ['Scope 1 GHG emissions', 'greenhouse', '温室气体'], fallbackIndex: 2,
    status: 'in_progress', modes: ['Calculator'], value: 162628, unit: 'tCO2e', due: '2026-10-31' },
  { email: u('孙丽华'), entityId: E.group, framework: 'cn-sse', keywords: ['Total water withdrawal', 'water', '取水'], fallbackIndex: 3,
    status: 'submitted', modes: ['Manual'], value: 8624000, unit: 'm3', narrative: NARR.water, due: '2026-10-28',
    comment: '五大基地合计：市政自来水 712.6 万 m³ + 地表水 149.8 万 m³' },

  // ── 《企业可持续披露准则》 cn-csds ──────────────────────────────────
  { email: u('王静'), entityId: E.group, framework: 'cn-csds', codes: ['CSDS-CLIM-STR'], keywords: ['scenario analysis', '情景'], fallbackIndex: 0,
    status: 'in_progress', modes: ['Manual'], narrative: NARR.scenario, due: '2026-11-06' },

  // ── 港交所 ESG 守则 hkex-esg ─────────────────────────────────────────
  { email: u('赵雪'), entityId: E.base_yc, framework: 'hkex-esg', keywords: ['Scope 2 GHG emissions (location', 'greenhouse', '温室气体'], fallbackIndex: 0,
    status: 'submitted', modes: ['Calculator'], value: S2.yc, unit: 'tCO2e', due: '2026-10-25' },
  { email: u('刘洋'), entityId: E.base_wlcb, framework: 'hkex-esg', codes: ['HKEX-A2.1'], keywords: ['energy', '能源'], fallbackIndex: 1,
    status: 'not_started', modes: ['Manual', 'Connector'], unit: 'MWh', due: '2026-11-10' },
  { email: u('孙丽华'), entityId: E.group, framework: 'hkex-esg', codes: ['HKEX-B5.1'], keywords: ['supplier', '供应商'], fallbackIndex: 2,
    status: 'submitted', modes: ['Manual'], value: 3860, unit: 'count', narrative: NARR.suppliers, due: '2026-10-18',
    comment: '已提交 9 天，超出审核 SLA — 请采购部与质量管理部联合确认' },

  // ── CASS-ESG 中国企业社会责任报告指南 cass-esg ───────────────────────
  { email: u('孙丽华'), entityId: E.group, framework: 'cass-esg', codes: ['CASS-G-3'], keywords: ['governance', '治理'], fallbackIndex: 0,
    status: 'not_started', modes: ['Manual'], narrative: NARR.governance, due: '2026-11-30' },
]

function printPlan() {
  console.log(`Org      ${CN_ORG}  绿源控股集团 (Lvyuan Holdings Group)`)
  console.log(`Entities ${ENTITIES.length}`)
  for (const [, , type, name, code] of ENTITIES) console.log(`  · ${type.padEnd(11)} ${code.padEnd(8)} ${name}`)
  console.log(`Users    ${USERS.length}`)
  for (const x of USERS) console.log(`  · ${x.email.padEnd(28)} ${x.name}  ${x.role.padEnd(9)} ${x.member}`)
  console.log(`Frameworks ${CN_FRAMEWORKS.join(', ')} · period ${PERIOD.label} (${PERIOD.start} → ${PERIOD.end}, deadline ${PERIOD.deadline})`)
  console.log(`Assignments planned ${PLANS.length}`)
  for (const p of PLANS) console.log(`  · ${p.framework.padEnd(9)} ${p.status.padEnd(12)} ${p.email}`)
}

async function main() {
  if (DRY_RUN) {
    console.log('▶ DRY RUN — no database connection\n')
    printPlan()
    return
  }

  const __dirname = dirname(fileURLToPath(import.meta.url))
  loadEnv({ path: join(resolve(__dirname, '..'), '.env') })
  if (!process.env.DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1) }
  const sql = neon(process.env.DATABASE_URL)

  console.log('▶ Seeding CN demo org 绿源控股集团 (Lvyuan Holdings Group)…\n')

  // ── Preconditions ───────────────────────────────────────────────────
  const reg = await sql`
    SELECT to_regclass('public.questionnaire_item')        AS qi,
           to_regclass('public.org_framework_enablement')  AS ofe,
           to_regclass('public.reporting_periods')         AS rp
  ` as Array<{ qi: string | null; ofe: string | null; rp: string | null }>
  if (!reg[0]?.qi || !reg[0]?.ofe || !reg[0]?.rp) {
    console.error('✗ Schema not ready (questionnaire_item / org_framework_enablement / reporting_periods). Run /api/setup first.')
    process.exit(1)
  }

  // ── Organisation ────────────────────────────────────────────────────
  await sql`
    INSERT INTO organisations (id, name, slug, industry, country, legal_name, headquarters, website)
    VALUES (${CN_ORG}, '绿源控股集团 (Lvyuan Holdings Group)', 'lvyuan-cn-demo',
            'New energy & advanced manufacturing', 'CN',
            '绿源控股集团股份有限公司', '中国上海', 'https://lvyuan.example')
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, industry = EXCLUDED.industry, country = EXCLUDED.country,
      legal_name = EXCLUDED.legal_name, headquarters = EXCLUDED.headquarters, website = EXCLUDED.website
  `
  console.log('  ✓ organisation')

  // ── Roles (permissions copied from the default demo org by slug) ────
  for (const [slug, name, desc] of ROLE_DEFS) {
    await sql`
      INSERT INTO roles (id, org_id, name, slug, description, is_system)
      VALUES (${ROLE[slug]}, ${CN_ORG}, ${name}, ${slug}, ${desc}, true)
      ON CONFLICT DO NOTHING
    `
    await sql`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT ${ROLE[slug]}, rp.permission_id
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      WHERE r.org_id = ${DEMO_ORG} AND r.slug = ${slug}
      ON CONFLICT DO NOTHING
    `
  }
  const permCount = await sql`
    SELECT COUNT(*)::int AS n FROM role_permissions WHERE role_id = ${ROLE.admin}
  ` as Array<{ n: number }>
  if (!permCount[0]?.n) console.log('  ⚠ admin role has no permissions — demo org roles missing? Run /api/setup first.')
  console.log(`  ✓ ${ROLE_DEFS.length} roles`)

  // ── Entities ────────────────────────────────────────────────────────
  for (const [id, parent, type, name, code, country, equity, industry] of ENTITIES) {
    await sql`
      INSERT INTO org_entities (id, org_id, parent_id, type, name, code, country, equity, industry)
      VALUES (${id}, ${CN_ORG}, ${parent}, ${type}, ${name}, ${code}, ${country}, ${equity}, ${industry})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, code = EXCLUDED.code, country = EXCLUDED.country,
        equity = EXCLUDED.equity, industry = EXCLUDED.industry
    `
  }
  console.log(`  ✓ ${ENTITIES.length} entities`)

  // ── Users + memberships ─────────────────────────────────────────────
  const hash = bcrypt.hashSync(process.env.CN_DEMO_PASSWORD || 'demo2026', 10)
  const userIdByEmail = new Map<string, string>()
  for (const x of USERS) {
    await sql`
      INSERT INTO users (id, org_id, email, name, password_hash)
      VALUES (${x.id}, ${CN_ORG}, ${x.email}, ${x.name}, ${hash})
      ON CONFLICT DO NOTHING
    `
    const row = await sql`SELECT id, org_id FROM users WHERE email = ${x.email}` as Array<{ id: string; org_id: string }>
    if (!row[0] || row[0].org_id !== CN_ORG) {
      console.log(`  ⚠ ${x.email} exists in another org — left untouched`)
      continue
    }
    userIdByEmail.set(x.email, row[0].id)
    await sql`INSERT INTO user_roles (user_id, role_id) VALUES (${row[0].id}, ${ROLE[x.role]}) ON CONFLICT DO NOTHING`
    await sql`
      INSERT INTO org_members (org_id, user_id, entity_id, email, name, role)
      VALUES (${CN_ORG}, ${row[0].id}, ${x.entityId}, ${x.email}, ${x.name}, ${x.member})
      ON CONFLICT (org_id, email, entity_id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, user_id = EXCLUDED.user_id
    `
  }
  console.log(`  ✓ ${userIdByEmail.size}/${USERS.length} users + memberships`)

  // ── Frameworks + FY2026 periods ─────────────────────────────────────
  const itemCounts = new Map<string, number>()
  const periodByFw = new Map<string, string>()
  const adminId = userIdByEmail.get(ADMIN_EMAIL) ?? null
  for (const fw of CN_FRAMEWORKS) {
    await sql`
      INSERT INTO org_framework_enablement (org_id, framework_id, enabled, enabled_by)
      VALUES (${CN_ORG}, ${fw}, true, ${adminId})
      ON CONFLICT (org_id, framework_id) DO UPDATE SET enabled = true
    `
    await sql`
      INSERT INTO reporting_periods (org_id, framework_id, year, label, status, start_date, end_date, submission_deadline, notes)
      VALUES (${CN_ORG}, ${fw}, ${FY}, ${PERIOD.label}, 'active', ${PERIOD.start}, ${PERIOD.end}, ${PERIOD.deadline},
              '与年度报告同时披露（2027-04-30 前）')
      ON CONFLICT (org_id, framework_id, year) DO NOTHING
    `
    const p = await sql`
      SELECT id FROM reporting_periods WHERE org_id = ${CN_ORG} AND framework_id = ${fw} AND year = ${FY} LIMIT 1
    ` as Array<{ id: string }>
    if (p[0]) periodByFw.set(fw, p[0].id)
    const c = await sql`SELECT COUNT(*)::int AS n FROM questionnaire_item WHERE framework_id = ${fw}` as Array<{ n: number }>
    itemCounts.set(fw, c[0]?.n ?? 0)
    console.log(`  ✓ framework ${fw.padEnd(9)} enabled · ${PERIOD.label} active · ${itemCounts.get(fw)} items`)
  }

  // ── Assignments ─────────────────────────────────────────────────────
  type Item = { id: string; gri_code: string; line_item: string; unit: string | null }
  const used = new Map<string, Set<string>>() // email → item ids picked this run
  let created = 0
  let skipped = 0

  for (const p of PLANS) {
    if (!itemCounts.get(p.framework)) {
      console.log(`  ⚠ ${p.framework}: no questionnaire items yet (framework seed not run) — skipping ${p.email}`)
      skipped++
      continue
    }
    const taken = used.get(p.email) ?? new Set<string>()
    const pick = (rows: Item[]) => rows.find(r => !taken.has(r.id))

    let q: Item | undefined
    for (const code of p.codes ?? []) {
      if (q) break
      q = pick(await sql`
        SELECT id, gri_code, line_item, unit FROM questionnaire_item
        WHERE framework_id = ${p.framework} AND gri_code LIKE ${code + '%'}
        ORDER BY gri_code, line_item LIMIT 20
      ` as Item[])
    }
    for (const kw of p.keywords ?? []) {
      if (q) break
      q = pick(await sql`
        SELECT id, gri_code, line_item, unit FROM questionnaire_item
        WHERE framework_id = ${p.framework}
          AND (line_item ILIKE ${'%' + kw + '%'} OR section ILIKE ${'%' + kw + '%'} OR subsection ILIKE ${'%' + kw + '%'})
        ORDER BY gri_code, line_item LIMIT 20
      ` as Item[])
    }
    if (!q) {
      q = pick(await sql`
        SELECT id, gri_code, line_item, unit FROM questionnaire_item
        WHERE framework_id = ${p.framework}
        ORDER BY gri_code, line_item OFFSET ${p.fallbackIndex} LIMIT 20
      ` as Item[])
    }
    if (!q) { console.log(`  ⚠ ${p.framework}: no free item for ${p.email} — skipped`); skipped++; continue }
    taken.add(q.id)
    used.set(p.email, taken)

    const existing = await sql`
      SELECT id FROM question_assignments
      WHERE org_id = ${CN_ORG} AND assignee_email = ${p.email} AND questionnaire_item_id = ${q.id}
      LIMIT 1
    ` as Array<{ id: string }>
    if (existing.length > 0) { skipped++; continue }

    // Narrative when the plan has text and the datapoint has no unit, or the
    // plan has no number to put in it.
    const isNarrative = !!p.narrative && (!q.unit || p.value === undefined)
    const name = USERS.find(x => x.email === p.email)!.name
    const hasValue = !isNarrative && p.status !== 'not_started' && p.value !== undefined
    const usedMode = p.status === 'not_started' ? null : p.modes[0]
    const narrativeBody = isNarrative && p.status !== 'not_started' ? p.narrative! : null

    await sql`
      INSERT INTO question_assignments
        (org_id, framework_id, questionnaire_item_id, gri_code, line_item, unit,
         entity_id, assignee_email, assignee_name, assignee_user_id,
         entry_modes, used_mode, due_date, status, value, comment, response_type,
         narrative_body, period_id, assigned_by)
      VALUES
        (${CN_ORG}, ${p.framework}, ${q.id}, ${q.gri_code}, ${q.line_item}, ${isNarrative ? null : (q.unit ?? p.unit ?? null)},
         ${p.entityId}, ${p.email}, ${name}, ${userIdByEmail.get(p.email) ?? null},
         ${JSON.stringify(p.modes)}::jsonb, ${usedMode}, ${p.due}, ${p.status}, ${hasValue ? p.value! : null},
         ${p.comment ?? null}, ${isNarrative ? 'narrative' : 'numeric'},
         ${narrativeBody}, ${periodByFw.get(p.framework) ?? null}, ${ADMIN_EMAIL})
    `
    console.log(`  ✓ ${p.framework.padEnd(9)} ${p.status.padEnd(12)} ${q.gri_code.padEnd(12)} ${name} · ${q.line_item.slice(0, 40)}`)
    created++
  }

  console.log(`\n✓ CN demo org ready — assignments created ${created}, skipped ${skipped}`)
  console.log(`  Sign in as e.g. ${USERS[1].email} (可持续发展办公室) or ${USERS[4].email} (宜宾基地).`)
}

main().catch(e => { console.error('ERROR:', e); process.exit(1) })
