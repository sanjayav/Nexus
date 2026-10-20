import { useCallback, useMemo, useState } from 'react'
import { Award, Info, ListChecks, TrendingUp, Users } from 'lucide-react'
import { AnimatedNumber, Badge, CardHeader, PageHeader, Stagger, Stat, StatStrip, Tabs } from '@/components/ui'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { toast } from '@/lib/hooks/useToast'
import { useL10n, useWorkspace } from '@/features/workspace/WorkspaceContext'
import { PEOPLE } from '@/data/people'
import { direction, ratingsFor, type Diagnostic, type Rating } from './data'
import { useActionPlan } from './store'
import { ratingsStrings } from './ratings.strings'
import { AgencyCard } from './components/AgencyCard'
import { AgencySheet } from './components/AgencySheet'
import { ActionPlan } from './components/ActionPlan'
import { RatingsCalendar } from './components/RatingsCalendar'

type Origin = 'all' | 'domestic' | 'international'

/** Due date for a new action: two weeks before the agency's next review, or 90 days out if that has passed. */
function defaultDue(nextReview: string): string {
  const review = new Date(`${nextReview}T00:00:00`)
  const due = new Date(review.getTime() - 14 * 86_400_000)
  const floor = new Date(Date.now() + 90 * 86_400_000)
  return (due > new Date() ? due : floor).toISOString().slice(0, 10)
}

export default function RatingsPage() {
  const s = useStrings(ratingsStrings)
  const f = useFormat()
  const l10n = useL10n()
  const { workspace } = useWorkspace()
  const demo = ratingsFor(workspace.id)
  const people = PEOPLE[workspace.id] ?? []
  const plan = useActionPlan()
  const industry = l10n(demo.industry)

  const [origin, setOrigin] = useState<Origin>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [freshId, setFreshId] = useState<string>()

  const ratings = demo.ratings
  const open = ratings.find(r => r.id === openId) ?? null
  const visible = origin === 'all' ? ratings : ratings.filter(r => r.origin === origin)

  const summary = useMemo(() => {
    const dirs = ratings.map(direction)
    return {
      domestic: ratings.filter(r => r.origin === 'domestic').length,
      intl: ratings.filter(r => r.origin === 'international').length,
      up: dirs.filter(d => d > 0).length,
      down: dirs.filter(d => d < 0).length,
      flat: dirs.filter(d => d === 0).length,
      percentile: ratings.length ? ratings.reduce((sum, r) => sum + r.percentile, 0) / ratings.length : 0,
    }
  }, [ratings])
  const done = plan.actions.filter(a => a.status === 'done').length

  const inPlan = useCallback((diagnosticId: string) => plan.actions.some(a => a.diagnosticId === diagnosticId), [plan.actions])

  const addFromDiagnostic = (rating: Rating, d: Diagnostic) => {
    if (inPlan(d.id)) return
    const owner = demo.defaultOwner[d.pillar]
    const id = `act-${Date.now().toString(36)}`
    plan.add({ id, title: d.indicator, ratingId: rating.id, diagnosticId: d.id, owner, due: defaultDue(rating.nextReview), status: 'todo' })
    setFreshId(id)
    toast(fmt(s.sheet.addedToast, { owner: people.find(p => p.id === owner)?.name ?? owner }))
  }

  const closeSheet = useCallback(() => setOpenId(null), [])
  const formatPct = useCallback((n: number) => f.percent(n), [f])

  const originTabs = [
    { value: 'all' as Origin, label: s.agencies.all, count: ratings.length },
    { value: 'domestic' as Origin, label: s.agencies.domestic, count: summary.domestic },
    { value: 'international' as Origin, label: s.agencies.international, count: summary.intl },
  ].filter(t => t.value === 'all' || t.count > 0)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={s.eyebrow}
        title={s.title}
        description={s.description}
        actions={
          <Badge tone="warning" icon={Info}>
            {s.demoBadge}
          </Badge>
        }
      />

      <StatStrip>
        <Stat
          label={s.summary.agencies}
          icon={Award}
          value={f.number(ratings.length)}
          deltaLabel={fmt(s.summary.agenciesFoot, { domestic: summary.domestic, intl: summary.intl })}
        />
        <Stat
          label={s.summary.upgrades}
          icon={TrendingUp}
          value={f.number(summary.up)}
          deltaLabel={fmt(s.summary.upgradesFoot, { down: summary.down, flat: summary.flat })}
        />
        <Stat
          label={s.summary.percentile}
          icon={Users}
          value={<AnimatedNumber value={summary.percentile} format={formatPct} />}
          deltaLabel={fmt(s.summary.percentileFoot, { industry })}
        />
        <Stat
          label={s.summary.plan}
          icon={ListChecks}
          value={f.number(plan.actions.length)}
          deltaLabel={fmt(s.summary.planFoot, { done, total: plan.actions.length })}
        />
      </StatStrip>

      <p className="flex items-start gap-2 text-[13px] text-zinc-600 leading-relaxed">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
        {s.demoNote}
      </p>

      <section>
        <CardHeader
          title={s.agencies.title}
          description={s.agencies.description}
          className="flex-col sm:flex-row !mb-4"
          action={originTabs.length > 2 ? <Tabs items={originTabs} value={origin} onChange={setOrigin} /> : undefined}
        />
        <Stagger key={`${workspace.id}-${origin}`} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {visible.map(r => (
            <AgencyCard key={r.id} rating={r} industry={industry} onOpen={() => setOpenId(r.id)} />
          ))}
        </Stagger>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 min-w-0">
          <ActionPlan
            key={workspace.id}
            actions={plan.actions}
            ratings={ratings}
            people={people}
            freshId={freshId}
            onStatus={plan.setStatus}
            onOwner={plan.setOwner}
            onDue={plan.setDue}
            onRemove={plan.remove}
          />
        </div>
        <RatingsCalendar key={workspace.id} items={demo.calendar} ratings={ratings} />
      </div>

      <AgencySheet rating={open} industry={industry} links={demo.links} inPlan={inPlan} onAdd={addFromDiagnostic} onClose={closeSheet} />
    </div>
  )
}
