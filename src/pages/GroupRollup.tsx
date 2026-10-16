import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronRight, Factory, Building2, Landmark, Globe2, FileOutput, Search, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, Cell, LabelList, Tooltip, XAxis, YAxis } from 'recharts'
import { nexus, type NexusQuestionnaireItem } from '../lib/api'
import { type OrgEntity } from '../lib/orgStore'
import { buildRollup, groupCumulativeFor, type RollupNode } from '../lib/rollup'
import { useOrgData } from '../lib/useOrgData'
import { useFramework } from '../lib/frameworks'
import JourneyBar from '../components/JourneyBar'
import PageHeader from '../components/PageHeader'
import { Button } from '../design-system'
import { EmptyState, NumberTicker, StateBoundary, StatusPill, Skeleton } from '../components/ui'
import { SkeletonTable } from '../components/Skeleton'
import ChartFrame, { chartColors, useChartTheme } from '../components/ui/ChartFrame'
import SplitBar from '../components/analytics/data/SplitBar'
import { itemLabel } from '../lib/itemLabel'
import { useFmt } from '../lib/fmt'

const TYPE_ICON: Record<OrgEntity['type'], typeof Landmark> = {
  group: Landmark,
  business_unit: Globe2,
  subsidiary: Building2,
  plant: Factory,
  office: Building2,
}

const SCOPE_COLOR = [chartColors.s1, chartColors.s2, chartColors.s3]

/** Scope 1 / 2 / 3 absolute-emissions questions (GRI 305-1/2/3, CN "范围一/二/三" items). */
function scopeQuestions(qs: NexusQuestionnaireItem[]): (NexusQuestionnaireItem | undefined)[] {
  return [1, 2, 3].map((n) =>
    qs.find((q) => q.gri_code.split(' ')[0] === `305-${n}`) ??
    qs.find((q) => new RegExp(`\\bscope\\s*${n}\\b`, 'i').test(q.line_item) && !/intensity|target|reduction/i.test(q.line_item)),
  )
}

export default function GroupRollup() {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const navigate = useNavigate()
  const ct = useChartTheme()
  const { data: orgData, loading: orgLoading, error: orgError, reload: reloadOrg } = useOrgData()
  const { active: framework } = useFramework()
  const [questions, setQuestions] = useState<NexusQuestionnaireItem[] | null>(null)
  const [treeError, setTreeError] = useState<unknown>(null)
  const [selectedQid, setSelectedQid] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const loadTree = useCallback(() => {
    let alive = true
    setTreeError(null)
    nexus
      .tree(framework.id)
      .then((tree) => alive && setQuestions(Array.isArray(tree) ? tree : []))
      .catch((e) => {
        if (!alive) return
        setTreeError(e)
        setQuestions(null)
      })
    return () => {
      alive = false
    }
  }, [framework.id])

  useEffect(() => {
    setQuestions(null)
    setSelectedQid(null)
    return loadTree()
  }, [loadTree])

  const loading = (questions == null && !treeError) || (orgLoading && !orgData)
  const error = treeError ?? orgError
  const retry = () => {
    loadTree()
    reloadOrg()
  }

  // Preselect a question that has assignments once org data is in
  useEffect(() => {
    if (!orgData || selectedQid != null || !questions || questions.length === 0) return
    const hasData = questions.find((q) => orgData.assignments.some((a) => a.questionId === q.id))
    setSelectedQid(hasData?.id ?? questions[0].id)
  }, [orgData, questions, selectedQid])

  const rollup = useMemo(() => {
    if (!selectedQid || !orgData) return null
    return buildRollup(selectedQid, orgData.entities, orgData.assignments)
  }, [selectedQid, orgData])
  const selectedQ = useMemo(() => questions?.find((q) => q.id === selectedQid), [questions, selectedQid])

  const filteredQuestions = useMemo(() => {
    const qs = questions ?? []
    if (!query) return qs
    const q = query.toLowerCase()
    return qs.filter((x) => x.gri_code.toLowerCase().includes(q) || x.line_item.toLowerCase().includes(q) || (x.line_item_zh ?? '').toLowerCase().includes(q))
  }, [query, questions])

  // Scope 1/2/3 consolidated group totals (equity-weighted, submitted + approved values)
  const scopes = useMemo(() => {
    if (!questions || !orgData) return []
    return scopeQuestions(questions)
      .map((q, i) => {
        if (!q) return null
        const r = groupCumulativeFor(q.id, orgData.entities, orgData.assignments)
        return { scope: i + 1, label: t(`rollup.scope.s${i + 1}`), qid: q.id, value: r.value ?? 0, has: r.value != null, unit: r.unit ?? q.unit, approved: r.approved, total: r.total }
      })
      .filter((x): x is NonNullable<typeof x> => x != null)
  }, [questions, orgData, t])
  const scopeUnit = scopes.find((s) => s.unit)?.unit ?? 'tCO2e'

  // auto-expand all on new selection
  useEffect(() => {
    if (!rollup) return
    const ids = new Set<string>()
    const walk = (n: RollupNode) => {
      ids.add(n.entity.id)
      n.children.forEach(walk)
    }
    walk(rollup)
    setExpanded(ids)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQid, rollup != null])

  const fullyApproved = !!rollup && rollup.assigned > 0 && rollup.approved === rollup.assigned

  return (
    <div>
      <div className="mb-4">
        <JourneyBar variant="compact" highlight="approve" />
      </div>
      <PageHeader eyebrow={t('rollup.eyebrow')} title={t('rollup.title')} description={t('rollup.intro')} />

      <StateBoundary
        loading={loading}
        error={error}
        onRetry={retry}
        skeleton={
          <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
            <Skeleton className="h-[420px] hidden lg:block" rounded="lg" />
            <div className="space-y-4">
              <Skeleton className="h-[140px]" rounded="lg" />
              <div className="surface-paper p-4">
                <SkeletonTable rows={5} cols={4} />
              </div>
            </div>
          </div>
        }
        errorState={{ title: t('rollup.errorTitle') }}
        empty={!loading && (questions?.length === 0 || (orgData?.entities.length ?? 0) === 0)}
        emptyState={
          (orgData?.entities.length ?? 0) === 0
            ? { art: 'setup', title: t('rollup.empty.noEntitiesTitle'), body: t('rollup.empty.noEntitiesBody'), cta: { label: t('rollup.empty.noEntitiesCta'), to: '/data/org-setup' } }
            : { art: 'noData', title: t('rollup.empty.noQuestionsTitle', { code: framework.code }), body: t('rollup.empty.noQuestionsBody') }
        }
      >
        <div className="space-y-5">
          {scopes.length > 0 && (
            <ChartFrame
              title={t('rollup.scope.title')}
              subtitle={t('rollup.scope.subtitle', { unit: f.unit(scopeUnit) })}
              height={168}
              empty={!scopes.some((s) => s.has)}
              emptyTitle={t('rollup.scope.emptyTitle')}
              emptyBody={t('rollup.scope.emptyBody')}
              footnote={t('rollup.scope.footnote')}
            >
              <BarChart data={scopes} layout="vertical" margin={{ top: 0, right: 112, bottom: 0, left: 0 }} barCategoryGap={12} maxBarSize={30}>
                <XAxis type="number" hide domain={[0, 'dataMax']} />
                <YAxis type="category" dataKey="label" {...ct.yAxis} width={72} tickFormatter={undefined} />
                <Tooltip
                  {...ct.tooltip({ format: (n) => f.exact(n), unit: scopeUnit })}
                  cursor={{ fill: 'var(--bg-hover)' }}
                />
                <Bar
                  dataKey="value"
                  name={t('rollup.groupTotal')}
                  {...ct.bar}
                  radius={[0, 4, 4, 0]}
                  minPointSize={2}
                  cursor="pointer"
                  onClick={(d: { qid?: string }) => d?.qid && setSelectedQid(d.qid)}
                >
                  {scopes.map((s) => (
                    <Cell key={s.scope} fill={SCOPE_COLOR[s.scope - 1]} fillOpacity={selectedQid && selectedQid !== s.qid ? 0.55 : 1} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(v: unknown) => f.exact(v as number, scopeUnit, { precision: 1 }).replace(' ', '\u00A0')}
                    style={{ fill: 'var(--text-primary)', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                  />
                </Bar>
              </BarChart>
            </ChartFrame>
          )}

          <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] items-start">
            {/* Question picker */}
            <aside className="surface-paper overflow-hidden lg:sticky lg:top-4" aria-label={t('rollup.pickerAria')}>
              <div className="p-3 border-b border-[var(--border-subtle)]">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" aria-hidden />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label={t('rollup.searchPlaceholder')}
                    placeholder={t('rollup.searchPlaceholder')}
                    className="w-full h-10 pl-9 pr-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] text-small text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-brand)] focus:bg-[var(--bg-primary)]"
                  />
                </div>
              </div>
              {/* Phones: a compact select instead of a long list */}
              <div className="p-3 lg:hidden">
                <select
                  aria-label={t('rollup.pickerAria')}
                  value={selectedQid ?? ''}
                  onChange={(e) => setSelectedQid(e.target.value)}
                  className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small text-[var(--text-primary)]"
                >
                  {filteredQuestions.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.gri_code} · {itemLabel(q, i18n.language)}
                    </option>
                  ))}
                </select>
              </div>
              <ul className="hidden lg:block max-h-[560px] overflow-y-auto divide-y divide-[var(--border-subtle)]">
                {filteredQuestions.map((q) => {
                  const hasData = orgData?.assignments.some((a) => a.questionId === q.id) ?? false
                  const active = q.id === selectedQid
                  return (
                    <li key={q.id}>
                      <button
                        onClick={() => setSelectedQid(q.id)}
                        aria-current={active ? 'true' : undefined}
                        className={`relative w-full text-left px-4 py-3 transition-colors duration-micro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand)] ${
                          active ? 'bg-[var(--color-brand-soft)]' : 'hover:bg-[var(--bg-hover)]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-caption font-semibold text-[var(--color-brand)]">{q.gri_code}</span>
                          {hasData && <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)]" title={t('rollup.hasPlantData')} aria-label={t('rollup.hasPlantData')} />}
                          {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-[var(--color-brand)]" aria-hidden />}
                        </div>
                        <div className={`text-small mt-0.5 line-clamp-2 ${active ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{itemLabel(q, i18n.language)}</div>
                      </button>
                    </li>
                  )
                })}
                {filteredQuestions.length === 0 && (
                  <li>
                    <EmptyState variant="filtered" density="compact" onClearFilters={() => setQuery('')} />
                  </li>
                )}
              </ul>
            </aside>

            {/* Detail */}
            <div className="min-w-0 space-y-4">
              {selectedQ && (
                <section className="surface-hero p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
                    <div className="min-w-0">
                      <div className="font-mono text-caption font-semibold text-[var(--color-brand)]">{selectedQ.gri_code}</div>
                      <h2 className="type-h2 text-[var(--text-primary)] mt-1 text-balance">{itemLabel(selectedQ, i18n.language)}</h2>
                      <div className="flex items-center gap-x-3 gap-y-1 mt-1.5 text-caption text-[var(--text-tertiary)] flex-wrap">
                        <span>
                          {selectedQ.section} · {selectedQ.subsection}
                        </span>
                        {selectedQ.unit && <span>{t('rollup.unit', { unit: f.unit(selectedQ.unit) })}</span>}
                        {selectedQ.scope_split && <span>{selectedQ.scope_split}</span>}
                      </div>
                    </div>
                    <div className="sm:text-right flex-shrink-0">
                      <div className="text-caption font-medium text-[var(--text-tertiary)]">{t('rollup.groupTotal')}</div>
                      {rollup?.cumulative != null ? (
                        <div className="flex sm:justify-end items-baseline gap-1.5 mt-0.5">
                          <NumberTicker value={rollup.cumulative} format={(n) => f.exact(n)} className="type-figure text-[32px] leading-[38px] text-[var(--text-primary)]" />
                          {rollup.unit && <span className="text-small text-[var(--text-tertiary)] font-medium">{f.unit(rollup.unit)}</span>}
                        </div>
                      ) : (
                        <div className="text-small text-[var(--text-tertiary)] mt-1">{t('rollup.noValueYet')}</div>
                      )}
                    </div>
                  </div>
                  {rollup && (
                    <div className="mt-5">
                      <div className="flex items-center gap-2 flex-wrap mb-2.5">
                        <StatusPill status="approved" size="sm">
                          {t('rollup.chips.approved')} · {f.number(rollup.approved)}
                        </StatusPill>
                        <StatusPill status="submitted" size="sm">
                          {t('rollup.chips.inReview')} · {f.number(rollup.submitted)}
                        </StatusPill>
                        <StatusPill status="not_started" size="sm">
                          {t('rollup.chips.outstanding')} · {f.number(rollup.notStarted)}
                        </StatusPill>
                        <span className="text-caption text-[var(--text-tertiary)] tabular-nums ml-auto">
                          {t('rollup.approvedOf', { approved: rollup.approved, assigned: rollup.assigned })}
                        </span>
                      </div>
                      <SplitBar
                        total={Math.max(rollup.assigned, 1)}
                        aria-label={t('rollup.approvedOf', { approved: rollup.approved, assigned: rollup.assigned })}
                        segments={[
                          { id: 'approved', value: rollup.approved, color: 'var(--chart-s1)' },
                          { id: 'review', value: rollup.submitted, color: 'var(--chart-s3)' },
                        ]}
                      />
                    </div>
                  )}
                </section>
              )}

              {rollup ? (
                <section className="surface-paper overflow-hidden" aria-label={t('rollup.table.aria')}>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th scope="col">{t('rollup.table.entity')}</th>
                          <th scope="col" className="num hidden md:table-cell">
                            {t('rollup.table.reported')}
                          </th>
                          <th scope="col" className="num">
                            {t('rollup.table.consolidated')}
                          </th>
                          <th scope="col" className="num hidden md:table-cell">
                            {t('rollup.table.share')}
                          </th>
                          <th scope="col" className="w-[150px] hidden sm:table-cell">
                            {t('rollup.table.approval')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <RollupRows
                          node={rollup}
                          root={rollup}
                          depth={0}
                          expanded={expanded}
                          onToggle={(id) =>
                            setExpanded((prev) => {
                              const next = new Set(prev)
                              if (next.has(id)) next.delete(id)
                              else next.add(id)
                              return next
                            })
                          }
                        />
                      </tbody>
                    </table>
                  </div>
                  <p className="px-4 py-3 border-t border-[var(--border-subtle)] text-caption text-[var(--text-tertiary)]">{t('rollup.table.footnote')}</p>
                </section>
              ) : (
                <div className="surface-paper">
                  <EmptyState art="noData" title={t('rollup.pickQuestion')} body={t('rollup.pickHint')} />
                </div>
              )}

              {fullyApproved && (
                <section className="surface-paper p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[var(--status-success)] flex-shrink-0 mt-0.5" aria-hidden />
                    <div>
                      <div className="text-small font-semibold text-[var(--text-primary)]">{t('rollup.fullyApproved.title')}</div>
                      <div className="text-caption text-[var(--text-secondary)] mt-0.5">{t('rollup.fullyApproved.body')}</div>
                    </div>
                  </div>
                  <Button variant="primary" icon={<FileOutput className="w-4 h-4" />} onClick={() => navigate('/reports')}>
                    {t('rollup.fullyApproved.cta')}
                  </Button>
                </section>
              )}
            </div>
          </div>
        </div>
      </StateBoundary>
    </div>
  )
}

function RollupRows({
  node,
  root,
  depth,
  expanded,
  onToggle,
}: {
  node: RollupNode
  root: RollupNode
  depth: number
  expanded: Set<string>
  onToggle: (id: string) => void
}) {
  const { t } = useTranslation()
  const f = useFmt()
  const isRoot = depth === 0
  const isOpen = expanded.has(node.entity.id)
  const Icon = TYPE_ICON[node.entity.type] ?? Building2
  const hasChildren = node.children.length > 0
  const share = node.cumulative != null && root.cumulative ? (node.cumulative / root.cumulative) * 100 : null
  const progressTone = node.assigned > 0 && node.approved === node.assigned ? 'var(--chart-s1)' : 'var(--chart-s3)'

  return (
    <>
      <tr className={isRoot ? 'bg-[var(--bg-secondary)]' : undefined}>
        <td>
          <div className="flex items-center gap-2 min-w-0" style={{ paddingLeft: depth * 16 }}>
            {hasChildren ? (
              <button
                type="button"
                onClick={() => onToggle(node.entity.id)}
                aria-expanded={isOpen}
                aria-label={t(isOpen ? 'rollup.table.collapse' : 'rollup.table.expand', { name: node.entity.name })}
                className="w-7 h-7 -ml-1 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] flex-shrink-0"
              >
                <ChevronRight className={`w-4 h-4 transition-transform duration-fast ease-out ${isOpen ? 'rotate-90' : ''}`} />
              </button>
            ) : (
              <span className="w-7 -ml-1 flex-shrink-0" aria-hidden />
            )}
            <span
              className={`w-7 h-7 rounded-[var(--radius-sm)] hidden sm:flex items-center justify-center flex-shrink-0 ${
                isRoot ? 'bg-[var(--color-brand-strong)] text-[var(--btn-primary-fg)]' : 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
              }`}
              aria-hidden
            >
              <Icon className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <div className={`text-small break-words ${isRoot ? 'font-semibold text-[var(--text-primary)]' : 'font-medium text-[var(--text-primary)]'}`}>{node.entity.name}</div>
              <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-caption text-[var(--text-tertiary)]">
                <span className="whitespace-nowrap">{t(`rollup.entityType.${node.entity.type}`, { defaultValue: node.entity.type.replace('_', ' ') })}</span>
                {node.entity.equity != null && node.entity.equity < 100 && (
                  <StatusPill tone="warning" size="sm">
                    {t('rollup.equity', { equity: node.entity.equity })}
                  </StatusPill>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="num hidden md:table-cell">{node.plantValue != null ? f.exact(node.plantValue) : <span className="text-[var(--text-quaternary)]">—</span>}</td>
        <td className={`num ${isRoot ? 'font-semibold !text-[var(--text-primary)]' : '!text-[var(--text-primary)]'}`}>
          {node.cumulative != null ? (
            <>
              {f.exact(node.cumulative)}
              {node.unit && <span className="hidden sm:inline ml-1 text-caption text-[var(--text-tertiary)] font-normal">{f.unit(node.unit)}</span>}
            </>
          ) : (
            <span className="text-caption text-[var(--text-tertiary)] whitespace-nowrap">{t('rollup.noData')}</span>
          )}
        </td>
        <td className="num hidden md:table-cell text-caption">{share != null ? f.percent(share, { precision: 1 }) : '—'}</td>
        <td className="hidden sm:table-cell">
          {node.assigned > 0 ? (
            <div className="flex items-center gap-2">
              <SplitBar className="flex-1 min-w-[56px]" height={6} total={node.assigned} segments={[{ id: 'a', value: node.approved, color: progressTone }]} />
              <span className="text-caption font-semibold tabular-nums text-[var(--text-secondary)] whitespace-nowrap">
                {f.number(node.approved)}/{f.number(node.assigned)}
              </span>
            </div>
          ) : (
            <span className="text-caption text-[var(--text-quaternary)]">{t('rollup.table.notAssigned')}</span>
          )}
        </td>
      </tr>
      {isOpen &&
        node.children.map((c) => <RollupRows key={c.entity.id} node={c} root={root} depth={depth + 1} expanded={expanded} onToggle={onToggle} />)}
    </>
  )
}
