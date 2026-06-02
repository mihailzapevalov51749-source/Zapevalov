import { EMBEDDED_SURFACE_IDS } from "./embeddedSurfaceTypes.js";

const SOURCE_LABEL_BY_SURFACE = {
  [EMBEDDED_SURFACE_IDS.REGISTRY]: "Реестр",
  [EMBEDDED_SURFACE_IDS.OBJECT_CARD]: "Карточка объекта",
  [EMBEDDED_SURFACE_IDS.DASHBOARD]: "Dashboard",
  [EMBEDDED_SURFACE_IDS.DESIGNER]: "Конструктор",
  [EMBEDDED_SURFACE_IDS.DOCUMENT]: "Документ",
  [EMBEDDED_SURFACE_IDS.PROCESS]: "Процесс",
  [EMBEDDED_SURFACE_IDS.GLOBAL]: "Платформа",
};

export function resolveYasiiSourceLabel(surfaceId, surfaceName = "") {
  const normalizedId = String(surfaceId ?? "").trim();
  if (normalizedId && SOURCE_LABEL_BY_SURFACE[normalizedId]) {
    return SOURCE_LABEL_BY_SURFACE[normalizedId];
  }

  return String(surfaceName ?? "").trim() || "Платформа";
}
