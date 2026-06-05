from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.blocks.models import Block
from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.platform.designer.field_definitions.models import DesignerFieldDefinition
from app.modules.platform.designer.trash.schemas import (
    DependencyTreeNodeRead,
    DependencyTreeRead,
    TrashDependencyRead,
    TrashEntityKind,
)
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition
from app.modules.platform.designer.workspaces.models import DesignerWorkspaceTab
from app.modules.sections.models import Section


@dataclass(slots=True)
class ResolvedDependency:
    node: DependencyTreeNodeRead
    clear: Callable[[Session], bool] | None = None
    cascade: Callable[[Session], int] | None = None


class DependencyResolutionService:
    def __init__(self) -> None:
        self._registry: dict[TrashEntityKind, Callable[[Session, int, str], list[ResolvedDependency]]] = {
            "page": self._resolve_page_dependencies,
            "object_type": self._resolve_object_type_dependencies,
            "workspace": self._resolve_workspace_dependencies,
            "navigation": self._resolve_navigation_dependencies,
            "workspace_tab": self._resolve_empty_dependencies,
            "object_view": self._resolve_empty_dependencies,
            "object_relation": self._resolve_empty_dependencies,
        }

    def get_dependencies(
        self,
        db: Session,
        *,
        tenant_id: int,
        kind: TrashEntityKind,
        entity_id: str,
    ) -> list[TrashDependencyRead]:
        return [self._to_dependency_read(dep.node) for dep in self._resolve(db, tenant_id, kind, entity_id)]

    def build_dependency_tree(
        self,
        db: Session,
        *,
        tenant_id: int,
        kind: TrashEntityKind,
        entity_id: str,
        title: str,
    ) -> DependencyTreeRead:
        deps = self._resolve(db, tenant_id, kind, entity_id)
        root = DependencyTreeNodeRead(
            node_key=f"root:{kind}:{entity_id}",
            kind="root",
            title=title,
            entity_kind=kind,
            entity_id=entity_id,
            path=[],
            children=[dep.node for dep in deps],
        )
        return DependencyTreeRead(root=root, total_nodes=self._count_nodes(root))

    def clear_dependencies(
        self,
        db: Session,
        *,
        tenant_id: int,
        kind: TrashEntityKind,
        entity_id: str,
    ) -> list[TrashDependencyRead]:
        deps = self._resolve(db, tenant_id, kind, entity_id)
        cleared: list[TrashDependencyRead] = []
        for dep in deps:
            if dep.clear and dep.clear(db):
                cleared.append(self._to_dependency_read(dep.node))
        return cleared

    def cascade_delete(
        self,
        db: Session,
        *,
        tenant_id: int,
        kind: TrashEntityKind,
        entity_id: str,
    ) -> list[tuple[TrashEntityKind, str]]:
        deps = self._resolve(db, tenant_id, kind, entity_id)
        deleted: list[tuple[TrashEntityKind, str]] = []
        for dep in deps:
            if dep.cascade:
                dep.cascade(db)
                if dep.node.entity_kind in {"workspace", "workspace_tab", "object_type", "object_view", "object_relation", "page", "navigation"} and dep.node.entity_id:
                    deleted.append((dep.node.entity_kind, dep.node.entity_id))
        return deleted

    def _resolve(
        self,
        db: Session,
        tenant_id: int,
        kind: TrashEntityKind,
        entity_id: str,
    ) -> list[ResolvedDependency]:
        resolver = self._registry.get(kind)
        if resolver is None:
            return []
        return resolver(db, tenant_id, entity_id)

    def _resolve_empty_dependencies(self, db: Session, tenant_id: int, entity_id: str) -> list[ResolvedDependency]:
        return []

    def _resolve_page_dependencies(self, db: Session, tenant_id: int, entity_id: str) -> list[ResolvedDependency]:
        page_id = int(entity_id)
        dependencies: list[ResolvedDependency] = []

        nav_rows = (
            db.query(NavigationItem)
            .filter(
                NavigationItem.portal_id == tenant_id,
                NavigationItem.page_id == page_id,
                NavigationItem.deleted_at.is_(None),
            )
            .all()
        )
        for nav in nav_rows:
            dependencies.append(
                ResolvedDependency(
                    node=DependencyTreeNodeRead(
                        node_key=f"navigation:{nav.id}",
                        kind="navigation",
                        title=f'Навигация "{nav.title}"',
                        entity_kind="navigation",
                        entity_id=str(nav.id),
                        path=["Студия", "Навигация", nav.title],
                    ),
                    clear=lambda session, nav_item=nav: self._detach_navigation_page(session, nav_item),
                    cascade=lambda session, nav_item=nav: self._soft_delete_navigation(session, nav_item),
                ),
            )

        tab_rows = (
            db.query(DesignerWorkspaceTab)
            .filter(
                DesignerWorkspaceTab.tenant_id == tenant_id,
                DesignerWorkspaceTab.tab_type == "page",
                DesignerWorkspaceTab.target_id == str(page_id),
                DesignerWorkspaceTab.deleted_at.is_(None),
            )
            .all()
        )
        for tab in tab_rows:
            dependencies.append(
                ResolvedDependency(
                    node=DependencyTreeNodeRead(
                        node_key=f"workspace_tab:{tab.id}",
                        kind="workspace_tab",
                        title=f'Вкладка "{tab.title}"',
                        entity_kind="workspace_tab",
                        entity_id=str(tab.id),
                        path=["Студия", "Рабочие пространства", tab.title],
                    ),
                    clear=lambda session, row=tab: self._detach_workspace_tab_page(session, row),
                    cascade=lambda session, row=tab: self._soft_delete_workspace_tab(session, row),
                ),
            )

        section_rows = db.query(Section).filter(Section.page_id == page_id).all()
        if section_rows:
            section_children: list[DependencyTreeNodeRead] = []
            for section in section_rows:
                block_count = db.query(Block).filter(Block.section_id == section.id).count()
                section_children.append(
                    DependencyTreeNodeRead(
                        node_key=f"page_section:{section.id}",
                        kind="page_section",
                        title=f'{section.title or "Секция"} ({block_count} блоков)',
                        entity_kind="page_section",
                        entity_id=str(section.id),
                        path=["Студия", "Страницы", "Секция страницы"],
                    ),
                )
            dependencies.append(
                ResolvedDependency(
                    node=DependencyTreeNodeRead(
                        node_key=f"page_sections:{page_id}",
                        kind="page_section",
                        title=f"Секции страницы ({len(section_rows)})",
                        entity_kind=None,
                        entity_id=None,
                        path=["Студия", "Страницы"],
                        children=section_children,
                    ),
                    clear=lambda session, pid=page_id: self._clear_page_sections(session, pid),
                    cascade=lambda session, pid=page_id: self._cascade_delete_page_sections(session, pid),
                ),
            )

        return dependencies

    def _resolve_object_type_dependencies(self, db: Session, tenant_id: int, entity_id: str) -> list[ResolvedDependency]:
        object_type_id = UUID(entity_id)
        dependencies: list[ResolvedDependency] = []

        view_rows = (
            db.query(DesignerViewDefinition)
            .filter(
                DesignerViewDefinition.object_type_id == object_type_id,
                DesignerViewDefinition.deleted_at.is_(None),
            )
            .all()
        )
        for view in view_rows:
            dependencies.append(
                ResolvedDependency(
                    node=DependencyTreeNodeRead(
                        node_key=f"object_view:{view.id}",
                        kind="object_view",
                        title=f'Представление "{view.name}"',
                        entity_kind="object_view",
                        entity_id=str(view.id),
                        path=["Студия", "Объекты", view.name],
                    ),
                    cascade=lambda session, row=view: self._soft_delete_object_view(session, row),
                ),
            )

        field_rows = (
            db.query(DesignerFieldDefinition)
            .filter(
                DesignerFieldDefinition.object_type_id == object_type_id,
                DesignerFieldDefinition.deleted_at.is_(None),
            )
            .all()
        )
        if field_rows:
            dependencies.append(
                ResolvedDependency(
                    node=DependencyTreeNodeRead(
                        node_key=f"object_fields:{entity_id}",
                        kind="object_field",
                        title=f"Поля ({len(field_rows)})",
                        entity_kind=None,
                        entity_id=None,
                        path=["Студия", "Объекты", "Поля"],
                    ),
                    clear=lambda session, oid=object_type_id: self._clear_object_fields(session, oid),
                    cascade=lambda session, oid=object_type_id: self._cascade_delete_object_fields(session, oid),
                ),
            )

        nav_rows = (
            db.query(NavigationItem)
            .filter(
                NavigationItem.portal_id == tenant_id,
                NavigationItem.object_type_id == object_type_id,
                NavigationItem.deleted_at.is_(None),
            )
            .all()
        )
        for nav in nav_rows:
            dependencies.append(
                ResolvedDependency(
                    node=DependencyTreeNodeRead(
                        node_key=f"navigation:{nav.id}",
                        kind="navigation",
                        title=f'Навигация "{nav.title}"',
                        entity_kind="navigation",
                        entity_id=str(nav.id),
                        path=["Студия", "Навигация", nav.title],
                    ),
                    clear=lambda session, row=nav: self._detach_navigation_object_type(session, row),
                    cascade=lambda session, row=nav: self._soft_delete_navigation(session, row),
                ),
            )

        return dependencies

    def _resolve_workspace_dependencies(self, db: Session, tenant_id: int, entity_id: str) -> list[ResolvedDependency]:
        workspace_id = int(entity_id)
        tab_rows = (
            db.query(DesignerWorkspaceTab)
            .filter(
                DesignerWorkspaceTab.workspace_id == workspace_id,
                DesignerWorkspaceTab.deleted_at.is_(None),
            )
            .all()
        )
        dependencies: list[ResolvedDependency] = []
        for tab in tab_rows:
            dependencies.append(
                ResolvedDependency(
                    node=DependencyTreeNodeRead(
                        node_key=f"workspace_tab:{tab.id}",
                        kind="workspace_tab",
                        title=f'Вкладка "{tab.title}"',
                        entity_kind="workspace_tab",
                        entity_id=str(tab.id),
                        path=["Студия", "Рабочие пространства", tab.title],
                    ),
                    cascade=lambda session, row=tab: self._soft_delete_workspace_tab(session, row),
                ),
            )
        return dependencies

    def _resolve_navigation_dependencies(self, db: Session, tenant_id: int, entity_id: str) -> list[ResolvedDependency]:
        nav_id = int(entity_id)
        children = (
            db.query(NavigationItem)
            .filter(
                NavigationItem.parent_id == nav_id,
                NavigationItem.deleted_at.is_(None),
            )
            .all()
        )
        if not children:
            return []
        return [
            ResolvedDependency(
                node=DependencyTreeNodeRead(
                    node_key=f"navigation_children:{nav_id}",
                    kind="navigation",
                    title=f"Дочерние пункты навигации ({len(children)})",
                    entity_kind="navigation",
                    entity_id=str(nav_id),
                    path=["Студия", "Навигация"],
                    children=[
                        DependencyTreeNodeRead(
                            node_key=f"navigation:{child.id}",
                            kind="navigation",
                            title=child.title,
                            entity_kind="navigation",
                            entity_id=str(child.id),
                            path=["Студия", "Навигация", child.title],
                        )
                        for child in children
                    ],
                ),
                clear=lambda session, nid=nav_id: self._detach_navigation_children(session, nid),
                cascade=lambda session, nid=nav_id: self._cascade_delete_navigation_children(session, nid),
            ),
        ]

    @staticmethod
    def _to_dependency_read(node: DependencyTreeNodeRead) -> TrashDependencyRead:
        return TrashDependencyRead(
            label=node.title,
            kind=node.kind,
            entity_kind=node.entity_kind,
            entity_id=node.entity_id,
            path=node.path,
        )

    @staticmethod
    def _count_nodes(root: DependencyTreeNodeRead) -> int:
        total = 1
        for child in root.children:
            total += DependencyResolutionService._count_nodes(child)
        return total

    @staticmethod
    def _detach_navigation_page(db: Session, nav: NavigationItem) -> bool:
        changed = nav.page_id is not None
        nav.page_id = None
        return changed

    @staticmethod
    def _detach_navigation_object_type(db: Session, nav: NavigationItem) -> bool:
        changed = nav.object_type_id is not None
        nav.object_type_id = None
        return changed

    @staticmethod
    def _detach_workspace_tab_page(db: Session, tab: DesignerWorkspaceTab) -> bool:
        changed = tab.tab_type == "page" or tab.target_id is not None
        tab.tab_type = "external_url"
        tab.target_type = None
        tab.target_id = None
        tab.url = None
        return changed

    @staticmethod
    def _clear_page_sections(db: Session, page_id: int) -> bool:
        section_ids = [row.id for row in db.query(Section.id).filter(Section.page_id == page_id).all()]
        if not section_ids:
            return False
        db.query(Block).filter(Block.section_id.in_(section_ids)).delete(synchronize_session=False)
        db.query(Section).filter(Section.id.in_(section_ids)).delete(synchronize_session=False)
        return True

    @staticmethod
    def _cascade_delete_page_sections(db: Session, page_id: int) -> int:
        DependencyResolutionService._clear_page_sections(db, page_id)
        page = db.query(Page).filter(Page.id == page_id).first()
        if page:
            db.delete(page)
            return 1
        return 0

    @staticmethod
    def _clear_object_fields(db: Session, object_type_id: UUID) -> bool:
        count = db.query(DesignerFieldDefinition).filter(
            DesignerFieldDefinition.object_type_id == object_type_id,
            DesignerFieldDefinition.deleted_at.is_(None),
        ).count()
        if count == 0:
            return False
        db.query(DesignerFieldDefinition).filter(
            DesignerFieldDefinition.object_type_id == object_type_id,
            DesignerFieldDefinition.deleted_at.is_(None),
        ).delete(synchronize_session=False)
        return True

    @staticmethod
    def _cascade_delete_object_fields(db: Session, object_type_id: UUID) -> int:
        DependencyResolutionService._clear_object_fields(db, object_type_id)
        return 1

    @staticmethod
    def _detach_navigation_children(db: Session, nav_id: int) -> bool:
        changed = db.query(NavigationItem).filter(
            NavigationItem.parent_id == nav_id,
            NavigationItem.deleted_at.is_(None),
        ).update({"parent_id": None}, synchronize_session=False)
        return changed > 0

    @staticmethod
    def _cascade_delete_navigation_children(db: Session, nav_id: int) -> int:
        rows = db.query(NavigationItem).filter(
            NavigationItem.parent_id == nav_id,
            NavigationItem.deleted_at.is_(None),
        ).all()
        for row in rows:
            row.deleted_at = row.deleted_at or datetime.now(timezone.utc)
        return len(rows)

    @staticmethod
    def _soft_delete_navigation(db: Session, nav: NavigationItem) -> int:
        nav.deleted_at = nav.deleted_at or datetime.now(timezone.utc)
        return 1

    @staticmethod
    def _soft_delete_workspace_tab(db: Session, tab: DesignerWorkspaceTab) -> int:
        tab.deleted_at = tab.deleted_at or datetime.now(timezone.utc)
        return 1

    @staticmethod
    def _soft_delete_object_view(db: Session, view: DesignerViewDefinition) -> int:
        view.deleted_at = view.deleted_at or datetime.now(timezone.utc)
        return 1


dependency_resolution_service = DependencyResolutionService()
