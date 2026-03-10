import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

interface ReviewNotebookProps {
  title?: string;
  description?: string;
  value: string;
  template: string;
  lockedTemplate?: boolean;
  prefillTemplate?: boolean;
  onSave: (value: string) => Promise<void>;
  className?: string;
  style?: CSSProperties;
}

export function ReviewNotebook({
  title,
  description,
  value,
  template,
  lockedTemplate = false,
  prefillTemplate = true,
  onSave,
  className,
  style
}: ReviewNotebookProps) {
  const sanitize = (content: string) => {
    const trimmed = content.trimStart();
    if (!trimmed.startsWith('Say more about ')) {
      return content;
    }

    return trimmed.replace(/^Say more about .*?(?:\n\n|\n|$)/, '').trimStart();
  };

  const withLockedTemplate = (content: string) => {
    if (!lockedTemplate) {
      return content;
    }

    const normalizedTemplate = template.trimEnd();
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      return `${normalizedTemplate}\n\n`;
    }

    if (trimmedContent.startsWith(normalizedTemplate)) {
      return content;
    }

    return `${normalizedTemplate}\n\n${content.trimStart()}`;
  };

  const buildDraft = (content: string) => {
    const sanitized = sanitize(content);
    const fallback = prefillTemplate ? template : '';
    return withLockedTemplate(sanitized || fallback);
  };

  const [draft, setDraft] = useState(buildDraft(value));

  useEffect(() => {
    setDraft(buildDraft(value));
  }, [lockedTemplate, prefillTemplate, template, value]);

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
        onBlur={() => {
          const nextDraft = buildDraft(draft);
          setDraft(nextDraft);
          void onSave(nextDraft);
        }}
        rows={Math.max(12, draft.split('\n').length + 2)}
      />
    </section>
  );
}
