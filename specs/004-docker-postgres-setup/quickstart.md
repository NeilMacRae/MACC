# Quickstart: Docker & PostgreSQL Formalisation

**Feature**: 004-docker-postgres-setup
**Date**: 31 March 2026

## Prerequisites

- **Docker Desktop** (or Docker Engine + Docker Compose V2) installed and running
- **Git** for cloning the repository
- **Make** (included on macOS; install via `apt install make` on Linux)

## Getting Started

### 1. Clone and Start

```bash
git clone <repo-url> && cd MACC
cp backend/.env.example backend/.env   # Optional — docker-compose sets defaults; needed for running outside Docker
docker-compose up
```

This single command starts:
- **backend** — FastAPI on `http://localhost:8000` (hot-reload enabled)
- **frontend** — React/Vite on `http://localhost:5173` (HMR enabled)
- **db** — PostgreSQL 15 on `localhost:5432`
- **test-db** — PostgreSQL 15 on `localhost:5433` (for tests)

Wait for all services to report healthy (< 60 seconds).

### 2. Run Migrations

```bash
make migrate
```

Applies all Alembic migrations to the dev database. Required on first start and after pulling new migration files.

### 3. Seed Data

```bash
make seed
```

Populates the dev database with sample data. Only targets the local dev database — cannot reach production.

### 4. Open the Application

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:8000/docs](http://localhost:8000/docs)

## Daily Workflow

```bash
# Start everything
make up

# Stop everything
make down

# View logs
make logs

# Run migrations after pulling new code
make migrate

# Run tests
make test

# Lint (runs locally, no Docker needed)
make lint
```

## Development Notes

### Hot Reload
- **Backend**: Edit files in `backend/src/` — uvicorn detects changes and reloads automatically
- **Frontend**: Edit files in `frontend/src/` — Vite HMR updates the browser instantly

No container rebuilds needed for code changes.

### When to Rebuild
Rebuild containers after changing dependencies:

```bash
# After modifying requirements.txt or package.json
make build
make up
```

### Database Access
Connect to the dev database directly:

```bash
# Via psql (if installed locally)
psql postgresql://macc:macc@localhost:5432/macc

# Via docker-compose
docker-compose exec db psql -U macc -d macc
```

### Reset Database
To wipe all data and start fresh:

```bash
make down
docker volume rm macc_pgdata        # Remove dev data
docker volume rm macc_pgdata-test   # Remove test data
make up
make migrate
make seed
```

## Environment Variables

| Variable | Default (Dev) | Description |
|----------|--------------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://macc:macc@db:5432/macc` | Backend database connection |
| `TEST_DATABASE_URL` | `postgresql+asyncpg://macc:macc@test-db:5433/macc_test` | Test database connection |

In production (Railway), `DATABASE_URL` is provided automatically by the platform.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `DATABASE_URL environment variable is required` | Ensure you're running via `docker-compose up`, not directly |
| Backend can't connect to database | Check `db` service is healthy: `docker-compose ps` |
| Port 5432 already in use | Stop local PostgreSQL: `brew services stop postgresql` |
| Port 5173 already in use | Stop local Vite: kill any `npm run dev` processes |
| Tests fail with connection error | Ensure `test-db` is running: `docker-compose up test-db -d` |
