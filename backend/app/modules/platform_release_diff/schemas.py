"""Pydantic schemas for DEV vs TEMPLATE release diff."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ReleaseDiffFileOut(BaseModel):
    path: str
    change_type: str
    side: str
    primary_owner: str
    registry: str
    related_elements: list[str] = Field(default_factory=list)


class ReleaseDiffElementOut(BaseModel):
    component_key: str
    title: str
    registry: str
    files_count: int
    files: list[ReleaseDiffFileOut] = Field(default_factory=list)


class ReleaseDiffCompareOut(BaseModel):
    changed_files: int = 0
    changed_elements: int = 0
    unchanged_files: int = 0
    has_changes: bool = False
    dev_matches_template: bool = False
    template_release_id: str | None = None
    template_platform_version: str | None = None
    template_git_commit: str | None = None
    frontend_baseline: str = "runtime"
    elements: list[ReleaseDiffElementOut] = Field(default_factory=list)
    files: list[ReleaseDiffFileOut] = Field(default_factory=list)
    message: str | None = None
