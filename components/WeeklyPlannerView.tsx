import React, { useState, useEffect, useRef } from 'react';
import type { AppState, Task, DockSection, DayMeta, DayChecklistItem } from '../types';
import { Category, TaskStatus } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Check,
  Play,
  Clock,
  GripVertical,
  Sunrise,
  Sun,
  CloudSun,
  Sunset,
  Moon,
  Trash2,
  Repeat,
  FileText,
  Mountain,
  ListTodo,
  Archive,
  CheckCircle2,
  AlertCircle,
  Copy,
  ArrowRight,
  ArrowLeft,
  Pencil,
  MoreHorizontal
} from 'lucide-react';
import InspectorPanel from './InspectorPanel';
import HourOverlay from './HourOverlay';
import { getPrayerTimesForDate, formatTimeAMPM } from '../utils/prayerTimes';
import { generateId } from '../utils';

interface Props {
  state: AppState;
  onAdd: (title: string, category: Category, impact: 'LOW' | 'MED' | 'HIGH', options?: any) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onStartSession: (id: string) => void;
  activeTaskId: string | null;
  onDelete: (id: string) => void;
  onStickyNoteUpdate: (dateKey: string, content: string) => void;
  onDayMetaUpdate: (dateKey: string, updates: Partial<DayMeta>) => void;
}

interface WeekDay {
  date: Date;
  dateStr: string;
  dayName: string;
  dayNum: number;
  isToday: boolean;
}

type DayPanelType = 'notes' | 'habits' | 'checklist' | 'focus' | 'actions';

const RITUAL_ITEMS = ['Azkar', 'Supplements', 'Workout', 'Quran'];
const FOCUS_OPTIONS = ['Deep Work', 'Admin', 'Creative', 'Recovery'];

// Helper for hoist
const WeeklyPlannerViewWrapper: React.FC<Props> = (props) => {
  return <WeeklyPlannerView {...props} />;
};

const getPrayerIcon = (iconName: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    sunrise: <Sunrise size={9} />,
    sun: <Sun size={9} />,
    'cloud-sun': <CloudSun size={9} />,
    sunset: <Sunset size={9} />,
    moon: <Moon size={9} />,
  };
  return iconMap[iconName] || <Sun size={9} />;
};

// Hour Slot (Fixed Height, Thin Tasks)
const HourSlot: React.FC<{
  hour: number;
  day: WeekDay;
  tasks: Task[];
  prayers: Array<{ name: string; time: string; timestamp: number; icon: string }>;
  isDragOver: boolean;
  onDrop: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onStartSession: (id: string) => void;
  activeTaskId: string | null;
  isCurrentHour: boolean;
  onSelect: (task: Task) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onClickHour: (e: React.MouseEvent) => void;
  getTaskTone: (task: Task) => string;
  onUnschedule: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onSetStatus: (taskId: string, status: TaskStatus) => void;
}> = ({ tasks, prayers, isDragOver, onDrop, onDragOver, onDragLeave, onUpdate, activeTaskId, isCurrentHour, onSelect, onContextMenu, onClickHour, getTaskTone, onUnschedule, onDelete, onSetStatus }) => {
  // Logic to show "More" button if tasks exceed capacity (3 tasks max usually fit in 56px)
  const MAX_TASKS = 3;
  const showMore = tasks.length > MAX_TASKS;
  const visibleTasks = showMore ? tasks.slice(0, MAX_TASKS - 1) : tasks;
  const hiddenCount = tasks.length - visibleTasks.length;

  return (
    <div
      onDrop={e => { e.preventDefault(); onDrop(); }}
      onDragOver={e => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onContextMenu={onContextMenu}
      onClick={onClickHour}
      className={`relative border-b border-zinc-900/40 px-1 py-1 transition-colors ${isDragOver ? 'bg-zinc-800/30' : 'hover:bg-zinc-900/20'
        } ${isCurrentHour ? 'bg-zinc-900/10' : ''}`}
      style={{ height: '56px' }}
    >
      {/* Prayer Markers */}
      {prayers.map(prayer => {
        const prayerDate = new Date(prayer.timestamp);
        const minutes = prayerDate.getMinutes();
        const topPercent = (minutes / 60) * 100;

        return (
          <div
            key={prayer.name}
            className="absolute left-0 right-0 z-0 flex items-center group/prayer pointer-events-none"
            style={{ top: `${topPercent}%` }}
          >
            <div className="w-full h-px bg-emerald-500/20 group-hover/prayer:bg-emerald-500/40" />
            <div className="absolute right-1 -translate-y-1/2 flex items-center gap-1 bg-background/80 backdrop-blur px-1 rounded text-[9px] text-emerald-600/70 border border-emerald-900/20 scale-75 origin-right opacity-0 group-hover/prayer:opacity-100 transition-opacity">
              {prayer.icon} <span className="uppercase font-medium tracking-wide">{prayer.name}</span>
            </div>
          </div>
        );
      })}

      {/* Current Hour Indicator */}
      {isCurrentHour && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500/30 z-0" />
      )}

      {/* Tasks Stack */}
      <div className="absolute inset-x-1 top-1 bottom-1 flex flex-col gap-0.5 overflow-hidden z-20">
        {visibleTasks.map(task => (
          <div
            key={task.id}
            onClick={(e) => { e.stopPropagation(); onSelect(task); }}
            className={`
              flex items-center px-1.5 rounded-[1px] cursor-pointer border-l-[1.5px]
              text-[9px] truncate transition-all hover:brightness-110
              ${activeTaskId === task.id ? 'ring-1 ring-emerald-500/30 bg-zinc-800' : ''}
              ${getTaskTone(task)}
              ${task.status === TaskStatus.DONE ? 'opacity-40 grayscale decoration-zinc-500 line-through' : ''}
            `}
            style={{ height: '18px', flexShrink: 0 }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetStatus(task.id, task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE);
              }}
              className={`w-1.5 h-1.5 rounded-full border mr-1.5 flex-shrink-0 transition-colors ${task.status === TaskStatus.DONE
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-zinc-600 hover:border-zinc-400'
                }`}
            />
            <span className="truncate font-medium flex-1 text-zinc-300">
              {task.title.replace(' — session', '')}
              {task.title.includes(' — session') && <span className="text-zinc-600 font-normal ml-1">session</span>}
            </span>
            {task.urgent && <div className="w-1 h-1 rounded-full bg-red-500/80 ml-1" />}
          </div>
        ))}

        {showMore && (
          <div
            className="flex items-center justify-center h-[17px] rounded-[1px] bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800/50 cursor-pointer text-[9px] text-zinc-500 transition-colors"
            onClick={onClickHour}
          >
            +{hiddenCount} more items
          </div>
        )}
      </div>
    </div>
  );
};

// Day Column
const DayColumn: React.FC<{
  day: WeekDay;
  tasks: Task[];
  dragOverHour: number | null;
  onDrop: (day: WeekDay, hour: number) => void;
  onDragOver: (hour: number | null) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onStartSession: (id: string) => void;
  activeTaskId: string | null;
  currentTime: Date;
  onSelect: (task: Task) => void;
  onContextMenu: (hour: number, e: React.MouseEvent) => void;
  onClickHour: (hour: number, e: React.MouseEvent) => void;
  showPrayers: boolean;
  getTaskTone: (task: Task) => string;
  onUnschedule: (taskId: string) => void;
  onSetStatus: (taskId: string, status: TaskStatus) => void;
  onOpenDayPanel: (type: DayPanelType, e: React.MouseEvent) => void;
  dayMeta: DayMeta;
  stickyNote: string;
}> = ({ day, tasks, dragOverHour, onDrop, onDragOver, onUpdate, onDelete, onStartSession, activeTaskId, currentTime, onSelect, onContextMenu, onClickHour, showPrayers, getTaskTone, onUnschedule, onSetStatus, onOpenDayPanel, dayMeta, stickyNote }) => {
  const cairoOffset = 2;
  const cairoTime = new Date(currentTime.getTime() + (cairoOffset * 60 * 60 * 1000));
  const cairoHours = cairoTime.getUTCHours();
  const isCurrentDay = day.isToday;

  const prayers = getPrayerTimesForDate(day.date);

  // Helper to check if icon should be lit
  const hasMeta = (type: DayPanelType) => {
    if (type === 'notes') return !!stickyNote;
    if (type === 'habits') return false; // Check logic later
    if (type === 'checklist') return (dayMeta.checklist || []).length > 0;
    if (type === 'focus') return !!dayMeta.focus;
    return false;
  };

  return (
    <div className={`border-r border-border flex flex-col ${day.isToday ? 'bg-emerald-950/5' : ''}`}>
      <div className={`h-16 border-b border-border px-2 py-1 flex flex-col justify-between ${day.isToday ? 'bg-emerald-950/10' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[7px] text-zinc-600 uppercase font-bold tracking-wider">{day.dayName}</div>
            <div className={`text-base font-light ${day.isToday ? 'text-emerald-400' : 'text-zinc-300'}`}>
              {day.dayNum}
            </div>
          </div>
          {dayMeta.focus && (
            <span className="text-[8px] text-zinc-500 border border-zinc-800 rounded px-1 py-0.5 opacity-60">
              {dayMeta.focus}
            </span>
          )}
        </div>
        <div className="flex justify-between px-0.5 opacity-40 hover:opacity-100 transition-opacity">
          <button onClick={(e) => onOpenDayPanel('notes', e)} className={`${hasMeta('notes') ? 'text-zinc-200 opacity-100' : 'text-zinc-700'} hover:text-zinc-300`}><FileText size={10} /></button>
          <button onClick={(e) => onOpenDayPanel('habits', e)} className="text-zinc-700 hover:text-emerald-400"><CheckCircle2 size={10} /></button>
          <button onClick={(e) => onOpenDayPanel('checklist', e)} className={`${hasMeta('checklist') ? 'text-blue-400 opacity-100' : 'text-zinc-700'} hover:text-blue-400`}><ListTodo size={10} /></button>
          <button onClick={(e) => onOpenDayPanel('focus', e)} className={`${hasMeta('focus') ? 'text-purple-400 opacity-100' : 'text-zinc-700'} hover:text-purple-400`}><GripVertical size={10} /></button>
          <button onClick={(e) => onOpenDayPanel('actions', e)} className="text-zinc-700 hover:text-zinc-400"><MoreHorizontal size={10} /></button>
        </div>
      </div>

      <div>
        {Array.from({ length: 24 }, (_, i) => i).map(hour => {
          const hourTasks = tasks.filter(t => t.scheduledTime && new Date(t.scheduledTime).getHours() === hour);
          const hourPrayers = showPrayers ? prayers.filter(p => new Date(p.timestamp).getHours() === hour) : [];

          return (
            <HourSlot
              key={hour}
              hour={hour}
              day={day}
              tasks={hourTasks}
              prayers={hourPrayers}
              isDragOver={dragOverHour === hour}
              onDrop={() => onDrop(day, hour)}
              onDragOver={() => onDragOver(hour)}
              onDragLeave={() => onDragOver(null)}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onStartSession={onStartSession}
              activeTaskId={activeTaskId}
              isCurrentHour={isCurrentDay && cairoHours === hour}
              onSelect={onSelect}
              onContextMenu={(e) => onContextMenu(hour, e)}
              onClickHour={(e) => onClickHour(hour, e)}
              getTaskTone={getTaskTone}
              onUnschedule={onUnschedule}
              onSetStatus={onSetStatus}
            />
          );
        })}
      </div>
    </div>
  );
};

// Dock Section
const DockSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  type: DockSection;
  tasks: Task[];
  onDragStart: (task: Task) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onAdd: Props['onAdd'];
  onSelect: (task: Task) => void;
  onExpand?: (task: Task) => void;
  currentDate?: string;
}> = ({ title, icon, type, tasks, onDragStart, onUpdate, onDelete, onAdd, onSelect, onExpand, currentDate }) => {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAdd(newTitle.trim(), Category.AGENCY, 'MED', { dockSection: type });
    setNewTitle('');
    setAdding(false);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-[8px] text-zinc-600 uppercase tracking-wider">
          {icon}
          <span>{title}</span>
          {tasks.length > 0 && <span className="text-zinc-700">{tasks.length}</span>}
        </div>
        <button onClick={() => setAdding(true)} className="text-zinc-700 hover:text-zinc-400">
          <Plus size={10} />
        </button>
      </div>

      {adding && (
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onBlur={() => { if (!newTitle.trim()) setAdding(false); }}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
          placeholder="..."
          className="w-full bg-zinc-900 border-0 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          autoFocus
        />
      )}

      {tasks.map(task => (
        type === 'TEMPLATE' ? (
          <div
            key={task.id}
            onClick={() => onSelect(task)}
            className="group bg-zinc-900/30 hover:bg-zinc-900 rounded px-2 py-1 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <FileText size={9} className="text-blue-400 flex-shrink-0" />
              <div className="flex-1 text-[10px] text-zinc-400 truncate">{task.title}</div>
              <button
                onClick={(e) => { e.stopPropagation(); onSelect(task); }}
                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300"
              >
                <Pencil size={10} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400"
              >
                <Trash2 size={10} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onExpand?.(task); }} className="text-[8px] text-blue-400 hover:text-blue-300">
                Apply
              </button>
            </div>
          </div>
        ) : type === 'HABIT' ? (
          <div
            key={task.id}
            onClick={() => onSelect(task)}
            className="group bg-zinc-900/30 hover:bg-zinc-900 rounded px-2 py-1 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const isChecked = task.habitTracking?.[currentDate!] || false;
                  const newTracking = { ...(task.habitTracking || {}), [currentDate!]: !isChecked };
                  onUpdate(task.id, { habitTracking: newTracking });
                }}
                className="flex-shrink-0"
              >
                {task.habitTracking?.[currentDate!] ? (
                  <CheckCircle2 size={10} className="text-emerald-500" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full border border-zinc-600" />
                )}
              </button>
              <div className="flex-1 text-[10px] text-zinc-400 truncate">{task.title}</div>
              <button
                onClick={(e) => { e.stopPropagation(); onSelect(task); }}
                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300"
              >
                <Pencil size={10} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400"
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        ) : (
          <div
            key={task.id}
            draggable
            onDragStart={() => onDragStart(task)}
            onClick={() => onSelect(task)}
            className="group bg-zinc-900/30 hover:bg-zinc-900 rounded px-2 py-1 cursor-move"
          >
            <div className="flex items-center gap-1.5">
              <GripVertical size={8} className="text-zinc-700 flex-shrink-0" />
              <div className="flex-1 text-[10px] text-zinc-400 truncate">
                {task.urgent && <span className="text-red-400 mr-1">!</span>}
                {task.title}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onSelect(task); }}
                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300"
              >
                <Pencil size={10} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400"
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        )
      ))}
    </div>
  );
};

const WeeklyPlannerView: React.FC<Props> = ({ state, onAdd, onUpdate, onStartSession, activeTaskId, onDelete, onStickyNoteUpdate, onDayMetaUpdate }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const [inspectorTask, setInspectorTask] = useState<Task | null>(null);
  const [hourOverlay, setHourOverlay] = useState<{ day: WeekDay; hour: number; anchor: HTMLElement } | null>(null);
  const [dayPanel, setDayPanel] = useState<{ day: WeekDay; type: DayPanelType; x: number; y: number } | null>(null);
  const [checklistDraft, setChecklistDraft] = useState('');
  const [expandingTemplate, setExpandingTemplate] = useState<Task | null>(null);
  const [showPrayers, setShowPrayers] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
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
    const dayNames = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const todayCheck = new Date();
      todayCheck.setHours(0, 0, 0, 0);
      const isToday = date.getTime() === todayCheck.getTime();

      days.push({
        date,
        dateStr: date.toISOString().split('T')[0],
        dayName: dayNames[i],
        dayNum: date.getDate(),
        isToday
      });
    }
    return days;
  };

  const weekDays = getWeekDays();
  const unscheduledTasks = state.tasks.filter(t => !t.scheduledTime && t.status !== TaskStatus.DONE);

  const dockTasks = {
    ROUTINE: unscheduledTasks.filter(t => t.dockSection === 'ROUTINE'),
    TEMPLATE: unscheduledTasks.filter(t => t.dockSection === 'TEMPLATE'),
    PROJECT: unscheduledTasks.filter(t => t.dockSection === 'PROJECT'),
    TODO: unscheduledTasks.filter(t => t.dockSection === 'TODO' || !t.dockSection),
    LATER: unscheduledTasks.filter(t => t.dockSection === 'LATER'),
    HABIT: unscheduledTasks.filter(t => t.dockSection === 'HABIT'),
  };

  // Get urgent tasks from ALL sections
  const urgentTasks = state.tasks.filter(t => t.urgent && t.status !== TaskStatus.DONE);



  const handleOpenHourOverlay = (day: WeekDay, hour: number, anchor: HTMLElement) => {
    setHourOverlay({ day, hour, anchor });
  };

  const handleOpenDayPanel = (day: WeekDay, type: DayPanelType, e: React.MouseEvent) => {
    setDayPanel({ day, type, x: e.clientX, y: e.clientY });
  };

  const handleJumpToNow = () => {
    if (!scrollRef.current) return;
    const hour = new Date().getHours();
    const slotHeight = 56;
    const headerHeight = 64;
    scrollRef.current.scrollTo({ top: (hour * slotHeight) + headerHeight - 24, behavior: 'smooth' });
  };



  const getDockLabel = (section?: DockSection) => {
    switch (section) {
      case 'ROUTINE':
        return 'Routine';
      case 'TEMPLATE':
        return 'Template';
      case 'PROJECT':
        return 'Project';
      case 'LATER':
        return 'Later';
      case 'HABIT':
        return 'Habit';
      default:
        return 'To Do';
    }
  };

  const getTaskTone = (task: Task) => {
    if (task.urgent) return 'border-red-900/50 bg-red-950/20';
    switch (task.dockSection) {
      case 'ROUTINE':
        return 'border-orange-900/50 bg-orange-950/20';
      case 'TEMPLATE':
        return 'border-blue-900/50 bg-blue-950/20';
      case 'PROJECT':
        return 'border-purple-900/50 bg-purple-950/20';
      case 'HABIT':
        return 'border-emerald-900/50 bg-emerald-950/20';
      case 'LATER':
        return 'border-zinc-800 bg-zinc-900/50';
      default:
        return 'border-zinc-800 bg-zinc-900/40';
    }
  };

  const getDayMeta = (dateKey: string): DayMeta => {
    return state.dayMeta?.[dateKey] || {};
  };

  const handleToggleRitual = (dateKey: string, label: string) => {
    const current = getDayMeta(dateKey).rituals || {};
    onDayMetaUpdate(dateKey, { rituals: { ...current, [label]: !current[label] } });
  };

  const handleAddChecklistItem = (dateKey: string) => {
    if (!checklistDraft.trim()) return;
    const current = getDayMeta(dateKey).checklist || [];
    const newItem: DayChecklistItem = { id: generateId(), label: checklistDraft.trim(), done: false };
    onDayMetaUpdate(dateKey, { checklist: [...current, newItem] });
    setChecklistDraft('');
  };

  const handleToggleChecklistItem = (dateKey: string, itemId: string) => {
    const current = getDayMeta(dateKey).checklist || [];
    const updated = current.map(item => item.id === itemId ? { ...item, done: !item.done } : item);
    onDayMetaUpdate(dateKey, { checklist: updated });
  };

  const handleDeleteChecklistItem = (dateKey: string, itemId: string) => {
    const current = getDayMeta(dateKey).checklist || [];
    onDayMetaUpdate(dateKey, { checklist: current.filter(item => item.id !== itemId) });
  };

  const handleSetFocus = (dateKey: string, focus: string) => {
    onDayMetaUpdate(dateKey, { focus });
  };

  const handleCopyDayMeta = (sourceKey: string, targetKey: string) => {
    const sourceMeta = getDayMeta(sourceKey);
    const sourceNote = state.stickyNotes?.[sourceKey] || '';
    onStickyNoteUpdate(targetKey, sourceNote);
    onDayMetaUpdate(targetKey, {
      rituals: sourceMeta.rituals ? { ...sourceMeta.rituals } : {},
      focus: sourceMeta.focus || '',
      checklist: sourceMeta.checklist ? sourceMeta.checklist.map(item => ({ ...item, id: generateId() })) : []
    });
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDrop = (day: WeekDay, hour: number) => {
    if (!draggedTask) return;

    const scheduledDate = new Date(day.date);
    scheduledDate.setHours(hour, 0, 0, 0);

    const section = draggedTask.dockSection;

    if (section === 'ROUTINE') {
      onAdd(draggedTask.title, draggedTask.category, draggedTask.impact, {
        scheduledTime: scheduledDate.getTime(),
        duration: draggedTask.duration,
        urgent: draggedTask.urgent,
      });
    } else if (section === 'PROJECT') {
      onAdd(`${draggedTask.title} — session`, draggedTask.category, draggedTask.impact, {
        scheduledTime: scheduledDate.getTime(),
        duration: draggedTask.duration || 60,
        parentProject: draggedTask.id,
        urgent: draggedTask.urgent,
      });
    } else {
      onUpdate(draggedTask.id, { scheduledTime: scheduledDate.getTime() });
    }

    setDraggedTask(null);
    setDragOverHour(null);
  };

  const handleTemplateExpand = (template: Task, day: WeekDay) => {
    if (!template.templateSteps || template.templateSteps.length === 0) return;

    let hour = 9;
    template.templateSteps.forEach((step, index) => {
      const scheduledDate = new Date(day.date);
      scheduledDate.setHours(hour + index, 0, 0, 0);

      onAdd(step, template.category, template.impact, {
        scheduledTime: scheduledDate.getTime(),
        duration: 30,
      });
    });

    setExpandingTemplate(null);
  };



  return (
    <div className="flex h-full bg-background relative">
      {/* Dock */}
      <div className={`border-r border-border bg-surface transition-all ${dockCollapsed ? 'w-12' : 'w-60'} flex-shrink-0 z-10`}>
        {dockCollapsed ? (
          <button onClick={() => setDockCollapsed(false)} className="w-full h-12 flex items-center justify-center text-zinc-500 hover:text-zinc-300">
            <ChevronRight size={16} />
          </button>
        ) : (
          <div className="h-full flex flex-col">
            <div className="h-12 border-b border-border flex items-center justify-between px-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Dock</span>
              <button onClick={() => setDockCollapsed(true)} className="text-zinc-600 hover:text-zinc-300">
                <ChevronLeft size={16} />
              </button>
            </div>

            {/* Global Quick Add */}
            <div className="px-2 pt-3 pb-1">
              <input
                placeholder="Add to inbox..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 placeholder:text-zinc-700"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value;
                    if (val.trim()) {
                      onAdd(val.trim(), Category.AGENCY, 'MED', { dockSection: 'TODO' });
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {urgentTasks.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 text-[8px] text-red-400 uppercase tracking-wider">
                      <AlertCircle size={9} />
                      <span>Urgent Spotlight</span>
                      <span className="text-red-600">({urgentTasks.length})</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {urgentTasks.map(task => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => handleDragStart(task)}
                        onClick={(e) => setInspectorTask(task)}
                        className="group bg-red-950/10 hover:bg-red-950/20 border border-red-900/30 rounded px-2 py-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <GripVertical size={8} className="text-red-700 flex-shrink-0" />
                          <div className="flex-1 text-[10px] text-red-300 truncate">
                            {task.title}
                          </div>
                          <span className="text-[8px] text-red-400 border border-red-900/40 rounded px-1 py-0.5 uppercase">
                            {getDockLabel(task.dockSection)}
                          </span>
                        </div>
                        {task.scheduledTime && (
                          <div className="text-[9px] text-red-600 mt-0.5">
                            {new Date(task.scheduledTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DockSection
                title="Routines"
                icon={<Repeat size={9} />}
                type="ROUTINE"
                tasks={dockTasks.ROUTINE}
                onDragStart={handleDragStart}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onAdd={onAdd}

                onSelect={(task) => setInspectorTask(task)}
              />

              <DockSection
                title="Templates"
                icon={<FileText size={9} />}
                type="TEMPLATE"
                tasks={dockTasks.TEMPLATE}
                onDragStart={handleDragStart}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onAdd={onAdd}
                onSelect={(task) => setInspectorTask(task)}
                onExpand={setExpandingTemplate}
              />

              <DockSection
                title="Projects"
                icon={<Mountain size={9} />}
                type="PROJECT"
                tasks={dockTasks.PROJECT}
                onDragStart={handleDragStart}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onAdd={onAdd}
                onSelect={(task) => setInspectorTask(task)}
              />

              <DockSection
                title="To Do"
                icon={<ListTodo size={9} />}
                type="TODO"
                tasks={dockTasks.TODO}
                onDragStart={handleDragStart}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onAdd={onAdd}
                onSelect={(task) => setInspectorTask(task)}
              />

              <DockSection
                title="Later"
                icon={<Archive size={9} />}
                type="LATER"
                tasks={dockTasks.LATER}
                onDragStart={handleDragStart}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onAdd={onAdd}
                onSelect={(task) => setInspectorTask(task)}
              />

              <DockSection
                title="Habits"
                icon={<CheckCircle2 size={9} />}
                type="HABIT"
                tasks={dockTasks.HABIT}
                onDragStart={handleDragStart}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onAdd={onAdd}
                onSelect={(task) => setInspectorTask(task)}
                currentDate={currentTime.toISOString().split('T')[0]}
              />
            </div>
          </div>
        )}
      </div>

      {/* Planner */}
      <div className="flex-1 flex flex-col relative">
        <div className="h-12 border-b border-border flex items-center justify-between px-4 z-10 bg-background">
          <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-2 text-zinc-500 hover:text-zinc-300">
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-zinc-300">
              {weekDays[0].dayNum} {weekDays[0].date.toLocaleString('default', { month: 'short' })} - {weekDays[6].dayNum} {weekDays[6].date.toLocaleString('default', { month: 'short' })}
            </div>
            <button
              onClick={() => setWeekOffset(0)}
              className="px-2 py-1 text-[10px] text-zinc-400 bg-zinc-900/60 border border-zinc-800 rounded hover:bg-zinc-900"
            >
              Today
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleJumpToNow}
              className="px-3 py-1.5 text-xs text-zinc-300 bg-zinc-900 border border-zinc-800 rounded hover:bg-zinc-800"
            >
              Now
            </button>
            <button
              onClick={() => setShowPrayers(prev => !prev)}
              className={`px-2 py-1 text-[10px] border rounded ${showPrayers ? 'border-emerald-700 text-emerald-300 bg-emerald-950/30' : 'border-zinc-800 text-zinc-500 bg-zinc-900'
                }`}
            >
              Prayers
            </button>
            <button
              onClick={() => setShowCompleted(prev => !prev)}
              className={`px-2 py-1 text-[10px] border rounded ${showCompleted ? 'border-zinc-700 text-zinc-300 bg-zinc-900/70' : 'border-zinc-800 text-zinc-500 bg-zinc-900'
                }`}
            >
              Done
            </button>
            <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-2 text-zinc-500 hover:text-zinc-300">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto" ref={scrollRef}>
          <div className="min-w-[720px] flex">
            {/* Time Rail */}
            <div className="w-14 border-r border-border bg-surface flex-shrink-0 sticky left-0 z-10">
              <div className="h-16 border-b border-border" />
              {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                <div key={hour} className="h-14 border-b border-zinc-900/30 flex items-center justify-center">
                  <span className="text-[10px] text-zinc-500 font-mono">{formatTimeAMPM(hour, 0)}</span>
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="flex-1">
              <div className="grid grid-cols-7">
                {weekDays.map(day => (
                  <DayColumn
                    key={day.dateStr}
                    day={day}
                    tasks={state.tasks.filter(t => {
                      if (!t.scheduledTime) return false;
                      if (!showCompleted && t.status === TaskStatus.DONE) return false;
                      const taskDate = new Date(t.scheduledTime);
                      taskDate.setHours(0, 0, 0, 0);
                      return taskDate.getTime() === day.date.getTime();
                    })}
                    dragOverHour={dragOverHour}
                    onDrop={handleDrop}
                    onDragOver={setDragOverHour}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onStartSession={onStartSession}
                    activeTaskId={activeTaskId}
                    currentTime={currentTime}
                    onSelect={(task) => setInspectorTask(task)}
                    showPrayers={showPrayers}
                    onContextMenu={(hour, e) => {
                      e.preventDefault();
                    }}
                    onClickHour={(hour, e) => {
                      handleOpenHourOverlay(day, hour, e.currentTarget);
                    }}
                    getTaskTone={getTaskTone}
                    onUnschedule={(taskId) => onUpdate(taskId, { scheduledTime: null })}
                    onSetStatus={(taskId, status) => onUpdate(taskId, { status })}
                    onOpenDayPanel={(type, e) => handleOpenDayPanel(day, type, e)}
                    dayMeta={getDayMeta(day.dateStr)}
                    stickyNote={state.stickyNotes?.[day.dateStr] || ''}
                  />
                ))}
              </div>
            </div>
          </div>

          {hourOverlay && (
            <HourOverlay
              date={hourOverlay.day.date}
              hour={hourOverlay.hour}
              tasks={state.tasks.filter(t => {
                if (!t.scheduledTime) return false;
                const d = new Date(t.scheduledTime);
                return d.getDate() === hourOverlay.day.date.getDate() && d.getHours() === hourOverlay.hour;
              })}
              anchorEl={hourOverlay.anchor}
              dockTasks={dockTasks}
              onClose={() => setHourOverlay(null)}
              onAdd={onAdd}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onUnschedule={(id) => onUpdate(id, { scheduledTime: null })}
              onSelectTask={(task) => setInspectorTask(task)}
            />
          )}

          {/* Inspector Panel */}
          {
            inspectorTask && (
              <InspectorPanel
                task={inspectorTask}
                onClose={() => setInspectorTask(null)}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onDuplicate={(task) => onAdd(task.title, task.category, task.impact, {
                  dockSection: task.dockSection,
                  duration: task.duration,
                  notes: task.notes
                })}
                onUnschedule={(id) => onUpdate(id, { scheduledTime: null })}
              />
            )
          }

          {/* Context Menu */}
          {

          }

          {/* Quick Add */}
          {

          }

          {/* Day Panel */}
          {
            dayPanel && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDayPanel(null)} />
                <div
                  className="fixed z-50 bg-surface border border-border rounded-lg shadow-2xl p-3 w-72"
                  style={{ left: dayPanel.x, top: dayPanel.y }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-zinc-300">
                      {dayPanel.day.dayName} {dayPanel.day.dayNum}
                    </div>
                    <button onClick={() => setDayPanel(null)} className="text-zinc-600 hover:text-zinc-300">
                      <X size={12} />
                    </button>
                  </div>

                  {dayPanel.type === 'notes' && (
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase mb-1">Day Notes</div>
                      <textarea
                        value={state.stickyNotes?.[dayPanel.day.dateStr] || ''}
                        onChange={(e) => onStickyNoteUpdate(dayPanel.day.dateStr, e.target.value)}
                        placeholder="Notes, reflections, plan..."
                        className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>
                  )}

                  {dayPanel.type === 'habits' && (
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase mb-2">Daily Rituals</div>
                      <div className="space-y-1">
                        {RITUAL_ITEMS.map(item => (
                          <label key={item} className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!getDayMeta(dayPanel.day.dateStr).rituals?.[item]}
                              onChange={() => handleToggleRitual(dayPanel.day.dateStr, item)}
                              className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900"
                            />
                            <span>{item}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {dayPanel.type === 'checklist' && (
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase mb-2">Checklist</div>
                      <div className="space-y-1 mb-2">
                        {(getDayMeta(dayPanel.day.dateStr).checklist || []).map(item => (
                          <div key={item.id} className="flex items-center gap-2 text-xs text-zinc-300">
                            <button
                              onClick={() => handleToggleChecklistItem(dayPanel.day.dateStr, item.id)}
                              className="w-3.5 h-3.5 rounded border border-zinc-700 bg-zinc-900 flex items-center justify-center"
                            >
                              {item.done && <Check size={10} className="text-emerald-400" />}
                            </button>
                            <span className={`flex-1 ${item.done ? 'line-through text-zinc-500' : ''}`}>
                              {item.label}
                            </span>
                            <button
                              onClick={() => handleDeleteChecklistItem(dayPanel.day.dateStr, item.id)}
                              className="text-zinc-600 hover:text-red-400"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          value={checklistDraft}
                          onChange={(e) => setChecklistDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddChecklistItem(dayPanel.day.dateStr); }}
                          placeholder="Add item..."
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        />
                        <button
                          onClick={() => handleAddChecklistItem(dayPanel.day.dateStr)}
                          className="px-2 py-1 text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                  {dayPanel.type === 'focus' && (
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase mb-2">Focus</div>
                      <div className="flex flex-wrap gap-1">
                        {FOCUS_OPTIONS.map(option => (
                          <button
                            key={option}
                            onClick={() => handleSetFocus(dayPanel.day.dateStr, option)}
                            className={`px-2 py-0.5 text-[10px] border rounded ${getDayMeta(dayPanel.day.dateStr).focus === option
                              ? 'border-emerald-700 text-emerald-300 bg-emerald-950/30'
                              : 'border-zinc-800 text-zinc-400 bg-zinc-900'
                              }`}
                          >
                            {option}
                          </button>
                        ))}
                        <button
                          onClick={() => handleSetFocus(dayPanel.day.dateStr, '')}
                          className="px-2 py-0.5 text-[10px] border border-zinc-800 text-zinc-500 rounded"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}

                  {dayPanel.type === 'actions' && (
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase mb-2">Day Actions</div>
                      <div className="text-[10px] text-zinc-500 mb-1">Copy to</div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {weekDays.map(target => (
                          <button
                            key={target.dateStr}
                            onClick={() => handleCopyDayMeta(dayPanel.day.dateStr, target.dateStr)}
                            className="px-2 py-0.5 text-[10px] border border-zinc-800 text-zinc-400 rounded hover:bg-zinc-900"
                          >
                            {target.dayName} {target.dayNum}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          onStickyNoteUpdate(dayPanel.day.dateStr, '');
                          onDayMetaUpdate(dayPanel.day.dateStr, { rituals: {}, focus: '', checklist: [] });
                        }}
                        className="w-full px-2 py-1 text-xs bg-red-950/30 border border-red-900/40 text-red-300 rounded hover:bg-red-950/50"
                      >
                        Clear day data
                      </button>
                    </div>
                  )}
                </div>
              </>
            )
          }

          {/* Template Modal */}
          {
            expandingTemplate && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setExpandingTemplate(null)}>
                <div className="bg-surface border border-border rounded-lg p-6 w-96" onClick={e => e.stopPropagation()}>
                  <div className="text-sm font-medium text-zinc-300 mb-4">Apply: {expandingTemplate.title}</div>
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {weekDays.map(day => (
                      <button
                        key={day.dateStr}
                        onClick={() => handleTemplateExpand(expandingTemplate, day)}
                        className={`p-2 rounded text-xs ${day.isToday ? 'bg-emerald-950/30 text-emerald-400' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
                      >
                        <div className="text-[9px] opacity-60">{day.dayName}</div>
                        <div>{day.dayNum}</div>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setExpandingTemplate(null)} className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm text-zinc-300">
                    Cancel
                  </button>
                </div>
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
};



export default WeeklyPlannerView;
