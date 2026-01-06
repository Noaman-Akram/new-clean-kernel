import React, { useState, useEffect } from 'react';
import { Task, Category, DockSection } from '../types';
import { X, Trash2, Copy, ArrowLeft, Calendar, Clock, AlertCircle } from 'lucide-react';

interface Props {
    task: Task;
    onClose: () => void;
    onUpdate: (id: string, updates: Partial<Task>) => void;
    onDelete: (id: string) => void;
    onUnschedule: (id: string) => void;
    onDuplicate: (task: Task) => void;
}

const InspectorPanel: React.FC<Props> = ({ task, onClose, onUpdate, onDelete, onUnschedule, onDuplicate }) => {
    const [title, setTitle] = useState(task.title);
    const [notes, setNotes] = useState(task.notes || '');
    const [dateStr, setDateStr] = useState('');
    const [timeStr, setTimeStr] = useState('');

    useEffect(() => {
        setTitle(task.title);
        setNotes(task.notes || '');
        if (task.scheduledTime) {
            const d = new Date(task.scheduledTime);
            setDateStr(d.toISOString().split('T')[0]);
            setTimeStr(d.toTimeString().slice(0, 5));
        } else {
            setDateStr('');
            setTimeStr('');
        }
    }, [task]);

    const handleTitleBlur = () => {
        if (title.trim() !== task.title) {
            onUpdate(task.id, { title: title.trim() });
        }
    };

    const handleNotesBlur = () => {
        if (notes.trim() !== (task.notes || '')) {
            onUpdate(task.id, { notes: notes.trim() });
        }
    };

    const handleScheduleUpdate = (newDate: string, newTime: string) => {
        if (!newDate) {
            // If clearing date, maybe unschedule? But input usually implies setting.
            return;
        }
        const d = new Date(newDate);
        if (newTime) {
            const [hours, minutes] = newTime.split(':').map(Number);
            d.setHours(hours, minutes);
        } else {
            d.setHours(9, 0); // Default to morning if only date set
        }
        onUpdate(task.id, { scheduledTime: d.getTime() });
    };

    const dockSections: DockSection[] = ['TODO', 'ROUTINE', 'PROJECT', 'HABIT', 'LATER', 'TEMPLATE'];

    return (
        <>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 z-40 backdrop-blur-[2px] transition-opacity"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="absolute top-0 right-0 h-full w-96 bg-surface border-l border-border z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">

                {/* Header */}
                <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-zinc-900/50">
                    <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Inspector
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">

                    {/* Title Section */}
                    <div className="space-y-2">
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            onBlur={handleTitleBlur}
                            onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                            className="w-full bg-transparent text-lg font-medium text-zinc-100 placeholder-zinc-600 border-none focus:ring-0 p-0"
                            placeholder="Task title..."
                        />
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onUpdate(task.id, { urgent: !task.urgent })}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium border transition-colors ${task.urgent
                                        ? 'bg-red-950/30 border-red-900/50 text-red-400'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                                    }`}
                            >
                                <AlertCircle size={10} />
                                {task.urgent ? 'Urgent' : 'Normal Priority'}
                            </button>

                            <select
                                value={task.dockSection || 'TODO'}
                                onChange={(e) => onUpdate(task.id, { dockSection: e.target.value as DockSection })}
                                className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] rounded px-2 py-1 focus:ring-1 focus:ring-zinc-700 outline-none"
                            >
                                {dockSections.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-medium text-zinc-500 uppercase">Details</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            onBlur={handleNotesBlur}
                            className="w-full h-32 bg-zinc-900/50 border border-zinc-800 rounded-md p-3 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 resize-none selection:bg-emerald-900/30"
                            placeholder="Add details, notes, or subtasks..."
                        />
                    </div>

                    {/* Schedule */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-medium text-zinc-500 uppercase">Schedule</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
                                    <Calendar size={12} />
                                    <span>Date</span>
                                </div>
                                <input
                                    type="date"
                                    value={dateStr}
                                    onChange={e => {
                                        setDateStr(e.target.value);
                                        handleScheduleUpdate(e.target.value, timeStr);
                                    }}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 focus:border-zinc-700 outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
                                    <Clock size={12} />
                                    <span>Time</span>
                                </div>
                                <input
                                    type="time"
                                    value={timeStr}
                                    onChange={e => {
                                        setTimeStr(e.target.value);
                                        handleScheduleUpdate(dateStr, e.target.value);
                                    }}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 focus:border-zinc-700 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-zinc-800/50 my-2" />

                    {/* Actions */}
                    <div className="space-y-2">
                        <button
                            onClick={() => { onUnschedule(task.id); onClose(); }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-zinc-900 text-xs text-zinc-400 transition-colors text-left"
                        >
                            <ArrowLeft size={14} />
                            <span>Move back to Dock</span>
                        </button>
                        <button
                            onClick={() => { onDuplicate(task); onClose(); }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-zinc-900 text-xs text-zinc-400 transition-colors text-left"
                        >
                            <Copy size={14} />
                            <span>Duplicate Task</span>
                        </button>
                        <button
                            onClick={() => { onDelete(task.id); onClose(); }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-red-950/20 text-xs text-zinc-500 hover:text-red-400 transition-colors text-left"
                        >
                            <Trash2 size={14} />
                            <span>Delete Task</span>
                        </button>
                    </div>

                </div>
            </div>
        </>
    );
};

export default InspectorPanel;
