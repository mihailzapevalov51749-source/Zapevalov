export const PLATFORM_ZONE_STUDIO = "studio";
export const PLATFORM_ZONE_OFFICE = "office";

/**
 * Resolve platform visual zone from route pathname.
 * Studio = /designer/* ; everything else defaults to Office.
 */
export function resolvePlatformZoneFromPathname(pathname = "") {
  const path = String(pathname || "").trim();
  if (path.startsWith("/designer")) {
    return PLATFORM_ZONE_STUDIO;
  }
  return PLATFORM_ZONE_OFFICE;
}

export function applyPlatformZoneToDocument(pathname = "") {
  if (typeof document === "undefined") {
    return resolvePlatformZoneFromPathname(pathname);
  }

  const zone = resolvePlatformZoneFromPathname(pathname);
  document.body.setAttribute("data-platform-zone", zone);
  return zone;
}
