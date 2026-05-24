from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.users.models import User

from .models import Note
from .schemas import NoteOut, NotePublish, NoteUpsert
from .service import publish_note_with_mentions

router = APIRouter(
    prefix="/notes",
    tags=["notes"],
)


@router.get("", response_model=NoteOut | None)
def get_note(
    entity_type: str = Query(..., min_length=1, max_length=80),
    entity_id: str = Query(..., min_length=1, max_length=120),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Note)
        .filter(
            Note.entity_type == entity_type,
            Note.entity_id == str(entity_id),
        )
        .first()
    )


@router.post("", response_model=NoteOut)
def upsert_note(
    payload: NoteUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = (
        db.query(Note)
        .filter(
            Note.entity_type == payload.entity_type,
            Note.entity_id == str(payload.entity_id),
        )
        .first()
    )

    if note:
        note.content = payload.content or ""
        note.format = payload.format or "html"
    else:
        note = Note(
            entity_type=payload.entity_type,
            entity_id=str(payload.entity_id),
            content=payload.content or "",
            format=payload.format or "html",
        )

        db.add(note)

    db.commit()
    db.refresh(note)

    return note


@router.post("/publish", response_model=NoteOut)
def publish_note(
    payload: NotePublish,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return publish_note_with_mentions(
        db=db,
        payload=payload,
        current_user=current_user,
    )


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    entity_type: str = Query(..., min_length=1, max_length=80),
    entity_id: str = Query(..., min_length=1, max_length=120),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = (
        db.query(Note)
        .filter(
            Note.entity_type == entity_type,
            Note.entity_id == str(entity_id),
        )
        .first()
    )

    if note:
        db.delete(note)
        db.commit()

    return None