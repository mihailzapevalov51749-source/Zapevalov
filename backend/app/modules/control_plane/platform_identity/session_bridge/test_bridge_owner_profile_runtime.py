"""Tests for runtime bridge owner profile enrichment (JWT principal only)."""

from __future__ import annotations

import uuid
from unittest.mock import MagicMock, patch

from app.modules.control_plane.platform_identity.constants import PLATFORM_ROLE_OWNER
from app.modules.control_plane.platform_identity.models import PlatformIdentity
from app.modules.control_plane.platform_identity.session_bridge.bridge_owner_profile import (
    enrich_bridge_principal_owner_profile,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_principal import (
    BridgePrincipal,
)
from app.modules.control_plane.platform_identity.session_bridge.response_builders import (
    build_bridge_me_response,
)


def test_enrich_bridge_principal_updates_principal_not_api_projection() -> None:
    identity_id = uuid.uuid4()
    principal = BridgePrincipal(
        platform_identity_id=identity_id,
        platform_role=PLATFORM_ROLE_OWNER,
        portal_id=2,
        database_name="yasnopro_template",
        tenant_code="platform_template",
        ticket_id=uuid.uuid4(),
        environment_key="TEMPLATE",
        owner_display_name="Platform Owner",
        owner_email="zmn8@ya.ru",
    )
    identity = PlatformIdentity(
        platform_identity_id=identity_id,
        email="zmn8@ya.ru",
        full_name="Михаил Запевалов",
        phone="89959987006",
        status="active",
    )
    identity_db = MagicMock()
    identity_db.get.return_value = identity

    with patch(
        "app.modules.control_plane.platform_identity.session_bridge.bridge_owner_profile.platform_identity_store_session",
    ) as session_ctx:
        session_ctx.return_value.__enter__.return_value = identity_db
        enriched = enrich_bridge_principal_owner_profile(principal)
        response = build_bridge_me_response(enriched)

    assert enriched.owner_display_name == "Михаил Запевалов"
    assert enriched.owner_email == "zmn8@ya.ru"
    assert enriched.owner_phone == "89959987006"
    assert response.display_name is None
    assert response.email is None
    assert response.phone is None
    assert response.is_platform_owner is True


def test_enrich_bridge_principal_skips_identity_lookup_for_client_context() -> None:
    principal = BridgePrincipal(
        platform_identity_id=uuid.uuid4(),
        platform_role=PLATFORM_ROLE_OWNER,
        portal_id=21,
        database_name="yasnopro_client",
        tenant_code="ooo_rozetka",
        ticket_id=uuid.uuid4(),
        owner_display_name="Platform Owner",
        owner_email="zmn8@ya.ru",
    )

    with patch(
        "app.modules.control_plane.platform_identity.session_bridge.bridge_owner_profile.platform_identity_store_session",
    ) as session_ctx:
        enriched = enrich_bridge_principal_owner_profile(principal)
        session_ctx.assert_not_called()

    assert enriched is principal
