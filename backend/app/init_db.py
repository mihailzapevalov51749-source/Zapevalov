from app.db.base import Base
from app.db.session import engine
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


if __name__ == "__main__":
    init_db()
    print("База данных успешно инициализирована")
