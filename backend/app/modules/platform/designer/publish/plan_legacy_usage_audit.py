"""Read-only audit of published Plan views — legacy vs roleMapping usage."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

from app.modules.platform.designer.publish.object_view_contract import (
    PLAN_LEGACY_FIELD_KEY_BY_ROLE,
    PLAN_REQUIRED_ROLE_KEYS,
    resolve_uses_legacy_plan_fields,
)

PLAN_LEGACY_PRESENTATION_KEYS = tuple(PLAN_LEGACY_FIELD_KEY_BY_ROLE.values())


@dataclass(frozen=True)
class PlanLegacyUsageEntry:
    id: str
    tenant_id: int
    workspace: str | None
    object_type_key: str
    object_type_name: str
    tab_key: str
    tab_name: str
    uses_legacy_plan_fields: bool
    role_mapping: dict[str, str]
    legacy: dict[str, str]
    category: str
    risk: str
    duplicate_role_mapping_and_legacy: bool
    uses_fallback: bool


@dataclass
class PlanLegacyUsageSummary:
    total: int = 0
    via_role_mapping: int = 0
    via_legacy: int = 0
    mixed: int = 0
    legacy_only: int = 0
    fallback_only: int = 0
    duplicate_role_mapping_and_legacy: int = 0
    high_risk: int = 0
    medium_risk: int = 0
    low_risk: int = 0
    legacy_percent: float = 0.0
    removal_readiness_percent: int = 0
    legacy_keys_in_snapshot: int = 0
    audited_at: str | None = None
    catalog_version: int | None = None
    entries: list[PlanLegacyUsageEntry] = field(default_factory=list)


def _read_optional_key(value: Any) -> str:
    return str(value or "").strip()


def _extract_role_mapping(settings_json: dict[str, Any]) -> dict[str, str]:
    object_view = settings_json.get("objectView")
    if not isinstance(object_view, dict):
        return {}

    role_mapping = object_view.get("roleMapping")
    if not isinstance(role_mapping, dict):
        return {}

    return {
        str(role): _read_optional_key(field_key)
        for role, field_key in role_mapping.items()
        if _read_optional_key(role) and _read_optional_key(field_key)
    }


def _extract_plan_presentation(settings_json: dict[str, Any]) -> dict[str, Any]:
    object_view = settings_json.get("objectView")
    if not isinstance(object_view, dict):
        return {}

    presentation = object_view.get("presentation")
    if not isinstance(presentation, dict):
        return {}

    plan = presentation.get("plan")
    return dict(plan) if isinstance(plan, dict) else {}


def _extract_legacy_keys(plan_presentation: dict[str, Any]) -> dict[str, str]:
    return {
        key: _read_optional_key(plan_presentation.get(key))
        for key in PLAN_LEGACY_PRESENTATION_KEYS
        if _read_optional_key(plan_presentation.get(key))
    }


def _has_required_role_mapping(role_mapping: dict[str, str]) -> bool:
    return all(_read_optional_key(role_mapping.get(role)) for role in PLAN_REQUIRED_ROLE_KEYS)


def _has_any_role_mapping(role_mapping: dict[str, str]) -> bool:
    return any(_read_optional_key(role_mapping.get(role)) for role in role_mapping)


def classify_plan_legacy_usage(
    *,
    role_mapping: dict[str, str],
    legacy: dict[str, str],
    uses_legacy_plan_fields: bool,
) -> tuple[str, str, bool, bool]:
    has_role_mapping = _has_any_role_mapping(role_mapping)
    has_required_role_mapping = _has_required_role_mapping(role_mapping)
    has_legacy = bool(legacy)
    uses_fallback = not has_role_mapping and not has_legacy
    duplicate = has_required_role_mapping and has_legacy

    if uses_fallback:
        category = "fallback"
    elif has_required_role_mapping and not has_legacy:
        category = "roleMapping"
    elif has_role_mapping and has_legacy:
        category = "mixed"
    elif has_legacy and not has_role_mapping:
        category = "legacyOnly"
    elif uses_legacy_plan_fields:
        category = "legacy"
    elif has_role_mapping:
        category = "mixed"
    else:
        category = "roleMapping"

    if uses_fallback:
        risk = "fallback"
    elif uses_legacy_plan_fields and not has_role_mapping:
        risk = "high"
    elif uses_legacy_plan_fields and has_role_mapping:
        risk = "medium"
    else:
        risk = "low"

    return category, risk, duplicate, uses_fallback


def resolve_legacy_removal_readiness_percent(*, total: int, legacy_count: int) -> int:
    if total <= 0:
        return 100

    legacy_percent = (legacy_count / total) * 100.0
    if legacy_count == 0:
        return 100
    if legacy_percent < 10:
        return 75
    if legacy_percent < 50:
        return 50
    return 25


def audit_published_plan_view(
    *,
    view: dict[str, Any],
    object_type: dict[str, Any],
    tenant_id: int,
    workspace: str | None = None,
) -> PlanLegacyUsageEntry | None:
    if str(view.get("view_type") or "").strip().lower() != "plan":
        return None

    if view.get("is_active") is False:
        return None

    settings_json = view.get("settings_json")
    if not isinstance(settings_json, dict):
        settings_json = {}

    role_mapping = _extract_role_mapping(settings_json)
    plan_presentation = _extract_plan_presentation(settings_json)
    legacy = _extract_legacy_keys(plan_presentation)

    uses_legacy_plan_fields = plan_presentation.get("usesLegacyPlanFields")
    if not isinstance(uses_legacy_plan_fields, bool):
        uses_legacy_plan_fields = resolve_uses_legacy_plan_fields(role_mapping, plan_presentation)

    category, risk, duplicate, uses_fallback = classify_plan_legacy_usage(
        role_mapping=role_mapping,
        legacy=legacy,
        uses_legacy_plan_fields=uses_legacy_plan_fields,
    )

    return PlanLegacyUsageEntry(
        id=str(view.get("id") or ""),
        tenant_id=tenant_id,
        workspace=workspace,
        object_type_key=str(object_type.get("key") or ""),
        object_type_name=str(object_type.get("name") or ""),
        tab_key=str(view.get("key") or ""),
        tab_name=str(view.get("name") or ""),
        uses_legacy_plan_fields=uses_legacy_plan_fields,
        role_mapping=role_mapping,
        legacy=legacy,
        category=category,
        risk=risk,
        duplicate_role_mapping_and_legacy=duplicate,
        uses_fallback=uses_fallback,
    )


def summarize_plan_legacy_usage(entries: list[PlanLegacyUsageEntry]) -> PlanLegacyUsageSummary:
    summary = PlanLegacyUsageSummary(total=len(entries), entries=entries)

    for entry in entries:
        if entry.category == "roleMapping":
            summary.via_role_mapping += 1
        elif entry.category in {"legacy", "legacyOnly"}:
            summary.via_legacy += 1
        elif entry.category == "mixed":
            summary.mixed += 1
        elif entry.category == "fallback":
            summary.fallback_only += 1

        if entry.category == "legacyOnly":
            summary.legacy_only += 1
        if entry.duplicate_role_mapping_and_legacy:
            summary.duplicate_role_mapping_and_legacy += 1
        if entry.risk == "high":
            summary.high_risk += 1
        elif entry.risk == "medium":
            summary.medium_risk += 1
        elif entry.risk == "low":
            summary.low_risk += 1

    legacy_dependent_count = sum(1 for entry in entries if entry.uses_legacy_plan_fields)
    summary.legacy_percent = (
        round((legacy_dependent_count / summary.total) * 100.0, 1) if summary.total else 0.0
    )
    summary.removal_readiness_percent = resolve_legacy_removal_readiness_percent(
        total=summary.total,
        legacy_count=legacy_dependent_count,
    )
    summary.legacy_keys_in_snapshot = sum(len(entry.legacy) for entry in entries)
    return summary


def audit_catalog_payload(
    payload: dict[str, Any],
    *,
    tenant_id: int,
    workspace_by_view_id: dict[str, str] | None = None,
) -> PlanLegacyUsageSummary:
    entries: list[PlanLegacyUsageEntry] = []
    workspace_by_view_id = workspace_by_view_id or {}

    for object_type in payload.get("object_types") or []:
        if not isinstance(object_type, dict):
            continue

        for view in object_type.get("views") or []:
            if not isinstance(view, dict):
                continue

            view_id = str(view.get("id") or "")
            entry = audit_published_plan_view(
                view=view,
                object_type=object_type,
                tenant_id=tenant_id,
                workspace=workspace_by_view_id.get(view_id),
            )
            if entry is not None:
                entries.append(entry)

    return summarize_plan_legacy_usage(entries)


def plan_legacy_usage_to_dict(summary: PlanLegacyUsageSummary) -> dict[str, Any]:
    return {
        "total": summary.total,
        "viaRoleMapping": summary.via_role_mapping,
        "viaLegacy": summary.via_legacy,
        "mixed": summary.mixed,
        "legacyOnly": summary.legacy_only,
        "fallbackOnly": summary.fallback_only,
        "duplicateRoleMappingAndLegacy": summary.duplicate_role_mapping_and_legacy,
        "highRisk": summary.high_risk,
        "mediumRisk": summary.medium_risk,
        "lowRisk": summary.low_risk,
        "legacyPercent": summary.legacy_percent,
        "removalReadinessPercent": summary.removal_readiness_percent,
        "mixedPlans": summary.mixed,
        "legacyKeysInSnapshot": summary.legacy_keys_in_snapshot,
        "auditedAt": summary.audited_at,
        "catalogVersion": summary.catalog_version,
        "entries": [asdict(entry) for entry in summary.entries],
    }
