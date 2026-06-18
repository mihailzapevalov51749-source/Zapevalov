"""Pydantic schemas for Architecture Navigator API."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ArchitectureTreeNode(BaseModel):
    id: int
    key: str
    title: str
    technical_name: str
    component_type: str
    category_key: str
    parent_key: str | None = None
    children: list["ArchitectureTreeNode"] = Field(default_factory=list)


class ArchitectureTreeCategory(BaseModel):
    key: str
    title: str
    children: list[ArchitectureTreeNode] = Field(default_factory=list)


class ArchitectureTreeResponse(BaseModel):
    categories: list[ArchitectureTreeCategory] = Field(default_factory=list)


class ArchitectureRelatedItem(BaseModel):
    key: str
    title: str
    technical_name: str


class ArchitecturePlaceInTree(BaseModel):
    path: list[ArchitectureRelatedItem] = Field(default_factory=list)
    children: list[ArchitectureRelatedItem] = Field(default_factory=list)


class ArchitectureFindingSummary(BaseModel):
    routes: int = 0
    tables: int = 0
    services: int = 0
    dependencies: int = 0
    documents: int = 0
    rules: int = 0


class ArchitectureScanInfo(BaseModel):
    scan_id: int | None = None
    scanned_at: datetime | None = None
    scanner_version: str | None = None


class ArchitectureComponentCard(BaseModel):
    id: int
    key: str
    title: str
    technical_name: str
    component_type: str
    category_key: str
    category_label: str
    description: str | None = None
    purpose: str | None = None
    place_in_architecture: ArchitecturePlaceInTree
    uses: list[ArchitectureRelatedItem] = Field(default_factory=list)
    used_by: list[ArchitectureRelatedItem] = Field(default_factory=list)
    data: list[ArchitectureRelatedItem] = Field(default_factory=list)
    decisions: list[ArchitectureRelatedItem] = Field(default_factory=list)
    restrictions: list[ArchitectureRelatedItem] = Field(default_factory=list)
    findings: ArchitectureFindingSummary = Field(default_factory=ArchitectureFindingSummary)
    sources: list[str] = Field(default_factory=list)
    last_scan: ArchitectureScanInfo = Field(default_factory=ArchitectureScanInfo)


class ArchitectureScanSummary(BaseModel):
    routes: int = 0
    tables: int = 0
    frontend_routes: int = 0
    architecture_documents: int = 0
    cursor_rules: int = 0
    components: int = 0


class ArchitectureScanResponse(BaseModel):
    id: int
    scanner_version: str
    status: str
    started_at: datetime
    finished_at: datetime | None = None
    summary: ArchitectureScanSummary
    findings_count: int = 0


class ArchitectureLatestScanResponse(BaseModel):
    scan: ArchitectureScanResponse | None = None
    global_findings: ArchitectureFindingSummary = Field(default_factory=ArchitectureFindingSummary)


ArchitectureTreeNode.model_rebuild()
