from app.modules.ai_context.handoff import (
    ACEHandoff,
    clear_handoff_registry,
    get_handoff,
    role_ids_for_host,
    validate_handoff,
    HandoffNotFoundError,
)
from app.modules.ai_context.handoff_service import (
    HostContextValidationError,
    build_handoff_from_host_context,
)
from app.modules.ai_context.host_context import HostContext


def _sample_host(*, dashboard_id: str = "platform_dev") -> HostContext:
    return HostContext(
        hostSurface="dashboard",
        tenantId="tenant-1",
        userId="user-1",
        sessionId="session-1",
        timestamp="2026-05-31T12:00:00Z",
        dashboardId=dashboard_id,
        selectedScope="yasii-phase-7",
        widgetId="embedded-ai-track",
    )


def setup_function():
    clear_handoff_registry()


def test_build_handoff_from_host_context_returns_ace_handoff():
    handoff = build_handoff_from_host_context(_sample_host())

    assert isinstance(handoff, ACEHandoff)
    assert handoff.handoffId.startswith("handoff-")
    assert handoff.snapshotId.startswith("snapshot-")
    assert handoff.boundaryId.startswith("boundary-")
    assert handoff.roleIds == ["yasii-developer"]
    assert handoff.warnings == []


def test_build_handoff_registers_handoff_for_lookup():
    handoff = build_handoff_from_host_context(_sample_host())

    stored = get_handoff(handoff.handoffId)
    assert stored is not None
    assert stored.snapshotId == handoff.snapshotId


def test_role_ids_for_owner_dashboard():
    host = _sample_host(dashboard_id="owner")
    assert role_ids_for_host(host) == ["yasii-owner-assistant"]


def test_build_handoff_rejects_missing_mandatory_fields():
    host = HostContext(
        hostSurface="dashboard",
        tenantId="",
        userId="user-1",
        sessionId="session-1",
        timestamp="2026-05-31T12:00:00Z",
    )

    try:
        build_handoff_from_host_context(host)
        assert False, "expected HostContextValidationError"
    except HostContextValidationError as exc:
        assert "missing_required:tenantId" in str(exc)


def test_validate_handoff_raises_for_unknown_id():
    try:
        validate_handoff("missing-handoff")
        assert False, "expected HandoffNotFoundError"
    except HandoffNotFoundError as exc:
        assert exc.handoff_id == "missing-handoff"
