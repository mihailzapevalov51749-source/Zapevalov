import PlatformVersionsContent from "../../platformReleases/components/PlatformVersionsContent";
import { companiesWorkspaceStyles } from "./companiesWorkspaceStyles.js";

export default function CompaniesVersionsTab() {
  return (
    <div className="companies-workspace__versions-tab" style={companiesWorkspaceStyles.tabContentScrollable}>
      <PlatformVersionsContent embedded />
    </div>
  );
}
