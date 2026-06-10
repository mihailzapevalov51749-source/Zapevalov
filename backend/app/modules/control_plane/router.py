from fastapi import APIRouter

from app.modules.control_plane.customer_companies.router import (
    router as customer_companies_router,
)
from app.modules.control_plane.tenant_registry.router import (
    router as tenant_registry_router,
)

router = APIRouter(tags=["Control Plane"])

router.include_router(customer_companies_router)
router.include_router(tenant_registry_router)
