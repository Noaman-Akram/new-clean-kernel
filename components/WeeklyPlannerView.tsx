import React, { useState, useEffect, useRef } from 'react';
import { AppState, Task, Category, TaskStatus, Severity } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Check,
  Play,
  Pause,
  Clock,
  GripVertical,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Sunrise,
  Sun,
  CloudSun,
  Sunset,
  Moon,
  List,
  AlignLeft,
  LayoutGrid,
  Trash2,
  StickyNote,
  Calendar,
} from 'lucide-react';
import { getPrayerTimesForDate, formatTime, formatTimeAMPM, PRAYER_ICONS } from '../utils/prayerTimes';
import { generateId } from '../utils';
import DayView from './DayView';

interface Props {
  state: AppState;
  onAdd: (title: string, category: Category, impact: 'LOW' | 'MED' | 'HIGH', options?: { scheduledTime?: number; duration?: number }) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onStartSession: (id: string) => void;
  activeTaskId: string | null;
  onDelete: (id: string) => void;
  onStickyNoteUpdate: (dateKey: string, content: string) => void;
  onPrayerToggle?: (key: string) => void;
  onAdhkarToggle?: (key: string) => void;
}

interface WeekDay {
  date: Date;
  dateStr: string;
  dayName: string;
  dayNum: number;
  isToday: boolean;
}

// Map prayer icon names to Lucide components
const getPrayerIcon = (iconName: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    sunrise: <Sunrise size={12} />,
    sun: <Sun size={12} />,
    'cloud-sun': <CloudSun size={12} />,
    sunset: <Sunset size={12} />,
    moon: <Moon size={12} />,
  };
  return iconMap[iconName] || <Sun size={12} />;
};

const WeeklyPlannerView: React.FC<Props> = ({ state, onAdd, onUpdate, onStartSession, activeTaskId, onDelete, onStickyNoteUpdate, onPrayerToggle, onAdhkarToggle }) => {
  const [plannerView, setPlannerView] = useState<'week' | 'day'>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [backlogCollapsed, setBacklogCollapsed] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'inline' | 'stacked'>('stacked');
  const dayRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getWeekDays = (): WeekDay[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentDay = today.getDay();
    const saturdayOffset = currentDay === 6 ? 0 : -(currentDay + 1);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + saturdayOffset + (weekOffset * 7));

    const days: WeekDay[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);

      const todayCheck = new Date();
      todayCheck.setHours(0, 0, 0, 0);

      days.push({
        date,
        dateStr: date.toISOString().split('T')[0],
        dayName: dayNames[date.getDay()],
        dayNum: date.getDate(),
        isToday: date.getTime() === todayCheck.getTime(),
      });
    }

    return days;
  };

  const weekDays = getWeekDays();

  const getBacklogTasks = (): Task[] => {
    return state.tasks
      .filter(t => !t.scheduledTime)
      .sort((a, b) => {
        if (a.impact === 'HIGH' && b.impact !== 'HIGH') return -1;
        if (a.impact !== 'HIGH' && b.impact === 'HIGH') return 1;
        return b.createdAt - a.createdAt;
      });
  };

  const getTasksForDay = (day: WeekDay): Task[] => {
    return state.tasks
      .filter(t => {
        if (!t.scheduledTime) return false;
        const taskDate = new Date(t.scheduledTime);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === day.date.getTime();
      })
      .sort((a, b) => (a.scheduledTime || 0) - (b.scheduledTime || 0));
  };

  const getUnscheduledTasksForDay = (day: WeekDay): Task[] => {
    return state.tasks
      .filter(t => {
        if (!t.scheduledTime) return false;
        const taskDate = new Date(t.scheduledTime);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === day.date.getTime() && new Date(t.scheduledTime).getHours() === 23;
      });
  };

  const getWeekLabel = () => {
    const firstDay = weekDays[0];
    const lastDay = weekDays[6];
    const month1 = firstDay.date.toLocaleDateString('en-US', { month: 'short' });
    const month2 = lastDay.date.toLocaleDateString('en-US', { month: 'short' });

    if (month1 === month2) {
      return `${month1} ${firstDay.dayNum} - ${lastDay.dayNum}`;
    }
    return `${month1} ${firstDay.dayNum} - ${month2} ${lastDay.dayNum}`;
  };

  const scrollToNow = () => {
    const today = weekDays.find(d => d.isToday);
    if (today && dayRefs.current[today.dateStr]) {
      const dayEl = dayRefs.current[today.dateStr];
      const hour = currentTime.getHours();
      const hourElements = dayEl?.querySelectorAll('[data-hour]');

      if (hourElements) {
        const targetHour = Array.from(hourElements).find(
          el => parseInt((el as HTMLElement).getAttribute('data-hour') || '0') === hour
        );
        if (targetHour) {
          (targetHour as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-background">
      <BacklogSidebar
        tasks={getBacklogTasks()}
        weekDays={weekDays}
        onAdd={onAdd}
        onUpdate={onUpdate}
        collapsed={backlogCollapsed}
        onToggleCollapse={() => setBacklogCollapsed(!backlogCollapsed)}
        onDragStart={setDraggedTask}
        onDelete={onDelete}
        draggedTask={draggedTask}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-auto md:h-14 border-b border-border bg-surface/30 flex flex-col md:flex-row items-start md:items-center justify-between px-3 md:px-6 py-2 md:py-0 gap-2 md:gap-0 shrink-0">
          <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekOffset(weekOffset - 1)}
                className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs md:text-sm font-mono text-zinc-400 min-w-[100px] md:min-w-[120px] text-center">
                {getWeekLabel()}
              </span>
              <button
                onClick={() => setWeekOffset(weekOffset + 1)}
                className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Mobile: Toggle backlog */}
            <button
              onClick={() => setBacklogCollapsed(!backlogCollapsed)}
              className="md:hidden p-1.5 hover:bg-zinc-800 rounded transition-colors"
            >
              <ChevronDown size={14} className={backlogCollapsed ? 'rotate-180' : ''} />
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            {/* Planner View Toggle - Week/Day */}
            <div className="flex items-center gap-0.5 bg-zinc-900 rounded p-0.5">
              <button
                onClick={() => setPlannerView('week')}
                className={`px-3 py-1.5 rounded transition-colors text-[10px] md:text-xs font-medium ${plannerView === 'week'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                title="Week View"
              >
                Week
              </button>
              <button
                onClick={() => setPlannerView('day')}
                className={`px-3 py-1.5 rounded transition-colors text-[10px] md:text-xs font-medium ${plannerView === 'day'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                title="Day View"
              >
                Day
              </button>
            </div>

            {plannerView === 'week' && weekOffset === 0 && (
              <button
                onClick={scrollToNow}
                className="text-[10px] md:text-xs font-mono px-2 md:px-3 py-1 md:py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
              >
                Now
              </button>
            )}
            {plannerView === 'week' && weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="text-[10px] md:text-xs font-mono px-2 md:px-3 py-1 md:py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
              >
                This Week
              </button>
            )}

            {/* View Mode Toggle - Icon Based (only for week view) */}
            {plannerView === 'week' && (
              <div className="flex items-center gap-0.5 bg-zinc-900 rounded p-0.5">
                <button
                  onClick={() => setViewMode('stacked')}
                  className={`p-1.5 rounded transition-colors ${viewMode === 'stacked'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-zinc-600 hover:text-zinc-400'
                    }`}
                  title="Stacked View"
                >
                  <AlignLeft size={14} />
                </button>
                <button
                  onClick={() => setViewMode('inline')}
                  className={`p-1.5 rounded transition-colors ${viewMode === 'inline'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-zinc-600 hover:text-zinc-400'
                    }`}
                  title="Inline View"
                >
                  <LayoutGrid size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Conditional rendering based on plannerView */}
        {plannerView === 'week' ? (
          <div className="flex-1 overflow-x-auto overflow-y-hidden snap-x snap-mandatory">
            <div className="h-full flex min-w-max">{weekDays.map((day) => (
              <DayColumn
                key={day.dateStr}
                day={day}
                tasks={getTasksForDay(day)}
                unscheduledTasks={getUnscheduledTasksForDay(day)}
                currentTime={currentTime}
                onAdd={onAdd}
                onUpdate={onUpdate}
                onStartSession={onStartSession}
                activeTaskId={activeTaskId}
                allTasks={state.tasks}
                backlogTasks={getBacklogTasks()}
                draggedTask={draggedTask}
                onDragStart={setDraggedTask}
                onDragOver={(hour) => {
                  setDragOverDay(day.dateStr);
                  setDragOverHour(hour);
                }}
                onDragLeave={() => {
                  setDragOverDay(null);
                  setDragOverHour(null);
                }}
                showDropIndicator={dragOverDay === day.dateStr}
                dropHour={dragOverHour}
                editingTaskId={editingTaskId}
                onEditingChange={setEditingTaskId}
                viewMode={viewMode}
                onStickyNoteUpdate={onStickyNoteUpdate}
                stickyNoteContent={state.stickyNotes?.[day.dateStr] || ''}
                ref={(el) => (dayRefs.current[day.dateStr] = el)}
              />
            ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <DayView
              state={state}
              onTaskUpdate={onUpdate}
              onTaskAdd={onAdd}
              onTaskDelete={onDelete}
              onStartSession={onStartSession}
              onStickyNoteUpdate={onStickyNoteUpdate}
              onPrayerToggle={onPrayerToggle || (() => {})}
              onAdhkarToggle={onAdhkarToggle || (() => {})}
              activeTaskId={activeTaskId}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Backlog Sidebar
interface BacklogSidebarProps {
  tasks: Task[];
  weekDays: WeekDay[];
  onAdd: (title: string, category: Category, impact: 'LOW' | 'MED' | 'HIGH', options?: { scheduledTime?: number }) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onDragStart: (task: Task) => void;
  onDelete: (id: string) => void;
  draggedTask: Task | null;
}

const BacklogSidebar: React.FC<BacklogSidebarProps> = ({
  tasks,
  weekDays,
  onAdd,
  onUpdate,
  collapsed,
  onToggleCollapse,
  onDragStart,
  onDelete,
  draggedTask,
}) => {
  const [input, setInput] = useState('');
  const [schedulingTask, setSchedulingTask] = useState<Task | null>(null);
  const [scheduleDay, setScheduleDay] = useState(0);
  const [scheduleTime, setScheduleTime] = useState('9:00 AM');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedTask) {
      onUpdate(draggedTask.id, { scheduledTime: null });
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const isUrgent = input.startsWith('!');
    const title = input.replace(/^!/, '').trim();

    onAdd(title, Category.AGENCY, isUrgent ? 'HIGH' : 'MED');
    setInput('');
  };

  const handleScheduleTask = () => {
    if (!schedulingTask) return;

    const day = weekDays[scheduleDay];
    const [timeStr, period] = scheduleTime.split(' ');
    const [hours, minutes] = timeStr.split(':').map(Number);

    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;

    const scheduledDate = new Date(day.date);
    scheduledDate.setHours(hour24, minutes, 0, 0);

    onUpdate(schedulingTask.id, { scheduledTime: scheduledDate.getTime() });
    setSchedulingTask(null);
  };

  const timeOptions = [
    '12:00 AM', '1:00 AM', '2:00 AM', '3:00 AM', '4:00 AM', '5:00 AM',
    '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
    '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM',
  ];

  if (collapsed) {
    return (
      <div className="hidden md:flex w-12 border-r border-border flex-col items-center py-4 bg-surface/20">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-zinc-800 rounded transition-colors text-zinc-500"
        >
          <ChevronRightIcon size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`w-full md:w-72 border-r border-border flex flex-col shrink-0 bg-surface/20 ${collapsed ? 'hidden md:flex' : 'flex'
        }`}>
      <div className="h-14 border-b border-border px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500"
          >
            <ChevronDown size={14} />
          </button>
          <div className="text-sm text-zinc-400">Backlog</div>
        </div>
        <div className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded">
          {tasks.length}
        </div>
      </div>

      <form onSubmit={handleAdd} className="p-3 border-b border-border/50">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Add task (! for urgent)..."
          className="w-full bg-transparent border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-700 focus:border-zinc-600 outline-none"
        />
      </form>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tasks.map(task => (
          <div
            key={task.id}
            draggable
            onDragStart={() => onDragStart(task)}
            className={`group bg-zinc-900/50 border border-zinc-800/50 rounded p-2 hover:border-zinc-700 transition-all cursor-grab ${task.status === TaskStatus.DONE ? 'opacity-50' : ''
              }`}
          >
            <div className="flex items-start gap-2">
              <GripVertical size={10} className="text-zinc-700 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5" />
              {task.impact === 'HIGH' && (
                <div className="w-1 h-1 rounded-full bg-amber-500 mt-2 shrink-0" />
              )}
              <div
                className={`flex-1 min-w-0 text-sm text-zinc-300 ${task.status === TaskStatus.DONE ? 'line-through' : ''
                  }`}
              >
                {task.title}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setSchedulingTask(task)}
                  className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
                  title="Schedule task"
                >
                  <Clock size={12} />
                </button>
                <button
                  onClick={() => onUpdate(task.id, { status: task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE })}
                  className={`p-1 hover:text-emerald-400 transition-colors opacity-0 group-hover:opacity-100 ${task.status === TaskStatus.DONE ? 'text-emerald-500' : 'text-zinc-600'}`}
                  title="Toggle Complete"
                >
                  <Check size={12} />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Permanently delete this task?')) {
                      onDelete(task.id);
                    }
                  }}
                  className="p-1 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete task"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {schedulingTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-lg w-full max-w-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-zinc-200">Schedule Task</h3>
              <button onClick={() => setSchedulingTask(null)} className="p-1 hover:bg-zinc-800 rounded">
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Day</label>
                <div className="grid grid-cols-7 gap-1">
                  {weekDays.map((day, idx) => (
                    <button
                      key={day.dateStr}
                      onClick={() => setScheduleDay(idx)}
                      className={`py-2 rounded text-[10px] font-medium transition-colors ${scheduleDay === idx
                        ? day.isToday
                          ? 'bg-emerald-500 text-black'
                          : 'bg-zinc-100 text-black'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                    >
                      <div>{day.dayName.slice(0, 1)}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Time</label>
                <select
                  value={scheduleTime}
                  onChange={e => setScheduleTime(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
                >
                  {timeOptions.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleScheduleTask}
                className="w-full px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-sm rounded transition-colors"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Day Column
interface DayColumnProps {
  day: WeekDay;
  tasks: Task[];
  unscheduledTasks: Task[];
  currentTime: Date;
  onAdd: (title: string, category: Category, impact: 'LOW' | 'MED' | 'HIGH', options?: { scheduledTime?: number }) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onStartSession: (id: string) => void;
  activeTaskId: string | null;
  allTasks: Task[];
  backlogTasks: Task[];
  draggedTask: Task | null;
  onDragStart: (task: Task) => void;
  onDragOver: (hour: number) => void;
  onDragLeave: () => void;
  showDropIndicator: boolean;
  dropHour: number | null;
  editingTaskId: string | null;
  onEditingChange: (id: string | null) => void;
  viewMode: 'inline' | 'stacked';
  onStickyNoteUpdate: (dateKey: string, content: string) => void;
  stickyNoteContent: string;
}

const DayColumn = React.forwardRef<HTMLDivElement, DayColumnProps>(({
  day,
  tasks,
  unscheduledTasks,
  currentTime,
  onAdd,
  onUpdate,
  onStartSession,
  activeTaskId,
  allTasks,
  backlogTasks,
  draggedTask,
  onDragStart,
  onDragOver,
  onDragLeave,
  showDropIndicator,
  dropHour,
  editingTaskId,
  onEditingChange,
  viewMode,
  onStickyNoteUpdate,
  stickyNoteContent,
}, ref) => {
  const [hoveredTimeSlot, setHoveredTimeSlot] = useState<string | null>(null);
  const [quickAddTime, setQuickAddTime] = useState<string | null>(null);
  const [quickAddText, setQuickAddText] = useState('');
  const [showDockPicker, setShowDockPicker] = useState(false);
  const [draggingOver, setDraggingOver] = useState<number | null>(null);
  const [isStickyOpen, setIsStickyOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const prayers = getPrayerTimesForDate(day.date);
  const isCurrentDay = day.isToday;

  useEffect(() => {
    if (quickAddTime && inputRef.current) {
      inputRef.current.focus();
    }
  }, [quickAddTime]);

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour <= 23; hour++) {
      slots.push({
        hour,
        time: formatTimeAMPM(hour, 0),
        timestamp: new Date(day.date).setHours(hour, 0, 0, 0),
      });
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const getTasksAtTime = (hour: number): Task[] => {
    return tasks.filter(task => {
      if (!task.scheduledTime) return false;
      const taskHour = new Date(task.scheduledTime).getHours();
      return taskHour === hour;
    });
  };

  const getPrayerAtHour = (hour: number) => {
    const prayer = prayers.find(p => {
      const prayerDate = new Date(p.timestamp);
      const prayerHour = prayerDate.getHours();
      return prayerHour === hour;
    });

    if (prayer) {
      // Calculate minutes for positioning
      const prayerDate = new Date(prayer.timestamp);
      const minutes = prayerDate.getMinutes();
      return { ...prayer, minutes };
    }
    return null;
  };

  const handleQuickAdd = (hour: number) => {
    if (!quickAddText.trim()) return;

    const lines = quickAddText.trim().split('\n');
    const title = lines[0];
    const description = lines.slice(1).join('\n').trim();

    const isUrgent = title.startsWith('!');
    const cleanTitle = title.replace(/^!/, '').trim();

    // Store what we're scheduling
    const scheduledDate = new Date(day.date);
    scheduledDate.setHours(hour, 0, 0, 0);

    onAdd(cleanTitle, Category.AGENCY, isUrgent ? 'HIGH' : 'MED', { scheduledTime: scheduledDate.getTime() });

    setQuickAddText('');
    setQuickAddTime(null);
    setShowDockPicker(false);
  };

  const handleScheduleDockTask = (task: Task, hour: number) => {
    const scheduledDate = new Date(day.date);
    scheduledDate.setHours(hour, 0, 0, 0);
    onUpdate(task.id, { scheduledTime: scheduledDate.getTime() });
    setShowDockPicker(false);
    setQuickAddTime(null);
  };

  const handleDragOver = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDraggingOver(hour);
    onDragOver(hour);
  };

  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedTask) return;

    const scheduledDate = new Date(day.date);
    scheduledDate.setHours(hour, 0, 0, 0);
    onUpdate(draggedTask.id, { scheduledTime: scheduledDate.getTime() });

    setDraggingOver(null);
    onDragLeave();
  };

  const handleDragEnd = () => {
    setDraggingOver(null);
    onDragLeave();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only clear if we're actually leaving the container
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setDraggingOver(null);
    }
  };

  const handleAddUnscheduled = () => {
    setQuickAddTime('unscheduled');
  };

  const handleQuickAddUnscheduled = () => {
    if (!quickAddText.trim()) return;

    const lines = quickAddText.trim().split('\n');
    const title = lines[0];
    const description = lines.slice(1).join('\n').trim();

    const isUrgent = title.startsWith('!');
    const cleanTitle = title.replace(/^!/, '').trim();

    // Store what we're scheduling
    const scheduledDate = new Date(day.date);
    scheduledDate.setHours(23, 0, 0, 0); // 23:00 Convention for unscheduled/all-day in this column

    onAdd(cleanTitle, Category.AGENCY, isUrgent ? 'HIGH' : 'MED', { scheduledTime: scheduledDate.getTime() });

    setQuickAddText('');
    setQuickAddTime(null);
  };

  // Get current time in Cairo timezone to match prayer times
  const cairoTimeStr = currentTime.toLocaleString('en-US', {
    timeZone: 'Africa/Cairo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const [currentHour, currentMinute] = cairoTimeStr.split(':').map(Number);

  return (
    <div
      ref={ref}
      onDragEnd={handleDragEnd}
      className={`flex-1 min-w-[300px] md:min-w-[240px] max-w-[300px] md:max-w-[240px] border-r border-border flex flex-col snap-center ${isCurrentDay ? 'bg-zinc-900/20' : ''
        }`}
    >
      <div
        className={`relative h-16 border-b shrink-0 flex flex-col items-center justify-center group ${isCurrentDay ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-border'
          }`}
      >
        <div className="text-[10px] font-mono uppercase text-zinc-600 mb-1">{day.dayName}</div>
        <div className={`text-lg font-medium ${isCurrentDay ? 'text-emerald-400' : 'text-zinc-300'}`}>
          {day.dayNum}
        </div>

        {/* Sticky Note Toggle */}
        <button
          onClick={() => setIsStickyOpen(!isStickyOpen)}
          className={`absolute top-2 right-2 p-1.5 rounded transition-all opacity-0 group-hover:opacity-100 ${isStickyOpen || stickyNoteContent
            ? 'text-zinc-100 opacity-100' // Calmer: White when active
            : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800'
            }`}
          title="Daily Sticky Note"
        >
          <StickyNote size={14} fill={stickyNoteContent ? "currentColor" : "none"} />
        </button>

        {/* Sticky Note Content */}
        {isStickyOpen && (
          <div className="absolute top-16 left-0 right-0 z-20 px-2 py-1 bg-background/95 backdrop-blur shadow-xl border-b border-zinc-800 animate-in slide-in-from-top-2">
            <textarea
              className="w-full h-32 bg-zinc-900/50 border border-zinc-700/50 rounded p-2 text-xs text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 resize-none font-sans leading-relaxed"
              placeholder={`Notes for ${day.dayName}...`}
              value={stickyNoteContent}
              onChange={(e) => onStickyNoteUpdate(day.dateStr, e.target.value)}
              autoFocus
              onBlur={() => setIsStickyOpen(false)} // Auto-close on blur to keep UI clean
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 relative group">
        {timeSlots.map((slot) => {
          const tasksAtTime = getTasksAtTime(slot.hour);
          const prayer = getPrayerAtHour(slot.hour);
          const isHovered = hoveredTimeSlot === slot.time;
          const isAdding = quickAddTime === slot.time;
          const showCurrentTime = isCurrentDay && currentHour === slot.hour;
          const showDropLine = showDropIndicator && dropHour === slot.hour;

          return (
            <div key={slot.time} className="relative" data-hour={slot.hour}>
              {/* Drop Indicator */}
              {showDropLine && (
                <div className="h-1 bg-emerald-500/80 mb-2 rounded-full shadow-lg shadow-emerald-500/50"></div>
              )}

              {/* Time Slot */}
              <div
                onMouseEnter={() => setHoveredTimeSlot(slot.time)}
                onMouseLeave={() => setHoveredTimeSlot(null)}
                onDragOver={(e) => handleDragOver(e, slot.hour)}
                onDrop={(e) => handleDrop(e, slot.hour)}
                onDragLeave={handleDragLeave}
                className={`relative py-3 transition-colors ${draggingOver === slot.hour ? 'bg-emerald-500/5' : ''
                  }`}
              >
                {/* Current Time Indicator - positioned based on minutes */}
                {showCurrentTime && (
                  <div
                    className="absolute left-0 right-0 flex items-center gap-2 z-10"
                    style={{ top: `${(currentMinute / 60) * 72}px` }}
                  >
                    <div className="flex-1 h-px bg-emerald-500/50"></div>
                    <div className="text-[10px] font-mono text-emerald-500">
                      {formatTimeAMPM(currentHour, currentMinute)}
                    </div>
                    <div className="flex-1 h-px bg-emerald-500/50"></div>
                  </div>
                )}

                {/* Prayer Divider - positioned based on minutes */}
                {prayer && (
                  <div
                    className="absolute left-0 right-0 flex items-center gap-2 py-2 z-10"
                    style={{ top: `${((prayer as any).minutes / 60) * 72}px` }}
                  >
                    <div className="flex-1 h-px border-t border-dashed border-emerald-500/20"></div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                      <span className="text-emerald-600/50">{getPrayerIcon(prayer.icon)}</span>
                      <span>{prayer.name}</span>
                      <span className="text-zinc-600">{prayer.time}</span>
                    </div>
                    <div className="flex-1 h-px border-t border-dashed border-emerald-500/20"></div>
                  </div>
                )}
                {viewMode === 'stacked' ? (
                  <>
                    {/* STACKED VIEW */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="text-xs font-mono text-zinc-600 shrink-0">{slot.time}</div>

                        {/* Always show add button on hover - INLINE with time */}
                        {isHovered && !isAdding && (
                          <div
                            className="text-xs text-zinc-700 cursor-text hover:text-zinc-500 shrink-0"
                            onClick={() => {
                              setQuickAddTime(slot.time);
                              setShowDockPicker(false);
                            }}
                          >
                            + Add
                          </div>
                        )}
                      </div>

                      {isHovered && !isAdding && backlogTasks.length > 0 && (
                        <button
                          onClick={() => {
                            setQuickAddTime(slot.time);
                            setShowDockPicker(true);
                          }}
                          className="text-xs text-zinc-600 hover:text-zinc-400 flex items-center gap-1 transition-colors shrink-0"
                        >
                          <List size={11} />
                        </button>
                      )}
                    </div>

                    {/* Tasks BELOW the time */}
                    {tasksAtTime.length > 0 && (
                      <div className="space-y-2 ml-3">
                        {tasksAtTime.map(task => (
                          <TaskLine
                            key={task.id}
                            task={task}
                            onUpdate={onUpdate}
                            onStartSession={onStartSession}
                            isActive={activeTaskId === task.id}
                            onDragStart={() => onDragStart(task)}
                            onDragEnd={handleDragEnd}
                            isEditing={editingTaskId === task.id}
                            onEditingChange={onEditingChange}
                            viewMode={viewMode}
                            onDelete={(id) => onUpdate(id, { scheduledTime: null })}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* INLINE VIEW */}
                    <div className="flex items-center justify-between mb-2 gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="text-xs font-mono text-zinc-600 shrink-0">{slot.time}</div>

                        {tasksAtTime.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                            {tasksAtTime.map(task => (
                              <TaskLine
                                key={task.id}
                                task={task}
                                onUpdate={onUpdate}
                                onStartSession={onStartSession}
                                isActive={activeTaskId === task.id}
                                onDragStart={() => onDragStart(task)}
                                onDragEnd={handleDragEnd}
                                isEditing={editingTaskId === task.id}
                                onEditingChange={onEditingChange}
                                viewMode={viewMode}
                                onDelete={(id) => onUpdate(id, { scheduledTime: null })}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Buttons on the right in inline mode */}
                      {isHovered && !isAdding && (
                        <div className="flex items-center gap-2 shrink-0">
                          <div
                            className="text-xs text-zinc-700 cursor-text hover:text-zinc-500"
                            onClick={() => {
                              setQuickAddTime(slot.time);
                              setShowDockPicker(false);
                            }}
                          >
                            + Add
                          </div>
                          {backlogTasks.length > 0 && (
                            <button
                              onClick={() => {
                                setQuickAddTime(slot.time);
                                setShowDockPicker(true);
                              }}
                              className="text-xs text-zinc-600 hover:text-zinc-400 flex items-center gap-1 transition-colors"
                            >
                              <List size={11} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {isAdding && (
                  <div className="ml-3">
                    {showDockPicker && backlogTasks.length > 0 ? (
                      <div className="p-3 bg-zinc-900/80 border border-zinc-700 rounded space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-zinc-500">From backlog:</div>
                          <button
                            onClick={() => setShowDockPicker(false)}
                            className="text-xs text-zinc-600 hover:text-zinc-400"
                          >
                            Close
                          </button>
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1.5">
                          {backlogTasks.map(task => (
                            <button
                              key={task.id}
                              onClick={() => handleScheduleDockTask(task, slot.hour)}
                              className="w-full text-left p-1 bg-zinc-800/50 hover:bg-zinc-800 rounded text-xs text-zinc-300 transition-colors break-words"
                            >
                              {task.title}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setShowDockPicker(false)}
                          className="w-full text-xs text-zinc-500 hover:text-zinc-400 pt-1 border-t border-zinc-800"
                        >
                          + New task
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 bg-zinc-900/80 border border-zinc-700 rounded">
                        <textarea
                          ref={inputRef}
                          value={quickAddText}
                          onChange={e => setQuickAddText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleQuickAdd(slot.hour);
                            } else if (e.key === 'Tab') {
                              e.preventDefault();
                              handleQuickAdd(slot.hour);
                              // Open next hour's input
                              setTimeout(() => {
                                const nextHour = slot.hour + 1;
                                if (nextHour <= 23) {
                                  const nextSlot = timeSlots.find(s => s.hour === nextHour);
                                  if (nextSlot) {
                                    setQuickAddTime(nextSlot.time);
                                    setShowDockPicker(false);
                                  }
                                }
                              }, 50);
                            } else if (e.key === 'Escape') {
                              setQuickAddTime(null);
                              setQuickAddText('');
                              setShowDockPicker(false);
                            }
                          }}
                          placeholder="Type task (Enter to save, Shift+Enter for newline, Tab for next)"
                          rows={2}
                          className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-700 outline-none resize-none"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Unscheduled Tasks */}
        <div
          className={`mt-8 pt-5 border-t border-dashed border-zinc-800 transition-colors ${draggingOver === 23 ? 'bg-emerald-900/10' : ''}`}
          onDragOver={(e) => handleDragOver(e, 23)}
          onDrop={(e) => handleDrop(e, 23)}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-mono text-zinc-600">Unscheduled</div>
            <button
              onClick={handleAddUnscheduled}
              className="text-xs text-zinc-600 hover:text-zinc-400 flex items-center gap-1"
            >
              <Plus size={12} />
            </button>
          </div>
          <div className="space-y-2 ml-3">
            {unscheduledTasks.map(task => (
              <TaskLine
                key={task.id}
                task={task}
                onUpdate={onUpdate}
                onStartSession={onStartSession}
                isActive={activeTaskId === task.id}
                onDragStart={() => onDragStart(task)}
                onDragEnd={handleDragEnd}
                isEditing={editingTaskId === task.id}
                onEditingChange={onEditingChange}
                viewMode={viewMode}
                onDelete={(id) => onUpdate(id, { scheduledTime: null })}
              />
            ))}
            {quickAddTime === 'unscheduled' && (
              <div className="p-2 bg-zinc-900/80 border border-zinc-700 rounded">
                <textarea
                  ref={inputRef}
                  value={quickAddText}
                  onChange={e => setQuickAddText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleQuickAddUnscheduled();
                    } else if (e.key === 'Escape') {
                      setQuickAddTime(null);
                      setQuickAddText('');
                    }
                  }}
                  placeholder="Type task (Enter to save, Shift+Enter for newline)"
                  rows={2}
                  className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-700 outline-none resize-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// Task Line - Simple text, calm
interface TaskLineProps {
  task: Task;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onStartSession: (id: string) => void;
  isActive: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  isEditing: boolean;
  onEditingChange: (id: string | null) => void;
  viewMode: 'inline' | 'stacked';
  onDelete?: (id: string) => void;
}

const TaskLine: React.FC<TaskLineProps> = ({ task, onUpdate, onStartSession, isActive, onDragStart, onDragEnd, isEditing, onEditingChange, viewMode, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [editText, setEditText] = useState(task.title + (task.notes ? '\n' + task.notes : ''));

  const handleSave = () => {
    const lines = editText.trim().split('\n');
    const title = lines[0];
    const description = lines.slice(1).join('\n').trim();

    onUpdate(task.id, {
      title,
      notes: description || undefined,
    });
    onEditingChange(null);
  };

  const handleCancel = () => {
    setEditText(task.title + (task.notes ? '\n' + task.notes : ''));
    onEditingChange(null);
  };

  const hasDescription = !!task.notes;
  const isDone = task.status === TaskStatus.DONE;

  if (isEditing) {
    return (
      <div className="p-3 bg-zinc-900/50 border border-zinc-700 rounded">
        <textarea
          value={editText}
          onChange={e => setEditText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && e.metaKey) handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          rows={4}
          className="w-full bg-transparent text-sm text-zinc-200 outline-none resize-none"
          autoFocus
        />
        <div className="flex gap-1.5 mt-2">
          <button
            onClick={handleSave}
            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-bold rounded transition-colors"
          >
            Save
          </button>
          {task.scheduledTime && (
            <button
              onClick={() => {
                onUpdate(task.id, { scheduledTime: null });
                onEditingChange(null);
              }}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 text-[10px] rounded transition-colors"
              title="Push to backlog"
            >
              → Backlog
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => {
                if (window.confirm('Delete this task?')) {
                  onDelete(task.id);
                  onEditingChange(null);
                }
              }}
              className="px-2.5 py-1 bg-red-900/30 hover:bg-red-900/50 border border-red-900/50 text-red-400 text-[10px] rounded transition-colors"
            >
              Delete
            </button>
          )}
          <button
            onClick={handleCancel}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[10px] rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (viewMode === 'inline') {
    // INLINE VIEW - Compact pills
    return (
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className={`group inline-flex items-center gap-1.5 px-2 py-1 rounded transition-colors cursor-grab active:cursor-grabbing ${isActive ? 'bg-emerald-950/20' : 'hover:bg-zinc-900/50'
          }`}
      >
        <GripVertical size={10} className="text-zinc-700 opacity-0 group-hover:opacity-100 shrink-0" />
        {task.impact === 'HIGH' && !isDone && (
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        )}
        <div
          onClick={() => onEditingChange(task.id)}
          className={`text-xs cursor-text leading-tight truncate max-w-[140px] ${isDone ? 'line-through text-zinc-500' : 'text-zinc-300'
            }`}
          title={task.title}
        >
          {task.title}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => (isActive ? null : onStartSession(task.id))}
            className="p-0.5 text-zinc-600 hover:text-emerald-500 transition-colors"
          >
            {isActive ? <Pause size={10} /> : <Play size={10} />}
          </button>
          <button
            onClick={() =>
              onUpdate(task.id, {
                status: isDone ? TaskStatus.TODO : TaskStatus.DONE,
              })
            }
            className={`p-0.5 transition-colors ${isDone ? 'text-emerald-500 hover:text-zinc-400' : 'text-zinc-600 hover:text-zinc-400'
              }`}
          >
            <Check size={10} />
          </button>
        </div>
      </div>
    );
  }

  // STACKED VIEW - Full layout
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group py-2 transition-colors cursor-grab active:cursor-grabbing ${isActive ? 'bg-emerald-950/10' : 'hover:bg-zinc-900/30'
        }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical size={11} className="text-zinc-700 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5" />
        {task.impact === 'HIGH' && !isDone && (
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
        )}
        {hasDescription && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-zinc-600 hover:text-zinc-500 shrink-0 mt-0.5"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRightIcon size={12} />}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div
            onClick={() => onEditingChange(task.id)}
            className={`text-sm cursor-text leading-relaxed break-words ${isDone ? 'line-through text-zinc-500' : 'text-zinc-300'
              }`}
          >
            {task.title}
          </div>
          {hasDescription && expanded && (
            <div className="mt-2 text-xs text-zinc-500 leading-relaxed pl-3 ml-2 border-l border-zinc-800">
              {task.notes}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => (isActive ? null : onStartSession(task.id))}
            className="p-1 text-zinc-600 hover:text-emerald-500 transition-colors"
          >
            {isActive ? <Pause size={11} /> : <Play size={11} />}
          </button>
          <button
            onClick={() =>
              onUpdate(task.id, {
                status: isDone ? TaskStatus.TODO : TaskStatus.DONE,
              })
            }
            className={`p-1 transition-colors ${isDone ? 'text-emerald-500 hover:text-zinc-400' : 'text-zinc-600 hover:text-zinc-400'
              }`}
          >
            <Check size={11} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeeklyPlannerView;
