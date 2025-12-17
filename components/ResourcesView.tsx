import React, { useState } from 'react';
import { AppState, Resource } from '../types';
import { generateId } from '../utils';
import {
    Plus,
    ExternalLink,
    Box,
    Code,
    PenTool,
    TrendingUp,
    Zap,
    DollarSign,
    Megaphone,
    Film,
    Pencil,
    Trash2,
    X,
    Check
} from 'lucide-react';

interface Props {
    state: AppState;
    onAdd: (res: Resource) => void;
    onUpdate: (id: string, updates: Partial<Resource>) => void;
    onRemove: (id: string) => void;
}

const ResourcesView: React.FC<Props> = ({ state, onAdd, onUpdate, onRemove }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [category, setCategory] = useState<Resource['category']>('DEV');
    const [description, setDescription] = useState('');
    const [filter, setFilter] = useState<Resource['category'] | 'ALL'>('ALL');

    // Edit Mode State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Resource>>({});

    const startEditing = (res: Resource) => {
        setEditingId(res.id);
        setEditForm({ ...res });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditForm({});
    };

    const saveEditing = () => {
        if (editingId && editForm) {
            onUpdate(editingId, editForm);
            setEditingId(null);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Delete this resource?')) {
            onRemove(id);
        }
    };

    const handleAdd = () => {
        if (!title || !url) return;
        onAdd({
            id: generateId(),
            title,
            url: url.startsWith('http') ? url : `https://${url}`,
            category,
            description
        });
        setTitle('');
        setUrl('');
        setDescription('');
        setIsAdding(false);
    };

    const categories = [
        { key: 'DEV', label: 'Development', icon: <Code size={14} />, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
        { key: 'DESIGN', label: 'Design', icon: <PenTool size={14} />, color: 'text-pink-400', bg: 'bg-pink-400/10 border-pink-400/20' },
        { key: 'BUSINESS', label: 'Business', icon: <TrendingUp size={14} />, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
        { key: 'MARKETING', label: 'Marketing', icon: <Megaphone size={14} />, color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20' },
        { key: 'PRODUCTIVITY', label: 'Productivity', icon: <Zap size={14} />, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
        { key: 'FINANCE', label: 'Finance', icon: <DollarSign size={14} />, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' },
        { key: 'MEDIA', label: 'Media', icon: <Film size={14} />, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20' },
        { key: 'LEARNING', label: 'Knowledge', icon: <Box size={14} />, color: 'text-indigo-400', bg: 'bg-indigo-400/10 border-indigo-400/20' },
    ];

    const getCategoryConfig = (key: string) => categories.find(c => c.key === key);

    return (
        <div className="h-full flex flex-col bg-background animate-fade-in overflow-hidden">

            {/* HEADER */}
            <div className="p-8 pb-0 shrink-0">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-medium text-zinc-100 flex items-center gap-2">
                            Arsenal
                            <span className="text-zinc-600">/</span>
                            <span className="text-zinc-500 text-sm font-mono tracking-wider">
                                {filter === 'ALL' ? 'TOTAL_VIEW' : filter}
                            </span>
                        </h1>
                        <p className="text-xs text-zinc-500 font-mono mt-1">Curated tools for high-performance execution.</p>
                    </div>
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 text-black rounded-sm text-xs font-semibold hover:bg-white transition-colors"
                    >
                        <Plus size={12} /> ADD_TOOL
                    </button>
                </div>

                {/* FILTER BAR */}
                <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar border-b border-border mb-4">
                    <button
                        onClick={() => setFilter('ALL')}
                        className={`
                            px-3 py-1.5 rounded-sm text-[10px] font-mono tracking-wider transition-all border
                            ${filter === 'ALL'
                                ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                                : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-900'}
                        `}
                    >
                        ALL_SYSTEMS
                    </button>
                    <div className="w-px h-4 bg-zinc-800 mx-1"></div>
                    {categories.map(cat => (
                        <button
                            key={cat.key}
                            onClick={() => setFilter(cat.key as any)}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-sm text-[10px] uppercase font-mono tracking-wider transition-all border whitespace-nowrap
                                ${filter === cat.key
                                    ? 'bg-zinc-900 text-zinc-200 border-zinc-700'
                                    : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-900/50'}
                            `}
                        >
                            <span className={cat.color}>{cat.icon}</span>
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 overflow-y-auto p-8 pt-0">

                {/* ADD FORM */}
                {isAdding && (
                    <div className="mb-8 p-4 border border-zinc-800 rounded bg-zinc-900/30 backdrop-blur-sm animate-in slide-in-from-top-2">
                        <div className="flex flex-col gap-4 max-w-lg">
                            <div className="flex gap-2">
                                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tool Name" className="flex-1 bg-zinc-950 border border-zinc-800 rounded-sm px-3 py-2 text-xs text-white outline-none focus:border-zinc-700" />
                                <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL" className="flex-1 bg-zinc-950 border border-zinc-800 rounded-sm px-3 py-2 text-xs text-white outline-none font-mono focus:border-zinc-700" />
                            </div>
                            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Simple note (optional)..." className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-3 py-2 text-xs text-white outline-none focus:border-zinc-700" />

                            <div className="flex flex-wrap gap-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat.key}
                                        onClick={() => setCategory(cat.key as any)}
                                        className={`px-2 py-1 rounded-sm text-[10px] font-mono uppercase border transition-all ${category === cat.key ? 'bg-zinc-800 text-white border-zinc-600' : 'text-zinc-600 border-zinc-800 hover:border-zinc-700'}`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex justify-end">
                                <button onClick={handleAdd} className="bg-white text-black px-4 py-1.5 rounded-sm text-xs font-bold hover:bg-zinc-200 transition-colors">
                                    CONFIRM_ADD
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL EDIT OVERLAY */}
                {editingId && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div className="bg-[#090909] border border-zinc-800 p-6 rounded w-[400px] shadow-2xl animate-in fade-in zoom-in-95">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-mono text-zinc-500 uppercase">Edit Resource</span>
                                <button onClick={cancelEditing} className="text-zinc-500 hover:text-white"><X size={14} /></button>
                            </div>
                            <div className="flex flex-col gap-3">
                                <input
                                    value={editForm.title}
                                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                    className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:border-zinc-600 outline-none"
                                    placeholder="Title"
                                />
                                <input
                                    value={editForm.url}
                                    onChange={e => setEditForm({ ...editForm, url: e.target.value })}
                                    className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-400 font-mono focus:border-zinc-600 outline-none"
                                    placeholder="URL"
                                />
                                <textarea
                                    value={editForm.description}
                                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                    className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-400 focus:border-zinc-600 outline-none resize-none h-20"
                                    placeholder="Notes..."
                                />
                                <div className="flex items-center justify-between mt-2">
                                    <button onClick={() => handleDelete(editingId)} className="text-red-500 text-xs hover:underline flex items-center gap-1">
                                        <Trash2 size={12} /> Delete
                                    </button>
                                    <div className="flex gap-2">
                                        <button onClick={cancelEditing} className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white">Cancel</button>
                                        <button onClick={saveEditing} className="px-3 py-1.5 bg-zinc-100 text-black text-xs font-bold rounded hover:bg-white flex items-center gap-1">
                                            <Check size={12} /> Save
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                {/* GRID LOGIC */}
                {filter === 'ALL' ? (
                    // TOTAL VIEW: Flat List interaction
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-20">
                        {state.resources.map(res => {
                            const catConfig = getCategoryConfig(res.category);
                            return (
                                <ResourceCard
                                    key={res.id}
                                    res={res}
                                    catConfig={catConfig}
                                    showTag={true} // SHOW TAG in Total View
                                    onEdit={() => startEditing(res)}
                                />
                            );
                        })}
                    </div>
                ) : (
                    // FILTERED VIEW: Grouped or Flat Filtered
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-20">
                        {state.resources.filter(r => r.category === filter).map(res => (
                            <ResourceCard
                                key={res.id}
                                res={res}
                                catConfig={getCategoryConfig(res.category)}
                                showTag={false} // HIDE TAG in Filtered View
                                onEdit={() => startEditing(res)}
                            />
                        ))}
                        {state.resources.filter(r => r.category === filter).length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
                                <span className="text-zinc-600 text-xs font-mono">NO_DATA_FOUND</span>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};

const ResourceCard: React.FC<{
    res: Resource,
    catConfig: any,
    showTag: boolean,
    onEdit: () => void
}> = ({ res, catConfig, showTag, onEdit }) => {
    return (
        <div className="group relative p-3 rounded-sm bg-zinc-900/30 border border-zinc-900 hover:border-zinc-700 hover:bg-zinc-900 transition-all flex flex-col h-auto min-h-[6rem] justify-between overflow-hidden">

            {/* Edit Button (Visible on Hover) */}
            <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
                className="absolute top-2 right-2 p-1.5 text-zinc-500 hover:text-white bg-black/50 hover:bg-zinc-800 rounded-sm opacity-0 group-hover:opacity-100 transition-all z-20"
            >
                <Pencil size={12} />
            </button>

            <a href={res.url} target="_blank" rel="noreferrer" className="flex-1 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-sm bg-black border border-zinc-800 flex items-center justify-center shrink-0">
                        <img
                            src={`https://www.google.com/s2/favicons?domain=${new URL(res.url).hostname}&sz=32`}
                            alt="icon"
                            className="w-4 h-4 opacity-70 group-hover:opacity-100 grayscale group-hover:grayscale-0 transition-all"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                    </div>
                    <div className="min-w-0 pr-6">
                        <h3 className="text-xs font-medium text-zinc-300 group-hover:text-white truncate transition-colors">{res.title}</h3>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] text-zinc-600 font-mono truncate">{new URL(res.url).hostname}</p>
                            {showTag && catConfig && (
                                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] ${catConfig.bg}`}>
                                    <span className={catConfig.color}>{React.cloneElement(catConfig.icon, { size: 8 })}</span>
                                    <span className={`text-[8px] font-mono uppercase ${catConfig.color}`}>{catConfig.key}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {res.description && (
                    <p className="text-[10px] text-zinc-500 leading-snug line-clamp-2 border-t border-zinc-800/50 pt-2 mt-1">
                        {res.description}
                    </p>
                )}
            </a>
        </div>
    );
}

export default ResourcesView;
