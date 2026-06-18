"""Unit tests for canonical notification target payloads."""

from __future__ import annotations

from app.modules.notifications.target_context import (
    build_notification_target,
    merge_notification_context,
)


def test_build_calendar_notification_target():
    target = build_notification_target(
        target_type="calendar_event",
        target_id=42,
        tenant_id=1,
        portal_id=1,
        runtime="runtime.calendar",
        action="open",
    )

    assert target == {
        "type": "calendar_event",
        "id": 42,
        "tenant_id": 1,
        "portal_id": 1,
        "runtime": "runtime.calendar",
        "action": "open",
    }


def test_merge_calendar_notification_context():
    target = build_notification_target(
        target_type="calendar_event",
        target_id=42,
        tenant_id=1,
        portal_id=1,
        runtime="runtime.calendar",
    )

    context = merge_notification_context(
        tenant_id=1,
        portal_id=1,
        entity_type="calendar_event",
        entity_id=42,
        target=target,
        extra={"event_id": 42, "tab": "calendar"},
    )

    assert context["entity_type"] == "calendar_event"
    assert context["entity_id"] == "42"
    assert context["target"]["type"] == "calendar_event"
    assert context["event_id"] == 42
