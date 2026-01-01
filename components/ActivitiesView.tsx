import React, { useState } from 'react';
import { AppState, Activity, ActivityCategory } from '../types';
import { MapPin, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

interface Props {
    state: AppState;
    onAdd: (activity: Omit<Activity, 'id'>) => void;
    onUpdate: (id: string, updates: Partial<Activity>) => void;
    onRemove: (id: string) => void;
}

const VIBE_COLORS = {
    FOCUS: 'bg-blue-500/10 text-blue-400 border-blue-900/30',
    ENERGY: 'bg-orange-500/10 text-orange-400 border-orange-900/30',
    RELAX: 'bg-emerald-500/10 text-emerald-400 border-emerald-900/30'
};

const ActivitiesView: React.FC<Props> = ({ state, onAdd, onUpdate, onRemove }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({
        title: '',
        location: '',
        category: 'WORK' as ActivityCategory,
        vibe: 'FOCUS' as Activity['vibe'],
        details: ''
    });

    const activities = state.activities || [];
    const sortedActivities = [...activities].sort((a, b) => (b.lastVisited || 0) - (a.lastVisited || 0));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.location.trim()) return;

        onAdd({
            title: form.title.trim(),
            location: form.location.trim(),
            category: form.category,
            vibe: form.vibe,
            details: form.details.trim() || undefined,
            lastVisited: Date.now()
        });

        setForm({ title: '', location: '', category: 'WORK', vibe: 'FOCUS', details: '' });
        setIsAdding(false);
    };

    const handleCheckIn = (id: string) => {
        onUpdate(id, { lastVisited: Date.now() });
    };

    return (
        <div className="h-full flex flex-col bg-background animate-fade-in overflow-hidden">
            {/* HEADER */}
            <div className="p-6 border-b border-border bg-surface/30 shrink-0">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-sm font-medium text-zinc-300">Activities & Locations</h1>
                            <p className="text-xs text-zinc-600 mt-1">Track your favorite spots and places</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-2xl font-medium text-white">{activities.length}</div>
                                <div className="text-[10px] text-zinc-600 font-mono uppercase">Spots</div>
                            </div>
                            <button
                                onClick={() => setIsAdding(!isAdding)}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-md text-xs font-bold hover:bg-zinc-200 transition-colors"
                            >
                                <Plus size={14} />
                                {isAdding ? 'Cancel' : 'Add Spot'}
                            </button>
                        </div>
                    </div>

                    {/* ADD FORM */}
                    {isAdding && (
                        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3 animate-fade-in">
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    value={form.title}
                                    onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Activity name"
                                    className="bg-background border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
                                    autoFocus
                                />
                                <input
                                    value={form.location}
                                    onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
                                    placeholder="Location"
                                    className="bg-background border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex gap-1">
                                    {(['WORK', 'SPORT', 'SOCIAL', 'HANGOUT'] as ActivityCategory[]).map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setForm(prev => ({ ...prev, category: cat }))}
                                            className={`px-3 py-1.5 text-[10px] font-mono uppercase rounded transition-colors ${
                                                form.category === cat
                                                    ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/30'
                                                    : 'bg-transparent text-zinc-600 border border-transparent hover:bg-zinc-900'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>

                                <div className="h-4 w-px bg-zinc-800" />

                                <div className="flex gap-1">
                                    {(['FOCUS', 'ENERGY', 'RELAX'] as Activity['vibe'][]).map(vibe => (
                                        <button
                                            key={vibe}
                                            type="button"
                                            onClick={() => setForm(prev => ({ ...prev, vibe }))}
                                            className={`px-3 py-1.5 text-[10px] font-mono uppercase rounded transition-colors border ${
                                                form.vibe === vibe
                                                    ? VIBE_COLORS[vibe]
                                                    : 'bg-transparent text-zinc-600 border-transparent hover:bg-zinc-900'
                                            }`}
                                        >
                                            {vibe}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <textarea
                                value={form.details}
                                onChange={e => setForm(prev => ({ ...prev, details: e.target.value }))}
                                placeholder="Notes (optional)..."
                                className="w-full bg-background border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none resize-none"
                                rows={2}
                            />

                            <button
                                type="submit"
                                disabled={!form.title.trim() || !form.location.trim()}
                                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Save Activity
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* ACTIVITIES LIST */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto">
                    {sortedActivities.length === 0 ? (
                        <div className="py-12 text-center text-zinc-600 text-xs font-mono">
                            No activities yet. Add your first spot!
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sortedActivities.map(activity => (
                                <ActivityCard
                                    key={activity.id}
                                    activity={activity}
                                    isEditing={editingId === activity.id}
                                    onEdit={() => setEditingId(activity.id)}
                                    onCancelEdit={() => setEditingId(null)}
                                    onUpdate={onUpdate}
                                    onRemove={onRemove}
                                    onCheckIn={handleCheckIn}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ActivityCard: React.FC<{
    activity: Activity;
    isEditing: boolean;
    onEdit: () => void;
    onCancelEdit: () => void;
    onUpdate: (id: string, updates: Partial<Activity>) => void;
    onRemove: (id: string) => void;
    onCheckIn: (id: string) => void;
}> = ({ activity, isEditing, onEdit, onCancelEdit, onUpdate, onRemove, onCheckIn }) => {
    const [editForm, setEditForm] = useState({
        title: activity.title,
        location: activity.location,
        details: activity.details || ''
    });

    const handleSave = () => {
        onUpdate(activity.id, editForm);
        onCancelEdit();
    };

    const timeSinceVisit = activity.lastVisited
        ? Math.floor((Date.now() - activity.lastVisited) / (1000 * 60 * 60 * 24))
        : null;

    const getTimeLabel = () => {
        if (!timeSinceVisit) return 'Never visited';
        if (timeSinceVisit === 0) return 'Today';
        if (timeSinceVisit === 1) return 'Yesterday';
        if (timeSinceVisit < 7) return `${timeSinceVisit}d ago`;
        if (timeSinceVisit < 30) return `${Math.floor(timeSinceVisit / 7)}w ago`;
        return `${Math.floor(timeSinceVisit / 30)}mo ago`;
    };

    if (isEditing) {
        return (
            <div className="group bg-surface border border-zinc-800 rounded-lg p-4 space-y-3">
                <input
                    value={editForm.title}
                    onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-background border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
                />
                <input
                    value={editForm.location}
                    onChange={e => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full bg-background border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
                />
                <textarea
                    value={editForm.details}
                    onChange={e => setEditForm(prev => ({ ...prev, details: e.target.value }))}
                    placeholder="Notes..."
                    className="w-full bg-background border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none resize-none"
                    rows={2}
                />
                <div className="flex gap-2">
                    <button
                        onClick={handleSave}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-bold rounded transition-colors"
                    >
                        <Check size={12} /> Save
                    </button>
                    <button
                        onClick={onCancelEdit}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[10px] rounded transition-colors"
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="group bg-surface border border-zinc-800 hover:border-zinc-700 rounded-lg p-4 transition-all">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-zinc-200 truncate">{activity.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <MapPin size={10} className="text-zinc-600 shrink-0" />
                        <p className="text-xs text-zinc-500 truncate">{activity.location}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={onEdit}
                        className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors"
                        title="Edit"
                    >
                        <Edit2 size={12} />
                    </button>
                    <button
                        onClick={() => {
                            if (window.confirm(`Delete "${activity.title}"?`)) {
                                onRemove(activity.id);
                            }
                        }}
                        className="p-1.5 text-zinc-600 hover:text-red-500 transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 text-[9px] font-mono uppercase bg-zinc-900 text-zinc-500 rounded border border-zinc-800">
                    {activity.category}
                </span>
                <span className={`px-2 py-0.5 text-[9px] font-mono uppercase rounded border ${VIBE_COLORS[activity.vibe]}`}>
                    {activity.vibe}
                </span>
            </div>

            {activity.details && (
                <p className="text-xs text-zinc-600 mb-3 line-clamp-2">{activity.details}</p>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
                <span className="text-[10px] text-zinc-600 font-mono">{getTimeLabel()}</span>
                <button
                    onClick={() => onCheckIn(activity.id)}
                    className="px-3 py-1 bg-zinc-900 hover:bg-emerald-950/30 text-zinc-400 hover:text-emerald-400 border border-zinc-800 hover:border-emerald-900/30 text-[10px] font-mono rounded transition-colors"
                >
                    Check In
                </button>
            </div>
        </div>
    );
};

export default ActivitiesView;
