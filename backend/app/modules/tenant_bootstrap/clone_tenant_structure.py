from __future__ import annotations

import copy
from dataclasses import dataclass
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.modules.blocks.models import Block
from app.modules.document_libraries.models import DocumentLibrary
from app.modules.navigation.models import NavigationItem
from app.modules.navigation.runtime_protected_pages import backfill_runtime_protected_navigation
from app.modules.pages.models import Page
from app.modules.platform.action_engine.action_definitions.models import (
    DesignerActionDefinition,
)
from app.modules.platform.action_engine.action_forms.models import (
    DesignerActionForm,
    DesignerActionFormField,
)
from app.modules.platform.action_engine.action_placements.models import (
    DesignerActionPlacement,
)
from app.modules.platform.designer.field_definitions.models import DesignerFieldDefinition
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform.designer.system_menu_settings.service import (
    clone_designer_system_menu_settings,
)
from app.modules.platform.designer.publish.service import publish_tenant_catalog
from app.modules.platform.designer.relation_definitions.models import (
    DesignerRelationDefinition,
)
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition
from app.modules.platform.designer.workspaces.models import (
    DesignerWorkspace,
    DesignerWorkspaceTab,
)
from app.modules.portals.models import Portal
from app.modules.sections.models import Section
from app.modules.tenant_bootstrap.context import CloneContext
from app.modules.tenant_bootstrap.exceptions import (
    SourceTenantHasNoStructureError,
    SourceTenantNotFoundError,
    TargetTenantAlreadyHasStructureError,
    TargetTenantNotFoundError,
)
from app.modules.tenant_bootstrap.json_remap import remap_json_field
from app.modules.tenant_bootstrap.url_rewrite import rewrite_tenant_urls
@dataclass(frozen=True)
class CloneTenantStructureResult:
    source_tenant_id: int
    target_tenant_id: int
    pages_cloned: int
    navigation_items_cloned: int
    object_types_cloned: int
    workspaces_cloned: int
    designer_system_menu_settings_cloned: int
    catalog_version: int | None


def _assert_portals_exist(db: Session, source_tenant_id: int, target_tenant_id: int) -> None:
    if source_tenant_id == target_tenant_id:
        raise TargetTenantAlreadyHasStructureError(
            "Source and target tenant must be different",
        )

    source = db.query(Portal).filter(Portal.id == source_tenant_id).one_or_none()
    if source is None:
        raise SourceTenantNotFoundError(f"Source tenant portal {source_tenant_id} not found")

    target = db.query(Portal).filter(Portal.id == target_tenant_id).one_or_none()
    if target is None:
        raise TargetTenantNotFoundError(f"Target tenant portal {target_tenant_id} not found")


def _assert_target_has_no_structure(db: Session, target_tenant_id: int) -> None:
    if (
        db.query(Page.id)
        .filter(Page.portal_id == target_tenant_id, Page.deleted_at.is_(None))
        .first()
    ):
        raise TargetTenantAlreadyHasStructureError("Target tenant already has structure")

    if (
        db.query(NavigationItem.id)
        .filter(NavigationItem.portal_id == target_tenant_id, NavigationItem.deleted_at.is_(None))
        .first()
    ):
        raise TargetTenantAlreadyHasStructureError("Target tenant already has structure")

    if (
        db.query(DesignerObjectType.id)
        .filter(
            DesignerObjectType.tenant_id == target_tenant_id,
            DesignerObjectType.deleted_at.is_(None),
        )
        .first()
    ):
        raise TargetTenantAlreadyHasStructureError("Target tenant already has structure")

    if (
        db.query(DesignerWorkspace.id)
        .filter(
            DesignerWorkspace.tenant_id == target_tenant_id,
            DesignerWorkspace.deleted_at.is_(None),
        )
        .first()
    ):
        raise TargetTenantAlreadyHasStructureError("Target tenant already has structure")


def _assert_source_has_structure(db: Session, source_tenant_id: int) -> None:
    has_pages = (
        db.query(Page.id)
        .filter(Page.portal_id == source_tenant_id, Page.deleted_at.is_(None))
        .first()
    )
    has_object_types = (
        db.query(DesignerObjectType.id)
        .filter(
            DesignerObjectType.tenant_id == source_tenant_id,
            DesignerObjectType.deleted_at.is_(None),
        )
        .first()
    )
    if not has_pages and not has_object_types:
        raise SourceTenantHasNoStructureError(
            f"Source tenant {source_tenant_id} has no cloneable structure",
        )


def _clone_object_types(db: Session, ctx: CloneContext) -> int:
    rows = (
        db.query(DesignerObjectType)
        .filter(
            DesignerObjectType.tenant_id == ctx.source_tenant_id,
            DesignerObjectType.deleted_at.is_(None),
        )
        .order_by(DesignerObjectType.sort_order.asc(), DesignerObjectType.key.asc())
        .all()
    )
    count = 0
    for row in rows:
        new_id = uuid4()
        clone = DesignerObjectType(
            id=new_id,
            tenant_id=ctx.target_tenant_id,
            key=row.key,
            name=row.name,
            description=row.description,
            icon=row.icon,
            icon_type=row.icon_type,
            icon_file_url=row.icon_file_url,
            color=row.color,
            sort_order=row.sort_order,
            status=row.status,
            is_system=row.is_system,
            is_default_entity=row.is_default_entity,
            settings_json=remap_json_field(row.settings_json, ctx),
            governance_json=remap_json_field(row.governance_json, ctx),
            draft_revision=row.draft_revision,
            last_published_at=None,
            created_by=None,
            updated_by=None,
        )
        db.add(clone)
        ctx.object_type_id_map[row.id] = new_id
        count += 1
    db.flush()
    return count


def _clone_fields(db: Session, ctx: CloneContext) -> None:
    if not ctx.object_type_id_map:
        return

    rows = (
        db.query(DesignerFieldDefinition)
        .filter(
            DesignerFieldDefinition.tenant_id == ctx.source_tenant_id,
            DesignerFieldDefinition.deleted_at.is_(None),
            DesignerFieldDefinition.object_type_id.in_(ctx.object_type_id_map.keys()),
        )
        .order_by(DesignerFieldDefinition.sort_order.asc())
        .all()
    )
    for row in rows:
        new_id = uuid4()
        clone = DesignerFieldDefinition(
            id=new_id,
            tenant_id=ctx.target_tenant_id,
            object_type_id=ctx.object_type_id_map[row.object_type_id],
            key=row.key,
            name=row.name,
            description=row.description,
            placeholder=row.placeholder,
            field_type=row.field_type,
            sort_order=row.sort_order,
            is_required=row.is_required,
            is_unique=row.is_unique,
            quick_create=row.quick_create,
            is_system=row.is_system,
            default_value_json=remap_json_field(row.default_value_json, ctx),
            settings_json=remap_json_field(row.settings_json, ctx),
            validation_json=remap_json_field(row.validation_json, ctx),
            visibility_json=remap_json_field(row.visibility_json, ctx),
            draft_revision=row.draft_revision,
            created_by=None,
            updated_by=None,
        )
        db.add(clone)
        ctx.field_id_map[row.id] = new_id
    db.flush()


def _clone_relations(db: Session, ctx: CloneContext) -> None:
    if not ctx.object_type_id_map:
        return

    rows = (
        db.query(DesignerRelationDefinition)
        .filter(
            DesignerRelationDefinition.tenant_id == ctx.source_tenant_id,
            DesignerRelationDefinition.deleted_at.is_(None),
            DesignerRelationDefinition.source_object_type_id.in_(ctx.object_type_id_map.keys()),
            DesignerRelationDefinition.target_object_type_id.in_(ctx.object_type_id_map.keys()),
        )
        .order_by(DesignerRelationDefinition.sort_order.asc())
        .all()
    )
    for row in rows:
        new_id = uuid4()
        clone = DesignerRelationDefinition(
            id=new_id,
            tenant_id=ctx.target_tenant_id,
            key=row.key,
            name=row.name,
            description=row.description,
            source_object_type_id=ctx.object_type_id_map[row.source_object_type_id],
            target_object_type_id=ctx.object_type_id_map[row.target_object_type_id],
            relation_type=row.relation_type,
            reverse_name=row.reverse_name,
            sort_order=row.sort_order,
            is_required=row.is_required,
            is_system=row.is_system,
            is_active=row.is_active,
            bidirectional=row.bidirectional,
            cascade_delete=row.cascade_delete,
            settings_json=remap_json_field(row.settings_json, ctx),
            validation_json=remap_json_field(row.validation_json, ctx),
            draft_revision=row.draft_revision,
            created_by=None,
            updated_by=None,
        )
        db.add(clone)
        ctx.relation_id_map[row.id] = new_id
    db.flush()


def _clone_views(db: Session, ctx: CloneContext) -> None:
    if not ctx.object_type_id_map:
        return

    rows = (
        db.query(DesignerViewDefinition)
        .filter(
            DesignerViewDefinition.tenant_id == ctx.source_tenant_id,
            DesignerViewDefinition.deleted_at.is_(None),
            DesignerViewDefinition.object_type_id.in_(ctx.object_type_id_map.keys()),
        )
        .order_by(DesignerViewDefinition.sort_order.asc())
        .all()
    )
    for row in rows:
        new_id = uuid4()
        clone = DesignerViewDefinition(
            id=new_id,
            tenant_id=ctx.target_tenant_id,
            object_type_id=ctx.object_type_id_map[row.object_type_id],
            key=row.key,
            name=row.name,
            description=row.description,
            view_type=row.view_type,
            is_default=row.is_default,
            is_system=row.is_system,
            is_active=row.is_active,
            sort_order=row.sort_order,
            settings_json=remap_json_field(row.settings_json, ctx),
            layout_json=remap_json_field(row.layout_json, ctx),
            filters_json=remap_json_field(row.filters_json, ctx),
            visibility_json=remap_json_field(row.visibility_json, ctx),
            draft_revision=row.draft_revision,
            created_by=None,
            updated_by=None,
        )
        db.add(clone)
        ctx.view_id_map[row.id] = new_id
    db.flush()


def _clone_actions(db: Session, ctx: CloneContext) -> None:
    if not ctx.object_type_id_map:
        return

    rows = (
        db.query(DesignerActionDefinition)
        .filter(
            DesignerActionDefinition.tenant_id == ctx.source_tenant_id,
            DesignerActionDefinition.object_type_id.in_(ctx.object_type_id_map.keys()),
        )
        .all()
    )
    for row in rows:
        new_id = uuid4()
        target_object_type_id = (
            ctx.object_type_id_map.get(row.target_object_type_id)
            if row.target_object_type_id
            else None
        )
        auto_link_relation_id = (
            ctx.relation_id_map.get(row.auto_link_relation_id)
            if row.auto_link_relation_id
            else None
        )
        clone = DesignerActionDefinition(
            id=new_id,
            tenant_id=ctx.target_tenant_id,
            object_type_id=ctx.object_type_id_map[row.object_type_id],
            target_object_type_id=target_object_type_id,
            auto_link_enabled=row.auto_link_enabled,
            auto_link_relation_id=auto_link_relation_id,
            key=row.key,
            name=row.name,
            description=row.description,
            action_type_key=row.action_type_key,
            is_active=row.is_active,
            is_system=row.is_system,
        )
        db.add(clone)
        ctx.action_id_map[row.id] = new_id
    db.flush()


def _clone_action_placements(db: Session, ctx: CloneContext) -> None:
    if not ctx.action_id_map:
        return

    rows = (
        db.query(DesignerActionPlacement)
        .filter(
            DesignerActionPlacement.tenant_id == ctx.source_tenant_id,
            DesignerActionPlacement.object_type_id.in_(ctx.object_type_id_map.keys()),
            DesignerActionPlacement.action_definition_id.in_(ctx.action_id_map.keys()),
        )
        .all()
    )
    for row in rows:
        clone = DesignerActionPlacement(
            id=uuid4(),
            tenant_id=ctx.target_tenant_id,
            object_type_id=ctx.object_type_id_map[row.object_type_id],
            action_definition_id=ctx.action_id_map[row.action_definition_id],
            placement_key=row.placement_key,
            is_active=row.is_active,
            sort_order=row.sort_order,
            label_override=row.label_override,
            icon_key=row.icon_key,
            config_json=remap_json_field(row.config_json, ctx),
            visibility_condition_json=remap_json_field(row.visibility_condition_json, ctx),
            enabled_condition_json=remap_json_field(row.enabled_condition_json, ctx),
        )
        db.add(clone)
    db.flush()


def _clone_action_forms(db: Session, ctx: CloneContext) -> None:
    if not ctx.action_id_map:
        return

    rows = (
        db.query(DesignerActionForm)
        .filter(
            DesignerActionForm.tenant_id == ctx.source_tenant_id,
            DesignerActionForm.object_type_id.in_(ctx.object_type_id_map.keys()),
            DesignerActionForm.action_definition_id.in_(ctx.action_id_map.keys()),
        )
        .all()
    )
    for row in rows:
        new_id = uuid4()
        clone = DesignerActionForm(
            id=new_id,
            tenant_id=ctx.target_tenant_id,
            object_type_id=ctx.object_type_id_map[row.object_type_id],
            action_definition_id=ctx.action_id_map[row.action_definition_id],
            title=row.title,
            description=row.description,
            submit_label=row.submit_label,
            cancel_label=row.cancel_label,
            is_active=row.is_active,
        )
        db.add(clone)
        ctx.action_form_id_map[row.id] = new_id
    db.flush()


def _clone_action_form_fields(db: Session, ctx: CloneContext) -> None:
    if not ctx.action_form_id_map:
        return

    rows = (
        db.query(DesignerActionFormField)
        .filter(
            DesignerActionFormField.tenant_id == ctx.source_tenant_id,
            DesignerActionFormField.action_form_id.in_(ctx.action_form_id_map.keys()),
            DesignerActionFormField.field_definition_id.in_(ctx.field_id_map.keys()),
        )
        .all()
    )
    for row in rows:
        clone = DesignerActionFormField(
            id=uuid4(),
            tenant_id=ctx.target_tenant_id,
            action_form_id=ctx.action_form_id_map[row.action_form_id],
            field_definition_id=ctx.field_id_map[row.field_definition_id],
            label_override=row.label_override,
            placeholder=row.placeholder,
            help_text=row.help_text,
            required=row.required,
            sort_order=row.sort_order,
            is_visible=row.is_visible,
        )
        db.add(clone)
    db.flush()


def _clone_pages(db: Session, ctx: CloneContext) -> int:
    rows = (
        db.query(Page)
        .filter(Page.portal_id == ctx.source_tenant_id, Page.deleted_at.is_(None))
        .order_by(Page.sort_order.asc(), Page.id.asc())
        .all()
    )
    count = 0
    for row in rows:
        clone = Page(
            portal_id=ctx.target_tenant_id,
            title=row.title,
            description=row.description,
            status=row.status,
            is_home=row.is_home,
            is_visible=row.is_visible,
            sort_order=row.sort_order,
        )
        db.add(clone)
        db.flush()
        ctx.page_id_map[row.id] = clone.id
        count += 1
    return count


def _clone_sections_and_blocks(db: Session, ctx: CloneContext) -> None:
    source_page_ids = list(ctx.page_id_map.keys())
    if not source_page_ids:
        return

    sections = (
        db.query(Section)
        .filter(Section.page_id.in_(source_page_ids))
        .order_by(Section.sort_order.asc(), Section.id.asc())
        .all()
    )
    for section in sections:
        clone = Section(
            page_id=ctx.page_id_map[section.page_id],
            title=section.title,
            description=section.description,
            layout=section.layout,
            sort_order=section.sort_order,
            is_visible=section.is_visible,
            settings=remap_json_field(section.settings, ctx),
        )
        db.add(clone)
        db.flush()
        ctx.section_id_map[section.id] = clone.id

    source_section_ids = list(ctx.section_id_map.keys())
    if not source_section_ids:
        return

    blocks = (
        db.query(Block)
        .filter(Block.section_id.in_(source_section_ids))
        .order_by(Block.sort_order.asc(), Block.id.asc())
        .all()
    )
    for block in blocks:
        clone = Block(
            section_id=ctx.section_id_map[block.section_id],
            type=block.type,
            title=block.title,
            description=block.description,
            sort_order=block.sort_order,
            is_visible=block.is_visible,
            status=block.status,
            settings=remap_json_field(block.settings, ctx),
            content=remap_json_field(block.content, ctx),
        )
        db.add(clone)
        db.flush()
        ctx.block_id_map[block.id] = clone.id


def _source_library_ids(db: Session, ctx: CloneContext) -> set[int]:
    rows = (
        db.query(NavigationItem.library_id)
        .filter(
            NavigationItem.portal_id == ctx.source_tenant_id,
            NavigationItem.library_id.isnot(None),
            NavigationItem.deleted_at.is_(None),
        )
        .all()
    )
    return {row[0] for row in rows if row[0] is not None}


def _clone_document_libraries(db: Session, ctx: CloneContext) -> None:
    library_ids = _source_library_ids(db, ctx)
    if not library_ids:
        return

    libraries = (
        db.query(DocumentLibrary)
        .filter(DocumentLibrary.id.in_(library_ids))
        .order_by(DocumentLibrary.id.asc())
        .all()
    )
    for library in libraries:
        clone = DocumentLibrary(
            title=library.title,
            description=library.description,
        )
        db.add(clone)
        db.flush()
        ctx.document_library_id_map[library.id] = clone.id


def _navigation_clone_order(items: list[NavigationItem]) -> list[NavigationItem]:
    by_id = {item.id: item for item in items}
    ordered: list[NavigationItem] = []
    seen: set[int] = set()

    def walk(item: NavigationItem) -> None:
        if item.id in seen:
            return
        if item.parent_id and item.parent_id in by_id:
            walk(by_id[item.parent_id])
        if item.id in seen:
            return
        ordered.append(item)
        seen.add(item.id)

    for item in sorted(items, key=lambda row: (row.sort_order or 0, row.id or 0)):
        walk(item)
    return ordered


def _clone_navigation_items(db: Session, ctx: CloneContext) -> int:
    items = (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == ctx.source_tenant_id,
            NavigationItem.deleted_at.is_(None),
        )
        .all()
    )
    count = 0
    for row in _navigation_clone_order(items):
        parent_id = (
            ctx.navigation_item_id_map.get(row.parent_id) if row.parent_id else None
        )
        page_id = ctx.page_id_map.get(row.page_id) if row.page_id else None
        library_id = (
            ctx.document_library_id_map.get(row.library_id) if row.library_id else None
        )
        object_type_id = (
            ctx.object_type_id_map.get(row.object_type_id) if row.object_type_id else None
        )
        url = rewrite_tenant_urls(
            row.url,
            source_tenant_id=ctx.source_tenant_id,
            target_tenant_id=ctx.target_tenant_id,
        )
        clone = NavigationItem(
            portal_id=ctx.target_tenant_id,
            parent_id=parent_id,
            type=row.type,
            title=row.title,
            page_id=page_id,
            library_id=library_id,
            object_type_id=object_type_id,
            url=url,
            sort_order=row.sort_order,
            is_visible=row.is_visible,
            icon=row.icon,
            icon_type=row.icon_type,
            icon_file_url=row.icon_file_url,
            color=row.color,
            show_icon=row.show_icon,
            is_bold=row.is_bold,
            is_italic=row.is_italic,
            menu_scope=row.menu_scope,
            system_key=row.system_key,
            is_system=row.is_system,
            is_protected=row.is_protected,
        )
        db.add(clone)
        db.flush()
        ctx.navigation_item_id_map[row.id] = clone.id
        count += 1
    return count


def _clone_workspaces(db: Session, ctx: CloneContext) -> int:
    rows = (
        db.query(DesignerWorkspace)
        .filter(
            DesignerWorkspace.tenant_id == ctx.source_tenant_id,
            DesignerWorkspace.deleted_at.is_(None),
        )
        .order_by(DesignerWorkspace.sort_order.asc(), DesignerWorkspace.id.asc())
        .all()
    )
    count = 0
    for row in rows:
        home_page_id = ctx.page_id_map.get(row.home_page_id) if row.home_page_id else None
        navigation_item_id = (
            ctx.navigation_item_id_map.get(row.navigation_item_id)
            if row.navigation_item_id
            else None
        )
        clone = DesignerWorkspace(
            tenant_id=ctx.target_tenant_id,
            title=row.title,
            description=row.description,
            slug=row.slug,
            status=row.status,
            icon=row.icon,
            sort_order=row.sort_order,
            navigation_item_id=navigation_item_id,
            home_page_id=home_page_id,
        )
        db.add(clone)
        db.flush()
        ctx.workspace_id_map[row.id] = clone.id
        count += 1
    return count


def _clone_workspace_tabs(db: Session, ctx: CloneContext) -> None:
    source_workspace_ids = list(ctx.workspace_id_map.keys())
    if not source_workspace_ids:
        return

    rows = (
        db.query(DesignerWorkspaceTab)
        .filter(
            DesignerWorkspaceTab.tenant_id == ctx.source_tenant_id,
            DesignerWorkspaceTab.workspace_id.in_(source_workspace_ids),
            DesignerWorkspaceTab.deleted_at.is_(None),
        )
        .order_by(DesignerWorkspaceTab.sort_order.asc(), DesignerWorkspaceTab.id.asc())
        .all()
    )
    for row in rows:
        object_type_id = (
            ctx.object_type_id_map.get(row.object_type_id) if row.object_type_id else None
        )
        object_view_id = (
            ctx.view_id_map.get(row.object_view_id) if row.object_view_id else None
        )
        target_id = row.target_id
        if target_id and str(target_id).isdigit():
            target_id = str(ctx.page_id_map.get(int(target_id), int(target_id)))
        url = rewrite_tenant_urls(
            row.url,
            source_tenant_id=ctx.source_tenant_id,
            target_tenant_id=ctx.target_tenant_id,
        )
        db.add(
            DesignerWorkspaceTab(
                tenant_id=ctx.target_tenant_id,
                workspace_id=ctx.workspace_id_map[row.workspace_id],
                title=row.title,
                description=row.description,
                slug=row.slug,
                icon=row.icon,
                sort_order=row.sort_order,
                is_system=row.is_system,
                is_visible=row.is_visible,
                slug_is_manual=row.slug_is_manual,
                object_type_id=object_type_id,
                object_view_id=object_view_id,
                tab_type=row.tab_type,
                target_type=row.target_type,
                target_id=target_id,
                url=url,
                open_in_new_tab=row.open_in_new_tab,
            ),
        )
    db.flush()


def clone_tenant_structure(
    db: Session,
    source_tenant_id: int,
    target_tenant_id: int,
    *,
    auto_publish: bool = True,
    commit: bool = True,
) -> CloneTenantStructureResult:
    """
    Copy tenant structure from source portal to an existing target portal.

    Does not copy runtime data, user content, or publish history.
    Optionally publishes target catalog after clone (required for runtime).
    """
    _assert_portals_exist(db, source_tenant_id, target_tenant_id)
    _assert_target_has_no_structure(db, target_tenant_id)
    _assert_source_has_structure(db, source_tenant_id)

    ctx = CloneContext(
        source_tenant_id=source_tenant_id,
        target_tenant_id=target_tenant_id,
    )

    try:
        object_types_cloned = _clone_object_types(db, ctx)
        _clone_fields(db, ctx)
        _clone_relations(db, ctx)
        _clone_views(db, ctx)
        _clone_actions(db, ctx)
        _clone_action_placements(db, ctx)
        _clone_action_forms(db, ctx)
        _clone_action_form_fields(db, ctx)

        pages_cloned = _clone_pages(db, ctx)
        _clone_sections_and_blocks(db, ctx)
        _clone_document_libraries(db, ctx)
        navigation_items_cloned = _clone_navigation_items(db, ctx)
        designer_system_menu_settings_cloned = clone_designer_system_menu_settings(
            db,
            source_tenant_id=ctx.source_tenant_id,
            target_tenant_id=ctx.target_tenant_id,
        )
        backfill_runtime_protected_navigation(db, portal_id=ctx.target_tenant_id)
        workspaces_cloned = _clone_workspaces(db, ctx)
        _clone_workspace_tabs(db, ctx)

        if commit:
            db.commit()
        else:
            db.flush()
    except Exception:
        db.rollback()
        raise

    catalog_version: int | None = None
    if auto_publish and commit:
        publish_result = publish_tenant_catalog(db, target_tenant_id, None)
        catalog_version = publish_result.catalog_version

    return CloneTenantStructureResult(
        source_tenant_id=source_tenant_id,
        target_tenant_id=target_tenant_id,
        pages_cloned=pages_cloned,
        navigation_items_cloned=navigation_items_cloned,
        object_types_cloned=object_types_cloned,
        workspaces_cloned=workspaces_cloned,
        designer_system_menu_settings_cloned=designer_system_menu_settings_cloned,
        catalog_version=catalog_version,
    )
