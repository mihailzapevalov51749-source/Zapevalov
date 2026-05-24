from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.comments import service
from app.modules.comments.constants import (
    ALLOWED_COMMENT_REACTIONS,
)
from app.modules.comments.schemas import (
    CommentCreate,
    CommentOut,
    CommentReactionCreate,
    CommentUpdate,
    CommentsListOut,
    SystemCommentCreate,
)
from app.modules.users.models import User

router = APIRouter(
    prefix="/comments",
    tags=["comments"],
)


@router.get("", response_model=CommentsListOut)
def list_comments(
    entity_type: str = Query(..., min_length=1, max_length=80),
    entity_id: str = Query(..., min_length=1, max_length=120),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comments = service.get_comments(
        db=db,
        entity_type=entity_type,
        entity_id=entity_id,
    )

    return {
        "items": comments,
        "total": len(comments),
    }


@router.post("", response_model=CommentOut)
def create_comment(
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.create_comment(
        db=db,
        payload=payload,
        current_user=current_user,
    )


@router.post("/system", response_model=CommentOut)
def create_system_comment(
    payload: SystemCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.create_system_comment(
        db=db,
        payload=payload,
    )


@router.patch("/{comment_id}", response_model=CommentOut)
def update_comment(
    comment_id: int,
    payload: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = service.update_comment(
        db=db,
        comment_id=comment_id,
        payload=payload,
        current_user=current_user,
    )

    if not comment:
        raise HTTPException(
            status_code=404,
            detail="Комментарий не найден",
        )

    return comment


@router.delete("/{comment_id}")
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = service.delete_comment(
        db=db,
        comment_id=comment_id,
        current_user=current_user,
    )

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Комментарий не найден",
        )

    return {
        "ok": True,
    }


@router.post("/{comment_id}/reactions")
def toggle_comment_reaction(
    comment_id: int,
    payload: CommentReactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.emoji_key not in ALLOWED_COMMENT_REACTIONS:
        raise HTTPException(
            status_code=400,
            detail="Недопустимая реакция",
        )

    comment = service.get_comment_by_id(
        db=db,
        comment_id=comment_id,
    )

    if not comment:
        raise HTTPException(
            status_code=404,
            detail="Комментарий не найден",
        )

    return service.toggle_reaction(
        db=db,
        comment_id=comment_id,
        payload=payload,
        current_user=current_user,
    )


@router.post("/{comment_id}/attachments", response_model=CommentOut)
def attach_uploaded_file_to_comment(
    comment_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file_url = payload.get("file_url")
    file_name = payload.get("file_name")

    if not file_url or not file_name:
        raise HTTPException(
            status_code=400,
            detail="file_url и file_name обязательны",
        )

    comment = service.add_attachment(
        db=db,
        comment_id=comment_id,
        file_url=file_url,
        file_name=file_name,
        file_type=payload.get("file_type"),
        file_size=payload.get("file_size"),
        current_user=current_user,
    )

    if not comment:
        raise HTTPException(
            status_code=404,
            detail="Комментарий не найден",
        )

    return comment