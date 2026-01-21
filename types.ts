

export enum Category {
  CORE = 'CORE',
  GROWTH = 'GROWTH',
  SERVICE = 'SERVICE'
}

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
}

export enum TaskStatus {
  BACKLOG = 'BACKLOG',
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE'
}

export type Weekday = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export interface TaskSlot {
  day: Weekday;
  hour: string;
  date?: string; // ISO Date string YYYY-MM-DD
}

export type Pillar = 'KNOWLEDGE' | 'DESIGN' | 'MASTERY';

export enum Page {
  COCKPIT = 'COCKPIT',
  ACTIVITIES = 'ACTIVITIES',
  NETWORK = 'NETWORK',
  LEDGER = 'LEDGER',
  MARKETING = 'MARKETING',
  MENTOR = 'PROTOCOL',
  SUPPLICATIONS = 'SANCTUARY',
  INTEL = 'INTEL',
  ARSENAL = 'ARSENAL',
  WEEKLY = 'WEEKLY',
  DAY = 'DAY',
  GYM = 'GYM',
  CRM = 'CRM'
}

export type Severity = 'LOW' | 'MED' | 'HIGH';

export type DockSection = 'ROUTINE' | 'TEMPLATE' | 'PROJECT' | 'TODO' | 'LATER' | 'HABIT';

// Network / CRM Types
export type EntityContext = 'NEMO' | 'PERSONAL';
export type EntityType = 'TEAM' | 'CANDIDATE' | 'CLIENT' | 'NETWORK' | 'PARTNER';
export type PersonalCircle = 'FRIEND' | 'FAMILY' | 'MENTOR' | 'ALLY' | 'NONE';

export enum CRMStage {
  LEAD = 'LEAD',
  CONTACTED = 'CONTACTED',
  DISCOVERY = 'DISCOVERY',
  PROPOSAL = 'PROPOSAL',
  NEGOTIATION = 'NEGOTIATION',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST'
}

export interface CRMNote {
  id: string;
  content: string;
  timestamp: number;
  author: string; // e.g., "Nemo"
}

// Simplified Marketing Types
export type ContentIdentity = 'AGENCY' | 'CAREER' | 'PERSONAL';
export type ContentPlatform = 'LINKEDIN' | 'TWITTER' | 'INSTAGRAM' | 'FACEBOOK' | 'YOUTUBE' | 'TIKTOK' | 'BLOG' | 'OTHER';

export interface MarketingItem {
  id: string;
  content: string; // The hook or body
  identity: ContentIdentity;
  platform: ContentPlatform;
  isPosted: boolean;
  createdAt: number;
  postedAt?: number;
}

export type ActivityCategory = 'WORK' | 'SPORT' | 'SOCIAL' | 'HANGOUT';

export interface Activity {
  id: string;
  title: string;
  category: ActivityCategory;
  location: string;
  vibe: 'FOCUS' | 'ENERGY' | 'RELAX';
  details?: string;
  lastVisited?: number;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  category: Category;
  createdAt: number;
  deadline?: number;
  impact: Severity;
  dockSection?: DockSection; // Where it lives in the Dock (behavior type)
  urgent?: boolean; // ! flag for emphasis
  notes?: string;
  slot?: TaskSlot;
  pillar?: Pillar;
  scheduledTime?: number | null; // Timestamp for scheduled execution
  duration?: number; // Duration in minutes
  templateSteps?: string[]; // For TEMPLATE items
  habitTracking?: { [dateKey: string]: boolean }; // For HABIT tracking
  parentProject?: string; // For sessions spawned from projects
  subtasks?: SubTask[]; // NEW: For breaking down major tasks
}

export interface Client { // Acts as "Entity" (Person or Company)
  id: string;
  name: string;
  role: string; // e.g., "Frontend Dev", "Project Manager"
  company: string; // Organization name

  context: EntityContext; // NEMO or PERSONAL
  type: EntityType; // TEAM, CANDIDATE, CLIENT, NETWORK

  status: string; // e.g., "ACTIVE", "INTERVIEWING", "LEAD"
  tags: string[]; // NEW: For flexible categorization
  circle?: PersonalCircle; // NEW: For personal depth

  // Financials
  rate: number;
  rateType: 'HOURLY' | 'MONTHLY' | 'FIXED' | 'NONE';
  currency: 'USD' | 'EGP';

  lastInteraction: number;
  nextAction: string;

  email?: string;
  phone?: string;
  profileUrl?: string;
  contactHandle?: string;
  needs?: string;
  stage?: CRMStage | 'LEAD' | 'DISCOVERY' | 'PROPOSAL' | 'CLOSED' | 'LOST'; // Backward compat + new enum
  focusArea?: string;

  // CRM Extended Fields
  leadSource?: string;
  probability?: number; // 0-100
  expectedValue?: number;
  expectedCloseDate?: number;
  industry?: string;
  website?: string;
  crmNotes?: CRMNote[];
}

export interface Transaction {
  id: string;
  amount: number;
  date: number;
  description: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  accountId?: string;
  relatedEntityId?: string; // Link to Client/Entity
}

export type AccountType = 'CASH' | 'BANK' | 'CRYPTO' | 'ASSET';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: 'USD' | 'EGP';
  note?: string;
  color?: string; // For visual identification
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  price?: number;
  category: string;
  isPurchased: boolean;
  createdAt: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  tags: string[];
}

export interface Resource {
  id: string;
  title: string;
  url: string;
  category: 'DEV' | 'DESIGN' | 'BUSINESS' | 'LEARNING' | 'PRODUCTIVITY' | 'FINANCE' | 'MARKETING' | 'MEDIA';
  description: string;
}

export interface SystemMetrics {
  revenue: number;
  target: number;
  streak: number;
  lastSync: string;
  outreachCount: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface ActiveSession {
  taskId: string | null;
  startTime: number | null;
}

export interface HorizonGoal {
  id: string;
  title: string;
  progress: number;
}

// Gym Tracker Types - RepCount Style
export type ExerciseCategory = 'CHEST' | 'BACK' | 'LEGS' | 'SHOULDERS' | 'ARMS' | 'CORE' | 'CARDIO' | 'FULL_BODY';

// Exercise Library
export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  isCustom: boolean;
  defaultRestTime?: number; // Default rest between sets in seconds
}

// Template Exercise - defines how an exercise appears in a template
export interface TemplateExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  targetSets: number; // How many sets planned
  targetReps?: number; // Target reps (optional, can vary by set)
  restTime: number; // Rest between sets in seconds
  notes?: string;
}

// Workout Template/Program - reusable workout
export interface WorkoutTemplate {
  id: string;
  name: string; // "Push Day", "Leg Day", etc.
  exercises: TemplateExercise[];
  createdAt: number;
  lastUsed?: number;
}

// Actual workout set logged
export interface WorkoutSet {
  id: string;
  reps: number;
  weight?: number; // Optional for bodyweight
  completed: boolean;
  timestamp: number; // When this set was completed
}

// Exercise within an active/completed workout
export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutSet[];
  targetSets: number;
  targetReps?: number;
  restTime: number;
  previousBest?: { reps: number; weight?: number }; // For progressive overload
}

// Completed or Active Workout Session
export interface WorkoutSession {
  id: string;
  templateId?: string; // Reference to template if used
  templateName?: string; // Store name for history
  startTime: number;
  endTime?: number;
  exercises: WorkoutExercise[];
  notes?: string;
  isActive: boolean;
}

export type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export interface PrayerTime {
  name: PrayerName;
  time: string; // AM/PM format (e.g., "1:15 PM")
  timestamp: number; // Full timestamp for the prayer time
  icon: string; // Emoji icon for the prayer
}

export interface DayChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface DayMeta {
  rituals?: Record<string, boolean>;
  checklist?: DayChecklistItem[];
  focus?: string;
}

// Dashboard Customization Types
export type NavCardSize = 'SMALL' | 'BIG';

export interface QuickNavShortcut {
  id: string;
  page: Page;
  label: string;
  size: NavCardSize;
  order: number;
  enabled: boolean;
}

export type QuickActionType =
  | 'TODAY_FOCUS' // Opens Day view with task input focused
  | 'QUICK_TASK' // Opens task input in planner
  | 'LOG_TRANSACTION' // Opens ledger with transaction form
  | 'NEW_CONTACT' // Opens CRM with new contact form
  | 'DRAFT_POST' // Opens marketing with post composer
  | 'PRAYER_CHECK' // Opens sanctuary and focuses prayer
  | 'START_WORKOUT' // Opens gym with quick start
  | 'LOG_ACTIVITY' // Opens activities with new activity form
  | 'QUICK_NOTE' // Opens intel with note composer
  | 'ADD_RESOURCE' // Opens arsenal with resource form
  | 'ASK_PROTOCOL'; // Opens protocol chat

export interface QuickAction {
  id: string;
  type: QuickActionType;
  label: string;
  page: Page;
  icon: string; // Icon name reference
  enabled: boolean;
}

export type DashboardWidget = 'QUICK_NAV' | 'INSIGHTS' | 'KPIS' | 'FLIGHT_PLAN' | 'QUICK_ACTIONS';

export interface DashboardWidgetConfig {
  id: DashboardWidget;
  enabled: boolean;
  order: number;
}

export interface UserPreferences {
  dashboard: {
    quickNavShortcuts: QuickNavShortcut[];
    quickActions: QuickAction[];
    widgets: DashboardWidgetConfig[];
  };
  appearance: {
    accentColor?: string; // For future theme customization
    density?: 'COMPACT' | 'NORMAL' | 'SPACIOUS';
  };
  dateFormat?: 'US' | 'EU' | 'ISO'; // MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
  timeFormat?: '12h' | '24h';
  currency?: 'USD' | 'EGP' | 'EUR' | 'GBP';
}

export interface AppState {
  tasks: Task[];
  activities: Activity[];
  clients: Client[];
  transactions: Transaction[];
  accounts: Account[];
  shoppingList: ShoppingListItem[];
  notes: Note[];
  resources: Resource[];
  marketing: MarketingItem[];
  metrics: SystemMetrics;
  prayerLog: Record<string, boolean>;
  adhkarLog: Record<string, boolean>;
  chatHistory: ChatMessage[];
  activeSession: ActiveSession;
  horizonGoals: HorizonGoal[];
  stickyNotes: Record<string, string>; // format: YYYY-MM-DD -> content
  dayMeta: Record<string, DayMeta>; // format: YYYY-MM-DD -> metadata
  workoutSessions: WorkoutSession[];
  workoutTemplates: WorkoutTemplate[];
  exercises: Exercise[];
  userPreferences: UserPreferences;
}
