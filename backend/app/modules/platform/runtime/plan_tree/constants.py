"""Plan tree root ordering — technical anchor marker (not shown in Office UI)."""

PLAN_TREE_ROOT_ANCHOR_MARKER = "__plan_tree_root__"
PLAN_TREE_ROOT_ANCHOR_SEPARATOR = "#"


def plan_tree_root_anchor_title(relation_key: str) -> str:
    """Unique anchor title per hierarchy relation (tenant + object type + relation)."""
    normalized_key = str(relation_key or "").strip()

    if not normalized_key:
        return PLAN_TREE_ROOT_ANCHOR_MARKER

    return f"{PLAN_TREE_ROOT_ANCHOR_MARKER}{PLAN_TREE_ROOT_ANCHOR_SEPARATOR}{normalized_key}"


def plan_tree_root_anchor_title_variants(relation_key: str) -> list[str]:
    """All marker titles that may exist in DB (current + legacy formats)."""
    normalized_key = str(relation_key or "").strip()
    variants = [plan_tree_root_anchor_title(normalized_key)]

    if normalized_key:
        legacy = f"{PLAN_TREE_ROOT_ANCHOR_MARKER}::{normalized_key}"
        if legacy not in variants:
            variants.append(legacy)

    if PLAN_TREE_ROOT_ANCHOR_MARKER not in variants:
        variants.append(PLAN_TREE_ROOT_ANCHOR_MARKER)

    return variants
