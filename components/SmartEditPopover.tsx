import React, { useState, useEffect, useRef } from 'react';
import { Task, TaskStatus } from '../types';
import {
    X,
    Trash2,
    Check,
    AlignLeft,
    AlertCircle,
    Clock,
    Calendar,
    ArrowRight
} from 'lucide-react';

interface SmartEditPopoverProps {
    task: Task;
    anchorEl: HTMLElement;
    onClose: () => void;
    onUpdate: (id: string, updates: Partial<Task>) => void;
    onDelete?: (id: string) => void;
}

const SmartEditPopover: React.FC<SmartEditPopoverProps> = ({ task, anchorEl, onClose, onUpdate, onDelete }) => {
    const [title, setTitle] = useState(task.title);
    const [notes, setNotes] = useState(task.notes || '');
    const [impact, setImpact] = useState(task.impact);
    const [duration, setDuration] = useState(task.duration || 0);
    const [urgent, setUrgent] = useState(task.urgent || false);

    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Calculate position
    const rect = anchorEl.getBoundingClientRect();
    const top = rect.bottom + 8; // Default below
    const left = rect.left;

    // Adjust if going off screen (basic)
    const style: React.CSSProperties = {
        top: top,
        left: Math.min(left, window.innerWidth - 320), // Prevent right overflow
        position: 'fixed',
    };

    const handleSave = () => {
        const handleSave = () => {
            onUpdate(task.id, { title, notes, impact, duration, urgent });
            onClose();
        };
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.metaKey) handleSave();
        if (e.key === 'Escape') onClose();
    };

    return (
        <div
            ref={popoverRef}
            style={style}
            className="z-50 w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
            {/* Header / Title */}
            <div className="p-3 border-b border-zinc-800 flex flex-col gap-2">
                <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="bg-transparent text-zinc-100 font-medium text-sm outline-none placeholder:text-zinc-600"
                    placeholder="Task title"
                    autoFocus
                />
                <div className="flex items-center gap-2">
                    {['LOW', 'MED', 'HIGH'].map((lvl) => (
                        <button
                            key={lvl}
                            onClick={() => setImpact(lvl as any)}
                            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors border
                            ${impact === lvl
                                    ? (lvl === 'HIGH' ? 'bg-amber-500/20 text-amber-500 border-amber-500/50' : lvl === 'MED' ? 'bg-blue-500/20 text-blue-500 border-blue-500/50' : 'bg-zinc-700 text-zinc-300 border-zinc-600')
                                    : 'bg-transparent text-zinc-500 border-transparent hover:bg-zinc-800'
                                }
                        `}
                        >
                            {lvl}
                        </button>
                    ))}
                </div>
            </div>

            {/* Body / Notes */}
            <div className="p-3 space-y-3">
                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-zinc-950/30 p-2 rounded border border-zinc-800 text-xs text-zinc-300 outline-none resize-none focus:border-zinc-700 min-h-[80px]"
                    placeholder="Add notes..."
                />

                <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-zinc-950/30 p-1.5 rounded border border-zinc-800">
                        <Clock size={12} className="text-zinc-500" />
                        <input
                            type="number"
                            value={duration || ''}
                            onChange={e => setDuration(parseInt(e.target.value) || 0)}
                            placeholder="Duration (min)"
                            className="bg-transparent text-xs text-zinc-300 outline-none w-full placeholder:text-zinc-600"
                        />
                    </div>

                    <button
                        onClick={() => setUrgent(!urgent)}
                        className={`p-1.5 rounded border transition-colors ${urgent
                                ? 'bg-red-950/30 border-red-900/50 text-red-400'
                                : 'bg-zinc-950/30 border-zinc-800 text-zinc-600 hover:text-zinc-400'
                            }`}
                        title="Toggle Urgent"
                    >
                        <AlertCircle size={14} />
                    </button>
                </div>
            </div>

            {/* Footer / Actions */}
            <div className="p-2 border-t border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-1">
                    {onDelete && (
                        <button
                            onClick={() => { if (confirm('Delete?')) onDelete(task.id); }}
                            className="p-1.5 text-zinc-600 hover:text-red-400 rounded hover:bg-red-900/10 transition-colors"
                        >
                            <Trash2 size={13} />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded shadow-sm"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SmartEditPopover;
