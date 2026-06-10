from fastapi import APIRouter

from app.modules.control_plane.customer_companies.router import (
    router as customer_companies_router,
)

router = APIRouter(tags=["Control Plane"])

router.include_router(customer_companies_router)
