"""Governance history event model (P13-W02) — designed types; incremental wiring."""

from __future__ import annotations

from enum import Enum


class GovernanceEventKind(str, Enum):
    WI_CLOSED = "wi_closed"
    WI_OPENED = "wi_opened"
    STAGE_CLOSED = "stage_closed"
    STAGE_READINESS_CHANGED = "stage_readiness_changed"
    ARCHITECTURE_CHANGED = "architecture_changed"
    QUALITY_ISSUE_ADDED = "quality_issue_added"
    QUALITY_ISSUE_CLOSED = "quality_issue_closed"
    FOCUS_CHANGED = "focus_changed"
    RISK_CHANGED = "risk_changed"
    DASHBOARD_REFRESHED = "dashboard_refreshed"


GOVERNANCE_EVENT_PLATFORM_ACTIVITY_MAP: dict[GovernanceEventKind, str] = {
    GovernanceEventKind.WI_CLOSED: "milestone",
    GovernanceEventKind.WI_OPENED: "milestone",
    GovernanceEventKind.STAGE_CLOSED: "readiness_stage",
    GovernanceEventKind.STAGE_READINESS_CHANGED: "readiness_stage",
    GovernanceEventKind.ARCHITECTURE_CHANGED: "readiness_component",
    GovernanceEventKind.QUALITY_ISSUE_ADDED: "quality",
    GovernanceEventKind.QUALITY_ISSUE_CLOSED: "quality",
    GovernanceEventKind.FOCUS_CHANGED: "analysis",
    GovernanceEventKind.RISK_CHANGED: "analysis",
    GovernanceEventKind.DASHBOARD_REFRESHED: "dashboard_refresh",
}


GOVERNANCE_EVENTS_SPEC: tuple[dict[str, str], ...] = (
    {"kind": GovernanceEventKind.WI_CLOSED.value, "status": "planned", "source": "yasii_sync"},
    {"kind": GovernanceEventKind.WI_OPENED.value, "status": "planned", "source": "yasii_sync"},
    {"kind": GovernanceEventKind.STAGE_CLOSED.value, "status": "planned", "source": "refresh"},
    {"kind": GovernanceEventKind.STAGE_READINESS_CHANGED.value, "status": "implemented", "source": "refresh"},
    {"kind": GovernanceEventKind.ARCHITECTURE_CHANGED.value, "status": "implemented", "source": "refresh"},
    {"kind": GovernanceEventKind.QUALITY_ISSUE_ADDED.value, "status": "planned", "source": "quality_issues_api"},
    {"kind": GovernanceEventKind.QUALITY_ISSUE_CLOSED.value, "status": "partial", "source": "refresh"},
    {"kind": GovernanceEventKind.FOCUS_CHANGED.value, "status": "planned", "source": "unified_project_state"},
    {"kind": GovernanceEventKind.RISK_CHANGED.value, "status": "planned", "source": "development_intelligence"},
    {"kind": GovernanceEventKind.DASHBOARD_REFRESHED.value, "status": "implemented", "source": "refresh"},
)
