from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

PagePublicationStatus = Literal["draft", "published", "hidden"]
PageUsageKind = Literal["workspace_home", "workspace_tab", "navigation"]


class PageUsageRead(BaseModel):
    kind: PageUsageKind
    workspace_id: int | None = None
    workspace_title: str | None = None
    workspace_slug: str | None = None
    navigation_item_id: int | None = None
    menu_scope: str | None = None
    label: str
    path_segments: list[str] = Field(default_factory=list)


class PageRegistryExtensionsRead(BaseModel):
    versions: dict[str, Any] = Field(default_factory=lambda: {"available": False})
    change_history: dict[str, Any] = Field(default_factory=lambda: {"available": False})
    usage_map: dict[str, Any] = Field(default_factory=lambda: {"available": True})
    page_tree: dict[str, Any] = Field(default_factory=lambda: {"available": False})


class PageBlockSummaryRead(BaseModel):
    type: str
    title: str
    label: str
    sort_order: int = 0
    display_title: str = ""
    detail_lines: list[str] = Field(default_factory=list)
    related_object_names: list[str] = Field(default_factory=list)


class PageRegistryListItemRead(BaseModel):
    id: int
    portal_id: int
    title: str
    description: str | None = None
    page_type: str
    slug: str
    status: PagePublicationStatus
    status_label: str
    is_home: bool
    workspace_titles: list[str] = Field(default_factory=list)
    workspace_label: str
    block_count: int = 0
    usage_count: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None
    author: str | None = None
    is_protected: bool = False


class PageRegistryDetailRead(PageRegistryListItemRead):
    usages: list[PageUsageRead] = Field(default_factory=list)
    bindings: list[PageUsageRead] = Field(default_factory=list)
    blocks: list[PageBlockSummaryRead] = Field(default_factory=list)
    related_objects: list[str] = Field(default_factory=list)
    placement_paths: list[list[str]] = Field(default_factory=list)
    extensions: PageRegistryExtensionsRead = Field(default_factory=PageRegistryExtensionsRead)


class PageRegistryListResponse(BaseModel):
    items: list[PageRegistryListItemRead] = Field(default_factory=list)


class PageDuplicateResponse(BaseModel):
    source_page_id: int
    page: PageRegistryListItemRead


class PageBulkDeleteRequest(BaseModel):
    page_ids: list[int] = Field(default_factory=list, min_length=1)


class PageBulkDeleteSkippedItem(BaseModel):
    id: int
    title: str
    reason: str = "protected_page"


class PageBulkDeleteResponse(BaseModel):
    deleted_count: int = 0
    deleted_ids: list[int] = Field(default_factory=list)
    skipped: list[PageBulkDeleteSkippedItem] = Field(default_factory=list)
    message: str = ""
