import { useLocation, useParams } from "react-router-dom";

import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";
import {
  resolveStudioSectionFallbackRoute,
  resolveStudioSectionKeyFromPathname,
  resolveStudioSectionTitle,
} from "../../../shared/workspaceTabs/studioSectionTitles.js";

export default function DesignerSectionPlaceholderPage({ title }) {
  const location = useLocation();
  const { tenantId } = useParams();

  const sectionKey = resolveStudioSectionKeyFromPathname(location.pathname);
  const sectionTitle = resolveStudioSectionTitle(sectionKey) || String(title || "").trim() || "Раздел";
  const fallbackRoute =
    resolveStudioSectionFallbackRoute(location.pathname) ||
    `/designer/tenant/${tenantId || 1}/object-types`;

  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_SECTION,
    title: sectionTitle,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
    canMinimize: true,
    fallbackRoute,
    context: {
      sectionKey,
      sectionTitle,
      pageTitle: sectionTitle,
      layoutPageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_SECTION,
    },
  });

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 920,
        margin: "0 auto",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        background: "#FFFFFF",
        padding: "20px 22px",
        boxSizing: "border-box",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 18,
          lineHeight: 1.3,
          color: "#0F172A",
        }}
      >
        {sectionTitle}
      </h2>
      <p
        style={{
          margin: "10px 0 0",
          fontSize: 14,
          color: "#64748B",
        }}
      >
        Раздел в разработке
      </p>
    </div>
  );
}
