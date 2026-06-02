"""Shared project state models (P13-W02) — used by Unified Project State and Project Awareness."""

from __future__ import annotations

from pydantic import BaseModel, Field

PROJECT_STATE_SCHEMA_VERSION = "0.1.0"


class ProjectState(BaseModel):
    schemaVersion: str = Field(default=PROJECT_STATE_SCHEMA_VERSION)
    activeStageSlug: str = ""
    activeStageTitle: str = ""
    activeWorkItems: list[str] = Field(default_factory=list)
    completedWorkItems: list[str] = Field(default_factory=list)
    blockedWorkItems: list[str] = Field(default_factory=list)
    openWorkItems: list[str] = Field(default_factory=list)
    containerReadiness: int = 0
    containerImplementationReadiness: int = 0
    containerReleaseReadiness: int = 0
    yasiiTrackReadiness: int = 0
    yasiiTrackImplementationReadiness: int = 0
    yasiiTrackReleaseReadiness: int = 0
    aceTrackReadiness: int = 0
    aceTrackImplementationReadiness: int = 0
    aceTrackReleaseReadiness: int = 0
    governanceReleaseBlockerKey: str = ""
    governanceReleaseBlockerLabel: str = ""
    implementedNotReleasedWorkItems: list[str] = Field(default_factory=list)
    phaseReadiness: dict[str, int] = Field(default_factory=dict)
