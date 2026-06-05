from app.modules.platform.shared.constants import DESIGNER_ROLES
from app.modules.users.models import User

from .models import NavigationItem


def resolve_user_role_name(user: User | None) -> str | None:
    if not user or not user.role:
        return None

    return str(user.role.name or "").strip().lower() or None


def can_manage_navigation(user: User | None) -> bool:
    role_name = resolve_user_role_name(user)
    return role_name in DESIGNER_ROLES


def get_navigation_delete_block_reason(item: NavigationItem | None) -> str | None:
    if not item:
        return "Элемент меню не найден"

    if item.deleted_at is not None:
        return "Элемент меню уже удалён"

    if item.is_protected or item.is_system:
        return (
            "Пункт меню нельзя удалить, так как он является системным "
            "или имеет связанные зависимости."
        )

    return None


def assert_can_delete_navigation_item(user: User, item: NavigationItem) -> None:
    if not can_manage_navigation(user):
        raise ValueError("Недостаточно прав для удаления пунктов меню")

    block_reason = get_navigation_delete_block_reason(item)
    if block_reason:
        raise ValueError(block_reason)
