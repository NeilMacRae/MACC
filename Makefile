.PHONY: run-backend run-frontend seed test lint migrate dev-token

BACKEND_DIR := backend
FRONTEND_DIR := frontend

BACKEND_PY := $(shell if [ -x "$(BACKEND_DIR)/.venv/bin/python" ]; then echo "$(BACKEND_DIR)/.venv/bin/python"; else echo python3; fi)
BACKEND_UVICORN := $(shell if [ -x "$(BACKEND_DIR)/.venv/bin/uvicorn" ]; then echo "$(BACKEND_DIR)/.venv/bin/uvicorn"; else echo uvicorn; fi)
BACKEND_ALEMBIC := $(shell if [ -x "$(BACKEND_DIR)/.venv/bin/alembic" ]; then echo "$(BACKEND_DIR)/.venv/bin/alembic"; else echo alembic; fi)

run-backend:
	cd $(BACKEND_DIR) && set -a && [ -f .env ] && . ./.env && set +a && .venv/bin/uvicorn src.api.main:app --reload --port 8000

run-frontend:
	cd $(FRONTEND_DIR) && npm run dev

seed:
	cd $(BACKEND_DIR) && $(BACKEND_PY) seed_data.py

migrate:
	cd $(BACKEND_DIR) && .venv/bin/alembic upgrade head

test:
	cd $(BACKEND_DIR) && $(BACKEND_PY) -m pytest
	cd $(FRONTEND_DIR) && npm test

lint:
	cd $(BACKEND_DIR) && ruff check src tests
	cd $(BACKEND_DIR) && mypy src
	cd $(FRONTEND_DIR) && npm run lint
	cd $(FRONTEND_DIR) && npm run format
	cd $(FRONTEND_DIR) && npx tsc --noEmit

dev-token:
	cd $(BACKEND_DIR) && $(BACKEND_PY) dev_token.py
