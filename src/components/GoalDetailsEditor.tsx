import { useEffect, useState } from 'react';
import type { Goal } from '../types';
import { toDateTimeLocalInput } from '../lib/date';

interface GoalDetailsEditorProps {
  goal: Goal;
  onSave: (updates: {
    description?: string;
    topPriority?: string;
    targetEndDate?: string | null;
  }) => Promise<void>;
}

export function GoalDetailsEditor({ goal, onSave }: GoalDetailsEditorProps) {
  const [description, setDescription] = useState(goal.description ?? '');
  const [topPriority, setTopPriority] = useState(goal.topPriority ?? '');
  const [targetEndDate, setTargetEndDate] = useState(toDateTimeLocalInput(goal.targetEndDate));

  useEffect(() => {
    setDescription(goal.description ?? '');
    setTopPriority(goal.topPriority ?? '');
    setTargetEndDate(toDateTimeLocalInput(goal.targetEndDate));
  }, [goal.description, goal.targetEndDate, goal.topPriority]);

  async function commit() {
    await onSave({
      description,
      topPriority,
      targetEndDate: targetEndDate || null
    });
  }

  return (
    <div className="goal-details">
      <label className="goal-details__field">
        <span>Describe your goal</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          onBlur={() => void commit()}
          placeholder="What are you trying to achieve?"
          rows={3}
        />
      </label>
      <div className="goal-details__grid">
        <label className="goal-details__field">
          <span>Top priority</span>
          <input
            type="text"
            value={topPriority}
            onChange={(event) => setTopPriority(event.target.value)}
            onBlur={() => void commit()}
            placeholder="What matters most first?"
          />
        </label>
        <label className="goal-details__field">
          <span>By end date</span>
          <input
            type="datetime-local"
            value={targetEndDate}
            onChange={(event) => setTargetEndDate(event.target.value)}
            onBlur={() => void commit()}
          />
        </label>
      </div>
    </div>
  );
}
