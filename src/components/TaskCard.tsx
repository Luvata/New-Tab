import { InlineEditableText } from './InlineEditableText';
import type { Goal, Task } from '../types';

function Icon({ path }: { path: string }) {
  return (
    <svg className="task-card__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

interface TaskCardProps {
  task: Task;
  goal?: Goal | null;
  isCurrent: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onSetCurrent: () => void;
  onComplete: () => void;
  onDelete: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onAssignGoal: (goalId: string | null) => void;
  onSaveTitle: (title: string) => Promise<void>;
  goalOptions: Goal[];
}

export function TaskCard({
  task,
  goal,
  isCurrent,
  isSelected,
  onSelect,
  onSetCurrent,
  onComplete,
  onDelete,
  onMove,
  onAssignGoal,
  onSaveTitle,
  goalOptions
}: TaskCardProps) {
  const isActive = task.status === 'active';

  return (
    <article
      className={`task-card ${isCurrent ? 'is-current' : ''} ${isSelected ? 'is-selected' : ''} is-${task.status}`.trim()}
      onClick={onSelect}
      style={{ ['--goal-color' as string]: goal?.color ?? 'var(--accent)' }}
    >
      <div className="task-card__main">
        <div className="task-card__title-row">
          <InlineEditableText value={task.title} onSave={onSaveTitle} className="task-card__title" />
          {isCurrent ? <span className="task-card__badge">Now</span> : null}
          {!isActive ? <span className="task-card__badge task-card__badge--status">{task.status}</span> : null}
        </div>
        <div className="task-card__meta">
          <label className="task-card__select">
            <span className="sr-only">Assign goal</span>
            <select
              value={task.goalId ?? ''}
              onChange={(event) => onAssignGoal(event.target.value || null)}
              onClick={(event) => event.stopPropagation()}
            >
              <option value="">No goal</option>
              {goalOptions.map((goalOption) => (
                <option key={goalOption.id} value={goalOption.id}>
                  {goalOption.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="task-card__actions">
        {isActive ? (
          <>
            <button className="button button--ghost task-card__icon-button" type="button" onClick={onSetCurrent} aria-label="Set current">
              <Icon path="M12 5.5v13M5.5 12h13" />
            </button>
            <button className="button button--ghost task-card__icon-button" type="button" onClick={() => onMove('up')} aria-label="Move up">
              <Icon path="m7 14 5-5 5 5" />
            </button>
            <button className="button button--ghost task-card__icon-button" type="button" onClick={() => onMove('down')} aria-label="Move down">
              <Icon path="m7 10 5 5 5-5" />
            </button>
            <button className="button button--primary task-card__icon-button" type="button" onClick={onComplete} aria-label="Done">
              <Icon path="m5.5 12.5 4.25 4.25L18.5 8" />
            </button>
          </>
        ) : null}
        <button className="button button--danger task-card__icon-button" type="button" onClick={onDelete} aria-label="Delete">
          <Icon path="M6.5 7.5h11M9.5 7.5v9m5-9v9M10 4.5h4m-7 3 1 11h8l1-11" />
        </button>
      </div>
    </article>
  );
}
