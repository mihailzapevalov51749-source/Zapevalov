from app.modules.users.company_invite_email import resolve_company_portal_url_for_tenant_id


def test_resolve_company_portal_url_for_tenant_id_uses_public_slug(db, monkeypatch):
    monkeypatch.setenv("PORTAL_PUBLIC_BASE_URL", "http://localhost:5173")

    from app.modules.portals.models import Portal
    from app.modules.tenant_environment.constants import TenantStatus, TenantType

    portal = Portal(
        name="Tenant URL Test",
        code="tenant_url_test_co",
        public_slug="tenant-url-test",
        tenant_type=TenantType.CLIENT.value,
        tenant_status=TenantStatus.ACTIVE.value,
        is_active=True,
    )
    db.add(portal)
    db.flush()

    assert (
        resolve_company_portal_url_for_tenant_id(db, tenant_id=portal.id)
        == "http://localhost:5173/tenant-url-test"
    )
