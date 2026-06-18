"""Service-layer publication guard for direct tenant structure writes."""

from __future__ import annotations

from sqlalchemy.orm import Session


def guard_direct_structure_write(
    db: Session,
    tenant_id: int,
    operation_name: str,
    *,
    bypass_write_policy: bool = False,
) -> None:
    """Enforce tenant-type policy for structure writes (company constructor).

    DEV and CLIENT may mutate tenant structure when authorized by role checks.
    TEMPLATE is blocked — platform structure is delivered via publication pipeline.
    """
    if bypass_write_policy:
        return
    from app.modules.tenant_management.tenant_write_policy import (
        assert_tenant_allows_direct_structure_write,
    )

    assert_tenant_allows_direct_structure_write(db, tenant_id, operation_name)
