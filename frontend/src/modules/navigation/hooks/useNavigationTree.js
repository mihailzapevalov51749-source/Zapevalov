import { useCallback, useEffect, useRef, useState } from "react";
import { navigationService } from "../services/navigationService";
import {
  isObjectTypeNavigationItem,
  transformRuntimeNavigationForPortal,
} from "../../../portal/utils/portalObjectRoutes";
import {
  beginNavigationReloadRequest,
  isStaleNavigationReloadResponse,
} from "../navigationReloadRace.js";

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
      const objectTypeItem = isObjectTypeNavigationItem(item);
      // Portal runtime: show object_type placements (often menu_scope=designer) with portal URLs.
      // Studio (scope=designer): object_type keeps designer scope via menu_scope / /designer URL.
      const matchesScope =
        !scope ||
        itemScope === scope ||
        (scope === "runtime" && objectTypeItem);
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
  const forEditMode = Boolean(options?.forEditMode);
  const enabled = options?.enabled !== false;
  const [navigation, setNavigation] = useState([]);
  const [isLoadingNavigation, setIsLoadingNavigation] = useState(false);
  const [navigationError, setNavigationError] = useState("");
  const [sourceMode, setSourceMode] = useState("persisted-runtime");
  const previousPortalIdRef = useRef(portalId);
  const currentPortalIdRef = useRef(portalId);
  const reloadRequestSeqRef = useRef(0);

  useEffect(() => {
    currentPortalIdRef.current = portalId;
  }, [portalId]);

  const reloadNavigation = useCallback(async () => {
    if (!enabled) {
      return;
    }

    const { requestId } = beginNavigationReloadRequest(reloadRequestSeqRef);
    const requestPortalId = portalId;

    const isStaleResponse = () =>
      isStaleNavigationReloadResponse({
        requestId,
        requestSeqRef: reloadRequestSeqRef,
        requestPortalId,
        currentPortalId: currentPortalIdRef.current,
      });

    try {
      setIsLoadingNavigation(true);
      setNavigationError("");

      const result = await navigationService.getTree(requestPortalId, {
        scope,
        mode,
        context,
        forEditMode,
      });

      if (isStaleResponse()) {
        return;
      }

      let scopedNavigation =
        scope === "designer" || scope === "runtime"
          ? filterNavigationByScope(result, scope)
          : Array.isArray(result)
            ? result
            : [];

      if (scope === "runtime") {
        scopedNavigation = transformRuntimeNavigationForPortal(
          scopedNavigation,
          requestPortalId,
        );
      }

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
      if (isStaleResponse()) {
        return;
      }

      console.error(e);
      setNavigationError("Ошибка загрузки меню");
      setNavigation([]);
      if (scope === "designer") {
        setSourceMode("fallback-designer");
      }
    } finally {
      if (!isStaleResponse()) {
        setIsLoadingNavigation(false);
      }
    }
  }, [portalId, scope, mode, context, forEditMode, enabled]);

  useEffect(() => {
    if (!enabled) {
      setNavigation([]);
      setNavigationError("");
      setIsLoadingNavigation(false);
      return;
    }

    if (previousPortalIdRef.current !== portalId) {
      previousPortalIdRef.current = portalId;
      setNavigation([]);
      setNavigationError("");
    }

    reloadNavigation();
  }, [portalId, reloadNavigation, enabled]);

  return {
    navigation,
    isLoadingNavigation,
    navigationError,
    reloadNavigation,
    sourceMode,
  };
}
