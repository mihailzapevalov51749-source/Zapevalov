import {
  buildAvatarTransform,
} from "../../../shared/avatar/avatarUtils.js";
import { getInitials } from "../../../shared/fieldTypes/user/userUtils.js";
import {
  resolveUserAvatarSettings,
  resolveUserAvatarUrl,
} from "./platformUserUtils.js";

export default function PlatformUserAvatar({ user, size = 40, className = "" }) {
  const avatarUrl = resolveUserAvatarUrl(user);
  const avatarSettings = resolveUserAvatarSettings(user);
  const displayName = user?.full_name || user?.email || "";
  const initials = getInitials(displayName) || "?";

  return (
    <div
      className={`platform-user-avatar${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden={!displayName}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          draggable={false}
          style={{
            transform: buildAvatarTransform({
              settings: avatarSettings,
              containerSize: size,
            }),
            transformOrigin: "center center",
          }}
        />
      ) : (
        initials
      )}
    </div>
  );
}
