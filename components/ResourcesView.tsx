
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
    Filter
} from 'lucide-react';

interface Props {
    state: AppState;
    onAdd: (res: Resource) => void;
}

const ResourcesView: React.FC<Props> = ({ state, onAdd }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [category, setCategory] = useState<Resource['category']>('DEV');
    const [filter, setFilter] = useState<Resource['category'] | 'ALL'>('ALL');

    const handleAdd = () => {
        if (!title || !url) return;
        onAdd({
            id: generateId(),
            title,
            url: url.startsWith('http') ? url : `https://${url}`,
            category,
            description: ''
        });
        setTitle('');
        setUrl('');
        setIsAdding(false);
    };

    const categories = [
        { key: 'DEV', label: 'Development', icon: <Code size={14} />, color: 'text-blue-400' },
        { key: 'DESIGN', label: 'Design', icon: <PenTool size={14} />, color: 'text-pink-400' },
        { key: 'BUSINESS', label: 'Business', icon: <TrendingUp size={14} />, color: 'text-emerald-400' },
        { key: 'MARKETING', label: 'Marketing', icon: <Megaphone size={14} />, color: 'text-orange-400' },
        { key: 'PRODUCTIVITY', label: 'Productivity', icon: <Zap size={14} />, color: 'text-yellow-400' },
        { key: 'FINANCE', label: 'Finance', icon: <DollarSign size={14} />, color: 'text-green-400' },
        { key: 'MEDIA', label: 'Media', icon: <Film size={14} />, color: 'text-purple-400' },
        { key: 'LEARNING', label: 'Knowledge', icon: <Box size={14} />, color: 'text-indigo-400' },
    ];

    // Filter Logic
    const filteredCategories = filter === 'ALL'
        ? categories
        : categories.filter(c => c.key === filter);

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

                {/* GRID */}
                <div className="space-y-12 pb-20">
                    {filteredCategories.map(cat => {
                        const items = state.resources.filter(r => r.category === cat.key);
                        if (items.length === 0 && filter !== 'ALL') return (
                            <div key={cat.key} className="flex flex-col items-center justify-center py-20 opacity-50">
                                <span className="text-zinc-600 mb-2">{cat.icon}</span>
                                <span className="text-xs font-mono text-zinc-500">NO_DATA_FOUND</span>
                            </div>
                        );
                        if (items.length === 0) return null;

                        return (
                            <div key={cat.key}>
                                <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-2">
                                    <span className={cat.color}>{cat.icon}</span>
                                    <span className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-widest">{cat.label}</span>
                                    <span className="text-[10px] text-zinc-600 font-mono ml-auto">{items.length} ITEMS</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {items.map(res => (
                                        <a
                                            key={res.id}
                                            href={res.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="group relative p-3 rounded-sm bg-zinc-900/30 border border-zinc-900 hover:border-zinc-700 hover:bg-zinc-900 transition-all flex flex-col h-24 justify-between overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ExternalLink size={12} className="text-zinc-500" />
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-sm bg-black border border-zinc-800 flex items-center justify-center shrink-0">
                                                    <img
                                                        src={`https://www.google.com/s2/favicons?domain=${new URL(res.url).hostname}&sz=32`}
                                                        alt="icon"
                                                        className="w-4 h-4 opacity-70 group-hover:opacity-100 grayscale group-hover:grayscale-0 transition-all"
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-xs font-medium text-zinc-300 group-hover:text-white truncate transition-colors">{res.title}</h3>
                                                    <p className="text-[10px] text-zinc-600 font-mono truncate">{new URL(res.url).hostname}</p>
                                                </div>
                                            </div>

                                            <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-1 group-hover:translate-y-0">
                                                <span className={`h-0.5 w-full rounded-full bg-gradient-to-r from-zinc-800 to-transparent group-hover:from-zinc-700`}></span>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>

            </div>
        </div>
    );
};

export default ResourcesView;
