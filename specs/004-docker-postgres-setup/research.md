# Research: Docker & PostgreSQL Formalisation

**Feature**: 004-docker-postgres-setup
**Date**: 31 March 2026
**Status**: Complete

## Research Task 1: Docker Multi-Stage Builds for Python/FastAPI Backend

### Decision: Single Dockerfile with `dev` and `prod` stage targets

### Rationale
Multi-stage builds allow a single Dockerfile to serve both development (with volume mounts, hot-reload) and production (baked-in code, minimal image). The `dev` stage includes development tooling and uses `uvicorn --reload`; the `prod` stage copies only production dependencies and source code.

### Alternatives Considered
- **Separate Dockerfiles** (`Dockerfile.dev`, `Dockerfile.prod`): Rejected — leads to configuration drift between environments; Constitution Principle VIII requires dev/prod parity
- **Single-stage with conditional entrypoint**: Rejected — results in bloated production image with dev dependencies

### Best Practices Applied
- Base image: `python:3.11-slim` (pinned version per FR-012)
- Use `--no-cache-dir` with pip to reduce layer size
- Copy `requirements.txt` first, install deps, then copy source — maximises layer caching
- Dev stage: working directory with volume mount point, `uvicorn --reload --host 0.0.0.0`
- Prod stage: `FROM` the base stage, copy only production code, non-root user, `entrypoint.sh` that conditionally runs `alembic upgrade head`
- Use `.dockerignore` to exclude `.venv/`, `__pycache__/`, `tests/`, `.git/`

### Implementation Notes
- Dev stage target: `docker-compose` uses `target: dev` and mounts `./backend/src` as a volume
- Prod stage target: Railway builds the default (last) stage; no `target` override needed
- Production entrypoint checks `RAILWAY_ENVIRONMENT` env var to decide whether to auto-migrate (FR-023)

---

## Research Task 2: Docker Multi-Stage Builds for React/Vite Frontend

### Decision: Single Dockerfile with `dev` and `prod` stage targets; nginx serves prod

### Rationale
The dev stage runs `vite` with HMR for instant feedback during development. The prod stage builds static assets with `vite build`, then copies them into an `nginx:alpine` image for serving. This ensures the production image is tiny (~25MB) and serves assets efficiently.

### Alternatives Considered
- **Node.js serving in production** (e.g., `serve`, `express`): Rejected — nginx is more performant for static assets, handles SPA routing natively, and is the constitution-mandated choice
- **CDN-only deployment**: Rejected — MACC needs API proxying; nginx handles both static serving and `/api/*` proxying in production

### Best Practices Applied
- Build stage: `node:20-alpine` (pinned), install deps with `npm ci` (deterministic from lock file per FR-014)
- Prod stage: `nginx:alpine` (pinned), copy built assets from build stage
- Dev stage: `node:20-alpine`, working directory with volume mount, `npm run dev -- --host 0.0.0.0`
- Use `.dockerignore` to exclude `node_modules/`, `dist/`, `.git/`

### Implementation Notes
- Dev stage: docker-compose mounts `./frontend/src` and uses `target: dev`; Vite HMR via WebSocket on port 5173
- Prod stage: nginx listens on port 80, serves `/` from built assets, `try_files` for SPA routing, `proxy_pass` for `/api/*` to backend
- Vite dev server proxy config (`/api` → `http://backend:8000`) works inside docker-compose network using service names

---

## Research Task 3: nginx Configuration for SPA + API Proxy

### Decision: Custom `nginx.conf` with `try_files` fallback and `/api/` upstream proxy

### Rationale
Single-page applications require all non-file requests to be served `index.html` so client-side routing works. API requests must be proxied to the backend service. nginx handles both efficiently in a single config.

### Configuration Pattern
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Alternatives Considered
- **Caddy**: Simpler config but less common in production; nginx is the constitution-specified choice
- **Traefik**: Over-engineered for a single-service proxy; better suited for dynamic service discovery

### Implementation Notes
- In docker-compose (dev mode), the frontend runs Vite directly — nginx.conf is only used in the prod stage
- The nginx config uses `$BACKEND_URL` as a template variable; the frontend Dockerfile entrypoint runs `envsubst` to substitute it before starting nginx
- `BACKEND_URL` defaults to `backend:8000` for docker-compose; Railway provides its internal backend URL as this variable
- The Vite dev proxy target is changed to `http://backend:8000` to use docker-compose service name DNS resolution (FR-028)

---

## Research Task 4: docker-compose with PostgreSQL Health Checks

### Decision: Use `pg_isready` health check with `depends_on: condition: service_healthy`

### Rationale
PostgreSQL containers take a few seconds to initialise. Without health checks, the backend may attempt to connect before the database is ready, causing startup failures. `pg_isready` is the official PostgreSQL readiness probe.

### Configuration Pattern
```yaml
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: macc
      POSTGRES_USER: macc
      POSTGRES_PASSWORD: macc
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U macc -d macc"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    depends_on:
      db:
        condition: service_healthy
```

### Alternatives Considered
- **Connection retry in application code**: Rejected — adds complexity to database.py; health checks are the Docker-native solution
- **`sleep` in entrypoint**: Rejected — brittle; arbitrary delays waste time or may not be long enough

### Implementation Notes
- Both `db` and `test-db` services need health checks
- `test-db` uses a different port (e.g., 5433) and separate volume to isolate from dev data

---

## Research Task 5: pytest Fixtures with PostgreSQL (Test Isolation)

### Decision: Session-scoped schema drop/create + per-test transaction rollback with `test-db` PostgreSQL service

### Rationale
The current conftest.py creates an in-memory SQLite database per test. The replacement must use the `test-db` PostgreSQL service and ensure test isolation. The chosen strategy drops and recreates all tables once per test session (via `Base.metadata.drop_all` / `Base.metadata.create_all`), then wraps each individual test function in a transaction that is rolled back after the test. This provides fast per-test isolation with a clean schema at session start.

### Pattern
```python
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "postgresql+asyncpg://macc:macc@localhost:5433/macc_test")

@pytest.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest.fixture
async def db_session(test_engine):
    async with AsyncSession(test_engine) as session:
        async with session.begin():
            yield session
            await session.rollback()
```

### Alternatives Considered
- **Schema drop/create per individual test**: Simpler but slower — rejected in favour of session-scoped schema with per-test rollback
- **Transaction rollback only (no schema recreation)**: Fastest but assumes schema already exists — rejected because it fails on first run or after schema changes
- **Alembic migrations in tests**: Rejected — too slow; direct `metadata.create_all` is sufficient for test schema setup
- **Shared database with cleanup**: Rejected — risk of test pollution; violates Constitution Principle II (test independence)

### Implementation Notes
- `TEST_DATABASE_URL` defaults to `postgresql+asyncpg://macc:macc@localhost:5433/macc_test` matching the `test-db` docker-compose service
- Schema is created fresh via `Base.metadata.create_all` (same approach as current SQLite tests, just different engine)
- Tests that run outside Docker must have a PostgreSQL instance available on port 5433

---

## Research Task 6: Removing SQLite Code from Codebase

### Decision: Remove all SQLite-specific code; fail fast if `DATABASE_URL` not set

### Rationale
Constitution Principle VIII mandates: "Code MUST NOT contain SQLite-specific branches, fallback connection strings, or conditional logic that switches behaviour based on database dialect." All SQLite artifacts must be removed, not just left conditional.

### Current SQLite Code Inventory

| File | SQLite Code | Action |
|------|-------------|--------|
| `database.py` | `_DEFAULT_DB` SQLite URL (L11), `_IS_SQLITE` flag (L22), `check_same_thread` connect args (L33), `_set_sqlite_pragmas()` listener (L44-51) | Remove all; `DATABASE_URL` required or raise `RuntimeError` |
| `conftest.py` | `sqlite+aiosqlite:///:memory:` (L25) | Replace with `TEST_DATABASE_URL` PostgreSQL connection |
| `alembic/env.py` | `is_sqlite` detection (L28, L41), `render_as_batch=is_sqlite` (L35, L47) | Remove detection; hardcode `render_as_batch=False` |
| `alembic.ini` | `sqlalchemy.url = sqlite+aiosqlite:///./macc.db` (L105) | Remove or replace with PostgreSQL placeholder |
| `requirements.txt` | `aiosqlite==0.22.1` | Remove |
| `pyproject.toml` | `aiosqlite>=0.20` in dependencies | Remove |

### Migration Files (batch_alter_table)
The existing migration files use `batch_alter_table()` which was generated because `render_as_batch=True` was set for SQLite. These migrations **remain valid for PostgreSQL** — Alembic's batch mode operations translate to standard ALTER TABLE statements on PostgreSQL. No migration file changes are needed. Future migrations generated with `render_as_batch=False` will use direct operations.

### Implementation Notes
- `database.py` simplification: read `DATABASE_URL` from env, normalise `postgres://` → `postgresql+asyncpg://`, create engine — no branching
- Clear error message when `DATABASE_URL` missing: `RuntimeError("DATABASE_URL environment variable is required")`

---

## Research Task 7: Railway Deployment with Docker

### Decision: Railway builds the default (prod) Dockerfile stage; `DATABASE_URL` injected by platform

### Rationale
Railway auto-detects Dockerfiles and builds them. By making the `prod` stage the default (last stage or unnamed), Railway builds production images without any configuration. `DATABASE_URL` is automatically injected as an environment variable when a PostgreSQL plugin is attached.

### Key Facts
- Railway provides `DATABASE_URL` in `postgres://` format — the normalisation logic in database.py converts this to `postgresql+asyncpg://`
- Railway builds the default Dockerfile target (no `--target` flag) — the prod stage must be the default
- Railway sets `RAILWAY_ENVIRONMENT` env var — used to detect production for auto-migration (FR-023)
- Railway exposes services via `PORT` env var — uvicorn must bind to `0.0.0.0:$PORT`

### Alternatives Considered
- **Railway Nixpacks (buildpack)**: Rejected — Dockerfiles give full control over build steps and match local dev exactly
- **Separate Railway config per service**: Already the case — backend and frontend deploy as separate Railway services

### Implementation Notes
- Backend entrypoint.sh: if `RAILWAY_ENVIRONMENT` is set, run `alembic upgrade head` before starting uvicorn
- Frontend nginx: in production, the `/api/` proxy target needs to be the Railway internal URL of the backend service, not `backend:8000` (docker-compose network name); use `envsubst` to template the nginx config at container start
- Both services must respect Railway's `PORT` env var

---

## Research Task 8: Makefile Updates for Docker Workflow

### Decision: Wrap existing targets with `docker-compose exec` where they need container context

### Rationale
The Makefile currently runs commands directly against the local `.venv` and localhost. With Docker, database-dependent commands (migrate, seed, test) must execute inside the backend container where `DATABASE_URL` is set and the database is reachable.

### Updated Targets
| Target | Current | New |
|--------|---------|-----|
| `migrate` | `cd backend && alembic upgrade head` | `docker-compose exec backend alembic upgrade head` |
| `seed` | `cd backend && python seed_data.py` | `docker-compose exec backend python seed_data.py` |
| `test` | `cd backend && pytest` + `cd frontend && npm test` | `docker-compose exec backend pytest` + `docker-compose exec frontend npm test` |
| `run-backend` | `cd backend && uvicorn ...` | Replaced by `docker-compose up` |
| `run-frontend` | `cd frontend && npm run dev` | Replaced by `docker-compose up` |
| `lint` | Direct execution | Can remain local (no DB dependency) |
| `dev-token` | Direct execution | Can remain local (no DB dependency) |

### New Targets
| Target | Command |
|--------|---------|
| `up` | `docker-compose up` |
| `down` | `docker-compose down` |
| `build` | `docker-compose build` |
| `logs` | `docker-compose logs -f` |

### Implementation Notes
- Linting targets (`lint`, `format`) can remain outside Docker — they don't need database access
- `make up` is the new primary dev command, replacing separate `run-backend` and `run-frontend`
