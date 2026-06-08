#!/usr/bin/env python3
"""Record Action Engine publish contract milestone in istoriya and napravleniya plan tree."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_ROOT))
sys.path.insert(0, str(SCRIPTS_ROOT))

from platform_data_write_guard import require_platform_data_write_approval

DIRECTION_TITLE = "Action Engine V1"
STEP_TITLE = "Publish Contract для Action Definition и Action Placement"

HISTORY_TITLE = "Publish Contract для Action Definition и Action Placement"
HISTORY_DESCRIPTION = (
    "Action Definition и Action Placement включены в designer publish snapshot "
    "(schema_version=2) как object_types[].actions[].placements[]."
)
HISTORY_RESULT = (
    "Runtime catalog получает опубликованные действия; Runtime Resolver — следующий этап."
)


def main() -> None:
    require_platform_data_write_approval(
        "record Action Engine publish contract milestone in platform dashboard data",
    )
    print(f"TODO: wire istoriya/napravleniya updates for {STEP_TITLE}")


if __name__ == "__main__":
    main()
