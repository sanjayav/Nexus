import { Users, Shield, CheckCircle2, XCircle, Search } from 'lucide-react'
import { mockData } from '../data/mockData'
import { useState } from 'react'

export default function RolesCredentials() {
  const { rolesCredentials } = mockData
  const [showMyApprovals, setShowMyApprovals] = useState(false)

  return (
    <div className="space-y-6">
      {/* Overview Counters */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-sm text-gray-400">Active DIDs</div>
          </div>
          <div className="text-3xl font-bold">{rolesCredentials.length}</div>
          <div className="text-xs text-gray-400 mt-2">By role</div>
        </div>

        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-sm text-gray-400">VC Hashes Registered</div>
          </div>
          <div className="text-3xl font-bold">{rolesCredentials.length}</div>
          <div className="text-xs text-gray-400 mt-2">Verifiable credentials</div>
        </div>

        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-rose-500/10">
              <XCircle className="w-5 h-5 text-rose-400" />
            </div>
            <div className="text-sm text-gray-400">Last Revocation</div>
          </div>
          <div className="text-3xl font-bold">0</div>
          <div className="text-xs text-gray-400 mt-2">No recent revocations</div>
        </div>

        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <CheckCircle2 className="w-5 h-5 text-accent" />
            </div>
            <div className="text-sm text-gray-400">Total Actions</div>
          </div>
          <div className="text-3xl font-bold">
            {rolesCredentials.reduce((sum, cred) => sum + cred.actionsCount, 0)}
          </div>
          <div className="text-xs text-gray-400 mt-2">Anchors + approvals</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by DID or VC hash..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-dark-bg border border-dark-border text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <select className="px-4 py-2 rounded-lg bg-dark-bg border border-dark-border text-sm focus:outline-none focus:ring-2 focus:ring-accent">
            <option>All Roles</option>
            <option>Approver</option>
            <option>Reviewer</option>
            <option>Analyst</option>
          </select>
          <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dark-border hover:border-accent transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={showMyApprovals}
              onChange={(e) => setShowMyApprovals(e.target.checked)}
              className="w-4 h-4 rounded border-dark-border bg-dark-bg text-accent focus:ring-2 focus:ring-accent"
            />
            <span className="text-sm">Show my approvals</span>
          </label>
        </div>
      </div>

      {/* Roles Table */}
      <div className="bg-dark-surface rounded-2xl border border-dark-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border bg-dark-bg">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">DID</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Role</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">
                  VC Hash
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">
                  Issued At
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">
                  Revoked?
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">
                  Actions Count
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">
                  Last Activity
                </th>
              </tr>
            </thead>
            <tbody>
              {rolesCredentials.map((credential) => (
                <tr
                  key={credential.did}
                  className="border-b border-dark-border hover:bg-dark-bg/50"
                >
                  <td className="px-6 py-4">
                    <div className="font-mono text-sm">{credential.did}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs border ${
                        credential.role === 'Approver'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : credential.role === 'Reviewer'
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                          : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                      }`}
                    >
                      {credential.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-mono text-xs text-gray-400">{credential.vcHash}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-400">{credential.issuedAt}</div>
                  </td>
                  <td className="px-6 py-4">
                    {credential.revoked ? (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium">{credential.actionsCount}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-400">{credential.lastActivity}</div>
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

