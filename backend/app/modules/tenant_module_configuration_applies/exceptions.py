"""Apply precondition errors."""

from __future__ import annotations


class ApplyPreconditionError(Exception):
    def __init__(self, reason: str, message: str):
        self.reason = reason
        self.message = message
        super().__init__(message)


APPLY_PRECONDITION_MESSAGES: dict[str, str] = {
    "offer_not_found": "Предложение обновления модуля не найдено",
    "offer_not_available": "Предложение обновления недоступно для Apply",
    "preview_missing": "Предпросмотр обновления не найден",
    "diff_missing": "Configuration diff не найден",
    "configuration_missing": "Конфигурация модуля компании не найдена",
    "tenant_module_missing": "Установленный модуль компании не найден",
    "manifest_missing": "Active manifest для модуля не найден",
    "manifest_schema_invalid": "Settings schema модуля недоступна или invalid",
    "snapshot_failed": "Не удалось создать snapshot конфигурации",
}
