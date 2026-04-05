# Tasks: Docker & PostgreSQL Formalisation

**Input**: Design documents from `/specs/004-docker-postgres-setup/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/docker-services.md, quickstart.md

**Tests**: No explicit TDD or test-writing requirements in the spec. Existing tests are reconfigured (conftest.py) as part of User Story 2. Verification tasks are included in User Story 4.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create Docker ignore files, environment template, and gitignore updates that all subsequent phases depend on

- [X] T001 Create backend Docker ignore file at `backend/.dockerignore` excluding `.venv/`, `__pycache__/`, `tests/`, `*.pyc`, `.git/`, `*.egg-info/`
- [X] T002 [P] Create frontend Docker ignore file at `frontend/.dockerignore` excluding `node_modules/`, `dist/`, `.git/`, `test-results/`, `playwright-report/`
- [X] T003 [P] Create `backend/.env.example` with `DATABASE_URL=postgresql+asyncpg://macc:macc@db:5432/macc` and `TEST_DATABASE_URL=postgresql+asyncpg://macc:macc@test-db:5433/macc_test`
- [X] T004 [P] Add `backend/.env` entry to `.gitignore` to prevent credential leaks

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create docker-compose.yml — the central orchestration file that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create `docker-compose.yml` at repo root defining four services (`backend`, `frontend`, `db`, `test-db`), two named volumes (`pgdata`, `pgdata-test`), PostgreSQL health checks (`pg_isready`), `depends_on` with `condition: service_healthy`, environment variables per contracts/docker-services.md, and `target: dev` for backend and frontend build stages

**Checkpoint**: docker-compose.yml exists — user story implementation can now begin

---

## Phase 3: User Story 1 — Developer Starts the Application Locally (Priority: P1) 🎯

**Goal**: A developer clones the repo and runs `docker-compose up` to start the full stack (backend, frontend, db) with hot-reload — no manual database setup or external PostgreSQL required

**Independent Test**: Clone repo on clean machine with Docker, run `docker-compose up`, verify backend responds on `:8000`, frontend loads on `:5173`, and code changes trigger hot-reload

### Implementation for User Story 1

- [X] T006 [US1] Create `backend/Dockerfile` with a `dev` stage: base `python:3.11-slim`, working dir `/app`, copy `requirements.txt` first, `pip install --no-cache-dir -r requirements.txt`, CMD `uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000`; leave a `prod` stage placeholder (completed in US3)
- [X] T007 [P] [US1] Create `frontend/Dockerfile` with a `dev` stage: base `node:20-alpine`, working dir `/app`, copy `package.json` and `package-lock.json`, `npm ci`, CMD `npm run dev -- --host 0.0.0.0`; leave a `prod` stage placeholder (completed in US3)
- [X] T008 [P] [US1] Update `frontend/vite.config.ts` proxy target from `http://localhost:8000` to `http://backend:8000` for docker-compose service DNS resolution (FR-028)
- [X] T009 [US1] Update `Makefile` to add `up`, `down`, `build`, `logs` docker-compose targets and change `migrate` to `docker-compose exec backend alembic upgrade head`, `seed` to `docker-compose exec backend python seed_data.py`; keep `lint` running locally without Docker

**Checkpoint**: `docker-compose up` starts all services; backend hot-reloads on code changes; frontend HMR works; `make migrate` and `make seed` run inside containers

---

## Phase 4: User Story 2 — All SQLite Code Paths Are Removed (Priority: P1) 🎯

**Goal**: Remove all SQLite-specific code so every environment (dev, test, CI, production) uses PostgreSQL exclusively; `DATABASE_URL` is required or the app fails fast

**Independent Test**: `grep -rn "sqlite\|aiosqlite\|_IS_SQLITE\|check_same_thread\|PRAGMA\|render_as_batch" backend/src backend/tests backend/alembic/env.py` returns zero matches

### Implementation for User Story 2

- [X] T010 [US2] Modify `backend/src/models/database.py`: remove `_DEFAULT_DB` SQLite URL, `_IS_SQLITE` flag, `check_same_thread` connect args, `_set_sqlite_pragmas()` listener; require `DATABASE_URL` env var or raise `RuntimeError("DATABASE_URL environment variable is required")`; retain `postgres://` → `postgresql+asyncpg://` normalisation logic
- [X] T011 [P] [US2] Remove `aiosqlite` line from `backend/requirements.txt`
- [X] T012 [P] [US2] Remove `aiosqlite` dependency from `backend/pyproject.toml`
- [X] T013 [US2] Modify `backend/alembic/env.py`: remove `is_sqlite` detection and `render_as_batch=is_sqlite` branching; hardcode `render_as_batch=False` for all future migrations
- [X] T014 [P] [US2] Update `backend/alembic.ini`: remove SQLite default `sqlalchemy.url`; add comment directing developers to set `DATABASE_URL` env var
- [X] T015 [US2] Rewrite `backend/tests/conftest.py` to use `TEST_DATABASE_URL` (defaulting to `postgresql+asyncpg://macc:macc@localhost:5433/macc_test`): session-scoped engine fixture with `Base.metadata.drop_all` / `Base.metadata.create_all`, per-test `AsyncSession` with transaction rollback for isolation

**Checkpoint**: Zero SQLite references in codebase; app fails fast without `DATABASE_URL`; test suite connects to PostgreSQL `test-db` service

---

## Phase 5: User Story 3 — Production-Ready Docker Images (Priority: P2)

**Goal**: Backend and frontend Dockerfiles produce lean, reproducible container images deployable to Railway with only environment variable changes

**Independent Test**: Build each Docker image, run with a production-like `DATABASE_URL`, verify the service starts and serves requests

### Implementation for User Story 3

- [X] T016 [US3] Add `prod` stage to `backend/Dockerfile`: copy source code into image, create non-root user, set `ENTRYPOINT ["./entrypoint.sh"]` — image must be the default build target (last stage)
- [X] T017 [US3] Create `backend/entrypoint.sh`: if `RAILWAY_ENVIRONMENT` is set, run `alembic upgrade head` (exit non-zero on failure, preventing uvicorn from starting); then exec `uvicorn src.api.main:app --host 0.0.0.0 --port ${PORT:-8000}`; make executable (`chmod +x`)
- [X] T018 [P] [US3] Add `prod` stage to `frontend/Dockerfile`: build stage with `npm ci && npm run build`, then `nginx:alpine` stage copying built assets to `/usr/share/nginx/html`, copy nginx config template, entrypoint runs `envsubst` on template then starts `nginx -g 'daemon off;'`
- [X] T019 [P] [US3] Create `frontend/nginx.conf` as a template file: `server` block listening on port 80, `location /` with `try_files $uri $uri/ /index.html` for SPA routing, `location /api/` with `proxy_pass http://$BACKEND_URL` and proxy headers; `BACKEND_URL` defaults to `backend:8000` via `envsubst` at container start

**Checkpoint**: `docker build backend/` and `docker build frontend/` produce working production images; backend auto-migrates on Railway; frontend proxies API via nginx

---

## Phase 6: User Story 4 — Database Migrations Run Against PostgreSQL (Priority: P2)

**Goal**: Alembic migrations are verified to work correctly against PostgreSQL; no SQLite-specific constructs remain; migration workflow supports both docker-compose and Railway

**Independent Test**: Start fresh PostgreSQL via docker-compose, run `alembic upgrade head`, verify all tables created, run `alembic downgrade base` to confirm reversibility

### Implementation for User Story 4

- [X] T020 [US4] Review all migration files in `backend/alembic/versions/` and verify `batch_alter_table` usage is valid for PostgreSQL (per research.md: Alembic batch ops translate to standard ALTER TABLE on PostgreSQL — no changes expected; document findings as a comment in each file if needed)
- [X] T021 [US4] Run `docker-compose up db -d`, then `docker-compose exec backend alembic upgrade head` against a fresh PostgreSQL to verify all migrations apply cleanly; then run `alembic downgrade base` to verify reversibility

**Checkpoint**: Migrations apply and downgrade cleanly on PostgreSQL; no SQLite-specific constructs in migration config

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation updates and end-to-end validation across all user stories

- [X] T022 [P] Update `.specify/memory/architecture.md` to reflect PostgreSQL + Docker architecture (Constitution Principle VIII implemented)
- [X] T023 Validate full developer quickstart workflow end-to-end: `docker-compose up` → wait for healthy → `make migrate` → `make seed` → verify frontend loads on `:5173` and backend API responds on `:8000/docs`
- [X] T024 [P] Run SQLite grep verification: `grep -rn "sqlite\|aiosqlite\|_IS_SQLITE\|check_same_thread\|PRAGMA" backend/src backend/tests` confirms zero matches in production and test code

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001–T004) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 (docker-compose.yml must exist)
- **US2 (Phase 4)**: Depends on Phase 2 (needs db and test-db services running)
- **US3 (Phase 5)**: Depends on Phase 3 (dev-stage Dockerfiles must exist to add prod stages)
- **US4 (Phase 6)**: Depends on Phase 4 (SQLite removal in alembic must be done first)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only — no other story dependencies
- **US2 (P1)**: Depends on Foundational only — independent of US1 but benefits from running after US1 so the Docker environment is available for testing changes
- **US3 (P2)**: Depends on US1 — extends dev-stage Dockerfiles with prod stages
- **US4 (P2)**: Depends on US2 — verifies alembic changes made in US2

### Recommended Execution Order

```
Phase 1 (T001–T004)  →  Phase 2 (T005)
                            │
                    ┌───────┴───────┐
                    ▼               ▼
              Phase 3 (US1)   Phase 4 (US2)
              T006–T009       T010–T015
                    │               │
                    ▼               ▼
              Phase 5 (US3)   Phase 6 (US4)
              T016–T019       T020–T021
                    │               │
                    └───────┬───────┘
                            ▼
                      Phase 7 (Polish)
                      T022–T024
```

### Parallel Opportunities

**Phase 1** — All setup tasks (T001–T004) can run in parallel

**Phase 3 (US1)** — T007 and T008 can run in parallel with each other (different files); T006 is independent but the Dockerfiles are conceptually paired

**Phase 4 (US2)** — T011, T012, T014 can run in parallel (independent file edits); T010 and T013 should run before T015 (conftest.py depends on database.py being updated)

**Phase 5 (US3)** — T018 and T019 can run in parallel with each other (frontend files); T16 and T17 are sequential (entrypoint.sh referenced by Dockerfile)

**Cross-story** — US1 and US2 can run in parallel after Phase 2 if capacity allows

---

## Implementation Strategy

### MVP Scope

**MVP = Phase 1 + Phase 2 + Phase 3 (US1)**

This delivers the core developer experience: `docker-compose up` starts the full stack with hot-reload. Developers can work immediately. SQLite code still exists but is unused since docker-compose provides PostgreSQL.

### Incremental Delivery

1. **Increment 1** (MVP): Setup + Foundational + US1 → developers can run the app in Docker
2. **Increment 2**: US2 → SQLite code removed, PostgreSQL-only, tests use test-db
3. **Increment 3**: US3 → production Docker images ready for Railway deployment
4. **Increment 4**: US4 + Polish → migrations verified, docs updated, end-to-end validation

Each increment is stable and independently deployable.
