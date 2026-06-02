"""Memory Graph linking across YASII memory layers (P8-W06)."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.modules.yasii.decision_memory_store import DecisionRecord, list_decision_records
from app.modules.yasii.memory_graph_store import (
    MEMORY_GRAPH_SCHEMA_VERSION,
    MemoryGraphLink,
    MemoryGraphNode,
    list_graph_links,
    list_graph_nodes,
    upsert_graph_link,
    upsert_graph_node,
)

NODE_TYPE_USER = "user"
NODE_TYPE_TENANT = "tenant"
NODE_TYPE_SESSION = "session"
NODE_TYPE_DECISION = "decision"
NODE_TYPE_PROCESS = "process"

SOURCE_TYPE_USER = "user_memory"
SOURCE_TYPE_TENANT = "tenant_memory"
SOURCE_TYPE_SESSION = "session_memory"
SOURCE_TYPE_DECISION = "decision_memory"
SOURCE_TYPE_PROCESS = "process_memory"

RELATION_CREATED = "created"
RELATION_BELONGS_TO = "belongs_to"
RELATION_INITIATED = "initiated"
RELATION_INFLUENCES = "influences"
RELATION_IMPLEMENTS = "implements"
RELATION_DISCUSSED_IN = "discussed_in"
RELATION_RELATED_TO = "related_to"


class MemoryGraphSnapshot(BaseModel):
    """Tenant-scoped memory graph view."""

    schemaVersion: str = Field(default=MEMORY_GRAPH_SCHEMA_VERSION)
    snapshotId: str = Field(default="memory-graph-placeholder")
    tenantId: str = ""
    nodes: list[MemoryGraphNode] = Field(default_factory=list)
    links: list[MemoryGraphLink] = Field(default_factory=list)


def _session_source_id(user_id: str, session_id: str) -> str:
    return f"{str(user_id or '').strip()}::{str(session_id or '').strip()}"


def node_for_user(tenant_id: str, user_id: str) -> MemoryGraphNode:
    return upsert_graph_node(
        tenant_id,
        node_type=NODE_TYPE_USER,
        source_type=SOURCE_TYPE_USER,
        source_id=user_id,
    )


def node_for_tenant(tenant_id: str) -> MemoryGraphNode:
    return upsert_graph_node(
        tenant_id,
        node_type=NODE_TYPE_TENANT,
        source_type=SOURCE_TYPE_TENANT,
        source_id=tenant_id,
    )


def node_for_session(tenant_id: str, user_id: str, session_id: str) -> MemoryGraphNode:
    return upsert_graph_node(
        tenant_id,
        node_type=NODE_TYPE_SESSION,
        source_type=SOURCE_TYPE_SESSION,
        source_id=_session_source_id(user_id, session_id),
    )


def node_for_decision(tenant_id: str, decision_id: str) -> MemoryGraphNode:
    return upsert_graph_node(
        tenant_id,
        node_type=NODE_TYPE_DECISION,
        source_type=SOURCE_TYPE_DECISION,
        source_id=decision_id,
    )


def node_for_process(tenant_id: str, process_id: str) -> MemoryGraphNode:
    return upsert_graph_node(
        tenant_id,
        node_type=NODE_TYPE_PROCESS,
        source_type=SOURCE_TYPE_PROCESS,
        source_id=process_id,
    )


def link_memory_nodes(
    tenant_id: str,
    *,
    source_node_id: str,
    target_node_id: str,
    relation_type: str,
) -> MemoryGraphLink:
    return upsert_graph_link(
        tenant_id,
        source_node_id=source_node_id,
        target_node_id=target_node_id,
        relation_type=relation_type,
    )


def sync_decision_graph_links(
    tenant_id: str,
    decision: DecisionRecord,
    *,
    process_id: str | None = None,
) -> list[MemoryGraphLink]:
    """Create explicit links for a decision across memory layers."""
    created: list[MemoryGraphLink] = []
    tenant_node = node_for_tenant(tenant_id)
    decision_node = node_for_decision(tenant_id, decision.decisionId)

    created.append(
        link_memory_nodes(
            tenant_id,
            source_node_id=decision_node.nodeId,
            target_node_id=tenant_node.nodeId,
            relation_type=RELATION_BELONGS_TO,
        ),
    )

    if decision.userId:
        user_node = node_for_user(tenant_id, decision.userId)
        created.append(
            link_memory_nodes(
                tenant_id,
                source_node_id=user_node.nodeId,
                target_node_id=decision_node.nodeId,
                relation_type=RELATION_INITIATED,
            ),
        )
        if decision.sessionId:
            session_node = node_for_session(tenant_id, decision.userId, decision.sessionId)
            created.append(
                link_memory_nodes(
                    tenant_id,
                    source_node_id=user_node.nodeId,
                    target_node_id=session_node.nodeId,
                    relation_type=RELATION_BELONGS_TO,
                ),
            )
            created.append(
                link_memory_nodes(
                    tenant_id,
                    source_node_id=session_node.nodeId,
                    target_node_id=decision_node.nodeId,
                    relation_type=RELATION_DISCUSSED_IN,
                ),
            )

    if process_id:
        process_node = node_for_process(tenant_id, process_id)
        created.append(
            link_memory_nodes(
                tenant_id,
                source_node_id=decision_node.nodeId,
                target_node_id=process_node.nodeId,
                relation_type=RELATION_INFLUENCES,
            ),
        )

    return created


def reconcile_memory_graph_from_decisions(tenant_id: str) -> None:
    """Ensure graph links exist for persisted decisions."""
    for decision in list_decision_records(tenant_id, active_only=False):
        sync_decision_graph_links(tenant_id, decision)


def load_memory_graph(tenant_id: str, *, reconcile: bool = True) -> MemoryGraphSnapshot:
    scope = str(tenant_id or "").strip()
    if not scope:
        return MemoryGraphSnapshot()

    if reconcile:
        reconcile_memory_graph_from_decisions(scope)

    nodes = list_graph_nodes(scope)
    links = list_graph_links(scope)
    return MemoryGraphSnapshot(
        snapshotId=f"memory-graph-{scope}",
        tenantId=scope,
        nodes=nodes,
        links=links,
    )


def build_memory_graph_snapshot(tenant_id: str) -> MemoryGraphSnapshot:
    return load_memory_graph(tenant_id, reconcile=True)


def _node_map(snapshot: MemoryGraphSnapshot) -> dict[str, MemoryGraphNode]:
    return {node.nodeId: node for node in snapshot.nodes}


def links_for_node(snapshot: MemoryGraphSnapshot, node_id: str) -> list[MemoryGraphLink]:
    return [
        link
        for link in snapshot.links
        if link.sourceNodeId == node_id or link.targetNodeId == node_id
    ]


def neighbor_nodes(snapshot: MemoryGraphSnapshot, node_id: str) -> list[MemoryGraphNode]:
    nodes_by_id = _node_map(snapshot)
    neighbors: list[MemoryGraphNode] = []
    seen: set[str] = set()
    for link in links_for_node(snapshot, node_id):
        other_id = link.targetNodeId if link.sourceNodeId == node_id else link.sourceNodeId
        if other_id in seen:
            continue
        seen.add(other_id)
        node = nodes_by_id.get(other_id)
        if node is not None:
            neighbors.append(node)
    return neighbors


def decisions_linked_to_session(
    snapshot: MemoryGraphSnapshot,
    user_id: str,
    session_id: str,
) -> list[str]:
    session_node_id = f"{NODE_TYPE_SESSION}:{_session_source_id(user_id, session_id)}"
    decision_ids: list[str] = []
    for link in snapshot.links:
        if link.sourceNodeId == session_node_id and link.relationType == RELATION_DISCUSSED_IN:
            node = _node_map(snapshot).get(link.targetNodeId)
            if node and node.nodeType == NODE_TYPE_DECISION:
                decision_ids.append(node.sourceId)
    return decision_ids


def decisions_initiated_by_user(snapshot: MemoryGraphSnapshot, user_id: str) -> list[str]:
    user_node_id = f"{NODE_TYPE_USER}:{user_id}"
    decision_ids: list[str] = []
    for link in snapshot.links:
        if link.sourceNodeId == user_node_id and link.relationType == RELATION_INITIATED:
            node = _node_map(snapshot).get(link.targetNodeId)
            if node and node.nodeType == NODE_TYPE_DECISION:
                decision_ids.append(node.sourceId)
    return decision_ids


def processes_linked_to_decision(snapshot: MemoryGraphSnapshot, decision_id: str) -> list[str]:
    decision_node_id = f"{NODE_TYPE_DECISION}:{decision_id}"
    process_ids: list[str] = []
    for link in snapshot.links:
        if link.sourceNodeId == decision_node_id and link.relationType in (
            RELATION_INFLUENCES,
            RELATION_IMPLEMENTS,
        ):
            node = _node_map(snapshot).get(link.targetNodeId)
            if node and node.nodeType == NODE_TYPE_PROCESS:
                process_ids.append(node.sourceId)
    return process_ids


def format_decision_label(tenant_id: str, decision_id: str) -> str:
    for record in list_decision_records(tenant_id):
        if record.decisionId == decision_id:
            return record.decisionText
    return decision_id
