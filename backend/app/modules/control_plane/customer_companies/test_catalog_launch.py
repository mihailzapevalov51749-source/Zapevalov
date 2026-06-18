from __future__ import annotations

from app.modules.control_plane.customer_companies.catalog_launch import (
    build_company_open_path,
    build_company_open_url,
    resolve_api_base_url,
    resolve_frontend_base_url,
)


def test_resolve_frontend_base_url_from_environment_matrix() -> None:
    assert (
        resolve_frontend_base_url(database_name="yasnopro_client")
        == "http://localhost:5175"
    )


def test_resolve_api_base_url_from_environment_matrix() -> None:
    assert (
        resolve_api_base_url(database_name="yasnopro_client")
        == "http://localhost:8012"
    )


def test_stored_urls_override_matrix() -> None:
    assert (
        resolve_frontend_base_url(
            database_name="yasnopro_client",
            stored_frontend_base_url="https://client.example.com/",
        )
        == "https://client.example.com"
    )


def test_build_company_open_url() -> None:
    assert (
        build_company_open_url(
            frontend_base_url="http://localhost:5175",
            portal_id=21,
            home_page_id=1067,
        )
        == "http://localhost:5175/portal/21/page/1067"
    )


def test_build_company_open_url_requires_home_page() -> None:
    assert (
        build_company_open_url(
            frontend_base_url="http://localhost:5175",
            portal_id=21,
            home_page_id=None,
        )
        is None
    )


def test_build_company_open_path() -> None:
    assert build_company_open_path(portal_id=21, home_page_id=1067) == "/portal/21/page/1067"
