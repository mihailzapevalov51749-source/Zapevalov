from app.db.base import Base
from app.db.session import engine
from sqlalchemy import inspect, text
from app.modules.platform.shared.constants import PLATFORM_ALEMBIC_TABLE_NAMES

# IMPORT EXISTING MODELS
from app.modules.comments import models as comments_models  # noqa: F401

# IMPORT NOTIFICATIONS MODELS
from app.modules.notifications.models import (  # noqa: F401
    Notification,
    NotificationRecipient,
)

# IMPORT CHECKLISTS MODELS
from app.modules.checklists.models import (  # noqa: F401
    ChecklistItem,
)

# IMPORT NOTES MODELS
from app.modules.notes.models import (  # noqa: F401
    Note,
)

# IMPORT CHATS MODELS
from app.modules.chats import models as chats_models  # noqa: F401

# Platform designer models are registered via app imports (routers / Alembic env).
# They must NOT be created by create_all — use Alembic migrations instead.
from app.modules.platform.designer.object_types.models import (  # noqa: F401
    DesignerObjectType,
)
from app.modules.platform.designer.field_definitions.models import (  # noqa: F401
    DesignerFieldDefinition,
)
from app.modules.platform.designer.relation_definitions.models import (  # noqa: F401
    DesignerRelationDefinition,
)
from app.modules.platform.designer.view_definitions.models import (  # noqa: F401
    DesignerViewDefinition,
)
from app.modules.platform.designer.publish.models import (  # noqa: F401
    DesignerMetadataSnapshot,
    DesignerPublishRecord,
)
from app.modules.platform.runtime.entities.models import (  # noqa: F401
    RuntimeEntity,
    RuntimeEntityValue,
)
from app.modules.platform.runtime.relation_instances.models import (  # noqa: F401
    RuntimeRelationInstance,
)


def init_db():
    """Create legacy/app tables. Platform designer tables are excluded — see Alembic."""
    tables = [
        table
        for table in Base.metadata.sorted_tables
        if table.name not in PLATFORM_ALEMBIC_TABLE_NAMES
    ]
    Base.metadata.create_all(bind=engine, tables=tables)
    ensure_navigation_scope_column()
    ensure_navigation_system_columns()


def ensure_navigation_scope_column():
    inspector = inspect(engine)
    try:
        columns = {column["name"] for column in inspector.get_columns("navigation_items")}
    except Exception:
        return

    if "menu_scope" in columns:
        return

    with engine.begin() as connection:
        connection.execute(
            text("ALTER TABLE navigation_items ADD COLUMN menu_scope VARCHAR(50) DEFAULT 'runtime'")
        )
        connection.execute(
            text("UPDATE navigation_items SET menu_scope = 'runtime' WHERE menu_scope IS NULL")
        )


def ensure_navigation_system_columns():
    inspector = inspect(engine)
    try:
        columns = {column["name"] for column in inspector.get_columns("navigation_items")}
    except Exception:
        return

    statements = []
    if "system_key" not in columns:
        statements.append("ALTER TABLE navigation_items ADD COLUMN system_key VARCHAR(100)")
    if "is_system" not in columns:
        statements.append("ALTER TABLE navigation_items ADD COLUMN is_system BOOLEAN DEFAULT FALSE")
    if "is_protected" not in columns:
        statements.append("ALTER TABLE navigation_items ADD COLUMN is_protected BOOLEAN DEFAULT FALSE")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
        connection.execute(
            text(
                "UPDATE navigation_items SET is_system = FALSE WHERE is_system IS NULL"
            )
        )
        connection.execute(
            text(
                "UPDATE navigation_items SET is_protected = FALSE WHERE is_protected IS NULL"
            )
        )


if __name__ == "__main__":
    init_db()
    print("База данных успешно инициализирована")
