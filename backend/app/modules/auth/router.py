from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from .schemas import RegisterRequest, LoginRequest, AuthResponse, UserUpdate
from .service import register_user, login_user
from .dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    user = register_user(db, data.email, data.password, data.full_name)

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
    }


@router.post("/login", response_model=AuthResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    token = login_user(db, data.email, data.password)

    return {
        "access_token": token,
        "token_type": "bearer",
    }


@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "position": current_user.position,
        "department": current_user.department,
        "avatar_url": current_user.avatar_url,
        "avatar_settings": current_user.avatar_settings,
        "is_active": current_user.is_active,
        "role_id": current_user.role_id,
        "role": current_user.role.name if current_user.role else None,
        "last_login_at": current_user.last_login_at,
        "created_at": current_user.created_at,
        "updated_at": current_user.updated_at,
    }


@router.patch("/me")
def update_me(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if data.full_name is not None:
        current_user.full_name = data.full_name

    if data.phone is not None:
        current_user.phone = data.phone

    if data.position is not None:
        current_user.position = data.position

    if data.department is not None:
        current_user.department = data.department

    if data.avatar_url is not None:
        current_user.avatar_url = data.avatar_url

    if data.avatar_settings is not None:
        current_user.avatar_settings = data.avatar_settings

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "position": current_user.position,
        "department": current_user.department,
        "avatar_url": current_user.avatar_url,
        "avatar_settings": current_user.avatar_settings,
        "is_active": current_user.is_active,
        "role_id": current_user.role_id,
        "role": current_user.role.name if current_user.role else None,
        "last_login_at": current_user.last_login_at,
        "created_at": current_user.created_at,
        "updated_at": current_user.updated_at,
    }