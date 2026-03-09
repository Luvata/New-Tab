import type { AppState, DailyPlan, Goal, Session, Task } from '../types';
import { getLocalDateKey } from './date';

export const SCHEMA_VERSION = 1;

const DEFAULT_GOAL_COLORS = [
  '#8a7bff',
  '#5cbf9f',
  '#e88465',
  '#d4a94c',
  '#5d90d8',
  '#c978a9'
];

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createDefaultState(today = getLocalDateKey()): AppState {
  const state: AppState = {
    schemaVersion: SCHEMA_VERSION,
    preferences: {
      theme: 'system',
      defaultView: 'zen',
      lastViewMode: 'zen',
      activeTab: 'today',
      showGreeting: true,
      showGoalChip: true,
      showProgressText: true,
      timerEnabled: true,
      timerMinutes: 25,
      heroTaskFont: 'editorial-serif',
      zenTaskFont: 'editorial-serif',
      completionAnimation: true,
      confirmDelete: true
    },
    goals: [],
    dailyPlans: {},
    tasks: {},
    sessions: {},
    reviews: {}
  };

  ensureDailyPlan(state, today);
  return state;
}

export function migrateState(input: AppState | null | undefined, today = getLocalDateKey()): AppState {
  if (!input) {
    return createDefaultState(today);
  }

  const merged = {
    ...createDefaultState(today),
    ...input,
    preferences: {
      ...createDefaultState(today).preferences,
      ...input.preferences
    }
  };

  merged.schemaVersion = SCHEMA_VERSION;
  ensureDailyPlan(merged, today);
  normalizeState(merged);

  return merged;
}

export function ensureDailyPlan(state: AppState, date = getLocalDateKey()): DailyPlan {
  const existing = state.dailyPlans[date];
  if (existing) {
    return existing;
  }

  const timestamp = nowIso();
  const plan: DailyPlan = {
    date,
    taskIds: [],
    currentTaskId: null,
    sessionCount: 0,
    completedCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  state.dailyPlans[date] = plan;
  return plan;
}

export function recalculatePlan(state: AppState, date: string): DailyPlan {
  const plan = ensureDailyPlan(state, date);
  const validTaskIds = plan.taskIds.filter((taskId) => state.tasks[taskId]?.dateBucket === date);
  if (validTaskIds.length !== plan.taskIds.length) {
    plan.taskIds = validTaskIds;
  }

  const activeTaskIds = validTaskIds.filter((taskId) => state.tasks[taskId]?.status === 'active');
  const completedCount = validTaskIds.filter((taskId) => state.tasks[taskId]?.status === 'done').length;

  if (plan.currentTaskId && !activeTaskIds.includes(plan.currentTaskId)) {
    plan.currentTaskId = activeTaskIds[0] ?? null;
  }

  plan.completedCount = completedCount;
  plan.updatedAt = nowIso();
  return plan;
}

export function normalizeState(state: AppState): AppState {
  state.goals = [...state.goals].sort((a, b) => a.sortOrder - b.sortOrder);

  if ((state.preferences.defaultView as string) === 'focus') {
    state.preferences.defaultView = 'zen';
  }

  if ((state.preferences.lastViewMode as string) === 'focus') {
    state.preferences.lastViewMode = 'zen';
  }

  Object.values(state.tasks).forEach((task) => {
    const legacyStatus = (task as unknown as { status?: string }).status;
    if (legacyStatus === 'skipped') {
      task.status = 'done';
      task.completedAt = task.completedAt ?? task.updatedAt ?? nowIso();
      task.updatedAt = task.completedAt;
    }
  });

  Object.keys(state.dailyPlans).forEach((date) => {
    const plan = state.dailyPlans[date];
    plan.taskIds = [...plan.taskIds].sort((a, b) => {
      const left = state.tasks[a]?.sortOrder ?? 0;
      const right = state.tasks[b]?.sortOrder ?? 0;
      return left - right;
    });
    recalculatePlan(state, date);
  });

  return state;
}

export function getPlanTasks(state: AppState, date: string): Task[] {
  const plan = ensureDailyPlan(state, date);
  return plan.taskIds.map((taskId) => state.tasks[taskId]).filter(Boolean);
}

export function getActiveTasks(state: AppState, date: string): Task[] {
  return getPlanTasks(state, date).filter((task) => task.status === 'active');
}

export function getCurrentTask(state: AppState, date: string): Task | null {
  const plan = ensureDailyPlan(state, date);
  return plan.currentTaskId ? state.tasks[plan.currentTaskId] ?? null : null;
}

export function getNextActiveTaskId(state: AppState, date: string, currentTaskId?: string | null): string | null {
  const activeTasks = getActiveTasks(state, date);
  if (activeTasks.length === 0) {
    return null;
  }

  if (!currentTaskId) {
    return activeTasks[0].id;
  }

  const currentIndex = activeTasks.findIndex((task) => task.id === currentTaskId);
  if (currentIndex === -1) {
    return activeTasks[0].id;
  }

  return activeTasks[(currentIndex + 1) % activeTasks.length]?.id ?? activeTasks[0].id;
}

export function getPreviousDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  return getLocalDateKey(date);
}

export function getActiveSession(state: AppState): Session | null {
  return Object.values(state.sessions).find((session) => !session.endedAt && session.type === 'focus') ?? null;
}

export function makeGoalSortOrder(goals: Goal[]): number {
  return goals.length === 0 ? 100 : Math.max(...goals.map((goal) => goal.sortOrder)) + 100;
}

export function makeTaskSortOrder(taskIds: string[], tasks: Record<string, Task>): number {
  return taskIds.length === 0
    ? 100
    : Math.max(...taskIds.map((taskId) => tasks[taskId]?.sortOrder ?? 0)) + 100;
}

export function getDefaultGoalColor(goals: Goal[]): string {
  return DEFAULT_GOAL_COLORS[goals.length % DEFAULT_GOAL_COLORS.length];
}
