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

const WeeklyPlannerView: React.FC<Props> = ({ state, onAdd, onUpdate, onStartSession, activeTaskId, onDelete, onStickyNoteUpdate, onDayMetaUpdate }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [contextMenu, setContextMenu] = useState<{ day: WeekDay; hour: number; x: number; y: number } | null>(null);
  const [expandingTemplate, setExpandingTemplate] = useState<Task | null>(null);
  const [showPrayers, setShowPrayers] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [quickAdd, setQuickAdd] = useState<{ day: WeekDay; hour: number; x: number; y: number; title: string } | null>(null);
  const [dayPanel, setDayPanel] = useState<{ day: WeekDay; type: DayPanelType; x: number; y: number } | null>(null);
  const [checklistDraft, setChecklistDraft] = useState('');

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

  const handleOpenContextMenu = (day: WeekDay, hour: number, e: React.MouseEvent) => {
    setQuickAdd(null);
    setContextMenu({ day, hour, x: e.clientX, y: e.clientY });
  };

  const handleOpenQuickAdd = (day: WeekDay, hour: number, e: React.MouseEvent) => {
    setContextMenu(null);
    setQuickAdd({ day, hour, x: e.clientX, y: e.clientY, title: '' });
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

  const handleQuickAddSubmit = () => {
    if (!quickAdd || !quickAdd.title.trim()) return;
    const scheduledDate = new Date(quickAdd.day.date);
    scheduledDate.setHours(quickAdd.hour, 0, 0, 0);
    onAdd(quickAdd.title.trim(), Category.AGENCY, 'MED', { scheduledTime: scheduledDate.getTime() });
    setQuickAdd(null);
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
    } else if (type === 'template') {
      const template = dockTasks.TEMPLATE[0];
      if (template) {
        onAdd(template.title, template.category, template.impact, {
          scheduledTime: scheduledDate.getTime(),
          duration: template.duration || 30,
        });
      }
    } else if (type === 'habit') {
      const habit = dockTasks.HABIT[0];
      if (habit) {
        onAdd(habit.title, habit.category, habit.impact, {
          scheduledTime: scheduledDate.getTime(),
          duration: habit.duration || 15,
          urgent: habit.urgent,
        });
      }
    }

    setContextMenu(null);
  };

  const handleQuickAddShortcut = (type: 'routine' | 'project' | 'template' | 'habit') => {
    if (!quickAdd) return;

    const scheduledDate = new Date(quickAdd.day.date);
    scheduledDate.setHours(quickAdd.hour, 0, 0, 0);

    if (type === 'routine') {
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
    } else if (type === 'template') {
      const template = dockTasks.TEMPLATE[0];
      if (template) {
        onAdd(template.title, template.category, template.impact, {
          scheduledTime: scheduledDate.getTime(),
          duration: template.duration || 30,
        });
      }
    } else if (type === 'habit') {
      const habit = dockTasks.HABIT[0];
      if (habit) {
        onAdd(habit.title, habit.category, habit.impact, {
          scheduledTime: scheduledDate.getTime(),
          duration: habit.duration || 15,
          urgent: habit.urgent,
        });
      }
    }

    setQuickAdd(null);
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
              <span className="text-xs font-medium text-zinc-400">Dock</span>
              <button onClick={() => setDockCollapsed(true)} className="text-zinc-500 hover:text-zinc-300">
                <ChevronLeft size={16} />
              </button>
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
                        onClick={() => setSelectedTask(task)}
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
              className={`px-2 py-1 text-[10px] border rounded ${
                showPrayers ? 'border-emerald-700 text-emerald-300 bg-emerald-950/30' : 'border-zinc-800 text-zinc-500 bg-zinc-900'
              }`}
            >
              Prayers
            </button>
            <button
              onClick={() => setShowCompleted(prev => !prev)}
              className={`px-2 py-1 text-[10px] border rounded ${
                showCompleted ? 'border-zinc-700 text-zinc-300 bg-zinc-900/70' : 'border-zinc-800 text-zinc-500 bg-zinc-900'
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
                    onSelect={setSelectedTask}
                    showPrayers={showPrayers}
                    onContextMenu={(hour, e) => {
                      e.preventDefault();
                      handleOpenContextMenu(day, hour, e);
                    }}
                    onClickHour={(hour, e) => {
                      handleOpenQuickAdd(day, hour, e);
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
          {dockTasks.TEMPLATE.length > 0 && (
            <button onClick={() => handleContextMenuAdd('template')} className="w-full px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-900 flex items-center gap-2">
              <FileText size={10} className="text-blue-400" />
              Use template
            </button>
          )}
          {dockTasks.HABIT.length > 0 && (
            <button onClick={() => handleContextMenuAdd('habit')} className="w-full px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-900 flex items-center gap-2">
              <CheckCircle2 size={10} className="text-emerald-400" />
              Track habit
            </button>
          )}
        </div>
      )}

      {/* Quick Add */}
      {quickAdd && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setQuickAdd(null)} />
          <div
            className="fixed z-50 bg-surface border border-border rounded-lg shadow-2xl p-3 w-60"
            style={{ left: quickAdd.x, top: quickAdd.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[9px] text-zinc-600 uppercase mb-2">
              {quickAdd.day.dayName} {formatTimeAMPM(quickAdd.hour, 0)}
            </div>
            <input
              value={quickAdd.title}
              onChange={e => setQuickAdd(prev => prev ? ({ ...prev, title: e.target.value }) : prev)}
              onKeyDown={e => { if (e.key === 'Enter') handleQuickAddSubmit(); if (e.key === 'Escape') setQuickAdd(null); }}
              placeholder="Quick task..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              autoFocus
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleQuickAddSubmit}
                className="flex-1 px-2 py-1 text-xs bg-emerald-950/40 text-emerald-300 border border-emerald-900/40 rounded hover:bg-emerald-950/60"
              >
                Add
              </button>
              <button
                onClick={() => setQuickAdd(null)}
                className="px-2 py-1 text-xs bg-zinc-900 text-zinc-400 border border-zinc-800 rounded hover:bg-zinc-800"
              >
                Close
              </button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {dockTasks.ROUTINE.length > 0 && (
                <button
                  onClick={() => handleQuickAddShortcut('routine')}
                  className="px-2 py-0.5 text-[10px] text-orange-300 border border-orange-900/50 rounded hover:bg-orange-950/30"
                >
                  Routine
                </button>
              )}
              {dockTasks.PROJECT.length > 0 && (
                <button
                  onClick={() => handleQuickAddShortcut('project')}
                  className="px-2 py-0.5 text-[10px] text-purple-300 border border-purple-900/50 rounded hover:bg-purple-950/30"
                >
                  Project
                </button>
              )}
              {dockTasks.TEMPLATE.length > 0 && (
                <button
                  onClick={() => handleQuickAddShortcut('template')}
                  className="px-2 py-0.5 text-[10px] text-blue-300 border border-blue-900/50 rounded hover:bg-blue-950/30"
                >
                  Template
                </button>
              )}
              {dockTasks.HABIT.length > 0 && (
                <button
                  onClick={() => handleQuickAddShortcut('habit')}
                  className="px-2 py-0.5 text-[10px] text-emerald-300 border border-emerald-900/50 rounded hover:bg-emerald-950/30"
                >
                  Habit
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Day Panel */}
      {dayPanel && (
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
                      className={`px-2 py-0.5 text-[10px] border rounded ${
                        getDayMeta(dayPanel.day.dateStr).focus === option
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

  return (
    <div className={`border-r border-border flex flex-col ${day.isToday ? 'bg-emerald-950/5' : ''}`}>
      <div className={`border-b border-border px-2 py-1 ${day.isToday ? 'bg-emerald-950/10' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[7px] text-zinc-600 uppercase">{day.dayName}</div>
            <div className={`text-sm font-light ${day.isToday ? 'text-emerald-400' : 'text-zinc-400'}`}>
              {day.dayNum}
            </div>
          </div>
          {dayMeta.focus && (
            <span className="text-[9px] text-emerald-300 border border-emerald-900/40 rounded px-1 py-0.5">
              {dayMeta.focus}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          <button
            onClick={(e) => onOpenDayPanel('notes', e)}
            className="px-1.5 py-0.5 text-[9px] text-zinc-400 border border-zinc-800 rounded hover:bg-zinc-900"
          >
            Notes
          </button>
          <button
            onClick={(e) => onOpenDayPanel('habits', e)}
            className="px-1.5 py-0.5 text-[9px] text-emerald-300 border border-emerald-900/40 rounded hover:bg-emerald-950/20"
          >
            Habits
          </button>
          <button
            onClick={(e) => onOpenDayPanel('checklist', e)}
            className="px-1.5 py-0.5 text-[9px] text-blue-300 border border-blue-900/40 rounded hover:bg-blue-950/20"
          >
            Checklists
          </button>
          <button
            onClick={(e) => onOpenDayPanel('focus', e)}
            className="px-1.5 py-0.5 text-[9px] text-purple-300 border border-purple-900/40 rounded hover:bg-purple-950/20"
          >
            Focus
          </button>
          <button
            onClick={(e) => onOpenDayPanel('actions', e)}
            className="px-1.5 py-0.5 text-[9px] text-zinc-500 border border-zinc-800 rounded hover:bg-zinc-900"
          >
            Actions
          </button>
        </div>
        {stickyNote && (
          <div className="mt-1 text-[9px] text-zinc-600 truncate">
            {stickyNote}
          </div>
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
              onDelete={onDelete}
              onStartSession={onStartSession}
              activeTaskId={activeTaskId}
              isCurrentHour={isCurrentDay && cairoHours === hour}
              onSelect={onSelect}
              onContextMenu={(e) => onContextMenu(hour, e)}
              onClickHour={(e) => onClickHour(hour, e)}
              getTaskTone={getTaskTone}
              onUnschedule={onUnschedule}
              onDelete={onDelete}
              onSetStatus={onSetStatus}
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
  const maxVisibleTasks = prayers.length > 0 ? 1 : 2;
  const visibleTasks = tasks.slice(0, maxVisibleTasks);
  const hiddenCount = tasks.length - visibleTasks.length;

  return (
    <div
      onDrop={e => { e.preventDefault(); onDrop(); }}
      onDragOver={e => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onContextMenu={onContextMenu}
      onClick={onClickHour}
      className={`h-14 border-b border-zinc-900/30 px-1.5 py-1 transition-colors ${isDragOver ? 'bg-emerald-950/20' : ''} ${isCurrentHour ? 'bg-emerald-950/10' : ''} hover:bg-zinc-900/20 overflow-hidden cursor-pointer`}
    >
      <div className="space-y-px">
        {prayers.map(prayer => (
          <div key={prayer.name} className="flex items-center gap-1 text-[10px] text-zinc-500">
            {getPrayerIcon(prayer.icon)}
            <span>{prayer.name}</span>
            <span className="text-zinc-600">{prayer.time}</span>
          </div>
        ))}

        {visibleTasks.map((task, idx) => (
          <div
            key={task.id}
            onClick={(e) => { e.stopPropagation(); onSelect(task); }}
            className={`group relative flex items-center gap-1 px-1 py-px pr-14 rounded border border-l-2 cursor-pointer hover:bg-zinc-900/60 ${getTaskTone(task)} ${
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
            <div className={`flex-1 text-[12px] truncate ${
              task.impact === 'HIGH' ? 'text-red-400' : task.impact === 'LOW' ? 'text-blue-400' : 'text-zinc-300'
            }`}>
              {task.urgent && <span className="text-red-500 mr-1">!</span>}
              {task.title}
            </div>
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100">
              <button
                onClick={(e) => { e.stopPropagation(); onSelect(task); }}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <Pencil size={10} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onUnschedule(task.id); }}
                className="text-zinc-600 hover:text-zinc-300"
                title="Move to dock"
              >
                <ArrowLeft size={10} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onSetStatus(task.id, TaskStatus.BACKLOG); onUnschedule(task.id); }}
                className="text-zinc-600 hover:text-amber-300"
                title="Backlog"
              >
                <Archive size={10} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                className="text-zinc-600 hover:text-red-400"
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        ))}
        {hiddenCount > 0 && (
          <div className="text-[10px] text-zinc-500 pl-2">
            +{hiddenCount} more
          </div>
        )}
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
  const [status, setStatus] = useState<TaskStatus>(task.status || TaskStatus.TODO);

  const handleSave = () => {
    onUpdate(task.id, { title, dockSection, urgent, duration, status });
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-80 bg-zinc-950 border-l border-zinc-800 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <span className="text-sm text-zinc-400">Edit Task</span>
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
            <label className="text-[9px] text-zinc-600 uppercase mb-1 block">Status</label>
            <select
              value={status}
              onChange={e => { setStatus(e.target.value as TaskStatus); handleSave(); }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700"
            >
              <option value={TaskStatus.BACKLOG}>Backlog</option>
              <option value={TaskStatus.TODO}>To Do</option>
              <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
              <option value={TaskStatus.DONE}>Done</option>
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
