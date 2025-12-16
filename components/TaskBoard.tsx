import React, { useEffect, useMemo, useState } from 'react';
import {
    AppState,
    Task,
    TaskStatus,
    Category,
    Severity,
    TaskSlot,
    Pillar,
    Weekday
} from '../types';
import { Calendar, Plus, FileText, Play, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
    state: AppState;
    onAdd: (
        title: string,
        category: Category,
        impact: Severity,
        options?: { deadline?: number; slot?: TaskSlot; pillar?: Pillar; status?: TaskStatus }
    ) => void;
    onUpdate: (id: string, updates: Partial<Task>) => void;
    onStartSession: (id: string) => void;
    activeTaskId: string | null;
}

type WeekdayMeta = {
    key: Weekday;
    shortLabel: string;
    dateLabel: string;
    longLabel: string;
};

const WEEK_ORDER: Weekday[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const HOURS = ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
const DAY_MS = 1000 * 60 * 60 * 24;
const TIMELINE_SPAN_DAYS = 45;

const STATUS_META: Record<
    TaskStatus,
    { label: string; classes: string; accent: string; chip: string }
> = {
    [TaskStatus.BACKLOG]: {
        label: 'Backlog',
        classes: 'bg-[#0c0d12] border-zinc-900/60 text-zinc-200',
        accent: 'text-zinc-400',
        chip: 'bg-zinc-900/40 text-zinc-400 border border-zinc-800'
    },
    [TaskStatus.TODO]: {
        label: 'Ready',
        classes: 'bg-[#0d1118] border-[#1f2a37] text-sky-100',
        accent: 'text-sky-300',
        chip: 'bg-sky-500/10 text-sky-200 border border-sky-500/30'
    },
    [TaskStatus.IN_PROGRESS]: {
        label: 'In flight',
        classes: 'bg-[#0d1410] border-[#1b2d22] text-emerald-100',
        accent: 'text-emerald-300',
        chip: 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/40'
    },
    [TaskStatus.DONE]: {
        label: 'Done',
        classes: 'bg-[#121015] border-[#251530] text-purple-100',
        accent: 'text-purple-200',
        chip: 'bg-purple-500/10 text-purple-200 border border-purple-500/40'
    }
};

const CATEGORY_META: Record<Category, string> = {
    [Category.ZOHO]: 'Corp',
    [Category.FREELANCE]: 'Studio',
    [Category.AGENCY]: 'Nemo'
};

const PILLAR_META: { key: Pillar; label: string; description: string }[] = [
    {
        key: 'KNOWLEDGE',
        label: 'Knowledge',
        description: 'Research, foundations, learning.'
    },
    {
        key: 'DESIGN',
        label: 'Design',
        description: 'Build, craft, publishing.'
    },
    {
        key: 'MASTERY',
        label: 'Mastery',
        description: 'Clients, results, leverage.'
    }
];

const usePersistedNotes = (key: string, initial = '') => {
    const [value, setValue] = useState(() => {
        if (typeof window === 'undefined') return initial;
        return localStorage.getItem(key) || initial;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(key, value);
    }, [key, value]);

    return [value, setValue] as const;
};

const TaskBoard: React.FC<Props> = ({ state, onAdd, onUpdate, onStartSession, activeTaskId }) => {
    const [activeView, setActiveView] = useState<'weekly' | 'timeline'>('weekly');
    const [activeSlot, setActiveSlot] = useState<TaskSlot | null>(null);
    const [draftTitle, setDraftTitle] = useState('');
    const [draftCategory, setDraftCategory] = useState<Category>(Category.AGENCY);
    const [draftImpact, setDraftImpact] = useState<Severity>('MED');
    const [draftStatus, setDraftStatus] = useState<TaskStatus>(TaskStatus.TODO);
    const [dockTask, setDockTask] = useState<Task | null>(null);
    const [assignmentDay, setAssignmentDay] = useState<Weekday>('MON');
    const [assignmentHour, setAssignmentHour] = useState<string>(HOURS[1]);
    const [goalForm, setGoalForm] = useState<{ title: string; pillar: Pillar; deadline: string }>({
        title: '',
        pillar: PILLAR_META[0].key,
        deadline: ''
    });
    const [notes, setNotes] = usePersistedNotes('nemo_execution_notes', '');

    const weekDays = useMemo(() => buildWeekDays(), []);
    const weekRange = formatWeekRange(weekDays);

    const scheduledTasks = useMemo(
        () => state.tasks.filter(task => !!task.slot),
        [state.tasks]
    );
    const unscheduledTasks = useMemo(
        () => state.tasks.filter(task => !task.slot),
        [state.tasks]
    );

    const slotMap = useMemo(() => {
        const map: Record<string, Task[]> = {};
        scheduledTasks.forEach(task => {
            if (!task.slot) return;
            const key = `${task.slot.day}-${task.slot.hour}`;
            if (!map[key]) map[key] = [];
            map[key].push(task);
        });
        Object.values(map).forEach(items => {
            items.sort((a, b) => a.createdAt - b.createdAt);
        });
        return map;
    }, [scheduledTasks]);

    const timelineStart = useMemo(() => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        return start.getTime();
    }, []);
    const timelineEnd = timelineStart + TIMELINE_SPAN_DAYS * DAY_MS;
    const timelineTicks = useMemo(() => {
        return Array.from({ length: 6 }).map((_, idx) => {
            const ts = timelineStart + (idx / 5) * (timelineEnd - timelineStart);
            const date = new Date(ts);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
    }, [timelineEnd, timelineStart]);

    const toggleSlot = (slot: TaskSlot) => {
        if (activeSlot && activeSlot.day === slot.day && activeSlot.hour === slot.hour) {
            setActiveSlot(null);
        } else {
            setActiveSlot(slot);
            setDraftCategory(Category.AGENCY);
            setDraftImpact('MED');
            setDraftStatus(TaskStatus.TODO);
        }
    };

    const handleAddToSlot = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeSlot || !draftTitle.trim()) return;
        onAdd(draftTitle.trim(), draftCategory, draftImpact, {
            slot: activeSlot,
            status: draftStatus
        });
        setDraftTitle('');
        setActiveSlot(null);
    };

    const handleAssignDock = (e: React.FormEvent) => {
        e.preventDefault();
        if (!dockTask) return;
        onUpdate(dockTask.id, { slot: { day: assignmentDay, hour: assignmentHour } });
        setDockTask(null);
    };

    const handleGoalSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!goalForm.title.trim() || !goalForm.deadline) return;
        const deadlineTs = new Date(goalForm.deadline + 'T23:30:00').getTime();
        onAdd(goalForm.title.trim(), Category.AGENCY, 'HIGH', {
            deadline: deadlineTs,
            pillar: goalForm.pillar,
            status: TaskStatus.TODO
        });
        setGoalForm(prev => ({ ...prev, title: '', deadline: '' }));
    };

    const markDone = (task: Task) => {
        onUpdate(task.id, {
            status: task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE
        });
    };

    return (
        <div className="flex flex-col h-full bg-[#050506] text-white">
            <div className="border-b border-zinc-900/40 bg-[#050506]/85">
                <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                        <p className="text-sm text-zinc-500">Execution cockpit</p>
                        <h1 className="text-3xl font-semibold tracking-tight">Weekly rhythm</h1>
                        <p className="text-sm text-zinc-500">
                            Minimal schedule grid + long arc timeline. Nothing extra.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 bg-black/40 border border-zinc-800 rounded-full p-1">
                        <button
                            onClick={() => setActiveView('weekly')}
                            className={`px-4 py-1.5 text-sm rounded-full transition ${
                                activeView === 'weekly' ? 'bg-white text-black' : 'text-zinc-400'
                            }`}
                        >
                            Weekly grid
                        </button>
                        <button
                            onClick={() => setActiveView('timeline')}
                            className={`px-4 py-1.5 text-sm rounded-full transition ${
                                activeView === 'timeline' ? 'bg-white text-black' : 'text-zinc-400'
                            }`}
                        >
                            Timeline
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
                    {activeView === 'weekly' ? (
                        <WeeklyGrid
                            weekDays={weekDays}
                            weekRange={weekRange}
                            slotMap={slotMap}
                            activeSlot={activeSlot}
                            onSlotToggle={toggleSlot}
                            onSubmit={handleAddToSlot}
                            draftTitle={draftTitle}
                            setDraftTitle={setDraftTitle}
                            draftCategory={draftCategory}
                            setDraftCategory={setDraftCategory}
                            draftStatus={draftStatus}
                            setDraftStatus={setDraftStatus}
                            draftImpact={draftImpact}
                            setDraftImpact={setDraftImpact}
                            unscheduled={unscheduledTasks}
                            dockTask={dockTask}
                            setDockTask={setDockTask}
                            assignmentDay={assignmentDay}
                            setAssignmentDay={setAssignmentDay}
                            assignmentHour={assignmentHour}
                            setAssignmentHour={setAssignmentHour}
                            onAssignDock={handleAssignDock}
                            onToggleDone={markDone}
                            onStartSession={onStartSession}
                            activeTaskId={activeTaskId}
                        />
                    ) : (
                        <TimelineView
                            tasks={state.tasks}
                            onToggleDone={markDone}
                            timelineStart={timelineStart}
                            timelineEnd={timelineEnd}
                            ticks={timelineTicks}
                            goalForm={goalForm}
                            setGoalForm={setGoalForm}
                            onSubmitGoal={handleGoalSubmit}
                            onStartSession={onStartSession}
                            activeTaskId={activeTaskId}
                        />
                    )}

                    <section className="border border-zinc-900/60 rounded-2xl bg-black/30 p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <FileText size={16} />
                            On-site doc
                        </div>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Capture outcomes, reflections, or a micro brief…"
                            className="w-full h-40 bg-transparent border border-zinc-800 rounded-xl p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                        />
                    </section>
                </div>
            </div>
        </div>
    );
};

const WeeklyGrid: React.FC<{
    weekDays: WeekdayMeta[];
    weekRange: string;
    slotMap: Record<string, Task[]>;
    activeSlot: TaskSlot | null;
    onSlotToggle: (slot: TaskSlot) => void;
    onSubmit: (e: React.FormEvent) => void;
    draftTitle: string;
    setDraftTitle: (val: string) => void;
    draftCategory: Category;
    setDraftCategory: (val: Category) => void;
    draftStatus: TaskStatus;
    setDraftStatus: (val: TaskStatus) => void;
    draftImpact: Severity;
    setDraftImpact: (val: Severity) => void;
    unscheduled: Task[];
    dockTask: Task | null;
    setDockTask: (task: Task | null) => void;
    assignmentDay: Weekday;
    setAssignmentDay: (day: Weekday) => void;
    assignmentHour: string;
    setAssignmentHour: (hour: string) => void;
    onAssignDock: (e: React.FormEvent) => void;
    onToggleDone: (task: Task) => void;
    onStartSession: (id: string) => void;
    activeTaskId: string | null;
}> = props => {
    const {
        weekDays,
        weekRange,
        slotMap,
        activeSlot,
        onSlotToggle,
        onSubmit,
        draftTitle,
        setDraftTitle,
        draftCategory,
        setDraftCategory,
        draftStatus,
        setDraftStatus,
        draftImpact,
        setDraftImpact,
        unscheduled,
        dockTask,
        setDockTask,
        assignmentDay,
        setAssignmentDay,
        assignmentHour,
        setAssignmentHour,
        onAssignDock,
        onToggleDone,
        onStartSession,
        activeTaskId
    } = props;

    return (
        <section className="space-y-5">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-white">Weekly grid</h2>
                    <p className="text-sm text-zinc-500">Tap a slot to drop directives. Dock feeds the grid.</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <ChevronLeft size={14} className="opacity-30" />
                    {weekRange}
                    <ChevronRight size={14} className="opacity-30" />
                </div>
            </header>

            <div className="rounded-2xl border border-zinc-900/60 overflow-hidden">
                <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))]">
                    <div className="bg-[#08080b] border-b border-zinc-900/60" />
                    {weekDays.map(day => (
                        <div
                            key={day.key}
                            className="border-l border-b border-zinc-900/60 bg-[#08080b] p-3 text-sm text-zinc-300"
                        >
                            <span className="font-mono text-zinc-500">{day.shortLabel}</span>
                            <div className="text-2xl font-semibold">{day.dateLabel}</div>
                        </div>
                    ))}

                    {HOURS.map(hour => (
                        <React.Fragment key={hour}>
                            <div className="border-b border-zinc-900/60 bg-[#050506] px-3 py-6 text-xs font-mono text-zinc-600">
                                {hour}
                            </div>
                            {weekDays.map(day => {
                                const slotKey = `${day.key}-${hour}`;
                                const tasks = slotMap[slotKey] || [];
                                const isActive =
                                    activeSlot && activeSlot.day === day.key && activeSlot.hour === hour;

                                return (
                                    <div
                                        key={slotKey}
                                        onClick={() => onSlotToggle({ day: day.key, hour })}
                                        className={`min-h-[110px] border-l border-b border-zinc-900/60 p-2 bg-[#050506] hover:bg-[#08080c] transition-colors cursor-pointer`}
                                    >
                                        <div className="space-y-2">
                                            {tasks.map(task => (
                                                <TaskCard
                                                    key={task.id}
                                                    task={task}
                                                    onToggleDone={() => onToggleDone(task)}
                                                    onStartSession={onStartSession}
                                                    isActive={activeTaskId === task.id}
                                                />
                                            ))}
                                        </div>
                                        {isActive && (
                                            <form
                                                onSubmit={onSubmit}
                                                onClick={e => e.stopPropagation()}
                                                className="mt-3 p-3 rounded-xl border border-zinc-800 bg-black/50 space-y-2 text-sm"
                                            >
                                                <input
                                                    value={draftTitle}
                                                    onChange={e => setDraftTitle(e.target.value)}
                                                    placeholder="Add task into this block…"
                                                    className="w-full bg-transparent border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                                                />
                                                <div className="grid grid-cols-3 gap-2 text-xs">
                                                    <select
                                                        value={draftCategory}
                                                        onChange={e => setDraftCategory(e.target.value as Category)}
                                                        className="bg-transparent border border-zinc-800 rounded-lg px-2 py-2 text-zinc-300 focus:outline-none"
                                                    >
                                                        {Object.entries(CATEGORY_META).map(([key, label]) => (
                                                            <option key={key} value={key} className="bg-black text-white">
                                                                {label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        value={draftStatus}
                                                        onChange={e => setDraftStatus(e.target.value as TaskStatus)}
                                                        className="bg-transparent border border-zinc-800 rounded-lg px-2 py-2 text-zinc-300 focus:outline-none"
                                                    >
                                                        {Object.values(TaskStatus).map(status => (
                                                            <option key={status} value={status} className="bg-black text-white">
                                                                {STATUS_META[status].label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        value={draftImpact}
                                                        onChange={e => setDraftImpact(e.target.value as Severity)}
                                                        className="bg-transparent border border-zinc-800 rounded-lg px-2 py-2 text-zinc-300 focus:outline-none"
                                                    >
                                                        <option value="LOW" className="bg-black text-white">
                                                            Low
                                                        </option>
                                                        <option value="MED" className="bg-black text-white">
                                                            Focus
                                                        </option>
                                                        <option value="HIGH" className="bg-black text-white">
                                                            Critical
                                                        </option>
                                                    </select>
                                                </div>
                                                <button
                                                    type="submit"
                                                    className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-white text-black py-2 text-xs font-semibold"
                                                >
                                                    <Plus size={12} />
                                                    Add
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            <div className="border border-zinc-900/60 rounded-2xl p-4 space-y-4 bg-[#050506]">
                <div className="flex items-center justify-between text-sm text-zinc-400">
                    <span>Unassigned dock</span>
                    <span>{unscheduled.length} staged</span>
                </div>
                <div className="flex flex-wrap gap-3">
                    {unscheduled.length === 0 ? (
                        <p className="text-xs text-zinc-600">Everything already lives on the grid.</p>
                    ) : (
                        unscheduled.map(task => (
                            <button
                                key={task.id}
                                onClick={() => {
                                    setDockTask(task);
                                    setAssignmentDay((task.slot?.day || 'MON') as Weekday);
                                    setAssignmentHour(task.slot?.hour || HOURS[0]);
                                }}
                                className={`text-left px-3 py-2 rounded-xl border ${STATUS_META[task.status].chip} hover:border-white/40 transition text-sm`}
                            >
                                <p className="text-white">{task.title}</p>
                                <p className="text-xs text-zinc-500">
                                    {CATEGORY_META[task.category]} • {task.impact}
                                </p>
                            </button>
                        ))
                    )}
                </div>
                {dockTask && (
                    <form
                        onSubmit={onAssignDock}
                        className="p-3 rounded-xl border border-zinc-800 bg-black/40 space-y-3 text-sm"
                    >
                        <p className="text-zinc-400 text-sm">Schedule “{dockTask.title}”</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <select
                                value={assignmentDay}
                                onChange={e => setAssignmentDay(e.target.value as Weekday)}
                                className="bg-transparent border border-zinc-800 rounded-lg px-2 py-2 text-zinc-300"
                            >
                                {weekDays.map(day => (
                                    <option key={day.key} value={day.key} className="bg-black text-white">
                                        {day.shortLabel}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={assignmentHour}
                                onChange={e => setAssignmentHour(e.target.value)}
                                className="bg-transparent border border-zinc-800 rounded-lg px-2 py-2 text-zinc-300"
                            >
                                {HOURS.map(hour => (
                                    <option key={hour} value={hour} className="bg-black text-white">
                                        {hour}
                                    </option>
                                ))}
                            </select>
                            <button type="submit" className="bg-white text-black rounded-lg font-semibold text-xs">
                                Place
                            </button>
                        </div>
                        <button type="button" onClick={() => setDockTask(null)} className="text-xs text-zinc-500 underline">
                            cancel
                        </button>
                    </form>
                )}
            </div>
        </section>
    );
};

const TimelineView: React.FC<{
    tasks: Task[];
    onToggleDone: (task: Task) => void;
    timelineStart: number;
    timelineEnd: number;
    ticks: string[];
    goalForm: { title: string; pillar: Pillar; deadline: string };
    setGoalForm: React.Dispatch<React.SetStateAction<{ title: string; pillar: Pillar; deadline: string }>>;
    onSubmitGoal: (e: React.FormEvent) => void;
    onStartSession: (id: string) => void;
    activeTaskId: string | null;
}> = ({ tasks, onToggleDone, timelineStart, timelineEnd, ticks, goalForm, setGoalForm, onSubmitGoal, onStartSession, activeTaskId }) => {
    const pillarToTasks = useMemo(() => {
        const map: Record<Pillar, Task[]> = {
            KNOWLEDGE: [],
            DESIGN: [],
            MASTERY: []
        };
        tasks.forEach(task => {
            if (task.pillar && task.deadline) {
                map[task.pillar].push(task);
            }
        });
        Object.values(map).forEach(list => list.sort((a, b) => (a.deadline || 0) - (b.deadline || 0)));
        return map;
    }, [tasks]);

    const upcoming = tasks
        .filter(task => task.deadline)
        .sort((a, b) => (a.deadline || 0) - (b.deadline || 0))
        .slice(0, 5);

    const span = timelineEnd - timelineStart;

    const getBarStyle = (task: Task) => {
        const start = Math.max(task.createdAt, timelineStart);
        const end = Math.max(task.deadline || start + DAY_MS * 2, start + DAY_MS);
        const leftRaw = ((start - timelineStart) / span) * 100;
        const widthRaw = ((end - start) / span) * 100;
        const left = Math.min(100, Math.max(0, leftRaw));
        const width = Math.min(100 - left, Math.max(7, widthRaw));
        return { left: `${left}%`, width: `${width}%` };
    };

    return (
        <section className="space-y-5">
            <header className="space-y-1">
                <h2 className="text-xl font-semibold text-white">Timeline</h2>
                <p className="text-sm text-zinc-500">Goals stretch from start to deadline. Minimal bars, quick status.</p>
            </header>

            <div className="border border-zinc-900/60 rounded-2xl bg-[#050506] overflow-hidden">
                <div className="grid grid-cols-6 border-b border-zinc-900/60 text-xs text-zinc-500">
                    {ticks.map(tick => (
                        <div key={tick} className="px-4 py-3 font-mono border-l border-zinc-900/60 first:border-l-0">
                            {tick}
                        </div>
                    ))}
                </div>
                <div className="divide-y divide-zinc-900/60">
                    {PILLAR_META.map(pillar => (
                        <div key={pillar.key} className="p-4 space-y-2">
                            <div className="flex items-center justify-between text-xs text-zinc-500">
                                <span>{pillar.label}</span>
                                <span>{pillar.description}</span>
                            </div>
                            <div className="relative h-24 rounded-xl border border-zinc-900/60 bg-black/30 overflow-hidden">
                                {pillarToTasks[pillar.key].map(task => (
                                    <div
                                        key={task.id}
                                        style={getBarStyle(task)}
                                        className={`absolute top-3 bottom-3 rounded-xl border ${STATUS_META[task.status].classes} px-4 py-2 text-xs flex flex-col justify-between`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={task.status === TaskStatus.DONE}
                                                    onChange={() => onToggleDone(task)}
                                                    className="size-3.5 border border-zinc-500 rounded bg-transparent accent-emerald-500"
                                                />
                                                <span className="font-semibold truncate">{task.title}</span>
                                            </label>
                                            <span className={`text-[10px] uppercase tracking-wide ${STATUS_META[task.status].accent}`}>
                                                {STATUS_META[task.status].label}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-zinc-400">
                                            <span>{new Date(task.deadline || Date.now()).toLocaleDateString()}</span>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded-full border ${STATUS_META[task.status].chip}`}>
                                                    {CATEGORY_META[task.category]}
                                                </span>
                                                {task.status !== TaskStatus.DONE && (
                                                    <button
                                                        onClick={() => onStartSession(task.id)}
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                                                            activeTaskId === task.id
                                                                ? 'border-emerald-400 text-emerald-200'
                                                                : 'border-zinc-700 text-zinc-400'
                                                        }`}
                                                    >
                                                        <Play size={10} />
                                                        {activeTaskId === task.id ? 'Active' : 'Focus'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <form onSubmit={onSubmitGoal} className="border border-zinc-900/60 rounded-2xl bg-[#050506] p-5 space-y-4">
                    <div className="text-sm text-zinc-400">Add goal</div>
                    <input
                        value={goalForm.title}
                        onChange={e => setGoalForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Ship marketing deck…"
                        className="w-full bg-transparent border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                    />
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <select
                            value={goalForm.pillar}
                            onChange={e => setGoalForm(prev => ({ ...prev, pillar: e.target.value as Pillar }))}
                            className="bg-transparent border border-zinc-800 rounded-xl px-4 py-3 text-white"
                        >
                            {PILLAR_META.map(pillar => (
                                <option key={pillar.key} value={pillar.key} className="bg-black text-white">
                                    {pillar.label}
                                </option>
                            ))}
                        </select>
                        <input
                            type="date"
                            value={goalForm.deadline}
                            onChange={e => setGoalForm(prev => ({ ...prev, deadline: e.target.value }))}
                            className="bg-transparent border border-zinc-800 rounded-xl px-4 py-3 text-white"
                        />
                    </div>
                    <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-2 bg-white text-black w-full py-3 rounded-xl font-semibold text-sm"
                    >
                        <Plus size={16} />
                        Save goal
                    </button>
                </form>

                <div className="border border-zinc-900/60 rounded-2xl bg-[#050506] p-5 space-y-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Calendar size={16} />
                        Upcoming deadlines
                    </div>
                    <div className="space-y-2">
                        {upcoming.length === 0 ? (
                            <p className="text-xs text-zinc-600">No deadlines logged yet.</p>
                        ) : (
                            upcoming.map(task => (
                                <div
                                    key={task.id}
                                    className="border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between gap-2"
                                >
                                    <div>
                                        <p className="text-sm text-white">{task.title}</p>
                                        <p className="text-xs text-zinc-500">{CATEGORY_META[task.category]}</p>
                                    </div>
                                    <div className="text-right text-xs text-zinc-400 font-mono">
                                        {new Date(task.deadline || Date.now()).toLocaleDateString()}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

const TaskCard: React.FC<{
    task: Task;
    onToggleDone: () => void;
    onStartSession: (id: string) => void;
    isActive: boolean;
}> = ({ task, onToggleDone, onStartSession, isActive }) => {
    return (
        <div
            className={`rounded-xl border px-3 py-2 text-xs space-y-1 ${STATUS_META[task.status].classes}`}
            onClick={e => e.stopPropagation()}
        >
            <div className="flex items-start justify-between gap-2">
                <label className="flex items-start gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={task.status === TaskStatus.DONE}
                        onChange={onToggleDone}
                        className="mt-0.5 size-3.5 border border-zinc-500 rounded bg-transparent accent-emerald-500"
                    />
                    <span className="text-sm font-medium leading-tight text-white">{task.title}</span>
                </label>
                <span className="text-[10px] uppercase tracking-[0.25em]">{STATUS_META[task.status].label}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span>
                    {CATEGORY_META[task.category]} • {task.impact}
                </span>
                {task.status !== TaskStatus.DONE && (
                    <button
                        onClick={() => onStartSession(task.id)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                            isActive ? 'border-emerald-400 text-emerald-200' : 'border-zinc-700 text-zinc-400'
                        }`}
                    >
                        <Play size={10} />
                        {isActive ? 'Active' : 'Focus'}
                    </button>
                )}
            </div>
        </div>
    );
};

const buildWeekDays = (): WeekdayMeta[] => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    return WEEK_ORDER.map((key, idx) => {
        const current = new Date(monday);
        current.setDate(monday.getDate() + idx);
        return {
            key,
            shortLabel: key,
            dateLabel: current.toLocaleDateString('en-US', { day: 'numeric' }),
            longLabel: current.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        };
    });
};

const formatWeekRange = (days: WeekdayMeta[]) => {
    if (days.length === 0) return '';
    return `${days[0].longLabel} — ${days[days.length - 1].longLabel}`;
};

export default TaskBoard;
