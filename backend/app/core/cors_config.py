"""Environment-aware CORS configuration for isolated local frontends."""

from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

ALLOWED_ORIGINS_ENV_VAR = "ALLOWED_ORIGINS"
LOCAL_FRONTEND_PORTS = (5173, 5174, 5175)
LOCAL_FRONTEND_HOSTS = ("localhost", "127.0.0.1")


class CorsConfigurationError(ValueError):
    """Raised when CORS configuration contains forbidden values."""


def build_default_local_origins() -> tuple[str, ...]:
    """Default origins for DEV/TEMPLATE/CLIENT Vite dev servers."""
    return tuple(
        f"http://{host}:{port}"
        for host in LOCAL_FRONTEND_HOSTS
        for port in LOCAL_FRONTEND_PORTS
    )


def parse_extra_origins(raw: str | None) -> tuple[str, ...]:
    if raw is None or not str(raw).strip():
        return ()
    return tuple(
        item.strip()
        for item in str(raw).split(",")
        if item.strip()
    )


def _assert_origin_allowed(origin: str) -> None:
    normalized = str(origin).strip()
    if not normalized:
        raise CorsConfigurationError("CORS origin must not be empty.")
    if normalized == "*":
        raise CorsConfigurationError("Wildcard CORS origins are not allowed.")


def resolve_allowed_origins(
    *,
    env_value: str | None = None,
    include_defaults: bool = True,
) -> list[str]:
    """Resolve explicit CORS origins: local defaults + optional ALLOWED_ORIGINS."""
    origins: list[str] = []
    if include_defaults:
        origins.extend(build_default_local_origins())

    extra_raw = env_value if env_value is not None else os.environ.get(ALLOWED_ORIGINS_ENV_VAR)
    origins.extend(parse_extra_origins(extra_raw))

    deduped: list[str] = []
    seen: set[str] = set()
    for origin in origins:
        _assert_origin_allowed(origin)
        if origin in seen:
            continue
        seen.add(origin)
        deduped.append(origin)

    if not deduped:
        raise CorsConfigurationError("At least one CORS origin must be configured.")

    return deduped


def get_cors_middleware_kwargs(
    *,
    env_value: str | None = None,
) -> dict[str, Any]:
    """FastAPI CORSMiddleware kwargs with credentials-safe explicit origins."""
    allowed_origins = resolve_allowed_origins(env_value=env_value)
    logger.info("CORS allowed origins: %s", ", ".join(allowed_origins))
    return {
        "allow_origins": allowed_origins,
        "allow_credentials": True,
        "allow_methods": ["*"],
        "allow_headers": ["*"],
    }
