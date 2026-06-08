#!/usr/bin/env python3
"""Record Target Object milestone for Action Engine in istoriya and napravleniya plan tree."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_ROOT))
sys.path.insert(0, str(SCRIPTS_ROOT))

from platform_data_write_guard import require_platform_data_write_approval

STEP_TITLE = "Target Object"
HISTORY_TITLE = "Target Object для create_record в Action Engine"
HISTORY_DESCRIPTION = (
    "Action Definition получил target_object_type_id: форма действия и executor "
    "create_record работают с целевым объектом, а не только с объектом-владельцем."
)
HISTORY_RESULT = (
    "Следующий этап: автоматическое создание связи Source Record ↔ Target Record "
    "после create_record."
)


def main() -> None:
    require_platform_data_write_approval(
        "record Target Object Action Engine milestone in platform dashboard data",
    )
    print(f"TODO: wire istoriya/napravleniya updates for {STEP_TITLE}")


if __name__ == "__main__":
    main()
