from typing import Annotated

from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.runtime.plan_tree import service
from app.modules.platform.runtime.plan_tree.schemas import (
    PlanTreeEnsureRootOrderRead,
    PlanTreeReorderSiblingsRead,
    PlanTreeReorderSiblingsRequest,
)
from app.modules.platform.shared.dependencies import require_tenant

TenantIdPath = Annotated[int, Path(..., description="Идентификатор tenant (portal).", ge=1)]
ObjectTypeKeyPath = Annotated[str, Path(..., max_length=64)]
RelationKeyPath = Annotated[str, Path(..., max_length=64)]

plan_tree_router = APIRouter(
    prefix="/plan-tree",
    tags=["runtime-plan-tree"],
)


@plan_tree_router.post(
    "/tenants/{tenant_id}/object-types/{object_type_key}/hierarchy/{relation_key}/ensure-root-order",
    response_model=PlanTreeEnsureRootOrderRead,
)
def ensure_plan_tree_root_order(
    tenant_id: TenantIdPath,
    object_type_key: ObjectTypeKeyPath,
    relation_key: RelationKeyPath,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant),
):
    return service.ensure_root_order(db, tenant_id, object_type_key, relation_key)


@plan_tree_router.post(
    "/tenants/{tenant_id}/hierarchy/{relation_key}/reorder-siblings",
    response_model=PlanTreeReorderSiblingsRead,
)
def reorder_plan_tree_siblings(
    tenant_id: TenantIdPath,
    relation_key: RelationKeyPath,
    payload: PlanTreeReorderSiblingsRequest,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant),
):
    return service.reorder_siblings(db, tenant_id, relation_key, payload)
