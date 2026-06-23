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
    description: str | None = None
    purpose: str | None = None
    backend_files: list[str] = Field(default_factory=list)
    frontend_files: list[str] = Field(default_factory=list)
    last_scan: ArchitectureScanInfo = Field(default_factory=ArchitectureScanInfo)


class ArchitectureScanSummary(BaseModel):
    routes: int = 0
    tables: int = 0
    frontend_routes: int = 0
    architecture_documents: int = 0
    cursor_rules: int = 0
    backend_files: int = 0
    frontend_files: int = 0
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


class ArchitectureRegistryListItem(BaseModel):
    key: str
    title: str
    element_count: int = 0


class ArchitectureRegistryElementItem(BaseModel):
    id: int
    key: str
    title: str
    technical_name: str
    component_type: str
    element_status: str
    sort_order: int = 0


class ArchitectureRegistryElementsResponse(BaseModel):
    registry_key: str
    registry_label: str
    elements: list[ArchitectureRegistryElementItem] = Field(default_factory=list)


class ArchitectureRegistryOverviewResponse(BaseModel):
    registries: list[ArchitectureRegistryListItem] = Field(default_factory=list)
    total_elements: int = 0
    last_scan: ArchitectureScanInfo = Field(default_factory=ArchitectureScanInfo)
    global_findings: ArchitectureFindingSummary = Field(default_factory=ArchitectureFindingSummary)


class ArchitectureRegistryDocumentResponse(BaseModel):
    registry_key: str
    registry_label: str
    document_path: str
    document_title: str
    content: str
    updated_at: datetime | None = None


class ArchitectureFileOwnerResponse(BaseModel):
    file_path: str
    primary_owner: str
    registry: str
    ownership_class: str
    related_elements: list[str] = Field(default_factory=list)
    reason: str
    confidence: str
    side: str = ""
    rel_path: str = ""


ArchitectureTreeNode.model_rebuild()
