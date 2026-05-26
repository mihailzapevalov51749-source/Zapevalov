from fastapi import APIRouter, Depends

from app.modules.platform.designer.field_definitions.router import (
    object_type_fields_router,
    tenant_fields_router,
)
from app.modules.platform.designer.relation_definitions.router import (
    object_type_relations_router,
    relations_router,
)
from app.modules.platform.designer.view_definitions.router import (
    object_type_views_router,
    tenant_views_router,
)
from app.modules.platform.designer.object_types.router import (
    router as object_types_router,
)
from app.modules.platform.designer.publish.router import publish_router
from app.modules.platform.shared.dependencies import (
    require_designer_user,
    require_tenant,
)

# Без tags на агрегаторе — иначе Swagger дублирует endpoints в "designer" + domain tags.
router = APIRouter(prefix="/designer")

tenant_router = APIRouter(
    prefix="/tenants/{tenant_id}",
    dependencies=[
        Depends(require_tenant),
        Depends(require_designer_user),
    ],
)

tenant_router.include_router(
    object_types_router,
    prefix="/object-types",
)

tenant_router.include_router(
    object_type_fields_router,
    prefix="/object-types/{object_type_id}/fields",
)

tenant_router.include_router(
    tenant_fields_router,
    prefix="/fields",
)

tenant_router.include_router(
    relations_router,
    prefix="/relations",
)

tenant_router.include_router(
    object_type_relations_router,
    prefix="/object-types/{object_type_id}/relations",
)

tenant_router.include_router(
    object_type_views_router,
    prefix="/object-types/{object_type_id}/views",
)

tenant_router.include_router(
    tenant_views_router,
    prefix="/views",
)

tenant_router.include_router(publish_router)

router.include_router(tenant_router)
