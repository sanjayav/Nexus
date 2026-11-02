import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, Bell, CalendarClock, CheckSquare, CornerUpLeft, Inbox, ListChecks, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { STATUS_ORDER, STATUS_TONE, useWorkflowText } from '@/lib/i18n/shared/workflow'
import { useAccess } from '@/features/access/AccessContext'
import { useL10n, useMockData, useWorkspace } from '@/features/workspace/WorkspaceContext'
import { daysUntil, regulatoryCalendar } from '@/config/regulatory'
import { summarize, useSectionViews, useWorkspaceSlice } from '@/store/hooks'
import type { SectionStatus } from '@/store/reporting'
import { AnimatedNumber, Badge, Button, Card, CardHeader, EmptyState, Stagger, StaggerItem, type Tone } from '@/components/ui'
import { commandCenterStrings } from '@/features/overview/commandCenter.strings'

const STAGE_BAR: Record<Tone, string> = {
  neutral: 'bg-zinc-300',
  info: 'bg-sky-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  success: 'bg-emerald-500',
  brand: 'bg-zinc-900',
}

/**
 * The top of the command center: who you are, what's due, where the work is,
 * and what needs you. Everything here is live from the reporting store.
 */
export default function TodayPanel() {
  const s = useStrings(commandCenterStrings).today
  const f = useFormat()
  const wt = useWorkflowText()
  const l10n = useL10n()
  const navigate = useNavigate()
  const { member } = useAccess()
  const { region } = useWorkspace()
  const seed = useMockData()
  const views = useSectionViews()
  const { activity, notifications, tasksDone } = useWorkspaceSlice()
  const pipeline = useMemo(() => summarize(views), [views])
  const frameworks = new Set(views.map(v => v.section.module)).size

  const next = useMemo(
    () => regulatoryCalendar(region.id).find(i => i.kind === 'mandatory' && i.date && daysUntil(i.date) >= 0),
    [region.id],
  )
  const hour = new Date().getHours()
  const greeting = s.greeting[hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening']

  // First module with work in a given state, so each action lands somewhere useful.
  const firstModule = (status: SectionStatus) => views.find(v => v.status === status)?.section.module
  const weekTasks = seed.moduleTasks.filter(t => !tasksDone.includes(t.id) && daysUntil(t.dueDate) <= 7).length
  const unread = notifications.filter(n => !n.read).length

  const items: { key: keyof typeof s.items; n: number; icon: LucideIcon; tone: string; to: string }[] = [
    {
      key: 'returned' as const,
      n: pipeline.changes_requested,
      icon: CornerUpLeft,
      tone: 'bg-rose-50 text-rose-600',
      to: `/modules/${firstModule('changes_requested')}/questionnaire`,
    },
    {
      key: 'review' as const,
      n: pipeline.submitted,
      icon: ListChecks,
      tone: 'bg-amber-50 text-amber-600',
      to: `/modules/${firstModule('submitted')}/review`,
    },
    { key: 'tasks' as const, n: weekTasks, icon: CheckSquare, tone: 'bg-sky-50 text-sky-600', to: '/tasks' },
    {
      key: 'mentions' as const,
      n: unread,
      icon: Bell,
      tone: 'bg-violet-50 text-violet-600',
      to: notifications.find(n => !n.read)?.route ?? '/tasks',
    },
  ].filter(i => i.n > 0)

  return (
    <div className="space-y-6">
      {/* Greeting + next deadline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl" />
          <p className="text-[13px] text-zinc-500">{f.date(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h2 className="mt-1 text-[22px] sm:text-[26px] font-semibold tracking-[-0.02em] text-zinc-900">
            {fmt(greeting, { name: member?.name ?? '' })}
          </h2>
          <div className="mt-5">
            <div className="flex items-end justify-between gap-4 mb-2">
              <div>
                <div className="text-[13px] font-medium text-zinc-500">{s.pipelineTitle}</div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {fmt(s.pipelineDesc, { total: pipeline.total, frameworks, pct: f.percent(pipeline.completion) })}
                </div>
              </div>
              <AnimatedNumber
                value={pipeline.completion}
                format={n => f.percent(n)}
                className="display text-[30px] font-semibold text-zinc-900 leading-none"
              />
            </div>
            {/* Stacked pipeline bar: each status grows from zero on mount. */}
            <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-zinc-900/[0.05] gap-px">
              {STATUS_ORDER.map((k, i) =>
                pipeline[k] ? (
                  <motion.div
                    key={k}
                    className={STAGE_BAR[STATUS_TONE[k]]}
                    initial={{ flexGrow: 0 }}
                    animate={{ flexGrow: pipeline[k] }}
                    transition={{ duration: 0.8, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    style={{ flexBasis: 0 }}
                    title={`${wt.status(k)} ${pipeline[k]}`}
                  />
                ) : null,
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
              {STATUS_ORDER.map(k => (
                <Link
                  key={k}
                  to={k === 'submitted' && firstModule(k) ? `/modules/${firstModule(k)}/review` : '/modules'}
                  className="group rounded-xl border border-line bg-white px-3 py-2.5 hover:border-zinc-300 hover:shadow-card transition-[box-shadow,border-color]"
                >
                  <div className={clsx('h-0.5 w-6 rounded-full mb-2', STAGE_BAR[STATUS_TONE[k]])} />
                  <div className="display text-xl font-semibold text-zinc-900 leading-none">
                    <AnimatedNumber value={pipeline[k]} format={n => f.number(Math.round(n))} />
                  </div>
                  <div className="mt-1 text-xs text-zinc-500 group-hover:text-zinc-700">{wt.status(k)}</div>
                </Link>
              ))}
            </div>
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader title={s.nextDeadline} icon={CalendarClock} />
          {next?.date ? (
            <>
              <div className="flex items-baseline gap-2">
                <AnimatedNumber
                  value={daysUntil(next.date)}
                  format={n => f.number(Math.round(n))}
                  className="display text-[44px] font-semibold text-zinc-900 leading-none"
                />
                <span className="text-sm text-zinc-500">{s.daysUnit}</span>
              </div>
              <p className="mt-3 text-[13px] font-medium text-zinc-900 leading-snug">{l10n(next.title)}</p>
              <p className="mt-1 text-xs text-zinc-500">{fmt(s.due, { date: f.date(next.date, { dateStyle: 'long' }) })}</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-auto pt-0 self-start"
                iconRight={ArrowRight}
                onClick={() => navigate(next.href ?? `/modules/${next.framework}`)}
              >
                {s.openFramework}
              </Button>
            </>
          ) : (
            <EmptyState icon={CalendarClock} title={s.allClear} />
          )}
        </Card>
      </div>

      {/* For you today + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title={s.forYou} description={s.forYouDesc} icon={Inbox} />
          {items.length === 0 ? (
            <EmptyState icon={Inbox} title={s.allClear} description={s.allClearBody} />
          ) : (
            <Stagger as="ul" className="divide-y divide-line -my-2">
              {items.map(it => (
                <StaggerItem as="li" key={it.key}>
                  <div className="flex items-center gap-3 py-3">
                    <span className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', it.tone)}>
                      <it.icon className="w-4 h-4" />
                    </span>
                    <span className="flex-1 min-w-0 text-[13.5px] text-zinc-900">{fmt(s.items[it.key], { n: it.n })}</span>
                    <Button size="sm" variant="secondary" onClick={() => navigate(it.to)}>
                      {s.actions[it.key]}
                    </Button>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </Card>

        <Card>
          <CardHeader title={s.activity} />
          {activity.length === 0 ? (
            <p className="text-[13px] text-zinc-500 leading-relaxed">{s.activityEmpty}</p>
          ) : (
            <ul className="space-y-3.5">
              {activity
                .filter(a => a.kind !== 'answer')
                .slice(0, 6)
                .map(a => (
                  <motion.li key={a.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                      {a.actor.slice(0, 1)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] text-zinc-800 leading-snug">{wt.describe(a)}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{wt.ago(a.at)}</p>
                    </div>
                  </motion.li>
                ))}
            </ul>
          )}
          {pipeline.submitted > 0 && (
            <div className="mt-4 pt-3 border-t border-line">
              <Badge tone={STATUS_TONE.submitted} dot>
                {fmt(s.items.review, { n: pipeline.submitted })}
              </Badge>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
