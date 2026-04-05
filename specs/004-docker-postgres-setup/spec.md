# Feature Specification: Docker & PostgreSQL Formalisation

**Feature Branch**: `004-docker-postgres-setup`
**Created**: 2026-03-30
**Status**: Draft
**Input**: User description: "Formalise database changes as per the new constitution and set up the application to be used in docker containers"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Starts the Application Locally (Priority: P1)

A developer clones the repository and needs to run the full MACC application (backend, frontend, and database) on their local machine. They run a single command from the repo root and all services start with no manual database setup, no SQLite files, and no external installation of PostgreSQL required.

**Why this priority**: This is the foundational developer experience. If developers cannot start the application easily, all other work is blocked. Every contributor — human or AI agent — depends on this working reliably.

**Independent Test**: Can be fully tested by cloning the repo on a clean machine with Docker installed, running the start command, and verifying the application responds on expected ports.

**Acceptance Scenarios**:

1. **Given** a freshly cloned repository with Docker installed, **When** the developer runs `docker-compose up` from the repo root, **Then** the backend (port 8000), frontend (port 5173), and PostgreSQL (port 5432) services all start and become healthy within 60 seconds
2. **Given** the application stack is running via docker-compose, **When** the developer navigates to the frontend URL, **Then** the application loads and can communicate with the backend API
3. **Given** the application stack is running via docker-compose, **When** the developer makes a code change to the backend, **Then** the change is reflected without manually rebuilding the container (via volume mount or hot-reload)
4. **Given** the application stack is running via docker-compose, **When** the developer makes a code change to the frontend, **Then** the change is reflected via hot module replacement without container restart

---

### User Story 2 - All SQLite Code Paths Are Removed (Priority: P1)

The codebase currently contains dual-dialect logic that branches behaviour depending on whether SQLite or PostgreSQL is in use. This conditional code must be removed so that all environments (dev, test, CI, production) use PostgreSQL exclusively, eliminating dialect-specific bugs and reducing code complexity.

**Why this priority**: Equal to P1 because the constitution now mandates PostgreSQL-only. Leaving SQLite fallbacks creates a compliance violation and a source of subtle bugs where tests pass on SQLite but fail on PostgreSQL (or vice versa).

**Independent Test**: Can be tested by searching the codebase for any reference to `sqlite`, `aiosqlite`, `_IS_SQLITE`, `check_same_thread`, `PRAGMA`, or `render_as_batch` and confirming zero matches in production and test code.

**Acceptance Scenarios**:

1. **Given** the updated codebase, **When** a developer searches for SQLite-specific imports, connection strings, or dialect checks, **Then** no matches are found in any Python source file (excluding migration history comments)
2. **Given** the backend database module, **When** no `DATABASE_URL` environment variable is set, **Then** the application fails to start with a clear error message indicating that `DATABASE_URL` must be configured, rather than falling back to SQLite
3. **Given** the test suite, **When** tests are run, **Then** they execute against the dedicated `test-db` PostgreSQL service, not an in-memory SQLite database, and the database is refreshed to a known state before each test run
4. **Given** the Alembic migration configuration, **When** a new migration is generated or applied, **Then** no `render_as_batch` or other SQLite-specific options are used

---

### User Story 3 - Production-Ready Docker Images (Priority: P2)

The backend and frontend each need a Dockerfile that produces a lean, reproducible container image suitable for deployment to Railway. The same images used locally must be deployable to production with only environment variable changes.

**Why this priority**: Once developers can run locally (P1) and SQLite is removed (P1), the next step is ensuring the images meet production standards — pinned base versions, minimal layers, no dev dependencies in production images.

**Independent Test**: Can be tested by building each Docker image, running it with a production-like DATABASE_URL, and verifying the service starts and responds correctly.

**Acceptance Scenarios**:

1. **Given** the backend Dockerfile, **When** the image is built, **Then** it produces a working container that starts the FastAPI application via uvicorn and connects to an external PostgreSQL database using `DATABASE_URL`
2. **Given** the frontend Dockerfile, **When** the image is built, **Then** it produces a container running nginx that serves the built React application, handles SPA routing fallback, and proxies API requests to the backend
3. **Given** either Docker image, **When** built on two different machines with the same source, **Then** the resulting images are functionally identical (deterministic builds via pinned dependencies)
4. **Given** the backend Docker image, **When** deployed to Railway with its `DATABASE_URL`, **Then** the entrypoint auto-runs `alembic upgrade head` before starting the application, and the service serves API requests without manual intervention

---

### User Story 4 - Database Migrations Run Against PostgreSQL (Priority: P2)

Alembic migrations must be verified and, where necessary, updated to work correctly against PostgreSQL. Any SQLite-specific migration options must be removed. The migration workflow must support both local docker-compose and Railway production environments.

**Why this priority**: Migrations are essential for schema management in production. They must be validated against the actual production database engine.

**Independent Test**: Can be tested by starting a fresh PostgreSQL container, running `alembic upgrade head`, verifying all tables are created, then running `alembic downgrade base` to confirm reversibility.

**Acceptance Scenarios**:

1. **Given** a fresh PostgreSQL database, **When** `alembic upgrade head` is run, **Then** all migrations apply successfully and the expected schema is created
2. **Given** existing migration files, **When** reviewed, **Then** no SQLite-specific constructs (`render_as_batch=True`, `batch_alter_table`) remain unless they are also valid for PostgreSQL
3. **Given** the Alembic env.py configuration, **When** a migration is executed, **Then** it connects using `DATABASE_URL` from the environment with no hardcoded SQLite fallback

---

### Edge Cases

- What happens when `DATABASE_URL` is not set? The application must fail fast at startup with a clear error message — no silent fallback.
- What happens when `DATABASE_URL` uses the `postgres://` scheme (as Railway provides)? The connection string must be automatically normalised to `postgresql+asyncpg://`.
- What happens when docker-compose is run but Docker is not installed? A clear error from the OS; no custom handling needed.
- What happens when the PostgreSQL container is not yet healthy when the backend starts? The backend must handle connection retries or docker-compose must enforce service dependency ordering with health checks.
- What happens when a developer runs tests outside of Docker? Tests must still connect to a PostgreSQL instance (either docker-compose test service or a locally running PostgreSQL); the test suite must not silently fall back to SQLite.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST contain a `docker-compose.yml` at the root defining backend, frontend, and PostgreSQL services
- **FR-002**: The `docker-compose.yml` MUST allow the full application to be started with a single `docker-compose up` command
- **FR-003**: The backend MUST have a single `Dockerfile` with multi-stage build targets: a `dev` stage (used by docker-compose with volume mounts and hot-reload) and a `prod` stage (default target, used by Railway, with baked-in code and uvicorn entrypoint)
- **FR-004**: The frontend MUST have a single `Dockerfile` with multi-stage build targets: a `dev` stage (used by docker-compose with volume mounts and Vite HMR) and a `prod` stage (default target, used by Railway, with built assets served via nginx)
- **FR-004a**: The frontend production stage MUST include an nginx configuration that handles SPA client-side routing fallback (`try_files`) and proxies `/api/*` requests to the backend service. The backend address MUST be templated via `envsubst` using a `BACKEND_URL` environment variable (defaulting to `backend:8000` for docker-compose); the frontend Dockerfile entrypoint MUST run `envsubst` on the nginx config template before starting nginx
- **FR-005**: All SQLite-specific code MUST be removed from `backend/src/models/database.py`, including `_DEFAULT_DB`, `_IS_SQLITE`, SQLite pragma listeners, and `check_same_thread` connect args
- **FR-006**: The `backend/src/models/database.py` module MUST require `DATABASE_URL` to be set as an environment variable and MUST fail with a clear error if it is absent
- **FR-007**: The `DATABASE_URL` normalisation logic (converting `postgres://` to `postgresql+asyncpg://`) MUST be retained for Railway compatibility
- **FR-008**: The test fixture in `backend/tests/conftest.py` MUST be updated to use the dedicated `test-db` PostgreSQL service instead of in-memory SQLite
- **FR-009**: Alembic `env.py` MUST be updated to remove `render_as_batch` and other SQLite-specific branching
- **FR-010**: The `alembic.ini` default `sqlalchemy.url` MUST NOT reference SQLite
- **FR-011**: A `backend/.env.example` file MUST be committed to the repository containing docker-compose-appropriate PostgreSQL connection strings and required environment variable names. The actual `backend/.env` MUST be added to `.gitignore` to prevent credential leaks
- **FR-012**: Dockerfiles MUST pin base image versions (e.g., `python:3.11-slim@sha256:...` or at minimum `python:3.11-slim`)
- **FR-013**: The backend Docker image MUST use deterministic dependency installation (pinned `requirements.txt`)
- **FR-014**: The frontend Docker image MUST use a lock file (`package-lock.json`) for deterministic installs
- **FR-015**: The `docker-compose.yml` MUST configure PostgreSQL health checks so the backend does not attempt to connect before the database is ready
- **FR-016**: The `aiosqlite` dependency MUST be removed from `backend/requirements.txt` and `backend/pyproject.toml`
- **FR-017**: The docker-compose environment MUST support backend hot-reload for development (source code mounted as a volume)
- **FR-018**: The docker-compose environment MUST support frontend hot module replacement for development
- **FR-019**: The Makefile MUST be updated to use docker-compose commands where appropriate (e.g., `make migrate` runs inside the backend container)
- **FR-020**: The `.specify/memory/architecture.md` file MUST be updated to reflect the new PostgreSQL + Docker architecture
- **FR-021**: The `docker-compose.yml` MUST define a dedicated `test-db` service (separate from the dev `db` service) running PostgreSQL on a different port, with its own volume, for test execution
- **FR-022**: The test suite MUST refresh the test database to a known state using: (1) drop and recreate all tables once per test session via `Base.metadata.drop_all` / `Base.metadata.create_all`, and (2) transaction rollback per individual test function to guarantee isolation and repeatability
- **FR-023**: The backend container entrypoint MUST auto-run `alembic upgrade head` in production only (detected via a Railway-specific environment variable such as `RAILWAY_ENVIRONMENT`); in local development, migrations MUST be applied explicitly via `make migrate`. If the migration fails, the entrypoint MUST exit with a non-zero status code, preventing uvicorn from starting
- **FR-024**: The Makefile `migrate` target MUST run `alembic upgrade head` inside the backend container via `docker-compose exec`
- **FR-025**: The Makefile `seed` target MUST run `seed_data.py` inside the backend container via `docker-compose exec`, targeting only the local dev `db` service; it MUST NOT be capable of reaching the production database
- **FR-026**: The developer quickstart documentation MUST document the post-setup workflow: `docker-compose up`, then `make migrate`, then `make seed`
- **FR-027**: The `docker-compose.yml` MUST use `target: dev` for both backend and frontend services to select the development stage; Railway MUST build the default `prod` stage (no target override)
- **FR-028**: The Vite dev server proxy target in `frontend/vite.config.ts` MUST be updated from `http://localhost:8000` to `http://backend:8000` to use docker-compose service name DNS resolution

### Key Entities

- **Docker Compose Service: backend** — Python FastAPI application; depends on the PostgreSQL service; source code volume-mounted for dev hot-reload; exposes port 8000
- **Docker Compose Service: frontend** — React/Vite application; source code volume-mounted for dev HMR; exposes port 5173
- **Docker Compose Service: db** — PostgreSQL 15+ instance; data persisted via a named Docker volume; exposes port 5432 for local tooling access; health check configured
- **Docker Compose Service: test-db** — Dedicated PostgreSQL instance for test execution; separate port and volume from dev `db`; refreshed to a known state before each test run; health check configured
- **Environment Configuration** — `DATABASE_URL` is the sole database connection parameter; passed to backend via docker-compose environment section; provided by Railway in production. `TEST_DATABASE_URL` points to the `test-db` service for test runs

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer with Docker installed can clone the repo and have the full application running within 5 minutes using a single command
- **SC-002**: Zero SQLite references remain in production or test source code (verified by automated grep)
- **SC-003**: All existing tests pass when executed against PostgreSQL
- **SC-004**: Backend and frontend Docker images build successfully and start without errors
- **SC-005**: The application deployed to Railway from the Docker images connects to its managed PostgreSQL and serves requests without modification
- **SC-006**: Alembic migrations apply cleanly to a fresh PostgreSQL database with no warnings or errors
- **SC-007**: Local development supports hot-reload for both backend and frontend without requiring container rebuilds

## Clarifications

### Session 2026-03-31

- Q: How should the test database be provisioned and managed? → A: A dedicated `test-db` service in docker-compose (separate port, own volume); the test database MUST be refreshed to a known state before each test run
- Q: Should Alembic migrations auto-run on container start? → A: Auto-migrate in production only (detect via `RAILWAY_ENVIRONMENT` env var); locally require explicit `make migrate`
- Q: What should serve the frontend in the production Docker container? → A: nginx (alpine) — serves built static assets with SPA routing fallback and API proxy config; free and open-source (BSD-2-Clause)
- Q: How should developers seed the database in the Docker setup? → A: Explicit `make seed` running inside the backend container via docker-compose exec; targets only the local dev `db` service; documented in quickstart alongside `make migrate`
- Q: Should each service have one Dockerfile or separate dev/prod files? → A: Single Dockerfile per service with multi-stage targets (`dev` and `prod`); docker-compose uses `target: dev`; Railway builds default `prod` stage
- Q: How should the Vite dev proxy target be configured inside Docker? → A: Change to `http://backend:8000` using the docker-compose service name; Docker DNS resolves it automatically; all development runs inside Docker
- Q: What should happen if the production auto-migration fails at container start? → A: Entrypoint exits with non-zero status; uvicorn does not start; Railway keeps previous deployment running (fail fast)
- Q: What test database isolation strategy should conftest.py use? → A: Drop/create schema per test session + transaction rollback per test function; gives fast per-test isolation with a clean schema at session start
- Q: How should the nginx config resolve the backend address across environments? → A: Use `envsubst` at container start to template `$BACKEND_URL`; defaults to `backend:8000` for docker-compose; Railway provides its internal backend URL
- Q: Should .env files be committed or gitignored? → A: Commit `backend/.env.example` with docker-compose defaults; gitignore `backend/.env` to prevent credential leaks

## Assumptions

- Docker and Docker Compose are available on all developer machines (standard tooling for the team)
- Railway provides a managed PostgreSQL database with a `DATABASE_URL` environment variable
- The existing Alembic migrations are functionally compatible with PostgreSQL (they were written with async SQLAlchemy which generates dialect-neutral DDL for the operations used)
- No existing data in SQLite needs to be migrated — production is already on PostgreSQL via Railway
- The test suite can connect to a PostgreSQL instance started by docker-compose without specialised test orchestration
- Frontend production serving will use nginx (alpine) inside the Docker container, with SPA routing fallback and API proxy configuration

## Dependencies

- **Docker Engine** — required on developer machines; minimum version supporting Compose V2
- **Railway Platform** — production hosting; provides managed PostgreSQL and `DATABASE_URL` injection
- **asyncpg** — already in `requirements.txt`; replaces `aiosqlite` as the sole async database driver
- **Constitution v1.6.0** — this feature implements Principle VIII (Dev/Prod Parity & Containerisation)

## Out of Scope

- CI/CD pipeline changes (GitHub Actions workflows) — will be addressed in a follow-up feature
- Database backup and restore procedures for Railway PostgreSQL
- Kubernetes or other orchestration beyond docker-compose
- Custom health check endpoints in the backend API (docker-compose uses process-level checks)
