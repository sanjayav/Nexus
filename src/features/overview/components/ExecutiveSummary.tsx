import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2, CornerUpLeft, ListChecks, Printer, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { Term } from '@/components/help/Term'
import { useL10n, useMockData, useWorkspace } from '@/features/workspace/WorkspaceContext'
import { commandCenterStrings } from '@/features/overview/commandCenter.strings'
import { daysUntil, regulatoryCalendar } from '@/config/regulatory'
import { summarize, useSectionViews } from '@/store/hooks'
import { AnimatedNumber, Button, Card, FadeIn, Stagger, StaggerItem } from '@/components/ui'

type Health = 'onTrack' | 'attention' | 'atRisk'

const HEALTH_STYLE: Record<Health, { dot: string; ring: string; text: string }> = {
  onTrack: { dot: 'bg-emerald-500', ring: 'ring-emerald-200 bg-emerald-50', text: 'text-emerald-800' },
  attention: { dot: 'bg-amber-500', ring: 'ring-amber-200 bg-amber-50', text: 'text-amber-900' },
  atRisk: { dot: 'bg-rose-500', ring: 'ring-rose-200 bg-rose-50', text: 'text-rose-800' },
}

/** How a deadline and completion translate into one word an executive can act on. */
export function reportHealth(completion: number, daysLeft: number): Health {
  if (daysLeft <= 30 && completion < 95) return 'atRisk'
  if (daysLeft <= 90 && completion < 80) return 'atRisk'
  if (completion >= 75 || daysLeft > 150) return 'onTrack'
  return 'attention'
}

/**
 * Board-level view of the command center: one sentence of status, the few
 * decisions that need an executive, and four figures explained in plain words.
 * Large type, no charts to decode, everything one click from action.
 */
export default function ExecutiveSummary() {
  const c = useStrings(commandCenterStrings)
  const s = c.summary
  const f = useFormat()
  const l10n = useL10n()
  const navigate = useNavigate()
  const { workspace, region } = useWorkspace()
  const seed = useMockData()
  const views = useSectionViews()
  const p = useMemo(() => summarize(views), [views])

  const deadline = regulatoryCalendar(region.id).find(i => i.kind === 'mandatory' && i.date && daysUntil(i.date) >= 0)
  const daysLeft = deadline?.date ? daysUntil(deadline.date) : 365
  const health = reportHealth(p.completion, daysLeft)
  const style = HEALTH_STYLE[health]
  const blocking = seed.alerts.filter(a => a.level === 'error').length
  const firstModule = (status: string) => views.find(v => v.status === status)?.section.module
  const fwEntries = Object.values(seed.frameworks)
  const coverage = Math.round(fwEntries.reduce((sum, v) => sum + v.covered, 0) / Math.max(1, fwEntries.length))
  const emissions = seed.ghg.scope1.value + seed.ghg.scope2Market.value

  const decisions: { key: keyof typeof s.items; n: number; icon: LucideIcon; to: string }[] = [
    { key: 'review' as const, n: p.submitted, icon: ListChecks, to: `/modules/${firstModule('submitted')}/review` },
    {
      key: 'returned' as const,
      n: p.changes_requested,
      icon: CornerUpLeft,
      to: `/modules/${firstModule('changes_requested')}/questionnaire`,
    },
    { key: 'blocking' as const, n: blocking, icon: AlertTriangle, to: '/workbench?filter=Critical' },
  ].filter(d => d.n > 0)

  return (
    <div className="space-y-6 print:space-y-4">
      <FadeIn>
        <Card className="p-6 sm:p-8">
          <div
            className={clsx(
              'inline-flex items-center gap-2 h-8 px-3 rounded-full ring-1 ring-inset text-[14px] font-semibold',
              style.ring,
              style.text,
            )}
          >
            <span className={clsx('w-2.5 h-2.5 rounded-full', style.dot)} />
            {s.status[health]}
          </div>
          <p className="mt-4 text-[19px] sm:text-[22px] leading-[1.55] text-zinc-900 font-medium max-w-[46ch] tracking-[-0.01em]">
            {fmt(s.headline[health], {
              year: workspace.reportingYear.replace(/^FY/, ''),
              pct: f.percent(p.completion),
              days: f.number(daysLeft),
              date: deadline?.date ? f.date(deadline.date, { dateStyle: 'long' }) : '—',
            })}
          </p>
          {deadline && <p className="mt-2 text-[14px] text-zinc-500">{l10n(deadline.title)}</p>}
          <div className="mt-6 flex flex-wrap gap-2 print:hidden">
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
              {s.print}
            </Button>
          </div>
        </Card>
      </FadeIn>

      <Card className="p-6 sm:p-8">
        <h2 className="text-[17px] font-semibold text-zinc-900">{s.decisions}</h2>
        {decisions.length === 0 ? (
          <p className="mt-3 flex items-start gap-2 text-[15px] text-zinc-600 leading-relaxed">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            {s.noDecisions}
          </p>
        ) : (
          <Stagger as="ul" className="mt-4 space-y-3">
            {decisions.map(d => (
              <StaggerItem as="li" key={d.key}>
                <button
                  type="button"
                  onClick={() => navigate(d.to)}
                  className="group w-full flex items-center gap-4 rounded-2xl border border-line bg-white px-4 sm:px-5 py-4 text-left hover:border-zinc-300 hover:shadow-raised transition-[box-shadow,border-color]"
                >
                  <span className="w-11 h-11 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0">
                    <d.icon className="w-5 h-5" />
                  </span>
                  <span className="flex-1 text-[16px] sm:text-[17px] font-medium text-zinc-900 leading-snug">
                    {fmt(s.items[d.key], { n: d.n })}
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[14px] font-medium text-zinc-500 group-hover:text-zinc-900">
                    {s.open} <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </Card>

      <div>
        <h2 className="text-[17px] font-semibold text-zinc-900 mb-3">{s.figures}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Figure label={s.completion} note={fmt(s.completionNote, { left: p.total - p.approved })}>
            <AnimatedNumber value={p.completion} format={n => f.percent(n)} />
          </Figure>
          <Figure label={<Term id="scope1">{s.emissions}</Term>} note={<Term id="marketBased">{s.emissionsNote}</Term>}>
            <AnimatedNumber value={emissions} format={n => f.number(Math.round(n))} />
          </Figure>
          <Figure label={<Term id="integrity">{s.integrity}</Term>} note={s.integrityNote}>
            <AnimatedNumber value={seed.integrity.score} format={n => f.number(Math.round(n))} />
          </Figure>
          <Figure label={<Term id="frameworkCoverage">{s.coverage}</Term>} note={fmt(s.coverageNote, { n: fwEntries.length })}>
            <AnimatedNumber value={coverage} format={n => f.percent(n)} />
          </Figure>
        </div>
      </div>
    </div>
  )
}

function Figure({ label, note, children }: { label: React.ReactNode; note: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <div className="text-[15px] font-medium text-zinc-600">{label}</div>
      <div className="mt-3 display text-[44px] font-semibold text-zinc-900 leading-none">{children}</div>
      <div className="mt-3 text-[14px] text-zinc-500">{note}</div>
    </Card>
  )
}
