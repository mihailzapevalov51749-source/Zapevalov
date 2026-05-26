from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.runtime.query import service
from app.modules.platform.runtime.query.schemas import (
    DEFAULT_QUERY_LIMIT,
    EntityQueryResponse,
    MAX_QUERY_LIMIT,
    ViewProjectionResponse,
)
from app.modules.platform.shared.dependencies import require_tenant

TenantIdPath = Annotated[
    int,
    Path(..., description="Идентификатор tenant (portal).", ge=1),
]

ObjectTypeKeyPath = Annotated[
    str,
    Path(..., description="Ключ ObjectType из published catalog.", max_length=64),
]

query_router = APIRouter(
    prefix="/query",
    tags=["runtime-query"],
)


@query_router.get(
    "/tenants/{tenant_id}/{object_type_key}",
    response_model=EntityQueryResponse,
)
def query_entities(
    request: Request,
    tenant_id: TenantIdPath,
    object_type_key: ObjectTypeKeyPath,
    limit: int = Query(
        DEFAULT_QUERY_LIMIT,
        ge=1,
        le=MAX_QUERY_LIMIT,
        description="Максимум записей на страницу (1..200).",
    ),
    offset: int = Query(0, ge=0, description="Смещение для пагинации."),
    sort: str = Query(
        "created_at",
        max_length=64,
        description="Поле сортировки: created_at, updated_at или field_key из catalog.",
    ),
    order: str = Query(
        "desc",
        description="Направление сортировки: asc или desc.",
    ),
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant),
):
    return service.query_entities(
        db,
        tenant_id,
        object_type_key,
        query_params=dict(request.query_params),
        limit=limit,
        offset=offset,
        sort=sort,
        order=order,
    )


@query_router.get(
    "/tenants/{tenant_id}/{object_type_key}/views/projection",
    response_model=ViewProjectionResponse,
)
def get_view_projection(
    tenant_id: TenantIdPath,
    object_type_key: ObjectTypeKeyPath,
    view_key: str | None = Query(
        None,
        description=(
            "Key ViewDefinition из published catalog. Если не указан — используется default view."
        ),
    ),
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant),
):
    return service.get_view_projection(
        db,
        tenant_id,
        object_type_key,
        view_key=view_key,
    )
