"""JWT authentication: token validation and dev token generation.

In production a real identity provider issues tokens; in local dev the
`generate_dev_token` function creates a signed token good for 24 hours.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, status
from jose import JWTError, jwt

_SECRET = os.getenv("JWT_SECRET", "dev-insecure-secret-change-me")
_ALGORITHM = "HS256"
_DEV_TOKEN_EXPIRE_HOURS = 24
_DEV_TOKEN_LOCAL_EXPIRE_HOURS = 720  # 30 days for local dev convenience


def create_access_token(
    subject: str,
    organisation_id: str,
    expire_hours: int = _DEV_TOKEN_EXPIRE_HOURS,
) -> str:
    """Create a signed JWT for the given organisation."""
    now = datetime.now(tz=timezone.utc)
    payload = {
        "sub": subject,
        "org": organisation_id,
        "iat": now,
        "exp": now + timedelta(hours=expire_hours),
    }
    return jwt.encode(payload, _SECRET, algorithm=_ALGORITHM)


def decode_token(token: str) -> dict[str, object]:
    """Decode and verify a JWT; raise 401 on any failure."""
    try:
        return jwt.decode(token, _SECRET, algorithms=[_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def extract_bearer_token(request: Request) -> str:
    """Pull the Bearer token from the Authorization header."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return auth.removeprefix("Bearer ").strip()


def generate_dev_token(organisation_id: str, subject: str = "dev-user") -> str:
    """Convenience function for local development — prints a valid token (30 days)."""
    token = create_access_token(
        subject=subject,
        organisation_id=organisation_id,
        expire_hours=_DEV_TOKEN_LOCAL_EXPIRE_HOURS,
    )
    print(f"Dev token (org={organisation_id}):\n{token}")
    return token
