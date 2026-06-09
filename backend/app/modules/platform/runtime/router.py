from fastapi import APIRouter

from app.modules.platform.runtime.actions.router import actions_router
from app.modules.platform.runtime.catalog.router import catalog_router
from app.modules.platform.runtime.entities.router import entities_router
from app.modules.platform.runtime.query.router import query_router
from app.modules.platform.runtime.relation_field.router import relation_fields_router
from app.modules.platform.runtime.relation_instances.router import relations_router
from app.modules.platform.runtime.office_user_views.router import office_user_views_router
from app.modules.platform.runtime.plan_tree.router import plan_tree_router
from app.modules.platform.runtime.search.router import search_router

router = APIRouter(prefix="/runtime")

router.include_router(
    catalog_router,
    prefix="/platform-metadata",
)

router.include_router(actions_router)

router.include_router(entities_router)
router.include_router(relations_router)
router.include_router(relation_fields_router)
router.include_router(query_router)
router.include_router(search_router)
router.include_router(office_user_views_router)
router.include_router(plan_tree_router)
