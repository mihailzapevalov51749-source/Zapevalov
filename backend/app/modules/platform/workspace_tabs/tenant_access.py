"""Tenant isolation helpers for workspace tabs API."""

from __future__ import annotations

import re

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.control_plane.platform_identity.session_bridge.runtime_actor_access import (
    assert_runtime_actor_has_tenant_access,
)
from app.modules.control_plane.platform_identity.session_bridge.runtime_auth import (
    RuntimeDesignerActor,
)
from app.modules.platform.workspace_tabs.models import UserWorkspaceTab
from app.modules.users.models import User

WORKSPACE_TAB_TENANT_FORBIDDEN_DETAIL = "Нет доступа к компании для workspace tab"
WORKSPACE_TAB_TENANT_MISMATCH_DETAIL = "Workspace tab не принадлежит указанному tenant"

PORTAL_ROUTE_TENANT_RE = re.compile(r"^/portal/(\d+)(?:/|$)")
DESIGNER_ROUTE_TENANT_RE = re.compile(r"^/designer/tenant/(\d+)(?:/|$)")


def resolve_tenant_id_from_route(route: str) -> int | None:
    normalized_route = str(route or "").strip().split("?")[0].split("#")[0]
    if not normalized_route:
        return None

    portal_match = PORTAL_ROUTE_TENANT_RE.match(normalized_route)
    if portal_match:
        tenant_id = int(portal_match.group(1))
        return tenant_id if tenant_id > 0 else None

    designer_match = DESIGNER_ROUTE_TENANT_RE.match(normalized_route)
    if designer_match:
        tenant_id = int(designer_match.group(1))
        return tenant_id if tenant_id > 0 else None

    return None


def resolve_tab_tenant_id(tab: UserWorkspaceTab) -> int | None:
    if tab.tenant_id is not None:
        tenant_id = int(tab.tenant_id)
        return tenant_id if tenant_id > 0 else None
    return resolve_tenant_id_from_route(tab.route)


def assert_tab_belongs_to_tenant(tab: UserWorkspaceTab, tenant_id: int) -> None:
    tab_tenant_id = resolve_tab_tenant_id(tab)
    if tab_tenant_id is None:
        return

    if int(tab_tenant_id) != int(tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=WORKSPACE_TAB_TENANT_MISMATCH_DETAIL,
        )


def assert_user_has_workspace_tab_tenant_access(
    db: Session,
    current_user: User | RuntimeDesignerActor,
    tenant_id: int | None,
) -> None:
    if tenant_id is None:
        return

    normalized_tenant_id = int(tenant_id)
    if normalized_tenant_id <= 0:
        return

    try:
        assert_runtime_actor_has_tenant_access(db, current_user, normalized_tenant_id)
    except HTTPException as exc:
        if exc.status_code == status.HTTP_403_FORBIDDEN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=WORKSPACE_TAB_TENANT_FORBIDDEN_DETAIL,
            ) from exc
        raise


def user_can_access_workspace_tab_tenant(
    db: Session,
    current_user: User | RuntimeDesignerActor,
    tenant_id: int | None,
) -> bool:
    if tenant_id is None:
        return True
    normalized_tenant_id = int(tenant_id)
    if normalized_tenant_id <= 0:
        return True
    try:
        assert_runtime_actor_has_tenant_access(db, current_user, normalized_tenant_id)
    except HTTPException:
        return False
    return True


def get_workspace_tab_for_user(
    db: Session,
    current_user: User | RuntimeDesignerActor,
    tab_id,
) -> UserWorkspaceTab | None:
    entity = (
        db.query(UserWorkspaceTab)
        .filter(
            UserWorkspaceTab.user_id == int(current_user.id),
            UserWorkspaceTab.id == tab_id,
        )
        .first()
    )
    if entity is None:
        return None

    assert_user_has_workspace_tab_tenant_access(
        db,
        current_user,
        resolve_tab_tenant_id(entity),
    )
    return entity
