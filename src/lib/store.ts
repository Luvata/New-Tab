import { getLocalDateKey, getMinutesRemaining } from './date';
import {
  createDefaultState,
  createId,
  ensureDailyPlan,
  getActiveSession,
  getDefaultGoalColor,
  getNextActiveTaskId,
  getPreviousDateKey,
  makeGoalSortOrder,
  makeTaskSortOrder,
  migrateState,
  normalizeState,
  nowIso,
  recalculatePlan
} from './state';
import { readPersistedState, subscribeToPersistedState, writePersistedState } from './storage';
import type { AppSnapshot, AppState, Goal, ReviewPeriod, TimerMinutes, ViewMode, WorkspaceTab } from '../types';

type Listener = () => void;
type Mutator = (draft: AppState, today: string) => void;
type GoalInput = {
  title: string;
  description?: string;
  topPriority?: string;
  targetEndDate?: string | null;
  color?: string;
};
type GoalUpdate = Partial<Pick<Goal, 'title' | 'description' | 'topPriority' | 'targetEndDate' | 'color'>>;

function normalizeText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function reorderTodayPlanByGoalLanes(draft: AppState, today: string): void {
  const plan = ensureDailyPlan(draft, today);
  const taskMap = draft.tasks;
  const orderedGoalIds = draft.goals
    .filter((goal) => !goal.isArchived)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((goal) => goal.id);

  const activeIdsByGoal = orderedGoalIds.flatMap((goalId) =>
    plan.taskIds
      .filter((taskId) => taskMap[taskId]?.status === 'active' && taskMap[taskId]?.goalId === goalId)
      .sort((left, right) => (taskMap[left]?.sortOrder ?? 0) - (taskMap[right]?.sortOrder ?? 0))
  );

  const ungroupedActiveIds = plan.taskIds
    .filter((taskId) => taskMap[taskId]?.status === 'active' && taskMap[taskId]?.goalId == null)
    .sort((left, right) => (taskMap[left]?.sortOrder ?? 0) - (taskMap[right]?.sortOrder ?? 0));

  const completedIds = plan.taskIds.filter((taskId) => taskMap[taskId]?.status !== 'active');
  plan.taskIds = [...activeIdsByGoal, ...ungroupedActiveIds, ...completedIds];

  plan.taskIds.forEach((taskId, index) => {
    const task = taskMap[taskId];
    if (!task) {
      return;
    }

    task.sortOrder = (index + 1) * 100;
    task.updatedAt = nowIso();
  });
}

class AppStore {
  private listeners = new Set<Listener>();
  private snapshot: AppSnapshot = {
    ready: false,
    state: createDefaultState(),
    today: getLocalDateKey(),
    activeSessionId: null
  };
  private initialized = false;
  private unsubscribeStorage: (() => void) | null = null;
  private dayTimer: number | null = null;
  private tickTimer: number | null = null;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): AppSnapshot {
    return this.snapshot;
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    await this.refreshFromStorage();

    this.unsubscribeStorage = subscribeToPersistedState((nextState) => {
      this.setSnapshotFromState(migrateState(nextState, getLocalDateKey()));
    });

    this.dayTimer = window.setInterval(() => {
      void this.ensureToday();
    }, 60_000);

    this.tickTimer = window.setInterval(() => {
      const activeSession = getActiveSession(this.snapshot.state);
      if (!activeSession) {
        return;
      }

      if (getMinutesRemaining(activeSession.startedAt, this.snapshot.state.preferences.timerMinutes) === 0) {
        void this.stopFocusSession(true);
        return;
      }

      this.emit();
    }, 15_000);
  }

  destroy(): void {
    this.unsubscribeStorage?.();
    this.unsubscribeStorage = null;

    if (this.dayTimer) {
      window.clearInterval(this.dayTimer);
      this.dayTimer = null;
    }

    if (this.tickTimer) {
      window.clearInterval(this.tickTimer);
      this.tickTimer = null;
    }

    this.initialized = false;
  }

  async refreshFromStorage(): Promise<void> {
    const next = migrateState(await readPersistedState(), getLocalDateKey());
    if (!(await readPersistedState())) {
      await writePersistedState(next);
    }
    this.setSnapshotFromState(next);
  }

  async ensureToday(): Promise<void> {
    const today = getLocalDateKey();
    if (this.snapshot.today === today && this.snapshot.state.dailyPlans[today]) {
      return;
    }

    await this.updateState((draft, nextToday) => {
      ensureDailyPlan(draft, nextToday);
    });
  }

  async setViewMode(mode: ViewMode): Promise<void> {
    await this.updateState((draft) => {
      draft.preferences.lastViewMode = mode;
    });
  }

  async setActiveTab(tab: WorkspaceTab): Promise<void> {
    await this.updateState((draft) => {
      draft.preferences.activeTab = tab;
    });
  }

  async updatePreference<Key extends keyof AppState['preferences']>(
    key: Key,
    value: AppState['preferences'][Key]
  ): Promise<void> {
    await this.updateState((draft) => {
      draft.preferences[key] = value;
      if (key === 'defaultView') {
        draft.preferences.lastViewMode = value as ViewMode;
      }
    });
  }

  async addTask(title: string, goalId: string | null = null): Promise<void> {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      return;
    }

    await this.updateState((draft, today) => {
      const plan = ensureDailyPlan(draft, today);
      const id = createId('task');
      const timestamp = nowIso();

      draft.tasks[id] = {
        id,
        title: normalizedTitle,
        goalId,
        status: 'active',
        sortOrder: makeTaskSortOrder(plan.taskIds, draft.tasks),
        dateBucket: today,
        createdAt: timestamp,
        updatedAt: timestamp,
        completedAt: null
      };

      plan.taskIds.push(id);
      if (!plan.currentTaskId) {
        plan.currentTaskId = id;
      }
      recalculatePlan(draft, today);
    });
  }

  async updateTaskTitle(taskId: string, title: string): Promise<void> {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      return;
    }

    await this.updateState((draft) => {
      const task = draft.tasks[taskId];
      if (!task) {
        return;
      }

      task.title = normalizedTitle;
      task.updatedAt = nowIso();
    });
  }

  async assignTaskGoal(taskId: string, goalId: string | null): Promise<void> {
    await this.updateState((draft) => {
      const task = draft.tasks[taskId];
      if (!task) {
        return;
      }

      task.goalId = goalId;
      task.updatedAt = nowIso();
    });
  }

  async setCurrentTask(taskId: string | null): Promise<void> {
    await this.updateState((draft, today) => {
      const plan = ensureDailyPlan(draft, today);
      if (taskId && draft.tasks[taskId]?.status !== 'active') {
        return;
      }

      plan.currentTaskId = taskId;
      plan.updatedAt = nowIso();
    });
  }

  async cycleCurrentTask(): Promise<void> {
    await this.updateState((draft, today) => {
      const plan = ensureDailyPlan(draft, today);
      plan.currentTaskId = getNextActiveTaskId(draft, today, plan.currentTaskId);
      plan.updatedAt = nowIso();
    });
  }

  async completeTask(taskId: string): Promise<void> {
    await this.updateState((draft, today) => {
      const task = draft.tasks[taskId];
      const plan = ensureDailyPlan(draft, today);
      if (!task || task.status !== 'active') {
        return;
      }

      task.status = 'done';
      task.completedAt = nowIso();
      task.updatedAt = task.completedAt;

      if (plan.currentTaskId === taskId) {
        plan.currentTaskId = getNextActiveTaskId(draft, today, taskId);
        if (plan.currentTaskId === taskId) {
          plan.currentTaskId = null;
        }
      }

      recalculatePlan(draft, today);
    });
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.updateState((draft) => {
      const task = draft.tasks[taskId];
      if (!task) {
        return;
      }

      const plan = draft.dailyPlans[task.dateBucket];
      if (plan) {
        plan.taskIds = plan.taskIds.filter((id) => id !== taskId);
        if (plan.currentTaskId === taskId) {
          plan.currentTaskId = getNextActiveTaskId(draft, task.dateBucket, taskId);
          if (plan.currentTaskId === taskId) {
            plan.currentTaskId = null;
          }
        }
      }

      delete draft.tasks[taskId];
      if (plan) {
        recalculatePlan(draft, task.dateBucket);
      }
    });
  }

  async moveTask(taskId: string, direction: 'up' | 'down'): Promise<void> {
    await this.updateState((draft, today) => {
      const plan = ensureDailyPlan(draft, today);
      const index = plan.taskIds.indexOf(taskId);
      if (index === -1) {
        return;
      }

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= plan.taskIds.length) {
        return;
      }

      const [removed] = plan.taskIds.splice(index, 1);
      plan.taskIds.splice(targetIndex, 0, removed);
      plan.taskIds.forEach((id, orderIndex) => {
        const task = draft.tasks[id];
        if (task) {
          task.sortOrder = (orderIndex + 1) * 100;
          task.updatedAt = nowIso();
        }
      });
      recalculatePlan(draft, today);
    });
  }

  async clearCompletedToday(): Promise<void> {
    await this.updateState((draft, today) => {
      const plan = ensureDailyPlan(draft, today);
      const removableIds = plan.taskIds.filter((taskId) => {
        const task = draft.tasks[taskId];
        return task?.status === 'done';
      });

      removableIds.forEach((taskId) => {
        delete draft.tasks[taskId];
      });

      plan.taskIds = plan.taskIds.filter((taskId) => !removableIds.includes(taskId));
      recalculatePlan(draft, today);
    });
  }

  async carryTaskToToday(taskId: string): Promise<void> {
    await this.updateState((draft, today) => {
      const sourceTask = draft.tasks[taskId];
      if (!sourceTask) {
        return;
      }

      const plan = ensureDailyPlan(draft, today);
      const id = createId('task');
      const timestamp = nowIso();
      draft.tasks[id] = {
        ...sourceTask,
        id,
        status: 'active',
        sortOrder: makeTaskSortOrder(plan.taskIds, draft.tasks),
        dateBucket: today,
        createdAt: timestamp,
        updatedAt: timestamp,
        completedAt: null
      };

      plan.taskIds.push(id);
      if (!plan.currentTaskId) {
        plan.currentTaskId = id;
      }
      recalculatePlan(draft, today);
    });
  }

  async addGoal(input: GoalInput): Promise<void> {
    const normalizedTitle = input.title.trim();
    if (!normalizedTitle) {
      return;
    }

    await this.updateState((draft) => {
      const timestamp = nowIso();
      const goal: Goal = {
        id: createId('goal'),
        title: normalizedTitle,
        color: input.color ?? getDefaultGoalColor(draft.goals),
        description: normalizeText(input.description),
        topPriority: normalizeText(input.topPriority),
        targetEndDate: input.targetEndDate || null,
        isArchived: false,
        sortOrder: makeGoalSortOrder(draft.goals),
        createdAt: timestamp,
        updatedAt: timestamp
      };
      draft.goals.push(goal);
    });
  }

  async renameGoal(goalId: string, title: string): Promise<void> {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      return;
    }

    await this.updateState((draft) => {
      const goal = draft.goals.find((item) => item.id === goalId);
      if (!goal) {
        return;
      }

      goal.title = normalizedTitle;
      goal.updatedAt = nowIso();
    });
  }

  async updateGoal(goalId: string, updates: GoalUpdate): Promise<void> {
    await this.updateState((draft) => {
      const goal = draft.goals.find((item) => item.id === goalId);
      if (!goal) {
        return;
      }

      if (typeof updates.title === 'string') {
        const normalizedTitle = updates.title.trim();
        if (normalizedTitle) {
          goal.title = normalizedTitle;
        }
      }

      if ('description' in updates) {
        goal.description = normalizeText(updates.description);
      }

      if ('topPriority' in updates) {
        goal.topPriority = normalizeText(updates.topPriority);
      }

      if ('targetEndDate' in updates) {
        goal.targetEndDate = updates.targetEndDate || null;
      }

      if (typeof updates.color === 'string') {
        goal.color = updates.color;
      }

      goal.updatedAt = nowIso();
    });
  }

  async updateGoalColor(goalId: string, color: string): Promise<void> {
    await this.updateGoal(goalId, { color });
  }

  async archiveGoal(goalId: string): Promise<void> {
    await this.updateState((draft) => {
      const goal = draft.goals.find((item) => item.id === goalId);
      if (!goal) {
        return;
      }

      goal.isArchived = true;
      goal.updatedAt = nowIso();

      Object.values(draft.tasks).forEach((task) => {
        if (task.goalId === goalId && task.status === 'active') {
          task.goalId = null;
          task.updatedAt = nowIso();
        }
      });
    });
  }

  async startFocusSession(minutes?: TimerMinutes): Promise<void> {
    await this.updateState((draft, today) => {
      const currentSession = getActiveSession(draft);
      if (currentSession) {
        return;
      }

      if (minutes) {
        draft.preferences.timerMinutes = minutes;
      }

      const plan = ensureDailyPlan(draft, today);
      const id = createId('session');
      draft.sessions[id] = {
        id,
        taskId: plan.currentTaskId,
        startedAt: nowIso(),
        endedAt: null,
        durationSeconds: draft.preferences.timerMinutes * 60,
        type: 'focus',
        wasCompleted: false
      };
      plan.sessionCount += 1;
      plan.updatedAt = nowIso();
    });
  }

  async stopFocusSession(wasCompleted = false): Promise<void> {
    await this.updateState((draft) => {
      const activeSession = getActiveSession(draft);
      if (!activeSession) {
        return;
      }

      activeSession.endedAt = nowIso();
      activeSession.wasCompleted = wasCompleted;
    });
  }

  async saveReviewEntry(
    period: ReviewPeriod,
    periodKey: string,
    content: string,
    scopeId: string | null = null
  ): Promise<void> {
    await this.updateState((draft) => {
      const key = `${period}:${periodKey}:${scopeId ?? 'overall'}`;
      const timestamp = nowIso();
      const existing = draft.reviews[key];

      draft.reviews[key] = {
        id: existing?.id ?? createId('review'),
        period,
        periodKey,
        scopeId,
        content,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp
      };
    });
  }

  async importState(raw: string): Promise<void> {
    const parsed = JSON.parse(raw) as AppState;
    const next = migrateState(parsed, getLocalDateKey());
    await writePersistedState(next);
    this.setSnapshotFromState(next);
  }

  async resetState(): Promise<void> {
    const next = createDefaultState(getLocalDateKey());
    await writePersistedState(next);
    this.setSnapshotFromState(next);
  }

  async syncTodayTasksForGoal(goalId: string | null, rawValue: string): Promise<void> {
    await this.updateState((draft, today) => {
      const plan = ensureDailyPlan(draft, today);
      const desiredTitles = rawValue
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const existingTaskIds = plan.taskIds.filter((taskId) => {
        const task = draft.tasks[taskId];
        return task?.status === 'active' && task.goalId === goalId;
      });
      const timestamp = nowIso();

      desiredTitles.forEach((title, index) => {
        const existingTaskId = existingTaskIds[index];

        if (existingTaskId) {
          const task = draft.tasks[existingTaskId];
          if (!task) {
            return;
          }

          task.title = title;
          task.updatedAt = timestamp;
          task.sortOrder = (index + 1) * 100;
          return;
        }

        const id = createId('task');
        draft.tasks[id] = {
          id,
          title,
          goalId,
          status: 'active',
          sortOrder: (index + 1) * 100,
          dateBucket: today,
          createdAt: timestamp,
          updatedAt: timestamp,
          completedAt: null
        };
        plan.taskIds.push(id);
        existingTaskIds.push(id);
      });

      existingTaskIds.slice(desiredTitles.length).forEach((taskId) => {
        plan.taskIds = plan.taskIds.filter((id) => id !== taskId);
        if (plan.currentTaskId === taskId) {
          plan.currentTaskId = null;
        }
        delete draft.tasks[taskId];
      });

      reorderTodayPlanByGoalLanes(draft, today);
      recalculatePlan(draft, today);

      if (!plan.currentTaskId) {
        plan.currentTaskId = getNextActiveTaskId(draft, today);
      }
    });
  }

  async syncTodayTasksFromUnifiedText(rawValue: string, orderedGoalIds: string[]): Promise<void> {
    await this.updateState((draft, today) => {
      const plan = ensureDailyPlan(draft, today);
      const desiredEntries = rawValue
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const match = line.match(/^(\d+|&)\)\s*(.+)$/);
          if (!match) {
            return { goalId: null as string | null, title: line };
          }

          const [, token, title] = match;
          if (token === '&') {
            return { goalId: null as string | null, title: title.trim() };
          }

          const goalId = orderedGoalIds[Number(token) - 1] ?? null;
          return { goalId, title: title.trim() };
        })
        .filter((entry) => entry.title);
      const existingActiveIds = plan.taskIds.filter((taskId) => draft.tasks[taskId]?.status === 'active');
      const timestamp = nowIso();
      const nextActiveIds: string[] = [];

      desiredEntries.forEach((entry, index) => {
        const existingTaskId = existingActiveIds[index];

        if (existingTaskId) {
          const task = draft.tasks[existingTaskId];
          if (!task) {
            return;
          }

          task.title = entry.title;
          task.goalId = entry.goalId;
          task.updatedAt = timestamp;
          task.sortOrder = (index + 1) * 100;
          nextActiveIds.push(existingTaskId);
          return;
        }

        const id = createId('task');
        draft.tasks[id] = {
          id,
          title: entry.title,
          goalId: entry.goalId,
          status: 'active',
          sortOrder: (index + 1) * 100,
          dateBucket: today,
          createdAt: timestamp,
          updatedAt: timestamp,
          completedAt: null
        };
        nextActiveIds.push(id);
      });

      existingActiveIds.slice(desiredEntries.length).forEach((taskId) => {
        plan.taskIds = plan.taskIds.filter((id) => id !== taskId);
        if (plan.currentTaskId === taskId) {
          plan.currentTaskId = null;
        }
        delete draft.tasks[taskId];
      });

      const completedIds = plan.taskIds.filter((taskId) => draft.tasks[taskId]?.status !== 'active');
      plan.taskIds = [...nextActiveIds, ...completedIds];
      recalculatePlan(draft, today);

      if (!plan.currentTaskId) {
        plan.currentTaskId = getNextActiveTaskId(draft, today);
      }
    });
  }

  private async updateState(mutator: Mutator): Promise<void> {
    const today = getLocalDateKey();
    const base = migrateState(await readPersistedState(), today);
    const draft = structuredClone(base);
    ensureDailyPlan(draft, today);
    mutator(draft, today);
    normalizeState(draft);
    await writePersistedState(draft);
    this.setSnapshotFromState(draft);
  }

  private setSnapshotFromState(state: AppState): void {
    const today = getLocalDateKey();
    ensureDailyPlan(state, today);
    const activeSession = getActiveSession(state);
    this.snapshot = {
      ready: true,
      state,
      today,
      activeSessionId: activeSession?.id ?? null
    };
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const appStore = new AppStore();

export function getYesterdayTasks(state: AppState, today: string) {
  const yesterday = getPreviousDateKey(today);
  const plan = state.dailyPlans[yesterday];
  if (!plan) {
    return { yesterday, tasks: [] as AppState['tasks'][string][] };
  }

  return {
    yesterday,
    tasks: plan.taskIds
      .map((taskId) => state.tasks[taskId])
      .filter((task) => task && task.status === 'active')
  };
}
