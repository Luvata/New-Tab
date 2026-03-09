interface HistoryDayCardProps {
  title: string;
  subtitle: string;
  isActive: boolean;
  onClick: () => void;
}

export function HistoryDayCard({ title, subtitle, isActive, onClick }: HistoryDayCardProps) {
  return (
    <button className={`history-day ${isActive ? 'is-active' : ''}`.trim()} onClick={onClick} type="button">
      <strong>{title}</strong>
      <span>{subtitle}</span>
    </button>
  );
}
