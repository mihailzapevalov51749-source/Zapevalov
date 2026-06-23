"""Tests for platform owner activity context (catalog DB + legacy user id)."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.modules.control_plane.platform_identity.constants import PLATFORM_ROLE_OWNER
from app.modules.control_plane.platform_identity.session_bridge.bridge_designer_actor import (
    InfrastructureBridgeDesignerActor,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_principal import (
    BridgePrincipal,
)
from app.modules.user_activity.activity_context import resolve_user_activity_context


def _bridge_actor() -> InfrastructureBridgeDesignerActor:
    principal = BridgePrincipal(
        platform_identity_id=uuid.uuid4(),
        platform_role=PLATFORM_ROLE_OWNER,
        portal_id=2,
        database_name="yasnopro_template",
        tenant_code="platform_template",
        ticket_id=uuid.uuid4(),
        environment_key="TEMPLATE",
    )
    return InfrastructureBridgeDesignerActor(bridge_principal=principal, id=99)


@patch(
    "app.modules.user_activity.activity_context.open_platform_identity_store_session"
)
@patch(
    "app.modules.user_activity.activity_context.resolve_legacy_user_id_for_platform_identity"
)
def test_bridge_activity_uses_catalog_db_and_legacy_user_id(
    mock_resolve_legacy,
    mock_open_catalog,
) -> None:
    catalog_db = MagicMock()
    mock_open_catalog.return_value = catalog_db
    mock_resolve_legacy.return_value = 17

    actor = _bridge_actor()
    tenant_db = MagicMock()
    ctx = resolve_user_activity_context(tenant_db, actor)

    assert ctx.db is catalog_db
    assert ctx.user_id == 17
    assert ctx.owns_db is True
    mock_resolve_legacy.assert_called_once()


@patch(
    "app.modules.user_activity.activity_context.open_platform_identity_store_session"
)
@patch(
    "app.modules.user_activity.activity_context.resolve_legacy_user_id_for_platform_identity"
)
def test_bridge_activity_fails_without_legacy_user(
    mock_resolve_legacy,
    mock_open_catalog,
) -> None:
    catalog_db = MagicMock()
    mock_open_catalog.return_value = catalog_db
    mock_resolve_legacy.return_value = None

    actor = _bridge_actor()
    with pytest.raises(HTTPException) as exc:
        resolve_user_activity_context(MagicMock(), actor)

    assert exc.value.status_code == 401
    catalog_db.close.assert_called_once()


def test_login_activity_uses_tenant_db_and_actor_id() -> None:
    tenant_db = MagicMock()
    actor = SimpleNamespace(id=5)
    ctx = resolve_user_activity_context(tenant_db, actor)

    assert ctx.db is tenant_db
    assert ctx.user_id == 5
    assert ctx.owns_db is False
