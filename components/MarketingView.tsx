
import React, { useState } from 'react';
import { AppState, MarketingItem, ContentIdentity, ContentPlatform } from '../types';
import { generateId } from '../utils';
import { 
    Send, 
    Linkedin, 
    Twitter, 
    Globe, 
    CheckCircle2,
    Circle,
    User,
    Briefcase,
    Building2,
    Trash2
} from 'lucide-react';

interface Props {
  state: AppState;
  onAdd: (item: MarketingItem) => void;
  onUpdate: (id: string, updates: Partial<MarketingItem>) => void;
}

const MarketingView: React.FC<Props> = ({ state, onAdd, onUpdate }) => {
    const [content, setContent] = useState('');
    const [identity, setIdentity] = useState<ContentIdentity>('AGENCY');
    const [platform, setPlatform] = useState<ContentPlatform>('LINKEDIN');
    const [filter, setFilter] = useState<'ALL' | ContentIdentity>('ALL');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if(!content.trim()) return;

        onAdd({
            id: generateId(),
            content: content.trim(),
            identity,
            platform,
            isPosted: false,
            createdAt: Date.now()
        });
        setContent('');
    };

    const togglePosted = (id: string, current: boolean) => {
        onUpdate(id, { 
            isPosted: !current,
            postedAt: !current ? Date.now() : undefined
        });
    };

    const handleDelete = (id: string) => {
        // Since we don't have a delete handler prop in this version, 
        // we might just mark as posted or implement a proper delete in App.tsx later.
        // For now, let's just move it to bottom by marking done.
        onUpdate(id, { isPosted: true });
    };

    const filteredItems = state.marketing.filter(m => {
        if (filter !== 'ALL' && m.identity !== filter) return false;
        return true;
    }).sort((a, b) => {
        // Sort: Drafts first, then by date descending
        if (a.isPosted === b.isPosted) return b.createdAt - a.createdAt;
        return a.isPosted ? 1 : -1;
    });

    const getIdentityColor = (id: ContentIdentity) => {
        switch(id) {
            case 'AGENCY': return 'text-amber-500 border-amber-900/30 bg-amber-950/10';
            case 'CAREER': return 'text-blue-500 border-blue-900/30 bg-blue-950/10';
            case 'PERSONAL': return 'text-zinc-400 border-zinc-800 bg-zinc-900/50';
        }
    };

    const getIdentityIcon = (id: ContentIdentity) => {
        switch(id) {
            case 'AGENCY': return <Building2 size={12}/>;
            case 'CAREER': return <Briefcase size={12}/>;
            case 'PERSONAL': return <User size={12}/>;
        }
    };

    return (
        <div className="h-full flex flex-col bg-background animate-fade-in overflow-hidden">
            
            {/* INPUT AREA */}
            <div className="p-6 border-b border-border bg-surface/30 shrink-0">
                <div className="max-w-3xl mx-auto space-y-4">
                    <div className="flex items-center justify-between">
                         <h1 className="text-sm font-medium text-zinc-300">New Transmission</h1>
                         <div className="flex gap-1">
                            {(['AGENCY', 'CAREER', 'PERSONAL'] as ContentIdentity[]).map(id => (
                                <button
                                    key={id}
                                    onClick={() => setIdentity(id)}
                                    className={`
                                        flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono uppercase transition-all border
                                        ${identity === id 
                                            ? getIdentityColor(id) + ' shadow-sm' 
                                            : 'text-zinc-600 border-transparent hover:bg-zinc-900'}
                                    `}
                                >
                                    {getIdentityIcon(id)} {id}
                                </button>
                            ))}
                         </div>
                    </div>

                    <form onSubmit={handleAdd} className="relative">
                        <textarea 
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            onKeyDown={e => {
                                if(e.key === 'Enter' && e.metaKey) handleAdd(e);
                            }}
                            placeholder="Draft your thoughts, hooks, or updates..."
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-200 focus:border-zinc-600 outline-none min-h-[100px] resize-none font-mono"
                        />
                        <div className="absolute bottom-3 right-3 flex items-center gap-2">
                             <div className="flex bg-zinc-800 rounded p-0.5">
                                 <button type="button" onClick={() => setPlatform('LINKEDIN')} className={`p-1.5 rounded ${platform === 'LINKEDIN' ? 'bg-zinc-700 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}><Linkedin size={14}/></button>
                                 <button type="button" onClick={() => setPlatform('TWITTER')} className={`p-1.5 rounded ${platform === 'TWITTER' ? 'bg-zinc-700 text-sky-400' : 'text-zinc-500 hover:text-zinc-300'}`}><Twitter size={14}/></button>
                                 <button type="button" onClick={() => setPlatform('BLOG')} className={`p-1.5 rounded ${platform === 'BLOG' ? 'bg-zinc-700 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}><Globe size={14}/></button>
                             </div>
                             <button 
                                type="submit" 
                                disabled={!content.trim()}
                                className="flex items-center gap-2 px-4 py-1.5 bg-zinc-100 text-black text-xs font-bold rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                             >
                                 <Send size={12}/> Queue
                             </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* FEED */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto">
                    
                    {/* FILTERS */}
                    <div className="flex gap-4 mb-6 text-xs font-mono text-zinc-500 border-b border-zinc-800 pb-2">
                        <button onClick={() => setFilter('ALL')} className={`hover:text-white transition-colors ${filter === 'ALL' ? 'text-white' : ''}`}>ALL</button>
                        <button onClick={() => setFilter('AGENCY')} className={`hover:text-amber-500 transition-colors ${filter === 'AGENCY' ? 'text-amber-500' : ''}`}>AGENCY</button>
                        <button onClick={() => setFilter('CAREER')} className={`hover:text-blue-500 transition-colors ${filter === 'CAREER' ? 'text-blue-500' : ''}`}>CAREER</button>
                        <button onClick={() => setFilter('PERSONAL')} className={`hover:text-zinc-300 transition-colors ${filter === 'PERSONAL' ? 'text-zinc-300' : ''}`}>PERSONAL</button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {filteredItems.map(item => (
                            <div 
                                key={item.id} 
                                className={`
                                    group relative p-4 rounded-lg border transition-all
                                    ${item.isPosted 
                                        ? 'bg-transparent border-zinc-800/50 opacity-60' 
                                        : 'bg-surface border-zinc-800 hover:border-zinc-700'}
                                `}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className={`flex items-center gap-2 px-2 py-0.5 rounded border text-[10px] font-mono uppercase ${getIdentityColor(item.identity)}`}>
                                        {getIdentityIcon(item.identity)}
                                        {item.identity}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-zinc-600">
                                            {item.platform === 'LINKEDIN' && <Linkedin size={14}/>}
                                            {item.platform === 'TWITTER' && <Twitter size={14}/>}
                                            {item.platform === 'BLOG' && <Globe size={14}/>}
                                        </span>
                                    </div>
                                </div>

                                <textarea 
                                    value={item.content}
                                    onChange={(e) => onUpdate(item.id, { content: e.target.value })}
                                    readOnly={item.isPosted}
                                    className={`
                                        w-full bg-transparent outline-none text-sm resize-none font-mono mb-2
                                        ${item.isPosted ? 'text-zinc-500 line-through' : 'text-zinc-200'}
                                    `}
                                    rows={Math.max(2, item.content.split('\n').length)}
                                />

                                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
                                    <span className="text-[10px] text-zinc-600 font-mono">
                                        {new Date(item.createdAt).toLocaleDateString()}
                                    </span>
                                    
                                    <button 
                                        onClick={() => togglePosted(item.id, item.isPosted)}
                                        className={`
                                            flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors
                                            ${item.isPosted 
                                                ? 'bg-zinc-900 text-zinc-500 hover:text-zinc-300' 
                                                : 'bg-zinc-100 text-black hover:bg-white'}
                                        `}
                                    >
                                        {item.isPosted ? (
                                            <>Posted <CheckCircle2 size={12}/></>
                                        ) : (
                                            <>Ship <Send size={12}/></>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                        
                        {filteredItems.length === 0 && (
                            <div className="py-12 text-center text-zinc-600 text-xs font-mono">
                                No transmissions found in this frequency.
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default MarketingView;
