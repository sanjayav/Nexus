import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Clock,
  Circle,
  ChevronDown,
  ChevronUp,
  Shield,
  Download,
  FileOutput,
} from 'lucide-react'
import {
  frameworkStatuses,
  cdpSections,
  tcfdSections,
  griDisclosures,
} from '../data/pttgcData'
import { csrdSections } from '../data/moduleData'

export default function Reporting() {
  const navigate = useNavigate()
  const [expandedFramework, setExpandedFramework] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedFramework(expandedFramework === id ? null : id)
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Framework Status</h1>
          <p className="text-sm text-dark-300 mt-1">
            Track disclosure completion across CDP, TCFD, GRI, and CSRD frameworks. Same underlying dataset, multiple framework outputs.
          </p>
        </div>
        <button
          onClick={() => navigate('/reports')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold transition-colors"
        >
          <FileOutput className="w-4 h-4" />
          Generate Reports
        </button>
      </div>

      {/* Framework Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-5">
        {frameworkStatuses.map((fw) => (
          <div key={fw.id} className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card overflow-hidden hover:border-dark-500 hover:shadow-card-hover transition-all">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-heading font-bold text-white">{fw.name}</h3>
                  <p className="text-xs text-dark-400 mt-0.5">{fw.fullName}</p>
                </div>
                {fw.score && (
                  <span className="px-3 py-1 bg-accent-500/15 text-accent-400 text-sm font-bold rounded-full border border-accent-500/20">
                    {fw.score}
                  </span>
                )}
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-dark-400">Completion</span>
                  <span className="text-xs font-bold text-dark-300">{fw.completion}%</span>
                </div>
                <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-500 rounded-full transition-all duration-500"
                    style={{ width: `${fw.completion}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-dark-400">
                  {fw.disclosures}/{fw.totalDisclosures} disclosures
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                  fw.status === 'Published' ? 'bg-teal-500/15 text-teal-400 border-teal-500/20' :
                  fw.status === 'In Progress' ? 'bg-blue-500/15 text-blue-400 border-blue-500/20' :
                  'bg-dark-700 text-dark-300 border-dark-500'
                }`}>
                  {fw.status}
                </span>
              </div>

              <button
                onClick={() => toggleExpand(fw.id)}
                className="w-full py-2.5 rounded-xl border border-dark-600 hover:bg-dark-700 text-dark-300 hover:text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {expandedFramework === fw.id ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    View Details
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CDP Detail */}
      {expandedFramework === 'cdp' && (
        <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-heading font-semibold text-white">CDP Climate Change 2026 — Section Status</h3>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-dark-300 bg-dark-700 border border-dark-500 rounded-lg hover:bg-dark-600 transition-colors">
              <Download className="w-3.5 h-3.5" />
              Export PDF
            </button>
          </div>
          <div className="space-y-1">
            {cdpSections.map((section) => (
              <div key={section.id} className="flex items-center gap-4 py-3 px-4 rounded-xl hover:bg-dark-750 transition-colors">
                <StatusIcon status={section.status} />
                <span className="text-xs font-mono text-dark-400 w-8">{section.id}</span>
                <span className="text-sm text-dark-300 flex-1">{section.name}</span>
                <span className="text-xs text-dark-400">{section.answered}/{section.questions} questions</span>
                <div className="w-20 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${section.status === 'complete' ? 'bg-teal-500' : section.status === 'in-progress' ? 'bg-blue-500' : 'bg-dark-500'}`}
                    style={{ width: `${(section.answered / section.questions) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TCFD Detail */}
      {expandedFramework === 'tcfd' && (
        <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-heading font-semibold text-white">TCFD / IFRS S2 — Disclosure Status</h3>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-dark-300 bg-dark-700 border border-dark-500 rounded-lg hover:bg-dark-600 transition-colors">
              <Download className="w-3.5 h-3.5" />
              Export PDF
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tcfdSections.map((section) => (
              <div key={section.id} className="border border-dark-600 rounded-xl p-4 bg-dark-750">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-white">{section.name}</h4>
                  <StatusIcon status={section.status} />
                </div>
                <div className="space-y-1.5">
                  {section.disclosures.map((d) => (
                    <div key={d} className="flex items-center gap-2 text-xs text-dark-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                      {d}
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-dark-400">Completion</span>
                    <span className="text-[10px] font-bold text-dark-300">{section.completion}%</span>
                  </div>
                  <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${section.completion}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GRI Detail */}
      {expandedFramework === 'gri' && (
        <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-heading font-semibold text-white">GRI 305: Emissions — Disclosures</h3>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-dark-300 bg-dark-700 border border-dark-500 rounded-lg hover:bg-dark-600 transition-colors">
              <Download className="w-3.5 h-3.5" />
              Export PDF
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-600">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Disclosure</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Description</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Value</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Verified</th>
                </tr>
              </thead>
              <tbody>
                {griDisclosures.map((d, i) => (
                  <tr key={d.id} className={i % 2 === 0 ? 'bg-dark-750' : ''}>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-accent-400">{d.id}</td>
                    <td className="py-3 px-4 text-dark-300">{d.name}</td>
                    <td className="py-3 px-4 text-white font-medium">{d.value}</td>
                    <td className="py-3 px-4 text-center">
                      {d.verified && (
                        <span className="inline-flex items-center gap-1 text-teal-400">
                          <Shield className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">Verified</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* CSRD Detail */}
      {expandedFramework === 'csrd' && (
        <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-heading font-semibold text-white">CSRD — ESRS E1: Climate Change</h3>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-dark-300 bg-dark-700 border border-dark-500 rounded-lg hover:bg-dark-600 transition-colors">
              <Download className="w-3.5 h-3.5" />
              Export XBRL
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {csrdSections.map((section) => (
              <div key={section.id} className="border border-dark-600 rounded-xl p-4 bg-dark-750">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-white">{section.id}</h4>
                  <StatusIcon status={section.status === 'in-progress' ? 'in-progress' : section.status === 'draft' ? 'draft' : 'not-started'} />
                </div>
                <p className="text-xs text-dark-300 font-medium mb-3">{section.name}</p>
                <div className="space-y-1.5">
                  {section.disclosures.map((d) => (
                    <div key={d} className="flex items-center gap-2 text-xs text-dark-400">
                      <Circle className="w-2.5 h-2.5 flex-shrink-0" />
                      {d}
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-dark-400">Completion</span>
                    <span className="text-[10px] font-bold text-dark-300">{section.completion}%</span>
                  </div>
                  <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${section.completion >= 50 ? 'bg-teal-500' : section.completion > 0 ? 'bg-amber-500' : 'bg-dark-500'}`} style={{ width: `${section.completion}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'complete') return <CheckCircle2 className="w-4 h-4 text-teal-400" />
  if (status === 'in-progress') return <Clock className="w-4 h-4 text-blue-400" />
  return <Circle className="w-4 h-4 text-dark-500" />
}
