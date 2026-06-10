"""CLI: centralized audit of all ADR-007 System Entities."""

from __future__ import annotations

import sys

from app.db.session import SessionLocal
from app.modules.platform.system_entity_registry import (
    audit_all_system_entities,
    generate_system_entity_compliance_report,
)
from app.modules.portals.models import Portal  # noqa: F401
from app.modules.users.models import User  # noqa: F401


def main() -> int:
    db = SessionLocal()
    try:
        audit_all_system_entities(db)
        report = generate_system_entity_compliance_report(db)
        print("System Entity Audit")
        print()
        for row in report.rows:
            if row.adr_compliance == "FAIL":
                print("FAIL")
            else:
                print("PASS")
        print()
        print("Total:")
        print(f"{report.compliant_count + report.partial_count} / {report.total_count} compliant")
        if report.partial_count:
            print(f"({report.partial_count} partial per ADR-007 known gaps)")
        return 0 if report.failed_count == 0 else 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
