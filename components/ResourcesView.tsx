
import React, { useState } from 'react';
import { AppState, Resource } from '../types';
import { generateId } from '../utils';
import { Plus, ExternalLink, Box, Code, PenTool, TrendingUp } from 'lucide-react';

interface Props {
  state: AppState;
  onAdd: (res: Resource) => void;
}

const ResourcesView: React.FC<Props> = ({ state, onAdd }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [category, setCategory] = useState<'DEV'|'DESIGN'|'BUSINESS'|'LEARNING'>('DEV');

    const handleAdd = () => {
        if(!title || !url) return;
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
        { key: 'DEV', label: 'Development', icon: <Code size={16}/> },
        { key: 'DESIGN', label: 'Design & UX', icon: <PenTool size={16}/> },
        { key: 'BUSINESS', label: 'Agency / Biz', icon: <TrendingUp size={16}/> },
        { key: 'LEARNING', label: 'Knowledge', icon: <Box size={16}/> },
    ];

    return (
        <div className="h-full flex flex-col bg-background animate-fade-in p-8 overflow-y-auto">
             
             {/* HEADER */}
             <div className="flex items-center justify-between mb-8">
                 <div>
                     <h1 className="text-2xl font-medium text-zinc-100 mb-1">Arsenal</h1>
                     <p className="text-xs text-zinc-500 font-mono">Curated tools for high-performance execution.</p>
                 </div>
                 <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-black rounded text-xs font-semibold hover:bg-white"
                 >
                     <Plus size={14}/> Add Tool
                 </button>
             </div>

             {/* ADD FORM */}
             {isAdding && (
                 <div className="mb-8 p-6 border border-zinc-800 rounded bg-surface/50">
                     <div className="flex flex-col gap-4 max-w-lg">
                         <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tool Name" className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white outline-none"/>
                         <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL (e.g., figma.com)" className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white outline-none font-mono"/>
                         <div className="flex gap-2">
                             {categories.map(cat => (
                                 <button 
                                    key={cat.key} 
                                    onClick={() => setCategory(cat.key as any)}
                                    className={`px-3 py-1.5 rounded text-xs font-mono border ${category === cat.key ? 'bg-zinc-800 text-white border-zinc-600' : 'text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}
                                 >
                                     {cat.label}
                                 </button>
                             ))}
                         </div>
                         <button onClick={handleAdd} className="bg-emerald-600 text-white py-2 rounded text-sm font-bold mt-2 hover:bg-emerald-500">Add to Arsenal</button>
                     </div>
                 </div>
             )}

             {/* GRID */}
             <div className="space-y-10">
                 {categories.map(cat => {
                     const items = state.resources.filter(r => r.category === cat.key);
                     if(items.length === 0) return null;

                     return (
                         <div key={cat.key}>
                             <div className="flex items-center gap-2 mb-4 text-sm font-medium text-zinc-400 border-b border-zinc-800 pb-2">
                                 {cat.icon} {cat.label}
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                 {items.map(res => (
                                     <a 
                                        key={res.id} 
                                        href={res.url} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="group block p-4 rounded bg-surface border border-border hover:border-zinc-600 hover:bg-zinc-900 transition-all"
                                     >
                                         <div className="flex items-start justify-between mb-2">
                                             <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-zinc-300">
                                                 <img 
                                                    src={`https://www.google.com/s2/favicons?domain=${new URL(res.url).hostname}&sz=32`} 
                                                    alt="icon" 
                                                    className="w-4 h-4 opacity-70 group-hover:opacity-100"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display='none' }} 
                                                 />
                                             </div>
                                             <ExternalLink size={14} className="text-zinc-600 group-hover:text-zinc-400"/>
                                         </div>
                                         <h3 className="text-sm font-medium text-zinc-200 group-hover:text-white mb-0.5">{res.title}</h3>
                                         <p className="text-xs text-zinc-600 font-mono truncate">{new URL(res.url).hostname}</p>
                                     </a>
                                 ))}
                             </div>
                         </div>
                     )
                 })}
             </div>

        </div>
    );
};

export default ResourcesView;
