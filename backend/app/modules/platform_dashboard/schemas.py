import json
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

from app.modules.platform_dashboard.datetime_utils import serialize_utc_datetime


def parse_json_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item) for item in value]
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return []
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            return [line.strip() for line in text.splitlines() if line.strip()]
        if isinstance(parsed, list):
            return [str(item) for item in parsed]
    return []


def parse_json_object(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return {}
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            return {}
        if isinstance(parsed, dict):
            return parsed
    return {}


class PlatformComponentRelatedIssueRead(BaseModel):
    id: int
    title: str
    status: str


class PlatformComponentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    title: str
    description: str | None = None
    status: str
    readiness: int | None = None
    completed_items: list[str] = Field(default_factory=list)
    remaining_items: list[str] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)
    architecture_debt: list[str] = Field(default_factory=list)
    related_issues: list[PlatformComponentRelatedIssueRead] = Field(default_factory=list)
    updated_at: datetime

    @field_serializer("updated_at")
    def serialize_updated_at(self, value: datetime) -> str:
        return serialize_utc_datetime(value) or ""

    @field_validator("completed_items", "remaining_items", "dependencies", "architecture_debt", mode="before")
    @classmethod
    def normalize_items(cls, value: Any) -> list[str]:
        return parse_json_list(value)


class PlatformImplementationStageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    title: str
    description: str | None = None
    status: str
    readiness: int | None = None
    order_index: int
    current_position: bool
    completed_items: list[str] = Field(default_factory=list)
    remaining_items: list[str] = Field(default_factory=list)
    current_tasks: list[str] = Field(default_factory=list)
    next_tasks: list[str] = Field(default_factory=list)
    blockers: list[str] = Field(default_factory=list)
    completion_criteria: list[str] = Field(default_factory=list)
    updated_at: datetime

    @field_serializer("updated_at")
    def serialize_updated_at(self, value: datetime) -> str:
        return serialize_utc_datetime(value) or ""

    @field_validator(
        "completed_items",
        "remaining_items",
        "current_tasks",
        "next_tasks",
        "blockers",
        "completion_criteria",
        mode="before",
    )
    @classmethod
    def normalize_items(cls, value: Any) -> list[str]:
        return parse_json_list(value)


class PlatformTaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None = None
    stage_id: int | None = None
    component_id: int | None = None
    status: str
    priority: str
    created_at: datetime
    updated_at: datetime
    closed_at: datetime | None = None

    @field_serializer("created_at", "updated_at", "closed_at")
    def serialize_task_datetimes(self, value: datetime | None) -> str | None:
        return serialize_utc_datetime(value)


class PlatformActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str | None = None
    title: str
    description: str | None = None
    result: str | None = None
    type: str
    meta: dict[str, Any] = Field(default_factory=dict)
    initiated_by_user_id: int | None = None
    initiated_by_name: str | None = None
    created_at: datetime
    related_stage_id: int | None = None
    related_component_id: int | None = None
    related_issue_id: int | None = None

    @field_validator("meta", mode="before")
    @classmethod
    def normalize_meta(cls, value: Any) -> dict[str, Any]:
        return parse_json_object(value)

    @field_serializer("created_at")
    def serialize_created_at(self, value: datetime) -> str:
        return serialize_utc_datetime(value) or ""


class PlatformDashboardFreshnessRead(BaseModel):
    refreshed_at: datetime | None = None
    analyzer_version: str
    analyzer_hash: str | None = None
    current_analyzer_hash: str
    is_stale: bool

    @field_serializer("refreshed_at")
    def serialize_refreshed_at(self, value: datetime | None) -> str | None:
        return serialize_utc_datetime(value)


class PlatformComponentsResponse(BaseModel):
    items: list[PlatformComponentRead] = Field(default_factory=list)
    freshness: PlatformDashboardFreshnessRead


class PlatformStagesResponse(BaseModel):
    items: list[PlatformImplementationStageRead] = Field(default_factory=list)
    freshness: PlatformDashboardFreshnessRead


class PlatformDashboardSummaryRead(BaseModel):
    last_updated: datetime | None = None
    refreshed_at: datetime | None = None
    analyzer_version: str | None = None
    analyzer_hash: str | None = None
    current_analyzer_hash: str | None = None
    is_stale: bool = False
    components_count: int
    stages_count: int
    tasks_total: int
    tasks_done: int
    issues_total: int
    issues_open: int
    overall_readiness: int | None = None

    @field_serializer("last_updated", "refreshed_at")
    def serialize_last_updated(self, value: datetime | None) -> str | None:
        return serialize_utc_datetime(value)


class PlatformDashboardRefreshRead(BaseModel):
    components_count: int
    stages_count: int
    activities_added: int
    overall_readiness: int | None = None
    refreshed_at: datetime
    analyzer_version: str
    analyzer_hash: str
    current_analyzer_hash: str
    is_stale: bool = False

    @field_serializer("refreshed_at")
    def serialize_refreshed_at(self, value: datetime) -> str:
        return serialize_utc_datetime(value) or ""
