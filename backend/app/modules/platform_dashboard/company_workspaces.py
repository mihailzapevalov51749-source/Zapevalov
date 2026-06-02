"""Company Workspaces — read-model slice for Dashboard governance (not a business layer).

Tenant is infrastructure boundary, not business model.
Company workspace is configured through Object Model.
"""

from __future__ import annotations

COMPANY_WORKSPACES_ARCHITECTURE_RULE = (
    "Tenant is infrastructure boundary, not business model. "
    "Company workspace is configured through Object Model."
)

COMPANY_WORKSPACES_SUMMARY = (
    "Компании используют одну платформу и настраивают свои цифровые модели через объектную модель."
)

OBJECT_MODEL_COMPANY_FACETS: tuple[str, ...] = (
    "Компания",
    "Лицензия",
    "Проект",
    "Договор",
    "Сотрудник",
    "Задача",
    "Процесс",
    "Документ",
)

COMPANY_WORKSPACES_IMPLEMENTATION_STATUS = (
    "MVP workspace lifecycle in Studio enabled: create draft workspace, "
    "publish explicitly, then add to navigation_items."
)
