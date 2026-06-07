from __future__ import annotations

import re
from urllib.parse import urlparse

from fastapi import HTTPException, status
from sqlalchemy import String, cast
from sqlalchemy.orm import Session

from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.sections.models import Section
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition
from app.modules.platform.designer.workspaces.models import DesignerWorkspace, DesignerWorkspaceTab
from app.modules.platform.designer.workspaces.schemas import (
    DesignerWorkspaceCreate,
    DesignerWorkspaceUpdate,
    WorkspaceTabCreate,
    WorkspaceTabRead,
    WorkspaceTabUpdate,
    WorkspaceMenuPlacementResult,
)
from app.modules.platform.designer.object_types.menu_placements.schemas import (
    DESIGNER_MENU_SCOPE,
    RUNTIME_MENU_SCOPE,
    MenuPlacementInput,
)


_SLUG_RE = re.compile(r"[^a-z0-9]+")
_CYR_TO_LAT = {
    "а": "a",
    "б": "b",
    "в": "v",
    "г": "g",
    "д": "d",
    "е": "e",
    "ё": "e",
    "ж": "zh",
    "з": "z",
    "и": "i",
    "й": "y",
    "к": "k",
    "л": "l",
    "м": "m",
    "н": "n",
    "о": "o",
    "п": "p",
    "р": "r",
    "с": "s",
    "т": "t",
    "у": "u",
    "ф": "f",
    "х": "h",
    "ц": "ts",
    "ч": "ch",
    "ш": "sh",
    "щ": "sch",
    "ъ": "",
    "ы": "y",
    "ь": "",
    "э": "e",
    "ю": "yu",
    "я": "ya",
}
WORKSPACE_TAB_TYPES = {"object", "page", "link", "dashboard", "documents", "process", "group"}


def _slugify(value: str) -> str:
    transliterated = "".join(_CYR_TO_LAT.get(ch, ch) for ch in value.lower().strip())
    normalized = transliterated
    normalized = _SLUG_RE.sub("-", normalized).strip("-")
    return normalized


def _workspace_route(*, tenant_id: int, slug: str) -> str:
    return f"/designer/tenant/{tenant_id}/workspaces/{slug}"


def _workspace_runtime_route(*, tenant_id: int, slug: str) -> str:
    return f"/portal/{tenant_id}/workspaces/{slug}"


def _workspace_system_key(workspace_id: int, menu_scope: str) -> str:
    return f"designer.workspace.{workspace_id}.{menu_scope}"


def _workspace_tab_slug(
    db: Session,
    *,
    workspace_id: int,
    base_value: str,
    exclude_tab_id: int | None = None,
) -> str:
    base_slug = _slugify(base_value)
    if not base_slug:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Не удалось сформировать slug вкладки. Укажите slug латиницей.",
        )
    slug = base_slug
    suffix = 2
    while True:
        query = db.query(DesignerWorkspaceTab.id).filter(
            DesignerWorkspaceTab.workspace_id == workspace_id,
            DesignerWorkspaceTab.slug == slug,
        )
        if exclude_tab_id is not None:
            query = query.filter(DesignerWorkspaceTab.id != exclude_tab_id)
        if query.first() is None:
            return slug
        slug = f"{base_slug}-{suffix}"
        suffix += 1


def _resolve_page_or_422(db: Session, *, tenant_id: int, page_id: int) -> Page:
    page = db.query(Page).filter(Page.id == page_id, Page.portal_id == tenant_id).first()
    if page is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Страница не найдена в текущем tenant",
        )
    return page


def _normalize_link_url(url: str) -> str:
    normalized = url.strip()
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Для вкладки-ссылки URL обязателен",
        )
    parsed = urlparse(normalized)
    if parsed.scheme in {"http", "https"}:
        return normalized
    if normalized.startswith("/"):
        return normalized
    return f"https://{normalized}"


def _normalize_tab_type(tab_type: str | None) -> str:
    value = str(tab_type or "object").strip().lower()
    if value not in WORKSPACE_TAB_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Неподдерживаемый тип вкладки",
        )
    return value


def _resolve_object_type_or_422(
    db: Session,
    *,
    tenant_id: int,
    object_type_id,
) -> DesignerObjectType:
    object_type = (
        db.query(DesignerObjectType)
        .filter(
            DesignerObjectType.id == object_type_id,
            DesignerObjectType.tenant_id == tenant_id,
            DesignerObjectType.deleted_at.is_(None),
        )
        .first()
    )
    if object_type is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Тип объекта не найден в текущем tenant",
        )
    return object_type


def _resolve_object_view_or_422(
    db: Session,
    *,
    tenant_id: int,
    object_type_id,
    object_view_id,
) -> DesignerViewDefinition:
    view = (
        db.query(DesignerViewDefinition)
        .filter(
            DesignerViewDefinition.id == object_view_id,
            DesignerViewDefinition.tenant_id == tenant_id,
            DesignerViewDefinition.object_type_id == object_type_id,
            DesignerViewDefinition.deleted_at.is_(None),
            DesignerViewDefinition.is_active.is_(True),
        )
        .first()
    )
    if view is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Вкладка объекта не найдена, неактивна или не принадлежит выбранному типу объекта",
        )
    return view


def _resolve_object_tab_binding_or_422(
    db: Session,
    *,
    tenant_id: int,
    object_type_id,
    object_view_id,
) -> tuple[DesignerObjectType, DesignerViewDefinition]:
    object_type = _resolve_object_type_or_422(
        db,
        tenant_id=tenant_id,
        object_type_id=object_type_id,
    )
    if object_view_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Для вкладки типа object требуется object_view_id",
        )
    object_view = _resolve_object_view_or_422(
        db,
        tenant_id=tenant_id,
        object_type_id=object_type.id,
        object_view_id=object_view_id,
    )
    return object_type, object_view


def _tab_to_read(
    tab: DesignerWorkspaceTab,
    object_type: DesignerObjectType | None = None,
    object_view: DesignerViewDefinition | None = None,
    target_label: str | None = None,
) -> WorkspaceTabRead:
    return WorkspaceTabRead(
        id=tab.id,
        tenant_id=tab.tenant_id,
        workspace_id=tab.workspace_id,
        title=tab.title,
        description=tab.description,
        slug=tab.slug,
        icon=tab.icon,
        sort_order=tab.sort_order,
        is_system=tab.is_system,
        is_visible=tab.is_visible,
        slug_is_manual=bool(tab.slug_is_manual),
        tab_type=str(tab.tab_type or "object"),
        object_type_id=tab.object_type_id,
        object_type_key=object_type.key if object_type is not None else None,
        object_type_name=object_type.name if object_type is not None else None,
        object_view_id=tab.object_view_id,
        object_view_key=object_view.key if object_view is not None else None,
        object_view_name=object_view.name if object_view is not None else None,
        target_type=tab.target_type,
        target_id=tab.target_id,
        target_label=target_label,
        url=tab.url,
        open_in_new_tab=bool(tab.open_in_new_tab),
        created_at=tab.created_at,
        updated_at=tab.updated_at,
    )


def _list_workspace_tabs_with_objects(db: Session, *, workspace_id: int) -> list[tuple[DesignerWorkspaceTab, DesignerObjectType | None]]:
    return (
        db.query(DesignerWorkspaceTab, DesignerObjectType)
        .outerjoin(
            DesignerObjectType,
            cast(DesignerObjectType.id, String) == cast(DesignerWorkspaceTab.object_type_id, String),
        )
        .filter(
            DesignerWorkspaceTab.workspace_id == workspace_id,
            DesignerWorkspaceTab.deleted_at.is_(None),
        )
        .order_by(DesignerWorkspaceTab.sort_order.asc(), DesignerWorkspaceTab.id.asc())
        .all()
    )


def _build_workspace_tab_reads(
    db: Session,
    *,
    workspace_id: int,
) -> list[WorkspaceTabRead]:
    rows = _list_workspace_tabs_with_objects(db, workspace_id=workspace_id)
    page_ids: set[int] = set()
    for tab, _ in rows:
        if str(tab.tab_type or "") == "page" and str(tab.target_id or "").isdigit():
            page_ids.add(int(str(tab.target_id)))

    page_titles: dict[str, str] = {}
    if page_ids:
        for page in db.query(Page).filter(Page.id.in_(page_ids)).all():
            page_titles[str(page.id)] = page.title

    view_ids = {tab.object_view_id for tab, _ in rows if tab.object_view_id is not None}
    views_by_id: dict = {}
    if view_ids:
        for view in (
            db.query(DesignerViewDefinition)
            .filter(DesignerViewDefinition.id.in_(view_ids))
            .all()
        ):
            views_by_id[view.id] = view

    result: list[WorkspaceTabRead] = []
    for tab, obj in rows:
        target_label = None
        if str(tab.tab_type or "") == "object":
            view = views_by_id.get(tab.object_view_id)
            if view is not None:
                target_label = f"{obj.name if obj is not None else 'Объект'} · {view.name}"
            else:
                target_label = obj.name if obj is not None else None
        elif str(tab.tab_type or "") == "page":
            target_label = page_titles.get(str(tab.target_id or ""))
        result.append(
            _tab_to_read(
                tab,
                obj,
                views_by_id.get(tab.object_view_id),
                target_label,
            )
        )
    return result


def _get_tab_or_404(db: Session, *, workspace_id: int, tab_id: int) -> DesignerWorkspaceTab:
    tab = (
        db.query(DesignerWorkspaceTab)
        .filter(DesignerWorkspaceTab.id == tab_id, DesignerWorkspaceTab.workspace_id == workspace_id)
        .first()
    )
    if tab is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Вкладка пространства не найдена")
    return tab


def ensure_workspace_home_tab(
    db: Session,
    *,
    tenant_id: int,
    workspace_id: int,
) -> DesignerWorkspaceTab:
    workspace = _get_workspace_or_404(db, tenant_id=tenant_id, workspace_id=workspace_id)
    home_tab = (
        db.query(DesignerWorkspaceTab)
        .filter(
            DesignerWorkspaceTab.workspace_id == workspace.id,
            DesignerWorkspaceTab.is_system.is_(True),
            DesignerWorkspaceTab.slug == "home",
        )
        .first()
    )
    if home_tab is not None:
        changed = False
        if home_tab.title != "Главная":
            home_tab.title = "Главная"
            changed = True
        if home_tab.sort_order != 0:
            home_tab.sort_order = 0
            changed = True
        if not home_tab.is_visible:
            home_tab.is_visible = True
            changed = True
        if home_tab.object_type_id is not None:
            home_tab.object_type_id = None
            changed = True
        if str(home_tab.tab_type or "") != "page":
            home_tab.tab_type = "page"
            changed = True
        if home_tab.target_type != "page":
            home_tab.target_type = "page"
            changed = True
        expected_target_id = str(workspace.home_page_id) if workspace.home_page_id is not None else None
        if home_tab.target_id != expected_target_id:
            home_tab.target_id = expected_target_id
            changed = True
        if home_tab.url is not None:
            home_tab.url = None
            changed = True
        if changed:
            db.flush()
        return home_tab

    home_tab = DesignerWorkspaceTab(
        tenant_id=workspace.tenant_id,
        workspace_id=workspace.id,
        title="Главная",
        description=None,
        slug="home",
        icon="home",
        sort_order=0,
        is_system=True,
        is_visible=True,
        slug_is_manual=False,
        tab_type="page",
        target_type="page",
        target_id=str(workspace.home_page_id) if workspace.home_page_id is not None else None,
        url=None,
        open_in_new_tab=False,
        object_type_id=None,
    )
    db.add(home_tab)
    db.flush()
    return home_tab


def ensure_workspace_tabs(
    db: Session,
    *,
    tenant_id: int,
    workspace_id: int,
) -> list[WorkspaceTabRead]:
    workspace = _get_workspace_or_404(db, tenant_id=tenant_id, workspace_id=workspace_id)
    changed = False
    if workspace.home_page_id is None:
        ensure_workspace_home_page(db, tenant_id=tenant_id, workspace_id=workspace_id)
        workspace = _get_workspace_or_404(db, tenant_id=tenant_id, workspace_id=workspace_id)
        changed = True
    elif workspace.home_page_id is not None:
        page = (
            db.query(Page)
            .filter(Page.id == workspace.home_page_id, Page.portal_id == tenant_id)
            .first()
        )
        if page is not None and _ensure_home_page_default_section(
            db, page=page, section_title=workspace.title
        ):
            changed = True
    before_count = db.query(DesignerWorkspaceTab.id).filter(DesignerWorkspaceTab.workspace_id == workspace_id).count()
    ensure_workspace_home_tab(db, tenant_id=tenant_id, workspace_id=workspace_id)
    after_count = db.query(DesignerWorkspaceTab.id).filter(DesignerWorkspaceTab.workspace_id == workspace_id).count()
    changed = changed or after_count > before_count
    if changed:
        db.commit()
    return _build_workspace_tab_reads(db, workspace_id=workspace_id)


def _ensure_home_page_default_section(
    db: Session,
    *,
    page: Page,
    section_title: str,
) -> bool:
    has_section = (
        db.query(Section.id)
        .filter(Section.page_id == page.id)
        .limit(1)
        .first()
    )
    if has_section is not None:
        return False

    db.add(
        Section(
            page_id=page.id,
            title=(section_title or page.title or "Главная").strip() or "Главная",
            description=None,
            layout="one_column",
            sort_order=0,
            is_visible=True,
            settings={},
        )
    )
    db.flush()
    return True


def _create_workspace_home_page(
    db: Session,
    *,
    tenant_id: int,
    title: str,
    description: str | None,
    sort_order: int,
) -> Page:
    page = Page(
        portal_id=tenant_id,
        title=title.strip(),
        description=(description or "").strip() or None,
        status="draft",
        is_home=False,
        is_visible=True,
        sort_order=sort_order,
    )
    db.add(page)
    db.flush()
    _ensure_home_page_default_section(db, page=page, section_title=title)
    return page


def ensure_workspace_home_page(
    db: Session,
    *,
    tenant_id: int,
    workspace_id: int,
) -> DesignerWorkspace:
    workspace = _get_workspace_or_404(db, tenant_id=tenant_id, workspace_id=workspace_id)
    if workspace.home_page_id is not None:
        page = db.query(Page).filter(Page.id == workspace.home_page_id, Page.portal_id == tenant_id).first()
        if page is not None:
            if _ensure_home_page_default_section(db, page=page, section_title=workspace.title):
                db.commit()
                db.refresh(workspace)
            return workspace

    page = _create_workspace_home_page(
        db,
        tenant_id=tenant_id,
        title=workspace.title,
        description=workspace.description,
        sort_order=workspace.sort_order,
    )
    workspace.home_page_id = page.id
    ensure_workspace_home_tab(db, tenant_id=tenant_id, workspace_id=workspace.id)

    if workspace.navigation_item_id is not None:
        nav_item = db.query(NavigationItem).filter(NavigationItem.id == workspace.navigation_item_id).first()
        if nav_item is not None:
            nav_item.url = (
                _workspace_runtime_route(tenant_id=tenant_id, slug=workspace.slug)
                if nav_item.menu_scope == RUNTIME_MENU_SCOPE
                else _workspace_route(tenant_id=tenant_id, slug=workspace.slug)
            )
    for placement_item in list_workspace_placements(db, tenant_id=tenant_id, workspace_id=workspace.id):
        placement_item.url = (
            _workspace_runtime_route(tenant_id=tenant_id, slug=workspace.slug)
            if placement_item.menu_scope == RUNTIME_MENU_SCOPE
            else _workspace_route(tenant_id=tenant_id, slug=workspace.slug)
        )

    db.commit()
    db.refresh(workspace)
    return workspace


def list_workspaces(db: Session, *, tenant_id: int) -> list[DesignerWorkspace]:
    return (
        db.query(DesignerWorkspace)
        .filter(
            DesignerWorkspace.tenant_id == tenant_id,
            DesignerWorkspace.deleted_at.is_(None),
        )
        .order_by(DesignerWorkspace.sort_order.asc(), DesignerWorkspace.id.asc())
        .all()
    )


def list_workspace_placements(
    db: Session,
    *,
    tenant_id: int,
    workspace_id: int,
) -> list[NavigationItem]:
    prefix = f"designer.workspace.{workspace_id}."
    return (
        db.query(NavigationItem)
        .filter(NavigationItem.portal_id == tenant_id)
        .filter(NavigationItem.type == "workspace")
        .filter(NavigationItem.system_key.like(f"{prefix}%"))
        .order_by(NavigationItem.menu_scope.asc(), NavigationItem.sort_order.asc(), NavigationItem.id.asc())
        .all()
    )


def get_workspace_by_slug(db: Session, *, tenant_id: int, slug: str) -> DesignerWorkspace | None:
    workspace = (
        db.query(DesignerWorkspace)
        .filter(DesignerWorkspace.tenant_id == tenant_id, DesignerWorkspace.slug == slug)
        .first()
    )
    if workspace is None:
        return None
    if workspace.home_page_id is None:
        return ensure_workspace_home_page(db, tenant_id=tenant_id, workspace_id=workspace.id)

    page = db.query(Page).filter(Page.id == workspace.home_page_id, Page.portal_id == tenant_id).first()
    if page is not None and _ensure_home_page_default_section(db, page=page, section_title=workspace.title):
        db.commit()
        db.refresh(workspace)
    return workspace


def _get_workspace_or_404(db: Session, *, tenant_id: int, workspace_id: int) -> DesignerWorkspace:
    workspace = (
        db.query(DesignerWorkspace)
        .filter(DesignerWorkspace.id == workspace_id, DesignerWorkspace.tenant_id == tenant_id)
        .first()
    )
    if workspace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пространство не найдено")
    return workspace


def _resolve_unique_slug(
    db: Session,
    *,
    tenant_id: int,
    base_value: str,
    exclude_workspace_id: int | None = None,
) -> str:
    base_slug = _slugify(base_value)
    if not base_slug:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Не удалось сформировать slug. Укажите slug латиницей.",
        )

    slug = base_slug
    suffix = 2
    while True:
        query = db.query(DesignerWorkspace.id).filter(
            DesignerWorkspace.tenant_id == tenant_id,
            DesignerWorkspace.slug == slug,
        )
        if exclude_workspace_id is not None:
            query = query.filter(DesignerWorkspace.id != exclude_workspace_id)
        if query.first() is None:
            return slug
        slug = f"{base_slug}-{suffix}"
        suffix += 1


def create_workspace(
    db: Session,
    *,
    tenant_id: int,
    payload: DesignerWorkspaceCreate,
) -> DesignerWorkspace:
    slug = _resolve_unique_slug(db, tenant_id=tenant_id, base_value=(payload.slug or payload.title))

    workspace = DesignerWorkspace(
        tenant_id=tenant_id,
        title=payload.title.strip(),
        description=(payload.description or "").strip() or None,
        slug=slug,
        status=payload.status,
        icon=payload.icon,
        sort_order=payload.sort_order,
        navigation_item_id=None,
        home_page_id=None,
    )
    db.add(workspace)
    db.flush()
    page = _create_workspace_home_page(
        db,
        tenant_id=tenant_id,
        title=workspace.title,
        description=workspace.description,
        sort_order=workspace.sort_order,
    )
    workspace.home_page_id = page.id
    ensure_workspace_home_tab(db, tenant_id=tenant_id, workspace_id=workspace.id)
    db.commit()
    db.refresh(workspace)
    return workspace


def update_workspace(
    db: Session,
    *,
    tenant_id: int,
    workspace_id: int,
    payload: DesignerWorkspaceUpdate,
) -> DesignerWorkspace:
    workspace = _get_workspace_or_404(db, tenant_id=tenant_id, workspace_id=workspace_id)
    next_slug = _resolve_unique_slug(
        db,
        tenant_id=tenant_id,
        base_value=(payload.slug or payload.title),
        exclude_workspace_id=workspace_id,
    )
    workspace.title = payload.title.strip()
    workspace.description = (payload.description or "").strip() or None
    workspace.slug = next_slug
    workspace.status = payload.status
    workspace.icon = (payload.icon or "").strip() or None
    workspace.sort_order = payload.sort_order
    if workspace.home_page_id is not None:
        page = db.query(Page).filter(Page.id == workspace.home_page_id, Page.portal_id == tenant_id).first()
        if page is not None:
            page.title = workspace.title
            page.description = workspace.description
            page.sort_order = workspace.sort_order

    if workspace.navigation_item_id is not None:
        nav_item = db.query(NavigationItem).filter(NavigationItem.id == workspace.navigation_item_id).first()
        if nav_item is not None:
            nav_item.title = workspace.title
            if nav_item.menu_scope == RUNTIME_MENU_SCOPE:
                nav_item.url = _workspace_runtime_route(tenant_id=tenant_id, slug=workspace.slug)
            else:
                nav_item.url = _workspace_route(tenant_id=tenant_id, slug=next_slug)
            nav_item.sort_order = payload.sort_order
            nav_item.icon = workspace.icon
            nav_item.is_visible = payload.status == "active"

    db.commit()
    db.refresh(workspace)
    return workspace


def publish_workspace(
    db: Session,
    *,
    tenant_id: int,
    workspace_id: int,
) -> DesignerWorkspace:
    workspace = _get_workspace_or_404(db, tenant_id=tenant_id, workspace_id=workspace_id)
    if workspace.home_page_id is None:
        workspace = ensure_workspace_home_page(db, tenant_id=tenant_id, workspace_id=workspace_id)

    placements = publish_workspace_menu_placements(
        db,
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        placements=[
            MenuPlacementInput(
                menu_scope=DESIGNER_MENU_SCOPE,
                parent_id=None,
                sort_order=workspace.sort_order,
                is_visible=workspace.status == "active",
            )
        ],
    )
    workspace.navigation_item_id = placements[0].navigation_item_id if placements else None
    db.commit()
    db.refresh(workspace)
    return workspace


def publish_workspace_menu_placements(
    db: Session,
    *,
    tenant_id: int,
    workspace_id: int,
    placements: list[MenuPlacementInput],
) -> list[WorkspaceMenuPlacementResult]:
    workspace = _get_workspace_or_404(db, tenant_id=tenant_id, workspace_id=workspace_id)
    if workspace.home_page_id is None:
        workspace = ensure_workspace_home_page(db, tenant_id=tenant_id, workspace_id=workspace_id)
    results: list[WorkspaceMenuPlacementResult] = []
    for placement in placements:
        if placement.parent_id is not None:
            parent = db.query(NavigationItem).filter(NavigationItem.id == placement.parent_id).first()
            if parent is None or parent.portal_id != tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Родительский пункт меню не найден",
                )
            if placement.menu_scope == DESIGNER_MENU_SCOPE and parent.menu_scope != DESIGNER_MENU_SCOPE:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Родитель должен быть в меню Студии (designer)",
                )
            if placement.menu_scope == RUNTIME_MENU_SCOPE and parent.menu_scope == DESIGNER_MENU_SCOPE:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Родитель должен быть в меню Офиса (runtime)",
                )

        system_key = _workspace_system_key(workspace_id, placement.menu_scope)
        nav_item = (
            db.query(NavigationItem)
            .filter(NavigationItem.portal_id == tenant_id)
            .filter(NavigationItem.system_key == system_key)
            .first()
        )
        if nav_item is None:
            placement_url = (
                _workspace_runtime_route(tenant_id=tenant_id, slug=workspace.slug)
                if placement.menu_scope == RUNTIME_MENU_SCOPE
                else _workspace_route(tenant_id=tenant_id, slug=workspace.slug)
            )
            nav_item = NavigationItem(
                portal_id=tenant_id,
                parent_id=placement.parent_id,
                type="workspace",
                title=workspace.title,
                url=placement_url,
                sort_order=placement.sort_order,
                is_visible=placement.is_visible and workspace.status == "active",
                icon=workspace.icon,
                icon_type=None,
                icon_file_url=None,
                color=None,
                is_bold=False,
                is_italic=False,
                menu_scope=placement.menu_scope,
                system_key=system_key,
                is_system=False,
                is_protected=False,
            )
            db.add(nav_item)
            db.flush()
        else:
            nav_item.parent_id = placement.parent_id
            nav_item.sort_order = placement.sort_order
            nav_item.is_visible = placement.is_visible and workspace.status == "active"
            nav_item.title = workspace.title
            nav_item.url = (
                _workspace_runtime_route(tenant_id=tenant_id, slug=workspace.slug)
                if placement.menu_scope == RUNTIME_MENU_SCOPE
                else _workspace_route(tenant_id=tenant_id, slug=workspace.slug)
            )
            nav_item.icon = workspace.icon

        results.append(
            WorkspaceMenuPlacementResult(
                navigation_item_id=nav_item.id,
                menu_scope=nav_item.menu_scope,
                parent_id=nav_item.parent_id,
                sort_order=nav_item.sort_order,
                is_visible=nav_item.is_visible,
                url=nav_item.url,
            )
        )
    preferred = next((item for item in results if item.menu_scope == DESIGNER_MENU_SCOPE), None)
    workspace.navigation_item_id = preferred.navigation_item_id if preferred else (results[0].navigation_item_id if results else None)
    db.commit()
    return results


def unpublish_workspace(
    db: Session,
    *,
    tenant_id: int,
    workspace_id: int,
) -> DesignerWorkspace:
    workspace = _get_workspace_or_404(db, tenant_id=tenant_id, workspace_id=workspace_id)
    placements = list_workspace_placements(db, tenant_id=tenant_id, workspace_id=workspace_id)
    if placements:
        for nav_item in placements:
            db.delete(nav_item)
        workspace.navigation_item_id = None
        db.commit()
        db.refresh(workspace)
    return workspace


def archive_workspace(
    db: Session,
    *,
    tenant_id: int,
    workspace_id: int,
) -> DesignerWorkspace:
    workspace = _get_workspace_or_404(db, tenant_id=tenant_id, workspace_id=workspace_id)
    workspace.status = "archived"
    for nav_item in list_workspace_placements(db, tenant_id=tenant_id, workspace_id=workspace_id):
        nav_item.is_visible = False
    db.commit()
    db.refresh(workspace)
    return workspace


def delete_workspace(
    db: Session,
    *,
    tenant_id: int,
    workspace_id: int,
    deleted_by: int | None = None,
) -> None:
    from app.modules.platform.designer.shared.soft_delete import apply_soft_delete

    workspace = _get_workspace_or_404(db, tenant_id=tenant_id, workspace_id=workspace_id)
    for nav_item in list_workspace_placements(db, tenant_id=tenant_id, workspace_id=workspace_id):
        if nav_item.deleted_at is None:
            apply_soft_delete(nav_item, deleted_by=deleted_by)
    tabs = (
        db.query(DesignerWorkspaceTab)
        .filter(
            DesignerWorkspaceTab.workspace_id == workspace_id,
            DesignerWorkspaceTab.deleted_at.is_(None),
        )
        .all()
    )
    for tab in tabs:
        apply_soft_delete(tab, deleted_by=deleted_by)
    apply_soft_delete(workspace, deleted_by=deleted_by)
    db.commit()


def _filter_workspace_tabs_for_user_menu(
    db: Session,
    tabs: list[WorkspaceTabRead],
) -> list[WorkspaceTabRead]:
    from app.modules.pages.models import Page
    from app.modules.pages.runtime_access import is_page_visible_in_office_navigation, normalize_page_status

    page_ids: set[int] = set()
    for tab in tabs:
        if str(tab.tab_type or "") != "page":
            continue
        target_id = str(tab.target_id or "").strip()
        if target_id.isdigit():
            page_ids.add(int(target_id))

    page_status_map: dict[int, str] = {}
    if page_ids:
        rows = (
            db.query(Page.id, Page.status)
            .filter(Page.id.in_(page_ids), Page.deleted_at.is_(None))
            .all()
        )
        page_status_map = {
            int(page_id): normalize_page_status(status) for page_id, status in rows
        }

    filtered: list[WorkspaceTabRead] = []
    for tab in tabs:
        if tab.is_visible is False:
            continue
        if str(tab.tab_type or "") != "page":
            filtered.append(tab)
            continue
        target_id = str(tab.target_id or "").strip()
        if not target_id.isdigit():
            continue
        page_status = page_status_map.get(int(target_id), "draft")
        if is_page_visible_in_office_navigation(page_status):
            filtered.append(tab)
    return filtered


def list_workspace_tabs(
    db: Session,
    *,
    tenant_id: int,
    workspace_id: int,
    for_user_menu: bool = False,
) -> list[WorkspaceTabRead]:
    ensure_workspace_tabs(db, tenant_id=tenant_id, workspace_id=workspace_id)
    tabs = _build_workspace_tab_reads(db, workspace_id=workspace_id)
    if for_user_menu:
        return _filter_workspace_tabs_for_user_menu(db, tabs)
    return tabs


def create_workspace_tab(
    db: Session,
    *,
    tenant_id: int,
    workspace_id: int,
    payload: WorkspaceTabCreate,
) -> WorkspaceTabRead:
    workspace = _get_workspace_or_404(db, tenant_id=tenant_id, workspace_id=workspace_id)
    try:
        tab_type = _normalize_tab_type(payload.tab_type)
        slug = _workspace_tab_slug(
            db,
            workspace_id=workspace_id,
            base_value=(payload.slug or payload.title),
        )
        object_type = None
        target_type = payload.target_type
        target_id = (payload.target_id or "").strip() or None
        url = None
        target_label = None

        object_type_id = None
        object_view_id = None
        if tab_type == "object":
            if payload.object_type_id is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Для вкладки типа object требуется object_type_id",
                )
            object_type, object_view = _resolve_object_tab_binding_or_422(
                db,
                tenant_id=tenant_id,
                object_type_id=payload.object_type_id,
                object_view_id=payload.object_view_id,
            )
            object_type_id = object_type.id
            object_view_id = object_view.id
            target_type = "object"
            target_id = str(object_view.id)
            target_label = f"{object_type.name} · {object_view.name}"
        elif tab_type == "page":
            if payload.create_new_page:
                new_page_title = (payload.new_page_title or payload.title or "").strip()
                if not new_page_title:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Для новой страницы требуется название",
                    )
                page = Page(
                    portal_id=tenant_id,
                    title=new_page_title,
                    description=(payload.description or "").strip() or None,
                    status="draft",
                    is_home=False,
                    is_visible=True,
                    sort_order=payload.sort_order,
                )
                db.add(page)
                db.flush()
                target_id = str(page.id)
                target_label = page.title
            if not target_id or not target_id.isdigit():
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Для вкладки типа page требуется target_id страницы",
                )
            page = _resolve_page_or_422(db, tenant_id=tenant_id, page_id=int(target_id))
            target_label = page.title
            target_type = "page"
        elif tab_type == "link":
            url = _normalize_link_url(payload.url or "")
            target_type = "url"
            target_id = None
        elif tab_type == "group":
            target_type = "group"
            target_id = None
        else:
            target_type = tab_type

        tab = DesignerWorkspaceTab(
            tenant_id=workspace.tenant_id,
            workspace_id=workspace.id,
            title=payload.title.strip(),
            description=(payload.description or "").strip() or None,
            slug=slug,
            slug_is_manual=bool(payload.slug),
            icon=(payload.icon or "").strip() or None,
            sort_order=payload.sort_order,
            is_system=False,
            is_visible=payload.is_visible,
            object_type_id=object_type_id,
            object_view_id=object_view_id,
            tab_type=tab_type,
            target_type=target_type,
            target_id=target_id,
            url=url,
            open_in_new_tab=bool(payload.open_in_new_tab),
        )
        db.add(tab)
        db.commit()
        db.refresh(tab)
        object_view = (
            db.query(DesignerViewDefinition)
            .filter(DesignerViewDefinition.id == tab.object_view_id)
            .first()
            if tab.object_view_id is not None
            else None
        )
        return _tab_to_read(tab, object_type, object_view, target_label)
    except Exception:
        db.rollback()
        raise


def update_workspace_tab(
    db: Session,
    *,
    tenant_id: int,
    workspace_id: int,
    tab_id: int,
    payload: WorkspaceTabUpdate,
) -> WorkspaceTabRead:
    _get_workspace_or_404(db, tenant_id=tenant_id, workspace_id=workspace_id)
    tab = _get_tab_or_404(db, workspace_id=workspace_id, tab_id=tab_id)
    if tab.is_system:
        if payload.tab_type is not None and payload.tab_type != "page":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Системная вкладка может быть только типа page",
            )
    next_tab_type = _normalize_tab_type(payload.tab_type or tab.tab_type or "object")

    if payload.title is not None:
        tab.title = payload.title.strip()
    if payload.description is not None:
        tab.description = payload.description.strip() or None
    if payload.icon is not None:
        tab.icon = payload.icon.strip() or None
    if payload.sort_order is not None:
        tab.sort_order = payload.sort_order
    if payload.is_visible is not None:
        tab.is_visible = payload.is_visible
    if payload.slug is not None:
        tab.slug = _workspace_tab_slug(
            db,
            workspace_id=workspace_id,
            base_value=(payload.slug or tab.title),
            exclude_tab_id=tab.id,
        )
        tab.slug_is_manual = bool(payload.slug and payload.slug.strip())
    elif not tab.slug_is_manual and payload.title is not None:
        tab.slug = _workspace_tab_slug(
            db,
            workspace_id=workspace_id,
            base_value=tab.title,
            exclude_tab_id=tab.id,
        )

    tab.tab_type = next_tab_type

    next_object_type_id = tab.object_type_id
    next_object_view_id = tab.object_view_id
    next_target_type = payload.target_type if payload.target_type is not None else tab.target_type
    next_target_id = (payload.target_id if payload.target_id is not None else tab.target_id) or None
    next_url = (payload.url if payload.url is not None else tab.url) or None
    next_open_in_new_tab = bool(payload.open_in_new_tab) if payload.open_in_new_tab is not None else bool(tab.open_in_new_tab)

    if next_tab_type == "object":
        resolved_object_type_id = (
            payload.object_type_id if payload.object_type_id is not None else next_object_type_id
        )
        resolved_object_view_id = (
            payload.object_view_id if payload.object_view_id is not None else next_object_view_id
        )
        if resolved_object_type_id is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Для вкладки типа object требуется object_type_id",
            )
        object_type, object_view = _resolve_object_tab_binding_or_422(
            db,
            tenant_id=tenant_id,
            object_type_id=resolved_object_type_id,
            object_view_id=resolved_object_view_id,
        )
        next_object_type_id = object_type.id
        next_object_view_id = object_view.id
        next_target_id = str(object_view.id)
        next_target_type = "object"
        next_url = None
    elif next_tab_type == "page":
        if next_target_id is None or not str(next_target_id).isdigit():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Для вкладки типа page требуется target_id страницы",
            )
        _resolve_page_or_422(db, tenant_id=tenant_id, page_id=int(str(next_target_id)))
        next_object_type_id = None
        next_object_view_id = None
        next_target_type = "page"
        next_url = None
    elif next_tab_type == "link":
        next_object_type_id = None
        next_object_view_id = None
        next_target_id = None
        next_target_type = "url"
        next_url = _normalize_link_url(str(next_url or ""))
    elif next_tab_type == "group":
        next_object_type_id = None
        next_object_view_id = None
        next_target_id = None
        next_target_type = "group"
        next_url = None
    else:
        next_object_type_id = None
        next_object_view_id = None
        next_target_type = next_target_type or next_tab_type

    tab.object_type_id = next_object_type_id
    tab.object_view_id = next_object_view_id
    tab.target_type = next_target_type
    tab.target_id = str(next_target_id) if next_target_id is not None else None
    tab.url = next_url
    tab.open_in_new_tab = next_open_in_new_tab

    db.commit()
    db.refresh(tab)
    object_type = None
    object_view = None
    if tab.object_type_id is not None:
        object_type = (
            db.query(DesignerObjectType)
            .filter(
                cast(DesignerObjectType.id, String) == str(tab.object_type_id),
                DesignerObjectType.deleted_at.is_(None),
            )
            .first()
        )
    if tab.object_view_id is not None:
        object_view = (
            db.query(DesignerViewDefinition)
            .filter(DesignerViewDefinition.id == tab.object_view_id)
            .first()
        )
    target_label = None
    if tab.tab_type == "object":
        if object_type is not None and object_view is not None:
            target_label = f"{object_type.name} · {object_view.name}"
        else:
            target_label = object_type.name if object_type is not None else None
    elif tab.tab_type == "page" and str(tab.target_id or "").isdigit():
        page = db.query(Page).filter(Page.id == int(str(tab.target_id))).first()
        target_label = page.title if page is not None else None
    return _tab_to_read(tab, object_type, object_view, target_label)


def delete_workspace_tab(
    db: Session,
    *,
    tenant_id: int,
    workspace_id: int,
    tab_id: int,
    deleted_by: int | None = None,
) -> None:
    from app.modules.platform.designer.shared.soft_delete import apply_soft_delete

    _get_workspace_or_404(db, tenant_id=tenant_id, workspace_id=workspace_id)
    tab = _get_tab_or_404(db, workspace_id=workspace_id, tab_id=tab_id)
    if tab.is_system:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Системную вкладку удалить нельзя",
        )
    apply_soft_delete(tab, deleted_by=deleted_by)
    db.commit()

