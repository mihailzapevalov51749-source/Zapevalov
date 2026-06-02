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
    BusinessAwarenessRead,
    DevelopmentIntelligenceFocusRead,
    DevelopmentIntelligenceNextStepRead,
    DevelopmentIntelligenceQualityRead,
    DevelopmentIntelligenceDebtRead,
    DevelopmentIntelligenceRiskItemRead,
    DevelopmentIntelligenceRisksRead,
    DevelopmentIntelligenceRead,
    DualReadinessRead,
    EmbeddedAiTrackRead,
    PlatformActivityRead,
    PlatformComponentRead,
    PlatformComponentRelatedIssueRead,
    DevelopmentWorkspaceGovernanceRead,
    PlatformComponentsResponse,
    PlatformDashboardFreshnessRead,
    PlatformDashboardSummaryRead,
    PlatformEngineStateRead,
    PlatformGovernanceRead,
    PlatformImplementationStageRead,
    PlatformLayerStateRead,
    PlatformStagesResponse,
    PlatformTaskRead,
    CompanyWorkspaceRead,
    CompanyWorkspacesStateRead,
    parse_json_list,
    parse_json_object,
)
from app.modules.platform_dashboard.yasii_catalog import YASII_IMPLEMENTATION_STAGE_SLUG
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


def _serialize_embedded_ai_tracks(
    rollups,
) -> tuple[int | None, int | None, list[EmbeddedAiTrackRead] | None]:
    if rollups is None:
        return None, None, None
    tracks = [
        EmbeddedAiTrackRead(
            slug=rollups.ace.slug,
            title=rollups.ace.title,
            readiness=rollups.ace.release_readiness,
            implementation_readiness=rollups.ace.implementation_readiness,
            release_readiness=rollups.ace.release_readiness,
            current_tasks=list(rollups.ace.current_tasks),
            next_tasks=list(rollups.ace.next_tasks),
            checks_passed=rollups.ace.checks_passed,
            checks_total=rollups.ace.checks_total,
        ),
        EmbeddedAiTrackRead(
            slug=rollups.yasii.slug,
            title=rollups.yasii.title,
            readiness=rollups.yasii.release_readiness,
            implementation_readiness=rollups.yasii.implementation_readiness,
            release_readiness=rollups.yasii.release_readiness,
            current_tasks=list(rollups.yasii.current_tasks),
            next_tasks=list(rollups.yasii.next_tasks),
            checks_passed=rollups.yasii.checks_passed,
            checks_total=rollups.yasii.checks_total,
        ),
    ]
    return rollups.ace.release_readiness, rollups.yasii.release_readiness, tracks


def serialize_governance_model(db: Session) -> PlatformGovernanceRead:
    from app.modules.yasii.unified_project_state import build_unified_project_state

    unified = build_unified_project_state(db)
    yasii = unified.developmentWorkspace.yasii
    return PlatformGovernanceRead(
        schemaVersion=unified.schemaVersion,
        sourceChain=list(unified.sourceChain),
        platform=PlatformLayerStateRead(
            overallReadiness=unified.platform.overallReadiness,
            engines=[
                PlatformEngineStateRead(
                    slug=engine.slug,
                    title=engine.title,
                    description=engine.description,
                    readiness=engine.readiness,
                    status=engine.status,
                    openIssueCount=engine.openIssueCount,
                    debtItemCount=engine.debtItemCount,
                    inDashboard=engine.inDashboard,
                    dashboardComponentSlugs=list(engine.dashboardComponentSlugs),
                )
                for engine in unified.platform.engines
            ],
            presentInDashboard=list(unified.platform.presentInDashboard),
            missingFromDashboard=list(unified.platform.missingFromDashboard),
        ),
        developmentWorkspace=DevelopmentWorkspaceGovernanceRead(
            currentStageSlug=unified.developmentWorkspace.currentStageSlug,
            currentStageTitle=unified.developmentWorkspace.currentStageTitle,
            currentFocus=unified.developmentWorkspace.currentFocus,
            activeWorkItems=list(unified.developmentWorkspace.activeWorkItems),
            blockedWorkItems=list(unified.developmentWorkspace.blockedWorkItems),
            qualityOpenCount=unified.developmentWorkspace.qualityOpenCount,
            qualityCriticalCount=unified.developmentWorkspace.qualityCriticalCount,
            containerReadiness=yasii.containerReleaseReadiness,
            containerImplementationReadiness=unified.containerImplementationReadiness,
            containerReleaseReadiness=unified.containerReleaseReadiness,
            yasiiTrackReadiness=yasii.yasiiTrackReleaseReadiness,
            yasiiImplementationReadiness=unified.yasiiImplementationReadiness,
            yasiiReleaseReadiness=unified.yasiiReleaseReadiness,
            governanceReleaseBlockerKey=unified.governanceReleaseBlockerKey,
            governanceReleaseBlockerLabel=unified.governanceReleaseBlockerLabel,
            governanceBlockedItems=list(unified.blockedByGovernance),
            sections=list(unified.developmentWorkspace.sections),
        ),
        companyWorkspaces=CompanyWorkspacesStateRead(
            companyWorkspaces=[
                CompanyWorkspaceRead(
                    tenantId=workspace.tenantId,
                    title=workspace.title,
                    status=workspace.status,
                    digitalModelReadiness=workspace.digitalModelReadiness,
                    users=workspace.users,
                    licenses=workspace.licenses,
                    permissions=workspace.permissions,
                    objects=workspace.objects,
                    processes=workspace.processes,
                    views=workspace.views,
                    note=workspace.note,
                    objectModelFacets=list(workspace.objectModelFacets),
                )
                for workspace in unified.companyWorkspaces.companyWorkspaces
            ],
            companyWorkspacesSummary=unified.companyWorkspaces.companyWorkspacesSummary,
            architectureRule=unified.companyWorkspaces.architectureRule,
        ),
    )


def _serialize_development_intelligence(stage_slug: str, db: Session) -> DevelopmentIntelligenceRead | None:
    if stage_slug != YASII_IMPLEMENTATION_STAGE_SLUG:
        return None
    from app.modules.yasii.development_intelligence import build_development_intelligence_snapshot

    snap = build_development_intelligence_snapshot(db)
    return DevelopmentIntelligenceRead(
        focus=DevelopmentIntelligenceFocusRead(
            title=snap.focus.title,
            reasoning=snap.focus.reasoning,
        ),
        quality=DevelopmentIntelligenceQualityRead(
            criticalCount=snap.quality.criticalCount,
            openCount=snap.quality.openCount,
            summary=snap.quality.summary,
            connected=snap.quality.connected,
        ),
        debt=DevelopmentIntelligenceDebtRead(
            highCount=snap.debt.highCount,
            summary=snap.debt.summary,
        ),
        risks=DevelopmentIntelligenceRisksRead(
            count=snap.risks.count,
            topRisks=[
                DevelopmentIntelligenceRiskItemRead(
                    title=r.title,
                    severity=r.severity,
                    reasoning=r.reasoning,
                )
                for r in snap.risks.topRisks[:5]
            ],
        ),
        nextStep=DevelopmentIntelligenceNextStepRead(
            title=snap.nextStep.title,
            businessImpact=snap.nextStep.businessImpact,
        ),
    )


def _serialize_business_awareness(stage_slug: str, db: Session) -> BusinessAwarenessRead | None:
    if stage_slug != YASII_IMPLEMENTATION_STAGE_SLUG:
        return None
    from app.modules.yasii.business_explanation import build_business_awareness_snapshot

    snapshot = build_business_awareness_snapshot(db)
    return BusinessAwarenessRead(
        current_effect=snapshot.currentEffect,
        next_effect=snapshot.nextEffect,
        stage_value=snapshot.stageValue,
    )


def serialize_stage(
    stage: PlatformImplementationStage,
    *,
    embedded_ai_rollups=None,
    db: Session | None = None,
) -> PlatformImplementationStageRead:
    is_yasii_container = stage.slug == YASII_IMPLEMENTATION_STAGE_SLUG
    ace_readiness, yasii_readiness, embedded_ai_tracks = _serialize_embedded_ai_tracks(
        embedded_ai_rollups if is_yasii_container else None
    )
    container_readiness = None
    implementation_readiness = None
    release_readiness = None
    governance_release_blocker = None
    governance_release_blocker_key = None
    implementation_completed_items: list[str] = []
    governance_blocked_items: list[str] = []
    if is_yasii_container and embedded_ai_rollups is not None:
        container_readiness = DualReadinessRead(
            implementation=embedded_ai_rollups.container_implementation_readiness,
            release=embedded_ai_rollups.container_release_readiness,
        )
        implementation_readiness = embedded_ai_rollups.container_implementation_readiness
        release_readiness = embedded_ai_rollups.container_release_readiness
        governance_release_blocker = embedded_ai_rollups.governance_release_blocker_label
        governance_release_blocker_key = embedded_ai_rollups.governance_release_blocker_key
        from app.modules.platform_dashboard.yasii_sync import classify_embedded_ai_stage_work_items

        impl_completed, _, _ = classify_embedded_ai_stage_work_items(
            set(embedded_ai_rollups.implementation_done_keys)
        )
        implementation_completed_items = impl_completed
        governance_blocked_items = list(embedded_ai_rollups.governance_blocked_work_items)
    business_awareness = (
        _serialize_business_awareness(stage.slug, db) if db is not None else None
    )
    development_intelligence = (
        _serialize_development_intelligence(stage.slug, db) if db is not None else None
    )
    return PlatformImplementationStageRead(
        id=stage.id,
        slug=stage.slug,
        title=stage.title,
        description=stage.description,
        status=stage.status,
        readiness=release_readiness if release_readiness is not None else stage.cached_readiness,
        implementation_readiness=implementation_readiness,
        release_readiness=release_readiness,
        container_readiness=container_readiness,
        ace_readiness=ace_readiness,
        yasii_readiness=yasii_readiness,
        governance_release_blocker=governance_release_blocker,
        governance_release_blocker_key=governance_release_blocker_key,
        implementation_completed_items=implementation_completed_items,
        governance_blocked_items=governance_blocked_items,
        embedded_ai_tracks=embedded_ai_tracks,
        business_awareness=business_awareness,
        development_intelligence=development_intelligence,
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
    from app.modules.platform_dashboard.yasii_sync import (
        compute_embedded_ai_rollups_from_db,
        ensure_yasii_track_loaded,
        yasii_track_is_loaded,
    )
    from app.modules.platform_dashboard_analyzer.refresh import build_scan_context

    if not yasii_track_is_loaded(db):
        ctx = build_scan_context()
        ensure_yasii_track_loaded(db, ctx)
        db.commit()

    embedded_ai_rollups = compute_embedded_ai_rollups_from_db(db)

    stages = (
        db.query(PlatformImplementationStage)
        .order_by(PlatformImplementationStage.order_index.asc(), PlatformImplementationStage.id.asc())
        .all()
    )
    items = [
        serialize_stage(
            stage,
            embedded_ai_rollups=embedded_ai_rollups
            if stage.slug == YASII_IMPLEMENTATION_STAGE_SLUG
            else None,
            db=db,
        )
        for stage in stages
    ]
    governance = serialize_governance_model(db)
    return PlatformStagesResponse(
        items=items,
        freshness=build_dashboard_freshness(db),
        governance=governance,
    )


def get_governance_model(db: Session) -> PlatformGovernanceRead:
    return serialize_governance_model(db)


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
