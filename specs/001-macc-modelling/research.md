# Research: Marginal Abatement Cost Curve Modelling

**Feature**: 001-macc-modelling | **Date**: 2026-02-28

## R1: MACC Chart Rendering

### Decision: D3.js (selective imports) + React SVG

### Rationale
A MACC chart requires **variable-width bars** (width = abatement volume, height = cost/tonne) — this is not a standard chart type. Evaluated Recharts, D3, Nivo, Victory, and Chart.js. Only D3 provides full control over per-bar width and x-positioning without fighting the library's layout engine.

### Alternatives Considered
| Library | Variable-width bars | Bundle (gzip) | Verdict |
|---------|:---:|:---:|---------|
| Recharts | ❌ Uniform only | 132 kB | Bar layout assumes uniform widths |
| **D3 (selective)** | ✅ Full control | **15–20 kB** | Natural fit; math-only imports |
| Nivo | ❌ Uniform only | ~50 kB | Layout model baked to uniform bars |
| Victory | ⚠️ Partial | 105 kB | `barWidth` function exists but x-positioning is category-based |
| Chart.js | ❌ Uniform only | 67 kB | Canvas-based; rigid bar-width model |

### Approach
- Import only `d3-scale` + `d3-array` (~15–20 kB gzipped)
- Use D3 for math (linear scales, domains, tick computation)
- Render SVG elements (`<rect>`, `<text>`, `<line>`) directly in React JSX
- Compute cumulative x-positions from sorted initiative data
- Negative-cost bars extend below the x-axis baseline
- Add `@floating-ui/react` (~3 kB) for tooltips
- Use `framer-motion` for transitions if animation is needed later

---

## R2: SQLAlchemy Async + SQLite Architecture

### Decision: SQLAlchemy 2.x async with aiosqlite, WAL mode, self-referential CompanyUnit tree

### Rationale
SQLAlchemy 2.x with aiosqlite provides async compatibility for FastAPI with minimal overhead. WAL mode enables concurrent readers (important for dashboard-style queries) while serialising writes (acceptable for a single-tenant MACC tool with user-initiated writes).

### Key Configuration
- **WAL mode + foreign keys enabled via connection event** (`PRAGMA journal_mode=WAL`, `PRAGMA foreign_keys=ON`, `PRAGMA busy_timeout=5000`)
- **`expire_on_commit=False`** to prevent implicit lazy-loads in async context
- **`selectinload`** strategy for N+1 prevention (one `SELECT ... WHERE id IN (...)` per relationship level)

### Hierarchy Pattern: Self-referential `CompanyUnit` tree (aligned with `company_construct`)

**Updated**: Based on the actual `company_construct` schema from the EcoOnline analytics database, the hierarchy is **not** a fixed 3-level structure. It uses a self-referential `immediate_parent_id` pattern with variable depth (observed 2–5 levels in production data). Node types are `division` (organisational grouping) or `site` (physical location).

The original research recommended separate tables for a fixed 3-level hierarchy, but this was based on an assumption that has been corrected by inspecting the real schema. The `CompanyUnit` table mirrors `company_construct` fields directly (company_unit_id, company_unit_name, company_unit_type, immediate_parent_id, facility_type, geographic fields, financial year config, open/close dates) to simplify sync and maintain a single source of truth.

Key implications:
- Use `selectinload` with recursive CTE queries for subtree aggregation
- `level_1`, `level_2`, `level_3` are denormalised convenience fields (not authoritative for tree structure)
- Closed units (`close_date` in past) should be filtered from active emissions views
- Root detection: `immediate_parent_id IS NULL`

### Migration Strategy: Alembic with batch mode
- `render_as_batch=True` handles SQLite's limited `ALTER TABLE` support (only `ADD COLUMN` and `RENAME TABLE`)
- Named constraints via SQLAlchemy naming conventions for proper batch mode operation
- Async Alembic via `async_engine_from_config`

### Performance
- Composite indexes for common aggregation queries (`emission_source_id + year + month`, `scope + year + market_factor_type`)
- `selectinload` chains for full hierarchy loading in 3 queries
- `PRAGMA cache_size = -64000` (64MB) for larger datasets

### Concurrency
- WAL mode: readers don't block writers, writers don't block readers
- Write serialisation is acceptable for single-tenant, user-initiated writes
- Bulk imports should use single transactions to minimise lock overhead
- Migration to PostgreSQL later is straightforward (change connection string + driver)

### Testing
- In-memory SQLite (`sqlite+aiosqlite://`) for fast, ephemeral test databases
- Transaction-per-test pattern with rollback for isolation
- `pytest-asyncio` with `asyncio_mode = "auto"`

---

## R3: AI Suggestion Architecture

### Decision: OpenAI Structured Outputs (`text_format`) via Responses API with Pydantic schemas

### Rationale
Structured Outputs guarantees the response conforms to a Pydantic schema — no manual JSON parsing, no schema validation failures. This is the correct API for generating structured content (vs function calling which is for tool invocation).

### Alternatives Considered
| Approach | Schema Guarantee | Complexity |
|----------|:---:|:---:|
| **Structured Outputs** | ✅ Guaranteed | Low |
| JSON mode | ❌ Valid JSON only | Medium |
| Function calling | ✅ With strict | Higher — fake tool |
| Raw text + regex | ❌ None | Highest |

### Architecture
- **`AsyncOpenAI` singleton** with `max_retries=3` (built-in exponential backoff for 429/5xx)
- **Model**: `gpt-4o-2024-08-06` pinned snapshot for determinism
- **Non-streaming**: need complete validated response before persisting
- **Two-layer validation**: schema adherence (automatic) + business rules (manual — check target sources exist, constraints respected, estimates plausible)
- **Content-hash caching** in SQLite to avoid redundant API calls when inputs haven't changed (TTL: 24h)
- **Refusal handling**: check `refusal` field on message content

### Cost & Latency Estimates
| Metric | Estimate |
|--------|----------|
| Input tokens | ~4,000–6,000 |
| Output tokens | ~1,500–2,500 |
| Cost per request | ~$0.02–0.05 |
| Latency | 8–20 seconds |

Well within the 60-second success criterion (SC-005).

### Prompt Design
- `developer` role for system instructions (higher authority)
- XML-delimited data sections (`<emissions_profile>`, `<organisational_context>`, `<constraints>`)
- `reasoning` field in schema forces chain-of-thought analysis before suggestions
- Static prefix enables OpenAI's automatic prompt caching (~50% input token discount)

### Testing
- Mock at `AsyncOpenAI` client level (not HTTP level)
- Fixtures return typed `SuggestionsResponse` objects
- Validator tested separately with pure unit tests (no mocking needed)

---

## R4: EcoOnline Integration

### Decision: Dedicated API client with rate limiting, backoff, and fault isolation

### Rationale
Constitution Principle V (API Integration & Segmentation) mandates: rate limiting, exponential backoff, fault isolation, correlation ID logging, and reference-by-ID-only data boundaries.

### Approach
- **`ecoonline_client.py`**: async HTTP client (httpx) wrapping EcoOnline API calls
- **Rate limiting**: `asyncio.Semaphore` for concurrent request limiting + token bucket for rate limiting
- **Exponential backoff**: retry on 429/5xx with jitter
- **Fault isolation**: catch all integration errors; return cached/stale data with warnings instead of crashing
- **Correlation IDs**: UUID per request flow, propagated in headers and logged
- **Data mapping**: EcoOnline entities mapped to MACC's internal models at the integration boundary (no EcoOnline-specific types leak into the service layer)

### Assumptions
- EcoOnline provides REST endpoints for:
  - `GET /api/organisations/{id}/hierarchy` — org tree
  - `GET /api/assessments/{id}/results` — emissions data
- Authentication via existing org credentials (JWT forwarded or API key)
- Rate limits TBD — implement conservative defaults (10 req/s, 5 concurrent)

---

## R5: Frontend Architecture

### Decision: React 18+ with TypeScript strict, Vite, TanStack Query, and EcoOnline-matched design

### Rationale
Constitution mandates React 18+ / TypeScript strict / EcoOnline design patterns. TanStack Query provides robust server-state management with caching, background refetching, and optimistic updates — well-suited for a data-heavy dashboard application.

### Key Libraries
| Library | Purpose | Bundle |
|---------|---------|--------|
| TanStack Query v5 | Server state / caching | ~12 kB |
| React Router v7 | Client-side routing | ~14 kB |
| d3-scale + d3-array | MACC chart math | ~15–20 kB |
| @floating-ui/react | Tooltips | ~3 kB |
| Zustand | Local UI state (if needed) | ~1 kB |

### Design System
Based on EcoOnline screenshots:
- Sidebar navigation with collapsible sections
- Blue primary color (#4F46E5 or similar indigo)
- Clean white/gray backgrounds
- Data tables with action buttons
- Form controls matching existing patterns
- CSS modules or Tailwind for styling (no heavy UI library needed — matching existing EcoOnline is simpler with custom components)

### Export
- CSV/Excel: generate client-side using `xlsx` library or server-side via `openpyxl`
- Chart PNG: SVG-to-canvas using `html-to-image` library
- PDF: server-side generation via `weasyprint` or `reportlab` if needed

---

## Summary: All Unknowns Resolved

| Unknown | Resolution |
|---------|------------|
| MACC chart library | D3.js selective imports + React SVG |
| Database async pattern | SQLAlchemy 2.x + aiosqlite + WAL mode |
| Hierarchy model | Self-referential CompanyUnit tree (variable depth) |
| Migration approach | Alembic batch mode for SQLite |
| AI suggestion API | OpenAI Structured Outputs via Responses API |
| AI response parsing | Pydantic schemas + business rule validator |
| EcoOnline integration | Dedicated async client with rate limiting + fault isolation |
| Frontend state | TanStack Query for server state |
| Design system | Custom components matching EcoOnline patterns |
| Export approach | Client-side CSV + SVG-to-PNG; server-side for complex reports |
