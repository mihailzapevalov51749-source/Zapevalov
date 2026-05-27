from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import Base


class NavigationItem(Base):
    __tablename__ = "navigation_items"

    id = Column(Integer, primary_key=True, index=True)

    portal_id = Column(Integer, ForeignKey("portals.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("navigation_items.id"), nullable=True)

    type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)

    page_id = Column(Integer, nullable=True)
    library_id = Column(Integer, nullable=True)
    url = Column(String(1000), nullable=True)

    sort_order = Column(Integer, default=0)
    is_visible = Column(Boolean, default=True)

    icon = Column(String(255), nullable=True)
    icon_type = Column(String(50), nullable=True)  # library | upload
    icon_file_url = Column(String(1000), nullable=True)

    color = Column(String(50), nullable=True)
    is_bold = Column(Boolean, default=False)
    is_italic = Column(Boolean, default=False)
    menu_scope = Column(String(50), nullable=False, default="runtime")
    system_key = Column(String(100), nullable=True)
    is_system = Column(Boolean, nullable=False, default=False)
    is_protected = Column(Boolean, nullable=False, default=False)

    parent = relationship(
        "NavigationItem",
        remote_side=[id],
        backref="children"
    )

    @property
    def route(self):
        return self.url

    @route.setter
    def route(self, value):
        self.url = value

    @property
    def path(self):
        return self.url

    @path.setter
    def path(self, value):
        self.url = value