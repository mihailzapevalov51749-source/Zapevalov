import { resolvePlatformRoleLabel } from "./platformUserUtils.js";

export default function PlatformRoleBadge({ roleKey, className = "" }) {
  const tone = roleKey || "support";
  const label = resolvePlatformRoleLabel(roleKey);

  return (
    <span className={`platform-role-badge platform-role-badge--${tone}${className ? ` ${className}` : ""}`}>
      {label}
    </span>
  );
}
