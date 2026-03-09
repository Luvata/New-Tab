import { useState } from 'react';
import type { Goal } from '../types';

interface QuickAddInputProps {
  goals: Goal[];
  onAddTask: (title: string, goalId: string | null) => Promise<void>;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function QuickAddInput({ goals, onAddTask, inputRef }: QuickAddInputProps) {
  const [title, setTitle] = useState('');
  const [goalId, setGoalId] = useState<string>('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      return;
    }

    await onAddTask(normalizedTitle, goalId || null);
    setTitle('');
  }

  return (
    <form className="quick-add" onSubmit={handleSubmit}>
      <label className="quick-add__field">
        <span className="sr-only">Task title</span>
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add what matters next"
        />
      </label>
      <label className="quick-add__goal">
        <span className="sr-only">Goal</span>
        <select value={goalId} onChange={(event) => setGoalId(event.target.value)}>
          <option value="">No goal</option>
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>
              {goal.title}
            </option>
          ))}
        </select>
      </label>
      <button className="button button--primary" type="submit">
        Add
      </button>
    </form>
  );
}
