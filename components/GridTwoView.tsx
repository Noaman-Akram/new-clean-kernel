import React, { useMemo, useState, useEffect } from 'react';
import { AppState, Task, TaskStatus, Category, Severity, Weekday, TaskSlot } from '../types';
import {
    Plus,
    Clock,
    LayoutGrid,
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Search,
    Command,
    MoreHorizontal,
    Zap,
    BarChart3,
    Maximize2,
    Minimize2,
    CheckSquare
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
}

const WEEK_ORDER: Weekday[] = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'];

const GridTwoView: React.FC<Props> = ({ state, onAdd, onUpdate }) => {
    const [selectedTab, setSelectedTab] = useState<'STRATEGY' | 'EXECUTION'>('EXECUTION');
    const [viewMode, setViewMode] = useState<'WEEKLY' | 'TIMELINE'>('WEEKLY');
    const [viewDensity, setViewDensity] = useState<'COMPACT' | 'COMFORTABLE'>('COMFORTABLE');
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getStartOfWeek(new Date()));
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [addingToDay, setAddingToDay] = useState<string | null>(null); // ISO Date string of day being added to
    const [dayInputValue, setDayInputValue] = useState('');

    // --- DOCK VIEWS ---
    const [dockView, setDockView] = useState<'BACKLOG' | 'MISSED' | 'HISTORY'>('BACKLOG');

    // --- DATE HELPERS ---
    function getStartOfWeek(d: Date) {
        const date = new Date(d);
        const day = date.getDay(); // 0 is Sunday, 6 is Saturday
        const diff = day === 6 ? 0 : -(day + 1);

        date.setDate(date.getDate() + diff);
        date.setHours(0, 0, 0, 0);
        return date;
    }

    const weekDays = useMemo(() => {
        return WEEK_ORDER.map((key, i) => {
            const date = new Date(currentWeekStart);
            date.setDate(currentWeekStart.getDate() + i);
            return {
                key,
                date,
                label: key,
                dateLabel: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                iso: date.toISOString().split('T')[0],
                isToday: new Date().toDateString() === date.toDateString()
            };
        });
    }, [currentWeekStart]);

    const changeWeek = (dir: -1 | 1) => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() + (dir * 7));
        setCurrentWeekStart(newDate);
    };

    // --- DATA ---
    const dayBuckets = useMemo(() => {
        const map: Record<string, Task[]> = {};
        weekDays.forEach(d => map[d.iso] = []);

        state.tasks.forEach(task => {
            if (task.slot?.date && map[task.slot.date]) {
                map[task.slot.date].push(task);
            }
        });

        // Sort by time/status
        Object.keys(map).forEach(key => {
            map[key].sort((a, b) => {
                // Done tasks at bottom
                if (a.status === TaskStatus.DONE && b.status !== TaskStatus.DONE) return 1;
                if (a.status !== TaskStatus.DONE && b.status === TaskStatus.DONE) return -1;

                // High Impact First
                if (a.impact === 'HIGH' && b.impact !== 'HIGH') return -1;
                if (a.impact !== 'HIGH' && b.impact === 'HIGH') return 1;

                return (a.slot?.hour || '09:00').localeCompare(b.slot?.hour || '09:00');
            });
        });

        return map;
    }, [state.tasks, weekDays]);

    const unassignedTasks = useMemo(() => {
        return state.tasks.filter(t => !t.slot && t.status !== TaskStatus.DONE);
    }, [state.tasks]);

    const missedTasks = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        return state.tasks.filter(t =>
            t.status !== TaskStatus.DONE &&
            t.slot?.date &&
            t.slot.date < todayStr
        );
    }, [state.tasks]);

    const historyTasks = useMemo(() => {
        return state.tasks
            .filter(t => t.status === TaskStatus.DONE)
            .sort((a, b) => (b.slot?.date || '').localeCompare(a.slot?.date || ''))
            .slice(0, 50);
    }, [state.tasks]);

    const displayedDockTasks = dockView === 'BACKLOG' ? unassignedTasks
        : dockView === 'MISSED' ? missedTasks
            : historyTasks;

    // --- METRICS ---
    const metrics = useMemo(() => {
        const totalScheduled = Object.values(dayBuckets).reduce((acc, tasks) => acc + tasks.length, 0);
        const openTasks = Object.values(dayBuckets).reduce((acc, tasks) => acc + tasks.filter(t => t.status !== TaskStatus.DONE).length, 0);
        return { totalScheduled, openTasks };
    }, [dayBuckets]);


    // --- DRAG & DROP ---
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetIso?: string, targetDay?: Weekday) => {
        e.preventDefault();
        if (!draggedTaskId) return;

        if (targetIso && targetDay) {
            onUpdate(draggedTaskId, {
                slot: {
                    day: targetDay,
                    hour: '09:00',
                    date: targetIso
                }
            });
        } else {
            onUpdate(draggedTaskId, {
                slot: undefined
            });
        }
        setDraggedTaskId(null);
    };

    // --- QUICK ADD LOGIC ---
    const parseTaskInput = (text: string) => {
        let title = text;
        let impact: Severity = 'MED';

        if (title.startsWith('!')) {
            impact = 'HIGH';
            title = title.substring(1).trim();
        }

        return { title, impact };
    };

    // --- CLI INPUT (Top) ---
    const [inputValue, setInputValue] = useState('');
    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            const { title, impact } = parseTaskInput(inputValue);
            onAdd(title, Category.FREELANCE, impact, {
                slot: undefined, // Add to Dock by default
                status: TaskStatus.TODO
            });
            setInputValue('');
        }
    };

    // --- IN-DAY INPUT ---
    const handleDayInputKeyDown = (e: React.KeyboardEvent, isoDate: string, dayKey: Weekday) => {
        if (e.key === 'Enter' && dayInputValue.trim()) {
            const { title, impact } = parseTaskInput(dayInputValue);
            onAdd(title, Category.FREELANCE, impact, {
                slot: {
                    day: dayKey,
                    date: isoDate,
                    hour: '09:00'
                },
                status: TaskStatus.TODO
            });
            setDayInputValue('');
            setAddingToDay(null);
        } else if (e.key === 'Escape') {
            setAddingToDay(null);
            setDayInputValue('');
        }
    }

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-zinc-800">

            {/* --- HEADER --- */}
            <header className="h-14 px-6 flex items-center justify-between border-b border-[#222] bg-[#0f0f0f] shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-zinc-100 rounded-[1px] shadow-[0_0_10px_rgba(255,255,255,0.15)]"></div>
                        <h1 className="text-xs font-bold tracking-[0.2em] text-zinc-100">PROTOCOL</h1>
                    </div>

                    <div className="h-6 w-px bg-[#222]"></div>

                    {/* View Switcher */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSelectedTab('EXECUTION')}
                            className={`text-[11px] font-medium tracking-wide transition-colors ${selectedTab === 'EXECUTION' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            EXECUTION
                        </button>
                        <span className="text-zinc-700">/</span>
                        <button
                            onClick={() => setSelectedTab('STRATEGY')}
                            className={`text-[11px] font-medium tracking-wide transition-colors ${selectedTab === 'STRATEGY' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            STRATEGY
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Week Nav */}
                    <div className="flex items-center gap-3">
                        <button onClick={() => changeWeek(-1)} className="text-zinc-500 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                        <span className="text-[11px] font-mono text-zinc-300 w-24 text-center">
                            {weekDays[0].dateLabel} - {weekDays[6].dateLabel}
                        </span>
                        <button onClick={() => changeWeek(1)} className="text-zinc-500 hover:text-white transition-colors"><ChevronRight size={16} /></button>
                    </div>

                    <div className="h-6 w-px bg-[#222]"></div>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setViewDensity(viewDensity === 'COMPACT' ? 'COMFORTABLE' : 'COMPACT')}
                            className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors"
                            title="Toggle Density"
                        >
                            {viewDensity === 'COMPACT' ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* --- DOCK & INPUT --- */}
            <div
                className="h-auto min-h-[14rem] max-h-[35vh] border-b border-[#222] bg-[#0c0c0c] flex flex-col shrink-0"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e)}
            >
                {/* CLI Input */}
                <div className="h-12 border-b border-[#222] bg-[#0a0a0a] px-5 flex items-center gap-3 shrink-0">
                    <Command size={14} className="text-zinc-600" />
                    <input
                        className="flex-1 bg-transparent border-none outline-none text-[13px] font-mono text-zinc-200 placeholder:text-zinc-700 h-full"
                        placeholder="Type task... (Start with ! for URGENT)"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                    />
                    <div className="text-[9px] text-zinc-600 font-mono px-1.5 py-0.5 border border-[#333] rounded">RET</div>
                </div>

                {/* Dock Tabs */}
                <div className="h-10 flex items-center justify-between px-6 border-b border-[#222] bg-[#111] shrink-0">
                    <div className="flex items-center h-full gap-6">
                        <DockTab
                            label="BACKLOG"
                            count={unassignedTasks.length}
                            active={dockView === 'BACKLOG'}
                            onClick={() => setDockView('BACKLOG')}
                        />
                        <DockTab
                            label="MISSED"
                            count={missedTasks.length}
                            active={dockView === 'MISSED'}
                            onClick={() => setDockView('MISSED')}
                            alert={missedTasks.length > 0}
                        />
                        <DockTab
                            label="ARCHIVE"
                            active={dockView === 'HISTORY'}
                            onClick={() => setDockView('HISTORY')}
                        />
                    </div>
                </div>

                <div className="flex-1 p-5 overflow-x-auto overflow-y-auto custom-scrollbar bg-[#0c0c0c]">
                    <div className="flex flex-wrap content-start gap-4">
                        {displayedDockTasks.length === 0 && (
                            <div className="w-full pt-8 flex items-center justify-center text-[11px] font-mono text-zinc-700">
                                {dockView === 'BACKLOG' && 'No pending tasks in backlog.'}
                                {dockView === 'MISSED' && 'No missed tasks - All clear.'}
                                {dockView === 'HISTORY' && 'No history available.'}
                            </div>
                        )}
                        {displayedDockTasks.map(task => (
                            <div key={task.id} className="w-72">
                                <TaskCard
                                    task={task}
                                    onToggle={(t) => onUpdate(t.id, { status: t.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE })}
                                    onUpdateTitle={(newTitle) => onUpdate(task.id, { title: newTitle })}
                                    detailed
                                    onDragStart={handleDragStart}
                                    density={viewDensity}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- MAIN CONTENT (WEEKLY GRID) --- */}
            <div className="flex-1 overflow-hidden relative flex flex-col min-h-0 bg-[#0a0a0a]">
                {selectedTab === 'EXECUTION' && viewMode === 'WEEKLY' && (
                    <div className="flex-1 grid grid-cols-7 divide-x divide-[#222] min-h-0 overflow-hidden">
                        {weekDays.map(day => {
                            const tasks = dayBuckets[day.iso] || [];
                            const isToday = day.isToday;

                            return (
                                <div
                                    key={day.key}
                                    className={`flex flex-col h-full min-w-0 transition-colors group/col ${isToday ? 'bg-[#0f0f0f]' : 'bg-[#0a0a0a] hover:bg-[#0f0f0f]'}`}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, day.iso, day.key)}
                                >
                                    {/* Column Header */}
                                    <div className={`
                                    py-4 px-3 border-b border-[#222] flex items-end justify-between shrink-0 transition-colors
                                    ${isToday ? 'bg-[#151515] border-b-zinc-800' : ''}
                                `}>
                                        <div className="flex flex-col gap-0.5">
                                            <span className={`text-[10px] font-bold tracking-widest ${isToday ? 'text-white' : 'text-zinc-500'}`}>
                                                {day.label}
                                            </span>
                                            <span className={`text-[11px] font-mono ${isToday ? 'text-blue-400' : 'text-zinc-600'}`}>
                                                {day.dateLabel}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-zinc-700 font-mono">
                                            {tasks.length > 0 ? tasks.length : '-'}
                                        </span>
                                    </div>

                                    {/* Task Slots */}
                                    <div className={`flex-1 flex flex-col overflow-y-auto min-h-0 custom-scrollbar ${viewDensity === 'COMFORTABLE' ? 'p-3 gap-3' : 'p-2 gap-2'}`}>
                                        {tasks.map(task => (
                                            <TaskCard
                                                key={task.id}
                                                task={task}
                                                onToggle={(t) => onUpdate(t.id, { status: t.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE })}
                                                onUpdateTitle={(newTitle) => onUpdate(task.id, { title: newTitle })}
                                                onDragStart={handleDragStart}
                                                density={viewDensity}
                                            />
                                        ))}

                                        {/* Inline Quick Add */}
                                        {addingToDay === day.iso ? (
                                            <div className="border border-zinc-700 rounded-sm p-2 animate-in fade-in zoom-in-95 duration-100 bg-[#111]">
                                                <input
                                                    autoFocus
                                                    className="w-full bg-transparent text-[12px] text-zinc-100 placeholder:text-zinc-600 outline-none"
                                                    placeholder="Task..."
                                                    value={dayInputValue}
                                                    onChange={e => setDayInputValue(e.target.value)}
                                                    onKeyDown={(e) => handleDayInputKeyDown(e, day.iso, day.key)}
                                                    onBlur={() => !dayInputValue && setAddingToDay(null)}
                                                />
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => { setAddingToDay(day.iso); setDayInputValue(''); }}
                                                className="opacity-0 group-hover/col:opacity-100 transition-opacity p-2 border border-dashed border-[#222] rounded-sm text-zinc-700 hover:text-zinc-400 hover:border-zinc-700 hover:bg-[#111] flex items-center justify-center gap-2"
                                            >
                                                <Plus size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

        </div>
    );
};

const DockTab = ({ label, count, active, onClick, alert }: any) => (
    <button
        onClick={onClick}
        className={`h-full text-[10px] font-bold tracking-widest transition-colors flex items-center gap-2 relative
            ${active ? 'text-zinc-100' : 'text-zinc-600 hover:text-zinc-400'}
        `}
    >
        {label}
        {count !== undefined && <span className={`opacity-50`}>{count}</span>}
        {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-100"></div>}
        {alert && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>}
    </button>
)

const TaskCard: React.FC<{
    task: Task,
    onToggle: (t: Task) => void,
    onUpdateTitle: (title: string) => void,
    detailed?: boolean,
    density?: 'COMPACT' | 'COMFORTABLE',
    onDragStart: (e: React.DragEvent, id: string) => void
}> = ({ task, onToggle, onUpdateTitle, detailed, density = 'COMFORTABLE', onDragStart }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);

    // Sync state if prop changes (remote update)
    useEffect(() => { setEditTitle(task.title); }, [task.title]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            setIsEditing(false);
            if (editTitle.trim() !== task.title) { onUpdateTitle(editTitle); }
        }
        if (e.key === 'Escape') { setIsEditing(false); setEditTitle(task.title); }
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (editTitle.trim() !== task.title) { onUpdateTitle(editTitle); }
    };

    // --- SMART STYLING LOGIC ---
    const isHighImpact = task.impact === 'HIGH';
    const isDone = task.status === TaskStatus.DONE;
    const isMissed = !isDone && task.slot?.date && task.slot.date < new Date().toISOString().split('T')[0];

    // Base Styles
    let containerStyle = `bg-[#111] border border-[#222] hover:border-zinc-600`;
    let textStyle = `text-zinc-400`;

    // Smart Overrides
    if (isDone) {
        textStyle = `text-zinc-600 line-through`;
        containerStyle = `bg-[#0e0e0e] border border-[#1a1a1a] opacity-60`;
    } else if (isHighImpact) {
        containerStyle = `bg-[#1a0f0f] border border-red-900/40 hover:border-red-500/50 shadow-sm`;
        textStyle = `text-red-200 font-semibold`;
    } else if (isMissed) {
        containerStyle = `bg-[#131313] border border-orange-900/30 hover:border-orange-500/40`;
        textStyle = `text-orange-200/80`;
    } else {
        // Normal
        textStyle = `text-zinc-300`;
    }

    const isCompact = density === 'COMPACT';

    return (
        <div
            draggable={!isEditing}
            onDragStart={(e) => !isEditing && onDragStart(e, task.id)}
            className={`
                group relative rounded-[2px] transition-all box-border cursor-grab active:cursor-grabbing
                ${containerStyle}
                ${detailed ? 'p-3 flex flex-col gap-2' : isCompact ? 'p-2 py-1.5' : 'p-3'}
            `}
        >
            <div className={`flex items-start ${isCompact ? 'gap-2' : 'gap-3'}`}>
                {/* Checkbox */}
                <button
                    onClick={(e) => { e.stopPropagation(); onToggle(task); }}
                    className={`
                        shrink-0 flex items-center justify-center transition-colors rounded-[2px] border
                        ${isCompact ? 'mt-1 w-2.5 h-2.5' : 'mt-1 w-3 h-3'}
                        ${isDone
                            ? 'bg-transparent border-zinc-600'
                            : isHighImpact ? 'border-red-500/50 hover:bg-red-500/10' : 'border-zinc-700 hover:border-zinc-500'}
                    `}
                >
                    {isDone && <div className={`bg-zinc-500 ${isCompact ? 'w-1.5 h-1.5' : 'w-2 h-2'}`} />}
                </button>

                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <input
                            autoFocus
                            className={`w-full bg-transparent border-none outline-none p-0 m-0 ${textStyle} ${isCompact ? 'text-[11px]' : 'text-[12px]'}`}
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleBlur}
                        />
                    ) : (
                        <span
                            onClick={() => setIsEditing(true)}
                            className={`block cursor-text transition-colors leading-relaxed select-none
                                ${textStyle}
                                ${isCompact ? 'text-[11px]' : 'text-[12px]'}
                            `}
                        >
                            {task.title}
                        </span>
                    )}
                </div>
            </div>

            {detailed && (
                <div className="flex items-center justify-between mt-1 pl-6">
                    {isHighImpact && <span className="text-[9px] font-bold text-red-500 tracking-wider">URGENT</span>}
                </div>
            )}
        </div>
    )
}

export default GridTwoView;
