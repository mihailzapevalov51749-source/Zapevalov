from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db

from app.modules.auth.dependencies import get_current_user

from app.modules.universal_views import crud
from app.modules.universal_views.schemas import (
    UniversalViewCreate,
    UniversalViewOut,
    UniversalViewUpdate,
)

router = APIRouter(
    prefix="/universal-views",
    tags=["Universal Views"],
)


@router.get(
    "/table/{table_id}",
    response_model=list[UniversalViewOut],
)
def get_views_by_table(
    table_id: int,
    db: Session = Depends(get_db),
):
    return crud.get_views_by_table(
        db,
        table_id=table_id,
    )


@router.get(
    "/{view_id}",
    response_model=UniversalViewOut,
)
def get_view(
    view_id: int,
    db: Session = Depends(get_db),
):
    view = crud.get_view(
        db,
        view_id=view_id,
    )

    if not view:
        raise HTTPException(
            status_code=404,
            detail="View not found",
        )

    return view


@router.post(
    "/",
    response_model=UniversalViewOut,
)
def create_view(
    data: UniversalViewCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return crud.create_view(
        db,
        data=data,
        user_id=current_user.id,
    )


@router.patch(
    "/{view_id}",
    response_model=UniversalViewOut,
)
def update_view(
    view_id: int,
    data: UniversalViewUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    view = crud.get_view(
        db,
        view_id=view_id,
    )

    if not view:
        raise HTTPException(
            status_code=404,
            detail="View not found",
        )

    return crud.update_view(
        db,
        view=view,
        data=data,
        user_id=current_user.id,
    )


@router.delete("/{view_id}")
def delete_view(
    view_id: int,
    db: Session = Depends(get_db),
):
    view = crud.get_view(
        db,
        view_id=view_id,
    )

    if not view:
        raise HTTPException(
            status_code=404,
            detail="View not found",
        )

    crud.delete_view(
        db,
        view=view,
    )

    return {
        "success": True,
    }
