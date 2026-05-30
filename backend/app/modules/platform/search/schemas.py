from typing import Any, Literal

from pydantic import BaseModel, Field

from app.modules.platform.runtime.search.schemas import (
    DEFAULT_SEARCH_LIMIT,
    MAX_SEARCH_LIMIT,
    RuntimeSearchParams,
    RuntimeSearchResultItem,
    RuntimeSearchResultMeta,
)

SearchDomain = Literal["runtime", "designer"]
SearchMode = Literal["runtime", "designer"]


class PlatformSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=256)
    scope: str = Field(..., min_length=1, max_length=64)
    currentMode: SearchMode = "runtime"
    params: RuntimeSearchParams = Field(default_factory=RuntimeSearchParams)
    limit: int = Field(default=DEFAULT_SEARCH_LIMIT, ge=1, le=MAX_SEARCH_LIMIT)
    requestedDomains: list[SearchDomain] | None = None


class PlatformSearchResponse(BaseModel):
    query: str
    scope: str
    currentMode: SearchMode
    results: list[RuntimeSearchResultItem] = Field(default_factory=list)
    meta: dict[str, Any] = Field(default_factory=dict)


class PlatformSearchResultMeta(RuntimeSearchResultMeta):
    domain: str | None = None
    designerEntityId: str | None = None
