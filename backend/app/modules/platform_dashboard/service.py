import json
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.modules.platform_dashboard.models import (
    PlatformActivity,
    PlatformComponent,
    PlatformDashboardMeta,
    PlatformImplementationStage,
    PlatformTask,
)
from app.modules.platform_dashboard.schemas import (
    PlatformActivityRead,
    PlatformComponentRead,
    PlatformComponentRelatedIssueRead,
    PlatformComponentsResponse,
    PlatformDashboardFreshnessRead,
    PlatformDashboardSummaryRead,
    PlatformImplementationStageRead,
    PlatformStagesResponse,
    PlatformTaskRead,
    parse_json_list,
    parse_json_object,
)
from app.modules.platform_dashboard_analyzer.fingerprint import compute_analyzer_fingerprint
from app.modules.platform_dashboard_analyzer.paths import get_repo_root
from app.modules.quality_issues.constants import QualityIssueStatus
from app.modules.quality_issues.models import QualityIssue


def dump_json_list(items: list[str]) -> str:
    return json.dumps(items, ensure_ascii=False)


def get_dashboard_meta(db: Session) -> PlatformDashboardMeta | None:
    return db.query(PlatformDashboardMeta).filter(PlatformDashboardMeta.id == 1).one_or_none()


def ensure_dashboard_meta(db: Session) -> PlatformDashboardMeta:
    meta = get_dashboard_meta(db)
    if meta is None:
        meta = PlatformDashboardMeta(id=1)
        db.add(meta)
        db.flush()
    return meta


def build_dashboard_freshness(db: Session, repo_root=None) -> PlatformDashboardFreshnessRead:
    fingerprint = compute_analyzer_fingerprint(repo_root or get_repo_root())
    meta = get_dashboard_meta(db)
    stored_hash = meta.analyzer_hash if meta else None
    refreshed_at = meta.refreshed_at if meta else None
    is_stale = stored_hash is None or stored_hash != fingerprint.hash

    return PlatformDashboardFreshnessRead(
        refreshed_at=refreshed_at,
        analyzer_version=fingerprint.version,
        analyzer_hash=stored_hash,
        current_analyzer_hash=fingerprint.hash,
        is_stale=is_stale,
    )


COMPONENT_ISSUE_AREAS: dict[str, list[str]] = {
    "object-platform": ["architecture", "other"],
    "object-type": ["views", "architecture", "publish"],
    "publish": ["publish", "navigation"],
    "runtime-entity": ["views", "architecture", "cards"],
    "object-card": ["cards", "notifications"],
    "relations": ["architecture", "views"],
    "search": ["architecture"],
    "permissions": ["access", "architecture"],
    "ai-context": ["architecture", "other"],
}


def _related_issues_for_component(
    component: PlatformComponent,
    issues: list[QualityIssue],
) -> list[PlatformComponentRelatedIssueRead]:
    areas = set(COMPONENT_ISSUE_AREAS.get(component.slug, ["architecture", "other"]))
    title_needle = component.title.lower()
    slug_needle = component.slug.replace("-", " ")

    related: list[PlatformComponentRelatedIssueRead] = []
    for issue in issues:
        if issue.status == QualityIssueStatus.CLOSED.value:
            continue
        haystack = f"{issue.title} {issue.description or ''} {issue.current_behavior or ''}".lower()
        if issue.area in areas or title_needle in haystack or slug_needle in haystack:
            related.append(
                PlatformComponentRelatedIssueRead(
                    id=issue.id,
                    title=issue.title,
                    status=issue.status,
                )
            )
    return related


def serialize_component(
    component: PlatformComponent,
    issues: list[QualityIssue],
) -> PlatformComponentRead:
    return PlatformComponentRead(
        id=component.id,
        slug=component.slug,
        title=component.title,
        description=component.description,
        status=component.status,
        readiness=component.cached_readiness,
        completed_items=parse_json_list(component.completed_items),
        remaining_items=parse_json_list(component.remaining_items),
        dependencies=parse_json_list(component.dependencies),
        architecture_debt=parse_json_list(component.architecture_debt),
        related_issues=_related_issues_for_component(component, issues),
        updated_at=component.updated_at,
    )


def serialize_stage(stage: PlatformImplementationStage) -> PlatformImplementationStageRead:
    return PlatformImplementationStageRead(
        id=stage.id,
        slug=stage.slug,
        title=stage.title,
        description=stage.description,
        status=stage.status,
        readiness=stage.cached_readiness,
        order_index=stage.order_index,
        current_position=stage.current_position,
        completed_items=parse_json_list(stage.completed_items),
        remaining_items=parse_json_list(stage.remaining_items),
        current_tasks=parse_json_list(stage.current_tasks),
        next_tasks=parse_json_list(stage.next_tasks),
        blockers=parse_json_list(stage.blockers),
        completion_criteria=parse_json_list(stage.completion_criteria),
        updated_at=stage.updated_at,
    )


def list_components(db: Session) -> PlatformComponentsResponse:
    components = (
        db.query(PlatformComponent)
        .order_by(PlatformComponent.id.asc())
        .all()
    )
    open_issues = (
        db.query(QualityIssue)
        .filter(QualityIssue.status != QualityIssueStatus.CLOSED.value)
        .all()
    )
    items = [serialize_component(component, open_issues) for component in components]
    return PlatformComponentsResponse(items=items, freshness=build_dashboard_freshness(db))


def list_stages(db: Session) -> PlatformStagesResponse:
    stages = (
        db.query(PlatformImplementationStage)
        .order_by(PlatformImplementationStage.order_index.asc(), PlatformImplementationStage.id.asc())
        .all()
    )
    items = [serialize_stage(stage) for stage in stages]
    return PlatformStagesResponse(items=items, freshness=build_dashboard_freshness(db))


def list_tasks(
    db: Session,
    *,
    stage_id: int | None = None,
    component_id: int | None = None,
) -> list[PlatformTaskRead]:
    query = db.query(PlatformTask)

    if stage_id is not None:
        query = query.filter(PlatformTask.stage_id == stage_id)
    if component_id is not None:
        query = query.filter(PlatformTask.component_id == component_id)

    tasks = query.order_by(PlatformTask.id.asc()).all()
    return [PlatformTaskRead.model_validate(task) for task in tasks]


def serialize_activity(activity: PlatformActivity) -> PlatformActivityRead:
    return PlatformActivityRead(
        id=activity.id,
        slug=activity.slug,
        title=activity.title,
        description=activity.description,
        result=activity.result,
        type=activity.type,
        meta=parse_json_object(activity.meta_json),
        initiated_by_user_id=activity.initiated_by_user_id,
        initiated_by_name=activity.initiated_by_name,
        created_at=activity.created_at,
        related_stage_id=activity.related_stage_id,
        related_component_id=activity.related_component_id,
        related_issue_id=activity.related_issue_id,
    )


def list_activities(db: Session) -> list[PlatformActivityRead]:
    activities = (
        db.query(PlatformActivity)
        .order_by(PlatformActivity.created_at.desc(), PlatformActivity.id.desc())
        .all()
    )
    return [serialize_activity(activity) for activity in activities]


def _resolve_dashboard_last_updated(db: Session) -> datetime | None:
    timestamps: list[datetime] = []

    for value in (
        db.query(func.max(PlatformComponent.updated_at)).scalar(),
        db.query(func.max(PlatformImplementationStage.updated_at)).scalar(),
        db.query(func.max(PlatformTask.updated_at)).scalar(),
    ):
        if value:
            timestamps.append(value)

    latest_refresh = (
        db.query(func.max(PlatformActivity.created_at))
        .filter(PlatformActivity.slug.like("dashboard-refresh-%"))
        .scalar()
    )
    if latest_refresh:
        timestamps.append(latest_refresh)

    return max(timestamps) if timestamps else None


def get_dashboard_summary(db: Session) -> PlatformDashboardSummaryRead:
    components_count = db.query(func.count(PlatformComponent.id)).scalar() or 0
    stages_count = db.query(func.count(PlatformImplementationStage.id)).scalar() or 0
    tasks_total = db.query(func.count(PlatformTask.id)).scalar() or 0
    tasks_done = (
        db.query(func.count(PlatformTask.id))
        .filter(PlatformTask.status == "done")
        .scalar()
        or 0
    )
    issues_total = db.query(func.count(QualityIssue.id)).scalar() or 0
    issues_open = (
        db.query(func.count(QualityIssue.id))
        .filter(QualityIssue.status != QualityIssueStatus.CLOSED.value)
        .scalar()
        or 0
    )

    readiness_values = [
        value
        for value, in db.query(PlatformComponent.cached_readiness).all()
        if value is not None
    ]
    overall_readiness = (
        round(sum(readiness_values) / len(readiness_values))
        if readiness_values
        else None
    )

    last_updated = _resolve_dashboard_last_updated(db)
    freshness = build_dashboard_freshness(db)
    refreshed_at = freshness.refreshed_at or last_updated

    return PlatformDashboardSummaryRead(
        last_updated=last_updated,
        refreshed_at=refreshed_at,
        analyzer_version=freshness.analyzer_version,
        analyzer_hash=freshness.analyzer_hash,
        current_analyzer_hash=freshness.current_analyzer_hash,
        is_stale=freshness.is_stale,
        components_count=components_count,
        stages_count=stages_count,
        tasks_total=tasks_total,
        tasks_done=tasks_done,
        issues_total=issues_total,
        issues_open=issues_open,
        overall_readiness=overall_readiness,
    )
