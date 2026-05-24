from sqlalchemy.orm import Session

from app.modules.universal_views.models import UniversalView
from app.modules.universal_views.schemas import (
    UniversalViewCreate,
    UniversalViewUpdate,
)


def get_views_by_table(
    db: Session,
    table_id: int,
):
    return (
        db.query(UniversalView)
        .filter(UniversalView.table_id == table_id)
        .order_by(
            UniversalView.position.asc(),
            UniversalView.id.asc(),
        )
        .all()
    )


def get_view(
    db: Session,
    view_id: int,
):
    return (
        db.query(UniversalView)
        .filter(UniversalView.id == view_id)
        .first()
    )


def create_view(
    db: Session,
    *,
    data: UniversalViewCreate,
    user_id: int | None = None,
):
    payload = data.model_dump()

    view = UniversalView(
        **payload,
        created_by_id=user_id,
        updated_by_id=user_id,
    )

    db.add(view)
    db.commit()
    db.refresh(view)

    return view


def update_view(
    db: Session,
    *,
    view: UniversalView,
    data: UniversalViewUpdate,
    user_id: int | None = None,
):
    payload = data.model_dump(exclude_unset=True)

    for key, value in payload.items():
        setattr(view, key, value)

    view.updated_by_id = user_id

    db.commit()
    db.refresh(view)

    return view


def delete_view(
    db: Session,
    *,
    view: UniversalView,
):
    db.delete(view)
    db.commit()