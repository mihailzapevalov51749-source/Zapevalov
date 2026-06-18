from fastapi import APIRouter

from app.modules.control_plane.company_administrator.router import (
    router as company_administrator_router,
)
from app.modules.control_plane.customer_companies.router import (
    router as customer_companies_router,
)
from app.modules.control_plane.platform_profile.router import (
    router as platform_profile_router,
)
from app.modules.control_plane.global_users.router import (
    router as global_users_router,
)
from app.modules.control_plane.platform_environments.router import (
    router as platform_environments_router,
)
from app.modules.control_plane.platform_users.router import (
    router as platform_users_router,
)
from app.modules.control_plane.tenant_registry.router import (
    router as tenant_registry_router,
)

router = APIRouter(tags=["Control Plane"])

router.include_router(company_administrator_router)
router.include_router(customer_companies_router)
router.include_router(platform_environments_router)
router.include_router(tenant_registry_router)
router.include_router(platform_profile_router)
router.include_router(platform_users_router)
router.include_router(global_users_router)
