import type { RoleId } from '@/features/access/model'

/**
 * Seed directory per workspace: everyone who can sign in, be assigned work or
 * be @mentioned. Names and titles are tenant data, in the tenant's language.
 *
 * `user1@marklytics.co.uk` is the demo administrator in both workspaces; every
 * seeded account signs in with the demo password. Dates are offsets in days
 * before first load so the demo always looks current.
 */
export interface SeedMember {
  id: string
  name: string
  email: string
  title: string
  role: RoleId
  /** Frameworks this person fills in; omitted means all. */
  scope?: string[]
  phone?: string
  status?: 'active' | 'invited' | 'suspended'
  /** Days since joining (active / suspended) or since being invited. */
  daysAgo: number
  /** Minutes since last activity. */
  activeMinutesAgo?: number
  invitedBy?: string
}

export const DIRECTORY: Record<string, SeedMember[]> = {
  lvyuan: [
    {
      id: 'wangmin',
      name: '王敏',
      email: 'user1@marklytics.co.uk',
      title: '可持续发展办公室主任',
      role: 'org_admin',
      phone: '+86 138****2041',
      daysAgo: 320,
      activeMinutesAgo: 2,
    },
    {
      id: 'wanglixin',
      name: '王立新',
      email: 'wang.lixin@lvyuan-demo.example',
      title: '信息技术部',
      role: 'platform_admin',
      phone: '+86 139****7310',
      daysAgo: 410,
      activeMinutesAgo: 60 * 26,
    },
    {
      id: 'chensiyuan',
      name: '陈思远',
      email: 'chen.siyuan@lvyuan-demo.example',
      title: '可持续发展办公室',
      role: 'framework_owner',
      scope: ['CN-SSE', 'HKEX-ESG'],
      daysAgo: 300,
      activeMinutesAgo: 45,
    },
    {
      id: 'zhoujing',
      name: '周静',
      email: 'zhou.jing@lvyuan-demo.example',
      title: '董事会办公室',
      role: 'approver',
      daysAgo: 280,
      activeMinutesAgo: 60 * 5,
    },
    {
      id: 'lina',
      name: '李娜',
      email: 'li.na@lvyuan-demo.example',
      title: '风险管理部',
      role: 'reviewer',
      daysAgo: 260,
      activeMinutesAgo: 60 * 3,
    },
    {
      id: 'chengang',
      name: '陈刚',
      email: 'chen.gang@lvyuan-demo.example',
      title: '盐城基地安环部',
      role: 'data_contributor',
      scope: ['CN-SSE', 'CN-CSDS'],
      phone: '+86 136****5582',
      daysAgo: 240,
      activeMinutesAgo: 20,
    },
    {
      id: 'zhangwei',
      name: '张伟',
      email: 'zhang.wei@lvyuan-demo.example',
      title: '财务部',
      role: 'data_contributor',
      scope: ['CN-SSE', 'HKEX-ESG'],
      daysAgo: 240,
      activeMinutesAgo: 60 * 30,
    },
    {
      id: 'liuyang',
      name: '刘洋',
      email: 'liu.yang@lvyuan-demo.example',
      title: '采购部',
      role: 'data_contributor',
      scope: ['CN-SSE'],
      daysAgo: 200,
      activeMinutesAgo: 60 * 50,
    },
    {
      id: 'zhengmingxuan',
      name: '郑明轩',
      email: 'zheng.mingxuan@assurance-demo.example',
      title: '外部鉴证机构',
      role: 'external_auditor',
      daysAgo: 30,
      activeMinutesAgo: 60 * 24 * 2,
    },
    {
      id: 'zhaolei',
      name: '赵磊',
      email: 'zhao.lei@lvyuan-demo.example',
      title: '原外包顾问',
      role: 'data_contributor',
      status: 'suspended',
      daysAgo: 380,
      activeMinutesAgo: 60 * 24 * 40,
    },
    {
      id: 'zhouzihao',
      name: '周子豪',
      email: 'zhou.zihao@lvyuan-demo.example',
      title: '内部审计部',
      role: 'reviewer',
      status: 'invited',
      daysAgo: 1,
      invitedBy: 'wangmin',
    },
  ],
  aeiforo: [
    {
      id: 'sarah',
      name: 'Sarah Lee',
      email: 'user1@marklytics.co.uk',
      title: 'Sustainability Lead',
      role: 'org_admin',
      daysAgo: 300,
      activeMinutesAgo: 2,
    },
    {
      id: 'layla',
      name: 'Layla Al-Rashid',
      email: 'layla.alrashid@aeiforo-demo.example',
      title: 'Head of IT',
      role: 'platform_admin',
      daysAgo: 420,
      activeMinutesAgo: 60 * 20,
    },
    {
      id: 'ahmed',
      name: 'Ahmed Al-Balushi',
      email: 'ahmed.albalushi@aeiforo-demo.example',
      title: 'Board Secretary',
      role: 'approver',
      daysAgo: 280,
      activeMinutesAgo: 60 * 4,
    },
    {
      id: 'sana',
      name: 'Sana Sharma',
      email: 'sana.sharma@aeiforo-demo.example',
      title: 'Internal Audit',
      role: 'reviewer',
      daysAgo: 250,
      activeMinutesAgo: 60 * 2,
    },
    {
      id: 'john',
      name: 'John Smith',
      email: 'john.smith@aeiforo-demo.example',
      title: 'Finance Controller',
      role: 'data_contributor',
      scope: ['GRI', 'BRSR-Core'],
      daysAgo: 240,
      activeMinutesAgo: 35,
    },
    {
      id: 'priya',
      name: 'Priya Nair',
      email: 'priya.nair@aeiforo-demo.example',
      title: 'HSE Manager',
      role: 'data_contributor',
      scope: ['GRI', 'MSX'],
      daysAgo: 220,
      activeMinutesAgo: 60 * 6,
    },
    {
      id: 'kevin',
      name: 'Kevin Lam',
      email: 'kevin.lam@assurance-demo.example',
      title: 'Assurance provider',
      role: 'external_auditor',
      daysAgo: 25,
      activeMinutesAgo: 60 * 24 * 3,
    },
    {
      id: 'tom',
      name: 'Tom Becker',
      email: 'tom.becker@aeiforo-demo.example',
      title: 'Former contractor',
      role: 'data_contributor',
      status: 'suspended',
      daysAgo: 360,
      activeMinutesAgo: 60 * 24 * 45,
    },
    {
      id: 'james',
      name: 'James O’Brien',
      email: 'james.obrien@aeiforo-demo.example',
      title: 'Risk Manager',
      role: 'reviewer',
      status: 'invited',
      daysAgo: 2,
      invitedBy: 'sarah',
    },
  ],
}

/** Seed account that every demo walkthrough starts from. */
export const DEMO_EMAIL = 'user1@marklytics.co.uk'
/** Password for every seeded account (demo only). */
export const DEMO_PASSWORD = 'marklytics'
