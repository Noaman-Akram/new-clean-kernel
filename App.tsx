

import React, { useState, useEffect } from 'react';
import { AppState, Page, Task, TaskStatus, Category, Client, Transaction, ChatMessage, Note, Resource, MarketingItem, Activity, TaskSlot, Pillar, HorizonGoal, Account } from './types';
import { loadState, saveState, subscribeToState } from './services/storageService';
import { db } from './services/firebase';
import { generateId } from './utils';
import { Unsubscribe } from 'firebase/firestore';
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
  MapPin
} from 'lucide-react';

// Views
import DashboardView from './components/DashboardView';
import NetworkView from './components/NetworkView';
import LedgerView from './components/LedgerView';
import MentorView from './components/MentorView';
import SupplicationsView from './components/SupplicationsView';
import NotesView from './components/NotesView';
import ResourcesView from './components/ResourcesView';
import MarketingView from './components/MarketingView';
import ActivitiesView from './components/ActivitiesView';
import WeeklyPlannerView from './components/WeeklyPlannerView';

const App: React.FC = () => {
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);

  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'>('IDLE');
  const [hoveredNav, setHoveredNav] = useState<{ label: string, top: number } | null>(null);

  // --- INITIALIZATION & REAL-TIME SYNC ---
  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;

    const init = async () => {
      // 1. Initial Load (Fast)
      const data = await loadState();
      setState(data);
      setLoading(false);

      // 2. Real-time Subscription (Live)
      if (db) {
        unsubscribe = subscribeToState((newState) => {
          setState(newState);
          // Visual feedback that update came from cloud
          setSyncStatus('SYNCED');
          setTimeout(() => setSyncStatus('IDLE'), 2000);
        });
      }
    };
    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // --- PERSISTENCE ---
  useEffect(() => {
    if (state && !loading) {
      setSyncStatus('SAVING');
      // We debounce save to avoid spamming the DB on every keystroke
      const timer = setTimeout(async () => {
        try {
          await saveState(state);
          setSyncStatus('SAVED');
          setTimeout(() => setSyncStatus('IDLE'), 2000);
        } catch (e) {
          setSyncStatus('ERROR');
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state, loading]);

  // --- ACTIONS ---

  const handleNavigate = (page: Page) => {
    setState(prev => prev ? ({ ...prev, currentPage: page }) : null);
  };

  const handleTaskAdd = (
    title: string,
    category: Category,
    impact: 'LOW' | 'MED' | 'HIGH',
    options?: { deadline?: number; slot?: TaskSlot; pillar?: Pillar; status?: TaskStatus; scheduledTime?: number }
  ) => {
    const newTask: Task = {
      id: generateId(),
      title,
      status: options?.status ?? TaskStatus.TODO, // Default to TODO if not provided
      category,
      createdAt: Date.now(),
      impact
    };
    if (options?.deadline) {
      newTask.deadline = options.deadline;
    }
    if (options?.scheduledTime) {
      newTask.scheduledTime = options.scheduledTime;
    }
    if (options?.slot) {
      newTask.slot = options.slot;
    }
    if (options?.pillar) {
      newTask.pillar = options.pillar;
    }
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

  // --- RENDER ---

  const renderView = () => {
    if (!state) return null;

    const viewProps = {
      state,
      onTaskUpdate: handleTaskUpdate,
      onStartSession: startSession,
      activeTaskId: state.activeSession.taskId
    };

    switch (state.currentPage) {
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
          />
        );
      case Page.NETWORK:
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

      {/* --- SIDEBAR --- */}
      <nav className="h-full w-[64px] flex flex-col items-center py-6 border-r border-border bg-surface z-50 flex-shrink-0 overflow-x-hidden">

        {/* Brand */}
        <div className="mb-8 text-zinc-100 opacity-80 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => handleNavigate(Page.COCKPIT)}>
          <Hexagon size={22} strokeWidth={2} />
        </div>

        {/* Navigation */}
        <div className="flex-1 flex flex-col gap-2 w-full items-center px-3 overflow-y-auto no-scrollbar pb-4 min-h-0">
          {/* COMMAND CENTER */}
          <NavIcon
            active={state.currentPage === Page.COCKPIT}
            onClick={() => handleNavigate(Page.COCKPIT)}
            icon={<LayoutGrid size={18} />}
            label="Cockpit"
            setHover={setHoveredNav}
          />
          <div className="h-px w-3/4 bg-border my-1 opacity-50 shrink-0"></div>

          {/* PLANNING & EXECUTION */}
          <NavIcon
            active={state.currentPage === Page.WEEKLY}
            onClick={() => handleNavigate(Page.WEEKLY)}
            icon={<Layers size={18} />}
            label="Weekly"
            setHover={setHoveredNav}
          />
          <NavIcon
            active={state.currentPage === Page.MENTOR}
            onClick={() => handleNavigate(Page.MENTOR)}
            icon={<MessageSquare size={18} />}
            label="Protocol"
            setHover={setHoveredNav}
          />
          <NavIcon
            active={state.currentPage === Page.ACTIVITIES}
            onClick={() => handleNavigate(Page.ACTIVITIES)}
            icon={<MapPin size={18} />}
            label="Activities"
            setHover={setHoveredNav}
          />
          <div className="h-px w-3/4 bg-border my-1 opacity-50 shrink-0"></div>

          {/* BUSINESS OPS */}
          <NavIcon
            active={state.currentPage === Page.NETWORK}
            onClick={() => handleNavigate(Page.NETWORK)}
            icon={<Users size={18} />}
            label="Network"
            setHover={setHoveredNav}
          />
          <NavIcon
            active={state.currentPage === Page.MARKETING}
            onClick={() => handleNavigate(Page.MARKETING)}
            icon={<Megaphone size={18} />}
            label="Marketing"
            setHover={setHoveredNav}
          />
          <NavIcon
            active={state.currentPage === Page.LEDGER}
            onClick={() => handleNavigate(Page.LEDGER)}
            icon={<CreditCard size={18} />}
            label="Ledger"
            setHover={setHoveredNav}
          />
          <div className="h-px w-3/4 bg-border my-1 opacity-50 shrink-0"></div>

          {/* KNOWLEDGE & GROWTH */}
          <NavIcon
            active={state.currentPage === Page.SUPPLICATIONS}
            onClick={() => handleNavigate(Page.SUPPLICATIONS)}
            icon={<BookOpen size={18} />}
            label="Sanctuary"
            setHover={setHoveredNav}
          />
          <NavIcon
            active={state.currentPage === Page.INTEL}
            onClick={() => handleNavigate(Page.INTEL)}
            icon={<StickyNote size={18} />}
            label="Intel"
            setHover={setHoveredNav}
          />
          <NavIcon
            active={state.currentPage === Page.ARSENAL}
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

      {/* GLOBAL TOOLTIP LAYER */}
      {hoveredNav && (
        <div
          className="fixed left-[70px] bg-surface border border-border text-zinc-200 text-[10px] font-medium px-2 py-1 rounded shadow-xl z-[100] animate-in fade-in zoom-in-95 duration-150 pointer-events-none whitespace-nowrap"
          style={{ top: hoveredNav.top }}
        >
          {hoveredNav.label}
        </div>
      )}

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col min-w-0 bg-background relative">
        {/* Top Bar */}
        <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-background/60 backdrop-blur-xl sticky top-0 z-40">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span className="text-zinc-300 font-medium">{state.currentPage}</span>
            <span className="opacity-30">/</span>
            <span>{db ? 'CLOUD_SYNC' : 'LOCAL_ENV'}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Sync Indicator */}
            {!loading && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-surface border border-border rounded text-[10px] font-mono">
                <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'SAVING' ? 'bg-amber-500 animate-pulse' :
                  syncStatus === 'SAVED' ? 'bg-emerald-500' :
                    syncStatus === 'ERROR' ? 'bg-red-500' :
                      'bg-zinc-600'
                  }`} />
                <span className="text-zinc-500">
                  {syncStatus === 'SAVING' ? 'SAVING...' :
                    syncStatus === 'SAVED' ? 'SYNCED' :
                      syncStatus === 'ERROR' ? 'SYNC_FAIL' : 'READY'}
                </span>
              </div>
            )}

            {activeTask && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/30 border border-emerald-500/20 text-[10px] text-emerald-500 font-mono animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                ACTIVE_SESSION
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative">
          {renderView()}
        </div>

        {/* --- GLOBAL ACTIVE SESSION BAR --- */}
        {activeTask && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
            <div className="flex items-center gap-4 p-2 pl-5 pr-2 bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 rounded-full shadow-2xl shadow-black/50">

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <TimerIcon size={12} className="text-emerald-500" />
                  <span className="text-lg font-mono font-medium text-emerald-400 tabular-nums w-[60px]">
                    {sessionTime}
                  </span>
                </div>
              </div>

              <div className="h-8 w-px bg-zinc-700/50 mx-1"></div>

              <div className="flex flex-col max-w-[200px]">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Focusing on</span>
                <span className="text-xs text-zinc-200 font-medium truncate">{activeTask.title}</span>
              </div>

              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={stopSession}
                  className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  title="Pause"
                >
                  <Square size={14} fill="currentColor" />
                </button>
                <button
                  onClick={completeSession}
                  className="flex items-center gap-2 pl-3 pr-4 py-2 bg-zinc-100 text-black hover:bg-white rounded-full transition-colors"
                >
                  <CheckSquare size={14} />
                  <span className="text-xs font-semibold">Complete</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* --- OFFLINE WARNING BANNER --- */}
      {
        !db && (
          <div className="fixed bottom-0 left-0 right-0 bg-red-600/90 text-white text-xs font-mono py-2 px-4 flex items-center justify-between z-[100] backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="font-bold">OFFLINE MODE: LOCAL DATA ONLY</span>
            </div>
            <span>You must create a .env file with firebase keys to sync with deployed site.</span>
          </div>
        )}
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

export default App;
