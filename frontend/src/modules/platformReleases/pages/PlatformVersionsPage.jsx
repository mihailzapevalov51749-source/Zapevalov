import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";
import PlatformVersionsContent from "../components/PlatformVersionsContent";

/** @deprecated Use Companies → Версии tab. Kept for legacy route redirect compatibility. */
export default function PlatformVersionsPage() {
  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.DASHBOARD,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
    title: "Версии платформы",
  });

  return <PlatformVersionsContent />;
}
