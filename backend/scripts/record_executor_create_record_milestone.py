#!/usr/bin/env python3
"""Record Executor create_record MVP milestone in istoriya and napravleniya plan tree."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_ROOT))
sys.path.insert(0, str(SCRIPTS_ROOT))

from platform_data_write_guard import require_platform_data_write_approval

STEP_TITLE = "Executor create_record"
HISTORY_TITLE = "Executor create_record для Action Engine"
HISTORY_DESCRIPTION = (
    "Runtime Action Form вызывает executeCreateRecordAction через существующий "
    "runtimeWriteGateway.createEntity и submitPendingRelationLinks; таблица "
    "обновляется через runtimeEntityDataReloadBridge."
)
HISTORY_RESULT = "Следующий этап: Executor update_record или placement record_card."


def main() -> None:
    require_platform_data_write_approval(
        "record Executor create_record milestone in platform dashboard data",
    )
    print(f"TODO: wire istoriya/napravleniya updates for {STEP_TITLE}")


if __name__ == "__main__":
    main()
