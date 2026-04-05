#!/bin/sh
set -e

# On Railway, run Alembic migrations before starting the server.
# Exit non-zero on failure to prevent uvicorn from starting with a stale schema.
if [ -n "${RAILWAY_ENVIRONMENT}" ]; then
    echo "Running database migrations..."
    alembic upgrade head
fi

exec uvicorn src.api.main:app --host 0.0.0.0 --port "${PORT:-8000}"
