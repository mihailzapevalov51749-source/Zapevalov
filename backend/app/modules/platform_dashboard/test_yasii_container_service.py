from app.modules.platform_dashboard.yasii_catalog import (
    YASII_CONTAINER_DESCRIPTION,
    YASII_STAGES,
    work_items_by_stage,
    work_item_by_key,
)
from app.modules.platform_dashboard.yasii_sync import (
    classify_embedded_ai_stage_work_items,
    classify_track_work_items,
    classify_yasii_phase_work_items,
    classify_yasii_phases,
    compute_item_list_readiness,
    resolve_active_yasii_phase_slug,
)


def test_yasii_container_description_uses_correct_naming():
    assert "ЯСII" not in YASII_CONTAINER_DESCRIPTION
    assert "ЯСИИ" in YASII_CONTAINER_DESCRIPTION
    assert "ACE" in YASII_CONTAINER_DESCRIPTION
    assert "YASII" in YASII_CONTAINER_DESCRIPTION


def test_classify_yasii_phases_when_nothing_started():
    completed, current, next_phases, _readiness = classify_yasii_phases(set())

    assert completed == []
    assert current == []
    assert next_phases == [stage.title for stage in YASII_STAGES]


def test_classify_yasii_phases_when_first_phase_started():
    completed, current, next_phases, _readiness = classify_yasii_phases({"P1-W01"})

    assert completed == []
    assert current == ["YASII Core Foundation"]
    assert next_phases == [stage.title for stage in YASII_STAGES[1:]]


def test_classify_yasii_phases_when_first_phase_completed():
    phase_one_keys = {item.key for item in work_items_by_stage("yasii-core-foundation")}

    completed, current, next_phases, _readiness = classify_yasii_phases(phase_one_keys)

    assert completed == ["YASII Core Foundation"]
    assert current == ["YASII Knowledge Foundation"]
    assert next_phases == [stage.title for stage in YASII_STAGES[2:]]


def test_embedded_ai_stage_work_items_when_nothing_started():
    completed, current, next_items = classify_embedded_ai_stage_work_items(set())

    assert completed == []
    assert current == ["P1-W01 YASII Module Skeleton"]
    assert next_items[0] == "P1-W02 ACE Module Skeleton"
    assert len(next_items) == 11


def test_embedded_ai_stage_work_items_after_p1_w01():
    completed, current, next_items = classify_embedded_ai_stage_work_items({"P1-W01"})

    assert completed == ["P1-W01 YASII Module Skeleton"]
    assert current == ["P1-W02 ACE Module Skeleton"]
    assert "P1-W03 Identity Resolution" in next_items


def test_embedded_ai_stage_work_items_critical_path_focus_after_p1_w06():
    done = {f"P1-W0{i}" for i in range(1, 7)}

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert len(completed) == 6
    assert current == ["P1-W07 Request Response Contracts"]
    assert "P1-W07 Request Response Contracts" not in next_items
    assert "P1-W08 FailureResponse" in next_items


def test_embedded_ai_stage_work_items_critical_path_focus_after_p1_w07():
    done = {f"P1-W0{i}" for i in range(1, 8)}

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert len(completed) == 7
    assert "P1-W07 Request Response Contracts" in completed
    assert current == ["P1-W10 EffectiveScope Derivation"]
    assert "P1-W08 FailureResponse" in next_items


def test_embedded_ai_stage_work_items_critical_path_focus_after_p1_w10():
    done = {f"P1-W0{i}" for i in range(1, 8)} | {"P1-W10"}

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert "P1-W10 EffectiveScope Derivation" in completed
    assert current == ["P1-W11 Runtime Orchestrator Skeleton"]
    assert "P1-W08 FailureResponse" in next_items


def test_embedded_ai_stage_work_items_critical_path_focus_after_p1_w11():
    done = {f"P1-W0{i}" for i in range(1, 8)} | {"P1-W10", "P1-W11"}

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert "P1-W11 Runtime Orchestrator Skeleton" in completed
    assert current == ["P1-W09 Audit Skeleton"]
    assert "P1-W08 FailureResponse" in next_items


def test_embedded_ai_stage_work_items_focus_after_p1_w09_on_critical_path_branch():
    done = {f"P1-W0{i}" for i in range(1, 8)} | {"P1-W10", "P1-W11", "P1-W09"}

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert "P1-W09 Audit Skeleton" in completed
    assert current == ["P1-W08 FailureResponse"]
    assert "P1-W12 Memory Layer Basic" in next_items


def test_embedded_ai_stage_work_items_focus_after_p1_w08():
    done = {f"P1-W0{i}" for i in range(1, 8)} | {"P1-W10", "P1-W11", "P1-W09", "P1-W08"}

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert "P1-W08 FailureResponse" in completed
    assert current == ["P1-W12 Memory Layer Basic"]
    assert "P1-W08 FailureResponse" not in next_items


def _phase_one_done_keys() -> set[str]:
    return {item.key for item in work_items_by_stage("yasii-core-foundation")}


def _phase_two_done_keys() -> set[str]:
    return {item.key for item in work_items_by_stage("yasii-knowledge-foundation")}


def _phase_three_prerequisite_done_keys() -> set[str]:
    return _phase_one_done_keys() | _phase_two_done_keys()


def _phase_three_done_keys() -> set[str]:
    return {item.key for item in work_items_by_stage("yasii-graph-foundation")}


def _phase_four_prerequisite_done_keys() -> set[str]:
    return _phase_three_prerequisite_done_keys() | _phase_three_done_keys()


def _phase_four_runtime_chain_done_keys() -> set[str]:
    return {f"P4-W0{i}" for i in range(1, 8)}


def _phase_four_done_keys() -> set[str]:
    return _phase_four_runtime_chain_done_keys() | {"P4-W08"}


def test_embedded_ai_stage_work_items_after_phase_one_complete():
    done = _phase_one_done_keys()

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)
    phase_completed, phase_current, phase_next, _ = classify_yasii_phases(done)

    assert completed == []
    assert phase_completed == ["YASII Core Foundation"]
    assert phase_current == ["YASII Knowledge Foundation"]
    assert current == [f"{work_item_by_key('P2-W01').key} {work_item_by_key('P2-W01').title}"]
    assert "P2-W01 Knowledge Registry" in next_items or current[0].startswith("P2-W01")


def test_embedded_ai_stage_work_items_focus_after_p2_w01():
    done = _phase_one_done_keys() | {"P2-W01"}

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert "P2-W01 Knowledge Registry" in completed
    assert current == ["P2-W02 Knowledge Source Registry"]
    assert "P2-W03 Tier Classification" in next_items


def test_embedded_ai_stage_work_items_focus_after_p2_w02():
    done = _phase_one_done_keys() | {"P2-W01", "P2-W02"}

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert "P2-W02 Knowledge Source Registry" in completed
    assert current == ["P2-W03 Tier Classification"]
    assert "P2-W04 Knowledge Index" in next_items


def test_embedded_ai_stage_work_items_focus_after_p2_w03():
    done = _phase_one_done_keys() | {"P2-W01", "P2-W02", "P2-W03"}

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert "P2-W03 Tier Classification" in completed
    assert current == ["P2-W04 Knowledge Index"]
    assert "P2-W05 Knowledge Source Validation" in next_items


def test_embedded_ai_stage_work_items_focus_after_p2_w04():
    done = _phase_one_done_keys() | {"P2-W01", "P2-W02", "P2-W03", "P2-W04"}

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert "P2-W04 Knowledge Index" in completed
    assert current == ["P2-W05 Knowledge Source Validation"]
    assert "P2-W06 Knowledge Readiness" in next_items


def test_embedded_ai_stage_work_items_focus_after_p2_w05():
    done = _phase_one_done_keys() | {"P2-W01", "P2-W02", "P2-W03", "P2-W04", "P2-W05"}

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert "P2-W05 Knowledge Source Validation" in completed
    assert current == ["P2-W06 Knowledge Readiness"]


def test_embedded_ai_stage_work_items_after_phase_two_complete():
    done = _phase_three_prerequisite_done_keys()

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)
    phase_completed, phase_current, phase_next, _ = classify_yasii_phases(done)

    assert completed == []
    assert phase_completed == ["YASII Core Foundation", "YASII Knowledge Foundation"]
    assert phase_current == ["YASII Knowledge Graph Foundation"]
    assert current == [f"{work_item_by_key('P3-W01').key} {work_item_by_key('P3-W01').title}"]


def test_embedded_ai_stage_work_items_focus_after_p3_w01():
    done = _phase_three_prerequisite_done_keys() | {"P3-W01"}

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert "P3-W01 Graph Nodes" in completed
    assert current == ["P3-W02 Graph Edges"]
    assert "P3-W03 Dependency Graph" in next_items


def test_embedded_ai_stage_work_items_focus_after_p3_w02():
    done = _phase_three_prerequisite_done_keys() | {"P3-W01", "P3-W02"}

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert "P3-W02 Graph Edges" in completed
    assert current == ["P3-W03 Dependency Graph"]
    assert "P3-W04 Rule Graph" in next_items


def test_embedded_ai_stage_work_items_focus_after_p3_w03():
    done = _phase_three_prerequisite_done_keys() | {"P3-W01", "P3-W02", "P3-W03"}

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert "P3-W03 Dependency Graph" in completed
    assert current == ["P3-W04 Rule Graph"]
    assert "P3-W07 Code Knowledge Index" in next_items


def test_embedded_ai_stage_work_items_focus_after_p3_w04():
    done = _phase_three_prerequisite_done_keys() | {"P3-W01", "P3-W02", "P3-W03", "P3-W04"}

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert "P3-W04 Rule Graph" in completed
    assert current == ["P3-W05 Graph Query Layer"]
    assert "P3-W07 Code Knowledge Index" in next_items


def test_embedded_ai_stage_work_items_focus_after_p3_w05():
    done = _phase_three_prerequisite_done_keys() | {"P3-W01", "P3-W02", "P3-W03", "P3-W04", "P3-W05"}

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert "P3-W05 Graph Query Layer" in completed
    assert current == ["P3-W08 Analyzer Evidence Nodes"]


def test_embedded_ai_stage_work_items_focus_after_p3_w08():
    done = _phase_three_prerequisite_done_keys() | {
        "P3-W01",
        "P3-W02",
        "P3-W03",
        "P3-W04",
        "P3-W05",
        "P3-W08",
    }

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert "P3-W08 Analyzer Evidence Nodes" in completed
    assert current == ["P3-W06 Graph Readiness"]
    assert "P3-W07 Code Knowledge Index" in next_items


def test_embedded_ai_stage_work_items_focus_after_p3_w06():
    done = _phase_three_prerequisite_done_keys() | {
        "P3-W01",
        "P3-W02",
        "P3-W03",
        "P3-W04",
        "P3-W05",
        "P3-W06",
        "P3-W08",
    }

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert "P3-W06 Graph Readiness" in completed
    assert current == ["P3-W07 Code Knowledge Index"]


def test_embedded_ai_stage_work_items_shows_p3_w07_in_completed_while_phase_three_active():
    done = _phase_three_prerequisite_done_keys() | {
        "P3-W01",
        "P3-W02",
        "P3-W03",
        "P3-W04",
        "P3-W05",
        "P3-W06",
        "P3-W07",
    }

    completed, current, _next_items = classify_embedded_ai_stage_work_items(done)

    assert "P3-W07 Code Knowledge Index" in completed
    assert current == ["P3-W08 Analyzer Evidence Nodes"]


def test_embedded_ai_stage_work_items_after_phase_three_complete():
    done = _phase_three_prerequisite_done_keys() | _phase_three_done_keys()

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)
    phase_completed, phase_current, _phase_next, _ = classify_yasii_phases(done)

    assert completed == []
    assert phase_completed == [
        "YASII Core Foundation",
        "YASII Knowledge Foundation",
        "YASII Knowledge Graph Foundation",
    ]
    assert phase_current == ["YASII Runtime Engine Foundation"]
    assert current == ["P4-W01 Intent Resolver"]
    assert "P4-W02 Knowledge Resolver" in next_items


def test_embedded_ai_stage_work_items_focus_after_p4_w01():
    done = _phase_four_prerequisite_done_keys() | {"P4-W01"}

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert "P4-W01 Intent Resolver" in completed
    assert current == ["P4-W02 Knowledge Resolver"]
    assert "P4-W03 Graph Resolver" in next_items


def test_embedded_ai_stage_work_items_focus_after_p4_w02():
    done = _phase_four_prerequisite_done_keys() | {"P4-W01", "P4-W02"}

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert "P4-W02 Knowledge Resolver" in completed
    assert current == ["P4-W03 Graph Resolver"]
    assert "P4-W04 Evidence Resolver" in next_items


def test_embedded_ai_stage_work_items_focus_after_p4_w03():
    done = _phase_four_prerequisite_done_keys() | {"P4-W01", "P4-W02", "P4-W03"}

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert "P4-W03 Graph Resolver" in completed
    assert current == ["P4-W04 Evidence Resolver"]
    assert "P4-W05 Rule Engine" in next_items


def test_embedded_ai_stage_work_items_focus_after_p4_w04():
    done = _phase_four_prerequisite_done_keys() | {
        "P4-W01",
        "P4-W02",
        "P4-W03",
        "P4-W04",
    }

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert "P4-W04 Evidence Resolver" in completed
    assert current == ["P4-W05 Rule Engine"]
    assert "P4-W06 Verdict Engine" in next_items


def test_embedded_ai_stage_work_items_focus_after_p4_w05():
    done = _phase_four_prerequisite_done_keys() | {
        "P4-W01",
        "P4-W02",
        "P4-W03",
        "P4-W04",
        "P4-W05",
    }

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert "P4-W05 Rule Engine" in completed
    assert current == ["P4-W06 Verdict Engine"]
    assert "P4-W07 Answer Builder" in next_items


def test_embedded_ai_stage_work_items_focus_after_p4_w06():
    done = _phase_four_prerequisite_done_keys() | {
        "P4-W01",
        "P4-W02",
        "P4-W03",
        "P4-W04",
        "P4-W05",
        "P4-W06",
    }

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert "P4-W06 Verdict Engine" in completed
    assert current == ["P4-W07 Answer Builder"]
    assert "P4-W08 Runtime Orchestrator Wiring" in next_items


def test_embedded_ai_stage_work_items_focus_after_p4_w07():
    done = _phase_four_prerequisite_done_keys() | _phase_four_runtime_chain_done_keys()

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert "P4-W07 Answer Builder" in completed
    assert current == ["P4-W08 Runtime Orchestrator Wiring"]


def test_embedded_ai_stage_work_items_after_phase_four_complete():
    done = _phase_four_prerequisite_done_keys() | _phase_four_done_keys()

    completed, current, next_items = classify_embedded_ai_stage_work_items(done)
    phase_completed, phase_current, _phase_next, _ = classify_yasii_phases(done)

    assert completed == []
    assert phase_completed == [
        "YASII Core Foundation",
        "YASII Knowledge Foundation",
        "YASII Knowledge Graph Foundation",
        "YASII Runtime Engine Foundation",
    ]
    assert phase_current == ["YASII Developer MVP"]
    assert current == ["P5-W01 Developer Profile"]
    assert "P5-W02 Architecture Review" in next_items


def _phases_one_through_six_done_keys() -> set[str]:
    keys: set[str] = set()
    for slug in (
        "yasii-core-foundation",
        "yasii-knowledge-foundation",
        "yasii-graph-foundation",
        "yasii-runtime-foundation",
        "yasii-developer-mvp",
        "yasii-owner-mvp",
    ):
        keys |= {item.key for item in work_items_by_stage(slug)}
    return keys


def _phase_seven_after_p7_w05_done_keys() -> set[str]:
    return _phases_one_through_six_done_keys() | {
        "P7-W01",
        "P7-W02",
        "P7-W03",
        "P7-W04",
        "P7-W05",
        "P7-W08",
    }


def test_phase_seven_readiness_uses_all_work_items_not_mvp_subset():
    done = _phase_seven_after_p7_w05_done_keys()
    items = work_items_by_stage("yasii-embedded-intelligence")

    readiness = compute_item_list_readiness(items, done)

    assert readiness == 84


def test_classify_yasii_phases_keeps_embedded_current_when_w06_w07_pending():
    done = _phase_seven_after_p7_w05_done_keys()

    _completed, phase_current, phase_next, phase_readiness = classify_yasii_phases(done)

    assert phase_readiness["yasii-embedded-intelligence"] == 84
    assert "YASII Embedded Intelligence" in phase_current
    assert phase_current == ["YASII Embedded Intelligence"]
    assert "YASII Memory Foundation" not in phase_current
    assert "YASII Memory Foundation" in phase_next


def test_resolve_active_yasii_phase_slug_returns_embedded_after_p7_w05():
    done = _phase_seven_after_p7_w05_done_keys()

    assert resolve_active_yasii_phase_slug(done) == "yasii-embedded-intelligence"


def test_embedded_stage_focus_after_p7_w06_stays_in_phase_seven():
    done = _phase_seven_after_p7_w05_done_keys() | {"P7-W06"}

    _completed, current, next_items = classify_embedded_ai_stage_work_items(done)
    _phase_completed, phase_current, _phase_next, phase_readiness = classify_yasii_phases(done)

    assert phase_readiness["yasii-embedded-intelligence"] == 92
    assert phase_current == ["YASII Embedded Intelligence"]
    assert current == ["P7-W07 Process Integration"]


def test_embedded_stage_focus_after_p7_w05_targets_p7_w06():
    done = _phase_seven_after_p7_w05_done_keys()

    _completed, current, next_items = classify_embedded_ai_stage_work_items(done)
    yasii_current, _yasii_next = classify_track_work_items("yasii", done)

    assert current == ["P7-W06 Document Integration"]
    assert yasii_current[0] == "P7-W06 Document Integration"
    assert "P7-W07 Process Integration" in next_items


def test_classify_yasii_phases_phase_seven_complete_after_p7_w07():
    done = _phases_one_through_six_done_keys() | {
        item.key for item in work_items_by_stage("yasii-embedded-intelligence")
    }

    phase_completed, phase_current, _phase_next, phase_readiness = classify_yasii_phases(done)

    assert phase_readiness["yasii-embedded-intelligence"] == 100
    assert "YASII Embedded Intelligence" in phase_completed
    assert phase_current == ["YASII Memory Foundation"]


def test_classify_yasii_phases_moves_to_memory_after_phase_seven_complete():
    done = _phases_one_through_six_done_keys() | {
        item.key for item in work_items_by_stage("yasii-embedded-intelligence")
    }

    phase_completed, phase_current, _phase_next, phase_readiness = classify_yasii_phases(done)

    assert phase_readiness["yasii-embedded-intelligence"] == 100
    assert "YASII Embedded Intelligence" in phase_completed
    assert phase_current == ["YASII Memory Foundation"]


def test_platform_readiness_phase_complete_when_p10_w03_done():
    p10_keys = {item.key for item in work_items_by_stage("yasii-platform-readiness")}

    completed, current, _next_items, readiness = classify_yasii_phase_work_items(
        "yasii-platform-readiness",
        p10_keys,
    )

    assert readiness == 100
    assert "P10-W03" in " ".join(completed)
    assert current == []


def test_memory_foundation_phase_complete_when_p8_w03_done():
    memory_keys = {item.key for item in work_items_by_stage("yasii-memory-foundation")}
    done = _phases_one_through_six_done_keys() | {
        item.key for item in work_items_by_stage("yasii-embedded-intelligence")
    } | memory_keys

    completed, current, _next_items, readiness = classify_yasii_phase_work_items(
        "yasii-memory-foundation",
        done,
    )

    assert readiness == 100
    assert "P8-W03" in " ".join(completed)
    assert current == []
    assert "P8-W03 Decision Memory" not in " ".join(_next_items)









