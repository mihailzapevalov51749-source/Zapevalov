import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { resolveTenantBrowserPageTitle } from "../browserTitle/resolveTenantBrowserPageTitle.js";
import {
  TENANT_BROWSER_PAGE_TITLE_EVENT,
  peekTenantBrowserPageTitle,
} from "../browserTitle/tenantBrowserTitleBridge.js";
import TenantEnvironmentTopBar from "./TenantEnvironmentTopBar";
import { applyTenantBrowserDocumentTitle } from "./tenantEnvironment";
import { useTenantEnvironment } from "./useTenantEnvironment";

/**
 * Syncs tenant environment top bar and document.title from the current URL tenant.
 */
export default function TenantEnvironmentTracker() {
  const location = useLocation();
  const { tenantId, environment, tenantEnvironment } = useTenantEnvironment();
  const [dynamicPageTitle, setDynamicPageTitle] = useState(() => peekTenantBrowserPageTitle());

  useEffect(() => {
    const handlePageTitleUpdated = (event) => {
      setDynamicPageTitle(event.detail?.pageTitle ?? null);
    };

    window.addEventListener(TENANT_BROWSER_PAGE_TITLE_EVENT, handlePageTitleUpdated);
    return () => {
      window.removeEventListener(TENANT_BROWSER_PAGE_TITLE_EVENT, handlePageTitleUpdated);
    };
  }, []);

  useEffect(() => {
    setDynamicPageTitle(null);
  }, [location.pathname, tenantId]);

  useEffect(() => {
    if (!tenantId) {
      return;
    }

    const pageTitle =
      dynamicPageTitle || resolveTenantBrowserPageTitle(location.pathname);
    applyTenantBrowserDocumentTitle(pageTitle, tenantEnvironment);
  }, [dynamicPageTitle, environment, location.pathname, tenantEnvironment, tenantId]);

  return <TenantEnvironmentTopBar environment={environment} />;
}
