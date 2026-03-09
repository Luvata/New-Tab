export interface ReviewCalendarDay {
  dateKey: string;
  dayNumber: number;
  taskCount: number;
  completedCount: number;
  isCurrentMonth: boolean;
  verdict?: 'enough' | 'not-enough' | 'day-off' | null;
}

interface ReviewCalendarProps {
  days: ReviewCalendarDay[];
}

export function ReviewCalendar({ days }: ReviewCalendarProps) {
  return (
    <div className="review-calendar">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
        <strong className="review-calendar__weekday" key={label}>
          {label}
        </strong>
      ))}
      {days.map((day) => (
        <div
          className={`review-calendar__day ${day.isCurrentMonth ? '' : 'is-muted'} ${day.verdict ? `is-${day.verdict}` : ''} ${day.taskCount > 0 ? 'has-tasks' : ''}`.trim()}
          key={day.dateKey}
        >
          <span>{day.dayNumber}</span>
          <i className="review-calendar__marker" />
        </div>
      ))}
    </div>
  );
}
