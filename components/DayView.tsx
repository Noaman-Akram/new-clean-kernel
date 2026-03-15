import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppState, Task, TaskStatus, Category, Severity, PrayerName, DayMeta, ProtocolContext, WeeklyActivities, DayViewLayout, TimeBlock } from '../types';
import { getPrayerTimesForDate } from '../utils/prayerTimes';
import {
  Plus, Check, X, ChevronLeft, ChevronRight,
  Sunrise, Sun, CloudSun, Sunset, Moon, Play, MoreHorizontal,
  Zap, Clock, Layers, BookOpen, Dumbbell,
  GripVertical, Trash2, ArrowRight,
  CheckCircle2, Circle, Feather, Heart, Star
} from 'lucide-react';
import { getPropheticQuoteForDate } from '../utils/quotes';
import ProtocolsSidebar from './ProtocolsSidebar';
import ProtocolsEditor from './ProtocolsEditor';
import WeeklyActivitiesEditor from './WeeklyActivitiesEditor';
import { generateId } from '../utils';
import { DEFAULT_TIME_ZONE, dateFromDateKey, getDateKeyInTimeZone, getLocalTimestampForDateKey, shiftDateKey } from '../utils/dateTime';

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
  onProtocolToggle?: (dateKey: string, itemId: string) => void;
  onWeeklyActivityToggle?: (dateKey: string, activityId: string) => void;
  onProtocolContextsUpdate?: (contexts: ProtocolContext[]) => void;
  onWeeklyActivitiesUpdate?: (activities: WeeklyActivities) => void;
  onLayoutChange?: (layout: DayViewLayout) => void;
  onTimeBlockAdd?: (dateKey: string, block: TimeBlock) => void;
  onTimeBlockUpdate?: (dateKey: string, blockId: string, updates: Partial<TimeBlock>) => void;
  onTimeBlockDelete?: (dateKey: string, blockId: string) => void;
}

const PRAYER_BLOCKS: { name: PrayerName; arabic: string; icon: any; color: string; bgColor: string }[] = [
  { name: 'Fajr', arabic: 'الفجر', icon: Sunrise, color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/20' },
  { name: 'Dhuhr', arabic: 'الظهر', icon: Sun, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/20' },
  { name: 'Asr', arabic: 'العصر', icon: CloudSun, color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20' },
  { name: 'Maghrib', arabic: 'المغرب', icon: Sunset, color: 'text-orange-500', bgColor: 'bg-orange-500/10 border-orange-500/20' },
  { name: 'Isha', arabic: 'العشاء', icon: Moon, color: 'text-indigo-400', bgColor: 'bg-indigo-500/10 border-indigo-500/20' }
];

const RITUAL_SECTIONS = [
  {
    label: 'PRAYERS',
    items: [
      { key: 'Fajr', label: 'Fajr Prayer', icon: Sunrise, color: 'text-orange-400' },
      { key: 'Dhuhr', label: 'Dhuhr Prayer', icon: Sun, color: 'text-yellow-400' },
      { key: 'Asr', label: 'Asr Prayer', icon: CloudSun, color: 'text-amber-400' },
      { key: 'Maghrib', label: 'Maghrib Prayer', icon: Sunset, color: 'text-orange-500' },
      { key: 'Isha', label: 'Isha Prayer', icon: Moon, color: 'text-indigo-400' },
    ]
  },
  {
    label: 'ATHKAR',
    items: [
      { key: 'MorningAthkar', label: 'Morning Athkar', icon: BookOpen, color: 'text-emerald-400' },
      { key: 'EveningAthkar', label: 'Evening Athkar', icon: BookOpen, color: 'text-emerald-400' },
    ]
  },
  {
    label: 'WELLNESS',
    items: [
      { key: 'Workout', label: 'Workout', icon: Dumbbell, color: 'text-blue-400' },
      { key: 'Quran', label: 'Quran Reading', icon: BookOpen, color: 'text-teal-400' },
    ]
  }
];

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
  const [addingToBlock, setAddingToBlock] = useState<string | null>(null);
  const [addValue, setAddValue] = useState('');
  const [addTime, setAddTime] = useState('');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showProtocolsEditor, setShowProtocolsEditor] = useState(false);
  const [showWeeklyEditor, setShowWeeklyEditor] = useState(false);
  const [showScheduler, setShowScheduler] = useState<string | null>(null);
  const [schedulerHour, setSchedulerHour] = useState('9');
  const [schedulerMinute, setSchedulerMinute] = useState('00');
  const mainScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedDate(prev => dateFromDateKey(getDateKeyInTimeZone(prev, timeZone)));
  }, [timeZone]);

  const dateKey = getDateKeyInTimeZone(selectedDate, timeZone);
  const todayDate = getDateKeyInTimeZone(new Date(), timeZone);
  const isToday = dateKey === todayDate;

  // Adjacent days for peek columns
  const prevDateKey = shiftDateKey(dateKey, -1);
  const nextDateKey = shiftDateKey(dateKey, 1);

  // Hijri Date
  const hijriDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(selectedDate);
    } catch (_e) { return ''; }
  }, [selectedDate]);

  // Prayer Times
  const prayerTimes = useMemo(() => getPrayerTimesForDate(selectedDate), [selectedDate]);

  // Current prayer detection
  const currentPrayerIndex = useMemo(() => {
    if (!isToday) return -1;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    let current = -1;
    for (let i = 0; i < prayerTimes.length; i++) {
      const pt = new Date(prayerTimes[i].timestamp);
      const ptMinutes = pt.getHours() * 60 + pt.getMinutes();
      if (nowMinutes >= ptMinutes) current = i;
    }
    return current;
  }, [prayerTimes, isToday]);

  // Next prayer countdown
  const nextPrayerInfo = useMemo(() => {
    if (!isToday) return null;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    for (let i = 0; i < prayerTimes.length; i++) {
      const pt = new Date(prayerTimes[i].timestamp);
      const ptMinutes = pt.getHours() * 60 + pt.getMinutes();
      if (ptMinutes > nowMinutes) {
        const diff = ptMinutes - nowMinutes;
        const hours = Math.floor(diff / 60);
        const minutes = diff % 60;
        return {
          name: prayerTimes[i].name,
          countdown: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
        };
      }
    }
    return null;
  }, [prayerTimes, isToday]);

  // Helper: get tasks for a dateKey
  const getTasksForDate = (dk: string) => {
    return state.tasks.filter(task => {
      if (task.scheduledTime) {
        const d = new Date(task.scheduledTime);
        const taskDk = getDateKeyInTimeZone(d, timeZone);
        return taskDk === dk;
      }
      return false;
    }).sort((a, b) => (a.scheduledTime || 0) - (b.scheduledTime || 0));
  };

  const daysTasks = useMemo(() => getTasksForDate(dateKey), [state.tasks, dateKey, timeZone]);
  const prevDayTasks = useMemo(() => getTasksForDate(prevDateKey), [state.tasks, prevDateKey, timeZone]);
  const nextDayTasks = useMemo(() => getTasksForDate(nextDateKey), [state.tasks, nextDateKey, timeZone]);

  const completedTasks = daysTasks.filter(t => t.status === TaskStatus.DONE);
  const pendingTasks = daysTasks.filter(t => t.status !== TaskStatus.DONE);
  const progress = daysTasks.length > 0 ? Math.round((completedTasks.length / daysTasks.length) * 100) : 0;

  // Group tasks by prayer blocks
  const getTasksForPrayerBlock = (prayerIndex: number, tasks: Task[], prayers: ReturnType<typeof getPrayerTimesForDate>) => {
    const prayer = prayers[prayerIndex];
    if (!prayer) return [];

    const prayerTime = new Date(prayer.timestamp);
    const prayerMinutes = prayerTime.getHours() * 60 + prayerTime.getMinutes();

    let nextPrayerMinutes = 24 * 60;
    if (prayerIndex < prayers.length - 1) {
      const nextPt = new Date(prayers[prayerIndex + 1].timestamp);
      nextPrayerMinutes = nextPt.getHours() * 60 + nextPt.getMinutes();
    }

    // For Fajr, also include tasks before Fajr
    const startMinutes = prayerIndex === 0 ? 0 : prayerMinutes;

    return tasks.filter(task => {
      if (!task.scheduledTime) return false;
      const t = new Date(task.scheduledTime);
      const taskMinutes = t.getHours() * 60 + t.getMinutes();
      return taskMinutes >= startMinutes && taskMinutes < nextPrayerMinutes;
    });
  };

  // Inbox tasks (noon default)
  const inboxTasks = daysTasks.filter(t => {
    if (!t.scheduledTime) return true;
    const d = new Date(t.scheduledTime);
    return d.getHours() === 12 && d.getMinutes() === 0;
  });

  const activeTask = daysTasks.find(t => t.id === activeTaskId);

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

  const handleAddToBlock = (prayerName: string) => {
    if (!addValue.trim()) return;
    const prayer = prayerTimes.find(p => p.name === prayerName);
    if (!prayer) return;
    const pt = new Date(prayer.timestamp);
    let hour = pt.getHours();
    let minute = pt.getMinutes() + 5;
    if (addTime) {
      const [h, m] = addTime.split(':').map(Number);
      if (!isNaN(h)) hour = h;
      if (!isNaN(m)) minute = m;
    }
    const schedTime = getLocalTimestampForDateKey(dateKey, hour, minute);
    onTaskAdd(addValue.trim(), Category.CORE, 'MED', { scheduledTime: schedTime });
    setAddValue('');
    setAddTime('');
    setAddingToBlock(null);
  };

  const handleScheduleTask = (taskId: string) => {
    const hour = parseInt(schedulerHour);
    const minute = parseInt(schedulerMinute);
    if (isNaN(hour)) return;
    const schedTime = getLocalTimestampForDateKey(dateKey, hour, minute || 0);
    onTaskUpdate(taskId, { scheduledTime: schedTime });
    setShowScheduler(null);
  };

  const handleReschedule = (task: Task, daysOffset: number) => {
    const targetDk = shiftDateKey(dateKey, daysOffset);
    const newDate = dateFromDateKey(targetDk);
    if (task.scheduledTime) {
      const oldTime = new Date(task.scheduledTime);
      newDate.setHours(oldTime.getHours(), oldTime.getMinutes());
    }
    onTaskUpdate(task.id, { scheduledTime: newDate.getTime() });
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  };

  // Prophetic quote for the day
  const propheticQuote = useMemo(() => getPropheticQuoteForDate(selectedDate), [selectedDate]);

  // Ritual state
  const rituals = state.dayMeta[dateKey]?.rituals || {};
  const totalRituals = RITUAL_SECTIONS.reduce((sum, s) => sum + s.items.length, 0);
  const completedRituals = RITUAL_SECTIONS.reduce((sum, s) => sum + s.items.filter(i => rituals[i.key]).length, 0);

  // ==================== TASK CARD COMPONENT ====================
  const TaskCard: React.FC<{ task: Task; compact?: boolean; ghost?: boolean }> = ({ task, compact, ghost }) => {
    const isActive = task.id === activeTaskId;
    const isDone = task.status === TaskStatus.DONE;

    return (
      <div
        onClick={() => !ghost && onTaskSelect(task)}
        className={`group/card relative flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all ${ghost
          ? 'opacity-30 border-zinc-800/30 bg-transparent cursor-default'
          : isDone
            ? 'bg-zinc-900/20 border-zinc-800/30 opacity-50'
            : isActive
              ? 'bg-emerald-950/30 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]'
              : 'bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-900/60 cursor-pointer'
          }`}
      >
        {/* Drag handle */}
        {!ghost && !compact && (
          <div className="mt-0.5 text-zinc-800 group-hover/card:text-zinc-600 transition-colors cursor-grab">
            <GripVertical size={12} />
          </div>
        )}

        {/* Checkbox */}
        {!ghost && (
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleComplete(task); }}
            className="mt-0.5 shrink-0"
          >
            {isDone ? (
              <div className="w-4 h-4 bg-emerald-500 rounded flex items-center justify-center">
                <Check size={10} className="text-black" strokeWidth={3} />
              </div>
            ) : (
              <div className={`w-4 h-4 rounded border-2 transition-colors ${isActive ? 'border-emerald-500/50' : 'border-zinc-700 group-hover/card:border-zinc-500'}`} />
            )}
          </button>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className={`text-[12px] leading-snug font-medium ${isDone ? 'text-zinc-600 line-through' : ghost ? 'text-zinc-700' : 'text-zinc-200'}`}>
            {task.title}
          </div>
          {!compact && task.scheduledTime && !ghost && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-zinc-500 font-mono">{formatTime(task.scheduledTime)}</span>
              {task.duration && <span className="text-[10px] text-zinc-600">{task.duration}m</span>}
              {task.category && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${task.category === Category.CORE ? 'bg-blue-500/10 text-blue-400' :
                  task.category === Category.GROWTH ? 'bg-orange-500/10 text-orange-400' :
                    'bg-emerald-500/10 text-emerald-400'
                  }`}>
                  {task.category}
                </span>
              )}
              {task.impact === 'HIGH' && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 uppercase">High</span>
              )}
            </div>
          )}
          {!compact && task.subtasks && task.subtasks.length > 0 && !ghost && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-zinc-500">
              <CheckCircle2 size={10} />
              <span>{task.subtasks.filter(s => s.done).length}/{task.subtasks.length}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {!ghost && !isDone && (
          <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onStartSession(task.id); }}
              className="p-1 text-zinc-600 hover:text-emerald-400 transition-colors"
              title="Start"
            >
              <Play size={11} fill="currentColor" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleReschedule(task, 1); }}
              className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
              title="Move to tomorrow"
            >
              <ArrowRight size={11} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onTaskDelete(task.id); }}
              className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
              title="Delete"
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}

        {/* Active indicator */}
        {isActive && !ghost && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500 rounded-full" />
        )}
      </div>
    );
  };

  // ==================== PRAYER BLOCK SECTION ====================
  const PrayerBlockSection: React.FC<{
    prayerIndex: number;
    tasks: Task[];
    prayers: ReturnType<typeof getPrayerTimesForDate>;
    ghost?: boolean;
  }> = ({ prayerIndex, tasks, prayers, ghost }) => {
    const prayer = PRAYER_BLOCKS[prayerIndex];
    const prayerTime = prayers[prayerIndex];
    const blockTasks = getTasksForPrayerBlock(prayerIndex, tasks, prayers);
    const isCurrent = currentPrayerIndex === prayerIndex && !ghost;
    const isPast = isToday && currentPrayerIndex > prayerIndex && !ghost;
    const Icon = prayer.icon;

    return (
      <div className={`relative transition-all ${isPast ? 'opacity-60' : ''}`}>
        {/* Prayer header */}
        <div className={`flex items-center gap-3 py-2 ${ghost ? 'px-2' : 'px-1'}`}>
          <div className={`flex items-center justify-center w-7 h-7 rounded-lg border ${isCurrent
            ? 'bg-emerald-500/20 border-emerald-500/40'
            : prayer.bgColor
            }`}>
            <Icon size={14} className={isCurrent ? 'text-emerald-400' : prayer.color} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${isCurrent ? 'text-emerald-400' : 'text-zinc-400'}`}>
                {prayer.name}
              </span>
              {!ghost && (
                <span className="text-[10px] text-zinc-600 font-mono">{prayerTime?.time}</span>
              )}
              {isCurrent && (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
              )}
            </div>
          </div>
          {!ghost && blockTasks.length > 0 && (
            <span className="text-[10px] text-zinc-600 font-mono">{blockTasks.filter(t => t.status === TaskStatus.DONE).length}/{blockTasks.length}</span>
          )}
        </div>

        {/* Tasks in this block */}
        <div className={`space-y-1 ${ghost ? 'pl-2' : 'pl-10'}`}>
          {blockTasks.map(task => (
            <TaskCard key={task.id} task={task} ghost={ghost} compact={ghost} />
          ))}

          {/* Add task button */}
          {!ghost && (
            addingToBlock === prayer.name ? (
              <div className="flex items-center gap-2 p-2 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
                <input
                  value={addValue}
                  onChange={(e) => setAddValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddToBlock(prayer.name);
                    if (e.key === 'Escape') { setAddingToBlock(null); setAddValue(''); }
                  }}
                  placeholder="Task title..."
                  className="flex-1 bg-transparent text-[11px] text-zinc-300 outline-none placeholder:text-zinc-700"
                  autoFocus
                />
                <button
                  onClick={() => handleAddToBlock(prayer.name)}
                  className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded hover:bg-emerald-500/30"
                >
                  ADD
                </button>
                <button
                  onClick={() => { setAddingToBlock(null); setAddValue(''); }}
                  className="text-zinc-600 hover:text-zinc-400"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingToBlock(prayer.name)}
                className="w-full py-1.5 text-[10px] text-zinc-700 hover:text-zinc-500 border border-dashed border-zinc-800/40 rounded-lg hover:border-zinc-700/50 transition-all flex items-center justify-center gap-1"
              >
                <Plus size={10} />
              </button>
            )
          )}
        </div>
      </div>
    );
  };

  // ==================== PEEK COLUMN (prev/next day) ====================
  const PeekColumn: React.FC<{ dk: string; tasks: Task[]; label: string; direction: 'prev' | 'next' }> = ({ dk, tasks, label, direction }) => {
    const peekDate = dateFromDateKey(dk);
    const peekPrayers = getPrayerTimesForDate(peekDate);

    return (
      <div
        className="flex flex-col h-full opacity-40 hover:opacity-60 transition-opacity cursor-pointer select-none"
        onClick={() => setSelectedDate(peekDate)}
      >
        {/* Peek header */}
        <div className="py-3 px-3 text-center border-b border-zinc-900/50">
          <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
            {peekDate.toLocaleDateString(undefined, { weekday: 'short' })}
          </div>
          <div className="text-[14px] text-zinc-500 font-bold tabular-nums">
            {peekDate.getUTCDate()}
          </div>
        </div>

        {/* Peek tasks by prayer */}
        <div className="flex-1 overflow-hidden p-2 space-y-3">
          {PRAYER_BLOCKS.map((_, i) => (
            <PrayerBlockSection key={i} prayerIndex={i} tasks={tasks} prayers={peekPrayers} ghost />
          ))}
        </div>
      </div>
    );
  };

  // ==================== FOCUS MODE ====================
  if (isFocusMode) {
    return (
      <div className="h-full flex flex-col bg-[#050505] text-zinc-400 font-mono overflow-hidden">
        <header className="h-12 border-b border-zinc-900 flex items-center justify-between px-6 bg-black/50 shrink-0">
          <button onClick={() => setIsFocusMode(false)} className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest">
            Exit Focus
          </button>
          <div className="flex items-center gap-2 text-white text-[10px] font-bold uppercase tracking-widest">
            <Zap size={10} fill="currentColor" />
            Focus Mode
          </div>
          <div className="w-16" />
        </header>
        <div className="flex-1 flex items-center justify-center">
          {activeTask ? (
            <div className="max-w-xl w-full space-y-10 text-center px-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-[0.3em]">
                  Executing
                </div>
                <h2 className="text-3xl font-medium text-white tracking-tight">{activeTask.title}</h2>
                {activeTask.notes && <p className="text-zinc-500 text-base leading-relaxed">{activeTask.notes}</p>}
              </div>
              {activeTask.subtasks && activeTask.subtasks.length > 0 && (
                <div className="bg-zinc-900/30 border border-zinc-800/50 p-6 rounded-xl text-left space-y-3">
                  {activeTask.subtasks.map(sub => (
                    <div key={sub.id} className="flex items-center gap-3 group">
                      <button
                        onClick={() => {
                          const newSubs = activeTask.subtasks?.map(s => s.id === sub.id ? { ...s, done: !s.done } : s);
                          onTaskUpdate(activeTask.id, { subtasks: newSubs });
                        }}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${sub.done ? 'bg-white border-white text-black' : 'border-zinc-700 group-hover:border-white/20'}`}
                      >
                        {sub.done && <Check size={10} />}
                      </button>
                      <span className={`text-sm ${sub.done ? 'text-zinc-700 line-through' : 'text-zinc-200'}`}>{sub.title}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-center gap-4">
                <button onClick={() => handleToggleComplete(activeTask)} className="px-8 py-3 bg-white text-black font-bold text-xs rounded hover:bg-zinc-200 uppercase tracking-widest">Complete</button>
                <button onClick={() => setIsFocusMode(false)} className="px-8 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold text-xs rounded hover:border-zinc-600 uppercase tracking-widest">Pause</button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4 opacity-40">
              <Zap size={32} className="text-zinc-700 mx-auto" />
              <h2 className="text-lg text-zinc-400">No active task</h2>
              <button onClick={() => setIsFocusMode(false)} className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 underline underline-offset-4 uppercase tracking-widest">
                Back to Day View
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#050505] text-zinc-400 font-mono selection:bg-zinc-800 selection:text-white overflow-hidden">

      {/* ==================== HEADER ==================== */}
      <header className="border-b border-zinc-900 bg-black/50 backdrop-blur-md z-40 shrink-0">
        <div className="h-12 flex items-center justify-between px-5">
          {/* Left: Date navigation */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedDate(prev => {
                  const next = new Date(prev);
                  next.setUTCDate(next.getUTCDate() - 1);
                  return next;
                })}
                className="p-1.5 hover:text-white text-zinc-600 transition-colors rounded hover:bg-zinc-800/50"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setSelectedDate(dateFromDateKey(getDateKeyInTimeZone(new Date(), timeZone)))}
                className="flex flex-col items-center min-w-[100px] hover:text-white transition-colors"
              >
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                  {selectedDate.toLocaleDateString(undefined, { weekday: 'long' })}
                </span>
                <span className="text-[13px] text-zinc-300 font-bold tabular-nums">
                  {selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </button>
              <button
                onClick={() => setSelectedDate(prev => {
                  const next = new Date(prev);
                  next.setUTCDate(next.getUTCDate() + 1);
                  return next;
                })}
                className="p-1.5 hover:text-white text-zinc-600 transition-colors rounded hover:bg-zinc-800/50"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {hijriDate && (
              <>
                <div className="h-4 w-px bg-zinc-800" />
                <span className="text-[10px] text-zinc-600 tracking-wide">{hijriDate}</span>
              </>
            )}

            {isToday && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-widest">
                Today
              </span>
            )}
          </div>

          {/* Right: Progress + Actions */}
          <div className="flex items-center gap-4">
            {/* Day progress */}
            {daysTasks.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500/70 transition-all duration-700 ease-out rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-500 font-mono tabular-nums">{completedTasks.length}/{daysTasks.length}</span>
              </div>
            )}

            <div className="w-px h-4 bg-zinc-800" />

            {/* Focus button */}
            <button
              onClick={() => {
                if (pendingTasks.length > 0 && !activeTask) onStartSession(pendingTasks[0].id);
                setIsFocusMode(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 transition-all text-[10px] font-bold uppercase tracking-wider"
            >
              <Zap size={10} />
              Focus
            </button>
          </div>
        </div>

        {/* Prayer time bar */}
        {isToday && (
          <div className="h-8 border-t border-zinc-900/50 flex items-center px-5 gap-4 bg-zinc-950/50">
            {prayerTimes.map((pt, i) => {
              const isCurrent = currentPrayerIndex === i;
              const isPast = currentPrayerIndex > i;
              return (
                <div key={pt.name} className={`flex items-center gap-1.5 ${isCurrent ? 'text-emerald-400' : isPast ? 'text-zinc-700' : 'text-zinc-500'}`}>
                  {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  <span className="text-[10px] font-bold uppercase tracking-tight">{pt.name}</span>
                  <span className="text-[10px] font-mono opacity-70">{pt.time}</span>
                </div>
              );
            })}
            {nextPrayerInfo && (
              <>
                <div className="flex-1" />
                <span className="text-[10px] text-zinc-500">
                  Next: <span className="text-zinc-400 font-bold">{nextPrayerInfo.name}</span> in <span className="text-emerald-400 font-mono">{nextPrayerInfo.countdown}</span>
                </span>
              </>
            )}
          </div>
        )}
      </header>

      {/* ==================== MAIN CONTENT ==================== */}
      <main className="flex-1 flex min-h-0 overflow-hidden">

        {/* ---- PREVIOUS DAY PEEK ---- */}
        <div className="w-[160px] border-r border-zinc-900/50 bg-black/20 shrink-0 overflow-hidden hidden lg:flex flex-col">
          <PeekColumn dk={prevDateKey} tasks={prevDayTasks} label="Yesterday" direction="prev" />
        </div>

        {/* ---- CURRENT DAY (main column) ---- */}
        <section className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <div ref={mainScrollRef} className="flex-1 overflow-y-auto">

            {/* Niyyah / Daily Intention */}
            <div className="px-5 pt-4 pb-2">
              <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Feather size={14} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Niyyah - Today's Intention</label>
                    <input
                      value={state.dayMeta[dateKey]?.focus || ''}
                      onChange={(e) => onDayMetaUpdate(dateKey, { focus: e.target.value })}
                      placeholder="What do you intend to accomplish today? Set your positive intention..."
                      className="w-full bg-transparent text-[13px] text-zinc-200 outline-none placeholder:text-zinc-700 font-sans leading-relaxed"
                    />
                  </div>
                </div>

                {/* Prophetic Quote */}
                <div className="pt-2 border-t border-zinc-800/30">
                  <p className="text-[11px] text-zinc-500 font-serif italic leading-relaxed">
                    "{propheticQuote}"
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Capture */}
            <div className="px-5 pb-3">
              <div className="flex items-center gap-2">
                <input
                  value={captureValue}
                  onChange={(e) => setCaptureValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCapture()}
                  placeholder="Quick add task..."
                  className="flex-1 bg-zinc-900/30 border border-zinc-800/40 rounded-lg px-3 py-2 text-[12px] text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700 transition-colors"
                />
                <button
                  onClick={handleCapture}
                  disabled={!captureValue.trim()}
                  className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-30 transition-all"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Inbox tasks (if any unscheduled) */}
            {inboxTasks.length > 0 && (
              <div className="px-5 pb-3">
                <div className="bg-zinc-900/20 border border-zinc-800/30 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Inbox</span>
                    <span className="text-[10px] text-zinc-600 font-mono">{inboxTasks.length}</span>
                  </div>
                  <div className="space-y-1">
                    {inboxTasks.map(task => (
                      <div key={task.id} className="relative">
                        <TaskCard task={task} />
                        {/* Schedule button */}
                        {task.status !== TaskStatus.DONE && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            {showScheduler === task.id ? (
                              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-lg p-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number" min="0" max="23"
                                  value={schedulerHour}
                                  onChange={(e) => setSchedulerHour(e.target.value)}
                                  className="w-8 bg-zinc-800 text-zinc-300 text-[10px] text-center rounded px-1 py-0.5 outline-none"
                                />
                                <span className="text-zinc-600 text-[10px]">:</span>
                                <input
                                  type="number" min="0" max="59" step="5"
                                  value={schedulerMinute}
                                  onChange={(e) => setSchedulerMinute(e.target.value)}
                                  className="w-8 bg-zinc-800 text-zinc-300 text-[10px] text-center rounded px-1 py-0.5 outline-none"
                                />
                                <button onClick={() => handleScheduleTask(task.id)} className="text-[10px] font-bold text-emerald-400 px-1">Go</button>
                                <button onClick={() => setShowScheduler(null)} className="text-zinc-600"><X size={10} /></button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); setShowScheduler(task.id); }}
                                className="opacity-0 group-hover/card:opacity-100 p-1 text-zinc-600 hover:text-zinc-300 transition-all"
                                title="Schedule"
                              >
                                <Clock size={11} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ---- PRAYER-ANCHORED TIMELINE ---- */}
            <div className="px-5 pb-6 space-y-2">
              {PRAYER_BLOCKS.map((_, i) => (
                <PrayerBlockSection key={i} prayerIndex={i} tasks={daysTasks} prayers={prayerTimes} />
              ))}
            </div>

            {/* Completed tasks summary */}
            {completedTasks.length > 0 && daysTasks.length > completedTasks.length && (
              <div className="px-5 pb-6">
                <div className="flex items-center gap-2 text-[10px] text-zinc-600 uppercase tracking-widest font-bold px-1 pb-2">
                  <CheckCircle2 size={12} className="text-emerald-500/40" />
                  Completed ({completedTasks.length})
                </div>
              </div>
            )}

            {/* Empty state */}
            {daysTasks.length === 0 && (
              <div className="px-5 py-16 text-center">
                <div className="text-zinc-800 mb-3">
                  <Layers size={32} className="mx-auto" />
                </div>
                <p className="text-[12px] text-zinc-600">No tasks for this day</p>
                <p className="text-[10px] text-zinc-700 mt-1">Use the quick add above or schedule tasks from the planner</p>
              </div>
            )}
          </div>
        </section>

        {/* ---- NEXT DAY PEEK ---- */}
        <div className="w-[160px] border-l border-zinc-900/50 bg-black/20 shrink-0 overflow-hidden hidden lg:flex flex-col">
          <PeekColumn dk={nextDateKey} tasks={nextDayTasks} label="Tomorrow" direction="next" />
        </div>

        {/* ==================== RIGHT SIDEBAR ==================== */}
        <aside className="w-[260px] border-l border-zinc-900 flex flex-col bg-black/30 shrink-0 overflow-hidden hidden md:flex">

          {/* Day Stats */}
          <div className="p-4 border-b border-zinc-900/50 space-y-3">
            {/* Active / Next task */}
            {activeTask ? (
              <div className="flex items-center gap-2 p-2.5 bg-emerald-950/20 border border-emerald-900/30 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-[11px] text-emerald-400 truncate flex-1 font-medium">{activeTask.title}</span>
              </div>
            ) : pendingTasks.length > 0 ? (
              <div className="flex items-center gap-2 p-2.5 bg-zinc-900/30 border border-zinc-800/30 rounded-lg">
                <Clock size={11} className="text-zinc-600 shrink-0" />
                <span className="text-[11px] text-zinc-500 truncate flex-1">Next: {pendingTasks[0].title}</span>
              </div>
            ) : daysTasks.length > 0 ? (
              <div className="text-center text-[11px] text-emerald-500/60 py-2">All tasks complete</div>
            ) : null}

            {/* Progress circle */}
            {daysTasks.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10">
                  <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgb(39,39,42)" strokeWidth="2" />
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgb(16,185,129)" strokeWidth="2"
                      strokeDasharray={`${progress * 0.975} 100`}
                      strokeLinecap="round"
                      className="transition-all duration-700"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-zinc-400">{progress}%</span>
                </div>
                <div className="text-[10px] text-zinc-500 space-y-0.5">
                  <div><span className="text-zinc-300 font-bold">{completedTasks.length}</span> done</div>
                  <div><span className="text-zinc-300 font-bold">{pendingTasks.length}</span> remaining</div>
                </div>
              </div>
            )}
          </div>

          {/* Daily Rituals - Scrollable checklist */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Rituals header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star size={12} className="text-zinc-500" />
                  <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Daily Rituals</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">{completedRituals}/{totalRituals}</span>
              </div>

              {/* Rituals progress */}
              <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500/60 transition-all duration-500 rounded-full"
                  style={{ width: `${totalRituals > 0 ? (completedRituals / totalRituals) * 100 : 0}%` }}
                />
              </div>

              {/* Ritual sections */}
              {RITUAL_SECTIONS.map(section => (
                <div key={section.label} className="space-y-1.5">
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] px-1">{section.label}</span>
                  {section.items.map(item => {
                    const isChecked = !!rituals[item.key];
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          const current = state.dayMeta[dateKey]?.rituals || {};
                          onDayMetaUpdate(dateKey, { rituals: { ...current, [item.key]: !isChecked } });
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${isChecked
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : 'bg-zinc-900/20 border-zinc-800/30 hover:border-zinc-700 hover:bg-zinc-900/40'
                          }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${isChecked
                          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                          : 'border border-zinc-700'
                          }`}>
                          {isChecked ? <Check size={12} className="text-black" strokeWidth={3} /> : <Icon size={12} className={item.color + ' opacity-40'} />}
                        </div>
                        <span className={`text-[11px] font-medium flex-1 text-left ${isChecked ? 'text-emerald-400' : 'text-zinc-400'}`}>
                          {item.label}
                        </span>
                        {isChecked && <CheckCircle2 size={12} className="text-emerald-500/50" />}
                      </button>
                    );
                  })}
                </div>
              ))}

              {/* Protocols */}
              {onProtocolToggle && onWeeklyActivityToggle && (
                <div className="pt-2 border-t border-zinc-800/30">
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
                </div>
              )}
            </div>
          </div>
        </aside>
      </main>

      {/* Modals */}
      {showProtocolsEditor && onProtocolContextsUpdate && (
        <ProtocolsEditor
          protocolContexts={state.protocolContexts || []}
          onUpdate={onProtocolContextsUpdate}
          onClose={() => setShowProtocolsEditor(false)}
        />
      )}
      {showWeeklyEditor && onWeeklyActivitiesUpdate && (
        <WeeklyActivitiesEditor
          weeklyActivities={state.weeklyActivities || {}}
          onUpdate={onWeeklyActivitiesUpdate}
          onClose={() => setShowWeeklyEditor(false)}
        />
      )}
    </div>
  );
};

export default DayView;
