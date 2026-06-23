"""CATALOG_LINKS integrity helpers (WI-ARCH-LINKS-001)."""

from __future__ import annotations

from app.modules.platform.architecture_navigator.registry_constants import REGISTRY_ARCHIVED

LinkRow = dict[str, str]


def merged_catalog_keys(all_seed_rows, merged_seed_row) -> frozenset[str]:
    return frozenset(merged_seed_row(row)["component_key"] for row in all_seed_rows())


def active_catalog_keys(all_seed_rows, merged_seed_row) -> frozenset[str]:
    return frozenset(
        merged_seed_row(row)["component_key"]
        for row in all_seed_rows()
        if merged_seed_row(row).get("registry_key") != REGISTRY_ARCHIVED
    )


def archived_catalog_keys(all_seed_rows, merged_seed_row) -> frozenset[str]:
    return frozenset(
        merged_seed_row(row)["component_key"]
        for row in all_seed_rows()
        if merged_seed_row(row).get("registry_key") == REGISTRY_ARCHIVED
    )


def classify_catalog_link(
    link: LinkRow,
    *,
    all_keys: frozenset[str],
    active_keys: frozenset[str],
    archived_keys: frozenset[str],
) -> tuple[str, str, str, str, str]:
    """Return (source, target, link_type, bad_endpoint, status)."""
    source = link["from"]
    target = link["to"]
    link_type = link["type"]
    for endpoint in (source, target):
        if endpoint not in all_keys:
            return source, target, link_type, endpoint, "MISSING"
        if endpoint in archived_keys:
            return source, target, link_type, endpoint, "ARCHIVED"
        if endpoint not in active_keys:
            return source, target, link_type, endpoint, "ORPHAN"
    return source, target, link_type, "", "VALID"


def find_invalid_catalog_links(
    links: list[LinkRow],
    *,
    all_seed_rows,
    merged_seed_row,
) -> list[tuple[str, str, str, str, str]]:
    all_keys = merged_catalog_keys(all_seed_rows, merged_seed_row)
    active_keys = active_catalog_keys(all_seed_rows, merged_seed_row)
    archived_keys = archived_catalog_keys(all_seed_rows, merged_seed_row)
    invalid: list[tuple[str, str, str, str, str]] = []
    for link in links:
        classified = classify_catalog_link(
            link,
            all_keys=all_keys,
            active_keys=active_keys,
            archived_keys=archived_keys,
        )
        if classified[4] != "VALID":
            invalid.append(classified)
    return invalid


def count_links_by_registry(
    links: list[LinkRow],
    *,
    all_seed_rows,
    merged_seed_row,
) -> dict[str, int]:
    registry_by_key = {
        merged_seed_row(row)["component_key"]: merged_seed_row(row).get("registry_key", "")
        for row in all_seed_rows()
    }
    counts: dict[str, int] = {}
    for link in links:
        for endpoint in (link["from"], link["to"]):
            registry_key = registry_by_key.get(endpoint)
            if registry_key and registry_key != REGISTRY_ARCHIVED:
                counts[registry_key] = counts.get(registry_key, 0) + 1
    return counts
