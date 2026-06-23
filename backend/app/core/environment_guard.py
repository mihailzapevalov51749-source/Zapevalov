"""Backend startup guard: APP_ENV must match DATABASE_URL and portal identity."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Any
from urllib.parse import unquote, urlparse

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

LEGACY_DATABASE_NAME = "portal_constructor_v2"
"""Monolithic pre-split database — read-only legacy / migration source; never a working contour DB."""

ALLOWED_APP_ENVS = frozenset({"DEV", "TEMPLATE", "CLIENT"})
SKIP_ENV_VAR = "YASNOPRO_SKIP_ENVIRONMENT_GUARD"


class EnvironmentGuardError(RuntimeError):
    """Raised when environment configuration does not match isolated environment matrix."""


@dataclass(frozen=True)
class EnvironmentExpectation:
    database: str
    portal_id: int
    environment_role: str
    app_env_aliases: frozenset[str]


ENVIRONMENT_MATRIX: dict[str, EnvironmentExpectation] = {
    "DEV": EnvironmentExpectation(
        database="yasnopro_dev",
        portal_id=1,
        environment_role="DEV",
        app_env_aliases=frozenset({"DEV"}),
    ),
    "TEMPLATE": EnvironmentExpectation(
        database="yasnopro_template",
        portal_id=2,
        environment_role="TEMPLATE",
        app_env_aliases=frozenset({"TEMPLATE"}),
    ),
    "CLIENT": EnvironmentExpectation(
        database="yasnopro_client",
        portal_id=21,
        environment_role="DEMO_CLIENT",
        app_env_aliases=frozenset({"CLIENT", "DEMO_CLIENT"}),
    ),
}

WORKING_DATABASE_NAMES = frozenset(
    expectation.database for expectation in ENVIRONMENT_MATRIX.values()
)

_ALIAS_TO_CANONICAL: dict[str, str] = {
    alias.upper(): canonical
    for canonical, expectation in ENVIRONMENT_MATRIX.items()
    for alias in expectation.app_env_aliases
}


def _env_lookup() -> dict[str, str | None]:
    return {
        "YASNOPRO_ENV": os.environ.get("YASNOPRO_ENV"),
        "APP_ENV": os.environ.get("APP_ENV"),
        "ENVIRONMENT": os.environ.get("ENVIRONMENT"),
    }


def resolve_raw_app_env(env: dict[str, str | None] | None = None) -> str | None:
    """Return first non-empty APP_ENV source (YASNOPRO_ENV → APP_ENV → ENVIRONMENT)."""
    values = env if env is not None else _env_lookup()
    for key in ("YASNOPRO_ENV", "APP_ENV", "ENVIRONMENT"):
        raw = values.get(key)
        if raw is not None and str(raw).strip():
            return str(raw).strip()
    return None


def normalize_app_env(raw: str | None) -> str:
    """Map APP_ENV aliases to canonical DEV / TEMPLATE / CLIENT."""
    if raw is None or not str(raw).strip():
        raise EnvironmentGuardError(
            "Environment Guard failed: APP_ENV/YASNOPRO_ENV is not set.\n"
            "Expected one of: DEV, TEMPLATE, CLIENT."
        )
    canonical = _ALIAS_TO_CANONICAL.get(str(raw).strip().upper())
    if canonical is None:
        raise EnvironmentGuardError(
            "Environment Guard failed: APP_ENV/YASNOPRO_ENV is not set.\n"
            f"Unexpected value {raw!r}. Expected one of: DEV, TEMPLATE, CLIENT."
        )
    return canonical


def extract_database_name(database_url: str) -> str:
    """Extract database name from SQLAlchemy-compatible DATABASE_URL."""
    parsed = urlparse(database_url.strip())
    path = (parsed.path or "").lstrip("/")
    if not path:
        raise EnvironmentGuardError(
            "Environment Guard failed: DATABASE_URL does not contain a database name."
        )
    return unquote(path.split("?", 1)[0])


def expected_database_for_app_env(app_env: str) -> str:
    expectation = ENVIRONMENT_MATRIX.get(app_env)
    if expectation is None:
        raise EnvironmentGuardError(
            f"Environment Guard failed: unsupported APP_ENV={app_env!r}."
        )
    return expectation.database


def validate_legacy_database_blocked(*, app_env: str, database_name: str) -> None:
    if database_name == LEGACY_DATABASE_NAME and app_env in ALLOWED_APP_ENVS:
        raise EnvironmentGuardError(
            "Environment Guard failed:\n"
            f"Legacy database {LEGACY_DATABASE_NAME} is not allowed for isolated environments.\n"
            "Use scripts/dev-stack/manifest.yaml (yasnopro_dev / yasnopro_template / yasnopro_client)."
        )


def validate_database_url_match(*, app_env: str, database_url: str | None) -> str:
    if not database_url or not str(database_url).strip():
        raise EnvironmentGuardError(
            "Environment Guard failed: DATABASE_URL is not set."
        )
    database_name = extract_database_name(str(database_url))
    validate_legacy_database_blocked(app_env=app_env, database_name=database_name)
    expected_db = expected_database_for_app_env(app_env)
    if database_name != expected_db:
        raise EnvironmentGuardError(
            "Environment Guard failed:\n"
            f"APP_ENV={app_env} expects database {expected_db}, "
            f"but DATABASE_URL points to {database_name}."
        )
    return database_name


def validate_portal_identity(
    *,
    app_env: str,
    engine: Engine,
    portal_row: tuple[int, str | None] | None = None,
) -> tuple[int, str]:
    expectation = ENVIRONMENT_MATRIX[app_env]
    if portal_row is None:
        with engine.connect() as connection:
            row = connection.execute(
                text(
                    "SELECT id, environment_role "
                    "FROM portals "
                    "WHERE id = :portal_id"
                ),
                {"portal_id": expectation.portal_id},
            ).fetchone()
        if row is None:
            raise EnvironmentGuardError(
                "Environment Guard failed:\n"
                f"Portal id={expectation.portal_id} not found for APP_ENV={app_env}."
            )
        portal_id = int(row[0])
        environment_role = str(row[1] or "").strip().upper()
    else:
        portal_id = int(portal_row[0])
        environment_role = str(portal_row[1] or "").strip().upper()

    if portal_id != expectation.portal_id:
        raise EnvironmentGuardError(
            "Environment Guard failed:\n"
            f"APP_ENV={app_env} expects portal.id={expectation.portal_id}, "
            f"but found portal.id={portal_id}."
        )
    if environment_role != expectation.environment_role:
        raise EnvironmentGuardError(
            "Environment Guard failed:\n"
            f"APP_ENV={app_env} expects environment_role={expectation.environment_role}, "
            f"but portal id={portal_id} has environment_role={environment_role or '<empty>'}."
        )
    return portal_id, environment_role


def _guard_skipped() -> bool:
    return os.environ.get(SKIP_ENV_VAR, "").strip().lower() in {"1", "true", "yes"}


def run_environment_guard(
    *,
    engine: Engine | None = None,
    database_url: str | None = None,
    env: dict[str, str | None] | None = None,
) -> dict[str, Any] | None:
    """Validate isolated environment matrix. Raises EnvironmentGuardError on mismatch."""
    if _guard_skipped():
        logger.warning("Environment Guard skipped (%s is set).", SKIP_ENV_VAR)
        return None

    raw_app_env = resolve_raw_app_env(env)
    app_env = normalize_app_env(raw_app_env)
    resolved_database_url = (
        database_url if database_url is not None else os.environ.get("DATABASE_URL")
    )
    database_name = validate_database_url_match(
        app_env=app_env,
        database_url=resolved_database_url,
    )

    guard_engine = engine
    if guard_engine is None:
        guard_engine = create_engine(str(resolved_database_url))

    portal_id, environment_role = validate_portal_identity(
        app_env=app_env,
        engine=guard_engine,
    )

    message = (
        "Environment Guard passed:\n"
        f"APP_ENV={app_env}\n"
        f"database={database_name}\n"
        f"portal_id={portal_id}\n"
        f"environment_role={environment_role}"
    )
    logger.info(message)
    print(message, flush=True)

    return {
        "app_env": app_env,
        "database": database_name,
        "portal_id": portal_id,
        "environment_role": environment_role,
    }
