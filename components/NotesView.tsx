import React, { useState, useEffect, useRef } from 'react';
import { AppState, Note, NoteFolder, NoteVersion } from '../types';
import { generateId } from '../utils';
import { Plus, Search, FileText, Calendar, ArrowLeft, Folder, History, FolderPlus, X, Bold, List, CornerDownLeft, RotateCcw, Trash2, CheckCircle2, Save } from 'lucide-react';

interface Props {
    state: AppState;
    onUpdate: (id: string, updates: Partial<Note>) => void;
    onAdd: (note: Note) => void;
    onDelete: (id: string) => void;
    onFolderAdd: (folder: NoteFolder) => void;
    onFolderUpdate: (id: string, updates: Partial<NoteFolder>) => void;
    onFolderDelete: (id: string) => void;
}

const NotesView: React.FC<Props> = ({ state, onUpdate, onAdd, onDelete, onFolderAdd, onFolderUpdate, onFolderDelete }) => {
    const [selectedId, setSelectedId] = useState<string | null>(state.notes[0]?.id || null);
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'unfoldered' | 'all'>('unfoldered');

    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [showVersions, setShowVersions] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState<NoteVersion | null>(null);

    const [newFolderName, setNewFolderName] = useState('');
    const [isAddingFolder, setIsAddingFolder] = useState(false);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const activeNote = state.notes.find(n => n.id === selectedId);

    // List logic
    let listNotes = state.notes;
    if (activeFolderId) {
        listNotes = state.notes.filter(n => n.folderId === activeFolderId);
    } else {
        if (viewMode === 'unfoldered') {
            listNotes = state.notes.filter(n => !n.folderId);
        }
    }
    listNotes = listNotes.sort((a, b) => b.updatedAt - a.updatedAt);

    // Global Search feature
    const searchResults = state.notes.filter(n =>
        searchQuery && (
            n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleCreate = () => {
        const newNote: Note = {
            id: generateId(),
            title: 'Untitled Intel',
            content: '',
            updatedAt: Date.now(),
            tags: [],
            folderId: activeFolderId || undefined
        };
        onAdd(newNote);
        setSelectedId(newNote.id);
    };

    const handleFormat = (type: 'bold' | 'list') => {
        if (!textareaRef.current || !activeNote) return;
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = activeNote.content.substring(start, end);
        let replacement = '';
        if (type === 'bold') replacement = `**${selectedText || 'bold text'}**`;
        if (type === 'list') replacement = `\n- ${selectedText || 'list item'}`;

        const newContent = activeNote.content.substring(0, start) + replacement + activeNote.content.substring(end);
        onUpdate(activeNote.id, { content: newContent, updatedAt: Date.now() });

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + replacement.length, start + replacement.length);
        }, 0);
    };

    const handleSaveVersion = () => {
        if (!activeNote) return;
        const newVersion: NoteVersion = {
            id: generateId(),
            timestamp: Date.now(),
            content: activeNote.content
        };
        const currentVersions = activeNote.versions || [];
        onUpdate(activeNote.id, { versions: [newVersion, ...currentVersions] });
    };

    const handleRestoreVersion = (version: NoteVersion) => {
        if (!activeNote) return;
        onUpdate(activeNote.id, { content: version.content, updatedAt: Date.now() });
        setSelectedVersion(null);
    };

    const getFolderName = (folderId?: string) => {
        if (!folderId) return null;
        return state.noteFolders.find(f => f.id === folderId)?.name || 'Unknown';
    };

    return (
        <div className="h-full flex bg-background animate-fade-in overflow-hidden relative">

            {/* SEARCH OVERLAY (ChatGPT style) */}
            {isSearchOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-start justify-center pt-[10vh] px-4">
                    <div className="absolute inset-0" onClick={() => setIsSearchOpen(false)}></div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] relative z-10 animate-in fade-in slide-in-from-top-4 duration-200">
                        <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
                            <Search className="text-zinc-500" size={20} />
                            <input
                                ref={searchInputRef}
                                autoFocus
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent text-lg text-white outline-none placeholder:text-zinc-600 font-mono tracking-tight"
                                placeholder="Search Intel (Titles & Content)..."
                                onKeyDown={e => e.key === 'Escape' && setIsSearchOpen(false)}
                            />
                            <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-white transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-2 no-scrollbar">
                            {searchQuery.trim() === '' ? (
                                <div className="py-12 text-center text-zinc-600 flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-zinc-900/50 flex items-center justify-center border border-zinc-800">
                                        <Search size={24} className="opacity-50" />
                                    </div>
                                    <span className="text-sm">Type to dynamically search the entire database...</span>
                                </div>
                            ) : searchResults.length === 0 ? (
                                <div className="py-12 text-center text-zinc-600">No results found for "<span className="text-zinc-300">{searchQuery}</span>"</div>
                            ) : (
                                searchResults.map(note => (
                                    <div
                                        key={note.id}
                                        onClick={() => { setSelectedId(note.id); activeNote?.folderId !== note.folderId && setActiveFolderId(note.folderId || null); setIsSearchOpen(false); setSearchQuery(''); }}
                                        className="group p-3 rounded-lg hover:bg-zinc-900 cursor-pointer flex items-start gap-4 transition-all"
                                    >
                                        <div className="mt-0.5 flex-shrink-0 bg-zinc-900 group-hover:bg-zinc-800 p-2.5 rounded-lg border border-emerald-500/20">
                                            <FileText size={16} className="text-emerald-500" />
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <h4 className="text-zinc-200 font-medium truncate mb-1 text-sm group-hover:text-emerald-400 transition-colors">{note.title || 'Untitled'}</h4>
                                            <p className="text-zinc-500 text-xs line-clamp-2 leading-relaxed font-mono">
                                                {note.content || 'No content...'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                            <CornerDownLeft size={12} /> Jump
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="h-8 border-t border-zinc-800 bg-zinc-900/30 flex items-center px-4">
                            <span className="text-[10px] text-zinc-600 font-mono"><kbd className="bg-zinc-800 px-1 py-0.5 rounded border border-zinc-700">ESC</kbd> to close</span>
                        </div>
                    </div>
                </div>
            )}

            {/* SIDEBAR LIST */}
            <div className={`
                ${selectedId ? 'hidden md:flex' : 'flex'}
                w-full md:w-80 border-r border-border flex-col bg-surface/30
            `}>
                <div className="p-4 border-b border-border space-y-3 shrink-0">
                    <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider">Intel Database</span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setIsSearchOpen(true)} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors" title="Search (Cmd+K)">
                                <Search size={16} />
                            </button>
                            <button onClick={handleCreate} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors">
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                    {/* View Tabs */}
                    {!activeFolderId && (
                        <div className="flex p-1 bg-zinc-900 rounded-lg">
                            <button
                                onClick={() => setViewMode('unfoldered')}
                                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${viewMode === 'unfoldered' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                Unfoldered
                            </button>
                            <button
                                onClick={() => setViewMode('all')}
                                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${viewMode === 'all' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                All Intel
                            </button>
                        </div>
                    )}
                </div>

                {/* FOLDERS SECTION */}
                <div className="p-3 border-b border-zinc-800/50 space-y-1 shrink-0 bg-black/10">
                    <div className="flex items-center justify-between text-zinc-500 mb-2 px-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Folders</span>
                        <button onClick={() => setIsAddingFolder(true)} className="hover:text-zinc-300 transition-colors p-1"><Plus size={12} /></button>
                    </div>
                    {isAddingFolder && (
                        <div className="flex items-center gap-2 mb-2 px-2">
                            <input
                                autoFocus
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && newFolderName.trim()) {
                                        onFolderAdd({ id: generateId(), name: newFolderName.trim(), createdAt: Date.now() });
                                        setNewFolderName('');
                                        setIsAddingFolder(false);
                                    } else if (e.key === 'Escape') {
                                        setIsAddingFolder(false);
                                    }
                                }}
                                onBlur={() => setIsAddingFolder(false)}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 outline-none"
                                placeholder="Folder Name..."
                            />
                        </div>
                    )}
                    {activeFolderId && (
                        <button
                            onClick={() => setActiveFolderId(null)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
                        >
                            <ArrowLeft size={12} />
                            Back to Inbox
                        </button>
                    )}
                    {state.noteFolders.map(folder => (
                        <div
                            key={folder.id}
                            className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-xs transition-colors ${activeFolderId === folder.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200'}`}
                        >
                            <div className="flex items-center gap-2 flex-1" onClick={() => setActiveFolderId(folder.id)}>
                                <Folder size={12} className={activeFolderId === folder.id ? 'text-zinc-300' : 'text-zinc-500'} />
                                <span className="font-medium truncate">{folder.name}</span>
                                <span className="ml-auto text-[10px] text-zinc-600">{state.notes.filter(n => n.folderId === folder.id).length}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); onFolderDelete(folder.id); }} className="opacity-0 group-hover:opacity-100 p-1 ml-1 text-zinc-600 hover:text-red-400 transition-opacity">
                                <Trash2 size={10} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* NOTES LIST */}
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {listNotes.length === 0 ? (
                        <div className="py-8 text-center text-zinc-600 text-xs italic font-mono">No notes found.</div>
                    ) : listNotes.map(note => {
                        const folderName = getFolderName(note.folderId);
                        return (
                            <div
                                key={note.id}
                                onClick={() => setSelectedId(note.id)}
                                className={`
                                    p-4 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-900/50 transition-colors group
                                    ${selectedId === note.id ? 'bg-zinc-900 border-l-2 border-l-emerald-500' : 'border-l-2 border-l-transparent'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-1 gap-2">
                                    <div className="text-sm font-medium text-zinc-200 truncate flex-1">{note.title || 'Untitled'}</div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(note.id); if (selectedId === note.id) setSelectedId(null); }}
                                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-colors p-1 -m-1"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                                <div className="text-xs text-zinc-600 line-clamp-2 font-mono">{note.content || 'No content...'}</div>
                                <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-700">
                                    <div className="flex items-center gap-2">
                                        <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                                        {folderName && viewMode === 'all' && !activeFolderId && (
                                            <span className="bg-zinc-800/70 border border-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <Folder size={8} />
                                                {folderName}
                                            </span>
                                        )}
                                    </div>
                                    {note.versions && note.versions.length > 0 && (
                                        <span className="text-zinc-600">{note.versions.length} ver</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* EDITOR */}
            <div className={`
                ${selectedId ? 'flex' : 'hidden md:flex'}
                flex-1 flex-col bg-background min-w-0
            `}>
                {activeNote ? (
                    <>
                        <div className="h-16 border-b border-border flex items-center justify-between px-4 md:px-8 shrink-0 gap-3">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedId(null)}
                                    className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white"
                                >
                                    <ArrowLeft size={18} />
                                </button>

                                <div className="flex items-center gap-2 bg-zinc-900/30 border border-zinc-800 rounded px-2 py-1">
                                    <Folder size={12} className="text-zinc-500" />
                                    <select
                                        value={activeNote.folderId || ''}
                                        onChange={(e) => onUpdate(activeNote.id, { folderId: e.target.value || undefined })}
                                        className="bg-transparent text-[11px] text-zinc-400 hover:text-zinc-300 outline-none w-[100px] cursor-pointer"
                                    >
                                        <option value="">Unfoldered</option>
                                        {state.noteFolders.map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={handleSaveVersion}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                                    title="Save Snapshot"
                                >
                                    <Save size={14} />
                                    Save
                                </button>
                                <button
                                    onClick={() => setShowVersions(!showVersions)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${showVersions ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-zinc-500 border border-zinc-800 hover:text-zinc-300 hover:bg-zinc-900'}`}
                                >
                                    <History size={14} />
                                    Versions
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-1 min-h-0 overflow-hidden relative">
                            {/* Main Editor */}
                            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                                <div className="px-4 md:px-8 pt-6 pb-2">
                                    <input
                                        value={activeNote.title}
                                        onChange={e => onUpdate(activeNote.id, { title: e.target.value, updatedAt: Date.now() })}
                                        className="bg-transparent text-xl md:text-2xl font-medium text-zinc-100 outline-none w-full placeholder:text-zinc-700"
                                        placeholder="Note Title..."
                                    />

                                    {/* Formatting Toolbar */}
                                    <div className="flex items-center gap-2 mt-4">
                                        <button onClick={() => handleFormat('bold')} className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded transition-colors" title="Bold"><Bold size={14} /></button>
                                        <button onClick={() => handleFormat('list')} className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded transition-colors" title="List"><List size={14} /></button>
                                        <div className="w-px h-4 bg-zinc-800 mx-2" />
                                        <span className="text-[10px] text-zinc-600 font-mono flex items-center gap-1">
                                            <Calendar size={10} />
                                            Last edit: {new Date(activeNote.updatedAt).toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>
                                <textarea
                                    ref={textareaRef}
                                    value={activeNote.content}
                                    onChange={e => onUpdate(activeNote.id, { content: e.target.value, updatedAt: Date.now() })}
                                    className="flex-1 w-full bg-transparent px-4 md:px-8 py-4 outline-none text-zinc-300 font-mono text-sm leading-relaxed resize-none selection:bg-emerald-900 selection:text-emerald-100 no-scrollbar"
                                    placeholder="Start typing..."
                                />
                            </div>

                            {/* Versions Sidebar */}
                            {showVersions && (
                                <div className="w-64 border-l border-zinc-800/50 bg-surface/50 flex flex-col shrink-0 animate-in slide-in-from-right-8 duration-300">
                                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">History</h3>
                                        <button onClick={() => setShowVersions(false)} className="p-1 hover:bg-zinc-800 rounded text-zinc-500" title="Close">
                                            <X size={12} />
                                        </button>
                                    </div>

                                    {selectedVersion ? (
                                        <div className="flex-1 flex flex-col overflow-hidden">
                                            <div className="p-3 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest">Snapshot</span>
                                                    <span className="text-xs text-zinc-200 mt-0.5">{new Date(selectedVersion.timestamp).toLocaleString()}</span>
                                                </div>
                                                <button onClick={() => setSelectedVersion(null)} className="p-1 text-zinc-500 hover:text-white"><ArrowLeft size={14} /></button>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-4">
                                                <div className="text-xs text-zinc-500 font-mono whitespace-pre-wrap leading-relaxed">
                                                    {selectedVersion.content}
                                                </div>
                                            </div>
                                            <div className="p-4 border-t border-zinc-800">
                                                <button
                                                    onClick={() => handleRestoreVersion(selectedVersion)}
                                                    className="w-full py-2 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white border border-zinc-700 rounded text-xs font-bold transition-colors flex items-center justify-center gap-2 uppercase tracking-wide"
                                                >
                                                    <RotateCcw size={14} />
                                                    Restore
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                            {(!activeNote.versions || activeNote.versions.length === 0) ? (
                                                <div className="p-6 text-center text-[10px] text-zinc-600 font-mono uppercase tracking-widest leading-relaxed">
                                                    No snapshots saved.
                                                </div>
                                            ) : (
                                                activeNote.versions.map(v => (
                                                    <div
                                                        key={v.id}
                                                        onClick={() => setSelectedVersion(v)}
                                                        className="group p-3 rounded border border-transparent hover:border-zinc-800 hover:bg-zinc-900/50 cursor-pointer transition-all flex flex-col gap-1"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-zinc-300 font-medium">{new Date(v.timestamp).toLocaleDateString()}</span>
                                                            </div>
                                                            <span className="text-[10px] text-zinc-500 font-mono">{new Date(v.timestamp).toLocaleTimeString()}</span>
                                                        </div>
                                                        <p className="text-[10px] text-zinc-500 line-clamp-2 font-mono ml-1">
                                                            {v.content || 'Empty version'}
                                                        </p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
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
