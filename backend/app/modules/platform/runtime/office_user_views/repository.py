from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.platform.runtime.office_user_views.models import RuntimeOfficeUserTableView


def list_views(
    db: Session,
    tenant_id: int,
    owner_user_id: int,
    object_type_key: str,
) -> list[RuntimeOfficeUserTableView]:
    return (
        db.query(RuntimeOfficeUserTableView)
        .filter_by(
            tenant_id=tenant_id,
            owner_user_id=owner_user_id,
            object_type_key=object_type_key,
        )
        .order_by(RuntimeOfficeUserTableView.name.asc())
        .all()
    )


def get_by_id(
    db: Session,
    *,
    tenant_id: int,
    owner_user_id: int,
    object_type_key: str,
    view_id: UUID,
) -> RuntimeOfficeUserTableView | None:
    return (
        db.query(RuntimeOfficeUserTableView)
        .filter_by(
            id=view_id,
            tenant_id=tenant_id,
            owner_user_id=owner_user_id,
            object_type_key=object_type_key,
        )
        .one_or_none()
    )


def get_by_key(
    db: Session,
    *,
    tenant_id: int,
    owner_user_id: int,
    object_type_key: str,
    view_key: str,
) -> RuntimeOfficeUserTableView | None:
    return (
        db.query(RuntimeOfficeUserTableView)
        .filter_by(
            tenant_id=tenant_id,
            owner_user_id=owner_user_id,
            object_type_key=object_type_key,
            view_key=view_key,
        )
        .one_or_none()
    )


def clear_default_flags(
    db: Session,
    *,
    tenant_id: int,
    owner_user_id: int,
    object_type_key: str,
) -> None:
    (
        db.query(RuntimeOfficeUserTableView)
        .filter_by(
            tenant_id=tenant_id,
            owner_user_id=owner_user_id,
            object_type_key=object_type_key,
        )
        .update({RuntimeOfficeUserTableView.is_default: False})
    )


def create_view(db: Session, entity: RuntimeOfficeUserTableView) -> None:
    db.add(entity)


def delete_view(db: Session, entity: RuntimeOfficeUserTableView) -> None:
    db.delete(entity)


def commit(db: Session) -> None:
    db.commit()


def refresh(db: Session, entity: RuntimeOfficeUserTableView) -> None:
    db.refresh(entity)
