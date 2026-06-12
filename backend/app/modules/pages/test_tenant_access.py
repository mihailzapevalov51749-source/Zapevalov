"""Unit tests for page tenant access helpers."""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.modules.pages.tenant_access import (
    PAGE_PORTAL_FORBIDDEN_DETAIL,
    assert_page_belongs_to_portal,
    resolve_request_portal_id,
)


def test_resolve_request_portal_id_prefers_query_param() -> None:
    request = SimpleNamespace(
        headers={
            "referer": "http://localhost/portal/99/page/1",
            "x-portal-id": "77",
        }
    )

    assert resolve_request_portal_id(portal_id=13, request=request) == 13


def test_resolve_request_portal_id_uses_header_when_query_missing() -> None:
    request = SimpleNamespace(headers={"x-portal-id": "77"})

    assert resolve_request_portal_id(request=request) == 77


def test_resolve_request_portal_id_uses_portal_referer() -> None:
    request = SimpleNamespace(
        headers={"referer": "http://localhost/portal/42/page/5"}
    )

    assert resolve_request_portal_id(request=request) == 42


def test_resolve_request_portal_id_uses_designer_referer() -> None:
    request = SimpleNamespace(
        headers={"referer": "http://localhost/designer/tenant/15/pages"}
    )

    assert resolve_request_portal_id(request=request) == 15


def test_assert_page_belongs_to_portal_allows_match() -> None:
    page = SimpleNamespace(portal_id=3)
    assert_page_belongs_to_portal(page, 3)


def test_assert_page_belongs_to_portal_blocks_mismatch() -> None:
    page = SimpleNamespace(portal_id=1)

    with pytest.raises(HTTPException) as exc_info:
        assert_page_belongs_to_portal(page, 2)

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == PAGE_PORTAL_FORBIDDEN_DETAIL
