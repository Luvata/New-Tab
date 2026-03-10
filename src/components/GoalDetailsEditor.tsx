import { useEffect, useState } from 'react';
import type { Goal } from '../types';
import { toDateTimeLocalInput } from '../lib/date';

interface GoalDetailsEditorProps {
  goal: Goal;
  onSave: (updates: {
    description?: string;
    topPriority?: string;
    topPriorityDescription?: string;
    targetEndDate?: string | null;
  }) => Promise<void>;
}

export function GoalDetailsEditor({ goal, onSave }: GoalDetailsEditorProps) {
  const [description, setDescription] = useState(goal.description ?? '');
  const [topPriority, setTopPriority] = useState(goal.topPriority ?? '');
  const [topPriorityDescription, setTopPriorityDescription] = useState(goal.topPriorityDescription ?? '');
  const [targetEndDate, setTargetEndDate] = useState(toDateTimeLocalInput(goal.targetEndDate));

  useEffect(() => {
    setDescription(goal.description ?? '');
    setTopPriority(goal.topPriority ?? '');
    setTopPriorityDescription(goal.topPriorityDescription ?? '');
    setTargetEndDate(toDateTimeLocalInput(goal.targetEndDate));
  }, [goal.description, goal.targetEndDate, goal.topPriority, goal.topPriorityDescription]);

  async function commit() {
    await onSave({
      description,
      topPriority,
      topPriorityDescription,
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
          <span>Priority description</span>
          <textarea
            value={topPriorityDescription}
            onChange={(event) => setTopPriorityDescription(event.target.value)}
            onBlur={() => void commit()}
            placeholder="Use this box to describe the priority above. What's success? What's not needed/extra?"
            rows={3}
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
