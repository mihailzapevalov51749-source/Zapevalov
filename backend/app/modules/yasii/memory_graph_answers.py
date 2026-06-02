"""Memory Graph query handling for embedded/runtime (P8-W06)."""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.modules.yasii.decision_memory_store import list_decision_records
from app.modules.yasii.memory_graph import (
    NODE_TYPE_DECISION,
    NODE_TYPE_PROCESS,
    build_memory_graph_snapshot,
    decisions_initiated_by_user,
    decisions_linked_to_session,
    format_decision_label,
    links_for_node,
    load_memory_graph,
    neighbor_nodes,
    processes_linked_to_decision,
)

SESSION_DECISIONS_KEYWORDS = (
    "какие решения связаны с этой сессией",
    "какие решения связаны с сессией",
)

USER_DECISIONS_KEYWORDS = (
    "какие решения принял пользователь",
    "какие решения принял я",
    "какие решения я принял",
)

PROCESS_DECISION_KEYWORDS = (
    "какие процессы связаны с решением",
    "какие процессы связаны с этим решением",
)

DECISION_LINKS_KEYWORDS = (
    "покажи связи решения",
    "покажи связи этого решения",
)

DECISION_RELATED_KEYWORDS = (
    "что связано с этим решением",
    "что связано с решением",
)


@dataclass(frozen=True)
class MemoryGraphCommandResult:
    message: str
    graph_loaded: bool = False
    graph_link_created: bool = False
    graph_snapshot_generated: bool = False


def _normalize_query(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().casefold())


def _extract_scope(payload: dict) -> tuple[str, str | None, str | None]:
    tenant_id = str(payload.get("tenantId") or "").strip() or "default-tenant"
    user_id = str(payload.get("userId") or "").strip() or None
    session_id = str(payload.get("sessionId") or "").strip() or None
    return tenant_id, user_id, session_id


def _resolve_decision_id(tenant_id: str, query_text: str, payload: dict) -> str | None:
    explicit = str(payload.get("decisionId") or "").strip()
    if explicit:
        return explicit

    normalized = _normalize_query(query_text)
    active = list_decision_records(tenant_id)
    if len(active) == 1:
        return active[0].decisionId

    for record in active:
        fragment = re.sub(r"\s+", " ", record.decisionText.casefold())
        if len(fragment) >= 8 and fragment in normalized:
            return record.decisionId
    return active[0].decisionId if active else None


def is_memory_graph_command(query_text: str) -> bool:
    normalized = _normalize_query(query_text)
    if not normalized:
        return False
    keyword_groups = (
        SESSION_DECISIONS_KEYWORDS,
        USER_DECISIONS_KEYWORDS,
        PROCESS_DECISION_KEYWORDS,
        DECISION_LINKS_KEYWORDS,
        DECISION_RELATED_KEYWORDS,
    )
    return any(keyword in normalized for group in keyword_groups for keyword in group)


def resolve_memory_graph_command(query_text: str, payload: dict) -> MemoryGraphCommandResult | None:
    from app.modules.yasii.user_identity_answers import is_user_identity_command

    normalized = _normalize_query(query_text)
    if not normalized:
        return None

    if is_user_identity_command(query_text):
        return None

    tenant_id, user_id, session_id = _extract_scope(payload)
    snapshot = load_memory_graph(tenant_id, reconcile=True)

    if any(keyword in normalized for keyword in SESSION_DECISIONS_KEYWORDS):
        if not user_id or not session_id:
            return MemoryGraphCommandResult(
                message="Нужны userId и sessionId в HostContext, чтобы найти решения сессии.",
                graph_loaded=True,
                graph_snapshot_generated=True,
            )
        decision_ids = decisions_linked_to_session(snapshot, user_id, session_id)
        if not decision_ids:
            return MemoryGraphCommandResult(
                message="С этой сессией пока не связано ни одного решения.",
                graph_loaded=True,
                graph_snapshot_generated=True,
            )
        lines = ["Решения, связанные с этой сессией:"]
        for decision_id in decision_ids:
            lines.append(f"• {format_decision_label(tenant_id, decision_id)}")
        return MemoryGraphCommandResult(
            message="\n".join(lines),
            graph_loaded=True,
            graph_snapshot_generated=True,
        )

    if any(keyword in normalized for keyword in USER_DECISIONS_KEYWORDS):
        if not user_id:
            return MemoryGraphCommandResult(
                message="Нужен userId в HostContext, чтобы найти решения пользователя.",
                graph_loaded=True,
                graph_snapshot_generated=True,
            )
        decision_ids = decisions_initiated_by_user(snapshot, user_id)
        if not decision_ids:
            return MemoryGraphCommandResult(
                message="Пользователь пока не инициировал сохранённых решений.",
                graph_loaded=True,
                graph_snapshot_generated=True,
            )
        lines = ["Решения, инициированные пользователем:"]
        for decision_id in decision_ids:
            lines.append(f"• {format_decision_label(tenant_id, decision_id)}")
        return MemoryGraphCommandResult(
            message="\n".join(lines),
            graph_loaded=True,
            graph_snapshot_generated=True,
        )

    decision_id = _resolve_decision_id(tenant_id, query_text, payload)

    if any(keyword in normalized for keyword in PROCESS_DECISION_KEYWORDS):
        if not decision_id:
            return MemoryGraphCommandResult(
                message="Не нашёл решение для поиска связанных процессов.",
                graph_loaded=True,
            )
        process_ids = processes_linked_to_decision(snapshot, decision_id)
        if not process_ids:
            return MemoryGraphCommandResult(
                message="С этим решением пока не связано ни одного процесса.",
                graph_loaded=True,
                graph_snapshot_generated=True,
            )
        lines = ["Процессы, связанные с решением:"]
        for process_id in process_ids:
            lines.append(f"• {process_id}")
        return MemoryGraphCommandResult(
            message="\n".join(lines),
            graph_loaded=True,
            graph_snapshot_generated=True,
        )

    if decision_id and any(keyword in normalized for keyword in DECISION_LINKS_KEYWORDS):
        node_id = f"{NODE_TYPE_DECISION}:{decision_id}"
        links = links_for_node(snapshot, node_id)
        if not links:
            return MemoryGraphCommandResult(
                message="У этого решения пока нет связей в Memory Graph.",
                graph_loaded=True,
                graph_snapshot_generated=True,
            )
        lines = ["Связи решения:"]
        nodes_by_id = {node.nodeId: node for node in snapshot.nodes}
        for link in links:
            source = nodes_by_id.get(link.sourceNodeId)
            target = nodes_by_id.get(link.targetNodeId)
            lines.append(
                f"• {link.relationType}: "
                f"{source.nodeType if source else link.sourceNodeId} → "
                f"{target.nodeType if target else link.targetNodeId}",
            )
        return MemoryGraphCommandResult(
            message="\n".join(lines),
            graph_loaded=True,
            graph_snapshot_generated=True,
        )

    if decision_id and any(keyword in normalized for keyword in DECISION_RELATED_KEYWORDS):
        node_id = f"{NODE_TYPE_DECISION}:{decision_id}"
        neighbors = neighbor_nodes(snapshot, node_id)
        if not neighbors:
            return MemoryGraphCommandResult(
                message="С этим решением пока ничего не связано.",
                graph_loaded=True,
                graph_snapshot_generated=True,
            )
        lines = ["Связано с решением:"]
        for node in neighbors:
            label = node.sourceId
            if node.nodeType == NODE_TYPE_DECISION:
                label = format_decision_label(tenant_id, node.sourceId)
            if node.nodeType == NODE_TYPE_PROCESS:
                label = f"процесс {node.sourceId}"
            lines.append(f"• {node.nodeType}: {label}")
        return MemoryGraphCommandResult(
            message="\n".join(lines),
            graph_loaded=True,
            graph_snapshot_generated=True,
        )

    return None
