#!/usr/bin/env python3
"""Record Action Form MVP milestone in istoriya and napravleniya plan tree."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_ROOT))
sys.path.insert(0, str(SCRIPTS_ROOT))

from platform_data_write_guard import require_platform_data_write_approval

STEP_TITLE = "Action Form MVP"
HISTORY_TITLE = "Action Form MVP для Action Engine"
HISTORY_DESCRIPTION = (
    "DesignerActionForm и поля формы публикуются в snapshot; Runtime открывает "
    "PlatformModal с полями объекта без исполнения действия."
)
HISTORY_RESULT = "Следующий этап: Executor create_record."


def main() -> None:
    require_platform_data_write_approval(
        "record Action Form MVP milestone in platform dashboard data",
    )
    print(f"TODO: wire istoriya/napravleniya updates for {STEP_TITLE}")


if __name__ == "__main__":
    main()
