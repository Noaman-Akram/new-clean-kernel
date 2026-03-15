import React, { useState, useMemo } from 'react';
import { AppState, Task, TaskStatus, Category, Severity, PrayerName, DayMeta, ProtocolContext, WeeklyActivities, DayViewLayout, TimeBlock } from '../types';
import { getPrayerTimesForDate } from '../utils/prayerTimes';
import { getPropheticQuoteForDate } from '../utils/quotes';
import {
  Plus, Check, X, ChevronLeft, ChevronRight,
  Sunrise, Sun, CloudSun, Sunset, Moon, Play,
  Zap, Clock, BookOpen, Dumbbell,
  Trash2, ArrowRight, List, Columns3,
  CheckCircle2, Star, StickyNote, Repeat, LayoutTemplate,
  Feather, ChevronDown, ChevronUp
} from 'lucide-react';
import ProtocolsSidebar from './ProtocolsSidebar';
import ProtocolsEditor from './ProtocolsEditor';
import WeeklyActivitiesEditor from './WeeklyActivitiesEditor';
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
  onProtocolToggle?: (dateKey: string, itemId: string) => void;
  onWeeklyActivityToggle?: (dateKey: string, activityId: string) => void;
  onProtocolContextsUpdate?: (contexts: ProtocolContext[]) => void;
  onWeeklyActivitiesUpdate?: (activities: WeeklyActivities) => void;
  onLayoutChange?: (layout: DayViewLayout) => void;
  onTimeBlockAdd?: (dateKey: string, block: TimeBlock) => void;
  onTimeBlockUpdate?: (dateKey: string, blockId: string, updates: Partial<TimeBlock>) => void;
  onTimeBlockDelete?: (dateKey: string, blockId: string) => void;
}

type DayTab = 'tasks' | 'rituals' | 'habits' | 'templates';
type ViewMode = 'list' | 'kanban';

// Prayer data
const PRAYER_ITEMS: { key: PrayerName; label: string; icon: any; color: string }[] = [
  { key: 'Fajr', label: 'Fajr', icon: Sunrise, color: 'text-orange-400' },
  { key: 'Dhuhr', label: 'Dhuhr', icon: Sun, color: 'text-yellow-400' },
  { key: 'Asr', label: 'Asr', icon: CloudSun, color: 'text-amber-400' },
  { key: 'Maghrib', label: 'Maghrib', icon: Sunset, color: 'text-orange-500' },
  { key: 'Isha', label: 'Isha', icon: Moon, color: 'text-indigo-400' },
];

const EXTRA_RITUALS: { key: string; label: string; icon: any; color: string }[] = [
  { key: 'MorningAthkar', label: 'Morning Athkar', icon: BookOpen, color: 'text-emerald-400' },
  { key: 'EveningAthkar', label: 'Evening Athkar', icon: BookOpen, color: 'text-emerald-400' },
  { key: 'Quran', label: 'Quran Reading', icon: BookOpen, color: 'text-teal-400' },
  { key: 'Workout', label: 'Workout', icon: Dumbbell, color: 'text-blue-400' },
  { key: 'Journal', label: 'Journal', icon: StickyNote, color: 'text-purple-400' },
];

const ALL_RITUAL_KEYS = [...PRAYER_ITEMS.map(p => p.key), ...EXTRA_RITUALS.map(r => r.key)];

// Quick templates
const QUICK_TEMPLATES = [
  {
    name: 'Morning Routine',
    icon: Sunrise,
    color: 'text-orange-400',
    tasks: [
      { title: 'Fajr Prayer', time: '5:00' },
      { title: 'Morning Athkar', time: '5:15' },
      { title: 'Quran Reading', time: '5:30' },
      { title: 'Workout', time: '6:00' },
      { title: 'Breakfast & Plan Day', time: '7:00' },
    ]
  },
  {
    name: 'Evening Routine',
    icon: Moon,
    color: 'text-indigo-400',
    tasks: [
      { title: 'Evening Athkar', time: '18:00' },
      { title: 'Maghrib Prayer', time: '18:15' },
      { title: 'Family Time', time: '19:00' },
      { title: 'Isha Prayer', time: '19:30' },
      { title: 'Review & Journal', time: '21:00' },
    ]
  },
  {
    name: 'Deep Work Day',
    icon: Zap,
    color: 'text-emerald-400',
    tasks: [
      { title: 'Deep Work Block 1', time: '9:00' },
      { title: 'Break', time: '11:00' },
      { title: 'Deep Work Block 2', time: '11:30' },
      { title: 'Dhuhr Prayer + Lunch', time: '12:30' },
      { title: 'Deep Work Block 3', time: '14:00' },
      { title: 'Asr Prayer', time: '15:30' },
      { title: 'Email & Admin', time: '16:00' },
    ]
  },
  {
    name: 'Jummah Day',
    icon: Star,
    color: 'text-yellow-400',
    tasks: [
      { title: 'Fajr Prayer', time: '5:00' },
      { title: 'Quran Reading', time: '5:30' },
      { title: 'Jummah Prayer', time: '12:00' },
      { title: 'Family Time', time: '14:00' },
      { title: 'Rest & Recharge', time: '16:00' },
    ]
  },
];

const DayView: React.FC<Props> = ({
  state,
  onTaskUpdate,
  onTaskAdd,
  onTaskDelete,
  onStartSession,
  onStickyNoteUpdate,
  onDayMetaUpdate,
  activeTaskId,
  onProtocolToggle,
  onWeeklyActivityToggle,
  onProtocolContextsUpdate,
  onWeeklyActivitiesUpdate,
}) => {
  const timeZone = state.userPreferences?.timeZone || DEFAULT_TIME_ZONE;
  const [selectedDate, setSelectedDate] = useState(() =>
    dateFromDateKey(getDateKeyInTimeZone(new Date(), timeZone))
  );
  const [activeTab, setActiveTab] = useState<DayTab>('tasks');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [captureValue, setCaptureValue] = useState('');
  const [showPrevDays, setShowPrevDays] = useState(false);
  const [showProtocolsEditor, setShowProtocolsEditor] = useState(false);
  const [showWeeklyEditor, setShowWeeklyEditor] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const dateKey = getDateKeyInTimeZone(selectedDate, timeZone);
  const todayKey = getDateKeyInTimeZone(new Date(), timeZone);
  const isToday = dateKey === todayKey;

  // Prayer times
  const prayerTimes = useMemo(() => getPrayerTimesForDate(selectedDate), [selectedDate]);
  const currentPrayerIndex = useMemo(() => {
    if (!isToday) return -1;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    let current = -1;
    for (let i = 0; i < prayerTimes.length; i++) {
      const pt = new Date(prayerTimes[i].timestamp);
      if (nowMinutes >= pt.getHours() * 60 + pt.getMinutes()) current = i;
    }
    return current;
  }, [prayerTimes, isToday]);

  // Prophetic quote
  const propheticQuote = useMemo(() => getPropheticQuoteForDate(selectedDate), [selectedDate]);

  // Tasks for selected date
  const daysTasks = useMemo(() => {
    return state.tasks.filter(task => {
      if (task.scheduledTime) {
        const taskDk = getDateKeyInTimeZone(new Date(task.scheduledTime), timeZone);
        return taskDk === dateKey;
      }
      return false;
    }).sort((a, b) => (a.scheduledTime || 0) - (b.scheduledTime || 0));
  }, [state.tasks, dateKey, timeZone]);

  // Previous days' incomplete tasks
  const previousDaysTasks = useMemo(() => {
    return state.tasks.filter(task => {
      if (task.status === TaskStatus.DONE) return false;
      if (!task.scheduledTime) return false;
      const taskDk = getDateKeyInTimeZone(new Date(task.scheduledTime), timeZone);
      return taskDk < dateKey;
    }).sort((a, b) => (b.scheduledTime || 0) - (a.scheduledTime || 0));
  }, [state.tasks, dateKey, timeZone]);

  // Unscheduled tasks
  const unscheduledTasks = useMemo(() => {
    return state.tasks.filter(t => !t.scheduledTime && t.status !== TaskStatus.DONE);
  }, [state.tasks]);

  // Habit tasks
  const habitTasks = useMemo(() => {
    return state.tasks.filter(t => t.dockSection === 'HABIT');
  }, [state.tasks]);

  const completedTasks = daysTasks.filter(t => t.status === TaskStatus.DONE);
  const pendingTasks = daysTasks.filter(t => t.status !== TaskStatus.DONE);
  const progress = daysTasks.length > 0 ? Math.round((completedTasks.length / daysTasks.length) * 100) : 0;

  // Rituals
  const rituals = state.dayMeta[dateKey]?.rituals || {};
  const completedRituals = ALL_RITUAL_KEYS.filter(k => rituals[k]).length;
  const totalRituals = ALL_RITUAL_KEYS.length;

  // Sticky note
  const stickyNote = state.stickyNotes?.[dateKey] || '';

  // Focus hours estimate
  const focusHoursLeft = useMemo(() => {
    const totalMinutes = pendingTasks.reduce((sum, t) => sum + (t.duration || 30), 0);
    return (totalMinutes / 60).toFixed(1);
  }, [pendingTasks]);

  // --- Mini calendar ---
  const [calMonth, setCalMonth] = useState(selectedDate.getMonth());
  const [calYear, setCalYear] = useState(selectedDate.getFullYear());

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [calMonth, calYear]);

  // --- HANDLERS ---

  const parseTimeFromInput = (input: string): { title: string; hour: number; minute: number } | null => {
    const timeMatch = input.match(/@(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (!timeMatch) return null;
    let hour = parseInt(timeMatch[1]);
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const ampm = timeMatch[3]?.toLowerCase();
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    const title = input.replace(/@\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i, '').trim();
    return { title, hour, minute };
  };

  const handleCapture = () => {
    if (!captureValue.trim()) return;
    const parsed = parseTimeFromInput(captureValue);
    if (parsed && parsed.title) {
      const schedTime = getLocalTimestampForDateKey(dateKey, parsed.hour, parsed.minute);
      onTaskAdd(parsed.title, Category.CORE, 'MED', { scheduledTime: schedTime });
    } else {
      const schedTime = getLocalTimestampForDateKey(dateKey, 12, 0);
      onTaskAdd(captureValue.trim(), Category.CORE, 'MED', { scheduledTime: schedTime });
    }
    setCaptureValue('');
  };

  const handleToggleComplete = (task: Task) => {
    onTaskUpdate(task.id, { status: task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE });
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

  const handlePullToToday = (task: Task) => {
    const schedTime = getLocalTimestampForDateKey(dateKey, 12, 0);
    onTaskUpdate(task.id, { scheduledTime: schedTime });
  };

  const handleApplyTemplate = (template: typeof QUICK_TEMPLATES[0]) => {
    template.tasks.forEach(t => {
      const [h, m] = t.time.split(':').map(Number);
      const schedTime = getLocalTimestampForDateKey(dateKey, h, m);
      onTaskAdd(t.title, Category.CORE, 'MED', { scheduledTime: schedTime });
    });
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  };

  const formatDateForPrevious = (ts: number) => {
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const navigateToDate = (day: number) => {
    const d = new Date(calYear, calMonth, day);
    setSelectedDate(d);
    setShowCalendar(false);
  };

  // --- TASK CARD ---
  const TaskCard: React.FC<{ task: Task; showDate?: boolean; onPull?: () => void }> = ({ task, showDate, onPull }) => {
    const isActive = task.id === activeTaskId;
    const isDone = task.status === TaskStatus.DONE;

    return (
      <div
        className={`group/card relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
          isDone
            ? 'opacity-40'
            : isActive
              ? 'bg-emerald-950/20 border border-emerald-500/20'
              : 'hover:bg-zinc-800/30'
        }`}
      >
        <button onClick={() => handleToggleComplete(task)} className="shrink-0">
          {isDone ? (
            <div className="w-[18px] h-[18px] bg-emerald-500 rounded-full flex items-center justify-center">
              <Check size={10} className="text-black" strokeWidth={3} />
            </div>
          ) : (
            <div className={`w-[18px] h-[18px] rounded-full border-2 transition-colors ${
              isActive ? 'border-emerald-500/50' : 'border-zinc-700 group-hover/card:border-zinc-500'
            }`} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <span className={`text-[13px] ${isDone ? 'text-zinc-600 line-through' : 'text-zinc-200'}`}>
            {task.title}
          </span>
        </div>

        {task.scheduledTime && (
          <span className="text-[11px] text-zinc-600 font-mono shrink-0">
            {showDate ? formatDateForPrevious(task.scheduledTime) : formatTime(task.scheduledTime)}
          </span>
        )}

        {!isDone && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity shrink-0">
            {onPull && (
              <button onClick={(e) => { e.stopPropagation(); onPull(); }}
                className="p-1 text-zinc-600 hover:text-amber-400 transition-colors" title="Pull to today">
                <ArrowRight size={11} />
              </button>
            )}
            {!onPull && (
              <>
                <button onClick={(e) => { e.stopPropagation(); onStartSession(task.id); }}
                  className="p-1 text-zinc-600 hover:text-emerald-400 transition-colors" title="Start">
                  <Play size={11} fill="currentColor" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleReschedule(task, 1); }}
                  className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors" title="Tomorrow">
                  <ArrowRight size={11} />
                </button>
              </>
            )}
            <button onClick={(e) => { e.stopPropagation(); onTaskDelete(task.id); }}
              className="p-1 text-zinc-600 hover:text-red-400 transition-colors" title="Delete">
              <Trash2 size={11} />
            </button>
          </div>
        )}

        {isActive && (
          <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-500 rounded-full" />
        )}
      </div>
    );
  };

  // --- KANBAN ---
  const KanbanColumn: React.FC<{ title: string; tasks: Task[]; color: string }> = ({ title, tasks: columnTasks, color }) => (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${color}`}>{title}</span>
        <span className="text-[10px] text-zinc-600 font-mono">{columnTasks.length}</span>
      </div>
      <div className="space-y-1.5 min-h-[100px]">
        {columnTasks.map(task => (
          <div key={task.id} className="bg-zinc-900/40 border border-zinc-800/50 rounded-lg p-3 hover:border-zinc-700 transition-colors group/card">
            <div className="flex items-start gap-2">
              <button onClick={() => handleToggleComplete(task)} className="mt-0.5 shrink-0">
                {task.status === TaskStatus.DONE ? (
                  <div className="w-4 h-4 bg-emerald-500 rounded flex items-center justify-center">
                    <Check size={10} className="text-black" strokeWidth={3} />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded border-2 border-zinc-700 group-hover/card:border-zinc-500" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-[12px] ${task.status === TaskStatus.DONE ? 'text-zinc-600 line-through' : 'text-zinc-200'}`}>
                  {task.title}
                </div>
                {task.scheduledTime && (
                  <div className="text-[10px] text-zinc-600 font-mono mt-1">{formatTime(task.scheduledTime)}</div>
                )}
              </div>
            </div>
            {task.status !== TaskStatus.DONE && (
              <div className="flex items-center gap-1 mt-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
                <button onClick={() => onStartSession(task.id)} className="text-[9px] text-zinc-600 hover:text-emerald-400 px-1.5 py-0.5 rounded bg-zinc-800/50">Start</button>
                <button onClick={() => handleReschedule(task, 1)} className="text-[9px] text-zinc-600 hover:text-zinc-300 px-1.5 py-0.5 rounded bg-zinc-800/50">Tomorrow</button>
                <button onClick={() => onTaskDelete(task.id)} className="text-[9px] text-zinc-600 hover:text-red-400 px-1.5 py-0.5 rounded bg-zinc-800/50">Delete</button>
              </div>
            )}
          </div>
        ))}
        {columnTasks.length === 0 && (
          <div className="text-[11px] text-zinc-700 text-center py-8 border border-dashed border-zinc-800/40 rounded-lg">No tasks</div>
        )}
      </div>
    </div>
  );

  // --- TAB RENDERERS ---

  const renderTasksTab = () => {
    if (viewMode === 'kanban') {
      const todoTasks = daysTasks.filter(t => t.status === TaskStatus.TODO || t.status === TaskStatus.BACKLOG);
      const inProgressTasks = daysTasks.filter(t => t.status === TaskStatus.IN_PROGRESS);
      const doneTasks = daysTasks.filter(t => t.status === TaskStatus.DONE);
      return (
        <div className="flex gap-4 p-5 h-full overflow-x-auto">
          <KanbanColumn title="To Do" tasks={todoTasks} color="text-zinc-400" />
          <KanbanColumn title="In Progress" tasks={inProgressTasks} color="text-blue-400" />
          <KanbanColumn title="Done" tasks={doneTasks} color="text-emerald-400" />
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-3">
          {daysTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-700">
              <CheckCircle2 size={36} className="mb-4 opacity-30" />
              <p className="text-[14px] text-zinc-600">No tasks</p>
              <p className="text-[12px] text-zinc-700 mt-1">Add a task below or apply a template</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {daysTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        {/* Previous days */}
        {previousDaysTasks.length > 0 && (
          <div className="px-5 pt-4 pb-3 border-t border-zinc-800/30">
            <button onClick={() => setShowPrevDays(!showPrevDays)} className="flex items-center gap-2 w-full text-left mb-3">
              <span className="text-[12px] font-bold text-amber-500/80">{previousDaysTasks.length} from previous days</span>
              <div className="flex-1" />
              <span className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1">
                {showPrevDays ? 'Hide' : 'Show all'}
                {showPrevDays ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </span>
            </button>
            {(showPrevDays ? previousDaysTasks : previousDaysTasks.slice(0, 3)).map(task => (
              <TaskCard key={task.id} task={task} showDate onPull={() => handlePullToToday(task)} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderRitualsTab = () => (
    <div className="flex-1 overflow-y-auto">
      {/* Rituals progress */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-bold text-zinc-200">Daily Rituals</span>
          <span className="text-[12px] text-zinc-500 font-mono">{completedRituals}/{totalRituals}</span>
        </div>
        <div className="h-2 bg-zinc-800/60 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500/60 rounded-full transition-all duration-500"
            style={{ width: `${totalRituals > 0 ? (completedRituals / totalRituals) * 100 : 0}%` }} />
        </div>
      </div>

      {/* Prayers - big cards */}
      <div className="px-5 pb-4">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3 block">Prayers</span>
        <div className="grid grid-cols-5 gap-2">
          {PRAYER_ITEMS.map((prayer, i) => {
            const isChecked = !!rituals[prayer.key];
            const isCurrent = currentPrayerIndex === i;
            const Icon = prayer.icon;
            return (
              <button
                key={prayer.key}
                onClick={() => {
                  const current = state.dayMeta[dateKey]?.rituals || {};
                  onDayMetaUpdate(dateKey, { rituals: { ...current, [prayer.key]: !isChecked } });
                }}
                className={`flex flex-col items-center gap-2 py-4 px-2 rounded-xl border transition-all ${
                  isChecked
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : isCurrent
                      ? 'bg-zinc-800/40 border-zinc-700'
                      : 'bg-zinc-900/30 border-zinc-800/40 hover:border-zinc-700'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isChecked ? 'bg-emerald-500' : 'bg-zinc-800/60'
                }`}>
                  {isChecked
                    ? <Check size={18} className="text-black" strokeWidth={3} />
                    : <Icon size={18} className={prayer.color} />
                  }
                </div>
                <span className={`text-[11px] font-bold ${isChecked ? 'text-emerald-400' : isCurrent ? 'text-zinc-100' : 'text-zinc-400'}`}>
                  {prayer.label}
                </span>
                <span className="text-[10px] text-zinc-600 font-mono">{prayerTimes[i]?.time}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Athkar & Wellness - cards */}
      <div className="px-5 pb-4">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3 block">Athkar & Wellness</span>
        <div className="grid grid-cols-2 gap-2">
          {EXTRA_RITUALS.map(ritual => {
            const isChecked = !!rituals[ritual.key];
            const Icon = ritual.icon;
            return (
              <button
                key={ritual.key}
                onClick={() => {
                  const current = state.dayMeta[dateKey]?.rituals || {};
                  onDayMetaUpdate(dateKey, { rituals: { ...current, [ritual.key]: !isChecked } });
                }}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all ${
                  isChecked
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-zinc-900/30 border-zinc-800/40 hover:border-zinc-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isChecked ? 'bg-emerald-500' : 'bg-zinc-800/60'
                }`}>
                  {isChecked ? <Check size={14} className="text-black" strokeWidth={3} /> : <Icon size={14} className={ritual.color} />}
                </div>
                <span className={`text-[12px] font-medium ${isChecked ? 'text-emerald-400' : 'text-zinc-300'}`}>
                  {ritual.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Protocols */}
      {onProtocolToggle && onWeeklyActivityToggle && (
        <div className="px-5 pb-4">
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
  );

  const renderHabitsTab = () => {
    if (habitTasks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-700 px-5">
          <Repeat size={36} className="mb-4 opacity-30" />
          <p className="text-[14px] text-zinc-600">No habits tracked</p>
          <p className="text-[12px] text-zinc-700 mt-1">Create tasks with HABIT dock section to track them here</p>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {habitTasks.map(habit => {
          const tracking = habit.habitTracking || {};
          const isCompletedToday = !!tracking[dateKey];
          let streak = 0;
          let checkDate = dateKey;
          while (tracking[checkDate]) { streak++; checkDate = shiftDateKey(checkDate, -1); }
          const last30 = Array.from({ length: 30 }, (_, i) => !!tracking[shiftDateKey(dateKey, -i)]);
          const completionRate = Math.round((last30.filter(Boolean).length / 30) * 100);

          const catStyle = habit.category === Category.GROWTH
            ? { bg: 'bg-orange-500/10', text: 'text-orange-400', label: 'GROWTH' }
            : habit.category === Category.SERVICE
              ? { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'SERVICE' }
              : { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'CORE' };

          return (
            <div key={habit.id} className="bg-zinc-900/30 border border-zinc-800/40 rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] text-zinc-200 font-medium">{habit.title}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${catStyle.bg} ${catStyle.text}`}>{catStyle.label}</span>
                  </div>
                  {habit.notes && <p className="text-[12px] text-zinc-500 mt-1">{habit.notes}</p>}
                </div>
                <button
                  onClick={() => onTaskUpdate(habit.id, { habitTracking: { ...tracking, [dateKey]: !isCompletedToday } })}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    isCompletedToday ? 'bg-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.3)]' : 'border-2 border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  {isCompletedToday && <Check size={18} className="text-black" strokeWidth={3} />}
                </button>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">30-day completion</span>
                  <span className="text-[11px] text-zinc-400 font-mono font-bold">{completionRate}%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500/60 rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
                </div>
              </div>
              {streak > 0 && (
                <div className="flex items-center gap-1.5">
                  <Zap size={11} className="text-amber-400" />
                  <span className="text-[11px] text-amber-400 font-bold">{streak} day streak</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTemplatesTab = () => (
    <div className="flex-1 overflow-y-auto p-5">
      <p className="text-[12px] text-zinc-500 mb-5">Apply pre-built task sets for common routines</p>
      <div className="grid grid-cols-2 gap-4">
        {QUICK_TEMPLATES.map(template => {
          const Icon = template.icon;
          return (
            <div key={template.name} className="bg-zinc-900/30 border border-zinc-800/40 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-800/60 flex items-center justify-center">
                  <Icon size={16} className={template.color} />
                </div>
                <span className="text-[13px] text-zinc-200 font-bold">{template.name}</span>
              </div>
              <div className="space-y-1.5 pl-1">
                {template.tasks.map((t, i) => (
                  <div key={i} className="text-[11px] text-zinc-500 flex items-center gap-2">
                    <span className="text-zinc-700">•</span> {t.title}
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleApplyTemplate(template)}
                className="w-full py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider hover:bg-emerald-500/20 transition-colors"
              >
                Apply Template
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  // --- MAIN RENDER ---
  return (
    <div className="h-full flex bg-[#0a0a0a] text-zinc-400 overflow-hidden">

      {/* ===== LEFT SIDEBAR: Calendar + Context ===== */}
      <div className="w-[220px] border-r border-zinc-800/50 flex flex-col shrink-0 hidden lg:flex">
        {/* Mini calendar */}
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }}
              className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"><ChevronLeft size={14} /></button>
            <span className="text-[12px] text-zinc-300 font-bold">
              {new Date(calYear, calMonth).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }}
              className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"><ChevronRight size={14} /></button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0 mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-[9px] text-zinc-600 font-bold text-center py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0">
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={i} />;
              const thisDk = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = thisDk === dateKey;
              const isTodayCal = thisDk === todayKey;
              // Check if this day has tasks
              const hasTasks = state.tasks.some(t => t.scheduledTime && getDateKeyInTimeZone(new Date(t.scheduledTime), timeZone) === thisDk);
              return (
                <button
                  key={i}
                  onClick={() => navigateToDate(day)}
                  className={`relative w-full aspect-square flex items-center justify-center text-[11px] rounded-lg transition-all ${
                    isSelected
                      ? 'bg-emerald-500 text-black font-bold'
                      : isTodayCal
                        ? 'bg-zinc-800 text-zinc-100 font-bold'
                        : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                  }`}
                >
                  {day}
                  {hasTasks && !isSelected && (
                    <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-emerald-500/50" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-zinc-800/40 mx-4 my-2" />

        {/* Context navigation */}
        <div className="px-4 py-2">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-2 block">Context</span>
          <div className="space-y-0.5">
            <button
              onClick={() => setSelectedDate(prev => { const d = new Date(prev); d.setUTCDate(d.getUTCDate() - 1); return d; })}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200 transition-all"
            >
              <ChevronLeft size={12} className="text-zinc-600" />
              Yesterday
            </button>
            <button
              onClick={() => setSelectedDate(prev => { const d = new Date(prev); d.setUTCDate(d.getUTCDate() + 1); return d; })}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200 transition-all"
            >
              <ChevronRight size={12} className="text-zinc-600" />
              Tomorrow
            </button>
            {previousDaysTasks.length > 0 && (
              <button
                onClick={() => { setActiveTab('tasks'); setShowPrevDays(true); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] text-amber-500/70 hover:bg-zinc-800/30 hover:text-amber-400 transition-all"
              >
                <Clock size={12} />
                {previousDaysTasks.length} overdue
              </button>
            )}
            {unscheduledTasks.length > 0 && (
              <button
                onClick={() => setActiveTab('tasks')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] text-zinc-500 hover:bg-zinc-800/30 hover:text-zinc-300 transition-all"
              >
                <StickyNote size={12} />
                {unscheduledTasks.length} unscheduled
              </button>
            )}
          </div>
        </div>

        <div className="flex-1" />

        {/* Today button */}
        {!isToday && (
          <div className="p-4">
            <button
              onClick={() => { setSelectedDate(dateFromDateKey(todayKey)); setCalMonth(new Date().getMonth()); setCalYear(new Date().getFullYear()); }}
              className="w-full py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider hover:bg-emerald-500/20 transition-colors"
            >
              Go to Today
            </button>
          </div>
        )}
      </div>

      {/* ===== CENTER: Tabs + Content ===== */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Header */}
        <header className="border-b border-zinc-800/50 shrink-0">
          <div className="h-14 flex items-center justify-between px-5">
            {/* Date */}
            <div className="flex items-center gap-3">
              {/* Mobile-only nav arrows */}
              <button onClick={() => setSelectedDate(prev => { const d = new Date(prev); d.setUTCDate(d.getUTCDate() - 1); return d; })}
                className="p-1.5 hover:text-white text-zinc-600 transition-colors rounded-lg hover:bg-zinc-800/50 lg:hidden">
                <ChevronLeft size={16} />
              </button>
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                  {selectedDate.toLocaleDateString(undefined, { weekday: 'long' })}
                </span>
                <span className="text-[15px] text-zinc-100 font-bold">
                  {selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <button onClick={() => setSelectedDate(prev => { const d = new Date(prev); d.setUTCDate(d.getUTCDate() + 1); return d; })}
                className="p-1.5 hover:text-white text-zinc-600 transition-colors rounded-lg hover:bg-zinc-800/50 lg:hidden">
                <ChevronRight size={16} />
              </button>
              {isToday && (
                <span className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-widest">
                  Today
                </span>
              )}
            </div>

            {/* Right: Next prayer + focus */}
            <div className="flex items-center gap-4">
              {isToday && (() => {
                const now = new Date();
                const nowMinutes = now.getHours() * 60 + now.getMinutes();
                for (let i = 0; i < prayerTimes.length; i++) {
                  const pt = new Date(prayerTimes[i].timestamp);
                  const ptMinutes = pt.getHours() * 60 + pt.getMinutes();
                  if (ptMinutes > nowMinutes) {
                    const diff = ptMinutes - nowMinutes;
                    const h = Math.floor(diff / 60);
                    const m = diff % 60;
                    const PIcon = PRAYER_ITEMS[i]?.icon || Sun;
                    return (
                      <div className="flex items-center gap-2 text-[11px]">
                        <PIcon size={12} className={PRAYER_ITEMS[i]?.color || 'text-zinc-400'} />
                        <span className="text-zinc-400 font-medium">{prayerTimes[i].name}</span>
                        <span className="text-zinc-600">in</span>
                        <span className="text-emerald-400 font-mono font-bold">{h > 0 ? `${h}h ${m}m` : `${m}m`}</span>
                      </div>
                    );
                  }
                }
                return null;
              })()}

              <button
                onClick={() => { if (pendingTasks.length > 0 && !activeTaskId) onStartSession(pendingTasks[0].id); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all text-[10px] font-bold uppercase tracking-wider"
              >
                <Zap size={10} />
                Focus
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-between px-5 pb-0">
            <div className="flex items-center gap-0.5">
              {([
                { key: 'tasks' as DayTab, label: 'Tasks', icon: CheckCircle2 },
                { key: 'rituals' as DayTab, label: 'Rituals', icon: Star },
                { key: 'habits' as DayTab, label: 'Habits', icon: Repeat },
                { key: 'templates' as DayTab, label: 'Templates', icon: LayoutTemplate },
              ]).map(tab => {
                const Icon = tab.icon;
                const isActiveTab = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold transition-all border-b-2 ${
                      isActiveTab
                        ? 'text-zinc-100 border-emerald-500'
                        : 'text-zinc-500 border-transparent hover:text-zinc-300'
                    }`}
                  >
                    <Icon size={13} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* View toggle */}
            {activeTab === 'tasks' && (
              <div className="flex items-center gap-0.5 bg-zinc-900/50 border border-zinc-800/40 rounded-lg p-0.5">
                <button onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}`}>
                  <List size={13} />
                </button>
                <button onClick={() => setViewMode('kanban')}
                  className={`p-1.5 rounded transition-all ${viewMode === 'kanban' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}`}>
                  <Columns3 size={13} />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Tab content */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {activeTab === 'tasks' && renderTasksTab()}
          {activeTab === 'rituals' && renderRitualsTab()}
          {activeTab === 'habits' && renderHabitsTab()}
          {activeTab === 'templates' && renderTemplatesTab()}
        </div>

        {/* Add task bar */}
        {activeTab === 'tasks' && (
          <div className="border-t border-zinc-800/40 px-5 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <input
                value={captureValue}
                onChange={(e) => setCaptureValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCapture()}
                placeholder="Add task... (@2pm for time)"
                className="flex-1 bg-zinc-900/40 border border-zinc-800/50 rounded-lg px-4 py-2.5 text-[13px] text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
              />
              <button onClick={handleCapture} disabled={!captureValue.trim()}
                className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-30 transition-all shrink-0">
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== RIGHT SIDEBAR: Niyyah + Progress ===== */}
      <aside className="w-[300px] border-l border-zinc-800/50 flex flex-col shrink-0 overflow-hidden hidden xl:flex">
        <div className="flex-1 overflow-y-auto">
          {/* Niyyah / Intention */}
          <div className="p-5 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Feather size={14} className="text-emerald-400" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Today's Niyyah</span>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-xl p-4">
              <textarea
                value={state.dayMeta[dateKey]?.focus || ''}
                onChange={(e) => onDayMetaUpdate(dateKey, { focus: e.target.value })}
                placeholder="Set your intention for today..."
                className="w-full bg-transparent text-[14px] text-zinc-200 outline-none resize-none min-h-[60px] leading-relaxed placeholder:text-zinc-700 font-sans"
              />
            </div>
          </div>

          {/* Prophetic Quote */}
          <div className="px-5 pb-5">
            <div className="bg-zinc-900/20 border border-zinc-800/30 rounded-xl p-4">
              <p className="text-[13px] text-zinc-400 font-serif italic leading-relaxed">
                "{propheticQuote}"
              </p>
              <p className="text-[10px] text-zinc-600 mt-2 font-mono">— Prophetic Wisdom</p>
            </div>
          </div>

          {/* Daily Progress */}
          <div className="px-5 pb-5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-4 block">Daily Progress</span>
            <div className="flex flex-col items-center py-4">
              {/* Progress circle */}
              <div className="relative w-28 h-28 mb-4">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(39,39,42)" strokeWidth="6" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(16,185,129)" strokeWidth="6"
                    strokeDasharray={`${progress * 2.64} 264`}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[24px] font-bold text-zinc-100">{completedTasks.length}/{daysTasks.length}</span>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Completed</span>
                </div>
              </div>

              {/* Stats */}
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between py-2 border-t border-zinc-800/30">
                  <span className="text-[12px] text-zinc-500">Remaining tasks</span>
                  <span className="text-[13px] text-zinc-200 font-bold">{pendingTasks.length}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-zinc-800/30">
                  <span className="text-[12px] text-zinc-500">Focus hours left</span>
                  <span className="text-[13px] text-zinc-200 font-bold">{focusHoursLeft}h</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-zinc-800/30">
                  <span className="text-[12px] text-zinc-500">Rituals done</span>
                  <span className="text-[13px] text-zinc-200 font-bold">{completedRituals}/{totalRituals}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="px-5 pb-5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-3 block">Day Notes</span>
            <textarea
              value={stickyNote}
              onChange={(e) => onStickyNoteUpdate(dateKey, e.target.value)}
              placeholder="Write notes for this day..."
              className="w-full bg-zinc-900/30 border border-zinc-800/40 rounded-xl p-4 text-[13px] text-zinc-300 placeholder:text-zinc-700 outline-none resize-none min-h-[100px] leading-relaxed focus:border-zinc-700 transition-colors"
            />
          </div>
        </div>
      </aside>

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
