import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { CurrentTaskHero } from './components/CurrentTaskHero';
import { EmptyState } from './components/EmptyState';
import { GoalCountdownText } from './components/GoalCountdownText';
import { GoalDetailsEditor } from './components/GoalDetailsEditor';
import { GoalChip } from './components/GoalChip';
import { HistoryDayCard } from './components/HistoryDayCard';
import { InlineEditableText } from './components/InlineEditableText';
import { ReviewCalendar } from './components/ReviewCalendar';
import { ReviewNotebook } from './components/ReviewNotebook';
import { ReviewTaskEditor } from './components/ReviewTaskEditor';
import { SectionCard } from './components/SectionCard';
import { TaskCard } from './components/TaskCard';
import { UnifiedTaskEditor } from './components/UnifiedTaskEditor';
import { ViewToggle } from './components/ViewToggle';
import { WorkspaceTabs } from './components/WorkspaceTabs';
import {
  formatLongDate,
  formatGoalTargetDate,
  formatMonthYear,
  formatShortDate,
  formatWeekRange,
  getLocalDateKey,
  getMinutesRemaining,
  getMonthDates,
  getMonthKey,
  getNextMonthLabel,
  getWeekDates,
  getWeekStartKey,
  parseDateKey
} from './lib/date';
import { appStore, getYesterdayTasks } from './lib/store';
import { getActiveSession, getCurrentTask } from './lib/state';
import { useAppSnapshot } from './hooks/useAppSnapshot';
import type { Goal, Task, TaskFontChoice, ThemeMode, ViewMode } from './types';

type GoalBucket = {
  key: string;
  title: string;
  color: string;
  description?: string;
  topPriority?: string;
  topPriorityDescription?: string;
  targetEndDate?: string | null;
  goalId: string | null;
  tasks: Task[];
};

type GoalVerdict = 'enough' | 'not-enough' | 'day-off';

const GOAL_VERDICTS: GoalVerdict[] = ['enough', 'not-enough', 'day-off'];
const GOAL_COLORS = ['#8a7bff', '#5cbf9f', '#e88465', '#d4a94c', '#5d90d8', '#c978a9', '#6bb2d6', '#c46d5e'];
const TASK_FONT_OPTIONS: Array<{ value: TaskFontChoice; label: string }> = [
  { value: 'editorial-serif', label: 'Editorial Serif' },
  { value: 'clean-sans', label: 'Clean Sans' },
  { value: 'humanist-sans', label: 'Humanist Sans' },
  { value: 'mono', label: 'Mono' }
];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || ['input', 'textarea', 'select'].includes(tagName);
}

function getThemePreference(theme: ThemeMode): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

function getTaskFontStack(choice: TaskFontChoice): string {
  if (choice === 'clean-sans') {
    return '"Aptos", "Segoe UI Variable", "Segoe UI", sans-serif';
  }

  if (choice === 'humanist-sans') {
    return '"Gill Sans", "Trebuchet MS", "Aptos", sans-serif';
  }

  if (choice === 'mono') {
    return '"IBM Plex Mono", "SFMono-Regular", "Menlo", monospace';
  }

  return '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif';
}

function describeHistory(tasks: Task[]): string {
  const doneCount = tasks.filter((task) => task.status === 'done').length;
  const activeCount = tasks.filter((task) => task.status === 'active').length;
  return `${doneCount} done • ${activeCount} active`;
}

function buildGoalBuckets(tasks: Task[], goals: Goal[]): GoalBucket[] {
  return [
    ...goals.map((goal) => ({
      key: goal.id,
      title: goal.title,
      color: goal.color,
      description: goal.description,
      topPriority: goal.topPriority,
      topPriorityDescription: goal.topPriorityDescription,
      targetEndDate: goal.targetEndDate,
      goalId: goal.id as string | null,
      tasks: tasks.filter((task) => task.goalId === goal.id)
    })),
    {
      key: 'ungrouped',
      title: 'Misc',
      color: 'var(--accent)',
      description: 'Tasks that do not belong to a specific goal yet.',
      topPriority: undefined,
      topPriorityDescription: undefined,
      targetEndDate: null,
      goalId: null,
      tasks: tasks.filter((task) => task.goalId == null)
    }
  ];
}

function buildDailyReviewTemplate(): string {
  return `What mattered most today?\n\n\nWhat felt insufficient, unfinished, or still noisy?\n\n\nWhat do you want to carry in mind for tomorrow?\n\n`;
}

function buildWeeklyReviewTemplate(): string {
  return `1. What went really well this week? What did you do that worked? How can you do more of that?\n\n\n2. What got in the way? What didn't work?\n\n\n3. Based on that, how do you want to be approaching things?\n\n\n4. What are your priorities for the upcoming week?\n\n`;
}

function buildWeeklyRemarksTemplate(): string {
  return `1. What are you hoping to get out of this week's review?\n\n\n2. How are you feeling about the balance of focus between your goals?\n\n`;
}

function buildWeeklyMiscTemplate(): string {
  return `How are your keystone habits (sleep, exercise, ) going?\n\n`;
}

function buildMonthlyGoalTemplate(_goalTitle: string, nextMonthLabel: string): string {
  return `1. What problem are you really trying to solve here?\n\n\n2. What can you do in ${nextMonthLabel} to really make headway on that?\n\n`;
}

function buildMonthlyOverallTemplate(): string {
  return `How is your year going, overall?\n\n`;
}

function verdictLabel(verdict: GoalVerdict): string {
  if (verdict === 'not-enough') {
    return 'Not enough';
  }

  if (verdict === 'day-off') {
    return 'Day off';
  }

  return 'Enough';
}

function describeGoalCountdown(targetEndDate: string | null | undefined, today: string): string | null {
  if (!targetEndDate) {
    return null;
  }

  const target = parseDateKey(targetEndDate);
  const current = parseDateKey(today);
  target.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target.getTime() - current.getTime()) / 86_400_000);

  if (diffDays === 0) {
    return 'Due today';
  }

  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} left`;
  }

  const overdueDays = Math.abs(diffDays);
  return `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`;
}

export default function App() {
  const snapshot = useAppSnapshot();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showYesterdayReview, setShowYesterdayReview] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [newGoalTopPriority, setNewGoalTopPriority] = useState('');
  const [newGoalTopPriorityDescription, setNewGoalTopPriorityDescription] = useState('');
  const [newGoalEndDate, setNewGoalEndDate] = useState('');
  const [newGoalColor, setNewGoalColor] = useState(GOAL_COLORS[0]);
  const [dailyReviewDate, setDailyReviewDate] = useState<string | null>(null);
  const [weeklyReviewKey, setWeeklyReviewKey] = useState<string | null>(null);
  const [monthlyReviewKey, setMonthlyReviewKey] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [dataMessage, setDataMessage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const firstLaneRef = useRef<HTMLTextAreaElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const { ready, state, today } = snapshot;
  const todayPlan = state.dailyPlans[today];
  const todayTasks = useMemo(
    () => todayPlan.taskIds.map((taskId) => state.tasks[taskId]).filter(Boolean),
    [state.tasks, todayPlan.taskIds]
  );
  const activeTasks = useMemo(() => todayTasks.filter((task) => task.status === 'active'), [todayTasks]);
  const currentTask = getCurrentTask(state, today);
  const activeSession = getActiveSession(state);
  const viewMode = state.preferences.lastViewMode;
  const activeTab = state.preferences.activeTab;
  const isZenLayout = activeTab === 'today' && viewMode === 'zen';
  const activeGoals = state.goals.filter((goal) => !goal.isArchived);
  const selectedGoal =
    currentTask?.goalId ? state.goals.find((goal) => goal.id === currentTask.goalId) ?? null : null;
  const progressText = `${todayPlan.completedCount} of ${todayTasks.length} done`;
  const tasksLeftText = `${activeTasks.length} left today`;
  const historyDates = Object.keys(state.dailyPlans).sort((left, right) => right.localeCompare(left));
  const yesterday = getYesterdayTasks(state, today);
  const timerRemaining = activeSession
    ? getMinutesRemaining(activeSession.startedAt, state.preferences.timerMinutes)
    : state.preferences.timerMinutes;
  const theme = getThemePreference(state.preferences.theme);
  const availableWeekKeys = [...new Set(historyDates.map((date) => getWeekStartKey(date)))];
  const availableMonthKeys = [...new Set(historyDates.map((date) => getMonthKey(date)))];
  const selectedDailyReviewDate = dailyReviewDate ?? historyDates[0] ?? today;
  const selectedWeeklyReviewKey = weeklyReviewKey ?? availableWeekKeys[0] ?? getWeekStartKey(today);
  const selectedMonthlyReviewKey = monthlyReviewKey ?? availableMonthKeys[0] ?? getMonthKey(today);
  const currentMonthDates = getMonthDates(selectedMonthlyReviewKey);
  const nextMonthLabel = getNextMonthLabel(selectedMonthlyReviewKey);

  const dailyReviewTasks = (state.dailyPlans[selectedDailyReviewDate]?.taskIds ?? [])
    .map((taskId) => state.tasks[taskId])
    .filter(Boolean);
  const dailyReviewSections = [
    ...activeGoals.map((goal) => ({
      key: goal.id,
      goalId: goal.id as string | null,
      title: goal.title,
      color: goal.color,
      topPriority: goal.topPriority,
      topPriorityDescription: goal.topPriorityDescription,
      targetEndDate: goal.targetEndDate,
      notesScopeId: `${goal.id}:notes`,
      supportsReflection: true
    })),
    {
      key: 'misc',
      goalId: null,
      title: 'Misc',
      color: 'var(--accent)',
      topPriority: undefined,
      topPriorityDescription: undefined,
      targetEndDate: null,
      notesScopeId: null,
      supportsReflection: false
    }
  ];
  const weeklyDates = getWeekDates(selectedWeeklyReviewKey);
  const weeklyTimeline = weeklyDates.map((dateKey) => {
    const tasks = (state.dailyPlans[dateKey]?.taskIds ?? [])
      .map((taskId) => state.tasks[taskId])
      .filter(Boolean);

    return {
      dateKey,
      buckets: buildGoalBuckets(tasks, activeGoals).filter((bucket) => bucket.tasks.length > 0)
    };
  });
  const monthlyCalendarDays = useMemo(() => {
    const firstDate = parseDateKey(currentMonthDates[0] ?? `${selectedMonthlyReviewKey}-01`);
    const mondayIndex = firstDate.getDay() === 0 ? 6 : firstDate.getDay() - 1;
    const leading = Array.from({ length: mondayIndex }, (_, index) => {
      const date = new Date(firstDate);
      date.setDate(firstDate.getDate() - mondayIndex + index);
      const dateKey = getLocalDateKey(date);
      const tasks = (state.dailyPlans[dateKey]?.taskIds ?? [])
        .map((taskId) => state.tasks[taskId])
        .filter(Boolean);

      return {
        dateKey,
        dayNumber: date.getDate(),
        taskCount: tasks.length,
        completedCount: tasks.filter((task) => task.status === 'done').length,
        isCurrentMonth: false
      };
    });

    const main = currentMonthDates.map((dateKey) => {
      const tasks = (state.dailyPlans[dateKey]?.taskIds ?? [])
        .map((taskId) => state.tasks[taskId])
        .filter(Boolean);

      return {
        dateKey,
        dayNumber: parseDateKey(dateKey).getDate(),
        taskCount: tasks.length,
        completedCount: tasks.filter((task) => task.status === 'done').length,
        isCurrentMonth: true
      };
    });

    const trailingCount = (7 - ((leading.length + main.length) % 7 || 7)) % 7;
    const lastCurrent = parseDateKey(currentMonthDates[currentMonthDates.length - 1] ?? `${selectedMonthlyReviewKey}-01`);
    const trailing = Array.from({ length: trailingCount }, (_, index) => {
      const date = new Date(lastCurrent);
      date.setDate(lastCurrent.getDate() + index + 1);
      const dateKey = getLocalDateKey(date);
      const tasks = (state.dailyPlans[dateKey]?.taskIds ?? [])
        .map((taskId) => state.tasks[taskId])
        .filter(Boolean);

      return {
        dateKey,
        dayNumber: date.getDate(),
        taskCount: tasks.length,
        completedCount: tasks.filter((task) => task.status === 'done').length,
        isCurrentMonth: false
      };
    });

    return [...leading, ...main, ...trailing];
  }, [currentMonthDates, selectedMonthlyReviewKey, state.dailyPlans, state.tasks]);

  const getReviewValue = (period: 'daily' | 'weekly' | 'monthly', periodKey: string, scopeId: string | null = null) =>
    state.reviews[`${period}:${periodKey}:${scopeId ?? 'overall'}`]?.content ?? '';
  const getDailyGoalVerdict = (dateKey: string, goalId: string) =>
    (getReviewValue('daily', dateKey, goalId) as GoalVerdict | '') || null;
  const getTasksForGoalOnDate = (goalId: string | null, dateKey: string) =>
    ((state.dailyPlans[dateKey]?.taskIds ?? []).map((taskId) => state.tasks[taskId]).filter(Boolean) as Task[]).filter(
      (task) => task.goalId === goalId
    );

  useEffect(() => {
    if (!selectedTaskId || !state.tasks[selectedTaskId] || state.tasks[selectedTaskId].status !== 'active') {
      setSelectedTaskId(currentTask?.id ?? activeTasks[0]?.id ?? null);
    }
  }, [activeTasks, currentTask?.id, selectedTaskId, state.tasks]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty('--hero-task-font', getTaskFontStack(state.preferences.heroTaskFont));
    document.documentElement.style.setProperty('--zen-task-font', getTaskFontStack(state.preferences.heroTaskFont));
  }, [state.preferences.heroTaskFont, theme]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        if (event.key === 'Escape') {
          (event.target as HTMLElement).blur();
        }
        return;
      }

      if (event.key === '?') {
        event.preventDefault();
        setShowHelp((current) => !current);
        return;
      }

      if (event.key === 'e') {
        event.preventDefault();
        void appStore.setActiveTab('today');
        void appStore.setViewMode(viewMode === 'edit' ? 'zen' : 'edit');
        return;
      }

      if (event.key === 'n') {
        event.preventDefault();
        void appStore.setActiveTab('today');
        void appStore.setViewMode('edit');
        window.setTimeout(() => {
          firstLaneRef.current?.focus();
        }, 40);
        return;
      }

      if (event.key === 'x') {
        event.preventDefault();
        const taskId = selectedTaskId ?? currentTask?.id;
        if (taskId) {
          void appStore.completeTask(taskId);
        }
        return;
      }

      if (event.key === 'c') {
        event.preventDefault();
        if (selectedTaskId) {
          void appStore.setCurrentTask(selectedTaskId);
        }
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (!selectedTaskId) {
          return;
        }

        event.preventDefault();
        if (!state.preferences.confirmDelete || window.confirm('Delete this task from today?')) {
          void appStore.deleteTask(selectedTaskId);
        }
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        if (activeSession) {
          void appStore.stopFocusSession(false);
        } else if (state.preferences.timerEnabled) {
          void appStore.startFocusSession();
        }
        return;
      }

      if (event.key === 'Escape') {
        setShowHelp(false);
        setShowYesterdayReview(false);
        setShowSettings(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeSession,
    activeTasks,
    currentTask?.id,
    selectedTaskId,
    state.preferences.confirmDelete,
    state.preferences.timerEnabled,
    viewMode
  ]);

  if (!ready) {
    return <div className="loading-shell">Loading...</div>;
  }

  async function handleDeleteTask(taskId: string) {
    if (!state.preferences.confirmDelete || window.confirm('Delete this task from today?')) {
      await appStore.deleteTask(taskId);
    }
  }

  function handleExportData() {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `intend-backup-${today}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setDataMessage('Exported your data as JSON.');
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const shouldImport = window.confirm('Importing will replace the current local data. Continue?');
    if (!shouldImport) {
      event.target.value = '';
      return;
    }

    try {
      const content = await file.text();
      await appStore.importState(content);
      setDataMessage('Imported data successfully.');
    } catch {
      setDataMessage('Import failed. Please use a valid New Tab JSON export.');
    } finally {
      event.target.value = '';
    }
  }

  async function handleResetData() {
    const shouldReset = window.confirm('Reset all local data? This will remove goals, tasks, sessions, and reviews.');
    if (!shouldReset) {
      return;
    }

    await appStore.resetState();
    setDataMessage('All local data has been reset.');
  }

  function renderTask(task: Task) {
    const goal = task.goalId ? state.goals.find((item) => item.id === task.goalId) ?? null : null;
    return (
      <TaskCard
        key={task.id}
        task={task}
        goal={goal}
        isCurrent={todayPlan.currentTaskId === task.id}
        isSelected={selectedTaskId === task.id}
        onSelect={() => setSelectedTaskId(task.id)}
        onSetCurrent={() => void appStore.setCurrentTask(task.id)}
        onComplete={() => void appStore.completeTask(task.id)}
        onDelete={() => void handleDeleteTask(task.id)}
        onMove={(direction) => void appStore.moveTask(task.id, direction)}
        onAssignGoal={(goalId) => void appStore.assignTaskGoal(task.id, goalId)}
        onSaveTitle={(title) => appStore.updateTaskTitle(task.id, title)}
        goalOptions={activeGoals}
      />
    );
  }

  function renderSettingsControls() {
    return (
      <div className="settings-list">
        <label className="setting-row">
          <span>Opening view</span>
          <select
            value={state.preferences.defaultView}
            onChange={(event) => void appStore.updatePreference('defaultView', event.target.value as ViewMode)}
          >
            <option value="zen">Zen</option>
            <option value="edit">Edit</option>
          </select>
        </label>
        <label className="setting-row">
          <span>Theme</span>
          <select
            value={state.preferences.theme}
            onChange={(event) => void appStore.updatePreference('theme', event.target.value as ThemeMode)}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label className="setting-row">
          <span>Task font</span>
          <select
            value={state.preferences.heroTaskFont}
            onChange={(event) => void appStore.updatePreference('heroTaskFont', event.target.value as TaskFontChoice)}
          >
            {TASK_FONT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="setting-row">
          <span>Show goal chip</span>
          <input
            type="checkbox"
            checked={state.preferences.showGoalChip}
            onChange={(event) => void appStore.updatePreference('showGoalChip', event.target.checked)}
          />
        </label>
        <label className="setting-row">
          <span>Enable timer</span>
          <input
            type="checkbox"
            checked={state.preferences.timerEnabled}
            onChange={(event) => void appStore.updatePreference('timerEnabled', event.target.checked)}
          />
        </label>
        <label className="setting-row">
          <span>Timer length</span>
          <select
            value={state.preferences.timerMinutes}
            onChange={(event) => void appStore.updatePreference('timerMinutes', Number(event.target.value) as 15 | 25 | 50)}
          >
            <option value="15">15 min</option>
            <option value="25">25 min</option>
            <option value="50">50 min</option>
          </select>
        </label>
        <label className="setting-row">
          <span>Confirm delete</span>
          <input
            type="checkbox"
            checked={state.preferences.confirmDelete}
            onChange={(event) => void appStore.updatePreference('confirmDelete', event.target.checked)}
          />
        </label>
      </div>
    );
  }

  function renderTodayTab() {
    return (
      <>
        {todayTasks.length === 0 && yesterday.tasks.length > 0 ? (
          <section className="carry-card">
            <div>
              <h2>Carry forward?</h2>
              <p>{yesterday.tasks.length} unfinished items are waiting if you want them.</p>
            </div>
            <div className="carry-card__actions">
              <button className="button button--ghost" type="button" onClick={() => setShowYesterdayReview(true)}>
                Review yesterday
              </button>
              <button
                className="button button--soft"
                type="button"
                onClick={() => {
                  yesterday.tasks.forEach((task) => void appStore.carryTaskToToday(task.id));
                }}
              >
                Carry all
              </button>
              <button className="button button--primary" type="button" onClick={() => setShowYesterdayReview(false)}>
                Start fresh
              </button>
            </div>
          </section>
        ) : null}

        <CurrentTaskHero
          viewMode={viewMode}
          dateLabel={formatLongDate(today)}
          currentTask={currentTask}
          currentGoal={selectedGoal}
          showGoalChip={state.preferences.showGoalChip}
          timerEnabled={state.preferences.timerEnabled}
          timerIsActive={Boolean(activeSession)}
          timerMinutes={timerRemaining}
          onDone={() => {
            if (currentTask) {
              void appStore.completeTask(currentTask.id);
            } else {
              void appStore.setViewMode('edit');
            }
          }}
          onEdit={() => void appStore.setViewMode('edit')}
          onNext={() => void appStore.cycleCurrentTask()}
          onPlan={() => void appStore.setViewMode('edit')}
          onPickTopTask={() => void appStore.setCurrentTask(activeTasks[0]?.id ?? null)}
          onToggleTimer={() => {
            if (activeSession) {
              void appStore.stopFocusSession(false);
            } else {
              void appStore.startFocusSession();
            }
          }}
        />

        {viewMode === 'edit' ? (
          <section className="edit-layout">
            <div className="edit-layout__primary">
              <SectionCard title="Today">
                <UnifiedTaskEditor
                  goals={activeGoals}
                  tasks={activeTasks}
                  editorRef={firstLaneRef}
                  onCommit={(value) => appStore.syncTodayTasksFromUnifiedText(value, activeGoals.map((goal) => goal.id))}
                />

                {activeTasks.length === 0 ? (
                  <EmptyState
                    title="No tasks yet"
                    description="Add one task per line."
                  />
                ) : null}
              </SectionCard>
            </div>

            <div className="edit-layout__secondary">
              <SectionCard title="Tasks">
                <div className="task-stack">{todayTasks.map(renderTask)}</div>
              </SectionCard>

              {state.preferences.timerEnabled ? (
                <SectionCard title="Timer">
                  <div className="timer-panel">
                    <div>
                      <p className="timer-panel__eyebrow">Focus timer</p>
                      <h3>{activeSession ? `${timerRemaining} minutes left` : `${state.preferences.timerMinutes} minute session`}</h3>
                    </div>
                    <div className="current-panel__actions">
                      <button
                        className="button button--primary"
                        type="button"
                        onClick={() => {
                          if (activeSession) {
                            void appStore.stopFocusSession(false);
                          } else {
                            void appStore.startFocusSession();
                          }
                        }}
                      >
                        {activeSession ? 'Stop focus' : 'Start focus'}
                      </button>
                    </div>
                  </div>
                </SectionCard>
              ) : null}
            </div>
          </section>
        ) : null}
      </>
    );
  }

  function renderGoalsTab() {
    return (
      <section className="single-column-layout">
        <SectionCard title="Goals">
          <form
            className="goal-form"
            onSubmit={(event) => {
              event.preventDefault();
              void appStore.addGoal({
                title: newGoalTitle,
                description: newGoalDescription,
                topPriority: newGoalTopPriority,
                topPriorityDescription: newGoalTopPriorityDescription,
                targetEndDate: newGoalEndDate || null,
                color: newGoalColor
              });
              setNewGoalTitle('');
              setNewGoalDescription('');
              setNewGoalTopPriority('');
              setNewGoalTopPriorityDescription('');
              setNewGoalEndDate('');
              setNewGoalColor(GOAL_COLORS[(activeGoals.length + 1) % GOAL_COLORS.length]);
            }}
          >
            <input
              type="text"
              value={newGoalTitle}
              onChange={(event) => setNewGoalTitle(event.target.value)}
              placeholder="Create a goal"
            />
            <textarea
              value={newGoalDescription}
              onChange={(event) => setNewGoalDescription(event.target.value)}
              placeholder="Describe your goal. What are you trying to achieve?"
              rows={3}
            />
            <input
              type="text"
              value={newGoalTopPriority}
              onChange={(event) => setNewGoalTopPriority(event.target.value)}
              placeholder="Top priority"
            />
            <textarea
              value={newGoalTopPriorityDescription}
              onChange={(event) => setNewGoalTopPriorityDescription(event.target.value)}
              placeholder="Use this box to describe the priority above. What's success? What's not needed/extra?"
              rows={3}
            />
            <input type="datetime-local" value={newGoalEndDate} onChange={(event) => setNewGoalEndDate(event.target.value)} />
            <div className="goal-palette" role="listbox" aria-label="Goal color">
              {GOAL_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`goal-palette__swatch ${newGoalColor === color ? 'is-active' : ''}`.trim()}
                  style={{ ['--goal-color' as string]: color }}
                  onClick={() => setNewGoalColor(color)}
                  aria-selected={newGoalColor === color}
                />
              ))}
            </div>
            <button className="button button--primary" type="submit">
              Add goal
            </button>
          </form>

          <div className="goal-list">
            {activeGoals.length > 0 ? (
              activeGoals.map((goal) => (
                <div className="goal-card" key={goal.id} style={{ ['--goal-color' as string]: goal.color }}>
                  <div className="goal-row">
                    <div className="goal-row__identity">
                      <InlineEditableText value={goal.title} onSave={(title) => appStore.renameGoal(goal.id, title)} />
                      {goal.description ? <p className="goal-row__summary">{goal.description}</p> : null}
                    </div>
                    <div className="goal-row__actions">
                      <button
                        className="button button--ghost"
                        type="button"
                        onClick={() => setEditingGoalId((current) => (current === goal.id ? null : goal.id))}
                      >
                        {editingGoalId === goal.id ? 'Close' : 'Edit'}
                      </button>
                      <div className="goal-palette" role="listbox" aria-label={`Goal color for ${goal.title}`}>
                        {GOAL_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`goal-palette__swatch ${goal.color === color ? 'is-active' : ''}`.trim()}
                            style={{ ['--goal-color' as string]: color }}
                            onClick={() => void appStore.updateGoalColor(goal.id, color)}
                            aria-selected={goal.color === color}
                          />
                        ))}
                      </div>
                      <button className="button button--ghost" type="button" onClick={() => void appStore.archiveGoal(goal.id)}>
                        Archive
                      </button>
                    </div>
                  </div>
                  <div className="goal-overview">
                    {goal.topPriority ? (
                      <div className="goal-overview__item">
                        <span>Top priority</span>
                        <strong>{goal.topPriority}</strong>
                        {goal.topPriorityDescription ? <p>{goal.topPriorityDescription}</p> : null}
                      </div>
                    ) : null}
                    {goal.targetEndDate ? (
                      <div className="goal-overview__item">
                        <span>End date</span>
                        <strong>{formatGoalTargetDate(goal.targetEndDate)}</strong>
                      </div>
                    ) : null}
                    {goal.targetEndDate ? (
                      <div className="goal-overview__item">
                        <span>Countdown</span>
                        <strong>
                          <GoalCountdownText targetEndDate={goal.targetEndDate} />
                        </strong>
                      </div>
                    ) : null}
                  </div>
                  {editingGoalId === goal.id ? (
                    <GoalDetailsEditor goal={goal} onSave={(updates) => appStore.updateGoal(goal.id, updates)} />
                  ) : null}
                </div>
              ))
            ) : (
              <EmptyState
                title="No goals yet"
                description="Add a goal to get started."
              />
            )}
          </div>
        </SectionCard>

        <SectionCard title="Data">
          <div className="data-tools">
            <input
              ref={importInputRef}
              className="sr-only"
              type="file"
              accept="application/json"
              onChange={(event) => void handleImportFile(event)}
            />
            <button className="button button--ghost" type="button" onClick={handleExportData}>
              Export JSON
            </button>
            <button className="button button--ghost" type="button" onClick={() => importInputRef.current?.click()}>
              Import JSON
            </button>
            <button className="button button--danger" type="button" onClick={() => void handleResetData()}>
              Reset data
            </button>
          </div>
          {dataMessage ? <p className="data-tools__message">{dataMessage}</p> : null}
        </SectionCard>
      </section>
    );
  }

  function renderReviewsTab() {
    return (
      <section className="reviews-layout">
        <header className="reviews-header">
          <div>
            <h2>Reviews</h2>
          </div>
          <div className="review-mode-toggle" role="tablist" aria-label="Review period">
            {(['daily', 'weekly', 'monthly'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={reviewMode === mode}
                className={`review-mode-toggle__item ${reviewMode === mode ? 'is-active' : ''}`.trim()}
                onClick={() => setReviewMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </header>

        {reviewMode === 'daily' ? (
          <div className="reviews-grid reviews-grid--single">
            <SectionCard title="Daily">
              <div className="history-days">
                {historyDates.slice(0, 14).map((date) => (
                  <HistoryDayCard
                    key={date}
                    title={date === today ? 'Today' : formatShortDate(date)}
                    subtitle={describeHistory(
                      (state.dailyPlans[date]?.taskIds ?? []).map((taskId) => state.tasks[taskId]).filter(Boolean)
                    )}
                    isActive={selectedDailyReviewDate === date}
                    onClick={() => setDailyReviewDate(date)}
                  />
                ))}
              </div>
              <div className="review-date-banner">
                <h3>{formatLongDate(selectedDailyReviewDate)}</h3>
              </div>

              <div className="review-day-list">
                {dailyReviewSections.map((section) => {
                  const tasks = getTasksForGoalOnDate(section.goalId, selectedDailyReviewDate);
                  const verdict = section.goalId ? getDailyGoalVerdict(selectedDailyReviewDate, section.goalId) : null;

                  return (
                    <section
                      className={`review-day-card ${verdict ? `is-${verdict}` : ''}`.trim()}
                      key={section.key}
                      style={{ ['--goal-color' as string]: section.color }}
                    >
                      <div className="review-day-card__header">
                        <div>
                          <h3>{section.title}</h3>
                          {section.topPriority ? <p className="review-day-card__subtle">{section.topPriority}</p> : null}
                          {section.targetEndDate ? (
                            <p className="review-day-card__meta">Target date: {formatGoalTargetDate(section.targetEndDate)}</p>
                          ) : null}
                        </div>
                        {section.supportsReflection ? (
                          <div className="review-verdict-row">
                            {GOAL_VERDICTS.map((option) => (
                              <button
                                key={option}
                                type="button"
                                className={`review-status-chip ${verdict === option ? `is-active is-${option}` : ''}`.trim()}
                                onClick={() =>
                                  section.goalId
                                    ? void appStore.saveReviewEntry(
                                        'daily',
                                        selectedDailyReviewDate,
                                        verdict === option ? '' : option,
                                        section.goalId
                                      )
                                    : undefined
                                }
                              >
                                {verdictLabel(option)}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="review-day-card__columns">
                        <div>
                          <ReviewTaskEditor
                            tasks={tasks}
                            onAddTask={(title) => appStore.addTask(title, section.goalId, selectedDailyReviewDate)}
                            onDeleteTask={(taskId) => handleDeleteTask(taskId)}
                            onSaveTitle={(taskId, title) => appStore.updateTaskTitle(taskId, title)}
                            onUpdateTaskStatus={(taskId, status) => appStore.updateTaskStatus(taskId, status)}
                          />
                        </div>
                        {section.supportsReflection && section.notesScopeId ? (
                          <div>
                            <ReviewNotebook
                              value={getReviewValue('daily', selectedDailyReviewDate, section.notesScopeId)}
                              template={buildDailyReviewTemplate()}
                              onSave={(value) =>
                                appStore.saveReviewEntry('daily', selectedDailyReviewDate, value, section.notesScopeId)
                              }
                              className="review-notebook--compact review-notebook--goal"
                              style={{ ['--goal-color' as string]: section.color }}
                            />
                          </div>
                        ) : null}
                      </div>
                    </section>
                  );
                })}
                {dailyReviewTasks.length === 0 ? (
                  <section className="review-day-card is-day-off">
                    <div className="review-day-card__header">
                      <div>
                        <h3>Whole day</h3>
                      </div>
                    </div>
                  </section>
                ) : null}
              </div>
            </SectionCard>
          </div>
        ) : null}

        {reviewMode === 'weekly' ? (
          <div className="reviews-grid reviews-grid--single">
            <SectionCard title="Weekly">
              <div className="history-days">
                {availableWeekKeys.map((weekKey) => (
                  <HistoryDayCard
                    key={weekKey}
                    title={formatShortDate(weekKey)}
                    subtitle={formatWeekRange(weekKey)}
                    isActive={selectedWeeklyReviewKey === weekKey}
                    onClick={() => setWeeklyReviewKey(weekKey)}
                  />
                ))}
              </div>

              <div className="reviews-stack">
                <ReviewNotebook
                  title="Week Remarks"
                  value={getReviewValue('weekly', selectedWeeklyReviewKey, 'remarks')}
                  template={buildWeeklyRemarksTemplate()}
                  lockedTemplate
                  onSave={(value) => appStore.saveReviewEntry('weekly', selectedWeeklyReviewKey, value, 'remarks')}
                />
                {activeGoals.map((goal) => (
                  <section className="review-goal-period" key={goal.id} style={{ ['--goal-color' as string]: goal.color }}>
                    <div className="review-goal-period__header">
                      <div>
                        <h3>{goal.title}</h3>
                        {goal.topPriority ? <p className="review-day-card__subtle">{goal.topPriority}</p> : null}
                      </div>
                    </div>
                    <div className="review-goal-period__content">
                      <div className="review-goal-period__left">
                        <div className="week-status-strip">
                          {weeklyDates.map((dateKey) => {
                            const verdict = getDailyGoalVerdict(dateKey, goal.id);
                            return (
                              <button
                                type="button"
                                key={`${goal.id}-${dateKey}`}
                                className={`week-status-pill ${verdict ? `is-${verdict}` : ''}`.trim()}
                                onClick={() => {
                                  setReviewMode('daily');
                                  setDailyReviewDate(dateKey);
                                }}
                              >
                                <strong>{formatShortDate(dateKey)}</strong>
                                <span className="week-status-pill__marker" aria-hidden="true" />
                              </button>
                            );
                          })}
                        </div>
                        <div className="weekly-days">
                          {weeklyDates.map((dateKey) => {
                            const tasks = getTasksForGoalOnDate(goal.id, dateKey);
                            const verdict = getDailyGoalVerdict(dateKey, goal.id);
                            return (
                              <section className={`weekly-day-card ${verdict ? `is-${verdict}` : ''}`.trim()} key={`${goal.id}-${dateKey}-list`}>
                                <header className="weekly-day-card__header">
                                  <strong>{formatLongDate(dateKey)}</strong>
                                  {verdict ? <span className={`review-status-chip is-active is-${verdict}`}>{verdictLabel(verdict)}</span> : null}
                                </header>
                                {tasks.length > 0 ? (
                                  <div className="review-task-list">
                                    {tasks.map((task) => (
                                      <div className={`review-task-row is-${task.status}`.trim()} key={task.id}>
                                        <span className="review-task-row__dot" />
                                        <span>{task.title}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="review-empty-strip" aria-hidden="true" />
                                )}
                              </section>
                            );
                          })}
                        </div>
                      </div>
                      <div className="review-goal-period__right">
                        <ReviewNotebook
                          value={getReviewValue('weekly', selectedWeeklyReviewKey, goal.id)}
                          template={buildWeeklyReviewTemplate()}
                          onSave={(value) => appStore.saveReviewEntry('weekly', selectedWeeklyReviewKey, value, goal.id)}
                          className="review-notebook--goal"
                          style={{ ['--goal-color' as string]: goal.color }}
                        />
                      </div>
                    </div>
                  </section>
                ))}
                <section className="review-goal-period" style={{ ['--goal-color' as string]: 'var(--accent)' }}>
                  <div className="review-goal-period__header">
                    <div>
                      <h3>Misc</h3>
                      <p className="review-day-card__subtle">Tasks tracked with `&` and anything without a goal.</p>
                    </div>
                  </div>
                  <div className="review-goal-period__content">
                    <div className="review-goal-period__left">
                      <div className="weekly-days">
                        {weeklyDates.map((dateKey) => {
                          const tasks = getTasksForGoalOnDate(null, dateKey);

                          return (
                            <section className="weekly-day-card" key={`misc-${dateKey}-list`}>
                              <header className="weekly-day-card__header">
                                <strong>{formatLongDate(dateKey)}</strong>
                              </header>
                              {tasks.length > 0 ? (
                                <div className="review-task-list">
                                  {tasks.map((task) => (
                                    <div className={`review-task-row is-${task.status}`.trim()} key={task.id}>
                                      <span className="review-task-row__dot" />
                                      <span>{task.title}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="review-empty-strip" aria-hidden="true" />
                              )}
                            </section>
                          );
                        })}
                      </div>
                    </div>
                    <div className="review-goal-period__right">
                      <ReviewNotebook
                        value={getReviewValue('weekly', selectedWeeklyReviewKey, 'misc')}
                        template={buildWeeklyMiscTemplate()}
                        lockedTemplate
                        onSave={(value) => appStore.saveReviewEntry('weekly', selectedWeeklyReviewKey, value, 'misc')}
                        className="review-notebook--goal"
                        style={{ ['--goal-color' as string]: 'var(--accent)' }}
                      />
                    </div>
                  </div>
                </section>
              </div>
            </SectionCard>
          </div>
        ) : null}

        {reviewMode === 'monthly' ? (
          <div className="reviews-grid reviews-grid--single">
            <SectionCard title="Monthly">
              <div className="history-days">
                {availableMonthKeys.map((monthKey) => (
                  <HistoryDayCard
                    key={monthKey}
                    title={formatMonthYear(monthKey)}
                    subtitle={`${getMonthDates(monthKey).length} days`}
                    isActive={selectedMonthlyReviewKey === monthKey}
                    onClick={() => setMonthlyReviewKey(monthKey)}
                  />
                ))}
              </div>
              <div className="reviews-stack">
                {activeGoals.map((goal) => {
                  const goalCalendarDays = monthlyCalendarDays.map((day) => {
                    const goalTasks = getTasksForGoalOnDate(goal.id, day.dateKey);
                    return {
                      ...day,
                      taskCount: goalTasks.length,
                      completedCount: goalTasks.filter((task) => task.status === 'done').length,
                      verdict: getDailyGoalVerdict(day.dateKey, goal.id)
                    };
                  });

                  return (
                    <section className="review-goal-period" key={goal.id} style={{ ['--goal-color' as string]: goal.color }}>
                      <div className="review-goal-period__header">
                        <div>
                          <h3>{goal.title}</h3>
                          {goal.topPriority ? <p className="review-day-card__subtle">{goal.topPriority}</p> : null}
                        </div>
                      </div>
                      <div className="review-goal-period__content review-goal-period__content--calendar">
                        <div className="review-goal-period__left review-goal-period__left--calendar">
                          <ReviewCalendar days={goalCalendarDays} />
                        </div>
                        <div className="review-goal-period__right">
                          <ReviewNotebook
                            value={getReviewValue('monthly', selectedMonthlyReviewKey, goal.id)}
                            template={buildMonthlyGoalTemplate(goal.title, nextMonthLabel)}
                            onSave={(content) => appStore.saveReviewEntry('monthly', selectedMonthlyReviewKey, content, goal.id)}
                            className="review-notebook--goal"
                            style={{ ['--goal-color' as string]: goal.color }}
                          />
                        </div>
                      </div>
                    </section>
                  );
                })}
                <ReviewNotebook
                  title="Overall remarks"
                  value={getReviewValue('monthly', selectedMonthlyReviewKey, 'overall')}
                  template={buildMonthlyOverallTemplate()}
                  onSave={(value) => appStore.saveReviewEntry('monthly', selectedMonthlyReviewKey, value, 'overall')}
                />
              </div>
            </SectionCard>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-shell__ambient page-shell__ambient--one" />
      <div className="page-shell__ambient page-shell__ambient--two" />

      <main className={`layout ${isZenLayout ? 'is-zen' : ''}`.trim()}>
        {!isZenLayout ? (
          <header className="topbar">
            <WorkspaceTabs value={activeTab} onChange={(tab) => void appStore.setActiveTab(tab)} />
            <div className="topbar__controls">
              {activeTab === 'today' ? (
                <ViewToggle value={viewMode} onChange={(mode) => void appStore.setViewMode(mode)} />
              ) : null}
              <button className="button button--ghost" type="button" onClick={() => setShowSettings(true)}>
                Settings
              </button>
              <button className="button button--ghost" type="button" onClick={() => setShowHelp(true)}>
                Shortcuts
              </button>
            </div>
          </header>
        ) : null}

        {activeTab === 'today' ? renderTodayTab() : null}
        {activeTab === 'goals' ? renderGoalsTab() : null}
        {activeTab === 'reviews' ? renderReviewsTab() : null}

        {showYesterdayReview ? (
          <section className="modal-shell" role="dialog" aria-modal="true">
            <div className="modal-card">
              <div className="modal-card__header">
                <div>
                  <p className="section-card__eyebrow">Yesterday</p>
                  <h2>Carry selected tasks</h2>
                </div>
                <button className="button button--ghost" type="button" onClick={() => setShowYesterdayReview(false)}>
                  Close
                </button>
              </div>
              <div className="history-list">
                {yesterday.tasks.map((task) => {
                  const goal = task.goalId ? state.goals.find((item) => item.id === task.goalId) ?? null : null;
                  return (
                    <div className="history-task history-task--detailed" key={task.id}>
                      <div>
                        <strong>{task.title}</strong>
                        {goal ? <GoalChip goal={goal} muted /> : null}
                      </div>
                      <button className="button button--primary" type="button" onClick={() => void appStore.carryTaskToToday(task.id)}>
                        Carry
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {showHelp ? (
          <section className="modal-shell" role="dialog" aria-modal="true">
            <div className="modal-card">
              <div className="modal-card__header">
                <div>
                  <p className="section-card__eyebrow">Keyboard</p>
                  <h2>Shortcuts</h2>
                </div>
                <button className="button button--ghost" type="button" onClick={() => setShowHelp(false)}>
                  Close
                </button>
              </div>
              <div className="shortcut-grid">
                {[
                  ['e', 'Open Today edit mode'],
                  ['n', 'Jump to the first today list'],
                  ['x', 'Mark selected task done'],
                  ['c', 'Set selected task current'],
                  ['Delete', 'Delete selected task'],
                  ['Space', 'Start or stop focus timer'],
                  ['Esc', 'Close sheets or leave fields']
                ].map(([key, description]) => (
                  <div className="shortcut-row" key={key}>
                    <kbd>{key}</kbd>
                    <span>{description}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {showSettings ? (
          <section className="modal-shell" role="dialog" aria-modal="true">
            <div className="modal-card modal-card--settings">
              <div className="modal-card__header">
                <div>
                  <p className="section-card__eyebrow">Preferences</p>
                  <h2>Settings</h2>
                </div>
                <button className="button button--ghost" type="button" onClick={() => setShowSettings(false)}>
                  Close
                </button>
              </div>
              {renderSettingsControls()}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
