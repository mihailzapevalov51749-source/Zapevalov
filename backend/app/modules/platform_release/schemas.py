"""Pydantic schemas for platform release pipeline."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.modules.platform_release.constants import (
    ReleaseChangeType,
    ReleaseRiskLevel,
)


class ReleaseChangeCreate(BaseModel):
    change_type: str = ReleaseChangeType.OTHER.value
    entity_type: str | None = None
    entity_id: str | None = None
    system_key: str | None = None
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    risk_level: str = ReleaseRiskLevel.LOW.value

    @field_validator("change_type", "risk_level", mode="before")
    @classmethod
    def _normalize_enum(cls, value: str | None) -> str:
        return str(value or "").strip().lower()


class ReleaseChangeOut(BaseModel):
    id: int
    release_id: int
    change_type: str
    entity_type: str | None
    entity_id: str | None
    system_key: str | None
    title: str
    description: str | None
    risk_level: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PlatformReleaseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    changes: list[ReleaseChangeCreate] = Field(default_factory=list)


class PlatformReleaseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    changes: list[ReleaseChangeCreate] | None = None


class ReviewCommentPayload(BaseModel):
    comment: str | None = Field(default=None, max_length=4000)


class ReviewCommentRequiredPayload(BaseModel):
    comment: str = Field(min_length=1, max_length=4000)


class PlatformReleaseOut(BaseModel):
    id: int
    version: str
    title: str
    description: str | None
    status: str
    source_tenant_id: int
    target_template_tenant_id: int | None
    created_by: int | None
    created_at: datetime
    submitted_at: datetime | None = None
    submitted_by: int | None = None
    review_started_at: datetime | None = None
    review_started_by: int | None = None
    review_comment: str | None = None
    approved_at: datetime | None = None
    approved_by: int | None = None
    changes_requested_at: datetime | None = None
    changes_requested_by: int | None = None
    published_at: datetime | None = None
    published_by: int | None = None
    changes: list[ReleaseChangeOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class PlatformReleaseListItem(BaseModel):
    id: int
    version: str
    title: str
    status: str
    source_tenant_id: int
    target_template_tenant_id: int | None
    created_at: datetime
    submitted_at: datetime | None = None
    review_comment: str | None = None
    published_at: datetime | None = None
    changes_count: int = 0

    model_config = {"from_attributes": True}


class TenantUpdateOfferOut(BaseModel):
    id: int
    tenant_id: int
    release_id: int
    from_version: str
    to_version: str
    status: str
    created_at: datetime
    applied_at: datetime | None
    release_title: str | None = None
    release_description: str | None = None
    changes: list[ReleaseChangeOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class TenantVersionOut(BaseModel):
    tenant_id: int
    current_version: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class PlatformReleaseReviewCountOut(BaseModel):
    count: int = 0


class PublishToTemplateResult(BaseModel):
    release: PlatformReleaseOut
    template_tenant_id: int
    template_version: str


class OfferToTenantsResult(BaseModel):
    release: PlatformReleaseOut
    offers_created: int
    tenant_ids: list[int]


class ApplyUpdateResult(BaseModel):
    offer: TenantUpdateOfferOut
    tenant_version: TenantVersionOut
