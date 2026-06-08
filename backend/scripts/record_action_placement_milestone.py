#!/usr/bin/env python3
"""Record Action Placement entity milestone in istoriya and napravleniya plan tree."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_ROOT))
sys.path.insert(0, str(SCRIPTS_ROOT))

from platform_data_write_guard import require_platform_data_write_approval

ROOT_TITLE = "Action Engine V1"
DIRECTION_TITLE = "Размещение действий"
STEP_TITLE = "Реализован Action Placement как отдельная сущность"
STATUS_DONE_LABEL = "Готово"

HISTORY_TITLE = "Реализован Action Placement как отдельная сущность"
HISTORY_DESCRIPTION = (
    "Добавлена сущность designer_action_placements, API каталога и CRUD размещений "
    "для Action Definition. В Studio → Объект → Действия → Свойства действия "
    "доступен блок «Размещение действия»."
)
HISTORY_RESULT = (
    "Designer-конфигурация размещений готова; Runtime Resolver и publish contract — следующий этап."
)


def main() -> None:
    require_platform_data_write_approval(
        "record Action Placement milestone in platform dashboard data",
    )
    print(
        "TODO: wire istoriya/napravleniya updates for "
        f"{DIRECTION_TITLE} / {STEP_TITLE}",
    )


if __name__ == "__main__":
    main()
