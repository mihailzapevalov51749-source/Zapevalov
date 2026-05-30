from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.platform_dashboard.schemas import (
    PlatformActivityRead,
    PlatformComponentsResponse,
    PlatformDashboardRefreshRead,
    PlatformDashboardSummaryRead,
    PlatformStagesResponse,
    PlatformTaskRead,
)
from app.modules.platform_dashboard.service import (
    get_dashboard_summary,
    list_activities,
    list_components,
    list_stages,
    list_tasks,
)
from app.modules.platform_dashboard_analyzer.refresh import refresh_platform_dashboard

router = APIRouter(
    prefix="/platform-dashboard",
    tags=["Platform Dashboard"],
)


@router.get("/components", response_model=PlatformComponentsResponse)
def get_platform_components(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return list_components(db)


@router.get("/stages", response_model=PlatformStagesResponse)
def get_platform_stages(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return list_stages(db)


@router.get("/tasks", response_model=list[PlatformTaskRead])
def get_platform_tasks(
    stage_id: int | None = Query(default=None),
    component_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return list_tasks(db, stage_id=stage_id, component_id=component_id)


@router.get("/activities", response_model=list[PlatformActivityRead])
def get_platform_activities(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return list_activities(db)


@router.get("/summary", response_model=PlatformDashboardSummaryRead)
def get_platform_dashboard_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_dashboard_summary(db)


@router.post("/refresh", response_model=PlatformDashboardRefreshRead)
def refresh_platform_dashboard_endpoint(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = refresh_platform_dashboard(db, initiated_by=current_user)
    return PlatformDashboardRefreshRead(
        components_count=result.components_count,
        stages_count=result.stages_count,
        activities_added=result.activities_added,
        overall_readiness=result.overall_readiness,
        refreshed_at=datetime.fromisoformat(result.refreshed_at.replace("Z", "+00:00")),
        analyzer_version=result.analyzer_version,
        analyzer_hash=result.analyzer_hash,
        current_analyzer_hash=result.analyzer_hash,
        is_stale=False,
    )
