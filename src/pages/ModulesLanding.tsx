import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, Clock, CheckCircle, FileText, Play, ArrowRight, BarChart3, Layers, Gauge, Send } from 'lucide-react'
import { fmt, useFormat, useStrings } from '../i18n'
import { modulesLandingStrings } from '../i18n/pages/modulesLanding'
import { moduleCatalogStrings, useFrameworkLabels } from '../i18n/pages/moduleCatalog'
import { useMockData, useWorkspace } from '../workspace/WorkspaceContext'
import { PageHeader, Card, Button, Badge, StatCard, Progress, EmptyState, Tone } from '../components/ui'
import type { LucideIcon } from 'lucide-react'

const STATE_STYLE: Record<string, { tone: Tone; icon: LucideIcon }> = {
  Open: { tone: 'info', icon: Play },
  'In Review': { tone: 'warning', icon: Clock },
  Approved: { tone: 'success', icon: CheckCircle },
  Published: { tone: 'neutral', icon: FileText },
}

export default function ModulesLanding() {
  const navigate = useNavigate()
  const s = useStrings(modulesLandingStrings)
  const c = useStrings(moduleCatalogStrings)
  const f = useFormat()

  const fw = useFrameworkLabels()
  const { region } = useWorkspace()
  const mockData = useMockData()
  // Region display order first; modules the region doesn't list keep data order at the end.
  const modules = useMemo(() => {
    const rank = (id: string) => {
      const i = region.frameworks.indexOf(id)
      return i === -1 ? Number.MAX_SAFE_INTEGER : i
    }
    return mockData.modules.map((m, i) => ({ m, i })).sort((a, b) => rank(a.m.id) - rank(b.m.id) || a.i - b.i).map(x => x.m)
  }, [mockData.modules, region.frameworks])

  const relativeTime = (dateString: string) => {
    const diffInHours = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60))
    if (diffInHours < 24) return fmt(c.hoursAgo, { count: diffInHours })
    return fmt(c.daysAgo, { count: f.number(Math.floor(diffInHours / 24)) })
  }

  const avgCoverage = modules.length ? Math.round(modules.reduce((a, m) => a + m.coverage, 0) / modules.length) : 0
  const inReview = modules.filter(m => m.state === 'In Review').length
  const done = modules.filter(m => m.state === 'Approved' || m.state === 'Published').length

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.title}
        description={s.description}
        actions={
          <>
            <Button variant="secondary" icon={BarChart3} onClick={() => navigate('/analytics')}>
              {s.openAnalytics}
            </Button>
            <Button variant="primary" icon={LayoutDashboard} onClick={() => navigate('/executive')}>
              {s.executiveView}
            </Button>
          </>
        }
      />

      {modules.length > 0 && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label={s.statActive} value={f.number(modules.length)} icon={Layers} />
          <StatCard label={s.statAvg} value={f.percent(avgCoverage)} icon={Gauge} />
          <StatCard label={s.statReview} value={f.number(inReview)} icon={Clock} />
          <StatCard label={s.statPublished} value={f.number(done)} icon={Send} />
        </div>
      )}

      {modules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {modules.map(module => {
            const style = STATE_STYLE[module.state] ?? { tone: 'neutral' as Tone, icon: FileText }
            const title = fw.title(module.id, module.title)
            return (
              <Card key={module.id} className="flex flex-col transition-[box-shadow,border-color] hover:border-zinc-300 hover:shadow-pop">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-zinc-900 leading-snug">{title}</h3>
                    <p className="mt-1 text-[13px] text-zinc-500 leading-relaxed line-clamp-2">
                      {fw.description(module.id, module.description)}
                    </p>
                  </div>
                  <Badge tone={style.tone} icon={style.icon}>
                    {fw.state(module.state)}
                  </Badge>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-[13px] mb-2">
                    <span className="font-medium text-zinc-500">{s.completion}</span>
                    <span className="font-medium text-zinc-900 tabular">{f.percent(module.coverage)}</span>
                  </div>
                  <Progress value={module.coverage} tone={module.coverage >= 80 ? 'success' : 'neutral'} />
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-4 pt-4 border-t border-line">
                  <div>
                    <dt className="text-xs font-medium text-zinc-500">{s.sections}</dt>
                    <dd className="mt-1 text-sm font-medium text-zinc-900 tabular">
                      {fmt(s.sectionsValue, { done: module.completedSections, total: module.questionnaireSections })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-zinc-500">{s.lastSync}</dt>
                    <dd className="mt-1 text-sm font-medium text-zinc-900 flex items-center gap-1.5 tabular">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      {relativeTime(module.lastActivity)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-auto pt-5 flex items-center gap-2">
                  <Button
                    variant="primary"
                    className="flex-1"
                    iconRight={ArrowRight}
                    onClick={() => navigate(`/modules/${module.id}/questionnaire`)}
                  >
                    {s.openFramework}
                  </Button>
                  <Button
                    variant="secondary"
                    aria-label={fmt(s.overviewAria, { name: title })}
                    onClick={() => navigate(`/modules/${module.id}`)}
                  >
                    {s.overview}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={FileText}
            title={s.emptyTitle}
            description={s.emptyBody}
            action={<Button variant="primary" onClick={() => navigate('/admin/organization')}>{s.openRegistry}</Button>}
          />
        </Card>
      )}
    </div>
  )
}
