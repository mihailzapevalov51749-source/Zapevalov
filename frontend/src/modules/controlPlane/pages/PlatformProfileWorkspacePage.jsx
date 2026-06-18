import ProfileWorkspace from "../../profileWorkspace/ProfileWorkspace.jsx";
import { PROFILE_MODE_PLATFORM } from "../../profileWorkspace/profileMode.js";

export default function PlatformProfileWorkspacePage() {
  return (
    <ProfileWorkspace
      mode={PROFILE_MODE_PLATFORM}
      ariaLabel="Вкладки пространства Профиль платформы"
    />
  );
}
