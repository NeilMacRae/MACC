# Implementation Plan: Marginal Abatement Cost Curve Modelling

**Branch**: `001-macc-modelling` | **Date**: 2026-02-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-macc-modelling/spec.md`

## Summary

Build a stand-alone MACC modelling application enabling sustainability experts to load emissions data from the core EcoOnline platform, explore emissions profiles across scopes and organisational hierarchy, create/manage abatement initiatives on an interactive MACC chart, configure targets and scenarios, and receive AI-generated abatement suggestions. The application uses a Python/FastAPI backend with SQLite storage and a React/TypeScript frontend matching EcoOnline's design language.

## Technical Context

**Language/Version**: Python 3.11+ (backend), TypeScript 5.x (frontend)
**Primary Dependencies**: FastAPI, Pydantic, SQLAlchemy (async), React 18+, D3.js selective imports (charting), TanStack Query (data fetching), OpenAI SDK (AI suggestions)
**Storage**: SQLite via SQLAlchemy async (aiosqlite driver)
**Testing**: pytest + pytest-asyncio + pytest-cov (backend), Vitest + React Testing Library (frontend)
**Target Platform**: Local macOS development (uvicorn + Vite dev servers)
**Project Type**: Web application (backend API + frontend SPA)
**Performance Goals**: API responses <200ms p95; MACC chart re-render <2s; initial page load <3s; AI suggestions <60s
**Constraints**: <200ms p95 for non-AI endpoints; <50KB incremental bundle per feature; no direct DB access to EcoOnline; JWT auth required on all endpoints
**Scale/Scope**: Single-tenant; ~50 company units (sites) per org; ~500 emission sources; ~200 initiatives; ~10 scenarios

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Code Quality** | ✅ PASS | Ruff + ESLint enforced; mypy strict + TS strict; single-responsibility service layer |
| **II. Testing Standards** | ✅ PASS | pytest (backend) + Vitest (frontend); contract tests for all API endpoints; ≥80% coverage target |
| **III. UX Consistency** | ✅ PASS | EcoOnline design patterns (sidebar nav with Emissions, MACC, Scenarios, Context, Settings — no separate AI Suggestions entry); WCAG 2.1 AA; loading states on all async ops |
| **IV. Performance** | ✅ PASS | <200ms p95 API; <3s page load; SQLite indexed queries; no N+1; caching for aggregated emissions |
| **V. API Integration** | ✅ PASS | REST/OpenAPI 3.x contracts defined before implementation; JWT auth; rate limiting + backoff on EcoOnline API calls; fault isolation; correlation ID logging |
| **Quality Gates** | ✅ PASS | GitHub Actions CI with lint/type-check/test; PR review required; OpenAPI validation on endpoint changes |

**Gate Result**: ✅ ALL PASS — proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-macc-modelling/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── emissions-api.md
│   ├── initiatives-api.md
│   ├── scenarios-api.md
│   ├── context-api.md
│   ├── ai-suggestions-api.md
│   └── export-sync-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   ├── __init__.py
│   │   ├── main.py               # FastAPI app factory
│   │   ├── deps.py               # Dependency injection (DB session, auth)
│   │   ├── auth.py               # JWT authentication
│   │   ├── emissions.py          # Emissions browsing endpoints
│   │   ├── initiatives.py        # Initiative CRUD endpoints
│   │   ├── scenarios.py          # Scenario management endpoints
│   │   ├── context.py            # Org context endpoints
│   │   ├── suggestions.py        # AI suggestion endpoints
│   │   ├── targets.py            # Target alignment endpoints
│   │   └── export.py             # Export endpoints
│   ├── models/
│   │   ├── __init__.py
│   │   ├── database.py           # SQLAlchemy engine + session
│   │   ├── organisation.py       # Organisation, CompanyUnit
│   │   ├── emissions.py          # EmissionSource, EmissionRecord
│   │   ├── initiative.py         # AbatementInitiative
│   │   ├── scenario.py           # Scenario, ScenarioInitiative
│   │   ├── context.py            # OrganisationalContext, Target
│   │   └── sync.py               # SyncLog, DataRefreshState
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── emissions.py          # Pydantic request/response schemas
│   │   ├── initiatives.py
│   │   ├── scenarios.py
│   │   ├── context.py
│   │   ├── suggestions.py
│   │   └── export.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── emissions_service.py  # Emissions aggregation + hierarchy
│   │   ├── initiative_service.py # Initiative CRUD + validation
│   │   ├── scenario_service.py   # Scenario metrics computation
│   │   ├── target_service.py     # Target alignment calculation
│   │   ├── suggestion_service.py # AI prompt construction + response parsing
│   │   ├── export_service.py     # CSV/PNG export generation
│   │   └── macc_calculator.py    # MACC ordering + cumulative metrics
│   └── integrations/
│       ├── __init__.py
│       ├── ecoonline_client.py   # EcoOnline API client (rate-limited)
│       └── openai_client.py      # OpenAI API client (rate-limited)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── contract/
├── alembic/                       # Database migrations
├── seed_data.py                   # Sample data generator for local dev
└── pyproject.toml

frontend/
├── src/
│   ├── components/
│   │   ├── layout/               # Sidebar, header, page layout
│   │   ├── emissions/            # Emissions overview, hierarchy tree, trend charts
│   │   ├── macc/                 # MACC chart, initiative bars
│   │   ├── initiatives/         # Initiative form, list, lifecycle filters
│   │   ├── scenarios/           # Scenario manager, comparison table
│   │   ├── context/             # Org context form
│   │   ├── suggestions/         # AI suggestion cards, accept/reject (rendered within MACC page)
│   │   ├── targets/             # Target alignment view
│   │   ├── export/              # Export controls
│   │   └── common/              # Buttons, modals, loading states, badges
│   ├── pages/
│   │   ├── EmissionsPage.tsx
│   │   ├── MACCPage.tsx          # Includes AI suggestion flow via "New Initiative" button
│   │   ├── ScenariosPage.tsx
│   │   ├── ContextPage.tsx
│   │   └── SettingsPage.tsx      # Includes AI constraint config
│   ├── hooks/
│   │   ├── useEmissions.ts
│   │   ├── useInitiatives.ts
│   │   ├── useScenarios.ts
│   │   ├── useSuggestions.ts
│   │   └── useExport.ts
│   ├── services/
│   │   └── api.ts                # Axios/fetch client with JWT + error handling
│   ├── types/
│   │   ├── emissions.ts
│   │   ├── initiatives.ts
│   │   ├── scenarios.ts
│   │   └── common.ts
│   ├── App.tsx
│   └── main.tsx
├── tests/
├── vite.config.ts
├── tsconfig.json
└── package.json

Makefile                           # run-backend, run-frontend, seed, test, lint
```

**Structure Decision**: Web application with separate `backend/` and `frontend/` directories, matching the constitution's mandatory project structure. The backend follows a layered architecture (API → Schemas → Services → Models) and the frontend uses feature-based component organisation with shared hooks and types.

**Deployment**: Local development only. Backend runs via `uvicorn` with `--reload`, frontend via `vite dev`. SQLite database file lives at `backend/macc.db`. No Docker, no containers — just two terminal processes. A `Makefile` at the repo root provides convenience targets.

## Implementation Phases

Each phase delivers a working increment that can be run locally and demonstrated. Phases are sequential — each builds on the previous.

---

### Phase 1: Foundation

**Goal**: Runnable backend + frontend skeleton with database, auth, and sample data.

| # | Deliverable | Details |
|---|-------------|---------|
| 1.1 | Backend scaffold | FastAPI app factory, health endpoint, CORS, error handling |
| 1.2 | SQLAlchemy models | All entities from data-model.md (Organisation, CompanyUnit, EmissionSource, EmissionRecord, AbatementInitiative, etc.) |
| 1.3 | Alembic migrations | Initial migration creating all tables; batch mode for SQLite |
| 1.4 | Sample data seeder | `seed_data.py` generating realistic org hierarchy, emission sources & records (based on `company_construct` / `answers_construct` patterns) |
| 1.5 | JWT auth middleware | Token validation on all endpoints; dev token generator for local testing |
| 1.6 | Frontend scaffold | Vite + React + TypeScript; app shell with sidebar nav (Emissions, MACC, Scenarios, Context, Settings — no separate AI Suggestions entry); routing to empty pages |
| 1.7 | API client | Typed fetch wrapper with JWT injection, error handling, base URL config |
| 1.8 | Dev tooling | Makefile (`run-backend`, `run-frontend`, `seed`, `test`, `lint`); Ruff, ESLint, mypy, tsconfig strict |

**Milestone**: `make run-backend` serves API on :8000, `make run-frontend` serves SPA on :5173. Health check returns OK. Sample data queryable via API.

---

### Phase 2: Emissions Browsing

**Goal**: Users can explore their emissions profile across the organisational hierarchy.

**User Stories**: US1 (View Emissions Profile), US5 (Data Integration — sample data path only)

| # | Deliverable | Details |
|---|-------------|---------|
| 2.1 | Emissions overview endpoint | `GET /api/v1/emissions/overview` — org-level summary by scope, with `market_factor_type` toggle |
| 2.2 | Hierarchy endpoint | `GET /api/v1/emissions/hierarchy` — recursive CompanyUnit tree with aggregated CO2e |
| 2.3 | Unit detail endpoint | `GET /api/v1/emissions/units/{id}` — division aggregation or site-level sources |
| 2.4 | Trends endpoint | `GET /api/v1/emissions/trends` — year-over-year by unit/scope |
| 2.5 | Sources listing | `GET /api/v1/emissions/sources` — flat list for initiative targeting |
| 2.6 | Emissions service | Aggregation logic: recursive subtree sums, scope breakdowns, question_group breakdowns, Location/Market toggle |
| 2.7 | Emissions overview page | Scope donut/bar chart, top sources table, year selector, Location/Market toggle |
| 2.8 | Hierarchy browser | Collapsible tree navigating CompanyUnit hierarchy, click-through to unit detail |
| 2.9 | Unit detail view | Scope breakdown, source table (for sites), child units (for divisions) |
| 2.10 | Trend charts | Line charts by year, filterable by scope |

**Milestone**: User can open the app, see total emissions by scope, drill into divisions → sites → individual sources, toggle Location/Market, and view trends.

---

### Phase 3: Initiatives & MACC Chart

**Goal**: Users can create initiatives and see them on an interactive MACC chart.

**User Stories**: US2 (Custom Initiatives), US7 (Lifecycle & Ownership)

| # | Deliverable | Details |
|---|-------------|---------|
| 3.1 | Initiative CRUD endpoints | Full REST API per initiatives-api.md contract (create, list, detail, update, delete) |
| 3.2 | Status transition endpoint | `PATCH /status` with state machine validation |
| 3.3 | Overlap detection endpoint | `GET /overlap` checking shared emission sources |
| 3.4 | Initiative service | CRUD, state machine, cost_per_tonne computation, overlap detection |
| 3.5 | MACC calculator service | Sort by cost_per_tonne, compute cumulative x-positions, bar dimensions |
| 3.6 | MACC chart data endpoint | `GET /scenarios/{id}/macc-data` returning pre-computed bar geometry |
| 3.7 | MACC chart component | D3-powered SVG: variable-width bars, negative-cost bars below x-axis, tooltips, hover states |
| 3.8 | Initiative form | Create/edit modal with emission source multi-select, cost fields, status, owner |
| 3.9 | Initiative list/table | Sortable, filterable by status/owner/type; links to edit |
| 3.10 | Chart interactions | Click bar → initiative detail; highlight overlaps; legend |

**Milestone**: User creates initiatives targeting specific emission sources, sees them rendered on the MACC chart ordered by cost-effectiveness, can edit/delete with instant chart updates.

> **Note**: Phase 3 delivers the initial initiative model. Phase 4b (below) refactors this to the final CapEx/OpEx model with guided cascade source selection based on post-delivery feedback.

---

### Phase 4: Context, Targets & Scenarios

**Goal**: Users can set org context, define reduction targets, build scenarios, and compare pathways.

**User Stories**: US3 (Org Context), US6 (Target Alignment), US8 (Scenarios), US10 (Data Quality)

| # | Deliverable | Details |
|---|-------------|---------|
| 4.1 | Context endpoints | `GET/PUT /api/v1/context` (upsert org profile) |
| 4.2 | Target endpoints | CRUD for emission targets per context-api.md; progress calculation |
| 4.3 | Scenario endpoints | Full REST API per scenarios-api.md (create, manage initiatives, compare, MACC data) |
| 4.4 | Target service | Projected emissions calculation, gap analysis, on-track assessment |
| 4.5 | Scenario service | Aggregate metrics, weighted cost-per-tonne, initiative reordering |
| 4.6 | Org context page | Form for industry, geography, size, commitments; persists via API |
| 4.7 | Target configuration | Create/edit targets; progress bars showing gap to target |
| 4.8 | Scenario manager | Create scenarios, add/remove initiatives, set baseline |
| 4.9 | Scenario comparison view | Side-by-side metrics table, shared/unique initiative breakdown |
| 4.10 | Target alignment overlay | On MACC page: target line overlay showing whether scenario meets targets |
| 4.11 | Data quality indicators | Quality badges on emission records/sources; filterable |

**Milestone**: User configures org context, sets 2030/2040 targets, creates "Conservative" and "Aggressive" scenarios, compares them side-by-side, and sees which meets their targets.

---

### Phase 4b: Post-Delivery Feedback Refinements

**Goal**: Refactor initiative model and form based on user testing feedback from Phase 4 delivery.

**User Stories**: US2 (refined), US7 (refined)

**Changes**: CapEx/OpEx cost model (replacing single cost), guided cascade source selection (replacing flat checklist), lifecycle cost formula, GBP currency (£) throughout, required lifespan with default 10, annual reduction rename, computed payback, yellow non-blocking warning for over-reduction.

| # | Deliverable | Details |
|---|-------------|---------|
| 4b.1 | Alembic migration | Rename columns (cost_eur → capex_gbp, annual_saving_eur → opex_annual_gbp, co2e_reduction_tonnes → co2e_reduction_annual_tonnes), backfill lifespan, recompute cost_per_tonne |
| 4b.2 | Model + schema updates | Update AbatementInitiative model, Pydantic schemas, TypeScript types |
| 4b.3 | Cascade endpoints | 5 new `GET /emissions/cascade/*` endpoints for guided source selection per emissions-api.md |
| 4b.4 | Service updates | Lifecycle cost formula, payback computation, over-reduction warning (non-blocking) |
| 4b.5 | Initiative form rework | Guided cascade selector, CapEx/OpEx fields, contextual emissions, warning banner |
| 4b.6 | MACC chart + table updates | £ currency labels, CapEx/OpEx display in tooltips/detail, updated column headers |

**Milestone**: Initiative form uses guided cascade, lifecycle cost renders on MACC chart with £ labels, payback auto-computed, yellow warning for over-reduction is non-blocking. All Phase 4 functionality preserved.

**CRITICAL**: Phase 4b must complete before Phases 5+ to avoid rework on old field names.

---

### Phase 5: AI Suggestions

**Goal**: AI generates relevant abatement suggestions accessed via the unified "New Initiative" flow on the MACC page. Users choose between manual initiative creation and AI-assisted suggestion within the same entry point. No separate AI Suggestions page exists.

**User Stories**: US4 (AI Suggestions), US9 (AI Constraints)

**UX Design Note**: The "New Initiative" button on the MACC page opens a modal/flow where the user picks either "Create manually" (existing initiative form) or "Ask AI to suggest". The AI path collects a priority mode (cost-focused or highest-impact), then shows results inline. Constraint configuration lives on the Settings page, not within the suggestion flow itself.

| # | Deliverable | Details |
|---|-------------|---------|
| 5.1 | OpenAI client | AsyncOpenAI singleton, gpt-4o-2024-08-06 pinned, structured outputs via Pydantic, retry/timeout |
| 5.2 | Suggestion service | Prompt construction from org context + emissions profile + constraints; response parsing; multi-activity breakdown logic; low-confidence fallback when constraints can't be fully met |
| 5.3 | Constraint endpoints | `GET/PUT /api/v1/ai/constraints` per ai-suggestions-api.md |
| 5.4 | Suggestion endpoints | `POST /ai/suggestions` (with `priority: cost_effective \| high_impact`), `GET` history, accept/dismiss per contract |
| 5.5 | Constraint config on Settings page | Form for excluded technologies, budget limits, scope exclusions — rendered as a section within SettingsPage.tsx |
| 5.6 | "New Initiative" AI option | Extend "New Initiative" button/modal on MACC page with "Ask AI" path; priority mode selector (cost-focused / highest-impact); loading state (5-15s) |
| 5.7 | Suggestion cards | Card per suggestion with rationale, estimates, assumptions, confidence level; accept/modify/dismiss actions; low-confidence flagging with constraint relaxation explanation |
| 5.8 | Accept flow | Accept → per-activity breakdown review (for multi-activity suggestions) → creates initiative(s) (type: ai_suggested) globally → optional scenario add |
| 5.9 | Visual distinction | AI-suggested vs manual initiatives differentiated on MACC chart and tables |

**Milestone**: User clicks "New Initiative" on MACC page, chooses "Ask AI", selects cost-focused mode, receives contextual suggestions with rationale. Accepts a multi-activity suggestion which splits into per-activity initiatives on the MACC chart, each visually distinguished as AI-generated.

---

### Phase 6: Export & Polish

**Goal**: Reporting outputs, EcoOnline sync stubs (no real integration), and UX polish.

**User Stories**: US11 (Export), US5 (sync stubs only)

| # | Deliverable | Details |
|---|-------------|---------|
| 6.1 | CSV export | Initiative table export as CSV |
| 6.2 | MACC chart export | SVG/PNG export of current chart view |
| 6.3 | Scenario report export | PDF/Excel summary with chart + metrics + target alignment |
| 6.4 | Export endpoints | Per export-sync-api.md contract |
| 6.5 | Sync endpoints | `POST /sync/emissions`, `GET /status`, `GET /history` — wired to stub EcoOnline client returning sample data |
| 6.6 | EcoOnline client stub | Rate-limited client returning sample data; matches expected API shape but no real integration. Ready to point at real endpoints if/when needed. |
| 6.7 | UX polish | Loading skeletons, empty states, error boundaries, keyboard navigation, responsive layout |
| 6.8 | Accessibility audit | WCAG 2.1 AA pass on all pages |
| 6.9 | Performance audit | API response times, chart render benchmarks, bundle size check |

**Milestone**: User can export MACC charts and data for stakeholder presentations. Sync infrastructure is stubbed and ready for real API integration if/when needed.

---

### Phase Summary

| Phase | User Stories | Key Outcome |
|-------|-------------|-------------|
| 1 — Foundation | — | Runnable app shell with sample data |
| 2 — Emissions | US1, US5 (sample) | Emissions hierarchy explorer |
| 3 — MACC | US2, US7 | Interactive MACC chart with initiative CRUD |
| 4 — Planning | US3, US6, US8, US10 | Targets, scenarios, comparison |
| 4b — Feedback | US2, US7 (refined) | CapEx/OpEx model, cascade selection, GBP, warnings |
| 5 — AI | US4, US9 | AI suggestions via "New Initiative" on MACC page; constraints on Settings |
| 6 — Export | US11, US5 (stubs) | Reporting, polish, EcoOnline sync stubs |

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design completion (data model, API contracts, quickstart).*

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Code Quality** | ✅ PASS | Layered architecture enforces single-responsibility (Models → Schemas → Services → API). Type safety via Pydantic schemas + TypeScript strict. Ruff/ESLint in quickstart. |
| **II. Testing Standards** | ✅ PASS | Test directories structured (unit/integration/contract). Contract tests planned for all 6 API contract files. ≥80% coverage target in quickstart. |
| **III. UX Consistency** | ✅ PASS | EcoOnline design patterns in all frontend components. AI suggestions accessed via "New Initiative" button on MACC page (no separate page). Loading states specified for AI suggestion requests (5-15s). Error responses are human-readable across all contracts. |
| **IV. Performance** | ✅ PASS | Data model includes composite indexes for emissions aggregation queries. MACC chart data pre-computed server-side. Pagination on all list endpoints. AI endpoint has 30s timeout. |
| **V. API Integration** | ✅ PASS | 6 API contract files defined before implementation. JWT auth on all endpoints. Rate limiting on AI (10 req/min). EcoOnline sync is stub-only (no real integration). Fault isolation: 502/504 errors for upstream failures. Sync audit trail via SyncLog entity. |
| **Quality Gates** | ✅ PASS | CI pipeline in quickstart. OpenAPI contracts serve as validation source. PR workflow documented. |

**Post-Design Gate Result**: ✅ ALL PASS — proceed to Phase 2 (task breakdown).

## Complexity Tracking

> No constitution violations found. No justifications needed.
