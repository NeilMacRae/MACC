# Quick Start: Prism Design System Migration

**Feature**: 003-prism-frontend-redesign

## Prerequisites

- Node.js >= 20
- Access to `@ecoonline/prism-web-components-react` npm registry
- Backend running on `:8000` (for full workflow testing)

## Setup

```bash
cd frontend
npm install
npm run dev
```

## Development Workflow

### Per-Phase Process

1. Check current phase in [plan.md](plan.md)
2. Pick a task from [tasks.md](tasks.md) for the current phase
3. Follow TDD: write failing test → implement → refactor
4. Run tests: `npm test`
5. Check types: `npx tsc --noEmit`
6. Measure bundle: `npm run build` and check output size

### Key Commands

```bash
# Frontend development
npm run dev              # Vite dev server on :5173
npm run build            # Production build (check bundle size)
npm test                 # Vitest unit/component tests
npx tsc --noEmit         # TypeScript type checking

# Backend (needed for integration testing)
cd ../backend
make run-backend         # FastAPI on :8000

# Full stack
cd ..
make run-frontend        # Frontend dev server
make run-backend         # Backend dev server
```

## Architecture Notes

### What Changes

- **Navigation**: 5 sidebar items → 4; Scenarios/Targets consolidated into MACC Modelling tabs
- **Components**: Tailwind-based primitives → Prism components
- **Layout**: Custom sidebar/header → Prism shell components
- **Routing**: `/scenarios` removed (redirect to `/macc?tab=scenarios`)

### What Stays the Same

- **Backend API**: No changes — frontend-only migration
- **Data fetching**: TanStack Query hooks unchanged
- **D3 chart**: Custom MACC chart stays (wrapped in Prism container)
- **AI suggestions**: Functionality unchanged (UI migrated to Prism)
- **Types**: TypeScript type definitions unchanged

### Tab Navigation

```
/macc                    → MACC Chart tab (default)
/macc?tab=chart          → MACC Chart tab
/macc?tab=initiatives    → Initiatives tab
/macc?tab=scenarios      → Scenarios tab
/macc?tab=targets        → Targets tab
```

### Tab State Hook Pattern

```tsx
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

type MACCModellingTab = 'chart' | 'initiatives' | 'scenarios' | 'targets';

const VALID_TABS = new Set(['chart', 'initiatives', 'scenarios', 'targets']);

const [searchParams, setSearchParams] = useSearchParams();
const rawTab = searchParams.get('tab');
const activeTab = (VALID_TABS.has(rawTab ?? '')
  ? rawTab
  : 'chart') as MACCModellingTab;

// FR-011: Normalize URL when tab param is missing or unrecognized
useEffect(() => {
  if (!rawTab || !VALID_TABS.has(rawTab)) {
    setSearchParams({ tab: 'chart' }, { replace: true });
  }
}, [rawTab, setSearchParams]);

const setTab = (tab: MACCModellingTab) =>
  setSearchParams({ tab }, { replace: true });
```

### Prism Component Usage

```tsx
// Import pattern (verify component names after Phase 1 installation)
import { PrismButton } from '@ecoonline/prism-web-components-react';

<PrismButton variant="primary" onClick={handleSave}>
  Save
</PrismButton>
```

### Bundle Size Tracking

```bash
# Record baseline before Prism installation
npm run build 2>&1 | grep "dist/"

# After each phase, compare
npm run build 2>&1 | grep "dist/"
# Delta must stay < 50KB (FR-017)
```

## File Organisation

| What | Where |
|------|-------|
| Tab hub page | `src/pages/MACCModellingPage.tsx` |
| Tab content components | `src/components/{initiatives,scenarios,targets,macc}/` |
| Common Prism wrappers | `src/components/common/` |
| Layout shell | `src/components/layout/` |
| Routing config | `src/App.tsx` |
| Plan & research | `specs/003-prism-frontend-redesign/` |
