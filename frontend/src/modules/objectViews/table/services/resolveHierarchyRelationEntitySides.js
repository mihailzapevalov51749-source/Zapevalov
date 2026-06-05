/**
 * Parent/child entity sides for hierarchy relation instances (ADR: source=parent, target=child by default).
 *
 * @param {Record<string, unknown> | null | undefined} relation
 * @returns {{ parentSide: "source" | "target", childSide: "source" | "target" }}
 */
export function resolveHierarchyRelationEntitySides(relation) {
  const settings =
    relation?.settings_json && typeof relation.settings_json === "object"
      ? relation.settings_json
      : {};

  const parentSide = String(settings.parent_entity_side || "source").trim();
  const childSide = String(settings.child_entity_side || "target").trim();

  if (parentSide === "target" && childSide === "source") {
    return { parentSide: "target", childSide: "source" };
  }

  return { parentSide: "source", childSide: "target" };
}

/**
 * @param {Record<string, unknown>} instance
 * @param {{ parentSide: string, childSide: string }} sides
 */
export function getHierarchyParentChildEntityIds(instance, sides) {
  const sourceId = String(instance?.source_entity_id ?? "").trim();
  const targetId = String(instance?.target_entity_id ?? "").trim();

  if (sides.parentSide === "source" && sides.childSide === "target") {
    return { parentId: sourceId, childId: targetId };
  }

  return { parentId: targetId, childId: sourceId };
}
