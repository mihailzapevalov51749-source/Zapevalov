import { useEffect, useMemo, useRef, useState } from "react";

function createId(prefix = "representation") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getRepresentationId(idOrObj) {
  return String(idOrObj?.id ?? idOrObj?.key ?? idOrObj ?? "");
}

function normalizeIds(value) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeRepresentation(representation, index = 0) {
  const id = String(representation?.id ?? representation?.key ?? createId());

  const name =
    representation?.name ||
    representation?.title ||
    representation?.label ||
    "Новое представление";

  const isDefault = Boolean(
    representation?.isDefault ??
      representation?.is_default ??
      representation?.default ??
      false
  );

  const isVisible =
    representation?.isVisible ?? representation?.is_visible ?? true;

  return {
    ...representation,

    id,
    key: representation?.key ?? id,

    name,
    title: name,
    label: name,

    conditions: normalizeArray(representation?.conditions),
    activeConditions: normalizeArray(
      representation?.activeConditions || representation?.conditions
    ),

    activeFilter:
      representation?.activeFilter || representation?.active_filter || "all",

    activeQuickFilterId:
      representation?.activeQuickFilterId ||
      representation?.active_quick_filter_id ||
      null,

    activeSort:
      representation?.activeSort || representation?.active_sort || "none",

    sortDirection:
      representation?.sortDirection || representation?.sort_direction || "asc",

    sortRules: normalizeArray(representation?.sortRules),

    hiddenColumnIds: normalizeIds(
      representation?.hiddenColumnIds || representation?.hiddenColumns
    ),

    columnOrder: normalizeIds(
      representation?.columnOrder ||
        representation?.columnsOrder ||
        representation?.visibleColumnOrder
    ),

    visibleColumnIds: normalizeIds(representation?.visibleColumnIds),

    isDefault,
    is_default: isDefault,
    default: isDefault,

    isVisible,
    is_visible: isVisible,

    position: Number.isFinite(Number(representation?.position))
      ? Number(representation.position)
      : index,

    createdAt:
      representation?.createdAt ||
      representation?.created_at ||
      new Date().toISOString(),

    updatedAt:
      representation?.updatedAt ||
      representation?.updated_at ||
      new Date().toISOString(),
  };
}

function ensureSingleDefault(representations = []) {
  if (!Array.isArray(representations)) return [];

  let defaultFound = false;

  const normalizedItems = representations.map((item, index) => {
    const normalized = normalizeRepresentation(item, index);

    if (!normalized.isDefault || defaultFound) {
      return {
        ...normalized,
        isDefault: false,
        is_default: false,
        default: false,
      };
    }

    defaultFound = true;

    return {
      ...normalized,
      isDefault: true,
      is_default: true,
      default: true,
    };
  });

  if (!defaultFound && normalizedItems.length > 0) {
    return normalizedItems.map((item, index) => {
      const isDefault = index === 0;

      return {
        ...item,
        isDefault,
        is_default: isDefault,
        default: isDefault,
      };
    });
  }

  return normalizedItems;
}

function normalizePositions(representations = []) {
  return [...representations]
    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
    .map((item, index) => ({
      ...item,
      position: index,
    }));
}

function prepareRepresentations(representations = []) {
  return normalizePositions(ensureSingleDefault(representations));
}

function getStorageKey({ blockId, tableId }) {
  if (!blockId && !tableId) return null;
  return `universal-table:${tableId || blockId}:representations`;
}

function load(storageKey) {
  if (!storageKey) return [];

  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? prepareRepresentations(parsed) : [];
  } catch {
    return [];
  }
}

function save(storageKey, data) {
  if (!storageKey) return;

  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch {
    // localStorage может быть недоступен
  }
}

export default function useTableRepresentations({
  blockId,
  tableId,
  initialRepresentations = [],
}) {
  const storageKey = useMemo(
    () => getStorageKey({ blockId, tableId }),
    [blockId, tableId]
  );

  const tableViewStateMeta = useMemo(
    () => ({
      tableId: tableId ?? null,
      table_id: tableId ?? null,
      blockId: blockId ?? null,
      block_id: blockId ?? null,
      representationsStorageKey: storageKey,
    }),
    [tableId, blockId, storageKey]
  );

  const [representations, setRepresentations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [isDirty, setDirty] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const representationsRef = useRef([]);
  const activeIdRef = useRef(null);
  const hydratedRef = useRef(false);
  const previousStorageKeyRef = useRef("");

  const commitRepresentations = (nextRepresentations) => {
    const prepared = prepareRepresentations(nextRepresentations);

    representationsRef.current = prepared;
    setRepresentations(prepared);
    save(storageKey, prepared);

    return prepared;
  };

  const commitActiveId = (nextActiveId) => {
    activeIdRef.current = nextActiveId ?? null;
    setActiveId(nextActiveId ?? null);
  };

  useEffect(() => {
    if (!storageKey) {
      representationsRef.current = [];
      activeIdRef.current = null;

      setRepresentations([]);
      setActiveId(null);
      setDirty(false);
      setIsHydrated(false);

      hydratedRef.current = false;
      previousStorageKeyRef.current = "";
      return;
    }

    const storageKeyChanged = previousStorageKeyRef.current !== storageKey;

    if (!storageKeyChanged && hydratedRef.current) return;

    previousStorageKeyRef.current = storageKey;
    hydratedRef.current = true;

    const fromStorage = load(storageKey);

    const initial = prepareRepresentations(
      Array.isArray(initialRepresentations) ? initialRepresentations : []
    );

    const next = fromStorage.length ? fromStorage : initial;
    const active = next.find((item) => item.isDefault) || next[0] || null;

    representationsRef.current = next;
    activeIdRef.current = active?.id ?? null;

    setRepresentations(next);
    setActiveId(active?.id ?? null);
    setDirty(false);
    setIsHydrated(true);
  }, [storageKey, initialRepresentations]);

  const activeRepresentation = useMemo(() => {
    return (
      representations.find((item) => String(item.id) === String(activeId)) ||
      null
    );
  }, [representations, activeId]);

  const createRepresentation = (payload = {}) => {
    const currentRepresentations = representationsRef.current || [];

    const name =
      payload?.name ||
      payload?.title ||
      payload?.label ||
      "Новое представление";

    const isDefault = Boolean(
      payload?.isDefault ??
        payload?.is_default ??
        currentRepresentations.length === 0
    );

    const newItem = normalizeRepresentation(
      {
        ...payload,

        id: createId(),
        key: createId("representation_key"),

        name,
        title: name,
        label: name,

        isDefault,
        is_default: isDefault,
        default: isDefault,

        isVisible: payload?.isVisible ?? payload?.is_visible ?? true,
        is_visible: payload?.isVisible ?? payload?.is_visible ?? true,

        position: currentRepresentations.length,

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      currentRepresentations.length
    );

    const preparedPrev = isDefault
      ? currentRepresentations.map((item) => ({
          ...item,
          isDefault: false,
          is_default: false,
          default: false,
        }))
      : currentRepresentations;

    commitRepresentations([...preparedPrev, newItem]);
    commitActiveId(newItem.id);
    setDirty(false);

    return newItem;
  };

  const updateRepresentation = (idOrObj, patch = {}) => {
    const normalizedId = getRepresentationId(idOrObj);

    if (!normalizedId) return null;

    const currentRepresentations = representationsRef.current || [];

    let updatedItem = null;

    const next = currentRepresentations.map((item) => {
      const isTarget =
        String(item.id) === normalizedId || String(item.key) === normalizedId;

      if (!isTarget) return item;

      updatedItem = normalizeRepresentation({
        ...item,
        ...patch,

        id: item.id,
        key: item.key,

        name: patch.name || item.name,
        title: patch.title || patch.name || item.title || item.name,
        label: patch.label || patch.name || item.label || item.name,

        updatedAt: new Date().toISOString(),
      });

      return updatedItem;
    });

    if (!updatedItem) return null;

    const shouldBeDefault = Boolean(
      updatedItem.isDefault || updatedItem.is_default || updatedItem.default
    );

    const prepared = shouldBeDefault
      ? next.map((item) => {
          const isTarget =
            String(item.id) === String(updatedItem.id) ||
            String(item.key) === String(updatedItem.key);

          return {
            ...item,
            isDefault: isTarget,
            is_default: isTarget,
            default: isTarget,
          };
        })
      : next;

    commitRepresentations(prepared);

    return updatedItem;
  };

  const deleteRepresentation = (idOrObj) => {
    const normalizedId = getRepresentationId(idOrObj);

    if (!normalizedId) return null;

    const currentRepresentations = representationsRef.current || [];
    const currentActiveId = activeIdRef.current;

    const next = currentRepresentations.filter(
      (item) =>
        String(item.id) !== normalizedId && String(item.key) !== normalizedId
    );

    const prepared = commitRepresentations(next);

    const nextActive = prepared.find((item) => item.isDefault) || prepared[0] || null;

    if (String(currentActiveId) === normalizedId) {
      commitActiveId(nextActive?.id ?? null);
    }

    setDirty(false);

    return nextActive;
  };

  const deleteAllRepresentations = () => {
    representationsRef.current = [];
    activeIdRef.current = null;

    setRepresentations([]);
    setActiveId(null);
    setDirty(false);
    save(storageKey, []);
  };

  const selectRepresentation = (idOrObj) => {
    const normalizedId = getRepresentationId(idOrObj);

    if (!normalizedId) {
      commitActiveId(null);
      setDirty(false);
      return null;
    }

    const found =
      (representationsRef.current || []).find(
        (item) =>
          String(item.id) === normalizedId ||
          String(item.key) === normalizedId
      ) || null;

    if (!found) {
      commitActiveId(null);
      setDirty(false);
      return null;
    }

    commitActiveId(found.id);
    setDirty(false);

    return found;
  };

  const clearActiveRepresentation = () => {
    commitActiveId(null);
    setDirty(false);
  };

  const toggleVisibility = (idOrObj) => {
    const normalizedId = getRepresentationId(idOrObj);

    if (!normalizedId) return null;

    const currentRepresentations = representationsRef.current || [];
    const currentActiveId = activeIdRef.current;

    let updatedItem = null;

    const next = currentRepresentations.map((item) => {
      const isTarget =
        String(item.id) === normalizedId || String(item.key) === normalizedId;

      if (!isTarget) return item;

      const nextVisible = !(item.isVisible ?? item.is_visible ?? true);

      updatedItem = {
        ...item,
        isVisible: nextVisible,
        is_visible: nextVisible,
        updatedAt: new Date().toISOString(),
      };

      return updatedItem;
    });

    commitRepresentations(next);

    if (
      updatedItem &&
      updatedItem.isVisible === false &&
      String(currentActiveId) === String(updatedItem.id)
    ) {
      commitActiveId(null);
      setDirty(false);
    }

    return updatedItem;
  };

  const moveRepresentation = ({ sourceId, targetId, position = "before" }) => {
    if (!sourceId || !targetId) return;

    const sorted = normalizePositions(representationsRef.current || []);

    const fromIndex = sorted.findIndex(
      (item) =>
        String(item.id) === String(sourceId) ||
        String(item.key) === String(sourceId)
    );

    const targetIndex = sorted.findIndex(
      (item) =>
        String(item.id) === String(targetId) ||
        String(item.key) === String(targetId)
    );

    if (fromIndex < 0 || targetIndex < 0) return;

    const [moved] = sorted.splice(fromIndex, 1);

    let insertIndex = targetIndex;

    if (position === "after") {
      insertIndex = targetIndex + 1;
    }

    if (fromIndex < insertIndex) {
      insertIndex -= 1;
    }

    if (insertIndex < 0) insertIndex = 0;
    if (insertIndex > sorted.length) insertIndex = sorted.length;

    sorted.splice(insertIndex, 0, moved);

    commitRepresentations(sorted);
  };

  const setDefaultRepresentation = (idOrObj) => {
    const normalizedId = getRepresentationId(idOrObj);

    if (!normalizedId) return;

    const next = (representationsRef.current || []).map((item) => {
      const isDefault =
        String(item.id) === normalizedId || String(item.key) === normalizedId;

      return {
        ...item,
        isDefault,
        is_default: isDefault,
        default: isDefault,
        updatedAt: isDefault ? new Date().toISOString() : item.updatedAt,
      };
    });

    commitRepresentations(next);
  };

  const markDirty = () => {
    setDirty(true);
  };

  const clearDirty = () => {
    setDirty(false);
  };

  return {
    representations,
    setRepresentations,

    activeRepresentation,
    activeRepresentationId: activeId,
    setActiveRepresentationId: commitActiveId,
    clearActiveRepresentation,

    tableViewStateMeta,

    isRepresentationsHydrated: isHydrated,

    isRepresentationDirty: isDirty,
    setIsRepresentationDirty: setDirty,
    markRepresentationDirty: markDirty,
    clearRepresentationDirty: clearDirty,

    createRepresentation,
    updateRepresentation,
    deleteRepresentation,
    deleteAllRepresentations,
    selectRepresentation,
    toggleRepresentationVisibility: toggleVisibility,
    moveRepresentation,
    setDefaultRepresentation,
  };
}