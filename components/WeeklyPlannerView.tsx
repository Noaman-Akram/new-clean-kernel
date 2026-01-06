import React, { useState, useEffect } from 'react';
import { AppState, Task, Category, TaskStatus, DockSection } from '../types';
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
  StickyNote as StickyNoteIcon,
  Repeat,
  FileText,
  Mountain,
  ListTodo,
  Archive,
  CheckCircle2,
  Edit2,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { getPrayerTimesForDate, formatTimeAMPM } from '../utils/prayerTimes';

interface Props {
  state: AppState;
  onAdd: (title: string, category: Category, impact: 'LOW' | 'MED' | 'HIGH', options?: any) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onStartSession: (id: string) => void;
  activeTaskId: string | null;
  onDelete: (id: string) => void;
  onStickyNoteUpdate: (dateKey: string, content: string) => void;
}

interface WeekDay {
  date: Date;
  dateStr: string;
  dayName: string;
  dayNum: number;
  isToday: boolean;
}

const getPrayerIcon = (iconName: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    sunrise: <Sunrise size={10} />,
    sun: <Sun size={10} />,
    'cloud-sun': <CloudSun size={10} />,
    sunset: <Sunset size={10} />,
    moon: <Moon size={10} />,
  };
  return iconMap[iconName] || <Sun size={10} />;
};

const WeeklyPlannerView: React.FC<Props> = ({ state, onAdd, onUpdate, onStartSession, activeTaskId, onDelete, onStickyNoteUpdate }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [expandedHours, setExpandedHours] = useState<Set<string>>(new Set());
  const [expandingTemplate, setExpandingTemplate] = useState<Task | null>(null);

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
      onAdd(`${draggedTask.title} — Session`, draggedTask.category, draggedTask.impact, {
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

  const toggleHour = (dayStr: string, hour: number) => {
    const key = `${dayStr}-${hour}`;
    const newSet = new Set(expandedHours);
    newSet.has(key) ? newSet.delete(key) : newSet.add(key);
    setExpandedHours(newSet);
  };

  return (
    <div className="flex h-full bg-background">
      {/* Dock */}
      <div className={`border-r border-border bg-surface transition-all ${dockCollapsed ? 'w-12' : 'w-64'} flex-shrink-0`}>
        {dockCollapsed ? (
          <button onClick={() => setDockCollapsed(false)} className="w-full h-12 flex items-center justify-center text-zinc-500 hover:text-zinc-300">
            <ChevronRight size={16} />
          </button>
        ) : (
          <div className="h-full flex flex-col">
            <div className="h-12 border-b border-border flex items-center justify-between px-3">
              <span className="text-xs font-medium text-zinc-300">Dock</span>
              <button onClick={() => setDockCollapsed(true)} className="text-zinc-500 hover:text-zinc-300">
                <ChevronLeft size={16} />
              </button>
            </div>

            <TypeButtons onAdd={onAdd} />

            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              <DockSection
                title="Routines"
                icon={<Repeat size={10} />}
                type="ROUTINE"
                tasks={dockTasks.ROUTINE}
                onDragStart={handleDragStart}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onAdd={onAdd}
                onSelect={setSelectedTask}
              />

              <DockSection
                title="Templates"
                icon={<FileText size={10} />}
                type="TEMPLATE"
                tasks={dockTasks.TEMPLATE}
                onDragStart={handleDragStart}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onAdd={onAdd}
                onSelect={setSelectedTask}
                onExpand={setExpandingTemplate}
              />

              <DockSection
                title="Projects"
                icon={<Mountain size={10} />}
                type="PROJECT"
                tasks={dockTasks.PROJECT}
                onDragStart={handleDragStart}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onAdd={onAdd}
                onSelect={setSelectedTask}
              />

              <DockSection
                title="To Do"
                icon={<ListTodo size={10} />}
                type="TODO"
                tasks={dockTasks.TODO}
                onDragStart={handleDragStart}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onAdd={onAdd}
                onSelect={setSelectedTask}
              />

              <DockSection
                title="Later"
                icon={<Archive size={10} />}
                type="LATER"
                tasks={dockTasks.LATER}
                onDragStart={handleDragStart}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onAdd={onAdd}
                onSelect={setSelectedTask}
              />

              <DockSection
                title="Habits"
                icon={<CheckCircle2 size={10} />}
                type="HABIT"
                tasks={dockTasks.HABIT}
                onDragStart={handleDragStart}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onAdd={onAdd}
                onSelect={setSelectedTask}
                currentDate={currentTime.toISOString().split('T')[0]}
              />
            </div>
          </div>
        )}
      </div>

      {/* Planner */}
      <div className="flex-1 flex flex-col">
        <div className="h-12 border-b border-border flex items-center justify-between px-4">
          <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-2 text-zinc-500 hover:text-zinc-300">
            <ChevronLeft size={18} />
          </button>
          <div className="text-sm font-medium text-zinc-300">
            {weekDays[0].dayNum} {weekDays[0].date.toLocaleString('default', { month: 'short' })} - {weekDays[6].dayNum} {weekDays[6].date.toLocaleString('default', { month: 'short' })}
          </div>
          <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-2 text-zinc-500 hover:text-zinc-300">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Time Rail */}
          <div className="w-14 border-r border-border bg-surface flex-shrink-0">
            <div className="h-12 border-b border-border" />
            {Array.from({ length: 24 }, (_, i) => i).map(hour => (
              <div key={hour} className="h-10 border-b border-border flex items-center justify-center">
                <span className="text-[9px] text-zinc-600 font-mono">{formatTimeAMPM(hour, 0)}</span>
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-7 min-h-full">
              {weekDays.map(day => (
                <DayColumn
                  key={day.dateStr}
                  day={day}
                  tasks={state.tasks.filter(t => {
                    if (!t.scheduledTime) return false;
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
                  onStickyNoteUpdate={onStickyNoteUpdate}
                  stickyNote={state.stickyNotes?.[day.dateStr]}
                  onAdd={onAdd}
                  onSelect={setSelectedTask}
                  expandedHours={expandedHours}
                  onToggleHour={toggleHour}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Inspector Panel */}
      {selectedTask && (
        <Inspector
          task={selectedTask}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Template Modal */}
      {expandingTemplate && (
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
      )}
    </div>
  );
};

// Type Buttons
const TypeButtons: React.FC<{ onAdd: Props['onAdd'] }> = ({ onAdd }) => {
  const [input, setInput] = useState('');
  const [activeType, setActiveType] = useState<DockSection>('TODO');

  const handleAdd = (type: DockSection) => {
    if (!input.trim()) return;
    onAdd(input.trim(), Category.AGENCY, 'MED', { dockSection: type });
    setInput('');
  };

  return (
    <div className="p-2 border-b border-border space-y-2">
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleAdd(activeType); }}
        placeholder="Quick add..."
        className="w-full bg-zinc-900 border-0 rounded px-2 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700"
      />
      <div className="flex flex-wrap gap-1">
        {[
          { type: 'TODO' as DockSection, label: 'Task', icon: '✓' },
          { type: 'ROUTINE' as DockSection, label: 'Routine', icon: '↻' },
          { type: 'PROJECT' as DockSection, label: 'Project', icon: '🏔' },
          { type: 'TEMPLATE' as DockSection, label: 'Template', icon: '⧉' },
          { type: 'HABIT' as DockSection, label: 'Habit', icon: '⟳' },
        ].map(({ type, label, icon }) => (
          <button
            key={type}
            onClick={() => { setActiveType(type); if (input.trim()) handleAdd(type); }}
            className={`px-2 py-1 rounded text-[10px] transition-colors ${activeType === type ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
          >
            <span className="mr-1">{icon}</span>
            {label}
          </button>
        ))}
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

  if (tasks.length === 0 && !adding) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 uppercase tracking-wider">
          {icon}
          <span>{title}</span>
          <span className="text-zinc-700">{tasks.length}</span>
        </div>
        <button onClick={() => setAdding(true)} className="text-zinc-600 hover:text-zinc-400">
          <Plus size={12} />
        </button>
      </div>

      {adding && (
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onBlur={handleAdd}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
          placeholder={`New ${title.toLowerCase()}...`}
          className="w-full bg-zinc-900 border-0 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          autoFocus
        />
      )}

      {tasks.map(task => (
        type === 'TEMPLATE' ? (
          <div
            key={task.id}
            onClick={() => onSelect(task)}
            className="group bg-zinc-900/50 hover:bg-zinc-900 rounded px-2 py-1 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <FileText size={10} className="text-blue-400 flex-shrink-0" />
              <div className="flex-1 text-xs text-zinc-300 truncate">{task.title}</div>
              <button onClick={(e) => { e.stopPropagation(); onExpand?.(task); }} className="text-[9px] text-blue-400 hover:text-blue-300">
                Apply
              </button>
            </div>
          </div>
        ) : type === 'HABIT' ? (
          <div
            key={task.id}
            onClick={() => onSelect(task)}
            className="group bg-zinc-900/50 hover:bg-zinc-900 rounded px-2 py-1 cursor-pointer"
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
                  <CheckCircle2 size={12} className="text-emerald-500" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-zinc-600" />
                )}
              </button>
              <div className="flex-1 text-xs text-zinc-300 truncate">{task.title}</div>
            </div>
          </div>
        ) : (
          <div
            key={task.id}
            draggable
            onDragStart={() => onDragStart(task)}
            onClick={() => onSelect(task)}
            className="group bg-zinc-900/50 hover:bg-zinc-900 rounded px-2 py-1 cursor-move"
          >
            <div className="flex items-center gap-1.5">
              <GripVertical size={10} className="text-zinc-700 flex-shrink-0" />
              <div className="flex-1 text-xs text-zinc-300 truncate">
                {task.urgent && <span className="text-red-400 mr-1">!</span>}
                {task.title}
              </div>
            </div>
          </div>
        )
      ))}
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
  onStickyNoteUpdate: (dateKey: string, content: string) => void;
  stickyNote?: string;
  onAdd: Props['onAdd'];
  onSelect: (task: Task) => void;
  expandedHours: Set<string>;
  onToggleHour: (dayStr: string, hour: number) => void;
}> = ({ day, tasks, dragOverHour, onDrop, onDragOver, onUpdate, onDelete, onStartSession, activeTaskId, currentTime, onStickyNoteUpdate, stickyNote, onAdd, onSelect, expandedHours, onToggleHour }) => {
  const cairoOffset = 2;
  const cairoTime = new Date(currentTime.getTime() + (cairoOffset * 60 * 60 * 1000));
  const cairoHours = cairoTime.getUTCHours();
  const isCurrentDay = day.isToday;

  const prayers = getPrayerTimesForDate(day.date);

  return (
    <div className={`border-r border-border flex flex-col ${day.isToday ? 'bg-emerald-950/5' : ''}`}>
      <div className={`h-12 border-b border-border p-2 ${day.isToday ? 'bg-emerald-950/10' : ''}`}>
        <div className="text-[8px] text-zinc-500 uppercase">{day.dayName}</div>
        <div className={`text-lg font-light ${day.isToday ? 'text-emerald-400' : 'text-zinc-300'}`}>
          {day.dayNum}
        </div>
      </div>

      <div className="flex-1">
        {Array.from({ length: 24 }, (_, i) => i).map(hour => {
          const hourTasks = tasks.filter(t => t.scheduledTime && new Date(t.scheduledTime).getHours() === hour);
          const hourPrayers = prayers.filter(p => new Date(p.timestamp).getHours() === hour);
          const isExpanded = expandedHours.has(`${day.dateStr}-${hour}`);
          const hasContent = hourTasks.length > 0 || hourPrayers.length > 0;

          return (
            <HourSlot
              key={hour}
              hour={hour}
              day={day}
              tasks={hourTasks}
              prayers={hourPrayers}
              isExpanded={isExpanded || hasContent}
              onToggle={() => onToggleHour(day.dateStr, hour)}
              isDragOver={dragOverHour === hour}
              onDrop={() => onDrop(day, hour)}
              onDragOver={() => onDragOver(hour)}
              onDragLeave={() => onDragOver(null)}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onStartSession={onStartSession}
              activeTaskId={activeTaskId}
              isCurrentHour={isCurrentDay && cairoHours === hour}
              onAdd={onAdd}
              dateStr={day.dateStr}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </div>
  );
};

// Hour Slot
const HourSlot: React.FC<{
  hour: number;
  day: WeekDay;
  tasks: Task[];
  prayers: Array<{ name: string; time: string; timestamp: number; icon: string }>;
  isExpanded: boolean;
  onToggle: () => void;
  isDragOver: boolean;
  onDrop: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onStartSession: (id: string) => void;
  activeTaskId: string | null;
  isCurrentHour: boolean;
  onAdd: Props['onAdd'];
  dateStr: string;
  onSelect: (task: Task) => void;
}> = ({ hour, tasks, prayers, isExpanded, onToggle, isDragOver, onDrop, onDragOver, onDragLeave, onUpdate, onDelete, onStartSession, activeTaskId, isCurrentHour, onAdd, dateStr, onSelect }) => {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const scheduledDate = new Date(dateStr);
    scheduledDate.setHours(hour, 0, 0, 0);
    onAdd(newTitle.trim(), Category.AGENCY, 'MED', { scheduledTime: scheduledDate.getTime() });
    setNewTitle('');
    setAdding(false);
  };

  if (!isExpanded && tasks.length === 0 && prayers.length === 0) {
    return (
      <div
        onDrop={e => { e.preventDefault(); onDrop(); }}
        onDragOver={e => { e.preventDefault(); onDragOver(); }}
        onDragLeave={onDragLeave}
        onClick={onToggle}
        className={`h-10 border-b border-zinc-900/30 hover:bg-zinc-900/20 cursor-pointer ${isDragOver ? 'bg-emerald-950/20' : ''} ${isCurrentHour ? 'bg-emerald-950/5' : ''}`}
      />
    );
  }

  return (
    <div
      onDrop={e => { e.preventDefault(); onDrop(); }}
      onDragOver={e => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onDoubleClick={() => setAdding(true)}
      className={`min-h-[40px] border-b border-zinc-900/50 p-1.5 transition-colors ${isDragOver ? 'bg-emerald-950/20' : ''} ${isCurrentHour ? 'bg-emerald-950/10' : ''} hover:bg-zinc-900/20`}
    >
      <div className="space-y-0.5">
        {prayers.map(prayer => (
          <div key={prayer.name} className="flex items-center gap-1 text-[9px] text-zinc-500">
            {getPrayerIcon(prayer.icon)}
            <span>{prayer.name}</span>
            <span className="text-zinc-700 ml-auto">{prayer.time}</span>
          </div>
        ))}

        {tasks.map((task, idx) => (
          <div
            key={task.id}
            onClick={() => onSelect(task)}
            className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-zinc-900/50 cursor-pointer ${
              task.impact === 'HIGH' ? 'text-red-400' : task.impact === 'LOW' ? 'text-blue-400' : 'text-amber-400'
            } ${task.status === TaskStatus.DONE ? 'line-through opacity-50' : ''}`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(task.id, { status: task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE });
              }}
              className="flex-shrink-0"
            >
              {task.status === TaskStatus.DONE ? (
                <Check size={9} className="text-emerald-500" />
              ) : (
                <div className="w-2 h-2 rounded border border-current opacity-50" />
              )}
            </button>
            <span className="text-[9px]">{idx > 0 ? '├' : '•'}</span>
            <div className="flex-1 text-[10px] truncate">
              {task.urgent && <span className="text-red-400 mr-1">!</span>}
              {task.title}
              {task.parentProject && <span className="opacity-60 ml-1">(s)</span>}
              {task.duration && <span className="opacity-60 ml-1">{task.duration}m</span>}
            </div>
          </div>
        ))}

        {adding && (
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onBlur={handleAdd}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
            placeholder="Task..."
            className="w-full bg-zinc-900 border-0 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            autoFocus
          />
        )}
      </div>
    </div>
  );
};

// Inspector Panel
const Inspector: React.FC<{
  task: Task;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}> = ({ task, onUpdate, onDelete, onClose }) => {
  const [title, setTitle] = useState(task.title);
  const [dockSection, setDockSection] = useState<DockSection>(task.dockSection || 'TODO');
  const [urgent, setUrgent] = useState(task.urgent || false);
  const [duration, setDuration] = useState(task.duration || 0);
  const [impact, setImpact] = useState(task.impact);

  const handleSave = () => {
    onUpdate(task.id, { title, dockSection, urgent, duration, impact });
  };

  return (
    <div className="w-64 border-l border-border bg-surface flex-shrink-0 flex flex-col">
      <div className="h-12 border-b border-border flex items-center justify-between px-3">
        <span className="text-xs font-medium text-zinc-300">Inspector</span>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="space-y-1.5">
          <label className="text-[9px] text-zinc-500 uppercase">Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleSave}
            className="w-full bg-zinc-900 border-0 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-700"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] text-zinc-500 uppercase">Type</label>
          <select
            value={dockSection}
            onChange={e => { setDockSection(e.target.value as DockSection); handleSave(); }}
            className="w-full bg-zinc-900 border-0 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-700"
          >
            <option value="TODO">To Do</option>
            <option value="ROUTINE">Routine</option>
            <option value="PROJECT">Project</option>
            <option value="TEMPLATE">Template</option>
            <option value="LATER">Later</option>
            <option value="HABIT">Habit</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] text-zinc-500 uppercase">Priority</label>
          <div className="flex gap-1">
            {(['LOW', 'MED', 'HIGH'] as const).map(level => (
              <button
                key={level}
                onClick={() => { setImpact(level); handleSave(); }}
                className={`flex-1 px-2 py-1 rounded text-[10px] ${impact === level ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] text-zinc-500 uppercase">Duration (min)</label>
          <input
            type="number"
            value={duration}
            onChange={e => setDuration(parseInt(e.target.value) || 0)}
            onBlur={handleSave}
            className="w-full bg-zinc-900 border-0 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-700"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={urgent}
            onChange={e => { setUrgent(e.target.checked); handleSave(); }}
            className="w-4 h-4"
          />
          <label className="text-xs text-zinc-300">Urgent</label>
        </div>

        {task.scheduledTime && (
          <div className="space-y-1.5">
            <label className="text-[9px] text-zinc-500 uppercase">Scheduled</label>
            <div className="text-xs text-zinc-300">
              {new Date(task.scheduledTime).toLocaleString('default', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border p-3 space-y-2">
        <button
          onClick={() => { onDelete(task.id); onClose(); }}
          className="w-full px-3 py-1.5 bg-red-950/30 hover:bg-red-950/50 text-red-400 rounded text-xs"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default WeeklyPlannerView;
