import { useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, TrendingUp, FileQuestion, SearchX, MapPin } from 'lucide-react';
import clsx from 'clsx';
import { PageHeader, Card, CardHeader, Button, Badge, StatCard, Tabs, EmptyState, tableClass, Tone } from '../components/ui';
import { fmt, useFormat, useStrings } from '../i18n';
import { gapAnalyticsDashboardStrings } from '../i18n/pages/gapAnalyticsDashboard';

type Severity = 'Critical' | 'High' | 'Medium';

const GAP_DATA: { disclosure: string; bu: string; site: string; gapType: string; severity: Severity; owner: string; dueDate: string; status: string }[] = [
  { disclosure: 'BRSR P5-E1', bu: 'Solar Division', site: 'Rajasthan 400MW', gapType: 'Missing Evidence', severity: 'Critical', owner: 'EHS Team', dueDate: '2025-12-05', status: 'Open' },
  { disclosure: 'GRI 305-2', bu: 'Wind Division', site: 'Gujarat 250MW', gapType: 'Validation Error', severity: 'High', owner: 'Sustainability', dueDate: '2025-12-08', status: 'In Progress' },
  { disclosure: 'GRI 403-9', bu: 'O&M', site: 'Tamil Nadu Hub', gapType: 'Missing Required Field', severity: 'Critical', owner: 'HR / Safety', dueDate: '2025-12-03', status: 'Open' },
  { disclosure: 'BRSR P3-E3', bu: 'Corporate', site: 'Mumbai HQ', gapType: 'Incomplete Data', severity: 'Medium', owner: 'HR', dueDate: '2025-12-10', status: 'Open' },
  { disclosure: 'IFRS S2-1', bu: 'Solar Division', site: 'Karnataka 200MW', gapType: 'Incomplete Data', severity: 'Critical', owner: 'Finance', dueDate: '2025-12-04', status: 'Open' },
  { disclosure: 'GRI 302-1', bu: 'Wind Division', site: 'Andhra Pradesh 180MW', gapType: 'Missing Evidence', severity: 'High', owner: 'Facilities', dueDate: '2025-12-06', status: 'Open' },
  { disclosure: 'BRSR P8-L1', bu: 'CSR', site: 'Multi-site', gapType: 'Missing Required Field', severity: 'High', owner: 'CSR / Legal', dueDate: '2025-12-07', status: 'Open' },
  { disclosure: 'BRSR P9-E1', bu: 'Corporate', site: 'Mumbai HQ', gapType: 'Missing Evidence', severity: 'Medium', owner: 'Compliance', dueDate: '2025-12-15', status: 'Open' },
  { disclosure: 'IFRS S2-2', bu: 'Strategy', site: 'Corporate', gapType: 'Validation Error', severity: 'High', owner: 'Finance / Risk', dueDate: '2025-12-09', status: 'Open' },
  { disclosure: 'MSX-DMA', bu: 'Corporate', site: 'Mumbai HQ', gapType: 'Not Started', severity: 'Critical', owner: 'Risk Mgmt', dueDate: '2025-11-30', status: 'Open' },
];

const HEATMAP_BUS = ['Solar Division', 'Wind Division', 'O&M', 'Corporate'];
const HEATMAP_TOPICS = ['GHG Emissions', 'Energy', 'Health & Safety', 'BRSR Principles', 'Governance', 'RE Metrics'];
const HEATMAP_DATA: Record<string, Record<string, number>> = {
  'Solar Division': { 'GHG Emissions': 2, 'Energy': 1, 'Health & Safety': 0, 'BRSR Principles': 1, 'Governance': 0, 'RE Metrics': 1 },
  'Wind Division': { 'GHG Emissions': 1, 'Energy': 2, 'Health & Safety': 0, 'BRSR Principles': 0, 'Governance': 1, 'RE Metrics': 0 },
  'O&M': { 'GHG Emissions': 0, 'Energy': 0, 'Health & Safety': 3, 'BRSR Principles': 0, 'Governance': 0, 'RE Metrics': 1 },
  'Corporate': { 'GHG Emissions': 0, 'Energy': 0, 'Health & Safety': 0, 'BRSR Principles': 2, 'Governance': 1, 'RE Metrics': 0 },
};

const SITE_EVIDENCE = [
  { site: 'Rajasthan 400MW Solar', items: [{ type: 'Emissions Data', status: 'Missing' }, { type: 'REC Certificates', status: 'OK' }, { type: 'CPCB Consent', status: 'OK' }] },
  { site: 'Gujarat 250MW Wind', items: [{ type: 'Emissions Data', status: 'OK' }, { type: 'Generation Logs', status: 'Pending' }, { type: 'Safety Audit', status: 'OK' }] },
  { site: 'Tamil Nadu O&M Hub', items: [{ type: 'Emissions Data', status: 'OK' }, { type: 'Incident Reports', status: 'Missing' }, { type: 'Training Records', status: 'OK' }] },
  { site: 'Karnataka 200MW Solar', items: [{ type: 'IFRS S2 Climate', status: 'Missing' }, { type: 'Grid Factor FY25', status: 'Pending' }, { type: 'Generation Logs', status: 'OK' }] },
  { site: 'AP 180MW Wind', items: [{ type: 'Energy Data', status: 'Missing' }, { type: 'Land Consent', status: 'OK' }, { type: 'Biodiversity', status: 'OK' }] },
  { site: 'Mumbai HQ', items: [{ type: 'CSR Report', status: 'Pending' }, { type: 'Board Minutes', status: 'OK' }, { type: 'BRSR Filing', status: 'Pending' }] },
];

const SEVERITY_TONE: Record<string, Tone> = { Critical: 'danger', High: 'warning', Medium: 'info', Low: 'neutral' };
const STATUS_TONE: Record<string, Tone> = { Open: 'neutral', 'In Progress': 'info', OK: 'success', Missing: 'danger', Pending: 'warning' };

// Calm sequential scale (zinc → rose) so the heatmap reads by intensity, not rainbow.
const HEAT = [
  'bg-zinc-50 text-zinc-400 ring-zinc-100',
  'bg-amber-50 text-amber-800 ring-amber-100',
  'bg-orange-100 text-orange-800 ring-orange-200',
  'bg-rose-100 text-rose-800 ring-rose-200',
];
const heatClass = (count: number) => HEAT[Math.min(count, 3)];

export default function GapAnalyticsDashboard() {
  const s = useStrings(gapAnalyticsDashboardStrings);
  const f = useFormat();
  const [view, setView] = useState<'table' | 'heatmap'>('table');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');

  const filteredGaps = severityFilter === 'all' ? GAP_DATA : GAP_DATA.filter(g => g.severity === severityFilter);
  const topGaps = GAP_DATA
    .filter(g => g.status === 'Open' && g.severity === 'Critical')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const tr = (map: Record<string, string>, v: string) => map[v] ?? v;
  const date = (d: string) => f.date(d, { day: 'numeric', month: 'short', year: 'numeric' });
  const countBy = (sev: Severity) => GAP_DATA.filter(g => g.severity === sev).length;
  const openBy = (sev: Severity) => GAP_DATA.filter(g => g.severity === sev && g.status === 'Open').length;

  return (
    <div>
      <PageHeader
        title={s.title}
        description={s.description}
        actions={
          <Tabs
            value={view}
            onChange={setView}
            items={[
              { value: 'table', label: s.views.table },
              { value: 'heatmap', label: s.views.heatmap },
            ]}
          />
        }
      />

      <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label={s.stats.critical} value={countBy('Critical')} icon={AlertTriangle} deltaLabel={fmt(s.stats.openOf, { count: openBy('Critical') })} />
        <StatCard label={s.stats.high} value={countBy('High')} icon={FileQuestion} deltaLabel={fmt(s.stats.openOf, { count: openBy('High') })} />
        <StatCard label={s.stats.inProgress} value={GAP_DATA.filter(g => g.status === 'In Progress').length} icon={TrendingUp} />
        <StatCard label={s.stats.resolvedWeek} value={14} icon={CheckCircle2} />
      </div>

      {/* Critical gaps */}
      <Card>
        <CardHeader
          title={s.top.title}
          description={s.top.description}
          action={<Button variant="primary" size="sm">{s.top.assignAll}</Button>}
        />
        {topGaps.length === 0 ? (
          <EmptyState icon={CheckCircle2} title={s.top.empty} />
        ) : (
          <ul className="-mx-5 sm:-mx-6 border-t border-line">
            {topGaps.map((gap, idx) => (
              <li key={gap.disclosure} className="group flex items-start sm:items-center gap-3 sm:gap-4 px-5 sm:px-6 py-3.5 border-b border-line last:border-b-0 hover:bg-zinc-50/70 transition-colors">
                <span className="w-5 pt-0.5 sm:pt-0 text-xs text-zinc-400 tabular shrink-0">{idx + 1}</span>
                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900">
                      <span className="font-mono">{gap.disclosure}</span>
                      <span className="text-zinc-300 mx-2">·</span>
                      {tr(s.gapType, gap.gapType)}
                    </p>
                    <p className="text-[13px] text-zinc-500 mt-0.5 truncate">{tr(s.bu, gap.bu)} / {gap.site}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-zinc-500 tabular">{fmt(s.top.due, { date: date(gap.dueDate) })}</span>
                    <Badge tone={SEVERITY_TONE[gap.severity]}>{tr(s.severity, gap.severity)}</Badge>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={s.top.open}
                  title={s.top.open}
                  className="w-8 h-8 rounded-lg border border-line text-zinc-500 flex items-center justify-center shrink-0 hover:border-zinc-300 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {view === 'table' && (
        <Card>
          <CardHeader
            title={s.all.title}
            description={fmt(s.all.description, { count: filteredGaps.length })}
            className="flex-col sm:flex-row"
            action={
              <div aria-label={s.all.filter}>
                <Tabs
                  value={severityFilter}
                  onChange={setSeverityFilter}
                  items={[
                    { value: 'all', label: s.all.all },
                    ...(['Critical', 'High', 'Medium'] as const).map(v => ({ value: v, label: tr(s.severity, v), count: countBy(v) })),
                  ]}
                />
              </div>
            }
          />
          {filteredGaps.length === 0 ? (
            <EmptyState icon={SearchX} title={s.all.empty} />
          ) : (
            <div className={tableClass.wrap}>
              <table className={tableClass.table}>
                <thead>
                  <tr>
                    <th className={tableClass.th}>{s.all.cols.disclosure}</th>
                    <th className={tableClass.th}>{s.all.cols.buSite}</th>
                    <th className={tableClass.th}>{s.all.cols.gapType}</th>
                    <th className={tableClass.th}>{s.all.cols.severity}</th>
                    <th className={tableClass.th}>{s.all.cols.owner}</th>
                    <th className={tableClass.th}>{s.all.cols.due}</th>
                    <th className={tableClass.th}>{s.all.cols.status}</th>
                    <th className={clsx(tableClass.th, 'text-right')}>{s.all.cols.action}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGaps.map(gap => (
                    <tr key={gap.disclosure} className={tableClass.tr}>
                      <td className={clsx(tableClass.td, 'font-mono text-[13px] font-medium text-zinc-900 whitespace-nowrap')}>{gap.disclosure}</td>
                      <td className={tableClass.td}>
                        <div className="text-[13px] font-medium text-zinc-800 whitespace-nowrap">{tr(s.bu, gap.bu)}</div>
                        <div className="text-xs text-zinc-500 whitespace-nowrap">{gap.site}</div>
                      </td>
                      <td className={clsx(tableClass.td, 'text-[13px] whitespace-nowrap')}>{tr(s.gapType, gap.gapType)}</td>
                      <td className={tableClass.td}><Badge tone={SEVERITY_TONE[gap.severity]}>{tr(s.severity, gap.severity)}</Badge></td>
                      <td className={clsx(tableClass.td, 'text-[13px] text-zinc-600 whitespace-nowrap')}>{tr(s.owner, gap.owner)}</td>
                      <td className={clsx(tableClass.td, 'text-[13px] text-zinc-600 tabular whitespace-nowrap')}>{date(gap.dueDate)}</td>
                      <td className={tableClass.td}><Badge tone={STATUS_TONE[gap.status]} dot>{tr(s.status, gap.status)}</Badge></td>
                      <td className={clsx(tableClass.td, 'text-right')}>
                        <Button size="sm" variant="secondary">{s.all.resolve}</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {view === 'heatmap' && (
        <div className="space-y-6">
          <Card>
            <CardHeader title={s.heatmap.title} description={s.heatmap.description} />
            <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
              <table className="w-full min-w-[640px] border-separate border-spacing-1.5">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-zinc-500 pb-1 pr-2">{s.heatmap.bu}</th>
                    {HEATMAP_TOPICS.map(topic => (
                      <th key={topic} className="text-center text-xs font-medium text-zinc-500 pb-1">{tr(s.topics, topic)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HEATMAP_BUS.map(bu => (
                    <tr key={bu}>
                      <td className="text-sm font-medium text-zinc-800 pr-2 whitespace-nowrap">{tr(s.bu, bu)}</td>
                      {HEATMAP_TOPICS.map(topic => {
                        const count = HEATMAP_DATA[bu]?.[topic] || 0;
                        return (
                          <td key={topic}>
                            <div className={clsx('h-12 flex items-center justify-center rounded-lg ring-1 ring-inset text-base font-semibold tabular', heatClass(count))}>
                              {count}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5 text-xs text-zinc-500">
              <span className="font-medium">{s.heatmap.legend}</span>
              {s.heatmap.legendItems.map((label, i) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <span className={clsx('w-3.5 h-3.5 rounded ring-1 ring-inset', HEAT[i])} />
                  {label}
                </span>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title={s.sites.title} description={s.sites.description} />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {SITE_EVIDENCE.map(site => (
                <div key={site.site} className="rounded-xl border border-line p-4 hover:border-zinc-300 transition-colors">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-900 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    {site.site}
                  </p>
                  <div className="space-y-2">
                    {site.items.map(item => (
                      <div key={item.type} className="flex items-center justify-between gap-3 text-[13px]">
                        <span className="text-zinc-600">{tr(s.evidence, item.type)}</span>
                        <Badge tone={STATUS_TONE[item.status]}>{tr(s.status, item.status)}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
      </div>
    </div>
  );
}
