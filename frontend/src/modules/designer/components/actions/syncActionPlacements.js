export function buildPlacementKeysFromPlacements(placements = []) {
  return placements
    .map((placement) => String(placement?.placement_key || "").trim())
    .filter(Boolean)
    .sort();
}

export function arePlacementKeysEqual(leftKeys = [], rightKeys = []) {
  const left = [...leftKeys].sort();
  const right = [...rightKeys].sort();

  if (left.length !== right.length) {
    return false;
  }

  return left.every((key, index) => key === right[index]);
}

export function computePlacementSyncPlan(currentPlacements = [], draftPlacementKeys = []) {
  const currentKeys = new Set(buildPlacementKeysFromPlacements(currentPlacements));
  const draftKeys = new Set(
    (draftPlacementKeys || [])
      .map((key) => String(key || "").trim())
      .filter(Boolean),
  );

  const toCreate = [...draftKeys].filter((key) => !currentKeys.has(key));
  const toDelete = (currentPlacements || []).filter(
    (placement) => !draftKeys.has(String(placement?.placement_key || "").trim()),
  );

  return { toCreate, toDelete };
}

export async function syncActionPlacements({
  tenantId,
  objectTypeId,
  actionDefinitionId,
  currentPlacements = [],
  draftPlacementKeys = [],
  placementCatalog = [],
  api,
}) {
  const { toCreate, toDelete } = computePlacementSyncPlan(
    currentPlacements,
    draftPlacementKeys,
  );

  const catalogByKey = new Map(
    (placementCatalog || []).map((item) => [item.key, item]),
  );

  for (const placement of toDelete) {
    await api.deleteActionPlacement(
      tenantId,
      objectTypeId,
      actionDefinitionId,
      placement.id,
    );
  }

  for (const placementKey of toCreate) {
    const catalogItem = catalogByKey.get(placementKey);

    await api.createActionPlacement(tenantId, objectTypeId, actionDefinitionId, {
      placement_key: placementKey,
      is_active: true,
      sort_order: catalogItem?.sort_order ?? 100,
      label_override: null,
      icon_key: null,
      config_json: {},
      visibility_condition_json: null,
      enabled_condition_json: null,
    });
  }

  return api.listActionPlacements(tenantId, objectTypeId, actionDefinitionId);
}
