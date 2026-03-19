import { useState } from 'react'
import {
  FileText, Download, Bold, Italic, Link2,
  MessageSquare, History, Database, ExternalLink,
  CheckCircle, Search, Save, Settings, Globe,
  AlignLeft, AlignCenter, AlignRight, PenTool, Hash, AlertTriangle, Layers
} from 'lucide-react'
import clsx from 'clsx'

export default function ReportBuilder() {
  const [leftTab, setLeftTab] = useState<'outline' | 'data'>('data')
  const [rightTab, setRightTab] = useState<'xbrl' | 'comments'>('xbrl')
  const [documentLanguage, setDocumentLanguage] = useState('en')

  const [zoomLevel, setZoomLevel] = useState(100)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState('sec-3')
  const [formatState, setFormatState] = useState({ bold: false, italic: false, align: 'left' })

  const sections = [
    { id: 'sec-1', title: '1. Executive Summary' },
    { id: 'sec-2', title: '2. General Disclosures' },
    { id: 'sec-3', title: '3. Environmental Impact (GRI 305)' },
    { id: 'sec-4', title: '4. Social Commitments' },
    { id: 'sec-5', title: '5. Governance & Assurance' },
  ]

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

  const DATA_VARIABLES = [
    { id: 'var-1', name: 'Scope 1 Total', value: '14,204.5', unit: 'MT CO2e', source: 'ERP Sync' },
    { id: 'var-2', name: 'Scope 2 Total', value: '8,430.1', unit: 'MT CO2e', source: 'ERP Sync' },
    { id: 'var-3', name: 'Scope 3 Total', value: '42,900.0', unit: 'MT CO2e', source: 'Manual Entry' },
    { id: 'var-4', name: 'Energy Intensity', value: '1.45', unit: 'kWh/Rev', source: 'Calculation' },
  ]

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-6rem)] font-sans bg-[#F4F7F6] overflow-hidden rounded-br-[2.5rem]">

      {/* ── Enterprise Toolbar ── */}
      <div className="h-16 bg-white border-b border-black/10 flex items-center justify-between px-6 shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-black border-b border-dashed border-black/30 pb-0.5 cursor-text hover:border-black transition-colors">
                Asyad Group - FY25 Sustainability Report
              </h1>
              <span className="bg-emerald-500/10 text-emerald-700 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-emerald-500/20">Draft</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-semibold text-black/50 mt-1 uppercase tracking-wider">
              <Save className="w-3 h-3" /> Autosaved just now
            </div>
          </div>
        </div>

        {/* Word Processor Formatting Tools */}
        <div className="hidden lg:flex items-center gap-1.5 p-1 bg-black/5 rounded-lg border border-black/5 shadow-inner">
          <select className="bg-white border border-black/10 rounded-md text-xs font-semibold px-2 py-1.5 focus:outline-none">
            <option>Inter</option>
            <option>Helvetica</option>
            <option>Georgia</option>
          </select>
          <div className="w-px h-5 bg-black/10 mx-1" />
          <button onClick={() => setFormatState(s => ({ ...s, bold: !s.bold }))} className={clsx("p-1.5 rounded-md transition-colors", formatState.bold ? "bg-black/10 text-black shadow-inner" : "hover:bg-black/5 text-black/70 hover:text-black")}><Bold className="w-4 h-4" /></button>
          <button onClick={() => setFormatState(s => ({ ...s, italic: !s.italic }))} className={clsx("p-1.5 rounded-md transition-colors", formatState.italic ? "bg-black/10 text-black shadow-inner" : "hover:bg-black/5 text-black/70 hover:text-black")}><Italic className="w-4 h-4" /></button>
          <div className="w-px h-5 bg-black/10 mx-1" />
          <button onClick={() => setFormatState(s => ({ ...s, align: 'left' }))} className={clsx("p-1.5 rounded-md transition-colors", formatState.align === 'left' ? "bg-white shadow-sm border border-black/5 text-black" : "hover:bg-black/5 text-black/70 hover:text-black")}><AlignLeft className="w-4 h-4" /></button>
          <button onClick={() => setFormatState(s => ({ ...s, align: 'center' }))} className={clsx("p-1.5 rounded-md transition-colors", formatState.align === 'center' ? "bg-white shadow-sm border border-black/5 text-black" : "hover:bg-black/5 text-black/70 hover:text-black")}><AlignCenter className="w-4 h-4" /></button>
          <button onClick={() => setFormatState(s => ({ ...s, align: 'right' }))} className={clsx("p-1.5 rounded-md transition-colors", formatState.align === 'right' ? "bg-white shadow-sm border border-black/5 text-black" : "hover:bg-black/5 text-black/70 hover:text-black")}><AlignRight className="w-4 h-4" /></button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-black/5 p-1 rounded-lg border border-black/5 shadow-inner">
            <Globe className="w-4 h-4 ml-2 text-black/50" />
            <select
              className="bg-transparent border-none text-xs font-bold text-black focus:outline-none focus:ring-0 cursor-pointer pr-2 appearance-none"
              value={documentLanguage}
              onChange={(e) => setDocumentLanguage(e.target.value)}
            >
              <option value="en">English (US)</option>
              <option value="ar">Arabic (العربية)</option>
              <option value="zh">Chinese (中文)</option>
            </select>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-black/10 rounded-lg text-xs font-bold text-black hover:bg-black/5 transition-colors">
            <Settings className="w-4 h-4 text-black/50" /> Setup
          </button>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-1.5 bg-white border border-black/10 rounded-lg text-xs font-bold text-black hover:bg-black/5 transition-colors">
              <Download className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={() => {
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
              }}
              className="flex items-center gap-2 px-4 py-1.5 bg-white border border-black/10 rounded-lg text-xs font-bold text-black hover:bg-black/5 transition-colors"
            >
              <Hash className="w-4 h-4" /> XBRL
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Three-Pane Interface ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Sidebar: Outline & Data Variables */}
        <div className="w-72 bg-[#FCFDFD] border-r border-black/5 flex flex-col shrink-0">
          <div className="flex border-b border-black/5 p-2 gap-2 shrink-0">
            <button
              onClick={() => setLeftTab('outline')}
              className={clsx("flex-1 text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2", leftTab === 'outline' ? "bg-black/5 text-black border border-black/5 shadow-sm" : "text-black/50 hover:text-black hover:bg-black/5")}
            >
              <FileText className="w-3.5 h-3.5" /> Outline
            </button>
            <button
              onClick={() => setLeftTab('data')}
              className={clsx("flex-1 text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2", leftTab === 'data' ? "bg-black/5 text-black border border-black/5 shadow-sm" : "text-black/50 hover:text-black hover:bg-black/5")}
            >
              <Database className="w-3.5 h-3.5" /> Variables
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-black/10">
            {leftTab === 'outline' && (
              <div className="space-y-1">
                {sections.map(s => (
                  <button key={s.id} onClick={() => setActiveSection(s.id)} className={clsx("w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 group", s.id === activeSection ? "bg-[#12C87A]/10 text-[#013328] border border-[#12C87A]/20" : "text-black/70 hover:bg-black/5")}>
                    <span className={clsx("w-1.5 h-1.5 rounded-full transition-colors", s.id === activeSection ? "bg-[#12C87A]" : "bg-transparent group-hover:bg-black/20")} />
                    {s.title}
                  </button>
                ))}
              </div>
            )}
            {leftTab === 'data' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search parameters..." className="w-full bg-white border border-black/10 rounded-lg pl-9 pr-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#12C87A]" />
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-bold text-black/40 uppercase tracking-widest px-1">GRI 305 Linked Data</p>
                  {DATA_VARIABLES.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.value.includes(searchQuery)).map(v => (
                    <div key={v.id} className="bg-white border border-black/10 rounded-xl p-3 shadow-sm hover:border-[#12C87A]/50 transition-colors cursor-grab active:cursor-grabbing border-l-4 border-l-[#12C87A]">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-black">{v.name}</span>
                        <span className="text-[10px] font-semibold text-black/50 bg-black/5 px-1.5 py-0.5 rounded">{v.source}</span>
                      </div>
                      <div className="text-sm font-extrabold text-[#013328]">
                        {v.value} <span className="text-[10px] font-bold text-black/40">{v.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: The Document Canvas */}
        <div className="flex-1 bg-[#F4F7F6] overflow-y-auto p-8 flex justify-center scrollbar-thin scrollbar-thumb-black/10 shadow-inner relative">

          {/* Floating zoom controls */}
          <div className="fixed bottom-6 ml-64 transform translate-x-1/2 left-1/2 bg-white/80 backdrop-blur-md border border-black/10 shadow-lg rounded-full px-4 py-2 flex items-center gap-4 z-30">
            <button onClick={() => setZoomLevel(z => Math.max(50, z - 10))} className="text-black/50 hover:text-black font-bold text-lg leading-none">-</button>
            <span className="text-xs font-bold text-black/70 w-8 text-center">{zoomLevel}%</span>
            <button onClick={() => setZoomLevel(z => Math.min(150, z + 10))} className="text-black/50 hover:text-black font-bold text-lg leading-none">+</button>
          </div>

          {/* The "A4 Paper" Editor Space */}
          <div
            className={clsx(
              "w-[850px] min-h-[1100px] bg-white border border-black/10 shadow-[0_20px_60px_rgba(0,0,0,0.05)] rounded-sm p-[1in] font-serif text-black relative group outline-none focus:outline-none transition-transform duration-300 origin-top flex-shrink-0",
              formatState.bold && "font-bold",
              formatState.italic && "italic",
              formatState.align === 'left' && "text-left",
              formatState.align === 'center' && "text-center",
              formatState.align === 'right' && "text-right"
            )}
            style={{ transform: `scale(${zoomLevel / 100})`, marginBottom: `${Math.max(0, (zoomLevel / 100 - 1) * 1100)}px` }}
            contentEditable
            suppressContentEditableWarning
          >

            <div className="absolute top-[0.5in] right-[0.5in] opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-2 bg-black/5 hover:bg-black/10 rounded text-black/50 hover:text-black"><PenTool className="w-4 h-4" /></button>
            </div>

            {activeSection === 'sec-1' && (
              <div dir={documentLanguage === 'ar' ? 'rtl' : 'ltr'} className={clsx(documentLanguage === 'ar' && "text-right")}>
                <h1 className="text-3xl font-bold mb-8 font-sans border-b-2 border-black pb-4">
                  {documentLanguage === 'ar' ? '1. ملخص تنفيذي' : documentLanguage === 'zh' ? '1. 执行摘要' : '1. Executive Summary'}
                </h1>
                <p className="text-[15px] leading-relaxed mb-4 text-justify">
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
                <h1 className="text-3xl font-bold mb-8 font-sans border-b-2 border-black pb-4">
                  {documentLanguage === 'ar' ? '2. الإفصاحات العامة' : documentLanguage === 'zh' ? '2. 一般披露' : '2. General Disclosures'}
                </h1>
                <p className="text-[15px] leading-relaxed mb-4 text-justify">
                  {documentLanguage === 'ar' ? 'مجموعة أسياد هي مزود عالمي رائد للخدمات اللوجستية المتكاملة، ومقرها في سلطنة عمان. وتشمل عملياتنا الموانئ والشبكات البحرية وخدمات الشحن. تتضمن استراتيجيتنا الاستدامة في العمليات الأساسية...' :
                    documentLanguage === 'zh' ? 'Asyad 集团是一家总部位于阿曼的全球领先综合物流供应商。我们的业务遍及港口、航运和地面配送。我们的战略将可持续性融入核心运营。' :
                      'Asyad Group is a leading global integrated logistics provider, headquartered in Oman. Our operations span across ports, maritime networks, and freight services. Our strategy embeds sustainability into core operations...'}
                </p>
              </div>
            )}

            {activeSection === 'sec-3' && documentLanguage === 'en' && (
              <>
                <h1 className="text-3xl font-bold mb-8 font-sans border-b-2 border-black pb-4">3. Environmental Impact</h1>

                <h2 className="text-xl font-bold mb-4 font-sans text-black/80">305-1 Direct (Scope 1) GHG Emissions</h2>
                <p className="text-[15px] leading-relaxed mb-4 text-justify">
                  Asyad Group is committed to full transparency regarding our direct environmental footprint. For the fiscal year ending 2024, our aggregate Scope 1 emissions, calculated using the operational control consolidation approach, resulted in a total of
                  <span className="inline-flex items-center gap-1 bg-[#12C87A]/10 border border-[#12C87A]/30 text-[#013328] px-1.5 py-0.5 rounded mx-1 font-sans font-bold cursor-pointer hover:bg-[#12C87A]/20 transition-colors group relative">
                    14,204.5 MT CO2e
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#12C87A] rounded-full border border-white shadow-sm" />
                  </span>
                  . This figure includes emissions from all directly owned and operated vessels, port machinery, and logistical ground fleets.
                </p>

                <p className="text-[15px] leading-relaxed mb-6 text-justify">
                  The primary driver of the <span className="inline-flex bg-amber-500/10 text-amber-800 border border-amber-500/20 px-1 py-0.5 rounded font-sans font-semibold cursor-pointer text-sm">3.4% year-over-year increase</span> was the expansion of port operations in the Duqm economic zone. However, energy intensity per container handled has decreased to
                  <span className="inline-flex items-center gap-1 bg-[#12C87A]/10 border border-[#12C87A]/30 text-[#013328] px-1.5 py-0.5 rounded mx-1 font-sans font-bold cursor-pointer hover:bg-[#12C87A]/20 transition-colors">
                    1.45 kWh/Rev
                  </span>
                  , reflecting recent investments in hybrid crane technology.
                </p>
              </>
            )}

            {activeSection === 'sec-3' && documentLanguage === 'ar' && (
              <div dir="rtl">
                <h1 className="text-3xl font-bold mb-8 font-sans border-b-2 border-black pb-4 text-right">3. التأثير البيئي</h1>

                <h2 className="text-xl font-bold mb-4 font-sans text-black/80 text-right">305-1 الانبعاثات المباشرة (النطاق 1) للغازات الدفيئة</h2>
                <p className="text-[15px] leading-relaxed mb-4 text-justify">
                  تلتزم مجموعة أسياد بالشفافية الكاملة فيما يتعلق ببصمتنا البيئية المباشرة. للسنة المالية المنتهية في 2024، بناءً على نهج توحيد الرقابة التشغيلية، بلغ إجمالي انبعاثات النطاق 1
                  <span className="inline-flex items-center gap-1 bg-[#12C87A]/10 border border-[#12C87A]/30 text-[#013328] px-1.5 py-0.5 rounded mx-1 font-sans font-bold cursor-pointer hover:bg-[#12C87A]/20 transition-colors group relative" dir="ltr">
                    14,204.5 MT CO2e
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#12C87A] rounded-full border border-white shadow-sm" />
                  </span>
                  . ويشمل هذا الرقم الانبعاثات من جميع السفن المملوكة والمشغلة مباشرة، وآلات الموانئ، والأساطيل اللوجستية البرية.
                </p>

                <p className="text-[15px] leading-relaxed mb-6 text-justify">
                  الدافع الرئيسي للـ <span className="inline-flex bg-amber-500/10 text-amber-800 border border-amber-500/20 px-1 py-0.5 rounded font-sans font-semibold cursor-pointer text-sm">زيادة بنسبة 3.4% على أساس سنوي</span> كان التوسع في عمليات الموانئ في منطقة الدقم الاقتصادية. ومع ذلك، انخفضت كثافة الطاقة لكل حاوية يتم التعامل معها إلى
                  <span className="inline-flex items-center gap-1 bg-[#12C87A]/10 border border-[#12C87A]/30 text-[#013328] px-1.5 py-0.5 rounded mx-1 font-sans font-bold cursor-pointer hover:bg-[#12C87A]/20 transition-colors" dir="ltr">
                    1.45 kWh/Rev
                  </span>
                  ، مما يعكس الاستثمارات الأخيرة في تكنولوجيا الرافعات الهجينة.
                </p>
              </div>
            )}

            {activeSection === 'sec-3' && documentLanguage === 'zh' && (
              <>
                <h1 className="text-3xl font-bold mb-8 font-sans border-b-2 border-black pb-4">3. 环境影响</h1>

                <h2 className="text-xl font-bold mb-4 font-sans text-black/80">305-1 直接 (范围 1) 温室气体排放</h2>
                <p className="text-[15px] leading-relaxed mb-4 text-justify">
                  Asyad 集团致力于完全透明地公布我们的直接环境足迹。截至 2024 财年，使用运营控制整合方法计算的范围 1 排放总量为
                  <span className="inline-flex items-center gap-1 bg-[#12C87A]/10 border border-[#12C87A]/30 text-[#013328] px-1.5 py-0.5 rounded mx-1 font-sans font-bold cursor-pointer hover:bg-[#12C87A]/20 transition-colors group relative">
                    14,204.5 MT CO2e
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#12C87A] rounded-full border border-white shadow-sm" />
                  </span>
                  。该数据包括所有直接拥有和运营的船机、港口机械和地面物流车队的排放。
                </p>

                <p className="text-[15px] leading-relaxed mb-6 text-justify">
                  主要导致 <span className="inline-flex bg-amber-500/10 text-amber-800 border border-amber-500/20 px-1 py-0.5 rounded font-sans font-semibold cursor-pointer text-sm">同比增长 3.4%</span> 的原因是 Duqm 经济区港口业务的扩张。然而，处理每个集装箱的能源强度已降至
                  <span className="inline-flex items-center gap-1 bg-[#12C87A]/10 border border-[#12C87A]/30 text-[#013328] px-1.5 py-0.5 rounded mx-1 font-sans font-bold cursor-pointer hover:bg-[#12C87A]/20 transition-colors">
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
                      <td className={clsx("font-bold text-[#12C87A] bg-[#12C87A]/5 px-2 py-2 border-x border-[#12C87A]/10", documentLanguage === 'ar' ? 'text-left' : 'text-right')}>
                        <span dir="ltr">14,204.5</span>
                      </td>
                      <td className={clsx("px-2 py-2", documentLanguage === 'ar' ? 'text-left' : 'text-right')}><span dir="ltr">13,732.1</span></td>
                      <td className="text-center px-2 py-2"><CheckCircle className="w-4 h-4 text-black/30 mx-auto" /></td>
                    </tr>
                    <tr className="border-b border-black/10 bg-black/[0.02]">
                      <td className="py-2 px-2">{documentLanguage === 'ar' ? 'النطاق 2 (قائم على السوق)' : documentLanguage === 'zh' ? '范围 2 (基于市场)' : 'Scope 2 (Market-based)'}</td>
                      <td className={clsx("font-bold text-[#12C87A] bg-[#12C87A]/5 px-2 py-2 border-x border-[#12C87A]/10", documentLanguage === 'ar' ? 'text-left' : 'text-right')}>
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
                <h1 className="text-3xl font-bold mb-8 font-sans border-b-2 border-black pb-4">
                  {documentLanguage === 'ar' ? '4. الالتزامات الاجتماعية' : documentLanguage === 'zh' ? '4. 社会承诺' : '4. Social Commitments'}
                </h1>
                <p className="text-[15px] leading-relaxed mb-4 text-justify">
                  {documentLanguage === 'ar' ? 'نحن نولي أعلى درجات الأولوية لصحة وسلامة ورفاهية القوى العاملة لدينا والشركاء والمجتمعات التي نخدمها. حققنا هذا العام 1.2 مليون ساعة عمل بدون إصابات مهدرة للوقت.' :
                    documentLanguage === 'zh' ? '我们将员工、合作伙伴和我们所服务的社区的健康、安全和福祉放在首位。今年，我们实现了 120 万个无损失工时事故工时（LTI-Free）。' :
                      'We place the highest priority on the health, safety, and well-being of our workforce, partners, and the communities we serve. This year, we achieved 1.2 million Lost Time Injury-Free (LTI-Free) hours.'}
                </p>
              </div>
            )}

            {activeSection === 'sec-5' && (
              <div dir={documentLanguage === 'ar' ? 'rtl' : 'ltr'} className={clsx(documentLanguage === 'ar' && "text-right")}>
                <h1 className="text-3xl font-bold mb-8 font-sans border-b-2 border-black pb-4">
                  {documentLanguage === 'ar' ? '5. الحوكمة والضمان' : documentLanguage === 'zh' ? '5. 治理与保证' : '5. Governance & Assurance'}
                </h1>
                <p className="text-[15px] leading-relaxed mb-4 text-justify">
                  {documentLanguage === 'ar' ? 'يضمن إطار حوكمة الاستدامة لدينا الإشراف على أعلى المستويات. تم تدقيق جميع الانبعاثات بنطاقاتها 1 و 2 بشكل مستقل والتحقق منها باستخدام تقنية البلوكتشين عبر شبكة Nexus.' :
                    documentLanguage === 'zh' ? '我们的可持续发展治理框架确保了最高层的监督。所有范围 1 和 2 排放均已独立审计，并通过 Nexus 生态系统使用区块链进行加密验证。' :
                      'Our sustainability governance framework ensures oversight at the highest levels. All Scope 1 and 2 emissions have been independently audited and cryptographically verified using blockchain via the Nexus ecosystem.'}
                </p>
              </div>
            )}

          </div>
        </div>

        {/* Right Sidebar: Context, XBRL, Comments */}
        <div className="w-[340px] bg-[#FCFDFD] border-l border-black/5 flex flex-col shrink-0">
          <div className="flex border-b border-black/5 p-2 gap-2 shrink-0">
            <button
              onClick={() => setRightTab('xbrl')}
              className={clsx("flex-1 text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2", rightTab === 'xbrl' ? "bg-black/5 text-black border border-black/5 shadow-sm" : "text-black/50 hover:text-black hover:bg-black/5")}
            >
              <Hash className="w-3.5 h-3.5" /> XBRL Tags
            </button>
            <button
              onClick={() => setRightTab('comments')}
              className={clsx("flex-1 text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 relative", rightTab === 'comments' ? "bg-black/5 text-black border border-black/5 shadow-sm" : "text-black/50 hover:text-black hover:bg-black/5")}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Reviews
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-rose-500 shadow-sm" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-black/10 bg-black/[0.01]">
            {rightTab === 'xbrl' && (
              <div className="space-y-6">

                {/* Information Card for Selected Variable */}
                <div className="bg-white border-2 border-[#12C87A] rounded-2xl p-5 shadow-[0_10px_30px_rgba(18,200,122,0.1)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Hash className="w-16 h-16" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-bold text-[#12C87A] uppercase tracking-widest mb-1">Active Selection</p>
                    <h3 className="text-lg font-bold text-black mb-4">14,204.5 MT CO2e</h3>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-black/50">Data Source Pipeline</label>
                        <p className="text-sm font-semibold text-black flex items-center gap-2 mt-0.5">
                          <Database className="w-4 h-4 text-indigo-500" /> ERP Sync (SAP HANA)
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-black/50">iXBRL Concept Tag</label>
                        <p className="text-sm font-mono font-medium bg-black/5 px-2 py-1 rounded mt-0.5 text-black/80 break-all select-all border border-black/10">
                          gri:DirectGHGEmissions
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-black/50">Period Context</label>
                        <p className="text-sm font-semibold text-black mt-0.5">FY2024</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evidence Chain */}
                <div>
                  <h4 className="text-xs font-bold text-black/80 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Link2 className="w-4 h-4" /> Evidence Lineage
                  </h4>
                  <div className="bg-white border border-black/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                          <Layers className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-black group-hover:text-indigo-600 transition-colors">AWS_Log_Ext_24.csv</p>
                          <p className="text-xs font-medium text-black/50 mt-0.5">Processed via Data Lake</p>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-black/20 group-hover:text-indigo-600" />
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-black/40 border-t border-black/5 pt-3">
                      <span className="flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Updated 2 days ago</span>
                      <span className="bg-black/5 px-2 py-1 rounded">V 1.4</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {rightTab === 'comments' && (
              <div className="space-y-4">

                <div className="bg-white border border-rose-500/30 rounded-xl p-4 shadow-sm relative filter drop-shadow-[0_10px_20px_rgba(244,63,94,0.05)]">
                  <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center border border-rose-200">
                    <span className="text-xs font-bold text-rose-700">SR</span>
                  </div>
                  <div className="pl-12">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-black">Sarah Reviewer</span>
                      <span className="text-[10px] font-semibold text-black/40">2h ago</span>
                    </div>
                    <p className="text-sm font-medium text-black/80 mb-3">Wait, didn't we decide to exclude the new acquired subsidiary from Scope 1 this year per the boundary discussion?</p>
                    <div className="flex gap-2">
                      <button className="text-[10px] font-bold uppercase tracking-widest text-[#12C87A] bg-[#12C87A]/10 px-2 py-1 rounded border border-[#12C87A]/20 hover:bg-[#12C87A]/20 transition-colors">Resolve</button>
                      <button className="text-[10px] font-bold uppercase tracking-widest text-black/50 bg-black/5 px-2 py-1 rounded border border-black/10 hover:bg-black/10 transition-colors">Reply</button>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
