from pydantic import BaseModel, Field


class CloneTenantStructureRequest(BaseModel):
    source_tenant_id: int = Field(..., ge=1)


class CloneTenantStructureResponse(BaseModel):
    source_tenant_id: int
    target_tenant_id: int
    pages_cloned: int
    navigation_items_cloned: int
    object_types_cloned: int
    workspaces_cloned: int
    catalog_version: int | None = None
