from app.modules.portals.schemas import PortalCreateWithFirstAdmin


def test_portal_create_with_first_admin_default_bootstrap_is_dynamic() -> None:
    payload = PortalCreateWithFirstAdmin.model_validate(
        {
            "name": "Test Tenant",
            "first_admin": {
                "full_name": "Admin User",
                "email": "admin@example.com",
            },
        }
    )
    assert payload.bootstrap_from_tenant_id is None
