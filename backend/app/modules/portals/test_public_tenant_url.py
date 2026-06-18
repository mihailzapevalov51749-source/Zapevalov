from app.modules.portals.public_tenant_url import (
    resolve_company_portal_url,
    resolve_portal_public_base_url,
)


def test_resolve_company_portal_url_uses_public_slug(monkeypatch):
    monkeypatch.setenv("PORTAL_PUBLIC_BASE_URL", "https://yasnopro.ru")

    assert (
        resolve_company_portal_url(public_slug="rozetka")
        == "https://yasnopro.ru/rozetka"
    )


def test_resolve_portal_public_base_url_strips_login_suffix(monkeypatch):
    monkeypatch.delenv("PORTAL_PUBLIC_BASE_URL", raising=False)
    monkeypatch.setenv("PORTAL_LOGIN_URL", "http://localhost:5173/login")

    assert resolve_portal_public_base_url() == "http://localhost:5173"


def test_resolve_company_portal_url_local_dev(monkeypatch):
    monkeypatch.delenv("PORTAL_PUBLIC_BASE_URL", raising=False)
    monkeypatch.setenv("PORTAL_LOGIN_URL", "http://localhost:5173/login")

    assert (
        resolve_company_portal_url(public_slug="rozetka")
        == "http://localhost:5173/rozetka"
    )
