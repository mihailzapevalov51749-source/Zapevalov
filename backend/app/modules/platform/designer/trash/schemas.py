from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

TrashEntityKind = Literal[
    "workspace",
    "workspace_tab",
    "object_type",
    "object_view",
    "object_relation",
    "page",
    "navigation",
]


class TrashItemRef(BaseModel):
    kind: TrashEntityKind
    id: str


class TrashListItemRead(BaseModel):
    kind: TrashEntityKind
    id: str
    title: str
    kind_label: str
    placement_label: str = "—"
    deleted_by_label: str = "—"
    deleted_at: datetime | None = None
    created_at: datetime | None = None


class TrashDetailRead(TrashListItemRead):
    deleted_by_id: int | None = None


class TrashListResponse(BaseModel):
    items: list[TrashListItemRead] = Field(default_factory=list)


class TrashBulkRequest(BaseModel):
    items: list[TrashItemRef] = Field(default_factory=list)


class TrashBulkResultItem(BaseModel):
    kind: TrashEntityKind
    id: str
    success: bool
    error: str | None = None


class TrashBulkResponse(BaseModel):
    results: list[TrashBulkResultItem] = Field(default_factory=list)


class TrashDependencyRead(BaseModel):
    label: str
    kind: str | None = None
    entity_kind: str | None = None
    entity_id: str | None = None
    path: list[str] = Field(default_factory=list)


class DependencyTreeNodeRead(BaseModel):
    node_key: str
    kind: str
    title: str
    entity_kind: str | None = None
    entity_id: str | None = None
    path: list[str] = Field(default_factory=list)
    children: list["DependencyTreeNodeRead"] = Field(default_factory=list)


class DependencyTreeRead(BaseModel):
    root: DependencyTreeNodeRead
    total_nodes: int = 0


class TrashDependencyActionRequest(BaseModel):
    mode: Literal["clear", "cascade"]


class TrashDependencyActionResponse(BaseModel):
    mode: Literal["clear", "cascade"]
    deleted_items: list[TrashItemRef] = Field(default_factory=list)
    cleared_dependencies: list[TrashDependencyRead] = Field(default_factory=list)
    tree: DependencyTreeRead | None = None


class TrashCascadeCountItem(BaseModel):
    category: str
    label: str
    count: int


class TrashExternalWarningGroup(BaseModel):
    category: str
    label: str
    items: list[str] = Field(default_factory=list)


class TrashPurgeBlockedResponse(BaseModel):
    blocked: bool = True
    message: str = "Зависимости обнаружены"
    dependencies: list[TrashDependencyRead] = Field(default_factory=list)
    tree: DependencyTreeRead | None = None
    internal_counts: list[TrashCascadeCountItem] = Field(default_factory=list)
    external_warnings: list[TrashExternalWarningGroup] = Field(default_factory=list)
    has_external_warnings: bool = False
