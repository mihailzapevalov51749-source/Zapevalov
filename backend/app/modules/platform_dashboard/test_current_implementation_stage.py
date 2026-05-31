from types import SimpleNamespace

from app.modules.platform_dashboard.constants import PlatformStageStatus
from app.modules.platform_dashboard.yasii_catalog import YASII_IMPLEMENTATION_STAGE_SLUG
from app.modules.platform_dashboard.yasii_sync import resolve_active_implementation_stage_slug


def _stage(slug, status, current_tasks=None, order_index=0, stage_id=1):
    return SimpleNamespace(
        slug=slug,
        status=status,
        current_tasks=current_tasks or [],
        order_index=order_index,
        id=stage_id,
    )


def test_current_stage_prefers_embedded_ai_while_not_done():
    stages = [
        _stage("runtime-foundation", PlatformStageStatus.IN_PROGRESS.value, ["Work A"], 4, 4),
        _stage(YASII_IMPLEMENTATION_STAGE_SLUG, PlatformStageStatus.IN_PROGRESS.value, [], 6, 6),
    ]

    assert resolve_active_implementation_stage_slug(stages) == YASII_IMPLEMENTATION_STAGE_SLUG


def test_current_stage_falls_back_to_stage_with_current_tasks():
    stages = [
        _stage("runtime-foundation", PlatformStageStatus.IN_PROGRESS.value, ["Work A"], 4, 4),
        _stage(YASII_IMPLEMENTATION_STAGE_SLUG, PlatformStageStatus.DONE.value, [], 6, 6),
    ]

    assert resolve_active_implementation_stage_slug(stages) == "runtime-foundation"


def test_current_stage_falls_back_to_first_in_progress():
    stages = [
        _stage("legacy-isolation", PlatformStageStatus.DONE.value, [], 3, 3),
        _stage("runtime-foundation", PlatformStageStatus.IN_PROGRESS.value, [], 4, 4),
        _stage(YASII_IMPLEMENTATION_STAGE_SLUG, PlatformStageStatus.DONE.value, [], 6, 6),
    ]

    assert resolve_active_implementation_stage_slug(stages) == "runtime-foundation"
