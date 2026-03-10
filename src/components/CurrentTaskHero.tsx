import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GoalChip } from './GoalChip';
import { TimerPill } from './TimerPill';
import type { Goal, Task, ViewMode } from '../types';

interface CurrentTaskHeroProps {
  viewMode: ViewMode;
  dateLabel: string;
  currentTask: Task | null;
  currentGoal: Goal | null;
  showGoalChip: boolean;
  timerEnabled: boolean;
  timerIsActive: boolean;
  timerMinutes: number;
  onDone: () => void;
  onEdit: () => void;
  onNext: () => void;
  onPlan: () => void;
  onPickTopTask: () => void;
  onToggleTimer: () => void;
}

export function CurrentTaskHero({
  viewMode,
  dateLabel,
  currentTask,
  currentGoal,
  showGoalChip,
  timerEnabled,
  timerIsActive,
  timerMinutes,
  onDone,
  onEdit,
  onNext,
  onPlan,
  onPickTopTask,
  onToggleTimer
}: CurrentTaskHeroProps) {
  const hasTask = Boolean(currentTask);
  const isZen = viewMode === 'zen';
  const isEdit = viewMode === 'edit';
  const goalLabel = currentGoal?.title ?? 'Misc';
  const [clockLabel, setClockLabel] = useState('');
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const completeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isZen) {
      setClockLabel('');
      return;
    }

    const formatClockLabel = (now: Date) =>
      new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
      }).format(now);

    setClockLabel(formatClockLabel(new Date()));
    const timer = window.setInterval(() => {
      setClockLabel(formatClockLabel(new Date()));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isZen]);

  useEffect(() => {
    setCompletingTaskId(null);
    return () => {
      if (completeTimeoutRef.current) {
        window.clearTimeout(completeTimeoutRef.current);
      }
    };
  }, [currentTask?.id]);

  function handleZenDone() {
    if (!currentTask || completingTaskId) {
      return;
    }

    setCompletingTaskId(currentTask.id);
    completeTimeoutRef.current = window.setTimeout(() => {
      onDone();
      completeTimeoutRef.current = null;
    }, 260);
  }

  return (
    <section
      className={`hero hero--${viewMode}`.trim()}
      style={
        hasTask && (isZen || isEdit)
          ? ({ ['--goal-color' as string]: currentGoal?.color ?? 'var(--accent)' } as CSSProperties)
          : undefined
      }
    >
      <p className="hero__date">
        {dateLabel}
        {isZen && clockLabel ? <span className="hero__clock">{clockLabel}</span> : null}
      </p>
      {isZen && hasTask ? <p className="hero__goal-label">{goalLabel}</p> : null}
      {isZen && hasTask ? (
        <button className="button button--ghost hero__icon-button hero__zen-edit" type="button" onClick={onEdit} aria-label="Edit">
          <svg className="hero__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4.5 19.5h3.75L18.5 9.25l-3.75-3.75L4.5 15.75V19.5Z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
            <path d="m13.75 6.5 3.75 3.75" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
        </button>
      ) : null}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTask?.id ?? 'empty'}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="hero__content"
        >
          {hasTask ? (
            <>
              {isZen ? (
                <div className="hero__zen-stack">
                  <AnimatePresence>
                    {completingTaskId === currentTask?.id ? (
                      <motion.div
                        key={`burst-${currentTask?.id ?? 'task'}`}
                        className="hero__done-burst"
                        initial={{ opacity: 0, scale: 0.72 }}
                        animate={{ opacity: 1, scale: 1.06 }}
                        exit={{ opacity: 0, scale: 1.18 }}
                        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                        aria-hidden="true"
                      />
                    ) : null}
                  </AnimatePresence>
                  <motion.button
                    type="button"
                    className="hero__title-button hero__title--zen"
                    onClick={handleZenDone}
                    aria-label={`Mark ${currentTask?.title ?? 'task'} done`}
                    whileTap={{ scale: 0.985 }}
                    animate={
                      completingTaskId === currentTask?.id
                        ? { scale: 0.985, opacity: 0.35, y: -8, filter: 'blur(0.6px)' }
                        : { scale: 1, opacity: 1, y: 0, filter: 'blur(0px)' }
                    }
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {currentTask?.title}
                  </motion.button>
                </div>
              ) : (
                <h1>{currentTask?.title}</h1>
              )}
              {!isZen && showGoalChip && currentGoal ? <GoalChip goal={currentGoal} /> : null}
              {!isZen ? (
                <div className="hero__actions">
                  <button className="button button--primary button--large" type="button" onClick={onDone}>
                    Done
                  </button>
                  <button className="button button--ghost" type="button" onClick={onNext}>
                    Next
                  </button>
                </div>
              ) : null}
              {!isZen && timerEnabled ? (
                <TimerPill isActive={timerIsActive} minutes={timerMinutes} onToggle={onToggleTimer} />
              ) : null}
            </>
          ) : (
            <>
              <h1>What matters today?</h1>
              <div className="hero__actions">
                <button className="button button--primary button--large" type="button" onClick={onPlan}>
                  Plan Today
                </button>
                <button className="button button--ghost" type="button" onClick={onPickTopTask}>
                  Pick Next Task
                </button>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
