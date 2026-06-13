"""Tenant isolation gate for Notes API (same entity binding as Comments)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.comments.tenant_access import assert_comment_entity_access
from app.modules.users.models import User


def assert_note_entity_access(
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
