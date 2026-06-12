from typing import Annotated

from fastapi import Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.portals.models import Portal
from app.modules.tenant_roles.access import can_access_designer
from app.modules.users.models import User


def require_designer_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not can_access_designer(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для Designer API",
        )

    return current_user


def require_tenant(
    tenant_id: Annotated[
        int,
        Path(
            ...,
            description="Идентификатор tenant (portal). Только path parameter.",
            ge=1,
        ),
    ],
    db: Session = Depends(get_db),
) -> int:
    portal = db.query(Portal).filter(Portal.id == tenant_id).first()

    if not portal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant (portal) не найден",
        )

    return tenant_id
