"""Pydantic schemas for Architecture Governance API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class GovernanceActiveReleaseSummary(BaseModel):
    id: int | None = None
    version: str | None = None
    title: str | None = None
    status: str | None = None


class GovernanceOverviewResponse(BaseModel):
    constitution_norms_count: int = 12
    adr_total: int = 0
    adr_accepted: int = 0
    adr_in_progress: int = 0
    adr_archived: int = 0
    delivery_route: str = "DEV → TEMPLATE → COMPANY"
    active_release: GovernanceActiveReleaseSummary | None = None
    releases_total_count: int = 0
    releases_path: str = "platform-releases"


class ConstitutionNormRead(BaseModel):
    number: int
    title: str
    description: str = ""
    purpose: str = ""
    regulates: str = ""
    importance: str = ""
    violation: str = ""
    criticality: str | None = None
    linked_restrictions: list[str] = Field(default_factory=list)
    related_adrs: list[str] = Field(default_factory=list)
    related_categories: list[str] = Field(default_factory=list)
    source_document: str
    source_section: str


class ConstitutionResponse(BaseModel):
    norms_count: int
    source_document: str
    source_section: str
    norms: list[ConstitutionNormRead]


class AdrListItemRead(BaseModel):
    slug: str
    title: str
    status: str
    status_group: str
    date: str = ""
    summary: str = ""
    document_path: str


class AdrListResponse(BaseModel):
    total: int
    accepted: int
    in_progress: int
    archived: int
    items: list[AdrListItemRead]


class AdrDetailRead(BaseModel):
    slug: str
    title: str
    status: str
    status_group: str
    date: str = ""
    summary: str = ""
    related_adrs: list[str] = Field(default_factory=list)
    related_categories: list[str] = Field(default_factory=list)
    related_services: list[str] = Field(default_factory=list)
    document_path: str
    content_excerpt: str = ""


class DeliveryPhaseRead(BaseModel):
    key: str
    title: str
    description: str


class DeliveryLinkRead(BaseModel):
    label: str
    kind: str
    target: str


class DeliveryContourResponse(BaseModel):
    source_document: str
    route: list[str]
    route_label: str
    phases: list[DeliveryPhaseRead]
    policies: list[str]
    links: list[DeliveryLinkRead]


class LegacyGovernanceRedirectResponse(BaseModel):
    registry_key: str
    section: str
    tab: str
