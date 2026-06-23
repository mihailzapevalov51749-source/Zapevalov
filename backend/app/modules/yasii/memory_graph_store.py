"""Persistent Memory Graph nodes and links scoped by tenantId (P8-W06)."""

from __future__ import annotations

import json
import os
import re
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

from app.core.runtime_paths import get_yasii_store_dir

MEMORY_GRAPH_SCHEMA_VERSION = "0.1.0"
MEMORY_GRAPH_DATA_DIR_ENV = "YASII_MEMORY_GRAPH_DIR"

_DATA_DIR_OVERRIDE: Path | None = None


@dataclass(frozen=True)
class MemoryGraphNode:
    nodeId: str
    nodeType: str
    sourceType: str
    sourceId: str


@dataclass(frozen=True)
class MemoryGraphLink:
    linkId: str
    sourceNodeId: str
    targetNodeId: str
    relationType: str


def set_memory_graph_data_dir(path: Path | str | None) -> None:
    global _DATA_DIR_OVERRIDE
    if path is None:
        _DATA_DIR_OVERRIDE = None
        return
    _DATA_DIR_OVERRIDE = Path(path)


def clear_memory_graph_store() -> None:
    root = _memory_root()
    if not root.exists():
        return
    for file_path in root.glob("*.json"):
        file_path.unlink(missing_ok=True)


def _memory_root() -> Path:
    if _DATA_DIR_OVERRIDE is not None:
        root = _DATA_DIR_OVERRIDE
    else:
        env_path = os.environ.get(MEMORY_GRAPH_DATA_DIR_ENV, "").strip()
        if env_path:
            root = Path(env_path)
        else:
            root = get_yasii_store_dir(
                "yasii_memory_graph",
                env_var=MEMORY_GRAPH_DATA_DIR_ENV,
            )
    root.mkdir(parents=True, exist_ok=True)
    return root


def _scope_key(tenant_id: str) -> str:
    tenant = re.sub(r"[^a-zA-Z0-9._-]+", "_", str(tenant_id or "default-tenant").strip()) or "default-tenant"
    return f"tenant__{tenant}"


def _memory_file_path(tenant_id: str) -> Path:
    return _memory_root() / f"{_scope_key(tenant_id)}.json"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _read_graph(tenant_id: str) -> tuple[list[MemoryGraphNode], list[MemoryGraphLink]]:
    file_path = _memory_file_path(tenant_id)
    if not file_path.exists():
        return [], []

    try:
        raw = json.loads(file_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return [], []
    if not isinstance(raw, dict):
        return [], []

    nodes = [
        MemoryGraphNode(
            nodeId=str(item.get("nodeId") or ""),
            nodeType=str(item.get("nodeType") or ""),
            sourceType=str(item.get("sourceType") or ""),
            sourceId=str(item.get("sourceId") or ""),
        )
        for item in raw.get("nodes", [])
        if str(item.get("nodeId") or "").strip()
    ]
    links = [
        MemoryGraphLink(
            linkId=str(item.get("linkId") or uuid.uuid4().hex),
            sourceNodeId=str(item.get("sourceNodeId") or ""),
            targetNodeId=str(item.get("targetNodeId") or ""),
            relationType=str(item.get("relationType") or ""),
        )
        for item in raw.get("links", [])
        if str(item.get("sourceNodeId") or "").strip() and str(item.get("targetNodeId") or "").strip()
    ]
    return nodes, links


def _write_graph(
    tenant_id: str,
    nodes: list[MemoryGraphNode],
    links: list[MemoryGraphLink],
) -> None:
    file_path = _memory_file_path(tenant_id)
    payload = {
        "schemaVersion": MEMORY_GRAPH_SCHEMA_VERSION,
        "tenantId": str(tenant_id or "").strip(),
        "nodes": [asdict(node) for node in nodes],
        "links": [asdict(link) for link in links],
        "updatedAt": _utc_now_iso(),
    }
    file_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def list_graph_nodes(tenant_id: str) -> list[MemoryGraphNode]:
    nodes, _ = _read_graph(tenant_id)
    return nodes


def list_graph_links(tenant_id: str) -> list[MemoryGraphLink]:
    _, links = _read_graph(tenant_id)
    return links


def upsert_graph_node(
    tenant_id: str,
    *,
    node_type: str,
    source_type: str,
    source_id: str,
) -> MemoryGraphNode:
    source = str(source_id or "").strip()
    if not source:
        raise ValueError("source_id is required")

    node_id = f"{node_type}:{source}"
    nodes, links = _read_graph(tenant_id)
    for existing in nodes:
        if existing.nodeId == node_id:
            return existing

    node = MemoryGraphNode(
        nodeId=node_id,
        nodeType=str(node_type or "").strip(),
        sourceType=str(source_type or "").strip(),
        sourceId=source,
    )
    nodes.append(node)
    _write_graph(tenant_id, nodes, links)
    return node


def upsert_graph_link(
    tenant_id: str,
    *,
    source_node_id: str,
    target_node_id: str,
    relation_type: str,
) -> MemoryGraphLink:
    source_id = str(source_node_id or "").strip()
    target_id = str(target_node_id or "").strip()
    relation = str(relation_type or "").strip()
    if not source_id or not target_id or not relation:
        raise ValueError("source, target and relation_type are required")

    nodes, links = _read_graph(tenant_id)
    for existing in links:
        if (
            existing.sourceNodeId == source_id
            and existing.targetNodeId == target_id
            and existing.relationType == relation
        ):
            return existing

    link = MemoryGraphLink(
        linkId=f"link-{uuid.uuid4().hex[:12]}",
        sourceNodeId=source_id,
        targetNodeId=target_id,
        relationType=relation,
    )
    links.append(link)
    _write_graph(tenant_id, nodes, links)
    return link
