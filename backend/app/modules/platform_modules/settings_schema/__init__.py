"""Platform module settings_schema package."""

from app.modules.platform_modules.settings_schema.registry import (
    get_module_settings_schema,
    is_active_runtime_module,
    list_active_module_settings_schemas,
)
from app.modules.platform_modules.settings_schema.validator import (
    SettingsSchemaValidationError,
    count_schema_fields,
    validate_settings_schema,
)

__all__ = [
    "SettingsSchemaValidationError",
    "count_schema_fields",
    "get_module_settings_schema",
    "is_active_runtime_module",
    "list_active_module_settings_schemas",
    "validate_settings_schema",
]
