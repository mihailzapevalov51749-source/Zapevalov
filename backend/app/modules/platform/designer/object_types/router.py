from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.designer.object_types import service
from app.modules.platform.shared.dependencies import require_designer_user
from app.modules.users.models import User
from app.modules.platform.designer.object_types.schemas import (
    ObjectTypeCreate,
    ObjectTypeListItem,
    ObjectTypeRead,
    ObjectTypeUpdate,
)

router = APIRouter(tags=["designer-object-types"])

TenantIdPath = Annotated[
    int,
    Path(
        ...,
        description="Идентификатор tenant (portal). Задаётся только в URL, не в body.",
        ge=1,
    ),
]


@router.get("", response_model=list[ObjectTypeListItem])
def list_object_types(
    tenant_id: TenantIdPath,
    db: Session = Depends(get_db),
):
    return service.list_object_types(db, tenant_id)


@router.post(
    "",
    response_model=ObjectTypeRead,
    status_code=status.HTTP_201_CREATED,
)
def create_object_type(
    tenant_id: TenantIdPath,
    payload: ObjectTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.create_object_type(db, tenant_id, payload, current_user=current_user)


@router.get("/{object_type_id}", response_model=ObjectTypeRead)
def get_object_type(
    tenant_id: TenantIdPath,
    object_type_id: UUID,
    db: Session = Depends(get_db),
):
    return service.get_object_type(db, tenant_id, object_type_id)


@router.patch("/{object_type_id}", response_model=ObjectTypeRead)
def update_object_type(
    tenant_id: TenantIdPath,
    object_type_id: UUID,
    payload: ObjectTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.update_object_type(
        db,
        tenant_id,
        object_type_id,
        payload,
        current_user=current_user,
    )


@router.delete("/{object_type_id}", response_model=ObjectTypeRead)
def delete_object_type(
    tenant_id: TenantIdPath,
    object_type_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.delete_object_type(
        db,
        tenant_id,
        object_type_id,
        current_user=current_user,
    )
