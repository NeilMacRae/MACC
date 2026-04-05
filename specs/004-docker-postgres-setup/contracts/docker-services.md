# Contract: Docker Compose Services

**Feature**: 004-docker-postgres-setup
**Date**: 31 March 2026

## docker-compose.yml Service Contract

This document defines the expected service interfaces for the `docker-compose.yml` file. These are the contracts that implementation must satisfy.

---

### Service: `backend`

| Property | Contract |
|----------|----------|
| Build context | `./backend` |
| Dockerfile | `./backend/Dockerfile` |
| Build target | `dev` |
| Exposed port | `8000:8000` |
| Depends on | `db` (condition: `service_healthy`) |
| Environment | `DATABASE_URL=postgresql+asyncpg://macc:macc@db:5432/macc` |
| Volumes (dev) | `./backend/src:/app/src` (source code for hot-reload) |
| Restart policy | None (dev) |

**Startup behaviour**: In dev mode, starts `uvicorn` with `--reload` flag. Does NOT auto-run migrations (explicit `make migrate` required for local dev).

---

### Service: `frontend`

| Property | Contract |
|----------|----------|
| Build context | `./frontend` |
| Dockerfile | `./frontend/Dockerfile` |
| Build target | `dev` |
| Exposed port | `5173:5173` |
| Depends on | `backend` |
| Volumes (dev) | `./frontend/src:/app/src` (source code for HMR) |
| Restart policy | None (dev) |

**Startup behaviour**: In dev mode, starts Vite dev server with `--host 0.0.0.0`. API requests proxied to `http://backend:8000` via Vite proxy config.

---

### Service: `db`

| Property | Contract |
|----------|----------|
| Image | `postgres:15-alpine` |
| Exposed port | `5432:5432` |
| Environment | `POSTGRES_DB=macc`, `POSTGRES_USER=macc`, `POSTGRES_PASSWORD=macc` |
| Volume | `pgdata:/var/lib/postgresql/data` |
| Health check | `pg_isready -U macc -d macc` (interval: 5s, timeout: 5s, retries: 5) |

**Data persistence**: Data persists across `docker-compose down` via named volume. Use `docker-compose down -v` to reset.

---

### Service: `test-db`

| Property | Contract |
|----------|----------|
| Image | `postgres:15-alpine` |
| Exposed port | `5433:5432` |
| Environment | `POSTGRES_DB=macc_test`, `POSTGRES_USER=macc`, `POSTGRES_PASSWORD=macc` |
| Volume | `pgdata-test:/var/lib/postgresql/data` |
| Health check | `pg_isready -U macc -d macc_test` (interval: 5s, timeout: 5s, retries: 5) |

**Isolation**: Completely separate from the dev `db` service. Different port, different database name, different volume. Test suite connects via `TEST_DATABASE_URL`.

---

### Volumes

| Volume | Used by | Purpose |
|--------|---------|---------|
| `pgdata` | `db` | Persist development database data |
| `pgdata-test` | `test-db` | Persist test database data |

---

## Makefile Target Contract

| Target | Command | Description |
|--------|---------|-------------|
| `up` | `docker-compose up` | Start full stack |
| `down` | `docker-compose down` | Stop full stack |
| `build` | `docker-compose build` | Rebuild images |
| `logs` | `docker-compose logs -f` | Follow all service logs |
| `migrate` | `docker-compose exec backend alembic upgrade head` | Run migrations in backend container |
| `seed` | `docker-compose exec backend python seed_data.py` | Seed dev database (local only) |
| `test` | `docker-compose exec backend pytest` + frontend tests | Run full test suite |
| `lint` | Direct execution (no Docker) | Linting doesn't need DB access |

---

## Backend Dockerfile Stage Contract

### Stage: `dev`

| Property | Value |
|----------|-------|
| Base | `python:3.11-slim` |
| Working dir | `/app` |
| Deps install | `pip install --no-cache-dir -r requirements.txt` |
| CMD | `uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000` |
| Expectation | Source code volume-mounted; changes trigger reload |

### Stage: `prod` (default)

| Property | Value |
|----------|-------|
| Base | `python:3.11-slim` |
| Working dir | `/app` |
| Deps install | `pip install --no-cache-dir -r requirements.txt` |
| Source | Copied into image (baked) |
| User | Non-root |
| ENTRYPOINT | `entrypoint.sh` |
| Expectation | Auto-migrates if `RAILWAY_ENVIRONMENT` set; exits non-zero on migration failure (uvicorn does not start); starts uvicorn on `$PORT` |

---

## Frontend Dockerfile Stage Contract

### Stage: `dev`

| Property | Value |
|----------|-------|
| Base | `node:20-alpine` |
| Working dir | `/app` |
| Deps install | `npm ci` |
| CMD | `npm run dev -- --host 0.0.0.0` |
| Expectation | Source code volume-mounted; Vite HMR active |

### Stage: `prod` (default)

| Property | Value |
|----------|-------|
| Build base | `node:20-alpine` (build assets) |
| Serve base | `nginx:alpine` |
| Assets | Copied from build stage to `/usr/share/nginx/html` |
| Config | Custom `nginx.conf.template` with SPA fallback + API proxy; `$BACKEND_URL` templated via `envsubst` |
| Entrypoint | `envsubst` on nginx config template, then `nginx -g 'daemon off;'` |
| Environment | `BACKEND_URL` (defaults to `backend:8000`) |
| Port | 80 |

---

## nginx.conf Contract

**Note**: The nginx config is a template (`nginx.conf.template`). At container start, `envsubst` substitutes `$BACKEND_URL` before nginx starts. Default: `backend:8000`.

| Route | Behaviour |
|-------|-----------|
| `GET /` | Serve `index.html` |
| `GET /any/spa/route` | `try_files $uri $uri/ /index.html` (SPA fallback) |
| `* /api/*` | `proxy_pass` to `http://$BACKEND_URL` (templated) |
| Static assets | Served directly from `/usr/share/nginx/html` with caching headers |
