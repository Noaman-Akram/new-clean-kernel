import React, { useState, useEffect } from 'react';
import { DockItem, DockItemType } from '../types';
import { X, Plus, Trash2 } from 'lucide-react';

interface DockItemDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: Partial<DockItem>) => void;
    initialItem?: DockItem | null;
    initialType?: DockItemType;
}

const DockItemDialog: React.FC<DockItemDialogProps> = ({
    isOpen,
    onClose,
    onSave,
    initialItem,
    initialType = 'TODO',
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<DockItemType>(initialType);
    const [steps, setSteps] = useState<string[]>([]); // For Templates
    const [frequency, setFrequency] = useState<string>('daily'); // For Habits

    useEffect(() => {
        if (isOpen) {
            if (initialItem) {
                setTitle(initialItem.title);
                setDescription(initialItem.description || '');
                setType(initialItem.type);
                setSteps(initialItem.steps || []);
                setFrequency(initialItem.frequency || 'daily');
            } else {
                setTitle('');
                setDescription('');
                setType(initialType);
                setSteps([]);
                setFrequency('daily');
                // If type is TEMPLATE, start with one empty step
                if (initialType === 'TEMPLATE') setSteps(['']);
            }
        }
    }, [isOpen, initialItem, initialType]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        onSave({
            id: initialItem?.id, // If editing, pass ID
            title,
            description,
            type,
            steps: type === 'TEMPLATE' ? steps.filter(s => s.trim()) : undefined,
            frequency: type === 'HABIT' ? frequency : undefined,
        });
        onClose();
    };

    const handleAddStep = () => {
        setSteps([...steps, '']);
    };

    const handleStepChange = (index: number, value: string) => {
        const newSteps = [...steps];
        newSteps[index] = value;
        setSteps(newSteps);
    };

    const handleDeleteStep = (index: number) => {
        setSteps(steps.filter((_, i) => i !== index));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                    <h2 className="text-sm font-medium text-zinc-100">
                        {initialItem ? 'Edit Item' : 'New Item'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-900 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Type Selector (Only if new, or maybe allow changing?) - For now let's allow changing */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Type</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['TODO', 'LATER', 'ROUTINE', 'PROJECT', 'TEMPLATE', 'HABIT'] as DockItemType[]).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setType(t)}
                                    className={`px-2 py-1.5 text-xs rounded border transition-all ${type === t
                                            ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Morning Workout"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all placeholder:text-zinc-700"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add details..."
                            rows={3}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:border-zinc-700 outline-none transition-colors resize-none placeholder:text-zinc-700"
                        />
                    </div>

                    {/* Type Specific Fields */}
                    {type === 'TEMPLATE' && (
                        <div className="space-y-2 pt-2 border-t border-zinc-800/50">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Steps</label>
                                <button type="button" onClick={handleAddStep} className="text-[10px] flex items-center gap-1 text-emerald-500 hover:text-emerald-400">
                                    <Plus size={10} /> Add Step
                                </button>
                            </div>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {steps.map((step, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="text-zinc-600 text-xs font-mono w-4">{idx + 1}.</span>
                                        <input
                                            type="text"
                                            value={step}
                                            onChange={(e) => handleStepChange(idx, e.target.value)}
                                            className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 focus:border-zinc-700 outline-none"
                                        />
                                        <button type="button" onClick={() => handleDeleteStep(idx)} className="text-zinc-600 hover:text-red-400">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                {steps.length === 0 && (
                                    <div className="text-[10px] text-zinc-600 italic">No steps defined.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {type === 'HABIT' && (
                        <div className="space-y-1.5 pt-2 border-t border-zinc-800/50">
                            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Frequency</label>
                            <select
                                value={frequency}
                                onChange={e => setFrequency(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 outline-none"
                            >
                                <option value="daily">Daily</option>
                                <option value="weekdays">Weekdays</option>
                                <option value="weekends">Weekends</option>
                                <option value="weekly">Weekly</option>
                            </select>
                        </div>
                    )}

                    <div className="pt-4 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!title.trim()}
                            className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-black text-xs font-medium rounded transition-colors disabled:opacity-50"
                        >
                            Save Item
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DockItemDialog;
