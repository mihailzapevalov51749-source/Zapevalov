"""Owner Dashboard read adapter — projects existing read models through owner_dashboard_catalog."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.modules.platform_dashboard.company_workspaces import (
    COMPANY_WORKSPACES_ARCHITECTURE_RULE,
    COMPANY_WORKSPACES_SUMMARY,
)
from app.modules.platform_dashboard.owner_dashboard_catalog import (
    COMMUNICATION_ENGINE_KEY,
    FORBIDDEN_OWNER_LABEL_PATTERNS,
    MVP_ACTIVITY_TYPES,
    OWNER_DASHBOARD_CATALOG_VERSION,
    OWNER_SECTIONS,
    OwnerSectionDefinition,
    OwnerSourceKind,
    OwnerStageDefinition,
    OwnerStepDefinition,
    PRIMARY_COMPONENT_OWNER,
    ReadinessRule,
    StepDataKind,
    history_event_for_activity,
    primary_components_for_engine,
)
from app.modules.platform_dashboard.schemas import (
    CompanyWorkspaceRead,
    PlatformActivityRead,
    PlatformComponentRead,
    PlatformGovernanceRead,
    PlatformImplementationStageRead,
)
from app.modules.platform_dashboard.service import (
    build_dashboard_freshness,
    get_dashboard_meta,
    list_activities,
    list_components,
    list_stages,
    serialize_governance_model,
)
from app.modules.platform_dashboard.yasii_catalog import work_items_by_stage
from app.modules.platform_dashboard.yasii_sync import (
    compute_release_done_keys,
    load_yasii_item_passed_from_db,
)
from app.modules.platform_dashboard_analyzer.stage_works import STAGE_CANONICAL

_DONE_STATUSES = frozenset({"done"})
_IN_PROGRESS_STATUSES = frozenset({"in_progress", "review"})

_FORBIDDEN_TITLE_RE = re.compile(
    "|".join(pattern.replace("(?i)", "") for pattern in FORBIDDEN_OWNER_LABEL_PATTERNS),
    re.IGNORECASE,
)


class OwnerHistoryEvent(BaseModel):
    id: str
    group_key: str
    title: str
    description: str = ""
    occurred_at: datetime
    initiated_by: str | None = None
    related_section: str | None = None
    related_stage_key: str | None = None
    meta: dict[str, Any] = Field(default_factory=dict)


class OwnerStageView(BaseModel):
    id: str
    title: str
    description: str = ""
    readiness: int | None = None
    done: list[str] = Field(default_factory=list)
    inWork: list[str] = Field(default_factory=list)
    remaining: list[str] = Field(default_factory=list)
    meta: dict[str, Any] = Field(default_factory=dict)


class OwnerSectionView(BaseModel):
    key: str
    title: str
    kind: str
    stages: list[OwnerStageView] = Field(default_factory=list)
    events: list[OwnerHistoryEvent] = Field(default_factory=list)


class OwnerDashboardView(BaseModel):
    catalog_version: str = OWNER_DASHBOARD_CATALOG_VERSION
    refreshed_at: datetime | None = None
    sections: list[OwnerSectionView] = Field(default_factory=list)


def _unique_strings(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        text = str(item or "").strip()
        if not text or text in seen:
            continue
        seen.add(text)
        result.append(text)
    return result


def _sanitize_owner_text(text: str) -> str:
    cleaned = str(text or "").strip()
    if not cleaned:
        return cleaned
    cleaned = _FORBIDDEN_TITLE_RE.sub("", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip(" -–—")


def _normalize_work_line(line: str) -> str:
    text = _sanitize_owner_text(line)
    text = re.sub(r"(?i)\s*—\s*already done\s*$", "", text).strip()
    text = re.sub(r"(?i)\s*—\s*COMPLETED\s*$", "", text).strip()
    return text


def _component_map(components: list[PlatformComponentRead]) -> dict[str, PlatformComponentRead]:
    return {component.slug: component for component in components}


def _stage_map(stages: list[PlatformImplementationStageRead]) -> dict[str, PlatformImplementationStageRead]:
    return {stage.slug: stage for stage in stages}


def _min_readiness(values: list[int | None]) -> int | None:
    nums = [value for value in values if value is not None]
    if not nums:
        return None
    return round(min(nums))


def _component_is_done(component: PlatformComponentRead) -> bool:
    return (component.status or "").strip().lower() in _DONE_STATUSES


def _component_is_in_progress(component: PlatformComponentRead) -> bool:
    return (component.status or "").strip().lower() in _IN_PROGRESS_STATUSES


def _classify_component_step(component: PlatformComponentRead, step_title: str) -> tuple[bool, bool, bool]:
    if _component_is_done(component):
        return True, False, False
    if _component_is_in_progress(component):
        return False, True, False
    remaining_items = [_normalize_work_line(item) for item in component.remaining_items if _normalize_work_line(item)]
    if remaining_items:
        return False, False, True
    return False, False, True


def _resolve_static_step(step: OwnerStepDefinition) -> tuple[bool, bool, bool]:
    if step.data_kind in (StepDataKind.PLACEHOLDER, StepDataKind.STATIC_DATA, StepDataKind.FUTURE_SCAN):
        return False, False, True
    if step.data_kind == StepDataKind.DOC_DATA:
        return False, False, True
    if step.data_kind == StepDataKind.YASII_MILESTONE:
        return False, False, True
    return False, False, True


def _resolve_platform_component_step(
    step: OwnerStepDefinition,
    components: dict[str, PlatformComponentRead],
    engine_key: str,
) -> tuple[bool, bool, bool]:
    owner = PRIMARY_COMPONENT_OWNER.get(step.source_ref.key)
    if owner and owner != engine_key:
        return False, False, False

    component = components.get(step.source_ref.key)
    if component is None:
        return _resolve_static_step(step)

    if step.data_kind != StepDataKind.REAL_DATA:
        return _resolve_static_step(step)

    return _classify_component_step(component, step.title)


def _resolve_architecture_debt_step(
    step: OwnerStepDefinition,
    components: dict[str, PlatformComponentRead],
) -> tuple[bool, bool, bool]:
    debt_key = step.source_ref.key
    for component in components.values():
        for debt_item in component.architecture_debt:
            if debt_key.casefold() in debt_item.casefold():
                if _component_is_done(component):
                    return True, False, False
                if _component_is_in_progress(component):
                    return False, True, False
                return False, False, True
    return False, False, True


def _collect_implementation_stage_lists(
    stage_def: OwnerStageDefinition,
    impl_stages: dict[str, PlatformImplementationStageRead],
) -> tuple[list[str], list[str], list[str], list[int | None]]:
    slugs = tuple(stage_def.meta.get("implementation_stage_slugs") or ())
    done: list[str] = []
    in_work: list[str] = []
    remaining: list[str] = []
    readiness_values: list[int | None] = []

    for slug in slugs:
        impl = impl_stages.get(slug)
        if impl is None:
            canonical = STAGE_CANONICAL.get(slug, {}).get("works", [])
            remaining.extend(_normalize_work_line(item) for item in canonical)
            continue

        readiness_values.append(impl.readiness)
        done.extend(_normalize_work_line(item) for item in impl.completed_items)
        in_work.extend(_normalize_work_line(item) for item in impl.current_tasks)
        remaining.extend(_normalize_work_line(item) for item in impl.next_tasks)
        remaining.extend(_normalize_work_line(item) for item in impl.remaining_items)

    return done, in_work, remaining, readiness_values


def _yasii_milestone_pass_rate(
    milestone_key: str,
    release_done_keys: set[str],
) -> tuple[int | None, bool, bool, bool]:
    slugs = [part.strip() for part in milestone_key.split(",") if part.strip()]
    work_items = [item for slug in slugs for item in work_items_by_stage(slug)]
    if not work_items:
        return None, False, False, True

    total = len(work_items)
    passed = sum(1 for item in work_items if item.key in release_done_keys)

    rate = round(100 * passed / total) if total else None
    if passed >= total:
        return rate, True, False, False
    if passed > 0:
        return rate, False, True, False
    return rate, False, False, True


def _resolve_yasii_milestone_step(
    step: OwnerStepDefinition,
    release_done_keys: set[str],
) -> tuple[bool, bool, bool]:
    _, done, in_work, remaining = _yasii_milestone_pass_rate(step.source_ref.key, release_done_keys)
    return done, in_work, remaining


def _resolve_governance_field_step(
    step: OwnerStepDefinition,
    governance: PlatformGovernanceRead | None,
    *,
    is_stale: bool | None,
) -> tuple[bool, bool, bool]:
    key = step.source_ref.key
    if key == "governance_api":
        if governance is not None:
            return True, False, False
        return False, False, True
    if key == "dashboard_freshness":
        if is_stale is False:
            return True, False, False
        if is_stale is True:
            return False, True, False
        return False, False, True
    return _resolve_static_step(step)


def _resolve_company_workspace_step(
    step: OwnerStepDefinition,
    workspace: CompanyWorkspaceRead,
) -> tuple[bool, bool, bool]:
    if step.source_ref.key == "status":
        if (workspace.status or "").strip().lower() == "active":
            return True, False, False
        return False, True, False
    return _resolve_static_step(step)


def _build_step_lists(
    stage_def: OwnerStageDefinition,
    *,
    components: dict[str, PlatformComponentRead],
    impl_stages: dict[str, PlatformImplementationStageRead],
    governance: PlatformGovernanceRead | None,
    workspace: CompanyWorkspaceRead | None,
    is_stale: bool | None,
    release_done_keys: set[str],
) -> tuple[list[str], list[str], list[str]]:
    done: list[str] = []
    in_work: list[str] = []
    remaining: list[str] = []

    if stage_def.meta.get("uses_implementation_stage_works"):
        d, w, r, _ = _collect_implementation_stage_lists(stage_def, impl_stages)
        done.extend(d)
        in_work.extend(w)
        remaining.extend(r)
        return _unique_strings(done), _unique_strings(in_work), _unique_strings(remaining)

    for step in stage_def.steps:
        if step.source_ref.kind == OwnerSourceKind.PLATFORM_COMPONENT:
            d, w, r = _resolve_platform_component_step(step, components, stage_def.key)
        elif step.source_ref.kind == OwnerSourceKind.ARCHITECTURE_DEBT:
            d, w, r = _resolve_architecture_debt_step(step, components)
        elif step.source_ref.kind == OwnerSourceKind.YASII_MILESTONE:
            d, w, r = _resolve_yasii_milestone_step(step, release_done_keys)
        elif step.source_ref.kind == OwnerSourceKind.GOVERNANCE_FIELD:
            d, w, r = _resolve_governance_field_step(step, governance, is_stale=is_stale)
        elif step.source_ref.kind == OwnerSourceKind.COMPANY_WORKSPACE and workspace is not None:
            d, w, r = _resolve_company_workspace_step(step, workspace)
        else:
            d, w, r = _resolve_static_step(step)

        title = _sanitize_owner_text(step.title)
        if d:
            done.append(title)
        elif w:
            in_work.append(title)
        elif r:
            remaining.append(title)

    return _unique_strings(done), _unique_strings(in_work), _unique_strings(remaining)


def _engine_readiness(
    stage_def: OwnerStageDefinition,
    components: dict[str, PlatformComponentRead],
    impl_stages: dict[str, PlatformImplementationStageRead],
    governance: PlatformGovernanceRead | None,
    *,
    release_done_keys: set[str],
) -> int | None:
    if stage_def.meta.get("uses_implementation_stage_works"):
        _, _, _, readiness_values = _collect_implementation_stage_lists(stage_def, impl_stages)
        impl_readiness = _min_readiness(readiness_values)
        if impl_readiness is not None:
            return impl_readiness

    rule = stage_def.readiness_rule

    if rule == ReadinessRule.NONE:
        return None

    if rule == ReadinessRule.YASII_TRACK_RELEASE:
        if governance is None:
            return None
        value = governance.developmentWorkspace.yasiiTrackReadiness
        return value if value else None

    if rule == ReadinessRule.YASII_MILESTONE_PASS_RATE:
        rates: list[int] = []
        for step in stage_def.steps:
            if step.source_ref.kind == OwnerSourceKind.YASII_MILESTONE:
                rate, _, _, _ = _yasii_milestone_pass_rate(step.source_ref.key, release_done_keys)
                if rate is not None:
                    rates.append(rate)
        return round(sum(rates) / len(rates)) if rates else None

    if rule == ReadinessRule.COMPANY_FACET_RATE:
        return None

    primary_slugs = tuple(stage_def.meta.get("primary_components") or ()) or primary_components_for_engine(
        stage_def.key
    )
    if rule in (ReadinessRule.MIN_PRIMARY_COMPONENT, ReadinessRule.MIN_PRIMARY_COMPONENTS):
        values = [components[slug].readiness for slug in primary_slugs if slug in components]
        return _min_readiness(values)

    if rule == ReadinessRule.WEIGHTED_REAL_DOC_ONLY:
        weighted: list[tuple[int, int]] = []
        for step in stage_def.steps:
            if step.data_kind == StepDataKind.REAL_DATA and step.source_ref.kind == OwnerSourceKind.PLATFORM_COMPONENT:
                component = components.get(step.source_ref.key)
                if component is not None and component.readiness is not None:
                    weighted.append((component.readiness, step.source_ref.weight))
        if not weighted:
            return None
        total_weight = sum(weight for _, weight in weighted)
        if total_weight <= 0:
            return None
        return round(sum(value * weight for value, weight in weighted) / total_weight)

    return None


def _build_platform_stage(
    stage_def: OwnerStageDefinition,
    *,
    components: dict[str, PlatformComponentRead],
    impl_stages: dict[str, PlatformImplementationStageRead],
    governance: PlatformGovernanceRead | None,
    is_stale: bool | None,
    release_done_keys: set[str],
) -> OwnerStageView:
    done, in_work, remaining = _build_step_lists(
        stage_def,
        components=components,
        impl_stages=impl_stages,
        governance=governance,
        workspace=None,
        is_stale=is_stale,
        release_done_keys=release_done_keys,
    )
    readiness = _engine_readiness(
        stage_def, components, impl_stages, governance, release_done_keys=release_done_keys
    )
    meta = dict(stage_def.meta)
    if stage_def.key == COMMUNICATION_ENGINE_KEY:
        meta.setdefault("governance_slug", meta.get("governance_alias_of"))

    from app.modules.platform_dashboard.owner_content_normalization import (
        enrich_stage_meta,
        normalize_platform_stage_content,
    )

    stage = OwnerStageView(
        id=stage_def.key,
        title=stage_def.title,
        description=stage_def.description,
        readiness=readiness,
        done=done,
        inWork=in_work,
        remaining=remaining,
        meta=meta,
    )
    return normalize_platform_stage_content(enrich_stage_meta(stage))


def _build_development_stage(
    stage_def: OwnerStageDefinition,
    *,
    components: dict[str, PlatformComponentRead],
    impl_stages: dict[str, PlatformImplementationStageRead],
    governance: PlatformGovernanceRead | None,
    is_stale: bool | None,
    release_done_keys: set[str],
) -> OwnerStageView:
    done, in_work, remaining = _build_step_lists(
        stage_def,
        components=components,
        impl_stages=impl_stages,
        governance=governance,
        workspace=None,
        is_stale=is_stale,
        release_done_keys=release_done_keys,
    )
    readiness = _engine_readiness(
        stage_def, components, impl_stages, governance, release_done_keys=release_done_keys
    )

    if stage_def.key == "dev-yasii" and governance is not None:
        from app.modules.platform_dashboard.owner_content_normalization import rewrite_development_work_line

        focus = _sanitize_owner_text(governance.developmentWorkspace.currentFocus or "")
        if focus:
            focus_line = rewrite_development_work_line(focus) or "Текущий фокус программы ЯСИИ"
            in_work = _unique_strings([focus_line, *in_work])

    from app.modules.platform_dashboard.owner_content_normalization import normalize_development_stage_content

    stage = OwnerStageView(
        id=stage_def.key,
        title=stage_def.title,
        description=stage_def.description,
        readiness=readiness,
        done=done,
        inWork=in_work,
        remaining=remaining,
        meta=dict(stage_def.meta),
    )
    return normalize_development_stage_content(stage)


def _build_company_stage(
    stage_def: OwnerStageDefinition,
    workspace: CompanyWorkspaceRead,
    *,
    release_done_keys: set[str],
) -> OwnerStageView:
    done, in_work, remaining = _build_step_lists(
        stage_def,
        components={},
        impl_stages={},
        governance=None,
        workspace=workspace,
        is_stale=None,
        release_done_keys=release_done_keys,
    )
    from app.modules.platform_dashboard.owner_content_normalization import normalize_company_stage_content

    stage = OwnerStageView(
        id=f"{workspace.tenantId}:{stage_def.key}",
        title=stage_def.title,
        description=stage_def.description,
        readiness=None,
        done=done,
        inWork=in_work,
        remaining=remaining,
        meta={
            "tenantId": workspace.tenantId,
            "workspaceTitle": workspace.title,
            "architectureRule": COMPANY_WORKSPACES_ARCHITECTURE_RULE,
            "summary": COMPANY_WORKSPACES_SUMMARY,
        },
    )
    return normalize_company_stage_content(stage)


def _activity_owner_title(activity: PlatformActivityRead) -> str:
    definition = history_event_for_activity(activity.type)
    if definition is not None:
        return definition.title
    return _sanitize_owner_text(activity.title) or "Событие"


def _map_history_events(activities: list[PlatformActivityRead]) -> list[OwnerHistoryEvent]:
    events: list[OwnerHistoryEvent] = []
    for activity in activities:
        if activity.type not in MVP_ACTIVITY_TYPES:
            continue

        definition = history_event_for_activity(activity.type)
        if definition is None:
            continue

        events.append(
            OwnerHistoryEvent(
                id=str(activity.id),
                group_key=definition.group_key,
                title=_activity_owner_title(activity),
                description=_sanitize_owner_text(activity.description or activity.result or ""),
                occurred_at=activity.created_at,
                initiated_by=activity.initiated_by_name,
                meta={"activity_type": activity.type, "slug": activity.slug},
            ),
        )

    events.sort(key=lambda item: item.occurred_at, reverse=True)
    from app.modules.platform_dashboard.owner_content_normalization import normalize_owner_history_events

    return normalize_owner_history_events(events)


def _build_section_view(
    section_def: OwnerSectionDefinition,
    *,
    components: dict[str, PlatformComponentRead],
    impl_stages: dict[str, PlatformImplementationStageRead],
    governance: PlatformGovernanceRead | None,
    workspaces: list[CompanyWorkspaceRead],
    activities: list[PlatformActivityRead],
    is_stale: bool | None,
    release_done_keys: set[str],
) -> OwnerSectionView:
    if section_def.kind == "timeline":
        return OwnerSectionView(
            key=section_def.key,
            title=section_def.title,
            kind=section_def.kind,
            events=_map_history_events(activities),
        )

    stages: list[OwnerStageView] = []
    for stage_def in section_def.stages:
        if not stage_def.owner_visible:
            continue
        if section_def.key == "platform":
            stages.append(
                _build_platform_stage(
                    stage_def,
                    components=components,
                    impl_stages=impl_stages,
                    governance=governance,
                    is_stale=is_stale,
                    release_done_keys=release_done_keys,
                ),
            )
        elif section_def.key == "development":
            stages.append(
                _build_development_stage(
                    stage_def,
                    components=components,
                    impl_stages=impl_stages,
                    governance=governance,
                    is_stale=is_stale,
                    release_done_keys=release_done_keys,
                ),
            )
        elif section_def.key == "companies":
            for workspace in workspaces:
                stages.append(
                    _build_company_stage(stage_def, workspace, release_done_keys=release_done_keys)
                )

    return OwnerSectionView(
        key=section_def.key,
        title=section_def.title,
        kind=section_def.kind,
        stages=stages,
    )


def build_owner_dashboard_view(
    db: Session,
    *,
    components: list[PlatformComponentRead] | None = None,
    stages: list[PlatformImplementationStageRead] | None = None,
    governance: PlatformGovernanceRead | None = None,
    activities: list[PlatformActivityRead] | None = None,
) -> OwnerDashboardView:
    """Build OwnerDashboardView from existing dashboard read paths (no UI, no new ORM)."""
    if components is None:
        components = list_components(db).items
    if stages is None:
        stages_payload = list_stages(db)
        stages = stages_payload.items
        if governance is None:
            governance = stages_payload.governance
    if governance is None:
        governance = serialize_governance_model(db)
    if activities is None:
        activities = list_activities(db)

    component_by_slug = _component_map(components)
    impl_by_slug = _stage_map(stages)
    freshness = build_dashboard_freshness(db)
    meta = get_dashboard_meta(db)
    refreshed_at = meta.refreshed_at if meta is not None else freshness.refreshed_at

    workspaces = list(governance.companyWorkspaces.companyWorkspaces)
    item_passed = load_yasii_item_passed_from_db(db)
    release_done_keys = compute_release_done_keys(item_passed)

    sections = [
        _build_section_view(
            section_def,
            components=component_by_slug,
            impl_stages=impl_by_slug,
            governance=governance,
            workspaces=workspaces,
            activities=activities,
            is_stale=freshness.is_stale,
            release_done_keys=release_done_keys,
        )
        for section_def in OWNER_SECTIONS
    ]

    return OwnerDashboardView(
        catalog_version=OWNER_DASHBOARD_CATALOG_VERSION,
        refreshed_at=refreshed_at,
        sections=sections,
    )
