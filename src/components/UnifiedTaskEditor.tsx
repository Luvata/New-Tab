import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { Goal, Task } from '../types';

interface UnifiedTaskEditorProps {
  goals: Goal[];
  tasks: Task[];
  editorRef?: RefObject<HTMLTextAreaElement | null>;
  onCommit: (value: string) => Promise<void>;
}

function buildTaskText(tasks: Task[], goals: Goal[]): string {
  const goalOrder = goals.map((goal) => goal.id);

  return tasks
    .map((task) => {
      if (!task.goalId) {
        return `&) ${task.title}`;
      }

      const index = goalOrder.indexOf(task.goalId);
      return `${index >= 0 ? index + 1 : '&'}) ${task.title}`;
    })
    .join('\n');
}

export function UnifiedTaskEditor({ goals, tasks, editorRef, onCommit }: UnifiedTaskEditorProps) {
  const canonicalText = useMemo(() => buildTaskText(tasks, goals), [goals, tasks]);
  const [draft, setDraft] = useState(canonicalText);
  const backdropRef = useRef<HTMLPreElement | null>(null);
  const localTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const isEditingRef = useRef(false);
  const textareaRef = editorRef ?? localTextAreaRef;

  useEffect(() => {
    if (!isEditingRef.current) {
      setDraft(canonicalText);
    }
  }, [canonicalText]);

  const renderedLines = useMemo(() => {
    const goalOrder = goals.map((goal) => goal.id);
    return (draft || '&) ').split('\n').map((line, index) => {
      const match = line.match(/^(\d+|&)\)\s*(.*)$/);
      let color = 'var(--text-soft)';

      if (match?.[1] === '&') {
        color = 'var(--accent)';
      } else if (match) {
        const goalIndex = Number(match[1]) - 1;
        const goal = goals[goalIndex];
        color = goal?.color ?? 'var(--text-soft)';
      }

      return {
        key: `${index}-${line}`,
        content: line || ' ',
        color,
        prefixValid:
          match?.[1] === '&' ||
          (match && Number(match[1]) >= 1 && Number(match[1]) <= Math.max(goalOrder.length, 1))
      };
    });
  }, [draft, goals]);

  return (
    <div className="unified-task-editor">
      <div className="unified-task-editor__legend">
        {goals.map((goal, index) => (
          <span className="unified-task-editor__legend-item" key={goal.id} style={{ ['--goal-color' as string]: goal.color }}>
            <strong>{index + 1})</strong> {goal.title}
          </span>
        ))}
        <span className="unified-task-editor__legend-item unified-task-editor__legend-item--misc">
          <strong>&amp;)</strong> Misc
        </span>
      </div>

      <div className="unified-task-editor__shell">
        <pre className="unified-task-editor__backdrop" ref={backdropRef} aria-hidden="true">
          {renderedLines.map((line) => (
            <span
              key={line.key}
              className={`unified-task-editor__line ${line.prefixValid ? 'is-valid' : 'is-invalid'}`.trim()}
              style={{ color: line.color }}
            >
              {line.content}
              {'\n'}
            </span>
          ))}
        </pre>
        <textarea
          ref={textareaRef}
          className="unified-task-editor__input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => {
            isEditingRef.current = true;
          }}
          onBlur={() => {
            isEditingRef.current = false;
            void onCommit(draft);
          }}
          onScroll={(event) => {
            if (!backdropRef.current) {
              return;
            }

            backdropRef.current.scrollTop = event.currentTarget.scrollTop;
            backdropRef.current.scrollLeft = event.currentTarget.scrollLeft;
          }}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              void onCommit(draft);
              event.currentTarget.blur();
            }
          }}
          rows={Math.max(10, tasks.length + goals.length + 2)}
          spellCheck={false}
          placeholder="1) Draft the proposal&#10;2) Plan the launch&#10;&) Inbox cleanup"
        />
      </div>
    </div>
  );
}
