from app.modules.platform_dashboard.yasii_catalog import (
    YASII_STAGES,
    YASII_WORK_ITEMS,
    count_dependency_edges,
    validate_catalog,
)
from app.modules.platform_dashboard_analyzer.yasii_checks import all_yasii_check_ids, missing_check_ids


def test_yasii_catalog_has_10_stages():
    assert len(YASII_STAGES) == 10


def test_yasii_catalog_has_74_work_items():
    assert len(YASII_WORK_ITEMS) == 74


def test_yasii_catalog_weights_sum_to_100_per_stage():
    assert validate_catalog() == []


def test_yasii_analyzer_checks_complete():
    assert len(all_yasii_check_ids()) == 74
    assert missing_check_ids() == []


def test_yasii_dependency_edges():
    assert count_dependency_edges() > 0
