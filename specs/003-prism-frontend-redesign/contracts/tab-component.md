# Contract: MACC Modelling Tab Component

**Feature**: 003-prism-frontend-redesign
**Type**: Frontend component interface contract

## MACCModellingPage — Public Interface

### Props

```typescript
// MACCModellingPage is a route-level component — no props.
// Tab state is derived from URL query parameters.
```

### URL State

```typescript
type MACCModellingTab = 'initiatives' | 'scenarios' | 'targets';

const VALID_TABS: ReadonlySet<string> = new Set(['initiatives', 'scenarios', 'targets']);

// Read from URL (with normalization per FR-011)
const rawTab = searchParams.get('tab');
const activeTab: MACCModellingTab = VALID_TABS.has(rawTab ?? '') 
  ? (rawTab as MACCModellingTab) 
  : 'initiatives';

// Normalize URL if tab param was missing or invalid
useEffect(() => {
  if (!rawTab || !VALID_TABS.has(rawTab)) {
    setSearchParams({ tab: 'initiatives' }, { replace: true });
  }
}, [rawTab, setSearchParams]);

// Write to URL
setSearchParams({ tab: newTab }, { replace: true });
```

## Tab Panel Contract

Each tab panel component MUST conform to:

```typescript
interface TabPanelContract {
  /** Component renders as a self-contained panel (no props required) */
  (): React.ReactElement;
}
```

### Tab Panels

| Component | Tab ID | Data Dependencies | Modals Owned |
|-----------|--------|-------------------|--------------|
| `InitiativesTab` | `initiatives` | `useInitiatives`, `useEmissions`, `useSuggestions` | `CreationChoiceModal`, `EditInitiativeModal`, `AcceptModal`, `DismissModal` |
| `ScenariosTab` | `scenarios` | `useScenarios`, `useInitiatives` | `CreateScenarioModal`, `ScenarioManager` |
| `TargetsTab` | `targets` | targets data (always available); `useContext` (optional — only to determine whether to show informational banner per FR-015) | `TargetForm` (modal) |

## TabBar Component

### Props

```typescript
interface TabBarProps {
  /** Currently active tab */
  activeTab: MACCModellingTab;
  /** Callback when user clicks a tab */
  onTabChange: (tab: MACCModellingTab) => void;
}
```

### Accessibility Requirements (FR-016)

```typescript
// TabBar renders:
<div role="tablist" aria-label="MACC Modelling sections">
  {tabs.map((tab) => (
    <button
      key={tab.id}
      role="tab"
      id={`tab-${tab.id}`}
      aria-selected={activeTab === tab.id}
      aria-controls={`panel-${tab.id}`}
      tabIndex={activeTab === tab.id ? 0 : -1}
      onClick={() => onTabChange(tab.id)}
    >
      {tab.label}
    </button>
  ))}
</div>

// Each panel renders:
<div
  role="tabpanel"
  id={`panel-${tab.id}`}
  aria-labelledby={`tab-${tab.id}`}
  style={{ display: activeTab === tab.id ? 'block' : 'none' }}
>
  {/* tab content */}
</div>
```

### Keyboard Navigation

| Key | Behaviour |
|-----|-----------|
| `ArrowRight` | Move focus to next tab |
| `ArrowLeft` | Move focus to previous tab |
| `Home` | Move focus to first tab |
| `End` | Move focus to last tab |
| `Enter` / `Space` | Activate focused tab |

## State Preservation Rules (FR-012)

| State Type | On Tab Switch | On Page Refresh |
|------------|--------------|----------------|
| Tab selection | Preserved (URL) | Preserved (URL) |
| Form field values | Preserved (hidden mount) | Lost |
| Selected entities | Preserved (hidden mount) | Lost |
| Open modals | **Dismissed** | Lost |
| Compare panel selections | **Reset** | Lost |
| Filter/sort state | **Reset** | Lost |
| TanStack Query cache | Preserved (shared) | Re-fetched |

## Cross-Tab Data Flow

```
InitiativesTab                ScenariosTab
     │                             │
     ├── useInitiatives() ────────►├── useInitiatives() (same cache)
     │   (create/edit/delete)      │   (read for scenario binding)
     ├── useEmissions()               │
     ├── useSuggestions()        TargetsTab
     │                             │
     └── targets (MACC chart overlay)├── targets data (read)
```

Data sharing between tabs is handled automatically by TanStack Query's shared cache. When an initiative is created in `InitiativesTab`, the `useInitiatives` query cache is invalidated, and `ScenariosTab` picks up the change when it next reads from the same cache key.
