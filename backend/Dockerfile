# ─────────────────────────────────────────────
# Stage: dev
# Used by docker-compose (target: dev) with
# ./backend/src volume-mounted for hot-reload.
# ─────────────────────────────────────────────
FROM python:3.11-slim AS dev

WORKDIR /app

# Install deps first for cache efficiency.
# The requirements.txt contains a self-referential `-e git+...` line used for
# local venv installs; skip it here and install the package from local source.
COPY requirements.txt pyproject.toml ./
RUN grep -v "^-e git+" requirements.txt | pip install --no-cache-dir -r /dev/stdin

# Source code is volume-mounted in dev; copy here
# so the image is self-contained if used standalone.
COPY src/ src/
COPY alembic/ alembic/
COPY alembic.ini .
COPY dev_token.py seed_data.py .

# Install the local package in editable mode so imports resolve correctly.
RUN pip install --no-cache-dir -e .

CMD ["uvicorn", "src.api.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]

# ─────────────────────────────────────────────
# Stage: prod
# Default target — used by Railway.
# Bakes in source code; runs via entrypoint.sh
# which conditionally migrates before starting.
# ─────────────────────────────────────────────
FROM python:3.11-slim AS prod

WORKDIR /app

# Install production dependencies (strip self-referential git line)
COPY requirements.txt pyproject.toml ./
RUN grep -v "^-e git+" requirements.txt | pip install --no-cache-dir -r /dev/stdin

# Bake source code into image then install as package
COPY src/ src/
RUN pip install --no-cache-dir -e .
COPY alembic/ alembic/
COPY alembic.ini .

# Copy and set up entrypoint
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Run as non-root user
RUN adduser --disabled-password --gecos "" appuser
USER appuser

ENTRYPOINT ["./entrypoint.sh"]
