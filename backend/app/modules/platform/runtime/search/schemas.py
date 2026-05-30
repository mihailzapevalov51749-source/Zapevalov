from typing import Any

from pydantic import BaseModel, Field


MAX_SEARCH_LIMIT = 50
DEFAULT_SEARCH_LIMIT = 20


class RuntimeSearchParams(BaseModel):
    objectTypeId: str | None = None
    objectTypeKey: str | None = None
    libraryId: int | None = None
    folderId: int | None = None
    sectionId: int | str | None = None
    entityId: str | None = None


class RuntimeSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=256)
    scope: str = Field(..., min_length=1, max_length=64)
    params: RuntimeSearchParams = Field(default_factory=RuntimeSearchParams)
    limit: int = Field(default=DEFAULT_SEARCH_LIMIT, ge=1, le=MAX_SEARCH_LIMIT)


class RuntimeSearchResultMeta(BaseModel):
    objectTypeId: str | None = None
    objectTypeKey: str | None = None
    entityId: str | None = None
    libraryId: int | None = None
    folderId: int | None = None
    documentId: int | None = None
    isFolder: bool | None = None


class RuntimeSearchResultItem(BaseModel):
    id: str
    type: str
    title: str
    subtitle: str | None = None
    path: str | None = None
    rank: int
    source: str
    meta: RuntimeSearchResultMeta = Field(default_factory=RuntimeSearchResultMeta)


class RuntimeSearchResponse(BaseModel):
    query: str
    scope: str
    results: list[RuntimeSearchResultItem] = Field(default_factory=list)
    meta: dict[str, Any] = Field(default_factory=dict)
