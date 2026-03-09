# Tasks: Prism Design System Migration & Navigation Redesign

**Input**: Design documents from `/specs/003-prism-frontend-redesign/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: Tests are MANDATORY — TDD (Red-Green-Refactor) is required per the constitution. All new and modified frontend files must maintain 100% unit coverage. Playwright E2E regression tests are mandatory for each user story's primary journey.

**Organisation**: Tasks are grouped by user story to enable independent implementation and testing. Phase 0 backend decoupling is a blocking prerequisite before any frontend user story work begins.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US6 mapping from spec.md)
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Prism Foundation & Baseline)

**Purpose**: Install Prism, record bundle baseline, verify Vite compatibility — no existing code modified.

- [X] T001 Record production bundle size baseline before Prism: run `npm run build` in frontend/ and document dist/ chunk sizes in specs/003-prism-frontend-redesign/research.md
- [X] T002 Install `@ecoonline/prism-web-components-react` as a production dependency in frontend/package.json
- [X] T003 [P] Configure Prism theme/provider wrapper (if required by the library) in frontend/src/main.tsx
- [X] T004 [P] Audit `@ecoonline/prism-web-components-react` exports and update the component mapping table in specs/003-prism-frontend-redesign/research.md with real component names

**Checkpoint**: `npm run build` succeeds with Prism installed; bundle baseline recorded; at least one Prism component renders in a Vitest smoke test; all existing tests pass.

---

## Phase 2: Foundational (Backend — Decouple Targets from OrganisationalContext)

**Purpose**: Backend-only prerequisite that MUST complete before any US1 frontend work. Decouples `emission_targets` from `organisational_contexts` so the Targets tab is always functional regardless of whether an org context record exists (FR-015).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Write failing unit tests for `target_service` covering `list_targets`, `create_target`, `update_target`, `delete_target`, and `get_target_progress` — all must pass without a context record existing in backend/tests/unit/test_target_service.py
- [X] T006 Create Alembic migration `d2e3f4a5b6c7_decouple_targets_from_context`: add `organisation_id` FK to `emission_targets`, backfill via join through `organisational_contexts`, drop `context_id` column in backend/alembic/versions/d2e3f4a5b6c7_decouple_targets_from_context.py
- [X] T007 Update `EmissionTarget` SQLAlchemy model: replace `context_id` FK with `organisation_id` FK pointing to `organisations.id` in backend/src/models/context.py
- [X] T008 [P] Remove `targets` relationship from `OrganisationalContext` model in backend/src/models/context.py
- [X] T009 [P] Add `targets` relationship to `Organisation` model in backend/src/models/organisation.py
- [X] T010 Update `target_service.py`: rewrite all CRUD functions to query by `organisation_id`, remove the `_get_context` guard that blocked target access when no context existed in backend/src/services/target_service.py
- [X] T011 [P] Update `TargetResponse` Pydantic schema: rename `context_id` field to `organisation_id` in backend/src/schemas/context.py
- [X] T012 Verify migration round-trip: `alembic upgrade head` succeeds on a database with existing target data, then `alembic downgrade -1` succeeds, then `alembic upgrade head` again in backend/

**Checkpoint**: All five `target_service` unit tests pass without a context record; backend smoke tests confirm GET `/context/targets` returns 200 (empty list) and POST `/context/targets` succeeds when no context exists; all existing backend tests pass; migration round-trip verified.

---

## Phase 3: User Story 1 — MACC Modelling Hub with Tabbed Workflow (Priority: P1) 🎯

**Goal**: Create the `MACCModellingPage` with three in-page tabs (Initiatives, Scenarios, Targets) encoded via `?tab=` URL state. The Initiatives tab consolidates everything currently in `MACCPage.tsx` (MACC chart, initiative table, AI suggestions, all modals). Scenarios and Targets content is extracted from their current pages. Tabs stay mounted when inactive (hidden via `display: none`).

**Independent Test**: Navigate to "MACC Modelling" in the sidebar, switch between all three tabs, verify URL updates, refresh restores the active tab, and completing the full workflow (create initiative → switch to Scenarios → create scenario → switch to Targets → set target) works without leaving the page.

### Tests for User Story 1 (TDD: write tests FIRST — ensure they FAIL before implementing) 🚨

- [X] T013 [P] [US1] Write failing Playwright E2E test covering: tab navigation, URL `?tab=` sync on click, browser back/forward restores tab, page refresh restores tab, full workflow across all three tabs in frontend/tests/e2e/macc-modelling.spec.ts
- [X] T014 [P] [US1] Write failing unit tests for `TabBar` component: renders all three tabs, `aria-selected` on active tab, keyboard arrow navigation (Left/Right/Home/End), `onTabChange` called on click/Enter/Space in frontend/tests/unit/components/macc/TabBar.test.tsx
- [X] T015 [P] [US1] Write failing unit tests for `MACCModellingPage`: default tab is `initiatives` when `?tab=` missing, URL normalized to `?tab=initiatives` when param missing or unrecognized, each valid `?tab=` value renders the correct panel in frontend/tests/unit/pages/MACCModellingPage.test.tsx

### Implementation for User Story 1

- [X] T016 [US1] Create `TabBar` component with `role="tablist"`, per-tab `role="tab"`, `aria-selected`, `aria-controls`, `tabIndex` management, and keyboard arrow navigation (ArrowLeft/ArrowRight/Home/End) per contract in frontend/src/components/macc/TabBar.tsx
- [X] T017 [US1] Create `MACCModellingPage`: read `?tab=` via `useSearchParams`, normalize URL to `?tab=initiatives` via `setSearchParams({ tab: 'initiatives' }, { replace: true })` when param missing or invalid, render all three tab panels with `display: none` on inactive panels in frontend/src/pages/MACCModellingPage.tsx
- [X] T018 [US1] Extract the full `MACCPage.tsx` content into `InitiativesTab` (D3 MACC chart, `TargetOverlay`, `SuggestionRequest`, `AcceptModal`, `DismissModal`, `InitiativesTable`, `InitiativeDetail`, `CreationChoiceModal`) — rename the inline `EditModal` to `EditInitiativeModal` during extraction in frontend/src/components/macc/InitiativesTab.tsx
- [X] T019 [US1] Create `ScenariosTab` by extracting `ScenariosPage` content: scenario card grid, compare panel, `CreateScenarioModal`, `ScenarioManager` in frontend/src/components/macc/ScenariosTab.tsx
- [X] T020 [US1] Create `TargetsTab` by extracting the targets section from `ContextPage`: `TargetList`, `TargetForm` modal in frontend/src/components/macc/TargetsTab.tsx
- [X] T021 [US1] Create `ContextNotSetMessage` informational banner: shown when `GET /context` returns 404, includes link to Context page, does NOT block target CRUD (FR-015) in frontend/src/components/macc/ContextNotSetMessage.tsx
- [X] T022 [US1] Update frontend `TargetResponse` type: rename `context_id` to `organisation_id` to match updated backend schema in frontend/src/types/
- [X] T023 [US1] Register `MACCModellingPage` on the `/macc` route in `App.tsx` (replaces `MACCPage`; `/macc` path unchanged) in frontend/src/App.tsx
- [X] T024 [US1] Update pages barrel export to add `MACCModellingPage` and retain (do not yet remove) `ScenariosPage` in frontend/src/pages/index.tsx

**Checkpoint**: Full workflow — create initiative → Scenarios tab → create scenario → Targets tab → set target — works without leaving the page. All three tabs render correct content. URL reflects active tab. Browser back/forward and refresh restore tab. T013–T015 tests all pass.

---

## Phase 4: User Story 2 — Prism Component Library Adoption (Priority: P2)

**Goal**: Replace all shared primitive components and MACC-domain components with Prism equivalents. After this phase every button, modal, table, form input, badge, and card across the app uses `@ecoonline/prism-web-components-react` where a suitable component exists. No inline Tailwind button/modal/table patterns remain.

**Independent Test**: Navigate through every page and verify all interactive elements use Prism components. Run `grep -r "className.*btn\|<button " frontend/src/` — should return zero results outside of Prism wrapper internals.

### Tests for User Story 2 (TDD: write tests FIRST — ensure they FAIL before implementing) 🚨

- [X] T025 [P] [US2] Write failing unit tests for Prism-migrated `Button`: all variants (primary, secondary, danger, ghost), all sizes (sm, md, lg), disabled state, loading state in frontend/tests/unit/components/common/Button.test.tsx
- [X] T026 [P] [US2] Write failing unit tests for Prism-migrated `Modal`: opens/closes, renders children, title/footer slots, close on backdrop, close on Escape in frontend/tests/unit/components/common/Modal.test.tsx
- [X] T027 [P] [US2] Write failing unit tests for Prism-migrated `DataTable`: renders rows/columns, sort indicators, empty state in frontend/tests/unit/components/common/DataTable.test.tsx
- [X] T028 [P] [US2] Write failing Playwright E2E test verifying Prism UI consistency: buttons, modals, and tables on Initiatives, Scenarios, Targets, Emissions, and Context pages in frontend/tests/e2e/prism-components.spec.ts

### Implementation for User Story 2

#### Common Primitive Components

- [X] T029 [P] [US2] Replace `Button.tsx` with Prism button wrapper (all variants: primary, secondary, danger, ghost; all sizes: sm, md, lg; loading and disabled states) in frontend/src/components/common/Button.tsx
- [X] T030 [P] [US2] Replace `Modal.tsx` with Prism dialog/modal wrapper (overlay, animation, close button, title/footer props) in frontend/src/components/common/Modal.tsx
- [X] T031 [P] [US2] Replace `DataTable.tsx` with Prism table wrapper (column definitions, row rendering, sort, responsive) in frontend/src/components/common/DataTable.tsx
- [X] T032 [P] [US2] Replace `Badge.tsx` with Prism badge/tag component in frontend/src/components/common/Badge.tsx
- [X] T033 [P] [US2] Replace `EmptyState.tsx` with Prism-aligned empty state (or Prism component if available) in frontend/src/components/common/EmptyState.tsx
- [X] T034 [P] [US2] Replace `QualityBadge.tsx` with Prism badge/tag component in frontend/src/components/common/QualityBadge.tsx

#### Consumer File Updates

- [X] T035 [US2] Update all ~15 consumer files using inline Tailwind button classes (`className="btn..."` or `<button`) to use the Prism `Button` component across frontend/src/components/
- [X] T036 [US2] Update all ~8 consumer files using inline modal/dialog patterns to use the Prism `Modal` component across frontend/src/components/
- [X] T037 [US2] Replace inline form inputs (text, select, textarea, validation messages) across all consumer files with Prism form components (`PrismInput`, `PrismSelect`, `PrismTextarea`) in frontend/src/components/

#### MACC Tab Domain Components

- [X] T038 [P] [US2] Migrate Initiatives tab sub-components to Prism: `InitiativeTable`, `InitiativeDetail`, `InitiativeForm`, `CreationChoiceModal`, `EditInitiativeModal` in frontend/src/components/initiatives/
- [X] T039 [P] [US2] Migrate Scenarios tab sub-components to Prism: `ScenarioCard`, `ScenarioManager`, `CreateScenarioModal`, `ScenarioComparison` in frontend/src/components/scenarios/
- [X] T040 [P] [US2] Migrate Suggestions sub-components to Prism: `SuggestionRequest`, `SuggestionCard`, `AcceptModal`, `DismissModal` in frontend/src/components/suggestions/
- [X] T041 [P] [US2] Migrate Targets tab sub-components to Prism: `TargetList`, `TargetForm` in frontend/src/components/targets/

#### Verification

- [X] T042 [US2] Measure bundle size delta against Phase 1 baseline (`npm run build`); document in specs/003-prism-frontend-redesign/research.md; verify delta < 50KB (FR-017)
- [X] T043 [US2] Remove `@floating-ui/react` from frontend/package.json if Prism provides tooltip/popover; update any usages

**Checkpoint**: All interactive UI elements on every page use Prism components. `grep` confirms no inline Tailwind button/modal/table patterns remain in frontend/src/. Bundle size delta measured and within limit. T025–T028 tests all pass.

---

## Phase 5: User Story 3 — Simplified Sidebar Navigation (Priority: P3)

**Goal**: Reduce sidebar from 5 to 4 items. Remove "Scenarios" entry. Rename "MACC Chart" to "MACC Modelling". Remove targets section from ContextPage (now exclusively in Targets tab). Add legacy redirect for `/scenarios`. Delete `ScenariosPage.tsx`.

**Depends on**: US1 complete (the MACC Modelling hub must exist before the old sidebar entries are removed).

**Independent Test**: Count sidebar items — exactly 4: Emissions, MACC Modelling, Context, Settings. Navigate to `/scenarios` — redirected to `/macc?tab=scenarios`. Confirm ContextPage shows only organisation profile.

### Tests for User Story 3 (TDD: write tests FIRST — ensure they FAIL before implementing) 🚨

- [X] T044 [P] [US3] Write failing Playwright E2E test: sidebar has exactly 4 items, active states correct per route, `/scenarios` redirects to `/macc?tab=scenarios`, ContextPage shows no targets section in frontend/tests/e2e/navigation.spec.ts
- [X] T045 [P] [US3] Write failing unit tests for updated `Sidebar` component: renders exactly 4 navigation items with correct labels and routes in frontend/tests/unit/components/layout/Sidebar.test.tsx

### Implementation for User Story 3

- [X] T046 [US3] Update `Sidebar.tsx`: remove "Scenarios" navigation item, rename "MACC Chart" label to "MACC Modelling" in frontend/src/components/layout/Sidebar.tsx
- [X] T047 [US3] Add React Router redirects in `App.tsx`: `/scenarios` → `/macc?tab=scenarios` (`replace`) and `/scenarios/*` → `/macc?tab=scenarios` (`replace`) per routing contract in frontend/src/App.tsx
- [X] T048 [US3] Remove the targets section (TargetList, TargetForm modal, targets heading) from `ContextPage.tsx` — targets are now exclusively in the Targets tab (FR-006) in frontend/src/pages/ContextPage.tsx
- [X] T049 [US3] Delete `ScenariosPage.tsx` — content is fully served by `ScenariosTab` in `MACCModellingPage` in frontend/src/pages/ScenariosPage.tsx
- [X] T050 [US3] Remove `ScenariosPage` export from pages barrel in frontend/src/pages/index.tsx
- [X] T051 [US3] Audit and remove all remaining imports/references to `ScenariosPage` across frontend/src/ — confirm zero orphaned references

**Checkpoint**: Sidebar renders exactly 4 items (SC-003). GET `/scenarios` redirects to `/macc?tab=scenarios` (SC-007). ContextPage shows only org profile. No references to `ScenariosPage` remain. T044–T045 tests pass.

---

## Phase 6: User Story 4 — Prism Layout & App Shell (Priority: P4)

**Goal**: Replace the application shell — sidebar navigation, page header, and page layout container — with Prism layout and navigation components. Responsive behaviour maintained. Active/hover states follow Prism patterns.

**Independent Test**: Navigate to every page and verify the sidebar, header, and page container use Prism layout components. Hover states and active item highlights match Prism design patterns.

### Tests for User Story 4 (TDD: write tests FIRST — ensure they FAIL before implementing) 🚨

- [X] T052 [P] [US4] Write failing Playwright E2E test for Prism shell: sidebar active states per route, header title renders, layout spacing consistent across all four pages in frontend/tests/e2e/shell.spec.ts
- [X] T053 [P] [US4] Write failing unit tests for Prism `Sidebar`, `Header`, and `PageLayout` components: renders with Prism components, active item highlighted for current route in frontend/tests/unit/components/layout/

### Implementation for User Story 4

- [X] T054 [P] [US4] Replace `Sidebar.tsx` inline SVG icons and Tailwind nav markup with Prism navigation/side-nav components; preserve active-state logic (`pathname.startsWith`) in frontend/src/components/layout/Sidebar.tsx
- [X] T055 [P] [US4] Replace `Header.tsx` with Prism heading/page header component; preserve title and subtitle props in frontend/src/components/layout/Header.tsx
- [X] T056 [P] [US4] Replace `PageLayout.tsx` custom wrapper with Prism layout container component; preserve slot structure for sidebar + main content in frontend/src/components/layout/PageLayout.tsx
- [X] T057 [US4] Replace `LoadingSpinner.tsx` with Prism spinner/skeleton component in frontend/src/components/layout/LoadingSpinner.tsx

**Checkpoint**: All pages render correctly with Prism shell. Sidebar active states highlight correct item per route. Header shows page title. Layout spacing and alignment consistent. T052–T053 tests pass.

---

## Phase 7: User Story 5 — Emissions Page Prism Rebuild (Priority: P5)

**Goal**: Rebuild the Emissions page with Prism components. Dashboard summary cards, scope breakdown, trend visualisations, and unit detail panels all use Prism card/container components. D3-based chart internals remain custom but are wrapped in Prism containers.

**Independent Test**: Navigate to the Emissions page and verify all dashboard cards, chart containers, and data panels use Prism components. All emissions data loads and displays correctly.

### Tests for User Story 5 (TDD: write tests FIRST — ensure they FAIL before implementing) 🚨

- [X] T058 [P] [US5] Write failing unit tests for each rebuilt Emissions component (renders with Prism containers, correct data props, no regressions) in frontend/tests/unit/components/emissions/
- [X] T059 [P] [US5] Write failing Playwright E2E test: Emissions page renders with Prism components, scope breakdown and trend charts visible, data correct in frontend/tests/e2e/emissions.spec.ts

### Implementation for User Story 5

- [X] T060 [P] [US5] Rebuild `EmissionsSummary` component using Prism card/container components for summary statistics in frontend/src/components/emissions/EmissionsSummary.tsx
- [X] T061 [P] [US5] Rebuild `ScopeBarChart` with Prism container wrapper (D3 rendering internals unchanged) in frontend/src/components/emissions/ScopeBarChart.tsx
- [X] T062 [P] [US5] Rebuild `EmissionsTrend` with Prism container wrapper (D3 rendering internals unchanged) in frontend/src/components/emissions/EmissionsTrend.tsx
- [X] T063 [P] [US5] Rebuild `UnitBreakdown` using Prism data display/card components in frontend/src/components/emissions/UnitBreakdown.tsx
- [X] T064 [US5] Rebuild `EmissionsPage` layout with Prism page structure and section containers in frontend/src/pages/EmissionsPage.tsx

**Checkpoint**: Emissions page renders all sections using Prism components. Charts display within Prism containers. All emissions data correct. T058–T059 tests pass.

---

## Phase 8: User Story 6 — Context Page Prism Rebuild (Priority: P6)

**Goal**: Rebuild the Context page (now showing only the organisation profile after targets moved to MACC Modelling) using Prism form components. All form fields, labels, validation messages, and action buttons use Prism.

**Depends on**: US3 complete (targets section already removed from ContextPage).

**Independent Test**: Navigate to the Context page, fill in the organisation profile form with valid and invalid data, verify all form elements use Prism components and validation errors use Prism error styling.

### Tests for User Story 6 (TDD: write tests FIRST — ensure they FAIL before implementing) 🚨

- [X] T065 [P] [US6] Write failing unit tests for Prism-migrated `ContextForm`: renders Prism inputs, shows Prism validation errors on invalid submission, calls save on valid submit in frontend/tests/unit/components/context/ContextForm.test.tsx
- [X] T066 [P] [US6] Write failing Playwright E2E test: Context page form uses Prism inputs and buttons, submit with invalid data shows Prism validation errors, successful save confirmed in frontend/tests/e2e/context.spec.ts

### Implementation for User Story 6

- [X] T067 [US6] Rebuild `ContextForm.tsx` using Prism form inputs (`PrismInput`, `PrismSelect`, `PrismTextarea`), Prism form labels, Prism error message components for validation, and Prism action buttons in frontend/src/components/context/ContextForm.tsx
- [X] T068 [US6] Update `ContextPage.tsx` to use Prism page/section container components for layout in frontend/src/pages/ContextPage.tsx

**Checkpoint**: Context page shows only org profile (no targets). All form fields, validation messages, and action buttons use Prism components. T065–T066 tests pass.

---

## Phase 9: Follow-ups

- [X] T069 Align Emissions page header/tabs with MACC Modelling page (consistent title/subtitle spacing and tab bar styling) in frontend/src/components/layout/Header.tsx and frontend/src/pages/EmissionsPage.tsx

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final quality gate — accessibility, performance, bundle size sign-off, and success criteria verification.

- [X] T069 [P] Run WCAG 2.1 AA accessibility audit across all four pages: keyboard navigation for all interactive elements, screen reader testing (VoiceOver on macOS), colour contrast ratios (FR-016)
- [X] T070 [P] Measure final production bundle size delta against Phase 1 baseline; must be < 50KB (FR-017); if exceeded, run `rollup-plugin-visualizer` audit and apply tree-shaking before merge in frontend/
- [X] T071 [P] Verify tab switch TTI < 1s with cached data (SC-004): measure in browser DevTools Performance tab for each of the three MACC Modelling tabs
- [X] T072 [P] Verify all legacy route redirects: `/scenarios` → `/macc?tab=scenarios`, `/scenarios/*` → `/macc?tab=scenarios`
- [X] T073 Run full Playwright E2E suite across Chrome, Firefox, and Safari; all tests must pass
- [X] T074 Run `npx tsc --noEmit` in frontend/ — must produce zero type errors
- [X] T075 Run `grep -r "className.*btn\|<button \|className.*modal" frontend/src/` — must return zero results outside Prism wrapper internals
- [X] T076 Verify all six success criteria (SC-001 through SC-007) from spec.md pass
- [X] T077 Run quickstart.md validation walkthrough end-to-end (setup → dev → build → test)

**Checkpoint**: All Playwright E2E tests pass across three browsers. All unit tests pass with 100% coverage. Bundle delta within 50KB. Accessibility audit clean. `npx tsc --noEmit` clean. All SC-001–SC-007 verified.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)          → No dependencies; start immediately
Phase 2 (Foundational)   → Depends on Phase 1 (Prism installed for smoke test)
                           BLOCKS all user story phases
Phase 3 (US1)            → Depends on Phase 2 complete (needs T011 backend schema for T022 frontend type)
Phase 4 (US2)            → Depends on Phase 3 (MACC hub structure must exist for MACC domain components)
                           Common components (T029–T034) CAN start immediately after Phase 2
Phase 5 (US3)            → Depends on Phase 3 (MACC hub must exist before old entries removed)
Phase 6 (US4)            → Depends on Phase 5 (sidebar items finalized before shell migration)
Phase 7 (US5)            → Depends on Phase 4 common components (Prism primitives must exist)
Phase 8 (US6)            → Depends on Phase 5 (targets removed from ContextPage) + Phase 4 common components
Phase 9 (Polish)         → Depends on all user story phases complete
```

### User Story Dependencies

| Story | Depends On | Can Parallelize With |
|-------|-----------|---------------------|
| US1 (P1) | Phase 2 complete | — |
| US2 (P2) | Phase 3 (hub structure) | Common components (T029–T034) can start in parallel with US3 |
| US3 (P3) | US1 complete | US2 common components, US4 (after US3 finalizes sidebar items) |
| US4 (P4) | US3 complete | US2, US5 (separate pages) |
| US5 (P5) | US2 common components done | US6, US4 (separate pages) |
| US6 (P6) | US3 + US2 common components done | US5, US4 (separate pages) |

### Critical Path

```
T001–T004 (Setup) → T005–T012 (Backend) → T013–T024 (US1 hub) → T044–T051 (US3 nav)
                                                               → T025–T043 (US2 components)
                                                               → T052–T057 (US4 shell)
                                                               → T058–T064 (US5 emissions)
                                                               → T065–T068 (US6 context)
                                                                 → T069–T077 (Polish)
```

---

## Parallel Execution Examples

### Phase 2 (Foundational) — Parallel Work

```
Parallel set A (different models/schemas — no file conflicts):
  T008: Remove targets relationship from OrganisationalContext model
  T009: Add targets relationship to Organisation model
  T011: Update TargetResponse Pydantic schema

Sequential:
  T006 → T007 → T010 → T012 (migration definition → model → service → verify)
```

### Phase 3 (US1) — Parallel Work

```
Parallel (write failing tests first — all different files):
  T013: E2E test for tab navigation
  T014: Unit tests for TabBar
  T015: Unit tests for MACCModellingPage

Parallel (different component files, no inter-dependencies):
  T016: TabBar component
  T018: InitiativesTab (extract from MACCPage)
  T019: ScenariosTab (extract from ScenariosPage)
  T020: TargetsTab (extract from ContextPage)
  T021: ContextNotSetMessage banner

Sequential:
  T016 + T017 must complete before T023 (App.tsx routing)
```

### Phase 4 (US2) — Parallel Work

```
All common primitives can run in parallel (different files):
  T029: Button.tsx
  T030: Modal.tsx
  T031: DataTable.tsx
  T032: Badge.tsx
  T033: EmptyState.tsx
  T034: QualityBadge.tsx

All MACC domain components can run in parallel (different folders):
  T038: Initiatives components
  T039: Scenarios components
  T040: Suggestions components
  T041: Targets components

Sequential (depend on T029–T034 being done):
  T035: Update button consumer files
  T036: Update modal consumer files
  T037: Update form consumer files
```

### Phases 5–8 — Cross-Story Parallel Work

```
After US3 (Phase 5) completes and US2 primitives are done:
  US4 (shell): T054, T055, T056 in parallel (different layout files)
  US5 (emissions): T060, T061, T062, T063 in parallel (different emission components)
  US6 (context): T067, T068 in parallel (different context files)
  → All three stories (US4, US5, US6) can run in parallel on different developer branches
```

---

## Implementation Strategy

### MVP Scope (User Story 1 Only)

1. Complete Phase 1: Setup (Prism installed, baseline recorded)
2. Complete Phase 2: Foundational backend decoupling
3. Complete Phase 3: US1 MACC Modelling Hub
4. **STOP and VALIDATE**: The core navigation redesign (FR-001 through FR-015) is functional. All tab switching, URL state, and cross-tab data flow works. Demo-ready.

### Incremental Delivery (Stability-First)

```
Phase 1+2 done → Backend decoupled + Prism installed (invisible to users)
Phase 3 done   → MACC hub live (highest user value — SC-001 met)
Phase 4 done   → All UI components use Prism (SC-002 met)
Phase 5 done   → Clean 4-item sidebar + redirects (SC-003, SC-007 met)
Phase 6 done   → Prism app shell (SC-002 fully verified)
Phase 7 done   → Emissions page rebuilt
Phase 8 done   → Context page rebuilt (SC-002 complete across all pages)
Phase 9 done   → All SC-001–SC-007 verified, bundle within limit, accessibility clean
```

Each phase merged to the branch leaves the application fully functional and stable per Constitution Principle VII.

### Parallel Team Strategy

With two developers:
- **Developer A**: Phase 1 → Phase 2 → Phase 3 (US1) → Phase 5 (US3) → Phase 6 (US4)
- **Developer B**: Phase 4 common components (T029–T034, unblocked after Phase 1+2) → Phase 4 consumer updates → Phase 4 domain components → Phase 7 (US5) + Phase 8 (US6)
- **Together**: Phase 9 (Polish)

---

## Task Count Summary

| Phase | User Story | Tasks | Notes |
|-------|-----------|-------|-------|
| Phase 1 | Setup | 4 | T001–T004 |
| Phase 2 | Foundational | 8 | T005–T012 — backend only; blocks all stories |
| Phase 3 | US1 (P1) | 12 | T013–T024 — core navigation hub |
| Phase 4 | US2 (P2) | 19 | T025–T043 — widest blast radius; highest parallelism |
| Phase 5 | US3 (P3) | 8 | T044–T051 — depends on US1 |
| Phase 6 | US4 (P4) | 6 | T052–T057 — depends on US3 |
| Phase 7 | US5 (P5) | 7 | T058–T064 — largely independent |
| Phase 8 | US6 (P6) | 4 | T065–T068 — simplest page |
| Phase 9 | Polish | 9 | T069–T077 — verification only |
| **Total** | | **77** | |

**Parallel opportunities**: 42 of 77 tasks (55%) marked [P] — highest density in Phase 4 (US2 common components + domain components).
