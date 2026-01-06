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
  MoreVertical,
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
    sunrise: <Sunrise size={11} />,
    sun: <Sun size={11} />,
    'cloud-sun': <CloudSun size={11} />,
    sunset: <Sunset size={11} />,
    moon: <Moon size={11} />,
  };
  return iconMap[iconName] || <Sun size={11} />;
};

const WeeklyPlannerView: React.FC<Props> = ({ state, onAdd, onUpdate, onStartSession, activeTaskId, onDelete, onStickyNoteUpdate }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
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

  return (
    <div className="flex h-full bg-background">
      {/* Dock */}
      <div className={`border-r border-border bg-surface transition-all ${dockCollapsed ? 'w-12' : 'w-72'} flex-shrink-0`}>
        {dockCollapsed ? (
          <button onClick={() => setDockCollapsed(false)} className="w-full h-12 flex items-center justify-center text-zinc-500 hover:text-zinc-300">
            <ChevronRight size={16} />
          </button>
        ) : (
          <div className="h-full flex flex-col">
            <div className="h-12 border-b border-border flex items-center justify-between px-4">
              <span className="text-xs font-medium text-zinc-300">Dock</span>
              <button onClick={() => setDockCollapsed(true)} className="text-zinc-500 hover:text-zinc-300">
                <ChevronLeft size={16} />
              </button>
            </div>

            <div className="p-3 border-b border-border">
              <QuickAdd onAdd={onAdd} />
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {dockTasks.ROUTINE.length > 0 && (
                <DockSection
                  title="Routines"
                  icon={<Repeat size={11} />}
                  tasks={dockTasks.ROUTINE}
                  onDragStart={handleDragStart}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  editingTask={editingTask}
                  setEditingTask={setEditingTask}
                />
              )}

              {dockTasks.TEMPLATE.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 px-1 text-[10px] text-zinc-500 uppercase tracking-wider">
                    <FileText size={11} />
                    <span>Templates</span>
                  </div>
                  {dockTasks.TEMPLATE.map(task => (
                    <TemplateCard
                      key={task.id}
                      task={task}
                      onExpand={setExpandingTemplate}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              )}

              {dockTasks.PROJECT.length > 0 && (
                <DockSection
                  title="Projects"
                  icon={<Mountain size={11} />}
                  tasks={dockTasks.PROJECT}
                  onDragStart={handleDragStart}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  editingTask={editingTask}
                  setEditingTask={setEditingTask}
                />
              )}

              {dockTasks.TODO.length > 0 && (
                <DockSection
                  title="To Do"
                  icon={<ListTodo size={11} />}
                  tasks={dockTasks.TODO}
                  onDragStart={handleDragStart}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  editingTask={editingTask}
                  setEditingTask={setEditingTask}
                />
              )}

              {dockTasks.LATER.length > 0 && (
                <DockSection
                  title="Later"
                  icon={<Archive size={11} />}
                  tasks={dockTasks.LATER}
                  onDragStart={handleDragStart}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  editingTask={editingTask}
                  setEditingTask={setEditingTask}
                />
              )}

              {dockTasks.HABIT.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 px-1 text-[10px] text-zinc-500 uppercase tracking-wider">
                    <CheckCircle2 size={11} />
                    <span>Habits</span>
                  </div>
                  {dockTasks.HABIT.map(task => (
                    <HabitCard
                      key={task.id}
                      task={task}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      currentDate={currentTime.toISOString().split('T')[0]}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Planner */}
      <div className="flex-1 flex flex-col">
        <div className="h-12 border-b border-border flex items-center justify-between px-6">
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

        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-7 h-full">
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
                editingTask={editingTask}
                setEditingTask={setEditingTask}
                onAdd={onAdd}
              />
            ))}
          </div>
        </div>
      </div>

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

// Quick Add
const QuickAdd: React.FC<{ onAdd: Props['onAdd'] }> = ({ onAdd }) => {
  const [input, setInput] = useState('');
  const [section, setSection] = useState<DockSection>('TODO');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    let title = input.trim();
    let urgent = false;

    if (title.startsWith('!')) {
      urgent = true;
      title = title.slice(1).trim();
    }

    onAdd(title, Category.AGENCY, 'MED', { dockSection: section, urgent });
    setInput('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Quick add..."
        className="w-full bg-zinc-900 border-0 rounded px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700"
      />
      <div className="flex items-center justify-between">
        <select
          value={section}
          onChange={e => setSection(e.target.value as DockSection)}
          className="text-[10px] bg-zinc-900 border-0 rounded px-2 py-1 text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-700"
        >
          <option value="TODO">To Do</option>
          <option value="ROUTINE">Routine</option>
          <option value="PROJECT">Project</option>
          <option value="TEMPLATE">Template</option>
          <option value="LATER">Later</option>
          <option value="HABIT">Habit</option>
        </select>
        <button type="submit" className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-white text-xs">
          Add
        </button>
      </div>
    </form>
  );
};

// Dock Section
const DockSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  tasks: Task[];
  onDragStart: (task: Task) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  editingTask: string | null;
  setEditingTask: (id: string | null) => void;
}> = ({ title, icon, tasks, onDragStart, onUpdate, onDelete, editingTask, setEditingTask }) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 px-1 text-[10px] text-zinc-500 uppercase tracking-wider">
        {icon}
        <span>{title}</span>
        <span className="ml-auto text-zinc-700">{tasks.length}</span>
      </div>
      {tasks.map(task => (
        <DockTaskCard
          key={task.id}
          task={task}
          onDragStart={onDragStart}
          onUpdate={onUpdate}
          onDelete={onDelete}
          editing={editingTask === task.id}
          setEditing={(editing) => setEditingTask(editing ? task.id : null)}
        />
      ))}
    </div>
  );
};

// Dock Task Card
const DockTaskCard: React.FC<{
  task: Task;
  onDragStart: (task: Task) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  editing: boolean;
  setEditing: (editing: boolean) => void;
}> = ({ task, onDragStart, onUpdate, onDelete, editing, setEditing }) => {
  const [editValue, setEditValue] = useState(task.title);

  const handleSave = () => {
    if (editValue.trim() && editValue !== task.title) {
      onUpdate(task.id, { title: editValue.trim() });
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="bg-zinc-900 rounded px-2 py-1.5">
        <input
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
          className="w-full bg-zinc-800 border-0 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          autoFocus
        />
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task)}
      className="group bg-zinc-900/50 hover:bg-zinc-900 rounded px-2 py-1.5 cursor-move transition-colors"
    >
      <div className="flex items-center gap-2">
        <GripVertical size={12} className="text-zinc-700 flex-shrink-0" />
        <div className="flex-1 min-w-0 text-xs text-zinc-300 truncate">
          {task.urgent && <span className="text-red-400 mr-1">!</span>}
          {task.title}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          <button onClick={() => setEditing(true)} className="text-zinc-600 hover:text-zinc-400">
            <Edit2 size={11} />
          </button>
          <button onClick={() => onDelete(task.id)} className="text-zinc-600 hover:text-red-400">
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Template Card
const TemplateCard: React.FC<{
  task: Task;
  onExpand: (task: Task) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
}> = ({ task, onExpand, onUpdate, onDelete }) => {
  return (
    <div className="group bg-zinc-900/50 hover:bg-zinc-900 rounded px-2 py-1.5">
      <div className="flex items-center gap-2">
        <FileText size={12} className="text-blue-400 flex-shrink-0" />
        <div className="flex-1 min-w-0 text-xs text-zinc-300 truncate">{task.title}</div>
        <button onClick={() => onExpand(task)} className="text-[10px] text-blue-400 hover:text-blue-300">
          Apply
        </button>
        <button onClick={() => onDelete(task.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
};

// Habit Card
const HabitCard: React.FC<{
  task: Task;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  currentDate: string;
}> = ({ task, onUpdate, onDelete, currentDate }) => {
  const isChecked = task.habitTracking?.[currentDate] || false;

  const toggleCheck = () => {
    const newTracking = { ...(task.habitTracking || {}), [currentDate]: !isChecked };
    onUpdate(task.id, { habitTracking: newTracking });
  };

  return (
    <div className="group bg-zinc-900/50 hover:bg-zinc-900 rounded px-2 py-1.5">
      <div className="flex items-center gap-2">
        <button onClick={toggleCheck} className="flex-shrink-0">
          {isChecked ? (
            <CheckCircle2 size={14} className="text-emerald-500" />
          ) : (
            <div className="w-3.5 h-3.5 rounded-full border border-zinc-600" />
          )}
        </button>
        <div className="flex-1 text-xs text-zinc-300">{task.title}</div>
        <button onClick={() => onDelete(task.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400">
          <Trash2 size={11} />
        </button>
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
  onStickyNoteUpdate: (dateKey: string, content: string) => void;
  stickyNote?: string;
  editingTask: string | null;
  setEditingTask: (id: string | null) => void;
  onAdd: Props['onAdd'];
}> = ({ day, tasks, dragOverHour, onDrop, onDragOver, onUpdate, onDelete, onStartSession, activeTaskId, currentTime, onStickyNoteUpdate, stickyNote, editingTask, setEditingTask, onAdd }) => {
  const cairoOffset = 2;
  const cairoTime = new Date(currentTime.getTime() + (cairoOffset * 60 * 60 * 1000));
  const cairoHours = cairoTime.getUTCHours();
  const isCurrentDay = day.isToday;

  const prayers = getPrayerTimesForDate(day.date);

  // Show comprehensive hours (6 AM to 11 PM)
  const allHours = Array.from({ length: 18 }, (_, i) => i + 6);

  return (
    <div className={`border-r border-border flex flex-col ${day.isToday ? 'bg-emerald-950/5' : ''}`}>
      <div className={`h-14 border-b border-border p-2 ${day.isToday ? 'bg-emerald-950/10' : ''}`}>
        <div className="text-[9px] text-zinc-500 uppercase tracking-wide">{day.dayName}</div>
        <div className={`text-xl font-light ${day.isToday ? 'text-emerald-400' : 'text-zinc-300'}`}>
          {day.dayNum}
        </div>
      </div>

      <StickyNote day={day} value={stickyNote} onUpdate={onStickyNoteUpdate} />

      <div className="flex-1 overflow-y-auto">
        {allHours.map(hour => (
          <HourSlot
            key={hour}
            hour={hour}
            day={day}
            tasks={tasks.filter(t => t.scheduledTime && new Date(t.scheduledTime).getHours() === hour)}
            isDragOver={dragOverHour === hour}
            onDrop={() => onDrop(day, hour)}
            onDragOver={() => onDragOver(hour)}
            onDragLeave={() => onDragOver(null)}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onStartSession={onStartSession}
            activeTaskId={activeTaskId}
            prayers={prayers.filter(p => new Date(p.timestamp).getHours() === hour)}
            isCurrentHour={isCurrentDay && cairoHours === hour}
            editingTask={editingTask}
            setEditingTask={setEditingTask}
            onAdd={onAdd}
            dateStr={day.dateStr}
          />
        ))}
      </div>
    </div>
  );
};

// Sticky Note
const StickyNote: React.FC<{ day: WeekDay; value?: string; onUpdate: (dateKey: string, content: string) => void }> = ({ day, value, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value || '');

  if (!editing && !value) return null;

  if (editing) {
    return (
      <div className="mx-2 mt-2 mb-1 p-2 bg-amber-950/20 border border-amber-900/30 rounded">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={() => { onUpdate(day.dateStr, text); setEditing(false); }}
          className="w-full bg-zinc-900 border-0 rounded px-2 py-1 text-xs text-zinc-300 resize-none focus:outline-none"
          rows={2}
          autoFocus
        />
      </div>
    );
  }

  return (
    <div onClick={() => setEditing(true)} className="mx-2 mt-2 mb-1 p-2 bg-amber-950/20 border border-amber-900/30 rounded text-xs text-amber-400/80 cursor-pointer hover:text-amber-400">
      {value}
    </div>
  );
};

// Hour Slot
const HourSlot: React.FC<{
  hour: number;
  day: WeekDay;
  tasks: Task[];
  isDragOver: boolean;
  onDrop: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onStartSession: (id: string) => void;
  activeTaskId: string | null;
  prayers: Array<{ name: string; time: string; timestamp: number; icon: string }>;
  isCurrentHour: boolean;
  editingTask: string | null;
  setEditingTask: (id: string | null) => void;
  onAdd: Props['onAdd'];
  dateStr: string;
}> = ({ hour, tasks, isDragOver, onDrop, onDragOver, onDragLeave, onUpdate, onDelete, onStartSession, activeTaskId, prayers, isCurrentHour, editingTask, setEditingTask, onAdd, dateStr }) => {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddText, setQuickAddText] = useState('');

  const handleQuickAdd = () => {
    if (!quickAddText.trim()) return;
    const scheduledDate = new Date(dateStr);
    scheduledDate.setHours(hour, 0, 0, 0);
    onAdd(quickAddText.trim(), Category.AGENCY, 'MED', { scheduledTime: scheduledDate.getTime() });
    setQuickAddText('');
    setShowQuickAdd(false);
  };

  return (
    <div
      onDrop={e => { e.preventDefault(); onDrop(); }}
      onDragOver={e => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onDoubleClick={() => setShowQuickAdd(true)}
      className={`group min-h-[48px] border-b border-zinc-900/50 p-1.5 transition-colors ${isDragOver ? 'bg-emerald-950/20 border-emerald-900/50' : ''} ${isCurrentHour ? 'bg-emerald-950/10' : ''} hover:bg-zinc-900/30`}
    >
      <div className="flex gap-1.5">
        <div className="text-[9px] text-zinc-600 font-mono w-10 flex-shrink-0 pt-0.5">{formatTimeAMPM(hour, 0)}</div>
        <div className="flex-1 space-y-1">
          {prayers.map(prayer => (
            <div key={prayer.name} className="flex items-center gap-1 text-[9px] text-zinc-500">
              {getPrayerIcon(prayer.icon)}
              <span>{prayer.name}</span>
              <span className="text-zinc-700">{prayer.time}</span>
            </div>
          ))}
          {tasks.map(task => (
            <ScheduledTask
              key={task.id}
              task={task}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onStartSession={onStartSession}
              isActive={task.id === activeTaskId}
              editing={editingTask === task.id}
              setEditing={(editing) => setEditingTask(editing ? task.id : null)}
            />
          ))}
          {showQuickAdd && (
            <input
              value={quickAddText}
              onChange={e => setQuickAddText(e.target.value)}
              onBlur={handleQuickAdd}
              onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(); if (e.key === 'Escape') setShowQuickAdd(false); }}
              placeholder="Task..."
              className="w-full bg-zinc-900 border-0 rounded px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              autoFocus
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Scheduled Task
const ScheduledTask: React.FC<{
  task: Task;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onStartSession: (id: string) => void;
  isActive: boolean;
  editing: boolean;
  setEditing: (editing: boolean) => void;
}> = ({ task, onUpdate, onDelete, onStartSession, isActive, editing, setEditing }) => {
  const [editValue, setEditValue] = useState(task.title);

  const handleSave = () => {
    if (editValue.trim() && editValue !== task.title) {
      onUpdate(task.id, { title: editValue.trim() });
    }
    setEditing(false);
  };

  const impactColors = {
    HIGH: 'bg-red-950/20 text-red-400',
    MED: 'bg-amber-950/20 text-amber-400',
    LOW: 'bg-blue-950/20 text-blue-400',
  };

  if (editing) {
    return (
      <input
        value={editValue}
        onChange={e => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
        className="w-full bg-zinc-900 border-0 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        autoFocus
      />
    );
  }

  return (
    <div className={`group rounded px-2 py-1 ${impactColors[task.impact]} ${isActive ? 'ring-1 ring-emerald-500/50' : ''}`}>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onUpdate(task.id, { status: task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE })}
          className="flex-shrink-0"
        >
          {task.status === TaskStatus.DONE ? (
            <Check size={11} className="text-emerald-500" />
          ) : (
            <div className="w-2.5 h-2.5 rounded border border-current opacity-50" />
          )}
        </button>
        <div className={`flex-1 text-xs truncate ${task.status === TaskStatus.DONE ? 'line-through opacity-50' : ''}`} onDoubleClick={() => setEditing(true)}>
          {task.urgent && <span className="text-red-400 mr-1">!</span>}
          {task.title}
          {task.parentProject && <span className="text-[9px] opacity-60 ml-1">(s)</span>}
          {task.duration && <span className="text-[9px] opacity-60 ml-1">{task.duration}m</span>}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
          <button onClick={() => onStartSession(task.id)} className="text-emerald-400 hover:text-emerald-300">
            <Play size={10} />
          </button>
          <button onClick={() => onDelete(task.id)} className="text-red-400 hover:text-red-300">
            <Trash2 size={10} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeeklyPlannerView;
