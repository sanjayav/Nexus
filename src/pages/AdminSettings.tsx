import { Link2, Server, Database, Bell, Shield, Save, Settings, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AdminSettings() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <h2 className="text-3xl font-bold mb-6 text-black tracking-tight">Admin & Settings</h2>

      {/* Quick Links */}
      <div className="bg-[#12C87A]/5 border border-[#12C87A]/20 rounded-[2rem] p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-white rounded-xl shadow-sm border border-black/5">
            <Settings className="w-5 h-5 text-[#013328]" />
          </div>
          <h3 className="text-lg font-bold text-black">Quick Access</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Link
            to="/admin/organization"
            className="flex items-center justify-between p-6 bg-white border border-black/10 rounded-2xl hover:border-[#12C87A]/50 hover:shadow-md transition-all group"
          >
            <div>
              <div className="font-bold text-black mb-1">Organization Setup</div>
              <div className="text-xs text-black/50 font-medium tracking-wide">Region mode, frameworks, roles</div>
            </div>
            <ArrowRight className="w-5 h-5 text-black/30 group-hover:text-[#12C87A] group-hover:translate-x-1 transition-all" />
          </Link>
          <Link
            to="/period/create"
            className="flex items-center justify-between p-6 bg-white border border-black/10 rounded-2xl hover:border-[#12C87A]/50 hover:shadow-md transition-all group"
          >
            <div>
              <div className="font-bold text-black mb-1">Create Reporting Period</div>
              <div className="text-xs text-black/50 font-medium tracking-wide">New FY workspace setup</div>
            </div>
            <ArrowRight className="w-5 h-5 text-black/30 group-hover:text-[#12C87A] group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>

      {/* Chain Configuration */}
      <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] p-8 border border-white/60 shadow-lg">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-black/5 rounded-xl border border-black/5">
            <Link2 className="w-5 h-5 text-black" />
          </div>
          <h3 className="text-xl font-bold text-black">Chain Configuration</h3>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-black/60 uppercase tracking-widest mb-2">Chain ID</label>
            <input
              type="text"
              value="zkEVM"
              readOnly
              className="w-full px-4 py-3 rounded-xl bg-black/5 border border-black/5 text-sm font-semibold text-black focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-black/60 uppercase tracking-widest mb-2">RPC Endpoint</label>
            <input
              type="text"
              defaultValue="https://zkevm-rpc.com"
              className="w-full px-4 py-3 rounded-xl bg-white border border-black/10 text-sm font-semibold text-black focus:outline-none focus:border-[#12C87A] shadow-sm transition-colors"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-bold text-black/60 uppercase tracking-widest mb-2">Contract Address</label>
            <input
              type="text"
              defaultValue="0x1234567890abcdef1234567890abcdef12345678"
              className="w-full px-4 py-3 rounded-xl bg-white border border-black/10 text-sm font-mono font-bold text-black focus:outline-none focus:border-[#12C87A] shadow-sm transition-colors"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-bold text-black/60 uppercase tracking-widest mb-2">ABI Hash</label>
            <input
              type="text"
              value="0xabcdef1234567890abcdef1234567890abcdef12"
              readOnly
              className="w-full px-4 py-3 rounded-xl bg-black/5 border border-black/5 text-sm font-mono font-bold text-black/70 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>
      </div>

      {/* Relayer Configuration */}
      <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] p-8 border border-white/60 shadow-lg">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-black/5 rounded-xl border border-black/5">
            <Server className="w-5 h-5 text-black" />
          </div>
          <h3 className="text-xl font-bold text-black">Relayer Configuration</h3>
        </div>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-5 rounded-2xl bg-white border border-black/5 shadow-sm">
            <div>
              <div className="font-bold text-black mb-1">Relayer Health</div>
              <div className="text-xs text-black/50 font-medium tracking-wide">Last sync: 2024-11-12 10:45:00 UTC</div>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#12C87A]/10 border border-[#12C87A]/30 flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#12C87A] animate-pulse"></span>
              <span className="text-xs font-bold text-[#013328] uppercase tracking-widest">OK</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-black/60 uppercase tracking-widest mb-2">Relayer Endpoint</label>
            <input
              type="text"
              defaultValue="https://relayer.aeiforo.com"
              className="w-full px-4 py-3 rounded-xl bg-white border border-black/10 text-sm font-semibold text-black focus:outline-none focus:border-[#12C87A] shadow-sm transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-black/60 uppercase tracking-widest mb-2">API Key</label>
            <input
              type="password"
              defaultValue="sk_live_1234567890abcdef"
              className="w-full px-4 py-3 rounded-xl bg-white border border-black/10 text-sm font-mono font-bold text-black focus:outline-none focus:border-[#12C87A] shadow-sm transition-colors tracking-[0.2em]"
            />
          </div>
        </div>
      </div>

      {/* IPFS Configuration */}
      <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] p-8 border border-white/60 shadow-lg">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-black/5 rounded-xl border border-black/5">
            <Database className="w-5 h-5 text-black" />
          </div>
          <h3 className="text-xl font-bold text-black">IPFS Configuration</h3>
        </div>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-5 rounded-2xl bg-white border border-black/5 shadow-sm">
            <div>
              <div className="font-bold text-black mb-1">IPFS Status</div>
              <div className="text-xs text-black/50 font-medium tracking-wide">487 items pinned correctly.</div>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-widest">Pinned</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-black/60 uppercase tracking-widest mb-2">Gateway URL</label>
            <input
              type="text"
              defaultValue="https://ipfs.io"
              className="w-full px-4 py-3 rounded-xl bg-white border border-black/10 text-sm font-semibold text-black focus:outline-none focus:border-[#12C87A] shadow-sm transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-black/60 uppercase tracking-widest mb-2">Pin Policy</label>
            <select className="w-full px-4 py-3 rounded-xl bg-white border border-black/10 text-sm font-semibold text-black focus:outline-none focus:border-[#12C87A] shadow-sm transition-colors appearance-none cursor-pointer">
              <option>Pin all anchored evidence</option>
              <option>Pin on demand</option>
              <option>Pin manually</option>
            </select>
          </div>
        </div>
      </div>

      {/* SLA & Retention */}
      <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] p-8 border border-white/60 shadow-lg">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-black/5 rounded-xl border border-black/5">
            <Shield className="w-5 h-5 text-black" />
          </div>
          <h3 className="text-xl font-bold text-black">SLA & Retention</h3>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-black/60 uppercase tracking-widest mb-2">SLA Threshold (days)</label>
            <input
              type="number"
              defaultValue="5"
              className="w-full px-4 py-3 rounded-xl bg-white border border-black/10 text-sm font-semibold text-black focus:outline-none focus:border-[#12C87A] shadow-sm transition-colors"
            />
            <div className="text-[10px] font-bold uppercase tracking-widest text-black/40 mt-2">Alert when items exceed this time</div>
          </div>
          <div>
            <label className="block text-xs font-bold text-black/60 uppercase tracking-widest mb-2">Export Retention (days)</label>
            <input
              type="number"
              defaultValue="90"
              className="w-full px-4 py-3 rounded-xl bg-white border border-black/10 text-sm font-semibold text-black focus:outline-none focus:border-[#12C87A] shadow-sm transition-colors"
            />
            <div className="text-[10px] font-bold uppercase tracking-widest text-black/40 mt-2">Keep exports for this duration</div>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-bold text-black/60 uppercase tracking-widest mb-2">Backup Schedule</label>
            <select className="w-full px-4 py-3 rounded-xl bg-white border border-black/10 text-sm font-semibold text-black focus:outline-none focus:border-[#12C87A] shadow-sm transition-colors appearance-none cursor-pointer">
              <option>Daily at 00:00 UTC</option>
              <option>Weekly on Sunday</option>
              <option>Monthly on 1st</option>
            </select>
          </div>
        </div>
      </div>

      {/* Webhooks & Notifications */}
      <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] p-8 border border-white/60 shadow-lg">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-black/5 rounded-xl border border-black/5">
            <Bell className="w-5 h-5 text-black" />
          </div>
          <h3 className="text-xl font-bold text-black">Webhooks & Notifications</h3>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-black/60 uppercase tracking-widest mb-2">Slack Webhook URL</label>
            <input
              type="text"
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-4 py-3 rounded-xl bg-white border border-black/10 text-sm font-semibold text-black focus:outline-none focus:border-[#12C87A] shadow-sm transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-black/60 uppercase tracking-widest mb-2">Email Notifications</label>
            <input
              type="email"
              placeholder="admin@company.com"
              className="w-full px-4 py-3 rounded-xl bg-white border border-black/10 text-sm font-semibold text-black focus:outline-none focus:border-[#12C87A] shadow-sm transition-colors"
            />
          </div>
          <div className="space-y-3">
            <div className="text-xs font-bold text-black/60 uppercase tracking-widest mb-3">Notification Events</div>
            <label className="flex items-center gap-3 p-4 rounded-xl bg-white border border-black/5 cursor-pointer hover:border-[#12C87A]/50 hover:shadow-sm transition-all shadow-sm">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-[#12C87A] focus:ring-[#12C87A]" />
              <span className="text-sm font-bold text-black">Failed validations</span>
            </label>
            <label className="flex items-center gap-3 p-4 rounded-xl bg-white border border-black/5 cursor-pointer hover:border-[#12C87A]/50 hover:shadow-sm transition-all shadow-sm">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-[#12C87A] focus:ring-[#12C87A]" />
              <span className="text-sm font-bold text-black">SLA breaches</span>
            </label>
            <label className="flex items-center gap-3 p-4 rounded-xl bg-white border border-black/5 cursor-pointer hover:border-[#12C87A]/50 hover:shadow-sm transition-all shadow-sm">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-[#12C87A] focus:ring-[#12C87A]" />
              <span className="text-sm font-bold text-black">New approvals required</span>
            </label>
            <label className="flex items-center gap-3 p-4 rounded-xl bg-white border border-black/5 cursor-pointer hover:border-[#12C87A]/50 hover:shadow-sm transition-all shadow-sm">
              <input type="checkbox" className="w-4 h-4 rounded text-[#12C87A] focus:ring-[#12C87A]" />
              <span className="text-sm font-bold text-black">Daily digest</span>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 pb-8">
        <button className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-black text-white text-xs font-bold uppercase tracking-widest hover:scale-105 hover:shadow-lg hover:shadow-black/20 transition-all">
          <Save className="w-4 h-4" />
          <span>Save Configuration</span>
        </button>
      </div>
    </div>
  )
}

