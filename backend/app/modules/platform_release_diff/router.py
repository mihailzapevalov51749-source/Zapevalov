"""HTTP API for DEV vs TEMPLATE release diff (WI-RELEASE-DIFF-001/002)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform_release.dependencies import require_release_developer
from app.modules.platform_release_diff.schemas import ReleaseDiffCompareOut
from app.modules.platform_release_diff.service import compare_dev_template
from app.modules.users.models import User

router = APIRouter(
    prefix="/platform/releases",
    tags=["Platform Release Diff"],
)


@router.post("/compare-dev-template", response_model=ReleaseDiffCompareOut)
def compare_dev_template_endpoint(
    db: Session = Depends(get_db),
    _developer: User = Depends(require_release_developer),
):
    return compare_dev_template(db)
