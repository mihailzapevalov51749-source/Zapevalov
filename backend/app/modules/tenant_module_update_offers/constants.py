"""Constants for tenant module update offers."""

from __future__ import annotations


class TenantModuleUpdateOfferStatus:
    AVAILABLE = "available"
    APPLIED = "applied"
    SKIPPED = "skipped"
    EXPIRED = "expired"
    WITHDRAWN = "withdrawn"


ACTIVE_OFFER_STATUSES: frozenset[str] = frozenset(
    {
        TenantModuleUpdateOfferStatus.AVAILABLE,
    }
)

GENERATOR_SOURCE = "generator"
