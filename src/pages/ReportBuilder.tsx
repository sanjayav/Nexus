import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Download, Bold, Italic, Link2,
  MessageSquare, History, Database, ExternalLink,
  CheckCircle, Search, Save, Settings, Globe, Check, FileCode2, Landmark,
  AlignLeft, AlignCenter, AlignRight, PenTool, Hash, AlertTriangle, Layers, Minus, Plus, ChevronDown, X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { useLanguage } from '../contexts/LanguageContext'
import { fmt, resolveStrings, useFormat, useStrings } from '../i18n'
import { reportBuilderStrings, reportDocCopy, type DocLang } from '../i18n/pages/reportBuilder'
import { moduleCatalogStrings, moduleIdOf, useFrameworkLabels } from '../i18n/pages/moduleCatalog'
import { useL10n, useMockData, useMoney, useWorkspace } from '../workspace/WorkspaceContext'
import type { L10n, Region } from '../workspace/regions'
import { Button, Badge, Tabs, EmptyState } from '../components/ui'
import { useToast } from '../components/useToast'

const SECTION_IDS = ['sec-0', 'sec-1', 'sec-2', 'sec-3', 'sec-4', 'sec-5'] as const
const DOC_LANGUAGES: Record<Region, DocLang[]> = { global: ['en', 'ar', 'zh'], cn: ['zh', 'en'] }
const FONTS = ['serif', 'sans'] as const

/** Frameworks with a published XBRL taxonomy (prefix used for concept tags). */
const XBRL_PREFIX: Record<string, string> = {
  GRI: 'gri',
  'IFRS-S1': 'ifrs-sds',
  'IFRS-S2': 'ifrs-sds',
  'CSRD-ESRS': 'esrs',
  'BRSR-Core': 'in-brsr',
}
/** Frameworks filed through a stock exchange's own disclosure format. */
const EXCHANGE_FRAMEWORKS = ['CN-SSE', 'HKEX-ESG', 'MSX', 'BRSR-Core']
/** Disclosure reference shown before the Scope 1 sub-heading, where one is well-defined. */
const SCOPE1_REF: Record<string, string> = { GRI: 'GRI 305-1 ', 'IFRS-S2': 'IFRS S2 29(a) ' }
/** Illustrative green capex per region, in the workspace currency. */
const GREEN_CAPEX: Record<Region, number> = { global: 42_500_000, cn: 318_000_000 }

type Pane = 'left' | 'doc' | 'right'
type Comment = { id: string; author: string; initials: string; body: string; time: string; mine?: boolean }

export default function ReportBuilder() {
  const { workspace } = useWorkspace()
  return <ReportBuilderView key={workspace.id} />
}

function ReportBuilderView() {
  const s = useStrings(reportBuilderStrings)
  const f = useFormat()
  const fw = useFrameworkLabels()
  const l10n = useL10n()
  const money = useMoney()
  const navigate = useNavigate()
  const { locale } = useLanguage()
  const { workspace, region } = useWorkspace()
  const mockData = useMockData()
  const { toast, show } = useToast()

  const moduleTitle = useMemo(() => new Map(mockData.modules.map(m => [m.id, m.title])), [mockData.modules])
  const tenantModules = useMemo(() => new Set(mockData.modules.map(m => m.id)), [mockData.modules])
  const docLanguages = DOC_LANGUAGES[region.id]

  // ── Report setup (framework, references) ──
  const [primary, setPrimary] = useState(() => region.frameworks.find(id => tenantModules.has(id)) ?? region.frameworks[0] ?? 'GRI')
  const [references, setReferences] = useState<string[]>(() => region.frameworks.filter(id => tenantModules.has(id)))
  const [setupOpen, setSetupOpen] = useState(false)
  const allFrameworks = [primary, ...references.filter(r => r !== primary)]
  const xbrlCapable = primary in XBRL_PREFIX
  const exchangeFormat = EXCHANGE_FRAMEWORKS.includes(primary)
  const formats = ['pdf', ...(exchangeFormat ? ['exchange'] : []), ...(xbrlCapable ? ['xbrl'] : [])]
  const filingTarget = s.filingTargets[primary] ?? s.filingTargetFallback

  // ── Editor state ──
  const [leftTab, setLeftTab] = useState<'outline' | 'data'>('data')
  const [rightTab, setRightTab] = useState<'tags' | 'comments'>('tags')
  const [documentLanguage, setDocumentLanguage] = useState<DocLang>(() => {
    const preferred: DocLang = locale === 'zh' ? 'zh' : 'en'
    return docLanguages.includes(preferred) ? preferred : docLanguages[0]
  })
  const [mobilePane, setMobilePane] = useState<Pane>('doc')
  const [zoomLevel, setZoomLevel] = useState(100)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState<string>('sec-0')
  const [activeVar, setActiveVar] = useState('var-1')
  const [editing, setEditing] = useState(false)
  const [font, setFont] = useState<(typeof FONTS)[number]>('serif')
  const [formatState, setFormatState] = useState({ bold: false, italic: false, align: 'left' })

  // ── Review comments ──
  const reviewer = s.reviewer[region.id] ?? s.reviewer.global
  const [comments, setComments] = useState<Comment[]>(() => [
    { id: 'c1', author: reviewer.name, initials: reviewer.initials, body: s.commentBody, time: fmt(s.commentTime, { count: 2 }) },
  ])
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState('')

  // ── Tenant data ──
  const trends = mockData.ghgTrends
  const last = trends[trends.length - 1]
  const prev = trends.length > 1 ? trends[trends.length - 2] : undefined
  const pctChange = (a: number, b?: number) => (b ? ((a - b) / b) * 100 : 0)
  const scope1 = mockData.ghg.scope1
  const scope2 = mockData.ghg.scope2Market
  const capex = GREEN_CAPEX[region.id]

  const variables = [
    { id: 'var-1', value: f.number(scope1.value), unit: scope1.unit, source: 'ERP Sync', tag: 'GrossScope1GHGEmissions' },
    { id: 'var-2', value: f.number(scope2.value), unit: scope2.unit, source: 'ERP Sync', tag: 'GrossScope2GHGEmissionsMarketBased' },
    { id: 'var-3', value: f.number(mockData.scope3.total), unit: 'tCO₂e', source: 'Manual Entry', tag: 'GrossScope3GHGEmissions' },
    { id: 'var-4', value: f.number(last?.intensity ?? 0, { maximumFractionDigits: 2 }), unit: region.id === 'cn' ? s.intensityUnitCn : fmt(s.intensityUnit, { currency: region.currency }), source: 'Calculation', tag: 'GHGEmissionsIntensity' },
    { id: 'var-5', value: money.compact(capex), unit: '', source: 'Finance', tag: 'GreenCapitalExpenditure' },
  ]
  const selectedVar = variables.find(v => v.id === activeVar) ?? variables[0]
  const conceptTag = xbrlCapable ? `${XBRL_PREFIX[primary]}:${selectedVar.tag}` : `${primary}.${selectedVar.tag}`

  const q = searchQuery.trim().toLowerCase()
  const filteredVars = variables.filter(v => !q || (s.vars[v.id] ?? '').toLowerCase().includes(q) || v.value.toLowerCase().includes(q) || v.tag.toLowerCase().includes(q))

  // ── Document-language helpers (independent of UI language) ──
  const d = reportDocCopy[documentLanguage]
  const rtl = documentLanguage === 'ar'
  const docText = (t: L10n) => (documentLanguage === 'zh' ? t.zh : t.en)
  const docIntl = documentLanguage === 'zh' ? 'zh-CN' : 'en-GB'
  const dnum = (n: number, digits = 1) => new Intl.NumberFormat(docIntl, { maximumFractionDigits: digits }).format(n)
  const dpct = (n: number) => new Intl.NumberFormat(docIntl, { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(n / 100)
  const dmoney = (n: number) =>
    new Intl.NumberFormat(docIntl, { style: 'currency', currency: region.currency, notation: 'compact', maximumFractionDigits: 1 }).format(n)
  const docCatalog = resolveStrings(moduleCatalogStrings, documentLanguage === 'zh' ? 'zh' : 'en')
  const docFw = (id: string) => docCatalog.short[moduleIdOf(id)] ?? docCatalog.titles[moduleIdOf(id)] ?? moduleTitle.get(id) ?? id
  const docOrg = docText(workspace.name)
  const docVars = {
    org: docOrg,
    fy: workspace.reportingYear,
    industry: docText(workspace.industry),
    listing: docText(workspace.listing),
    frameworks: allFrameworks.map(docFw).join(d.listSep),
    chain: docText(region.chain.network),
  }
  const yearLabel = (y?: string) => (y ? fmt(d.thYear, { year: y }) : '')

  // ── Exports ──
  const fileBase = `${workspace.name.en.replace(/[^A-Za-z0-9]+/g, '_')}_${workspace.reportingYear}`
  const download = (content: string, type: string, filename: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    show(fmt(s.exported, { file: filename }))
  }
  const reportHeader = () =>
    [
      `${docOrg} – ${workspace.reportingYear} ${d.kicker}`,
      `${d.coverListing}: ${docVars.listing}`,
      `${d.preparedWith}: ${docVars.frameworks}`,
      '',
      `${d.rowScope1}: ${dnum(scope1.value)} ${scope1.unit}`,
      `${d.rowScope3}: ${dnum(mockData.scope3.total)} tCO₂e`,
    ].join('\n')

  const handleExport = () => download(`${reportHeader()}\n\n[…]`, 'text/plain', `${fileBase}_${documentLanguage.toUpperCase()}.txt`)
  const handleExchangeExport = () =>
    download(`${reportHeader()}\n${s.filingTarget}: ${filingTarget}\n\n[…]`, 'text/plain', `${fileBase}_${primary}_${documentLanguage.toUpperCase()}.txt`)
  const handleXbrlExport = () => {
    const prefix = XBRL_PREFIX[primary]
    const ctx = workspace.reportingYear
    const xbrl = `<?xml version="1.0" encoding="UTF-8"?>
<xbrl xmlns="http://www.xbrl.org/2003/instance">
  <!-- ${workspace.name.en} · ${fw.title(primary, moduleTitle.get(primary))} -->
  <context id="${ctx}"/>
  <unit id="tCO2e"/>
  <${prefix}:GrossScope1GHGEmissions contextRef="${ctx}" unitRef="tCO2e" decimals="0">${scope1.value}</${prefix}:GrossScope1GHGEmissions>
  <${prefix}:GrossScope2GHGEmissionsMarketBased contextRef="${ctx}" unitRef="tCO2e" decimals="0">${scope2.value}</${prefix}:GrossScope2GHGEmissionsMarketBased>
</xbrl>`
    download(xbrl, 'application/xml', `${fileBase}_${primary}.xbrl`)
  }

  const selectVar = (id: string) => {
    setActiveVar(id)
    setRightTab('tags')
  }

  const dataChip = (id: string, children: ReactNode) => (
    <button
      type="button"
      contentEditable={false}
      onClick={() => selectVar(id)}
      title={fmt(s.insertVar, { name: s.vars[id] ?? id })}
      dir="ltr"
      className={clsx(
        'inline-flex items-center gap-1 border px-1.5 py-0.5 rounded mx-1 font-sans font-bold transition-colors relative',
        activeVar === id ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100',
      )}
    >
      {children}
      {activeVar === id && <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm" />}
    </button>
  )

  const h1 = (children: ReactNode) => (
    <h1 className="text-2xl sm:text-3xl font-bold mb-8 font-sans border-b-2 border-zinc-900 pb-4">{children}</h1>
  )

  const intensityChange = pctChange(last?.intensity ?? 0, prev?.intensity)
  const scope1Change = pctChange(last?.scope1 ?? scope1.value, prev?.scope1)
  const alignStart = 'text-start'
  const alignEnd = 'text-end'

  return (
    <div className="flex flex-col min-h-full lg:h-[calc(100dvh-3.5rem)] lg:min-h-0 bg-canvas lg:overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="bg-white border-b border-line px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-[15px] font-semibold text-zinc-900 truncate">
              {fmt(s.reportTitle, { org: l10n(workspace.name), fy: workspace.reportingYear })}
            </h1>
            <Badge tone="success" dot>{s.draft}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 mt-1">
            <span className="inline-flex items-center gap-1.5"><Save className="w-3 h-3" /> {s.autosaved}</span>
            <span className="inline-flex items-center gap-1.5"><Landmark className="w-3 h-3" /> {fw.short(primary, moduleTitle.get(primary))}</span>
          </div>
        </div>

        {/* Formatting tools */}
        <div className="hidden xl:flex items-center gap-1 p-1 bg-zinc-100 rounded-[10px] border border-line">
          <select
            aria-label={s.font}
            value={font}
            onChange={e => setFont(e.target.value as (typeof FONTS)[number])}
            className="h-7 bg-white border border-line rounded-md text-xs font-medium px-2 focus:outline-none"
          >
            {FONTS.map(fo => <option key={fo} value={fo}>{s.fonts[fo]}</option>)}
          </select>
          <span className="w-px h-5 bg-zinc-200 mx-1" />
          <ToolButton icon={Bold} label={s.bold} active={formatState.bold} onClick={() => setFormatState(st => ({ ...st, bold: !st.bold }))} />
          <ToolButton icon={Italic} label={s.italic} active={formatState.italic} onClick={() => setFormatState(st => ({ ...st, italic: !st.italic }))} />
          <span className="w-px h-5 bg-zinc-200 mx-1" />
          <ToolButton icon={AlignLeft} label={s.alignLeft} active={formatState.align === 'left'} onClick={() => setFormatState(st => ({ ...st, align: 'left' }))} />
          <ToolButton icon={AlignCenter} label={s.alignCenter} active={formatState.align === 'center'} onClick={() => setFormatState(st => ({ ...st, align: 'center' }))} />
          <ToolButton icon={AlignRight} label={s.alignRight} active={formatState.align === 'right'} onClick={() => setFormatState(st => ({ ...st, align: 'right' }))} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Globe className="w-4 h-4 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              aria-label={s.docLanguage}
              title={s.docLanguage}
              className="h-8 pl-8 pr-7 rounded-lg bg-white border border-line text-[13px] font-medium text-zinc-800 shadow-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/25"
              value={documentLanguage}
              onChange={e => setDocumentLanguage(e.target.value as DocLang)}
            >
              {docLanguages.map(l => <option key={l} value={l}>{s.languages[l]}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <Button size="sm" variant={setupOpen ? 'primary' : 'ghost'} icon={Settings} aria-expanded={setupOpen} onClick={() => setSetupOpen(o => !o)}>
            {s.setup}
          </Button>
          {exchangeFormat && (
            <Button size="sm" variant="secondary" icon={FileCode2} onClick={handleExchangeExport} title={s.exportExchangeTitle}>{s.exportExchange}</Button>
          )}
          {xbrlCapable && (
            <Button size="sm" variant="secondary" icon={Hash} onClick={handleXbrlExport} title={s.exportXbrlTitle}>{s.exportXbrl}</Button>
          )}
          <Button size="sm" variant="primary" icon={Download} onClick={handleExport} title={s.exportPdfTitle}>{s.exportPdf}</Button>
        </div>
      </div>

      {/* ── Report setup ── */}
      {setupOpen && (
        <div className="bg-white border-b border-line px-4 sm:px-6 py-4 shrink-0 animate-fade-up">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">{s.setupTitle}</h2>
              <p className="text-[13px] text-zinc-500 mt-0.5">{s.setupDesc}</p>
            </div>
            <button type="button" aria-label={s.cancel} onClick={() => setSetupOpen(false)} className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            <div>
              <label htmlFor="rb-primary" className="block text-[13px] font-medium text-zinc-700 mb-1.5">{s.primaryFramework}</label>
              <select
                id="rb-primary"
                value={primary}
                onChange={e => setPrimary(e.target.value)}
                className="w-full h-9 px-3 rounded-[10px] bg-white border border-line text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/25"
              >
                {region.frameworks.map(id => <option key={id} value={id}>{fw.title(id, moduleTitle.get(id))}</option>)}
              </select>
            </div>
            <div className="xl:col-span-1">
              <div className="text-[13px] font-medium text-zinc-700 mb-1.5">{s.alsoReference}</div>
              <div className="flex flex-wrap gap-1.5">
                {region.frameworks.filter(id => id !== primary).map(id => {
                  const on = references.includes(id)
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setReferences(r => (on ? r.filter(x => x !== id) : [...r, id]))}
                      className={clsx(
                        'h-7 px-2.5 rounded-lg text-xs font-medium border inline-flex items-center gap-1 transition-colors',
                        on ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-line hover:bg-zinc-50',
                      )}
                    >
                      {on && <Check className="w-3 h-3" />}
                      {fw.short(id, moduleTitle.get(id))}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <div className="text-[13px] font-medium text-zinc-700 mb-1.5">{s.outputFormats}</div>
              <ul className="space-y-1">
                {formats.map(fo => (
                  <li key={fo} className="flex items-center gap-2 text-[13px] text-zinc-700">
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> {s.formats[fo]}
                  </li>
                ))}
              </ul>
              {!xbrlCapable && (
                <p className="text-xs text-zinc-500 mt-2 leading-relaxed">{fmt(s.xbrlNotUsed, { fw: fw.short(primary, moduleTitle.get(primary)) })}</p>
              )}
            </div>
            <div>
              <div className="text-[13px] font-medium text-zinc-700 mb-1.5">{s.filingTarget}</div>
              <p className="text-[13px] text-zinc-900">{filingTarget}</p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile pane switcher */}
      <div className="lg:hidden px-4 sm:px-6 pt-4">
        <Tabs<Pane>
          value={mobilePane}
          onChange={setMobilePane}
          items={[
            { value: 'doc', label: s.panes.doc },
            { value: 'left', label: s.panes.left },
            { value: 'right', label: s.panes.right },
          ]}
        />
      </div>

      {/* ── Three-pane interface ── */}
      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden min-h-0">

        {/* Left: outline & data variables */}
        <aside className={clsx('lg:w-72 bg-white lg:border-r border-line flex-col shrink-0 lg:flex', mobilePane === 'left' ? 'flex m-4 sm:mx-6 lg:m-0 border lg:border-y-0 lg:border-l-0 rounded-card lg:rounded-none' : 'hidden')}>
          <div className="p-3 border-b border-line shrink-0">
            <Tabs<'outline' | 'data'>
              value={leftTab}
              onChange={setLeftTab}
              items={[
                { value: 'outline', label: <><FileText className="w-3.5 h-3.5" />{s.outline}</> },
                { value: 'data', label: <><Database className="w-3.5 h-3.5" />{s.variables}</> },
              ]}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {leftTab === 'outline' && (
              <nav className="space-y-0.5">
                {SECTION_IDS.map(id => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setActiveSection(id); setMobilePane('doc') }}
                    aria-current={id === activeSection ? 'true' : undefined}
                    className={clsx(
                      'w-full text-left px-3 py-2 rounded-lg text-[13px] transition-colors flex items-center gap-2.5 group',
                      id === activeSection ? 'bg-zinc-100 text-zinc-900 font-medium' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
                    )}
                  >
                    <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0 transition-colors', id === activeSection ? 'bg-emerald-500' : 'bg-transparent group-hover:bg-zinc-300')} />
                    {s.sections[id]}
                  </button>
                ))}
              </nav>
            )}
            {leftTab === 'data' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={s.searchPlaceholder}
                    aria-label={s.searchPlaceholder}
                    className="w-full h-8 bg-white border border-line rounded-lg pl-8 pr-3 text-[13px] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500/60"
                  />
                </div>
                <p className="text-xs font-medium text-zinc-500 px-1 pt-1">{fmt(s.linkedData, { fw: fw.short(primary, moduleTitle.get(primary)) })}</p>
                {filteredVars.length === 0 ? (
                  <EmptyState icon={Search} title={s.noMatches} description={s.noMatchesBody} />
                ) : (
                  <div className="space-y-2">
                    {filteredVars.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        aria-pressed={activeVar === v.id}
                        onClick={() => selectVar(v.id)}
                        className={clsx(
                          'w-full text-left bg-white border rounded-xl p-3 hover:shadow-card transition-[box-shadow,border-color]',
                          activeVar === v.id ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-line hover:border-zinc-300',
                        )}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1.5">
                          <span className="text-[13px] font-medium text-zinc-900">{s.vars[v.id]}</span>
                          <span className="text-[11px] font-medium text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded whitespace-nowrap">{s.sources[v.source] ?? v.source}</span>
                        </div>
                        <div className="text-sm font-semibold text-zinc-900 tabular">
                          {v.value} {v.unit && <span className="text-xs font-normal text-zinc-500">{v.unit}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Center: document canvas */}
        <div className={clsx('flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex-col items-center min-w-0 lg:flex', mobilePane === 'doc' ? 'flex' : 'hidden')}>

          {editing && (
            <p className="w-full max-w-[850px] mb-3 text-xs text-sky-800 bg-sky-50 ring-1 ring-inset ring-sky-200/70 rounded-lg px-3 py-2">{s.editing}</p>
          )}

          {/* The "A4 paper" editor space */}
          <div
            className={clsx(
              'w-full max-w-[850px] min-h-[600px] lg:min-h-[1100px] bg-white border shadow-card rounded-md p-5 sm:p-10 2xl:p-[1in] text-zinc-900 relative group outline-none transition-transform duration-300 origin-top flex-shrink-0',
              font === 'serif' ? 'font-serif' : 'font-sans',
              editing ? 'border-sky-300 ring-2 ring-sky-200/60' : 'border-line',
              formatState.bold && 'font-bold',
              formatState.italic && 'italic',
              formatState.align === 'left' && 'text-start',
              formatState.align === 'center' && 'text-center',
              formatState.align === 'right' && 'text-end',
            )}
            style={{ transform: `scale(${zoomLevel / 100})`, marginBottom: `${Math.max(0, (zoomLevel / 100 - 1) * 1100)}px` }}
            contentEditable={editing}
            suppressContentEditableWarning
            dir={rtl ? 'rtl' : 'ltr'}
            lang={documentLanguage === 'zh' ? 'zh-CN' : documentLanguage}
          >

            <div className={clsx('absolute top-4 transition-opacity', rtl ? 'left-4' : 'right-4', editing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100')}>
              <button
                type="button"
                contentEditable={false}
                aria-label={s.editBlock}
                title={s.editBlock}
                aria-pressed={editing}
                onClick={() => setEditing(e => !e)}
                className={clsx('p-2 rounded-lg', editing ? 'bg-sky-100 text-sky-800' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900')}
              >
                <PenTool className="w-4 h-4" />
              </button>
            </div>

            {activeSection === 'sec-0' && (
              <div className="min-h-[520px] lg:min-h-[900px] flex flex-col">
                <div className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{d.kicker}</div>
                <h1 className="mt-6 text-3xl sm:text-5xl font-bold leading-tight">{docOrg}</h1>
                <p className="mt-4 text-xl sm:text-2xl text-zinc-600">{workspace.reportingYear}</p>
                <div className="mt-auto pt-16 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5 font-sans text-sm border-t-2 border-zinc-900">
                  <CoverItem label={d.coverListing} value={docVars.listing} />
                  <CoverItem label={d.coverYear} value={workspace.reportingYear} />
                  <CoverItem label={d.coverIndustry} value={docVars.industry} />
                  <CoverItem label={d.coverCurrency} value={region.currency} />
                  <div className="sm:col-span-2">
                    <CoverItem label={d.preparedWith} value={docVars.frameworks} />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'sec-1' && (
              <div>
                {h1(d.h[0])}
                <p className="text-[15px] leading-relaxed mb-4">{fmt(d.s1Body, docVars)}</p>
                <div className="border border-black/10 rounded-xl p-6 bg-black/[0.02] mt-8">
                  <h3 className="font-bold mb-2">{d.highlights}</h3>
                  <ul className={clsx('list-disc space-y-2 text-sm text-black/80', rtl ? 'pr-5' : 'pl-5')}>
                    {prev && last && <li>{fmt(d.hlIntensity, { pct: dpct(intensityChange), prev: yearLabel(prev.year) })}</li>}
                    <li>{fmt(d.hlEmissions, { total: dnum(scope1.value + scope2.value, 0) })}</li>
                    <li>{fmt(d.hlInvestment, { capex: dmoney(capex) })}</li>
                    <li>{fmt(d.hlFrameworks, docVars)}</li>
                  </ul>
                </div>
              </div>
            )}

            {activeSection === 'sec-2' && (
              <div>
                {h1(d.h[1])}
                <p className="text-[15px] leading-relaxed mb-4">{fmt(d.s2Body, docVars)}</p>
              </div>
            )}

            {activeSection === 'sec-3' && (
              <div>
                {h1(d.h[2])}
                <h2 className="text-xl font-bold mb-4 font-sans text-black/80">{fmt(d.s3Sub, { ref: SCOPE1_REF[primary] ?? '' })}</h2>
                <p className="text-[15px] leading-relaxed mb-4">
                  {fmt(d.s3P1, { year: last?.year ?? workspace.reportingYear })}
                  {dataChip('var-1', `${dnum(scope1.value)} ${scope1.unit}`)}
                  {documentLanguage === 'zh' ? '。' : '.'}
                </p>
                <p className="text-[15px] leading-relaxed mb-6">
                  {fmt(d.s3P2, {
                    change: dpct(scope1Change),
                    prev: yearLabel(prev?.year),
                    grid: `${dnum(region.gridFactor.value, 4)} ${region.gridFactor.unit}`,
                    source: docText(region.gridFactor.source),
                  })}
                </p>

                <div className="overflow-x-auto -mx-1 px-1">
                  <table className="w-full min-w-[480px] mt-4 mb-6 font-sans text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-black/80">
                        <th className={clsx('font-bold py-2 px-2', alignStart)}>{d.thCategory}</th>
                        <th className={clsx('font-bold py-2 px-2', alignEnd)}>{yearLabel(last?.year)}</th>
                        <th className={clsx('font-bold py-2 px-2', alignEnd)}>{yearLabel(prev?.year)}</th>
                        <th className="text-center font-bold py-2 px-2">{d.thAssurance}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-black/10">
                        <td className="py-2 px-2">{d.rowScope1}</td>
                        <td className={clsx('font-bold text-emerald-700 bg-emerald-50/60 px-2 py-2 border-x border-emerald-100 tabular', alignEnd)}>
                          <span dir="ltr">{dnum(last?.scope1 ?? scope1.value)}</span>
                        </td>
                        <td className={clsx('px-2 py-2 tabular', alignEnd)}><span dir="ltr">{prev ? dnum(prev.scope1) : d.na}</span></td>
                        <td className="text-center px-2 py-2"><CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                      </tr>
                      <tr className="border-b border-black/10 bg-black/[0.02]">
                        <td className="py-2 px-2">{d.rowScope2}</td>
                        <td className={clsx('font-bold text-emerald-700 bg-emerald-50/60 px-2 py-2 border-x border-emerald-100 tabular', alignEnd)}>
                          <span dir="ltr">{dnum(last?.scope2 ?? mockData.ghg.scope2Location.value)}</span>
                        </td>
                        <td className={clsx('px-2 py-2 tabular', alignEnd)}><span dir="ltr">{prev ? dnum(prev.scope2) : d.na}</span></td>
                        <td className="text-center px-2 py-2"><CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                      </tr>
                      <tr className="border-b border-black/10">
                        <td className="py-2 px-2">{d.rowScope3}</td>
                        <td className={clsx('font-bold px-2 py-2 tabular', alignEnd)}><span dir="ltr">{dnum(mockData.scope3.total)}</span></td>
                        <td className={clsx('px-2 py-2', alignEnd)}>{d.na}</td>
                        <td className="text-center px-2 py-2"><AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" /></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-black/50 italic font-sans">{d.footnote}</p>
              </div>
            )}

            {activeSection === 'sec-4' && (
              <div>
                {h1(d.h[3])}
                <p className="text-[15px] leading-relaxed mb-4">{fmt(d.s4Body, docVars)}</p>
              </div>
            )}

            {activeSection === 'sec-5' && (
              <div>
                {h1(d.h[4])}
                <p className="text-[15px] leading-relaxed mb-4">{fmt(d.s5Body, docVars)}</p>
              </div>
            )}

          </div>

          {/* Zoom controls */}
          <div className="sticky bottom-4 mt-6 bg-white border border-line shadow-pop rounded-full px-1.5 py-1 flex items-center gap-1 z-30">
            <button type="button" aria-label={s.zoomOut} title={s.zoomOut} disabled={zoomLevel <= 50} onClick={() => setZoomLevel(z => Math.max(50, z - 10))} className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-40">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-medium text-zinc-700 w-10 text-center tabular">{f.percent(zoomLevel)}</span>
            <button type="button" aria-label={s.zoomIn} title={s.zoomIn} disabled={zoomLevel >= 150} onClick={() => setZoomLevel(z => Math.min(150, z + 10))} className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-40">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: tags & reviews */}
        <aside className={clsx('lg:w-[340px] bg-white lg:border-l border-line flex-col shrink-0 lg:flex', mobilePane === 'right' ? 'flex m-4 sm:mx-6 lg:m-0 border lg:border-y-0 lg:border-r-0 rounded-card lg:rounded-none' : 'hidden')}>
          <div className="p-3 border-b border-line shrink-0">
            <Tabs<'tags' | 'comments'>
              value={rightTab}
              onChange={setRightTab}
              items={[
                { value: 'tags', label: <><Hash className="w-3.5 h-3.5" />{xbrlCapable ? s.xbrlTags : s.dataTags}</> },
                {
                  value: 'comments',
                  label: (
                    <>
                      <MessageSquare className="w-3.5 h-3.5" />
                      {s.reviews}
                      {comments.some(c => !c.mine) && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" role="img" aria-label={s.unread} />}
                    </>
                  ),
                },
              ]}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {rightTab === 'tags' && (
              <div className="space-y-6">
                {/* Selected variable */}
                <div className="rounded-xl border border-line p-4 shadow-card">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {s.activeSelection} · {s.vars[selectedVar.id]}
                  </div>
                  <div className="mt-1.5 text-lg font-semibold text-zinc-900 tabular">
                    {selectedVar.value} {selectedVar.unit && <span className="text-sm font-normal text-zinc-500">{selectedVar.unit}</span>}
                  </div>

                  <dl className="mt-4 space-y-3">
                    <div>
                      <dt className="text-xs font-medium text-zinc-500">{s.dataSource}</dt>
                      <dd className="text-[13px] font-medium text-zinc-900 flex items-center gap-2 mt-1">
                        <Database className="w-3.5 h-3.5 text-zinc-400" />
                        {selectedVar.source === 'ERP Sync' ? s.erpSource[region.id] ?? s.erpSource.global : s.sources[selectedVar.source] ?? selectedVar.source}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-zinc-500">{xbrlCapable ? s.conceptTag : s.dataPointId}</dt>
                      <dd className="text-[13px] font-mono bg-zinc-50 px-2 py-1 rounded-md mt-1 text-zinc-800 break-all select-all border border-line">
                        {conceptTag}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-zinc-500">{s.periodContext}</dt>
                      <dd className="text-[13px] font-medium text-zinc-900 mt-1">{workspace.reportingYear}</dd>
                    </div>
                  </dl>
                </div>

                {/* Evidence chain */}
                <div>
                  <h4 className="text-[13px] font-medium text-zinc-700 mb-2 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-zinc-400" /> {s.evidenceLineage}
                  </h4>
                  <button
                    type="button"
                    onClick={() => navigate('/evidence')}
                    className="w-full text-left bg-white border border-line rounded-xl p-4 hover:border-zinc-300 hover:shadow-card transition-[box-shadow,border-color] group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                          <Layers className="w-4 h-4 text-zinc-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-zinc-900 truncate">{`${selectedVar.tag}_${workspace.reportingYear}.csv`}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">{s.processedVia}</p>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-600 shrink-0" />
                    </div>
                    <div className="mt-3 pt-3 border-t border-line flex items-center justify-between text-xs text-zinc-500">
                      <span className="flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> {fmt(s.updatedDaysAgo, { count: 2 })}</span>
                      <span className="bg-zinc-100 px-1.5 py-0.5 rounded tabular">{fmt(s.versionLabel, { v: '1.4' })}</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {rightTab === 'comments' && (
              comments.length === 0 ? (
                <EmptyState icon={MessageSquare} title={s.noComments} description={s.noCommentsBody} />
              ) : (
                <div className="space-y-3">
                  {comments.map((c, i) => (
                    <div key={c.id} className="bg-white border border-line rounded-xl p-4 flex gap-3 animate-fade-up">
                      <div className={clsx(
                        'w-8 h-8 rounded-full ring-1 flex items-center justify-center text-xs font-semibold shrink-0',
                        c.mine ? 'bg-zinc-100 text-zinc-700 ring-zinc-200' : 'bg-rose-50 text-rose-700 ring-rose-200',
                      )}>
                        {c.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[13px] font-medium text-zinc-900">{c.author}</span>
                          <span className="text-xs text-zinc-400">{c.time}</span>
                        </div>
                        <p className="text-[13px] text-zinc-700 leading-relaxed">{c.body}</p>
                        {i === 0 && (
                          <div className="flex gap-1.5 mt-3">
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={CheckCircle}
                              onClick={() => {
                                setComments([])
                                setReplyOpen(false)
                                show(s.resolved)
                              }}
                            >
                              {s.resolve}
                            </Button>
                            <Button size="sm" variant="ghost" aria-expanded={replyOpen} onClick={() => setReplyOpen(o => !o)}>{s.reply}</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {replyOpen && (
                    <form
                      className="space-y-2 animate-fade-up"
                      onSubmit={e => {
                        e.preventDefault()
                        if (!replyText.trim()) return
                        setComments(cs => [...cs, { id: `r${cs.length}`, author: s.you, initials: s.you.slice(0, 2).toUpperCase(), body: replyText.trim(), time: s.justNow, mine: true }])
                        setReplyText('')
                        setReplyOpen(false)
                      }}
                    >
                      <textarea
                        autoFocus
                        rows={3}
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder={s.replyPlaceholder}
                        aria-label={s.reply}
                        className="w-full px-3 py-2 rounded-[10px] bg-white border border-line text-[13px] text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500/60 resize-none"
                      />
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => setReplyOpen(false)}>{s.cancel}</Button>
                        <Button size="sm" variant="primary" type="submit" disabled={!replyText.trim()}>{s.send}</Button>
                      </div>
                    </form>
                  )}
                </div>
              )
            )}
          </div>
        </aside>

      </div>
      {toast}
    </div>
  )
}

function CoverItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="pt-4">
      <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">{label}</div>
      <div className="mt-1 font-medium text-zinc-900">{value}</div>
    </div>
  )
}

function ToolButton({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={clsx(
        'w-7 h-7 rounded-md flex items-center justify-center transition-colors',
        active ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 hover:bg-white/60',
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}
