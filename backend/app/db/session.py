import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.runtime_paths import resolve_dotenv_path


def _load_process_env() -> None:
    dotenv_path = resolve_dotenv_path()
    if dotenv_path is not None and dotenv_path.is_file():
        load_dotenv(dotenv_path, override=False)


_load_process_env()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL не найден. Задайте переменную окружения процесса "
        "или DOTENV_PATH для явного файла конфигурации. "
        "Для DEV/TEMPLATE/CLIENT используйте dev-stack (manifest.yaml)."
    )


def _reject_legacy_database_for_isolated_env() -> None:
    """Fail fast when process env pairs APP_ENV with legacy portal_constructor_v2."""
    from app.core.environment_guard import (
        EnvironmentGuardError,
        extract_database_name,
        normalize_app_env,
        resolve_raw_app_env,
        validate_legacy_database_blocked,
    )

    raw_app_env = resolve_raw_app_env()
    if not raw_app_env:
        return
    try:
        app_env = normalize_app_env(raw_app_env)
    except EnvironmentGuardError:
        return
    database_name = extract_database_name(DATABASE_URL)
    validate_legacy_database_blocked(app_env=app_env, database_name=database_name)


_reject_legacy_database_for_isolated_env()

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


from app.db.runtime_session import open_runtime_db_session


def get_db():
    db = open_runtime_db_session()
    try:
        yield db
    finally:
        db.close()
