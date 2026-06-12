"""Temporary credentials for company provisioning."""

from __future__ import annotations

import secrets
import string

_PROVISIONING_PASSWORD_ALPHABET = string.ascii_uppercase + string.digits


def generate_provisioning_password(*, groups: int = 3, group_length: int = 4) -> str:
    """Generate password like A7K9-P2MX-Q8RT."""
    chunks = [
        "".join(secrets.choice(_PROVISIONING_PASSWORD_ALPHABET) for _ in range(group_length))
        for _ in range(groups)
    ]
    return "-".join(chunks)
