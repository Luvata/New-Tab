interface TimerPillProps {
  isActive: boolean;
  minutes: number;
  onToggle: () => void;
}

export function TimerPill({ isActive, minutes, onToggle }: TimerPillProps) {
  return (
    <button className={`timer-pill ${isActive ? 'is-active' : ''}`.trim()} onClick={onToggle} type="button">
      <span className="timer-pill__label">{isActive ? 'Focus in progress' : 'Focus timer'}</span>
      <strong>{isActive ? `${minutes}m left` : `${minutes}m`}</strong>
    </button>
  );
}
