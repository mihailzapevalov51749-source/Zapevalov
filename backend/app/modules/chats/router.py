from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
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
    DirectChatCreate,
)

router = APIRouter(
    prefix="/chats",
    tags=["chats"],
)


def get_current_user_id(current_user) -> int:
    user_id = getattr(current_user, "id", None)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не авторизован",
        )

    return user_id


def ensure_chat_access(
    db: Session,
    chat_id: int,
    user_id: int,
):
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

    return chat


@router.get("", response_model=list[ChatListItemOut])
def list_chats(
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
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


@router.post(
    "",
    response_model=ChatOut,
    status_code=status.HTTP_201_CREATED,
)
def create_chat(
    payload: ChatCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = get_current_user_id(current_user)

    return crud.create_chat(
        db,
        title=payload.title,
        description=payload.description,
        type=payload.type,
        avatar_url=payload.avatar_url,
        workspace_id=payload.workspace_id,
        created_by_id=user_id,
        participant_ids=payload.participant_ids,
        avatar_settings=payload.avatar_settings,
    )


@router.get("/{chat_id}", response_model=ChatOut)
def get_chat(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = get_current_user_id(current_user)

    return ensure_chat_access(
        db=db,
        chat_id=chat_id,
        user_id=user_id,
    )


@router.patch("/{chat_id}", response_model=ChatOut)
def update_chat(
    chat_id: int,
    payload: ChatUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = get_current_user_id(current_user)

    chat = ensure_chat_access(
        db=db,
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
    current_user=Depends(get_current_user),
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
    current_user=Depends(get_current_user),
):
    user_id = get_current_user_id(current_user)

    ensure_chat_access(
        db=db,
        chat_id=chat_id,
        user_id=user_id,
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
    current_user=Depends(get_current_user),
):
    user_id = get_current_user_id(current_user)

    ensure_chat_access(
        db=db,
        chat_id=chat_id,
        user_id=user_id,
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
    current_user=Depends(get_current_user),
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
        user_id=user_id,
    )

    if message.created_by_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Можно редактировать только свои сообщения",
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
    current_user=Depends(get_current_user),
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
        user_id=user_id,
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
    current_user=Depends(get_current_user),
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
        user_id=user_id,
    )

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
    current_user=Depends(get_current_user),
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
        user_id=user_id,
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
    current_user=Depends(get_current_user),
):
    user_id = get_current_user_id(current_user)

    ensure_chat_access(
        db=db,
        chat_id=chat_id,
        user_id=user_id,
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
    current_user=Depends(get_current_user),
):
    user_id = get_current_user_id(current_user)

    ensure_chat_admin(
        db,
        chat_id=chat_id,
        user_id=user_id,
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
    current_user=Depends(get_current_user),
):
    user_id = get_current_user_id(current_user)

    ensure_chat_access(
        db=db,
        chat_id=chat_id,
        user_id=user_id,
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
    current_user=Depends(get_current_user),
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
            user_id=user_id,
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
    current_user=Depends(get_current_user),
):
    user_id = get_current_user_id(current_user)

    ensure_chat_access(
        db=db,
        chat_id=chat_id,
        user_id=user_id,
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
    current_user=Depends(get_current_user),
):
    current_user_id = get_current_user_id(current_user)

    if payload.user_id == current_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя создать чат с самим собой",
        )

    return crud.get_or_create_direct_chat(
        db,
        current_user_id=current_user_id,
        target_user_id=payload.user_id,
    )