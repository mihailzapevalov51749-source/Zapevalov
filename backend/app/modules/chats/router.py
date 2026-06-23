from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.platform_identity.session_bridge.runtime_actor_access import (
    require_runtime_actor,
    resolve_runtime_actor_user_id,
)
from app.modules.control_plane.platform_identity.session_bridge.runtime_auth import (
    RuntimeDesignerActor,
)
from app.modules.chats import crud, service
from app.modules.chats.dependencies import ensure_chat_admin
from app.modules.chats.schemas import (
    ChatCreate,
    ChatListItemOut,
    ChatMessageCreate,
    ChatMessageOut,
    ChatMessagesPageOut,
    ChatMessageUpdate,
    ChatOut,
    ChatParticipantIn,
    ChatParticipantOut,
    ChatParticipantUpdate,
    ChatReactionCreate,
    ChatReactionOut,
    ChatReadStateUpdate,
    ChatUpdate,
    ChatUserOut,
    DirectChatCreate,
)
from app.modules.chats.tenant_access import (
    assert_current_user_can_access_chat_tenant,
    assert_participant_ids_belong_to_tenant,
    assert_user_has_chat_tenant_access,
    get_user_for_chat_tenant,
    resolve_chat_tenant_id,
    search_tenant_chat_users,
)
from app.modules.tenant_module_configurations.runtime.enforcement import (
    assert_chat_attachments_allowed,
    assert_chat_mentions_allowed,
    assert_chat_message_edit_allowed,
    assert_chat_participant_limit,
    assert_chat_reactions_allowed,
)
from app.modules.users.models import User

router = APIRouter(
    prefix="/chats",
    tags=["chats"],
)


def get_current_user_id(current_user: RuntimeDesignerActor) -> int:
    return resolve_runtime_actor_user_id(current_user)


def ensure_chat_access(
    db: Session,
    chat_id: int,
    current_user,
):
    user_id = get_current_user_id(current_user)

    chat = crud.get_chat_by_id(db, chat_id)

    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Чат не найден",
        )

    if not crud.is_chat_participant(db, chat_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к чату",
        )

    assert_current_user_can_access_chat_tenant(
        db,
        current_user,
        chat.tenant_id,
    )

    return chat


@router.get("", response_model=list[ChatListItemOut])
def list_chats(
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    user_id = get_current_user_id(current_user)

    if search:
        chats = crud.search_user_chats(
            db,
            user_id=user_id,
            search=search,
        )
    else:
        chats = crud.get_user_chats(
            db,
            user_id,
        )

    result = []

    for chat in chats:
        participant = crud.get_participant(
            db,
            chat_id=chat.id,
            user_id=user_id,
        )

        display_title = chat.title
        display_avatar_url = chat.avatar_url
        display_avatar_settings = chat.avatar_settings

        if chat.type == "direct":
            participants = crud.get_chat_participants(
                db,
                chat.id,
            )

            companion = next(
                (
                    participant.user
                    for participant in participants
                    if participant.user_id != user_id
                ),
                None,
            )

            if companion:
                display_title = (
                    companion.full_name
                    or companion.email
                    or chat.title
                )

                display_avatar_url = companion.avatar_url
                display_avatar_settings = companion.avatar_settings

        result.append(
            ChatListItemOut(
                id=chat.id,
                title=display_title,
                description=chat.description,
                type=chat.type,
                avatar_url=display_avatar_url,
                avatar_settings=display_avatar_settings,
                workspace_id=chat.workspace_id,
                created_by_id=chat.created_by_id,
                created_at=chat.created_at,
                updated_at=chat.updated_at,
                unread_count=crud.get_unread_count(
                    db,
                    chat_id=chat.id,
                    user_id=user_id,
                ),
                last_message=crud.get_last_message(
                    db,
                    chat_id=chat.id,
                ),
                participants_count=crud.get_chat_participants_count(
                    db,
                    chat_id=chat.id,
                ),
                is_pinned=participant.is_pinned if participant else False,
                is_muted=participant.is_muted if participant else False,
            )
        )

    return result


@router.get("/users/search", response_model=list[ChatUserOut])
def search_chat_users(
    tenant_id: int = Query(..., ge=1),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    resolved_tenant_id = assert_user_has_chat_tenant_access(
        db,
        current_user,
        tenant_id,
    )
    users = search_tenant_chat_users(
        db,
        tenant_id=resolved_tenant_id,
        search=search,
    )

    return [
        ChatUserOut(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            avatar_url=user.avatar_url,
            avatar_settings=user.avatar_settings,
        )
        for user in users
    ]


@router.post(
    "",
    response_model=ChatOut,
    status_code=status.HTTP_201_CREATED,
)
def create_chat(
    payload: ChatCreate,
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    user_id = get_current_user_id(current_user)
    tenant_id = resolve_chat_tenant_id(db, current_user, payload.tenant_id)

    assert_participant_ids_belong_to_tenant(
        db,
        tenant_id=tenant_id,
        participant_ids=payload.participant_ids,
    )

    participant_count = 1 + len(payload.participant_ids or [])
    assert_chat_participant_limit(
        db,
        tenant_id=tenant_id,
        current_count=0,
        incoming_count=participant_count,
    )

    return crud.create_chat(
        db,
        title=payload.title,
        description=payload.description,
        type=payload.type,
        avatar_url=payload.avatar_url,
        workspace_id=payload.workspace_id,
        tenant_id=tenant_id,
        created_by_id=user_id,
        participant_ids=payload.participant_ids,
        avatar_settings=payload.avatar_settings,
    )


@router.get("/{chat_id}", response_model=ChatOut)
def get_chat(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    user_id = get_current_user_id(current_user)

    return ensure_chat_access(
        db=db,
        chat_id=chat_id,
        current_user=current_user,
    )


@router.patch("/{chat_id}", response_model=ChatOut)
def update_chat(
    chat_id: int,
    payload: ChatUpdate,
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    user_id = get_current_user_id(current_user)

    chat = ensure_chat_access(
        db=db,
        chat_id=chat_id,
        current_user=current_user,
    )

    ensure_chat_admin(
        db,
        chat_id=chat_id,
        user_id=user_id,
    )

    return crud.update_chat(
        db,
        chat,
        payload.model_dump(exclude_unset=True),
    )


@router.delete(
    "/{chat_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_chat(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    user_id = get_current_user_id(current_user)

    ensure_chat_admin(
        db,
        chat_id=chat_id,
        user_id=user_id,
    )

    crud.delete_chat(
        db,
        chat_id=chat_id,
    )

    return None


@router.get("/{chat_id}/messages", response_model=ChatMessagesPageOut)
def list_messages(
    chat_id: int,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    user_id = get_current_user_id(current_user)

    ensure_chat_access(
        db=db,
        chat_id=chat_id,
        current_user=current_user,
    )

    items, total = crud.get_chat_messages(
        db,
        chat_id=chat_id,
        limit=limit,
        offset=offset,
    )

    return ChatMessagesPageOut(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/{chat_id}/messages",
    response_model=ChatMessageOut,
    status_code=status.HTTP_201_CREATED,
)
def create_message(
    chat_id: int,
    payload: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    user_id = get_current_user_id(current_user)

    ensure_chat_access(
        db=db,
        chat_id=chat_id,
        current_user=current_user,
    )

    chat = crud.get_chat_by_id(db, chat_id)
    tenant_id = int(chat.tenant_id) if chat and chat.tenant_id is not None else None

    assert_chat_attachments_allowed(
        db,
        tenant_id=tenant_id,
        attachments=payload.attachments,
    )
    assert_chat_mentions_allowed(
        db,
        tenant_id=tenant_id,
        mentions=payload.mentions,
    )

    if not payload.content and not payload.attachments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Сообщение не может быть пустым",
        )

    if payload.parent_message_id:
        parent_message = crud.get_message_by_id(
            db,
            payload.parent_message_id,
        )

        if not parent_message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Родительское сообщение не найдено",
            )

        if parent_message.chat_id != chat_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Сообщение принадлежит другому чату",
            )

    return service.create_chat_message(
        db,
        chat_id=chat_id,
        created_by_id=user_id,
        content=payload.content,
        parent_message_id=payload.parent_message_id,
        attachments=[
            item.model_dump()
            for item in payload.attachments
        ],
        mentions=[
            item.model_dump()
            for item in payload.mentions
        ],
    )


@router.patch(
    "/messages/{message_id}",
    response_model=ChatMessageOut,
)
def update_message(
    message_id: int,
    payload: ChatMessageUpdate,
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    user_id = get_current_user_id(current_user)

    message = crud.get_message_by_id(db, message_id)

    if not message or message.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Сообщение не найдено",
        )

    ensure_chat_access(
        db=db,
        chat_id=message.chat_id,
        current_user=current_user,
    )

    chat = crud.get_chat_by_id(db, message.chat_id)
    tenant_id = int(chat.tenant_id) if chat and chat.tenant_id is not None else None

    if message.created_by_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Можно редактировать только свои сообщения",
        )

    assert_chat_message_edit_allowed(
        db,
        tenant_id=tenant_id,
        message_created_at=message.created_at,
    )

    if payload.mentions is not None:
        assert_chat_mentions_allowed(
            db,
            tenant_id=tenant_id,
            mentions=payload.mentions,
        )

    return crud.update_message(
        db,
        message,
        content=payload.content,
        mentions=(
            [
                item.model_dump()
                for item in payload.mentions
            ]
            if payload.mentions is not None
            else None
        ),
    )


@router.delete("/messages/{message_id}")
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    user_id = get_current_user_id(current_user)

    message = crud.get_message_by_id(db, message_id)

    if not message or message.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Сообщение не найдено",
        )

    ensure_chat_access(
        db=db,
        chat_id=message.chat_id,
        current_user=current_user,
    )

    if message.created_by_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Можно удалить только свои сообщения",
        )

    crud.soft_delete_message(db, message)

    return {"ok": True}


@router.post(
    "/messages/{message_id}/reactions",
    response_model=ChatReactionOut,
    status_code=status.HTTP_201_CREATED,
)
def add_reaction(
    message_id: int,
    payload: ChatReactionCreate,
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    user_id = get_current_user_id(current_user)

    message = crud.get_message_by_id(db, message_id)

    if not message or message.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Сообщение не найдено",
        )

    ensure_chat_access(
        db=db,
        chat_id=message.chat_id,
        current_user=current_user,
    )

    chat = crud.get_chat_by_id(db, message.chat_id)
    tenant_id = int(chat.tenant_id) if chat and chat.tenant_id is not None else None
    assert_chat_reactions_allowed(db, tenant_id=tenant_id)

    return crud.add_reaction(
        db,
        message_id=message_id,
        user_id=user_id,
        emoji=payload.emoji,
    )


@router.delete("/messages/{message_id}/reactions/{emoji}")
def remove_reaction(
    message_id: int,
    emoji: str,
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    user_id = get_current_user_id(current_user)

    message = crud.get_message_by_id(db, message_id)

    if not message or message.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Сообщение не найдено",
        )

    ensure_chat_access(
        db=db,
        chat_id=message.chat_id,
        current_user=current_user,
    )

    crud.remove_reaction(
        db,
        message_id=message_id,
        user_id=user_id,
        emoji=emoji,
    )

    return {"ok": True}


@router.get(
    "/{chat_id}/participants",
    response_model=list[ChatParticipantOut],
)
def list_participants(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    user_id = get_current_user_id(current_user)

    ensure_chat_access(
        db=db,
        chat_id=chat_id,
        current_user=current_user,
    )

    return crud.get_chat_participants(db, chat_id)


@router.post(
    "/{chat_id}/participants",
    response_model=ChatParticipantOut,
    status_code=status.HTTP_201_CREATED,
)
def add_participant(
    chat_id: int,
    payload: ChatParticipantIn,
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    user_id = get_current_user_id(current_user)

    chat = ensure_chat_access(
        db=db,
        chat_id=chat_id,
        current_user=current_user,
    )

    ensure_chat_admin(
        db,
        chat_id=chat_id,
        user_id=user_id,
    )

    if chat.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Чат не привязан к компании",
        )

    get_user_for_chat_tenant(
        db,
        user_id=payload.user_id,
        tenant_id=int(chat.tenant_id),
    )

    current_participants = crud.get_chat_participants(db, chat_id)
    assert_chat_participant_limit(
        db,
        tenant_id=int(chat.tenant_id),
        current_count=len(current_participants),
        incoming_count=1,
    )

    return crud.add_participant(
        db,
        chat_id=chat_id,
        user_id=payload.user_id,
        role=payload.role,
    )


@router.patch(
    "/{chat_id}/participants/{participant_user_id}",
    response_model=ChatParticipantOut,
)
def update_participant(
    chat_id: int,
    participant_user_id: int,
    payload: ChatParticipantUpdate,
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    user_id = get_current_user_id(current_user)

    ensure_chat_access(
        db=db,
        chat_id=chat_id,
        current_user=current_user,
    )

    participant = crud.get_participant(
        db,
        chat_id=chat_id,
        user_id=participant_user_id,
    )

    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Участник не найден",
        )

    data = payload.model_dump(exclude_unset=True)

    admin_only_fields = {"role"}

    if any(field in data for field in admin_only_fields):
        ensure_chat_admin(
            db,
            chat_id=chat_id,
            user_id=user_id,
        )

    if participant_user_id != user_id and not any(
        field in data
        for field in admin_only_fields
    ):
        ensure_chat_admin(
            db,
            chat_id=chat_id,
            user_id=user_id,
        )

    return crud.update_participant(
        db,
        participant,
        data,
    )


@router.delete("/{chat_id}/participants/{participant_user_id}")
def remove_participant(
    chat_id: int,
    participant_user_id: int,
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    user_id = get_current_user_id(current_user)

    if participant_user_id != user_id:
        ensure_chat_admin(
            db,
            chat_id=chat_id,
            user_id=user_id,
        )
    else:
        ensure_chat_access(
            db=db,
            chat_id=chat_id,
            current_user=current_user,
        )

    crud.remove_participant(
        db,
        chat_id=chat_id,
        user_id=participant_user_id,
    )

    return {"ok": True}


@router.patch(
    "/{chat_id}/read-state",
    response_model=ChatParticipantOut,
)
def update_read_state(
    chat_id: int,
    payload: ChatReadStateUpdate,
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    user_id = get_current_user_id(current_user)

    ensure_chat_access(
        db=db,
        chat_id=chat_id,
        current_user=current_user,
    )

    participant = crud.update_read_state(
        db,
        chat_id=chat_id,
        user_id=user_id,
        last_read_message_id=payload.last_read_message_id,
    )

    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Участник не найден",
        )

    return participant


@router.post(
    "/direct",
    response_model=ChatOut,
)
def get_or_create_direct_chat(
    payload: DirectChatCreate,
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    current_user_id = get_current_user_id(current_user)

    if payload.user_id == current_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя создать чат с самим собой",
        )

    tenant_id = resolve_chat_tenant_id(db, current_user, payload.tenant_id)

    get_user_for_chat_tenant(
        db,
        user_id=payload.user_id,
        tenant_id=tenant_id,
    )

    return crud.get_or_create_direct_chat(
        db,
        current_user_id=current_user_id,
        target_user_id=payload.user_id,
        tenant_id=tenant_id,
    )