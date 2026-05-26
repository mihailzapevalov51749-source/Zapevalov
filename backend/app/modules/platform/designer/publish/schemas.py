from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ValidationIssue(BaseModel):
    code: str
    path: str
    message: str


class PublishSummaryCounts(BaseModel):
    object_types: int = 0
    fields: int = 0
    relations: int = 0
    views: int = 0


class PublishValidationReport(BaseModel):
    valid: bool
    errors: list[ValidationIssue] = Field(default_factory=list)
    warnings: list[ValidationIssue] = Field(default_factory=list)
    summary: PublishSummaryCounts = Field(default_factory=PublishSummaryCounts)


class PublishResult(BaseModel):
    tenant_id: int
    catalog_version: int
    schema_version: int
    snapshot_id: UUID
    publish_record_id: UUID
    published_at: datetime
    payload_hash: str
    summary: PublishSummaryCounts


class PublishLatestInfo(BaseModel):
    tenant_id: int
    catalog_version: int | None = None
    schema_version: int | None = None
    snapshot_id: UUID | None = None
    publish_record_id: UUID | None = None
    status: str | None = None
    published_at: datetime | None = None
    payload_hash: str | None = None
    summary: PublishSummaryCounts = Field(default_factory=PublishSummaryCounts)


class PublishHistoryItem(BaseModel):
    id: UUID
    tenant_id: int
    snapshot_id: UUID | None = None
    catalog_version: int | None = None
    status: str
    summary: PublishSummaryCounts
    published_at: datetime
    published_by: int | None = None

    class Config:
        from_attributes = True
