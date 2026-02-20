import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppState, Task, TaskStatus, Category, Severity, PrayerName, DayMeta, ProtocolContext, WeeklyActivities, DayViewLayout, TimeBlock } from '../types';
import { getPrayerTimesForDate, formatTimeAMPM } from '../utils/prayerTimes';
import {
  Plus, Check, X, Circle, CheckCircle2, Clock, ChevronLeft, ChevronRight,
  Sunrise, Sun, CloudSun, Sunset, Moon, Play, Pause, MoreHorizontal,
  Edit2, Calendar as CalendarIcon, Zap, ChevronDown, ChevronUp, Layers, History, Search, AlertCircle,
  BarChart3, Target, Send, Layout, ListTodo, Quote, BookOpen, Dumbbell, Utensils,
  Coffee, Feather, BrainCircuit, MoonStar, Archive, LayoutGrid, Columns, Kanban, Settings
} from 'lucide-react';
import { getQuoteForDate } from '../utils/quotes';
import ProtocolsSidebar from './ProtocolsSidebar';
import ProtocolsEditor from './ProtocolsEditor';
import WeeklyActivitiesEditor from './WeeklyActivitiesEditor';
import { DayLayoutTimeline, DayLayoutPeriods, DayLayoutKanban } from './DayLayouts';
import { generateId } from '../utils';
import { DEFAULT_TIME_ZONE, dateFromDateKey, getDateKeyInTimeZone } from '../utils/dateTime';

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
  // Protocol & Weekly Activities
  onProtocolToggle?: (dateKey: string, itemId: string) => void;
  onWeeklyActivityToggle?: (dateKey: string, activityId: string) => void;
  onProtocolContextsUpdate?: (contexts: ProtocolContext[]) => void;
  onWeeklyActivitiesUpdate?: (activities: WeeklyActivities) => void;
  // Layout & TimeBlocks
  onLayoutChange?: (layout: DayViewLayout) => void;
  onTimeBlockAdd?: (dateKey: string, block: TimeBlock) => void;
  onTimeBlockUpdate?: (dateKey: string, blockId: string, updates: Partial<TimeBlock>) => void;
  onTimeBlockDelete?: (dateKey: string, blockId: string) => void;
}

const PRAYER_BLOCKS: { name: PrayerName; arabic: string; icon: any }[] = [
  { name: 'Fajr', arabic: 'الفجر', icon: Sunrise },
  { name: 'Dhuhr', arabic: 'الظهر', icon: Sun },
  { name: 'Asr', arabic: 'العصر', icon: CloudSun },
  { name: 'Maghrib', arabic: 'المغرب', icon: Sunset },
  { name: 'Isha', arabic: 'العشاء', icon: Moon }
];

const RITUAL_ITEMS = ['Azkar', 'Supplements', 'Workout', 'Quran'];

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
  onTaskSelect,
  onProtocolToggle,
  onWeeklyActivityToggle,
  onProtocolContextsUpdate,
  onWeeklyActivitiesUpdate,
  onLayoutChange,
  onTimeBlockAdd,
  onTimeBlockUpdate,
  onTimeBlockDelete,
}) => {
  const timeZone = state.userPreferences?.timeZone || DEFAULT_TIME_ZONE;
  const [selectedDate, setSelectedDate] = useState(() =>
    dateFromDateKey(getDateKeyInTimeZone(new Date(), timeZone))
  );
  const [captureValue, setCaptureValue] = useState('');
  const [editingTaskMenu, setEditingTaskMenu] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null); // For inline title edit
  const [quickAddBlock, setQuickAddBlock] = useState<string | null>(null); // For inline add per block
  const [quickAddValue, setQuickAddValue] = useState('');
  const [showAllMissed, setShowAllMissed] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showHistoryPicker, setShowHistoryPicker] = useState(false);
  const [showProtocolsEditor, setShowProtocolsEditor] = useState(false);
  const [showWeeklyEditor, setShowWeeklyEditor] = useState(false);
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);

  useEffect(() => {
    setSelectedDate(prev => dateFromDateKey(getDateKeyInTimeZone(prev, timeZone)));
  }, [timeZone]);

  // Get current layout from preferences
  const currentLayout: DayViewLayout = state.userPreferences?.planner?.dayViewLayout || 'timeline';

  // TimeBlocks for current day
  const dateKey = getDateKeyInTimeZone(selectedDate, timeZone);
  const dayTimeBlocks = state.timeBlocks?.[dateKey] || [];

  // Layout handlers
  const handleLayoutChange = (layout: DayViewLayout) => {
    onLayoutChange?.(layout);
    setShowLayoutPicker(false);
  };

  const handleTimeBlockAdd = (block: TimeBlock) => {
    onTimeBlockAdd?.(dateKey, block);
  };

  const handleTimeBlockUpdate = (blockId: string, updates: Partial<TimeBlock>) => {
    onTimeBlockUpdate?.(dateKey, blockId, updates);
  };

  const handleTimeBlockDelete = (blockId: string) => {
    onTimeBlockDelete?.(dateKey, blockId);
  };
  const todayDate = getDateKeyInTimeZone(new Date(), timeZone);
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
    }).sort((a, b) => {
      if (a.scheduledTime !== b.scheduledTime) {
        return (a.scheduledTime || 0) - (b.scheduledTime || 0);
      }
      return a.createdAt - b.createdAt;
    });
  }, [state.tasks, selectedDate]);

  const missedTasks = useMemo(() => {
    return state.tasks.filter(task => {
      if (task.scheduledTime && task.status !== TaskStatus.DONE) {
        const d = new Date(task.scheduledTime);
        const dKey = getDateKeyInTimeZone(d, timeZone);
        return dKey < todayDate;
      }
      return false;
    }).sort((a, b) => (b.scheduledTime || 0) - (a.scheduledTime || 0));
  }, [state.tasks, todayDate, timeZone]);

  const inboxTasks = daysTasks.filter(t => {
    // Unscheduled or scheduled at exactly 12:00 PM (default "inbox" time)
    if (!t.scheduledTime) return true;
    const d = new Date(t.scheduledTime);
    return d.getHours() === 12 && d.getMinutes() === 0;
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
    const dKey = getDateKeyInTimeZone(d, timeZone);
    const todayRef = dateFromDateKey(todayDate);
    const dateRef = dateFromDateKey(dKey);
    const diff = Math.floor((todayRef.getTime() - dateRef.getTime()) / (1000 * 60 * 60 * 24));
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
        <div className="flex items-center gap-6 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDate(prev => {
                const next = new Date(prev);
                next.setUTCDate(next.getUTCDate() - 1);
                return next;
              })}
              className="p-1 hover:text-white text-zinc-700 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="flex flex-col items-center min-w-[120px]">
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">{selectedDate.toLocaleDateString(undefined, { weekday: 'short' })}</span>
              <button onClick={() => setSelectedDate(dateFromDateKey(getDateKeyInTimeZone(new Date(), timeZone)))} className="text-[10px] text-zinc-400 hover:text-white transition-colors">
                {selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </button>
            </div>
            <button
              onClick={() => setSelectedDate(prev => {
                const next = new Date(prev);
                next.setUTCDate(next.getUTCDate() + 1);
                return next;
              })}
              className="p-1 hover:text-white text-zinc-700 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="h-6 w-px bg-zinc-900"></div>

          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">{hijriDate}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Layout Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowLayoutPicker(!showLayoutPicker)}
              className="flex items-center gap-2 px-2 py-1 rounded border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-all"
              title="Change layout"
            >
              {currentLayout === 'timeline' && <LayoutGrid size={14} />}
              {currentLayout === 'periods' && <Columns size={14} />}
              {currentLayout === 'kanban' && <Kanban size={14} />}
              <ChevronDown size={10} />
            </button>

            {showLayoutPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLayoutPicker(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl p-1 min-w-[160px]">
                  <button
                    onClick={() => handleLayoutChange('timeline')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded text-left text-[11px] transition-colors ${currentLayout === 'timeline' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
                  >
                    <LayoutGrid size={14} />
                    <div>
                      <div className="font-medium">Timeline</div>
                      <div className="text-[10px] text-zinc-400">Horizontal scrollable</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleLayoutChange('periods')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded text-left text-[11px] transition-colors ${currentLayout === 'periods' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
                  >
                    <Columns size={14} />
                    <div>
                      <div className="font-medium">Periods</div>
                      <div className="text-[10px] text-zinc-400">Morning / Afternoon / Evening</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleLayoutChange('kanban')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded text-left text-[11px] transition-colors ${currentLayout === 'kanban' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
                  >
                    <Kanban size={14} />
                    <div>
                      <div className="font-medium">Kanban</div>
                      <div className="text-[10px] text-zinc-400">Inbox → Scheduled → Done</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="w-px h-5 bg-zinc-800" />

          {/* Focus Mode Button */}
          <button
            onClick={() => {
              if (!isFocusMode && pendingTasks.length > 0 && !activeTask) {
                onStartSession(pendingTasks[0].id);
              }
              setIsFocusMode(!isFocusMode);
            }}
            className={`flex items-center gap-2 px-3 py-1 rounded border transition-all text-[10px] font-bold uppercase tracking-wider ${isFocusMode ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'}`}
          >
            {isFocusMode ? <Zap size={10} fill="currentColor" /> : <Layers size={10} />}
            {isFocusMode ? 'Focus On' : pendingTasks.length > 0 ? `Focus (${pendingTasks.length})` : 'Enter Focus'}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex min-h-0 overflow-hidden">

        {isFocusMode ? (
          <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
            {activeTask ? (
              <div className="max-w-xl w-full space-y-12 text-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-[0.3em]">
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
            {/* MAIN CONTENT AREA - Layout Based */}
            <section className="flex-1 flex flex-col min-w-0 min-h-0 bg-black/40 relative overflow-hidden">
              {currentLayout === 'timeline' && (
                <DayLayoutTimeline
                  dateKey={dateKey}
                  inboxTasks={inboxTasks}
                  scheduledTasks={scheduledTasks}
                  completedTasks={completedTasks}
                  activeTaskId={activeTaskId}
                  prayerTimes={prayerTimes}
                  timeBlocks={dayTimeBlocks}
                  onTaskUpdate={onTaskUpdate}
                  onTaskAdd={onTaskAdd}
                  onTaskDelete={onTaskDelete}
                  onStartSession={onStartSession}
                  onTaskSelect={onTaskSelect}
                  onTimeBlockAdd={handleTimeBlockAdd}
                  onTimeBlockUpdate={handleTimeBlockUpdate}
                  onTimeBlockDelete={handleTimeBlockDelete}
                />
              )}

              {currentLayout === 'periods' && (
                <DayLayoutPeriods
                  dateKey={dateKey}
                  inboxTasks={inboxTasks}
                  scheduledTasks={scheduledTasks}
                  completedTasks={completedTasks}
                  activeTaskId={activeTaskId}
                  prayerTimes={prayerTimes}
                  timeBlocks={dayTimeBlocks}
                  onTaskUpdate={onTaskUpdate}
                  onTaskAdd={onTaskAdd}
                  onTaskDelete={onTaskDelete}
                  onStartSession={onStartSession}
                  onTaskSelect={onTaskSelect}
                  onTimeBlockAdd={handleTimeBlockAdd}
                  onTimeBlockUpdate={handleTimeBlockUpdate}
                  onTimeBlockDelete={handleTimeBlockDelete}
                />
              )}

              {currentLayout === 'kanban' && (
                <DayLayoutKanban
                  dateKey={dateKey}
                  inboxTasks={inboxTasks}
                  scheduledTasks={scheduledTasks}
                  completedTasks={completedTasks}
                  activeTaskId={activeTaskId}
                  prayerTimes={prayerTimes}
                  timeBlocks={dayTimeBlocks}
                  onTaskUpdate={onTaskUpdate}
                  onTaskAdd={onTaskAdd}
                  onTaskDelete={onTaskDelete}
                  onStartSession={onStartSession}
                  onTaskSelect={onTaskSelect}
                  onTimeBlockAdd={handleTimeBlockAdd}
                  onTimeBlockUpdate={handleTimeBlockUpdate}
                  onTimeBlockDelete={handleTimeBlockDelete}
                />
              )}
            </section>

            {/* RIGHT SIDEBAR: PROTOCOLS & WEEKLY ACTIVITIES */}
            <aside className="w-[280px] border-l border-zinc-900 flex flex-col bg-black/20 shrink-0 overflow-hidden">
              {/* Niyyah / Focus Input */}
              <div className="p-5 border-b border-zinc-900 space-y-6">
                {/* Niyyah / Focus Input */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Today's Intent</span>
                  <div className="bg-zinc-900/30 border border-zinc-800/50 p-3 rounded-lg flex items-center gap-3 transition-all focus-within:border-emerald-500/30 focus-within:shadow-[0_0_15px_rgba(16,185,129,0.05)] focus-within:bg-emerald-950/5 group/niyyah">
                    <Zap size={12} className="text-zinc-700 group-focus-within/niyyah:text-emerald-500 transition-colors" />
                    <input
                      value={state.dayMeta[dateKey]?.focus || ''}
                      onChange={(e) => onDayMetaUpdate(dateKey, { focus: e.target.value })}
                      placeholder="Defining the focus..."
                      className="w-full bg-transparent text-xs text-zinc-300 outline-none placeholder:text-zinc-800 font-mono tracking-tight"
                    />
                  </div>
                </div>

                {/* Rituals Checklist */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <Target size={10} className="text-zinc-600" />
                      <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Daily Rituals</span>
                    </div>
                    <button
                      onClick={() => onDayMetaUpdate(dateKey, { rituals: {} })}
                      className="text-[10px] font-bold text-zinc-600 hover:text-red-500/60 transition-colors tracking-tighter"
                    >
                      RESET
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {RITUAL_ITEMS.map(item => {
                      const isChecked = !!state.dayMeta[dateKey]?.rituals?.[item];
                      return (
                        <button
                          key={item}
                          onClick={() => {
                            const current = state.dayMeta[dateKey]?.rituals || {};
                            onDayMetaUpdate(dateKey, { rituals: { ...current, [item]: !isChecked } });
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-all duration-300 group/ritual ${isChecked
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                            : 'bg-zinc-900/20 border-zinc-800/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/30'
                            }`}
                        >
                          <div className={`w-3 h-3 rounded-sm border flex items-center justify-center transition-all ${isChecked
                            ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                            : 'border-zinc-700 group-hover/ritual:border-zinc-500'
                            }`}>
                            {isChecked && <Check size={10} className="text-black" strokeWidth={4} />}
                          </div>
                          <span className="text-[10px] font-bold tracking-tight">{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Inbox / Unscheduled Tasks */}
                {inboxTasks.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <Archive size={10} className="text-zinc-600" />
                        <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Inbox</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">{inboxTasks.length}</span>
                    </div>
                    <div className="space-y-1">
                      {inboxTasks.map(task => (
                        <div
                          key={task.id}
                          onClick={() => onTaskSelect(task)}
                          className="group/inbox-item flex items-center gap-2 p-2 rounded bg-zinc-900/40 border border-zinc-800/50 hover:border-emerald-500/30 hover:bg-emerald-950/5 transition-all cursor-pointer"
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${task.status === TaskStatus.DONE ? 'bg-zinc-700' : 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]'
                            }`} />
                          <span className={`text-[10px] flex-1 truncate ${task.status === TaskStatus.DONE ? 'text-zinc-600 line-through' : 'text-zinc-300'
                            }`}>
                            {task.title}
                          </span>
                          <ChevronRight size={10} className="text-zinc-800 group-hover/inbox-item:text-zinc-500 transition-colors" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Protocols Sidebar */}
              <div className="flex-1 overflow-y-auto">
                {onProtocolToggle && onWeeklyActivityToggle && onProtocolContextsUpdate && onWeeklyActivitiesUpdate ? (
                  <ProtocolsSidebar
                    protocolContexts={state.protocolContexts || []}
                    weeklyActivities={state.weeklyActivities || {}}
                    dailyProtocolState={state.dailyProtocolState || {}}
                    dateKey={dateKey}
                    onProtocolToggle={onProtocolToggle}
                    onWeeklyActivityToggle={onWeeklyActivityToggle}
                    onOpenProtocolsEditor={() => setShowProtocolsEditor(true)}
                    onOpenWeeklyEditor={() => setShowWeeklyEditor(true)}
                  />
                ) : (
                  <div className="p-4 text-center text-[10px] text-zinc-600">
                    Protocols not configured
                  </div>
                )}
              </div>

              {/* Day Stats Footer - Context Aware */}
              <div className="p-4 border-t border-zinc-900 space-y-3">
                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                    <span className="text-zinc-600 tracking-widest">Progress</span>
                    <span className="text-zinc-400 tabular-nums">{completedTasks.length}/{daysTasks.length}</span>
                  </div>
                  <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500/70 transition-all duration-1000 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Context Info */}
                <div className="space-y-2 text-[10px]">
                  {/* Active task or next up */}
                  {activeTask ? (
                    <div className="flex items-center gap-2 p-2 bg-emerald-950/20 border border-emerald-900/30 rounded">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-emerald-400 truncate flex-1">Active: {activeTask.title}</span>
                    </div>
                  ) : pendingTasks.length > 0 ? (
                    <div className="flex items-center gap-2 p-2 bg-zinc-900/30 rounded">
                      <Clock size={10} className="text-zinc-600" />
                      <span className="text-zinc-500 truncate flex-1">Next: {pendingTasks[0].title}</span>
                    </div>
                  ) : daysTasks.length === 0 ? (
                    <div className="text-center text-zinc-700 py-2 italic">No tasks scheduled</div>
                  ) : (
                    <div className="text-center text-emerald-500/60 py-2">All tasks complete ✓</div>
                  )}

                  {/* Missed tasks warning */}
                  {isToday && missedTasks.length > 0 && (
                    <div className="flex items-center gap-2 text-amber-500/70">
                      <AlertCircle size={10} />
                      <span>{missedTasks.length} overdue task{missedTasks.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>

                {/* Quote */}
                <div className="pt-2 border-t border-zinc-900/50">
                  <p className="text-[10px] text-zinc-500 font-serif italic leading-relaxed line-clamp-2">
                    "{getQuoteForDate(selectedDate)}"
                  </p>
                </div>
              </div>
            </aside>

            {/* Protocols Editor Modal */}
            {showProtocolsEditor && onProtocolContextsUpdate && (
              <ProtocolsEditor
                protocolContexts={state.protocolContexts || []}
                onUpdate={onProtocolContextsUpdate}
                onClose={() => setShowProtocolsEditor(false)}
              />
            )}

            {/* Weekly Activities Editor Modal */}
            {showWeeklyEditor && onWeeklyActivitiesUpdate && (
              <WeeklyActivitiesEditor
                weeklyActivities={state.weeklyActivities || {}}
                onUpdate={onWeeklyActivitiesUpdate}
                onClose={() => setShowWeeklyEditor(false)}
              />
            )}
          </>
        )}
      </main>
    </div >
  );
};

export default DayView;
