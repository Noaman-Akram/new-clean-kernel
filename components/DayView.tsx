import React, { useState, useRef } from 'react';
import { AppState, Task, TaskStatus, Category, Severity, PrayerName } from '../types';
import { getPrayerTimesForDate } from '../utils/prayerTimes';
import {
  Plus, Check, X, Circle, CheckCircle2, Clock, ChevronLeft, ChevronRight,
  Sunrise, Sun, CloudSun, Sunset, Moon, Play
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
  const inputRef = useRef<HTMLInputElement>(null);

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
  });

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

  // Get task count for date
  const getTaskCountForDate = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    const tasks = state.tasks.filter(task => {
      if (task.scheduledTime) {
        const taskDate = new Date(task.scheduledTime).toISOString().split('T')[0];
        return taskDate === dateKey;
      }
      return false;
    });
    const completed = tasks.filter(t => t.status === TaskStatus.DONE).length;
    const total = tasks.length;
    return { completed, total };
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

  // Format time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')}${ampm}`;
  };

  const yesterday = new Date(selectedDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(selectedDate);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yesterdayStats = getTaskCountForDate(yesterday);
  const tomorrowStats = getTaskCountForDate(tomorrow);

  const pendingTasks = daysTasks.filter(t => t.status !== TaskStatus.DONE);
  const completedTasks = daysTasks.filter(t => t.status === TaskStatus.DONE);

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
              {!isToday && (
                <button
                  onClick={goToToday}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors mt-1"
                >
                  Go to today
                </button>
              )}
            </div>

            <button
              onClick={goToNextDay}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Tasks */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Missed tasks */}
            {isToday && missedTasks.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-amber-500/60 mb-3 px-1">
                  {missedTasks.length} from previous days
                </div>
                {missedTasks.slice(0, 3).map(task => (
                  <div
                    key={task.id}
                    className="group flex items-center gap-3 py-2 px-1 hover:bg-surface/30 rounded transition-colors"
                  >
                    <Circle size={14} className="text-zinc-700 shrink-0" strokeWidth={1.5} />
                    <span className="text-sm text-zinc-500 flex-1">{task.title}</span>
                    <button
                      onClick={() => handleAddToToday(task)}
                      className="opacity-0 group-hover:opacity-100 text-xs text-zinc-600 hover:text-zinc-400 transition-all"
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
                {missedTasks.length > 3 && (
                  <div className="text-xs text-zinc-700 px-1 pt-1">
                    +{missedTasks.length - 3} more
                  </div>
                )}
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
                  return (
                    <div
                      key={task.id}
                      className={`group flex items-center gap-3 py-2.5 px-1 rounded transition-colors ${
                        isActive ? 'bg-emerald-950/20' : 'hover:bg-surface/30'
                      }`}
                    >
                      <button
                        onClick={() => handleToggleComplete(task)}
                        className="shrink-0"
                      >
                        <Circle size={16} className="text-zinc-600 hover:text-zinc-400 transition-colors" strokeWidth={1.5} />
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200">{task.title}</p>
                        {task.scheduledTime && (
                          <p className="text-xs text-zinc-700 mt-0.5">{formatTime(task.scheduledTime)}</p>
                        )}
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
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
                          onClick={() => onTaskDelete(task.id)}
                          className="p-1 text-zinc-700 hover:text-zinc-500 transition-colors"
                          title="Delete"
                        >
                          <X size={12} />
                        </button>
                      </div>
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
              placeholder="Add task..."
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
