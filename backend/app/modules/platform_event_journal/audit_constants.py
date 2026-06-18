"""Platform audit journal — categories, event codes, statuses.

Platform-only taxonomy. Tenant journal uses tenant_audit_constants.
"""

from __future__ import annotations

from enum import Enum


class PlatformEventCategory(str, Enum):
    PROVISIONING = "provisioning"
    COMPANY = "company"
    LICENSE = "license"
    PLATFORM_OWNER = "platform_owner"
    PLATFORM_SETTINGS = "platform_settings"
    PLATFORM_USER = "platform_user"
    PLATFORM_ROLE = "platform_role"
    TEMPLATE = "template"
    PUBLICATION = "publication"
    SECURITY = "security"
    BOOTSTRAP = "bootstrap"
    SYSTEM = "system"


class PlatformEventCode(str, Enum):
    COMPANY_CREATED = "company_created"
    COMPANY_DELETED = "company_deleted"
    COMPANY_ARCHIVED = "company_archived"
    COMPANY_UPDATED = "company_updated"
    COMPANY_OPENED = "company_opened"

    COMPANY_SUPERADMIN_CREATED = "company_superadmin_created"
    COMPANY_SUPERADMIN_INVITED = "company_superadmin_invited"
    COMPANY_ADMINISTRATOR_CHANGED = "company_administrator_changed"
    COMPANY_INVITATION_SENT = "company_invitation_sent"

    LICENSE_CREATED = "license_created"
    LICENSE_EXTENDED = "license_extended"
    LICENSE_EXPIRED = "license_expired"
    LICENSE_REVOKED = "license_revoked"

    PLATFORM_OWNER_CREATED = "platform_owner_created"
    PLATFORM_OWNER_CHANGED = "platform_owner_changed"
    PLATFORM_OWNER_UPDATED = "platform_owner_updated"

    PLATFORM_SETTINGS_UPDATED = "platform_settings_updated"

    PLATFORM_USER_CREATED = "platform_user_created"
    PLATFORM_USER_UPDATED = "platform_user_updated"
    PLATFORM_USER_DELETED = "platform_user_deleted"
    PLATFORM_USER_BLOCKED = "platform_user_blocked"
    PLATFORM_USER_UNBLOCKED = "platform_user_unblocked"

    PLATFORM_ROLE_CREATED = "platform_role_created"
    PLATFORM_ROLE_UPDATED = "platform_role_updated"
    PLATFORM_ROLE_DELETED = "platform_role_deleted"

    TEMPLATE_VERSION_CREATED = "template_version_created"
    TEMPLATE_PUBLISHED = "template_published"
    TEMPLATE_UPDATE_SENT = "template_update_sent"

    RELEASE_REVIEW_STARTED = "release_review_started"
    RELEASE_APPROVED = "release_approved"
    RELEASE_CHANGES_REQUESTED = "release_changes_requested"

    BOOTSTRAP_OWNER_CREATED = "bootstrap_owner_created"
    BOOTSTRAP_OWNER_USED = "bootstrap_owner_used"
    BOOTSTRAP_OWNER_DISABLED = "bootstrap_owner_disabled"
    BOOTSTRAP_OWNER_REACTIVATED = "bootstrap_owner_reactivated"

    SECURITY_LOGIN_SUCCESS = "security_login_success"
    SECURITY_LOGIN_FAILED = "security_login_failed"

    LEGACY = "legacy"


class PlatformAuditStatus(str, Enum):
    DONE = "done"
    ERROR = "error"
    WARNING = "warning"
    COMPLETED = "completed"
    IN_PROGRESS = "in_progress"
    PLANNED = "planned"


PLATFORM_EVENT_CATEGORY_LABELS: dict[str, str] = {
    PlatformEventCategory.PROVISIONING.value: "Provisioning",
    PlatformEventCategory.COMPANY.value: "Company",
    PlatformEventCategory.LICENSE.value: "License",
    PlatformEventCategory.PLATFORM_OWNER.value: "Platform Owner",
    PlatformEventCategory.PLATFORM_SETTINGS.value: "Platform Settings",
    PlatformEventCategory.PLATFORM_USER.value: "Platform User",
    PlatformEventCategory.PLATFORM_ROLE.value: "Platform Role",
    PlatformEventCategory.TEMPLATE.value: "Template",
    PlatformEventCategory.PUBLICATION.value: "Publication",
    PlatformEventCategory.SECURITY.value: "Security",
    PlatformEventCategory.BOOTSTRAP.value: "Bootstrap",
    PlatformEventCategory.SYSTEM.value: "System",
}

PLATFORM_EVENT_CODE_LABELS: dict[str, str] = {
    PlatformEventCode.COMPANY_CREATED.value: "Создание компании",
    PlatformEventCode.COMPANY_DELETED.value: "Удаление компании",
    PlatformEventCode.COMPANY_ARCHIVED.value: "Архивация компании",
    PlatformEventCode.COMPANY_UPDATED.value: "Изменение компании",
    PlatformEventCode.COMPANY_OPENED.value: "Открытие компании",
    PlatformEventCode.COMPANY_SUPERADMIN_CREATED.value: "Создание Company Superadmin",
    PlatformEventCode.COMPANY_SUPERADMIN_INVITED.value: "Приглашение Company Superadmin",
    PlatformEventCode.COMPANY_ADMINISTRATOR_CHANGED.value: "Смена администратора компании",
    PlatformEventCode.COMPANY_INVITATION_SENT.value: "Отправка приглашения",
    PlatformEventCode.LICENSE_CREATED.value: "Создание лицензии",
    PlatformEventCode.LICENSE_EXTENDED.value: "Продление лицензии",
    PlatformEventCode.LICENSE_EXPIRED.value: "Истечение лицензии",
    PlatformEventCode.LICENSE_REVOKED.value: "Отзыв лицензии",
    PlatformEventCode.PLATFORM_OWNER_CREATED.value: "Создание владельца платформы",
    PlatformEventCode.PLATFORM_OWNER_CHANGED.value: "Смена владельца платформы",
    PlatformEventCode.PLATFORM_OWNER_UPDATED.value: "Изменение владельца платформы",
    PlatformEventCode.PLATFORM_SETTINGS_UPDATED.value: "Изменение настроек платформы",
    PlatformEventCode.PLATFORM_USER_CREATED.value: "Создание пользователя платформы",
    PlatformEventCode.PLATFORM_USER_UPDATED.value: "Изменение пользователя платформы",
    PlatformEventCode.PLATFORM_USER_DELETED.value: "Удаление пользователя платформы",
    PlatformEventCode.PLATFORM_USER_BLOCKED.value: "Блокировка пользователя платформы",
    PlatformEventCode.PLATFORM_USER_UNBLOCKED.value: "Разблокировка пользователя платформы",
    PlatformEventCode.PLATFORM_ROLE_CREATED.value: "Создание роли платформы",
    PlatformEventCode.PLATFORM_ROLE_UPDATED.value: "Изменение роли платформы",
    PlatformEventCode.PLATFORM_ROLE_DELETED.value: "Удаление роли платформы",
    PlatformEventCode.TEMPLATE_VERSION_CREATED.value: "Создание версии шаблона",
    PlatformEventCode.TEMPLATE_PUBLISHED.value: "Публикация шаблона",
    PlatformEventCode.TEMPLATE_UPDATE_SENT.value: "Отправка обновления шаблона",
    PlatformEventCode.RELEASE_REVIEW_STARTED.value: "Проверка релиза начата",
    PlatformEventCode.RELEASE_APPROVED.value: "Релиз принят Platform",
    PlatformEventCode.RELEASE_CHANGES_REQUESTED.value: "Релиз возвращён на доработку",
    PlatformEventCode.BOOTSTRAP_OWNER_CREATED.value: "Создание Bootstrap Owner",
    PlatformEventCode.BOOTSTRAP_OWNER_USED.value: "Вход Bootstrap Owner",
    PlatformEventCode.BOOTSTRAP_OWNER_DISABLED.value: "Отключение Bootstrap Owner",
    PlatformEventCode.BOOTSTRAP_OWNER_REACTIVATED.value: "Восстановление Bootstrap Owner",
    PlatformEventCode.SECURITY_LOGIN_SUCCESS.value: "Успешный вход",
    PlatformEventCode.SECURITY_LOGIN_FAILED.value: "Неуспешный вход",
    PlatformEventCode.LEGACY.value: "legacy",
}

PLATFORM_AUDIT_STATUS_LABELS: dict[str, str] = {
    PlatformAuditStatus.DONE.value: "Готово",
    PlatformAuditStatus.ERROR.value: "Ошибка",
    PlatformAuditStatus.WARNING.value: "Предупреждение",
    PlatformAuditStatus.COMPLETED.value: "Выполнено",
    PlatformAuditStatus.IN_PROGRESS.value: "В работе",
    PlatformAuditStatus.PLANNED.value: "Запланировано",
}

LEGACY_EVENT_TYPE_CATEGORY_MAP: dict[str, str] = {
    "provisioning": PlatformEventCategory.PROVISIONING.value,
    "company_creation": PlatformEventCategory.COMPANY.value,
    "settings_change": PlatformEventCategory.PLATFORM_SETTINGS.value,
    "publish": PlatformEventCategory.PUBLICATION.value,
    "template_transfer": PlatformEventCategory.TEMPLATE.value,
    "audit": PlatformEventCategory.SECURITY.value,
}
