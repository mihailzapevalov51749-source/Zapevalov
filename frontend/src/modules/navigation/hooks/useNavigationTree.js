import { useCallback, useEffect, useState } from "react";
import { navigationService } from "../services/navigationService";

function resolveItemScope(item) {
  const explicitScope =
    item?.scope ||
    item?.mode ||
    item?.menu_scope ||
    item?.context ||
    item?.context_type ||
    item?.meta?.scope ||
    item?.meta?.mode;

  if (typeof explicitScope === "string") {
    const normalized = explicitScope.trim().toLowerCase();
    if (normalized === "designer" || normalized === "runtime") {
      return normalized;
    }
  }

  const route = String(item?.route || item?.path || item?.url || "").trim().toLowerCase();
  if (route.startsWith("/designer")) {
    return "designer";
  }
  if (route.startsWith("/portal") || route.startsWith("/admin")) {
    return "runtime";
  }

  return undefined;
}

function filterNavigationByScope(items, scope) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      const childrenSource = Array.isArray(item?.children) ? item.children : [];
      const filteredChildren = filterNavigationByScope(childrenSource, scope);
      const itemScope = resolveItemScope(item);
      const matchesScope = !scope || itemScope === scope;
      const includeItem = matchesScope || filteredChildren.length > 0;

      if (!includeItem) {
        return null;
      }

      return {
        ...item,
        children: filteredChildren,
      };
    })
    .filter(Boolean);
}

export default function useNavigationTree(portalId, options = {}) {
  const scope = options?.scope ?? "runtime";
  const mode = options?.mode;
  const context = options?.context;
  const [navigation, setNavigation] = useState([]);
  const [isLoadingNavigation, setIsLoadingNavigation] = useState(false);
  const [navigationError, setNavigationError] = useState("");
  const [sourceMode, setSourceMode] = useState("persisted-runtime");

  const reloadNavigation = useCallback(async () => {
    try {
      setIsLoadingNavigation(true);
      setNavigationError("");

      const result = await navigationService.getTree(portalId, {
        scope,
        mode,
        context,
      });
      const scopedNavigation =
        scope === "designer" || scope === "runtime"
          ? filterNavigationByScope(result, scope)
          : Array.isArray(result)
            ? result
            : [];

      setNavigation(scopedNavigation);
      if (scope === "designer") {
        setSourceMode(
          scopedNavigation.length > 0
            ? "persisted-designer"
            : "fallback-designer"
        );
      } else {
        setSourceMode("persisted-runtime");
      }
    } catch (e) {
      console.error(e);
      setNavigationError("Ошибка загрузки меню");
      setNavigation([]);
      if (scope === "designer") {
        setSourceMode("fallback-designer");
      }
    } finally {
      setIsLoadingNavigation(false);
    }
  }, [portalId, scope, mode, context]);

  useEffect(() => {
    reloadNavigation();
  }, [reloadNavigation]);

  return {
    navigation,
    isLoadingNavigation,
    navigationError,
    reloadNavigation,
    sourceMode,
  };
}