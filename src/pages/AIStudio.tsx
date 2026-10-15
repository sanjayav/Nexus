import { useState } from 'react'
import { Sparkles, FileText, Database, Zap, MessageSquare } from 'lucide-react'
import { Badge, Button, Card, CardHeader, PageHeader } from '../components/ui'
import { useStrings } from '../i18n'
import { aiStudioStrings } from '../i18n/pages/aiStudio'

const aiFeatures = [
  { id: 'draft', icon: FileText, status: 'beta' },
  { id: 'extract', icon: Database, status: 'coming' },
  { id: 'map', icon: Zap, status: 'coming' },
  { id: 'chat', icon: MessageSquare, status: 'coming' },
] as const

export default function AIStudio() {
  const s = useStrings(aiStudioStrings)
  const [prompt, setPrompt] = useState('')

  return (
    <div className="space-y-6">
      <PageHeader title={s.title} description={s.description} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        <Card>
          <CardHeader title={s.draftTitle} description={s.draftDesc} icon={Sparkles} />
          <label htmlFor="ai-prompt" className="block text-[13px] font-medium text-zinc-700 mb-1.5">{s.promptLabel}</label>
          <textarea
            id="ai-prompt"
            placeholder={s.placeholder}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            className="w-full h-32 px-3 py-2.5 rounded-[10px] bg-white border border-line text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500/60"
          />
          <Button variant="primary" icon={Sparkles} className="mt-4 w-full" disabled={!prompt.trim()}>
            {s.generate}
          </Button>
        </Card>

        <div className="space-y-3">
          <h2 className="text-[13px] font-medium text-zinc-500 px-1">{s.capabilities}</h2>
          {aiFeatures.map(feat => (
            <Card key={feat.id} className="hover:border-zinc-300 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0">
                  <feat.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-zinc-900">{s.features[feat.id].name}</h3>
                    <Badge tone={feat.status === 'beta' ? 'warning' : 'neutral'}>{s.statusLabel[feat.status]}</Badge>
                  </div>
                  <p className="text-[13px] text-zinc-500 mt-1 leading-relaxed">{s.features[feat.id].desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
