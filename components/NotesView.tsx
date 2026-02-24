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

    const getFolderFullPath = (folderId: string): string => {
        const folder = state.noteFolders.find(f => f.id === folderId);
        if (!folder) return '';
        if (folder.parentId) {
            return `${getFolderFullPath(folder.parentId)} / ${folder.name}`;
        }
        return folder.name;
    };

    const getFolderOptions = () => {
        return state.noteFolders.map(f => ({
            ...f,
            fullPath: getFolderFullPath(f.id),
            // Indentation based on depth
            indentLevel: getFolderFullPath(f.id).split('/').length - 1
        })).sort((a, b) => a.fullPath.localeCompare(b.fullPath));
    };

    const stripHtml = (html: string) => {
        if (!html) return '';
        const spacedHtml = html.replace(/<\/(div|p|h[1-6]|li|ul|ol)>/ig, ' </$1>').replace(/<br[^>]*>/ig, ' ');
        const tmp = document.createElement('div');
        tmp.innerHTML = spacedHtml;
        return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
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
        <div className="h-full flex bg-background animate-fade-in overflow-hidden notes-editor-root">

            {/* SEARCH OVERLAY */}
            {isSearchOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center pt-[10vh] px-4 backdrop-blur-sm">
                    <div className="absolute inset-0" onClick={() => setIsSearchOpen(false)}></div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] relative z-10">
                        <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
                            <Search className="text-zinc-500" size={18} />
                            <input
                                ref={searchInputRef}
                                autoFocus
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600 font-mono"
                                placeholder="Search Intel (Titles & Content)..."
                                onKeyDown={e => e.key === 'Escape' && setIsSearchOpen(false)}
                            />
                            <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="p-1.5 hover:bg-zinc-900 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-2 no-scrollbar">
                            {searchQuery.trim() === '' ? (
                                <div className="py-12 text-center text-zinc-600 flex flex-col items-center gap-4 font-mono text-xs">
                                    <Search size={20} className="opacity-50" />
                                    <span>Type to dynamically search the entire database...</span>
                                </div>
                            ) : searchResults.length === 0 ? (
                                <div className="py-12 text-center text-zinc-500 font-mono text-xs">No results found for "<span className="text-zinc-300">{searchQuery}</span>"</div>
                            ) : (
                                searchResults.map(note => (
                                    <div
                                        key={note.id}
                                        onClick={() => { setSelectedId(note.id); activeNote?.folderId !== note.folderId && setActiveFolderId(note.folderId || null); setIsSearchOpen(false); setSearchQuery(''); }}
                                        className="group p-3 hover:bg-zinc-900 cursor-pointer flex items-start gap-3 transition-colors rounded-lg"
                                    >
                                        <div className="mt-0.5 flex-shrink-0">
                                            <FileText size={14} className="text-emerald-500" />
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                            <h4 className="text-zinc-200 font-medium truncate text-sm">{note.title || 'Untitled'}</h4>
                                            <p className="text-zinc-500 text-xs line-clamp-2 font-mono">
                                                {stripHtml(note.content) || 'No content...'}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="h-8 border-t border-zinc-800 bg-zinc-950 flex items-center px-4">
                            <span className="text-[10px] text-zinc-500 font-mono"><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">ESC</kbd> to close</span>
                        </div>
                    </div>
                </div>
            )}

            {/* SIDEBAR LIST */}
            <div className={`
                ${selectedId ? 'hidden md:flex' : 'flex'}
                w-full md:w-80 border-r border-border flex-col bg-surface/30
            `}>
                <div className="p-4 border-b border-border space-y-4 shrink-0">
                    <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider">Intel Database</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsSearchOpen(true)} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors" title="Search (Cmd+K)">
                                <Search size={14} />
                            </button>
                            <button onClick={handleCreate} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors">
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                    {/* View Tabs */}
                    {!activeFolderId && (
                        <div className="flex bg-zinc-900/50 border border-zinc-800 rounded p-1">
                            <button
                                onClick={() => setViewMode('inbox')}
                                className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-sm font-medium transition-colors ${viewMode === 'inbox' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <Inbox size={12} /> Inbox
                            </button>
                            <button
                                onClick={() => setViewMode('all')}
                                className={`flex-1 text-xs py-1.5 rounded-sm font-medium transition-colors ${viewMode === 'all' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                All Notes
                            </button>
                        </div>
                    )}
                </div>

                {/* FOLDERS SECTION */}
                <div className="p-3 border-b border-border space-y-1 shrink-0 bg-black/10">
                    <div className="flex items-center justify-between text-zinc-500 mb-2 px-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Collections</span>
                        <button onClick={() => setIsAddingFolder(true)} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition-colors"><Plus size={12} /></button>
                    </div>
                    {isAddingFolder && (
                        <div className="flex items-center mb-2 px-2">
                            <input
                                autoFocus
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && newFolderName.trim()) {
                                        onFolderAdd({ id: generateId(), name: newFolderName.trim(), createdAt: Date.now(), parentId: activeFolderId || undefined });
                                        setNewFolderName('');
                                        setIsAddingFolder(false);
                                    } else if (e.key === 'Escape') {
                                        setIsAddingFolder(false);
                                    }
                                }}
                                onBlur={() => setIsAddingFolder(false)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 outline-none"
                                placeholder="Folder Name..."
                            />
                        </div>
                    )}
                    {activeFolderId && (
                        <button
                            onClick={() => {
                                const current = state.noteFolders.find(f => f.id === activeFolderId);
                                setActiveFolderId(current?.parentId || null);
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors rounded"
                        >
                            <ArrowLeft size={12} />
                            Back
                        </button>
                    )}
                    {state.noteFolders
                        .filter(f => (f.parentId || null) === (activeFolderId || null))
                        .map(folder => (
                            <div
                                key={folder.id}
                                className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-xs transition-colors ${activeFolderId === folder.id ? 'bg-zinc-800 text-emerald-500' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}
                            >
                                <div className="flex items-center gap-2 flex-1" onClick={() => setActiveFolderId(folder.id)}>
                                    <Folder size={12} className={activeFolderId === folder.id ? 'text-emerald-500' : 'text-zinc-500'} />
                                    <span className="font-medium truncate">{folder.name}</span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); onFolderDelete(folder.id); }} className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-opacity">
                                    <Trash2 size={10} />
                                </button>
                            </div>
                        ))}
                </div>

                {/* NOTES LIST */}
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {listNotes.length === 0 ? (
                        <div className="py-8 text-center text-zinc-600 text-xs font-mono">No notes found.</div>
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
                                    <div className="text-sm font-medium text-zinc-200 mb-1 truncate flex-1">{note.title || 'Untitled'}</div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(note.id); if (selectedId === note.id) setSelectedId(null); }}
                                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-colors p-1 -m-1"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                                <div className="text-xs text-zinc-600 line-clamp-2 font-mono">{stripHtml(note.content) || 'No content...'}</div>
                                <div className="mt-3 flex items-center gap-2 text-[10px] text-zinc-700">
                                    <div className="flex items-center gap-2">
                                        <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                    {folderName && viewMode === 'all' && !activeFolderId && (
                                        <span className="bg-zinc-800 px-1.5 rounded text-zinc-500 flex items-center gap-1">
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
                flex-1 flex-col bg-background min-w-0
            `}>
                {activeNote ? (
                    <>
                        {/* Editor Header */}
                        <div className="h-16 border-b border-border flex items-center justify-between px-4 md:px-8 shrink-0 gap-3">
                            <div className="flex items-center gap-4">
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
                                        className="bg-transparent text-xs text-zinc-400 hover:text-zinc-300 outline-none cursor-pointer border-none p-0 focus:ring-0 appearance-none font-mono"
                                    >
                                        <option value="">[ /Inbox ]</option>
                                        {getFolderOptions().map(f => (
                                            <option key={f.id} value={f.id}>
                                                [ /{'\u00A0'.repeat(f.indentLevel * 3)}{f.name} ]
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0 text-zinc-500 font-mono text-xs">
                                <span className="flex items-center gap-1">
                                    <Calendar size={12} />
                                    <span className="hidden sm:inline">{new Date(activeNote.updatedAt).toLocaleTimeString()}</span>
                                </span>
                                <div className="w-px h-3 bg-zinc-700" />
                                <button
                                    onClick={handleSaveVersion}
                                    className="flex items-center gap-1.5 font-bold uppercase tracking-wider hover:text-zinc-300 transition-colors"
                                    title="Save Snapshot"
                                >
                                    <Save size={12} /> Save
                                </button>
                                <button
                                    onClick={() => setShowVersions(!showVersions)}
                                    className={`flex items-center gap-1.5 font-bold uppercase tracking-wider transition-colors ${showVersions ? 'text-emerald-500' : 'hover:text-zinc-300'}`}
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
                                <div className="sticky top-0 z-10 w-full bg-background/95 backdrop-blur py-4 px-4 md:px-8 flex items-center gap-2 border-b border-transparent hover:border-zinc-800/50 transition-colors pt-6">
                                    <button onMouseDown={(e) => { e.preventDefault(); handleFormat('bold'); }} className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors" title="Bold (Cmd+B)"><Bold size={14} /></button>
                                    <div className="w-px h-3 bg-zinc-700 mx-1" />
                                    <button onMouseDown={(e) => { e.preventDefault(); handleFormat('insertUnorderedList'); }} className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors" title="Bullet List"><List size={14} /></button>
                                    <button onMouseDown={(e) => { e.preventDefault(); handleFormat('insertOrderedList'); }} className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors" title="Numbered List"><ListOrdered size={14} /></button>
                                </div>

                                <div className="px-4 md:px-8 pb-4">
                                    <input
                                        value={activeNote.title}
                                        onChange={e => onUpdate(activeNote.id, { title: e.target.value, updatedAt: Date.now() })}
                                        className="bg-transparent text-lg font-medium text-zinc-100 outline-none w-full placeholder:text-zinc-700"
                                        placeholder="Note Title..."
                                    />
                                </div>

                                <div
                                    ref={editorRef}
                                    contentEditable
                                    suppressContentEditableWarning
                                    onPaste={(e) => {
                                        e.preventDefault();
                                        const html = e.clipboardData.getData('text/html');
                                        if (html) {
                                            const doc = new DOMParser().parseFromString(html, 'text/html');
                                            const walk = (node: Node) => {
                                                if (node.nodeType === Node.ELEMENT_NODE) {
                                                    const el = node as HTMLElement;
                                                    if (el.style) {
                                                        el.style.color = '';
                                                        el.style.backgroundColor = '';
                                                        el.style.fontFamily = '';
                                                        el.style.fontSize = '';
                                                        el.style.lineHeight = '';
                                                    }
                                                    el.removeAttribute('class');
                                                    el.removeAttribute('id');
                                                }
                                                Array.from(node.childNodes).forEach(walk);
                                            };
                                            walk(doc.body);
                                            document.execCommand('insertHTML', false, doc.body.innerHTML);
                                        } else {
                                            const text = e.clipboardData.getData('text/plain');
                                            document.execCommand('insertText', false, text);
                                        }
                                    }}
                                    onInput={(e) => {
                                        if (!activeNote) return;
                                        onUpdate(activeNote.id, { content: e.currentTarget.innerHTML, updatedAt: Date.now() });
                                    }}
                                    className="flex-1 w-full bg-transparent px-4 md:px-8 py-2 outline-none text-zinc-300 font-mono text-sm leading-relaxed min-h-[300px] pb-32"
                                    placeholder="Start typing..."
                                    style={{
                                        listStylePosition: 'inside'
                                    }}
                                />
                            </div>

                            {/* Versions Sidebar */}
                            {showVersions && (
                                <div className="w-64 border-l border-zinc-800/50 bg-surface/50 flex flex-col shrink-0 animate-in slide-in-from-right-8 duration-200">
                                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">History</h3>
                                        <button onClick={() => setShowVersions(false)} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200" title="Close">
                                            <X size={12} />
                                        </button>
                                    </div>

                                    {selectedVersion ? (
                                        <div className="flex-1 flex flex-col overflow-hidden">
                                            <div className="p-3 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Snapshot</span>
                                                    <span className="text-xs text-zinc-200 mt-0.5">{new Date(selectedVersion.timestamp).toLocaleString()}</span>
                                                </div>
                                                <button onClick={() => setSelectedVersion(null)} className="p-1 text-zinc-500 hover:text-zinc-200 bg-zinc-800 rounded"><ArrowLeft size={12} /></button>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-4">
                                                {/* Render HTML content for snapshot as well since it could have formatting */}
                                                <div
                                                    className="text-xs text-zinc-400 font-mono leading-relaxed selection:bg-emerald-900 selection:text-emerald-100"
                                                    dangerouslySetInnerHTML={{ __html: selectedVersion.content }}
                                                />
                                            </div>
                                            <div className="p-4 border-t border-zinc-800">
                                                <button
                                                    onClick={() => handleRestoreVersion(selectedVersion)}
                                                    className="w-full py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 rounded text-xs font-bold transition-colors flex items-center justify-center gap-2 uppercase tracking-wide"
                                                >
                                                    <RotateCcw size={14} />
                                                    Restore
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                            {(!activeNote.versions || activeNote.versions.length === 0) ? (
                                                <div className="p-6 text-center text-[10px] text-zinc-600 font-mono uppercase tracking-widest leading-relaxed">
                                                    No snapshots saved.
                                                </div>
                                            ) : (
                                                activeNote.versions.map(v => {
                                                    const diff = calculateDiff(v.content);
                                                    return (
                                                        <div
                                                            key={v.id}
                                                            onClick={() => setSelectedVersion(v)}
                                                            className="group p-3 rounded border border-transparent hover:border-zinc-800 hover:bg-zinc-900/50 cursor-pointer transition-colors flex flex-col gap-1.5"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-zinc-300 font-medium">{new Date(v.timestamp).toLocaleDateString()}</span>
                                                                </div>
                                                                <span className="text-[10px] text-zinc-500 font-mono">{new Date(v.timestamp).toLocaleTimeString()}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between mt-1">
                                                                <span className="text-[10px] text-zinc-500 truncate max-w-[120px]">
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
                    <div className="flex-1 flex items-center justify-center text-zinc-700">
                        <div className="flex flex-col items-center gap-3">
                            <FileText size={32} strokeWidth={1} />
                            <span className="text-xs font-mono">Select a file to view</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Injected global CSS for ContentEditable specifically handling ul/ol properly in Tailwind context */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .notes-editor-root ::selection {
                    background-color: #064e3b !important;
                    color: #d1fae5 !important;
                }
                .notes-editor-root *::selection {
                    background-color: #064e3b !important;
                    color: #d1fae5 !important;
                }
                [contenteditable="true"] ul { list-style-type: disc; margin-left: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem; }
                [contenteditable="true"] ol { list-style-type: decimal; margin-left: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem; }
                [contenteditable="true"] b, [contenteditable="true"] strong { font-weight: 700; color: #fff; }
                [contenteditable="true"]:empty:before {
                    content: attr(placeholder);
                    color: #52525b; /* zinc-600 */
                    cursor: text;
                }
                [contenteditable="true"] {
                    outline: none;
                }
            `}} />
        </div>
    );
};

export default NotesView;
