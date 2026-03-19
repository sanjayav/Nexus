import { useState } from 'react'
import {
    CheckSquare, Clock, AlertCircle, Filter, Search,
    ChevronRight, CornerDownRight, MessageSquare, Tag
} from 'lucide-react'
import clsx from 'clsx'

const INBOX_TASKS = [
    {
        id: 'TASK-1049',
        title: 'Review missing Scope 3 Transportation emissions',
        module: 'GRI Standards',
        dueDate: 'Today, 5:00 PM',
        priority: 'high',
        status: 'pending',
        type: 'review',
        assignedBy: 'System Auto-flag',
    },
    {
        id: 'TASK-1048',
        title: 'Upload Q3 Utility Bills for Oman Rail',
        module: 'Data Connectors',
        dueDate: 'Tommorow, 10:00 AM',
        priority: 'medium',
        status: 'pending',
        type: 'upload',
        assignedBy: 'Jane Manager',
    },
    {
        id: 'TASK-1045',
        title: 'Sign-off on DMA final material topics',
        module: 'Double Materiality',
        dueDate: 'Oct 24, 2024',
        priority: 'high',
        status: 'pending',
        type: 'approval',
        assignedBy: 'Alex Compliance',
    },
    {
        id: 'TASK-1042',
        title: 'Verify SAP S/4HANA connector token expiration',
        module: 'Settings',
        dueDate: 'Oct 28, 2024',
        priority: 'low',
        status: 'pending',
        type: 'system',
        assignedBy: 'System Alert',
    }
]

export default function TaskInbox() {
    const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending')
    const [searchQuery, setSearchQuery] = useState('')

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-rose-500/10 text-rose-700 border-rose-500/20'
            case 'medium': return 'bg-amber-500/10 text-amber-700 border-amber-500/20'
            default: return 'bg-black/5 text-black/60 border-black/10'
        }
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'review': return <AlertCircle className="w-4 h-4 text-rose-500" />
            case 'upload': return <CornerDownRight className="w-4 h-4 text-indigo-500" />
            case 'approval': return <CheckSquare className="w-4 h-4 text-emerald-500" />
            default: return <Tag className="w-4 h-4 text-black/40" />
        }
    }

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-black tracking-tight mb-2">Task Inbox</h1>
                    <p className="text-sm font-medium text-black/60">
                        Manage your assigned data requests, reviews, and framework approvals.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white border border-black/10 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/5 shadow-sm w-full sm:w-64"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-black/10 rounded-xl text-sm font-bold text-black hover:bg-black/5 transition-colors shadow-sm">
                        <Filter className="w-4 h-4" /> Filter
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-8 min-h-0">
                {/* Main Inbox List */}
                <div className="flex-1 bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">
                    <div className="flex items-center gap-6 px-8 py-5 border-b border-black/5 bg-white/40">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={clsx(
                                "text-sm font-bold pb-1 border-b-2 transition-all",
                                activeTab === 'pending' ? "border-black text-black" : "border-transparent text-black/40 hover:text-black"
                            )}
                        >
                            Action Required <span className="ml-1.5 px-2 py-0.5 bg-rose-500 text-white text-[10px] rounded-full">3</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('completed')}
                            className={clsx(
                                "text-sm font-bold pb-1 border-b-2 transition-all",
                                activeTab === 'completed' ? "border-black text-black" : "border-transparent text-black/40 hover:text-black"
                            )}
                        >
                            Completed
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {INBOX_TASKS.filter(task => {
                            const matchesTab = activeTab === 'pending' ? task.status === 'pending' : task.status === 'completed';
                            const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || task.module.toLowerCase().includes(searchQuery.toLowerCase());
                            return matchesTab && matchesSearch;
                        }).map((task) => (
                            <div key={task.id} className="group bg-white border border-black/5 hover:border-black/10 rounded-2xl p-4 flex items-center gap-4 transition-all shadow-sm cursor-pointer hover:shadow-md">
                                <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center shrink-0">
                                    {getTypeIcon(task.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="text-sm font-bold text-black truncate pr-4">{task.title}</h3>
                                        <span className={clsx("px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-widest shrink-0", getPriorityColor(task.priority))}>
                                            {task.priority}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-[11px] font-semibold text-black/50 uppercase tracking-wider">
                                        <span className="truncate">Module: {task.module}</span>
                                        <span className="w-1 h-1 rounded-full bg-black/20" />
                                        <span className="flex items-center gap-1.5 text-rose-600"><Clock className="w-3.5 h-3.5" /> Due: {task.dueDate}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="w-8 h-8 rounded-lg bg-black/5 hover:bg-black/10 flex items-center justify-center text-black/50 transition-colors">
                                        <MessageSquare className="w-4 h-4" />
                                    </button>
                                    <button className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center transition-transform hover:scale-105 shadow-md">
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel / Context (Optional functionality space) */}
                <div className="w-full md:w-80 shrink-0 flex flex-col gap-6 hidden xl:flex">
                    <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-black mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-indigo-500" /> Upcoming Deadlines
                        </h3>
                        <div className="space-y-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Today</span>
                                <div className="text-sm font-semibold text-black border-l-2 border-rose-500 pl-3">Scope 3 Transport Review</div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Tomorrow</span>
                                <div className="text-sm font-semibold text-black border-l-2 border-amber-500 pl-3">Oman Rail Utilities Data</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-[2rem] p-6 relative overflow-hidden text-center">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-[30px]" />
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm mx-auto mb-3 flex items-center justify-center relative z-10">
                            <CheckSquare className="w-6 h-6 text-indigo-500" />
                        </div>
                        <h4 className="text-sm font-bold text-black mb-1 relative z-10">Inbox Zero</h4>
                        <p className="text-xs font-medium text-black/60 relative z-10">You're 3 tasks away from completing all assigned data requests.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
