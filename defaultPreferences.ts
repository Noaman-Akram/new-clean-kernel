import { UserPreferences, QuickNavShortcut, QuickAction, DashboardWidgetConfig, Page } from './types';
import { generateId } from './utils';

// Default Quick Navigation Shortcuts
export const getDefaultQuickNavShortcuts = (): QuickNavShortcut[] => [
  { id: generateId(), page: Page.WEEKLY, label: 'Weekly', size: 'SMALL', order: 0, enabled: true },
  { id: generateId(), page: Page.DAY, label: 'Today', size: 'BIG', order: 1, enabled: true },
  { id: generateId(), page: Page.MENTOR, label: 'Protocol', size: 'SMALL', order: 2, enabled: true },
  { id: generateId(), page: Page.ACTIVITIES, label: 'Activities', size: 'SMALL', order: 3, enabled: true },
  { id: generateId(), page: Page.NETWORK, label: 'Network', size: 'SMALL', order: 4, enabled: true },
  { id: generateId(), page: Page.GYM, label: 'Gym', size: 'SMALL', order: 5, enabled: true },
  { id: generateId(), page: Page.MARKETING, label: 'Marketing', size: 'SMALL', order: 6, enabled: false },
  { id: generateId(), page: Page.LEDGER, label: 'Ledger', size: 'SMALL', order: 7, enabled: false },
  { id: generateId(), page: Page.SUPPLICATIONS, label: 'Sanctuary', size: 'SMALL', order: 8, enabled: false },
  { id: generateId(), page: Page.INTEL, label: 'Intel', size: 'SMALL', order: 9, enabled: false },
  { id: generateId(), page: Page.ARSENAL, label: 'Arsenal', size: 'SMALL', order: 10, enabled: false },
  { id: generateId(), page: Page.CRM, label: 'CRM', size: 'SMALL', order: 11, enabled: false },
];

// Default Quick Actions - Context-aware shortcuts for each page
export const getDefaultQuickActions = (): QuickAction[] => [
  {
    id: generateId(),
    type: 'TODAY_FOCUS',
    label: 'Focus Today',
    page: Page.DAY,
    icon: 'Calendar',
    enabled: true,
  },
  {
    id: generateId(),
    type: 'QUICK_TASK',
    label: 'Quick Task',
    page: Page.WEEKLY,
    icon: 'Plus',
    enabled: true,
  },
  {
    id: generateId(),
    type: 'LOG_TRANSACTION',
    label: 'Log Money',
    page: Page.LEDGER,
    icon: 'CreditCard',
    enabled: true,
  },
  {
    id: generateId(),
    type: 'NEW_CONTACT',
    label: 'Add Contact',
    page: Page.CRM,
    icon: 'Users',
    enabled: false,
  },
  {
    id: generateId(),
    type: 'DRAFT_POST',
    label: 'Draft Post',
    page: Page.MARKETING,
    icon: 'Megaphone',
    enabled: false,
  },
  {
    id: generateId(),
    type: 'PRAYER_CHECK',
    label: 'Prayer',
    page: Page.SUPPLICATIONS,
    icon: 'BookOpen',
    enabled: true,
  },
  {
    id: generateId(),
    type: 'START_WORKOUT',
    label: 'Workout',
    page: Page.GYM,
    icon: 'Dumbbell',
    enabled: true,
  },
  {
    id: generateId(),
    type: 'LOG_ACTIVITY',
    label: 'Log Activity',
    page: Page.ACTIVITIES,
    icon: 'MapPin',
    enabled: false,
  },
  {
    id: generateId(),
    type: 'QUICK_NOTE',
    label: 'Quick Note',
    page: Page.INTEL,
    icon: 'StickyNote',
    enabled: false,
  },
  {
    id: generateId(),
    type: 'ADD_RESOURCE',
    label: 'Add Link',
    page: Page.ARSENAL,
    icon: 'Container',
    enabled: false,
  },
  {
    id: generateId(),
    type: 'ASK_PROTOCOL',
    label: 'Ask AI',
    page: Page.MENTOR,
    icon: 'MessageSquare',
    enabled: true,
  },
];

// Default Dashboard Widgets Configuration
export const getDefaultDashboardWidgets = (): DashboardWidgetConfig[] => [
  { id: 'QUICK_ACTIONS', enabled: true, order: 0 },
  { id: 'QUICK_NAV', enabled: true, order: 1 },
  { id: 'INSIGHTS', enabled: true, order: 2 },
  { id: 'KPIS', enabled: true, order: 3 },
  { id: 'FLIGHT_PLAN', enabled: true, order: 4 },
];

// Default User Preferences Factory
export const getDefaultUserPreferences = (): UserPreferences => ({
  dashboard: {
    quickNavShortcuts: getDefaultQuickNavShortcuts(),
    quickActions: getDefaultQuickActions(),
    widgets: getDefaultDashboardWidgets(),
  },
  appearance: {
    density: 'NORMAL',
  },
  dateFormat: 'US',
  timeFormat: '12h',
  currency: 'USD',
});
