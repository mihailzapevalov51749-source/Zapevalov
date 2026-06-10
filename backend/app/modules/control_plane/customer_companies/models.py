from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.modules.control_plane.customer_companies.constants import (
    CustomerCompanyStatus,
    DEFAULT_CUSTOMER_COMPANY_USERS_LIMIT,
)
from app.modules.portals.models import Portal
from app.modules.users.models import User


class CustomerCompany(Base):
    __tablename__ = "customer_companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=CustomerCompanyStatus.ACTIVE.value,
        server_default=CustomerCompanyStatus.ACTIVE.value,
        index=True,
    )

    primary_portal_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("portals.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    users_limit: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=DEFAULT_CUSTOMER_COMPANY_USERS_LIMIT,
        server_default=str(DEFAULT_CUSTOMER_COMPANY_USERS_LIMIT),
    )

    sales_owner_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    support_owner_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    primary_portal = relationship(Portal, foreign_keys=[primary_portal_id], lazy="joined")
    sales_owner = relationship(User, foreign_keys=[sales_owner_id], lazy="joined")
    support_owner = relationship(User, foreign_keys=[support_owner_id], lazy="joined")
