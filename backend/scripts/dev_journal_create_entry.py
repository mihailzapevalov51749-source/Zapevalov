"""Create a structured DEV tenant journal entry for a completed work item.

Usage (from backend/):
  python scripts/dev_journal_create_entry.py \\
    --slug disable-user-personal-left-menu-editing \\
    --title "Отключено пользовательское редактирование левого меню" \\
    --summary "User больше не редактирует левое меню; только tenant-level settings." \\
    --root-cause "User personalization layer давала регрессии DnD и reset." \\
    --changed-file frontend/src/layouts/PortalLayout.jsx \\
    --tests "menuSettingsPermissions.test.js pass" \\
    --manual-smoke "NOT PERFORMED — dev server unavailable in agent session"
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.modules.platform_event_journal.constants import PlatformEventJournalType
from app.modules.platform_event_journal.dev_journal_database import (
    DevJournalDatabaseMismatchError,
    open_dev_journal_db_session,
    resolve_dev_database_name,
)
from app.modules.platform_event_journal.work_item_journal import (
    WorkItemJournalPayload,
    create_work_item_journal_entry,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create DEV tenant work item journal entry")
    parser.add_argument("--slug", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--summary", required=True)
    parser.add_argument("--work-item-type", default="development")
    parser.add_argument("--root-cause", default="")
    parser.add_argument("--changed-file", action="append", default=[])
    parser.add_argument("--tests", required=True)
    parser.add_argument("--manual-smoke", required=True)
    parser.add_argument("--cleanup", default="NOT REQUIRED")
    parser.add_argument("--environment-integrity", default="NOT CHECKED")
    parser.add_argument(
        "--event-type",
        default=PlatformEventJournalType.DEVELOPMENT.value,
        choices=[item.value for item in PlatformEventJournalType],
    )
    parser.add_argument("--author", default="Cursor")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    payload = WorkItemJournalPayload(
        slug=args.slug.strip(),
        title=args.title.strip(),
        summary=args.summary.strip(),
        work_item_type=args.work_item_type.strip(),
        root_cause=args.root_cause.strip() or None,
        changed_files=[item.strip() for item in args.changed_file if str(item).strip()],
        tests=args.tests.strip(),
        manual_smoke=args.manual_smoke.strip(),
        cleanup=args.cleanup.strip(),
        environment_integrity=args.environment_integrity.strip(),
        event_type=args.event_type.strip(),
        author=args.author.strip() or "Cursor",
    )

    if args.dry_run:
        from app.modules.platform_event_journal.work_item_journal import build_work_item_description

        print(build_work_item_description(payload))
        return

    try:
        with open_dev_journal_db_session() as db:
            created = create_work_item_journal_entry(db, payload, commit=True)
    except DevJournalDatabaseMismatchError as exc:
        print(exc.format_blocked_message(), file=sys.stderr)
        raise SystemExit(2) from exc

    database_name = resolve_dev_database_name()
    print(f"Database:\n{database_name}\n")

    if created is None:
        print(f"Skipped: slug already exists ({payload.slug})")
        return

    print(f"Journal ID:\n{created.id}\n")
    print(f"Slug:\n{created.slug}")


if __name__ == "__main__":
    main()
