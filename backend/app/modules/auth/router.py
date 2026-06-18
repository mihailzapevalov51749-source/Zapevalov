from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.platform_profile.schemas import PlatformSetupStateRead
from app.modules.users.bootstrap_owner_service import build_platform_setup_state
from app.modules.users.models import User
from .dependencies import get_current_user
from .schemas import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    TenantEntryRead,
    TenantLoginBrandingRead,
    UserUpdate,
)
from .service import login_user, register_user
from .tenant_entry_resolution import resolve_tenant_entry_by_public_slug
from .tenant_login_branding import resolve_tenant_login_display_name

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    user = register_user(db, data.email, data.password, data.full_name)

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
    }


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    result = login_user(db, data.email, data.password)
    db.commit()
    return result


@router.get("/tenant-login-branding", response_model=TenantLoginBrandingRead)
def get_tenant_login_branding(
    tenant_id: int | None = Query(None, alias="tenantId", gt=0),
    tenant_key: str | None = Query(None, alias="tenantKey", min_length=1),
    public_slug: str | None = Query(None, alias="publicSlug", min_length=1),
    db: Session = Depends(get_db),
):
    normalized_slug = str(public_slug or tenant_key or "").strip()
    if normalized_slug:
        entry = resolve_tenant_entry_by_public_slug(db, normalized_slug)
        if entry is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Компания не найдена",
            )
        return TenantLoginBrandingRead(
            display_name=entry["display_name"],
            tenant_id=entry["tenant_id"],
            public_slug=entry["public_slug"],
            tenant_key=entry["public_slug"],
        )

    if tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Укажите publicSlug или tenantId",
        )

    display_name = resolve_tenant_login_display_name(db, tenant_id)
    if display_name is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена",
        )

    return TenantLoginBrandingRead(display_name=display_name, tenant_id=tenant_id)


@router.get("/tenant-entry/{public_slug}", response_model=TenantEntryRead)
def get_tenant_entry_by_public_slug(
    public_slug: str,
    db: Session = Depends(get_db),
):
    entry = resolve_tenant_entry_by_public_slug(db, public_slug)
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена",
        )

    return TenantEntryRead(
        tenant_id=entry["tenant_id"],
        public_slug=entry["public_slug"],
        display_name=entry["display_name"],
        tenant_key=entry["public_slug"],
    )


@router.get("/platform-setup-state", response_model=PlatformSetupStateRead)
def get_platform_setup_state(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return build_platform_setup_state(db, current_user)


@router.get("/me")
def get_me(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.modules.users.router import serialize_user

    return serialize_user(current_user, db)


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