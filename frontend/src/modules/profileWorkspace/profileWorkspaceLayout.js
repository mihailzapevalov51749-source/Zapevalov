export function resolveProfileWorkspaceHostClass(pathname = "") {
  const normalized = String(pathname || "").replace(/\/+$/, "");

  if (/^\/designer\/tenant\/\d+\/administration\/settings(?:\/|$)/.test(normalized)) {
    return "profile-workspace--host-studio-admin";
  }

  if (/^\/control-plane\/platform-profile(?:\/|$)/.test(normalized)) {
    return "profile-workspace--host-control-plane";
  }

  return "";
}
