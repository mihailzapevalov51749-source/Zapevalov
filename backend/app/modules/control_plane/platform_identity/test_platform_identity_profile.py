"""Tests for unified Platform Identity profile API."""

from __future__ import annotations

import uuid
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.modules.control_plane.platform_identity.models import PlatformIdentity
from app.modules.control_plane.platform_identity.profile_service import (
    get_platform_identity_profile,
    serialize_platform_identity_profile,
)


def test_serialize_platform_identity_profile_uses_identity_store_fields() -> None:
    identity_id = uuid.uuid4()
    identity = PlatformIdentity(
        platform_identity_id=identity_id,
        email="zmn8@ya.ru",
        full_name="Михаил Запевалов",
        phone="89959987006",
        avatar_url="https://cdn.example/avatar.jpg",
        status="active",
    )

    profile = serialize_platform_identity_profile(identity, legacy_user_id=42)

    assert profile.platform_identity_id == str(identity_id)
    assert profile.email == "zmn8@ya.ru"
    assert profile.full_name == "Михаил Запевалов"
    assert profile.phone == "89959987006"
    assert profile.avatar_url == "https://cdn.example/avatar.jpg"
    assert profile.legacy_user_id == 42
    assert profile.profile_source == "platform_identity_store"


@patch(
    "app.modules.control_plane.platform_identity.profile_service.platform_identity_store_session"
)
def test_get_platform_identity_profile_not_found(mock_session_ctx) -> None:
    mock_db = MagicMock()
    mock_db.get.return_value = None
    mock_session_ctx.return_value.__enter__.return_value = mock_db

    with pytest.raises(HTTPException) as exc:
        get_platform_identity_profile(uuid.uuid4())

    assert exc.value.status_code == 404
