export const STUDIO_SECTION_TITLES = {
  navigation: "Навигация",
  relations: "Связи",
  views: "Представления",
  processes: "Бизнес-процессы",
  publishing: "Публикация",
};

const STUDIO_SECTION_ROUTE_PATTERN =
  /^\/designer\/tenant\/\d+\/(relations|views|navigation|processes|publishing)\/?$/;

export function resolveStudioSectionKeyFromPathname(pathname) {
  const match = String(pathname || "").match(STUDIO_SECTION_ROUTE_PATTERN);
  return match?.[1] || "";
}

export function resolveStudioSectionTitle(sectionKey) {
  const normalizedKey = String(sectionKey || "").trim();
  return STUDIO_SECTION_TITLES[normalizedKey] || "";
}

export function resolveStudioSectionTitleFromPathname(pathname) {
  return resolveStudioSectionTitle(resolveStudioSectionKeyFromPathname(pathname));
}

export function resolveStudioSectionFallbackRoute(pathname) {
  const tenantMatch = String(pathname || "").match(/^\/designer\/tenant\/(\d+)\//);
  if (!tenantMatch?.[1]) {
    return null;
  }

  return `/designer/tenant/${tenantMatch[1]}/object-types`;
}
