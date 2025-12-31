import React, { useMemo, useState, useEffect, useRef } from 'react';
import { AppState, Task, TaskStatus, Category, Severity, Weekday, TaskSlot, HorizonGoal } from '../types';
import { getPrayerSchedule } from '../utils';
import {
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Target,
    GripVertical,
    Plus,
    X,
    Calendar as CalendarIcon
} from 'lucide-react';

interface Props {
    state: AppState;
    onAdd: (
        title: string,
        category: Category,
        impact: Severity,
        options?: { slot?: TaskSlot; status?: TaskStatus }
    ) => void;
    onUpdate: (id: string, updates: Partial<Task>) => void;
    onDelete: (id: string) => void;
    onAddHorizonGoal: (title: string) => void;
    onUpdateHorizonGoal: (id: string, updates: Partial<HorizonGoal>) => void;
}

const WEEK_ORDER: Weekday[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
type ViewMode = 'DAY' | 'WEEK' | 'MONTH';
const ROW_HEIGHT = 80;

const GridTwoView: React.FC<Props> = ({ state, onAdd, onUpdate, onDelete, onAddHorizonGoal, onUpdateHorizonGoal }) => {
    // --- STATE ---
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('WEEK');
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [now, setNow] = useState(new Date());

    // Inline Editing
    const [editingSlot, setEditingSlot] = useState<{ date: string, hour: number } | null>(null);
    const [editValue, setEditValue] = useState('');

    // --- REFS ---
    const scrollRef = useRef<HTMLDivElement>(null);

    // --- EFFECTS ---
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        // Initial scroll to 8 AM
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 8 * ROW_HEIGHT - 40;
        }
        return () => clearInterval(timer);
    }, [viewMode]);

    // --- COMPUTED DATA ---
    const prayerSchedule = useMemo(() => getPrayerSchedule(), []);

    const viewDates = useMemo(() => {
        const dates: { date: Date, type: 'focus' | 'ghost' }[] = [];
        const start = new Date(currentDate);

        if (viewMode === 'DAY') {
            // Day View: Prev (Ghost), Current (Focus), Next (Ghost)
            const prev = new Date(start); prev.setDate(prev.getDate() - 1);
            const next = new Date(start); next.setDate(next.getDate() + 1);
            dates.push({ date: prev, type: 'ghost' });
            dates.push({ date: start, type: 'focus' });
            dates.push({ date: next, type: 'ghost' });
        } else if (viewMode === 'WEEK') {
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(start.setDate(diff));
            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                dates.push({ date: d, type: 'focus' });
            }
        } else if (viewMode === 'MONTH') {
            const firstDay = new Date(start.getFullYear(), start.getMonth(), 1);
            const day = firstDay.getDay();
            const diff = day === 0 ? 6 : day - 1;
            const startDate = new Date(firstDay);
            startDate.setDate(firstDay.getDate() - diff);
            for (let i = 0; i < 42; i++) {
                const d = new Date(startDate);
                d.setDate(startDate.getDate() + i);
                dates.push({ date: d, type: 'focus' });
            }
        }

        return dates.map(d => ({
            date: d.date,
            iso: d.date.toISOString().split('T')[0],
            dayName: d.date.toLocaleDateString('en-US', { weekday: 'long' }),
            shortDayName: d.date.toLocaleDateString('en-US', { weekday: 'short' }),
            fullDate: d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            dayNum: d.date.getDate(),
            isToday: d.date.toDateString() === new Date().toDateString(),
            isCurrentMonth: d.date.getMonth() === currentDate.getMonth(),
            key: WEEK_ORDER[d.date.getDay() === 0 ? 6 : d.date.getDay() - 1],
            type: d.type
        }));
    }, [currentDate, viewMode]);

    const tasksByDate = useMemo(() => {
        const map: Record<string, Task[]> = {};
        state.tasks.forEach(t => {
            if (t.slot?.date) {
                if (!map[t.slot.date]) map[t.slot.date] = [];
                map[t.slot.date].push(t);
            }
        });
        return map;
    }, [state.tasks]);

    const backlog = useMemo(() => state.tasks.filter(t => !t.slot && t.status !== TaskStatus.DONE), [state.tasks]);

    // --- HANDLERS ---
    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'DAY') newDate.setDate(newDate.getDate() - 1);
        if (viewMode === 'WEEK') newDate.setDate(newDate.getDate() - 7);
        if (viewMode === 'MONTH') newDate.setMonth(newDate.getMonth() - 1);
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'DAY') newDate.setDate(newDate.getDate() + 1);
        if (viewMode === 'WEEK') newDate.setDate(newDate.getDate() + 7);
        if (viewMode === 'MONTH') newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    const handleJumpToday = () => setCurrentDate(new Date());

    const handleDrop = (e: React.DragEvent, targetIso: string, targetDay: Weekday, hour: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (!draggedTaskId) return;
        onUpdate(draggedTaskId, {
            slot: { day: targetDay, date: targetIso, hour: `${hour.toString().padStart(2, '0')}:00` }
        });
        setDraggedTaskId(null);
    };

    const commitEdit = () => {
        if (editingSlot && editValue.trim()) {
            const dayObj = viewDates.find(d => d.iso === editingSlot.date);
            if (dayObj) {
                onAdd(editValue, Category.FREELANCE, 'MED', {
                    slot: {
                        day: dayObj.key,
                        date: dayObj.iso,
                        hour: `${editingSlot.hour.toString().padStart(2, '0')}:00`
                    }
                });
            }
        }
        setEditingSlot(null);
        setEditValue('');
    };

    // --- RENDER ---
    return (
        <div className="flex h-full bg-[#09090b] text-zinc-300 font-sans selection:bg-zinc-800">

            {/* 1. SIDEBAR (Fixed) */}
            <aside className="hidden md:flex w-64 flex-col border-r border-zinc-900 bg-[#050505] z-50">
                {/* Backlog Header */}
                <div className="h-16 flex items-center justify-between px-5 border-b border-zinc-900">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500/80 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
                        <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Backlog</span>
                    </div>
                    <span className="bg-zinc-900 text-zinc-500 text-[10px] h-5 min-w-[20px] flex items-center justify-center rounded-full font-mono">{backlog.length}</span>
                </div>

                {/* Backlog Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {backlog.length === 0 && (
                        <div className="p-8 border border-dashed border-zinc-800 rounded-lg text-center flex flex-col items-center gap-2 opacity-50">
                            <CalendarIcon size={20} />
                            <span className="text-xs text-zinc-500">All caught up</span>
                        </div>
                    )}
                    {backlog.map(task => (
                        <div
                            key={task.id}
                            draggable
                            onDragStart={() => setDraggedTaskId(task.id)}
                            className="group p-3 bg-[#0c0c0c] border border-zinc-800/60 rounded-lg hover:border-zinc-600 hover:bg-[#111] cursor-grab active:cursor-grabbing transition-all relative shadow-sm"
                        >
                            <div className="flex gap-3">
                                <GripVertical size={14} className="text-zinc-700 group-hover:text-zinc-500 mt-0.5 shrink-0 transition-colors" />
                                <div>
                                    <p className="text-sm text-zinc-200 font-medium leading-snug mb-1.5">{task.title}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold bg-zinc-900/50 px-1.5 py-0.5 rounded">{task.category}</span>
                                        {task.impact === 'HIGH' && <span className="w-1.5 h-1.5 rounded-full bg-red-500/50"></span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Horizon Goals Footer */}
                <div className="p-5 border-t border-zinc-900 bg-[#040404]">
                    <div className="flex items-center gap-2 mb-4 text-zinc-500">
                        <Target size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Active Goals</span>
                    </div>
                    <div className="space-y-4">
                        {state.horizonGoals.slice(0, 2).map((goal) => (
                            <div key={goal.id}>
                                <div className="flex justify-between text-[11px] mb-1.5">
                                    <span className="text-zinc-300 font-medium">{goal.title}</span>
                                    <span className="text-zinc-500 font-mono">{goal.progress}%</span>
                                </div>
                                <div className="h-1.5 bg-zinc-900 w-full rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-zinc-600 to-zinc-400 rounded-full"
                                        style={{ width: `${goal.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>

            {/* 2. MAIN CALENDAR AREA */}
            <main className="flex-1 flex flex-col min-w-0 bg-[#09090b] relative">

                {/* CONTROL BAR */}
                <header className="h-16 border-b border-zinc-900 flex items-center justify-between px-4 md:px-8 bg-[#09090b] z-[60] shrink-0 sticky top-0">
                    <div className="flex items-center gap-4 md:gap-6">
                        <h2 className="text-base md:text-lg font-bold text-zinc-100 tracking-tight whitespace-nowrap">
                            {viewMode === 'WEEK'
                                ? <span className="flex items-baseline gap-2">Week <span className="text-zinc-600 font-light text-sm hidden md:inline">of {viewDates.find(d => d.type === 'focus')?.fullDate}</span></span>
                                : viewDates.find(d => d.type === 'focus')?.fullDate
                            }
                        </h2>
                        <div className="flex items-center bg-zinc-900/40 rounded-lg border border-zinc-800/80 p-1">
                            <button onClick={handlePrev} className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-zinc-100 transition-colors"><ChevronLeft size={16} /></button>
                            <button onClick={handleJumpToday} className="px-3 py-0.5 text-xs font-semibold hover:bg-zinc-800 rounded-md text-zinc-300 hover:text-white transition-colors uppercase tracking-wide hidden md:block">Today</button>
                            <button onClick={handleNext} className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-zinc-100 transition-colors"><ChevronRight size={16} /></button>
                        </div>
                    </div>

                    <div className="flex bg-zinc-900/40 rounded-lg border border-zinc-800/80 p-1">
                        {['DAY', 'WEEK', 'MONTH'].map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode as ViewMode)}
                                className={`px-3 md:px-4 py-1.5 text-[10px] md:text-[11px] font-bold rounded-md transition-all uppercase tracking-wider ${viewMode === mode ? 'bg-zinc-800 shadow-sm text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </header>

                {/* SCROLLABLE GRID CONTAINER */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-auto bg-[#09090b] custom-scrollbar relative"
                >
                    {viewMode === 'MONTH' ? (
                        /* MONTH VIEW IMPLEMENTATION (Simplified for now) */
                        <div className="min-h-full">
                            <div className="grid grid-cols-7 border-b border-zinc-900 sticky top-0 bg-[#09090b] z-40">
                                {WEEK_ORDER.map(d => (
                                    <div key={d} className="py-3 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 auto-rows-fr min-h-[600px] border-l border-zinc-900">
                                {viewDates.map(day => (
                                    <div
                                        key={day.iso}
                                        className={`
                                            min-h-[140px] border-b border-r border-zinc-900 p-3
                                            ${!day.isCurrentMonth ? 'bg-zinc-900/10 opacity-30' : 'bg-[#09090b]'}
                                        `}
                                    >
                                        <span className={`text-sm font-semibold ${day.isToday ? 'text-blue-500' : 'text-zinc-500'}`}>{day.dayNum}</span>
                                        <div className="mt-2 space-y-1">
                                            {(tasksByDate[day.iso] || []).map(task => (
                                                <div key={task.id} className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-zinc-300 truncate">
                                                    {task.title}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* DAY/WEEK VIEW IMPLEMENTATION */
                        <div
                            className="grid min-w-full relative"
                            style={{
                                gridTemplateColumns: `60px ${viewMode === 'DAY'
                                    ? 'minmax(0, 1fr) minmax(300px, 800px) minmax(0, 1fr)' // Responsive focus layout
                                    : `repeat(${viewDates.length}, minmax(140px, 1fr))` // Responsive week cols
                                    }`,
                            }}
                        >
                            {/* --- HEADER ROW (Sticky Top) --- */}

                            {/* Top-Left Corner */}
                            <div className="sticky top-0 z-50 bg-[#09090b] border-b border-r border-zinc-900 h-16 shrink-0 shadow-sm"></div>

                            {/* Day Headers */}
                            {viewDates.map((day, i) => {
                                const isFocus = day.type === 'focus';
                                return (
                                    <div
                                        key={`header-${day.iso}-${i}`}
                                        className={`
                                            sticky top-0 z-40 h-16 border-b border-zinc-900/50 flex flex-col items-center justify-center transition-all cursor-default
                                            ${viewMode === 'DAY' && !isFocus ? 'opacity-40 grayscale bg-[#050505] hover:opacity-60 cursor-pointer' : 'bg-[#09090b]'}
                                            ${viewMode === 'WEEK' ? 'border-r border-zinc-900/30' : ''}
                                        `}
                                        onClick={() => !isFocus && viewMode === 'DAY' && setCurrentDate(day.date)}
                                    >
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${day.isToday && isFocus ? 'text-blue-400' : 'text-zinc-500'}`}>
                                            {viewMode === 'DAY' ? day.dayName : day.shortDayName}
                                        </span>
                                        <div className="flex items-baseline gap-1 mt-0.5">
                                            <span className={`text-2xl font-light leading-none ${day.isToday && isFocus ? 'text-white' : 'text-zinc-400'}`}>
                                                {day.dayNum}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* --- GRID BODY --- */}

                            {/* Time Axis Column (Sticky Left) */}
                            <div className="sticky left-0 z-30 bg-[#09090b] border-r border-zinc-900/80">
                                {HOURS.map(h => (
                                    <div
                                        key={`time-${h}`}
                                        className="w-full relative border-b border-transparent"
                                        style={{ height: ROW_HEIGHT }}
                                    >
                                        <span className="absolute -top-[7px] left-3 text-[10px] font-bold text-zinc-600 font-mono">
                                            {h === 0 ? '' : h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* --- GRID LINES BACKGROUND (Absolute) --- */}
                            <div className="absolute top-16 left-[60px] right-0 z-0 pointer-events-none select-none">
                                {HOURS.map(h => (
                                    <div
                                        key={`line-${h}`}
                                        className="w-full border-t border-dashed border-zinc-900/60"
                                        style={{ height: ROW_HEIGHT }}
                                    ></div>
                                ))}
                            </div>

                            {/* Day Columns */}
                            {viewDates.map((day, i) => {
                                const isFocus = day.type === 'focus';

                                return (
                                    <div
                                        key={`col-${day.iso}-${i}`}
                                        onClick={(e) => {
                                            if (!isFocus && viewMode === 'DAY') {
                                                e.stopPropagation();
                                                setCurrentDate(day.date);
                                            }
                                        }}
                                        className={`
                                            relative 
                                            ${viewMode === 'WEEK' ? 'border-r border-zinc-900/40' : ''}
                                            ${viewMode === 'DAY' && !isFocus ? 'bg-[#000000] opacity-30 hover:opacity-100 hover:bg-[#050505] cursor-pointer transition-all duration-300' : ''}
                                        `}
                                    >
                                        {/* NOW INDICATOR */}
                                        {day.isToday && (
                                            <div
                                                className="absolute w-full z-20 pointer-events-none flex items-center group-now"
                                                style={{ top: now.getHours() * ROW_HEIGHT + (now.getMinutes() / 60) * ROW_HEIGHT }}
                                            >
                                                <div className="w-2 h-2 bg-red-500 rounded-full -ml-[4px] shadow-[0_0_8px_rgba(239,68,68,0.8)] z-10"></div>
                                                <div className="h-[2px] bg-red-500/50 w-full"></div>
                                            </div>
                                        )}

                                        {/* PRAYER TIMES */}
                                        {prayerSchedule.map(p => {
                                            const [h, m] = p.time.split(':').map(Number);
                                            const top = h * ROW_HEIGHT + (m / 60) * ROW_HEIGHT;
                                            return (
                                                <div
                                                    key={p.name}
                                                    className="absolute w-full z-10 pointer-events-none group"
                                                    style={{ top }}
                                                >
                                                    <div className="w-full h-[1px] bg-emerald-800/40 border-t border-dotted border-emerald-500/30"></div>
                                                    <span className="absolute right-1 -top-2.5 text-[9px] text-emerald-600/70 font-mono uppercase bg-[#09090b] px-1 group-hover:text-emerald-400">
                                                        {p.name}
                                                    </span>
                                                </div>
                                            );
                                        })}

                                        {/* INTERACTIVE SLOTS */}
                                        {HOURS.map(h => {
                                            const isEditing = editingSlot?.date === day.iso && editingSlot?.hour === h;
                                            const tasks = (tasksByDate[day.iso] || []).filter(t => t.slot?.hour?.startsWith(h.toString().padStart(2, '0')));
                                            const hasTasks = tasks.length > 0;

                                            return (
                                                <div
                                                    key={`slot-${h}`}
                                                    className="relative z-10 group/slot w-full px-1"
                                                    style={{ height: ROW_HEIGHT }}
                                                    onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('bg-zinc-800/20'); }}
                                                    onDragLeave={e => { e.currentTarget.classList.remove('bg-zinc-800/20'); }}
                                                    onDrop={e => {
                                                        e.currentTarget.classList.remove('bg-zinc-800/20');
                                                        handleDrop(e, day.iso, day.key, h);
                                                    }}
                                                    onClick={(e) => {
                                                        // Fallback click to add if hitting empty background
                                                        if (e.target === e.currentTarget && !isEditing) {
                                                            setEditingSlot({ date: day.iso, hour: h });
                                                        }
                                                    }}
                                                >
                                                    {/* QUICK ADD BUTTON (Visible on Hover / Edit) */}
                                                    {!isEditing && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingSlot({ date: day.iso, hour: h });
                                                            }}
                                                            className="absolute top-1 right-1 p-1 rounded-sm text-zinc-700 hover:text-blue-400 hover:bg-zinc-800 opacity-0 group-hover/slot:opacity-100 transition-opacity z-50 transform hover:scale-110"
                                                            title="Add Task"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    )}

                                                    {/* Edit Mode Input */}
                                                    {isEditing && (
                                                        <div className="absolute inset-1 z-50">
                                                            <input
                                                                autoFocus
                                                                value={editValue}
                                                                onChange={e => setEditValue(e.target.value)}
                                                                onBlur={commitEdit}
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter') commitEdit();
                                                                    if (e.key === 'Escape') { setEditingSlot(null); setEditValue(''); }
                                                                }}
                                                                className="w-full h-[36px] bg-[#111] border border-blue-500 rounded px-3 text-sm text-white focus:outline-none shadow-2xl"
                                                                placeholder="New task..."
                                                            />
                                                        </div>
                                                    )}

                                                    {/* TASKS RENDER (Time Anchor Stack) */}
                                                    {hasTasks && (
                                                        <div className="w-full flex flex-col gap-1 py-1 relative z-20 pointer-events-none">
                                                            {tasks.map(task => (
                                                                <div
                                                                    key={task.id}
                                                                    className="w-full shrink-0 pointer-events-auto"
                                                                >
                                                                    <GridTaskCard
                                                                        task={task}
                                                                        onUpdate={onUpdate}
                                                                        onDelete={onDelete}
                                                                        onDragStart={() => setDraggedTaskId(task.id)}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

// --- SUB COMPONENTS ---

const GridTaskCard: React.FC<{
    task: Task,
    onUpdate: (id: string, updates: Partial<Task>) => void,
    onDelete: (id: string) => void,
    onDragStart: () => void
}> = ({ task, onUpdate, onDelete, onDragStart }) => {
    const isDone = task.status === TaskStatus.DONE;

    // Awwwards Style: Glassmorphism / Subtle Gradients
    const getStyles = () => {
        if (isDone) return 'bg-zinc-900/30 border-zinc-800/50 text-zinc-600 grayscale';
        switch (task.category) {
            case Category.ZOHO: return 'bg-purple-500/10 border-purple-500/20 text-purple-200 hover:border-purple-500/40 hover:bg-purple-500/20';
            case Category.FREELANCE: return 'bg-blue-500/10 border-blue-500/20 text-blue-200 hover:border-blue-500/40 hover:bg-blue-500/20';
            default: return 'bg-zinc-800/40 border-zinc-700/30 text-zinc-200 hover:border-zinc-500/50 hover:bg-zinc-700/40';
        }
    };

    return (
        <div
            draggable
            onDragStart={(e) => { e.stopPropagation(); onDragStart(); }}
            onClick={(e) => e.stopPropagation()}
            className={`
                w-full h-9 rounded-md border px-2 py-1 select-none flex flex-col justify-center cursor-grab active:cursor-grabbing transition-all duration-200 group relative overflow-hidden backdrop-blur-sm z-10 hover:z-30 hover:shadow-lg
                ${getStyles()}
            `}
        >
            <div className="flex items-start gap-0 w-full relative z-10">
                {/* Custom Checkbox as overlay on the text/area */}
                <button
                    onClick={() => onUpdate(task.id, { status: isDone ? TaskStatus.TODO : TaskStatus.DONE })}
                    className={`
                        absolute top-0 right-0 p-1 rounded-bl-md transition-all z-20
                        ${isDone ? 'bg-transparent text-green-600' : 'opacity-0 group-hover:opacity-100 hover:bg-zinc-800 text-zinc-400 hover:text-white'}
                    `}
                >
                    <CheckCircle2 size={12} />
                </button>

                <div className="min-w-0 flex-1">
                    <p className={`
                        text-[12px] font-medium leading-tight truncate pr-4 mt-0.5
                        ${isDone ? 'line-through opacity-50' : ''}
                    `}>
                        {task.title}
                    </p>
                </div>
            </div>

            {/* Delete Button (Bottom Right standard hidden) */}
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                className="absolute bottom-1 right-1 p-1 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                title="Delete Task"
            >
                <X size={10} />
            </button>
        </div>
    );
}

export default GridTwoView;
