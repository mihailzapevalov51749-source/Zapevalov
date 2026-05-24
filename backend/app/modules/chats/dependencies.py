from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.chats import crud


def ensure_chat_exists(
    db: Session,
    chat_id: int,
):
    chat = crud.get_chat_by_id(db, chat_id)

    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Чат не найден",
        )

    return chat


def ensure_chat_participant(
    db: Session,
    *,
    chat_id: int,
    user_id: int,
):
    participant = crud.get_participant(
        db,
        chat_id=chat_id,
        user_id=user_id,
    )

    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к чату",
        )

    return participant


def ensure_chat_admin(
    db: Session,
    *,
    chat_id: int,
    user_id: int,
):
    participant = ensure_chat_participant(
        db,
        chat_id=chat_id,
        user_id=user_id,
    )

    if participant.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Требуются права администратора чата",
        )

    return participant