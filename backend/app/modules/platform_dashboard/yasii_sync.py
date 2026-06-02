"""Sync YASII work items into the existing «Встроенный ИИ» implementation stage."""

from __future__ import annotations

import json
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.modules.platform_dashboard.constants import (
    PlatformStageStatus,
    PlatformTaskPriority,
    PlatformTaskStatus,
)
from app.modules.platform_dashboard.datetime_utils import utc_now
from app.modules.platform_dashboard.models import (
    PlatformComponent,
    PlatformImplementationStage,
    PlatformTask,
)
from app.modules.platform_dashboard.schemas import parse_json_list
from app.modules.platform_dashboard.service import dump_json_list
from app.modules.platform_dashboard.yasii_catalog import (
    ACE_TRACK_TITLE,
    MVP_WORK_ITEM_KEYS,
    YASII_CONTAINER_COMPLETION_CRITERIA,
    YASII_CONTAINER_DESCRIPTION,
    YASII_CRITICAL_PATH,
    YASII_EXPECTED_WORK_ITEM_COUNT,
    YASII_IMPLEMENTATION_COMPONENT_SLUG,
    YASII_IMPLEMENTATION_STAGE_SLUG,
    YASII_STAGES,
    YASII_TRACK_TITLE,
    YASII_WORK_ITEMS,
    YasiiWorkItemDefinition,
    count_dependency_edges,
    validate_catalog,
    work_item_track,
    work_items_by_stage,
    work_items_by_track,
)
from app.modules.platform_dashboard_analyzer.types import ScanContext
from app.modules.platform_dashboard_analyzer.yasii_checks import (
    configure_dynamic_checks,
    run_yasii_check_for_item,
)


YASII_TASK_KIND = "yasii_work_item"

_WORK_ITEM_BY_KEY: dict[str, YasiiWorkItemDefinition] = {item.key: item for item in YASII_WORK_ITEMS}


@dataclass
class YasiiSyncResult:
    stages_created: int
    stages_updated: int
    components_created: int
    components_updated: int
    tasks_created: int
    dependencies_registered: int
    analyzer_checks_registered: int
    errors: list[str]
    failed_items: list[str]


@dataclass(frozen=True)
class EmbeddedAiTrackRollup:
    slug: str
    title: str
    readiness: int
    implementation_readiness: int
    release_readiness: int
    current_tasks: tuple[str, ...]
    next_tasks: tuple[str, ...]
    checks_passed: int
    checks_total: int


@dataclass(frozen=True)
class EmbeddedAiRollups:
    container_readiness: int
    container_implementation_readiness: int
    container_release_readiness: int
    ace: EmbeddedAiTrackRollup
    yasii: EmbeddedAiTrackRollup
    implementation_done_keys: frozenset[str] = frozenset()
    release_done_keys: frozenset[str] = frozenset()
    governance_release_blocker_key: str | None = None
    governance_release_blocker_label: str | None = None
    governance_blocked_work_items: tuple[str, ...] = ()


def _task_meta(item: YasiiWorkItemDefinition, *, passed: bool) -> str:
    payload = {
        "kind": YASII_TASK_KIND,
        "key": item.key,
        "track": work_item_track(item.key),
        "phase": item.phase_id,
        "stage": item.stage_slug,
        "weight": item.weight,
        "depends_on": list(item.depends_on),
        "enables": list(item.enables),
        "analyzer_check": item.analyzer_check,
        "analyzer_passed": passed,
        "mvp": item.mvp,
        "constitution_ref": list(item.constitution_ref),
        "system_map_ref": list(item.system_map_ref),
    }
    return json.dumps(payload, ensure_ascii=False)


def parse_yasii_task_meta(description: str | None) -> dict:
    if not description:
        return {}
    try:
        parsed = json.loads(description)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _dependencies_satisfied(item: YasiiWorkItemDefinition, done_keys: set[str]) -> bool:
    for dep in item.depends_on:
        if dep == "MVP_PHASES_COMPLETE":
            mvp_stage_slugs = {
                "yasii-core-foundation",
                "yasii-knowledge-foundation",
                "yasii-graph-foundation",
                "yasii-runtime-foundation",
                "yasii-developer-mvp",
                "yasii-owner-mvp",
                "yasii-embedded-intelligence",
            }
            mvp_stage_items = [wi for wi in YASII_WORK_ITEMS if wi.stage_slug in mvp_stage_slugs]
            if not all(key in done_keys for key in {wi.key for wi in mvp_stage_items}):
                return False
            continue
        if dep == "MVP_WORK_ITEMS_COMPLETE":
            if not all(key in done_keys for key in MVP_WORK_ITEM_KEYS if not key.startswith("P10-")):
                return False
            continue
        if dep not in done_keys:
            return False
    return True


def compute_track_readiness(
    items: list[YasiiWorkItemDefinition],
    done_keys: set[str],
) -> int:
    if not items:
        return 0
    total_weight = sum(item.weight for item in items)
    done_weight = sum(item.weight for item in items if item.key in done_keys)
    return (done_weight * 100) // total_weight if total_weight else 0


def compute_ace_readiness(done_keys: set[str]) -> int:
    return compute_track_readiness(work_items_by_track("ace"), done_keys)


def compute_yasii_track_readiness(done_keys: set[str]) -> int:
    return compute_track_readiness(work_items_by_track("yasii"), done_keys)


def compute_container_readiness(done_keys: set[str]) -> int:
    ace_items = work_items_by_track("ace")
    yasii_items = work_items_by_track("yasii")
    total_weight = sum(item.weight for item in ace_items) + sum(item.weight for item in yasii_items)
    if not total_weight:
        return 0
    done_weight = sum(item.weight for item in ace_items if item.key in done_keys)
    done_weight += sum(item.weight for item in yasii_items if item.key in done_keys)
    return (done_weight * 100) // total_weight


def compute_yasii_readiness(done_keys: set[str], *, mvp_only: bool = False) -> int:
    if mvp_only:
        return compute_item_list_readiness(YASII_WORK_ITEMS, done_keys, mvp_only=True)
    return compute_container_readiness(done_keys)


def compute_item_list_readiness(
    items: list[YasiiWorkItemDefinition],
    done_keys: set[str],
    *,
    mvp_only: bool = False,
) -> int:
    filtered = [
        item
        for item in items
        if not mvp_only or item.mvp is True or item.mvp == "partial"
    ]
    if not filtered:
        return 0
    total_weight = sum(item.weight for item in filtered)
    done_weight = sum(item.weight for item in filtered if item.key in done_keys)
    return (done_weight * 100) // total_weight if total_weight else 0


def _derive_stage_status(readiness: int, current: list[str]) -> str:
    if readiness >= 100:
        return PlatformStageStatus.DONE.value
    if current or readiness > 0:
        return PlatformStageStatus.IN_PROGRESS.value
    return PlatformStageStatus.PLANNED.value


def _work_item_label(item: YasiiWorkItemDefinition) -> str:
    return f"{item.key} {item.title}"


def classify_track_work_items(
    track: str,
    done_keys: set[str],
) -> tuple[list[str], list[str]]:
    current: list[str] = []
    next_items: list[str] = []
    for item in work_items_by_track(track):
        if item.key in done_keys:
            continue
        label = _work_item_label(item)
        if _dependencies_satisfied(item, done_keys):
            current.append(label)
        else:
            next_items.append(label)
    return current[:8], next_items[:8]


def count_track_checks(track: str, item_passed: dict[str, bool]) -> tuple[int, int]:
    items = work_items_by_track(track)
    passed = sum(1 for item in items if item_passed.get(item.key, False))
    return passed, len(items)


def compute_implementation_done_keys(item_passed: dict[str, bool]) -> set[str]:
    """WI is implemented when analyzer passes (technical readiness)."""
    return {item.key for item in YASII_WORK_ITEMS if item_passed.get(item.key, False)}


def compute_resolved_done_keys(item_passed: dict[str, bool]) -> set[str]:
    """WI is done only when analyzer passed and catalog dependencies are satisfied."""
    done: set[str] = set()
    changed = True
    while changed:
        changed = False
        for item in YASII_WORK_ITEMS:
            if item.key in done:
                continue
            if not item_passed.get(item.key, False):
                continue
            if _dependencies_satisfied(item, done):
                done.add(item.key)
                changed = True
    return done


compute_release_done_keys = compute_resolved_done_keys


def _resolve_release_blocker_key(
    item: YasiiWorkItemDefinition,
    item_passed: dict[str, bool],
    release_done_keys: set[str],
    *,
    visiting: set[str] | None = None,
) -> str:
    visiting = visiting or set()
    if item.key in visiting:
        return item.key
    visiting.add(item.key)
    if not item_passed.get(item.key, False):
        return item.key
    for dep in item.depends_on:
        if dep == "MVP_PHASES_COMPLETE":
            mvp_stage_slugs = {
                "yasii-core-foundation",
                "yasii-knowledge-foundation",
                "yasii-graph-foundation",
                "yasii-runtime-foundation",
                "yasii-developer-mvp",
                "yasii-owner-mvp",
                "yasii-embedded-intelligence",
            }
            mvp_stage_items = [wi for wi in YASII_WORK_ITEMS if wi.stage_slug in mvp_stage_slugs]
            for mvp_item in mvp_stage_items:
                if mvp_item.key not in release_done_keys:
                    return _resolve_release_blocker_key(
                        mvp_item, item_passed, release_done_keys, visiting=visiting
                    )
            continue
        if dep == "MVP_WORK_ITEMS_COMPLETE":
            for key in MVP_WORK_ITEM_KEYS:
                if key.startswith("P10-"):
                    continue
                dep_item = _WORK_ITEM_BY_KEY.get(key)
                if dep_item is not None and dep_item.key not in release_done_keys:
                    return _resolve_release_blocker_key(
                        dep_item, item_passed, release_done_keys, visiting=visiting
                    )
            continue
        if dep not in release_done_keys:
            dep_item = _WORK_ITEM_BY_KEY.get(dep)
            if dep_item is None:
                return dep
            return _resolve_release_blocker_key(dep_item, item_passed, release_done_keys, visiting=visiting)
    return item.key


def _format_governance_block_chain(
    item: YasiiWorkItemDefinition,
    item_passed: dict[str, bool],
    release_done_keys: set[str],
) -> str:
    chain: list[str] = []
    current_key = item.key
    seen: set[str] = set()
    for _ in range(24):
        if current_key in seen:
            break
        seen.add(current_key)
        chain.append(current_key)
        current = _WORK_ITEM_BY_KEY.get(current_key)
        if current is None:
            break
        if not item_passed.get(current_key, False):
            break
        if current_key in release_done_keys:
            break
        blocker: str | None = None
        for dep in current.depends_on:
            if dep in ("MVP_PHASES_COMPLETE", "MVP_WORK_ITEMS_COMPLETE"):
                continue
            if dep not in release_done_keys:
                blocker = dep
                break
        if blocker is None:
            break
        current_key = blocker
    return " → ".join(chain)


def detect_governance_release_blocker(
    item_passed: dict[str, bool],
    implementation_done_keys: set[str],
    release_done_keys: set[str],
) -> tuple[str | None, str | None]:
    for item in YASII_WORK_ITEMS:
        if not item_passed.get(item.key, False):
            return item.key, _work_item_label(item)
    for item in YASII_WORK_ITEMS:
        if item.key in release_done_keys:
            continue
        if item.key not in implementation_done_keys:
            continue
        root_key = _resolve_release_blocker_key(item, item_passed, release_done_keys)
        root_item = _WORK_ITEM_BY_KEY.get(root_key)
        return root_key, _work_item_label(root_item) if root_item else root_key
    return None, None


def build_governance_blocked_work_item_labels(
    item_passed: dict[str, bool],
    implementation_done_keys: set[str],
    release_done_keys: set[str],
) -> list[str]:
    labels: list[str] = []
    for item in YASII_WORK_ITEMS:
        if item.key not in implementation_done_keys or item.key in release_done_keys:
            continue
        chain = _format_governance_block_chain(item, item_passed, release_done_keys)
        labels.append(f"{_work_item_label(item)}\nРеализовано, но заблокировано: {chain}")
    return labels


def build_embedded_ai_rollups(
    release_done_keys: set[str],
    item_passed: dict[str, bool],
    *,
    implementation_done_keys: set[str] | None = None,
) -> EmbeddedAiRollups:
    impl_keys = (
        implementation_done_keys
        if implementation_done_keys is not None
        else compute_implementation_done_keys(item_passed)
    )
    release_keys = release_done_keys
    blocker_key, blocker_label = detect_governance_release_blocker(item_passed, impl_keys, release_keys)
    governance_blocked = tuple(
        build_governance_blocked_work_item_labels(item_passed, impl_keys, release_keys)
    )

    ace_current, ace_next = classify_track_work_items("ace", release_keys)
    yasii_current, yasii_next = classify_track_work_items("yasii", release_keys)
    ace_passed, ace_total = count_track_checks("ace", item_passed)
    yasii_passed, yasii_total = count_track_checks("yasii", item_passed)
    ace_release = compute_ace_readiness(release_keys)
    ace_impl = compute_ace_readiness(impl_keys)
    yasii_release = compute_yasii_track_readiness(release_keys)
    yasii_impl = compute_yasii_track_readiness(impl_keys)
    container_release = compute_container_readiness(release_keys)
    container_impl = compute_container_readiness(impl_keys)

    ace = EmbeddedAiTrackRollup(
        slug="ace",
        title=ACE_TRACK_TITLE,
        readiness=ace_release,
        implementation_readiness=ace_impl,
        release_readiness=ace_release,
        current_tasks=tuple(ace_current),
        next_tasks=tuple(ace_next),
        checks_passed=ace_passed,
        checks_total=ace_total,
    )
    yasii = EmbeddedAiTrackRollup(
        slug="yasii",
        title=YASII_TRACK_TITLE,
        readiness=yasii_release,
        implementation_readiness=yasii_impl,
        release_readiness=yasii_release,
        current_tasks=tuple(yasii_current),
        next_tasks=tuple(yasii_next),
        checks_passed=yasii_passed,
        checks_total=yasii_total,
    )
    return EmbeddedAiRollups(
        container_readiness=container_release,
        container_implementation_readiness=container_impl,
        container_release_readiness=container_release,
        ace=ace,
        yasii=yasii,
        implementation_done_keys=frozenset(impl_keys),
        release_done_keys=frozenset(release_keys),
        governance_release_blocker_key=blocker_key,
        governance_release_blocker_label=blocker_label,
        governance_blocked_work_items=governance_blocked,
    )


def load_yasii_item_passed_from_db(db: Session) -> dict[str, bool]:
    """Read analyzer results from platform_tasks — no repo scan (Dashboard GET path)."""
    item_passed = {item.key: False for item in YASII_WORK_ITEMS}
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == YASII_IMPLEMENTATION_STAGE_SLUG)
        .one_or_none()
    )
    if stage is None:
        return item_passed

    for task in db.query(PlatformTask).filter(PlatformTask.stage_id == stage.id).all():
        meta = parse_yasii_task_meta(task.description)
        if meta.get("kind") != YASII_TASK_KIND:
            continue
        key = str(meta.get("key") or "").strip()
        if key not in item_passed:
            continue
        passed = meta.get("analyzer_passed") is True
        if task.status == PlatformTaskStatus.DONE.value:
            passed = True
        item_passed[key] = passed
    return item_passed


def compute_embedded_ai_rollups_from_db(db: Session) -> EmbeddedAiRollups:
    item_passed = load_yasii_item_passed_from_db(db)
    impl_keys = compute_implementation_done_keys(item_passed)
    release_keys = compute_release_done_keys(item_passed)
    return build_embedded_ai_rollups(release_keys, item_passed, implementation_done_keys=impl_keys)


def compute_embedded_ai_rollups(ctx: ScanContext) -> EmbeddedAiRollups:
    item_passed = _run_yasii_analyzer_pass(ctx)
    impl_keys = compute_implementation_done_keys(item_passed)
    release_keys = compute_release_done_keys(item_passed)
    return build_embedded_ai_rollups(release_keys, item_passed, implementation_done_keys=impl_keys)


def classify_yasii_phases(done_keys: set[str]) -> tuple[list[str], list[str], list[str], dict[str, int]]:
    phase_readiness: dict[str, int] = {}
    for stage in YASII_STAGES:
        items = work_items_by_stage(stage.slug)
        phase_readiness[stage.slug] = compute_item_list_readiness(items, done_keys)

    if not any(value > 0 for value in phase_readiness.values()) and not any(
        value >= 100 for value in phase_readiness.values()
    ):
        return [], [], [stage.title for stage in YASII_STAGES], phase_readiness

    completed: list[str] = []
    current: list[str] = []
    next_phases: list[str] = []
    past_current = False

    for stage in YASII_STAGES:
        readiness = phase_readiness[stage.slug]
        if readiness >= 100:
            completed.append(stage.title)
            continue
        if not past_current:
            current.append(stage.title)
            past_current = True
        else:
            next_phases.append(stage.title)

    return completed, current, next_phases, phase_readiness


def resolve_active_yasii_phase_slug(done_keys: set[str]) -> str:
    """First YASII phase that is not fully complete (work-item weighted)."""
    _completed_phases, _current, _next_phases, phase_readiness = classify_yasii_phases(done_keys)
    for stage in YASII_STAGES:
        if phase_readiness.get(stage.slug, 0) < 100:
            return stage.slug
    return YASII_STAGES[-1].slug if YASII_STAGES else "yasii-core-foundation"


def classify_yasii_phase_work_items(
    stage_slug: str,
    done_keys: set[str],
) -> tuple[list[str], list[str], list[str], int]:
    """Per YASII catalog stage: completed labels, current focus, next labels, readiness %."""
    phase_items = work_items_by_stage(stage_slug)
    completed = [_work_item_label(item) for item in phase_items if item.key in done_keys]
    readiness = compute_item_list_readiness(phase_items, done_keys)

    current: list[str] = []
    for item in phase_items:
        if item.key in done_keys:
            continue
        if _dependencies_satisfied(item, done_keys):
            current = [_work_item_label(item)]
            break

    next_items: list[str] = []
    for item in phase_items:
        if item.key in done_keys:
            continue
        if current and _work_item_label(item) == current[0]:
            continue
        if not _dependencies_satisfied(item, done_keys):
            next_items.append(_work_item_label(item))
    return completed, current, next_items[:8], readiness


def classify_embedded_ai_stage_work_items(
    done_keys: set[str],
) -> tuple[list[str], list[str], list[str]]:
    """Stage card lists for «Встроенный ИИ»: done work, one critical-path focus, then next."""
    active_slug = resolve_active_yasii_phase_slug(done_keys)
    phase_items = work_items_by_stage(active_slug)
    phase_key_set = {item.key for item in phase_items}

    completed = [_work_item_label(item) for item in phase_items if item.key in done_keys]

    focus_key: str | None = None
    for key in YASII_CRITICAL_PATH:
        if key not in phase_key_set or key in done_keys:
            continue
        item = _WORK_ITEM_BY_KEY[key]
        if _dependencies_satisfied(item, done_keys):
            focus_key = key
            break

    if focus_key is None:
        for item in phase_items:
            if item.key in done_keys:
                continue
            if _dependencies_satisfied(item, done_keys):
                focus_key = item.key
                break

    current: list[str] = []
    if focus_key is not None:
        current = [_work_item_label(_WORK_ITEM_BY_KEY[focus_key])]

    next_items: list[str] = []
    seen: set[str] = set()

    def append_next(key: str) -> None:
        if key in seen or key in done_keys or key == focus_key or key not in phase_key_set:
            return
        seen.add(key)
        next_items.append(_work_item_label(_WORK_ITEM_BY_KEY[key]))

    for key in YASII_CRITICAL_PATH:
        append_next(key)
    for item in phase_items:
        append_next(item.key)

    return completed, current, next_items


def resolve_active_implementation_stage_slug(stages: list[PlatformImplementationStage]) -> str | None:
    """Pick a single current implementation stage by active focus, not max readiness."""
    by_slug = {stage.slug: stage for stage in stages}
    embedded = by_slug.get(YASII_IMPLEMENTATION_STAGE_SLUG)
    if embedded is not None and embedded.status != PlatformStageStatus.DONE.value:
        return YASII_IMPLEMENTATION_STAGE_SLUG

    for stage in sorted(stages, key=lambda item: (item.order_index, item.id)):
        if stage.status == PlatformStageStatus.DONE.value:
            continue
        if parse_json_list(stage.current_tasks):
            return stage.slug

    for stage in sorted(stages, key=lambda item: (item.order_index, item.id)):
        if stage.status == PlatformStageStatus.IN_PROGRESS.value:
            return stage.slug

    return None


def reconcile_implementation_current_position(db: Session) -> None:
    stages = (
        db.query(PlatformImplementationStage)
        .order_by(PlatformImplementationStage.order_index.asc(), PlatformImplementationStage.id.asc())
        .all()
    )
    active_slug = resolve_active_implementation_stage_slug(stages)
    for stage in stages:
        stage.current_position = active_slug is not None and stage.slug == active_slug
    db.flush()


def count_yasii_work_items_in_db(db: Session) -> int:
    count = 0
    for task in db.query(PlatformTask).all():
        meta = parse_yasii_task_meta(task.description)
        if meta.get("kind") == YASII_TASK_KIND:
            count += 1
    return count


def yasii_track_is_loaded(db: Session) -> bool:
    return count_yasii_work_items_in_db(db) >= YASII_EXPECTED_WORK_ITEM_COUNT


def ensure_yasii_track_loaded(db: Session, ctx: ScanContext) -> YasiiSyncResult | None:
    if yasii_track_is_loaded(db):
        return None
    result = sync_yasii_track(db, ctx)
    db.flush()
    return result


def _cleanup_legacy_yasii_stages(db: Session) -> None:
    legacy_stages = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug.like("yasii-%"))
        .all()
    )
    for stage in legacy_stages:
        for task in db.query(PlatformTask).filter(PlatformTask.stage_id == stage.id).all():
            db.delete(task)
        db.delete(stage)


def _cleanup_legacy_yasii_components(db: Session) -> None:
    legacy_components = (
        db.query(PlatformComponent).filter(PlatformComponent.slug.like("yasii-%")).all()
    )
    for component in legacy_components:
        for task in db.query(PlatformTask).filter(PlatformTask.component_id == component.id).all():
            meta = parse_yasii_task_meta(task.description)
            if meta.get("kind") != YASII_TASK_KIND:
                db.delete(task)
        db.delete(component)


def _delete_yasii_tasks(db: Session) -> None:
    for task in db.query(PlatformTask).all():
        meta = parse_yasii_task_meta(task.description)
        if meta.get("kind") == YASII_TASK_KIND:
            db.delete(task)


def _delete_non_yasii_tasks_for_stage(db: Session, stage_id: int) -> None:
    for task in db.query(PlatformTask).filter(PlatformTask.stage_id == stage_id).all():
        meta = parse_yasii_task_meta(task.description)
        if meta.get("kind") != YASII_TASK_KIND:
            db.delete(task)


def _resolve_container_stage(db: Session) -> PlatformImplementationStage:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == YASII_IMPLEMENTATION_STAGE_SLUG)
        .one_or_none()
    )
    if stage is None:
        stage = PlatformImplementationStage(
            slug=YASII_IMPLEMENTATION_STAGE_SLUG,
            title="Встроенный ИИ",
            order_index=6,
        )
        db.add(stage)
        db.flush()
    return stage


def _run_yasii_analyzer_pass(ctx: ScanContext) -> dict[str, bool]:
    item_passed: dict[str, bool] = {
        item.key: run_yasii_check_for_item(item, ctx) for item in YASII_WORK_ITEMS
    }
    done_preview = {key for key, passed in item_passed.items() if passed}
    stage_readiness_preview: dict[str, int | None] = {}
    for stage in YASII_STAGES:
        items = work_items_by_stage(stage.slug)
        stage_readiness_preview[stage.slug] = compute_item_list_readiness(items, done_preview)

    configure_dynamic_checks(
        stage_readiness=stage_readiness_preview,
        item_done=item_passed,
        ctx=ctx,
    )

    return {item.key: run_yasii_check_for_item(item, ctx) for item in YASII_WORK_ITEMS}


def _apply_yasii_stage_card(
    stage: PlatformImplementationStage,
    rollups: EmbeddedAiRollups,
    *,
    now,
) -> None:
    release_keys = set(rollups.release_done_keys)
    impl_keys = set(rollups.implementation_done_keys)
    release_completed, current_work, next_work = classify_embedded_ai_stage_work_items(release_keys)
    impl_completed, _, _ = classify_embedded_ai_stage_work_items(impl_keys)
    release_readiness = rollups.container_release_readiness
    status = _derive_stage_status(release_readiness, current_work)

    blockers: list[str] = []
    if rollups.governance_release_blocker_label:
        blockers.append(f"Блокер выпуска: {rollups.governance_release_blocker_label}")

    stage.title = "Встроенный ИИ"
    stage.description = YASII_CONTAINER_DESCRIPTION
    stage.cached_readiness = release_readiness
    stage.completed_items = dump_json_list(release_completed)
    stage.remaining_items = dump_json_list(impl_completed)
    stage.current_tasks = dump_json_list(current_work)
    stage.next_tasks = dump_json_list(next_work)
    stage.blockers = dump_json_list(blockers)
    stage.completion_criteria = dump_json_list(list(YASII_CONTAINER_COMPLETION_CRITERIA))
    stage.status = status
    stage.updated_at = now


def refresh_yasii_stage_display(db: Session, ctx: ScanContext) -> None:
    """Recalculate «Встроенный ИИ» card fields from YASII work items (active phase focus)."""
    item_passed = _run_yasii_analyzer_pass(ctx)
    rollups = compute_embedded_ai_rollups(ctx)
    now = utc_now().replace(tzinfo=None)
    container_stage = _resolve_container_stage(db)
    _apply_yasii_stage_card(container_stage, rollups, now=now)
    reconcile_implementation_current_position(db)
    db.flush()


def _resolve_container_component(db: Session) -> PlatformComponent:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == YASII_IMPLEMENTATION_COMPONENT_SLUG)
        .one_or_none()
    )
    if component is None:
        component = PlatformComponent(
            slug=YASII_IMPLEMENTATION_COMPONENT_SLUG,
            title="ИИ-контекст",
        )
        db.add(component)
        db.flush()
    return component


def sync_yasii_track(db: Session, ctx: ScanContext) -> YasiiSyncResult:
    catalog_errors = validate_catalog()
    errors = list(catalog_errors)
    failed_items: list[str] = list(catalog_errors)

    now = utc_now().replace(tzinfo=None)

    item_passed = _run_yasii_analyzer_pass(ctx)
    impl_keys = compute_implementation_done_keys(item_passed)
    release_keys = compute_release_done_keys(item_passed)
    rollups = build_embedded_ai_rollups(release_keys, item_passed, implementation_done_keys=impl_keys)

    _cleanup_legacy_yasii_stages(db)
    _cleanup_legacy_yasii_components(db)
    _delete_yasii_tasks(db)

    container_stage = _resolve_container_stage(db)
    container_component = _resolve_container_component(db)
    _delete_non_yasii_tasks_for_stage(db, container_stage.id)

    tasks_created = 0
    for item in YASII_WORK_ITEMS:
        passed_analyzer = item_passed[item.key]
        deps_ok = _dependencies_satisfied(item, release_keys)
        passed = passed_analyzer and deps_ok

        if passed:
            status = PlatformTaskStatus.DONE.value
            closed_at = now
        elif deps_ok:
            status = PlatformTaskStatus.PLANNED.value
            closed_at = None
        else:
            status = PlatformTaskStatus.BLOCKED.value
            closed_at = None

        db.add(
            PlatformTask(
                title=f"{item.key} {item.title}",
                description=_task_meta(item, passed=passed),
                stage_id=container_stage.id,
                component_id=container_component.id,
                status=status,
                priority=(
                    PlatformTaskPriority.HIGH.value
                    if item.mvp is True
                    else PlatformTaskPriority.MEDIUM.value
                ),
                created_at=now,
                updated_at=now,
                closed_at=closed_at,
            )
        )
        tasks_created += 1

    _apply_yasii_stage_card(container_stage, rollups, now=now)
    reconcile_implementation_current_position(db)

    db.flush()

    return YasiiSyncResult(
        stages_created=0,
        stages_updated=1,
        components_created=0,
        components_updated=0,
        tasks_created=tasks_created,
        dependencies_registered=count_dependency_edges(),
        analyzer_checks_registered=len(YASII_WORK_ITEMS),
        errors=errors,
        failed_items=failed_items,
    )
