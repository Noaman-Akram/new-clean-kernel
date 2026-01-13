import React, { useState, useRef, useEffect } from 'react';
import { AppState, Task, TaskStatus, Category, Severity, PrayerName } from '../types';
import { getPrayerTimesForDate } from '../utils/prayerTimes';
import {
  Plus, Check, X, Circle, CheckCircle2, Clock, ChevronLeft, ChevronRight,
  Sunrise, Sun, CloudSun, Sunset, Moon, Play, Pause, MoreHorizontal,
  Edit2, Calendar as CalendarIcon, Zap, ChevronDown, ChevronUp, Target,
  FileText, Bell, BellOff, Flame, TrendingUp, BookOpen, Dumbbell, Heart,
  Coffee, Droplet, Smile, Music, Brain, Star
} from 'lucide-react';

interface Props {
  state: AppState;
  onTaskUpdate: (id: string, updates: Partial<Task>) => void;
  onTaskAdd: (title: string, category: Category, impact: Severity, options?: { scheduledTime?: number; duration?: number }) => void;
  onTaskDelete: (id: string) => void;
  onStartSession: (id: string) => void;
  onStickyNoteUpdate: (dateKey: string, content: string) => void;
  onPrayerToggle: (prayerKey: string) => void;
  onAdhkarToggle: (adhkarKey: string) => void;
  activeTaskId: string | null;
}

const PRAYER_ICONS: Record<PrayerName, React.ReactNode> = {
  Fajr: <Sunrise size={14} className="text-orange-400/70" />,
  Dhuhr: <Sun size={14} className="text-yellow-400/70" />,
  Asr: <CloudSun size={14} className="text-amber-400/70" />,
  Maghrib: <Sunset size={14} className="text-rose-400/70" />,
  Isha: <Moon size={14} className="text-indigo-400/70" />
};

interface Habit {
  id: string;
  title: string;
  icon: string;
  quote: string;
  category: 'health' | 'spiritual' | 'productivity' | 'nutrition';
  metricType: 'percentage' | 'count' | 'hours' | 'times';
  metricLabel: string;
  metricMax: number;
  defaultValue: number;
}

const HABITS: Habit[] = [
  {
    id: 'workout',
    title: 'Morning Workout',
    icon: '💪',
    quote: 'The body achieves what the mind believes.',
    category: 'health',
    metricType: 'percentage',
    metricLabel: 'Intensity',
    metricMax: 100,
    defaultValue: 0
  },
  {
    id: 'prayers',
    title: 'Daily Prayers',
    icon: '🤲',
    quote: 'Prayer is the key to success.',
    category: 'spiritual',
    metricType: 'count',
    metricLabel: 'Prayers Completed',
    metricMax: 5,
    defaultValue: 0
  },
  {
    id: 'reading',
    title: 'Daily Reading',
    icon: '📚',
    quote: 'Reading is to the mind what exercise is to the body.',
    category: 'productivity',
    metricType: 'count',
    metricLabel: 'Pages Read',
    metricMax: 50,
    defaultValue: 0
  },
  {
    id: 'nutrition',
    title: 'Healthy Eating',
    icon: '🥗',
    quote: 'You are what you eat, so don\'t be fast, cheap, or fake.',
    category: 'nutrition',
    metricType: 'times',
    metricLabel: 'Unhealthy Meals',
    metricMax: 5,
    defaultValue: 0
  },
  {
    id: 'water',
    title: 'Water Intake',
    icon: '💧',
    quote: 'Water is the driving force of all nature.',
    category: 'health',
    metricType: 'count',
    metricLabel: 'Glasses (250ml)',
    metricMax: 12,
    defaultValue: 0
  },
  {
    id: 'sleep',
    title: 'Quality Sleep',
    icon: '😴',
    quote: 'Sleep is the golden chain that ties health together.',
    category: 'health',
    metricType: 'hours',
    metricLabel: 'Hours',
    metricMax: 12,
    defaultValue: 7.5
  },
  {
    id: 'quran',
    title: 'Quran Reading',
    icon: '📖',
    quote: 'The best among you are those who learn the Quran.',
    category: 'spiritual',
    metricType: 'count',
    metricLabel: 'Pages',
    metricMax: 20,
    defaultValue: 0
  },
  {
    id: 'meditation',
    title: 'Meditation',
    icon: '🧘',
    quote: 'Peace comes from within.',
    category: 'spiritual',
    metricType: 'count',
    metricLabel: 'Minutes',
    metricMax: 60,
    defaultValue: 0
  }
];

interface Template {
  id: string;
  name: string;
  icon: string;
  tasks: string[];
}

const TEMPLATES: Template[] = [
  {
    id: 'morning',
    name: 'Morning Routine',
    icon: '🌅',
    tasks: ['Fajr Prayer', 'Morning Athkar', 'Workout', 'Healthy Breakfast', 'Plan Day']
  },
  {
    id: 'evening',
    name: 'Evening Routine',
    icon: '🌙',
    tasks: ['Maghrib Prayer', 'Evening Athkar', 'Family Time', 'Prepare Tomorrow', 'Sleep Early']
  },
  {
    id: 'workday',
    name: 'Work Day',
    icon: '💼',
    tasks: ['Deep Work Session', 'Team Meeting', 'Email Review', 'Project Planning', 'Status Update']
  },
  {
    id: 'jummah',
    name: 'Jummah Day',
    icon: '🕌',
    tasks: ['Fajr Prayer', 'Quran Reading', 'Jummah Prayer', 'Family Gathering', 'Charity Work']
  }
];

interface MonthlyGoal {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  color: string;
}

const MONTHLY_GOALS: MonthlyGoal[] = [
  { id: 'quran', title: 'Complete Quran Reading', current: 22.5, target: 30, unit: 'Juz', color: '#8b5cf6' },
  { id: 'books', title: 'Read Books', current: 2, target: 5, unit: 'books', color: '#3b82f6' },
  { id: 'exercise', title: 'Daily Exercise Streak', current: 27, target: 30, unit: 'days', color: '#f59e0b' }
];

const DayView: React.FC<Props> = ({
  state,
  onTaskUpdate,
  onTaskAdd,
  onTaskDelete,
  onStartSession,
  onStickyNoteUpdate,
  onPrayerToggle,
  onAdhkarToggle,
  activeTaskId
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [inputValue, setInputValue] = useState('');
  const [activeSection, setActiveSection] = useState<'tasks' | 'habits' | 'goals' | 'templates'>('tasks');
  const [habitValues, setHabitValues] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(`habits-${new Date().toISOString().split('T')[0]}`);
    return saved ? JSON.parse(saved) : {};
  });
  const [focusActive, setFocusActive] = useState(false);
  const [focusSeconds, setFocusSeconds] = useState(1500);
  const [notifications, setNotifications] = useState(true);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const focusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const dateKey = selectedDate.toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  const isToday = dateKey === today;

  // Prayer times
  const prayerTimes = getPrayerTimesForDate(selectedDate);
  const nextPrayer = prayerTimes.find(p => !state.prayerLog[`${dateKey}-${p.name}`]);

  // Get tasks for selected date
  const daysTasks = state.tasks.filter(task => {
    if (task.scheduledTime) {
      const taskDate = new Date(task.scheduledTime).toISOString().split('T')[0];
      return taskDate === dateKey;
    }
    return false;
  }).sort((a, b) => {
    if (a.status === TaskStatus.DONE && b.status !== TaskStatus.DONE) return 1;
    if (a.status !== TaskStatus.DONE && b.status === TaskStatus.DONE) return -1;
    if (a.scheduledTime && b.scheduledTime) return a.scheduledTime - b.scheduledTime;
    return 0;
  });

  // Save habit values to localStorage
  useEffect(() => {
    localStorage.setItem(`habits-${dateKey}`, JSON.stringify(habitValues));
  }, [habitValues, dateKey]);

  // Focus mode timer
  useEffect(() => {
    if (focusActive && focusSeconds > 0) {
      focusIntervalRef.current = setInterval(() => {
        setFocusSeconds(prev => {
          if (prev <= 1) {
            setFocusActive(false);
            if (notifications) {
              new Notification('Focus Session Complete!', {
                body: 'Great work! Take a break.',
                icon: '🎯'
              });
            }
            return 1500;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (focusIntervalRef.current) {
      clearInterval(focusIntervalRef.current);
    }
    return () => {
      if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
    };
  }, [focusActive, notifications]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleAddTask = () => {
    if (!inputValue.trim()) return;

    const scheduledTime = new Date(selectedDate);
    scheduledTime.setHours(9, 0, 0, 0);

    onTaskAdd(inputValue.trim(), Category.AGENCY, 'MED', {
      scheduledTime: scheduledTime.getTime(),
      duration: 30
    });

    setInputValue('');
  };

  const handleHabitChange = (habitId: string, value: number) => {
    setHabitValues(prev => ({ ...prev, [habitId]: value }));
  };

  const handleApplyTemplate = (template: Template) => {
    const startHour = 9;
    template.tasks.forEach((taskTitle, index) => {
      const scheduledTime = new Date(selectedDate);
      scheduledTime.setHours(startHour + index, 0, 0, 0);

      onTaskAdd(taskTitle, Category.AGENCY, 'MED', {
        scheduledTime: scheduledTime.getTime(),
        duration: 60
      });
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'health': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'spiritual': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'productivity': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'nutrition': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const formatHabitValue = (habit: Habit, value: number) => {
    const val = habitValues[habit.id] ?? habit.defaultValue;
    switch (habit.metricType) {
      case 'percentage': return `${val}%`;
      case 'count': return habit.id === 'prayers' ? `${val}/${habit.metricMax}` : `${val} ${habit.metricLabel.toLowerCase()}`;
      case 'hours': return `${val} hrs`;
      case 'times': return `${val} time${val !== 1 ? 's' : ''}`;
      default: return `${val}`;
    }
  };

  const formatFocusTimer = () => {
    const mins = Math.floor(focusSeconds / 60);
    const secs = focusSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f] text-zinc-100">
      {/* HEADER */}
      <div className="flex-shrink-0 border-b border-zinc-800 bg-[#12121a]">
        {/* Date Navigation */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <div className="text-sm text-zinc-500 mb-0.5">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
              </div>
              <div className="text-lg font-semibold">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <button
              onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
            {!isToday && (
              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-3 py-1.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
              >
                Today
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Focus Mode */}
            <div className="flex items-center gap-2 bg-zinc-800/50 rounded-lg px-3 py-2">
              {focusActive ? (
                <>
                  <span className="text-2xl font-bold text-indigo-400 font-mono">{formatFocusTimer()}</span>
                  <button
                    onClick={() => setFocusActive(false)}
                    className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded hover:bg-indigo-500/30 transition-colors"
                  >
                    <Pause size={16} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setFocusActive(true);
                    setFocusSeconds(1500);
                  }}
                  className="flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded hover:bg-indigo-500/30 transition-colors"
                >
                  <Target size={16} />
                  <span className="text-sm font-medium">Focus</span>
                </button>
              )}
            </div>

            {/* Notifications Toggle */}
            <button
              onClick={() => setNotifications(!notifications)}
              className={`p-2 rounded-lg transition-colors ${notifications ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-500'}`}
              title={notifications ? 'Notifications On' : 'Notifications Off'}
            >
              {notifications ? <Bell size={18} /> : <BellOff size={18} />}
            </button>
          </div>
        </div>

        {/* Prayer Banner */}
        {nextPrayer && isToday && (
          <div className="mx-6 mb-4 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              {PRAYER_ICONS[nextPrayer.name as PrayerName]}
            </div>
            <div className="flex-1">
              <div className="text-xs text-zinc-400 mb-1">Next Prayer</div>
              <div className="text-lg font-semibold">{nextPrayer.name}</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-purple-400">
                {new Date(nextPrayer.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </div>
              <div className="text-xs text-zinc-500">in 2h 15min</div>
            </div>
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex gap-2 px-6 pb-3">
          {[
            { id: 'tasks', label: 'Tasks', icon: <CheckCircle2 size={16} /> },
            { id: 'habits', label: 'Habits', icon: <Flame size={16} /> },
            { id: 'goals', label: 'Goals', icon: <Target size={16} /> },
            { id: 'templates', label: 'Templates', icon: <FileText size={16} /> }
          ].map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              {section.icon}
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* TASKS VIEW */}
        {activeSection === 'tasks' && (
          <div className="max-w-4xl mx-auto">
            {/* Add Task Input */}
            <div className="mb-6 bg-[#12121a] border border-zinc-800 rounded-xl p-4">
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                  placeholder="Add a new task..."
                  className="flex-1 bg-zinc-900 border-0 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={handleAddTask}
                  className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Tasks List */}
            <div className="space-y-2">
              {daysTasks.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <div className="text-4xl mb-3">📝</div>
                  <div className="text-lg font-medium mb-1">No tasks for today</div>
                  <div className="text-sm">Add your first task above</div>
                </div>
              ) : (
                daysTasks.map(task => (
                  <div
                    key={task.id}
                    className={`group bg-[#12121a] border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-all ${
                      task.status === TaskStatus.DONE ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => onTaskUpdate(task.id, { status: task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE })}
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 transition-colors ${
                          task.status === TaskStatus.DONE
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-zinc-600 hover:border-emerald-500'
                        } flex items-center justify-center`}
                      >
                        {task.status === TaskStatus.DONE && <Check size={14} className="text-white" />}
                      </button>
                      <div className="flex-1">
                        <div className={`font-medium ${task.status === TaskStatus.DONE ? 'line-through text-zinc-500' : ''}`}>
                          {task.title}
                        </div>
                        {task.scheduledTime && (
                          <div className="text-xs text-zinc-500 mt-1">
                            {new Date(task.scheduledTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                      {activeTaskId === task.id && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-medium">
                          <Play size={12} />
                          Active
                        </div>
                      )}
                      <button
                        onClick={() => onTaskDelete(task.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* HABITS VIEW */}
        {activeSection === 'habits' && (
          <div className="max-w-5xl mx-auto">
            <div className="grid gap-4">
              {HABITS.map(habit => (
                <div key={habit.id} className="bg-[#12121a] border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                      habit.category === 'health' ? 'bg-green-500/10' :
                      habit.category === 'spiritual' ? 'bg-purple-500/10' :
                      habit.category === 'productivity' ? 'bg-blue-500/10' :
                      'bg-orange-500/10'
                    }`}>
                      {habit.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{habit.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${getCategoryColor(habit.category)}`}>
                          {habit.category}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 italic">&ldquo;{habit.quote}&rdquo;</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-zinc-400">{habit.metricLabel}</span>
                      <span className="text-sm font-semibold text-emerald-400">
                        {formatHabitValue(habit, habitValues[habit.id] ?? habit.defaultValue)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={habit.metricMax}
                      step={habit.metricType === 'hours' ? 0.5 : 1}
                      value={habitValues[habit.id] ?? habit.defaultValue}
                      onChange={e => handleHabitChange(habit.id, parseFloat(e.target.value))}
                      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-emerald-500 [&::-moz-range-thumb]:border-0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GOALS VIEW */}
        {activeSection === 'goals' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Monthly Goals</h2>
              <p className="text-zinc-400">Track your progress this month</p>
            </div>

            <div className="space-y-4">
              {MONTHLY_GOALS.map(goal => {
                const progress = (goal.current / goal.target) * 100;
                const progressDeg = (progress / 100) * 360;

                return (
                  <div key={goal.id} className="bg-[#12121a] border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all">
                    <div className="flex items-center gap-6">
                      <div className="relative w-20 h-20">
                        <svg className="transform -rotate-90 w-20 h-20">
                          <circle
                            cx="40"
                            cy="40"
                            r="32"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="transparent"
                            className="text-zinc-800"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r="32"
                            stroke={goal.color}
                            strokeWidth="6"
                            fill="transparent"
                            strokeDasharray={`${(progressDeg / 360) * 201} 201`}
                            className="transition-all duration-500"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold" style={{ color: goal.color }}>
                            {Math.round(progress)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">{goal.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <span className="font-medium text-zinc-300">{goal.current}</span>
                          <span>/</span>
                          <span>{goal.target} {goal.unit}</span>
                          <span className="text-zinc-600">•</span>
                          <span>{goal.target - goal.current} remaining</span>
                        </div>
                      </div>

                      <TrendingUp size={24} style={{ color: goal.color }} className="opacity-50" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TEMPLATES VIEW */}
        {activeSection === 'templates' && (
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Quick Templates</h2>
              <p className="text-zinc-400">Apply pre-built task sets for common routines</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TEMPLATES.map(template => (
                <div
                  key={template.id}
                  className="bg-[#12121a] border border-zinc-800 rounded-xl p-6 hover:border-emerald-500/50 transition-all cursor-pointer group"
                  onClick={() => handleApplyTemplate(template)}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-xl flex items-center justify-center text-3xl">
                      {template.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold group-hover:text-emerald-400 transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-sm text-zinc-500">{template.tasks.length} tasks</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {template.tasks.slice(0, 3).map((task, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-zinc-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                        {task}
                      </div>
                    ))}
                    {template.tasks.length > 3 && (
                      <div className="text-xs text-zinc-600 ml-4">
                        +{template.tasks.length - 3} more...
                      </div>
                    )}
                  </div>

                  <button className="mt-4 w-full py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors font-medium text-sm">
                    Apply Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayView;
