

export enum Category {
  ZOHO = 'CORP',
  FREELANCE = 'DEV',
  AGENCY = 'VENTURE'
}

export enum TaskStatus {
  BACKLOG = 'BACKLOG',
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE'
}

export enum TaskType {
  URGENT = 'URGENT',
  DEEP = 'DEEP',
  RECURRING = 'RECURRING',
  TEMPLATE = 'TEMPLATE',
  STANDARD = 'STANDARD'
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
  GYM = 'GYM',
  CRM = 'CRM'
}

export type Severity = 'LOW' | 'MED' | 'HIGH';

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
  deadline?: number; // Timestamp
  impact: Severity;
  type?: TaskType; // NEW: Task type for organizing and behavior
  notes?: string;
  slot?: TaskSlot;
  pillar?: Pillar;
  scheduledTime?: number | null; // Timestamp for time-based planning (exact time, not just date)
  duration?: number; // Duration in minutes
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
  workoutSessions: WorkoutSession[];
  workoutTemplates: WorkoutTemplate[];
  exercises: Exercise[];
}
