from app.db.base import Base
from app.db.session import engine

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


def init_db():
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
    print("База данных успешно инициализирована")