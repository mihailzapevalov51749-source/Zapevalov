"""Request-local company database routing context (CLIENT runtime)."""

from __future__ import annotations

from contextvars import ContextVar

from app.modules.company_database_provisioning.naming import is_company_runtime_database

_request_database_name: ContextVar[str | None] = ContextVar(
    "request_database_name",
    default=None,
)


def set_request_database_name(database_name: str | None) -> None:
    normalized = str(database_name or "").strip() or None
    if normalized is not None and not is_company_runtime_database(normalized):
        _request_database_name.set(None)
        return
    _request_database_name.set(normalized)


def get_request_database_name() -> str | None:
    return _request_database_name.get()


def clear_request_database_name() -> None:
    _request_database_name.set(None)
