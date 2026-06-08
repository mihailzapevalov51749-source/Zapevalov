from fastapi import APIRouter

from app.modules.platform.action_engine.action_categories.router import (
    router as action_categories_router,
)
from app.modules.platform.action_engine.action_placements.catalog_router import (
    router as action_placements_catalog_router,
)
from app.modules.platform.action_engine.action_types.router import (
    router as action_types_router,
)

router = APIRouter()

router.include_router(action_categories_router)
router.include_router(action_types_router)
router.include_router(action_placements_catalog_router)
