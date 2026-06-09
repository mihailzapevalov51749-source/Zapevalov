"""Trash restore must reject unique-key conflicts with HTTP 409."""

from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.platform.designer.trash.restore_conflict import (
    RESTORE_CONFLICT_ERROR,
    check_restore_conflict,
    ensure_restore_allowed,
)


def _mock_conflict_query(has_conflict: bool) -> MagicMock:
    query = MagicMock()
    query.filter.return_value = query
    query.first.return_value = uuid4() if has_conflict else None
    return query


def test_relation_definition_restore_conflict() -> None:
    entity = SimpleNamespace(id=uuid4(), key="idei")
    db = MagicMock()
    db.query.return_value = _mock_conflict_query(True)

    conflict = check_restore_conflict(
        db,
        tenant_id=1,
        kind="object_relation",
        entity=entity,
    )

    assert conflict is not None
    assert conflict["error"] == RESTORE_CONFLICT_ERROR
    assert conflict["entity_type"] == "relation_definition"
    assert conflict["key"] == "idei"


def test_relation_definition_restore_allowed_without_active_duplicate() -> None:
    entity = SimpleNamespace(id=uuid4(), key="idei")
    db = MagicMock()
    db.query.return_value = _mock_conflict_query(False)

    conflict = check_restore_conflict(
        db,
        tenant_id=1,
        kind="object_relation",
        entity=entity,
    )

    assert conflict is None


def test_ensure_restore_allowed_raises_http_409() -> None:
    entity = SimpleNamespace(id=uuid4(), key="idei")
    db = MagicMock()
    db.query.return_value = _mock_conflict_query(True)

    with pytest.raises(HTTPException) as exc_info:
        ensure_restore_allowed(db, tenant_id=1, kind="object_relation", entity=entity)

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail["error"] == RESTORE_CONFLICT_ERROR
    assert exc_info.value.detail["key"] == "idei"


def test_object_type_restore_conflict() -> None:
    entity = SimpleNamespace(id=uuid4(), key="napravleniya")
    db = MagicMock()
    db.query.return_value = _mock_conflict_query(True)

    conflict = check_restore_conflict(
        db,
        tenant_id=1,
        kind="object_type",
        entity=entity,
    )

    assert conflict is not None
    assert conflict["entity_type"] == "object_type"
    assert conflict["key"] == "napravleniya"
