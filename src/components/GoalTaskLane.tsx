import { useEffect, useState, type RefObject } from 'react';

interface GoalTaskLaneProps {
  title: string;
  color: string;
  description?: string;
  topPriority?: string;
  targetEndDate?: string | null;
  tasksText: string;
  count: number;
  onCommit: (value: string) => Promise<void>;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
}

export function GoalTaskLane({
  title,
  color,
  description,
  topPriority,
  targetEndDate,
  tasksText,
  count,
  onCommit,
  textareaRef
}: GoalTaskLaneProps) {
  const [draft, setDraft] = useState(tasksText);

  useEffect(() => {
    setDraft(tasksText);
  }, [tasksText]);

  return (
    <section className="goal-lane" style={{ ['--goal-color' as string]: color }}>
      <div className="goal-lane__header">
        <div>
          <p className="goal-lane__eyebrow">{count} active task{count === 1 ? '' : 's'}</p>
          <h3>{title}</h3>
          {description ? <p className="goal-lane__description">{description}</p> : null}
        </div>
        <div className="goal-lane__priority">
          <span>Top priority</span>
          <strong>{topPriority || 'Not set yet'}</strong>
          {targetEndDate ? <small>By {targetEndDate}</small> : null}
        </div>
      </div>
      <label className="goal-lane__editor">
        <span>Today task list</span>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void onCommit(draft)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              void onCommit(draft);
              (event.target as HTMLTextAreaElement).blur();
            }
          }}
          rows={Math.max(4, count + 1)}
          placeholder="List each today task on a new line"
        />
      </label>
    </section>
  );
}
