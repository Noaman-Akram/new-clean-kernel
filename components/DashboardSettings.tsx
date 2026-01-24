import React, { useState } from 'react';
import { UserPreferences, QuickNavShortcut, QuickAction, DashboardWidgetConfig, Page, NavCardSize } from '../types';
import {
  X,
  GripVertical,
  Eye,
  EyeOff,
  Square,
  Grid2x2,
  Layers,
  MessageSquare,
  MapPin,
  Users,
  Megaphone,
  CreditCard,
  BookOpen,
  StickyNote,
  Container,
  Calendar,
  Dumbbell,
  Plus,
  LayoutGrid
} from 'lucide-react';

interface Props {
  preferences: UserPreferences;
  onUpdate: (preferences: UserPreferences) => void;
  onClose: () => void;
}

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

const DashboardSettings: React.FC<Props> = ({ preferences, onUpdate, onClose }) => {
  const [activeTab, setActiveTab] = useState<'shortcuts' | 'actions' | 'widgets'>('shortcuts');

  const updateQuickNavShortcuts = (shortcuts: QuickNavShortcut[]) => {
    onUpdate({
      ...preferences,
      dashboard: {
        ...preferences.dashboard,
        quickNavShortcuts: shortcuts,
      },
    });
  };

  const updateQuickActions = (actions: QuickAction[]) => {
    onUpdate({
      ...preferences,
      dashboard: {
        ...preferences.dashboard,
        quickActions: actions,
      },
    });
  };

  const updateWidgets = (widgets: DashboardWidgetConfig[]) => {
    onUpdate({
      ...preferences,
      dashboard: {
        ...preferences.dashboard,
        widgets: widgets,
      },
    });
  };

  const toggleShortcut = (id: string) => {
    const updated = preferences.dashboard.quickNavShortcuts.map(s =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    updateQuickNavShortcuts(updated);
  };

  const toggleShortcutSize = (id: string) => {
    const updated = preferences.dashboard.quickNavShortcuts.map(s =>
      s.id === id ? { ...s, size: s.size === 'SMALL' ? 'BIG' : 'SMALL' } : s
    );
    updateQuickNavShortcuts(updated);
  };

  const toggleAction = (id: string) => {
    const updated = preferences.dashboard.quickActions.map(a =>
      a.id === id ? { ...a, enabled: !a.enabled } : a
    );
    updateQuickActions(updated);
  };

  const toggleWidget = (id: string) => {
    const updated = preferences.dashboard.widgets.map(w =>
      w.id === id ? { ...w, enabled: !w.enabled } : w
    );
    updateWidgets(updated);
  };

  const moveShortcutUp = (index: number) => {
    if (index === 0) return;
    const updated = [...preferences.dashboard.quickNavShortcuts];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    // Update order values
    updated.forEach((s, i) => s.order = i);
    updateQuickNavShortcuts(updated);
  };

  const moveShortcutDown = (index: number) => {
    if (index === preferences.dashboard.quickNavShortcuts.length - 1) return;
    const updated = [...preferences.dashboard.quickNavShortcuts];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    // Update order values
    updated.forEach((s, i) => s.order = i);
    updateQuickNavShortcuts(updated);
  };

  const moveWidgetUp = (index: number) => {
    if (index === 0) return;
    const updated = [...preferences.dashboard.widgets];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    // Update order values
    updated.forEach((w, i) => w.order = i);
    updateWidgets(updated);
  };

  const moveWidgetDown = (index: number) => {
    if (index === preferences.dashboard.widgets.length - 1) return;
    const updated = [...preferences.dashboard.widgets];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    // Update order values
    updated.forEach((w, i) => w.order = i);
    updateWidgets(updated);
  };

  const sortedShortcuts = [...preferences.dashboard.quickNavShortcuts].sort((a, b) => a.order - b.order);
  const sortedWidgets = [...preferences.dashboard.widgets].sort((a, b) => a.order - b.order);

  const WIDGET_LABELS: Record<string, string> = {
    QUICK_ACTIONS: 'Quick Actions',
    QUICK_NAV: 'Quick Navigation',
    INSIGHTS: 'Insights Strip',
    KPIS: 'KPI Metrics',
    FLIGHT_PLAN: 'Execution Protocol',
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-background border border-border rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-medium text-zinc-100">Dashboard Settings</h2>
            <p className="text-xs text-zinc-500 font-mono mt-1 uppercase tracking-wider">Customize your command center</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors rounded hover:bg-zinc-900"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6 shrink-0">
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`px-4 py-3 text-sm font-mono border-b-2 transition-colors ${
              activeTab === 'shortcuts'
                ? 'border-emerald-500 text-emerald-500'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Quick Nav
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-4 py-3 text-sm font-mono border-b-2 transition-colors ${
              activeTab === 'actions'
                ? 'border-emerald-500 text-emerald-500'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Quick Actions
          </button>
          <button
            onClick={() => setActiveTab('widgets')}
            className={`px-4 py-3 text-sm font-mono border-b-2 transition-colors ${
              activeTab === 'widgets'
                ? 'border-emerald-500 text-emerald-500'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Widgets
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Quick Nav Shortcuts Tab */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500 mb-4">
                Configure which pages appear as quick shortcuts on your dashboard. Drag to reorder, toggle size, enable/disable.
              </p>
              {sortedShortcuts.map((shortcut, index) => (
                <div
                  key={shortcut.id}
                  className="flex items-center gap-3 p-3 bg-surface border border-border rounded-sm"
                >
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveShortcutUp(index)}
                      disabled={index === 0}
                      className="text-zinc-600 hover:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <GripVertical size={14} />
                    </button>
                    <button
                      onClick={() => moveShortcutDown(index)}
                      disabled={index === sortedShortcuts.length - 1}
                      className="text-zinc-600 hover:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <GripVertical size={14} />
                    </button>
                  </div>

                  <div className="text-zinc-400">
                    {PAGE_ICONS[shortcut.page]}
                  </div>

                  <div className="flex-1">
                    <span className="text-sm text-zinc-200 font-medium">{shortcut.label}</span>
                  </div>

                  <button
                    onClick={() => toggleShortcutSize(shortcut.id)}
                    className={`px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase border transition-colors ${
                      shortcut.size === 'BIG'
                        ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900'
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                    }`}
                    title="Toggle size"
                  >
                    {shortcut.size === 'BIG' ? <Grid2x2 size={14} /> : <Square size={14} />}
                  </button>

                  <button
                    onClick={() => toggleShortcut(shortcut.id)}
                    className={`p-2 rounded-sm transition-colors ${
                      shortcut.enabled
                        ? 'text-emerald-500 hover:text-emerald-400'
                        : 'text-zinc-600 hover:text-zinc-500'
                    }`}
                    title={shortcut.enabled ? 'Hide' : 'Show'}
                  >
                    {shortcut.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions Tab */}
          {activeTab === 'actions' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500 mb-4">
                Quick actions provide instant access to common tasks. Enable the ones you use most.
              </p>
              {preferences.dashboard.quickActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center gap-3 p-3 bg-surface border border-border rounded-sm"
                >
                  <div className="text-zinc-400">
                    {PAGE_ICONS[action.page]}
                  </div>

                  <div className="flex-1">
                    <div className="text-sm text-zinc-200 font-medium">{action.label}</div>
                    <div className="text-[10px] text-zinc-600 font-mono mt-0.5 uppercase">
                      {action.type.replace(/_/g, ' ')}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleAction(action.id)}
                    className={`p-2 rounded-sm transition-colors ${
                      action.enabled
                        ? 'text-emerald-500 hover:text-emerald-400'
                        : 'text-zinc-600 hover:text-zinc-500'
                    }`}
                    title={action.enabled ? 'Disable' : 'Enable'}
                  >
                    {action.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Widgets Tab */}
          {activeTab === 'widgets' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500 mb-4">
                Control which widgets appear on your dashboard and their order. Drag to reorder.
              </p>
              {sortedWidgets.map((widget, index) => (
                <div
                  key={widget.id}
                  className="flex items-center gap-3 p-3 bg-surface border border-border rounded-sm"
                >
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveWidgetUp(index)}
                      disabled={index === 0}
                      className="text-zinc-600 hover:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <GripVertical size={14} />
                    </button>
                    <button
                      onClick={() => moveWidgetDown(index)}
                      disabled={index === sortedWidgets.length - 1}
                      className="text-zinc-600 hover:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <GripVertical size={14} />
                    </button>
                  </div>

                  <div className="flex-1">
                    <span className="text-sm text-zinc-200 font-medium">{WIDGET_LABELS[widget.id] || widget.id}</span>
                  </div>

                  <button
                    onClick={() => toggleWidget(widget.id)}
                    className={`p-2 rounded-sm transition-colors ${
                      widget.enabled
                        ? 'text-emerald-500 hover:text-emerald-400'
                        : 'text-zinc-600 hover:text-zinc-500'
                    }`}
                    title={widget.enabled ? 'Hide' : 'Show'}
                  >
                    {widget.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-emerald-500 text-black text-sm font-bold rounded-sm hover:bg-emerald-400 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardSettings;
