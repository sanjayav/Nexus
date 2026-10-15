import { useState } from 'react'
import {
  FileText, Download, Bold, Italic, Link2,
  MessageSquare, History, Database, ExternalLink,
  CheckCircle, Search, Save, Settings, Globe,
  AlignLeft, AlignCenter, AlignRight, PenTool, Hash, AlertTriangle, Layers, Minus, Plus, ChevronDown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { useLanguage } from '../contexts/LanguageContext'
import { fmt, useStrings } from '../i18n'
import { reportBuilderStrings } from '../i18n/pages/reportBuilder'
import { Button, Badge, Tabs, EmptyState } from '../components/ui'

const SECTION_IDS = ['sec-1', 'sec-2', 'sec-3', 'sec-4', 'sec-5'] as const
const DOC_LANGUAGES = ['en', 'ar', 'zh'] as const

const DATA_VARIABLES = [
  { id: 'var-1', name: 'Scope 1 Total', value: '14,204.5', unit: 'MT CO2e', source: 'ERP Sync' },
  { id: 'var-2', name: 'Scope 2 Total', value: '8,430.1', unit: 'MT CO2e', source: 'ERP Sync' },
  { id: 'var-3', name: 'Scope 3 Total', value: '42,900.0', unit: 'MT CO2e', source: 'Manual Entry' },
  { id: 'var-4', name: 'Energy Intensity', value: '1.45', unit: 'kWh/Rev', source: 'Calculation' },
]

type Pane = 'left' | 'doc' | 'right'

export default function ReportBuilder() {
  const s = useStrings(reportBuilderStrings)
  const { locale } = useLanguage()
  const [leftTab, setLeftTab] = useState<'outline' | 'data'>('data')
  const [rightTab, setRightTab] = useState<'xbrl' | 'comments'>('xbrl')
  const [documentLanguage, setDocumentLanguage] = useState<string>(locale === 'zh' ? 'zh' : 'en')
  const [mobilePane, setMobilePane] = useState<Pane>('doc')

  const [zoomLevel, setZoomLevel] = useState(100)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState('sec-3')
  const [formatState, setFormatState] = useState({ bold: false, italic: false, align: 'left' })

  const handleExport = () => {
    const reportContent = `Asyad Group - FY25 Sustainability Report (${documentLanguage.toUpperCase()})\n\nReport generated and verified by Nexus Platform.\nGate 3 Checks Passed. All assurances verified cryptographically.\n\n[Full Document Content Generated...]`
    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Sustainability_Report_FY25_${documentLanguage.toUpperCase()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleXbrlExport = () => {
    const xbrl = `<?xml version="1.0"?>\n<xbrl xmlns="http://www.xbrl.org/2003/instance">\n  <!-- Nexus XBRL/iXBRL export - SEC/ESRS ready -->\n  <context id="FY2025"/>\n  <unit id="tCO2e"/>\n  <sustainability:Scope1Emissions contextRef="FY2025" unitRef="tCO2e" decimals="0">12450</sustainability:Scope1Emissions>\n</xbrl>`
    const blob = new Blob([xbrl], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Sustainability_Report_FY25.xbrl'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const q = searchQuery.toLowerCase()
  const filteredVars = DATA_VARIABLES.filter(
    v => v.name.toLowerCase().includes(q) || (s.vars[v.id] ?? '').toLowerCase().includes(q) || v.value.includes(searchQuery),
  )

  return (
    <div className="flex flex-col min-h-full lg:h-[calc(100dvh-3.5rem)] lg:min-h-0 bg-canvas lg:overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="bg-white border-b border-line px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-[15px] font-semibold text-zinc-900 truncate border-b border-dashed border-zinc-300 hover:border-zinc-500 cursor-text transition-colors">
              {fmt(s.reportTitle, { org: 'Asyad Group', fy: 'FY25' })}
            </h1>
            <Badge tone="success" dot>{s.draft}</Badge>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
            <Save className="w-3 h-3" /> {s.autosaved}
          </div>
        </div>

        {/* Formatting tools */}
        <div className="hidden xl:flex items-center gap-1 p-1 bg-zinc-100 rounded-[10px] border border-line">
          <select aria-label={s.font} className="h-7 bg-white border border-line rounded-md text-xs font-medium px-2 focus:outline-none">
            <option>Inter</option>
            <option>Helvetica</option>
            <option>Georgia</option>
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
              onChange={e => setDocumentLanguage(e.target.value)}
            >
              {DOC_LANGUAGES.map(l => <option key={l} value={l}>{s.languages[l]}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <Button size="sm" variant="ghost" icon={Settings} className="hidden sm:inline-flex">{s.setup}</Button>
          <Button size="sm" variant="secondary" icon={Hash} onClick={handleXbrlExport} title={s.exportXbrlTitle}>{s.exportXbrl}</Button>
          <Button size="sm" variant="primary" icon={Download} onClick={handleExport} title={s.exportPdfTitle}>{s.exportPdf}</Button>
        </div>
      </div>

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
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={s.searchPlaceholder}
                    aria-label={s.searchPlaceholder}
                    className="w-full h-8 bg-white border border-line rounded-lg pl-8 pr-3 text-[13px] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500/60"
                  />
                </div>
                <p className="text-xs font-medium text-zinc-500 px-1 pt-1">{s.linkedData}</p>
                {filteredVars.length === 0 ? (
                  <EmptyState icon={Search} title={s.noMatches} description={s.noMatchesBody} />
                ) : (
                  <div className="space-y-2">
                    {filteredVars.map(v => (
                      <div key={v.id} className="bg-white border border-line rounded-xl p-3 hover:border-zinc-300 hover:shadow-card transition-[box-shadow,border-color] cursor-grab active:cursor-grabbing">
                        <div className="flex justify-between items-start gap-2 mb-1.5">
                          <span className="text-[13px] font-medium text-zinc-900">{s.vars[v.id] ?? v.name}</span>
                          <span className="text-[11px] font-medium text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded whitespace-nowrap">{s.sources[v.source] ?? v.source}</span>
                        </div>
                        <div className="text-sm font-semibold text-zinc-900 tabular">
                          {v.value} <span className="text-xs font-normal text-zinc-500">{v.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Center: document canvas */}
        <div className={clsx('flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex-col items-center min-w-0 lg:flex', mobilePane === 'doc' ? 'flex' : 'hidden')}>

          {/* The "A4 paper" editor space */}
          <div
            className={clsx(
              'w-full max-w-[850px] min-h-[600px] lg:min-h-[1100px] bg-white border border-line shadow-card rounded-md p-5 sm:p-10 2xl:p-[1in] font-serif text-zinc-900 relative group outline-none focus:outline-none transition-transform duration-300 origin-top flex-shrink-0',
              formatState.bold && 'font-bold',
              formatState.italic && 'italic',
              formatState.align === 'left' && 'text-left',
              formatState.align === 'center' && 'text-center',
              formatState.align === 'right' && 'text-right',
            )}
            style={{ transform: `scale(${zoomLevel / 100})`, marginBottom: `${Math.max(0, (zoomLevel / 100 - 1) * 1100)}px` }}
            contentEditable
            suppressContentEditableWarning
          >

            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button type="button" contentEditable={false} aria-label={s.editBlock} title={s.editBlock} className="p-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-500 hover:text-zinc-900"><PenTool className="w-4 h-4" /></button>
            </div>

            {activeSection === 'sec-1' && (
              <div dir={documentLanguage === 'ar' ? 'rtl' : 'ltr'} className={clsx(documentLanguage === 'ar' && "text-right")}>
                <h1 className="text-2xl sm:text-3xl font-bold mb-8 font-sans border-b-2 border-zinc-900 pb-4">
                  {documentLanguage === 'ar' ? '1. ملخص تنفيذي' : documentLanguage === 'zh' ? '1. 执行摘要' : '1. Executive Summary'}
                </h1>
                <p className="text-[15px] leading-relaxed mb-4">
                  {documentLanguage === 'ar' ? 'في هذه السنة المالية، واصلت مجموعة أسياد رحلتها نحو تحقيق التميز المستدام واللوجستيات الخضراء. تمثل هذه الوثيقة التزامنا المستمر بالشفافية وخلق القيمة للأطراف المعنية.' :
                    documentLanguage === 'zh' ? '本财年，Asyad 集团继续迈向卓越的可持续发展和绿色物流之旅。本文件代表了我们对透明度和为利益相关者创造价值的持续承诺。' :
                      'This fiscal year, Asyad Group continued its journey towards achieving sustainable excellence and green logistics. This document represents our ongoing commitment to transparency and stakeholder value creation.'}
                </p>
                <div className="border border-black/10 rounded-xl p-6 bg-black/[0.02] mt-8">
                  <h3 className="font-bold mb-2">{documentLanguage === 'ar' ? 'أبرز الإنجازات' : documentLanguage === 'zh' ? '主要亮点' : 'Key Highlights'}</h3>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-black/80">
                    <li>{documentLanguage === 'ar' ? 'تخفيض بنسبة 15% في كثافة الكربون العامة.' : documentLanguage === 'zh' ? '整体碳强度降低 15%。' : '15% reduction in overall carbon intensity.'}</li>
                    <li>{documentLanguage === 'ar' ? 'إطلاق 3 مبادرات مجتمعية جديدة في منطقة الدقم.' : documentLanguage === 'zh' ? '在 Duqm 地区启动了 3 项新的社区倡议。' : 'Launched 3 new community initiatives in the Duqm region.'}</li>
                    <li>{documentLanguage === 'ar' ? 'الامتثال الكامل لمعايير GRI و التوافق مع أهداف التنمية المستدامة.' : documentLanguage === 'zh' ? '完全符合 GRI 框架并与联合国可持续发展目标保持一致。' : 'Full compliance with GRI frameworks and UN SDG alignment.'}</li>
                  </ul>
                </div>
              </div>
            )}

            {activeSection === 'sec-2' && (
              <div dir={documentLanguage === 'ar' ? 'rtl' : 'ltr'} className={clsx(documentLanguage === 'ar' && "text-right")}>
                <h1 className="text-2xl sm:text-3xl font-bold mb-8 font-sans border-b-2 border-zinc-900 pb-4">
                  {documentLanguage === 'ar' ? '2. الإفصاحات العامة' : documentLanguage === 'zh' ? '2. 一般披露' : '2. General Disclosures'}
                </h1>
                <p className="text-[15px] leading-relaxed mb-4">
                  {documentLanguage === 'ar' ? 'مجموعة أسياد هي مزود عالمي رائد للخدمات اللوجستية المتكاملة، ومقرها في سلطنة عمان. وتشمل عملياتنا الموانئ والشبكات البحرية وخدمات الشحن. تتضمن استراتيجيتنا الاستدامة في العمليات الأساسية...' :
                    documentLanguage === 'zh' ? 'Asyad 集团是一家总部位于阿曼的全球领先综合物流供应商。我们的业务遍及港口、航运和地面配送。我们的战略将可持续性融入核心运营。' :
                      'Asyad Group is a leading global integrated logistics provider, headquartered in Oman. Our operations span across ports, maritime networks, and freight services. Our strategy embeds sustainability into core operations...'}
                </p>
              </div>
            )}

            {activeSection === 'sec-3' && documentLanguage === 'en' && (
              <>
                <h1 className="text-2xl sm:text-3xl font-bold mb-8 font-sans border-b-2 border-zinc-900 pb-4">3. Environmental Impact</h1>

                <h2 className="text-xl font-bold mb-4 font-sans text-black/80">305-1 Direct (Scope 1) GHG Emissions</h2>
                <p className="text-[15px] leading-relaxed mb-4">
                  Asyad Group is committed to full transparency regarding our direct environmental footprint. For the fiscal year ending 2024, our aggregate Scope 1 emissions, calculated using the operational control consolidation approach, resulted in a total of
                  <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded mx-1 font-sans font-bold cursor-pointer hover:bg-emerald-100 transition-colors group relative">
                    14,204.5 MT CO2e
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm" />
                  </span>
                  . This figure includes emissions from all directly owned and operated vessels, port machinery, and logistical ground fleets.
                </p>

                <p className="text-[15px] leading-relaxed mb-6">
                  The primary driver of the <span className="inline-flex bg-amber-500/10 text-amber-800 border border-amber-500/20 px-1 py-0.5 rounded font-sans font-semibold cursor-pointer text-sm">3.4% year-over-year increase</span> was the expansion of port operations in the Duqm economic zone. However, energy intensity per container handled has decreased to
                  <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded mx-1 font-sans font-bold cursor-pointer hover:bg-emerald-100 transition-colors">
                    1.45 kWh/Rev
                  </span>
                  , reflecting recent investments in hybrid crane technology.
                </p>
              </>
            )}

            {activeSection === 'sec-3' && documentLanguage === 'ar' && (
              <div dir="rtl">
                <h1 className="text-2xl sm:text-3xl font-bold mb-8 font-sans border-b-2 border-zinc-900 pb-4 text-right">3. التأثير البيئي</h1>

                <h2 className="text-xl font-bold mb-4 font-sans text-black/80 text-right">305-1 الانبعاثات المباشرة (النطاق 1) للغازات الدفيئة</h2>
                <p className="text-[15px] leading-relaxed mb-4">
                  تلتزم مجموعة أسياد بالشفافية الكاملة فيما يتعلق ببصمتنا البيئية المباشرة. للسنة المالية المنتهية في 2024، بناءً على نهج توحيد الرقابة التشغيلية، بلغ إجمالي انبعاثات النطاق 1
                  <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded mx-1 font-sans font-bold cursor-pointer hover:bg-emerald-100 transition-colors group relative" dir="ltr">
                    14,204.5 MT CO2e
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm" />
                  </span>
                  . ويشمل هذا الرقم الانبعاثات من جميع السفن المملوكة والمشغلة مباشرة، وآلات الموانئ، والأساطيل اللوجستية البرية.
                </p>

                <p className="text-[15px] leading-relaxed mb-6">
                  الدافع الرئيسي للـ <span className="inline-flex bg-amber-500/10 text-amber-800 border border-amber-500/20 px-1 py-0.5 rounded font-sans font-semibold cursor-pointer text-sm">زيادة بنسبة 3.4% على أساس سنوي</span> كان التوسع في عمليات الموانئ في منطقة الدقم الاقتصادية. ومع ذلك، انخفضت كثافة الطاقة لكل حاوية يتم التعامل معها إلى
                  <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded mx-1 font-sans font-bold cursor-pointer hover:bg-emerald-100 transition-colors" dir="ltr">
                    1.45 kWh/Rev
                  </span>
                  ، مما يعكس الاستثمارات الأخيرة في تكنولوجيا الرافعات الهجينة.
                </p>
              </div>
            )}

            {activeSection === 'sec-3' && documentLanguage === 'zh' && (
              <>
                <h1 className="text-2xl sm:text-3xl font-bold mb-8 font-sans border-b-2 border-zinc-900 pb-4">3. 环境影响</h1>

                <h2 className="text-xl font-bold mb-4 font-sans text-black/80">305-1 直接 (范围 1) 温室气体排放</h2>
                <p className="text-[15px] leading-relaxed mb-4">
                  Asyad 集团致力于完全透明地公布我们的直接环境足迹。截至 2024 财年，使用运营控制整合方法计算的范围 1 排放总量为
                  <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded mx-1 font-sans font-bold cursor-pointer hover:bg-emerald-100 transition-colors group relative">
                    14,204.5 MT CO2e
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm" />
                  </span>
                  。该数据包括所有直接拥有和运营的船机、港口机械和地面物流车队的排放。
                </p>

                <p className="text-[15px] leading-relaxed mb-6">
                  主要导致 <span className="inline-flex bg-amber-500/10 text-amber-800 border border-amber-500/20 px-1 py-0.5 rounded font-sans font-semibold cursor-pointer text-sm">同比增长 3.4%</span> 的原因是 Duqm 经济区港口业务的扩张。然而，处理每个集装箱的能源强度已降至
                  <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded mx-1 font-sans font-bold cursor-pointer hover:bg-emerald-100 transition-colors">
                    1.45 kWh/Rev
                  </span>
                  ，反映了近期在混合动力起重机技术上的投资。
                </p>
              </>
            )}

            {/* Data Table within Document */}
            {activeSection === 'sec-3' && (
              <>
                <table className={clsx("w-full mt-8 mb-6 font-sans text-sm border-collapse", documentLanguage === 'ar' && "text-right")} dir={documentLanguage === 'ar' ? "rtl" : "ltr"}>
                  <thead>
                    <tr className="border-b-2 border-black/80">
                      <th className={clsx("font-bold py-2 px-2", documentLanguage === 'ar' ? 'text-right' : 'text-left')}>{documentLanguage === 'ar' ? 'فئة الانبعاثات (GRI 305)' : documentLanguage === 'zh' ? '排放类别 (GRI 305)' : 'Emissions Category (GRI 305)'}</th>
                      <th className={clsx("font-bold py-2 px-2", documentLanguage === 'ar' ? 'text-left' : 'text-right')}>{documentLanguage === 'ar' ? 'السنة المالية 2024' : documentLanguage === 'zh' ? '2024财年' : 'FY 2024'}</th>
                      <th className={clsx("font-bold py-2 px-2", documentLanguage === 'ar' ? 'text-left' : 'text-right')}>{documentLanguage === 'ar' ? 'السنة المالية 2023' : documentLanguage === 'zh' ? '2023财年' : 'FY 2023'}</th>
                      <th className="text-center font-bold py-2 px-2">{documentLanguage === 'ar' ? 'الضمان' : documentLanguage === 'zh' ? '保证' : 'Assurance'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-black/10">
                      <td className="py-2 px-2">{documentLanguage === 'ar' ? 'النطاق 1 (مباشر)' : documentLanguage === 'zh' ? '范围 1 (直接)' : 'Scope 1 (Direct)'}</td>
                      <td className={clsx("font-bold text-emerald-700 bg-emerald-50/60 px-2 py-2 border-x border-emerald-100", documentLanguage === 'ar' ? 'text-left' : 'text-right')}>
                        <span dir="ltr">14,204.5</span>
                      </td>
                      <td className={clsx("px-2 py-2", documentLanguage === 'ar' ? 'text-left' : 'text-right')}><span dir="ltr">13,732.1</span></td>
                      <td className="text-center px-2 py-2"><CheckCircle className="w-4 h-4 text-black/30 mx-auto" /></td>
                    </tr>
                    <tr className="border-b border-black/10 bg-black/[0.02]">
                      <td className="py-2 px-2">{documentLanguage === 'ar' ? 'النطاق 2 (قائم على السوق)' : documentLanguage === 'zh' ? '范围 2 (基于市场)' : 'Scope 2 (Market-based)'}</td>
                      <td className={clsx("font-bold text-emerald-700 bg-emerald-50/60 px-2 py-2 border-x border-emerald-100", documentLanguage === 'ar' ? 'text-left' : 'text-right')}>
                        <span dir="ltr">8,430.1</span>
                      </td>
                      <td className={clsx("px-2 py-2", documentLanguage === 'ar' ? 'text-left' : 'text-right')}><span dir="ltr">8,901.0</span></td>
                      <td className="text-center px-2 py-2"><CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                    </tr>
                    <tr className="border-b border-black/10">
                      <td className="py-2 px-2">{documentLanguage === 'ar' ? 'النطاق 3 (سلسلة التوريد)' : documentLanguage === 'zh' ? '范围 3 (供应链)' : 'Scope 3 (Supply Chain)'}</td>
                      <td className={clsx("font-bold px-2 py-2", documentLanguage === 'ar' ? 'text-left' : 'text-right')}><span dir="ltr">42,900.0</span></td>
                      <td className={clsx("px-2 py-2", documentLanguage === 'ar' ? 'text-left' : 'text-right')}>
                        {documentLanguage === 'ar' ? 'غير متوفر*' : documentLanguage === 'zh' ? '不适用*' : 'N/A*'}
                      </td>
                      <td className="text-center px-2 py-2"><AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" /></td>
                    </tr>
                  </tbody>
                </table>

                <p className={clsx("text-xs text-black/50 italic font-sans", documentLanguage === 'ar' && "text-right")} dir={documentLanguage === 'ar' ? "rtl" : "ltr"}>
                  {documentLanguage === 'ar' ? '*تم توسيع حدود النطاق 3 في السنة المالية 2024 لتشمل النقل، وبالتالي لا توجد مقارنة مباشرة.' : documentLanguage === 'zh' ? '*2024 财年扩大了范围 3 的边界以包括下游运输，因此没有 2023 财年的直接可比数据。' : '*Scope 3 boundaries were expanded in FY2024 to include downstream transportation, hence no direct comparable exists for FY2023.'}
                </p>
              </>
            )}

            {activeSection === 'sec-4' && (
              <div dir={documentLanguage === 'ar' ? 'rtl' : 'ltr'} className={clsx(documentLanguage === 'ar' && "text-right")}>
                <h1 className="text-2xl sm:text-3xl font-bold mb-8 font-sans border-b-2 border-zinc-900 pb-4">
                  {documentLanguage === 'ar' ? '4. الالتزامات الاجتماعية' : documentLanguage === 'zh' ? '4. 社会承诺' : '4. Social Commitments'}
                </h1>
                <p className="text-[15px] leading-relaxed mb-4">
                  {documentLanguage === 'ar' ? 'نحن نولي أعلى درجات الأولوية لصحة وسلامة ورفاهية القوى العاملة لدينا والشركاء والمجتمعات التي نخدمها. حققنا هذا العام 1.2 مليون ساعة عمل بدون إصابات مهدرة للوقت.' :
                    documentLanguage === 'zh' ? '我们将员工、合作伙伴和我们所服务的社区的健康、安全和福祉放在首位。今年，我们实现了 120 万个无损失工时事故工时（LTI-Free）。' :
                      'We place the highest priority on the health, safety, and well-being of our workforce, partners, and the communities we serve. This year, we achieved 1.2 million Lost Time Injury-Free (LTI-Free) hours.'}
                </p>
              </div>
            )}

            {activeSection === 'sec-5' && (
              <div dir={documentLanguage === 'ar' ? 'rtl' : 'ltr'} className={clsx(documentLanguage === 'ar' && "text-right")}>
                <h1 className="text-2xl sm:text-3xl font-bold mb-8 font-sans border-b-2 border-zinc-900 pb-4">
                  {documentLanguage === 'ar' ? '5. الحوكمة والضمان' : documentLanguage === 'zh' ? '5. 治理与保证' : '5. Governance & Assurance'}
                </h1>
                <p className="text-[15px] leading-relaxed mb-4">
                  {documentLanguage === 'ar' ? 'يضمن إطار حوكمة الاستدامة لدينا الإشراف على أعلى المستويات. تم تدقيق جميع الانبعاثات بنطاقاتها 1 و 2 بشكل مستقل والتحقق منها باستخدام تقنية البلوكتشين عبر شبكة Nexus.' :
                    documentLanguage === 'zh' ? '我们的可持续发展治理框架确保了最高层的监督。所有范围 1 和 2 排放均已独立审计，并通过 Nexus 生态系统使用区块链进行加密验证。' :
                      'Our sustainability governance framework ensures oversight at the highest levels. All Scope 1 and 2 emissions have been independently audited and cryptographically verified using blockchain via the Nexus ecosystem.'}
                </p>
              </div>
            )}

          </div>

          {/* Zoom controls */}
          <div className="sticky bottom-4 mt-6 bg-white border border-line shadow-pop rounded-full px-1.5 py-1 flex items-center gap-1 z-30">
            <button type="button" aria-label={s.zoomOut} title={s.zoomOut} onClick={() => setZoomLevel(z => Math.max(50, z - 10))} className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-medium text-zinc-700 w-10 text-center tabular">{zoomLevel}%</span>
            <button type="button" aria-label={s.zoomIn} title={s.zoomIn} onClick={() => setZoomLevel(z => Math.min(150, z + 10))} className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: XBRL & reviews */}
        <aside className={clsx('lg:w-[340px] bg-white lg:border-l border-line flex-col shrink-0 lg:flex', mobilePane === 'right' ? 'flex m-4 sm:mx-6 lg:m-0 border lg:border-y-0 lg:border-r-0 rounded-card lg:rounded-none' : 'hidden')}>
          <div className="p-3 border-b border-line shrink-0">
            <Tabs<'xbrl' | 'comments'>
              value={rightTab}
              onChange={setRightTab}
              items={[
                { value: 'xbrl', label: <><Hash className="w-3.5 h-3.5" />{s.xbrlTags}</> },
                {
                  value: 'comments',
                  label: (
                    <>
                      <MessageSquare className="w-3.5 h-3.5" />
                      {s.reviews}
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" aria-label={s.unread} />
                    </>
                  ),
                },
              ]}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {rightTab === 'xbrl' && (
              <div className="space-y-6">
                {/* Selected variable */}
                <div className="rounded-xl border border-line p-4 shadow-card">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {s.activeSelection}
                  </div>
                  <div className="mt-1.5 text-lg font-semibold text-zinc-900 tabular">14,204.5 <span className="text-sm font-normal text-zinc-500">MT CO2e</span></div>

                  <dl className="mt-4 space-y-3">
                    <div>
                      <dt className="text-xs font-medium text-zinc-500">{s.dataSource}</dt>
                      <dd className="text-[13px] font-medium text-zinc-900 flex items-center gap-2 mt-1">
                        <Database className="w-3.5 h-3.5 text-zinc-400" /> {s.erpSource}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-zinc-500">{s.conceptTag}</dt>
                      <dd className="text-[13px] font-mono bg-zinc-50 px-2 py-1 rounded-md mt-1 text-zinc-800 break-all select-all border border-line">
                        gri:DirectGHGEmissions
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-zinc-500">{s.periodContext}</dt>
                      <dd className="text-[13px] font-medium text-zinc-900 mt-1">FY2024</dd>
                    </div>
                  </dl>
                </div>

                {/* Evidence chain */}
                <div>
                  <h4 className="text-[13px] font-medium text-zinc-700 mb-2 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-zinc-400" /> {s.evidenceLineage}
                  </h4>
                  <button type="button" className="w-full text-left bg-white border border-line rounded-xl p-4 hover:border-zinc-300 hover:shadow-card transition-[box-shadow,border-color] group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                          <Layers className="w-4 h-4 text-zinc-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-zinc-900 truncate">AWS_Log_Ext_24.csv</p>
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
              <div className="space-y-3">
                <div className="bg-white border border-line rounded-xl p-4 flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-700 ring-1 ring-rose-200 flex items-center justify-center text-xs font-semibold shrink-0">SR</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[13px] font-medium text-zinc-900">Sarah Reviewer</span>
                      <span className="text-xs text-zinc-400">{fmt(s.commentTime, { count: 2 })}</span>
                    </div>
                    <p className="text-[13px] text-zinc-700 leading-relaxed mb-3">{s.commentBody}</p>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="secondary" icon={CheckCircle}>{s.resolve}</Button>
                      <Button size="sm" variant="ghost">{s.reply}</Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

      </div>
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
