
import React, { useState, useEffect } from 'react';
import { AppState, Note } from '../types';
import { generateId } from '../utils';
import { Plus, Search, FileText, Calendar, Tag, ArrowLeft } from 'lucide-react';

interface Props {
    state: AppState;
    onUpdate: (id: string, updates: Partial<Note>) => void;
    onAdd: (note: Note) => void;
}

const NotesView: React.FC<Props> = ({ state, onUpdate, onAdd }) => {
    // Determine initial selection based on screen width (simple heuristic, or just effect)
    // To avoid hydration mismatch, we start with what we have, but effect can clear it on mobile if needed.
    // For simplicity, we keep default behavior but allow deselecting.
    const [selectedId, setSelectedId] = useState<string | null>(state.notes[0]?.id || null);
    const [search, setSearch] = useState('');

    const activeNote = state.notes.find(n => n.id === selectedId);

    const handleCreate = () => {
        const newNote: Note = {
            id: generateId(),
            title: 'Untitled Intel',
            content: '',
            updatedAt: Date.now(),
            tags: []
        };
        onAdd(newNote);
        setSelectedId(newNote.id);
    };

    const filteredNotes = state.notes.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="h-full flex bg-background animate-fade-in overflow-hidden">

            {/* SIDEBAR LIST */}
            {/* Mobile: Hidden if note selected. Desktop: Always visible (flex) */}
            <div className={`
                ${selectedId ? 'hidden md:flex' : 'flex'}
                w-full md:w-80 border-r border-border flex-col bg-surface/30
            `}>
                <div className="p-4 border-b border-border space-y-3">
                    <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider">Intel Database</span>
                        <button onClick={handleCreate} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors">
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 pl-8 text-xs text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-zinc-600"
                            placeholder="Search notes..."
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredNotes.map(note => (
                        <div
                            key={note.id}
                            onClick={() => setSelectedId(note.id)}
                            className={`
                                p-4 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-900/50 transition-colors group
                                ${selectedId === note.id ? 'bg-zinc-900 border-l-2 border-l-emerald-500' : 'border-l-2 border-l-transparent'}
                            `}
                        >
                            <div className="text-sm font-medium text-zinc-200 mb-1 truncate">{note.title || 'Untitled'}</div>
                            <div className="text-xs text-zinc-600 line-clamp-2 font-mono">{note.content || 'No content...'}</div>
                            <div className="mt-3 flex items-center gap-2 text-[10px] text-zinc-700">
                                <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                                {note.tags.length > 0 && <span className="bg-zinc-800 px-1.5 rounded text-zinc-500">{note.tags[0]}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* EDITOR */}
            {/* Mobile: Visible if note selected. Desktop: Always visible (flex) */}
            <div className={`
                ${selectedId ? 'flex' : 'hidden md:flex'}
                flex-1 flex-col bg-background min-w-0
            `}>
                {activeNote ? (
                    <>
                        <div className="h-16 border-b border-border flex items-center justify-between px-4 md:px-8 shrink-0 gap-3">
                            <button
                                onClick={() => setSelectedId(null)}
                                className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <input
                                value={activeNote.title}
                                onChange={e => onUpdate(activeNote.id, { title: e.target.value, updatedAt: Date.now() })}
                                className="bg-transparent text-lg font-medium text-zinc-100 outline-none w-full placeholder:text-zinc-700"
                                placeholder="Note Title..."
                            />
                            <div className="flex items-center gap-4 text-xs text-zinc-500 font-mono shrink-0">
                                <span className="flex items-center gap-1"><Calendar size={12} /> <span className="hidden sm:inline">{new Date(activeNote.updatedAt).toLocaleTimeString()}</span></span>
                            </div>
                        </div>
                        <textarea
                            value={activeNote.content}
                            onChange={e => onUpdate(activeNote.id, { content: e.target.value, updatedAt: Date.now() })}
                            className="flex-1 w-full bg-transparent p-4 md:p-8 outline-none text-zinc-300 font-mono text-sm leading-relaxed resize-none selection:bg-emerald-900 selection:text-emerald-100"
                            placeholder="Start typing..."
                        />
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-zinc-700">
                        <div className="flex flex-col items-center gap-2">
                            <FileText size={32} strokeWidth={1} />
                            <span className="text-xs font-mono">Select a file to view</span>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default NotesView;
