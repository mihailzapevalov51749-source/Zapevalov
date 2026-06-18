import ProfileWorkspace from "../../profileWorkspace/ProfileWorkspace.jsx";
import { PROFILE_MODE_TENANT } from "../../profileWorkspace/profileMode.js";

export default function TenantCompanyProfileWorkspacePage() {
  return (
    <ProfileWorkspace
      mode={PROFILE_MODE_TENANT}
      ariaLabel="Вкладки пространства Профиль компании"
    />
  );
}
