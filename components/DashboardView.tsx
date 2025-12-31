
import React, { useState, useEffect } from 'react';
import { AppState, TaskStatus, Category, Task, Page } from '../types';
import { getNextPrayer } from '../utils';
import {
    Target,
    ArrowUpRight,
    Zap,
    Timer,
    Plus,
    Play,
    Pause,
    CheckCircle2,
    Flame,
    AlertTriangle,
    Calendar,
    Rocket,
    Layout,
    MapPin,
    Network,
    BookOpen,
    BrainCircuit,
    Cpu
} from 'lucide-react';

interface Props {
    state: AppState;
    onTaskUpdate: (id: string, updates: Partial<Task>) => void;
    onTaskAdd: (title: string, category: Category, impact: 'LOW' | 'MED' | 'HIGH') => void;
    onPrayerToggle: (key: string) => void;
    onStartSession: (id: string) => void;
    activeTaskId: string | null;
    onNavigate: (page: Page) => void;
}

const DashboardView: React.FC<Props> = ({ state, onTaskUpdate, onTaskAdd, onPrayerToggle, onStartSession, activeTaskId, onNavigate }) => {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const nextPrayer = getNextPrayer();
    const todayKey = new Date().toISOString().split('T')[0];
    const prayerKey = `${todayKey}-${nextPrayer.name}`;
    const isPrayerDone = state.prayerLog[prayerKey];

    // LOGIC: Show Today's tasks OR Overdue tasks
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const sortedTasks = state.tasks
        .filter(t => {
            if (t.status === TaskStatus.DONE) return false;
            if (t.status === TaskStatus.IN_PROGRESS) return true; // Always show active

            if (t.deadline) {
                // Show if deadline is today or in the past (overdue)
                return t.deadline <= endOfToday.getTime();
            }
            return false;
        })
        .sort((a, b) => {
            // Sort by Overdue first, then Impact
            const aDue = a.deadline || 0;
            const bDue = b.deadline || 0;
            if (aDue !== bDue) return aDue - bDue; // Earliest deadline first

            const impactScore = { 'HIGH': 3, 'MED': 2, 'LOW': 1 };
            return impactScore[b.impact] - impactScore[a.impact];
        });

    const overdueCount = sortedTasks.filter(t => t.deadline && t.deadline < startOfToday.getTime()).length;
    const completedToday = state.tasks.filter(t => t.status === TaskStatus.DONE && new Date(t.createdAt).getDate() === new Date().getDate());
    const progress = Math.min((state.metrics.revenue / state.metrics.target) * 100, 100);

    // Insights
    const focusScore = Math.round((completedToday.length / (completedToday.length + sortedTasks.length + 1)) * 100) || 0;

    const navItems = [
        { page: Page.WEEKLY, label: 'Weekly', icon: <Layout size={14} />, color: 'text-blue-400', bg: 'bg-blue-950/20', border: 'border-blue-900/50' },
        { page: Page.MENTOR, label: 'Protocol', icon: <BrainCircuit size={14} />, color: 'text-amber-400', bg: 'bg-amber-950/20', border: 'border-amber-900/50' },
        { page: Page.NETWORK, label: 'Network', icon: <Network size={14} />, color: 'text-purple-400', bg: 'bg-purple-950/20', border: 'border-purple-900/50' },
        { page: Page.ACTIVITIES, label: 'Activities', icon: <MapPin size={14} />, color: 'text-emerald-400', bg: 'bg-emerald-950/20', border: 'border-emerald-900/50' },
        { page: Page.LEDGER, label: 'Ledger', icon: <Cpu size={14} />, color: 'text-cyan-400', bg: 'bg-cyan-950/20', border: 'border-cyan-900/50' },
        { page: Page.SUPPLICATIONS, label: 'Sanctuary', icon: <BookOpen size={14} />, color: 'text-rose-400', bg: 'bg-rose-950/20', border: 'border-rose-900/50' },
    ];

    return (
        <div className="h-full overflow-y-auto p-6 animate-fade-in bg-background">
            <div className="max-w-[1200px] mx-auto flex flex-col gap-6 h-full">

                {/* --- TOP KPI STRIP --- */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">

                    {/* FINANCIAL GAP */}
                    <div className="bg-surface border border-border rounded-md p-4 relative overflow-hidden group hover:border-zinc-700 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                <Target size={12} /> Gap
                            </div>
                            <span className="text-[10px] font-mono text-zinc-600 group-hover:text-zinc-400 transition-colors">{progress.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-medium text-white tracking-tight">${state.metrics.revenue}</span>
                            <span className="text-xs text-zinc-500">/ ${state.metrics.target}</span>
                        </div>
                        <div className="mt-3 w-full h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-white transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>

                    {/* OUTREACH */}
                    <div className="bg-surface border border-border rounded-md p-4 group hover:border-zinc-700 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                <ArrowUpRight size={12} className="text-zinc-400" /> Outreach
                            </div>
                            <span className="text-[10px] font-mono text-zinc-500 group-hover:text-zinc-400">{state.metrics.outreachCount}/5</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-medium text-zinc-200">{state.metrics.outreachCount}</span>
                            <span className="text-xs text-zinc-500">msgs</span>
                        </div>
                    </div>

                    {/* PRAYER */}
                    <div className={`bg-surface border rounded-md p-4 relative transition-colors ${isPrayerDone ? 'border-emerald-900/30 bg-emerald-950/10' : 'border-border'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                <Zap size={12} className={isPrayerDone ? "text-emerald-500" : "text-zinc-500"} /> Next
                            </div>
                            {isPrayerDone && <CheckCircle2 size={12} className="text-emerald-500" />}
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className={`text-xl font-medium ${isPrayerDone ? 'text-emerald-400' : 'text-zinc-200'}`}>{nextPrayer.name}</div>
                                <div className="text-xs text-zinc-500 font-mono">{nextPrayer.time}</div>
                            </div>
                            {!isPrayerDone && (
                                <button
                                    onClick={() => onPrayerToggle(prayerKey)}
                                    className="px-3 py-1 bg-zinc-900 text-zinc-300 border border-zinc-700 rounded-sm text-[10px] font-mono hover:bg-emerald-900/30 hover:text-emerald-500 hover:border-emerald-800 transition-all"
                                >
                                    MARK
                                </button>
                            )}
                        </div>
                    </div>

                    {/* VELOCITY */}
                    <div className="bg-surface border border-border rounded-md p-4 group hover:border-zinc-700 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                <Timer size={12} /> Velocity
                            </div>
                            <div className="text-[10px] font-mono text-zinc-600">
                                {focusScore}% FOCUS
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-medium text-zinc-200">{completedToday.length}</span>
                            <span className="text-xs text-zinc-500">tasks</span>
                        </div>
                    </div>
                </div>

                {/* --- LAUNCHPAD (Fast Navigation) --- */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 shrink-0">
                    {navItems.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => onNavigate(item.page)}
                            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-md border ${item.border} ${item.bg} hover:brightness-125 transition-all group`}
                        >
                            <div className={`${item.color} opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-transform`}>
                                {item.icon}
                            </div>
                            <span className={`text-[10px] font-mono uppercase tracking-wider ${item.color} opacity-70 group-hover:opacity-100`}>
                                {item.label}
                            </span>
                        </button>
                    ))}
                </div>

                {/* --- FLIGHT PLAN --- */}
                <div className="flex-1 flex flex-col min-h-0 bg-surface/30 border border-border rounded-lg overflow-hidden backdrop-blur-sm">

                    <div className="p-5 border-b border-border bg-surface/80">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Flame size={18} className={overdueCount > 0 ? "text-red-500" : "text-zinc-100"} fill={overdueCount > 0 ? "currentColor" : "none"} />
                                <h2 className="text-sm font-medium text-zinc-100 tracking-tight">EXECUTION PROTOCOL</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                {overdueCount > 0 && (
                                    <div className="px-2 py-0.5 rounded bg-red-950/50 border border-red-900 text-[10px] font-mono text-red-400 flex items-center gap-1">
                                        <AlertTriangle size={10} />
                                        {overdueCount} OVERDUE
                                    </div>
                                )}
                                <div className="text-[10px] font-mono text-zinc-500">
                                    {sortedTasks.length} PENDING
                                </div>
                            </div>
                        </div>
                        <QuickInput onAdd={onTaskAdd} />
                    </div>

                    <div className="flex-1 overflow-y-auto p-2">
                        {sortedTasks.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2 opacity-50">
                                <CheckCircle2 size={24} />
                                <span className="text-xs font-mono">NO IMMEDIATE DIRECTIVES</span>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {sortedTasks.map(task => (
                                    <UnifiedTaskRow
                                        key={task.id}
                                        task={task}
                                        onUpdate={onTaskUpdate}
                                        onStartSession={onStartSession}
                                        isActive={task.id === activeTaskId}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

const QuickInput: React.FC<{ onAdd: any }> = ({ onAdd }) => {
    const [val, setVal] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!val.trim()) return;

        const isHigh = val.includes('!');
        // Auto-assign today's deadline if added from Cockpit
        onAdd(val.replace('!', '').trim(), Category.AGENCY, isHigh ? 'HIGH' : 'MED');
        setVal('');
    }
    return (
        <form onSubmit={handleSubmit} className="relative">
            <input
                className="w-full bg-background border border-zinc-800 rounded-md px-4 py-3 pl-10 text-sm text-zinc-200 focus:border-zinc-600 outline-none placeholder:text-zinc-700 font-mono transition-colors"
                placeholder=":: Add directive for today..."
                value={val}
                onChange={e => setVal(e.target.value)}
            />
            <Plus size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
        </form>
    )
}

const UnifiedTaskRow: React.FC<{
    task: Task;
    onUpdate: (id: string, updates: Partial<Task>) => void;
    onStartSession: (id: string) => void;
    isActive: boolean;
}> = ({ task, onUpdate, onStartSession, isActive }) => {
    const isOverdue = task.deadline && task.deadline < new Date().setHours(0, 0, 0, 0);

    return (
        <div className={`
            group flex items-center justify-between p-3 rounded border transition-all duration-200
            ${isActive
                ? 'bg-zinc-900/90 border-emerald-500/30 shadow-glow'
                : 'bg-background/50 border-transparent hover:border-zinc-800 hover:bg-zinc-900/30'
            }
            ${!isActive && isOverdue ? 'border-red-900/30 bg-red-950/10' : ''}
        `}>
            <div className="flex items-center gap-4 min-w-0 flex-1">

                <button
                    onClick={() => isActive ? null : onStartSession(task.id)}
                    className={`
                        w-8 h-8 rounded flex items-center justify-center shrink-0 border transition-all
                        ${isActive
                            ? 'bg-emerald-500 text-black border-emerald-400'
                            : 'bg-zinc-900 text-zinc-600 border-zinc-800 hover:text-emerald-500 hover:border-emerald-900'
                        }
                    `}
                >
                    {isActive ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
                </button>

                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`text-sm truncate font-medium ${isActive ? 'text-white' : isOverdue ? 'text-red-200' : 'text-zinc-300'}`}>
                            {task.title}
                        </span>
                        {task.impact === 'HIGH' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        )}
                    </div>
                    {task.deadline && (
                        <div className="flex items-center gap-1 text-[10px] font-mono mt-0.5">
                            <Calendar size={10} className={isOverdue ? "text-red-500" : "text-zinc-600"} />
                            <span className={isOverdue ? "text-red-400" : "text-zinc-500"}>
                                {isOverdue ? "OVERDUE" : "DUE TODAY"}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 pl-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onUpdate(task.id, { status: TaskStatus.DONE })}
                    className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                    COMPLETE
                </button>
            </div>
        </div>
    )
}

export default DashboardView;
