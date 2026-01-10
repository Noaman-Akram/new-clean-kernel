import React, { useState, useRef, useEffect } from 'react';
import { AppState, Task, TaskStatus, Category, Severity, PrayerName } from '../types';
import { getPrayerTimesForDate } from '../utils/prayerTimes';
import {
  Plus, Check, X, Circle, CheckCircle2, Clock, ChevronLeft, ChevronRight,
  Sunrise, Sun, CloudSun, Sunset, Moon, Play, Pause, MoreHorizontal,
  Edit2, Calendar as CalendarIcon, Zap, ChevronDown, ChevronUp
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
  activeTaskId: string | null;
}

const PRAYER_ICONS: Record<PrayerName, React.ReactNode> = {
  Fajr: <Sunrise size={12} className="text-orange-400/70" />,
  Dhuhr: <Sun size={12} className="text-yellow-400/70" />,
  Asr: <CloudSun size={12} className="text-amber-400/70" />,
  Maghrib: <Sunset size={12} className="text-rose-400/70" />,
  Isha: <Moon size={12} className="text-indigo-400/70" />
};

const CATEGORY_COLORS: Record<Category, string> = {
  [Category.ZOHO]: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  [Category.FREELANCE]: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  [Category.AGENCY]: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
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
  activeTaskId
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [inputValue, setInputValue] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingTime, setEditingTime] = useState('');
  const [editingTaskMenu, setEditingTaskMenu] = useState<string | null>(null);
  const [showMobileRituals, setShowMobileRituals] = useState(false);
  const [showAllMissed, setShowAllMissed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const dateKey = selectedDate.toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  const isToday = dateKey === today;

  // Get tasks for selected date
  const daysTasks = state.tasks.filter(task => {
    if (task.scheduledTime) {
      const taskDate = new Date(task.scheduledTime).toISOString().split('T')[0];
      return taskDate === dateKey;
    }
    return false;
  }).sort((a, b) => {
    if (a.status === TaskStatus.DONE && b.status !== TaskStatus.DONE) return 1;
    if (a.status !== TaskStatus.DONE && b.status === TaskStatus.DONE) return -1;
    if (a.scheduledTime && b.scheduledTime) return a.scheduledTime - b.scheduledTime;
    return 0;
  });

  // Get missed tasks
  const missedTasks = state.tasks.filter(task => {
    if (task.scheduledTime && task.status !== TaskStatus.DONE) {
      const taskDate = new Date(task.scheduledTime).toISOString().split('T')[0];
      return taskDate < today;
    }
    return false;
  }).sort((a, b) => (b.scheduledTime || 0) - (a.scheduledTime || 0));

  // Prayer times
  const prayerTimes = getPrayerTimesForDate(selectedDate);

  // Athkar & habits
  const athkarList = ['Morning Athkar', 'Evening Athkar', 'Quran Reading'];
  const habitsList = ['Workout', 'Journal'];

  // Calculate ritual completion
  const totalRituals = prayerTimes.length + athkarList.length + habitsList.length;
  const completedRituals =
    prayerTimes.filter(p => state.prayerLog[`${dateKey}-${p.name}`]).length +
    athkarList.filter(a => state.adhkarLog[`${dateKey}-${a.replace(/\s+/g, '-')}`]).length +
    habitsList.filter(h => state.adhkarLog[`${dateKey}-${h}`]).length;

  const stickyNote = state.stickyNotes[dateKey] || '';

  // Navigate days
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Handle quick add
  const handleQuickAdd = () => {
    if (!inputValue.trim()) return;

    const timeMatch = inputValue.match(/@(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    let scheduledTime: number;

    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3]?.toLowerCase();

      if (ampm === 'pm' && hours !== 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;

      const scheduleDate = new Date(selectedDate);
      scheduleDate.setHours(hours, minutes, 0, 0);
      scheduledTime = scheduleDate.getTime();
    } else {
      const scheduleDate = new Date(selectedDate);
      scheduleDate.setHours(12, 0, 0, 0);
      scheduledTime = scheduleDate.getTime();
    }

    const title = inputValue.replace(/@(\d{1,2}):?(\d{2})?\s*(am|pm)?/i, '').trim();
    onTaskAdd(title, Category.ZOHO, 'MED', { scheduledTime });
    setInputValue('');
    inputRef.current?.focus();
  };

  // Handle task complete
  const handleToggleComplete = (task: Task) => {
    const newStatus = task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
    onTaskUpdate(task.id, { status: newStatus });
  };

  // Handle inline edit
  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
    setEditingTime(task.scheduledTime ? formatTime(task.scheduledTime) : '');
    setEditingTaskMenu(null);
  };

  const saveEdit = () => {
    if (editingTaskId && editingTitle.trim()) {
      const updates: Partial<Task> = { title: editingTitle };

      // Parse time if changed
      if (editingTime) {
        const timeMatch = editingTime.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          const ampm = timeMatch[3]?.toLowerCase();

          if (ampm === 'pm' && hours !== 12) hours += 12;
          if (ampm === 'am' && hours === 12) hours = 0;

          const scheduleDate = new Date(selectedDate);
          scheduleDate.setHours(hours, minutes, 0, 0);
          updates.scheduledTime = scheduleDate.getTime();
        }
      }

      onTaskUpdate(editingTaskId, updates);
    }
    setEditingTaskId(null);
    setEditingTitle('');
    setEditingTime('');
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditingTitle('');
    setEditingTime('');
  };

  // Handle add missed to today
  const handleAddToToday = (task: Task) => {
    const todayDate = new Date();
    if (task.scheduledTime) {
      const oldTime = new Date(task.scheduledTime);
      todayDate.setHours(oldTime.getHours(), oldTime.getMinutes());
    } else {
      todayDate.setHours(12, 0);
    }
    onTaskUpdate(task.id, { scheduledTime: todayDate.getTime() });
  };

  // Handle reschedule
  const handleReschedule = (task: Task, daysOffset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + daysOffset);

    if (task.scheduledTime) {
      const oldTime = new Date(task.scheduledTime);
      newDate.setHours(oldTime.getHours(), oldTime.getMinutes());
    } else {
      newDate.setHours(12, 0);
    }

    onTaskUpdate(task.id, { scheduledTime: newDate.getTime() });
    setEditingTaskMenu(null);
  };

  // Handle category change
  const handleCategoryChange = (taskId: string, category: Category) => {
    onTaskUpdate(taskId, { category });
    setEditingTaskMenu(null);
  };

  // Handle impact change
  const handleImpactChange = (taskId: string, impact: Severity) => {
    onTaskUpdate(taskId, { impact });
    setEditingTaskMenu(null);
  };

  // Format time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')}${ampm}`;
  };

  // Get relative date
  const getRelativeDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const dateKey = date.toISOString().split('T')[0];
    const daysDiff = Math.floor((new Date(today).getTime() - new Date(dateKey).getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) return 'Yesterday';
    if (daysDiff === 2) return '2 days ago';
    if (daysDiff <= 7) return `${daysDiff} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const pendingTasks = daysTasks.filter(t => t.status !== TaskStatus.DONE);
  const completedTasks = daysTasks.filter(t => t.status === TaskStatus.DONE);
  const activeTask = pendingTasks.find(t => t.id === activeTaskId);

  useEffect(() => {
    if (editingTaskId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTaskId]);

  // Close menu on click outside
  useEffect(() => {
    const handleClick = () => setEditingTaskMenu(null);
    if (editingTaskMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [editingTaskMenu]);

  return (
    <div className="h-full flex bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-8 py-6 border-b border-border/30">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <button
              onClick={goToPreviousDay}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="text-center">
              <h1 className="text-base font-normal text-zinc-300">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h1>
              <div className="flex items-center gap-3 justify-center mt-1">
                {!isToday && (
                  <button
                    onClick={goToToday}
                    className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    Today
                  </button>
                )}
                <button
                  onClick={() => setShowMobileRituals(!showMobileRituals)}
                  className="lg:hidden text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  Rituals {completedRituals}/{totalRituals}
                </button>
              </div>
            </div>

            <button
              onClick={goToNextDay}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Mobile Rituals */}
        {showMobileRituals && (
          <div className="lg:hidden shrink-0 px-8 py-4 border-b border-border/30 bg-surface/10 animate-fade-in">
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Progress */}
              <div className="h-1 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600/40 transition-all duration-300"
                  style={{ width: `${(completedRituals / totalRituals) * 100}%` }}
                />
              </div>

              {/* Compact rituals */}
              <div className="flex flex-wrap gap-2">
                {prayerTimes.map(prayer => {
                  const prayerKey = `${dateKey}-${prayer.name}`;
                  const isCompleted = state.prayerLog[prayerKey] || false;
                  return (
                    <button
                      key={prayer.name}
                      onClick={() => onPrayerToggle(prayerKey)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        isCompleted ? 'bg-emerald-600/20 text-emerald-400' : 'bg-surface/50 text-zinc-500'
                      }`}
                    >
                      {prayer.name}
                    </button>
                  );
                })}
                {athkarList.map(athkar => {
                  const athkarKey = `${dateKey}-${athkar.replace(/\s+/g, '-')}`;
                  const isCompleted = state.adhkarLog[athkarKey] || false;
                  return (
                    <button
                      key={athkar}
                      onClick={() => onAdhkarToggle(athkarKey)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        isCompleted ? 'bg-emerald-600/20 text-emerald-400' : 'bg-surface/50 text-zinc-500'
                      }`}
                    >
                      {athkar.replace(' Athkar', '').replace(' Reading', '')}
                    </button>
                  );
                })}
                {habitsList.map(habit => {
                  const habitKey = `${dateKey}-${habit}`;
                  const isCompleted = state.adhkarLog[habitKey] || false;
                  return (
                    <button
                      key={habit}
                      onClick={() => onAdhkarToggle(habitKey)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        isCompleted ? 'bg-emerald-600/20 text-emerald-400' : 'bg-surface/50 text-zinc-500'
                      }`}
                    >
                      {habit}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tasks */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Active task banner */}
            {activeTask && (
              <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-emerald-400/70 uppercase tracking-wider">Active</span>
                </div>
                <h3 className="text-sm text-zinc-200 mb-3">{activeTask.title}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleComplete(activeTask)}
                    className="px-3 py-1.5 bg-emerald-500 text-black text-xs font-medium rounded hover:bg-emerald-400 transition-colors"
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => onTaskUpdate(activeTask.id, { status: TaskStatus.TODO })}
                    className="px-3 py-1.5 bg-surface text-zinc-400 text-xs rounded hover:bg-zinc-800 transition-colors"
                  >
                    Pause
                  </button>
                </div>
              </div>
            )}

            {/* Missed tasks */}
            {isToday && missedTasks.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs text-amber-500/60">
                    {missedTasks.length} from previous days
                  </span>
                  {missedTasks.length > 3 && (
                    <button
                      onClick={() => setShowAllMissed(!showAllMissed)}
                      className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      {showAllMissed ? 'Show less' : 'Show all'}
                    </button>
                  )}
                </div>
                {(showAllMissed ? missedTasks : missedTasks.slice(0, 3)).map(task => (
                  <div
                    key={task.id}
                    className="group flex items-center gap-3 py-2 px-1 hover:bg-surface/30 rounded transition-colors"
                  >
                    <Circle size={14} className="text-zinc-700 shrink-0" strokeWidth={1.5} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-zinc-500 block truncate">{task.title}</span>
                      <span className="text-xs text-zinc-700">
                        {task.scheduledTime && getRelativeDate(task.scheduledTime)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleAddToToday(task)}
                      className="opacity-0 group-hover:opacity-100 text-xs text-zinc-600 hover:text-zinc-400 transition-all px-2 py-1"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => onTaskDelete(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-zinc-500 transition-all"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Today's tasks */}
            {pendingTasks.length === 0 && completedTasks.length === 0 ? (
              <div className="py-20 text-center">
                <Circle size={24} className="mx-auto text-zinc-800 mb-2" strokeWidth={1} />
                <p className="text-sm text-zinc-600">No tasks</p>
              </div>
            ) : (
              <div className="space-y-1">
                {pendingTasks.map(task => {
                  const isActive = task.id === activeTaskId;
                  const isEditing = editingTaskId === task.id;
                  const hasMenu = editingTaskMenu === task.id;

                  return (
                    <div
                      key={task.id}
                      className={`group relative flex items-center gap-3 py-2.5 px-1 rounded transition-colors ${
                        isActive ? 'bg-emerald-950/20' : 'hover:bg-surface/30'
                      }`}
                    >
                      <button
                        onClick={() => handleToggleComplete(task)}
                        className="shrink-0"
                      >
                        <Circle size={16} className="text-zinc-600 hover:text-zinc-400 transition-colors" strokeWidth={1.5} />
                      </button>

                      {isEditing ? (
                        <div className="flex-1 flex flex-col gap-1">
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            onBlur={saveEdit}
                            className="w-full bg-transparent border-none outline-none text-sm text-zinc-200"
                          />
                          <input
                            type="text"
                            value={editingTime}
                            onChange={(e) => setEditingTime(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            placeholder="Time (e.g., 2pm)"
                            className="w-full bg-transparent border-none outline-none text-xs text-zinc-500"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm text-zinc-200">{task.title}</p>
                              {task.impact === 'HIGH' && (
                                <Zap size={10} className="text-amber-500" fill="currentColor" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {task.scheduledTime && (
                                <span className="text-xs text-zinc-700">{formatTime(task.scheduledTime)}</span>
                              )}
                              {task.duration && (
                                <span className="text-xs text-zinc-700">{task.duration}m</span>
                              )}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[task.category]}`}>
                                {task.category}
                              </span>
                            </div>
                          </div>

                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                            <button
                              onClick={() => startEditing(task)}
                              className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={12} />
                            </button>
                            {!isActive && (
                              <button
                                onClick={() => onStartSession(task.id)}
                                className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
                                title="Start"
                              >
                                <Play size={12} />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTaskMenu(hasMenu ? null : task.id);
                              }}
                              className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
                              title="More"
                            >
                              <MoreHorizontal size={12} />
                            </button>
                          </div>

                          {/* Task menu */}
                          {hasMenu && (
                            <div className="absolute right-1 top-full mt-1 w-48 bg-surface border border-border rounded-md shadow-lg z-10 py-1">
                              <div className="px-3 py-1.5 text-[10px] text-zinc-600 uppercase tracking-wider">Reschedule</div>
                              <button
                                onClick={() => handleReschedule(task, 1)}
                                className="w-full px-3 py-1.5 text-xs text-left text-zinc-300 hover:bg-surface-hover transition-colors"
                              >
                                Tomorrow
                              </button>
                              <button
                                onClick={() => handleReschedule(task, 2)}
                                className="w-full px-3 py-1.5 text-xs text-left text-zinc-300 hover:bg-surface-hover transition-colors"
                              >
                                In 2 days
                              </button>
                              <button
                                onClick={() => handleReschedule(task, 7)}
                                className="w-full px-3 py-1.5 text-xs text-left text-zinc-300 hover:bg-surface-hover transition-colors"
                              >
                                Next week
                              </button>
                              <div className="h-px bg-border my-1"></div>
                              <div className="px-3 py-1.5 text-[10px] text-zinc-600 uppercase tracking-wider">Priority</div>
                              {(['HIGH', 'MED', 'LOW'] as Severity[]).map(impact => (
                                <button
                                  key={impact}
                                  onClick={() => handleImpactChange(task.id, impact)}
                                  className="w-full px-3 py-1.5 text-xs text-left text-zinc-300 hover:bg-surface-hover transition-colors"
                                >
                                  {impact} {task.impact === impact && '✓'}
                                </button>
                              ))}
                              <div className="h-px bg-border my-1"></div>
                              <button
                                onClick={() => onTaskDelete(task.id)}
                                className="w-full px-3 py-1.5 text-xs text-left text-red-400 hover:bg-surface-hover transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Completed */}
                {completedTasks.length > 0 && (
                  <>
                    <div className="h-px bg-border/20 my-6"></div>
                    {completedTasks.map(task => (
                      <div
                        key={task.id}
                        className="group flex items-center gap-3 py-2 px-1 hover:bg-surface/20 rounded transition-colors"
                      >
                        <button
                          onClick={() => handleToggleComplete(task)}
                          className="shrink-0"
                        >
                          <CheckCircle2 size={16} className="text-emerald-600/50" fill="currentColor" />
                        </button>
                        <span className="text-sm text-zinc-600 line-through flex-1">{task.title}</span>
                        <button
                          onClick={() => onTaskDelete(task.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-700 hover:text-zinc-500 transition-all"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="shrink-0 px-8 py-4 border-t border-border/30">
          <div className="max-w-2xl mx-auto">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
              placeholder="Add task... (@2pm for time)"
              className="w-full bg-transparent border-none outline-none text-sm text-zinc-300 placeholder:text-zinc-700 py-2"
            />
          </div>
        </div>
      </div>

      {/* Rituals Sidebar */}
      <div className="w-64 shrink-0 border-l border-border/30 bg-surface/10 overflow-y-auto hidden lg:block">
        <div className="p-6 space-y-6">
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-600">Daily Rituals</span>
              <span className="text-xs text-zinc-700">{completedRituals}/{totalRituals}</span>
            </div>
            <div className="h-1 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600/40 transition-all duration-300"
                style={{ width: `${(completedRituals / totalRituals) * 100}%` }}
              />
            </div>
          </div>

          {/* Prayers */}
          <div className="space-y-1.5">
            {prayerTimes.map(prayer => {
              const prayerKey = `${dateKey}-${prayer.name}`;
              const isCompleted = state.prayerLog[prayerKey] || false;

              return (
                <button
                  key={prayer.name}
                  onClick={() => onPrayerToggle(prayerKey)}
                  className="w-full flex items-center justify-between py-2 px-2 rounded hover:bg-surface/30 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    {PRAYER_ICONS[prayer.name]}
                    <span className="text-xs text-zinc-400">{prayer.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-700">{prayer.time}</span>
                    <div className={`w-3.5 h-3.5 rounded-full border transition-all ${
                      isCompleted ? 'bg-emerald-600/20 border-emerald-600/40' : 'border-zinc-800'
                    }`}>
                      {isCompleted && <Check size={10} className="text-emerald-500 m-0.5" strokeWidth={3} />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="h-px bg-border/20"></div>

          {/* Athkar */}
          <div className="space-y-1.5">
            {athkarList.map(athkar => {
              const athkarKey = `${dateKey}-${athkar.replace(/\s+/g, '-')}`;
              const isCompleted = state.adhkarLog[athkarKey] || false;

              return (
                <button
                  key={athkar}
                  onClick={() => onAdhkarToggle(athkarKey)}
                  className="w-full flex items-center justify-between py-2 px-2 rounded hover:bg-surface/30 transition-colors"
                >
                  <span className="text-xs text-zinc-400">{athkar}</span>
                  <div className={`w-3.5 h-3.5 rounded-full border transition-all ${
                    isCompleted ? 'bg-emerald-600/20 border-emerald-600/40' : 'border-zinc-800'
                  }`}>
                    {isCompleted && <Check size={10} className="text-emerald-500 m-0.5" strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="h-px bg-border/20"></div>

          {/* Habits */}
          <div className="space-y-1.5">
            {habitsList.map(habit => {
              const habitKey = `${dateKey}-${habit}`;
              const isCompleted = state.adhkarLog[habitKey] || false;

              return (
                <button
                  key={habit}
                  onClick={() => onAdhkarToggle(habitKey)}
                  className="w-full flex items-center justify-between py-2 px-2 rounded hover:bg-surface/30 transition-colors"
                >
                  <span className="text-xs text-zinc-400">{habit}</span>
                  <div className={`w-3.5 h-3.5 rounded-full border transition-all ${
                    isCompleted ? 'bg-emerald-600/20 border-emerald-600/40' : 'border-zinc-800'
                  }`}>
                    {isCompleted && <Check size={10} className="text-emerald-500 m-0.5" strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="h-px bg-border/20"></div>

          {/* Note */}
          <div>
            <textarea
              value={stickyNote}
              onChange={(e) => onStickyNoteUpdate(dateKey, e.target.value)}
              placeholder="Note..."
              className="w-full bg-surface/30 border border-border/20 rounded px-3 py-2 text-xs text-zinc-400 placeholder:text-zinc-800 outline-none focus:border-border/40 resize-none transition-colors"
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayView;
