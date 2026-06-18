"""In-memory cache for runtime module configurations."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from threading import Lock
from typing import Any

from app.modules.tenant_module_configurations.constants import ACTIVE_CONFIGURATION_MODULE_KEYS

_lock = Lock()
_cache: dict[tuple[int, str], dict[str, Any]] = {}


def _cache_key(tenant_id: int, module_key: str) -> tuple[int, str]:
    return int(tenant_id), str(module_key or "").strip()


@dataclass(frozen=True)
class RuntimeConfigurationCacheEntry:
    tenant_id: int
    module_key: str
    payload: dict[str, Any]
    cached_at: datetime


def get_cached_runtime_configuration(
    tenant_id: int,
    module_key: str,
) -> RuntimeConfigurationCacheEntry | None:
    key = _cache_key(tenant_id, module_key)
    with _lock:
        payload = _cache.get(key)
    if not payload:
        return None
    cached_at = payload.get("_cached_at")
    if not isinstance(cached_at, datetime):
        return None
    return RuntimeConfigurationCacheEntry(
        tenant_id=key[0],
        module_key=key[1],
        payload=dict(payload),
        cached_at=cached_at,
    )


def set_cached_runtime_configuration(
    tenant_id: int,
    module_key: str,
    payload: dict[str, Any],
) -> None:
    key = _cache_key(tenant_id, module_key)
    stored = dict(payload)
    stored["_cached_at"] = datetime.utcnow()
    with _lock:
        _cache[key] = stored


def invalidate_runtime_module_configuration_cache(
    tenant_id: int,
    module_key: str | None = None,
) -> None:
    normalized_tenant_id = int(tenant_id)
    normalized_module_key = str(module_key or "").strip() if module_key else None

    with _lock:
        if normalized_module_key:
            _cache.pop(_cache_key(normalized_tenant_id, normalized_module_key), None)
            return

        keys_to_remove = [
            key
            for key in _cache
            if key[0] == normalized_tenant_id
        ]
        for key in keys_to_remove:
            _cache.pop(key, None)


def clear_runtime_module_configuration_cache() -> None:
    with _lock:
        _cache.clear()


def list_runtime_configuration_cache_diagnostics() -> list[dict[str, Any]]:
    with _lock:
        entries = [
            (key, dict(payload))
            for key, payload in _cache.items()
        ]

    diagnostics: list[dict[str, Any]] = []
    for (tenant_id, module_key), payload in entries:
        cached_at = payload.get("_cached_at")
        diagnostics.append(
            {
                "tenant_id": tenant_id,
                "module_key": module_key,
                "cache_status": "hit",
                "last_refresh": cached_at.isoformat() if isinstance(cached_at, datetime) else None,
                "source_version": payload.get("source_version"),
                "configuration_version": payload.get("configuration_version"),
                "current_runtime_configuration": payload.get("settings") or {},
            }
        )

    existing_keys = {(item["tenant_id"], item["module_key"]) for item in diagnostics}
    for module_key in sorted(ACTIVE_CONFIGURATION_MODULE_KEYS):
        if not any(item["module_key"] == module_key for item in diagnostics):
            diagnostics.append(
                {
                    "tenant_id": None,
                    "module_key": module_key,
                    "cache_status": "miss",
                    "last_refresh": None,
                    "source_version": None,
                    "configuration_version": None,
                    "current_runtime_configuration": {},
                }
            )

    diagnostics.sort(key=lambda item: (item["module_key"] or "", item["tenant_id"] or 0))
    return diagnostics
