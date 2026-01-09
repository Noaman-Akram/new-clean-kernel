import React, { useState, useRef, useEffect } from 'react';
import { AppState, Task, TaskStatus, Category, Severity, PrayerName } from '../types';
import { getPrayerTimesForDate } from '../utils/prayerTimes';
import {
  Plus, Check, X, Circle, CheckCircle2, Clock,
  ChevronDown, ChevronUp, Sparkles, MoreVertical,
  Sunrise, Sun, CloudSun, Sunset, Moon
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
  const today = new Date();
  const dateKey = today.toISOString().split('T')[0];

  const [inputValue, setInputValue] = useState('');
  const [showTimeView, setShowTimeView] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showMobileRituals, setShowMobileRituals] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Get today's tasks
  const todaysTasks = state.tasks.filter(task => {
    if (task.scheduledTime) {
      const taskDate = new Date(task.scheduledTime).toISOString().split('T')[0];
      return taskDate === dateKey;
    }
    return false;
  }).sort((a, b) => {
    if (a.scheduledTime && b.scheduledTime) {
      return a.scheduledTime - b.scheduledTime;
    }
    return 0;
  });

  // Get unscheduled tasks (suggestions)
  const unscheduledTasks = state.tasks.filter(task =>
    !task.scheduledTime &&
    task.status !== TaskStatus.DONE
  ).slice(0, 5);

  // Get overdue tasks from previous days
  const overdueTasksCount = state.tasks.filter(task => {
    if (task.scheduledTime && task.status !== TaskStatus.DONE) {
      const taskDate = new Date(task.scheduledTime).toISOString().split('T')[0];
      return taskDate < dateKey;
    }
    return false;
  }).length;

  // Prayer times
  const prayerTimes = getPrayerTimesForDate(today);

  // Athkar checklist
  const athkarList = ['Morning Athkar', 'Evening Athkar', 'Quran Reading'];

  // Get sticky note
  const stickyNote = state.stickyNotes[dateKey] || '';

  // Handle quick add
  const handleQuickAdd = () => {
    if (!inputValue.trim()) return;

    // Parse time from input (e.g., "Task name @2pm" or "Task name @14:00")
    const timeMatch = inputValue.match(/@(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    let scheduledTime: number | undefined = undefined;

    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3]?.toLowerCase();

      if (ampm === 'pm' && hours !== 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;

      const scheduleDate = new Date(today);
      scheduleDate.setHours(hours, minutes, 0, 0);
      scheduledTime = scheduleDate.getTime();
    } else {
      // Default to current time
      scheduledTime = Date.now();
    }

    const title = inputValue.replace(/@(\d{1,2}):?(\d{2})?\s*(am|pm)?/i, '').trim();

    onTaskAdd(title, Category.ZOHO, 'MED', { scheduledTime });
    setInputValue('');
    inputRef.current?.focus();
  };

  // Handle task completion toggle
  const handleToggleComplete = (task: Task) => {
    const newStatus = task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
    onTaskUpdate(task.id, { status: newStatus });
  };

  // Handle inline edit
  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  };

  const saveEdit = () => {
    if (editingTaskId && editingTitle.trim()) {
      onTaskUpdate(editingTaskId, { title: editingTitle });
    }
    setEditingTaskId(null);
    setEditingTitle('');
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditingTitle('');
  };

  // Handle adding suggested task to today
  const addToToday = (task: Task) => {
    onTaskUpdate(task.id, { scheduledTime: Date.now() });
    setShowSuggestions(false);
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

  // Group tasks by time if time view is enabled
  const groupedTasks = showTimeView ? groupTasksByHour(todaysTasks) : null;

  useEffect(() => {
    if (editingTaskId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTaskId]);

  return (
    <div className="h-full flex bg-background">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Minimal */}
        <div className="shrink-0 px-8 py-6 border-b border-border/40">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-baseline justify-between">
              <div>
                <h1 className="text-xl font-light text-zinc-100 tracking-tight">
                  {today.toLocaleDateString('en-US', { weekday: 'long' })}
                </h1>
                <p className="text-xs text-zinc-500 mt-1">
                  {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMobileRituals(!showMobileRituals)}
                  className="md:hidden text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 size={12} />
                  Rituals
                </button>
                <button
                  onClick={() => setShowTimeView(!showTimeView)}
                  className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5"
                >
                  <Clock size={12} />
                  {showTimeView ? 'Hide' : 'Show'} time
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Rituals Panel (Collapsible) */}
        {showMobileRituals && (
          <div className="md:hidden px-8 py-4 border-b border-border/40 bg-surface/10 animate-fade-in">
            <div className="max-w-3xl mx-auto space-y-4">
              {/* Prayers */}
              <div>
                <h3 className="text-[10px] font-medium text-zinc-500 mb-2 uppercase tracking-wider">Prayers</h3>
                <div className="flex flex-wrap gap-2">
                  {prayerTimes.map(prayer => {
                    const prayerKey = `${dateKey}-${prayer.name}`;
                    const isCompleted = state.prayerLog[prayerKey] || false;

                    return (
                      <button
                        key={prayer.name}
                        onClick={() => onPrayerToggle(prayerKey)}
                        className={`px-2.5 py-1.5 rounded-md text-xs transition-all ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                            : 'bg-surface/50 text-zinc-400 border border-border/40 hover:border-border'
                        }`}
                      >
                        {prayer.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Athkar */}
              <div>
                <h3 className="text-[10px] font-medium text-zinc-500 mb-2 uppercase tracking-wider">Athkar</h3>
                <div className="flex flex-wrap gap-2">
                  {athkarList.map(athkar => {
                    const athkarKey = `${dateKey}-${athkar.replace(/\s+/g, '-')}`;
                    const isCompleted = state.adhkarLog[athkarKey] || false;

                    return (
                      <button
                        key={athkar}
                        onClick={() => onAdhkarToggle(athkarKey)}
                        className={`px-2.5 py-1.5 rounded-md text-xs transition-all ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                            : 'bg-surface/50 text-zinc-400 border border-border/40 hover:border-border'
                        }`}
                      >
                        {athkar}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Task Area */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-3xl mx-auto">
            {/* Overdue Banner */}
            {overdueTasksCount > 0 && (
              <div className="mb-6 px-4 py-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <p className="text-xs text-amber-400/80">
                  {overdueTasksCount} task{overdueTasksCount > 1 ? 's' : ''} from previous days
                </p>
              </div>
            )}

            {/* Tasks List */}
            {todaysTasks.length === 0 ? (
              <div className="py-16 text-center">
                <Circle size={32} className="mx-auto text-zinc-700 mb-3" strokeWidth={1} />
                <p className="text-sm text-zinc-500">No tasks yet</p>
                <p className="text-xs text-zinc-600 mt-1">Type below to add your first intention</p>
              </div>
            ) : showTimeView && groupedTasks ? (
              // Time-based view
              <div className="space-y-6">
                {Object.entries(groupedTasks).map(([hour, tasks]) => (
                  <div key={hour} className="flex gap-4">
                    <div className="w-16 shrink-0 pt-1">
                      <span className="text-xs text-zinc-600">{hour}</span>
                    </div>
                    <div className="flex-1 space-y-2">
                      {tasks.map(task => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          isEditing={editingTaskId === task.id}
                          editingTitle={editingTitle}
                          onToggleComplete={handleToggleComplete}
                          onStartEdit={startEditing}
                          onSaveEdit={saveEdit}
                          onCancelEdit={cancelEdit}
                          onEditTitleChange={setEditingTitle}
                          onDelete={onTaskDelete}
                          onStartSession={onStartSession}
                          activeTaskId={activeTaskId}
                          showTime={false}
                          editInputRef={editInputRef}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Simple list view
              <div className="space-y-1.5">
                {todaysTasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isEditing={editingTaskId === task.id}
                    editingTitle={editingTitle}
                    onToggleComplete={handleToggleComplete}
                    onStartEdit={startEditing}
                    onSaveEdit={saveEdit}
                    onCancelEdit={cancelEdit}
                    onEditTitleChange={setEditingTitle}
                    onDelete={onTaskDelete}
                    onStartSession={onStartSession}
                    activeTaskId={activeTaskId}
                    showTime={showTimeView}
                    editInputRef={editInputRef}
                  />
                ))}
              </div>
            )}

            {/* Suggestions Section */}
            {unscheduledTasks.length > 0 && (
              <div className="mt-12 pt-8 border-t border-border/30">
                <button
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-4"
                >
                  <Sparkles size={12} />
                  <span>Pull from backlog</span>
                  {showSuggestions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {showSuggestions && (
                  <div className="space-y-1.5">
                    {unscheduledTasks.map(task => (
                      <div
                        key={task.id}
                        className="group flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-surface/50 transition-colors"
                      >
                        <span className="text-sm text-zinc-400 truncate">{task.title}</span>
                        <button
                          onClick={() => addToToday(task)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-zinc-500 hover:text-zinc-200"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat-like Input - Fixed at Bottom */}
        <div className="shrink-0 px-8 py-4 border-t border-border/40 bg-surface/30">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleQuickAdd();
                  }
                }}
                placeholder="What do you want to do today?"
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
            <p className="text-[10px] text-zinc-700 mt-2">
              Tip: Add time with @2pm or @14:00
            </p>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Habits & Rituals */}
      <div className="w-64 shrink-0 border-l border-border/40 bg-surface/20 overflow-y-auto hidden md:block">
        <div className="p-6 space-y-8">
          {/* Prayers */}
          <div>
            <h3 className="text-xs font-medium text-zinc-400 mb-3 uppercase tracking-wider">Prayers</h3>
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
                    <div className="flex items-center gap-2">
                      {PRAYER_ICONS[prayer.name]}
                      <span className="text-xs text-zinc-300">{prayer.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
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
            <h3 className="text-xs font-medium text-zinc-400 mb-3 uppercase tracking-wider">Athkar</h3>
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

          {/* Daily Note */}
          <div>
            <h3 className="text-xs font-medium text-zinc-400 mb-3 uppercase tracking-wider">Note</h3>
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

// Task Item Component
interface TaskItemProps {
  task: Task;
  isEditing: boolean;
  editingTitle: string;
  onToggleComplete: (task: Task) => void;
  onStartEdit: (task: Task) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditTitleChange: (value: string) => void;
  onDelete: (id: string) => void;
  onStartSession: (id: string) => void;
  activeTaskId: string | null;
  showTime: boolean;
  editInputRef: React.RefObject<HTMLInputElement>;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  isEditing,
  editingTitle,
  onToggleComplete,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditTitleChange,
  onDelete,
  onStartSession,
  activeTaskId,
  showTime,
  editInputRef
}) => {
  const isCompleted = task.status === TaskStatus.DONE;
  const isActive = task.id === activeTaskId;

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')}${ampm}`;
  };

  return (
    <div className={`group flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
      isActive ? 'bg-emerald-950/30 border border-emerald-900/50' : 'hover:bg-surface/30'
    }`}>
      {/* Checkbox */}
      <button
        onClick={() => onToggleComplete(task)}
        className="shrink-0"
      >
        {isCompleted ? (
          <CheckCircle2 size={16} className="text-emerald-500" fill="currentColor" />
        ) : (
          <Circle size={16} className="text-zinc-600 group-hover:text-zinc-500 transition-colors" strokeWidth={1.5} />
        )}
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={editInputRef}
            type="text"
            value={editingTitle}
            onChange={(e) => onEditTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            onBlur={onSaveEdit}
            className="w-full bg-transparent border-none outline-none text-sm text-zinc-200"
          />
        ) : (
          <button
            onClick={() => onStartEdit(task)}
            className={`text-left text-sm transition-colors ${
              isCompleted
                ? 'text-zinc-600 line-through'
                : 'text-zinc-200 group-hover:text-zinc-100'
            }`}
          >
            {task.title}
          </button>
        )}
      </div>

      {/* Time (optional) */}
      {showTime && task.scheduledTime && (
        <span className="text-[10px] text-zinc-600 shrink-0">
          {formatTime(task.scheduledTime)}
        </span>
      )}

      {/* Actions (show on hover) */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
        {!isCompleted && !isActive && (
          <button
            onClick={() => onStartSession(task.id)}
            className="p-1 hover:bg-surface rounded text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Start session"
          >
            <Clock size={12} />
          </button>
        )}
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

// Helper function to group tasks by hour
function groupTasksByHour(tasks: Task[]): Record<string, Task[]> {
  const groups: Record<string, Task[]> = {};

  tasks.forEach(task => {
    if (task.scheduledTime) {
      const date = new Date(task.scheduledTime);
      const hours = date.getHours();
      const ampm = hours >= 12 ? 'pm' : 'am';
      const displayHours = hours % 12 || 12;
      const hourKey = `${displayHours}${ampm}`;

      if (!groups[hourKey]) {
        groups[hourKey] = [];
      }
      groups[hourKey].push(task);
    }
  });

  return groups;
}

export default DayView;
