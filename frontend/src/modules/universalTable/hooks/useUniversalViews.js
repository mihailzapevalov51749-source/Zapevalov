import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createUniversalView,
  deleteUniversalView,
  getViewsByTable,
  updateUniversalView,
} from "../services/universalViewsApi";

function buildDefaultSettingsByType(type = "table") {
  if (type === "composite") {
    return {
      layout: "split",
      blocks: [
        {
          id: "tree",
          type: "tree",
          area: "left",
          width: 360,
          height: "100%",
          settings: {},
        },
        {
          id: "org_structure",
          type: "org_structure",
          area: "main",
          width: "auto",
          height: "100%",
          settings: {},
        },
      ],
    };
  }

  if (type === "tree") {
    return {
      layout: "single",
      blocks: [
        {
          id: "tree",
          type: "tree",
          area: "main",
          settings: {},
        },
      ],
    };
  }

  if (type === "table") {
    return {
      layout: "single",
      blocks: [
        {
          id: "table",
          type: "table",
          area: "main",
          settings: {},
        },
      ],
    };
  }

  return {
    layout: "single",
    blocks: [
      {
        id: type,
        type,
        area: "main",
        settings: {},
      },
    ],
  };
}

function normalizeBooleanVisibility(view = {}) {
  if (view.is_visible !== undefined && view.is_visible !== null) {
    return Boolean(view.is_visible);
  }

  if (view.isVisible !== undefined && view.isVisible !== null) {
    return Boolean(view.isVisible);
  }

  if (view.hidden !== undefined && view.hidden !== null) {
    return !Boolean(view.hidden);
  }

  return true;
}

function normalizeView(view = {}) {
  const type = view.type || "table";
  const isVisible = normalizeBooleanVisibility(view);

  return {
    ...view,

    id: view.id,
    table_id: view.table_id ?? view.tableId,
    tableId: view.tableId ?? view.table_id,

    name: view.name || "Представление",
    type,

    is_system: Boolean(view.is_system ?? view.isSystem),
    isSystem: Boolean(view.isSystem ?? view.is_system),

    is_default: Boolean(view.is_default ?? view.isDefault),
    isDefault: Boolean(view.isDefault ?? view.is_default),

    is_visible: isVisible,
    isVisible,
    hidden: !isVisible,

    position: Number(view.position ?? view.sort_order ?? view.sortOrder ?? 0),
    sort_order: Number(view.sort_order ?? view.position ?? view.sortOrder ?? 0),
    sortOrder: Number(view.sortOrder ?? view.position ?? view.sort_order ?? 0),

    settings: {
      ...buildDefaultSettingsByType(type),
      ...(view.settings || {}),
    },
  };
}

function sortViews(views = []) {
  return [...views].sort((a, b) => {
    const positionA = Number(a?.position ?? a?.sort_order ?? a?.sortOrder ?? 0);
    const positionB = Number(b?.position ?? b?.sort_order ?? b?.sortOrder ?? 0);

    if (positionA !== positionB) {
      return positionA - positionB;
    }

    return Number(a?.id || 0) - Number(b?.id || 0);
  });
}

function normalizeViews(views = [], options = {}) {
  const { preserveOrder = false } = options;

  const normalized = views
    .filter(Boolean)
    .filter((view) => view.id !== undefined && view.id !== null)
    .map(normalizeView);

  if (preserveOrder) {
    return normalized;
  }

  return sortViews(normalized);
}

function normalizeViewPayload(payload = {}) {
  const nextPayload = { ...payload };

  delete nextPayload.isVisible;
  delete nextPayload.isSystem;
  delete nextPayload.isDefault;
  delete nextPayload.hidden;
  delete nextPayload.tableId;

  if (payload.type) {
    nextPayload.type = payload.type;
  }

  if (payload.settings) {
    nextPayload.settings = payload.settings;
  }

  if (
    payload.is_visible !== undefined ||
    payload.isVisible !== undefined ||
    payload.hidden !== undefined
  ) {
    nextPayload.is_visible = normalizeBooleanVisibility(payload);
  }

  if (payload.is_default !== undefined || payload.isDefault !== undefined) {
    nextPayload.is_default = Boolean(payload.is_default ?? payload.isDefault);
  }

  if (payload.is_system !== undefined || payload.isSystem !== undefined) {
    nextPayload.is_system = Boolean(payload.is_system ?? payload.isSystem);
  }

  if (payload.position !== undefined) {
    nextPayload.position = Number(payload.position);
  }

  if (payload.sort_order !== undefined || payload.sortOrder !== undefined) {
    nextPayload.sort_order = Number(payload.sort_order ?? payload.sortOrder);
  }

  return nextPayload;
}

function getInitialActiveViewId(views = []) {
  return views.find((view) => view.is_default)?.id || views[0]?.id || null;
}

export function useUniversalViews(tableId) {
  const [views, setViews] = useState([]);
  const [activeViewId, setActiveViewId] = useState(null);

  const [isLoadingViews, setIsLoadingViews] = useState(false);
  const [hasLoadedViews, setHasLoadedViews] = useState(false);
  const [viewsError, setViewsError] = useState("");

  const activeView = useMemo(() => {
    if (!activeViewId) return null;

    return (
      views.find((view) => String(view.id) === String(activeViewId)) || null
    );
  }, [views, activeViewId]);

  const loadViews = useCallback(async () => {
    setHasLoadedViews(false);

    if (!tableId) {
      setViews([]);
      setActiveViewId(null);
      setIsLoadingViews(false);
      setHasLoadedViews(true);
      return [];
    }

    setIsLoadingViews(true);
    setViewsError("");

    try {
      const result = await getViewsByTable(tableId);
      const nextViews = normalizeViews(Array.isArray(result) ? result : []);

      setViews(nextViews);

      setActiveViewId((currentId) => {
        if (
          currentId &&
          nextViews.some((view) => String(view.id) === String(currentId))
        ) {
          return currentId;
        }

        return getInitialActiveViewId(nextViews);
      });

      return nextViews;
    } catch (error) {
      setViewsError(error?.message || "Не удалось загрузить представления");
      setViews([]);
      setActiveViewId(null);
      return [];
    } finally {
      setIsLoadingViews(false);
      setHasLoadedViews(true);
    }
  }, [tableId]);

  useEffect(() => {
    loadViews();
  }, [loadViews]);

  const createView = useCallback(
    async (payload = {}) => {
      if (!tableId) return null;

      const normalizedPayload = normalizeViewPayload(payload);

      const createdView = await createUniversalView({
        table_id: tableId,
        ...normalizedPayload,
      });

      const normalizedCreatedView = normalizeView(createdView);

      setViews((prev) => normalizeViews([...prev, normalizedCreatedView]));
      setActiveViewId(normalizedCreatedView.id);
      setHasLoadedViews(true);

      return normalizedCreatedView;
    },
    [tableId]
  );

  const updateView = useCallback(async (viewId, payload = {}) => {
    if (!viewId) return null;

    const normalizedPayload = normalizeViewPayload(payload);

    const updatedView = await updateUniversalView(viewId, normalizedPayload);
    const normalizedUpdatedView = normalizeView(updatedView);

    setViews((prev) =>
      normalizeViews(
        prev.map((view) =>
          String(view.id) === String(viewId) ? normalizedUpdatedView : view
        )
      )
    );

    setHasLoadedViews(true);

    return normalizedUpdatedView;
  }, []);

  const reorderViews = useCallback(
    async (nextViews = []) => {
      const normalizedNextViews = normalizeViews(nextViews, {
        preserveOrder: true,
      }).map((view, index) => ({
        ...view,
        position: index,
        sort_order: index,
        sortOrder: index,
      }));

      setViews(normalizedNextViews);
      setHasLoadedViews(true);

      await Promise.all(
        normalizedNextViews.map((view, index) =>
          updateUniversalView(view.id, {
            position: index,
            sort_order: index,
          })
        )
      );

      await loadViews();

      return true;
    },
    [loadViews]
  );

  const deleteView = useCallback(async (viewId) => {
    if (!viewId) return false;

    const targetView = views.find((view) => String(view.id) === String(viewId));

    if (targetView?.is_system) {
      return false;
    }

    await deleteUniversalView(viewId);

    setViews((prev) => {
      const nextViews = prev.filter(
        (view) => String(view.id) !== String(viewId)
      );

      setActiveViewId((currentId) => {
        if (String(currentId) !== String(viewId)) return currentId;

        return getInitialActiveViewId(nextViews);
      });

      return nextViews;
    });

    setHasLoadedViews(true);

    return true;
  }, [views]);

  return {
    views,
    activeView,
    activeViewId,

    isLoadingViews,
    hasLoadedViews,
    viewsError,

    setActiveViewId,
    loadViews,

    createView,
    updateView,
    reorderViews,
    deleteView,
  };
}