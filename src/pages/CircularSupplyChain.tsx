import { useState } from 'react'
import {
  Recycle,
  Leaf,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Mail,
  Shield,
  ArrowRight,
  Factory,
} from 'lucide-react'
import { circularMetrics, suppliers, formatNumber } from '../data/pttgcData'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function CircularSupplyChain() {
  const [activeTab, setActiveTab] = useState<'circular' | 'supply'>('circular')

  const enviccoMetrics = circularMetrics.filter(m => m.facility === 'ENVICCO')
  const natureworksMetrics = circularMetrics.filter(m => m.facility === 'NatureWorks')
  const groupMetrics = circularMetrics.filter(m => m.facility === 'GC Group (All)')

  const supplierChartData = suppliers.map(s => ({
    name: s.name.length > 15 ? s.name.slice(0, 15) + '...' : s.name,
    emissions: s.estimatedEmissions / 1000,
    completeness: s.dataCompleteness,
  }))

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-heading font-bold text-white">Circular Economy & Supply Chain</h1>
        <p className="text-sm text-dark-300 mt-1">
          Track circular economy performance across ENVICCO and NatureWorks, and monitor Scope 3 supply chain emissions with supplier data completeness scoring.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-dark-800 border border-dark-600 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('circular')}
          className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'circular' ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-dark-300'}`}
        >
          Circular Economy
        </button>
        <button
          onClick={() => setActiveTab('supply')}
          className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'supply' ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-dark-300'}`}
        >
          Supply Chain Scope 3
        </button>
      </div>

      {activeTab === 'circular' ? (
        <div className="space-y-6">
          {/* Group overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {groupMetrics.map((metric) => (
              <div key={metric.id} className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-5 hover:border-dark-500 transition-colors">
                <p className="text-xs text-dark-400 font-medium">{metric.metric}</p>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-2xl font-heading font-bold text-white">
                    {metric.value >= 1000 ? formatNumber(metric.value) : metric.value}{metric.unit === '%' ? '%' : ''}
                  </span>
                  {metric.unit !== '%' && <span className="text-xs text-dark-400 mb-1">{metric.unit}</span>}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    {metric.yoyChange > 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span className={`text-xs font-semibold ${metric.yoyChange > 0 ? 'text-teal-400' : 'text-rose-400'}`}>
                      {metric.yoyChange > 0 ? '+' : ''}{metric.yoyChange}%
                    </span>
                  </div>
                  <span className="text-xs text-dark-400">vs last year</span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-dark-400">Progress to target</span>
                    <span className="text-dark-300 font-medium">{metric.value >= 1000 ? formatNumber(metric.target) : metric.target}{metric.unit === '%' ? '%' : ''}</span>
                  </div>
                  <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-500 rounded-full" style={{ width: `${Math.min(100, (metric.value / metric.target) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ENVICCO */}
          <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/20 flex items-center justify-center">
                <Recycle className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h3 className="text-lg font-heading font-semibold text-white">ENVICCO — Recycled Plastics</h3>
                <p className="text-xs text-dark-400">Thailand's largest bottle-to-bottle PET recycling facility</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {enviccoMetrics.map((m) => (
                <MetricCard key={m.id} metric={m} />
              ))}
            </div>
          </div>

          {/* NatureWorks */}
          <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/20 flex items-center justify-center">
                <Leaf className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-heading font-semibold text-white">NatureWorks — Bioplastics</h3>
                <p className="text-xs text-dark-400">Global leader in PLA bioplastic production from renewable resources</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {natureworksMetrics.map((m) => (
                <MetricCard key={m.id} metric={m} />
              ))}
            </div>
          </div>

          {/* Circular Flow */}
          <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
            <h3 className="text-lg font-heading font-semibold text-white mb-4">Material Circular Flow</h3>
            <div className="flex items-center justify-center gap-4 py-6 flex-wrap">
              {[
                { label: 'Raw Materials', sub: '12M tons input', color: 'bg-dark-700 text-dark-300 border border-dark-500' },
                { label: 'Production', sub: '8 facilities', color: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
                { label: 'Products', sub: '11.6M tons output', color: 'bg-accent-500/15 text-accent-400 border border-accent-500/20' },
                { label: 'Collection', sub: '87% waste diverted', color: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
                { label: 'Recycling', sub: '45K tons recycled PET', color: 'bg-teal-500/15 text-teal-400 border border-teal-500/20' },
              ].map((step, i, arr) => (
                <div key={step.label} className="flex items-center gap-4">
                  <div className={`${step.color} rounded-xl px-5 py-4 text-center min-w-[140px]`}>
                    <p className="text-sm font-semibold">{step.label}</p>
                    <p className="text-xs opacity-70 mt-0.5">{step.sub}</p>
                  </div>
                  {i < arr.length - 1 && <ArrowRight className="w-5 h-5 text-dark-500 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Supply chain overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-5">
              <p className="text-xs text-dark-400 font-medium">Tier 1 Suppliers</p>
              <p className="text-2xl font-heading font-bold text-white mt-1">10</p>
              <p className="text-xs text-dark-400 mt-1">Active in emissions reporting</p>
            </div>
            <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-5">
              <p className="text-xs text-dark-400 font-medium">Data Coverage</p>
              <p className="text-2xl font-heading font-bold text-white mt-1">68%</p>
              <p className="text-xs text-dark-400 mt-1">Average completeness</p>
            </div>
            <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-5">
              <p className="text-xs text-dark-400 font-medium">Low Completeness Suppliers</p>
              <p className="text-2xl font-heading font-bold text-rose-400 mt-1">3</p>
              <p className="text-xs text-dark-400 mt-1">Below 50% data completeness</p>
            </div>
          </div>

          {/* Supplier chart */}
          <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
            <h3 className="text-lg font-heading font-semibold text-white mb-4">Supplier Emissions (thousand tCO&#x2082;e)</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supplierChartData} layout="vertical" margin={{ left: 100, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#2A2F3A" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={{ stroke: '#2A2F3A' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#6B7280' }} width={100} axisLine={{ stroke: '#2A2F3A' }} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString()}K tCO\u2082e`, 'Emissions']}
                    contentStyle={{ background: '#1A1D25', border: '1px solid #2A2F3A', borderRadius: '12px', color: '#E2E8F0', fontSize: '12px' }}
                  />
                  <Bar dataKey="emissions" radius={[0, 4, 4, 0]}>
                    {supplierChartData.map((_, i) => (
                      <Cell key={i} fill={suppliers[i].dataCompleteness < 50 ? '#EF4444' : suppliers[i].dataCompleteness < 80 ? '#F59E0B' : '#2DD4BF'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Supplier table */}
          <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
            <h3 className="text-lg font-heading font-semibold text-white mb-4">Tier 1 Supplier Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-600">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Supplier</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Category</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Est. Emissions</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Data Completeness</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Status</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s, i) => (
                    <tr key={s.id} className={i % 2 === 0 ? 'bg-dark-750' : ''}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Factory className="w-4 h-4 text-dark-400" />
                          <span className="font-medium text-white">{s.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-dark-300">{s.category}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-dark-300">{formatNumber(s.estimatedEmissions)}</span>
                          <Shield className="w-3 h-3 text-accent-400" />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${s.dataCompleteness >= 80 ? 'bg-teal-500' : s.dataCompleteness >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${s.dataCompleteness}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold ${s.dataCompleteness >= 80 ? 'text-teal-400' : s.dataCompleteness >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {s.dataCompleteness}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {s.status === 'complete' ? (
                          <span className="badge-verified"><Shield className="w-3 h-3" /> Complete</span>
                        ) : s.status === 'partial' ? (
                          <span className="badge-pending">Partial</span>
                        ) : (
                          <span className="badge-flagged"><AlertTriangle className="w-3 h-3" /> Incomplete</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {s.dataCompleteness < 80 && (
                          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent-400 bg-accent-500/15 rounded-lg border border-accent-500/20 hover:bg-accent-500/25 transition-colors">
                            <Mail className="w-3 h-3" />
                            Engage
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ metric }: { metric: { metric: string; value: number; unit: string; target: number; yoyChange: number } }) {
  return (
    <div className="border border-dark-600 rounded-xl p-4 bg-dark-750">
      <p className="text-xs text-dark-400">{metric.metric}</p>
      <div className="flex items-end gap-1.5 mt-1.5">
        <span className="text-xl font-heading font-bold text-white">
          {metric.value >= 1000 ? formatNumber(metric.value) : metric.value}
        </span>
        <span className="text-xs text-dark-400 mb-0.5">{metric.unit}</span>
      </div>
      <div className="flex items-center gap-1 mt-1.5">
        {metric.yoyChange > 0 ? (
          <TrendingUp className="w-3 h-3 text-teal-400" />
        ) : (
          <TrendingDown className="w-3 h-3 text-rose-400" />
        )}
        <span className={`text-xs font-medium ${metric.yoyChange > 0 ? 'text-teal-400' : 'text-rose-400'}`}>
          {metric.yoyChange > 0 ? '+' : ''}{metric.yoyChange}% YoY
        </span>
      </div>
    </div>
  )
}
