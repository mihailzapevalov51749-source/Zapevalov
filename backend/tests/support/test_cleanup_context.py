"""Pytest context for active test cleanup run (DB registry)."""

from __future__ import annotations

from contextvars import ContextVar, Token
from typing import TYPE_CHECKING

from app.modules.test_cleanup_registry.service import (
    assert_cleanup_registry_empty,
    assert_cleanup_run_clean,
    cleanup_registered_records,
    purge_cleaned_run_audit,
    register_test_record_by_type,
    start_cleanup_run,
)

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

_active_run_id: ContextVar[int | None] = ContextVar("test_cleanup_run_id", default=None)
_active_db: ContextVar[Session | None] = ContextVar("test_cleanup_db", default=None)


def set_cleanup_context(db: Session, run_id: int) -> tuple[Token, Token]:
    return _active_run_id.set(int(run_id)), _active_db.set(db)


def reset_cleanup_context(tokens: tuple[Token, Token]) -> None:
    run_token, db_token = tokens
    _active_run_id.reset(run_token)
    _active_db.reset(db_token)


def get_active_run_id() -> int | None:
    return _active_run_id.get()


def get_active_db() -> Session | None:
    return _active_db.get()


def register_if_active(
    *,
    entity_type: str,
    entity_id: int,
    entity_key: str | None = None,
    delete_order: int | None = None,
) -> None:
    run_id = get_active_run_id()
    db = get_active_db()
    if run_id is None or db is None:
        return
    register_test_record_by_type(
        db,
        run_id=run_id,
        entity_type=entity_type,
        entity_id=int(entity_id),
        entity_key=entity_key,
        delete_order=delete_order,
    )


def register_ids_if_active(entity_type: str, entity_ids: list[int]) -> None:
    for entity_id in entity_ids:
        register_if_active(entity_type=entity_type, entity_id=entity_id)


def finalize_cleanup_run(db: Session, run_id: int, *, purge_audit: bool = True) -> None:
    result = cleanup_registered_records(db, run_id)
    if not result.success:
        raise AssertionError(
            "Test cleanup registry failed: "
            f"deleted={result.deleted_count} failed={result.failed_count} "
            f"errors={result.error_summary}"
        )
    assert_cleanup_run_clean(db, run_id)
    if purge_audit:
        purge_cleaned_run_audit(db, run_id)


def begin_test_cleanup_run(db: Session, run_key: str) -> int:
    run_id = start_cleanup_run(db, run_key)
    db.commit()
    return run_id


def assert_global_cleanup_registry_empty(db: Session) -> None:
    assert_cleanup_registry_empty(db)
