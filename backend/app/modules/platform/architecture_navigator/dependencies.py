"""FastAPI dependencies for Architecture Navigator (DEV-only)."""

from __future__ import annotations

from fastapi import Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.architecture_navigator.service import assert_dev_tenant_access
from app.modules.platform.shared.dependencies import require_designer_user


def require_architecture_navigator_access(
    tenant_id: int = Query(1, ge=1, description="DEV tenant id for access gate"),
    db: Session = Depends(get_db),
    _actor=Depends(require_designer_user),
) -> int:
    assert_dev_tenant_access(db, tenant_id)
    return tenant_id
