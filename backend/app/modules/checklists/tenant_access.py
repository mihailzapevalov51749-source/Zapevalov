"""Tenant isolation gate for Checklists API (same entity binding as Comments)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.checklists.models import ChecklistItem
from app.modules.comments.tenant_access import assert_comment_entity_access
from app.modules.users.models import User


def assert_checklist_entity_access(
    db: Session,
    current_user: User,
    *,
    entity_type: str,
    entity_id: str,
) -> None:
    assert_comment_entity_access(
        db,
        current_user,
        entity_type=entity_type,
        entity_id=entity_id,
        file_id=None,
    )


def assert_checklist_row_access(
    db: Session,
    current_user: User,
    item: ChecklistItem,
) -> None:
    assert_checklist_entity_access(
        db,
        current_user,
        entity_type=item.entity_type,
        entity_id=item.entity_id,
    )


def assert_checklist_reorder_access(
    db: Session,
    current_user: User,
    items: list[ChecklistItem],
) -> None:
    if not items:
        return

    seen: set[tuple[str, str]] = set()
    for item in items:
        key = (str(item.entity_type), str(item.entity_id))
        if key in seen:
            continue
        seen.add(key)
        assert_checklist_entity_access(
            db,
            current_user,
            entity_type=item.entity_type,
            entity_id=item.entity_id,
        )
