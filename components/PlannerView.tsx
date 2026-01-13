import React, { useMemo, useState } from 'react';
import { AppState, Task, TaskStatus, Category, Severity, TaskSlot, Pillar } from '../types';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

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

type WeekDay = {
    index: number;
    label: string;
    dateNumber: string;
    monthLabel: string;
    longLabel: string;
    start: number;
    end: number;
    isToday: boolean;
};

const CATEGORY_LABELS: Record<Category, string> = {
    [Category.CORE]: 'Core',
    [Category.GROWTH]: 'Growth',
    [Category.SERVICE]: 'Service'
};

const DAY_TAGS = ['@MON', '@TUE', '@WED', '@THU', '@FRI', '@SAT', '@SUN'];

const getDayStart = (value: number) => {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
};

const getWeekStart = (input: Date) => {
    const d = new Date(input);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

const buildWeekDays = (weekStart: Date): WeekDay[] => {
    return Array.from({ length: 7 }).map((_, idx) => {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + idx);

        const start = new Date(day);
        start.setHours(0, 0, 0, 0);
        const end = new Date(day);
        end.setHours(23, 59, 59, 999);

        return {
            index: idx,
            label: day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
            dateNumber: day.toLocaleDateString('en-US', { day: 'numeric' }),
            monthLabel: day.toLocaleDateString('en-US', { month: 'short' }),
            longLabel: day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            start: start.getTime(),
            end: end.getTime(),
            isToday: start.getTime() <= Date.now() && end.getTime() >= Date.now()
        };
    });
};

const formatWeekRange = (days: WeekDay[]) => {
    if (days.length === 0) return '';
    return `${days[0].longLabel} — ${days[6].longLabel}`;
};

const resolveDayTag = (tagRaw: string, weekDays: WeekDay[]): WeekDay | null => {
    const tag = tagRaw.toLowerCase();
    if (!tag) return null;
    if (tag === 'today') {
        return weekDays.find(d => d.isToday) || weekDays[0] || null;
    }
    if (tag === 'tomorrow') {
        const todayIdx = weekDays.findIndex(d => d.isToday);
        const idx = todayIdx >= 0 ? todayIdx + 1 : 1;
        return weekDays[idx] || null;
    }
    if (/\d{4}-\d{2}-\d{2}/.test(tag)) {
        const parsed = Date.parse(tag);
        if (!Number.isNaN(parsed)) {
            const start = getDayStart(parsed);
            return weekDays.find(d => d.start === start) || null;
        }
    }
    const short = tag.slice(0, 3);
    return weekDays.find(d => d.label.slice(0, 3).toLowerCase() === short) || null;
};

const parseCommandDraft = (draft: string, weekDays: WeekDay[]) => {
    const tokens = draft.trim().split(/\s+/).filter(Boolean);
    let scheduledDay: WeekDay | null = null;
    let severity: Severity = draft.includes('!') ? 'HIGH' : 'MED';
    const cleaned: string[] = [];

    tokens.forEach(token => {
        if (token.startsWith('@')) {
            const tag = token.slice(1);
            const match = resolveDayTag(tag, weekDays);
            if (match) {
                scheduledDay = match;
                return;
            }
        }
        cleaned.push(token.replace(/!/g, ''));
    });

    return {
        text: cleaned.join(' ').trim(),
        severity,
        scheduledDay
    };
};

const PlannerView: React.FC<Props> = ({ state, onAdd, onUpdate, onStartSession, activeTaskId }) => {
    const [commandDraft, setCommandDraft] = useState('');
    const [weekOffset, setWeekOffset] = useState(0);
    const [dayDrafts, setDayDrafts] = useState<Record<number, string>>({});

    const tasks = state.tasks.filter(t => t.status !== TaskStatus.DONE);
    const inboxTasks = tasks.filter(t => !t.deadline);

    const referenceDate = new Date();
    referenceDate.setDate(referenceDate.getDate() + weekOffset * 7);
    const weekStart = getWeekStart(referenceDate);
    const weekDays = buildWeekDays(weekStart);
    const weekLabel = formatWeekRange(weekDays);

    const tasksByDay = useMemo(() => {
        const map: Record<number, Task[]> = {};
        tasks.forEach(task => {
            if (!task.deadline) return;
            const key = getDayStart(task.deadline);
            if (!map[key]) map[key] = [];
            map[key].push(task);
        });
        Object.values(map).forEach(list => list.sort((a, b) => a.createdAt - b.createdAt));
        return map;
    }, [tasks]);

    const categorySummary = useMemo(() => {
        return Object.values(Category).map(cat => ({
            key: cat,
            label: CATEGORY_LABELS[cat],
            count: tasks.filter(t => t.category === cat).length
        }));
    }, [tasks]);

    const upcoming = useMemo(() => {
        const dated = tasks.filter(t => t.deadline).sort((a, b) => (a.deadline || 0) - (b.deadline || 0));
        return dated.slice(0, 4);
    }, [tasks]);

    const handleCommandSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!commandDraft.trim()) return;
        const { text, severity, scheduledDay } = parseCommandDraft(commandDraft, weekDays);
        if (!text) return;
        const options = scheduledDay ? { deadline: scheduledDay.end } : undefined;
        onAdd(text, Category.SERVICE, severity, options);
        setCommandDraft('');
    };

    const handleInsertTag = (tag: string) => {
        setCommandDraft(prev => `${prev.trim()} ${tag}`.trim());
    };

    const handleDayDraftChange = (dayStart: number, value: string) => {
        setDayDrafts(prev => ({ ...prev, [dayStart]: value }));
    };

    const handleDayAdd = (day: WeekDay) => {
        const draft = dayDrafts[day.start] || '';
        if (!draft.trim()) return;
        const severity: Severity = draft.includes('!') ? 'HIGH' : 'MED';
        onAdd(draft.replace(/!/g, '').trim(), Category.SERVICE, severity, { deadline: day.end });
        setDayDrafts(prev => ({ ...prev, [day.start]: '' }));
    };

    const handleClearDay = (day: WeekDay) => {
        const dayTasks = tasksByDay[day.start] || [];
        dayTasks.forEach(task => onUpdate(task.id, { deadline: undefined }));
    };

    const handleUnschedule = (taskId: string) => {
        onUpdate(taskId, { deadline: undefined });
    };

    const handleComplete = (taskId: string) => {
        onUpdate(taskId, { status: TaskStatus.DONE });
    };

    const handleScheduleFromBacklog = (taskId: string, day: WeekDay) => {
        onUpdate(taskId, { deadline: day.end });
    };

    return (
        <div className="min-h-screen bg-background text-zinc-100">
            <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 flex flex-col gap-6">
                <FocusPanel
                    weekLabel={weekLabel}
                    backlogCount={inboxTasks.length}
                    totalPending={tasks.length}
                    commandDraft={commandDraft}
                    onCommandChange={setCommandDraft}
                    onCommandSubmit={handleCommandSubmit}
                    onInsertTag={handleInsertTag}
                    weekDays={weekDays}
                    onPrevWeek={() => setWeekOffset(prev => prev - 1)}
                    onNextWeek={() => setWeekOffset(prev => prev + 1)}
                    onResetWeek={() => setWeekOffset(0)}
                    categorySummary={categorySummary}
                    upcoming={upcoming}
                />

                <WeekBoard
                    days={weekDays}
                    tasksByDay={tasksByDay}
                    dayDrafts={dayDrafts}
                    onDayDraftChange={handleDayDraftChange}
                    onDayAdd={handleDayAdd}
                    onClearDay={handleClearDay}
                    onStartSession={onStartSession}
                    onComplete={handleComplete}
                    onUnschedule={handleUnschedule}
                    onUpdate={onUpdate}
                    activeTaskId={activeTaskId}
                />

                <BacklogPanel
                    tasks={inboxTasks}
                    weekDays={weekDays}
                    onSchedule={handleScheduleFromBacklog}
                    onStartSession={onStartSession}
                    onComplete={handleComplete}
                    onUnschedule={handleUnschedule}
                    onUpdate={onUpdate}
                    activeTaskId={activeTaskId}
                />
            </div>
        </div>
    );
};

const FocusPanel = ({
    weekLabel,
    backlogCount,
    totalPending,
    commandDraft,
    onCommandChange,
    onCommandSubmit,
    onInsertTag,
    weekDays,
    onPrevWeek,
    onNextWeek,
    onResetWeek,
    categorySummary,
    upcoming
}: {
    weekLabel: string;
    backlogCount: number;
    totalPending: number;
    commandDraft: string;
    onCommandChange: (value: string) => void;
    onCommandSubmit: (e: React.FormEvent) => void;
    onInsertTag: (tag: string) => void;
    weekDays: WeekDay[];
    onPrevWeek: () => void;
    onNextWeek: () => void;
    onResetWeek: () => void;
    categorySummary: { key: Category; label: string; count: number }[];
    upcoming: Task[];
}) => (
    <section className="bg-surface/30 border border-border rounded-3xl p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
                <div className="text-xs font-black tracking-[0.6em] text-zinc-500">INSPIRED • SUNSAMA x NOTION BOARD</div>
                <div className="text-2xl lg:text-3xl font-semibold text-white">Command the week with one line</div>
                <p className="text-[12px] text-zinc-500">Use @day tokens and ! for priority. Everything else feels like a spreadsheet.</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <button onClick={onPrevWeek} className="w-8 h-8 border border-border rounded-lg flex items-center justify-center hover:border-white/40">
                    <ChevronLeft size={14} />
                </button>
                <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-border text-[11px] uppercase tracking-widest text-zinc-300 flex items-center gap-2">
                    <CalendarDays size={14} />
                    {weekLabel}
                </div>
                <button onClick={onNextWeek} className="w-8 h-8 border border-border rounded-lg flex items-center justify-center hover:border-white/40">
                    <ChevronRight size={14} />
                </button>
                <button onClick={onResetWeek} className="text-[10px] uppercase tracking-widest text-emerald-400">
                    Today
                </button>
            </div>
        </div>

        <form onSubmit={onCommandSubmit} className="flex flex-col gap-2">
            <input
                value={commandDraft}
                onChange={(e) => onCommandChange(e.target.value)}
                placeholder="Type 'Prepare deck @Tue !' or simply 'Inbox clean'"
                className="w-full bg-black/30 border border-zinc-800 rounded-2xl px-4 py-3 text-sm placeholder:text-zinc-600 focus:border-emerald-500 outline-none"
            />
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
                <span>Shortcuts:</span>
                {DAY_TAGS.map(tag => (
                    <button
                        key={tag}
                        type="button"
                        onClick={() => onInsertTag(tag)}
                        className="px-2 py-0.5 border border-zinc-700 rounded-full text-[10px] uppercase tracking-wide hover:border-white"
                    >
                        {tag}
                    </button>
                ))}
                <span className="text-zinc-600">Use ! anywhere for High priority</span>
            </div>
        </form>

        <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-7 flex flex-col gap-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatTile label="Open" value={totalPending} hint="all pending" />
                    <StatTile label="Backlog" value={backlogCount} hint="unscheduled" />
                    <StatTile label="Week" value={weekLabel} hint="range" compact />
                    <StatTile label="Day tokens" value="@Mon ..." hint="type to schedule" compact />
                </div>
                <div className="border border-zinc-800 rounded-2xl p-4 bg-black/20 flex flex-wrap gap-3">
                    {categorySummary.map(item => (
                        <div key={item.key} className="flex items-center gap-2 px-3 py-2 bg-black/40 rounded-xl border border-zinc-800 text-sm">
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span>{item.label}</span>
                            <span className="text-zinc-500">{item.count}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="lg:col-span-5 flex flex-col gap-3">
                <div className="text-[11px] font-mono text-zinc-500 uppercase">Next deadlines</div>
                <div className="border border-zinc-800 rounded-2xl bg-black/30 p-4 space-y-2 max-h-[200px] overflow-y-auto">
                    {upcoming.length === 0 ? (
                        <div className="text-[12px] text-zinc-600 font-mono">No scheduled work yet.</div>
                    ) : (
                        upcoming.map(task => (
                            <div key={task.id} className="flex items-center justify-between text-xs text-zinc-300">
                                <span className="flex-1 truncate pr-3">{task.title}</span>
                                <span className="text-[10px] text-zinc-500">
                                    {task.deadline ? new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    </section>
);

const WeekBoard = ({
    days,
    tasksByDay,
    dayDrafts,
    onDayDraftChange,
    onDayAdd,
    onClearDay,
    onStartSession,
    onComplete,
    onUnschedule,
    onUpdate,
    activeTaskId
}: {
    days: WeekDay[];
    tasksByDay: Record<number, Task[]>;
    dayDrafts: Record<number, string>;
    onDayDraftChange: (dayStart: number, value: string) => void;
    onDayAdd: (day: WeekDay) => void;
    onClearDay: (day: WeekDay) => void;
    onStartSession: (id: string) => void;
    onComplete: (id: string) => void;
    onUnschedule: (id: string) => void;
    onUpdate: (id: string, updates: Partial<Task>) => void;
    activeTaskId: string | null;
}) => (
    <section className="bg-surface/20 border border-border rounded-3xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <div>
                <div className="text-[11px] font-mono text-zinc-500 uppercase">Weekly board</div>
                <p className="text-sm text-zinc-400">Ideas from Sunsama + Trello: drag-feel columns, instant inputs.</p>
            </div>
        </div>
        <div className="overflow-x-auto">
            <div className="flex gap-4 min-w-[720px]">
                {days.map(day => (
                    <DayColumn
                        key={day.start}
                        day={day}
                        tasks={tasksByDay[day.start] || []}
                        draft={dayDrafts[day.start] || ''}
                        onDraftChange={value => onDayDraftChange(day.start, value)}
                        onAdd={() => onDayAdd(day)}
                        onClear={() => onClearDay(day)}
                        onStartSession={onStartSession}
                        onComplete={onComplete}
                        onUnschedule={onUnschedule}
                        onUpdate={onUpdate}
                        activeTaskId={activeTaskId}
                    />
                ))}
            </div>
        </div>
    </section>
);

const DayColumn = ({
    day,
    tasks,
    draft,
    onDraftChange,
    onAdd,
    onClear,
    onStartSession,
    onComplete,
    onUnschedule,
    onUpdate,
    activeTaskId
}: {
    day: WeekDay;
    tasks: Task[];
    draft: string;
    onDraftChange: (value: string) => void;
    onAdd: () => void;
    onClear: () => void;
    onStartSession: (id: string) => void;
    onComplete: (id: string) => void;
    onUnschedule: (id: string) => void;
    onUpdate: (id: string, updates: Partial<Task>) => void;
    activeTaskId: string | null;
}) => (
    <div className="flex flex-col bg-black/20 border border-zinc-800 rounded-3xl p-3 min-w-[200px]">
        <div className="flex items-center justify-between mb-2">
            <div>
                <div className="text-xs text-zinc-500 uppercase">{day.label}</div>
                <div className="text-lg font-semibold text-white">{day.dateNumber}</div>
            </div>
            <button onClick={onClear} className="text-[10px] text-zinc-500 border border-zinc-700 rounded-full px-2 py-0.5 hover:text-white">
                Clear
            </button>
        </div>
        <div className="flex-1 flex flex-col gap-2">
            {tasks.length === 0 && (
                <div className="text-[11px] text-zinc-600 font-mono border border-dashed border-zinc-800 rounded-2xl p-3 text-center">
                    Empty slot
                </div>
            )}
            {tasks.map(task => (
                <TaskCard
                    key={task.id}
                    task={task}
                    isActive={activeTaskId === task.id}
                    onStartSession={onStartSession}
                    onComplete={onComplete}
                    onUnschedule={onUnschedule}
                    onUpdate={onUpdate}
                />
            ))}
        </div>
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onAdd();
            }}
            className="mt-3"
        >
            <input
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                placeholder="Add task (use ! for high)"
                className="w-full bg-black/40 border border-zinc-800 rounded-2xl px-3 py-2 text-sm placeholder:text-zinc-600 focus:border-emerald-500 outline-none"
            />
        </form>
    </div>
);

const TaskCard = ({
    task,
    isActive,
    onStartSession,
    onComplete,
    onUnschedule,
    onUpdate
}: {
    task: Task;
    isActive: boolean;
    onStartSession: (id: string) => void;
    onComplete: (id: string) => void;
    onUnschedule: (id: string) => void;
    onUpdate: (id: string, updates: Partial<Task>) => void;
}) => (
    <div className={`flex flex-col gap-1 p-3 rounded-2xl border ${isActive ? 'border-emerald-400/60 bg-emerald-950/20' : 'border-zinc-800 bg-black/30'}`}>
        <textarea
            value={task.title}
            onChange={(e) => onUpdate(task.id, { title: e.target.value })}
            className={`w-full bg-transparent resize-none text-sm font-medium leading-snug outline-none ${isActive ? 'text-emerald-50' : 'text-zinc-200'}`}
        />
        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
            <button
                onClick={() => onStartSession(task.id)}
                className={`px-2 py-0.5 rounded-full border ${isActive ? 'border-emerald-400 text-emerald-300' : 'border-zinc-700 hover:border-emerald-400 hover:text-emerald-300'}`}
            >
                {isActive ? 'PAUSE' : 'FOCUS'}
            </button>
            <button
                onClick={() => onComplete(task.id)}
                className="px-2 py-0.5 rounded-full border border-zinc-700 hover:border-emerald-400 hover:text-emerald-300"
            >
                DONE
            </button>
            <button
                onClick={() => onUnschedule(task.id)}
                className="px-2 py-0.5 rounded-full border border-zinc-700 hover:border-zinc-400 hover:text-white"
            >
                BACKLOG
            </button>
            <span className="ml-auto text-[9px] uppercase tracking-wide">{task.impact}</span>
        </div>
    </div>
);

const BacklogPanel = ({
    tasks,
    weekDays,
    onSchedule,
    onStartSession,
    onComplete,
    onUnschedule,
    onUpdate,
    activeTaskId
}: {
    tasks: Task[];
    weekDays: WeekDay[];
    onSchedule: (taskId: string, day: WeekDay) => void;
    onStartSession: (id: string) => void;
    onComplete: (id: string) => void;
    onUnschedule: (id: string) => void;
    onUpdate: (id: string, updates: Partial<Task>) => void;
    activeTaskId: string | null;
}) => (
    <section className="bg-surface/20 border border-border rounded-3xl p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
            <div className="text-[11px] font-mono text-zinc-500 uppercase">Backlog</div>
            <p className="text-xs text-zinc-500">Inspired by Todoist quick capture. Use command box above or schedule from here.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
            {tasks.length === 0 ? (
                <div className="text-[12px] text-zinc-600 font-mono border border-dashed border-zinc-800 rounded-2xl p-4 text-center">Inbox clear.</div>
            ) : (
                tasks.map(task => (
                    <div key={task.id} className="border border-zinc-800 rounded-2xl bg-black/30 p-3 space-y-2">
                        <TaskCard
                            task={task}
                            isActive={activeTaskId === task.id}
                            onStartSession={onStartSession}
                            onComplete={onComplete}
                            onUnschedule={onUnschedule}
                            onUpdate={onUpdate}
                        />
                        <div className="flex flex-wrap gap-1 text-[10px] text-zinc-500">
                            {weekDays.map(day => (
                                <button
                                    key={`${task.id}-${day.start}`}
                                    onClick={() => onSchedule(task.id, day)}
                                    className="px-2 py-0.5 border border-zinc-700 rounded-full hover:border-emerald-400 hover:text-emerald-300"
                                >
                                    {day.label.slice(0, 3)} {day.dateNumber}
                                </button>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    </section>
);

const StatTile = ({ label, value, hint, compact }: { label: string; value: string | number; hint?: string; compact?: boolean }) => (
    <div className="border border-zinc-800 rounded-2xl bg-black/20 p-3 flex flex-col">
        <div className="text-[10px] font-mono text-zinc-500 uppercase">{label}</div>
        <div className={`text-white font-semibold ${compact ? 'text-xs truncate' : 'text-2xl'}`}>{value}</div>
        {hint && <div className="text-[10px] text-zinc-500">{hint}</div>}
    </div>
);

export default PlannerView;
