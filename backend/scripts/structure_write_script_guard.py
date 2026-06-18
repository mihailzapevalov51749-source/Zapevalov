"""Shared publication-guard helpers for maintenance scripts."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.tenant_management.tenant_write_policy import (
    assert_script_allows_direct_structure_write,
)


def guard_script_structure_write(
    db: Session,
    tenant_id: int,
    script_name: str,
    *,
    bypass_write_policy: bool = False,
) -> None:
    assert_script_allows_direct_structure_write(
        db,
        tenant_id,
        script_name=script_name,
        bypass_write_policy=bypass_write_policy,
    )
