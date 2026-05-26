from logging.config import fileConfig
from pathlib import Path
import os
import sys

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool

ALEMBIC_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ALEMBIC_DIR.parent
PROJECT_ROOT_DIR = ALEMBIC_DIR.parents[1]

sys.path.insert(0, str(BACKEND_DIR))

ENV_CANDIDATES = (
    PROJECT_ROOT_DIR / ".env",
    BACKEND_DIR / ".env",
)

for env_path in ENV_CANDIDATES:
    if env_path.is_file():
        load_dotenv(env_path)

from app.db.base import Base  # noqa: E402

# Platform designer tables: schema source of truth is Alembic (migrations 0001–0005+).
# app/init_db.create_all() intentionally skips these tables — see PLATFORM_ALEMBIC_TABLE_NAMES.
from app.modules.platform.designer.object_types.models import (  # noqa: E402, F401
    DesignerObjectType,
)
from app.modules.platform.designer.field_definitions.models import (  # noqa: E402, F401
    DesignerFieldDefinition,
)
from app.modules.platform.designer.relation_definitions.models import (  # noqa: E402, F401
    DesignerRelationDefinition,
)
from app.modules.platform.designer.view_definitions.models import (  # noqa: E402, F401
    DesignerViewDefinition,
)
from app.modules.platform.designer.publish.models import (  # noqa: E402, F401
    DesignerMetadataSnapshot,
    DesignerPublishRecord,
)
from app.modules.platform.runtime.entities.models import (  # noqa: E402, F401
    RuntimeEntity,
    RuntimeEntityValue,
)
from app.modules.platform.runtime.relation_instances.models import (  # noqa: E402, F401
    RuntimeRelationInstance,
)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

database_url = os.getenv("DATABASE_URL")
if not database_url:
    checked_paths = "\n".join(f"  - {path}" for path in ENV_CANDIDATES)
    raise RuntimeError(
        "DATABASE_URL не задан для Alembic.\n"
        "Проверены следующие пути .env:\n"
        f"{checked_paths}\n"
        "Убедитесь, что DATABASE_URL задан в одном из этих файлов "
        "или в переменных окружения."
    )

config.set_main_option("sqlalchemy.url", database_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
