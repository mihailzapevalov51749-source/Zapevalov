from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.platform.workspace_tabs.models import UserWorkspaceTab


def list_tabs_for_user(
    db: Session,
    user_id: int,
    *,
    tenant_id: int | None = None,
) -> list[UserWorkspaceTab]:
    query = db.query(UserWorkspaceTab).filter(UserWorkspaceTab.user_id == user_id)

    if tenant_id is not None:
        portal_prefix = f"/portal/{tenant_id}/%"
        designer_prefix = f"/designer/tenant/{tenant_id}/%"
        query = query.filter(
            (UserWorkspaceTab.tenant_id == tenant_id)
            | (
                UserWorkspaceTab.tenant_id.is_(None)
                & (
                    UserWorkspaceTab.route.like(portal_prefix)
                    | UserWorkspaceTab.route.like(designer_prefix)
                )
            )
        )

    return query.order_by(
        UserWorkspaceTab.sort_order.asc(),
        UserWorkspaceTab.created_at.asc(),
    ).all()


def get_tab_for_user(
    db: Session,
    user_id: int,
    tab_id: UUID,
) -> UserWorkspaceTab | None:
    return (
        db.query(UserWorkspaceTab)
        .filter(
            UserWorkspaceTab.user_id == user_id,
            UserWorkspaceTab.id == tab_id,
        )
        .first()
    )


def get_tab_by_route(
    db: Session,
    user_id: int,
    route: str,
) -> UserWorkspaceTab | None:
    return (
        db.query(UserWorkspaceTab)
        .filter(
            UserWorkspaceTab.user_id == user_id,
            UserWorkspaceTab.route == route,
        )
        .first()
    )


def create_tab(db: Session, entity: UserWorkspaceTab) -> UserWorkspaceTab:
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def save_tab(db: Session, entity: UserWorkspaceTab) -> UserWorkspaceTab:
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def delete_tab(db: Session, entity: UserWorkspaceTab) -> None:
    db.delete(entity)
    db.commit()


def touch_tab_opened(
    db: Session,
    entity: UserWorkspaceTab,
    *,
    opened_at: datetime | None = None,
) -> UserWorkspaceTab:
    entity.last_opened_at = opened_at or datetime.now(timezone.utc)
    entity.is_minimized = False
    entity.updated_at = datetime.now(timezone.utc)
    return save_tab(db, entity)
