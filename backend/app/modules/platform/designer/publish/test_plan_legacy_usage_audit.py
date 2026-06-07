"""Unit checks for published Plan legacy usage audit."""

from app.modules.platform.designer.publish.plan_legacy_usage_audit import (
    audit_published_plan_view,
    classify_plan_legacy_usage,
    resolve_legacy_removal_readiness_percent,
    summarize_plan_legacy_usage,
)


def test_classify_role_mapping_only() -> None:
    category, risk, duplicate, uses_fallback = classify_plan_legacy_usage(
        role_mapping={
            "nodeTitle": "title",
            "nodeStatus": "status",
            "nodeDescription": "description",
        },
        legacy={},
        uses_legacy_plan_fields=False,
    )

    assert category == "roleMapping"
    assert risk == "low"
    assert duplicate is False
    assert uses_fallback is False


def test_classify_legacy_only() -> None:
    category, risk, duplicate, uses_fallback = classify_plan_legacy_usage(
        role_mapping={},
        legacy={"titleFieldKey": "title", "statusFieldKey": "status"},
        uses_legacy_plan_fields=True,
    )

    assert category == "legacyOnly"
    assert risk == "high"
    assert duplicate is False
    assert uses_fallback is False


def test_classify_mixed() -> None:
    category, risk, duplicate, uses_fallback = classify_plan_legacy_usage(
        role_mapping={"nodeTitle": "module_name"},
        legacy={"statusFieldKey": "status"},
        uses_legacy_plan_fields=True,
    )

    assert category == "mixed"
    assert risk == "medium"
    assert duplicate is False
    assert uses_fallback is False


def test_classify_fallback_only() -> None:
    category, risk, duplicate, uses_fallback = classify_plan_legacy_usage(
        role_mapping={},
        legacy={},
        uses_legacy_plan_fields=True,
    )

    assert category == "fallback"
    assert risk == "fallback"
    assert duplicate is False
    assert uses_fallback is True


def test_duplicate_role_mapping_and_legacy() -> None:
    category, risk, duplicate, uses_fallback = classify_plan_legacy_usage(
        role_mapping={
            "nodeTitle": "title",
            "nodeStatus": "status",
            "nodeDescription": "description",
        },
        legacy={"titleFieldKey": "title"},
        uses_legacy_plan_fields=False,
    )

    assert category == "mixed"
    assert risk == "low"
    assert duplicate is True
    assert uses_fallback is False


def test_removal_readiness_percent_rules() -> None:
    assert resolve_legacy_removal_readiness_percent(total=0, legacy_count=0) == 100
    assert resolve_legacy_removal_readiness_percent(total=10, legacy_count=0) == 100
    assert resolve_legacy_removal_readiness_percent(total=100, legacy_count=5) == 75
    assert resolve_legacy_removal_readiness_percent(total=10, legacy_count=4) == 50
    assert resolve_legacy_removal_readiness_percent(total=10, legacy_count=5) == 25


def test_audit_published_plan_view_from_catalog_shape() -> None:
    entry = audit_published_plan_view(
        view={
            "id": "view-1",
            "key": "architecture",
            "name": "Архитектура",
            "view_type": "plan",
            "is_active": True,
            "settings_json": {
                "objectView": {
                    "roleMapping": {},
                    "presentation": {
                        "plan": {
                            "titleFieldKey": "name",
                            "descriptionFieldKey": "description",
                        },
                    },
                },
            },
        },
        object_type={"key": "directions", "name": "Направления"},
        tenant_id=1,
        workspace="Разработка",
    )

    assert entry is not None
    assert entry.uses_legacy_plan_fields is True
    assert entry.category == "legacyOnly"
    assert entry.risk == "high"

    summary = summarize_plan_legacy_usage([entry])
    assert summary.total == 1
    assert summary.legacy_only == 1
    assert summary.removal_readiness_percent == 25
