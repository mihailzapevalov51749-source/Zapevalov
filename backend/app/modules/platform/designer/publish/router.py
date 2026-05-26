from typing import Annotated

from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.designer.publish import service
from app.modules.platform.shared.dependencies import require_designer_user
from app.modules.users.models import User
from app.modules.platform.designer.publish.schemas import (
    PublishHistoryItem,
    PublishLatestInfo,
    PublishResult,
    PublishValidationReport,
)

TenantIdPath = Annotated[
    int,
    Path(
        ...,
        description="Идентификатор tenant (portal). Только path parameter.",
        ge=1,
    ),
]

publish_router = APIRouter(prefix="/publish", tags=["designer-publish"])


@publish_router.post("/validate", response_model=PublishValidationReport)
def validate_publish(
    tenant_id: TenantIdPath,
    db: Session = Depends(get_db),
):
    return service.validate_publish(db, tenant_id)


@publish_router.post("", response_model=PublishResult)
def publish_catalog(
    tenant_id: TenantIdPath,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.publish_tenant_catalog(db, tenant_id, current_user=current_user)


@publish_router.get("/latest", response_model=PublishLatestInfo)
def get_latest_publish(
    tenant_id: TenantIdPath,
    db: Session = Depends(get_db),
):
    return service.get_latest_publish_info(db, tenant_id)


@publish_router.get("/history", response_model=list[PublishHistoryItem])
def get_publish_history(
    tenant_id: TenantIdPath,
    db: Session = Depends(get_db),
):
    return service.get_publish_history(db, tenant_id)
