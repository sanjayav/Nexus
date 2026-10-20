import { useMemo } from 'react'
import type { Activity, SectionStatus } from '@/store/reporting'
import type { Tone } from '@/components/ui'
import { defineStrings, fmt, useStrings } from '@/lib/i18n'
import { useFrameworkLabels } from './frameworkCatalog'
import { useQuestionnaireText } from '@/features/frameworks/content/questionnaireContent'
import { useMockData } from '@/features/workspace/WorkspaceContext'

/**
 * Shared vocabulary for the reporting workflow (填报 → 提交 → 审核 → 退回/通过).
 * Chinese follows the terms used in mainland enterprise approval software
 * (OA / 用友 / 钉钉审批): 提交审核, 退回修改, 审核通过, 驳回.
 */
export const workflowStrings = defineStrings({
  en: {
    status: {
      not_started: 'Not started',
      draft: 'In progress',
      submitted: 'In review',
      changes_requested: 'Changes requested',
      approved: 'Approved',
    } satisfies Record<SectionStatus, string>,
    activity: {
      answer: '{actor} updated {target}',
      submit: '{actor} submitted {target} for review',
      approve: '{actor} approved {target}',
      request_changes: '{actor} requested changes on {target}',
      reject: '{actor} rejected {target}',
      comment: '{actor} commented on {target}',
      import: '{actor} imported {count} values from {note}',
      report_export: '{actor} exported {note}',
      task_done: '{actor} completed a task',
    } satisfies Record<Activity['kind'], string>,
    moreSections: '{title} and {n} more',
    justNow: 'Just now',
    minutesAgo: '{n} min ago',
    hoursAgo: '{n} h ago',
    daysAgo: '{n} d ago',
  },
  zh: {
    status: {
      not_started: '未开始',
      draft: '填报中',
      submitted: '审核中',
      changes_requested: '已退回',
      approved: '已通过',
    },
    activity: {
      answer: '{actor} 更新了「{target}」',
      submit: '{actor} 提交了「{target}」，待审核',
      approve: '{actor} 审核通过「{target}」',
      request_changes: '{actor} 退回「{target}」，要求修改',
      reject: '{actor} 驳回了「{target}」',
      comment: '{actor} 评论了「{target}」',
      import: '{actor} 从 {note} 导入了 {count} 项数据',
      report_export: '{actor} 导出了 {note}',
      task_done: '{actor} 完成了一项任务',
    },
    moreSections: '「{title}」等 {n} 个章节',
    justNow: '刚刚',
    minutesAgo: '{n} 分钟前',
    hoursAgo: '{n} 小时前',
    daysAgo: '{n} 天前',
  },
})

export const STATUS_TONE: Record<SectionStatus, Tone> = {
  not_started: 'neutral',
  draft: 'info',
  submitted: 'warning',
  changes_requested: 'danger',
  approved: 'success',
}

/** Order used by pipeline views: where work is, left to right. */
export const STATUS_ORDER: SectionStatus[] = ['not_started', 'draft', 'submitted', 'changes_requested', 'approved']

/** Renders activity entries and relative times in the current language. */
export function useWorkflowText() {
  const w = useStrings(workflowStrings)
  const qt = useQuestionnaireText()
  const fw = useFrameworkLabels()
  const seed = useMockData()

  return useMemo(() => {
    const sectionById = new Map(seed.questionnaireSections.map(s => [s.id, s]))
    const target = (a: Pick<Activity, 'sectionId' | 'moduleId' | 'count'>) => {
      const section = a.sectionId ? sectionById.get(a.sectionId) : undefined
      if (!section) return a.moduleId ? fw.short(a.moduleId) : ''
      const title = qt.shortTitle(section)
      return a.count && a.count > 1 ? fmt(w.moreSections, { title, n: a.count - 1 }) : title
    }
    return {
      status: (s: SectionStatus) => w.status[s],
      describe: (a: Activity) => fmt(w.activity[a.kind], { actor: a.actor, target: target(a), count: a.count ?? 0, note: a.note ?? '' }),
      ago: (iso: string) => {
        const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
        if (mins < 1) return w.justNow
        if (mins < 60) return fmt(w.minutesAgo, { n: mins })
        if (mins < 60 * 24) return fmt(w.hoursAgo, { n: Math.round(mins / 60) })
        return fmt(w.daysAgo, { n: Math.round(mins / 1440) })
      },
    }
  }, [w, qt, fw, seed.questionnaireSections])
}
