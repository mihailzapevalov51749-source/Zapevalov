import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";

import { getApiErrorMessage } from "../api/platformApiClient";
import * as designerApi from "../api/designerApi";

const ObjectTypePreviewTabContext = createContext(null);

function resolveInitialViewKey(views, explicitViewKey) {
  const items = Array.isArray(views) ? views : [];

  if (!items.length) {
    return null;
  }

  if (explicitViewKey) {
    const matched = items.find((view) => view.key === explicitViewKey);
    if (matched) {
      return matched.key;
    }
  }

  const defaultView = items.find((view) => view.is_default) || items[0];
  return defaultView?.key || null;
}

export function ObjectTypePreviewTabProvider({
  tenantId,
  objectTypeId,
  children,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const explicitViewKey = searchParams.get("viewKey");

  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedViewKey, setSelectedViewKey] = useState(null);

  const loadViews = useCallback(async () => {
    if (!tenantId || !objectTypeId) {
      setViews([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await designerApi.listViews(tenantId, objectTypeId);
      setViews(Array.isArray(data) ? data : []);
    } catch (err) {
      setViews([]);
      setError(getApiErrorMessage(err, "Не удалось загрузить вкладки"));
    } finally {
      setLoading(false);
    }
  }, [tenantId, objectTypeId]);

  useEffect(() => {
    void loadViews();
  }, [loadViews]);

  useEffect(() => {
    if (!views.length) {
      setSelectedViewKey(null);
      return;
    }

    setSelectedViewKey((current) =>
      resolveInitialViewKey(views, explicitViewKey || current),
    );
  }, [views, explicitViewKey]);

  const selectedView = useMemo(
    () => views.find((view) => view.key === selectedViewKey) || null,
    [views, selectedViewKey],
  );

  const selectView = useCallback(
    (viewKey) => {
      const normalizedKey = String(viewKey || "").trim();
      if (!normalizedKey) {
        return;
      }

      setSelectedViewKey(normalizedKey);

      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("viewKey", normalizedKey);
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const value = useMemo(
    () => ({
      views,
      loading,
      error,
      selectedViewKey,
      selectedView,
      selectView,
      reloadViews: loadViews,
    }),
    [
      views,
      loading,
      error,
      selectedViewKey,
      selectedView,
      selectView,
      loadViews,
    ],
  );

  return (
    <ObjectTypePreviewTabContext.Provider value={value}>
      {children}
    </ObjectTypePreviewTabContext.Provider>
  );
}

export function useObjectTypePreviewTab() {
  return useContext(ObjectTypePreviewTabContext);
}
