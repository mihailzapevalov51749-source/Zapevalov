"""Tests for Session Bridge foundation (WI-06)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.modules.control_plane.platform_identity.constants import PLATFORM_ROLE_OWNER
from app.modules.control_plane.platform_identity.principal.types import PlatformPrincipal
from app.modules.control_plane.platform_identity.session_bridge import (
    BridgePrincipal,
    build_bridge_principal,
    bridge_trust_contract,
    mint_bridge_ticket,
    validate_bridge_ticket,
)
from app.modules.control_plane.platform_identity.session_bridge.issuer import (
    mint_bridge_ticket as issuer_mint,
)


@pytest.fixture()
def platform_principal() -> PlatformPrincipal:
    return PlatformPrincipal(
        platform_identity_id=uuid.uuid4(),
        platform_role=PLATFORM_ROLE_OWNER,
        email="owner@platform.test",
        display_name="Owner",
    )


def test_mint_bridge_ticket_produces_valid_token(platform_principal) -> None:
    ticket = mint_bridge_ticket(
        platform_principal,
        portal_id=21,
        database_name="yasnopro_client",
        tenant_code="ooo_rozetka",
    )

    assert ticket.token
    assert ticket.claims.ticket_id is not None
    assert ticket.claims.platform_identity_id == platform_principal.platform_identity_id
    assert ticket.claims.platform_role == PLATFORM_ROLE_OWNER
    assert ticket.claims.portal_id == 21
    assert ticket.claims.database_name == "yasnopro_client"
    assert ticket.claims.tenant_code == "ooo_rozetka"


def test_validate_bridge_ticket_success(platform_principal) -> None:
    ticket = mint_bridge_ticket(
        platform_principal,
        portal_id=21,
        database_name="portal_constructor_v2",
        tenant_code="dev_tenant",
    )

    result = validate_bridge_ticket(ticket.token)

    assert result.is_valid is True
    assert result.status == "valid"
    assert result.claims is not None
    assert result.claims.ticket_id == ticket.claims.ticket_id
    assert result.claims.platform_identity_id == platform_principal.platform_identity_id


def test_mint_bridge_ticket_includes_environment_key_for_template(platform_principal) -> None:
    ticket = mint_bridge_ticket(
        platform_principal,
        portal_id=2,
        database_name="yasnopro_template",
        tenant_code="platform_template",
        environment_key="TEMPLATE",
    )

    assert ticket.claims.environment_key == "TEMPLATE"
    result = validate_bridge_ticket(ticket.token)
    assert result.is_valid is True
    assert result.claims is not None
    assert result.claims.environment_key == "TEMPLATE"


def test_validate_expired_bridge_ticket_rejected(platform_principal) -> None:
    issued_at = datetime.now(timezone.utc) - timedelta(minutes=10)
    ticket = issuer_mint(
        platform_principal,
        portal_id=21,
        database_name="yasnopro_client",
        tenant_code="ooo_rozetka",
        ttl_seconds=60,
        issued_at=issued_at,
    )

    result = validate_bridge_ticket(ticket.token)

    assert result.is_valid is False
    assert result.status == "expired"
    assert result.error_code == "expired"


def test_build_bridge_principal_from_validated_claims(platform_principal) -> None:
    ticket = mint_bridge_ticket(
        platform_principal,
        portal_id=21,
        database_name="yasnopro_client",
        tenant_code="ooo_rozetka",
    )
    result = validate_bridge_ticket(ticket.token)
    assert result.claims is not None

    principal = build_bridge_principal(result.claims)

    assert isinstance(principal, BridgePrincipal)
    assert principal.principal_type == "bridge"
    assert principal.platform_identity_id == platform_principal.platform_identity_id
    assert principal.platform_role == PLATFORM_ROLE_OWNER
    assert principal.portal_id == 21
    assert principal.database_name == "yasnopro_client"
    assert principal.tenant_code == "ooo_rozetka"
    assert principal.ticket_id == ticket.claims.ticket_id
    assert principal.environment_key is None
    assert principal.is_infrastructure_superadmin is False
    assert not hasattr(principal, "user_id")


def test_bridge_trust_contract_documents_hs256_and_future_rs256() -> None:
    contract = bridge_trust_contract()
    assert contract["issuer"] == "yasnopro-platform-cp"
    assert contract["audience"] == "yasnopro-tenant-bridge"
    assert contract["algorithm"] == "HS256"
    assert contract["algorithm_future"] == "RS256"
