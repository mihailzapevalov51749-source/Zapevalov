"""Unified Principal contract (ADR-009 Phase 3)."""

from __future__ import annotations

import uuid
from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class PrincipalContract(Protocol):
    """Stable cross-type principal interface for auth migration and audit."""

    @property
    def principal_type(self) -> str: ...

    @property
    def platform_identity_id(self) -> uuid.UUID | None: ...

    @property
    def tenant_id(self) -> int | None: ...

    @property
    def role_key(self) -> str | None: ...

    @property
    def platform_role(self) -> str | None: ...

    def to_contract_dict(self) -> dict[str, Any]: ...


def contract_dict(
    *,
    principal_type: str,
    platform_identity_id: uuid.UUID | None = None,
    tenant_id: int | None = None,
    role_key: str | None = None,
    platform_role: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "principal_type": principal_type,
        "platform_identity_id": (
            str(platform_identity_id) if platform_identity_id is not None else None
        ),
        "tenant_id": tenant_id,
        "role_key": role_key,
        "platform_role": platform_role,
    }
    if extra:
        payload.update(extra)
    return payload
