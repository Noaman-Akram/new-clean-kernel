
import React, { useState, useEffect, useMemo } from 'react';
import { AppState, TaskStatus, Category, Task, Page, UserPreferences, DashboardWidget, QuickActionType } from '../types';
import { getNextPrayer } from '../utils';
import {
    Target,
    ArrowUpRight,
    Zap,
    Plus,
    Play,
    Pause,
    CheckCircle2,
    Flame,
    AlertTriangle,
    Calendar,
    Layers,
    MessageSquare,
    MapPin,
    Users,
    Megaphone,
    CreditCard,
    BookOpen,
    StickyNote,
    Container,
    TrendingUp,
    TrendingDown,
    Clock,
    Settings,
    Dumbbell,
    LayoutGrid
} from 'lucide-react';
import DashboardSettings from './DashboardSettings';
import ChallengeWidget from './ChallengeWidget';
import { DEFAULT_TIME_ZONE, getDateKeyInTimeZone } from '../utils/dateTime';

interface Props {
    state: AppState;
    onTaskUpdate: (id: string, updates: Partial<Task>) => void;
    onTaskAdd: (title: string, category: Category, impact: 'LOW' | 'MED' | 'HIGH') => void;
    onPrayerToggle: (key: string) => void;
    onStartSession: (id: string) => void;
    activeTaskId: string | null;
    onNavigate?: (page: Page) => void;
    onPreferencesUpdate?: (preferences: UserPreferences) => void;
    // Challenge Props
    onStartChallenge?: () => void;
    onChallengeRuleUpdate?: (ruleId: string, completed: boolean) => void;
    onChallengeFailDay?: () => void;
}


const DashboardView: React.FC<Props> = ({
    state,
    onTaskUpdate,
    onTaskAdd,
    onPrayerToggle,
    onStartSession,
    activeTaskId,
    onNavigate,
    onPreferencesUpdate,
    onStartChallenge,
    onChallengeRuleUpdate,
    onChallengeFailDay
}) => {
    const [now, setNow] = useState(new Date());
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const nextPrayer = getNextPrayer();
    const timeZone = state.userPreferences?.timeZone || DEFAULT_TIME_ZONE;
    const todayKey = getDateKeyInTimeZone(new Date(), timeZone);
    const prayerKey = `${todayKey}-${nextPrayer.name}`;
    const isPrayerDone = state.prayerLog[prayerKey];

    // LOGIC: Show Today's tasks OR Overdue tasks
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const sortedTasks = state.tasks
        .filter(t => {
            if (t.status === TaskStatus.DONE) return false;
            if (t.status === TaskStatus.IN_PROGRESS) return true; // Always show active

            if (t.deadline) {
                // Show if deadline is today or in the past (overdue)
                return t.deadline <= endOfToday.getTime();
            }
            return false;
        })
        .sort((a, b) => {
            // Sort by Overdue first, then Impact
            const aDue = a.deadline || 0;
            const bDue = b.deadline || 0;
            if (aDue !== bDue) return aDue - bDue; // Earliest deadline first

            const impactScore = { 'HIGH': 3, 'MED': 2, 'LOW': 1 };
            return impactScore[b.impact] - impactScore[a.impact];
        });

    const overdueCount = sortedTasks.filter(t => t.deadline && t.deadline < startOfToday.getTime()).length;
    const completedToday = state.tasks.filter(t => t.status === TaskStatus.DONE && new Date(t.createdAt).getDate() === new Date().getDate());
    const progress = Math.min((state.metrics.revenue / state.metrics.target) * 100, 100);

    // Page Icons Mapping
    const PAGE_ICONS: Record<Page, React.ReactNode> = {
        [Page.COCKPIT]: <LayoutGrid size={16} />,
        [Page.WEEKLY]: <Layers size={16} />,
        [Page.DAY]: <Calendar size={16} />,
        [Page.MENTOR]: <MessageSquare size={16} />,
        [Page.ACTIVITIES]: <MapPin size={16} />,
        [Page.NETWORK]: <Users size={16} />,
        [Page.MARKETING]: <Megaphone size={16} />,
        [Page.LEDGER]: <CreditCard size={16} />,
        [Page.SUPPLICATIONS]: <BookOpen size={16} />,
        [Page.INTEL]: <StickyNote size={16} />,
        [Page.ARSENAL]: <Container size={16} />,
        [Page.GYM]: <Dumbbell size={16} />,
        [Page.CRM]: <Users size={16} />,
    };

    // Quick Action Handler
    const handleQuickAction = (actionType: QuickActionType) => {
        if (!onNavigate) return;

        switch (actionType) {
            case 'TODAY_FOCUS':
                onNavigate(Page.DAY);
                // TODO: Focus task input when Day view supports it
                break;
            case 'QUICK_TASK':
                onNavigate(Page.WEEKLY);
                break;
            case 'LOG_TRANSACTION':
                onNavigate(Page.LEDGER);
                break;
            case 'NEW_CONTACT':
                onNavigate(Page.CRM);
                break;
            case 'DRAFT_POST':
                onNavigate(Page.MARKETING);
                break;
            case 'PRAYER_CHECK':
                onNavigate(Page.SUPPLICATIONS);
                break;
            case 'START_WORKOUT':
                onNavigate(Page.GYM);
                break;
            case 'LOG_ACTIVITY':
                onNavigate(Page.ACTIVITIES);
                break;
            case 'QUICK_NOTE':
                onNavigate(Page.INTEL);
                break;
            case 'ADD_RESOURCE':
                onNavigate(Page.ARSENAL);
                break;
            case 'ASK_PROTOCOL':
                onNavigate(Page.MENTOR);
                break;
        }
    };

    // Get enabled and sorted preferences
    const preferences = state.userPreferences;
    const enabledShortcuts = preferences.dashboard.quickNavShortcuts
        .filter(s => s.enabled)
        .sort((a, b) => a.order - b.order);
    const enabledActions = preferences.dashboard.quickActions.filter(a => a.enabled);
    const sortedWidgets = [...preferences.dashboard.widgets].sort((a, b) => a.order - b.order);

    // Widget renderers
    const renderWidget = (widgetId: DashboardWidget) => {
        const widget = preferences.dashboard.widgets.find(w => w.id === widgetId);
        if (!widget || !widget.enabled) return null;

        switch (widgetId) {
            case 'QUICK_ACTIONS':
                return renderQuickActions();
            case 'QUICK_NAV':
                return renderQuickNav();
            case 'INSIGHTS':
                return renderInsights();
            case 'KPIS':
                return renderKPIs();
            case 'FLIGHT_PLAN':
                return renderFlightPlan();
            case 'CHALLENGE':
                return renderChallenge();
            default:
                return null;
        }
    };

    const renderChallenge = () => {
        if (!state.activeChallenge) {
            // Placeholder to start
            if (!onStartChallenge) return null;
            return (
                <div key="challenge-placeholder" className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3 shrink-0">
                    <div className="p-3 bg-zinc-800/50 rounded-full">
                        <Flame size={20} className="text-zinc-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">Protocol Inactive</h3>
                        <p className="text-[10px] text-zinc-500 mt-1">Discipline awaits. Initiate the Iron Protocol.</p>
                    </div>
                    <button
                        onClick={() => onStartChallenge()}
                        className="px-4 py-2 bg-zinc-100 text-black text-[10px] font-bold uppercase tracking-widest rounded hover:bg-white transition-colors"
                    >
                        Initialize
                    </button>
                </div>
            );
        }

        return (
            <div key="challenge" className="shrink-0">
                <ChallengeWidget
                    challenge={state.activeChallenge}
                    onUpdateRule={onChallengeRuleUpdate!}
                    onFailDay={onChallengeFailDay!}
                    onCompleteDay={() => { }}
                    timeZone={timeZone}
                />
            </div>
        );
    };

    const renderQuickActions = () => {
        if (enabledActions.length === 0) return null;
        return (
            <div key="quick-actions" className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 shrink-0">
                {enabledActions.map(action => (
                    <button
                        key={action.id}
                        onClick={() => handleQuickAction(action.type)}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-zinc-900/50 border border-zinc-800 rounded-sm text-xs font-mono text-zinc-400 hover:text-emerald-400 hover:border-emerald-900/30 hover:bg-zinc-900 transition-all group"
                    >
                        <div className="text-zinc-500 group-hover:text-emerald-400 transition-colors">
                            {PAGE_ICONS[action.page]}
                        </div>
                        <span className="text-[10px]">{action.label}</span>
                    </button>
                ))}
            </div>
        );
    };

    const renderQuickNav = () => {
        if (enabledShortcuts.length === 0 || !onNavigate) return null;

        // Count BIG and SMALL items to determine grid layout
        const bigCount = enabledShortcuts.filter(s => s.size === 'BIG').length;
        const smallCount = enabledShortcuts.filter(s => s.size === 'SMALL').length;

        return (
            <div key="quick-nav" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 shrink-0">
                {enabledShortcuts.map(shortcut => (
                    <NavCard
                        key={shortcut.id}
                        icon={PAGE_ICONS[shortcut.page]}
                        label={shortcut.label}
                        size={shortcut.size}
                        onClick={() => onNavigate(shortcut.page)}
                    />
                ))}
            </div>
        );
    };

    const renderInsights = () => (
        <div key="insights" className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
            <InsightCard
                icon={<Flame size={14} />}
                label="High Priority"
                value={insights.highPriorityTasks}
                subtext="urgent tasks"
                color="text-amber-400"
            />
            <InsightCard
                icon={<Calendar size={14} />}
                label="Today"
                value={insights.scheduledToday}
                subtext="scheduled"
                color="text-emerald-400"
            />
            <InsightCard
                icon={<Users size={14} />}
                label="Contacts"
                value={insights.recentContacts}
                subtext="need followup"
                color="text-blue-400"
            />
            <InsightCard
                icon={<TrendingUp size={14} />}
                label="Net Balance"
                value={`$${insights.financials.net}`}
                subtext="current"
                color={insights.financials.net >= 0 ? "text-emerald-500" : "text-red-400"}
            />
        </div>
    );

    const renderKPIs = () => (
        <div key="kpis" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
            {/* FINANCIAL GAP */}
            <div className="bg-surface border border-border rounded-sm p-4 relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <Target size={12} className="text-zinc-500" /> Gap
                    </div>
                    <span className="text-[10px] font-mono text-zinc-600">{progress.toFixed(1)}%</span>
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-medium text-zinc-200 tracking-tight">${state.metrics.revenue}</span>
                    <span className="text-xs text-zinc-500">/ ${state.metrics.target}</span>
                </div>
                <div className="mt-3 w-full h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            {/* OUTREACH */}
            <div className="bg-surface border border-border rounded-sm p-4">
                <div className="flex justify-between items-start mb-3">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <ArrowUpRight size={12} className="text-zinc-500" /> Outreach
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">{state.metrics.outreachCount}/5</span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-medium text-zinc-200">{state.metrics.outreachCount}</span>
                    <span className="text-xs text-zinc-500">msgs</span>
                </div>
            </div>

            {/* PRAYER */}
            <div className="bg-surface border border-border rounded-sm p-4 relative">
                <div className="flex justify-between items-start mb-2">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <Zap size={12} className="text-zinc-500" /> Next
                    </div>
                    {isPrayerDone && <CheckCircle2 size={12} className="text-emerald-500" />}
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-xl font-medium text-zinc-200">{nextPrayer.name}</div>
                        <div className="text-xs text-zinc-500 font-mono">{nextPrayer.time}</div>
                    </div>
                    {!isPrayerDone && (
                        <button
                            onClick={() => onPrayerToggle(prayerKey)}
                            className="px-3 py-1 bg-zinc-900 text-zinc-300 border border-zinc-700 rounded-sm text-[10px] font-mono hover:bg-emerald-900/30 hover:text-emerald-500 hover:border-emerald-800 transition-all"
                        >
                            MARK
                        </button>
                    )}
                </div>
            </div>

            {/* VELOCITY */}
            <div className="bg-surface border border-border rounded-sm p-4">
                <div className="flex justify-between items-start mb-3">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-zinc-500" /> Velocity
                    </div>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-medium text-zinc-200">{completedToday.length}</span>
                    <span className="text-xs text-zinc-500">tasks</span>
                </div>
            </div>
        </div>
    );

    const renderFlightPlan = () => (
        <div key="flight-plan" className="flex-1 flex flex-col min-h-0 bg-surface/30 border border-border rounded-sm overflow-hidden backdrop-blur-sm">
            <div className="p-5 border-b border-border bg-surface/80">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Flame size={18} className={overdueCount > 0 ? "text-red-500" : "text-zinc-100"} fill={overdueCount > 0 ? "currentColor" : "none"} />
                        <h2 className="text-sm font-medium text-zinc-100 tracking-tight">EXECUTION PROTOCOL</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        {overdueCount > 0 && (
                            <div className="px-2 py-0.5 rounded-sm bg-red-950/50 border border-red-900 text-[10px] font-mono text-red-400 flex items-center gap-1">
                                <AlertTriangle size={10} />
                                {overdueCount} OVERDUE
                            </div>
                        )}
                        <div className="text-[10px] font-mono text-zinc-500">
                            {sortedTasks.length} PENDING
                        </div>
                    </div>
                </div>
                <QuickInput onAdd={onTaskAdd} />
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {sortedTasks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2 opacity-50">
                        <CheckCircle2 size={24} />
                        <span className="text-xs font-mono">NO IMMEDIATE DIRECTIVES</span>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {sortedTasks.map(task => (
                            <UnifiedTaskRow
                                key={task.id}
                                task={task}
                                onUpdate={onTaskUpdate}
                                onStartSession={onStartSession}
                                isActive={task.id === activeTaskId}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    // Smart Insights
    const insights = useMemo(() => {
        const totalTasks = state.tasks.filter(t => t.status !== TaskStatus.DONE).length;
        const highPriorityTasks = state.tasks.filter(t => t.status !== TaskStatus.DONE && t.impact === 'HIGH').length;
        const scheduledToday = state.tasks.filter(t => {
            if (!t.scheduledTime) return false;
            const taskDate = new Date(t.scheduledTime);
            taskDate.setHours(0, 0, 0, 0);
            return taskDate.getTime() === startOfToday.getTime();
        }).length;

        const recentContacts = state.clients.filter(c => {
            const daysSince = Math.floor((Date.now() - c.lastInteraction) / (1000 * 60 * 60 * 24));
            return daysSince > 14;
        }).length;

        const net = state.transactions.reduce((a, b) => a + b.amount, 0);
        const income = state.transactions.filter(t => t.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
        const expense = Math.abs(state.transactions.filter(t => t.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0));

        return {
            totalTasks,
            highPriorityTasks,
            scheduledToday,
            recentContacts,
            financials: { net, income, expense }
        };
    }, [state.tasks, state.clients, state.transactions]);

    return (
        <>
            <div className="h-full overflow-y-auto p-4 sm:p-6 animate-fade-in bg-background relative">
                <div className="max-w-[1200px] mx-auto flex flex-col gap-6 sm:gap-8 h-full">

                    {/* Settings Button */}
                    <button
                        onClick={() => setShowSettings(true)}
                        className="fixed bottom-24 md:bottom-8 right-4 md:right-8 p-3 bg-surface border border-border rounded-sm text-zinc-400 hover:text-emerald-400 hover:border-emerald-900/30 transition-all shadow-xl z-40"
                        title="Dashboard Settings"
                    >
                        <Settings size={20} />
                    </button>

                    {/* Dynamic Widgets Based on Preferences */}
                    {sortedWidgets.map(widget => widget.enabled && renderWidget(widget.id))}

                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && onPreferencesUpdate && (
                <DashboardSettings
                    preferences={preferences}
                    onUpdate={onPreferencesUpdate}
                    onClose={() => setShowSettings(false)}
                />
            )}
        </>
    );
};

const NavCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    size?: 'SMALL' | 'BIG';
    onClick: () => void;
}> = ({ icon, label, size = 'SMALL', onClick }) => {
    const isBig = size === 'BIG';
    return (
        <button
            onClick={onClick}
            className={`
                flex flex-col items-center justify-center gap-2 p-4 bg-surface/50 border border-border rounded-sm text-xs font-mono text-zinc-400 hover:text-emerald-400 hover:border-emerald-900/30 hover:bg-surface transition-all group
                ${isBig ? 'col-span-2 row-span-1' : ''}
            `}
        >
            <div className={`text-zinc-500 group-hover:text-emerald-400 transition-colors ${isBig ? 'scale-125' : ''}`}>
                {icon}
            </div>
            <span className={isBig ? 'text-xs' : 'text-[10px]'}>{label}</span>
        </button>
    );
};

const InsightCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | number;
    subtext: string;
    color?: string;
}> = ({ icon, label, value, subtext, color = "text-zinc-200" }) => (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
            <div className="text-zinc-600">{icon}</div>
            <div className="text-[10px] font-mono text-zinc-600 uppercase">{label}</div>
        </div>
        <div className={`text-2xl font-bold ${color} mb-1`}>{value}</div>
        <div className="text-[10px] text-zinc-600">{subtext}</div>
    </div>
);

const QuickInput: React.FC<{ onAdd: any }> = ({ onAdd }) => {
    const [val, setVal] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!val.trim()) return;

        const isHigh = val.includes('!');
        // Auto-assign today's deadline if added from Cockpit
        onAdd(val.replace('!', '').trim(), Category.SERVICE, isHigh ? 'HIGH' : 'MED');
        setVal('');
    }
    return (
        <form onSubmit={handleSubmit} className="relative">
            <input
                className="w-full bg-background border border-zinc-800 rounded-md px-4 py-3 pl-10 text-sm text-zinc-200 focus:border-zinc-600 outline-none placeholder:text-zinc-700 font-mono transition-colors"
                placeholder=":: Add directive for today..."
                value={val}
                onChange={e => setVal(e.target.value)}
            />
            <Plus size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
        </form>
    )
}

const UnifiedTaskRow: React.FC<{
    task: Task;
    onUpdate: (id: string, updates: Partial<Task>) => void;
    onStartSession: (id: string) => void;
    isActive: boolean;
}> = ({ task, onUpdate, onStartSession, isActive }) => {
    const isOverdue = task.deadline && task.deadline < new Date().setHours(0, 0, 0, 0);

    return (
        <div className={`
            group flex items-center justify-between p-3 rounded border transition-all duration-200
            ${isActive
                ? 'bg-zinc-900/90 border-emerald-500/30 shadow-glow'
                : 'bg-background/50 border-transparent hover:border-zinc-800 hover:bg-zinc-900/30'
            }
            ${!isActive && isOverdue ? 'border-red-900/30 bg-red-950/10' : ''}
        `}>
            <div className="flex items-center gap-4 min-w-0 flex-1">

                <button
                    onClick={() => isActive ? null : onStartSession(task.id)}
                    className={`
                        w-8 h-8 rounded flex items-center justify-center shrink-0 border transition-all
                        ${isActive
                            ? 'bg-emerald-500 text-black border-emerald-400'
                            : 'bg-zinc-900 text-zinc-600 border-zinc-800 hover:text-emerald-500 hover:border-emerald-900'
                        }
                    `}
                >
                    {isActive ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
                </button>

                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`text-sm truncate font-medium ${isActive ? 'text-white' : isOverdue ? 'text-red-200' : 'text-zinc-300'}`}>
                            {task.title}
                        </span>
                        {task.impact === 'HIGH' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        )}
                    </div>
                    {task.deadline && (
                        <div className="flex items-center gap-1 text-[10px] font-mono mt-0.5">
                            <Calendar size={10} className={isOverdue ? "text-red-500" : "text-zinc-600"} />
                            <span className={isOverdue ? "text-red-400" : "text-zinc-500"}>
                                {isOverdue ? "OVERDUE" : "DUE TODAY"}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 pl-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onUpdate(task.id, { status: TaskStatus.DONE })}
                    className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                    COMPLETE
                </button>
            </div>
        </div>
    )
}

export default DashboardView;
