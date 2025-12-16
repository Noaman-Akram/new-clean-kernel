import React, { useMemo, useState } from 'react';
import { AppState, Activity, ActivityCategory } from '../types';
import { MapPin, PlusCircle, RefreshCcw, Trash2 } from 'lucide-react';

interface Props {
    state: AppState;
    onAdd: (activity: Omit<Activity, 'id'>) => void;
    onUpdate: (id: string, updates: Partial<Activity>) => void;
    onRemove: (id: string) => void;
}

const CATEGORY_CONFIG: Record<ActivityCategory, { label: string; helper: string; accent: string }> = {
    WORK: { label: 'Work / Deep Focus', helper: 'Studios, cafes, coworks, offices', accent: 'text-emerald-400' },
    SPORT: { label: 'Sports / Energy', helper: 'Gyms, dojos, courts, trails', accent: 'text-orange-300' },
    SOCIAL: { label: 'Social / People', helper: 'Mentors, friends, family', accent: 'text-sky-300' },
    HANGOUT: { label: 'Hangout / Reset', helper: 'Night drives, rooftops, walks', accent: 'text-pink-300' }
};

const VIBE_OPTIONS: { key: Activity['vibe']; label: string }[] = [
    { key: 'FOCUS', label: 'Focus' },
    { key: 'ENERGY', label: 'Energy' },
    { key: 'RELAX', label: 'Reset' }
];

const ActivitiesView: React.FC<Props> = ({ state, onAdd, onUpdate, onRemove }) => {
    const [form, setForm] = useState({
        title: '',
        location: '',
        category: 'WORK' as ActivityCategory,
        vibe: 'FOCUS' as Activity['vibe'],
        details: ''
    });

    const activities = state.activities || [];

    const grouped = useMemo(() => {
        const base: Record<ActivityCategory, Activity[]> = {
            WORK: [],
            SPORT: [],
            SOCIAL: [],
            HANGOUT: []
        };
        activities.forEach(activity => {
            base[activity.category]?.push(activity);
        });
        Object.values(base).forEach(list => list.sort((a, b) => (b.lastVisited || 0) - (a.lastVisited || 0)));
        return base;
    }, [activities]);

    const recents = useMemo(() => {
        return [...activities].sort((a, b) => (b.lastVisited || 0) - (a.lastVisited || 0)).slice(0, 4);
    }, [activities]);

    const latestCheckValue = recents[0]?.lastVisited;
    const latestCheck = latestCheckValue
        ? new Date(latestCheckValue).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '—';

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
        setForm(prev => ({ ...prev, title: '', location: '', details: '' }));
    };

    return (
        <div className="min-h-screen bg-background text-zinc-100">
            <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6">
                <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
                    <aside className="bg-surface border border-border rounded-md p-5 flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-mono tracking-[0.35em] text-zinc-500 uppercase">Field Ops</span>
                            <h1 className="text-[24px] font-semibold text-white">Activities & Locations</h1>
                            <p className="text-sm text-zinc-500">
                                One index for every workspace, sports loop, and hangout circuit you rotate through.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <MiniStat label="Active spots" value={activities.length} hint="tracked" />
                            <MiniStat label="Last check" value={latestCheck} hint="recent" />
                        </div>

                        <ActivityCommandBar form={form} onChange={setForm} onSubmit={handleSubmit} />

                        <RecentList recents={recents} />
                    </aside>

                    <main className="space-y-4">
                        {Object.entries(CATEGORY_CONFIG).map(([key, meta]) => {
                            const list = grouped[key as ActivityCategory];
                            return (
                                <section key={key} className="bg-surface/60 border border-border rounded-md p-4 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className={`text-xs font-mono tracking-[0.3em] uppercase ${meta.accent}`}>{meta.label}</div>
                                            <p className="text-[12px] text-zinc-500">{meta.helper}</p>
                                        </div>
                                        <div className="text-[11px] font-mono text-zinc-500">{list.length} spots</div>
                                    </div>
                                    {list.length === 0 ? (
                                        <div className="text-[12px] text-zinc-600 font-mono border border-dashed border-border rounded-md p-4 text-center">
                                            Log the first spot in this lane.
                                        </div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {list.map(activity => (
                                                <ActivityCard
                                                    key={activity.id}
                                                    activity={activity}
                                                    onUpdate={onUpdate}
                                                    onRemove={onRemove}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </section>
                            );
                        })}
                    </main>
                </div>
            </div>
        </div>
    );
};

const ActivityCommandBar = ({
    form,
    onChange,
    onSubmit
}: {
    form: { title: string; location: string; category: ActivityCategory; vibe: Activity['vibe']; details: string };
    onChange: React.Dispatch<React.SetStateAction<typeof form>>;
    onSubmit: (e: React.FormEvent) => void;
}) => (
    <form onSubmit={onSubmit} className="border border-border rounded-md p-4 bg-black/20 flex flex-col gap-3">
        <Field label="Activity name">
            <input
                value={form.title}
                onChange={e => onChange(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Greek Campus, Nile Run"
                className="w-full bg-transparent border border-zinc-800 rounded-sm px-3 py-2 text-sm focus:border-emerald-500 outline-none"
            />
        </Field>
        <Field label="Location or address">
            <input
                value={form.location}
                onChange={e => onChange(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Drop the pin / describe"
                className="w-full bg-transparent border border-zinc-800 rounded-sm px-3 py-2 text-sm focus:border-emerald-500 outline-none"
            />
        </Field>
        <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
                <div className="flex flex-wrap gap-1">
                    {(Object.keys(CATEGORY_CONFIG) as ActivityCategory[]).map(cat => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => onChange(prev => ({ ...prev, category: cat }))}
                            className={`px-3 py-1 text-[11px] font-mono tracking-[0.1em] border rounded-sm transition-colors ${
                                form.category === cat ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'
                            }`}
                        >
                            {CATEGORY_CONFIG[cat].label.split(' / ')[0]}
                        </button>
                    ))}
                </div>
            </Field>
            <Field label="Vibe">
                <div className="flex gap-1">
                    {VIBE_OPTIONS.map(option => (
                        <button
                            key={option.key}
                            type="button"
                            onClick={() => onChange(prev => ({ ...prev, vibe: option.key }))}
                            className={`px-3 py-1 text-[11px] font-mono tracking-[0.1em] border rounded-sm transition-colors ${
                                form.vibe === option.key ? 'border-white text-white' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </Field>
        </div>
        <Field label="Notes">
            <textarea
                value={form.details}
                onChange={e => onChange(prev => ({ ...prev, details: e.target.value }))}
                placeholder="Wifi, who to take, ideal time, etc."
                className="w-full bg-transparent border border-zinc-800 rounded-sm px-3 py-2 text-sm focus:border-emerald-500 outline-none min-h-[72px]"
            />
        </Field>
        <button
            type="submit"
            className="flex items-center justify-center gap-2 bg-white text-black rounded-sm py-2 font-semibold text-sm tracking-wide"
        >
            <PlusCircle size={16} />
            Save activity
        </button>
    </form>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="flex flex-col gap-1">
        <span className="text-[10px] font-mono tracking-[0.3em] text-zinc-500 uppercase">{label}</span>
        {children}
    </label>
);

const RecentList = ({ recents }: { recents: Activity[] }) => (
    <div className="flex flex-col gap-2">
        <div className="text-[10px] font-mono tracking-[0.3em] text-zinc-500 uppercase">Recent check-ins</div>
        {recents.length === 0 ? (
            <div className="text-[12px] text-zinc-600 font-mono border border-dashed border-border rounded-md p-3 text-center">
                No check-ins yet.
            </div>
        ) : (
            <ul className="space-y-2">
                {recents.map(activity => (
                    <li key={activity.id} className="flex items-center justify-between gap-2 border border-border rounded-md px-3 py-2 bg-black/20">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-sm bg-black/40 flex items-center justify-center">
                                <MapPin size={14} className="text-emerald-400" />
                            </div>
                            <div>
                                <div className="text-sm text-white font-medium">{activity.title}</div>
                                <div className="text-[11px] text-zinc-500">{activity.location}</div>
                            </div>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500">
                            {activity.lastVisited ? new Date(activity.lastVisited).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                        </div>
                    </li>
                ))}
            </ul>
        )}
    </div>
);

const ActivityCard = ({ activity, onUpdate, onRemove }: { activity: Activity; onUpdate: (id: string, updates: Partial<Activity>) => void; onRemove: (id: string) => void }) => {
    const handleCheckIn = () => onUpdate(activity.id, { lastVisited: Date.now() });

    return (
        <div className="border border-border rounded-md bg-black/15 p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-sm font-semibold text-white">{activity.title}</div>
                    <div className="text-xs text-zinc-500">{activity.location}</div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono tracking-[0.2em] border border-zinc-700 rounded-sm text-zinc-400">
                    {activity.vibe}
                </span>
            </div>
            <textarea
                value={activity.details || ''}
                onChange={e => onUpdate(activity.id, { details: e.target.value })}
                placeholder="Notes, who to bring, best time..."
                className="w-full bg-transparent border border-zinc-800 rounded-sm px-3 py-2 text-sm text-zinc-200 resize-none focus:border-emerald-500 outline-none"
            />
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                <button
                    onClick={handleCheckIn}
                    className="flex items-center gap-1 px-3 py-1 border border-zinc-700 rounded-sm hover:border-emerald-400 hover:text-emerald-300"
                >
                    <RefreshCcw size={12} />
                    Check-in
                </button>
                <button
                    onClick={() => onRemove(activity.id)}
                    className="flex items-center gap-1 px-3 py-1 border border-red-900 text-red-400 rounded-sm hover:border-red-600 hover:text-red-300"
                >
                    <Trash2 size={12} />
                    Remove
                </button>
                <span className="ml-auto text-[10px] font-mono tracking-[0.2em] text-zinc-500">
                    {activity.lastVisited ? `Last ${new Date(activity.lastVisited).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'No visits yet'}
                </span>
            </div>
        </div>
    );
};

const MiniStat = ({ label, value, hint }: { label: string; value: string | number; hint: string }) => (
    <div className="border border-border rounded-md p-3 bg-black/15 flex flex-col gap-1">
        <span className="text-[10px] font-mono tracking-[0.3em] text-zinc-500 uppercase">{label}</span>
        <span className="text-xl font-semibold text-white">{value}</span>
        <span className="text-[11px] text-zinc-500">{hint}</span>
    </div>
);

export default ActivitiesView;
