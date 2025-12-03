import { Link2, Server, Database, Bell, Shield, Save, Settings, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AdminSettings() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold mb-6">Admin & Settings</h2>

      {/* Quick Links */}
      <div className="bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold text-white">Quick Access</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/admin/organization"
            className="flex items-center justify-between p-4 bg-dark-surface border border-dark-border rounded-xl hover:border-accent transition-colors group"
          >
            <div>
              <div className="font-medium text-white">Organization Setup</div>
              <div className="text-xs text-gray-400 mt-1">Region mode, frameworks, roles</div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-accent transition-colors" />
          </Link>
          <Link
            to="/period/create"
            className="flex items-center justify-between p-4 bg-dark-surface border border-dark-border rounded-xl hover:border-accent transition-colors group"
          >
            <div>
              <div className="font-medium text-white">Create Reporting Period</div>
              <div className="text-xs text-gray-400 mt-1">New FY workspace setup</div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-accent transition-colors" />
          </Link>
        </div>
      </div>

      {/* Chain Configuration */}
      <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
        <div className="flex items-center gap-3 mb-6">
          <Link2 className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold">Chain Configuration</h3>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Chain ID</label>
            <input
              type="text"
              value="zkEVM"
              readOnly
              className="w-full px-4 py-2 rounded-lg bg-dark-bg border border-dark-border text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">RPC Endpoint</label>
            <input
              type="text"
              value="https://zkevm-rpc.com"
              className="w-full px-4 py-2 rounded-lg bg-dark-bg border border-dark-border text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Contract Address</label>
            <input
              type="text"
              value="0x1234567890abcdef1234567890abcdef12345678"
              className="w-full px-4 py-2 rounded-lg bg-dark-bg border border-dark-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">ABI Hash</label>
            <input
              type="text"
              value="0xabcdef1234567890abcdef1234567890abcdef12"
              readOnly
              className="w-full px-4 py-2 rounded-lg bg-dark-bg border border-dark-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
      </div>

      {/* Relayer Configuration */}
      <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
        <div className="flex items-center gap-3 mb-6">
          <Server className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold">Relayer Configuration</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-dark-bg border border-dark-border">
            <div>
              <div className="font-medium mb-1">Relayer Health</div>
              <div className="text-sm text-gray-400">Last sync: 2024-11-12 10:45:00 UTC</div>
            </div>
            <div className="px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-sm font-medium text-emerald-400">OK</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Relayer Endpoint</label>
            <input
              type="text"
              value="https://relayer.aeiforo.com"
              className="w-full px-4 py-2 rounded-lg bg-dark-bg border border-dark-border text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">API Key</label>
            <input
              type="password"
              value="sk_live_••••••••••••••••"
              className="w-full px-4 py-2 rounded-lg bg-dark-bg border border-dark-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
      </div>

      {/* IPFS Configuration */}
      <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold">IPFS Configuration</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-dark-bg border border-dark-border">
            <div>
              <div className="font-medium mb-1">IPFS Status</div>
              <div className="text-sm text-gray-400">487 items pinned</div>
            </div>
            <div className="px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/30">
              <span className="text-sm font-medium text-blue-400">Pinned</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Gateway URL</label>
            <input
              type="text"
              value="https://ipfs.io"
              className="w-full px-4 py-2 rounded-lg bg-dark-bg border border-dark-border text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Pin Policy</label>
            <select className="w-full px-4 py-2 rounded-lg bg-dark-bg border border-dark-border text-sm focus:outline-none focus:ring-2 focus:ring-accent">
              <option>Pin all anchored evidence</option>
              <option>Pin on demand</option>
              <option>Pin manually</option>
            </select>
          </div>
        </div>
      </div>

      {/* SLA & Retention */}
      <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold">SLA & Retention</h3>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">SLA Threshold (days)</label>
            <input
              type="number"
              value="5"
              className="w-full px-4 py-2 rounded-lg bg-dark-bg border border-dark-border text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <div className="text-xs text-gray-400 mt-1">Alert when items exceed this time</div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Export Retention (days)</label>
            <input
              type="number"
              value="90"
              className="w-full px-4 py-2 rounded-lg bg-dark-bg border border-dark-border text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <div className="text-xs text-gray-400 mt-1">Keep exports for this duration</div>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Backup Schedule</label>
            <select className="w-full px-4 py-2 rounded-lg bg-dark-bg border border-dark-border text-sm focus:outline-none focus:ring-2 focus:ring-accent">
              <option>Daily at 00:00 UTC</option>
              <option>Weekly on Sunday</option>
              <option>Monthly on 1st</option>
            </select>
          </div>
        </div>
      </div>

      {/* Webhooks & Notifications */}
      <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold">Webhooks & Notifications</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Slack Webhook URL</label>
            <input
              type="text"
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-4 py-2 rounded-lg bg-dark-bg border border-dark-border text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email Notifications</label>
            <input
              type="email"
              placeholder="admin@company.com"
              className="w-full px-4 py-2 rounded-lg bg-dark-bg border border-dark-border text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium mb-3">Notification Events</div>
            <label className="flex items-center gap-2 p-3 rounded-lg bg-dark-bg border border-dark-border cursor-pointer hover:border-accent transition-colors">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
              <span className="text-sm">Failed validations</span>
            </label>
            <label className="flex items-center gap-2 p-3 rounded-lg bg-dark-bg border border-dark-border cursor-pointer hover:border-accent transition-colors">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
              <span className="text-sm">SLA breaches</span>
            </label>
            <label className="flex items-center gap-2 p-3 rounded-lg bg-dark-bg border border-dark-border cursor-pointer hover:border-accent transition-colors">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
              <span className="text-sm">New approvals required</span>
            </label>
            <label className="flex items-center gap-2 p-3 rounded-lg bg-dark-bg border border-dark-border cursor-pointer hover:border-accent transition-colors">
              <input type="checkbox" className="w-4 h-4 rounded" />
              <span className="text-sm">Daily digest</span>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-dark-bg font-semibold hover:bg-accent/90 transition-colors">
          <Save className="w-5 h-5" />
          <span>Save Configuration</span>
        </button>
      </div>
    </div>
  )
}

