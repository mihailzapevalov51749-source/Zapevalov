"""Tests for Platform Owner profile enrichment before bridge mint."""

from __future__ import annotations

import uuid
from unittest.mock import MagicMock

from app.modules.control_plane.platform_identity.constants import PLATFORM_ROLE_OWNER
from app.modules.control_plane.platform_identity.models import PlatformIdentity
from app.modules.control_plane.platform_identity.principal.owner_profile import (
    enrich_platform_principal_owner_profile,
)
from app.modules.control_plane.platform_identity.principal.types import PlatformPrincipal


def test_enrich_platform_principal_fills_missing_profile_from_identity_store() -> None:
    identity_id = uuid.uuid4()
    principal = PlatformPrincipal(
        platform_identity_id=identity_id,
        platform_role=PLATFORM_ROLE_OWNER,
        email="",
        display_name=None,
    )
    identity = PlatformIdentity(
        platform_identity_id=identity_id,
        email="zmn8@ya.ru",
        full_name="Михаил Запевалов",
        phone="89959987006",
        avatar_url="https://cdn.example/owner.png",
        status="active",
    )
    db = MagicMock()
    db.get.return_value = identity

    enriched = enrich_platform_principal_owner_profile(db, principal)

    assert enriched.email == "zmn8@ya.ru"
    assert enriched.display_name == "Михаил Запевалов"
    assert enriched.phone == "89959987006"
    assert enriched.avatar_url == "https://cdn.example/owner.png"


def test_enrich_platform_principal_fills_phone_when_name_and_email_already_present() -> None:
    identity_id = uuid.uuid4()
    principal = PlatformPrincipal(
        platform_identity_id=identity_id,
        platform_role=PLATFORM_ROLE_OWNER,
        email="zmn8@ya.ru",
        display_name="Михаил Запевалов",
    )
    identity = PlatformIdentity(
        platform_identity_id=identity_id,
        email="zmn8@ya.ru",
        full_name="Михаил Запевалов",
        phone="89959987006",
        status="active",
    )
    db = MagicMock()
    db.get.return_value = identity

    enriched = enrich_platform_principal_owner_profile(db, principal)

    assert enriched is not principal
    assert enriched.phone == "89959987006"


def test_enrich_platform_principal_keeps_existing_profile() -> None:
    identity_id = uuid.uuid4()
    principal = PlatformPrincipal(
        platform_identity_id=identity_id,
        platform_role=PLATFORM_ROLE_OWNER,
        email="owner@test",
        display_name="Owner",
        phone="89959987006",
        avatar_url="https://cdn.example/owner.png",
    )
    identity = PlatformIdentity(
        platform_identity_id=identity_id,
        email="owner@test",
        full_name="Owner",
        phone="89959987006",
        avatar_url="https://cdn.example/owner.png",
        status="active",
    )
    db = MagicMock()
    db.get.return_value = identity

    enriched = enrich_platform_principal_owner_profile(db, principal)

    assert enriched is principal
