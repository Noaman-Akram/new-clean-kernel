import React, { useState, useEffect } from 'react';
import { AppState, WorkoutSession, WorkoutExercise, WorkoutSet, ExerciseCategory } from '../types';
import { generateId } from '../utils';
import { Dumbbell, Plus, Play, Square, Timer, Trash2, Check, X, TrendingUp, Clock, Award } from 'lucide-react';

interface Props {
  state: AppState;
  onStartSession: () => void;
  onEndSession: (session: WorkoutSession) => void;
  onUpdateSession: (session: WorkoutSession) => void;
}

const GymView: React.FC<Props> = ({ state, onStartSession, onEndSession, onUpdateSession }) => {
  const activeSession = state.workoutSessions.find(s => s.isActive);

  const [restTimerActive, setRestTimerActive] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(90); // default 90 seconds
  const [restPreset, setRestPreset] = useState(90);
  const [sessionTime, setSessionTime] = useState(0);

  // Session timer
  useEffect(() => {
    if (activeSession) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - activeSession.startTime) / 1000);
        setSessionTime(elapsed);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeSession]);

  // Rest timer
  useEffect(() => {
    if (restTimerActive && restTimeLeft > 0) {
      const timer = setTimeout(() => setRestTimeLeft(restTimeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (restTimeLeft === 0 && restTimerActive) {
      setRestTimerActive(false);
      // Optional: play sound or vibrate
    }
  }, [restTimerActive, restTimeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartSession = () => {
    onStartSession();
  };

  const handleFinishWorkout = () => {
    if (!activeSession) return;

    const finishedSession: WorkoutSession = {
      ...activeSession,
      endTime: Date.now(),
      isActive: false
    };

    onEndSession(finishedSession);
  };

  const startRestTimer = (seconds: number) => {
    setRestTimeLeft(seconds);
    setRestPreset(seconds);
    setRestTimerActive(true);
  };

  if (!activeSession) {
    return <GymDashboard state={state} onStartSession={handleStartSession} />;
  }

  return (
    <div className="h-full flex flex-col bg-background animate-fade-in overflow-hidden">
      {/* HEADER */}
      <div className="border-b border-border bg-surface/20 p-6 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-950/30 border border-emerald-900/30 rounded-lg">
              <Dumbbell size={24} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Active Workout</h1>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Clock size={14} />
                  <span className="font-mono">{formatTime(sessionTime)}</span>
                </div>
                <div className="text-sm text-zinc-600">•</div>
                <div className="text-sm text-zinc-500">
                  {activeSession.exercises.length} exercises
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={handleFinishWorkout}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-bold transition-colors"
          >
            <Check size={16} />
            Finish Workout
          </button>
        </div>

        {/* Rest Timer */}
        {restTimerActive && (
          <div className="mt-4 p-4 bg-zinc-900 border border-zinc-800 rounded-lg animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Timer size={20} className="text-emerald-400" />
                <div>
                  <div className="text-xs text-zinc-500 uppercase font-mono">Rest Timer</div>
                  <div className="text-3xl font-bold font-mono text-white">{formatTime(restTimeLeft)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRestTimerActive(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-bold transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={() => {
                    setRestTimeLeft(restPreset);
                    setRestTimerActive(true);
                  }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-bold transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
            <div className="mt-3 w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-1000"
                style={{ width: `${(restTimeLeft / restPreset) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* EXERCISES */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {activeSession.exercises.map((exercise, idx) => (
            <ExerciseBlock
              key={exercise.id}
              exercise={exercise}
              exerciseNumber={idx + 1}
              session={activeSession}
              onUpdate={onUpdateSession}
              onStartRest={(seconds) => startRestTimer(seconds)}
            />
          ))}

          <AddExerciseForm
            session={activeSession}
            onUpdate={onUpdateSession}
          />
        </div>
      </div>
    </div>
  );
};

const ExerciseBlock: React.FC<{
  exercise: WorkoutExercise;
  exerciseNumber: number;
  session: WorkoutSession;
  onUpdate: (session: WorkoutSession) => void;
  onStartRest: (seconds: number) => void;
}> = ({ exercise, exerciseNumber, session, onUpdate, onStartRest }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');

  const completedSets = exercise.sets.filter(s => s.completed).length;
  const totalVolume = exercise.sets
    .filter(s => s.completed)
    .reduce((sum, s) => sum + (s.reps * (s.weight || 0)), 0);

  const handleAddSet = () => {
    if (!reps) return;

    const newSet: WorkoutSet = {
      id: generateId(),
      reps: parseInt(reps),
      weight: weight ? parseFloat(weight) : undefined,
      completed: false
    };

    const updatedExercise = {
      ...exercise,
      sets: [...exercise.sets, newSet]
    };

    const updatedSession = {
      ...session,
      exercises: session.exercises.map(e =>
        e.id === exercise.id ? updatedExercise : e
      )
    };

    onUpdate(updatedSession);
    setReps('');
    setWeight('');
    setIsAdding(false);
  };

  const handleCompleteSet = (setId: string) => {
    const updatedExercise = {
      ...exercise,
      sets: exercise.sets.map(s =>
        s.id === setId ? { ...s, completed: true } : s
      )
    };

    const updatedSession = {
      ...session,
      exercises: session.exercises.map(e =>
        e.id === exercise.id ? updatedExercise : e
      )
    };

    onUpdate(updatedSession);

    // Auto-start rest timer
    if (exercise.restTimer) {
      onStartRest(exercise.restTimer);
    }
  };

  const handleDeleteSet = (setId: string) => {
    const updatedExercise = {
      ...exercise,
      sets: exercise.sets.filter(s => s.id !== setId)
    };

    const updatedSession = {
      ...session,
      exercises: session.exercises.map(e =>
        e.id === exercise.id ? updatedExercise : e
      )
    };

    onUpdate(updatedSession);
  };

  const handleDeleteExercise = () => {
    if (!window.confirm(`Delete ${exercise.exerciseName}?`)) return;

    const updatedSession = {
      ...session,
      exercises: session.exercises.filter(e => e.id !== exercise.id)
    };

    onUpdate(updatedSession);
  };

  return (
    <div className="bg-surface/50 border border-border rounded-lg p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400">
            {exerciseNumber}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{exercise.exerciseName}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
              <span>{completedSets} sets completed</span>
              {totalVolume > 0 && (
                <>
                  <span>•</span>
                  <span>{totalVolume.toLocaleString()} lbs volume</span>
                </>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={handleDeleteExercise}
          className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Sets List */}
      <div className="space-y-2 mb-4">
        {exercise.sets.map((set, idx) => (
          <div
            key={set.id}
            className={`flex items-center justify-between p-3 rounded border transition-all ${
              set.completed
                ? 'bg-emerald-950/20 border-emerald-900/30'
                : 'bg-zinc-900/50 border-zinc-800'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-sm font-mono text-zinc-500 w-12">Set {idx + 1}</span>
              <div className="flex items-center gap-2 text-sm text-white font-mono">
                <span>{set.reps} reps</span>
                {set.weight && (
                  <>
                    <span className="text-zinc-600">×</span>
                    <span>{set.weight} lbs</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!set.completed ? (
                <button
                  onClick={() => handleCompleteSet(set.id)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors"
                >
                  <Check size={14} />
                </button>
              ) : (
                <div className="flex items-center gap-1 text-emerald-400 text-xs font-mono">
                  <Check size={14} /> Done
                </div>
              )}
              <button
                onClick={() => handleDeleteSet(set.id)}
                className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Set Form */}
      {isAdding ? (
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg space-y-3">
          <div className="flex gap-3">
            <input
              type="number"
              value={reps}
              onChange={e => setReps(e.target.value)}
              placeholder="Reps"
              className="flex-1 bg-background border border-zinc-800 rounded px-4 py-2 text-sm text-white focus:border-zinc-600 outline-none"
              autoFocus
            />
            <input
              type="number"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="Weight (lbs)"
              className="flex-1 bg-background border border-zinc-800 rounded px-4 py-2 text-sm text-white focus:border-zinc-600 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddSet}
              disabled={!reps}
              className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded transition-colors disabled:opacity-50"
            >
              Add Set
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setReps('');
                setWeight('');
              }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full py-2.5 border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-lg text-sm text-zinc-500 hover:text-zinc-400 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Add Set
        </button>
      )}
    </div>
  );
};

const AddExerciseForm: React.FC<{
  session: WorkoutSession;
  onUpdate: (session: WorkoutSession) => void;
}> = ({ session, onUpdate }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [category, setCategory] = useState<ExerciseCategory>('CHEST');
  const [restTimer, setRestTimer] = useState(90);

  const handleAdd = () => {
    if (!exerciseName.trim()) return;

    const newExercise: WorkoutExercise = {
      id: generateId(),
      exerciseName: exerciseName.trim(),
      exerciseCategory: category,
      sets: [],
      restTimer
    };

    const updatedSession = {
      ...session,
      exercises: [...session.exercises, newExercise]
    };

    onUpdate(updatedSession);
    setExerciseName('');
    setIsAdding(false);
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="w-full py-4 border-2 border-dashed border-zinc-800 hover:border-emerald-900/30 hover:bg-emerald-950/10 rounded-lg text-sm text-zinc-500 hover:text-emerald-400 transition-all flex items-center justify-center gap-2"
      >
        <Plus size={18} />
        Add Exercise
      </button>
    );
  }

  return (
    <div className="bg-surface/50 border border-border rounded-lg p-5 space-y-4">
      <div className="text-sm font-bold text-white">Add New Exercise</div>
      <input
        value={exerciseName}
        onChange={e => setExerciseName(e.target.value)}
        placeholder="Exercise name (e.g., Bench Press)"
        className="w-full bg-background border border-zinc-800 rounded px-4 py-3 text-sm text-white focus:border-zinc-600 outline-none"
        autoFocus
      />
      <div className="grid grid-cols-2 gap-3">
        <select
          value={category}
          onChange={e => setCategory(e.target.value as ExerciseCategory)}
          className="bg-background border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:border-zinc-600 outline-none"
        >
          <option value="CHEST">Chest</option>
          <option value="BACK">Back</option>
          <option value="LEGS">Legs</option>
          <option value="SHOULDERS">Shoulders</option>
          <option value="ARMS">Arms</option>
          <option value="CORE">Core</option>
          <option value="CARDIO">Cardio</option>
        </select>
        <select
          value={restTimer}
          onChange={e => setRestTimer(parseInt(e.target.value))}
          className="bg-background border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:border-zinc-600 outline-none"
        >
          <option value={60}>60s rest</option>
          <option value={90}>90s rest</option>
          <option value={120}>2min rest</option>
          <option value={180}>3min rest</option>
          <option value={300}>5min rest</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          disabled={!exerciseName.trim()}
          className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold rounded transition-colors disabled:opacity-50"
        >
          Add Exercise
        </button>
        <button
          onClick={() => {
            setIsAdding(false);
            setExerciseName('');
          }}
          className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

const GymDashboard: React.FC<{
  state: AppState;
  onStartSession: () => void;
}> = ({ state, onStartSession }) => {
  const completedSessions = state.workoutSessions.filter(s => !s.isActive);
  const recentSessions = [...completedSessions]
    .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))
    .slice(0, 10);

  const totalWorkouts = completedSessions.length;
  const thisWeekWorkouts = completedSessions.filter(s => {
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return s.startTime > weekAgo;
  }).length;

  return (
    <div className="h-full overflow-y-auto p-6 animate-fade-in bg-background">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Gym Tracker</h1>
            <p className="text-sm text-zinc-500">Track your workouts, sets, reps, and progress</p>
          </div>
          <button
            onClick={onStartSession}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-bold transition-colors shadow-lg"
          >
            <Play size={18} fill="currentColor" />
            Start Workout
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Dumbbell size={14} />} label="Total Workouts" value={totalWorkouts} />
          <StatCard icon={<TrendingUp size={14} />} label="This Week" value={thisWeekWorkouts} />
          <StatCard icon={<Clock size={14} />} label="Avg Duration" value={completedSessions.length > 0 ? `${Math.round(completedSessions.reduce((sum, s) => sum + ((s.endTime || s.startTime) - s.startTime), 0) / completedSessions.length / 1000 / 60)}m` : '0m'} />
          <StatCard icon={<Award size={14} />} label="Streak" value="0d" />
        </div>

        {/* Recent Workouts */}
        <div>
          <div className="text-sm font-mono text-zinc-600 uppercase mb-4">Recent Workouts</div>
          {recentSessions.length === 0 ? (
            <div className="py-12 text-center text-zinc-600 text-sm">
              No workouts yet. Start your first session!
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions.map(session => (
                <WorkoutHistoryCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
}> = ({ icon, label, value }) => (
  <div className="bg-surface border border-border rounded-lg p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="text-zinc-600">{icon}</div>
      <div className="text-xs font-mono text-zinc-600 uppercase">{label}</div>
    </div>
    <div className="text-2xl font-bold text-white">{value}</div>
  </div>
);

const WorkoutHistoryCard: React.FC<{ session: WorkoutSession }> = ({ session }) => {
  const duration = session.endTime
    ? Math.round((session.endTime - session.startTime) / 1000 / 60)
    : 0;

  const totalSets = session.exercises.reduce((sum, e) => sum + e.sets.filter(s => s.completed).length, 0);
  const totalVolume = session.exercises.reduce(
    (sum, e) => sum + e.sets.filter(s => s.completed).reduce((s, set) => s + (set.reps * (set.weight || 0)), 0),
    0
  );

  return (
    <div className="bg-surface/50 border border-border hover:border-zinc-700 rounded-lg p-4 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-sm font-semibold text-white">
            {session.programName || 'General Workout'}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {new Date(session.startTime).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>{duration}min</span>
          <span>•</span>
          <span>{session.exercises.length} exercises</span>
          <span>•</span>
          <span>{totalSets} sets</span>
        </div>
      </div>
      {totalVolume > 0 && (
        <div className="text-xs text-zinc-600">
          Total volume: <span className="text-emerald-400 font-mono">{totalVolume.toLocaleString()} lbs</span>
        </div>
      )}
    </div>
  );
};

export default GymView;
