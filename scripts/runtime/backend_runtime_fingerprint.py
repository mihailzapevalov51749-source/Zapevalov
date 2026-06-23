"""Backend runtime artifact fingerprint (WI-RT-014C)."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

FINGERPRINT_VERSION = "1"


def iter_production_python_files(app_root: Path) -> list[Path]:
    files: list[Path] = []
    for path in sorted(app_root.rglob("*.py")):
        if path.name.startswith("test_"):
            continue
        if "__pycache__" in path.parts:
            continue
        files.append(path)
    return files


def compute_backend_fingerprint(backend_root: Path) -> dict[str, object]:
    """SHA256 over requirements.txt + sorted production app/**/*.py files."""
    backend_root = backend_root.resolve()
    requirements = backend_root / "requirements.txt"
    app_root = backend_root / "app"
    if not requirements.is_file():
        raise FileNotFoundError(f"requirements.txt not found: {requirements}")
    if not app_root.is_dir():
        raise FileNotFoundError(f"app/ not found: {app_root}")

    digest = hashlib.sha256()
    req_text = requirements.read_text(encoding="utf-8", errors="ignore")
    digest.update(b"requirements.txt\0")
    digest.update(req_text.encode("utf-8"))
    digest.update(b"\0")

    production_files = iter_production_python_files(app_root)
    for path in production_files:
        rel = path.relative_to(backend_root).as_posix()
        digest.update(rel.encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")

    return {
        "version": FINGERPRINT_VERSION,
        "hash": digest.hexdigest(),
        "production_file_count": len(production_files),
    }


def find_leaked_test_files(backend_root: Path) -> list[str]:
    app_root = backend_root / "app"
    if not app_root.is_dir():
        return []
    leaked: list[str] = []
    for path in sorted(app_root.rglob("test_*.py")):
        leaked.append(path.relative_to(backend_root).as_posix())
    return leaked


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Backend runtime fingerprint utility")
    parser.add_argument(
        "backend_root",
        nargs="?",
        help="Path to runtime backend root (contains app/ and requirements.txt)",
    )
    parser.add_argument("--json", action="store_true", help="Print fingerprint JSON")
    parser.add_argument(
        "--verify-manifest",
        metavar="MANIFEST",
        help="Verify backend_fingerprint in manifest.json matches backend_root",
    )
    args = parser.parse_args(argv)

    if args.verify_manifest:
        manifest_path = Path(args.verify_manifest).resolve()
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        backend_slot = manifest_path.parent / "backend"
        expected = manifest.get("backend_fingerprint")
        if not isinstance(expected, dict) or not expected.get("hash"):
            print("backend_fingerprint missing in manifest", file=sys.stderr)
            return 1
        actual = compute_backend_fingerprint(backend_slot)
        if actual["hash"] != expected["hash"]:
            print("fingerprint mismatch", file=sys.stderr)
            print(f"expected={expected['hash']}", file=sys.stderr)
            print(f"actual={actual['hash']}", file=sys.stderr)
            return 1
        leaked = find_leaked_test_files(backend_slot)
        if leaked:
            print("test files leaked:", ", ".join(leaked), file=sys.stderr)
            return 1
        print("fingerprint ok")
        return 0

    if not args.backend_root:
        parser.error("backend_root is required unless --verify-manifest is used")

    fingerprint = compute_backend_fingerprint(Path(args.backend_root))
    if args.json:
        print(json.dumps(fingerprint, indent=2))
    else:
        print(fingerprint["hash"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
