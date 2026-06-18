"""Resolve bridge target metadata from customer company catalog (no cross-db)."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.control_plane.customer_companies.catalog_service import (
    get_customer_company_catalog_item,
)


def resolve_bridge_target_from_catalog(
    db: Session,
    *,
    portal_id: int,
) -> tuple[str, str]:
    item = get_customer_company_catalog_item(db, portal_id=portal_id)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Клиентская компания не найдена в каталоге",
        )

    database_name = str(item.database_name or "").strip()
    if not database_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Каталог не содержит database_name для компании",
        )

    tenant_code = str(item.code or "").strip()
    if not tenant_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Каталог не содержит tenant code для компании",
        )

    return database_name, tenant_code
