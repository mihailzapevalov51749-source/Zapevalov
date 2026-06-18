from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.modules.platform_dashboard.datetime_utils import utc_now


class PlatformUser(Base):
    """Registry of users with platform-level access (separate from tenant memberships)."""

    __tablename__ = "platform_users"
    __table_args__ = (UniqueConstraint("user_id", name="uq_platform_users_user_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    platform_role: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

    user = relationship("User", foreign_keys=[user_id])
