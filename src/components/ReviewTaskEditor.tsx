import { useState, type FormEvent } from 'react';
import { InlineEditableText } from './InlineEditableText';
import type { Task, TaskStatus } from '../types';

interface ReviewTaskEditorProps {
  tasks: Task[];
  onAddTask: (title: string) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onSaveTitle: (taskId: string, title: string) => Promise<void>;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
}

export function ReviewTaskEditor({
  tasks,
  onAddTask,
  onDeleteTask,
  onSaveTitle,
  onUpdateTaskStatus
}: ReviewTaskEditorProps) {
  const [draft, setDraft] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalized = draft.trim();
    if (!normalized) {
      return;
    }

    await onAddTask(normalized);
    setDraft('');
  }

  return (
    <div className="review-task-editor">
      <div className="review-task-list">
        {tasks.map((task) => {
          const isDone = task.status === 'done';
          const nextStatus: TaskStatus = isDone ? 'active' : 'done';

          return (
            <div className={`review-task-row review-task-row--editable is-${task.status}`.trim()} key={task.id}>
              <button
                className={`review-task-toggle ${isDone ? 'is-done' : ''}`.trim()}
                type="button"
                aria-label={isDone ? `Mark ${task.title} active` : `Mark ${task.title} complete`}
                onClick={() => void onUpdateTaskStatus(task.id, nextStatus)}
              >
                <span aria-hidden="true" />
              </button>
              <InlineEditableText
                value={task.title}
                onSave={(title) => onSaveTitle(task.id, title)}
                className="review-task-row__title"
              />
              <button
                className="button button--danger review-task-row__delete"
                type="button"
                onClick={() => void onDeleteTask(task.id)}
              >
                Delete
              </button>
            </div>
          );
        })}
      </div>

      <form className="review-task-editor__add" onSubmit={(event) => void handleSubmit(event)}>
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a task"
        />
        <button className="button button--soft" type="submit">
          Add task
        </button>
      </form>
    </div>
  );
}
