# Tasks: MACC Modelling

**Input**: Design documents from `/specs/001-macc-modelling/`
**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contracts/ ✅, research.md ✅, quickstart.md ✅

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Exact file paths included in all task descriptions

## Path Conventions

- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- **Repo root**: `Makefile`, `backend/pyproject.toml`, `frontend/package.json`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project scaffolding, dependency config, and dev tooling. No user story work yet.

- [x] T001 Create repository directory structure per plan.md project structure (backend/src/api/, backend/src/models/, backend/src/schemas/, backend/src/services/, backend/src/integrations/, backend/tests/unit/, backend/tests/integration/, backend/tests/contract/, frontend/src/components/, frontend/src/pages/, frontend/src/hooks/, frontend/src/services/, frontend/src/types/, frontend/tests/)
- [x] T002 Create backend/pyproject.toml with Python 3.11+ and dependencies: fastapi, uvicorn, sqlalchemy[asyncio], aiosqlite, pydantic, pydantic-settings, python-jose[cryptography], httpx, openai, alembic, ruff, mypy, pytest, pytest-asyncio, pytest-cov
- [x] T003 [P] Create frontend/package.json with React 18+, TypeScript 5.x, Vite, d3-scale, d3-array, @tanstack/react-query, react-router-dom, @floating-ui/react; dev deps: vitest, @testing-library/react, @testing-library/jest-dom, eslint, prettier, typescript
- [x] T004 [P] Create frontend/tsconfig.json with strict mode enabled and frontend/vite.config.ts with API proxy to localhost:8000
- [x] T005 [P] Create Makefile at repo root with targets: run-backend, run-frontend, seed, test, lint, migrate, dev-token
- [x] T006 [P] Create backend/.env.example and frontend/.env.example per quickstart.md environment variables (§11)
- [x] T007 [P] Configure Ruff (backend/ruff.toml) and mypy (backend/mypy.ini) with strict settings per constitution
- [x] T008 [P] Configure ESLint (frontend/.eslintrc.cjs) and Prettier (frontend/.prettierrc) per constitution

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database, auth, app shells, and API client. **MUST complete before any user story.**

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T009 Create SQLAlchemy async engine and session factory in backend/src/models/database.py with WAL mode, foreign keys, busy_timeout pragmas, expire_on_commit=False per research.md R2
- [x] T010 Create Organisation model in backend/src/models/organisation.py per data-model.md (id, company, root_company_unit_id, timestamps)
- [x] T011 Create CompanyUnit model in backend/src/models/organisation.py per data-model.md (self-referential tree via immediate_parent_id, all company_construct fields, indexes on organisation_id, company_unit_id, immediate_parent_id, company_unit_type, country_code)
- [x] T012 [P] Create EmissionSource and EmissionRecord models in backend/src/models/emissions.py per data-model.md (answer_id unique, 3-level taxonomy, monthly granularity, scope, market_factor_type, upstream, composite indexes, unique constraint)
- [x] T013 [P] Create AbatementInitiative and InitiativeEmissionSource models in backend/src/models/initiative.py per data-model.md (initiative_type, cost_eur, co2e_reduction_tonnes, cost_per_tonne, status state machine, confidence, source_suggestion_id FK)
- [x] T014 [P] Create Scenario and ScenarioInitiative models in backend/src/models/scenario.py per data-model.md (is_baseline, display_order, is_included)
- [x] T015 [P] Create OrganisationalContext and EmissionTarget models in backend/src/models/context.py per data-model.md (industry_sector, sustainability_maturity enum, target_type, target_value_pct, scope_coverage JSON, target_co2e_tonnes computed)
- [x] T016 [P] Create AIConstraintConfig, AISuggestionRequest, AISuggestion models in backend/src/models/sync.py per data-model.md (excluded_technologies JSON, min_confidence_level, industry_specific_filters JSON, suggestion_data JSON)
- [x] T017 [P] Create SyncLog model in backend/src/models/sync.py per data-model.md (sync_type, correlation_id, records_created/updated)
- [x] T018 Create models __init__.py in backend/src/models/__init__.py importing all models for Alembic discovery
- [x] T019 Initialise Alembic in backend/alembic/ with async config (async_engine_from_config), render_as_batch=True, naming conventions per research.md R2
- [x] T020 Generate initial Alembic migration creating all tables in backend/alembic/versions/
- [x] T021 Create FastAPI app factory in backend/src/api/main.py with CORS middleware, exception handlers, health endpoint (/api/v1/health per export-sync-api.md), meta endpoint (/api/v1/meta), and router includes
- [x] T022 [P] Create dependency injection module in backend/src/api/deps.py (get_db session dependency, get_current_organisation dependency)
- [x] T023 [P] Create JWT authentication module in backend/src/api/auth.py (token validation middleware, dev token generator command per quickstart.md §5)
- [x] T024 Create seed_data.py in backend/seed_data.py generating realistic sample data for a fictional heavy industrial manufacturing company: 1 organisation (home currency: GBP), seeded OrganisationalContext (industry_sector, operating_geographies), ~15 CompanyUnits (mixed depth by branch: deeper manufacturing; shallower sales offices), physical operations in GB/NO/SE/FI/DK/US/CA plus global sales units, ~50 EmissionSources with answer_ids, ~1,800 EmissionRecords (36 months × multiple scopes × Location/Market), overall scope mix target ~70% S3 / ~20% S2 / ~10% S1, based on company_construct and answers_construct patterns
- [x] T025 Create frontend app shell in frontend/src/main.tsx and frontend/src/App.tsx with React Router, TanStack QueryClient provider, sidebar navigation layout matching EcoOnline design (blue primary, sidebar nav with: Emissions, MACC, Scenarios, Context, AI Suggestions, Settings), routing to stub pages
- [x] T026 [P] Create layout components in frontend/src/components/layout/ (Sidebar.tsx, Header.tsx, PageLayout.tsx, LoadingSpinner.tsx) matching EcoOnline design patterns
- [x] T027 [P] Create common UI components in frontend/src/components/common/ (Button.tsx, Modal.tsx, Badge.tsx, ErrorBoundary.tsx, EmptyState.tsx, DataTable.tsx)
- [x] T028 Create typed API client in frontend/src/services/api.ts with fetch wrapper, JWT token injection, base URL from env, error handling, and typed request/response helpers
- [x] T029 [P] Create shared TypeScript types in frontend/src/types/common.ts (PaginatedResponse, ApiError, ScopeBreakdown, MarketFactorType)

**Checkpoint**: `make run-backend` serves API on :8000 (health returns OK), `make run-frontend` serves SPA on :5173 (app shell with sidebar nav renders). `make seed` populates sample data. `make lint` passes.

---

## Phase 3: User Story 1 — View Emissions Profile (Priority: P1) 🎯 MVP

**Goal**: Users can explore their emissions profile across all three scopes and navigate the organisational hierarchy.

**Independent Test**: Load seed data, open app, verify emissions overview shows scope breakdown, drill into divisions → sites → sources, toggle Location/Market, view trends.

### Backend — US1

- [x] T030 [P] [US1] Create Pydantic schemas for emissions endpoints in backend/src/schemas/emissions.py (EmissionsOverviewResponse, HierarchyNodeResponse, UnitDetailResponse, TrendResponse, SourceListResponse per emissions-api.md contract)
- [x] T031 [US1] Implement emissions service in backend/src/services/emissions_service.py: organisation overview aggregation (total by scope, by question_group, top sources), recursive subtree CO2e sums via CTE queries, unit detail (division aggregate vs site sources), trend computation (year-over-year), source listing — all with market_factor_type toggle and selectinload for N+1 prevention
- [x] T032 [US1] Implement emissions API endpoints in backend/src/api/emissions.py: GET /overview, GET /hierarchy, GET /units/{unit_id}, GET /trends, GET /sources — all per emissions-api.md contract with query params (year, market_factor_type, scope, parent_id, depth, include_closed)

### Frontend — US1

- [x] T033 [P] [US1] Create emissions TypeScript types in frontend/src/types/emissions.ts matching emissions-api.md response schemas (EmissionsOverview, HierarchyNode, UnitDetail, TrendData, EmissionSourceSummary)
- [x] T034 [P] [US1] Create useEmissions hook in frontend/src/hooks/useEmissions.ts with TanStack Query hooks: useEmissionsOverview, useHierarchy, useUnitDetail, useTrends, useSources — with year and market_factor_type as query key params
- [x] T035 [US1] Create EmissionsPage in frontend/src/pages/EmissionsPage.tsx with tab layout: Overview, Hierarchy, Trends
- [x] T036 [US1] Create emissions overview components in frontend/src/components/emissions/EmissionsOverview.tsx: scope donut/bar chart (D3), top sources table, year selector dropdown, Location/Market toggle button
- [x] T037 [US1] Create hierarchy browser in frontend/src/components/emissions/HierarchyBrowser.tsx: collapsible tree rendering CompanyUnit hierarchy, click-through to unit detail, CO2e badges per node, loading states
- [x] T038 [US1] Create unit detail view in frontend/src/components/emissions/UnitDetail.tsx: scope breakdown chart, source table (for sites with activity/question/question_group columns), child units list (for divisions), breadcrumb navigation
- [x] T039 [US1] Create trend charts in frontend/src/components/emissions/TrendChart.tsx: line chart by year using D3, scope filter selector, responsive SVG

**Checkpoint**: User opens app → sees total emissions by scope → drills into hierarchy → views individual site sources → toggles Location/Market → sees year-over-year trends. US1 fully functional.

---

## Phase 4: User Story 2 — Custom Abatement Initiatives + User Story 7 — Lifecycle & Ownership (Priority: P2)

**Goal**: Users can create, edit, and manage abatement initiatives with lifecycle tracking, and see them on an interactive MACC chart.

**Independent Test**: Create 5+ initiatives with varying costs/reductions, verify MACC chart renders correctly ordered by cost_per_tonne, edit/delete initiatives and see chart update, assign owners and statuses, filter by status.

### Backend — US2/US7

- [x] T040 [P] [US2] Create Pydantic schemas for initiatives in backend/src/schemas/initiatives.py (InitiativeCreate, InitiativeUpdate, InitiativeResponse, InitiativeListResponse, StatusUpdate, OverlapResponse, BulkValidateResponse per initiatives-api.md contract)
- [x] T041 [US2] Implement initiative service in backend/src/services/initiative_service.py: CRUD operations, status state machine validation (idea→planned→approved→in_progress→completed, any→rejected), cost_per_tonne computation, emission source linking via InitiativeEmissionSource, overlap detection (shared sources with combined reduction % check)
- [x] T042 [US2] Implement MACC calculator service in backend/src/services/macc_calculator.py: sort initiatives by cost_per_tonne ascending, compute cumulative x-positions (width = co2e_reduction_tonnes), bar dimensions, handle negative-cost bars below x-axis, summary stats (total cost, total reduction, weighted avg cost_per_tonne)
- [x] T043 [US2] Implement initiative API endpoints in backend/src/api/initiatives.py: POST / (create), GET / (list with filters: status, initiative_type, scope, sort_by, pagination), GET /{id} (detail with sources and scenarios), PUT /{id} (update), DELETE /{id} (with status guard), PATCH /{id}/status, GET /{id}/overlap, POST /bulk-validate — all per initiatives-api.md contract

### Frontend — US2/US7

- [x] T044 [P] [US2] Create initiatives TypeScript types in frontend/src/types/initiatives.ts matching initiatives-api.md response schemas (Initiative, InitiativeCreate, InitiativeUpdate, StatusTransition, OverlapInfo)
- [x] T045 [P] [US2] Create useInitiatives hook in frontend/src/hooks/useInitiatives.ts with TanStack Query hooks: useInitiatives (list with filters), useInitiative (detail), useCreateInitiative, useUpdateInitiative, useDeleteInitiative, useUpdateStatus — with optimistic updates on mutations
- [x] T046 [US2] Create MACCPage in frontend/src/pages/MACCPage.tsx with split layout: MACC chart (top) + initiative list/table (bottom), create initiative button
- [x] T047 [US2] Create MACC chart component in frontend/src/components/macc/MACCChart.tsx: D3-powered SVG with variable-width bars (width=abatement volume, height=cost_per_tonne), negative-cost bars below x-axis, x-axis label (cumulative CO2e reduction), y-axis label (€/tCO2e), responsive sizing, colour coding by status
- [x] T048 [US2] Create MACC chart interactions in frontend/src/components/macc/MACCBar.tsx and frontend/src/components/macc/MACCTooltip.tsx: hover tooltip (name, cost, reduction, cost_per_tonne), click → navigate to initiative detail, overlap highlight, legend component
- [x] T049 [US2] Create initiative form modal in frontend/src/components/initiatives/InitiativeForm.tsx: create/edit mode, fields (name, description, cost_eur, annual_saving_eur, co2e_reduction_tonnes, payback_years, lifespan_years, owner, confidence, notes), emission source multi-select (from useEmissions sources), validation, loading state
- [x] T050 [US2] Create initiative list/table in frontend/src/components/initiatives/InitiativeTable.tsx: sortable columns (name, cost_per_tonne, co2e_reduction, status, owner, confidence), filters (status, initiative_type), pagination, row click → edit modal, status badge with colour coding
- [x] T051 [US7] Add status transition UI in frontend/src/components/initiatives/StatusTransition.tsx: dropdown or button group for valid next statuses, confirmation on reject (requires reason), visual state machine indicator

**Checkpoint**: User creates initiatives → sees them on MACC chart → edits cost/reduction → chart updates instantly → assigns owners → filters by status → sees overlap warnings. US2 + US7 fully functional.

---

## Phase 4b: Post-Delivery Feedback — Initiative Model & Form Refinements

**Goal**: Implement 7 agreed specification changes from Phase 4 feedback: CapEx/OpEx cost model with lifecycle formula, guided cascade source selection, yellow warning (non-blocking), GBP currency, required lifespan with default 10, annual reduction rename, computed payback.

**Independent Test**: Create an initiative via the new guided cascade (scope → question_group → question → activity → company units), enter CapEx and OpEx values, verify lifecycle cost_per_tonne = (capex + opex × lifespan) / annual_reduction, verify all UI shows £ not €, verify yellow warning appears when reduction exceeds source emissions but form still submits.

**Changes implemented**:
1. `cost_eur` → `capex_gbp` (one-time, always ≥ 0), `annual_saving_eur` → `opex_annual_gbp` (positive = cost, negative = saving)
2. Lifecycle cost formula: `(capex_gbp + opex_annual_gbp × lifespan_years) / co2e_reduction_annual_tonnes`
3. Guided cascade selector replacing flat source checklist (one activity per initiative, multiple company units)
4. Yellow warning banner for over-reduction (non-blocking — user can still submit)
5. GBP (£) everywhere — all field names use `_gbp` suffix
6. `lifespan_years` required with default 10
7. `co2e_reduction_tonnes` → `co2e_reduction_annual_tonnes`
8. `payback_years` computed from `capex_gbp / |opex_annual_gbp|` when OpEx < 0; not a user input

### Backend — Model & Migration

- [x] T100 [US2] Generate Alembic migration in backend/alembic/versions/ to: rename cost_eur → capex_gbp, rename annual_saving_eur → opex_annual_gbp, rename co2e_reduction_tonnes → co2e_reduction_annual_tonnes, alter lifespan_years to NOT NULL DEFAULT 10 (backfill existing rows), recalculate cost_per_tonne and payback_years for existing rows using new formulas
- [x] T101 [P] [US2] Update AbatementInitiative model in backend/src/models/initiative.py: rename columns (cost_eur → capex_gbp, annual_saving_eur → opex_annual_gbp, co2e_reduction_tonnes → co2e_reduction_annual_tonnes), make lifespan_years NOT NULL with server_default="10", update column descriptions

### Backend — Schemas & Services

- [x] T102 [P] [US2] Update Pydantic schemas in backend/src/schemas/initiatives.py
- [x] T103 [P] [US2] Add cascade query methods to backend/src/services/emissions_service.py
- [x] T104 [US2] Add cascade lookup endpoints to backend/src/api/emissions.py
- [x] T105 [US2] Update initiative service in backend/src/services/initiative_service.py
- [x] T106 [P] [US2] Update MACC calculator in backend/src/services/macc_calculator.py

### Frontend — Types & Hooks

- [x] T107 [P] [US2] Update TypeScript types in frontend/src/types/initiatives.ts
- [x] T108 [P] [US2] Create cascade hooks in frontend/src/hooks/useEmissionsCascade.ts

### Frontend — Components

- [x] T109 [US2] Rework InitiativeForm in frontend/src/components/initiatives/InitiativeForm.tsx
- [x] T110 [P] [US2] Update InitiativeTable in frontend/src/components/initiatives/InitiativeTable.tsx
- [x] T111 [P] [US2] Update MACC chart components (MACCChart.tsx, MACCTooltip.tsx, MACCPage.tsx, MACCBar.tsx)

### Verification

- [x] T112 [US2] Smoke test — all Phase 4b endpoints and UI verified

**Checkpoint**: Initiative form uses guided cascade selector (scope → activity → company units) → CapEx/OpEx fields replace old cost fields → lifecycle cost_per_tonne renders on MACC chart with £ labels → payback auto-computed → yellow warning for over-reduction is non-blocking. All Phase 4 functionality preserved with new field model.

---

## Phase 5: User Story 6 — Target Alignment (Priority: P2)

**Goal**: Users can define emissions reduction targets and see whether their initiatives/scenarios are on track.

**Independent Test**: Create 2030 and 2040 targets, verify progress calculation shows correct gap, toggle between scenarios to see alignment change.

### Backend — US6

- [x] T052 [P] [US6] Create Pydantic schemas for context and targets in backend/src/schemas/context.py (ContextResponse, ContextUpsert, TargetCreate, TargetUpdate, TargetResponse, TargetProgressResponse per context-api.md contract)
- [x] T053 [US6] Implement target service in backend/src/services/target_service.py: CRUD for EmissionTarget, progress calculation (current_co2e from emissions, scenario_reduction from initiatives, projected = current - reduction, gap = projected - target, on_track boolean), scope_coverage filtering
- [x] T054 [US6] Implement target API endpoints in backend/src/api/targets.py: GET /context/targets, POST /context/targets, PUT /context/targets/{id}, DELETE /context/targets/{id}, GET /context/targets/{id}/progress?scenario_id= — per context-api.md contract

### Frontend — US6

- [x] T055 [P] [US6] Create targets TypeScript types in frontend/src/types/scenarios.ts (Target, TargetCreate, TargetProgress)
- [x] T056 [US6] Create target configuration components in frontend/src/components/targets/TargetForm.tsx and frontend/src/components/targets/TargetList.tsx: create/edit targets (year, type, percentage, baseline, scope coverage, source), progress bars showing gap to target with on-track/off-track indicators
- [x] T057 [US6] Create target alignment overlay on MACC chart in frontend/src/components/macc/TargetOverlay.tsx: horizontal target line on MACC chart showing whether cumulative abatement reaches target, gap indicator with tonnes and percentage

**Checkpoint**: User sets 2030 target of 50% reduction → sees progress bar → MACC chart shows target line → can see if selected initiatives close the gap. US6 fully functional.

---

## Phase 6: User Story 3 — Organisational Context (Priority: P3)

**Goal**: Users can capture and persist organisational context for AI suggestions and reporting.

**Independent Test**: Fill in org context form (industry, geography, size, maturity), save, reload page, verify data persists.

### Backend — US3

- [x] T058 [US3] Implement context API endpoints in backend/src/api/context.py: GET /context (retrieve org profile), PUT /context (upsert org profile with validation: sustainability_maturity enum, employee_count > 0, annual_revenue_gbp > 0, operating_geographies max 50) — per context-api.md contract

### Frontend — US3

- [x] T059 [US3] Create ContextPage in frontend/src/pages/ContextPage.tsx with org context form
- [x] T060 [US3] Create org context form in frontend/src/components/context/ContextForm.tsx: fields (industry_sector, employee_count, annual_revenue_gbp, operating_geographies multi-input, sustainability_maturity select, budget_constraint_gbp, target_year, notes), validation, save/cancel, success toast, auto-load existing data

**Checkpoint**: User navigates to Context page → fills in org profile → saves → reloads → data persists. US3 fully functional.

---

## Phase 7: User Story 8 — Compare Abatement Scenarios (Priority: P3)

**Goal**: Users can create named scenarios, assign initiatives, and compare pathways side-by-side.

**Independent Test**: Create "Conservative" and "Aggressive" scenarios with different initiative sets, compare side-by-side, verify metrics differ correctly.

### Backend — US8

- [x] T061 [P] [US8] Create Pydantic schemas for scenarios in backend/src/schemas/scenarios.py (ScenarioCreate, ScenarioUpdate, ScenarioResponse, ScenarioDetailResponse, MACCDataResponse, CompareResponse per scenarios-api.md contract)
- [x] T062 [US8] Implement scenario service in backend/src/services/scenario_service.py: CRUD, is_baseline enforcement (only one per org), add/remove initiatives, initiative reordering (display_order), aggregate metrics (total_capex_gbp, total_opex_annual_gbp, total_co2e_reduction_annual_tonnes, residual_co2e, weighted_avg_cost_per_tonne), comparison logic (shared/unique initiatives)
- [x] T063 [US8] Implement scenario API endpoints in backend/src/api/scenarios.py: POST / (create), GET / (list), GET /{id} (detail with initiatives and target_alignment), PUT /{id}, DELETE /{id}, POST /{id}/initiatives, DELETE /{id}/initiatives/{initiative_id}, PATCH /{id}/initiatives/reorder, GET /{id}/macc-data, GET /compare?scenario_ids= — all per scenarios-api.md contract

### Frontend — US8

- [x] T064 [P] [US8] Create useScenarios hook in frontend/src/hooks/useScenarios.ts with TanStack Query hooks: useScenarios, useScenario, useCreateScenario, useUpdateScenario, useDeleteScenario, useAddInitiatives, useRemoveInitiative, useReorderInitiatives, useMACCData, useCompareScenarios
- [x] T065 [US8] Create ScenariosPage in frontend/src/pages/ScenariosPage.tsx with scenario list and comparison view
- [x] T066 [US8] Create scenario manager in frontend/src/components/scenarios/ScenarioManager.tsx: create scenario modal, add/remove initiatives checklist, set baseline toggle, initiative reorder drag
- [x] T067 [US8] Create scenario comparison view in frontend/src/components/scenarios/ScenarioComparison.tsx: side-by-side metrics table (total reduction, cost, cost_per_tonne, target alignment status), shared/unique initiative breakdown, highlight which scenario meets targets

**Checkpoint**: User creates two scenarios → assigns different initiatives → compares side-by-side → sees which meets targets → sets one as baseline. US8 fully functional.

---

## Phase 8: User Story 10 — Data Quality & Uncertainty (Priority: P3)

**Goal**: Users can see confidence levels on emissions data and initiative estimates, and filter by quality.

**Independent Test**: View emissions with mixed quality indicators, filter to "Actual" only, verify initiative confidence badges display correctly.

- [ ] T068 [US10] Add quality badge component in frontend/src/components/common/QualityBadge.tsx: colour-coded badge (Actual=green, Estimated=amber, missing=grey), tooltip with quality details
- [ ] T069 [US10] Add confidence badge to initiative table and MACC bars in frontend/src/components/initiatives/InitiativeTable.tsx and frontend/src/components/macc/MACCBar.tsx: high=green, medium=amber, low=red
- [ ] T070 [US10] Add quality filter to emissions views in frontend/src/components/emissions/EmissionsOverview.tsx and frontend/src/components/emissions/UnitDetail.tsx: filter dropdown for quality level, exclude low-quality data from summaries when filtered

**Checkpoint**: User sees quality badges on emissions → filters by confidence → MACC chart reflects confidence levels. US10 fully functional.

---

## Phase 9: User Story 4 — AI-Suggested Initiatives (Priority: P4)

**Goal**: AI generates relevant abatement suggestions based on org context and emissions profile.

**Independent Test**: Configure org context, request AI suggestions, verify 3-5 relevant initiatives returned with rationales, accept one and verify it appears on MACC chart as "ai_suggested".

### Backend — US4

- [ ] T071 [P] [US4] Create Pydantic schemas for AI suggestions in backend/src/schemas/suggestions.py (SuggestionRequest, SuggestionResponse, SuggestionAccept, SuggestionDismiss, ConstraintConfig per ai-suggestions-api.md contract)
- [ ] T072 [US4] Implement OpenAI client in backend/src/integrations/openai_client.py: AsyncOpenAI singleton, gpt-4o-2024-08-06 pinned, structured outputs with Pydantic schemas, max_retries=3, refusal handling, content-hash caching (SHA-256 → AISuggestionRequest), per research.md R3
- [ ] T073 [US4] Implement suggestion service in backend/src/services/suggestion_service.py: prompt construction (developer role, XML-delimited emissions_profile + organisational_context + constraints sections), response parsing into typed suggestions, business rule validation (target sources exist, constraints respected, estimates plausible), accept flow (creates AbatementInitiative with initiative_type="ai_suggested"), dismiss flow (updates AISuggestion.accepted=false)
- [ ] T074 [US4] Implement suggestion API endpoints in backend/src/api/suggestions.py: POST /ai/suggestions (with 30s timeout, rate limit 10/min), GET /ai/suggestions (history with pagination), GET /ai/suggestions/{request_id} (detail), POST /ai/suggestions/{suggestion_id}/accept (with optional overrides, optional add_to_scenario_id), POST /ai/suggestions/{suggestion_id}/dismiss — per ai-suggestions-api.md contract

### Frontend — US4

- [ ] T075 [P] [US4] Create useSuggestions hook in frontend/src/hooks/useSuggestions.ts with TanStack Query hooks: useRequestSuggestions (mutation with loading state for 5-15s), useSuggestionHistory, useSuggestionDetail, useAcceptSuggestion, useDismissSuggestion
- [ ] T076 [US4] Create SuggestionsPage in frontend/src/pages/SuggestionsPage.tsx with request form and suggestion results
- [ ] T077 [US4] Create suggestion request UI in frontend/src/components/suggestions/SuggestionRequest.tsx: scope focus multi-select, priority mode select (cost_effective/high_impact/quick_wins), max suggestions slider, budget limit input, loading state with progress indicator (5-15s expected wait)
- [ ] T078 [US4] Create suggestion cards in frontend/src/components/suggestions/SuggestionCard.tsx: card per suggestion with name, description, rationale, estimated cost/reduction/payback, confidence badge, assumptions list, relevance score bar, action buttons (Accept, Modify & Accept, Dismiss)
- [ ] T079 [US4] Implement accept flow in frontend/src/components/suggestions/AcceptModal.tsx: optional field overrides (name, cost, reduction, owner), optional add to scenario select, confirm creates initiative with initiative_type="ai_suggested"
- [ ] T080 [US4] Add visual distinction for AI-suggested initiatives on MACC chart in frontend/src/components/macc/MACCChart.tsx: different bar pattern/colour for initiative_type="ai_suggested", legend entry differentiating custom vs AI-suggested

**Checkpoint**: User requests suggestions → AI returns 5 contextual initiatives → user reviews rationales → accepts one → it appears on MACC chart as AI-suggested. US4 fully functional.

---

## Phase 10: User Story 9 — AI Constraints & Preferences (Priority: P3)

**Goal**: Users can configure constraints for AI suggestions (excluded technologies, budget limits, scope exclusions).

**Independent Test**: Configure constraints (exclude nuclear, max cost £100k, exclude scope 3), request suggestions, verify no suggestions violate constraints.

### Backend — US9

- [ ] T081 [US9] Implement constraint API endpoints in backend/src/api/suggestions.py (add to existing router): GET /ai/constraints (retrieve config, 404 if none), PUT /ai/constraints (upsert with validation: excluded_unit_ids must reference valid CompanyUnits, min_confidence_level enum, preferred_payback_years > 0) — per ai-suggestions-api.md contract

### Frontend — US9

- [ ] T082 [US9] Create constraint config page in frontend/src/components/suggestions/ConstraintConfig.tsx: form fields (excluded_technologies tag input, excluded_unit_ids CompanyUnit multi-select, excluded_scopes checkboxes, max_initiative_cost_gbp number input, min_confidence_level select, preferred_payback_years number input, industry_specific_filters key-value editor), save/reset, integrate into SuggestionsPage or SettingsPage

**Checkpoint**: User configures AI constraints → requests suggestions → all returned suggestions respect the configured limits. US9 fully functional.

---

## Phase 11: User Story 11 — Export & Share (Priority: P4)

**Goal**: Users can export MACC charts, initiative tables, and scenario reports for stakeholder presentations.

**Independent Test**: Export initiative table as CSV, export MACC chart as SVG/PNG, export scenario report as PDF, verify all files are valid and contain expected content.

### Backend — US11

- [ ] T083 [P] [US11] Create Pydantic schemas for export in backend/src/schemas/export.py (ReportRequest, ChartExportRequest per export-sync-api.md contract)
- [ ] T084 [US11] Implement export service in backend/src/services/export_service.py: CSV generation for initiative data, SVG rendering of MACC chart (server-side D3 or SVG template), PNG conversion (svg-to-png via cairosvg or similar), PDF/Excel report generation (weasyprint or openpyxl with summary, initiatives, emissions, MACC data sheets)
- [ ] T085 [US11] Implement export API endpoints in backend/src/api/export.py: POST /export/initiatives (CSV download), POST /export/macc-chart (SVG/PNG download with width/height/color_scheme params), POST /export/report (PDF/Excel download with include_sections array) — per export-sync-api.md contract

### Frontend — US11

- [ ] T086 [P] [US11] Create useExport hook in frontend/src/hooks/useExport.ts with mutations: useExportInitiatives, useExportChart, useExportReport — handling binary downloads with proper Content-Disposition filenames
- [ ] T087 [US11] Create export controls in frontend/src/components/export/ExportMenu.tsx: dropdown menu on MACC page and Scenarios page with options (Export Chart as SVG, Export Chart as PNG, Export Initiatives CSV, Export Scenario Report PDF, Export Scenario Report Excel), loading state during generation

**Checkpoint**: User exports MACC chart as PNG → gets downloadable image → exports initiative CSV → gets spreadsheet → exports scenario PDF report → gets formatted document. US11 fully functional.

---

## Phase 12: User Story 5 — Data Integration / Sync (Priority: P5)

**Goal**: Sync infrastructure is in place with a stub EcoOnline client, ready to point at real API endpoints.

**Independent Test**: Trigger sync via API, verify stub client returns sample data, verify SyncLog records the operation with correlation ID.

### Backend — US5

- [ ] T088 [US5] Implement EcoOnline client stub in backend/src/integrations/ecoonline_client.py: async httpx client with rate limiting (asyncio.Semaphore for concurrency + token bucket), exponential backoff on 429/5xx, fault isolation (catch errors, return cached/stale with warnings), correlation ID propagation, data mapping to internal models — currently returns mock data matching expected API shape per research.md R4
- [ ] T089 [US5] Implement sync API endpoints in backend/src/api/export.py (add to existing router): POST /sync/emissions (trigger sync → returns 202 with sync_id), GET /sync/status (latest sync state), GET /sync/history (paginated SyncLog entries) — per export-sync-api.md contract, wired to stub client

**Checkpoint**: User triggers sync → stub returns sample data → SyncLog records operation → sync history shows past syncs. US5 sync infrastructure ready.

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: UX polish, accessibility, performance, and final quality assurance.

- [ ] T090 [P] Add loading skeletons to all pages in frontend/src/components/common/Skeleton.tsx (emissions overview skeleton, MACC chart skeleton, table skeleton) replacing raw spinners
- [ ] T091 [P] Add empty state components for all list views in frontend/src/components/common/EmptyState.tsx (no emissions loaded, no initiatives created, no scenarios, no suggestions) with call-to-action buttons
- [ ] T092 [P] Add error boundary wrapper around all pages in frontend/src/components/common/ErrorBoundary.tsx with user-friendly error messages and retry buttons
- [ ] T093 Add keyboard navigation support: Tab through MACC bars, Enter to open initiative detail, Escape to close modals, arrow keys in hierarchy tree
- [ ] T094 Responsive layout adjustments: MACC chart SVG scales to container, sidebar collapses on narrow viewports, tables scroll horizontally on mobile
- [ ] T095 WCAG 2.1 AA audit: aria-labels on all interactive elements, colour contrast verification (especially on MACC bars), screen reader support for chart data (visually hidden data table), focus indicators
- [ ] T096 Performance audit: verify API response times <200ms p95 (add timing middleware in backend/src/api/main.py), MACC chart re-render <2s with 200 initiatives, page load <3s, frontend bundle size check (<50KB incremental per feature)
- [ ] T097 Create SettingsPage in frontend/src/pages/SettingsPage.tsx: dev token display, data management (clear local data, re-seed), system info (API version, DB status, last sync)
- [ ] T098 Run quickstart.md validation: follow all steps from scratch on a clean checkout, verify everything works end-to-end

**Checkpoint**: All pages have loading/empty/error states → keyboard navigation works → accessibility audit passes → performance targets met → quickstart validated.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user stories**
- **Phase 3 (US1 — Emissions)**: Depends on Phase 2 — MVP, delivers standalone value
- **Phase 4 (US2+US7 — MACC)**: Depends on Phase 2, benefits from Phase 3 (source selection needs emissions data)
- **Phase 4b (Feedback Refinements)**: Depends on Phase 4 — refactors initiative model, form, and chart. **MUST complete before Phase 5+** to avoid rework on old field names
- **Phase 5 (US6 — Targets)**: Depends on Phase 4b, benefits from Phase 4b (target overlay uses updated cost_per_tonne)
- **Phase 6 (US3 — Context)**: Depends on Phase 2 only — fully independent
- **Phase 7 (US8 — Scenarios)**: Depends on Phase 4b (needs initiatives with updated field names to assign to scenarios)
- **Phase 8 (US10 — Quality)**: Depends on Phase 3 + Phase 4 (adds badges to existing views)
- **Phase 9 (US4 — AI)**: Depends on Phase 4 + Phase 6 (needs initiatives + org context)
- **Phase 10 (US9 — Constraints)**: Depends on Phase 9 (extends AI suggestion infrastructure)
- **Phase 11 (US11 — Export)**: Depends on Phase 4 + Phase 7 (exports MACC charts and scenarios)
- **Phase 12 (US5 — Sync)**: Depends on Phase 2 only — can be done in parallel with most phases
- **Phase 13 (Polish)**: Depends on all desired user story phases being complete

### User Story Dependencies

```
Phase 2 (Foundation) ──┬── Phase 3 (US1: Emissions) ──┐
                       │                                ├── Phase 8 (US10: Quality)
                       ├── Phase 4 (US2+US7: MACC) ────┤
                       │        │                       │
                       │        └── Phase 4b (Feedback) ┤
                       │                 │              ├── Phase 7 (US8: Scenarios) ── Phase 11 (US11: Export)
                       │                 │              │
                       │                 └── Phase 5 (US6: Targets)
                       │
                       ├── Phase 6 (US3: Context) ─── Phase 9 (US4: AI) ─── Phase 10 (US9: Constraints)
                       │
                       └── Phase 12 (US5: Sync)
```

### Parallel Opportunities

After Phase 2 completes, these can run **in parallel** (different files, no conflicts):
- **Stream A**: Phase 3 (Emissions) → Phase 8 (Quality badges)
- **Stream B**: Phase 4 (MACC) → Phase 5 (Targets) → Phase 7 (Scenarios) → Phase 11 (Export)
- **Stream C**: Phase 6 (Context) → Phase 9 (AI) → Phase 10 (Constraints)
- **Stream D**: Phase 12 (Sync) — independent

### Within Each User Story

1. Schemas (Pydantic + TypeScript types) — can be parallel
2. Services (business logic)
3. API endpoints (depend on schemas + services)
4. Frontend hooks (depend on TypeScript types)
5. Frontend components (depend on hooks)
6. Integration/wiring

---

## Parallel Example: After Foundation

```
# Stream A (Agent 1):
T030-T039: US1 Emissions (backend schemas → service → API → frontend types → hooks → pages)

# Stream B (Agent 2):
T040-T051: US2+US7 MACC & Initiatives (backend schemas → services → API → frontend)

# Stream C (Agent 3):
T058-T060: US3 Context (backend API → frontend page → form)

# Stream D (Agent 4):
T088-T089: US5 Sync stub (client → endpoints)
```

---

## Implementation Strategy

### MVP First (Phases 1–3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**CRITICAL — blocks all stories**)
3. Complete Phase 3: User Story 1 (Emissions)
4. **STOP and VALIDATE**: User can explore emissions hierarchy — standalone value delivered
5. Demo to stakeholders

### Incremental Delivery

1. Setup + Foundation → Runnable app shell
2. + US1 (Emissions) → **MVP: Emissions explorer** 🎯
3. + US2+US7 (MACC + Lifecycle) → Initiative planning tool
4. + US6 (Targets) → Target-aligned planning
5. + US3 (Context) + US8 (Scenarios) → Multi-scenario comparison
6. + US4+US9 (AI) → AI-powered suggestions
7. + US11 (Export) + US5 (Sync) + Polish → Production-ready

Each increment adds value without breaking previous stories.

---

## Notes

- All [P] tasks can run in parallel within their phase (different files, no dependencies)
- [Story] labels map tasks to specific user stories for traceability
- Each phase delivers an independently testable increment
- Commit after each task or logical group
- Backend services must use `selectinload` to prevent N+1 queries
- All API endpoints require JWT auth (enforced by deps.py middleware)
- All frontend async operations must show loading states (constitution Principle III)
- MACC chart uses D3 for scales/math but React renders the SVG (per research.md R1)

## Phase Completion Checklist

After completing **any phase** that touches backend models or data, the implementing agent MUST run:

```bash
# 1. Apply any new migrations
make migrate

# 2. Reseed sample data (only if schema changed or new data required)
make seed

# 3. Verify backend starts cleanly
make run-backend   # should reach "Application startup complete" with no errors

# 4. Verify frontend starts cleanly
make run-frontend  # should reach "ready in Xms" with no TypeScript errors

# 5. Hit the health endpoint
curl http://localhost:8000/api/v1/health   # must return {"status":"ok"}
```

These steps are **mandatory before marking a phase checkpoint as done** and before reporting completion to the user. If any step fails, fix the error before proceeding.
