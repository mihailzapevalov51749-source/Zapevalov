from app.modules.users.company_invite_email import resolve_company_portal_url


def test_resolve_company_portal_url_appends_tenant_id_query(monkeypatch):
    monkeypatch.setenv("PORTAL_LOGIN_URL", "http://localhost:5173/login")

    assert (
        resolve_company_portal_url(tenant_id=15)
        == "http://localhost:5173/login?tenantId=15"
    )


def test_resolve_company_portal_url_preserves_existing_query(monkeypatch):
    monkeypatch.setenv("PORTAL_LOGIN_URL", "http://localhost:5173/login?source=email")

    assert (
        resolve_company_portal_url(tenant_id=15)
        == "http://localhost:5173/login?source=email&tenantId=15"
    )


def test_resolve_company_portal_url_replaces_placeholder(monkeypatch):
    monkeypatch.setenv(
        "PORTAL_LOGIN_URL",
        "http://localhost:5173/portal/{tenant_id}/page/1",
    )

    assert (
        resolve_company_portal_url(tenant_id=15)
        == "http://localhost:5173/portal/15/page/1?tenantId=15"
    )


def test_resolve_company_portal_url_overwrites_stale_tenant_id(monkeypatch):
    monkeypatch.setenv("PORTAL_LOGIN_URL", "http://localhost:5173/login?tenantId=1")

    assert (
        resolve_company_portal_url(tenant_id=15)
        == "http://localhost:5173/login?tenantId=15"
    )
