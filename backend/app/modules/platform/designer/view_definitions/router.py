from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.designer.view_definitions import service
from app.modules.platform.shared.dependencies import require_designer_user
from app.modules.users.models import User
from app.modules.platform.designer.view_definitions.schemas import (
    ViewDefinitionCreate,
    ViewDefinitionListItem,
    ViewDefinitionRead,
    ViewDefinitionReorderRequest,
    ViewDefinitionUpdate,
)

TenantIdPath = Annotated[
    int,
    Path(
        ...,
        description="Идентификатор tenant (portal). Только path parameter.",
        ge=1,
    ),
]

ObjectTypeIdPath = Annotated[
    UUID,
    Path(..., description="Идентификатор ObjectType. Только path parameter."),
]

ViewIdPath = Annotated[
    UUID,
    Path(..., description="Идентификатор ViewDefinition. Только path parameter."),
]

object_type_views_router = APIRouter(tags=["designer-view-definitions"])

tenant_views_router = APIRouter(tags=["designer-view-definitions"])


@object_type_views_router.get("", response_model=list[ViewDefinitionListItem])
def list_views(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    db: Session = Depends(get_db),
):
    return service.list_views(db, tenant_id, object_type_id)


@object_type_views_router.post(
    "",
    response_model=ViewDefinitionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_view(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    payload: ViewDefinitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.create_view(
        db,
        tenant_id,
        object_type_id,
        payload,
        current_user=current_user,
    )


@object_type_views_router.post("/reorder", response_model=list[ViewDefinitionListItem])
def reorder_views(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    payload: ViewDefinitionReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.reorder_views(
        db,
        tenant_id,
        object_type_id,
        payload,
        current_user=current_user,
    )


@tenant_views_router.get("/{view_id}", response_model=ViewDefinitionRead)
def get_view(
    tenant_id: TenantIdPath,
    view_id: ViewIdPath,
    db: Session = Depends(get_db),
):
    return service.get_view(db, tenant_id, view_id)


@tenant_views_router.patch("/{view_id}", response_model=ViewDefinitionRead)
def update_view(
    tenant_id: TenantIdPath,
    view_id: ViewIdPath,
    payload: ViewDefinitionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.update_view(
        db,
        tenant_id,
        view_id,
        payload,
        current_user=current_user,
    )


@tenant_views_router.delete("/{view_id}", response_model=ViewDefinitionRead)
def delete_view(
    tenant_id: TenantIdPath,
    view_id: ViewIdPath,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.delete_view(
        db,
        tenant_id,
        view_id,
        current_user=current_user,
    )
