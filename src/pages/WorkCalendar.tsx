import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/PageHeader'
import { StateBoundary, SkeletonCard, Skeleton } from '../components/ui'
import { useAuth } from '../auth/AuthContext'
import { useFramework } from '../lib/frameworks'
import { orgStore, type QuestionAssignment } from '../lib/orgStore'
import TaskCalendar from '../components/mytasks/TaskCalendar'
import {
  CalendarRow, sortCalendar, useRegulatoryCalendar, type CalendarRegion,
} from '../components/myday/RegulatoryCalendar'

const REGIONS: Array<CalendarRegion | 'all'> = ['all', 'CN', 'HK', 'EU', 'GLOBAL']

/**
 * Calendar (/work/calendar) — every deadline in one place:
 *   • Regulatory deadlines (China and global), with region filter and detail.
 *   • Your task due dates as a month grid; clicking a day opens My Tasks
 *     filtered to it.
 */
export default function WorkCalendar() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()
  const { active: framework } = useFramework()
  const reg = useRegulatoryCalendar()
  const [region, setRegion] = useState<CalendarRegion | 'all'>('all')

  const [tasks, setTasks] = useState<QuestionAssignment[] | null>(null)
  const [tasksError, setTasksError] = useState<unknown>(null)
  const loadTasks = () => {
    setTasksError(null)
    orgStore.myAssignments()
      .then(rows => setTasks(rows.filter(a => a.framework_id === framework.id)))
      .catch(e => setTasksError(e instanceof Error ? e : new Error(String(e))))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (user) loadTasks() }, [user, framework.id])

  const items = useMemo(() => {
    const all = sortCalendar(reg.items ?? [])
    return region === 'all' ? all : all.filter(i => i.region === region)
  }, [reg.items, region])
  const presentRegions = useMemo(() => new Set((reg.items ?? []).map(i => i.region)), [reg.items])

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader title={t('calendar.title')} description={t('calendar.description')} />

      <section aria-labelledby="cal-reg" className="surface-paper p-5 sm:p-6">
        <header className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <h2 id="cal-reg" className="type-h3 text-[var(--text-primary)]">{t('regCalendar.title')}</h2>
            <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('regCalendar.subtitle')}</p>
          </div>
          {(reg.items?.length ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label={t('regCalendar.regionFilter')}>
              {REGIONS.filter(r => r === 'all' || presentRegions.has(r)).map(r => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={region === r}
                  onClick={() => setRegion(r)}
                  className={`chip h-8 ${region === r ? 'chip-active' : ''}`}
                >
                  {r === 'all' ? t('regCalendar.allRegions') : t(`regCalendar.region.${r}`)}
                </button>
              ))}
            </div>
          )}
        </header>
        <StateBoundary
          loading={reg.loading && reg.items == null}
          error={reg.error}
          onRetry={reg.reload}
          compact
          empty={reg.items != null && items.length === 0}
          emptyState={{ art: false, title: t('regCalendar.empty.title'), body: t('regCalendar.empty.body') }}
          errorState={{ art: false, title: t('regCalendar.error.title'), body: t('regCalendar.error.body') }}
          skeleton={<div className="space-y-4">{[0, 1, 2].map(i => <Skeleton key={i} className="h-12 w-full" rounded="lg" />)}</div>}
        >
          <ul className="divide-y divide-[var(--border-subtle)]">
            {items.map(it => (
              <li key={it.id} className="py-4 first:pt-0 last:pb-0">
                <CalendarRow item={it} showDetail />
              </li>
            ))}
          </ul>
        </StateBoundary>
      </section>

      <section aria-labelledby="cal-tasks">
        <div className="mb-3">
          <h2 id="cal-tasks" className="type-h3 text-[var(--text-primary)]">{t('calendar.tasksTitle')}</h2>
          <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('calendar.tasksBody')}</p>
        </div>
        <StateBoundary
          loading={tasks == null && !tasksError}
          error={tasksError}
          onRetry={loadTasks}
          compact
          empty={tasks != null && tasks.length === 0}
          emptyState={{ art: 'noData', title: t('calendar.noTasksTitle'), body: t('calendar.noTasksBody'), cta: { label: t('calendar.openMyTasks'), to: '/my-tasks' } }}
          skeleton={<SkeletonCard className="h-80" />}
        >
          <TaskCalendar assignments={tasks ?? []} onPickDay={(iso) => navigate(`/my-tasks?day=${iso}`)} />
        </StateBoundary>
      </section>
    </div>
  )
}
