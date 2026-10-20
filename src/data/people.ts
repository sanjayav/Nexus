import type { L10n } from '@/config/regions'

/** Demo directory per workspace: who can be @mentioned and assigned. Names are tenant data. */
export interface Person {
  id: string
  name: string
  title: L10n
}

export const PEOPLE: Record<string, Person[]> = {
  lvyuan: [
    { id: 'wangmin', name: '王敏', title: { en: 'Head of Sustainability Office', zh: '可持续发展办公室主任' } },
    { id: 'lina', name: '李娜', title: { en: 'Risk Management Dept.', zh: '风险管理部' } },
    { id: 'chengang', name: '陈刚', title: { en: 'EHS, Yancheng base', zh: '盐城基地安环部' } },
    { id: 'zhangwei', name: '张伟', title: { en: 'Finance Dept.', zh: '财务部' } },
    { id: 'liuyang', name: '刘洋', title: { en: 'Procurement Dept.', zh: '采购部' } },
    { id: 'zhoujing', name: '周静', title: { en: 'Board Office', zh: '董事会办公室' } },
  ],
  aeiforo: [
    { id: 'sarah', name: 'Sarah Lee', title: { en: 'Sustainability Lead', zh: '可持续发展负责人' } },
    { id: 'john', name: 'John Smith', title: { en: 'Finance Controller', zh: '财务总监' } },
    { id: 'priya', name: 'Priya Nair', title: { en: 'HSE Manager', zh: 'HSE 经理' } },
    { id: 'ahmed', name: 'Ahmed Al-Balushi', title: { en: 'Board Secretary', zh: '董事会秘书' } },
  ],
}
