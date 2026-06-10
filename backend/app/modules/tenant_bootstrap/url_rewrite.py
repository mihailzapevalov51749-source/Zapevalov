from __future__ import annotations

import re

PORTAL_PATH_RE = re.compile(r"(/portal/)(\d+)(/|$|\?|#)")
DESIGNER_TENANT_PATH_RE = re.compile(r"(/designer/tenant/)(\d+)(/|$|\?|#)")


def rewrite_tenant_urls(
    value: str | None,
    *,
    source_tenant_id: int,
    target_tenant_id: int,
) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        return value
    if source_tenant_id == target_tenant_id:
        return value

    text = value

    def replace_portal(match: re.Match[str]) -> str:
        old_id = int(match.group(2))
        if old_id != source_tenant_id:
            return match.group(0)
        return f"{match.group(1)}{target_tenant_id}{match.group(3)}"

    def replace_designer(match: re.Match[str]) -> str:
        old_id = int(match.group(2))
        if old_id != source_tenant_id:
            return match.group(0)
        return f"{match.group(1)}{target_tenant_id}{match.group(3)}"

    text = PORTAL_PATH_RE.sub(replace_portal, text)
    text = DESIGNER_TENANT_PATH_RE.sub(replace_designer, text)
    return text
