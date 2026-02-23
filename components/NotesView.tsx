import React, { useState, useEffect, useRef } from 'react';
import { AppState, Note, NoteFolder, NoteVersion } from '../types';
import { generateId } from '../utils';
import { Plus, Search, FileText, Calendar, ArrowLeft, Folder, History, FolderPlus, X, Bold, List, CornerDownLeft, RotateCcw, Trash2, CheckCircle2, Save, ListOrdered, Inbox } from 'lucide-react';

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
    const [viewMode, setViewMode] = useState<'inbox' | 'all'>('inbox');

    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [showVersions, setShowVersions] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState<NoteVersion | null>(null);

    const [newFolderName, setNewFolderName] = useState('');
    const [isAddingFolder, setIsAddingFolder] = useState(false);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);

    const activeNote = state.notes.find(n => n.id === selectedId);

    // List logic
    let listNotes = state.notes;
    if (activeFolderId) {
        listNotes = state.notes.filter(n => n.folderId === activeFolderId);
    } else {
        if (viewMode === 'inbox') {
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

    // Reset selected version when active note changes
    useEffect(() => {
        setSelectedVersion(null);
    }, [selectedId]);

    // Handle ContentEditable updates from activeNote efficiently
    useEffect(() => {
        if (editorRef.current && activeNote) {
            if (editorRef.current.innerHTML !== activeNote.content) {
                editorRef.current.innerHTML = activeNote.content;
            }
        }
    }, [activeNote?.id]);

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

    const handleFormat = (command: string) => {
        document.execCommand(command, false, undefined);
        if (editorRef.current && activeNote) {
            onUpdate(activeNote.id, { content: editorRef.current.innerHTML, updatedAt: Date.now() });
        }
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

    const stripHtml = (html: string) => {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    };

    const calculateDiff = (versionHtml: string) => {
        if (!activeNote) return { text: '', color: '' };
        const currentText = stripHtml(activeNote.content);
        const versionText = stripHtml(versionHtml);
        const diff = versionText.length - currentText.length;
        if (diff > 0) return { text: `+${diff} chars`, color: 'text-emerald-500' };
        if (diff < 0) return { text: `${diff} chars`, color: 'text-red-500' };
        return { text: 'No changes', color: 'text-zinc-600' };
    };

    return (
        <div className="h-full flex bg-background animate-fade-in overflow-hidden relative text-[#e0e0e0]">

            {/* SEARCH OVERLAY */}
            {isSearchOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center pt-[10vh] px-4">
                    <div className="absolute inset-0" onClick={() => setIsSearchOpen(false)}></div>
                    <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-sm w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] relative z-10">
                        <div className="flex items-center gap-3 p-4 border-b border-[#2a2a2a]">
                            <Search className="text-[#666]" size={18} />
                            <input
                                ref={searchInputRef}
                                autoFocus
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent text-sm text-[#e0e0e0] outline-none placeholder:text-[#666] font-mono tracking-wide"
                                placeholder="Search Intel (Titles & Content)..."
                                onKeyDown={e => e.key === 'Escape' && setIsSearchOpen(false)}
                            />
                            <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="p-1 hover:bg-[#1a1a1a] rounded-sm text-[#666] hover:text-[#e0e0e0] transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-2 no-scrollbar">
                            {searchQuery.trim() === '' ? (
                                <div className="py-12 text-center text-[#666] flex flex-col items-center gap-4 font-mono text-xs">
                                    <Search size={20} className="opacity-50" />
                                    <span>Type to dynamically search the entire database...</span>
                                </div>
                            ) : searchResults.length === 0 ? (
                                <div className="py-12 text-center text-[#666] font-mono text-xs">No results found for "<span className="text-[#e0e0e0]">{searchQuery}</span>"</div>
                            ) : (
                                searchResults.map(note => (
                                    <div
                                        key={note.id}
                                        onClick={() => { setSelectedId(note.id); activeNote?.folderId !== note.folderId && setActiveFolderId(note.folderId || null); setIsSearchOpen(false); setSearchQuery(''); }}
                                        className="group p-3 hover:bg-[#161616] cursor-pointer flex items-start gap-3 transition-colors rounded-sm"
                                    >
                                        <div className="mt-0.5 flex-shrink-0">
                                            <FileText size={14} className="text-[#059669]" />
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                            <h4 className="text-[#e0e0e0] font-medium truncate text-sm">{note.title || 'Untitled'}</h4>
                                            <p className="text-[#666] text-xs line-clamp-2 font-mono">
                                                {stripHtml(note.content) || 'No content...'}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="h-8 border-t border-[#2a2a2a] bg-[#0a0a0a] flex items-center px-4">
                            <span className="text-[10px] text-[#666] font-mono"><kbd className="bg-[#1a1a1a] px-1 py-0.5 rounded-sm border border-[#2a2a2a]">ESC</kbd> to close</span>
                        </div>
                    </div>
                </div>
            )}

            {/* SIDEBAR LIST */}
            <div className={`
                ${selectedId ? 'hidden md:flex' : 'flex'}
                w-full md:w-72 border-r border-border flex-col bg-surface/30
            `}>
                <div className="p-4 border-b border-border space-y-4 shrink-0">
                    <div className="flex items-center justify-between text-[#888]">
                        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#e0e0e0]">Intel Database</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsSearchOpen(true)} className="hover:text-white transition-colors" title="Search (Cmd+K)">
                                <Search size={14} />
                            </button>
                            <button onClick={handleCreate} className="hover:text-white transition-colors">
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                    {/* View Tabs */}
                    {!activeFolderId && (
                        <div className="flex bg-[#111] border border-[#222] rounded-sm p-0.5">
                            <button
                                onClick={() => setViewMode('inbox')}
                                className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] py-1.5 rounded-sm font-medium transition-colors ${viewMode === 'inbox' ? 'bg-[#222] text-[#fff]' : 'text-[#888] hover:text-[#ccc]'}`}
                            >
                                <Inbox size={12} /> Inbox
                            </button>
                            <button
                                onClick={() => setViewMode('all')}
                                className={`flex-1 text-[11px] py-1.5 rounded-sm font-medium transition-colors ${viewMode === 'all' ? 'bg-[#222] text-[#fff]' : 'text-[#888] hover:text-[#ccc]'}`}
                            >
                                All Notes
                            </button>
                        </div>
                    )}
                </div>

                {/* FOLDERS SECTION */}
                <div className="p-3 border-b border-border space-y-1 shrink-0 bg-[#080808]">
                    <div className="flex items-center justify-between text-[#666] mb-2 px-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest">Collections</span>
                        <button onClick={() => setIsAddingFolder(true)} className="hover:text-white transition-colors"><Plus size={12} /></button>
                    </div>
                    {isAddingFolder && (
                        <div className="flex items-center mb-2 px-2">
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
                                className="w-full bg-[#111] border border-[#333] rounded-sm px-2 py-1 text-xs text-[#e0e0e0] outline-none"
                                placeholder="Folder Name..."
                            />
                        </div>
                    )}
                    {activeFolderId && (
                        <button
                            onClick={() => setActiveFolderId(null)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-[#888] hover:text-white hover:bg-[#151515] transition-colors rounded-sm"
                        >
                            <ArrowLeft size={12} />
                            Back to root
                        </button>
                    )}
                    {state.noteFolders.map(folder => (
                        <div
                            key={folder.id}
                            className={`group flex items-center justify-between px-2 py-1.5 rounded-sm cursor-pointer text-xs transition-colors ${activeFolderId === folder.id ? 'bg-[#151515] text-[#10b981]' : 'text-[#888] hover:bg-[#111] hover:text-[#ccc]'}`}
                        >
                            <div className="flex items-center gap-2 flex-1" onClick={() => setActiveFolderId(folder.id)}>
                                <Folder size={12} className={activeFolderId === folder.id ? 'text-[#10b981]' : 'text-[#666]'} />
                                <span className="font-medium truncate">{folder.name}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); onFolderDelete(folder.id); }} className="opacity-0 group-hover:opacity-100 px-1 text-[#666] hover:text-[#ef4444] transition-opacity">
                                <Trash2 size={10} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* NOTES LIST */}
                <div className="flex-1 overflow-y-auto no-scrollbar bg-[#0a0a0a]">
                    {listNotes.length === 0 ? (
                        <div className="py-8 text-center text-[#555] text-xs font-mono">No notes found.</div>
                    ) : listNotes.map(note => {
                        const folderName = getFolderName(note.folderId);
                        return (
                            <div
                                key={note.id}
                                onClick={() => setSelectedId(note.id)}
                                className={`
                                    p-4 border-b border-[#111] cursor-pointer hover:bg-[#121212] transition-colors group
                                    ${selectedId === note.id ? 'bg-[#121212] border-l-2 border-l-[#10b981]' : 'border-l-2 border-l-transparent'}
                                `}
                            >
                                <div className="flex justify-between items-start gap-2 mb-1.5">
                                    <div className={`text-sm tracking-wide truncate flex-1 ${selectedId === note.id ? 'text-[#fff]' : 'text-[#ccc]'}`}>{note.title || 'Untitled'}</div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(note.id); if (selectedId === note.id) setSelectedId(null); }}
                                        className="opacity-0 group-hover:opacity-100 text-[#555] hover:text-[#ef4444] transition-colors"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                                <div className="mt-1 flex items-center justify-between text-[10px] text-[#666] font-mono">
                                    <div className="flex items-center gap-2">
                                        <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                    {folderName && viewMode === 'all' && !activeFolderId && (
                                        <span className="bg-[#1a1a1a] text-[#888] px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                                            {folderName}
                                        </span>
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
                flex-1 flex-col bg-[#050505] min-w-0
            `}>
                {activeNote ? (
                    <>
                        {/* Editor Header */}
                        <div className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-[#080808]">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setSelectedId(null)}
                                    className="md:hidden text-[#888] hover:text-white"
                                >
                                    <ArrowLeft size={16} />
                                </button>

                                <select
                                    value={activeNote.folderId || ''}
                                    onChange={(e) => onUpdate(activeNote.id, { folderId: e.target.value || undefined })}
                                    className="bg-transparent text-xs text-[#888] hover:text-[#ccc] outline-none cursor-pointer border-none p-0 focus:ring-0 appearance-none font-mono"
                                >
                                    <option value="">[ /Inbox ]</option>
                                    {state.noteFolders.map(f => (
                                        <option key={f.id} value={f.id}>[ /{f.name} ]</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-4 shrink-0 text-[#888]">
                                <span className="text-[10px] font-mono shrink-0 flex items-center gap-1.5 tracking-widest uppercase">
                                    <Calendar size={10} />
                                    {new Date(activeNote.updatedAt).toLocaleTimeString()}
                                </span>
                                <div className="w-px h-3 bg-[#333]" />
                                <button
                                    onClick={handleSaveVersion}
                                    className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider hover:text-white transition-colors"
                                    title="Save Snapshot"
                                >
                                    <Save size={12} /> Save
                                </button>
                                <button
                                    onClick={() => setShowVersions(!showVersions)}
                                    className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${showVersions ? 'text-[#10b981]' : 'hover:text-white'}`}
                                >
                                    <History size={12} /> History
                                </button>
                            </div>
                        </div>

                        {/* Editor Formatting (minimalist) & Core Content */}
                        <div className="flex flex-1 min-h-0 overflow-hidden relative">
                            {/* Main Editor */}
                            <div className="flex-1 flex flex-col min-w-0 overflow-auto no-scrollbar relative">

                                {/* Floating Toolbar Minimal */}
                                <div className="sticky top-0 z-10 w-full bg-[#050505]/95 backdrop-blur py-4 px-8 md:px-16 flex items-center gap-2 border-b border-transparent hover:border-[#111] transition-colors">
                                    <button onMouseDown={(e) => { e.preventDefault(); handleFormat('bold'); }} className="p-1.5 text-[#666] hover:text-[#e0e0e0] hover:bg-[#111] rounded-sm transition-colors" title="Bold (Cmd+B)"><Bold size={14} /></button>
                                    <div className="w-px h-3 bg-[#222]" />
                                    <button onMouseDown={(e) => { e.preventDefault(); handleFormat('insertUnorderedList'); }} className="p-1.5 text-[#666] hover:text-[#e0e0e0] hover:bg-[#111] rounded-sm transition-colors" title="Bullet List"><List size={14} /></button>
                                    <button onMouseDown={(e) => { e.preventDefault(); handleFormat('insertOrderedList'); }} className="p-1.5 text-[#666] hover:text-[#e0e0e0] hover:bg-[#111] rounded-sm transition-colors" title="Numbered List"><ListOrdered size={14} /></button>
                                </div>

                                <div className="px-8 md:px-16 pb-4">
                                    <input
                                        value={activeNote.title}
                                        onChange={e => onUpdate(activeNote.id, { title: e.target.value, updatedAt: Date.now() })}
                                        className="bg-transparent text-xl font-semibold text-[#e0e0e0] outline-none w-full placeholder:text-[#444] tracking-wide"
                                        placeholder="Title..."
                                    />
                                </div>

                                <div
                                    ref={editorRef}
                                    contentEditable
                                    suppressContentEditableWarning
                                    onPaste={(e) => {
                                        e.preventDefault();
                                        const text = e.clipboardData.getData('text/plain');
                                        document.execCommand('insertText', false, text);
                                    }}
                                    onInput={(e) => {
                                        if (!activeNote) return;
                                        onUpdate(activeNote.id, { content: e.currentTarget.innerHTML, updatedAt: Date.now() });
                                    }}
                                    className="flex-1 w-full bg-transparent px-8 md:px-16 py-2 outline-none text-[#ccc] font-mono text-sm leading-[1.8] min-h-[300px] pb-32"
                                    placeholder="Start typing..."
                                    style={{
                                        // Specific styles to ensure bullets and lists render nicely internally
                                        listStylePosition: 'inside'
                                    }}
                                />
                            </div>

                            {/* Versions Sidebar */}
                            {showVersions && (
                                <div className="w-64 border-l border-border bg-[#080808] flex flex-col shrink-0 animate-in slide-in-from-right-8 duration-200">
                                    <div className="p-4 border-b border-[#1a1a1a] flex justify-between items-center">
                                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#666]">History</h3>
                                        <button onClick={() => setShowVersions(false)} className="p-1 hover:bg-[#111] rounded-sm text-[#666] hover:text-[#fff]" title="Close">
                                            <X size={12} />
                                        </button>
                                    </div>

                                    {selectedVersion ? (
                                        <div className="flex-1 flex flex-col overflow-hidden">
                                            <div className="p-3 border-b border-[#1a1a1a] bg-[#111] flex justify-between items-center">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-[#888] uppercase tracking-[0.1em]">Snapshot</span>
                                                    <span className="text-xs text-[#e0e0e0] mt-0.5">{new Date(selectedVersion.timestamp).toLocaleString()}</span>
                                                </div>
                                                <button onClick={() => setSelectedVersion(null)} className="p-1 text-[#666] hover:text-[#fff] bg-[#1a1a1a] rounded-sm"><ArrowLeft size={12} /></button>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-4 bg-[#0a0a0a]">
                                                {/* Render HTML content for snapshot as well since it could have formatting */}
                                                <div
                                                    className="text-xs text-[#888] font-mono leading-[1.8]"
                                                    dangerouslySetInnerHTML={{ __html: selectedVersion.content }}
                                                />
                                            </div>
                                            <div className="p-4 border-t border-[#1a1a1a]">
                                                <button
                                                    onClick={() => handleRestoreVersion(selectedVersion)}
                                                    className="w-full py-2 bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981]/20 border border-[#10b981]/20 rounded-sm text-[11px] font-bold transition-colors flex items-center justify-center gap-2 uppercase tracking-wide"
                                                >
                                                    <RotateCcw size={14} />
                                                    Restore
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                            {(!activeNote.versions || activeNote.versions.length === 0) ? (
                                                <div className="p-6 text-center text-[10px] text-[#555] font-mono uppercase tracking-[0.1em] leading-relaxed">
                                                    No snapshots saved.
                                                </div>
                                            ) : (
                                                activeNote.versions.map(v => {
                                                    const diff = calculateDiff(v.content);
                                                    return (
                                                        <div
                                                            key={v.id}
                                                            onClick={() => setSelectedVersion(v)}
                                                            className="group p-3 rounded-sm border border-transparent hover:border-[#222] hover:bg-[#111] cursor-pointer transition-colors flex flex-col gap-1.5"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-[#ccc] font-medium">{new Date(v.timestamp).toLocaleDateString()}</span>
                                                                </div>
                                                                <span className="text-[10px] text-[#666] font-mono">{new Date(v.timestamp).toLocaleTimeString()}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between mt-1">
                                                                <span className="text-[10px] text-[#555] truncate max-w-[120px]">
                                                                    {stripHtml(v.content) || 'Empty'}
                                                                </span>
                                                                <span className={`text-[10px] font-mono ${diff.color}`}>{diff.text}</span>
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-[#333]">
                        <div className="flex flex-col items-center gap-3">
                            <FileText size={32} strokeWidth={1} />
                            <span className="text-[10px] font-mono tracking-[0.2em] uppercase">No file selected</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Injected global CSS for ContentEditable specifically handling ul/ol properly in Tailwind context */}
            <style dangerouslySetInnerHTML={{
                __html: `
                [contenteditable="true"] ul { list-style-type: disc; margin-left: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem; }
                [contenteditable="true"] ol { list-style-type: decimal; margin-left: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem; }
                [contenteditable="true"] b, [contenteditable="true"] strong { font-weight: 700; color: #fff; }
                [contenteditable="true"]:empty:before {
                    content: attr(placeholder);
                    color: #444;
                    cursor: text;
                }
            `}} />
        </div>
    );
};

export default NotesView;
