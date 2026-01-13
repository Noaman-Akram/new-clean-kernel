

import React, { useState, useEffect, useRef } from 'react';
import { AppState, Page, Task, TaskStatus, Category, Client, Transaction, ChatMessage, Note, Resource, MarketingItem, Activity, TaskSlot, Pillar, HorizonGoal, Account, WorkoutSession, WorkoutTemplate, TemplateExercise, Exercise, DayMeta } from './types';
import { applyRemoteState, getClientId, getSnapshotMeta, loadState, saveState, setCurrentUser, subscribeToRemoteState, SnapshotMeta } from './services/storageService';
import { auth } from './services/firebase';
import { generateId } from './utils';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import {
  LayoutGrid,
  Layers,
  Users,
  CreditCard,
  Hexagon,
  MessageSquare,
  Square,
  CheckSquare,
  Timer as TimerIcon,
  BookOpen,
  StickyNote,
  Container,
  Loader2,
  Megaphone,
  MapPin,
  Dumbbell,
  Calendar
} from 'lucide-react';

// Views
import DashboardView from './components/DashboardView';
import CRMView from './components/CRMView';
import NetworkView from './components/NetworkView';
import LedgerView from './components/LedgerView';
import MentorView from './components/MentorView';
import SupplicationsView from './components/SupplicationsView';
import NotesView from './components/NotesView';
import ResourcesView from './components/ResourcesView';
import MarketingView from './components/MarketingView';
import ActivitiesView from './components/ActivitiesView';
import WeeklyPlannerView from './components/WeeklyPlannerView';
import DayView from './components/DayView';
import GymView from './components/GymView';

const App: React.FC = () => {
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>(() => localStorage.getItem('noeman_auth_email') || '');
  const [password, setPassword] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const expectedUid = import.meta.env.VITE_FIREBASE_USER_UID as string | undefined;

  // UI State - Local Only (Not Synced)
  const [currentPage, setCurrentPage] = useState<Page>(Page.COCKPIT);
  const [showBackupMenu, setShowBackupMenu] = useState(false);

  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'ERROR' | 'SYNCED'>('IDLE');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [lastRemoteAt, setLastRemoteAt] = useState<number | null>(null);
  const [hoveredNav, setHoveredNav] = useState<{ label: string, top: number } | null>(null);
  const pendingRemoteRef = useRef<{ state: AppState; meta: SnapshotMeta } | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const isDirtyRef = useRef(false);
  const hasHydratedRef = useRef(false);
  const lastRemoteVersionRef = useRef(0);

  // --- AUTH ---
  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      setAuthUser(null);
      setCurrentUser(null);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && expectedUid && user.uid !== expectedUid) {
        setAuthError('This account is not authorized for this app.');
        signOut(auth).catch(() => undefined);
        setAuthUser(null);
        setAuthReady(true);
        return;
      }
      setAuthUser(user);
      setAuthReady(true);
      setCurrentUser(user?.uid || null);
    });

    return () => unsubscribe();
  }, [expectedUid]);

  // --- INITIALIZATION & REAL-TIME SYNC ---
  useEffect(() => {
    if (!authReady) return;
    if (auth && !authUser) {
      setLoading(false);
      return;
    }

    const init = async () => {
      setLoading(true);
      const data = await loadState();
      setState(data);
      lastRemoteVersionRef.current = getSnapshotMeta().version;

      // Load local view preference if exists
      const savedPage = localStorage.getItem('noeman_local_page');
      if (savedPage && Object.values(Page).includes(savedPage as Page)) {
        setCurrentPage(savedPage as Page);
      }

      setLoading(false);
    };

    init();
  }, [authReady, authUser]);

  useEffect(() => {
    if (!authUser) return;
    const unsubscribe = subscribeToRemoteState((remoteState, meta) => {
      const clientId = getClientId();
      if (meta.clientId && meta.clientId === clientId) return;
      const localVersion = getSnapshotMeta().version;
      if (meta.version && meta.version <= localVersion) return;
      if (meta.version && meta.version <= lastRemoteVersionRef.current) return;
      if (isDirtyRef.current) {
        pendingRemoteRef.current = { state: remoteState, meta };
        return;
      }
      isApplyingRemoteRef.current = true;
      lastRemoteVersionRef.current = meta.version || lastRemoteVersionRef.current;
      applyRemoteState(remoteState, meta);
      setState(remoteState);
      setSyncStatus('SYNCED');
      setLastRemoteAt(meta.updatedAt || Date.now());
      setTimeout(() => setSyncStatus('IDLE'), 2000);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [authUser]);

  // --- PERSISTENCE ---
  useEffect(() => {
    if (!state || loading) return;
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      return;
    }
    if (isApplyingRemoteRef.current) {
      isApplyingRemoteRef.current = false;
      return;
    }

    isDirtyRef.current = true;
    setSyncStatus('SAVING');
    // We debounce save to avoid spamming the DB on every keystroke
    const timer = setTimeout(async () => {
      try {
        await saveState(state);
        setSyncStatus('SAVED');
        setLastSavedAt(Date.now());
        setTimeout(() => setSyncStatus('IDLE'), 2000);
      } catch (e) {
        console.error('Sync error:', e);
        setSyncStatus('ERROR');
      } finally {
        isDirtyRef.current = false;
        if (pendingRemoteRef.current) {
          const pending = pendingRemoteRef.current;
          pendingRemoteRef.current = null;
          const localVersion = getSnapshotMeta().version;
          if (!pending.meta.version || pending.meta.version <= localVersion) {
            return;
          }
          isApplyingRemoteRef.current = true;
          lastRemoteVersionRef.current = pending.meta.version || lastRemoteVersionRef.current;
          applyRemoteState(pending.state, pending.meta);
          setState(pending.state);
          setSyncStatus('SYNCED');
          setLastRemoteAt(pending.meta.updatedAt || Date.now());
          setTimeout(() => setSyncStatus('IDLE'), 2000);
        }
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [state, loading]);

  // --- ACTIONS ---

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    localStorage.setItem('noeman_local_page', page);
  };

  const handleTaskAdd = (
    title: string,
    category: Category,
    impact: 'LOW' | 'MED' | 'HIGH',
    options?: any
  ) => {
    const newTask: Task = {
      id: generateId(),
      title,
      status: options?.status ?? TaskStatus.TODO,
      category,
      createdAt: Date.now(),
      impact
    };
    if (options?.deadline) newTask.deadline = options.deadline;
    if (options?.scheduledTime) newTask.scheduledTime = options.scheduledTime;
    if (options?.slot) newTask.slot = options.slot;
    if (options?.pillar) newTask.pillar = options.pillar;
    if (options?.dockSection) newTask.dockSection = options.dockSection;
    if (options?.urgent) newTask.urgent = options.urgent;
    if (options?.duration) newTask.duration = options.duration;
    if (options?.templateSteps) newTask.templateSteps = options.templateSteps;
    if (options?.habitTracking) newTask.habitTracking = options.habitTracking;
    if (options?.parentProject) newTask.parentProject = options.parentProject;

    setState(prev => prev ? ({ ...prev, tasks: [newTask, ...prev.tasks] }) : null);
  };

  const handleTaskUpdate = (id: string, updates: Partial<Task>) => {
    setState(prev => prev ? ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
    }) : null);
  };

  const handleClientUpdate = (id: string, updates: Partial<Client>) => {
    setState(prev => prev ? ({
      ...prev,
      clients: prev.clients.map(c => c.id === id ? { ...c, ...updates } : c)
    }) : null);
  };

  const handleClientAdd = (client: Client) => {
    setState(prev => prev ? ({ ...prev, clients: [client, ...prev.clients] }) : null);
  }

  const handleClientDelete = (id: string) => {
    setState(prev => prev ? ({ ...prev, clients: prev.clients.filter(c => c.id !== id) }) : null);
  }

  const handleTransactionAdd = (tx: Transaction) => {
    setState(prev => prev ? ({ ...prev, transactions: [tx, ...prev.transactions] }) : null);
  }

  const handleTransactionDelete = (id: string) => {
    setState(prev => prev ? ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }) : null);
  }

  const handleAccountAdd = (account: Account) => {
    setState(prev => prev ? ({ ...prev, accounts: [...prev.accounts, account] }) : null);
  }

  const handleAccountUpdate = (id: string, updates: Partial<Account>) => {
    setState(prev => prev ? ({
      ...prev,
      accounts: prev.accounts.map(a => a.id === id ? { ...a, ...updates } : a)
    }) : null);
  }

  const handleAccountDelete = (id: string) => {
    setState(prev => prev ? ({
      ...prev,
      accounts: prev.accounts.filter(a => a.id !== id)
    }) : null);
  }

  const handleNoteUpdate = (id: string, updates: Partial<Note>) => {
    setState(prev => prev ? ({
      ...prev,
      notes: prev.notes.map(n => n.id === id ? { ...n, ...updates } : n)
    }) : null);
  };

  const handleNoteAdd = (note: Note) => {
    setState(prev => prev ? ({ ...prev, notes: [note, ...prev.notes] }) : null);
  };

  const handleResourceAdd = (res: Resource) => {
    setState(prev => prev ? ({ ...prev, resources: [res, ...prev.resources] }) : null);
  };

  const handleResourceUpdate = (id: string, updates: Partial<Resource>) => {
    setState(prev => prev ? ({
      ...prev,
      resources: prev.resources.map(r => r.id === id ? { ...r, ...updates } : r)
    }) : null);
  };

  const handleResourceDelete = (id: string) => {
    setState(prev => prev ? ({
      ...prev,
      resources: prev.resources.filter(r => r.id !== id)
    }) : null);
  };

  const handleMarketingUpdate = (id: string, updates: Partial<MarketingItem>) => {
    setState(prev => prev ? ({
      ...prev,
      marketing: prev.marketing.map(m => m.id === id ? { ...m, ...updates } : m)
    }) : null);
  };

  const handleMarketingAdd = (item: MarketingItem) => {
    setState(prev => prev ? ({ ...prev, marketing: [item, ...prev.marketing] }) : null);
  };

  const handleMarketingDelete = (id: string) => {
    setState(prev => prev ? ({
      ...prev,
      marketing: prev.marketing.filter(m => m.id !== id)
    }) : null);
  };

  const handleActivityAdd = (activity: Omit<Activity, 'id'>) => {
    const newActivity: Activity = { id: generateId(), ...activity };
    setState(prev => prev ? ({ ...prev, activities: [newActivity, ...prev.activities] }) : null);
  };

  const handleActivityUpdate = (id: string, updates: Partial<Activity>) => {
    setState(prev => prev ? ({
      ...prev,
      activities: prev.activities.map(act => act.id === id ? { ...act, ...updates } : act)
    }) : null);
  };

  const handleActivityRemove = (id: string) => {
    setState(prev => prev ? ({
      ...prev,
      activities: prev.activities.filter(act => act.id !== id)
    }) : null);
  };

  // Workout Template Handlers
  const handleCreateTemplate = (template: WorkoutTemplate) => {
    setState(prev => prev ? ({
      ...prev,
      workoutTemplates: [...prev.workoutTemplates, template]
    }) : null);
  };

  const handleUpdateTemplate = (template: WorkoutTemplate) => {
    setState(prev => prev ? ({
      ...prev,
      workoutTemplates: prev.workoutTemplates.map(t => t.id === template.id ? template : t)
    }) : null);
  };

  const handleDeleteTemplate = (templateId: string) => {
    setState(prev => prev ? ({
      ...prev,
      workoutTemplates: prev.workoutTemplates.filter(t => t.id !== templateId)
    }) : null);
  };

  // Workout Session Handlers
  const handleStartWorkout = (template?: WorkoutTemplate) => {
    const newSession: WorkoutSession = {
      id: generateId(),
      templateId: template?.id,
      templateName: template?.name,
      startTime: Date.now(),
      exercises: [],
      isActive: true
    };

    // Update template's lastUsed time
    if (template) {
      handleUpdateTemplate({ ...template, lastUsed: Date.now() });
    }

    setState(prev => prev ? ({
      ...prev,
      workoutSessions: [newSession, ...prev.workoutSessions]
    }) : null);
  };

  const handleEndWorkout = (session: WorkoutSession) => {
    setState(prev => prev ? ({
      ...prev,
      workoutSessions: prev.workoutSessions.map(s => s.id === session.id ? session : s)
    }) : null);
  };

  const handleUpdateWorkout = (session: WorkoutSession) => {
    setState(prev => prev ? ({
      ...prev,
      workoutSessions: prev.workoutSessions.map(s => s.id === session.id ? session : s)
    }) : null);
  };

  const handleAddExercise = (exercise: Exercise) => {
    setState(prev => prev ? ({
      ...prev,
      exercises: [...prev.exercises, exercise]
    }) : null);
  };

  const handlePrayerToggle = (key: string) => {
    setState(prev => prev ? ({
      ...prev,
      prayerLog: { ...prev.prayerLog, [key]: !prev.prayerLog[key] }
    }) : null);
  };
  const handleAdhkarToggle = (key: string) => {
    setState(prev => prev ? ({
      ...prev,
      adhkarLog: { ...(prev.adhkarLog || {}), [key]: !prev.adhkarLog?.[key] }
    }) : null);
  };

  const handleChatUpdate = (newHistory: ChatMessage[]) => {
    setState(prev => prev ? ({ ...prev, chatHistory: newHistory }) : null);
  };

  // --- SESSION CONTROL ---

  const startSession = (taskId: string) => {
    setState(prev => prev ? ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, status: TaskStatus.IN_PROGRESS } : t),
      activeSession: { taskId, startTime: Date.now() }
    }) : null);
  };

  const completeSession = () => {
    if (!state) return;
    const { taskId } = state.activeSession;
    if (taskId) {
      setState(prev => prev ? ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? { ...t, status: TaskStatus.DONE } : t),
        activeSession: { taskId: null, startTime: null }
      }) : null);
    }
  };

  const handleHorizonGoalAdd = (title: string) => {
    const newGoal: HorizonGoal = { id: generateId(), title, progress: 0 };
    setState(prev => prev ? ({ ...prev, horizonGoals: [...prev.horizonGoals, newGoal] }) : null);
  };

  const handleHorizonGoalUpdate = (id: string, updates: Partial<HorizonGoal>) => {
    setState(prev => prev ? ({
      ...prev,
      horizonGoals: prev.horizonGoals.map(g => g.id === id ? { ...g, ...updates } : g)
    }) : null);
  };

  const stopSession = () => {
    setState(prev => prev ? ({
      ...prev,
      activeSession: { taskId: null, startTime: null }
    }) : null);
  };

  const handleTaskDelete = (id: string) => {
    setState(prev => prev ? ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== id)
    }) : null);
  };

  const handleStickyNoteUpdate = (dateKey: string, content: string) => {
    setState(prev => prev ? ({
      ...prev,
      stickyNotes: { ...(prev.stickyNotes || {}), [dateKey]: content }
    }) : null);
  };

  const handleDayMetaUpdate = (dateKey: string, updates: Partial<DayMeta>) => {
    setState(prev => prev ? ({
      ...prev,
      dayMeta: {
        ...(prev.dayMeta || {}),
        [dateKey]: {
          ...(prev.dayMeta?.[dateKey] || {}),
          ...updates
        }
      }
    }) : null);
  };

  // --- BACKUP UTILS ---
  const handleExportBackup = () => {
    if (!state) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "noeman_backup_" + new Date().toISOString() + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files.length > 0) {
      fileReader.readAsText(event.target.files[0], "UTF-8");
      fileReader.onload = async (e) => {
        if (e.target?.result) {
          try {
            const parsed = JSON.parse(e.target.result as string);
            // Basic validation
            if (parsed.tasks && parsed.metrics) {
              await saveState(parsed); // Save to DB
              setState(parsed); // Update UI
              alert("Backup restored successfully!");
            } else {
              alert("Invalid backup file format.");
            }
          } catch (err) {
            console.error(err);
            alert("Failed to parse backup file.");
          }
        }
      };
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setAuthError('Firebase auth is not configured.');
      return;
    }
    if (!email.trim() || !password) return;
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      localStorage.setItem('noeman_auth_email', email.trim());
      setPassword('');
    } catch (error: any) {
      setAuthError(error?.message || 'Login failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const formatSyncTime = (time: number | null) => {
    if (!time) return '';
    return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const syncLabel = () => {
    if (!auth) return 'LOCAL ONLY';
    if (!authUser) return 'SIGNED OUT';
    if (syncStatus === 'SAVING') return 'Saving...';
    if (syncStatus === 'ERROR') return 'Sync error';
    if (syncStatus === 'SYNCED' && lastRemoteAt) return `Remote ${formatSyncTime(lastRemoteAt)}`;
    if (lastSavedAt) return `Saved ${formatSyncTime(lastSavedAt)}`;
    return 'Up to date';
  };

  const syncLabelShort = () => {
    if (!auth) return 'LOCAL';
    if (!authUser) return 'OUT';
    if (syncStatus === 'SAVING') return 'SAVE';
    if (syncStatus === 'ERROR') return 'ERR';
    if (syncStatus === 'SYNCED') return 'REMOTE';
    if (lastSavedAt) return 'SAVED';
    return 'OK';
  };


  // --- RENDER ---

  const renderView = () => {
    if (!state) return null;

    const viewProps = {
      state,
      onTaskUpdate: handleTaskUpdate,
      onStartSession: startSession,
      activeTaskId: state.activeSession.taskId
    };

    switch (currentPage) {
      case Page.COCKPIT:
        return <DashboardView
          {...viewProps}
          onPrayerToggle={handlePrayerToggle}
          onAdhkarToggle={handleAdhkarToggle}
          onTaskAdd={handleTaskAdd}
          onNoteAdd={handleNoteAdd}
          onNoteUpdate={handleNoteUpdate}
          onNavigate={handleNavigate}
        />;
      case Page.WEEKLY:
        return (
          <WeeklyPlannerView
            state={state}
            onUpdate={handleTaskUpdate}
            onStartSession={startSession}
            activeTaskId={state.activeSession.taskId}
            onAdd={handleTaskAdd}
            onDelete={handleTaskDelete}
            onStickyNoteUpdate={handleStickyNoteUpdate}
            onDayMetaUpdate={handleDayMetaUpdate}
            onPrayerToggle={handlePrayerToggle}
            onAdhkarToggle={handleAdhkarToggle}
            onDelete={handleTaskDelete}
          />
        );
      case Page.CRM:
        return <CRMView state={state} onUpdate={handleClientUpdate} onAdd={handleClientAdd} onDelete={handleClientDelete} />;
      case Page.NETWORK:
        // Use NetworkView for Personal Context
        return <NetworkView state={state} onUpdate={handleClientUpdate} onAdd={handleClientAdd} onAddTransaction={handleTransactionAdd} />;
      case Page.LEDGER:
        return <LedgerView
          state={state}
          onAdd={handleTransactionAdd}
          onAddAccount={handleAccountAdd}
          onUpdateAccount={handleAccountUpdate}
          onDeleteAccount={handleAccountDelete}
          onDeleteTransaction={handleTransactionDelete}
        />;
      case Page.MARKETING:
        return <MarketingView state={state} onAdd={handleMarketingAdd} onUpdate={handleMarketingUpdate} onDelete={handleMarketingDelete} />;
      case Page.MENTOR:
        return <MentorView
          state={state}
          onChatUpdate={handleChatUpdate}
          onAddGoal={handleHorizonGoalAdd}
          onUpdateGoal={handleHorizonGoalUpdate}
        />;
      case Page.SUPPLICATIONS:
        return <SupplicationsView state={state} onPrayerToggle={handlePrayerToggle} onAdhkarToggle={handleAdhkarToggle} />;
      case Page.INTEL:
        return <NotesView state={state} onUpdate={handleNoteUpdate} onAdd={handleNoteAdd} />;
      case Page.ARSENAL:
        return <ResourcesView state={state} onAdd={handleResourceAdd} onUpdate={handleResourceUpdate} onRemove={handleResourceDelete} />;
      case Page.ACTIVITIES:
        return (
          <ActivitiesView
            state={state}
            onAdd={handleActivityAdd}
            onUpdate={handleActivityUpdate}
            onRemove={handleActivityRemove}
          />
        );
      case Page.GYM:
        return <GymView
          state={state}
          onStartSession={handleStartWorkout}
          onEndSession={handleEndWorkout}
          onUpdateSession={handleUpdateWorkout}
          onCreateTemplate={handleCreateTemplate}
          onUpdateTemplate={handleUpdateTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          onAddExercise={handleAddExercise}
        />;
      default:
        return <DashboardView {...viewProps} onPrayerToggle={handlePrayerToggle} onAdhkarToggle={handleAdhkarToggle} onTaskAdd={handleTaskAdd} />;
    }
  };

  // Calculate Session Time
  const [sessionTime, setSessionTime] = useState("00:00");
  useEffect(() => {
    let interval: any;
    if (state?.activeSession?.startTime) {
      interval = setInterval(() => {
        const diff = Math.floor((Date.now() - state.activeSession.startTime!) / 1000);
        const m = Math.floor(diff / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        setSessionTime(`${m}:${s}`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [state?.activeSession?.startTime]);

  if (!authReady) {
    return (
      <div className="h-screen w-screen bg-background flex flex-col items-center justify-center text-zinc-500 gap-4">
        <Loader2 size={32} className="animate-spin text-zinc-400" />
        <div className="text-xs font-mono uppercase tracking-widest">Auth Initializing...</div>
      </div>
    );
  }

  if (auth && !authUser) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center text-zinc-300">
        <div className="w-full max-w-sm bg-surface border border-border rounded-lg p-6 shadow-2xl">
          <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-3">Secure Access</div>
          <div className="text-lg font-semibold text-zinc-100 mb-6">Sign in to your kernel</div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-600"
                placeholder="you@email.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-600"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
            {authError && (
              <div className="text-[11px] text-red-400 font-mono">{authError}</div>
            )}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2 rounded-md bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading || !state) {
    return (
      <div className="h-screen w-screen bg-background flex flex-col items-center justify-center text-zinc-500 gap-4">
        <Loader2 size={32} className="animate-spin text-zinc-400" />
        <div className="text-xs font-mono uppercase tracking-widest">System Initializing...</div>
      </div>
    )
  }

  const activeTask = state.tasks.find(t => t.id === state.activeSession.taskId);


  return (
    <div className="flex h-screen w-screen bg-background text-zinc-400 font-sans overflow-hidden selection:bg-zinc-700 selection:text-zinc-200">

      {/* --- SIDEBAR (DESKTOP) --- */}
      <nav className="hidden md:flex h-full w-[64px] flex-col items-center py-6 border-r border-border bg-surface z-50 flex-shrink-0 overflow-x-hidden">

        {/* Brand */}
        <div className="mb-8 text-zinc-100 opacity-80 hover:opacity-100 transition-opacity cursor-pointer flex flex-col items-center gap-1" onClick={() => handleNavigate(Page.COCKPIT)}>
          <Hexagon size={22} strokeWidth={2} />
        </div>

        {/* Navigation */}
        <div className="flex-1 flex flex-col gap-2 w-full items-center px-3 overflow-y-auto no-scrollbar pb-4 min-h-0">
          {/* COMMAND CENTER */}
          <NavIcon
            active={currentPage === Page.COCKPIT}
            onClick={() => handleNavigate(Page.COCKPIT)}
            icon={<LayoutGrid size={18} />}
            label="Cockpit"
            setHover={setHoveredNav}
          />
          <div className="h-px w-3/4 bg-border my-1 opacity-50 shrink-0"></div>

          {/* PLANNING & EXECUTION */}
          <NavIcon
            active={currentPage === Page.WEEKLY}
            onClick={() => handleNavigate(Page.WEEKLY)}
            icon={<Layers size={18} />}
            label="Planner"
            setHover={setHoveredNav}
          />
          <NavIcon
            active={currentPage === Page.MENTOR}
            onClick={() => handleNavigate(Page.MENTOR)}
            icon={<MessageSquare size={18} />}
            label="Protocol"
            setHover={setHoveredNav}
          />
          <NavIcon
            active={currentPage === Page.ACTIVITIES}
            onClick={() => handleNavigate(Page.ACTIVITIES)}
            icon={<MapPin size={18} />}
            label="Activities"
            setHover={setHoveredNav}
          />
          <NavIcon
            active={currentPage === Page.GYM}
            onClick={() => handleNavigate(Page.GYM)}
            icon={<Dumbbell size={18} />}
            label="Gym"
            setHover={setHoveredNav}
          />
          <div className="h-px w-3/4 bg-border my-1 opacity-50 shrink-0"></div>

          {/* BUSINESS OPS */}
          <NavIcon
            active={currentPage === Page.CRM}
            onClick={() => handleNavigate(Page.CRM)}
            icon={<Users size={18} />}
            label="Relationships"
            setHover={setHoveredNav}
          />
          <NavIcon
            active={currentPage === Page.MARKETING}
            onClick={() => handleNavigate(Page.MARKETING)}
            icon={<Megaphone size={18} />}
            label="Marketing"
            setHover={setHoveredNav}
          />
          <NavIcon
            active={currentPage === Page.LEDGER}
            onClick={() => handleNavigate(Page.LEDGER)}
            icon={<CreditCard size={18} />}
            label="Ledger"
            setHover={setHoveredNav}
          />
          <div className="h-px w-3/4 bg-border my-1 opacity-50 shrink-0"></div>

          {/* KNOWLEDGE & GROWTH */}
          <NavIcon
            active={currentPage === Page.SUPPLICATIONS}
            onClick={() => handleNavigate(Page.SUPPLICATIONS)}
            icon={<BookOpen size={18} />}
            label="Sanctuary"
            setHover={setHoveredNav}
          />
          <NavIcon
            active={currentPage === Page.INTEL}
            onClick={() => handleNavigate(Page.INTEL)}
            icon={<StickyNote size={18} />}
            label="Intel"
            setHover={setHoveredNav}
          />
          <NavIcon
            active={currentPage === Page.ARSENAL}
            onClick={() => handleNavigate(Page.ARSENAL)}
            icon={<Container size={18} />}
            label="Arsenal"
            setHover={setHoveredNav}
          />
        </div>

        <div className="mt-auto flex flex-col gap-4 items-center">
          <div className="w-6 h-6 rounded bg-zinc-800 border border-border flex items-center justify-center text-[10px] font-mono text-zinc-500 cursor-default">
            NK
          </div>
        </div>

      </nav>

      {/* GLOBAL TOOLTIP LAYER (Desktop Only) */}
      {hoveredNav && (
        <div
          className="fixed left-[70px] bg-surface border border-border text-zinc-200 text-[10px] font-medium px-2 py-1 rounded shadow-xl z-[100] animate-in fade-in zoom-in-95 duration-150 pointer-events-none whitespace-nowrap hidden md:block"
          style={{ top: hoveredNav.top }}
        >
          {hoveredNav.label}
        </div>
      )}

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col min-w-0 bg-background relative overflow-hidden h-[calc(100vh-64px)] md:h-screen">
        {/* Top Bar */}
        <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-background/60 backdrop-blur-xl sticky top-0 z-40">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span className="text-zinc-300 font-medium">{currentPage}</span>
            <span className="opacity-30">/</span>
            <span>{authUser ? 'CLOUD_SYNC' : 'LOCAL_ENV'}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* BACKUP MENU */}
            <div className="relative">
              <button onClick={() => setShowBackupMenu(!showBackupMenu)} className="text-[10px] text-zinc-500 hover:text-zinc-300 px-2 font-mono uppercase tracking-wider">
                Backup
              </button>
              {showBackupMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-md shadow-xl z-50 p-1 flex flex-col gap-1">
                  <button onClick={handleExportBackup} className="text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 rounded">
                    Download JSON
                  </button>
                  <label className="text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 rounded cursor-pointer">
                    Restore form JSON
                    <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                  </label>
                </div>
              )}
            </div>

            {/* Sync Indicator */}
            {!loading && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-surface border border-border rounded text-[10px] font-mono">
                <div className={`w-1.5 h-1.5 rounded-full ${!authUser ? 'bg-zinc-600' :
                  syncStatus === 'SAVING' ? 'bg-amber-500 animate-pulse' :
                    syncStatus === 'SAVED' || syncStatus === 'SYNCED' ? 'bg-emerald-500' :
                      syncStatus === 'ERROR' ? 'bg-red-500' :
                        'bg-zinc-600'
                  }`} />
                <span className="text-zinc-500 hidden sm:inline">
                  {syncLabel()}
                </span>
                <span className="text-zinc-500 sm:hidden">
                  {syncLabelShort()}
                </span>
              </div>
            )}

            {activeTask && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/30 border border-emerald-500/20 text-[10px] text-emerald-500 font-mono animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span className="hidden sm:inline">ACTIVE_SESSION</span>
                <span className="sm:hidden">ACTIVE</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative pb-20 md:pb-0">
          {renderView()}
        </div>

        {/* --- GLOBAL ACTIVE SESSION BAR --- */}
        {activeTask && (
          <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 animate-fade-in w-[95%] sm:w-auto">
            <div className="flex items-center justify-between sm:justify-center gap-2 sm:gap-4 p-2 pl-3 sm:pl-5 pr-2 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/50 rounded-full shadow-2xl shadow-black/50">

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <TimerIcon size={12} className="text-emerald-500" />
                  <span className="text-lg font-mono font-medium text-emerald-400 tabular-nums w-[60px]">
                    {sessionTime}
                  </span>
                </div>
              </div>

              <div className="h-8 w-px bg-zinc-700/50 mx-1 hidden sm:block"></div>

              <div className="hidden sm:flex flex-col max-w-[200px]">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Focusing on</span>
                <span className="text-xs text-zinc-200 font-medium truncate">{activeTask.title}</span>
              </div>

              <div className="flex items-center gap-1 sm:ml-2">
                <button
                  onClick={stopSession}
                  className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  title="Pause"
                >
                  <Square size={14} fill="currentColor" />
                </button>
                <button
                  onClick={completeSession}
                  className="flex items-center gap-2 px-3 sm:pl-3 sm:pr-4 py-2 bg-zinc-100 text-black hover:bg-white rounded-full transition-colors"
                >
                  <CheckSquare size={14} />
                  <span className="text-xs font-semibold hidden sm:inline">Complete</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* --- MOBILE NAVIGATION BAR --- */}
      <div className="md:hidden h-[64px] bg-surface border-t border-border flex items-center justify-around px-2 z-50 fixed bottom-0 left-0 right-0 pb-safe">
        <MobileNavIcon active={currentPage === Page.COCKPIT} onClick={() => handleNavigate(Page.COCKPIT)} icon={<LayoutGrid size={20} />} label="Cockpit" />
        <MobileNavIcon active={currentPage === Page.WEEKLY} onClick={() => handleNavigate(Page.WEEKLY)} icon={<Layers size={20} />} label="Planner" />
        <MobileNavIcon active={currentPage === Page.LEDGER} onClick={() => handleNavigate(Page.LEDGER)} icon={<CreditCard size={20} />} label="Ledger" />
        <MobileNavIcon active={currentPage === Page.MARKETING} onClick={() => handleNavigate(Page.MARKETING)} icon={<Megaphone size={20} />} label="Marketing" />

        {/* Mobile Menu for 'More' */}
        <div className="relative group">
          <MobileNavIcon
            active={[Page.NETWORK, Page.MENTOR, Page.SUPPLICATIONS, Page.INTEL, Page.ARSENAL, Page.ACTIVITIES].includes(currentPage)}
            onClick={() => { }} // Just visual indicator, usually would toggle a menu
            icon={<Users size={20} />}
            label="More"
          />
          {/* Simple dropdown for mobile 'More' - simplified for this iteration, strictly could rely on specific icons if space permits, 
               but let's actually just list the most critical ones or make it scrollable. 
               Let's make it a scrollable list instead of a 'More' button for better UX if we have many items.
           */}
        </div>
      </div>

      {/* Redoing Mobile Nav to be scrollable horizontal list instead of "More" menu for simplicity and speed */}
      <div className="md:hidden h-[64px] bg-surface border-t border-border flex items-center gap-4 px-4 overflow-x-auto no-scrollbar z-50 fixed bottom-0 left-0 right-0 pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
        <MobileNavIcon active={currentPage === Page.COCKPIT} onClick={() => handleNavigate(Page.COCKPIT)} icon={<LayoutGrid size={20} />} label="Cockpit" />
        <MobileNavIcon active={currentPage === Page.WEEKLY} onClick={() => handleNavigate(Page.WEEKLY)} icon={<Layers size={20} />} label="Planner" />
        <MobileNavIcon active={currentPage === Page.LEDGER} onClick={() => handleNavigate(Page.LEDGER)} icon={<CreditCard size={20} />} label="Ledger" />
        <MobileNavIcon active={currentPage === Page.MARKETING} onClick={() => handleNavigate(Page.MARKETING)} icon={<Megaphone size={20} />} label="Mktg" />
        <MobileNavIcon active={currentPage === Page.NETWORK} onClick={() => handleNavigate(Page.NETWORK)} icon={<Users size={20} />} label="Network" />
        <MobileNavIcon active={currentPage === Page.MENTOR} onClick={() => handleNavigate(Page.MENTOR)} icon={<MessageSquare size={20} />} label="Protocol" />
        <MobileNavIcon active={currentPage === Page.SUPPLICATIONS} onClick={() => handleNavigate(Page.SUPPLICATIONS)} icon={<BookOpen size={20} />} label="Sanctuary" />
        <MobileNavIcon active={currentPage === Page.INTEL} onClick={() => handleNavigate(Page.INTEL)} icon={<StickyNote size={20} />} label="Intel" />
        <MobileNavIcon active={currentPage === Page.GYM} onClick={() => handleNavigate(Page.GYM)} icon={<Dumbbell size={20} />} label="Gym" />
      </div>

    </div>
  );
};

const NavIcon = ({ active, onClick, icon, label, setHover }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, setHover: (val: { label: string, top: number } | null) => void }) => (
  <button
    onClick={onClick}
    onMouseEnter={(e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setHover({ label, top: rect.top + (rect.height / 2) - 10 }); // Center vertically
    }}
    onMouseLeave={() => setHover(null)}
    className={`
            group relative w-9 h-9 flex items-center justify-center rounded-md transition-all duration-200 flex-shrink-0
            ${active
        ? 'bg-emerald-950/30 text-emerald-400 shadow-sm border border-emerald-900/30'
        : 'text-zinc-500 hover:text-zinc-300 hover:bg-surface'}
        `}
  >
    {icon}
    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 w-1 h-5 bg-emerald-500 rounded-r-full shadow-glow" />}
  </button>
);

const MobileNavIcon = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button
    onClick={onClick}
    className={`
       flex flex-col items-center justify-center gap-1 min-w-[50px]
       ${active ? 'text-emerald-400' : 'text-zinc-500'}
    `}
  >
    <div className={`${active ? 'bg-emerald-950/50 rounded-xl px-3 py-1' : ''}`}>
      {icon}
    </div>
    <span className="text-[9px] font-mono uppercase tracking-wider">{label}</span>
  </button>
);

export default App;
