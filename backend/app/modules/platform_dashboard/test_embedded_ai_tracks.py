from app.modules.platform_dashboard.yasii_catalog import (
    ACE_TRACK_ITEM_KEYS,
    ACE_TRACK_TITLE,
    YASII_TRACK_TITLE,
    YASII_WORK_ITEMS,
    work_item_track,
    work_items_by_track,
)
from app.modules.platform_dashboard.yasii_sync import (
    build_embedded_ai_rollups,
    compute_ace_readiness,
    compute_container_readiness,
    compute_yasii_track_readiness,
)
from app.modules.platform_dashboard_analyzer.yasii_checks import (
    count_ace_checks_passed,
    count_yasii_track_checks_passed,
)


def test_work_item_track_assignments():
    assert work_items_by_track("ace")
    assert len(work_items_by_track("ace")) == 5
    assert len(work_items_by_track("yasii")) == 69
    for key in ACE_TRACK_ITEM_KEYS:
        assert work_item_track(key) == "ace"
    assert work_item_track("P1-W01") == "yasii"
    assert work_item_track("P10-W06") == "yasii"


def test_track_weight_distribution():
    ace_weight = sum(item.weight for item in work_items_by_track("ace"))
    yasii_weight = sum(item.weight for item in work_items_by_track("yasii"))
    total_weight = sum(item.weight for item in YASII_WORK_ITEMS)

    assert ace_weight == 50
    assert yasii_weight == 950
    assert total_weight == 1000
    assert ace_weight + yasii_weight == total_weight


def test_track_readiness_formulas():
    ace_weight = sum(item.weight for item in work_items_by_track("ace"))
    yasii_weight = sum(item.weight for item in work_items_by_track("yasii"))
    total_weight = ace_weight + yasii_weight

    done_keys = {"P1-W02"}
    done_weight = next(item.weight for item in YASII_WORK_ITEMS if item.key == "P1-W02")

    assert compute_ace_readiness(done_keys) == (done_weight * 100) // ace_weight
    assert compute_yasii_track_readiness(done_keys) == 0
    assert compute_container_readiness(done_keys) == (done_weight * 100) // total_weight


def test_embedded_ai_rollups_structure():
    item_passed = {item.key: False for item in YASII_WORK_ITEMS}
    item_passed["P1-W02"] = True
    item_passed["P1-W01"] = True

    rollups = build_embedded_ai_rollups({"P1-W01", "P1-W02"}, item_passed)

    assert rollups.container_readiness == compute_container_readiness({"P1-W01", "P1-W02"})
    assert rollups.ace.slug == "ace"
    assert rollups.ace.title == ACE_TRACK_TITLE
    assert rollups.yasii.slug == "yasii"
    assert rollups.yasii.title == YASII_TRACK_TITLE
    assert rollups.ace.checks_passed == 1
    assert rollups.ace.checks_total == 5
    assert rollups.yasii.checks_passed == 1
    assert rollups.yasii.checks_total == 69


def test_analyzer_track_check_rollups():
    item_passed = {item.key: item.key == "P1-W02" for item in YASII_WORK_ITEMS}

    ace_passed, ace_total = count_ace_checks_passed(item_passed)
    yasii_passed, yasii_total = count_yasii_track_checks_passed(item_passed)

    assert ace_passed == 1
    assert ace_total == 5
    assert yasii_passed == 0
    assert yasii_total == 69
