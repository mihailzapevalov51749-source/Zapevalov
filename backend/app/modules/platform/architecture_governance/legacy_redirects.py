"""Legacy Architecture Platform registry tab → Governance section redirects."""

from __future__ import annotations

LEGACY_REGISTRY_GOVERNANCE_REDIRECTS: dict[str, dict[str, str]] = {
    "publication": {
        "section": "architecture-governance",
        "tab": "delivery",
    },
    "rules": {
        "section": "architecture-governance",
        "tab": "constitution",
    },
}


def resolve_legacy_governance_redirect(registry_key: str) -> dict[str, str] | None:
    normalized = str(registry_key or "").strip().lower()
    target = LEGACY_REGISTRY_GOVERNANCE_REDIRECTS.get(normalized)
    if not target:
        return None
    return dict(target)
