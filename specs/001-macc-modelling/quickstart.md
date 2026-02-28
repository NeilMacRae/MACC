# Quickstart Guide: MACC Modelling

## Prerequisites

| Requirement | Version | Check |
|------------|---------|-------|
| Python | 3.11+ | `python --version` |
| Node.js | 20 LTS+ | `node --version` |
| Git | 2.x+ | `git --version` |
| Make | Any | `make --version` |

## 1. Clone & Branch

```bash
git clone <repo-url> && cd MACC
git checkout 001-macc-modelling
```

## 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -e ".[dev]"

# Create SQLite database with migrations
alembic upgrade head

# Set environment variables
cp .env.example .env
# Edit .env with:
#   ECOONLINE_API_URL=https://api.ecoonline.example.com
#   ECOONLINE_API_KEY=<your-key>
#   OPENAI_API_KEY=<your-key>
#   JWT_SECRET=<generate-with: python -c "import secrets; print(secrets.token_urlsafe(32))">

# Run backend
uvicorn src.api.main:app --reload --port 8000
```

**Verify**: Open `http://localhost:8000/api/v1/health` — should return `{"status": "healthy"}`.

## 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with:
#   VITE_API_BASE_URL=http://localhost:8000/api/v1

# Run frontend
npm run dev
```

**Verify**: Open `http://localhost:5173` — should display the MACC application shell.

## 4. Seed Sample Data

```bash
# From repo root (or backend/ with venv active)
make seed

# Or manually:
cd backend
source .venv/bin/activate
python seed_data.py
```

This generates a realistic organisational hierarchy, emission sources, and emission records based on `company_construct` / `answers_construct` patterns — enough data to explore all application features.

## 5. Makefile Convenience Commands

A `Makefile` at the repo root provides common targets:

```bash
make run-backend     # Start uvicorn with --reload on :8000
make run-frontend    # Start vite dev on :5173
make seed            # Run seed_data.py to populate sample data
make test            # Run all backend + frontend tests
make lint            # Run ruff + eslint + mypy + tsc
make migrate         # Run alembic upgrade head
make dev-token       # Generate a JWT dev token for local testing
```

## 6. Running Tests

### Backend

```bash
cd backend
source .venv/bin/activate

# All tests
pytest

# With coverage
pytest --cov=src --cov-report=term-missing

# Unit tests only
pytest tests/unit/

# Integration tests only
pytest tests/integration/

# Contract tests only
pytest tests/contract/
```

### Frontend

```bash
cd frontend

# All tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 7. Linting & Type Checking

### Backend

```bash
cd backend
source .venv/bin/activate

# Lint
ruff check src/ tests/

# Format
ruff format src/ tests/

# Type check
mypy src/
```

### Frontend

```bash
cd frontend

# Lint
npm run lint

# Format (Prettier)
npx prettier --check src/

# Type check
npx tsc --noEmit
```

## 8. Database Migrations

```bash
cd backend
source .venv/bin/activate

# Create a new migration
alembic revision --autogenerate -m "description of change"

# Apply migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1

# View current state
alembic current
```

**Note**: Alembic is configured with `render_as_batch=True` for SQLite compatibility. All migrations use batch mode for ALTER TABLE operations.

## 9. Development Workflow

1. **Pick a task** from `specs/001-macc-modelling/tasks.md`
2. **Create a feature branch** from `001-macc-modelling`
3. **Implement** following the layered architecture: Models → Schemas → Services → API → Frontend
4. **Write tests** — aim for ≥80% coverage per module
5. **Run linting and type checks** — must pass before commit
6. **Open PR** against `001-macc-modelling` branch
7. **CI validates**: lint, type check, tests, coverage threshold

## 10. Key Files Reference

| Purpose | Backend | Frontend |
|---------|---------|----------|
| App entry | `src/api/main.py` | `src/main.tsx` |
| Config | `.env` + `src/api/deps.py` | `.env` + `vite.config.ts` |
| DB models | `src/models/*.py` | — |
| API schemas | `src/schemas/*.py` | `src/types/*.ts` |
| Business logic | `src/services/*.py` | `src/hooks/*.ts` |
| API routes | `src/api/*.py` | `src/services/api.ts` |
| Tests | `tests/` | `tests/` |

## 11. Environment Variables

### Backend (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | No | SQLite path (default: `sqlite+aiosqlite:///./macc.db`) |
| `ECOONLINE_API_URL` | Yes | Base URL for EcoOnline API |
| `ECOONLINE_API_KEY` | Yes | API key for EcoOnline authentication |
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI suggestions |
| `OPENAI_MODEL` | No | Model name (default: `gpt-4o-2024-08-06`) |
| `JWT_SECRET` | Yes | Secret key for JWT token signing |
| `JWT_ALGORITHM` | No | JWT algorithm (default: `HS256`) |
| `JWT_EXPIRATION_MINUTES` | No | Token expiry (default: `60`) |
| `LOG_LEVEL` | No | Logging level (default: `INFO`) |
| `CORS_ORIGINS` | No | Allowed origins (default: `http://localhost:5173`) |

### Frontend (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes | Backend API base URL |
