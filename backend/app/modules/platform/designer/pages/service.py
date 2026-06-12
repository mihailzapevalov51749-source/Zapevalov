"""Page registry for Studio — read-only aggregation over pages, workspaces, navigation, blocks."""

from __future__ import annotations

import copy
import re
from collections import defaultdict
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.blocks.models import Block
from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.pages.protected_pages import is_protected_page
from app.modules.pages.runtime_access import (
    PAGE_STATUS_PUBLISHED,
    normalize_page_status,
)
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.pages.schemas import PageCreate
from app.modules.pages import service as pages_service
from app.modules.sections.models import Section
from app.modules.platform.designer.pages.schemas import (
    PageBlockSummaryRead,
    PageBulkDeleteResponse,
    PageBulkDeleteSkippedItem,
    PageDuplicateResponse,
    PageRegistryDetailRead,
    PageRegistryExtensionsRead,
    PageRegistryListItemRead,
    PageRegistryListResponse,
    PageUsageRead,
)
from app.modules.platform.designer.workspaces.models import (
    DesignerWorkspace,
    DesignerWorkspaceTab,
)

_BLOCK_TYPE_LABELS: dict[str, str] = {
    "text": "Текст",
    "image": "Изображение",
    "document": "Документ",
    "documents": "Документы",
    "link": "Ссылка",
    "button": "Кнопка",
    "cards": "Карточки",
    "admin_dashboard": "Dashboard",
    "admin_system": "Настройка системы",
    "table": "Таблица (legacy)",
    "universal_table": "Таблица объектов",
    "tableBlock": "Таблица",
    "table_block": "Таблица",
}

_STATUS_LABELS = {
    "draft": "Черновик",
    "published": "Опубликована",
    "hidden": "Скрыта",
}


def _status_label(status: str | None) -> str:
    key = (status or "draft").strip().lower()
    return _STATUS_LABELS.get(key, key)


def _page_slug(page_id: int, navigation_urls: list[str]) -> str:
    for url in navigation_urls:
        text = str(url or "").strip()
        if not text:
            continue
        slug = text.rstrip("/").split("/")[-1]
        if slug and slug.isdigit() and int(slug) == page_id:
            continue
        if slug:
            return slug
    return f"page-{page_id}"


def _block_label(block_type: str, title: str | None) -> str:
    base = _BLOCK_TYPE_LABELS.get(block_type, "Блок")
    cleaned = str(title or "").strip()
    return cleaned or base


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _pick_int(*values: Any) -> int | None:
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        if text.isdigit():
            return int(text)
    return None


def _pick_str(*values: Any) -> str | None:
    for value in values:
        text = str(value or "").strip()
        if text:
            return text
    return None


_DESIGNER_MENU_SCOPE = "designer"


def _contour_label(menu_scope: str | None) -> str:
    if str(menu_scope or "").strip().lower() == _DESIGNER_MENU_SCOPE:
        return "Студия"
    return "Офис"


def _page_is_published(page: Page | None) -> bool:
    if page is None:
        return False
    return normalize_page_status(page.status) == PAGE_STATUS_PUBLISHED


def _workspace_is_active(workspace: DesignerWorkspace | None) -> bool:
    if workspace is None:
        return False
    return str(workspace.status or "").strip().lower() == "active"


def _build_publication_path_segments(
    *,
    kind: str,
    workspace_title: str | None,
    tab_title: str | None,
    navigation_item: NavigationItem | None,
    page_title: str,
) -> list[str]:
    if kind == "workspace_home" and workspace_title:
        title = str(workspace_title).strip() or "Рабочее пространство"
        return ["Офис", "Рабочее пространство", title, "Главная страница"]
    if kind == "workspace_tab" and workspace_title:
        title = str(workspace_title).strip() or "Рабочее пространство"
        tab_name = str(tab_title or "").strip() or "Вкладка"
        return ["Офис", "Рабочее пространство", title, "Вкладка", tab_name]
    if kind == "navigation" and navigation_item is not None:
        contour = _contour_label(navigation_item.menu_scope)
        leaf = str(page_title or navigation_item.title or "").strip() or "Страница"
        return [contour, "Навигация", leaf]
    return []


def _resolve_block_presentation(
    db: Session,
    *,
    tenant_id: int,
    block_type: str,
    block_title: str | None,
    content: Any,
    settings: Any,
) -> tuple[str, list[str], list[str]]:
    content_dict = _as_dict(content)
    settings_dict = _as_dict(settings)
    detail_lines: list[str] = []
    related_objects: list[str] = []

    base_label = _BLOCK_TYPE_LABELS.get(block_type, "Блок")
    display_title = base_label

    if block_type in {"universal_table", "table", "tableBlock", "table_block"}:
        display_title = "Таблица объектов (legacy)"

    object_type_key = _pick_str(
        settings_dict.get("object_type_key"),
        settings_dict.get("objectTypeKey"),
        content_dict.get("object_type_key"),
        content_dict.get("objectTypeKey"),
    )
    if object_type_key:
        object_type = (
            db.query(DesignerObjectType)
            .filter(
                DesignerObjectType.tenant_id == tenant_id,
                DesignerObjectType.key == object_type_key,
                DesignerObjectType.deleted_at.is_(None),
            )
            .first()
        )
        object_name = object_type.name if object_type is not None else object_type_key
        if object_name not in related_objects:
            related_objects.append(str(object_name))
        if display_title == "Блок" or display_title == base_label:
            display_title = "Таблица объектов"
        detail_lines.append(f"Объект: {object_name}")

        view_key = _pick_str(
            settings_dict.get("view_key"),
            settings_dict.get("viewKey"),
            settings_dict.get("active_view_key"),
            settings_dict.get("activeViewKey"),
        )
        if view_key:
            detail_lines.append(f"Представление: {view_key}")

    cleaned_block_title = str(block_title or "").strip()
    if cleaned_block_title and cleaned_block_title not in related_objects:
        if (
            display_title == base_label
            and cleaned_block_title.casefold() not in {"таблица", "новая таблица"}
            and not cleaned_block_title.casefold().startswith("таблица ")
        ):
            detail_lines.insert(0, cleaned_block_title)

    if not detail_lines and cleaned_block_title:
        display_title = cleaned_block_title

    unique_objects: list[str] = []
    seen_objects: set[str] = set()
    for name in related_objects:
        text = str(name).strip()
        if not text or text in seen_objects:
            continue
        seen_objects.add(text)
        unique_objects.append(text)

    return display_title, detail_lines, unique_objects


def _infer_page_type(
    *,
    is_workspace_home: bool,
    block_types: set[str],
) -> str:
    if is_workspace_home:
        return "Главная"
    if "admin_dashboard" in block_types:
        return "Dashboard"
    if block_types & {"universal_table", "table", "tableBlock", "table_block"}:
        return "Таблица объектов"
    if block_types & {"documents", "document"}:
        return "Документы"
    if block_types & {"cards"}:
        return "Карточки"
    return "Страница"


def _append_page_placement(
    target: dict[int, list[PageUsageRead]],
    page_id: int,
    placement: PageUsageRead,
    *,
    include_publication: bool,
) -> None:
    if include_publication:
        target[page_id].append(placement)


def _collect_placement_maps(
    db: Session,
    tenant_id: int,
) -> tuple[
    dict[int, list[PageUsageRead]],
    dict[int, list[PageUsageRead]],
    dict[int, set[str]],
]:
    publications: dict[int, list[PageUsageRead]] = defaultdict(list)
    bindings: dict[int, list[PageUsageRead]] = defaultdict(list)
    home_page_ids: set[int] = set()

    workspaces = (
        db.query(DesignerWorkspace)
        .filter(DesignerWorkspace.tenant_id == tenant_id)
        .order_by(DesignerWorkspace.sort_order.asc(), DesignerWorkspace.id.asc())
        .all()
    )
    workspace_by_id = {workspace.id: workspace for workspace in workspaces}

    pages_by_id = {
        int(page.id): page
        for page in db.query(Page)
        .filter(Page.portal_id == tenant_id, Page.deleted_at.is_(None))
        .all()
    }

    for workspace in workspaces:
        if workspace.home_page_id is None:
            continue
        page_id = int(workspace.home_page_id)
        home_page_ids.add(page_id)
        page = pages_by_id.get(page_id)
        path_segments = _build_publication_path_segments(
            kind="workspace_home",
            workspace_title=workspace.title,
            tab_title=None,
            navigation_item=None,
            page_title=page.title if page is not None else "",
        )
        placement = PageUsageRead(
            kind="workspace_home",
            workspace_id=workspace.id,
            workspace_title=workspace.title,
            workspace_slug=workspace.slug,
            label="Главная страница",
            path_segments=path_segments,
        )
        bindings[page_id].append(placement)
        if _page_is_published(page) and _workspace_is_active(workspace):
            _append_page_placement(publications, page_id, placement, include_publication=True)

    tabs = (
        db.query(DesignerWorkspaceTab)
        .filter(DesignerWorkspaceTab.tenant_id == tenant_id)
        .order_by(DesignerWorkspaceTab.sort_order.asc(), DesignerWorkspaceTab.id.asc())
        .all()
    )
    for tab in tabs:
        if str(tab.tab_type or "") != "page":
            continue
        target_id = str(tab.target_id or "").strip()
        if not target_id.isdigit():
            continue
        page_id = int(target_id)
        workspace = workspace_by_id.get(tab.workspace_id)
        page = pages_by_id.get(page_id)
        path_segments = _build_publication_path_segments(
            kind="workspace_tab",
            workspace_title=workspace.title if workspace else None,
            tab_title=tab.title,
            navigation_item=None,
            page_title=page.title if page is not None else "",
        )
        placement = PageUsageRead(
            kind="workspace_tab",
            workspace_id=tab.workspace_id,
            workspace_title=workspace.title if workspace else None,
            workspace_slug=workspace.slug if workspace else None,
            label=f'Вкладка "{tab.title}"',
            path_segments=path_segments,
        )
        bindings[page_id].append(placement)
        if (
            _page_is_published(page)
            and _workspace_is_active(workspace)
            and tab.is_visible is not False
        ):
            _append_page_placement(publications, page_id, placement, include_publication=True)

    nav_items = (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == tenant_id,
            NavigationItem.page_id.isnot(None),
            NavigationItem.deleted_at.is_(None),
        )
        .order_by(NavigationItem.sort_order.asc(), NavigationItem.id.asc())
        .all()
    )
    for item in nav_items:
        if item.page_id is None:
            continue
        page_id = int(item.page_id)
        page = pages_by_id.get(page_id)
        path_segments = _build_publication_path_segments(
            kind="navigation",
            workspace_title=None,
            tab_title=None,
            navigation_item=item,
            page_title=page.title if page is not None else str(item.title or ""),
        )
        placement = PageUsageRead(
            kind="navigation",
            navigation_item_id=item.id,
            menu_scope=str(item.menu_scope or ""),
            label=f'Навигация "{item.title}"',
            path_segments=path_segments,
        )
        bindings[page_id].append(placement)
        if _page_is_published(page):
            _append_page_placement(publications, page_id, placement, include_publication=True)

    return publications, bindings, home_page_ids


def _collect_block_stats(
    db: Session,
    portal_id: int,
) -> tuple[dict[int, int], dict[int, list[PageBlockSummaryRead]], dict[int, set[str]]]:
    counts: dict[int, int] = defaultdict(int)
    summaries: dict[int, list[PageBlockSummaryRead]] = defaultdict(list)
    block_types_by_page: dict[int, set[str]] = defaultdict(set)

    rows = (
        db.query(
            Section.page_id,
            Block.type,
            Block.title,
            Block.sort_order,
            Block.content,
            Block.settings,
        )
        .join(Block, Block.section_id == Section.id)
        .join(Page, Page.id == Section.page_id)
        .filter(Page.portal_id == portal_id)
        .order_by(Section.sort_order.asc(), Block.sort_order.asc(), Block.id.asc())
        .all()
    )

    for page_id, block_type, block_title, sort_order, content, settings in rows:
        page_key = int(page_id)
        counts[page_key] += 1
        block_types_by_page[page_key].add(str(block_type))
        display_title, detail_lines, related_object_names = _resolve_block_presentation(
            db,
            tenant_id=portal_id,
            block_type=str(block_type),
            block_title=str(block_title or ""),
            content=content,
            settings=settings,
        )
        summaries[page_key].append(
            PageBlockSummaryRead(
                type=str(block_type),
                title=str(block_title or ""),
                label=_block_label(str(block_type), block_title),
                sort_order=int(sort_order or 0),
                display_title=display_title,
                detail_lines=detail_lines,
                related_object_names=related_object_names,
            ),
        )

    return counts, summaries, block_types_by_page


def _unique_paths(paths: list[list[str]]) -> list[list[str]]:
    seen: set[tuple[str, ...]] = set()
    result: list[list[str]] = []
    for path in paths:
        normalized = tuple(segment for segment in path if str(segment).strip())
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        result.append(list(normalized))
    return result


def _collect_related_objects(blocks: list[PageBlockSummaryRead]) -> list[str]:
    names: list[str] = []
    seen: set[str] = set()
    for block in blocks:
        for name in block.related_object_names:
            text = str(name).strip()
            if not text or text in seen:
                continue
            seen.add(text)
            names.append(text)
    return names


def _collect_placement_paths(usages: list[PageUsageRead]) -> list[list[str]]:
    return _unique_paths(
        [usage.path_segments for usage in usages if usage.path_segments],
    )


def _navigation_urls_by_page(db: Session, portal_id: int) -> dict[int, list[str]]:
    result: dict[int, list[str]] = defaultdict(list)
    items = (
        db.query(NavigationItem.page_id, NavigationItem.url)
        .filter(
            NavigationItem.portal_id == portal_id,
            NavigationItem.page_id.isnot(None),
        )
        .all()
    )
    for page_id, url in items:
        if page_id is not None and url:
            result[int(page_id)].append(str(url))
    return result


def _workspace_titles_from_usages(usages: list[PageUsageRead]) -> list[str]:
    titles: list[str] = []
    seen: set[str] = set()
    for usage in usages:
        title = str(usage.workspace_title or "").strip()
        if not title or title in seen:
            continue
        seen.add(title)
        titles.append(title)
    return titles


def _to_list_item(
    db: Session,
    tenant_id: int,
    page: Page,
    *,
    usages: list[PageUsageRead],
    home_page_ids: set[int],
    block_count: int,
    block_types: set[str],
    navigation_urls: list[str],
) -> PageRegistryListItemRead:
    workspace_titles = _workspace_titles_from_usages(usages)
    workspace_label = ", ".join(workspace_titles) if workspace_titles else "—"
    page_id = int(page.id)
    return PageRegistryListItemRead(
        id=page_id,
        portal_id=int(page.portal_id),
        title=page.title,
        description=page.description,
        page_type=_infer_page_type(
            is_workspace_home=page_id in home_page_ids,
            block_types=block_types,
        ),
        slug=_page_slug(page_id, navigation_urls),
        status=(page.status or "draft"),  # type: ignore[arg-type]
        status_label=_status_label(page.status),
        is_home=bool(page.is_home),
        workspace_titles=workspace_titles,
        workspace_label=workspace_label,
        block_count=block_count,
        usage_count=len(usages),
        created_at=page.created_at,
        updated_at=page.updated_at,
        author=None,
        is_protected=is_protected_page(db, tenant_id=tenant_id, page=page),
    )


def list_page_registry(db: Session, tenant_id: int) -> PageRegistryListResponse:
    pages = pages_service.get_pages_by_portal(
        db,
        tenant_id,
        request_portal_id=tenant_id,
    )
    usages_map, _, home_page_ids = _collect_placement_maps(db, tenant_id)
    block_counts, _, block_types_map = _collect_block_stats(db, tenant_id)
    nav_urls_map = _navigation_urls_by_page(db, tenant_id)

    items = [
        _to_list_item(
            db,
            tenant_id,
            page,
            usages=usages_map.get(int(page.id), []),
            home_page_ids=home_page_ids,
            block_count=block_counts.get(int(page.id), 0),
            block_types=block_types_map.get(int(page.id), set()),
            navigation_urls=nav_urls_map.get(int(page.id), []),
        )
        for page in pages
    ]
    return PageRegistryListResponse(items=items)


def get_page_registry_detail(db: Session, tenant_id: int, page_id: int) -> PageRegistryDetailRead:
    page = (
        db.query(Page)
        .filter(
            Page.id == page_id,
            Page.portal_id == tenant_id,
            Page.deleted_at.is_(None),
        )
        .first()
    )
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Страница не найдена")

    usages_map, bindings_map, home_page_ids = _collect_placement_maps(db, tenant_id)
    block_counts, block_summaries, block_types_map = _collect_block_stats(db, tenant_id)
    nav_urls_map = _navigation_urls_by_page(db, tenant_id)

    list_item = _to_list_item(
        db,
        tenant_id,
        page,
        usages=usages_map.get(int(page.id), []),
        home_page_ids=home_page_ids,
        block_count=block_counts.get(int(page.id), 0),
        block_types=block_types_map.get(int(page.id), set()),
        navigation_urls=nav_urls_map.get(int(page.id), []),
    )
    usages = usages_map.get(int(page.id), [])
    page_bindings = bindings_map.get(int(page.id), [])
    blocks = block_summaries.get(int(page.id), [])

    return PageRegistryDetailRead(
        **list_item.model_dump(),
        usages=usages,
        bindings=page_bindings,
        blocks=blocks,
        related_objects=_collect_related_objects(blocks),
        placement_paths=_collect_placement_paths(usages),
        extensions=PageRegistryExtensionsRead(
            usage_map={
                "available": True,
                "items": [usage.model_dump() for usage in usages],
            },
        ),
    )


def _build_bulk_delete_message(
    *,
    deleted_count: int,
    skipped: list[PageBulkDeleteSkippedItem],
) -> str:
    if deleted_count <= 0 and skipped:
        return "Выбраны только системные страницы. Их нельзя удалить."
    if deleted_count > 0 and skipped:
        skipped_titles = ", ".join(item.title for item in skipped)
        return (
            f"Удалено: {deleted_count}. "
            f"Пропущены системные страницы: {skipped_titles}."
        )
    if deleted_count > 0:
        return f"Удалено: {deleted_count}."
    return "Страницы для удаления не найдены."


def bulk_delete_page_registry(
    db: Session,
    tenant_id: int,
    page_ids: list[int],
    *,
    deleted_by: int | None = None,
) -> PageBulkDeleteResponse:
    unique_ids: list[int] = []
    seen: set[int] = set()
    for raw_id in page_ids:
        page_id = int(raw_id)
        if page_id in seen:
            continue
        seen.add(page_id)
        unique_ids.append(page_id)

    if not unique_ids:
        return PageBulkDeleteResponse(
            deleted_count=0,
            deleted_ids=[],
            skipped=[],
            message="Страницы для удаления не найдены.",
        )

    pages = (
        db.query(Page)
        .filter(
            Page.portal_id == tenant_id,
            Page.id.in_(unique_ids),
            Page.deleted_at.is_(None),
        )
        .all()
    )
    pages_by_id = {int(page.id): page for page in pages}

    deleted_ids: list[int] = []
    skipped: list[PageBulkDeleteSkippedItem] = []

    for page_id in unique_ids:
        page = pages_by_id.get(page_id)
        if page is None:
            continue

        if is_protected_page(db, tenant_id=tenant_id, page=page):
            skipped.append(
                PageBulkDeleteSkippedItem(
                    id=page_id,
                    title=str(page.title or f"Страница #{page_id}"),
                ),
            )
            continue

        deleted = pages_service.delete_page(
            db,
            page_id,
            portal_id=tenant_id,
            deleted_by=deleted_by,
        )
        if deleted is not None:
            deleted_ids.append(page_id)

    message = _build_bulk_delete_message(deleted_count=len(deleted_ids), skipped=skipped)
    return PageBulkDeleteResponse(
        deleted_count=len(deleted_ids),
        deleted_ids=deleted_ids,
        skipped=skipped,
        message=message,
    )


def delete_page_registry(
    db: Session,
    tenant_id: int,
    page_id: int,
    *,
    deleted_by: int | None = None,
) -> dict[str, str]:
    page = (
        db.query(Page)
        .filter(
            Page.id == page_id,
            Page.portal_id == tenant_id,
            Page.deleted_at.is_(None),
        )
        .first()
    )
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Страница не найдена")

    deleted = pages_service.delete_page(
        db,
        page_id,
        portal_id=tenant_id,
        deleted_by=deleted_by,
    )
    if deleted is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Страница не найдена")

    return {"message": "Страница перемещена в корзину"}


def duplicate_page_registry(
    db: Session,
    tenant_id: int,
    page_id: int,
) -> PageDuplicateResponse:
    source = (
        db.query(Page)
        .filter(Page.id == page_id, Page.portal_id == tenant_id)
        .first()
    )
    if source is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Страница не найдена")

    full = pages_service.get_page_full(db, page_id, portal_id=tenant_id)
    if full is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Страница не найдена")

    copy_title = _duplicate_title(source.title)
    created = pages_service.create_page(
        db,
        PageCreate(
            portal_id=tenant_id,
            title=copy_title,
            description=source.description,
            status="draft",
            is_home=False,
            is_visible=source.is_visible,
            sort_order=source.sort_order,
        ),
        portal_id=tenant_id,
    )

    for section_bundle in full["sections"]:
        section = section_bundle["section"]
        new_section = Section(
            page_id=created.id,
            title=section.title,
            description=section.description,
            layout=section.layout,
            sort_order=section.sort_order,
            is_visible=section.is_visible,
            settings=copy.deepcopy(section.settings or {}),
        )
        db.add(new_section)
        db.flush()

        for block in section_bundle["blocks"]:
            db.add(
                Block(
                    section_id=new_section.id,
                    type=block.type,
                    title=block.title,
                    description=block.description,
                    sort_order=block.sort_order,
                    is_visible=block.is_visible,
                    status=block.status,
                    settings=copy.deepcopy(block.settings or {}),
                    content=copy.deepcopy(block.content or {}),
                ),
            )

    db.commit()
    db.refresh(created)

    detail = get_page_registry_detail(db, tenant_id, int(created.id))
    return PageDuplicateResponse(source_page_id=int(page_id), page=detail)


def _duplicate_title(title: str) -> str:
    base = re.sub(r"\s*\(копия(?:\s+\d+)?\)\s*$", "", str(title or "").strip(), flags=re.I)
    if not base:
        base = "Страница"
    candidate = f"{base} (копия)"
    return candidate[:255]
