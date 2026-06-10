from app.modules.portals.schemas import PortalCreate
from app.modules.tenant_bootstrap.constants import DEFAULT_BOOTSTRAP_FROM_TENANT_ID


def test_portal_create_default_bootstrap_from_platform_template():
    payload = PortalCreate(name="Test Tenant")
    assert payload.bootstrap_from_tenant_id == DEFAULT_BOOTSTRAP_FROM_TENANT_ID
    assert payload.bootstrap_from_tenant_id == 2
