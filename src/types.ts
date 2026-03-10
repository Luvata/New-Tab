export type ThemeMode = 'system' | 'light' | 'dark';
export type ViewMode = 'zen' | 'edit';
export type WorkspaceTab = 'today' | 'goals' | 'reviews';
export type TimerMinutes = 15 | 25 | 50;
export type TaskFontChoice = 'editorial-serif' | 'clean-sans' | 'humanist-sans' | 'mono';
export type TaskStatus = 'active' | 'done';
export type SessionType = 'focus' | 'break';
export type Effort = 'small' | 'medium' | 'large';
export type ReviewPeriod = 'daily' | 'weekly' | 'monthly';

export interface Preferences {
  theme: ThemeMode;
  defaultView: ViewMode;
  lastViewMode: ViewMode;
  activeTab: WorkspaceTab;
  showGreeting: boolean;
  showGoalChip: boolean;
  showProgressText: boolean;
  timerEnabled: boolean;
  timerMinutes: TimerMinutes;
  heroTaskFont: TaskFontChoice;
  zenTaskFont: TaskFontChoice;
  completionAnimation: boolean;
  confirmDelete: boolean;
}

export interface Goal {
  id: string;
  title: string;
  color: string;
  notes?: string;
  description?: string;
  topPriority?: string;
  topPriorityDescription?: string;
  targetEndDate?: string | null;
  isArchived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  goalId: string | null;
  notes?: string;
  estimatedEffort?: Effort;
  status: TaskStatus;
  sortOrder: number;
  dateBucket: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface DailyPlan {
  date: string;
  taskIds: string[];
  currentTaskId: string | null;
  sessionCount: number;
  completedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  taskId: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  type: SessionType;
  wasCompleted: boolean;
}

export interface ReviewEntry {
  id: string;
  period: ReviewPeriod;
  periodKey: string;
  scopeId?: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  schemaVersion: number;
  preferences: Preferences;
  goals: Goal[];
  dailyPlans: Record<string, DailyPlan>;
  tasks: Record<string, Task>;
  sessions: Record<string, Session>;
  reviews: Record<string, ReviewEntry>;
}

export interface AppSnapshot {
  ready: boolean;
  state: AppState;
  today: string;
  activeSessionId: string | null;
}
