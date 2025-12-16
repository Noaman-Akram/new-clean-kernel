import React, { useMemo, useState } from 'react';
import { AppState, Task, TaskStatus, Category, Severity, Weekday } from '../types';
import {
    Plus,
    Clock,
    LayoutGrid,
    MoreHorizontal,
    Calendar,
    Layers,
    MapPin
} from 'lucide-react';

interface Props {
    state: AppState;
    onAdd: (
        title: string,
        category: Category,
        impact: Severity,
        options?: { slot?: { day: Weekday; hour: string }; status?: TaskStatus }
    ) => void;
    onUpdate: (id: string, updates: Partial<Task>) => void;
}

const WEEK_ORDER: Weekday[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const GridTwoView: React.FC<Props> = ({ state, onAdd, onUpdate }) => {
    const [selectedTab, setSelectedTab] = useState<'STRATEGY' | 'EXECUTION'>('EXECUTION');
    const [viewMode, setViewMode] = useState<'WEEKLY' | 'TIMELINE'>('WEEKLY');

    // Formatting helper
    const weekDays = useMemo(() => buildWeekDays(), []);

    // Sort tasks into buckets
    const dayBuckets = useMemo(() => {
        const map: Record<Weekday, Task[]> = {
            MON: [], TUE: [], WED: [], THU: [], FRI: [], SAT: [], SUN: []
        };
        state.tasks.forEach(task => {
            if (task.slot) {
                map[task.slot.day]?.push(task); // Safety check if day is valid
            }
        });
        return map;
    }, [state.tasks]);

    const unassignedTasks = useMemo(() => {
        return state.tasks.filter(t => !t.slot && t.status !== TaskStatus.DONE);
    }, [state.tasks]);

    const handleQuickAdd = (day?: Weekday) => {
        const title = prompt(`New task for ${day || 'Dock'}:`);
        if (title) {
            onAdd(title, Category.AGENCY, 'MED', {
                slot: day ? { day, hour: '09:00' } : undefined
            });
        }
    };

    const toggleDone = (task: Task) => {
        onUpdate(task.id, { status: task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE });
    };

    return (
        <div className="flex flex-col h-full bg-[#030303] text-zinc-300 font-sans">

            {/* --- HEADER --- */}
            <header className="h-16 px-6 flex items-center justify-between border-b border-[#111] bg-[#050505] shrink-0">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-zinc-100 rounded-sm shadow-[0_0_10px_rgba(255,255,255,0.2)]"></div>
                        <h1 className="text-sm font-semibold tracking-widest text-zinc-100">LIFE_PROTOCOL</h1>
                    </div>

                    <div className="flex items-center bg-[#090909] rounded-md p-1 border border-[#1b1b1b]">
                        <button
                            onClick={() => setSelectedTab('STRATEGY')}
                            className={`px-4 py-1.5 text-[10px] font-mono tracking-wider rounded-sm transition-all ${selectedTab === 'STRATEGY' ? 'bg-[#1a1a1a] text-zinc-100 shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            STRATEGY
                        </button>
                        <button
                            onClick={() => setSelectedTab('EXECUTION')}
                            className={`px-4 py-1.5 text-[10px] font-mono tracking-wider rounded-sm transition-all ${selectedTab === 'EXECUTION' ? 'bg-[#1a1a1a] text-zinc-100 shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            EXECUTION
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-[#090909] rounded-md p-1 border border-[#1b1b1b]">
                        <button
                            onClick={() => setViewMode('TIMELINE')}
                            className={`p-1.5 rounded-sm transition-all ${viewMode === 'TIMELINE' ? 'bg-[#1a1a1a] text-zinc-100' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            <Clock size={14} />
                        </button>
                        <button
                            onClick={() => setViewMode('WEEKLY')}
                            className={`p-1.5 rounded-sm transition-all ${viewMode === 'WEEKLY' ? 'bg-[#1a1a1a] text-zinc-100' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            <Calendar size={14} />
                        </button>
                    </div>
                </div>
            </header>

            {/* --- MAIN CONTENT (WEEKLY GRID) --- */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
                {selectedTab === 'EXECUTION' && viewMode === 'WEEKLY' && (
                    <div className="flex-1 grid grid-cols-7 divide-x divide-[#111] min-h-0">
                        {weekDays.map(day => (
                            <div key={day.key} className="flex flex-col h-full min-w-0 bg-[#040404]/50 hover:bg-[#060606] transition-colors group/col">
                                {/* Column Header */}
                                <div className={`py-4 border-b border-[#111] flex flex-col items-center gap-1 ${day.isToday ? 'bg-[#0a0a0a]' : ''}`}>
                                    <span className={`text-[10px] font-mono tracking-widest font-semibold ${day.isToday ? 'text-white' : 'text-zinc-600'}`}>
                                        {day.label}
                                    </span>
                                    <span className="text-[9px] text-zinc-700 font-mono">
                                        {day.dateLabel}
                                    </span>
                                </div>

                                {/* Task Slots */}
                                <div className="flex-1 p-2 flex flex-col gap-2 overflow-y-auto">
                                    {dayBuckets[day.key]?.map(task => (
                                        <TaskCard key={task.id} task={task} onToggle={toggleDone} />
                                    ))}

                                    {/* Add Button */}
                                    <button
                                        onClick={() => handleQuickAdd(day.key)}
                                        className="opacity-0 group-hover/col:opacity-100 w-full py-2 border border-dashed border-[#1a1a1a] rounded-sm text-zinc-700 text-[10px] hover:text-zinc-500 hover:border-zinc-700 hover:bg-[#0a0a0a] transition-all flex items-center justify-center gap-1"
                                    >
                                        <Plus size={10} /> ADD
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {selectedTab !== 'EXECUTION' && (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 space-y-2">
                        <MapPin size={24} className="opacity-20" />
                        <span className="text-xs font-mono">STRATEGY_MAP // COMING_SOON</span>
                    </div>
                )}
            </div>

            {/* --- DOCK (UNASSIGNED) --- */}
            <div className="h-48 border-t border-[#111] bg-[#020202] flex flex-col shrink-0">
                <div className="h-9 flex items-center justify-between px-6 border-b border-[#111] bg-[#030303]">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-semibold">
                        The Dock (Unassigned)
                    </span>
                    <span className="text-[10px] font-mono text-zinc-700 bg-[#0a0a0a] px-2 py-0.5 rounded border border-[#111]">
                        {unassignedTasks.length} ITEMS
                    </span>
                </div>

                <div className="flex-1 p-4 overflow-x-auto overflow-y-hidden">
                    <div className="flex flex-wrap content-start gap-3 h-full">
                        {unassignedTasks.map(task => (
                            <div key={task.id} className="w-56">
                                <TaskCard task={task} onToggle={toggleDone} detailed />
                            </div>
                        ))}

                        {/* Quick Add Dock */}
                        <button
                            onClick={() => handleQuickAdd()}
                            className="w-56 h-20 border border-dashed border-[#1a1a1a] rounded-sm flex items-center justify-center text-zinc-700 hover:text-zinc-500 hover:border-zinc-700 hover:bg-[#0a0a0a] transition-all"
                        >
                            <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider">
                                <Plus size={12} />
                                <span>NEW_ITEM</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};

const TaskCard: React.FC<{ task: Task, onToggle: (t: Task) => void, detailed?: boolean }> = ({ task, onToggle, detailed }) => {
    return (
        <div
            onClick={() => onToggle(task)}
            className={`
                group relative bg-[#090909] border border-[#1b1b1b] rounded-sm hover:border-[#333] transition-all cursor-pointer box-border
                ${detailed ? 'h-20 p-3 flex flex-col justify-between' : 'p-3'}
                ${task.status === TaskStatus.DONE ? 'opacity-40 grayscale' : ''}
            `}
        >
            <div className="flex items-start gap-2">
                <div className={`mt-1 w-1 h-1 rounded-full flex-shrink-0 ${getCategoryColor(task.category)}`}></div>
                <span className={`text-[11px] text-zinc-300 font-medium leading-snug line-clamp-2 ${task.status === TaskStatus.DONE ? 'line-through' : ''}`}>
                    {task.title}
                </span>
            </div>

            {detailed && (
                <div className="flex items-center justify-between mt-auto">
                    <span className="text-[9px] font-mono text-zinc-600 uppercase bg-[#0f0f0f] px-1 rounded">
                        {task.category}
                    </span>
                    {task.impact === 'HIGH' && (
                        <div className="h-1 w-1 rounded-full bg-red-900/50"></div>
                    )}
                </div>
            )}
        </div>
    )
}

const getCategoryColor = (cat: Category) => {
    switch (cat) {
        case Category.AGENCY: return 'bg-emerald-500';
        case Category.FREELANCE: return 'bg-amber-500';
        case Category.ZOHO: return 'bg-blue-500';
        default: return 'bg-zinc-500';
    }
}

const buildWeekDays = () => {
    const today = new Date();
    const day = today.getDay(); // 0=Sun, 1=Mon...
    const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    return WEEK_ORDER.map((key, idx) => {
        const current = new Date(monday);
        current.setDate(monday.getDate() + idx);

        const isToday = current.toDateString() === today.toDateString();

        return {
            key,
            label: current.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(),
            shortLabel: key,
            dateLabel: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            isToday
        };
    });
};

export default GridTwoView;
