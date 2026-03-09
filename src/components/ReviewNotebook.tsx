import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

interface ReviewNotebookProps {
  title?: string;
  description?: string;
  value: string;
  template: string;
  onSave: (value: string) => Promise<void>;
  className?: string;
  style?: CSSProperties;
}

export function ReviewNotebook({ title, description, value, template, onSave, className, style }: ReviewNotebookProps) {
  const sanitize = (content: string) => {
    const trimmed = content.trimStart();
    if (!trimmed.startsWith('Say more about ')) {
      return content;
    }

    return trimmed.replace(/^Say more about .*?(?:\n\n|\n|$)/, '').trimStart();
  };

  const [draft, setDraft] = useState(sanitize(value) || template);

  useEffect(() => {
    setDraft(sanitize(value) || template);
  }, [template, value]);

  return (
    <section className={`review-notebook ${className ?? ''}`.trim()} style={style}>
      {title || description ? (
        <div className="review-notebook__header">
          {title ? <h3>{title}</h3> : null}
          {description ? <p>{description}</p> : null}
        </div>
      ) : null}
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void onSave(draft)}
        rows={Math.max(12, draft.split('\n').length + 2)}
      />
    </section>
  );
}
