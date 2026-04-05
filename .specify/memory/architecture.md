# MACC Application Architecture

> **Purpose**: This document describes the current architecture of the
> MACC (Marginal Abatement Cost Curve) application. It is the primary
> reference for AI development agents and human contributors who need
> to locate code, understand data flow, and determine where changes
> should be made.
>
> **Last updated**: 2026-04-05

---

## 1. System Overview

MACC is a stand-alone carbon emissions modelling application. It lets
organisations visualise their emission profile, model abatement
initiatives on a Marginal Abatement Cost Curve, build scenarios for
comparison, and request AI-generated reduction suggestions.

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (React 18)                   │
│  Vite dev server :5173 → proxies /api/* to backend :8000    │
│  TanStack Query v5 · React Router v6 · Tailwind CSS        │
├─────────────────────────────────────────────────────────────┤
│                       Backend (FastAPI)                     │
│  uvicorn :8000 · async SQLAlchemy · Pydantic v2             │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL 15 (asyncpg)  │  Anthropic API (claude-sonnet-4-6)   │
├─────────────────────────────────────────────────────────────┤
│           Docker Compose (local dev) / Railway (prod)       │
└─────────────────────────────────────────────────────────────┘
```

**Key architectural decisions**:

- Backend and frontend are **fully decoupled**; the only contract is
  the REST API surface under `/api/v1/`.
- The frontend Vite dev server proxies `/api/*` requests to the
  backend — there is no shared process.
- **PostgreSQL 15** is the sole data store (asyncpg driver). SQLite has
  been fully removed. `DATABASE_URL` is required or the app fails fast.
- Local dev uses **docker-compose** with four services: `backend`,
  `frontend`, `db` (port 5432), `test-db` (port 5433).
- Production runs on **Railway** — the backend `entrypoint.sh`
  auto-runs `alembic upgrade head` when `RAILWAY_ENVIRONMENT` is set.
- AI features call the Anthropic API directly; there is no LLM
  abstraction layer.

---

## 2. Repository Layout

```
MACC/
├── docker-compose.yml         # Full stack: backend, frontend, db, test-db
├── Makefile                   # Convenience targets (see §10)
├── backend/
│   ├── Dockerfile             # Multi-stage: dev (hot-reload) + prod (Railway)
│   ├── entrypoint.sh          # Prod entrypoint: auto-migrate + uvicorn
│   ├── .env.example           # Docker-compose env defaults (committed)
│   ├── pyproject.toml         # Python deps & project metadata
│   ├── alembic.ini            # DB migration config (DATABASE_URL required)
│   ├── alembic/
│   │   ├── env.py             # Migration runner (async PostgreSQL)
│   │   └── versions/          # Migration scripts (4 migrations)
│   ├── src/
│   │   ├── api/               # FastAPI routers & middleware
│   │   │   ├── main.py        # App factory, CORS, router mounts
│   │   │   ├── auth.py        # JWT token verification
│   │   │   ├── deps.py        # DI: db_session, current_organisation
│   │   │   ├── context.py     # Org context & targets endpoints
│   │   │   ├── emissions.py   # Emissions data endpoints
│   │   │   ├── initiatives.py # Initiative CRUD + MACC chart
│   │   │   └── scenarios.py   # Scenario CRUD + comparison
│   │   │   └── suggestions.py # AI suggestion endpoints
│   │   ├── models/            # SQLAlchemy ORM models
│   │   │   ├── database.py    # Engine, session factory, helpers
│   │   │   ├── organisation.py
│   │   │   ├── context.py     # OrganisationalContext + EmissionTarget
│   │   │   ├── emissions.py   # CompanyUnit, EmissionSource, EmissionRecord
│   │   │   ├── initiative.py  # AbatementInitiative + link tables
│   │   │   ├── scenario.py    # Scenario + ScenarioInitiative
│   │   │   └── sync.py        # SyncLog, AI models (config, requests, suggestions)
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   │   ├── context.py
│   │   │   ├── emissions.py
│   │   │   ├── initiatives.py
│   │   │   ├── scenarios.py
│   │   │   └── suggestions.py
│   │   ├── services/          # Business logic layer
│   │   │   ├── emissions_service.py
│   │   │   ├── initiative_service.py
│   │   │   ├── macc_calculator.py
│   │   │   ├── scenario_service.py
│   │   │   ├── suggestion_service.py
│   │   │   └── target_service.py
│   │   └── integrations/
│   │       └── openai_client.py   # Anthropic Claude client (legacy name)
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── contract/
│   ├── seed_data.py           # Demo data seeder
│   ├── dev_token.py           # Generate dev JWT tokens
│   └── smoke_test.py          # Quick API health check
├── frontend/
│   ├── Dockerfile             # Multi-stage: dev (Vite HMR) + prod (nginx)
│   ├── nginx.conf             # Prod nginx config: SPA routing + /api proxy
│   ├── package.json
│   ├── vite.config.ts         # Dev server + /api proxy
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── main.tsx           # React entry, QueryClientProvider
│   │   ├── App.tsx            # Router + layout
│   │   ├── pages/             # Route-level components
│   │   │   ├── EmissionsPage.tsx
│   │   │   ├── MACCPage.tsx
│   │   │   ├── ScenariosPage.tsx
│   │   │   └── ContextPage.tsx
│   │   ├── components/        # Reusable UI components
│   │   │   ├── common/        # Shared: modals, buttons, loaders
│   │   │   ├── context/       # Org context forms
│   │   │   ├── emissions/     # Emission views & charts
│   │   │   ├── initiatives/   # Initiative forms & tables
│   │   │   ├── layout/        # Shell, sidebar, navigation
│   │   │   ├── macc/          # MACC chart (SVG)
│   │   │   ├── scenarios/     # Scenario cards & comparison
│   │   │   ├── suggestions/   # AI suggestion wizard
│   │   │   └── targets/       # Target forms & progress
│   │   ├── hooks/             # TanStack Query hooks
│   │   │   ├── useEmissions.ts
│   │   │   ├── useEmissionsCascade.ts
│   │   │   ├── useInitiatives.ts
│   │   │   ├── useScenarios.ts
│   │   │   └── useSuggestions.ts
│   │   ├── services/
│   │   │   └── api.ts         # HTTP client, auth, error handling
│   │   └── types/             # TypeScript interfaces
│   │       ├── common.ts
│   │       ├── emissions.ts
│   │       ├── initiatives.ts
│   │       ├── scenarios.ts
│   │       └── suggestions.ts
│   └── tests/                 # Vitest unit/component tests
└── specs/                     # Feature specifications
    └── 001-macc-modelling/
```

---

## 3. Backend Architecture

### 3.1 Request Flow

```
HTTP request
  → FastAPI (CORS middleware)
  → JWT auth (deps.py: get_current_organisation)
  → Router handler (api/*.py)
  → Service layer (services/*.py)
  → SQLAlchemy ORM (models/*.py)
  → PostgreSQL 15 (asyncpg)
  → Pydantic response schema
  → JSON response
```

### 3.2 API Surface

All endpoints are mounted under `/api/v1/`. Authentication is via
`Authorization: Bearer <JWT>` header on every request.

#### System

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/health` | Health check + DB connectivity |
| GET | `/api/v1/info` | App metadata |

#### Emissions (`api/emissions.py`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/emissions/overview` | Org-wide emissions (by scope, question group, top sources) |
| GET | `/api/v1/emissions/hierarchy` | Company-unit tree with aggregated CO₂e |
| GET | `/api/v1/emissions/units/{unit_id}` | Detailed emissions for one company unit |
| GET | `/api/v1/emissions/trends` | Year-over-year emission trends |
| GET | `/api/v1/emissions/sources` | Filterable list of emission sources |
| GET | `/api/v1/emissions/cascade/scopes` | Cascade step 1: distinct scopes |
| GET | `/api/v1/emissions/cascade/question-groups` | Cascade step 2: question groups for scope |
| GET | `/api/v1/emissions/cascade/questions` | Cascade step 3: questions for scope + group |
| GET | `/api/v1/emissions/cascade/activities` | Cascade step 4: activities |
| GET | `/api/v1/emissions/cascade/company-units` | Cascade step 5: company units with source ID |

#### Initiatives (`api/initiatives.py`)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/initiatives` | Create initiative |
| GET | `/api/v1/initiatives` | List (paginated, filterable, sortable) |
| GET | `/api/v1/initiatives/macc-data` | MACC chart bar geometry + summary |
| POST | `/api/v1/initiatives/validate-feasibility` | Bulk feasibility validation |
| GET | `/api/v1/initiatives/{id}` | Initiative detail |
| PUT | `/api/v1/initiatives/{id}` | Full update |
| DELETE | `/api/v1/initiatives/{id}` | Delete (409 if in_progress) |
| PATCH | `/api/v1/initiatives/{id}/status` | Status transition |
| GET | `/api/v1/initiatives/{id}/overlaps` | Overlap detection |

#### Context & Targets (`api/context.py`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/context` | Get organisational context |
| PUT | `/api/v1/context` | Upsert organisational context |
| GET | `/api/v1/context/targets` | List emission targets |
| POST | `/api/v1/context/targets` | Create target |
| PUT | `/api/v1/context/targets/{id}` | Update target |
| DELETE | `/api/v1/context/targets/{id}` | Delete target |
| GET | `/api/v1/context/targets/progress` | Target progress (with scenario) |

#### Scenarios (`api/scenarios.py`)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/scenarios` | Create scenario |
| GET | `/api/v1/scenarios` | List with computed metrics |
| GET | `/api/v1/scenarios/compare` | Compare 2–5 scenarios |
| GET | `/api/v1/scenarios/{id}` | Detail + initiatives + target alignment |
| PUT | `/api/v1/scenarios/{id}` | Update metadata |
| DELETE | `/api/v1/scenarios/{id}` | Delete scenario |
| POST | `/api/v1/scenarios/{id}/initiatives` | Add initiatives |
| DELETE | `/api/v1/scenarios/{id}/initiatives/{init_id}` | Remove initiative |
| PATCH | `/api/v1/scenarios/{id}/initiatives/reorder` | Reorder initiatives |
| GET | `/api/v1/scenarios/{id}/macc-data` | Scenario-scoped MACC chart |

#### AI Suggestions (`api/suggestions.py`)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/suggestions/generate` | Request AI-generated suggestions |
| GET | `/api/v1/suggestions/requests` | List suggestion request history |
| GET | `/api/v1/suggestions/requests/{id}` | Request detail |
| POST | `/api/v1/suggestions/{id}/accept` | Accept → create initiative(s) |
| POST | `/api/v1/suggestions/{id}/dismiss` | Dismiss suggestion |
| GET | `/api/v1/suggestions/constraints` | Get AI constraint config |
| PUT | `/api/v1/suggestions/constraints` | Upsert AI constraint config |

### 3.3 Authentication & Authorisation

- **Mechanism**: JWT (HS256) via `python-jose`
- **Secret**: `JWT_SECRET` env var (default: dev-only insecure key)
- **Token payload**: `sub` (user), `organisation_id`, `iat`, `exp`
- **Dependency**: `get_current_organisation` in `deps.py` decodes the
  token, looks up the `Organisation` by `organisation_id` claim, and
  injects it into route handlers. All data queries are scoped by this
  organisation — there is no cross-tenant access.

### 3.4 Service Layer

Each service module encapsulates business logic for one domain area.
Services receive a SQLAlchemy `AsyncSession` and return Pydantic
schemas or raise HTTP exceptions.

| Service | File | Responsibility |
|---------|------|----------------|
| **EmissionsService** | `services/emissions_service.py` | Aggregation, hierarchy tree building, trends, cascade drill-down |
| **InitiativeService** | `services/initiative_service.py` | CRUD, status state machine, derived field computation, overlap detection |
| **MACCCalculator** | `services/macc_calculator.py` | Bar geometry for MACC chart (sorted by cost_per_tonne ascending) |
| **ScenarioService** | `services/scenario_service.py` | CRUD, initiative management within scenarios, comparison, target alignment |
| **TargetService** | `services/target_service.py` | Target CRUD, progress calculation against baseline scenario |
| **SuggestionService** | `services/suggestion_service.py` | AI prompt construction, Anthropic API calls, caching, accept/dismiss flow |

**Key business rules**:

- **Initiative derived fields**:
  - `cost_per_tonne = (capex + (opex × lifespan)) / (reduction × lifespan)`
  - `payback_period_years = capex / |opex|` (only when opex < 0)
- **MACC chart**: Bars sorted by `cost_per_tonne` ascending (negative-
  cost bars appear on the left); x-axis = cumulative CO₂e reduction
- **Status state machine**: `idea → planned → approved → in_progress
  → completed` (plus `rejected` from any non-terminal state)
- **Baseline scenario**: At most one per organisation; setting a new
  baseline auto-unsets any previous one
- **AI suggestion caching**: SHA-256 hash of input → 24-hour TTL in
  `ai_suggestion_requests` table

### 3.5 Data Model (Entity Relationships)

```
Organisation
 ├── 1:1  OrganisationalContext
 │         └── 1:*  EmissionTarget
 ├── 1:*  CompanyUnit
 │         └── 1:*  EmissionSource
 │                   └── 1:*  EmissionRecord
 ├── 1:*  AbatementInitiative  ←*:*→  EmissionSource
 ├── 1:*  Scenario             ←*:*→  AbatementInitiative
 ├── 1:1  AIConstraintConfig
 ├── 1:*  AISuggestionRequest
 │         └── 1:*  AISuggestion  →  AbatementInitiative (on accept)
 └── 1:*  SyncLog
```

**Core tables** (11 tables + 2 link tables):

| Table | Model | Key Columns |
|-------|-------|-------------|
| `organisations` | `Organisation` | id, name, ecoonline_org_id |
| `company_units` | `CompanyUnit` | id, organisation_id, ecoonline_unit_id, name, unit_type (division/site), parent_company_unit_id |
| `emission_sources` | `EmissionSource` | id, company_unit_id, ecoonline_source_id, question_group, question, activity, scope |
| `emission_records` | `EmissionRecord` | id, emission_source_id, year, month, scope, co2e_kg, data_quality |
| `organisational_contexts` | `OrganisationalContext` | id, organisation_id (unique), industry_sector, annual_revenue_gbp, budget_constraint_gbp, sustainability_maturity |
| `emission_targets` | `EmissionTarget` | id, context_id, target_year, target_type (absolute/intensity), target_value_pct, baseline_year |
| `abatement_initiatives` | `AbatementInitiative` | id, organisation_id, name, source (custom/ai_suggested), status, capex_gbp, opex_annual_gbp, co2e_reduction_annual_tonnes, cost_per_tonne_co2e, lifespan_years |
| `initiative_emission_sources` | `InitiativeEmissionSource` | initiative_id, emission_source_id (composite PK) |
| `scenarios` | `Scenario` | id, organisation_id, name, is_baseline |
| `scenario_initiatives` | `ScenarioInitiative` | scenario_id, initiative_id, display_order, is_included |
| `ai_constraint_configs` | `AIConstraintConfig` | id, organisation_id (unique), excluded_technologies, max_initiative_cost_gbp |
| `ai_suggestion_requests` | `AISuggestionRequest` | id, organisation_id, input_hash, status |
| `ai_suggestions` | `AISuggestion` | id, request_id, suggestion_data (JSON), accepted (bool nullable) |
| `sync_logs` | `SyncLog` | id, organisation_id, entity_type, status |

### 3.6 Database & Migrations

- **Engine**: async SQLite via `aiosqlite` with WAL mode, foreign
  keys enabled, 5 s busy timeout, 64 MB cache
- **Migration tool**: Alembic (async, batch mode for SQLite ALTER
  TABLE support)
- **Migration chain**:
  1. `bed8bead71a0` — Initial schema (all 11+ tables)
  2. `a3f7c2d8e1b5` — Rename initiative fields EUR → GBP
  3. `c1d2e3f4a5b6` — Rename context fields EUR → GBP

### 3.7 AI Integration

- **Client**: Anthropic SDK (`anthropic` Python package) — file is
  `integrations/openai_client.py` (legacy name retained)
- **Model**: `claude-sonnet-4-6` (pinned per Constitution
  Principle VI; validated at import time)
- **Prompt format**: XML-delimited sections (`<emissions_profile>`,
  `<organisational_context>`, `<constraints>`,
  `<request_parameters>`)
- **Structured output**: JSON schema appended to user message;
  response parsed into Pydantic models
- **Caching**: In-memory dict (24 h TTL) + DB-level hash-based cache
  in `ai_suggestion_requests`
- **Error handling**: Exponential backoff on 429/5xx via `httpx`
  retry transport

---

## 4. Frontend Architecture

### 4.1 Technology Stack

| Concern | Library |
|---------|---------|
| UI framework | React 18 (functional components, hooks) |
| Routing | react-router-dom v6 |
| Server state | TanStack Query v5 (30 s staleTime, retry: 1) |
| Styling | Tailwind CSS 3.4 |
| Charts | D3 scales + custom SVG (MACC chart) |
| Tooltips | @floating-ui/react |
| Build | Vite 5.4 |
| Type checking | TypeScript 5.6 (strict mode) |
| Testing | Vitest 2.1 + React Testing Library 16 |

### 4.2 Routing

| Path | Page Component | Purpose |
|------|---------------|---------|
| `/` | Redirect → `/emissions` | Default |
| `/emissions` | `EmissionsPage` | Emissions profile explorer (overview, hierarchy, trends tabs) |
| `/macc` | `MACCPage` | MACC chart + initiative CRUD |
| `/scenarios` | `ScenariosPage` | Scenario modelling & side-by-side comparison |
| `/context` | `ContextPage` | Organisational profile + emission targets |
| `/settings` | Placeholder | "Coming soon" |
| `*` | Redirect → `/emissions` | Fallback |

Layout: `AppLayout` shell with persistent sidebar navigation.

### 4.3 Data Flow

```
Page component
  → Custom hook (useEmissions, useInitiatives, etc.)
  → TanStack Query (useQuery / useMutation)
  → api.ts HTTP client (fetch + auth header)
  → Vite proxy → Backend API
  → JSON response
  → TanStack Query cache
  → Re-render
```

**Query key factory pattern**: Each hook module defines a `keys`
object for consistent cache invalidation. Mutations invalidate
related query keys on success.

### 4.4 API Client (`services/api.ts`)

- **Base URL**: `VITE_API_BASE_URL` env var (default:
  `http://localhost:8000`)
- **Auth**: `VITE_DEV_TOKEN` env var or `localStorage.getItem
  ("auth_token")` → `Authorization: Bearer <token>`
- **Content-Type**: Always `application/json`
- **Error handling**: Custom `ApiError` class with `status`,
  `statusText`, `data`; parses JSON error bodies
- **204 handling**: Returns `undefined` for No Content responses

### 4.5 Component Organisation

```
components/
├── common/       Shared UI primitives (Modal, Button, LoadingSpinner,
│                 ErrorBanner, EmptyState, etc.)
├── layout/       AppLayout shell, Sidebar, TopBar
├── emissions/    EmissionsOverview, HierarchyTree, UnitDetail,
│                 TrendChart
├── initiatives/  InitiativeTable, InitiativeForm, InitiativeDetail,
│                 StatusBadge
├── macc/         MACCChart (interactive SVG), MACCTooltip, MACCSummary
├── scenarios/    ScenarioCard, ScenarioGrid, ComparisonPanel,
│                 ScenarioManageModal
├── suggestions/  SuggestionWizard, SuggestionCard, ConstraintsForm
├── context/      ContextForm (org profile editor)
└── targets/      TargetList, TargetForm, TargetProgress
```

### 4.6 Key Page Layouts

**EmissionsPage**: Three-tab layout (Overview | Hierarchy | Trends).
Overview shows aggregated emissions by scope and question group.
Hierarchy uses a split pane — tree browser (60%) + unit detail panel
(40%). Year selector and market/location toggle in toolbar.

**MACCPage**: Two-pane layout. Top: interactive SVG MACC chart
(click a bar to select). Bottom: initiative table (60%) + detail side
panel (40%). "+ New Initiative" button opens a choice modal (manual
entry vs. AI-generated). AI path: constraint config →
SuggestionWizard → accept/dismiss flow.

**ScenariosPage**: Grid of ScenarioCards showing computed metrics
(total capex, total reduction, residual emissions). Multi-select for
comparison (2+ selected triggers ComparisonPanel). Create and manage
modals for scenario lifecycle.

**ContextPage**: Org profile form (industry, revenue, maturity, etc.)
with upsert-on-save. Below: target list with add/edit/delete modals
and progress visualisation per target.

### 4.7 Custom Hooks

| Hook | Queries | Mutations |
|------|---------|-----------|
| `useEmissions` | overview, hierarchy, unitDetail, trends, sources | — |
| `useEmissionsCascade` | scopes → questionGroups → questions → activities → companyUnits (progressive drill-down, each enabled when parent selected) | — |
| `useInitiatives` | list (paginated), detail, overlaps, maccData | create, update, delete, updateStatus, validateFeasibility |
| `useScenarios` | list, detail, scenarioMacc, compare | create, update, delete, addInitiatives, removeInitiative, reorderInitiatives |
| `useSuggestions` | requestHistory, requestDetail, constraints | generate, accept, dismiss, updateConstraints |

---

## 5. Cross-Cutting Concerns

### 5.1 Error Handling

- **Backend**: Global exception handler catches unhandled errors →
  500 JSON. Service-level errors raise `HTTPException` with
  appropriate status codes. AI integration uses exponential backoff.
- **Frontend**: `ApiError` class wraps fetch failures. TanStack Query
  `retry: 1` for transient failures. Components show `ErrorBanner`
  for query errors and toast-style feedback for mutation failures.

### 5.2 Type Safety

- **Backend**: Pydantic v2 schemas with `from_attributes = True` for
  ORM ↔ schema conversion. `mypy` enforced via CI.
- **Frontend**: TypeScript strict mode. Types in `src/types/` mirror
  backend schemas. `tsc --noEmit` enforced via CI.

### 5.3 Environment Variables

| Variable | Where | Default | Purpose |
|----------|-------|---------|---------|
| `DATABASE_URL` | Backend | `sqlite+aiosqlite:///./macc.db` | DB connection |
| `JWT_SECRET` | Backend | Dev-only insecure key | Token signing |
| `ANTHROPIC_API_KEY` | Backend | *(required)* | AI API access |
| `ANTHROPIC_MODEL` | Backend | `claude-sonnet-4-6` | Pinned AI model |
| `CORS_ORIGINS` | Backend | `http://localhost:5173` | Allowed origins |
| `VITE_API_BASE_URL` | Frontend | `http://localhost:8000` | API base URL |
| `VITE_DEV_TOKEN` | Frontend | *(none)* | Dev JWT for local use |

---

## 6. Build, Run & Test

### 6.1 Makefile Targets

| Target | What it does |
|--------|-------------|
| `make run-backend` | Start uvicorn with hot-reload on :8000 (loads `.env`) |
| `make run-frontend` | Start Vite dev server on :5173 |
| `make seed` | Run `seed_data.py` to populate demo data |
| `make migrate` | Run `alembic upgrade head` |
| `make test` | Run pytest (backend) + vitest (frontend) |
| `make lint` | ruff + mypy (backend) + eslint + prettier + tsc (frontend) |
| `make dev-token` | Generate a development JWT token |

### 6.2 Dependencies

**Backend** (`pyproject.toml`): Python ≥ 3.11, FastAPI ≥ 0.115,
SQLAlchemy[asyncio] ≥ 2.0, aiosqlite ≥ 0.20, Pydantic ≥ 2.8,
anthropic ≥ 0.40, Alembic ≥ 1.13, python-jose, httpx, pytest,
pytest-asyncio, pytest-cov, ruff, mypy.

**Frontend** (`package.json`): React 18.3, react-router-dom 6.26,
@tanstack/react-query 5.59, d3-array 3.2, d3-scale 4.0,
@floating-ui/react 0.27, Vite 5.4, TypeScript 5.6, Tailwind 3.4,
Vitest 2.1, @testing-library/react 16, ESLint 9, Prettier 3.

### 6.3 Dev Server Proxy

Vite is configured (`vite.config.ts`) to proxy all `/api` requests
to `http://localhost:8000` with `changeOrigin: true`. This means the
frontend and backend can be developed independently — the frontend
never calls the backend directly by port.

---

## 7. Where to Make Changes — Quick Reference

| I need to… | Look here |
|------------|-----------|
| Add a new API endpoint | `backend/src/api/<domain>.py` (router) + `backend/src/schemas/<domain>.py` (request/response) |
| Add business logic | `backend/src/services/<domain>_service.py` |
| Change the data model | `backend/src/models/<domain>.py` + new Alembic migration |
| Update AI prompts | `backend/src/services/suggestion_service.py` |
| Change AI model config | `backend/src/integrations/openai_client.py` (requires constitution amendment) |
| Add a new page | `frontend/src/pages/` + route in `App.tsx` |
| Add a UI component | `frontend/src/components/<domain>/` |
| Add data fetching | `frontend/src/hooks/use<Domain>.ts` + types in `frontend/src/types/<domain>.ts` |
| Update API client | `frontend/src/services/api.ts` |
| Add a DB migration | `cd backend && alembic revision --autogenerate -m "description"` |
| Seed test data | `backend/seed_data.py` |
| Add backend tests | `backend/tests/{unit,integration,contract}/` |
| Add frontend tests | `frontend/tests/` |
| Add E2E regression tests | `frontend/e2e/` (Playwright — see Constitution §II) |
