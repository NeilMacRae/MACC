.PHONY: up down build logs migrate seed test lint dev-token

BACKEND_DIR := backend
FRONTEND_DIR := frontend

# ── Docker Compose ────────────────────────────────────────────────────────────

up:
	docker compose up

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

# Run Alembic migrations inside the running backend container
migrate:
	docker compose exec backend alembic upgrade head

# Seed the local dev database only (targets db service — cannot reach production)
# After seeding, writes the fresh dev token to frontend/.env.local so
# the Vite dev server picks it up automatically (no manual token pasting).
# The sleep gives Vite time to finish restarting before the browser re-queries.
seed:
	docker compose exec backend python seed_data.py
	@TOKEN=$$(docker compose exec -T backend cat .dev-token 2>/dev/null | tr -d '\r\n'); \
	 printf "VITE_DEV_TOKEN=%s\nVITE_API_BASE_URL=http://localhost:8000/api/v1\n" "$$TOKEN" > frontend/.env.local; \
	 printf "Token written to frontend/.env.local — waiting for Vite to restart"; \
	 sleep 3; \
	 echo " ✓ Ready — refresh the browser"

# ── Tests ─────────────────────────────────────────────────────────────────────

test:
	docker-compose exec backend python -m pytest
	cd $(FRONTEND_DIR) && npm test

# ── Lint (runs locally — no Docker needed) ───────────────────────────────────

lint:
	cd $(BACKEND_DIR) && ruff check src tests
	cd $(BACKEND_DIR) && mypy src
	cd $(FRONTEND_DIR) && npm run lint
	cd $(FRONTEND_DIR) && npm run format
	cd $(FRONTEND_DIR) && npx tsc --noEmit

# ── Utilities ─────────────────────────────────────────────────────────────────

dev-token:
	@docker compose exec backend cat .dev-token 2>/dev/null || \
	  docker compose exec backend python dev_token.py
