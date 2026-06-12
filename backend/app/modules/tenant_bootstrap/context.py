from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID


@dataclass
class CloneContext:
    source_tenant_id: int
    target_tenant_id: int

    page_id_map: dict[int, int] = field(default_factory=dict)
    section_id_map: dict[int, int] = field(default_factory=dict)
    block_id_map: dict[int, int] = field(default_factory=dict)

    object_type_id_map: dict[UUID, UUID] = field(default_factory=dict)
    field_id_map: dict[UUID, UUID] = field(default_factory=dict)
    relation_id_map: dict[UUID, UUID] = field(default_factory=dict)
    view_id_map: dict[UUID, UUID] = field(default_factory=dict)
    action_id_map: dict[UUID, UUID] = field(default_factory=dict)
    action_form_id_map: dict[UUID, UUID] = field(default_factory=dict)

    document_library_id_map: dict[int, int] = field(default_factory=dict)
    navigation_item_id_map: dict[int, int] = field(default_factory=dict)
    workspace_id_map: dict[int, int] = field(default_factory=dict)

    def remap_int(self, key: str, value: int | None) -> int | None:
        if value is None:
            return None
        mapping = {
            "page_id": self.page_id_map,
            "section_id": self.section_id_map,
            "block_id": self.block_id_map,
            "library_id": self.document_library_id_map,
            "navigation_item_id": self.navigation_item_id_map,
            "workspace_id": self.workspace_id_map,
            "home_page_id": self.page_id_map,
        }.get(key)
        if mapping is None:
            return value
        return mapping.get(value, value)

    def remap_uuid(self, key: str, value: UUID | None) -> UUID | None:
        if value is None:
            return None
        mapping = {
            "object_type_id": self.object_type_id_map,
            "field_definition_id": self.field_id_map,
            "field_id": self.field_id_map,
            "relation_id": self.relation_id_map,
            "view_id": self.view_id_map,
            "object_view_id": self.view_id_map,
            "action_definition_id": self.action_id_map,
            "action_id": self.action_id_map,
            "action_form_id": self.action_form_id_map,
            "target_object_type_id": self.object_type_id_map,
        "auto_link_relation_id": self.relation_id_map,
        "source_object_type_id": self.object_type_id_map,
    }.get(key)
        if mapping is None:
            return value
        return mapping.get(value, value)
