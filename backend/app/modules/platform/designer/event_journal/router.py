from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform_event_journal.filter_options import (
    get_tenant_event_journal_filter_options as build_tenant_event_journal_filter_options,
)
from app.modules.platform_event_journal.schemas import (
    EventJournalFilterOptionsResponse,
    PlatformEventJournalListResponse,
)
from app.modules.platform_event_journal.seed_classification import resolve_tenant_type
from app.modules.platform_event_journal.service import list_tenant_event_journal_entries
from app.modules.platform.shared.dependencies import require_designer_user, require_tenant

router = APIRouter(
    prefix="/event-journal",
    tags=["Designer Event Journal"],
    dependencies=[
        Depends(require_tenant),
        Depends(require_designer_user),
    ],
)


@router.get("/entries", response_model=PlatformEventJournalListResponse)
def get_tenant_event_journal_entries(
    tenant_id: int,
    event_family: Literal["all", "development", "configuration"] = "all",
    db: Session = Depends(get_db),
    _current_user=Depends(require_designer_user),
):
    items = list_tenant_event_journal_entries(
        db,
        tenant_id,
        event_family=event_family,
    )
    return PlatformEventJournalListResponse(items=items)


@router.get("/filter-options", response_model=EventJournalFilterOptionsResponse)
def get_tenant_event_journal_filter_options(
    tenant_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(require_designer_user),
):
    tenant_type = resolve_tenant_type(db, tenant_id)
    categories, event_types = build_tenant_event_journal_filter_options(tenant_type=tenant_type)
    return EventJournalFilterOptionsResponse(categories=categories, event_types=event_types)
