import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppState, Task, TaskStatus, Category, Severity, PrayerName, DayMeta } from '../types';
import { getPrayerTimesForDate, formatTimeAMPM } from '../utils/prayerTimes';
import {
  Plus, Check, X, Circle, CheckCircle2, Clock, ChevronLeft, ChevronRight,
  Sunrise, Sun, CloudSun, Sunset, Moon, Play, Pause, MoreHorizontal,
  Edit2, Calendar as CalendarIcon, Zap, ChevronDown, ChevronUp, Layers, History, Search, AlertCircle,
  BarChart3, Target, Send, Layout, ListTodo, Quote, BookOpen, Dumbbell, Utensils,
  Coffee, Feather, BrainCircuit, MoonStar
} from 'lucide-react';
import { getQuoteForDate } from '../utils/quotes';

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
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null); // For inline title edit
  const [quickAddBlock, setQuickAddBlock] = useState<string | null>(null); // For inline add per block
  const [quickAddValue, setQuickAddValue] = useState('');
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
    // Option A: Single line capture adds to today's inbox
    onTaskAdd(captureValue.trim(), Category.CORE, 'MED', { scheduledTime: scheduleDate.getTime() });
    setCaptureValue('');
  };

  const handleQuickAdd = (blockName: string, timeStr: string) => {
    if (!quickAddValue.trim()) return;

    // Parse the block time
    const dummyTime = new Date(selectedDate);
    const [h, mAmPm] = timeStr.split(':');
    const [m, ampm] = mAmPm.split(' ');
    let hours = parseInt(h);
    if (ampm.toLowerCase() === 'pm' && hours !== 12) hours += 12;
    if (ampm.toLowerCase() === 'am' && hours === 12) hours = 0;
    dummyTime.setHours(hours, parseInt(m), 0, 0);

    onTaskAdd(quickAddValue.trim(), Category.CORE, 'MED', { scheduledTime: dummyTime.getTime() });
    setQuickAddValue('');
    setQuickAddBlock(null); // Close input
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

  // --- NEW: Timeline Logic ---
  const timelineItems = useMemo(() => {
    // 1. Get Scheduled Tasks (exclude Inbox default 12PM if strictly inbox, but here we want chronological flow)
    // Actually, distinct "Inbox" tasks (12:00 PM exactly) are separate. 
    // Real scheduled tasks (e.g. 10AM, 2PM) go to timeline.
    const timelineTasks = scheduledTasks.map(t => ({ type: 'task', data: t, time: t.scheduledTime || 0 }));

    // 2. Get Prayers
    const prayers = prayerTimes.map(p => {
      const dummyTime = new Date(selectedDate);
      const [h, mAmPm] = p.time.split(':');
      const [m, ampm] = mAmPm.split(' ');
      let hours = parseInt(h);
      if (ampm.toLowerCase() === 'pm' && hours !== 12) hours += 12;
      if (ampm.toLowerCase() === 'am' && hours === 12) hours = 0;
      dummyTime.setHours(hours, parseInt(m), 0, 0);
      return { type: 'prayer', data: p, time: dummyTime.getTime() };
    });

    // 3. Merge & Sort
    return [...timelineTasks, ...prayers].sort((a, b) => a.time - b.time);
  }, [scheduledTasks, prayerTimes, selectedDate]);

  const getTimelinePosition = (time: number) => {
    // Map time (05:00 to 22:00 mostly) to percentage 0-100
    // Let's say window is 5AM to 11PM (18 hours)
    const d = new Date(time);
    const totalMinutes = d.getHours() * 60 + d.getMinutes();
    const startMinutes = 5 * 60; // 5 AM
    const endMinutes = 23 * 60; // 11 PM
    const duration = endMinutes - startMinutes;

    let percent = ((totalMinutes - startMinutes) / duration) * 100;
    if (percent < 0) percent = 0;
    if (percent > 100) percent = 100;
    return percent;
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
                  <input
                    type="text"
                    value={captureValue}
                    onChange={e => setCaptureValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCapture(); }}
                    placeholder="Capture task..."
                    className="w-full bg-zinc-900/20 border border-zinc-800/50 rounded-lg px-4 py-3 text-xs text-zinc-300 placeholder:text-zinc-800 focus:border-zinc-700 outline-none transition-all font-mono"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={handleCapture} className="p-1 text-zinc-600 hover:text-emerald-500"><Send size={12} /></button>
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

            {/* CENTER PANE: DAY INBOX */}
            <section className="flex-1 flex flex-col min-w-0 bg-black/40 relative">
              <div className="h-14 border-b border-zinc-900/50 flex items-center justify-between px-8 bg-zinc-950/20">
                <h2 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.4em]">Day Inbox</h2>
                <div className="flex items-center gap-4 text-[9px] text-zinc-700 uppercase font-black">
                  <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500/40"></div> CORE</div>
                  <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-orange-500/40"></div> GROWTH</div>
                  <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40"></div> SERVICE</div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-0 pb-32">
                <div className="max-w-3xl mx-auto flex flex-col min-h-full">

                  {/* UNSTRUCTURED INBOX */}
                  {inboxTasks.length > 0 && (
                    <div className="p-8 border-b border-zinc-900/30 bg-zinc-900/5">
                      <div className="flex items-center gap-2 mb-4 opacity-50">
                        <ListTodo size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Unscheduled</span>
                      </div>
                      <div className="space-y-2">
                        {inboxTasks.map(task => (
                          <div key={task.id} className="group relative p-3 bg-zinc-900/40 border border-zinc-800/30 rounded hover:border-zinc-700 hover:bg-zinc-900/60 transition-all">
                            <div className="flex items-start gap-3">
                              <button onClick={() => handleToggleComplete(task)} className="mt-0.5 shrink-0">
                                {task.status === TaskStatus.DONE ? <CheckCircle2 size={13} className="text-zinc-600" /> : <Circle size={13} className="text-zinc-700 group-hover:text-zinc-500" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3">
                                  <span className={`text-sm ${task.status === TaskStatus.DONE ? 'text-zinc-700 line-through' : 'text-zinc-300 group-hover:text-zinc-100'}`}>{task.title}</span>
                                  {task.impact === 'HIGH' && <Zap size={10} className="text-amber-500/50" fill="currentColor" />}
                                </div>
                              </div>
                              <button onClick={() => onTaskSelect(task)} className="opacity-0 group-hover:opacity-100 p-1 text-zinc-700 hover:text-white transition-opacity"><Edit2 size={10} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CHRONOLOGICAL TIMELINE LIST */}
                  <div className="flex-1 p-8 space-y-4">
                    {timelineItems.map((item, idx) => {
                      if (item.type === 'prayer') {
                        const p = item.data as any; // PrayerTime logic
                        return (
                          <div key={p.name} className="flex items-center gap-4 py-2 opacity-60 hover:opacity-100 transition-opacity select-none group">
                            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest w-16 text-right">{p.time.replace(/ (am|pm)/i, '')}</span>
                            <div className="h-px bg-zinc-800/50 flex-1 group-hover:bg-zinc-700 transition-colors"></div>
                            <div className="flex items-center gap-2 text-zinc-500">
                              {p.icon && <p.icon size={12} />}
                              <span className="text-[10px] font-bold uppercase tracking-widest">{p.name}</span>
                            </div>
                            <div className="h-px bg-zinc-800/50 flex-1 group-hover:bg-zinc-700 transition-colors"></div>
                          </div>
                        );
                      } else {
                        const task = item.data as Task;
                        const isTaskActive = task.id === activeTaskId;
                        return (
                          <div key={task.id} className="flex gap-4 group">
                            <div className="w-16 pt-3 text-right">
                              <span className="text-[10px] font-bold text-zinc-600 group-hover:text-zinc-400 transition-colors">{formatTime(task.scheduledTime!)}</span>
                            </div>
                            <div className={`flex-1 relative flex items-center gap-4 p-3 rounded border transition-all ${isTaskActive ? 'bg-zinc-900 border-zinc-700 shadow-[0_4px_20px_rgba(0,0,0,0.5)]' : 'bg-transparent border-zinc-800/30 hover:bg-zinc-900/30 hover:border-zinc-700'}`}>
                              <button onClick={() => handleToggleComplete(task)} className="shrink-0">
                                {task.status === TaskStatus.DONE ? <CheckCircle2 size={15} className="text-zinc-600" /> : <Circle size={15} className="text-zinc-800 group-hover:text-zinc-600" />}
                              </button>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3">
                                  <span className={`text-sm ${task.status === TaskStatus.DONE ? 'text-zinc-700 line-through' : 'text-zinc-300'}`}>{task.title}</span>
                                  {task.impact === 'HIGH' && <Zap size={10} className="text-white/20" fill="currentColor" />}
                                </div>
                              </div>

                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
                                <button onClick={() => onTaskSelect(task)} className="p-1.5 text-zinc-700 hover:text-white transition-colors" title="Edit"><Edit2 size={12} /></button>
                                {!isTaskActive && task.status !== TaskStatus.DONE && (
                                  <button onClick={() => onStartSession(task.id)} className="p-1.5 text-zinc-700 hover:text-white transition-colors" title="Start"><Play size={12} /></button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })}

                    {/* EMPTY STATE */}
                    {timelineItems.length === 0 && inboxTasks.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-800 space-y-4 py-20">
                        <Layout size={48} className="opacity-20" />
                        <p className="text-xs uppercase tracking-widest font-bold">The day is open</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* COMPACT TIMELINE WIDGET */}
              <div className="absolute bottom-0 left-0 right-0 h-16 border-t border-zinc-900 bg-black/80 backdrop-blur-xl px-12 flex items-center z-50">
                <div className="w-full relative h-8 flex items-center">
                  {/* Base Line */}
                  <div className="absolute left-0 right-0 top-1/2 h-px bg-zinc-800"></div>

                  {/* Hour Markers (Minimal) */}
                  {[6, 9, 12, 15, 18, 21].map(h => (
                    <div key={h} className="absolute top-1/2 -mt-1 h-2 w-px bg-zinc-800" style={{ left: `${getTimelinePosition(new Date().setHours(h, 0, 0, 0))}%` }}></div>
                  ))}

                  {/* Prayer Markers */}
                  {prayerTimes.map(p => {
                    // Calculate percent
                    const dummyTime = new Date(selectedDate);
                    const [h, mAmPm] = p.time.split(':');
                    const [m, ampm] = mAmPm.split(' ');
                    let hours = parseInt(h);
                    if (ampm.toLowerCase() === 'pm' && hours !== 12) hours += 12;
                    if (ampm.toLowerCase() === 'am' && hours === 12) hours = 0;
                    dummyTime.setHours(hours, parseInt(m), 0, 0);
                    const pct = getTimelinePosition(dummyTime.getTime());

                    return (
                      <div key={p.name} className="absolute top-1/2 -translate-y-1/2 -ml-2 group cursor-help z-10" style={{ left: `${pct}%` }}>
                        <div className="w-4 h-4 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-[8px] text-zinc-500 group-hover:text-white group-hover:border-zinc-600 transition-colors">
                          {p.name[0]}
                        </div>
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-zinc-900 text-[9px] px-1.5 py-0.5 rounded border border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                          {p.name} {p.time}
                        </div>
                      </div>
                    );
                  })}

                  {/* Task Dots */}
                  {scheduledTasks.map(t => {
                    const pct = getTimelinePosition(t.scheduledTime!);
                    return (
                      <div key={t.id} className="absolute top-1/2 -translate-y-1/2 -ml-1 w-2 h-2 rounded-full bg-zinc-700 hover:bg-white hover:scale-150 transition-all cursor-pointer z-0" style={{ left: `${pct}%` }} title={t.title}></div>
                    );
                  })}

                  {/* Current Time Indicator */}
                  {isToday && (
                    <div className="absolute top-0 bottom-0 w-px bg-red-500/50 z-0" style={{ left: `${getTimelinePosition(Date.now())}%` }}></div>
                  )}
                </div>
              </div>

            </section>

            {/* RIGHT SIDEBAR: RITUALS & STATS */}
            <aside className="w-[300px] border-l border-zinc-900 flex flex-col p-8 space-y-12 bg-black/20 shrink-0">

              <div className="space-y-4">
                <h2 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Niyyah</h2>
                <div className="bg-zinc-900/30 border border-zinc-800/50 p-4 rounded-xl flex items-center gap-3">
                  <Zap size={10} className="text-zinc-700" />
                  <input
                    value={state.dayMeta[dateKey]?.focus || ''}
                    onChange={(e) => onDayMetaUpdate(dateKey, { focus: e.target.value })}
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
                    {
                      title: 'Spiritual',
                      items: [
                        { id: 'fajr', l: 'Fajr', type: 'prayer', icon: Sunrise },
                        { id: 'dhuhr', l: 'Dhuhr', type: 'prayer', icon: Sun },
                        { id: 'asr', l: 'Asr', type: 'prayer', icon: CloudSun },
                        { id: 'maghrib', l: 'Maghrib', type: 'prayer', icon: Sunset },
                        { id: 'isha', l: 'Isha', type: 'prayer', icon: Moon },
                        { id: 'adhkar_m', l: 'Morning Athkar', type: 'adhkar', icon: Coffee },
                        { id: 'adhkar_e', l: 'Evening Athkar', type: 'adhkar', icon: MoonStar },
                        { id: 'quran', l: 'Quran', type: 'habit', icon: BookOpen },
                      ]
                    },
                    {
                      title: 'Physical',
                      items: [
                        { id: 'workout', l: 'Training', type: 'habit', icon: Dumbbell },
                        { id: 'diet', l: 'Clean Eating', type: 'habit', icon: Utensils },
                      ]
                    },
                    {
                      title: 'Mind',
                      items: [
                        { id: 'journal', l: 'Journal', type: 'habit', icon: Feather },
                        { id: 'read', l: 'Reading', type: 'habit', icon: BrainCircuit },
                      ]
                    }
                  ].map(cat => (
                    <div key={cat.title} className="space-y-2">
                      <h3 className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">{cat.title}</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {cat.items.map(ceremony => {
                          const key = `${dateKey}-${ceremony.id}`;
                          let done = false;

                          if (ceremony.type === 'prayer') done = state.prayerLog[key];
                          else if (ceremony.type === 'adhkar') done = state.adhkarLog[key];
                          else done = state.dayMeta[dateKey]?.rituals?.[ceremony.id] || false;

                          const toggle = () => {
                            if (ceremony.type === 'prayer') onPrayerToggle(key);
                            else if (ceremony.type === 'adhkar') onAdhkarToggle(key);
                            else {
                              const currentRituals = state.dayMeta[dateKey]?.rituals || {};
                              onDayMetaUpdate(dateKey, { rituals: { ...currentRituals, [ceremony.id]: !done } });
                            }
                          };

                          const Icon = ceremony.icon;

                          return (
                            <button
                              key={ceremony.id}
                              onClick={toggle}
                              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-all duration-300 ${done ? 'bg-zinc-100 border-zinc-100 text-black shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-600 hover:bg-zinc-900 hover:border-zinc-700 hover:text-zinc-400'}`}
                            >
                              <Icon size={14} className={done ? 'text-black' : 'text-zinc-600'} />
                              <span className="text-[9px] font-bold uppercase tracking-wide">{ceremony.l}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
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

                <div className="pt-8 border-t border-zinc-900">
                  <div className="flex gap-3">
                    <Quote size={12} className="text-zinc-800 shrink-0" />
                    <p className="text-[10px] text-zinc-600 font-serif italic leading-relaxed">
                      "{getQuoteForDate(selectedDate)}"
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </>
        )}
      </main>
    </div >
  );
};

export default DayView;
