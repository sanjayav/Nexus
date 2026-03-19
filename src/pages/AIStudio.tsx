import { useState } from 'react'
import { Sparkles, FileText, Database, Zap, MessageSquare } from 'lucide-react'
import clsx from 'clsx'

const aiFeatures = [
  { id: 'draft', name: 'AI Drafting', desc: 'Generate narrative disclosures from data. ESRS, GRI, BRSR aligned.', icon: FileText, status: 'beta' },
  { id: 'extract', name: 'Data Extraction', desc: 'Extract metrics from PDFs, spreadsheets. Auto-map to disclosures.', icon: Database, status: 'coming' },
  { id: 'map', name: 'Disclosure Mapping', desc: 'AI-suggested mapping across frameworks. Reduce duplicate entry.', icon: Zap, status: 'coming' },
  { id: 'chat', name: 'ESG Assistant', desc: 'Ask questions about your data. "What is our Scope 3 trend?"', icon: MessageSquare, status: 'coming' },
]

export default function AIStudio() {
  const [prompt, setPrompt] = useState('')

  return (
    <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-black tracking-tight">AI Studio</h1>
        <p className="text-sm text-black/60 mt-2 font-medium tracking-wide">
          AI-powered drafting, data extraction, and disclosure mapping. Pioneer ESG intelligence.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-black text-white rounded-[2rem] p-8 shadow-xl shadow-black/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px]" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-amber-400" />
              <span className="text-sm font-bold text-white/80 uppercase tracking-widest">AI Drafting</span>
            </div>
            <p className="text-lg font-medium text-white/90 mb-4">Generate disclosure narratives from your data. Select a section and let AI draft the text.</p>
            <textarea
              placeholder="e.g. Describe our Scope 1+2 emissions reduction strategy and targets..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-24 bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-white/30"
            />
            <button className="mt-4 w-full py-3 bg-white text-black font-bold text-sm rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" /> Generate Draft
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {aiFeatures.map((f) => (
            <div key={f.id} className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-black/5 flex items-center justify-center shrink-0">
                  <f.icon className="w-6 h-6 text-black/60" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-black">{f.name}</h3>
                    <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold", f.status === 'beta' ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" : "bg-black/5 text-black/50 border border-black/10")}>{f.status}</span>
                  </div>
                  <p className="text-sm text-black/60 mt-1">{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
