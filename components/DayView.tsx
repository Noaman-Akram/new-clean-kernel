import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppState, Task, TaskStatus, Category, Severity, PrayerName, DayMeta } from '../types';
import { getPrayerTimesForDate, formatTimeAMPM } from '../utils/prayerTimes';
import {
  Plus, Check, X, Circle, CheckCircle2, Clock, ChevronLeft, ChevronRight,
  Sunrise, Sun, CloudSun, Sunset, Moon, Play, Pause, MoreHorizontal,
  Edit2, Calendar as CalendarIcon, Zap, ChevronDown, ChevronUp, Layers, History, Search, AlertCircle,
  BarChart3, Target, Send, Layout, ListTodo
} from 'lucide-react';

interface Props {
  state: AppState;
  onTaskUpdate: (id: string, updates: Partial<Task>) => void;
  onTaskAdd: (title: string, category: Category, impact: Severity, options?: { scheduledTime?: number; duration?: number }) => void;
  onTaskDelete: (id: string) => void;
  onStartSession: (id: string) => void;
  onStickyNoteUpdate: (dateKey: string, content: string) => void;
  onPrayerToggle: (prayerKey: string) => void;
  onAdhkarToggle: (adhkarKey: string) => void;
  onDayMetaUpdate: (dateKey: string, updates: Partial<DayMeta>) => void;
  activeTaskId: string | null;
  onTaskSelect: (task: Task) => void;
}

const PRAYER_BLOCKS: { name: PrayerName; arabic: string; icon: any }[] = [
  { name: 'Fajr', arabic: 'الفجر', icon: Sunrise },
  { name: 'Dhuhr', arabic: 'الظهر', icon: Sun },
  { name: 'Asr', arabic: 'العصر', icon: CloudSun },
  { name: 'Maghrib', arabic: 'المغرب', icon: Sunset },
  { name: 'Isha', arabic: 'العشاء', icon: Moon }
];

const CATEGORY_LABELS: Record<string, string> = {
  [Category.CORE]: 'Core',
  [Category.GROWTH]: 'Growth',
  [Category.SERVICE]: 'Service'
};

const CATEGORY_COLORS: Record<string, string> = {
  [Category.CORE]: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  [Category.GROWTH]: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  [Category.SERVICE]: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
};

const DayView: React.FC<Props> = ({
  state,
  onTaskUpdate,
  onTaskAdd,
  onTaskDelete,
  onStartSession,
  onStickyNoteUpdate,
  onPrayerToggle,
  onAdhkarToggle,
  onDayMetaUpdate,
  activeTaskId,
  onTaskSelect
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [captureValue, setCaptureValue] = useState('');
  const [editingTaskMenu, setEditingTaskMenu] = useState<string | null>(null);
  const [showAllMissed, setShowAllMissed] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showHistoryPicker, setShowHistoryPicker] = useState(false);

  const dateKey = selectedDate.toISOString().split('T')[0];
  const todayDate = new Date().toISOString().split('T')[0];
  const isToday = dateKey === todayDate;

  // Hijri Date
  const hijriDate = useMemo(() => {
    return new Intl.DateTimeFormat('en-u-ca-islamic-uma', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(selectedDate);
  }, [selectedDate]);

  // Prayer Times
  const prayerTimes = useMemo(() => getPrayerTimesForDate(selectedDate), [selectedDate]);

  // Tasks filtering
  const daysTasks = useMemo(() => {
    return state.tasks.filter(task => {
      if (task.scheduledTime) {
        const d = new Date(task.scheduledTime);
        return d.getFullYear() === selectedDate.getFullYear() &&
          d.getMonth() === selectedDate.getMonth() &&
          d.getDate() === selectedDate.getDate();
      }
      return false;
    }).sort((a, b) => (a.scheduledTime || 0) - (b.scheduledTime || 0));
  }, [state.tasks, selectedDate]);

  const missedTasks = useMemo(() => {
    return state.tasks.filter(task => {
      if (task.scheduledTime && task.status !== TaskStatus.DONE) {
        const d = new Date(task.scheduledTime);
        const dKey = d.toISOString().split('T')[0];
        return dKey < todayDate;
      }
      return false;
    }).sort((a, b) => (b.scheduledTime || 0) - (a.scheduledTime || 0));
  }, [state.tasks, todayDate]);

  const inboxTasks = daysTasks.filter(t => {
    if (!t.scheduledTime) return true;
    const d = new Date(t.scheduledTime);
    return d.getHours() === 12 && d.getMinutes() === 0; // Default time is inbox
  });

  const scheduledTasks = daysTasks.filter(t => !inboxTasks.includes(t));
  const activeTask = daysTasks.find(t => t.id === activeTaskId);
  const completedTasks = daysTasks.filter(t => t.status === TaskStatus.DONE);
  const pendingTasks = daysTasks.filter(t => t.status !== TaskStatus.DONE);
  const progress = daysTasks.length > 0 ? (completedTasks.length / daysTasks.length) * 100 : 0;

  // Handlers
  const handleToggleComplete = (task: Task) => {
    onTaskUpdate(task.id, { status: task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE });
  };

  const handleCapture = () => {
    if (!captureValue.trim()) return;
    const scheduleDate = new Date(selectedDate);
    scheduleDate.setHours(12, 0, 0, 0);
    onTaskAdd(captureValue.trim(), Category.CORE, 'MED', { scheduledTime: scheduleDate.getTime() });
    setCaptureValue('');
  };

  const handleReschedule = (task: Task, daysOffset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + daysOffset);
    if (task.scheduledTime) {
      const oldTime = new Date(task.scheduledTime);
      newDate.setHours(oldTime.getHours(), oldTime.getMinutes());
    }
    onTaskUpdate(task.id, { scheduledTime: newDate.getTime() });
    setEditingTaskMenu(null);
  };

  const getTasksForBlock = (prayerName: PrayerName) => {
    const prayer = prayerTimes.find(p => p.name === prayerName);
    if (!prayer) return [];

    // Prayer time to minutes
    const parsePrayerTime = (timeStr: string) => {
      const [h, mAmPm] = timeStr.split(':');
      const [m, ampm] = mAmPm.split(' ');
      let hours = parseInt(h);
      if (ampm.toLowerCase() === 'pm' && hours !== 12) hours += 12;
      if (ampm.toLowerCase() === 'am' && hours === 12) hours = 0;
      return hours * 60 + parseInt(m);
    };

    const prayerMinutes = parsePrayerTime(prayer.time);

    // Find next prayer to define window
    const currentIndex = PRAYER_BLOCKS.findIndex(b => b.name === prayerName);
    let nextPrayerMinutes = prayerMinutes + 240; // Default 4h if last
    if (currentIndex < PRAYER_BLOCKS.length - 1) {
      const nextPrayer = prayerTimes.find(p => p.name === PRAYER_BLOCKS[currentIndex + 1].name);
      if (nextPrayer) nextPrayerMinutes = parsePrayerTime(nextPrayer.time);
    }

    return scheduledTasks.filter(task => {
      if (!task.scheduledTime) return false;
      const t = new Date(task.scheduledTime);
      const taskMinutes = t.getHours() * 60 + t.getMinutes();
      return taskMinutes >= prayerMinutes && taskMinutes < nextPrayerMinutes;
    });
  };

  const getRelativeDateStr = (timestamp: number) => {
    const d = new Date(timestamp);
    const dKey = d.toISOString().split('T')[0];
    const diff = Math.floor((new Date(todayDate).getTime() - new Date(dKey).getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 1) return 'Yesterday';
    if (diff <= 7) return `${diff}d ago`;
    return d.toLocaleDateString();
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
  };

  return (
    <div className="h-full flex flex-col bg-[#050505] text-zinc-400 font-mono selection:bg-zinc-800 selection:text-white overflow-hidden">
      {/* HEADER */}
      <header className="h-14 border-b border-zinc-900 flex items-center justify-between px-6 bg-black/50 backdrop-blur-md z-40 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))} className="p-1 hover:text-white text-zinc-700 transition-colors"><ChevronLeft size={14} /></button>
            <div className="flex flex-col items-center min-w-[120px]">
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">{selectedDate.toLocaleDateString(undefined, { weekday: 'short' })}</span>
              <button onClick={() => setSelectedDate(new Date())} className="text-[10px] text-zinc-400 hover:text-white transition-colors">
                {selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </button>
            </div>
            <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))} className="p-1 hover:text-white text-zinc-700 transition-colors"><ChevronRight size={14} /></button>
          </div>

          <div className="h-6 w-px bg-zinc-900"></div>

          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">{hijriDate}</span>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4 text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
            {prayerTimes.map(p => (
              <div key={p.name} className="flex items-center gap-1.5 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
                <span>{p.time.replace(/ (am|pm)/i, '').padStart(5, '0')}</span>
                <span className="text-[7px] text-zinc-700">{p.name[0]}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setIsFocusMode(!isFocusMode)}
            className={`flex items-center gap-2 px-3 py-1 rounded border transition-all text-[9px] font-bold uppercase tracking-widest ${isFocusMode ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'border-zinc-800 text-zinc-600 hover:text-zinc-300 hover:border-zinc-700'}`}
          >
            {isFocusMode ? <Zap size={10} fill="currentColor" /> : <Layers size={10} />}
            {isFocusMode ? 'Focus On' : 'Enter Focus'}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex overflow-hidden">

        {isFocusMode ? (
          <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
            {activeTask ? (
              <div className="max-w-xl w-full space-y-12 text-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white text-[9px] font-bold uppercase tracking-[0.3em]">
                    Executing Directive
                  </div>
                  <h2 className="text-4xl font-medium text-white tracking-tight leading-tight">{activeTask.title}</h2>
                  {activeTask.notes && <p className="text-zinc-500 text-lg leading-relaxed">{activeTask.notes}</p>}
                </div>

                {activeTask.subtasks && activeTask.subtasks.length > 0 && (
                  <div className="bg-zinc-900/30 border border-zinc-800/50 p-8 rounded-2xl text-left space-y-4">
                    {activeTask.subtasks.map(sub => (
                      <div key={sub.id} className="flex items-center gap-4 group">
                        <button
                          onClick={() => {
                            const newSubs = activeTask.subtasks?.map(s => s.id === sub.id ? { ...s, done: !s.done } : s);
                            onTaskUpdate(activeTask.id, { subtasks: newSubs });
                          }}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${sub.done ? 'bg-white border-white text-black' : 'border-zinc-700 text-zinc-700 group-hover:border-white/20'}`}
                        >
                          {sub.done && <Check size={12} />}
                        </button>
                        <span className={`text-sm ${sub.done ? 'text-zinc-700 line-through' : 'text-zinc-200'}`}>{sub.title}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => handleToggleComplete(activeTask)} className="px-8 py-3 bg-white text-black font-bold text-xs rounded hover:bg-zinc-200 transition-all uppercase tracking-widest shadow-[0_0_20px_rgba(255,255,255,0.1)]">Complete</button>
                  <button onClick={() => onStartSession(activeTask.id)} className="px-8 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold text-xs rounded hover:border-zinc-600 transition-all uppercase tracking-widest">Pause</button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6 opacity-40">
                <div className="w-16 h-16 rounded-full border border-dashed border-zinc-700 flex items-center justify-center mx-auto text-zinc-700">
                  <Zap size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-zinc-300">No active directive</h2>
                  <p className="text-xs text-zinc-600 mt-2 uppercase tracking-widest">Select a task to enter focus</p>
                </div>
                <button onClick={() => setIsFocusMode(false)} className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 underline underline-offset-4">Back to Architecture</button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* LEFT SIDEBAR: CAPTURE & INBOX */}
            <aside className="w-[300px] border-r border-zinc-900 flex flex-col p-6 space-y-8 bg-black/20 shrink-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Capture</h2>
                  <BarChart3 size={12} className="text-zinc-800" />
                </div>
                <div className="relative group">
                  <textarea
                    value={captureValue}
                    onChange={e => setCaptureValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCapture(); } }}
                    placeholder="Brain dump..."
                    className="w-full h-28 bg-zinc-900/20 border border-zinc-800/50 rounded-lg p-4 text-xs text-zinc-300 placeholder:text-zinc-800 focus:border-zinc-700 outline-none transition-all resize-none font-mono"
                  />
                  <div className="absolute bottom-2 right-2 flex items-center gap-2">
                    <button onClick={() => setShowHistoryPicker(!showHistoryPicker)} className={`p-1.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-700 hover:text-white transition-colors`}><History size={12} /></button>
                    <button onClick={handleCapture} className="p-1.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-700 hover:text-white transition-colors"><Send size={12} /></button>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0 space-y-4">
                {/* Missed Tasks (restored collapsible) */}
                {isToday && missedTasks.length > 0 && (
                  <div className="space-y-1">
                    <button
                      onClick={() => setShowAllMissed(!showAllMissed)}
                      className="flex items-center justify-between w-full px-1 text-[9px] text-zinc-700 hover:text-amber-500/50 transition-colors uppercase font-bold tracking-tighter"
                    >
                      <div className="flex items-center gap-1">
                        <ChevronRight size={10} className={`transition-transform ${showAllMissed ? 'rotate-90' : ''}`} />
                        <span>{missedTasks.length} Overdue items</span>
                      </div>
                      <span>{showAllMissed ? 'Hide' : 'View'}</span>
                    </button>
                    {showAllMissed && (
                      <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pt-2">
                        {missedTasks.map(task => (
                          <div key={task.id} className="group p-2 rounded hover:bg-zinc-900 transition-colors flex items-center gap-3">
                            <button onClick={() => onTaskUpdate(task.id, { scheduledTime: Date.now() })} className="p-1 rounded text-zinc-700 hover:text-emerald-500 transition-colors" title="Push to Today"><Send size={10} className="rotate-90" /></button>
                            <span className="text-[11px] text-zinc-500 truncate flex-1">{task.title}</span>
                            <span className="text-[8px] text-zinc-800 font-bold uppercase">{getRelativeDateStr(task.scheduledTime!)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="h-px bg-zinc-900 mx-2"></div>

                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-4 px-1">
                    <h2 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Inbox</h2>
                    <span className="text-[10px] text-zinc-800 tabular-nums">{inboxTasks.length}p</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                    {inboxTasks.map(task => (
                      <div key={task.id} className="group relative p-3 bg-zinc-900/10 border border-zinc-800/30 rounded hover:border-zinc-700 hover:bg-zinc-900/30 transition-all">
                        <div className="flex items-start gap-3">
                          <button onClick={() => handleToggleComplete(task)} className="mt-0.5 shrink-0">
                            {task.status === TaskStatus.DONE ? <CheckCircle2 size={13} className="text-zinc-600" /> : <Circle size={13} className="text-zinc-800 group-hover:text-zinc-600" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <span className={`text-[11px] leading-relaxed block ${task.status === TaskStatus.DONE ? 'text-zinc-700 line-through' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{task.title}</span>
                          </div>
                          <button onClick={() => onTaskSelect(task)} className="opacity-0 group-hover:opacity-100 p-1 text-zinc-700 hover:text-white transition-opacity"><Edit2 size={10} /></button>
                        </div>
                      </div>
                    ))}
                    {inboxTasks.length === 0 && <div className="py-12 text-center text-[10px] text-zinc-800 uppercase italic">Inbox Clear</div>}
                  </div>
                </div>
              </div>
            </aside>

            {/* CENTER PANE: ARCHITECTURE */}
            <section className="flex-1 flex flex-col min-w-0 bg-black/40">
              <div className="h-14 border-b border-zinc-900/50 flex items-center justify-between px-8 bg-zinc-950/20">
                <h2 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.4em]">Architecture</h2>
                <div className="flex items-center gap-4 text-[9px] text-zinc-700 uppercase font-black">
                  <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500/40"></div> CORE</div>
                  <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-orange-500/40"></div> GROWTH</div>
                  <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40"></div> SERVICE</div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <div className="max-w-3xl mx-auto space-y-6 pb-20">
                  {PRAYER_BLOCKS.map(block => {
                    const tasks = getTasksForBlock(block.name);
                    const prayer = prayerTimes.find(p => p.name === block.name);
                    return (
                      <div key={block.name} className="group/block">
                        <div className="flex items-center justify-between mb-3 px-1 border-b border-zinc-900/50 pb-2">
                          <div className="flex items-center gap-4">
                            <span className="text-[11px] font-black text-zinc-300 uppercase tracking-[0.2em]">{block.name}</span>
                            <span className="text-[10px] text-zinc-700 tabular-nums">{prayer?.time.replace(':00 ', ' ').toLowerCase()}</span>
                          </div>
                          <span className="text-xs text-zinc-800 opacity-50 font-serif rtl select-none">{block.arabic}</span>
                        </div>

                        <div className="space-y-1.5">
                          {tasks.map(task => {
                            const isTaskActive = task.id === activeTaskId;
                            const subCount = task.subtasks?.length || 0;
                            const doneSubs = task.subtasks?.filter(s => s.done).length || 0;

                            return (
                              <div key={task.id} className={`group/task relative flex items-center gap-4 p-3 rounded border transition-all ${isTaskActive ? 'bg-zinc-900 border-zinc-700 shadow-[0_4px_20px_rgba(0,0,0,0.5)]' : 'border-transparent hover:bg-zinc-900/50 hover:border-zinc-800'}`}>
                                <button onClick={() => handleToggleComplete(task)} className="shrink-0">
                                  {task.status === TaskStatus.DONE ? <CheckCircle2 size={15} className="text-zinc-600" /> : <Circle size={15} className="text-zinc-800 group-hover/task:text-zinc-600" />}
                                </button>

                                <div className="flex-1 min-w-0">
                                  {task.urgent && (
                                    <div className="flex items-center gap-1 text-[8px] font-black text-amber-500/80 uppercase tracking-widest mb-1 animate-pulse">
                                      <AlertCircle size={8} /> Directive
                                    </div>
                                  )}
                                  <div className="flex items-center gap-3">
                                    <span className={`text-sm ${task.status === TaskStatus.DONE ? 'text-zinc-700 line-through' : 'text-zinc-200'}`}>{task.title}</span>
                                    {task.impact === 'HIGH' && <Zap size={10} className="text-white/20" fill="currentColor" />}
                                    {subCount > 0 && (
                                      <span className="text-[9px] text-zinc-700 font-bold bg-zinc-950 px-1 rounded border border-zinc-800 tabular-nums">
                                        {doneSubs}/{subCount}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1.5 opacity-60 group-hover/task:opacity-100 transition-opacity">
                                    <span className="text-[9px] text-zinc-700 tabular-nums uppercase font-bold">{formatTime(task.scheduledTime!)}</span>
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-sm border uppercase tracking-tighter ${CATEGORY_COLORS[task.category] || CATEGORY_COLORS[Category.CORE]}`}>
                                      {CATEGORY_LABELS[task.category] || 'CORE'}
                                    </span>
                                  </div>

                                  {/* Subtasks inline list (restored) */}
                                  {!isFocusMode && task.subtasks && task.subtasks.length > 0 && !task.status && (
                                    <div className="mt-3 space-y-1.5 pl-2 border-l border-zinc-800/50">
                                      {task.subtasks.map(sub => (
                                        <div key={sub.id} className="flex items-center gap-2 group/sub">
                                          <button
                                            onClick={() => {
                                              const newSubs = task.subtasks?.map(s => s.id === sub.id ? { ...s, done: !s.done } : s);
                                              onTaskUpdate(task.id, { subtasks: newSubs });
                                            }}
                                            className={`shrink-0 w-3 h-3 rounded-sm border flex items-center justify-center transition-all ${sub.done ? 'bg-zinc-700 border-zinc-700 text-black' : 'border-zinc-800 text-transparent hover:border-zinc-600'}`}
                                          >
                                            <Check size={8} />
                                          </button>
                                          <span className={`text-[10px] ${sub.done ? 'text-zinc-700 line-through' : 'text-zinc-500'}`}>{sub.title}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="opacity-0 group-hover/task:opacity-100 flex items-center gap-1 transition-all">
                                  <button onClick={() => onTaskSelect(task)} className="p-1.5 text-zinc-700 hover:text-white transition-colors" title="Edit"><Edit2 size={12} /></button>
                                  {!isTaskActive && task.status !== TaskStatus.DONE && (
                                    <button onClick={() => onStartSession(task.id)} className="p-1.5 text-zinc-700 hover:text-white transition-colors" title="Start"><Play size={12} /></button>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditingTaskMenu(editingTaskMenu === task.id ? null : task.id); }}
                                    className="p-1.5 text-zinc-700 hover:text-white transition-colors"
                                  >
                                    <MoreHorizontal size={12} />
                                  </button>
                                </div>

                                {editingTaskMenu === task.id && (
                                  <div className="absolute right-0 top-full mt-1 w-44 bg-zinc-950 border border-zinc-800 rounded shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in-95">
                                    <div className="px-3 py-1 text-[8px] text-zinc-700 uppercase font-black select-none">Reschedule</div>
                                    <button onClick={() => handleReschedule(task, 1)} className="w-full text-left px-3 py-1.5 text-[10px] text-zinc-400 hover:bg-white/5 transition-colors">Tomorrow</button>
                                    <button onClick={() => handleReschedule(task, 7)} className="w-full text-left px-3 py-1.5 text-[10px] text-zinc-400 hover:bg-white/5 transition-colors">Next Week</button>
                                    <div className="h-px bg-zinc-900 my-1"></div>
                                    <button onClick={() => onTaskDelete(task.id)} className="w-full text-left px-3 py-1.5 text-[10px] text-red-900/60 hover:text-red-500 hover:bg-red-500/5 transition-colors">Delete Directive</button>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          <button
                            onClick={() => {
                              const dummyTime = new Date(selectedDate);
                              const p = prayerTimes.find(p => p.name === block.name);
                              if (p) {
                                const [h, mAmPm] = p.time.split(':');
                                const [m, ampm] = mAmPm.split(' ');
                                let hours = parseInt(h);
                                if (ampm.toLowerCase() === 'pm' && hours !== 12) hours += 12;
                                if (ampm.toLowerCase() === 'am' && hours === 12) hours = 0;
                                dummyTime.setHours(hours, parseInt(m), 0, 0);
                              }
                              onTaskAdd('New directive...', Category.CORE, 'MED', { scheduledTime: dummyTime.getTime() });
                            }}
                            className="w-full py-3 flex items-center justify-center gap-2 text-[9px] text-zinc-800 hover:text-zinc-600 transition-colors border border-dashed border-transparent hover:border-zinc-900 rounded-lg group/add"
                          >
                            <Plus size={10} className="group-hover/add:scale-110 transition-transform" />
                            <span className="uppercase tracking-[0.2em] font-black">Align directive to {block.name}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* RIGHT SIDEBAR: RITUALS & STATS */}
            <aside className="w-[300px] border-l border-zinc-900 flex flex-col p-8 space-y-12 bg-black/20 shrink-0">

              <div className="space-y-4">
                <h2 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Niyyah</h2>
                <div className="bg-zinc-900/30 border border-zinc-800/50 p-4 rounded-xl">
                  <input
                    placeholder="Today's primary intent..."
                    className="w-full bg-transparent text-[11px] text-zinc-300 outline-none placeholder:text-zinc-800 font-mono tracking-tight"
                  />
                </div>
              </div>

              <div className="space-y-4 flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Rituals</h2>
                  <Target size={12} className="text-zinc-800" />
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                  {[
                    { id: 'fajr', l: 'Fajr' },
                    { id: 'dhuhr', l: 'Dhuhr' },
                    { id: 'asr', l: 'Asr' },
                    { id: 'maghrib', l: 'Maghrib' },
                    { id: 'isha', l: 'Isha' },
                    { id: 'adhkar_m', l: 'Morning Athkar' },
                    { id: 'adhkar_e', l: 'Evening Athkar' },
                    { id: 'quran', l: 'Quran' },
                    { id: 'workout', l: 'Training' },
                    { id: 'journal', l: 'Reflection' },
                  ].map(ceremony => {
                    const isPrayer = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].includes(ceremony.id);
                    const key = `${dateKey}-${ceremony.id}`;
                    const done = isPrayer ? state.prayerLog[key] : state.adhkarLog[key];

                    return (
                      <div key={ceremony.id} className="flex items-center justify-between group cursor-pointer" onClick={() => isPrayer ? onPrayerToggle(key) : onAdhkarToggle(key)}>
                        <span className={`text-[11px] uppercase transition-colors ${done ? 'text-zinc-500 font-black' : 'text-zinc-700 font-bold group-hover:text-zinc-400'}`}>{ceremony.l}</span>
                        <div className={`w-2 h-2 rounded transition-all ${done ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.4)]' : 'bg-zinc-900'}`} />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-8 border-t border-zinc-900 space-y-8">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase">
                    <span className="text-zinc-600 tracking-widest">Day Capacity</span>
                    <span className="text-zinc-400 tabular-nums">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-1000 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="p-5 bg-zinc-950/50 border border-zinc-900 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-[9px] font-black text-zinc-700 uppercase">
                    <Layout size={10} /> Status
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                    {activeTaskId ? "Active directive currently being processed in current block." : "System idle. Align new directives to Architecture to begin."}
                  </p>
                </div>
              </div>
            </aside>
          </>
        )}
      </main>
    </div>
  );
};

export default DayView;
