/**
 * @param {Object} params
 * @param {Record<string, unknown> | null | undefined} params.sourceNode
 * @param {string | null | undefined} [params.newParentId]
 * @param {(values: Record<string, unknown>) => Promise<{ id?: string, entity_id?: string }>} params.createEntity
 * @param {(nodeId: string, parentId: string) => Promise<void>} [params.reparentNode]
 * @param {() => Promise<void>} [params.refreshTree]
 * @param {(createdId: string) => void} [params.onCreated]
 */
export async function duplicatePlanTreeNode({
  sourceNode,
  newParentId = null,
  createEntity,
  reparentNode,
  refreshTree,
  onCreated,
}) {
  const entityValues =
    sourceNode?.entity?.values && typeof sourceNode.entity.values === "object"
      ? { ...sourceNode.entity.values }
      : {};

  const created = await createEntity(entityValues);
  const createdId = String(created?.id ?? created?.entity_id ?? "").trim();
  const normalizedParentId = String(newParentId ?? "").trim();

  if (createdId && normalizedParentId && reparentNode) {
    await reparentNode(createdId, normalizedParentId);
  }

  await refreshTree?.();

  if (createdId) {
    onCreated?.(createdId);
  }

  return createdId;
}
