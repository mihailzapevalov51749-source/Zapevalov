"""CLI: resolve architectural file owner (WI-ARCH-FILE-OWNER-001).

Usage (from backend/):
  python scripts/architecture_file_owner.py frontend/src/api/navigationApi.js
  python scripts/architecture_file_owner.py backend/app/modules/platform/runtime/entities/service.py
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.modules.platform.architecture_navigator.architecture_file_owner import resolve_file_owner


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Resolve architectural owner for a platform file")
    parser.add_argument("path", help="File path (backend/app/... or frontend/src/...)")
    parser.add_argument("--json", action="store_true", help="Output JSON instead of human-readable text")
    return parser.parse_args()


def format_human(resolution) -> str:
    related = ", ".join(resolution.related_elements) if resolution.related_elements else "—"
    lines = [
        f"Primary Owner:\n{resolution.primary_owner}",
        f"\nRegistry:\n{resolution.registry}",
        f"\nOwnership Class:\n{resolution.ownership_class}",
        f"\nRelated:\n{related}",
        f"\nReason:\n{resolution.reason}",
        f"\nConfidence:\n{resolution.confidence}",
    ]
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    resolution = resolve_file_owner(args.path)
    if args.json:
        print(json.dumps(resolution.to_dict(), ensure_ascii=False, indent=2))
        return
    print(format_human(resolution))


if __name__ == "__main__":
    main()
