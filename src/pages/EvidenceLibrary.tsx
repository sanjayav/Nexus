import { useState } from 'react'
import { Eye, Link2, Search, UploadCloud, Tag, Calendar, AlertCircle, CheckCircle2, Shield, Database } from 'lucide-react'
import clsx from 'clsx'
import { mockData } from '../data/mockData'

export default function EvidenceLibrary() {
  const { evidence } = mockData
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  return (
    <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-500">

      {/* Top Cards matching "Over all information" from the design */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

        {/* Black summary card */}
        <div className="md:col-span-2 bg-black text-white rounded-[2rem] p-8 shadow-2xl shadow-black/20 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

          <div>
            <div className="flex justify-between items-start mb-6">
              <span className="text-sm font-semibold opacity-80 uppercase tracking-widest">Evidence Vault</span>
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold bg-indigo-400/10 px-3 py-1.5 rounded-full border border-indigo-400/20">
                <Database className="w-3 h-3" /> VERIFIED
              </div>
            </div>
            <div className="flex items-baseline gap-3 mb-8">
              <span className="text-6xl font-bold tracking-tighter">142</span>
              <span className="text-sm text-white/50 uppercase tracking-widest font-bold">Total Artifacts</span>
            </div>
          </div>

          {/* Mini Stats Equivalent */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-2xl p-4 border border-white/5 hover:bg-white/20 transition-colors cursor-pointer">
              <span className="block text-2xl font-bold">67%</span>
              <span className="block text-[10px] opacity-70 mt-1 uppercase tracking-widest flex items-center gap-1">Re-use Rate <span className="text-emerald-400">↗</span></span>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 border border-white/5 hover:bg-white/20 transition-colors cursor-pointer">
              <span className="block text-2xl font-bold">8</span>
              <span className="block text-[10px] opacity-70 mt-1 uppercase tracking-widest text-amber-300">Orphaned</span>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 border border-white/5 hover:bg-white/20 transition-colors cursor-pointer">
              <span className="block text-2xl font-bold">94%</span>
              <span className="block text-[10px] opacity-70 mt-1 uppercase tracking-widest text-emerald-300">Coverage</span>
            </div>
          </div>
        </div>

        {/* White Action Card - Upload */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                <UploadCloud className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold opacity-80">Ingestion</span>
            </div>
            <h3 className="text-xl font-bold text-black leading-tight mb-2">Upload Artifacts</h3>
            <p className="text-xs text-black/50 font-medium">Auto-extract metadata, apply hashes, and map to frameworks.</p>
          </div>

          <button className="w-full py-3 bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:scale-[1.02] shadow-xl shadow-black/20 transition-all flex items-center justify-center gap-2 mt-4">
            Bulk Upload <span className="text-lg leading-none">+</span>
          </button>
        </div>

        {/* Expiring Alerts Card */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm font-bold text-black uppercase tracking-widest opacity-60">Alerts</span>
              <AlertCircle className="w-5 h-5 text-rose-500" />
            </div>
            <div className="flex items-end gap-3 mb-2">
              <span className="text-5xl font-bold tracking-tighter text-black">2</span>
            </div>
            <p className="text-xs text-black/50 font-bold uppercase tracking-widest">
              Expiring within 30 days
            </p>
          </div>

          <button className="w-full py-3 bg-white border border-black/10 text-black text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-black/5 transition-all flex items-center justify-center gap-2 mt-4">
            View Renewals
          </button>
        </div>
      </div>

      {/* Main Table Area (White Glassmorphic) */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg flex flex-col h-full min-h-[500px]">
        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Evidence ID, CID, tags..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/50 border border-white focus:border-black/20 text-sm font-medium text-black focus:outline-none focus:ring-4 focus:ring-black/5 transition-all placeholder:text-black/30"
            />
          </div>
          <select className="px-4 py-3 rounded-xl bg-white/50 border border-white text-sm font-bold text-black/70 focus:outline-none focus:ring-4 focus:ring-black/5">
            <option>All Modules</option>
            <option>GRI</option>
            <option>CSRD</option>
            <option>IFRS S1</option>
          </select>
          <select className="px-4 py-3 rounded-xl bg-white/50 border border-white text-sm font-bold text-black/70 focus:outline-none focus:ring-4 focus:ring-black/5">
            <option>All Types</option>
            <option>xlsx</option>
            <option>json</option>
            <option>pdf</option>
          </select>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 text-xs mb-8 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setStatusFilter('all')}
            className={clsx("px-4 py-2 rounded-full font-bold uppercase tracking-widest transition-all whitespace-nowrap", statusFilter === 'all' ? 'bg-black text-white shadow-md' : 'bg-white/50 text-black/50 hover:bg-white hover:text-black')}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('linked')}
            className={clsx("px-4 py-2 rounded-full font-bold uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1.5", statusFilter === 'linked' ? 'bg-indigo-500 text-white shadow-md' : 'bg-white/50 text-black/50 hover:bg-white hover:text-black')}
          >
            <Link2 className="w-3.5 h-3.5" /> Linked
          </button>
          <button
            onClick={() => setStatusFilter('orphaned')}
            className={clsx("px-4 py-2 rounded-full font-bold uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1.5", statusFilter === 'orphaned' ? 'bg-amber-500 text-white shadow-md' : 'bg-white/50 text-black/50 hover:bg-white hover:text-black')}
          >
            <AlertCircle className="w-3.5 h-3.5" /> Orphaned
          </button>
          <button
            onClick={() => setStatusFilter('expiring')}
            className={clsx("px-4 py-2 rounded-full font-bold uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1.5", statusFilter === 'expiring' ? 'bg-rose-500 text-white shadow-md' : 'bg-white/50 text-black/50 hover:bg-white hover:text-black')}
          >
            <Calendar className="w-3.5 h-3.5" /> Expiring
          </button>
          <button
            onClick={() => setStatusFilter('verified')}
            className={clsx("px-4 py-2 rounded-full font-bold uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1.5", statusFilter === 'verified' ? 'bg-emerald-500 text-white shadow-md' : 'bg-white/50 text-black/50 hover:bg-white hover:text-black')}
          >
            <Shield className="w-3.5 h-3.5" /> Verified
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-black/10 text-[10px] font-bold text-black/40 uppercase tracking-widest">
                <th className="pb-4 font-bold">Evidence ID / CID</th>
                <th className="pb-4 font-bold">Linked To</th>
                <th className="pb-4 font-bold">Type</th>
                <th className="pb-4 font-bold">Tags</th>
                <th className="pb-4 font-bold">Integrity</th>
                <th className="pb-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {evidence.map((item) => (
                <tr key={item.id} className="hover:bg-white/40 transition-colors group">
                  <td className="py-4">
                    <div className="font-bold text-sm text-black">{item.id}</div>
                    <div className="font-mono text-[10px] text-black/40 mt-1 uppercase tracking-widest truncate max-w-[180px]" title={item.cid}>
                      CID: {item.cid?.slice(0, 12)}...
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-700 rounded text-[10px] font-bold uppercase tracking-wider">
                        GRI 305-1
                      </span>
                      {item.id === 'EV-20251201-GRI305-003' && (
                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-700 rounded text-[10px] font-bold uppercase tracking-wider">
                          IFRS S2
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4">
                    <span className="px-2 py-1 rounded bg-black/5 text-black/60 font-mono text-[10px] uppercase font-bold tracking-widest">
                      {item.mime.includes('spreadsheet') ? 'xlsx' : item.mime.includes('json') ? 'json' : 'pdf'}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-purple-500/10 text-purple-700 border border-purple-500/20 flex items-center gap-1">
                        <Tag className="w-3 h-3" /> emissions
                      </span>
                    </div>
                  </td>
                  <td className="py-4">
                    {item.anchored ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 w-max">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 text-amber-700 w-max">
                        <AlertCircle className="w-3.5 h-3.5" /> Pending
                      </span>
                    )}
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 rounded-full hover:bg-black/5 text-black/60 hover:text-black transition-colors" title="Preview">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-full hover:bg-black/5 text-black/60 hover:text-black transition-colors" title="Tag & Map">
                        <Tag className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-full hover:bg-black/5 text-black/60 hover:text-emerald-600 transition-colors" title="Verify Proof">
                        <Shield className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
