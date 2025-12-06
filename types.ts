

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

export enum Page {
  COCKPIT = 'COCKPIT',
  GRID = 'GRID',
  NETWORK = 'NETWORK',
  LEDGER = 'LEDGER',
  MARKETING = 'MARKETING',
  MENTOR = 'PROTOCOL',
  SUPPLICATIONS = 'SANCTUARY',
  INTEL = 'INTEL',
  ARSENAL = 'ARSENAL'
}

export type Severity = 'LOW' | 'MED' | 'HIGH';

// Network / CRM Types
export type EntityContext = 'NEMO' | 'PERSONAL';
export type EntityType = 'TEAM' | 'CANDIDATE' | 'CLIENT' | 'NETWORK';
export type PersonalCircle = 'INNER' | 'OUTER' | 'PROFESSIONAL' | 'NONE';

// Simplified Marketing Types
export type ContentIdentity = 'AGENCY' | 'CAREER' | 'PERSONAL';
export type ContentPlatform = 'LINKEDIN' | 'TWITTER' | 'BLOG';

export interface MarketingItem {
    id: string;
    content: string; // The hook or body
    identity: ContentIdentity;
    platform: ContentPlatform;
    isPosted: boolean;
    createdAt: number;
    postedAt?: number;
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
}

export interface Transaction {
  id: string;
  amount: number;
  date: number;
  description: string;
  type: 'INCOME' | 'EXPENSE';
  category: Category;
  relatedEntityId?: string; // Link to Client/Entity
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
    category: 'DEV' | 'DESIGN' | 'BUSINESS' | 'LEARNING';
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

export interface AppState {
  currentPage: Page;
  tasks: Task[];
  clients: Client[];
  transactions: Transaction[];
  notes: Note[];
  resources: Resource[];
  marketing: MarketingItem[]; 
  metrics: SystemMetrics;
  prayerLog: Record<string, boolean>;
  chatHistory: ChatMessage[];
  activeSession: ActiveSession;
}
