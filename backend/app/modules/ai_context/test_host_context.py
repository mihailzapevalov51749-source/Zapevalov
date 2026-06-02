from app.modules.ai_context.host_context import HostContext, validate_host_context
from app.modules.ai_context.user_identity import UserIdentity


def test_host_context_required_fields():
    host = HostContext(
        hostSurface="dashboard",
        tenantId="tenant-1",
        userId="user-1",
        sessionId="session-1",
        timestamp="2026-05-31T12:00:00Z",
    )

    assert host.hostSurface == "dashboard"
    assert validate_host_context(host) == []


def test_host_context_dashboard_profile_fields():
    host = HostContext(
        hostSurface="dashboard",
        tenantId="tenant-1",
        userId="user-1",
        sessionId="session-1",
        timestamp="2026-05-31T12:00:00Z",
        dashboardId="platform_dev",
        selectedScope="yasii-phase-7",
        widgetId="embedded-ai-track",
    )

    assert host.dashboardId == "platform_dev"
    assert host.selectedScope == "yasii-phase-7"
    assert host.widgetId == "embedded-ai-track"


def test_validate_host_context_reports_missing_mandatory_fields():
    host = HostContext(
        hostSurface="dashboard",
        tenantId="",
        userId="user-1",
        sessionId="session-1",
        timestamp="2026-05-31T12:00:00Z",
    )

    warnings = validate_host_context(host)
    assert "missing_required:tenantId" in warnings


def test_host_context_accepts_user_identity():
    host = HostContext(
        hostSurface="dashboard",
        tenantId="tenant-1",
        userId="user-1",
        sessionId="session-1",
        timestamp="2026-05-31T12:00:00Z",
        userIdentity=UserIdentity(
            userId="user-1",
            displayName="Михаил Запевалов",
            email="user@example.com",
            roles=["admin"],
        ),
    )

    assert host.userIdentity is not None
    assert host.userIdentity.displayName == "Михаил Запевалов"
