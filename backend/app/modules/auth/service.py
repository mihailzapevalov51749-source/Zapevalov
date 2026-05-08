from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.modules.users.models import User
from .security import hash_password, verify_password, create_access_token


def register_user(db: Session, email: str, password: str, full_name: str):
    existing = db.query(User).filter(User.email == email).first()

    if existing:
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")

    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def login_user(db: Session, email: str, password: str):
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(status_code=400, detail="Неверный email или пароль")

    if not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Неверный email или пароль")

    token = create_access_token({"sub": str(user.id)})

    return token