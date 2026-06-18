"""Guards for destructive platform data operations."""

from __future__ import annotations

import os
from dataclasses import dataclass


class DestructiveOperationBlocked(RuntimeError):
    """Raised when a destructive operation is not allowed in the current environment."""


FORBIDDEN_DESTRUCTIVE_ENVIRONMENTS = frozenset(
    {
        "prod",
        "production",
        "staging",
        "demo",
    }
)


@dataclass(frozen=True)
class RuntimeEnvironmentInfo:
    name: str
    database_url: str | None


def resolve_runtime_environment() -> RuntimeEnvironmentInfo:
    raw = (
        os.environ.get("YASNOPRO_ENV")
        or os.environ.get("APP_ENV")
        or os.environ.get("ENVIRONMENT")
        or "development"
    )
    return RuntimeEnvironmentInfo(
        name=str(raw).strip().lower() or "development",
        database_url=os.environ.get("DATABASE_URL"),
    )


def assert_platform_registry_reset_allowed(*, operation: str = "platform_users_reset") -> None:
    env = resolve_runtime_environment()
    if env.name in FORBIDDEN_DESTRUCTIVE_ENVIRONMENTS:
        raise DestructiveOperationBlocked(
            f"{operation} is blocked in environment '{env.name}'. "
            "Only platform_users registry bindings may be reset in development."
        )


def assert_confirmed_mutation(*, confirm: bool, operation: str) -> None:
    if not confirm:
        raise DestructiveOperationBlocked(
            f"{operation} requires explicit confirm=True. "
            "Run with --dry-run first, then pass --confirm."
        )
