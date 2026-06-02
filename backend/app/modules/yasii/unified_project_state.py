"""Unified Project State (P13-W02) — single read-model for Dashboard and YASII.

Source chain (write path on refresh):
  Analyzer → platform_tasks (yasii_work_item) → done_keys → UnifiedProjectState

Read path:
  platform_tasks + platform_components + platform_implementation_stages + quality_issues
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.modules.platform_dashboard.models import (
    PlatformComponent,
    PlatformImplementationStage,
    PlatformTask,
)
from app.modules.platform_dashboard.company_workspaces import (
    COMPANY_WORKSPACES_ARCHITECTURE_RULE,
    COMPANY_WORKSPACES_SUMMARY,
    OBJECT_MODEL_COMPANY_FACETS,
)
from app.modules.platform_dashboard.platform_governance import (
    ARCHITECTURE_MAP_MISSING_FROM_DASHBOARD,
    ARCHITECTURE_MAP_PRESENT_IN_DASHBOARD,
    DEVELOPMENT_WORKSPACE_SECTIONS,
    PLATFORM_LAYER_ENGINES,
    PlatformEngineDefinition,
)
from app.modules.platform_dashboard.service import parse_json_list
from app.modules.platform_dashboard.yasii_catalog import (
    YASII_IMPLEMENTATION_STAGE_SLUG,
    YASII_WORK_ITEMS,
    YasiiWorkItemDefinition,
    stage_by_slug,
    work_items_by_stage,
)
from app.modules.platform_dashboard.yasii_sync import (
    YASII_TASK_KIND,
    _dependencies_satisfied,
    classify_embedded_ai_stage_work_items,
    classify_yasii_phases,
    build_embedded_ai_rollups,
    build_governance_blocked_work_item_labels,
    compute_implementation_done_keys,
    compute_release_done_keys,
    load_yasii_item_passed_from_db,
    parse_yasii_task_meta,
    resolve_active_yasii_phase_slug,
)
from app.modules.quality_issues.constants import QualityIssueStatus
from app.modules.quality_issues.models import QualityIssue
from app.modules.yasii.project_state_models import ProjectState

UNIFIED_PROJECT_STATE_SCHEMA_VERSION = "1.0.0"
SOURCE_CHAIN: tuple[str, ...] = (
    "analyzer",
    "platform_tasks",
    "done_keys",
    "unified_project_state",
    "dashboard",
    "yasii",
)


class PlatformEngineState(BaseModel):
    slug: str
    title: str
    description: str = ""
    readiness: int | None = None
    status: str = ""
    openIssueCount: int = 0
    debtItemCount: int = 0
    inDashboard: bool = True
    dashboardComponentSlugs: list[str] = Field(default_factory=list)


class PlatformLayerState(BaseModel):
    overallReadiness: int | None = None
    engines: list[PlatformEngineState] = Field(default_factory=list)
    presentInDashboard: list[str] = Field(default_factory=list)
    missingFromDashboard: list[str] = Field(default_factory=list)


class YasiiWorkItemSnapshot(BaseModel):
    key: str
    title: str = ""
    status: str = ""
    analyzerPassed: bool = False
    inDoneKeys: bool = False
    inImplementationDoneKeys: bool = False
    stageSlug: str = ""


class RoadmapStageSnapshot(BaseModel):
    slug: str
    title: str = ""
    readiness: int | None = None
    status: str = ""
    currentTasks: list[str] = Field(default_factory=list)
    isImplementationStage: bool = False


class DevelopmentWorkspaceState(BaseModel):
    currentStageSlug: str = ""
    currentStageTitle: str = ""
    currentFocus: str = ""
    activeWorkItems: list[str] = Field(default_factory=list)
    blockedWorkItems: list[str] = Field(default_factory=list)
    nextWorkItems: list[str] = Field(default_factory=list)
    yasii: ProjectState
    roadmapStages: list[RoadmapStageSnapshot] = Field(default_factory=list)
    sections: list[str] = Field(default_factory=list)
    qualityOpenCount: int = 0
    qualityCriticalCount: int = 0
    embeddedYasiiCurrent: list[str] = Field(default_factory=list)
    embeddedAceCurrent: list[str] = Field(default_factory=list)
    workItems: list[YasiiWorkItemSnapshot] = Field(default_factory=list)


class CompanyWorkspaceSnapshot(BaseModel):
    """Company workspace read-model. tenantId is infrastructure boundary only."""

    tenantId: str
    title: str = ""
    status: str = "active"
    digitalModelReadiness: int | None = None
    users: str = ""
    licenses: str = ""
    permissions: str = ""
    objects: str = ""
    processes: str = ""
    views: str = ""
    note: str = ""
    objectModelFacets: list[str] = Field(default_factory=list)


class CompanyWorkspacesState(BaseModel):
    companyWorkspaces: list[CompanyWorkspaceSnapshot] = Field(default_factory=list)
    companyWorkspacesSummary: str = ""
    architectureRule: str = Field(default=COMPANY_WORKSPACES_ARCHITECTURE_RULE)


class UnifiedProjectState(BaseModel):
    schemaVersion: str = Field(default=UNIFIED_PROJECT_STATE_SCHEMA_VERSION)
    sourceChain: list[str] = Field(default_factory=lambda: list(SOURCE_CHAIN))
    doneKeys: list[str] = Field(default_factory=list)
    implementationDoneKeys: list[str] = Field(default_factory=list)
    releaseDoneKeys: list[str] = Field(default_factory=list)
    containerImplementationReadiness: int = 0
    containerReleaseReadiness: int = 0
    yasiiImplementationReadiness: int = 0
    yasiiReleaseReadiness: int = 0
    governanceReleaseBlockerKey: str = ""
    governanceReleaseBlockerLabel: str = ""
    blockedByGovernance: list[str] = Field(default_factory=list)
    itemPassed: dict[str, bool] = Field(default_factory=dict)
    platform: PlatformLayerState
    developmentWorkspace: DevelopmentWorkspaceState
    companyWorkspaces: CompanyWorkspacesState


def _work_item_label(item: YasiiWorkItemDefinition) -> str:
    return f"{item.key} {item.title}"


def _load_task_status_by_key(db, stage_id: int) -> dict[str, dict[str, object]]:
    by_key: dict[str, dict[str, object]] = {}
    for task in db.query(PlatformTask).filter(PlatformTask.stage_id == stage_id).all():
        meta = parse_yasii_task_meta(task.description)
        if meta.get("kind") != YASII_TASK_KIND:
            continue
        key = str(meta.get("key") or "").strip()
        if not key:
            continue
        by_key[key] = {
            "status": task.status,
            "analyzer_passed": meta.get("analyzer_passed") is True,
        }
    return by_key


def _build_yasii_project_state(
    db,
    *,
    release_done_keys: set[str],
    implementation_done_keys: set[str],
    item_passed: dict[str, bool],
    rollups,
) -> ProjectState:
    done_keys = release_done_keys
    active_slug = resolve_active_yasii_phase_slug(done_keys)
    active_stage = stage_by_slug(active_slug)
    _phase_completed, _phase_current, _phase_next, phase_readiness = classify_yasii_phases(done_keys)
    _card_completed, card_current, card_next = classify_embedded_ai_stage_work_items(done_keys)

    completed = [_work_item_label(item) for item in YASII_WORK_ITEMS if item.key in release_done_keys]
    open_items = [_work_item_label(item) for item in YASII_WORK_ITEMS if item.key not in implementation_done_keys]
    governance_blocked = build_governance_blocked_work_item_labels(
        item_passed, implementation_done_keys, release_done_keys
    )
    blocked: list[str] = []
    for item in YASII_WORK_ITEMS:
        if item.key in done_keys:
            continue
        if not _dependencies_satisfied(item, done_keys):
            missing = [dep for dep in item.depends_on if dep not in done_keys]
            blocked.append(f"{item.key} {item.title} (ждёт: {', '.join(missing)})")

    active_work = list(card_current)
    if not active_work and open_items:
        for item in work_items_by_stage(active_slug):
            if item.key not in done_keys and _dependencies_satisfied(item, done_keys):
                active_work = [_work_item_label(item)]
                break

    return ProjectState(
        activeStageSlug=active_slug,
        activeStageTitle=active_stage.title if active_stage else active_slug,
        activeWorkItems=active_work,
        completedWorkItems=completed,
        blockedWorkItems=blocked[:12],
        openWorkItems=open_items[:20],
        containerReadiness=rollups.container_release_readiness,
        containerImplementationReadiness=rollups.container_implementation_readiness,
        containerReleaseReadiness=rollups.container_release_readiness,
        yasiiTrackReadiness=rollups.yasii.release_readiness,
        yasiiTrackImplementationReadiness=rollups.yasii.implementation_readiness,
        yasiiTrackReleaseReadiness=rollups.yasii.release_readiness,
        aceTrackReadiness=rollups.ace.release_readiness,
        aceTrackImplementationReadiness=rollups.ace.implementation_readiness,
        aceTrackReleaseReadiness=rollups.ace.release_readiness,
        governanceReleaseBlockerKey=rollups.governance_release_blocker_key or "",
        governanceReleaseBlockerLabel=rollups.governance_release_blocker_label or "",
        implementedNotReleasedWorkItems=governance_blocked,
        phaseReadiness=phase_readiness,
    )


def _build_platform_layer(db) -> PlatformLayerState:
    components = db.query(PlatformComponent).order_by(PlatformComponent.id.asc()).all()
    component_by_slug = {component.slug: component for component in components}
    open_issues = (
        db.query(QualityIssue)
        .filter(QualityIssue.status != QualityIssueStatus.CLOSED.value)
        .all()
    )

    readiness_values = [component.cached_readiness for component in components if component.cached_readiness is not None]
    overall = round(sum(readiness_values) / len(readiness_values)) if readiness_values else None

    engines: list[PlatformEngineState] = []
    for definition in PLATFORM_LAYER_ENGINES:
        related_issues = 0
        debt_count = 0
        readiness: int | None = None
        status = "planned"
        for slug in definition.dashboard_component_slugs:
            component = component_by_slug.get(slug)
            if component is None:
                continue
            if component.cached_readiness is not None:
                readiness = component.cached_readiness if readiness is None else min(readiness, component.cached_readiness)
            status = component.status or status
            debt_count += len(parse_json_list(component.architecture_debt))
            areas = {slug}
            for issue in open_issues:
                if issue.area in areas or slug.replace("-", " ") in (issue.title or "").casefold():
                    related_issues += 1

        engines.append(
            PlatformEngineState(
                slug=definition.slug,
                title=definition.title,
                description=definition.description,
                readiness=readiness,
                status=status if definition.in_dashboard else "not_tracked",
                openIssueCount=related_issues,
                debtItemCount=debt_count,
                inDashboard=definition.in_dashboard,
                dashboardComponentSlugs=list(definition.dashboard_component_slugs),
            ),
        )

    return PlatformLayerState(
        overallReadiness=overall,
        engines=engines,
        presentInDashboard=list(ARCHITECTURE_MAP_PRESENT_IN_DASHBOARD),
        missingFromDashboard=list(ARCHITECTURE_MAP_MISSING_FROM_DASHBOARD),
    )


def _build_roadmap_snapshots(db, *, implementation_slug: str) -> list[RoadmapStageSnapshot]:
    stages = (
        db.query(PlatformImplementationStage)
        .order_by(PlatformImplementationStage.order_index.asc())
        .all()
    )
    snapshots: list[RoadmapStageSnapshot] = []
    for stage in stages:
        if stage.slug.startswith("yasii-") and stage.slug != implementation_slug:
            continue
        snapshots.append(
            RoadmapStageSnapshot(
                slug=stage.slug,
                title=stage.title,
                readiness=stage.cached_readiness,
                status=stage.status or "",
                currentTasks=parse_json_list(stage.current_tasks),
                isImplementationStage=stage.slug == implementation_slug,
            ),
        )
    return snapshots


def _build_company_workspaces() -> CompanyWorkspacesState:
    object_model_note = (
        "Прикладная модель: " + ", ".join(OBJECT_MODEL_COMPANY_FACETS) + ". "
        "tenant_id — только техническая граница (изоляция, безопасность)."
    )
    return CompanyWorkspacesState(
        companyWorkspaces=[
            CompanyWorkspaceSnapshot(
                tenantId="default",
                title="Моя компания",
                status="active",
                digitalModelReadiness=None,
                users="Пользователи — через Object Model (Сотрудник)",
                licenses="Лицензии — через Object Model (Лицензия)",
                permissions="Права — Permission Engine + объектная модель",
                objects="Объекты — Object Engine",
                processes="Процессы — Process Engine",
                views="Представления — Views Engine",
                note=object_model_note,
                objectModelFacets=list(OBJECT_MODEL_COMPANY_FACETS),
            ),
        ],
        companyWorkspacesSummary=COMPANY_WORKSPACES_SUMMARY,
    )


def _count_quality(db) -> tuple[int, int]:
    open_issues = (
        db.query(QualityIssue)
        .filter(QualityIssue.status != QualityIssueStatus.CLOSED.value)
        .all()
    )
    critical = sum(
        1
        for issue in open_issues
        if str(issue.priority or "").strip().lower() == "high"
    )
    return len(open_issues), critical


def build_unified_project_state(db) -> UnifiedProjectState:
    item_passed = load_yasii_item_passed_from_db(db)
    implementation_done_keys = compute_implementation_done_keys(item_passed)
    release_done_keys = compute_release_done_keys(item_passed)
    rollups = build_embedded_ai_rollups(
        release_done_keys,
        item_passed,
        implementation_done_keys=implementation_done_keys,
    )
    yasii_state = _build_yasii_project_state(
        db,
        release_done_keys=release_done_keys,
        implementation_done_keys=implementation_done_keys,
        item_passed=item_passed,
        rollups=rollups,
    )

    container_stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == YASII_IMPLEMENTATION_STAGE_SLUG)
        .one_or_none()
    )
    task_by_key = (
        _load_task_status_by_key(db, container_stage.id) if container_stage is not None else {}
    )

    wi_snapshots: list[YasiiWorkItemSnapshot] = []
    for item in YASII_WORK_ITEMS:
        task = task_by_key.get(item.key, {})
        wi_snapshots.append(
            YasiiWorkItemSnapshot(
                key=item.key,
                title=item.title,
                status=str(task.get("status") or "unknown"),
                analyzerPassed=bool(task.get("analyzer_passed")),
                inDoneKeys=item.key in release_done_keys,
                inImplementationDoneKeys=item.key in implementation_done_keys,
                stageSlug=item.stage_slug,
            ),
        )

    quality_open, quality_critical = _count_quality(db)
    _card_completed, card_current, card_next = classify_embedded_ai_stage_work_items(release_done_keys)
    impl_completed, _, _ = classify_embedded_ai_stage_work_items(implementation_done_keys)

    development = DevelopmentWorkspaceState(
        currentStageSlug=yasii_state.activeStageSlug,
        currentStageTitle=yasii_state.activeStageTitle,
        currentFocus=card_current[0] if card_current else "",
        activeWorkItems=list(yasii_state.activeWorkItems),
        blockedWorkItems=list(yasii_state.blockedWorkItems),
        nextWorkItems=list(card_next[:8]),
        yasii=yasii_state,
        roadmapStages=_build_roadmap_snapshots(db, implementation_slug=YASII_IMPLEMENTATION_STAGE_SLUG),
        sections=[label for _slug, label in DEVELOPMENT_WORKSPACE_SECTIONS],
        qualityOpenCount=quality_open,
        qualityCriticalCount=quality_critical,
        embeddedYasiiCurrent=list(rollups.yasii.current_tasks),
        embeddedAceCurrent=list(rollups.ace.current_tasks),
        workItems=wi_snapshots,
    )

    return UnifiedProjectState(
        doneKeys=sorted(release_done_keys),
        implementationDoneKeys=sorted(implementation_done_keys),
        releaseDoneKeys=sorted(release_done_keys),
        containerImplementationReadiness=rollups.container_implementation_readiness,
        containerReleaseReadiness=rollups.container_release_readiness,
        yasiiImplementationReadiness=rollups.yasii.implementation_readiness,
        yasiiReleaseReadiness=rollups.yasii.release_readiness,
        governanceReleaseBlockerKey=rollups.governance_release_blocker_key or "",
        governanceReleaseBlockerLabel=rollups.governance_release_blocker_label or "",
        blockedByGovernance=list(rollups.governance_blocked_work_items),
        itemPassed=dict(item_passed),
        platform=_build_platform_layer(db),
        developmentWorkspace=development,
        companyWorkspaces=_build_company_workspaces(),
    )


def load_project_state_from_db(db) -> tuple[ProjectState, set[str], dict[str, bool]]:
    """Compatibility shim — delegates to Unified Project State."""
    unified = build_unified_project_state(db)
    return (
        unified.developmentWorkspace.yasii,
        set(unified.doneKeys),
        dict(unified.itemPassed),
    )
