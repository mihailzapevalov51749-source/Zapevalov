from __future__ import annotations

from app.modules.platform.runtime.menu_settings.schemas import (
    TenantRuntimeMenuSettingUpsert,
    UserMenuPreferenceUpsert,
)
from app.modules.platform.runtime.menu_settings import service


def test_normalize_item_key_rejects_empty():
    try:
        service.normalize_item_key("   ")
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_tenant_and_user_payload_contract_fields():
    tenant_payload = TenantRuntimeMenuSettingUpsert(
        navigation_item_id=12,
        is_visible=False,
        title="Календарь",
    )
    assert tenant_payload.is_visible is False
    assert tenant_payload.title == "Календарь"

    user_payload = UserMenuPreferenceUpsert(
        navigation_item_id=12,
        is_hidden=True,
        sort_order=5,
        personal_block_key="block:3",
    )
    assert user_payload.is_hidden is True
    assert user_payload.sort_order == 5
    assert user_payload.personal_block_key == "block:3"
