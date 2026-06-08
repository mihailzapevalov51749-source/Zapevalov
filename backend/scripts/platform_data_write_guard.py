"""Guard for scripts that mutate ЯсноПро platform runtime data.

Scripts that create or update catalog entities (История, Направления, etc.)
must call require_platform_data_write_approval() at startup.

Set environment variable only after explicit user confirmation:

  YASNOPRO_ALLOW_PLATFORM_DATA_WRITE=1 python scripts/record_....py
"""

from __future__ import annotations

import os
import sys

ENV_KEY = "YASNOPRO_ALLOW_PLATFORM_DATA_WRITE"


def require_platform_data_write_approval(*, script_name: str | None = None) -> None:
    if os.environ.get(ENV_KEY) == "1":
        return

    label = script_name or "this script"
    print(
        "ERROR: Platform data write blocked.\n"
        f"Script {label} mutates runtime object data (История, Направления, etc.).\n"
        "Cursor must not run it without explicit user confirmation.\n"
        f"To run manually after approval: set {ENV_KEY}=1",
        file=sys.stderr,
    )
    raise SystemExit(2)
