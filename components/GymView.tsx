import React, { useState, useEffect, useRef } from 'react';
import { AppState, WorkoutSession, WorkoutTemplate, TemplateExercise, WorkoutExercise, WorkoutSet, Exercise, ExerciseCategory } from '../types';
import { generateId } from '../utils';
import {
  Dumbbell, Plus, Play, Timer, Trash2, Check, X, Clock, TrendingUp, Search,
  ChevronUp, ChevronDown, Zap, History as HistoryIcon, List, Minus, Copy,
  Edit3, Award, Flame, Pause, SkipForward, Repeat, Info, AlertCircle
} from 'lucide-react';

interface Props {
  state: AppState;
  onStartSession: (template?: WorkoutTemplate) => void;
  onEndSession: (session: WorkoutSession) => void;
  onUpdateSession: (session: WorkoutSession) => void;
  onCreateTemplate: (template: WorkoutTemplate) => void;
  onUpdateTemplate: (template: WorkoutTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onAddExercise: (exercise: Exercise) => void;
}

// Calculate plates needed for a barbell (20kg bar)
const calculatePlates = (totalWeight: number): { plate: number; count: number }[] => {
  const barWeight = 20;
  const weightPerSide = (totalWeight - barWeight) / 2;

  if (weightPerSide <= 0) return [];

  const availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5];
  const plates: { plate: number; count: number }[] = [];
  let remaining = weightPerSide;

  for (const plate of availablePlates) {
    const count = Math.floor(remaining / plate);
    if (count > 0) {
      plates.push({ plate, count });
      remaining -= plate * count;
    }
  }

  return plates;
};

// Calculate estimated 1RM using Epley formula
const calculate1RM = (weight: number, reps: number): number => {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
};

const GymView: React.FC<Props> = ({
  state,
  onStartSession,
  onEndSession,
  onUpdateSession,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onAddExercise
}) => {
  const activeSession = state.workoutSessions.find(s => s.isActive);
  const [view, setView] = useState<'home' | 'templates' | 'history'>('home');

  if (activeSession) {
    return (
      <ActiveWorkout
        session={activeSession}
        state={state}
        onUpdate={onUpdateSession}
        onEnd={onEndSession}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-shrink-0 bg-surface border-b border-border">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Dumbbell className="text-emerald-500" size={28} />
                Gym Tracker
              </h1>
              <p className="text-sm text-zinc-500 mt-1">Track reps, beat PRs, get stronger</p>
            </div>
          </div>
        </div>

        <div className="flex border-t border-border px-6">
          <button
            onClick={() => setView('home')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              view === 'home' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Zap className="inline mr-2" size={16} />
            Start
          </button>
          <button
            onClick={() => setView('templates')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              view === 'templates' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <List className="inline mr-2" size={16} />
            Routines
          </button>
          <button
            onClick={() => setView('history')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              view === 'history' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <HistoryIcon className="inline mr-2" size={16} />
            History
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {view === 'home' && (
          <HomeView
            state={state}
            onStartQuick={() => onStartSession()}
            onStartTemplate={onStartSession}
          />
        )}
        {view === 'templates' && (
          <TemplateManager
            templates={state.workoutTemplates}
            exercises={state.exercises}
            onStart={onStartSession}
            onCreate={onCreateTemplate}
            onUpdate={onUpdateTemplate}
            onDelete={onDeleteTemplate}
          />
        )}
        {view === 'history' && (
          <WorkoutHistory sessions={state.workoutSessions.filter(s => !s.isActive)} />
        )}
      </div>
    </div>
  );
};

const HomeView: React.FC<{
  state: AppState;
  onStartQuick: () => void;
  onStartTemplate: (template: WorkoutTemplate) => void;
}> = ({ state, onStartQuick, onStartTemplate }) => {
  const recentTemplates = [...state.workoutTemplates]
    .filter(t => t.lastUsed)
    .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
    .slice(0, 3);

  const completedSessions = state.workoutSessions.filter(s => !s.isActive && s.endTime);
  const lastWorkout = completedSessions.sort((a, b) => (b.endTime || 0) - (a.endTime || 0))[0];

  const thisWeekSessions = completedSessions.filter(s => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return (s.endTime || 0) > weekAgo;
  });

  const weekVolume = thisWeekSessions.reduce((total, session) => {
    return total + session.exercises.reduce((sessionTotal, ex) => {
      return sessionTotal + ex.sets.reduce((exTotal, set) => {
        return exTotal + (set.weight || 0) * set.reps;
      }, 0);
    }, 0);
  }, 0);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-2 border-emerald-500/30 rounded-2xl p-8 text-center">
        <Zap className="text-emerald-400 mx-auto mb-4" size={48} />
        <h2 className="text-2xl font-bold text-white mb-2">Ready to Train?</h2>
        <p className="text-zinc-400 mb-6">Start a quick workout or choose a routine</p>
        <button
          onClick={onStartQuick}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
        >
          <Play className="inline mr-2" size={20} />
          Quick Start
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{thisWeekSessions.length}</div>
          <div className="text-xs text-zinc-500 mt-1">This Week</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{(weekVolume / 1000).toFixed(1)}t</div>
          <div className="text-xs text-zinc-500 mt-1">Volume</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{completedSessions.length}</div>
          <div className="text-xs text-zinc-500 mt-1">Total</div>
        </div>
      </div>

      {lastWorkout && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-zinc-400">Last Workout</h3>
            <span className="text-xs text-zinc-500">
              {new Date(lastWorkout.endTime!).toLocaleDateString()}
            </span>
          </div>
          <div className="text-lg font-bold text-white mb-2">
            {lastWorkout.templateName || 'Quick Workout'}
          </div>
          <div className="flex gap-4 text-sm text-zinc-400">
            <span>{lastWorkout.exercises.length} exercises</span>
            <span>•</span>
            <span>{lastWorkout.exercises.reduce((t, e) => t + e.sets.length, 0)} sets</span>
            <span>•</span>
            <span>{Math.floor((lastWorkout.endTime! - lastWorkout.startTime) / 60000)} min</span>
          </div>
        </div>
      )}

      {recentTemplates.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-4">Recent Routines</h3>
          <div className="space-y-3">
            {recentTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => onStartTemplate(template)}
                className="w-full bg-surface border border-border hover:border-emerald-500/50 rounded-xl p-4 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {template.name}
                    </h4>
                    <p className="text-sm text-zinc-500 mt-1">
                      {template.exercises.length} exercises
                    </p>
                  </div>
                  <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <Play size={20} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TemplateManager: React.FC<{
  templates: WorkoutTemplate[];
  exercises: Exercise[];
  onStart: (template: WorkoutTemplate) => void;
  onCreate: (template: WorkoutTemplate) => void;
  onUpdate: (template: WorkoutTemplate) => void;
  onDelete: (id: string) => void;
}> = ({ templates, exercises, onStart, onCreate, onUpdate, onDelete }) => {
  const [editing, setEditing] = useState<WorkoutTemplate | null>(null);
  const [creating, setCreating] = useState(false);

  if (creating || editing) {
    return (
      <TemplateEditor
        template={editing}
        exercises={exercises}
        onSave={(template) => {
          if (editing) {
            onUpdate(template);
          } else {
            onCreate(template);
          }
          setEditing(null);
          setCreating(false);
        }}
        onCancel={() => {
          setEditing(null);
          setCreating(false);
        }}
      />
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="bg-zinc-800/50 rounded-full p-6 mb-4">
          <List className="text-zinc-600" size={48} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No Routines Yet</h2>
        <p className="text-zinc-400 mb-6 max-w-sm">
          Create your first workout routine
        </p>
        <button
          onClick={() => setCreating(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium"
        >
          <Plus className="inline mr-2" size={18} />
          Create Routine
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Workout Routines</h2>
        <button
          onClick={() => setCreating(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium text-sm"
        >
          <Plus className="inline mr-1" size={16} />
          New
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {templates.map(template => (
          <div
            key={template.id}
            className="bg-surface border border-border rounded-xl p-5 hover:border-emerald-500/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">{template.name}</h3>
                <p className="text-sm text-zinc-500">
                  {template.exercises.length} exercises
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(template)} className="text-zinc-400 hover:text-white p-2">
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this routine?')) onDelete(template.id);
                  }}
                  className="text-zinc-400 hover:text-red-400 p-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <button
              onClick={() => onStart(template)}
              className="w-full bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/20 hover:border-emerald-500 text-emerald-400 hover:text-white py-3 rounded-lg font-medium transition-all"
            >
              <Play className="inline mr-2" size={18} />
              Start
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const TemplateEditor: React.FC<{
  template: WorkoutTemplate | null;
  exercises: Exercise[];
  onSave: (template: WorkoutTemplate) => void;
  onCancel: () => void;
}> = ({ template, exercises, onSave, onCancel }) => {
  const [name, setName] = useState(template?.name || '');
  const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>(template?.exercises || []);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredExercises = exercises.filter(ex =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-shrink-0 bg-surface border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{template ? 'Edit' : 'Create'} Routine</h2>
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-4 py-2 text-zinc-400 hover:text-white">
              Cancel
            </button>
            <button
              onClick={() => {
                if (!name.trim() || templateExercises.length === 0) return;
                onSave({
                  id: template?.id || generateId(),
                  name: name.trim(),
                  exercises: templateExercises,
                  createdAt: template?.createdAt || Date.now(),
                  lastUsed: template?.lastUsed
                });
              }}
              disabled={!name.trim() || templateExercises.length === 0}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-6 py-2 rounded-lg font-medium"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Routine name..."
          className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-white text-lg mb-6"
          autoFocus
        />

        <div className="mb-3">
          <button
            onClick={() => setShowPicker(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm"
          >
            <Plus className="inline mr-1" size={14} />
            Add Exercise
          </button>
        </div>

        <div className="space-y-3">
          {templateExercises.map((ex, idx) => (
            <div key={ex.id} className="bg-surface border border-border rounded-lg p-4">
              <div className="flex justify-between mb-3">
                <span className="font-medium text-white">{ex.exerciseName}</span>
                <button
                  onClick={() => setTemplateExercises(templateExercises.filter(e => e.id !== ex.id))}
                  className="text-zinc-500 hover:text-red-400"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Sets</label>
                  <input
                    type="number"
                    value={ex.targetSets}
                    onChange={(e) => {
                      const updated = [...templateExercises];
                      updated[idx].targetSets = parseInt(e.target.value) || 1;
                      setTemplateExercises(updated);
                    }}
                    className="w-full bg-zinc-800 rounded px-2 py-1.5 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Reps</label>
                  <input
                    type="number"
                    value={ex.targetReps || ''}
                    onChange={(e) => {
                      const updated = [...templateExercises];
                      updated[idx].targetReps = parseInt(e.target.value) || undefined;
                      setTemplateExercises(updated);
                    }}
                    placeholder="?"
                    className="w-full bg-zinc-800 rounded px-2 py-1.5 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Rest (s)</label>
                  <input
                    type="number"
                    value={ex.restTime}
                    onChange={(e) => {
                      const updated = [...templateExercises];
                      updated[idx].restTime = parseInt(e.target.value) || 60;
                      setTemplateExercises(updated);
                    }}
                    className="w-full bg-zinc-800 rounded px-2 py-1.5 text-white text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showPicker && (
        <div className="fixed inset-0 bg-black/80 flex items-end md:items-center justify-center z-50" onClick={() => setShowPicker(false)}>
          <div className="bg-surface w-full md:max-w-2xl md:rounded-2xl max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-2">
                {filteredExercises.map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => {
                      setTemplateExercises([...templateExercises, {
                        id: generateId(),
                        exerciseId: ex.id,
                        exerciseName: ex.name,
                        targetSets: 3,
                        targetReps: 10,
                        restTime: ex.defaultRestTime || 90
                      }]);
                      setShowPicker(false);
                      setSearchQuery('');
                    }}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-3 rounded-lg text-left"
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ActiveWorkout: React.FC<{
  session: WorkoutSession;
  state: AppState;
  onUpdate: (session: WorkoutSession) => void;
  onEnd: (session: WorkoutSession) => void;
}> = ({ session, state, onUpdate, onEnd }) => {
  const [sessionTime, setSessionTime] = useState(0);
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  const template = state.workoutTemplates.find(t => t.id === session.templateId);
  const previousWorkouts = state.workoutSessions
    .filter(s => !s.isActive && s.templateId === session.templateId)
    .sort((a, b) => (b.endTime || 0) - (a.endTime || 0));
  const lastWorkout = previousWorkouts[0];

  useEffect(() => {
    if (template && session.exercises.length === 0) {
      const workoutExercises: WorkoutExercise[] = template.exercises.map(tEx => {
        const prevEx = lastWorkout?.exercises.find(e => e.exerciseId === tEx.exerciseId);
        const prevBest = prevEx?.sets.reduce((best, set) => {
          if (!best || (set.weight && (!best.weight || set.weight > best.weight))) {
            return { reps: set.reps, weight: set.weight };
          }
          return best;
        }, undefined as { reps: number; weight?: number } | undefined);

        return {
          id: generateId(),
          exerciseId: tEx.exerciseId,
          exerciseName: tEx.exerciseName,
          sets: [],
          targetSets: tEx.targetSets,
          targetReps: tEx.targetReps,
          restTime: tEx.restTime,
          previousBest: prevBest
        };
      });
      onUpdate({ ...session, exercises: workoutExercises });
    }
  }, [template, session, lastWorkout, onUpdate]);

  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        setSessionTime(Math.floor((Date.now() - session.startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [session.startTime, isPaused]);

  useEffect(() => {
    if (restTimerActive && restTimeLeft > 0) {
      const timer = setTimeout(() => setRestTimeLeft(restTimeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (restTimeLeft === 0 && restTimerActive) {
      setRestTimerActive(false);
    }
  }, [restTimerActive, restTimeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalVolume = session.exercises.reduce((total, ex) => {
    return total + ex.sets.reduce((exTotal, set) => {
      return exTotal + (set.weight || 0) * set.reps;
    }, 0);
  }, 0);

  const totalSets = session.exercises.reduce((total, ex) => total + ex.sets.length, 0);

  const filteredExercises = state.exercises.filter(ex =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-shrink-0 bg-surface border-b border-border">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-white">{session.templateName || 'Quick Workout'}</h1>
              <div className="flex gap-4 mt-1 text-sm text-zinc-400">
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {formatTime(sessionTime)}
                </span>
                <span>{totalSets} sets</span>
                <span className="text-emerald-400">{(totalVolume / 1000).toFixed(1)}t</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="text-zinc-400 hover:text-white p-2"
              >
                <Pause size={20} />
              </button>
              <button
                onClick={() => {
                  if (session.exercises.length === 0 || session.exercises.every(e => e.sets.length === 0)) {
                    if (!confirm('No sets logged. Finish anyway?')) return;
                  }
                  onEnd({ ...session, endTime: Date.now(), isActive: false });
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-medium"
              >
                <Check className="inline mr-2" size={18} />
                Finish
              </button>
            </div>
          </div>
        </div>

        {restTimerActive && (
          <div className="bg-emerald-500/20 border-t border-emerald-500/30 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {[30, 60, 90, 120, 180].map(sec => (
                  <button
                    key={sec}
                    onClick={() => {
                      setRestTimeLeft(sec);
                      setRestTimerActive(true);
                    }}
                    className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-2 py-1 rounded"
                  >
                    {sec}s
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-emerald-400 tabular-nums">{formatTime(restTimeLeft)}</span>
                <button onClick={() => setRestTimerActive(false)} className="text-emerald-400">
                  <X size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-24">
        <div className="max-w-3xl mx-auto space-y-4">
          {session.exercises.map(exercise => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              session={session}
              onUpdate={onUpdate}
              onStartRest={(time) => {
                setRestTimeLeft(time);
                setRestTimerActive(true);
              }}
              previousWorkouts={previousWorkouts}
            />
          ))}

          <button
            onClick={() => setShowAddExercise(true)}
            className="w-full border-2 border-dashed border-zinc-700 hover:border-emerald-500/50 rounded-xl py-6 text-zinc-500 hover:text-emerald-400"
          >
            <Plus className="inline mr-2" size={20} />
            Add Exercise
          </button>
        </div>
      </div>

      {showAddExercise && (
        <div className="fixed inset-0 bg-black/80 flex items-end md:items-center justify-center z-50" onClick={() => setShowAddExercise(false)}>
          <div className="bg-surface w-full md:max-w-2xl md:rounded-2xl max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-2">
                {filteredExercises.map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => {
                      const newEx: WorkoutExercise = {
                        id: generateId(),
                        exerciseId: ex.id,
                        exerciseName: ex.name,
                        sets: [],
                        targetSets: 3,
                        targetReps: 10,
                        restTime: ex.defaultRestTime || 90
                      };
                      onUpdate({ ...session, exercises: [...session.exercises, newEx] });
                      setShowAddExercise(false);
                      setSearchQuery('');
                    }}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-3 rounded-lg text-left"
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ExerciseCard: React.FC<{
  exercise: WorkoutExercise;
  session: WorkoutSession;
  onUpdate: (session: WorkoutSession) => void;
  onStartRest: (time: number) => void;
  previousWorkouts: WorkoutSession[];
}> = ({ exercise, session, onUpdate, onStartRest, previousWorkouts }) => {
  const [reps, setReps] = useState(exercise.previousBest?.reps || exercise.targetReps || 10);
  const [weight, setWeight] = useState(exercise.previousBest?.weight || 0);
  const [showPlateCalc, setShowPlateCalc] = useState(false);
  const [editingSet, setEditingSet] = useState<string | null>(null);

  const handleLogSet = () => {
    const newSet: WorkoutSet = {
      id: generateId(),
      reps,
      weight: weight > 0 ? weight : undefined,
      completed: true,
      timestamp: Date.now()
    };

    const updatedExercises = session.exercises.map(ex => {
      if (ex.id === exercise.id) {
        return { ...ex, sets: [...ex.sets, newSet] };
      }
      return ex;
    });

    onUpdate({ ...session, exercises: updatedExercises });
    onStartRest(exercise.restTime);
  };

  const duplicateLastSet = () => {
    const lastSet = exercise.sets[exercise.sets.length - 1];
    if (lastSet) {
      setReps(lastSet.reps);
      setWeight(lastSet.weight || 0);
      handleLogSet();
    }
  };

  const deleteSet = (setId: string) => {
    const updatedExercises = session.exercises.map(ex => {
      if (ex.id === exercise.id) {
        return { ...ex, sets: ex.sets.filter(s => s.id !== setId) };
      }
      return ex;
    });
    onUpdate({ ...session, exercises: updatedExercises });
  };

  const removeExercise = () => {
    onUpdate({
      ...session,
      exercises: session.exercises.filter(e => e.id !== exercise.id)
    });
  };

  const skipExercise = () => {
    const updatedExercises = session.exercises.map(ex => {
      if (ex.id === exercise.id) {
        const dummySets: WorkoutSet[] = Array.from({ length: ex.targetSets }, () => ({
          id: generateId(),
          reps: 0,
          completed: false,
          timestamp: Date.now()
        }));
        return { ...ex, sets: dummySets };
      }
      return ex;
    });
    onUpdate({ ...session, exercises: updatedExercises });
  };

  const completedSets = exercise.sets.filter(s => s.completed).length;
  const isComplete = completedSets >= exercise.targetSets;

  // Calculate volume for this exercise
  const exerciseVolume = exercise.sets.reduce((total, set) => {
    return total + (set.weight || 0) * set.reps;
  }, 0);

  // Calculate estimated 1RM
  const best1RM = exercise.sets.reduce((max, set) => {
    if (!set.weight || set.reps === 0) return max;
    const estimated = calculate1RM(set.weight, set.reps);
    return Math.max(max, estimated);
  }, 0);

  // Check for PR
  const prevExercise = previousWorkouts[0]?.exercises.find(e => e.exerciseId === exercise.exerciseId);
  const prevBest1RM = prevExercise?.sets.reduce((max, set) => {
    if (!set.weight || set.reps === 0) return max;
    const estimated = calculate1RM(set.weight, set.reps);
    return Math.max(max, estimated);
  }, 0) || 0;
  const isPR = best1RM > prevBest1RM && best1RM > 0;

  const plates = weight >= 20 ? calculatePlates(weight) : [];

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-lg">{exercise.exerciseName}</h3>
              {isPR && (
                <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Award size={12} />
                  PR!
                </span>
              )}
            </div>
            <div className="text-sm text-zinc-400 mt-1 flex items-center gap-3">
              <span>{completedSets}/{exercise.targetSets} sets</span>
              {exerciseVolume > 0 && <span>• {exerciseVolume.toFixed(0)}kg volume</span>}
              {best1RM > 0 && <span>• ~{best1RM.toFixed(0)}kg 1RM</span>}
            </div>
            {exercise.previousBest && (
              <div className="text-xs text-emerald-400 mt-1">
                Last: {exercise.previousBest.reps}r {exercise.previousBest.weight ? `@ ${exercise.previousBest.weight}kg` : ''}
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <button
              onClick={skipExercise}
              className="text-zinc-500 hover:text-yellow-400 p-2"
              title="Skip exercise"
            >
              <SkipForward size={16} />
            </button>
            <button onClick={removeExercise} className="text-zinc-500 hover:text-red-400 p-2">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {exercise.sets.length > 0 && (
        <div className="p-4 space-y-2">
          {exercise.sets.map((set, idx) => (
            <div key={set.id} className="flex items-center gap-3 bg-zinc-800/50 rounded-lg px-4 py-2.5">
              <div className="text-zinc-500 font-mono text-sm w-6">#{idx + 1}</div>
              <div className="flex-1 text-white font-medium">
                {set.reps} reps {set.weight ? `× ${set.weight}kg` : ''}
              </div>
              <button onClick={() => deleteSet(set.id)} className="text-zinc-600 hover:text-red-400">
                <X size={16} />
              </button>
            </div>
          ))}
          {!isComplete && exercise.sets.length > 0 && (
            <button
              onClick={duplicateLastSet}
              className="w-full text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 py-2 rounded-lg"
            >
              <Copy className="inline mr-1" size={12} />
              Repeat Last Set
            </button>
          )}
        </div>
      )}

      {!isComplete && (
        <div className="p-4 bg-zinc-900/30">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-2">Reps</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReps(Math.max(1, reps - 1))}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-lg"
                >
                  <Minus size={18} />
                </button>
                <input
                  type="number"
                  value={reps}
                  onChange={(e) => setReps(parseInt(e.target.value) || 0)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-center text-xl font-bold"
                />
                <button
                  onClick={() => setReps(reps + 1)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-lg"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-2">Weight (kg)</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWeight(Math.max(0, weight - 2.5))}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-lg"
                >
                  <Minus size={18} />
                </button>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                  step="2.5"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-center text-xl font-bold"
                  onClick={() => setShowPlateCalc(true)}
                />
                <button
                  onClick={() => setWeight(weight + 2.5)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-lg"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>

          {showPlateCalc && plates.length > 0 && (
            <div className="mb-3 p-3 bg-zinc-800/50 rounded-lg">
              <div className="text-xs text-zinc-500 mb-2">Plates per side (20kg bar):</div>
              <div className="flex flex-wrap gap-2">
                {plates.map((p, i) => (
                  <span key={i} className="text-sm text-emerald-400">
                    {p.count}×{p.plate}kg
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-3">
            {[2.5, 5, 10].map(inc => (
              <button
                key={inc}
                onClick={() => setWeight(weight + inc)}
                className="flex-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 py-1.5 rounded"
              >
                +{inc}
              </button>
            ))}
          </div>

          <button
            onClick={handleLogSet}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-lg font-bold text-lg"
          >
            <Check className="inline mr-2" size={20} />
            Log Set
          </button>
        </div>
      )}

      {isComplete && (
        <div className="p-4 bg-emerald-500/10 border-t border-emerald-500/20">
          <div className="text-center text-emerald-400 font-medium flex items-center justify-center gap-2">
            <Check size={20} />
            Complete!
          </div>
        </div>
      )}
    </div>
  );
};

const WorkoutHistory: React.FC<{ sessions: WorkoutSession[] }> = ({ sessions }) => {
  const sortedSessions = [...sessions].sort((a, b) => (b.endTime || 0) - (a.endTime || 0));

  if (sortedSessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="bg-zinc-800/50 rounded-full p-6 mb-4">
          <HistoryIcon className="text-zinc-600" size={48} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No Workout History</h2>
        <p className="text-zinc-400">Complete your first workout to see it here</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-white mb-6">Workout History</h2>
      <div className="space-y-4">
        {sortedSessions.map(session => {
          const duration = session.endTime ? Math.floor((session.endTime - session.startTime) / 60000) : 0;
          const totalVolume = session.exercises.reduce((total, ex) => {
            return total + ex.sets.reduce((exTotal, set) => exTotal + (set.weight || 0) * set.reps, 0);
          }, 0);

          return (
            <div key={session.id} className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{session.templateName || 'Quick Workout'}</h3>
                  <p className="text-sm text-zinc-500 mt-1">
                    {session.endTime && new Date(session.endTime).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-zinc-400">{duration} min</div>
                  <div className="text-lg font-bold text-emerald-400">{(totalVolume / 1000).toFixed(1)}t</div>
                </div>
              </div>
              <div className="space-y-1">
                {session.exercises.map(ex => (
                  <div key={ex.id} className="text-sm text-zinc-400">
                    • {ex.exerciseName} - {ex.sets.length} sets
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GymView;
