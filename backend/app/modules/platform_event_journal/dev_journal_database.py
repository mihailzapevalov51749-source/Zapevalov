"""Resolve DEV database from dev-stack manifest for DEV Journal writers."""

from __future__ import annotations

import os
import sys
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator
from urllib.parse import urlparse

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.runtime_paths import (
    get_backend_root,
    resolve_dotenv_path,
    try_dev_monorepo_root,
)

MANIFEST_RELATIVE_PATH = Path("scripts") / "dev-stack" / "manifest.yaml"
DEV_ENVIRONMENT_KEY = "DEV"
LEGACY_CURSOR_DATABASE_NAME = "portal_constructor_v2"
"""Legacy monolithic DB name — used only for guard/backfill scripts, never for journal writes."""


def resolve_dev_workspace_root() -> Path:
    mono = try_dev_monorepo_root()
    if mono is not None:
        return mono
    return get_backend_root().parent


class DevJournalDatabaseMismatchError(RuntimeError):
    """Raised when journal writer targets a database other than DEV manifest database."""

    def __init__(self, expected_database: str, actual_database: str) -> None:
        self.expected_database = expected_database
        self.actual_database = actual_database
        super().__init__(
            f"DEV journal database mismatch: expected={expected_database}, actual={actual_database}"
        )

    def format_blocked_message(self) -> str:
        return (
            "Expected database:\n"
            f"{self.expected_database}\n\n"
            "Actual database:\n"
            f"{self.actual_database}\n\n"
            "Status:\n"
            "BLOCKED"
        )


def resolve_repo_root() -> Path:
    return resolve_dev_workspace_root()


_dotenv_loaded = False


def _ensure_dotenv_loaded() -> None:
    global _dotenv_loaded
    if _dotenv_loaded:
        return
    from dotenv import load_dotenv

    explicit = resolve_dotenv_path()
    if explicit is not None and explicit.is_file():
        load_dotenv(explicit, override=False)
        _dotenv_loaded = True
        return

    mono = try_dev_monorepo_root()
    if mono is not None:
        legacy = mono / ".env"
        if legacy.is_file():
            load_dotenv(legacy, override=False)
    _dotenv_loaded = True


def read_dotenv_database_url(repo_root: Path | None = None) -> str | None:
    _ = repo_root
    explicit = resolve_dotenv_path()
    candidates: list[Path] = []
    if explicit is not None:
        candidates.append(explicit)
    mono = try_dev_monorepo_root()
    if mono is not None:
        candidates.append(mono / ".env")
    for env_path in candidates:
        if not env_path.is_file():
            continue
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            if key.strip() != "DATABASE_URL":
                continue
            token = value.strip().strip('"').strip("'")
            return token or None
    return None


def resolve_guard_database_url() -> str | None:
    """Return process or repo ``DATABASE_URL`` for optional explicit-target checks.

    DEV Journal writers connect via ``resolve_dev_journal_database_url()`` (manifest SoT).
    This helper is used by ``assert_dev_journal_database_target()`` when a caller passes
    or implies a concrete URL to validate — not by ``open_dev_journal_db_session()``.
    """
    process_url = os.getenv("DATABASE_URL")
    if process_url:
        return process_url
    dotenv_url = read_dotenv_database_url()
    if dotenv_url:
        return dotenv_url
    _ensure_dotenv_loaded()
    return os.getenv("DATABASE_URL")


def resolve_dev_stack_manifest_path(repo_root: Path | None = None) -> Path:
    root = repo_root or resolve_dev_workspace_root()
    return root / MANIFEST_RELATIVE_PATH


def load_dev_stack_manifest(repo_root: Path | None = None) -> dict[str, Any]:
    """Load dev-stack manifest YAML without external dependencies."""
    path = resolve_dev_stack_manifest_path(repo_root)
    if not path.is_file():
        raise FileNotFoundError(f"Dev stack manifest not found: {path}")

    root: dict[str, Any] = {}
    stack: list[tuple[int, dict[str, Any]]] = [(0, root)]

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.split("#", 1)[0].rstrip()
        if not line.strip():
            continue

        indent = len(line) - len(line.lstrip(" "))
        level = indent // 2
        content = line.strip()
        if ":" not in content:
            raise ValueError(f"Invalid manifest line: {raw_line!r}")

        while len(stack) > level + 1:
            stack.pop()

        key, value = content.split(":", 1)
        key = key.strip()
        value = value.strip()
        parent = stack[-1][1]

        if not value:
            child: dict[str, Any] = {}
            parent[key] = child
            stack.append((level, child))
            continue

        if value.startswith("[") and value.endswith("]"):
            inner = value[1:-1].strip()
            if not inner:
                parent[key] = []
                continue
            items: list[Any] = []
            for item in inner.split(","):
                token = item.strip()
                if not token:
                    continue
                if (token.startswith('"') and token.endswith('"')) or (
                    token.startswith("'") and token.endswith("'")
                ):
                    items.append(token[1:-1])
                elif token.isdigit():
                    items.append(int(token))
                else:
                    items.append(token)
            parent[key] = items
            continue

        if (value.startswith('"') and value.endswith('"')) or (
            value.startswith("'") and value.endswith("'")
        ):
            parent[key] = value[1:-1]
            continue

        if value.isdigit():
            parent[key] = int(value)
            continue

        parent[key] = value

    return root


def resolve_dev_database_name(manifest: dict[str, Any] | None = None) -> str:
    manifest_data = manifest or load_dev_stack_manifest()
    database_name = (
        manifest_data.get("environments", {})
        .get(DEV_ENVIRONMENT_KEY, {})
        .get("backend", {})
        .get("database")
    )
    if not database_name:
        raise ValueError("DEV database name is missing in dev-stack manifest")
    return str(database_name)


def build_database_url(database_name: str, manifest: dict[str, Any] | None = None) -> str:
    manifest_data = manifest or load_dev_stack_manifest()
    postgres = manifest_data["postgres"]
    user = postgres["user"]
    password = postgres["password"]
    host = postgres["host"]
    port = postgres["port"]
    return f"postgresql://{user}:{password}@{host}:{port}/{database_name}"


def resolve_dev_journal_database_url(manifest: dict[str, Any] | None = None) -> str:
    return build_database_url(resolve_dev_database_name(manifest), manifest)


def extract_database_name(database_url: str | None) -> str:
    if not database_url:
        return ""
    parsed = urlparse(database_url)
    return parsed.path.lstrip("/")


def resolve_configured_database_url() -> str | None:
    return resolve_guard_database_url()


def assert_dev_journal_database_target(
    actual_database_url: str | None = None,
    *,
    manifest: dict[str, Any] | None = None,
) -> str:
    """Return expected DEV database name or raise when *actual_database_url* is not DEV manifest DB.

    Used when a script explicitly targets a database URL (e.g. backfill source validation).
    ``open_dev_journal_db_session()`` does not call this — it always uses manifest URL.
    """
    expected_database = resolve_dev_database_name(manifest)
    actual_url = actual_database_url if actual_database_url is not None else resolve_configured_database_url()
    if actual_url:
        actual_database = extract_database_name(actual_url)
        if actual_database and actual_database != expected_database:
            raise DevJournalDatabaseMismatchError(expected_database, actual_database)
    return expected_database


def guard_dev_journal_database_or_exit(
  actual_database_url: str | None = None,
) -> str:
    try:
        return assert_dev_journal_database_target(actual_database_url)
    except DevJournalDatabaseMismatchError as exc:
        print(exc.format_blocked_message(), file=sys.stderr)
        raise SystemExit(2) from exc


def create_dev_journal_session_factory(
    manifest: dict[str, Any] | None = None,
) -> sessionmaker[Session]:
    database_url = resolve_dev_journal_database_url(manifest)
    engine = create_engine(database_url)
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)


@contextmanager
def open_dev_journal_db_session(
    manifest: dict[str, Any] | None = None,
) -> Iterator[Session]:
    """Open a SQLAlchemy session bound to DEV manifest database (``yasnopro_dev``).

    Source of truth: ``scripts/dev-stack/manifest.yaml`` → ``environments.DEV.backend.database``.
    Process ``DATABASE_URL`` / repo ``.env`` are **not** used for the connection.
    """
    manifest_data = manifest or load_dev_stack_manifest()
    session_factory = create_dev_journal_session_factory(manifest_data)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
