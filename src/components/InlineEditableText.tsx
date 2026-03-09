import { useEffect, useState } from 'react';

interface InlineEditableTextProps {
  value: string;
  placeholder?: string;
  className?: string;
  onSave: (value: string) => Promise<void>;
}

export function InlineEditableText({
  value,
  placeholder,
  className,
  onSave
}: InlineEditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  async function commit() {
    const normalized = draft.trim();
    if (!normalized || normalized === value) {
      setIsEditing(false);
      setDraft(value);
      return;
    }

    await onSave(normalized);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <input
        className={`inline-edit inline-edit--input ${className ?? ''}`.trim()}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void commit();
          }
          if (event.key === 'Escape') {
            setDraft(value);
            setIsEditing(false);
          }
        }}
        autoFocus
        placeholder={placeholder}
      />
    );
  }

  return (
    <button
      className={`inline-edit inline-edit--button ${className ?? ''}`.trim()}
      onClick={() => setIsEditing(true)}
      type="button"
      title="Click to edit"
    >
      {value || placeholder}
    </button>
  );
}
