from fastapi import APIRouter

from app.modules.platform.runtime.catalog.router import catalog_router
from app.modules.platform.runtime.entities.router import entities_router
from app.modules.platform.runtime.relation_instances.router import relations_router

router = APIRouter(prefix="/runtime")

router.include_router(
    catalog_router,
    prefix="/platform-metadata",
)

router.include_router(entities_router)
router.include_router(relations_router)
