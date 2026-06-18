"""FastAPI dependencies for tenant write policy enforcement."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Path, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.shared.dependencies import (
    require_portal_membership,
    require_tenant_membership,
)
from app.modules.tenant_management.exceptions import TenantWriteForbiddenError
from app.modules.tenant_management.tenant_write_policy import (
    assert_tenant_allows_direct_structure_write,
)

MUTATING_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})


def _forbidden(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def enforce_dev_direct_structure_write_for_mutating_requests(
    request: Request,
    tenant_id: Annotated[int, Depends(require_tenant_membership)],
    db: Session = Depends(get_db),
) -> int:
    if request.method.upper() in MUTATING_METHODS:
        try:
            assert_tenant_allows_direct_structure_write(
                db,
                tenant_id,
                operation_name=f"{request.method} {request.url.path}",
            )
        except TenantWriteForbiddenError as exc:
            raise _forbidden(str(exc)) from exc
    return tenant_id


def require_dev_direct_structure_write_portal(
    portal_id: Annotated[int, Depends(require_portal_membership)],
    db: Session = Depends(get_db),
) -> int:
    try:
        assert_tenant_allows_direct_structure_write(
            db,
            portal_id,
            operation_name="legacy_structure_write",
        )
    except TenantWriteForbiddenError as exc:
        raise _forbidden(str(exc)) from exc
    return portal_id


def require_dev_direct_structure_write_tenant(
    tenant_id: Annotated[int, Depends(require_tenant_membership)],
    db: Session = Depends(get_db),
) -> int:
    try:
        assert_tenant_allows_direct_structure_write(
            db,
            tenant_id,
            operation_name="tenant_structure_write",
        )
    except TenantWriteForbiddenError as exc:
        raise _forbidden(str(exc)) from exc
    return tenant_id
