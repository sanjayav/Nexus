import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowUpRight, Check, Info, ListPlus, Target } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Eyebrow, Sheet, Stagger, StaggerItem, chartTheme, ease, spring, type Tone } from '@/components/ui'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { useL10n } from '@/features/workspace/WorkspaceContext'
import {
  currentPoint,
  nextGrade,
  standing,
  type Diagnostic,
  type FixLink,
  type Impact,
  type Pillar,
  type Rating,
} from '@/features/ratings/data'
import { ratingsStrings } from '@/features/ratings/ratings.strings'
import { useRatingDisplay } from './useRatingDisplay'

const IMPACT_TONE: Record<Impact, Tone> = { high: 'danger', medium: 'warning', low: 'neutral' }
const PILLARS: Pillar[] = ['E', 'S', 'G']
const PILLAR_BAR: Record<Pillar, string> = { E: 'bg-emerald-500', S: 'bg-sky-500', G: 'bg-zinc-900' }

export function AgencySheet({
  rating,
  industry,
  links,
  inPlan,
  onAdd,
  onClose,
}: {
  rating: Rating | null
  industry: string
  links: Record<FixLink, string>
  inPlan: (diagnosticId: string) => boolean
  onAdd: (rating: Rating, d: Diagnostic) => void
  onClose: () => void
}) {
  const s = useStrings(ratingsStrings)
  const l10n = useL10n()
  return (
    <Sheet
      open={!!rating}
      onClose={onClose}
      title={rating ? l10n(rating.name) : ''}
      description={rating ? <ScaleLine rating={rating} /> : undefined}
      width="max-w-[620px]"
      footer={<Button onClick={onClose}>{s.sheet.close}</Button>}
    >
      {rating && <SheetBody rating={rating} industry={industry} links={links} inPlan={inPlan} onAdd={onAdd} onClose={onClose} />}
    </Sheet>
  )
}

function ScaleLine({ rating }: { rating: Rating }) {
  const s = useStrings(ratingsStrings)
  if (rating.kind === 'grade' && rating.scale) {
    return (
      <>{fmt(s.sheet.scaleGrade, { best: rating.scale[0], worst: rating.scale[rating.scale.length - 1], tiers: rating.scale.length })}</>
    )
  }
  return <>{rating.kind === 'risk' ? s.sheet.scaleRisk : s.sheet.scaleScore}</>
}

function SheetBody({
  rating,
  industry,
  links,
  inPlan,
  onAdd,
  onClose,
}: {
  rating: Rating
  industry: string
  links: Record<FixLink, string>
  inPlan: (diagnosticId: string) => boolean
  onAdd: (rating: Rating, d: Diagnostic) => void
  onClose: () => void
}) {
  const s = useStrings(ratingsStrings)
  const f = useFormat()
  const show = useRatingDisplay()
  const navigate = useNavigate()
  const cur = currentPoint(rating)
  const next = nextGrade(rating)

  const chart = useMemo(
    () =>
      rating.history.map(p => ({
        label: f.date(p.date, { year: 'numeric', month: 'short' }),
        y: rating.kind === 'grade' ? standing(rating, p.value) : Number(p.value),
        shown: show(rating, p.value),
      })),
    [rating, f, show],
  )

  const tiers = rating.scale?.length ?? 0
  const gradeTick = (i: number) => (rating.scale ? (rating.scale[tiers - 1 - i] ?? '') : String(i))

  // Gap headline per rating kind.
  let gapTitle = s.sheet.gapTitleTop
  let gapDesc = s.sheet.gapDescReached
  if (rating.kind === 'grade') {
    if (next) {
      gapTitle = fmt(s.sheet.gapTitleGrade, { next })
      gapDesc = s.sheet.gapDescGrade
    }
  } else if (rating.target !== undefined) {
    const gap = rating.kind === 'risk' ? Number(cur.value) - rating.target : rating.target - Number(cur.value)
    gapTitle = fmt(rating.kind === 'risk' ? s.sheet.gapTitleRisk : s.sheet.gapTitleScore, { target: show(rating, rating.target) })
    gapDesc =
      gap > 0
        ? fmt(rating.kind === 'risk' ? s.sheet.gapDescRisk : s.sheet.gapDescScore, { gap: f.number(gap, { maximumFractionDigits: 1 }) })
        : s.sheet.gapDescReached
  }

  const diagnostics = [...rating.diagnostics].sort((a, b) => b.uplift - a.uplift)

  return (
    <div className="space-y-7">
      {/* Headline figures */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Figure label={s.agencies.current} value={show(rating, cur.value)} extra={rating.badge} />
        <Figure label={s.sheet.percentile} value={f.percent(rating.percentile)} extra={industry} />
        <Figure label={s.sheet.lastUpdate} value={f.date(rating.lastUpdate, { dateStyle: 'short' })} small />
        <Figure label={s.sheet.nextReview} value={f.date(rating.nextReview, { dateStyle: 'short' })} small />
      </dl>

      {!rating.scaleVerified && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-600/20 px-3 py-2.5 text-[13px] leading-relaxed">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          {s.sheet.scaleUnverifiedNote}
        </p>
      )}

      {/* History */}
      <section>
        <Eyebrow>{s.sheet.history}</Eyebrow>
        {chart.length < 2 ? (
          <p className="mt-2 text-[13px] text-zinc-500">{s.sheet.historyEmpty}</p>
        ) : (
          <div className="mt-3 h-[190px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: chartTheme.axis }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  tickMargin={8}
                />
                {rating.kind === 'grade' ? (
                  <YAxis
                    domain={[0, tiers - 1]}
                    ticks={Array.from({ length: tiers }, (_, i) => i)}
                    tickFormatter={gradeTick}
                    tick={{ fontSize: 11, fill: chartTheme.axis }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    interval={0}
                  />
                ) : (
                  <YAxis
                    domain={rating.kind === 'risk' ? ['dataMin - 4', 'dataMax + 4'] : [0, 100]}
                    reversed={rating.kind === 'risk'}
                    tick={{ fontSize: 11, fill: chartTheme.axis }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    tickFormatter={(v: number) => f.number(v)}
                  />
                )}
                <Tooltip
                  {...chartTheme.tooltip}
                  formatter={(_v: number, _n: string, item: { payload?: { shown?: string } }) => [item.payload?.shown ?? '', '']}
                  separator=""
                />
                <Line
                  type={rating.kind === 'grade' ? 'stepAfter' : 'monotone'}
                  dataKey="y"
                  stroke={chartTheme.series[0]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#fff', stroke: chartTheme.series[0], strokeWidth: 2 }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Pillars */}
      <section>
        <div className="flex items-baseline justify-between gap-3">
          <Eyebrow>{s.sheet.pillars}</Eyebrow>
          <span className="text-xs text-zinc-500">{s.sheet.pillarsNote}</span>
        </div>
        <div className="mt-3 space-y-3">
          {PILLARS.map(p => (
            <div key={p} className="grid grid-cols-[88px_1fr_36px] items-center gap-3">
              <span className="text-[13px] text-zinc-700">{s.sheet.pillar[p]}</span>
              <div className="h-2 rounded-full bg-zinc-900/[0.06] overflow-hidden">
                <motion.div
                  className={clsx('h-full rounded-full origin-left', PILLAR_BAR[p])}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: rating.pillars[p] / 100 }}
                  transition={{ duration: 0.6, ease: ease.out }}
                />
              </div>
              <span className="text-[13px] font-semibold text-zinc-900 tabular text-right">{f.number(rating.pillars[p])}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Gap to next grade */}
      <section>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900/[0.04] ring-1 ring-inset ring-zinc-900/[0.06] text-zinc-600 flex items-center justify-center shrink-0">
            <Target className="w-4 h-4" strokeWidth={1.9} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-zinc-900">{gapTitle}</h3>
            <p className="text-[13px] text-zinc-500 mt-0.5 leading-relaxed">{gapDesc}</p>
          </div>
        </div>

        {diagnostics.length === 0 ? (
          <p className="mt-4 text-[13px] text-zinc-500">{s.sheet.noDiagnostics}</p>
        ) : (
          <Stagger as="ul" className="mt-4 space-y-3">
            {diagnostics.map(d => (
              <StaggerItem as="li" key={d.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={IMPACT_TONE[d.impact]} dot>
                    {s.sheet.impact[d.impact]}
                  </Badge>
                  <Badge>{fmt(s.sheet.uplift, { pillar: s.sheet.pillarShort[d.pillar], points: d.uplift })}</Badge>
                </div>
                <div className="mt-2 text-sm font-medium text-zinc-900">{d.indicator}</div>
                <p className="mt-1 text-[13px] text-zinc-600 leading-relaxed">{d.detail}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    iconRight={ArrowUpRight}
                    onClick={() => {
                      onClose()
                      navigate(links[d.link])
                    }}
                  >
                    {fmt(s.sheet.fix, { where: s.links[d.link] })}
                  </Button>
                  <AddToPlanButton added={inPlan(d.id)} onAdd={() => onAdd(rating, d)} />
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
    </div>
  )
}

function Figure({ label, value, extra, small }: { label: string; value: string; extra?: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-line p-3 min-w-0">
      <dt className="text-xs text-zinc-500 truncate">{label}</dt>
      <dd className={clsx('mt-1 font-semibold text-zinc-900 tabular truncate', small ? 'text-sm' : 'display text-xl')}>{value}</dd>
      {extra && <dd className="text-xs text-zinc-500 truncate">{extra}</dd>}
    </div>
  )
}

/** Toggles to a confirmed state with a small spring pop once the diagnostic is in the plan. */
function AddToPlanButton({ added, onAdd }: { added: boolean; onAdd: () => void }) {
  const s = useStrings(ratingsStrings)
  return (
    <motion.button
      type="button"
      layout
      transition={spring}
      disabled={added}
      onClick={onAdd}
      className={clsx(
        'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium whitespace-nowrap overflow-hidden',
        'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
        added
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 cursor-default'
          : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-fill active:scale-[0.97]',
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {added ? (
          <motion.span
            key="added"
            className="inline-flex items-center gap-1.5"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={spring}
          >
            <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
            {s.sheet.inPlan}
          </motion.span>
        ) : (
          <motion.span
            key="add"
            className="inline-flex items-center gap-1.5"
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.12 }}
          >
            <ListPlus className="w-3.5 h-3.5" />
            {s.sheet.addToPlan}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
