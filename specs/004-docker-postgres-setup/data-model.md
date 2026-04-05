# Data Model: Docker & PostgreSQL Formalisation

**Feature**: 004-docker-postgres-setup
**Date**: 31 March 2026
**Status**: Complete

## Overview

This feature introduces no new database entities. The data model changes are subtractive (removing SQLite support) and infrastructural (Docker service topology and configuration). This document describes the service topology, configuration model, and file-level changes.

## Service Topology

```
┌──────────────────────────────────────────────────────────┐
│                    docker-compose.yml                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────┐  │
│  │   frontend   │    │   backend    │    │     db      │  │
│  │  (Vite dev)  │    │  (uvicorn)   │───▶│ PostgreSQL  │  │
│  │   :5173      │───▶│   :8000      │    │  15-alpine  │  │
│  │              │    │              │    │   :5432     │  │
│  └─────────────┘    └──────────────┘    └────────────┘  │
│                            │                             │
│                            │ (tests)                     │
│                            ▼                             │
│                     ┌────────────┐                       │
│                     │  test-db   │                       │
│                     │ PostgreSQL │                       │
│                     │  15-alpine │                       │
│                     │   :5433    │                       │
│                     └────────────┘                       │
│                                                          │
│  Volumes: pgdata (db), pgdata-test (test-db)            │
└──────────────────────────────────────────────────────────┘
```

## Configuration Model

### Environment Variables

| Variable | Service | Dev Value | Production (Railway) | Required |
|----------|---------|-----------|---------------------|----------|
| `DATABASE_URL` | backend | `postgresql+asyncpg://macc:macc@db:5432/macc` | Provided by Railway (`postgres://...` → auto-normalised) | YES |
| `TEST_DATABASE_URL` | backend (tests) | `postgresql+asyncpg://macc:macc@test-db:5433/macc_test` | N/A | For tests only |
| `RAILWAY_ENVIRONMENT` | backend | Not set | Set by Railway | NO — presence triggers auto-migration |
| `PORT` | backend (prod) | 8000 | Set by Railway | Prod only |
| `BACKEND_URL` | frontend (prod) | `backend:8000` (default) | Railway backend internal URL | NO — defaults to `backend:8000`; used by nginx `envsubst` |

### Database Connection Flow (Simplified)

```
database.py:
  1. Read DATABASE_URL from environment
  2. If not set → raise RuntimeError("DATABASE_URL environment variable is required")
  3. Normalise: postgres:// → postgresql+asyncpg://
  4. Create async engine with URL
  5. Export AsyncSessionLocal for dependency injection
```

### Docker Service Definitions

#### backend

| Property | Dev (docker-compose) | Prod (Railway) |
|----------|---------------------|----------------|
| Dockerfile target | `dev` | `prod` (default) |
| Source code | Volume-mounted (`./backend/src:/app/src`) | Baked into image |
| Entrypoint | `uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000` | `entrypoint.sh` (migrate + uvicorn; exits non-zero on migration failure) |
| DATABASE_URL | Points to `db:5432` | Provided by Railway |
| Hot reload | Yes (via volume mount + `--reload`) | No |

#### frontend

| Property | Dev (docker-compose) | Prod (Railway) |
|----------|---------------------|----------------|
| Dockerfile target | `dev` | `prod` (default) |
| Source code | Volume-mounted (`./frontend/src:/app/src`) | Built static assets in nginx |
| Server | Vite dev server (port 5173) | nginx (port 80; `envsubst` templates `$BACKEND_URL` at start) |
| API proxy | Vite proxy config (`/api` → `backend:8000`) | nginx `proxy_pass` |
| HMR | Yes (WebSocket via Vite) | No |

#### db

| Property | Value |
|----------|-------|
| Image | `postgres:15-alpine` |
| Port | `5432` (mapped to host) |
| Volume | `pgdata:/var/lib/postgresql/data` |
| Health check | `pg_isready -U macc -d macc` |
| Credentials | `POSTGRES_USER=macc`, `POSTGRES_PASSWORD=macc`, `POSTGRES_DB=macc` |

#### test-db

| Property | Value |
|----------|-------|
| Image | `postgres:15-alpine` |
| Port | `5433:5432` (different host port) |
| Volume | `pgdata-test:/var/lib/postgresql/data` |
| Health check | `pg_isready -U macc -d macc_test` |
| Credentials | `POSTGRES_USER=macc`, `POSTGRES_PASSWORD=macc`, `POSTGRES_DB=macc_test` |

## File Change Inventory

### New Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Root orchestration — backend, frontend, db, test-db |
| `backend/Dockerfile` | Multi-stage: `dev` (hot-reload) + `prod` (baked) |
| `backend/entrypoint.sh` | Prod entrypoint: conditional `alembic upgrade head` (fail-fast on error) + uvicorn |
| `backend/.env.example` | Committed docker-compose defaults for `DATABASE_URL`, `TEST_DATABASE_URL` |
| `backend/.dockerignore` | Exclude `.venv/`, `__pycache__/`, `tests/`, `*.pyc` |
| `frontend/Dockerfile` | Multi-stage: `dev` (Vite HMR) + `prod` (nginx static) |
| `frontend/nginx.conf` | SPA fallback + `/api/` proxy to backend (templated via `envsubst` for `$BACKEND_URL`) |
| `frontend/.dockerignore` | Exclude `node_modules/`, `dist/`, `.git/` |

### Modified Files

| File | Changes |
|------|---------|
| `backend/src/models/database.py` | Remove `_DEFAULT_DB`, `_IS_SQLITE`, SQLite pragmas, `check_same_thread`; require `DATABASE_URL`; keep URL normalisation |
| `backend/tests/conftest.py` | Replace `sqlite+aiosqlite:///:memory:` with `TEST_DATABASE_URL` PostgreSQL connection; session-scoped schema drop/create + per-test transaction rollback |
| `backend/alembic/env.py` | Remove `is_sqlite` detection; hardcode `render_as_batch=False` |
| `backend/alembic.ini` | Remove SQLite default URL; add comment directing to `DATABASE_URL` |
| `backend/requirements.txt` | Remove `aiosqlite==0.22.1` |
| `backend/pyproject.toml` | Remove `aiosqlite>=0.20`; update description from "SQLite" to "PostgreSQL" |
| `Makefile` | Add `up`, `down`, `build`, `logs` targets; update `migrate`, `seed` to use `docker-compose exec` |
| `.gitignore` | Add `backend/.env` to prevent credential leaks |
| `.specify/memory/architecture.md` | Update to reflect PostgreSQL + Docker architecture |
| `frontend/vite.config.ts` | Change proxy target from `http://localhost:8000` to `http://backend:8000` (FR-028) |

### Unchanged (Verified)

| File | Reason |
|------|--------|
| Migration files (`alembic/versions/*`) | `batch_alter_table` is valid on PostgreSQL; Alembic handles translation |
| `backend/src/api/*` | API layer unchanged; database abstraction via SQLAlchemy unchanged |
| `backend/src/services/*` | Business logic unchanged; uses async sessions |
| `backend/src/models/*.py` (except database.py) | ORM models are dialect-neutral |
| `frontend/src/*` | No frontend code changes in this feature |
