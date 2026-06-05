import { buildPortalObjectRoute } from "../../../portal/utils/portalObjectRoutes.js";

export const PAGE_OPEN_TARGET = {
  STUDIO_EDITOR: "studio_editor",
  WORKSPACE_HOME: "workspace_home",
  WORKSPACE_TAB: "workspace_tab",
  OFFICE_NAVIGATION: "office_navigation",
  OBJECT_TAB: "object_tab",
};

const USAGE_OPEN_PRIORITY = [
  "workspace_home",
  "navigation",
  "object_tab",
  "workspace_tab",
];

function normalizePortalId(tenantId) {
  const portalId = Number(tenantId);
  return Number.isFinite(portalId) && portalId > 0 ? portalId : 1;
}

function isObjectTabUsage(usage) {
  if (!usage) {
    return false;
  }

  return (
    usage.kind === "object_tab" ||
    usage.tab_type === "object" ||
    Boolean(usage.object_type_id || usage.object_type_key)
  );
}

export function pickPrimaryPageUsage(usages = []) {
  if (!Array.isArray(usages) || usages.length === 0) {
    return null;
  }

  for (const kind of USAGE_OPEN_PRIORITY) {
    const match = usages.find((usage) => {
      if (kind === "object_tab") {
        return isObjectTabUsage(usage);
      }
      return usage?.kind === kind;
    });
    if (match) {
      return match;
    }
  }

  return usages[0];
}

export function buildStudioEditorHref(tenantId, pageId) {
  const portalId = normalizePortalId(tenantId);
  return `/designer/tenant/${portalId}/page/${Number(pageId)}`;
}

function buildWorkspaceHref(tenantId, usage, tabSlug = "") {
  const portalId = normalizePortalId(tenantId);
  const workspaceSlug = String(usage?.workspace_slug || "").trim();

  if (!workspaceSlug) {
    return null;
  }

  const base = `/portal/${portalId}/workspaces/${encodeURIComponent(workspaceSlug)}`;
  const slug = String(tabSlug || usage?.tab_slug || "").trim();

  return slug ? `${base}/${encodeURIComponent(slug)}` : base;
}

function buildObjectTabHref(tenantId, usage) {
  const portalId = normalizePortalId(tenantId);
  const viewKey = String(usage?.view_key || usage?.tab_slug || "").trim();
  const objectTypeKey = String(usage?.object_type_key || "").trim();
  const objectTypeId = String(usage?.object_type_id || "").trim();

  if (objectTypeKey) {
    return buildPortalObjectRoute(portalId, {
      objectTypeKey,
      viewKey: viewKey || null,
    });
  }

  if (objectTypeId) {
    return buildPortalObjectRoute(portalId, {
      objectTypeId,
      viewKey: viewKey || null,
    });
  }

  return null;
}

export function buildPageOpenHref({ tenantId, pageId, usage }) {
  const portalId = normalizePortalId(tenantId);
  const normalizedPageId = Number(pageId);

  if (!usage) {
    return buildStudioEditorHref(portalId, normalizedPageId);
  }

  if (usage.kind === "workspace_home") {
    return (
      buildWorkspaceHref(portalId, usage) ||
      `/portal/${portalId}/page/${normalizedPageId}`
    );
  }

  if (usage.kind === "navigation") {
    return `/portal/${portalId}/page/${normalizedPageId}`;
  }

  if (isObjectTabUsage(usage)) {
    return (
      buildObjectTabHref(portalId, usage) ||
      `/portal/${portalId}/page/${normalizedPageId}`
    );
  }

  if (usage.kind === "workspace_tab") {
    const workspaceHref = buildWorkspaceHref(portalId, usage);
    if (workspaceHref) {
      return workspaceHref;
    }
  }

  return `/portal/${portalId}/page/${normalizedPageId}`;
}

export function resolvePageOpenTarget({ tenantId, pageId, usage }) {
  if (!usage) {
    return {
      target: PAGE_OPEN_TARGET.STUDIO_EDITOR,
      href: buildStudioEditorHref(tenantId, pageId),
      usage: null,
      needsWorkspaceTabResolve: false,
    };
  }

  if (usage.kind === "workspace_home") {
    return {
      target: PAGE_OPEN_TARGET.WORKSPACE_HOME,
      href: buildPageOpenHref({ tenantId, pageId, usage }),
      usage,
      needsWorkspaceTabResolve: false,
    };
  }

  if (usage.kind === "navigation") {
    return {
      target: PAGE_OPEN_TARGET.OFFICE_NAVIGATION,
      href: buildPageOpenHref({ tenantId, pageId, usage }),
      usage,
      needsWorkspaceTabResolve: false,
    };
  }

  if (isObjectTabUsage(usage)) {
    return {
      target: PAGE_OPEN_TARGET.OBJECT_TAB,
      href: buildPageOpenHref({ tenantId, pageId, usage }),
      usage,
      needsWorkspaceTabResolve: false,
    };
  }

  if (usage.kind === "workspace_tab") {
    const hasTabSlug = Boolean(String(usage?.tab_slug || "").trim());
    return {
      target: PAGE_OPEN_TARGET.WORKSPACE_TAB,
      href: buildPageOpenHref({ tenantId, pageId, usage }),
      usage,
      needsWorkspaceTabResolve: Boolean(usage.workspace_id) && !hasTabSlug,
    };
  }

  return {
    target: PAGE_OPEN_TARGET.OFFICE_NAVIGATION,
    href: buildPageOpenHref({ tenantId, pageId, usage }),
    usage,
    needsWorkspaceTabResolve: false,
  };
}

function findWorkspaceTabForPage(tabs, pageId) {
  const pageIdText = String(pageId);
  const pageTab = (tabs || []).find(
    (tab) => String(tab?.tab_type || "") === "page" && String(tab?.target_id || "") === pageIdText,
  );
  if (pageTab) {
    return pageTab;
  }

  return (tabs || []).find((tab) => String(tab?.tab_type || "") === "object");
}

export async function resolvePageOpenHref({
  tenantId,
  page,
  listWorkspaceTabs,
}) {
  const pageId = Number(page?.id);
  if (!Number.isFinite(pageId)) {
    return buildStudioEditorHref(tenantId, 0);
  }

  const usages = Array.isArray(page?.usages) ? page.usages : [];
  const usage = pickPrimaryPageUsage(usages);

  if (!usage) {
    return buildStudioEditorHref(tenantId, pageId);
  }

  const target = resolvePageOpenTarget({ tenantId, pageId, usage });

  if (!target.needsWorkspaceTabResolve || typeof listWorkspaceTabs !== "function") {
    return target.href;
  }

  try {
    const tabs = await listWorkspaceTabs(tenantId, usage.workspace_id);
    const matchedTab = findWorkspaceTabForPage(tabs, pageId);

    if (!matchedTab) {
      return target.href;
    }

    if (String(matchedTab.tab_type || "") === "object") {
      const objectHref = buildObjectTabHref(tenantId, {
        object_type_id: matchedTab.object_type_id,
        object_type_key: matchedTab.object_type_key,
        tab_slug: matchedTab.slug,
        view_key: matchedTab.slug,
      });
      if (objectHref) {
        return objectHref;
      }
    }

    const workspaceHref = buildWorkspaceHref(tenantId, usage, matchedTab.slug);
    if (workspaceHref) {
      return workspaceHref;
    }
  } catch {
    return target.href;
  }

  return target.href;
}
