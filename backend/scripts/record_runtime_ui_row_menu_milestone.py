#!/usr/bin/env python3
"""Record Runtime UI row_menu milestone in istoriya and napravleniya plan tree."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_ROOT))
sys.path.insert(0, str(SCRIPTS_ROOT))

from platform_data_write_guard import require_platform_data_write_approval

STEP_TITLE = "Runtime UI (row_menu)"
HISTORY_TITLE = "Runtime UI для placement row_menu"
HISTORY_DESCRIPTION = (
    "В меню строки таблицы Runtime отображаются опубликованные действия "
    "через usePlacedActions (один запрос на таблицу) и RuntimeRowActions."
)
HISTORY_RESULT = "Следующий этап: record_card или Action Form."


def main() -> None:
    require_platform_data_write_approval(
        "record Runtime UI row_menu milestone in platform dashboard data",
    )
    print(f"TODO: wire istoriya/napravleniya updates for {STEP_TITLE}")


if __name__ == "__main__":
    main()
