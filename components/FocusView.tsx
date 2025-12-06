
import React, { useState, useEffect } from 'react';
import { AppState, TaskStatus } from '../types';
import { Play, Pause, CheckSquare } from 'lucide-react';

interface Props {
  state: AppState;
  onUpdate: (id: string, updates: any) => void;
}

const FocusView: React.FC<Props> = ({ state, onUpdate }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const activeTask = state.tasks.find(t => t.status === TaskStatus.TODO || t.status === TaskStatus.IN_PROGRESS);

  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = setInterval(() => setElapsed(p => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!activeTask) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background text-zinc-600">
         <div className="text-sm font-mono mb-2">IDLE STATE</div>
         <div className="text-xs opacity-50">Select a directive from the grid to begin.</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center bg-background animate-fade-in">
        
        <div className="flex flex-col items-center max-w-2xl w-full text-center">
            
            <div className="mb-8">
                <span className="px-2 py-1 rounded border border-zinc-800 text-[10px] font-mono text-zinc-500 uppercase tracking-widest bg-surface">
                    Focus Protocol
                </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-medium text-white mb-12 max-w-lg leading-relaxed">
                {activeTask.title}
            </h1>

            <div className="text-[120px] md:text-[160px] leading-none font-mono font-light text-zinc-100 tracking-tighter tabular-nums select-none mb-16">
                {formatTime(elapsed)}
            </div>

            <div className="flex items-center gap-6">
                 <button 
                    onClick={() => setIsRunning(!isRunning)}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${isRunning ? 'bg-zinc-900 text-zinc-400 border border-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`}
                 >
                     {isRunning ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                 </button>

                 <button 
                    onClick={() => {
                        onUpdate(activeTask.id, { status: TaskStatus.DONE });
                        setElapsed(0);
                        setIsRunning(false);
                    }}
                    className="group flex items-center gap-3 px-6 py-4 rounded-full border border-border hover:bg-surface transition-all"
                 >
                     <CheckSquare size={18} className="text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                     <span className="text-xs font-mono text-zinc-500 group-hover:text-zinc-300 uppercase tracking-wider">Complete</span>
                 </button>
            </div>

        </div>
    </div>
  );
};

export default FocusView;
