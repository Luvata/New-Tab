import { useEffect, useState } from 'react';
import { parseGoalTargetDate } from '../lib/date';

interface GoalCountdownTextProps {
  targetEndDate: string;
}

function describeGoalCountdownPrecise(targetEndDate: string, now: Date): string {
  const target = parseGoalTargetDate(targetEndDate);
  const diffMs = target.getTime() - now.getTime();
  const overdue = diffMs < 0;
  const totalSeconds = Math.max(0, Math.floor(Math.abs(diffMs) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [
    days > 0 ? `${days}d` : null,
    `${String(hours).padStart(2, '0')}h`,
    `${String(minutes).padStart(2, '0')}m`,
    `${String(seconds).padStart(2, '0')}s`
  ].filter(Boolean);

  return `${parts.join(' ')} ${overdue ? 'overdue' : 'left'}`;
}

export function GoalCountdownText({ targetEndDate }: GoalCountdownTextProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return <>{describeGoalCountdownPrecise(targetEndDate, now)}</>;
}
