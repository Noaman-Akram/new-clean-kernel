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
  Repeat,
  FileText,
  Mountain,
  ListTodo,
  Archive,
  CheckCircle2,
  AlertCircle,
  Copy,
  ArrowRight,
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
    sunrise: <Sunrise size={9} />,
    sun: <Sun size={9} />,
    'cloud-sun': <CloudSun size={9} />,
    sunset: <Sunset size={9} />,
    moon: <Moon size={9} />,
  };
  return iconMap[iconName] || <Sun size={9} />;
};

const WeeklyPlannerView: React.FC<Props> = ({ state, onAdd, onUpdate, onStartSession, activeTaskId, onDelete, onStickyNoteUpdate }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [contextMenu, setContextMenu] = useState<{ day: WeekDay; hour: number; x: number; y: number } | null>(null);
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

  // Get urgent tasks from ALL sections
  const urgentTasks = state.tasks.filter(t => t.urgent && t.scheduledTime && t.status !== TaskStatus.DONE);

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

  const handleContextMenuAdd = (type: 'task' | 'routine' | 'project' | 'template' | 'habit') => {
    if (!contextMenu) return;

    const scheduledDate = new Date(contextMenu.day.date);
    scheduledDate.setHours(contextMenu.hour, 0, 0, 0);

    if (type === 'task') {
      onAdd('New task', Category.AGENCY, 'MED', { scheduledTime: scheduledDate.getTime() });
    } else if (type === 'routine') {
      // Show routines to pick from
      const routine = dockTasks.ROUTINE[0];
      if (routine) {
        onAdd(routine.title, routine.category, routine.impact, {
          scheduledTime: scheduledDate.getTime(),
          duration: routine.duration,
        });
      }
    } else if (type === 'project') {
      const project = dockTasks.PROJECT[0];
      if (project) {
        onAdd(`${project.title} — session`, project.category, project.impact, {
          scheduledTime: scheduledDate.getTime(),
          duration: 60,
          parentProject: project.id,
        });
      }
    }

    setContextMenu(null);
  };

  return (
    <div className="flex h-full bg-background relative">
      {/* Dock */}
      <div className={`border-r border-border bg-surface transition-all ${dockCollapsed ? 'w-12' : 'w-56'} flex-shrink-0 z-10`}>
        {dockCollapsed ? (
          <button onClick={() => setDockCollapsed(false)} className="w-full h-12 flex items-center justify-center text-zinc-500 hover:text-zinc-300">
            <ChevronRight size={16} />
          </button>
        ) : (
          <div className="h-full flex flex-col">
            <div className="h-12 border-b border-border flex items-center justify-between px-3">
              <span className="text-xs font-medium text-zinc-400">Dock</span>
              <button onClick={() => setDockCollapsed(true)} className="text-zinc-500 hover:text-zinc-300">
                <ChevronLeft size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              <DockSection
                title="Routines"
                icon={<Repeat size={9} />}
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
                icon={<FileText size={9} />}
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
                icon={<Mountain size={9} />}
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
                icon={<ListTodo size={9} />}
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
                icon={<Archive size={9} />}
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
                icon={<CheckCircle2 size={9} />}
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
      <div className="flex-1 flex flex-col relative">
        <div className="h-12 border-b border-border flex items-center justify-between px-4 z-10 bg-background">
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

        {/* Urgent Tasks Banner */}
        {urgentTasks.length > 0 && (
          <div className="border-b border-border bg-red-950/10 px-4 py-2">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={12} className="text-red-400" />
              <span className="text-[10px] text-red-400 uppercase tracking-wider">Urgent</span>
              <span className="text-[10px] text-zinc-600">{urgentTasks.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {urgentTasks.slice(0, 5).map(task => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="px-2 py-1 bg-red-950/20 border border-red-900/30 rounded text-[10px] text-red-400 cursor-pointer hover:bg-red-950/30"
                >
                  {task.title}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          {/* Time Rail */}
          <div className="w-12 border-r border-border bg-surface flex-shrink-0 sticky left-0 z-10">
            <div className="h-10 border-b border-border" />
            {Array.from({ length: 24 }, (_, i) => i).map(hour => (
              <div key={hour} className="h-12 border-b border-zinc-900/30 flex items-center justify-center">
                <span className="text-[8px] text-zinc-600 font-mono">{formatTimeAMPM(hour, 0)}</span>
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-7">
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
                  onSelect={setSelectedTask}
                  onContextMenu={(hour, e) => {
                    e.preventDefault();
                    setContextMenu({ day, hour, x: e.clientX, y: e.clientY });
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Inspector Overlay */}
      {selectedTask && (
        <Inspector
          task={selectedTask}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-surface border border-border rounded-lg shadow-2xl z-50 py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <div className="px-3 py-1 text-[9px] text-zinc-600 uppercase">
            {contextMenu.day.dayName} {formatTimeAMPM(contextMenu.hour, 0)}
          </div>
          <div className="h-px bg-border my-1" />
          <button onClick={() => handleContextMenuAdd('task')} className="w-full px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-900 flex items-center gap-2">
            <span className="text-zinc-600">•</span>
            New task
          </button>
          {dockTasks.ROUTINE.length > 0 && (
            <button onClick={() => handleContextMenuAdd('routine')} className="w-full px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-900 flex items-center gap-2">
              <Repeat size={10} className="text-orange-400" />
              Clone routine
            </button>
          )}
          {dockTasks.PROJECT.length > 0 && (
            <button onClick={() => handleContextMenuAdd('project')} className="w-full px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-900 flex items-center gap-2">
              <Mountain size={10} className="text-purple-400" />
              Start session
            </button>
          )}
        </div>
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
          onBlur={handleAdd}
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
  onSelect: (task: Task) => void;
  onContextMenu: (hour: number, e: React.MouseEvent) => void;
}> = ({ day, tasks, dragOverHour, onDrop, onDragOver, onUpdate, onDelete, onStartSession, activeTaskId, currentTime, onSelect, onContextMenu }) => {
  const cairoOffset = 2;
  const cairoTime = new Date(currentTime.getTime() + (cairoOffset * 60 * 60 * 1000));
  const cairoHours = cairoTime.getUTCHours();
  const isCurrentDay = day.isToday;

  const prayers = getPrayerTimesForDate(day.date);

  return (
    <div className={`border-r border-border flex flex-col ${day.isToday ? 'bg-emerald-950/5' : ''}`}>
      <div className={`h-10 border-b border-border px-2 py-1 ${day.isToday ? 'bg-emerald-950/10' : ''}`}>
        <div className="text-[7px] text-zinc-600 uppercase">{day.dayName}</div>
        <div className={`text-sm font-light ${day.isToday ? 'text-emerald-400' : 'text-zinc-400'}`}>
          {day.dayNum}
        </div>
      </div>

      <div>
        {Array.from({ length: 24 }, (_, i) => i).map(hour => {
          const hourTasks = tasks.filter(t => t.scheduledTime && new Date(t.scheduledTime).getHours() === hour);
          const hourPrayers = prayers.filter(p => new Date(p.timestamp).getHours() === hour);

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
            />
          );
        })}
      </div>
    </div>
  );
};

// Hour Slot (Fixed Height)
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
  onDelete: (id: string) => void;
  onStartSession: (id: string) => void;
  activeTaskId: string | null;
  isCurrentHour: boolean;
  onSelect: (task: Task) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}> = ({ tasks, prayers, isDragOver, onDrop, onDragOver, onDragLeave, onUpdate, activeTaskId, isCurrentHour, onSelect, onContextMenu }) => {
  return (
    <div
      onDrop={e => { e.preventDefault(); onDrop(); }}
      onDragOver={e => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onContextMenu={onContextMenu}
      className={`h-12 border-b border-zinc-900/30 px-1.5 py-1 transition-colors ${isDragOver ? 'bg-emerald-950/20' : ''} ${isCurrentHour ? 'bg-emerald-950/10' : ''} hover:bg-zinc-900/20 overflow-hidden`}
    >
      <div className="space-y-px">
        {prayers.map(prayer => (
          <div key={prayer.name} className="flex items-center gap-1 text-[8px] text-zinc-600">
            {getPrayerIcon(prayer.icon)}
            <span>{prayer.name}</span>
          </div>
        ))}

        {tasks.map((task, idx) => (
          <div
            key={task.id}
            onClick={() => onSelect(task)}
            className={`flex items-center gap-1 px-1 py-px rounded cursor-pointer hover:bg-zinc-900/50 ${
              task.status === TaskStatus.DONE ? 'opacity-40' : ''
            }`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(task.id, { status: task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE });
              }}
              className="flex-shrink-0"
            >
              {task.status === TaskStatus.DONE ? (
                <Check size={8} className="text-emerald-500" />
              ) : (
                <div className="w-1.5 h-1.5 rounded border border-zinc-600" />
              )}
            </button>
            <span className="text-[8px] text-zinc-700">{idx > 0 ? '├' : '•'}</span>
            <div className={`flex-1 text-[9px] truncate ${
              task.impact === 'HIGH' ? 'text-red-400' : task.impact === 'LOW' ? 'text-blue-400' : 'text-zinc-400'
            }`}>
              {task.urgent && <span className="text-red-500 mr-1">!</span>}
              {task.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Inspector Overlay
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

  const handleSave = () => {
    onUpdate(task.id, { title, dockSection, urgent, duration });
  };

  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="w-80 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <span className="text-sm text-zinc-400">Edit</span>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-[9px] text-zinc-600 uppercase mb-1 block">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={handleSave}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div>
            <label className="text-[9px] text-zinc-600 uppercase mb-1 block">Type</label>
            <select
              value={dockSection}
              onChange={e => { setDockSection(e.target.value as DockSection); handleSave(); }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700"
            >
              <option value="TODO">To Do</option>
              <option value="ROUTINE">Routine</option>
              <option value="PROJECT">Project</option>
              <option value="TEMPLATE">Template</option>
              <option value="LATER">Later</option>
              <option value="HABIT">Habit</option>
            </select>
          </div>

          <div>
            <label className="text-[9px] text-zinc-600 uppercase mb-1 block">Duration</label>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(parseInt(e.target.value) || 0)}
              onBlur={handleSave}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700"
              placeholder="minutes"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={urgent}
              onChange={e => { setUrgent(e.target.checked); handleSave(); }}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-900"
            />
            <span className="text-sm text-zinc-400">Urgent</span>
          </label>

          {task.scheduledTime && (
            <div>
              <label className="text-[9px] text-zinc-600 uppercase mb-1 block">Scheduled</label>
              <div className="text-sm text-zinc-400">
                {new Date(task.scheduledTime).toLocaleString('default', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 flex gap-2">
          <button
            onClick={() => { onDelete(task.id); onClose(); }}
            className="flex-1 px-3 py-2 bg-red-950/30 hover:bg-red-950/50 text-red-400 rounded text-sm"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeeklyPlannerView;
