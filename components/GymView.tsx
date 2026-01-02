import React, { useState, useEffect } from 'react';
import { AppState, WorkoutSession, WorkoutTemplate, TemplateExercise, WorkoutExercise, WorkoutSet, Exercise, ExerciseCategory } from '../types';
import { generateId } from '../utils';
import { Dumbbell, Plus, Play, Square, Timer, Trash2, Check, X, Edit2, Clock, TrendingUp, ChevronRight, ChevronDown, ListPlus, Save } from 'lucide-react';

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
  const [view, setView] = useState<'templates' | 'history' | 'createTemplate'>('templates');
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);

  // If active workout, show it
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

  // Otherwise show templates/history
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-surface/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Dumbbell className="text-emerald-500" size={24} />
            <h1 className="text-xl font-bold text-white">Gym Tracker</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('templates')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === 'templates'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              Routines
            </button>
            <button
              onClick={() => setView('history')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === 'history'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              History
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {view === 'templates' && (
          <TemplateList
            templates={state.workoutTemplates}
            onStart={onStartSession}
            onCreate={() => setView('createTemplate')}
            onEdit={(t) => {
              setEditingTemplate(t);
              setView('createTemplate');
            }}
            onDelete={onDeleteTemplate}
          />
        )}
        {view === 'history' && (
          <WorkoutHistory sessions={state.workoutSessions.filter(s => !s.isActive)} />
        )}
        {view === 'createTemplate' && (
          <TemplateEditor
            template={editingTemplate}
            exercises={state.exercises}
            onSave={(template) => {
              if (editingTemplate) {
                onUpdateTemplate(template);
              } else {
                onCreateTemplate(template);
              }
              setEditingTemplate(null);
              setView('templates');
            }}
            onCancel={() => {
              setEditingTemplate(null);
              setView('templates');
            }}
            onAddExercise={onAddExercise}
          />
        )}
      </div>

      {/* Quick Create Template Button */}
      {view === 'templates' && (
        <button
          onClick={() => setView('createTemplate')}
          className="fixed bottom-8 right-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full p-4 shadow-lg transition-all hover:scale-105 md:bottom-12 md:right-12"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
};

// Template List Component
const TemplateList: React.FC<{
  templates: WorkoutTemplate[];
  onStart: (template: WorkoutTemplate) => void;
  onCreate: () => void;
  onEdit: (template: WorkoutTemplate) => void;
  onDelete: (id: string) => void;
}> = ({ templates, onStart, onCreate, onEdit, onDelete }) => {
  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Dumbbell className="text-zinc-600 mb-4" size={64} />
        <h2 className="text-xl font-bold text-white mb-2">No Workout Routines</h2>
        <p className="text-zinc-400 mb-6 max-w-md">
          Create your first workout routine to start tracking your progress
        </p>
        <button
          onClick={onCreate}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
        >
          <Plus size={20} />
          Create Routine
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {templates.map(template => (
        <div
          key={template.id}
          className="bg-surface border border-border rounded-lg p-4 hover:border-emerald-500/50 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">{template.name}</h3>
              <p className="text-sm text-zinc-400">
                {template.exercises.length} exercises
                {template.lastUsed && ` • Last used ${new Date(template.lastUsed).toLocaleDateString()}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(template)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => onDelete(template.id)}
                className="text-zinc-400 hover:text-red-400 p-1"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="space-y-1 mb-4">
            {template.exercises.slice(0, 3).map(ex => (
              <div key={ex.id} className="text-sm text-zinc-400">
                {ex.exerciseName} • {ex.targetSets} sets {ex.targetReps ? `× ${ex.targetReps} reps` : ''}
              </div>
            ))}
            {template.exercises.length > 3 && (
              <div className="text-sm text-zinc-500">+{template.exercises.length - 3} more</div>
            )}
          </div>

          <button
            onClick={() => onStart(template)}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-md font-medium flex items-center justify-center gap-2"
          >
            <Play size={18} />
            Start Workout
          </button>
        </div>
      ))}
    </div>
  );
};

// Template Editor Component
const TemplateEditor: React.FC<{
  template: WorkoutTemplate | null;
  exercises: Exercise[];
  onSave: (template: WorkoutTemplate) => void;
  onCancel: () => void;
  onAddExercise: (exercise: Exercise) => void;
}> = ({ template, exercises, onSave, onCancel, onAddExercise }) => {
  const [name, setName] = useState(template?.name || '');
  const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>(template?.exercises || []);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory>('CHEST');

  const categories: ExerciseCategory[] = ['CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'CORE', 'CARDIO', 'FULL_BODY'];

  const addExerciseToTemplate = (exercise: Exercise) => {
    const newTemplateExercise: TemplateExercise = {
      id: generateId(),
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      targetSets: 3,
      targetReps: 10,
      restTime: exercise.defaultRestTime || 90,
      notes: ''
    };
    setTemplateExercises([...templateExercises, newTemplateExercise]);
    setShowAddExercise(false);
  };

  const updateExercise = (id: string, updates: Partial<TemplateExercise>) => {
    setTemplateExercises(templateExercises.map(ex =>
      ex.id === id ? { ...ex, ...updates } : ex
    ));
  };

  const removeExercise = (id: string) => {
    setTemplateExercises(templateExercises.filter(ex => ex.id !== id));
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const newTemplate: WorkoutTemplate = {
      id: template?.id || generateId(),
      name: name.trim(),
      exercises: templateExercises,
      createdAt: template?.createdAt || Date.now(),
      lastUsed: template?.lastUsed
    };
    onSave(newTemplate);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <label className="block text-sm font-medium text-zinc-300 mb-2">Routine Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Push Day, Leg Day, Upper Body"
          className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Exercises</h3>
        <button
          onClick={() => setShowAddExercise(!showAddExercise)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
        >
          <Plus size={16} />
          Add Exercise
        </button>
      </div>

      {showAddExercise && (
        <div className="bg-surface border border-border rounded-lg p-4 mb-4">
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-md text-sm font-medium whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-emerald-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="grid gap-2 max-h-60 overflow-y-auto">
            {exercises
              .filter(ex => ex.category === selectedCategory)
              .map(exercise => (
                <button
                  key={exercise.id}
                  onClick={() => addExerciseToTemplate(exercise)}
                  className="text-left bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-md"
                >
                  {exercise.name}
                </button>
              ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {templateExercises.map(ex => (
          <div key={ex.id} className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-white">{ex.exerciseName}</h4>
              <button
                onClick={() => removeExercise(ex.id)}
                className="text-zinc-400 hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Sets</label>
                <input
                  type="number"
                  value={ex.targetSets}
                  onChange={(e) => updateExercise(ex.id, { targetSets: parseInt(e.target.value) || 0 })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-sm"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Target Reps</label>
                <input
                  type="number"
                  value={ex.targetReps || ''}
                  onChange={(e) => updateExercise(ex.id, { targetReps: parseInt(e.target.value) || undefined })}
                  placeholder="Optional"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Rest (sec)</label>
                <input
                  type="number"
                  value={ex.restTime}
                  onChange={(e) => updateExercise(ex.id, { restTime: parseInt(e.target.value) || 60 })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-sm"
                  min="0"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={handleSave}
          disabled={!name.trim() || templateExercises.length === 0}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
        >
          <Save size={18} />
          Save Routine
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// Active Workout Component
const ActiveWorkout: React.FC<{
  session: WorkoutSession;
  state: AppState;
  onUpdate: (session: WorkoutSession) => void;
  onEnd: (session: WorkoutSession) => void;
}> = ({ session, state, onUpdate, onEnd }) => {
  const [sessionTime, setSessionTime] = useState(0);
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

  // Get template and previous workout data for smart prefill
  const template = state.workoutTemplates.find(t => t.id === session.templateId);
  const previousWorkouts = state.workoutSessions
    .filter(s => !s.isActive && s.templateId === session.templateId)
    .sort((a, b) => (b.endTime || 0) - (a.endTime || 0));
  const lastWorkout = previousWorkouts[0];

  // Session timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime(Math.floor((Date.now() - session.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [session.startTime]);

  // Rest timer
  useEffect(() => {
    if (restTimerActive && restTimeLeft > 0) {
      const timer = setTimeout(() => setRestTimeLeft(restTimeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (restTimeLeft === 0 && restTimerActive) {
      setRestTimerActive(false);
    }
  }, [restTimerActive, restTimeLeft]);

  // Initialize exercises from template if empty
  useEffect(() => {
    if (template && session.exercises.length === 0) {
      const workoutExercises: WorkoutExercise[] = template.exercises.map(tEx => {
        // Find this exercise in last workout for prefill
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const addSet = (exerciseId: string, reps: number, weight?: number) => {
    const updatedExercises = session.exercises.map(ex => {
      if (ex.id === exerciseId) {
        const newSet: WorkoutSet = {
          id: generateId(),
          reps,
          weight,
          completed: true,
          timestamp: Date.now()
        };
        // Start rest timer
        setRestTimerActive(true);
        setRestTimeLeft(ex.restTime);
        return { ...ex, sets: [...ex.sets, newSet] };
      }
      return ex;
    });
    onUpdate({ ...session, exercises: updatedExercises });
  };

  const deleteSet = (exerciseId: string, setId: string) => {
    const updatedExercises = session.exercises.map(ex => {
      if (ex.id === exerciseId) {
        return { ...ex, sets: ex.sets.filter(s => s.id !== setId) };
      }
      return ex;
    });
    onUpdate({ ...session, exercises: updatedExercises });
  };

  const finishWorkout = () => {
    const completedSession = {
      ...session,
      endTime: Date.now(),
      isActive: false
    };
    onEnd(completedSession);
  };

  const currentExercise = session.exercises[currentExerciseIndex];
  const totalVolume = session.exercises.reduce((total, ex) => {
    return total + ex.sets.reduce((exTotal, set) => {
      return exTotal + (set.weight || 0) * set.reps;
    }, 0);
  }, 0);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header - Workout Info */}
      <div className="flex-shrink-0 border-b border-border bg-surface/50 px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-white">{session.templateName || 'Quick Workout'}</h1>
          <button
            onClick={finishWorkout}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2"
          >
            <Check size={18} />
            Finish
          </button>
        </div>
        <div className="flex gap-4 text-sm text-zinc-400">
          <div className="flex items-center gap-1">
            <Clock size={14} />
            {formatTime(sessionTime)}
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp size={14} />
            {totalVolume.toFixed(0)} kg
          </div>
          <div>{session.exercises.filter(e => e.sets.length > 0).length}/{session.exercises.length} exercises</div>
        </div>
      </div>

      {/* Rest Timer */}
      {restTimerActive && (
        <div className="flex-shrink-0 bg-emerald-500/20 border-b border-emerald-500/50 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="text-emerald-400" size={18} />
              <span className="text-emerald-400 font-medium">Rest Time</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-emerald-400">{formatTime(restTimeLeft)}</span>
              <button
                onClick={() => setRestTimerActive(false)}
                className="text-emerald-400 hover:text-emerald-300"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {session.exercises.map((exercise, index) => (
            <ExerciseBlock
              key={exercise.id}
              exercise={exercise}
              isActive={index === currentExerciseIndex}
              onAddSet={addSet}
              onDeleteSet={deleteSet}
              onFocus={() => setCurrentExerciseIndex(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Exercise Block Component
const ExerciseBlock: React.FC<{
  exercise: WorkoutExercise;
  isActive: boolean;
  onAddSet: (exerciseId: string, reps: number, weight?: number) => void;
  onDeleteSet: (exerciseId: string, setId: string) => void;
  onFocus: () => void;
}> = ({ exercise, isActive, onAddSet, onDeleteSet, onFocus }) => {
  const [reps, setReps] = useState(exercise.previousBest?.reps || exercise.targetReps || 10);
  const [weight, setWeight] = useState(exercise.previousBest?.weight || 0);
  const [expanded, setExpanded] = useState(isActive);

  useEffect(() => {
    if (isActive) setExpanded(true);
  }, [isActive]);

  const handleAddSet = () => {
    onAddSet(exercise.id, reps, weight > 0 ? weight : undefined);
  };

  const completedSets = exercise.sets.length;
  const targetSets = exercise.targetSets;
  const isComplete = completedSets >= targetSets;

  return (
    <div
      onClick={() => {
        setExpanded(!expanded);
        onFocus();
      }}
      className={`bg-surface border rounded-lg overflow-hidden cursor-pointer transition-all ${
        isActive ? 'border-emerald-500' : 'border-border hover:border-zinc-600'
      }`}
    >
      {/* Exercise Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white">{exercise.exerciseName}</h3>
          <div className="text-sm text-zinc-400 mt-1">
            {completedSets}/{targetSets} sets
            {exercise.previousBest && (
              <span className="ml-2 text-emerald-400">
                Last: {exercise.previousBest.reps} reps {exercise.previousBest.weight ? `@ ${exercise.previousBest.weight}kg` : ''}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isComplete && <Check className="text-emerald-400" size={20} />}
          {expanded ? <ChevronDown className="text-zinc-400" size={20} /> : <ChevronRight className="text-zinc-400" size={20} />}
        </div>
      </div>

      {/* Exercise Details (Expandable) */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-3">
          {/* Completed Sets */}
          {exercise.sets.map((set, idx) => (
            <div key={set.id} className="flex items-center gap-3 bg-zinc-800 rounded-lg p-3">
              <div className="text-zinc-400 font-mono text-sm w-8">#{idx + 1}</div>
              <div className="flex-1 text-white font-medium">
                {set.reps} reps {set.weight ? `× ${set.weight}kg` : '(bodyweight)'}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSet(exercise.id, set.id);
                }}
                className="text-zinc-500 hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          {/* Add Set Form */}
          {!isComplete && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Reps</label>
                  <input
                    type="number"
                    value={reps}
                    onChange={(e) => setReps(parseInt(e.target.value) || 0)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-surface border border-border rounded px-3 py-2 text-white text-center text-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="0"
                    className="w-full bg-surface border border-border rounded px-3 py-2 text-white text-center text-lg font-bold"
                  />
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddSet();
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-md font-medium"
              >
                Log Set
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Workout History Component
const WorkoutHistory: React.FC<{ sessions: WorkoutSession[] }> = ({ sessions }) => {
  const sortedSessions = [...sessions].sort((a, b) => (b.endTime || 0) - (a.endTime || 0));

  if (sortedSessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Clock className="text-zinc-600 mb-4" size={64} />
        <h2 className="text-xl font-bold text-white mb-2">No Workout History</h2>
        <p className="text-zinc-400">Complete your first workout to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedSessions.map(session => {
        const duration = session.endTime ? Math.floor((session.endTime - session.startTime) / 60000) : 0;
        const totalVolume = session.exercises.reduce((total, ex) => {
          return total + ex.sets.reduce((exTotal, set) => exTotal + (set.weight || 0) * set.reps, 0);
        }, 0);
        const totalSets = session.exercises.reduce((total, ex) => total + ex.sets.length, 0);

        return (
          <div key={session.id} className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-white">{session.templateName || 'Quick Workout'}</h3>
                <p className="text-sm text-zinc-400">
                  {session.endTime && new Date(session.endTime).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="text-right text-sm text-zinc-400">
                <div>{duration} min</div>
                <div className="text-emerald-400 font-medium">{totalVolume.toFixed(0)} kg</div>
              </div>
            </div>
            <div className="space-y-1">
              {session.exercises.map(ex => (
                <div key={ex.id} className="text-sm text-zinc-400">
                  {ex.exerciseName} • {ex.sets.length} sets
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GymView;
