import { Download, FileText, Search } from 'lucide-react'
import { mockData } from '../data/mockData'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

export default function AnchorsEvents() {
  const { anchorsEvents } = mockData

  // Mock data for charts
  const eventsOverTime = [
    { date: 'Nov 01', events: 12 },
    { date: 'Nov 02', events: 8 },
    { date: 'Nov 03', events: 15 },
    { date: 'Nov 04', events: 10 },
    { date: 'Nov 05', events: 18 },
    { date: 'Nov 06', events: 14 },
    { date: 'Nov 07', events: 20 },
  ]

  const approvalsVsRejections = [
    { module: 'GRI', approved: 45, rejected: 3 },
    { module: 'MSX', approved: 32, rejected: 2 },
    { module: 'S1', approved: 28, rejected: 1 },
    { module: 'S2', approved: 35, rejected: 2 },
  ]

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by event, submission ID, or DID..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-dark-bg border border-dark-border text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <select className="px-4 py-2 rounded-lg bg-dark-bg border border-dark-border text-sm focus:outline-none focus:ring-2 focus:ring-accent">
            <option>All Event Types</option>
            <option>Anchor</option>
            <option>Approval</option>
            <option>Upload</option>
            <option>Validation</option>
          </select>
          <select className="px-4 py-2 rounded-lg bg-dark-bg border border-dark-border text-sm focus:outline-none focus:ring-2 focus:ring-accent">
            <option>All Modules</option>
            <option>GRI</option>
            <option>MSX</option>
            <option>S1</option>
            <option>S2</option>
          </select>
          <select className="px-4 py-2 rounded-lg bg-dark-bg border border-dark-border text-sm focus:outline-none focus:ring-2 focus:ring-accent">
            <option>All Periods</option>
            <option>FY2025</option>
            <option>FY2024</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dark-border hover:border-accent transition-colors">
            <Download className="w-4 h-4" />
            <span className="text-sm">Export CSV</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dark-border hover:border-accent transition-colors">
            <Download className="w-4 h-4" />
            <span className="text-sm">Export JSON</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-dark-bg hover:bg-accent/90 transition-colors">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Generate Audit Pack</span>
          </button>
        </div>
      </div>

      {/* Mini Charts */}
      <div className="grid grid-cols-3 gap-4">
        {/* Events Over Time */}
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border col-span-2">
          <h3 className="text-lg font-semibold mb-4">Events Over Time</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={eventsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#233047" />
              <XAxis dataKey="date" stroke="#E6EAF2" style={{ fontSize: '12px' }} />
              <YAxis stroke="#E6EAF2" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#141C2A',
                  border: '1px solid #233047',
                  borderRadius: '8px',
                }}
              />
              <Line type="monotone" dataKey="events" stroke="#00D48E" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Avg Time to Approve */}
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <h3 className="text-lg font-semibold mb-4">Avg Time to Approve</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">2.8</span>
            <span className="text-xl text-gray-400">days</span>
          </div>
          <div className="text-sm text-emerald-400 mt-2">↓ 15% from last period</div>
          <div className="mt-4 space-y-2">
            <div>
              <div className="text-xs text-gray-400 mb-1">GRI: 2.1d</div>
              <div className="h-1 bg-dark-bg rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: '70%' }} />
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">MSX: 3.5d</div>
              <div className="h-1 bg-dark-bg rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: '50%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Approvals vs Rejections */}
      <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
        <h3 className="text-lg font-semibold mb-4">Approvals vs Rejections</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={approvalsVsRejections}>
            <CartesianGrid strokeDasharray="3 3" stroke="#233047" />
            <XAxis dataKey="module" stroke="#E6EAF2" style={{ fontSize: '12px' }} />
            <YAxis stroke="#E6EAF2" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#141C2A',
                border: '1px solid #233047',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar dataKey="approved" fill="#00D48E" radius={[4, 4, 0, 0]} name="Approved" />
            <Bar dataKey="rejected" fill="#f87171" radius={[4, 4, 0, 0]} name="Rejected" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Events Table */}
      <div className="bg-dark-surface rounded-2xl border border-dark-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border bg-dark-bg">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Event</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">
                  Period
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Module</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">
                  Submission ID
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">
                  Merkle Root
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">CID</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">
                  Tx Hash
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">By</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody>
              {anchorsEvents.map((event, index) => (
                <tr key={index} className="border-b border-dark-border hover:bg-dark-bg/50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium">{event.event}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">{event.periodId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded text-xs bg-blue-500/10 border border-blue-500/30 text-blue-400">
                      {event.moduleId}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-mono text-sm">{event.submissionId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-mono text-xs text-gray-400">
                      {event.merkleRoot || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-mono text-xs text-gray-400 max-w-[150px] truncate">
                      {event.cid}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-mono text-xs text-gray-400">
                      {event.txHash || 'Pending'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-mono text-xs">{event.by.slice(0, 20)}...</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-400">
                      {new Date(event.timestamp).toLocaleString()}
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

