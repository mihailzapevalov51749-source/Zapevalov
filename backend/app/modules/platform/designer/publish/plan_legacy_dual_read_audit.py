"""Read-only audit: Plan legacy dual-read tier usage (stage 5D.1)."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

from app.modules.platform.designer.publish.plan_legacy_usage_audit import (
    _extract_legacy_keys,
    _extract_plan_presentation,
    _extract_role_mapping,
    _has_any_role_mapping,
    _has_required_role_mapping,
    audit_catalog_payload,
    plan_legacy_usage_to_dict,
)

PLAN_LEGACY_RUNTIME_REFERENCES = (
    {
        "file": "frontend/src/modules/objectViews/plan/resolvePlanRoleMapping.js",
        "symbol": "resolvePlanRoleField / source: legacy",
        "scope": "dual-read implementation",
    },
    {
        "file": "frontend/src/modules/objectViews/plan/ObjectPlanView.jsx",
        "symbol": "resolvePlanRoleMappingDualRead(resolvedContract)",
        "scope": "Office + Studio preview contract resolution",
    },
    {
        "file": "frontend/src/modules/objectViews/plan/buildPlanTree.js",
        "symbol": "resolvePlanRoleMappingDualRead (F8 safety path)",
        "scope": "when planRoleMapping omitted",
    },
    {
        "file": "frontend/src/modules/objectViews/plan/planViewContract.js",
        "symbol": "titleFieldKey / statusFieldKey / …",
        "scope": "contract schema + normalization (Studio/draft)",
    },
    {
        "file": "frontend/src/modules/objectViews/plan/resolvePlanUsesLegacyPlanFields.js",
        "symbol": "PLAN_LEGACY_FIELD_KEY_BY_ROLE",
        "scope": "publish diagnostic only",
    },
)

PLAN_LEGACY_TEST_REFERENCES = (
    {
        "file": "frontend/src/modules/objectViews/plan/resolvePlanRoleMapping.test.js",
        "scenarios": ["scenario 2", "scenario 4", "per-field legacy"],
        "kind": "legacy-tier regression",
    },
    {
        "file": "frontend/src/modules/objectViews/plan/buildPlanTree.test.js",
        "scenarios": ["all tests without planRoleMapping"],
        "kind": "F8 legacy path via planPresentation.*FieldKey",
    },
    {
        "file": "frontend/src/modules/objectViews/plan/resolvePlanUsesLegacyPlanFields.test.js",
        "scenarios": ["usesLegacyPlanFields flag"],
        "kind": "publish diagnostic (not runtime tier)",
    },
    {
        "file": "frontend/src/modules/designer/utils/generatePlanRoleMappingFromLegacy.test.js",
        "scenarios": ["migration assistant"],
        "kind": "Studio tooling (not runtime tier)",
    },
)


@dataclass(frozen=True)
class PlanDraftLegacyEntry:
    id: str
    tenant_id: int
    object_type_key: str
    tab_key: str
    tab_name: str
    role_mapping: dict[str, str]
    legacy: dict[str, str]
    runtime_would_use_legacy_tier: bool
    note: str


@dataclass
class PlanLegacyDualReadAuditSummary:
    catalog_version: int | None = None
    audited_at: str | None = None
    published_legacy_plans: int = 0
    published_legacy_keys_in_snapshot: int = 0
    published_plans_without_role_mapping: int = 0
    published_uses_legacy_plan_fields_true: int = 0
    draft_plan_count: int = 0
    draft_with_legacy_keys: int = 0
    draft_runtime_dependency: bool = False
    studio_preview_uses_legacy_tier: bool = False
    studio_preview_note: str = ""
    runtime_legacy_reference_count: int = 0
    tests_depending_on_legacy: int = 0
    can_remove_legacy_tier: str = ""
    recommendation_category: str = ""
    recommendation: str = ""
    published_entries: list[dict[str, Any]] = field(default_factory=list)
    draft_entries: list[PlanDraftLegacyEntry] = field(default_factory=list)


def audit_draft_plan_view(
    *,
    view_id: str,
    view_key: str,
    view_name: str,
    view_type: str,
    tenant_id: int,
    object_type_key: str,
    settings_json: dict[str, Any],
) -> PlanDraftLegacyEntry | None:
    if str(view_type or "").strip().lower() != "plan":
        return None

    role_mapping = _extract_role_mapping(settings_json)
    plan_presentation = _extract_plan_presentation(settings_json)
    legacy = _extract_legacy_keys(plan_presentation)

    has_required = _has_required_role_mapping(role_mapping)
    runtime_would_use_legacy = bool(legacy) and not has_required

    if legacy and has_required:
        note = "Draft has legacy keys; runtime Office reads published catalog — legacy tier not hit when roleMapping filled"
    elif legacy:
        note = "Draft legacy keys would activate legacy tier only if published without roleMapping"
    else:
        note = "No legacy keys in draft"

    return PlanDraftLegacyEntry(
        id=view_id,
        tenant_id=tenant_id,
        object_type_key=object_type_key,
        tab_key=view_key,
        tab_name=view_name,
        role_mapping=role_mapping,
        legacy=legacy,
        runtime_would_use_legacy_tier=runtime_would_use_legacy,
        note=note,
    )


def summarize_plan_legacy_dual_read_audit(
    *,
    published_summary,
    draft_entries: list[PlanDraftLegacyEntry],
) -> PlanLegacyDualReadAuditSummary:
    published_dict = plan_legacy_usage_to_dict(published_summary)

    published_without_role_mapping = sum(
        1
        for entry in published_summary.entries
        if not _has_any_role_mapping(entry.role_mapping)
    )

    draft_with_legacy = sum(1 for entry in draft_entries if entry.legacy)
    draft_runtime_dependency = any(entry.runtime_would_use_legacy_tier for entry in draft_entries)

    legacy_dependent = sum(1 for entry in published_summary.entries if entry.uses_legacy_plan_fields)

    if legacy_dependent > 0:
        category = "D"
        can_remove = "no"
        recommendation = "Нет, есть published legacy (usesLegacyPlanFields=true или legacy-only Plan)."
    elif draft_runtime_dependency:
        category = "D-variant"
        can_remove = "no"
        recommendation = "Нет, draft без roleMapping активирует legacy tier при гипотетическом publish."
    elif published_without_role_mapping > 0:
        category = "D-variant"
        can_remove = "no"
        recommendation = "Нет, есть published Plan без roleMapping."
    elif published_summary.legacy_keys_in_snapshot > 0:
        category = "D-variant"
        can_remove = "no"
        recommendation = "Нет, legacy keys остаются в published snapshot."
    else:
        category = "B"
        can_remove = "yes_after_tests"
        recommendation = (
            "Да, runtime не использует legacy tier (published roleMapping-only); "
            "legacy tier используется только тестами и F8 safety path."
        )

    return PlanLegacyDualReadAuditSummary(
        catalog_version=published_summary.catalog_version,
        audited_at=published_summary.audited_at,
        published_legacy_plans=legacy_dependent,
        published_legacy_keys_in_snapshot=published_summary.legacy_keys_in_snapshot,
        published_plans_without_role_mapping=published_without_role_mapping,
        published_uses_legacy_plan_fields_true=legacy_dependent,
        draft_plan_count=len(draft_entries),
        draft_with_legacy_keys=draft_with_legacy,
        draft_runtime_dependency=draft_runtime_dependency,
        studio_preview_uses_legacy_tier=False,
        studio_preview_note=(
            "Studio Preview Plan: buildPlanPreviewMock() — mock tree; "
            "не вызывает resolvePlanRoleMappingDualRead для дерева. "
            "Draft contract может содержать legacy keys, но дерево их не читает."
        ),
        runtime_legacy_reference_count=len(PLAN_LEGACY_RUNTIME_REFERENCES),
        tests_depending_on_legacy=2,
        can_remove_legacy_tier=can_remove,
        recommendation_category=category,
        recommendation=recommendation,
        published_entries=published_dict.get("entries") or [],
        draft_entries=draft_entries,
    )


def plan_legacy_dual_read_audit_to_dict(summary: PlanLegacyDualReadAuditSummary) -> dict[str, Any]:
    return {
        "catalogVersion": summary.catalog_version,
        "auditedAt": summary.audited_at,
        "publishedLegacyPlans": summary.published_legacy_plans,
        "legacyKeysInSnapshot": summary.published_legacy_keys_in_snapshot,
        "publishedPlansWithoutRoleMapping": summary.published_plans_without_role_mapping,
        "publishedUsesLegacyPlanFieldsTrue": summary.published_uses_legacy_plan_fields_true,
        "draftPlanCount": summary.draft_plan_count,
        "draftWithLegacyKeys": summary.draft_with_legacy_keys,
        "draftRuntimeDependency": summary.draft_runtime_dependency,
        "studioPreviewUsesLegacyTier": summary.studio_preview_uses_legacy_tier,
        "studioPreviewNote": summary.studio_preview_note,
        "runtimeLegacyReferences": list(PLAN_LEGACY_RUNTIME_REFERENCES),
        "runtimeLegacyReferenceCount": summary.runtime_legacy_reference_count,
        "testsDependingOnLegacy": summary.tests_depending_on_legacy,
        "testReferences": list(PLAN_LEGACY_TEST_REFERENCES),
        "canRemoveLegacyTier": summary.can_remove_legacy_tier,
        "recommendationCategory": summary.recommendation_category,
        "recommendation": summary.recommendation,
        "publishedEntries": summary.published_entries,
        "draftEntries": [asdict(entry) for entry in summary.draft_entries],
        "usageTable": [
            {
                "area": "Published Runtime",
                "usesLegacyTier": summary.published_legacy_plans > 0
                or summary.published_legacy_keys_in_snapshot > 0,
                "canRemove": summary.published_legacy_plans == 0
                and summary.published_legacy_keys_in_snapshot == 0,
                "comment": "Office читает published catalog v69; roleMapping-only",
            },
            {
                "area": "Studio Preview",
                "usesLegacyTier": False,
                "canRemove": True,
                "comment": summary.studio_preview_note,
            },
            {
                "area": "Draft",
                "usesLegacyTier": summary.draft_with_legacy_keys > 0,
                "canRemove": not summary.draft_runtime_dependency,
                "comment": "Legacy keys в draft Studio; Office runtime draft не читает",
            },
            {
                "area": "Tests",
                "usesLegacyTier": True,
                "canRemove": True,
                "comment": "resolvePlanRoleMapping.test.js + buildPlanTree.test.js (F8 path)",
            },
            {
                "area": "Dev scripts",
                "usesLegacyTier": True,
                "canRemove": True,
                "comment": "generatePlanRoleMappingFromLegacy, apply_plan_role_mapping_migration — Studio/migration only",
            },
        ],
    }


__all__ = [
    "PLAN_LEGACY_RUNTIME_REFERENCES",
    "PLAN_LEGACY_TEST_REFERENCES",
    "PlanDraftLegacyEntry",
    "PlanLegacyDualReadAuditSummary",
    "audit_catalog_payload",
    "audit_draft_plan_view",
    "plan_legacy_dual_read_audit_to_dict",
    "summarize_plan_legacy_dual_read_audit",
]
