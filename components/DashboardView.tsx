import React, { useState, useEffect, useRef } from 'react';
import { getPrayerSchedule, getNextPrayer } from '../utils';
import { AppState, TaskStatus, Task, Category, Note } from '../types';
import {
    Zap,
    CheckCircle2,
    Circle,
    Send,
    Play,
    Pause,
    Flame,
    Sun,
    Moon,
    Sparkles,
    Target,
    AlertTriangle,
    Plus,
    X
} from 'lucide-react';

interface Props {
    state: AppState;
    onTaskUpdate: (id: string, updates: Partial<Task>) => void;
    onTaskAdd: (title: string, category: Category, impact: 'LOW' | 'MED' | 'HIGH') => void;
    onPrayerToggle: (key: string) => void;
    onAdhkarToggle: (key: string) => void;
    onStartSession: (id: string) => void;
    onNoteAdd: (note: Note) => void;
    onNoteUpdate: (id: string, updates: Partial<Note>) => void;
    activeTaskId: string | null;
}

const MOTIVATIONS = [
    "Discipline equates to freedom.",
    "Do what is necessary, not what is easy.",
    "Protocol Active. Focus.",
    "Momentum is your only friend.",
    "Code the future, don't just dream it."
];

const DashboardView: React.FC<Props> = ({ state, onTaskUpdate, onTaskAdd, onPrayerToggle, onAdhkarToggle, onStartSession, onNoteAdd, onNoteUpdate, activeTaskId }) => {
    const [now, setNow] = useState(new Date());
    const [logInput, setLogInput] = useState('');

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // --- PRAYER LOGIC ---
    const prayers = getPrayerSchedule();
    const nextPrayer = getNextPrayer();
    const todayKey = new Date().toISOString().split('T')[0];
    const nextPrayerKey = `${todayKey}-${nextPrayer.name}`;
    const isNextPrayerDone = state.prayerLog[nextPrayerKey];

    // --- ADHKAR LOGIC ---
    const morningKey = `${todayKey}-MORNING`;
    const eveningKey = `${todayKey}-EVENING`;
    const isMorningDone = state.adhkarLog?.[morningKey];
    const isEveningDone = state.adhkarLog?.[eveningKey];

    // --- TASKS LOGIC ---
    const activeTask = state.tasks.find(t => t.id === activeTaskId);

    // Simple impact sorting
    const sortedTasks = state.tasks
        .filter(t => t.status !== TaskStatus.DONE && t.status !== TaskStatus.BACKLOG)
        .sort((a, b) => {
            const impactScore = { 'HIGH': 3, 'MED': 2, 'LOW': 1 };
            return impactScore[b.impact] - impactScore[a.impact];
        });

    const overdueCount = sortedTasks.filter(t => t.deadline && t.deadline < new Date().setHours(0, 0, 0, 0)).length;
    const completedToday = state.tasks.filter(t => t.status === TaskStatus.DONE && new Date(t.createdAt).getDate() === new Date().getDate());
    const progress = state.metrics.target > 0 ? Math.min((state.metrics.revenue / state.metrics.target) * 100, 100) : 0;

    // --- BRAIN DUMP LOGIC ---
    const dumpId = 'brain_dump';
    const dumpNote = state.notes.find(n => n.id === dumpId);
    const logs = dumpNote ? dumpNote.content.split('\n').filter(l => l.trim()) : [];
    const logsEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [logs.length]);

    const handleLogSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!logInput.trim()) return;

        // Format: [Fri 14:30] or [19 Dec 14:30]
        const now = new Date();
        const day = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const timestamp = `${day} ${time}`;
        const newLine = `[${timestamp}] ${logInput.trim()}`;

        if (!dumpNote) {
            onNoteAdd({
                id: dumpId,
                title: 'Brain Dump',
                content: newLine,
                updatedAt: Date.now(),
                tags: ['LOGS']
            });
        } else {
            // Append to end for chat feel, or unshift for reverse. Chat usually appends.
            // Wait, previous design had reverse. Let's do append (newest at bottom) like chat.
            onNoteUpdate(dumpId, {
                content: dumpNote.content ? dumpNote.content + '\n' + newLine : newLine,
                updatedAt: Date.now()
            });
        }
        setLogInput('');
    };

    return (
        <div className="h-full flex flex-col p-6 animate-fade-in gap-6 overflow-hidden">

            {/* HEADER */}
            <div className="flex justify-between items-center shrink-0">
                <div className="flex items-baseline gap-3">
                    <h1 className="text-lg font-bold font-mono text-zinc-100 tracking-tight">NOEMAN SYSTEM</h1>
                    <span className="text-[10px] font-mono text-emerald-500 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/50">v1.1 ONLINE</span>
                </div>
                <div className="text-right hidden md:block">
                    <div className="text-sm font-serif text-emerald-400 italic">" {MOTIVATIONS[new Date().getDay() % MOTIVATIONS.length]} "</div>
                </div>
            </div>

            {/* TOP ROW: PRAYER & FOCUS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0 min-h-[180px]">

                {/* PRAYER MODULE */}
                <div className="lg:col-span-2 bg-surface/50 border border-border rounded-xl p-6 relative overflow-hidden flex flex-col justify-between group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                        <Sparkles size={64} />
                    </div>

                    <div className="flex justify-between items-start z-10 relative">
                        <div>
                            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Upcoming Prayer</div>
                            <div className="text-5xl font-serif text-white mb-2">{nextPrayer.name}</div>
                            <div className="flex items-center gap-3">
                                <span className="text-xl font-mono text-emerald-400">{nextPrayer.time}</span>
                                <span className="text-xs font-mono text-zinc-500 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                                    - {Math.floor(nextPrayer.remaining / 60)}h {nextPrayer.remaining % 60}m
                                </span>
                            </div>
                        </div>

                        {/* PRAYER LIST TIMELINE */}
                        <div className="flex gap-2">
                            {prayers.map(p => {
                                const key = `${todayKey}-${p.name}`;
                                const isDone = state.prayerLog[key];
                                const isNext = p.name === nextPrayer.name;

                                return (
                                    <button
                                        key={p.name}
                                        onClick={() => onPrayerToggle(key)}
                                        className={`
                                            flex flex-col items-center justify-center w-12 h-14 rounded border transition-all relative
                                            ${isDone
                                                ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-500'
                                                : isNext
                                                    ? 'bg-zinc-800 border-zinc-600 text-zinc-200 shadow-glow'
                                                    : 'bg-zinc-900/30 border-zinc-800 text-zinc-600 hover:border-zinc-700'}
                                        `}
                                    >
                                        {isDone ? <CheckCircle2 size={14} className="mb-1" /> : <Circle size={14} className="mb-1" />}
                                        <span className="text-[9px] font-bold font-mono uppercase">{p.name.substring(0, 3)}</span>
                                        {isNext && <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse border border-background" />}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Athkar Mini-Bar - NOW SYNCED */}
                    <div className="mt-4 flex items-center gap-6 border-t border-white/5 pt-4">
                        <button
                            onClick={() => onAdhkarToggle(morningKey)}
                            className={`flex items-center gap-2 text-xs transition-colors ${isMorningDone ? 'text-amber-400 font-medium' : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            {isMorningDone ? <CheckCircle2 size={12} /> : <Sun size={12} />}
                            <span>Morning Adhkar</span>
                        </button>

                        <button
                            onClick={() => onAdhkarToggle(eveningKey)}
                            className={`flex items-center gap-2 text-xs transition-colors ${isEveningDone ? 'text-indigo-400 font-medium' : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            {isEveningDone ? <CheckCircle2 size={12} /> : <Moon size={12} />}
                            <span>Evening Adhkar</span>
                        </button>
                    </div>
                </div>

                {/* ACTIVE FOCUS (Based on Active Session) */}
                <div className="bg-surface/50 border border-border rounded-xl p-6 flex flex-col relative overflow-hidden">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Zap size={12} className="text-amber-500" /> Current Focus
                    </div>

                    {activeTaskId && activeTask ? (
                        <div className="flex-1 flex flex-col justify-center animate-fade-in">
                            <h2 className="text-lg font-medium text-white leading-snug mb-2 line-clamp-3">{activeTask.title}</h2>
                            <div className="flex items-center gap-2 mb-4">
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 uppercase ${activeTask.category === Category.ZOHO ? 'bg-blue-900/20 text-blue-400' :
                                    activeTask.category === Category.AGENCY ? 'bg-amber-900/20 text-amber-400' :
                                        'bg-purple-900/20 text-purple-400'
                                    }`}>{activeTask.category}</span>
                                <span className="flex items-center gap-1 text-[10px] font-mono text-red-500 uppercase animate-pulse">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    Live
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
                            <Zap size={24} className="mb-2 opacity-50" />
                            <span className="text-sm font-mono text-zinc-500">SYSTEM IDLE</span>
                        </div>
                    )}
                </div>

            </div>

            {/* BOTTOM GRID */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">

                {/* BRAIN DUMP (CHAT STYLE) */}
                <div className="bg-surface/30 border border-border rounded-xl flex flex-col overflow-hidden backdrop-blur-sm">
                    <div className="p-3 border-b border-border flex items-center justify-between bg-surface/50">
                        <div className="text-xs font-bold font-mono text-zinc-400 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                            QUICK LOG STRM
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {logs.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-xs text-zinc-700 font-mono">
                                // No logs recorded
                            </div>
                        ) : (
                            logs.map((log, i) => {
                                const splitIndex = log.indexOf('] ');
                                const ts = splitIndex > -1 ? log.substring(0, splitIndex + 1).replace('[', '').replace(']', '') : '';
                                const msg = splitIndex > -1 ? log.substring(splitIndex + 2) : log;

                                return (
                                    <div key={i} className="flex gap-3 text-sm group animate-fade-in">
                                        <span className="text-[10px] font-mono text-zinc-600 shrink-0 pt-1 w-10 text-right">{ts}</span>
                                        <div className="text-zinc-300 font-mono leading-relaxed bg-zinc-900/50 px-2 py-1 rounded border border-transparent group-hover:border-zinc-800 transition-colors">
                                            {msg}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                        <div ref={logsEndRef} />
                    </div>

                    <form onSubmit={handleLogSubmit} className="p-3 border-t border-border bg-surface/80">
                        <div className="relative flex gap-2">
                            <input
                                value={logInput}
                                onChange={e => setLogInput(e.target.value)}
                                placeholder=":: Enter log entry..."
                                className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 outline-none font-mono"
                            />
                            <button type="submit" disabled={!logInput.trim()} className="px-3 py-2 bg-zinc-100 text-black rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed">
                                <Send size={14} />
                            </button>
                        </div>
                    </form>
                </div>

                {/* EXECUTION PROTOCOL */}
                <div className="lg:col-span-2 bg-surface/30 border border-border rounded-xl flex flex-col overflow-hidden backdrop-blur-sm">
                    <div className="p-3 border-b border-border flex items-center justify-between bg-surface/50">
                        <div className="flex items-center gap-3">
                            <div className="text-xs font-bold font-mono text-zinc-400 flex items-center gap-2">
                                <Flame size={14} className={overdueCount > 0 ? "text-red-500" : "text-zinc-400"} />
                                EXECUTION PROTOCOL
                            </div>
                            {overdueCount > 0 && (
                                <span className="text-[9px] font-mono bg-red-950/50 text-red-500 border border-red-900/50 px-1.5 py-0.5 rounded">
                                    {overdueCount} OVERDUE
                                </span>
                            )}
                        </div>
                        <QuickInput onAdd={onTaskAdd} />
                    </div>

                    <div className="flex-1 overflow-y-auto p-2">
                        <div className="space-y-1">
                            {sortedTasks.map(task => (
                                <UnifiedTaskRow
                                    key={task.id}
                                    task={task}
                                    activeTaskId={activeTaskId}
                                    onUpdate={onTaskUpdate}
                                    onStart={onStartSession}
                                />
                            ))}
                            {sortedTasks.length === 0 && (
                                <div className="h-40 flex flex-col items-center justify-center text-zinc-600 opacity-50">
                                    <CheckCircle2 size={24} className="mb-2" />
                                    <span className="text-xs font-mono">ALL DIRECTIVES CLEARED</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
};

// --- SUB-COMPONENTS ---

const UnifiedTaskRow: React.FC<{
    task: Task;
    activeTaskId: string | null;
    onUpdate: (id: string, updates: Partial<Task>) => void;
    onStart: (id: string) => void;
}> = ({ task, activeTaskId, onUpdate, onStart }) => {
    const isActive = activeTaskId === task.id;
    return (
        <div className={`
            group flex items-center gap-3 p-2 rounded transition-all border
            ${isActive
                ? 'bg-zinc-800/50 border-zinc-700'
                : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'}
        `}>
            <button
                onClick={() => onUpdate(task.id, { status: TaskStatus.DONE })}
                className="w-5 h-5 rounded border border-zinc-700 flex items-center justify-center hover:border-emerald-500 hover:text-emerald-500 text-transparent transition-all shrink-0"
            >
                <CheckCircle2 size={14} />
            </button>

            <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold font-mono px-1 rounded-sm uppercase ${task.impact === 'HIGH' ? 'bg-red-950/30 text-red-500 border border-red-900/30' :
                        task.impact === 'MED' ? 'bg-amber-950/30 text-amber-500 border border-amber-900/30' :
                            'bg-zinc-800 text-zinc-500'
                        }`}>{task.impact}</span>
                    <span className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-zinc-300'}`}>{task.title}</span>
                </div>
            </div>

            {isActive ? (
                <button onClick={() => onStart(task.id)} className="w-7 h-7 rounded flex items-center justify-center bg-zinc-800 text-amber-500 animate-pulse border border-amber-900/30 shrink-0">
                    <Pause size={12} fill="currentColor" />
                </button>
            ) : (
                <button onClick={() => onStart(task.id)} className="w-7 h-7 rounded flex items-center justify-center text-zinc-600 hover:bg-zinc-800 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                    <Play size={12} fill="currentColor" />
                </button>
            )}
        </div>
    );
};

const QuickInput: React.FC<{ onAdd: (t: string, c: Category, i: 'LOW' | 'MED' | 'HIGH') => void }> = ({ onAdd }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [title, setTitle] = useState('');
    const [impact, setImpact] = useState<'LOW' | 'MED' | 'HIGH'>('MED');
    const [cat, setCat] = useState<Category>(Category.ZOHO);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        onAdd(title, cat, impact);
        setTitle('');
        setIsExpanded(false);
    };

    if (!isExpanded) {
        return (
            <button
                onClick={() => setIsExpanded(true)}
                className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors border border-zinc-800 hover:border-zinc-700 rounded px-2 py-1"
            >
                <Plus size={10} /> ADD DIRECTIVE
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 animate-fade-in">
            <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Directive title..."
                className="bg-zinc-900/80 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 outline-none w-48 focus:border-emerald-500"
            />
            <select
                value={impact}
                onChange={e => setImpact(e.target.value as any)}
                className="bg-zinc-900/80 border border-zinc-700 rounded px-1 py-1 text-[10px] text-zinc-300 outline-none"
            >
                <option value="LOW">LOW</option>
                <option value="MED">MED</option>
                <option value="HIGH">HIGH</option>
            </select>
            <button type="submit" className="p-1 bg-zinc-100 text-black rounded hover:bg-white hover:scale-105 transition-all">
                <Plus size={12} />
            </button>
            <button type="button" onClick={() => setIsExpanded(false)} className="p-1 text-zinc-500 hover:text-zinc-300">
                <X size={12} />
            </button>
        </form>
    );
};

export default DashboardView;
