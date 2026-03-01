"""FastAPI application factory.

Registers CORS middleware, global exception handlers, and mounts the API
routers.  Health and meta endpoints require no auth.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exception_handlers import http_exception_handler, request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from src.api import emissions as emissions_router
from src.api import initiatives as initiatives_router
from src.api import context as context_router
from src.api import scenarios as scenarios_router
from src.api import suggestions as suggestions_router

app = FastAPI(
    title="MACC Modelling API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    redirect_slashes=False,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Global exception handlers
# ---------------------------------------------------------------------------


@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred. Please try again later."},
    )


# ---------------------------------------------------------------------------
# Health & meta endpoints (no auth required)
# ---------------------------------------------------------------------------


@app.get("/api/v1/health", tags=["system"])
async def health() -> dict[str, object]:
    """Health check — confirms the API process and DB connection are alive."""
    from sqlalchemy import text

    from src.models.database import engine

    db_status = "disconnected"
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        pass

    return {
        "status": "healthy",
        "version": "1.0.0",
        "database": db_status,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
    }


@app.get("/api/v1/meta", tags=["system"])
async def meta() -> dict[str, object]:
    """Application metadata."""
    return {
        "name": "MACC Modelling",
        "version": "1.0.0",
        "description": "Marginal Abatement Cost Curve modelling for sustainability experts",
        "api_prefix": "/api/v1",
    }


# ---------------------------------------------------------------------------
# Feature routers
# ---------------------------------------------------------------------------
app.include_router(emissions_router.router, prefix="/api/v1")
app.include_router(initiatives_router.router, prefix="/api/v1")
app.include_router(context_router.router, prefix="/api/v1")
app.include_router(scenarios_router.router, prefix="/api/v1")
app.include_router(suggestions_router.router, prefix="/api/v1")
