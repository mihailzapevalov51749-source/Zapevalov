from app.modules.platform.designer.publish.plan_legacy_dual_read_audit import (
    audit_draft_plan_view,
    summarize_plan_legacy_dual_read_audit,
)
from app.modules.platform.designer.publish.plan_legacy_usage_audit import (
    PlanLegacyUsageEntry,
    PlanLegacyUsageSummary,
)


def test_draft_with_role_mapping_and_legacy_does_not_create_runtime_dependency():
    entry = audit_draft_plan_view(
        view_id="v1",
        view_key="arhitektura",
        view_name="Архитектура",
        view_type="plan",
        tenant_id=1,
        object_type_key="napravleniya",
        settings_json={
            "objectView": {
                "roleMapping": {
                    "nodeTitle": "nazvanie",
                    "nodeStatus": "status",
                    "nodeDescription": "opisanie",
                },
                "presentation": {
                    "plan": {
                        "titleFieldKey": "nazvanie",
                        "descriptionFieldKey": "opisanie",
                    }
                },
            }
        },
    )

    assert entry is not None
    assert entry.legacy == {
        "titleFieldKey": "nazvanie",
        "descriptionFieldKey": "opisanie",
    }
    assert entry.runtime_would_use_legacy_tier is False


def test_recommendation_allows_removal_when_published_role_mapping_only():
    published = PlanLegacyUsageSummary(
        total=1,
        entries=[
            PlanLegacyUsageEntry(
                id="v1",
                tenant_id=1,
                workspace="Разработка",
                object_type_key="napravleniya",
                object_type_name="Направления",
                tab_key="arhitektura",
                tab_name="Архитектура",
                uses_legacy_plan_fields=False,
                role_mapping={
                    "nodeTitle": "nazvanie",
                    "nodeStatus": "status",
                    "nodeDescription": "opisanie",
                },
                legacy={},
                category="roleMapping",
                risk="low",
                duplicate_role_mapping_and_legacy=False,
                uses_fallback=False,
            )
        ],
    )
    published.legacy_keys_in_snapshot = 0

    draft_entry = audit_draft_plan_view(
        view_id="v1",
        view_key="arhitektura",
        view_name="Архитектура",
        view_type="plan",
        tenant_id=1,
        object_type_key="napravleniya",
        settings_json={
            "objectView": {
                "roleMapping": {
                    "nodeTitle": "nazvanie",
                    "nodeStatus": "status",
                    "nodeDescription": "opisanie",
                },
                "presentation": {
                    "plan": {
                        "titleFieldKey": "nazvanie",
                        "descriptionFieldKey": "opisanie",
                    }
                },
            }
        },
    )

    summary = summarize_plan_legacy_dual_read_audit(
        published_summary=published,
        draft_entries=[draft_entry],
    )

    assert summary.can_remove_legacy_tier == "yes_after_tests"
    assert summary.recommendation_category == "B"
    assert "runtime не использует legacy tier" in summary.recommendation
