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
from app.modules.platform.designer.workspaces.router import (
    router as workspaces_router,
)
from app.modules.platform.designer.pages.router import (
    router as pages_registry_router,
)
from app.modules.platform.designer.system_menu_settings.router import (
    router as system_menu_settings_router,
)
from app.modules.platform.designer.trash.router import router as trash_router
from app.modules.platform.designer.event_journal.router import (
    router as event_journal_router,
)
from app.modules.platform.action_engine.action_definitions.router import (
    object_type_action_definitions_router,
)
from app.modules.platform.action_engine.action_placements.router import (
    action_definition_placements_router,
)
from app.modules.platform.action_engine.action_forms.router import (
    action_definition_form_router,
)
from app.modules.platform.action_engine.router import router as action_engine_router
from app.modules.platform.shared.dependencies import (
    require_designer_user,
    require_tenant_membership,
)
from app.modules.tenant_users.router import router as tenant_administration_router

# Без tags на агрегаторе — иначе Swagger дублирует endpoints в "designer" + domain tags.
router = APIRouter(prefix="/designer")

tenant_router = APIRouter(
    prefix="/tenants/{tenant_id}",
    dependencies=[
        Depends(require_tenant_membership),
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
tenant_router.include_router(workspaces_router)
tenant_router.include_router(pages_registry_router)
tenant_router.include_router(trash_router)
tenant_router.include_router(event_journal_router)
tenant_router.include_router(action_engine_router)

tenant_router.include_router(
    object_type_action_definitions_router,
    prefix="/object-types/{object_type_id}/action-definitions",
)

tenant_router.include_router(
    action_definition_placements_router,
    prefix="/object-types/{object_type_id}/action-definitions/{action_definition_id}/placements",
)

tenant_router.include_router(
    action_definition_form_router,
    prefix="/object-types/{object_type_id}/action-definitions/{action_definition_id}/form",
)

tenant_router.include_router(tenant_administration_router)
tenant_router.include_router(system_menu_settings_router)

router.include_router(tenant_router)
