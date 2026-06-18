"""Public company URLs based on portals.public_slug."""

from __future__ import annotations

import os
from urllib.parse import urlparse, urlunparse

from sqlalchemy.orm import Session

from app.modules.portals.repository import get_portal
from app.shared.public_slug import normalize_public_slug

DEFAULT_PORTAL_PUBLIC_BASE_URL = "http://localhost:5173"


def resolve_portal_public_base_url() -> str:
    explicit = str(os.getenv("PORTAL_PUBLIC_BASE_URL", "") or "").strip()
    if explicit:
        return explicit.rstrip("/")

    login_url = str(
        os.getenv("PORTAL_LOGIN_URL", DEFAULT_PORTAL_PUBLIC_BASE_URL) or ""
    ).strip()
    if not login_url:
        return DEFAULT_PORTAL_PUBLIC_BASE_URL

    parsed = urlparse(login_url)
    path = parsed.path.rstrip("/")
    if path.endswith("/login"):
        path = path[: -len("/login")] or ""

    return urlunparse(
        parsed._replace(path=path or "", query="", fragment="")
    ).rstrip("/") or DEFAULT_PORTAL_PUBLIC_BASE_URL


def resolve_company_portal_url(*, public_slug: str) -> str:
    slug = normalize_public_slug(public_slug)
    if not slug:
        raise ValueError("public_slug is required")

    return f"{resolve_portal_public_base_url()}/{slug}"


def resolve_company_portal_url_for_tenant(db: Session, tenant_id: int) -> str:
    portal = get_portal(db, tenant_id)
    if portal is None:
        raise ValueError(f"Tenant portal {tenant_id} not found")

    public_slug = str(portal.public_slug or "").strip()
    if not public_slug:
        raise ValueError(f"Tenant portal {tenant_id} has no public_slug")

    return resolve_company_portal_url(public_slug=public_slug)
