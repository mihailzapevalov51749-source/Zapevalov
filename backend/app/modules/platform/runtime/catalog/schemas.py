from datetime import datetime
from typing import Any

from pydantic import BaseModel


class RuntimeCatalogVersionInfo(BaseModel):
    tenant_id: int
    catalog_version: int
    schema_version: int
    published_at: datetime
    payload_hash: str


class RuntimeCatalogPayload(BaseModel):
    schema_version: int
    catalog_version: int
    tenant_id: int
    published_at: str
    object_types: list[dict[str, Any]]
    relations: list[dict[str, Any]]
