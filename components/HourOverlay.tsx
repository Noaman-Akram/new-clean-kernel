import React, { useState, useEffect, useRef } from 'react';
import { Task, Category, DockSection, TaskStatus } from '../types';
import {
    X,
    Plus,
    ArrowRight,
    Repeat,
    FileText,
    Mountain,
    CheckCircle2,
    Trash2,
    ListTodo,
    Archive,
    GripVertical,
    Search
} from 'lucide-react';

interface Props {
    date: Date;
    hour: number;
    tasks: Task[];
    anchorEl: HTMLElement;
    dockTasks: Record<string, Task[]>;
    onClose: () => void;
    onAdd: (title: string, category: Category, impact: 'LOW' | 'MED' | 'HIGH', options?: any) => void;
    onUpdate: (id: string, updates: Partial<Task>) => void;
    onDelete: (id: string) => void;
    onUnschedule: (id: string) => void;
    onSelectTask: (task: Task) => void;
}

const HourOverlay: React.FC<Props> = ({
    date,
    hour,
    tasks,
    anchorEl,
    dockTasks,
    onClose,
    onAdd,
    onUpdate,
    onDelete,
    onUnschedule,
    onSelectTask
}) => {
    const [tab, setTab] = useState<'HOUR' | 'DOCK'>('HOUR'); // Start with scheduled tasks
    const [dockFilter, setDockFilter] = useState('');
    const [newItemTitle, setNewItemTitle] = useState('');

    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Position logic (Center vertically on anchor if possible, or align top)
    const rect = anchorEl.getBoundingClientRect();
    let top = rect.top;
    let left = rect.right + 4; // To the right of the cell

    // Adjust if off-screen
    if (left + 300 > window.innerWidth) {
        left = rect.left - 308; // Flip to left
    }
    const height = 400;
    if (top + height > window.innerHeight) {
        top = window.innerHeight - height - 10;
    }

    const handleQuickAdd = () => {
        if (!newItemTitle.trim()) return;
        const scheduledTime = new Date(date);
        scheduledTime.setHours(hour, 0, 0, 0);
        onAdd(newItemTitle.trim(), Category.AGENCY, 'MED', { scheduledTime: scheduledTime.getTime() });
        setNewItemTitle('');
        // Stay in HOUR tab to see result?
    };

    const handleDockPick = (item: Task) => {
        const scheduledTime = new Date(date);
        scheduledTime.setHours(hour, 0, 0, 0);

        if (item.dockSection === 'ROUTINE') {
            onAdd(item.title, item.category, item.impact, {
                scheduledTime: scheduledTime.getTime(),
                duration: item.duration,
                urgent: item.urgent
            });
        } else if (item.dockSection === 'PROJECT') {
            onAdd(`${item.title} — session`, item.category, item.impact, {
                scheduledTime: scheduledTime.getTime(),
                duration: 60,
                parentProject: item.id,
                urgent: item.urgent
            });
        } else if (item.dockSection === 'TEMPLATE') {
            onAdd(item.title, item.category, item.impact, {
                scheduledTime: scheduledTime.getTime(),
                duration: item.duration || 30,
            });
        } else {
            // Move: Todo, Later, Habit (Habit usually copies? No, Habits in Dock are definitions, daily ones are instances. But if user drags logic... let's assume move for Todo/Later)
            onUpdate(item.id, { scheduledTime: scheduledTime.getTime() });
        }
    };

    const getDockIcon = (type: string) => {
        switch (type) {
            case 'ROUTINE': return <Repeat size={10} />;
            case 'PROJECT': return <Mountain size={10} />;
            case 'TODO': return <ListTodo size={10} />;
            case 'HABIT': return <CheckCircle2 size={10} />;
            case 'TEMPLATE': return <FileText size={10} />;
            default: return <Archive size={10} />;
        }
    };

    const allDockTasks = Object.entries(dockTasks).flatMap(([type, list]) => list);
    const filteredDock = allDockTasks.filter(t => t.title.toLowerCase().includes(dockFilter.toLowerCase()));

    return (
        <div
            ref={overlayRef}
            style={{ top, left, position: 'fixed' }}
            className="z-50 w-80 h-[400px] bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
            {/* Header Tabs */}
            <div className="flex items-center border-b border-zinc-800 bg-zinc-950/50">
                <button
                    onClick={() => setTab('HOUR')}
                    className={`flex-1 py-3 text-xs font-medium text-center transition-colors ${tab === 'HOUR' ? 'text-emerald-400 bg-zinc-900' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    {date.toLocaleString('default', { weekday: 'short' })} {hour}:00
                </button>
                <div className="w-px h-4 bg-zinc-800" />
                <button
                    onClick={() => setTab('DOCK')}
                    className={`flex-1 py-3 text-xs font-medium text-center transition-colors ${tab === 'DOCK' ? 'text-emerald-400 bg-zinc-900' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    Dock Library
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                {tab === 'HOUR' && (
                    <div className="h-full flex flex-col">
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {tasks.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-zinc-600 text-[10px] italic">
                                    Empty slot
                                </div>
                            ) : (
                                tasks.map(task => (
                                    <div key={task.id} className="group flex items-center gap-2 p-2 bg-zinc-800/40 border border-zinc-700/50 rounded hover:bg-zinc-800 transition-colors">
                                        <button
                                            onClick={() => onUpdate(task.id, { status: task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE })}
                                            className={`flex-shrink-0 w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${task.status === TaskStatus.DONE ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'border-zinc-600 hover:border-zinc-400'}`}
                                        >
                                            {task.status === TaskStatus.DONE && <CheckCircle2 size={9} />}
                                        </button>
                                        <div
                                            className="flex-1 min-w-0 cursor-pointer"
                                            onClick={() => onSelectTask(task)}
                                        >
                                            <div className={`text-xs font-medium truncate ${task.status === TaskStatus.DONE ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                                                {task.title}
                                            </div>
                                            <div className="text-[9px] text-zinc-500 flex items-center gap-2 mt-0.5">
                                                <span>{task.duration || 30}m</span>
                                                {task.dockSection && <span className="uppercase border border-zinc-700 px-1 rounded bg-zinc-900">{task.dockSection}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => onUnschedule(task.id)} className="p-1 text-zinc-500 hover:text-zinc-300">
                                                <ArrowRight size={12} className="rotate-180" />
                                            </button>
                                            <button onClick={() => onDelete(task.id)} className="p-1 text-zinc-500 hover:text-red-400">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Quick Add at Bottom */}
                        <div className="p-2 border-t border-zinc-800 bg-zinc-900">
                            <div className="relative">
                                <Plus size={14} className="absolute left-2.5 top-2.5 text-zinc-500" />
                                <input
                                    value={newItemTitle}
                                    onChange={e => setNewItemTitle(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(); }}
                                    placeholder="Quick schedule..."
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded pl-8 pr-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-600/50"
                                    autoFocus
                                />
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'DOCK' && (
                    <div className="h-full flex flex-col">
                        <div className="p-2 border-b border-zinc-800">
                            <div className="relative">
                                <Search size={12} className="absolute left-2.5 top-2.5 text-zinc-500" />
                                <input
                                    value={dockFilter}
                                    onChange={e => setDockFilter(e.target.value)}
                                    placeholder="Search dock..."
                                    className="w-full bg-zinc-950 border-none rounded pl-8 pr-3 py-2 text-xs text-zinc-300 focus:ring-0"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            <div className="space-y-3">
                                {Object.entries(dockTasks).map(([key, list]) => {
                                    const visible = list.filter(t => t.title.toLowerCase().includes(dockFilter.toLowerCase()));
                                    if (visible.length === 0) return null;
                                    return (
                                        <div key={key}>
                                            <div className="px-2 mb-1 text-[9px] font-bold text-zinc-600 uppercase tracking-wider">{key}</div>
                                            <div className="space-y-0.5">
                                                {visible.map(task => (
                                                    <button
                                                        key={task.id}
                                                        onClick={() => handleDockPick(task)}
                                                        className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-zinc-800 text-left group"
                                                    >
                                                        <div className="text-zinc-500 opacity-50 group-hover:opacity-100">{getDockIcon(key)}</div>
                                                        <span className="text-xs text-zinc-400 group-hover:text-zinc-200 truncate flex-1">{task.title}</span>
                                                        <span className="text-[9px] text-emerald-500 opacity-0 group-hover:opacity-100 uppercase font-medium">Add</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HourOverlay;
