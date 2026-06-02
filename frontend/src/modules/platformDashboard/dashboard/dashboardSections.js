/** Top-level Dashboard sections (owner-facing navigation). */

export const DASHBOARD_SECTIONS = [
  { key: "platform", label: "Платформа", legacyKeys: ["architecture"] },
  { key: "development", label: "Развитие продукта", legacyKeys: ["implementation"] },
  { key: "companies", label: "Компании", legacyKeys: [] },
  { key: "quality", label: "Качество", legacyKeys: [] },
  { key: "history", label: "История", legacyKeys: [] },
];

const LEGACY_REDIRECTS = {
  architecture: "platform",
  implementation: "development",
};

export function resolveDashboardSectionKey(pathname) {
  const match = pathname.match(/\/platform\/([^/?]+)/);
  const segment = match?.[1] || null;
  if (!segment) {
    return null;
  }

  const legacyTarget = LEGACY_REDIRECTS[segment];
  if (legacyTarget) {
    return { sectionKey: legacyTarget, legacySegment: segment };
  }

  const known = DASHBOARD_SECTIONS.find((section) => section.key === segment);
  if (known) {
    return { sectionKey: segment, legacySegment: null };
  }

  return { sectionKey: null, legacySegment: segment };
}

export function isKnownDashboardSection(sectionKey) {
  return DASHBOARD_SECTIONS.some((section) => section.key === sectionKey);
}

/** YASII / host context still use legacy tab ids for dashboard surface. */
export function resolveYasiiDashboardTabKey(sectionKey) {
  if (sectionKey === "platform") {
    return "architecture";
  }
  if (sectionKey === "development") {
    return "implementation";
  }
  return sectionKey;
}
