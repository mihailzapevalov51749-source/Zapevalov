const UNSUPPORTED_PATH_PREFIXES = ["/dev/", "/onlyoffice-test"];

export function isWorkspaceTabDescriptorSupported(descriptor, location) {
  const pathname = String(location?.pathname || "").trim();

  if (!pathname || pathname === "/") {
    return false;
  }

  if (UNSUPPORTED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }

  if (!descriptor?.route || !descriptor?.moduleKey || !descriptor?.pageType) {
    return false;
  }

  return true;
}
