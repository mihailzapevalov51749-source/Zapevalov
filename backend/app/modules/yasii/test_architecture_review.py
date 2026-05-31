import app.modules.yasii.architecture_review  # noqa: F401

from app.modules.yasii.architecture_review import (
    ARCHITECTURE_REVIEW_ID,
    ArchitectureReview,
    format_architecture_overview_message,
    get_architecture_review,
    get_architecture_summary,
    get_major_components,
    get_review_snapshot,
    resolve_architecture_review_message,
)


def test_get_architecture_review_returns_mvp_values():
    review = get_architecture_review()

    assert isinstance(review, ArchitectureReview)
    assert review.reviewId == ARCHITECTURE_REVIEW_ID
    assert review.currentPhase == "Phase 5 — Developer MVP"
    assert "Phase 4 — Runtime Foundation" in review.completedPhases
    assert "Runtime Orchestrator" in review.majorComponents
    assert "developer-focused MVP runtime" in review.summary


def test_get_architecture_summary_returns_review_summary():
    assert get_architecture_summary() == get_architecture_review().summary


def test_get_major_components_returns_review_components():
    components = get_major_components()

    assert components == get_architecture_review().majorComponents
    assert "Answer Builder" in components


def test_get_review_snapshot_contains_review():
    snapshot = get_review_snapshot()

    assert snapshot.snapshotId.startswith("architecture-review-")
    assert snapshot.review.reviewId == ARCHITECTURE_REVIEW_ID
    assert snapshot.createdAt


def test_resolve_architecture_overview_message():
    message = resolve_architecture_review_message("Какая архитектура ЯСИИ?")

    assert message is not None
    assert "Архитектурный обзор ЯСИИ" in message
    assert "Phase 5 — Developer MVP" in message
    assert "Intent Resolver" in message
    assert message == format_architecture_overview_message()


def test_resolve_completed_phases_message():
    message = resolve_architecture_review_message("Какие фазы реализованы?")

    assert message is not None
    assert "Фазы реализации ЯСИИ" in message
    assert "Phase 1 — Core Foundation" in message


def test_resolve_major_components_message():
    message = resolve_architecture_review_message("Из чего состоит ЯСИИ?")

    assert message is not None
    assert "Основные компоненты ЯСИИ" in message
    assert "Verdict Engine" in message


def test_resolve_current_phase_message():
    message = resolve_architecture_review_message("На каком этапе проект?")

    assert message is not None
    assert "Текущая фаза проекта" in message
    assert "Phase 5 — Developer MVP" in message


def test_resolve_architecture_review_message_unknown_returns_none():
    assert resolve_architecture_review_message("Кто ты?") is None
