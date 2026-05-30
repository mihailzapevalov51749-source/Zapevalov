from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.quality_issues.schemas import (
    QualityIssueCreate,
    QualityIssueRead,
    QualityIssueStatusHistoryRead,
    QualityIssueUpdate,
)
from app.modules.quality_issues.ai_fix import (
    approve_quality_issue_fix,
    prepare_quality_issue_fix,
)
from app.modules.quality_issues.service import (
    create_quality_issue,
    delete_quality_issue,
    get_quality_issue,
    list_quality_issue_status_history,
    list_quality_issues,
    update_quality_issue,
)

router = APIRouter(
    prefix="/quality-issues",
    tags=["Quality Issues"],
)


@router.get("", response_model=list[QualityIssueRead])
def get_quality_issues(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return list_quality_issues(db)


@router.get("/{issue_id}", response_model=QualityIssueRead)
def get_quality_issue_by_id(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    issue = get_quality_issue(db, issue_id=issue_id)

    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quality issue not found",
        )

    return issue


@router.get(
    "/{issue_id}/status-history",
    response_model=list[QualityIssueStatusHistoryRead],
)
def get_quality_issue_status_history(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    issue = get_quality_issue(db, issue_id=issue_id)

    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quality issue not found",
        )

    return list_quality_issue_status_history(db, issue_id=issue_id)


@router.post("", response_model=QualityIssueRead, status_code=status.HTTP_201_CREATED)
def create_quality_issue_endpoint(
    payload: QualityIssueCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return create_quality_issue(
        db,
        payload=payload,
        created_by=current_user.id,
    )


@router.patch("/{issue_id}", response_model=QualityIssueRead)
def patch_quality_issue(
    issue_id: int,
    payload: QualityIssueUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    issue = get_quality_issue(db, issue_id=issue_id)

    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quality issue not found",
        )

    return update_quality_issue(
        db,
        issue=issue,
        payload=payload,
    )


@router.post("/{issue_id}/prepare-fix", response_model=QualityIssueRead)
def prepare_quality_issue_fix_endpoint(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    issue = get_quality_issue(db, issue_id=issue_id)

    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quality issue not found",
        )

    return prepare_quality_issue_fix(db, issue=issue)


@router.post("/{issue_id}/approve-fix", response_model=QualityIssueRead)
def approve_quality_issue_fix_endpoint(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    issue = get_quality_issue(db, issue_id=issue_id)

    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quality issue not found",
        )

    return approve_quality_issue_fix(db, issue=issue)


@router.delete("/{issue_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_quality_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    issue = get_quality_issue(db, issue_id=issue_id)

    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quality issue not found",
        )

    delete_quality_issue(db, issue=issue)
    return None
