import type { Goal } from '../types';

interface GoalChipProps {
  goal: Goal;
  muted?: boolean;
}

export function GoalChip({ goal, muted = false }: GoalChipProps) {
  return (
    <span
      className={`goal-chip ${muted ? 'goal-chip--muted' : ''}`.trim()}
      style={{ ['--goal-color' as string]: goal.color }}
    >
      <span className="goal-chip__dot" />
      {goal.title}
    </span>
  );
}
