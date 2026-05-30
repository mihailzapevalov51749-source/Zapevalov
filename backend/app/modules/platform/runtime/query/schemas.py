from pydantic import BaseModel, Field

from app.modules.platform.runtime.entities.schemas import EntityRead

DEFAULT_QUERY_LIMIT = 50
MAX_QUERY_LIMIT = 200


class DefaultSortMeta(BaseModel):
    field: str | None
    order: str = Field(default="desc")


class ViewProjectionMeta(BaseModel):
    visible_fields: list[str] = Field(default_factory=list)
    field_order: list[str] = Field(default_factory=list)
    title_field: str | None = None
    default_sort: DefaultSortMeta = Field(default_factory=DefaultSortMeta)


class PublishedViewMeta(BaseModel):
    key: str
    name: str | None = None
    view_type: str | None = None
    is_default: bool = False
    is_system: bool = False
    settings_json: dict = Field(default_factory=dict)
    filters_json: dict = Field(default_factory=dict)
    layout_json: dict = Field(default_factory=dict)


class ViewProjectionResponse(BaseModel):
    tenant_id: int
    object_type_key: str
    view_key: str | None
    projection: ViewProjectionMeta = Field(default_factory=ViewProjectionMeta)
    object_view: dict | None = None
    filters_json: dict = Field(default_factory=dict)
    view: PublishedViewMeta | None = None


class PaginationMeta(BaseModel):
    limit: int
    offset: int
    total: int
    has_more: bool


class EntityQueryResponse(BaseModel):
    tenant_id: int
    object_type_key: str
    catalog_version: int
    schema_version: int
    items: list[EntityRead] = Field(default_factory=list)
    pagination: PaginationMeta
