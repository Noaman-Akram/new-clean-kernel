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
  ChevronRight as ChevronRightIcon,
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
  MoreHorizontal,
} from 'lucide-react';
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
    sunrise: <Sunrise size={12} />,
    sun: <Sun size={12} />,
    'cloud-sun': <CloudSun size={12} />,
    sunset: <Sunset size={12} />,
    moon: <Moon size={12} />,
  };
  return iconMap[iconName] || <Sun size={12} />;
};

const WeeklyPlannerView: React.FC<Props> = ({ state, onAdd, onUpdate, onStartSession, activeTaskId, onDelete, onStickyNoteUpdate }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [selectedDay, setSelectedDay] = useState<WeekDay | null>(null);
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

  // Organize by dock section
  const dockTasks = {
    ROUTINE: unscheduledTasks.filter(t => t.dockSection === 'ROUTINE'),
    TEMPLATE: unscheduledTasks.filter(t => t.dockSection === 'TEMPLATE'),
    PROJECT: unscheduledTasks.filter(t => t.dockSection === 'PROJECT'),
    TODO: unscheduledTasks.filter(t => t.dockSection === 'TODO' || !t.dockSection),
    LATER: unscheduledTasks.filter(t => t.dockSection === 'LATER'),
    HABIT: unscheduledTasks.filter(t => t.dockSection === 'HABIT'),
  };

  const toggleSection = (section: string) => {
    const newSet = new Set(collapsedSections);
    newSet.has(section) ? newSet.delete(section) : newSet.add(section);
    setCollapsedSections(newSet);
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDrop = (day: WeekDay, hour: number) => {
    if (!draggedTask) return;

    const scheduledDate = new Date(day.date);
    scheduledDate.setHours(hour, 0, 0, 0);

    const section = draggedTask.dockSection;

    // ROUTINE: Clone (original stays)
    if (section === 'ROUTINE') {
      onAdd(draggedTask.title, draggedTask.category, draggedTask.impact, {
        scheduledTime: scheduledDate.getTime(),
        duration: draggedTask.duration,
        urgent: draggedTask.urgent,
      });
    }
    // PROJECT: Spawn session (original stays)
    else if (section === 'PROJECT') {
      onAdd(`${draggedTask.title} — Session`, draggedTask.category, draggedTask.impact, {
        scheduledTime: scheduledDate.getTime(),
        duration: draggedTask.duration || 60,
        parentProject: draggedTask.id,
        urgent: draggedTask.urgent,
      });
    }
    // TODO/LATER: Move (leaves dock)
    else {
      onUpdate(draggedTask.id, { scheduledTime: scheduledDate.getTime() });
    }

    setDraggedTask(null);
    setDragOverHour(null);
  };

  const handleTemplateExpand = (template: Task, day: WeekDay) => {
    if (!template.templateSteps || template.templateSteps.length === 0) return;

    // Create tasks for each step, starting at 9 AM
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
    setSelectedDay(null);
  };

  return (
    <div className="flex h-full bg-background">
      {/* Strategy Dock */}
      <div className={`border-r border-border bg-surface transition-all ${dockCollapsed ? 'w-12' : 'w-80'} flex-shrink-0`}>
        {dockCollapsed ? (
          <button onClick={() => setDockCollapsed(false)} className="w-full h-12 flex items-center justify-center text-zinc-500 hover:text-zinc-300">
            <ChevronRightIcon size={16} />
          </button>
        ) : (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="h-12 border-b border-border flex items-center justify-between px-4">
              <span className="text-xs font-medium text-zinc-400">Dock</span>
              <button onClick={() => setDockCollapsed(true)} className="text-zinc-500 hover:text-zinc-300">
                <ChevronLeft size={16} />
              </button>
            </div>

            {/* Quick Add */}
            <div className="p-4 border-b border-border">
              <QuickAdd onAdd={onAdd} />
            </div>

            {/* Dock Sections */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
              {/* ROUTINES */}
              <DockSection
                title="Routines"
                icon={<Repeat size={12} />}
                hint="Drag to clone"
                tasks={dockTasks.ROUTINE}
                collapsed={collapsedSections.has('ROUTINE')}
                onToggle={() => toggleSection('ROUTINE')}
                onDragStart={handleDragStart}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />

              {/* TEMPLATES */}
              {dockTasks.TEMPLATE.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => toggleSection('TEMPLATE')}
                    className="w-full flex items-center justify-between text-xs font-medium text-blue-400 px-2 py-1.5 rounded border border-blue-900/30 hover:bg-zinc-900/50"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={12} />
                      <ChevronRightIcon size={12} className={`transition-transform ${!collapsedSections.has('TEMPLATE') ? 'rotate-90' : ''}`} />
                      <span>Templates</span>
                    </div>
                    <span className="text-[10px] text-zinc-600">{dockTasks.TEMPLATE.length}</span>
                  </button>
                  {!collapsedSections.has('TEMPLATE') && (
                    <div className="ml-4 space-y-1 text-[10px] text-zinc-500 mb-1">
                      <div>Apply to a day to expand</div>
                    </div>
                  )}
                  {!collapsedSections.has('TEMPLATE') && dockTasks.TEMPLATE.map(task => (
                    <TemplateCard
                      key={task.id}
                      task={task}
                      onExpand={(t) => setExpandingTemplate(t)}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              )}

              {/* PROJECTS */}
              <DockSection
                title="Ongoing Projects"
                icon={<Mountain size={12} />}
                hint="Drag spawns session"
                tasks={dockTasks.PROJECT}
                collapsed={collapsedSections.has('PROJECT')}
                onToggle={() => toggleSection('PROJECT')}
                onDragStart={handleDragStart}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />

              {/* TO DO */}
              <DockSection
                title="To Do"
                icon={<ListTodo size={12} />}
                hint="Drag to schedule"
                tasks={dockTasks.TODO}
                collapsed={collapsedSections.has('TODO')}
                onToggle={() => toggleSection('TODO')}
                onDragStart={handleDragStart}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />

              {/* LATER */}
              <DockSection
                title="Later"
                icon={<Archive size={12} />}
                hint="Parked ideas"
                tasks={dockTasks.LATER}
                collapsed={collapsedSections.has('LATER')}
                onToggle={() => toggleSection('LATER')}
                onDragStart={handleDragStart}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />

              {/* HABITS */}
              {dockTasks.HABIT.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => toggleSection('HABIT')}
                    className="w-full flex items-center justify-between text-xs font-medium text-emerald-400 px-2 py-1.5 rounded border border-emerald-900/30 hover:bg-zinc-900/50"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={12} />
                      <ChevronRightIcon size={12} className={`transition-transform ${!collapsedSections.has('HABIT') ? 'rotate-90' : ''}`} />
                      <span>Habits</span>
                    </div>
                    <span className="text-[10px] text-zinc-600">{dockTasks.HABIT.length}</span>
                  </button>
                  {!collapsedSections.has('HABIT') && (
                    <div className="ml-4 space-y-1 text-[10px] text-zinc-500 mb-1">
                      <div>Track daily, not scheduled</div>
                    </div>
                  )}
                  {!collapsedSections.has('HABIT') && dockTasks.HABIT.map(task => (
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

      {/* Weekly Grid */}
      <div className="flex-1 flex flex-col">
        {/* Week Navigation */}
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

        {/* Days Grid */}
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
              />
            ))}
          </div>
        </div>
      </div>

      {/* Template Expansion Modal */}
      {expandingTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setExpandingTemplate(null)}>
          <div className="bg-surface border border-border rounded-lg p-6 w-96" onClick={e => e.stopPropagation()}>
            <div className="text-sm font-medium text-zinc-300 mb-4">Apply Template: {expandingTemplate.title}</div>
            <div className="text-xs text-zinc-500 mb-4">Select a day to expand this template</div>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {weekDays.map(day => (
                <button
                  key={day.dateStr}
                  onClick={() => handleTemplateExpand(expandingTemplate, day)}
                  className={`p-2 rounded text-xs ${day.isToday ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/50' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
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

// Quick Add Component
const QuickAdd: React.FC<{ onAdd: Props['onAdd'] }> = ({ onAdd }) => {
  const [input, setInput] = useState('');
  const [dockSection, setDockSection] = useState<DockSection>('TODO');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    let title = input.trim();
    let urgent = false;

    // Parse ! prefix
    if (title.startsWith('!')) {
      urgent = true;
      title = title.slice(1).trim();
    }

    onAdd(title, Category.AGENCY, 'MED', { dockSection, urgent });
    setInput('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Add to dock... (!urgent)"
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
        />
        <button type="submit" className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-white text-sm">
          <Plus size={16} />
        </button>
      </div>
      <div className="flex gap-1 text-[10px]">
        {(['ROUTINE', 'TEMPLATE', 'PROJECT', 'TODO', 'LATER', 'HABIT'] as DockSection[]).map(section => (
          <button
            key={section}
            type="button"
            onClick={() => setDockSection(section)}
            className={`px-2 py-1 rounded capitalize ${dockSection === section ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
          >
            {section.toLowerCase()}
          </button>
        ))}
      </div>
    </form>
  );
};

// Dock Section Component
const DockSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  hint: string;
  tasks: Task[];
  collapsed: boolean;
  onToggle: () => void;
  onDragStart: (task: Task) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
}> = ({ title, icon, hint, tasks, collapsed, onToggle, onDragStart, onUpdate, onDelete }) => {
  if (tasks.length === 0) return null;

  return (
    <div className="space-y-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-xs font-medium text-zinc-400 px-2 py-1.5 rounded border border-zinc-800 hover:bg-zinc-900/50"
      >
        <div className="flex items-center gap-2">
          {icon}
          <ChevronRightIcon size={12} className={`transition-transform ${!collapsed ? 'rotate-90' : ''}`} />
          <span>{title}</span>
        </div>
        <span className="text-[10px] text-zinc-600">{tasks.length}</span>
      </button>
      {!collapsed && (
        <>
          <div className="ml-4 text-[10px] text-zinc-500">{hint}</div>
          <div className="space-y-1">
            {tasks.map(task => (
              <DockTaskCard
                key={task.id}
                task={task}
                onDragStart={onDragStart}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Dock Task Card
const DockTaskCard: React.FC<{
  task: Task;
  onDragStart: (task: Task) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
}> = ({ task, onDragStart, onUpdate, onDelete }) => {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(task)}
      className="group relative bg-zinc-900 border border-zinc-800 rounded px-3 py-2 cursor-move hover:border-zinc-700"
    >
      <div className="flex items-start gap-2">
        <GripVertical size={14} className="text-zinc-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-zinc-300 flex items-center gap-2">
            {task.urgent && <span className="text-red-400 text-xs">!</span>}
            {task.title}
          </div>
        </div>
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400"
        >
          <Trash2 size={14} />
        </button>
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
    <div className="group relative bg-zinc-900 border border-zinc-800 rounded px-3 py-2">
      <div className="flex items-start gap-2">
        <FileText size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-zinc-300">{task.title}</div>
          {task.templateSteps && task.templateSteps.length > 0 && (
            <div className="text-[10px] text-zinc-500 mt-1">{task.templateSteps.length} steps</div>
          )}
        </div>
        <button
          onClick={() => onExpand(task)}
          className="px-2 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded text-xs"
        >
          Apply
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400"
        >
          <Trash2 size={14} />
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
    <div className="group relative bg-zinc-900 border border-zinc-800 rounded px-3 py-2">
      <div className="flex items-center gap-2">
        <button onClick={toggleCheck} className="flex-shrink-0">
          {isChecked ? (
            <CheckCircle2 size={16} className="text-emerald-500" />
          ) : (
            <div className="w-4 h-4 rounded-full border border-zinc-600" />
          )}
        </button>
        <div className="flex-1 text-sm text-zinc-300">{task.title}</div>
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

// Day Column Component
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
}> = ({ day, tasks, dragOverHour, onDrop, onDragOver, onUpdate, onDelete, onStartSession, activeTaskId, currentTime, onStickyNoteUpdate, stickyNote }) => {
  const cairoOffset = 2;
  const cairoTime = new Date(currentTime.getTime() + (cairoOffset * 60 * 60 * 1000));
  const cairoHours = cairoTime.getUTCHours();
  const isCurrentDay = day.isToday;

  const prayers = getPrayerTimesForDate(day.date);

  const calculateRelevantHours = (): number[] => {
    const hoursSet = new Set<number>();

    tasks.forEach(task => {
      if (task.scheduledTime) {
        const hour = new Date(task.scheduledTime).getHours();
        hoursSet.add(hour);
        if (task.duration) {
          const endHour = hour + Math.ceil(task.duration / 60);
          for (let h = hour; h <= Math.min(endHour, 23); h++) {
            hoursSet.add(h);
          }
        }
      }
    });

    prayers.forEach(prayer => {
      const hour = new Date(prayer.timestamp).getHours();
      hoursSet.add(hour);
    });

    if (isCurrentDay) hoursSet.add(cairoHours);

    if (hoursSet.size > 0) {
      const hours = Array.from(hoursSet).sort((a, b) => a - b);
      const first = hours[0];
      const last = hours[hours.length - 1];
      if (first > 0) hoursSet.add(first - 1);
      if (last < 23) hoursSet.add(last + 1);
      return Array.from(hoursSet).sort((a, b) => a - b);
    }

    return [6, 9, 12, 15, 18, 21];
  };

  const relevantHours = calculateRelevantHours();

  return (
    <div className={`border-r border-border flex flex-col ${day.isToday ? 'bg-emerald-950/5' : ''}`}>
      <div className={`h-16 border-b border-border p-2 ${day.isToday ? 'bg-emerald-950/10 border-emerald-900/30' : ''}`}>
        <div className="text-[10px] text-zinc-500 uppercase tracking-wide">{day.dayName}</div>
        <div className={`text-2xl font-light ${day.isToday ? 'text-emerald-400' : 'text-zinc-300'}`}>
          {day.dayNum}
        </div>
      </div>

      <StickyNote day={day} value={stickyNote} onUpdate={onStickyNoteUpdate} />

      <div className="flex-1 overflow-y-auto">
        {relevantHours.map(hour => (
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
          />
        ))}
      </div>
    </div>
  );
};

// Sticky Note Component
const StickyNote: React.FC<{ day: WeekDay; value?: string; onUpdate: (dateKey: string, content: string) => void }> = ({ day, value, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value || '');

  const handleSave = () => {
    onUpdate(day.dateStr, text);
    setEditing(false);
  };

  if (!editing && !value) {
    return (
      <button onClick={() => setEditing(true)} className="mx-2 my-1 p-2 border border-dashed border-zinc-800 rounded text-xs text-zinc-600 hover:text-zinc-400 hover:border-zinc-700">
        <StickyNoteIcon size={12} className="mx-auto" />
      </button>
    );
  }

  return (
    <div className="mx-2 my-1 p-2 bg-amber-950/20 border border-amber-900/30 rounded">
      {editing ? (
        <div className="space-y-1">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 resize-none"
            rows={2}
            autoFocus
          />
          <div className="flex gap-1">
            <button onClick={handleSave} className="flex-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-white text-xs">
              Save
            </button>
            <button onClick={() => { setEditing(false); setText(value || ''); }} className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 text-xs">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div onClick={() => setEditing(true)} className="text-xs text-amber-400/80 cursor-pointer hover:text-amber-400">
          {value}
        </div>
      )}
    </div>
  );
};

// Hour Slot Component
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
}> = ({ hour, tasks, isDragOver, onDrop, onDragOver, onDragLeave, onUpdate, onDelete, onStartSession, activeTaskId, prayers, isCurrentHour }) => {
  return (
    <div
      onDrop={e => { e.preventDefault(); onDrop(); }}
      onDragOver={e => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      className={`min-h-[60px] border-b border-zinc-900/50 p-2 ${isDragOver ? 'bg-emerald-950/20 border-emerald-900/50' : ''} ${isCurrentHour ? 'bg-emerald-950/10' : ''}`}
    >
      <div className="flex items-start gap-2">
        <div className="text-[10px] text-zinc-600 font-mono w-12 flex-shrink-0">{formatTimeAMPM(hour, 0)}</div>
        <div className="flex-1 space-y-1">
          {prayers.map(prayer => (
            <div key={prayer.name} className="flex items-center gap-1 text-[10px] text-zinc-500">
              {getPrayerIcon(prayer.icon)}
              <span>{prayer.name}</span>
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
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Scheduled Task Component
const ScheduledTask: React.FC<{
  task: Task;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onStartSession: (id: string) => void;
  isActive: boolean;
}> = ({ task, onUpdate, onDelete, onStartSession, isActive }) => {
  const impactColors = {
    HIGH: 'border-red-900/30 bg-red-950/20 text-red-400',
    MED: 'border-amber-900/30 bg-amber-950/20 text-amber-400',
    LOW: 'border-blue-900/30 bg-blue-950/20 text-blue-400',
  };

  return (
    <div className={`group relative border rounded px-2 py-1.5 ${impactColors[task.impact]} ${isActive ? 'ring-2 ring-emerald-500/50' : ''}`}>
      <div className="flex items-start gap-2">
        <button
          onClick={() => onUpdate(task.id, { status: task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE })}
          className="mt-0.5 flex-shrink-0"
        >
          {task.status === TaskStatus.DONE ? (
            <Check size={14} className="text-emerald-500" />
          ) : (
            <div className="w-3.5 h-3.5 rounded border border-current opacity-50" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className={`text-xs flex items-center gap-1 ${task.status === TaskStatus.DONE ? 'line-through opacity-50' : ''}`}>
            {task.urgent && <span className="text-red-400">!</span>}
            {task.title}
            {task.parentProject && <span className="text-[9px] opacity-60">(session)</span>}
          </div>
          {task.duration && (
            <div className="flex items-center gap-1 text-[10px] opacity-60 mt-0.5">
              <Clock size={10} />
              <span>{task.duration}m</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          <button onClick={() => onStartSession(task.id)} className="text-emerald-400 hover:text-emerald-300">
            <Play size={12} />
          </button>
          <button onClick={() => onDelete(task.id)} className="text-red-400 hover:text-red-300">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeeklyPlannerView;
