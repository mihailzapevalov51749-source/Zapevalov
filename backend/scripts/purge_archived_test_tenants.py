"""Hard-purge archived test tenant leaks — delegates to strict demo leak policy.

Usage (from backend/):
  python scripts/purge_archived_test_tenants.py --dry-run
  YASNOPRO_ALLOW_TENANT_HARD_DELETE=1 python scripts/purge_archived_test_tenants.py --execute --confirm
"""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from scripts.purge_demo_environment import main

if __name__ == "__main__":
    raise SystemExit(main())
