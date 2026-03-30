/**
 * TabBar — Accessible tab navigation bar for MACCModellingPage.
 *
 * Contract: specs/003-prism-frontend-redesign/contracts/tab-component.md
 *
 * Renders:
 *  - role="tablist" with aria-label
 *  - Per-tab role="tab" with aria-selected, aria-controls, tabIndex
 *  - Keyboard navigation: ArrowLeft/Right, Home, End, Enter, Space
 */

export type MACCModellingTab = 'initiatives' | 'scenarios' | 'targets';

interface TabDefinition {
  id: MACCModellingTab;
  label: string;
}

const TABS: TabDefinition[] = [
  { id: 'initiatives', label: 'Initiatives' },
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'targets', label: 'Targets' },
];

export interface TabBarProps {
  /** Currently active tab */
  activeTab: MACCModellingTab;
  /** Callback when user selects a tab */
  onTabChange: (tab: MACCModellingTab) => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const activeIndex = TABS.findIndex((t) => t.id === activeTab);

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex: number | null = null;

    switch (e.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % TABS.length;
        break;
      case 'ArrowLeft':
        nextIndex = (index - 1 + TABS.length) % TABS.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = TABS.length - 1;
        break;
      case 'Enter':
      case ' ':
        onTabChange(TABS[index].id);
        return;
      default:
        return;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      onTabChange(TABS[nextIndex].id);
    }
  }

  return (
    <div
      role="tablist"
      aria-label="MACC Modelling sections"
      className="flex border-b border-gray-200"
    >
      {TABS.map((tab, index) => {
        const isActive = tab.id === activeTab;
        const isActiveIndex = index === activeIndex;
        return (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            tabIndex={isActiveIndex ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              isActive
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
