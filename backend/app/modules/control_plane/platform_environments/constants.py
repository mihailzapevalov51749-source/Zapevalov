"""Static launch metadata for isolated platform environments."""

from __future__ import annotations

from app.core.environment_guard import ENVIRONMENT_MATRIX

PLATFORM_ENVIRONMENT_DISPLAY_NAMES: dict[str, str] = {
    "DEV": "Разработка",
    "TEMPLATE": "Platform Template",
    "CLIENT": "Клиентская среда",
}

PLATFORM_ENVIRONMENT_LAUNCH_PORTS: dict[str, dict[str, int]] = {
    "DEV": {"backend_port": 8010, "frontend_port": 5173},
    "TEMPLATE": {"backend_port": 8011, "frontend_port": 5174},
    "CLIENT": {"backend_port": 8012, "frontend_port": 5175},
}

PLATFORM_ENVIRONMENT_ORDER: tuple[str, ...] = tuple(ENVIRONMENT_MATRIX.keys())
