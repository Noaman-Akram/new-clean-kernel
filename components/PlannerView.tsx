
import React, { useState } from 'react';
import { AppState, Task, TaskStatus, Category, Severity } from '../types';
import { 
    ArrowRight,
    Play,
    Pause,
    Check,
    Inbox,
    Calendar,
    Target,
    AlertCircle,
    MoreHorizontal,
    ChevronRight,
    ChevronLeft,
    CalendarDays,
    Flag
} from 'lucide-react';

interface Props {
  state: AppState;
  onAdd: (title: string, category: Category, impact: 'LOW' | 'MED' | 'HIGH') => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onStartSession: (id: string) => void;
  activeTaskId: string | null;
}

// --- UTILS ---

const getNextFriday = () => {
    const d = new Date();
    d.setDate(d.getDate() + (5 + 7 - d.getDay()) % 7);
    d.setHours(23, 59, 0, 0);
    return d.getTime();
};

const getTodayEnd = () => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
}

// --- MAIN COMPONENT ---

const PlannerView: React.FC<Props> = ({ state, onAdd, onUpdate, onStartSession, activeTaskId }) => {
  const [input, setInput] = useState('');

  // --- LOGIC ---

  const tasks = state.tasks.filter(t => t.status !== TaskStatus.DONE);

  // 1. Objectives (Goals): High Impact + Future Deadline (> 7 days) OR Explicitly marked
  const objectives = tasks.filter(t => t.impact === 'HIGH' && t.deadline && t.deadline > Date.now() + 86400000 * 7);

  // 2. Buckets
  const now = Date.now();
  const todayEnd = getTodayEnd();
  const nextWeekEnd = now + 86400000 * 7;

  const inboxTasks = tasks.filter(t => !t.deadline && !objectives.includes(t));
  
  const weekTasks = tasks.filter(t => {
      if (objectives.includes(t)) return false;
      if (!t.deadline) return false;
      return t.deadline > todayEnd && t.deadline <= nextWeekEnd;
  });

  const todayTasks = tasks.filter(t => {
      if (objectives.includes(t)) return false;
      if (!t.deadline) return false;
      return t.deadline <= todayEnd;
  });

  // --- HANDLERS ---

  const handleAdd = (e: React.FormEvent) => {
      e.preventDefault();
      if(!input.trim()) return;
      const isHigh = input.includes('!');
      onAdd(input.replace('!', '').trim(), Category.AGENCY, isHigh ? 'HIGH' : 'MED');
      setInput('');
  };

  const handleMove = (id: string, dest: 'INBOX' | 'WEEK' | 'TODAY') => {
      let updates: Partial<Task> = {};
      if (dest === 'INBOX') updates = { deadline: undefined };
      if (dest === 'WEEK') updates = { deadline: getNextFriday() };
      if (dest === 'TODAY') updates = { deadline: Date.now() }; // Sets to current time, effectively due
      onUpdate(id, updates);
  };

  return (
    <div className="h-full flex flex-col bg-background animate-fade-in overflow-hidden">
        
        {/* --- TOP BAR: OBJECTIVES --- */}
        <div className="h-32 border-b border-border bg-surface/30 shrink-0 flex flex-col px-6 py-4">
             <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">
                 <Target size={12} className="text-zinc-400"/> Active Objectives
             </div>
             <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                 {objectives.length === 0 && (
                     <div className="flex items-center justify-center w-64 border border-dashed border-zinc-800 rounded text-[10px] text-zinc-600 font-mono h-16">
                         No Long-term Objectives Set
                     </div>
                 )}
                 {objectives.map(t => (
                     <ObjectiveCard key={t.id} task={t} onUpdate={onUpdate} />
                 ))}
             </div>
        </div>

        {/* --- MAIN GRID --- */}
        <div className="flex-1 p-6 overflow-hidden">
            <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1800px] mx-auto">
                
                {/* COL 1: INBOX */}
                <div className="flex flex-col h-full min-h-0">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono font-bold uppercase tracking-wider">
                            <Inbox size={14}/> Backlog / Inbox
                        </div>
                        <span className="text-[10px] font-mono text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded">{inboxTasks.length}</span>
                    </div>
                    
                    {/* QUICK INPUT */}
                    <form onSubmit={handleAdd} className="mb-4 relative">
                         <input 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="+ Add to Inbox..."
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded p-2 pl-3 text-sm text-zinc-200 placeholder:text-zinc-700 focus:border-zinc-600 outline-none font-mono"
                         />
                    </form>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                        {inboxTasks.map(t => (
                            <TaskCard key={t.id} task={t} isActive={activeTaskId === t.id} onUpdate={onUpdate}>
                                <div className="flex gap-1">
                                    <MoveBtn icon={<ChevronRight size={14}/>} onClick={() => handleMove(t.id, 'WEEK')} tooltip="Schedule This Week" />
                                </div>
                            </TaskCard>
                        ))}
                    </div>
                </div>

                {/* COL 2: THIS WEEK */}
                <div className="flex flex-col h-full min-h-0 border-l border-r border-border/50 px-4 lg:px-6">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono font-bold uppercase tracking-wider">
                            <CalendarDays size={14}/> This Week
                        </div>
                        <span className="text-[10px] font-mono text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded">{weekTasks.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                        {weekTasks.map(t => (
                            <TaskCard key={t.id} task={t} isActive={activeTaskId === t.id} onUpdate={onUpdate}>
                                <div className="flex gap-1">
                                    <MoveBtn icon={<ChevronLeft size={14}/>} onClick={() => handleMove(t.id, 'INBOX')} tooltip="Backlog" />
                                    <MoveBtn icon={<ChevronRight size={14}/>} onClick={() => handleMove(t.id, 'TODAY')} tooltip="Do Today" />
                                </div>
                            </TaskCard>
                        ))}
                    </div>
                </div>

                {/* COL 3: TODAY */}
                <div className="flex flex-col h-full min-h-0">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <div className="flex items-center gap-2 text-emerald-500 text-xs font-mono font-bold uppercase tracking-wider">
                            <AlertCircle size={14}/> Execution (Today)
                        </div>
                        <span className="text-[10px] font-mono text-emerald-500 bg-emerald-950/30 border border-emerald-900/50 px-2 py-0.5 rounded">{todayTasks.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                         {todayTasks.map(t => (
                            <TaskCard key={t.id} task={t} isActive={activeTaskId === t.id} onUpdate={onUpdate} isToday>
                                <div className="flex gap-1 items-center">
                                    <MoveBtn icon={<ChevronLeft size={14}/>} onClick={() => handleMove(t.id, 'WEEK')} tooltip="Defer" />
                                    
                                    {/* PLAY BUTTON */}
                                    <button 
                                        onClick={() => activeTaskId === t.id ? null : onStartSession(t.id)}
                                        className={`w-6 h-6 flex items-center justify-center rounded border transition-all mx-2
                                            ${activeTaskId === t.id 
                                                ? 'bg-emerald-500 border-emerald-400 text-black' 
                                                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-emerald-500 hover:border-emerald-500'
                                            }`}
                                    >
                                        {activeTaskId === t.id ? <Pause size={10} fill="currentColor"/> : <Play size={10} fill="currentColor"/>}
                                    </button>

                                    <button 
                                        onClick={() => onUpdate(t.id, { status: TaskStatus.DONE })}
                                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
                                        title="Complete"
                                    >
                                        <Check size={14} />
                                    </button>
                                </div>
                            </TaskCard>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
};

// --- COMPONENTS ---

const ObjectiveCard: React.FC<{ task: Task, onUpdate: (id: string, updates: Partial<Task>) => void }> = ({ task, onUpdate }) => {
    const daysLeft = Math.ceil(((task.deadline || 0) - Date.now()) / 86400000);
    
    return (
        <div className="min-w-[280px] p-3 rounded border border-zinc-800 bg-surface hover:border-zinc-700 transition-colors flex flex-col justify-between group">
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-medium text-zinc-200 line-clamp-2">{task.title}</span>
                <Flag size={12} className="text-amber-500 shrink-0 ml-2" fill="currentColor"/>
            </div>
            <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono ${daysLeft < 3 ? 'text-red-400' : 'text-zinc-500'}`}>
                    {daysLeft} Days Left
                </span>
                <button 
                    onClick={() => onUpdate(task.id, { status: TaskStatus.DONE })}
                    className="opacity-0 group-hover:opacity-100 text-[10px] bg-zinc-900 px-2 py-1 rounded text-zinc-400 hover:text-white"
                >
                    Complete
                </button>
            </div>
        </div>
    )
}

const TaskCard = ({ task, isActive, onUpdate, children, isToday }: any) => {
    const isOverdue = task.deadline && task.deadline < new Date().setHours(0,0,0,0);
    
    // Severity Colors
    const severityColor = {
        'HIGH': 'bg-amber-500',
        'MED': 'bg-blue-500',
        'LOW': 'bg-zinc-600'
    };

    // Date Display
    const dateStr = task.deadline 
        ? new Date(task.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        : 'No Date';

    return (
        <div className={`
            group relative flex flex-col gap-2 p-3 rounded border transition-all duration-200
            ${isActive 
                ? 'bg-zinc-900 border-emerald-500/40 shadow-glow z-10' 
                : 'bg-surface border-zinc-800 hover:border-zinc-700'
            }
            ${isOverdue && !isActive ? 'border-red-900/30 bg-red-950/5' : ''}
        `}>
            {/* Header: Severity + Title */}
            <div className="flex justify-between items-start gap-2">
                <div className="flex items-start gap-2">
                    <div className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${severityColor[task.impact as Severity] || 'bg-zinc-600'}`} title={task.impact} />
                    <input 
                        className={`bg-transparent w-full outline-none text-sm font-medium leading-snug truncate ${isActive ? 'text-emerald-100' : isOverdue ? 'text-red-200' : 'text-zinc-300 group-hover:text-zinc-100'}`}
                        value={task.title}
                        onChange={(e) => onUpdate(task.id, { title: e.target.value })}
                    />
                </div>
            </div>

            {/* Footer: Date + Controls */}
            <div className="flex items-center justify-between mt-1">
                 {/* Date Picker Trigger */}
                 <div className="relative group/date">
                    <div className={`flex items-center gap-1.5 text-[10px] font-mono cursor-pointer ${isOverdue ? 'text-red-400' : 'text-zinc-600 hover:text-zinc-400'}`}>
                        <Calendar size={10} />
                        <span>{isOverdue ? 'OVERDUE' : dateStr}</span>
                    </div>
                    {/* Native Date Input Overlay */}
                    <input 
                        type="date" 
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                            if(e.target.valueAsNumber) {
                                onUpdate(task.id, { deadline: e.target.valueAsNumber });
                            }
                        }}
                    />
                 </div>

                 {/* Severity Toggle (Clicking dot cycles priority) */}
                 <button 
                    onClick={() => {
                        const next = task.impact === 'HIGH' ? 'LOW' : task.impact === 'LOW' ? 'MED' : 'HIGH';
                        onUpdate(task.id, { impact: next });
                    }}
                    className="text-[9px] font-mono text-zinc-600 uppercase hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100"
                 >
                    {task.impact}
                 </button>

                 <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                    {children}
                 </div>
            </div>
        </div>
    )
}

const MoveBtn = ({ icon, onClick, tooltip }: any) => (
    <button 
        onClick={onClick}
        title={tooltip}
        className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-700 transition-colors text-zinc-500 hover:text-zinc-200"
    >
        {icon}
    </button>
);

export default PlannerView;
