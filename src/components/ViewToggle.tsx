import type { ViewMode } from '../types';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const MODES: ViewMode[] = ['zen', 'edit'];

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="view-toggle" role="tablist" aria-label="Display mode">
      {MODES.map((mode) => (
        <button
          key={mode}
          className={`view-toggle__item ${value === mode ? 'is-active' : ''}`.trim()}
          onClick={() => onChange(mode)}
          role="tab"
          aria-selected={value === mode}
          type="button"
        >
          {mode}
        </button>
      ))}
    </div>
  );
}
