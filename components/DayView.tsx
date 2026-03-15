import React, { useState, useMemo } from 'react';
import { AppState, Task, TaskStatus, Category, Severity, PrayerName, DayMeta, ProtocolContext, WeeklyActivities, DayViewLayout, TimeBlock } from '../types';
import { getPrayerTimesForDate } from '../utils/prayerTimes';
import {
  Plus, Check, X, ChevronLeft, ChevronRight,
  Sunrise, Sun, CloudSun, Sunset, Moon, Play,
  Zap, Clock, BookOpen, Dumbbell,
  Trash2, ArrowRight, List, Columns3,
  CheckCircle2, Star, StickyNote, Repeat, Target, LayoutTemplate
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

type DayTab = 'tasks' | 'habits' | 'templates';
type ViewMode = 'list' | 'kanban';

// Prayer info for rituals sidebar
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
  onPrayerToggle,
  onAdhkarToggle,
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

  // --- HANDLERS ---

  const parseTimeFromInput = (input: string): { title: string; hour: number; minute: number } | null => {
    // Match @HH:MM, @Hpm, @Ham patterns
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
      // Default to noon
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
    const d = new Date(ts);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // --- TASK CARD ---
  const TaskCard: React.FC<{ task: Task; showDate?: boolean }> = ({ task, showDate }) => {
    const isActive = task.id === activeTaskId;
    const isDone = task.status === TaskStatus.DONE;

    return (
      <div
        className={`group/card relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
          isDone
            ? 'opacity-50'
            : isActive
              ? 'bg-emerald-950/20 border border-emerald-500/20'
              : 'hover:bg-zinc-800/30'
        }`}
      >
        {/* Checkbox */}
        <button
          onClick={() => handleToggleComplete(task)}
          className="shrink-0"
        >
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

        {/* Content */}
        <div className="flex-1 min-w-0">
          <span className={`text-[13px] ${isDone ? 'text-zinc-600 line-through' : 'text-zinc-200'}`}>
            {task.title}
          </span>
        </div>

        {/* Time */}
        {task.scheduledTime && (
          <span className="text-[11px] text-zinc-500 font-mono shrink-0">
            {showDate ? formatDateForPrevious(task.scheduledTime) : formatTime(task.scheduledTime)}
          </span>
        )}

        {/* Actions on hover */}
        {!isDone && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onStartSession(task.id); }}
              className="p-1 text-zinc-600 hover:text-emerald-400 transition-colors"
              title="Start session"
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
        {isActive && (
          <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-500 rounded-full" />
        )}
      </div>
    );
  };

  // --- KANBAN COLUMN ---
  const KanbanColumn: React.FC<{ title: string; tasks: Task[]; status: TaskStatus; color: string }> = ({ title, tasks: columnTasks, color }) => (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${color}`}>{title}</span>
        <span className="text-[10px] text-zinc-600 font-mono">{columnTasks.length}</span>
      </div>
      <div className="space-y-1.5">
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
          <div className="text-[11px] text-zinc-700 text-center py-6 border border-dashed border-zinc-800/40 rounded-lg">
            No tasks
          </div>
        )}
      </div>
    </div>
  );

  // --- TABS CONTENT ---

  const renderTasksTab = () => {
    if (viewMode === 'kanban') {
      const todoTasks = daysTasks.filter(t => t.status === TaskStatus.TODO || t.status === TaskStatus.BACKLOG);
      const inProgressTasks = daysTasks.filter(t => t.status === TaskStatus.IN_PROGRESS);
      const doneTasks = daysTasks.filter(t => t.status === TaskStatus.DONE);

      return (
        <div className="flex gap-4 p-4 h-full overflow-x-auto">
          <KanbanColumn title="To Do" tasks={todoTasks} status={TaskStatus.TODO} color="text-zinc-400" />
          <KanbanColumn title="In Progress" tasks={inProgressTasks} status={TaskStatus.IN_PROGRESS} color="text-blue-400" />
          <KanbanColumn title="Done" tasks={doneTasks} status={TaskStatus.DONE} color="text-emerald-400" />
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto">
        {/* Task list */}
        <div className="px-4 py-2">
          {daysTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-700">
              <CheckCircle2 size={32} className="mb-3 opacity-40" />
              <p className="text-[13px] text-zinc-600">No tasks</p>
              <p className="text-[11px] text-zinc-700 mt-1">Add a task below or apply a template</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {daysTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        {/* Previous days section */}
        {previousDaysTasks.length > 0 && (
          <div className="px-4 pt-4 pb-2 border-t border-zinc-800/30 mt-2">
            <button
              onClick={() => setShowPrevDays(!showPrevDays)}
              className="flex items-center gap-2 w-full text-left mb-2"
            >
              <span className="text-[11px] font-bold text-amber-500/80">
                {previousDaysTasks.length} from previous days
              </span>
              <div className="flex-1" />
              <span className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">
                {showPrevDays ? 'Hide' : 'Show all'}
              </span>
            </button>
            {(showPrevDays ? previousDaysTasks : previousDaysTasks.slice(0, 3)).map(task => (
              <TaskCard key={task.id} task={task} showDate />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderHabitsTab = () => {
    if (habitTasks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-700 px-4">
          <Repeat size={32} className="mb-3 opacity-40" />
          <p className="text-[13px] text-zinc-600">No habits tracked</p>
          <p className="text-[11px] text-zinc-700 mt-1">Create tasks with HABIT dock section to track them here</p>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {habitTasks.map(habit => {
          const tracking = habit.habitTracking || {};
          const isCompletedToday = !!tracking[dateKey];
          // Calculate streak
          let streak = 0;
          let checkDate = dateKey;
          while (tracking[checkDate]) {
            streak++;
            checkDate = shiftDateKey(checkDate, -1);
          }
          // Calculate last 30 days completion
          const last30 = Array.from({ length: 30 }, (_, i) => {
            const dk = shiftDateKey(dateKey, -i);
            return !!tracking[dk];
          });
          const completionRate = Math.round((last30.filter(Boolean).length / 30) * 100);

          const categoryColors: Record<string, { bg: string; text: string; label: string }> = {
            [Category.CORE]: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'CORE' },
            [Category.GROWTH]: { bg: 'bg-orange-500/10', text: 'text-orange-400', label: 'GROWTH' },
            [Category.SERVICE]: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'SERVICE' },
          };
          const cat = categoryColors[habit.category] || categoryColors[Category.CORE];

          return (
            <div key={habit.id} className="bg-zinc-900/30 border border-zinc-800/40 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-zinc-200 font-medium">{habit.title}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${cat.bg} ${cat.text}`}>{cat.label}</span>
                  </div>
                  {habit.notes && <p className="text-[11px] text-zinc-500 mt-1">{habit.notes}</p>}
                </div>
                <button
                  onClick={() => {
                    const newTracking = { ...tracking, [dateKey]: !isCompletedToday };
                    onTaskUpdate(habit.id, { habitTracking: newTracking });
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    isCompletedToday
                      ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                      : 'border border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  {isCompletedToday && <Check size={14} className="text-black" strokeWidth={3} />}
                </button>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">Completion rate</span>
                  <span className="text-[10px] text-zinc-400 font-mono">{completionRate}%</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500/60 rounded-full transition-all duration-500"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>

              {/* Streak */}
              {streak > 0 && (
                <div className="flex items-center gap-1.5">
                  <Zap size={10} className="text-amber-400" />
                  <span className="text-[10px] text-amber-400 font-bold">{streak} day streak</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTemplatesTab = () => (
    <div className="flex-1 overflow-y-auto p-4">
      <p className="text-[11px] text-zinc-500 mb-4">Apply pre-built task sets for common routines</p>
      <div className="grid grid-cols-2 gap-3">
        {QUICK_TEMPLATES.map(template => {
          const Icon = template.icon;
          return (
            <div key={template.name} className="bg-zinc-900/30 border border-zinc-800/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Icon size={14} className={template.color} />
                <span className="text-[12px] text-zinc-200 font-bold">{template.name}</span>
              </div>
              <div className="space-y-1">
                {template.tasks.map((t, i) => (
                  <div key={i} className="text-[10px] text-zinc-500 flex items-center gap-2">
                    <span className="text-zinc-600">•</span>
                    {t.title}
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleApplyTemplate(template)}
                className="w-full py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-500/20 transition-colors"
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
    <div className="h-full flex flex-col bg-[#0a0a0a] text-zinc-400 overflow-hidden">

      {/* ===== HEADER ===== */}
      <header className="border-b border-zinc-800/60 shrink-0">
        <div className="h-14 flex items-center justify-between px-5">
          {/* Left: Date navigation */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedDate(prev => {
                  const next = new Date(prev);
                  next.setUTCDate(next.getUTCDate() - 1);
                  return next;
                })}
                className="p-1.5 hover:text-white text-zinc-600 transition-colors rounded-lg hover:bg-zinc-800/50"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setSelectedDate(dateFromDateKey(getDateKeyInTimeZone(new Date(), timeZone)))}
                className="flex flex-col items-center min-w-[140px] hover:text-white transition-colors"
              >
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                  {selectedDate.toLocaleDateString(undefined, { weekday: 'long' })}
                </span>
                <span className="text-[14px] text-zinc-200 font-bold">
                  {selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </button>
              <button
                onClick={() => setSelectedDate(prev => {
                  const next = new Date(prev);
                  next.setUTCDate(next.getUTCDate() + 1);
                  return next;
                })}
                className="p-1.5 hover:text-white text-zinc-600 transition-colors rounded-lg hover:bg-zinc-800/50"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {isToday && (
              <span className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-widest">
                Today
              </span>
            )}
          </div>

          {/* Right: Next prayer + progress */}
          <div className="flex items-center gap-4">
            {/* Next prayer countdown */}
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

            {/* Progress */}
            {daysTasks.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500/70 transition-all duration-500 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">{completedTasks.length}/{daysTasks.length}</span>
              </div>
            )}

            {/* Focus button */}
            <button
              onClick={() => {
                if (pendingTasks.length > 0 && !activeTaskId) onStartSession(pendingTasks[0].id);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all text-[10px] font-bold uppercase tracking-wider"
            >
              <Zap size={10} />
              Focus
            </button>
          </div>
        </div>
      </header>

      {/* ===== BODY ===== */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* ===== LEFT PANEL: TABS + CONTENT ===== */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Tab bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/40">
            <div className="flex items-center gap-1">
              {([
                { key: 'tasks' as DayTab, label: 'Tasks', icon: CheckCircle2 },
                { key: 'habits' as DayTab, label: 'Habits', icon: Repeat },
                { key: 'templates' as DayTab, label: 'Templates', icon: LayoutTemplate },
              ]).map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      isActive
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
                    }`}
                  >
                    <Icon size={12} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* View toggle (only for tasks) */}
            {activeTab === 'tasks' && (
              <div className="flex items-center gap-0.5 bg-zinc-900/50 border border-zinc-800/40 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}`}
                  title="List view"
                >
                  <List size={12} />
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`p-1.5 rounded transition-all ${viewMode === 'kanban' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}`}
                  title="Kanban view"
                >
                  <Columns3 size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {activeTab === 'tasks' && renderTasksTab()}
            {activeTab === 'habits' && renderHabitsTab()}
            {activeTab === 'templates' && renderTemplatesTab()}
          </div>

          {/* Add task bar (always visible for tasks tab) */}
          {activeTab === 'tasks' && (
            <div className="border-t border-zinc-800/40 px-4 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    value={captureValue}
                    onChange={(e) => setCaptureValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCapture()}
                    placeholder="Add task... (@2pm for time)"
                    className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-lg px-3 py-2.5 text-[13px] text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                </div>
                <button
                  onClick={handleCapture}
                  disabled={!captureValue.trim()}
                  className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-30 transition-all shrink-0"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ===== RIGHT SIDEBAR: DAILY RITUALS ===== */}
        <aside className="w-[280px] border-l border-zinc-800/60 flex flex-col shrink-0 overflow-hidden hidden md:flex">
          {/* Rituals header */}
          <div className="px-4 py-3 border-b border-zinc-800/40 flex items-center justify-between">
            <span className="text-[12px] font-bold text-zinc-300">Daily Rituals</span>
            <span className="text-[11px] text-zinc-500 font-mono">{completedRituals}/{totalRituals}</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Prayers */}
            <div className="px-4 py-3 space-y-1">
              {PRAYER_ITEMS.map((prayer, i) => {
                const isChecked = !!rituals[prayer.key];
                const isCurrent = currentPrayerIndex === i;
                const isPast = isToday && currentPrayerIndex > i;
                const Icon = prayer.icon;

                return (
                  <button
                    key={prayer.key}
                    onClick={() => {
                      const current = state.dayMeta[dateKey]?.rituals || {};
                      onDayMetaUpdate(dateKey, { rituals: { ...current, [prayer.key]: !isChecked } });
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isChecked ? 'opacity-50' : isCurrent ? 'bg-zinc-800/30' : 'hover:bg-zinc-800/20'
                    }`}
                  >
                    <Icon size={14} className={prayer.color} />
                    <span className={`text-[12px] flex-1 text-left font-medium ${
                      isCurrent ? 'text-zinc-100' : isPast && !isChecked ? 'text-zinc-600' : 'text-zinc-300'
                    }`}>
                      {prayer.label}
                    </span>
                    <span className="text-[11px] text-zinc-600 font-mono mr-2">
                      {prayerTimes[i]?.time}
                    </span>
                    <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center transition-all ${
                      isChecked
                        ? 'bg-emerald-500'
                        : 'border border-zinc-700'
                    }`}>
                      {isChecked && <Check size={10} className="text-black" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="h-px bg-zinc-800/40 mx-4" />

            {/* Extra rituals */}
            <div className="px-4 py-3 space-y-1">
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
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isChecked ? 'opacity-50' : 'hover:bg-zinc-800/20'
                    }`}
                  >
                    <span className={`text-[12px] flex-1 text-left font-medium ${isChecked ? 'text-zinc-500' : 'text-zinc-300'}`}>
                      {ritual.label}
                    </span>
                    <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center transition-all ${
                      isChecked
                        ? 'bg-emerald-500'
                        : 'border border-zinc-700'
                    }`}>
                      {isChecked && <Check size={10} className="text-black" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="h-px bg-zinc-800/40 mx-4" />

            {/* Protocols */}
            {onProtocolToggle && onWeeklyActivityToggle && (
              <div className="px-4 py-3">
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

            {/* Divider */}
            <div className="h-px bg-zinc-800/40 mx-4" />

            {/* Note area */}
            <div className="px-4 py-3">
              <textarea
                value={stickyNote}
                onChange={(e) => onStickyNoteUpdate(dateKey, e.target.value)}
                placeholder="Note..."
                className="w-full bg-transparent text-[12px] text-zinc-400 placeholder:text-zinc-700 outline-none resize-none min-h-[80px] leading-relaxed"
              />
            </div>
          </div>
        </aside>
      </div>

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
