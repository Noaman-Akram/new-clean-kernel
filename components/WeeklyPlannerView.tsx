import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { AppState, Task, DockSection, DayMeta, DayChecklistItem, ProtocolContext, WeeklyActivities, DayViewLayout, TimeBlock } from '../types';
import { Category, TaskStatus } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Search,
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
  StickyNote,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlignLeft,
  LayoutGrid,
  Layers,
  Target,
  Package,
  Circle,
  Settings
} from 'lucide-react';
import InspectorPanel from './InspectorPanel';
import HourOverlay from './HourOverlay';
import { getPrayerTimesForDate, formatTimeAMPM } from '../utils/prayerTimes';
import { generateId } from '../utils';
import DayView from './DayView';
import WeeklyActivitiesEditor from './WeeklyActivitiesEditor';
import { DEFAULT_TIME_ZONE, dateFromDateKey, dateKeyFromUtcDate, getDateKeyInTimeZone, getLocalTimestampForDateKey } from '../utils/dateTime';

interface Props {
  state: AppState;
  onAdd: (title: string, category: Category, impact: 'LOW' | 'MED' | 'HIGH', options?: any) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onStartSession: (id: string) => void;
  activeTaskId: string | null;
  onDelete: (id: string) => void;
  onStickyNoteUpdate: (dateKey: string, content: string) => void;
  onDayMetaUpdate: (dateKey: string, updates: Partial<DayMeta>) => void;
  onPrayerToggle?: (key: string) => void;
  onAdhkarToggle?: (key: string) => void;
  // Protocols & Weekly Activities
  onProtocolToggle?: (dateKey: string, itemId: string) => void;
  onWeeklyActivityToggle?: (dateKey: string, activityId: string) => void;
  onProtocolContextsUpdate?: (contexts: ProtocolContext[]) => void;
  onWeeklyActivitiesUpdate?: (activities: WeeklyActivities) => void;
  onLayoutChange?: (layout: DayViewLayout) => void;
  onTimeBlockAdd?: (dateKey: string, block: TimeBlock) => void;
  onTimeBlockUpdate?: (dateKey: string, blockId: string, updates: Partial<TimeBlock>) => void;
  onTimeBlockDelete?: (dateKey: string, blockId: string) => void;
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

const PRAYER_ICONS_MAP: Record<string, React.ReactNode> = {
  'sunrise': <Sunrise size={9} />,
  'sun': <Sun size={9} />,
  'cloud-sun': <CloudSun size={9} />,
  'sunset': <Sunset size={9} />,
  'moon': <Moon size={9} />,
};

const PRAYER_SHORT_NAMES: Record<string, string> = {
  'Fajr': 'FJR',
  'Sunrise': 'SNR',
  'Dhuhr': 'DHR',
  'Asr': 'ASR',
  'Maghrib': 'MGR',
  'Isha': 'ISH',
  'Midnight': 'MDN',
  'Last Third': 'LST',
};

const WEEKLY_DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

const HourSlot: React.FC<{
  hour: number;
  day: WeekDay;
  tasks: Task[];
  prayers: any[];
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
  showPrayers: boolean;
  isCompressed: boolean;
}> = ({ tasks, prayers, isDragOver, onDrop, onDragOver, onDragLeave, onUpdate, activeTaskId, isCurrentHour, onSelect, onContextMenu, onClickHour, getTaskTone, onUnschedule, onDelete, onSetStatus, showPrayers, isCompressed }) => {
  const HEIGHT = isCompressed ? 28 : 60;
  const VISIBLE_LIMIT = isCompressed ? 0 : 2;
  const showMore = tasks.length > VISIBLE_LIMIT;
  const visibleTasks = showMore ? tasks.slice(0, VISIBLE_LIMIT) : tasks;
  const hiddenCount = tasks.length - visibleTasks.length;

  return (
    <div
      onDrop={e => { e.preventDefault(); onDrop(); }}
      onDragOver={e => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onContextMenu={onContextMenu}
      onClick={onClickHour}
      className={`relative border-b border-zinc-900/50 px-1 py-1 transition-colors ${isDragOver ? 'bg-zinc-800/30' : 'hover:bg-zinc-900/40'} ${isCurrentHour ? 'bg-zinc-900/30' : ''}`}
      style={{ height: `${HEIGHT}px` }}
    >
      {/* Prayer Markers */}
      {showPrayers && prayers.map(prayer => {
        const prayerDate = new Date(prayer.timestamp);
        const minutes = prayerDate.getMinutes();
        const topPercent = (minutes / 60) * 100;

        return (
          <React.Fragment key={prayer.name}>
            <div
              className="absolute right-0 w-[3px] h-[3px] rounded-none bg-emerald-500/60 z-10 pointer-events-none"
              style={{ top: `${topPercent}%`, transform: 'translateY(-50%)' }}
            />
            <div
              className="absolute right-1 w-max pointer-events-auto z-30 flex flex-col items-end group/prayer hover:opacity-10 hover:blur-[1px] transition-all duration-300"
              style={{ top: `${topPercent}%`, transform: 'translateY(-50%)' }}
              title={`${prayer.name} ${formatTimeAMPM(prayerDate.getHours(), minutes)}`}
            >
              <div className="flex items-center gap-1 leading-none">
                <span className="text-emerald-500/50 grayscale-[30%]">
                  {PRAYER_ICONS_MAP[prayer.icon] || <Sun size={9} />}
                </span>
                <span className="text-[8px] font-bold text-zinc-600 opacity-80 group-hover/prayer:text-zinc-400 font-mono tracking-tight uppercase">
                  {PRAYER_SHORT_NAMES[prayer.name] || prayer.name.slice(0, 3).toUpperCase()}
                </span>
              </div>
              <span className="text-[7px] font-medium text-zinc-700/60 font-mono tracking-tighter pr-[1px]">
                {formatTimeAMPM(prayerDate.getHours(), minutes)}
              </span>
            </div>
          </React.Fragment>
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
              flex items-center px-1.5 rounded-[1px] cursor-pointer border-l-[2px]
              text-[11px] truncate transition-all hover:brightness-110
              ${activeTaskId === task.id ? 'ring-1 ring-emerald-500/30 bg-zinc-800' : ''}
              ${getTaskTone(task)}
              ${task.status === TaskStatus.DONE ? 'opacity-40 grayscale decoration-zinc-500 line-through' : ''}
            `}
            style={{ height: '22px', flexShrink: 0 }}
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
  activeHours: Set<number>;
  inboxTasks: Task[];
  timeZone: string;
  onTaskDragStart: (task: Task) => void;
  onInboxDrop: (day: WeekDay) => void;
  isInboxDragOver: boolean;
  onInboxDragOver: (dayKey: string | null) => void;
}> = ({ day, tasks, dragOverHour, onDrop, onDragOver, onUpdate, onDelete, onStartSession, activeTaskId, currentTime, onSelect, onContextMenu, onClickHour, showPrayers, getTaskTone, onUnschedule, onSetStatus, onOpenDayPanel, dayMeta, stickyNote, activeHours, inboxTasks, timeZone, onTaskDragStart, onInboxDrop, isInboxDragOver, onInboxDragOver }) => {
  const zoneHour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    hour12: false,
  }).format(currentTime));
  const isCurrentDay = day.isToday;
  const prayers = getPrayerTimesForDate(day.date);

  const hasMeta = (type: DayPanelType) => {
    if (type === 'notes') return !!stickyNote;
    if (type === 'habits') return false;
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
        <div className="flex justify-between px-0.5 opacity-60 hover:opacity-100 transition-opacity">
          <button title="Day Notes" onClick={(e) => onOpenDayPanel('notes', e)} className={`${hasMeta('notes') ? 'text-zinc-200 opacity-100' : 'text-zinc-700'} hover:text-zinc-300`}><FileText size={10} /></button>
          <button title="Rituals" onClick={(e) => onOpenDayPanel('habits', e)} className="text-zinc-700 hover:text-emerald-400"><CheckCircle2 size={10} /></button>
          <button title="Priorities" onClick={(e) => onOpenDayPanel('checklist', e)} className={`${hasMeta('checklist') ? 'text-blue-400 opacity-100' : 'text-zinc-700'} hover:text-blue-400`}><ListTodo size={10} /></button>
          <button title="Focus Intent" onClick={(e) => onOpenDayPanel('focus', e)} className={`${hasMeta('focus') ? 'text-purple-400 opacity-100' : 'text-zinc-700'} hover:text-purple-400`}><Target size={10} /></button>
          <button title="Day Tools" onClick={(e) => onOpenDayPanel('actions', e)} className="text-zinc-700 hover:text-zinc-400"><Settings size={10} /></button>
        </div>
      </div>
      <div
        className={`flex-shrink-0 border-b border-border p-1.5 space-y-1 min-h-[42px] transition-colors ${isInboxDragOver ? 'bg-emerald-950/20' : 'bg-black/20'}`}
        onDragOver={(e) => {
          e.preventDefault();
          onInboxDragOver(day.dateStr);
        }}
        onDragLeave={() => onInboxDragOver(null)}
        onDrop={(e) => {
          e.preventDefault();
          onInboxDragOver(null);
          onInboxDrop(day);
        }}
      >
        {[...inboxTasks].sort((a, b) => a.createdAt - b.createdAt).map(task => (
          <div
            key={task.id}
            draggable
            onDragStart={() => onTaskDragStart(task)}
            onClick={() => onSelect(task)}
            className={`group flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 transition-all cursor-pointer ${task.status === TaskStatus.DONE ? 'opacity-30' : ''}`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetStatus(task.id, task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE);
              }}
              className="shrink-0"
            >
              {task.status === TaskStatus.DONE ? (
                <div className="w-2.5 h-2.5 bg-emerald-500/80 rounded-[1px]" />
              ) : (
                <div className="w-2.5 h-2.5 rounded-[1px] border border-zinc-800 group-hover:border-zinc-700" />
              )}
            </button>
            <span className={`text-[10px] truncate flex-1 font-sans ${task.status === TaskStatus.DONE ? 'line-through text-zinc-600' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
              {task.title}
            </span>
          </div>
        ))}
        {inboxTasks.length === 0 && (
          <div className="text-[8px] text-zinc-800 py-1 text-center italic tracking-widest uppercase opacity-40">Inbox</div>
        )}
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
              onDelete={() => { }} // Not implemented in this view
              onStartSession={onStartSession}
              activeTaskId={activeTaskId}
              isCurrentHour={isCurrentDay && zoneHour === hour}
              onSelect={onSelect}
              onContextMenu={(e) => onContextMenu(hour, e)}
              onClickHour={(e) => onClickHour(hour, e)}
              getTaskTone={getTaskTone}
              onUnschedule={onUnschedule}
              onSetStatus={onSetStatus}
              showPrayers={showPrayers}
              isCompressed={!activeHours.has(hour)}
            />
          );
        })}
      </div>
    </div>
  );
};

// Helper function to format relative dates for dock badges
const formatRelativeDate = (timestamp: number): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
};

// Color accent map for dock section types
const dockAccentColors: Record<string, { border: string; bg: string; text: string; hover: string }> = {
  ROUTINE: { border: 'border-l-amber-500/60', bg: 'bg-amber-500/5', text: 'text-amber-400', hover: 'hover:bg-amber-500/10' },
  TEMPLATE: { border: 'border-l-blue-500/60', bg: 'bg-blue-500/5', text: 'text-blue-400', hover: 'hover:bg-blue-500/10' },
  PROJECT: { border: 'border-l-violet-500/60', bg: 'bg-violet-500/5', text: 'text-violet-400', hover: 'hover:bg-violet-500/10' },
  TODO: { border: 'border-l-zinc-400/40', bg: 'bg-zinc-500/5', text: 'text-zinc-300', hover: 'hover:bg-zinc-500/10' },
  LATER: { border: 'border-l-zinc-600/40', bg: 'bg-zinc-600/5', text: 'text-zinc-500', hover: 'hover:bg-zinc-600/10' },
  HABIT: { border: 'border-l-emerald-500/60', bg: 'bg-emerald-500/5', text: 'text-emerald-400', hover: 'hover:bg-emerald-500/10' },
};

// Dock tab config (used for section rendering order)
const dockSectionConfig: { type: DockSection; icon: React.ReactNode; label: string }[] = [
  { type: 'ROUTINE', icon: <Repeat size={12} />, label: 'Routines' },
  { type: 'TEMPLATE', icon: <FileText size={12} />, label: 'Templates' },
  { type: 'PROJECT', icon: <Package size={12} />, label: 'Projects' },
  { type: 'TODO', icon: <ListTodo size={12} />, label: 'To Do' },
  { type: 'LATER', icon: <Clock size={12} />, label: 'Later' },
  { type: 'HABIT', icon: <Target size={12} />, label: 'Habits' },
];

const DockItemCard: React.FC<{
  task: Task;
  type: DockSection;
  onDragStart: (task: Task) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onSelect: (task: Task) => void;
  currentDate?: string;
}> = ({ task, type, onDragStart, onUpdate, onDelete, onSelect, currentDate }) => {
  const accent = dockAccentColors[type] || dockAccentColors.TODO;

  // Habit item
  if (type === 'HABIT') {
    const isChecked = task.habitTracking?.[currentDate!] || false;
    return (
      <div
        className={`group relative border-l-2 ${accent.border} rounded-r-md px-3 py-2.5 cursor-pointer transition-all ${accent.hover} ${isChecked ? 'opacity-60' : ''}`}
        onClick={() => onSelect(task)}
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const newTracking = { ...(task.habitTracking || {}), [currentDate!]: !isChecked };
              onUpdate(task.id, { habitTracking: newTracking });
            }}
            className="flex-shrink-0"
          >
            {isChecked ? (
              <div className="w-4 h-4 bg-emerald-500/70 rounded flex items-center justify-center">
                <Check size={10} className="text-black" strokeWidth={3} />
              </div>
            ) : (
              <div className="w-4 h-4 rounded border border-zinc-700 hover:border-emerald-500/50 transition-colors" />
            )}
          </button>
          <span className={`text-[11px] leading-tight transition-colors ${isChecked ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
            {task.title}
          </span>
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onSelect(task); }} className="p-1 text-zinc-600 hover:text-zinc-300 rounded hover:bg-zinc-800/50"><Pencil size={10} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="p-1 text-zinc-600 hover:text-red-400 rounded hover:bg-zinc-800/50"><Trash2 size={10} /></button>
        </div>
      </div>
    );
  }

  // Template item
  if (type === 'TEMPLATE') {
    return (
      <div
        className={`group relative border-l-2 ${accent.border} rounded-r-md px-3 py-2.5 cursor-pointer transition-all ${accent.hover}`}
        onClick={() => onSelect(task)}
      >
        <div className="text-[11px] text-zinc-300 leading-tight">{task.title}</div>
        <div className="text-[9px] text-zinc-600 mt-0.5 font-mono">
          {task.templateSteps ? `${task.templateSteps.length} steps` : 'Template'}
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onSelect(task); }} className="p-1 text-zinc-600 hover:text-blue-400 rounded hover:bg-zinc-800/50"><Pencil size={10} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="p-1 text-zinc-600 hover:text-red-400 rounded hover:bg-zinc-800/50"><Trash2 size={10} /></button>
        </div>
      </div>
    );
  }

  // Default: draggable item (TODO, ROUTINE, PROJECT, LATER)
  return (
    <div
      draggable
      onDragStart={() => onDragStart(task)}
      onClick={() => onSelect(task)}
      className={`group relative border-l-2 ${accent.border} rounded-r-md px-3 py-2.5 cursor-move transition-all ${accent.hover} active:scale-[0.98]`}
    >
      <div className="flex items-center gap-2">
        <GripVertical size={10} className="text-zinc-800 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex-1 min-w-0">
          <div className={`text-[11px] leading-tight truncate ${task.urgent ? 'text-zinc-100 font-medium' : 'text-zinc-300'}`}>
            {task.urgent && <span className="text-red-400 mr-1 font-bold">!</span>}
            {task.title}
          </div>
          <div className="text-[9px] text-zinc-600 mt-0.5 font-mono">
            {formatRelativeDate(task.createdAt)}
            {type === 'PROJECT' && ' · Project'}
          </div>
        </div>
      </div>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            const today = new Date();
            today.setHours(12, 0, 0, 0);
            onUpdate(task.id, { scheduledTime: today.getTime() });
          }}
          className="p-1 text-emerald-600 hover:text-emerald-400 rounded hover:bg-zinc-800/50"
          title="Schedule today"
        >
          <ArrowRight size={10} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onSelect(task); }} className="p-1 text-zinc-600 hover:text-zinc-300 rounded hover:bg-zinc-800/50"><Pencil size={10} /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="p-1 text-zinc-600 hover:text-red-400 rounded hover:bg-zinc-800/50"><Trash2 size={10} /></button>
      </div>
    </div>
  );
};

const WeeklyPlannerView: React.FC<Props> = ({ state, onAdd, onUpdate, onStartSession, activeTaskId, onDelete, onStickyNoteUpdate, onDayMetaUpdate, onPrayerToggle, onAdhkarToggle, onProtocolToggle, onWeeklyActivityToggle, onProtocolContextsUpdate, onWeeklyActivitiesUpdate, onLayoutChange, onTimeBlockAdd, onTimeBlockUpdate, onTimeBlockDelete }) => {
  const [showMobileDock, setShowMobileDock] = useState(false); // Mobile dock drawer
  const [plannerView, setPlannerView] = useState<'day' | 'week' | 'month'>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [backlogCollapsed, setBacklogCollapsed] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'inline' | 'stacked'>('stacked');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [inspectorTask, setInspectorTask] = useState<Task | null>(null);
  const [hourOverlay, setHourOverlay] = useState<{ day: WeekDay; hour: number; anchor: HTMLElement } | null>(null);
  const [dayPanel, setDayPanel] = useState<{ day: WeekDay; type: DayPanelType; x: number; y: number } | null>(null);
  const [checklistDraft, setChecklistDraft] = useState('');
  const [expandingTemplate, setExpandingTemplate] = useState<Task | null>(null);
  const [showPrayers, setShowPrayers] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);
  const [dockSearch, setDockSearch] = useState('');
  const [urgentCollapsed, setUrgentCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [addingToSection, setAddingToSection] = useState<DockSection | null>(null);
  const [dockNewTitle, setDockNewTitle] = useState('');
  const [showWeeklyEditor, setShowWeeklyEditor] = useState(false);
  const [uiZoom, setUiZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const plannerTimeZone = state.userPreferences?.timeZone || DEFAULT_TIME_ZONE;

  // Auto-switch to Day view on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setPlannerView('day');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key.toLowerCase() === 'w') {
        setPlannerView('week');
      } else if (e.key.toLowerCase() === 'd') {
        setPlannerView('day');
      } else if (e.key.toLowerCase() === 'm') {
        setPlannerView('month');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSection = (type: string) => {
    setCollapsedSections(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const expandAll = () => {
    setCollapsedSections({});
    setUrgentCollapsed(false);
  };

  const collapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    // Use fixed keys to avoid closure ordering issues
    ['ROUTINE', 'TEMPLATE', 'PROJECT', 'TODO', 'LATER', 'HABIT'].forEach(k => allCollapsed[k] = true);
    setCollapsedSections(allCollapsed);
    setUrgentCollapsed(true);
  };

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to current time on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      handleJumpToNow();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const getWeekDays = (): WeekDay[] => {
    const todayKey = getDateKeyInTimeZone(new Date(), plannerTimeZone);
    const today = dateFromDateKey(todayKey);
    const currentDay = today.getUTCDay();
    const saturdayOffset = currentDay === 6 ? 0 : -(currentDay + 1);
    const weekStart = new Date(today);
    weekStart.setUTCDate(today.getUTCDate() + saturdayOffset + (weekOffset * 7));

    const days: WeekDay[] = [];
    const dayNames = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setUTCDate(weekStart.getUTCDate() + i);
      const dateStr = dateKeyFromUtcDate(date);
      const isToday = dateStr === todayKey;

      days.push({
        date,
        dateStr,
        dayName: dayNames[i],
        dayNum: date.getUTCDate(),
        isToday
      });
    }
    return days;
  };

  const weekDays = getWeekDays();
  const todayDateKey = getDateKeyInTimeZone(new Date(), plannerTimeZone);

  const monthViewData = useMemo(() => {
    const anchorKey = getDateKeyInTimeZone(currentTime, plannerTimeZone);
    const anchorDate = dateFromDateKey(anchorKey);
    const firstOfMonth = new Date(Date.UTC(
      anchorDate.getUTCFullYear(),
      anchorDate.getUTCMonth() + monthOffset,
      1,
      12
    ));
    const monthStartDay = firstOfMonth.getUTCDay();
    const saturdayFirstOffset = monthStartDay === 6 ? 0 : monthStartDay + 1;
    const gridStart = new Date(firstOfMonth);
    gridStart.setUTCDate(firstOfMonth.getUTCDate() - saturdayFirstOffset);

    const cells = Array.from({ length: 42 }, (_, index) => {
      const cellDate = new Date(gridStart);
      cellDate.setUTCDate(gridStart.getUTCDate() + index);
      const dateStr = dateKeyFromUtcDate(cellDate);
      const dayTasks = state.tasks.filter(task => {
        if (!task.scheduledTime) return false;
        return getDateKeyInTimeZone(new Date(task.scheduledTime), plannerTimeZone) === dateStr;
      });
      const completedCount = dayTasks.filter(task => task.status === TaskStatus.DONE).length;
      const protocolState = state.dailyProtocolState?.[dateStr] || {};
      const protocolDoneCount = Object.values(protocolState).filter(Boolean).length;
      const weekday = WEEKLY_DAY_KEYS[cellDate.getUTCDay()];
      const weeklyCount = state.weeklyActivities?.[weekday]?.length || 0;

      return {
        date: cellDate,
        dateStr,
        isToday: dateStr === todayDateKey,
        inCurrentMonth: cellDate.getUTCMonth() === firstOfMonth.getUTCMonth(),
        scheduledCount: dayTasks.filter(task => task.status !== TaskStatus.DONE).length,
        completedCount,
        focus: state.dayMeta?.[dateStr]?.focus || '',
        protocolDoneCount,
        weeklyCount,
      };
    });

    return {
      monthLabel: firstOfMonth.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      cells,
    };
  }, [currentTime, monthOffset, plannerTimeZone, state.tasks, state.dayMeta, state.dailyProtocolState, state.weeklyActivities, todayDateKey]);

  // Smart Density Logic: Identify hours visible across the week
  // If an hour (0-23) has NO tasks in ANY day of the current week, it is candidate for compression.
  const activeHours = useMemo(() => {
    const active = new Set<number>();
    const weekDateKeys = new Set(weekDays.map(day => day.dateStr));

    // Always keep 8am - 6pm active for "Work Day" structure? 
    // User asked "save space when its possible", "unused cells... are shorter".
    // "whole week if it have no tasks its short".
    // So if 8am-6pm is empty, let it collapse? Maybe keep core hours for structure.
    // Let's rely purely on data first.

    state.tasks.forEach(t => {
      if (!t.scheduledTime || t.status === TaskStatus.DONE) return; // Ignore done? Or keep spaced?
      // If showing completed, we should count them.
      // Let's count ALL tasks in this week.
      const d = new Date(t.scheduledTime);
      const taskDateKey = getDateKeyInTimeZone(d, plannerTimeZone);
      if (weekDateKeys.has(taskDateKey)) {
        active.add(d.getHours());
      }
    });

    // Also keep hours with Prayers active to avoid crushing them
    weekDays.forEach(day => {
      const prayers = getPrayerTimesForDate(day.date);
      prayers.forEach(p => {
        active.add(new Date(p.timestamp).getHours());
      });
    });

    // Optional: Always keep "Current Hour" active
    // active.add(new Date().getHours()); // Handled by dynamic check or just let it fly

    // Optional: Keep a core range? 
    // Let's try pure data-driven first.

    return active;
  }, [state.tasks, weekDays, plannerTimeZone]);

  const unscheduledTasks = state.tasks.filter(t => !t.scheduledTime && t.status !== TaskStatus.DONE);

  const filteredDockTasks = unscheduledTasks.filter(t => {
    if (!dockSearch.trim()) return true;
    return t.title.toLowerCase().includes(dockSearch.toLowerCase());
  });

  const dockTasks = {
    ROUTINE: filteredDockTasks.filter(t => t.dockSection === 'ROUTINE'),
    TEMPLATE: filteredDockTasks.filter(t => t.dockSection === 'TEMPLATE'),
    PROJECT: filteredDockTasks.filter(t => t.dockSection === 'PROJECT'),
    TODO: filteredDockTasks.filter(t => t.dockSection === 'TODO' || !t.dockSection),
    LATER: filteredDockTasks.filter(t => t.dockSection === 'LATER'),
    HABIT: filteredDockTasks.filter(t => t.dockSection === 'HABIT'),
  };

  // Get urgent tasks from ALL sections
  const urgentTasks = state.tasks.filter(t => t.urgent && t.status !== TaskStatus.DONE);
  const todayKey = getDateKeyInTimeZone(new Date(), plannerTimeZone);
  const todayScheduledCount = state.tasks.filter(t =>
    !!t.scheduledTime && getDateKeyInTimeZone(new Date(t.scheduledTime), plannerTimeZone) === todayKey
  ).length;
  const bandwidthPercent = Math.min(100, Math.round((todayScheduledCount / 12) * 100));



  const handleOpenHourOverlay = (day: WeekDay, hour: number, anchor: HTMLElement) => {
    setHourOverlay({ day, hour, anchor });
  };

  const handleOpenDayPanel = (day: WeekDay, type: DayPanelType, e: React.MouseEvent) => {
    setDayPanel({ day, type, x: e.clientX, y: e.clientY });
  };

  const handleJumpToNow = () => {
    if (!scrollRef.current) return;
    const hour = new Date().getHours();

    // Calculate position based on dynamic heights
    // This is simple approx for now or we calc real offset?
    // We must calc real offset if densities differ.
    let top = 64; // header
    for (let i = 0; i < hour; i++) {
      top += activeHours.has(i) ? 60 : 28;
    }

    scrollRef.current.scrollTo({ top: top - 24, behavior: 'smooth' });
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

  const handleInboxDrop = (day: WeekDay) => {
    if (!draggedTask) return;
    const inboxTimestamp = getLocalTimestampForDateKey(day.dateStr, 12, 0);
    const section = draggedTask.dockSection;

    if (section === 'ROUTINE') {
      onAdd(draggedTask.title, draggedTask.category, draggedTask.impact, {
        scheduledTime: inboxTimestamp,
        duration: draggedTask.duration,
        urgent: draggedTask.urgent,
      });
    } else if (section === 'PROJECT') {
      onAdd(`${draggedTask.title} — session`, draggedTask.category, draggedTask.impact, {
        scheduledTime: inboxTimestamp,
        duration: draggedTask.duration || 60,
        parentProject: draggedTask.id,
        urgent: draggedTask.urgent,
      });
    } else {
      onUpdate(draggedTask.id, { scheduledTime: inboxTimestamp });
    }

    setDraggedTask(null);
    setDragOverHour(null);
    setDragOverDay(null);
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
    setDragOverDay(null);
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

  // Handle adding to a specific section
  const handleDockSectionAdd = (section: DockSection) => {
    if (dockNewTitle.trim()) {
      onAdd(dockNewTitle.trim(), Category.SERVICE, 'MED', { dockSection: section });
      setDockNewTitle('');
      setAddingToSection(null);
    }
  };

  // Filter tasks by search
  const filterDockTasks = (tasks: Task[]) => {
    if (!dockSearch) return tasks;
    return tasks.filter(t => t.title.toLowerCase().includes(dockSearch.toLowerCase()));
  };

  // Render a single dock section with items
  const renderDockSection = (config: typeof dockSectionConfig[number], tasks: Task[], currentDateKey: string) => {
    const accent = dockAccentColors[config.type];
    const collapsed = collapsedSections[config.type];
    const filtered = filterDockTasks(tasks);
    const isAdding = addingToSection === config.type;

    return (
      <div key={config.type}>
        {/* Section Header */}
        <div
          className="group/sec flex items-center gap-2 px-1 py-1.5 cursor-pointer select-none"
          onClick={() => toggleSection(config.type)}
        >
          <span className={`${accent.text} opacity-60 group-hover/sec:opacity-100 transition-opacity`}>
            {config.icon}
          </span>
          <span className="text-[11px] font-semibold text-zinc-400 group-hover/sec:text-zinc-200 transition-colors flex-1">
            {config.label}
          </span>
          {filtered.length > 0 && (
            <span className="text-[9px] font-mono text-zinc-600 min-w-[14px] text-right">{filtered.length}</span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setAddingToSection(config.type); setDockNewTitle(''); }}
            className="p-0.5 text-zinc-700 hover:text-zinc-400 opacity-0 group-hover/sec:opacity-100 transition-all"
          >
            <Plus size={11} />
          </button>
          <ChevronRight size={10} className={`text-zinc-700 transition-transform duration-150 ${collapsed ? '' : 'rotate-90'}`} />
        </div>

        {/* Section Content */}
        {!collapsed && (
          <div className="space-y-0.5 pb-1">
            {/* Inline add */}
            {isAdding && (
              <div className={`border-l-2 ${accent.border} rounded-r-md bg-zinc-900/40 px-3 py-2 ml-1`}>
                <input
                  value={dockNewTitle}
                  onChange={e => setDockNewTitle(e.target.value)}
                  onBlur={() => { if (!dockNewTitle.trim()) { setAddingToSection(null); setDockNewTitle(''); } }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleDockSectionAdd(config.type);
                    if (e.key === 'Escape') { setAddingToSection(null); setDockNewTitle(''); }
                  }}
                  placeholder={`Add ${config.label.toLowerCase().replace(/s$/, '')}...`}
                  className="w-full bg-transparent text-[11px] text-zinc-200 focus:outline-none placeholder:text-zinc-600"
                  autoFocus
                />
              </div>
            )}
            {filtered.map(task => (
              <DockItemCard
                key={task.id}
                task={task}
                type={config.type}
                onDragStart={handleDragStart}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onSelect={(t) => setInspectorTask(t)}
                currentDate={currentDateKey}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render dock content (reused in desktop & mobile)
  const renderDockContent = () => {
    const currentDateKey = getDateKeyInTimeZone(currentTime, plannerTimeZone);
    const totalDockItems = Object.values(dockTasks).reduce((sum, arr) => sum + arr.length, 0);

    return (
      <>
        {/* Quick Add - always visible at top */}
        <div className="px-3 py-2.5 border-b border-zinc-800/40 flex-shrink-0">
          <div className="relative">
            <Plus size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              placeholder="Quick add to inbox..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = e.currentTarget.value.trim();
                  if (val) {
                    onAdd(val, Category.SERVICE, 'MED', { dockSection: 'TODO' });
                    e.currentTarget.value = '';
                  }
                }
              }}
              className="w-full bg-zinc-900/30 border border-zinc-800/40 rounded-md pl-8 pr-3 py-1.5 text-[11px] text-zinc-300 focus:outline-none focus:border-zinc-700 focus:bg-zinc-900/50 placeholder:text-zinc-700 transition-all"
            />
          </div>
          {/* Search - only if there are items */}
          {(totalDockItems > 3 || dockSearch) && (
            <div className="relative mt-1.5">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-700" />
              <input
                value={dockSearch}
                onChange={e => setDockSearch(e.target.value)}
                placeholder="Filter..."
                className="w-full bg-transparent border border-zinc-800/30 rounded-md pl-8 pr-3 py-1 text-[10px] text-zinc-400 focus:outline-none focus:border-zinc-700 placeholder:text-zinc-800 transition-all"
              />
            </div>
          )}
        </div>

        {/* Urgent Banner */}
        {urgentTasks.length > 0 && (
          <div className="mx-3 mt-2 mb-1 px-2.5 py-2 rounded-md bg-red-950/20 border border-red-900/20 flex-shrink-0">
            <button
              onClick={() => setUrgentCollapsed(!urgentCollapsed)}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[11px] font-semibold text-red-400">{urgentTasks.length} urgent</span>
              </div>
              <ChevronRight size={10} className={`text-red-400/50 transition-transform duration-150 ${urgentCollapsed ? '' : 'rotate-90'}`} />
            </button>
            {!urgentCollapsed && (
              <div className="mt-1.5 space-y-1">
                {urgentTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded bg-red-950/30 cursor-pointer hover:bg-red-950/40 transition-colors"
                    onClick={() => setInspectorTask(task)}
                  >
                    <span className="text-red-400 font-bold text-[10px]">!</span>
                    <span className="text-[11px] text-zinc-300 truncate flex-1">{task.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const today = new Date();
                        today.setHours(12, 0, 0, 0);
                        onUpdate(task.id, { scheduledTime: today.getTime() });
                      }}
                      className="text-red-500/50 hover:text-emerald-400 transition-colors"
                      title="Schedule today"
                    >
                      <ArrowRight size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Sections - scrollable */}
        <div className="flex-1 overflow-y-auto px-2 pt-2 pb-3 space-y-1">
          {dockSectionConfig.map(config => {
            const tasks = dockTasks[config.type] || [];
            return renderDockSection(config, tasks, currentDateKey);
          })}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-zinc-800/30 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-600">{totalDockItems} items</span>
            <div className="flex items-center gap-1.5">
              <div className="w-14 h-1 bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-600 rounded-full transition-all duration-700"
                  style={{ width: `${bandwidthPercent}%` }}
                />
              </div>
              <span className="text-[9px] font-mono text-zinc-600">{bandwidthPercent}%</span>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex h-full bg-background relative" style={{ zoom: uiZoom }}>
      {/* UI Zoom Controls - Hidden on mobile */}
      <div className="hidden md:flex absolute bottom-4 right-8 z-50 items-center gap-1 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 p-1 rounded-lg shadow-lg">
        <button onClick={() => setUiZoom(z => Math.max(0.7, z - 0.1))} className="p-1 hover:text-white text-zinc-500"><Minus size={12} /></button>
        <span className="text-[10px] w-8 text-center text-zinc-400 font-mono tracking-tighter">{Math.round(uiZoom * 100)}%</span>
        <button onClick={() => setUiZoom(z => Math.min(1.5, z + 0.1))} className="p-1 hover:text-white text-zinc-500"><Plus size={12} /></button>
      </div>

      {/* Mobile Dock Toggle Button - Floating */}
      <button
        onClick={() => setShowMobileDock(true)}
        className="lg:hidden fixed bottom-20 right-4 z-40 p-3 bg-emerald-500 text-black rounded-full shadow-lg hover:bg-emerald-400 transition-colors"
        title="Open Dock"
      >
        <Layers size={20} />
      </button>

      {/* Mobile Dock Overlay */}
      {showMobileDock && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowMobileDock(false)} />
          <div className="lg:hidden fixed inset-y-0 left-0 w-[85%] max-w-[320px] bg-zinc-950/95 backdrop-blur-md border-r border-zinc-800/50 z-50 overflow-hidden shadow-2xl">
            {/* Mobile Dock Header */}
            <div className="h-11 border-b border-zinc-800/50 flex items-center justify-between px-4 flex-shrink-0">
              <span className="text-[11px] font-semibold text-zinc-300 tracking-wide">Dock</span>
              <button onClick={() => setShowMobileDock(false)} className="p-1 text-zinc-500 hover:text-zinc-200 rounded hover:bg-zinc-800/50 transition-all">
                <X size={18} />
              </button>
            </div>

            {/* Mobile Dock Content */}
            <div className="h-[calc(100%-2.75rem)] flex flex-col overflow-hidden">
              {renderDockContent()}
            </div>
          </div>
        </>
      )}

      {/* Desktop Dock - Hidden on mobile/tablet */}
      <div className={`hidden lg:flex border-r border-zinc-800/50 bg-zinc-950/50 transition-all ${dockCollapsed ? 'w-12' : 'w-[272px]'} flex-shrink-0 z-10`}>
        {dockCollapsed ? (
          <button onClick={() => setDockCollapsed(false)} className="w-full h-12 flex items-center justify-center text-zinc-600 hover:text-zinc-400 transition-colors">
            <ChevronRight size={16} />
          </button>
        ) : (
          <div className="h-full flex flex-col w-full">
            <div className="h-11 border-b border-zinc-800/50 flex items-center justify-between px-3 flex-shrink-0">
              <span className="text-[11px] font-semibold text-zinc-400 tracking-wide">Dock</span>
              <button onClick={() => setDockCollapsed(true)} className="p-1 text-zinc-600 hover:text-zinc-400 rounded hover:bg-zinc-800/50 transition-all">
                <ChevronLeft size={14} />
              </button>
            </div>
            {renderDockContent()}
          </div>
        )}
      </div>

      {/* Planner */}
      <div className="flex-1 flex flex-col relative">
        <div className="h-12 border-b border-border flex items-center justify-between px-2 md:px-4 z-10 bg-background">
          {/* Left: Day/Week context indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (plannerView === 'day') {
                    const prev = new Date(currentTime);
                    prev.setDate(prev.getDate() - 1);
                    setCurrentTime(prev);
                  } else if (plannerView === 'month') {
                    setMonthOffset(monthOffset - 1);
                  } else {
                    setWeekOffset(weekOffset - 1);
                  }
                }}
                className="p-1 text-zinc-500 hover:text-zinc-300"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="text-xs md:text-[11px] font-bold text-zinc-400 min-w-[120px] text-center uppercase tracking-widest">
                {plannerView === 'day' ? (
                  currentTime.toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric', timeZone: plannerTimeZone })
                ) : plannerView === 'month' ? (
                  monthViewData.monthLabel
                ) : (
                  `${weekDays[0].dayNum} ${weekDays[0].date.toLocaleString('default', { month: 'short', timeZone: plannerTimeZone })} - ${weekDays[6].dayNum} ${weekDays[6].date.toLocaleString('default', { month: 'short', timeZone: plannerTimeZone })}`
                )}
              </div>
              <button
                onClick={() => {
                  if (plannerView === 'day') {
                    const next = new Date(currentTime);
                    next.setDate(next.getDate() + 1);
                    setCurrentTime(next);
                  } else if (plannerView === 'month') {
                    setMonthOffset(monthOffset + 1);
                  } else {
                    setWeekOffset(weekOffset + 1);
                  }
                }}
                className="p-1 text-zinc-500 hover:text-zinc-300"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <button
              onClick={() => {
                const now = new Date();
                setCurrentTime(now);
                setWeekOffset(0);
                setMonthOffset(0);
                setTimeout(handleJumpToNow, 100);
              }}
              className="text-[9px] font-bold text-emerald-500/60 hover:text-emerald-400 transition-colors uppercase tracking-tighter"
            >
              TODAY
            </button>
          </div>

          {/* Center: View Switcher - Floating style */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-zinc-900/50 border border-zinc-800/50 rounded-full p-0.5">
            <button
              onClick={() => setPlannerView('day')}
              className={`px-4 py-1 rounded-full transition-all text-[10px] uppercase font-bold tracking-widest ${plannerView === 'day'
                ? 'bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                : 'text-zinc-600 hover:text-zinc-400'
                }`}
            >
              Day
            </button>
            <button
              onClick={() => setPlannerView('week')}
              className={`px-4 py-1 rounded-full transition-all text-[10px] uppercase font-bold tracking-widest ${plannerView === 'week'
                ? 'bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                : 'text-zinc-600 hover:text-zinc-400'
                }`}
            >
              Week
            </button>
            <button
              onClick={() => setPlannerView('month')}
              className={`px-4 py-1 rounded-full transition-all text-[10px] uppercase font-bold tracking-widest ${plannerView === 'month'
                ? 'bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                : 'text-zinc-600 hover:text-zinc-400'
                }`}
            >
              Month
            </button>
          </div>

          {/* Right: Actions/Settings */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowWeeklyEditor(true)}
              className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors"
              title="Settings"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[#020202]" ref={scrollRef}>
          {plannerView === 'week' ? (
            <div className="min-w-[600px] md:min-w-[720px] flex">
              {/* Time Rail */}
              <div className="w-10 md:w-14 border-r border-border bg-surface flex-shrink-0 sticky left-0 z-10">
                <div className="h-16 border-b border-border flex items-end justify-center pb-2 bg-background z-20">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => setShowPrayers(!showPrayers)}
                      className={`p-1 rounded transition-colors ${showPrayers ? 'text-emerald-500 bg-emerald-950/20' : 'text-zinc-600 hover:text-zinc-400'}`}
                      title="Toggle Prayers"
                    >
                      <Moon size={12} />
                    </button>
                  </div>
                </div>
                {/* Time Labels (Smart Density) */}
                <div className="flex-1 flex flex-col">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const isCompressed = !activeHours.has(i);
                    const height = isCompressed ? 28 : 60;
                    return (
                      <div
                        key={i}
                        style={{ height: `${height}px` }}
                        className={`border-b border-zinc-900/50 flex items-center justify-center pt-0 transition-all ${isCompressed ? 'opacity-30 bg-zinc-950/20' : ''}`}
                      >
                        <span className="text-[10px] text-zinc-500 font-mono tracking-tighter">
                          {formatTimeAMPM(i, 0).replace(' ', '')}
                        </span>
                      </div>
                    );
                  })}
                </div>
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
                        const taskDateKey = getDateKeyInTimeZone(new Date(t.scheduledTime), plannerTimeZone);
                        return taskDateKey === day.dateStr;
                      })}
                      inboxTasks={state.tasks.filter(t => {
                        if (!t.scheduledTime) return false;
                        const d = new Date(t.scheduledTime);
                        const taskDateKey = getDateKeyInTimeZone(d, plannerTimeZone);
                        if (taskDateKey !== day.dateStr) return false;
                        return d.getHours() === 12 && d.getMinutes() === 0;
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
                      activeHours={activeHours}
                      timeZone={plannerTimeZone}
                      onTaskDragStart={handleDragStart}
                      onInboxDrop={handleInboxDrop}
                      isInboxDragOver={dragOverDay === day.dateStr}
                      onInboxDragOver={setDragOverDay}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : plannerView === 'day' ? (
            <div className="h-full min-w-0 overflow-hidden">
              <DayView
                state={state}
                onTaskUpdate={onUpdate}
                onTaskAdd={onAdd}
                onTaskDelete={onDelete}
                onStartSession={onStartSession}
                onStickyNoteUpdate={onStickyNoteUpdate}
                onPrayerToggle={onPrayerToggle || (() => { })}
                onAdhkarToggle={onAdhkarToggle || (() => { })}
                onDayMetaUpdate={onDayMetaUpdate}
                activeTaskId={activeTaskId}
                onTaskSelect={(task) => setInspectorTask(task)}
                onProtocolToggle={onProtocolToggle}
                onWeeklyActivityToggle={onWeeklyActivityToggle}
                onProtocolContextsUpdate={onProtocolContextsUpdate}
                onWeeklyActivitiesUpdate={onWeeklyActivitiesUpdate}
                onLayoutChange={onLayoutChange}
                onTimeBlockAdd={onTimeBlockAdd}
                onTimeBlockUpdate={onTimeBlockUpdate}
                onTimeBlockDelete={onTimeBlockDelete}
              />
            </div>
          ) : (
            <div className="p-3 md:p-4">
              <div className="grid grid-cols-7 gap-2">
                {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(dayName => (
                  <div key={dayName} className="text-center text-[10px] uppercase tracking-widest text-zinc-600 font-bold py-1">
                    {dayName}
                  </div>
                ))}
                {monthViewData.cells.map(cell => (
                  <button
                    key={cell.dateStr}
                    onClick={() => {
                      setCurrentTime(dateFromDateKey(cell.dateStr));
                      setPlannerView('day');
                    }}
                    className={`min-h-[90px] md:min-h-[108px] rounded-md border p-2 text-left transition-colors ${
                      cell.inCurrentMonth
                        ? 'bg-zinc-900/35 border-zinc-800 hover:border-zinc-700'
                        : 'bg-zinc-950/20 border-zinc-900 text-zinc-700'
                    } ${cell.isToday ? 'ring-1 ring-emerald-500/40 border-emerald-600/40' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[11px] font-bold ${cell.isToday ? 'text-emerald-400' : 'text-zinc-400'}`}>
                        {cell.date.getUTCDate()}
                      </span>
                      {cell.scheduledCount > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {cell.scheduledCount}
                        </span>
                      )}
                    </div>
                    {cell.focus && (
                      <div className="text-[9px] text-zinc-300 truncate mb-1">{cell.focus}</div>
                    )}
                    <div className="space-y-1 text-[8px] text-zinc-600">
                      <div className="flex items-center justify-between">
                        <span>Done</span>
                        <span>{cell.completedCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Protocol</span>
                        <span>{cell.protocolDoneCount}</span>
                      </div>
                      {cell.weeklyCount > 0 && (
                        <div className="flex items-center justify-between">
                          <span>Weekly</span>
                          <span>{cell.weeklyCount}</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions Bar (Floating) */}


          {hourOverlay && (
            <HourOverlay
              date={hourOverlay.day.date}
              hour={hourOverlay.hour}
              tasks={state.tasks.filter(t => {
                if (!t.scheduledTime) return false;
                const d = new Date(t.scheduledTime);
                return d.getFullYear() === hourOverlay.day.date.getFullYear()
                  && d.getMonth() === hourOverlay.day.date.getMonth()
                  && d.getDate() === hourOverlay.day.date.getDate()
                  && d.getHours() === hourOverlay.hour;
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
                timeZone={plannerTimeZone}
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

          {/* Weekly Activities Editor Modal */}
          {showWeeklyEditor && onWeeklyActivitiesUpdate && (
            <WeeklyActivitiesEditor
              weeklyActivities={state.weeklyActivities || {}}
              onUpdate={onWeeklyActivitiesUpdate}
              onClose={() => setShowWeeklyEditor(false)}
            />
          )}

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
