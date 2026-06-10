from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.platform_event_journal.schemas import (
    PlatformEventJournalEntryCreate,
    PlatformEventJournalEntryRead,
    PlatformEventJournalListResponse,
)
from app.modules.platform_event_journal.service import (
    create_platform_event_journal_entry,
    list_platform_event_journal_entries,
)

router = APIRouter(
    prefix="/platform-event-journal",
    tags=["Platform Event Journal"],
)


@router.get("/entries", response_model=PlatformEventJournalListResponse)
def get_platform_event_journal_entries(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    items = list_platform_event_journal_entries(db)
    db.commit()
    return PlatformEventJournalListResponse(items=items)


@router.post(
    "/entries",
    response_model=PlatformEventJournalEntryRead,
    status_code=status.HTTP_201_CREATED,
)
def post_platform_event_journal_entry(
    payload: PlatformEventJournalEntryCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    author_name = payload.author or getattr(current_user, "full_name", None) or getattr(
        current_user,
        "username",
        None,
    )
    entry = create_platform_event_journal_entry(
        db,
        payload.model_copy(update={"author": author_name}),
        author_user_id=getattr(current_user, "id", None),
        commit=True,
    )
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Journal entry with this slug already exists",
        )
    return entry
