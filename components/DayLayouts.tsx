import React, { useState, useRef, useEffect } from 'react';
import { Task, TaskStatus, TimeBlock, PrayerTime, Category, Severity } from '../types';
import {
  Plus, Check, Circle, CheckCircle2, Clock, Play, Edit2, Trash2,
  GripVertical, X, Sunrise, Sun, CloudSun, Sunset, Moon,
  Inbox, CalendarClock, Timer, CheckCheck
} from 'lucide-react';
import { generateId } from '../utils';

// Shared Props for all layouts
interface DayLayoutProps {
  dateKey: string;
  inboxTasks: Task[];
  scheduledTasks: Task[];
  completedTasks: Task[];
  activeTaskId: string | null;
  prayerTimes: PrayerTime[];
  timeBlocks: TimeBlock[];
  onTaskUpdate: (id: string, updates: Partial<Task>) => void;
  onTaskAdd: (title: string, category: Category, impact: Severity, options?: any) => void;
  onTaskDelete: (id: string) => void;
  onStartSession: (id: string) => void;
  onTaskSelect: (task: Task) => void;
  onTimeBlockAdd: (block: TimeBlock) => void;
  onTimeBlockUpdate: (id: string, updates: Partial<TimeBlock>) => void;
  onTimeBlockDelete: (id: string) => void;
}

// Helper to format time
const formatHour = (hour: number, minute: number = 0): string => {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return minute > 0 ? `${h}:${minute.toString().padStart(2, '0')} ${ampm}` : `${h} ${ampm}`;
};

// Prayer icons - consistent Lucide style
const PRAYER_ICONS: Record<string, React.ReactNode> = {
  'Fajr': <Sunrise size={12} className="text-orange-400" />,
  'Dhuhr': <Sun size={12} className="text-yellow-400" />,
  'Asr': <CloudSun size={12} className="text-amber-400" />,
  'Maghrib': <Sunset size={12} className="text-orange-500" />,
  'Isha': <Moon size={12} className="text-indigo-400" />,
};

// Period icons - Lucide style
const PERIOD_ICONS: Record<string, React.ReactNode> = {
  'morning': <Sunrise size={16} className="text-orange-400" />,
  'afternoon': <Sun size={16} className="text-yellow-400" />,
  'evening': <Moon size={16} className="text-indigo-400" />,
};

// Column icons for Kanban - Lucide style
const COLUMN_ICONS: Record<string, React.ReactNode> = {
  'inbox': <Inbox size={14} className="text-zinc-400" />,
  'scheduled': <CalendarClock size={14} className="text-blue-400" />,
  'inprogress': <Timer size={14} className="text-amber-400" />,
  'done': <CheckCheck size={14} className="text-emerald-400" />,
};

// =====================================================
// LAYOUT A: TIMELINE BAR (Horizontal Scrollable)
// =====================================================
export const DayLayoutTimeline: React.FC<DayLayoutProps> = ({
  dateKey,
  inboxTasks,
  scheduledTasks,
  completedTasks,
  activeTaskId,
  prayerTimes,
  timeBlocks,
  onTaskUpdate,
  onTaskAdd,
  onTaskDelete,
  onStartSession,
  onTaskSelect,
  onTimeBlockAdd,
  onTimeBlockUpdate,
  onTimeBlockDelete,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [newBlockTitle, setNewBlockTitle] = useState('');

  // Auto-scroll to current hour on mount
  useEffect(() => {
    if (timelineRef.current) {
      const currentHour = new Date().getHours();
      const scrollPos = currentHour * 120 - 200;
      timelineRef.current.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
    }
  }, []);

  const handleAddTask = (hour: number = 0) => {
    if (newTaskTitle.trim()) {
      const [y, m, d] = dateKey.split('-').map(Number);
      const scheduledDate = new Date(y, m - 1, d, hour, 0, 0);
      onTaskAdd(newTaskTitle.trim(), Category.CORE, 'MED', {
        scheduledTime: scheduledDate.getTime(),
      });
      setNewTaskTitle('');
    }
  };

  const handleAddBlock = (hour: number) => {
    if (newBlockTitle.trim()) {
      onTimeBlockAdd({
        id: generateId(),
        title: newBlockTitle.trim(),
        startHour: hour,
        startMinute: 0,
        duration: 60,
        type: 'custom',
      });
      setNewBlockTitle('');
      setSelectedHour(null);
    }
  };

  const handleToggleComplete = (task: Task) => {
    onTaskUpdate(task.id, {
      status: task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE,
    });
  };

  const getHourContent = (hour: number) => {
    const hourBlocks = timeBlocks.filter(b => b.startHour === hour);
    const hourPrayers = prayerTimes.filter(p => {
      const pHour = new Date(p.timestamp).getHours();
      return pHour === hour;
    });
    const hourTasks = scheduledTasks.filter(t => {
      if (!t.scheduledTime) return false;
      const tHour = new Date(t.scheduledTime).getHours();
      return tHour === hour;
    });
    return { blocks: hourBlocks, prayers: hourPrayers, tasks: hourTasks };
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* INBOX SECTION */}
      <div className="border-b border-zinc-900 p-4 shrink-0 max-h-[180px] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Inbox size={12} className="text-zinc-600" />
            Day Inbox
          </h3>
          <span className="text-[9px] text-zinc-600 tabular-nums">{inboxTasks.length} tasks</span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            placeholder="Add task for today..."
            className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700"
          />
          <button onClick={handleAddTask} className="p-2 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30">
            <Plus size={14} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {inboxTasks.map(task => (
            <div
              key={task.id}
              onClick={() => onTaskSelect(task)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded border transition-all cursor-pointer ${activeTaskId === task.id
                ? 'bg-emerald-950/30 border-emerald-700'
                : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                } ${task.status === TaskStatus.DONE ? 'opacity-40 grayscale' : ''}`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleComplete(task);
                }}
                className="shrink-0"
              >
                {task.status === TaskStatus.DONE ? (
                  <div className="w-3.5 h-3.5 bg-emerald-500/80 rounded-[2px] flex items-center justify-center">
                    <Check size={10} className="text-black" strokeWidth={4} />
                  </div>
                ) : (
                  <div className="w-3.5 h-3.5 rounded-[2px] border-2 border-zinc-800 group-hover:border-zinc-600 transition-colors" />
                )}
              </button>
              <span className={`text-[11px] font-medium flex-1 ${task.status === TaskStatus.DONE ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}>
                {task.title}
              </span>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {task.status !== TaskStatus.DONE && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartSession(task.id);
                    }}
                    className="text-[9px] font-bold text-emerald-500 hover:text-emerald-400"
                  >
                    START
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTaskDelete(task.id);
                  }}
                  className="text-zinc-600 hover:text-red-500"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
          {inboxTasks.length === 0 && (
            <div className="text-[10px] text-zinc-700 italic py-2">No tasks in inbox</div>
          )}
        </div>
      </div>

      {/* HORIZONTAL TIMELINE */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-4 pb-2 shrink-0">
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Clock size={12} className="text-zinc-600" />
            Schedule
          </h3>
        </div>

        <div
          ref={timelineRef}
          className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden pb-2 px-4"
        >
          <div className="flex gap-3 h-full pb-4" style={{ width: 'max-content', minWidth: '100%' }}>
            {Array.from({ length: 24 }, (_, hour) => {
              const { blocks, prayers, tasks } = getHourContent(hour);
              const isCurrentHour = new Date().getHours() === hour;
              const isPast = new Date().getHours() > hour;

              return (
                <div
                  key={hour}
                  className={`w-[180px] flex-shrink-0 rounded-xl border transition-all flex flex-col ${isCurrentHour
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : isPast
                      ? 'bg-zinc-950/30 border-zinc-900/20 opacity-60 grayscale-[30%]'
                      : 'bg-zinc-900/30 border-zinc-900/50 hover:border-zinc-700'
                    }`}
                >
                  {/* Hour Header */}
                  <div className={`px-4 py-3 border-b flex items-center justify-between shrink-0 ${isCurrentHour ? 'border-emerald-500/20' : 'border-zinc-800/30'
                    }`}>
                    <span className={`text-[11px] font-bold font-mono tracking-tighter ${isCurrentHour ? 'text-emerald-400' : 'text-zinc-600'}`}>
                      {formatHour(hour)}
                    </span>
                    {isCurrentHour && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.4)]" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto no-scrollbar">
                    {prayers.map(prayer => (
                      <div key={prayer.name} className="flex items-center gap-2 text-[10px] text-zinc-500 bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/40">
                        {PRAYER_ICONS[prayer.name]}
                        <span className="font-semibold uppercase tracking-tighter">{prayer.name}</span>
                        <span className="ml-auto text-[9px] text-zinc-700 font-mono">{prayer.time}</span>
                      </div>
                    ))}

                    {tasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => onTaskSelect(task)}
                        className={`group/task p-2.5 rounded-lg border cursor-pointer transition-all ${activeTaskId === task.id
                            ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                            : task.status === TaskStatus.DONE
                              ? 'bg-zinc-950/20 border-zinc-900/50 opacity-40'
                              : 'bg-zinc-900/40 border-zinc-800/60 hover:border-zinc-600 hover:bg-zinc-900/60'
                          }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleComplete(task);
                            }}
                            className="mt-0.5 shrink-0"
                          >
                            {task.status === TaskStatus.DONE ? (
                              <div className="w-3.5 h-3.5 bg-emerald-500/80 rounded-[2px] flex items-center justify-center">
                                <Check size={10} className="text-black" strokeWidth={4} />
                              </div>
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-[2px] border-2 border-zinc-800 group-hover:border-zinc-600 transition-colors" />
                            )}
                          </button>
                          <span className={`text-[11px] leading-tight font-medium flex-1 ${task.status === TaskStatus.DONE ? 'text-zinc-700 line-through' : 'text-zinc-300'
                            }`}>
                            {task.title}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/30 opacity-0 group-hover/task:opacity-100 transition-opacity">
                          {task.status !== TaskStatus.DONE && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onStartSession(task.id);
                              }}
                              className="text-[9px] font-bold text-emerald-500/80 hover:text-emerald-400 tracking-tighter"
                            >
                              START
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTaskDelete(task.id);
                            }}
                            className="text-zinc-700 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {blocks.map(block => (
                      <div
                        key={block.id}
                        className="group p-2.5 bg-blue-950/10 border border-blue-900/20 rounded-lg text-[11px] text-blue-400/70"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="truncate flex-1 font-bold uppercase tracking-tight">{block.title}</span>
                          <button
                            onClick={() => onTimeBlockDelete(block.id)}
                            className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-500 transition-opacity"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                        <div className="text-[9px] text-zinc-700 mt-1 uppercase tracking-widest font-mono font-bold">{block.duration}m</div>
                      </div>
                    ))}

                    {selectedHour === hour ? (
                      <div className="space-y-1.5 p-2 bg-zinc-900/60 border border-zinc-800 rounded-lg animate-in fade-in slide-in-from-top-1">
                        <input
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddTask(hour)}
                          placeholder="Task title..."
                          className="w-full bg-black/40 border border-zinc-800 rounded px-2.5 py-1.5 text-[11px] text-zinc-300 focus:outline-none focus:border-emerald-500/40"
                          autoFocus
                        />
                        <div className="flex gap-1.5">
                          <button onClick={() => handleAddTask(hour)} className="flex-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 rounded py-1.5 border border-emerald-500/20 uppercase tracking-tighter">TASK</button>
                          <button onClick={() => setSelectedHour(null)} className="px-3 text-[10px] font-bold text-zinc-600 hover:text-zinc-400 transition-colors uppercase">X</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedHour(hour)}
                        className="w-full py-2 text-[10px] text-zinc-700 hover:text-zinc-500 border border-dashed border-zinc-800/50 rounded-lg hover:bg-zinc-800/20 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Plus size={10} />
                        CREATE
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prayer Markers Row */}
        <div className="px-4 py-2 border-t border-zinc-900 flex items-center gap-4 shrink-0">
          {prayerTimes.map(prayer => (
            <div key={prayer.name} className="flex items-center gap-1.5">
              {PRAYER_ICONS[prayer.name]}
              <span className="text-[9px] text-zinc-500">{prayer.name}</span>
              <span className="text-[9px] text-zinc-600">{prayer.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* COMPLETED SECTION */}
      {completedTasks.length > 0 && (
        <div className="border-t border-zinc-900 p-4 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={12} className="text-emerald-500/50" />
            <span className="text-[10px] text-zinc-600">{completedTasks.length} completed</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {completedTasks.slice(0, 5).map(task => (
              <span key={task.id} className="text-[10px] text-zinc-700 line-through">{task.title}</span>
            ))}
            {completedTasks.length > 5 && <span className="text-[10px] text-zinc-700">+{completedTasks.length - 5} more</span>}
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================================
// LAYOUT B: PERIODS (Morning / Afternoon / Evening)
// =====================================================
export const DayLayoutPeriods: React.FC<DayLayoutProps> = ({
  dateKey,
  inboxTasks,
  scheduledTasks,
  completedTasks,
  activeTaskId,
  prayerTimes,
  timeBlocks,
  onTaskUpdate,
  onTaskAdd,
  onTaskDelete,
  onStartSession,
  onTaskSelect,
  onTimeBlockAdd,
  onTimeBlockUpdate,
  onTimeBlockDelete,
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingToPeriod, setAddingToPeriod] = useState<string | null>(null);
  const [newBlockTitle, setNewBlockTitle] = useState('');

  const periods = [
    { id: 'morning', label: 'Morning', hours: [5, 6, 7, 8, 9, 10, 11], range: '5AM – 12PM' },
    { id: 'afternoon', label: 'Afternoon', hours: [12, 13, 14, 15, 16, 17], range: '12PM – 6PM' },
    { id: 'evening', label: 'Evening', hours: [18, 19, 20, 21, 22, 23], range: '6PM – 12AM' },
  ];

  const handleAddTask = (hour: number = 0) => {
    if (newTaskTitle.trim()) {
      const [y, m, d] = dateKey.split('-').map(Number);
      const scheduledDate = new Date(y, m - 1, d, hour, 0, 0);
      onTaskAdd(newTaskTitle.trim(), Category.CORE, 'MED', {
        scheduledTime: scheduledDate.getTime(),
      });
      setNewTaskTitle('');
    }
  };

  const handleAddBlockToPeriod = (periodId: string, startHour: number) => {
    if (newBlockTitle.trim()) {
      onTimeBlockAdd({
        id: generateId(),
        title: newBlockTitle.trim(),
        startHour,
        startMinute: 0,
        duration: 60,
        type: 'custom',
      });
      setNewBlockTitle('');
      setAddingToPeriod(null);
    }
  };

  const handleToggleComplete = (task: Task) => {
    onTaskUpdate(task.id, {
      status: task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE,
    });
  };

  const getPeriodContent = (hours: number[]) => {
    const blocks = timeBlocks.filter(b => hours.includes(b.startHour));
    const prayers = prayerTimes.filter(p => {
      const pHour = new Date(p.timestamp).getHours();
      return hours.includes(pHour);
    });
    const tasks = scheduledTasks.filter(t => {
      if (!t.scheduledTime) return false;
      const tHour = new Date(t.scheduledTime).getHours();
      return hours.includes(tHour);
    });
    return { blocks, prayers, tasks };
  };

  const currentHour = new Date().getHours();
  const currentPeriod = periods.find(p => p.hours.includes(currentHour))?.id || 'morning';

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* INBOX SECTION */}
      <div className="border-b border-zinc-900 p-4 shrink-0 max-h-[200px] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Inbox size={12} className="text-zinc-600" />
            Inbox
          </h3>
          <span className="text-[9px] text-zinc-600 tabular-nums">{inboxTasks.length} tasks</span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            placeholder="Add task for today..."
            className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700"
          />
          <button onClick={handleAddTask} className="p-2 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30">
            <Plus size={14} />
          </button>
        </div>

        <div className="space-y-1 max-h-[100px] overflow-y-auto">
          {inboxTasks.map(task => (
            <div
              key={task.id}
              className={`group flex items-center gap-3 px-3 py-2 rounded border transition-all ${activeTaskId === task.id
                ? 'bg-emerald-950/30 border-emerald-700'
                : 'bg-zinc-900/30 border-zinc-800/50 hover:border-zinc-700'
                }`}
            >
              <button onClick={() => handleToggleComplete(task)} className="shrink-0">
                <Circle size={14} className="text-zinc-600 hover:text-zinc-400" />
              </button>
              <span className="flex-1 text-sm text-zinc-300">{task.title}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                <button onClick={() => onStartSession(task.id)} className="p-1 text-zinc-600 hover:text-emerald-400">
                  <Play size={12} />
                </button>
                <button onClick={() => onTaskSelect(task)} className="p-1 text-zinc-600 hover:text-white">
                  <Edit2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {inboxTasks.length === 0 && (
            <div className="text-[11px] text-zinc-700 italic py-4 text-center">No tasks - add one above</div>
          )}
        </div>
      </div>

      {/* PERIODS GRID */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full min-h-[300px]">
          {periods.map(period => {
            const { blocks, prayers, tasks } = getPeriodContent(period.hours);
            const isCurrent = period.id === currentPeriod;

            return (
              <div
                key={period.id}
                className={`flex flex-col rounded-lg border transition-all ${isCurrent
                  ? 'bg-emerald-950/10 border-emerald-800/40'
                  : 'bg-zinc-900/20 border-zinc-800/50'
                  }`}
              >
                {/* Period Header */}
                <div className={`px-4 py-3 border-b shrink-0 ${isCurrent ? 'border-emerald-800/40' : 'border-zinc-800/50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {PERIOD_ICONS[period.id]}
                      <div>
                        <div className={`text-sm font-bold ${isCurrent ? 'text-emerald-400' : 'text-zinc-300'}`}>
                          {period.label}
                        </div>
                        <div className="text-[9px] text-zinc-600">{period.range}</div>
                      </div>
                    </div>
                    {isCurrent && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                  </div>
                </div>

                {/* Period Content */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
                  {prayers.map(prayer => (
                    <div
                      key={prayer.name}
                      className="flex items-center gap-3 px-3 py-2.5 bg-zinc-900/40 border border-zinc-800/40 rounded-lg group/prayer transition-all hover:bg-zinc-800/40"
                    >
                      {PRAYER_ICONS[prayer.name]}
                      <span className="text-[11px] font-medium text-zinc-400 flex-1 uppercase tracking-tight">{prayer.name}</span>
                      <span className="text-[10px] text-zinc-600 font-mono">{prayer.time}</span>
                      <Circle size={10} className="text-zinc-800" />
                    </div>
                  ))}

                  {tasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => onTaskSelect(task)}
                      className={`group/task p-2.5 rounded-lg border cursor-pointer transition-all ${activeTaskId === task.id
                        ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                        : task.status === TaskStatus.DONE
                          ? 'bg-zinc-950/20 border-zinc-900/50 opacity-40'
                          : 'bg-zinc-900/40 border-zinc-800/60 hover:border-zinc-600 hover:bg-zinc-900/60'
                        }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleComplete(task);
                          }}
                          className="mt-0.5 shrink-0"
                        >
                          {task.status === TaskStatus.DONE ? (
                            <div className="w-3.5 h-3.5 bg-emerald-500/80 rounded-[2px] flex items-center justify-center">
                              <Check size={10} className="text-black" strokeWidth={4} />
                            </div>
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-[2px] border-2 border-zinc-800 group-hover:border-zinc-600 transition-colors" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className={`text-[11px] leading-tight font-medium ${task.status === TaskStatus.DONE ? 'text-zinc-700 line-through' : 'text-zinc-300'
                            }`}>
                            {task.title}
                          </div>
                          <div className="text-[9px] text-zinc-600 font-mono mt-1 opacity-60 group-hover/task:opacity-100">
                            {formatHour(new Date(task.scheduledTime!).getHours(), new Date(task.scheduledTime!).getMinutes())}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/30 opacity-0 group-hover/task:opacity-100 transition-opacity">
                        {task.status !== TaskStatus.DONE && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartSession(task.id);
                            }}
                            className="text-[9px] font-bold text-emerald-500/80 hover:text-emerald-400 tracking-tighter"
                          >
                            START
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskDelete(task.id);
                          }}
                          className="ml-auto text-zinc-700 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {blocks.map(block => (
                    <div
                      key={block.id}
                      className="group flex items-center gap-3 px-3 py-2.5 bg-blue-950/20 border border-blue-900/30 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold text-blue-400/90 truncate uppercase tracking-tight">{block.title}</div>
                        <div className="text-[9px] text-zinc-600 font-mono mt-0.5">
                          {formatHour(block.startHour, block.startMinute)} — {block.duration}M
                        </div>
                      </div>
                      <button
                        onClick={() => onTimeBlockDelete(block.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-700 hover:text-red-500 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}

                  {addingToPeriod === period.id ? (
                    <div className="space-y-2 p-2 bg-zinc-900/50 rounded border border-zinc-800">
                      <input
                        value={newBlockTitle}
                        onChange={(e) => setNewBlockTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddBlockToPeriod(period.id, period.hours[0])}
                        placeholder="Block title..."
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-[11px] text-zinc-300 focus:outline-none"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAddBlockToPeriod(period.id, period.hours[0])}
                          className="flex-1 text-[10px] bg-emerald-500/20 text-emerald-400 rounded py-1"
                        >
                          Add Block
                        </button>
                        <button
                          onClick={() => setAddingToPeriod(null)}
                          className="px-3 text-[10px] text-zinc-600 hover:text-zinc-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingToPeriod(period.id)}
                      className="w-full py-2 text-[10px] text-zinc-600 hover:text-zinc-400 border border-dashed border-zinc-800 rounded hover:border-zinc-700 flex items-center justify-center gap-1"
                    >
                      <Plus size={12} />
                      Add Block
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* COMPLETED SECTION */}
      {completedTasks.length > 0 && (
        <div className="border-t border-zinc-900 px-4 py-3 flex items-center gap-3 shrink-0">
          <CheckCircle2 size={14} className="text-emerald-500/50" />
          <span className="text-[10px] text-zinc-600">{completedTasks.length} completed today</span>
          <div className="flex-1 flex gap-2 overflow-hidden">
            {completedTasks.slice(0, 3).map(task => (
              <span key={task.id} className="text-[10px] text-zinc-700 line-through truncate">{task.title}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================================
// LAYOUT C: KANBAN (Inbox / Scheduled / In Progress / Done)
// =====================================================
export const DayLayoutKanban: React.FC<DayLayoutProps> = ({
  dateKey,
  inboxTasks,
  scheduledTasks,
  completedTasks,
  activeTaskId,
  prayerTimes,
  timeBlocks,
  onTaskUpdate,
  onTaskAdd,
  onTaskDelete,
  onStartSession,
  onTaskSelect,
  onTimeBlockAdd,
  onTimeBlockUpdate,
  onTimeBlockDelete,
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const inProgressTasks = [...inboxTasks, ...scheduledTasks].filter(t => t.status === TaskStatus.IN_PROGRESS);
  const todoTasks = inboxTasks.filter(t => t.status !== TaskStatus.IN_PROGRESS && t.status !== TaskStatus.DONE);

  const columns = [
    { id: 'inbox', label: 'Inbox', tasks: todoTasks, color: 'zinc' },
    { id: 'scheduled', label: 'Scheduled', tasks: scheduledTasks.filter(t => t.status !== TaskStatus.IN_PROGRESS && t.status !== TaskStatus.DONE), color: 'blue' },
    { id: 'inprogress', label: 'In Progress', tasks: inProgressTasks, color: 'amber' },
    { id: 'done', label: 'Done', tasks: completedTasks, color: 'emerald' },
  ];

  const handleAddTask = (columnId: string) => {
    if (newTaskTitle.trim()) {
      const options: any = {};
      if (columnId === 'scheduled') {
        options.scheduledTime = Date.now();
      }
      onTaskAdd(newTaskTitle.trim(), Category.CORE, 'MED', options);
      setNewTaskTitle('');
      setAddingToColumn(null);
    }
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (columnId: string) => {
    if (!draggedTask) return;

    const updates: Partial<Task> = {};

    switch (columnId) {
      case 'inbox':
        updates.scheduledTime = null;
        updates.status = TaskStatus.TODO;
        break;
      case 'scheduled':
        updates.scheduledTime = Date.now();
        updates.status = TaskStatus.TODO;
        break;
      case 'inprogress':
        updates.status = TaskStatus.IN_PROGRESS;
        onStartSession(draggedTask.id);
        break;
      case 'done':
        updates.status = TaskStatus.DONE;
        break;
    }

    onTaskUpdate(draggedTask.id, updates);
    setDraggedTask(null);
  };

  const handleToggleComplete = (task: Task) => {
    onTaskUpdate(task.id, {
      status: task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE,
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* KANBAN BOARD */}
      <div className="flex-1 min-h-0 overflow-auto p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 h-full min-h-[350px]">
          {columns.map(column => (
            <div
              key={column.id}
              className={`flex flex-col rounded-lg border bg-zinc-900/20 border-zinc-800/50 ${draggedTask ? 'border-dashed' : ''
                }`}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column.id)}
            >
              {/* Column Header */}
              <div className="px-3 py-2 border-b border-zinc-800/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  {COLUMN_ICONS[column.id]}
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">{column.label}</span>
                </div>
                <span className="text-[10px] text-zinc-600 tabular-nums">{column.tasks.length}</span>
              </div>

              {/* Column Content */}
              <div className="flex-1 p-2 space-y-2 overflow-auto">
                {column.tasks.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task)}
                    onClick={() => onTaskSelect(task)}
                    className={`group/task p-2.5 rounded-lg border cursor-move transition-all ${activeTaskId === task.id
                      ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                      : column.id === 'done'
                        ? 'bg-zinc-950/20 border-zinc-900/50 opacity-40'
                        : 'bg-zinc-900/40 border-zinc-800/60 hover:border-zinc-600 hover:bg-zinc-900/60'
                      }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleComplete(task);
                        }}
                        className="mt-0.5 shrink-0"
                      >
                        {task.status === TaskStatus.DONE ? (
                          <div className="w-3.5 h-3.5 bg-emerald-500/80 rounded-[2px] flex items-center justify-center">
                            <Check size={10} className="text-black" strokeWidth={4} />
                          </div>
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-[2px] border-2 border-zinc-800 group-hover:border-zinc-600 transition-colors" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[11px] leading-tight font-medium ${task.status === TaskStatus.DONE ? 'text-zinc-700 line-through' : 'text-zinc-300'
                          }`}>
                          {task.title}
                        </div>
                        {task.scheduledTime && column.id === 'scheduled' && (
                          <div className="text-[9px] text-zinc-600 font-mono mt-1 opacity-60">
                            {new Date(task.scheduledTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/30 opacity-0 group-hover/task:opacity-100 transition-opacity">
                      {task.status !== TaskStatus.DONE && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartSession(task.id);
                          }}
                          className="text-[9px] font-bold text-emerald-500/80 hover:text-emerald-400 tracking-tighter"
                        >
                          START
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskDelete(task.id);
                        }}
                        className="ml-auto text-zinc-700 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                {(column.id === 'inbox' || column.id === 'scheduled') && (
                  addingToColumn === column.id ? (
                    <div className="space-y-1 p-2 bg-zinc-900/50 rounded border border-zinc-800">
                      <input
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTask(column.id)}
                        placeholder="Task title..."
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-[11px] text-zinc-300 focus:outline-none"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <button onClick={() => handleAddTask(column.id)} className="flex-1 text-[10px] bg-emerald-500/20 text-emerald-400 rounded py-1">Add</button>
                        <button onClick={() => setAddingToColumn(null)} className="px-2 text-[10px] text-zinc-600">X</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingToColumn(column.id)}
                      className="w-full py-2 text-[10px] text-zinc-600 hover:text-zinc-400 border border-dashed border-zinc-800 rounded hover:border-zinc-700"
                    >
                      + Add Task
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RITUALS & HABITS BAR */}
      <div className="border-t border-zinc-900 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Moon size={12} className="text-zinc-600" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Prayers</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {prayerTimes.map(prayer => (
            <div key={prayer.name} className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900/50 rounded border border-zinc-800/50">
              {PRAYER_ICONS[prayer.name]}
              <span className="text-[10px] text-zinc-400">{prayer.name}</span>
              <span className="text-[9px] text-zinc-600">{prayer.time}</span>
              <Circle size={12} className="text-zinc-700 ml-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default { DayLayoutTimeline, DayLayoutPeriods, DayLayoutKanban };
