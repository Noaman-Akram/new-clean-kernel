import React, { useMemo, useState } from 'react';
import { AppState, Task, TaskStatus, Category, Severity, Weekday } from '../types';
import { Plus, Clock, LayoutGrid } from 'lucide-react';

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
const CATEGORY_DOTS: Record<Category, string> = {
    [Category.AGENCY]: 'bg-emerald-400',
    [Category.FREELANCE]: 'bg-amber-400',
    [Category.ZOHO]: 'bg-blue-400'
};

const GridTwoView: React.FC<Props> = ({ state, onAdd, onUpdate }) => {
    const [selectedDay, setSelectedDay] = useState<Weekday>('MON');
    const [draftTitle, setDraftTitle] = useState('');
    const [draftCategory, setDraftCategory] = useState<Category>(Category.AGENCY);
    const [draftImpact, setDraftImpact] = useState<Severity>('MED');

    const weekDays = useMemo(() => buildWeekDays(), []);

    const dayBuckets = useMemo(() => {
        const map: Record<Weekday, Task[]> = {
            MON: [],
            TUE: [],
            WED: [],
            THU: [],
            FRI: [],
            SAT: [],
            SUN: []
        };
        state.tasks.forEach(task => {
            if (task.slot) {
                map[task.slot.day].push(task);
            }
        });
        Object.values(map).forEach(list => list.sort((a, b) => a.createdAt - b.createdAt));
        return map;
    }, [state.tasks]);

    const unscheduled = state.tasks.filter(task => !task.slot);

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!draftTitle.trim()) return;
        onAdd(draftTitle.trim(), draftCategory, draftImpact, {
            slot: { day: selectedDay, hour: '09:00' },
            status: TaskStatus.TODO
        });
        setDraftTitle('');
    };

    const toggleDone = (task: Task) => {
        onUpdate(task.id, { status: task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE });
    };

    return (
        <div className="flex flex-col h-full bg-[#030303] text-white">
            <header className="border-b border-[#111]">
                <div className="px-8 py-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-8 text-[11px] uppercase tracking-[0.4em] text-zinc-500">
                        <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-sm bg-white" />
                            Life_Protocol
                        </span>
                        <span className="text-zinc-600">Strategy</span>
                        <span className="text-white">Execution</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500">
                        <button className="p-2 rounded-md border border-[#1b1b1b] bg-[#050505] hover:text-white">
                            <Clock size={14} />
                        </button>
                        <button className="p-2 rounded-md border border-[#1b1b1b] bg-[#050505] hover:text-white">
                            <LayoutGrid size={14} />
                        </button>
                    </div>
                </div>
                <form
                    onSubmit={handleAddTask}
                    className="px-8 py-3 border-t border-[#111] flex flex-wrap items-center gap-3 text-xs text-zinc-500"
                >
                    <select
                        value={selectedDay}
                        onChange={e => setSelectedDay(e.target.value as Weekday)}
                        className="bg-[#060606] border border-[#1a1a1a] rounded-lg px-3 py-1 uppercase tracking-[0.35em] focus:outline-none"
                    >
                        {weekDays.map(day => (
                            <option key={day.key} value={day.key} className="bg-black text-white">
                                {day.shortLabel}
                            </option>
                        ))}
                    </select>
                    <select
                        value={draftCategory}
                        onChange={e => setDraftCategory(e.target.value as Category)}
                        className="bg-[#060606] border border-[#1a1a1a] rounded-lg px-3 py-1 uppercase tracking-[0.35em] focus:outline-none"
                    >
                        <option value={Category.AGENCY}>NEMO</option>
                        <option value={Category.FREELANCE}>STUDIO</option>
                        <option value={Category.ZOHO}>CORP</option>
                    </select>
                    <select
                        value={draftImpact}
                        onChange={e => setDraftImpact(e.target.value as Severity)}
                        className="bg-[#060606] border border-[#1a1a1a] rounded-lg px-3 py-1 uppercase tracking-[0.35em] focus:outline-none"
                    >
                        <option value="HIGH">HIGH</option>
                        <option value="MED">MED</option>
                        <option value="LOW">LOW</option>
                    </select>
                    <input
                        value={draftTitle}
                        onChange={e => setDraftTitle(e.target.value)}
                        placeholder="Add task..."
                        className="bg-transparent border border-[#1a1a1a] rounded-lg px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none min-w-[220px]"
                    />
                    <button
                        type="submit"
                        className="inline-flex items-center gap-2 bg-white text-black rounded-lg px-4 py-2 font-semibold tracking-[0.2em]"
                    >
                        <Plus size={14} />
                        DROP
                    </button>
                </form>
            </header>

            <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-auto">
                    <div className="min-w-[980px] flex border-b border-[#111]">
                        {weekDays.map(day => (
                            <DayColumn
                                key={day.key}
                                title={day.label}
                                date={day.dateLabel}
                                tasks={dayBuckets[day.key]}
                                onToggleDone={toggleDone}
                            />
                        ))}
                        <DayColumn title="Dock" date="Unassigned" tasks={unscheduled} onToggleDone={toggleDone} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const DayColumn: React.FC<{
    title: string;
    date: string;
    tasks: Task[];
    onToggleDone: (task: Task) => void;
}> = ({ title, date, tasks, onToggleDone }) => {
    return (
        <div className="flex-1 border-l border-[#111] bg-[#040404] min-w-[160px]">
            <div className="px-4 py-3 border-b border-[#111]">
                <p className="text-[11px] uppercase tracking-[0.45em] text-zinc-500">{title}</p>
                <p className="text-xs text-zinc-600">{date}</p>
            </div>
            <div className="p-4 space-y-2">
                {tasks.length === 0 ? (
                    <div className="text-[10px] text-zinc-700 uppercase tracking-[0.3em] py-8 text-center border border-dashed border-[#111] rounded-lg">
                        Empty
                    </div>
                ) : (
                    tasks.map(task => (
                        <div
                            key={task.id}
                            onClick={() => onToggleDone(task)}
                            className={`w-full rounded-lg border border-[#1b1b1b] bg-gradient-to-br from-[#0a0a0a] to-[#070707] px-4 py-3 flex items-center gap-3 text-sm transition ${
                                task.status === TaskStatus.DONE ? 'opacity-60' : 'hover:border-zinc-500'
                            }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${CATEGORY_DOTS[task.category]}`} />
                            <span className="flex-1 truncate">{task.title}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const buildWeekDays = () => {
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
            label: current.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(),
            shortLabel: key,
            dateLabel: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };
    });
};

export default GridTwoView;
