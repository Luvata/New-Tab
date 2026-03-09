import type { WorkspaceTab } from '../types';

interface WorkspaceTabsProps {
  value: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
}

const TABS: WorkspaceTab[] = ['today', 'goals', 'reviews'];

export function WorkspaceTabs({ value, onChange }: WorkspaceTabsProps) {
  return (
    <div className="workspace-tabs" role="tablist" aria-label="Workspace sections">
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={value === tab}
          className={`workspace-tabs__item ${value === tab ? 'is-active' : ''}`.trim()}
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
