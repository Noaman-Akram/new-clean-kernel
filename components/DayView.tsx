import React, { useState, useRef, useEffect } from 'react';
import { AppState, Task, TaskStatus, Category, Severity, PrayerName } from '../types';
import { getPrayerTimesForDate } from '../utils/prayerTimes';
import {
  Plus, Check, X, Circle, CheckCircle2, Clock, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, Sparkles, Calendar as CalendarIcon,
  Sunrise, Sun, CloudSun, Sunset, Moon, Play, Pause, ArrowRight, SkipForward
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
  Fajr: <Sunrise size={14} className="text-orange-400" />,
  Dhuhr: <Sun size={14} className="text-yellow-400" />,
  Asr: <CloudSun size={14} className="text-amber-400" />,
  Maghrib: <Sunset size={14} className="text-rose-400" />,
  Isha: <Moon size={14} className="text-indigo-400" />
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
  const [showStaging, setShowStaging] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showMissedTasks, setShowMissedTasks] = useState(true);
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
    // Sort by status first (in_progress, todo, done), then by time
    const statusOrder = { [TaskStatus.IN_PROGRESS]: 0, [TaskStatus.TODO]: 1, [TaskStatus.DONE]: 2 };
    const statusDiff = (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
    if (statusDiff !== 0) return statusDiff;
    if (a.scheduledTime && b.scheduledTime) return a.scheduledTime - b.scheduledTime;
    return 0;
  });

  // Get missed tasks from previous days
  const missedTasks = state.tasks.filter(task => {
    if (task.scheduledTime && task.status !== TaskStatus.DONE) {
      const taskDate = new Date(task.scheduledTime).toISOString().split('T')[0];
      return taskDate < today;
    }
    return false;
  }).sort((a, b) => (b.scheduledTime || 0) - (a.scheduledTime || 0));

  // Categorize today's tasks
  const onThePad = daysTasks.find(t => t.status === TaskStatus.IN_PROGRESS) ||
                    daysTasks.find(t => t.status === TaskStatus.TODO);
  const inStaging = daysTasks.filter(t =>
    t.id !== onThePad?.id &&
    t.status === TaskStatus.TODO
  ).slice(0, 3);
  const inQueue = daysTasks.filter(t =>
    t.id !== onThePad?.id &&
    !inStaging.includes(t) &&
    t.status === TaskStatus.TODO
  );
  const completed = daysTasks.filter(t => t.status === TaskStatus.DONE);

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

  // Get sticky note
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

  // Get task count for a date
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

  // Handle task actions
  const handleComplete = (task: Task) => {
    onTaskUpdate(task.id, { status: TaskStatus.DONE });
  };

  const handleReschedule = (task: Task, newDate: Date) => {
    const scheduleDate = new Date(newDate);
    if (task.scheduledTime) {
      const oldTime = new Date(task.scheduledTime);
      scheduleDate.setHours(oldTime.getHours(), oldTime.getMinutes());
    } else {
      scheduleDate.setHours(12, 0);
    }
    onTaskUpdate(task.id, { scheduledTime: scheduleDate.getTime() });
  };

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

  // Get date display for missed task
  const getRelativeDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const dateKey = date.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const daysDiff = Math.floor((new Date(today).getTime() - new Date(dateKey).getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) return 'Yesterday';
    if (daysDiff === 2) return '2 days ago';
    if (daysDiff <= 7) return `${daysDiff} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get previous and next day stats
  const yesterday = new Date(selectedDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(selectedDate);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yesterdayStats = getTaskCountForDate(yesterday);
  const tomorrowStats = getTaskCountForDate(tomorrow);

  return (
    <div className="h-full flex bg-background">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Day Switcher Header */}
        <div className="shrink-0 px-8 py-4 border-b border-border/40">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              {/* Previous Day */}
              <button
                onClick={goToPreviousDay}
                className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <ChevronLeft size={14} />
                <div className="text-right hidden sm:block">
                  <div className="text-zinc-400">
                    {yesterday.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  {yesterdayStats.total > 0 && (
                    <div className="text-[10px] text-zinc-600">
                      {yesterdayStats.completed}/{yesterdayStats.total}
                    </div>
                  )}
                </div>
              </button>

              {/* Current Day */}
              <div className="text-center">
                <h1 className="text-lg font-medium text-zinc-100">
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h1>
                <div className="flex items-center gap-2 justify-center mt-1">
                  <p className="text-xs text-zinc-500">
                    {daysTasks.length > 0 && `${completed.length}/${daysTasks.length} tasks`}
                  </p>
                  {!isToday && (
                    <button
                      onClick={goToToday}
                      className="text-[10px] text-emerald-500 hover:text-emerald-400 transition-colors px-2 py-0.5 bg-emerald-500/10 rounded"
                    >
                      Today
                    </button>
                  )}
                </div>
              </div>

              {/* Next Day */}
              <button
                onClick={goToNextDay}
                className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <div className="text-left hidden sm:block">
                  <div className="text-zinc-400">
                    {tomorrow.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  {tomorrowStats.total > 0 && (
                    <div className="text-[10px] text-zinc-600">
                      {tomorrowStats.completed}/{tomorrowStats.total}
                    </div>
                  )}
                </div>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Task Area */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Missed Tasks Section */}
            {isToday && missedTasks.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowMissedTasks(!showMissedTasks)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-amber-500/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-amber-400 font-medium">
                      ⚠️ Carry Forward
                    </span>
                    <span className="text-xs text-amber-400/60">
                      {missedTasks.length} task{missedTasks.length > 1 ? 's' : ''} from previous days
                    </span>
                  </div>
                  {showMissedTasks ? <ChevronUp size={14} className="text-amber-400" /> : <ChevronDown size={14} className="text-amber-400" />}
                </button>

                {showMissedTasks && (
                  <div className="px-4 pb-4 space-y-3 animate-fade-in">
                    {missedTasks.map(task => (
                      <div key={task.id} className="bg-surface/50 border border-border/40 rounded-md p-3">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <p className="text-sm text-zinc-200">{task.title}</p>
                            <p className="text-xs text-zinc-600 mt-1">
                              {task.scheduledTime && getRelativeDate(task.scheduledTime)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAddToToday(task)}
                            className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded hover:bg-emerald-500/20 transition-colors"
                          >
                            Add to Today
                          </button>
                          <button
                            onClick={() => handleReschedule(task, tomorrow)}
                            className="px-3 py-1 bg-surface text-zinc-400 text-xs rounded hover:bg-zinc-800 transition-colors"
                          >
                            Tomorrow
                          </button>
                          <button
                            onClick={() => onTaskDelete(task.id)}
                            className="px-3 py-1 text-zinc-600 text-xs rounded hover:text-zinc-400 transition-colors"
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* On The Pad */}
            {onThePad ? (
              <div className="bg-surface border-2 border-emerald-900/50 rounded-lg p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider">
                    {onThePad.status === TaskStatus.IN_PROGRESS ? '🚀 Launching' : '🎯 On the Pad'}
                  </span>
                </div>

                <h3 className="text-lg text-zinc-100 font-medium mb-3">{onThePad.title}</h3>

                <div className="flex items-center gap-3 text-xs text-zinc-500 mb-4">
                  <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded">
                    {onThePad.category}
                  </span>
                  {onThePad.scheduledTime && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatTime(onThePad.scheduledTime)}
                    </span>
                  )}
                  {onThePad.duration && (
                    <span>{onThePad.duration}m</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {onThePad.status === TaskStatus.IN_PROGRESS ? (
                    <>
                      <button
                        onClick={() => handleComplete(onThePad)}
                        className="flex-1 px-4 py-2.5 bg-emerald-500 text-black font-semibold text-sm rounded-md hover:bg-emerald-400 transition-colors"
                      >
                        ✓ Complete
                      </button>
                      <button
                        onClick={() => onTaskUpdate(onThePad.id, { status: TaskStatus.TODO })}
                        className="px-4 py-2.5 bg-surface text-zinc-400 text-sm rounded-md hover:bg-zinc-800 transition-colors"
                      >
                        <Pause size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => onStartSession(onThePad.id)}
                        className="flex-1 px-4 py-2.5 bg-emerald-500 text-black font-semibold text-sm rounded-md hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
                      >
                        <Play size={14} fill="currentColor" />
                        Launch Now
                      </button>
                      <button
                        onClick={() => handleComplete(onThePad)}
                        className="px-4 py-2.5 bg-surface text-zinc-400 text-sm rounded-md hover:bg-zinc-800 transition-colors"
                      >
                        <Check size={14} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => onTaskDelete(onThePad.id)}
                    className="px-4 py-2.5 bg-surface text-zinc-600 text-sm rounded-md hover:text-zinc-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : daysTasks.length === 0 ? (
              <div className="py-16 text-center">
                <Circle size={32} className="mx-auto text-zinc-700 mb-3" strokeWidth={1} />
                <p className="text-sm text-zinc-500">No tasks scheduled</p>
                <p className="text-xs text-zinc-600 mt-1">Add your first task below</p>
              </div>
            ) : null}

            {/* In Staging */}
            {inStaging.length > 0 && (
              <div className="bg-surface/30 border border-border/40 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowStaging(!showStaging)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-surface/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-300 font-medium">⏭️ In Staging</span>
                    <span className="text-xs text-zinc-600">{inStaging.length} task{inStaging.length > 1 ? 's' : ''}</span>
                  </div>
                  {showStaging ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
                </button>

                {showStaging && (
                  <div className="px-4 pb-4 space-y-2 animate-fade-in">
                    {inStaging.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onComplete={handleComplete}
                        onStart={onStartSession}
                        onDelete={onTaskDelete}
                        formatTime={formatTime}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* In Queue */}
            {inQueue.length > 0 && (
              <div className="bg-surface/20 border border-border/30 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowQueue(!showQueue)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-surface/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-400 font-medium">📦 In Queue</span>
                    <span className="text-xs text-zinc-600">{inQueue.length} more</span>
                  </div>
                  {showQueue ? <ChevronUp size={14} className="text-zinc-600" /> : <ChevronDown size={14} className="text-zinc-600" />}
                </button>

                {showQueue && (
                  <div className="px-4 pb-4 space-y-2 animate-fade-in">
                    {inQueue.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onComplete={handleComplete}
                        onStart={onStartSession}
                        onDelete={onTaskDelete}
                        formatTime={formatTime}
                        compact
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-emerald-950/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-emerald-400 font-medium">✅ Completed</span>
                    <span className="text-xs text-emerald-600">{completed.length} task{completed.length > 1 ? 's' : ''}</span>
                  </div>
                  {showCompleted ? <ChevronUp size={14} className="text-emerald-600" /> : <ChevronDown size={14} className="text-emerald-600" />}
                </button>

                {showCompleted && (
                  <div className="px-4 pb-4 space-y-2 animate-fade-in">
                    {completed.map(task => (
                      <div key={task.id} className="flex items-center gap-3 px-3 py-2 rounded-md bg-surface/30">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" fill="currentColor" />
                        <span className="text-sm text-zinc-500 line-through flex-1">{task.title}</span>
                        <button
                          onClick={() => onTaskUpdate(task.id, { status: TaskStatus.TODO })}
                          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                        >
                          Undo
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat Input */}
        <div className="shrink-0 px-8 py-4 border-t border-border/40 bg-surface/30">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                placeholder="Add task..."
                className="w-full bg-transparent border-none outline-none text-sm text-zinc-200 placeholder:text-zinc-600 py-2"
              />
              {inputValue && (
                <button
                  onClick={handleQuickAdd}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>
            <p className="text-[10px] text-zinc-700 mt-1.5">
              Add time with @2pm or @14:00
            </p>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Rituals */}
      <div className="w-72 shrink-0 border-l border-border/40 bg-surface/20 overflow-y-auto hidden lg:block">
        <div className="p-6 space-y-6">
          {/* Rituals Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Daily Rituals</h3>
            <span className="text-xs text-zinc-600">{completedRituals}/{totalRituals}</span>
          </div>

          {/* Progress Bar */}
          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${(completedRituals / totalRituals) * 100}%` }}
            />
          </div>

          {/* Prayers */}
          <div>
            <h4 className="text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wider">Prayers</h4>
            <div className="space-y-2">
              {prayerTimes.map(prayer => {
                const prayerKey = `${dateKey}-${prayer.name}`;
                const isCompleted = state.prayerLog[prayerKey] || false;

                return (
                  <button
                    key={prayer.name}
                    onClick={() => onPrayerToggle(prayerKey)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-surface/50 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      {PRAYER_ICONS[prayer.name]}
                      <span className="text-xs text-zinc-300">{prayer.name}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] text-zinc-600">{prayer.time}</span>
                      <div className={`w-4 h-4 rounded-full border transition-all ${
                        isCompleted
                          ? 'bg-emerald-500/20 border-emerald-500/50'
                          : 'border-zinc-700 group-hover:border-zinc-600'
                      }`}>
                        {isCompleted && <Check size={12} className="text-emerald-400 m-0.5" strokeWidth={3} />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Athkar */}
          <div>
            <h4 className="text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wider">Athkar</h4>
            <div className="space-y-2">
              {athkarList.map(athkar => {
                const athkarKey = `${dateKey}-${athkar.replace(/\s+/g, '-')}`;
                const isCompleted = state.adhkarLog[athkarKey] || false;

                return (
                  <button
                    key={athkar}
                    onClick={() => onAdhkarToggle(athkarKey)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-surface/50 transition-colors group"
                  >
                    <span className="text-xs text-zinc-300">{athkar}</span>
                    <div className={`w-4 h-4 rounded-full border transition-all ${
                      isCompleted
                        ? 'bg-emerald-500/20 border-emerald-500/50'
                        : 'border-zinc-700 group-hover:border-zinc-600'
                    }`}>
                      {isCompleted && <Check size={12} className="text-emerald-400 m-0.5" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Habits */}
          <div>
            <h4 className="text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wider">Habits</h4>
            <div className="space-y-2">
              {habitsList.map(habit => {
                const habitKey = `${dateKey}-${habit}`;
                const isCompleted = state.adhkarLog[habitKey] || false;

                return (
                  <button
                    key={habit}
                    onClick={() => onAdhkarToggle(habitKey)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-surface/50 transition-colors group"
                  >
                    <span className="text-xs text-zinc-300">{habit}</span>
                    <div className={`w-4 h-4 rounded-full border transition-all ${
                      isCompleted
                        ? 'bg-emerald-500/20 border-emerald-500/50'
                        : 'border-zinc-700 group-hover:border-zinc-600'
                    }`}>
                      {isCompleted && <Check size={12} className="text-emerald-400 m-0.5" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Daily Note */}
          <div>
            <h4 className="text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wider">Note</h4>
            <textarea
              value={stickyNote}
              onChange={(e) => onStickyNoteUpdate(dateKey, e.target.value)}
              placeholder="Thoughts for today..."
              className="w-full bg-surface/50 border border-border/40 rounded-md px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-border resize-none"
              rows={4}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Task Card Component
interface TaskCardProps {
  task: Task;
  onComplete: (task: Task) => void;
  onStart: (id: string) => void;
  onDelete: (id: string) => void;
  formatTime: (timestamp: number) => string;
  compact?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onComplete, onStart, onDelete, formatTime, compact }) => {
  return (
    <div className={`group flex items-center gap-3 px-3 rounded-md hover:bg-surface/50 transition-colors ${compact ? 'py-1.5' : 'py-2'}`}>
      <button
        onClick={() => onComplete(task)}
        className="shrink-0"
      >
        <Circle size={14} className="text-zinc-600 group-hover:text-zinc-500 transition-colors" strokeWidth={1.5} />
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-zinc-200 truncate ${compact ? 'text-xs' : 'text-sm'}`}>{task.title}</p>
        {!compact && task.scheduledTime && (
          <p className="text-[10px] text-zinc-600 mt-0.5">{formatTime(task.scheduledTime)}</p>
        )}
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
        <button
          onClick={() => onStart(task.id)}
          className="p-1 hover:bg-surface rounded text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Start"
        >
          <Play size={12} />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1 hover:bg-surface rounded text-zinc-600 hover:text-zinc-400 transition-colors"
          title="Delete"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};

export default DayView;
