import React, { useState, useEffect } from 'react';
import { AppState, TaskStatus, Distraction } from '../types';
import { Play, Pause, CheckCircle2, X, Zap, Coffee, Eye, Droplet, Activity } from 'lucide-react';
import { generateId } from '../utils';

interface Props {
  state: AppState;
  onUpdate: (id: string, updates: any) => void;
  onDistractionAdd: (distraction: Distraction) => void;
}

const FocusView: React.FC<Props> = ({ state, onUpdate, onDistractionAdd }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [distractionInput, setDistractionInput] = useState('');
  const [showRecommendations, setShowRecommendations] = useState(false);

  const activeTask = state.tasks.find(t => t.status === TaskStatus.TODO || t.status === TaskStatus.IN_PROGRESS);

  // Get distractions for current task
  const taskDistractions = activeTask
    ? state.distractions?.filter(d => d.taskId === activeTask.id) || []
    : [];

  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = setInterval(() => setElapsed(p => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Auto-show recommendations every 25 minutes (Pomodoro)
  useEffect(() => {
    if (elapsed > 0 && elapsed % (25 * 60) === 0 && isRunning) {
      setShowRecommendations(true);
    }
  }, [elapsed, isRunning]);

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleDistractionCapture = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && distractionInput.trim()) {
      const distraction: Distraction = {
        id: generateId(),
        content: distractionInput.trim(),
        timestamp: Date.now(),
        taskId: activeTask?.id,
        resolved: false
      };
      onDistractionAdd(distraction);
      setDistractionInput('');
    }
  };

  const getRecommendation = () => {
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor(elapsed / 60);

    if (minutes >= 50) return { icon: <Coffee size={14} />, text: 'Take a 10-minute break', color: 'text-amber-400' };
    if (minutes >= 25) return { icon: <Droplet size={14} />, text: 'Hydrate - drink water', color: 'text-blue-400' };
    if (minutes >= 15) return { icon: <Eye size={14} />, text: 'Rest your eyes (20-20-20 rule)', color: 'text-purple-400' };
    if (minutes >= 10) return { icon: <Activity size={14} />, text: 'Check your posture', color: 'text-emerald-400' };
    return null;
  };

  const recommendation = getRecommendation();

  if (!activeTask) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background text-zinc-500">
        <div className="mb-4">
          <Zap size={48} className="text-zinc-800" />
        </div>
        <div className="text-sm font-mono uppercase tracking-wider">No Active Task</div>
        <div className="text-xs text-zinc-600 mt-2">Select a task to begin focused work</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background relative">

      {/* Minimal Header */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
        <div className="px-3 py-1.5 bg-surface border border-border rounded-sm">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Focus Mode</span>
        </div>
      </div>

      {/* Main Content - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">

        {/* Task Title */}
        <h1 className="text-2xl md:text-4xl font-medium text-zinc-100 mb-12 md:mb-16 max-w-2xl text-center leading-relaxed">
          {activeTask.title}
        </h1>

        {/* Timer - Large and Minimal */}
        <div className="text-[100px] md:text-[140px] lg:text-[180px] leading-none font-mono font-light text-zinc-100 tracking-tighter tabular-nums select-none mb-12 md:mb-16">
          {formatTime(elapsed)}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`w-14 h-14 md:w-16 md:h-16 rounded-sm flex items-center justify-center transition-all ${
              isRunning
                ? 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800'
                : 'bg-emerald-500 text-black hover:bg-emerald-400'
            }`}
          >
            {isRunning ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
          </button>

          <button
            onClick={() => {
              onUpdate(activeTask.id, { status: TaskStatus.DONE });
              setElapsed(0);
              setIsRunning(false);
            }}
            className="group flex items-center gap-2 px-6 py-3 rounded-sm border border-border hover:bg-surface transition-all"
          >
            <CheckCircle2 size={16} className="text-zinc-600 group-hover:text-emerald-400 transition-colors" />
            <span className="text-xs font-mono text-zinc-500 group-hover:text-zinc-300 uppercase tracking-wider">Complete</span>
          </button>
        </div>

        {/* Session Stats - Minimal */}
        <div className="flex items-center gap-6 text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <Zap size={12} className="text-zinc-700" />
            <span>{taskDistractions.length} Distractions</span>
          </div>
          <div className="w-px h-3 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-zinc-700" />
            <span>Focus {Math.floor(elapsed / 60)}m</span>
          </div>
        </div>

        {/* Recommendations */}
        {recommendation && isRunning && (
          <div className="mt-8 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-sm flex items-center gap-2 animate-fade-in">
            <div className={recommendation.color}>{recommendation.icon}</div>
            <span className="text-xs font-mono text-zinc-400">{recommendation.text}</span>
          </div>
        )}
      </div>

      {/* Quick Distraction Capture - Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Zap size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700" />
            <input
              type="text"
              value={distractionInput}
              onChange={(e) => setDistractionInput(e.target.value)}
              onKeyDown={handleDistractionCapture}
              placeholder="Quick capture distractions... (Press Enter)"
              className="w-full bg-surface border border-border rounded-sm pl-10 pr-4 py-3 text-sm text-zinc-300 placeholder:text-zinc-700 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all font-mono"
            />
          </div>

          {/* Recent Distractions */}
          {taskDistractions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {taskDistractions.slice(-5).reverse().map(d => (
                <div key={d.id} className="flex items-center gap-2 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-sm text-[10px] text-zinc-500 font-mono">
                  <span className="truncate max-w-[150px]">{d.content}</span>
                  <span className="text-zinc-700">•</span>
                  <span className="text-zinc-700 shrink-0">
                    {new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recommendations Panel (Optional Overlay) */}
      {showRecommendations && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-border rounded-sm p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-mono text-zinc-300 uppercase tracking-wider">Break Time</h3>
              <button onClick={() => setShowRecommendations(false)} className="text-zinc-500 hover:text-zinc-300">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <RecommendationItem icon={<Coffee size={16} />} text="Take a 5-10 minute break" color="text-amber-400" />
              <RecommendationItem icon={<Droplet size={16} />} text="Drink water - stay hydrated" color="text-blue-400" />
              <RecommendationItem icon={<Eye size={16} />} text="Look away from screen (20-20-20)" color="text-purple-400" />
              <RecommendationItem icon={<Activity size={16} />} text="Stretch and move around" color="text-emerald-400" />
            </div>

            <button
              onClick={() => {
                setShowRecommendations(false);
                setIsRunning(false);
              }}
              className="w-full py-2.5 bg-emerald-500 text-black text-xs font-bold rounded-sm hover:bg-emerald-400 transition-colors uppercase tracking-wider"
            >
              Take Break
            </button>
            <button
              onClick={() => setShowRecommendations(false)}
              className="w-full mt-2 py-2.5 bg-zinc-900 text-zinc-400 text-xs font-medium rounded-sm hover:bg-zinc-800 transition-colors uppercase tracking-wider"
            >
              Continue Focus
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const RecommendationItem = ({ icon, text, color }: { icon: React.ReactNode, text: string, color: string }) => (
  <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-sm">
    <div className={color}>{icon}</div>
    <span className="text-xs text-zinc-400 font-mono">{text}</span>
  </div>
);

export default FocusView;
