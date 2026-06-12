from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.modules.blocks.models import Block
from app.modules.chats.models import (
    Chat,
    ChatMessage,
    ChatMessageAttachment,
    ChatMessageMention,
    ChatMessageReaction,
    ChatParticipant,
)
from app.modules.checklists.models import ChecklistItem
from app.modules.comments.models import (
    Comment,
    CommentAttachment,
    CommentMention,
    CommentReaction,
)
from app.modules.document_libraries.models import DocumentLibrary, LibraryDocument
from app.modules.navigation.models import NavigationItem
from app.modules.notes.models import Note, NoteMention
from app.modules.notifications.models import Notification, NotificationRecipient
from app.modules.pages.models import Page
from app.modules.platform.action_engine.action_definitions.models import (
    DesignerActionDefinition,
)
from app.modules.platform.action_engine.action_forms.models import (
    DesignerActionForm,
    DesignerActionFormField,
)
from app.modules.platform.action_engine.action_placements.models import (
    DesignerActionPlacement,
)
from app.modules.platform.designer.field_definitions.models import DesignerFieldDefinition
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform.designer.publish.models import (
    DesignerMetadataSnapshot,
    DesignerPublishRecord,
)
from app.modules.platform.designer.relation_definitions.models import (
    DesignerRelationDefinition,
)
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition
from app.modules.platform.designer.workspaces.models import (
    DesignerWorkspace,
    DesignerWorkspaceTab,
)
from app.modules.platform.runtime.entities.models import RuntimeEntity, RuntimeEntityValue
from app.modules.platform.runtime.office_user_views.models import RuntimeOfficeUserTableView
from app.modules.platform.runtime.relation_instances.models import RuntimeRelationInstance
from app.modules.platform.workspace_tabs.models import UserWorkspaceTab
from app.modules.portals.models import Portal
from app.modules.sections.models import Section
from app.modules.tenant_management.exceptions import (
    SystemTenantDeleteForbiddenError,
    TenantNotFoundError,
)
from app.modules.user_activity.models import UserActivitySession, UserPresenceState
from app.modules.control_plane.customer_companies.models import CustomerCompany
from app.modules.tenant_users.models import TenantUserMembership
from app.modules.users.models import User

SYSTEM_TENANT_ID = 1


@dataclass(frozen=True)
class DeleteTenantResult:
    tenant_id: int
    tenant_name: str


def _collect_library_ids(db: Session, tenant_id: int) -> list[int]:
    rows = (
        db.query(NavigationItem.library_id)
        .filter(
            NavigationItem.portal_id == tenant_id,
            NavigationItem.library_id.isnot(None),
        )
        .all()
    )
    return sorted({row[0] for row in rows if row[0] is not None})


def _collect_runtime_entity_ids(db: Session, tenant_id: int) -> list[str]:
    rows = (
        db.query(RuntimeEntity.id)
        .filter(RuntimeEntity.tenant_id == tenant_id)
        .all()
    )
    return [str(row[0]) for row in rows]


def _delete_comment_graph(db: Session, comment_ids: list[int]) -> None:
    if not comment_ids:
        return

    db.query(CommentReaction).filter(CommentReaction.comment_id.in_(comment_ids)).delete(
        synchronize_session=False
    )
    db.query(CommentMention).filter(CommentMention.comment_id.in_(comment_ids)).delete(
        synchronize_session=False
    )
    db.query(CommentAttachment).filter(CommentAttachment.comment_id.in_(comment_ids)).delete(
        synchronize_session=False
    )
    db.query(Comment).filter(Comment.id.in_(comment_ids)).delete(synchronize_session=False)


def _delete_polymorphic_entity_content(db: Session, entity_ids: list[str]) -> None:
    if not entity_ids:
        return

    comment_ids = [
        row.id
        for row in db.query(Comment.id)
        .filter(
            Comment.entity_type == "runtime_entity",
            Comment.entity_id.in_(entity_ids),
        )
        .all()
    ]
    _delete_comment_graph(db, comment_ids)

    db.query(NoteMention).filter(
        NoteMention.note_id.in_(
            db.query(Note.id).filter(
                Note.entity_type == "runtime_entity",
                Note.entity_id.in_(entity_ids),
            )
        )
    ).delete(synchronize_session=False)
    db.query(Note).filter(
        Note.entity_type == "runtime_entity",
        Note.entity_id.in_(entity_ids),
    ).delete(synchronize_session=False)

    db.query(ChecklistItem).filter(
        ChecklistItem.entity_type == "runtime_entity",
        ChecklistItem.entity_id.in_(entity_ids),
    ).delete(synchronize_session=False)

    notification_ids = [
        row.id
        for row in db.query(Notification.id)
        .filter(
            Notification.entity_type == "runtime_entity",
            Notification.entity_id.in_(entity_ids),
        )
        .all()
    ]
    if notification_ids:
        db.query(NotificationRecipient).filter(
            NotificationRecipient.notification_id.in_(notification_ids)
        ).delete(synchronize_session=False)
        db.query(Notification).filter(Notification.id.in_(notification_ids)).delete(
            synchronize_session=False
        )


def _delete_chats_for_workspaces(db: Session, workspace_ids: list[int]) -> None:
    if not workspace_ids:
        return

    chat_ids = [
        row.id
        for row in db.query(Chat.id).filter(Chat.workspace_id.in_(workspace_ids)).all()
    ]
    if not chat_ids:
        return

    message_ids = [
        row.id
        for row in db.query(ChatMessage.id).filter(ChatMessage.chat_id.in_(chat_ids)).all()
    ]
    if message_ids:
        db.query(ChatMessageReaction).filter(
            ChatMessageReaction.message_id.in_(message_ids)
        ).delete(synchronize_session=False)
        db.query(ChatMessageMention).filter(
            ChatMessageMention.message_id.in_(message_ids)
        ).delete(synchronize_session=False)
        db.query(ChatMessageAttachment).filter(
            ChatMessageAttachment.message_id.in_(message_ids)
        ).delete(synchronize_session=False)
        db.query(ChatMessage).filter(ChatMessage.id.in_(message_ids)).delete(
            synchronize_session=False
        )

    db.query(ChatParticipant).filter(ChatParticipant.chat_id.in_(chat_ids)).delete(
        synchronize_session=False
    )
    db.query(Chat).filter(Chat.id.in_(chat_ids)).delete(synchronize_session=False)


def _delete_tenant_data(db: Session, tenant_id: int) -> None:
    workspace_ids = [
        row.id
        for row in db.query(DesignerWorkspace.id)
        .filter(DesignerWorkspace.tenant_id == tenant_id)
        .all()
    ]
    runtime_entity_ids = _collect_runtime_entity_ids(db, tenant_id)
    library_ids = _collect_library_ids(db, tenant_id)

    _delete_chats_for_workspaces(db, workspace_ids)
    _delete_polymorphic_entity_content(db, runtime_entity_ids)

    db.query(TenantUserMembership).filter(TenantUserMembership.tenant_id == tenant_id).delete(
        synchronize_session=False
    )
    db.query(User).filter(User.tenant_id == tenant_id).delete(synchronize_session=False)
    db.query(CustomerCompany).filter(CustomerCompany.primary_portal_id == tenant_id).delete(
        synchronize_session=False
    )
    db.query(UserActivitySession).filter(UserActivitySession.tenant_id == tenant_id).delete(
        synchronize_session=False
    )
    db.query(UserPresenceState).filter(UserPresenceState.tenant_id == tenant_id).delete(
        synchronize_session=False
    )
    db.query(UserWorkspaceTab).filter(UserWorkspaceTab.tenant_id == tenant_id).delete(
        synchronize_session=False
    )
    db.query(RuntimeOfficeUserTableView).filter(
        RuntimeOfficeUserTableView.tenant_id == tenant_id
    ).delete(synchronize_session=False)

    if library_ids:
        db.query(LibraryDocument).filter(LibraryDocument.library_id.in_(library_ids)).delete(
            synchronize_session=False
        )
        db.query(DocumentLibrary).filter(DocumentLibrary.id.in_(library_ids)).delete(
            synchronize_session=False
        )

    page_ids = [
        row.id for row in db.query(Page.id).filter(Page.portal_id == tenant_id).all()
    ]
    section_ids: list[int] = []
    block_ids: list[int] = []
    if page_ids:
        section_ids = [
            row.id
            for row in db.query(Section.id).filter(Section.page_id.in_(page_ids)).all()
        ]
    if section_ids:
        block_ids = [
            row.id
            for row in db.query(Block.id).filter(Block.section_id.in_(section_ids)).all()
        ]

    if block_ids:
        db.query(Block).filter(Block.id.in_(block_ids)).delete(synchronize_session=False)

    if section_ids:
        db.query(Section).filter(Section.id.in_(section_ids)).delete(synchronize_session=False)

    if workspace_ids:
        db.query(DesignerWorkspaceTab).filter(
            DesignerWorkspaceTab.workspace_id.in_(workspace_ids)
        ).delete(synchronize_session=False)
        db.query(DesignerWorkspace).filter(DesignerWorkspace.id.in_(workspace_ids)).delete(
            synchronize_session=False
        )

    db.query(RuntimeRelationInstance).filter(
        RuntimeRelationInstance.tenant_id == tenant_id
    ).delete(synchronize_session=False)
    db.query(RuntimeEntityValue).filter(RuntimeEntityValue.tenant_id == tenant_id).delete(
        synchronize_session=False
    )
    db.query(RuntimeEntity).filter(RuntimeEntity.tenant_id == tenant_id).delete(
        synchronize_session=False
    )

    db.query(DesignerActionFormField).filter(
        DesignerActionFormField.tenant_id == tenant_id
    ).delete(synchronize_session=False)
    db.query(DesignerActionForm).filter(DesignerActionForm.tenant_id == tenant_id).delete(
        synchronize_session=False
    )
    db.query(DesignerActionPlacement).filter(
        DesignerActionPlacement.tenant_id == tenant_id
    ).delete(synchronize_session=False)
    db.query(DesignerActionDefinition).filter(
        DesignerActionDefinition.tenant_id == tenant_id
    ).delete(synchronize_session=False)

    db.query(DesignerPublishRecord).filter(
        DesignerPublishRecord.tenant_id == tenant_id
    ).delete(synchronize_session=False)
    db.query(DesignerMetadataSnapshot).filter(
        DesignerMetadataSnapshot.tenant_id == tenant_id
    ).delete(synchronize_session=False)

    db.query(NavigationItem).filter(NavigationItem.portal_id == tenant_id).delete(
        synchronize_session=False
    )
    db.query(Page).filter(Page.portal_id == tenant_id).delete(synchronize_session=False)

    db.query(DesignerViewDefinition).filter(
        DesignerViewDefinition.tenant_id == tenant_id
    ).delete(synchronize_session=False)
    db.query(DesignerFieldDefinition).filter(
        DesignerFieldDefinition.tenant_id == tenant_id
    ).delete(synchronize_session=False)
    db.query(DesignerRelationDefinition).filter(
        DesignerRelationDefinition.tenant_id == tenant_id
    ).delete(synchronize_session=False)
    db.query(DesignerObjectType).filter(DesignerObjectType.tenant_id == tenant_id).delete(
        synchronize_session=False
    )


def delete_tenant(db: Session, tenant_id: int) -> DeleteTenantResult:
    if tenant_id == SYSTEM_TENANT_ID:
        raise SystemTenantDeleteForbiddenError("Системный tenant не может быть удалён.")

    portal = db.query(Portal).filter(Portal.id == tenant_id).one_or_none()
    if portal is None:
        raise TenantNotFoundError(f"Tenant portal {tenant_id} not found")

    tenant_name = portal.name

    try:
        _delete_tenant_data(db, tenant_id)
        db.query(Portal).filter(Portal.id == tenant_id).delete(synchronize_session=False)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return DeleteTenantResult(tenant_id=tenant_id, tenant_name=tenant_name)
