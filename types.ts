

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
  WEEKLY = 'WEEKLY'
}

export type Severity = 'LOW' | 'MED' | 'HIGH';

// Network / CRM Types
export type EntityContext = 'NEMO' | 'PERSONAL';
export type EntityType = 'TEAM' | 'CANDIDATE' | 'CLIENT' | 'NETWORK' | 'PARTNER';
export type PersonalCircle = 'FRIEND' | 'FAMILY' | 'MENTOR' | 'ALLY' | 'NONE';

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
  notes?: string;
  slot?: TaskSlot;
  pillar?: Pillar;
  scheduledTime?: number; // Timestamp for time-based planning (exact time, not just date)
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
  stage?: 'LEAD' | 'DISCOVERY' | 'PROPOSAL' | 'CLOSED' | 'LOST';
  focusArea?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  date: number;
  description: string;
  type: 'INCOME' | 'EXPENSE';
  category: Category;
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

export type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export interface PrayerTime {
  name: PrayerName;
  time: string; // AM/PM format (e.g., "1:15 PM")
  timestamp: number; // Full timestamp for the prayer time
  icon: string; // Emoji icon for the prayer
}

export interface AppState {
  currentPage: Page;
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
}
