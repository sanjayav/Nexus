import { useState } from 'react'
import clsx from 'clsx'
import {
  ArrowRight, Shield, FileCheck,
  AlertTriangle, CheckCircle2, BarChart3, ChevronRight, Send,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { mockData } from '../data/mockData'
import { Badge, Button, Card, CardHeader, PageHeader, Progress, StatCard, Tabs, tableClass, type Tone } from '../components/ui'
import { fmt, useFormat, useStrings } from '../i18n'
import { doubleMaterialityStrings } from '../i18n/pages/doubleMateriality'

type Category = 'Environment' | 'Social' | 'Governance'

// Material topics with full DMA data (CSRD / BRSR aligned)
const materialTopics: { id: string; name: string; envImpact: number; finImpact: number; category: Category; disclosures: string[]; status: 'approved' | 'in_review'; stakeholders: number }[] = [
  { id: '1', name: 'GHG Emissions (Scope 1 & 2)', envImpact: 92, finImpact: 95, category: 'Environment', disclosures: ['GRI 305-1', 'IFRS S2', 'BRSR P5'], status: 'approved', stakeholders: 95 },
  { id: '2', name: 'Renewable Energy Generation', envImpact: 95, finImpact: 88, category: 'Environment', disclosures: ['GRI 302-1', 'BRSR P5-E1'], status: 'approved', stakeholders: 92 },
  { id: '3', name: 'Data Security & Privacy', envImpact: 25, finImpact: 90, category: 'Governance', disclosures: ['GRI 418-1', 'BRSR P1'], status: 'approved', stakeholders: 88 },
  { id: '4', name: 'Supply Chain Human Rights', envImpact: 72, finImpact: 65, category: 'Social', disclosures: ['GRI 414', 'BRSR P6'], status: 'in_review', stakeholders: 75 },
  { id: '5', name: 'Water Management', envImpact: 68, finImpact: 45, category: 'Environment', disclosures: ['GRI 303', 'BRSR P5'], status: 'approved', stakeholders: 82 },
  { id: '6', name: 'Employee Health & Safety', envImpact: 55, finImpact: 72, category: 'Social', disclosures: ['GRI 403', 'BRSR P3'], status: 'approved', stakeholders: 90 },
  { id: '7', name: 'Waste & Circular Economy', envImpact: 78, finImpact: 38, category: 'Environment', disclosures: ['GRI 306', 'BRSR P5'], status: 'approved', stakeholders: 70 },
  { id: '8', name: 'Board Diversity & Inclusion', envImpact: 42, finImpact: 58, category: 'Governance', disclosures: ['GRI 405', 'BRSR P4'], status: 'approved', stakeholders: 85 },
  { id: '9', name: 'Community & CSR', envImpact: 65, finImpact: 52, category: 'Social', disclosures: ['GRI 413', 'BRSR P8'], status: 'in_review', stakeholders: 78 },
]

const DMA_PROCESS_STEPS = [1, 2, 3, 4, 5].map(step => ({ step, done: true }))

const STAKEHOLDERS = [
  { key: 'board' as const, p: 100 },
  { key: 'investors' as const, p: 92 },
  { key: 'employees' as const, p: 88 },
  { key: 'communities' as const, p: 78 },
]

const categoryDot: Record<Category, string> = {
  Environment: 'bg-emerald-500',
  Social: 'bg-sky-500',
  Governance: 'bg-amber-500',
}
const categoryTone: Record<Category, Tone> = { Environment: 'success', Social: 'info', Governance: 'warning' }

type Tab = 'matrix' | 'process' | 'disclosures'

export default function DoubleMateriality() {
  const s = useStrings(doubleMaterialityStrings)
  const f = useFormat()
  const [selectedTopic, setSelectedTopic] = useState(materialTopics[0])
  const [activeTab, setActiveTab] = useState<Tab>('matrix')
  const navigate = useNavigate()
  const { dma } = mockData

  const topicName = (t: { id: string; name: string }) => s.topics[t.id] ?? t.name
  const inReview = materialTopics.filter(t => t.status === 'in_review')

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.title}
        description={s.description}
        actions={
          <>
            <Link
              to="/analytics/benchmark"
              className="inline-flex items-center justify-center gap-2 h-9 px-3.5 text-sm font-medium rounded-[10px] bg-white text-zinc-800 border border-line hover:bg-zinc-50 hover:border-zinc-300 shadow-sm transition-colors"
            >
              <BarChart3 className="w-4 h-4" /> {s.benchmark}
            </Link>
            <Button variant="primary" iconRight={ArrowRight} onClick={() => navigate('/frameworks')}>{s.mapToDisclosures}</Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard label={s.kpi.completion} value={f.percent(dma.percentage)} delta={dma.change} deltaLabel={s.kpi.vsLast} />
        <StatCard label={s.kpi.totalTopics} value={dma.totalMaterialTopics} deltaLabel={s.kpi.assessed} />
        <StatCard label={s.kpi.materialTopics} value={dma.topicsWithCompleteDMA} deltaLabel={s.kpi.withComplete} />
        <StatCard label={s.kpi.frameworks} value={s.kpi.aligned} icon={Shield} footer={<Badge tone="success" dot>{s.kpi.frameworkReady}</Badge>} />
        <StatCard label={s.kpi.inReview} value={inReview.length} footer={<Badge tone="warning" dot>{s.kpi.pendingValidation}</Badge>} className="col-span-2 md:col-span-1" />
      </div>

      <Tabs<Tab>
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { value: 'matrix', label: s.tabs.matrix },
          { value: 'process', label: s.tabs.process },
          { value: 'disclosures', label: s.tabs.disclosures },
        ]}
      />

      {activeTab === 'matrix' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="lg:col-span-2">
            <CardHeader
              title={s.matrixTitle}
              description={s.matrixDesc}
              action={
                <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-500">
                  {(Object.keys(categoryDot) as Category[]).map(c => (
                    <span key={c} className="inline-flex items-center gap-1.5">
                      <span className={clsx('w-2 h-2 rounded-full', categoryDot[c])} /> {s.categoryShort[c]}
                    </span>
                  ))}
                </div>
              }
            />
            <div className="flex sm:hidden items-center gap-3 text-xs text-zinc-500 mb-4">
              {(Object.keys(categoryDot) as Category[]).map(c => (
                <span key={c} className="inline-flex items-center gap-1.5">
                  <span className={clsx('w-2 h-2 rounded-full', categoryDot[c])} /> {s.categoryShort[c]}
                </span>
              ))}
            </div>
            <div className="relative pl-6 pb-6">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-xs text-zinc-500 whitespace-nowrap -translate-x-1/3">{s.axisFinancial}</div>
              <div className="relative border-l border-b border-zinc-300 h-72 sm:h-80 ml-2">
                <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-zinc-200" />
                <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-zinc-200" />
                <div className="absolute left-1/2 right-0 top-0 bottom-1/2 bg-emerald-50/50" />
                <div className="absolute top-2 left-[calc(50%+8px)] text-[11px] font-medium text-emerald-700/70">{s.highZone}</div>
                {materialTopics.map(topic => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setSelectedTopic(topic)}
                    aria-label={topicName(topic)}
                    title={topicName(topic)}
                    className={clsx(
                      'absolute w-4 h-4 -translate-x-1/2 translate-y-1/2 rounded-full ring-2 ring-white shadow-sm transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-zinc-900',
                      categoryDot[topic.category],
                      selectedTopic.id === topic.id && 'scale-125 outline outline-2 outline-offset-2 outline-zinc-900',
                    )}
                    style={{ left: `${topic.envImpact}%`, bottom: `${topic.finImpact}%` }}
                  />
                ))}
              </div>
              <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-zinc-500">{s.axisImpact}</div>
            </div>
          </Card>

          <div className="space-y-4 sm:space-y-6">
            <Card>
              <Badge tone={categoryTone[selectedTopic.category]}>{fmt(s.categoryMateriality, { category: s.categories[selectedTopic.category] })}</Badge>
              <h3 className="text-lg font-semibold text-zinc-900 mt-3">{topicName(selectedTopic)}</h3>
              <p className="text-[13px] text-zinc-500 mt-1 mb-5 leading-relaxed">{s.highHighNote}</p>
              <div className="space-y-4">
                <ScoreBar label={s.financialImpact} value={selectedTopic.finImpact} display={fmt(s.outOf100, { value: selectedTopic.finImpact })} />
                <ScoreBar label={s.envSocImpact} value={selectedTopic.envImpact} display={fmt(s.outOf100, { value: selectedTopic.envImpact })} />
              </div>
              <Button variant="secondary" iconRight={ArrowRight} className="w-full mt-5" onClick={() => navigate('/frameworks')}>{s.viewPolicies}</Button>
            </Card>

            <Card>
              <CardHeader title={s.alignmentTitle} className="mb-4" />
              <div className="space-y-3">
                {STAKEHOLDERS.map(st => (
                  <div key={st.key} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-zinc-700">{s.stakeholders[st.key]}</span>
                    <div className="flex items-center gap-3">
                      <Progress value={st.p} className="w-20" tone={st.p >= 85 ? 'success' : 'warning'} />
                      <span className="text-sm font-medium text-zinc-900 tabular w-10 text-right">{f.percent(st.p)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="secondary" icon={Send} className="w-full mt-5">{s.sendSurvey}</Button>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'process' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
          <Card>
            <CardHeader title={s.processTitle} description={s.processDesc} icon={FileCheck} />
            <ol className="relative space-y-1">
              {DMA_PROCESS_STEPS.map((st, i) => (
                <li key={st.step} className="relative flex items-start gap-4 py-3">
                  {i < DMA_PROCESS_STEPS.length - 1 && <span className="absolute left-4 top-11 bottom-[-4px] w-px bg-line" aria-hidden />}
                  <div className={clsx('relative w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold', st.done ? 'bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200' : 'bg-zinc-100 text-zinc-500')}>
                    {st.done ? <CheckCircle2 className="w-4 h-4" /> : st.step}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900">{s.steps[i].label}</p>
                      {st.done && <span className="sr-only">{s.stepDone}</span>}
                    </div>
                    <p className="text-[13px] text-zinc-500 mt-0.5">{s.steps[i].desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
          <div className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader title={s.docTitle} icon={FileCheck} className="mb-3" />
              <p className="text-[13px] text-zinc-600 leading-relaxed">{s.docBody}</p>
            </Card>
            <Card>
              <CardHeader title={s.quickLinks} className="mb-3" />
              <div className="divide-y divide-line -mx-2">
                {[
                  { to: '/analytics', label: s.links.csrd },
                  { to: '/carbon', label: s.links.ghg },
                  { to: '/ghg', label: s.links.targets },
                ].map(l => (
                  <Link key={l.to} to={l.to} className="flex items-center justify-between gap-3 px-2 py-3 rounded-lg hover:bg-zinc-50 transition-colors text-sm text-zinc-700 hover:text-zinc-900">
                    {l.label} <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'disclosures' && (
        <Card>
          <CardHeader title={s.mappingTitle} description={s.mappingDesc} />
          <div className={tableClass.wrap}>
            <table className={clsx(tableClass.table, 'min-w-[820px]')}>
              <thead>
                <tr>
                  <th className={tableClass.th}>{s.cols.topic}</th>
                  <th className={tableClass.th}>{s.cols.category}</th>
                  <th className={tableClass.th}>{s.cols.disclosures}</th>
                  <th className={tableClass.th}>{s.cols.status}</th>
                  <th className={clsx(tableClass.th, 'text-right')}>{s.cols.stakeholders}</th>
                  <th className={clsx(tableClass.th, 'text-right')}>{s.cols.action}</th>
                </tr>
              </thead>
              <tbody>
                {materialTopics.map(t => (
                  <tr key={t.id} className={tableClass.tr}>
                    <td className={clsx(tableClass.td, 'font-medium text-zinc-900')}>{topicName(t)}</td>
                    <td className={tableClass.td}><Badge tone={categoryTone[t.category]}>{s.categories[t.category]}</Badge></td>
                    <td className={tableClass.td}><span className="text-xs font-mono text-zinc-500">{t.disclosures.join(', ')}</span></td>
                    <td className={tableClass.td}><Badge tone={t.status === 'approved' ? 'success' : 'warning'} dot>{s.status[t.status]}</Badge></td>
                    <td className={clsx(tableClass.td, 'text-right tabular font-medium text-zinc-900')}>{f.percent(t.stakeholders)}</td>
                    <td className={clsx(tableClass.td, 'text-right')}>
                      <Button size="sm" variant="secondary" onClick={() => navigate('/frameworks')}>{s.open}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Validation alert */}
      <div className="rounded-card bg-amber-50 ring-1 ring-inset ring-amber-200/70 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-amber-900">{s.validationTitle}</h4>
            <p className="text-[13px] text-amber-900/80 mt-0.5">
              {fmt(s.validationBody, { count: inReview.length, a: topicName(inReview[0]), b: topicName(inReview[1]) })}
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setActiveTab('disclosures')}>{s.reviewNow}</Button>
      </div>
    </div>
  )
}

function ScoreBar({ label, value, display }: { label: string; value: number; display: string }) {
  return (
    <div>
      <div className="flex justify-between text-[13px] mb-1.5">
        <span className="text-zinc-500">{label}</span>
        <span className="font-medium text-zinc-900 tabular">{display}</span>
      </div>
      <Progress value={value} />
    </div>
  )
}
